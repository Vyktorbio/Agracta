'use strict';
/* Papéis no banco (firestore.rules → pode(), transicaoDoEstudoPermitida(),
   politica/papeis). Roda no emulador, pelo `npm run test:regras` do CI.

   O que se tranca aqui — com a tabela padrão e depois com uma gravada:
   - finalizar pede diretor; reabrir pede supervisor;
   - aprovar protocolo e emendar (versão muda) pedem diretor;
   - excluir estudo, aplicação ou avaliação pede supervisor;
   - gravar um estudo finalizado SEM mexer na finalização não é finalizar;
   - cadastro sem papel é técnico;
   - criar um estudo já finalizado é finalizar;
   - a gravação parcial (update de um campo), que o app usa em documento
     grande, passa pela mesma conferência;
   - a tabela só o administrador grava, com forma fechada, e vale na hora;
   - o papel do cadastro só o administrador muda, e só para um papel que existe. */
const fs=require('node:fs');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,deleteDoc,updateDoc,runTransaction,serverTimestamp,deleteField}=require('firebase/firestore');
let writeId=0;
function commit(db,write){
  return runTransaction(db,async tx=>{
    const root=doc(db,'workspaces/agracta'),snap=await tx.get(root),rev=snap.data().rev+1;
    write(tx);
    tx.set(root,{rev,syncProtocol:3,writeId:'papeis-test-'+(++writeId),updatedAt:serverTimestamp()},{merge:true});
  });
}
const W='workspaces/agracta/';
const estudo=(id,extra)=>({id,quadraId:'Q1',order:0,data:Object.assign({id,codigo:id,tratamentos:{_agractaArray:true,_agractaLength:0,_agractaItems:{}}},extra||{})});
const FIN={em:'2026-10-16T10:00:00.000Z',por:'dir@example.com',nome:'Diretora',rubrica:'sha256:abc'};
const PV=v=>({status:'aprovado',versao:v,aprovadoEm:'2026-10-16T10:00:00.000Z',aprovadoPor:'dir@example.com'});
(async()=>{
  const env=await initializeTestEnvironment({projectId:'demo-agracta-integracoes',firestore:{host:'127.0.0.1',port:8088,rules:fs.readFileSync('firestore.rules','utf8')}});
  try{
    await env.clearFirestore();
    const cx=(id,email)=>env.authenticatedContext(id,{email,email_verified:true}).firestore();
    const admin=cx('admin','machadovictorchaves@gmail.com'),
          tec=cx('tec','tec@example.com'),sem=cx('sem','sem@example.com'),
          sup=cx('sup','sup@example.com'),dir=cx('dir','dir@example.com');
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.firestore();
      await setDoc(doc(db,'workspaces/agracta'),{rev:1});
      await setDoc(doc(db,W+'members/tec@example.com'),{active:true,papel:'tecnico'});
      await setDoc(doc(db,W+'members/sem@example.com'),{active:true});
      await setDoc(doc(db,W+'members/sup@example.com'),{active:true,papel:'supervisor'});
      await setDoc(doc(db,W+'members/dir@example.com'),{active:true,papel:'diretor'});
      for(const id of ['E1','E2','E3','E4','E5'])await setDoc(doc(db,W+'estudos/'+id),estudo(id));
      await setDoc(doc(db,W+'avaliacoes/E1|A1'),{key:'E1|A1',id:'A1',estudoId:'E1',order:0,data:{id:'A1'},notas:{},notasMeta:{}});
      await setDoc(doc(db,W+'aplicacoes/P1'),{id:'P1',estudoId:'E1',order:0,data:{id:'P1'}});
      await setDoc(doc(db,W+'notas_campo/N1'),{id:'N1',order:0,data:{id:'N1'}});
    });
    const ref=(db,p)=>doc(db,W+p);

    /* Editar um estudo aberto: qualquer membro, como sempre. */
    await assertSucceeds(commit(tec,tx=>tx.set(ref(tec,'estudos/E1'),estudo('E1',{cultura:'Soja'}))));

    /* Finalizar: só diretor. */
    for(const db of [tec,sem,sup])await assertFails(commit(db,tx=>tx.set(ref(db,'estudos/E1'),estudo('E1',{finalizacao:FIN}))));
    await assertSucceeds(commit(dir,tx=>tx.set(ref(dir,'estudos/E1'),estudo('E1',{finalizacao:FIN}))));

    /* Gravar o estudo finalizado sem mexer na finalização não é finalizar de novo. */
    await assertSucceeds(commit(tec,tx=>tx.set(ref(tec,'estudos/E1'),estudo('E1',{finalizacao:FIN,audit:{_agractaArray:true,_agractaLength:0,_agractaItems:{}}}))));

    /* Reabrir: supervisor ou acima — inclusive pela gravação parcial de um campo. */
    await assertFails(commit(tec,tx=>tx.set(ref(tec,'estudos/E1'),estudo('E1'))));
    await assertFails(commit(tec,tx=>tx.update(ref(tec,'estudos/E1'),'data.finalizacao',deleteField())));
    await assertSucceeds(commit(sup,tx=>tx.update(ref(sup,'estudos/E1'),'data.finalizacao',deleteField())));
    /* Finalizar pela gravação parcial também é conferido. */
    await assertFails(commit(sup,tx=>tx.update(ref(sup,'estudos/E1'),'data.finalizacao',FIN)));

    /* Criar um estudo já finalizado é finalizar. */
    await assertFails(commit(tec,tx=>tx.set(ref(tec,'estudos/NOVO'),estudo('NOVO',{finalizacao:FIN}))));
    await assertSucceeds(commit(tec,tx=>tx.set(ref(tec,'estudos/NOVO'),estudo('NOVO'))));

    /* Aprovar protocolo: diretor. Emendar (versão muda): diretor. */
    await assertFails(commit(sup,tx=>tx.set(ref(sup,'estudos/E2'),estudo('E2',{protocoloVivo:PV(1)}))));
    await assertSucceeds(commit(dir,tx=>tx.set(ref(dir,'estudos/E2'),estudo('E2',{protocoloVivo:PV(1)}))));
    await assertSucceeds(commit(tec,tx=>tx.set(ref(tec,'estudos/E2'),estudo('E2',{protocoloVivo:PV(1),cultura:'Milho'}))));
    await assertFails(commit(sup,tx=>tx.set(ref(sup,'estudos/E2'),estudo('E2',{protocoloVivo:PV(2)}))));
    await assertSucceeds(commit(dir,tx=>tx.set(ref(dir,'estudos/E2'),estudo('E2',{protocoloVivo:PV(2)}))));
    /* Desfazer a aprovação (só uma restauração faz isso) pede quem aprova. */
    await assertFails(commit(sup,tx=>tx.set(ref(sup,'estudos/E2'),estudo('E2'))));

    /* Excluir: supervisor ou acima. Nota de campo não é registro do estudo. */
    await assertFails(commit(tec,tx=>tx.delete(ref(tec,'avaliacoes/E1|A1'))));
    await assertFails(commit(tec,tx=>tx.delete(ref(tec,'aplicacoes/P1'))));
    await assertFails(commit(tec,tx=>tx.delete(ref(tec,'estudos/E3'))));
    await assertSucceeds(commit(tec,tx=>tx.delete(ref(tec,'notas_campo/N1'))));
    await assertSucceeds(commit(sup,tx=>tx.delete(ref(sup,'avaliacoes/E1|A1'))));
    await assertSucceeds(commit(sup,tx=>tx.delete(ref(sup,'estudos/E3'))));

    /* O administrador das regras pode tudo, mesmo sem cadastro. */
    await assertSucceeds(commit(admin,tx=>tx.set(ref(admin,'estudos/E4'),estudo('E4',{finalizacao:FIN}))));

    /* A tabela: só o administrador grava, com forma fechada. */
    const minimo={corrigir:'supervisor',reabrir:'supervisor',excluir:'supervisor',restaurar:'supervisor',aprovar:'diretor',emendar:'diretor',finalizar:'supervisor'};
    const pol=(email,extra)=>Object.assign({schema:1,minimo,corrigirPropria:true,atualizadoEm:serverTimestamp(),atualizadoPor:email},extra||{});
    await assertFails(setDoc(ref(dir,'politica/papeis'),pol('dir@example.com')));
    await assertFails(setDoc(ref(admin,'politica/papeis'),pol('machadovictorchaves@gmail.com',{minimo:Object.assign({},minimo,{finalizar:'admin'})})));
    await assertFails(setDoc(ref(admin,'politica/papeis'),pol('machadovictorchaves@gmail.com',{minimo:Object.assign({},minimo,{inventada:'tecnico'})})));
    await assertFails(setDoc(ref(admin,'politica/papeis'),pol('outro@example.com')));
    await assertFails(setDoc(ref(admin,'politica/outra'),pol('machadovictorchaves@gmail.com')));
    /* Nem pela porta da revisão atômica. */
    await assertFails(commit(dir,tx=>tx.set(ref(dir,'politica/papeis'),pol('dir@example.com'))));
    await assertSucceeds(setDoc(ref(admin,'politica/papeis'),pol('machadovictorchaves@gmail.com')));
    await assertSucceeds(getDoc(ref(tec,'politica/papeis')));

    /* A tabela gravada vale na hora: agora supervisor finaliza; técnico continua sem. */
    await assertFails(commit(tec,tx=>tx.set(ref(tec,'estudos/E5'),estudo('E5',{finalizacao:FIN}))));
    await assertSucceeds(commit(sup,tx=>tx.set(ref(sup,'estudos/E5'),estudo('E5',{finalizacao:FIN}))));

    /* Papel do cadastro: só o administrador muda, e só para um papel que existe. */
    await assertFails(updateDoc(ref(tec,'members/tec@example.com'),{papel:'diretor'}));
    await assertFails(updateDoc(ref(dir,'members/tec@example.com'),{papel:'supervisor'}));
    await assertFails(updateDoc(ref(admin,'members/tec@example.com'),{papel:'chefe'}));
    await assertSucceeds(updateDoc(ref(admin,'members/tec@example.com'),{papel:'supervisor'}));
    await assertSucceeds(setDoc(ref(admin,'members/novo@example.com'),{active:true,email:'novo@example.com'}));
    await assertSucceeds(deleteDoc(ref(admin,'members/novo@example.com')));
    /* Promovido, o técnico reabre na hora. */
    await assertSucceeds(commit(tec,tx=>tx.update(ref(tec,'estudos/E5'),'data.finalizacao',deleteField())));

    console.log('Papéis: finalizar, reabrir, aprovar, emendar e excluir conferidos pelo banco; tabela só do administrador OK.');
  }finally{await env.cleanup();}
})().catch(err=>{console.error(err);process.exitCode=1;});
