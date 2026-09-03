/* Regressões de sincronização.
 *
 * Cobre os dois defeitos que apagavam/derrubavam dados em produção:
 *   1. lápide de exclusão engolindo avaliação RECRIADA (ids auto_<data> são determinísticos);
 *   2. um documento Firestore por CÉLULA, relido inteiro a cada pull -> cota diária estourada.
 *
 * Rodar: node test_sync_regressoes.js
 */
var fs = require('fs');
var vm = require('vm');

/* ---------- sandbox de navegador mínimo ---------- */
function elStub(){
  return new Proxy(function(){}, {
    get: function(t, k){
      if(k === 'style') return {};
      if(k === 'classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      if(k === 'children' || k === 'childNodes') return [];
      return elStub();
    },
    set: function(){ return true; },
    apply: function(){ return elStub(); }
  });
}

var store = {};
var context = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
context.window = context; context.globalThis = context; context.self = context;
context.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
context.atob = function(s){ return Buffer.from(s, 'base64').toString('binary'); };
context.localStorage = {
  getItem: function(k){ return store[k] == null ? null : store[k]; },
  setItem: function(k, v){ store[k] = String(v); },
  removeItem: function(k){ delete store[k]; }
};
context.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
context.location = { reload: function(){}, href: '', search: '', hash: '' };
context.navigator = { onLine: true, userAgent: 'node', serviceWorker: {register: function(){ return Promise.resolve(); }, addEventListener: function(){}} };
context.document = new Proxy({}, {
  get: function(t, k){
    if(k === 'createElement' || k === 'getElementById' || k === 'querySelector' || k === 'createElementNS') return function(){ return elStub(); };
    if(k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return function(){ return []; };
    if(k === 'addEventListener' || k === 'removeEventListener') return function(){};
    if(k === 'body' || k === 'documentElement' || k === 'head') return elStub();
    if(k === 'visibilityState') return 'visible';
    if(k === 'cookie') return '';
    return elStub();
  }
});
context.addEventListener = function(){}; context.removeEventListener = function(){};
context.requestAnimationFrame = function(){};
context.matchMedia = function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; };
context.fetch = function(){ return Promise.resolve({json: function(){ return Promise.resolve({}); }}); };

vm.createContext(context);
/* mesma ordem do index.html: app.js primeiro, adaptador do Firebase depois */
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});
vm.runInContext(fs.readFileSync('firebase-sync.js', 'utf8'), context, {filename: 'firebase-sync.js'});

var falhas = 0, passes = 0;
function check(ok, nome){
  if(ok){ passes++; console.log('  ok   ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}

/* ---------- 1. lápide x avaliação recriada ---------- */
console.log('\n[1] lápide de exclusão x id determinístico auto_<data>');

var T_EXCLUSAO = 1750000000000;
function estadoComAvaliacao(avTs){
  return {
    data: {
      __config: {},
      Q1: {
        cultura: 'soja',
        estudos: [{
          id: 'S1', codigo: 'E1',
          /* a avaliação de 24/07 já foi excluída uma vez neste estudo */
          _deletedAvaliacoes: {'auto_2026-07-24': T_EXCLUSAO},
          aplicacoes: [],
          avaliacoes: [{
            id: 'auto_2026-07-24', data: '2026-07-24', auto: true, _ts: avTs,
            variaveis: ['sev'], tipos: {}, notas: {T1: {sev: 42}}, notasMeta: {T1: {sev: {ts: avTs}}}
          }]
        }]
      }
    },
    qgeo:{}, qgeots:{}, georef:null, georefts:0, locais:{}, qlocal:{}, qnome:{},
    qnomets:{}, qlocalts:{}, locaists:{}, randomizacoes:[], notas_campo:[],
    _deletedQuadras:{}, _deletedLocais:{}, _deletedNotas:{}, rev:1
  };
}
function nuvemVazia(){
  var st = estadoComAvaliacao(0);
  st.data.Q1.estudos[0].avaliacoes = [];   /* nuvem já não tem a avaliação, só a lápide */
  return st;
}
function avaliacoesDe(st){
  return ((((st.data||{}).Q1||{}).estudos||[])[0]||{}).avaliacoes||[];
}

/* recriada DEPOIS da exclusão -> tem de sobreviver ao merge */
var recriada = context.cloudMerge(estadoComAvaliacao(T_EXCLUSAO + 60000), nuvemVazia());
var avRec = avaliacoesDe(recriada);
check(avRec.length === 1, 'avaliação recriada sobrevive ao merge');
check(avRec.length === 1 && avRec[0].notas.T1.sev === 42, 'notas da avaliação recriada preservadas');

/* excluída de verdade (nada recriou) -> continua excluída */
var antiga = context.cloudMerge(estadoComAvaliacao(T_EXCLUSAO - 60000), nuvemVazia());
check(avaliacoesDe(antiga).length === 0, 'exclusão legítima continua valendo (não ressuscita)');

/* sem carimbo nenhum (dado legado) -> continua excluída */
var semTs = estadoComAvaliacao(0);
delete semTs.data.Q1.estudos[0].avaliacoes[0]._ts;
check(avaliacoesDe(context.cloudMerge(semTs, nuvemVazia())).length === 0, 'avaliação legada sem _ts continua excluída');

/* ---------- 2. criação limpa a lápide e carimba _ts ---------- */
console.log('\n[2] gerarAvaliacoesAuto');

var estudo = {
  id: 'S9', avalInicio: '2026-07-24', avalIntervalo: 0, avalNum: 1,
  avaliacoes: [], _deletedAvaliacoes: {'auto_2026-07-24': T_EXCLUSAO}
};
var criadas = context.gerarAvaliacoesAuto(estudo);
check(criadas === 1, 'gerou a avaliação da data');
check(!estudo._deletedAvaliacoes['auto_2026-07-24'], 'lápide local da mesma data foi limpa');
check((estudo.avaliacoes[0]||{})._ts > T_EXCLUSAO, 'avaliação nova nasce com _ts posterior à lápide');

/* ---------- 3. agrupamento dos lançamentos ---------- */
console.log('\n[3] 1 documento por avaliação (era 1 por célula)');

var notas = {}, notasMeta = {};
for(var p = 1; p <= 40; p++){
  notas['T' + p] = {sev: p, inc: p * 2, nota: p * 3};
  notasMeta['T' + p] = {sev: {ts: 100 + p}};
}
var estado = {
  data: {
    __config: {},
    Q1: {cultura: 'milho', estudos: [{
      id: 'S1', codigo: 'E1', aplicacoes: [{id: 'P1', data: '2026-01-01'}],
      avaliacoes: [{id: 'auto_2026-07-24', data: '2026-07-24', variaveis: ['sev','inc','nota'], tipos: {}, notas: notas, notasMeta: notasMeta}]
    }]}
  },
  qgeo:{}, qgeots:{}, georef:null, georefts:0, locais:{}, qlocal:{}, qnome:{},
  qnomets:{}, qlocalts:{}, locaists:{}, randomizacoes:[], notas_campo:[],
  _deletedQuadras:{}, _deletedLocais:{}, _deletedNotas:{}, rev:1
};

var flat = context.AgractaFirebase.splitState(estado);
var celulas = 40 * 3;
check(Object.keys(flat.lancamentos).length === 0, 'nenhum documento solto por célula');

var docsAgora = 0, c;
for(c in flat) docsAgora += Object.keys(flat[c]).length;
var docsAntes = docsAgora + celulas;    /* formato antigo: os mesmos docs + 1 por célula */
console.log('       ' + celulas + ' células -> ' + docsAgora + ' docs (antes: ' + docsAntes + ') — leituras por pull caem ' + (docsAntes / docsAgora).toFixed(1) + 'x');
check(docsAgora * 5 < docsAntes, 'contagem de documentos cai mais de 5x');

var volta = context.AgractaFirebase.buildState(flat, {rev: 1});
var avVolta = volta.data.Q1.estudos[0].avaliacoes[0];
check(avVolta.notas.T40.nota === 120, 'valores das células voltam íntegros');
check(avVolta.notas.T1.sev === 1 && avVolta.notas.T17.inc === 34, 'células intermediárias voltam íntegras');
check(avVolta.notasMeta.T7.sev.ts === 107, 'metadados (carimbo por célula) voltam íntegros');
check(Object.keys(avVolta.notas).length === 40, 'todas as parcelas voltam');

/* ---------- 4. compatibilidade com o formato antigo ---------- */
console.log('\n[4] compatibilidade: documentos gravados no formato antigo');

var legado = JSON.parse(JSON.stringify(flat));
var k, avKey = Object.keys(legado.avaliacoes)[0];
var docAv = legado.avaliacoes[avKey];
var notasLegado = docAv.notas, metaLegado = docAv.notasMeta;
delete docAv.notas; delete docAv.notasMeta;        /* como era antes: avaliação sem notas */
var n = 0;
Object.keys(notasLegado).forEach(function(parcela){
  Object.keys(notasLegado[parcela]).forEach(function(variavel){
    legado.lancamentos['leg' + (n++)] = {
      key: docAv.key + '|' + parcela + '|' + variavel,
      avaliacaoKey: docAv.key, parcela: parcela, variavel: variavel,
      valor: notasLegado[parcela][variavel],
      meta: (metaLegado[parcela] && metaLegado[parcela][variavel]) || null
    };
  });
});
var voltaLegado = context.AgractaFirebase.buildState(legado, {rev: 1});
var avLeg = voltaLegado.data.Q1.estudos[0].avaliacoes[0];
check(avLeg.notas.T40.nota === 120, 'células no formato antigo ainda são lidas');
check(avLeg.notasMeta.T7.sev.ts === 107, 'metadados no formato antigo ainda são lidos');

/* formato novo tem prioridade quando os dois existem (janela de transição) */
var misto = JSON.parse(JSON.stringify(flat));
misto.lancamentos['leg0'] = {
  key: docAv.key + '|T1|sev', avaliacaoKey: docAv.key,
  parcela: 'T1', variavel: 'sev', valor: 999, meta: null
};
var avMisto = context.AgractaFirebase.buildState(misto, {rev: 1}).data.Q1.estudos[0].avaliacoes[0];
check(avMisto.notas.T1.sev === 1, 'doc novo vence a célula antiga órfã (não regride o valor)');

/* ---------- 5. chaves que o Firestore recusa como nome de campo ---------- */
console.log('\n[5] parcela/variável com nome que o Firestore recusa');

var estadoRuim = JSON.parse(JSON.stringify(estado));
var avRuim = estadoRuim.data.Q1.estudos[0].avaliacoes[0];
avRuim.notas.T1['__total'] = 7;      /* prefixo reservado */
avRuim.notas.T1[''] = 8;             /* nome vazio */
avRuim.notas['__soma'] = {sev: 9};   /* parcela reservada */

var flatRuim = context.AgractaFirebase.splitState(estadoRuim);
var camposAv = flatRuim.avaliacoes[Object.keys(flatRuim.avaliacoes)[0]].notas;
var nomes = [];
Object.keys(camposAv).forEach(function(p){
  nomes.push(p);
  Object.keys(camposAv[p]).forEach(function(v){ nomes.push(v); });
});
check(nomes.every(function(n){ return n !== '' && n.indexOf('__') !== 0; }), 'nenhum nome de campo recusado vai para o doc da avaliação');
check(Object.keys(flatRuim.lancamentos).length === 3, 'as 3 células problemáticas viraram doc solto');

var voltaRuim = context.AgractaFirebase.buildState(flatRuim, {rev: 1}).data.Q1.estudos[0].avaliacoes[0];
check(voltaRuim.notas.T1['__total'] === 7, 'célula com prefixo reservado volta íntegra');
check(voltaRuim.notas.T1[''] === 8, 'célula com nome vazio volta íntegra');
check(voltaRuim.notas['__soma'].sev === 9, 'parcela com prefixo reservado volta íntegra');
check(voltaRuim.notas.T40.nota === 120, 'células normais seguem no formato agrupado');

/* ---------- 6. banco de itens no merge entre aparelhos ---------- */
console.log('\n[6] banco de itens: merge por identidade e lápide');
function estadoItens(itens,ts,del){
  return {data:{__config:{}},qgeo:{},qgeots:{},georef:null,georefts:0,locais:{},qlocal:{},qnome:{},
    qnomets:{},qlocalts:{},locaists:{},randomizacoes:[],notas_campo:[],itens:itens,itensts:ts,
    _deletedItens:del||{},_deletedQuadras:{},_deletedLocais:{},_deletedNotas:{},rev:1};
}
var localItens=estadoItens({
  A:{id:'A',nome:'A local novo'}, B:{id:'B',nome:'B apagado'}
},{A:20,B:5},{});
var cloudItens=estadoItens({
  A:{id:'A',nome:'A nuvem antigo'}, C:{id:'C',nome:'C só nuvem'}
},{A:10,C:12},{B:9});
var mergeItens=context.cloudMerge(localItens,cloudItens);
check(mergeItens.itens.A.nome === 'A local novo', 'edição mais recente do item vence');
check(mergeItens.itens.C.nome === 'C só nuvem', 'item criado em outro aparelho é unido');
check(!mergeItens.itens.B, 'lápide posterior remove item antigo');
check(mergeItens._deletedItens.B === 9, 'lápide do item atravessa o merge');

/* ---------- resultado ---------- */
console.log('\n' + passes + ' passaram, ' + falhas + ' falharam');
if(falhas) process.exit(1);
