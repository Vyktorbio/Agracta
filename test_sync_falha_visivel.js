/* Envio que falha não pode ficar calado nem parado.
 *
 * O QUE ACONTECEU (23/09/2026)
 *   Um celular deixou de salvar no servidor e a tela dizia só "não subiu".
 *   Dois pontos do app podiam travar o envio sem dizer por quê:
 *     - com as regras novas do banco, um registro de histórico recusado fazia
 *       o lote INTEIRO falhar — o dado não subia por causa do histórico;
 *     - a leitura de conferência antes de gravar, se travasse, prendia toda
 *       gravação seguinte até o app ser reaberto.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] histórico recusado (permission-denied) → o mesmo envio sai SEM ele;
 *   [2] falha de rede mostra o código na tela e tenta de novo sozinha;
 *   [3] conferência sem resposta em 12 s solta a gravação e tenta de novo.
 *
 * Rodar: node test_sync_falha_visivel.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const VersoesCore=require('./vendor/versoes-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const src=fs.readFileSync('firebase-sync.js','utf8');
const trecho=src.slice(src.indexOf('  function commitState('),src.indexOf('\n  window.cloudInit='));
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

function harness(opts){
  const env={commits:[],badges:[],timers:[],saves:0};
  const ctx={
    FB:{user:{email:'tecnico@x.com'},lastRev:3,remoteFlat:{estudos:{E1:{v:1}}},
      db:{doc:()=>({get:()=>opts.get?opts.get():Promise.resolve({exists:true,data:()=>({rev:3})})}),
        batch:()=>{const ops=[];return {set:(r,d)=>ops.push({path:r.path,d}),delete:r=>ops.push({path:r.path,del:true}),
          commit:()=>{env.commits.push(ops.slice());return opts.commit(ops);}};}}},
    ROOT:'workspaces/agracta',COLLECTIONS_GRAVACAO:['estudos'],VersoesCore,
    firebaseInit:()=>true,splitState:s=>JSON.parse(JSON.stringify(s)),stable:JSON.stringify,
    queueOps:next=>Object.keys(next.estudos).map(id=>({type:'set',ref:{path:'estudos/'+id},data:next.estudos[id]})),
    collectionRef:c=>({doc:id=>({path:c+'/'+(id||'auto')})}),
    firebase:{firestore:{FieldValue:{serverTimestamp:()=>'TS'}}},
    cloudBadge:(k,t)=>env.badges.push((t||k)+''),setUnsavedChanges:b=>{ctx._unsavedChanges=b;},
    checkpointPut:()=>Promise.resolve(),checkpointFalhou:()=>{},
    localState:()=>({estudos:{E1:{v:2}}}),CustomEvent:function(){},dispatchEvent:()=>{},
    setTimeout:(f,ms)=>{const t={f,ms};env.timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelado=true;},
    console:{error(){},warn(){}},Promise,Error,Object,Math,JSON,String};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(trecho,ctx);
  ctx.cloudSave=()=>{env.saves++;};
  env.ctx=ctx;return env;
}
const negado=()=>{const e=new Error('Missing or insufficient permissions.');e.code='permission-denied';return Promise.reject(e);};

(async()=>{
  console.log('\n[1] histórico recusado não segura o dado');
  let h=harness({commit:ops=>ops.some(o=>/^historico\//.test(o.path))?negado():Promise.resolve()});
  await h.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  ok(h.commits.length===2,'o primeiro envio (com histórico) falha e o mesmo envio sai de novo');
  ok(!h.commits[1].some(o=>/^historico\//.test(o.path))&&h.commits[1].some(o=>o.path==='estudos/E1'),'o segundo envio leva o dado, sem histórico');
  ok(h.ctx._unsavedChanges===false&&h.ctx.FB.semHistorico&&h.ctx.FB.semHistorico.codigo==='permission-denied','o dado subiu, e a recusa do histórico fica registrada');
  h=harness({commit:()=>negado()});
  await h.ctx.commitState({estudos:{E1:{v:2}}}).catch(()=>{});await tick();
  ok(h.commits.length===2,'recusa que não é do histórico: tenta sem histórico uma vez, e só uma');
  ok(h.badges.some(b=>/não subiu \(permission-denied\)/.test(b)),'e a tela mostra o motivo: permission-denied');

  console.log('\n[2] falha de rede: motivo na tela e nova tentativa sozinha');
  h=harness({commit:()=>{const e=new Error('offline');e.code='unavailable';return Promise.reject(e);}});
  await h.ctx.commitState({estudos:{E1:{v:2}}}).catch(()=>{});await tick();
  ok(h.commits.length===1,'falha de rede não é confundida com recusa do histórico');
  ok(h.badges.some(b=>/não subiu \(unavailable\).*toque para tentar de novo/.test(b)),'a tela diz o motivo');
  const retry=h.timers.find(t=>t.ms===60000);
  ok(retry,'nova tentativa agendada em 60 s');
  h.ctx._unsavedChanges=true;retry.f();
  ok(h.saves===1,'e ela acontece sem ninguém tocar em nada');

  console.log('\n[3] conferência travada não prende a gravação');
  h=harness({get:()=>new Promise(()=>{}),commit:()=>Promise.resolve()});
  const p=h.ctx.conferirAntesDeGravar({estudos:{E1:{v:2}}});
  const prazo=h.timers.find(t=>t.ms===12000);
  ok(prazo,'a conferência tem prazo de 12 s');
  prazo.f();const r=await p;
  ok(r===false&&h.ctx.FB.conferindo===null,'sem resposta: a conferência é solta, nada fica preso');
  ok(h.badges.some(b=>/sem conexão com o servidor \(deadline-exceeded\)/.test(b)),'a tela diz que o servidor não respondeu');
  ok(h.timers.some(t=>t.ms===60000),'e agenda nova tentativa');

  console.log('\nSincronização visível: '+n+' verificações.');
})().catch(e=>{console.error(e);process.exit(1);});
