"""Validacao de desempenho de metodo analitico/metrologico.

O modulo calcula um painel de validacao com:
  - seletividade
  - linearidade, faixa de trabalho e sensibilidade
  - LD/LQ
  - tendencia/recuperacao
  - precisao: repetibilidade, precisao intermediaria e reprodutibilidade
  - robustez
  - Grubbs e residuos padronizados Jackknife
  - Cochran, Levene e Brown-Forsythe
  - teste F, teste t e ANOVA
  - estatisticas descritivas, CV/DPR e Horwitz
"""

from __future__ import annotations

import math
from collections import defaultdict

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from scipy import stats
from statsmodels.stats.anova import anova_lm
from statsmodels.stats.outliers_influence import OLSInfluence

from . import diagnostics as diag


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
        return np.asarray([""] * n, dtype=object)
    return np.asarray([str(v).strip() for v in dados[nome]], dtype=object)


def _valid(*xs):
    mask = None
    for x in xs:
        if x is None:
            continue
        m = np.isfinite(np.asarray(x, dtype=float))
        mask = m if mask is None else (mask & m)
    return mask if mask is not None else np.array([], dtype=bool)


def _label(v):
    s = str(v).strip()
    return s if s else "(vazio)"


def _stats(v):
    a = np.asarray(v, dtype=float)
    a = a[np.isfinite(a)]
    n = int(a.size)
    if n == 0:
        return {"n": 0}
    media = float(np.mean(a))
    dp = float(np.std(a, ddof=1)) if n > 1 else 0.0
    return {
        "n": n,
        "media": media,
        "dp": dp,
        "mediana": float(np.median(a)),
        "min": float(np.min(a)),
        "max": float(np.max(a)),
        "cv": float(100 * dp / media) if n > 1 and media != 0 else None,
    }


def _groups(values, labels, min_n=1):
    out = []
    labels = np.asarray([_label(x) for x in labels], dtype=object)
    values = np.asarray(values, dtype=float)
    for g in sorted(set(labels)):
        vals = values[(labels == g) & np.isfinite(values)]
        if vals.size >= min_n:
            out.append((g, vals))
    return out


def _group_stats(values, labels):
    return [{"grupo": g, **_stats(vals)} for g, vals in _groups(values, labels)]


def _combine_labels(cols):
    valid_cols = [np.asarray(c, dtype=object) for c in cols if c is not None]
    if not valid_cols:
        return None
    n = len(valid_cols[0])
    out = []
    for i in range(n):
        parts = [_label(c[i]) for c in valid_cols if _label(c[i]) != "(vazio)"]
        out.append(" / ".join(parts) if parts else "(condicao)")
    return np.asarray(out, dtype=object)


def grubbs(values, alfa=0.05):
    x = np.asarray(values, dtype=float)
    x = x[np.isfinite(x)]
    n = int(x.size)
    out = {"teste": "Grubbs bilateral", "n": n, "alfa": float(alfa)}
    if n < 3:
        out.update({"aplicavel": False, "nota": "requer pelo menos 3 valores"})
        return out
    media = float(np.mean(x))
    s = float(np.std(x, ddof=1))
    if s == 0:
        out.update({"aplicavel": False, "nota": "variancia zero"})
        return out
    idx = int(np.argmax(np.abs(x - media)))
    G = float(abs(x[idx] - media) / s)
    tcrit = stats.t.ppf(1 - alfa / (2 * n), n - 2)
    Gcrit = ((n - 1) / math.sqrt(n)) * math.sqrt(tcrit**2 / (n - 2 + tcrit**2))
    denom = (n - 1) ** 2 - n * G**2
    p = None
    if denom > 0:
        tcalc = math.sqrt((n - 2) * n * G**2 / denom)
        p = min(1.0, float(2 * n * stats.t.sf(tcalc, n - 2)))
    out.update({
        "aplicavel": True,
        "estatistica": G,
        "critico": float(Gcrit),
        "p": p,
        "outlier": bool(G > Gcrit),
        "valor_suspeito": float(x[idx]),
    })
    return out


def jackknife_residuos(y, x, alfa=0.05):
    mask = _valid(y, x)
    yv = np.asarray(y, dtype=float)[mask]
    xv = np.asarray(x, dtype=float)[mask]
    n = int(yv.size)
    out = {"metodo": "residuos padronizados Jackknife", "n": n, "alfa": float(alfa)}
    if n < 4 or len(np.unique(xv)) < 2:
        out.update({"aplicavel": False, "nota": "requer regressao com pelo menos 4 pontos e 2 niveis"})
        return out
    modelo = sm.OLS(yv, sm.add_constant(xv)).fit()
    infl = OLSInfluence(modelo)
    resid = np.asarray(infl.resid_studentized_external, dtype=float)
    gl = max(int(modelo.df_resid) - 1, 1)
    crit = float(stats.t.ppf(1 - alfa / (2 * n), gl))
    suspeitos = []
    for i, r in enumerate(resid):
        if np.isfinite(r) and abs(r) > crit:
            suspeitos.append({"indice": int(i + 1), "x": float(xv[i]), "y": float(yv[i]), "residuo": float(r)})
    out.update({
        "aplicavel": True,
        "critico": crit,
        "max_abs": float(np.nanmax(np.abs(resid))),
        "outliers": suspeitos,
    })
    return out


def linearidade(y, x, alfa=0.05):
    mask = _valid(y, x)
    yv = np.asarray(y, dtype=float)[mask]
    xv = np.asarray(x, dtype=float)[mask]
    out = {"n": int(yv.size), "alfa": float(alfa)}
    if yv.size < 3 or len(np.unique(xv)) < 3:
        out.update({"aplicavel": False, "nota": "linearidade requer pelo menos 3 niveis de concentracao"})
        return out
    X = sm.add_constant(xv)
    modelo = sm.OLS(yv, X).fit()
    pred = modelo.predict(X)
    resid = yv - pred
    s_res = float(math.sqrt(modelo.mse_resid)) if modelo.df_resid > 0 else None

    lof = None
    grupos = _groups(yv, xv, min_n=2)
    k = len(np.unique(xv))
    if grupos and yv.size - k > 0 and k - 2 > 0 and modelo.df_resid > 0:
        ss_pe = 0.0
        df_pe = 0
        for _, vals in grupos:
            ss_pe += float(np.sum((vals - np.mean(vals)) ** 2))
            df_pe += int(vals.size - 1)
        ss_res = float(np.sum(resid**2))
        ss_lof = max(ss_res - ss_pe, 0.0)
        df_lof = k - 2
        if df_pe > 0 and ss_pe > 0:
            F = (ss_lof / df_lof) / (ss_pe / df_pe)
            lof = {
                "teste": "falta de ajuste",
                "F": float(F),
                "p": float(stats.f.sf(F, df_lof, df_pe)),
                "df_lof": int(df_lof),
                "df_erro_puro": int(df_pe),
                "sem_falta_ajuste": bool(stats.f.sf(F, df_lof, df_pe) > alfa),
            }

    out.update({
        "aplicavel": True,
        "intercepto": float(modelo.params[0]),
        "inclinação": float(modelo.params[1]),
        "sensibilidade": float(abs(modelo.params[1])),
        "r2": float(modelo.rsquared),
        "r2_ajustado": float(modelo.rsquared_adj),
        "p_inclinacao": float(modelo.pvalues[1]),
        "s_residual": s_res,
        "faixa_trabalho": {"min": float(np.min(xv)), "max": float(np.max(xv)), "niveis": int(k)},
        "normalidade_residuos": diag.normalidade(resid),
        "falta_ajuste": lof,
        "_modelo": modelo,
        "_x": xv,
        "_y": yv,
        "_resid": resid,
    })
    return out


def ld_lq(linear, y, x, labels=None):
    out = {"metodo": []}
    if not linear.get("aplicavel") or not linear.get("sensibilidade"):
        return {"aplicavel": False, "nota": "LD/LQ por curva requer linearidade e inclinacao diferente de zero"}
    slope = abs(float(linear["inclinação"]))
    if slope == 0:
        return {"aplicavel": False, "nota": "inclinacao zero"}
    sres = linear.get("s_residual")
    if sres is not None:
        out["metodo"].append({
            "base": "desvio residual da regressao",
            "s": float(sres),
            "ld": float(3.3 * sres / slope),
            "lq": float(10.0 * sres / slope),
        })
    if labels is not None:
        ly = np.asarray(labels, dtype=object)
        vals = np.asarray(y, dtype=float)
        blank_mask = np.asarray([bool(str(v).strip()) and str(v).lower().strip() in ("1", "sim", "s", "true", "branco", "blank") for v in ly])
        blank_vals = vals[blank_mask & np.isfinite(vals)]
        if blank_vals.size >= 2:
            sb = float(np.std(blank_vals, ddof=1))
            out["metodo"].append({
                "base": "desvio padrao do branco",
                "s": sb,
                "n": int(blank_vals.size),
                "ld": float(3.0 * sb / slope),
                "lq": float(10.0 * sb / slope),
            })
    if not out["metodo"]:
        return {"aplicavel": False, "nota": "sem desvio residual ou branco suficiente"}
    out["aplicavel"] = True
    return out


def homocedasticidade(y, labels, alfa=0.05):
    grupos = _groups(y, labels, min_n=2)
    out = {"alfa": float(alfa), "k_grupos": len(grupos)}
    if len(grupos) < 2:
        out.update({"aplicavel": False, "nota": "requer pelo menos 2 grupos com repeticao"})
        return out
    out["aplicavel"] = True
    vals = [g[1] for g in grupos]
    nomes = [g[0] for g in grupos]
    variancias = [float(np.var(v, ddof=1)) for v in vals]
    soma = sum(variancias)
    cochran = None
    if soma > 0:
        c = max(variancias) / soma
        ns = [len(v) for v in vals]
        ccrit = None
        nota = None
        if len(set(ns)) == 1 and ns[0] > 1:
            k = len(vals)
            fcrit = stats.f.ppf(1 - alfa / k, ns[0] - 1, (k - 1) * (ns[0] - 1))
            ccrit = float(fcrit / (fcrit + k - 1))
        else:
            nota = "valor critico exato de Cochran pressupoe n igual por grupo"
        cochran = {
            "C": float(c),
            "critico": ccrit,
            "homogenea": bool(c < ccrit) if ccrit is not None else None,
            "grupo_maior_variancia": nomes[int(np.argmax(variancias))],
            "nota": nota,
        }
    Wl, pl = stats.levene(*vals, center="mean")
    Wb, pb = stats.levene(*vals, center="median")
    out.update({
        "aplicavel": True,
        "grupo_base": nomes,
        "cochran": cochran,
        "levene": {"estatistica": float(Wl), "p": float(pl), "homogenea": bool(pl > alfa)},
        "brown_forsythe": {"estatistica": float(Wb), "p": float(pb), "homogenea": bool(pb > alfa)},
    })
    return out


def comparar_por_fator(y, labels, nome, alfa=0.05):
    grupos = _groups(y, labels, min_n=2)
    out = {"fator": nome, "alfa": float(alfa), "k_grupos": len(grupos)}
    if len(grupos) < 2:
        out.update({"aplicavel": False, "nota": "requer pelo menos 2 grupos com repeticao"})
        return out
    out["aplicavel"] = True
    vals = [g[1] for g in grupos]
    nomes = [g[0] for g in grupos]
    out["descritiva"] = [{"grupo": n, **_stats(v)} for n, v in grupos]
    if len(vals) == 2:
        t, p = stats.ttest_ind(vals[0], vals[1], equal_var=False)
        v1, v2 = np.var(vals[0], ddof=1), np.var(vals[1], ddof=1)
        if v1 >= v2:
            F, d1, d2 = v1 / v2 if v2 > 0 else np.inf, len(vals[0]) - 1, len(vals[1]) - 1
        else:
            F, d1, d2 = v2 / v1 if v1 > 0 else np.inf, len(vals[1]) - 1, len(vals[0]) - 1
        pf = None if not np.isfinite(F) else min(1.0, float(2 * stats.f.sf(F, d1, d2)))
        out["teste_t"] = {"tipo": "Welch", "t": float(t), "p": float(p), "sem_diferenca": bool(p > alfa)}
        out["teste_F_variancias"] = {"F": float(F), "p": pf, "variancias_semelhantes": bool(pf is not None and pf > alfa)}
    F, p = stats.f_oneway(*vals)
    out["anova"] = {"F": float(F), "p": float(p), "sem_diferenca": bool(p > alfa)}
    return out


def recuperacao(y, ref, labels=None, alfa=0.05):
    mask = _valid(y, ref)
    yv = np.asarray(y, dtype=float)[mask]
    rv = np.asarray(ref, dtype=float)[mask]
    ok = rv != 0
    yv, rv = yv[ok], rv[ok]
    out = {"n": int(yv.size), "alfa": float(alfa)}
    if yv.size < 2:
        out.update({"aplicavel": False, "nota": "requer coluna de valor de referencia/fortificado"})
        return out
    rec = 100.0 * yv / rv
    bias = yv - rv
    t, p = stats.ttest_1samp(rec, 100.0)
    out.update({
        "aplicavel": True,
        "recuperacao": _stats(rec),
        "tendencia": _stats(bias),
        "teste_t_100": {"t": float(t), "p": float(p), "sem_tendencia": bool(p > alfa)},
    })
    if labels is not None:
        lab = np.asarray(labels, dtype=object)[mask][ok]
        out["por_grupo"] = [{"grupo": g, **_stats(vals)} for g, vals in _groups(rec, lab)]
    return out


def precisao(y, nivel=None, analista=None, dia=None, matriz=None, grupo=None, alfa=0.05):
    labels_rep = _combine_labels([nivel, matriz])
    if labels_rep is None:
        labels_rep = np.asarray(["global"] * len(y), dtype=object)
    grupos = _groups(y, labels_rep, min_n=2)
    soma = 0.0
    gl = 0
    for _, vals in grupos:
        soma += float(np.sum((vals - np.mean(vals)) ** 2))
        gl += int(vals.size - 1)
    s_r = math.sqrt(soma / gl) if gl > 0 else None
    media = float(np.nanmean(y)) if np.any(np.isfinite(y)) else None
    repet = {
        "aplicavel": s_r is not None,
        "s_r": float(s_r) if s_r is not None else None,
        "cv_r": float(100 * s_r / media) if s_r is not None and media not in (None, 0) else None,
        "gl": int(gl),
        "grupos": [{"grupo": g, **_stats(vals)} for g, vals in grupos],
    }
    fatores = []
    if analista is not None:
        fatores.append(comparar_por_fator(y, analista, "analista", alfa))
    if dia is not None:
        fatores.append(comparar_por_fator(y, dia, "dia/serie", alfa))
    cond = _combine_labels([analista, dia, matriz, grupo])
    reprod = {"aplicavel": False}
    if cond is not None:
        st = _stats(np.asarray(y, dtype=float)[np.isfinite(y)])
        reprod = {
            "aplicavel": st.get("n", 0) >= 2,
            "s_R": st.get("dp"),
            "cv_R": st.get("cv"),
            "n": st.get("n"),
            "condicoes": len(set(cond)),
        }
    return {
        "repetibilidade": repet,
        "precisao_intermediaria": fatores,
        "reprodutibilidade": reprod,
    }


def seletividade(y, x=None, matriz=None, grupo=None, alfa=0.05):
    labels = matriz if matriz is not None else grupo
    out = {"alfa": float(alfa)}
    if labels is None:
        out.update({"aplicavel": False, "nota": "marque matriz/amostra ou grupo/condicao para avaliar seletividade"})
        return out
    grupos = _groups(y, labels, min_n=2)
    if len(grupos) < 2:
        out.update({"aplicavel": False, "nota": "requer pelo menos 2 matrizes/grupos com repeticao"})
        return out
    if x is not None and np.sum(_valid(y, x)) >= 6 and len(np.unique(x[np.isfinite(x)])) >= 2:
        df = pd.DataFrame({"y": y, "x": x, "matriz": labels}).dropna()
        if df["matriz"].nunique() >= 2:
            try:
                modelo = smf.ols("y ~ x * C(matriz)", data=df).fit()
                aov = anova_lm(modelo, typ=2)
                p_m = float(aov.loc["C(matriz)", "PR(>F)"]) if "C(matriz)" in aov.index else None
                p_i = float(aov.loc["x:C(matriz)", "PR(>F)"]) if "x:C(matriz)" in aov.index else None
                out.update({
                    "aplicavel": True,
                    "modelo": "ANCOVA y ~ concentracao * matriz",
                    "p_matriz": p_m,
                    "p_interacao": p_i,
                    "seletivo": bool((p_m is None or p_m > alfa) and (p_i is None or p_i > alfa)),
                })
                return out
            except Exception as e:
                out["erro_modelo"] = str(e)
    comp = comparar_por_fator(y, labels, "matriz/grupo", alfa)
    out.update({"aplicavel": True, "comparacao": comp,
                "seletivo": bool((comp.get("anova") or {}).get("sem_diferenca", False))})
    return out


def horwitz(c, cv_obs=None):
    try:
        C = float(c)
    except Exception:
        return {"aplicavel": False, "nota": "informe C como fracao massica (ex.: 1e-6)"}
    if not np.isfinite(C) or C <= 0:
        return {"aplicavel": False, "nota": "C precisa ser maior que zero"}
    prsd = float(2 ** (1 - 0.5 * math.log10(C)))
    out = {"aplicavel": True, "C": C, "prsd_R": prsd}
    if cv_obs is not None and np.isfinite(cv_obs):
        horrat = float(cv_obs / prsd)
        out.update({"cv_observado": float(cv_obs), "HorRat": horrat, "compativel": bool(0.5 <= horrat <= 2.0)})
    return out


def analisar_validacao(dados, papeis, opcoes=None):
    opcoes = opcoes or {}
    alfa = float(opcoes.get("alfa", 0.05))
    resp_col = papeis.get("resposta")
    if not resp_col or resp_col not in dados:
        return {"ok": False, "erro": "Selecione a coluna de resposta/resultado."}

    y = _arr(dados, resp_col)
    n = len(y)
    ref = _arr(dados, papeis.get("referencia"))
    x = _arr(dados, papeis.get("concentracao"))
    if x is None and ref is not None:
        x = ref
    grupo = _txt(dados, papeis.get("grupo"), n) if papeis.get("grupo") else None
    analista = _txt(dados, papeis.get("analista"), n) if papeis.get("analista") else None
    dia = _txt(dados, papeis.get("dia"), n) if papeis.get("dia") else None
    matriz = _txt(dados, papeis.get("matriz"), n) if papeis.get("matriz") else None
    rep = _txt(dados, papeis.get("replicata"), n) if papeis.get("replicata") else None
    usar_branco = bool(opcoes.get("usar_branco", True))
    branco = _txt(dados, papeis.get("branco"), n) if usar_branco and papeis.get("branco") else None

    valid_y = y[np.isfinite(y)]
    if valid_y.size < 2:
        return {"ok": False, "erro": "A resposta precisa ter pelo menos 2 valores numericos."}

    lin = linearidade(y, x, alfa) if x is not None else {"aplicavel": False, "nota": "marque concentracao/nivel para avaliar linearidade"}
    resid_ou_y = lin.get("_resid") if lin.get("aplicavel") else valid_y
    normal = diag.normalidade(resid_ou_y)
    labels_h = None
    if x is not None:
        labels_h = np.asarray([str(v) if np.isfinite(v) else "" for v in x], dtype=object)
    elif grupo is not None:
        labels_h = grupo
    elif analista is not None:
        labels_h = analista

    homo = homocedasticidade(y, labels_h, alfa) if labels_h is not None else {
        "aplicavel": False,
        "nota": "marque concentracao, grupo ou analista para homocedasticidade",
    }
    comps = []
    for nome, lab in [("grupo/condicao", grupo), ("analista", analista), ("dia/serie", dia), ("matriz", matriz)]:
        if lab is not None:
            comps.append(comparar_por_fator(y, lab, nome, alfa))

    prec = precisao(y, nivel=x, analista=analista, dia=dia, matriz=matriz, grupo=grupo, alfa=alfa)
    rec = recuperacao(y, ref, x if x is not None else grupo, alfa) if ref is not None else {
        "aplicavel": False,
        "nota": "marque valor de referencia/fortificado para tendencia e recuperacao",
    }
    hor = horwitz(opcoes.get("horwitz_c"), (prec.get("reprodutibilidade") or {}).get("cv_R"))
    sel = seletividade(y, x=x, matriz=matriz, grupo=grupo, alfa=alfa)
    robust = {"aplicavel": False, "nota": "robustez e opcional; marque grupo/condicao, analista, dia ou matriz"}
    if bool(opcoes.get("robustez")) and comps:
        robust = {"aplicavel": True, "comparacoes": comps, "criterio": "sem diferenca estatistica entre condicoes deliberadamente variadas"}
    out = {
        "ok": True,
        "tipo": "validacao",
        "alfa": alfa,
        "papel_resposta": resp_col,
        "premissa_gaussiana": {
            "texto": "Os testes parametricos assumem variacoes aleatorias compatíveis com distribuicao normal; se a normalidade falhar, investigue transformacao, modelo robusto ou abordagem nao-parametrica.",
            "normalidade": normal,
        },
        "descritiva": {
            "geral": _stats(valid_y),
            "por_concentracao": _group_stats(y, x) if x is not None else [],
            "por_grupo": _group_stats(y, grupo) if grupo is not None else [],
        },
        "outliers": {
            "grubbs": grubbs(valid_y, alfa),
            "jackknife": jackknife_residuos(y, x, alfa) if x is not None else {"aplicavel": False, "nota": "requer concentracao/nivel para regressao"},
        },
        "homocedasticidade": homo,
        "linearidade": {k: v for k, v in lin.items() if not k.startswith("_")},
        "ld_lq": ld_lq(lin, y, x, labels=branco) if x is not None else {"aplicavel": False, "nota": "marque concentracao/nivel para LD/LQ"},
        "recuperacao": rec,
        "precisao": prec,
        "comparacoes": comps,
        "seletividade": sel,
        "robustez": robust,
        "horwitz": hor,
    }
    return out
