/* mapa-medir.js — "Medir" no mapa: GRUPOS de parcelas PROVISÓRIOS para planejar.
 *
 * Pergunta que ela responde: "quantos estudos cabem nesta quadra?", antes de
 * existir protocolo. Um GRUPO é um conjunto de retângulos iguais —
 * comprimento, largura, quantos, quantos lado a lado e o espaço entre eles —,
 * com posição e giro próprios: o desenho de um estudo. Vários grupos ficam no
 * mapa ao mesmo tempo (pedido de quem usa: "adicionar mais grupos de parcelas
 * ao mesmo tempo para medir quantos estudos caberiam na quadra"). Cada um
 * arrasta e gira como o croqui, e o painel diz, grupo a grupo, se ele cabe
 * inteiro numa quadra e se encosta em outro grupo — e, por quadra, quantos
 * cabem.
 *
 * "+ Grupo" põe uma cópia do grupo escolhido na próxima vaga ao lado dele;
 * "Encher quadra" põe cópias em todas as vagas que cabem inteiras na quadra,
 * no mesmo giro, em fileiras a partir dele. É conta de régua, não arranjo
 * ótimo: girar ou mudar a disposição pode caber mais, e o painel diz isso.
 *
 * NADA É GRAVADO: nem no estudo, nem na quadra, nem na nuvem. Ao limpar, some.
 * Só as medidas digitadas ficam lembradas neste aparelho, por conveniência.
 *
 * Módulo separado, sem mexer no app.js: o atalho mora na Medição do leque de
 * ferramentas do mapa (ver atalhosNaMedicao, lá embaixo).
 */
(function (w) {
  'use strict';
  var d = w.document, CHAVE = 'agracta-medir-ultimo';
  var M = null;
  /* Uma cor por grupo: viva sobre a imagem de satélite e longe do vermelho,
     que aqui quer dizer "não cabe". */
  var CORES = ['#ffd24a', '#4ad8ff', '#ff7ad9', '#b6f35c', '#ff9f43', '#b69cff', '#5cf2c4', '#ffffff'];
  var RUIM = '#ff5a5a';
  /* Teto de grupos no mapa: o "Encher" numa quadra grande com grupo pequeno
     criaria centenas, e o mapa engasgaria redesenhando todos a cada arrasto. */
  var MAX_GRUPOS = 40;
  /* Encostar não é sobrepor: dois grupos lado a lado, com espaço zero entre
     eles, cabem. Um centímetro de folga contra o arredondamento da projeção. */
  var TOL = 0.01;

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
  /* A quadra desenhada que contém o ponto (a primeira), ou null. */
  function quadraDe(pt, quadras) {
    var achou = null;
    Object.keys(quadras || {}).some(function (id) {
      var p = quadras[id];
      if (p && p.length >= 3 && dentro(pt, p)) { achou = id; return true; }
      return false;
    });
    return achou;
  }
  /* Veredito de UM conjunto contra as quadras desenhadas: a quadra que contém
     o centro, e quantos retângulos ficam INTEIROS dentro dela. */
  function veredito(rets, anc, quadras) {
    var achou = quadraDe([anc.lat, anc.lng], quadras);
    if (!achou) return { quadra: null, cabem: 0, total: rets.length };
    var poli = quadras[achou], cabem = 0;
    rets.forEach(function (r) { if (cantos(r, anc).every(function (c) { return dentro(c, poli); })) cabem++; });
    return { quadra: achou, cabem: cabem, total: rets.length };
  }

  /* ------------------------------------------- vários grupos (puro) ---
     Um grupo é { cfg, lat, lng, ang, cor }: as medidas e onde ele está. */
  function ancora(gr) { return { lat: gr.lat, lng: gr.lng, ang: gr.ang || 0 }; }
  function cantosDoGrupo(gr) {
    var anc = ancora(gr);
    return retangulos(gr.cfg).rets.map(function (r) { return cantos(r, anc); });
  }
  /* [lat,lng] -> [leste, norte] em metros a partir de `ref`, sem giro: uma
     régua comum para comparar retângulos de grupos com giros diferentes. */
  function emMetros(pts, ref) {
    var a = { lat: ref[0], lng: ref[1], ang: 0 };
    return pts.map(function (p) { var q = w.CroquiCore.metrosLocais(p[0], p[1], a); return [q.x, q.y]; });
  }
  function caixa(pts) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    pts.forEach(function (p) { if (p[0] < b.x0) b.x0 = p[0]; if (p[0] > b.x1) b.x1 = p[0]; if (p[1] < b.y0) b.y0 = p[1]; if (p[1] > b.y1) b.y1 = p[1]; });
    return b;
  }
  function juntaCaixas(bs) {
    var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    bs.forEach(function (c) { b.x0 = Math.min(b.x0, c.x0); b.y0 = Math.min(b.y0, c.y0); b.x1 = Math.max(b.x1, c.x1); b.y1 = Math.max(b.y1, c.y1); });
    return b;
  }
  function cruzam(a, b) { return a.x0 < b.x1 - TOL && b.x0 < a.x1 - TOL && a.y0 < b.y1 - TOL && b.y0 < a.y1 - TOL; }
  /* Dois retângulos (convexos, em metros) se sobrepõem? Eixo separador: se
     em algum dos eixos das arestas as sombras dos dois não se cruzam (ou só
     se encostam), há folga entre eles. */
  function sobrepoe(A, B) {
    var polys = [A, B];
    for (var p = 0; p < 2; p++) {
      var P = polys[p];
      for (var i = 0; i < P.length; i++) {
        var a = P[i], b = P[(i + 1) % P.length], nx = a[1] - b[1], ny = b[0] - a[0], n = Math.sqrt(nx * nx + ny * ny);
        if (!(n > 0)) continue;
        nx /= n; ny /= n;
        var minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity, k, t;
        for (k = 0; k < A.length; k++) { t = A[k][0] * nx + A[k][1] * ny; if (t < minA) minA = t; if (t > maxA) maxA = t; }
        for (k = 0; k < B.length; k++) { t = B[k][0] * nx + B[k][1] * ny; if (t < minB) minB = t; if (t > maxB) maxB = t; }
        if (maxA <= minB + TOL || maxB <= minA + TOL) return false;
      }
    }
    return true;
  }
  /* Área de um polígono [[lat,lng],...] em m² (laço de Gauss, em metros). */
  function areaM2(poli) {
    if (!poli || poli.length < 3) return 0;
    var ms = emMetros(poli, poli[0]), s = 0;
    for (var i = 0, j = ms.length - 1; i < ms.length; j = i++) s += (ms[j][0] + ms[i][0]) * (ms[j][1] - ms[i][1]);
    return Math.abs(s / 2);
  }
  /* Os grupos em metros, numa régua comum, com caixas para descartar rápido
     o que nem chega perto. */
  function preparar(grupos, ref) {
    return grupos.map(function (gr) {
      var cs = cantosDoGrupo(gr), ms = cs.map(function (c) { return emMetros(c, ref); });
      var cx = ms.map(caixa);
      return { gr: gr, m: medidas(gr.cfg), cs: cs, ms: ms, cx: cx, tudo: cx.length ? juntaCaixas(cx) : null };
    });
  }
  /* Algum retângulo de `ms` (com caixas `cx`) se sobrepõe a algum de `h`? Devolve os índices. */
  function choques(ms, cx, tudo, h) {
    var out = [];
    if (!tudo || !h.tudo || !cruzam(tudo, h.tudo)) return out;
    ms.forEach(function (A, i) {
      for (var j = 0; j < h.ms.length; j++) {
        if (cruzam(cx[i], h.cx[j]) && sobrepoe(A, h.ms[j])) { out.push(i); return; }
      }
    });
    return out;
  }
  /* O veredito de TODOS os grupos de uma vez.
     Por grupo: a quadra que contém o centro dele; cada retângulo 'ok', 'fora'
     (não fica inteiro na quadra) ou 'choque' (sobrepõe outro grupo); com quem
     ele encosta; e se ele CABE (todos os retângulos ok numa quadra).
     Por quadra: os grupos que moram nela, quantos cabem e a área que os que
     cabem ocupam, contra a área da quadra. */
  function analisar(grupos, quadras) {
    var ref = null;
    grupos.some(function (gr) { if (isFinite(gr.lat) && isFinite(gr.lng)) { ref = [gr.lat, gr.lng]; return true; } return false; });
    if (!ref) return { grupos: [], quadras: {} };
    var G = preparar(grupos, ref);
    var out = G.map(function (g, gi) {
      var quadra = quadraDe([g.gr.lat, g.gr.lng], quadras), est = g.cs.map(function () { return 'ok'; }), encosta = [];
      if (quadra !== null) g.cs.forEach(function (c, ri) { if (!c.every(function (p) { return dentro(p, quadras[quadra]); })) est[ri] = 'fora'; });
      G.forEach(function (h, hi) {
        if (hi === gi) return;
        var cq = choques(g.ms, g.cx, g.tudo, h);
        if (cq.length) { encosta.push(hi); cq.forEach(function (ri) { est[ri] = 'choque'; }); }
      });
      var oks = est.filter(function (e) { return e === 'ok'; }).length;
      return { quadra: quadra, total: g.cs.length, inteiros: quadra === null ? 0 : est.filter(function (e) { return e !== 'fora'; }).length,
        livres: quadra === null ? 0 : oks, cabe: quadra !== null && g.cs.length > 0 && oks === g.cs.length,
        estado: est, encosta: encosta, W: g.m.W, L: g.m.L };
    });
    var porQ = {};
    out.forEach(function (o, gi) {
      if (o.quadra === null) return;
      var q = porQ[o.quadra] = porQ[o.quadra] || { grupos: [], cabem: 0, areaCabem: 0, areaQuadra: areaM2(quadras[o.quadra]) };
      q.grupos.push(gi);
      if (o.cabe) { q.cabem++; q.areaCabem += o.W * o.L; }
    });
    return { grupos: out, quadras: porQ };
  }
  /* AS VAGAS para cópias do grupo i: as casas de uma grade de cópias alinhada
     com ele — mesmo giro, passo = a ocupação dele + o espaço entre parcelas
     dele —, da mais perto para a mais longe, primeiro na mesma fileira. Uma
     vaga só vale se a cópia não sobrepõe nenhum grupo e, com op.quadra, se
     ela cabe INTEIRA nessa quadra. As casas dessa grade nunca se sobrepõem
     entre si, então todas as vagas devolvidas podem ser ocupadas juntas.
     Devolve os grupos novos (cópias), até op.max. */
  function vagas(grupos, i, quadras, op) {
    op = op || {};
    var g = grupos[i]; if (!g) return [];
    var m = medidas(g.cfg);
    if (!(m.comp > 0 && m.larg > 0)) return [];
    var px = m.W + m.esp, py = m.L + m.esp, anc = ancora(g), ref = [g.lat, g.lng];
    var poli = op.quadra != null && quadras ? quadras[op.quadra] : null;
    if (op.quadra != null && !(poli && poli.length >= 3)) return [];
    /* a janela de busca: a quadra inteira vista no giro do grupo, ou três casas para cada lado */
    var i0 = -3, i1 = 3, j0 = -3, j1 = 3;
    if (poli) {
      var loc = poli.map(function (p) { return w.CroquiCore.metrosLocais(p[0], p[1], anc); });
      var xs = loc.map(function (p) { return p.x; }), ys = loc.map(function (p) { return p.y; });
      i0 = Math.floor(Math.min.apply(null, xs) / px) - 1; i1 = Math.ceil(Math.max.apply(null, xs) / px) + 1;
      j0 = Math.floor(Math.min.apply(null, ys) / py) - 1; j1 = Math.ceil(Math.max.apply(null, ys) / py) + 1;
      /* quadra enorme com grupo minúsculo: a janela tem teto */
      i0 = Math.max(i0, -60); i1 = Math.min(i1, 60); j0 = Math.max(j0, -60); j1 = Math.min(j1, 60);
    }
    var casas = [];
    for (var cj = j0; cj <= j1; cj++) for (var ci = i0; ci <= i1; ci++) if (ci || cj) casas.push([ci, cj]);
    casas.sort(function (a, b) {
      return Math.abs(a[1]) - Math.abs(b[1]) || Math.abs(a[0]) - Math.abs(b[0]) || (a[0] < 0) - (b[0] < 0) || (a[1] < 0) - (b[1] < 0);
    });
    var G = preparar(grupos, ref), max = op.max == null ? Infinity : op.max, out = [];
    for (var k = 0; k < casas.length && out.length < max; k++) {
      var c = w.CroquiCore.pontoLatLng(casas[k][0] * px, casas[k][1] * py, anc);
      var novo = { cfg: copiaCfg(g.cfg), lat: c[0], lng: c[1], ang: g.ang || 0 };
      var cs = cantosDoGrupo(novo);
      if (poli && !cs.every(function (r) { return r.every(function (p) { return dentro(p, poli); }); })) continue;
      var ms = cs.map(function (r) { return emMetros(r, ref); }), cx = ms.map(caixa), tudo = juntaCaixas(cx);
      if (G.some(function (h) { return choques(ms, cx, tudo, h).length; })) continue;
      out.push(novo);
    }
    return out;
  }
  function copiaCfg(cfg) { var o = {}; Object.keys(cfg || {}).forEach(function (k) { o[k] = cfg[k]; }); return o; }

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
  function quadrasGeo() {
    try { if (typeof w.ensureQGEO === 'function') w.ensureQGEO(); return w.QGEO || {}; } catch (e) { return {}; }
  }
  function nomeQ(id) { return typeof w.quadraNome === 'function' ? w.quadraNome(id) : id; }
  function ativo() { return M.grupos[M.ativo]; }

  function desenharLivre() {
    var L = LF(), itens = M.livre.itens, cfg = ativo().cfg;
    itens.forEach(function (it, i) {
      var f = formaLivre(it);
      if (f.tipo === 'ponto') L.circle(f.centro, { radius: f.raio, color: '#ffd24a', weight: 2, fillColor: '#ffd24a', fillOpacity: 0.28, interactive: false }).addTo(M.camada);
      else L.polygon(f.cantos, { color: '#ffd24a', weight: 2, dashArray: '6 5', fillColor: '#ffd24a', fillOpacity: 0.16, interactive: false }).addTo(M.camada);
      L.marker([it.lat, it.lng], { interactive: false, icon: L.divIcon({ className: 'medir-n', html: '<span>' + (i + 1) + '</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(M.camada);
    });
    var info = M.painel.querySelector('.croqui-info');
    var porQ = livresNaQuadra(itens, quadrasGeo()), txt;
    if (!itens.length) txt = 'Toque no mapa para marcar ' + (M.livre.tipo === 'ponto' ? 'cada árvore/planta.' : 'cada parcela (' + fmt(num(cfg.largura, 0)) + ' × ' + fmt(num(cfg.comprimento, 0)) + ' m, no giro atual).');
    else {
      txt = '<b>' + itens.length + ' marcado(s)</b>';
      Object.keys(porQ).forEach(function (id) {
        var o = porQ[id];
        txt += '<br>Quadra ' + esc(nomeQ(id)) + ': ' + o.dentro + ' de ' + o.total + ' inteiros dentro';
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
  /* O arrasto dispara dezenas de eventos por segundo e cada desenho refaz
     todos os grupos: um desenho por quadro basta. */
  function agendar() {
    if (!M || M.agendado) return;
    M.agendado = true;
    var f = function () { if (!M) return; M.agendado = false; desenhar(); };
    if (typeof w.requestAnimationFrame === 'function') w.requestAnimationFrame(f); else setTimeout(f, 16);
  }
  function desenhar() {
    if (!M) return;
    desenhoLivre(M.modo === 'livre');
    var L = LF(), varios = M.grupos.length > 1;
    M.camada.clearLayers();
    M.painel.classList.toggle('medir-livre', M.modo === 'livre');
    [M.mover, M.giro].forEach(function (h) { if (h && h.setOpacity) h.setOpacity(M.modo === 'livre' ? 0 : 1); });
    pintarGrupos(null);
    if (M.modo === 'livre') return desenharLivre();
    var q = quadrasGeo(), an = analisar(M.grupos, q), numeraveis = cabeNumero(ativo());
    M.grupos.forEach(function (gr, gi) {
      var r = retangulos(gr.cfg), anc = ancora(gr), eAtivo = gi === M.ativo, est = an.grupos[gi];
      r.rets.forEach(function (ret, ri) {
        var e = est ? est.estado[ri] : 'ok', ruim = e === 'choque' || (e === 'fora' && est.quadra !== null), cor = ruim ? RUIM : gr.cor;
        var pol = L.polygon(cantos(ret, anc), { color: cor, weight: eAtivo ? 3 : 2, dashArray: '6 5', fillColor: cor,
          fillOpacity: ruim ? 0.24 : (eAtivo ? 0.18 : 0.12), interactive: varios, bubblingMouseEvents: false }).addTo(M.camada);
        /* tocar num grupo o escolhe: as medidas e os pegadores passam a ser dele */
        if (varios && pol.on) pol.on('click', function (ev) { try { L.DomEvent.stopPropagation(ev); } catch (x) {} escolher(gi); });
        if (eAtivo && r.rets.length > 1 && numeraveis) {
          var c = w.CroquiCore.pontoLatLng(ret.x + ret.w / 2, ret.y + ret.h / 2, anc);
          L.marker(c, { interactive: false, icon: L.divIcon({ className: 'medir-n', html: '<span>' + ret.n + '</span>', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(M.camada);
        }
      });
      /* os outros grupos levam o número deles no meio, na cor deles */
      if (varios && !eAtivo && r.rets.length) {
        L.marker([gr.lat, gr.lng], { interactive: false, icon: L.divIcon({ className: 'medir-g',
          html: '<span style="background:' + gr.cor + '">' + (gi + 1) + '</span>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(M.camada);
      }
    });
    var g = ativo(), m = medidas(g.cfg), anc0 = ancora(g);
    if (M.giro) M.giro.setLatLng(w.CroquiCore.pontoLatLng(0, m.L / 2 + Math.max(6, m.L * 0.18), anc0));
    if (M.mover) M.mover.setLatLng([g.lat, g.lng]);
    pintarGrupos(an);
    var info = M.painel.querySelector('.croqui-info'), t = textoInfo(an);
    info.className = 'croqui-info' + (t.falta ? ' falta' : ''); info.innerHTML = t.html;
  }
  /* O número de cada parcela só vai quando a parcela cabe um número na tela:
     parcela de 3 m vista de longe vira um colar de bolinhas encavaladas, que
     esconde o desenho em vez de explicá-lo. Muda com o zoom (ver abrir). */
  function cabeNumero(gr) {
    var mapa = w._map, r = retangulos(gr.cfg).rets[0];
    if (!r || !mapa || typeof mapa.latLngToContainerPoint !== 'function') return true;
    try {
      var c = cantos(r, ancora(gr)).map(function (p) { return mapa.latLngToContainerPoint(p); });
      var lado = function (a, b) { return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)); };
      return Math.min(lado(c[0], c[1]), lado(c[1], c[2])) >= 22;
    } catch (e) { return true; }
  }
  /* O que o painel diz: o grupo escolhido em detalhe e, havendo vários, o
     resumo por quadra — quantos cabem e quanto da quadra eles ocupam. */
  function textoInfo(an) {
    var g = ativo(), r = retangulos(g.cfg), m = r.m, v = an.grupos[M.ativo], varios = M.grupos.length > 1;
    var aviso = M.aviso ? '<span class="medir-aviso">' + M.aviso + '</span><br>' : '';
    if (!r.rets.length) return { falta: true, html: aviso + (varios ? '<b>Grupo ' + (M.ativo + 1) + ':</b> ' : '') + 'Informe comprimento e largura.' };
    var txt = aviso + (varios ? '<b>Grupo ' + (M.ativo + 1) + ':</b> ' : '') + '<b>' + m.qtd + ' × ' + fmt(m.larg) + ' × ' + fmt(m.comp) + ' m</b> · ' + m.cols + ' lado a lado, ' + m.lin + ' fileira(s)<br>' +
      'Ocupa <b>' + fmt(m.W) + ' × ' + fmt(m.L) + ' m</b> · ' + fmt(m.W * m.L / 10000, 3) + ' ha';
    var falta = false;
    if (!v || v.quadra === null) {
      txt += '<br>Arraste o ✛ para dentro de uma quadra desenhada para conferir se cabe.';
      if (v && v.encosta.length) { falta = true; txt += '<br>✗ Encosta no grupo ' + v.encosta.map(function (k) { return k + 1; }).join(', ') + ': afaste ou gire.'; }
    } else {
      var nome = esc(nomeQ(v.quadra));
      if (v.cabe) txt += '<br><span class="medir-ok">✓ Cabe inteiro na quadra ' + nome + (varios ? ', sem encostar em outro grupo' : '') + '.</span>';
      else {
        falta = true;
        if (v.inteiros < v.total) txt += '<br>✗ Na quadra ' + nome + ' cabem inteiros <b>' + v.inteiros + ' de ' + v.total + '</b>. Gire, mude a disposição ou o espaço.';
        if (v.encosta.length) txt += '<br>✗ Encosta no grupo ' + v.encosta.map(function (k) { return k + 1; }).join(', ') + ': afaste ou gire.';
      }
    }
    if (varios) {
      Object.keys(an.quadras).forEach(function (id) {
        var q = an.quadras[id], n = q.grupos.length;
        txt += '<div class="medir-resumo">Quadra <b>' + esc(nomeQ(id)) + '</b>: <b>' + q.cabem + ' de ' + n + '</b> grupo(s) cabem inteiros, sem encostar um no outro';
        if (q.cabem && q.areaQuadra > 0) txt += ' · ocupam ' + fmt(q.areaCabem / 10000, 2) + ' de ' + fmt(q.areaQuadra / 10000, 2) + ' ha (' + fmt(100 * q.areaCabem / q.areaQuadra, 0) + ' %)';
        var nao = q.grupos.filter(function (k) { return !an.grupos[k].cabe; });
        if (nao.length) txt += '<br>Não cabem: ' + nao.map(function (k) { return k + 1; }).join(', ');
        txt += '</div>';
      });
      var semQ = an.grupos.map(function (o, k) { return o.quadra === null ? k + 1 : null; }).filter(function (k) { return k !== null; });
      if (semQ.length) txt += '<div class="medir-resumo">Fora de quadra: ' + semQ.join(', ') + '</div>';
    }
    return { falta: falta, html: txt };
  }
  /* Os botões dos grupos, um por grupo, com o ✓ ou ✗ dele. */
  function pintarGrupos(an) {
    var box = M.painel.querySelector('[data-medir-chips]'); if (!box) return;
    /* um grupo só: não há o que escolher, e o painel fica do tamanho de antes */
    box.style.display = M.grupos.length > 1 ? '' : 'none';
    box.innerHTML = M.grupos.length < 2 ? '' : M.grupos.map(function (gr, i) {
      var v = an && an.grupos[i], marca = !v || v.quadra === null ? '' : (v.cabe ? ' ✓' : ' ✗');
      return '<button type="button" class="medir-chip' + (i === M.ativo ? ' on' : '') + '" data-medir-grupo="' + i + '" aria-pressed="' + (i === M.ativo) +
        '" aria-label="Grupo ' + (i + 1) + '"><i style="background:' + gr.cor + '"></i>' + (i + 1) + marca + '</button>';
    }).join('');
    var bt = function (a) { return M.painel.querySelector('[data-medir-acao="' + a + '"]'); };
    if (bt('remover')) bt('remover').disabled = M.grupos.length < 2;
    if (bt('voltar')) bt('voltar').disabled = !M.hist.length;
    if (bt('novo')) bt('novo').disabled = M.grupos.length >= MAX_GRUPOS;
    if (bt('encher')) bt('encher').disabled = M.grupos.length >= MAX_GRUPOS;
  }
  function campos() {
    var cfg = ativo().cfg;
    Array.prototype.forEach.call(M.painel.querySelectorAll('[data-medir]'), function (inp) {
      var k = inp.getAttribute('data-medir'); inp.value = cfg[k] == null ? '' : cfg[k];
    });
  }
  function escolher(i) {
    if (!M || i < 0 || i >= M.grupos.length) return;
    M.ativo = i; M.aviso = ''; campos(); desenhar();
  }
  function guardarPasso() {
    M.hist.push({ grupos: M.grupos.map(function (g) { return { cfg: copiaCfg(g.cfg), lat: g.lat, lng: g.lng, ang: g.ang, cor: g.cor }; }), ativo: M.ativo });
    if (M.hist.length > 30) M.hist.shift();
  }
  function novaCor() { return CORES[(M.criados++) % CORES.length]; }
  function acaoGrupo(a) {
    var q = quadrasGeo(), an = analisar(M.grupos, q), v = an.grupos[M.ativo], k = M.ativo + 1;
    M.aviso = '';
    if (a === 'novo') {
      if (M.grupos.length >= MAX_GRUPOS) return;
      /* a próxima vaga ao lado, inteira na quadra; sem vaga na quadra, a
         próxima livre; sem nenhuma, encostado à direita — e o painel acusa */
      var vs = v && v.quadra !== null ? vagas(M.grupos, M.ativo, q, { quadra: v.quadra, max: 1 }) : [];
      if (!vs.length) vs = vagas(M.grupos, M.ativo, q, { max: 1 });
      var g = ativo(), m = medidas(g.cfg), novo = vs[0];
      if (!novo) { var c = w.CroquiCore.pontoLatLng(m.W + m.esp, 0, ancora(g)); novo = { cfg: copiaCfg(g.cfg), lat: c[0], lng: c[1], ang: g.ang || 0 }; }
      guardarPasso();
      novo.cor = novaCor(); M.grupos.push(novo); M.ativo = M.grupos.length - 1;
      if (v && v.quadra !== null && !(vs[0] && dentroDaQuadra(novo, q[v.quadra]))) M.aviso = 'Não há mais vaga para outro grupo igual na quadra ' + esc(nomeQ(v.quadra)) + ': ele ficou fora dela.';
    } else if (a === 'encher') {
      if (!v || v.quadra === null) { M.aviso = 'Leve o grupo ' + k + ' para dentro de uma quadra antes de encher.'; return desenhar(); }
      var livre = MAX_GRUPOS - M.grupos.length, todas = vagas(M.grupos, M.ativo, q, { quadra: v.quadra, max: livre + 1 });
      var pos = todas.slice(0, livre);
      if (!pos.length) M.aviso = 'Não cabe mais nenhum grupo igual ao ' + k + ' na quadra ' + esc(nomeQ(v.quadra)) + ' sem encostar nos outros. Girar o grupo ou mudar a disposição pode abrir vaga.';
      else {
        guardarPasso();
        pos.forEach(function (n) { n.cor = M.grupos[M.ativo].cor; M.grupos.push(n); });
        M.aviso = 'Cabem mais <b>' + pos.length + '</b> grupo(s) igual(is) ao ' + k + ', no mesmo giro' +
          (todas.length > livre ? ' (parou no teto de ' + MAX_GRUPOS + ' grupos no mapa)' : '') + '. Girar ou mudar a disposição pode caber mais.';
      }
    } else if (a === 'remover') {
      if (M.grupos.length < 2) return;
      guardarPasso();
      M.grupos.splice(M.ativo, 1); M.ativo = Math.min(M.ativo, M.grupos.length - 1);
    } else if (a === 'voltar') {
      var h = M.hist.pop(); if (!h) return;
      M.grupos = h.grupos; M.ativo = Math.min(h.ativo, M.grupos.length - 1);
    }
    campos(); desenhar();
  }
  function dentroDaQuadra(gr, poli) {
    return !!poli && cantosDoGrupo(gr).every(function (r) { return r.every(function (p) { return dentro(p, poli); }); });
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
      var q = quadrasGeo(), qid = quadraDe([c.lat, c.lng], q);
      if (qid !== null && typeof w.quadraEixo === 'function') ang = w.quadraEixo(qid) || 0;
    } catch (e) {}
    var cfg = lembrado() || { comprimento: 30, largura: 12, quantidade: 5, colunas: 5, espaco: 2 };
    if (cfg.raio == null) cfg.raio = 1.5;
    M = { grupos: [{ cfg: cfg, lat: c.lat, lng: c.lng, ang: ang, cor: CORES[0] }], ativo: 0, criados: 1, hist: [], aviso: '',
          camada: L.layerGroup().addTo(mapa), modo: 'grade', livre: { tipo: 'ponto', itens: [] } };
    M.toque = function (ev) {
      if (!M || M.modo !== 'livre') return;
      var g = ativo();
      M.livre.itens.push({ tipo: M.livre.tipo, lat: ev.latlng.lat, lng: ev.latlng.lng, ang: g.ang,
        raio: g.cfg.raio, comprimento: g.cfg.comprimento, largura: g.cfg.largura });
      desenhar();
    };
    mapa.on('click', M.toque);
    /* o zoom decide se os números das parcelas cabem (cabeNumero) */
    M.zoom = function () { agendar(); };
    mapa.on('zoomend', M.zoom);
    M.mover = L.marker([c.lat, c.lng], { draggable: true, zIndexOffset: 1200,
      icon: L.divIcon({ className: 'gr-handle', html: '<div class="gr-h gr-move">&#10010;</div>', iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(mapa);
    M.mover.on('drag', function () { var p = M.mover.getLatLng(), g = ativo(); g.lat = p.lat; g.lng = p.lng; M.aviso = ''; agendar(); });
    M.giro = L.marker([c.lat, c.lng], { draggable: true, zIndexOffset: 1200,
      icon: L.divIcon({ className: 'gr-handle', html: '<div class="gr-h gr-rot">&#8635;</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(mapa);
    M.giro.on('drag', function () { var p = M.giro.getLatLng(), g = ativo(); g.ang = w.CroquiCore.anguloPara(p.lat, p.lng, ancora(g)); M.aviso = ''; agendar(); });

    var p = d.createElement('div');
    p.id = 'medirPanel'; p.className = 'croqui-panel';
    function campo(k, rot, passo) { return '<div><label>' + rot + '</label><input type="number" inputmode="decimal" min="0" step="' + passo + '" data-medir="' + k + '" value="' + esc(cfg[k]) + '"></div>'; }
    p.innerHTML = '<div class="croqui-head"><div class="croqui-title">Medir área</div><button type="button" class="croqui-toggle" data-medir-acao="recolher">Recolher</button><button class="croqui-x" data-medir-acao="fechar" aria-label="Fechar">×</button></div>' +
      '<div class="croqui-sub">Só para planejar: <b>nada é salvo</b>.</div>' +
      '<div class="croqui-seg"><button type="button" data-medir-modo="grade" class="on">Grade</button><button type="button" data-medir-modo="livre">Tocar no mapa</button></div>' +
      '<div class="croqui-seg medir-so-livre"><button type="button" data-medir-tipo="ponto" class="on">Ponto (árvore)</button><button type="button" data-medir-tipo="ret">Retângulo C × L</button></div>' +
      /* OS GRUPOS: um botão por grupo (as medidas abaixo são do que está
         marcado) e as ações sobre eles */
      '<div class="medir-grupos medir-so-grade"><div class="medir-chips" data-medir-chips role="group" aria-label="Grupos de parcelas"></div>' +
      '<div class="medir-gacts"><button type="button" data-medir-acao="novo" title="Cópia deste grupo na próxima vaga ao lado">+ Grupo</button>' +
      '<button type="button" data-medir-acao="encher" title="Cópias deste grupo em todas as vagas da quadra">Encher quadra</button>' +
      '<button type="button" data-medir-acao="remover">Remover</button>' +
      '<button type="button" data-medir-acao="voltar" aria-label="Desfazer" title="Desfazer">&#8630;</button></div></div>' +
      '<div class="croqui-nums medir-campos">' + campo('comprimento', 'Comprimento (m)', 0.5) + campo('largura', 'Largura (m)', 0.5) +
      campo('quantidade', 'Quantos', 1) + campo('colunas', 'Lado a lado', 1) + campo('espaco', 'Espaço entre (m)', 0.5) +
      '<div class="medir-so-livre">' + campo('raio', 'Raio da copa (m)', 0.5) + '</div>' +
      '<div class="medir-so-grade"><label>&nbsp;</label><div class="croqui-mini">grupo: ✛ mover · ↻ girar</div></div></div>' +
      '<div class="croqui-info"></div>' +
      '<div class="croqui-acts"><button class="medir-so-livre" data-medir-acao="desfazer">Desfazer</button><button class="danger" data-medir-acao="fechar">Limpar</button></div>';
    d.body.appendChild(p); M.painel = p;
    p.addEventListener('input', function (ev) {
      var k = ev.target.getAttribute('data-medir'); if (!k) return;
      var g = ativo(); g.cfg[k] = ev.target.value; lembrar(g.cfg); M.aviso = ''; desenhar();
    });
    p.addEventListener('click', function (ev) {
      var md = ev.target.closest('[data-medir-modo]'), tp = ev.target.closest('[data-medir-tipo]'), gb = ev.target.closest('[data-medir-grupo]');
      if (md) { M.modo = md.getAttribute('data-medir-modo'); p.querySelectorAll('[data-medir-modo]').forEach(function (x) { x.classList.toggle('on', x === md); }); desenhar(); return; }
      if (tp) { M.livre.tipo = tp.getAttribute('data-medir-tipo'); p.querySelectorAll('[data-medir-tipo]').forEach(function (x) { x.classList.toggle('on', x === tp); }); desenhar(); return; }
      if (gb) { escolher(+gb.getAttribute('data-medir-grupo')); return; }
      var b = ev.target.closest('[data-medir-acao]'); if (!b || b.disabled) return;
      var a = b.getAttribute('data-medir-acao');
      if (a === 'desfazer') { M.livre.itens.pop(); desenhar(); return; }
      if (a === 'recolher') {
        var rec = p.classList.toggle('medir-recolhido'); b.textContent = rec ? 'Medidas' : 'Recolher'; return;
      }
      if (a === 'novo' || a === 'encher' || a === 'remover' || a === 'voltar') { acaoGrupo(a); return; }
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
    try { mapa.off('click', M.toque); mapa.off('zoomend', M.zoom); } catch (e) {}
    if (M.painel && M.painel.parentNode) M.painel.parentNode.removeChild(M.painel);
    M = null;
    desenhoLivre(false);
    var bt = d.getElementById('medirBtn'); if (bt) bt.classList.remove('on');
  }
  function estilo() {
    if (d.getElementById('medirCss')) return;
    var s = d.createElement('style'); s.id = 'medirCss';
    s.textContent = '.medir-n span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(20,22,20,.8);color:#ffd24a;font:800 12px system-ui,sans-serif}' +
      '.medir-g span{display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;color:#101410;font:900 13px system-ui,sans-serif;box-shadow:0 0 0 2px rgba(20,22,20,.75)}' +
      '#medirPanel .croqui-nums input{min-height:38px}#medirPanel .croqui-toggle{margin-left:auto;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:6px 10px;font:700 11px system-ui,sans-serif}' +
      /* grupos: os botões rolam na horizontal em vez de empurrar o painel para cima */
      '#medirPanel .medir-grupos{margin-bottom:9px}#medirPanel .medir-chips{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;margin-bottom:7px;scrollbar-width:thin}' +
      '#medirPanel .medir-chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:5px;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:5px 9px;font:800 12px system-ui,sans-serif;cursor:pointer;min-height:30px}' +
      '#medirPanel .medir-chip i{width:10px;height:10px;border-radius:3px;display:inline-block}#medirPanel .medir-chip.on{border-color:#e8efe9;color:#e8efe9;box-shadow:inset 0 0 0 1px #e8efe9}' +
      '#medirPanel .medir-gacts{display:flex;gap:6px}#medirPanel .medir-gacts button{flex:1 1 auto;background:#0c1210;border:1px solid #2c3a32;color:#b9c6bd;border-radius:9px;padding:7px 6px;font:800 11px system-ui,sans-serif;cursor:pointer;min-height:32px}' +
      '#medirPanel .medir-gacts button[data-medir-acao="voltar"]{flex:0 0 auto;font-size:14px;padding:4px 10px}#medirPanel .medir-gacts button:disabled{opacity:.45;cursor:not-allowed}' +
      '#medirPanel .medir-ok{color:#8fe3b0}#medirPanel .medir-aviso{color:#ffe08a}#medirPanel .medir-resumo{margin-top:6px;padding-top:6px;border-top:1px solid #2c3a32}' +
      '#medirPanel.medir-recolhido .medir-campos,#medirPanel.medir-recolhido .croqui-sub,#medirPanel.medir-recolhido .croqui-seg,#medirPanel.medir-recolhido .medir-gacts{display:none}' +
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
    b.title = 'Grupos provisórios de parcelas para ver quantos estudos cabem na quadra — nada é salvo';
    b.onclick = abrir;
    ref.parentNode.appendChild(b);
    return true;
  }
  /* O ATALHO MORA NA MEDIÇÃO do leque de ferramentas do mapa (pedido de quem
     usa): ali já se mede área e perímetro, e é ali que se procura "medir".
     Dois botões no painel dela: os grupos provisórios deste módulo e as
     parcelas livres de um estudo (croqui-livre.js). O botão solto que ficava
     junto do Croqui saiu — dois "Medir" em lugares diferentes confundiam. */
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
      '<div class="measure-actions" style="grid-template-columns:1fr 1fr"><button type="button" data-medir-atalho-acao="grade">Grupos de estudos</button>' +
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

  w.AgMedir = { formaLivre: formaLivre, livresNaQuadra: livresNaQuadra, medidas: medidas, retangulos: retangulos, dentro: dentro, veredito: veredito,
    analisar: analisar, vagas: vagas, sobrepoe: sobrepoe, areaM2: areaM2, quadraDe: quadraDe, MAX_GRUPOS: MAX_GRUPOS,
    abrir: abrir, fechar: fechar, instalar: instalar, estudosParaLivre: estudosParaLivre, injetar: injetar,
    /* só leitura, para conferir de fora: quantos grupos e qual está escolhido */
    estado: function () { return M ? { grupos: M.grupos.length, ativo: M.ativo, modo: M.modo } : null; } };
  instalar();
})(typeof window !== 'undefined' ? window : this);
