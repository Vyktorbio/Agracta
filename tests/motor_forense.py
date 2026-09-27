# Triagem forense v2 — calibração e poder no Python/WASM entregue ao aparelho.
# Cada cenário honesto abaixo marcava INVESTIGAR com frequência na versão 1
# (limiares fixos): subdispersão de Poisson em contagem honesta, gradiente de
# campo lido como anomalia, severidade estimada a olho lida como fraude de dígito.
import numpy as np
from bioengine import forense as F
from bioengine.decide import analisar

PAP = {"resposta": "y", "tratamento": "trat", "repeticao": "rep", "estrato": ["est"]}

def estudo(rng, modo="honesto", grad=0.0, perda=False, nt=5, nrep=4, nd=3):
    d = {"trat": [], "rep": [], "y": [], "est": []}
    efb = rng.normal(0, 1, nrep)
    for k in range(nd):
        for i in range(nt):
            lam = 8 + i * 4 + k * 3
            s = np.sqrt(lam)
            for r in range(nrep):
                if modo == "visual":
                    real = np.clip(12 + i * 12 + k * 6 + efb[r] * 4 + rng.normal(0, 6), 0, 100)
                    v = round(real / 5) * 5
                elif modo == "apertado":          # inventado: repetições apertadas demais
                    v = round(lam + rng.normal(0, s * 0.3))
                elif modo == "copia":
                    v = rng.poisson(lam)
                else:
                    v = rng.poisson(max(lam + grad * s * (r - (nrep - 1) / 2), 0.2))
                d["trat"].append("T%d" % (i + 1)); d["rep"].append(str(r + 1))
                d["y"].append(float(max(0, v))); d["est"].append("D%d" % k)
    if modo == "copia":                            # T4 repete o conjunto de T1 em cada data
        n = nrep
        for k in range(nd):
            base = k * nt * n
            d["y"][base + 3 * n:base + 4 * n] = d["y"][base:base + n][::-1]
    if perda:
        d["y"][7] = float("nan")
    return d

def investigar(modo, tipo="count", it=20, **kw):
    rng = np.random.default_rng(11)
    n = 0
    for _ in range(it):
        rel = F.analisar_forense(estudo(rng, modo, **kw), PAP, {"tipo": tipo, "reamostras": 400})
        assert rel["ok"], rel
        n += rel["veredito"]["nivel"] == "INVESTIGAR"
    return n / it

# honestos: não podem virar INVESTIGAR (1 em 20 tolerado por acaso; o esperado é <1%)
for rot, kw in [("contagem", {}), ("gradiente forte", {"grad": 2.2}), ("parcela perdida", {"perda": True})]:
    t = investigar("honesto", **kw)
    assert t <= 1 / 20, ("honesto %s marcado INVESTIGAR em %.0f%%" % (rot, t * 100))
t = investigar("visual", tipo="cont")
assert t <= 1 / 20, "severidade visual honesta (passo de 5%%) marcada em %.0f%%" % (t * 100)

# fabricados: precisam ser pegos
assert investigar("apertado") >= 0.9, "contagem com repetições apertadas não foi detectada"
assert investigar("copia") >= 0.9, "bloco copiado entre tratamentos não foi detectado"

# reprodutibilidade: mesma entrada e mesma seed -> mesmos p-valores
d = estudo(np.random.default_rng(5))
a = F.analisar_forense(d, PAP, {"tipo": "count"})
b = F.analisar_forense(d, PAP, {"tipo": "count"})
assert [x["p"] for x in a["achados"]] == [x["p"] for x in b["achados"]]

# proporção com 0% e 100%: arco-seno, nunca logit (indefinido na fronteira)
sev = [0, 0, 0, 5, 5, 5, 10, 15, 30, 35, 40, 45, 55, 60, 65, 70, 85, 90, 95, 95, 95, 100, 100, 100]
rel = analisar({"tratamento": ["A"] * 8 + ["B"] * 8 + ["C"] * 8, "severidade": sev},
               {"resposta": "severidade", "fatores": ["tratamento"], "tipo_resposta": "proporcao"},
               {"alfa": 0.05, "tipo_resposta": "proporcao"})
assert rel["analise"]["transformacao"] == "arcsen√ (proporção 0–100)", rel["analise"]["transformacao"]
