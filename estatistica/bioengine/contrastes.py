"""Contrastes contra um controle explícito, preservando o modelo ajustado."""
import numpy as np
import pandas as pd
import patsy
from scipy import stats, optimize
from .posthoc import _ajuste_p
from . import efeito


def restringir_controle(resultado, controle):
    """Dunn/GLM: ajusta somente a família planejada contra o controle (Holm)."""
    controle=str(controle)
    if controle not in resultado.get('ordem',[]):
        raise ValueError('Selecione um controle observado.')
    comps=[dict(c) for c in resultado.get('comparacoes',[]) if controle in (c['g1'],c['g2'])]
    if not comps: raise ValueError('Não há contrastes estimáveis contra o controle.')
    # Contagem (ligação log): exp(diferença) é a razão de taxas — "quantos % a
    # menos (ou a mais) que a testemunha", exato nessa escala. IC de Bonferroni
    # para a família contra o controle. Em x de n (logit), exp(diferença) é
    # razão de chances, que não é % da testemunha: não é dada.
    contagem='medias_estimadas' in resultado
    zcrit=float(stats.norm.ppf(1-resultado['alfa']/(2*len(comps))))
    for c,p in zip(comps,_ajuste_p([c['p'] for c in comps],'holm')):
        c['p_bruto']=c['p'];c['p']=float(p);c['p_ajustado']=float(p)
        c['significativo']=bool(p<resultado['alfa'])
        if 'dif_link' in c:
            c['diferenca']=float(-c['dif_link'] if c['g1']==controle else c['dif_link'])
            se=c.get('ep_link')
            if contagem and se is not None and np.isfinite(se) and se>0:
                d=c['diferenca']
                c.update({'relativo_pct':100*(np.exp(d)-1),'relativo_ic_inf':100*(np.exp(d-zcrit*se)-1),
                          'relativo_ic_sup':100*(np.exp(d+zcrit*se)-1),'relativo_motivo':None,
                          'relativo_metodo':'razão de taxas do GLM (ligação log), IC de Bonferroni'})
            elif not contagem:
                c.update(efeito.relativo_ausente('Em x de n, a diferença na escala logit é razão de chances, não % da testemunha; '
                                                 'compare as proporções estimadas.'))
        if c['g1']!=controle: c['g1'],c['g2']=c['g2'],c['g1']
    resultado.update(comparacoes=comps,letras={},controle=controle,contra_controle=True)
    resultado['nota']='Comparações apenas com o controle; p ajustados por Holm. Não testa os demais tratamentos entre si.'
    return resultado


def _vetores_modelo(a):
    """Vetor da média marginal de cada tratamento (média sobre os blocos) no modelo da ANOVA."""
    modelo, df, fatores = a['_modelo'], a['_df'], a['_nomes_fatores']
    beta, cov = np.asarray(modelo.params), np.asarray(modelo.cov_params())
    blocos = sorted(df['bloco'].unique()) if 'bloco' in df else [None]
    vetores = {}
    for _, cel in df[fatores].drop_duplicates().sort_values(fatores).iterrows():
        nome = ' × '.join(str(cel[f]) for f in fatores)
        grid = pd.DataFrame([{**cel.to_dict(), **({'bloco': b} if b is not None else {})} for b in blocos])
        vetores[nome] = np.asarray(patsy.build_design_matrices([modelo.model.data.design_info], grid)[0]).mean(axis=0)
    return vetores, beta, cov


def _sem_testemunha(testemunha, motivo):
    return {'testemunha': str(testemunha), 'tratamentos': {}, 'motivo': motivo}


def efeito_testemunha_anova(a, cmp, testemunha):
    """Em "todos entre si": quanto cada tratamento difere da testemunha, em %.

    O IC de Fieller usa o MESMO valor crítico da família que a tela mostra —
    q/√2 de Tukey no balanceado —, e por isso o % exclui zero exatamente quando
    o IC de Tukey da diferença exclui zero: o número e as letras contam a mesma
    história. No desbalanceado as letras vêm de Holm, que não tem intervalo; o
    valor crítico é o de Bonferroni sobre todos os pares, o limite conservador
    de Holm (o % que exclui zero sempre tem letra diferente da testemunha)."""
    vet, beta, cov = _vetores_modelo(a)
    testemunha = str(testemunha)
    if testemunha not in vet:
        return _sem_testemunha(testemunha, 'A testemunha indicada não está entre os tratamentos analisados.')
    k, gl, alfa = len(vet), float(a['_modelo'].df_resid), float(cmp['alfa'])
    if cmp.get('balanceado'):
        crit = float(stats.studentized_range.ppf(1-alfa, k, gl)/np.sqrt(2))
        metodo = 'IC de Fieller no valor crítico de Tukey'
    else:
        crit = float(stats.t.ppf(1-alfa/(k*(k-1)), gl))
        metodo = 'IC de Fieller com Bonferroni sobre todos os pares'
    vc = vet[testemunha]; mc = float(vc@beta); vb = float(vc@cov@vc)
    return {'testemunha': testemunha, 'metodo': metodo, 'nivel': 1-alfa, 'motivo': None,
            'tratamentos': {n: efeito.relativo(float(vt@beta), mc, float(vt@cov@vt), vb, float(vt@cov@vc), crit)
                            for n, vt in vet.items() if n != testemunha}}


def efeito_testemunha_glm(a, testemunha):
    """GLM em "todos entre si": razão de taxas contra a testemunha (contagem,
    ligação log), IC de Bonferroni sobre todos os pares — a família das letras
    de Holm. Em x de n a razão seria de chances, não % da testemunha."""
    testemunha = str(testemunha)
    if testemunha not in (a.get('ordem') or []):
        return _sem_testemunha(testemunha, 'A testemunha indicada não está entre os tratamentos analisados.')
    if 'medias_estimadas' not in a:
        return _sem_testemunha(testemunha, 'Em x de n, a diferença na escala logit é razão de chances, não % da '
                                           'testemunha; compare as proporções estimadas.')
    comps = a.get('comparacoes') or []
    z = float(stats.norm.ppf(1-float(a['alfa'])/(2*max(1, len(comps)))))
    out = {}
    for c in comps:
        if testemunha not in (c['g1'], c['g2']) or c.get('ep_link') is None: continue
        outro = c['g2'] if c['g1'] == testemunha else c['g1']
        d = float(-c['dif_link'] if c['g1'] == testemunha else c['dif_link'])
        se = float(c['ep_link'])
        if not (np.isfinite(d) and np.isfinite(se) and se > 0): continue
        out[outro] = {'relativo_pct': 100*(np.exp(d)-1), 'relativo_ic_inf': 100*(np.exp(d-z*se)-1),
                      'relativo_ic_sup': 100*(np.exp(d+z*se)-1), 'relativo_motivo': None}
    return {'testemunha': testemunha, 'metodo': 'razão de taxas do GLM (ligação log), IC de Bonferroni sobre todos os pares',
            'nivel': 1-float(a['alfa']), 'motivo': None, 'tratamentos': out}


def dunnett_modelo(a, controle, alfa=.05):
    modelo = a['_modelo']
    vetores, beta, cov = _vetores_modelo(a)
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
    vc=vetores[controle];mc=float(vc@beta);vb=float(vc@cov@vc)
    for n,d,s,p in zip(nomes,dif,se,pvals):
        vt=vetores[n]
        c={'g1':controle,'g2':n,'diferenca':float(d),'ep_diferenca':float(s),
           'p':float(p),'ic_inf':float(d-crit*s),'ic_sup':float(d+crit*s),
           'significativo':bool(p<alfa)}
        # Quanto, em % da testemunha, no mesmo nível simultâneo do IC da diferença.
        c.update(efeito.relativo(float(vt@beta),mc,float(vt@cov@vt),vb,float(vt@cov@vc),float(crit)))
        comps.append(c)
    ordem=[controle]+nomes
    return {'metodo':'Dunnett — controle e erro do modelo','controle':controle,'contra_controle':True,
            'alfa':alfa,'df_erro':gl,'medias':{n:float(vetores[n]@beta) for n in ordem},
            'erros_padrao':{n:float(np.sqrt(max(0,vetores[n]@cov@vetores[n]))) for n in ordem},
            'ajustadas':True,'ordem':ordem,'letras':{},'comparacoes':comps,
            'nota':'ICs simultâneos para os contrastes com o controle; não testa os demais tratamentos entre si.'}
