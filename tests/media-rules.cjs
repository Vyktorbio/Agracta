'use strict';
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,runTransaction}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  const root='workspaces/agracta',media=root+'/media/legado';
  await env.withSecurityRulesDisabled(async ctx=>{const d=ctx.firestore();await setDoc(doc(d,root),{rev:1,writeId:'seed'});await setDoc(doc(d,media),{data:'foto-legada'});await setDoc(doc(d,root+'/members/campo@example.test'),{active:true});});
  const admin=env.authenticatedContext('admin',{email:'machadovictorchaves@gmail.com'}).firestore(),staff=env.authenticatedContext('staff',{email:'campo@example.test'}).firestore();
  let seq=0;
  const commit=(db,remove)=>runTransaction(db,async tx=>{const ref=doc(db,root),snap=await tx.get(ref);if(remove)tx.delete(doc(db,media));else tx.set(doc(db,media),{data:'sobrescrita'});tx.set(ref,{rev:snap.data().rev+1,writeId:'media-test-'+(++seq),syncProtocol:3},{merge:true});});
  await assertFails(commit(staff,false));await assertFails(commit(admin,false));await assertFails(commit(staff,true));await assertSucceeds(commit(admin,true));
  console.log('Mídia legada: sem sobrescrita, sem exclusão pelo técnico e limpeza administrativa atômica OK.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
