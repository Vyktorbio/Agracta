# -*- coding: utf-8 -*-
"""A amostra certa para a hora pedida — o coração do carimbo BPL.
   Rodar: python3 test_clima_hora.py"""
import sys, time, importlib.util, io, os
HERE=os.path.dirname(os.path.abspath(__file__))
spec=importlib.util.spec_from_file_location('proxy', os.path.join(HERE,'ndvi-proxy.py'))
m=importlib.util.module_from_spec(spec)
sys.modules['proxy']=m
spec.loader.exec_module(m)

falhas=[0]; passes=[0]
def eq(a,b,nome):
    ok=(a==b)
    if ok: passes[0]+=1; print('  ok    '+nome)
    else:  falhas[0]+=1; print('  FALHA '+nome+'  (obtido %r, esperado %r)'%(a,b))
def check(c,nome): eq(bool(c),True,nome)

def ep(hhmm, dia='2026-08-10'):
    return int(time.mktime(time.strptime(dia+' '+hhmm, '%Y-%m-%d %H:%M')))

print('\n_hist_serie preserva o instante')
node={'list':{str(ep('09:00')):'21.5', str(ep('09:30')):'23.1', str(ep('10:00')):'25.9'}}
serie=m._hist_serie(node)
eq(len(serie),3,'lê as três amostras')
eq([v for _,v in serie],[21.5,23.1,25.9],'na ordem cronológica')
eq(m._hist_serie(None),[],'nó ausente não quebra')
eq(m._hist_serie({'list':{'abc':'x'}}),[],'lixo é descartado, não explode')

print('\nEscolhe a amostra mais próxima da hora pedida')
v,e,d = m._hist_perto(serie, ep('09:31'))
eq(v,23.1,'9:31 pega a leitura das 9:30, não a média do dia')
eq(d,60,'e registra a defasagem de 60 s')
v2,_,_ = m._hist_perto(serie, ep('09:59'))
eq(v2,25.9,'9:59 já pertence às 10:00')
v3,_,_ = m._hist_perto(serie, ep('09:00'))
eq(v3,21.5,'hora exata devolve a própria amostra')

print('\nFora da tolerância NÃO inventa valor')
v4,e4,d4 = m._hist_perto(serie, ep('14:00'))
eq(v4,None,'14:00 sem amostra por perto: devolve nada')
check(d4>1800,'e informa que a mais próxima estava longe demais')
v5,_,_ = m._hist_perto(serie, ep('09:31'), tolerancia_s=10)
eq(v5,None,'tolerância apertada também recusa')
eq(m._hist_perto([], ep('09:31'))[0],None,'série vazia não quebra')
eq(m._hist_perto(serie, None)[0],None,'sem hora alvo não quebra')

print('\nA média do dia continua sendo a média do dia')
eq(round(sum(v for _,v in serie)/3,2), 23.5, 'média das três = 23,5 — diferente da leitura das 9:30')

print('\n%s' % ('%d verificações, nenhuma falha.'%passes[0] if falhas[0]==0
       else '%d FALHA(S) em %d verificações.'%(falhas[0],passes[0]+falhas[0])))
sys.exit(0 if falhas[0]==0 else 1)
