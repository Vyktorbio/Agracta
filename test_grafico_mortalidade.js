/* Ensaio de mortalidade não se descreve com o vocabulário de doença.
 *
 * O usuário faz teste de mortalidade no laboratório e a folha saía falando em
 * "severidade" e "% de controle". Não é preciosismo de redação: quem lê o
 * relatório precisa saber QUAL das duas fórmulas de Abbott rodou, porque elas
 * dão números diferentes e só uma vale para cada família de variável.
 *
 * O que estes testes seguram:
 *   - o rótulo acompanha o SENTIDO da variável (menor = dano; maior = mortalidade);
 *   - a coluna de Abbott sobre a AACPD cala em mortalidade, em vez de imprimir
 *     um negativo enorme — a AACPD é integral, não é limitada a 100%, e a
 *     mortalidade corrigida não se aplica a ela;
 *   - nada disso muda a folha de doença, que é a que já está em produção.
 *
 * Rodar: node test_grafico_mortalidade.js
 */
var fs = require('fs');
var vm = require('vm');

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
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
context.window = context; context.globalThis = context; context.self = context;
context.btoa = function(s){ return Buffer.from(s,'binary').toString('base64'); };
context.atob = function(s){ return Buffer.from(s,'base64').toString('binary'); };
context.localStorage = {
  getItem: function(k){ return store[k]==null?null:store[k]; },
  setItem: function(k,v){ store[k]=String(v); },
  removeItem: function(k){ delete store[k]; }
};
context.sessionStorage = { getItem:function(){return null;}, setItem:function(){} };
context.location = { reload:function(){}, href:'', search:'', hash:'' };
context.navigator = { onLine:true, userAgent:'node', serviceWorker:{register:function(){return Promise.resolve();},addEventListener:function(){}} };
context.document = new Proxy({}, {
  get: function(t,k){
    if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS') return function(){ return elStub(); };
    if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName') return function(){ return []; };
    if(k==='addEventListener'||k==='removeEventListener') return function(){};
    if(k==='body'||k==='documentElement'||k==='head') return elStub();
    if(k==='visibilityState') return 'visible';
    if(k==='cookie') return '';
    return elStub();
  }
});
context.addEventListener=function(){}; context.removeEventListener=function(){};
context.requestAnimationFrame=function(){};
context.matchMedia=function(){ return {matches:false,addListener:function(){},addEventListener:function(){}}; };
context.fetch=function(){ return Promise.resolve({json:function(){return Promise.resolve({});}}); };

vm.createContext(context);
vm.runInContext(fs.readFileSync('app.js','utf8'), context, {filename:'app.js'});

var f=0, p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n)}else{f++;console.log('  FALHA '+n)} }

/* Um estudo de bancada: 3 tratamentos × 4 blocos, duas leituras.
   valores[trat][bloco][data] em % — testemunha baixa, tratados altos. */
function estudo(nomeVar, sentido, valores){
  var trats=['T1','T2','T3'];
  var av=function(di,data){
    var notas={}, cfg={};
    trats.forEach(function(id,ti){
      for(var r=1;r<=4;r++) notas[id+'R'+r] = { [nomeVar]: valores[ti][r-1][di] };
    });
    cfg[nomeVar]={sentido:sentido, sub:1, N:0};
    return { id:'AV'+di, data:data, variaveis:[nomeVar], notas:notas, varcfg:cfg, tipos:{[nomeVar]:'pct'} };
  };
  return {
    id:'E1', codigo:'LAB-1', numRepeticoes:4,
    tratamentos: trats.map(function(id,i){ return {id:id, produto:'Produto '+id, testemunha:i===0}; }),
    testemunha:'T1', aplicacoes:[], avaliacoes:[av(0,'2026-08-11'), av(1,'2026-08-12')]
  };
}
/* mortalidade: testemunha ~4%, tratados 60% e 85% */
var mort = estudo('Mortalidade','maior',[
  [[3,5],[4,6],[3,4],[5,6]],
  [[60,86],[62,88],[59,85],[63,89]],
  [[80,95],[82,96],[79,94],[83,97]]
]);
/* severidade: testemunha alta, tratados baixos — o caminho que já está no ar */
var sev = estudo('Mancha angular','menor',[
  [[30,55],[28,52],[32,58],[29,54]],
  [[9,16],[8,15],[10,17],[9,16]],
  [[4,7],[3,6],[5,8],[4,7]]
]);

console.log('Tabela da avaliação — o número de Abbott é chamado pelo nome certo');
var hMort = context.avResultHtml(mort, mort.avaliacoes[1]);
var hSev  = context.avResultHtml(sev,  sev.avaliacoes[1]);
ck(hMort.indexOf('eficácia (Abbott)')>=0, 'mortalidade: o cabeçalho diz eficácia (Abbott)');
ck(hMort.indexOf('% efic')>=0,            'mortalidade: a coluna é "% efic"');
ck(hMort.indexOf('% controle')<0,         'mortalidade: não sobra "% controle"');
ck(hSev.indexOf('% controle')>=0,         'doença: segue "% controle", como sempre foi');
ck(hSev.indexOf('% ctrl')>=0,             'doença: a coluna continua "% ctrl"');

console.log('E o valor de Abbott sai positivo na mortalidade');
/* T3 aos 2 dias: média 95,5 contra 5,25 da testemunha
   → (95,5 − 5,25)/(100 − 5,25) × 100 = 95,25% */
var mAbbott = context._pctCtrl(5.25, 95.5, 'maior');
ck(Math.abs(mAbbott - 95.25) < 0.01, 'mortalidade corrigida de Abbott = 95,25%');
ck(context._pctCtrl(53.75, 6.75, 'menor') > 0, 'redução de Abbott na doença segue positiva');

console.log('AACPD sai de cena no bioensaio — bancada não tem área sob a curva');
var aMort = context.studyAudpcHtml(mort);
var aSev  = context.studyAudpcHtml(sev);
ck(aMort === '', 'mortalidade: a seção de AACPD não é exibida');
ck(/>\d+(\.\d+)?%</.test(aSev), 'doença: a AACPD continua trazendo o % de controle');
ck(aSev.indexOf('progresso no tempo')>=0 || aSev.indexOf('AUDPC')>=0, 'a seção de AACPD continua saindo em doença');

console.log('Título do gráfico de progresso segue a variável');
var gMort = context.studyChartsHtml(mort);
var gSev  = context.studyChartsHtml(sev);
ck(gMort.indexOf('progresso (mortalidade × tempo)')>=0, 'mortalidade: "progresso (mortalidade × tempo)"');
ck(gMort.indexOf('severidade × tempo')<0,               'mortalidade: a palavra severidade sumiu do título');
ck(gSev.indexOf('progresso (mancha angular × tempo)')>=0, 'doença: o título usa o nome da variável');

console.log('Ranking: barras do melhor para o pior, como no pipeline');
ck(gMort.indexOf('eficácia de Abbott — ranking')>=0, 'mortalidade: o gráfico se chama ranking de eficácia de Abbott');
ck(gSev.indexOf('% de controle — ranking')>=0,        'doença: segue "% de controle", agora rankeado');
/* T3 (95,5%) matou mais que T2 (86,5%): tem de vir ANTES na figura */
var iT3 = gMort.indexOf('>T3 &#183;'), iT2 = gMort.indexOf('>T2 &#183;');
if(iT3 < 0){ iT3 = gMort.indexOf('>T3 ·'); iT2 = gMort.indexOf('>T2 ·'); }
ck(iT3 > 0 && iT2 > 0 && iT3 < iT2, 'a barra do melhor tratamento vem em cima');
/* na doença o melhor é o de MENOR severidade — T3 de novo, por outro caminho */
var jT3 = gSev.indexOf('>T3 &#183;'), jT2 = gSev.indexOf('>T2 &#183;');
if(jT3 < 0){ jT3 = gSev.indexOf('>T3 ·'); jT2 = gSev.indexOf('>T2 ·'); }
ck(jT3 > 0 && jT2 > 0 && jT3 < jT2, 'em doença o ranking também põe o melhor em cima');
ck(gMort.indexOf('>100%<')>=0, 'a escala vai até 100%, fixa, para comparar entre figuras');

console.log('');
console.log(p+' ok, '+f+' falha(s)');
process.exit(f?1:0);
