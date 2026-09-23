/* O que muda o dado tem de mudar a tela.
 *
 * A bolinha da quadra conta `estudosAtivos`; o alerta vermelho olha a data do
 * proximo evento. As duas coisas sao lidas na hora de DESENHAR — so acertam se
 * alguem mandar desenhar de novo. Varrendo o app, seis funcoes gravavam e
 * repintavam so a ficha aberta, deixando o mapa velho: apagar estudo, salvar
 * estudo, salvar/remover aplicacao, salvar/remover avaliacao.
 *
 * Medido no navegador ANTES: apagar um estudo deixava a bolinha em 3 com dois
 * ativos, e lancar avaliacao para AMANHA nao acendia o alerta de urgencia.
 *
 * Consertar as seis deixaria a setima aparecer depois. Quem grava passa por
 * `save()`, entao o redesenho mora la.
 *
 * Rodar: node test_tela_apos_gravar.js
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
  if(ok){ passes++; console.log('  ok    ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}

var pintou = 0;
context.render = function(){ pintou++; };
context.updateAgendaBadge = function(){};
context.updateTodayBadge = function(){};
context.data = {__config:{}, D1:{cultura:'soja', estudos:[]}};

function esperar(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

(async function(){
  /* A propria carga do app.js agenda um redesenho. Deixa ele acontecer antes de
     medir, senao a conta do primeiro caso sai com um a mais que nao e dele. */
  await esperar(300);

  /* ---------- 1. gravar manda redesenhar ---------- */
  console.log('\n[1] gravar manda redesenhar o mapa');
  pintou = 0;
  context.save();
  check(pintou === 0, 'nao redesenha no mesmo instante (o trabalho de quem chamou termina primeiro)');
  await esperar(300);
  check(pintou === 1, 'redesenha sozinho logo depois');

  /* ---------- 2. rajada de gravacoes = um redesenho ---------- */
  console.log('\n[2] uma rajada de gravacoes nao vira uma rajada de redesenhos');
  pintou = 0;
  for(var i = 0; i < 12; i++) context.save();
  await esperar(300);
  check(pintou === 1, 'doze gravacoes seguidas dao UM redesenho');

  /* ---------- 3. a carga inicial nao redesenha ---------- */
  console.log('\n[3] na carga inicial o mapa ainda nao existe');
  pintou = 0;
  context.window._agractaBootLoad = true;
  context.save();
  await esperar(300);
  check(pintou === 0, 'gravacao durante a carga nao dispara redesenho');
  context.window._agractaBootLoad = false;

  /* ---------- 4. um mapa que estoura nao derruba a gravacao ---------- */
  console.log('\n[4] o redesenho nao pode levar a gravacao junto');
  context.render = function(){ pintou++; throw new Error('mapa sem Leaflet'); };
  pintou = 0;
  var gravou = null, estourou = null;
  try{ gravou = context.save(); }catch(e){ estourou = e; }
  check(!estourou && gravou === true, 'save() devolve sucesso mesmo com o mapa quebrado');
  await esperar(300);
  check(pintou === 1, 'o redesenho foi tentado');
  context.render = function(){ pintou++; };

  /* ---------- 5. a fonte da contagem ---------- */
  console.log('\n[5] a regra que a bolinha usa segue de pe');
  context.data = {__config:{}, D1:{cultura:'soja', estudos:[
    {id:'S1', codigo:'E1'},
    {id:'S2', codigo:'E2', finalizacao:{em:'2026-09-20T10:00:00.000Z'}}
  ]}};
  check(context.estudosAtivos('D1').length === 1, 'estudo finalizado nao conta');

  /* ---------- 6. o ponto de redesenho esta no save, nao espalhado ---------- */
  console.log('\n[6] o conserto mora num lugar so');
  var appSrc = fs.readFileSync('app.js', 'utf8');
  var corpoSave = appSrc.slice(appSrc.indexOf('function save(){'), appSrc.indexOf('/* ============ STUDY UTILS ============ */'));
  check(/_rrRenderSoon\(\)/.test(corpoSave), 'save() chama o redesenho adiado');
  check(/_agractaBootLoad/.test(corpoSave), 'e pula a carga inicial');

  console.log('\n' + passes + ' passaram, ' + falhas + ' falharam');
  if(falhas) process.exit(1);
})();
