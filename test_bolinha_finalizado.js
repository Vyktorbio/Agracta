/* A bolinha da quadra depois de finalizar (e de reabrir).
 *
 * `estudosAtivos` ja exclui o estudo finalizado, e a bolinha do mapa conta por
 * ele — mas quem conta so acerta se for chamado de novo. Finalizar mexia no
 * dado, chamava `renderAgenda()` e parava ai: o mapa nao era redesenhado e a
 * bolinha seguia mostrando o numero de antes, o que da na tela exatamente o
 * mesmo resultado de nao ter finalizado.
 *
 * Rodar: node test_bolinha_finalizado.js
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
/* os motores puros que o fluxo de finalizacao consulta (progresso das
   avaliacoes e checklist do protocolo) — mesma ordem do index.html */
['vendor/avaliacao-core.js','vendor/protocolo-core.js','vendor/pendencias-core.js'].forEach(function(f){
  try{ vm.runInContext(fs.readFileSync(f, 'utf8'), context, {filename: f}); }catch(e){}
});
/* assinatura eletrônica (SHA-256), carregada depois do app como no index.html */
['vendor/eventos-core.js','vendor/assinatura-core.js'].forEach(function(f){ vm.runInContext(fs.readFileSync(f,'utf8'), context, {filename:f}); });
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});


var falhas = 0, passes = 0;
function check(ok, nome){
  if(ok){ passes++; console.log('  ok    ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}

/* ---------- espioes: quem foi mandado redesenhar ---------- */
var pintou = [];
context.render          = function(){ pintou.push('render'); };
context.renderAgenda    = function(){ pintou.push('renderAgenda'); };
context.updateAgendaBadge = function(){ pintou.push('updateAgendaBadge'); };
context.updateTodayBadge  = function(){ pintou.push('updateTodayBadge'); };

/* portoes do fluxo real, sem a parte humana */
context.requireDeletePassword = function(msg, cb){ cb(); };
context.openRubrica = function(cb){ cb(true); };  /* toque em Assinar */
context.confirm = function(){ return true; };
context.alert = function(){};
context.prompt = function(){ return 'engano na data de aplicacao'; };

function cenario(){
  function est(n){
    return {id:'S'+n, codigo:'E'+n, dataInicio:'2026-09-01', numAplicacoes:1,
            intervaloDias:7, tratamentos:[{id:'T1'},{id:'T2'}], aplicacoes:[], avaliacoes:[]};
  }
  context.data = {__config:{}, D1:{cultura:'soja', cultivar:'x', plantio:'2026-08-01',
                                   area:10, estudos:[est(1), est(2), est(3)]}};
  context.QGEO  = {D1:[[-22.58,-47.52],[-22.58,-47.51],[-22.57,-47.51],[-22.57,-47.52]]};
  context.QNOME = {D1:'D1'}; context.QLOCAL = {D1:'iracemapolis'};
  pintou = [];
}

/* ---------- 1. finalizar tira o ensaio da contagem E manda redesenhar ---------- */
console.log('\n[1] finalizar');
cenario();
check(context.estudosAtivos('D1').length === 3, 'os tres ensaios contam antes de finalizar');

context.finalizarEstudo('D1','S1');
var s1 = context.data.D1.estudos[0];
check(!!(s1.finalizacao && s1.finalizacao.em), 'o estudo ficou mesmo finalizado');
check(context.estudosAtivos('D1').length === 2, 'a contagem cai para dois');
check(pintou.indexOf('render') >= 0,
      'o MAPA foi mandado redesenhar — e a bolinha que conta mora nele');
check(pintou.indexOf('renderAgenda') >= 0, 'a agenda tambem foi redesenhada');
check(pintou.indexOf('updateAgendaBadge') >= 0, 'o selo da agenda foi atualizado');

/* ---------- 2. reabrir devolve o ensaio a contagem, pelo mesmo caminho ---------- */
console.log('\n[2] reabrir');
pintou = [];
context.reabrirEstudo('D1','S1');
check(!context.data.D1.estudos[0].finalizacao, 'o estudo voltou a ficar aberto');
check(context.estudosAtivos('D1').length === 3, 'a contagem volta para tres');
check(pintou.indexOf('render') >= 0, 'reabrir tambem manda o mapa redesenhar');

/* ---------- 3. a regra de contagem em si ---------- */
console.log('\n[3] a regra que a bolinha usa');
cenario();
context.data.D1.estudos[1].finalizacao = {em:'2026-09-20T10:00:00.000Z'};
check(context.estudosAtivos('D1').length === 2, 'estudo com finalizacao nao conta');
context.data.D1.estudos[1].finalizacao = {};
check(context.estudosAtivos('D1').length === 3,
      'finalizacao sem carimbo `em` nao vale — o estudo ainda esta rodando');

/* ---------- 4. o redesenho nao pode derrubar a gravacao ---------- */
console.log('\n[4] um redesenho que estoura nao pode levar o estudo junto');
cenario();
context.render = function(){ pintou.push('render'); throw new Error('mapa sem Leaflet'); };
var estourou = null;
try{ context.finalizarEstudo('D1','S2'); }catch(e){ estourou = e; }
context.render = function(){ pintou.push('render'); };
check(!estourou, 'falha ao redesenhar nao sobe para quem chamou');
check(!!(context.data.D1.estudos[1].finalizacao||{}).em, 'a finalizacao continua gravada');

/* ---------- resultado ---------- */
console.log('\n' + passes + ' passaram, ' + falhas + ' falharam');
if(falhas) process.exit(1);
