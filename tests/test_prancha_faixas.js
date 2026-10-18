/* ENSAIO EM FAIXAS: A FOLHA DE GRÁFICOS SAI, DESCRITIVA, COM A MÉDIA DOS TREÇOS.
 *
 * Pedido de uso (print do app, 18/10/2026): o botão de gráficos de um ensaio
 * em faixas respondia "Os treços de uma faixa única são subamostras... esta
 * prancha exige replicação do tratamento" e não abria nada. A recusa estava
 * certa no princípio e errada no efeito: o ensaio ficava sem figura.
 *
 * O que este teste segura:
 *   1. o APP: em faixas o botão aparece (descritivo, "faixa única"), e o
 *      payload sai com UM bloco por tratamento = a MÉDIA dos treços lidos em
 *      cada data. Os treços nunca entram como blocos (seria ANOVA medindo a
 *      variação dentro de uma faixa). Treço faltando muda a média, não tira a
 *      data; tratamento sem treço nenhum tira a data, com aviso.
 *   2. a FOLHA (página inteira no jsdom): as 13 vistas em PT e EN desenham sem
 *      erro e sem NaN; sem letras, ANOVA, p nem barra de erro; e cada legenda,
 *      o subtítulo, o rodapé e a folha do auditor dizem "média dos treços da
 *      faixa única" — nunca "única parcela" nem "blocos ao acaso".
 *   3. o ensaio em BLOCOS com 1 repetição continua dizendo "única parcela".
 *
 * Rodar: node tests/test_prancha_faixas.js
 */
var fs = require('fs'), vm = require('vm');
var JSDOM, VirtualConsole;
try{ ({JSDOM, VirtualConsole} = require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

var falhas = 0, passes = 0;
function S(t){ console.log('\n' + t); }
function ck(ok, nome){ if(ok){ passes++; console.log('  ok    ' + nome); } else { falhas++; console.log('  FALHA ' + nome); } }
function eq(a, b, nome){ ck(a === b, nome + (a === b ? '' : '  (veio ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

/* ------------------------------------------------------------------ 1. app */
S('1. App: o botão aparece e a folha sai com a média dos treços');
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
var C = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
C.window = C; C.globalThis = C; C.self = C;
C.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
C.atob = function(s){ return Buffer.from(s, 'base64').toString('binary'); };
C.localStorage = { getItem: function(k){ return store[k] == null ? null : store[k]; }, setItem: function(k, v){ store[k] = String(v); }, removeItem: function(k){ delete store[k]; } };
C.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
C.location = { reload: function(){}, href: '', search: '', hash: '' };
C.navigator = { onLine: true, userAgent: 'node', serviceWorker: {register: function(){ return Promise.resolve(); }, addEventListener: function(){}} };
C.document = new Proxy({}, {
  get: function(t, k){
    if(k === 'createElement' || k === 'getElementById' || k === 'querySelector' || k === 'createElementNS') return function(){ return elStub(); };
    if(k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return function(){ return []; };
    if(k === 'addEventListener' || k === 'removeEventListener') return function(){};
    if(k === 'visibilityState') return 'visible';
    if(k === 'cookie') return '';
    return elStub();
  }
});
C.addEventListener = function(){}; C.removeEventListener = function(){};
C.requestAnimationFrame = function(){};
C.matchMedia = function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; };
C.fetch = function(){ return Promise.resolve({json: function(){ return Promise.resolve({}); }}); };
vm.createContext(C);
vm.runInContext(fs.readFileSync('vendor/biocalc-lab-core.js', 'utf8'), C, {filename: 'biocalc-lab-core.js'});
vm.runInContext(fs.readFileSync('app.js', 'utf8'), C, {filename: 'app.js'});
vm.runInContext("LOCAIS={L1:{nome:'Fazenda Teste'}}; QLOCAL={Q1:'L1'};", C);


/* faixas: porData = [{T1:[treço1, treço2, treço3]}, ...] */
function estudoFaixas(porData){
  var avs = porData.map(function(vals, k){
    var notas = {};
    Object.keys(vals).forEach(function(t){ vals[t].forEach(function(v, r){ if(v !== null) notas[t+'R'+(r+1)] = {Severidade: String(v)}; }); });
    return {id:'a'+(k+1), data:['2026-09-08','2026-09-15','2026-09-22','2026-09-29'][k], variaveis:['Severidade'], tipos:{Severidade:'pct'}, notas:notas};
  });
  return {id:'SF', codigo:'FAIXA-01', nome:'Faixas', numRepeticoes:3, desenho:'faixas', dataInicio:'2026-09-01', doseUnidade:'L/ha',
    faixas:[{tratId:'T1', qid:'Q1'},{tratId:'T2', qid:'Q1'},{tratId:'T3', qid:'Q1'}],
    tratamentos:[{id:'T1', produto:'Testemunha', testemunha:true},{id:'T2', produto:'Produto A', dose:'1'},{id:'T3', produto:'Produto B', dose:'2'}],
    aplicacoes:[{id:'ap1', data:'2026-09-01'}], avaliacoes:avs};
}
function payloadDe(st){
  C.data = {Q1:{cultura:'café', estudos:[st]}};
  return {diag: C._pranchaDiag('Q1', st.id), p: C._pranchaPayload('Q1', st.id, 'Severidade')};
}
var fx = estudoFaixas([
  {T1:[10,12,14], T2:[4,6,5],    T3:[2,3,4]},
  {T1:[28,30,32], T2:[10,null,12], T3:[5,6,7]},     /* T2 com 2 treços: média de 2 */
  {T1:[50,55,60], T2:[18,20,22], T3:[8,9,10]},
  {T1:[70,72,74], T2:[30,31,32], T3:[null,null,null]} /* T3 sem treço: a data sai */
]);
var r = payloadDe(fx);
eq(r.diag.length, 1, 'a variável aparece na lista de folhas');
ck(r.diag[0].ok === true, 'em faixas o botão da folha existe (antes: recusa "exige replicação")');
ck(r.diag[0].descritivo === true && r.diag[0].faixa === true, 'marcado como descritivo e como faixa, para o botão dizer "faixa única"');
ck(!r.p.erro, 'o payload sai sem erro' + (r.p.erro ? ' (' + r.p.erro + ')' : ''));
eq(JSON.stringify(r.p.blocos), '[1]', 'UM bloco: os treços não viram blocos');
eq(r.p.sev[0].length, 1, 'cada tratamento tem uma série só');
eq(JSON.stringify(r.p.sev[0][0]), '[12,30,55]', 'testemunha: a média dos 3 treços em cada data');
eq(JSON.stringify(r.p.sev[1][0]), '[5,11,20]', 'T2: na 2ª data, a média dos 2 treços lidos (10 e 12)');
eq(r.p.daa.length, 3, 'a 4ª data sai: T3 não tem treço nenhum nela');
ck((r.p.avisos || []).some(function(a){ return /fora da folha por tratamento sem treço lido/.test(a) && /faltam 1 tratamento/.test(a); }),
   'e o aviso diz que ela saiu, e por quê');
ck((r.p.avisos || []).some(function(a){ return /Ensaio em faixas: cada tratamento é uma faixa única e os treços são subamostras/.test(a); }),
   'aviso de abertura: faixa única, treços como subamostras, folha descritiva');
ck(!(r.p.avisos || []).some(function(a){ return /Uma repetição por tratamento/.test(a); }), 'sem o aviso de "uma repetição", que seria outro ensaio');
var dl = r.p.estudo.delineamento;
ck(dl.blocos === 1 && dl.faixa && dl.faixa.trecosMin === 2 && dl.faixa.trecosMax === 3 && dl.faixa.trecosPlanejados === 3,
   'o delineamento leva os treços usados (2 a 3) e os planejados (3)');
eq(JSON.stringify(dl.faixa.trecos[1]), '[3,2,3]', 'e quantos treços entraram em cada média, por tratamento e data');

var semNada = estudoFaixas([{T1:[10,12,14], T2:[4,5,6], T3:[null,null,null]}]);
var rn = payloadDe(semNada);
ck(rn.p.erro && /treço lido em todos os tratamentos/.test(rn.p.erro), 'sem data aproveitável, o erro fala de treço, não de "grade cheia (todo tratamento × bloco)"');
ck(/nenhuma data com treço lido/.test(rn.diag[0].motivo), 'e o botão diz o mesmo');

/* ---------------------------------------------------------------- 2. folha */
var EST_SRC = fs.readFileSync('estatistica.js', 'utf8');
var HTML = fs.readFileSync('prancha.html', 'utf8').replace(/<script src="estatistica\.js[^"]*"><\/script>/, '');
ck(/<script src="estatistica\.js\?v=\d+"><\/script>/.test(fs.readFileSync('prancha.html', 'utf8')),
   'a prancha pede o núcleo com ?v= (sem versão, o aparelho abriria a folha nova com o núcleo velho, sem descrever)');
function abre(payload){
  var erros = [];
  var vc = new VirtualConsole();
  vc.on('jsdomError', function(e){ erros.push(String((e && e.message) || e)); });
  var dom = new JSDOM(HTML, {url:'https://agracta.test/prancha.html', runScripts:'dangerously', virtualConsole:vc,
    beforeParse: function(w){
      w.TextEncoder = require('util').TextEncoder;
      w.eval(EST_SRC);   /* o <script src> não carrega no jsdom: o núcleo entra antes da página */
      w.localStorage.setItem('agracta-prancha-handoff', JSON.stringify(payload));
    }});
  return {w: dom.window, erros: erros, fechar: function(){ dom.window.close(); }};
}
/* desenha uma vista e devolve o texto da folha, o SVG e a legenda */
function vista(f, idioma, nome, serie, quando){
  f.erros.length = 0;
  return f.w.eval('(function(){ estado.idioma=' + JSON.stringify(idioma) + '; estado.vista=' + JSON.stringify(nome) + ';' +
    (serie ? 'estado.bv.serie=' + JSON.stringify(serie) + '; estado.bv.quando=' + JSON.stringify(quando || 'ultima') + ';' : '') +
    'render(); var f=document.getElementById("folha");' +
    'return {svg:f.innerHTML, txt:f.textContent, leg:document.getElementById("legenda-fig").textContent}; })()');
}
var VISTAS = [['barras','sev','ultima'],['barras','efic','ultima'],['barras','ambos','ultima'],['barras','sev','todas'],
  ['ranking','sev'],['ranking','efic'],['sev-curva'],['sev-paineis'],['plantec'],['tabela'],['estatistica'],['bpl'],['completa']];

S('2. Folha em faixas: desenha tudo, e diz que é a média dos treços');
var F = abre(r.p);
eq(F.erros.length, 0, 'abre sem erro de script' + (F.erros.length ? ' (' + F.erros[0] + ')' : ''));
eq(F.w.eval('SEM_REP'), true, 'cai no caminho sem repetição');
ck(F.w.eval('!!FAIXA'), 'e sabe que é faixa');
['pt','en'].forEach(function(id){
  var ruins = [], comErro = [], comP = [], parcela = [];
  VISTAS.forEach(function(v){
    var x = vista(F, id, v[0], v[1], v[2]);
    if(F.erros.length) comErro.push(v.join('/') + ': ' + F.erros[0]);
    if(/NaN|undefined|Infinity/.test(x.svg)) ruins.push(v.join('/'));
    if(/p\s*[<=]\s*0[,.]/.test(x.txt + ' ' + x.leg)) comP.push(v.join('/'));
    if(/única parcela|single plot|blocos ao acaso|randomised complete block/i.test(x.txt + ' ' + x.leg)) parcela.push(v.join('/'));
  });
  ck(!comErro.length, id + ': as 13 vistas desenham sem erro' + (comErro.length ? ' (' + comErro.join('; ') + ')' : ''));
  ck(!ruins.length, id + ': nenhum NaN, undefined ou Infinity no SVG' + (ruins.length ? ' (' + ruins.join(', ') + ')' : ''));
  ck(!comP.length, id + ': nenhum p impresso' + (comP.length ? ' (' + comP.join(', ') + ')' : ''));
  ck(!parcela.length, id + ': nenhuma vista fala em "única parcela" ou "blocos ao acaso"' + (parcela.length ? ' (' + parcela.join(', ') + ')' : ''));
});
ck(F.w.eval('LETRAS.join("")') === '', 'nenhuma letra de Tukey');
ck(F.w.eval('SEM.every(function(l){ return l.every(function(v){ return v === null; }); })'), 'nenhum erro padrão (a variação entre treços não vira barra)');

var b = vista(F, 'pt', 'barras', 'sev', 'ultima');
ck(/Faixa única\s+·\s+média de 2 a 3 treços\s+·\s+3 tratamentos\s+·\s+descritivo, sem teste estatístico/.test(b.txt), 'subtítulo: "Faixa única · média de 2 a 3 treços · 3 tratamentos · descritivo"');
ck(/Delineamento: uma faixa por tratamento, sem repetição/.test(b.txt), 'rodapé: "uma faixa por tratamento, sem repetição"');
ck(/n = 3 faixas · 2 a 3 treços \(subamostras\) por faixa/.test(b.txt), 'rodapé: n em faixas, e os treços como subamostras');
ck(/Cada barra é a média dos 2 a 3 treços da faixa única do tratamento\./.test(b.leg), 'legenda: cada barra é a média dos treços da faixa única');
ck(/os treços são subamostras da mesma faixa, não repetições/.test(b.leg), 'legenda: o motivo de não haver teste, dito para faixa');

var ab = vista(F, 'pt', 'barras', 'ambos', 'ultima');
ck(/Abbott sobre a Severidade média dos treços da faixa única de cada tratamento|Abbott sobre a severidade média dos treços da faixa única de cada tratamento/i.test(ab.leg) || /média dos treços/.test(ab.leg),
   'legenda da eficácia: Abbott sobre a média dos treços');
var cu = vista(F, 'pt', 'sev-curva');
ck(/média dos treços da faixa única de cada tratamento, sem barra de erro/.test(cu.leg), 'curva: pontos são a média dos treços, sem barra de erro');
var es = vista(F, 'pt', 'estatistica');
ck(/Faixa única por tratamento · 3 tratamentos · 2 a 3 treços por faixa, como subamostras/.test(es.txt), 'auditor: o delineamento como faixa, com os treços como subamostras');
ck(/ao menos 2 faixas ou parcelas independentes, casualizadas\s*em blocos/.test(es.txt), 'auditor: o que faltaria para haver teste');
ck(/Média dos treços/.test(es.txt) && !/Valor da parcela/.test(es.txt), 'auditor: coluna "Média dos treços"');
var tb = vista(F, 'pt', 'tabela');
ck(/ANÁLISE DE VARIÂNCIA — NÃO CALCULADA/.test(tb.txt), 'tabela: ANOVA "não calculada"');

var en = vista(F, 'en', 'barras', 'sev', 'ultima');
ck(/Single strip\s+·\s+mean of 2–3 subsamples/.test(en.txt), 'EN: subtítulo "Single strip · mean of 2–3 subsamples"');
ck(/Design: one strip per treatment, unreplicated/.test(en.txt), 'EN: rodapé "one strip per treatment"');
ck(/subsamples along the same strip are not replicates/.test(en.leg), 'EN: legenda com o motivo');
var dF = F.w.eval('document.getElementById("dica-fig").textContent');
ck(/variação entre treços é dentro da mesma faixa/.test(dF), 'painel: a dica explica por que não há barra de erro em faixa');
F.fechar();

S('3. Blocos com uma repetição continuam dizendo "única parcela"');
var um = {id:'S1', codigo:'DEMO-1', nome:'Demo', numRepeticoes:1, desenho:'dbc', dataInicio:'2026-09-01', doseUnidade:'L/ha',
  tratamentos:fx.tratamentos, aplicacoes:fx.aplicacoes,
  avaliacoes:[{id:'a1', data:'2026-09-08', variaveis:['Severidade'], tipos:{Severidade:'pct'}, notas:{T1R1:{Severidade:'20'},T2R1:{Severidade:'8'},T3R1:{Severidade:'4'}}},
              {id:'a2', data:'2026-09-15', variaveis:['Severidade'], tipos:{Severidade:'pct'}, notas:{T1R1:{Severidade:'40'},T2R1:{Severidade:'12'},T3R1:{Severidade:'6'}}}]};
var r1 = payloadDe(um);
ck(!r1.p.erro && !r1.p.estudo.delineamento.faixa && r1.diag[0].faixa === false, 'sem marca de faixa no payload nem no botão');
var F1 = abre(r1.p);
var b1 = vista(F1, 'pt', 'barras', 'sev', 'ultima');
ck(/Cada barra é o valor da única parcela do tratamento\./.test(b1.leg) && /Uma repetição\s+·/.test(b1.txt), 'legenda e subtítulo de uma repetição, como antes');
ck(!/treço/.test(b1.txt + b1.leg), 'e nenhum "treço"');
F1.fechar();

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
