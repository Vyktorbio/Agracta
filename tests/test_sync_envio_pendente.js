/* Estado real do app + adaptador real; Firestore com commit atômico controlável. */
'use strict';
const assert=require('node:assert/strict');
const {createContext}=require('./state-harness.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const root='workspaces/agracta';
const DEL=Object.freeze({__deleteField:true});
function FieldPath(){this.segments=Array.from(arguments);}
function initial(){return {data:{__config:{},Q1:{cultura:'Soja',estudos:[{id:'S1',aplicacoes:[],avaliacoes:[{id:'A1',variaveis:['v'],tipos:{v:'pct'},notas:{T1R1:{v:1},T1R2:{v:2}},notasMeta:{T1R1:{v:{ts:1}},T1R2:{v:{ts:1}}}}]}]}},locais:{L:{nome:'Local'}},qlocal:{Q1:'L'},qgeo:{},rev:1};}
function database(){
  const env={docs:{},commits:[],attempts:[],listeners:[],reads:0,offline:false,beforeRead:null,beforeCommit:null,afterCommit:null,autoId:0};
  function snapshot(p){return {exists:!!env.docs[p],data:()=>clone(env.docs[p]||{}),metadata:{hasPendingWrites:false}};}
  env.db={doc(p){return {path:p,get:async()=>{env.reads++;if(env.beforeRead)await env.beforeRead(p);if(env.offline)throw new Error('sem rede');return snapshot(p);},collection(n){return {doc(id){return env.db.doc(p+'/'+n+'/'+(id||'auto-'+(++env.autoId)));},get:async()=>{env.reads++;if(env.offline)throw new Error('sem rede');const prefix=p+'/'+n+'/';return {forEach(fn){Object.keys(env.docs).filter(k=>k.startsWith(prefix)).forEach(k=>fn({id:k.slice(prefix.length),data:()=>clone(env.docs[k])}));}};}};},onSnapshot(options,fn){env.listeners.push(fn);return ()=>{};}};},async runTransaction(fn){
    const reads={},writes=[];
    const tx={get:async ref=>{reads[ref.path]=JSON.stringify(env.docs[ref.path]);return snapshot(ref.path);},set:(ref,data,opts)=>writes.push({path:ref.path,data:clone(data),merge:opts&&opts.merge}),delete:ref=>writes.push({path:ref.path,deleted:true}),update:(ref,...args)=>{const fields=[];for(let i=0;i<args.length;i+=2)fields.push({path:args[i].segments,value:args[i+1]===DEL?DEL:clone(args[i+1])});writes.push({path:ref.path,fields});}};
    const val=await fn(tx);
    env.attempts.push(writes);
    if(env.beforeCommit)await env.beforeCommit(writes);
    if(env.offline)throw new Error('sem rede');
    // Like Firestore's automatic retry: callback sees the new root version.
    if(Object.keys(reads).some(p=>reads[p]!==JSON.stringify(env.docs[p])))return env.db.runTransaction(fn);
    const next=clone(env.docs);
    writes.forEach(w=>{if(w.deleted)delete next[w.path];else if(w.fields){if(!next[w.path])throw Object.assign(Error('documento ausente'),{code:'not-found'});for(const f of w.fields){let o=next[w.path];for(const p of f.path.slice(0,-1))o=o[p]||(o[p]={});if(f.value===DEL)delete o[f.path.at(-1)];else o[f.path.at(-1)]=clone(f.value);}}else next[w.path]=w.merge?{...next[w.path],...w.data}:w.data;});
    env.docs=next;env.commits.push(writes);env.listeners.forEach(fn=>fn(snapshot(root)));if(env.afterCommit)await env.afterCommit(writes);return val;
  }};
  return env;
}
function client(db,st,options){
  const c=createContext();let state=clone(st);const checkpoints=[],badges=[];
  c.__testFB.ready=true;c.__testFB.db=db;c.__testFB.user={email:'tecnico@example.test'};
  c.firebase={firestore:{FieldPath,FieldValue:{serverTimestamp:()=>Date.now(),delete:()=>DEL}}};
  c.cloudBadge=(k,t)=>badges.push(t||k);
  if(options&&options.runtime){c.cloudApply(clone(st));}
  else{
    c.cloudState=()=>state;c.setUnsavedChanges=v=>c._unsavedChanges=v;
    c.cloudApply=s=>{state=clone(s);c._cloudApplying=true;c.cloudSaveSoon();c._cloudApplying=false;};
  }
  return {c,get state(){return options&&options.runtime?c.cloudState():state;},set state(s){if(options&&options.runtime)c.cloudApply(clone(s));else state=s;},checkpoints,badges};
}
function seed(env,c,st){const flat=c.AgractaFirebase.splitState(st);env.docs[root]={rev:st.rev||1};Object.entries(flat).forEach(([col,docs])=>Object.entries(docs).forEach(([id,d])=>env.docs[root+'/'+col+'/'+id]=clone(d)));}
function av(st){return st.data.Q1.estudos[0].avaliacoes[0];}
function edit(c,cell,value,ts){av(c.state).notas[cell].v=value;av(c.state).notasMeta[cell].v.ts=ts;c.c._unsavedChanges=true;}
function remote(env,c){const flat={};Object.entries(env.docs).forEach(([p,v])=>{const parts=p.slice(root.length+1).split('/');if(parts.length===2)(flat[parts[0]]||={})[parts[1]]=v;});return c.AgractaFirebase.buildState(flat,env.docs[root]);}
const tick=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
function withDeadline(p,label){let timer;return Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Teste travou: '+label)),3000);})]).finally(()=>clearTimeout(timer));}
function assertAtomicHistory(env){
  for(const writes of env.commits){
    const meta=writes.find(w=>w.path===root);
    assert.ok(meta,'cada commit publica a revisão junto dos dados');
    const data=writes.filter(w=>w.path!==root&&!w.path.startsWith(root+'/historico/'));
    const history=writes.filter(w=>w.path.startsWith(root+'/historico/'));
    assert.equal(history.length,data.length,'cada documento alterado guarda seu anterior no mesmo commit');
    for(const w of data){const parts=w.path.slice(root.length+1).split('/');assert.ok(history.some(h=>h.data.colecao===parts[0]&&h.data.docId===parts[1]&&h.data.rev===meta.data.rev),'histórico e dado têm documento e revisão correspondentes');}
  }
}
if(require.main===module)(async()=>{
  const env=database(),a=client(env.db,initial()),b=client(env.db,initial());seed(env,a.c,initial());
  await a.c.cloudPull();await b.c.cloudPull();await tick();env.commits=[];const baseRev=env.docs[root].rev;
  edit(a,'T1R1',7,100);edit(b,'T1R1',9,50);edit(b,'T1R2',8,110);
  await a.c.cloudSave();await b.c.cloudSave();
  let r=remote(env,a.c);assert.equal(av(r).notas.T1R1.v,7,'edição antiga não atropela célula nova');assert.equal(av(r).notas.T1R2.v,8,'outra célula offline sobrevive');
  assert.equal(env.commits.length,2);assert.equal(env.docs[root].rev,baseRev+2);
  await a.c.cloudPull();const writes=env.commits.length;await a.c.cloudSave();await a.c.cloudPull();
  assert.equal(env.commits.length,writes,'pull e envio sem alterações não criam revisões nem ecos');
  const reads=env.reads;await a.c.cloudPull();assert.equal(env.reads-reads,1,'cache atualizado só confere a raiz');
  // Race after the snapshot read, including an SDK retry of the transaction callback.
  edit(a,'T1R1',11,200);edit(b,'T1R2',22,210);
  let once=true;env.beforeCommit=async()=>{if(once){once=false;await b.c.cloudSave();}};
  await a.c.cloudSave();env.beforeCommit=null;r=remote(env,a.c);
  assert.equal(av(r).notas.T1R1.v,11);assert.equal(av(r).notas.T1R2.v,22);
  // Edit during a slow commit, then await the original promise through both sends.
  let release,started;const paused=new Promise(resolve=>started=resolve);
  env.beforeCommit=()=>{started();return new Promise(resolve=>release=resolve);};
  edit(a,'T1R1',30,300);const first=a.c.cloudSave();await paused;
  edit(a,'T1R2',40,310);a.c.cloudSave();
  a.c.__timers.filter(t=>t.ms===15000&&!t.cancelled).forEach(t=>t.fn());
  assert.equal(a.c.__testFB.pushing,true,'watchdog não permite segundo envio concorrente');
  env.beforeCommit=null;release();await first;r=remote(env,a.c);
  assert.equal(av(r).notas.T1R1.v,30);assert.equal(av(r).notas.T1R2.v,40);assert.equal(a.c._unsavedChanges,false);
  // Reads fail closed; no cloud mutations and dirty work remains retryable.
  edit(a,'T1R1',50,400);env.offline=true;const saved=JSON.stringify(env.docs);
  await assert.rejects(a.c.cloudSave(),/sem rede/);assert.equal(JSON.stringify(env.docs),saved);assert.equal(a.c._unsavedChanges,true);
  env.offline=false;await a.c.cloudSave();assert.equal(av(remote(env,a.c)).notas.T1R1.v,50);
  // Hundreds of documents remain atomic; photos belong to the local device.
  a.state.notas_campo=Array.from({length:420},(_,i)=>({id:'N'+i,titulo:'Nota '+i,_ts:500,foto:i===0?'data:image/jpeg;base64,'+'a'.repeat(1200100):''}));
  const before=env.commits.length;await a.c.cloudSave();assert.equal(env.commits.length-before,1);assert.equal(remote(env,a.c).notas_campo[0].foto,undefined,'foto permanece local, sem virar documento Firestore');
  assert.equal(a.state.notas_campo[0].foto.length,1200123,'confirmar envio mantém a foto do aparelho');
  assertAtomicHistory(env);
  // Read-only legacy media must survive a write and must not trigger an endless no-op send.
  env.docs[root+'/media/legado']={noteId:'N0',part:0,data:'data:image/jpeg;base64,legado'};
  env.docs[root].rev++;env.docs[root].writeId='external-legacy';
  await a.c.cloudPull();const legacyBefore=clone(env.docs[root+'/media/legado']);
  edit(a,'T1R1',55,450);await a.c.cloudSave();const afterLegacy=env.commits.length;
  await a.c.cloudSave();assert.equal(env.commits.length,afterLegacy,'mídia legada não provoca loop de gravação');
  assert.deepEqual(env.docs[root+'/media/legado'],legacyBefore,'mídia antiga não é apagada, regravada nem copiada ao histórico');
  assert.ok(env.commits.every(ws=>ws.every(w=>!w.path.startsWith(root+'/media/')&&(!w.data||w.data.colecao!=='media'))));
  // Large studies use partial field updates, and their partial history reconstructs the original.
  const big=initial();big.data.Q1.estudos[0].estatisticaFinal={memo:'E'.repeat(80000)};
  big.data.Q1.estudos[0].codigo='ANTES';big.data.Q1.estudos[0]._ts=1;
  const largeEnv=database(),large=client(largeEnv.db,big);seed(largeEnv,large.c,big);await large.c.cloudPull();
  const flatBefore=large.c.AgractaFirebase.splitState(large.state);
  large.state.data.Q1.estudos[0].codigo='DEPOIS';large.state.data.Q1.estudos[0]._ts=100;
  await large.c.cloudSave();
  const studyWrite=largeEnv.commits.at(-1).find(w=>w.path.startsWith(root+'/estudos/'));
  assert.ok(studyWrite.fields,'estudo grande usa update por campos');
  assert.ok(JSON.stringify(studyWrite.fields).length<1000,'parte congelada grande não é reenviada');
  const hist=largeEnv.commits.at(-1).filter(w=>w.path.startsWith(root+'/historico/')).map(w=>w.data);
  assert.equal(hist.find(h=>h.colecao==='estudos').anterior._parcial,true);
  const restored=large.c.VersoesCore.estadoAntesDe(large.c.AgractaFirebase.splitState(large.state),hist,hist[0].rev);
  assert.deepEqual(clone(restored.flat.estudos),clone(flatBefore.estudos),'histórico parcial reconstitui o estudo anterior');
  assertAtomicHistory(largeEnv);
  // A pull that starts a slow write must release its read lock for the next pull.
  const pullEnv=database(),pa=client(pullEnv.db,initial()),pb=client(pullEnv.db,initial());seed(pullEnv,pa.c,initial());
  await pa.c.cloudPull();await pb.c.cloudPull();
  let releasePull,startedPull;const waitingPull=new Promise(resolve=>startedPull=resolve);let pauseOnce=true;
  pullEnv.beforeCommit=()=>{if(pauseOnce){pauseOnce=false;startedPull();return new Promise(resolve=>releasePull=resolve);}};
  edit(pa,'T1R1',31,500);const initialPull=pa.c.cloudPull();await withDeadline(waitingPull,'pull começa envio');
  edit(pb,'T1R2',42,510);await pb.c.cloudSave();
  await withDeadline(pa.c.cloudPull(),'segundo pull durante envio iniciado por pull');
  assert.equal(av(pa.state).notas.T1R2.v,42,'segundo pull recebe o colega enquanto envio está parado');
  pullEnv.beforeCommit=null;releasePull();await withDeadline(initialPull,'confirmação do primeiro pull');
  assert.equal(av(remote(pullEnv,pa.c)).notas.T1R1.v,31);assert.equal(av(remote(pullEnv,pa.c)).notas.T1R2.v,42);
  // A transaction write failure publishes nothing, including its root revision.
  edit(a,'T1R1',60,500);env.beforeCommit=async()=>{throw new Error('commit recusado');};const prior=JSON.stringify(env.docs);
  await assert.rejects(a.c.cloudSave(),/commit recusado/);assert.equal(JSON.stringify(env.docs),prior);assert.equal(a.c._unsavedChanges,true);
  console.log('Sincronização: conflitos, corrida, edição durante envio, falha offline, ausência de eco, histórico atômico, update parcial, mídia legada intacta e 420 notas/fotos locais OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={initial,database,client,seed,remote,av,edit,root,clone,tick,withDeadline,assertAtomicHistory};
