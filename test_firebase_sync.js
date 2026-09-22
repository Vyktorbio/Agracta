var fs = require('fs');
var vm = require('vm');
var syncSrc = fs.readFileSync('firebase-sync.js', 'utf8');

var store = {};
var context = {
  console: console,
  Promise: Promise,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  Date: Date,
  JSON: JSON,
  Object: Object,
  Array: Array,
  String: String,
  Number: Number,
  Math: Math,
  encodeURIComponent: encodeURIComponent,
  decodeURIComponent: decodeURIComponent,
  escape: escape,
  unescape: unescape,
  Buffer: Buffer
};

context.window = context;
context.globalThis = context;
context.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
context.localStorage = {
  getItem: function(k){ return store[k] == null ? null : store[k]; },
  setItem: function(k, v){ store[k] = String(v); },
  removeItem: function(k){ delete store[k]; }
};
context.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
context.location = { reload: function(){} };
context.document = {
  querySelector: function(){ return null; },
  getElementById: function(){ return null; },
  addEventListener: function(){},
  visibilityState: 'visible'
};
context.addEventListener = function(){};
context.cloudState = function(){ return null; };
context.cloudPull = function(){};
context.cloudSave = function(){};

vm.createContext(context);
vm.runInContext(syncSrc, context);

var photo = 'data:image/jpeg;base64,' + 'a'.repeat(1200100);
var state = {
  data: {
    __config: { adminEmail: 'admin@example.com', matrix: [1, [2, 3]] },
    Q1: {
      cultura: 'soja',
      estudos: [{
        id: 'S1',
        codigo: 'E1',
        randomizacao: [[1, 2], [3, 4]],
        aplicacoes: [{ id: 'P1', data: '2026-01-01' }],
        avaliacoes: [{
          id: 'A1',
          tipo: 'Severidade',
          notas: { T1: { sev: 12 } },
          notasMeta: { T1: { sev: { ts: 9 } } }
        }]
      }]
    }
  },
  qgeo: { Q1: [[-22.58, -47.52], [-22.57, -47.51]] },
  qgeots: { Q1: 1 },
  georef: { corners: [[1, 2], [3, 4]] },
  georefts: 2,
  locais: { L1: { nome: 'Local' } },
  qlocal: { Q1: 'L1' },
  qnome: { Q1: 'Quadra 1' },
  qnomets: { Q1: 3 },
  qlocalts: { Q1: 4 },
  locaists: { L1: 5 },
  randomizacoes: [{ id: 'R1', nome: 'R', matriz: [[1, 2], [3, 4]] }],
  notas_campo: [{ id: 'N1', titulo: 'Nota', foto: photo }],
  itens: {
    IT1: {id:'IT1',nome:'Produto A',doses:[{id:'D1',valor:0.8,unidade:'L/ha'}],
          lotes:[{id:'L1',codigo:'LOT-01',unidade:'mL',eventos:[{id:'EV1',tipo:'recebimento',quantidade:500,impacto:500,saldoApos:500}]}],
          vinculosHistoricos:[{id:'VH1',qid:'Q9',estudoId:'E9',tratamentoId:'T2',dose:'400 mL/ha'}]},
    IT_APAGADO: {id:'IT_APAGADO',nome:'Não deve voltar'}
  },
  itensts: {IT1:11,IT_APAGADO:5},
  _deletedItens: {IT_APAGADO:10},
  _deletedQuadras: {},
  _deletedLocais: {},
  _deletedNotas: {},
  rev: 7
};

var flat = context.AgractaFirebase.splitState(state);
var rebuilt = context.AgractaFirebase.buildState(flat, { rev: 7 });

function assert(ok, message){
  if(!ok) throw new Error(message);
}

assert(rebuilt.data.Q1.estudos[0].avaliacoes[0].notas.T1.sev === 12, 'lançamento não voltou');
assert(rebuilt.data.Q1.estudos[0].aplicacoes[0].id === 'P1', 'aplicação não voltou');
assert(rebuilt.data.Q1.estudos[0].randomizacao[1][0] === 3, 'matriz não voltou');
assert(rebuilt.qgeo.Q1[1][1] === -47.51, 'geometria não voltou');
/* A foto da nota mora no aparelho (14a publicação): nunca sobe. */
assert(Object.keys(flat.media).length === 0, 'foto da nota não pode ir para a coleção media');
assert(JSON.stringify(flat.notas_campo).indexOf(photo) < 0, 'foto da nota não pode ir dentro da nota');
assert(!rebuilt.notas_campo[0].foto, 'foto não deveria voltar do servidor');
/* Foto ANTIGA ainda no servidor: é entregue ao app para migrar ao aparelho... */
var legado = JSON.parse(JSON.stringify(flat));
legado.media.velha0 = { noteId: 'N1', part: 0, data: photo.slice(0, 5) };
legado.media.velha1 = { noteId: 'N1', part: 1, data: photo.slice(5) };
assert(context.AgractaFirebase.buildState(legado, { rev: 7 }).notas_campo[0].foto === photo, 'foto antiga do servidor não chegou para a migração');
/* ...a não ser que a nota já tenha sido migrada em algum aparelho. */
var migrada = JSON.parse(JSON.stringify(legado));
Object.keys(migrada.notas_campo).forEach(function(k){ migrada.notas_campo[k].data.fotoLocal = { nome: 'Agracta_x.jpg' }; });
assert(!context.AgractaFirebase.buildState(migrada, { rev: 7 }).notas_campo[0].foto, 'nota migrada não pode receber a foto antiga de novo');
assert(syncSrc.indexOf("COLLECTIONS_GRAVACAO.forEach") >= 0 && syncSrc.indexOf('V.mudancas(FB.remoteFlat||{},next,COLLECTIONS_GRAVACAO)') >= 0, 'gravação não pode tocar a coleção media');
assert(rebuilt.itens.IT1.nome === 'Produto A', 'item não voltou');
assert(rebuilt.itens.IT1.lotes[0].eventos[0].saldoApos === 500, 'cadeia de custódia do item não voltou');
assert(rebuilt.itens.IT1.vinculosHistoricos[0].estudoId === 'E9', 'vínculo histórico do item não voltou');
assert(rebuilt.itensts.IT1 === 11, 'timestamp do item não voltou');
assert(rebuilt._deletedItens.IT_APAGADO === 10, 'lápide de item não voltou');
assert(!rebuilt.itens.IT_APAGADO, 'item anterior à lápide ressuscitou');
assert(Object.keys(flat.itens).length === 1, 'cada item ativo deve ocupar um documento próprio');
assert(syncSrc.indexOf("localStorage.setItem('agracta-itens-v1'") >= 0, 'checkpoint offline não restaura itens');
assert(syncSrc.indexOf("localStorage.setItem('agracta-itens-ts-v1'") >= 0, 'checkpoint offline não restaura timestamps dos itens');
assert(syncSrc.indexOf("localStorage.setItem('agracta-itens-del-v1'") >= 0, 'checkpoint offline não restaura lápides dos itens');
assert(JSON.stringify(flat).indexOf('[[-22.58') < 0, 'array aninhado chegou cru ao Firestore');

console.log('firebase-sync roundtrip: ok');
