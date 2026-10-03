"""
Análise de dose-resposta (probit / logit) — o núcleo de Robertson et al. (2007),
"Bioassays with Arthropods" (2ª ed.), e do PoloPlus.

Recursos:
  - ajuste binomial com ligação probit OU logit (escolha automática por AIC)
  - CLp / DLp (p = 0.5, 0.9, 0.95, 0.99 e personalizados)
  - intervalo de confiança das doses letais por teorema de Fieller, com o g
    de cada uma (Finney, 1971)
  - resposta natural (mortalidade da testemunha) estimada como PARÂMETRO, com a
    testemunha dentro da verossimilhança; ou declarada; ou Abbott (antigo)
  - qui-quadrado de aderência; fator de heterogeneidade (h) aplicado quando a
    heterogeneidade é significativa
  - tabela por dose: observado × esperado e resíduo
  - conferência do desenho: doses com resposta parcial, extrapolação
  - comparação de curvas: paralelismo, igualdade e razão de CL50 e CL90

Convenção: por padrão o modelo é ajustado em log10(dose) (clássico em
bioensaios). As doses letais são devolvidas na escala original (10^x).
"""

from __future__ import annotations

import numpy as np
import patsy
from scipy import stats
from scipy.optimize import minimize
import statsmodels.api as sm
from statsmodels.genmod.families import links as L


_PROBS = [0.10, 0.25, 0.50, 0.90, 0.95, 0.99]


def _link_obj(nome):
    return L.Probit() if nome == "probit" else L.Logit()


def _quantil(nome, p):
    """Valor da função de ligação no ponto p: probit=Phi^-1(p); logit=log(p/(1-p))."""
    if nome == "probit":
        return stats.norm.ppf(p)
    return np.log(p / (1 - p))


def abbott(prop_obs, controle):
    """Correção de Abbott: p_corr = (p_obs - c)/(1 - c)."""
    c = float(controle)
    if c <= 0:
        return np.asarray(prop_obs, float)
    corr = (np.asarray(prop_obs, float) - c) / (1 - c)
    return np.clip(corr, 0.0, 1.0)


def _ajustar_glm(x, y, n, link):
    """Ajuste GLM binomial. Retorna params, cov, e o objeto de resultado."""
    X = sm.add_constant(np.asarray(x, float).reshape(-1, 1))
    endog = np.column_stack([np.asarray(y, float), np.asarray(n, float) - np.asarray(y, float)])
    modelo = sm.GLM(endog, X, family=sm.families.Binomial(link=_link_obj(link)))
    res = modelo.fit()
    return res


def _fieller(theta, b0, b1, cov, tcrit):
    """
    IC de Fieller para x_p = (theta - b0)/b1.

    N = theta - b0 ; D = b1
    Var(N)=Var(b0) ; Var(D)=Var(b1) ; Cov(N,D) = -Cov(b0,b1)
    """
    v_b0 = cov[0, 0]
    v_b1 = cov[1, 1]
    cov_b0b1 = cov[0, 1]

    N = theta - b0
    D = b1
    r = N / D
    vN = v_b0
    vD = v_b1
    cND = -cov_b0b1

    g = (tcrit ** 2) * vD / (D ** 2)
    if g >= 1:
        return r, None, None, g  # denominador não diferente de zero: IC ilimitado

    centro = (r - g * cND / vD) / (1 - g)
    sob = vN - 2 * r * cND + (r ** 2) * vD - g * (vN - (cND ** 2) / vD)
    sob = max(sob, 0.0)
    meia = (tcrit / abs(D)) * np.sqrt(sob) / (1 - g)
    return centro, centro - meia, centro + meia, g


def _mle_natural(x, y, n, link):
    """
    Modelo de 3 parâmetros (Finney): P = C + (1-C) F(b0 + b1 x),
    com C = mortalidade natural estimada. MLE via scipy.
    """
    F = stats.norm.cdf if link == "probit" else (lambda z: 1 / (1 + np.exp(-z)))
    y = np.asarray(y, float); n = np.asarray(n, float); x = np.asarray(x, float)

    def negll(par):
        C, b0, b1 = par
        eta = b0 + b1 * x
        P = C + (1 - C) * F(eta)
        P = np.clip(P, 1e-9, 1 - 1e-9)
        return -np.sum(y * np.log(P) + (n - y) * np.log(1 - P))

    # chute inicial: C pelo menor x, b por regressão simples
    C0 = max(min(float(y[np.argmin(x)] / max(n[np.argmin(x)], 1)), 0.3), 0.0)
    res = minimize(negll, x0=[C0, -2.0, 1.0],
                   bounds=[(0.0, 0.5), (-50, 50), (1e-4, 50)],
                   method="L-BFGS-B")
    C, b0, b1 = res.x
    return {"C": float(C), "b0": float(b0), "b1": float(b1),
            "loglik": float(-res.fun), "convergiu": bool(res.success)}


# --------------------------------------------------------------------------- #
# Resposta natural como PARÂMETRO (Finney, 1971; Robertson et al., 2007)
# --------------------------------------------------------------------------- #
# A testemunha também morre. Corrigir as proporções por Abbott e arredondar as
# contagens — o que este motor fazia — trata a mortalidade da testemunha como se
# fosse conhecida sem erro e joga fora a informação de quantos insetos ela tinha.
# O livro (e o PoloPlus) estimam a resposta natural C junto com a reta:
#
#     P(dose) = C + (1 − C)·F(b0 + b1·log10 dose)      P(testemunha) = C
#
# com a testemunha DENTRO da verossimilhança. Assim a incerteza de C passa para
# a variância de b0 e b1, e daí para o intervalo da CL50.

C_MINIMO = 1e-3      # abaixo disto C está na fronteira: o modelo de 2 parâmetros vale
G_LIMITE = 0.5       # Finney (1971): g ≥ 0,5 → os limites de Fieller ficam pouco úteis
ALFA_HETEROGENEIDADE = 0.05


def _cdf(link):
    if link == "probit":
        return stats.norm.cdf
    return lambda z: 1.0 / (1.0 + np.exp(-np.clip(z, -700, 700)))


def _hessiana(f, p):
    """Hessiana numérica por diferenças centrais (observada, no ótimo)."""
    p = np.asarray(p, float)
    k = len(p)
    h = 1e-4 * np.maximum(1.0, np.abs(p))
    H = np.zeros((k, k))
    f0 = f(p)
    for i in range(k):
        for j in range(i, k):
            if i == j:
                a = p.copy(); a[i] += h[i]
                b = p.copy(); b[i] -= h[i]
                H[i, i] = (f(a) - 2.0 * f0 + f(b)) / h[i] ** 2
            else:
                pp = p.copy(); pp[i] += h[i]; pp[j] += h[j]
                pm = p.copy(); pm[i] += h[i]; pm[j] -= h[j]
                mp = p.copy(); mp[i] -= h[i]; mp[j] += h[j]
                mm = p.copy(); mm[i] -= h[i]; mm[j] -= h[j]
                H[i, j] = H[j, i] = (f(pp) - f(pm) - f(mp) + f(mm)) / (4.0 * h[i] * h[j])
    return H


def _ajustar_ml(x, y, n, link, yc=0.0, nc=0.0, c_fixo=None, chute=(0.0, 1.0)):
    """Máxima verossimilhança com resposta natural.
       c_fixo=None -> estima C (a testemunha yc de nc entra na verossimilhança);
       c_fixo=valor -> C declarado, só b0 e b1 são estimados.
       Devolve b0, b1, C, a covariância de (b0, b1) — já com a incerteza de C —,
       o erro-padrão de C e a log-verossimilhança."""
    F = _cdf(link)
    x = np.asarray(x, float); y = np.asarray(y, float); n = np.asarray(n, float)
    estima_c = c_fixo is None

    def negll(par):
        if estima_c:
            C, b0, b1 = par
        else:
            b0, b1 = par
            C = c_fixo
        P = np.clip(C + (1.0 - C) * F(b0 + b1 * x), 1e-12, 1 - 1e-12)
        ll = float(np.sum(y * np.log(P) + (n - y) * np.log1p(-P)))
        if estima_c and nc > 0:
            Cc = min(max(C, 1e-12), 1 - 1e-12)
            ll += yc * np.log(Cc) + (nc - yc) * np.log1p(-Cc)
        return -ll

    b0_0, b1_0 = float(chute[0]), float(chute[1])
    melhor = None
    if estima_c:
        c0 = float(yc / nc) if nc > 0 else 0.05
        partidas = [[min(max(c, 0.005), 0.9), b0_0, b1_0] for c in (c0, c0 * 0.5, min(c0 * 1.5 + 0.01, 0.9))]
        limites = [(0.0, 0.99), (-100.0, 100.0), (1e-6, 100.0)]
    else:
        partidas = [[b0_0, b1_0], [b0_0 * 0.8, b1_0 * 0.8]]
        limites = [(-100.0, 100.0), (1e-6, 100.0)]
    for x0 in partidas:
        try:
            r = minimize(negll, x0=x0, bounds=limites, method="L-BFGS-B")
            r2 = minimize(negll, x0=r.x, method="Nelder-Mead",
                          options={"xatol": 1e-9, "fatol": 1e-11, "maxiter": 4000})
            if estima_c and not (0.0 <= r2.x[0] < 0.99 and r2.x[2] > 0):
                r2 = r
            if melhor is None or r2.fun < melhor.fun:
                melhor = r2
        except Exception:  # pragma: no cover
            continue
    if melhor is None:
        raise RuntimeError("A máxima verossimilhança não convergiu.")
    par = np.asarray(melhor.x, float)
    if estima_c:
        C, b0, b1 = float(par[0]), float(par[1]), float(par[2])
    else:
        C, b0, b1 = float(c_fixo), float(par[0]), float(par[1])
    if estima_c and C < C_MINIMO:
        return None      # C na fronteira: quem responde é o modelo sem resposta natural
    H = _hessiana(negll, par)
    try:
        cov_full = np.linalg.inv(H)
    except np.linalg.LinAlgError:
        cov_full = np.linalg.pinv(H)
    if estima_c:
        cov_b = cov_full[1:, 1:]
        ep_c = float(np.sqrt(max(cov_full[0, 0], 0.0)))
    else:
        cov_b = cov_full
        ep_c = None
    return {"b0": b0, "b1": b1, "C": C, "C_ep": ep_c, "cov": np.asarray(cov_b, float),
            "loglik": float(-melhor.fun), "k": 3 if estima_c else 2}


def _var_log_dose(p_theta, b0, b1, cov):
    """Variância de x_p = (θ − b0)/b1 pelo método delta."""
    xp = (p_theta - b0) / b1
    return float(max((cov[0, 0] + xp ** 2 * cov[1, 1] + 2 * xp * cov[0, 1]) / b1 ** 2, 0.0))


def analisar_dose_resposta(dose, y, n, controle_mort=None, log_dose=True,
                           link="auto", probs=None, alfa=0.05, natural="auto"):
    """
    Parâmetros
    ----------
    dose : doses/concentrações (uma por grupo; dose 0 = testemunha)
    y    : nº de respostas (mortos/afetados) por grupo
    n    : nº total testado por grupo
    controle_mort : resposta natural CONHECIDA (proporção 0–1), declarada pelo
                    usuário. Sem ela, e havendo testemunha com resposta, a
                    resposta natural é estimada (ver natural).
    log_dose : ajustar em log10(dose) (recomendado)
    link : "probit", "logit" ou "auto" (escolhe menor AIC)
    natural : "auto"   — testemunha com resposta → C estimado por máxima
                         verossimilhança, com a testemunha no modelo
                         (Finney, 1971; Robertson et al., 2007);
              "abbott" — o método antigo: proporções corrigidas por Abbott e
                         contagens arredondadas.
    """
    dose = np.asarray(dose, float)
    y = np.asarray(y, float)
    n = np.asarray(n, float)
    probs = probs or _PROBS
    avisos = []

    # separa testemunha (dose 0) se existir
    mask_ctrl = dose <= 0
    yc = float(y[mask_ctrl].sum()) if np.any(mask_ctrl) else 0.0
    nc = float(n[mask_ctrl].sum()) if np.any(mask_ctrl) else 0.0
    c_obs = float(yc / nc) if nc > 0 else None

    # dados tratados (dose > 0)
    m = dose > 0
    d = dose[m]; yt = y[m].copy(); nt = n[m]
    if len(d) == 0:
        raise ValueError("Não há dose positiva: sem doses, não existe curva.")
    x = np.log10(d) if log_dose else d

    # como a resposta natural entra
    if controle_mort is not None and controle_mort > 0:
        metodo_nat = "declarada"
    elif natural == "abbott" and c_obs:
        metodo_nat = "abbott"
    elif c_obs:
        metodo_nat = "estimada"
    else:
        metodo_nat = "ausente"

    # ponto de partida: GLM sobre as proporções corrigidas por Abbott
    abbott_aplicado = False
    y_glm = yt
    c_base = controle_mort if metodo_nat == "declarada" else c_obs
    if metodo_nat in ("abbott", "estimada", "declarada") and c_base:
        y_glm = np.round(abbott(yt / nt, c_base) * nt)
        abbott_aplicado = (metodo_nat == "abbott")

    candidatos = ["probit", "logit"] if link == "auto" else [link]
    ajustes = {}
    for lk in candidatos:
        try:
            ajustes[lk] = _ajustar_glm(x, y_glm, nt, lk)
        except Exception as e:  # pragma: no cover
            ajustes[lk] = e
    validos = {k: v for k, v in ajustes.items() if not isinstance(v, Exception)}
    if not validos:
        raise RuntimeError("Falha ao ajustar o modelo de dose-resposta.")

    # resposta natural como parâmetro (ou declarada), por máxima verossimilhança
    ml = {}
    if metodo_nat in ("estimada", "declarada"):
        for lk, res in validos.items():
            try:
                r = _ajustar_ml(x, yt, nt, lk, yc=yc, nc=nc,
                                c_fixo=(float(controle_mort) if metodo_nat == "declarada" else None),
                                chute=(float(res.params[0]), float(res.params[1])))
                if r is not None:
                    ml[lk] = r
            except Exception:
                pass
        if metodo_nat == "estimada" and not ml:
            # C foi para a fronteira (ou não convergiu): a testemunha não informa
            # resposta natural detectável — segue o modelo sem ela
            metodo_nat = "ausente"
            validos = {lk: _ajustar_glm(x, yt, nt, lk) for lk in validos}

    # escolha de ligação — menor AIC na mesma família de modelo
    if ml:
        aics = {lk: 2 * r["k"] - 2 * r["loglik"] for lk, r in ml.items()}
    else:
        aics = {lk: float(v.aic) for lk, v in validos.items()}
    melhor = min(aics, key=aics.get)

    if ml:
        r = ml[melhor]
        b0, b1, cov, C = r["b0"], r["b1"], np.asarray(r["cov"], float), r["C"]
        loglik, k_par = r["loglik"], r["k"]
    else:
        res = validos[melhor]
        b0, b1 = float(res.params[0]), float(res.params[1])
        cov = np.asarray(res.cov_params(), float)
        C = float(c_base) if (abbott_aplicado and c_base) else 0.0
        loglik, k_par = float(res.llf), 2

    se_b1 = float(np.sqrt(max(cov[1, 1], 0.0)))
    Fm = _cdf(melhor)

    # ----- aderência (Pearson) e heterogeneidade — linhas como entraram -----
    if ml:
        P_trat = C + (1 - C) * Fm(b0 + b1 * x)
        if metodo_nat == "estimada":
            # a testemunha também é observação do modelo (P = C)
            ys_all = np.concatenate([yt, y[mask_ctrl]])
            ns_all = np.concatenate([nt, n[mask_ctrl]])
            P_all = np.concatenate([P_trat, np.full(int(np.sum(mask_ctrl)), C)])
        else:
            ys_all, ns_all, P_all = yt, nt, P_trat
    else:
        ys_all = y_glm if abbott_aplicado else yt
        ns_all = nt
        P_all = Fm(b0 + b1 * x)
    P_all = np.clip(np.asarray(P_all, float), 1e-12, 1 - 1e-12)
    pearson = float(np.sum((ys_all - ns_all * P_all) ** 2 / (ns_all * P_all * (1 - P_all))))
    gl = int(len(ns_all) - k_par)
    h = pearson / gl if gl > 0 else float("nan")
    p_qui = float(stats.chi2.sf(pearson, gl)) if gl > 0 else None
    # Finney (1971) e Robertson et al. (2007): a correção entra quando a
    # heterogeneidade é SIGNIFICATIVA — h > 1 sozinho é esperado por acaso
    heterogeneo = bool(gl > 0 and p_qui is not None and p_qui < ALFA_HETEROGENEIDADE)
    if heterogeneo:
        cov = cov * h
        tcrit = float(stats.t.ppf(1 - alfa / 2, gl))
        avisos.append("Heterogeneidade significativa (χ²=%.2f, gl=%d, p=%.4f): os intervalos foram "
                      "alargados pelo fator h=%.2f e pela distribuição t (Finney, 1971)." % (pearson, gl, p_qui, h))
    else:
        tcrit = float(stats.norm.ppf(1 - alfa / 2))

    # deviância (saturado) e AIC
    with np.errstate(divide="ignore", invalid="ignore"):
        t1 = np.where(ys_all > 0, ys_all * np.log(ys_all / (ns_all * P_all)), 0.0)
        t2 = np.where(ns_all - ys_all > 0, (ns_all - ys_all) * np.log((ns_all - ys_all) / (ns_all * (1 - P_all))), 0.0)
    deviance = float(2 * np.sum(t1 + t2))
    aic = float(aics[melhor])

    # ----- doses letais com Fieller (e g) -----
    letais, log_lc, var_log_lc = [], {}, {}
    for p in probs:
        theta = _quantil(melhor, p)
        xp, lo, hi, g = _fieller(theta, b0, b1, cov, tcrit)
        registro = {"p": p, "log_dose": float(xp), "g": float(g),
                    "ic_confiavel": bool(g < G_LIMITE)}
        if log_dose:
            registro["dose"] = float(10 ** xp)
            registro["ic_inf"] = float(10 ** lo) if lo is not None else None
            registro["ic_sup"] = float(10 ** hi) if hi is not None else None
        else:
            registro["dose"] = float(xp)
            registro["ic_inf"] = float(lo) if lo is not None else None
            registro["ic_sup"] = float(hi) if hi is not None else None
        letais.append(registro)
        chave = "%.4g" % p
        log_lc[chave] = float(xp) if log_dose else (float(np.log10(xp)) if xp > 0 else float("nan"))
        v = _var_log_dose(theta, b0, b1, cov)
        var_log_lc[chave] = v if log_dose else (float(v / (xp * np.log(10)) ** 2) if xp > 0 else float("nan"))

    x50 = -b0 / b1                       # = log10(CL50) quando log_dose
    var_x50 = _var_log_dose(0.0, b0, b1, cov)
    if log_dose:
        log_lc50, var_log_lc50 = float(x50), var_x50
    else:
        lc50_lin = x50
        log_lc50 = float(np.log10(lc50_lin)) if lc50_lin > 0 else float("nan")
        var_log_lc50 = float(var_x50 / (lc50_lin * np.log(10)) ** 2) if lc50_lin > 0 else float("nan")

    # ----- tabela por dose (observado × esperado), como o PoloPlus imprime -----
    tabela = []
    doses_u = np.unique(dose)
    for du in doses_u:
        sel = dose == du
        nn = float(n[sel].sum()); yy = float(y[sel].sum())
        if du <= 0:
            pe = C if (ml or abbott_aplicado) else (c_obs or 0.0)
        else:
            xx = np.log10(du) if log_dose else du
            c_mod = C if (ml or abbott_aplicado) else 0.0
            pe = c_mod + (1 - c_mod) * float(Fm(b0 + b1 * xx))
        pe = float(min(max(pe, 1e-12), 1 - 1e-12))
        tabela.append({"dose": float(du), "n": nn, "respostas": yy,
                       "prop_obs": yy / nn if nn > 0 else None, "prop_esperada": pe,
                       "esperadas": nn * pe,
                       "residuo": (yy - nn * pe) / float(np.sqrt(nn * pe * (1 - pe))) if nn > 0 else None,
                       "testemunha": bool(du <= 0)})

    # ----- desenho (Robertson et al., 2007) -----
    parciais = sum(1 for t in tabela if not t["testemunha"] and t["prop_obs"] is not None
                   and 0 < t["prop_obs"] < 1)
    if parciais < 2:
        avisos.append("Só %d dose(s) com resposta parcial (entre 0 e 100%%): a curva se apoia nas doses "
                      "extremas. Inclua doses que matem entre 10%% e 90%% (Robertson et al., 2007)." % parciais)
    faixa = (float(d.min()), float(d.max()))
    cl50 = next((l for l in letais if abs(l["p"] - 0.5) < 1e-9), None)
    if cl50 and not faixa[0] <= cl50["dose"] <= faixa[1]:
        avisos.append("A CL50 (%.4g) cai fora das doses testadas (%.4g a %.4g): é extrapolação." %
                      (cl50["dose"], faixa[0], faixa[1]))
    if cl50 and not cl50["ic_confiavel"]:
        avisos.append("g = %.2f na CL50 (≥ %.1f): o intervalo de Fieller fica largo demais para ser útil — "
                      "a inclinação é pouco precisa (Finney, 1971)." % (cl50["g"], G_LIMITE))
    if b1 <= 0:
        avisos.append("A inclinação não é positiva: a resposta não aumenta com a dose.")
    c_para_aviso = C if (ml or abbott_aplicado) else (c_obs or 0.0)
    if c_para_aviso and c_para_aviso > 0.2:
        avisos.append("Resposta natural de %.1f%% na testemunha: acima de 20%% o ensaio costuma ser "
                      "repetido (WHO, 2016)." % (100 * c_para_aviso))

    # modelo com mortalidade natural estimada sem testemunha (informativo)
    natural_info = None
    if metodo_nat == "ausente" and c_obs is None:
        try:
            nat = _mle_natural(x, yt, nt, melhor)
            if nat["convergiu"] and nat["C"] > 0.01:
                natural_info = nat
        except Exception:
            pass

    rotulo_nat = {
        "estimada": "estimada por máxima verossimilhança, com a testemunha no modelo",
        "declarada": "declarada (valor conhecido)",
        "abbott": "Abbott sobre as proporções (método antigo)",
        "ausente": "ausente" if c_obs is None else "testemunha sem resposta",
    }[metodo_nat]

    return {
        "tipo_analise": "Dose-resposta (regressão " + melhor + ")",
        "link": melhor,
        "link_comparacao": {k: float(v) for k, v in aics.items()},
        "escala_dose": "log10" if log_dose else "linear",
        "n_grupos": int(len(x)),
        "intercepto": b0,
        "slope": b1,
        "slope_se": se_b1,
        "slope_t": float(b1 / se_b1) if se_b1 else None,
        "controle_mortalidade": float(C if (ml or abbott_aplicado) else (c_obs or 0.0)),
        "abbott_aplicado": abbott_aplicado,
        "resposta_natural": {
            "metodo": metodo_nat, "rotulo": rotulo_nat,
            "C": float(C) if (ml or abbott_aplicado) else (float(c_obs) if c_obs is not None else None),
            "C_ep": (ml[melhor]["C_ep"] if ml else None),
            "testemunha_observada": c_obs,
        },
        "qui_quadrado": pearson,
        "gl": gl,
        "p_qui_quadrado": p_qui,
        "heterogeneidade_h": float(h) if gl > 0 else None,
        "heterogeneo": bool(heterogeneo),
        "criterio_heterogeneidade": "p(χ²) < 0,05 (Finney, 1971)",
        "criterio_ic": "t de Student (g.l.) por heterogeneidade" if heterogeneo
                       else "normal (z)",
        "doses_letais": letais,
        "log_lc": log_lc,
        "var_log_lc": var_log_lc,
        "tabela_doses": tabela,
        "respostas_parciais": int(parciais),
        "modelo_natural_mle": natural_info,
        "log_lc50": log_lc50,
        "var_log_lc50": var_log_lc50,
        "aic": aic,
        "deviance": deviance,
        "loglik": float(loglik),
        "avisos": avisos,
        "referencias": ["Finney (1971)", "Robertson et al. (2007)"],
    }


def comparar_curvas(curvas, dados_grupos, link, alfa=0.05, unidade=""):
    """
    Compara várias curvas de dose-resposta (produtos/populações):
      - teste de PARALELISMO (inclinação comum vs separadas, razão de verossimilhança)
      - teste de IGUALDADE (uma linha só vs paralelas distintas)
      - RAZÃO DE DOSES LETAIS na CL50 e na CL90, com IC — o teste de razão de
        Robertson & Preisler (1992): as doses diferem quando o IC da razão
        exclui 1 (Wheeler et al., 2006). Vale mesmo com inclinações diferentes,
        por isso é o critério de resistência (RR) e não o paralelismo.

    curvas        : lista de resultados de analisar_dose_resposta (cada um com grupo,
                    doses_letais, log_lc, var_log_lc)
    dados_grupos  : lista de (grupo, x_logdose, y, n) com os dados tratados de cada curva
    """
    natural = {c.get("grupo"): float(c.get("controle_mortalidade") or 0.0) for c in curvas}
    # ----- modelos combinados p/ paralelismo e igualdade -----
    # com resposta natural, os testes rodam sobre as proporções corrigidas de cada
    # curva (a resposta natural é própria de cada população)
    linhas = []
    for grp, x, y, n in dados_grupos:
        x = np.asarray(x, float); y = np.asarray(y, float); n = np.asarray(n, float)
        c = natural.get(grp, 0.0)
        if c > 0:
            y = np.round(abbott(y / n, c) * n)
        for xi, yi, ni in zip(x, y, n):
            linhas.append({"grupo": str(grp), "x": float(xi),
                           "suc": float(yi), "fal": float(ni - yi)})
    import pandas as pd
    df = pd.DataFrame(linhas)
    fam = sm.families.Binomial(link=_link_obj(link))
    endog = df[["suc", "fal"]].values

    def ajusta(formula):
        X = patsy.dmatrix(formula, df, return_type="dataframe")
        return sm.GLM(endog, X, family=fam).fit(), X.shape[1]

    paralelismo = potencia = None
    try:
        m_eq, k_eq = ajusta("x")                 # mesma linha p/ todos
        m_par, k_par = ajusta("C(grupo) + x")    # paralelas (slope comum)
        m_full, k_full = ajusta("C(grupo) * x")  # slopes separados

        lr_par = float(m_par.deviance - m_full.deviance)
        gl_par = int(k_full - k_par)
        p_par = float(stats.chi2.sf(lr_par, gl_par)) if gl_par > 0 else None
        paralelismo = {"qui2": lr_par, "gl": gl_par, "p": p_par,
                       "paralelo": bool(p_par is not None and p_par > alfa)}

        lr_eq = float(m_eq.deviance - m_par.deviance)
        gl_eq = int(k_par - k_eq)
        p_eq = float(stats.chi2.sf(lr_eq, gl_eq)) if gl_eq > 0 else None
        potencia = {"qui2": lr_eq, "gl": gl_eq, "p": p_eq,
                    "difere": bool(p_eq is not None and p_eq < alfa)}
    except Exception as e:  # pragma: no cover
        paralelismo = {"erro": str(e)}

    # ----- razão de doses letais (referência = menor CL50) -----
    def lc(c, p):
        return next((d for d in c["doses_letais"] if abs(d["p"] - p) < 1e-9), None)

    def lv(c, p):
        chave = "%.4g" % p
        lg = (c.get("log_lc") or {}).get(chave)
        va = (c.get("var_log_lc") or {}).get(chave)
        if lg is None and abs(p - 0.5) < 1e-9:
            lg, va = c.get("log_lc50"), c.get("var_log_lc50")
        return lg, va

    info = []
    for c in curvas:
        l50, l90 = lc(c, 0.5), lc(c, 0.9)
        lg50, v50 = lv(c, 0.5)
        lg90, v90 = lv(c, 0.9)
        info.append({"grupo": c["grupo"], "lc50": l50["dose"] if l50 else None,
                     "lc90": l90["dose"] if l90 else None,
                     "lg50": lg50, "v50": v50, "lg90": lg90, "v90": v90})
    validos = [it for it in info if it["lc50"] and it["lg50"] is not None]
    razoes, referencia = [], None
    if validos:
        ref = min(validos, key=lambda z: z["lc50"])
        referencia = ref["grupo"]
        zc = float(stats.norm.ppf(1 - alfa / 2))

        def razao(lg, v, lg_ref, v_ref):
            if lg is None or v is None or lg_ref is None or v_ref is None:
                return None
            if not (np.isfinite(lg) and np.isfinite(lg_ref)):
                return None
            diff = lg - lg_ref
            se = float(np.sqrt(max(v + v_ref, 0.0)))
            lo, hi = diff - zc * se, diff + zc * se
            return {"rr": float(10 ** diff), "ic_inf": float(10 ** lo), "ic_sup": float(10 ** hi),
                    "significativo": bool(not (lo <= 0 <= hi))}   # IC da razão exclui 1

        for it in info:
            r50 = razao(it["lg50"], it["v50"], ref["lg50"], ref["v50"])
            if r50 is None:
                continue
            linha = {"grupo": it["grupo"], "lc50": it["lc50"],
                     "rr": r50["rr"], "ic_inf": r50["ic_inf"], "ic_sup": r50["ic_sup"],
                     "referencia": it["grupo"] == ref["grupo"],
                     "significativo": r50["significativo"]}
            r90 = razao(it["lg90"], it["v90"], ref["lg90"], ref["v90"])
            if r90 is not None:
                linha.update({"lc90": it["lc90"], "rr90": r90["rr"], "ic90_inf": r90["ic_inf"],
                              "ic90_sup": r90["ic_sup"], "significativo90": r90["significativo"]})
            razoes.append(linha)
        razoes.sort(key=lambda r: r["rr"])

    return {"link": link, "unidade": unidade, "referencia": referencia,
            "paralelismo": paralelismo, "diferenca_potencia": potencia,
            "razoes": razoes,
            "referencias": ["Robertson & Preisler (1992)", "Wheeler et al. (2006)", "Robertson et al. (2007)"]}
