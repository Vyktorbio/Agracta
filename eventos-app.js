/* eventos-app.js — liga os eventos formais ao app SEM mexer no app.js
 *
 * O app.js continua exatamente como era: cada ação crítica ainda grava a sua
 * linha em `study.audit` pelo mesmo logStudyAuditInObject. Este módulo só
 * ESCUTA essa chamada e, depois que ela terminou, grava AO LADO um evento
 * formal (vendor/eventos-core.js) num armazenamento próprio do aparelho.
 *
 * CINCO GARANTIAS, porque o objetivo é não estragar o que funciona:
 *
 * 1. O ORIGINAL RODA PRIMEIRO E SEMPRE. A trilha de sempre é gravada antes
 *    de qualquer coisa daqui, e o valor de retorno é o dela.
 * 2. FALHA AQUI NÃO SOBE. Todo o trabalho deste módulo está em try/catch; um
 *    evento recusado ou um armazenamento cheio vira aviso no console, nunca
 *    erro na tela de quem está finalizando um estudo.
 * 3. ARMAZENAMENTO SEPARADO. Os eventos ficam num IndexedDB próprio
 *    (`agracta-eventos`), fora do objeto `data` e do localStorage — o
 *    localStorage tem teto de ~5 milhões de caracteres e é dele que o save do
 *    app depende; os eventos não disputam esse espaço. Não entram no save nem
 *    no merge do app. A gravação é assíncrona e enfileirada, e a tela nunca
 *    espera.
 * 5. NUVEM POR FORA DA FILA. Com sessão e rede, os eventos vão para
 *    workspaces/agracta/eventos — coleção só-de-acréscimo, em que o servidor
 *    recalcula o SHA-256 e recusa id que não bata (firestore.rules). O envio
 *    roda fora da fila local e com tempo limite: rede ruim atrasa a nuvem,
 *    nunca a gravação no aparelho. Os eventos de outros aparelhos descem e
 *    só entram depois de conferido o hash de cada um.
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
  function lerFicha(chaveEstudo) {
    return tx('readonly', function (st, fim) {
      var rq = st.get(chaveEstudo);
      rq.onsuccess = function () {
        var r = rq.result || {};
        fim({ estudo: chaveEstudo, eventos: (r.eventos || []).slice(), enviados: (r.enviados || []).slice() });
      };
    });
  }
  function lerRegistro(chaveEstudo) { return lerFicha(chaveEstudo).then(function (f) { return f.eventos; }); }
  /* `enviados`: ids que já estão na nuvem. Fica na mesma ficha do estudo. */
  function gravarFicha(f) {
    return tx('readwrite', function (st) { st.put({ estudo: f.estudo, eventos: f.eventos, enviados: f.enviados || [] }); });
  }
  function lerTudo() {
    return tx('readonly', function (st, fim) {
      var rq = st.getAll();
      rq.onsuccess = function () {
        var o = {}; (rq.result || []).forEach(function (r) { o[r.estudo] = r.eventos; }); fim(o);
      };
    });
  }
  function lerFichas() {
    return tx('readonly', function (st, fim) {
      var rq = st.getAll();
      rq.onsuccess = function () {
        fim((rq.result || []).map(function (r) { return { estudo: r.estudo, eventos: r.eventos || [], enviados: r.enviados || [] }; }));
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
      return lerFicha(kEst).then(function (f) {
        var n = 0;
        ps.forEach(function (p) {
          try { f.eventos = E.anexar(f.eventos, p.tipo, p.dados, ctx).registro; n++; }
          catch (e) { aviso('evento ' + p.tipo + ' não registrado: ' + (e && e.message), e); }
        });
        return n ? gravarFicha(f).then(function () { return n; }) : 0;
      }).catch(function (e) { aviso('evento não gravado (a trilha foi gravada normalmente)', e); return 0; });
    }).then(function (n) {
      if (n) agendarEnvio();
      return n;
    });
  }

  /* ---- nuvem ---------------------------------------------------------------
     Usa a mesma conexão que o firebase-sync.js abriu. Sem Firebase iniciado,
     sem sessão ou sem rede, simplesmente não sincroniza agora. */
  var COLECAO = 'workspaces/agracta/eventos', LIMITE_MS = 20000;
  var _sinc = null, _estado = { ultimoEnvio: null, ultimaLeitura: null, ultimoErro: null, pendentes: null, rejeitados: 0 };
  function nuvem() {
    try {
      var fb = root.firebase;
      if (!fb || !fb.apps || !fb.apps.length) return null;
      var u = fb.auth().currentUser;
      if (!u || !u.email) return null;
      if (root.navigator && root.navigator.onLine === false) return null;
      return { db: fb.firestore(), email: String(u.email).toLowerCase(), fb: fb };
    } catch (e) { return null; }
  }
  function comLimite(p) {
    return new Promise(function (res, rej) {
      var t = setTimeout(function () { rej(new Error('tempo esgotado')); }, LIMITE_MS);
      p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); });
    });
  }
  function documento(ev, estudo, n) {
    return { schema: 1, estudo: estudo, tipo: ev.tipo, json: root.EventosCore.serializar(ev),
             enviadoPor: n.email, recebidoEm: n.fb.firestore.FieldValue.serverTimestamp() };
  }
  /* Um evento só entra se o conteúdo confere com o id — o mesmo teste que o
     servidor fez ao aceitar; aqui ele protege contra cópia adulterada. */
  function eventoDaNuvem(id, d) {
    var E = root.EventosCore;
    if (!d || typeof d.json !== 'string' || typeof d.estudo !== 'string') return null;
    if (id !== 'ev:' + E.sha256(d.json)) return null;
    var ev; try { ev = JSON.parse(d.json); } catch (e) { return null; }
    ev.id = id;
    if (E.idDe(ev) !== id || E.validar(ev).erros.length) return null;
    return ev;
  }
  function enviarUm(n, ev, estudo) {
    var ref = n.db.doc(COLECAO + '/' + ev.id);
    return comLimite(ref.set(documento(ev, estudo, n))).then(function () { return true; }, function (e) {
      /* Já existe (ex.: a confirmação do envio anterior se perdeu): a regra
         recusa regravar. Confere se o que está lá é este mesmo evento. */
      return comLimite(ref.get()).then(function (snap) {
        if (snap.exists && snap.data().json === root.EventosCore.serializar(ev)) return true;
        throw e;
      });
    });
  }
  function enviar(n) {
    return enfileirar(lerFichas).then(function (fichas) {
      var ok = {}, pend = 0, seq = Promise.resolve();
      fichas.forEach(function (f) {
        var ja = {}; f.enviados.forEach(function (id) { ja[id] = 1; });
        f.eventos.forEach(function (ev) {
          if (ja[ev.id] || ev.legado) return;
          pend++;
          seq = seq.then(function () {
            return enviarUm(n, ev, f.estudo).then(function () {
              (ok[f.estudo] = ok[f.estudo] || []).push(ev.id); pend--;
            }, function (e) { _estado.ultimoErro = { em: new Date().toISOString(), codigo: (e && (e.code || e.message)) || 'erro' }; });
          });
        });
      });
      return seq.then(function () {
        _estado.pendentes = pend;
        if (!Object.keys(ok).length) return 0;
        _estado.ultimoEnvio = new Date().toISOString();
        return enfileirar(function () {
          return Promise.all(Object.keys(ok).map(function (k) {
            return lerFicha(k).then(function (f) {
              f.enviados = Array.from(new Set(f.enviados.concat(ok[k])));
              return gravarFicha(f);
            });
          }));
        }).then(function () { return Object.keys(ok).reduce(function (a, k) { return a + ok[k].length; }, 0); });
      });
    });
  }
  function receber(n) {
    return comLimite(n.db.collection(COLECAO).get()).then(function (snap) {
      var porEstudo = {}, rej = 0;
      snap.forEach(function (d) {
        var dd = d.data(), ev = eventoDaNuvem(d.id, dd);
        if (!ev) { rej++; return; }
        (porEstudo[dd.estudo] = porEstudo[dd.estudo] || []).push(ev);
      });
      _estado.rejeitados = rej;
      if (rej) aviso(rej + ' evento(s) da nuvem recusado(s): conteúdo não confere com o id');
      return enfileirar(function () {
        return Promise.all(Object.keys(porEstudo).map(function (k) {
          return lerFicha(k).then(function (f) {
            var antes = f.eventos.length;
            f.eventos = root.EventosCore.merge(f.eventos, porEstudo[k]);
            f.enviados = Array.from(new Set(f.enviados.concat(porEstudo[k].map(function (e) { return e.id; }))));
            return gravarFicha(f).then(function () { return f.eventos.length - antes; });
          });
        }));
      }).then(function (ns) {
        _estado.ultimaLeitura = new Date().toISOString();
        return ns.reduce(function (a, b) { return a + b; }, 0);
      });
    });
  }
  /* Envia o que falta e baixa o que outros aparelhos gravaram. Uma rodada por
     vez; pedir de novo durante uma rodada devolve a mesma promessa. */
  function sincronizar(op) {
    op = op || {};
    if (_sinc) return _sinc;
    var n = nuvem();
    if (!n) return Promise.resolve({ enviados: 0, recebidos: 0, semNuvem: true });
    _sinc = enviar(n).then(function (env) {
      if (op.soEnviar) return { enviados: env, recebidos: 0 };
      return receber(n).then(function (rec) { return { enviados: env, recebidos: rec }; });
    }).catch(function (e) {
      _estado.ultimoErro = { em: new Date().toISOString(), codigo: (e && (e.code || e.message)) || 'erro' };
      aviso('sincronização dos eventos adiada', e);
      return { enviados: 0, recebidos: 0, erro: _estado.ultimoErro };
    }).then(function (r) { _sinc = null; return r; });
    return _sinc;
  }
  var _timerEnvio = null;
  function agendarEnvio() {
    if (_timerEnvio) return;
    _timerEnvio = setTimeout(function () { _timerEnvio = null; sincronizar({ soEnviar: true }); }, 1500);
  }
  /* O Firebase carrega depois deste arquivo: espera ele subir e a sessão
     abrir, e sincroniza a cada login e a cada volta da rede. */
  function ligarNuvem(tentativa) {
    tentativa = tentativa || 0;
    var fb = root.firebase;
    if (!fb || !fb.apps || !fb.apps.length) {
      if (tentativa < 24) setTimeout(function () { ligarNuvem(tentativa + 1); }, 5000);
      return;
    }
    try { fb.auth().onAuthStateChanged(function (u) { if (u) sincronizar(); }); } catch (e) { aviso('sem sessão do Firebase', e); }
    try { root.addEventListener('online', function () { sincronizar(); }); } catch (e) {}
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
    try { setTimeout(function () { ligarNuvem(0); }, 0); } catch (e) {}
    return true;
  }

  /* Consultas devolvem promessa. `ocioso()` resolve quando a fila esvazia. */
  var api = {
    instalar: instalar,
    registro: function (qid, sid) { return enfileirar(function () { return lerRegistro(root.ObservacaoCore.chaveEstudo(qid, sid)); }); },
    verificar: function (qid, sid) { return api.registro(qid, sid).then(function (r) { return root.EventosCore.verificar(r); }); },
    exportar: function () { return enfileirar(lerTudo); },
    sincronizar: sincronizar,
    estado: function () { return JSON.parse(JSON.stringify(_estado)); },
    ocioso: function () { return _fila; }
  };
  root.AgractaEventos = api;
  instalar();
})(typeof window !== 'undefined' ? window : this);
