/* Envio parado: um lote na fila do SDK, nunca dois — e a tela diz por quê.
 *
 * O QUE ACONTECEU
 *   23/09: "Salva no celular e no servidor não." O `commit()` do Firestore NÃO
 *   rejeita quando o servidor não aceita por um motivo que o SDK trata como
 *   passageiro (sem sinal, COTA ESGOTADA, login a renovar): o SDK guarda o lote
 *   e tenta de novo sozinho, e a promessa só fica pendente. A resposta de então
 *   foi, aos 90 s, dar o envio por perdido e mandar OUTRO lote.
 *
 *   29/09: "86 alterações aguardando envio" no celular e o computador sem subir,
 *   ao mesmo tempo. O lote "perdido" nunca se perdia: continuava na fila do SDK,
 *   e o novo entrava atrás dele (a fila é uma só). Um aparelho parado empilhava
 *   um lote a cada 2,5 min, cada um com as mesmas alterações e o seu histórico,
 *   e quando a cota renovava o SDK despejava todos — e a cota do dia novo
 *   acabava logo cedo.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] 15 s avisa, com o motivo que o SDK só escreve no console, e não solta
 *       a tranca;
 *   [2] 90 s também só avisa: NENHUM lote novo enquanto o SDK tem o primeiro,
 *       por mais que o tempo passe e o app peça para gravar;
 *   [3] parado, o aparelho confere a raiz pela REST e recebe o trabalho do
 *       colega — uma leitura inteira por gravação alheia, não por minuto;
 *   [4] quando o SDK enfim responde, conta como envio feito, e o que foi
 *       editado na espera sobe num lote só;
 *   [5] a escuta do console reconhece a queixa do SDK e a devolve ao console.
 *
 * Rodar: node test_envio_perdido.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const VersoesCore=require('./vendor/versoes-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const src=fs.readFileSync('firebase-sync.js','utf8');
const trecho=src.slice(src.indexOf('  function commitState('),src.indexOf('\n  window.cloudInit='));
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};

function harness(opts){
  const env={commits:[],badges:[],timers:[],saves:0,pulls:0,fetches:0,raiz:{rev:3,writeId:'w-lido'}};
  const ctx={
    FB:{user:{email:'tecnico@x.com',getIdToken:()=>Promise.resolve('tk')},lastRev:3,lastSeenWrite:'w-lido',
      remoteFlat:{estudos:{E1:{v:1}}},
      db:{doc:()=>({get:()=>Promise.resolve({exists:true,data:()=>({rev:3})})}),
        batch:()=>{const ops=[];return {set:(r,d)=>ops.push({path:r.path,d}),delete:r=>ops.push({path:r.path,del:true}),
          commit:()=>{env.commits.push(ops.slice());return opts.commit(ops);}};}}},
    CFG:{projectId:'agracta-teste'},
    ROOT:'workspaces/agracta',COLLECTIONS_GRAVACAO:['estudos'],VersoesCore,
    firebaseInit:()=>true,splitState:s=>JSON.parse(JSON.stringify(s)),stable:JSON.stringify,
    queueOps:next=>Object.keys(next.estudos).map(id=>({type:'set',ref:{path:'estudos/'+id},data:next.estudos[id]})),
    collectionRef:c=>({doc:id=>({path:c+'/'+(id||'auto')})}),
    firebase:{firestore:{FieldValue:{serverTimestamp:()=>'TS'}}},
    cloudBadge:(k,t)=>env.badges.push((t||k)+''),setUnsavedChanges:b=>{ctx._unsavedChanges=b;},
    checkpointPut:()=>Promise.resolve(),checkpointFalhou:()=>{},
    localState:()=>ctx._local,_local:{estudos:{E1:{v:2}}},
    CustomEvent:function(){},dispatchEvent:()=>{},
    document:{visibilityState:'visible'},navigator:{onLine:true},
    fetch:(url,o)=>{env.fetches++;env.ultimoFetch={url,o};
      if(opts.fetchFalha)return Promise.reject(opts.fetchFalha);
      if(opts.fetchStatus)return Promise.resolve({ok:false,status:opts.fetchStatus.http,json:()=>Promise.resolve({error:{status:opts.fetchStatus.status,message:'Quota exceeded.'}})});
      return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({fields:{rev:{integerValue:String(env.raiz.rev)},writeId:{stringValue:env.raiz.writeId}}})});},
    setTimeout:(f,ms)=>{const t={f,ms};env.timers.push(t);return t;},clearTimeout:t=>{if(t)t.cancelado=true;},
    console:{error(){},warn(){}},Promise,Error,Object,Math,JSON,String,Number,Date};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(trecho,ctx);
  ctx.cloudSave=()=>{env.saves++;};
  ctx.cloudPull=()=>{env.pulls++;return Promise.resolve(true);};
  env.ctx=ctx;return env;
}
const prazo=(env,ms)=>env.timers.filter(t=>t.ms===ms&&!t.cancelado).at(-1);
/* O servidor não aceita e o SDK não desiste: a promessa não resolve NEM rejeita. */
const nuncaResponde=()=>new Promise(function(){});

(async()=>{
  console.log('\n[1] 15 s: avisa, com o motivo, e não solta a tranca');
  let h=harness({commit:nuncaResponde});
  h.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  ok(h.commits.length===1&&h.ctx.FB.pushing===true,'o primeiro envio saiu e a tranca está posta');
  h.ctx.FB.queixas={cota:Date.now()};           /* o SDK escreveu "resource-exhausted" no console */
  prazo(h,15000).f();
  ok(h.ctx.FB.pushing===true,'o aviso de 15 s NÃO libera um envio concorrente');
  ok(/aguardando o servidor/.test(h.badges.at(-1)),'a tela diz quantas alterações aguardam o servidor');
  ok(/sem cota/.test(h.badges.at(-1)),'e diz o motivo que o SDK só escreveu no console: cota');

  console.log('\n[2] 90 s: também só avisa — nenhum lote novo enquanto o SDK tem o primeiro');
  prazo(h,90000).f();await tick();
  ok(h.ctx.FB.pushing===true,'a tranca continua: o lote segue na fila do SDK');
  ok(h.ctx._unsavedChanges===true,'o estado segue marcado como não enviado');
  ok(h.ctx._syncParado===true,'o app sabe que o envio está parado (o toque no selo explica)');
  ok(/servidor sem cota/.test(h.badges.at(-1))&&/guardadas neste aparelho/.test(h.badges.at(-1)),
     'a tela diz: servidor sem cota, alterações guardadas neste aparelho');
  const umMinuto=prazo(h,60000);if(umMinuto)umMinuto.f();await tick();
  ok(h.saves===0&&h.commits.length===1,'um minuto depois: nenhuma "nova tentativa" que mandaria outro lote');
  /* O que empilhava: o app segue pedindo para gravar — autosave, volta de rede, toque. */
  for(let i=0;i<50;i++){h.ctx.commitState({estudos:{E1:{v:3+i}}});}
  for(let i=0;i<10;i++){const c=prazo(h,60000);if(c)c.f();await tick();}
  ok(h.commits.length===1,'50 pedidos de gravação e 10 minutos depois: continua UM lote no SDK');

  console.log('\n[3] parado, recebe o trabalho do colega pela REST');
  h=harness({commit:nuncaResponde});
  h.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  h.ctx.FB.myWrites=Object.assign({},h.ctx.FB.myWrites,{'w-meu-antigo':1});
  prazo(h,90000).f();await tick();
  ok(h.fetches===1,'aos 90 s confere a raiz do servidor (1 leitura)');
  ok(/firestore\.googleapis\.com\/v1\/projects\/agracta-teste\/databases\/\(default\)\/documents\/workspaces\/agracta$/.test(h.ultimoFetch.url),
     'pela REST, direto na raiz — por fora do SDK, que mostraria a nossa gravação pendente por cima');
  ok(h.ultimoFetch.o.headers.Authorization==='Bearer tk','com o token do login');
  ok(h.pulls===0,'a raiz ainda é a que o aparelho leu: nada a reler');
  ok(/servidor não confirma/.test(h.badges.at(-1)),'servidor responde e o envio não anda: a tela diz, e o toque oferece recarregar');
  h.raiz={rev:4,writeId:'w-meu-antigo'};prazo(h,60000).f();await tick();
  ok(h.pulls===0,'gravação deste próprio aparelho não é "do colega"');
  h.raiz={rev:5,writeId:'w-do-pc'};prazo(h,60000).f();await tick();
  ok(h.pulls===1,'o computador gravou: lê e mescla, mesmo sem conseguir enviar');
  ok(/servidor não confirma/.test(h.badges.at(-1)),'e o aviso volta ao selo depois da leitura');
  prazo(h,60000).f();await tick();prazo(h,60000).f();await tick();
  ok(h.pulls===1,'a mesma gravação alheia não é relida a cada minuto');
  ok(h.fetches===5,'uma leitura da raiz por minuto, não o banco inteiro');
  ok(h.commits.length===1,'e continua um lote só no SDK');
  h.ctx.document.visibilityState='hidden';prazo(h,60000).f();await tick();
  ok(h.fetches===5,'com o app em segundo plano, não lê');
  h.ctx.document.visibilityState='visible';

  const hc=harness({commit:nuncaResponde,fetchStatus:{http:429,status:'RESOURCE_EXHAUSTED'}});
  hc.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  prazo(hc,90000).f();await tick();
  ok(/servidor sem cota/.test(hc.badges.at(-1)),'a REST responde 429 RESOURCE_EXHAUSTED: cota, mesmo sem queixa no console');
  const hr=harness({commit:nuncaResponde,fetchFalha:new TypeError('Failed to fetch')});
  hr.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  prazo(hr,90000).f();await tick();
  ok(/sem conexão com o servidor/.test(hr.badges.at(-1)),'fetch que nem chega ao servidor: sem conexão');

  console.log('\n[4] o SDK responde: conta como envio feito, e a espera sobe num lote só');
  let solta;const h2=harness({commit:()=>h2.commits.length===1?new Promise(r=>{solta=r;}):Promise.resolve()});
  h2.ctx.commitState({estudos:{E1:{v:2}}});await tick();
  prazo(h2,90000).f();await tick();
  h2.ctx._local={estudos:{E1:{v:9},E2:{v:1}}};    /* editou durante a espera */
  h2.ctx.commitState(h2.ctx._local);h2.ctx.commitState(h2.ctx._local);
  ok(h2.commits.length===1,'na espera, a edição fica guardada');
  solta();await tick();
  ok(h2.ctx.FB.lastRev===5,'a resposta, mesmo tardia, conta: a revisão anda (4 o lote da fila, 5 o da espera)');
  ok(h2.ctx._syncParado===false&&!h2.ctx.FB.espera,'o selo sai do estado parado');
  ok(h2.commits.length===2,'o que foi editado na espera sobe em UM lote');
  ok(h2.commits[1].some(o=>o.path==='estudos/E2'),'e esse lote leva a edição da espera');
  ok(!prazo(h2,60000),'sem conferência pendurada depois que o envio andou');

  console.log('\n[5] a escuta do console reconhece a queixa do SDK e não a cala');
  const inicio=src.indexOf('  function _registraQueixa('),fim=src.indexOf('  function firebaseInit(');
  const saidas=[];const c2={FB:{},Array,String,Date,
    console:{error:(...a)=>saidas.push(['error',...a]),warn:(...a)=>saidas.push(['warn',...a]),log(){}}};
  vm.createContext(c2);vm.runInContext(src.slice(inicio,fim),c2);
  vm.runInContext('_escutarQueixasDoSdk();_escutarQueixasDoSdk();',c2);
  c2.console.error('[2026-09-29T11:52:00.000Z]  @firebase/firestore:','Firestore (12.15.0): FirebaseError: [code=resource-exhausted]: Quota exceeded.');
  ok(c2.FB.queixas&&c2.FB.queixas.cota>0,'"resource-exhausted: Quota exceeded" do SDK vira motivo: cota');
  ok(saidas.length===1&&/Quota exceeded/.test(saidas[0][2]),'e a mensagem chega ao console como sempre, uma vez só');
  c2.console.warn('[2026-09-29T11:52:01.000Z]  @firebase/firestore:','Firestore (12.15.0): Could not reach Cloud Firestore backend. Connection failed 1 times.');
  ok(c2.FB.queixas.rede>0,'"Could not reach Cloud Firestore backend" vira motivo: rede');
  c2.console.error('[Agracta Firebase] gravação:','resource-exhausted');
  ok(Object.keys(c2.FB.queixas).length===2,'mensagem que não é do SDK não conta');

  console.log('\n'+n+' verificações, nenhuma falha.');
})().catch(e=>{console.error(e);process.exitCode=1;});
