'use strict';
/* Regras dos eventos formais (firestore.rules → workspaces/agracta/eventos).
   Roda no emulador, pelo `npm run test:regras`. O que se tranca aqui: criar sim;
   editar e apagar nunca, para ninguém; id = SHA-256 do conteúdo conferido pelo
   servidor; quem enviou e quando chegou vêm da sessão e do relógio do servidor;
   e a regra genérica do workspace não reabrindo a porta. */
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,serverTimestamp,Timestamp}=require('firebase/firestore');
const E=require('../vendor/eventos-core');
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
  try{
    await env.clearFirestore();
    const cx=(id,email)=>env.authenticatedContext(id,{email,email_verified:true}).firestore();
    const admin=cx('admin','machadovictorchaves@gmail.com'),staff=cx('staff','tecnico@example.com'),
          fora=cx('fora','estranho@example.com'),anon=env.unauthenticatedContext().firestore();
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await setDoc(doc(db,'workspaces/agracta'),{rev:1});
      await setDoc(doc(db,'workspaces/agracta/members/tecnico@example.com'),{active:true});
    });
    /* Um evento de verdade, montado pelo mesmo motor que o app usa. */
    const ev=E.criar('estudo.reaberto',{entidade:{tipo:'estudo',id:'kEst'},motivo:'nota trocada',rubrica:'reautenticacao-senha'},
      {autor:{email:'tecnico@example.com',nome:'Técnico'},em:'2026-09-24T10:00:00.000Z'}).evento;
    const json=E.serializar(ev);   /* o evento sem o id: é isso que o hash cobre */
    const docu=(email,extra)=>Object.assign({schema:1,estudo:'kEst',tipo:ev.tipo,json,enviadoPor:email,recebidoEm:serverTimestamp()},extra||{});
    const ref=db=>doc(db,'workspaces/agracta/eventos/'+ev.id);

    /* O cálculo do app e o do servidor precisam dar o mesmo id. */
    await assertSucceeds(setDoc(ref(staff),docu('tecnico@example.com')));
    await assertSucceeds(getDoc(ref(staff)));
    await assertSucceeds(getDocs(collection(staff,'workspaces/agracta/eventos')));

    /* Imutável: nem quem criou, nem o administrador. Reenviar igual também não. */
    await assertFails(updateDoc(ref(staff),{tipo:'estudo.finalizado'}));
    await assertFails(setDoc(ref(staff),docu('tecnico@example.com')));
    await assertFails(deleteDoc(ref(staff)));
    await assertFails(updateDoc(ref(admin),{tipo:'estudo.finalizado'}));
    await assertFails(deleteDoc(ref(admin)));

    /* O id tem que ser o hash do conteúdo. */
    const outro=json.replace('nota trocada','outro motivo');
    await assertFails(setDoc(doc(staff,'workspaces/agracta/eventos/'+ev.id.replace(/.$/,'0')),docu('tecnico@example.com')));
    await assertFails(setDoc(doc(staff,'workspaces/agracta/eventos/ev:'+E.sha256(json).toUpperCase()),docu('tecnico@example.com')));
    await assertSucceeds(setDoc(doc(staff,'workspaces/agracta/eventos/ev:'+E.sha256(outro)),docu('tecnico@example.com',{json:outro})));

    /* Quem enviou e quando chegou não se forjam; campo extra não entra. */
    const j2=json.replace('10:00','11:00'),id2='workspaces/agracta/eventos/ev:'+E.sha256(j2);
    await assertFails(setDoc(doc(staff,id2),docu('outra@example.com',{json:j2})));
    await assertFails(setDoc(doc(staff,id2),docu('tecnico@example.com',{json:j2,recebidoEm:Timestamp.fromMillis(0)})));
    await assertFails(setDoc(doc(staff,id2),docu('tecnico@example.com',{json:j2,extra:1})));
    await assertFails(setDoc(doc(staff,id2),docu('tecnico@example.com',{json:j2,schema:2})));

    /* Quem não é membro não lê nem escreve. */
    await assertFails(getDoc(ref(fora)));
    await assertFails(getDoc(ref(anon)));
    await assertFails(setDoc(doc(fora,id2),docu('estranho@example.com',{json:j2})));

    /* E o resto do workspace continua como era. */
    await assertSucceeds(setDoc(doc(staff,'workspaces/agracta/estudos/E2'),{id:'E2'}));
    console.log('Eventos: append-only, id conferido pelo servidor, remetente e hora do servidor e isolamento OK.');
  }finally{await env.cleanup();}
})().catch(err=>{console.error(err);process.exitCode=1;});
