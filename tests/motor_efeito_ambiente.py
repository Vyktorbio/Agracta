"""Tamanho de efeito e interação tratamento × ambiente — contra contas independentes.

Pedido de uso: "o Agracta poderia estimar interação tratamento × ambiente e
tamanho de efeito, não somente p-valor?"

Oráculos (nenhum usa o código do motor):
  - ômega² parcial e CV% pelas fórmulas fechadas da tabela da ANOVA;
  - IC de Fieller resolvendo a quadrática com numpy.roots;
  - ensaio em rede BALANCEADO (locais × blocos × tratamentos): REML coincide com
    os estimadores da ANOVA por quadrados médios esperados, o erro-padrão de uma
    diferença é √(2·QM(T×L)/(r·l)), os graus de liberdade são (t−1)(l−1), e a
    razão de verossimilhança REML do componente T×L tem forma fechada:
      LRT = ν₁·ln(s²/QM_TL) + ν₂·ln(s²/QM_E),  s² = (ν₁QM_TL + ν₂QM_E)/(ν₁+ν₂);
  - intervalo de predição = diferença ± t·√(EP² + 2σ²_TL), com o t do IC simultâneo;
  - derivada da verossimilhança REML ao abrir o componente T×L no ajuste sem
    ele (o que decide "interação na fronteira"): no balanceado vale
      (r·ν₁ / 2s²)·(QM_TL/s² − 1),
    negativa exatamente quando o estimador da ANOVA de σ²_TL é negativo.
"""
import numpy as np
import pandas as pd
import statsmodels.formula.api as smf
import statsmodels.api as sm
from scipy import stats
from bioengine import analisar
from bioengine import efeito
from bioengine import mistos

# ---------------------------------------------------------------- 1. ANOVA
y = np.array([10, 12, 11, 13, 14, 15, 16, 15, 20, 21, 19, 22.])
tr = np.repeat(['A', 'B', 'C'], 4)
r = analisar({'y': y.tolist(), 'trat': tr.tolist()}, {'resposta': 'y', 'fatores': ['trat'], 'tipo_resposta': 'continua'},
             {'transformar_auto': False})
a = r['analise']
sq_t = sum(4 * (y[tr == g].mean() - y.mean()) ** 2 for g in 'ABC')
sq_e = sum(((y[tr == g] - y[tr == g].mean()) ** 2).sum() for g in 'ABC')
mse = sq_e / 9
omega = (sq_t - 2 * mse) / (sq_t + sq_e + mse)          # ω² de uma via (= parcial)
linha = [l for l in a['tabela_anova'] if l['fonte'] == 'F1'][0]
assert abs(linha['omega2_parcial'] - omega) < 1e-12, (linha, omega)
assert abs(linha['eta2_parcial'] - sq_t / (sq_t + sq_e)) < 1e-12
assert abs(a['cv_percent'] - 100 * np.sqrt(mse) / y.mean()) < 1e-10
assert [l for l in a['tabela_anova'] if l['fonte'] == 'Residual'][0]['omega2_parcial'] is None
assert efeito.omega2_parcial(0.5, 2, 12) == 0.0, 'F < 1: truncado em zero, nunca negativo'

# ------------------------------------------------- 2. Fieller independente
def fieller_raizes(a_, b_, va, vb, cab, t):
    coef = [b_ * b_ - t * t * vb, -2 * (a_ * b_ - t * t * cab), a_ * a_ - t * t * va]
    return sorted(np.roots(coef).real)
for caso in [(15.5, 30.5, .44, .44, .11, 2.6), (8.0, 2.0, 1.0, .3, .05, 2.2), (3.0, 10.0, 4.0, 1.0, -.5, 3.1)]:
    rr, lo, hi = efeito.fieller(*caso)
    ref = fieller_raizes(*caso)
    assert abs(rr - caso[0] / caso[1]) < 1e-12 and abs(lo - ref[0]) < 1e-9 and abs(hi - ref[1]) < 1e-9, (caso, lo, hi, ref)
rr, lo, hi = efeito.fieller(5.0, 0.4, 1.0, 0.25, 0.0, 2.0)   # testemunha indistinguível de zero
assert lo is None and hi is None
sem = efeito.relativo(5.0, 0.4, 1.0, 0.25, 0.0, 2.0)
assert sem['relativo_ic_inf'] is None and 'não se distingue de zero' in sem['relativo_motivo']

# --------------------------------------------- 3. Dunnett: % da testemunha
yb = [30, 32, 29, 31, 15, 16, 14, 17, 22, 21, 23, 20]
trb = ['C'] * 4 + ['T1'] * 4 + ['T2'] * 4
blb = ['B1', 'B2', 'B3', 'B4'] * 3
rb = analisar({'y': yb, 'trat': trb, 'bloco': blb}, {'resposta': 'y', 'fatores': ['trat'], 'bloco': 'bloco', 'tipo_resposta': 'continua'},
              {'comparacao': 'controle', 'controle': 'C', 'transformar_auto': False})
cmp = rb['comparacao_medias']['controle']
for c in cmp['comparacoes']:
    mt, mc = cmp['medias'][c['g2']], cmp['medias']['C']
    assert abs(c['relativo_pct'] - 100 * (mt / mc - 1)) < 1e-9
    # o IC da razão usa o mesmo crítico simultâneo do IC da diferença
    crit = (c['ic_sup'] - c['diferenca']) / c['ep_diferenca']
    vm = rb['analise']['mse'] / 4                          # variância de uma média de 4 parcelas (DBC balanceado)
    ref = fieller_raizes(mt, mc, vm, vm, 0.0, crit)
    assert abs(c['relativo_ic_inf'] - 100 * (ref[0] - 1)) < 1e-6 and abs(c['relativo_ic_sup'] - 100 * (ref[1] - 1)) < 1e-6, (c, ref)

# ---------------------------------------- 4. Ensaio em rede balanceado
def rede(semente, dp_interacao, l=6, rblocos=4):
    rng = np.random.default_rng(semente)
    locs = ['L%d' % (i + 1) for i in range(l)]; trats = ['C', 'T1', 'T2']; blocos = ['B%d' % (i + 1) for i in range(rblocos)]
    efl = {lc: rng.normal(0, 4) for lc in locs}
    inter = {(t, lc): rng.normal(0, dp_interacao) for t in trats for lc in locs}
    linhas = []
    for lc in locs:
        efb = {b: rng.normal(0, 1) for b in blocos}
        for b in blocos:
            for t in trats:
                mu = 30 + {'C': 0, 'T1': -8, 'T2': -4}[t] + efl[lc] + inter[(t, lc)] + efb[b]
                linhas.append({'y': mu + rng.normal(0, 1.5), 'trat': t, 'local': lc, 'bloco': b})
    return pd.DataFrame(linhas)

def oraculo(df):
    """Quadrados médios da ANOVA de efeitos fixos e os estimadores por QM esperado."""
    # Colunas de texto já são categorias para o patsy. Sem C(...) de propósito:
    # no Pyodide os testes dividem o mesmo espaço de nomes, e um "C" de outro
    # arquivo (a resposta natural da dose-resposta) tomaria o lugar do C do patsy.
    f = smf.ols('y ~ local + local:bloco + trat + trat:local', df).fit()
    t_ = sm.stats.anova_lm(f, typ=1)
    def qm(nome): return float(t_.loc[nome, 'sum_sq'] / t_.loc[nome, 'df']), float(t_.loc[nome, 'df'])
    qm_e, gl_e = qm('Residual'); qm_tl, gl_tl = qm('trat:local'); qm_bl, _ = qm('local:bloco')
    qm_l, _ = qm('local')
    l = df['local'].nunique(); rb_ = df['bloco'].nunique(); t = df['trat'].nunique()
    return {'qm_e': qm_e, 'gl_e': gl_e, 'qm_tl': qm_tl, 'gl_tl': gl_tl, 'qm_bl': qm_bl, 'qm_l': qm_l, 't': t,
            's2_e': qm_e, 's2_tl': (qm_tl - qm_e) / rb_, 's2_b': (qm_bl - qm_e) / t,
            'ep_dif': np.sqrt(2 * qm_tl / (rb_ * l)), 'l': l, 'r': rb_}

pap = {'resposta': 'y', 'fatores': ['trat'], 'bloco': 'bloco', 'local': 'local', 'tipo_resposta': 'continua'}
df = rede(11, 2.0)
o = oraculo(df)
assert o['s2_tl'] > 0 and o['s2_b'] > 0, o
rm = analisar(df.to_dict('list'), pap, {'modelo': 'misto', 'comparacao': 'controle', 'controle': 'C', 'maior_melhor': False})
assert rm['ok'], rm
am = rm['analise']; vc = am['componentes_variancia']; it = am['interacao_local']
assert abs(vc['residual'] - o['s2_e']) / o['s2_e'] < 1e-3, (vc, o)
assert abs(vc['tratamento_local'] - o['s2_tl']) / o['s2_tl'] < 1e-3, (vc, o)
assert abs(vc['bloco'] - o['s2_b']) / o['s2_b'] < 2e-3, (vc, o)
s2 = (o['gl_tl'] * o['qm_tl'] + o['gl_e'] * o['qm_e']) / (o['gl_tl'] + o['gl_e'])
lrt = o['gl_tl'] * np.log(s2 / o['qm_tl']) + o['gl_e'] * np.log(s2 / o['qm_e'])
assert abs(it['lrt'] - lrt) < 1e-3 * max(1, lrt), (it['lrt'], lrt)
assert abs(it['p'] - .5 * stats.chi2.sf(lrt, 1)) < 1e-4
assert abs(it['desvio_padrao'] - np.sqrt(o['s2_tl'])) < 1e-3 * np.sqrt(o['s2_tl']) * 10
for c in rm['comparacao_medias']['misto']['comparacoes']:
    assert abs(c['ep_diferenca'] - o['ep_dif']) / o['ep_dif'] < 2e-3, (c, o)
    assert abs(c['gl'] - o['gl_tl']) < .05, ('GL de Satterthwaite = (t−1)(l−1) no balanceado', c['gl'], o['gl_tl'])
    tcrit = stats.t.ppf(1 - .05 / (2 * 2), c['gl'])        # Bonferroni nos 2 pares contra C: o crítico do IC ao lado
    assert abs(c['ic_sup'] - c['diferenca'] - tcrit * c['ep_diferenca']) < 1e-9
    meia = tcrit * np.sqrt(c['ep_diferenca'] ** 2 + 2 * vc['tratamento_local'])
    assert abs(c['pred_inf'] - (c['diferenca'] - meia)) < 1e-9 and abs(c['pred_sup'] - (c['diferenca'] + meia)) < 1e-9
    assert c['pred_inf'] < c['ic_inf'] or c['pred_sup'] > c['ic_sup'], 'a faixa num local novo é mais larga que o IC da média'
    mt, mc = rm['comparacao_medias']['misto']['medias'][c['g2']], rm['comparacao_medias']['misto']['medias']['C']
    assert abs(c['relativo_pct'] - 100 * (mt / mc - 1)) < 1e-9 and c['relativo_ic_inf'] < c['relativo_pct'] < c['relativo_ic_sup']
# efeito em cada local = médias simples do local (balanceado)
por = {p['tratamento']: p for p in it['contra_controle_por_local']}
for lc in it['locais']:
    ref = df[(df.local == lc) & (df.trat == 'T1')].y.mean() - df[(df.local == lc) & (df.trat == 'C')].y.mean()
    assert abs(por['T1']['por_local'][lc] - ref) < 1e-9
assert it['n_locais'] == 6 and not it['reajustado_sem']

# ------------------------------- 5. Inversão de sinal e melhor por local
df2 = rede(5, 0.01)
inv = df2.copy()
# no L6, T2 passa a ser pior que a testemunha (variável em que menos é melhor)
inv.loc[(inv.local == 'L6') & (inv.trat == 'T2'), 'y'] += 9
r2 = analisar(inv.to_dict('list'), pap, {'modelo': 'misto', 'comparacao': 'controle', 'controle': 'C', 'maior_melhor': False})
assert r2['ok'], r2
i2 = r2['analise']['interacao_local']
p2 = {p['tratamento']: p for p in i2['contra_controle_por_local']}
assert p2['T2']['inversoes'] == ['L6'], p2['T2']
assert any('Em 1 de 6 locais (L6), a diferença de T2 contra C teve o sinal contrário' in a_ for a_ in r2['avisos'])

# ------------------ 6. Interação estimada em zero: reajuste, inferência liberada
df3 = rede(3, 0.0)
o3 = oraculo(df3)
semente = 3
while o3['qm_tl'] >= o3['qm_e']:      # garante QM(T×L) < QM(E): REML na fronteira
    semente += 1; df3 = rede(semente, 0.0); o3 = oraculo(df3)
r3 = analisar(df3.to_dict('list'), pap, {'modelo': 'misto', 'comparacao': 'controle', 'controle': 'C'})
assert r3['ok'] and r3['analise']['inferencias'], r3
i3 = r3['analise']['interacao_local']
assert i3['na_fronteira'] and i3['reajustado_sem'] and i3['variancia'] == 0 and i3['p'] == .5, i3
assert 'tratamento_local' not in r3['analise']['componentes_variancia']
assert sum('Interação tratamento × local' in a_ for a_ in r3['avisos']) == 1, r3['avisos']
assert any('estimada em zero' in a_ and 'reajustado sem ela' in a_ for a_ in r3['avisos'])
assert all(c['p'] is not None for c in r3['comparacao_medias']['misto']['comparacoes'])
assert all('pred_inf' not in c for c in r3['comparacao_medias']['misto']['comparacoes']), 'sem interação estimada, nada a projetar'

# ----------- 7. Derivada na fronteira: a conta que decide "interação = 0"
def derivada_oraculo(df, o):
    """Ajuste REML SEM o componente T×L em forma fechada (balanceado) e a
    derivada ao abri-lo, montada com matrizes de incidência independentes."""
    nu1, nu2, r, t = o['gl_tl'], o['gl_e'], o['r'], o['t']
    s2 = (nu1 * o['qm_tl'] + nu2 * o['qm_e']) / (nu1 + nu2)
    s2_b = (o['qm_bl'] - s2) / t; s2_l = (o['qm_l'] - o['qm_bl']) / (r * t)
    assert s2_b > 0 and s2_l > 0, 'oráculo pede componentes interiores'
    def inc(col): Z = pd.get_dummies(col).to_numpy(float); return Z @ Z.T
    A_l = inc(df['local']); A_b = inc(df['local'] + '|' + df['bloco']); A_tl = inc(df['local'] + '|' + df['trat'])
    X = np.column_stack([np.ones(len(df)), pd.get_dummies(df['trat'], drop_first=True).to_numpy(float)])
    der, _ = mistos._derivada_na_fronteira(X, df['y'].to_numpy(float), [np.eye(len(df)), A_l, A_b], [s2, s2_l, s2_b], A_tl)
    return der, (r * nu1 / (2 * s2)) * (o['qm_tl'] / s2 - 1)

der, fechada = derivada_oraculo(df, o)        # com interação: positiva
assert der > 0 and abs(der - fechada) < 1e-8 * abs(fechada), (der, fechada)
der3, fechada3 = derivada_oraculo(df3, o3)    # QM(T×L) < QM(E): negativa — fronteira
assert der3 < 0 and abs(der3 - fechada3) < 1e-8 * abs(fechada3), (der3, fechada3)

# ------- 8. Otimizador que para no meio, com interação de verdade: recomeça
# Força o primeiro ajuste completo a não convergir (1 iteração). A derivada no
# ajuste sem T×L é positiva, então o motor não pode chamar isso de "zero": tem
# de recomeçar do ajuste reduzido e chegar ao mesmo REML da seção 4.
_mixedlm = mistos.smf.mixedlm
recomecos = []
def _mixedlm_que_para(formula, data, **kw):
    # eval_env=-1: fórmula avaliada sem o espaço de nomes deste arquivo (o "C"
    # de outro teste no Pyodide não pode tomar o lugar do C do patsy).
    m = _mixedlm(formula, data, eval_env=-1, **kw)
    if 'tratamento_local' in (kw.get('vc_formula') or {}):
        _fit = m.fit
        def fit(*a_, **k_):
            if 'start_params' in k_: recomecos.append(1)
            else: k_['maxiter'] = 1
            return _fit(*a_, **k_)
        m.fit = fit
    return m
mistos.smf.mixedlm = _mixedlm_que_para
try:
    r4 = analisar(df.to_dict('list'), pap, {'modelo': 'misto', 'comparacao': 'controle', 'controle': 'C', 'maior_melhor': False})
finally:
    mistos.smf.mixedlm = _mixedlm
assert r4['ok'] and recomecos == [1], (r4, recomecos)
i4 = r4['analise']['interacao_local']
assert not i4['na_fronteira'] and not i4['reajustado_sem'] and abs(i4['lrt'] - lrt) < 1e-3 * max(1, lrt), i4
assert abs(r4['analise']['componentes_variancia']['tratamento_local'] - o['s2_tl']) / o['s2_tl'] < 1e-3

# ------ 9. "Todos entre si" com testemunha: o % e as letras contam a mesma história
# É o modo dos cartões automáticos do Agracta. O IC do % usa o valor crítico
# de Tukey (q/√2): no DBC balanceado a média de cada tratamento é a média das
# parcelas, com variância QME/r e covariância zero — Fieller fica independente
# do motor.
rng9 = np.random.default_rng(1)
d9 = {'y': [], 'tratamento': [], 'bloco': []}
for b_ in range(4):
    for t_, m_ in [('Test', 40), ('T2', 30), ('T3', 25), ('T4', 38)]:
        d9['y'].append(m_ + rng9.normal(0, 3) + b_); d9['tratamento'].append(t_); d9['bloco'].append('B%d' % b_)
pap9 = {'resposta': 'y', 'fatores': ['tratamento'], 'bloco': 'bloco', 'tipo_resposta': 'continua'}
r9 = analisar(d9, pap9, {'comparacao': 'todos', 'maior_melhor': False, 'testemunha': 'Test', 'transformar_auto': False})
tk = r9['comparacao_medias']['tukey']; et = tk['efeito_testemunha']
df9 = pd.DataFrame(d9)
f9 = smf.ols('y ~ tratamento + bloco', df9).fit()
qcrit = stats.studentized_range.ppf(.95, 4, f9.df_resid) / np.sqrt(2)
mc9 = df9[df9.tratamento == 'Test'].y.mean(); v9 = f9.mse_resid / 4
assert et['testemunha'] == 'Test' and 'Tukey' in et['metodo'] and sorted(et['tratamentos']) == ['T2', 'T3', 'T4']
viu = set()
for t_ in ['T2', 'T3', 'T4']:
    mt9 = df9[df9.tratamento == t_].y.mean()
    lo, hi = fieller_raizes(mt9, mc9, v9, v9, 0.0, qcrit)
    e9 = et['tratamentos'][t_]
    assert abs(e9['relativo_pct'] - 100 * (mt9 / mc9 - 1)) < 1e-9
    assert abs(e9['relativo_ic_inf'] - 100 * (lo - 1)) < 1e-6 and abs(e9['relativo_ic_sup'] - 100 * (hi - 1)) < 1e-6, (e9, lo, hi)
    par = [c for c in tk['comparacoes'] if {c['g1'], c['g2']} == {t_, 'Test'}][0]
    exclui_pct = e9['relativo_ic_inf'] > 0 or e9['relativo_ic_sup'] < 0
    exclui_dif = par['ic_inf'] > 0 or par['ic_sup'] < 0
    assert exclui_pct == exclui_dif == par['significativo'], (t_, e9, par)
    assert (not set(tk['letras'][t_]) & set(tk['letras']['Test'])) == par['significativo']
    viu.add(par['significativo'])
assert viu == {True, False}, 'o caso cobre tratamento que difere e que não difere da testemunha'
# sem testemunha, nada muda; com transformação, o motivo no lugar do número
assert 'efeito_testemunha' not in analisar(d9, pap9, {'comparacao': 'todos'})['comparacao_medias']['tukey']
assert analisar(d9, pap9, {'comparacao': 'todos', 'testemunha': 'Nenhum', 'transformar_auto': False}
                )['comparacao_medias']['tukey']['efeito_testemunha']['motivo'].startswith('A testemunha indicada')

# --------------------- 10. Contagem (GLM Poisson): razão de taxas contra a testemunha
rc = np.random.default_rng(2)
d10 = {'y': [], 'tratamento': [], 'bloco': []}
for b_ in range(5):
    for t_, m_ in [('Test', 30), ('T2', 12), ('T3', 28)]:
        d10['y'].append(int(rc.poisson(m_))); d10['tratamento'].append(t_); d10['bloco'].append('B%d' % b_)
r10 = analisar(d10, {'resposta': 'y', 'fatores': ['tratamento'], 'bloco': 'bloco', 'tipo_resposta': 'contagem'},
               {'comparacao': 'todos', 'maior_melhor': False, 'testemunha': 'Test'})
a10 = r10['analise']
assert r10['ok'] and a10['familia'].startswith('Poisson') and not a10['sobredispersao']['sobredisperso'], a10.get('familia')
df10 = pd.DataFrame(d10)
df10['tratamento'] = pd.Categorical(df10['tratamento'], categories=['Test', 'T2', 'T3'])   # testemunha como referência
g10 = smf.glm('y ~ tratamento + bloco', df10, family=sm.families.Poisson()).fit()
z10 = stats.norm.ppf(1 - .05 / (2 * 3))                 # Bonferroni nos 3 pares: a família das letras de Holm
for t_ in ['T2', 'T3']:
    nome = 'tratamento[T.%s]' % t_
    d_, se_ = g10.params[nome], g10.bse[nome]
    e10 = a10['efeito_testemunha']['tratamentos'][t_]
    assert abs(e10['relativo_pct'] - 100 * (np.exp(d_) - 1)) < 1e-6
    assert abs(e10['relativo_ic_inf'] - 100 * (np.exp(d_ - z10 * se_) - 1)) < 1e-5
    assert abs(e10['relativo_ic_sup'] - 100 * (np.exp(d_ + z10 * se_) - 1)) < 1e-5

# -------------------- 11. Modelo misto em "todos entre si": % no crítico do IC do par
r11 = analisar(df.to_dict('list'), pap, {'modelo': 'misto', 'comparacao': 'todos', 'testemunha': 'C', 'maior_melhor': False})
c11 = r11['comparacao_medias']['misto']; e11 = c11['efeito_testemunha']
assert sorted(e11['tratamentos']) == ['T1', 'T2'] and 'Bonferroni' in e11['metodo']
for t_ in ['T1', 'T2']:
    e_ = e11['tratamentos'][t_]
    assert abs(e_['relativo_pct'] - 100 * (c11['medias'][t_] / c11['medias']['C'] - 1)) < 1e-9
    par = [c for c in c11['comparacoes'] if {c['g1'], c['g2']} == {t_, 'C'}][0]
    assert (e_['relativo_ic_inf'] > 0 or e_['relativo_ic_sup'] < 0) == (par['ic_inf'] > 0 or par['ic_sup'] < 0)

# ------------- 12. Contrato com a tela: as chaves que estatistica/app.js lê
# (tests/test_estatistica_efeito.js desenha relatórios com este formato).
assert {'testemunha', 'metodo', 'nivel', 'motivo', 'tratamentos'} <= set(et)
assert {'relativo_pct', 'relativo_ic_inf', 'relativo_ic_sup', 'relativo_motivo'} <= set(et['tratamentos']['T2'])
assert {'omega2_parcial', 'eta2_parcial'} <= set(r9['analise']['tabela_anova'][0]) and {'cv_percent', 'n_observacoes'} <= set(r9['analise'])
assert {'alfa', 'locais', 'medias_por_local', 'melhor_por_local', 'vencedores_distintos', 'contra_controle_por_local',
        'controle', 'desvio_padrao', 'variancia', 'lrt', 'p', 'metodo', 'reajustado_sem', 'n_locais'} <= set(it), sorted(it)
assert {'tratamento', 'geral', 'por_local', 'inversoes'} <= set(it['contra_controle_por_local'][0])
assert {'pred_inf', 'pred_sup', 'relativo_pct'} <= set(rm['comparacao_medias']['misto']['comparacoes'][0])

print('Efeito e ambiente: ω² parcial e CV% (fórmula fechada), Fieller (raízes), % da testemunha, '
      'REML = QM esperados, LRT de forma fechada, IC de predição, inversões, derivada na fronteira, '
      'reajuste sem a interação, recomeço do otimizador e % contra a testemunha em "todos entre si" '
      '(Tukey, Poisson e misto) OK.')
