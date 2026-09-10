from bioengine import analisar
from bioengine.detect import detectar_resposta
import numpy as np

t=['T1']*4+['T2']*4+['T3']*4
b=['B1','B2','B3','B4']*3
y=[8,9,11,12,12,14,15,17,17,19,22,24]
p={'resposta':'y','fatores':['t'],'bloco':'b','tipo_resposta':'contagem'}
for coluna,valor in [('y','erro'),('b',''),('t',None)]:
    dados={'y':y.copy(),'t':t.copy(),'b':b.copy()};dados[coluna][0]=valor
    r=analisar(dados,p)
    assert r['ok'] is False, (coluna,r)
dados={'y':y+[None]+y,'t':t+['T1']+t}
r=analisar(dados,{'resposta':'y','fatores':['t'],'tipo_resposta':'continua'},{'transformar_auto':False})
assert r['ok'] and any('1 respostas ausentes' in x for x in r['avisos'])
dados['y'][12]='erro'
assert analisar(dados,{'resposta':'y','fatores':['t'],'tipo_resposta':'continua'})['ok'] is False

eventos=[0,1,0,1,0,1,1,1,0,0,0,1]
det=detectar_resposta(eventos,n_total=[30]*12)
assert det['tipo']=='binomial' and len(det['n_total'])==12
rel=analisar({'y':eventos,'n':[30]*12,'t':t},{'resposta':'y','n_total':'n','fatores':['t']})
assert rel['ok'] and rel['deteccao']['tipo_resposta']=='binomial'
for i,nome in enumerate(['T1','T2','T3']):
    esperado=sum(eventos[4*i:4*i+4])/120
    assert abs(rel['analise']['proporcoes_estimadas'][nome]-esperado)<1e-8
assert analisar({'y':eventos,'n':[30]*12,'t':t},{'resposta':'y','n_total':'n','fatores':['t'],'tipo_resposta':'binario'})['ok'] is False
assert detectar_resposta(eventos)['tipo']=='binario'
assert detectar_resposta(['vivo','morto','vivo'])['tipo']=='binario'
porcentagem=analisar({'y':[-1]+y[1:],'t':t},{'resposta':'y','fatores':['t'],'tipo_resposta':'proporcao'})
assert porcentagem['ok'] is False
print('OK: denominador x de n, texto inválido, faltantes declarados e identificadores preservados')
