/* papeis-app.js — liga os papéis (vendor/papeis-core.js) ao app
 *
 * Três coisas, sem reescrever o app.js:
 *
 *   1. SABE O PAPEL DE QUEM ESTÁ LOGADO E A TABELA EM VIGOR. Escuta o próprio
 *      cadastro (members/{email}.papel) e a tabela (politica/papeis) no banco.
 *      Mudou no Painel Admin, vale na hora. Sem rede, vale o último lido neste
 *      aparelho; nunca lido, técnico com a tabela padrão.
 *
 *   2. AVISA ANTES DE TENTAR. AgractaPapeis.exigir('finalizar') é chamado no
 *      começo de cada ação crítica do app.js. Isso importa mais do que parece:
 *      o banco recusa a gravação de quem não pode, e uma gravação recusada
 *      volta a ser tentada a cada sincronização — o aparelho ficaria preso.
 *      A tela barra antes, e diz o que a ação pede.
 *
 *   3. DÁ AO ADMINISTRADOR AS DUAS ESCOLHAS NO PAINEL ADMIN: o papel de cada
 *      pessoa (na linha dela, na lista de contas) e a tabela "quem pode o quê".
 *
 * Sem o motor carregado, nada aqui barra nada: o banco continua conferindo.
 */
(function (w) {
  'use strict';
  var ROOT = 'workspaces/agracta';
  var CACHE = 'agracta-papel-cache';
  var ADMINS = { 'machadovictorchaves@gmail.com': 1, 'vyktorbio@gmail.com': 1 };
  var estado = { email: '', papel: null, politica: null, unsubM: null, unsubP: null };

  function core() { return w.PapeisCore; }
  function db() {
    try { if (w.firebase && w.firebase.apps && w.firebase.apps.length) return w.firebase.firestore(); } catch (e) {}
    return null;
  }
  function emailAtual() {
    var u = w._authUser;
    return String((u && u.email) || '').trim().toLowerCase();
  }
  function toast(t) { if (typeof w._stxToast === 'function') w._stxToast(t); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---- cache neste aparelho (trabalho offline) ---------------------------- */
  function lerCache() {
    try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch (e) { return null; }
  }
  function gravarCache() {
    try {
      localStorage.setItem(CACHE, JSON.stringify({ email: estado.email, papel: estado.papel, politica: estado.politica }));
    } catch (e) {}
  }

  /* ---- 1. papel e tabela em vigor ----------------------------------------- */
  function papel() {
    var C = core(), e = emailAtual();
    if (!C) return null;
    if (ADMINS[e]) return 'admin';
    if (e && estado.email === e && estado.papel) return C.normalizarPapel(estado.papel);
    var c = lerCache();
    if (c && (!e || c.email === e)) return C.normalizarPapel(c.papel);
    return 'tecnico';
  }
  function politica() {
    var C = core();
    if (!C) return null;
    if (estado.politica) return C.normalizarPolitica(estado.politica);
    var c = lerCache();
    return C.normalizarPolitica(c && c.politica);
  }

  function vigiar() {
    var e = emailAtual(), d = db();
    if (!e || !d || e === estado.email) return;
    try { if (estado.unsubM) estado.unsubM(); } catch (x) {}
    try { if (estado.unsubP) estado.unsubP(); } catch (x) {}
    estado.email = e; estado.papel = null; estado.politica = null;
    var c = lerCache();
    if (c && c.email === e) { estado.papel = c.papel; estado.politica = c.politica; }
    estado.unsubM = d.doc(ROOT).collection('members').doc(e).onSnapshot(function (doc) {
      var m = (doc && doc.exists) ? (doc.data() || {}) : {};
      estado.papel = m.papel || 'tecnico';
      gravarCache();
    }, function () { /* sem leitura: fica o último conhecido */ });
    estado.unsubP = d.doc(ROOT).collection('politica').doc('papeis').onSnapshot(function (doc) {
      estado.politica = (doc && doc.exists) ? (doc.data() || {}) : {};
      gravarCache();
      pintarPolitica();
    }, function () {});
  }
  /* O login acontece em firebase-sync.js; aqui só se percebe que mudou. */
  setInterval(vigiar, 2000);
  if (typeof w.addEventListener === 'function') w.addEventListener('focus', vigiar);

  function permite(acao, ctx) {
    var C = core();
    if (!C) return { ok: true, papel: null, exige: null, motivo: null };
    return C.pode(papel(), acao, politica(), ctx);
  }
  function exigido(acao, ctx) {
    var C = core();
    return C ? C.exigido(acao, politica(), ctx) : null;
  }
  /* Para o app.js: true segue, false já avisou a pessoa. */
  function exigir(acao, ctx) {
    var r;
    try { r = permite(acao, ctx); } catch (e) { return true; }
    if (r.ok) return true;
    w.alert(r.motivo + '\n\nOs papéis são definidos pelo administrador, no Painel Admin.');
    return false;
  }

  /* ---- 3. Painel Admin ---------------------------------------------------- */
  var CORES = 'background:#0c1210;color:#cfe0d4;border:1px solid #2a3a2a;border-radius:7px;padding:5px 6px;font-size:11px';

  function opcoes(sel) {
    var C = core();
    return C.PAPEIS.map(function (p) {
      return '<option value="' + p + '"' + (p === sel ? ' selected' : '') + '>' + C.ROTULO_PAPEL[p] + '</option>';
    }).join('');
  }

  /* Papel na linha de cada pessoa. A lista é desenhada por app.js e
     acesso-horario.js; aqui só se acrescenta uma linha a cada conta. */
  var _renderAntes = w._renderPerfisList;
  w._renderPerfisList = function (arr, disabledSet) {
    if (typeof _renderAntes === 'function') _renderAntes(arr, disabledSet);
    var C = core(), box = document.getElementById('admPerfisList');
    if (!C || !box) return;
    var linhas = box.children;
    (arr || []).forEach(function (p, i) {
      if (p.papel === 'admin' || !linhas[i]) return;
      var atual = C.normalizarPapel(p.papelEquipe);
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:7px;font-size:11px;color:#9fb8a8';
      div.innerHTML = '<span>Papel</span><select id="pp_' + i + '" onchange="AgractaPapeis._salvarPapel(' + i + ')" style="' + CORES + ';flex:1">' +
        opcoes(atual) + '</select>';
      linhas[i].appendChild(div);
    });
    pintarPolitica();
  };

  function _salvarPapel(i) {
    var p = (w._perfisCache || [])[i], sel = document.getElementById('pp_' + i), d = db();
    if (!p || !sel) return;
    if (!d) { toast('Sem conexão.'); return; }
    var novo = sel.value, antes = core().normalizarPapel(p.papelEquipe);
    if (core().PAPEIS.indexOf(novo) < 0) return;
    sel.disabled = true;
    d.doc(ROOT).collection('members').doc(String(p.email).toLowerCase()).set({
      papel: novo,
      updatedAt: w.firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(function () {
      p.papelEquipe = novo; sel.disabled = false;
      toast((p.nome || p.email) + ': ' + core().ROTULO_PAPEL[novo].toLowerCase());
    }).catch(function (err) {
      sel.disabled = false; sel.value = antes;
      toast('Erro ao salvar o papel: ' + ((err && err.message) || err));
    });
  }

  /* A tabela "quem pode o quê", logo abaixo da lista de contas. */
  function pintarPolitica() {
    var C = core(), lista = document.getElementById('admPerfisList');
    if (!C || !lista || !ADMINS[emailAtual()]) return;
    var box = document.getElementById('admPapeisPolitica');
    if (!box) {
      box = document.createElement('div');
      box.id = 'admPapeisPolitica';
      box.style.cssText = 'margin-top:10px;border:1px solid #2a3a2a;border-radius:10px;padding:10px;background:#111b13;text-align:left';
      lista.parentNode.insertBefore(box, lista.nextSibling);
    }
    var pol = politica();
    box.innerHTML =
      '<div style="font-weight:700;color:var(--text);margin-bottom:3px">Quem pode o quê</div>' +
      '<div style="font-size:10px;color:#8aa88a;line-height:1.45;margin-bottom:8px">Papel mínimo de cada ação. ' +
        'Técnico &lt; supervisor &lt; diretor; o administrador pode tudo. ' +
        '<b>Banco</b>: o servidor recusa quem não pode. <b>Tela</b>: o app barra e o evento formal registra o papel. ' +
        'Vale na hora para todos os aparelhos.</div>' +
      C.ACOES.map(function (a) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #1f2c22">' +
          '<div style="flex:1;min-width:0;font-size:11px;color:#cfe0d4">' + esc(a.rotulo) + '</div>' +
          '<span style="font-size:9px;font-weight:800;letter-spacing:.4px;padding:2px 5px;border-radius:5px;' +
            (a.servidor ? 'background:#0f2a1a;color:#37d684;border:1px solid #245a36">BANCO' : 'background:#10202a;color:#7fc0e6;border:1px solid #274a5a">TELA') + '</span>' +
          '<select id="ppol_' + a.id + '" style="' + CORES + ';width:112px">' + opcoes(pol.minimo[a.id]) + '</select>' +
        '</div>';
      }).join('') +
      '<label style="display:flex;align-items:flex-start;gap:7px;margin-top:8px;font-size:11px;color:#cfe0d4;cursor:pointer">' +
        '<input type="checkbox" id="ppol_propria"' + (pol.corrigirPropria ? ' checked' : '') + ' style="width:auto;margin-top:2px">' +
        '<span>Técnico pode corrigir a avaliação que <b>ele mesmo</b> assinou (sempre com motivo)</span></label>' +
      '<button onclick="AgractaPapeis._salvarPolitica()" style="width:100%;background:var(--acao-bg);color:var(--acao-ink);border:none;border-radius:8px;padding:8px;font-weight:700;margin-top:8px;cursor:pointer">Salvar tabela</button>';
  }

  function _salvarPolitica() {
    var C = core(), d = db(), e = emailAtual();
    if (!C || !d) { toast('Sem conexão.'); return; }
    var minimo = {};
    C.ACOES.forEach(function (a) {
      var s = document.getElementById('ppol_' + a.id);
      minimo[a.id] = s ? s.value : a.padrao;
    });
    var nova = { minimo: minimo, corrigirPropria: !!(document.getElementById('ppol_propria') || {}).checked };
    var erros = C.validarPolitica(nova);
    if (erros.length) { w.alert('A tabela não foi salva:\n• ' + erros.join('\n• ')); return; }
    if (!w.confirm('Salvar a tabela? Ela passa a valer na hora, em todos os aparelhos.')) return;
    d.doc(ROOT).collection('politica').doc('papeis').set({
      schema: 1, minimo: minimo, corrigirPropria: nova.corrigirPropria,
      atualizadoEm: w.firebase.firestore.FieldValue.serverTimestamp(), atualizadoPor: e
    }).then(function () {
      toast('Tabela de papéis salva.');
    }).catch(function (err) {
      toast('Erro ao salvar a tabela: ' + ((err && err.message) || err));
    });
  }

  w.AgractaPapeis = {
    papel: papel, politica: politica, permite: permite, exigido: exigido, exigir: exigir,
    _salvarPapel: _salvarPapel, _salvarPolitica: _salvarPolitica, _vigiar: vigiar
  };
})(window);
