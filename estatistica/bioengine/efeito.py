"""Tamanho de efeito: quanto, e não só "se".

O p diz se a diferença é distinguível do acaso; quem decide uma recomendação
precisa saber DE QUANTO ela é, com a incerteza junto. Este módulo reúne as
medidas que o motor devolve ao lado do p:

  - efeito relativo à testemunha, em %: (média do tratamento / média da
    testemunha − 1) × 100, com IC de Fieller no MESMO valor crítico do IC da
    diferença (simultâneo quando aquele é simultâneo). Fieller e não o método
    delta: a razão é assimétrica, e o delta erra justamente quando a testemunha
    é pequena. Testemunha indistinguível de zero dá intervalo sem limite — o
    efeito relativo não é dado, e o motivo vai junto;
  - ômega² parcial de cada termo da ANOVA (Olejnik & Algina, 2003): a fração da
    variação que o termo explica, sem o viés para cima do eta²;
  - intervalo de predição do efeito num ambiente novo, quando há interação
    tratamento × ambiente (Higgins, Thompson & Spiegelhalter, 2009).

Nada aqui inventa número: sem base para a conta, devolve None e o motivo.
"""
import math


def fieller(a, b, va, vb, cab, crit):
    """IC da razão a/b para estimativas correlacionadas (Fieller, 1954).

    Conjunto de r com (a − r·b)² ≤ crit²·(va − 2r·cab + r²·vb). Devolve
    (r, inferior, superior); limites None quando o intervalo não é limitado
    (o denominador não se distingue de zero no nível crit)."""
    if b == 0 or not all(map(math.isfinite, (a, b, va, vb, cab, crit))):
        return None, None, None
    r = a / b
    t2 = crit * crit
    A = b * b - t2 * vb
    if A <= 0:
        return r, None, None
    B = a * b - t2 * cab
    C = a * a - t2 * va
    disc = B * B - A * C
    if disc < 0:          # só por arredondamento: r = a/b sempre satisfaz a desigualdade
        disc = 0.0
    raiz = math.sqrt(disc)
    return r, (B - raiz) / A, (B + raiz) / A


def relativo(media_trat, media_controle, va, vb, cab, crit):
    """Efeito relativo à testemunha em %, com IC de Fieller."""
    if media_controle is None or not math.isfinite(media_controle) or media_controle == 0:
        return {'relativo_pct': None, 'relativo_ic_inf': None, 'relativo_ic_sup': None,
                'relativo_motivo': 'Média da testemunha igual a zero: não há base para efeito relativo.'}
    r, lo, hi = fieller(media_trat, media_controle, va, vb, cab, crit)
    if r is None:
        return {'relativo_pct': None, 'relativo_ic_inf': None, 'relativo_ic_sup': None,
                'relativo_motivo': 'Sem estimativa estável para o efeito relativo.'}
    if lo is None:
        return {'relativo_pct': 100.0 * (r - 1.0), 'relativo_ic_inf': None, 'relativo_ic_sup': None,
                'relativo_motivo': 'A média da testemunha não se distingue de zero: o intervalo do efeito relativo '
                                   'não tem limite. Use a diferença absoluta.'}
    return {'relativo_pct': 100.0 * (r - 1.0), 'relativo_ic_inf': 100.0 * (lo - 1.0),
            'relativo_ic_sup': 100.0 * (hi - 1.0), 'relativo_motivo': None}


def relativo_ausente(motivo):
    return {'relativo_pct': None, 'relativo_ic_inf': None, 'relativo_ic_sup': None, 'relativo_motivo': motivo}


def omega2_parcial(F, gl, n_obs):
    """ω² parcial = gl(F − 1) / (gl(F − 1) + N). Truncado em zero (F < 1)."""
    if F is None or gl is None or not n_obs or not math.isfinite(F) or gl <= 0:
        return None
    num = gl * (F - 1.0)
    den = num + n_obs
    if den <= 0:
        return None
    return max(0.0, num / den)


def eta2_parcial(sq, sq_residuo):
    if sq is None or sq_residuo is None or not math.isfinite(sq) or sq + sq_residuo <= 0:
        return None
    return sq / (sq + sq_residuo)


def intervalo_predicao(dif, ep, variancia_ambiente, crit):
    """Faixa em que se espera a diferença num ambiente novo, parecido com os
    observados: dif ± crit·√(EP² + variância que o ambiente acrescenta)."""
    if None in (dif, ep, variancia_ambiente, crit):
        return None, None
    meia = crit * math.sqrt(ep * ep + max(0.0, variancia_ambiente))
    return dif - meia, dif + meia
