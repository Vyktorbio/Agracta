/* Fiação da interface: todo onclick= do HTML aponta para função que existe.
 *
 * O Agracta liga a interface inteira por handler inline — onclick="salvarX()".
 * Renomear ou apagar uma função não quebra teste nenhum, não quebra o carregamento,
 * e não aparece no console: só falha quando alguém, no campo, clica no botão e
 * nada acontece. Este teste varre index.html e cobra que cada função chamada por
 * um handler exista de verdade depois que o app.js carrega.
 *
 * (Substitui o antigo test_runtime.js, que lia
 *  /Users/victorchavesmachado/Documents/projeto bioestat/index.html — outra
 *  máquina e outro projeto. Nunca rodou aqui.)
 *
 * Rodar: node test_fiacao_ui.js
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

/* Extrai os nomes de função chamados por handler inline no HTML.
   Pega  onclick="foo()"  onchange="bar(1,2)"  onclick="a();b()"  e
   onkeydown="if(x)c()" — em todos, o que interessa é o identificador
   imediatamente antes do parêntese. */
function funcoesDosHandlers(html){
  var achadas = {};
  var handler = /\bon(?:click|change|input|submit|keydown|keyup|focus|blur|load)\s*=\s*"([^"]*)"/gi;
  var m;
  while((m = handler.exec(html)) !== null){
    var corpo = m[1];
    /* o (?:^|[^\w$.]) descarta CHAMADA DE MÉTODO: em event.stopPropagation() quem
       responde é o objeto, não uma função global — cobrar isso do app.js seria
       falso positivo. Só interessa identificador solto seguido de parêntese. */
    var chamada = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g, c;
    while((c = chamada.exec(corpo)) !== null){
      achadas[c[1]] = true;
      chamada.lastIndex--;   /* o separador consumido pode ser o início da próxima */
    }
  }
  return Object.keys(achadas).sort();
}

/* Palavras que casam com o padrão mas não são função nossa. */
var IGNORAR = {
  'if':1,'for':1,'while':1,'switch':1,'catch':1,'return':1,'typeof':1,'function':1,
  'Event':1,'Date':1,'Number':1,'String':1,'Boolean':1,'Array':1,'Object':1,'JSON':1,
  'parseInt':1,'parseFloat':1,'alert':1,'confirm':1,'prompt':1,'setTimeout':1,'RegExp':1
};

var html = fs.readFileSync('index.html', 'utf8');
var nomes = funcoesDosHandlers(html).filter(function(n){ return !IGNORAR[n]; });

S('index.html: cada onclick aponta para função existente');
check(nomes.length > 20, 'o HTML tem handlers para conferir  (' + nomes.length + ' funções distintas)');

var faltando = [];
nomes.forEach(function(n){
  var existe = (typeof C[n] === 'function');
  if(!existe) faltando.push(n);
  check(existe, n + '()');
});

if(faltando.length){
  console.log('\n  As funções acima são chamadas por um botão do HTML e NÃO existem');
  console.log('  no app.js. Clicar nesse botão não faz nada e não avisa ninguém:');
  faltando.forEach(function(n){ console.log('    - ' + n); });
}

/* As folhas de figura são documento próprio (têm o script embutido), então aqui
   basta garantir que o Agracta ainda sabe abrir cada uma. */
S('As portas de entrada das folhas continuam de pé');
['openCroqui','openPranchaEstudo','openCalcLab','openCalcAplicacao','finalizarEstudo','reabrirEstudo']
  .forEach(function(n){ check(typeof C[n] === 'function', n + '() existe'); });

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
