/* Finalização do estudo (BPL): trava, estatística congelada e saída da agenda.
 *
 * O contrato que estes testes protegem:
 *   - estudo sem `finalizacao` é um estudo aberto, e nada muda para ele;
 *   - finalizar CONGELA a estatística: o número do relatório deixa de depender
 *     de quando o aparelho recalculou;
 *   - o que não deu para calcular é registrado com o porquê, não some;
 *   - estudo finalizado não aparece na agenda nem nos lembretes de hoje;
 *   - reabrir NÃO apaga a estatística assinada — arquiva.
 *
 * Rodar: node test_finalizacao.js
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

/* monta um estudo com grade cheia: 3 tratamentos x 3 repetições, 2 avaliações */
function avCheia(id, dia, offset){
  var a = {id:id, data:dia, variaveis:['Severidade'], notas:{}, tipos:{}};
  ['T1','T2','T3'].forEach(function(t,ti){ for(var r=1;r<=3;r++){
    /* ruído de propósito: dado perfeitamente aditivo dá QMerro = 0, e aí
       F é Infinity — o que testaria o oposto do que interessa aqui. */
    var ruido = [0.4, -0.3, 0.9, -0.7, 0.2, 0.6, -0.5, 0.8, -0.2][(ti*3 + r - 1) % 9];
    a.notas[t+'R'+r] = {Severidade: String(10 + ti*7 + r + offset + ruido)};
  } });
  return a;
}
function novoEstudo(){
  return C.normalizeStudy({
    /* 2 aplicações com 30 dias: a segunda cai no futuro e NÃO está registrada,
       então existe evento pendente para a agenda mostrar. */
    id:'E1', codigo:'PL-2026-0001', dataInicio:'2026-08-01', numRepeticoes:3,
    numAplicacoes:2, intervaloDias:30,
    tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
                 {id:'T2',produto:'A',dose:'1'},{id:'T3',produto:'B',dose:'2'}],
    aplicacoes:[{id:'ap1', data:'2026-08-01'}],
    avaliacoes:[avCheia('a1','2026-08-08',0), avCheia('a2','2026-08-15',5)]
  });
}

/* ---------------------------------------------- estudo aberto: nada muda --- */
S('Estudo aberto');
var est = novoEstudo();
eq(C.estudoFinalizado(est), false, 'estudo sem finalizacao está aberto');
eq(C.estudoFinalizado(null), false, 'nulo não quebra');
eq(C.estudoFinalizado({finalizacao:{}}), false, 'finalizacao sem data não conta como finalizado');

/* ------------------------------------------- a estatística é congelada --- */
S('Retrato da estatística');
var snap = C._statSnapshot(est);
check(snap.itens.length === 2, 'as duas avaliações renderam resultado  (obtido ' + snap.itens.length + ')');
check(!!snap.gerado, 'o retrato carimba quando foi gerado');
var it = snap.itens[0];
check(it.stat && isFinite(it.stat.F), 'guarda o F da ANOVA');
check(it.stat && Array.isArray(it.stat.order), 'guarda a ordem dos tratamentos');
check(it.stat && it.stat.letras, 'guarda as letras do Tukey');
eq(it.variavel, 'Severidade', 'e a variável analisada');
check(!!it.momento, 'e o momento da avaliação');

/* uma célula vazia: a avaliação não some, vai para semAnalise com o porquê */
var furado = novoEstudo();
delete furado.avaliacoes[1].notas.T2R2;
var snap2 = C._statSnapshot(furado);
eq(snap2.itens.length, 1, 'avaliação com buraco não entra nos resultados');
eq(snap2.semAnalise.length, 1, 'mas é registrada como sem análise');
check(/incompleta/.test(snap2.semAnalise[0].porque), 'com o motivo escrito');

/* ------------------------------------------------ trava e agenda --- */
S('Estudo finalizado sai da agenda');
C.data = C.data || {};
C.QGEO = C.QGEO || {}; C.QLOCAL = C.QLOCAL || {};
C.data.QA = {cultura:'Soja', estudos:[novoEstudo()]};
var comEventos = C.allUpcomingEvents(3650).filter(function(e){ return e.qid === 'QA'; });
check(comEventos.length > 0, 'estudo aberto gera lembrete  (' + comEventos.length + ')');

C.data.QA.estudos[0].finalizacao = {em:new Date().toISOString(), por:'v@x.com', nome:'Victor'};
var semEventos = C.allUpcomingEvents(3650).filter(function(e){ return e.qid === 'QA'; });
eq(semEventos.length, 0, 'finalizado some da agenda e dos lembretes de hoje');

/* --------------------------------------------- a trava fala e barra --- */
S('A trava barra a escrita');
C.curV = 'QA'; C.curSid = 'E1';
avisos.length = 0;
eq(C._bloqueadoPorFinalizacao('QA','E1'), true, 'finalizado: a porta de escrita fecha');
check(avisos.length === 1 && /somente-leitura/.test(avisos[0]), 'e explica por quê, em vez de falhar calado');

delete C.data.QA.estudos[0].finalizacao;
eq(C._bloqueadoPorFinalizacao('QA','E1'), false, 'reaberto: a porta abre de novo');

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
