"""Curva de dose para resposta CONTÍNUA: severidade, controle %, produtividade.

O motor de dose-resposta ao lado é binomial: mortos de n, probit, CL50 por
Fieller. Serve para bioensaio de mortalidade e não serve para o ensaio de
campo mais comum -- doses de um produto contra severidade, percentual de
controle ou produtividade, que são respostas contínuas.

Sem curva, o ensaio de titulação de dose só consegue dizer quais doses
diferem entre si. Não consegue responder a pergunta que motivou o ensaio:
"qual dose entrega 90% de controle?" -- e nem colocar intervalo nisso.

Modelo log-logístico de quatro parâmetros, o padrão da área:

    y(x) = c + (d - c) / (1 + (x/e)^b)

    d = patamar na dose zero      e = DE50 (dose no meio do caminho)
    c = patamar na dose alta      b = inclinação

Com b > 0 a curva vai de d (dose zero) até c (dose alta), servindo tanto para
resposta que cai (severidade) quanto para resposta que sobe (controle %) --
quem decide o sentido são c e d, não o sinal de b.

A testemunha entra como o limite x -> 0, que é exatamente d. Não é descartada
nem empurrada para uma "dose muito pequena" arbitrária.

O que este motor recusa a fazer: extrapolar. Uma DE90 fora do intervalo de
doses testado é aritmética, não resultado, e sai marcada como tal.
"""
import numpy as np
from scipy import stats, optimize


def _llog4(x, b, c, d, e):
    """Curva. Em x = 0 devolve d, que é o limite -- e é onde mora a testemunha."""
    x = np.asarray(x, dtype=float)
    y = np.full(x.shape, float(d))
    m = x > 0
    if np.any(m):
        z = np.clip(b * (np.log(x[m]) - np.log(e)), -500, 500)
        y[m] = c + (d - c) / (1.0 + np.exp(z))
    return y


def _chutes(x, y):
    pos = x[x > 0]
    d0 = float(np.mean(y[x == x.min()]))
    c0 = float(np.mean(y[x == x.max()]))
    if abs(c0 - d0) < 1e-12:
        raise ValueError('A resposta não varia entre a menor e a maior dose; não há curva a ajustar.')
    alvo = (c0 + d0) / 2.0
    e0 = float(np.exp(np.mean(np.log(pos)))) if len(pos) else 1.0
    if len(pos):
        # dose cuja resposta média está mais perto do meio do caminho
        doses = np.unique(pos)
        med = np.array([np.mean(y[x == v]) for v in doses])
        e0 = float(doses[int(np.argmin(np.abs(med - alvo)))])
    return [1.0, c0, d0, max(e0, 1e-9)]


def _falta_de_ajuste(x, y, pred, n_par):
    """Com repetições dentro de cada dose dá para separar o erro puro do erro
       do modelo. Se a curva não descreve os pontos, isto acusa -- e um R² alto
       não acusa."""
    doses = np.unique(x)
    if len(doses) <= n_par:
        return None
    sq_puro = float(sum(np.sum((y[x == v] - np.mean(y[x == v])) ** 2) for v in doses))
    gl_puro = int(len(y) - len(doses))
    if gl_puro < 1 or sq_puro <= 0:
        return None
    sse = float(np.sum((y - pred) ** 2))
    sq_falta = sse - sq_puro
    gl_falta = int(len(doses) - n_par)
    if gl_falta < 1:
        return None
    f = float((sq_falta / gl_falta) / (sq_puro / gl_puro))
    p = float(stats.f.sf(f, gl_falta, gl_puro))
    return {'F': f, 'gl_falta': gl_falta, 'gl_puro': gl_puro, 'p': p,
            'ajuste_suficiente': bool(p >= .05)}


def _de(p, b, e):
    return float(e * (p / (1.0 - p)) ** (1.0 / b))


def _de_ic(p, b, e, cov, gl, alfa):
    """IC no logaritmo da dose (método delta) e depois exponenciado -- por isso
       assimétrico na escala da dose, como deve ser."""
    L = float(np.log(p / (1.0 - p)))
    var = (cov[3, 3] / e ** 2 + (L ** 2) * cov[0, 0] / b ** 4
           - 2 * L * cov[0, 3] / (e * b ** 2))
    if not np.isfinite(var) or var < 0:
        return None, None, None
    ep = float(np.sqrt(var))
    t = float(stats.t.ppf(1 - alfa / 2, gl))
    ld = float(np.log(_de(p, b, e)))
    return float(np.exp(ld - t * ep)), float(np.exp(ld + t * ep)), ep


def analisar_dose_continua(dose, resposta, niveis=(10, 50, 90), alfa=.05,
                           unidade='', maior_melhor=False):
    x = np.asarray(dose, dtype=float)
    y = np.asarray(resposta, dtype=float)
    if x.shape != y.shape:
        raise ValueError('Dose e resposta precisam ter o mesmo número de linhas.')
    m = np.isfinite(x) & np.isfinite(y)
    x, y = x[m], y[m]
    if np.any(x < 0):
        raise ValueError('Há dose negativa. Corrija a entrada.')
    doses = np.unique(x)
    positivas = doses[doses > 0]
    if len(positivas) < 4:
        raise ValueError('A curva de quatro parâmetros exige pelo menos quatro doses positivas distintas. '
                         'Com menos, compare as doses entre si — uma curva aqui seria desenho, não estimativa.')
    if len(y) <= 4:
        raise ValueError('Observações insuficientes para estimar quatro parâmetros.')

    chute = _chutes(x, y)
    lo = [.05, min(y.min(), 0) - 10 * (y.max() - y.min() + 1), min(y.min(), 0) - 10 * (y.max() - y.min() + 1),
          float(positivas.min()) / 1000.0]
    hi = [50., y.max() + 10 * (y.max() - y.min() + 1), y.max() + 10 * (y.max() - y.min() + 1),
          float(positivas.max()) * 1000.0]
    chute = [float(np.clip(v, l + 1e-12, h - 1e-12)) for v, l, h in zip(chute, lo, hi)]

    def resid(par):
        return _llog4(x, *par) - y

    aj = optimize.least_squares(resid, chute, bounds=(lo, hi), max_nfev=20000)
    if not aj.success:
        raise ValueError('A curva não convergiu. Revise as doses e a resposta; nenhum DE foi liberado.')
    b, c, d, e = [float(v) for v in aj.x]
    gl = int(len(y) - 4)
    if gl < 1:
        raise ValueError('Sem graus de liberdade residuais para a curva.')
    pred = _llog4(x, b, c, d, e)
    sse = float(np.sum((y - pred) ** 2))
    sigma2 = sse / gl
    sst = float(np.sum((y - np.mean(y)) ** 2))

    # covariância dos parâmetros por (J'J)^-1 * sigma^2, na ordem b, c, d, e
    try:
        JtJ = aj.jac.T @ aj.jac
        cov = np.linalg.pinv(JtJ) * sigma2
    except Exception:
        raise ValueError('Não foi possível estimar a precisão dos parâmetros da curva.')
    ep = np.sqrt(np.clip(np.diag(cov), 0, np.inf))

    avisos = []
    if b <= lo[0] * 1.01 or b >= hi[0] * .99:
        raise ValueError('A inclinação bateu no limite do ajuste: a curva não está identificada pelos dados.')
    faixa = (float(positivas.min()), float(positivas.max()))
    if not faixa[0] <= e <= faixa[1]:
        avisos.append('A DE50 estimada (' + ('%.4g' % e) + ') cai fora do intervalo de doses testado '
                      '(' + ('%.4g' % faixa[0]) + ' a ' + ('%.4g' % faixa[1]) + '). É extrapolação: '
                      'trate como indicação para o próximo ensaio, não como resultado.')
    obs_min, obs_max = float(np.min(y)), float(np.max(y))
    if not (min(c, d) - abs(obs_max - obs_min) * .25 <= obs_min and obs_max <= max(c, d) + abs(obs_max - obs_min) * .25):
        avisos.append('Os patamares da curva ficam longe do que foi observado; as doses testadas talvez não '
                      'cubram os dois extremos da resposta.')

    des = []
    for nivel in niveis:
        p = float(nivel) / 100.0
        if not 0 < p < 1:
            continue
        v = _de(p, b, e)
        lo_ic, hi_ic, ep_log = _de_ic(p, b, e, cov, gl, alfa)
        des.append({'nivel': float(nivel), 'dose': v, 'ic_inf': lo_ic, 'ic_sup': hi_ic,
                    'ep_log': ep_log, 'unidade': unidade,
                    'extrapolado': bool(not faixa[0] <= v <= faixa[1])})
    if any(r['extrapolado'] for r in des):
        fora = ', '.join('DE' + ('%g' % r['nivel']) for r in des if r['extrapolado'])
        avisos.append('Fora do intervalo de doses testado: ' + fora + '. O número existe, mas o ensaio não '
                      'tem dado para sustentá-lo.')

    lof = _falta_de_ajuste(x, y, pred, 4)
    if lof and not lof['ajuste_suficiente']:
        avisos.append('Teste de falta de ajuste significativo (p=' + ('%.4f' % lof['p']) + '): a log-logística não '
                      'descreve bem estes pontos. Os DE saem, mas leia a curva antes de usá-los.')

    pontos = []
    if len(positivas):
        grade = np.unique(np.concatenate([[0.0], np.geomspace(faixa[0] / 2, faixa[1] * 2, 60)]))
        pontos = [{'dose': float(v), 'ajustado': float(_llog4(np.array([v]), b, c, d, e)[0])} for v in grade]

    return {'ok': True, 'tipo_analise': 'Curva de dose — log-logística de 4 parâmetros (resposta contínua)',
            'modelo': 'y = c + (d - c) / (1 + (x/e)^b)',
            'parametros': {
                'inclinacao_b': b, 'inclinacao_b_ep': float(ep[0]),
                'patamar_dose_alta_c': c, 'patamar_dose_alta_c_ep': float(ep[1]),
                'patamar_dose_zero_d': d, 'patamar_dose_zero_d_ep': float(ep[2]),
                'de50_e': e, 'de50_e_ep': float(ep[3])},
            'doses_efetivas': des,
            'gl_residual': gl, 'sigma': float(np.sqrt(sigma2)),
            'r2': float(1 - sse / sst) if sst > 0 else None,
            'faixa_testada': {'min': faixa[0], 'max': faixa[1], 'n_doses': int(len(positivas)),
                              'tem_testemunha': bool(np.any(x == 0))},
            'falta_de_ajuste': lof, 'curva': pontos, 'unidade': unidade,
            'maior_melhor': bool(maior_melhor), 'avisos': avisos,
            'nota': 'DE50 é a dose no meio do caminho entre os dois patamares ESTIMADOS, não entre zero e cem. '
                    'Os intervalos vêm do logaritmo da dose pelo método delta, por isso são assimétricos. '
                    'A curva descreve as doses testadas; fora delas, é extrapolação.'}
