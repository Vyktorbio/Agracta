/* A trilha de auditoria do estudo e a finalizacao que some dela.
 *
 * Dois defeitos reais, um em cima do outro:
 *   1. `_mergeStudy` juntava campo a campo, e `audit` e um campo: a cada sync
 *      entre dois aparelhos, a trilha do lado perdedor era jogada fora inteira
 *      — inclusive a entrada "Finalizacao do Estudo";
 *   2. nada no app percebia que um estudo TINHA sido finalizado e nao estava
 *      mais. A perda era silenciosa: o estudo simplesmente voltava para a
 *      agenda e para a ficha da quadra como se nunca tivesse terminado.
 *
 * Rodar: node test_trilha_finalizacao.js
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

/* ---------- estado minimo com um estudo e sua trilha ---------- */
function estado(audit, ts, finalizacao){
  var s = {id:'S1', codigo:'E1', _ts:ts, tratamentos:[{id:'T1'}], aplicacoes:[], avaliacoes:[]};
  if(audit !== undefined) s.audit = audit;
  if(finalizacao) s.finalizacao = finalizacao;
  return {
    data: {__config:{}, Q1:{cultura:'soja', estudos:[s]}},
    qgeo:{}, qgeots:{}, georef:null, georefts:0, locais:{}, qlocal:{}, qnome:{},
    qnomets:{}, qlocalts:{}, locaists:{}, randomizacoes:[], notas_campo:[],
    _deletedQuadras:{}, _deletedLocais:{}, _deletedNotas:{}, rev:1
  };
}
function trilhaDe(st){ return (((((st.data||{}).Q1||{}).estudos||[])[0]||{}).audit)||[]; }
function acoesDe(st){ return trilhaDe(st).map(function(e){ return e.action; }); }

function T(iso){ return new Date(iso).getTime(); }
var CRIOU  = {ts:T('2026-09-01T10:00:00.000Z'), iso:'2026-09-01T10:00:00.000Z', action:'Criacao do Estudo',     details:'c'};
var LANCOU = {ts:T('2026-09-10T10:00:00.000Z'), iso:'2026-09-10T10:00:00.000Z', action:'Lancamento de notas',   details:'l'};
var FINAL  = {ts:T('2026-09-20T10:00:00.000Z'), iso:'2026-09-20T10:00:00.000Z', action:'Finalização do Estudo', details:'f'};
var REABRIU= {ts:T('2026-09-21T10:00:00.000Z'), iso:'2026-09-21T10:00:00.000Z', action:'Reabertura do Estudo',  details:'r'};
/* refinalizado depois da reabertura — o carimbo, nao a posicao na lista, e que decide */
var REFINAL= {ts:T('2026-09-22T10:00:00.000Z'), iso:'2026-09-22T10:00:00.000Z', action:'Finalização do Estudo', details:'f2'};
var FIN_OBJ= {em:'2026-09-20T10:00:00.000Z', por:'a@b.c', nome:'Fulano', nResultados:3};

/* ---------- 1. a trilha nao encolhe no merge ---------- */
console.log('\n[1] a trilha de auditoria e aditiva: o merge une, nunca substitui');

/* aparelho local registrou tudo; a nuvem, com carimbo MAIS NOVO, so viu a criacao */
var unido = context.cloudMerge(estado([CRIOU,LANCOU,FINAL],10,FIN_OBJ), estado([CRIOU],20,null));
check(acoesDe(unido).length === 3, 'as tres entradas sobrevivem quando a nuvem vence o carimbo');
check(acoesDe(unido).indexOf('Finalização do Estudo') >= 0, 'a entrada de finalizacao nao e descartada');

/* e no sentido contrario: o lado que perde o carimbo tambem e preservado */
var unido2 = context.cloudMerge(estado([CRIOU],20,null), estado([CRIOU,LANCOU,FINAL],10,FIN_OBJ));
check(acoesDe(unido2).length === 3, 'as tres entradas sobrevivem quando o local vence o carimbo');

/* cada aparelho registrou uma coisa diferente: a uniao tem as duas, em ordem */
var A = context.cloudMerge(estado([CRIOU,LANCOU],10,null), estado([CRIOU,FINAL],20,FIN_OBJ));
check(acoesDe(A).join('>') === 'Criacao do Estudo>Lancamento de notas>Finalização do Estudo',
      'entradas de aparelhos diferentes se unem em ordem cronologica');

/* a mesma entrada vista dos dois lados e UMA entrada */
check(context.cloudMerge(estado([CRIOU,FINAL],10,FIN_OBJ), estado([CRIOU,FINAL],20,FIN_OBJ)).data.Q1.estudos[0].audit.length === 2,
      'entrada identica nos dois lados nao vira duas');

/* convergencia: os dois aparelhos tem de chegar ao MESMO resultado */
check(JSON.stringify(acoesDe(A)) === JSON.stringify(acoesDe(context.cloudMerge(estado([CRIOU,FINAL],20,FIN_OBJ), estado([CRIOU,LANCOU],10,null)))),
      'o merge converge: nao depende de quem o executa');

/* trilha corrompida nao pode derrubar a sincronizacao */
var podre = context.cloudMerge(estado('isto nao e uma lista',10,null), estado([CRIOU],20,null));
check(acoesDe(podre).length === 1, 'trilha corrompida e ignorada sem derrubar o merge');

/* estudo sem trilha nenhuma continua sem o campo — nao se inventa `audit` */
var semTrilha = context.cloudMerge(estado(undefined,10,null), estado(undefined,20,null));
check(!('audit' in semTrilha.data.Q1.estudos[0]), 'estudo sem trilha nao ganha um array vazio');

/* a finalizacao em si continua atravessando o merge */
check(!!unido.data.Q1.estudos[0].finalizacao, 'o campo finalizacao segue preservado');

/* ---------- 2. a perda da finalizacao tem de ser DITA ---------- */
console.log('\n[2] integridadeScan aponta a finalizacao que sumiu');

function cenario(audit, finalizacao){
  var s = {id:'S1', codigo:'E1', tratamentos:[{id:'T1'}], aplicacoes:[], avaliacoes:[]};
  if(audit !== undefined) s.audit = audit;
  if(finalizacao) s.finalizacao = finalizacao;
  context.data = {__config:{}, Q1:{cultura:'soja', estudos:[s]}};
  context.QGEO = {Q1:[[0,0],[1,1]]};
  context.QLOCAL = {}; context.LOCAIS = {};
  return context.integridadeScan();
}
function achou(res){
  return (res||[]).some(function(r){ return /não está mais finalizado/.test(r.msg||''); });
}

check(achou(cenario([CRIOU,FINAL], null)), 'trilha diz finalizado e o campo sumiu -> aponta');
check(!achou(cenario([CRIOU,FINAL], FIN_OBJ)), 'finalizado e com o campo no lugar -> calado');
check(!achou(cenario([CRIOU,FINAL,REABRIU], null)), 'reaberto DEPOIS da finalizacao -> calado (e o fluxo normal)');
check(achou(cenario([CRIOU,FINAL,REABRIU,REFINAL], null)), 'refinalizado DEPOIS da reabertura e sem o campo -> aponta');
check(!achou(cenario([CRIOU,LANCOU], null)), 'estudo que nunca foi finalizado -> calado');
check(!achou(cenario([], null)), 'estudo sem trilha -> calado (nao ha o que provar)');
check(!achou(cenario(undefined, null)), 'estudo sem o campo audit -> calado, sem quebrar');

/* a verificacao precisa ter PORTA: sem entrada no menu, ninguem a abre */
var appSrc0 = fs.readFileSync('app.js', 'utf8');
check(/closeMainMenu\(\);openIntegridade\(\)/.test(appSrc0),
      'a Verificacao de integridade tem entrada no menu');

/* carimbo que nao e data nao pode virar "31/12/1969" na frase */
var semData = (cenario([{ts:0, iso:'', action:'Finaliza\u00e7\u00e3o do Estudo', details:'legado'}], null)||[])
  .filter(function(r){ return /n\u00e3o est\u00e1 mais finalizado/.test(r.msg||''); })[0];
check(!semData, 'entrada de trilha sem carimbo nenhum nao gera aviso (nao ha o que provar)');
var soIso = (cenario([{ts:0, iso:'2026-09-20T10:00:00.000Z', action:'Finaliza\u00e7\u00e3o do Estudo', details:'legado'}], null)||[])
  .filter(function(r){ return /n\u00e3o est\u00e1 mais finalizado/.test(r.msg||''); })[0];
check(!!soIso, 'trilha antiga so com iso ainda e reconhecida');
check(soIso && /1969/.test(soIso.msg) === false, 'nunca imprime 31/12/1969 no lugar da data');
check(soIso && /2026/.test(soIso.msg), 'usa o iso quando o carimbo numerico falta');

var severidade = (cenario([CRIOU,FINAL], null)||[]).filter(function(r){ return /não está mais finalizado/.test(r.msg||''); })[0];
check(severidade && severidade.sev === 'alta', 'a perda de finalizacao entra como severidade alta');
check(severidade && severidade.msg.indexOf('E1') >= 0, 'a mensagem nomeia o estudo');
check(severidade && /\d/.test(severidade.msg), 'a mensagem diz QUANDO a finalizacao existiu');

/* ---------- 3. o caminho de recuperacao que resta ---------- */
console.log('\n[3] Historico da nuvem: quem atende e o Backups locais');

/* O `openCloudHistory` do app.js fala com o backend Supabase (`SB.rpc`), que
   este servidor nao usa mais. O firebase-sync SUBSTITUI a funcao e manda para os
   Backups locais — e por isso a tela antiga nunca aparece. Este teste tranca
   esse desvio: sem ele, um `SB` nulo devolveria "Cannot read properties of null"
   justo na tela a que alguem recorre depois de perder dado. */
var pintado = '';
var modal = {style:{}, set innerHTML(v){ pintado = String(v); }, get innerHTML(){ return pintado; }};
var docReal = context.document;
context.document = {
  getElementById: function(){ return modal; },
  createElement: function(){ return modal; },
  body: {appendChild: function(){}},
  addEventListener: function(){}, querySelector: function(){ return null; }
};
context.cloudInit = function(){ return {db:{}}; };   /* Firebase configurado */
context.SB = null;                                    /* Supabase, nao */

var estourou = null;
try{ context.openCloudHistory(); }catch(e){ estourou = e; }
context.document = docReal;

check(!estourou, 'Historico da nuvem nao estoura num SB nulo');
check(pintado.indexOf('Cannot read') < 0, 'a tela nao mostra erro de programador');
check(/Backups locais/.test(pintado), 'quem abre e a tela de Backups locais');

var syncSrc2 = fs.readFileSync('firebase-sync.js', 'utf8');
check(/window\.openCloudHistory\s*=/.test(syncSrc2),
      'o desvio do Historico da nuvem continua no firebase-sync');

var appSrc = fs.readFileSync('app.js', 'utf8');
check(appSrc.indexOf('a nuvem + Hist\u00f3rico da nuvem cobrem recupera\u00e7\u00e3o') < 0,
      'save() nao justifica mais o sacrificio dos backups com um caminho circular');

/* ---------- 4. o estado estacionado nao pode entrar cru ---------- */
console.log('\n[4] leitura estacionada durante a edicao volta pelo merge');

/* Reproduz a corrida inteira:
     1. a pessoa esta editando uma avaliacao  -> a leitura da nuvem fica parada;
     2. ainda editando, ela FINALIZA um estudo -> save() + push;
     3. o push da certo, `_unsavedChanges` volta a false;
     4. a edicao termina e o estado parado e aplicado.
   Sem a correcao, o passo 4 troca a memoria pelo retrato do passo 1 e a
   finalizacao do passo 2 desaparece. */
context.data = {__config:{}, Q1:{cultura:'soja', estudos:[{id:'S1', codigo:'E1', aplicacoes:[], avaliacoes:[]}]}};
context.QGEO = {}; context.QGEO_TS = {}; context.QLOCAL = {}; context.QNOME = {}; context.LOCAIS = {};
context.render = function(){}; context.enforceAccess = function(){};
context.buildLocalChip = function(){}; context.updateAgendaBadge = function(){};

var daNuvem = estado([CRIOU], 5, null);   /* retrato de antes da finalizacao */

context._avEditing = true;                /* 1. editando */
context.cloudApply(daNuvem);
check(context._cloudPending === daNuvem, 'leitura que chega durante a edicao fica estacionada');

/* 2. finaliza durante a edicao */
context.data.Q1.estudos[0].finalizacao = FIN_OBJ;
context.data.Q1.estudos[0].audit = [CRIOU, FINAL];
context.setUnsavedChanges(false);         /* 3. o push do intervalo deu certo */

context._avEditing = false;               /* 4. a edicao termina */
context.cloudApplyPending();

var depois = (context.data.Q1.estudos || [])[0] || {};
check(!!(depois.finalizacao && depois.finalizacao.em),
      'a finalizacao gravada durante a edicao sobrevive ao estado estacionado');
check((depois.audit || []).length === 2,
      'a trilha gravada durante a edicao sobrevive junto');
check(context._cloudPending == null, 'o estado estacionado e consumido');

/* ---------- resultado ---------- */
console.log('\n' + passes + ' passaram, ' + falhas + ' falharam');
if(falhas) process.exit(1);
