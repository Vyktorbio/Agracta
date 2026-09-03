# -*- coding: utf-8 -*-
"""Chuva DEPOIS da aplicacao, no proxy (roadmap secao 9).

O QUE ESTE TESTE PROTEGE

A janela ambiental responde "o que aconteceu ENTRE a aplicacao e a avaliacao".
Falta a pergunta que decide se a aplicacao valeu: choveu LOGO DEPOIS? Produto
lavado tres horas apos a pulverizacao nao e produto que nao funcionou.

Quatro coisas precisam continuar valendo:

 1. A CONTA E POR HORA, NAO POR DIA. Numa aplicacao das 15h, o acumulado do dia
    inclui a chuva das 6h — que caiu ANTES e nao lavou nada. Contar o dia inteiro
    produziria um numero limpo e falso.

 2. A BASE E O QUE JA TINHA CHOVIDO. A serie da Ecowitt e o acumulado do dia, que
    zera a meia-noite; a chuva depois do instante T e quanto esse acumulado SUBIU
    de T em diante, nunca o valor bruto.

 3. SEM HORA NAO SE FINGE PRECISAO: conta-se o dia inteiro e o retorno declara
    isso em `hora_conhecida`.

 4. JANELA ABERTA NAO SE APRESENTA COMO FECHADA, e dia sem leitura derruba a
    cobertura em vez de sumir da conta. Zero mm sem leitura nenhuma afirmaria que
    nao choveu.

Rodar: python3 test_pos_aplicacao_proxy.py
"""
import importlib.util, sys, os, time

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


def ep(dia, hora):
    return proxy._epoch_de(dia, hora)


# ---- o instante ------------------------------------------------------------
print("\n--- O instante da aplicacao ---")
eq(ep("2026-09-03", "09:31") - ep("2026-09-03", "08:31"), 3600, "uma hora sao 3600 s")
eq(ep("2026-09-03", None), ep("2026-09-03", "00:00"), "sem hora, o dia comeca a meia-noite")
try:
    proxy._epoch_de("ontem", "09:31")
    ck(False, "data que nao e data deveria ser recusada")
except RuntimeError as e:
    ck(str(e).startswith("CLIMA:"), "data invalida recusada com sentinela CLIMA:")

# ---- GOLDEN TEST da conta por hora -----------------------------------------
# Serie de um dia, acumulado diario da estacao (zera a meia-noite):
#   06:00 -> 8,0 mm   (choveu de madrugada, ANTES da aplicacao)
#   09:00 -> 8,0
#   12:00 -> 8,0
#   15:00 -> 8,0
#   18:00 -> 20,0     (choveu 12 mm a tarde, DEPOIS da aplicacao)
#   23:00 -> 20,0
# Aplicacao as 15:00. A resposta certa e 12,0 mm — nao 20,0.
print("\n--- GOLDEN TEST: a chuva de antes nao conta ---")
DIA = "2026-09-03"
serie = [(ep(DIA, h), v) for h, v in
         [("06:00", 8.0), ("09:00", 8.0), ("12:00", 8.0),
          ("15:00", 8.0), ("18:00", 20.0), ("23:00", 20.0)]]

mm, prim = proxy._chuva_no_intervalo(serie, ep(DIA, "15:00"), ep(DIA, "23:59"))
perto(mm, 12.0, 1e-9, "das 15h em diante choveu 12 mm (e nao os 20 do dia)")
eq(prim, ep(DIA, "18:00"), "e a primeira chuva foi as 18h")

mm2, _ = proxy._chuva_no_intervalo(serie, ep(DIA, "00:00"), ep(DIA, "23:59"))
perto(mm2, 20.0, 1e-9, "o dia inteiro da os 20 mm — a conta grosseira continua disponivel")

mm3, prim3 = proxy._chuva_no_intervalo(serie, ep(DIA, "18:30"), ep(DIA, "23:59"))
perto(mm3, 0.0, 1e-9, "depois da chuva ter passado, nada mais entra")
eq(prim3, None, "e nao ha primeira chuva a declarar")

mm4, _ = proxy._chuva_no_intervalo(serie, ep(DIA, "15:00"), ep(DIA, "17:00"))
perto(mm4, 0.0, 1e-9, "janela que fecha antes da chuva devolve zero, nao os 12 mm")

print("\n--- Orvalho no pluviometro nao e 'choveu' ---")
serie_orv = [(ep(DIA, h), v) for h, v in [("15:00", 0.0), ("16:00", 0.1), ("20:00", 0.1)]]
mm5, prim5 = proxy._chuva_no_intervalo(serie_orv, ep(DIA, "15:00"), ep(DIA, "23:59"))
perto(mm5, 0.1, 1e-9, "os 0,1 mm entram no total")
eq(prim5, None, "mas nao viram 'primeira chuva' — abaixo do limiar e orvalho")

print("\n--- Sem amostra anterior, a base e a primeira do intervalo ---")
# Assumir zero atribuiria ao intervalo a chuva da madrugada inteira.
serie_tarde = [(ep(DIA, h), v) for h, v in [("16:00", 30.0), ("20:00", 33.0)]]
mm6, _ = proxy._chuva_no_intervalo(serie_tarde, ep(DIA, "15:00"), ep(DIA, "23:59"))
perto(mm6, 3.0, 1e-9, "subiu 3 mm — nao os 33 acumulados desde a meia-noite")

print("\n--- Acumulado que zera no meio nao vira numero negativo ---")
serie_reset = [(ep(DIA, h), v) for h, v in [("15:00", 12.0), ("18:00", 2.0), ("20:00", 5.0)]]
mm7, _ = proxy._chuva_no_intervalo(serie_reset, ep(DIA, "15:00"), ep(DIA, "23:59"))
ck(mm7 >= 0, "a chuva nunca sai negativa")
perto(mm7, 5.0, 1e-9, "e vale o pico depois do reset")

# ---- a janela inteira ------------------------------------------------------
# Aplicacao as 15:00 de um dia ja passado, janela de 48 h.
#   D+0: 8 mm antes das 15h, sobe para 20 as 18h  -> 12 mm contam
#   D+1: nada
#   D+2: sobe 5 mm as 10h (dentro) e mais 40 as 20h (FORA da janela)
# Os dias sao relativos a HOJE porque `completa` compara com o relogio: uma data
# fixa faria o teste passar hoje e falhar no ano que vem.
def _dia(desloc):
    return time.strftime("%Y-%m-%d", time.localtime(time.time() + desloc * 86400))


D0, D1, D2 = _dia(-10), _dia(-9), _dia(-8)
serie = [(ep(D0, h), v) for h, v in
         [("06:00", 8.0), ("09:00", 8.0), ("12:00", 8.0),
          ("15:00", 8.0), ("18:00", 20.0), ("23:00", 20.0)]]
SERIES = {
    D0: serie,
    D1: [(ep(D1, h), v) for h, v in [("06:00", 0.0), ("22:00", 0.0)]],
    D2: [(ep(D2, h), v) for h, v in
         [("06:00", 0.0), ("10:00", 5.0), ("14:00", 5.0), ("20:00", 45.0)]],
}


def serie_falsa(mac, dia):
    s = SERIES.get(dia)
    if s is None:
        raise RuntimeError("ECOWITT:sem dados")
    return s


proxy._chuva_serie_dia = serie_falsa
proxy._pos_cache.clear()

print("\n--- GOLDEN TEST: 48 h depois da aplicacao ---")
j = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
eq(j["horas"], 48, "a janela e de 48 h")
eq(j["hora_conhecida"], True, "a hora da aplicacao era conhecida")
eq(j["dias"], 3, "ela atravessa tres dias de calendario")
eq(j["dias_com_leitura"], 3, "os tres com leitura")
eq(j["cobertura_pct"], 100, "cobertura cheia")
perto(j["chuva_mm"], 17.0, 1e-9, "12 mm no dia da aplicacao + 5 mm no terceiro = 17 mm")
ck(j["chuva_mm"] < 20.0, "os 40 mm que cairam DEPOIS do fim da janela nao entram")
eq(j["choveu"], True, "choveu")
perto(j["primeira_chuva_horas"], 3.0, 1e-9, "a primeira chuva veio 3 h depois da aplicacao")
eq(j["completa"], True, "a janela ja fechou — a aplicacao foi ha dez dias")
eq(j["fonte"], "ecowitt-historico", "e a fonte vai declarada")

print("\n--- Sem hora, conta-se o dia inteiro E SE DIZ ISSO ---")
proxy._pos_cache.clear()
j2 = proxy.do_clima_pos("AA:BB", D0, None, 48)
eq(j2["hora_conhecida"], False, "o retorno declara que a hora nao era conhecida")
# Sem hora a janela vai de meia-noite a meia-noite: entra a chuva que caiu ANTES
# de pulverizar (os 8 mm da madrugada) e sai a do terceiro dia, que passou a
# ficar fora das 48 h. O numero muda nas duas pontas — por isso a declaracao.
perto(j2["chuva_mm"], 20.0, 1e-9, "o dia inteiro da 20 mm: a chuva de antes de pulverizar entra")
ck(j2["chuva_mm"] != j["chuva_mm"], "e o numero e mesmo outro: por isso a declaracao importa")

print("\n--- Janela mais curta corta a chuva mais tarde ---")
proxy._pos_cache.clear()
j3 = proxy.do_clima_pos("AA:BB", D0, "15:00", 24)
perto(j3["chuva_mm"], 12.0, 1e-9, "em 24 h so entram os 12 mm do proprio dia")

print("\n--- Dia mudo derruba a cobertura, nao some da conta ---")
proxy._pos_cache.clear()
del SERIES[D1]
j4 = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
eq(j4["dias_com_leitura"], 2, "dois dias com leitura")
eq(j4["cobertura_pct"], 67, "cobertura de 67%")
eq(j4["dias_sem_leitura"], [D1], "e o dia mudo vai NOMEADO")
perto(j4["chuva_mm"], 17.0, 1e-9, "o que se pode somar continua sendo somado")

print("\n--- Estacao muda o tempo todo: nada e inventado ---")
proxy._pos_cache.clear()
SERIES.clear()
j5 = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
eq(j5["dias_com_leitura"], 0, "zero dias com leitura")
# "0 mm" numa janela sem leitura nenhuma afirmaria que nao choveu depois.
eq(j5["chuva_mm"], None, "chuva e None, NAO 0")
eq(j5["choveu"], None, "e nem se afirma que nao choveu")

print("\n--- Janela que ainda nao fechou nao se apresenta como fechada ---")
proxy._pos_cache.clear()
hoje = time.strftime("%Y-%m-%d", time.localtime())
SERIES[hoje] = [(int(time.time()) - 600, 0.0)]
j6 = proxy.do_clima_pos("AA:BB", hoje, None, 48)
eq(j6["completa"], False, "a janela de 48 h de hoje ainda esta aberta")

print("\n--- Entrada impossivel e recusada, nao calculada ---")
proxy._pos_cache.clear()
for mac, data, horas, rot in [(None, "2026-09-03", 48, "sem estacao"),
                              ("AA:BB", "2026-09-03", 0, "janela de zero hora"),
                              ("AA:BB", "2026-09-03", 999, "janela de 999 horas"),
                              ("AA:BB", "2026-09-03", "muitas", "horas que nao sao numero")]:
    try:
        proxy.do_clima_pos(mac, data, None, horas)
        ck(False, rot + " deveria ser recusada")
    except RuntimeError as e:
        ck(str(e).startswith("CLIMA:"), rot + " recusada com sentinela CLIMA:")

print("\n--- O cache devolve a mesma leitura sem rebater na estacao ---")
proxy._pos_cache.clear()
SERIES.clear()
SERIES.update({D0: serie, D1: [], D2: []})
a = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
SERIES[D0] = [(ep(D0, "16:00"), 500.0)]   # se rebater, muda
b = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
eq(b["chuva_mm"], a["chuva_mm"], "veio do cache")
proxy._pos_cache.clear()
c = proxy.do_clima_pos("AA:BB", D0, "15:00", 48)
ck(c["chuva_mm"] != a["chuva_mm"], "e sem cache ela rebate e traz o novo valor")

print("")
if falhas[0]:
    print("FALHA: %d de %d checagens" % (falhas[0], falhas[0] + passou[0]))
    sys.exit(1)
print("todas as %d checagens passaram" % passou[0])
