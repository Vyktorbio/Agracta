"""
Forense — triagem estatística de anomalias em dados de ensaio.

Sinaliza padrões atípicos que merecem verificação humana (subdispersão,
homogeneidade anômala de variância, arredondamento, duplicatas, ausência de
gradiente de campo, acoplamento entre avaliações que deveriam ser
independentes). NÃO emite veredito de fraude: cada sinal vem acompanhado de
sua explicação inocente possível.

Filosofia: a estatística levanta a hipótese; a proveniência (cadernos
brutos, trilha de auditoria) é que confirma. Severidade graduada em
'clear' | 'watch' | 'flag'. Uso recomendado: triagem interna, anexável
a processo formal apenas como indício, nunca como prova.

CALIBRAÇÃO (v2) — cada teste devolve um p-valor sob uma hipótese nula
explícita, em vez de comparar a um limiar fixo. Limiar fixo não sobrevive à
variação de n: o CV esperado das variâncias sob normalidade é √(2/(n−1)),
que vale 0,82 com 4 repetições e 0,47 com 10 — um corte único em 0,35 gera
alarme falso em ensaios grandes e cega os pequenos. Os nulos são:
  · subdispersão .......... χ² de Poisson, gl = Σ(nᵢ−1) — exato
  · homogeneidade de var. . Monte Carlo normal com o mesmo desenho
  · extremos .............. Monte Carlo normal, resíduos intra-grupo
  · dígito / arredondamento Monte Carlo condicional à dispersão observada
  · duplicatas ............ mesmo nulo condicional
  · gradiente de campo .... F do bloco (cauda inferior), desenho balanceado
  · ordem das repetições .. permutação dentro do grupo
  · acoplamento ........... permutação por bloco
A multiplicidade entre testes é controlada por Benjamini-Hochberg dentro do
estudo, e a severidade é lida do q-valor — não do p bruto.

ESTRATIFICAÇÃO — informando `estrato` (avaliação/data × variável), a triagem
roda no estudo inteiro de uma vez: cada estrato mantém sua própria escala e
seus próprios grupos, e as estatísticas são somadas/reamostradas em conjunto.
Isso multiplica o n disponível (testes de dígito exigem ≥20 valores; uma única
avaliação com 5 tratamentos × 4 repetições tem 20) e evita rodar a mesma
bateria dezenas de vezes, o que inflaria o número de alarmes falsos.

Entrada (formato longo, como os demais módulos):
    papeis["resposta"]   -> coluna numérica (contagem/contínuo)
    papeis["tratamento"] -> coluna de grupo (define as repetições por grupo)
    papeis["repeticao"]  -> (opcional) bloco/repetição — habilita gradiente de
                            campo e ordem das repetições
    papeis["estrato"]    -> (opcional) avaliação/variável — pode ser uma lista
                            de colunas, combinadas em um rótulo
    papeis["resposta2"]  -> (opcional) segunda avaliação p/ teste de acoplamento
    opcoes["tipo"]       -> "count" (contagem) | "cont" (contínuo)
    opcoes["escala"]     -> (opcional) "pct" p/ checar limites 0–100
    opcoes["controle"]   -> (opcional) média do controle p/ reconciliar eficácia
    opcoes["modo"]       -> "conservador" (default) | "sensivel"
    opcoes["seed"]       -> semente das reamostragens (default 12345)
    opcoes["reamostras"] -> nº de reamostras Monte Carlo (default 2000)
"""

import zlib

import numpy as np
from scipy import stats

VERSAO = "forense/2.0"

# limiares de q-valor (Benjamini-Hochberg) por régua
_REGUA = {
    "conservador": {"flag": 0.01, "watch": 0.10},
    "sensivel":    {"flag": 0.05, "watch": 0.20},
}


# ----------------------------------------------------------------------
# helpers
# ----------------------------------------------------------------------
def _num(v):
    if v is None:
        return np.nan
    if isinstance(v, (int, float, np.integer, np.floating)):
        return float(v)
    s = str(v).strip()
    if not s:
        return np.nan
    s = s.replace("%", "").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        return np.nan


def _arr(dados, nome):
    if not nome or nome not in dados:
        return None
    return np.asarray([_num(v) for v in dados[nome]], dtype=float)


def _txt(dados, nome):
    if not nome or nome not in dados:
        return None
    return np.asarray([str(v).strip() for v in dados[nome]], dtype=object)


def _achado(nome, sev, stat, leitura, inocente="", executado=True,
            p=None, chave=None, teto=None):
    """
    `teto` limita a severidade máxima do achado. Serve para o caso em que o
    dado não permite descartar a explicação benigna — sem a coluna de
    repetição/bloco, um gradiente de campo forte imita tanto 'variâncias
    uniformes demais' quanto 'dados lisos demais', e escalar para SINAL FORTE
    seria afirmar mais do que a evidência sustenta.
    """
    return {"nome": nome, "severidade": sev, "estatistica": stat,
            "leitura": leitura, "explicacao_inocente": inocente,
            "executado": bool(executado), "p": p, "q": None,
            "chave": chave or nome, "teto": teto}


def _inconclusivo(nome, stat, leitura, chave=None):
    return _achado(nome, "na", stat, leitura, executado=False, chave=chave)


def _fmt_p(p):
    if p is None:
        return "—"
    return "<0,001" if p < 0.001 else f"{p:.3f}".replace(".", ",")


def _casas(vals):
    """Nº de casas decimais efetivamente usadas (p/ gerar o nulo na mesma grade)."""
    for d in range(0, 4):
        if np.all(np.abs(vals - np.round(vals, d)) < 1e-9):
            return d
    return 4


def _combinar_fisher(ps):
    """Fisher para p-valores de estratos. Só usado onde o nulo conjunto não cabe."""
    ps = [max(float(p), 1e-12) for p in ps if p is not None]
    if not ps:
        return None
    if len(ps) == 1:
        return ps[0]
    X = -2.0 * float(np.sum(np.log(ps)))
    return float(stats.chi2.sf(X, 2 * len(ps)))


def _p_mc(obs, nulos, cauda="maior"):
    """p de Monte Carlo com correção (+1)/(N+1) — nunca devolve p=0."""
    nulos = np.asarray(nulos, float)
    N = nulos.size
    if cauda == "maior":
        ge = int(np.sum(nulos >= obs))
    else:
        ge = int(np.sum(nulos <= obs))
    return (ge + 1) / (N + 1)


# ----------------------------------------------------------------------
# estratos
# ----------------------------------------------------------------------
def _montar_estratos(y, trat, rep, estrato_lab):
    """
    Um estrato = um conjunto homogêneo de escala (ex.: uma avaliação de uma
    variável). Dentro dele, os grupos são os tratamentos. Testes que dependem
    da escala rodam por estrato; testes de hábito de anotação (dígitos)
    juntam tudo, porque o hábito é de quem escreve, não da variável.
    """
    idx = {}
    for i in range(len(y)):
        if not np.isfinite(y[i]):
            continue
        k = str(estrato_lab[i]) if estrato_lab is not None else "(estudo)"
        idx.setdefault(k, []).append(i)
    estratos = []
    for k, ii in idx.items():
        grupos, blocos = {}, {}
        for i in ii:
            t = str(trat[i])
            grupos.setdefault(t, []).append(float(y[i]))
            blocos.setdefault(t, []).append(str(rep[i]) if rep is not None else "")
        grupos = {t: np.asarray(v, float) for t, v in grupos.items() if len(v)}
        if len(grupos) < 2:
            continue
        estratos.append({"rotulo": k, "grupos": grupos, "blocos": blocos,
                         "n": int(sum(len(v) for v in grupos.values()))})
    return estratos


def _todos_valores(estratos):
    return np.concatenate([v for e in estratos for v in e["grupos"].values()])


# ----------------------------------------------------------------------
# gerador do nulo condicional (p/ dígitos, arredondamento, duplicatas)
# ----------------------------------------------------------------------
def _rng(seed, chave):
    """
    Gerador próprio de cada teste, derivado de (seed, nome do teste). Com um
    gerador compartilhado, o p-valor de um teste dependia de quais testes
    rodaram antes dele e de quantos números aleatórios cada um consumiu —
    mapear a coluna de repetição, por exemplo, mudava o p do teste de dígito.
    Assim, o p de cada teste depende só dos dados, da seed e dele mesmo.
    """
    return np.random.default_rng([int(seed) & 0xFFFFFFFF,
                                  zlib.crc32(chave.encode("utf-8"))])


def _escala_registro(valores):
    """
    Grade em que os valores foram REGISTRADOS. O nulo dos testes de dígito,
    arredondamento e duplicata precisa viver na mesma grade, senão compara um
    avaliador que anota de 5 em 5 (ou numa escala diagramática 0-1-2-5-10-25…)
    com uma distribuição contínua, e acusa o protocolo como se fosse fraude.
      · grade:  inteiros com MDC ≥ 2 (contar de 2 em 2, notas de 5 em 5)
      · níveis: poucos valores distintos e espaçados de forma irregular
                (escala diagramática/de notas)
    """
    v = np.asarray(valores, float)
    if v.size == 0 or not np.all(np.abs(v - np.round(v)) < 1e-9):
        return None
    nz = np.abs(np.round(v[v != 0])).astype(np.intp)
    g = int(np.gcd.reduce(nz)) if nz.size else 1
    if g >= 2:
        return {"tipo": "grade", "passo": g}
    niveis = np.unique(v)
    amplitude = float(niveis.max() - niveis.min() + 1)
    if 3 <= niveis.size <= 20 and v.size >= 3 * niveis.size \
            and amplitude / niveis.size >= 2.5:
        return {"tipo": "niveis", "niveis": niveis}
    return None


def _encaixar_escala(sim, escala_reg):
    """Leva as réplicas do nulo para a mesma grade/níveis dos dados observados."""
    if not escala_reg:
        return sim
    if escala_reg["tipo"] == "grade":
        g = escala_reg["passo"]
        return np.round(sim / g) * g
    L = escala_reg["niveis"]
    idx = np.clip(np.searchsorted(L, sim), 1, L.size - 1)
    esq, dir_ = L[idx - 1], L[idx]
    return np.where(np.abs(sim - esq) <= np.abs(dir_ - sim), esq, dir_)


def confer_grade_contagem(valores, escala_reg, tipo):
    """
    Contagem registrada numa grade (todas múltiplas de g). A grade é absorvida
    pelo nulo dos testes de dígito — senão o mesmo arredondamento seria contado
    três vezes, simulando convergência de indícios —, mas não pode sumir do
    laudo: contagem EXATA de n valores cair toda em múltiplos de 5 tem
    probabilidade da ordem de (1/5)ⁿ. Ou o protocolo prevê estimativa por
    classes, ou a contagem declarada não foi feita como declarada. As duas
    coisas são achado de BPL; só a segunda é indício.
    """
    if tipo != "count" or not escala_reg or escala_reg["tipo"] != "grade":
        return None
    g = escala_reg["passo"]
    n = int(np.asarray(valores).size)
    forte = g >= 5
    return _achado(
        "Contagens registradas em grade", "watch" if forte else "clear",
        f"todas múltiplas de {g} · n={n}",
        (f"Os {n} valores são todos múltiplos de {g}. Contagem unitária exata "
         f"praticamente nunca produz isso (probabilidade da ordem de "
         f"(1/{g})^{n}). Confirme no protocolo se a avaliação era por "
         "estimativa ou classes; se era contagem exata, o registro não "
         "corresponde ao método declarado."
         if forte else
         f"Os {n} valores são todos múltiplos de {g} — compatível com contagem "
         f"feita de {g} em {g}, prevista em alguns protocolos. Os testes de "
         "dígito já descontam essa grade."),
        "Protocolo que prevê estimativa por classes (0, 5, 10, 20…) ou "
        "contagem por amostragem multiplicada por um fator fixo.",
        chave="grade_contagem")


def confer_escala_visual(valores, escala_reg):
    """
    Escala de estimativa visual (%). Dígito final e arredondamento NÃO são
    pontuados aqui: estimar percentual a olho produz preferência por nós de 5
    e 10 em qualquer avaliador honesto — é o viés de estimativa documentado na
    fitopatologia, não indício de fabricação. Pontuar marcava 100% dos estudos
    de severidade honestos como INVESTIGAR.
    """
    v = np.asarray(valores, float)
    intn = v[np.abs(v - np.round(v)) < 1e-9]
    if intn.size < 10:
        return None
    m5 = float(np.mean(np.mod(np.abs(np.round(intn)).astype(np.intp), 5) == 0))
    m10 = float(np.mean(np.mod(np.abs(np.round(intn)).astype(np.intp), 10) == 0))
    if escala_reg and escala_reg["tipo"] == "grade":
        desc = f"registro em passos de {escala_reg['passo']}"
    elif escala_reg and escala_reg["tipo"] == "niveis":
        desc = (f"escala de {escala_reg['niveis'].size} níveis "
                f"({', '.join(f'{x:g}' for x in escala_reg['niveis'][:8])}"
                + ("…" if escala_reg["niveis"].size > 8 else "") + ")")
    else:
        desc = "registro livre"
    return _achado(
        "Perfil de registro da estimativa visual (contexto)", "clear",
        f"{desc} · {m5*100:.0f}% múltiplos de 5 · {m10*100:.0f}% de 10",
        f"Estimativa visual (percentual ou escala de notas) com {desc}: {m5*100:.0f}% dos valores são múltiplos "
        f"de 5 e {m10*100:.0f}% de 10. Informativo apenas — os testes de dígito "
        "final e de arredondamento não se aplicam a estimativa visual, porque a "
        "preferência por nós de 5 e 10 é o comportamento normal de quem estima "
        "percentual a olho. Se a variável foi MEDIDA (software de imagem, "
        "contagem convertida), marque o tipo como contínuo para triá-la.",
        chave="escala_visual")


def _gerar_nulo(estratos, tipo, rng, N, desenho=None, escala_reg=None):
    """
    Réplicas dos dados sob "medição honesta com a MESMA estrutura de médias e a
    MESMA dispersão residual". A média de cada observação vem do modelo aditivo
    tratamento(+bloco), não da média do grupo: com gradiente de campo forte, um
    grupo reúne parcelas de blocos muito diferentes, e ajustar UMA distribuição
    à mistura produz um nulo de dígitos errado — o teste de dígito final
    acusava ~8% dos estudos honestos com gradiente alto por esse motivo.

    Condicionar à dispersão é deliberado: separa as perguntas. Se as repetições
    estão apertadas demais, quem acusa é o teste de subdispersão; aqui
    perguntamos apenas se os DÍGITOS são estranhos DADA aquela dispersão —
    senão um único defeito apareceria em quatro testes ao mesmo tempo,
    simulando convergência de indícios onde há um só.

    Contagem: Poisson, ou binomial negativa quando sobra sobredispersão real.
    Contínuo: normal na mesma grade decimal observada.
    Devolve matriz (N, n_total) alinhada com _todos_valores(estratos).
    """
    mus, ss_res, gl_res = [], 0.0, 0
    if desenho:
        # ajuste de mínimos quadrados trat+bloco (vale com parcelas perdidas);
        # a ordem de d["y"] é a mesma de _todos_valores(estratos)
        for d in desenho:
            R = _res_bidir(d["y"], d)
            mus.append(d["y"] - R)
            ss_res += float(np.sum(R ** 2))
            gl_res += d["gl"]
    else:
        for e in estratos:
            y = np.concatenate([np.asarray(v, float) for v in e["grupos"].values()])
            mu = np.concatenate([np.full(len(v), float(np.mean(v)))
                                 for v in e["grupos"].values()])
            ss_res += float(np.sum((y - mu) ** 2))
            gl_res += max(int(y.size - len(e["grupos"])), 0)
            mus.append(mu)
    mu_v = np.concatenate(mus)
    n = mu_v.size
    var_res = (ss_res / gl_res) if gl_res > 0 else 0.0

    if tipo == "count":
        mu_v = np.maximum(mu_v, 0.05)
        media = float(np.mean(mu_v))
        phi = (var_res / media) if media > 0 else 1.0
        if phi > 1.05 and var_res > 0:
            r = mu_v / (phi - 1.0)
            p = 1.0 / phi
            sim = rng.negative_binomial(np.maximum(r, 1e-3),
                                        min(max(p, 1e-6), 1 - 1e-9),
                                        size=(N, n)).astype(float)
        else:
            sim = rng.poisson(mu_v, size=(N, n)).astype(float)
        return _encaixar_escala(sim, escala_reg)

    sd = np.sqrt(var_res) if var_res > 0 else max(abs(float(np.mean(mu_v))) * 1e-3, 1e-6)
    casas = _casas(_todos_valores(estratos))
    sim = np.round(rng.normal(mu_v, sd, size=(N, n)), casas)
    return _encaixar_escala(sim, escala_reg)


def teste_subdispersao(estratos, tipo):
    """
    Índice de dispersão de Poisson, exato. Para cada grupo com média μ̂ ≥ 3,
    D = Σ(x−μ̂)²/μ̂ ~ χ²(n−1). Somando D e os graus de liberdade entre grupos e
    estratos obtém-se um teste único, sem limiar arbitrário. A cauda INFERIOR
    é a que interessa: contagem de campo real quase sempre é sobredispersa
    (agregação espacial da doença/praga), então repetições apertadas demais é
    que destoam. O corte μ̂ ≥ 3 existe porque abaixo disso a aproximação χ²
    da estatística de dispersão deixa de valer.
    """
    if tipo != "count":
        return None
    D = 0.0
    gl = 0
    usados = 0
    fora = 0
    zero_var = []
    for e in estratos:
        for t, vals in e["grupos"].items():
            n = len(vals)
            if n < 3:
                fora += 1
                continue
            m = float(np.mean(vals))
            if m < 3:
                fora += 1
                continue
            D += float(np.sum((vals - m) ** 2) / m)
            gl += n - 1
            usados += 1
            if np.var(vals, ddof=1) == 0:
                zero_var.append(f"{e['rotulo']}·{t}" if len(estratos) > 1 else t)
    if gl < 6:
        return _inconclusivo(
            "Subdispersão das contagens (índice de Poisson)",
            f"gl={gl} — insuficiente",
            "O teste exige pelo menos 6 graus de liberdade em grupos com média ≥ 3 "
            f"({usados} grupo(s) elegível(is), {fora} fora do critério). Não foi "
            "executado e não conta como resultado limpo.",
            chave="subdispersao")
    phi = D / gl
    p_sub = float(stats.chi2.cdf(D, gl))
    p_sobre = float(stats.chi2.sf(D, gl))
    extra = ""
    if zero_var:
        extra = (f" Há {len(zero_var)} grupo(s) com repetições idênticas "
                 f"(variância zero): {', '.join(zero_var[:4])}"
                 + ("…" if len(zero_var) > 4 else "") + ".")
    if p_sub < 0.05:
        leitura = (f"Índice de dispersão φ = {phi:.2f} (esperado ≈ 1 sob Poisson, "
                   f"≥ 1 em campo). As contagens variam MENOS entre repetições do "
                   f"que a própria natureza da contagem permitiria (p={_fmt_p(p_sub)} "
                   f"na cauda inferior, χ²={D:.1f} com {gl} gl)." + extra)
    elif p_sobre < 0.05:
        leitura = (f"Índice de dispersão φ = {phi:.2f} — sobredispersão, o padrão "
                   "normal de contagem de campo (agregação espacial). Nada a "
                   "sinalizar aqui." + extra)
    else:
        leitura = (f"Índice de dispersão φ = {phi:.2f} — compatível com contagem "
                   "de Poisson honesta." + extra)
    return _achado(
        "Subdispersão das contagens (índice de Poisson)", "clear",
        f"φ={phi:.2f} · χ²={D:.1f} · gl={gl} · p={_fmt_p(p_sub)}",
        leitura,
        "Pseudo-replicação (repetições da mesma parcela em vez de parcelas "
        "casualizadas independentes) colapsa a variância por construção. Pressão "
        "de doença muito baixa e homogênea também aperta as contagens. E o teste "
        "só vale para contagem de organismos ou lesões: contagem de estrutura da "
        "planta (estande, vagens, grãos por vagem) é regulada pelo manejo ou pelo "
        "desenvolvimento e é subdispersa por natureza.",
        p=p_sub, chave="subdispersao")


def _sim_variancias(rng, ns, N):
    """Variâncias amostrais sob σ²=1 — (N, len(ns)), em lote por tamanho de grupo."""
    ns = np.asarray(ns, int)
    out = np.empty((N, ns.size))
    for n in np.unique(ns):
        col = np.where(ns == n)[0]
        x = rng.normal(0.0, 1.0, size=(N, col.size, int(n)))
        out[:, col] = np.var(x, axis=2, ddof=1)
    return out


def _cv_linhas(V):
    """CV por linha de uma matriz (N, k) de variâncias."""
    mu = V.mean(axis=1)
    sd = V.std(axis=1, ddof=1)
    return np.where(mu > 0, sd / np.where(mu > 0, mu, 1.0), 0.0)


def _desenho_bidirecional(estratos):
    """
    Estrutura tratamento × bloco de cada estrato, ACEITANDO parcelas perdidas.
    Exigir balanceamento desligava o desconto de bloco no estudo inteiro por
    causa de uma única parcela perdida — rotina em campo —, e aí o gradiente
    voltava a imitar anomalia. Com perdas, os resíduos saem por centragem
    alternada (converge para mínimos quadrados em desenho conexo), e o nulo
    Monte Carlo passa pela MESMA centragem, então a calibração é automática.
    Devolve None se algum estrato não tiver estrutura de bloco utilizável.
    """
    out = []
    for e in estratos:
        trats = list(e["grupos"].keys())
        blocos = sorted({str(b) for t in trats for b in e["blocos"][t] if str(b).strip()})
        if len(trats) < 2 or len(blocos) < 3:
            return None
        bidx = {b: k for k, b in enumerate(blocos)}
        ys, ti, bi = [], [], []
        for a_, t in enumerate(trats):
            for v, b in zip(e["grupos"][t], e["blocos"][t]):
                if not str(b).strip():
                    return None
                ys.append(float(v))
                ti.append(a_)
                bi.append(bidx[str(b)])
        ti = np.asarray(ti, np.intp)
        bi = np.asarray(bi, np.intp)
        if len(set(zip(ti.tolist(), bi.tolist()))) != ti.size:
            return None  # tratamento repetido no mesmo bloco: não é blocos casualizados
        if np.min(np.bincount(bi, minlength=len(blocos))) < 2 or \
           np.min(np.bincount(ti, minlength=len(trats))) < 2:
            return None
        gl = ti.size - len(trats) - len(blocos) + 1
        if gl < 1:
            return None
        out.append({"y": np.asarray(ys, float), "ti": ti, "bi": bi,
                    "a": len(trats), "r": len(blocos), "gl": int(gl)})
    return out or None


def _res_bidir(X, d, it=12):
    """
    Resíduos do modelo aditivo tratamento + bloco no último eixo de X, por
    centragem alternada. Em desenho balanceado a 1ª passada já é exata; com
    parcelas perdidas converge geometricamente. Sem BLAS: laço pelos níveis.
    """
    R = np.array(X, dtype=float, copy=True)
    mt = [d["ti"] == k for k in range(d["a"])]
    mb = [d["bi"] == k for k in range(d["r"])]
    for _ in range(it):
        for m in mt:
            R[..., m] -= R[..., m].mean(axis=-1, keepdims=True)
        for m in mb:
            R[..., m] -= R[..., m].mean(axis=-1, keepdims=True)
    return R


def _cv_de_lote(V):
    mu = V.mean(axis=-1)
    sd = V.std(axis=-1, ddof=1)
    return np.where(mu > 0, sd / np.where(mu > 0, mu, 1.0), 0.0)


def _v_por_trat(R, d):
    """Soma de quadrados residual por tratamento / nº de parcelas dele."""
    return np.stack([np.mean(R[..., d["ti"] == k] ** 2, axis=-1)
                     for k in range(d["a"])], axis=-1)


def teste_homogeneidade_var(estratos, rng, N, mats=None):
    """
    Variâncias parecidas demais entre grupos. A estatística é o CV das
    variâncias; o nulo é Monte Carlo com EXATAMENTE o mesmo desenho e a mesma
    transformação. Assim o teste se calibra sozinho: o CV esperado cai de
    ~0,82 com 4 repetições para ~0,47 com 10, e um corte fixo em 0,35
    acusaria o ensaio grande e cegaria o pequeno.
    Com repetição/bloco informada, mede a variância dos RESÍDUOS de
    tratamento+bloco (parcelas perdidas incluídas); o nulo passa pela mesma remoção, então o
    efeito de bloco não conta nem a favor nem contra.
    """
    if mats:
        obs_cv, nulos_acc = [], np.zeros(N)
        for d in mats:
            obs_cv.append(float(_cv_de_lote(_v_por_trat(_res_bidir(d["y"], d), d))))
            X = rng.normal(0.0, 1.0, size=(N, d["y"].size))
            nulos_acc += _cv_de_lote(_v_por_trat(_res_bidir(X, d), d))
        cv_obs = float(np.mean(obs_cv))
        nulos = nulos_acc / len(mats)
        ajuste = " · resíduos de trat+bloco"
    else:
        layouts, obs_cv = [], []
        for e in estratos:
            pares = [(len(v), float(np.var(v, ddof=1)))
                     for v in e["grupos"].values() if len(v) >= 2]
            if len(pares) < 3:
                continue
            ns = [p[0] for p in pares]
            varis = np.array([p[1] for p in pares])
            layouts.append(ns)
            m = float(varis.mean())
            obs_cv.append(float(varis.std(ddof=1) / m) if m > 0 else 0.0)
        if not layouts:
            return _inconclusivo(
                "Homogeneidade anômala de variância",
                "dados insuficientes",
                "São necessários ao menos 3 grupos com 2 ou mais repetições em "
                "algum estrato. O teste não foi executado.",
                chave="homog_var")
        cv_obs = float(np.mean(obs_cv))
        cvs = np.empty((N, len(layouts)))
        for j, ns in enumerate(layouts):
            cvs[:, j] = _cv_de_lote(_sim_variancias(rng, ns, N))
        nulos = cvs.mean(axis=1)
        ajuste = ""
    p = _p_mc(cv_obs, nulos, "menor")
    esperado = float(np.median(nulos))
    return _achado(
        "Homogeneidade anômala de variância", "clear",
        f"CV das variâncias {cv_obs:.2f} (nulo ≈ {esperado:.2f}){ajuste} · p={_fmt_p(p)}",
        (f"CV das variâncias = {cv_obs:.2f}; sob variação honesta com este mesmo "
         f"desenho esperava-se ≈ {esperado:.2f} (p={_fmt_p(p)}, {N} reamostras)"
         + (", medido nos resíduos depois de remover tratamento e bloco. "
            if mats else ". ")
         + ("As dispersões dos grupos são uniformes demais entre si, como se "
            "tivessem saído de um mesmo molde."
            if p < 0.10 else
            "Dispersões desiguais entre grupos, como se espera de dados reais.")),
        "Protocolos muito padronizados, tratamentos com efeito biológico "
        "parecido e variável com teto natural (ex.: severidade baixa em todos) "
        "aproximam as variâncias legitimamente."
        + ("" if mats else " Sem repetição/bloco informada, um gradiente de campo "
           "forte também iguala as variâncias sem que haja anomalia."),
        p=p, chave="homog_var", teto=None if mats else "watch")


def teste_extremos(estratos, rng, N, mats=None):
    """
    Dados 'lisos demais'. Mede o maior resíduo padronizado INTRA-GRUPO — não o
    desvio em relação à média geral. Essa é a correção decisiva: com efeito de
    tratamento forte, o desvio em relação à média geral fica grande por causa
    do tratamento, e o teste nunca acusaria suavização. Com bloco informado,
    o resíduo também desconta o bloco, senão o gradiente
    de campo regulariza os desvios e imita suavização.
    """
    if mats:
        somas, maxs, gl = 0.0, 0.0, 0
        nulo_sq = np.zeros(N)
        nulo_mx = np.zeros(N)
        for d in mats:
            R = _res_bidir(d["y"], d)
            somas += float(np.sum(R ** 2))
            maxs = max(maxs, float(np.max(np.abs(R))))
            gl += d["gl"]
            X = _res_bidir(rng.normal(0.0, 1.0, size=(N, d["y"].size)), d)
            nulo_sq += np.sum(X ** 2, axis=1)
            nulo_mx = np.maximum(nulo_mx, np.max(np.abs(X), axis=1))
        n_obs = int(sum(d["y"].size for d in mats))
        ajuste = " · resíduos de trat+bloco"
    else:
        ns, resid = [], []
        for e in estratos:
            for vals in e["grupos"].values():
                if len(vals) < 2:
                    continue
                ns.append(len(vals))
                resid.append(vals - float(np.mean(vals)))
        if not resid:
            return _inconclusivo("Ausência de valores extremos",
                                 "dados insuficientes",
                                 "Nenhum grupo com 2 ou mais repetições. Não executado.",
                                 chave="extremos")
        rr = np.concatenate(resid)
        somas = float(np.sum(rr ** 2))
        maxs = float(np.max(np.abs(rr)))
        gl = int(sum(ns) - len(ns))
        n_obs = rr.size
        arr = np.asarray(ns, int)
        maxabs = np.empty((N, arr.size))
        sumsq = np.empty((N, arr.size))
        for n in np.unique(arr):
            col = np.where(arr == n)[0]
            x = rng.normal(0.0, 1.0, size=(N, col.size, int(n)))
            r0 = x - x.mean(axis=2, keepdims=True)
            maxabs[:, col] = np.max(np.abs(r0), axis=2)
            sumsq[:, col] = np.sum(r0 ** 2, axis=2)
        nulo_sq = sumsq.sum(axis=1)
        nulo_mx = maxabs.max(axis=1)
        ajuste = ""
    if n_obs < 12 or gl < 6:
        return _inconclusivo(
            "Ausência de valores extremos", "dados insuficientes",
            f"O teste exige ao menos 12 observações e 6 gl residuais (tem {n_obs} "
            f"e {gl}). Não foi executado.",
            chave="extremos")
    s = np.sqrt(somas / gl)
    if s == 0:
        return _achado(
            "Ausência de valores extremos", "flag", "desvio residual zero",
            "Todas as repetições de todos os grupos são idênticas — variância "
            "residual exatamente nula. Praticamente impossível em medição real.",
            "Só ocorre legitimamente se a variável for constante por definição "
            "(ex.: contagem sempre 0 em ausência total da praga).",
            p=0.0, chave="extremos")
    z_obs = maxs / s
    sn = np.sqrt(nulo_sq / gl)
    nulos = np.where(sn > 0, nulo_mx / np.where(sn > 0, sn, 1.0), 0.0)
    p = _p_mc(z_obs, nulos, "menor")
    esperado = float(np.median(nulos))
    return _achado(
        "Ausência de valores extremos", "clear",
        f"maior resíduo {z_obs:.2f}σ (nulo ≈ {esperado:.2f}σ){ajuste} · p={_fmt_p(p)}",
        (f"Maior resíduo = {z_obs:.2f}σ; o esperado neste desenho é "
         f"≈ {esperado:.2f}σ (p={_fmt_p(p)})"
         + (", depois de descontar tratamento e bloco. " if mats else ". ")
         + ("Nenhuma repetição destoa das demais — dados mais lisos do que a "
            "variação honesta produziria."
            if p < 0.10 else
            "A presença de valores destoantes é compatível com dados reais.")),
        "Amostras pequenas e variável pouco dispersa naturalmente não geram "
        "extremos. Depuração legítima de erros de anotação (com registro na "
        "trilha) também remove extremos."
        + ("" if mats else " Sem repetição/bloco informada, um gradiente de campo "
           "forte regulariza os desvios e imita suavização."),
        p=p, chave="extremos", teto=None if mats else "watch")


def teste_ultimo_digito(estratos, nulo, valores):
    """
    Preferência humana por certos dígitos finais. O nulo NÃO é 'cada dígito
    10%': isso só valeria se os valores cobrissem muitas dezenas. Com contagens
    de 0 a 20, o último dígito é naturalmente desigual e o χ² uniforme acusaria
    fraude em dado honesto. Aqui o nulo vem da reamostragem condicional
    (mesma média e dispersão), então o teste pergunta a coisa certa: os dígitos
    são mais desiguais do que a própria distribuição dos valores já explica?
    """
    intn = valores[np.abs(valores - np.round(valores)) < 1e-9]
    if intn.size < 20:
        return _inconclusivo(
            "Preferência por dígito final", f"{intn.size} valores inteiros",
            "O teste exige ao menos 20 valores inteiros. Não foi executado. "
            "Analisar o estudo inteiro de uma vez (em vez de avaliação por "
            "avaliação) costuma resolver.",
            chave="digito")

    def _chi(v):
        d = np.mod(np.abs(np.round(v)).astype(np.intp), 10)
        cont = np.bincount(d, minlength=10).astype(float)
        esp = cont.sum() / 10.0
        return float(np.sum((cont - esp) ** 2 / esp)) if esp > 0 else 0.0

    obs = _chi(intn)
    mask = np.abs(valores - np.round(valores)) < 1e-9
    nulos = np.array([_chi(nulo[k][mask]) for k in range(nulo.shape[0])])
    p = _p_mc(obs, nulos, "maior")
    d = np.mod(np.abs(np.round(intn)).astype(np.intp), 10)
    cont = np.bincount(d, minlength=10)
    top = int(np.argmax(cont))
    return _achado(
        "Preferência por dígito final", "clear",
        f"χ²={obs:.1f} · n={intn.size} · p={_fmt_p(p)}",
        (f"Dígito final mais frequente: {top} ({cont[top]/intn.size*100:.0f}% dos "
         f"{intn.size} valores inteiros). χ²={obs:.1f} contra o nulo reamostrado "
         f"com a mesma dispersão (p={_fmt_p(p)}). "
         + ("A desigualdade excede o que a distribuição dos valores explica — "
            "compatível com preferência de quem anotou."
            if p < 0.10 else
            "Sem preferência de dígito além do que a própria escala dos valores "
            "já produz.")),
        "Arredondamento previsto no protocolo (contar de 2 em 2, estimar de 5 em "
        "5) concentra dígitos sem qualquer fraude. Instrumento com resolução "
        "grosseira também.",
        p=p, chave="digito")


def teste_heaping(estratos, nulo, valores):
    """
    Arredondamento preferencial em múltiplos de 5. O nulo de 20% do original é
    falso fora de escalas amplas: com valores de 0 a 12, os múltiplos de 5 são
    {0,5,10} — 23% por construção. A fração esperada passa a vir da mesma
    reamostragem condicional.
    """
    intn = valores[np.abs(valores - np.round(valores)) < 1e-9]
    if intn.size < 15:
        return _inconclusivo(
            "Arredondamento preferencial (múltiplos de 5)",
            f"{intn.size} valores inteiros",
            "O teste exige ao menos 15 valores inteiros. Não foi executado.",
            chave="heaping")
    mask = np.abs(valores - np.round(valores)) < 1e-9
    frac = float(np.mean(np.mod(np.abs(np.round(intn)).astype(np.intp), 5) == 0))
    nulos = np.array([
        float(np.mean(np.mod(np.abs(np.round(nulo[k][mask])).astype(np.intp), 5) == 0))
        for k in range(nulo.shape[0])])
    p = _p_mc(frac, nulos, "maior")
    esp = float(np.mean(nulos))
    return _achado(
        "Arredondamento preferencial (múltiplos de 5)", "clear",
        f"{frac*100:.0f}% múltiplos de 5 (nulo {esp*100:.0f}%) · n={intn.size} · p={_fmt_p(p)}",
        (f"{frac*100:.0f}% dos valores são múltiplos de 5; a mesma distribuição "
         f"sem arredondamento produziria {esp*100:.0f}% (p={_fmt_p(p)}). "
         + ("Concentração em valores redondos além do explicável — sugere "
            "estimativa visual em vez de contagem exata."
            if p < 0.10 else
            "Sem excesso de valores redondos.")),
        "Se o protocolo prevê estimativa visual de percentual, valores redondos "
        "são esperados e legítimos. Só é relevante quando se espera contagem "
        "unitária exata.",
        p=p, chave="heaping")


def _blocos_indices(estratos, n_min=3):
    """(estrato, início, n) de cada grupo elegível, na ordem de _todos_valores."""
    idx, pos = [], 0
    for ie, e in enumerate(estratos):
        for t, vals in e["grupos"].items():
            n = len(vals)
            if n >= n_min:
                idx.append((ie, pos, n, t))
            pos += n
    return idx


def _assinatura_blocos(mat, blocos, W):
    """
    Assinatura numérica de cada bloco ORDENADO: h = Σ vᵢ·wᵢ com pesos aleatórios
    fixos. Ordenar antes torna a comparação insensível à ordem das repetições —
    a v1 comparava a sequência crua, então [1,2,3] e [3,2,1] escapavam. Blocos
    idênticos produzem exatamente a mesma soma em ponto flutuante; blocos
    diferentes só colidiriam por acaso astronômico, e a comparação é feita
    apenas dentro do mesmo estrato e mesmo n.
    """
    H = np.empty((mat.shape[0], len(blocos)))
    for j, (_, st, n, _t) in enumerate(blocos):
        H[:, j] = np.sum(np.sort(mat[:, st:st + n], axis=1) * W[n], axis=1)
    return H


def _pares_iguais(H, classes):
    """Nº de pares de blocos idênticos por réplica, comparando só dentro da classe."""
    tot = np.zeros(H.shape[0])
    for cid in set(classes):
        cols = [j for j, c in enumerate(classes) if c == cid]
        if len(cols) < 2:
            continue
        S = np.sort(H[:, cols], axis=1)
        tot += np.sum(np.diff(S, axis=1) == 0, axis=1)
    return tot


def teste_duplicatas(estratos, nulo, valores, rng):
    """
    Repetição de blocos inteiros de valores (copy-paste). Duas correções sobre
    a v1: (1) compara o CONJUNTO ordenado de repetições, então [1,2,3] e
    [3,2,1] contam como duplicata — antes escapavam; (2) o excesso é medido
    contra o nulo reamostrado, porque com contagens pequenas coincidir é
    banal e um par idêntico não significa nada por si.
    """
    blocos = _blocos_indices(estratos, n_min=3)
    if len(blocos) < 3:
        return _inconclusivo(
            "Blocos de repetições duplicados", "dados insuficientes",
            "São necessários ao menos 3 grupos com 3 ou mais repetições. "
            "Não foi executado.",
            chave="duplicatas")
    W = {n: rng.normal(0.0, 1.0, n) for n in {b[2] for b in blocos}}
    classes = [(b[0], b[2]) for b in blocos]
    H_obs = _assinatura_blocos(valores[None, :], blocos, W)
    obs = int(_pares_iguais(H_obs, classes)[0])
    nulos = _pares_iguais(_assinatura_blocos(nulo, blocos, W), classes)
    p = _p_mc(obs, nulos, "maior")
    esp = float(np.mean(nulos))

    rotulos = []
    if obs:
        vistos = {}
        for (ie, st, n, t) in blocos:
            chave = (ie, n, "|".join(f"{v:.6g}" for v in np.sort(valores[st:st + n])))
            if chave in vistos:
                rot = f"{vistos[chave]} ≡ {t}"
                if len(estratos) > 1:
                    rot += f" ({estratos[ie]['rotulo']})"
                rotulos.append(rot)
            else:
                vistos[chave] = t
    leitura = ("Nenhum grupo repete exatamente o conjunto de valores de outro "
               "no mesmo estrato."
               if not obs else
               f"{obs} par(es) de grupos com o mesmo conjunto de repetições: "
               + "; ".join(rotulos[:4]) + ("…" if len(rotulos) > 4 else "")
               + f". Sob reamostragem honesta esperava-se {esp:.2f} par(es) "
                 f"(p={_fmt_p(p)}).")
    return _achado(
        "Blocos de repetições duplicados", "clear",
        f"{obs} par(es) (nulo {esp:.2f}) · p={_fmt_p(p)}",
        leitura,
        "Com contagens pequenas e poucas repetições, coincidência é comum — por "
        "isso a comparação é contra o nulo, não contra zero. Conjuntos longos e "
        "de valores altos idênticos é que são improváveis por acaso.",
        p=p, chave="duplicatas")


def teste_gradiente_campo(estratos):
    """
    Ausência de gradiente de campo (NOVO). Em ensaio casualizado em blocos, o
    bloco captura a heterogeneidade do terreno e quase sempre tem F > 1. Dado
    montado em planilha não conhece o terreno: o F do bloco desaba para perto
    de zero. A hipótese nula é 'não há efeito de bloco', sob a qual F ~ F(gl),
    e o sinal é a CAUDA INFERIOR — F menor do que o próprio acaso produziria.
    Formulado assim, o teste não pune o ensaio honesto sem gradiente: ausência
    de efeito é o nulo, e só a ausência EXCESSIVA (variação entre blocos menor
    que a residual) acusa.
    Exige desenho balanceado (cada tratamento uma vez por bloco).
    """
    ps, detalhes = [], []
    for e in estratos:
        trats = list(e["grupos"].keys())
        blocos_set = sorted({b for t in trats for b in e["blocos"][t] if b})
        a, rr = len(trats), len(blocos_set)
        if a < 2 or rr < 3:
            continue
        celulas = {}
        ok = True
        for t in trats:
            for b, v in zip(e["blocos"][t], e["grupos"][t]):
                if (t, b) in celulas:
                    ok = False
                    break
                celulas[(t, b)] = v
            if not ok:
                break
        if not ok or len(celulas) != a * rr:
            continue  # desbalanceado: SQ não decompõe exatamente
        M = np.array([[celulas[(t, b)] for b in blocos_set] for t in trats], float)
        gm = M.mean()
        sq_trat = rr * float(np.sum((M.mean(axis=1) - gm) ** 2))
        sq_bloco = a * float(np.sum((M.mean(axis=0) - gm) ** 2))
        sq_tot = float(np.sum((M - gm) ** 2))
        gl_res = (a - 1) * (rr - 1)
        sq_res = sq_tot - sq_trat - sq_bloco
        if gl_res < 4 or sq_res <= 1e-12:
            continue
        F = (sq_bloco / (rr - 1)) / (sq_res / gl_res)
        p_baixo = float(stats.f.cdf(F, rr - 1, gl_res))
        ps.append(p_baixo)
        detalhes.append(f"{e['rotulo']}: F={F:.2f}")
    if not ps:
        return _inconclusivo(
            "Ausência de gradiente de campo (efeito de bloco)",
            "desenho não elegível",
            "Exige repetição/bloco informado, desenho balanceado (cada tratamento "
            "uma vez por bloco), ≥3 blocos e ≥4 gl residuais. Não foi executado.",
            chave="bloco")
    p = _combinar_fisher(ps)
    return _achado(
        "Ausência de gradiente de campo (efeito de bloco)", "clear",
        f"{len(ps)} estrato(s) · p={_fmt_p(p)}"
        + (" · " + "; ".join(detalhes[:3]) if detalhes else ""),
        ("F do bloco na cauda inferior (p={}) — a variação ENTRE blocos é menor "
         "que a variação dentro deles. Em campo o bloco costuma captar o "
         "gradiente do terreno; sua ausência a esse ponto sugere valores gerados "
         "sem referência à posição real da parcela.".format(_fmt_p(p))
         if p is not None and p < 0.10 else
         "Efeito de bloco compatível com o esperado — há heterogeneidade "
         "espacial nos dados, como em campo real."),
        "Área muito uniforme (estufa, casa de vegetação, ensaio pequeno) "
        "legitimamente não tem gradiente. Se o 'bloco' na planilha for apenas o "
        "número da repetição sem correspondência espacial, o teste não se aplica.",
        p=p, chave="bloco")


def _corr_lote(a, B):
    """Pearson entre o vetor fixo a (n,) e cada linha de B (N, n)."""
    ac = a - a.mean()
    Bc = B - B.mean(axis=1, keepdims=True)
    den = np.sqrt(float(np.sum(ac ** 2)) * np.sum(Bc ** 2, axis=1))
    return np.where(den > 0, np.sum(Bc * ac, axis=1) / np.where(den > 0, den, 1.0), 0.0)


def _residuos_trat_bloco(estratos, tipo):
    """
    Resíduos após remover o efeito do TRATAMENTO e o efeito comum do BLOCO,
    por estrato. Contagem é levada a √y antes, onde o efeito de bloco é
    aproximadamente aditivo (a variância de Poisson cresce com a média, então
    na escala crua um gradiente aparece proporcional ao nível do tratamento).
    Centragem alternada converge também em desenho desbalanceado.
    Devolve [(ordem, residuo)] por tratamento e o vetor de médias por bloco.
    """
    pares, comuns = [], []
    for e in estratos:
        trats = [t for t, v in e["grupos"].items() if len(v) >= 3]
        if len(trats) < 2:
            continue
        ys, ts, bs = [], [], []
        for t in trats:
            vals = np.asarray(e["grupos"][t], float)
            ys.append(np.sqrt(np.maximum(vals, 0)) if tipo == "count" else vals)
            ts.append(np.full(len(vals), t, dtype=object))
            bs.append(np.asarray(e["blocos"][t], dtype=object))
        y = np.concatenate(ys)
        t_arr = np.concatenate(ts)
        b_arr = np.concatenate(bs)
        blocos_unicos = sorted({str(b) for b in b_arr})
        if len(blocos_unicos) < 3:
            continue
        r = y.astype(float).copy()
        for _ in range(4):  # centragem alternada trat/bloco
            for t in trats:
                m = t_arr == t
                r[m] -= r[m].mean()
            for b in blocos_unicos:
                m = np.asarray([str(x) == b for x in b_arr])
                if m.any():
                    r[m] -= r[m].mean()
        # tendência comum entre blocos (contexto, não sinal)
        medias_b, ordem_b = [], []
        for b in blocos_unicos:
            m = np.asarray([str(x) == b for x in b_arr])
            medias_b.append(float(y[m].mean()))
            try:
                ordem_b.append(float(b.strip()))
            except Exception:
                ordem_b.append(float(blocos_unicos.index(b)))
        if len(set(ordem_b)) >= 3:
            comuns.append((np.asarray(ordem_b), np.asarray(medias_b)))
        for t in trats:
            m = t_arr == t
            try:
                ordem = np.array([float(str(x).strip()) for x in b_arr[m]])
            except Exception:
                ordem = np.array([blocos_unicos.index(str(x)) for x in b_arr[m]], float)
            if np.unique(ordem).size >= 3:
                pares.append((stats.rankdata(ordem), stats.rankdata(r[m])))
    return pares, comuns


def confer_gradiente_numeracao(estratos, tipo):
    """
    Tendência comum das médias ao longo do número da repetição. É CONTEXTO, não
    sinal: um gradiente espacial real (rep 1 na borda, rep n no fundo — a
    numeração usual em campo) e o preenchimento em ordem produzem exatamente o
    mesmo efeito comum, e nenhuma estatística separa os dois. Pontuar isso como
    indício marcava ~90% dos estudos honestos com gradiente forte.
    """
    _, comuns = _residuos_trat_bloco(estratos, tipo)
    if not comuns:
        return None
    rs = []
    for ordem, medias in comuns:
        if np.unique(medias).size < 2 or np.unique(ordem).size < 2:
            continue  # entrada constante: correlação indefinida
        r = stats.spearmanr(ordem, medias).statistic
        if np.isfinite(r):
            rs.append(float(r))
    if not rs:
        return None
    rho = float(np.mean(rs))
    return _achado(
        "Gradiente entre repetições (contexto)", "clear",
        f"ρ médio {rho:+.2f} · {len(rs)} estrato(s)",
        (f"As médias por repetição {'sobem' if rho > 0 else 'descem'} de forma "
         f"monotônica com o número da repetição (ρ = {rho:+.2f})."
         if abs(rho) > 0.6 else
         f"Sem tendência monotônica marcante entre as repetições (ρ = {rho:+.2f}).")
        + " Informativo apenas: se as repetições foram numeradas na ordem "
          "espacial do campo, é o gradiente do terreno; se não foram, vale "
          "perguntar por que a ordem importa. As duas causas são "
          "estatisticamente indistinguíveis, então isto não é pontuado.",
        chave="gradiente_num")


def teste_ordem_repeticao(estratos, rng, N, tipo):
    """
    Ordenação das repetições ESPECÍFICA DE CADA TRATAMENTO (NOVO). O efeito
    comum a todos os tratamentos é removido antes (médias de tratamento e de
    bloco), porque ele é indistinguível de um gradiente de campo legítimo e
    fazia o teste marcar 90% dos ensaios honestos numerados na ordem espacial.
    O que sobra — cada tratamento subindo ou descendo com a repetição no seu
    próprio ritmo — não tem explicação espacial: o gradiente do terreno atinge
    todas as parcelas da mesma repetição, não uma linha da planilha.
    Nulo por permutação dos resíduos dentro do tratamento.
    """
    pares, _ = _residuos_trat_bloco(estratos, tipo)
    if len(pares) < 4:
        return _inconclusivo(
            "Ordenação das repetições por tratamento", "dados insuficientes",
            "Exige repetição/bloco informado, ao menos 3 blocos e 4 grupos com 3 "
            "ou mais repetições distintas após remover os efeitos de tratamento e "
            "bloco. Não foi executado.",
            chave="ordem")
    M = min(int(N), 1000)
    obs_acc = 0.0
    nul_acc = np.zeros(M)
    for ro, rv in pares:
        n = rv.size
        obs_acc += float(np.abs(_corr_lote(ro, rv[None, :]))[0])
        perm = rv[np.argsort(rng.random((M, n)), axis=1)]
        nul_acc += np.abs(_corr_lote(ro, perm))
    obs = obs_acc / len(pares)
    nulos = nul_acc / len(pares)
    p = _p_mc(obs, nulos, "maior")
    esp = float(np.mean(nulos))
    return _achado(
        "Ordenação das repetições por tratamento", "clear",
        f"|ρ| residual {obs:.2f} (nulo {esp:.2f}) · {len(pares)} grupos · p={_fmt_p(p)}",
        (f"Depois de remover o efeito do tratamento e o gradiente comum entre "
         f"repetições, sobra |ρ| = {obs:.2f} contra {esp:.2f} esperado "
         f"(p={_fmt_p(p)}). "
         + ("Cada tratamento ainda sobe ou desce com o número da repetição no "
            "seu próprio ritmo — um gradiente de terreno atinge todas as "
            "parcelas de uma repetição igualmente e não explica isso."
            if p < 0.10 else
            "Nenhuma ordenação sobra por tratamento; a variação entre "
            "repetições é a comum a todos, compatível com gradiente de campo.")),
        "Manejo diferente por faixa (a repetição 1 de cada tratamento colhida "
        "primeiro, bordadura de um lado só, irrigação desigual ao longo da "
        "linha) pode produzir ordenação específica de tratamento sem fraude.",
        p=p, chave="ordem")


def teste_acoplamento(grupos_a, grupos_b, rng, N=5000):
    """
    Acoplamento entre dois conjuntos que deveriam ser independentes. Permutação
    por bloco, agora vetorizada (a v1 fazia 5000 embaralhamentos em laço Python,
    o que dominava o tempo da triagem no Pyodide).
    """
    if not grupos_b:
        return None
    xs, ys, blocos = [], [], []
    pos = 0
    for k in grupos_a:
        if k not in grupos_b:
            continue
        a, b = grupos_a[k], grupos_b[k]
        m = min(len(a), len(b))
        if m < 2:
            continue
        xs.extend(a[:m])
        ys.extend(b[:m])
        blocos.append((pos, m))
        pos += m
    if len(xs) < 8:
        return _inconclusivo(
            "Acoplamento entre as duas avaliações", "dados insuficientes",
            "Poucos pares correspondentes para o teste de permutação (mínimo 8). "
            "A comparação não foi realizada.",
            chave="acoplamento")
    x = np.asarray(xs, float)
    y = np.asarray(ys, float)
    n = x.size

    def _r(Y):
        xc = x - x.mean()
        yc = Y - Y.mean(axis=-1, keepdims=True)
        den = np.sqrt(np.sum(xc ** 2) * np.sum(yc ** 2, axis=-1))
        return np.where(den > 0, np.sum(xc * yc, axis=-1) / np.where(den > 0, den, 1), 0.0)

    r_obs = float(_r(y[None, :])[0])
    Y = np.tile(y, (N, 1))
    for ini, m in blocos:
        idx = np.argsort(rng.random((N, m)), axis=1) + ini
        Y[:, ini:ini + m] = np.take_along_axis(Y, idx, axis=1)
    nulos = _r(Y)
    p = _p_mc(r_obs, nulos, "maior")
    nm, ns = float(np.mean(nulos)), float(np.std(nulos))
    return _achado(
        "Acoplamento entre as duas avaliações", "clear",
        f"r={r_obs:.2f} · nulo {nm:.2f}±{ns:.2f} · {N} permutações · p={_fmt_p(p)}",
        (f"Correspondência repetição-a-repetição r = {r_obs:.2f} (nulo "
         f"{nm:.2f}±{ns:.2f}, p={_fmt_p(p)}). "
         + ("As repetições das duas avaliações casam posição-a-posição mais do "
            "que o efeito de tratamento explicaria — compatível com tabelas "
            "alinhadas ou copiadas."
            if p < 0.10 else
            "As duas avaliações concordam apenas no que o efeito de tratamento "
            "explica, como se espera de avaliações independentes.")),
        "Se as duas avaliações foram feitas na MESMA parcela física (mesma "
        "posição = mesma planta), correspondência alta é esperada e legítima. O "
        "teste só acusa quando deveriam ser espacialmente independentes.",
        p=p, chave="acoplamento")


# ----------------------------------------------------------------------
# CONFERÊNCIAS (não são testes: não entram na correção de multiplicidade)
# ----------------------------------------------------------------------
def confer_limites(valores, escala):
    """Valores fora do domínio da escala — erro material, não indício."""
    if escala != "pct":
        return None
    fora = int(np.sum((valores < -1e-9) | (valores > 100 + 1e-9)))
    piso = int(np.sum(np.abs(valores) < 1e-9))
    teto = int(np.sum(np.abs(valores - 100) < 1e-9))
    n = valores.size
    if fora:
        return _achado(
            "Valores fora da escala 0–100%", "flag", f"{fora} de {n} valores",
            f"{fora} valor(es) fora do intervalo 0–100% em variável percentual. "
            "Isto é erro material de anotação, digitação ou unidade — corrija ou "
            "documente antes de qualquer análise.",
            "Coluna que na verdade não é percentual (contagem, nota, índice) "
            "marcada como percentual na importação.",
            chave="limites")
    return _achado(
        "Valores fora da escala 0–100%", "clear", f"0 de {n} valores",
        f"Todos os valores caem em 0–100%. Nos limites: {piso} zero(s) e {teto} "
        "valor(es) 100% — legítimo (ausência total ou tomada completa), apenas "
        "registrado para leitura das médias.",
        chave="limites")


def confer_estrutura(estratos):
    """
    Grupos com nº de repetições diferente. Parcela perdida é rotina em campo, e
    como ATENÇÃO fixa isto sozinho levava ~100% dos estudos com UMA perda ao
    veredito OBSERVAR. Agora é contexto; só pede atenção quando a falta é
    grande o bastante para sugerir corte na importação (>15% das parcelas
    esperadas, ou algum grupo com menos de 2 valores).
    """
    tamanhos = [len(v) for e in estratos for v in e["grupos"].values()]
    if len(set(tamanhos)) <= 1:
        return None
    esperado = max(tamanhos) * len(tamanhos)
    faltam = esperado - sum(tamanhos)
    frac = faltam / esperado if esperado else 0.0
    grave = frac > 0.15 or min(tamanhos) < 2
    return _achado(
        "Estrutura dos dados", "watch" if grave else "clear",
        f"{faltam} parcela(s) faltando de {esperado} ({frac*100:.0f}%)",
        (f"Faltam {faltam} de {esperado} valores esperados ({frac*100:.0f}%)"
         + (" — mais do que perdas usuais de campo; confirme se a importação "
            "não cortou valores." if grave else
            ". Perda pequena, compatível com parcelas perdidas em campo; os "
            "testes com bloco já a acomodam.")),
        "Perdas de parcela em campo são comuns e legítimas; verifique apenas se "
        "a importação não cortou valores.",
        chave="estrutura")


def confer_eficacia(estratos, controle):
    if controle is None or controle <= 0:
        return None
    neg = []
    for e in estratos:
        for nome, vals in e["grupos"].items():
            ef = (controle - float(np.mean(vals))) / controle * 100
            if ef < -5:
                neg.append(nome)
    neg = sorted(set(neg))
    return _achado(
        "Reconciliação de %eficácia", "watch" if neg else "clear",
        f"controle={controle:.2f}",
        (f"Eficácia recalculada contra controle = {controle:.2f}. Grupos com "
         f"eficácia negativa (>5%): {', '.join(neg)} — incidência acima do "
         "controle. Pode ser real (fitotoxicidade/antagonismo) ou erro."
         if neg else
         f"Eficácia recalculada contra controle = {controle:.2f}. Todas as "
         "eficácias derivam coerentemente do controle informado."),
        "Eficácia negativa real ocorre por fitotoxicidade, antagonismo de "
        "mistura ou variação espacial — não é, por si, sinal de fraude.",
        chave="eficacia")


# ----------------------------------------------------------------------
# multiplicidade e veredito
# ----------------------------------------------------------------------
def _benjamini_hochberg(achados, modo):
    """
    Ajusta os p-valores dos testes executados (Benjamini-Hochberg) e só então
    atribui severidade. Sem isso, 8 testes a 5% dariam ~34% de chance de ao
    menos um alarme falso em dados perfeitamente honestos.
    """
    com_p = [a for a in achados if a.get("executado") and a.get("p") is not None]
    m = len(com_p)
    if m:
        ordenados = sorted(com_p, key=lambda a: a["p"])
        menor = 1.0
        for i in range(m - 1, -1, -1):
            q = min(1.0, ordenados[i]["p"] * m / (i + 1))
            menor = min(menor, q)
            ordenados[i]["q"] = menor
    reg = _REGUA.get(modo, _REGUA["conservador"])
    ordem_sev = {"clear": 0, "watch": 1, "flag": 2}
    for a in com_p:
        q = a["q"]
        sev = ("flag" if q <= reg["flag"]
               else "watch" if q <= reg["watch"]
               else "clear")
        teto = a.get("teto")
        if teto and ordem_sev[sev] > ordem_sev[teto]:
            sev = teto
            a["leitura"] += (" Severidade limitada a ATENÇÃO: sem a informação "
                             "necessária para descartar a explicação benigna, "
                             "escalar seria afirmar mais do que a evidência "
                             "sustenta.")
        a["severidade"] = sev
        if a["q"] is not None:
            a["estatistica"] += f" · q={_fmt_p(a['q'])}"
    return m


def _pontuar(achados, testes, modo):
    reg = _REGUA.get(modo, _REGUA["conservador"])
    flags = sum(1 for a in achados if a["severidade"] == "flag")
    watches = sum(1 for a in achados if a["severidade"] == "watch")
    previstos = len(testes)
    executados = sum(1 for a in testes if a.get("executado"))
    cobertura = executados / previstos if previstos else 0.0
    suficiente = executados >= 3 and cobertura >= 0.5
    nao_rodaram = [a["nome"] for a in testes if not a.get("executado")]

    if flags:
        nivel, classe = "INVESTIGAR", "flag"
        resumo = (
            f"{flags} teste(s) sinalizando após correção de multiplicidade "
            f"(Benjamini-Hochberg, q ≤ {reg['flag']:.2f} em {executados} testes "
            "executados). Isso significa que o padrão não se explica por acaso "
            "nem pelo número de testes feitos. Verifique os cadernos brutos e a "
            "trilha de auditoria dos pontos marcados. Não constitui prova de "
            "fraude: leia a explicação inocente de cada achado antes de concluir.")
    elif not suficiente:
        nivel, classe = "EVIDÊNCIA INSUFICIENTE", "watch"
        resumo = (
            f"Apenas {executados} de {previstos} testes produziram resultado "
            "interpretável — não há cobertura para afirmar ausência de sinais. "
            + (f"Não rodaram: {', '.join(nao_rodaram[:4])}"
               + ("…" if len(nao_rodaram) > 4 else "") + ". " if nao_rodaram else "")
            + "Rodar a triagem no estudo inteiro (todas as avaliações juntas) em "
              "vez de avaliação por avaliação costuma resolver, por acumular "
              "valores suficientes para os testes de dígito e duplicata.")
    elif watches:
        nivel, classe = "OBSERVAR", "watch"
        resumo = (
            f"{watches} sinal(is) de atenção (q ≤ {reg['watch']:.2f}), nenhum "
            f"forte, em {executados} testes executados. Um indício isolado nesta "
            "faixa tem explicações legítimas frequentes — confira a origem dos "
            "dados apontados, sem tratar como caso."
            + (f" Não rodaram: {', '.join(nao_rodaram)}." if nao_rodaram else ""))
    else:
        nivel, classe = "SEM SINAIS RELEVANTES", "clear"
        resumo = (
            f"Os {executados} testes executados não acusaram anomalia. Isto NÃO "
            "certifica os dados como genuínos: significa que, nos padrões que "
            "esta triagem sabe medir, nada destoa do esperado para dados reais."
            + (f" Fora do alcance desta rodada: {', '.join(nao_rodaram)} — "
               "por falta de dados, não por terem passado."
               if nao_rodaram else ""))
    return {
        "nivel": nivel, "classe": classe, "flags": flags, "watches": watches,
        "modo": modo, "resumo": resumo,
        "testes_previstos": previstos, "testes_executados": executados,
        "testes_inconclusivos": previstos - executados,
        "cobertura": float(cobertura), "cobertura_suficiente": bool(suficiente),
        "nao_executados": nao_rodaram,
        "limiar_flag": reg["flag"], "limiar_watch": reg["watch"],
    }


# ----------------------------------------------------------------------
# entrada principal (contrato igual aos demais módulos)
# ----------------------------------------------------------------------
def analisar_forense(dados, papeis, opcoes=None):
    opcoes = opcoes or {}
    tipo = opcoes.get("tipo", "count")
    escala = opcoes.get("escala") or ("pct" if tipo == "pct" else None)
    if tipo == "pct":
        tipo = "cont"
    modo = opcoes.get("modo", "conservador")
    seed = int(opcoes.get("seed", 12345))
    # Piso de reamostras: p de Monte Carlo nunca fica abaixo de 1/(N+1), e o
    # Benjamini-Hochberg multiplica pelo nº de testes (até 9). Com N=400 o menor
    # q possível seria 0,02 — acima do corte de SINAL FORTE (0,01) —, e os testes
    # por reamostragem ficariam impedidos de sinalizar, sem aviso nenhum.
    N = max(1000, int(opcoes.get("reamostras", 2000)))
    controle = opcoes.get("controle")
    controle = float(controle) if controle not in (None, "", []) else None

    resp = papeis.get("resposta")
    trat = papeis.get("tratamento")
    if not resp or resp not in dados:
        return {"ok": False, "erro": "Selecione a coluna de resposta."}
    if not trat or trat not in dados:
        return {"ok": False, "erro": "Selecione a coluna de tratamento (grupo)."}

    y = _arr(dados, resp)
    t = _txt(dados, trat)
    rep = _txt(dados, papeis.get("repeticao"))

    # estrato: uma coluna ou várias combinadas (ex.: data + variável)
    est_cols = papeis.get("estrato")
    if isinstance(est_cols, str):
        est_cols = [est_cols]
    est_cols = [c for c in (est_cols or []) if c in dados]
    estrato_lab = None
    if est_cols:
        partes = [_txt(dados, c) for c in est_cols]
        estrato_lab = np.asarray(
            [" · ".join(str(p[i]) for p in partes) for i in range(len(y))], dtype=object)

    estratos = _montar_estratos(y, t, rep, estrato_lab)
    if not estratos:
        return {"ok": False,
                "erro": "São necessários ao menos 2 grupos com valores válidos."}

    valores = _todos_valores(estratos)

    # "Contagem" com valores fracionários não é contagem bruta (média por planta,
    # contagem convertida): o índice de Poisson não vale e marcaria subdispersão
    # em qualquer medida contínua honesta, cuja variância é muito menor que a média.
    avisos = []
    if tipo == "count" and float(np.mean(np.abs(valores - np.round(valores)) < 1e-9)) < 0.95:
        tipo = "cont"
        avisos.append("Marcado como contagem, mas os valores não são inteiros — "
                      "tratado como contínuo (o teste de Poisson só vale para "
                      "contagem bruta).")

    # desenho tratamento x bloco, quando informado e balanceado em TODOS os
    # estratos: habilita o desconto do efeito de bloco nos testes e no nulo
    mats = _desenho_bidirecional(estratos) if rep is not None else None
    # grade em que os valores foram registrados (passo de 5, escala de notas…)
    escala_reg = _escala_registro(valores)

    # nulo condicional compartilhado pelos testes de dígito/arredondamento/duplicata
    nulo = _gerar_nulo(estratos, tipo, _rng(seed, "nulo"), N,
                       desenho=mats, escala_reg=escala_reg)

    testes = []
    if tipo == "count":
        testes.append(teste_subdispersao(estratos, tipo))
    testes.append(teste_homogeneidade_var(estratos, _rng(seed, "homog_var"), N, mats))
    testes.append(teste_extremos(estratos, _rng(seed, "extremos"), N, mats))
    frac_int = float(np.mean(np.abs(valores - np.round(valores)) < 1e-9))
    visual = (escala == "pct")
    if not visual and (tipo == "count" or frac_int >= 0.8):
        testes.append(teste_ultimo_digito(estratos, nulo, valores))
        testes.append(teste_heaping(estratos, nulo, valores))
    testes.append(teste_duplicatas(estratos, nulo, valores, _rng(seed, "duplicatas")))
    if rep is not None:
        testes.append(teste_gradiente_campo(estratos))
        testes.append(teste_ordem_repeticao(estratos, _rng(seed, "ordem"), N, tipo))

    resp2 = papeis.get("resposta2")
    tem_segundo = bool(resp2 and resp2 in dados)
    if tem_segundo:
        y2 = _arr(dados, resp2)
        ga, gb = {}, {}
        # a chave inclui o estrato: pares de datas diferentes não são a mesma
        # repetição física, e embaralhar entre datas criaria acoplamento falso
        # só pelo efeito de data
        for i, (va, vb, tt) in enumerate(zip(y, y2, t)):
            if not (np.isfinite(va) and np.isfinite(vb)):
                continue
            k = (str(estrato_lab[i]) + " · " if estrato_lab is not None else "") + str(tt)
            ga.setdefault(k, []).append(float(va))
            gb.setdefault(k, []).append(float(vb))
        testes.append(teste_acoplamento(ga, gb, _rng(seed, "acoplamento")))

    testes = [x for x in testes if x is not None]
    m_testes = _benjamini_hochberg(testes, modo)

    conferencias = [c for c in (confer_estrutura(estratos),
                                confer_escala_visual(valores, escala_reg) if visual else None,
                                confer_grade_contagem(valores, escala_reg, tipo),
                                confer_gradiente_numeracao(estratos, tipo) if rep is not None else None,
                                confer_limites(valores, escala),
                                confer_eficacia(estratos, controle)) if c is not None]

    achados = testes + conferencias
    if not achados:
        return {"ok": False, "erro": "Dados insuficientes para qualquer teste forense."}

    ordem = {"flag": 0, "watch": 1, "clear": 2, "na": 3}
    achados.sort(key=lambda a: (ordem[a["severidade"]],
                                a["p"] if a.get("p") is not None else 1.0))
    veredito = _pontuar(achados, testes, modo)

    return {
        "ok": True,
        "tipo_analise": "forense",
        "versao": VERSAO,
        "veredito": veredito,
        "achados": achados,
        "estratos": [{"rotulo": e["rotulo"], "grupos": len(e["grupos"]), "n": e["n"]}
                     for e in estratos],
        "parametros": {
            "tipo_dado": tipo, "escala": escala, "modo": modo, "seed": seed,
            "reamostras": N, "controle": controle,
            "n_estratos": len(estratos),
            "n_grupos": int(sum(len(e["grupos"]) for e in estratos)),
            "n_valores": int(valores.size),
            "tem_repeticao": rep is not None,
            "tem_segundo_conjunto": tem_segundo,
            "testes_com_p": m_testes,
            "escala_registro": (None if not escala_reg else
                                (f"passo {escala_reg['passo']}" if escala_reg["tipo"] == "grade"
                                 else f"{escala_reg['niveis'].size} níveis")),
            "bloco_descontado": mats is not None,
            "correcao_multiplicidade": "Benjamini-Hochberg",
        },
        "avisos": avisos,
        "aviso": ("Triagem estatística, não prova de fraude. Toda anomalia tem "
                  "causas legítimas. A confirmação exige dados-fonte: cadernos "
                  "brutos, trilha de auditoria e entrevista com o coletor."),
    }
