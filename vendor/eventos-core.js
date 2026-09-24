/* ============================================================================
   EventosCore — ações críticas como eventos formais (roadmap §13, Fase 8)
   ----------------------------------------------------------------------------
   Hoje reabrir um estudo, reabrir uma avaliação assinada ou finalizar gravam
   uma linha em `study.audit`: texto livre dentro do próprio estudo, que o
   próximo save do aparelho reescreve inteiro. Serve para ler e não serve para
   provar nada.

   Aqui a ação crítica vira um EVENTO: objeto imutável, com tipo fechado,
   entidade alvo, de→para, motivo, autor, papel, instante e dispositivo, e um
   id que é o hash SHA-256 do próprio conteúdo. Mudar uma vírgula no evento
   muda o id, e `verificar` acusa.

   SEIS REGRAS

   1. TIPO FECHADO. Só existem os tipos da tabela TIPOS, e cada um declara o
      que exige: motivo, rubrica, de→para, papel mínimo. Evento que não cumpre
      a exigência não nasce.
   2. APPEND-ONLY. Nada se edita nem se apaga. Desfazer é outro evento
      (avaliação revalidada, registro restaurado), com motivo próprio.
   3. GRAFO, NÃO FILA. O Agracta trabalha offline: dois aparelhos podem reabrir
      a mesma coisa ao mesmo tempo. Cada evento aponta para os eventos que o
      aparelho conhecia (`pais`), como um commit. Juntar dois registros é
      unir conjuntos, e a ordem causal sai do grafo — nunca "o último aparelho
      vence".
   4. CORREÇÃO APONTA PARA A IDENTIDADE, NÃO PARA A POSIÇÃO. "Corrigir dado
      finalizado" aponta para o id estável da observação canônica
      (observacao-core.js) e diz o valor que ESPERAVA encontrar. Se o valor
      já não é aquele — outra correção chegou antes —, a correção vira
      CONFLITO visível, não sobrescrita silenciosa.
   5. PAPEL AINDA É AVISO. Os papéis do roadmap (técnico, supervisor, diretor,
      administrador) ainda não existem no app. Papel declarado abaixo do
      exigido é erro; papel ausente é aviso, até o app passar a declarar.
   6. O NAVEGADOR NÃO É A PALAVRA FINAL. Este motor garante que o evento é
      bem-formado e que o registro não foi adulterado depois de copiado. Quem
      impede o cliente de reescrever a coleção é o servidor (regras sem
      update/delete). O motor é a metade que roda igual nos dois lados.

   MOTOR PURO: sem DOM, sem armazenamento, sem relógio escondido — o instante
   entra pelo contexto (com padrão para a tela), e o teste roda no Node.
   ============================================================================ */
(function (root) {
  'use strict';
  var VERSAO = '1.0.0';
  var SCHEMA = 1;

  var PAPEIS = ['tecnico', 'supervisor', 'diretor', 'admin'];

  /* entidade: tipos de alvo aceitos · motivo/rubrica/dePara: exigências */
  var TIPOS = {
    'estudo.finalizado':    { entidade: ['estudo'], motivo: false, rubrica: true,  dePara: false, papel: 'diretor',    rotulo: 'Estudo finalizado' },
    'estudo.reaberto':      { entidade: ['estudo'], motivo: true,  rubrica: true,  dePara: false, papel: 'supervisor', rotulo: 'Estudo reaberto' },
    'protocolo.aprovado':   { entidade: ['estudo'], motivo: false, rubrica: true,  dePara: false, papel: 'diretor',    rotulo: 'Protocolo aprovado' },
    'protocolo.emendado':   { entidade: ['estudo'], motivo: true,  rubrica: false, dePara: true,   papel: 'diretor',    rotulo: 'Emenda ao protocolo' },
    'observacao.corrigida': { entidade: ['observacao'], motivo: true, rubrica: false, dePara: true, papel: 'supervisor', rotulo: 'Dado corrigido' },
    'avaliacao.invalidada': { entidade: ['avaliacao'], motivo: true, rubrica: true, dePara: false, papel: 'supervisor', rotulo: 'Avaliação invalidada' },
    'avaliacao.revalidada': { entidade: ['avaliacao'], motivo: true, rubrica: true, dePara: false, papel: 'supervisor', rotulo: 'Avaliação revalidada' },
    'registro.excluido':    { entidade: ['estudo', 'avaliacao', 'aplicacao', 'observacao', 'amostra'], motivo: true, rubrica: false, dePara: false, papel: 'supervisor', rotulo: 'Exclusão lógica' },
    'registro.restaurado':  { entidade: ['estudo', 'avaliacao', 'aplicacao', 'observacao', 'amostra'], motivo: true, rubrica: false, dePara: false, papel: 'supervisor', rotulo: 'Exclusão desfeita' },
    /* Linha da trilha antiga sem tipo formal equivalente: preservada, nunca promovida. */
    'legado.registro':      { entidade: ['estudo'], motivo: false, rubrica: false, dePara: false, papel: null, rotulo: 'Registro da trilha anterior', soLegado: true }
  };

  function txt(v) { return v == null ? '' : String(v).trim(); }
  function ouNull(v) { var t = txt(v); return t ? t : null; }
  function lista(v) { return Array.isArray(v) ? v : []; }

  /* ---- serialização estável ---------------------------------------------- */
  function estavel(v) {
    if (v === undefined) return 'null';
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'number' && !isFinite(v)) return 'null';
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) return '[' + v.map(estavel).join(',') + ']';
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; })
      .map(function (k) { return JSON.stringify(k) + ':' + estavel(v[k]); }).join(',') + '}';
  }

  /* ---- SHA-256 (síncrono, sem dependência) -------------------------------
     O crypto.subtle do navegador é assíncrono e não existe em http:// local;
     o hash do evento precisa sair igual no aparelho, no Node e no servidor. */
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  function utf8(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function sha256(str) {
    var b = utf8(String(str)), bits = b.length * 8;
    b.push(0x80);
    while (b.length % 64 !== 56) b.push(0);
    var hi = Math.floor(bits / 0x100000000), lo = bits >>> 0;
    b.push((hi >>> 24) & 255, (hi >>> 16) & 255, (hi >>> 8) & 255, hi & 255,
           (lo >>> 24) & 255, (lo >>> 16) & 255, (lo >>> 8) & 255, lo & 255);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var w = new Array(64);
    function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }
    for (var off = 0; off < b.length; off += 64) {
      for (var t = 0; t < 16; t++) {
        w[t] = (b[off + 4 * t] << 24) | (b[off + 4 * t + 1] << 16) | (b[off + 4 * t + 2] << 8) | b[off + 4 * t + 3];
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) | 0;
      }
      var a = H[0], c = H[1], d = H[2], e = H[3], f = H[4], g = H[5], h = H[6], k = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(f, 6) ^ rotr(f, 11) ^ rotr(f, 25);
        var ch = (f & g) ^ (~f & h);
        var t1 = (k + S1 + ch + K[t] + w[t]) | 0;
        var S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        var mj = (a & c) ^ (a & d) ^ (c & d);
        var t2 = (S0 + mj) | 0;
        k = h; h = g; g = f; f = (e + t1) | 0; e = d; d = c; c = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + c) | 0; H[2] = (H[2] + d) | 0; H[3] = (H[3] + e) | 0;
      H[4] = (H[4] + f) | 0; H[5] = (H[5] + g) | 0; H[6] = (H[6] + h) | 0; H[7] = (H[7] + k) | 0;
    }
    return H.map(function (x) { return ('00000000' + (x >>> 0).toString(16)).slice(-8); }).join('');
  }

  /* ---- montagem e validação ---------------------------------------------- */

  function conteudo(ev) {
    var c = {};
    Object.keys(ev).forEach(function (k) { if (k !== 'id') c[k] = ev[k]; });
    return c;
  }
  function idDe(ev) { return 'ev:' + sha256(estavel(conteudo(ev))); }

  function congelar(o) {
    if (o && typeof o === 'object' && !Object.isFrozen(o)) {
      Object.keys(o).forEach(function (k) { congelar(o[k]); });
      Object.freeze(o);
    }
    return o;
  }

  function validar(ev) {
    var erros = [], avisos = [];
    if (!ev || typeof ev !== 'object') return { erros: ['evento ausente'], avisos: avisos };
    var r = TIPOS[ev.tipo];
    if (!r) return { erros: ['tipo desconhecido: ' + txt(ev.tipo)], avisos: avisos };
    if (r.soLegado && !ev.legado) erros.push('tipo reservado à trilha anterior');
    var ent = ev.entidade || {};
    if (r.entidade.indexOf(ent.tipo) < 0) erros.push('entidade "' + txt(ent.tipo) + '" não serve para ' + ev.tipo);
    if (!txt(ent.id)) erros.push('entidade sem id');
    if (ent.tipo !== 'estudo' && ent.tipo !== 'observacao' && !txt(ent.estudo)) erros.push('entidade sem o estudo a que pertence');
    if (!/^\d{4}-\d{2}-\d{2}T/.test(txt(ev.em))) erros.push('instante ausente ou fora do formato ISO');
    var autor = ev.autor || {};
    if (!txt(autor.email) && !txt(autor.nome)) erros.push('autor não identificado');
    if (r.motivo && !txt(ev.motivo)) erros.push('motivo obrigatório');
    if (r.rubrica && !ev.rubrica && !ev.legado) erros.push('rubrica obrigatória');
    if (r.dePara && !ev.legado) {
      if (!('de' in ev) || !('para' in ev)) erros.push('de→para obrigatório');
      else if (estavel(ev.de) === estavel(ev.para)) erros.push('de e para são iguais: não há correção');
    }
    if (r.papel && !ev.legado) {
      var p = PAPEIS.indexOf(autor.papel), min = PAPEIS.indexOf(r.papel);
      if (!txt(autor.papel)) avisos.push('papel do autor não declarado (exigido: ' + r.papel + ')');
      else if (p < 0) erros.push('papel desconhecido: ' + autor.papel);
      else if (p < min) erros.push('papel ' + autor.papel + ' não pode registrar ' + ev.tipo + ' (exige ' + r.papel + ')');
    }
    if (!Array.isArray(ev.pais)) erros.push('pais ausentes');
    if (!('organizacao' in ev)) erros.push('campo organizacao ausente');
    return { erros: erros, avisos: avisos };
  }

  /* dados: { entidade:{tipo,id,estudo}, motivo, de, para, rubrica, detalhe }
     ctx:   { autor:{email,nome,papel}, organizacao, dispositivo, em, fuso, pais } */
  function criar(tipo, dados, ctx) {
    dados = dados || {}; ctx = ctx || {};
    var a = ctx.autor || {};
    var ev = {
      schema: SCHEMA,
      tipo: tipo,
      organizacao: ouNull(ctx.organizacao),
      entidade: {
        tipo: txt((dados.entidade || {}).tipo),
        id: txt((dados.entidade || {}).id),
        estudo: ouNull((dados.entidade || {}).estudo)
      },
      motivo: ouNull(dados.motivo),
      autor: { email: ouNull(a.email) && txt(a.email).toLowerCase(), nome: ouNull(a.nome), papel: ouNull(a.papel) },
      em: txt(ctx.em) || new Date().toISOString(),
      fuso: ouNull(ctx.fuso),
      dispositivo: ouNull(ctx.dispositivo),
      pais: lista(ctx.pais).map(txt).filter(Boolean).sort()
    };
    if ('de' in dados) ev.de = dados.de === undefined ? null : JSON.parse(JSON.stringify(dados.de));
    if ('para' in dados) ev.para = dados.para === undefined ? null : JSON.parse(JSON.stringify(dados.para));
    if (dados.rubrica) ev.rubrica = typeof dados.rubrica === 'string' ? dados.rubrica : true;
    if (dados.detalhe != null) ev.detalhe = JSON.parse(JSON.stringify(dados.detalhe));
    if (ctx.legado) ev.legado = true;
    var v = validar(ev);
    if (v.erros.length) {
      var err = new Error('Evento ' + tipo + ' recusado: ' + v.erros.join('; '));
      err.erros = v.erros;
      throw err;
    }
    ev.id = idDe(ev);
    return { evento: congelar(ev), avisos: v.avisos };
  }

  /* ---- registro (grafo) --------------------------------------------------- */

  function porId(reg) {
    var m = new Map();
    lista(reg).forEach(function (e) { if (e && txt(e.id)) m.set(e.id, e); });
    return m;
  }
  /* Pontas: eventos que ninguém cita como pai. Um registro sem concorrência
     tem uma ponta só; dois aparelhos offline deixam duas até o próximo evento
     citar ambas. */
  function pontas(reg) {
    var m = porId(reg), citados = new Set();
    m.forEach(function (e) { lista(e.pais).forEach(function (p) { citados.add(p); }); });
    return Array.from(m.keys()).filter(function (id) { return !citados.has(id); }).sort();
  }
  /* Ordem causal: pai antes de filho; empate por instante e depois por id,
     para dois aparelhos chegarem exatamente à mesma sequência. */
  function ordenar(reg) {
    var m = porId(reg), feito = new Set(), out = [];
    var pend = Array.from(m.values()).sort(function (a, b) {
      return txt(a.em).localeCompare(txt(b.em)) || txt(a.id).localeCompare(txt(b.id));
    });
    while (pend.length) {
      var i = pend.findIndex(function (e) {
        return lista(e.pais).every(function (p) { return feito.has(p) || !m.has(p); });
      });
      if (i < 0) i = 0; /* ciclo só existe em registro adulterado; verificar() acusa */
      var e = pend.splice(i, 1)[0];
      feito.add(e.id); out.push(e);
    }
    return out;
  }
  function anexar(reg, tipo, dados, ctx) {
    var c = Object.assign({}, ctx || {}, { pais: pontas(reg) });
    var r = criar(tipo, dados, c);
    return { registro: ordenar(lista(reg).concat([r.evento])), evento: r.evento, avisos: r.avisos };
  }
  function merge(a, b) { return ordenar(lista(a).concat(lista(b))); }

  function verificar(reg) {
    var m = porId(reg), problemas = [], avisos = [];
    lista(reg).forEach(function (e) {
      if (!e || !txt(e.id)) { problemas.push({ id: null, problema: 'evento sem id' }); return; }
      if (idDe(e) !== e.id) problemas.push({ id: e.id, problema: 'conteúdo não confere com o id (evento alterado)' });
      var v = validar(e);
      v.erros.forEach(function (x) { problemas.push({ id: e.id, problema: x }); });
      lista(e.pais).forEach(function (p) {
        if (!m.has(p)) problemas.push({ id: e.id, problema: 'pai ausente no registro: ' + p });
        /* Relógio de aparelho atrasado produz isso sem fraude nenhuma: é aviso. */
        else if (txt(m.get(p).em) > txt(e.em)) avisos.push({ id: e.id, aviso: 'instante anterior ao do pai (relógio do aparelho?)' });
      });
    });
    return { ok: problemas.length === 0, problemas: problemas, avisos: avisos };
  }

  /* ---- estado derivado ---------------------------------------------------- */

  function chaveEnt(ent) { return txt(ent.tipo) + '|' + txt(ent.estudo) + '|' + txt(ent.id); }

  function estado(reg) {
    var st = { estudos: {}, invalidadas: {}, excluidos: {}, correcoes: {} };
    ordenar(reg).forEach(function (e) {
      var ent = e.entidade || {}, k = chaveEnt(ent);
      switch (e.tipo) {
        case 'estudo.finalizado':
          st.estudos[ent.id] = Object.assign(st.estudos[ent.id] || { finalizacoes: 0, reaberturas: 0 }, { finalizado: true, ultimo: e.id });
          st.estudos[ent.id].finalizacoes++; break;
        case 'estudo.reaberto':
          st.estudos[ent.id] = Object.assign(st.estudos[ent.id] || { finalizacoes: 0, reaberturas: 0 }, { finalizado: false, ultimo: e.id });
          st.estudos[ent.id].reaberturas++; break;
        case 'avaliacao.invalidada': st.invalidadas[k] = e; break;
        case 'avaliacao.revalidada': delete st.invalidadas[k]; break;
        case 'registro.excluido': st.excluidos[k] = e; break;
        case 'registro.restaurado': delete st.excluidos[k]; break;
        case 'observacao.corrigida': (st.correcoes[ent.id] = st.correcoes[ent.id] || []).push(e); break;
      }
    });
    return st;
  }

  /* Aplica o registro sobre observações canônicas. Devolve cópias: a situação
     (válida, invalidada, excluída), o valor corrigido, o histórico de cada
     correção e os CONFLITOS — correção cujo "de" já não era o valor atual. */
  function aplicar(observacoes, reg) {
    var st = estado(reg);
    function ex(tipo, estudo, id) { return st.excluidos[tipo + '|' + txt(estudo) + '|' + txt(id)]; }
    return lista(observacoes).map(function (o0) {
      var o = JSON.parse(JSON.stringify(o0));
      var ek = o.estudo.chave;
      if (ex('estudo', null, ek) || ex('estudo', ek, ek)) o.situacao = 'excluida';
      else if (ex('avaliacao', ek, o.avaliacao.id) || ex('observacao', ek, o.id) || ex('observacao', null, o.id)) o.situacao = 'excluida';
      else if (st.invalidadas['avaliacao|' + ek + '|' + o.avaliacao.id]) o.situacao = 'invalidada';
      var cs = st.correcoes[o.id];
      if (cs) {
        o.historico = []; o.conflitos = [];
        cs.forEach(function (e) {
          if (estavel(e.de) === estavel(o.valor)) {
            o.historico.push({ evento: e.id, de: e.de, para: e.para, motivo: e.motivo, em: e.em, autor: e.autor });
            o.valor = e.para;
          } else {
            o.conflitos.push({ evento: e.id, esperava: e.de, encontrou: o.valor, para: e.para, motivo: e.motivo });
          }
        });
        if (!o.conflitos.length) delete o.conflitos;
      }
      return o;
    });
  }

  /* ---- trilha anterior ---------------------------------------------------- */

  /* A trilha de `study.audit` vira eventos marcados `legado`. Nada é
     reinterpretado: finalização e reabertura têm tipo formal; o resto entra
     como legado.registro, com o texto original no detalhe. O hash passa a
     proteger a trilha A PARTIR da importação — antes dela, só o texto. */
  var LEGADO = { 'Finalização do Estudo': 'estudo.finalizado', 'Reabertura do Estudo': 'estudo.reaberto' };
  function deTrilhaLegada(audit, ctx) {
    ctx = ctx || {};
    var reg = [];
    lista(audit).slice().sort(function (a, b) { return (Number(a && a.ts) || 0) - (Number(b && b.ts) || 0); })
      .forEach(function (a) {
        if (!a) return;
        var tipo = LEGADO[txt(a.action)] || 'legado.registro';
        var em = txt(a.iso) || (isFinite(Number(a.ts)) && Number(a.ts) > 0 ? new Date(Number(a.ts)).toISOString() : '');
        if (!em) return;
        var motivo = ouNull(a.motivo);
        if (!motivo && tipo === 'estudo.reaberto') {
          var m = /Motivo: "([^"]*)"/.exec(txt(a.details));
          motivo = m ? m[1] : null;
        }
        if (tipo === 'estudo.reaberto' && !motivo) tipo = 'legado.registro';
        var r = anexar(reg, tipo, {
          entidade: { tipo: 'estudo', id: ctx.estudo },
          motivo: motivo,
          detalhe: { acao: ouNull(a.action), texto: ouNull(a.details), mudancas: a.mudancas || null }
        }, {
          autor: { email: a.por, nome: a.user }, organizacao: ctx.organizacao,
          em: em, fuso: a.fuso, dispositivo: ctx.dispositivo, legado: true
        });
        reg = r.registro;
      });
    return reg;
  }

  var api = {
    VERSAO: VERSAO, SCHEMA: SCHEMA, TIPOS: TIPOS, PAPEIS: PAPEIS,
    sha256: sha256, estavel: estavel, idDe: idDe,
    validar: validar, criar: criar, anexar: anexar, merge: merge, pontas: pontas, ordenar: ordenar,
    verificar: verificar, estado: estado, aplicar: aplicar, deTrilhaLegada: deTrilhaLegada
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EventosCore = api;
})(typeof self !== 'undefined' ? self : this);
