/* Momento da avaliação: HAT/DAT explícito e OPCIONAL.
 *
 * O contrato que estes testes protegem:
 *   - avaliação SEM momento continua exatamente como sempre foi (DAA da data);
 *   - momento pela metade (só o valor, ou só a unidade) é ausente, não é meio;
 *   - HAT vira fração de DIA, porque é sobre esse eixo que a AACPD integra;
 *   - duas leituras do MESMO dia com HAT diferente são DUAS avaliações — nem a
 *     deduplicação por data nem a da prancha pode fundir/descartar uma delas.
 *
 * Rodar: node test_momento_avaliacao.js
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

/* ------------------------------------------ momento derivado (o de sempre) --- */
S('Sem momento declarado: nada muda');
var m0 = C.avMomento({data:'2026-08-11'}, 7);
eq(m0.explicito, false, 'avaliação sem momento não é explícita');
eq(m0.dias, 7, 'o eixo continua sendo o DAA derivado da data');
eq(m0.chave, 'DAA:7', 'a chave de deduplicação continua sendo o DAA');
eq(m0.rotulo, '7 DAA', 'e o rótulo continua "7 DAA"');
eq(C.avMomento({}, 0).chave, 'DAA:0', 'DAA 0 tem chave própria');

/* --------------------------------------------------- momento pela metade --- */
S('Momento incompleto é ausente, não meio-preenchido');
eq(C.avMomento({momento:{valor:2}}, 5).explicito, false, 'valor sem unidade: cai no DAA');
eq(C.avMomento({momento:{unidade:'HAT'}}, 5).explicito, false, 'unidade sem valor: cai no DAA');
eq(C.avMomento({momento:{valor:'abc', unidade:'HAT'}}, 5).explicito, false, 'valor não numérico: cai no DAA');
eq(C.avMomento({momento:{valor:2, unidade:'XPTO'}}, 5).explicito, false, 'unidade desconhecida: cai no DAA');

/* ------------------------------------------------------- HAT vira fração --- */
S('HAT é convertido para dias (eixo da AACPD)');
var m1 = C.avMomento({momento:{valor:24, unidade:'HAT'}}, 0);
eq(m1.explicito, true, '24 HAT é um momento explícito');
eq(m1.dias, 1, '24 HAT = 1 dia no eixo');
eq(m1.rotulo, '24 HAT', 'mas o rótulo diz HAT, não dias');
eq(C.avMomento({momento:{valor:2, unidade:'HAT'}}, 0).dias, 2/24, '2 HAT = 2/24 de dia');
eq(C.avMomento({momento:{valor:7, unidade:'DAT'}}, 99).dias, 7, 'DAT já está em dias — e ignora o DAA da data');
eq(C.avMomento({momento:{valor:1, unidade:'HAT'}}, 0).chave,
   'HAT:1', 'a chave carrega unidade e valor');
check(C.avMomento({momento:{valor:1,unidade:'HAT'}},0).chave
   !== C.avMomento({momento:{valor:2,unidade:'HAT'}},0).chave, '1 HAT e 2 HAT têm chaves diferentes');

/* ------------------------------------- knockdown: 4 leituras no mesmo dia --- */
S('Knockdown 1/2/4/24 HAT no mesmo dia');
function av(id, hat){
  var a = {id:id, data:'2026-08-11', variaveis:['Mortalidade'], notas:{}, tipos:{}};
  if(hat != null) a.momento = {valor:hat, unidade:'HAT'};
  /* grade cheia: 2 tratamentos x 2 repetições */
  ['T1','T2'].forEach(function(t){ for(var r=1;r<=2;r++){
    a.notas[t+'R'+r] = {Mortalidade: String(10*(hat||1) + r)};
  } });
  return a;
}
var estudo = C.normalizeStudy({
  id:'E1', codigo:'BIO-01', dataInicio:'2026-08-11',
  numRepeticoes:2,
  tratamentos:[{id:'T1',produto:'A',dose:'100'},{id:'T2',produto:'B',dose:'200',testemunha:true}],
  aplicacoes:[{id:'ap1', data:'2026-08-11'}],
  avaliacoes:[av('a1',1), av('a2',2), av('a3',4), av('a4',24)]
});
eq((estudo.avaliacoes||[]).length, 4, 'normalizeStudy preserva as quatro leituras');

var s2 = {id:'E2', avaliacoes:[av('a1',1), av('a2',2), av('a3',4), av('a4',24)]};
C._dedupeAvaliacoes(s2);
eq(s2.avaliacoes.length, 4, 'a deduplicação por data NÃO funde leituras com HAT diferente');

var s3 = {id:'E3', avaliacoes:[av('b1',null), av('b2',null)]};
C._dedupeAvaliacoes(s3);
eq(s3.avaliacoes.length, 1, 'duas avaliações sem momento no mesmo dia continuam fundindo (como antes)');

/* ------------------------------------------------ a prancha não descarta --- */
S('A prancha mantém as quatro no eixo');
var trats = estudo.tratamentos;
var base  = new Date(2026, 7, 11);
var dd = C._pranchaDatas(estudo, 'Mortalidade', trats, 2, base);
eq(dd.usadas.length, 4, 'as quatro leituras entram na folha');
var ordem = dd.usadas.map(function(x){ return x.mom.rotulo; }).join(' < ');
eq(ordem, '1 HAT < 2 HAT < 4 HAT < 24 HAT', 'e saem na ordem do momento, não da data');

/* mesmo estudo, mas sem HAT nenhum: volta a ser uma só (comportamento antigo) */
var semHat = C.normalizeStudy({
  id:'E4', codigo:'BIO-02', dataInicio:'2026-08-11', numRepeticoes:2,
  tratamentos:trats,
  aplicacoes:[{id:'ap1', data:'2026-08-11'}],
  avaliacoes:[av('c1',1), av('c2',2)].map(function(a){ delete a.momento; return a; })
});
var dd2 = C._pranchaDatas(semHat, 'Mortalidade', trats, 2, base);
eq(dd2.usadas.length, 1, 'sem momento declarado, mesmo dia continua colapsando em uma');

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
