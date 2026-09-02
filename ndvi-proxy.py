#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Proxy local NDVI/NDRE/GNDVI — Estação Iracemápolis
==================================================
Conversa com o Sentinel Hub (Copernicus Data Space Ecosystem) usando SUA credencial,
sem expor o segredo no navegador. Usa só a biblioteca padrão do Python (nada pra instalar).

COMO USAR
---------
1) Crie a conta gratuita em https://dataspace.copernicus.eu  e gere um OAuth client em
   https://shapps.dataspace.copernicus.eu/dashboard  (User settings -> OAuth clients).
2) Crie um arquivo  ndvi-credenciais.json  nesta mesma pasta, assim:
       { "client_id": "SEU_CLIENT_ID", "client_secret": "SEU_CLIENT_SECRET" }
   (ou defina as variáveis de ambiente SH_CLIENT_ID e SH_CLIENT_SECRET)
3) Rode:   python3 ndvi-proxy.py
4) Deixe rodando e abra o app (index.html). Pronto.

Endpoints (uso interno do app):
  GET /health
  GET /dates?bbox=w,s,e,n&from=YYYY-MM-DD&to=YYYY-MM-DD
  GET /index?index=NDVI|NDRE|GNDVI&date=YYYY-MM-DD&bbox=w,s,e,n&width=1024
  GET /stats?index=NDVI&from=YYYY-MM-DD&to=YYYY-MM-DD&geom=<GeoJSON urlencoded>
  GET /solo?lat=..&lng=..            (classe de solo no ponto — Embrapa GeoInfo)
  GET /solo?geom=<GeoJSON urlencoded> (unidades sob a quadra, com % de area de cada)
  GET /solo/propriedades?lat=..&lng=..  (argila/areia/silte/pH/COS/CTC — SoilGrids)
  GET /solo/mapa?bbox=w,s,e,n&width=1024 (PNG do mapa pedologico, para recortar no app)
"""
import json, math, os, re, time, urllib.request, urllib.parse, urllib.error
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8799"))
HOST = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"  # nuvem (Render) usa $PORT e 0.0.0.0; local fica em 127.0.0.1
HERE = os.path.dirname(os.path.abspath(__file__))

# CORS: só o app pode usar o proxy pelo navegador (protege a cota Sentinel/Ecowitt).
# Para liberar outra origem sem mexer no código: env ALLOWED_ORIGINS="https://a.com,https://b.com" (soma às padrão).
ALLOWED_ORIGINS = {
    "https://www.agracta.com.br",
    "https://agracta.com.br",
    "https://vyktorbio.github.io",
}
ALLOWED_ORIGINS |= {o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "").split(",") if o.strip()}

def origin_permitida(origin):
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS:
        return True
    # desenvolvimento local (qualquer porta)
    return origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:") \
        or origin in ("http://localhost", "http://127.0.0.1")
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
PROCESS_URL = "https://sh.dataspace.copernicus.eu/process/v1"
STATS_URL   = "https://sh.dataspace.copernicus.eu/statistics/v1"
CATALOG_URL = "https://sh.dataspace.copernicus.eu/catalog/v1/search"
CRS84 = "http://www.opengis.net/def/crs/OGC/1.3/CRS84"

# ---------------------------------------------------------------- credenciais
def load_creds():
    cid = os.environ.get("SH_CLIENT_ID")
    csec = os.environ.get("SH_CLIENT_SECRET")
    if cid and csec:
        return cid, csec
    p = os.path.join(HERE, "ndvi-credenciais.json")
    if os.path.exists(p):
        try:
            d = json.load(open(p, encoding="utf-8"))
            return d.get("client_id"), d.get("client_secret")
        except Exception as e:
            print("Erro lendo ndvi-credenciais.json:", e)
    return None, None

_token = {"value": None, "exp": 0}
def get_token():
    if _token["value"] and time.time() < _token["exp"] - 60:
        return _token["value"]
    cid, csec = load_creds()
    if not cid or not csec:
        raise RuntimeError("SEM_CREDENCIAL")
    body = urllib.parse.urlencode({
        "grant_type": "client_credentials",
        "client_id": cid,
        "client_secret": csec,
    }).encode()
    req = urllib.request.Request(TOKEN_URL, data=body,
                                 headers={"Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    _token["value"] = d["access_token"]
    _token["exp"] = time.time() + int(d.get("expires_in", 600))
    return _token["value"]

# ---------------------------------------------------------------- evalscripts
def index_formula(index):
    index = (index or "NDVI").upper()
    if index == "GNDVI":
        return "(s.B08 - s.B03) / (s.B08 + s.B03)"
    if index == "NDRE":
        return "(s.B08 - s.B05) / (s.B08 + s.B05)"
    if index == "NDMI":  # umidade da vegetacao (SWIR B11)
        return "(s.B08 - s.B11) / (s.B08 + s.B11)"
    return "(s.B08 - s.B04) / (s.B08 + s.B04)"  # NDVI

# máscara de nuvem via SCL (Scene Classification): 0 no-data,1 saturated,3 shadow,8/9 cloud,10 cirrus,11 snow
CLOUD_MASK = "(s.SCL===0||s.SCL===1||s.SCL===3||s.SCL===8||s.SCL===9||s.SCL===10||s.SCL===11)"

def evalscript_image(index):
    return """//VERSION=3
function setup(){ return { input:["B03","B04","B05","B08","B11","SCL","dataMask"], output:{bands:4} }; }
function ramp(v){
  // paleta tipo vegetacao: marrom -> vermelho -> amarelo -> verde claro -> verde escuro
  var stops=[[-0.2,[0.4,0.27,0.18]],[0.0,[0.66,0.27,0.14]],[0.2,[0.9,0.45,0.2]],
             [0.35,[0.95,0.85,0.35]],[0.5,[0.7,0.85,0.35]],[0.65,[0.35,0.72,0.27]],
             [0.8,[0.12,0.5,0.18]],[0.95,[0.0,0.3,0.08]]];
  if(v<=stops[0][0]) return stops[0][1];
  for(var i=1;i<stops.length;i++){
    if(v<=stops[i][0]){ var t=(v-stops[i-1][0])/(stops[i][0]-stops[i-1][0]);
      var a=stops[i-1][1],b=stops[i][1];
      return [a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])]; } }
  return stops[stops.length-1][1];
}
function evaluatePixel(s){
  if(s.dataMask===0 || %CLOUD%) return [0,0,0,0];
  var v=%FORMULA%;
  var c=ramp(v);
  return [c[0],c[1],c[2],1];
}
""".replace("%FORMULA%", index_formula(index)).replace("%CLOUD%", CLOUD_MASK)

def evalscript_truecolor():
    # Cor real recente (sem mascara de nuvem — para ver a imagem atual do terreno)
    return ("//VERSION=3\n"
        "function setup(){ return { input:[\"B02\",\"B03\",\"B04\",\"dataMask\"], output:{bands:4} }; }\n"
        "function evaluatePixel(s){ if(s.dataMask===0) return [0,0,0,0];\n"
        "  var g=2.8; return [Math.min(1,s.B04*g), Math.min(1,s.B03*g), Math.min(1,s.B02*g), 1]; }")

def evalscript_stats(index):
    return """//VERSION=3
function setup(){ return { input:[{bands:["B03","B04","B05","B08","B11","SCL","dataMask"]}],
  output:[{id:"idx",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}] }; }
function evaluatePixel(s){
  var bad = (s.dataMask===0 || %CLOUD%);
  var v = %FORMULA%;
  return { idx:[v], dataMask:[bad?0:1] };
}
""".replace("%FORMULA%", index_formula(index)).replace("%CLOUD%", CLOUD_MASK)

# ---------------------------------------------------------------- chamadas API
def api_post(url, payload, accept):
    token = get_token()
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "Accept": accept,
    })
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read(), r.headers.get("Content-Type", accept)

def evalscript_raw(index):
    # 2 bandas: L = (indice+1)/2 (0..1 -> 0..255), A = valido(1)/invalido(0). Para medir por quadra no app.
    return ("//VERSION=3\n"
        "function setup(){ return { input:[\"B03\",\"B04\",\"B05\",\"B08\",\"B11\",\"SCL\",\"dataMask\"], output:{bands:2} }; }\n"
        "function evaluatePixel(s){ if(s.dataMask===0 || " + CLOUD_MASK + ") return [0,0];\n"
        "  var v=" + index_formula(index) + "; if(v<-1)v=-1; if(v>1)v=1; return [(v+1)/2, 1]; }")

def do_index(index, date, bbox, width, geometry=None, raw=False):
    w, s, e, n = bbox
    width = max(64, min(2500, int(width or 1024)))
    height = max(64, min(2500, int(round(width * (n - s) / (e - w))))) if e != w else width
    from datetime import datetime, timedelta
    try:
        d0 = datetime.strptime(date, "%Y-%m-%d")
        frm = (d0 - timedelta(days=3)).strftime("%Y-%m-%d")
        to2 = (d0 + timedelta(days=3)).strftime("%Y-%m-%d")
    except Exception:
        frm = date; to2 = date
    payload = {
        "input": {
            "bounds": {"bbox": [w, s, e, n], "properties": {"crs": CRS84}},
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {"from": frm + "T00:00:00Z", "to": to2 + "T23:59:59Z"},
                    "mosaickingOrder": "leastCC",
                },
            }],
        },
        "output": {"width": width, "height": height,
                   "responses": [{"identifier": "default", "format": {"type": "image/png"}}]},
        "evalscript": (evalscript_raw(index) if raw
                       else (evalscript_truecolor() if (index or "").upper() == "TRUECOLOR"
                             else evalscript_image(index))),
    }
    if geometry:
        payload["input"]["bounds"]["geometry"] = geometry  # recorta o índice só dentro das quadras
    return api_post(PROCESS_URL, payload, "image/png")

def do_stats(index, frm, to, geometry):
    payload = {
        "input": {
            "bounds": {"geometry": geometry, "properties": {"crs": CRS84}},
            "data": [{"type": "sentinel-2-l2a",
                      "dataFilter": {"mosaickingOrder": "leastCC"}}],
        },
        "aggregation": {
            "timeRange": {"from": frm + "T00:00:00Z", "to": to + "T23:59:59Z"},
            "aggregationInterval": {"of": "P5D"},
            "evalscript": evalscript_stats(index),
            "resx": 10, "resy": 10,
        },
        "calculations": {"idx": {"statistics": {"default": {}}}},
    }
    raw, _ = api_post(STATS_URL, payload, "application/json")
    d = json.loads(raw.decode())
    out = []
    for it in d.get("data", []):
        interval = it.get("interval", {})
        stt = (((((it.get("outputs") or {}).get("idx") or {}).get("bands") or {}).get("B0") or {}).get("stats") or {})
        if not stt or stt.get("sampleCount", 0) == 0 or stt.get("mean") is None:
            continue
        if stt.get("sampleCount", 0) - stt.get("noDataCount", 0) <= 0:
            continue
        out.append({
            "date": (interval.get("from", "") or "")[:10],
            "mean": round(stt.get("mean"), 4),
            "min": round(stt.get("min", 0), 4),
            "max": round(stt.get("max", 0), 4),
        })
    return out

def do_point(lat, lng, date):
    import math
    from datetime import datetime, timedelta
    dlat = 12.0 / 110540.0
    dlng = 12.0 / (111320.0 * math.cos(lat * math.pi / 180))
    poly = {"type": "Polygon", "coordinates": [[[lng - dlng, lat - dlat], [lng + dlng, lat - dlat],
            [lng + dlng, lat + dlat], [lng - dlng, lat + dlat], [lng - dlng, lat - dlat]]]}
    try:
        d0 = datetime.strptime(date, "%Y-%m-%d")
        frm = (d0 - timedelta(days=3)).strftime("%Y-%m-%d")
        to = (d0 + timedelta(days=4)).strftime("%Y-%m-%d")
    except Exception:
        frm = date; to = date
    evalscript = ("//VERSION=3\n"
        "function setup(){ return { input:[{bands:[\"B03\",\"B04\",\"B05\",\"B08\",\"B11\",\"SCL\",\"dataMask\"]}], "
        "output:[{id:\"ndvi\",bands:1,sampleType:\"FLOAT32\"},{id:\"ndre\",bands:1,sampleType:\"FLOAT32\"},"
        "{id:\"gndvi\",bands:1,sampleType:\"FLOAT32\"},{id:\"ndmi\",bands:1,sampleType:\"FLOAT32\"},{id:\"dataMask\",bands:1}] }; }\n"
        "function evaluatePixel(s){ var bad=(s.dataMask===0||" + CLOUD_MASK + ");\n"
        "  return { ndvi:[(s.B08-s.B04)/(s.B08+s.B04)], ndre:[(s.B08-s.B05)/(s.B08+s.B05)], "
        "gndvi:[(s.B08-s.B03)/(s.B08+s.B03)], ndmi:[(s.B08-s.B11)/(s.B08+s.B11)], dataMask:[bad?0:1] }; }")
    payload = {
        "input": {"bounds": {"geometry": poly, "properties": {"crs": CRS84}},
                  "data": [{"type": "sentinel-2-l2a", "dataFilter": {"mosaickingOrder": "leastCC"}}]},
        "aggregation": {"timeRange": {"from": frm + "T00:00:00Z", "to": to + "T23:59:59Z"},
                        "aggregationInterval": {"of": "P7D"}, "evalscript": evalscript, "resx": 10, "resy": 10},
        "calculations": {"ndvi": {"statistics": {"default": {}}}, "ndre": {"statistics": {"default": {}}},
                         "gndvi": {"statistics": {"default": {}}}, "ndmi": {"statistics": {"default": {}}}},
    }
    raw, _ = api_post(STATS_URL, payload, "application/json")
    d = json.loads(raw.decode())
    res = {"ndvi": None, "ndre": None, "gndvi": None, "ndmi": None, "date": None}
    for it in d.get("data", []):
        outs = it.get("outputs", {}); ok = False
        for k in ["ndvi", "ndre", "gndvi", "ndmi"]:
            st = (((outs.get(k, {}) or {}).get("bands", {}) or {}).get("B0", {}) or {}).get("stats", {})
            if st and (st.get("sampleCount", 0) - st.get("noDataCount", 0)) > 0 and st.get("mean") is not None:
                res[k] = round(st.get("mean"), 3); ok = True
        if ok:
            res["date"] = (it.get("interval", {}).get("from", "") or "")[:10]; break
    return res

def do_dates(bbox, frm, to):
    # Datas com imagem via Statistical API (mais confiavel que o catalog): dias com pixels validos.
    w, s, e, n = bbox
    poly = {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]}
    evalscript = ("//VERSION=3\n"
        "function setup(){ return { input:[{bands:[\"SCL\",\"dataMask\"]}], "
        "output:[{id:\"idx\",bands:1,sampleType:\"FLOAT32\"},{id:\"dataMask\",bands:1}] }; }\n"
        "function evaluatePixel(s){ var bad=(s.dataMask===0||" + CLOUD_MASK + "); return { idx:[1], dataMask:[bad?0:1] }; }")
    payload = {
        "input": {"bounds": {"geometry": poly, "properties": {"crs": CRS84}},
                  "data": [{"type": "sentinel-2-l2a"}]},
        "aggregation": {"timeRange": {"from": frm + "T00:00:00Z", "to": to + "T23:59:59Z"},
                        "aggregationInterval": {"of": "P1D"},
                        "evalscript": evalscript, "resx": 60, "resy": 60},
        "calculations": {"idx": {"statistics": {"default": {}}}},
    }
    # resx/resy estao em graus (CRS84). ~0.0045 deg ~= 500 m/px: bem abaixo do limite de 1500 m/px
    # da colecao S2L2A e suficiente para detectar disponibilidade/nuvem em qualquer area.
    payload["aggregation"]["resx"] = min(0.0045, max(1e-5, e - w))
    payload["aggregation"]["resy"] = min(0.0045, max(1e-5, n - s))
    raw, _ = api_post(STATS_URL, payload, "application/json")
    d = json.loads(raw.decode())
    best = {}
    for it in d.get("data", []):
        dt = (it.get("interval", {}).get("from", "") or "")[:10]
        st = (((((it.get("outputs") or {}).get("idx") or {}).get("bands") or {}).get("B0") or {}).get("stats") or {})
        sc = st.get("sampleCount", 0); nd = st.get("noDataCount", 0)
        if not dt or (sc - nd) <= 0:
            continue
        cloud = round((nd / sc) * 100) if sc else None
        if dt not in best or (cloud is not None and (best[dt] is None or cloud < best[dt])):
            best[dt] = cloud
    return [{"date": k, "cloud": best[k]} for k in sorted(best.keys(), reverse=True)]

# ---------------------------------------------------------------- Ecowitt (estação meteorológica)
ECOWITT_BASE = "https://api.ecowitt.net/api/v3"

def load_ecowitt():
    """Application Key + API Key da Ecowitt. Env (nuvem) ou ecowitt-credenciais.json (local). Segredo nunca no front."""
    app = os.environ.get("ECOWITT_APP_KEY")
    api = os.environ.get("ECOWITT_API_KEY")
    if app and api:
        return app, api
    p = os.path.join(HERE, "ecowitt-credenciais.json")
    if os.path.exists(p):
        try:
            d = json.load(open(p, encoding="utf-8"))
            return (d.get("application_key") or d.get("app_key")), d.get("api_key")
        except Exception as e:
            print("Erro lendo ecowitt-credenciais.json:", e)
    return None, None

def ecowitt_get(path, params):
    app, api = load_ecowitt()
    if not app or not api:
        raise RuntimeError("SEM_ECOWITT")
    qs = dict(params or {})
    qs["application_key"] = app
    qs["api_key"] = api
    url = ECOWITT_BASE + path + "?" + urllib.parse.urlencode(qs)
    req = urllib.request.Request(url, headers={"User-Agent": "iracema-app"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    if d.get("code") != 0:
        raise RuntimeError("ECOWITT:%s:%s" % (d.get("code"), d.get("msg")))
    return d.get("data")

def do_estacoes():
    d = ecowitt_get("/device/list", {"limit": 100}) or {}
    out = []
    for it in (d.get("list", []) if isinstance(d, dict) else []):
        out.append({"name": it.get("name"), "mac": it.get("mac"),
                    "lat": it.get("latitude"), "lng": it.get("longitude"),
                    "type": it.get("stationtype")})
    return out

def _node(n):
    """{time,unit,value} -> {value:float|str, unit:str}; converte value pra número quando dá."""
    if not isinstance(n, dict):
        return None
    v = n.get("value")
    try:
        v = float(v)
    except (TypeError, ValueError):
        pass
    return {"value": v, "unit": n.get("unit", "")}

def do_clima(mac):
    """Tempo real de uma estação, achatado e em unidades métricas."""
    d = ecowitt_get("/device/real_time", {
        "mac": mac, "call_back": "all",
        "temp_unitid": 1, "pressure_unitid": 3,
        "wind_speed_unitid": 7, "rainfall_unitid": 12, "solar_irradiance_unitid": 16,
    }) or {}
    o = d.get("outdoor", {}) or {}
    s = d.get("solar_and_uvi", {}) or {}
    r = d.get("rainfall") or d.get("rainfall_piezo") or {}
    w = d.get("wind", {}) or {}
    p = d.get("pressure", {}) or {}
    out = {
        "mac": mac,
        "temp": _node(o.get("temperature")),
        "feels_like": _node(o.get("feels_like")),
        "dew_point": _node(o.get("dew_point")),
        "humidity": _node(o.get("humidity")),
        "solar": _node(s.get("solar")),
        "uvi": _node(s.get("uvi")),
        "rain_rate": _node(r.get("rain_rate")),
        "rain_day": _node(r.get("daily")),
        "rain_week": _node(r.get("weekly")),
        "rain_month": _node(r.get("monthly")),
        "rain_year": _node(r.get("yearly")),
        "wind_speed": _node(w.get("wind_speed")),
        "wind_gust": _node(w.get("wind_gust")),
        "wind_dir": _node(w.get("wind_direction")),
        "pressure": _node(p.get("relative")),
    }
    # VPD -> kPa. A Ecowitt manda em inHg por padrao (mesmo com pressure_unitid=hPa);
    # convertemos pela UNIDADE informada na resposta p/ ficar robusto a mudancas.
    vpd = _node(o.get("vpd"))
    if vpd and isinstance(vpd.get("value"), (int, float)):
        u = (vpd.get("unit") or "").lower().replace(" ", "")
        val = float(vpd["value"])
        if u in ("hpa", "mbar"):
            kpa = val * 0.1
        elif u == "kpa":
            kpa = val
        elif u in ("mmhg", "torr"):
            kpa = val * 0.133322
        else:  # inHg (padrao Ecowitt) ou unidade ausente
            kpa = val * 3.38639
        out["vpd"] = {"value": round(kpa, 2), "unit": "kPa"}
    else:
        out["vpd"] = vpd
    try:
        out["time"] = int((o.get("temperature") or {}).get("time"))
    except Exception:
        out["time"] = None
    return out

def _hist_values(node):
    """node = {'list': {epoch: val, ...}} (histórico Ecowitt) -> lista de floats."""
    if not isinstance(node, dict):
        return []
    lst = node.get("list") or {}
    vals = []
    for v in (lst.values() if isinstance(lst, dict) else []):
        try:
            vals.append(float(v))
        except (TypeError, ValueError):
            pass
    return vals

def _hist_serie(node):
    """Igual a _hist_values, mas PRESERVA o instante: [(epoch, valor), ...] ordenado.

    A Ecowitt entrega o histórico indexado pelo epoch de cada amostra, e até aqui
    o proxy descartava a chave e devolvia só a média do dia. Para BPL isso não
    serve: uma aplicação das 9:31 precisa da condição DAQUELE momento, não da
    média que mistura a madrugada fria com a tarde quente."""
    if not isinstance(node, dict):
        return []
    lst = node.get("list") or {}
    out = []
    for k, v in (lst.items() if isinstance(lst, dict) else []):
        try:
            out.append((int(k), float(v)))
        except (TypeError, ValueError):
            pass
    out.sort(key=lambda p: p[0])
    return out

def _hist_perto(serie, alvo_epoch, tolerancia_s=1800):
    """Amostra mais próxima do instante pedido. Devolve (valor, epoch, distância_s)
    ou (None, None, None) se a mais próxima estiver além da tolerância — melhor
    não responder do que carimbar um valor de duas horas depois como se fosse o
    do momento da aplicação."""
    if not serie or alvo_epoch is None:
        return (None, None, None)
    melhor = min(serie, key=lambda p: abs(p[0] - alvo_epoch))
    dist = abs(melhor[0] - alvo_epoch)
    if dist > tolerancia_s:
        return (None, None, dist)
    return (melhor[1], melhor[0], dist)

def _hist_unit(node, default):
    return (node.get("unit") if isinstance(node, dict) else None) or default

def do_clima_history(mac, date, hora=None):
    """Histórico de uma estação p/ a data YYYY-MM-DD.

    Sem `hora`: resumo do DIA (média/extremos), como sempre foi.
    Com `hora` (HH:MM): a leitura DAQUELE INSTANTE — é o que BPL pede de uma
    aplicação registrada às 9:31. O resumo do dia continua vindo junto, em
    `dia`, porque chuva acumulada e extremos só fazem sentido no dia inteiro.

    Devolve o MESMO formato do tempo-real (temp/humidity/rain_day/wind_*),
    pra o app tratar igual."""
    start = date + " 00:00:00"
    end = date + " 23:59:59"
    d = ecowitt_get("/device/history", {
        "mac": mac, "start_date": start, "end_date": end,
        "call_back": "outdoor,rainfall,wind,solar_and_uvi",
        "cycle_type": "auto",
        "temp_unitid": 1, "wind_speed_unitid": 7,
        "rainfall_unitid": 12, "solar_irradiance_unitid": 16,
    }) or {}
    o = d.get("outdoor", {}) or {}
    r = d.get("rainfall") or d.get("rainfall_piezo") or {}
    w = d.get("wind", {}) or {}
    s = d.get("solar_and_uvi", {}) or {}
    temps = _hist_values(o.get("temperature"))
    hums = _hist_values(o.get("humidity"))
    dews = _hist_values(o.get("dew_point"))
    winds = _hist_values(w.get("wind_speed"))
    gusts = _hist_values(w.get("wind_gust"))
    solars = _hist_values(s.get("solar"))
    rain_daily = _hist_values(r.get("daily"))
    rain_rate = _hist_values(r.get("rain_rate"))

    # Instante pedido (HH:MM). O epoch sai da data+hora no fuso da estação, que é
    # o mesmo em que a Ecowitt grava o histórico — por isso o offset vem de time.
    alvo = None
    if hora:
        try:
            hh, mm = str(hora).strip().split(":")[:2]
            tm = time.strptime("%s %02d:%02d" % (date, int(hh), int(mm)), "%Y-%m-%d %H:%M")
            alvo = int(time.mktime(tm))
        except (ValueError, TypeError):
            alvo = None

    def avg(v):
        return round(sum(v) / len(v), 1) if v else None
    # chuva do dia: o acumulado diário (pega o maior do dia); senão soma a taxa
    rain_total = (round(max(rain_daily), 1) if rain_daily
                  else (round(sum(rain_rate), 1) if rain_rate else None))

    def nd(value, unit):
        return {"value": value, "unit": unit}

    # ---- leitura do INSTANTE pedido -------------------------------------
    # Cada grandeza é buscada na sua própria série: se o sensor de vento falhou
    # às 9:31 mas o de temperatura não, ainda se entrega a temperatura em vez de
    # descartar o carimbo inteiro.
    if alvo is not None:
        st = _hist_serie(o.get("temperature"))
        sh = _hist_serie(o.get("humidity"))
        sd = _hist_serie(o.get("dew_point"))
        sw = _hist_serie(w.get("wind_speed"))
        sg = _hist_serie(w.get("wind_gust"))
        ss = _hist_serie(s.get("solar"))
        v_t, ep_t, dist = _hist_perto(st, alvo)
        v_h, _, _ = _hist_perto(sh, alvo)
        v_d, _, _ = _hist_perto(sd, alvo)
        v_w, _, _ = _hist_perto(sw, alvo)
        v_g, _, _ = _hist_perto(sg, alvo)
        v_s, _, _ = _hist_perto(ss, alvo)
        achou = any(x is not None for x in (v_t, v_h, v_d, v_w, v_g, v_s))
        return {
            "mac": mac, "date": date, "fonte_hist": True, "instante": True,
            "hora_pedida": hora,
            "hora": (time.strftime("%H:%M", time.localtime(ep_t)) if ep_t else None),
            "defasagem_s": dist,
            "samples": len(temps),
            "sem_amostra": (not achou),
            "temp": nd(v_t, _hist_unit(o.get("temperature"), "℃")),
            "humidity": nd(v_h, "%"),
            "dew_point": nd(v_d, _hist_unit(o.get("dew_point"), "℃")),
            "wind_speed": nd(v_w, _hist_unit(w.get("wind_speed"), "km/h")),
            "wind_gust": nd(v_g, _hist_unit(w.get("wind_gust"), "km/h")),
            "solar": nd(v_s, _hist_unit(s.get("solar"), "W/m²")),
            # chuva e extremos NÃO têm valor instantâneo: são do dia por definição
            "rain_day": nd(rain_total, _hist_unit(r.get("daily"), "mm")),
            "wind_dir": None, "pressure": None, "vpd": None,
            "dia": {
                "temp": avg(temps),
                "temp_min": (round(min(temps), 1) if temps else None),
                "temp_max": (round(max(temps), 1) if temps else None),
                "humidity": avg(hums),
                "wind_speed": avg(winds),
            },
        }

    return {
        "mac": mac, "date": date, "fonte_hist": True, "instante": False, "samples": len(temps),
        "temp": nd(avg(temps), _hist_unit(o.get("temperature"), "℃")),
        "temp_min": nd(round(min(temps), 1) if temps else None, _hist_unit(o.get("temperature"), "℃")),
        "temp_max": nd(round(max(temps), 1) if temps else None, _hist_unit(o.get("temperature"), "℃")),
        "dew_point": nd(avg(dews), _hist_unit(o.get("dew_point"), "℃")),
        "humidity": nd(avg(hums), "%"),
        "rain_day": nd(rain_total, _hist_unit(r.get("daily"), "mm")),
        "wind_speed": nd(avg(winds), _hist_unit(w.get("wind_speed"), "km/h")),
        "wind_gust": nd(round(max(gusts), 1) if gusts else None, _hist_unit(w.get("wind_gust"), "km/h")),
        "wind_dir": None,
        "pressure": None,
        "vpd": None,
        "solar": nd(avg(solars), _hist_unit(s.get("solar"), "W/m²")),
        "time": None,
    }

# ---------------------------------------------------------------- Solo (Embrapa GeoInfo / SiBCS)
# Classificacao pedologica oficial a partir da geometria que o app ja conhece.
#
# Duas decisoes que valem explicacao:
#
# 1) A escala NAO e uniforme no Brasil. O mapa nacional da Embrapa e 1:5.000.000 —
#    serve para dizer a regiao, nao para caracterizar um talhao. Levantamento de
#    1:250.000 so existe em alguns estados. Por isso a consulta e uma CASCATA: tenta
#    a camada de melhor escala que cobre o ponto e so entao cai para a nacional. A
#    resposta sempre carrega a escala REAL daquela camada, para a ficha poder avisar
#    quando o dado e grosseiro demais. Mentir a escala aqui seria pior que nao ter o dado.
#
# 2) Consultamos por BBOX, nao por CQL_FILTER. O filtro CQL exigiria saber o nome do
#    campo de geometria de cada levantamento (the_geom / geom / shape — varia), e o
#    nome do campo da classe tambem varia. Pedindo por bbox (parametro padrao do WFS,
#    sem nome de campo) e resolvendo a geometria aqui dentro, a consulta funciona sem
#    depender do schema de cada camada. WFS 1.0.0 porque nele o bbox e lon,lat —
#    no 1.1.0 o EPSG:4326 inverte para lat,lon e a consulta silenciosamente erra o lugar.
GEOINFO_WFS = "https://geoinfo.dados.embrapa.br/geoserver/ows"
SOLO_TTL = 30 * 24 * 3600          # solo nao muda; so o catalogo muda, e raramente
SOLO_AMOSTRAS = 40                 # grade 40x40 para estimar % de area por unidade

# As 13 ordens do SiBCS. Usadas para extrair a ordem do nome completo da unidade
# ("LATOSSOLO VERMELHO Eutroferrico" -> "Latossolo") e para colorir a legenda no app.
SOLO_ORDENS = ["Argissolo", "Cambissolo", "Chernossolo", "Espodossolo", "Gleissolo",
               "Latossolo", "Luvissolo", "Neossolo", "Nitossolo", "Organossolo",
               "Planossolo", "Plintossolo", "Vertissolo"]

# Catalogo, do levantamento mais detalhado para o mais grosseiro. `bbox` e so um
# pre-filtro barato (evita bater na camada do Parana para um ponto no Ceara); quem
# decide de verdade e o WFS. Camada sem bbox e sempre tentada.
# ATENCAO: confira os typeName contra o GetCapabilities antes de confiar —
#   https://geoinfo.dados.embrapa.br/geoserver/ows?service=WFS&version=1.0.0&request=GetCapabilities
# Uma camada renomeada no servidor apenas cai fora da cascata (o proxy segue para a
# proxima); nao derruba a consulta.
SOLO_CAMADAS = [
    {"typeName": "geonode:parana_solos_20201105",
     "titulo": "Mapa de solos do estado do Parana", "escala": 250000, "sibcs": "2006",
     "bbox": (-54.7, -26.8, -48.0, -22.4)},
    {"typeName": "geonode:lev_sc_estado_solos_lat_long_wgs84",
     "titulo": "Mapa de solos do estado de Santa Catarina", "escala": 250000, "sibcs": "1999",
     "bbox": (-53.9, -29.5, -48.3, -25.9)},
    {"typeName": "geonode:lev_mg_estado_solos_lat_long_wgs84_vt",
     "titulo": "Mapa de solos do estado de Minas Gerais", "escala": 500000, "sibcs": "1999",
     "bbox": (-51.1, -22.9, -39.8, -14.2)},
    {"typeName": "geonode:solos_amazonia",
     "titulo": "Classificacao dos solos do Bioma Amazonia", "escala": 1000000, "sibcs": "2006",
     "bbox": (-74.0, -12.0, -44.0, 5.3)},
    {"typeName": "geonode:class_solo_semiarido_2022",
     "titulo": "Classificacao dos solos do Semiarido Brasileiro", "escala": 1000000, "sibcs": "2013",
     "bbox": (-47.0, -18.0, -35.0, -2.5)},
    {"typeName": "geonode:brasil_solos_5m_20201104",
     "titulo": "Mapa de solos do Brasil", "escala": 5000000, "sibcs": "2006",
     "bbox": None},
]

# Nomes de campo candidatos, em ordem de preferencia. Cada levantamento batiza o seu
# de um jeito; o que nao casar cai na heuristica de _solo_classe_de().
SOLO_CAMPOS_CLASSE = ["legenda", "classe", "sibcs", "descricao", "desc_", "unidade",
                      "ordem", "solo", "nome", "label", "leg", "tipo_solo", "classe_sol"]
SOLO_CAMPOS_SIGLA = ["sigla", "simbolo", "cod", "codigo", "unidade_ma", "um", "id_leg"]

_solo_cache = {}   # chave -> {"ts": epoch, "val": resposta}

def _solo_norm(s):
    """Minusculas sem acento — so para casar nome de campo e nome de ordem."""
    s = str(s or "").lower()
    for a, b in (("á","a"),("à","a"),("â","a"),("ã","a"),("é","e"),("ê","e"),("í","i"),
                 ("ó","o"),("ô","o"),("õ","o"),("ú","u"),("ü","u"),("ç","c")):
        s = s.replace(a, b)
    return s

def _solo_ordem_de(txt):
    """Ordem do SiBCS embutida no nome da unidade. Devolve None se nao reconhecer —
    inventar uma ordem seria pior que admitir que nao sabemos."""
    n = _solo_norm(txt)
    for o in SOLO_ORDENS:
        if _solo_norm(o) in n:
            return o
    return None

def _solo_campo(props, candidatos):
    """Primeiro campo cujo nome contem um dos candidatos e traz texto util."""
    if not isinstance(props, dict):
        return None
    chaves = {k: _solo_norm(k) for k in props.keys()}
    for c in candidatos:
        for k, kn in chaves.items():
            if c in kn:
                v = props.get(k)
                if isinstance(v, str) and v.strip():
                    return v.strip()
    return None

def _solo_classe_de(props):
    """Nome da unidade de mapeamento. Tenta os campos conhecidos; se nenhum casar,
    procura o texto que contenha uma ordem do SiBCS (funciona mesmo em camada com
    schema que nunca vimos); em ultimo caso, o maior texto do registro."""
    v = _solo_campo(props, SOLO_CAMPOS_CLASSE)
    if v:
        return v
    if isinstance(props, dict):
        textos = [x.strip() for x in props.values() if isinstance(x, str) and x.strip()]
        for t in textos:
            if _solo_ordem_de(t):
                return t
        if textos:
            return max(textos, key=len)
    return None

def _solo_aneis(geom):
    """GeoJSON Polygon/MultiPolygon -> lista de aneis [[(lon,lat),...], ...].
    Buracos entram como aneis normais: a regra par-impar do ray casting ja os trata."""
    if not isinstance(geom, dict):
        return []
    t, c = geom.get("type"), geom.get("coordinates")
    aneis = []
    try:
        if t == "Polygon":
            for anel in c:
                aneis.append([(float(p[0]), float(p[1])) for p in anel])
        elif t == "MultiPolygon":
            for poly in c:
                for anel in poly:
                    aneis.append([(float(p[0]), float(p[1])) for p in anel])
    except Exception:
        return []
    return aneis

def _solo_contem(aneis, lon, lat):
    """Ray casting par-impar sobre todos os aneis."""
    dentro = False
    for anel in aneis:
        n = len(anel)
        if n < 3:
            continue
        j = n - 1
        for i in range(n):
            xi, yi = anel[i]
            xj, yj = anel[j]
            if ((yi > lat) != (yj > lat)) and \
               (lon < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-12) + xi):
                dentro = not dentro
            j = i
    return dentro

def _solo_wfs(camada, bbox):
    """GetFeature por bbox. Devolve [] se a camada nao existir mais ou nao responder —
    a cascata segue para a proxima em vez de derrubar a consulta inteira."""
    qs = urllib.parse.urlencode({
        "service": "WFS", "version": "1.0.0", "request": "GetFeature",
        "typeName": camada["typeName"], "outputFormat": "application/json",
        "srsName": "EPSG:4326", "maxFeatures": "60",
        "bbox": "%.6f,%.6f,%.6f,%.6f" % bbox,
    })
    req = urllib.request.Request(GEOINFO_WFS + "?" + qs, headers={"User-Agent": "agracta-app"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode("utf-8", "replace"))
    except Exception:
        return []
    return d.get("features") or [] if isinstance(d, dict) else []

def _solo_tem_feicao(camada, bbox):
    """Confirma que a camada realmente cobre o centro da area visivel.

    A caixa declarada de um levantamento estadual e um RETANGULO, e estado nao e
    retangulo: o canto sudoeste da caixa de Minas Gerais cobre Iracemapolis, que e
    Sao Paulo. O pre-filtro por caixa admitia MG, o GetMap saia 100% transparente e a
    cascata parava ali — a camada de solo simplesmente nao aparecia, sem erro nenhum
    na tela. Caixa e so o pre-filtro; o poligono do WFS e quem decide."""
    w, s, e, n = bbox
    lon, lat = (w + e) / 2.0, (s + n) / 2.0
    d = 0.0005
    feats = _solo_wfs(camada, (lon - d, lat - d, lon + d, lat + d))
    return any(_solo_contem(_solo_aneis(f.get("geometry")), lon, lat) for f in feats)


def _solo_resposta(camada, props):
    classe = _solo_classe_de(props)
    return {
        "fonte": "embrapa-wfs",
        "camada": camada["typeName"],
        "titulo": camada["titulo"],
        "classe": classe,
        "ordem": _solo_ordem_de(classe),
        "sigla": _solo_campo(props, SOLO_CAMPOS_SIGLA),
        "escala": "1:" + format(camada["escala"], ",d").replace(",", "."),
        "escalaN": camada["escala"],
        "sibcs": camada["sibcs"],
    }

def _solo_bbox_do_poligono(anel):
    lons = [p[0] for p in anel]
    lats = [p[1] for p in anel]
    return (min(lons), min(lats), max(lons), max(lats))

def do_solo(lat=None, lng=None, geometry=None):
    """Classe de solo no ponto, ou composicao das unidades sob um poligono.

    Com `geometry`, devolve a unidade dominante em `classe` e a lista completa em
    `unidades` com o percentual de cada uma — e o app avisa quando a quadra esta a
    cavaleiro de mais de uma unidade, que e justamente o caso em que a media do
    ensaio mistura solos diferentes."""
    anel = None
    if geometry:
        aneis = _solo_aneis(geometry)
        if not aneis:
            raise RuntimeError("SOLO:geometria invalida (esperado Polygon ou MultiPolygon).")
        anel = aneis[0]
        w, s, e, n = _solo_bbox_do_poligono(anel)
        lng, lat = (w + e) / 2.0, (s + n) / 2.0
    else:
        if lat is None or lng is None:
            raise RuntimeError("SOLO:informe lat/lng ou geom.")
        d = 0.0005                      # ~50 m: bbox minimo, o WFS nao aceita area zero
        w, s, e, n = lng - d, lat - d, lng + d, lat + d

    chave = "%s|%.4f|%.4f" % ("p" if geometry else "c", lat, lng)
    hit = _solo_cache.get(chave)
    if hit and (time.time() - hit["ts"]) < SOLO_TTL:
        return hit["val"]

    out = {"fonte": "embrapa-wfs", "semCobertura": True,
           "consultadoEm": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    for camada in SOLO_CAMADAS:
        cb = camada.get("bbox")
        if cb and (lng < cb[0] or lng > cb[2] or lat < cb[1] or lat > cb[3]):
            continue
        feats = _solo_wfs(camada, (w, s, e, n))
        if not feats:
            continue

        # Sem poligono: a unidade que contem o ponto (o bbox traz vizinhas junto).
        if not anel:
            achou = None
            for f in feats:
                if _solo_contem(_solo_aneis(f.get("geometry")), lng, lat):
                    achou = f
                    break
            if not achou:
                continue
            out = _solo_resposta(camada, achou.get("properties"))
            out["unidades"] = [dict(_solo_resposta(camada, achou.get("properties")), pct=100)]
            break

        # Com poligono: amostragem em grade. Interseccao exata de poligonos em Python
        # puro seria muito codigo para ganho nenhum — a unidade pedologica e ordens de
        # grandeza maior que a quadra, e o que importa e o percentual aproximado.
        pw, ps, pe, pn = _solo_bbox_do_poligono(anel)
        cand = [(f, _solo_aneis(f.get("geometry"))) for f in feats]
        cont, dentro_total = {}, 0
        for i in range(SOLO_AMOSTRAS):
            py = ps + (pn - ps) * (i + 0.5) / SOLO_AMOSTRAS
            for j in range(SOLO_AMOSTRAS):
                px = pw + (pe - pw) * (j + 0.5) / SOLO_AMOSTRAS
                if not _solo_contem([anel], px, py):
                    continue
                dentro_total += 1
                for f, aneis_f in cand:
                    if _solo_contem(aneis_f, px, py):
                        nome = _solo_classe_de(f.get("properties")) or "(sem nome)"
                        if nome not in cont:
                            cont[nome] = {"n": 0, "props": f.get("properties")}
                        cont[nome]["n"] += 1
                        break
        if not dentro_total or not cont:
            continue

        ordenadas = sorted(cont.items(), key=lambda kv: -kv[1]["n"])
        unidades = []
        for nome, info in ordenadas:
            u = _solo_resposta(camada, info["props"])
            u["pct"] = int(round(100.0 * info["n"] / dentro_total))
            unidades.append(u)
        out = _solo_resposta(camada, ordenadas[0][1]["props"])
        out["unidades"] = unidades
        out["metodo"] = "amostragem-grade-%d" % SOLO_AMOSTRAS
        break

    out["consultadoEm"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _solo_cache[chave] = {"ts": time.time(), "val": out}
    return out

# --------------------------------------------------- Propriedades edaficas (SoilGrids / ISRIC)
# Argila, areia, silte, pH, carbono organico, CTC e densidade a partir do SoilGrids.
#
# Por que WMS GetFeatureInfo e nao a API REST: o ISRIC PAUSOU a REST API
# (properties/query) por tempo indeterminado e recomenda WCS/WMS. O WCS devolveria
# GeoTIFF, que exigiria GDAL — e este proxy e stdlib puro por decisao. O
# GetFeatureInfo devolve o valor do pixel como texto e resolve sem dependencia.
#
# ATENCAO AS UNIDADES: o SoilGrids publica INTEIROS ESCALONADOS. Argila vem em g/kg,
# pH vem multiplicado por 10. Exibir o numero cru daria "pH 58" e "58 g/kg de argila"
# num solo que tem pH 5,8 e 58% de argila. O fator de conversao de cada propriedade
# esta na tabela abaixo e e aplicado uma unica vez, aqui.
SOILGRIDS_WMS = "https://maps.isric.org/mapserv"

# code: (fator, unidade convencional, rotulo)
# Faixa fisicamente possivel de cada propriedade, JA na unidade final. Serve para
# recusar o que nao pode existir: argila de 0,1%, pH de 0,1, densidade de 0,01 kg/dm3.
# Um modelo global erra; ele nao entrega pH 0,1. Valor fora daqui e falha disfarcada,
# e apresenta-lo e pior que dizer "indisponivel" — porque quem le acredita.
SOLO_FAIXAS = {
    "clay":  (1.0, 100.0),     # %
    "sand":  (1.0, 100.0),     # %
    "silt":  (0.5, 100.0),     # %
    "phh2o": (3.0, 10.0),      # pH em agua: fora disso nao e solo agricola
    # Limite de baixo importa tanto quanto o de cima. Carbono organico de 0,1 g/kg
    # seria 0,01% de materia organica: nao existe em solo agricola, nem no pior
    # areial. CTC de 0,1 cmolc/kg idem — quartzo puro ja da mais que isso.
    "soc":   (1.0, 600.0),     # g/kg
    "cec":   (1.0, 200.0),     # cmolc/kg
    "bdod":  (0.5, 2.2),       # kg/dm3
}

SOLO_PROPS = {
    "clay":     (10,  "%",         "Argila"),
    "sand":     (10,  "%",         "Areia"),
    "silt":     (10,  "%",         "Silte"),
    "phh2o":    (10,  "",          "pH (H2O)"),
    "soc":      (10,  "g/kg",      "Carbono organico"),
    "cec":      (10,  "cmolc/kg",  "CTC (pH 7)"),
    "bdod":     (100, "kg/dm3",    "Densidade"),
}
# Camadas superficiais, com a espessura de cada uma — a media 0-30 cm e ponderada por
# elas. 0-30 cm porque e a faixa que a amostragem agronomica cobre; as profundidades
# individuais vao junto na resposta para quem quiser olhar o perfil.
SOLO_PROFS = [("0-5cm", 5), ("5-15cm", 10), ("15-30cm", 15)]
SOLO_PROPS_TTL = 30 * 24 * 3600

_solo_props_cache = {}

def _sg_valor(prop, prof, lon, lat):
    """GetFeatureInfo de UMA camada. Uma camada por requisicao de proposito: com
    varias, a resposta nao diz de forma confiavel qual valor e de qual camada, e
    trocar argila por areia em silencio seria pior que demorar um pouco mais.
    WMS 1.1.1 -> bbox em lon,lat (o 1.3.0 inverte para EPSG:4326)."""
    d = 0.0002
    camada = "%s_%s_mean" % (prop, prof)
    qs = urllib.parse.urlencode({
        "map": "/map/%s.map" % prop,
        "service": "WMS", "version": "1.1.1", "request": "GetFeatureInfo",
        "layers": camada, "query_layers": camada,
        # O MapServer do SoilGrids exige um estilo e anuncia GeoJSON com este MIME.
        # Sem os dois ele devolve ServiceException XML com HTTP 200; a versao do
        # XML ("1.0") era então confundida com o valor do pixel.
        "styles": "default", "srs": "EPSG:4326",
        "info_format": "application/geo+json",
        "bbox": "%.6f,%.6f,%.6f,%.6f" % (lon - d, lat - d, lon + d, lat + d),
        "width": "3", "height": "3", "x": "1", "y": "1",
    })
    req = urllib.request.Request(SOILGRIDS_WMS + "?" + qs, headers={"User-Agent": "agracta-app"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            bruto = r.read().decode("utf-8", "replace")
    except Exception:
        return None
    return _sg_extrai(bruto)

def _sg_extrai(bruto):
    """O MapServer devolve GeoJSON quando entende info_format e texto quando nao.
    Tentamos os dois: primeiro o numero dentro das properties, depois um numero
    solto no texto. Sem valor plausivel, devolve None em vez de chutar.

    A GUARDA MAIS IMPORTANTE ESTA NO COMECO. Quando a requisicao falha, o MapServer
    responde um ServiceExceptionReport — e o XML dele comeca com version='1.0'. O
    padrao "numero depois do =" casava com esse 1.0, e a FALHA virava a MEDIDA: 1.0
    dividido pelo fator da propriedade dava argila 0,1%, pH 0,1 e densidade 0,01.
    Numeros impossiveis, apresentados com a mesma cara de numeros bons.

    Documento de erro nao e dado. Ele sai daqui como None, sempre."""
    texto = bruto or ""
    baixo = texto.lower()
    if ("serviceexception" in baixo or "exceptionreport" in baixo or
            "<html" in baixo or "<!doctype html" in baixo or
            "no results" in baixo):
        return None
    try:
        d = json.loads(texto)
        for f in (d.get("features") or []):
            props = f.get("properties") or {}
            # Nao dependa da ordem do JSON: alguns servidores incluem IDs ou
            # metadados numericos antes do pixel propriamente dito.
            candidatos = []
            for k in ("pixel_value", "value_0", "value", "band_1"):
                if k in props:
                    candidatos.append(props[k])
            if not candidatos:
                candidatos = list(props.values())
            for v in candidatos:
                try:
                    n = float(v)
                except (TypeError, ValueError):
                    continue
                if n > -9000:
                    return n
    except Exception:
        pass
    # Fallback para a resposta text/plain do MapServer. Os nomes de campo são
    # deliberadamente exigidos: um '=' genérico também casaria com version="1.0".
    for padrao in (r"(?:pixel_value|value_0|band_1)\s*=\s*'?(-?\d+\.?\d*)'?",
                   r"(?:pixel_value|value_0|band_1)\s*:\s*'?(-?\d+\.?\d*)'?",
                   r"band\s+\d+\s+value\s*[:=]\s*'?(-?\d+\.?\d*)'?"):
        for x in re.findall(padrao, texto, re.I):
            try:
                n = float(x)
            except ValueError:
                continue
            if -9000 < n < 100000:
                return n
    return None

def do_solo_propriedades(lat, lng):
    """Propriedades edaficas estimadas no ponto, ja convertidas para unidade usual.

    Sao ESTIMATIVA DE MODELO GLOBAL, nao analise de solo — quem chama tem de dizer
    isso na tela. Servem para caracterizar o ambiente do ensaio, nunca para
    substituir laudo de laboratorio nem embasar recomendacao de adubacao."""
    if lat is None or lng is None:
        raise RuntimeError("SOLO:informe lat/lng.")
    chave = "%.4f|%.4f" % (lat, lng)
    hit = _solo_props_cache.get(chave)
    if hit and (time.time() - hit["ts"]) < SOLO_PROPS_TTL:
        return hit["val"]

    tarefas = [(p, prof) for p in SOLO_PROPS for prof, _ in SOLO_PROFS]
    with ThreadPoolExecutor(max_workers=7) as ex:
        brutos = list(ex.map(lambda t: _sg_valor(t[0], t[1], lng, lat), tarefas))
    cru = dict(zip(tarefas, brutos))

    out = {"fonte": "soilgrids", "referencia": "SoilGrids 2.0 / ISRIC",
           "estimativa": True, "profundidade": "0-30 cm (media ponderada)",
           "propriedades": {},
           "consultadoEm": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}

    recusadas = []
    for prop, (fator, unidade, rotulo) in SOLO_PROPS.items():
        soma = pesos = 0.0
        perfil = {}
        lo, hi = SOLO_FAIXAS.get(prop, (float("-inf"), float("inf")))
        fora = 0
        for prof, esp in SOLO_PROFS:
            v = cru.get((prop, prof))
            if v is None:
                continue
            conv = v / float(fator)
            # Fora da faixa fisicamente possivel: a camada e DESCARTADA, nao exibida.
            # Um pH de 0,1 nao e uma estimativa ruim — e uma falha com cara de dado.
            if not math.isfinite(conv) or not (lo <= conv <= hi):
                fora += 1
                continue
            perfil[prof] = round(conv, 2)
            soma += conv * esp; pesos += esp
        if not pesos:
            if fora:
                recusadas.append(rotulo)
            continue
        out["propriedades"][prop] = {
            "rotulo": rotulo, "unidade": unidade,
            "valor": round(soma / pesos, 2), "perfil": perfil,
        }
    if recusadas:
        # Dito em voz alta: quem chama precisa poder mostrar "indisponivel" em vez de
        # um espaco em branco que parece "ainda carregando".
        out["recusadas"] = sorted(recusadas)

    # As tres fracoes granulometricas devem fechar aproximadamente 100%. Se o
    # conjunto nao fecha, nao exponha uma textura com aparencia de laudo: uma das
    # bandas veio inconsistente e as tres ficam indisponiveis para nova tentativa.
    fracoes = [out["propriedades"].get(k) for k in ("clay", "sand", "silt")]
    if all(fracoes):
        total = sum(x["valor"] for x in fracoes)
        if total < 85 or total > 115:
            for k in ("clay", "sand", "silt"):
                out["propriedades"].pop(k, None)

    # Materia organica nao e medida pelo SoilGrids: e o carbono organico vezes o
    # fator de Van Bemmelen. Vai marcada como derivada para ninguem confundir com
    # o MO do laudo, que sai de outro metodo.
    soc = out["propriedades"].get("soc")
    if soc:
        out["propriedades"]["mo"] = {
            "rotulo": "Materia organica", "unidade": "g/kg",
            "valor": round(soc["valor"] * 1.724, 2), "derivada": "soc x 1,724 (Van Bemmelen)",
        }

    if not out["propriedades"]:
        out["semCobertura"] = True
        # Distinguir "o servico nao cobre este ponto" de "o servico respondeu coisa
        # impossivel" importa: a primeira e geografia, a segunda e defeito, e a tela
        # tem de poder dizer qual das duas.
        if recusadas:
            out["motivo"] = ("O serviço respondeu valores fisicamente impossíveis para "
                             "todas as propriedades — a estimativa foi recusada.")

    # Textura pelo triangulo simplificado, so quando as tres fracoes existem.
    arg = out["propriedades"].get("clay")
    are = out["propriedades"].get("sand")
    if arg and are:
        a, s = arg["valor"], are["valor"]
        if a >= 60: t = "muito argilosa"
        elif a >= 35: t = "argilosa"
        elif a >= 15: t = "media"
        elif s >= 70: t = "arenosa"
        else: t = "media"
        out["textura"] = t

    _solo_props_cache[chave] = {"ts": time.time(), "val": out}
    return out

def do_solo_mapa(bbox, width):
    """Recorte do mapa pedologico como PNG, para o app desenhar por cima do satelite.

    Por que passar pelo proxy em vez de usar tile direto: o app precisa RECORTAR a
    imagem pelos poligonos das quadras, e recortar exige ler os pixels num canvas.
    Ler pixel de imagem de outro dominio suja o canvas e o navegador proibe
    exporta-lo; tile como <img> so serve para exibir inteiro. Vindo pelo proxy, a
    imagem e mesma-origem e o recorte funciona — igual ao NDVI ja faz.

    A camada escolhida segue a mesma cascata da consulta por ponto, para o desenho
    e a ficha nunca discordarem sobre qual levantamento esta valendo."""
    w, s, e, n = bbox
    if e == w or n == s:
        raise RuntimeError("SOLO:area de mapa invalida.")
    width = max(64, min(2000, int(width or 1024)))
    height = max(64, min(2000, int(round(width * (n - s) / (e - w)))))
    lon, lat = (w + e) / 2.0, (s + n) / 2.0

    escolhida = None
    for camada in SOLO_CAMADAS:
        cb = camada.get("bbox")
        if cb and (lon < cb[0] or lon > cb[2] or lat < cb[1] or lat > cb[3]):
            continue
        # A caixa admite; o DADO confirma. Sem esta checagem, a caixa de Minas Gerais
        # sequestrava Iracemapolis (SP) e o mapa saia transparente, calado.
        if cb and not _solo_tem_feicao(camada, (w, s, e, n)):
            continue
        escolhida = camada
        break
    if not escolhida:
        raise RuntimeError("SOLO:sem levantamento pedologico para esta area.")

    qs = urllib.parse.urlencode({
        "service": "WMS", "version": "1.1.1", "request": "GetMap",
        "layers": escolhida["typeName"], "styles": "",
        "srs": "EPSG:4326", "format": "image/png", "transparent": "true",
        "width": str(width), "height": str(height),
        "bbox": "%.6f,%.6f,%.6f,%.6f" % (w, s, e, n),   # WMS 1.1.1: lon,lat
    })
    req = urllib.request.Request(GEOINFO_WFS + "?" + qs, headers={"User-Agent": "agracta-app"})
    with urllib.request.urlopen(req, timeout=45) as r:
        dados = r.read()
        ctype = r.headers.get("Content-Type", "image/png")
    # O GeoServer responde erro como XML com status 200. Devolver isso como se fosse
    # imagem pintaria lixo no mapa em vez de dizer o que houve.
    if "image" not in (ctype or ""):
        raise RuntimeError("SOLO:o servidor da Embrapa nao devolveu imagem (%s)." % (ctype or "sem tipo"))
    return dados, ctype, escolhida["typeName"]

# ------------------------------------------------- Janela ambiental (secao 9)
# "O que aconteceu entre a aplicacao e a avaliacao" e a pergunta que explica o
# resultado de um ensaio, e ate aqui nao havia como responde-la: o carimbo guarda o
# INSTANTE de cada evento, e instante nao diz se choveu 72 mm no intervalo.
#
# A janela agrega os resumos diarios que /clima/historico ja produz. Mora no proxy,
# e nao no app, por tres razoes: sao N chamadas a Ecowitt (uma por dia) e o fan-out
# paralelo pertence a quem ja faz isso em /solo/propriedades; a agregacao e a mesma
# para todo mundo; e o cache aproveita entre estudos da mesma estacao.
JANELA_MAX_DIAS = 180      # janela maior que isso e erro de digitacao, nao pedido
JANELA_TTL = 6 * 3600      # dia fechado nao muda; o de hoje ainda muda, dai TTL curto
JANELA_CHUVA_MIN = 0.2     # mm: abaixo disso e orvalho no pluviometro, nao "dia com chuva"
_janela_cache = {}


def _dias_entre(de, ate):
    """Lista de YYYY-MM-DD de `de` ate `ate`, inclusive nas duas pontas."""
    try:
        t0 = time.strptime(de, "%Y-%m-%d")
        t1 = time.strptime(ate, "%Y-%m-%d")
    except (ValueError, TypeError):
        raise RuntimeError("CLIMA:datas invalidas (esperado AAAA-MM-DD).")
    e0, e1 = int(time.mktime(t0)), int(time.mktime(t1))
    if e1 < e0:
        raise RuntimeError("CLIMA:a data final e anterior a inicial.")
    dias, passo = [], e0
    while passo <= e1:
        dias.append(time.strftime("%Y-%m-%d", time.localtime(passo)))
        if len(dias) > JANELA_MAX_DIAS:
            raise RuntimeError("CLIMA:janela de mais de %d dias." % JANELA_MAX_DIAS)
        passo += 86400
    return dias


def do_clima_janela(mac, de, ate):
    if not mac:
        raise RuntimeError("CLIMA:informe a estacao (mac).")
    dias = _dias_entre(de, ate)

    chave = "%s|%s|%s" % (mac, de, ate)
    hit = _janela_cache.get(chave)
    if hit and (time.time() - hit[0]) < JANELA_TTL:
        return hit[1]

    def um(dia):
        # Um dia que falha nao derruba a janela: entra como ausente e a cobertura
        # cai. Melhor uma janela que se declara parcial do que uma que some inteira
        # porque a estacao piscou numa terca-feira.
        try:
            return dia, (do_clima_history(mac, dia) or {})
        except (RuntimeError, urllib.error.URLError, ValueError, KeyError, TypeError):
            return dia, None

    with ThreadPoolExecutor(max_workers=6) as ex:
        resultados = dict(ex.map(um, dias))

    temps, tmaxs, tmins, hums, ventos, rajadas, solares = [], [], [], [], [], [], []
    chuva_total = 0.0
    dias_com_chuva = 0
    dias_com_leitura = 0
    faltantes = []

    for dia in dias:
        resumo = ((resultados.get(dia) or {}).get("dia")) or {}
        if not resumo:
            faltantes.append(dia)
            continue
        tem = False
        for origem, destino in (("temp", temps), ("temp_max", tmaxs), ("temp_min", tmins),
                                ("humidity", hums), ("wind_speed", ventos),
                                ("wind_gust", rajadas), ("solar", solares)):
            v = resumo.get(origem)
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                destino.append(float(v))
                tem = True
        ch = resumo.get("rain_day")
        if isinstance(ch, (int, float)) and not isinstance(ch, bool):
            chuva_total += float(ch)
            if float(ch) >= JANELA_CHUVA_MIN:
                dias_com_chuva += 1
            tem = True
        if tem:
            dias_com_leitura += 1
        else:
            faltantes.append(dia)

    def media(v):
        return round(sum(v) / len(v), 1) if v else None

    total = len(dias)
    out = {
        "mac": mac, "de": de, "ate": ate,
        "dias": total,
        # COBERTURA e o campo mais importante deste retorno. Uma media de 11 dias
        # apresentada como "os 14 dias da janela" e mentira, e o app precisa poder
        # dizer isso na tela em vez de exibir um numero limpo e falso.
        "dias_com_leitura": dias_com_leitura,
        "cobertura_pct": (round(100.0 * dias_com_leitura / total) if total else 0),
        "dias_sem_leitura": faltantes,
        "chuva_mm": (round(chuva_total, 1) if dias_com_leitura else None),
        "dias_com_chuva": (dias_com_chuva if dias_com_leitura else None),
        "temp_media": media(temps),
        # Maxima da janela e o MAIOR pico do periodo, nao a media das maximas: o que
        # queima uma cultura e o dia que passou de 31, nao a media dos dias quentes.
        "temp_max": (round(max(tmaxs), 1) if tmaxs else None),
        "temp_min": (round(min(tmins), 1) if tmins else None),
        "ur_media": media(hums),
        "vento_medio": media(ventos),
        "rajada_max": (round(max(rajadas), 1) if rajadas else None),
        "radiacao_media": media(solares),
        "fonte": "ecowitt-historico",
        "ts": int(time.time() * 1000),
    }
    _janela_cache[chave] = (time.time(), out)
    return out

def do_solo_legenda(camada_nome):
    """Legenda oficial da exata camada que o recorte WMS desenhou."""
    escolhida = next((c for c in SOLO_CAMADAS if c["typeName"] == camada_nome), None)
    if not escolhida:
        raise RuntimeError("SOLO:camada de legenda invalida.")
    qs = urllib.parse.urlencode({
        "service": "WMS", "version": "1.1.1", "request": "GetLegendGraphic",
        "layer": escolhida["typeName"], "style": "", "format": "image/png",
        "transparent": "false",
    })
    req = urllib.request.Request(GEOINFO_WFS + "?" + qs, headers={"User-Agent": "agracta-app"})
    with urllib.request.urlopen(req, timeout=35) as r:
        dados = r.read()
        ctype = r.headers.get("Content-Type", "image/png")
    if "image" not in (ctype or ""):
        raise RuntimeError("SOLO:o servidor da Embrapa nao devolveu a legenda (%s)." %
                           (ctype or "sem tipo"))
    return dados, ctype
# ---------------------------------------------------------------- HTTP server
class H(BaseHTTPRequestHandler):
    def _cors(self):
        # ecoa a origem SÓ se permitida; sem o header, o navegador bloqueia páginas de terceiros
        origin = self.headers.get("Origin")
        if origin_permitida(origin):
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Headers", "*")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            # O mapa informa qual levantamento foi desenhado para o navegador
            # pedir a legenda correspondente. Header customizado só fica legível
            # fora da origem do proxy quando é exposto explicitamente pelo CORS.
            self.send_header("Access-Control-Expose-Headers", "X-Solo-Camada")
    def _json(self, obj, code=200):
        b = json.dumps(obj).encode()
        self.send_response(code); self._cors()
        self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()
    def _err(self, e):
        import urllib.error as ue
        if isinstance(e, RuntimeError) and str(e) == "SEM_CREDENCIAL":
            return self._json({"error": "Sem credencial. Configure rodando python3 ndvi-proxy.py."}, 400)
        if isinstance(e, ue.HTTPError):
            try: detail = e.read().decode()[:500]
            except Exception: detail = ""
            return self._json({"error": "Sentinel Hub %s: %s" % (e.code, detail)}, 502)
        return self._json({"error": repr(e)}, 500)
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        try:
            ln = int(self.headers.get("Content-Length", 0) or 0)
            body = json.loads(self.rfile.read(ln).decode()) if ln else {}
            if u.path == "/index":
                img, ctype = do_index(body.get("index", "NDVI"), body["date"], body["bbox"],
                                      body.get("width", 1024), body.get("geom"))
                self.send_response(200); self._cors()
                self.send_header("Content-Type", ctype or "image/png"); self.end_headers()
                return self.wfile.write(img)
            self._json({"error": "rota desconhecida"}, 404)
        except Exception as e:
            self._err(e)
    def log_message(self, *a):  # silencioso
        pass
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path == "/health":
                cid, _ = load_creds()
                eapp, _ = load_ecowitt()
                return self._json({"ok": True, "hasCreds": bool(cid), "hasEcowitt": bool(eapp)})
            if u.path == "/clima/estacoes":
                return self._json(do_estacoes())
            if u.path == "/clima":
                return self._json(do_clima(q["mac"]))
            if u.path == "/clima/historico":
                return self._json(do_clima_history(q["mac"], q["date"], q.get("hora")))
            if u.path == "/clima/janela":
                return self._json(do_clima_janela(q.get("mac"), q.get("de"), q.get("ate")))
            if u.path == "/dates":
                bbox = [float(x) for x in q["bbox"].split(",")]
                return self._json(do_dates(bbox, q["from"], q["to"]))
            if u.path == "/index":
                bbox = [float(x) for x in q["bbox"].split(",")]
                img, ctype = do_index(q.get("index", "NDVI"), q["date"], bbox, q.get("width", 1024), None, (str(q.get("raw") or "").strip().lower() in ("1", "true", "yes", "on")))
                self.send_response(200); self._cors()
                self.send_header("Content-Type", ctype or "image/png"); self.end_headers()
                return self.wfile.write(img)
            if u.path == "/stats":
                geometry = json.loads(q["geom"])
                return self._json(do_stats(q.get("index", "NDVI"), q["from"], q["to"], geometry))
            if u.path == "/point":
                return self._json(do_point(float(q["lat"]), float(q["lng"]), q["date"]))
            if u.path == "/solo":
                geometry = json.loads(q["geom"]) if q.get("geom") else None
                lat = float(q["lat"]) if q.get("lat") else None
                lng = float(q["lng"]) if q.get("lng") else None
                return self._json(do_solo(lat, lng, geometry))
            if u.path == "/solo/propriedades":
                return self._json(do_solo_propriedades(float(q["lat"]), float(q["lng"])))
            if u.path == "/solo/mapa":
                bbox = [float(x) for x in q["bbox"].split(",")]
                img, ctype, camada = do_solo_mapa(bbox, q.get("width", 1024))
                self.send_response(200); self._cors()
                self.send_header("Content-Type", ctype or "image/png")
                self.send_header("X-Solo-Camada", camada)   # qual levantamento pintou
                self.end_headers()
                return self.wfile.write(img)
            if u.path == "/solo/legenda":
                img, ctype = do_solo_legenda(q.get("camada", ""))
                self.send_response(200); self._cors()
                self.send_header("Content-Type", ctype or "image/png")
                self.send_header("Cache-Control", "public, max-age=2592000")
                self.end_headers()
                return self.wfile.write(img)
            self._json({"error": "rota desconhecida"}, 404)
        except RuntimeError as e:
            msg = str(e)
            if msg == "SEM_CREDENCIAL":
                self._json({"error": "Sem credencial. Crie ndvi-credenciais.json (client_id/client_secret)."}, 400)
            elif msg == "SEM_ECOWITT":
                self._json({"error": "Sem credencial Ecowitt no servidor (defina ECOWITT_APP_KEY e ECOWITT_API_KEY)."}, 400)
            elif msg.startswith("ECOWITT:"):
                self._json({"error": "Ecowitt: " + msg[len("ECOWITT:"):]}, 502)
            elif msg.startswith("SOLO:"):
                self._json({"error": "Solo: " + msg[len("SOLO:"):]}, 400)
            elif msg.startswith("CLIMA:"):
                self._json({"error": "Clima: " + msg[len("CLIMA:"):]}, 400)
            else:
                self._json({"error": msg}, 500)
        except urllib.error.HTTPError as e:
            try: detail = e.read().decode()[:500]
            except Exception: detail = ""
            self._json({"error": "Sentinel Hub %s: %s" % (e.code, detail)}, 502)
        except KeyError as e:
            self._json({"error": "Parametro obrigatorio ausente: " + str(e)}, 400)
        except Exception as e:
            self._json({"error": repr(e)}, 500)

def setup_creds_interactive():
    """Pergunta a credencial no Terminal (fica só na sua máquina) e salva localmente."""
    import getpass
    print("\nNenhuma credencial encontrada. Vamos configurar — fica salvo só aqui no seu computador.")
    print("Onde pegar: https://shapps.dataspace.copernicus.eu/dashboard  ->  User settings  ->  OAuth clients\n")
    try:
        cid = input("Cole o Client ID e Enter: ").strip()
        csec = getpass.getpass("Cole o Client Secret e Enter (nao aparece na tela): ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nConfiguracao cancelada."); return False
    if not cid or not csec:
        print("Faltou o ID ou o Secret. Rode de novo: python3 ndvi-proxy.py"); return False
    p = os.path.join(HERE, "ndvi-credenciais.json")
    json.dump({"client_id": cid, "client_secret": csec}, open(p, "w"), indent=2)
    try: os.chmod(p, 0o600)
    except Exception: pass
    print("Credencial salva em ndvi-credenciais.json (so voce le).")
    return True

if __name__ == "__main__":
    cid, _ = load_creds()
    if not cid:
        setup_creds_interactive()
    cid, _ = load_creds()
    valid = False
    if cid:
        try:
            get_token(); valid = True
        except Exception as e:
            print("\n[!] Credencial NAO validou:", e)
            print("    Confira o Client ID/Secret (ou apague ndvi-credenciais.json e rode de novo).")
    print("=" * 56)
    print(" Proxy NDVI - Estacao Iracemapolis")
    print(" Porta:  http://localhost:%d" % PORT)
    print(" Credencial:", "OK (validada)" if valid else ("encontrada, mas nao validou" if cid else "NAO configurada"))
    print(" Deixe esta janela aberta enquanto usa o app.")
    print("=" * 56)
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()
