"""Contrastes contra um controle explícito, preservando o modelo ajustado."""
import numpy as np
import pandas as pd
import patsy
from scipy import stats, optimize
from .posthoc import _ajuste_p


def restringir_controle(resultado, controle):
    """Dunn/GLM: ajusta somente a família planejada contra o controle (Holm)."""
    controle=str(controle)
    if controle not in resultado.get('ordem',[]):
        raise ValueError('Selecione um controle observado.')
    comps=[dict(c) for c in resultado.get('comparacoes',[]) if controle in (c['g1'],c['g2'])]
    if not comps: raise ValueError('Não há contrastes estimáveis contra o controle.')
    for c,p in zip(comps,_ajuste_p([c['p'] for c in comps],'holm')):
        c['p_bruto']=c['p'];c['p']=float(p);c['p_ajustado']=float(p)
        c['significativo']=bool(p<resultado['alfa'])
        if 'dif_link' in c:
            c['diferenca']=float(-c['dif_link'] if c['g1']==controle else c['dif_link'])
        if c['g1']!=controle: c['g1'],c['g2']=c['g2'],c['g1']
    resultado.update(comparacoes=comps,letras={},controle=controle,contra_controle=True)
    resultado['nota']='Comparações apenas com o controle; p ajustados por Holm. Não testa os demais tratamentos entre si.'
    return resultado


def dunnett_modelo(a, controle, alfa=.05):
    modelo, df, fatores = a['_modelo'], a['_df'], a['_nomes_fatores']
    beta, cov = np.asarray(modelo.params), np.asarray(modelo.cov_params())
    blocos = sorted(df['bloco'].unique()) if 'bloco' in df else [None]
    vetores = {}
    for _, cel in df[fatores].drop_duplicates().sort_values(fatores).iterrows():
        nome = ' × '.join(str(cel[f]) for f in fatores)
        grid = pd.DataFrame([{**cel.to_dict(), **({'bloco': b} if b is not None else {})} for b in blocos])
        vetores[nome] = np.asarray(patsy.build_design_matrices([modelo.model.data.design_info], grid)[0]).mean(axis=0)
    controle = str(controle)
    if controle not in vetores:
        raise ValueError('Selecione a testemunha/controle entre os tratamentos observados.')
    nomes = [n for n in vetores if n != controle]
    if not nomes:
        raise ValueError('É necessário ao menos um tratamento além do controle.')
    L = np.array([vetores[n]-vetores[controle] for n in nomes])
    dif, S = L @ beta, L @ cov @ L.T
    se = np.sqrt(np.diag(S))
    if np.any(se <= 0) or not np.all(np.isfinite(se)):
        raise ValueError('Sem erro estimável para os contrastes contra controle.')
    gl = float(modelo.df_resid)
    corr = S / np.outer(se,se)
    corr = (corr+corr.T)/2
    np.fill_diagonal(corr,1.)
    m = len(nomes)
    if m == 1:
        crit = stats.t.ppf(1-alfa/2,gl)
        pvals = [2*stats.t.sf(abs(dif[0]/se[0]),gl)]
    else:
        # Integração multivariada com semente fixa: reprodutível na versão publicada.
        dist = stats.multivariate_t(shape=corr,df=gl,allow_singular=True)
        def cobertura(q):
            return float(dist.cdf(np.full(m,q),lower_limit=np.full(m,-q),maxpts=100000,
                                  random_state=np.random.default_rng(42019)))
        teto = float(stats.t.ppf(1-alfa/(2*m),gl))
        crit = optimize.brentq(lambda q:cobertura(q)-(1-alfa),.01,teto*1.01,xtol=1e-5)
        pvals = [max(0.,min(1.,1-cobertura(abs(d/s)))) for d,s in zip(dif,se)]
    comps=[]
    for n,d,s,p in zip(nomes,dif,se,pvals):
        comps.append({'g1':controle,'g2':n,'diferenca':float(d),'ep_diferenca':float(s),
                      'p':float(p),'ic_inf':float(d-crit*s),'ic_sup':float(d+crit*s),
                      'significativo':bool(p<alfa)})
    ordem=[controle]+nomes
    return {'metodo':'Dunnett — controle e erro do modelo','controle':controle,'contra_controle':True,
            'alfa':alfa,'df_erro':gl,'medias':{n:float(vetores[n]@beta) for n in ordem},
            'erros_padrao':{n:float(np.sqrt(max(0,vetores[n]@cov@vetores[n]))) for n in ordem},
            'ajustadas':True,'ordem':ordem,'letras':{},'comparacoes':comps,
            'nota':'ICs simultâneos para os contrastes com o controle; não testa os demais tratamentos entre si.'}
