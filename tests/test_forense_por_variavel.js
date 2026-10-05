/* A TRIAGEM FORENSE É UMA POR VARIÁVEL, COM TODAS AS AVALIAÇÕES JUNTAS.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. Agrupa as células elegíveis da análise por variável: cabeçalho uma vez,
 *     linhas de todas as datas, período e nº de avaliações. Célula que a análise
 *     recusou (poucas repetições) não entra.
 *  2. Manifesto: análise por avaliação×variável, forense por variável, tempo.
 *  3. Fila: uma triagem por variável, com a matriz de todas as datas e o tipo de
 *     dado vindo do tipo declarado da coluna.
 *  4. O fluxo do estudo só dá a triagem por concluída com todas as variáveis.
 *  5. A planilha "Forense" traz uma linha de veredito por variável, com o período.
 *
 * Rodar: node tests/test_forense_por_variavel.js
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
var falhas=0;
function ok(c,msg){ console.log((c?'  ok   ':'  FALHA ')+msg); if(!c) falhas++; }
function notas(vals){ var o={}; vals.forEach(function(v,i){ var t='T'+(Math.floor(i/3)+1), r=(i%3)+1; o[t+'R'+r]=v; }); return o; }
var estudo={id:'S',codigo:'EST-1',numRepeticoes:3,tratamentos:[{id:'T1'},{id:'T2'},{id:'T3'}],
  avaliacoes:[
    {id:'A1',data:'2026-03-05',variaveis:['Severidade','Lagartas'],tipos:{Severidade:'pct',Lagartas:'contagem'},
     notas:(function(){ var s=notas([{Severidade:'10',Lagartas:'4'},{Severidade:'15',Lagartas:'6'},{Severidade:'5',Lagartas:'2'},{Severidade:'30',Lagartas:'9'},{Severidade:'35',Lagartas:'11'},{Severidade:'25',Lagartas:'8'},{Severidade:'50',Lagartas:'14'},{Severidade:'55',Lagartas:'17'},{Severidade:'45',Lagartas:'12'}]);
       var o={}; Object.keys(s).forEach(function(k){ o[k]=s[k]; }); return o; })()},
    {id:'A2',data:'2026-03-19',variaveis:['Severidade'],tipos:{Severidade:'pct'},
     notas:notas([{Severidade:'15'},{Severidade:'20'},{Severidade:'10'},{Severidade:'40'},{Severidade:'45'},{Severidade:'35'},{Severidade:'60'},{Severidade:'65'},{Severidade:'55'}])},
    /* avaliação em que só um tratamento tem valor: a análise recusa, a triagem também */
    {id:'A3',data:'2026-04-02',variaveis:['Severidade'],tipos:{Severidade:'pct'},notas:{T1R1:{Severidade:'20'},T1R2:{Severidade:'25'}}}
  ]};
var A=aparelho('A',{Q1:{cultura:'soja',estudos:[estudo]}});
vm.runInContext("LOCAIS={L1:{nome:'Estação'}}; QLOCAL={Q1:'L1'}; QNOME={Q1:'A1'}; _bioAutoQueue.length=0; _bioEngineReady=false;",A);
function js(expr){ return JSON.parse(vm.runInContext('JSON.stringify('+expr+')',A)); }

console.log('\n[1] uma triagem por variável');
var jf=js("_bioestatJobsForense('Q1', normalizeStudy(data.Q1.estudos[0])).map(function(j){ return {k:j.jobKey,v:j.variavel,t:j.tipo,d:j.datas,dt:j.datasTexto,n:j.n,cab:j.aoa[0][4],datasNaMatriz:j.aoa.slice(1).map(function(r){return r[4];}).filter(function(x,i,a){return a.indexOf(x)===i;})}; })");
ok(jf.length===2,'duas variáveis, duas triagens (eram 3 células)');
var sev=jf.filter(function(j){return j.v==='Severidade';})[0], lag=jf.filter(function(j){return j.v==='Lagartas';})[0];
ok(sev && sev.k==='__forense__|Severidade','chave da triagem por variável');
ok(sev && sev.d===2 && sev.n===18,'Severidade junta as 2 avaliações elegíveis (18 valores)');
ok(sev && sev.datasNaMatriz.length===2,'a matriz leva as datas, que viram estratos');
ok(sev && sev.dt==='05/03/2026 a 19/03/2026','o período aparece por extenso');
ok(sev && sev.datasNaMatriz.indexOf('02/04/2026')<0,'a avaliação que a análise recusou não entra');
ok(lag && lag.d===1 && lag.t==='contagem','Lagartas: uma data, tipo declarado contagem');

console.log('\n[2] manifesto');
var man=js("_bioestatManifesto('Q1', normalizeStudy(data.Q1.estudos[0])).map(function(m){return m.modo+':'+m.jobKey;})");
ok(man.filter(function(m){return /^analise:/.test(m);}).length===3,'análise segue por avaliação × variável (3)');
ok(man.filter(function(m){return /^forense:/.test(m);}).length===2,'forense por variável (2)');
ok(man.every(function(m){ return !/\|F$/.test(m); }),'nenhuma chave por célula no formato antigo');

console.log('\n[3] fila do motor');
vm.runInContext("_bioestatEnsureStudy('Q1','S');",A);
setTimeout(function(){
  var fila=js("_bioAutoQueue.map(function(i){ return {modo:i.payload.modo,k:i.job.jobKey,ft:i.payload.forenseTipo,linhas:i.payload.aoa.length-1}; })");
  var fq=fila.filter(function(i){return i.modo==='forense';});
  ok(fila.filter(function(i){return i.modo==='analise';}).length===0,'análises aguardam botão; não entram automaticamente');
  ok(fq.length===2,'2 triagens forenses na fila (antes: 3)');
  var fs2=fq.filter(function(i){return i.k==='__forense__|Severidade';})[0];
  ok(fs2 && fs2.linhas===18 && fs2.ft==='pct','Severidade vai com as 18 linhas e como estimativa visual');
  var fl=fq.filter(function(i){return i.k==='__forense__|Lagartas';})[0];
  ok(fl && fl.ft==='count','Lagartas vai como contagem de organismo');

  console.log('\n[4] fluxo do estudo e planilha');
  var c=vm.runInContext("_bioAutoCache['Q1|S']",A);
  vm.runInContext("(function(){ var c=_bioAutoCache['Q1|S']; c.results['__forense__|Severidade']={ok:true,veredito:{nivel:'SEM SINAIS RELEVANTES',classe:'clear'},parametros:{modo:'conservador'},achados:[]}; })()",A);
  var pronto1=vm.runInContext("(function(){ var s=normalizeStudy(data.Q1.estudos[0]), jf=_bioestatJobsForense('Q1',s), rr=_bioAutoCache['Q1|S'].results; return jf.every(function(j){return !!rr[j.jobKey];}); })()",A);
  ok(pronto1===false,'com uma variável triada de duas, a triagem não está completa');
  vm.runInContext("_bioAutoCache['Q1|S'].results['__forense__|Lagartas']={ok:true,veredito:{nivel:'OBSERVAR',classe:'watch'},parametros:{modo:'conservador'},achados:[]};",A);
  var planilha=js("_bioestatForensicSheet('Q1', normalizeStudy(data.Q1.estudos[0]))");
  var cab=planilha[0], iVar=cab.indexOf('Variavel'), iData=cab.indexOf('Data'), iStat=cab.indexOf('Status');
  var veredictos=planilha.slice(1).filter(function(r){return r[iStat]==='CONCLUIDO';});
  ok(veredictos.length===2,'planilha: um veredito por variável');
  var lSev=veredictos.filter(function(r){return r[iVar]==='Severidade';})[0];
  ok(lSev && lSev[iData]==='05/03/2026 a 19/03/2026','planilha: a coluna Data traz o período da variável');

  // A autorização é para os dados atuais: uma nova assinatura volta ao modo forense.
  vm.runInContext("iniciarCalculosEstatisticos('Q1','S');",A);
  setTimeout(function(){
    var manual=js("_bioAutoQueue.filter(function(i){return i.payload.modo==='analise';}).length");
    ok(manual===3,'botão libera as 3 análises estatísticas');
    vm.runInContext("data.Q1.estudos[0].avaliacoes[0].notas.T1R1.Severidade='99';_bioestatEnsureStudy('Q1','S');",A);
    setTimeout(function(){
      ok(js("_bioAutoQueue.filter(function(i){return i.payload.modo==='analise';}).length")===0,'mudança de dados exige novo clique para estatística');
      if(falhas){ console.log('\n'+falhas+' falha(s).'); process.exitCode=1; }
      else console.log('Botão estatístico e invalidação após edição OK.');
    },20);
  },20);
  if(falhas){ console.log('\n'+falhas+' falha(s).'); process.exitCode=1; }
  else console.log('\nTriagem forense por variável: agrupamento, manifesto, fila, fluxo e planilha OK.');
},50);
