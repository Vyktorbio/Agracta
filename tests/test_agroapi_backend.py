"""AgroAPI: URLs documentadas, cota/cache e sigilo sem chamar a Embrapa."""
import base64
import importlib.util
import io
import json
import os
import sys
import threading
import time
import unittest
import urllib.error
import urllib.parse
import urllib.request
from unittest.mock import patch

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
import agroapi_backend as a

class Response:
    def __init__(self, payload, headers=None, raw=None):
        self.raw = json.dumps(payload).encode() if raw is None else raw
        self.headers = dict({"Content-Type": "application/json"}, **(headers or {}))
    def read(self, limit):
        return self.raw[:limit]
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False

class Contracts(unittest.TestCase):
    def setUp(self):
        a._cache.clear()
        self.env = patch.dict(os.environ, {"AGROAPI_TOKEN": "token-de-teste"}, clear=True)
        self.env.start()
        self.requests = []
    def tearDown(self):
        self.env.stop()
        a._cache.clear()
    def fake(self, payload, headers=None):
        def open_(req):
            self.requests.append(req)
            return Response(payload, headers)
        return patch.object(a, "_open", open_)
    def test_missing_and_private_credential(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(a.AgroAPIError) as caught:
                a.handle("/agroapi/bioinsumos", {})
            self.assertEqual(caught.exception.status, 503)
            self.assertEqual(caught.exception.code, "agroapi_not_configured")
        with self.fake([]):
            result = a.handle("/agroapi/bioinsumos", {})
        self.assertEqual(self.requests[0].get_header("Authorization"), "Bearer token-de-teste")
        self.assertNotIn("token-de-teste", json.dumps(result))
        self.assertNotIn("token-de-teste", json.dumps(a.status()))
    def test_bio_search_and_pagination(self):
        headers = {"X-Pages": "4", "X-Records-Count": "72", "X-Page-Size": "20"}
        with self.fake([{"numero_registro": "7815"}], headers):
            r = a.handle("/agroapi/bioinsumos", {"q": "Bacillus & afins", "cultura": "Soja", "page": "2"})
        u = urllib.parse.urlsplit(self.requests[0].full_url)
        self.assertEqual(u.path, "/bioinsumos/v2/search/produtos-biologicos")
        self.assertEqual(urllib.parse.parse_qs(u.query)["q"], ["Bacillus & afins"])
        self.assertEqual(r["pagination"], {"pages": 4, "total": 72, "pageSize": 20, "page": 2})
        with self.fake([]):
            r = a.handle("/agroapi/bioinsumos", {"tipo": "inoculantes", "q": "Trichoderma"})
        self.assertIn("/search/inoculantes", self.requests[-1].full_url)
        self.assertEqual(r["category"], "inoculantes")
    def test_cache_and_credential_rotation(self):
        with self.fake([]):
            a.handle("/agroapi/bioinsumos", {})
            a.handle("/agroapi/bioinsumos", {})
            self.assertEqual(len(self.requests), 1)
            os.environ["AGROAPI_TOKEN"] = "novo-token"
            a.handle("/agroapi/bioinsumos", {})
            self.assertEqual(len(self.requests), 2)
            os.environ.pop("AGROAPI_TOKEN")
            with self.assertRaises(a.AgroAPIError):
                a.handle("/agroapi/bioinsumos", {})
    def test_agritec_preserves_season_decree_and_risk(self):
        data = [{"diaIni": 21, "mesIni": 11, "diaFim": 30, "mesFim": 11,
                 "risco": 20, "solo": "AD1", "ciclo": "GRUPO I",
                 "safraIni": 2025, "safraFim": 2026, "portaria": "Port. 381 de 26/06/2025"}]
        with self.fake({"meta": {"totalCount": 1}, "data": data}):
            r = a.handle("/agroapi/agritec/zoneamento", {"codigoIBGE": "3502804", "idCultura": "60", "risco": "20"})
        self.assertEqual(r["data"], data)
        params = urllib.parse.parse_qs(urllib.parse.urlsplit(self.requests[0].full_url).query)
        self.assertEqual(params, {"codigoIBGE": ["3502804"], "idCultura": ["60"], "risco": ["20"]})
        with self.fake({"data": []}):
            a.handle("/agroapi/agritec/municipios", {"uf": "SP"})
            a.handle("/agroapi/agritec/culturas", {"codigoIBGE": "3523206"})
        self.assertTrue(self.requests[-1].full_url.endswith("/municipios/3523206/culturas"))
    def test_clim_longitude_first_and_zero_unchanged(self):
        series = [{"data": "2026-10-06T12:00:00Z", "valor": 0}]
        with self.fake(series):
            r = a.handle("/agroapi/climapi/serie", {"variavel": "apcpsfc", "data": "2026-10-06", "lat": "-22.58", "lng": "-47.52"})
        self.assertTrue(self.requests[0].full_url.endswith("/ncep-gfs/apcpsfc/2026-10-06/-47.5200/-22.5800"))
        self.assertEqual(r["data"], series)
        self.assertEqual(r["modelDate"], "2026-10-06")
        with self.fake(["2026-10-06"]):
            a.handle("/agroapi/climapi/datas", {"variavel": "tmax2m"})
        self.assertTrue(self.requests[-1].full_url.endswith("/ncep-gfs/tmax2m"))
    def test_validation_prevents_network_calls(self):
        cases = [
            ("/agroapi/bioinsumos", {"page": "0"}),
            ("/agroapi/bioinsumos", {"tipo": "../agrofit"}),
            ("/agroapi/bioinsumos", {"url": "https://outro.test"}),
            ("/agroapi/agritec/municipios", {"uf": "ZZ"}),
            ("/agroapi/agritec/zoneamento", {"codigoIBGE": "3523206", "idCultura": "60", "risco": "50"}),
            ("/agroapi/agritec/culturas", {"codigoIBGE": "../token"}),
            ("/agroapi/climapi/datas", {"variavel": "../token"}),
            ("/agroapi/climapi/serie", {"data": "2026-02-30", "lat": "-22", "lng": "-47"}),
            ("/agroapi/climapi/serie", {"data": "2026-10-06", "lat": "nan", "lng": "-47"}),
            ("/agroapi/climapi/serie", {"data": "2026-10-06", "lat": "40", "lng": "-47"}),
        ]
        with self.fake([]):
            for path, params in cases:
                with self.assertRaises(a.AgroAPIError) as caught:
                    a.handle(path, params)
                self.assertEqual(caught.exception.status, 400)
        self.assertEqual(self.requests, [])
    def test_auth_quota_and_upstream_details_not_leaked(self):
        for code, status, reason in [(401, 503, "agroapi_access"), (403, 503, "agroapi_access"), (429, 429, "agroapi_quota"), (500, 502, "agroapi_unavailable")]:
            error = urllib.error.HTTPError("https://api.cnptia.embrapa.br/", code, "token-de-teste", {}, io.BytesIO(b"segredo upstream"))
            with patch.object(a, "_open", side_effect=error):
                with self.assertRaises(a.AgroAPIError) as caught:
                    a.handle("/agroapi/bioinsumos", {})
            self.assertEqual(caught.exception.status, status)
            self.assertEqual(caught.exception.code, reason)
            self.assertNotIn("segredo", str(caught.exception))
            self.assertNotIn("token-de-teste", str(caught.exception))
            self.assertEqual(len(a._cache), 0)
    def test_bad_payloads_and_redirects_are_not_cached(self):
        for raw in [b"<html>falha</html>", b'{"error":"segredo"}', b'{"valor":NaN}', b"{}"]:
            with patch.object(a, "_open", return_value=Response(None, raw=raw)):
                with self.assertRaises(a.AgroAPIError):
                    a.handle("/agroapi/bioinsumos", {})
            self.assertEqual(len(a._cache), 0)
        with patch.object(a, "MAX_BYTES", 12), self.fake([{"conteudo": "muito longo"}]):
            with self.assertRaises(a.AgroAPIError):
                a.handle("/agroapi/bioinsumos", {})
        with self.assertRaises(a.AgroAPIError):
            a.NoRedirect().redirect_request(None, None, 302, "", {}, "https://outro.test/")

class AppCredential(unittest.TestCase):
    """Chave e segredo da aplicação: o token é pedido e renovado pelo servidor."""
    def setUp(self):
        a._cache.clear(); a._inflight.clear()
        a._app_token.update(value=None, exp=0.0, key=None)
        self.env = patch.dict(os.environ, {"AGROAPI_CONSUMER_KEY": "chave-app", "AGROAPI_CONSUMER_SECRET": "segredo-app"}, clear=True)
        self.env.start()
        self.calls, self.tokens, self.api_401 = [], [], 0
    def tearDown(self):
        self.env.stop(); a._cache.clear(); a._app_token.update(value=None, exp=0.0, key=None)
    def open_(self, req):
        self.calls.append(req)
        if req.full_url == a.TOKEN_URL:
            self.tokens.append(req)
            return Response({"access_token": "tok-%d" % len(self.tokens), "expires_in": 3600, "token_type": "Bearer"})
        if self.api_401:
            self.api_401 -= 1
            raise urllib.error.HTTPError(req.full_url, 401, "Unauthorized", {}, io.BytesIO(b"expirado"))
        return Response([])
    def test_token_requested_once_reused_and_renewed_before_expiry(self):
        with patch.object(a, "_open", self.open_), patch.object(a.time, "time", return_value=1000.0):
            a.handle("/agroapi/bioinsumos", {"q": "Bacillus"})
            a.handle("/agroapi/bioinsumos", {"q": "Trichoderma"})
        self.assertEqual(len(self.tokens), 1, "um token para várias consultas")
        pedido = self.tokens[0]
        self.assertEqual(pedido.get_method(), "POST")
        self.assertEqual(pedido.data, b"grant_type=client_credentials")
        self.assertEqual(pedido.get_header("Authorization"), "Basic " + base64.b64encode(b"chave-app:segredo-app").decode())
        self.assertEqual(self.calls[1].get_header("Authorization"), "Bearer tok-1")
        with patch.object(a, "_open", self.open_), patch.object(a.time, "time", return_value=1000.0 + 3600 - 30):
            a.handle("/agroapi/bioinsumos", {"q": "Beauveria"})
        self.assertEqual(len(self.tokens), 2, "a um minuto de vencer, pede outro")
        self.assertEqual(self.calls[-1].get_header("Authorization"), "Bearer tok-2")
        self.assertEqual(a.status()["auth"], "client_credentials")
        self.assertTrue(all(a.status()["configured"].values()))
        self.assertNotIn("segredo-app", json.dumps(a.status()))
    def test_revoked_token_is_renewed_once(self):
        self.api_401 = 1
        with patch.object(a, "_open", self.open_):
            a.handle("/agroapi/bioinsumos", {})
        self.assertEqual(len(self.tokens), 2)
        self.assertEqual(self.calls[-1].get_header("Authorization"), "Bearer tok-2")
        a._cache.clear(); self.api_401 = 5
        with patch.object(a, "_open", self.open_):
            with self.assertRaises(a.AgroAPIError) as caught:
                a.handle("/agroapi/bioinsumos", {"q": "outro"})
        self.assertEqual(caught.exception.code, "agroapi_access")
        self.assertEqual(len(self.tokens), 3, "tenta de novo uma vez só, sem laço")
    def test_rejected_key_does_not_leak_secret(self):
        erro = urllib.error.HTTPError(a.TOKEN_URL, 401, "invalid_client", {}, io.BytesIO(b'{"error":"invalid_client"}'))
        with patch.object(a, "_open", side_effect=erro):
            with self.assertRaises(a.AgroAPIError) as caught:
                a.handle("/agroapi/agritec/municipios", {"uf": "SP"})
        self.assertEqual((caught.exception.status, caught.exception.code), (503, "agroapi_access"))
        self.assertNotIn("segredo", str(caught.exception)); self.assertNotIn("chave-app", str(caught.exception))
        self.assertEqual(len(a._cache), 0)
        for corpo in [b"<html>", b'{"token_type":"Bearer"}', b'{"access_token":"com espaco","expires_in":3600}']:
            a._app_token.update(value=None, exp=0.0)
            with patch.object(a, "_open", return_value=Response(None, raw=corpo)):
                with self.assertRaises(a.AgroAPIError):
                    a.handle("/agroapi/agritec/municipios", {"uf": "SP"})


class Concurrency(unittest.TestCase):
    """Uma consulta lenta não segura as outras; a mesma consulta vai uma vez só."""
    def setUp(self):
        a._cache.clear(); a._inflight.clear()
        self.env = patch.dict(os.environ, {"AGROAPI_TOKEN": "token-de-teste"}, clear=True)
        self.env.start()
    def tearDown(self):
        self.env.stop(); a._cache.clear(); a._inflight.clear()
    def test_slow_query_does_not_block_cached_ones_and_same_query_goes_once(self):
        with patch.object(a, "_open", return_value=Response([{"numero_registro": "1"}])):
            a.handle("/agroapi/bioinsumos", {"q": "rapida"})
        entrou, solta, chamadas = threading.Event(), threading.Event(), []
        def lento(req):
            chamadas.append(req.full_url); entrou.set(); solta.wait(3)
            return Response([])
        resultados = []
        with patch.object(a, "_open", lento):
            fios = [threading.Thread(target=lambda: resultados.append(a.handle("/agroapi/bioinsumos", {"q": "lenta"}))) for _ in range(4)]
            for f in fios: f.start()
            self.assertTrue(entrou.wait(2))
            inicio = time.monotonic()
            r = a.handle("/agroapi/bioinsumos", {"q": "rapida"})
            self.assertLess(time.monotonic() - inicio, 0.5, "a consulta já em cache não espera a lenta")
            self.assertEqual(r["data"], [{"numero_registro": "1"}])
            solta.set()
            for f in fios: f.join(3)
        self.assertEqual(len(chamadas), 1, "quatro pessoas, uma ida à Embrapa")
        self.assertEqual(len(resultados), 4)
    def test_failure_reaches_everyone_waiting_without_repeating_the_wait(self):
        entrou, solta, chamadas, erros = threading.Event(), threading.Event(), [], []
        def caiu(req):
            chamadas.append(1); entrou.set(); solta.wait(3)
            raise urllib.error.HTTPError(req.full_url, 500, "erro", {}, io.BytesIO(b""))
        def consulta():
            try: a.handle("/agroapi/bioinsumos", {"q": "x"})
            except a.AgroAPIError as e: erros.append(e.code)
        with patch.object(a, "_open", caiu):
            fios = [threading.Thread(target=consulta) for _ in range(3)]
            fios[0].start(); self.assertTrue(entrou.wait(2))
            for f in fios[1:]: f.start()
            time.sleep(0.05); solta.set()
            for f in fios: f.join(3)
        self.assertEqual(len(chamadas), 1)
        self.assertEqual(erros, ["agroapi_unavailable"] * 3)
        self.assertEqual(len(a._cache), 0)


class ProxyIntegration(unittest.TestCase):
    def test_login_before_provider_and_sanitized_errors(self):
        spec = importlib.util.spec_from_file_location("proxy_agroapi_test", os.path.join(ROOT, "ndvi-proxy.py"))
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        from http.server import HTTPServer
        server = HTTPServer(("127.0.0.1", 0), m.H)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        url = "http://127.0.0.1:%s/agroapi/bioinsumos" % server.server_port
        try:
            with patch.object(m, "autorizar", return_value=(401, "sem_token")), patch.object(m.agroapi_backend, "handle") as call:
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    urllib.request.urlopen(url)
                self.assertEqual(caught.exception.code, 401)
                call.assert_not_called()
            with patch.object(m, "autorizar", return_value=None), patch.object(m.agroapi_backend, "handle", side_effect=a.AgroAPIError("Não ativado", 503, "agroapi_not_configured")):
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    urllib.request.urlopen(url)
                self.assertEqual(json.loads(caught.exception.read())["code"], "agroapi_not_configured")
            with patch.object(m, "autorizar", return_value=None), patch.object(m.agroapi_backend, "handle", side_effect=RuntimeError("segredo interno")):
                with self.assertRaises(urllib.error.HTTPError) as caught:
                    urllib.request.urlopen(url)
                self.assertNotIn("segredo", caught.exception.read().decode())
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

if __name__ == "__main__":
    unittest.main()
