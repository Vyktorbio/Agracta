"""Equivalência e não-inferioridade: responder "é tão bom quanto?".

Todo relatório deste motor carimba "não comprova equivalência" depois de um
teste que não deu diferença. O carimbo está certo -- não rejeitar não é provar
igualdade, e um ensaio pequeno o bastante não rejeita nada -- mas é um beco
sem saída, porque "é tão bom quanto o padrão?" é exatamente a pergunta que o
cliente faz. Sobre o genérico, sobre a dose reduzida, sobre o produto novo.

A pergunta tem teste próprio, e ele exige uma coisa que a comparação comum não
exige: dizer ANTES quanto é "tão bom quanto". Essa margem é agronômica, não
estatística -- é a perda que ainda não muda a decisão. Sem ela declarada, não
há pergunta de equivalência, só desejo de que o p tivesse dado outra coisa.

Dois testes unilaterais (TOST): mostra-se que a diferença não chega à margem
nem para baixo nem para cima. Equivale a exigir que o intervalo de 1-2alfa
caiba inteiro dentro das margens -- 90% quando alfa é 5%, e não 95%; é assim
mesmo, e o relatório diz qual intervalo está mostrando.

Três respostas, não duas. "Inconclusivo" é resposta: o ensaio não tem tamanho
para afirmar equivalência nem para negar. Confundir isso com equivalência é o
mesmo erro do "não deu diferença, então é igual", de máscara nova.
"""
import numpy as np
from scipy import stats
from .posthoc import _ajuste_p


def avaliar(dif, se, gl, margem, alfa=.05, sentido='equivalencia', maior_melhor=True):
    """Um contraste contra uma margem. Devolve os dois p unilaterais, o
       intervalo de 1-2alfa e a conclusão em três estados."""
    dif, se, gl, margem = float(dif), float(se), float(gl), float(margem)
    if not se > 0 or not np.isfinite(se):
        raise ValueError('Sem erro-padrão estimável para o contraste; não há como testar equivalência.')
    if gl < 1:
        raise ValueError('Sem graus de liberdade residuais para testar equivalência.')
    if not margem > 0 or not np.isfinite(margem):
        raise ValueError('A margem de equivalência precisa ser maior que zero e declarada antes da análise.')

    # p inferior: rejeita "a diferença é pior que -margem". p superior: idem para +margem.
    p_inf = float(stats.t.sf((dif + margem) / se, gl))
    p_sup = float(stats.t.cdf((dif - margem) / se, gl))
    t2 = float(stats.t.ppf(1 - alfa, gl))          # intervalo de 1-2alfa, o do TOST
    ic_inf, ic_sup = dif - t2 * se, dif + t2 * se

    if sentido == 'equivalencia':
        p = max(p_inf, p_sup)
        if ic_inf > -margem and ic_sup < margem:
            conclusao = 'equivalente'
        elif ic_inf >= margem or ic_sup <= -margem:
            conclusao = 'diferenca_relevante'
        else:
            conclusao = 'inconclusivo'
    elif sentido == 'nao_inferioridade':
        # "não pior que a referência por mais que a margem" -- e qual lado é
        # pior depende da variável: severidade quanto menos melhor.
        if maior_melhor:
            p = p_inf
            conclusao = 'nao_inferior' if ic_inf > -margem else ('inferior' if ic_sup <= -margem else 'inconclusivo')
        else:
            p = p_sup
            conclusao = 'nao_inferior' if ic_sup < margem else ('inferior' if ic_inf >= margem else 'inconclusivo')
    else:
        raise ValueError('Sentido não reconhecido: equivalência ou não-inferioridade.')

    return {'diferenca': dif, 'ep_diferenca': se, 'gl': gl,
            'p_inferior': p_inf, 'p_superior': p_sup, 'p': float(p),
            'ic_inf': float(ic_inf), 'ic_sup': float(ic_sup),
            'conclusao': conclusao}


def _margem(margem, margem_pct, referencia_media):
    if margem is not None:
        return float(margem), None
    if margem_pct is None:
        raise ValueError('Declare a margem de equivalência: em unidade da variável, ou em % da referência.')
    if referencia_media is None or not np.isfinite(float(referencia_media)) or float(referencia_media) == 0:
        raise ValueError('Para margem em %, é preciso a média da referência.')
    return abs(float(margem_pct) / 100.0 * float(referencia_media)), float(margem_pct)


def testar(resultado, referencia, margem=None, margem_pct=None, alfa=.05,
           sentido='equivalencia', maior_melhor=True, ajuste='nenhum'):
    """Aplica o TOST aos contrastes JÁ ESTIMADOS por uma análise (ANOVA, misto
       ou GLM), preservando o erro e os graus de liberdade daquele modelo --
       não refaz conta nem troca de escala pelas costas.

       `referencia` é o tratamento contra o qual se pergunta "tão bom quanto".
       Os contrastes são normalizados para tratamento − referência."""
    referencia = str(referencia)
    ordem = [str(t) for t in resultado.get('ordem', [])]
    if referencia not in ordem:
        raise ValueError('Selecione uma referência observada para a equivalência.')
    gl = resultado.get('df_erro')
    medias = resultado.get('medias') or resultado.get('medias_exibicao') or {}
    m, pct = _margem(margem, margem_pct, medias.get(referencia))

    comps = []
    for c in resultado.get('comparacoes', []):
        g1, g2 = str(c['g1']), str(c['g2'])
        if referencia not in (g1, g2):
            continue
        if c.get('ep_diferenca') is None or c.get('diferenca') is None:
            raise ValueError('Esta comparação não traz diferença e erro-padrão; equivalência exige a estimativa, '
                             'não só o p. Use a rota paramétrica.')
        # normaliza para "tratamento − referência"
        dif = float(c['diferenca']) if g1 == referencia else -float(c['diferenca'])
        outro = g2 if g1 == referencia else g1
        gl_c = c.get('gl', gl)
        if gl_c is None:
            raise ValueError('Sem graus de liberdade para o contraste.')
        r = avaliar(dif, c['ep_diferenca'], gl_c, m, alfa, sentido, maior_melhor)
        r.update(referencia=referencia, tratamento=outro, g1=referencia, g2=outro)
        comps.append(r)
    if not comps:
        raise ValueError('Não há contrastes estimáveis contra a referência escolhida.')

    if ajuste != 'nenhum':
        for c, p in zip(comps, _ajuste_p([c['p'] for c in comps], ajuste)):
            c['p_bruto'], c['p'] = c['p'], float(p)
            if float(p) >= alfa and c['conclusao'] in ('equivalente', 'nao_inferior'):
                c['conclusao'] = 'inconclusivo'

    avisos = []
    if len(comps) > 1 and ajuste == 'nenhum':
        avisos.append('Cada comparação foi julgada ao nível ' + ('%.0f' % (alfa * 100)) + '%, sem correção de '
                      'multiplicidade. Com ' + str(len(comps)) + ' tratamentos, a chance de ao menos um "equivalente" '
                      'por acaso é maior que esse nível.')
    if any(c['conclusao'] == 'inconclusivo' for c in comps):
        avisos.append('Há comparações inconclusivas: o intervalo cruza a margem. O ensaio não sustenta nem '
                      'equivalência nem diferença relevante para elas — não leia isso como igualdade.')

    nome = 'Equivalência (TOST)' if sentido == 'equivalencia' else 'Não-inferioridade'
    return {'metodo': nome + ' — margem declarada', 'alfa': alfa, 'sentido': sentido,
            'margem': m, 'margem_percent': pct, 'referencia': referencia,
            'nivel_ic': round(1 - 2 * alfa, 4), 'ajuste': ajuste,
            'maior_melhor': bool(maior_melhor), 'comparacoes': comps, 'avisos': avisos,
            'nota': 'Intervalo de ' + ('%.0f' % ((1 - 2 * alfa) * 100)) + '% (o do TOST), confrontado com a margem '
                    'declarada de ' + ('%.4g' % m) + '. Equivalente = o intervalo inteiro cabe dentro da margem. '
                    'A margem é uma decisão agronômica e precisa ser declarada antes de ver o resultado; '
                    'ajustá-la depois invalida o teste.'}
