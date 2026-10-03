/* croqui-livre.js — parcelas marcadas uma a uma no mapa, SALVAS no croqui.
 *
 * Para o que a grade não descreve: pomar com árvores espalhadas, 3 árvores
 * por tratamento, parcela fora do alinhamento. No painel "Posicionar croqui"
 * entra a escolha Grade | Parcelas livres. Em livres, cada toque no mapa
 * marca a parcela da vez, na ORDEM DO SORTEIO (a mesma fila da grade):
 *   Plantas    — cada toque é uma planta (copa de raio r); com "plantas por
 *                parcela" = 3, três toques fecham a parcela e passam à próxima;
 *   Retângulo  — cada toque é uma parcela C × L, no giro do croqui.
 *
 * O que fica salvo é st.croqui.livre, em METROS LOCAIS a partir da âncora do
 * croqui: arrastar ou girar o croqui leva as parcelas junto. Desenho no mapa,
 * "Onde estou", consulta das parcelas e a camada "Notas" leem tudo pelo
 * CroquiCore — o mesmo motor da grade, sem regra paralela.
 *
 * Módulo separado: envolve abrirCroquiEditor/fecharCroquiEditor do app.js.
 */
(function (w) {
  'use strict';
  var d = w.document, ED = null;

  function num(v, p) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : p; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ------------------------------------------------- lógica pura (testável) --- */
  /* A fila de parcelas na ordem do sorteio, sem depender do tamanho de parcela. */
  function filaDoEstudo(st) {
    var C = w.CroquiCore, ordem = null;
    try { st = w.normalizeStudy ? w.normalizeStudy(JSON.parse(JSON.stringify(st))) : st; } catch (e) {}
    try { if (st.randomizado && w.ensureStudyRandomizacao) ordem = w.ensureStudyRandomizacao(st).ordem; } catch (e) { ordem = null; }
    var g = C.grade({ tratamentos: (st.tratamentos || []).length, repeticoes: st.numRepeticoes, comprimento: 1, largura: 1, colunas: 1, ordem: ordem });
    return g.parcelas.slice().sort(function (a, b) { return a.ordem - b.ordem; }).map(function (p) {
      var t = (st.tratamentos || [])[p.tratNum - 1];
      return { ordem: p.ordem, tratId: p.tratId || (t && t.id) || ('T' + p.tratNum), rep: p.rep, repLabel: p.repLabel, nome: C.nomeDaParcela(p) };
    });
  }
  /* Acrescenta um toque (em metros locais) ao estado livre. */
  function adicionar(livre, cfg, x, y, total) {
    livre.itens = livre.itens || [];
    var atual = cfg.atual || 1;
    if (atual > total) return { atual: atual, cheio: true };
    var it = livre.itens.filter(function (i) { return i.ordem === atual; })[0];
    if (cfg.tipo === 'ret') {
      var wv = Math.max(0.2, num(cfg.largura, 3)), hv = Math.max(0.2, num(cfg.comprimento, 5));
      if (it) livre.itens.splice(livre.itens.indexOf(it), 1);
      livre.itens.push({ ordem: atual, x: x - wv / 2, y: y - hv / 2, w: wv, h: hv });
      return { atual: atual + 1 };
    }
    if (!it || !it.partes) { if (it) livre.itens.splice(livre.itens.indexOf(it), 1); it = { ordem: atual, partes: [] }; livre.itens.push(it); }
    it.partes.push({ x: x, y: y, r: Math.max(0.2, num(cfg.raio, 1.5)) });
    var porParc = Math.max(1, Math.round(num(cfg.porParcela, 1)));
    return { atual: it.partes.length >= porParc ? atual + 1 : atual };
  }
  function desfazer(livre, cfg) {
    var itens = livre.itens || [], atual = cfg.atual || 1;
    var it = itens.filter(function (i) { return i.ordem === atual; })[0] || itens.filter(function (i) { return i.ordem === atual - 1; })[0];
    if (!it) return atual;
    if (it.partes && it.partes.length > 1) { it.partes.pop(); return it.ordem; }
    itens.splice(itens.indexOf(it), 1);
    return it.ordem;
  }
  function plantasNa(livre, ordem) {
    var it = (livre.itens || []).filter(function (i) { return i.ordem === ordem; })[0];
    return it ? (it.partes ? it.partes.length : 1) : 0;
  }

  /* -------------------------------------------------------------- painel --- */
  function estilo() {
    if (d.getElementById('croquiLivreCss')) return;
    var s = d.createElement('style'); s.id = 'croquiLivreCss';
    s.textContent = '.livre-seg{display:flex;gap:6px;margin-bottom:9px}.livre-seg button{flex:1;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:7px 4px;font:700 11px system-ui,sans-serif;cursor:pointer}.livre-seg button.on{background:#37d684;border-color:#37d684;color:#08130c}' +
      '.livre-so{display:none}.croqui-modo-livre .livre-so{display:block}.croqui-modo-livre .livre-seg.livre-so,.croqui-modo-livre .livre-acts.livre-so{display:flex}.croqui-modo-livre .croqui-nums.livre-so{display:grid}' +
      '.croqui-modo-livre .croqui-ajustes>.croqui-seg,.croqui-modo-livre .croqui-ajustes>.croqui-nums{display:none}' +
      '.livre-prox{font-size:12px;line-height:1.45;background:#0c1210;border:1px solid #6b5a2f;color:#ffd24a;border-radius:10px;padding:8px;margin-bottom:9px}.livre-prox b{font-size:15px;color:#fff}' +
      '.livre-acts{display:flex;gap:6px;margin-bottom:9px}.livre-acts button{flex:1;border-radius:9px;padding:8px 4px;font:700 11px system-ui,sans-serif;border:1px solid #2c3a32;background:#0c1210;color:#b9c6bd;cursor:pointer}';
    d.head.appendChild(s);
  }
  function instalarNoPainel() {
    var painel = d.getElementById('croquiPanel'), E = w._croquiEdit;
    if (!painel || !E || painel.querySelector('[data-livre]')) return;
    var st = w._estudoDe(E.qid, E.sid); if (!st) return;
    estilo();
    var fila = filaDoEstudo(st), dim = null;
    try { dim = w._parseParcelaDim((st.protocolo || {}).tamanhoParcela); } catch (e) {}
    var livre = E.pos.livre || null;
    ED = { fila: fila, guardado: livre ? JSON.parse(JSON.stringify(livre)) : { tipo: 'ponto', itens: [] },
      cfg: { tipo: (livre && livre.tipo) || 'ponto', porParcela: 1, raio: 1.5, comprimento: dim ? dim.comprimento : 5, largura: dim ? dim.largura : 3, atual: 1 } };
    /* começa na primeira parcela ainda sem lugar */
    ED.cfg.atual = proximaVazia(ED.guardado, 1);
    var bloco = d.createElement('div');
    bloco.setAttribute('data-livre', '1');
    function campo(k, rot, passo) { return '<div><label>' + rot + '</label><input type="number" inputmode="decimal" min="0" step="' + passo + '" data-livre-cfg="' + k + '" value="' + esc(ED.cfg[k]) + '"></div>'; }
    bloco.innerHTML = '<div class="livre-seg"><button type="button" data-livre-modo="grade">Grade</button><button type="button" data-livre-modo="livre">Parcelas livres</button></div>' +
      '<div class="livre-seg livre-so"><button type="button" data-livre-tipo="ponto">Plantas (toque = 1 planta)</button><button type="button" data-livre-tipo="ret">Retângulo C × L</button></div>' +
      '<div class="croqui-nums livre-so">' + campo('porParcela', 'Plantas por parcela', 1) + campo('raio', 'Raio da copa (m)', 0.5) +
      campo('comprimento', 'Comprimento (m)', 0.5) + campo('largura', 'Largura (m)', 0.5) + '</div>' +
      '<div class="livre-prox livre-so"></div>' +
      '<div class="livre-acts livre-so"><button type="button" data-livre-acao="voltar">◀ Parcela</button><button type="button" data-livre-acao="desfazer">Desfazer</button><button type="button" data-livre-acao="pular">Parcela ▶</button></div>' +
      '<div class="livre-acts livre-so"><button type="button" data-livre-acao="limpar" style="color:#f0a3a3;border-color:#5a2f2f">Apagar parcelas livres</button></div>';
    var aj = painel.querySelector('#croquiAjustes') || painel;
    aj.insertBefore(bloco, aj.firstChild);
    bloco.addEventListener('click', function (ev) {
      var m = ev.target.closest('[data-livre-modo]'), t = ev.target.closest('[data-livre-tipo]'), a = ev.target.closest('[data-livre-acao]');
      if (m) modo(m.getAttribute('data-livre-modo'));
      else if (t) { ED.cfg.tipo = t.getAttribute('data-livre-tipo'); ED.guardado.tipo = ED.cfg.tipo; aplicar(); }
      else if (a) acao(a.getAttribute('data-livre-acao'));
    });
    bloco.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-livre-cfg'); if (!k) return;
      ED.cfg[k] = ev.target.value; pintar();
    });
    w._map.on('click', aoTocar);
    ED.ligado = true;
    modo(livre ? 'livre' : 'grade');
  }
  function proximaVazia(livre, de) {
    var tem = {}; (livre.itens || []).forEach(function (i) { tem[i.ordem] = 1; });
    for (var k = de; k <= ED.fila.length; k++) if (!tem[k]) return k;
    return ED.fila.length + 1;
  }
  /* Enquanto se marca parcela, o toque é do desenho: quadras e croquis de
     outros estudos param de abrir o menu deles (app.js lê esta marca). */
  function desenhoLivre(on) {
    if (!!w._agDesenhoLivre === !!on) return;
    w._agDesenhoLivre = !!on;
    try { if (typeof w.render === 'function') w.render(); } catch (e) {}
    try { if (typeof w.renderCroquis === 'function') w.renderCroquis(); } catch (e) {}
  }
  function modo(m) {
    var painel = d.getElementById('croquiPanel'), E = w._croquiEdit; if (!painel || !E || !ED) return;
    ED.modo = m;
    desenhoLivre(m === 'livre');
    painel.classList.toggle('croqui-modo-livre', m === 'livre');
    painel.querySelectorAll('[data-livre-modo]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-livre-modo') === m); });
    /* Voltar para a grade não apaga o que foi marcado: fica guardado e volta
       se a pessoa mudar de ideia antes de salvar. Salvo em grade, sai. */
    E.pos.livre = m === 'livre' ? ED.guardado : null;
    aplicar();
  }
  function aplicar() {
    var E = w._croquiEdit; if (!E || !ED) return;
    if (ED.modo === 'livre') E.pos.livre = ED.guardado;
    try { w.croquiEditRedraw(); } catch (e) {}
    pintar();
  }
  function pintar() {
    var painel = d.getElementById('croquiPanel'); if (!painel || !ED) return;
    painel.querySelectorAll('[data-livre-tipo]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-livre-tipo') === ED.cfg.tipo); });
    var ponto = ED.cfg.tipo !== 'ret';
    ['porParcela', 'raio'].forEach(function (k) { var i = painel.querySelector('[data-livre-cfg="' + k + '"]'); if (i) i.parentNode.style.display = ponto ? '' : 'none'; });
    ['comprimento', 'largura'].forEach(function (k) { var i = painel.querySelector('[data-livre-cfg="' + k + '"]'); if (i) i.parentNode.style.display = ponto ? 'none' : ''; });
    var box = painel.querySelector('.livre-prox'), at = ED.cfg.atual, tot = ED.fila.length, p = ED.fila[at - 1];
    var feitas = (ED.guardado.itens || []).length;
    if (!p) box.innerHTML = '✓ Todas as ' + tot + ' parcelas têm lugar (' + feitas + '). Salve, ou volte para corrigir.';
    else {
      var porParc = Math.max(1, Math.round(num(ED.cfg.porParcela, 1))), ja = plantasNa(ED.guardado, at);
      box.innerHTML = 'Toque no mapa: <b>' + esc(p.nome) + '</b><br>parcela ' + at + ' de ' + tot +
        (ponto ? ' · planta ' + Math.min(ja + 1, porParc) + ' de ' + porParc : ' · ' + esc(ED.cfg.largura) + ' × ' + esc(ED.cfg.comprimento) + ' m') +
        ' · ' + feitas + ' com lugar';
    }
  }
  function aoTocar(ev) {
    var E = w._croquiEdit; if (!E || !ED || ED.modo !== 'livre') return;
    var loc = w.CroquiCore.metrosLocais(ev.latlng.lat, ev.latlng.lng, E.pos);
    var r = adicionar(ED.guardado, ED.cfg, loc.x, loc.y, ED.fila.length);
    if (r.cheio) return pintar();
    ED.cfg.atual = r.atual > ED.cfg.atual ? proximaVazia(ED.guardado, r.atual) : r.atual;
    aplicar();
  }
  function acao(a) {
    if (a === 'desfazer') ED.cfg.atual = desfazer(ED.guardado, ED.cfg);
    else if (a === 'voltar') ED.cfg.atual = Math.max(1, ED.cfg.atual - 1);
    else if (a === 'pular') ED.cfg.atual = Math.min(ED.fila.length + 1, ED.cfg.atual + 1);
    else if (a === 'limpar') {
      if (!w.confirm('Apagar todas as parcelas livres marcadas?')) return;
      ED.guardado.itens = []; ED.cfg.atual = 1;
    }
    aplicar();
  }
  function soltar() { try { if (w._map) w._map.off('click', aoTocar); } catch (e) {} if (ED) desenhoLivre(false); ED = null; }

  /* Atalho (menu de Medição): abre o Posicionar croqui do estudo já em
     "Parcelas livres". */
  function abrirLivre(qid, sid) {
    if (typeof w.abrirCroquiEditor !== 'function') return false;
    w.abrirCroquiEditor(qid, sid);
    if (ED && d.getElementById('croquiPanel')) modo('livre');
    return !!ED;
  }
  function instalar() {
    var abrir = w.abrirCroquiEditor, fechar = w.fecharCroquiEditor;
    if (typeof abrir === 'function' && !abrir.__livre) {
      var a2 = function () { soltar(); var r = abrir.apply(this, arguments); try { instalarNoPainel(); } catch (e) { try { console.warn('[croqui-livre]', e); } catch (x) {} } return r; };
      a2.__livre = true; w.abrirCroquiEditor = a2;
    }
    if (typeof fechar === 'function' && !fechar.__livre) {
      var f2 = function () { soltar(); return fechar.apply(this, arguments); };
      f2.__livre = true; w.fecharCroquiEditor = f2;
    }
  }

  w.AgCroquiLivre = { desenhoLivre: desenhoLivre, abrirLivre: abrirLivre, filaDoEstudo: filaDoEstudo, adicionar: adicionar, desfazer: desfazer, plantasNa: plantasNa, instalar: instalar };
  instalar();
})(typeof window !== 'undefined' ? window : this);
