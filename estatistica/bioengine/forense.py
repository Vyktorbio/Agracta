"""
Forense — triagem estatística de anomalias em dados de ensaio.

Sinaliza padrões atípicos que merecem verificação humana (subdispersão,
homogeneidade anômala de variância, arredondamento, duplicatas, acoplamento
entre avaliações que deveriam ser independentes). NÃO emite veredito de
fraude: cada sinal vem acompanhado de sua explicação inocente possível.

Filosofia: a estatística levanta a hipótese; a proveniência (cadernos
brutos, trilha de auditoria) é que confirma. Severidade graduada em
'clear' | 'watch' | 'flag'. Uso recomendado: triagem interna, anexável
a processo formal apenas como indício, nunca como prova.

Entrada (formato longo, como os demais módulos):
    papeis["resposta"]   -> coluna numérica (contagem/contínuo)
    papeis["tratamento"] -> coluna de grupo (define as repetições por grupo)
    papeis["resposta2"]  -> (opcional) segunda avaliação p/ teste de acoplamento
    opcoes["tipo"]       -> "count" (contagem) | "cont" (contínuo)
    opcoes["controle"]   -> (opcional) média do controle p/ reconciliar eficácia
    opcoes["modo"]       -> "conservador" (default) | "sensivel"
    opcoes["seed"]       -> semente do teste de permutação (default 12345)
"""

import numpy as np
from scipy import stats


# ----------------------------------------------------------------------
# helpers (mesmo padrão de validacao.py)
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


def _txt(dados, nome, n):
    if not nome or nome not in dados:
        return None
    return np.asarray([str(v).strip() for v in dados[nome]], dtype=object)


def _agrupar(y, trat):
    """Monta dict tratamento -> lista de valores finitos (repetições)."""
    grupos = {}
    for val, t in zip(y, trat):
        if not np.isfinite(val):
            continue
        grupos.setdefault(str(t), []).append(float(val))
    return {k: v for k, v in grupos.items() if v}


def _agrupar_par(y, y2, trat):
    """
    Pares (a, b) por tratamento, mantendo só as LINHAS em que ambas as
    avaliações são finitas, na ordem original das linhas. Garante que a[i] e
    b[i] são a MESMA repetição física — pré-requisito do teste de acoplamento.
    Usar _agrupar separadamente em cada coluna desalinharia os pares quando o
    valor faltante (NaN) cai em linhas diferentes das duas colunas.
    """
    ga, gb = {}, {}
    for va, vb, t in zip(y, y2, trat):
        if not (np.isfinite(va) and np.isfinite(vb)):
            continue
        key = str(t)
        ga.setdefault(key, []).append(float(va))
        gb.setdefault(key, []).append(float(vb))
    return ({k: v for k, v in ga.items() if v},
            {k: v for k, v in gb.items() if v})


def _achado(nome, sev, stat, leitura, inocente="", executado=True):
    return {"nome": nome, "severidade": sev, "estatistica": stat,
            "leitura": leitura, "explicacao_inocente": inocente,
            "executado": bool(executado)}


def _inconclusivo(nome, stat, leitura):
    return _achado(nome, "na", stat, leitura, executado=False)


# ----------------------------------------------------------------------
# TESTES
# ----------------------------------------------------------------------
def teste_dispersao(grupos, tipo):
    """Índice de dispersão (variância/média). Só p/ contagens, n>=3 por grupo."""
    if tipo != "count":
        return None
    razoes = []
    zero_var = 0
    for vals in grupos.values():
        if len(vals) >= 3:
            v = np.var(vals, ddof=1)
            m = np.mean(vals)
            if v == 0:
                zero_var += 1
            if m > 0:
                razoes.append(v / m)
    if len(razoes) < 2:
        return _inconclusivo(
            "Índice de dispersão (variância/média)",
            "dados insuficientes",
            "Teste exige ao menos 3 repetições em pelo menos 2 grupos. A razão "
            "variância/média não foi avaliada e não conta como resultado limpo.")
    med = float(np.median(razoes))
    if med < 0.5:
        sev = "flag"
        txt = (f"Razão variância/média (mediana) = {med:.2f} — subdispersão "
               "acentuada. Contagens de campo costumam mostrar razão ≥ 1 "
               "(sobredispersão por agregação espacial da doença). Valores tão "
               "apertados entre repetições são incomuns em dados medidos.")
    elif med < 0.8:
        sev = "watch"
        txt = (f"Razão variância/média (mediana) = {med:.2f} — abaixo do "
               "esperado para contagem de campo (≥1). Merece atenção.")
    else:
        sev = "clear"
        txt = (f"Razão variância/média (mediana) = {med:.2f} — dispersão "
               "compatível com contagem biológica de campo.")
    if zero_var:
        txt += (f" Atenção: {zero_var} grupo(s) com variância exatamente zero "
                "(repetições idênticas) — incomum em campo.")
    return _achado(
        "Índice de dispersão (variância/média)", sev,
        f"mediana {med:.2f} · n={len(razoes)} grupos"
        + (f" · {zero_var} c/ variância zero" if zero_var else ""),
        txt,
        "Pseudo-replicação (repetições da mesma parcela em vez de parcelas "
        "casualizadas independentes) colapsa a variância por construção. Baixa "
        "pressão de doença, com incidência homogênea, também aperta as contagens.")


def teste_homogeneidade_var(grupos):
    """Variâncias parecidas demais entre grupos (CV das variâncias baixo)."""
    varis = [np.var(v, ddof=1) for v in grupos.values() if len(v) >= 2]
    if len(varis) < 3:
        return _inconclusivo(
            "Homogeneidade de variância entre grupos",
            "dados insuficientes",
            "São necessários pelo menos 3 grupos com 2 ou mais repetições. "
            "O teste não foi executado.")
    m = np.mean(varis)
    cv = float(np.std(varis, ddof=1) / m) if m > 0 else 0.0
    if cv < 0.35:
        sev = "flag"
        txt = (f"CV das variâncias = {cv:.2f} — as variâncias dos grupos são "
               "parecidas demais entre si. Em dados reais, grupos diferentes "
               "tendem a ter dispersões desiguais; uniformidade alta sugere "
               'geração a partir de um mesmo "molde".')
    elif cv < 0.6:
        sev = "watch"
        txt = (f"CV das variâncias = {cv:.2f} — variâncias relativamente "
               "homogêneas; observar.")
    else:
        sev = "clear"
        txt = (f"CV das variâncias = {cv:.2f} — dispersões desiguais entre "
               "grupos, como se espera de dados reais.")
    return _achado("Homogeneidade de variância entre grupos", sev,
                   f"CV das variâncias {cv:.2f}", txt,
                   "Protocolos muito padronizados e tratamentos com efeito "
                   "biológico parecido podem gerar variâncias naturalmente "
                   "próximas. Não é anômalo isoladamente.")


def teste_ultimo_digito(grupos):
    """Distribuição do último dígito (esperado ~uniforme p/ contagens)."""
    todos = [v for vals in grupos.values() for v in vals
             if float(v).is_integer()]
    if len(todos) < 20:
        return _inconclusivo(
            "Distribuição do último dígito",
            "dados insuficientes",
            "O teste exige ao menos 20 valores inteiros. Não foi executado.")
    rng = max(todos) - min(todos)
    if rng < 9:
        return _inconclusivo(
            "Distribuição do último dígito",
            "amplitude insuficiente",
            "A amplitude dos valores inteiros é menor que 9; não há cobertura "
            "dos dígitos necessária para executar o teste.")
    cont = np.zeros(10)
    for v in todos:
        cont[int(abs(v)) % 10] += 1
    esp = len(todos) / 10.0
    chi = float(np.sum((cont - esp) ** 2 / esp))
    p = float(stats.chi2.sf(chi, 9))
    if p < 0.01:
        sev = "flag"
        txt = (f"Distribuição do último dígito desvia do uniforme "
               f"(χ²={chi:.1f}, p≈{p:.3f}). Em medições reais cada dígito final "
               "aparece ~10%. Picos fortes sugerem preferência humana por "
               "certos números.")
    elif p < 0.05:
        sev = "watch"
        txt = (f"Leve desvio na distribuição do último dígito (p≈{p:.3f}). "
               "Sinal fraco.")
    else:
        sev = "clear"
        txt = (f"Último dígito ~uniforme (p≈{p:.2f}). Sem preferência "
               "detectável.")
    return _achado("Distribuição do último dígito", sev,
                   f"χ² {chi:.1f} · n={len(todos)}", txt,
                   "Arredondamento legítimo do instrumento/protocolo (ex.: "
                   "contar de 2 em 2) concentra dígitos sem fraude. Teste só é "
                   "confiável com range amplo e n grande.")


def teste_heaping(grupos):
    """Arredondamento preferencial: excesso de múltiplos de 5."""
    todos = [v for vals in grupos.values() for v in vals
             if float(v).is_integer()]
    if len(todos) < 15:
        return _inconclusivo(
            "Arredondamento preferencial (heaping)",
            "dados insuficientes",
            "O teste exige ao menos 15 valores inteiros. Não foi executado.")
    if (max(todos) - min(todos)) < 10:
        return _inconclusivo(
            "Arredondamento preferencial (heaping)",
            "amplitude insuficiente",
            "A amplitude é menor que 10; o teste de múltiplos de 5 não foi "
            "executado.")
    n = len(todos)
    mult5 = sum(1 for v in todos if int(v) % 5 == 0)
    frac = mult5 / n
    z = (frac - 0.2) / np.sqrt(0.2 * 0.8 / n)
    p = float(stats.norm.sf(z))
    if z > 2.5 and frac > 0.35:
        sev = "flag"
        txt = (f"{frac*100:.0f}% dos valores são múltiplos de 5 (esperado ~20% "
               f"sem arredondamento; z={z:.1f}, p≈{p:.3f}). Concentração forte "
               'em valores "redondos" sugere estimativa visual, não contagem '
               "exata.")
    elif z > 1.8:
        sev = "watch"
        txt = (f"{frac*100:.0f}% dos valores são múltiplos de 5 (z={z:.1f}) — "
               "leve excesso de valores redondos. Observar se a contagem foi "
               "exata ou estimada.")
    else:
        sev = "clear"
        txt = (f"{frac*100:.0f}% de múltiplos de 5 — sem evidência de "
               "arredondamento preferencial.")
    return _achado("Arredondamento preferencial (heaping)", sev,
                   f"{frac*100:.0f}% múltiplos de 5 · n={n}", txt,
                   "Se o protocolo prevê amostragem ou estimativa visual de "
                   "percentual, valores redondos são esperados e legítimos. Só "
                   "é relevante quando se espera contagem unitária exata.")


def teste_eficacia(grupos, controle, tipo):
    """Reconciliação de %eficácia contra um controle informado."""
    if controle is None or controle <= 0:
        return None
    neg = []
    for nome, vals in grupos.items():
        ef = (controle - np.mean(vals)) / controle * 100
        if ef < -5:
            neg.append(nome)
    sev = "watch" if neg else "clear"
    if neg:
        txt = (f"Eficácia recalculada contra controle = {controle:.2f}. Grupos "
               f"com eficácia negativa (>5%): {', '.join(neg)} — incidência "
               "acima do controle. Pode ser real (fitotoxicidade/antagonismo) "
               "ou erro.")
    else:
        txt = (f"Eficácia recalculada contra controle = {controle:.2f}. Todas "
               "as eficácias derivam coerentemente do controle informado.")
    return _achado("Reconciliação de %eficácia", sev,
                   f"controle={controle:.2f}", txt,
                   "Eficácia negativa real ocorre por fitotoxicidade, "
                   "antagonismo de mistura ou variação espacial — não é, por "
                   "si, sinal de fraude.")


def teste_duplicatas(grupos):
    """Grupos com conjunto de repetições idêntico (possível copy-paste)."""
    visto = {}
    dups = []
    for nome, vals in grupos.items():
        chave = "|".join(f"{v:.6g}" for v in vals)
        if chave in visto:
            dups.append(f"{visto[chave]} ≡ {nome}")
        else:
            visto[chave] = nome
    if not dups:
        return _achado("Linhas duplicadas", "clear", "nenhuma",
                       "Nenhum grupo tem o conjunto de repetições idêntico a "
                       "outro.")
    sev = "flag" if len(dups) > 1 else "watch"
    return _achado("Linhas duplicadas", sev, f"{len(dups)} par(es)",
                   "Grupos com repetições idênticas (possível copy-paste): "
                   + "; ".join(dups) + ".",
                   "Coincidência é possível com contagens pequenas e poucos "
                   "valores; conjuntos longos idênticos são improváveis por "
                   "acaso.")


def teste_outliers(grupos):
    """Ausência de valores extremos (dados 'lisos demais')."""
    todos = np.array([v for vals in grupos.values() for v in vals], float)
    if todos.size < 12:
        return _inconclusivo(
            "Presença de valores extremos",
            "dados insuficientes",
            "O teste exige ao menos 12 observações. Não foi executado.")
    s = np.std(todos, ddof=1)
    m = np.mean(todos)
    if s == 0:
        return _achado("Presença de valores extremos", "flag", "desvio zero",
                       "Todos os valores idênticos — variância nula. "
                       "Praticamente impossível em medição real.",
                       "Só ocorre legitimamente se a variável for constante por "
                       "definição.")
    maxz = float(np.max(np.abs(todos - m) / s))
    if maxz < 1.6:
        sev = "watch"
        txt = (f"Maior desvio observado = {maxz:.2f}σ. Nenhum valor se afasta "
               "muito da média. Dados reais costumam ter ao menos um extremo "
               '(>2σ); ausência total pode indicar "suavização".')
    else:
        sev = "clear"
        txt = (f"Maior desvio = {maxz:.2f}σ — presença de extremos compatível "
               "com dados reais.")
    return _achado("Presença de valores extremos", sev, f"máx {maxz:.2f}σ", txt,
                   "Amostras pequenas e variáveis pouco dispersas naturalmente "
                   "não geram extremos. Sinal fraco isolado.")


def teste_acoplamento(grupos_a, grupos_b, seed=12345):
    """
    Acoplamento entre dois conjuntos que deveriam ser independentes.
    Teste de permutação: a correspondência rep-a-rep é alta demais p/ ser
    só o efeito de tratamento? Mantém os valores de B por grupo, embaralha
    quais repetições casam, e compara r observado com o nulo.
    """
    if not grupos_b:
        return None
    comuns = [k for k in grupos_a if k in grupos_b]
    xs, ys = [], []
    blocos = []
    for k in comuns:
        a, b = grupos_a[k], grupos_b[k]
        m = min(len(a), len(b))
        if m < 2:
            continue
        ga, gb = a[:m], b[:m]
        xs.extend(ga)
        ys.extend(gb)
        blocos.append((list(ga), list(gb)))
    if len(xs) < 8:
        return _inconclusivo(
            "Acoplamento entre os dois conjuntos",
            "dados insuficientes",
            "Poucos pares correspondentes para o teste de permutação "
            "(mínimo ~8). A comparação não foi realizada.")
    xs = np.array(xs, float)
    ys = np.array(ys, float)

    def pear(x, y):
        if np.std(x) == 0 or np.std(y) == 0:
            return 0.0
        return float(np.corrcoef(x, y)[0, 1])

    r_obs = pear(xs, ys)
    rng = np.random.default_rng(seed)  # determinístico p/ auditoria
    N = 5000
    ge = 0
    nulos = np.empty(N)
    for p in range(N):
        yp = []
        for _, gb in blocos:
            sh = list(gb)
            rng.shuffle(sh)
            yp.extend(sh)
        rn = pear(xs, np.array(yp, float))
        nulos[p] = rn
        if rn >= r_obs:
            ge += 1
    p_perm = (ge + 1) / (N + 1)
    nm, ns = float(np.mean(nulos)), float(np.std(nulos))
    if p_perm < 0.01:
        sev = "flag"
        txt = (f"Correspondência rep-a-rep r={r_obs:.2f} é improvável por acaso "
               f"(permutação p≈{p_perm:.4f}; nulo {nm:.2f}±{ns:.2f}). As "
               "repetições das duas avaliações casam posição-a-posição mais do "
               "que o efeito de tratamento explicaria — compatível com tabelas "
               "alinhadas ou copiadas.")
    elif p_perm < 0.05:
        sev = "watch"
        txt = (f"Correspondência rep-a-rep r={r_obs:.2f} acima do esperado "
               f"(p≈{p_perm:.3f}). Sinal moderado de acoplamento.")
    else:
        sev = "clear"
        txt = (f"Correspondência rep-a-rep r={r_obs:.2f} compatível com o acaso "
               f"(p≈{p_perm:.2f}). Os conjuntos concordam apenas no que o efeito "
               "de tratamento explica — como se espera de avaliações "
               "independentes.")
    return _achado("Acoplamento entre os dois conjuntos", sev,
                   f"r={r_obs:.2f} · perm. p≈{p_perm:.3f} · {N} reamostras", txt,
                   "Se as duas avaliações foram feitas na MESMA parcela física "
                   "(mesma posição = mesma planta), correspondência alta é "
                   "esperada e legítima. O teste só acusa quando deveriam ser "
                   "espacialmente independentes.")


# ----------------------------------------------------------------------
# score / veredito
# ----------------------------------------------------------------------
def _pontuar(achados, modo, resultados_testes):
    flags = sum(1 for a in achados if a["severidade"] == "flag")
    watches = sum(1 for a in achados if a["severidade"] == "watch")
    previstos = len(resultados_testes)
    executados = sum(1 for a in resultados_testes if a.get("executado", True))
    inconclusivos = previstos - executados
    cobertura = executados / previstos if previstos else 0.0
    cobertura_insuficiente = executados < 3 or cobertura < 0.5
    escalar = flags >= 1 if modo == "sensivel" else flags >= 2
    tol = 0 if modo == "sensivel" else 1
    if flags == 0 and cobertura_insuficiente:
        nivel, classe = "EVIDÊNCIA INSUFICIENTE", "watch"
        resumo = (
            f"Apenas {executados} de {previstos} testes previstos produziram "
            "resultado interpretável. Não há cobertura estatística suficiente "
            "para afirmar ausência de sinais relevantes. "
            + (f"Há também {watches} sinal(is) de atenção que exigem revisão. "
               if watches else "")
            + "Amplie as repetições, grupos ou dados auxiliares antes de concluir.")
    elif flags == 0 and watches <= tol:
        nivel, classe = "SEM SINAIS RELEVANTES", "clear"
        resumo = ("Os testes não acusaram anomalias que justifiquem "
                  "investigação. Isto não certifica os dados como genuínos — "
                  "apenas indica ausência de padrões estatísticos atípicos.")
    elif not escalar:
        nivel, classe = "OBSERVAR", "watch"
        resumo = (f"{watches} sinal(is) de atenção e {flags} sinalização(ões) "
                  "forte(s). Recomenda-se conferir os dados-fonte dos pontos "
                  "marcados antes de qualquer conclusão. Um indício isolado tem "
                  "explicações legítimas e não constitui caso.")
    else:
        nivel, classe = "INVESTIGAR", "flag"
        conv = " convergentes" if flags >= 2 else ""
        resumo = (f"{flags} sinalização(ões) forte(s){conv}. "
                  + ("A convergência de múltiplos testes independentes eleva a "
                     "prioridade de verificação"
                     if flags >= 2 else
                     "Sob régua sensível, uma sinalização forte já indica "
                     "verificação")
                  + " dos cadernos brutos e da trilha de auditoria. Não "
                  "constitui prova de fraude.")
    return {
        "nivel": nivel, "classe": classe, "flags": flags,
        "watches": watches, "modo": modo, "resumo": resumo,
        "testes_previstos": previstos, "testes_executados": executados,
        "testes_inconclusivos": inconclusivos, "cobertura": float(cobertura),
        "cobertura_suficiente": not cobertura_insuficiente,
    }


# ----------------------------------------------------------------------
# entrada principal (contrato igual aos demais módulos)
# ----------------------------------------------------------------------
def analisar_forense(dados, papeis, opcoes=None):
    opcoes = opcoes or {}
    tipo = opcoes.get("tipo", "count")
    modo = opcoes.get("modo", "conservador")
    seed = int(opcoes.get("seed", 12345))
    controle = opcoes.get("controle")
    controle = float(controle) if controle not in (None, "", []) else None

    resp = papeis.get("resposta")
    trat = papeis.get("tratamento")
    if not resp or resp not in dados:
        return {"ok": False, "erro": "Selecione a coluna de resposta."}
    if not trat or trat not in dados:
        return {"ok": False, "erro": "Selecione a coluna de tratamento (grupo)."}

    y = _arr(dados, resp)
    n = len(y)
    t = _txt(dados, trat, n)
    grupos = _agrupar(y, t)
    if len(grupos) < 2:
        return {"ok": False,
                "erro": "São necessários ao menos 2 grupos com valores válidos."}

    # segundo conjunto opcional (mesma coluna de tratamento). Para o teste de
    # acoplamento, parear linha-a-linha (só linhas com ambos finitos) garante
    # que cada repetição de A casa com a MESMA repetição física de B.
    tem_segundo = False
    grupos_ac_a = grupos_ac_b = None
    resp2 = papeis.get("resposta2")
    if resp2 and resp2 in dados:
        y2 = _arr(dados, resp2)
        tem_segundo = True
        grupos_ac_a, grupos_ac_b = _agrupar_par(y, y2, t)

    tamanhos = {len(v) for v in grupos.values()}
    achados = []

    if len(tamanhos) > 1:
        achados.append(_achado(
            "Estrutura dos dados", "watch",
            "grupos com nº de repetições diferente",
            "Os grupos não têm o mesmo número de repetições. Alguns testes "
            "ficam menos robustos. Confirme se reflete o desenho real ou se há "
            "células faltando.",
            "Perdas de parcela em campo são comuns e legítimas; verifique apenas "
            "se a importação não cortou valores."))

    todos = [v for vals in grupos.values() for v in vals]
    frac_inteiros = (
        sum(1 for v in todos if float(v).is_integer()) / len(todos)
        if todos else 0.0)

    testes = []
    if tipo == "count":
        testes.append(teste_dispersao(grupos, tipo))
    testes.append(teste_homogeneidade_var(grupos))
    if tipo == "count" or frac_inteiros >= 0.8:
        testes.extend((teste_ultimo_digito(grupos), teste_heaping(grupos)))
    if controle is not None and controle > 0:
        testes.append(teste_eficacia(grupos, controle, tipo))
    testes.extend((teste_duplicatas(grupos), teste_outliers(grupos)))
    if tem_segundo:
        testes.append(teste_acoplamento(grupos_ac_a, grupos_ac_b, seed))

    resultados_testes = [teste for teste in testes if teste is not None]
    achados.extend(resultados_testes)

    if not achados:
        return {"ok": False,
                "erro": "Dados insuficientes para qualquer teste forense."}

    # ordena por severidade (flag > watch > clear)
    ordem = {"flag": 0, "watch": 1, "clear": 2, "na": 3}
    achados.sort(key=lambda a: ordem[a["severidade"]])
    veredito = _pontuar(achados, modo, resultados_testes)

    return {
        "ok": True,
        "tipo_analise": "forense",
        "veredito": veredito,
        "achados": achados,
        "parametros": {
            "tipo_dado": tipo, "modo": modo, "seed": seed,
            "controle": controle, "n_grupos": len(grupos),
            "tem_segundo_conjunto": tem_segundo,
        },
        "aviso": ("Triagem estatística, não prova de fraude. Toda anomalia tem "
                  "causas legítimas. A confirmação exige dados-fonte: cadernos "
                  "brutos, trilha de auditoria e entrevista com o coletor."),
    }
