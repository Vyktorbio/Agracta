/* Quadra de laboratório: tipo, especialidade e a fila de amostras da Nematologia.
 *
 * O contrato que estes testes protegem:
 *   - quadra sem `tipo` continua sendo de CAMPO (nada muda para o que já existe);
 *   - quadra de laboratório é alcançável mesmo sem polígono — se sumir de
 *     quadrasDoLocal ela some do mapa, das contagens e da checagem de nome;
 *   - o status da amostra é DERIVADO das datas, nunca um campo gravado: assim é
 *     impossível existir amostra "entregue" sem data de entrega;
 *   - campo -> lab não pode apagar geometria em silêncio.
 *
 * Rodar: node test_laboratorio.js
 */
var fs = require('fs');
var vm = require('vm');

/* ---------- sandbox de navegador mínimo (mesmo padrão de test_avaliacao_tipos.js) ---------- */
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
var avisos = [];
var context = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(m){ avisos.push(String(m)); }, confirm: function(){ return true; }, prompt: function(){ return ''; }
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
vm.runInContext(fs.readFileSync('vendor/biocalc-lab-core.js', 'utf8'), context, {filename: 'biocalc-lab-core.js'});
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});

var falhas = 0, passes = 0, secao = '';
function S(t){ secao = t; console.log('\n' + t); }
function check(ok, nome){
  if(ok){ passes++; console.log('  ok    ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}
function eq(a, b, nome){ check(a === b, nome + (a === b ? '' : '  (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

var C = context;

/* ------------------------------------------------------- tipo da quadra --- */
S('Tipo da quadra');
C.data = C.data || {};
C.data.QCampo = {cultura:'Soja', estudos:[]};
C.data.QLab   = {estudos:[], tipo:'lab', labTipo:'Entomologia', ponto:[-22.65,-47.52]};

eq(C.quadraTipo('QCampo'), 'campo', 'quadra sem `tipo` é de campo');
eq(C.quadraTipo('QLab'), 'lab', 'quadra com tipo lab é de laboratório');
eq(C.quadraTipo('QNaoExiste'), 'campo', 'quadra inexistente não quebra — assume campo');
check(C.isQuadraLab('QLab') === true && C.isQuadraLab('QCampo') === false, 'isQuadraLab separa os dois');

/* ------------------------------------------------- especialidade do lab --- */
S('Especialidade do laboratório');
eq(C.quadraLabTipo('QLab'), 'Entomologia', 'lê a especialidade gravada');
eq(C.quadraLabTipo('QCampo'), '', 'quadra de campo não tem especialidade');
C.data.QLab.labTipo = 'Coisa Inventada';
eq(C.quadraLabTipo('QLab'), '', 'especialidade fora da lista é ignorada, não propagada');
C.data.QLab.labTipo = 'Entomologia';
eq(C.LAB_TIPOS.length, 3, 'três laboratórios');
check(C.LAB_TIPOS.indexOf('Nematologia') >= 0, 'Nematologia está na lista');
check(C.setQuadraLabTipo('QCampo', 'Entomologia') === false, 'não dá especialidade a quadra de campo');
check(C.setQuadraLabTipo('QLab', 'Fitopatologia') === true && C.quadraLabTipo('QLab') === 'Fitopatologia', 'troca de especialidade grava');
C.setQuadraLabTipo('QLab', 'Nematologia');

/* Cada laboratório oferece só os tipos de estudo que fazem sentido nele */
S('Tipos de estudo por laboratório');
check(C.TIPOS_POR_LAB.Entomologia.indexOf('Mortalidade') >= 0, 'Entomologia oferece Mortalidade');
check(C.TIPOS_POR_LAB.Fitopatologia.indexOf('Fungo in vitro') >= 0, 'Fitopatologia oferece in vitro');
check(C.TIPOS_POR_LAB.Fitopatologia.indexOf('Fungo in vivo') >= 0, 'Fitopatologia oferece in vivo');
check(!!C.CATALOGO_AVAL['Fungo in vitro'], 'in vitro tem catálogo de variáveis');
check(C.CATALOGO_AVAL['Fungo in vitro'].some(function(v){ return /colônia/i.test(v.nome); }),
  'in vitro mede diâmetro de colônia');
check(C.CATALOGO_AVAL['Fungo in vitro'].some(function(v){ return v.sub === 2; }),
  'colônia é medida em 2 eixos (sub-amostras = 2)');

/* ------------------------------------- quadra de lab é alcançável no app --- */
S('A quadra de lab não pode sumir do app');
C.ensureLocais();
C.QLOCAL = C.QLOCAL || {};
C.QLOCAL.QCampo = C.localAtivo; C.QLOCAL.QLab = C.localAtivo;
C.QGEO = C.QGEO || {};
C.QGEO.QCampo = [[-22.65,-47.52],[-22.65,-47.51],[-22.64,-47.51]];
var lista = C.quadrasDoLocal(C.localAtivo);
check(lista.indexOf('QLab') >= 0, 'quadra de lab (sem polígono) aparece em quadrasDoLocal');
check(lista.indexOf('QCampo') >= 0, 'quadra de campo continua aparecendo');
check(lista.filter(function(q){ return q === 'QLab'; }).length === 1, 'não aparece duplicada');

/* Campo -> lab não pode apagar geometria calada */
S('Trocar campo -> lab com polígono desenhado');
avisos.length = 0;
var okTroca = C.setQuadraTipo('QCampo', 'lab');
check(okTroca === false, 'a troca é recusada');
check(C.QGEO.QCampo && C.QGEO.QCampo.length === 3, 'a geometria continua intacta');
check(avisos.length > 0 && /pol[íi]gono/i.test(avisos[0]), 'e explica o porquê ao usuário');

/* ---------------------------------------------- Nematologia: fila de amostras --- */
S('Nematologia — status derivado das datas');
var vazia    = {matriz:'Solo', daa:'15'};
var naFila   = {matriz:'Solo', daa:'15', entrada:'2026-08-03'};
var extraida = {matriz:'Solo', daa:'15', entrada:'2026-08-03', extracao:'2026-08-05'};
var lida     = {matriz:'Solo', daa:'15', entrada:'2026-08-03', extracao:'2026-08-05', leitura:'2026-08-07'};
var entregue = {matriz:'Solo', daa:'15', entrada:'2026-08-03', extracao:'2026-08-05', leitura:'2026-08-07', entrega:'2026-08-08'};

eq(C.nemStatus(vazia).k,    'sem-entrada', 'sem data de entrada: sem entrada');
eq(C.nemStatus(naFila).k,   'fila',        'só com entrada: na fila');
eq(C.nemStatus(extraida).k, 'extraida',    'com extração: aguarda leitura');
eq(C.nemStatus(lida).k,     'lida',        'com leitura: aguarda entrega');
eq(C.nemStatus(entregue).k, 'entregue',    'com entrega: entregue');

/* A propriedade que importa: nunca "entregue" sem data de entrega. Vale para
   qualquer combinação das quatro datas, inclusive as fora de ordem. */
var combos = 0, quebras = 0;
[0,1].forEach(function(a){ [0,1].forEach(function(b){ [0,1].forEach(function(c){ [0,1].forEach(function(d){
  var am = {};
  if(a) am.entrada  = '2026-08-01';
  if(b) am.extracao = '2026-08-02';
  if(c) am.leitura  = '2026-08-03';
  if(d) am.entrega  = '2026-08-04';
  combos++;
  var st = C.nemStatus(am);
  if(st.k === 'entregue' && !am.entrega) quebras++;
  if(!st.rot || !st.cor) quebras++;                     /* todo status tem rótulo e cor */
}); }); }); });
eq(combos, 16, 'testadas as 16 combinações de datas');
eq(quebras, 0, 'nenhuma combinação produz "entregue" sem data de entrega');

/* Uma data fora de ordem (leitura sem extração) não pode virar status inválido */
eq(C.nemStatus({entrada:'2026-08-01', leitura:'2026-08-03'}).k, 'lida',
  'leitura sem extração ainda é reconhecida (a etapa mais avançada vence)');

S('Nematologia — resumo do estudo');
var est = {id:'e1', codigo:'NEM-001', amostras:[naFila, extraida, lida, entregue, vazia]};
var r = C.nemResumo(est);
eq(r.fila, 1, '1 na fila');
eq(r.extraida, 1, '1 extraída');
eq(r.lida, 1, '1 lida');
eq(r.entregue, 1, '1 entregue');
eq(r['sem-entrada'], 1, '1 sem entrada');
var soma = r.fila + r.extraida + r.lida + r.entregue + r['sem-entrada'];
eq(soma, est.amostras.length, 'o resumo cobre todas as amostras, sem sobra nem falta');

eq(C.nemAmostras({id:'x'}).length, 0, 'estudo sem amostras devolve lista vazia, não quebra');
check(Array.isArray(C.nemAmostras({id:'y'})), 'e sempre devolve array');

/* O painel do laboratório precisa citar o estudo e o andamento */
S('Nematologia — painel do laboratório');
C.data.QLab.estudos = [est];
var painel = C.nemPainel('QLab');
check(/NEM-001/.test(painel), 'o painel mostra o número do estudo');
check(/em andamento|conclu/i.test(painel), 'e a situação geral');
check(/5 amostras/.test(painel), 'e quantas amostras são');
var vazio = C.nemPainel('QCampo');
check(/Nenhum estudo/.test(vazio), 'laboratório sem estudo explica o que fazer');

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
