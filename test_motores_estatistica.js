/* Os DOIS motores de estatística têm de concordar.
 *
 * O app tem duas implementações independentes da mesma ANOVA-DBC + Tukey:
 *   - Est.anovaDBC (estatistica.js) — usada pela PRANCHA, a figura do cliente;
 *   - statDBC (app.js)              — usada pela FINALIZAÇÃO, o número assinado.
 *
 * Elas concordam hoje, mas nada garantia que continuassem: só a primeira tem
 * teste-oráculo. Se alguém corrigir uma e esquecer a outra, o número congelado
 * na assinatura passa a divergir do número impresso no relatório — em silêncio,
 * que é exatamente o que BPL existe para impedir. Este teste quebra antes disso.
 *
 * Rodar: node test_motores_estatistica.js
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
vm.runInContext(fs.readFileSync('estatistica.js', 'utf8'), context, {filename: 'estatistica.js'});
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});

var falhas = 0, passes = 0, secao = '';
function S(t){ secao = t; console.log('\n' + t); }
function check(ok, nome){
  if(ok){ passes++; console.log('  ok    ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}
function eq(a, b, nome){ check(a === b, nome + (a === b ? '' : '  (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

var C = context;

function prox(a, b, tol, nome){
  if(a == null || b == null){ check(false, nome + '  (um dos dois devolveu nada: ' + a + ' / ' + b + ')'); return; }
  var d = Math.abs(a - b);
  check(d <= tol, nome + '  (app ' + a.toFixed(6) + ' vs Est ' + b.toFixed(6) + ', difere ' + d.toExponential(1) + ')');
}

/* Monta o mesmo ensaio nas duas formas que cada motor espera. */
function monta(Y){
  var trats = Y.map(function(_, i){ return {id:'T' + (i+1)}; });
  var av = {id:'a1', data:'2026-08-01', variaveis:['Sev'], notas:{}, tipos:{}};
  Y.forEach(function(linha, i){ linha.forEach(function(v, j){
    av.notas['T' + (i+1) + 'R' + (j+1)] = {Sev: String(v)};
  }); });
  return { s:{id:'E', tratamentos:trats, numRepeticoes:Y[0].length, avaliacoes:[av]}, av:av };
}

/* Cada caso é um formato de dado que aparece de verdade nos ensaios daqui. */
var CASOS = [
  ['severidade típica, 5 trat x 4 blocos',
    [[12.4,13.1,11.8,12.9],[4.2,5.0,4.6,4.1],[8.8,9.3,8.1,9.0],[2.1,2.6,2.3,2.0],[15.5,16.2,14.9,15.8]]],
  ['mortalidade alta, valores grandes',
    [[88,92,85,90],[95,97,93,96],[60,64,58,62],[99,98,100,97]]],
  ['valores pequenos, muitas casas',
    [[0.42,0.51,0.38,0.47],[0.12,0.09,0.15,0.11],[0.88,0.79,0.91,0.85]]],
  ['3 tratamentos x 3 blocos (mínimo usável)',
    [[10,12,11],[20,19,22],[15,14,16]]],
  ['contagem de insetos, zeros presentes',
    [[0,1,0,2],[14,12,15,13],[7,9,8,6],[0,0,1,0]]],
  ['dispersão desigual entre tratamentos',
    [[10,10.2,9.9,10.1],[30,45,22,38],[5,5.1,4.9,5.0]]],
  ['8 tratamentos (screening pequeno)',
    [[5,6,4,5],[9,8,10,9],[2,3,2,1],[14,13,15,14],[7,7,8,6],[11,12,10,11],[3,4,3,4],[18,17,19,18]]]
];

S('ANOVA: os dois motores dão o mesmo número');
CASOS.forEach(function(par){
  var nome = par[0], Y = par[1];
  var m = monta(Y);
  var A = C.statDBC(m.s, m.av, 'Sev');          /* app.js — FINALIZAÇÃO */
  var B = C.Est.anovaDBC(Y);                    /* estatistica.js — PRANCHA */
  if(!A){ check(false, nome + ': statDBC devolveu nulo'); return; }
  prox(A.MSe,  B.QMerro, 1e-9, nome + ' — QM erro');
  prox(A.F,    B.F,      1e-7, nome + ' — F');
  prox(A.cv,   B.CV,     1e-7, nome + ' — CV%');
});

S('Tukey: q e DMS batem');
CASOS.forEach(function(par){
  var nome = par[0], Y = par[1];
  var m = monta(Y);
  var A = C.statDBC(m.s, m.av, 'Sev');
  var B = C.Est.anovaDBC(Y);
  /* q sai de bisseção nos dois; 1e-4 é folga da tolerância, não de método */
  prox(A.q,   C.Est.qTukey(B.k, B.glErro), 1e-4, nome + ' — q de Tukey');
  prox(A.hsd, C.Est.dmsTukey(B.QMerro, B.r, B.k, B.glErro), 1e-4, nome + ' — DMS');
});

S('Letras: o agrupamento é o mesmo');
CASOS.forEach(function(par){
  var nome = par[0], Y = par[1];
  var m = monta(Y);
  var A = C.statDBC(m.s, m.av, 'Sev');
  var B = C.Est.anovaDBC(Y);
  var dms = C.Est.dmsTukey(B.QMerro, B.r, B.k, B.glErro);
  /* Est trabalha por índice, statDBC por id de tratamento. O que precisa bater
     é a ESTRUTURA: quem compartilha letra com quem. Comparar a letra em si
     falharia só por convenção de rotulagem. */
  var letrasEst = C.Est.letrasTukey(B.mediasTrat, dms, true);
  function pares(get, n){
    var out = [];
    for(var i=0;i<n;i++) for(var j=i+1;j<n;j++){
      var a=String(get(i)||''), b=String(get(j)||'');
      var partilha = a.split('').some(function(c){ return b.indexOf(c)>=0; });
      out.push(partilha?1:0);
    }
    return out.join('');
  }
  var pApp = pares(function(i){ return A.letras['T'+(i+1)]; }, Y.length);
  var pEst = pares(function(i){ return letrasEst[i]; }, Y.length);
  eq(pApp, pEst, nome + ' — quem difere de quem');
});

S('Os dois recusam o mesmo dado impossível');
var mDesbal = monta([[1,2,3],[4,5,6]]);
mDesbal.av.notas['T2R3'] = {Sev:''};                    /* buraco na grade */
eq(C.statDBC(mDesbal.s, mDesbal.av, 'Sev'), null, 'statDBC recusa grade incompleta');
var erro = false;
try{ C.Est.anovaDBC([[1,2,3],[4,5,NaN]]); }catch(e){ erro = true; }
check(erro, 'Est.anovaDBC recusa valor não numérico');
eq(C.statDBC(monta([[1,2,3]]).s, monta([[1,2,3]]).av, 'Sev'), null, 'statDBC recusa 1 tratamento só');

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
