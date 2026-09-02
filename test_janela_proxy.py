# -*- coding: utf-8 -*-
"""Janela ambiental do proxy (roadmap secao 9).

O QUE ESTE TESTE PROTEGE

"O que aconteceu entre a aplicacao e a avaliacao" e a pergunta que explica o
resultado de um ensaio. O carimbo guarda o INSTANTE de cada evento, e instante nao
diz se choveu 72 mm no intervalo.

Tres coisas precisam continuar valendo:

 1. GOLDEN TEST, conferido a mao: chuva somada, temperatura media das medias,
    maxima como o MAIOR PICO do periodo (nao a media das maximas), e a contagem de
    dias com chuva acima do limiar.

 2. COBERTURA NAO E OPCIONAL. Uma media de 11 dias apresentada como "os 14 dias da
    janela" e mentira. O dia que falha entra como ausente e derruba a cobertura;
    ele NAO some da conta em silencio.

 3. UM DIA RUIM NAO DERRUBA A JANELA. A estacao piscar numa terca-feira nao pode
    apagar as outras treze.

Rodar: python3 test_janela_proxy.py
"""
import importlib.util, sys, os

spec = importlib.util.spec_from_file_location("proxy", os.path.join(os.path.dirname(__file__), "ndvi-proxy.py"))
proxy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proxy)

falhas = [0]
passou = [0]


def ck(ok, nome):
    if ok:
        passou[0] += 1
        print("  ok    " + nome)
    else:
        falhas[0] += 1
        print("  FALHA " + nome)


def eq(a, b, nome):
    ck(a == b, nome + ("" if a == b else "  (obtido %r, esperado %r)" % (a, b)))


def perto(a, b, tol, nome):
    ok = a is not None and abs(a - b) <= tol
    ck(ok, nome + ("" if ok else "  (obtido %r, esperado ~%r)" % (a, b)))


# ---- dias da janela ---------------------------------------------------------
print("\n--- A janela inclui as duas pontas ---")
eq(proxy._dias_entre("2026-08-20", "2026-08-20"), ["2026-08-20"], "um dia so")
eq(len(proxy._dias_entre("2026-08-20", "2026-09-02")), 14, "20/08 a 02/09 sao 14 dias")
eq(proxy._dias_entre("2026-08-20", "2026-08-22"),
   ["2026-08-20", "2026-08-21", "2026-08-22"], "as duas pontas entram")

print("\n--- Entrada impossivel e recusada, nao calculada ---")
for de, ate, rot in [("2026-09-02", "2026-08-20", "data final antes da inicial"),
                     ("ontem", "2026-08-20", "data que nao e data"),
                     ("2026-01-01", "2027-01-01", "janela de mais de 180 dias")]:
    try:
        proxy._dias_entre(de, ate)
        ck(False, rot + " deveria ser recusada")
    except RuntimeError as e:
        ck(str(e).startswith("CLIMA:"), rot + " recusada com sentinela CLIMA:")

try:
    proxy.do_clima_janela(None, "2026-08-20", "2026-09-02")
    ck(False, "sem estacao deveria ser recusado")
except RuntimeError as e:
    ck(str(e).startswith("CLIMA:"), "sem estacao (mac) e recusado")

# ---- GOLDEN TEST ------------------------------------------------------------
# Catorze dias. Dez com leitura, quatro sem — a estacao ficou muda de 26 a 29/08.
#   chuva: 20,0 + 12,0 + 40,0 + 0,1 = 72,1 mm em quatro dias, mas so tres passam
#          do limiar de 0,2 mm (o de 0,1 e orvalho no pluviometro, nao chuva)
#   temp media: media de dez medias, todas 24,6 -> 24,6
#   temp max: o MAIOR pico, 31,2 -> nao a media das maximas (que daria 28,6)
DIAS = {}
_base = ["2026-08-%02d" % d for d in range(20, 32)] + ["2026-09-01", "2026-09-02"]
for i, dia in enumerate(_base):
    if dia in ("2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29"):
        DIAS[dia] = None                      # estacao muda
        continue
    chuva = {"2026-08-20": 20.0, "2026-08-21": 12.0, "2026-08-30": 40.0,
             "2026-09-01": 0.1}.get(dia, 0.0)
    tmax = 31.2 if dia == "2026-08-25" else 28.0
    DIAS[dia] = {"dia": {"temp": 24.6, "temp_max": tmax, "temp_min": 18.0,
                         "humidity": 70.0, "wind_speed": 5.0, "wind_gust": 22.0,
                         "solar": 300.0, "rain_day": chuva}}


def historico_falso(mac, date, hora=None):
    d = DIAS.get(date)
    if d is None:
        raise RuntimeError("ECOWITT:sem dados")
    return d


proxy.do_clima_history = historico_falso
proxy._janela_cache.clear()

print("\n--- GOLDEN TEST: 14 dias, 4 sem leitura ---")
j = proxy.do_clima_janela("AA:BB", "2026-08-20", "2026-09-02")
eq(j["dias"], 14, "a janela tem 14 dias")
eq(j["dias_com_leitura"], 10, "dez com leitura")
eq(j["cobertura_pct"], 71, "cobertura de 71%")
eq(j["dias_sem_leitura"],
   ["2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29"],
   "e os quatro dias mudos vao NOMEADOS, nao so contados")
perto(j["chuva_mm"], 72.1, 1e-9, "chuva somada = 72,1 mm")
eq(j["dias_com_chuva"], 3, "tres dias com chuva — os 0,1 mm nao contam")
perto(j["temp_media"], 24.6, 1e-9, "temperatura media 24,6")
perto(j["temp_max"], 31.2, 1e-9,
      "maxima = o MAIOR pico do periodo, nao a media das maximas")
perto(j["temp_min"], 18.0, 1e-9, "minima = o menor")
perto(j["ur_media"], 70.0, 1e-9, "UR media 70")
perto(j["rajada_max"], 22.0, 1e-9, "rajada maxima 22")
eq(j["fonte"], "ecowitt-historico", "e a fonte vai declarada")

print("\n--- Um dia ruim nao derruba a janela ---")
ck(j["chuva_mm"] is not None, "a janela sai mesmo com quatro dias mudos")
ck(j["cobertura_pct"] < 100, "mas nao se apresenta como completa")

print("\n--- Estacao muda o tempo todo: nada e inventado ---")
proxy._janela_cache.clear()
todos_mudos = {d: None for d in _base}
DIAS.clear()
DIAS.update(todos_mudos)
j2 = proxy.do_clima_janela("AA:BB", "2026-08-20", "2026-09-02")
eq(j2["dias_com_leitura"], 0, "zero dias com leitura")
eq(j2["cobertura_pct"], 0, "cobertura zero")
# Chuva "0 mm" numa janela sem leitura nenhuma afirmaria que nao choveu.
eq(j2["chuva_mm"], None, "chuva e None, NAO 0 — nao se afirma que nao choveu")
eq(j2["dias_com_chuva"], None, "dias com chuva idem")
eq(j2["temp_media"], None, "e nenhuma media e inventada")

print("\n--- O cache devolve a mesma janela sem rebater na estacao ---")
DIAS.clear()
DIAS.update({d: {"dia": {"temp": 99.0}} for d in _base})   # se rebater, muda
j3 = proxy.do_clima_janela("AA:BB", "2026-08-20", "2026-09-02")
eq(j3["temp_media"], None, "a janela veio do cache, com o resultado anterior")
proxy._janela_cache.clear()
j4 = proxy.do_clima_janela("AA:BB", "2026-08-20", "2026-09-02")
perto(j4["temp_media"], 99.0, 1e-9, "e sem cache ela rebate e traz o novo valor")

print("")
if falhas[0]:
    print("FALHA: %d de %d checagens" % (falhas[0], falhas[0] + passou[0]))
    sys.exit(1)
print("todas as %d checagens passaram" % passou[0])
