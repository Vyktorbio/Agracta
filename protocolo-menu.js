/* protocolo-menu.js — o PROTOCOLO num lugar só.
 *
 * Relato: "tem coisa espalhada". O protocolo de um estudo morava em sete
 * lugares: as quatro etapas do Editar (identificação/parcela, execução/
 * aplicação, tratamentos/delineamento/testemunha, calda/programação), o botão
 * "Protocolo: avaliações e controles" (papéis, variáveis, escalas), os botões
 * do cabeçalho (randomização, Calc), a seção de croqui e o "Protocolo vivo"
 * (aprovação, emendas, desvios) no fim da ficha.
 *
 * Esta tela NÃO duplica formulário nenhum: mostra o resumo de cada parte, o
 * que falta e um botão que abre o editor CERTO, na etapa certa. Nada é gravado
 * aqui. E aponta o que hoje passa despercebido — a testemunha marcada num
 * lugar (checkbox "Testemunha / check") e não no outro (papel do tratamento).
 */
(function (w) {
  'use strict';
  var d = w.document;
  var PAPEIS = { experimental: 'Experimental', sem_intervencao: 'Testemunha (controle negativo)', sem_alvo: 'Testemunha não infestada', positivo: 'Padrão (controle positivo)' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function estudo(qid, sid) { return ((w.data && w.data[qid] && w.data[qid].estudos) || []).filter(function (s) { return s && s.id === sid; })[0] || null; }
  function br(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.slice(8) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : (iso || ''); }
  function txt(v, padrao) { v = String(v == null ? '' : v).trim(); return v || padrao; }

  /* -------------------------------------------- diagnóstico (puro, testável) --- */
  function testemunhaConflitos(st) {
    var out = [];
    (st.tratamentos || []).forEach(function (t) {
      if (!t || !t.id) return;
      var papel = t.papelControle || '', marcada = !!t.testemunha;
      /* regra única, a mesma do app.js (_tratAlinharPapel) e do protocolo-avaliacoes.js:
         marcado como testemunha ⇔ papel diferente de experimental */
      if (!papel) return;
      if (papel !== 'experimental' && !marcada) out.push(t.id + ' tem papel "' + (PAPEIS[papel] || papel) + '", mas não está marcado como Testemunha nos tratamentos');
      if (papel === 'experimental' && marcada) out.push(t.id + ' está marcado como Testemunha, mas o papel diz "Experimental"');
    });
    return out;
  }
  function diagnostico(qid, st) {
    var falta = [], aviso = [];
    var tr = st.tratamentos || [];
    if (!txt(st.codigo || st.nome, '')) falta.push({ txt: 'código do estudo', etapa: 1 });
    if (tr.length < 2) falta.push({ txt: 'pelo menos 2 tratamentos', etapa: 3 });
    if (tr.some(function (t) { return !txt(t.produto, ''); })) falta.push({ txt: 'produto de algum tratamento', etapa: 3 });
    var test = ''; try { test = w.studyTestemunha(st); } catch (e) {}
    if (tr.some(function (t) { return t.id !== test && !t.testemunha && !txt(t.dose, ''); })) falta.push({ txt: 'dose de algum tratamento', etapa: 3 });
    if (!tr.some(function (t) { return t.testemunha; })) aviso.push({ txt: 'nenhum tratamento marcado como Testemunha (o % de controle usa o 1º)', etapa: 3 });
    if (!txt((st.protocolo || {}).tamanhoParcela, '')) aviso.push({ txt: 'tamanho da parcela (o croqui de grade precisa)', etapa: 1 });
    if (!txt(st.dataInicio, '')) aviso.push({ txt: 'data da 1ª aplicação (DAA e agenda dependem dela)', etapa: 2 });
    if (!(parseInt(st.numRepeticoes, 10) > 0)) falta.push({ txt: 'repetições', etapa: 3 });
    testemunhaConflitos(st).forEach(function (c) { aviso.push({ txt: c, papel: true }); });
    var base = tr.filter(function (t) { return t && t.id === test; })[0];
    if (base && base.testemunha && (base.papelControle === 'positivo' || base.papelControle === 'sem_alvo'))
      aviso.push({ txt: 'o % de controle está usando ' + base.id + ' (' + PAPEIS[base.papelControle] + ') como base, porque não há testemunha sem intervenção marcada', papel: true });
    return { falta: falta, aviso: aviso };
  }
  function resumo(qid, st) {
    var tr = st.tratamentos || [], reps = parseInt(st.numRepeticoes, 10) || 0;
    var PV = w.ProtocoloVivoCore, inf = null; try { inf = PV ? PV.info(st) : null; } catch (e) {}
    var vars = ((st.avaliacaoProtocolo || {}).variaveis || []).map(function (v) { return v.nome; });
    if (!vars.length) { var vv = {}; (st.avaliacoes || []).forEach(function (a) { (a.variaveis || []).forEach(function (n) { vv[n] = 1; }); }); vars = Object.keys(vv); }
    var pos = null; try { pos = w.croquiPos ? w.croquiPos(st) : null; } catch (e) {}
    return {
      codigo: txt(st.codigo || st.nome, st.id), tipo: txt(st.tipoEstudo, '—'), objetivo: txt(st.objetivo || st.descricao, ''),
      cultura: txt(st.cultura, ''), alvo: txt(st.alvo, ''), parcela: txt((st.protocolo || {}).tamanhoParcela, ''),
      tratamentos: tr.map(function (t) {
        return { id: t.id, produto: txt(t.produto, '—'), dose: txt(t.dose, t.testemunha ? '—' : ''), testemunha: !!t.testemunha,
          papel: t.papelControle ? (PAPEIS[t.papelControle] || t.papelControle) : (t.testemunha ? 'Testemunha' : 'Experimental') };
      }),
      desenho: st.desenho === 'faixas' ? 'Faixas (um tratamento por área)' : 'Blocos ao acaso (DBC)',
      reps: reps, parcelas: tr.length * reps, randomizado: !!st.randomizado,
      croqui: pos ? (pos.livre ? 'parcelas livres marcadas no mapa' : 'grade posicionada no mapa') : 'não posicionado',
      metodo: txt(st.metodoAplicacao, 'não declarado') + (st.metodoPorTratamento ? ' (varia por tratamento)' : ''),
      inicio: br(st.dataInicio), nApl: parseInt(st.numAplicacoes, 10) || 0, intervalo: parseInt(st.intervaloDias, 10) || 0,
      janela: !!(st.janela && Object.keys(st.janela).length),
      variaveis: vars, avalNum: parseInt(st.avalNum, 10) || 0, avalIntervalo: parseInt(st.avalIntervalo, 10) || 0, avalInicio: br(st.avalInicio),
      aprovado: !!(inf && inf.aprovado), versao: inf && inf.versao, emendas: (st.emendas || []).length, desvios: (st.desvios || []).length,
      finalizado: typeof w.estudoFinalizado === 'function' ? !!w.estudoFinalizado(st) : false,
      lab: typeof w.studyEhBancada === 'function' ? !!w.studyEhBancada(qid) : false
    };
  }

  /* ------------------------------------------------------------------ tela --- */
  function estilo() {
    if (d.getElementById('protoMenuCss')) return;
    var s = d.createElement('style'); s.id = 'protoMenuCss';
    s.textContent = '#protoMenu{position:fixed;inset:0;margin:auto;height:fit-content;border:0;padding:0;max-width:min(760px,100vw);width:100%;max-height:100dvh;background:var(--surface,#fff);color:var(--text,#1d2723);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.45)}' +
      '#protoMenu::backdrop{background:rgba(10,14,12,.55)}' +
      '.pm-head{position:sticky;top:0;z-index:2;display:flex;align-items:flex-start;gap:10px;padding:16px 18px 12px;background:var(--surface,#fff);border-bottom:1px solid var(--border,#dce2de)}' +
      '.pm-head h2{margin:0;font-size:19px}.pm-head p{margin:3px 0 0;font-size:12px;color:var(--text-2,#55615b)}.pm-x{margin-left:auto;border:0;background:transparent;font-size:24px;line-height:1;cursor:pointer;color:inherit;padding:2px 6px}' +
      '.pm-body{padding:12px 18px 20px;display:grid;gap:12px}' +
      '.pm-chip{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;margin-left:6px;vertical-align:middle}' +
      '.pm-ok{background:var(--ag-ok-bg,rgba(22,163,74,.1));color:var(--ag-ok,#16a34a)}.pm-warn{background:var(--ag-warn-bg,rgba(217,119,6,.1));color:var(--ag-warn,#d97706)}.pm-err{background:var(--ag-err-bg,rgba(220,38,38,.08));color:var(--ag-err,#dc2626)}' +
      '.pm-falta{border:1px solid var(--ag-warn-line,rgba(217,119,6,.3));background:var(--ag-warn-bg,rgba(217,119,6,.06));border-radius:12px;padding:10px 12px;font-size:13px}' +
      '.pm-falta ul{margin:6px 0 0;padding-left:18px}.pm-falta li{margin:3px 0}.pm-falta a{color:var(--ag-info,#2563eb);cursor:pointer;text-decoration:underline}' +
      '.pm-sec{border:1px solid var(--border,#dce2de);border-radius:12px;padding:12px 14px;background:var(--surface-2,#f6f8f7)}' +
      '.pm-sec h3{margin:0 0 6px;font-size:14px;display:flex;align-items:center;gap:6px}.pm-sec h3 span{font-size:16px}' +
      '.pm-dl{display:grid;grid-template-columns:minmax(110px,max-content) 1fr;gap:3px 12px;font-size:13px;margin:0}.pm-dl dt{color:var(--text-2,#55615b)}.pm-dl dd{margin:0;overflow-wrap:anywhere}' +
      '.pm-tab{width:100%;border-collapse:collapse;font-size:12.5px;margin:4px 0}.pm-tab th,.pm-tab td{text-align:left;padding:5px 6px;border-bottom:1px solid var(--border,#dce2de)}.pm-tab th{color:var(--text-2,#55615b);font-weight:600}' +
      '.pm-acts{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px}.pm-acts button{min-height:38px;border-radius:9px;border:1px solid var(--border,#c9d3c9);background:var(--surface,#fff);color:inherit;padding:0 12px;font:600 12.5px system-ui,sans-serif;cursor:pointer}' +
      '.pm-acts button.pm-pri{background:var(--accent,#1f242a);color:var(--accent-deep,#fff);border-color:transparent}.pm-acts button:disabled{opacity:.45;cursor:not-allowed}' +
      '@media (max-width:600px){#protoMenu{border-radius:0;height:100dvh;max-height:100dvh}.pm-dl{grid-template-columns:1fr}.pm-dl dt{margin-top:4px}}';
    d.head.appendChild(s);
  }
  function botoes(lista, fin) {
    return '<div class="pm-acts">' + lista.map(function (b) {
      return '<button type="button" data-pm="' + esc(b[0]) + '"' + (b[2] ? ' class="pm-pri"' : '') + ((fin && b[3] !== true) ? ' disabled title="Estudo finalizado"' : '') + '>' + esc(b[1]) + '</button>';
    }).join('') + '</div>';
  }
  function html(qid, st) {
    var r = resumo(qid, st), dg = diagnostico(qid, st), fin = r.finalizado;
    var h = '<div class="pm-head"><div><h2>📋 Protocolo · ' + esc(r.codigo) +
      (r.aprovado ? '<span class="pm-chip pm-ok">Aprovado · v' + esc(r.versao) + '</span>' : '<span class="pm-chip pm-warn">Rascunho</span>') +
      (fin ? '<span class="pm-chip pm-err">Finalizado</span>' : '') + '</h2>' +
      '<p>Tudo do protocolo num lugar só. Cada botão abre o editor certo; nada é gravado nesta tela.</p></div>' +
      '<button class="pm-x" data-pm="fechar" aria-label="Fechar">×</button></div><div class="pm-body">';
    if (dg.falta.length || dg.aviso.length) {
      h += '<div class="pm-falta"><b>' + (dg.falta.length ? 'Falta para o protocolo ficar completo' : 'Vale conferir') + '</b><ul>' +
        dg.falta.map(function (f) { return '<li>' + esc(f.txt) + ' — <a data-pm-etapa="' + f.etapa + '">preencher</a></li>'; }).join('') +
        dg.aviso.map(function (f) { return '<li>' + esc(f.txt) + ' — <a ' + (f.papel ? 'data-pm="papeis"' : 'data-pm-etapa="' + f.etapa + '"') + '>conferir</a></li>'; }).join('') + '</ul></div>';
    } else h += '<div class="pm-falta" style="border-color:var(--ag-ok-line,rgba(22,163,74,.3));background:var(--ag-ok-bg,rgba(22,163,74,.06))"><b>✓ Protocolo completo.</b></div>';

    h += '<section class="pm-sec"><h3><span>🧾</span>1. Identificação</h3><dl class="pm-dl">' +
      '<dt>Código</dt><dd>' + esc(r.codigo) + '</dd><dt>Tipo de estudo</dt><dd>' + esc(r.tipo) + '</dd>' +
      (r.objetivo ? '<dt>Objetivo</dt><dd>' + esc(r.objetivo) + '</dd>' : '') +
      '<dt>Cultura · alvo</dt><dd>' + esc([r.cultura || 'cultura da quadra', r.alvo || 'sem alvo'].join(' · ')) + '</dd>' +
      '<dt>Parcela</dt><dd>' + esc(r.parcela ? r.parcela + ' m' : 'não informada') + '</dd></dl>' +
      botoes([['etapa1', 'Editar identificação e parcela', true], ['etapa2', 'Cultura, alvo e execução'], ['importar', 'Importar de planilha']], fin) + '</section>';

    h += '<section class="pm-sec"><h3><span>🧪</span>2. Tratamentos, doses e papéis</h3><table class="pm-tab"><tr><th>Trat.</th><th>Produto</th><th>Dose</th><th>Papel</th></tr>' +
      r.tratamentos.map(function (t) { return '<tr><td><b>' + esc(t.id) + '</b></td><td>' + esc(t.produto) + '</td><td>' + esc(t.dose || '—') + '</td><td>' + esc(t.papel) + (t.testemunha ? ' ✓' : '') + '</td></tr>'; }).join('') +
      '</table><div style="font-size:11.5px;color:var(--text-2,#55615b)">✓ = marcado como Testemunha (base do % de controle e da AACPD).</div>' +
      botoes([['etapa3', 'Tratamentos, doses e testemunha', true], ['papeis', 'Papéis dos tratamentos']], fin) + '</section>';

    h += '<section class="pm-sec"><h3><span>🧩</span>3. Delineamento e parcelas</h3><dl class="pm-dl">' +
      '<dt>Desenho</dt><dd>' + esc(r.desenho) + '</dd><dt>Repetições</dt><dd>' + r.reps + ' · ' + r.parcelas + ' parcelas</dd>' +
      '<dt>Randomização</dt><dd>' + (r.randomizado ? 'sorteada' : 'não sorteada (ordem de cadastro)') + '</dd>' +
      '<dt>Croqui</dt><dd>' + esc(r.croqui) + '</dd></dl>' +
      botoes([['etapa3', 'Delineamento e repetições', true], [r.randomizado ? 'ordem' : 'randomizar', r.randomizado ? 'Ordem das parcelas' : 'Sortear a ordem'],
        ['croqui', 'Croqui em grade no mapa'], ['livre', 'Parcelas livres (pomar / árvores)']].concat(r.lab ? [] : []), fin) + '</section>';

    h += '<section class="pm-sec"><h3><span>💧</span>4. Aplicação</h3><dl class="pm-dl">' +
      '<dt>Método</dt><dd>' + esc(r.metodo) + '</dd><dt>1ª aplicação</dt><dd>' + esc(r.inicio || 'não informada') + '</dd>' +
      '<dt>Aplicações</dt><dd>' + r.nApl + (r.nApl > 1 ? ' · a cada ' + r.intervalo + ' dias' : '') + '</dd>' +
      '<dt>Janela de condições</dt><dd>' + (r.janela ? 'declarada' : 'não declarada (opcional)') + '</dd></dl>' +
      botoes([['etapa2', 'Datas, nº e janela', true], ['etapa3', 'Método de aplicação'], ['etapa4', 'Preparo de calda'], ['calc', 'Calculadora', false, true]], fin) + '</section>';

    h += '<section class="pm-sec"><h3><span>📊</span>5. Avaliações</h3><dl class="pm-dl">' +
      '<dt>Variáveis</dt><dd>' + (r.variaveis.length ? esc(r.variaveis.join(', ')) : 'nenhuma ainda') + '</dd>' +
      '<dt>Programação</dt><dd>' + (r.avalNum ? r.avalNum + ' avaliação(ões) a cada ' + r.avalIntervalo + ' dias' + (r.avalInicio ? ', a partir de ' + esc(r.avalInicio) : '') : 'sem datas geradas') + '</dd></dl>' +
      botoes([['papeis', 'Variáveis, escalas e aplicabilidade', true], ['etapa4', 'Programação das datas']], fin) + '</section>';

    h += '<section class="pm-sec"><h3><span>📜</span>6. Aprovação, emendas e desvios</h3><dl class="pm-dl">' +
      '<dt>Situação</dt><dd>' + (r.aprovado ? 'aprovado, versão ' + esc(r.versao) + ' — mudar o protocolo vira emenda com motivo' : 'rascunho — editável livremente') + '</dd>' +
      '<dt>Emendas</dt><dd>' + r.emendas + '</dd><dt>Desvios</dt><dd>' + r.desvios + '</dd></dl>' +
      botoes((r.aprovado ? [] : [['aprovar', 'Aprovar protocolo', true]]).concat([['desvio', 'Registrar desvio'], ['historico', 'Ver histórico na ficha', false, true], ['planilha', 'Exportar planilha', false, true]]), fin) + '</section>';
    return h + '</div>';
  }

  var atual = null;
  function abrir(qid, sid) {
    var st = estudo(qid, sid); if (!st) return false;
    estilo();
    var dlg = d.getElementById('protoMenu');
    if (!dlg) {
      dlg = d.createElement('dialog'); dlg.id = 'protoMenu'; d.body.appendChild(dlg);
      dlg.addEventListener('click', function (ev) {
        if (ev.target === dlg) return dlg.close();
        var a = ev.target.closest('[data-pm],[data-pm-etapa]'); if (!a || a.disabled) return;
        acao(a.getAttribute('data-pm') || ('etapa' + a.getAttribute('data-pm-etapa')));
      });
    }
    atual = { qid: qid, sid: sid };
    dlg.innerHTML = html(qid, st);
    if (!dlg.open) { try { dlg.showModal(); } catch (e) { dlg.setAttribute('open', ''); } }
    return true;
  }
  function fechar() { var dlg = d.getElementById('protoMenu'); if (dlg && dlg.open) dlg.close(); }
  function acao(k) {
    if (!atual) return;
    var q = atual.qid, s = atual.sid;
    if (k === 'fechar') return fechar();
    fechar();
    var m = /^etapa(\d)$/.exec(k);
    try {
      if (m) { w.openStudyEditV2(q, s); w._seStudyGo(+m[1]); return; }
      if (k === 'importar') { w.openStudyEditV2(q, s); w._seStudyGo(1); var b = d.getElementById('protoFile'); if (b && b.scrollIntoView) b.parentNode.scrollIntoView({ block: 'center' }); return; }
      if (k === 'papeis') return w.openProtocoloAvaliacoes(q, s);
      if (k === 'ordem') return w.openRandomizacaoModal(q, s);
      if (k === 'randomizar') return w.toggleStudyRandomizado(q, s);
      if (k === 'croqui') return w.posicionarCroquiDoEstudo(q, s);
      if (k === 'livre') { if (typeof w.closeStudyDetail === 'function') w.closeStudyDetail(); if (typeof w.closeDetail === 'function') w.closeDetail(); return w.AgCroquiLivre && w.AgCroquiLivre.abrirLivre(q, s); }
      if (k === 'calc') return (typeof w.studyEhBancada === 'function' && w.studyEhBancada(q) && w.openCalcLab) ? w.openCalcLab(q, s) : w.openCalcAplicacao(q, s);
      if (k === 'aprovar') return w.aprovarProtocolo(q, s);
      if (k === 'desvio') return w.registrarDesvio(q, s);
      if (k === 'planilha') return w.showStudyWorkbookFormats(q, s);
      if (k === 'historico') { w.openStudyDetail(q, s); setTimeout(function () { var el = d.getElementById('study-protocolo-vivo'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250); return; }
    } catch (e) { try { console.warn('[protocolo-menu]', k, e); } catch (x) {} }
  }

  /* Botão "📋 Protocolo" na ficha do estudo, ao lado do antigo
     "Protocolo: avaliações e controles" (que continua lá). */
  function injetar() {
    var antigos = d.querySelectorAll('button[onclick*="openProtocoloAvaliacoes"]');
    Array.prototype.forEach.call(antigos, function (b) {
      if (b.previousElementSibling && b.previousElementSibling.hasAttribute && b.previousElementSibling.hasAttribute('data-protomenu')) return;
      var m = /openProtocoloAvaliacoes\(([^,]+),([^)]+)\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
      var qid, sid; try { qid = JSON.parse(m[1].replace(/&quot;/g, '"')); sid = JSON.parse(m[2].replace(/&quot;/g, '"')); } catch (e) { return; }
      var nb = d.createElement('button'); nb.type = 'button'; nb.className = b.className || 'btn-sm';
      nb.setAttribute('data-protomenu', '1'); nb.textContent = '📋 Protocolo (tudo)';
      nb.style.cssText = 'font-weight:800;margin-right:6px';
      nb.addEventListener('click', function () { abrir(qid, sid); });
      b.parentNode.insertBefore(nb, b);
    });
  }
  var _agendado = false;
  function vigiar() {
    if (typeof w.MutationObserver !== 'function' || !d.body) return;
    new w.MutationObserver(function () {
      if (_agendado) return; _agendado = true;
      (w.requestAnimationFrame || setTimeout)(function () { _agendado = false; try { injetar(); } catch (e) {} });
    }).observe(d.body, { childList: true, subtree: true });
  }

  w.AgProtocoloMenu = { abrir: abrir, fechar: fechar, resumo: resumo, diagnostico: diagnostico, testemunhaConflitos: testemunhaConflitos, html: html, injetar: injetar };
  w.openProtocoloMenu = abrir;
  vigiar();
})(typeof window !== 'undefined' ? window : this);
