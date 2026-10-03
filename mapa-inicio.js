/* mapa-inicio.js — "Abrir o app em": um lugar salvo ou o GPS.
 *
 * Pedido de quem usa: "quero que ele sempre abra em Iracemápolis — ou melhor,
 * um botão para escolher entre as localidades salvas e o GPS".
 *
 * Por que abria em outro lugar: o app enquadra o local ativo e, logo depois,
 * autoLocateOnOpen() leva o mapa para onde o GPS está. Quem escolhe um lugar
 * fixo não quer esse segundo salto.
 *
 *   Local salvo  -> o local vira o ativo (a mesma preferência do menu de locais,
 *                   setLocalAtivo) e o GPS NÃO move o mapa ao abrir;
 *   GPS          -> o comportamento de sempre: abre no local e vai para o GPS.
 *
 * Fica no aparelho (é jeito de abrir a tela, não dado do ensaio). Entra no menu
 * do local (o chip do topo) e num botão ⌂ no mapa, que volta para esse lugar.
 */
(function (w) {
  'use strict';
  var d = w.document, CHAVE = 'agracta-abrir-em';

  function pref() { try { return w.localStorage.getItem(CHAVE) === 'local' ? 'local' : 'gps'; } catch (e) { return 'gps'; } }
  function gravar(v) { try { w.localStorage.setItem(CHAVE, v === 'local' ? 'local' : 'gps'); return true; } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nomeLocal(id) { try { w.ensureLocais(); return (w.LOCAIS[id] && w.LOCAIS[id].nome) || id; } catch (e) { return id || ''; } }
  function rotulo() { return pref() === 'local' ? nomeLocal(w.localAtivo) : 'Minha posição (GPS)'; }

  /* o GPS só move o mapa ao abrir quando a escolha é GPS */
  function instalarAbertura() {
    var orig = w.autoLocateOnOpen;
    if (typeof orig !== 'function' || orig.__inicio) return;
    var envolto = function () { if (pref() === 'local') return; return orig.apply(this, arguments); };
    envolto.__inicio = true; w.autoLocateOnOpen = envolto;
  }

  function irParaInicio() {
    if (pref() === 'local') { try { w.flyToLocal(w.localAtivo); } catch (e) {} }
    else { try { w.locateMe({}); } catch (e) {} }
  }

  function escolher() {
    try { if (typeof w._locCss === 'function') w._locCss(); w.ensureLocais(); } catch (e) {}
    if (typeof w.closeLocalMenu === 'function') try { w.closeLocalMenu(); } catch (e) {}
    var m = d.getElementById('abrirEmModal');
    if (!m) { m = d.createElement('div'); m.id = 'abrirEmModal'; m.className = 'loc-modal'; d.body.appendChild(m); m.addEventListener('click', function (e) { if (e.target === m) m.style.display = 'none'; }); }
    var atual = pref() === 'local' ? 'local:' + w.localAtivo : 'gps';
    var ops = Object.keys(w.LOCAIS || {}).map(function (id) {
      var v = 'local:' + id;
      return '<label style="display:flex;gap:10px;align-items:center;padding:10px;border:1px solid #2a3a2a;border-radius:10px;margin-top:6px;cursor:pointer;font-size:14px;color:#eaf0ea;text-transform:none;letter-spacing:0">' +
        '<input type="radio" name="abrirEm" value="' + esc(v) + '"' + (v === atual ? ' checked' : '') + ' style="width:auto"> ' + esc(nomeLocal(id)) + '</label>';
    }).join('');
    m.innerHTML = '<div class="loc-box"><h3>⌂ Abrir o app em</h3>' +
      '<div style="font-size:12px;color:#8aa88a;line-height:1.4">Onde o mapa abre toda vez. Com um lugar escolhido, o GPS não arrasta o mapa ao abrir — o botão ⌂ do mapa volta para cá.</div>' +
      ops +
      '<label style="display:flex;gap:10px;align-items:center;padding:10px;border:1px solid #2a3a2a;border-radius:10px;margin-top:6px;cursor:pointer;font-size:14px;color:#eaf0ea;text-transform:none;letter-spacing:0">' +
      '<input type="radio" name="abrirEm" value="gps"' + (atual === 'gps' ? ' checked' : '') + ' style="width:auto"> 📍 Minha posição (GPS)</label>' +
      '<div class="row" style="margin-top:12px"><button class="loc-btn loc-ok" data-abrir-em="ok">Salvar</button><button class="loc-btn loc-cancel" data-abrir-em="cancelar">Cancelar</button></div></div>';
    m.style.display = 'flex';
    m.querySelector('[data-abrir-em="cancelar"]').onclick = function () { m.style.display = 'none'; };
    m.querySelector('[data-abrir-em="ok"]').onclick = function () {
      var r = m.querySelector('input[name="abrirEm"]:checked'); if (!r) return;
      m.style.display = 'none';
      if (r.value === 'gps') { gravar('gps'); irParaInicio(); }
      else {
        var id = r.value.slice(6);
        gravar('local');
        /* a mesma preferência do menu de locais: grava id + nome (resiste a fusão/recriação) */
        try {
          if (id !== w.localAtivo) w.setLocalAtivo(id);
          else { if (typeof w._localGravaPreferencia === 'function') w._localGravaPreferencia(id); w.flyToLocal(id); }
        } catch (e) {}
      }
      if (typeof w._stxToast === 'function') w._stxToast('O app vai abrir em: ' + rotulo());
      atualizarBotao();
    };
  }

  /* item no menu do local (chip do topo) */
  function instalarMenu() {
    var orig = w.openLocalMenu;
    if (typeof orig !== 'function' || orig.__inicio) return;
    var envolto = function () {
      var r = orig.apply(this, arguments);
      try {
        var menu = d.getElementById('localMenu');
        if (menu && !menu.querySelector('[data-abrir-em-item]')) {
          var sep = d.createElement('div'); sep.className = 'loc-sep';
          var it = d.createElement('div'); it.className = 'loc-mi'; it.setAttribute('data-abrir-em-item', '1');
          it.innerHTML = '<span>⌂ Abrir o app em: <b>' + esc(rotulo()) + '</b></span>';
          it.addEventListener('click', function (e) { e.stopPropagation(); escolher(); });
          menu.appendChild(sep); menu.appendChild(it);
        }
      } catch (e) {}
      return r;
    };
    envolto.__inicio = true; w.openLocalMenu = envolto;
  }

  /* botão ⌂ no mapa */
  function atualizarBotao() {
    var b = d.getElementById('mapaInicioBtn');
    if (b) b.title = 'Voltar para o início: ' + rotulo() + ' (toque longo para trocar)';
  }
  function botao() {
    var L = w.LF || w.L, mapa = w._map;
    if (!L || !mapa || mapa.__inicioCtl) return;
    mapa.__inicioCtl = true;
    var C = L.control({ position: 'topleft' });
    C.onAdd = function () {
      var div = L.DomUtil.create('div', 'ha-ctl');
      div.innerHTML = '<button id="mapaInicioBtn" type="button" aria-label="Voltar para o local de início">⌂</button>';
      L.DomEvent.disableClickPropagation(div);
      var b = div.firstChild, t = null, longo = false;
      b.addEventListener('click', function () { if (longo) { longo = false; return; } irParaInicio(); });
      /* toque longo (ou botão direito) troca o lugar de início */
      b.addEventListener('pointerdown', function () { longo = false; t = setTimeout(function () { longo = true; escolher(); }, 650); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { clearTimeout(t); }); });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); escolher(); });
      return div;
    };
    C.addTo(mapa);
    atualizarBotao();
  }
  function instalarBotao() {
    var orig = w.initMap;
    if (typeof orig === 'function' && !orig.__inicio) {
      var envolto = function () { var r = orig.apply(this, arguments); try { botao(); } catch (e) {} return r; };
      envolto.__inicio = true; w.initMap = envolto;
    }
    try { botao(); } catch (e) {}
  }

  w.AgMapaInicio = { pref: pref, gravar: gravar, escolher: escolher, irParaInicio: irParaInicio, instalar: function () { instalarAbertura(); instalarMenu(); instalarBotao(); } };
  w.AgMapaInicio.instalar();
})(typeof window !== 'undefined' ? window : this);
