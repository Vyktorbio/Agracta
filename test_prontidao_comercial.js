'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const drone=require('./vendor/drone-core.js');
const app=fs.readFileSync('app.js','utf8'),sync=fs.readFileSync('firebase-sync.js','utf8');
function section(src,start,end){return src.slice(src.indexOf(start),src.indexOf(end));}
function context(c){c.window=c;vm.createContext(c);return c;}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function cacheLifecycle(){
  // CacheStorage é compartilhado por todos os workers da mesma origem.
  const names=new Set(['agracta-app-v1','agracta-app-v218','agracta-pyodide-v1','bioensaio-v1-auditoria','bioensaio-v47-auditoria','outro-app']);
  const handlers={};let current;
  const c=context({URL,Promise,self:{addEventListener:(k,f)=>handlers[k]=f,clients:{claim:()=>Promise.resolve()}},
    caches:{keys:async()=>[...names],delete:async k=>names.delete(k),
      open:async k=>({match:async req=>k==='bioensaio-v47-auditoria'?'estatistica-atual':undefined}),
      match:async()=> 'HTML-antigo-do-app-principal'}});
  vm.runInContext(fs.readFileSync('sw.js','utf8'),c);
  handlers.activate({waitUntil:p=>current=p});await current;
  assert(!names.has('agracta-app-v1'));assert(names.has('bioensaio-v1-auditoria'));
  const stat=context({URL,Promise,self:c.self,caches:c.caches});
  vm.runInContext(fs.readFileSync('estatistica/sw.js','utf8'),stat);
  handlers.activate({waitUntil:p=>current=p});await current;
  assert(!names.has('bioensaio-v1-auditoria'));
  for(const k of ['agracta-app-v218','agracta-pyodide-v1','bioensaio-v47-auditoria','outro-app'])assert(names.has(k),k);
  assert.equal(await stat.cacheMatch({url:'https://agracta.test/estatistica/index.html',mode:'navigate'}),'estatistica-atual');
  const html=fs.readFileSync('estatistica/index.html','utf8'),sw=fs.readFileSync('estatistica/sw.js','utf8');
  for(const m of html.matchAll(/(?:src|href)="([^"?]+\?v=bioensaio[^\"]+)"/g))assert(sw.includes(m[1]),m[1]);
}
function totalDrone(){
  const cfg={rate:3,speed:10,width:11,height:3,minFlow:.1,maxFlow:2,observedFlow:.55,
    minimumOperatingMl:0,tankCapacity:10,plotLength:20,plotWidth:11,numPlots:4,swathConfirmed:true};
  const short=drone.calculate({...cfg,preparedMl:100});
  assert.equal(short.usefulVolumeMl,66);assert.equal(short.totalUsefulVolumeMl,264);
  assert.equal(short.canApply,false,'100 mL atende uma parcela, mas não as quatro');
  assert.equal(drone.calculate({...cfg,preparedMl:264}).canApply,true);
  assert.equal(drone.calculate({...cfg,numPlots:1.5,preparedMl:264}).canApply,false);
}
function checkpoints(){
  const badges=[];
  const c=context({FB:{user:{email:'a'},cofreDefasado:true},document:{hidden:false},console,
    cloudBadge:(...args)=>badges.push(args),_unsavedChanges:true});
  vm.runInContext(section(sync,'  function checkpointFalhou(','  function checkpointPut('),c);
  c.checkpointOk();assert.equal(badges.at(-1)[0],'offline');assert.match(badges.at(-1)[1],/pendente/);
  c._unsavedChanges=false;c.FB.cofreDefasado=true;c.FB.pushing=true;
  c.checkpointOk();assert.match(badges.at(-1)[1],/pendente/);
  c.FB.pushing=false;c.FB.user=null;c.FB.cofreDefasado=true;
  c.checkpointOk();assert.match(badges.at(-1)[1],/sem sincronização/);
}
async function reconnect(){
  let pulled=0,saved=0,callback;
  const c=context({FB:{user:{email:'a'},db:{doc:()=>({onSnapshot:(_o,cb)=>{callback=cb;}})},lastRev:4},ROOT:'test',
    _unsavedChanges:true,showAuthGate:()=>{},cloudPull:()=>{pulled++;return Promise.resolve(true);},
    cloudSave:()=>{saved++;},cloudBadge:()=>{},setTimeout:f=>{f();},clearTimeout:()=>{}});
  vm.runInContext(section(sync,'  window.cloudResync=function(){','  window.cloudStart=function(){'),c);
  await c.cloudResync();assert.equal(pulled,1);assert.equal(saved,0,'reconcilia antes de reenviar após offline');
  c.cloudSubscribe();callback({exists:true,metadata:{hasPendingWrites:false},data:()=>({rev:5})});
  assert.equal(c.FB.lastRev,4,'a notificação não confirma uma leitura ainda não concluída');
  const d=deferred();c.FB.pushing=true;c.FB.pushPromise=d.promise;
  const before=pulled,p=c.cloudResync();assert.equal(pulled,before);d.resolve();await p;
}
async function serializedPull(){
  let reads=0;let read=deferred();
  const c=context({FB:{user:{email:'a'}},Promise,cloudBadge:()=>{},showAuthGate:()=>{},
    readRemote:()=>{reads++;return read.promise;},rememberTrustedUser:()=>{},meaningful:()=>false,
    localState:()=>({}),syncAllowedUsersToMembers:()=>{},authBusy:()=>{},authErr:()=>{},hideAuthGate:()=>{},console});
  vm.runInContext(section(sync,'  window.cloudPull=function(){','  /* Resync barato:'),c);
  const first=c.cloudPull(),second=c.cloudPull();assert.equal(first,second);assert.equal(reads,1);
  read.resolve({state:{}});await first;assert.equal(c.FB.pullPromise,null);
  read=deferred();const push=deferred();c.FB.pushing=true;c.FB.pushPromise=push.promise;
  const later=c.cloudPull();assert.equal(reads,1,'leitura espera todos os lotes do envio ativo');
  c.FB.pushing=false;push.resolve();await Promise.resolve();assert.equal(reads,2);
  read.resolve({state:{}});await later;
}
function backups(){
  let quota=false;const storage={},alerts=[];
  const c=context({Date,JSON,Array,Object,console,data:{Q1:{estudos:[]}},QGEO:{Q1:[[1,2]]},
    NOTAS_CAMPO:[{id:'n1',texto:'nota'}],NOTAS_CAMPO_KEY:'notas',DELN_KEY:'deln',
    _delQuadras:{old:1},_delLocais:{old:2},_delNotas:{old:3},GEOREF_TS:42,
    localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>{if(quota)throw Error('quota');storage[k]=v;}},
    alert:m=>alerts.push(m),save:()=>{},render:()=>{},normalizeRZLib:x=>x,saveRZLib:()=>{}});
  vm.runInContext(section(app,'function safetySnap(){','/* ===================== HISTÓRICO DA NUVEM'),c);
  assert.equal(c.safetyBackup('teste'),true);
  const snap=c.safetyList()[0];assert.equal(snap.notas_campo[0].texto,'nota');assert.equal(snap.georefts,42);
  c.NOTAS_CAMPO=[];c._delQuadras={};c._delNotas={};
  assert.equal(c.safetyApply(snap),true);assert.equal(c.NOTAS_CAMPO[0].id,'n1');assert.equal(c._delQuadras.old,1);assert.equal(c._delNotas.old,3);
  quota=true;const data=c.data;
  assert.equal(c.safetyApply({...snap,data:{Q2:{estudos:[]}}}),false);assert.equal(c.data,data,'sem backup prévio, não substitui dados');
  assert.match(alerts.at(-1),/Não foi possível guardar/);
  quota=false;storage['iracema-safety']='{}';assert.equal(c.safetyList().length,0);
}
(async()=>{await cacheLifecycle();totalDrone();checkpoints();await reconnect();await serializedPull();backups();
  console.log('Prontidão: caches independentes, versão offline, volume total, pendências e restauração protegida.');
})().catch(e=>{console.error(e);process.exitCode=1;});
