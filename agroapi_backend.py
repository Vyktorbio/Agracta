"""AgroAPI Embrapa: Bioinsumos v2, Agritec v2 e ClimAPI v1.

A credencial da aplicação fica somente no servidor. O ndvi-proxy autentica
o membro Agracta antes de chamar este módulo. Não aceita URLs do cliente.

Credencial: o caminho recomendado é a chave e o segredo da aplicação
(AGROAPI_CONSUMER_KEY / AGROAPI_CONSUMER_SECRET). Com eles o servidor pede o
token à Embrapa (fluxo client_credentials) e pede outro antes de vencer — o
token da AgroAPI vale 1 h por padrão, e um token colado à mão parava de
funcionar sem aviso. Os tokens fixos (AGROAPI_*_TOKEN) continuam aceitos.
"""
import base64
import datetime as dt
import hashlib
import json
import math
import os
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import OrderedDict

VERSION = 1
BASE = {
    "bioinsumos": "https://api.cnptia.embrapa.br/bioinsumos/v2",
    "agritec": "https://api.cnptia.embrapa.br/agritec/v2",
    "climapi": "https://api.cnptia.embrapa.br/climapi/v1",
}
ENV = {
    "bioinsumos": "AGROAPI_BIOINSUMOS_TOKEN",
    "agritec": "AGROAPI_AGRITEC_TOKEN",
    "climapi": "AGROAPI_CLIMAPI_TOKEN",
}
VARIABLES = {
    "dpt2m", "apcpsfc", "gustsfc", "hcdchcll", "lcdclcll", "mcdcmcll",
    "pevprsfc", "rh2m", "soill0_10cm", "soill10_40cm", "soill40_100cm",
    "sunsdsfc", "tmax2m", "tmin2m", "tmpsfc", "ugrd10m", "vgrd10m",
}
TOKEN_URL = "https://api.cnptia.embrapa.br/token"
UFS = set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split())
MAX_BYTES = 2 * 1024 * 1024
MAX_CACHE_BYTES = 16 * 1024 * 1024
_cache = OrderedDict()
_lock = threading.Lock()
_inflight = {}                     # chave -> _EmCurso: uma consulta por chave
_app_token = {"value": None, "exp": 0.0, "key": None}
_token_lock = threading.Lock()


class AgroAPIError(Exception):
    def __init__(self, message, status=502, code="agroapi_unavailable"):
        super().__init__(message)
        self.status = status
        self.code = code


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # urllib pode reenviar Authorization para outro host num redirecionamento.
        raise AgroAPIError("A Embrapa redirecionou a consulta. Tente novamente mais tarde.")


_opener = urllib.request.build_opener(NoRedirect())


def _open(req):
    return _opener.open(req, timeout=20)


def _consumer():
    key = (os.environ.get("AGROAPI_CONSUMER_KEY") or "").strip()
    secret = (os.environ.get("AGROAPI_CONSUMER_SECRET") or "").strip()
    return (key, secret) if key and secret else (None, None)


def _app_access_token(force=False):
    """Token da aplicação pela chave/segredo; renovado antes de vencer."""
    key, secret = _consumer()
    if not key:
        raise AgroAPIError("Esta consulta da Embrapa ainda não foi ativada para a equipe.", 503, "agroapi_not_configured")
    with _token_lock:
        now = time.time()
        if not force and _app_token["value"] and _app_token["key"] == key and now < _app_token["exp"]:
            return _app_token["value"]
        basic = base64.b64encode((key + ":" + secret).encode("utf-8")).decode("ascii")
        req = urllib.request.Request(TOKEN_URL, data=b"grant_type=client_credentials", method="POST", headers={
            "Authorization": "Basic " + basic,
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
            "User-Agent": "Agracta-AgroAPI/1",
        })
        try:
            with _open(req) as response:
                raw = response.read(65537)
            if len(raw) > 65536:
                raise ValueError()
            data = json.loads(raw.decode("utf-8"))
            token = data["access_token"]
            ttl = float(data.get("expires_in", 3600))
            if (not isinstance(token, str) or not token or len(token) > 8192 or not math.isfinite(ttl)
                    or any(ord(c) < 33 or ord(c) == 127 for c in token)):
                raise ValueError()
        except urllib.error.HTTPError as exc:
            if exc.code in (400, 401, 403):
                raise AgroAPIError("A Embrapa recusou a chave da aplicação. Quem administra o Agracta precisa conferir a credencial no servidor.",
                                   503, "agroapi_access") from None
            raise AgroAPIError("O serviço de acesso da Embrapa está indisponível. Tente novamente mais tarde.") from None
        except AgroAPIError:
            raise
        except (ValueError, KeyError, TypeError, UnicodeError, AttributeError):
            raise AgroAPIError("A Embrapa não devolveu um acesso válido. Tente novamente mais tarde.") from None
        except Exception:
            raise AgroAPIError("Não foi possível conectar à Embrapa. Tente novamente mais tarde.") from None
        # Pede o próximo um minuto antes de este vencer (e nunca guarda por mais de um dia).
        _app_token.update(value=token, key=key, exp=now + max(30.0, min(ttl, 86400.0) - 60.0))
        return token


def _identity(service):
    """De onde vem o acesso, sem rede: ("app", chave) ou ("token", token fixo)."""
    key, _ = _consumer()
    if key:
        return "app", key
    return "token", _token(service)


def _token(service):
    token = (os.environ.get(ENV[service]) or os.environ.get("AGROAPI_TOKEN") or "").strip()
    if not token:
        raise AgroAPIError("Esta consulta da Embrapa ainda não foi ativada para a equipe.", 503, "agroapi_not_configured")
    if len(token) > 8192 or any(ord(c) < 32 or ord(c) == 127 for c in token):
        raise AgroAPIError("O acesso da equipe à Embrapa precisa ser atualizado.", 503, "agroapi_access")
    return token


def status():
    app = bool(_consumer()[0])
    return {"version": VERSION, "auth": "client_credentials" if app else "token", "configured": {
        s: app or bool((os.environ.get(ENV[s]) or os.environ.get("AGROAPI_TOKEN") or "").strip())
        for s in BASE
    }}


def _invalid():
    raise AgroAPIError("Confira os campos da consulta.", 400, "agroapi_parameters")


def _only(q, allowed):
    if set(q) - set(allowed):
        _invalid()


def _text(value, limit=160):
    if not isinstance(value, str) or len(value) > limit or any(ord(c) < 32 for c in value):
        _invalid()
    return value.strip()


def _integer(value, minimum=1, maximum=1000000):
    if not re.fullmatch(r"[0-9]{1,8}", str(value or "")):
        _invalid()
    n = int(value)
    if not minimum <= n <= maximum:
        _invalid()
    return n


def _ibge(value):
    s = str(value or "")
    if not re.fullmatch(r"[0-9]{7}", s):
        _invalid()
    return s


def _header_int(headers, name):
    v = str(headers.get(name, ""))
    return int(v) if re.fullmatch(r"[0-9]{1,9}", v) else None


def _constant(_):
    raise ValueError("non-finite JSON")


class _EmCurso:
    """Consulta já a caminho da Embrapa: quem chega depois espera por ela."""
    def __init__(self):
        self.pronto = threading.Event()
        self.erro = None


def _fetch(service, path, params=None, ttl=1200):
    kind, ident = _identity(service)
    params = params or {}
    query = urllib.parse.urlencode(sorted(params.items()))
    url = BASE[service] + path + ("?" + query if query else "")
    fingerprint = hashlib.sha256((kind + ":" + ident).encode("utf-8")).digest()
    key = (service, path, query, fingerprint)
    # Uma consulta por chave, mesmo quando várias pessoas abrem ao mesmo tempo.
    # A trava só protege o cache: a rede corre fora dela, senão uma consulta
    # lenta (até 20 s) segurava todas as outras — até as que já estavam no cache.
    while True:
        with _lock:
            now = time.time()
            for k in list(_cache):
                if _cache[k][0] <= now:
                    del _cache[k]
            if key in _cache:
                _cache.move_to_end(key)
                return _cache[key][1]
            busca = _inflight.get(key)
            dono = busca is None
            if dono:
                busca = _inflight[key] = _EmCurso()
        if dono:
            break
        if not busca.pronto.wait(25):
            raise AgroAPIError("A Embrapa está demorando a responder. Tente novamente.", 504)
        if busca.erro is not None:
            raise busca.erro          # a mesma falha, sem repetir a espera de cada um
    try:
        result, size = _request(service, url, kind, ident)
        with _lock:
            _cache[key] = (time.time() + ttl, result, size)
            while len(_cache) > 64 or sum(v[2] for v in _cache.values()) > MAX_CACHE_BYTES:
                _cache.popitem(last=False)
        return result
    except AgroAPIError as exc:
        busca.erro = exc
        raise
    except Exception:
        busca.erro = AgroAPIError("Não foi possível concluir a consulta na Embrapa.")
        raise busca.erro from None
    finally:
        with _lock:
            _inflight.pop(key, None)
        busca.pronto.set()


def _request(service, url, kind, ident, renovado=False):
    """Uma ida à Embrapa. Falhas nunca entram no cache (quem decide é _fetch)."""
    token = _app_access_token(force=renovado) if kind == "app" else ident
    req = urllib.request.Request(url, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
        "User-Agent": "Agracta-AgroAPI/1",
    })
    try:
        with _open(req) as response:
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                raise AgroAPIError("A resposta da Embrapa excedeu o limite desta consulta.")
            if "json" not in response.headers.get("Content-Type", "").lower():
                raise AgroAPIError("A Embrapa não devolveu os dados esperados.")
            payload = json.loads(raw.decode("utf-8"), parse_constant=_constant)
            if not isinstance(payload, (dict, list)):
                raise AgroAPIError("A Embrapa não devolveu os dados esperados.")
            if isinstance(payload, dict) and (payload.get("error") or payload.get("fault")):
                raise AgroAPIError("Não foi possível concluir a consulta na Embrapa.")
            if service == "bioinsumos" and not isinstance(payload, list):
                raise AgroAPIError("O formato do catálogo Bioinsumos mudou. Tente novamente mais tarde.")
            if service == "agritec" and (not isinstance(payload, dict) or not isinstance(payload.get("data"), (list, dict))):
                raise AgroAPIError("O formato dos dados Agritec mudou. Tente novamente mais tarde.")
            paging = {
                "pages": _header_int(response.headers, "X-Pages"),
                "total": _header_int(response.headers, "X-Records-Count"),
                "pageSize": _header_int(response.headers, "X-Page-Size"),
            }
    except urllib.error.HTTPError as exc:
        # Nunca encaminhar corpo, cabeçalhos ou detalhes de autenticação.
        if exc.code == 401 and kind == "app" and not renovado:
            # Token revogado ou vencido antes da hora: pede outro e tenta uma vez.
            return _request(service, url, kind, ident, renovado=True)
        if exc.code in (401, 403):
            raise AgroAPIError("O acesso da equipe à Embrapa precisa ser atualizado ou liberado para este serviço.", 503, "agroapi_access") from None
        if exc.code == 429:
            raise AgroAPIError("O limite de consultas da Embrapa foi atingido. Tente novamente mais tarde.", 429, "agroapi_quota") from None
        if exc.code == 400:
            raise AgroAPIError("A Embrapa não aceitou os campos desta consulta.", 400, "agroapi_parameters") from None
        raise AgroAPIError("O serviço da Embrapa está indisponível. Tente novamente mais tarde.") from None
    except AgroAPIError:
        raise
    except (ValueError, UnicodeError):
        raise AgroAPIError("A Embrapa não devolveu os dados esperados.") from None
    except Exception:
        raise AgroAPIError("Não foi possível conectar à Embrapa. Tente novamente mais tarde.") from None
    result = {
        "data": payload,
        "pagination": paging,
        "source": "Embrapa · " + {"bioinsumos": "Bioinsumos v2", "agritec": "Agritec v2 / ZARC", "climapi": "ClimAPI v1 / GFS"}[service],
        "queriedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    return result, len(raw)


def _agritec(path, params=None, ttl=3600):
    result = dict(_fetch("agritec", path, params, ttl))
    payload = result["data"]
    if not isinstance(payload, dict) or not isinstance(payload.get("data"), (list, dict)):
        raise AgroAPIError("O formato dos dados Agritec mudou. Tente novamente mais tarde.")
    result["data"] = payload["data"]
    result["meta"] = payload.get("meta") or {}
    return result


def _variable(q):
    v = q.get("variavel", "tmax2m")
    if v not in VARIABLES:
        _invalid()
    return v


def handle(path, q):
    if path == "/agroapi/status":
        _only(q, [])
        return status()
    if path == "/agroapi/bioinsumos":
        _only(q, ["tipo", "q", "cultura", "page"])
        category = q.get("tipo", "produtos-biologicos")
        if category not in ("produtos-biologicos", "inoculantes"):
            _invalid()
        page = _integer(q.get("page", "1"), maximum=1000)
        params = {"page": str(page)}
        for name in ("q", "cultura"):
            value = _text(q.get(name, ""))
            if value:
                params[name] = value
        result = dict(_fetch("bioinsumos", "/search/" + category, params))
        if not isinstance(result["data"], list):
            raise AgroAPIError("O formato do catálogo Bioinsumos mudou. Tente novamente mais tarde.")
        result["pagination"] = dict(result["pagination"], page=page)
        result["category"] = category
        return result
    if path == "/agroapi/agritec/municipios":
        _only(q, ["uf"])
        uf = str(q.get("uf", "")).upper()
        if uf not in UFS:
            _invalid()
        return _agritec("/municipios", {"uf": uf}, 86400)
    if path == "/agroapi/agritec/culturas":
        _only(q, ["codigoIBGE"])
        ibge = _ibge(q.get("codigoIBGE"))
        return _agritec("/municipios/" + ibge + "/culturas", ttl=86400)
    if path == "/agroapi/agritec/zoneamento":
        _only(q, ["codigoIBGE", "idCultura", "risco"])
        ibge = _ibge(q.get("codigoIBGE"))
        culture = _integer(q.get("idCultura"))
        risk = q.get("risco", "20")
        if risk not in ("20", "30", "40", "todos"):
            _invalid()
        return _agritec("/zoneamento", {"codigoIBGE": ibge, "idCultura": str(culture), "risco": risk})
    if path == "/agroapi/agritec/informacoes":
        _only(q, ["codigoIBGE", "idCultura"])
        ibge = _ibge(q.get("codigoIBGE"))
        culture = _integer(q.get("idCultura"))
        return _agritec("/zoneamento/municipios/" + ibge + "/culturas/" + str(culture) + "/informacoes-adicionais")
    if path == "/agroapi/climapi/datas":
        _only(q, ["variavel"])
        variable = _variable(q)
        result = dict(_fetch("climapi", "/ncep-gfs/" + variable, ttl=3600))
        result["variable"] = variable
        return result
    if path == "/agroapi/climapi/serie":
        _only(q, ["variavel", "data", "lat", "lng"])
        variable = _variable(q)
        date = q.get("data", "")
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", date):
            _invalid()
        try:
            dt.date.fromisoformat(date)
            lat, lng = float(q.get("lat", "")), float(q.get("lng", ""))
        except (ValueError, TypeError):
            _invalid()
        if not math.isfinite(lat) or not math.isfinite(lng) or not (-35 <= lat <= 6 and -75 <= lng <= -33):
            raise AgroAPIError("A ClimAPI atende coordenadas do território brasileiro.", 400, "agroapi_parameters")
        # A ordem documentada é LONGITUDE / LATITUDE.
        lat_s, lng_s = "%.4f" % lat, "%.4f" % lng
        result = dict(_fetch("climapi", "/ncep-gfs/" + variable + "/" + date + "/" + lng_s + "/" + lat_s, ttl=3600))
        result.update({"variable": variable, "modelDate": date, "coordinates": [lat, lng]})
        return result
    raise AgroAPIError("Consulta da Embrapa não encontrada.", 404, "agroapi_route")
