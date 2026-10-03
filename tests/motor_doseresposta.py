# Dose-resposta de artrópodes pelo livro (Robertson et al., 2007; Finney, 1971).
# Roda no Pyodide do aparelho (test_motor_python.js).
import numpy as np
from scipy import stats
import statsmodels.api as sm
from bioengine import doseresponse as dr
from bioengine.decide import analisar

falhas = []
def ok(c, nome):
    if not c:
        falhas.append(nome)
        print('  FALHA ' + nome)

def cl(r, p):
    return next(d for d in r['doses_letais'] if abs(d['p'] - p) < 1e-9)

# ------------------------------------------------------------------ 1. sem testemunha = GLM
dose = np.array([1., 2., 4., 8., 16.])
n = np.array([40., 40., 40., 40., 40.])
y = np.array([3., 9., 19., 30., 37.])
r = dr.analisar_dose_resposta(dose, y, n, link='probit')
X = sm.add_constant(np.log10(dose))
g = sm.GLM(np.column_stack([y, n - y]), X,
           family=sm.families.Binomial(link=sm.families.links.Probit())).fit()
ok(abs(r['intercepto'] - g.params[0]) < 1e-6 and abs(r['slope'] - g.params[1]) < 1e-6,
   'sem testemunha: é o GLM probit de sempre')
ok(r['resposta_natural']['metodo'] == 'ausente', 'sem testemunha: resposta natural ausente')
ok(all('g' in d for d in r['doses_letais']), 'cada dose letal traz o g de Fieller')
ok(len(r['tabela_doses']) == 5 and abs(sum(t['n'] for t in r['tabela_doses']) - 200) < 1e-9,
   'tabela por dose soma os insetos testados')

# ML com C fixo em zero reproduz o GLM (coeficientes e covariância)
for lk in ('probit', 'logit'):
    gl_ = dr._ajustar_glm(np.log10(dose), y, n, lk)
    ml = dr._ajustar_ml(np.log10(dose), y, n, lk, c_fixo=0.0,
                        chute=(float(gl_.params[0]), float(gl_.params[1])))
    ok(abs(ml['b0'] - gl_.params[0]) < 1e-4 and abs(ml['b1'] - gl_.params[1]) < 1e-4,
       'máxima verossimilhança com C=0 bate com o GLM (' + lk + ')')
    rel = np.abs(np.diag(ml['cov']) - np.diag(gl_.cov_params())) / np.diag(gl_.cov_params())
    ok(np.all(rel < 0.05), 'covariância pela hessiana observada ≈ a do GLM (' + lk + ')')

# ------------------------------------------------------------------ 2. resposta natural estimada
# verdade: C = 10%, probit, b0 = -2, b1 = 2 em log10 -> CL50 = 10
C, b0, b1 = 0.10, -2.0, 2.0
doses = np.array([0., 1.5, 3., 6., 12., 24., 48.])
nn = np.array([400., 200., 200., 200., 200., 200., 200.])
P = np.where(doses > 0, C + (1 - C) * stats.norm.cdf(b0 + b1 * np.log10(np.where(doses > 0, doses, 1))), C)
yy = np.round(nn * P)
r = dr.analisar_dose_resposta(doses, yy, nn, link='probit')
rn = r['resposta_natural']
ok(rn['metodo'] == 'estimada', 'testemunha com mortes: C estimado como parâmetro')
ok(abs(rn['C'] - C) < 0.015, 'C estimado perto do verdadeiro (%.4f)' % rn['C'])
ok(rn['C_ep'] is not None and 0 < rn['C_ep'] < 0.05, 'C sai com erro-padrão')
ok(abs(cl(r, 0.5)['dose'] - 10) < 0.6, 'CL50 recuperada (%.3f ≈ 10)' % cl(r, 0.5)['dose'])
ok(abs(r['slope'] - b1) < 0.15, 'inclinação recuperada (%.3f ≈ 2)' % r['slope'])
ok(not r['abbott_aplicado'], 'não é mais Abbott arredondado')
ok(any(t['testemunha'] for t in r['tabela_doses']), 'a testemunha aparece na tabela por dose')
# o ótimo é mesmo ótimo: perturbar os parâmetros piora a verossimilhança
F = stats.norm.cdf
def ll(Cx, a, b):
    Pt = np.clip(Cx + (1 - Cx) * F(a + b * np.log10(doses[1:])), 1e-12, 1 - 1e-12)
    v = np.sum(yy[1:] * np.log(Pt) + (nn[1:] - yy[1:]) * np.log(1 - Pt))
    return v + yy[0] * np.log(Cx) + (nn[0] - yy[0]) * np.log(1 - Cx)
base = ll(rn['C'], r['intercepto'], r['slope'])
ok(all(ll(rn['C'] + dc, r['intercepto'] + da, r['slope'] + db) <= base + 1e-6
       for dc in (-0.01, 0.01) for da in (-0.05, 0.05) for db in (-0.05, 0.05)),
   'estimativa é o máximo da verossimilhança (vizinhança)')

# o método antigo continua disponível e dá número parecido
ra = dr.analisar_dose_resposta(doses, yy, nn, link='probit', natural='abbott')
ok(ra['abbott_aplicado'] and ra['resposta_natural']['metodo'] == 'abbott', 'natural="abbott" mantém o método antigo')
ok(abs(cl(ra, 0.5)['dose'] - cl(r, 0.5)['dose']) / cl(r, 0.5)['dose'] < 0.1, 'Abbott e ML concordam em dado limpo')
# a incerteza de C alarga o intervalo em relação a C "sabido"
rk = dr.analisar_dose_resposta(doses, yy, nn, link='probit', controle_mort=float(rn['C']))
ok(rk['resposta_natural']['metodo'] == 'declarada', 'C declarado é usado como conhecido')
larg_est = np.log10(cl(r, 0.9)['ic_sup']) - np.log10(cl(r, 0.9)['ic_inf'])
larg_dec = np.log10(cl(rk, 0.9)['ic_sup']) - np.log10(cl(rk, 0.9)['ic_inf'])
ok(larg_est >= larg_dec - 1e-9, 'estimar C deixa o IC da CL90 pelo menos tão largo quanto C conhecido')

# testemunha sem nenhuma morte: C não existe, volta ao modelo de 2 parâmetros
y0 = yy.copy(); y0[0] = 0
r0 = dr.analisar_dose_resposta(doses, y0, nn, link='probit')
ok(r0['resposta_natural']['metodo'] == 'ausente' and r0['controle_mortalidade'] == 0,
   'testemunha sem mortes: sem resposta natural')

# ------------------------------------------------------------------ 3. heterogeneidade (Finney)
# repetições com variação extra-binomial forte na mesma dose -> significativa
dh = np.repeat([1., 2., 4., 8., 16.], 4)
nh = np.full(20, 25.)
ph = np.array([.02, .15, .01, .20,  .10, .45, .05, .40,  .30, .80, .25, .75,  .60, .98, .55, .95,  .85, 1., .80, 1.])
yh = np.round(nh * ph)
rh = dr.analisar_dose_resposta(dh, yh, nh, link='probit')
ok(rh['heterogeneo'] and rh['p_qui_quadrado'] < 0.05, 'variação entre repetições: heterogeneidade significativa')
ok('t de Student' in rh['criterio_ic'], 'com heterogeneidade, IC por t e h')
ok(any('Heterogeneidade significativa' in a for a in rh['avisos']), 'aviso de heterogeneidade no relatório')
# h > 1 mas não significativo: não corrige (regra de Finney)
rng = np.random.default_rng(7)
pt = stats.norm.cdf(-1.2 + 2.0 * np.log10(dh))
achou = False
for _ in range(200):
    ys = rng.binomial(25, pt).astype(float)
    rr = dr.analisar_dose_resposta(dh, ys, nh, link='probit')
    if rr['heterogeneidade_h'] and rr['heterogeneidade_h'] > 1 and rr['p_qui_quadrado'] > 0.05:
        achou = True
        ok(not rr['heterogeneo'] and rr['criterio_ic'] == 'normal (z)',
           'h > 1 sem significância: IC normal, sem inflar (Finney, 1971)')
        break
ok(achou, 'encontrou caso h>1 não significativo para testar a regra')

# ------------------------------------------------------------------ 4. g e desenho
dg = np.array([1., 2., 4., 8.])
ng = np.array([10., 10., 10., 10.])
yg = np.array([4., 5., 5., 6.])            # quase plano: inclinação imprecisa
rg = dr.analisar_dose_resposta(dg, yg, ng, link='logit')
ok(cl(rg, 0.5)['g'] >= 0.5 or cl(rg, 0.5)['ic_inf'] is None, 'curva plana: g grande')
ok(any('g =' in a for a in rg['avisos']) or cl(rg, 0.5)['ic_inf'] is None, 'e o relatório diz por que o IC não serve')
dp = np.array([1., 2., 4., 8., 16.])
yp = np.array([0., 0., 0., 20., 20.])
rp = dr.analisar_dose_resposta(dp, np.where(yp > 0, yp - 1, yp), np.full(5, 20.), link='probit')
ok(rp['respostas_parciais'] <= 2, 'conta doses com resposta parcial')
yp2 = np.array([0., 0., 1., 20., 20.])
rp2 = dr.analisar_dose_resposta(dp, yp2, np.full(5, 20.), link='probit')
ok(any('resposta parcial' in a for a in rp2['avisos']), 'uma só dose parcial: aviso de desenho (Robertson et al., 2007)')

# ------------------------------------------------------------------ 5. razão de CL50 e CL90
def pop(lc50, slope, C=0.0):
    ds = np.array([0., 2., 4., 8., 16., 32., 64.])
    nx = np.array([300., 150., 150., 150., 150., 150., 150.])
    Px = np.where(ds > 0, C + (1 - C) * stats.norm.cdf(slope * (np.log10(np.where(ds > 0, ds, 1)) - np.log10(lc50))), C)
    return ds, np.round(nx * Px), nx
dA = pop(8., 2.5); dB = pop(24., 2.5)
cA = dr.analisar_dose_resposta(*dA, link='probit'); cA['grupo'] = 'S'
cB = dr.analisar_dose_resposta(*dB, link='probit'); cB['grupo'] = 'R'
cmp_ = dr.comparar_curvas([cA, cB],
                          [('S', np.log10(dA[0][1:]), dA[1][1:], dA[2][1:]),
                           ('R', np.log10(dB[0][1:]), dB[1][1:], dB[2][1:])], 'probit')
rz = {z['grupo']: z for z in cmp_['razoes']}
ok(cmp_['referencia'] == 'S', 'referência é a população mais suscetível')
ok(abs(rz['R']['rr'] - 3.0) < 0.35 and rz['R']['significativo'], 'RR50 ≈ 3 e significativa (IC exclui 1)')
ok('rr90' in rz['R'] and abs(rz['R']['rr90'] - 3.0) < 0.5 and rz['R']['significativo90'], 'RR90 também sai, com IC')
ok(cmp_['paralelismo']['paralelo'], 'mesma inclinação: paralelas')
cA2 = dict(cA); cA2['grupo'] = 'S2'
cmp2 = dr.comparar_curvas([cA, cA2],
                          [('S', np.log10(dA[0][1:]), dA[1][1:], dA[2][1:]),
                           ('S2', np.log10(dA[0][1:]), dA[1][1:], dA[2][1:])], 'probit')
ok(all(not z['significativo'] for z in cmp2['razoes']), 'mesma população: razão não significativa')

# ------------------------------------------------------------------ 6. pelo roteador
dados = {'dose': [float(v) for v in doses for _ in range(1)],
         'mortos': [float(v) for v in yy], 'n': [float(v) for v in nn]}
rel = analisar(dados, {'resposta': 'mortos', 'dose': 'dose', 'n_total': 'n'}, {})
a = rel['analise']
ok(rel['ok'] and a.get('resposta_natural', {}).get('metodo') == 'estimada', 'roteador: dose-resposta com C estimado')
ok('Robertson' in rel['decisao'], 'decisão cita Robertson et al. (2007)')

print('Dose-resposta (Robertson et al., 2007): resposta natural por máxima verossimilhança, g, '
      'heterogeneidade de Finney, tabela por dose e razão de CL50/CL90 OK.' if not falhas
      else 'FALHAS: %d' % len(falhas))
assert not falhas, falhas
