"""A malha do relevo: a conta que erra calada.

O erro que este teste existe para pegar é usar o mesmo passo em graus nos dois
eixos. Um grau de latitude vale ~111 km em qualquer lugar; um grau de longitude
encolhe com o cosseno da latitude. A -23° isso dá 8% de diferença — a malha sai
esticada, o terreno renderizado fica achatado no sentido leste-oeste, e nada
acusa: o JSON tem o número certo de pontos e elevações plausíveis.

Nada aqui toca a rede. Rodar: python3 test_relevo_malha.py
"""
import importlib.util
import math
import pathlib

CAMINHO = pathlib.Path(__file__).resolve().parent / 'tools' / 'relevo-baixa.py'
spec = importlib.util.spec_from_file_location('relevo_baixa', CAMINHO)
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)

f = p = 0


def ck(ok, nome):
    global f, p
    if ok:
        p += 1
        print('  ok    ' + nome)
    else:
        f += 1
        print('  FALHA ' + nome)


def _erro(fn, *args):
    """Roda esperando SystemExit e devolve um trecho da mensagem."""
    try:
        fn(*args)
    except SystemExit as e:
        return 'fora de faixa' if 'fora de faixa' in str(e) else str(e)
    return ''


def metros(lat1, lng1, lat2, lng2):
    """Haversine — independente das constantes do módulo, de propósito."""
    r = 6371008.8
    dlat, dlng = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return 2 * r * math.asin(min(1.0, math.sqrt(a)))


# Uma quadra pequena no norte do Paraná, ~800 m × 600 m.
QUADRAS = [(-23.5000, -50.1000), (-23.5000, -50.0920),
           (-23.5054, -50.0920), (-23.5054, -50.1000)]

# ------------------------------------------------- o passo não é o mesmo nos dois eixos
bbox = R.caixa_com_margem(QUADRAS, 200.0)
nrows, ncols, passo_lat, passo_lng = R.malha(bbox, 30.0)

ck(abs(passo_lat - 0.00027) < 5e-6, '30 m em latitude dá ~0,00027° (%.8f)' % passo_lat)
ck(passo_lng > passo_lat, 'o passo em longitude é MAIOR em graus (o grau é mais curto a -23°)')
lat_c = (bbox[0] + bbox[2]) / 2
ck(abs(passo_lng - passo_lat / math.cos(math.radians(lat_c))) < 1e-12,
   'e é exatamente o de latitude dividido por cos(lat)')

# Medido em metros de verdade, os dois passos valem 30 m.
ck(abs(metros(lat_c, -50.1, lat_c + passo_lat, -50.1) - 30) < 0.2, 'passo lat mede 30 m no terreno')
ck(abs(metros(lat_c, -50.1, lat_c, -50.1 + passo_lng) - 30) < 0.2, 'passo lng mede 30 m no terreno')

# No equador os dois coincidem; a 60° o de longitude é o dobro.
_, _, pl0, pn0 = R.malha([-0.01, 0.0, 0.01, 0.02], 30.0)
ck(abs(pn0 - pl0) < 1e-9, 'no equador os dois passos em graus coincidem')
_, _, pl6, pn6 = R.malha([59.99, 0.0, 60.01, 0.02], 30.0)
ck(abs(pn6 / pl6 - 2.0) < 1e-3, 'a 60° o passo em longitude é o dobro em graus')

# --------------------------------------------------------------- a margem de 200 m
oeste = metros(-23.5, min(q[1] for q in QUADRAS), -23.5, bbox[1])
leste = metros(-23.5, max(q[1] for q in QUADRAS), -23.5, bbox[3])
sul = metros(min(q[0] for q in QUADRAS), -50.1, bbox[0], -50.1)
norte = metros(max(q[0] for q in QUADRAS), -50.1, bbox[2], -50.1)
ck(all(199.0 <= d <= 202.0 for d in (oeste, leste, sul, norte)),
   'os quatro lados têm ~200 m (O %.1f · L %.1f · S %.1f · N %.1f)' % (oeste, leste, sul, norte))
# Medido por haversine com outro raio terrestre, dá 199,8 em vez de 200: é a
# diferença entre os dois modelos de Terra (0,2%), não sobra nem falta de margem.
ck(abs(max(oeste, leste) - max(sul, norte)) < 0.5,
   'a folga é a mesma nos dois eixos — o cosseno foi aplicado onde devia')

# ------------------------------------------------------ a malha cobre a caixa inteira
ck(bbox[0] + (nrows - 1) * passo_lat >= bbox[2] - 1e-12, 'a última linha alcança o topo da caixa')
ck(bbox[1] + (ncols - 1) * passo_lng >= bbox[3] - 1e-12, 'a última coluna alcança a borda leste')
ck(bbox[0] + (nrows - 2) * passo_lat < bbox[2], 'e não sobra uma linha inteira além do necessário')

# ------------------------------------------------------------- ordem row-major
pts = R.pontos_da_malha(bbox, nrows, ncols, passo_lat, passo_lng)
ck(len(pts) == nrows * ncols, 'a lista tem nrows × ncols pontos')
ck(pts[0] == (bbox[0], bbox[1]), 'o índice 0 é o canto SUDOESTE (linha 0 = sul, coluna 0 = oeste)')
r, c = 7, 11
lat, lng = pts[r * ncols + c]
ck(abs(lat - (bbox[0] + r * passo_lat)) < 1e-12 and abs(lng - (bbox[1] + c * passo_lng)) < 1e-12,
   'z[r*ncols+c] corresponde a lat=minLat+r*passoLat, lng=minLng+c*passoLng')
ck(pts[1][0] == pts[0][0] and pts[1][1] > pts[0][1],
   'row-major: o vizinho seguinte anda em LONGITUDE, não em latitude')
ck(pts[ncols][0] > pts[0][0] and abs(pts[ncols][1] - pts[0][1]) < 1e-12,
   'e o ponto ncols adiante é a linha de cima, mesma coluna')

# ------------------------------------------------- origem comum ao relevo e às quadras
# Se o relevo converter graus em metros a partir de um ponto e as quadras a
# partir de outro, os dois planos saem deslocados entre si. O deslocamento é
# constante e suave, então nada fica torto: a quadra só fica no lugar errado do
# terreno, e o desenho continua plausível. Por isso a origem vai no arquivo.
o = R.origem_local(bbox)
ck(abs(o['lat'] - (bbox[0] + bbox[2]) / 2) < 1e-8, 'a origem é o centro da caixa em latitude')
ck(abs(o['lng'] - (bbox[1] + bbox[3]) / 2) < 1e-8, 'e o centro da caixa em longitude')
ck(bbox[0] < o['lat'] < bbox[2] and bbox[1] < o['lng'] < bbox[3], 'e cai dentro da caixa')
# É o meio da CAIXA, não a média dos vértices. Num retângulo os dois coincidem,
# então a distinção só aparece num polígono assimétrico — como este, em L, com
# vértices amontoados a oeste.
EM_L = [(-23.5000, -50.1000), (-23.5000, -50.0990), (-23.5010, -50.0990),
        (-23.5010, -50.0995), (-23.5020, -50.0995), (-23.5020, -50.0900)]
o_l = R.origem_local(R.caixa_com_margem(EM_L, 200.0))
media_l = sum(q[1] for q in EM_L) / len(EM_L)
ck(abs(o_l['lng'] - media_l) > 1e-5,
   'é o meio da CAIXA, não a média dos vértices (%.6f vs %.6f)' % (o_l['lng'], media_l))
ck(R.origem_local([-1.0, -2.0, 1.0, 2.0]) == {'lat': 0.0, 'lng': 0.0},
   'caixa simétrica dá origem no zero')

# O datum é declarado: cota de SRTM é ortométrica (geoide), não a do GPS.
ck(R.DATUM == 'EGM96 (geoide)', 'o datum vertical vai escrito no arquivo (%s)' % R.DATUM)

# ------------------------------------------------------------- blocos de 100
gs = R.blocos(pts, R.POR_CHAMADA)
ck(all(len(g) <= 100 for g in gs), 'nenhum bloco passa de 100 pontos (limite da API)')
ck(sum(len(g) for g in gs) == len(pts), 'nenhum ponto se perde no fatiamento')
ck([q for g in gs for q in g] == pts, 'e a ordem sobrevive à ida e volta pelos blocos')

# ------------------------------------------------------------- recusas
try:
    R.ler_quadras(__file__)
    ck(False, 'arquivo que não é JSON deveria ser recusado')
except Exception:
    ck(True, 'arquivo que não é JSON é recusado')

import json, tempfile, os


def num_arquivo(obj, fn):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as t:
        json.dump(obj, t)
        nome = t.name
    try:
        return fn(nome)
    finally:
        os.unlink(nome)


# Fora de faixa (|lat| > 90) é recusado.
ck(num_arquivo({'Q1': [[-123.0, -50.1], [-123.0, -50.0], [-122.9, -50.0]]},
               lambda n: _erro(R.ler_quadras, n)) == 'fora de faixa',
   'latitude impossível é recusada com mensagem clara')

# Mas lat/lng TROCADOS em coordenadas brasileiras passam pela checagem de faixa:
# -50 é uma latitude válida. Este teste registra esse limite em vez de fingir
# que o script adivinha — por isso existem --ordem e --simular.
ck(num_arquivo({'Q1': [[-50.1, -23.5], [-50.1, -23.4], [-50.2, -23.4]]},
               lambda n: R.ler_quadras(n)[0][0]) == (-50.1, -23.5),
   'lat/lng trocados NÃO são detectáveis por faixa — o script não finge que são')

# E --ordem lnglat desfaz a troca quando o operador a declara.
ck(num_arquivo({'Q1': [[-50.1, -23.5], [-50.1, -23.4], [-50.2, -23.4]]},
               lambda n: R.ler_quadras(n, 'lnglat')[0][0]) == (-23.5, -50.1),
   '--ordem lnglat troca os pares de volta')

# GeoJSON é lng,lat pela especificação e é convertido sozinho, sem --ordem.
geo = {'type': 'Polygon', 'coordinates': [[[-50.1, -23.5], [-50.0, -23.5], [-50.0, -23.4], [-50.1, -23.5]]]}
ck(num_arquivo(geo, lambda n: R.ler_quadras(n)[0][0]) == (-23.5, -50.1),
   'GeoJSON entra em lng,lat e sai em lat,lng sozinho')

# O teto de pontos protege a cota diária: 90.000 pontos = 900 chamadas.
ck(math.ceil(R.MAX_PONTOS_PADRAO / R.POR_CHAMADA) <= 1000,
   'o teto padrão cabe nas 1000 chamadas/dia da API pública')
ck(R.PAUSA_PADRAO > 1.0, 'a pausa entre chamadas respeita 1/s com folga')

print('\nResultado: %d passaram; %d falharam.' % (p, f))
if f:
    raise SystemExit(1)
