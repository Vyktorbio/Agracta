/* conhecimento-canonico.js — aba "Entre estudos" do Conhecimento
 *
 * As outras abas leem cada estudo do jeito que a tela dele grava. Esta lê
 * todos pela MESMA forma — a observação canônica (vendor/observacao-core.js)
 * — e junta o que fala da mesma coisa: mesma variável, mesma unidade, mesmo
 * alvo e mesma cultura. Por cima, os eventos formais: avaliação invalidada ou
 * registro excluído sai da conta, correção entra com o valor corrigido.
 *
 * QUATRO REGRAS
 * 1. SÓ LÊ. Nada aqui grava no estudo; a tela é projeção.
 * 2. CEGAMENTO VALE AQUI TAMBÉM. O nome do produto sai da projeção do
 *    Conhecimento (que já troca pelo código cego). O nome cru e o ingrediente
 *    ativo que a observação canônica carrega nunca chegam à tela.
 * 3. NÃO COMBINA. Mostra n, média e desvio de cada estudo lado a lado e diz,
 *    por grupo, o que ainda falta para uma meta-análise ser honesta (unidade,
 *    código EPPO, momento, variância). Juntar médias de ensaios diferentes num
 *    número só é exatamente o que esta aba se recusa a fazer.
 * 4. FINALIZADOS POR PADRÃO. Estudo em execução muda amanhã; dá para
 *    incluí-los, e o selo diz quando estão incluídos.
 */
(function (w) {
  'use strict';
  var O = w.ObservacaoCore, estado = { andamento: false, busca: '' }, eventos = {}, eppo = null, carregando = false;

  function lista(x) { return Array.isArray(x) ? x : []; }
  function normal(s) {
    s = String(s == null ? '' : s);
    return (s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s).toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* DAA conta da primeira aplicação registrada — a mesma âncora do relatório.
     Sem aplicação, fica sem referência e o momento fica desconhecido. */
  function primeiraAplicacao(st) {
    var ds = lista(st.aplicacoes).map(function (a) { return String((a && a.data) || ''); })
      .filter(function (d) { return /^\d{4}-\d{2}-\d{2}/.test(d) || /^\d{2}\/\d{2}\/\d{4}/.test(d); })
      .map(function (d) { return /^\d{2}\//.test(d) ? d.slice(6, 10) + '-' + d.slice(3, 5) + '-' + d.slice(0, 2) : d.slice(0, 10); })
      .sort();
    return ds[0] || null;
  }

  /* Resumos canônicos de um estudo projetado, com os eventos aplicados e o
     produto trocado pelo nome cegado da projeção. */
  function resumosDe(s, data, regs, eppoFn) {
    var q = (data || {})[s.qid] || {}, st = lista(q.estudos).find(function (x) { return x && x.id === s.sid; });
    if (!st) return { resumos: [], fora: 0 };
    var obs = O.extrair(st, { qid: s.qid, ambiente: s.ambiente, local: s.local, cultura: q.cultura,
                              dataReferencia: primeiraAplicacao(st) }, eppoFn ? { eppo: eppoFn } : null);
    var reg = regs && regs[O.chaveEstudo(s.qid, s.sid)];
    if (reg && reg.length && w.EventosCore) obs = w.EventosCore.aplicar(obs, reg);
    var fora = obs.filter(function (o) { return o.situacao !== 'valida'; }).length;
    var trats = {}; lista(s.tratamentos).forEach(function (t) { trats[t.id] = t; });
    var rs = O.resumir(obs).map(function (r) {
      var t = trats[r.tratamento.id] || {};
      r.tratamento = { id: r.tratamento.id, produto: t.produto || r.tratamento.id, dose: t.dose || '', testemunha: !!t.testemunha };
      r.codigo = s.codigo; r.local = s.local; r.finalizado = !!s.finalizado; r.chaveProjecao = s.key;
      return r;
    });
    return { resumos: rs, fora: fora };
  }

  function grupoDe(r) {
    return JSON.stringify([normal(r.variavel.nome), r.variavel.unidade || '',
      r.alvo.eppo || ('nome:' + normal(r.alvo.nome)), r.cultura.eppo || ('nome:' + normal(r.cultura.nome))]);
  }

  /* Grupos com pelo menos dois estudos. `faltas` é a união do que impede uma
     comparação formal entre quaisquer dois resumos do grupo. */
  function comparacoes(acervo, data, regs, op) {
    op = op || {};
    var todos = [], fora = 0, estudos = 0;
    lista(acervo && acervo.estudos).forEach(function (s) {
      if (!op.andamento && !s.finalizado) return;
      var r = resumosDe(s, data, regs, op.eppo);
      if (r.resumos.length) estudos++;
      fora += r.fora; todos = todos.concat(r.resumos);
    });
    var g = new Map();
    todos.forEach(function (r) {
      var k = grupoDe(r);
      if (!g.has(k)) g.set(k, { chave: k, variavel: r.variavel, alvo: r.alvo, cultura: r.cultura, linhas: [], estudos: new Set() });
      var x = g.get(k); x.linhas.push(r); x.estudos.add(r.estudo.chave);
    });
    var busca = normal(op.busca);
    var grupos = Array.from(g.values()).filter(function (x) {
      if (x.estudos.size < 2) return false;
      if (!busca) return true;
      return normal([x.variavel.nome, x.alvo.nome, x.alvo.comum, x.cultura.nome].join(' ')).indexOf(busca) >= 0;
    }).map(function (x) {
      var f = new Set();
      x.linhas.forEach(function (a) { x.linhas.forEach(function (b) {
        if (a !== b && a.estudo.chave !== b.estudo.chave) O.faltasParaComparar(a, b).forEach(function (m) { f.add(m); });
      }); });
      x.faltas = Array.from(f);
      x.nEstudos = x.estudos.size; delete x.estudos;
      x.linhas.sort(function (a, b) {
        return String(a.codigo).localeCompare(String(b.codigo), 'pt-BR') ||
          (a.momento.dias == null ? 1e9 : a.momento.dias) - (b.momento.dias == null ? 1e9 : b.momento.dias) ||
          String(a.tratamento.id).localeCompare(String(b.tratamento.id), undefined, { numeric: true });
      });
      return x;
    }).sort(function (a, b) { return b.nEstudos - a.nEstudos || normal(a.variavel.nome).localeCompare(normal(b.variavel.nome)); });
    return { grupos: grupos, estudos: estudos, fora: fora };
  }

  /* ---- tela ---------------------------------------------------------------- */
  function K() { return w.agConhecimento; }
  function momentoTxt(m) {
    if (!m || m.valor == null) return 'momento desconhecido';
    return String(Math.round(m.valor * 100) / 100).replace('.', ',') + ' ' + m.unidade;
  }
  function html(acervo) {
    var k = K(), e = k.esc, n = k.numero, bot = k.bot;
    if (!carregando && eppo === null) prefetch();
    var c = comparacoes(acervo, w.data, eventos, { andamento: estado.andamento, busca: estado.busca, eppo: eppo });
    var topo = '<p class="con-note">Cada linha é um estudo × tratamento × avaliação, lido pela mesma forma canônica. ' +
      'Os estudos ficam lado a lado e <b>não são combinados</b>. Um grupo reúne a mesma variável, unidade, alvo e cultura.' +
      (c.fora ? ' ' + c.fora + ' observação(ões) ficaram de fora por avaliação invalidada ou registro excluído (eventos formais).' : '') +
      (eppo && eppo.total ? '' : ' A tabela EPPO ainda está vazia, então alvo e cultura são agrupados pelo nome digitado.') + '</p>' +
      '<div class="con-filtros"><label>Buscar variável, alvo ou cultura<input id="conEntreBusca" data-con-entre="busca" type="search" value="' + e(estado.busca) + '" autocomplete="off"></label>' +
      bot('entreAndamento', estado.andamento ? 'Mostrando também em execução' : 'Só finalizados', 'aria-pressed="' + estado.andamento + '"') + '</div>';
    if (!c.grupos.length) return topo + '<p class="con-empty">Nenhuma variável aparece em dois ou mais ' +
      (estado.andamento ? '' : 'estudos finalizados ') + 'com a mesma unidade, alvo e cultura.</p>';
    return topo + c.grupos.map(function (gr) {
      var alvo = gr.alvo.nome ? (gr.alvo.nome + (gr.alvo.eppo ? ' · EPPO ' + gr.alvo.eppo : '')) : 'sem alvo';
      var cult = gr.cultura.nome ? (gr.cultura.nome + (gr.cultura.eppo ? ' · EPPO ' + gr.cultura.eppo : '')) : 'sem cultura';
      return '<section class="con-entre"><h3>' + e(gr.variavel.nome) + (gr.variavel.unidade ? ' <small>(' + e(gr.variavel.unidade) + ')</small>' : '') + '</h3>' +
        '<p class="con-note">' + e(alvo) + ' · ' + e(cult) + ' · ' + gr.nEstudos + ' estudos</p>' +
        (gr.faltas.length
          ? '<p class="con-note"><b>Para uma meta-análise ainda falta:</b> ' + e(gr.faltas.join('; ')) + '.</p>'
          : '<p class="con-note"><b>Comparáveis formalmente:</b> mesma unidade, alvo e cultura com código EPPO, momento conhecido e variância em todos.</p>') +
        '<div class="con-scroll"><table><thead><tr><th>Estudo</th><th>Tratamento</th><th>Momento</th><th>n</th><th>Média</th><th>DP</th><th>Ambiente</th></tr></thead><tbody>' +
        gr.linhas.map(function (r) {
          return '<tr><td>' + bot('estudo', e(r.codigo), 'data-key="' + e(r.chaveProjecao) + '"', 'link') + '<small>' + e(r.local || '') + (r.finalizado ? '' : ' · em execução') + '</small></td>' +
            '<td>' + e(r.tratamento.id) + ' · ' + e(r.tratamento.produto) + (r.tratamento.testemunha ? ' <small>testemunha</small>' : '') + (r.tratamento.dose ? '<small>' + e(r.tratamento.dose) + '</small>' : '') + '</td>' +
            '<td>' + e(momentoTxt(r.momento)) + '</td><td>' + n(r.n) + '</td><td>' + n(r.media) + '</td><td>' + (r.dp == null ? '—' : n(r.dp)) + '</td>' +
            '<td>' + (r.ambiente === 'laboratorio' ? 'Laboratório' : 'Campo') + '</td></tr>';
        }).join('') + '</tbody></table></div></section>';
    }).join('') + '<p class="con-note">n = parcelas com valor. DP = desvio-padrão amostral dessas parcelas. Diferenças entre estudos são associações, não causas: local, ano e pressão do alvo mudam junto.</p>';
  }
  function acao(a) {
    if (a === 'entreAndamento') { estado.andamento = !estado.andamento; K().pintar(); }
  }
  /* A tabela EPPO e os eventos chegam de forma assíncrona; quando chegam, a aba
     se redesenha. Sem eles a aba funciona — só agrupa pelo nome e sem eventos. */
  function prefetch() {
    carregando = true;
    var ps = [];
    if (w.EppoCore) ps.push(w.EppoCore.carregar().then(function (f) { eppo = f; }));
    if (w.AgractaEventos && w.AgractaEventos.exportar) {
      ps.push(Promise.resolve(w.AgractaEventos.sincronizar ? w.AgractaEventos.sincronizar() : null).catch(function () {})
        .then(function () { return w.AgractaEventos.exportar(); }).then(function (r) { eventos = r || {}; }, function () {}));
    }
    Promise.all(ps).then(function () { carregando = false; if (eppo === null) eppo = function () { return null; }; try { K().pintar(); } catch (e) {} });
  }
  if (w.document) w.document.addEventListener('input', function (ev) {
    if (!ev.target || !ev.target.dataset || ev.target.dataset.conEntre !== 'busca') return;
    estado.busca = ev.target.value;
    var pos = ev.target.selectionStart;
    K().pintar();
    var el = w.document.getElementById('conEntreBusca'); if (el) { el.focus(); try { el.setSelectionRange(pos, pos); } catch (e) {} }
  });
  if (!O) return;
  w.agConhecimentoAbas = lista(w.agConhecimentoAbas).concat([{ id: 'entre', rotulo: 'Entre estudos', html: html, acao: acao }]);
  w.agConhecimentoCanonico = { comparacoes: comparacoes, resumosDe: resumosDe, primeiraAplicacao: primeiraAplicacao,
    recarregar: function () { eppo = null; carregando = false; } };
})(window);
