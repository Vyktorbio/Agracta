/* Só o que mudou sobe — e o servidor termina idêntico ao aparelho.
 *
 * O QUE ACONTECEU (26/09/2026)
 *   "Fica aparecendo 50 alterações aguardando envio, salvo só no aparelho."
 *   Um estudo carrega a estatística congelada e as finalizações anteriores
 *   (com rubricas desenhadas em PNG): passa de 400 KB. Lançar uma nota põe
 *   uma linha na trilha do estudo, e o app regravava o documento INTEIRO —
 *   mais a cópia inteira dele no histórico: ~1 MB por salvamento. No 4G do
 *   campo o envio passava do prazo e nada subia.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] documento grande que já existe sobe por update() só dos campos
 *       alterados, e o servidor fica EXATAMENTE igual ao aparelho;
 *   [2] o histórico leva só o anterior desses campos, e a restauração volta;
 *   [3] documento novo ou pequeno continua indo inteiro;
 *   [4] update recusado (documento apagado em outro aparelho) → o mesmo
 *       envio sai de novo com documentos inteiros, e o dado sobe.
 *
 * Rodar: node test_sync_parcial.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const V=require('./vendor/versoes-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const src=fs.readFileSync('firebase-sync.js','utf8');
const trecho=src.slice(src.indexOf('  function commitState('),src.indexOf('\n  window.cloudInit='));
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const clone=o=>JSON.parse(JSON.stringify(o));

/* Firestore de mentira com a semântica que importa: set substitui, update
   aplica caminhos de campo (e falha se o documento não existe), delete apaga.
   O lote é atômico: se qualquer escrita falha, nada muda. */
function FieldPath(){this.seg=[].slice.call(arguments);}
const DEL={del:true};
function harness(servidor,local,opts){
  opts=opts||{};
  const env={servidor,commits:[],badges:[],timers:[]};
  const ctx={
    FB:{user:{email:'tecnico@x.com'},lastRev:3,remoteFlat:clone(servidor)},
    ROOT:'workspaces/agracta',COLLECTIONS_GRAVACAO:['estudos'],VersoesCore:V,
    firebaseInit:()=>true,splitState:s=>clone(s),stable:V.stable,
    collectionRef:c=>({doc:id=>({c,id:id||('auto'+Math.random())})}),
    firebase:{firestore:{FieldPath,FieldValue:{serverTimestamp:()=>'TS',delete:()=>DEL}}},
    cloudBadge:(k,t)=>env.badges.push((t||k)+''),setUnsavedChanges:b=>{ctx._unsavedChanges=b;},
    checkpointPut:()=>Promise.resolve(),checkpointFalhou:()=>{},
    localState:()=>clone(local),CustomEvent:function(){},dispatchEvent:()=>{},
    setTimeout:(f,ms)=>({f,ms}),clearTimeout:()=>{},
    console:{error(){},warn(){}},Promise,Error,Object,Math,JSON,String,Function};
  ctx.FB.db={doc:()=>({c:'root',id:'root'}),batch:()=>{
    const ops=[];
    return {
      set:(r,d)=>ops.push({t:'set',r,d:clone(d)}),
      delete:r=>ops.push({t:'del',r}),
      update:function(r){const pares=[];for(let i=1;i<arguments.length;i+=2)pares.push([arguments[i].seg,arguments[i+1]]);ops.push({t:'upd',r,pares});},
      commit:()=>{
        env.commits.push(ops);
        const novo=clone(env.servidor);
        for(const o of ops){
          if(o.r.c==='root')continue;
          const col=novo[o.r.c]=novo[o.r.c]||{};
          if(o.t==='set'){col[o.r.id]=Object.assign(o.r.c==='root'?(col[o.r.id]||{}):{},o.d);continue;}
          if(o.t==='del'){delete col[o.r.id];continue;}
          if(!col[o.r.id]){const e=new Error('No document to update');e.code='not-found';return Promise.reject(e);}
          for(const [seg,v] of o.pares){
            let x=col[o.r.id];for(let i=0;i<seg.length-1;i++){x[seg[i]]=x[seg[i]]&&typeof x[seg[i]]==='object'?x[seg[i]]:{};x=x[seg[i]];}
            if(v===DEL)delete x[seg[seg.length-1]];else x[seg[seg.length-1]]=clone(v);
          }
        }
        env.servidor=novo;return Promise.resolve();
      }};
  }};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(trecho,ctx);
  ctx.cloudSave=()=>{};
  if(opts.depois)opts.depois(env);
  env.ctx=ctx;return env;
}
const bytesDoEnvio=ops=>ops.reduce((t,o)=>t+(o.t==='set'?V.bytes(o.d):o.t==='upd'?V.bytes(o.pares.map(p=>p[1]===DEL?null:p[1])):16),0);

(async()=>{
  const rubrica='data:image/png;base64,'+'A'.repeat(114000);
  const estudo={id:'E1',quadraId:'Q1',order:0,data:{codigo:'AGR-1',audit:[{a:'criou'}],
    finalizacoesAnteriores:{_agractaArray:true,_agractaLength:3,_agractaItems:{0:{rubrica},1:{rubrica},2:{rubrica}}},
    estatisticaFinal:{x:'E'.repeat(100000)},tratamentos:{t1:{dose:'1'}}}};
  const servidor={estudos:{E1:estudo,E2:{id:'E2',data:{p:1}}}};

  console.log('\n[1] estudo grande: sobe só a trilha, servidor igual ao aparelho');
  const local=clone(servidor);
  local.estudos.E1.data.audit=[{a:'criou'},{a:'lançou nota'}];
  local.estudos.E1.data.tratamentos.t1.dose='2';
  delete local.estudos.E1.data.estatisticaFinal;
  let h=harness(servidor,local);
  await h.ctx.commitState(clone(local));await tick();
  ok(h.commits.length===1,'um envio só');
  const env1=h.commits[0].filter(o=>o.r.c==='estudos');
  ok(env1.length===1&&env1[0].t==='upd','o estudo foi por update(), não set() inteiro');
  ok(V.stable(h.servidor.estudos)===V.stable(local.estudos),'o servidor ficou EXATAMENTE igual ao aparelho (inclusive o campo removido)');
  const kb=bytesDoEnvio(env1)/1024;
  ok(kb<120,'o dado enviado caiu de ~'+Math.round(V.bytes(local.estudos.E1)/1024)+' KB para '+kb.toFixed(1)+' KB');

  console.log('\n[2] o histórico leva só o anterior dos campos e restaura');
  const hist=h.commits[0].filter(o=>o.r.c==='historico').map(o=>o.d);
  ok(hist.length===1&&hist[0].anterior&&hist[0].anterior._parcial===true,'registro parcial no histórico');
  ok(Object.keys(hist[0]).every(k=>['rev','colecao','docId','acao','anterior','grande','em','por','porNome'].includes(k)),'só chaves que a regra do banco aceita');
  ok(V.bytes(hist[0].anterior)<V.bytes(estudo)/1.5,'o histórico não copia mais o estudo inteiro ('+Math.round(V.bytes(hist[0].anterior)/1024)+' KB)');
  const volta=V.estadoAntesDe(h.servidor,JSON.parse(JSON.stringify(hist)),hist[0].rev);
  ok(V.stable(volta.flat.estudos)===V.stable(servidor.estudos)&&!volta.irrecuperaveis.length,'restaurar para antes devolve o estudo exato de antes');

  console.log('\n[3] documento novo ou pequeno vai inteiro');
  const local3=clone(servidor);local3.estudos.E2.data.p=2;local3.estudos.E3={id:'E3',data:{q:1}};
  h=harness(servidor,local3);
  await h.ctx.commitState(clone(local3));await tick();
  const e3=h.commits[0].filter(o=>o.r.c==='estudos');
  ok(e3.length===2&&e3.every(o=>o.t==='set'),'pequeno e novo seguem com set()');
  ok(V.stable(h.servidor.estudos)===V.stable(local3.estudos),'servidor igual ao aparelho');

  console.log('\n[4] update recusado volta ao documento inteiro, e o dado sobe');
  h=harness(servidor,local,{depois:env=>{env.servidor=clone(env.servidor);delete env.servidor.estudos.E1;}});
  await h.ctx.commitState(clone(local));await tick();
  ok(h.commits.length===2,'o primeiro envio (por campos) é recusado e o mesmo sai de novo');
  ok(h.commits[1].filter(o=>o.r.c==='estudos').every(o=>o.t==='set'),'o segundo vai com documentos inteiros');
  ok(h.ctx.FB.semParcial&&h.ctx.FB.semParcial.codigo==='not-found'&&h.ctx._unsavedChanges===false,'o dado subiu, e a recusa fica registrada na sessão');
  ok(V.stable(h.servidor.estudos.E1)===V.stable(local.estudos.E1),'o estudo está no servidor, inteiro');

  console.log('\nSync parcial: '+n+' verificações.');
})().catch(e=>{console.error(e);process.exit(1);});
