import numpy as np
from scipy import stats
from bioengine.poder import (planejar, poder_contraste, poder_f,
                             diferenca_detectavel, _gl_erro, _critico)

# ---------------------------------------------------------------- identidades
# Duas coincidências exatas servem de oráculo, porque valem por álgebra e não
# por reimplementação: com DOIS tratamentos, (a) a amplitude studentizada
# dividida por raiz(2) é o próprio t bilateral, e (b) o teste F com um grau de
# liberdade no numerador É o teste t bilateral.
gl = _gl_erro(2, 6, 'dbc')
assert gl == 5
assert abs(_critico(2, gl, .05, 'tukey', 'todos') - stats.t.ppf(.975, gl)) < 1e-8
assert abs(_critico(2, gl, .05, 'nenhum', 'todos') - stats.t.ppf(.975, gl)) < 1e-12

pt = poder_contraste(12., 15., 6, 2, 'dbc', .05, 'nenhum', 'todos')
pf = poder_f(12., 15., 6, 2, 'dbc', .05)
assert abs(pt - pf) < 1e-7, (pt, pf)

# ------------------------------------------------------------------ simulação
# Oráculo independente da fórmula não-central: constrói o t pela definição --
# diferença normal sobre desvio de um qui-quadrado -- e conta rejeições.
dp, delta, r, k = 10., 8., 5, 4
gl = _gl_erro(k, r, 'dbc')
crit = _critico(k, gl, .05, 'nenhum', 'todos')
g = np.random.default_rng(20260910)
n = 200000
dif = g.normal(delta, dp * np.sqrt(2. / r), n)
s = dp * np.sqrt(g.chisquare(gl, n) / gl)
empirico = float(np.mean(np.abs(dif / (s * np.sqrt(2. / r))) > crit))
teorico = poder_contraste(dp, delta, r, k, 'dbc', .05, 'nenhum', 'todos')
assert abs(empirico - teorico) < .006, (empirico, teorico)

# ------------------------------------------------------------- monotonicidade
base = poder_contraste(10., 8., 5, 4)
assert poder_contraste(10., 8., 8, 4) > base          # mais repetição, mais poder
assert poder_contraste(10., 12., 5, 4) > base         # diferença maior, mais poder
assert poder_contraste(14., 8., 5, 4) < base          # mais variabilidade, menos poder
# Corrigir multiplicidade custa poder, e custa mais quanto maior a família.
solto = poder_contraste(10., 8., 5, 4, ajuste='nenhum')
assert solto > poder_contraste(10., 8., 5, 4, ajuste='tukey') > poder_contraste(10., 8., 5, 4, ajuste='bonferroni')
# Contra o controle a família é menor que todos entre si -> sobra poder.
assert (poder_contraste(10., 8., 5, 4, ajuste='bonferroni', familia='controle')
        > poder_contraste(10., 8., 5, 4, ajuste='bonferroni', familia='todos'))
# Dunnett usa a correlação 0,5 dos contrastes e fica entre o solto e Bonferroni.
c_solto = _critico(4, 12, .05, 'nenhum', 'controle')
c_dun = _critico(4, 12, .05, 'dunnett', 'controle')
c_bon = _critico(4, 12, .05, 'bonferroni', 'controle')
assert c_solto < c_dun < c_bon, (c_solto, c_dun, c_bon)
assert abs(_critico(2, 12, .05, 'dunnett', 'controle') - stats.t.ppf(.975, 12)) < 1e-8

# Bloco cobra grau de liberdade: com o mesmo r, o inteiramente casualizado tem
# mais GL residual. (Se a área for heterogênea o bloco devolve isso em QME --
# o que este motor NÃO adivinha, e por isso o dp entra declarado.)
assert _gl_erro(4, 5, 'dic') > _gl_erro(4, 5, 'dbc')
assert poder_contraste(10., 8., 5, 4, 'dic') > poder_contraste(10., 8., 5, 4, 'dbc')

# ------------------------------------------------------- ida e volta do delta
d = diferenca_detectavel(10., 6, 5, 'dbc', .05, .8, 'tukey', 'todos')
assert abs(poder_contraste(10., d, 6, 5, 'dbc', .05, 'tukey', 'todos') - .8) < 1e-6

# ------------------------------------------------------------------ o plano
p = planejar(k=4, delta=8., dp=10., poder_alvo=.8)
rm = p['repeticoes_minimas']
assert rm is not None
por_r = {c['repeticoes']: c for c in p['curva']}
assert por_r[rm]['poder'] >= .8
assert rm > 2 and por_r[rm - 1]['poder'] < .8, 'o mínimo tem de ser o PRIMEIRO que alcança'
assert p['comparacoes_na_familia'] == 6
assert all(por_r[a]['poder'] <= por_r[b]['poder'] for a, b in zip(sorted(por_r), sorted(por_r)[1:]))

# CV% precisa da média para virar desvio; e as duas rotas têm de coincidir.
pc = planejar(k=4, delta=8., cv=25., media=40., poder_alvo=.8)
assert abs(pc['entradas']['desvio_padrao'] - 10.) < 1e-9
assert pc['repeticoes_minimas'] == rm

# Estimativa pobre de variabilidade não pode passar calada.
assert any('graus de liberdade' in a for a in planejar(k=4, delta=8., dp=10., gl_dp=6)['avisos'])
# Diferença pequena demais para o desenho: avisa em vez de devolver um número.
imp = planejar(k=4, delta=.05, dp=10., r_max=8)
assert imp['repeticoes_minimas'] is None and imp['avisos']

# ------------------------------------------------------------------- recusas
def recusa(fn, trecho):
    try:
        fn()
    except ValueError as e:
        assert trecho in str(e).lower(), (trecho, str(e))
        return
    raise AssertionError('deveria ter recusado: ' + trecho)

recusa(lambda: planejar(k=1, delta=8., dp=10.), 'dois tratamentos')
recusa(lambda: planejar(k=4, delta=0., dp=10.), 'diferença agronomicamente relevante')
recusa(lambda: planejar(k=4, delta=8., cv=25.), 'média esperada')
recusa(lambda: planejar(k=4, delta=8., dp=-1.), 'positivo')
recusa(lambda: planejar(k=4, delta=8., dp=10., ajuste='tukey', familia='controle'), 'dunnett ou bonferroni')
recusa(lambda: planejar(k=4, delta=8., dp=10., ajuste='dunnett', familia='todos'), 'contra o controle')
recusa(lambda: planejar(k=4, delta=8., dp=10., alfa=1.5), 'significância')
recusa(lambda: poder_contraste(10., 8., 5, 4, desenho='quadrado'), 'delineamento')

print('Poder: identidades t/F e Tukey, simulação, monotonicidade, ida e volta, plano e recusas OK.')
