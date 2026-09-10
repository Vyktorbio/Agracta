"""Planejamento: quantas repetições para enxergar a diferença que importa.

Todo o resto deste motor fala DEPOIS do ensaio. Este fala antes -- que é a
única hora em que ainda dá para mudar alguma coisa.

O erro que ele evita não aparece como erro. Monta-se o ensaio com quatro
blocos porque sempre foram quatro, a análise dá "sem diferença significativa",
e ninguém consegue distinguir duas situações muito diferentes: o produto não
funcionou, ou o ensaio nunca teve tamanho para enxergar se funcionou. As duas
saem com a mesma frase no relatório, e a segunda custou a safra inteira.

A pergunta certa é declarada antes: "qual diferença me faria mudar de decisão?"
-- a diferença agronomicamente relevante. Daí sai o número de repetições.

Nada aqui prova que um ensaio grande vai dar diferença. Poder é probabilidade
de detectar uma diferença DO TAMANHO DECLARADO, se ela existir de verdade.
"""
from functools import lru_cache

import numpy as np
from scipy import stats, optimize


def _gl_erro(k, r, desenho):
    """Graus de liberdade do resíduo. Bloco cobra (r-1) GL; é o preço de
       controlar a heterogeneidade da área, e ele aparece aqui."""
    if desenho == 'dbc':
        return (k - 1) * (r - 1)
    if desenho == 'dic':
        return k * (r - 1)
    raise ValueError('Delineamento não reconhecido: use blocos (dbc) ou inteiramente casualizado (dic).')


def _critico_dunnett(m, gl, alfa):
    """Contrastes contra um controle comum são correlacionados a 0,5 quando o
       ensaio é balanceado. Mesma integração e semente do motor de análise."""
    if m == 1:
        return float(stats.t.ppf(1 - alfa / 2, gl))
    corr = np.full((m, m), .5)
    np.fill_diagonal(corr, 1.)
    dist = stats.multivariate_t(shape=corr, df=gl, allow_singular=True)
    def cobertura(q):
        return float(dist.cdf(np.full(m, q), lower_limit=np.full(m, -q), maxpts=100000,
                              random_state=np.random.default_rng(42019)))
    teto = float(stats.t.ppf(1 - alfa / (2 * m), gl))
    return float(optimize.brentq(lambda q: cobertura(q) - (1 - alfa), .01, teto * 1.01, xtol=1e-5))


def _familia(k, familia):
    """Quantas comparações a pergunta gera. Planejar para 'todos entre si' e
       depois analisar contra a testemunha (ou o contrário) desalinha o plano
       do teste -- por isso a família entra aqui, e não como detalhe."""
    if familia == 'todos':
        return k * (k - 1) // 2
    if familia == 'controle':
        return k - 1
    raise ValueError('Família de comparações não reconhecida.')


@lru_cache(maxsize=512)
def _critico(k, gl, alfa, ajuste, familia):
    """Guardado em cache: a amplitude studentizada e a t multivariada são caras,
       e a busca pelo número de repetições pede o MESMO crítico dezenas de
       vezes. Sem isto, planejar um ensaio trava a tela do aparelho."""
    m = _familia(k, familia)
    if ajuste == 'nenhum':
        return float(stats.t.ppf(1 - alfa / 2, gl))
    if ajuste == 'bonferroni':
        return float(stats.t.ppf(1 - alfa / (2 * m), gl))
    if ajuste == 'tukey':
        return float(stats.studentized_range.ppf(1 - alfa, k, gl) / np.sqrt(2))
    if ajuste == 'dunnett':
        return _critico_dunnett(m, gl, alfa)
    raise ValueError('Correção de multiplicidade não reconhecida.')


def poder_contraste(dp, delta, r, k, desenho='dbc', alfa=.05, ajuste='tukey', familia='todos', crit=None):
    """Poder de UMA comparação entre dois tratamentos, com a multiplicidade da
       família em que ela vai ser testada. EP(diferença) = dp*raiz(2/r).

       `crit` já calculado pode ser passado por quem chama em laço."""
    gl = _gl_erro(k, r, desenho)
    if gl < 1:
        return None
    if crit is None:
        crit = _critico(k, gl, alfa, ajuste, familia)
    ncp = float(delta / (dp * np.sqrt(2.0 / r)))
    return float(stats.nct.sf(crit, gl, ncp) + stats.nct.cdf(-crit, gl, ncp))


def poder_f(dp, delta, r, k, desenho='dbc', alfa=.05):
    """Poder do teste F geral, no cenário mais duro compatível com a diferença
       declarada: DOIS tratamentos separados por delta e os demais no meio.
       Qualquer outro arranjo com a mesma amplitude tem poder maior."""
    gl_den = _gl_erro(k, r, desenho)
    if gl_den < 1:
        return None
    gl_num = k - 1
    lam = float(r * delta ** 2 / (2 * dp ** 2))
    fcrit = float(stats.f.ppf(1 - alfa, gl_num, gl_den))
    return float(stats.ncf.sf(fcrit, gl_num, gl_den, lam))


def diferenca_detectavel(dp, r, k, desenho='dbc', alfa=.05, poder_alvo=.8,
                         ajuste='tukey', familia='todos'):
    """A pergunta invertida: com r repetições, qual a menor diferença que este
       ensaio enxerga com o poder pedido."""
    gl = _gl_erro(k, r, desenho)
    if gl < 1:
        return None
    crit = _critico(k, gl, alfa, ajuste, familia)   # uma vez, não a cada passo da busca
    def f(d):
        return poder_contraste(dp, d, r, k, desenho, alfa, ajuste, familia, crit) - poder_alvo
    lo, hi = 1e-9 * max(dp, 1e-12), dp * 100.0
    if f(hi) < 0:
        return None
    return float(optimize.brentq(f, lo, hi, xtol=dp * 1e-6))


def _busca_r(dp, delta, k, desenho, alfa, poder_alvo, ajuste, familia, r_max):
    """Menor r que alcança o poder alvo, por bissecção.

       Poder cresce com r por dois caminhos ao mesmo tempo -- o contraste fica
       mais preciso e sobra grau de liberdade --, então a busca pode ser
       binária. E precisa ser: no aparelho, cada avaliação com correção de
       Tukey custa cerca de meio segundo, porque a amplitude studentizada é
       integrada numericamente. Varrer 2 a 40 levaria vinte segundos e travaria
       a tela; a bissecção faz seis avaliações."""
    lo, hi = 2, int(r_max)
    if hi < lo or _gl_erro(k, hi, desenho) < 1:
        return None
    p_hi = poder_contraste(dp, delta, hi, k, desenho, alfa, ajuste, familia)
    if p_hi is None or p_hi < poder_alvo:
        return None
    p_lo = poder_contraste(dp, delta, lo, k, desenho, alfa, ajuste, familia)
    if p_lo is not None and p_lo >= poder_alvo:
        return lo
    while hi - lo > 1:
        mid = (lo + hi) // 2
        p = poder_contraste(dp, delta, mid, k, desenho, alfa, ajuste, familia)
        if p is not None and p >= poder_alvo:
            hi = mid
        else:
            lo = mid
    return hi


def _janela(r_minimo, r_max):
    """A curva vale ao redor da resposta: é ali que se enxerga o que cada bloco
       a mais compra, e onde parar. Sem resposta, mostra o panorama."""
    if r_minimo is None:
        passo = max(1, (int(r_max) - 2) // 5)
        return sorted(set(range(2, int(r_max) + 1, passo)) | {int(r_max)})
    return [r for r in range(max(2, r_minimo - 3), min(int(r_max), r_minimo + 4) + 1)]


def _desvio(dp, cv, media):
    """Agrônomo pensa em CV%. O motor pensa em desvio-padrão. A ponte é a
       média, e sem ela o CV não diz nada em unidade nenhuma."""
    if dp is not None:
        dp = float(dp)
        if not np.isfinite(dp) or dp <= 0:
            raise ValueError('O desvio-padrão precisa ser um número positivo.')
        return dp, None
    if cv is None:
        raise ValueError('Informe a variabilidade esperada: desvio-padrão, ou CV% com a média.')
    cv = float(cv)
    if not np.isfinite(cv) or cv <= 0:
        raise ValueError('O CV% precisa ser um número positivo.')
    if media is None or not np.isfinite(float(media)) or float(media) <= 0:
        raise ValueError('Para usar CV% informe também a média esperada da variável.')
    return float(cv) / 100.0 * float(media), cv


def planejar(k, delta, dp=None, cv=None, media=None, desenho='dbc', alfa=.05,
             poder_alvo=.8, ajuste='tukey', familia='todos', r_max=40, gl_dp=None,
             unidade='', fonte_dp=''):
    """Plano do ensaio: repetições mínimas e a curva de poder ao redor delas.

    A curva importa mais que o número. Ela mostra o que se compra com cada
    bloco a mais -- e onde parar, porque a partir de certo ponto cada bloco
    novo compra quase nada.
    """
    k = int(k)
    if k < 2:
        raise ValueError('São necessários pelo menos dois tratamentos.')
    if not 0 < float(alfa) < 1:
        raise ValueError('O nível de significância deve estar entre zero e um.')
    if not 0 < float(poder_alvo) < 1:
        raise ValueError('O poder alvo deve estar entre zero e um.')
    delta = float(delta)
    if not np.isfinite(delta) or delta <= 0:
        raise ValueError('Informe a diferença agronomicamente relevante, maior que zero.')
    if ajuste == 'dunnett' and familia != 'controle':
        raise ValueError('Dunnett é a correção da família contra o controle; ajuste a pergunta ou a correção.')
    if ajuste == 'tukey' and familia == 'controle':
        raise ValueError('Tukey é a correção de todos entre si; para o controle use Dunnett ou Bonferroni.')
    dp, cv_usado = _desvio(dp, cv, media)
    alfa, poder_alvo = float(alfa), float(poder_alvo)

    r_minimo = _busca_r(dp, delta, k, desenho, alfa, poder_alvo, ajuste, familia, r_max)
    curva = []
    for r in _janela(r_minimo, r_max):
        gl = _gl_erro(k, r, desenho)
        if gl < 1:
            continue
        crit = _critico(k, gl, alfa, ajuste, familia)
        curva.append({'repeticoes': r, 'gl_erro': gl,
                      'poder': poder_contraste(dp, delta, r, k, desenho, alfa, ajuste, familia, crit),
                      'poder_f': poder_f(dp, delta, r, k, desenho, alfa),
                      'diferenca_detectavel': diferenca_detectavel(
                          dp, r, k, desenho, alfa, poder_alvo, ajuste, familia)})

    avisos = []
    if r_minimo is None:
        avisos.append('Nenhum número de repetições até ' + str(int(r_max)) + ' alcança o poder pedido para essa '
                      'diferença. Reveja a diferença relevante, a variabilidade esperada ou o delineamento; '
                      'aumentar repetição não resolve sozinho.')
    if gl_dp is not None and int(gl_dp) < 10:
        avisos.append('A variabilidade veio de uma estimativa com ' + str(int(gl_dp)) + ' graus de liberdade. '
                      'O plano é tão incerto quanto ela: trate o número de repetições como piso, não como exato.')
    if cv_usado is not None and cv_usado > 30:
        avisos.append('CV de ' + ('%.0f' % cv_usado) + '%: variabilidade alta. Antes de comprar repetição, '
                      'vale revisar tamanho de parcela, uniformidade da área e critério de avaliação.')
    if familia == 'todos' and k > 6:
        avisos.append(str(k) + ' tratamentos geram ' + str(_familia(k, 'todos')) + ' comparações. A correção de '
                      'multiplicidade cobra caro; se a pergunta real é contra a testemunha, planeje contra o controle.')

    return {'ok': True, 'tipo': 'planejamento',
            'entradas': {'tratamentos': k, 'diferenca_relevante': delta, 'desvio_padrao': dp,
                         'cv_percent': cv_usado, 'media': (float(media) if media is not None else None),
                         'desenho': desenho, 'alfa': alfa, 'poder_alvo': poder_alvo,
                         'ajuste': ajuste, 'familia': familia, 'unidade': unidade,
                         'gl_desvio': (int(gl_dp) if gl_dp is not None else None),
                         'fonte_desvio': fonte_dp},
            'repeticoes_minimas': r_minimo,
            'comparacoes_na_familia': _familia(k, familia),
            'curva': curva, 'avisos': avisos,
            'nota': 'Poder é a probabilidade de detectar uma diferença DO TAMANHO DECLARADO, caso ela exista. '
                    'Não é probabilidade de o produto funcionar, nem garantia de resultado significativo. '
                    'O plano vale para a variável, a escala e a variabilidade informadas.'}
