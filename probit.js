/* probit.js — tela da análise probit/logit da bancada (probit.html).
 *
 * A conta mora toda em vendor/probit-core.js (testado em
 * tests/test_probit_core.js contra a saída do PoloPlus publicada no livro).
 * Aqui só se lê o que foi digitado, se chama o motor e se pinta o resultado.
 * A página roda com CSP estrita: nada de estilo inline — cor de série é classe.
 * Os dados digitados ficam só neste aparelho (localStorage), como rascunho.
 */
(function () {
  'use strict';
  var E = window.ProbitEngine;
  var $ = function (id) { return document.getElementById(id); };
  var SAMPLE = '=Exemplo: Robertson et al. (2007), cap. 4 — Wicked witch, 1º ínstar, piretrinas (mg/mL)\n' + E.VALIDATION_DATA;
  var CHAVE = 'agracta-probit-rascunho';
  var model = 'probit', timer = null;

  var cls = function (i) { return 'c' + (i % 6); };
  var kls = function (i) { return 'k' + (i % 6); };
  function fmt(v, d) { d = d == null ? 3 : d; return (v == null || !isFinite(v)) ? '—' : v.toFixed(d).replace('.', ','); }
  function fmtSig(v, s) {
    s = s || 4; if (v == null || !isFinite(v)) return '—';
    var a = Math.abs(v); if (a === 0) return '0';
    var d = Math.max(0, Math.min(6, s - 1 - Math.floor(Math.log10(a))));
    return v.toFixed(d).replace('.', ',');
  }
  /* Dose com três casas, como o PoloPlus; dose pequena ganha algarismos. */
  function fmtDose(v) { return (v == null || !isFinite(v)) ? '—' : (Math.abs(v) >= 0.1 ? fmt(v, 3) : fmtSig(v, 4)); }
  function fmtP(p) { return p < 0.001 ? '< 0,001' : fmt(p, 3); }
  function num(v) { return String(v).replace('.', ','); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sci(v) { return v.toExponential(6).replace('.', ','); }
  function ldLabel(L) { return L === 99.9968 ? 'Probit 9' : 'DL' + num(L); }

  /* ---------- rascunho neste aparelho ---------- */
  function salvar() {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ data: $('data').value, model: model, lds: $('lds').value,
        natural: $('natural').checked, logdose: $('logdose').checked, p9: $('p9').checked, het: $('het').checked, ratioz: $('ratioz').value }));
    } catch (e) {}
  }
  function carregar() {
    try {
      var s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (!s || !s.data) return false;
      $('data').value = s.data; setModel(s.model || 'probit'); $('lds').value = s.lds || '10 50 90';
      $('natural').checked = s.natural !== false; $('logdose').checked = s.logdose !== false;
      $('p9').checked = !!s.p9; $('het').checked = s.het !== false; $('ratioz').value = s.ratioz || '2';
      return true;
    } catch (e) { return false; }
  }
  function setModel(m) { model = m; $('m-probit').setAttribute('aria-pressed', String(m === 'probit')); $('m-logit').setAttribute('aria-pressed', String(m === 'logit')); }

  function lerLds() {
    var out = [], ruins = [];
    $('lds').value.split(/[\s;]+/).filter(Boolean).forEach(function (t) { var v = +t.replace(',', '.'); if (v > 0 && v < 100) out.push(v); else ruins.push(t); });
    if ($('p9').checked) out.push(99.9968);
    return { lds: out.filter(function (v, i) { return out.indexOf(v) === i; }).slice(0, 13), ruins: ruins };
  }

  /* ---------- cálculo ---------- */
  function calcular() {
    var erros = [], lido = E.parsePolo($('data').value);
    erros.push.apply(erros, lido.errors);
    var l = lerLds();
    if (l.ruins.length) erros.push('Doses letais ignoradas (use valores entre 0 e 100): ' + l.ruins.join(', '));
    if (!l.lds.length) erros.push('Informe pelo menos uma dose letal, por exemplo 50.');
    var sel = $('ref'), antes = sel.value;
    sel.innerHTML = lido.preps.map(function (p, i) { return '<option value="' + i + '">' + esc(p.name) + '</option>'; }).join('');
    if (antes && +antes < lido.preps.length) sel.value = antes;
    sel.disabled = lido.preps.length < 2;
    var R = null;
    if (!lido.preps.length) erros.push('Nenhuma preparação encontrada. Digite uma linha por dose com dose, testados e mortos.');
    else if (l.lds.length) {
      try {
        R = E.analyze(lido.preps, { model: model, natural: $('natural').checked, logDose: $('logdose').checked, lds: l.lds,
          hetCorrection: $('het').checked, ratioZ: +$('ratioz').value, refIndex: +sel.value || 0 });
        R.failed.forEach(function (f) { erros.push(f.error); });
        if (R.testsError) erros.push(R.testsError);
        R.title = lido.title;
      } catch (e) { erros.push(e.message); }
    }
    $('errors').hidden = !erros.length;
    $('errors').innerHTML = erros.map(function (e) { return '<p>' + esc(e) + '</p>'; }).join('');
    pintarResultados(R); pintarGraficos(R);
    $('report').textContent = R && R.preps.length ? relatorio(R) : '';
    salvar();
  }

  /* ---------- resultados ---------- */
  function chips(p) {
    var c = [];
    if (p.beta < 0) c.push(['bad', 'Inclinação negativa']);
    if (!p.slopeSignificant) c.push(['bad', 'Inclinação não significativa (t = ' + fmt(p.tBeta, 2) + '): o PoloPlus manda excluir este conjunto']);
    else c.push(['ok', 'Inclinação significativa (t = ' + fmt(p.tBeta, 2) + ')']);
    if (p.df > 0) c.push(p.pChi2 < 0.05 ? ['warn', 'Falta de ajuste: χ² P = ' + fmtP(p.pChi2)] : ['ok', 'Ajuste adequado: χ² P = ' + fmtP(p.pChi2)]);
    else c.push(['warn', 'Sem graus de liberdade para testar o ajuste']);
    if (p.hetUsed) c.push(['info', 'Limites corrigidos: t com ' + p.df + ' GL e variância × ' + fmt(p.het, 2)]);
    if (p.estNatural) c.push(['info', 'Resposta natural estimada: ' + fmt(p.C * 100, 1) + '%']);
    if (p.ld.some(function (L) { return L.limits[0.95].lower == null; })) c.push(['warn', 'Algum limite de 95% omitido (g > 0,5)']);
    return c.map(function (x) { return '<span class="chip ' + x[0] + '">' + esc(x[1]) + '</span>'; }).join('');
  }

  function pintarResultados(R) {
    var el = $('v-res');
    if (!R || !R.preps.length) { el.innerHTML = '<p class="note">Sem resultado para mostrar. Corrija os dados ao lado.</p>'; return; }
    var o = R.options, h = '';
    h += '<div class="meta"><span>Modelo <b>' + (o.model === 'probit' ? 'Probit' : 'Logit') + '</b></span><span>Dose <b>' + (o.logDose ? 'log₁₀' : 'linear') + '</b></span><span>Preparações <b>' + R.preps.length + '</b></span><span>Grupos de dose <b>' + R.nDoseGroups + '</b></span>' + (R.title ? '<span>' + esc(R.title) + '</span>' : '') + '</div>';

    h += '<div><h2>Resumo</h2><div class="tbl"><table><thead><tr><th>Preparação</th><th>Testados</th><th>Inclinação ± EP</th><th>Resp. natural</th><th>χ² (GL)</th><th>Heterog.</th>' +
      o.lds.map(function (L) { return '<th>' + ldLabel(L) + ' (IC 95%)</th>'; }).join('') + '</tr></thead><tbody>';
    R.preps.forEach(function (p, i) {
      h += '<tr' + (p.slopeSignificant ? '' : ' class="flag"') + '><td class="txt"><span class="sw ' + cls(i) + '"></span>' + esc(p.name) + '</td><td>' + p.subjects + '</td><td>' + fmt(p.beta) + ' ± ' + fmt(p.se[1]) + '</td><td>' +
        (p.estNatural ? fmt(p.C) + ' ± ' + fmt(p.se[2]) : '<span class="na">0</span>') + '</td><td>' + (p.df > 0 ? fmt(p.chi2, 2) + ' (' + p.df + ')' : '—') + '</td><td>' + fmt(p.het, 2) + '</td>' +
        p.ld.map(function (L) { return '<td>' + fmtDose(L.dose) + ' <span class="na">(' + fmtDose(L.limits[0.95].lower) + '–' + fmtDose(L.limits[0.95].upper) + ')</span></td>'; }).join('') + '</tr>';
    });
    h += '</tbody></table></div></div>';

    if (R.tests) {
      var caixa = function (titulo, t, txt) {
        return '<div><span class="eyebrow">' + titulo + '</span><div class="res ' + (t.rejected ? 'rej' : 'acc') + '">' + (t.rejected ? 'Rejeitada' : 'Não rejeitada') +
          ' <span class="mono">(P ' + (t.p < 0.001 ? '< 0,001' : '= ' + fmt(t.p, 3)) + ')</span></div><div class="stat">LR = ' + fmt(t.lr, 2) + ' · GL = ' + t.df + '</div><p class="hint">' + txt + '</p></div>';
      };
      var T = R.tests;
      h += '<div><h2>Testes de razão de verossimilhança</h2><div class="verdict">' +
        caixa('Hipótese de igualdade', T.equal, T.equal.rejected ? 'As curvas diferem na inclinação, no intercepto ou nos dois.' : 'As curvas podem ser tratadas como uma só.') +
        caixa('Hipótese de paralelismo', T.parallel, T.parallel.rejected ? 'As inclinações diferem: a razão muda conforme o nível de DL.' : 'Inclinações iguais: a potência relativa é constante.') + '</div></div>';
    }

    if (R.ratios && R.ratios.length && R.ratios[0].rows.length) {
      h += '<div><h2>Razões de dose letal</h2><p class="hint">Razão = DL de ' + esc(R.ratios[0].ref) + ' ÷ DL da preparação. Há diferença quando o intervalo não inclui 1 (teste da razão, Wheeler et al. 2006). Limites a ±' + num(o.ratioZ) + ' EP.</p><div class="tbl"><table><thead><tr><th>Preparação</th>' +
        R.ratios.map(function (L) { return '<th>' + ldLabel(L.level) + '</th>'; }).join('') + '</tr></thead><tbody>';
      R.ratios[0].rows.forEach(function (_, j) {
        h += '<tr><td class="txt">' + esc(R.ratios[0].rows[j].name) + '</td>' + R.ratios.map(function (L) {
          var r = L.rows[j];
          return '<td>' + fmt(r.ratio) + ' <span class="na">(' + fmt(r.lower) + '–' + fmt(r.upper) + ')</span> ' + (r.significant ? '<span class="chip bad">difere</span>' : '<span class="chip ok">igual</span>') + '</td>';
        }).join('') + '</tr>';
      });
      h += '</tbody></table></div></div>';
    }

    var lev = [0.9, 0.95, 0.99];
    R.preps.forEach(function (p, i) {
      h += '<div class="prep"><div class="prep-head"><h2><span class="sw ' + cls(i) + '"></span>' + esc(p.name) + '</h2><p class="hint">' + p.subjects + ' testados · ' + p.controls + ' na testemunha' + (p.controls ? ' (' + p.controlResp + ' mortos)' : '') + '</p></div>';
      h += '<div class="chips">' + chips(p) + '</div>';
      h += '<div class="tbl"><table><thead><tr><th>Parâmetro</th><th>Estimativa</th><th>Erro padrão</th><th>Razão t</th></tr></thead><tbody>' +
        '<tr><td class="txt">Intercepto</td><td>' + fmt(p.alpha) + '</td><td>' + fmt(p.se[0]) + '</td><td>' + fmt(p.tAlpha) + '</td></tr>' +
        (p.estNatural ? '<tr><td class="txt">Resposta natural</td><td>' + fmt(p.C) + '</td><td>' + fmt(p.se[2]) + '</td><td>' + fmt(p.tC) + '</td></tr>' : '') +
        '<tr><td class="txt">Inclinação</td><td>' + fmt(p.beta) + '</td><td>' + fmt(p.se[1]) + '</td><td>' + fmt(p.tBeta) + '</td></tr></tbody></table></div>';
      h += '<h3>Doses letais e limites fiduciais</h3><div class="tbl"><table><thead><tr><th>DL</th><th>Dose</th>' +
        lev.map(function (l) { return '<th>' + Math.round(l * 100) + '% inf.</th><th>' + Math.round(l * 100) + '% sup.</th>'; }).join('') + '</tr></thead><tbody>';
      p.ld.forEach(function (L) { h += '<tr><td class="txt">' + ldLabel(L.level) + '</td><td>' + fmtDose(L.dose) + '</td>' + lev.map(function (l) { return '<td>' + fmtDose(L.limits[l].lower) + '</td><td>' + fmtDose(L.limits[l].upper) + '</td>'; }).join('') + '</tr>'; });
      h += '</tbody></table></div><p class="hint">g (95%) = ' + fmt(p.ld[0].limits[0.95].g) + '. Limite com g &gt; 0,5 não é mostrado, como no PoloPlus.</p>';
      h += '<h3>Qui-quadrado de aderência</h3><div class="tbl"><table><thead><tr><th>Dose</th><th>n</th><th>r</th><th>Esperado</th><th>Resíduo</th><th>Probab.</th><th>Resíduo padr.</th></tr></thead><tbody>';
      p.table.forEach(function (r) {
        h += '<tr' + (Math.abs(r.stdResid) > 2 ? ' class="flag"' : '') + '><td' + (r.isCtrl ? ' class="txt"' : '') + '>' + (r.isCtrl ? 'Testemunha' : fmtDose(r.dose)) + '</td><td>' + r.n + '</td><td>' + r.r + '</td><td>' + fmt(r.expected, 2) + '</td><td>' + fmt(r.residual) + '</td><td>' + fmt(r.p) + '</td><td>' + fmt(r.stdResid) + '</td></tr>';
      });
      h += '</tbody></table></div><p class="line-stats">χ² = ' + fmt(p.chi2, 4) + ' · GL = ' + p.df + ' · heterogeneidade = ' + fmt(p.het, 4) + ' · P = ' + fmtP(p.pChi2) + '</p></div>';
    });
    el.innerHTML = h;
  }

  /* ---------- gráficos (SVG; cor por classe, por causa da CSP) ---------- */
  function ticksLog(lo, hi) {
    var t = [];
    for (var e = Math.floor(lo) - 1; e <= Math.ceil(hi) + 1; e++) [1, 2, 5].forEach(function (m) { var v = Math.log10(m) + e; if (v >= lo - 1e-9 && v <= hi + 1e-9) t.push(v); });
    return t.length > 9 ? t.filter(function (v) { return Math.abs(v - Math.round(v)) < 1e-9; }) : t;
  }
  function ticksLin(lo, hi) {
    var step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 6))), s = [1, 2, 5, 10].map(function (k) { return k * step; }).filter(function (k) { return (hi - lo) / k <= 6; })[0] || step * 10, t = [];
    for (var v = Math.ceil(lo / s) * s; v <= hi + 1e-9; v += s) t.push(+v.toFixed(10));
    return t;
  }
  function pintarGraficos(R) {
    var el = $('v-plot');
    if (!R || !R.preps.length) { el.innerHTML = '<p class="note">Sem resultado para mostrar.</p>'; return; }
    var o = R.options, M = E.MODELS[o.model], W = 760, H = 380, m = { l: 54, r: 18, t: 14, b: 44 };
    var xs = []; R.preps.forEach(function (p) { p.table.forEach(function (r) { if (!r.isCtrl) xs.push(o.logDose ? Math.log10(r.dose) : r.dose); }); });
    var xlo = Math.min.apply(null, xs), xhi = Math.max.apply(null, xs), pad = (xhi - xlo) * 0.12 || 0.5; xlo -= pad; xhi += pad;
    if (!o.logDose) xlo = Math.max(0, xlo);
    var X = function (v) { return m.l + (v - xlo) / (xhi - xlo) * (W - m.l - m.r); }, Y = function (p) { return m.t + (1 - p) * (H - m.t - m.b); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Curvas ajustadas com a proporção observada em cada dose">';
    [0, .25, .5, .75, 1].forEach(function (p) { s += '<line class="gd" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + Y(p) + '" y2="' + Y(p) + '"/><text x="' + (m.l - 8) + '" y="' + (Y(p) + 4) + '" text-anchor="end">' + (p * 100) + '%</text>'; });
    (o.logDose ? ticksLog(xlo, xhi) : ticksLin(xlo, xhi)).forEach(function (v) { s += '<line class="gd" x1="' + X(v) + '" x2="' + X(v) + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/><text x="' + X(v) + '" y="' + (H - m.b + 16) + '" text-anchor="middle">' + fmtSig(o.logDose ? Math.pow(10, v) : v, 3) + '</text>'; });
    s += '<line class="ax" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + (H - m.b) + '" y2="' + (H - m.b) + '"/><line class="ax" x1="' + m.l + '" x2="' + m.l + '" y1="' + m.t + '" y2="' + (H - m.b) + '"/>';
    s += '<text x="' + ((m.l + W - m.r) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Dose' + (o.logDose ? ' (escala log)' : '') + '</text><text transform="translate(14 ' + ((m.t + H - m.b) / 2) + ') rotate(-90)" text-anchor="middle">Mortalidade</text>';
    R.preps.forEach(function (p, i) {
      var d = '';
      for (var k = 0; k <= 200; k++) { var x = xlo + (xhi - xlo) * k / 200, pr = p.C + (1 - p.C) * M.F(p.alpha + p.beta * x); d += (k ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(pr).toFixed(1); }
      s += '<path class="curve ' + kls(i) + '" d="' + d + '"/>';
      p.table.forEach(function (r) {
        if (r.isCtrl) return; var x = o.logDose ? Math.log10(r.dose) : r.dose;
        s += '<circle class="pt ' + kls(i) + '" cx="' + X(x) + '" cy="' + Y(r.r / r.n) + '" r="' + (3 + Math.min(4, Math.sqrt(r.n) / 4)) + '"><title>' + esc(p.name) + ' · dose ' + fmtDose(r.dose) + ': ' + r.r + '/' + r.n + '</title></circle>';
      });
      var L50 = p.ld.filter(function (L) { return L.level === 50; })[0];
      if (L50 && L50.x >= xlo && L50.x <= xhi) s += '<line class="ld50 ' + kls(i) + '" x1="' + X(L50.x) + '" x2="' + X(L50.x) + '" y1="' + Y(p.C + (1 - p.C) * 0.5) + '" y2="' + (H - m.b) + '"/>';
    });
    s += '</svg>';

    var H2 = 260, m2 = { l: 54, r: 18, t: 14, b: 40 }, todos = [];
    R.preps.forEach(function (p, i) { p.table.forEach(function (r) { todos.push({ i: i, p: r.p, s: r.stdResid }); }); });
    var ymax = Math.max(3, Math.ceil(Math.max.apply(null, todos.map(function (a) { return Math.abs(a.s); }))));
    var X2 = function (p) { return m2.l + p * (W - m2.l - m2.r); }, Y2 = function (v) { return m2.t + (ymax - v) / (2 * ymax) * (H2 - m2.t - m2.b); };
    var r = '<svg viewBox="0 0 ' + W + ' ' + H2 + '" role="img" aria-label="Resíduos padronizados contra a probabilidade prevista">';
    r += '<rect class="band" x="' + m2.l + '" y="' + Y2(2) + '" width="' + (W - m2.l - m2.r) + '" height="' + (Y2(-2) - Y2(2)) + '"/>';
    for (var v = -ymax; v <= ymax; v++) r += '<text x="' + (m2.l - 8) + '" y="' + (Y2(v) + 4) + '" text-anchor="end">' + v + '</text>';
    [0, .25, .5, .75, 1].forEach(function (p) { r += '<text x="' + X2(p) + '" y="' + (H2 - m2.b + 16) + '" text-anchor="middle">' + num(p) + '</text>'; });
    r += '<line class="ax" x1="' + m2.l + '" x2="' + (W - m2.r) + '" y1="' + Y2(0) + '" y2="' + Y2(0) + '"/><line class="ax" x1="' + m2.l + '" x2="' + m2.l + '" y1="' + m2.t + '" y2="' + (H2 - m2.b) + '"/>';
    r += '<text x="' + ((m2.l + W - m2.r) / 2) + '" y="' + (H2 - 6) + '" text-anchor="middle">Probabilidade prevista</text>';
    todos.forEach(function (a) { r += '<circle class="rs ' + kls(a.i) + (Math.abs(a.s) > 2 ? ' out' : '') + '" cx="' + X2(a.p) + '" cy="' + Y2(a.s) + '" r="4"/>'; });
    r += '</svg>';

    var leg = '<div class="legend">' + R.preps.map(function (p, i) { return '<span><span class="sw ' + cls(i) + '"></span>' + esc(p.name) + '</span>'; }).join('') + '</div>';
    el.innerHTML = '<div><h2>Curvas ajustadas</h2><p class="hint">Pontos: mortalidade observada (tamanho conforme n). Tracejado: DL50.</p></div>' + leg + '<div class="plot">' + s + '</div>' +
      '<div><h2>Resíduos padronizados</h2><p class="hint">Com bom ajuste, cerca de 95% dos pontos ficam entre −2 e 2 (faixa cinza). Contorno vermelho: fora da faixa.</p></div><div class="plot">' + r + '</div>';
  }

  /* ---------- saída completa em texto, na ordem do PoloPlus ---------- */
  function relatorio(R) {
    var o = R.options, L = [], linha = new Array(73).join('-');
    var pad = function (s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; };
    var padE = function (s, n) { s = String(s); while (s.length < n) s += ' '; return s; };
    L.push('Agracta · análise probit/logit (Robertson et al. 2007 / PoloPlus)', 'Data: ' + new Date().toLocaleString('pt-BR'));
    if (R.title) L.push(R.title);
    L.push('Número de preparações: ' + R.preps.length, 'Número de grupos de dose: ' + R.nDoseGroups, 'Modelo: ' + (o.model === 'probit' ? 'Probit' : 'Logit'),
      'Resposta natural como parâmetro: ' + (o.natural ? 'sim' : 'não'), 'Doses convertidas para log10: ' + (o.logDose ? 'sim' : 'não'), 'DLs: ' + o.lds.map(num).join(' '), linha);
    R.preps.forEach(function (p, i) {
      L.push('Interceptos e inclinações sem restrição. Preparação (' + (i + 1) + ') ' + p.name, p.estNatural ? 'Estimando resposta natural' : 'Sem estimar resposta natural', '');
      L.push(padE('', 14) + pad('parâmetro', 12) + pad('erro padrão', 14) + pad('razão t', 10));
      L.push(padE(p.name.slice(0, 13), 14) + pad(fmt(p.alpha), 12) + pad(fmt(p.se[0]), 14) + pad(fmt(p.tAlpha), 10));
      if (p.estNatural) L.push(padE('NATURAL', 14) + pad(fmt(p.C), 12) + pad(fmt(p.se[2]), 14) + pad(fmt(p.tC), 10));
      L.push(padE('INCLINAÇÃO', 14) + pad(fmt(p.beta), 12) + pad(fmt(p.se[1]), 14) + pad(fmt(p.tBeta), 10), '');
      var nomes = [p.name.slice(0, 12), 'INCLINAÇÃO'].concat(p.estNatural ? ['NATURAL'] : []), ord = p.estNatural ? [0, 1, 2] : [0, 1];
      L.push('Matriz de variância-covariância', padE('', 14) + nomes.map(function (n) { return pad(n, 16); }).join(''));
      ord.forEach(function (a) { L.push(padE(nomes[a], 14) + ord.map(function (b) { return pad(sci(p.cov[a][b]), 16); }).join('')); });
      L.push('', 'Qui-quadrado de aderência', padE('dose', 12) + pad('n', 7) + pad('r', 7) + pad('esperado', 11) + pad('resíduo', 10) + pad('probab', 9) + pad('res. padr.', 12));
      p.table.forEach(function (r) { L.push(padE(r.isCtrl ? 'NATURAL' : fmtDose(r.dose), 12) + pad(r.n, 7) + pad(r.r, 7) + pad(fmt(r.expected, 2), 11) + pad(fmt(r.residual), 10) + pad(fmt(r.p), 9) + pad(fmt(r.stdResid), 12)); });
      L.push('', 'qui-quadrado: ' + fmt(p.chi2, 4) + '   graus de liberdade: ' + p.df + '   heterogeneidade: ' + fmt(p.het, 4), '', 'Doses efetivas',
        padE('', 12) + pad('dose', 11) + pad('limites', 10) + pad('0,90', 10) + pad('0,95', 10) + pad('0,99', 10));
      p.ld.forEach(function (Ld) {
        L.push(padE(ldLabel(Ld.level), 12) + pad(fmtDose(Ld.dose), 11) + pad('inferior', 10) + [0.9, 0.95, 0.99].map(function (l) { return pad(fmtDose(Ld.limits[l].lower), 10); }).join(''));
        L.push(padE('', 23) + pad('superior', 10) + [0.9, 0.95, 0.99].map(function (l) { return pad(fmtDose(Ld.limits[l].upper), 10); }).join(''));
      });
      L.push(linha);
    });
    if (R.tests) {
      var T = R.tests;
      L.push('HIPÓTESE DE IGUALDADE (inclinações e interceptos iguais): ' + (T.equal.rejected ? 'REJEITADA (P<0,05)' : 'NÃO REJEITADA (P>0,05)'),
        '   (qui-quadrado: ' + fmt(T.equal.lr, 2) + ', graus de liberdade: ' + T.equal.df + ', probabilidade: ' + fmt(T.equal.p) + ')', '',
        'HIPÓTESE DE PARALELISMO (inclinações iguais): ' + (T.parallel.rejected ? 'REJEITADA (P<0,05)' : 'NÃO REJEITADA (P>0,05)'),
        '   (qui-quadrado: ' + fmt(T.parallel.lr, 2) + ', graus de liberdade: ' + T.parallel.df + ', probabilidade: ' + fmt(T.parallel.p) + ')', linha);
    }
    if (R.ratios && R.ratios.length && R.ratios[0].rows.length) {
      R.ratios.forEach(function (Lv) {
        L.push('Razões de dose letal (' + ldLabel(Lv.level) + ') — referência: ' + Lv.ref + ' — limites a ±' + num(o.ratioZ) + ' EP', padE('', 14) + pad('razão', 9) + pad('limites', 10) + pad('0,95', 10));
        Lv.rows.forEach(function (r) { L.push(padE(r.name.slice(0, 13), 14) + pad(fmt(r.ratio), 9) + pad('inferior', 10) + pad(fmt(r.lower), 10)); L.push(padE('', 23) + pad('superior', 10) + pad(fmt(r.upper), 10)); });
        L.push('');
      });
    }
    if (R.failed.length) { L.push('Preparações não analisadas:'); R.failed.forEach(function (f) { L.push('  ' + f.error); }); }
    return L.join('\n');
  }

  /* ---------- validação contra o livro ---------- */
  function pintarValidacao() {
    var v = E.validate(), h = '';
    h += '<div class="vsum"><span class="badge ' + (v.passed ? 'ok' : 'bad') + '">' + (v.passed ? 'Aprovado' : 'Reprovado') + '</span><span class="mono">' + v.checks.length + ' verificações · ' + v.nIdentical + ' idênticas · ' + (v.checks.length - v.nIdentical) + ' dentro da tolerância</span></div>';
    h += '<div class="note"><p>Este autoteste roda o motor, neste aparelho, sobre os dados do capítulo 4 de Robertson, Russell, Preisler &amp; Savin, <i>Bioassays with Arthropods</i>, 2ª ed. (2007), e compara cada número com a saída do PoloPlus 1.0 impressa nas figuras 4.7 e 4.8: parâmetros, matriz de covariância, qui-quadrado, doses letais com limites de 90% e 95%, testes de igualdade e paralelismo e razões de dose letal.</p>' +
      '<p>Critério: o valor calculado, arredondado como no livro, é igual ao impresso. Admite-se diferença de uma unidade no último dígito, compatível com a precisão simples do PoloPlus.</p></div>';
    h += '<div class="tbl"><table><thead><tr><th>Item</th><th>Calculado</th><th>PoloPlus</th><th>Resultado</th></tr></thead><tbody>';
    v.checks.forEach(function (c) {
      var peq = function (x) { return Math.abs(x) < 0.01 && x !== 0; };
      var got = c.ref == null ? (c.got == null ? 'omitido' : fmtSig(c.got)) : (peq(c.ref) ? c.got.toExponential(5).replace('.', ',') : c.got.toFixed(c.dec === 0 && Number.isInteger(c.got) ? 0 : c.dec + 3).replace('.', ','));
      var ref = c.ref == null ? 'omitido' : (peq(c.ref) ? c.ref.toExponential(5).replace('.', ',') : c.ref.toFixed(c.dec).replace('.', ','));
      h += '<tr' + (c.status !== 'idêntico' ? ' class="flag"' : '') + '><td class="txt">' + esc(c.what) + '</td><td>' + got + '</td><td>' + ref + '</td><td class="txt"><span class="chip ' + (c.pass ? (c.status === 'idêntico' ? 'ok' : 'warn') : 'bad') + '">' + c.status + '</span></td></tr>';
    });
    $('v-val').innerHTML = h + '</tbody></table></div>';
  }

  /* ---------- eventos ---------- */
  var abas = ['res', 'plot', 'out', 'val'];
  function mostrar(t) {
    abas.forEach(function (k) { $('t-' + k).setAttribute('aria-selected', String(k === t)); $('v-' + k).hidden = k !== t; });
    if (t === 'val' && !$('v-val').innerHTML) pintarValidacao();
  }
  abas.forEach(function (k) { $('t-' + k).addEventListener('click', function () { mostrar(k); }); });
  var adiar = function () { clearTimeout(timer); timer = setTimeout(calcular, 350); };
  $('data').addEventListener('input', adiar); $('lds').addEventListener('input', adiar);
  ['natural', 'logdose', 'p9', 'het', 'ratioz', 'ref'].forEach(function (id) { $(id).addEventListener('change', calcular); });
  $('m-probit').addEventListener('click', function () { setModel('probit'); calcular(); });
  $('m-logit').addEventListener('click', function () { setModel('logit'); calcular(); });
  $('sample').addEventListener('click', function () { $('data').value = SAMPLE; $('ref').value = '0'; calcular(); });
  $('file').addEventListener('change', function (e) {
    var f = e.target.files[0]; if (!f) return;
    var rd = new FileReader(); rd.onload = function () { $('data').value = rd.result; $('ref').value = '0'; calcular(); }; rd.readAsText(f);
  });
  $('copy').addEventListener('click', function () {
    var st = $('copy-status');
    var selecionar = function () { var r = document.createRange(); r.selectNodeContents($('report')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); st.textContent = 'Texto selecionado: copie pelo menu do aparelho.'; };
    try { navigator.clipboard.writeText($('report').textContent).then(function () { st.textContent = 'Copiado.'; }, selecionar); } catch (e) { selecionar(); }
  });
  $('baixar').addEventListener('click', function () {
    var b = new Blob([$('report').textContent], { type: 'text/plain;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'probit-' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    $('copy-status').textContent = 'Arquivo baixado.';
  });

  if (!carregar()) $('data').value = SAMPLE;
  calcular();
})();
