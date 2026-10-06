"""Camadas públicas de satélite, servidas pelo proxy autenticado do Agracta.

Somente biblioteca padrão. Não requer conta individual, MAP_KEY ou credenciais
Sentinel Hub. Os endereços dos provedores são fixos; o cliente escolhe parâmetros.
"""
import bisect
import calendar
import csv
import io
import json
import math
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from array import array
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

VERSION = 2
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
RASTER = "https://planetarycomputer.microsoft.com/api/data/v1/item"
GIBS = "https://gibs.earthdata.nasa.gov"
FIRMS = "https://firms.modaps.eosdis.nasa.gov"
SMAP_LAYERS = {
    "superficie": "SMAP_L4_Analyzed_Surface_Soil_Moisture",
    "raizes": "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",
}
SMAP_LEGEND = GIBS + "/legends/SMAP_Analyzed_Soil_Moisture_H.svg"
LANDSAT_ID = re.compile(r"LC0[89]_L2SP_\d{6}_\d{8}_02_T[12]\Z")
LANDSAT_COLORS = ["#313695", "#74add1", "#abd9e9", "#fee090", "#f46d43", "#a50026"]
# Classe 0 = transparente. QA bits 0–5 excluem fill, nuvem, cirrus, sombra e neve.
# A classe de cor usa 0–60 °C; a sonda consulta o DN original, sem essa quantização.
_TEMP = "(lwir11*0.00341802+149-273.15)"
LANDSAT_EXPRESSION = ("where((lwir11>0)&((qa_pixel%64)==0),where(" + _TEMP +
                      "<0,1,where(" + _TEMP + ">60,255,1+" + _TEMP + "*254/60)),0)")
LANDSAT_COLORMAP = [
    [[0, 1], [0, 0, 0, 0]], [[1, 43], [49, 54, 149, 255]],
    [[43, 85], [116, 173, 209, 255]], [[85, 128], [171, 217, 233, 255]],
    [[128, 170], [254, 224, 144, 255]], [[170, 213], [244, 109, 67, 255]],
    [[213, 256], [165, 0, 38, 255]],
]


class SatelliteError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def utc_now():
    return datetime.now(timezone.utc)


def iso(dt):
    return dt.isoformat(timespec="seconds").replace("+00:00", "Z")


class Cache:
    """LRU limitado em bytes/entradas; uma consulta por chave de cada vez.

    Nunca transforma uma falha de provedor em dados vazios ou serve cache vencido.
    """
    def __init__(self, max_bytes=48 * 1024 * 1024, max_entries=96):
        self.entries = OrderedDict()
        self.busy = set()
        self.size = 0
        self.max_bytes = max_bytes
        self.max_entries = max_entries
        self.condition = threading.Condition()

    def get(self, key, ttl, loader):
        with self.condition:
            while key in self.busy:
                if not self.condition.wait(timeout=55):
                    raise SatelliteError("O serviço de satélite demorou a responder. Tente novamente.", 504)
            entry = self.entries.get(key)
            if entry and time.monotonic() < entry[0]:
                self.entries.move_to_end(key)
                return entry[1]
            if entry:
                self.size -= self.entries.pop(key)[2]
            self.busy.add(key)
        try:
            value = loader()
            size = getattr(value, "nbytes", None)
            if size is None:
                size = len(value) if isinstance(value, bytes) else len(json.dumps(value).encode())
            with self.condition:
                if size <= self.max_bytes:
                    while self.entries and (self.size + size > self.max_bytes or
                                            len(self.entries) >= self.max_entries):
                        self.size -= self.entries.popitem(last=False)[1][2]
                    self.entries[key] = (time.monotonic() + ttl, value, size)
                    self.size += size
            return value
        finally:
            with self.condition:
                self.busy.discard(key)
                self.condition.notify_all()


_cache = Cache()


def download(url, max_bytes=8 * 1024 * 1024):
    req = urllib.request.Request(url, headers={"User-Agent": "Agracta-satelites/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            data = response.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise SatelliteError("A resposta do provedor excedeu o limite. Consulte uma área menor.", 502)
        return data
    except SatelliteError:
        raise
    except (urllib.error.URLError, TimeoutError, OSError):
        raise SatelliteError("O provedor de satélite está indisponível. Tente novamente.", 502) from None


def get_json(url):
    try:
        value = json.loads(download(url))
        if not isinstance(value, dict):
            raise ValueError()
        return value
    except (ValueError, UnicodeError):
        raise SatelliteError("O provedor enviou uma resposta inválida.", 502) from None


def query_url(base, params):
    return base + "?" + urllib.parse.urlencode(params, doseq=True)


def number(value, name, low, high):
    try:
        v = float(value)
        if not math.isfinite(v) or not low <= v <= high:
            raise ValueError()
        return v
    except (TypeError, ValueError):
        raise SatelliteError("%s inválido." % name) from None


def bbox_param(q):
    try:
        parts = str(q.get("bbox", "")).split(",")
        if len(parts) != 4:
            raise ValueError()
        w, s, e, n = [number(v, "Área", -180, 180) for v in parts]
        if not (-85 <= s < n <= 85 and w < e and e - w <= 6 and n - s <= 6):
            raise ValueError()
        return [w, s, e, n]
    except ValueError:
        raise SatelliteError("Área inválida. Consulte uma região de até 6 graus de extensão.") from None


def date_param(value):
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(value)):
            raise ValueError()
        d = date.fromisoformat(value)
        if d > utc_now().date():
            raise ValueError()
        return d
    except (TypeError, ValueError):
        raise SatelliteError("Data inválida ou futura.") from None


def dimensions(q, bbox):
    width = number(q.get("width", 768), "Largura", 128, 1024)
    if width != int(width):
        raise SatelliteError("Largura inválida.")
    merc = mercator_bbox(bbox)
    height = max(128, min(1024, round(width * (merc[3] - merc[1]) / (merc[2] - merc[0]))))
    return int(width), height


def mercator_bbox(bbox):
    w, s, e, n = bbox
    radius = 6378137
    def y(lat):
        return radius * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))
    return [radius * math.radians(w), y(s), radius * math.radians(e), y(n)]


def png(data):
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise SatelliteError("O provedor não devolveu uma imagem válida.", 502)
    return data


def landsat_record(item):
    """Só Landsat 8/9 L2SP: L2SR não contém temperatura utilizável."""
    if not isinstance(item, dict) or not LANDSAT_ID.fullmatch(str(item.get("id", ""))):
        return None
    assets = item.get("assets", {})
    if "lwir11" not in assets or "qa_pixel" not in assets:
        return None
    properties = item.get("properties", {})
    try:
        dt = datetime.fromisoformat(properties["datetime"].replace("Z", "+00:00"))
        cloud = number(properties["eo:cloud_cover"], "Nuvens", 0, 100)
        bb = item["bbox"]
        if dt.tzinfo is None or len(bb) != 4 or not all(math.isfinite(float(x)) for x in bb):
            return None
        # Escala e offset oficiais do ST_B10 (Collection 2, Level 2).
        band = assets["lwir11"].get("raster:bands", [{}])[0]
        if band.get("scale") != 0.00341802 or band.get("offset") != 149:
            return None
        return {"id": item["id"], "datetime": iso(dt), "date": dt.date().isoformat(),
                "cloud": cloud, "bbox": bb,
                "platform": "Landsat " + item["id"][3], "pathRow": item["id"][10:16]}
    except (KeyError, ValueError, TypeError, IndexError, SatelliteError):
        return None


def landsat_dates(q):
    bb = bbox_param(q)
    end = date_param(q.get("ate", utc_now().date().isoformat()))
    start = date_param(q.get("de", (end - timedelta(days=90)).isoformat()))
    if not 0 <= (end - start).days <= 180:
        raise SatelliteError("Selecione um intervalo de até 180 dias.")
    params = {"collections": "landsat-c2-l2", "bbox": ",".join(map(str, bb)),
              "datetime": start.isoformat() + "T00:00:00Z/" + end.isoformat() + "T23:59:59Z",
              "limit": 100, "sortby": "-datetime"}
    url = query_url(STAC + "/search", params)
    def load():
        data = get_json(url)
        if not isinstance(data.get("features"), list):
            raise SatelliteError("O catálogo Landsat enviou uma resposta inválida.", 502)
        records = []
        for item in data["features"]:
            r = landsat_record(item)
            if r and start.isoformat() <= r["date"] <= end.isoformat():
                records.append(r)
        records.sort(key=lambda r: (r["datetime"], -r["cloud"]), reverse=True)
        return {"scenes": records, "bbox": bb, "from": start.isoformat(), "to": end.isoformat(),
                "truncated": any(l.get("rel") == "next" for l in data.get("links", [])),
                "source": "USGS Landsat Collection 2 L2 · Microsoft Planetary Computer",
                "checkedAt": iso(utc_now())}
    return _cache.get(url, 3600, load)


def landsat_scene(q):
    scene_id = str(q.get("item", ""))
    if not LANDSAT_ID.fullmatch(scene_id):
        raise SatelliteError("Cena Landsat inválida.")
    def load():
        item = get_json(STAC + "/collections/landsat-c2-l2/items/" + scene_id)
        record = landsat_record(item)
        if record is None or record["id"] != scene_id:
            raise SatelliteError("Esta cena não possui temperatura de superfície disponível.", 404)
        return record
    return _cache.get("scene:" + scene_id, 86400, load)


def landsat_image(q):
    bb = bbox_param(q)
    scene = landsat_scene(q)
    sb = scene["bbox"]
    if bb[0] >= sb[2] or bb[2] <= sb[0] or bb[1] >= sb[3] or bb[3] <= sb[1]:
        raise SatelliteError("A cena selecionada não cobre esta região.", 404)
    width, height = dimensions(q, bb)
    url = query_url(RASTER + "/bbox/" + ",".join(map(str, bb)) + "/%sx%s.png" % (width, height), {
        "collection": "landsat-c2-l2", "item": scene["id"], "expression": LANDSAT_EXPRESSION,
        "asset_as_band": "true", "unscale": "false", "rescale": "0,255",
        "colormap": json.dumps(LANDSAT_COLORMAP, separators=(",", ":")),
        "coord_crs": "EPSG:4326", "dst_crs": "EPSG:3857",
        "resampling": "nearest", "reproject": "nearest",
    })
    return _cache.get(url, 3600, lambda: png(download(url)))


def landsat_point(q):
    scene = landsat_scene(q)
    lat = number(q.get("lat"), "Latitude", -85, 85)
    lng = number(q.get("lng"), "Longitude", -180, 180)
    bb = scene["bbox"]
    result = {"temperatureC": None, "datetime": scene["datetime"], "scene": scene["id"],
              "lat": lat, "lng": lng, "reason": "Sem leitura válida: nuvem, sombra ou pixel sem dados."}
    if not (bb[0] <= lng <= bb[2] and bb[1] <= lat <= bb[3]):
        result["reason"] = "Ponto fora da cena selecionada."
        return result
    data = get_json(query_url(RASTER + "/point/%s,%s" % (lng, lat), {
        "collection": "landsat-c2-l2", "item": scene["id"], "assets": ["lwir11", "qa_pixel"],
        "asset_as_band": "true", "unscale": "false",
    }))
    names, values = data.get("band_names"), data.get("values")
    if not isinstance(names, list) or not isinstance(values, list) or len(names) != len(values):
        raise SatelliteError("O Landsat enviou uma leitura inválida.", 502)
    bands = dict(zip(names, values))
    if not {"lwir11", "qa_pixel"}.issubset(bands):
        raise SatelliteError("O Landsat não devolveu as bandas necessárias.", 502)
    dn, qa = bands["lwir11"], bands["qa_pixel"]
    if dn is None or qa is None:
        return result
    try:
        dn, qa = float(dn), float(qa)
        if not (math.isfinite(dn) and math.isfinite(qa) and 0 <= dn <= 65535 and
                0 <= qa <= 65535 and qa == int(qa)):
            raise ValueError()
    except (TypeError, ValueError):
        raise SatelliteError("O Landsat enviou uma leitura inválida.", 502) from None
    if dn > 0 and int(qa) & 63 == 0:
        result["temperatureC"] = round(dn * 0.00341802 + 149 - 273.15, 2)
        result["reason"] = None
    return result


def smap_catalog():
    def load():
        try:
            root = ET.fromstring(download(GIBS + "/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml"))
            ns = {"w": "http://www.opengis.net/wmts/1.0", "o": "http://www.opengis.net/ows/1.1"}
            layers = {}
            cutoff = utc_now().date() - timedelta(days=90)
            for layer in root.findall("w:Contents/w:Layer", ns):
                name = layer.findtext("o:Identifier", "", ns)
                if name not in SMAP_LAYERS.values():
                    continue
                dim = next((d for d in layer.findall("w:Dimension", ns)
                            if d.findtext("o:Identifier", "", ns).lower() == "time"), None)
                if dim is None:
                    raise ValueError()
                latest = date_param(dim.findtext("w:Default", "", ns))
                days = {latest.isoformat()}
                for v in dim.findall("w:Value", ns):
                    parts = (v.text or "").split("/")
                    if len(parts) == 1:
                        d = date.fromisoformat(parts[0][:10])
                        if cutoff <= d <= latest:
                            days.add(d.isoformat())
                    elif len(parts) == 3 and parts[2] == "P1D":
                        d = max(cutoff, date.fromisoformat(parts[0][:10]))
                        last = min(latest, date.fromisoformat(parts[1][:10]))
                        while d <= last:
                            days.add(d.isoformat())
                            d += timedelta(days=1)
                    else:
                        raise ValueError()
                layers[name] = {"dates": sorted(days, reverse=True), "latest": latest.isoformat()}
            if set(layers) != set(SMAP_LAYERS.values()):
                raise ValueError()
            return {"layers": layers, "legend": SMAP_LEGEND,
                    "source": "NASA GIBS · SMAP L4 · análise às 12h UTC",
                    "resolutionKm": 9, "checkedAt": iso(utc_now())}
        except (ET.ParseError, ValueError, SatelliteError) as error:
            if isinstance(error, SatelliteError) and error.status >= 500:
                raise
            raise SatelliteError("O catálogo SMAP enviou datas inválidas.", 502) from None
    return _cache.get("smap:catalog", 6 * 3600, load)


def smap_image(q):
    bb = bbox_param(q)
    layer = SMAP_LAYERS.get(q.get("camada", "superficie"))
    if not layer:
        raise SatelliteError("Camada SMAP inválida.")
    selected = date_param(q.get("date")).isoformat()
    if selected not in smap_catalog()["layers"][layer]["dates"]:
        raise SatelliteError("Não há imagem SMAP disponível nesta data.", 404)
    width, height = dimensions(q, bb)
    url = query_url(GIBS + "/wms/epsg3857/best/wms.cgi", {
        "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap", "LAYERS": layer,
        "STYLES": "", "FORMAT": "image/png", "TRANSPARENT": "TRUE", "SRS": "EPSG:3857",
        "BBOX": ",".join(map(str, mercator_bbox(bb))), "WIDTH": width, "HEIGHT": height, "TIME": selected,
    })
    return _cache.get(url, 3600, lambda: png(download(url)))


# Os três VIIRS em órbita olham o mesmo lugar com ~50 min de diferença; um só
# deixava de fora o que queimou entre as passagens ou estava sob nuvem naquela.
# Mesmo instrumento e pixel (375 m), então a leitura é a mesma para os três.
FIRMS_SENSORES = (
    # pasta no FIRMS, prefixo do arquivo, satélite
    ("suomi-npp-viirs-c2", "SUOMI_VIIRS_C2", "S-NPP"),
    ("noaa-20-viirs-c2", "J1_VIIRS_C2", "NOAA-20"),
    ("noaa-21-viirs-c2", "J2_VIIRS_C2", "NOAA-21"),
)
FIRMS_TTL = 15 * 60
FIRMS_MAX_BYTES = 40 * 1024 * 1024
# Linha com defeito é ignorada e contada; acima disto o arquivo inteiro é suspeito.
FIRMS_DEFEITO_MAX = 0.01
FIRMS_CAMPOS = ("latitude", "longitude", "acq_date", "acq_time", "confidence", "satellite", "frp")
_CONFIANCA = {"l": 0, "low": 0, "n": 1, "nominal": 1, "h": 2, "high": 2}
_CONFIANCA_NOME = ("low", "nominal", "high")


class FirmsFeed:
    """Um arquivo FIRMS já lido, em colunas compactas ordenadas pela latitude.

    Lido uma vez por download (não a cada pedido): o arquivo da América do Sul
    tem dezenas de milhares de linhas, e relê-lo a cada arrasto do mapa custava
    meio segundo de CPU por pedido, segurando o servidor para todo mundo.
    """
    __slots__ = ("satellite", "lat", "lng", "ts", "conf", "frp", "dn",
                 "latest", "invalid", "rows", "fetched_at")

    def __init__(self, satellite, rows, latest, invalid, fetched_at):
        rows.sort()   # pela latitude: o pedido acha a faixa com busca binária
        self.satellite = satellite
        self.lat = array("d", (r[0] for r in rows))
        self.lng = array("d", (r[1] for r in rows))
        self.ts = array("q", (r[2] for r in rows))
        self.conf = array("b", (r[3] for r in rows))
        self.frp = array("d", (r[4] for r in rows))
        self.dn = array("b", (r[5] for r in rows))
        self.latest = latest
        self.invalid = invalid
        self.rows = len(rows)
        self.fetched_at = fetched_at

    @property
    def nbytes(self):
        return 512 + sum(a.itemsize * len(a) for a in (self.lat, self.lng, self.ts,
                                                        self.conf, self.frp, self.dn))


def firms_parse(data, satellite="NOAA-20", now=None):
    """CSV do FIRMS -> FirmsFeed. Cabeçalho errado (página de erro, outro
    arquivo) recusa tudo; linha com defeito é contada e fica de fora, desde que
    sejam poucas — o número vai junto na resposta, nada some calado."""
    erro = SatelliteError("O FIRMS enviou um arquivo de focos inválido.", 502)
    try:
        reader = csv.reader(io.StringIO(data.decode("utf-8-sig")))
        header = [h.strip() for h in next(reader, [])]
    except (UnicodeError, csv.Error):
        raise erro from None
    col = {nome: i for i, nome in enumerate(header)}
    if not all(c in col for c in FIRMS_CAMPOS):
        raise erro
    i_lat, i_lng, i_dia, i_hora = col["latitude"], col["longitude"], col["acq_date"], col["acq_time"]
    i_conf, i_sat, i_frp, i_dn = col["confidence"], col["satellite"], col["frp"], col.get("daynight")
    agora = (now or utc_now()).timestamp()
    dias, rows, invalid, total, latest = {}, [], 0, 0, None
    try:
        for row in reader:
            if not row:
                continue
            total += 1
            try:
                lat, lng = float(row[i_lat]), float(row[i_lng])
                if not (-90 <= lat <= 90 and -180 <= lng <= 180):   # também barra nan/inf
                    raise ValueError()
                hhmm = row[i_hora].strip().zfill(4)
                if len(hhmm) != 4 or not hhmm.isdigit() or int(hhmm[:2]) > 23 or int(hhmm[2:]) > 59:
                    raise ValueError()
                dia = row[i_dia].strip()
                base = dias.get(dia)
                if base is None:
                    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", dia):
                        raise ValueError()
                    base = dias[dia] = calendar.timegm(date.fromisoformat(dia).timetuple())
                ts = base + int(hhmm[:2]) * 3600 + int(hhmm[2:]) * 60
                if not row[i_sat].strip():
                    raise ValueError()
                conf = _CONFIANCA[row[i_conf].strip().lower()]
                frp = float(row[i_frp])
                if not 0 <= frp <= 1000000:
                    raise ValueError()
                dn = {"D": 1, "N": 0}.get(row[i_dn].strip().upper(), -1) if i_dn is not None and i_dn < len(row) else -1
            except (ValueError, KeyError, IndexError):
                invalid += 1
                continue
            if ts <= agora and (latest is None or ts > latest):
                latest = ts
            rows.append((lat, lng, ts, conf, frp, dn))
    except csv.Error:
        raise erro from None
    if invalid and invalid > total * FIRMS_DEFEITO_MAX:
        # Defeito demais: melhor dizer que o arquivo veio quebrado do que
        # desenhar um mapa com buracos que parecem "sem fogo".
        raise SatelliteError("O arquivo FIRMS contém leituras inválidas. Tente novamente.", 502)
    return FirmsFeed(satellite, rows, latest, invalid, iso(utc_now()))


def firms_select(feeds, bb, now, hours, limit=2000):
    """Focos dentro da caixa e da janela, dos mais recentes para os mais antigos."""
    w, s, e, n = bb
    fim = now.timestamp()
    ini = fim - hours * 3600
    achados = []
    for feed in feeds:
        lat, lng, ts = feed.lat, feed.lng, feed.ts
        for i in range(bisect.bisect_left(lat, s), bisect.bisect_right(lat, n)):
            if w <= lng[i] <= e and ini <= ts[i] <= fim:
                achados.append((ts[i], feed, i))
    achados.sort(key=lambda a: a[0], reverse=True)
    features = []
    for t, feed, i in achados[:limit]:
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [feed.lng[i], feed.lat[i]]},
                         "properties": {"datetime": iso(datetime.fromtimestamp(t, timezone.utc)),
                                        "confidence": _CONFIANCA_NOME[feed.conf[i]], "frpMW": round(feed.frp[i], 2),
                                        "satellite": feed.satellite, "instrument": "VIIRS", "resolutionM": 375,
                                        "daynight": {1: "D", 0: "N"}.get(feed.dn[i], "")}})
    latest = max((f.latest for f in feeds if f.latest is not None), default=None)
    return features, len(achados), (datetime.fromtimestamp(latest, timezone.utc) if latest is not None else None)


def firms_features(data, bb, now, hours, limit=2000):
    """Atalho para um arquivo só (testes e verificação manual)."""
    return firms_select([firms_parse(data, now=now)], bb, now, hours, limit)


def firms(q):
    bb = bbox_param(q)
    period = str(q.get("horas", "24"))
    if period not in ("24", "48", "168"):
        raise SatelliteError("Selecione 24 horas, 48 horas ou 7 dias.")
    hours = int(period)
    # Arquivos regionais reduzem tráfego/memória; fora desta região usa o global.
    region = "South_America" if (-82 <= bb[0] < bb[2] <= -34 and -57 <= bb[1] < bb[3] <= 14) else "Global"
    suffix = "7d" if hours == 168 else period + "h"
    now = utc_now()

    def carregar(sensor):
        pasta, prefixo, satelite = sensor
        url = FIRMS + "/data/active_fire/%s/csv/%s_%s_%s.csv" % (pasta, prefixo, region, suffix)
        try:
            feed = _cache.get(url, FIRMS_TTL, lambda: firms_parse(download(url, max_bytes=FIRMS_MAX_BYTES), satelite))
            return satelite, feed, None
        except SatelliteError as error:
            return satelite, None, str(error)

    with ThreadPoolExecutor(max_workers=len(FIRMS_SENSORES)) as pool:
        lidos = list(pool.map(carregar, FIRMS_SENSORES))
    feeds = [feed for _, feed, _ in lidos if feed is not None]
    if not feeds:
        # Nenhum satélite respondeu: erro, nunca "nenhum foco".
        raise SatelliteError(lidos[0][2] or "O FIRMS está indisponível. Tente novamente.", 502)
    points, count, latest = firms_select(feeds, bb, now, hours)
    usados = [sat for sat, feed, _ in lidos if feed is not None]
    return {"type": "FeatureCollection", "features": points,
            "meta": {"source": "NASA FIRMS · VIIRS " + ", ".join(usados) + " · NRT", "resolutionM": 375,
                     "bbox": bb, "hours": hours, "from": iso(now - timedelta(hours=hours)), "to": iso(now),
                     "fetchedAt": min(feed.fetched_at for feed in feeds),
                     "latestSourceDetection": iso(latest) if latest else None,
                     "count": count, "truncated": count > len(points), "region": region,
                     "sourceLagHours": round((now - latest).total_seconds() / 3600, 1) if latest else None,
                     "invalidRows": sum(feed.invalid for feed in feeds),
                     "sources": [{"satellite": sat, "ok": feed is not None,
                                  "fetchedAt": feed.fetched_at if feed else None,
                                  "latestDetection": (iso(datetime.fromtimestamp(feed.latest, timezone.utc))
                                                      if feed and feed.latest is not None else None),
                                  "invalidRows": feed.invalid if feed else None, "error": erro}
                                 for sat, feed, erro in lidos]}}


def handle(path, q):
    """Retorna (tipo, corpo); SatelliteError transporta HTTP e mensagem pública."""
    if path == "/satelites/landsat/datas":
        value = landsat_dates(q)
    elif path == "/satelites/landsat/imagem":
        return "image/png", landsat_image(q)
    elif path == "/satelites/landsat/ponto":
        value = landsat_point(q)
    elif path == "/satelites/smap/datas":
        value = smap_catalog()
    elif path == "/satelites/smap/imagem":
        return "image/png", smap_image(q)
    elif path == "/satelites/firms":
        value = firms(q)
    else:
        raise SatelliteError("Rota de satélite desconhecida.", 404)
    return "application/json", json.dumps(value, ensure_ascii=False, allow_nan=False).encode()
