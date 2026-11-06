/* Falhas de gravação e leitura no app e adaptador completos. */
'use strict';
const assert=require('node:assert/strict');
const {initial,database,client,seed,remote,av,edit,root,tick,withDeadline}=require('./test_sync_envio_pendente.js');
async function fixture(){
 const env=database(),a=client(env.db,initial());seed(env,a.c,initial());await a.c.cloudPull();env.attempts=[];env.commits=[];
 edit(a,'T1R1',2,100);return {env,a};
}
const denied=()=>Object.assign(Error('Missing or insufficient permissions.'),{code:'permission-denied'});
(async()=>{
 let {env,a}=await fixture();
 env.beforeCommit=ops=>{if(ops.some(w=>w.path.startsWith(root+'/historico/')))throw denied();};
 await assert.rejects(a.c.cloudSave(),e=>e.code==='permission-denied');
 assert.equal(env.attempts.length,1);assert.equal(env.commits.length,0,'recusa do histórico não envia dado sem trilha');
 assert.equal(av(a.state).notas.T1R1.v,2,'registro permanece no aparelho');
 assert.equal(a.c._unsavedChanges,true);
 env.beforeCommit=null;await a.c.cloudSave();
 assert.ok(env.commits[0].some(w=>w.path.startsWith(root+'/historico/')),'retomada preserva histórico');
 ({env,a}=await fixture());let dispute=true;
 env.beforeCommit=()=>{if(dispute){dispute=false;env.docs[root].rev++;env.docs[root].writeId='colega';throw denied();}};
 await a.c.cloudSave();
 assert.equal(env.attempts.length,2,'revisão concorrente comprovada refaz a gravação');
 assert.ok(env.commits[0].some(w=>w.path.startsWith(root+'/historico/')),'disputa não remove histórico');
 ({env,a}=await fixture());env.beforeCommit=()=>{throw denied();};
 await assert.rejects(a.c.cloudSave(),e=>e.code==='permission-denied');
 assert.equal(env.attempts.length,1,'permissão negada não tenta contornar o histórico');
 assert.equal(env.commits.length,0);
 assert.ok(a.badges.some(b=>/não subiu \(permission-denied\)/.test(b)));
 ({env,a}=await fixture());env.beforeCommit=()=>{throw Object.assign(Error('offline'),{code:'unavailable'});};
 await assert.rejects(a.c.cloudSave(),e=>e.code==='unavailable');
 assert.equal(env.attempts.length,1);assert.ok(a.badges.some(b=>/não subiu \(unavailable\).*toque para tentar de novo/.test(b)));
 const retry=a.c.__timers.find(t=>t.ms===60000&&!t.cancelled);assert.ok(retry);
 env.beforeCommit=null;retry.fn();await tick();
 assert.equal(env.commits.length,1,'retoma envio sem toque após recuperar conexão');
 // A read can time out safely, before a transaction is sent to the SDK.
 ({env,a}=await fixture());env.beforeRead=()=>new Promise(()=>{});
 const blocked=a.c.cloudSave();await tick();
 const timeout=a.c.__timers.filter(t=>t.ms===12000&&!t.cancelled).at(-1);assert.ok(timeout);
 timeout.fn();await assert.rejects(withDeadline(blocked,'leitura com prazo'),e=>e.code==='deadline-exceeded');
 assert.equal(a.c.__testFB.pushing,false);assert.equal(a.c._unsavedChanges,true);
 assert.equal(env.attempts.length,0,'sem leitura confirmada não publica transação');
 assert.ok(a.badges.some(b=>/deadline-exceeded/.test(b)));
 assert.ok(a.c.__timers.some(t=>t.ms===60000&&!t.cancelled));
 env.beforeRead=null;await a.c.cloudSave();assert.equal(av(remote(env,a.c)).notas.T1R1.v,2);
 console.log('Sincronização visível: preservação do histórico, motivo da falha, retry e leitura com prazo OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
