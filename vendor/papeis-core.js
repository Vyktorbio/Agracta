/* ============================================================================
   PapeisCore — quem pode o quê (lacuna L1 da validação)
   ----------------------------------------------------------------------------
   Até aqui o Agracta tinha dois tipos de gente: administrador e membro. Pelo
   banco, qualquer membro ativo aprovava protocolo, finalizava e reabria
   estudo. A senha pedida na tela provava QUEM fez, não que essa pessoa PODIA.

   Agora cada membro tem um papel — técnico, supervisor ou diretor — e cada
   ação crítica tem um papel mínimo. A tabela não é fixa no código: o
   administrador escolhe no Painel Admin, ela fica gravada no banco
   (workspaces/agracta/politica/papeis) e as firestore.rules leem dali.

   CINCO REGRAS

   1. PAPEL SOBE, NUNCA DESCE. técnico < supervisor < diretor < administrador.
      Quem pode uma ação pode todas as que pedem papel menor.

   2. SEM PAPEL É TÉCNICO. Cadastro antigo, sem o campo, entra como técnico:
      ninguém ganha poder sem o administrador dar. Papel desconhecido também.

   3. A TABELA TEM PADRÃO. Sem documento de política no banco, ou com uma
      ação faltando nele, vale o padrão daqui — o mesmo que as regras do banco
      usam (um teste confere que os dois não se separam).

   4. CORRIGIR O QUE SE ASSINOU É UMA ESCOLHA À PARTE. Corrigir avaliação
      assinada de outra pessoa pede o papel da tabela; corrigir a própria pode
      ficar liberada para o técnico (`corrigirPropria`), sempre com motivo.

   5. O MOTOR DECIDE, NÃO GRAVA. Sem DOM, sem Firestore: recebe o papel e a
      política, devolve se pode e por quê. A tela avisa antes de tentar; o
      banco é quem recusa de verdade (ver SERVIDOR abaixo).
   ============================================================================ */
(function (root) {
  'use strict';
  var VERSAO = '1.0.0';

  var PAPEIS = ['tecnico', 'supervisor', 'diretor'];
  var NIVEL = { tecnico: 1, supervisor: 2, diretor: 3, admin: 4 };
  var ROTULO_PAPEL = { tecnico: 'Técnico', supervisor: 'Supervisor', diretor: 'Diretor', admin: 'Administrador' };

  /* `servidor`: o banco confere esta ação nas firestore.rules. As outras a tela
     confere — e o evento formal registra o papel de quem fez. O motivo de a
     correção não ir para o banco está em docs/VALIDACAO-SISTEMA.md (L1). */
  var ACOES = [
    { id: 'corrigir',  padrao: 'supervisor', servidor: false, rotulo: 'Corrigir avaliação assinada por outra pessoa' },
    { id: 'reabrir',   padrao: 'supervisor', servidor: true,  rotulo: 'Reabrir estudo finalizado' },
    { id: 'excluir',   padrao: 'supervisor', servidor: true,  rotulo: 'Excluir estudo, aplicação ou avaliação' },
    { id: 'restaurar', padrao: 'supervisor', servidor: false, rotulo: 'Voltar o banco a uma versão anterior' },
    { id: 'aprovar',   padrao: 'diretor',    servidor: true,  rotulo: 'Aprovar protocolo' },
    { id: 'emendar',   padrao: 'diretor',    servidor: true,  rotulo: 'Emendar protocolo aprovado' },
    { id: 'finalizar', padrao: 'diretor',    servidor: true,  rotulo: 'Finalizar estudo' }
  ];
  var POR_ID = {};
  ACOES.forEach(function (a) { POR_ID[a.id] = a; });
  var CORRIGIR_PROPRIA_PADRAO = true;

  function txt(v) { return v == null ? '' : String(v).trim(); }

  function papelValido(p) { return PAPEIS.indexOf(txt(p).toLowerCase()) >= 0; }

  /* Regra 2: o que não é papel conhecido vira técnico. */
  function normalizarPapel(p) {
    var t = txt(p).toLowerCase();
    if (t === 'admin') return 'admin';
    return papelValido(t) ? t : 'tecnico';
  }

  function papelDe(membro, ehAdmin) {
    if (ehAdmin) return 'admin';
    return normalizarPapel(membro && membro.papel);
  }

  function nivel(p) { return NIVEL[normalizarPapel(p)] || 1; }

  function politicaPadrao() {
    var minimo = {};
    ACOES.forEach(function (a) { minimo[a.id] = a.padrao; });
    return { minimo: minimo, corrigirPropria: CORRIGIR_PROPRIA_PADRAO };
  }

  /* Regra 3: completa o que falta com o padrão; descarta o que não serve. */
  function normalizarPolitica(doc) {
    var out = politicaPadrao();
    var m = (doc && typeof doc === 'object' && doc.minimo && typeof doc.minimo === 'object') ? doc.minimo : {};
    ACOES.forEach(function (a) { if (papelValido(m[a.id])) out.minimo[a.id] = txt(m[a.id]).toLowerCase(); });
    if (doc && typeof doc.corrigirPropria === 'boolean') out.corrigirPropria = doc.corrigirPropria;
    return out;
  }

  /* Para o Painel Admin: o que vai ser gravado. Recusa em vez de consertar —
     uma tabela gravada errada muda o que o banco deixa fazer. */
  function validarPolitica(obj) {
    var erros = [];
    if (!obj || typeof obj !== 'object') return ['política ausente'];
    var m = obj.minimo;
    if (!m || typeof m !== 'object') erros.push('tabela de papéis ausente');
    else {
      ACOES.forEach(function (a) { if (!papelValido(m[a.id])) erros.push(a.rotulo + ': papel inválido'); });
      Object.keys(m).forEach(function (k) { if (!POR_ID[k]) erros.push('ação desconhecida: ' + k); });
    }
    if (typeof obj.corrigirPropria !== 'boolean') erros.push('"corrigir a própria" precisa ser sim ou não');
    return erros;
  }

  /* Papel mínimo para a ação, já considerando a regra 4.
     ctx.proprio: quem corrige é quem assinou a avaliação. */
  function exigido(acao, politica, ctx) {
    var a = POR_ID[acao];
    if (!a) throw new Error('Ação desconhecida: ' + acao);
    var p = normalizarPolitica(politica);
    if (acao === 'corrigir' && ctx && ctx.proprio && p.corrigirPropria) return 'tecnico';
    return p.minimo[acao];
  }

  function pode(papel, acao, politica, ctx) {
    var min = exigido(acao, politica, ctx), quem = normalizarPapel(papel);
    var ok = nivel(quem) >= nivel(min);
    return {
      ok: ok,
      papel: quem,
      exige: min,
      motivo: ok ? null : (POR_ID[acao].rotulo + ' pede ' + ROTULO_PAPEL[min].toLowerCase() +
        ' ou acima. Seu papel: ' + ROTULO_PAPEL[quem].toLowerCase() + '.')
    };
  }

  /* Quem assinou a avaliação: o e-mail no carimbo (`carimbo.assinatura.por`,
     da assinatura por SHA-256, ou `carimbo.rubricaPor`, das antigas). Sem
     assinante conhecido, ninguém é "o próprio" — vale a tabela. */
  function assinanteDe(av) {
    var c = (av && av.carimbo && typeof av.carimbo === 'object') ? av.carimbo : {};
    var a = (c.assinatura && typeof c.assinatura === 'object') ? c.assinatura : {};
    var e = txt(a.por || c.rubricaPor).toLowerCase();
    return e.indexOf('@') > 0 ? e : null;
  }

  /* O QUE UMA TROCA DE ESTADO INTEIRA IMPLICA. Restaurar uma versão ou
     importar um backup não é uma ação só: pode desfazer uma finalização,
     reaprovar um protocolo, apagar uma avaliação. O banco confere cada uma
     dessas mudanças pelo papel dela — então a tela tem de conferir as mesmas,
     senão quem restaura passa na tela, o banco recusa, e o aparelho trava.
     `antes` e `depois` são o `data` do app (quadra → {estudos:[…]}).
     Espelha transicaoDoEstudoPermitida() e a regra de exclusão das
     firestore.rules. */
  function _estudosPorId(d) {
    var m = {};
    Object.keys(d || {}).forEach(function (q) {
      if (q === '__config') return;
      var es = (d[q] && d[q].estudos) || [];
      (Array.isArray(es) ? es : []).forEach(function (s) { if (s && s.id) m[s.id] = s; });
    });
    return m;
  }
  function _fin(s) { return !!(s && s.finalizacao != null); }
  function _aprov(s) { return !!(s && s.protocoloVivo && s.protocoloVivo.status === 'aprovado'); }
  function _ver(s) { return (s && s.protocoloVivo && s.protocoloVivo.versao) || 1; }
  function _ids(l) { var m = {}; (Array.isArray(l) ? l : []).forEach(function (x) { if (x && x.id) m[x.id] = 1; }); return m; }
  function acoesDaMudanca(antes, depois) {
    var A = _estudosPorId(antes), D = _estudosPorId(depois), out = {};
    function comparar(a, d) {
      if (_fin(a) !== _fin(d)) out[_fin(d) ? 'finalizar' : 'reabrir'] = 1;
      if (_aprov(a) !== _aprov(d)) out.aprovar = 1;
      else if (_aprov(a) && _ver(a) !== _ver(d)) out.emendar = 1;
      ['aplicacoes', 'avaliacoes'].forEach(function (k) {
        var ia = _ids(a && a[k]), id = _ids(d && d[k]);
        Object.keys(ia).forEach(function (x) { if (!id[x]) out.excluir = 1; });
      });
    }
    Object.keys(A).forEach(function (id) { if (!D[id]) out.excluir = 1; else comparar(A[id], D[id]); });
    Object.keys(D).forEach(function (id) { if (!A[id]) comparar({}, D[id]); });
    return ACOES.map(function (a) { return a.id; }).filter(function (k) { return out[k]; });
  }

  var API = {
    VERSAO: VERSAO, PAPEIS: PAPEIS, ACOES: ACOES, ROTULO_PAPEL: ROTULO_PAPEL,
    normalizarPapel: normalizarPapel, papelDe: papelDe, nivel: nivel,
    politicaPadrao: politicaPadrao, normalizarPolitica: normalizarPolitica,
    validarPolitica: validarPolitica, exigido: exigido, pode: pode, assinanteDe: assinanteDe,
    acoesDaMudanca: acoesDaMudanca
  };
  root.PapeisCore = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
