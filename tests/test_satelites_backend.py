"""Contratos dos provedores e HTTP autenticado, sem depender da rede externa."""
import base64
import copy
import importlib.util
import json
import os
import sys
import threading
import unittest
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from unittest.mock import patch

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RAIZ)
import satelites_backend as s

NOW = datetime(2026, 10, 6, 12, tzinfo=timezone.utc)
ITEM = 'LC09_L2SP_220076_20260904_02_T1'
BB = '-47.65,-22.7,-47.4,-22.45'
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLttAAAAABJRU5ErkJggg==')
SCENE = {'id': ITEM, 'bbox': [-49, -24, -46, -22],
         'properties': {'datetime': '2026-09-04T13:10:00Z', 'eo:cloud_cover': 14},
         'assets': {'qa_pixel': {}, 'lwir11': {'raster:bands': [{'scale': 0.00341802, 'offset': 149}]}}}
HEADER = 'latitude,longitude,acq_date,acq_time,confidence,satellite,frp,daynight\n'


def xml_catalog():
    layers = ''.join('<Layer><o:Identifier>'+name+'</o:Identifier><Dimension><o:Identifier>Time</o:Identifier>'
                     '<Default>2026-10-02</Default><Value>2026-09-28/2026-09-29/P1D</Value>'
                     '<Value>2026-10-01/2026-10-02/P1D</Value></Dimension></Layer>'
                     for name in s.SMAP_LAYERS.values())
    return ('<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:o="http://www.opengis.net/ows/1.1">'
            '<Contents>'+layers+'</Contents></Capabilities>').encode()


class Providers(unittest.TestCase):
    def setUp(self):
        s._cache = s.Cache()
        self.clock = patch.object(s, 'utc_now', return_value=NOW)
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def test_invalid_inputs_do_not_reach_network(self):
        with patch.object(s, 'download') as remote:
            for bbox in ['nan,0,1,2', '0,2,1,0', '-1,-86,1,-84', '0,0,7,1', '0,0,1', 'https://x']:
                with self.assertRaises(s.SatelliteError): s.landsat_dates({'bbox':bbox})
            for item in ['../../anything', 'LC08_L2SR_220076_20260904_02_T1', 'https://x']:
                with self.assertRaises(s.SatelliteError): s.landsat_point({'item':item,'lat':0,'lng':0})
            for hours in ['0', '25', '999', 'nan']:
                with self.assertRaises(s.SatelliteError): s.firms({'bbox':BB,'horas':hours})
            with self.assertRaises(s.SatelliteError): s.landsat_dates({'bbox':BB,'ate':'2026-10-07'})
            with self.assertRaises(s.SatelliteError): s.landsat_dates({'bbox':BB,'de':'2025-01-01'})
            remote.assert_not_called()

    def test_catalog_filters_scenes_without_temperature_and_orders_dates(self):
        old = copy.deepcopy(SCENE); old['id'] = ITEM.replace('20260904','20260819')
        old['properties']['datetime'] = '2026-08-19T13:10:00Z'
        wrong = copy.deepcopy(SCENE); wrong['assets']['lwir11']['raster:bands'][0]['scale'] = 1
        no_temp = copy.deepcopy(SCENE); del no_temp['assets']['lwir11']
        with patch.object(s, 'get_json', return_value={'features':[old,wrong,no_temp,SCENE], 'links':[{'rel':'next'}]}):
            data = s.landsat_dates({'bbox':BB})
        self.assertEqual([r['id'] for r in data['scenes']], [ITEM,old['id']])
        self.assertEqual(data['scenes'][0]['platform'], 'Landsat 9')
        self.assertEqual(data['scenes'][0]['pathRow'], '220076')
        self.assertTrue(data['truncated'])
        with patch.object(s, 'get_json', return_value={'features':[]}):
            s._cache = s.Cache(); self.assertEqual(s.landsat_dates({'bbox':BB})['scenes'], [])
        with patch.object(s, 'get_json', return_value={'error':'bad'}):
            s._cache = s.Cache()
            with self.assertRaises(s.SatelliteError): s.landsat_dates({'bbox':BB})

    def test_thermal_conversion_mask_and_band_order(self):
        record = s.landsat_record(SCENE)
        with patch.object(s, 'landsat_scene', return_value=record), patch.object(s, 'get_json') as remote:
            remote.return_value = {'values':[21824,46975], 'band_names':['qa_pixel','lwir11']}
            result = s.landsat_point({'item':ITEM,'lat':'-22.58','lng':'-47.52'})
            self.assertAlmostEqual(result['temperatureC'], 36.41, places=2)
            url = remote.call_args.args[0]
            self.assertEqual(urllib.parse.parse_qs(urllib.parse.urlparse(url).query)['assets'], ['lwir11','qa_pixel'])
            for qa in [1,2,4,8,16,32]:
                remote.return_value = {'values':[46975,qa], 'band_names':['lwir11','qa_pixel']}
                self.assertIsNone(s.landsat_point({'item':ITEM,'lat':-22.58,'lng':-47.52})['temperatureC'])
            for dn in [0,None]:
                remote.return_value = {'values':[dn,64], 'band_names':['lwir11','qa_pixel']}
                self.assertIsNone(s.landsat_point({'item':ITEM,'lat':-22.58,'lng':-47.52})['temperatureC'])
            remote.return_value = {'values':[46975,float('nan')], 'band_names':['lwir11','qa_pixel']}
            with self.assertRaises(s.SatelliteError): s.landsat_point({'item':ITEM,'lat':-22.58,'lng':-47.52})
            remote.reset_mock()
            self.assertIsNone(s.landsat_point({'item':ITEM,'lat':0,'lng':0})['temperatureC'])
            remote.assert_not_called()

    def test_images_use_web_mercator_and_transparent_invalid_pixels(self):
        with patch.object(s, 'landsat_scene', return_value=s.landsat_record(SCENE)), patch.object(s, 'download', return_value=PNG) as remote:
            self.assertEqual(s.landsat_image({'bbox':BB,'item':ITEM,'width':256}), PNG)
            params = urllib.parse.parse_qs(urllib.parse.urlparse(remote.call_args.args[0]).query)
            self.assertEqual(params['dst_crs'], ['EPSG:3857'])
            self.assertEqual(params['unscale'], ['false'])
            self.assertIn('qa_pixel%64',params['expression'][0])
            self.assertEqual(json.loads(params['colormap'][0])[0], [[0,1],[0,0,0,0]])
            with self.assertRaises(s.SatelliteError): s.landsat_image({'bbox':'0,0,1,1','item':ITEM})
        with self.assertRaises(s.SatelliteError): s.png(b'<ServiceException>bad layer</ServiceException>')

    def test_smap_uses_published_dates_including_gaps(self):
        with patch.object(s, 'download', return_value=xml_catalog()):
            catalog = s.smap_catalog()
        self.assertEqual(catalog['layers'][s.SMAP_LAYERS['superficie']]['dates'],
                         ['2026-10-02','2026-10-01','2026-09-29','2026-09-28'])
        with patch.object(s, 'download', return_value=PNG) as remote:
            with self.assertRaises(s.SatelliteError): s.smap_image({'bbox':BB,'date':'2026-09-30'})
            remote.assert_not_called()
            s.smap_image({'bbox':BB,'date':'2026-10-02','camada':'raizes'})
            query = urllib.parse.parse_qs(urllib.parse.urlparse(remote.call_args.args[0]).query)
            self.assertEqual(query['SRS'], ['EPSG:3857'])
            self.assertEqual(query['LAYERS'], [s.SMAP_LAYERS['raizes']])
            self.assertEqual(query['TIME'], ['2026-10-02'])
        s._cache = s.Cache()
        with patch.object(s, 'download', return_value=b'<bad/>'):
            with self.assertRaises(s.SatelliteError): s.smap_catalog()

    def test_firms_bbox_utc_window_limit_and_malformed_data(self):
        rows = HEADER + '\n'.join([
            '-22.6,-47.5,2026-10-06,1030,high,N20,5,D',
            '-22.6,-47.5,2026-10-06,0030,nominal,N20,2,N',
            '-22.6,-47.5,2026-10-06,1130,low,N20,1,D',
            '-22.6,-47.5,2026-10-04,0030,high,N20,9,N',  # fora das 24h
            '-22.6,-47.5,2026-10-07,0000,high,N20,9,N',  # futura
            '40,15,2026-10-06,1145,high,N20,3,D',        # fora da área
        ])
        features, count, latest = s.firms_features(rows.encode(), s.bbox_param({'bbox':BB}), NOW, 24, limit=2)
        self.assertEqual(count,3); self.assertEqual(len(features),2)
        self.assertEqual(features[0]['properties']['datetime'],'2026-10-06T11:30:00Z')
        self.assertEqual(features[0]['properties']['confidence'],'low')
        self.assertEqual(features[1]['properties']['frpMW'],5)
        self.assertEqual(s.iso(latest),'2026-10-06T11:45:00Z')
        # Os três VIIRS: cada arquivo tem a sua passagem, e a resposta junta todas.
        arquivos = {'SUOMI_VIIRS_C2': '-22.6,-47.5,2026-10-06,0420,nominal,N,4,N',
                    'J1_VIIRS_C2': rows[len(HEADER):],
                    'J2_VIIRS_C2': '-22.61,-47.51,2026-10-06,0510,high,N21,7,N'}
        def baixar(url, max_bytes=None):
            return (HEADER + next(v for k, v in arquivos.items() if '/' + k + '_' in url)).encode()
        with patch.object(s,'download',side_effect=baixar) as remote:
            result = s.firms({'bbox':BB,'horas':'24'})
            urls = sorted(c.args[0].rsplit('/',1)[1] for c in remote.call_args_list)
            self.assertEqual(urls,['J1_VIIRS_C2_South_America_24h.csv','J2_VIIRS_C2_South_America_24h.csv',
                                   'SUOMI_VIIRS_C2_South_America_24h.csv'])
            self.assertEqual(result['meta']['count'],5)
            self.assertEqual(sorted({f['properties']['satellite'] for f in result['features']}),['NOAA-20','NOAA-21','S-NPP'])
            self.assertEqual(result['meta']['fetchedAt'],'2026-10-06T12:00:00Z')
            self.assertEqual([x['ok'] for x in result['meta']['sources']],[True,True,True])
            # O arquivo é lido uma vez por download: o segundo pedido não baixa de novo.
            s.firms({'bbox':BB,'horas':'24'})
            self.assertEqual(remote.call_count,3)
        for bad in [b'<html>Error</html>',(HEADER+'nan,-47,2026-10-06,1000,high,N20,1,D').encode(),
                    (HEADER+'-22.6,-47.5,2026-10-06,2560,high,N20,1,D').encode()]:
            with self.assertRaises(s.SatelliteError): s.firms_features(bad,s.bbox_param({'bbox':BB}),NOW,24)
        features,count,latest = s.firms_features(HEADER.encode(),s.bbox_param({'bbox':BB}),NOW,24)
        self.assertEqual(features,[]); self.assertEqual(count,0); self.assertIsNone(latest)

    def test_firms_one_satellite_down_is_reported_not_hidden(self):
        linha = '-22.6,-47.5,2026-10-06,1030,high,N20,5,D'
        def baixar(url, max_bytes=None):
            if 'SUOMI' in url:
                raise s.SatelliteError('O provedor de satélite está indisponível. Tente novamente.', 502)
            return (HEADER + linha).encode()
        with patch.object(s,'download',side_effect=baixar):
            result = s.firms({'bbox':BB,'horas':'24'})
        fontes = {x['satellite']: x for x in result['meta']['sources']}
        self.assertFalse(fontes['S-NPP']['ok']); self.assertIn('indisponível', fontes['S-NPP']['error'])
        self.assertTrue(fontes['NOAA-20']['ok']); self.assertEqual(result['meta']['count'], 2)
        self.assertNotIn('S-NPP', result['meta']['source'])
        s._cache = s.Cache()
        with patch.object(s,'download',side_effect=s.SatelliteError('fora do ar',502)):
            with self.assertRaises(s.SatelliteError): s.firms({'bbox':BB,'horas':'24'})

    def test_firms_few_defective_rows_are_counted_not_fatal(self):
        boas = ['-22.6,-47.5,2026-10-06,%04d,nominal,N20,2,D' % (h * 100) for h in range(10)] * 20
        corpo = HEADER + '\n'.join(boas + ['-22.6,-47.5,2026-10-06,2560,high,N20,1,D'])
        feed = s.firms_parse(corpo.encode(), 'NOAA-20', NOW)
        self.assertEqual((feed.rows, feed.invalid), (200, 1))
        features, count, _ = s.firms_select([feed], s.bbox_param({'bbox':BB}), NOW, 24)
        self.assertEqual(count, 200)
        ruim = HEADER + '\n'.join(boas[:50] + ['x,y,2026-10-06,1000,high,N20,1,D'] * 2)
        with self.assertRaises(s.SatelliteError): s.firms_parse(ruim.encode(), 'NOAA-20', NOW)

    def test_firms_box_edges_and_latitude_search(self):
        linhas = ['-22.7,-47.65,2026-10-06,1000,low,N20,1,D', '-22.45,-47.4,2026-10-06,1000,low,N20,1,D',
                  '-22.7001,-47.5,2026-10-06,1000,low,N20,1,D', '-22.5,-47.3999,2026-10-06,1000,low,N20,1,D',
                  '10,-47.5,2026-10-06,1000,low,N20,1,D', '-30,-47.5,2026-10-06,1000,low,N20,1,D']
        feed = s.firms_parse((HEADER + '\n'.join(linhas)).encode(), 'NOAA-20', NOW)
        features, count, _ = s.firms_select([feed], s.bbox_param({'bbox':BB}), NOW, 24)
        self.assertEqual(count, 2, 'as bordas da caixa contam; um passo fora, não')
        self.assertEqual(sorted(f['geometry']['coordinates'][1] for f in features), [-22.7, -22.45])

    def test_cache_limits_expiration_failures_and_single_flight(self):
        cache = s.Cache(max_bytes=6,max_entries=2)
        with patch.object(s.time,'monotonic',return_value=10):
            self.assertEqual(cache.get('a',5,lambda:b'aaa'),b'aaa')
            cache.get('b',5,lambda:b'bbb'); cache.get('c',5,lambda:b'ccc')
            self.assertEqual(list(cache.entries),['b','c']); self.assertEqual(cache.size,6)
        with patch.object(s.time,'monotonic',return_value=20):
            self.assertEqual(cache.get('c',5,lambda:b'new'),b'new')
        def bad(): raise s.SatelliteError('fora do ar',502)
        with self.assertRaises(s.SatelliteError): cache.get('error',1,bad)
        self.assertNotIn('error',cache.entries); self.assertNotIn('error',cache.busy)
        entered,release = threading.Event(),threading.Event()
        calls,results = [],[]
        def slow():
            calls.append(1); entered.set(); release.wait(2); return b'x'
        threads = [threading.Thread(target=lambda:results.append(cache.get('same',60,slow))) for _ in range(4)]
        for t in threads: t.start()
        self.assertTrue(entered.wait(2)); release.set()
        for t in threads: t.join(3)
        self.assertEqual(len(calls),1); self.assertEqual(results,[b'x']*4)


class ProxyHTTP(unittest.TestCase):
    def test_satellite_routes_require_login_and_keep_errors_and_cors(self):
        spec = importlib.util.spec_from_file_location('proxy_satelites',os.path.join(RAIZ,'ndvi-proxy.py'))
        proxy = importlib.util.module_from_spec(spec); spec.loader.exec_module(proxy)
        called = []
        def authorize(header,path):
            called.append(path)
            return None if header == 'Bearer member' else (401,'sem_token')
        server = proxy.ThreadingHTTPServer(('127.0.0.1',0),proxy.H)
        thread = threading.Thread(target=server.serve_forever,daemon=True)
        thread.start()
        def request(path,member=False):
            headers = {'Origin':'https://www.agracta.com.br'}
            if member: headers['Authorization']='Bearer member'
            req = urllib.request.Request('http://127.0.0.1:%s%s'%(server.server_port,path),headers=headers)
            try: return urllib.request.urlopen(req,timeout=3)
            except urllib.error.HTTPError as e: return e
        try:
            with patch.object(proxy,'autorizar',side_effect=authorize), patch.object(s,'handle',return_value=('image/png',PNG)) as provider:
                for route in ['/satelites/landsat/datas','/satelites/landsat/imagem','/satelites/landsat/ponto',
                              '/satelites/smap/datas','/satelites/smap/imagem','/satelites/firms']:
                    with request(route) as response:
                        self.assertEqual(response.code,401)
                        self.assertEqual(response.headers['Access-Control-Allow-Origin'],'https://www.agracta.com.br')
                        self.assertEqual(json.load(response)['login'],'sem_token')
                provider.assert_not_called()
                with request('/satelites/smap/imagem?date=2026-10-02',True) as response:
                    self.assertEqual(response.code,200); self.assertEqual(response.read(),PNG)
                    self.assertEqual(response.headers['Content-Type'],'image/png')
                    self.assertEqual(response.headers['Cache-Control'],'no-store')
                provider.side_effect = s.SatelliteError('Área inválida.',400)
                with request('/satelites/firms?bbox=nan',True) as response:
                    self.assertEqual(response.code,400); self.assertEqual(json.load(response)['error'],'Área inválida.')
                provider.side_effect = OSError('internal detail')
                with request('/satelites/firms',True) as response:
                    self.assertEqual(response.code,502); self.assertNotIn('internal detail',response.read().decode())
            self.assertEqual(len(called),9)
        finally:
            server.shutdown(); server.server_close(); thread.join(3)


if __name__ == '__main__':
    unittest.main(verbosity=2)
