'use strict';
/* Controle de acesso do workspace (firestore.rules → workspaces/agracta).
   Roda no emulador, pelo mesmo `npm run test:regras` do CI.

   É a evidência automática dos testes OQ-01 a OQ-04 da validação
   (docs/VALIDACAO-SISTEMA.md). O que se tranca aqui:

   - quem não é membro, quem não entrou e quem foi DESATIVADO não lê nem grava;
   - a janela de horário vale no banco, não só na tela: janela fechada recusa
     leitura e gravação; janela aberta ou desligada deixa trabalhar;
   - fora da janela a pessoa ainda lê o PRÓPRIO cadastro (é assim que o app
     explica por que travou) e nada além dele;
   - o cadastro (ativo, janela) só o administrador escreve — ninguém se
     reativa nem alarga a própria janela;
   - gravação de dado sem a revisão atômica é recusada até para membro ativo.

   A janela é testada com casos que não dependem da hora em que o CI roda:
   `dias: []` nunca abre, e todos os dias de 0 a 1440 min nunca fecha. */
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,updateDoc,runTransaction,serverTimestamp}=require('firebase/firestore');
let writeId=0;
function workspaceCommit(db,write){
  return runTransaction(db,async tx=>{
    const root=doc(db,'workspaces/agracta'),snap=await tx.get(root),rev=snap.data().rev+1;
    write(tx,rev);
    tx.set(root,{rev,syncProtocol:3,writeId:'acesso-test-'+(++writeId),updatedAt:serverTimestamp()},{merge:true});
  });
}
const SEMPRE={on:true,dias:[0,1,2,3,4,5,6],iniMin:0,fimMin:1440};
const NUNCA={on:true,dias:[],iniMin:0,fimMin:1440};
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
  try{
    await env.clearFirestore();
    const cx=(id,email)=>env.authenticatedContext(id,{email,email_verified:true}).firestore();
    const admin=cx('admin','machadovictorchaves@gmail.com'),
          ativo=cx('ativo','ativo@example.com'),
          aberta=cx('aberta','aberta@example.com'),
          desligada=cx('desligada','desligada@example.com'),
          fechada=cx('fechada','fechada@example.com'),
          inativo=cx('inativo','inativo@example.com'),
          fora=cx('fora','estranho@example.com'),
          anon=env.unauthenticatedContext().firestore();
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore(),m='workspaces/agracta/members/';
      await setDoc(doc(db,'workspaces/agracta'),{rev:1});
      await setDoc(doc(db,m+'ativo@example.com'),{active:true});
      await setDoc(doc(db,m+'aberta@example.com'),{active:true,janela:SEMPRE});
      await setDoc(doc(db,m+'desligada@example.com'),{active:true,janela:{on:false,dias:[]}});
      await setDoc(doc(db,m+'fechada@example.com'),{active:true,janela:NUNCA});
      await setDoc(doc(db,m+'inativo@example.com'),{active:false});
      await setDoc(doc(db,'workspaces/agracta/estudos/E1'),{id:'E1',data:{codigo:'A'}});
    });
    const E1='workspaces/agracta/estudos/E1';

    /* OQ-01 · Quem entra: membro ativo e administrador leem; os outros não. */
    for(const db of [admin,ativo,aberta,desligada]){
      await assertSucceeds(getDoc(doc(db,'workspaces/agracta')));
      await assertSucceeds(getDoc(doc(db,E1)));
    }
    for(const db of [fora,anon]){
      await assertFails(getDoc(doc(db,'workspaces/agracta')));
      await assertFails(getDoc(doc(db,E1)));
    }

    /* OQ-02 · Revogar é desativar: o cadastro desativado perde leitura e gravação. */
    await assertFails(getDoc(doc(inativo,E1)));
    await assertFails(getDocs(collection(inativo,'workspaces/agracta/estudos')));
    await assertFails(workspaceCommit(inativo,tx=>tx.set(doc(inativo,E1),{id:'E1',data:{codigo:'X'}})));
    await assertFails(getDocs(collection(inativo,'workspaces/agracta/historico')));
    await assertFails(getDocs(collection(inativo,'workspaces/agracta/eventos')));

    /* OQ-03 · A janela vale no banco. */
    await assertFails(getDoc(doc(fechada,E1)));
    await assertFails(workspaceCommit(fechada,tx=>tx.set(doc(fechada,E1),{id:'E1',data:{codigo:'X'}})));
    await assertSucceeds(workspaceCommit(aberta,tx=>tx.set(doc(aberta,'workspaces/agracta/estudos/E2'),{id:'E2'})));
    await assertSucceeds(workspaceCommit(desligada,tx=>tx.set(doc(desligada,'workspaces/agracta/estudos/E3'),{id:'E3'})));
    /* Fora da janela: o próprio cadastro sim, o dos outros não. */
    await assertSucceeds(getDoc(doc(fechada,'workspaces/agracta/members/fechada@example.com')));
    await assertFails(getDoc(doc(fechada,'workspaces/agracta/members/ativo@example.com')));
    /* Desativado também lê só o próprio cadastro. */
    await assertSucceeds(getDoc(doc(inativo,'workspaces/agracta/members/inativo@example.com')));
    await assertFails(getDoc(doc(inativo,'workspaces/agracta/members/ativo@example.com')));

    /* OQ-04 · O cadastro é do administrador. Ninguém se reativa nem alarga a janela. */
    await assertFails(updateDoc(doc(inativo,'workspaces/agracta/members/inativo@example.com'),{active:true}));
    await assertFails(updateDoc(doc(fechada,'workspaces/agracta/members/fechada@example.com'),{janela:SEMPRE}));
    await assertFails(updateDoc(doc(ativo,'workspaces/agracta/members/fechada@example.com'),{janela:SEMPRE}));
    await assertFails(setDoc(doc(fora,'workspaces/agracta/members/estranho@example.com'),{active:true}));
    await assertFails(setDoc(doc(ativo,'workspaces/agracta/members/novo@example.com'),{active:true}));
    /* Nem pela porta da revisão atômica. */
    await assertFails(workspaceCommit(ativo,tx=>tx.set(doc(ativo,'workspaces/agracta/members/novo@example.com'),{active:true})));
    await assertSucceeds(setDoc(doc(admin,'workspaces/agracta/members/novo@example.com'),{active:true}));
    await assertSucceeds(updateDoc(doc(admin,'workspaces/agracta/members/inativo@example.com'),{active:false,janela:NUNCA}));

    /* Gravação sem a revisão atômica é recusada até para membro ativo. */
    await assertFails(setDoc(doc(ativo,'workspaces/agracta/estudos/E4'),{id:'E4'}));
    await assertSucceeds(workspaceCommit(ativo,tx=>tx.set(doc(ativo,'workspaces/agracta/estudos/E4'),{id:'E4'})));

    /* Fora do workspace não há porta aberta. */
    await assertFails(getDoc(doc(ativo,'qualquer/coisa')));
    await assertFails(setDoc(doc(ativo,'qualquer/coisa'),{x:1}));

    console.log('Acesso: membro ativo, desativado, janela no banco e cadastro só do administrador OK.');
  }finally{await env.cleanup();}
})().catch(err=>{console.error(err);process.exitCode=1;});
