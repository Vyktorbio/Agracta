/* assinatura-core.js — assinatura eletrônica por SHA-256 (no lugar da rubrica desenhada)
 *
 * A rubrica desenhada provava que alguém riscou a tela, e nada sobre O QUE foi
 * assinado. Aqui a assinatura é o SHA-256 do conteúdo assinado (as notas da
 * avaliação, a estatística congelada da finalização, o retrato do protocolo
 * aprovado) junto com quem assinou, quando e o significado. Mudou uma nota
 * depois? O hash do conteúdo não bate mais, e o app mostra isso.
 *
 * Quem assina é o usuário logado no aparelho, confirmado pelo toque em
 * "Assinar" (escolha do laboratório; sem senha nem PIN).
 *
 * Forma gravada (`assinatura`):
 *   { alg:'SHA-256', v:1, escopo, conteudoHash, hash, em, por, nome, significado }
 *   conteudoHash = sha256(estavel(conteudo))
 *   hash         = sha256(estavel({escopo, conteudoHash, em, por, nome, significado}))
 * e, para o que já testa "tem rubrica?", `rubrica` = 'sha256:' + hash.
 *
 * O SHA-256 e a serialização estável são os do EventosCore (síncronos, iguais
 * no aparelho, no Node e no servidor).
 */
(function (root) {
  'use strict';
  var E = root.EventosCore || (typeof require === 'function' ? require('./eventos-core.js') : null);
  var PREFIXO = 'sha256:';

  function motor() {
    var e = root.EventosCore || E;
    if (!e || typeof e.sha256 !== 'function' || typeof e.estavel !== 'function') throw new Error('EventosCore ausente: sem SHA-256');
    return e;
  }
  function h(v) { var e = motor(); return e.sha256(e.estavel(v)); }
  function obj(v) { return v && typeof v === 'object' ? v : {}; }

  /* ---- o que entra em cada assinatura ------------------------------------ */
  /* Avaliação: o que foi medido. Carimbo, _ts e a própria assinatura ficam de
     fora — mudam sem que o dado mude. */
  function conteudoAvaliacao(av) {
    av = obj(av);
    return { id: av.id || null, data: av.data || null, tipo: av.tipo || '', bbch: av.bbch || '',
      variaveis: Array.isArray(av.variaveis) ? av.variaveis.slice() : [], tipos: obj(av.tipos),
      varcfg: obj(av.varcfg), notas: obj(av.notas), bruto: obj(av.bruto) };
  }
  /* Finalização: a estatística congelada e o conteúdo de cada avaliação. */
  function conteudoFinalizacao(st) {
    st = obj(st);
    var avs = (Array.isArray(st.avaliacoes) ? st.avaliacoes : []).filter(Boolean)
      .map(function (a) { return { id: a.id || null, hash: h(conteudoAvaliacao(a)) }; })
      .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
    return { estudo: st.id || null, codigo: st.codigo || null, tratamentos: Array.isArray(st.tratamentos) ? st.tratamentos : [],
      numRepeticoes: st.numRepeticoes || null, estatisticaFinal: st.estatisticaFinal || null, avaliacoes: avs };
  }
  /* Protocolo aprovado: o retrato que o ProtocoloVivoCore congelou. */
  function conteudoProtocolo(pv) { return { retrato: obj(pv).retrato || null, versao: obj(pv).versao || 1 }; }

  /* ---- assinar e conferir ------------------------------------------------ */
  function cabecalho(a) {
    return { escopo: a.escopo, conteudoHash: a.conteudoHash, em: a.em, por: a.por || '', nome: a.nome || '', significado: a.significado || '' };
  }
  function assinar(escopo, conteudo, quem) {
    quem = obj(quem);
    if (!escopo) throw new Error('Assinatura sem escopo.');
    var a = { alg: 'SHA-256', v: 1, escopo: String(escopo), conteudoHash: h(conteudo),
      em: quem.em || new Date().toISOString(), por: String(quem.por || ''), nome: String(quem.nome || ''),
      significado: String(quem.significado || '') };
    a.hash = h(cabecalho(a));
    return a;
  }
  /* Confere uma assinatura contra o conteúdo como está agora.
     ok: tudo bate · 'conteudo': o dado mudou depois de assinado ·
     'cabecalho': alguém mexeu em quem/quando/significado · 'invalida': não é uma assinatura. */
  function conferir(a, conteudo) {
    if (!a || a.alg !== 'SHA-256' || !a.hash || !a.conteudoHash) return { ok: false, motivo: 'invalida' };
    if (h(cabecalho(a)) !== a.hash) return { ok: false, motivo: 'cabecalho' };
    if (h(conteudo) !== a.conteudoHash) return { ok: false, motivo: 'conteudo' };
    return { ok: true, motivo: null };
  }
  function rubricaDe(a) { return a && a.hash ? PREFIXO + a.hash : null; }
  function ehEletronica(rubrica) { return typeof rubrica === 'string' && rubrica.indexOf(PREFIXO) === 0; }
  /* Os 16 primeiros dígitos, em grupos de 4: o bastante para conferir de olho. */
  function curto(hash) { var s = String(hash || '').replace(PREFIXO, '').slice(0, 16); return s.replace(/(.{4})(?=.)/g, '$1 '); }

  var api = { PREFIXO: PREFIXO, conteudoAvaliacao: conteudoAvaliacao, conteudoFinalizacao: conteudoFinalizacao,
    conteudoProtocolo: conteudoProtocolo, assinar: assinar, conferir: conferir, rubricaDe: rubricaDe,
    ehEletronica: ehEletronica, curto: curto };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AssinaturaCore = api;
})(typeof self !== 'undefined' ? self : this);
