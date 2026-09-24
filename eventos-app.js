/* eventos-app.js — liga os eventos formais ao app SEM mexer no app.js
 *
 * O app.js continua exatamente como era: cada ação crítica ainda grava a sua
 * linha em `study.audit` pelo mesmo logStudyAuditInObject. Este módulo só
 * ESCUTA essa chamada e, depois que ela terminou, grava AO LADO um evento
 * formal (vendor/eventos-core.js) num armazenamento próprio do aparelho.
 *
 * QUATRO GARANTIAS, porque o objetivo é não estragar o que funciona:
 *
 * 1. O ORIGINAL RODA PRIMEIRO E SEMPRE. A trilha de sempre é gravada antes
 *    de qualquer coisa daqui, e o valor de retorno é o dela.
 * 2. FALHA AQUI NÃO SOBE. Todo o trabalho deste módulo está em try/catch; um
 *    evento recusado ou um armazenamento cheio vira aviso no console, nunca
 *    erro na tela de quem está finalizando um estudo.
 * 3. ARMAZENAMENTO SEPARADO. Os eventos ficam num IndexedDB próprio
 *    (`agracta-eventos`), fora do objeto `data` e do localStorage — o
 *    localStorage tem teto de ~5 milhões de caracteres e é dele que o save do
 *    app depende; os eventos não disputam esse espaço. Não entram no save, no
 *    merge entre aparelhos nem na nuvem: nesta etapa são uma segunda via
 *    local. A gravação é assíncrona e enfileirada, e a tela nunca espera.
 * 4. DESLIGÁVEL. `localStorage['agracta-eventos-off']='1'` e o módulo não
 *    instala nada. Sem os motores carregados, também não.
 *
 * Mapeamento (ação da trilha → evento):
 *   Finalização do Estudo           → estudo.finalizado   (rubrica: hash do desenho)
 *   Reabertura do Estudo            → estudo.reaberto     (rubrica: reautenticação por senha)
 *   Aprovação do protocolo          → protocolo.aprovado
 *   Emenda ao protocolo             → protocolo.emendado  (de→para: versões)
 *   edição de avaliação ASSINADA    → observacao.corrigida, uma por célula alterada
 *   qualquer outra ação             → nada (continua só na trilha)
 */
(function (root) {
  'use strict';
  var CHAVE_OFF = 'agracta-eventos-off';
  var CHAVE_DISP = 'agracta-dispositivo';

  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function aviso(msg, e) { try { console.warn('[eventos] ' + msg, e || ''); } catch (x) {} }

  function desligado() {
    var s = ls();
    try { return !!(s && s.getItem(CHAVE_OFF) === '1'); } catch (e) { return false; }
  }

  /* ---- armazenamento próprio (IndexedDB) --------------------------------
     Um registro por estudo: { estudo, eventos:[...] }. Tudo enfileirado numa
     promessa só, para duas ações seguidas não lerem o mesmo registro velho. */
  var DB = 'agracta-eventos', STORE = 'registros', _db = null, _fila = Promise.resolve();
  function abrir() {
    if (_db) return _db;
    _db = new Promise(function (res, rej) {
      var idb = root.indexedDB;
      if (!idb) { rej(new Error('sem IndexedDB')); return; }
      var rq = idb.open(DB, 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'estudo' });
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
    _db.catch(function () { _db = null; });
    return _db;
  }
  function tx(modo, fn) {
    return abrir().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, modo), st = t.objectStore(STORE), out;
        fn(st, function (v) { out = v; });
        t.oncomplete = function () { res(out); };
        t.onerror = function () { rej(t.error); };
        t.onabort = function () { rej(t.error || new Error('transação abortada')); };
      });
    });
  }
  function lerRegistro(chaveEstudo) {
    return tx('readonly', function (st, fim) {
      var rq = st.get(chaveEstudo);
      rq.onsuccess = function () { fim(rq.result ? rq.result.eventos.slice() : []); };
    });
  }
  function gravarRegistro(chaveEstudo, eventos) {
    return tx('readwrite', function (st) { st.put({ estudo: chaveEstudo, eventos: eventos }); });
  }
  function lerTudo() {
    return tx('readonly', function (st, fim) {
      var rq = st.getAll();
      rq.onsuccess = function () {
        var o = {}; (rq.result || []).forEach(function (r) { o[r.estudo] = r.eventos; }); fim(o);
      };
    });
  }
  function enfileirar(fn) {
    var p = _fila.then(fn);
    _fila = p.catch(function () {});
    return p;
  }

  function dispositivo() {
    var s = ls(); if (!s) return null;
    try {
      var d = s.getItem(CHAVE_DISP);
      if (!d) {
        d = 'disp-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        s.setItem(CHAVE_DISP, d);
      }
      return d;
    } catch (e) { return null; }
  }

  /* ---- contexto do app (lido, nunca escrito) ------------------------------ */
  function qidDoEstudo(study) {
    var d = root.data; if (!d || !study) return null;
    for (var k in d) {
      if (!Object.prototype.hasOwnProperty.call(d, k) || k.indexOf('__') === 0) continue;
      var q = d[k];
      if (q && Array.isArray(q.estudos) && q.estudos.some(function (s) { return s === study || (s && s.id === study.id); })) return k;
    }
    return null;
  }
  function autor() {
    var u = root._authUser, nome = '';
    try { nome = typeof root._currentUserName === 'function' ? String(root._currentUserName() || '') : ''; } catch (e) {}
    /* Mesma regra da trilha: sem nome conhecido fica "Não identificado", que é
       a verdade — e o evento não se perde por isso. */
    return { email: (u && u.email) || null, nome: nome.trim() || 'Não identificado' };
  }
  function contexto() {
    return { autor: autor(), organizacao: null, dispositivo: dispositivo(),
             fuso: root.AGRACTA_TIME_ZONE || null };
  }

  function parcelaCanonica(p) {
    p = String(p == null ? '' : p);
    return /R\d+$/.test(p) ? p : p + 'R1';
  }
  function valorCanonico(v) {
    var n = root.ObservacaoCore.numero(v);
    if (n !== null) return n;
    v = String(v == null ? '' : v).trim();
    return v === '' ? null : v;
  }

  /* ---- tradução: linha da trilha → pedidos de evento ---------------------- */
  function pedidos(study, action, details, extra, qid) {
    var O = root.ObservacaoCore, kEst = O.chaveEstudo(qid, study.id), E = root.EventosCore;
    var ent = { tipo: 'estudo', id: kEst };
    extra = extra || {};
    switch (action) {
      case 'Finalização do Estudo': {
        var rub = study.finalizacao && study.finalizacao.rubrica;
        return [{ tipo: 'estudo.finalizado', dados: { entidade: ent,
          rubrica: rub ? ('sha256:' + E.sha256(String(rub))) : 'rubrica-no-estudo',
          detalhe: { nResultados: study.finalizacao ? study.finalizacao.nResultados : null } } }];
      }
      case 'Reabertura do Estudo': {
        var ant = (study.finalizacoesAnteriores || []).slice(-1)[0] || {};
        var m = ant.motivo || (/Motivo: "([^"]*)"/.exec(String(details || '')) || [])[1];
        return [{ tipo: 'estudo.reaberto', dados: { entidade: ent, motivo: m, rubrica: 'reautenticacao-senha' } }];
      }
      case 'Aprovação do protocolo':
        return [{ tipo: 'protocolo.aprovado', dados: { entidade: ent, rubrica: 'rubrica-no-estudo' } }];
      case 'Emenda ao protocolo': {
        var v = /versão (\d+) → (\d+)/.exec(String(details || ''));
        return [{ tipo: 'protocolo.emendado', dados: { entidade: ent, motivo: extra.motivo,
          de: { versao: v ? +v[1] : null }, para: { versao: v ? +v[2] : null },
          detalhe: { emenda: extra.emenda || null, texto: String(details || '') } } }];
      }
    }
    /* Edição de avaliação assinada: só existe motivo quando houve reabertura. */
    var reab = root._avReopen;
    if (extra.motivo && Array.isArray(extra.mudancas) && reab && reab.avid) {
      return extra.mudancas.map(function (c) {
        return { tipo: 'observacao.corrigida', dados: {
          entidade: { tipo: 'observacao', id: O.idObservacao({ qid: qid, sid: study.id, avaliacao: reab.avid,
            parcela: parcelaCanonica(c.parcela), variavel: c.variavel }) },
          motivo: extra.motivo, de: valorCanonico(c.de), para: valorCanonico(c.para) } };
      }).filter(function (p) { return p.dados.de !== p.dados.para; });
    }
    return [];
  }

  /* Os pedidos são montados NA HORA da chamada (o _avReopen e a finalização
     são lidos agora, antes de o app limpá-los); só a gravação é adiada. */
  function registrar(study, action, details, extra) {
    if (!study || !study.id) return Promise.resolve(0);
    var qid = qidDoEstudo(study);
    var ps = pedidos(study, action, details, extra, qid);
    if (!ps.length) return Promise.resolve(0);
    var O = root.ObservacaoCore, E = root.EventosCore, kEst = O.chaveEstudo(qid, study.id), ctx = contexto();
    ctx.em = new Date().toISOString();
    return enfileirar(function () {
      return lerRegistro(kEst).then(function (reg) {
        var n = 0;
        ps.forEach(function (p) {
          try { reg = E.anexar(reg, p.tipo, p.dados, ctx).registro; n++; }
          catch (e) { aviso('evento ' + p.tipo + ' não registrado: ' + (e && e.message), e); }
        });
        return n ? gravarRegistro(kEst, reg).then(function () { return n; }) : 0;
      });
    }).catch(function (e) { aviso('evento não gravado (a trilha foi gravada normalmente)', e); return 0; });
  }

  /* ---- instalação ---------------------------------------------------------- */
  function instalar() {
    if (desligado()) return false;
    if (!root.EventosCore || !root.ObservacaoCore) { aviso('motores ausentes; nada instalado'); return false; }
    var orig = root.logStudyAuditInObject;
    if (typeof orig !== 'function' || orig.__eventos) return false;
    var envolto = function (study, action, details, extra) {
      var ret = orig.apply(this, arguments);           /* 1. o de sempre, primeiro */
      try { registrar(study, action, details, extra); } /* 2. o evento, ao lado, sem esperar */
      catch (e) { aviso('falha ao registrar evento (a trilha foi gravada normalmente)', e); }
      return ret;
    };
    envolto.__eventos = true;
    envolto.original = orig;
    root.logStudyAuditInObject = envolto;
    return true;
  }

  /* Consultas devolvem promessa. `ocioso()` resolve quando a fila esvazia. */
  var api = {
    instalar: instalar,
    registro: function (qid, sid) { return enfileirar(function () { return lerRegistro(root.ObservacaoCore.chaveEstudo(qid, sid)); }); },
    verificar: function (qid, sid) { return api.registro(qid, sid).then(function (r) { return root.EventosCore.verificar(r); }); },
    exportar: function () { return enfileirar(lerTudo); },
    ocioso: function () { return _fila; }
  };
  root.AgractaEventos = api;
  instalar();
})(typeof window !== 'undefined' ? window : this);
