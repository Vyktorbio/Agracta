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
 * 3. ARMAZENAMENTO SEPARADO. Os eventos ficam em `agracta-eventos-v1`, fora
 *    do objeto `data`: não entram no save, no merge entre aparelhos nem na
 *    nuvem. Nesta etapa são uma segunda via local — a sincronização com
 *    regras só-de-acréscimo no servidor é a etapa seguinte.
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
  var CHAVE = 'agracta-eventos-v1';
  var CHAVE_OFF = 'agracta-eventos-off';
  var CHAVE_DISP = 'agracta-dispositivo';

  function ls() { try { return root.localStorage || null; } catch (e) { return null; } }
  function aviso(msg, e) { try { console.warn('[eventos] ' + msg, e || ''); } catch (x) {} }

  function desligado() {
    var s = ls();
    try { return !!(s && s.getItem(CHAVE_OFF) === '1'); } catch (e) { return false; }
  }

  /* ---- armazenamento próprio ---------------------------------------------- */
  function lerTudo() {
    var s = ls(); if (!s) return {};
    try { var o = JSON.parse(s.getItem(CHAVE) || '{}'); return o && typeof o === 'object' ? o : {}; }
    catch (e) { aviso('armazenamento ilegível; começando vazio sem apagar o antigo', e); return {}; }
  }
  function gravarTudo(o) {
    var s = ls(); if (!s) return false;
    s.setItem(CHAVE, JSON.stringify(o));
    return true;
  }
  function registroDe(chaveEstudo) { return (lerTudo()[chaveEstudo] || []).slice(); }

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
    return { email: (u && u.email) || null, nome: nome || null };
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

  function registrar(study, action, details, extra) {
    if (!study || !study.id) return 0;
    var qid = qidDoEstudo(study);
    var ps = pedidos(study, action, details, extra, qid);
    if (!ps.length) return 0;
    var O = root.ObservacaoCore, E = root.EventosCore, kEst = O.chaveEstudo(qid, study.id);
    var tudo = lerTudo(), reg = (tudo[kEst] || []).slice(), n = 0, ctx = contexto();
    ps.forEach(function (p) {
      try {
        var r = E.anexar(reg, p.tipo, p.dados, ctx);
        reg = r.registro; n++;
      } catch (e) { aviso('evento ' + p.tipo + ' não registrado: ' + (e && e.message), e); }
    });
    if (n) { tudo[kEst] = reg; gravarTudo(tudo); }
    return n;
  }

  /* ---- instalação ---------------------------------------------------------- */
  function instalar() {
    if (desligado()) return false;
    if (!root.EventosCore || !root.ObservacaoCore) { aviso('motores ausentes; nada instalado'); return false; }
    var orig = root.logStudyAuditInObject;
    if (typeof orig !== 'function' || orig.__eventos) return false;
    var envolto = function (study, action, details, extra) {
      var ret = orig.apply(this, arguments);           /* 1. o de sempre, primeiro */
      try { registrar(study, action, details, extra); } /* 2. o evento, ao lado */
      catch (e) { aviso('falha ao registrar evento (a trilha foi gravada normalmente)', e); }
      return ret;
    };
    envolto.__eventos = true;
    envolto.original = orig;
    root.logStudyAuditInObject = envolto;
    return true;
  }

  var api = {
    instalar: instalar,
    registro: function (qid, sid) { return registroDe(root.ObservacaoCore.chaveEstudo(qid, sid)); },
    verificar: function (qid, sid) { return root.EventosCore.verificar(api.registro(qid, sid)); },
    exportar: function () { return lerTudo(); }
  };
  root.AgractaEventos = api;
  instalar();
})(typeof window !== 'undefined' ? window : this);
