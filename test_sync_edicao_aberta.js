/* Dois técnicos ao mesmo tempo, com uma avaliação ABERTA num dos aparelhos.
 *
 * O QUE ESTE TESTE PROTEGE
 * Enquanto uma quadra/avaliação está aberta, o remoto que chega fica PENDENTE
 * (cloudApply adia a aplicação para não atropelar a edição). Nesse intervalo o
 * estado local não tem o trabalho do colega — e nenhuma gravação deste aparelho
 * pode tratar essa ausência como edição. Antes da correção, o pull disparado pelo
 * tempo real gravava o estado mesclado e, em seguida, a "edição pendente segue
 * sozinha" enviava o local puro: a avaliação que o outro técnico acabara de
 * salvar era apagada do servidor em segundos.
 *
 * Roda o app.js e o firebase-sync.js REAIS em dois sandboxes; o Firestore é
 * simulado em memória e compartilhado. Nenhum dado real é tocado.
 */
/* Dois aparelhos com o app.js + firebase-sync.js REAIS, Firestore em memória compartilhado. */
var fs=require('fs'), vm=require('vm'), path=require('path');
var AG=__dirname+path.sep;
var clone=function(v){ return v===undefined?undefined:JSON.parse(JSON.stringify(v)); };

/* ---------- Firestore em memória ---------- */
var REMOTE={cols:{}, root:{}}, OUVINTES=[];
function setPath(obj, caminho, valor){ var o=obj; for(var i=0;i<caminho.length-1;i++){ o[caminho[i]]=o[caminho[i]]||{}; o=o[caminho[i]]; } if(valor===DEL) delete o[caminho[caminho.length-1]]; else o[caminho[caminho.length-1]]=clone(valor); }
var DEL={__del:1};
function FieldPath(){ this.p=[].slice.call(arguments); }
function colRef(name){ REMOTE.cols[name]=REMOTE.cols[name]||{}; var api={
  get:function(){ var c=REMOTE.cols[name]; return Promise.resolve({size:Object.keys(c).length, docs:Object.keys(c).map(function(id){return {id:id,data:function(){return clone(c[id]);}};}), forEach:function(cb){ Object.keys(c).forEach(function(id){ cb({id:id,exists:true,data:function(){return clone(c[id]);}}); }); }}); },
  doc:function(id){ return {_col:name,_id:id, get:function(){ var d=REMOTE.cols[name][id]; return Promise.resolve({exists:!!d,id:id,data:function(){return clone(d);}}); }, set:function(d){ REMOTE.cols[name][id]=clone(d); return Promise.resolve(); } }; },
  where:function(){ return {get:function(){ return Promise.resolve({size:0,docs:[],forEach:function(){}}); }, orderBy:function(){return this;}, limit:function(){return this;}}; },
  orderBy:function(){ return this; }, limit:function(){ return this; } }; return api; }
var rootRef={ _root:true, collection:colRef,
  get:function(){ return Promise.resolve({exists:Object.keys(REMOTE.root).length>0,data:function(){return clone(REMOTE.root);}}); },
  onSnapshot:function(opts,cb){ OUVINTES.push(cb); return function(){}; },
  set:function(d){ Object.assign(REMOTE.root,clone(d)); return Promise.resolve(); } };
var db={ doc:function(p){ return rootRef; }, settings:function(){}, enablePersistence:function(){ return Promise.resolve(); },
  batch:function(){ var ops=[]; return {
    set:function(r,d,o){ ops.push(['s',r,d,o]); }, delete:function(r){ ops.push(['d',r]); },
    update:function(r){ var a=[].slice.call(arguments,1); ops.push(['u',r,a]); },
    commit:function(){ ops.forEach(function(o){
      var r=o[1];
      if(r._root){ if(o[0]==='s') Object.assign(REMOTE.root,clone(o[2])); return; }
      var col=REMOTE.cols[r._col]=REMOTE.cols[r._col]||{};
      if(o[0]==='s') col[r._id]=clone(o[2]);
      else if(o[0]==='d') delete col[r._id];
      else { var d=col[r._id]=col[r._id]||{}; for(var i=0;i<o[2].length;i+=2){ var fp=o[2][i], v=o[2][i+1]; setPath(d, fp.p, (v&&v.__del)?DEL:v); } }
    }); return Promise.resolve(); } }; } };
function notificar(){ OUVINTES.forEach(function(cb){ cb({exists:true,metadata:{hasPendingWrites:false},data:function(){return clone(REMOTE.root);}}); }); }

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
async function esperar(){ for(var i=0;i<40;i++) await new Promise(function(r){ setImmediate(r); }); }
function temAval(id){ return Object.keys(REMOTE.cols.avaliacoes||{}).some(function(k){ return REMOTE.cols.avaliacoes[k].id===id; }); }


(async function(){
  var falhas=0; function check(ok,msg){ console.log((ok?'  ok   ':'  FALHA ')+msg); if(!ok) falhas++; }
  var base={Q1:{cultura:'soja',estudos:[{id:'S1',codigo:'E1',tratamentos:[{id:'T1'}],aplicacoes:[],
    avaliacoes:[{id:'AV1',data:'2026-03-01',variaveis:['sev'],tipos:{},notas:{T1R1:{sev:'10'}},notasMeta:{T1R1:{sev:{ts:1}}}}]}]}};
  var A=aparelho('A',base), B=aparelho('B',base);
  A.authInit(); B.authInit(); await esperar();
  check(temAval('AV1'),'estado inicial sincronizado');

  A._avEditing=true;                      /* técnico A abre uma avaliação */
  vm.runInContext("data.Q1.estudos[0].avaliacoes.push({id:'AV-B',data:'2026-03-02',variaveis:['sev'],tipos:{},notas:{T1R1:{sev:'42'}},notasMeta:{T1R1:{sev:{ts:5}}}}); setUnsavedChanges(true);",B);
  B.cloudSave(); await esperar();
  check(temAval('AV-B'),'técnico B salvou uma avaliação nova');

  A.cloudPull(); await esperar();         /* o tempo real avisa A e ele puxa, ainda editando */
  check(!!A._cloudPending,'durante a edição o remoto fica pendente em A');
  check(temAval('AV-B'),'o pull de A durante a edição NÃO apaga a avaliação de B');

  vm.runInContext("data.Q1.estudos[0].avaliacoes[0].notas.T1R1.sev='11'; data.Q1.estudos[0].avaliacoes[0].notasMeta.T1R1.sev={ts:9}; setUnsavedChanges(true);",A);
  A.cloudSave(); await esperar();         /* autosave durante a edição */
  check(temAval('AV-B'),'o autosave de A durante a edição NÃO apaga a avaliação de B');
  /* as notas vão dentro do documento da avaliação (um documento por avaliação) */
  var AV=REMOTE.cols.avaliacoes||{}, k=Object.keys(AV).find(function(x){ return AV[x].id==='AV1'; });
  var sev=k && AV[k].notas && AV[k].notas.T1R1 && AV[k].notas.T1R1.sev;
  check(String(sev)==='11','a edição de A chegou ao servidor');

  A._avEditing=false; A.cloudApplyPending(); await esperar();   /* A fecha a avaliação */
  var locais=vm.runInContext("JSON.stringify(data.Q1.estudos[0].avaliacoes.map(function(a){return a.id;}))",A);
  check(JSON.parse(locais).indexOf('AV-B')>=0,'ao fechar, A passa a ter a avaliação de B');
  A.cloudSave(); await esperar();
  check(temAval('AV-B') && temAval('AV1'),'a gravação seguinte de A mantém as duas avaliações');

  /* ---- 2. Gravações simultâneas: o rev não é atômico e os dois gravam o MESMO número.
     Cada aparelho precisa perceber a gravação do outro e convergir. */
  Object.keys(REMOTE.cols).forEach(function(k){ delete REMOTE.cols[k]; });
  Object.keys(REMOTE.root).forEach(function(k){ delete REMOTE.root[k]; });
  OUVINTES.length=0;
  var base2={Q1:{cultura:'soja',estudos:[{id:'S1',codigo:'E1',tratamentos:[{id:'T1'}],aplicacoes:[],avaliacoes:[]}]}};
  var C=aparelho('C',base2), D=aparelho('D',base2);
  C.authInit(); D.authInit(); await esperar();
  C.cloudSubscribe(); D.cloudSubscribe();
  var ouv=OUVINTES.slice(-2), aps=[C,D];
  vm.runInContext("data.Q1.cultivar='C-edit'; data.Q1._ts=Date.now(); setUnsavedChanges(true);",C);
  vm.runInContext("data.Q1.estudos[0].codigo='E1-D'; data.Q1.estudos[0]._ts=Date.now(); setUnsavedChanges(true);",D);
  C.cloudSave(); D.cloudSave(); await esperar();       /* os dois conferem e gravam no mesmo instante */
  for(var rodada=0; rodada<8; rodada++){               /* o servidor avisa; roda os pulls agendados até parar */
    aps.forEach(function(a){ a.__timers.length=0; });
    var raiz={exists:true,metadata:{hasPendingWrites:false},data:function(){return JSON.parse(JSON.stringify(REMOTE.root));}};
    ouv.forEach(function(cb){ cb(raiz); });
    var agendou=false;
    aps.forEach(function(a){ a.__timers.slice().forEach(function(t){ if(t.f===a.cloudPull){ agendou=true; t.f(); } }); });
    await esperar();
    if(!agendou) break;
  }
  var Q=REMOTE.cols.quadras, E=REMOTE.cols.estudos;
  check(Q[Object.keys(Q)[0]].data.cultivar==='C-edit' && E[Object.keys(E)[0]].data.codigo==='E1-D','o servidor guarda as duas edições simultâneas');
  check(vm.runInContext('data.Q1.estudos[0].codigo',C)==='E1-D','o aparelho C recebe a edição de D');
  check(vm.runInContext('data.Q1.cultivar',D)==='C-edit','o aparelho D recebe a edição de C');

  if(falhas){ console.log('\n'+falhas+' falha(s).'); process.exitCode=1; }
  else console.log('Sincronização: edição aberta não apaga o trabalho do colega, e gravações simultâneas convergem.');
})().catch(function(e){ console.error(e); process.exitCode=1; });
