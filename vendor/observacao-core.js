/* ============================================================================
   ObservacaoCore — a observação canônica (roadmap §16, Fase 11)
   ----------------------------------------------------------------------------
   Cada estudo guarda as notas do jeito que a tela precisou: grade por parcela,
   subamostras em `bruto`, n/N em razão, dois leitores em dupla leitura, momento
   ora em DAT, ora em HAT, ora derivado da data. Para a tela isso está certo.
   Para a camada de conhecimento é uma língua por ensaio.

   Este motor traduz um estudo para UMA forma só:

     observação = organização + estudo + ambiente + local + parcela + tratamento
                  + dose + cultura + alvo + BBCH + variável + momento + valor
                  + unidade + método

   E dá a cada observação uma IDENTIDADE ESTÁVEL, que é o que os eventos formais
   (eventos-core.js) usam para dizer "esta nota foi corrigida de 12 para 21".

   CINCO REGRAS

   1. PROJEÇÃO, NÃO MIGRAÇÃO. Lê o estudo e devolve objetos novos. Nunca escreve
      no dado de origem; estudo antigo continua legível do jeito que era.
   2. IDENTIDADE NÃO CONTÉM VALOR. O id é estudo + avaliação + parcela + variável
      + leitor. Corrigir o valor não muda a identidade — senão a correção
      apontaria para uma observação que deixou de existir.
   3. O QUE NÃO SE SABE FICA null. Momento sem data de referência não vira
      "0 DAA"; alvo sem código EPPO não ganha código por parecença. Um campo
      vazio é informação: diz o que ainda falta para o dado ser comparável.
   4. VOCABULÁRIO POR INJEÇÃO. O código EPPO de cultura e alvo vem de
      `deps.eppo(nome, 'cultura'|'alvo')`. Sem ele, o motor ainda funciona e
      diz `resolvido:false`, para a busca poder avisar que não é completa.
   5. n E VARIÂNCIA, NÃO SÓ MÉDIA. O resumo por tratamento guarda n, média,
      variância e desvio. Meta-análise só existe quando isso foi guardado.
   ============================================================================ */
(function (root) {
  'use strict';
  var VERSAO = '1.0.0';
  var SCHEMA = 1;

  function lista(v) { return Array.isArray(v) ? v : []; }
  function txt(v) { return v == null ? '' : String(v).trim(); }
  function ouNull(v) { var t = txt(v); return t ? t : null; }
  function numero(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v !== 'string' || !/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v.trim())) return null;
    var n = Number(v.trim().replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function clone(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }

  /* ---- identidade ------------------------------------------------------- */

  /* Mesma forma que o portal já usa para chave de estudo: JSON codificado.
     Não tem '/', então serve de id de documento no Firestore. */
  function chaveEstudo(qid, sid) { return encodeURIComponent(JSON.stringify([txt(qid), txt(sid)])); }

  function idObservacao(p) {
    p = p || {};
    var partes = [txt(p.qid), txt(p.sid), txt(p.avaliacao), txt(p.parcela), txt(p.variavel), txt(p.leitor)];
    if (!partes[1] || !partes[2] || !partes[3] || !partes[4]) {
      throw new Error('idObservacao: estudo, avaliação, parcela e variável são obrigatórios');
    }
    return 'obs:' + encodeURIComponent(JSON.stringify(partes));
  }
  function partesDoId(id) {
    var s = txt(id);
    if (s.indexOf('obs:') !== 0) return null;
    try {
      var a = JSON.parse(decodeURIComponent(s.slice(4)));
      if (!Array.isArray(a) || a.length !== 6) return null;
      return { qid: a[0], sid: a[1], avaliacao: a[2], parcela: a[3], variavel: a[4], leitor: a[5] || null };
    } catch (e) { return null; }
  }

  /* ---- vocabulário -------------------------------------------------------- */

  /* Código EPPO: 5 ou 6 caracteres maiúsculos (ex.: cinco letras de espécie,
     ou seis com prefixo numérico de grupo). Só a FORMA é checada aqui; se o
     código existe é pergunta para a tabela injetada. */
  function codigoEppo(c) {
    var s = txt(c).toUpperCase();
    return /^[0-9A-Z]{5,6}$/.test(s) ? s : null;
  }
  function termo(nome, declarado, tipo, deps) {
    var rot = ouNull(nome), cod = codigoEppo(declarado);
    if (cod) return { nome: rot, eppo: cod, resolvido: true, fonte: 'declarado' };
    if (rot && deps && typeof deps.eppo === 'function') {
      var r = null;
      try { r = codigoEppo(deps.eppo(rot, tipo)); } catch (e) { r = null; }
      if (r) return { nome: rot, eppo: r, resolvido: true, fonte: 'tabela' };
    }
    return { nome: rot, eppo: null, resolvido: false, fonte: null };
  }

  /* ---- momento ------------------------------------------------------------ */

  function dia(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(txt(iso));
    if (!m) {
      var b = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(txt(iso));
      if (!b) return null;
      m = [null, b[3], b[2], b[1]];
    }
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isFinite(t) ? t / 864e5 : null;
  }
  /* Explícito (DAT/HAT declarado) vence. Sem ele, DAA a partir da data de
     referência do contexto. Sem referência: null — nunca "0 DAA". */
  function momento(av, dataReferencia) {
    var m = av && av.momento, v = m ? numero(m.valor) : null;
    var u = m && (m.unidade === 'HAT' || m.unidade === 'DAT') ? m.unidade : null;
    if (u && v !== null) return { unidade: u, valor: v, dias: u === 'HAT' ? v / 24 : v, explicito: true };
    var a = dia(av && av.data), b = dia(dataReferencia);
    if (a !== null && b !== null) return { unidade: 'DAA', valor: a - b, dias: a - b, explicito: false };
    return { unidade: null, valor: null, dias: null, explicito: false };
  }

  /* ---- grade -------------------------------------------------------------- */

  /* Mesma herança que a grade da avaliação: a 1ª repetição aceita a chave
     antiga só com o id do tratamento. */
  function celula(m, trat, rep, v) {
    m = m || {};
    var x = (m[trat + 'R' + rep] || {})[v];
    if ((x == null || x === '') && rep === 1) x = (m[trat] || {})[v];
    return x;
  }
  /* A variável sem esquema próprio herda da avaliação anterior mais recente,
     como a tela faz. Sem isso a 2ª avaliação de um estudo antigo some. */
  function esquema(est, av) {
    if (lista(av.variaveis).length) return av;
    var avs = lista(est.avaliacoes), idx = avs.indexOf(av);
    var prev = avs.map(function (a, i) { return { a: a, i: i }; }).filter(function (x) {
      return x.a && x.a !== av && lista(x.a.variaveis).length &&
        (x.i < idx || txt(x.a.data) <= txt(av.data));
    }).sort(function (x, y) { return txt(x.a.data).localeCompare(txt(y.a.data)) || x.i - y.i; });
    if (!prev.length) return av;
    var f = prev[prev.length - 1].a;
    return Object.assign({}, av, { variaveis: f.variaveis, tipos: f.tipos, varcfg: f.varcfg });
  }
  function bruto(av, trat, rep, v) {
    var b = celula(av.bruto, trat, rep, v);
    if (!b || typeof b !== 'object') return null;
    var out = {};
    if (Array.isArray(b.sub)) out.subamostras = b.sub.map(function (x) { return numero(x); });
    if (b.n != null || b.N != null) { out.n = numero(b.n); out.N = numero(b.N); }
    return Object.keys(out).length ? out : null;
  }

  /* ---- extração ----------------------------------------------------------- */

  /* ctx: { organizacao, qid, local, ambiente ('campo'|'laboratorio'),
            cultura, dataReferencia } — o que o estudo sozinho não sabe.
     deps: { eppo(nome, tipo) } */
  function extrair(estudo, ctx, deps) {
    var s = estudo || {}; ctx = ctx || {};
    var qid = txt(ctx.qid), sid = txt(s.id);
    if (!sid) return [];
    var reps = Math.max(1, parseInt(s.numRepeticoes, 10) || 1);
    var cultura = termo(txt(s.cultura) || txt(ctx.cultura), s.culturaEppo, 'cultura', deps);
    var alvo = termo(txt(s.alvoSci) || txt(s.alvo), s.alvoEppo, 'alvo', deps);
    if (alvo.nome && txt(s.alvo) && txt(s.alvoSci)) alvo.comum = txt(s.alvo);
    var base = {
      schema: SCHEMA,
      organizacao: ouNull(ctx.organizacao),
      estudo: { chave: chaveEstudo(qid, sid), qid: qid || null, sid: sid, codigo: ouNull(s.codigo) },
      ambiente: ouNull(ctx.ambiente),
      local: ouNull(ctx.local),
      desenho: ouNull(s.desenho),
      cultura: cultura,
      alvo: alvo
    };
    var trats = {};
    lista(s.tratamentos).forEach(function (t) { if (t && txt(t.id)) trats[txt(t.id)] = t; });
    var out = [];

    lista(s.avaliacoes).forEach(function (av0) {
      if (!av0 || !txt(av0.id)) return;
      var av = esquema(s, av0);
      var mom = momento(av0, ctx.dataReferencia);
      lista(av.variaveis).forEach(function (v) {
        var cfg = (av.varcfg || {})[v] || {}, tipo = ouNull((av.tipos || {})[v]) || ouNull(cfg.tipo);
        var variavel = {
          nome: txt(v), tipo: tipo, unidade: ouNull(cfg.unidade),
          sentido: ouNull(cfg.sentido), escalaMax: numero(cfg.escalaMax)
        };
        var metodo = {
          avaliacao: ouNull(av0.tipo), subamostras: Math.max(1, Math.round(numero(cfg.sub) || 1)),
          descricao: ouNull(cfg.metodo)
        };
        Object.keys(trats).forEach(function (tid) {
          var t = trats[tid];
          for (var r = 1; r <= reps; r++) {
            var leituras = [{ leitor: null, notas: av.notas }];
            if (av0.duplaLeitura && av0.avaliadores) {
              ['A', 'B'].forEach(function (k) {
                var l = av0.avaliadores[k];
                if (l && l.notas) leituras.push({ leitor: k, notas: l.notas, quem: ouNull(l.nome) || ouNull(l.por) });
              });
            }
            leituras.forEach(function (l) {
              var cru = celula(l.notas, tid, r, v);
              var val = numero(cru), b = l.leitor ? null : bruto(av0, tid, r, v);
              /* Célula nunca tocada não é observação: é pendência. */
              if (val === null && txt(cru) === '' && !b) return;
              var parcela = tid + 'R' + r;
              out.push(Object.assign(clone(base), {
                id: idObservacao({ qid: qid, sid: sid, avaliacao: av0.id, parcela: parcela, variavel: v, leitor: l.leitor }),
                avaliacao: { id: txt(av0.id), data: ouNull(av0.data), hora: ouNull(av0.hora) },
                parcela: { chave: parcela, tratamento: tid, repeticao: r },
                tratamento: {
                  id: tid, produto: ouNull(t.produto), ingredienteAtivo: ouNull(t.ingredienteAtivo || t.ia),
                  dose: ouNull(t.dose), doseUnidade: ouNull(t.doseUnidade || s.doseUnidade),
                  testemunha: !!t.testemunha
                },
                bbch: ouNull(av0.bbch),
                variavel: clone(variavel),
                momento: clone(mom),
                valor: val,
                valorOriginal: val === null && txt(cru) ? txt(cru) : null,
                bruto: b,
                metodo: clone(metodo),
                leitor: l.leitor,
                situacao: 'valida'
              }));
            });
          }
        });
      });
    });
    return out;
  }

  /* ---- resumo para comparação entre estudos ------------------------------ */

  /* Por estudo × avaliação × variável × tratamento. Só leitura consolidada
     (leitor null) e só observação válida. Guarda n e variância: é o mínimo
     que uma meta-análise precisa, e o que "só a média" nunca devolve. */
  function resumir(observacoes) {
    var g = new Map();
    lista(observacoes).forEach(function (o) {
      if (!o || o.leitor || o.situacao !== 'valida' || o.valor === null) return;
      var k = JSON.stringify([o.estudo.chave, o.avaliacao.id, o.variavel.nome, o.tratamento.id]);
      if (!g.has(k)) g.set(k, { chave: k, estudo: o.estudo, avaliacao: o.avaliacao, variavel: o.variavel,
        tratamento: o.tratamento, momento: o.momento, cultura: o.cultura, alvo: o.alvo,
        ambiente: o.ambiente, organizacao: o.organizacao, valores: [] });
      g.get(k).valores.push(o.valor);
    });
    return Array.from(g.values()).map(function (x) {
      var n = x.valores.length, m = x.valores.reduce(function (a, b) { return a + b; }, 0) / n;
      var ss = x.valores.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0);
      var v = n > 1 ? ss / (n - 1) : null;
      delete x.valores;
      return Object.assign(x, { n: n, media: m, variancia: v, dp: v === null ? null : Math.sqrt(v) });
    });
  }

  /* ---- comparabilidade ---------------------------------------------------- */

  /* Dois resumos só entram na mesma meta-análise se falam da mesma coisa. A
     resposta é a LISTA do que falta, não um sim/não: é ela que a tela mostra. */
  function faltasParaComparar(a, b) {
    var f = [];
    if (!a || !b) return ['resumo ausente'];
    if (!a.variavel.unidade || !b.variavel.unidade) f.push('unidade da variável não declarada');
    else if (a.variavel.unidade !== b.variavel.unidade) f.push('unidades diferentes');
    if (a.variavel.tipo !== b.variavel.tipo) f.push('tipo de variável diferente');
    if (!a.alvo.eppo || !b.alvo.eppo) f.push('alvo sem código EPPO');
    else if (a.alvo.eppo !== b.alvo.eppo) f.push('alvos diferentes');
    if (!a.cultura.eppo || !b.cultura.eppo) f.push('cultura sem código EPPO');
    else if (a.cultura.eppo !== b.cultura.eppo) f.push('culturas diferentes');
    if (a.momento.dias === null || b.momento.dias === null) f.push('momento desconhecido');
    if (a.ambiente !== b.ambiente) f.push('ambientes diferentes (campo × laboratório)');
    if (a.variancia === null || b.variancia === null) f.push('sem variância (n < 2)');
    return f;
  }

  var api = {
    VERSAO: VERSAO, SCHEMA: SCHEMA,
    numero: numero, chaveEstudo: chaveEstudo, idObservacao: idObservacao, partesDoId: partesDoId,
    codigoEppo: codigoEppo, termo: termo, momento: momento,
    extrair: extrair, resumir: resumir, faltasParaComparar: faltasParaComparar
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ObservacaoCore = api;
})(typeof self !== 'undefined' ? self : this);
