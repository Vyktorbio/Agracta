"""
Modelos lineares generalizados para tratamentos categóricos quando a
resposta é contagem ou proporção (x de n) — sem preditor de dose.

  - contagem  : Poisson  ->  Binomial Negativa se houver sobredispersão
  - proporção : Binomial ->  ajuste de escala (quase-binomial) se sobredisperso

Compara os tratamentos por contrastes de Wald no preditor linear, ajusta
os p-valores (Holm) e produz as letras (compact letter display).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import patsy
import statsmodels.api as sm
import statsmodels.formula.api as smf

from . import diagnostics as diag
from .posthoc import compact_letters, _ajuste_p


def _linha(design_info, nivel, blocos=None):
    df = pd.DataFrame([{'F1': nivel, **({'bloco': b} if b is not None else {})} for b in (blocos or [None])])
    return np.asarray(patsy.build_design_matrices([design_info], df)[0], float).mean(axis=0)


def _letras_por_contraste(res, niveis, design_info, alfa, dispersao=1.0, blocos=None):
    """Comparações pareadas no preditor linear -> letras."""
    linhas = {}
    for lv in niveis:
        linhas[lv] = _linha(design_info, lv, blocos)

    cov = np.asarray(res.cov_params(), float) * dispersao
    beta = np.asarray(res.params, float)

    pares, pvals, detalhes = [], [], []
    for i in range(len(niveis)):
        for j in range(i + 1, len(niveis)):
            a, b = niveis[i], niveis[j]
            c = linhas[a] - linhas[b]
            est = float(c @ beta)
            se = float(np.sqrt(max(c @ cov @ c, 0.0)))
            z = est / se if se > 0 else 0.0
            from scipy import stats as _st
            p = 2 * (1 - _st.norm.cdf(abs(z)))
            pares.append((a, b)); pvals.append(p)
            detalhes.append({"g1": a, "g2": b, "dif_link": est, "z": z, "p": p})

    pajs = _ajuste_p(pvals, "holm")
    difere = set()
    for (a, b), paj, det in zip(pares, pajs, detalhes):
        det["p_ajustado"] = float(paj)
        det["significativo"] = bool(paj < alfa)
        if paj < alfa:
            difere.add(frozenset({a, b}))
    return difere, detalhes


def _medias_preditas(res, niveis, design_info, link_inv, blocos=None):
    out = {}
    for lv in niveis:
        eta = float(_linha(design_info, lv, blocos) @ np.asarray(res.params, float))
        out[lv] = float(link_inv(eta))
    return out


def glm_contagem(resp, fator, alfa=0.05, bloco=None, maior_melhor=True):
    """Resposta de contagem ~ um fator categórico."""
    df = pd.DataFrame({"y": np.asarray(resp, float), "F1": fator})
    if bloco is not None:
        df['bloco'] = bloco
    df = df.dropna()
    if not np.all(np.isfinite(df['y'])) or np.any(df['y'] < 0) or np.any(df['y'] != np.floor(df['y'])):
        raise ValueError('Uma contagem precisa conter inteiros finitos e não negativos.')
    df['F1'] = df['F1'].astype(str)
    if bloco is not None:
        df['bloco'] = df['bloco'].astype(str)
    blocos = sorted(df['bloco'].unique()) if bloco is not None else None
    formula = 'y ~ C(F1)' + (' + C(bloco)' if blocos else '')
    niveis = sorted(df["F1"].unique())

    pois = smf.glm(formula, data=df, family=sm.families.Poisson()).fit()
    if pois.df_resid < 1 or np.linalg.matrix_rank(pois.model.exog) < pois.model.exog.shape[1]:
        raise ValueError('GLM sem erro residual ou com tratamento e bloco confundidos.')
    over = diag.sobredispersao_poisson(df["y"].values, pois.fittedvalues.values,
                                       len(pois.params))

    modelo, familia, nota = pois, "Poisson", None
    if over["sobredisperso"]:
        try:
            # Estima a dispersão NB2; o default de GLM fixava alpha=1 para todo ensaio.
            ajuste_nb = smf.negativebinomial(formula, data=df).fit(disp=False)
            alpha_nb = float(ajuste_nb.params['alpha'])
            if not ajuste_nb.mle_retvals.get('converged') or not np.isfinite(alpha_nb) or alpha_nb <= 0:
                raise ValueError('Dispersão NB não estimável.')
            nb = smf.glm(formula, data=df, family=sm.families.NegativeBinomial(alpha=alpha_nb)).fit()
            modelo, familia = nb, "Binomial Negativa"
            nota = (f"sobredispersão detectada (φ={over['phi']:.2f}); "
                    f"modelo trocado para Binomial Negativa (alpha estimado={alpha_nb:.4g}; inferência condicional à dispersão)")
        except Exception:
            nota = (f"sobredispersão (φ={over['phi']:.2f}); usando quase-Poisson "
                    "(erros-padrão inflados)")

    design_info = modelo.model.data.design_info
    dispersao = over["phi"] if (familia == "Poisson" and over["sobredisperso"]) else 1.0
    difere, comparacoes = _letras_por_contraste(modelo, niveis, design_info, alfa, dispersao, blocos)
    medias = _medias_preditas(modelo, niveis, design_info, np.exp, blocos)
    ordem = [t for t, _ in sorted(medias.items(), key=lambda kv: kv[1], reverse=maior_melhor)]
    letras = compact_letters(ordem, difere)

    return {"tipo_analise": f"GLM {familia} (contagem)", "familia": familia,
            "nota_modelo": nota, "sobredispersao": over,
            "medias_estimadas": medias, "letras": letras,
            "comparacoes": comparacoes, "ordem": ordem,
            "aic": float(modelo.aic), "alfa": alfa, 'formula': formula, 'blocos': blocos,
            'escala_medias': 'Ligação inversa da média ajustada no preditor linear'}


def glm_proporcao(y, n, fator, alfa=0.05, bloco=None, maior_melhor=True):
    """Resposta binomial (x de n) ~ um fator categórico (ex.: % afetados)."""
    df = pd.DataFrame({"y": np.asarray(y, float), "n": np.asarray(n, float),
                       "F1": fator})
    if bloco is not None:
        df['bloco'] = bloco
    df = df.dropna()
    df['F1'] = df['F1'].astype(str)
    if bloco is not None:
        df['bloco'] = df['bloco'].astype(str)
    blocos = sorted(df['bloco'].unique()) if bloco is not None else None
    if not np.all(np.isfinite(df[['y','n']])) or np.any(df['n']<=0) or np.any(df['y']<0) or np.any(df['y']>df['n']) or np.any(df[['y','n']] != np.floor(df[['y','n']])):
        raise ValueError('Confira eventos e total: inteiros finitos com 0 ≤ eventos ≤ total e total positivo.')
    df["falha"] = df["n"] - df["y"]
    niveis = sorted(df["F1"].unique())

    endog = df[["y", "falha"]].values
    formula = 'C(F1)' + (' + C(bloco)' if blocos else '')
    X = patsy.dmatrix(formula, df, return_type="dataframe")
    design_info = X.design_info
    modelo = sm.GLM(endog, X, family=sm.families.Binomial()).fit()
    if modelo.df_resid < 1 or np.linalg.matrix_rank(X) < X.shape[1]:
        raise ValueError('GLM sem erro residual ou com tratamento e bloco confundidos.')

    mu_prop = np.asarray(modelo.predict(X), dtype=float)
    over = diag.sobredispersao_binomial(df["y"].values, df["n"].values,
                                        mu_prop, len(modelo.params))
    dispersao = over["phi"] if over["sobredisperso"] else 1.0
    familia = "Binomial" + (" (escala quase-binomial)" if over["sobredisperso"] else "")
    nota = (f"sobredispersão (φ={over['phi']:.2f}); erros-padrão corrigidos por escala"
            if over["sobredisperso"] else None)

    inv = lambda eta: 1 / (1 + np.exp(-eta))
    difere, comparacoes = _letras_por_contraste(modelo, niveis, design_info, alfa, dispersao, blocos)
    medias = _medias_preditas(modelo, niveis, design_info, inv, blocos)
    ordem = [t for t, _ in sorted(medias.items(), key=lambda kv: kv[1], reverse=maior_melhor)]
    letras = compact_letters(ordem, difere)

    return {"tipo_analise": f"GLM {familia} (proporção x de n)", "familia": familia,
            "nota_modelo": nota, "sobredispersao": over,
            "proporcoes_estimadas": medias, "letras": letras,
            "comparacoes": comparacoes, "ordem": ordem,
            "aic": float(modelo.aic), "alfa": alfa, 'formula': 'eventos/total ~ '+formula, 'blocos': blocos,
            'escala_medias': 'Ligação inversa da média ajustada no preditor linear'}
