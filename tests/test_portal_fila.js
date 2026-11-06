'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers={},pending=[],timers=[];let reads=0,messages=0;
const c={navigator:{onLine:true},setTimeout:fn=>{const t={fn};timers.push(t);return t;},clearTimeout:t=>{t.cancelled=true;},console:{warn:()=>{}},Promise,Date,URL,location:{href:'https://agracta.test'},
 ConhecimentoCore:{},PortalCore:{},agConhecimento:{msg:()=>messages++},
 firebase:{apps:[{}],auth:()=>({currentUser:{email:'campo@example.test'}}),firestore:()=>({collection:()=>({where:()=>({get:()=>{reads++;return new Promise((resolve,reject)=>pending.push({resolve,reject}));}})})})},
 addEventListener:(k,f)=>handlers[k]=f};
c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('integracoes-clientes.js','utf8'),c);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
(async()=>{
 const emit=rev=>handlers['agracta:sincronizado']({detail:{rev,state:{data:{}}}});
 emit(1);for(let i=2;i<=1001;i++)emit(i);
 assert.equal(reads,1,'uma operação em andamento, não mil promessas retendo estados');
 pending[0].reject(Object.assign(Error('recusado'),{code:'permission-denied'}));await flush();
 assert.equal(messages,0,'falha automática não mostra aviso que cobre menus');
 assert.equal(reads,1,'falha agenda uma única retentativa sem martelar o servidor');
 assert.equal(c.AgractaClientes.status().pendente,true);
 assert.equal(timers.length,1);handlers.online();await flush();
 assert.equal(reads,2,'voltar à rede processa somente o estado mais recente');
 pending[1].resolve({forEach:()=>{}});await flush();
 assert.equal(c.AgractaClientes.status().atualizando,false);
 assert.equal(c.AgractaClientes.status().ultimaFalha,null);
 emit(2);assert.equal(reads,2,'evento antigo não refaz a consulta');
 emit(1002);pending[2].reject(Error('rede'));await flush();
 timers.at(-1).fn();await flush();assert.equal(reads,4,'a retentativa por tempo também é automática');
 pending[3].resolve({forEach:()=>{}});await flush();
 console.log('Patrocinadores: mil salvamentos agrupados em duas operações, sem aviso sobre o campo e sem fila de snapshots OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
