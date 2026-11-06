'use strict';
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,deleteDoc,serverTimestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'workspaces/agracta/members/campo@example.test'),{active:true});});
  const ctx=(uid,email)=>env.authenticatedContext(uid,{email,email_verified:true}).firestore();
  const admin=ctx('gestor','machadovictorchaves@gmail.com'),campo=ctx('tecnico','campo@example.test'),removido=ctx('antigo','vyktorbio@gmail.com');
  const path='workspaces/agracta/p2p_signal/peer-1';
  const payload=(email,uid)=>({peerId:'peer-1',token:'x'.repeat(48),email,uid,projectId:'demo-agracta-integracoes',expiresAt:Date.now()+480000,updatedAt:serverTimestamp()});
  await assertFails(getDoc(doc(removido,'workspaces/agracta')));
  await assertFails(setDoc(doc(removido,path),payload('vyktorbio@gmail.com','antigo')));
  await assertFails(setDoc(doc(campo,path),payload('machadovictorchaves@gmail.com','gestor')));
  await assertFails(setDoc(doc(campo,path),{...payload('campo@example.test','tecnico'),expiresAt:Date.now()-1000}));
  await assertSucceeds(setDoc(doc(campo,path),payload('campo@example.test','tecnico')));
  await assertSucceeds(getDoc(doc(admin,path)));
  await assertFails(setDoc(doc(admin,path),payload('machadovictorchaves@gmail.com','gestor')));
  await assertFails(deleteDoc(doc(removido,path)));
  await assertSucceeds(deleteDoc(doc(campo,path)));
  console.log('P2P no banco: identidade própria, expiração, acesso ativo e administrador único OK.');
 }finally{await env.cleanup();}
})().catch(e=>{console.error(e);process.exitCode=1;});
