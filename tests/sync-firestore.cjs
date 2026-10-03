/* Integração do adaptador de produção com o emulador e as regras reais. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
if(!process.env.FIRESTORE_EMULATOR_HOST)throw Error('Este teste exige emulador; nunca usa a nuvem real.');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const firebase=require('firebase/compat/app');require('firebase/compat/firestore');
const {initial,client,av,edit}=require('../test_sync_envio_pendente.js');
const ROOT='workspaces/agracta';
// O app vive num realm VM; o SDK Node exige objetos simples do realm dele.
function native(v){
 if(v instanceof firebase.firestore.FieldValue||v instanceof firebase.firestore.FieldPath)return v;
 if(Array.isArray(v))return v.map(native);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,native(x)]));
 return v;
}
function adapt(db){return {doc:p=>db.doc(p),runTransaction:fn=>db.runTransaction(tx=>fn({
 get:r=>tx.get(r),delete:r=>tx.delete(r),set:(r,d,o)=>o?tx.set(r,native(d),native(o)):tx.set(r,native(d)),
 update:(r,...args)=>tx.update(r,...args.map(native))
}))};}
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const adminDb=env.authenticatedContext('admin',{email:'machadovictorchaves@gmail.com'}).firestore();
  const staffDb=env.authenticatedContext('staff',{email:'tecnico@example.test'}).firestore();
  await adminDb.doc(ROOT+'/members/tecnico@example.test').set({active:true});
  const a=client(adapt(adminDb),initial()),b=client(adapt(staffDb),initial());
  for(const c of [a,b])c.c.firebase={firestore:{FieldValue:firebase.firestore.FieldValue,FieldPath:firebase.firestore.FieldPath}};
  a.c.__testFB.user.email='machadovictorchaves@gmail.com';
  await a.c.cloudSave();await b.c.cloudPull();
  edit(a,'T1R1',7,100);edit(b,'T1R1',9,50);edit(b,'T1R2',8,110);
  await Promise.all([a.c.cloudSave(),b.c.cloudSave()]);
  await a.c.cloudPull();await b.c.cloudPull();
  assert.equal(av(a.state).notas.T1R1.v,7);assert.equal(av(b.state).notas.T1R2.v,8);
  const rev=(await adminDb.doc(ROOT).get()).data().rev;
  await assertFails(staffDb.doc(ROOT+'/quadras/legado').set({id:'legado'}));
  await assertFails(staffDb.doc(ROOT).set({rev:rev+1,updatedBy:'legado'},{merge:true}));
  assert.equal((await adminDb.doc(ROOT).get()).data().rev,rev,'cliente antigo não publica sem token novo');
  await Promise.all([a.c.cloudSave(),b.c.cloudSave()]);
  assert.equal((await adminDb.doc(ROOT).get()).data().rev,rev,'não publica revisão sem alteração');
  const historyBefore=await adminDb.collection(ROOT+'/historico').get();
  assert.ok(historyBefore.size>0,'adaptador real escreve o histórico com regras reais');
  // Media written by old versions stays read-only during normal synchronization.
  const legacy={noteId:'legacy-orphan',part:0,data:'data:image/jpeg;base64,antiga'};
  await env.withSecurityRulesDisabled(async ctx=>{
   await ctx.firestore().doc(ROOT+'/media/legacy').set(legacy);
   await ctx.firestore().doc(ROOT).set({rev:rev+1,writeId:'legacy-import'},{merge:true});
  });
  a.state.notas_campo=Array.from({length:510},(_,i)=>({id:'N'+i,titulo:'Nota fictícia '+i,_ts:500,foto:i===0?'data:image/jpeg;base64,'+'z'.repeat(1200100):''}));
  const localPhoto=a.state.notas_campo[0].foto;
  await a.c.cloudSave();await b.c.cloudPull();
  assert.equal(b.state.notas_campo.length,510);assert.equal(b.state.notas_campo[0].foto,undefined,'foto nova não sobe ao Firestore');
  assert.equal(a.state.notas_campo[0].foto,localPhoto,'confirmar envio preserva foto no aparelho');
  assert.deepEqual((await adminDb.doc(ROOT+'/media/legacy').get()).data(),legacy);
  const largeRev=(await adminDb.doc(ROOT).get()).data().rev;
  const historyLarge=await adminDb.collection(ROOT+'/historico').where('rev','==',largeRev).get();
  assert.equal(historyLarge.docs.filter(d=>d.data().colecao==='notas_campo').length,510,'510 notas e seus 510 históricos têm a mesma revisão atômica');
  assert.ok(historyLarge.docs.every(d=>d.data().colecao!=='media'),'foto legada não cria histórico novo');
  await a.c.cloudSave();assert.equal((await adminDb.doc(ROOT).get()).data().rev,largeRev,'mídia legada não causa envio sem mudanças');
  a.state.data.Q1.estudos[0].estatisticaFinal={memo:'E'.repeat(80000)};
  a.state.data.Q1.estudos[0].codigo='ANTES';a.state.data.Q1.estudos[0]._ts=600;await a.c.cloudSave();
  a.state.data.Q1.estudos[0].codigo='DEPOIS';a.state.data.Q1.estudos[0]._ts=700;await a.c.cloudSave();
  const partialRev=(await adminDb.doc(ROOT).get()).data().rev;
  const partialHistory=await adminDb.collection(ROOT+'/historico').where('rev','==',partialRev).get();
  assert.equal(partialHistory.docs.find(d=>d.data().colecao==='estudos').data().anterior._parcial,true,'update real e histórico parcial aceitos pelas regras');
  await b.c.cloudPull();assert.equal(b.state.data.Q1.estudos[0].codigo,'DEPOIS');
  assert.equal(b.state.data.Q1.estudos[0].estatisticaFinal.memo.length,80000,'campo não alterado sobrevive ao update');
  // Restoration generation survives a stale client reconnecting with tombstones.
  a.state.data.__config.restoreGeneration=1000;
  delete a.state.data.Q1;
  await a.c.cloudSave();await b.c.cloudPull();assert.equal(b.state.data.Q1,undefined);
  const denied=client(adapt(env.authenticatedContext('denied',{email:'sem-acesso@example.test'}).firestore()),initial());
  denied.c.firebase={firestore:{FieldValue:firebase.firestore.FieldValue}};
  await assert.rejects(denied.c.cloudSave(),e=>e.code==='permission-denied');
  console.log('Firestore real emulado: concorrência, histórico atômico de 510 notas, foto local, mídia legada intacta, update parcial, restauração e acesso negado OK.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
