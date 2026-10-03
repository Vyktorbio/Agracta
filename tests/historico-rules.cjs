'use strict';
/* Regras do histórico de versões (firestore.rules → workspaces/agracta/historico).
   Roda no emulador, pelo mesmo `npm run test:regras` do CI. O que se tranca aqui:
   criar sim; editar e apagar nunca, para ninguém; hora do servidor e autor da sessão
   obrigatórios; e a regra genérica do workspace não reabrindo a porta. */
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,runTransaction,serverTimestamp,Timestamp}=require('firebase/firestore');
let writeId=0;
function workspaceCommit(db,write){
  return runTransaction(db,async tx=>{
    const root=doc(db,'workspaces/agracta'),snap=await tx.get(root),rev=snap.data().rev+1;
    write(tx,rev);
    tx.set(root,{rev,syncProtocol:3,writeId:'historico-test-'+(++writeId),updatedAt:serverTimestamp()},{merge:true});
  });
}
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
      await setDoc(doc(db,'workspaces/agracta/estudos/E1'),{id:'E1',data:{codigo:'A'}});
    });
    const reg=(email,extra)=>Object.assign({rev:2,colecao:'estudos',docId:'E1',acao:'alterar',
      anterior:{id:'E1',data:{codigo:'A'}},em:serverTimestamp(),por:email,porNome:'Técnico'},extra||{});

    /* O caminho real do app: dado, histórico e revisão na mesma transação. */
    await assertSucceeds(workspaceCommit(staff,(tx,rev)=>{
      tx.set(doc(staff,'workspaces/agracta/estudos/E1'),{id:'E1',data:{codigo:'B'}});
      tx.set(doc(staff,'workspaces/agracta/historico/h1'),reg('tecnico@example.com',{rev}));
    }));
    await assertSucceeds(getDoc(doc(staff,'workspaces/agracta/historico/h1')));
    await assertSucceeds(getDocs(collection(staff,'workspaces/agracta/historico')));

    /* Imutável: nem quem criou, nem o administrador. */
    await assertFails(updateDoc(doc(staff,'workspaces/agracta/historico/h1'),{acao:'criar'}));
    await assertFails(setDoc(doc(staff,'workspaces/agracta/historico/h1'),reg('tecnico@example.com',{rev:3})));
    await assertFails(deleteDoc(doc(staff,'workspaces/agracta/historico/h1')));
    await assertFails(updateDoc(doc(admin,'workspaces/agracta/historico/h1'),{acao:'criar'}));
    await assertFails(deleteDoc(doc(admin,'workspaces/agracta/historico/h1')));
    /* Uma revisão válida também não deixa a regra genérica contornar a imutabilidade. */
    for(const db of [staff,admin]){
      await assertFails(workspaceCommit(db,tx=>tx.update(doc(db,'workspaces/agracta/historico/h1'),{acao:'criar'})));
      await assertFails(workspaceCommit(db,tx=>tx.delete(doc(db,'workspaces/agracta/historico/h1'))));
    }

    /* Autor e hora não se forjam. */
    await assertFails(setDoc(doc(staff,'workspaces/agracta/historico/h2'),reg('outra@example.com')));
    await assertFails(setDoc(doc(staff,'workspaces/agracta/historico/h3'),reg('tecnico@example.com',{em:Timestamp.fromMillis(0)})));
    await assertFails(setDoc(doc(staff,'workspaces/agracta/historico/h4'),reg('tecnico@example.com',{acao:'inventada'})));
    await assertFails(setDoc(doc(staff,'workspaces/agracta/historico/h5'),reg('tecnico@example.com',{extra:1})));

    /* Quem não é membro não lê nem escreve. */
    await assertFails(getDoc(doc(fora,'workspaces/agracta/historico/h1')));
    await assertFails(getDoc(doc(anon,'workspaces/agracta/historico/h1')));
    await assertFails(setDoc(doc(fora,'workspaces/agracta/historico/h6'),reg('estranho@example.com')));

    /* Dados comuns exigem a revisão atômica; o membro autorizado continua gravando. */
    await assertFails(setDoc(doc(staff,'workspaces/agracta/estudos/E2'),{id:'E2'}));
    await assertSucceeds(workspaceCommit(staff,tx=>tx.set(doc(staff,'workspaces/agracta/estudos/E2'),{id:'E2'})));
    console.log('Histórico: append-only, hora do servidor, autor da sessão e isolamento OK.');
  }finally{await env.cleanup();}
})().catch(err=>{console.error(err);process.exitCode=1;});
