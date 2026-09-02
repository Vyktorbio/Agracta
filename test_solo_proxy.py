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
CAMADA_MG = 'geonode:lev_mg_estado_solos_lat_long_wgs84_vt'
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

print('\nSoilGrids: conversao das unidades escalonadas')
# O SoilGrids publica INTEIROS ESCALONADOS. Exibir o numero cru daria "pH 58" num
# solo de pH 5,8 e "580" de argila num solo com 58%. Estes fatores sao a coisa mais
# facil de errar em silencio deste modulo inteiro.
CRU = {'clay': 580, 'sand': 240, 'silt': 180, 'phh2o': 58, 'soc': 280, 'cec': 120, 'bdod': 130}
_sg_valor_real = m._sg_valor
m._sg_valor = lambda prop, prof, lon, lat: CRU.get(prop)
m._solo_props_cache.clear()
r = m.do_solo_propriedades(-22.658, -47.521)
P = r['propriedades']
eq(P['clay']['valor'], 58.0, 'argila 580 g/kg -> 58 %')
eq(P['clay']['unidade'], '%', 'e a unidade e %')
eq(P['sand']['valor'], 24.0, 'areia 240 -> 24 %')
eq(P['silt']['valor'], 18.0, 'silte 180 -> 18 %')
eq(P['phh2o']['valor'], 5.8, 'pH 58 -> 5,8 (nao 58)')
eq(P['soc']['valor'], 28.0, 'carbono organico 280 dg/kg -> 28 g/kg')
eq(P['cec']['valor'], 12.0, 'CTC 120 mmolc/kg -> 12 cmolc/kg')
eq(P['cec']['unidade'], 'cmolc/kg', 'CTC sai em cmolc/kg — NAO em mmolc/dm3 do laudo')
eq(P['bdod']['valor'], 1.3, 'densidade 130 cg/cm3 -> 1,3 kg/dm3')
check(abs(P['clay']['valor'] + P['sand']['valor'] + P['silt']['valor'] - 100) < 1,
      'as tres fracoes somam ~100 %')

print('\nMateria organica e derivada, e diz que e')
eq(P['mo']['valor'], round(28.0 * 1.724, 2), 'MO = COS x 1,724 (Van Bemmelen)')
check('derivada' in P['mo'], 'MO vem marcada como derivada, nao medida')

print('\nA estimativa se identifica como estimativa')
check(r['estimativa'] is True, 'campo estimativa=True')
eq(r['fonte'], 'soilgrids', 'fonte registrada')
check('0-30' in r['profundidade'], 'a profundidade da media fica explicita')
eq(r['textura'], 'argilosa', '58 % de argila -> textura argilosa')
eq(P['clay']['perfil']['0-5cm'], 58.0, 'o perfil por camada tambem vem convertido')

print('\nTextura pelas fracoes')
for arg, are, esperado in ((70, 15, 'muito argilosa'), (45, 30, 'argilosa'),
                           (25, 50, 'media'), (8, 80, 'arenosa')):
    m._solo_props_cache.clear()
    C = {'clay': arg*10, 'sand': are*10, 'silt': (100-arg-are)*10}
    m._sg_valor = lambda prop, prof, lon, lat, _C=C: _C.get(prop)
    eq(m.do_solo_propriedades(-22.0, -47.0).get('textura'), esperado,
       '%d%% argila / %d%% areia -> %s' % (arg, are, esperado))

print('\nSem estimativa nao inventa numero')
m._solo_props_cache.clear()
m._sg_valor = lambda *a: None
z = m.do_solo_propriedades(0.0, 0.0)
check(z.get('semCobertura') is True, 'sem valor nenhum: semCobertura')
eq(z['propriedades'], {}, 'e nenhuma propriedade inventada')
check('textura' not in z, 'sem fracoes nao deduz textura')

print('\nCaixa admite, DADO confirma')
# O bug de campo: a caixa declarada de um levantamento estadual e um RETANGULO, e
# estado nao e retangulo. O canto sudoeste da caixa de Minas Gerais cobre
# Iracemapolis, que e Sao Paulo. A cascata parava em MG, o GetMap saia 100%
# transparente, e a camada de solo simplesmente nao aparecia — sem erro na tela.
chamadas = []
_solo_tem_feicao_real = m._solo_tem_feicao
m._solo_tem_feicao = lambda cam, bb: (chamadas.append(cam['typeName']) or
                                      cam['typeName'].startswith('geonode:brasil_solos'))
capt = {}
def _getmap_falso(bbox, width):
    return None
_orig_url = m.urllib.request.urlopen
class _Resp:
    headers = {'Content-Type': 'image/png'}
    def read(self): return b'PNG-falso'
    def __enter__(self): return self
    def __exit__(self, *a): return False
def _urlopen(req, timeout=None):
    capt['url'] = req.full_url if hasattr(req, 'full_url') else str(req)
    return _Resp()
m.urllib.request.urlopen = _urlopen
try:
    img, ct, cam = m.do_solo_mapa([-47.55, -22.60, -47.50, -22.56], 512)
finally:
    m.urllib.request.urlopen = _orig_url
eq(cam, 'geonode:brasil_solos_5m_20201104',
   'Iracemapolis (SP) cai no levantamento NACIONAL, nao no de Minas')
check('geonode:lev_mg_estado_solos_lat_long_wgs84_vt' in chamadas,
      'a caixa de MG admitiu o ponto (e por isso o bug existia)')
check('lev_mg' not in cam, 'mas o dado recusou, e a cascata seguiu')
check('layers=geonode%3Abrasil_solos_5m_20201104' in capt.get('url', ''),
      'e o GetMap foi pedido para a camada certa')
# Restaura a confirmação geométrica real para os testes seguintes.
m._solo_tem_feicao = _solo_tem_feicao_real

print('\nDocumento de ERRO nunca vira medida')
# O bug de campo: a requisicao falhava, o MapServer respondia um
# ServiceExceptionReport, e o padrao "numero depois do =" casava com o version='1.0'
# do cabecalho XML. A FALHA virava a MEDIDA: 1.0 / 10 = argila 0,1%, pH 0,1;
# 1.0 / 100 = densidade 0,01. Impossiveis, com a mesma cara de numeros bons.
erro_xml = ("<?xml version='1.0' encoding=\"UTF-8\" standalone=\"no\" ?>"
            "<ServiceExceptionReport version=\"1.1.1\"><ServiceException "
            "code=\"MissingParameterValue\">Missing required parameter STYLES"
            "</ServiceException></ServiceExceptionReport>")
eq(m._sg_extrai(erro_xml), None, 'ServiceExceptionReport nao rende numero nenhum')
eq(m._sg_extrai("<!DOCTYPE html><html><body></body></html>"), None, 'HTML vazio idem')
eq(m._sg_extrai("GetFeatureInfo results:\n\n  Search returned no results.\n"), None,
   '"no results" idem')
# E o que e dado continua sendo lido.
eq(m._sg_extrai('{"features":[{"properties":{"value_0":"580"}}]}'), 580.0,
   'GeoJSON de verdade continua sendo lido')
eq(m._sg_extrai("Layer 'clay'\n  Feature 0:\n    value_0 = '580'\n"), 580.0,
   'texto do MapServer com valor tambem')

print('\nValor impossivel e RECUSADO, nao exibido')
# Um modelo global erra; ele nao entrega pH 0,1 nem densidade 0,01. Valor fora da
# faixa fisica e falha disfarcada, e apresenta-la e pior que dizer "indisponivel" —
# porque quem le acredita.
m._solo_props_cache.clear()
m._sg_valor = lambda prop, prof, lon, lat: 1.0     # o bug de campo, exatamente
z = m.do_solo_propriedades(-22.0, -47.0)
eq(z['propriedades'], {}, 'nenhuma propriedade impossivel chega a tela')
check(z.get('semCobertura') is True, 'e a resposta se declara sem estimativa')
check('impossíveis' in (z.get('motivo') or ''), 'dizendo que foi RECUSA, nao falta de cobertura')
check('textura' not in z, 'e nenhuma textura e deduzida de valor recusado')

# A recusa e por propriedade: o que for plausivel continua vindo.
m._solo_props_cache.clear()
BOM = {'clay': 580, 'sand': 200, 'silt': 220, 'phh2o': 1, 'bdod': 1}
m._sg_valor = lambda prop, prof, lon, lat: BOM.get(prop)
z2 = m.do_solo_propriedades(-22.0, -47.0)
eq(z2['propriedades']['clay']['valor'], 58.0, 'argila plausivel passa')
check('phh2o' not in z2['propriedades'], 'pH 0,1 e recusado')
check('bdod' not in z2['propriedades'], 'densidade 0,01 tambem')
eq(z2.get('recusadas'), ['Densidade', 'pH (H2O)'], 'e as recusadas vao NOMEADAS')
check(z2.get('semCobertura') is None, 'a resposta nao se declara vazia: houve dado bom')

print('\nLeitura do GetFeatureInfo')
eq(m._sg_extrai('{"features":[{"properties":{"value_0":"580"}}]}'), 580.0, 'GeoJSON do MapServer')
eq(m._sg_extrai('{"features":[{"properties":{"id":7,"pixel_value":417}}]}'), 417.0,
   'pixel_value vence metadado numerico anterior')
eq(m._sg_extrai("Layer 'clay_0-5cm_mean'\n  Feature 0:\n    value_0 = '580'\n"), 580.0,
   'texto do MapServer')
eq(m._sg_extrai('Band 1 value: 580'), 580.0,
   'o "1" de "Band 1" nao pode vencer o valor de verdade')
eq(m._sg_extrai('<?xml version="1.0"?><ServiceExceptionReport><ServiceException>estilo ausente</ServiceException></ServiceExceptionReport>'), None,
   'ServiceException XML nao vira valor 1,0')
eq(m._sg_extrai('{"features":[{"properties":{"v":"-32768"}}]}'), None, 'nodata vira None')
eq(m._sg_extrai(''), None, 'resposta vazia vira None')
eq(m._sg_extrai('sem numero nenhum'), None, 'texto sem numero vira None')

print('\nGetFeatureInfo pede o formato que o SoilGrids realmente suporta')
import urllib.request as _ur_sg
_sg_urls = []
class _SgResp:
    def read(self): return b'{"features":[{"properties":{"pixel_value":417}}]}'
    def __enter__(self): return self
    def __exit__(self, *a): return False
_sg_original = _ur_sg.urlopen
_ur_sg.urlopen = lambda req, timeout=None: (_sg_urls.append(req.full_url) or _SgResp())
try:
    eq(_sg_valor_real('clay', '0-5cm', -47.52, -22.65), 417.0, 'le o pixel GeoJSON')
    check('styles=default' in _sg_urls[0], 'envia o estilo obrigatorio')
    check('info_format=application%2Fgeo%2Bjson' in _sg_urls[0], 'pede application/geo+json')
finally:
    _ur_sg.urlopen = _sg_original

print('\nValores fisicamente inconsistentes ficam indisponiveis')
m._solo_props_cache.clear()
m._sg_valor = lambda prop, prof, lon, lat: 1
ruim = m.do_solo_propriedades(-22.658, -47.521)
check('phh2o' not in ruim['propriedades'], 'pH 0,1 e recusado')
check('bdod' not in ruim['propriedades'], 'densidade 0,01 e recusada')
check(all(k not in ruim['propriedades'] for k in ('clay', 'sand', 'silt')),
      'fracoes que somam 0,3% sao recusadas em conjunto')
check('textura' not in ruim, 'nao classifica textura com fracoes corrompidas')

print('\nPropriedades tambem tem cache')
n2 = [0]
def conta_sg(prop, prof, lon, lat):
    n2[0] += 1
    return CRU.get(prop)
m._sg_valor = conta_sg
m._solo_props_cache.clear()
m.do_solo_propriedades(-15.0, -47.0); primeira = n2[0]
m.do_solo_propriedades(-15.0, -47.0)
check(primeira > 0 and n2[0] == primeira, 'segunda consulta no mesmo ponto nao vai a rede')

m._solo_props_cache.clear()
try:
    m.do_solo_propriedades(None, None); falhas[0] += 1; print('  FALHA sem lat/lng deveria recusar')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'sem lat/lng vira erro legivel')

print('\nMapa pedologico como imagem (para o recorte pelas quadras)')
# Recortar exige ler pixel num canvas, e canvas que recebeu imagem de outro dominio
# nao pode ser exportado. Por isso a imagem vem pelo proxy, e nao como tile direto.
import urllib.request as _ur
_chamadas = []
class _Resp:
    def __init__(self, d, c): self.d = d; self.headers = {'Content-Type': c}
    def read(self): return self.d
    def __enter__(self): return self
    def __exit__(self, *a): return False
_original_urlopen = _ur.urlopen
def _fake(req, timeout=None):
    _chamadas.append(req.full_url)
    return _Resp(b'\x89PNG_fake', 'image/png')
_ur.urlopen = _fake

m._solo_wfs = lambda c, b: UNI_PR if c['typeName'] == CAMADA_PR else []

img, ctype, camada = m.do_solo_mapa([-50.2, -23.5, -50.0, -23.4], 1024)
u = _chamadas[0]
eq(camada, CAMADA_PR, 'o desenho usa a MESMA cascata da consulta por ponto')
check('request=GetMap' in u, 'pede GetMap ao WMS')
check('version=1.1.1' in u, 'WMS 1.1.1 — no 1.3.0 o EPSG:4326 inverteria o bbox')
check('bbox=-50.200000%2C-23.500000%2C-50.000000%2C-23.400000' in u, 'bbox sai em lon,lat')
check('transparent=true' in u, 'fundo transparente, para o satelite aparecer por baixo')
eq(img, b'\x89PNG_fake', 'devolve os bytes da imagem')
eq(ctype, 'image/png', 'com o tipo certo')

_chamadas.clear()
m.do_solo_mapa([-50.2, -23.5, -50.0, -23.3], 1000)   # bbox quadrada
check('width=1000' in _chamadas[0] and 'height=1000' in _chamadas[0],
      'altura proporcional ao bbox — imagem esticada desalinharia do mapa')

print('\nMapa confirma cobertura real, nao apenas o bbox do catalogo')
UNI_MG_FORA = [{'properties': {'legenda': 'LATOSSOLO VERMELHO'},
                'geometry': poly(-47.0, -22.4, -46.8, -22.2)}]
def _iracemapolis(c, b):
    if c['typeName'] == CAMADA_MG: return UNI_MG_FORA
    if c['typeName'] == CAMADA_BR: return UNI_BR
    return []
m._solo_wfs = _iracemapolis
_chamadas.clear()
img, ctype, camada = m.do_solo_mapa([-47.528, -22.664, -47.519, -22.658], 1024)
eq(camada, CAMADA_BR, 'Iracemapolis pula a camada mineira transparente e usa a nacional')
check(('layers=' + CAMADA_BR.replace(':', '%3A')) in _chamadas[0],
      'o GetMap pede a camada nacional que realmente cobre o ponto')

print('\nLegenda oficial da camada desenhada')
_chamadas.clear()
leg, legtype = m.do_solo_legenda(CAMADA_BR)
check('request=GetLegendGraphic' in _chamadas[0], 'pede GetLegendGraphic ao GeoServer')
check(('layer=' + CAMADA_BR.replace(':', '%3A')) in _chamadas[0], 'pede a legenda da camada exata')
eq(leg, b'\x89PNG_fake', 'devolve a imagem da legenda')
try:
    m.do_solo_legenda('geonode:camada_inventada')
    falhas[0] += 1; print('  FALHA legenda aceitou camada nao autorizada')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'legenda recusa nome de camada arbitrario')

print('\nCORS expoe a camada para o navegador pedir a legenda')
_headers_cors = []
_h = object.__new__(m.H)
_h.headers = {'Origin': 'https://agracta.com.br'}
_h.send_header = lambda k, v: _headers_cors.append((k, v))
_h._cors()
check(('Access-Control-Expose-Headers', 'X-Solo-Camada') in _headers_cors,
      'navegador pode ler X-Solo-Camada fora da origem do proxy')

# O GeoServer responde erro como XML COM STATUS 200. Repassar isso como imagem
# pintaria lixo no mapa em vez de dizer o que houve.
m._solo_wfs = lambda c, b: UNI_PR if c['typeName'] == CAMADA_PR else []
_ur.urlopen = lambda req, timeout=None: _Resp(b'<ServiceException/>', 'application/vnd.ogc.se_xml')
try:
    m.do_solo_mapa([-50.2, -23.5, -50.0, -23.4], 1024)
    falhas[0] += 1; print('  FALHA XML de erro virou imagem')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'XML de erro do GeoServer vira erro legivel, nao imagem')

_ur.urlopen = _fake
try:
    m.do_solo_mapa([-50.0, -23.5, -50.0, -23.4], 1024)
    falhas[0] += 1; print('  FALHA bbox degenerada aceita')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'bbox sem area e recusada (dividiria por zero)')

_salvas = m.SOLO_CAMADAS[:]
m.SOLO_CAMADAS = [c for c in _salvas if c.get('bbox')]
try:
    m.do_solo_mapa([10.0, 10.0, 10.1, 10.1], 1024)
    falhas[0] += 1; print('  FALHA area sem cobertura aceita')
except RuntimeError as e:
    check(str(e).startswith('SOLO:'), 'area sem levantamento diz isso, em vez de imagem em branco')
m.SOLO_CAMADAS = _salvas
_ur.urlopen = _original_urlopen

print('\n%s' % ('%d verificações, nenhuma falha.' % passes[0] if falhas[0] == 0
      else '%d FALHA(S) em %d verificações.' % (falhas[0], passes[0] + falhas[0])))
sys.exit(0 if falhas[0] == 0 else 1)
