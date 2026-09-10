"""Modelos gaussianos REML: blocos, locais e medidas repetidas por parcela.

Inferência: aproximação de Satterthwaite pela informação esperada REML.
Não usa o número de linhas como número de repetições independentes.
"""
import warnings
from datetime import datetime
import numpy as np
import pandas as pd
import patsy
import statsmodels.formula.api as smf
from scipy import stats
from .posthoc import _ajuste_p, compact_letters
from . import diagnostics as diag


def _ordem_tempo(v):
    for f in ('%Y-%m-%d','%d/%m/%Y'):
        try: return (0,datetime.strptime(v,f).timestamp()/86400)
        except ValueError: pass
    try: return (0,float(v.replace(',','.')))
    except ValueError: return (1,v)


class Inferencia:
    """Covariância GLS e método delta para a variância de cada contraste."""
    def __init__(self, X, componentes, variancias):
        V=sum(v*A for v,A in zip(variancias,componentes))
        W=np.linalg.inv(V)
        self.W=W
        self.C=np.linalg.inv(X.T@W@X)
        B=W@X@self.C
        P=W-B@X.T@W
        PA=[P@A for A in componentes]
        info=np.array([[.5*np.einsum('ij,ji',a,b) for b in PA] for a in PA])
        if np.linalg.matrix_rank(info) != len(componentes):
            raise ValueError('Componentes de variância confundidos; simplifique o delineamento.')
        self.cov_theta=np.linalg.inv(info)
        self.derivadas=[B.T@A@B for A in componentes]

    def gl(self,c):
        v=float(c@self.C@c)
        g=np.array([c@D@c for D in self.derivadas])
        den=float(g@self.cov_theta@g)
        if v<=0 or den<=0:
            raise ValueError('Não foi possível estimar os graus de liberdade do contraste.')
        return float(2*v*v/den)

    def teste(self,L,beta,nome):
        L=np.atleast_2d(L)
        S=L@self.C@L.T
        vals,vec=np.linalg.eigh(S)
        keep=vals>max(vals.max(),1e-30)*1e-9
        if not keep.any():
            return {'efeito':nome,'p':None,'motivo':'Contraste não estimável.'}
        Q=vec[:,keep].T@L
        graus=np.array([self.gl(c) for c in Q])
        q=len(graus)
        if np.any(graus<=2):
            return {'efeito':nome,'p':None,'gl_num':q,'motivo':'Poucos graus de liberdade para a aproximação F.'}
        E=np.sum(graus/(graus-2))
        gl_den=float(2*E/(E-q))
        F=float(np.sum((Q@beta)**2/vals[keep])/q)
        return {'efeito':nome,'F':F,'gl_num':q,'gl_den':gl_den,'p':float(stats.f.sf(F,q,gl_den))}


def _dados(dados,papeis,repetidas):
    fatores=papeis.get('fatores') or []
    if len(fatores)!=1:
        raise ValueError('O modelo misto exige uma coluna de tratamento; combine fatores planejados numa coluna quando necessário.')
    mapping={'y':papeis['resposta'],'trat':fatores[0]}
    for k in ('bloco','local','unidade','tempo'):
        if papeis.get(k): mapping[k]=papeis[k]
    if repetidas and not all(k in mapping for k in ('unidade','tempo')):
        raise ValueError('Medidas repetidas exigem a identificação da parcela/unidade e da data/tempo.')
    df=pd.DataFrame({k:dados[v] for k,v in mapping.items()})
    ausente=df['y'].map(lambda v:pd.isna(v) or not str(v).strip())
    df['y']=pd.to_numeric(df['y'].map(lambda x:str(x).replace(',','.')),errors='coerce')
    if (df['y'].isna() & ~ausente).any(): raise ValueError('Há texto inválido na resposta. Corrija a entrada; somente valores ausentes podem ser excluídos.')
    faltantes=int(df['y'].isna().sum())
    df=df.dropna(subset=['y']).copy()
    if not np.all(np.isfinite(df['y'])): raise ValueError('Há resposta infinita.')
    if len(df)>600: raise ValueError('Este ajuste no aparelho admite até 600 observações por variável. Separe análises coerentes ou use o arquivo exportado no R.')
    for k in mapping:
        if k=='y': continue
        if df[k].isna().any() or df[k].map(lambda v:not str(v).strip()).any():
            raise ValueError('Complete a identificação de '+k+' nas linhas observadas.')
        df[k]=df[k].astype(str)
    if df['trat'].nunique()<2: raise ValueError('São necessários pelo menos dois tratamentos.')
    if 'local' in df and df['local'].nunique()==1: df=df.drop(columns='local')
    if 'bloco' in df:
        df['_bloco']=df.apply(lambda r:repr((r.get('local',''),r['bloco'])),axis=1)
    if repetidas:
        df['_unidade']=df.apply(lambda r:repr((r.get('local',''),r.get('bloco',''),r['unidade'])),axis=1)
        if df.groupby('_unidade')['trat'].nunique().max()>1:
            raise ValueError('Uma unidade aparece em tratamentos diferentes. Use uma identificação única de parcela.')
        if df.duplicated(['_unidade','tempo']).any():
            raise ValueError('Há mais de uma resposta na mesma unidade e data. Resolva duplicatas ou agregue subamostras antes da análise.')
        if df['tempo'].nunique()<2 or df.groupby('_unidade').size().max()<2:
            raise ValueError('Não há pelo menos duas datas medidas na mesma unidade.')
        unidades=df.drop_duplicates('_unidade').groupby('trat').size()
        if unidades.min()<2: raise ValueError('Cada tratamento precisa de ao menos duas unidades independentes; datas não são repetições.')
        if df.groupby(['trat','tempo']).size().min()<2:
            raise ValueError('Há tratamento/data com menos de duas unidades observadas.')
    return df.reset_index(drop=True),faltantes


def analisar_misto(dados,papeis,opcoes):
    repetidas=opcoes.get('modelo')=='repetidas'
    alfa=float(opcoes.get('alfa',.05))
    df,faltantes=_dados(dados,papeis,repetidas)
    avisos=[]
    vc={}
    formula='y ~ C(trat)'
    if repetidas:
        formula='y ~ C(trat)*C(tempo)'
        vc['parcela']='0 + C(_unidade)'
        if 'local' in df: formula+=' + C(local)'
    elif 'local' in df:
        if 'bloco' not in df: raise ValueError('Para locais aleatórios, identifique também os blocos dentro de cada local.')
        df['_trat_local']=df.apply(lambda r:repr((r['local'],r['trat'])),axis=1)
        vc.update(local='0 + C(local)',tratamento_local='0 + C(_trat_local)')
        if df.groupby(['local','trat'])['_bloco'].nunique().min()<2:
            raise ValueError('Cada tratamento precisa de pelo menos dois blocos por local para estimar tratamento × local.')
    if '_bloco' in df: vc['bloco']='0 + C(_bloco)'
    if not vc: raise ValueError('Selecione a coluna de bloco ou local para o modelo misto.')
    for name,col in [('bloco','_bloco'),('local','local'),('parcela','_unidade')]:
        if name in vc:
            n=df[col].nunique()
            if n<3: raise ValueError('O efeito aleatório '+name+' precisa de pelo menos três níveis neste ajuste.')
            if n<6: avisos.append('Apenas '+str(n)+' níveis de '+name+': componentes de variância e inferência exigem cautela.')
    if not repetidas and 'bloco' in df and df.duplicated(['_bloco','trat']).any():
        raise ValueError('Há mais de uma linha por tratamento/bloco. Identifique medidas repetidas ou agregue subamostras.')
    X=np.asarray(patsy.dmatrix(formula.split('~')[1],df))
    if np.linalg.matrix_rank(X)<X.shape[1] or len(df)<=X.shape[1]:
        raise ValueError('Efeitos confundidos ou combinações sem dados suficientes para ajustar o modelo.')
    df['_grupo']=1
    with warnings.catch_warnings(record=True) as ws:
        warnings.simplefilter('always')
        modelo=smf.mixedlm(formula,df,groups='_grupo',re_formula='0',vc_formula=vc)
        fit=modelo.fit(reml=True,method=['lbfgs','bfgs'],maxiter=500,disp=False)
    if not fit.converged: raise ValueError('O modelo misto não convergiu. Revise a estrutura e os dados; nenhum teste foi liberado.')
    escala=float(fit.scale)
    if escala<=max(float(df.y.var()),1e-30)*1e-12: raise ValueError('Sem variância residual estimável para o modelo misto.')
    nomes_vc=modelo.exog_vc.names
    variancias=[escala]+list(np.asarray(fit.vcomp,float))
    componentes=[np.eye(len(df))]+[np.asarray(m[0])@np.asarray(m[0]).T for m in modelo.exog_vc.mats]
    inf=Inferencia(np.asarray(modelo.exog),componentes,variancias)
    beta=np.asarray(fit.fe_params)
    limite=any(v<=max(variancias)*1e-7 for v in variancias[1:])
    if limite: avisos.append('Componente aleatório próximo de zero. São mostradas estimativas; testes e intervalos ficam suspensos até revisar a estrutura.')
    if any('positive definite' in str(w.message) for w in ws):
        limite=True
        avisos.append('Curvatura do ajuste insuficiente: inferência suspensa.')
    if faltantes: avisos.append(str(faltantes)+' respostas ausentes foram excluídas; nenhuma foi imputada.')
    niveis=sorted(df.trat.unique())
    tempos=sorted(df.tempo.unique(),key=_ordem_tempo) if repetidas else [None]
    locais=sorted(df.local.unique()) if repetidas and 'local' in df else [None]
    def vetor(t,tempo=None):
        grid=pd.DataFrame([{'trat':t,**({'tempo':d} if d is not None else {}),**({'local':l} if l is not None else {})}
                           for d in ([tempo] if tempo is not None else tempos) for l in locais])
        return np.asarray(patsy.build_design_matrices([modelo.data.design_info],grid)[0]).mean(axis=0)
    vet={t:vetor(t) for t in niveis}
    medias={t:float(v@beta) for t,v in vet.items()}
    ep={t:float(np.sqrt(v@inf.C@v)) for t,v in vet.items()}
    controle=opcoes.get('controle') if opcoes.get('comparacao')=='controle' else None
    if opcoes.get('comparacao')=='controle' and str(controle) not in niveis:
        raise ValueError('Selecione um controle observado; o primeiro tratamento não é assumido como testemunha.')
    pares=[(str(controle),t) for t in niveis if t!=str(controle)] if controle is not None else [(a,b) for i,a in enumerate(niveis) for b in niveis[i+1:]]
    comps=[]
    for a,b in pares:
        c=vet[b]-vet[a];dif=float(c@beta);se=float(np.sqrt(c@inf.C@c));gl=inf.gl(c)
        p=float(2*stats.t.sf(abs(dif/se),gl)) if not limite else None
        crit=float(stats.t.ppf(1-alfa/(2*len(pares)),gl)) if not limite else None
        comps.append({'g1':a,'g2':b,'diferenca':dif,'ep_diferenca':se,'gl':gl,'p_bruto':p,
                      'ic_inf':dif-crit*se if crit is not None else None,'ic_sup':dif+crit*se if crit is not None else None})
    difere=set()
    ajustados=_ajuste_p([c['p_bruto'] for c in comps],'holm') if not limite else [None]*len(comps)
    for c,p in zip(comps,ajustados):
        c['p']=float(p) if p is not None else None;c['significativo']=bool(p<alfa) if p is not None else None
        if c['significativo']: difere.add(frozenset((c['g1'],c['g2'])))
    ordem=sorted(medias,key=medias.get,reverse=bool(opcoes.get('maior_melhor',True)))
    letras={} if limite or controle is not None else compact_letters(ordem,difere)
    cmp={'metodo':'Contrastes t — Satterthwaite / Holm','alfa':alfa,'ajustadas':True,'medias':medias,
         'erros_padrao':ep,'ordem':ordem,'letras':letras,'comparacoes':comps,'contra_controle':controle is not None,
         'controle':controle,'ic_metodo':'Bonferroni','nota':'p ajustados por Holm; ICs simultâneos por Bonferroni. Médias com pesos iguais por data/local, quando presentes.'}
    efeitos=[]
    if not limite:
        efeitos.append(inf.teste(np.array([vet[t]-vet[niveis[0]] for t in niveis[1:]]),beta,'Tratamentos (média nas datas)' if repetidas else 'Tratamentos'))
        if repetidas:
            vt={d:np.mean([vetor(t,d) for t in niveis],axis=0) for d in tempos}
            efeitos.append(inf.teste(np.array([vt[d]-vt[tempos[0]] for d in tempos[1:]]),beta,'Tempo (média dos tratamentos)'))
            L=[vetor(t,d)-vetor(t,tempos[0])-vetor(niveis[0],d)+vetor(niveis[0],tempos[0]) for t in niveis[1:] for d in tempos[1:]]
            efeitos.append(inf.teste(L,beta,'Tratamento × tempo'))
    serie=[{'tratamento':t,'tempo':d,'media':float(vetor(t,d)@beta),'ep':float(np.sqrt(vetor(t,d)@inf.C@vetor(t,d)))} for t in niveis for d in tempos] if repetidas else []
    if repetidas:
        avisos.append('Correlação por intercepto aleatório da parcela (simetria composta). Não estima AR(1) nem usa as datas como repetições.')
        if any(e.get('efeito')=='Tratamento × tempo' and e.get('p',1) is not None and e['p']<alfa for e in efeitos):
            avisos.append('Há interação tratamento × tempo: a média entre datas não descreve sozinha a resposta; examine as trajetórias.')
    desc=[{'tratamento':t,'n':int(len(g)),'media':float(g.y.mean()),'dp':float(g.y.std()),'ep':None} for t,g in df.groupby('trat')]
    return {'ok':True,'decisao':'Modelo gaussiano misto por REML, com unidades e efeitos aleatórios declarados.',
            'deteccao':{'tipo_resposta':papeis.get('tipo_resposta','continua'),'desenho':{'tem_bloco':'bloco' in df}},
            'avisos':avisos,'descritiva':desc,'comparacao_medias':{'misto':cmp},
            'analise':{'tipo_analise':'Medidas repetidas — modelo misto' if repetidas else 'Modelo misto',
                       'modelo_misto':True,'formula':formula,'reml':True,'convergiu':True,'inferencias':not limite,
                       'estrutura_aleatoria':vc,'componentes_variancia':dict(zip(['residual']+nomes_vc,map(float,variancias))),
                       'n_observacoes':len(df),'n_unidades':int(df['_unidade'].nunique()) if repetidas else len(df),
                       'testes_efeitos':efeitos,'serie':serie,'normalidade':diag.normalidade(escala*inf.W@(np.asarray(df.y)-np.asarray(modelo.exog)@beta)),
                       'inferencia':'Satterthwaite aproximado com informação esperada REML; sem correção Kenward–Roger.'}}
