/* mapa-medir.js — "Medir" no mapa: uma grade PROVISÓRIA para planejar.
 *
 * Pergunta que ela responde: "cabem 5 estudos de 30 × 12 m nesta quadra?",
 * antes de existir protocolo. Comprimento, largura, quantos, quantos lado a
 * lado e o espaço entre eles; os retângulos aparecem no mapa, arrastam e
 * giram como o croqui, e o painel diz se ficam dentro de uma quadra.
 *
 * NADA É GRAVADO: nem no estudo, nem na quadra, nem na nuvem. Ao limpar, some.
 * Só as medidas digitadas ficam lembradas neste aparelho, por conveniência.
 *
 * Módulo separado, sem mexer no app.js: o botão entra no mesmo grupo de
 * "Croqui" e "Onde estou", envolvendo addCroquiControl.
 */
(function (w) {
  'use strict';
  var d = w.document, CHAVE = 'agracta-medir-ultimo';
  var M = null;

  function num(v, padrao) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : padrao; }
  function fmt(v, casas) {
    var c = casas == null ? 1 : casas, n = Math.round((+v || 0) * Math.pow(10, c)) / Math.pow(10, c);
    return n.toLocaleString('pt-BR', { maximumFractionDigits: c });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------------------------------------------------- geometria (pura) ---
     Medidas em metros, origem no CENTRO do conjunto, +y = comprimento.
     Mesma convenção e mesma projeção do croqui (CroquiCore.pontoLatLng). */
  function medidas(cfg) {
    var comp = Math.max(0, num(cfg.comprimento, 0)), larg = Math.max(0, num(cfg.largura, 0));
    var qtd = Math.max(1, Math.min(200, Math.round(num(cfg.quantidade, 1))));
    var cols = Math.max(1, Math.min(qtd, Math.round(num(cfg.colunas, qtd)) || qtd));
    var esp = Math.max(0, num(cfg.espaco, 0));
    var lin = Math.ceil(qtd / cols);
    return { comp: comp, larg: larg, qtd: qtd, cols: cols, lin: lin, esp: esp,
      W: cols * larg + (cols - 1) * esp, L: lin * comp + (lin - 1) * esp };
  }
  function retangulos(cfg) {
    var m = medidas(cfg), out = [];
    if (!(m.comp > 0 && m.larg > 0)) return { m: m, rets: out };
    for (var i = 0; i < m.qtd; i++) {
      var c = i % m.cols, r = Math.floor(i / m.cols);
      var x = -m.W / 2 + c * (m.larg + m.esp), y = -m.L / 2 + r * (m.comp + m.esp);
      out.push({ n: i + 1, x: x, y: y, w: m.larg, h: m.comp });
    }
    return { m: m, rets: out };
  }
  function cantos(ret, anc) {
    var P = w.CroquiCore.pontoLatLng;
    return [P(ret.x, ret.y, anc), P(ret.x + ret.w, ret.y, anc), P(ret.x + ret.w, ret.y + ret.h, anc), P(ret.x, ret.y + ret.h, anc)];
  }
  /* ponto [lat,lng] dentro do polígono [[lat,lng],...] (raio) */
  function dentro(pt, poli) {
    var x = pt[1], y = pt[0], ok = false;
    for (var i = 0, j = poli.length - 1; i < poli.length; j = i++) {
      var xi = poli[i][1], yi = poli[i][0], xj = poli[j][1], yj = poli[j][0];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi)) ok = !ok;
    }
    return ok;
  }
  /* Veredito contra as quadras desenhadas: a quadra que contém o centro, e
     quantos retângulos ficam INTEIROS dentro dela. */
  function veredito(rets, anc, quadras) {
    var centro = [anc.lat, anc.lng], achou = null;
    Object.keys(quadras || {}).some(function (id) {
      var p = quadras[id];
      if (p && p.length >= 3 && dentro(centro, p)) { achou = id; return true; }
      return false;
    });
    if (!achou) return { quadra: null, cabem: 0, total: rets.length };
    var poli = quadras[achou], cabem = 0;
    rets.forEach(function (r) { if (cantos(r, anc).every(function (c) { return dentro(c, poli); })) cabem++; });
    return { quadra: achou, cabem: cabem, total: rets.length };
  }

  /* Item marcado com toque: um ponto (árvore, copa de raio r) ou um retângulo
     C × L centrado no toque, no giro atual. */
  function formaLivre(it) {
    if (it.tipo === 'ponto') return { tipo: 'ponto', centro: [it.lat, it.lng], raio: Math.max(0.2, num(it.raio, 1.5)) };
    var anc = { lat: it.lat, lng: it.lng, ang: it.ang || 0 }, wv = num(it.largura, 0), hv = num(it.comprimento, 0);
    return { tipo: 'ret', cantos: cantos({ x: -wv / 2, y: -hv / 2, w: wv, h: hv }, anc) };
  }
  function livresNaQuadra(itens, quadras) {
    var porQ = {};
    itens.forEach(function (it) {
      var f = formaLivre(it), pts = f.tipo === 'ponto' ? [f.centro] : f.cantos;
      Object.keys(quadras || {}).some(function (id) {
        var p = quadras[id]; if (!p || p.length < 3 || !dentro([it.lat, it.lng], p)) return false;
        var o = porQ[id] = porQ[id] || { dentro: 0, total: 0 }; o.total++;
        if (pts.every(function (c) { return dentro(c, p); })) o.dentro++;
        return true;
      });
    });
    return porQ;
  }

  /* ----------------------------------------------------------- desenho --- */
  function LF() { return w.LF || w.L; }
  function lembrado() { try { return JSON.parse(w.localStorage.getItem(CHAVE)) || null; } catch (e) { return null; } }
  function lembrar(cfg) { try { w.localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) {} }

  function desenharLivre() {
    var L = LF(), itens = M.livre.itens;
    itens.forEach(function (it, i) {
      var f = formaLivre(it);
      if (f.tipo === 'ponto') L.circle(f.centro, { radius: f.raio, color: '#ffd24a', weight: 2, fillColor: '#ffd24a', fillOpacity: 0.28, interactive: false }).addTo(M.camada);
      else L.polygon(f.cantos, { color: '#ffd24a', weight: 2, dashArray: '6 5', fillColor: '#ffd24a', fillOpacity: 0.16, interactive: false }).addTo(M.camada);
      L.marker([it.lat, it.lng], { interactive: false, icon: L.divIcon({ className: 'medir-n', html: '<span>' + (i + 1) + '</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(M.camada);
    });
    var info = M.painel.querySelector('.croqui-info'), q = {};
    try { if (typeof w.ensureQGEO === 'function') w.ensureQGEO(); q = w.QGEO || {}; } catch (e) {}
    var porQ = livresNaQuadra(itens, q), txt;
    if (!itens.length) txt = 'Toque no mapa para marcar ' + (M.livre.tipo === 'ponto' ? 'cada árvore/planta.' : 'cada parcela (' + fmt(num(M.cfg.largura, 0)) + ' × ' + fmt(num(M.cfg.comprimento, 0)) + ' m, no giro atual).');
    else {
      txt = '<b>' + itens.length + ' marcado(s)</b>';
      Object.keys(porQ).forEach(function (id) {
        var o = porQ[id], nome = typeof w.quadraNome === 'function' ? w.quadraNome(id) : id;
        txt += '<br>Quadra ' + esc(nome) + ': ' + o.dentro + ' de ' + o.total + ' inteiros dentro';
      });
    }
    info.className = 'croqui-info'; info.innerHTML = txt;
  }
  function desenhoLivre(on) {
    if (!!w._agDesenhoLivre === !!on) return;
    w._agDesenhoLivre = !!on;
    try { if (typeof w.render === 'function') w.render(); } catch (e) {}
    try { if (typeof w.renderCroquis === 'function') w.renderCroquis(); } catch (e) {}
  }
  function desenhar() {
    if (!M) return;
    desenhoLivre(M.modo === 'livre');
    var L = LF(), r = retangulos(M.cfg), anc = { lat: M.lat, lng: M.lng, ang: M.ang };
    M.camada.clearLayers();
    M.painel.classList.toggle('medir-livre', M.modo === 'livre');
    [M.mover, M.giro].forEach(function (h) { if (h && h.setOpacity) h.setOpacity(M.modo === 'livre' ? 0 : 1); });
    if (M.modo === 'livre') return desenharLivre();
    r.rets.forEach(function (ret) {
      var cs = cantos(ret, anc);
      L.polygon(cs, { color: '#ffd24a', weight: 2, dashArray: '6 5', fillColor: '#ffd24a', fillOpacity: 0.16, interactive: false }).addTo(M.camada);
      var c = w.CroquiCore.pontoLatLng(ret.x + ret.w / 2, ret.y + ret.h / 2, anc);
      if (r.rets.length > 1) L.marker(c, { interactive: false, icon: L.divIcon({ className: 'medir-n', html: '<span>' + ret.n + '</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(M.camada);
    });
    var m = r.m;
    if (M.giro) M.giro.setLatLng(w.CroquiCore.pontoLatLng(0, m.L / 2 + Math.max(6, m.L * 0.18), anc));
    if (M.mover) M.mover.setLatLng([M.lat, M.lng]);
    var info = M.painel.querySelector('.croqui-info');
    if (!r.rets.length) { info.className = 'croqui-info falta'; info.innerHTML = 'Informe comprimento e largura.'; return; }
    var q = {};
    try { if (typeof w.ensureQGEO === 'function') w.ensureQGEO(); q = w.QGEO || {}; } catch (e) {}
    var v = veredito(r.rets, anc, q);
    var nome = v.quadra ? (typeof w.quadraNome === 'function' ? w.quadraNome(v.quadra) : v.quadra) : '';
    var txt = '<b>' + m.qtd + ' × ' + fmt(m.larg) + ' × ' + fmt(m.comp) + ' m</b> · ' + m.cols + ' lado a lado, ' + m.lin + ' fileira(s)<br>' +
      'Ocupa <b>' + fmt(m.W) + ' × ' + fmt(m.L) + ' m</b> · ' + fmt(m.W * m.L / 10000, 3) + ' ha';
    var cls = 'croqui-info';
    if (!v.quadra) txt += '<br>Arraste o ✛ para dentro de uma quadra desenhada para conferir se cabe.';
    else if (v.cabem === v.total) txt += '<br><span style="color:#8fe3b0">✓ Cabe inteiro na quadra ' + esc(nome) + '.</span>';
    else { cls += ' falta'; txt += '<br>✗ Na quadra ' + esc(nome) + ' cabem inteiros <b>' + v.cabem + ' de ' + v.total + '</b>. Gire, mude a disposição ou o espaço.'; }
    info.className = cls; info.innerHTML = txt;
  }

  function abrir() {
    var L = LF(), mapa = w._map;
    if (!mapa || !L || !w.CroquiCore) return;
    if (M) { fechar(); return; }
    try { if (typeof w.croquiCss === 'function') w.croquiCss(); if (typeof w.haCss === 'function') w.haCss(); } catch (e) {}
    estilo();
    var c = mapa.getCenter(), ang = 0;
    /* nasce alinhado com a quadra debaixo do centro, como o croqui */
    try {
      if (typeof w.ensureQGEO === 'function') w.ensureQGEO();
      var q = w.QGEO || {};
      Object.keys(q).some(function (id) { if (q[id] && q[id].length >= 3 && dentro([c.lat, c.lng], q[id])) { ang = w.quadraEixo(id) || 0; return true; } return false; });
    } catch (e) {}
    var cfg = lembrado() || { comprimento: 30, largura: 12, quantidade: 5, colunas: 5, espaco: 2 };
    M = { lat: c.lat, lng: c.lng, ang: ang, cfg: cfg, camada: L.layerGroup().addTo(mapa), modo: 'grade',
          livre: { tipo: 'ponto', itens: [] } };
    if (cfg.raio == null) cfg.raio = 1.5;
    M.toque = function (ev) {
      if (!M || M.modo !== 'livre') return;
      M.livre.itens.push({ tipo: M.livre.tipo, lat: ev.latlng.lat, lng: ev.latlng.lng, ang: M.ang,
        raio: M.cfg.raio, comprimento: M.cfg.comprimento, largura: M.cfg.largura });
      desenhar();
    };
    mapa.on('click', M.toque);
    M.mover = L.marker([c.lat, c.lng], { draggable: true, zIndexOffset: 1200,
      icon: L.divIcon({ className: 'gr-handle', html: '<div class="gr-h gr-move">&#10010;</div>', iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(mapa);
    M.mover.on('drag', function () { var p = M.mover.getLatLng(); M.lat = p.lat; M.lng = p.lng; desenhar(); });
    M.giro = L.marker([c.lat, c.lng], { draggable: true, zIndexOffset: 1200,
      icon: L.divIcon({ className: 'gr-handle', html: '<div class="gr-h gr-rot">&#8635;</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(mapa);
    M.giro.on('drag', function () { var p = M.giro.getLatLng(); M.ang = w.CroquiCore.anguloPara(p.lat, p.lng, { lat: M.lat, lng: M.lng, ang: M.ang }); desenhar(); });

    var p = d.createElement('div');
    p.id = 'medirPanel'; p.className = 'croqui-panel';
    function campo(k, rot, passo) { return '<div><label>' + rot + '</label><input type="number" inputmode="decimal" min="0" step="' + passo + '" data-medir="' + k + '" value="' + esc(cfg[k]) + '"></div>'; }
    p.innerHTML = '<div class="croqui-head"><div class="croqui-title">Medir área</div><button type="button" class="croqui-toggle" data-medir-acao="recolher">Recolher</button><button class="croqui-x" data-medir-acao="fechar" aria-label="Fechar">×</button></div>' +
      '<div class="croqui-sub">Só para planejar: <b>nada é salvo</b>.</div>' +
      '<div class="croqui-seg"><button type="button" data-medir-modo="grade" class="on">Grade</button><button type="button" data-medir-modo="livre">Tocar no mapa</button></div>' +
      '<div class="croqui-seg medir-so-livre"><button type="button" data-medir-tipo="ponto" class="on">Ponto (árvore)</button><button type="button" data-medir-tipo="ret">Retângulo C × L</button></div>' +
      '<div class="croqui-nums medir-campos">' + campo('comprimento', 'Comprimento (m)', 0.5) + campo('largura', 'Largura (m)', 0.5) +
      campo('quantidade', 'Quantos', 1) + campo('colunas', 'Lado a lado', 1) + campo('espaco', 'Espaço entre (m)', 0.5) +
      '<div class="medir-so-livre">' + campo('raio', 'Raio da copa (m)', 0.5) + '</div>' +
      '<div class="medir-so-grade"><label>&nbsp;</label><div class="croqui-mini">grade: ✛ mover · ↻ girar</div></div></div>' +
      '<div class="croqui-info"></div>' +
      '<div class="croqui-acts"><button class="medir-so-livre" data-medir-acao="desfazer">Desfazer</button><button class="danger" data-medir-acao="fechar">Limpar</button></div>';
    d.body.appendChild(p); M.painel = p;
    p.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-medir'); if (!k) return;
      M.cfg[k] = ev.target.value; lembrar(M.cfg); desenhar();
    });
    p.addEventListener('click', function (ev) {
      var md = ev.target.closest('[data-medir-modo]'), tp = ev.target.closest('[data-medir-tipo]');
      if (md) { M.modo = md.getAttribute('data-medir-modo'); p.querySelectorAll('[data-medir-modo]').forEach(function (x) { x.classList.toggle('on', x === md); }); desenhar(); return; }
      if (tp) { M.livre.tipo = tp.getAttribute('data-medir-tipo'); p.querySelectorAll('[data-medir-tipo]').forEach(function (x) { x.classList.toggle('on', x === tp); }); desenhar(); return; }
      var b = ev.target.closest('[data-medir-acao]'); if (!b) return;
      if (b.getAttribute('data-medir-acao') === 'desfazer') { M.livre.itens.pop(); desenhar(); return; }
      if (b.getAttribute('data-medir-acao') === 'recolher') {
        var rec = p.classList.toggle('medir-recolhido'); b.textContent = rec ? 'Medidas' : 'Recolher'; return;
      }
      fechar();
    });
    try { L.DomEvent.disableClickPropagation(p); L.DomEvent.disableScrollPropagation(p); } catch (e) {}
    var bt = d.getElementById('medirBtn'); if (bt) bt.classList.add('on');
    desenhar();
    /* no celular o painel cobre a metade de baixo: o desenho sobe para cima dele */
    try {
      var bb = L.latLngBounds([]); M.camada.eachLayer(function (l) { if (l.getBounds) bb.extend(l.getBounds()); });
      if (bb.isValid()) mapa.fitBounds(bb, { paddingTopLeft: [20, 60], paddingBottomRight: [20, (p.offsetHeight || 0) + 40], maxZoom: 19 });
    } catch (e) {}
  }
  function fechar() {
    if (!M) return;
    var mapa = w._map;
    try { M.camada.clearLayers(); mapa.removeLayer(M.camada); } catch (e) {}
    try { mapa.removeLayer(M.mover); mapa.removeLayer(M.giro); } catch (e) {}
    try { mapa.off('click', M.toque); } catch (e) {}
    if (M.painel && M.painel.parentNode) M.painel.parentNode.removeChild(M.painel);
    M = null;
    desenhoLivre(false);
    var bt = d.getElementById('medirBtn'); if (bt) bt.classList.remove('on');
  }
  function estilo() {
    if (d.getElementById('medirCss')) return;
    var s = d.createElement('style'); s.id = 'medirCss';
    s.textContent = '.medir-n span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(20,22,20,.8);color:#ffd24a;font:800 12px system-ui,sans-serif}' +
      '#medirPanel .croqui-nums input{min-height:38px}#medirPanel .croqui-toggle{margin-left:auto;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:6px 10px;font:700 11px system-ui,sans-serif}' +
      '#medirPanel.medir-recolhido .medir-campos,#medirPanel.medir-recolhido .croqui-sub,#medirPanel.medir-recolhido .croqui-seg{display:none}' +
      '#medirPanel .medir-so-livre{display:none}#medirPanel.medir-livre .medir-so-livre{display:block}#medirPanel.medir-livre .croqui-seg.medir-so-livre{display:flex}' +
      '#medirPanel.medir-livre .medir-so-grade,#medirPanel.medir-livre [data-medir="quantidade"],#medirPanel.medir-livre [data-medir="colunas"],#medirPanel.medir-livre [data-medir="espaco"]{display:none}' +
      '#medirPanel.medir-livre .croqui-nums>div:has([data-medir="quantidade"]),#medirPanel.medir-livre .croqui-nums>div:has([data-medir="colunas"]),#medirPanel.medir-livre .croqui-nums>div:has([data-medir="espaco"]){display:none}';
    d.head.appendChild(s);
  }

  /* --------------------------------------------- botão junto do Croqui --- */
  function injetar() {
    var ref = d.getElementById('croquiRefBtn');
    if (!ref || d.getElementById('medirBtn')) return !!ref;
    var b = d.createElement('button');
    b.id = 'medirBtn'; b.type = 'button'; b.textContent = 'Medir';
    b.title = 'Grade provisória para ver se os estudos cabem na quadra — nada é salvo';
    b.onclick = abrir;
    ref.parentNode.appendChild(b);
    return true;
  }
  /* O ATALHO MORA NA MEDIÇÃO do leque de ferramentas do mapa (pedido de quem
     usa): ali já se mede área e perímetro, e é ali que se procura "medir".
     Dois botões no painel dela: a grade provisória deste módulo e as parcelas
     livres de um estudo (croqui-livre.js). O botão solto que ficava junto do
     Croqui saiu — dois "Medir" em lugares diferentes confundiam. */
  function estudosParaLivre() {
    var out = [];
    try {
      var qs = typeof w.quadrasAtivas === 'function' ? w.quadrasAtivas() : Object.keys(w.data || {});
      qs.forEach(function (q) {
        ((w.data && w.data[q] && w.data[q].estudos) || []).forEach(function (st) {
          if (!st || !st.id || !(st.tratamentos || []).length) return;
          if (typeof w.estudoFinalizado === 'function' && w.estudoFinalizado(st)) return;
          out.push({ qid: q, sid: st.id, nome: (st.codigo || st.nome || st.id) + ' · ' + (typeof w.quadraNome === 'function' ? w.quadraNome(q) : q) });
        });
      });
    } catch (e) {}
    return out;
  }
  function atalhosNaMedicao() {
    var p = d.getElementById('measurePanel'); if (!p || p.querySelector('[data-medir-atalho]')) return;
    var est = estudosParaLivre();
    var box = d.createElement('div');
    box.setAttribute('data-medir-atalho', '1');
    box.style.cssText = 'margin-top:9px;padding-top:9px;border-top:1px solid var(--border,#26322b);display:grid;gap:7px';
    box.innerHTML = '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3,#7c8a80)">Planejar parcelas</div>' +
      '<div class="measure-actions" style="grid-template-columns:1fr 1fr"><button type="button" data-medir-atalho-acao="grade">Grade de estudos</button>' +
      '<button type="button" data-medir-atalho-acao="livre"' + (est.length ? '' : ' disabled title="Nenhum estudo com tratamentos neste local"') + '>Parcelas de um estudo</button></div>' +
      '<div data-medir-atalho-lista style="display:none;gap:6px"><select style="width:100%;background:var(--surface-2,#0c1210);border:1px solid var(--border,#26322b);color:var(--text,#e8efe9);border-radius:9px;padding:8px">' +
      est.map(function (x, i) { return '<option value="' + i + '">' + esc(x.nome) + '</option>'; }).join('') + '</select>' +
      '<div class="measure-actions" style="grid-template-columns:1fr"><button type="button" class="on" data-medir-atalho-acao="abrir">Marcar parcelas no mapa</button></div></div>';
    p.appendChild(box);
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-medir-atalho-acao]'); if (!b || b.disabled) return;
      ev.stopPropagation();
      var a = b.getAttribute('data-medir-atalho-acao');
      if (a === 'grade') { try { w.closeMeasure(); } catch (e) {} abrir(); }
      else if (a === 'livre') { var l = box.querySelector('[data-medir-atalho-lista]'); l.style.display = l.style.display === 'none' ? 'grid' : 'none'; }
      else if (a === 'abrir') {
        var x = est[+box.querySelector('select').value]; if (!x) return;
        try { w.closeMeasure(); } catch (e) {}
        if (w.AgCroquiLivre && w.AgCroquiLivre.abrirLivre) w.AgCroquiLivre.abrirLivre(x.qid, x.sid);
      }
    });
  }
  function instalar() {
    var orig = w.measureRenderPanel;
    if (typeof orig === 'function' && !orig.__medir) {
      var envolto = function () { var r = orig.apply(this, arguments); try { atalhosNaMedicao(); } catch (e) {} return r; };
      envolto.__medir = true; w.measureRenderPanel = envolto;
    }
  }

  w.AgMedir = { formaLivre: formaLivre, livresNaQuadra: livresNaQuadra, medidas: medidas, retangulos: retangulos, dentro: dentro, veredito: veredito, abrir: abrir, fechar: fechar, instalar: instalar, estudosParaLivre: estudosParaLivre, injetar: injetar };
  instalar();
})(typeof window !== 'undefined' ? window : this);
