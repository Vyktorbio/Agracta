/* Dois aparelhos com app, merge e cloudApply reais: editar não perde o colega. */
'use strict';
const assert=require('node:assert/strict');
const {initial,database,client,seed,remote,av,edit,clone}=require('./test_sync_envio_pendente.js');
(async()=>{
  const env=database(),a=client(env.db,initial(),{runtime:true}),b=client(env.db,initial(),{runtime:true});
  seed(env,a.c,a.state);await a.c.cloudPull();await b.c.cloudPull();
  a.c._avEditing=true;
  const colleague=clone(av(b.state));colleague.id='A2';colleague._ts=5;
  b.state.data.Q1.estudos[0].avaliacoes.push(colleague);b.c.setUnsavedChanges(true);await b.c.cloudSave();
  await a.c.cloudPull();assert.ok(a.c._cloudPending,'leitura durante edição fica estacionada');
  assert.ok(remote(env,a.c).data.Q1.estudos[0].avaliacoes.some(x=>x.id==='A2'));
  edit(a,'T1R1',11,9);await a.c.cloudSave();
  assert.equal(av(remote(env,a.c)).notas.T1R1.v,11);
  assert.ok(remote(env,a.c).data.Q1.estudos[0].avaliacoes.some(x=>x.id==='A2'),'autosave preserva avaliação do colega');
  a.c._avEditing=false;a.c.cloudApplyPending();await a.c.cloudSave();
  assert.equal(av(a.state).notas.T1R1.v,11,'confirmação adiada não desfaz a edição salva');
  assert.ok(a.state.data.Q1.estudos[0].avaliacoes.some(x=>x.id==='A2'));
  // A restore while confirmation is delayed wins over that old confirmation.
  let release,started;const waiting=new Promise(r=>started=r);
  env.afterCommit=()=>{started();return new Promise(r=>release=r);};
  edit(a,'T1R1',12,20);const sending=a.c.cloudSave();await waiting;
  const restored=initial();restored.data.__config.restoreGeneration=Date.now();
  restored.rev=a.state.rev;restored.data.Q1.estudos[0].avaliacoes[0].notas.T1R1.v=77;
  a.c.setUnsavedChanges(false);a.c.cloudApply(restored);a.c.setUnsavedChanges(true);a.c.cloudSave();
  env.afterCommit=null;release();await sending;
  assert.equal(av(a.state).notas.T1R1.v,77,'resposta antiga não reverte restauração local');
  assert.equal(av(remote(env,a.c)).notas.T1R1.v,77,'restauração pendente segue para o servidor');
  await b.c.cloudPull();assert.equal(av(b.state).notas.T1R1.v,77,'aparelho antigo converge para restauração');
  // Concurrent root revisions are unique, while independent edits converge.
  a.state.data.Q1.cultivar='C-edit';a.state.data.Q1._ts=100;
  b.state.data.Q1.estudos[0].codigo='E1-D';b.state.data.Q1.estudos[0]._ts=110;
  a.c.setUnsavedChanges(true);b.c.setUnsavedChanges(true);
  await Promise.all([a.c.cloudSave(),b.c.cloudSave()]);await Promise.all([a.c.cloudPull(),b.c.cloudPull()]);
  assert.equal(a.state.data.Q1.estudos[0].codigo,'E1-D');assert.equal(b.state.data.Q1.cultivar,'C-edit');
  console.log('Sincronização real: edição aberta, confirmação atrasada, restauração durante envio e dois clientes concorrentes OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
