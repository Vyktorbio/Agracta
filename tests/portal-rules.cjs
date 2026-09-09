'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,writeBatch}=require('firebase/firestore');
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
  try{
    await env.clearFirestore();
    const cx=(id,email,verified=true)=>env.authenticatedContext(id,{email,email_verified:verified}).firestore();
    const admin=cx('admin','machadovictorchaves@gmail.com'),staff=cx('staff','tecnico@example.com'),a=cx('a','cliente-a@example.com'),b=cx('b','cliente-b@example.com'),unverified=cx('u','cliente-a@example.com',false),anon=env.unauthenticatedContext().firestore();
    const cfg={nome:'Consulta A',active:true,auto:true,studies:['r1'],schema:1,accessVersion:'v1'};
    const report={schema:1,codigo:'Ensaio A',resultados:[],tratamentos:[],sourceRev:1};
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();await setDoc(doc(db,'workspaces/agracta'),{secret:'workspace'});
      await setDoc(doc(db,'workspaces/agracta/members/tecnico@example.com'),{active:true});
      await setDoc(doc(db,'clientPortals/b'),{...cfg,nome:'Consulta B'});
      await setDoc(doc(db,'clientPortals/b/members/cliente-b@example.com'),{active:true,accessVersion:'v1'});
      await setDoc(doc(db,'clientPortals/b/reports/r1'),{...report,codigo:'Ensaio B'});
    });
    const batch=writeBatch(admin);batch.set(doc(admin,'clientPortals/a'),cfg);batch.set(doc(admin,'clientPortals/a/members/cliente-a@example.com'),{active:true,accessVersion:'v1'});batch.set(doc(admin,'clientPortals/a/reports/r1'),report);await assertSucceeds(batch.commit());
    await assertSucceeds(getDoc(doc(a,'clientPortals/a')));assert.equal((await assertSucceeds(getDoc(doc(a,'clientPortals/a/reports/r1')))).data().codigo,'Ensaio A');
    for(const denied of [b,anon,unverified])await assertFails(getDoc(doc(denied,'clientPortals/a/reports/r1')));
    await assertFails(getDoc(doc(a,'workspaces/agracta')));await assertFails(getDoc(doc(a,'clientPortals/b')));await assertFails(getDoc(doc(a,'clientPortals/b/reports/r1')));
    await assertFails(getDocs(collection(a,'clientPortals')));await assertFails(getDocs(collection(a,'clientPortals/a/members')));await assertFails(getDocs(collection(a,'clientPortals/a/reports')));
    await assertFails(setDoc(doc(a,'clientPortals/a/reports/r1'),report));await assertFails(setDoc(doc(a,'workspaces/agracta/members/cliente-a@example.com'),{active:true}));
    await assertSucceeds(setDoc(doc(staff,'clientPortals/a/reports/r1'),{...report,sourceRev:2}));
    await assertFails(setDoc(doc(staff,'clientPortals/a/reports/outro'),report));await assertFails(updateDoc(doc(staff,'clientPortals/a'),{studies:['r1','outro']}));
    await assertFails(setDoc(doc(staff,'clientPortals/a/members/cliente-b@example.com'),{active:true,accessVersion:'v1'}));
    await assertFails(setDoc(doc(staff,'clientPortals/a/reports/r1'),{...report,custos:{total:9}}));
    await assertSucceeds(updateDoc(doc(admin,'clientPortals/a'),{studies:[]}));await assertFails(getDoc(doc(a,'clientPortals/a/reports/r1')));
    await updateDoc(doc(admin,'clientPortals/a'),{studies:['r1'],accessVersion:'v2'});await assertFails(getDoc(doc(a,'clientPortals/a/reports/r1')));
    await setDoc(doc(admin,'clientPortals/a/members/cliente-a@example.com'),{active:true,accessVersion:'v2'});await assertSucceeds(getDoc(doc(a,'clientPortals/a/reports/r1')));
    await updateDoc(doc(admin,'clientPortals/a'),{active:false});await assertFails(getDoc(doc(a,'clientPortals/a/reports/r1')));await assertFails(setDoc(doc(staff,'clientPortals/a/reports/r1'),report));
    await assertSucceeds(getDoc(doc(b,'clientPortals/b/reports/r1')));await assertSucceeds(getDoc(doc(staff,'workspaces/agracta')));
    console.log('Portal: isolamento entre clientes, workspace fechado, verificação, seleção, revogação e escrita autorizada OK.');
  }finally{await env.cleanup();}
})().catch(err=>{console.error(err);process.exitCode=1;});
