/* UMA REPETIÇÃO: A FOLHA DE GRÁFICOS SAI, DESCRITIVA.
 *
 * Pedido de uso: "tem que gerar gráfico mesmo com uma única repetição". O botão
 * da folha dizia "precisa de ao menos 2 repetições" e o app recusava abri-la; e
 * se abrisse, o anovaDBC lançava erro com um bloco só, o erro padrão virava NaN
 * na curva e as legendas diriam "média de 1 blocos".
 *
 * O que este teste segura (o MOTOR — Est.descrever com um bloco, e o
 * Est.analisar ainda recusando — está em tests/test_estatistica.js, que roda
 * mesmo sem jsdom):
 *   1. o APP: com uma repetição o botão da folha aparece (descritivo) e o
 *      payload sai, avisando antes de abrir que não há teste;
 *   2. a FOLHA (a página inteira, no jsdom, com o payload do app): cada vista,
 *      em PT e EN, desenha sem erro e sem NaN; sem letras, sem barra de erro,
 *      sem quadro de ANOVA e sem p; o motivo escrito na legenda, no subtítulo e
 *      no rodapé; e o painel não oferece letras nem barra de erro;
 *   3. com repetição NADA muda: letras, ANOVA e "Média de 4 repetições";
 *   4. de quebra, resíduo zero (repetições idênticas): a folha imprimia
 *      "p < 0,001" de um teste que não existiu (null < 0,001 é verdadeiro em JS).
 *
 * Rodar: node tests/test_prancha_uma_repeticao.js
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
S('1. App: o botão aparece e a folha sai, avisando');
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

/* severidade por avaliação: {T1:[b1,b2,...]} — um valor por repetição */
function estudo(reps, porData){
  var avs = porData.map(function(vals, k){
    var notas = {};
    Object.keys(vals).forEach(function(t){ vals[t].forEach(function(v, r){ notas[t+'R'+(r+1)] = {Severidade: String(v)}; }); });
    return {id:'a'+(k+1), data:['2026-09-08','2026-09-15','2026-09-22'][k], variaveis:['Severidade'], tipos:{Severidade:'pct'}, notas:notas};
  });
  return {id:'S'+reps, codigo:'DEMO-'+reps, nome:'Demonstrativo', numRepeticoes:reps, desenho:'dbc', dataInicio:'2026-09-01', doseUnidade:'L/ha',
    tratamentos:[{id:'T1', produto:'Testemunha', testemunha:true},{id:'T2', produto:'Produto A', dose:'1'},{id:'T3', produto:'Produto B', dose:'2'}],
    aplicacoes:[{id:'ap1', data:'2026-09-01'}], avaliacoes:avs};
}
function payloadDe(st){
  C.data = {Q1:{cultura:'soja', estudos:[st]}};
  return {diag: C._pranchaDiag('Q1', st.id), p: C._pranchaPayload('Q1', st.id, 'Severidade')};
}
var umaRep = estudo(1, [{T1:[12],T2:[5],T3:[3]}, {T1:[30],T2:[11],T3:[6]}, {T1:[55],T2:[19],T3:[9]}]);
var r1 = payloadDe(umaRep);
eq(r1.diag.length, 1, 'a variável aparece na lista de folhas');
ck(r1.diag[0].ok === true, 'com uma repetição o botão da folha existe (antes: "precisa de ao menos 2 repetições")');
ck(r1.diag[0].descritivo === true, 'e vem marcado como descritivo, para o botão dizer antes de abrir');
ck(!r1.p.erro, 'o payload sai sem erro' + (r1.p.erro ? ' (' + r1.p.erro + ')' : ''));
eq(JSON.stringify(r1.p.blocos), '[1]', 'um bloco só no payload');
eq(JSON.stringify(r1.p.sev[0]), '[[12,30,55]]', 'as leituras da testemunha nas três datas');
ck((r1.p.avisos || []).some(function(a){ return /Uma repetição por tratamento: a folha sai descritiva/.test(a); }),
   'o aviso de folha descritiva vai junto, como os outros avisos de abertura');

var quatroRep = estudo(4, [
  {T1:[11,13,12,12], T2:[5,6,4,5], T3:[3,2,4,3]},
  {T1:[28,32,31,29], T2:[11,12,10,11], T3:[6,5,7,6]},
  {T1:[52,58,55,55], T2:[18,20,19,19], T3:[9,8,10,9]}]);
var r4 = payloadDe(quatroRep);
ck(r4.diag[0].ok === true && r4.diag[0].descritivo === false, 'com 4 repetições o botão segue como sempre, sem a marca de descritivo');
ck(!r4.p.erro && !(r4.p.avisos||[]).some(function(a){ return /descritiva/.test(a); }), 'e o payload não traz o aviso de folha descritiva');

/* resíduo zero: as quatro repetições de cada tratamento são iguais */
var residuoZero = estudo(4, [{T1:[50,50,50,50], T2:[10,10,10,10], T3:[0,0,0,0]}]);
var rz = payloadDe(residuoZero);
ck(!rz.p.erro, 'resíduo zero também abre a folha (a grade tem variação entre tratamentos)');

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

S('2. Folha com uma repetição: desenha tudo, e diz que é descrição');
var F1 = abre(r1.p);
eq(F1.erros.length, 0, 'abre sem erro de script' + (F1.erros.length ? ' (' + F1.erros[0] + ')' : ''));
eq(F1.w.eval('SEM_REP'), true, 'a folha sabe que é uma repetição (BLOCOS.length < 2)');
['pt','en'].forEach(function(id){
  var ruins = [], comErro = [], comP = [];
  VISTAS.forEach(function(v){
    var r = vista(F1, id, v[0], v[1], v[2]);
    if(F1.erros.length) comErro.push(v.join('/') + ': ' + F1.erros[0]);
    if(/NaN|undefined|Infinity/.test(r.svg)) ruins.push(v.join('/'));
    if(/p\s*[<=]\s*0[,.]/.test(r.txt + ' ' + r.leg)) comP.push(v.join('/'));
  });
  ck(!comErro.length, id + ': as 13 vistas desenham sem erro' + (comErro.length ? ' (' + comErro.join('; ') + ')' : ''));
  ck(!ruins.length, id + ': nenhum NaN, undefined ou Infinity no SVG' + (ruins.length ? ' (' + ruins.join(', ') + ')' : ''));
  ck(!comP.length, id + ': nenhum p impresso' + (comP.length ? ' (' + comP.join(', ') + ')' : ''));
});
eq(F1.w.eval('semTeste()'), 'sem-repeticao', 'semTeste() diz o motivo');
ck(F1.w.eval('LETRAS.join("")') === '', 'nenhuma letra de Tukey');
ck(F1.w.eval('SEM.every(function(l){ return l.every(function(v){ return v === null; }); })'), 'erro padrão nulo em toda célula (uma parcela não tem dispersão)');

var b = vista(F1, 'pt', 'barras', 'sev', 'ultima');
ck(/Uma repetição\s+·\s+3 tratamentos\s+·\s+descritivo, sem teste estatístico/.test(b.txt), 'subtítulo: "Uma repetição · 3 tratamentos · descritivo, sem teste estatístico"');
ck(!/Média de 1 repeti/.test(b.txt), 'nunca "Média de 1 repetições"');
ck(/Delineamento: uma parcela por tratamento, sem repetição/.test(b.txt), 'rodapé: "uma parcela por tratamento, sem repetição", e não "1 blocos ao acaso"');
ck(!/blocos ao acaso/.test(b.txt), 'nenhum "blocos ao acaso" no rodapé');
ck(/Cada barra é o valor da única parcela do tratamento\./.test(b.leg), 'legenda: cada barra é o valor da única parcela');
ck(/Uma repetição por tratamento: sem resíduo não há termo de erro/.test(b.leg), 'legenda: o motivo de não haver teste');
ck(!/média de 1 bloco/i.test(b.leg) && !/Tukey/.test(b.leg), 'legenda sem "média de 1 blocos" e sem Tukey');

var tb = vista(F1, 'pt', 'tabela');
ck(/ANÁLISE DE VARIÂNCIA — NÃO CALCULADA/.test(tb.txt), 'tabela: o quadro de ANOVA vira "não calculada"');
ck(!/Resíduo/.test(tb.txt) && !/Tukey/.test(tb.txt), 'tabela: sem linha de resíduo e sem coluna Tukey');
ck(/444,5/.test(tb.txt), 'tabela: a AACPD da testemunha (444,5) está lá');
ck(/81,1/.test(tb.txt), 'tabela: a eficácia de Abbott de T3 (81,1%) está lá');

var cp = vista(F1, 'pt', 'completa');
ck(/ANÁLISE DE VARIÂNCIA — NÃO CALCULADA/.test(cp.txt) && !/F\(\d/.test(cp.txt), 'A4: sem quadro de ANOVA e sem "F(gl, gl) ="');
ck(/Testemunha: AACPD 445/.test(cp.txt) || /Testemunha: AACPD 444/.test(cp.txt), 'A4: a nota da testemunha continua no rodapé da eficácia');

var es = vista(F1, 'pt', 'estatistica');
ck(/O QUE A FOLHA MOSTRA/.test(es.txt) && /POR QUE NÃO HÁ TESTE/.test(es.txt), 'folha do auditor: "o que a folha mostra" e "por que não há teste"');
ck(/ao menos 2 repetições \(blocos\)/.test(es.txt), 'e diz o que faltou para haver teste');
ck(/VALORES POR TRATAMENTO/.test(es.txt) && /Valor da parcela/.test(es.txt), 'valores por tratamento, com "Valor da parcela"');
ck(!/√\(x \+ 0,5\)/.test(es.txt) && !/QUADRO DE ANÁLISE/.test(es.txt), 'sem transformação de um teste que não rodou e sem quadro de variância');

var cu = vista(F1, 'pt', 'sev-curva');
ck(/sem barra de erro/.test(cu.leg) && !/erro padrão/.test(cu.leg), 'curva: legenda diz "sem barra de erro", sem prometer erro padrão');
var pl = vista(F1, 'pt', 'plantec');
ck(!/●/.test(pl.txt) && /Figura descritiva/.test(pl.leg), 'por data: sem a marca ● de "momento analisado", e figura descritiva');

var en = vista(F1, 'en', 'barras', 'sev', 'ultima');
ck(/One replicate\s+·\s+3 treatments\s+·\s+descriptive, no statistical test/.test(en.txt), 'EN: subtítulo descritivo');
ck(/One replicate per treatment: with no residual there is no error term/.test(en.leg), 'EN: legenda com o motivo');
ck(/Design: one plot per treatment, unreplicated/.test(en.txt), 'EN: rodapé "one plot per treatment, unreplicated"');
ck(/ANALYSIS OF VARIANCE — NOT COMPUTED/.test(vista(F1, 'en', 'tabela').txt), 'EN: "analysis of variance — not computed"');

var oculto = function(sel){ return F1.w.eval('(function(){ var i=document.querySelector(' + JSON.stringify(sel) + '); var o=i&&i.closest(".opt"); return !!(o && o.style.display==="none"); })()'); };
ck(oculto('#g-bv-el input[data-bv="letras"]'), 'painel: "Letras do Tukey" sai (não há letra a mostrar)');
ck(oculto('#g-fig-erro input[value="ep"]') && oculto('#g-fig-erro input[value="ic95"]'), 'painel: erro padrão e IC 95% saem (não há dispersão)');
ck(oculto('#g-sev-el input[data-sv="erro"]'), 'painel: "Barras de erro padrão" da curva sai');
ck(F1.w.eval('estado.fig.erro') === 'nenhum' && F1.w.eval('estado.sv.erro') === 0 && F1.w.eval('estado.bv.letras') === 0, 'e o estado da folha não pede o que ela não desenha');
F1.fechar();

/* ------------------------------------------------------- 3. com repetição */
S('3. Com 4 repetições nada muda');
var F4 = abre(r4.p);
eq(F4.erros.length, 0, 'abre sem erro');
eq(F4.w.eval('SEM_REP'), false, 'não é SEM_REP');
var b4 = vista(F4, 'pt', 'barras', 'efic', 'ultima');
eq(F4.w.eval('semTeste()'), null, 'há teste');
ck(F4.w.eval('LETRAS.join("")').length > 0, 'as letras de Tukey continuam');
/* na figura só de eficácia a testemunha não é desenhada (conta 2); o subtítulo
   inteiro se confere na de severidade, onde os três aparecem */
ck(/Média de 4 repetições\s+·\s+3 tratamentos/.test(vista(F4, 'pt', 'barras', 'sev', 'ultima').txt), 'subtítulo de sempre: "Média de 4 repetições · 3 tratamentos"');
vista(F4, 'pt', 'barras', 'efic', 'ultima');
ck(/Tukey \(α = 0,05\)/.test(b4.leg) && /CV = /.test(b4.leg), 'a legenda da eficácia segue citando Tukey e o CV');
var t4 = vista(F4, 'pt', 'tabela');
ck(/Resíduo/.test(t4.txt) && !/NÃO CALCULADA/.test(t4.txt), 'o quadro de ANOVA continua, com a linha do resíduo');
ck(/Delineamento: 4 blocos ao acaso/.test(t4.txt), 'rodapé de sempre: "4 blocos ao acaso"');
ck(!F4.w.eval('(function(){ var i=document.querySelector(\'#g-bv-el input[data-bv="letras"]\'); return i.closest(".opt").style.display==="none"; })()'), 'o painel continua oferecendo as letras');
F4.fechar();

/* ------------------------------------------------------- 4. resíduo zero */
S('4. Resíduo zero: nada de "p < 0,001" sem teste');
var FZ = abre(rz.p);
eq(FZ.erros.length, 0, 'abre sem erro');
vista(FZ, 'pt', 'completa');
eq(FZ.w.eval('semTeste()'), 'sem-residuo', 'semTeste() reconhece a falta de variação residual');
var zc = vista(FZ, 'pt', 'completa'), zb = vista(FZ, 'pt', 'barras', 'efic', 'ultima');
ck(!/p\s*<\s*0,001/.test(zc.txt + zb.leg), 'nenhum "p < 0,001" na A4 nem na legenda (antes saía, de um F que não existe)');
ck(/Sem variação residual/.test(zc.txt) && /Sem variação residual/.test(zb.leg), 'o motivo vem escrito no lugar do teste');
ck(/ANÁLISE DE VARIÂNCIA — NÃO CALCULADA/.test(vista(FZ, 'pt', 'tabela').txt), 'a tabela também não pinta quadro de zeros');
ck(/Média de 4 repetições/.test(vista(FZ, 'pt', 'barras', 'sev', 'ultima').txt), 'com repetição, o subtítulo continua sendo de média de 4 repetições');
FZ.fechar();

console.log('\n' + (falhas === 0
  ? passes + ' verificações, nenhuma falha.'
  : falhas + ' FALHA(S) em ' + (passes + falhas) + ' verificações.'));
process.exit(falhas === 0 ? 0 : 1);
