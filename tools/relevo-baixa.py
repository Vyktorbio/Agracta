#!/usr/bin/env python3
"""Baixa um modelo de elevação (SRTM 30 m) para a área das quadras.

USO ÚNICO. Não entra no aplicativo e o aplicativo NUNCA chama esta API em
execução: o resultado é um JSON estático, e o campo continua funcionando
offline com o arquivo que já está no aparelho.

    python3 tools/relevo-baixa.py --quadras <arquivo> --local "Nome" --simular
    python3 tools/relevo-baixa.py --quadras <arquivo> --local "Nome"

DE ONDE VÊM AS QUADRAS
----------------------
Não estão neste repositório, e isso é de propósito: `vendor/quadras-default.js`
publica `DEFAULT_QGEO = {}` e `DEFAULT_GEOREF = null`, e
`test_privacidade_geometria.js` reprova a publicação se latitude/longitude de
operação aparecerem nos arquivos públicos. A geometria real vive no workspace
autenticado e no cofre do aparelho (`localStorage`, chave `iracema-qgeo-v1`).

Então o arquivo de quadras é uma ENTRADA que o operador exporta do próprio
aparelho. São aceitos três formatos, detectados sozinhos:

  1. QGEO do Agracta   {"Q1": [[lat,lng], [lat,lng], ...], ...}
  2. GeoJSON           Feature / FeatureCollection / Polygon / MultiPolygon
                       (atenção: GeoJSON é lng,lat — a conversão é feita aqui)
  3. Backup do app     qualquer objeto que contenha uma chave QGEO/qgeo

ORDEM DO ARRAY `z`
------------------
Achatado em row-major, com a LINHA 0 NO SUL e a COLUNA 0 NO OESTE:

    z[r * ncols + c]   →   lat = bbox[0] + r * passoLat
                           lng = bbox[1] + c * passoLng

Quem for renderizar o terreno em 3D precisa desta convenção; ela não está
gravada no JSON (o formato é fixo e compacto), está aqui e na documentação.

O arquivo também grava `origem` (o centro da caixa) para que o relevo e as
quadras sejam convertidos para metros locais a partir do MESMO ponto, e
`datum`, porque cota de SRTM não é altitude de GPS.

LIMITES DA API PÚBLICA (api.opentopodata.org)
---------------------------------------------
100 pontos por requisição · 1 chamada/s · 1000 chamadas/dia. O script espera
1,1 s entre chamadas e recusa malhas acima de 90.000 pontos (900 chamadas,
~17 min, dentro da cota diária com folga). O progresso é gravado num arquivo
parcial a cada poucos blocos: se a rede cair, rodar de novo continua de onde
parou em vez de recomeçar.
"""
import argparse
import datetime
import hashlib
import json
import math
import pathlib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
API = 'https://api.opentopodata.org/v1/srtm30m'
FONTE = 'SRTM 30m via Open Topo Data'
# As cotas do SRTM são ortométricas sobre o geoide EGM96 — NÃO são a altitude
# elipsoidal que um GPS mostra. No Brasil as duas diferem de dezenas de metros
# (o geoide fica abaixo do elipsoide), e a diferença varia devagar pelo país.
# Para desenhar o relevo isso não muda nada, porque o desnível é o mesmo; para
# comparar com uma leitura de GPS, muda tudo. Por isso vai escrito no arquivo.
DATUM = 'EGM96 (geoide)'
POR_CHAMADA = 100          # limite da API pública
PAUSA_PADRAO = 1.1         # 1 chamada/s, com folga
MAX_PONTOS_PADRAO = 90000  # 900 chamadas — abaixo das 1000/dia
GRAVA_A_CADA = 10          # blocos entre gravações do parcial

# Aproximação esférica: 1° de latitude ≈ 111320 m. O erro contra o elipsoide
# WGS84 fica abaixo de 0,3% em qualquer latitude, o que para amostrar um SRTM
# de 30 m (cuja incerteza vertical já é de metros) não muda nada.
M_POR_GRAU_LAT = 111320.0


def m_por_grau_lng(lat):
    """Um grau de longitude encurta com o cosseno da latitude."""
    return M_POR_GRAU_LAT * math.cos(math.radians(lat))


# --------------------------------------------------------------- entrada ---
def _pares(seq):
    """Aceita [[a,b],...] ou [{'lat':..,'lng':..},...] e devolve [(a,b),...]."""
    out = []
    for p in seq:
        if isinstance(p, dict):
            a, b = p.get('lat'), p.get('lng', p.get('lon'))
            if a is None or b is None:
                return []
            out.append((float(a), float(b)))
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                out.append((float(p[0]), float(p[1])))
            except (TypeError, ValueError):
                return []
        else:
            return []
    return out


def _geojson_coords(no, saida):
    """Percorre a geometria GeoJSON acumulando (lat,lng) — GeoJSON é lng,lat."""
    if isinstance(no, dict):
        tipo = no.get('type')
        if tipo == 'FeatureCollection':
            for f in no.get('features') or []:
                _geojson_coords(f, saida)
        elif tipo == 'Feature':
            _geojson_coords(no.get('geometry'), saida)
        elif tipo == 'GeometryCollection':
            for g in no.get('geometries') or []:
                _geojson_coords(g, saida)
        elif tipo in ('Polygon', 'MultiPolygon', 'LineString', 'MultiLineString',
                      'Point', 'MultiPoint'):
            _achata_coords(no.get('coordinates'), saida)


def _achata_coords(no, saida):
    if (isinstance(no, (list, tuple)) and len(no) >= 2
            and all(isinstance(v, (int, float)) for v in no[:2])):
        saida.append((float(no[1]), float(no[0])))   # lng,lat -> lat,lng
        return
    if isinstance(no, (list, tuple)):
        for filho in no:
            _achata_coords(filho, saida)


def _acha_qgeo(no, prof=0):
    """Procura uma chave QGEO/qgeo dentro de um backup do aplicativo."""
    if prof > 6 or not isinstance(no, dict):
        return None
    for chave in ('QGEO', 'qgeo', 'quadrasGeo'):
        if isinstance(no.get(chave), dict) and no[chave]:
            return no[chave]
    for v in no.values():
        achado = _acha_qgeo(v, prof + 1)
        if achado:
            return achado
    return None


def ler_quadras(caminho, ordem='latlng'):
    """Devolve [(lat,lng), ...] de todos os vértices, em qualquer dos formatos.

    `ordem` vale só para os formatos crus (QGEO e backup): o GeoJSON tem ordem
    definida pela própria especificação e é convertido sozinho.

    Sobre trocar lat com lng: a checagem de faixa abaixo NÃO pega essa troca em
    coordenadas brasileiras — latitude e longitude do Brasil cabem as duas
    dentro de ±90, então o arquivo trocado passa por válido. Por isso existem
    `--ordem`, para declarar, e `--simular`, que imprime a caixa antes de
    gastar quinze minutos de download no lugar errado.
    """
    bruto = json.loads(pathlib.Path(caminho).read_text(encoding='utf-8'))

    if isinstance(bruto, dict) and bruto.get('type'):
        pontos = []
        _geojson_coords(bruto, pontos)
        origem = 'GeoJSON'
    else:
        qgeo = bruto if isinstance(bruto, dict) else None
        if qgeo is not None and not all(isinstance(v, list) for v in qgeo.values()):
            qgeo = _acha_qgeo(bruto)
            origem = 'backup do aplicativo'
        else:
            origem = 'QGEO do Agracta'
        if not qgeo:
            raise SystemExit('Não encontrei geometria neste arquivo. Esperado QGEO '
                             'do Agracta, GeoJSON ou um backup que contenha QGEO.')
        pontos = []
        for anel in qgeo.values():
            pontos.extend(_pares(anel))
        if ordem == 'lnglat':
            pontos = [(b, a) for a, b in pontos]
            origem += ' (lido como lng,lat)'

    if len(pontos) < 3:
        raise SystemExit('Menos de 3 vértices no arquivo: não há área para cobrir.')

    for lat, lng in pontos:
        if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
            raise SystemExit(
                'Coordenada fora de faixa: lat=%s lng=%s. Se o arquivo estiver em '
                'lng,lat (ordem do GeoJSON), rode com --ordem lnglat.' % (lat, lng))
    return pontos, origem


# ------------------------------------------------------------------ malha ---
def caixa_com_margem(pontos, margem_m):
    """Bounding box de todos os vértices, com `margem_m` metros em cada lado.

    A margem em longitude é calculada no paralelo MAIS CURTO da caixa (o de
    maior |latitude|), onde um grau vale menos metros. Assim a folga de 200 m
    é garantida em toda a borda, e não só no meio dela.
    """
    lats = [p[0] for p in pontos]
    lngs = [p[1] for p in pontos]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)

    d_lat = margem_m / M_POR_GRAU_LAT
    lat_curta = max(abs(min_lat), abs(max_lat))
    cos_curta = math.cos(math.radians(lat_curta))
    if cos_curta < 1e-9:
        raise SystemExit('Área praticamente sobre o polo: a malha em graus não faz sentido aqui.')
    d_lng = margem_m / (M_POR_GRAU_LAT * cos_curta)

    return [min_lat - d_lat, min_lng - d_lng, max_lat + d_lat, max_lng + d_lng]


def malha(bbox, passo_m):
    """Malha regular de ~`passo_m` metros dentro da caixa.

    O passo em longitude usa o paralelo CENTRAL: é onde ele vale exatamente o
    nominal. Nas bordas o espaçamento real desvia pelo cosseno, e o quanto é
    impresso no resumo — para uma fazenda fica na casa dos centímetros.
    """
    min_lat, min_lng, max_lat, max_lng = bbox
    lat_centro = (min_lat + max_lat) / 2.0
    passo_lat = passo_m / M_POR_GRAU_LAT
    passo_lng = passo_m / m_por_grau_lng(lat_centro)

    # ceil + 1 para a última linha/coluna cobrir a caixa inteira em vez de parar antes.
    nrows = int(math.ceil((max_lat - min_lat) / passo_lat)) + 1
    ncols = int(math.ceil((max_lng - min_lng) / passo_lng)) + 1
    return nrows, ncols, passo_lat, passo_lng


def pontos_da_malha(bbox, nrows, ncols, passo_lat, passo_lng):
    """Row-major: linha 0 no sul, coluna 0 no oeste."""
    min_lat, min_lng = bbox[0], bbox[1]
    return [(min_lat + r * passo_lat, min_lng + c * passo_lng)
            for r in range(nrows) for c in range(ncols)]


def blocos(seq, n):
    return [seq[i:i + n] for i in range(0, len(seq), n)]


def desvio_do_passo(bbox, passo_lng_graus, passo_m):
    """Maior diferença, em metros, entre o passo real e o nominal nas bordas."""
    min_lat, _, max_lat, _ = bbox
    reais = [passo_lng_graus * m_por_grau_lng(lat) for lat in (min_lat, max_lat)]
    return max(abs(v - passo_m) for v in reais)


def origem_local(bbox):
    """Centro da caixa: a referência para converter graus em metros locais.

    Gravar isto no arquivo não é comodidade, é evitar um erro que não aparece:
    quem converter as quadras para metros a partir de uma origem e o relevo a
    partir de outra recebe dois planos deslocados entre si. O deslocamento é
    constante e suave, então nada fica torto — a quadra só fica no lugar errado
    do terreno, e o desenho continua plausível.
    """
    return {'lat': round((bbox[0] + bbox[2]) / 2.0, 8),
            'lng': round((bbox[1] + bbox[3]) / 2.0, 8)}


# --------------------------------------------------------------- download ---
def _pede(pontos, tentativas=5):
    """Uma chamada à API, com retry e espera crescente. Devolve as elevações."""
    locs = '|'.join('%.6f,%.6f' % (lat, lng) for lat, lng in pontos)
    url = API + '?' + urllib.parse.urlencode({'locations': locs})
    espera = 2.0
    ultimo = ''
    for tentativa in range(1, tentativas + 1):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'agracta-relevo/1 (uso único)'})
            with urllib.request.urlopen(req, timeout=60) as r:
                corpo = json.loads(r.read().decode('utf-8'))
            if corpo.get('status') != 'OK':
                raise ValueError('a API respondeu status=%r %s'
                                 % (corpo.get('status'), corpo.get('error', '')))
            res = corpo.get('results') or []
            if len(res) != len(pontos):
                raise ValueError('pedi %d pontos e vieram %d' % (len(pontos), len(res)))
            # A API devolve a coordenada de cada ponto: conferir que a resposta
            # está na ordem pedida. Sem isso, um desalinhamento silencioso
            # colocaria a elevação de um ponto no lugar de outro.
            for (lat, lng), item in zip(pontos, res):
                loc = item.get('location') or {}
                if (abs(float(loc.get('lat', 1e9)) - lat) > 1e-5
                        or abs(float(loc.get('lng', 1e9)) - lng) > 1e-5):
                    raise ValueError('a resposta veio fora de ordem — bloco descartado')
            return [None if item.get('elevation') is None else round(float(item['elevation']), 1)
                    for item in res]
        except urllib.error.HTTPError as e:
            ultimo = 'HTTP %s' % e.code
            # 429 é a cota: esperar bem mais que o backoff comum.
            espera = max(espera, 15.0) if e.code == 429 else espera
        except Exception as e:                      # rede, timeout, JSON, ordem
            ultimo = str(e) or type(e).__name__
        if tentativa < tentativas:
            print('      tentativa %d falhou (%s) — esperando %.0fs' % (tentativa, ultimo, espera))
            time.sleep(espera)
            espera *= 2
    raise RuntimeError(ultimo)


def _assinatura(bbox, nrows, ncols, passo_lat, passo_lng):
    cru = json.dumps([bbox, nrows, ncols, passo_lat, passo_lng, FONTE], sort_keys=True)
    return hashlib.sha256(cru.encode()).hexdigest()[:16]


def baixar(pontos, assinatura, parcial_path, pausa):
    """Baixa em blocos de 100, retomando o que o arquivo parcial já tiver."""
    grupos = blocos(pontos, POR_CHAMADA)
    feitos = {}
    if parcial_path.exists():
        try:
            p = json.loads(parcial_path.read_text(encoding='utf-8'))
            if p.get('assinatura') == assinatura:
                feitos = {int(k): v for k, v in (p.get('blocos') or {}).items()}
                print('   retomando: %d de %d blocos já estavam baixados.' % (len(feitos), len(grupos)))
            else:
                print('   o arquivo parcial é de outra malha — ignorado (nada foi apagado).')
        except (ValueError, OSError) as e:
            print('   arquivo parcial ilegível (%s) — recomeçando.' % e)

    def grava():
        parcial_path.write_text(json.dumps(
            {'assinatura': assinatura, 'blocos': {str(k): v for k, v in feitos.items()}},
            separators=(',', ':')), encoding='utf-8')

    pendentes = [i for i in range(len(grupos)) if i not in feitos]
    if pendentes:
        restante = len(pendentes) * pausa
        print('   %d blocos a baixar · ~%d min de espera obrigatória pela cota'
              % (len(pendentes), math.ceil(restante / 60)))
    try:
        for posicao, i in enumerate(pendentes, 1):
            if posicao > 1:
                time.sleep(pausa)          # a cota é 1 chamada/s; esperamos 1,1
            feitos[i] = _pede(grupos[i])
            if posicao % GRAVA_A_CADA == 0 or posicao == len(pendentes):
                grava()
            if posicao % 25 == 0 or posicao == len(pendentes):
                print('   %d/%d blocos (%d%%)' % (posicao, len(pendentes),
                                                  100 * posicao // len(pendentes)))
    except KeyboardInterrupt:
        grava()
        raise SystemExit('\nInterrompido. O progresso está em %s — rode de novo para continuar.'
                         % parcial_path.name)
    except RuntimeError as e:
        grava()
        raise SystemExit('\nA API falhou depois de várias tentativas (%s).\n'
                         'O progresso está em %s — rode de novo para continuar de onde parou.'
                         % (e, parcial_path.name))

    z = []
    for i in range(len(grupos)):
        z.extend(feitos[i])
    return z


# ----------------------------------------------------------------- saída ---
def _apelido(nome):
    sem = unicodedata.normalize('NFKD', nome).encode('ascii', 'ignore').decode()
    return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', sem.lower())).strip('-') or 'local'


def _tamanho(n):
    return '%.1f kB' % (n / 1024) if n < 1024 * 1024 else '%.1f MB' % (n / 1048576)


def main():
    ap = argparse.ArgumentParser(description='Baixa o relevo SRTM 30 m da área das quadras.')
    ap.add_argument('--quadras', required=True,
                    help='JSON com a geometria (QGEO do Agracta, GeoJSON ou backup). '
                         'NÃO está neste repositório: exporte do aparelho.')
    ap.add_argument('--local', required=True, help='Nome do local, como vai no JSON.')
    ap.add_argument('--ordem', choices=('latlng', 'lnglat'), default='latlng',
                    help='Ordem dos pares nos formatos crus (padrão latlng, a do Agracta). '
                         'GeoJSON é convertido sozinho e ignora esta opção.')
    ap.add_argument('--max-extensao', type=float, default=50000.0,
                    help='Recusa caixas maiores que isto, em metros (padrão 50 km).')
    ap.add_argument('--saida', help='Padrão: data/relevo-<local>.json')
    ap.add_argument('--passo', type=float, default=30.0, help='Metros entre pontos (padrão 30).')
    ap.add_argument('--margem', type=float, default=200.0, help='Metros de folga (padrão 200).')
    ap.add_argument('--max-pontos', type=int, default=MAX_PONTOS_PADRAO,
                    help='Teto de pontos (padrão %d).' % MAX_PONTOS_PADRAO)
    ap.add_argument('--pausa', type=float, default=PAUSA_PADRAO,
                    help='Segundos entre chamadas (padrão %.1f).' % PAUSA_PADRAO)
    ap.add_argument('--simular', action='store_true',
                    help='Calcula a malha e mostra o plano SEM chamar a API.')
    a = ap.parse_args()

    pontos_quadras, origem = ler_quadras(a.quadras, a.ordem)
    bbox = caixa_com_margem(pontos_quadras, a.margem)
    nrows, ncols, passo_lat, passo_lng = malha(bbox, a.passo)
    total = nrows * ncols

    largura = (bbox[3] - bbox[1]) * m_por_grau_lng((bbox[0] + bbox[2]) / 2.0)
    altura = (bbox[2] - bbox[0]) * M_POR_GRAU_LAT

    # Uma caixa grande demais não é uma fazenda: ou o arquivo mistura locais
    # distantes, ou as coordenadas vieram trocadas/em outro sistema. Recusar
    # aqui dá uma mensagem sobre a CAUSA; deixar passar daria uma mensagem
    # sobre o teto de pontos, que é o sintoma.
    if max(largura, altura) > a.max_extensao:
        raise SystemExit(
            'ABORTADO: a caixa tem %.1f km × %.1f km, acima do limite de %.0f km.\n'
            'Isso normalmente significa: quadras de locais diferentes no mesmo arquivo,\n'
            'coordenadas em lng,lat (tente --ordem lnglat) ou em outro sistema.\n'
            'Se a área for essa mesmo, aumente --max-extensao.'
            % (largura / 1000, altura / 1000, a.max_extensao / 1000))

    print('Quadras : %d vértices (%s)' % (len(pontos_quadras), origem))
    print('Caixa   : %.6f, %.6f  →  %.6f, %.6f' % tuple(bbox))
    print('          %.0f m (L-O) × %.0f m (N-S), com %.0f m de margem' % (largura, altura, a.margem))
    print('Malha   : %d linhas × %d colunas = %s pontos' % (nrows, ncols, format(total, ',d').replace(',', '.')))
    print('Passo   : %.8f° lat × %.8f° lng (%.0f m nominais)' % (passo_lat, passo_lng, a.passo))
    print('          desvio do passo nas bordas: %.2f m' % desvio_do_passo(bbox, passo_lng, a.passo))
    print('Chamadas: %d · ~%d min' % (math.ceil(total / POR_CHAMADA),
                                      math.ceil(math.ceil(total / POR_CHAMADA) * a.pausa / 60)))

    if total > a.max_pontos:
        raise SystemExit(
            '\nABORTADO: %s pontos passa do teto de %s.\n'
            'Seriam %d chamadas, e a API pública dá 1000 por dia.\n'
            'Saídas: aumentar --passo (45 m corta a malha pela metade), reduzir\n'
            '--margem, ou rodar por local em vez de todos de uma vez.'
            % (format(total, ',d').replace(',', '.'),
               format(a.max_pontos, ',d').replace(',', '.'),
               math.ceil(total / POR_CHAMADA)))

    if a.simular:
        print('\n--simular: nada foi baixado e nenhum arquivo foi escrito.')
        return

    saida = pathlib.Path(a.saida) if a.saida else ROOT / 'data' / ('relevo-%s.json' % _apelido(a.local))
    saida.parent.mkdir(parents=True, exist_ok=True)
    parcial = saida.with_suffix('.parcial.json')

    print('\nBaixando de %s …' % API)
    z = baixar(pontos_da_malha(bbox, nrows, ncols, passo_lat, passo_lng),
               _assinatura(bbox, nrows, ncols, passo_lat, passo_lng), parcial, a.pausa)

    saida.write_text(json.dumps({
        'local': a.local,
        'bbox': [round(v, 8) for v in bbox],
        'nrows': nrows, 'ncols': ncols,
        'passoLat': round(passo_lat, 10), 'passoLng': round(passo_lng, 10),
        'fonte': FONTE,
        'datum': DATUM,
        'origem': origem_local(bbox),
        'baixadoEm': datetime.datetime.now(datetime.timezone.utc)
                             .replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
        'z': z,
    }, separators=(',', ':'), ensure_ascii=False), encoding='utf-8')
    parcial.unlink(missing_ok=True)

    validos = [v for v in z if v is not None]
    nulos = len(z) - len(validos)
    tam = saida.stat().st_size
    print('\n' + '=' * 58)
    print('Arquivo : %s (%s)' % (saida.relative_to(ROOT) if saida.is_relative_to(ROOT) else saida,
                                 _tamanho(tam)))
    print('Pontos  : %s' % format(len(z), ',d').replace(',', '.'))
    print('Caixa   : [%.6f, %.6f, %.6f, %.6f]' % tuple(bbox))
    if validos:
        print('Elevação: %.1f m (mín) a %.1f m (máx) · desnível de %.1f m'
              % (min(validos), max(validos), max(validos) - min(validos)))
    else:
        print('Elevação: NENHUM valor — a área pode estar fora da cobertura do SRTM (60°N a 56°S).')
    print('Sem dado: %d ponto(s) null (%.1f%%)' % (nulos, 100.0 * nulos / len(z) if z else 0))
    print('=' * 58)
    print('\nATENÇÃO, antes de versionar este arquivo:')
    print('  A caixa (bbox) revela a localização da operação com precisão de metros,')
    print('  e este repositório é publicado na web. `test_privacidade_geometria.js`')
    print('  existe justamente porque a geometria de operação foi retirada daqui.')
    print('  Decida conscientemente se este JSON vai para o repositório público ou')
    print('  se fica no workspace autenticado, como as quadras.')


if __name__ == '__main__':
    main()
