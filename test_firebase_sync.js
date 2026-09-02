var fs = require('fs');
var vm = require('vm');

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
vm.runInContext(fs.readFileSync('firebase-sync.js', 'utf8'), context);

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
assert(rebuilt.notas_campo[0].foto === photo, 'foto fragmentada não voltou');
assert(JSON.stringify(flat).indexOf('[[-22.58') < 0, 'array aninhado chegou cru ao Firestore');

/* ---- O save() é o gatilho de sincronização ----
   Depois que o Supabase saiu não há mais escrita dupla nem outbox: o único caminho do
   dado até a nuvem é o firebase-sync.js embrulhar window.save. Se esse embrulho sumir
   num refactor, o app continua salvando no aparelho e para de sincronizar — em
   silêncio, que é o pior jeito de quebrar. */
var _fsrc = fs.readFileSync('firebase-sync.js', 'utf8');
assert(/var\s+originalSave\s*=\s*window\.save/.test(_fsrc), 'o save() original não é guardado');
assert(/window\.save\s*=\s*function/.test(_fsrc), 'window.save não é substituído pelo embrulho');
var _w = _fsrc.slice(_fsrc.indexOf('var originalSave'));
_w = _w.slice(0, _w.indexOf('function firebaseInit'));
assert(/originalSave\.apply/.test(_w), 'o embrulho não chama o original — salvar local não pode depender da rede');
assert(/checkpointPut/.test(_w), 'o embrulho não empurra o checkpoint');
assert(/return\s+out/.test(_w), 'o embrulho não devolve o que o original devolveu');

console.log('firebase-sync roundtrip: ok');
console.log('gatilho de sincronizacao (save embrulhado): ok');
