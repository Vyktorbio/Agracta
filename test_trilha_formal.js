'use strict';
/* Trilha formal: selo de integridade, conflitos entre aparelhos, o que falta
   subir, importação da trilha antiga sem duplicar, e a seção entrando na ficha
   do estudo sem mexer na trilha de sempre. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { IDBFactory } = require('fake-indexeddb');

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const APP = `
var AGRACTA_TIME_ZONE='America/Sao_Paulo';
var data={ Q19:{ estudos:[{ id:'S1', codigo:'AGR-1', audit:[] }] } };
var _authUser={ email:'ana@x.com' };
var _avReopen=null;
function _currentUserName(){ return 'Ana'; }
function logStudyAuditInObject(study, action, details, extra){
  study.audit.push({ ts: Date.now(), iso: new Date().toISOString(), user:'Ana', por:'ana@x.com', action:action, details:details });
  return 'ok';
}
function studyAuditHtml(study){ return '<div class="sd-section">TRILHA DE SEMPRE</div>'; }`;
function carregar() {
  const els = {};
  const ctx = { console: { warn: () => {} }, localStorage: { getItem: () => null, setItem: () => {} },
    indexedDB: new IDBFactory(), Promise,
    setTimeout: (f, t) => { const h = setTimeout(f, t); if (h.unref) h.unref(); return h; }, clearTimeout,
    addEventListener: () => {}, navigator: { onLine: false },
    document: { getElementById: id => (els[id] = els[id] || { id, innerHTML: '' }) }, _els: els };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(APP, ctx);
  for (const f of ['vendor/observacao-core.js', 'vendor/eventos-core.js', 'eventos-app.js', 'trilha-formal.js'])
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx;
}
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const c = carregar(), E = c.EventosCore, O = c.ObservacaoCore, T = c.AgractaTrilhaFormal;
  const kEst = O.chaveEstudo('Q19', 'S1');
  const ctxEv = (em, extra) => Object.assign({ autor: { email: 'ana@x.com', nome: 'Ana' }, em }, extra || {});

  /* --- renderizar: vazio, íntegro, adulterado ------------------------------- */
  ok(/Nenhum evento formal/.test(T.renderizar({ eventos: [], enviados: [] }, { ok: true, problemas: [] })), 'sem eventos: explica o que vai aparecer');
  let reg = E.anexar([], 'estudo.finalizado', { entidade: { tipo: 'estudo', id: kEst }, rubrica: 'sha256:abc' }, ctxEv('2026-09-20T10:00:00Z')).registro;
  reg = E.anexar(reg, 'estudo.reaberto', { entidade: { tipo: 'estudo', id: kEst }, motivo: '<script>x</script> nota trocada', rubrica: 'senha' }, ctxEv('2026-09-21T10:00:00Z')).registro;
  let html = T.renderizar({ eventos: reg, enviados: [reg[0].id] }, E.verificar(reg));
  ok(html.includes('data-selo="ok"') && html.includes('2 evento(s)'), 'selo íntegro com a contagem');
  ok(html.includes('1 ainda só neste aparelho') && html.includes('só neste aparelho'), 'mostra o que falta subir');
  ok(!html.includes('<script>x') && html.includes('&lt;script&gt;'), 'motivo escapado');
  ok(html.indexOf('Estudo reaberto') < html.indexOf('Estudo finalizado'), 'mais novo primeiro');
  html = T.renderizar({ eventos: reg, enviados: reg.map(e => e.id) }, E.verificar(reg));
  ok(html.includes('Tudo na nuvem'), 'tudo enviado');
  const adult = JSON.parse(JSON.stringify(reg)); adult[1].motivo = 'outro';
  html = T.renderizar({ eventos: adult, enviados: [] }, E.verificar(adult));
  ok(html.includes('data-selo="problema"') && html.includes('alterado'), 'adulteração aparece no selo');

  /* --- conflitos entre aparelhos --------------------------------------------- */
  const obs = O.idObservacao({ qid: 'Q19', sid: 'S1', avaliacao: 'A1', parcela: 'T1R1', variavel: 'Sev' });
  const corr = (r, de, para, em) => E.anexar(r, 'observacao.corrigida', { entidade: { tipo: 'observacao', id: obs }, motivo: 'm', de, para }, ctxEv(em));
  const a = corr(reg, 10, 12, '2026-09-22T10:00:00Z').registro, b = corr(reg, 10, 13, '2026-09-22T10:05:00Z').registro;
  const m = E.merge(a, b);
  ok(T.conflitos(E.ordenar(m)).length === 1, 'duas correções do mesmo valor = um conflito');
  html = T.renderizar({ eventos: m, enviados: [] }, E.verificar(m));
  ok(html.includes('data-conflitos="1"') && html.includes('em conflito'), 'conflito destacado');
  ok(html.includes('T1R1 · Sev') && html.includes('10') && html.includes('13'), 'correção mostra parcela, variável e de→para');
  const resolvido = corr(m, 12, 13, '2026-09-23T10:00:00Z').registro;
  ok(T.conflitos(E.ordenar(resolvido)).length === 1, 'o conflito antigo continua na história mesmo depois de resolvido');
  ok(T.conflitos(E.ordenar(a)).length === 0, 'correção única não é conflito');

  /* --- importação da trilha antiga -------------------------------------------- */
  const st = c.data.Q19.estudos[0];
  st.audit = [
    { ts: Date.parse('2026-08-01T10:00:00Z'), user: 'Dir', por: 'dir@x.com', action: 'Finalização do Estudo', details: 'Estudo finalizado' },
    { ts: Date.parse('2026-08-05T10:00:00Z'), user: 'Ana', por: 'ana@x.com', action: 'Reabertura do Estudo', details: 'Reaberto para edição. Motivo: "erro de digitação".' },
    { ts: Date.parse('2026-08-06T10:00:00Z'), user: 'Ana', action: 'agenda.dispensar', details: 'lembrete' },
    { ts: Date.parse('2026-08-07T10:00:00Z'), user: 'Ana', action: 'Aprovação do protocolo', details: 'Protocolo aprovado' }
  ];
  ok(await c.AgractaEventos.importarLegado(st) === 3, 'só as ações críticas entram (agenda fica de fora)');
  ok(await c.AgractaEventos.importarLegado(st) === 0, 'importar de novo não duplica');
  /* outro aparelho importando a mesma trilha chega aos MESMOS ids */
  const c2 = carregar(); c2.data.Q19.estudos[0].audit = JSON.parse(JSON.stringify(st.audit));
  await c2.AgractaEventos.importarLegado(c2.data.Q19.estudos[0]);
  const ids1 = (await c.AgractaEventos.ficha('Q19', 'S1')).eventos.map(e => e.id).sort();
  const ids2 = (await c2.AgractaEventos.ficha('Q19', 'S1')).eventos.map(e => e.id).sort();
  ok(JSON.stringify(ids1) === JSON.stringify(ids2), 'dois aparelhos importam a mesma trilha com os mesmos ids');
  let f = await c.AgractaEventos.ficha('Q19', 'S1');
  ok(f.eventos.length === 3 && f.eventos.every(e => e.legado), 'eventos marcados como legado');
  ok(f.eventos.find(e => e.tipo === 'estudo.reaberto').motivo === 'erro de digitação', 'motivo recuperado da trilha');
  /* depois de um evento formal de verdade, o que veio depois dele não é importado */
  c.Date = Date;
  vm.runInContext("logStudyAuditInObject(data.Q19.estudos[0],'Finalização do Estudo','agora')", c);
  await c.AgractaEventos.ocioso();
  ok(await c.AgractaEventos.importarLegado(st) === 0, 'o que já tem evento formal não é importado como legado');
  f = await c.AgractaEventos.ficha('Q19', 'S1');
  ok(f.eventos.length === 4 && f.eventos.filter(e => !e.legado).length === 1, 'legado + o formal novo, sem duplicata');
  ok(E.verificar(f.eventos).ok, 'registro com legado continua íntegro');
  html = T.renderizar(f, E.verificar(f.eventos));
  ok(html.includes('importado da trilha antiga'), 'legado identificado na tela');
  ok((html.match(/só neste aparelho/g) || []).length === 2, 'legado não conta como pendente; o formal novo sim');

  /* --- encaixe na ficha do estudo ------------------------------------------- */
  ok(c.studyAuditHtml.__trilhaFormal === true && T.instalar() === false, 'instalado uma vez só');
  const out = vm.runInContext('studyAuditHtml(data.Q19.estudos[0])', c);
  ok(out.startsWith('<div class="sd-section">TRILHA DE SEMPRE</div>'), 'trilha de sempre intacta, primeiro');
  ok(/data-trilha-formal="1"/.test(out) && out.includes('Conferindo'), 'seção nova anexada');
  const id = /id="(trilha-formal-\d+)"/.exec(out)[1];
  await espera(80);
  ok(c._els[id] && c._els[id].innerHTML.includes('data-selo="ok"') && c._els[id].innerHTML.includes('4 evento(s)'), 'seção preenchida sozinha');
  ok(vm.runInContext('studyAuditHtml(null)', c).includes('TRILHA DE SEMPRE'), 'estudo inválido: só a trilha de sempre');

  console.log('trilha formal: ' + n + ' verificações OK.');
  process.exit(0);
})().catch(e => { console.error('FALHA', e); process.exit(1); });
