'use strict';
const assert=require('node:assert/strict');
const {database,client,seed,initial,tick}=require('./test_sync_envio_pendente.js');
const M=require('../vendor/mascara-core.js');
(async()=>{
 const st=initial(),s=st.data.Q1.estudos[0];
 s.tratamentos=[{id:'T1',nome:'T1',dose:'1'}];s.numRepeticoes=2;s.numAplicacoes=1;
 s.avaliacoes[0].notas={};
 const env=database(),a=client(env.db,st,{runtime:true}),b=client(env.db,st,{runtime:true});
 for(const t of [a,b]){t.c.MascaraCore=M;t.c.AvaliacaoCore=require('../vendor/avaliacao-core.js');t.c.render=()=>{};t.c.enforceAccess=()=>{};}
 seed(env,a.c,st);await a.c.cloudPull();await b.c.cloudPull();
 const cor=t=>t.c._mascaraEstilo('Q1',false).cor;
 assert.equal(cor(a),M.CORES.pendente.cor);assert.equal(cor(b),cor(a));
 const current=a.state;current.data.Q1.estudos[0].aplicacoes=[{id:'AP1',data:'2026-11-06',_ts:100}];a.state=current;a.c.setUnsavedChanges(true);
 await a.c.cloudSave();b.c.cloudSubscribe();
 const recorded=a.state;recorded.data.Q1.estudos[0].avaliacoes[0].notas={T1R1:{v:1},T1R2:{v:2}};
 recorded.data.Q1.estudos[0].avaliacoes[0].notasMeta={T1R1:{v:{ts:200}},T1R2:{v:{ts:200}}};
 a.state=recorded;a.c.setUnsavedChanges(true);await a.c.cloudSave();
 for(let i=0;i<5;i++){for(const t of b.c.__timers.splice(0))if(!t.cancelled&&t.ms<=250)t.fn();await tick();}
 assert.equal(cor(a),M.CORES.avaliada.cor,'coleta completa não significa estudo finalizado');
 assert.equal(cor(b),cor(a),'registro do técnico muda a cor do gestor sem comando de sincronização');
 assert.equal(M.estadoAndamento({temEstudo:false,temFinalizado:true}),'finalizada');
 console.log('Mapa: registro real de aplicações e avaliações, cores iguais em dois clientes e recebimento automático OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
