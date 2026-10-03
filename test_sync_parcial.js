/* Gravação parcial pelo adaptador completo, incluindo fallback e histórico. */
'use strict';
const assert=require('node:assert/strict');
const {initial,database,client,seed,remote,root,clone}=require('./test_sync_envio_pendente.js');
const V=require('./vendor/versoes-core.js');
async function fixture(){
  const state=initial(),s=state.data.Q1.estudos[0];
  s.codigo='ANTES';s._ts=1;s.estatisticaFinal={memo:'E'.repeat(100000)};
  const env=database(),a=client(env.db,state);seed(env,a.c,state);await a.c.cloudPull();env.commits=[];env.attempts=[];
  return {env,a};
}
(async()=>{
  let {env,a}=await fixture();const before=a.c.AgractaFirebase.splitState(a.state);
  a.state.data.Q1.estudos[0].codigo='DEPOIS';a.state.data.Q1.estudos[0]._ts=100;
  await a.c.cloudSave();
  const writes=env.commits[0],study=writes.find(w=>w.path.startsWith(root+'/estudos/'));
  assert.ok(study.fields,'estudo grande usa update por campos');
  assert.ok(JSON.stringify(study.fields).length<1000,'estatística congelada não é reenviada');
  const hist=writes.filter(w=>w.path.startsWith(root+'/historico/')).map(w=>w.data);
  assert.equal(hist.find(h=>h.colecao==='estudos').anterior._parcial,true);
  const after=a.c.AgractaFirebase.splitState(remote(env,a.c));
  assert.deepEqual(clone(V.estadoAntesDe(after,hist,hist[0].rev).flat.estudos),clone(before.estudos),'histórico parcial restaura o anterior completo');
  assert.equal(remote(env,a.c).data.Q1.estudos[0].codigo,'DEPOIS');
  ({env,a}=await fixture());
  a.state.data.Q1.estudos[0].codigo='FALLBACK';a.state.data.Q1.estudos[0]._ts=200;
  env.beforeCommit=ops=>{if(ops.some(w=>w.fields))throw Object.assign(Error('update recusado'),{code:'not-found'});};
  await a.c.cloudSave();
  assert.equal(env.attempts.length,2,'update recusado tenta documento inteiro uma vez');
  assert.equal(env.commits.length,1,'tentativa recusada não publica dado, histórico nem revisão');
  assert.ok(!env.commits[0].some(w=>w.fields),'fallback usa set inteiro');
  assert.equal(a.c.__testFB.semParcial.codigo,'not-found');
  assert.equal(remote(env,a.c).data.Q1.estudos[0].codigo,'FALLBACK');
  assert.equal(a.c._unsavedChanges,false);
  console.log('Sync parcial: update econômico, histórico restaurável e fallback atômico OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
