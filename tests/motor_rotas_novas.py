import numpy as np
from bioengine import analisar, planejar
from bioengine.dosecontinua import _llog4
from bioengine.tempo import analisar_tempo

# ------------------------------------------------- curva de dose pelo roteador
g = np.random.default_rng(20260910)
doses = np.repeat(np.array([0., .25, .5, 1., 2., 4., 8.]), 4)
sev = _llog4(doses, 2.0, 5.0, 80.0, 1.5) + g.normal(0, 1.5, doses.size)
dados = {'dose': [float(v) for v in doses], 'sev': [float(v) for v in sev]}
r = analisar(dados, {'resposta': 'sev', 'dose': 'dose'},
             {'modelo': 'curva', 'unidade_dose': 'L/ha', 'maior_melhor': False})
assert r['ok'], r.get('erro')
a = r['analise']
assert 'log-logística' in a['tipo_analise']
de = {q['nivel']: q['dose'] for q in a['doses_efetivas']}
assert abs(de[50.] - 1.5) < .25, de
assert de[10.] < de[50.] < de[90.]
assert r['descritiva'] and r['decisao']

# A rota binomial continua sendo a binomial: curva contínua não sequestra CL50.
bino = {'dose': [1., 2., 4., 8., 16.] * 3, 'mortos': [1, 3, 5, 8, 9] * 3, 'n': [10] * 15}
neg = analisar(bino, {'resposta': 'mortos', 'dose': 'dose', 'n_total': 'n'}, {'modelo': 'curva'})
assert not neg['ok'] and 'CL50' in neg['erro'], neg
# E sem coluna de dose não há curva.
assert not analisar({'y': [1., 2., 3., 4., 5., 6.]}, {'resposta': 'y'}, {'modelo': 'curva'})['ok']

# --------------------------------------------- equivalência pelo roteador
# DBC com resíduos de soma zero: REF e GEN separados por 1, OUTRO por 30.
erros = np.array([[-1, 1, -1, 1], [1, -1, 2, -2], [0, 0, -1, 1]])
y = (np.array([100, 101, 130])[:, None] + np.array([0, 5, -3, 2]) + erros).ravel()
tr = np.repeat(['REF', 'GEN', 'OUTRO'], 4)
bl = np.tile(['B1', 'B2', 'B3', 'B4'], 3)
d2 = {'trat': list(tr), 'bloco': list(bl), 'y': [float(v) for v in y]}
p2 = {'resposta': 'y', 'fatores': ['trat'], 'bloco': 'bloco'}

eq = analisar(d2, p2, {'comparacao': 'equivalencia', 'controle': 'REF', 'margem': 5.})
assert eq['ok'], eq.get('erro')
cm = eq['comparacao_medias']['equivalencia']
por = {c['tratamento']: c for c in cm['comparacoes']}
assert por['GEN']['conclusao'] == 'equivalente'
assert por['OUTRO']['conclusao'] == 'diferenca_relevante'
assert cm['medias'] and cm['ordem'], 'a tela precisa das médias para desenhar'
assert abs(cm['nivel_ic'] - .90) < 1e-9

# Não-inferioridade é unilateral e usa o sentido da variável.
ni = analisar(d2, p2, {'comparacao': 'nao_inferioridade', 'controle': 'REF',
                       'margem': 5., 'maior_melhor': True})
assert ni['ok'] and ni['comparacao_medias']['equivalencia']['sentido'] == 'nao_inferioridade'

# Margem em % da referência.
pc = analisar(d2, p2, {'comparacao': 'equivalencia', 'controle': 'REF', 'margem_pct': 5.})
assert pc['ok'] and pc['comparacao_medias']['equivalencia']['margem_percent'] == 5.

# ------------------------------------------------------------------ recusas
sem_margem = analisar(d2, p2, {'comparacao': 'equivalencia', 'controle': 'REF'})
assert not sem_margem['ok'] and 'margem' in sem_margem['erro'].lower()
sem_ref = analisar(d2, p2, {'comparacao': 'equivalencia', 'margem': 5.})
assert not sem_ref['ok'] and 'referência' in sem_ref['erro'].lower()

# GLM: o contraste vive na escala de ligação, e a margem do usuário não vale lá.
cont = {'trat': list(np.repeat(['A', 'B', 'C'], 5)),
        'n': [12, 9, 14, 11, 10, 30, 34, 28, 31, 33, 60, 57, 63, 58, 61]}
gl = analisar(cont, {'resposta': 'n', 'fatores': ['trat'], 'tipo_resposta': 'contagem'},
              {'comparacao': 'equivalencia', 'controle': 'A', 'margem': 5.})
assert not gl['ok'] and 'ligação' in gl['erro'], gl

# --------------------------------------------------- planejamento exportado
pl = planejar(k=4, delta=8., dp=10., poder_alvo=.8)
assert pl['ok'] and pl['repeticoes_minimas'] and pl['curva']
assert any(c['repeticoes'] == pl['repeticoes_minimas'] for c in pl['curva'])

# --------------------------------------------------- tempo sem t=0 e KM monotono
t_sem0 = {
    'trat': ['Testemunha'] * 9 + ['ProdA'] * 9 + ['ProdB'] * 7,
    'rep':  ['1','1','1','2','2','2','3','3','3'] * 2 + ['1','1','1','2','2','2','3'],
    't':    [1, 3, 7] * 6 + [1, 3, 7, 1, 3, 7, 1],
    'nt':   [20] * 25,
    'nv':   [20, 19, 18, 20, 20, 19, 19, 18, 18,
             10, 4, 2, 11, 5, 3, 9, 4, 1,
             14, 15, 6, 15, 10, 5, 14],  # ProdB tem 1 rep em t=3,7 e oscilacao 14->15
}
rt = analisar_tempo(t_sem0, {'tratamento': 'trat', 'repeticao': 'rep', 'tempo': 't', 'n_total': 'nt', 'n_vivos': 'nv'},
                    {'controle_neg': 'Testemunha'})
assert rt['ok'], rt.get('erro')
at = rt
assert at['rankings']['efic_final'], 'sem tempo 0 deve calcular eficacia por Abbott em vez de 100% NaN'
assert all(np.isfinite(x['valor']) for x in at['rankings']['efic_final']), at['rankings']['efic_final']
km_b = next(c for c in at['kaplan_meier']['curvas'] if c['tratamento'] == 'ProdB')
assert km_b['n'] <= 60, f"Kaplan-Meier nao pode inflar n acima de N_total=60: {km_b}"
let_t3 = next(l for l in at['letras_mortalidade'] if l['tempo'] == 3.0)
assert let_t3.get('letras') and 'ProdA' in let_t3['letras'] and 'Testemunha' in let_t3['letras'], let_t3

print('Rotas novas: curva de dose, equivalência, não-inferioridade, recusas e planejamento OK.')
