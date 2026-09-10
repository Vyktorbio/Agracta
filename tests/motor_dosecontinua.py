import numpy as np
from bioengine.dosecontinua import analisar_dose_continua, _llog4, _de

# ------------------------------------------------------- identidades da curva
# Estas valem por álgebra, não por ajuste: em x=0 a curva é d (é ali que a
# testemunha entra), em x=e é o meio do caminho, e a DEp devolve exatamente o
# nível p do percurso entre os dois patamares.
b, c, d, e = 2.0, 5.0, 80.0, 1.5
assert abs(float(_llog4(np.array([0.0]), b, c, d, e)[0]) - d) < 1e-12
assert abs(float(_llog4(np.array([e]), b, c, d, e)[0]) - (c + d) / 2) < 1e-12
for p in (.1, .5, .9, .99):
    x = _de(p, b, e)
    assert abs(float(_llog4(np.array([x]), b, c, d, e)[0]) - (d - p * (d - c))) < 1e-9, p
assert abs(_de(.5, b, e) - e) < 1e-12

# ----------------------------------------------- recuperar parâmetros conhecidos
# Severidade caindo de 80 (testemunha) para 5, com DE50 em 1,5.
g = np.random.default_rng(20260910)
doses = np.array([0., .25, .5, 1., 2., 4., 8.])
x = np.repeat(doses, 4)
y = _llog4(x, b, c, d, e) + g.normal(0, 1.5, x.size)
r = analisar_dose_continua(x, y, niveis=(10, 50, 90), unidade='L/ha')
par = r['parametros']
assert abs(par['de50_e'] - e) < .2, par['de50_e']
assert abs(par['inclinacao_b'] - b) < .4, par['inclinacao_b']
assert abs(par['patamar_dose_zero_d'] - d) < 3, par['patamar_dose_zero_d']
assert abs(par['patamar_dose_alta_c'] - c) < 3, par['patamar_dose_alta_c']
assert r['r2'] > .95 and r['gl_residual'] == len(y) - 4
assert r['faixa_testada']['tem_testemunha'] and r['faixa_testada']['n_doses'] == 6

de = {q['nivel']: q for q in r['doses_efetivas']}
assert de[50.]['ic_inf'] < e < de[50.]['ic_sup'], de[50.]
assert de[10.]['dose'] < de[50.]['dose'] < de[90.]['dose']
# O IC vem do log da dose, então é assimétrico na escala da dose.
assert (de[50.]['ic_sup'] - de[50.]['dose']) > (de[50.]['dose'] - de[50.]['ic_inf'])
assert not de[50.]['extrapolado'] and not r['avisos']

# --------------------------------------------------------- sentido invertido
# Controle % subindo de 2 (testemunha) para 95: mesma DE50, mesma máquina.
y2 = _llog4(x, 2.0, 95.0, 2.0, 1.5) + g.normal(0, 1.5, x.size)
r2 = analisar_dose_continua(x, y2, niveis=(50, 90), maior_melhor=True)
assert abs(r2['parametros']['de50_e'] - 1.5) < .2, r2['parametros']['de50_e']
assert r2['parametros']['patamar_dose_zero_d'] < r2['parametros']['patamar_dose_alta_c']
assert r2['maior_melhor'] is True

# ------------------------------------------------------- recusa de extrapolar
# Só doses baixas: a DE90 cai fora do testado e não pode sair limpa.
baixas = np.repeat(np.array([0., .05, .1, .2, .4]), 4)
yb = _llog4(baixas, b, c, d, e) + g.normal(0, 1.0, baixas.size)
rb = analisar_dose_continua(baixas, yb, niveis=(50, 90))
assert any(q['extrapolado'] for q in rb['doses_efetivas'])
assert any('extrapola' in a.lower() or 'fora do intervalo' in a.lower() for a in rb['avisos']), rb['avisos']

# --------------------------------------------------------- falta de ajuste
# Resposta em V, que log-logística nenhuma descreve: com repetição dá para
# separar erro puro de erro do modelo, e o motor tem de acusar.
xv = np.repeat(np.array([.25, .5, 1., 2., 4., 8.]), 4)
yv = np.abs(np.log(xv) ) * 20 + g.normal(0, .5, xv.size)
rv = analisar_dose_continua(xv, yv, niveis=(50,))
assert rv['falta_de_ajuste'] is not None
assert not rv['falta_de_ajuste']['ajuste_suficiente'], rv['falta_de_ajuste']
assert any('falta de ajuste' in a.lower() for a in rv['avisos'])

# ------------------------------------------------------------------ recusas
def recusa(fn, trecho):
    try:
        fn()
    except ValueError as err:
        assert trecho in str(err).lower(), (trecho, str(err))
        return
    raise AssertionError('deveria ter recusado: ' + trecho)

poucas = np.repeat(np.array([0., 1., 2.]), 4)
recusa(lambda: analisar_dose_continua(poucas, _llog4(poucas, b, c, d, e)), 'quatro doses positivas')
recusa(lambda: analisar_dose_continua(np.array([-1., 1., 2., 4., 8.]), np.array([1., 2., 3., 4., 5.])), 'negativa')
recusa(lambda: analisar_dose_continua(x, np.full(x.size, 7.0)), 'não varia')
recusa(lambda: analisar_dose_continua(np.array([1., 2., 4., 8.]), np.array([9., 7., 5., 3.])), 'insuficientes')
recusa(lambda: analisar_dose_continua(x[:8], y[:8]), 'quatro doses positivas')

print('Dose contínua: identidades da curva, parâmetros recuperados, sentidos, extrapolação, falta de ajuste e recusas OK.')
