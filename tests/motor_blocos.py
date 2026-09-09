import numpy as np
from bioengine import analisar
from bioengine.anova import anova
from bioengine.posthoc import comparar_modelo
from bioengine.glmcount import glm_contagem, glm_proporcao

# Oráculo algébrico: os resíduos têm soma zero por linha e por coluna.
# SSE=4+10+2=16; GL=(3-1)*(4-1)=6; QME=8/3; EP(dif)=sqrt(4/3).
erros = np.array([[-1,1,-1,1],[1,-1,2,-2],[0,0,-1,1]])
y = (np.array([10,14,18])[:,None] + np.array([100,200,300,400]) + erros).ravel()
tr = np.repeat(['T1','T2','T3'],4)
bl = np.tile(['B1','B2','B3','B4'],3)
a = anova(y,[tr],bloco=bl,transformar_auto=False)
r = comparar_modelo(a,maior_melhor=False)
assert abs(a['mse']-8/3)<1e-9
assert a['df_erro']==6
assert abs(r['comparacoes'][0]['diferenca']-4)<1e-9
assert abs(r['comparacoes'][0]['ep_diferenca']-np.sqrt(4/3))<1e-9
assert r['comparacoes'][0]['p']<.05
assert r['letras']['T1']=='a'

# Efeito de bloco não pode mudar contrastes de tratamento (inclusive com falta).
keep=np.ones(12,dtype=bool);keep[0]=False
y2=y+np.tile([350,-210,70,20],3)
ra=comparar_modelo(anova(y[keep],[tr[keep]],bl[keep],transformar_auto=False))
rb=comparar_modelo(anova(y2[keep],[tr[keep]],bl[keep],transformar_auto=False))
assert not ra['balanceado'] and 'Holm' in ra['metodo']
for da,db in zip(ra['comparacoes'],rb['comparacoes']):
    assert abs(da['diferenca']-db['diferenca'])<1e-9
    assert abs(da['p']-db['p'])<1e-9
assert all(0<=d['p']<=1 for d in ra['comparacoes'])
faltante=y.astype(float);faltante[0]=np.nan
rel_falta=analisar({'y':faltante.tolist(),'t':tr.tolist(),'b':bl.tolist()}, {'resposta':'y','fatores':['t'],'bloco':'b'}, {'tipo_resposta':'continua','transformar_auto':False})
assert rel_falta['ok'] and 'ajustadas' in rel_falta['comparacao_medias']
tr_incompleto=tr.astype(object);tr_incompleto[0]=None
assert anova(y,[tr_incompleto],bl)['ok'] is False

# Sem resíduo, sem letras/p inventados; confusão tratamento-bloco também recusa.
assert anova([1,2,3,4,5,6], [['A']*3+['B']*3], bloco=['1','2','3']*2)['ok'] is False
assert anova([1,2,3,4,5,7], [['A']*3+['B']*3], bloco=['a']*3+['b']*3)['ok'] is False
fatorial=anova([1,2,3,4], [['a','a','b','b'],['x','y','x','y']])
assert fatorial['ok'] is False

# O fluxo completo usa o mesmo resíduo; contagem declarada não vira contínua.
rel=analisar({'y':y.tolist(),'t':tr.tolist(),'b':bl.tolist()}, {'resposta':'y','fatores':['t'],'bloco':'b'}, {'tipo_resposta':'continua','transformar_auto':False})
assert rel['ok'] and 'tukey' in rel['comparacao_medias']
assert abs(rel['comparacao_medias']['tukey']['mse']-8/3)<1e-9
assert rel['analise']['kruskal'] is None

c=[8,9,11,12, 12,14,15,17, 17,19,22,24]
cont=glm_contagem(c,tr,bloco=bl,maior_melhor=False)
assert 'C(bloco)' in cont['formula'] and cont['ordem'][0]=='T1'
forcado=analisar({'y':c,'t':tr.tolist(),'b':bl.tolist()}, {'resposta':'y','fatores':['t'],'bloco':'b'}, {'tipo_resposta':'contagem','maior_melhor':False})
assert forcado['deteccao']['tipo_resposta']=='contagem'
assert 'C(bloco)' in forcado['analise']['formula']
binom=glm_proporcao(c,[30]*12,tr,bloco=bl,maior_melhor=False)
assert 'C(bloco)' in binom['formula'] and binom['ordem'][0]=='T1'
assert all(0<=v<=1 for v in binom['proporcoes_estimadas'].values())
try:
    glm_proporcao([2,4],[1,3],['A','B'])
    assert False, 'Binomial inválida passou'
except ValueError:
    pass
for invalid in ([-1,2,3,4],[1.5,2,3,4],[np.inf,2,3,4]):
    try:
        glm_contagem(invalid,['A','A','B','B'])
        assert False, 'Contagem inválida passou'
    except ValueError:
        pass
# Dispersão deve ser estimada na rota NB2, não fixada em 1.
rng=np.random.default_rng(43)
nt=np.repeat(['A','B','C'],40);nb=np.tile(np.repeat(['1','2','3','4'],10),3)
mu=np.repeat([10,20,30],40)*np.tile(np.repeat([.8,1,1.1,1.2],10),3)
nb_result=glm_contagem(rng.negative_binomial(2,2/(2+mu)),nt,bloco=nb)
assert nb_result['familia']=='Binomial Negativa'
assert 'alpha estimado=' in nb_result['nota_modelo'] and 'C(bloco)' in nb_result['formula']
print('OK: oráculo DBC, contrastes ajustados, faltantes, casos degenerados, GLM e sentido da resposta')
