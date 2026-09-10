import numpy as np
from scipy import stats
from bioengine import analisar
from bioengine.anova import anova
from bioengine.contrastes import dunnett_modelo

# Oráculo independente: Dunnett público do SciPy para o caso de uma via.
grupos=[np.array([9,11,8,12,10,11,7,13]),np.array([12,14,11,15,13,14,10,16]),np.array([10,14,12,16,13,15,11,17])]
nomes=['C','T1','T2']
y=np.concatenate(grupos);tr=np.repeat(nomes,8)
d=dunnett_modelo(anova(y,[tr],transformar_auto=False),'C')
ref=stats.dunnett(*grupos[1:],control=grupos[0],random_state=42019)
assert np.allclose([c['p'] for c in d['comparacoes']],ref.pvalue,atol=.0005)
ic=ref.confidence_interval()
assert np.allclose([c['ic_inf'] for c in d['comparacoes']],ic.low,atol=.006)
assert d['letras']=={} and len(d['comparacoes'])==2

# DBC: contraste de Dunnett deve cancelar o efeito de bloco.
e=np.array([[-1,1,-1,1],[1,-1,2,-2],[0,0,-1,1]])
y=(np.array([10,14,18])[:,None]+np.array([100,200,300,400])+e).ravel()
tr=np.repeat(['C','T1','T2'],4);bl=np.tile(['B1','B2','B3','B4'],3)
d=dunnett_modelo(anova(y,[tr],bl,transformar_auto=False),'C')
d2=dunnett_modelo(anova(y+np.tile([200,-100,60,15],3),[tr],bl,transformar_auto=False),'C')
assert np.allclose([c['p'] for c in d['comparacoes']],[c['p'] for c in d2['comparacoes']],atol=1e-7)
pap={'resposta':'y','fatores':['trat'],'bloco':'bloco','tipo_resposta':'continua'}
dados={'y':y.tolist(),'trat':tr.tolist(),'bloco':bl.tolist()}
rel=analisar(dados,pap,{'comparacao':'controle','controle':'C','transformar_auto':False})
assert rel['ok'] and list(rel['comparacao_medias'])==['controle']
assert not analisar(dados,pap,{'comparacao':'controle'})['ok']

# REML equilibrado: os contrastes de tratamentos coincidem com o oráculo DBC.
r=analisar(dados,pap,{'modelo':'misto'})
assert r['ok'],r
assert r['analise']['inferencias'],r
c=r['comparacao_medias']['misto']['comparacoes'][0]
assert abs(c['diferenca']-4)<1e-6
assert abs(c['ep_diferenca']-np.sqrt(4/3))<.002,c
assert abs(c['gl']-6)<.02,c

# Repetidas balanceadas: 12 parcelas, 36 observações; erro entre parcelas gl=6.
# Resíduo temporal tem soma zero por parcela e por tratamento/data.
w=np.array([[1,-2,1],[-1,1,0],[1,0,-1],[-1,1,0]])
rows=[]
for t in range(3):
    for b in range(4):
        for dt in range(3):
            valor=20+2*t+[0,3,7][dt]+t*dt+[-8,-2,2,8][b]+e[t,b]+w[b,dt]*.1*(t+1)
            rows.append({'y':valor,'trat':['C','T1','T2'][t],'bloco':str(b),'unidade':str(t)+'-'+str(b),'tempo':str(dt)})
dr={k:[row[k] for row in rows] for k in rows[0]}
pr={**pap,'unidade':'unidade','tempo':'tempo'}
rr=analisar(dr,pr,{'modelo':'repetidas','comparacao':'controle','controle':'C'})
assert rr['ok'],rr
a=rr['analise'];assert a['inferencias'],rr
assert a['n_observacoes']==36 and a['n_unidades']==12
assert abs(a['componentes_variancia']['residual']-1.68/18)<.002,a
c=rr['comparacao_medias']['misto']['comparacoes'][0]
assert abs(c['diferenca']-3)<1e-6
assert abs(c['gl']-6)<.03,c
inter=next(e for e in a['testes_efeitos'] if e['efeito']=='Tratamento × tempo')
assert abs(inter['gl_den']-18)<.08,inter
assert len(a['serie'])==9
duplicado={k:v+[v[0]] for k,v in dr.items()}
assert not analisar(duplicado,pr,{'modelo':'repetidas'})['ok']
assert not analisar(dr,pr,{})['ok'] # não admite ignorar a dependência
confundido={k:list(v) for k,v in dr.items()};confundido['unidade']=['1']*36
assert not analisar(confundido,pr,{'modelo':'repetidas'})['ok']
faltante={k:v[1:] for k,v in dr.items()}
rf=analisar(faltante,pr,{'modelo':'repetidas'})
assert rf['ok'] and rf['analise']['n_unidades']==12 and rf['analise']['n_observacoes']==35,rf
invalido={k:list(v) for k,v in dr.items()};invalido['y'][0]='erro'
assert not analisar(invalido,pr,{'modelo':'repetidas'})['ok']

# Locais e blocos aninhados: tratamento × local participa da incerteza.
rng=np.random.default_rng(197)
site=rng.normal(0,5,4);bt=rng.normal(0,1.5,(4,4));tl=rng.normal(0,3,(4,3))
rows=[{'y':20+3*t+site[s]+bt[s,b]+tl[s,t]+rng.normal(0,.5),'trat':['C','T1','T2'][t],'bloco':str(b),'local':str(s)} for s in range(4) for b in range(4) for t in range(3)]
ds={k:[row[k] for row in rows] for k in rows[0]}
rs=analisar(ds,{**pap,'local':'local'},{'modelo':'misto'})
assert rs['ok'],rs
assert 'tratamento_local' in rs['analise']['componentes_variancia']
assert rs['analise']['n_observacoes']==48
print('OK: Dunnett vs SciPy, REML/Satterthwaite vs DBC, repetidas vs decomposição algébrica, locais e recusas de delineamento')
