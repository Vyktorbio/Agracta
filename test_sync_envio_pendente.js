/* Uma confirmação antiga não confirma a edição seguinte nem regrava seu cofre. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('firebase-sync.js','utf8');
const fn=src.slice(src.indexOf('  function commitState('),src.indexOf('\n  window.cloudInit='));
function harness(nOps=1){
  const env={state:{value:1},writes:[],checkpoints:[],badges:[],timers:[],events:[]};
  const ctx={
    FB:{user:{email:'teste'},lastRev:0,db:{doc:()=>({}),batch:()=>({set:()=>{},delete:()=>{},commit:()=>new Promise((resolve,reject)=>env.writes.push({resolve,reject}))})}},
    ROOT:'teste',firebaseInit:()=>true,splitState:s=>({value:s.value}),stable:JSON.stringify,
    queueOps:()=>Array.from({length:nOps},()=>({type:'set',ref:{},data:{}})),
    setTimeout:(f,ms)=>{const t={f,ms};env.timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},
    cloudBadge:(kind,text)=>env.badges.push({kind,text}),
    setUnsavedChanges:b=>{ctx._unsavedChanges=b;},
    checkpointPut:s=>{env.checkpoints.push(s.value);return Promise.resolve();},checkpointFalhou:()=>{},
    localState:()=>({...env.state}),CustomEvent:function(name,o){this.detail=o.detail;},
    dispatchEvent:e=>env.events.push(e.detail),console:{error:()=>{}},Promise,
    firebase:{firestore:{FieldValue:{serverTimestamp:()=>0}}}
  };
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fn,ctx);
  env.ctx=ctx;return env;
}
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
(async()=>{
  const h=harness(),c=h.ctx;
  const first=c.commitState({...h.state});await tick();
  h.state={value:2};c._unsavedChanges=true;
  c.commitState({...h.state});
  h.timers.find(t=>t.ms===15000).f();
  assert.equal(c.FB.pushing,true,'aviso de rede lenta não libera um envio concorrente');
  assert.equal(h.writes.length,1);
  h.writes[0].resolve();await tick();
  assert.equal(c._unsavedChanges,true,'a primeira confirmação não confirma a edição nova');
  assert.equal(h.checkpoints.at(-1),2,'cofre recebe a edição mais nova');
  assert.equal(h.events[0].state.value,1,'portal recebe só o que foi confirmado');
  assert.equal(h.writes.length,2,'a edição pendente segue automaticamente');
  h.writes[1].resolve();await first;await tick();
  assert.equal(c._unsavedChanges,false);assert.equal(c.FB.lastRev,2);
  assert.equal(h.events.at(-1).state.value,2);
  const multi=harness(401),done=multi.ctx.commitState({...multi.state});await tick();
  assert.equal(multi.writes.length,1,'o lote que publica a revisão espera os anteriores');
  multi.writes[0].resolve();await tick();assert.equal(multi.writes.length,2);
  multi.writes[1].resolve();await done;
  const failed=harness(401),failure=failed.ctx.commitState({...failed.state});await tick();
  failed.writes[0].reject(new Error('sem rede'));
  await assert.rejects(failure,/sem rede/);await tick();
  assert.equal(failed.writes.length,1,'falha num lote impede publicar a revisão seguinte');
  assert.equal(failed.ctx._unsavedChanges,true);
  assert.equal(failed.ctx.FB.pushing,false,'envio encerrado com erro permite tentar novamente');
  assert.equal(failed.checkpoints.length,0,'falha não confirma um checkpoint da nuvem');
  console.log('Sincronização: envio serial, edição durante envio, cofre atual e publicação após todos os lotes.');
})().catch(e=>{console.error(e);process.exitCode=1;});
