/* trilha-formal.js — a trilha formal na ficha do estudo, SEM mexer no app.js
 *
 * A trilha de sempre (studyAuditHtml) continua igual. Este módulo envolve a
 * função e acrescenta, logo abaixo, uma seção que se preenche sozinha:
 *
 *   - o SELO: o registro de eventos confere (cada id é o SHA-256 do conteúdo)
 *     ou não — e, quando não confere, qual evento e por quê;
 *   - os eventos, do mais novo ao mais antigo, com quem, quando, motivo e
 *     de→para nas correções;
 *   - o que ainda está só neste aparelho (não subiu para a nuvem);
 *   - CONFLITOS: duas correções da mesma nota, feitas em aparelhos diferentes,
 *     partindo do mesmo valor. A trilha mostra os dois; quem resolve é gente.
 *
 * Ao abrir, a seção importa a trilha antiga (eventos "legado") e pede uma
 * sincronização, sem esperar por ela. Nada aqui grava no estudo.
 */
(function (w) {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function quando(iso) {
    var d = new Date(iso);
    if (!isFinite(d.getTime())) return '—';
    try { return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: w.AGRACTA_TIME_ZONE || undefined }); }
    catch (e) { return d.toISOString().slice(0, 16).replace('T', ' '); }
  }
  function valorTxt(v) {
    if (v == null || v === '') return '∅';
    if (typeof v === 'object') return v.versao != null ? 'versão ' + v.versao : JSON.stringify(v);
    return String(v).replace('.', ',');
  }

  /* Conflitos: por observação, na ordem causal, uma correção cujo "de" não é o
     valor que a anterior deixou. É a mesma regra do EventosCore.aplicar, mas
     sem precisar das observações — só do registro. */
  function conflitos(ordenados) {
    var atual = {}, out = [];
    ordenados.forEach(function (e) {
      if (e.tipo !== 'observacao.corrigida') return;
      var k = e.entidade.id;
      if (!(k in atual)) { atual[k] = e.para; return; }
      if (JSON.stringify(e.de) !== JSON.stringify(atual[k])) out.push({ evento: e, esperava: e.de, havia: atual[k] });
      else atual[k] = e.para;
    });
    return out;
  }

  /* HTML puro a partir do registro: testável no Node, sem DOM. */
  function renderizar(ficha, verif) {
    var E = w.EventosCore, O = w.ObservacaoCore;
    var eventos = E.ordenar(ficha.eventos || []), enviados = {};
    (ficha.enviados || []).forEach(function (id) { enviados[id] = 1; });
    var pend = eventos.filter(function (e) { return !enviados[e.id] && !e.legado; }).length;
    var confl = conflitos(eventos), confIds = {};
    confl.forEach(function (c) { confIds[c.evento.id] = c; });
    var h = '<div class="sd-section-title">🔏 Trilha formal</div>';
    if (!eventos.length) {
      return h + '<div class="sd-empty" style="color:var(--text-3,#8aa88a)">Nenhum evento formal ainda. ' +
        'Finalizar, reabrir, aprovar ou emendar o protocolo e corrigir uma avaliação assinada passam a aparecer aqui.</div>';
    }
    if (verif.ok) {
      h += '<div data-selo="ok" style="border:1px solid #2f6b47;background:rgba(55,214,132,.08);border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:8px">' +
        '✅ <b>Íntegra.</b> ' + eventos.length + ' evento(s); cada um confere com o próprio código SHA-256.' +
        (pend ? ' <span style="color:#d9b45a">' + pend + ' ainda só neste aparelho.</span>' : ' Tudo na nuvem.') + '</div>';
    } else {
      h += '<div data-selo="problema" style="border:1px solid #8a3b3b;background:rgba(255,90,90,.08);border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:8px">' +
        '⚠️ <b>A trilha não confere.</b> ' + verif.problemas.length + ' problema(s):<br>' +
        verif.problemas.slice(0, 6).map(function (p) { return '• ' + esc(p.problema); }).join('<br>') + '</div>';
    }
    if (confl.length) {
      h += '<div data-conflitos="' + confl.length + '" style="border:1px solid #8a6b2f;background:rgba(217,180,90,.08);border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:8px">' +
        '⚖️ <b>' + confl.length + ' conflito(s) entre aparelhos:</b> a mesma nota foi corrigida em dois lugares a partir do mesmo valor. ' +
        'As duas correções estão guardadas abaixo; registre uma nova correção para decidir.</div>';
    }
    h += '<div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:6px">';
    eventos.slice().reverse().forEach(function (e) {
      var tipo = (E.TIPOS[e.tipo] || {}).rotulo || e.tipo, alvo = '';
      if (e.tipo === 'observacao.corrigida') {
        var p = O.partesDoId(e.entidade.id) || {};
        alvo = esc(p.parcela || '?') + ' · ' + esc(p.variavel || '?') + ': <span style="color:#ff9a8a">' + esc(valorTxt(e.de)) +
          '</span> → <span style="color:#9fe0b6">' + esc(valorTxt(e.para)) + '</span>';
      } else if (e.tipo === 'protocolo.emendado') {
        alvo = esc(valorTxt(e.de)) + ' → ' + esc(valorTxt(e.para));
      }
      var selos = [];
      if (e.legado) selos.push('importado da trilha antiga');
      if (!enviados[e.id] && !e.legado) selos.push('só neste aparelho');
      if (confIds[e.id]) selos.push('em conflito');
      h += '<div data-evento="' + esc(e.id) + '" style="border-bottom:1px solid var(--border,#26322b);padding-bottom:5px;font-size:11px;line-height:1.45">' +
        '<div style="display:flex;justify-content:space-between;gap:8px"><b style="color:var(--accent,#37d684)">' + esc(tipo) + '</b>' +
        '<span style="color:var(--text-3,#7c8a80);font-size:10px">' + esc(quando(e.em)) + '</span></div>' +
        (alvo ? '<div>' + alvo + '</div>' : '') +
        (e.motivo ? '<div style="color:#d8b6e6;font-size:10px">Motivo: <b>' + esc(e.motivo) + '</b></div>' : '') +
        '<div style="color:var(--text-2,#9fb1a5);font-size:9px;font-style:italic">Por: <b>' + esc((e.autor && (e.autor.nome || e.autor.email)) || 'Não identificado') + '</b>' +
        (selos.length ? ' · ' + esc(selos.join(' · ')) : '') +
        ' · <span title="' + esc(e.id) + '">' + esc(e.id.slice(3, 15)) + '…</span></div></div>';
    });
    return h + '</div>';
  }

  function preencher(el, study) {
    var A = w.AgractaEventos;
    if (!A || !A.ficha || !el) return Promise.resolve();
    var qid = A.qidDoEstudo(study), sid = study.id;
    return A.importarLegado(study).then(function () {
      try { if (A.sincronizar) A.sincronizar().then(function (r) { if (r && (r.enviados || r.recebidos)) preencher(el, study); }); } catch (e) {}
      return A.ficha(qid, sid);
    }).then(function (f) {
      el.innerHTML = renderizar(f, w.EventosCore.verificar(f.eventos));
    }).catch(function (e) {
      el.innerHTML = '<div class="sd-section-title">🔏 Trilha formal</div><div class="sd-empty">Não foi possível ler a trilha formal neste aparelho.</div>';
      try { console.warn('[trilha-formal]', e); } catch (x) {}
    });
  }

  var _seq = 0;
  function instalar() {
    var orig = w.studyAuditHtml;
    if (typeof orig !== 'function' || orig.__trilhaFormal || !w.EventosCore || !w.AgractaEventos) return false;
    var envolto = function (study) {
      var html = orig.apply(this, arguments);
      try {
        if (!study || !study.id) return html;
        var id = 'trilha-formal-' + (++_seq);
        setTimeout(function () { preencher(w.document && w.document.getElementById(id), study); }, 0);
        return html + '<div class="sd-section" id="' + id + '" data-trilha-formal="1">' +
          '<div class="sd-section-title">🔏 Trilha formal</div><div class="sd-empty">Conferindo…</div></div>';
      } catch (e) { return html; }
    };
    envolto.__trilhaFormal = true;
    envolto.original = orig;
    w.studyAuditHtml = envolto;
    return true;
  }

  w.AgractaTrilhaFormal = { renderizar: renderizar, conflitos: conflitos, preencher: preencher, instalar: instalar };
  instalar();
})(typeof window !== 'undefined' ? window : this);
