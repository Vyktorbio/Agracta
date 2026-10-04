/* notas-local.js — ONDE cada nota foi lançada, e a camada do supervisor.
 *
 * 1. CAPTURA. Cada nota da grade de avaliação já ganha um carimbo (hora, quem)
 *    em _avTouchCell. Este módulo acrescenta ao MESMO carimbo o local do GPS:
 *    meta.loc = {lat, lng, acc, t}. O carimbo inteiro já viaja na
 *    sincronização (o lado mais novo vence a célula com o carimbo junto), então
 *    nenhum formato de dado muda. Sem GPS (permissão negada, laboratório,
 *    computador) a nota segue igual, só sem local — nunca trava a digitação.
 *    Só vale daqui para a frente: nota antiga não tem local, e não se inventa.
 *
 * 2. CAMADA "NOTAS" NO MAPA (liga/desliga, como o Croqui). Uma marca pequena
 *    onde cada nota foi lançada. Com o croqui posicionado, a mesma conta do
 *    "Onde estou" (CroquiCore) diz se o ponto caiu DENTRO da parcela avaliada,
 *    perto dela (dentro da margem do GPS) ou LONGE — é o que o supervisor
 *    precisa para saber se a avaliação foi feita no lugar. O valor da nota
 *    NÃO aparece (cegamento): só parcela, variável, quem, quando e precisão.
 *
 * Tudo o que é coordenada passa pelo CroquiCore: GPS -> metros locais ->
 * parcela. O mesmo motor do croqui, do "Onde estou" e do "Medir".
 */
(function (w) {
  'use strict';
  var d = w.document;
  /* GPS de até 60 s ANTES (parado, o aparelho não manda leitura nova) ou até 30 s
     DEPOIS da nota (andando, 30 s já são outra árvore). A diferença fica gravada. */
  var FIX_VALIDO_MS = 60000, ESPERA_MS = 30000, OCIOSO_MS = 180000, DENTRO_ACC_MAX = 5;
  var gps = { watch: null, ultimo: null, pendentes: [], ocioso: null };

  /* ------------------------------------------------------------ captura --- */
  function fixRecente(agora) { return gps.ultimo && (agora - gps.ultimo.t) <= FIX_VALIDO_MS ? gps.ultimo : null; }
  function carimbar(meta, fix, em) {
    if (!meta || !fix || meta.loc) return;
    meta.loc = { lat: +fix.lat.toFixed(7), lng: +fix.lng.toFixed(7), acc: Math.round(fix.acc * 10) / 10, t: fix.t };
    /* segundos entre a nota e a leitura do GPS (+ depois, − antes) */
    if (em) meta.loc.dt = Math.round((fix.t - em) / 1000);
  }
  function aoFix(pos) {
    var c = pos && pos.coords; if (!c || !isFinite(c.latitude) || !isFinite(c.longitude)) return;
    var fix = { lat: c.latitude, lng: c.longitude, acc: +c.accuracy || 0, t: pos.timestamp || Date.now() };
    /* fix ruim (> 80 m) não serve para dizer em que parcela se estava */
    if (fix.acc > 80) return;
    gps.ultimo = fix;
    var agora = Date.now();
    gps.pendentes = gps.pendentes.filter(function (p) {
      if (agora - p.em > ESPERA_MS) return false;
      carimbar(p.meta, fix, p.em); return false;
    });
  }
  function ligarGps() {
    var g = w.navigator && w.navigator.geolocation;
    if (!g || gps.watch != null) return;
    try {
      gps.watch = g.watchPosition(aoFix, function () {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
    } catch (e) { gps.watch = null; }
  }
  function desligarGps() {
    var g = w.navigator && w.navigator.geolocation;
    if (gps.watch != null && g) { try { g.clearWatch(gps.watch); } catch (e) {} }
    gps.watch = null;
  }
  function registrar(meta) {
    if (!meta || typeof meta !== 'object') return;
    if (!ligado()) return;
    var agora = Date.now(), fix = fixRecente(agora);
    if (fix) carimbar(meta, fix, agora); else gps.pendentes.push({ meta: meta, em: agora });
    ligarGps();
    clearTimeout(gps.ocioso);
    /* sem nota nova por 3 min, o GPS dorme: bateria de quem está no campo */
    gps.ocioso = setTimeout(desligarGps, OCIOSO_MS);
  }
  var CHAVE_LIGADO = 'agracta-notas-local';
  function ligado() { try { return w.localStorage.getItem(CHAVE_LIGADO) !== '0'; } catch (e) { return true; } }

  function instalarCaptura() {
    var orig = w._avTouchCell;
    if (typeof orig !== 'function' || orig.__local) return false;
    var envolto = function (row, v) {
      var r = orig.apply(this, arguments);
      try {
        var g = w._avGrid, meta = g && g.meta && g.meta[row] && g.meta[row][v];
        registrar(meta);
      } catch (e) {}
      return r;
    };
    envolto.__local = true; envolto.original = orig;
    w._avTouchCell = envolto;
    return true;
  }

  /* -------------------------------------------- geometria (pura, testável) ---
     Classifica um ponto de nota contra a parcela que foi avaliada. */
  function classificar(loc, parcela, anc) {
    var C = w.CroquiCore;
    if (!loc) return { nivel: 'sem-local' };
    if (!parcela || !anc) return { nivel: 'sem-croqui' };
    var m = C.metrosLocais(loc.lat, loc.lng, anc), dist;
    /* mesma conta do "Onde estou": retângulo da grade, ou a planta mais
       próxima numa parcela livre de plantas */
    if (C.relacaoComParcela) dist = C.relacaoComParcela(m.x, m.y, parcela).dist;
    else {
      var dx = Math.max(parcela.x - m.x, 0, m.x - (parcela.x + parcela.w));
      var dy = Math.max(parcela.y - m.y, 0, m.y - (parcela.y + parcela.h));
      dist = Math.sqrt(dx * dx + dy * dy);
    }
    var acc = +loc.acc || 0;
    /* "dentro" é afirmação: só com GPS bom. Com GPS largo o ponto cair dentro é
       sorte, e a nota fica como compatível (dentro da margem), não confirmada. */
    if (dist <= 0) return acc <= DENTRO_ACC_MAX ? { nivel: 'dentro', dist: 0 } : { nivel: 'perto', dist: 0 };
    if (dist <= Math.max(acc, 3)) return { nivel: 'perto', dist: dist };
    return { nivel: 'longe', dist: dist };
  }
  /* Todas as notas com local de um estudo, já com a parcela do croqui. */
  function notasDoEstudo(qid, st) {
    var out = [], geo = null;
    try {
      var pos = typeof w.croquiPos === 'function' ? w.croquiPos(st) : null;
      if (pos && typeof w.croquiGrade === 'function') {
        var g = w.croquiGrade(JSON.parse(JSON.stringify(st)), pos), porChave = {};
        (g.parcelas || []).forEach(function (p) {
          var t = (st.tratamentos || [])[p.tratNum - 1], id = p.tratId || (t && t.id);
          porChave[String(id) + 'R' + p.rep] = p;
        });
        geo = { pos: pos, porChave: porChave };
      }
    } catch (e) { geo = null; }
    var trats = {}; (st.tratamentos || []).forEach(function (t) { if (t && t.id) trats[t.id] = 1; });
    (st.avaliacoes || []).forEach(function (av) {
      var metas = av && av.notasMeta; if (!metas) return;
      Object.keys(metas).forEach(function (row) {
        /* linha "T1R2", ou só "T1" (repetição 1 em estudos antigos) */
        var mm = /^(.*)R(\d+)$/.exec(row), tratId = mm && trats[mm[1]] ? mm[1] : row, rep = mm && trats[mm[1]] ? +mm[2] : 1;
        Object.keys(metas[row] || {}).forEach(function (v) {
          var me = metas[row][v]; if (!me || !me.loc) return;
          var parcela = geo ? geo.porChave[String(tratId) + 'R' + rep] : null;
          out.push({ qid: qid, sid: st.id, codigo: st.codigo || st.id, avId: av.id, data: av.data, tratId: tratId, rep: rep, variavel: v,
            quem: me.user || me.por || '', ts: me.ts, loc: me.loc,
            veredito: classificar(me.loc, parcela, geo && geo.pos) });
        });
      });
    });
    return out;
  }
  function rotas(lista) {
    var grupos = {};
    lista.forEach(function (n) { var k = n.sid + '|' + n.avId + '|' + (n.quem || ''); (grupos[k] = grupos[k] || []).push(n); });
    return Object.keys(grupos).map(function (k) {
      var g = grupos[k].slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      return { quem: g[0].quem || '', inicio: g[0].ts, pontos: g.map(function (n) { return [n.loc.lat, n.loc.lng]; }) };
    }).filter(function (r) { return r.pontos.length > 1; });
  }
  function resumo(lista) {
    var r = { total: lista.length, dentro: 0, perto: 0, longe: 0, semCroqui: 0 };
    lista.forEach(function (n) {
      var k = n.veredito.nivel;
      if (k === 'dentro') r.dentro++; else if (k === 'perto') r.perto++; else if (k === 'longe') r.longe++; else r.semCroqui++;
    });
    return r;
  }

  /* -------------------------------------------------------------- camada --- */
  var CORES = { dentro: '#00ff00', perto: '#ffff00', longe: '#ff0000', 'sem-croqui': '#2563eb' };
  var cam = null;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function m1(v) { var n = v < 10 ? Math.round(v * 10) / 10 : Math.round(v); return String(n).replace('.', ','); }
  function quando(ts) { var t = new Date(ts); return isFinite(t) ? t.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''; }
  function texto(n) {
    var v = n.veredito, ver = v.nivel === 'dentro' ? '✓ dentro da parcela' : v.nivel === 'perto' ? (v.dist > 0 ? 'perto da parcela (' + m1(v.dist) + ' m, dentro da margem do GPS)' : 'compatível com a parcela (GPS largo demais para confirmar)')
      : v.nivel === 'longe' ? '✗ a ' + m1(v.dist) + ' m da parcela avaliada' : 'croqui não posicionado: sem conferência de parcela';
    return '<b>' + esc(n.codigo) + ' · ' + esc(n.tratId) + ' R' + n.rep + '</b><br>' + esc(n.variavel) + ' · ' + esc(n.data || '') +
      '<br>' + esc(n.quem || 'sem autor') + ' · ' + esc(quando(n.ts)) + ' · GPS ±' + m1(n.loc.acc || 0) + ' m' +
      (n.loc.dt ? ' · GPS ' + Math.abs(n.loc.dt) + ' s ' + (n.loc.dt > 0 ? 'depois' : 'antes') + ' da nota' : '') + '<br>' + ver;
  }
  function todasAsNotas() {
    var out = [], dados = w.data || {};
    Object.keys(dados).forEach(function (qid) {
      ((dados[qid] || {}).estudos || []).forEach(function (st) { if (st && st.id) out = out.concat(notasDoEstudo(qid, st)); });
    });
    return out;
  }
  function desenhar() {
    var L = w.LF || w.L, mapa = w._map; if (!cam || !L || !mapa) return;
    cam.camada.clearLayers();
    var filtro = cam.filtro, lista = todasAsNotas().filter(function (n) { return !filtro || (n.sid === filtro.sid && (!filtro.avId || n.avId === filtro.avId)); });
    /* ROTA: as notas ligadas na ordem em que foram lançadas, por avaliação e
       por avaliador. Não é rastreio contínuo do GPS — é o caminho de parcela
       em parcela, que é o que o supervisor quer ver. */
    if (cam.rota) rotas(lista).forEach(function (r) {
      L.polyline(r.pontos, { color: '#ffffff', weight: 4, opacity: 0.75, interactive: false }).addTo(cam.camada);
      L.polyline(r.pontos, { color: '#111827', weight: 2, opacity: 0.9, dashArray: '6 6', interactive: false }).addTo(cam.camada);
      L.circleMarker(r.pontos[0], { radius: 8, color: '#111827', weight: 2, fillColor: '#ffffff', fillOpacity: 1 }).bindPopup('Início · ' + esc(r.quem) + ' · ' + esc(quando(r.inicio))).addTo(cam.camada);
    });
    lista.forEach(function (n) {
      var cor = CORES[n.veredito.nivel] || '#2563eb';
      if (n.loc.acc > 0) L.circle([n.loc.lat, n.loc.lng], { radius: n.loc.acc, color: cor, weight: 1, opacity: 0.35, fillOpacity: 0.04, dashArray: '3 4', interactive: false }).addTo(cam.camada);
      /* a marca: do tamanho de uma pessoa (0,4 m) de perto, e nunca menor que 5 px de longe */
      L.circle([n.loc.lat, n.loc.lng], { radius: 0.4, color: '#fff', weight: 1.5, fillColor: cor, fillOpacity: 1, interactive: false }).addTo(cam.camada);
      L.circleMarker([n.loc.lat, n.loc.lng], { radius: 5, color: '#fff', weight: 1.5, fillColor: cor, fillOpacity: 0.95 })
        .bindPopup(texto(n)).addTo(cam.camada);
    });
    var r = resumo(lista), info = cam.painel.querySelector('.croqui-info');
    info.className = 'croqui-info' + (r.longe ? ' falta' : '');
    info.innerHTML = r.total ? ('<b>' + r.total + ' nota(s) com local</b><br>' +
      '<span style="color:#00ff00">● ' + r.dentro + ' dentro</span> · <span style="color:#ffff00">● ' + r.perto + ' perto</span> · ' +
      '<span style="color:#ff0000">● ' + r.longe + ' longe</span>' + (r.semCroqui ? ' · <span style="color:#60a5fa">● ' + r.semCroqui + ' sem croqui</span>' : ''))
      : 'Nenhuma nota com local ainda. O local passa a ser gravado nas notas lançadas a partir de agora, com o GPS ligado.';
    return lista;
  }
  function opcoes() {
    var est = {}, dados = w.data || {};
    Object.keys(dados).forEach(function (qid) {
      ((dados[qid] || {}).estudos || []).forEach(function (st) {
        (st.avaliacoes || []).forEach(function (av) {
          var tem = Object.keys(av.notasMeta || {}).some(function (r) { return Object.keys(av.notasMeta[r] || {}).some(function (v) { return av.notasMeta[r][v] && av.notasMeta[r][v].loc; }); });
          if (!tem) return;
          (est[st.id] = est[st.id] || { st: st, avs: [] }).avs.push(av);
        });
      });
    });
    return est;
  }
  function abrirCamada() {
    var L = w.LF || w.L, mapa = w._map;
    if (!L || !mapa) return;
    if (cam) return fecharCamada();
    try { if (typeof w.croquiCss === 'function') w.croquiCss(); } catch (e) {}
    cam = { camada: L.layerGroup().addTo(mapa), filtro: null };
    var p = d.createElement('div'); p.id = 'notasMapaPanel'; p.className = 'croqui-panel'; cam.painel = p;
    var est = opcoes();
    var sel = '<option value="">Todos os estudos</option>' + Object.keys(est).map(function (sid) {
      var e = est[sid];
      return '<option value="' + esc(sid) + '">' + esc(e.st.codigo || sid) + '</option>' + e.avs.map(function (av) {
        return '<option value="' + esc(sid) + '|' + esc(av.id) + '">   ↳ avaliação ' + esc(av.data || av.id) + '</option>';
      }).join('');
    }).join('');
    p.innerHTML = '<div class="croqui-head"><div class="croqui-title">Notas no mapa</div><button class="croqui-x" data-nm="fechar" aria-label="Fechar">×</button></div>' +
      '<div class="croqui-sub">Onde cada nota foi lançada. Verde dentro da parcela, âmbar perto (margem do GPS), vermelho longe. O valor da nota não aparece.</div>' +
      '<select data-nm="filtro" style="width:100%;margin-bottom:9px;background:#0c1210;border:1px solid #2c3a32;color:#e8efe9;border-radius:9px;padding:8px">' + sel + '</select>' +
      '<label style="display:flex;gap:8px;align-items:center;font-size:12px;margin:0 0 9px;color:#e8efe9"><input type="checkbox" data-nm="rota"> Mostrar a rota (notas ligadas na ordem em que foram lançadas)</label>' +
      '<div class="croqui-info"></div>' +
      '<div class="croqui-acts"><button data-nm="enquadrar">Ver todas</button><button class="danger" data-nm="fechar">Desligar</button></div>';
    d.body.appendChild(p);
    try { L.DomEvent.disableClickPropagation(p); L.DomEvent.disableScrollPropagation(p); } catch (e) {}
    p.addEventListener('change', function (ev) {
      if (ev.target.getAttribute('data-nm') === 'rota') { cam.rota = ev.target.checked; desenhar(); return; }
      if (ev.target.getAttribute('data-nm') !== 'filtro') return;
      var v = ev.target.value.split('|'); cam.filtro = v[0] ? { sid: v[0], avId: v[1] || null } : null; enquadrar(desenhar());
    });
    p.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-nm]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
      if (b.getAttribute('data-nm') === 'fechar') fecharCamada(); else if (b.getAttribute('data-nm') === 'enquadrar') enquadrar(desenhar());
    });
    var bt = d.getElementById('notasMapaBtn'); if (bt) bt.classList.add('on');
    enquadrar(desenhar());
  }
  function enquadrar(lista) {
    var L = w.LF || w.L, mapa = w._map; if (!lista || !lista.length || !mapa) return;
    try {
      var b = L.latLngBounds(lista.map(function (n) { return [n.loc.lat, n.loc.lng]; }));
      mapa.fitBounds(b, { paddingTopLeft: [30, 60], paddingBottomRight: [30, (cam && cam.painel.offsetHeight || 0) + 40], maxZoom: 20 });
    } catch (e) {}
  }
  function fecharCamada() {
    if (!cam) return;
    try { w._map.removeLayer(cam.camada); } catch (e) {}
    if (cam.painel && cam.painel.parentNode) cam.painel.parentNode.removeChild(cam.painel);
    cam = null;
    var bt = d.getElementById('notasMapaBtn'); if (bt) bt.classList.remove('on');
  }

  /* botão junto de Croqui / Onde estou / Medir */
  function injetar() {
    var ref = d.getElementById('croquiRefBtn');
    if (!ref || d.getElementById('notasMapaBtn')) return;
    var b = d.createElement('button');
    b.id = 'notasMapaBtn'; b.type = 'button'; b.textContent = 'Notas';
    b.title = 'Mostrar onde cada nota de avaliação foi lançada (para conferir se foi feita no local)';
    b.onclick = abrirCamada;
    ref.parentNode.appendChild(b);
  }
  function instalarBotao() {
    var orig = w.addCroquiControl;
    if (typeof orig === 'function' && !orig.__notas) {
      var envolto = function () { var r = orig.apply(this, arguments); try { injetar(); } catch (e) {} return r; };
      envolto.__notas = true; w.addCroquiControl = envolto;
    }
    injetar();
  }

  w.AgNotasLocal = { classificar: classificar, rotas: rotas, notasDoEstudo: notasDoEstudo, resumo: resumo, registrar: registrar, aoFix: aoFix,
    instalarCaptura: instalarCaptura, abrir: abrirCamada, fechar: fecharCamada, _gps: gps,
    ligar: function (sim) { try { w.localStorage.setItem(CHAVE_LIGADO, sim ? '1' : '0'); } catch (e) {} } };
  instalarCaptura();
  instalarBotao();
})(typeof window !== 'undefined' ? window : this);
