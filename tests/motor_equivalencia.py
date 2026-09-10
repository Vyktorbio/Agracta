import numpy as np
from scipy import stats
from bioengine.anova import anova
from bioengine.posthoc import comparar_modelo
from bioengine.equivalencia import avaliar, testar

# --------------------------------------------------- oráculo algébrico exato
# Na fronteira o TOST tem p igual a alfa, por construção: se a margem é
# exatamente o limite superior do intervalo, (dif-margem)/ep = -t(1-alfa).
# (a diferença precisa ser menor que t*ep, senão a margem da fronteira inferior
#  sairia negativa -- margem negativa não existe, e o motor recusa.)
dif, se, gl, alfa = 1.0, 2.0, 15, .05
t1 = float(stats.t.ppf(1 - alfa, gl))
r = avaliar(dif, se, gl, dif + t1 * se, alfa)
assert abs(r['p_superior'] - alfa) < 1e-12, r['p_superior']
r = avaliar(dif, se, gl, t1 * se - dif, alfa)
assert abs(r['p_inferior'] - alfa) < 1e-12, r['p_inferior']

# O intervalo é o de 1-2alfa (90% quando alfa=5%), não o de 95%.
r = avaliar(dif, se, gl, 12.0, alfa)
assert abs(r['ic_sup'] - (dif + t1 * se)) < 1e-12
assert abs((r['ic_sup'] - r['ic_inf']) / (2 * se) - t1) < 1e-12

# Espelho: trocar o sinal da diferença troca os dois p unilaterais de lado.
a, b = avaliar(3., 2., 20, 7.), avaliar(-3., 2., 20, 7.)
assert abs(a['p_inferior'] - b['p_superior']) < 1e-12
assert abs(a['p_superior'] - b['p_inferior']) < 1e-12
assert a['conclusao'] == b['conclusao']

# ------------------------------------------------------------ as três saídas
equiv = avaliar(0.5, 1.0, 30, 5.0)
incon = avaliar(5.0, 8.0, 12, 6.0)
grande = avaliar(20.0, 2.0, 30, 5.0)
assert equiv['conclusao'] == 'equivalente'
assert incon['conclusao'] == 'inconclusivo'
assert grande['conclusao'] == 'diferenca_relevante'
assert equiv['p'] < .05 and incon['p'] > .05

# O PONTO do módulo: "não deu diferença" não é equivalência. O mesmo contraste
# inconclusivo acima passa folgado no teste comum de diferença.
p_comum = float(2 * stats.t.sf(abs(5.0 / 8.0), 12))
assert p_comum > .5, p_comum
assert incon['conclusao'] != 'equivalente'

# Margem maior é mais fácil de satisfazer; erro-padrão maior é mais difícil.
assert avaliar(2., 1., 30, 9.)['p'] < avaliar(2., 1., 30, 5.)['p']
assert avaliar(2., 1., 30, 5.)['p'] < avaliar(2., 3., 30, 5.)['p']

# ------------------------------------------------------- não-inferioridade
# Severidade: quanto MENOS melhor. Ficar 2 abaixo da referência é bom.
menos = avaliar(-2., 1., 30, 5., sentido='nao_inferioridade', maior_melhor=False)
assert menos['conclusao'] == 'nao_inferior'
# A mesma estimativa numa variável em que MAIS é melhor não é a mesma notícia.
mais = avaliar(-2., 1., 30, 5., sentido='nao_inferioridade', maior_melhor=True)
assert mais['conclusao'] in ('nao_inferior', 'inconclusivo')
assert mais['p'] != menos['p']
# Cair muito além da margem é inferioridade declarada, não "inconclusivo".
assert avaliar(-20., 1., 30, 5., sentido='nao_inferioridade', maior_melhor=True)['conclusao'] == 'inferior'
# Unilateral exige menos que bilateral: o p da não-inferioridade nunca é maior.
d, s, g, m = 1.5, 1.2, 25, 4.
assert (avaliar(d, s, g, m, sentido='nao_inferioridade', maior_melhor=True)['p']
        <= avaliar(d, s, g, m)['p'] + 1e-12)

# ------------------------------------------- em cima de uma ANOVA de verdade
# DBC com resíduos de soma zero por linha e coluna: QME=8/3, GL=6.
erros = np.array([[-1, 1, -1, 1], [1, -1, 2, -2], [0, 0, -1, 1]])
y = (np.array([100, 101, 130])[:, None] + np.array([0, 5, -3, 2]) + erros).ravel()
tr = np.repeat(['REF', 'GEN', 'OUTRO'], 4)
bl = np.tile(['B1', 'B2', 'B3', 'B4'], 3)
a = anova(y, [tr], bloco=bl, transformar_auto=False)
cmp = comparar_modelo(a, alfa=.05)
eq = testar(cmp, referencia='REF', margem=5.)
assert eq['referencia'] == 'REF' and abs(eq['margem'] - 5.) < 1e-12
assert len(eq['comparacoes']) == 2, 'só os contrastes que envolvem a referência'
por_trat = {c['tratamento']: c for c in eq['comparacoes']}
# O genérico está 1 acima da referência, com erro pequeno: cabe na margem de 5.
assert abs(por_trat['GEN']['diferenca'] - 1.) < 1e-9, por_trat['GEN']['diferenca']
assert por_trat['GEN']['conclusao'] == 'equivalente'
# O outro está 30 acima: diferença relevante, não equivalência.
assert por_trat['OUTRO']['conclusao'] == 'diferenca_relevante'
# Todo contraste é normalizado para tratamento − referência.
assert all(c['g1'] == 'REF' for c in eq['comparacoes'])

# Margem em % da referência precisa da média, e chega no mesmo lugar.
pct = testar(cmp, referencia='REF', margem_pct=5.)
assert abs(pct['margem'] - .05 * cmp['medias']['REF']) < 1e-9
assert pct['margem_percent'] == 5.

# Multiplicidade não passa calada, e o ajuste só pode endurecer a conclusão.
assert any('multiplicidade' in x for x in eq['avisos'])
aj = testar(cmp, referencia='REF', margem=5., ajuste='holm')
assert aj['comparacoes'][0]['p'] >= aj['comparacoes'][0]['p_bruto'] - 1e-12
assert not any('multiplicidade' in x for x in aj['avisos'])

# ------------------------------------------------------------------ recusas
def recusa(fn, trecho):
    try:
        fn()
    except ValueError as e:
        assert trecho in str(e).lower(), (trecho, str(e))
        return
    raise AssertionError('deveria ter recusado: ' + trecho)

recusa(lambda: avaliar(1., 1., 20, 0.), 'margem')
recusa(lambda: avaliar(1., 0., 20, 5.), 'erro-padrão')
recusa(lambda: avaliar(1., 1., 0, 5.), 'graus de liberdade')
recusa(lambda: avaliar(1., 1., 20, 5., sentido='outro'), 'sentido')
recusa(lambda: testar(cmp, referencia='NAO_EXISTE', margem=5.), 'referência observada')
recusa(lambda: testar(cmp, referencia='REF'), 'declare a margem')
recusa(lambda: testar(cmp, referencia='REF', margem_pct=5., ajuste='nenhum') if False else
       testar({'ordem': ['REF', 'X'], 'comparacoes': [{'g1': 'REF', 'g2': 'X', 'p': .3}],
               'df_erro': 10, 'medias': {'REF': 10.}}, referencia='REF', margem=2.), 'erro-padrão')

print('Equivalência: fronteira exata, IC de 1-2alfa, três saídas, não-inferioridade, ANOVA real e recusas OK.')
