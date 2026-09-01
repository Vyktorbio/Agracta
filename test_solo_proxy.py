# -*- coding: utf-8 -*-
"""Consulta pedológica no proxy: cascata de escala, percentual por unidade e recusa
   honesta quando não há cobertura.

   O que estes testes protegem:
     - a escala reportada tem de ser a da camada que REALMENTE respondeu. Cair para o
       mapa nacional (1:5.000.000) e continuar dizendo 1:250.000 seria dar ar de
       levantamento de talhão a um dado regional;
     - o bbox do WFS é lon,lat (WFS 1.0.0). Trocar a ordem faz a consulta acertar um
       lugar errado em silêncio — o pior tipo de bug para um dado de campo;
     - quadra sobre duas unidades tem de devolver as duas, com percentual;
     - sem cobertura devolve semCobertura, nunca uma classe inventada.

   Rodar: python3 test_solo_proxy.py"""
import sys, os, importlib.util
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('proxy', os.path.join(HERE, 'ndvi-proxy.py'))
m = importlib.util.module_from_spec(spec)
sys.modules['proxy'] = m
spec.loader.exec_module(m)

falhas = [0]; passes = [0]
def eq(a, b, nome):
    if a == b: passes[0] += 1; print('  ok    ' + nome)
    else: falhas[0] += 1; print('  FALHA ' + nome + '  (obtido %r, esperado %r)' % (a, b))
def check(c, nome): eq(bool(c), True, nome)

def poly(w, s, e, n):
    return {'type': 'Polygon', 'coordinates': [[[w, s], [w, n], [e, n], [e, s], [w, s]]]}

CAMADA_PR = 'geonode:parana_solos_20201105'
CAMADA_BR = 'geonode:brasil_solos_5m_20201104'

print('\nRay casting (quem cai em qual unidade)')
sq = [[(0, 0), (0, 1), (1, 1), (1, 0), (0, 0)]]
check(m._solo_contem(sq, 0.5, 0.5), 'ponto interno é reconhecido')
check(not m._solo_contem(sq, 1.5, 0.5), 'ponto externo é recusado')
donut = [[(0, 0), (0, 10), (10, 10), (10, 0), (0, 0)], [(4, 4), (4, 6), (6, 6), (6, 4), (4, 4)]]
check(not m._solo_contem(donut, 5, 5), 'buraco do polígono não conta como dentro')
check(m._solo_contem(donut, 1, 1), 'anel externo continua contando')
eq(m._solo_aneis({'type': 'Point', 'coordinates': [0, 0]}), [], 'geometria não-poligonal não quebra')
check(m._solo_contem(m._solo_aneis(
    {'type': 'MultiPolygon', 'coordinates': [[[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]]]}), 0.5, 0.5),
    'MultiPolygon é aceito')

print('\nOrdem do SiBCS extraída do nome da unidade')
eq(m._solo_ordem_de('LATOSSOLO VERMELHO Eutroferrico'), 'Latossolo', 'reconhece Latossolo')
eq(m._solo_ordem_de('ARGISSOLO VERMELHO-AMARELO Distrofico'), 'Argissolo', 'reconhece Argissolo')
eq(m._solo_ordem_de('Corpo d agua'), None, 'o que não é solo não vira ordem inventada')

print('\nNome da classe em schemas diferentes')
eq(m._solo_classe_de({'legenda': 'NITOSSOLO VERMELHO'}), 'NITOSSOLO VERMELHO', 'campo conhecido')
eq(m._solo_classe_de({'zz9': 'GLEISSOLO HAPLICO Ta'}), 'GLEISSOLO HAPLICO Ta',
   'campo desconhecido: acha pelo nome da ordem')
eq(m._solo_classe_de({}), None, 'registro vazio não inventa nome')

print('\nbbox do WFS sai em lon,lat (WFS 1.0.0)')
vistos = []
m._solo_wfs = lambda c, b: vistos.append((c['typeName'], b)) or []
m._solo_cache.clear()
m.do_solo(lat=-23.45, lng=-50.50)
bb = vistos[0][1]
check(-51.0 < bb[0] < -50.0, 'primeiro valor do bbox é a longitude')
check(-24.0 < bb[1] < -23.0, 'segundo valor do bbox é a latitude')

print('\nCascata escolhe a melhor escala disponível')
UNI_PR = [{'properties': {'legenda': 'LATOSSOLO VERMELHO Eutroferrico', 'sigla': 'LVef'},
           'geometry': poly(-51, -24, -50.05, -22)},
          {'properties': {'legenda': 'ARGISSOLO VERMELHO-AMARELO', 'sigla': 'PVA'},
           'geometry': poly(-50.05, -24, -49, -22)}]
UNI_BR = [{'properties': {'legenda': 'LATOSSOLO AMARELO Distrofico'},
           'geometry': poly(-75, -34, -34, 6)}]

m._solo_wfs = lambda c, b: UNI_PR if c['typeName'] == CAMADA_PR else []
m._solo_cache.clear()
r = m.do_solo(lat=-23.45, lng=-50.50)
eq(r['camada'], CAMADA_PR, 'usa o levantamento estadual quando ele cobre o ponto')
eq(r['escala'], '1:250.000', 'e reporta 1:250.000')
eq(r['ordem'], 'Latossolo', 'deriva a ordem da classe')

m._solo_wfs = lambda c, b: UNI_BR if c['typeName'] == CAMADA_BR else []
m._solo_cache.clear()
r = m.do_solo(lat=-23.45, lng=-50.50)
eq(r['camada'], CAMADA_BR, 'estadual fora do ar: cai para a camada nacional')
eq(r['escala'], '1:5.000.000', 'e reporta a escala REAL, não a que gostaríamos')
eq(r['escalaN'], 5000000, 'escalaN permite ao app avisar que o dado é grosseiro')

tentadas = []
def espiao(c, b):
    tentadas.append(c['typeName'])
    return UNI_BR if c['typeName'] == CAMADA_BR else []
m._solo_wfs = espiao; m._solo_cache.clear()
m.do_solo(lat=-5.2, lng=-39.0)
check(CAMADA_PR not in tentadas, 'ponto no Ceará nem tenta a camada do Paraná')

print('\nPercentual por unidade sob a quadra')
m._solo_wfs = lambda c, b: UNI_PR if c['typeName'] == CAMADA_PR else []
m._solo_cache.clear()
r = m.do_solo(geometry=poly(-50.2, -23.5, -50.0, -23.4))   # divisa em -50.05 => 75/25
pct = [u['pct'] for u in r['unidades']]
eq(len(r['unidades']), 2, 'devolve as duas unidades interceptadas')
eq(sum(pct), 100, 'os percentuais somam 100')
eq(pct, sorted(pct, reverse=True), 'a dominante vem primeiro')
check(70 <= pct[0] <= 80, 'proporção bate com a geometria (~75/25)')
eq(r['classe'], 'LATOSSOLO VERMELHO Eutroferrico', 'a classe principal é a dominante')
check(r.get('metodo', '').startswith('amostragem'), 'o método de estimativa fica registrado')

m._solo_cache.clear()
r1 = m.do_solo(geometry=poly(-50.9, -23.5, -50.8, -23.4))  # só dentro do LVef
eq(len(r1['unidades']), 1, 'quadra inteira numa unidade devolve só ela')
eq(r1['unidades'][0]['pct'], 100, 'com 100%')

print('\nSem cobertura e entradas inválidas')
m._solo_wfs = lambda c, b: []
m._solo_cache.clear()
z = m.do_solo(lat=-23.45, lng=-50.50)
check(z.get('semCobertura'), 'sem feature nenhuma: semCobertura')
check('classe' not in z or z.get('classe') is None, 'e nenhuma classe inventada')
check('consultadoEm' in z, 'ainda assim carimba quando foi consultado')

for entrada, nome in (({'type': 'Point', 'coordinates': [0, 0]}, 'geometria não-poligonal'),):
    m._solo_cache.clear()
    try:
        m.do_solo(geometry=entrada); falhas[0] += 1; print('  FALHA ' + nome + ' deveria recusar')
    except RuntimeError as e:
        eq(str(e).startswith('SOLO:'), True, nome + ' vira erro com sentinela SOLO:')
m._solo_cache.clear()
try:
    m.do_solo(); falhas[0] += 1; print('  FALHA sem lat/lng nem geom deveria recusar')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'sem lat/lng nem geom vira erro legível')

print('\nCache evita repetir a consulta')
n = [0]
def conta(c, b):
    n[0] += 1
    return UNI_BR if c['typeName'] == CAMADA_BR else []
m._solo_wfs = conta; m._solo_cache.clear()
m.do_solo(lat=-15.0, lng=-47.0); primeira = n[0]
m.do_solo(lat=-15.0, lng=-47.0)
check(primeira > 0 and n[0] == primeira, 'segunda consulta no mesmo ponto não vai à rede')

print('\nCamada fora do ar não derruba a consulta')
# O _solo_wfs real engole a exceção de rede e devolve []; aqui garantimos que a
# cascata segue adiante em vez de desistir na primeira camada muda.
m._solo_wfs = lambda c, b: [] if c['typeName'] == CAMADA_PR else (UNI_BR if c['typeName'] == CAMADA_BR else [])
m._solo_cache.clear()
r = m.do_solo(lat=-23.45, lng=-50.50)
eq(r['camada'], CAMADA_BR, 'camada vazia é pulada e a cascata continua')

print('\n%s' % ('%d verificações, nenhuma falha.' % passes[0] if falhas[0] == 0
      else '%d FALHA(S) em %d verificações.' % (falhas[0], passes[0] + falhas[0])))
sys.exit(0 if falhas[0] == 0 else 1)
