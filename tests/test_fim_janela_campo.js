'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {initial,database,client,seed,av,edit,tick}=require('./test_sync_envio_pendente.js');
const src=fs.readFileSync('acesso-horario.js','utf8');
const begin=src.indexOf('  function encerrar('),end=src.indexOf('  /* ---------- vigilância',begin);
const calls=[],timers=[];
const c={estado:{travado:false},esconderAviso:()=>{},Promise,
 mostrarTrava:()=>calls.push('lock'),setTimeout:(fn)=>timers.push(fn),
 cloudSave:()=>{calls.push('send');return Promise.reject(Error('janela encerrada'));},
 _avPersistNow:()=>calls.push('draft'),save:()=>calls.push('local'),
 AgractaFirebase:{flushLocal:()=>{calls.push('checkpoint');return Promise.resolve();}},
 firebase:{apps:[{}],auth:()=>({signOut:()=>calls.push('logout')})}};
c.window=c;vm.createContext(c);vm.runInContext(src.slice(begin,end),c);
(async()=>{
 c.encerrar('fim de horário');await Promise.resolve();
 assert.deepEqual(calls,['draft','local','checkpoint','send'],'captura o lançamento antes de tentar a nuvem');
 timers[0]();assert.deepEqual(calls.slice(-2),['lock','logout']);
 assert.ok(!src.includes('Seus dados foram salvos e sincronizados.'),'bloqueio não afirma um envio que não confirmou');
 const env=database(),a=client(env.db,initial());seed(env,a.c,initial());await a.c.cloudPull();
 edit(a,'T1R1',17,1000);const local=a.c.cloudSaveSoon();
 await a.c.AgractaFirebase.flushLocal();await local;
 env.beforeCommit=()=>{throw Object.assign(Error('janela encerrada'),{code:'permission-denied'});};
 await assert.rejects(a.c.cloudSave(),e=>e.code==='permission-denied');
 assert.equal(a.c._unsavedChanges,true);
 const checkpoint=await a.c.AgractaFirebase.checkpoint();
 assert.equal(av(checkpoint.state).notas.T1R1.v,17,'nota de última hora existe no IndexedDB após recusa');
 env.beforeCommit=null;const retry=a.c.__timers.find(t=>t.ms===60000&&!t.cancelled);assert.ok(retry);retry.fn();
 for(let i=0;i<10;i++)await tick();
 assert.equal(a.c._unsavedChanges,false,'retentativa automática envia ao recuperar permissão');
 assert.ok(env.commits.at(-1).some(w=>w.path.includes('/historico/')),'retomada preserva o histórico BPL');
 console.log('Última hora: rascunho capturado, cofre durável, recusa sem perda e retomada com histórico OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
