/* Correções da revisão de 26/09/2026 — cada uma com o caso que a motivou.
 *
 *  1. DAP no Excel: o plantio fica gravado em dd/mm/aaaa, e new Date() lia como
 *     mês/dia — DAP vazio (dia > 12) ou errado (05/03 dava -23 em vez de 36).
 *  2. Verificador de integridade: data válida é a que sobrevive à ida e volta;
 *     dd/mm é aceita, "30/02" não.
 *  3. Equivalente em ingrediente ativo: "% v/v", "mL/100 L" e dose sem unidade (sem
 *     unidade declarada no estudo) não têm conta por hectare — não se mostra número.
 *  4. Tipo da triagem forense a partir do tipo declarado da coluna: contagem de
 *     estrutura da planta não vai para o teste de Poisson; estimativa visual vai para 'pct'.
 *
 * Rodar: node tests/test_auditoria_2026_09_26.js
 */
var fs=require('fs'), vm=require('vm'), path=require('path');
var AG=path.join(__dirname, '..') + path.sep;
var db={ doc:function(){ return {collection:function(){ return {get:function(){return Promise.resolve({forEach:function(){}});},doc:function(){return {};}}; },get:function(){return Promise.resolve({exists:false,data:function(){return {};}});},onSnapshot:function(){return function(){};}}; }, settings:function(){}, batch:function(){ return {set:function(){},delete:function(){},update:function(){},commit:function(){return Promise.resolve();}}; } };
function FieldPath(){}
/* ---------- um aparelho ---------- */
function elStub(){ return new Proxy(function(){}, { get:function(t,k){ if(k==='style')return {}; if(k==='classList')return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}}; if(k==='value'||k==='textContent'||k==='innerHTML')return ''; if(k==='children'||k==='childNodes')return []; return elStub(); }, set:function(){return true;}, apply:function(){return elStub();} }); }
function aparelho(nome, estado){
  var store={};
  var c={console:{log:function(){},warn:function(){},error:function(){}},Promise:Promise,setTimeout:function(f,ms){ c.__timers.push({f:f,ms:ms}); return c.__timers.length; },clearTimeout:function(){},setInterval:function(){},clearInterval:function(){},
    Date:Date,JSON:JSON,Object:Object,Array:Array,String:String,Number:Number,Math:Math,RegExp:RegExp,Error:Error,isNaN:isNaN,parseInt:parseInt,parseFloat:parseFloat,Map:Map,Set:Set,Symbol:Symbol,
    encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,alert:function(){},confirm:function(){return true;},prompt:function(){return '';},__timers:[]};
  c.window=c; c.globalThis=c; c.self=c;
  c.btoa=function(s){return Buffer.from(s,'binary').toString('base64');}; c.atob=function(s){return Buffer.from(s,'base64').toString('binary');};
  c.localStorage={getItem:function(k){return store[k]==null?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
  c.sessionStorage={getItem:function(){return null;},setItem:function(){}};
  c.location={reload:function(){},href:'',search:'',hash:'',origin:'http://x'};
  c.navigator={onLine:true,userAgent:'node',serviceWorker:{register:function(){return Promise.resolve();},addEventListener:function(){}}};
  c.document=new Proxy({},{get:function(t,k){ if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS')return function(){return elStub();}; if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName')return function(){return [];}; if(k==='addEventListener'||k==='removeEventListener')return function(){}; if(k==='visibilityState')return 'visible'; if(k==='cookie')return ''; return elStub(); }});
  c.addEventListener=function(){}; c.removeEventListener=function(){}; c.requestAnimationFrame=function(){}; c.dispatchEvent=function(){}; c.CustomEvent=function(n,o){this.detail=o&&o.detail;};
  c.matchMedia=function(){return {matches:false,addListener:function(){},addEventListener:function(){}};};
  c.fetch=function(){return Promise.resolve({ok:true,json:function(){return Promise.resolve({});}});};
  c.firebase={apps:[1],app:function(){return {};},initializeApp:function(){return {};},
    auth:function(){ return {setPersistence:function(){},onAuthStateChanged:function(cb){ cb({uid:'u-'+nome,email:nome+'@x.com',emailVerified:true}); },signOut:function(){return Promise.resolve();}}; },
    firestore:function(){return db;}};
  c.firebase.auth.Auth={Persistence:{LOCAL:1,NONE:0}};
  c.firebase.firestore.FieldValue={serverTimestamp:function(){return 'ts';},delete:function(){return {__del:1};}};
  c.firebase.firestore.FieldPath=FieldPath;
  c.AGRACTA_FIREBASE_CONFIG={apiKey:'x',authDomain:'d',projectId:'p',appId:'a'};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(AG+'app.js','utf8'),c,{filename:'app.js'});
  vm.runInContext(fs.readFileSync(AG+'firebase-sync.js','utf8'),c,{filename:'firebase-sync.js'});
  vm.runInContext('data='+JSON.stringify(estado)+';',c);
  return c;
}
var falhas=0; function eq(a,b,msg){ var ok=(String(a)===String(b)); console.log((ok?'  ok   ':'  FALHA ')+msg+(ok?'':'  (esperado '+b+', veio '+a+')')); if(!ok) falhas++; }
var A=aparelho('A',{Q1:{estudos:[]}});
vm.runInContext(fs.readFileSync(AG+'vendor/dose-core.js','utf8'),A);
vm.runInContext(fs.readFileSync(AG+'vendor/biocalc-campo-core.js','utf8'),A);

console.log('\n[1] DAP na exportação Excel');
var src=fs.readFileSync(AG+'app.js','utf8'), i=src.indexOf('  function dap(pl,when)'), j=src.indexOf('\n',i);
vm.runInContext('var __dap=(function(){'+src.slice(i,j)+' return dap; })();',A);
eq(vm.runInContext("__dap('05/03/2026','2026-04-10')",A), 36, 'plantio 05/03/2026 -> 36 dias (antes: -23)');
eq(vm.runInContext("__dap('25/03/2026','2026-04-10')",A), 16, 'plantio 25/03/2026 -> 16 dias (antes: vazio)');
eq(vm.runInContext("__dap('2026-03-05','2026-04-10')",A), 36, 'plantio em ISO continua certo');

console.log('\n[2] data de registro no verificador de integridade');
eq(vm.runInContext("_dataRegistroValida('25/04/2026')",A), true, 'dd/mm/aaaa é aceita');
eq(vm.runInContext("_dataRegistroValida('2026-04-25')",A), true, 'aaaa-mm-dd é aceita');
eq(vm.runInContext("_dataRegistroValida('30/02/2026')",A), false, '30/02 é recusada (não rola para março)');
eq(vm.runInContext("_dataRegistroValida('lixo')",A), false, 'texto sem data é recusado');

console.log('\n[3] equivalente em ingrediente ativo');
vm.runInContext("ensureItens(); ITENS['it1']={id:'it1',nome:'Fungicida X',concentracao:'250 g/L'};",A);
function eqIA(dose, declarada){
  return vm.runInContext("(function(){ var r=tratEquivalenteIA({itemId:'it1',dose:"+JSON.stringify(dose)+"},{doseUnidade:"+JSON.stringify(declarada||'')+"}); return r?r.itens.map(function(x){return x.valor;}).join('+'):'-'; })()",A);
}
eq(eqIA('1 L/ha'), 250, '1 L/ha de 250 g/L -> 250 g i.a./ha');
eq(eqIA('500 mL/ha'), 125, '500 mL/ha -> 125 g i.a./ha');
eq(eqIA('0,5% v/v'), '-', '% da calda não vira L/ha (não se mostra)');
eq(eqIA('50 mL/100 L'), '-', 'dose por 100 L não vira mL/ha (não se mostra)');
eq(eqIA('1'), '-', 'dose sem unidade, estudo sem unidade declarada: não se mostra');
eq(eqIA('1','L/ha'), 250, 'dose sem unidade com L/ha declarado no estudo: conta');

console.log('\n[4] tipo da triagem forense pelo tipo declarado');
function ft(v,t){ return vm.runInContext("_bioestatForenseTipo({variavel:"+JSON.stringify(v)+",tipo:"+JSON.stringify(t)+"})",A); }
eq(ft('Lagartas em 10 plantas','contagem'), 'count', 'contagem de organismo -> Poisson');
eq(ft('Estande','contagem'), 'cont', 'estande (contagem regulada) -> contínuo');
eq(ft('Número de vagens','contagem'), 'cont', 'vagens (contagem regulada) -> contínuo');
eq(ft('Severidade (%)','pct'), 'pct', 'severidade estimada -> estimativa visual');
eq(ft('Nota de fitotoxicidade','escala'), 'pct', 'escala de notas -> estimativa visual');
eq(ft('Altura (cm)','pct'), 'cont', 'altura -> contínuo');

if(falhas){ console.log('\n'+falhas+' falha(s).'); process.exitCode=1; }
else console.log('\nCorreções de 26/09: DAP, datas, equivalente em i.a. e tipo da triagem conferidos.');
