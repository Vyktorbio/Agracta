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

  /* ----------------------------------------------------------- desenho --- */
  function LF() { return w.LF || w.L; }
  function lembrado() { try { return JSON.parse(w.localStorage.getItem(CHAVE)) || null; } catch (e) { return null; } }
  function lembrar(cfg) { try { w.localStorage.setItem(CHAVE, JSON.stringify(cfg)); } catch (e) {} }

  function desenhar() {
    if (!M) return;
    var L = LF(), r = retangulos(M.cfg), anc = { lat: M.lat, lng: M.lng, ang: M.ang };
    M.camada.clearLayers();
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
    M = { lat: c.lat, lng: c.lng, ang: ang, cfg: cfg, camada: L.layerGroup().addTo(mapa) };
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
      '<div class="croqui-sub">Só para planejar: <b>nada é salvo</b>. ✛ mover · ↻ girar</div>' +
      '<div class="croqui-nums medir-campos">' + campo('comprimento', 'Comprimento (m)', 0.5) + campo('largura', 'Largura (m)', 0.5) +
      campo('quantidade', 'Quantos', 1) + campo('colunas', 'Lado a lado', 1) + campo('espaco', 'Espaço entre (m)', 0.5) +
      '<div><label>&nbsp;</label><div class="croqui-mini">cada um = 1 estudo</div></div></div>' +
      '<div class="croqui-info"></div>' +
      '<div class="croqui-acts"><button class="danger" data-medir-acao="fechar">Limpar</button></div>';
    d.body.appendChild(p); M.painel = p;
    p.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-medir'); if (!k) return;
      M.cfg[k] = ev.target.value; lembrar(M.cfg); desenhar();
    });
    p.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-medir-acao]'); if (!b) return;
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
    if (M.painel && M.painel.parentNode) M.painel.parentNode.removeChild(M.painel);
    M = null;
    var bt = d.getElementById('medirBtn'); if (bt) bt.classList.remove('on');
  }
  function estilo() {
    if (d.getElementById('medirCss')) return;
    var s = d.createElement('style'); s.id = 'medirCss';
    s.textContent = '.medir-n span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(20,22,20,.8);color:#ffd24a;font:800 12px system-ui,sans-serif}' +
      '#medirPanel .croqui-nums input{min-height:38px}#medirPanel .croqui-toggle{margin-left:auto;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:6px 10px;font:700 11px system-ui,sans-serif}' +
      '#medirPanel.medir-recolhido .medir-campos,#medirPanel.medir-recolhido .croqui-sub{display:none}';
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
  function instalar() {
    var orig = w.addCroquiControl;
    if (typeof orig === 'function' && !orig.__medir) {
      var envolto = function () { var r = orig.apply(this, arguments); try { injetar(); } catch (e) {} return r; };
      envolto.__medir = true; w.addCroquiControl = envolto;
    }
    injetar();
  }

  w.AgMedir = { medidas: medidas, retangulos: retangulos, dentro: dentro, veredito: veredito, abrir: abrir, fechar: fechar, instalar: instalar };
  instalar();
})(typeof window !== 'undefined' ? window : this);
