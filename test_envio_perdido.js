/* Um envio pendurado não pode trancar todos os seguintes.
 *
 * O QUE ACONTECEU
 *   "Salva no celular e no servidor não." O `commit()` do Firestore NÃO rejeita
 *   quando o aparelho perde o sinal: fica PENDENTE até reconectar. E
 *   `commitState` começa com "se já está enviando, guarda e sai". Um único envio
 *   pendurado trancava todos os seguintes — o aparelho seguia gravando local e
 *   nada mais subia, pela sessão inteira. A nova tentativa de 60 s do #129 nem
 *   era agendada: ela mora no tratamento de ERRO, e a promessa nunca falhava.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] 15 s (rede LENTA) avisa e NÃO solta a tranca — continua um envio só;
 *   [2] 90 s (envio PERDIDO) solta a tranca, avisa e reagenda;
 *   [3] a tentativa abandonada, se responder depois, não dá notícia nem mexe
 *       na contabilidade de quem veio depois.
 *
 * Rodar: node test_envio_perdido.js
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
      db:{doc:()=>({get:()=>Promise.resolve({exists:true,data:()=>({rev:3})})}),
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
const prazo=(env,ms)=>env.timers.find(t=>t.ms===ms&&!t.cancelado);
/* O celular perdeu o sinal: a promessa do commit não resolve NEM rejeita. */
const nuncaResponde=()=>new Promise(function(){});

(async()=>{
  console.log('\n[1] 15 s é rede LENTA: avisa, não solta a tranca');
  const h=harness({commit:nuncaResponde});
  h.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  ok(h.commits.length===1&&h.ctx.FB.pushing===true,'o primeiro envio saiu e a tranca está posta');
  const cao=prazo(h,15000);
  ok(!!cao,'o aviso de 15 s existe');
  cao.f();
  ok(h.ctx.FB.pushing===true,'aviso de rede lenta NÃO libera um envio concorrente');
  ok(/aguardando envio/.test(h.badges.at(-1)),'e a tela diz quantas alterações estão aguardando envio');
  h.ctx.commitState({estudos:{E1:{v:3}}});await tick();
  ok(h.commits.length===1,'rede lenta não duplica escrita: continua um envio só');

  console.log('\n[2] 90 s é envio PERDIDO: solta a tranca e tenta de novo');
  const perdido=prazo(h,90000);
  ok(!!perdido,'o prazo de 90 s existe');
  perdido.f();
  ok(h.ctx.FB.pushing===false,'a tranca é solta — o aparelho volta a poder enviar');
  ok(h.ctx._unsavedChanges===true,'o estado segue marcado como não enviado');
  ok(/não respondeu/.test(h.badges.at(-1)),'a tela diz que o envio não respondeu');
  ok(!!prazo(h,60000),'uma nova tentativa fica agendada sozinha');
  h.ctx.commitState({estudos:{E1:{v:3}}});await tick();
  ok(h.commits.length===2,'e o envio seguinte SAI, em vez de ficar guardado para sempre');

  console.log('\n[3] a tentativa abandonada não dá notícia se responder depois');
  let solta;const h2=harness({commit:()=>h2.commits.length===1?new Promise(r=>{solta=r;}):Promise.resolve()});
  h2.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  prazo(h2,90000).f();                       /* abandona a primeira */
  h2.ctx._unsavedChanges=true;
  const revAntes=h2.ctx.FB.lastRev, badgesAntes=h2.badges.length;
  solta();await tick();                      /* a primeira responde tarde */
  ok(h2.ctx.FB.lastRev===revAntes,'resposta tardia não move a revisão do aparelho');
  ok(h2.ctx._unsavedChanges===true,'resposta tardia não anuncia que tudo foi salvo');
  ok(h2.badges.length===badgesAntes,'resposta tardia não repinta a tela');
  ok(h2.ctx.FB.pushing===false,'e não mexe na tranca de quem veio depois');

  console.log('\n'+n+' verificações, nenhuma falha.');
})().catch(e=>{console.error(e);process.exitCode=1;});
