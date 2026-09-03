/* Ensaio em FAIXAS: o portão que impede p-valor de pseudorreplicação.
 *
 * O caso real (Bosqueiro): item de teste em 1 ha, produto do produtor em 1 ha,
 * testemunha em 6 plantas. Cada tratamento ocupa UMA faixa contígua.
 *
 * Medir vinte pontos dentro de uma faixa não gera vinte repeticoes daquele
 * tratamento — gera vinte medidas do mesmo pedaco de terra. A diferenca entre
 * faixas carrega solo, declive e bordadura junto com o produto. Rodar ANOVA
 * nisso da p-valor pequeno quase sempre, e ele nao quer dizer o que parece.
 *
 * A saida valida e blocar por POSICAO: tracos transversais amostrados nas
 * mesmas posicoes de todas as faixas. Ai cada traco e um bloco legitimo.
 *
 * O contrato que estes testes protegem:
 *   - estudo antigo (sem `desenho`) continua DBC e nada muda para ele;
 *   - faixas com 1 traco => statDBC devolve NULO, e o motivo fica escrito;
 *   - faixas com 2+ tracos em TODOS os tratamentos => volta a haver analise;
 *   - um tratamento medido a menos derruba o ensaio inteiro (o minimo manda);
 *   - a finalizacao BPL grava o porque de nao ter havido analise.
 *
 * Rodar: node test_faixas.js
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

/* Bosqueiro: 3 tratamentos, cada um numa faixa própria.
   tracos = quantos treços transversais foram REALMENTE medidos em cada faixa. */
function bosqueiro(tracos, opts){
  opts = opts || {};
  var av = {id:'a1', data:'2026-08-10', variaveis:['Severidade'], notas:{}, tipos:{}};
  var base = {T1:42, T2:18, T3:9};              /* testemunha pior, item de teste melhor */
  ['T1','T2','T3'].forEach(function(t){
    var n = (opts.faltaEm === t) ? Math.max(0, tracos - 1) : tracos;   /* um medido a menos */
    /* O ruidinho por parcela NAO e enfeite. Sem ele o dado fica perfeitamente
       aditivo (efeito de tratamento + efeito de bloco, resíduo exatamente zero),
       e desde a v194 o statDBC RECUSA analisar isso — com razão: sem termo de
       erro o teste F não existe. Dado de campo sempre tem resíduo; a fixture
       precisa parecer com campo. É determinístico para o teste não oscilar. */
    for(var r = 1; r <= n; r++){
      var ruido = ((t.charCodeAt(1) * 7 + r * 13) % 5 - 2) * 0.35;
      av.notas[t + 'R' + r] = {Severidade: String(base[t] + (r - 2) * 1.7 + ruido)};
    }
  });
  var s = C.normalizeStudy({
    id:'E-BOSQ', codigo:'BOSQ-2026-01', dataInicio:'2026-08-01',
    numRepeticoes: Math.max(1, tracos),
    desenho:'faixas',
    tratamentos:[
      {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
      {id:'T2', produto:'Produto do produtor', dose:'1'},
      {id:'T3', produto:'Item de teste', dose:'1'}
    ],
    faixas:[
      {tratId:'T1', qid:'BOSQ_A', areaHa:0.02},   /* 6 plantas */
      {tratId:'T2', qid:'BOSQ_B', areaHa:1},
      {tratId:'T3', qid:'BOSQ_C', areaHa:1}
    ],
    aplicacoes:[{id:'ap1', data:'2026-08-01'}],
    avaliacoes:[av]
  });
  return {s:s, av:av};
}

/* ------------------------------------------------- estudo antigo intacto --- */
S('Estudo sem `desenho` continua sendo DBC');
var velho = C.normalizeStudy({id:'E1', codigo:'X', numRepeticoes:4,
  tratamentos:[{id:'T1'},{id:'T2'}], avaliacoes:[]});
eq(velho.desenho, 'dbc', 'desenho entra como dbc');
eq(velho.faixas.length, 0, 'e sem faixas');
var repV = C.estudoTemReplicacao(velho, null, 'Sev');
check(repV.ok, 'DBC com 4 repetições é replicado');
eq(repV.desenho, 'dbc', 'e se identifica como dbc');

/* ------------------------------------------ faixas com 1 traço: recusa --- */
S('Faixas com um traço só: NÃO sai p-valor');
var b1 = bosqueiro(1);
var rep1 = C.estudoTemReplicacao(b1.s, b1.av, 'Severidade');
eq(rep1.ok, false, 'o portão recusa');
eq(rep1.blocos, 1, 'reconhece que há 1 traço');
check(/n[aã]o cria repeti/.test(rep1.motivo), 'e o motivo explica a pseudorreplicação');
eq(C.statDBC(b1.s, b1.av, 'Severidade'), null, 'statDBC devolve NULO em vez de um p-valor bonito');

/* ------------------------------------------ faixas com 3 traços: aceita --- */
S('Faixas com três traços: volta a haver análise');
var b3 = bosqueiro(3);
var rep3 = C.estudoTemReplicacao(b3.s, b3.av, 'Severidade');
eq(rep3.ok, true, 'o portão aceita');
eq(rep3.blocos, 3, 'conta os 3 traços');
check(/tre[cç]os/.test(rep3.rotulo), 'e rotula como blocos por posição: "' + rep3.rotulo + '"');
var st3 = C.statDBC(b3.s, b3.av, 'Severidade');
check(st3 !== null, 'statDBC agora calcula');
check(st3 && isFinite(st3.F) , 'com F finito');
check(st3 && st3.letras && st3.letras.T1, 'e letras de Tukey');

/* --------------------------------- um tratamento medido a menos derruba --- */
S('Se UM tratamento ficou com menos traços, o ensaio inteiro cai');
var bFalta = bosqueiro(3, {faltaEm:'T2'});   /* T2 com 2, os outros com 3 */
var repF = C.estudoTemReplicacao(bFalta.s, bFalta.av, 'Severidade');
eq(repF.blocos, 2, 'vale o MÍNIMO entre os tratamentos, não o máximo');
eq(repF.ok, true, 'com 2 ainda há análise');
var bFalta1 = bosqueiro(2, {faltaEm:'T2'});  /* T2 com 1, os outros com 2 */
var repF1 = C.estudoTemReplicacao(bFalta1.s, bFalta1.av, 'Severidade');
eq(repF1.blocos, 1, 'T2 medido uma vez só derruba para 1');
eq(repF1.ok, false, 'e aí não há análise, mesmo os outros tendo 2');
eq(C.statDBC(bFalta1.s, bFalta1.av, 'Severidade'), null, 'statDBC acompanha e devolve nulo');

/* ------------------------------------------------- faixa única não conta --- */
S('Um tratamento só: não há o que comparar');
var b1t = bosqueiro(3);
b1t.s.tratamentos = [b1t.s.tratamentos[0]];
b1t.s = C.normalizeStudy(b1t.s);
var repU = C.estudoTemReplicacao(b1t.s, b1t.av, 'Severidade');
eq(repU.ok, false, 'o portão recusa');
check(/um tratamento/.test(repU.motivo), 'e diz por quê');

/* ---------------------------------------- as faixas amarram trat->quadra --- */
S('O vínculo tratamento -> quadra sobrevive à normalização');
eq(b3.s.faixas.length, 3, 'as três faixas ficam');
eq(b3.s.faixas[2].qid, 'BOSQ_C', 'com a quadra de cada uma');
eq(b3.s.faixas[0].areaHa, 0.02, 'e a área (6 plantas = 0,02 ha)');
var orfa = C.normalizeStudy({id:'E9', numRepeticoes:2, desenho:'faixas',
  tratamentos:[{id:'T1'}], faixas:[{tratId:'T1',qid:'A'},{tratId:'T9',qid:'B'}], avaliacoes:[]});
eq(orfa.faixas.length, 1, 'faixa apontando para tratamento que não existe é descartada');
var voltouDbc = C.normalizeStudy({id:'E8', numRepeticoes:2, desenho:'dbc',
  tratamentos:[{id:'T1'}], faixas:[{tratId:'T1',qid:'A'}], avaliacoes:[]});
eq(voltouDbc.faixas.length, 0, 'voltar para DBC limpa as faixas');

/* ------------------------------------- a finalização grava o porquê --- */
S('A finalização BPL registra por que não houve análise');
var snap = C._statSnapshot(bosqueiro(1).s);
eq(snap.itens.length, 0, 'nenhum resultado congelado');
eq(snap.semAnalise.length, 1, 'mas a avaliação é registrada');
check(/n[aã]o cria repeti/.test(snap.semAnalise[0].porque),
      'com o motivo real, não um genérico: "' + snap.semAnalise[0].porque.slice(0,60) + '…"');
var snap3 = C._statSnapshot(bosqueiro(3).s);
eq(snap3.itens.length, 1, 'com 3 traços, a estatística é congelada');
check(/tre[cç]os/.test(snap3.itens[0].desenho||''), 'e o desenho fica gravado junto');

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
