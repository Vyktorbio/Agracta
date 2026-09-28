# CE50 do crescimento micelial: a concentração que reduz o crescimento à metade
# do da testemunha (Edgington et al., 1971). Roda no Pyodide (test_motor_python.js).
import numpy as np
from bioengine.dosecontinua import analisar_dose_continua, _llog4, _de_absoluta
from bioengine.decide import analisar

falhas = []
def ok(c, nome):
    if not c:
        falhas.append(nome)
        print('  FALHA ' + nome)

conc = np.repeat(np.array([0., 0.01, 0.1, 1., 10., 100.]), 4)

# 1. inibição completa (c = 0): CE50 absoluta = e
g = np.random.default_rng(11)
cres = _llog4(conc, 1.0, 0.0, 80.0, 1.0) + g.normal(0, 1.5, conc.size)
r = analisar_dose_continua(conc, np.clip(cres, 0, None), unidade='mg/L', maior_melhor=False)
ab = {q['nivel']: q for q in r['doses_efetivas_absolutas']}
ok(abs(ab[50.0]['dose'] - 1.0) < 0.25, 'c=0: CE50 absoluta ≈ 1 mg/L (%.3f)' % ab[50.0]['dose'])
ok(ab[50.0]['ic_inf'] < 1.0 < ab[50.0]['ic_sup'], 'e o IC cobre o valor verdadeiro')
ok(not ab[50.0]['extrapolado'], 'dentro das concentrações testadas')

# 2. inibição incompleta (c = 10): a CE50 absoluta NÃO é e
cres2 = _llog4(conc, 1.0, 10.0, 80.0, 1.0) + g.normal(0, 1.0, conc.size)
r2 = analisar_dose_continua(conc, cres2, unidade='mg/L')
ab2 = {q['nivel']: q for q in r2['doses_efetivas_absolutas']}
verdade = _de_absoluta(0.5, 1.0, 10.0, 80.0, 1.0)
ok(abs(verdade - 4.0 / 3.0) < 1e-9, 'fórmula: e·((d−c)/(d/2−c) − 1)^(1/b)')
ok(abs(ab2[50.0]['dose'] - verdade) / verdade < 0.25, 'c=10: CE50 absoluta ≈ %.3f (%.3f)' % (verdade, ab2[50.0]['dose']))
ok(abs(r2['parametros']['de50_e'] - 1.0) < 0.3, 'enquanto a DE50 relativa continua ≈ e')
ok(ab2[90.0]['dose'] is None and 'não chega' in ab2[90.0]['motivo'],
   'CE90 absoluta não existe quando a curva para em 10/80 = 12,5% da testemunha: diz o motivo')

# 3. resposta que SOBE com a dose: absoluta não se aplica
sobe = _llog4(conc, 1.0, 90.0, 5.0, 1.0) + g.normal(0, 1.0, conc.size)
r3 = analisar_dose_continua(conc, sobe)
ok(all(q['dose'] is None for q in r3['doses_efetivas_absolutas']), 'resposta crescente: sem CE absoluta')

# 4. pelo roteador, com modelo "curva"
rel = analisar({'dose': [float(v) for v in conc], 'cres': [float(v) for v in np.clip(cres, 0, None)]},
               {'resposta': 'cres', 'dose': 'dose'}, {'modelo': 'curva', 'unidade_dose': 'mg/L', 'maior_melhor': False})
ok(rel['ok'] and rel['analise'].get('doses_efetivas_absolutas'), 'roteador devolve a CE absoluta')

print('Crescimento micelial: CE50 absoluta (Edgington et al., 1971) com IC pelo método delta OK.' if not falhas
      else 'FALHAS: %d' % len(falhas))
assert not falhas, falhas
