/* Armazenamento cheio e aparelho com copia velha nao desfazem trabalho.
 *
 * O QUE ACONTECEU (22/09/2026)
 *   No celular, o localStorage encheu. Finalizar um estudo gravava so na memoria
 *   e no cofre (IndexedDB). Ao recarregar, o app lia o localStorage — a copia de
 *   ANTES das finalizacoes —, tentava devolver o cofre para ele, falhava calado
 *   e abria com a copia velha: todos os estudos voltavam abertos.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] Cofre mais novo que nao cabe no localStorage entra NA MEMORIA, pelo merge:
 *       o estudo abre finalizado, e a uniao vai para a nuvem.
 *   [2] Antes de gravar, o aparelho confere a revisao da nuvem. Revisao nova ->
 *       le e mescla primeiro; sem conexao -> nao grava por cima de nada.
 *   [3] O aviso de "revisao nova" que chega pelo tempo real nao conta como lida;
 *       o que chega durante um envio e lido logo depois dele.
 *
 * Rodar: node test_armazenamento_cheio.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const {indexedDB}=require('fake-indexeddb');

let passes=0;
function ok(c,m){assert.ok(c,m);passes++;console.log('  ok    '+m);}
const espera=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- [1] celular cheio ---------- */
function estado(finalizado,ts){
  const s={id:'S1',codigo:'5457193039',_ts:ts,tratamentos:[{id:'T1'}],aplicacoes:[],avaliacoes:[],
    audit:[{ts:1,iso:'2026-09-01T10:00:00.000Z',action:'Criacao do Estudo',details:'c'}]};
  if(finalizado){
    s.finalizacao={em:'2026-09-22T20:06:00.000Z',por:'a@b.c',nome:'Victor',nResultados:4};
    s.audit.push({ts:2,iso:'2026-09-22T20:06:00.000Z',action:'Finalização do Estudo',details:'f'});
  }
  return {data:{__config:{},C4:{cultura:'soja',estudos:[s]}},
    qgeo:{},qgeots:{},georef:null,georefts:0,locais:{},qlocal:{},qnome:{},qnomets:{},qlocalts:{},locaists:{},
    randomizacoes:[],notas_campo:[],_deletedQuadras:{},_deletedLocais:{},_deletedNotas:{},rev:3};
}
function elStub(){
  return new Proxy(function(){},{
    get(t,k){
      if(k==='style'||k==='dataset')return {};
      if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false;}};
      if(k===Symbol.toPrimitive)return ()=>'';
      if(k==='readyState')return 'complete';
      return elStub();
    },
    set(){return true;},apply(){return elStub();}
  });
}
async function celularCheio(){
  /* checkpoint FINALIZADO no cofre, gravado depois do localStorage */
  await new Promise((resolve,reject)=>{
    const rq=indexedDB.open('agracta-local-first',1);
    rq.onupgradeneeded=()=>rq.result.createObjectStore('snapshots');
    rq.onsuccess=()=>{const tx=rq.result.transaction('snapshots','readwrite');
      tx.objectStore('snapshots').put({savedAt:2000,state:estado(true,20),localAtivo:''},'active');
      tx.oncomplete=()=>{rq.result.close();resolve();};tx.onerror=()=>reject(tx.error);};
    rq.onerror=()=>reject(rq.error);
  });
  /* localStorage com a copia VELHA (estudo aberto) e sem espaco para mais nada */
  const velho=estado(false,10);
  const store={'iracema-v7':JSON.stringify(velho.data),'agracta-local-state-ts':'1000'};
  let cheio=false;
  const localStorage={
    getItem:k=>store[k]==null?null:store[k],
    setItem(k,v){ if(cheio && String(v).length>=(store[k]||'').length){const e=new Error('exceeded the quota');e.name='QuotaExceededError';throw e;} store[k]=String(v); },
    removeItem:k=>{delete store[k];}
  };
  const badges=[];
  const ctx={console:{log(){},warn(){},error(){}},setTimeout,clearTimeout,setInterval(){},clearInterval(){},
    Date,JSON,Math,Promise,Object,Array,String,Number,Error,RegExp,Symbol,Proxy,Map,Set,parseInt,parseFloat,isNaN,encodeURIComponent,
    alert(){},confirm(){return true;},prompt(){return '';},indexedDB,localStorage,
    sessionStorage:{getItem(){return null;},setItem(){}},
    location:{reload(){ctx.__recarregou=true;},href:'',search:'',hash:''},
    navigator:{onLine:true,userAgent:'node',serviceWorker:{register(){return Promise.resolve();},addEventListener(){}}},
    document:new Proxy({},{get(t,k){
      if(k==='readyState')return 'complete';
      if(['createElement','getElementById','querySelector','createElementNS'].includes(k))return ()=>elStub();
      if(['querySelectorAll','getElementsByClassName','getElementsByTagName'].includes(k))return ()=>[];
      if(k==='addEventListener'||k==='removeEventListener')return ()=>{};
      if(k==='hidden')return false;if(k==='cookie')return '';
      return elStub();}}),
    addEventListener(){},removeEventListener(){},requestAnimationFrame(){},
    matchMedia(){return {matches:false,addListener(){},addEventListener(){}};},
    fetch(){return Promise.resolve({json(){return Promise.resolve({});}});}};
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
  ctx.btoa=s=>Buffer.from(s,'binary').toString('base64');ctx.atob=s=>Buffer.from(s,'base64').toString('binary');
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('app.js','utf8'),ctx,{filename:'app.js'});
  ctx.render=function(){};ctx.enforceAccess=function(){};ctx.buildLocalChip=function(){};ctx.updateAgendaBadge=function(){};
  const velhoNaMemoria=!vm.runInContext("(data.C4&&data.C4.estudos[0]&&data.C4.estudos[0].finalizacao)?1:0",ctx);
  cheio=true;   /* daqui para frente o armazenamento rapido nao aceita crescer */
  vm.runInContext(fs.readFileSync('firebase-sync.js','utf8'),ctx,{filename:'firebase-sync.js'});
  const orig=ctx.cloudBadge;ctx.cloudBadge=function(k,t){badges.push(t||k);};
  for(let i=0;i<40 && !vm.runInContext("!!(data.C4&&data.C4.estudos[0]&&data.C4.estudos[0].finalizacao)",ctx);i++) await espera(25);
  return {ctx,store,badges,velhoNaMemoria,orig};
}

(async()=>{
  console.log('\n[1] celular com o armazenamento rapido cheio');
  const c=await celularCheio();
  ok(c.velhoNaMemoria,'o app abre lendo a copia velha (estudo aberto) do localStorage');
  ok(!c.ctx.__recarregou,'devolver o cofre ao localStorage cheio falha (nao recarrega em vao)');
  const est=vm.runInContext('data.C4.estudos[0]',c.ctx);
  ok(!!(est.finalizacao&&est.finalizacao.em==='2026-09-22T20:06:00.000Z'),'o estudo abre FINALIZADO, pelo cofre, com a data original');
  ok(est.audit.some(e=>e.action==='Finalização do Estudo'),'a trilha da finalizacao volta junto');
  ok(vm.runInContext('_unsavedChanges',c.ctx)===true,'a uniao fica marcada para subir para a nuvem');

  /* ---------- [2] conferir a nuvem antes de gravar ---------- */
  console.log('\n[2] antes de gravar, o aparelho confere a nuvem');
  const src=fs.readFileSync('firebase-sync.js','utf8');
  const trecho=src.slice(src.indexOf('  function commitState('),src.indexOf('\n  window.cloudInit='));
  const salvar=src.slice(src.indexOf('  window.cloudSave=function(){'),src.indexOf('  window.cloudSyncNow='));
  function harness(revNuvem,falhaRede){
    const env={commits:[],pulls:0,badges:[]};
    const ctx={FB:{user:{email:'t'},lastRev:5,db:{doc:()=>({get:()=>falhaRede?Promise.reject(new Error('sem rede')):Promise.resolve({exists:true,data:()=>({rev:revNuvem})})})}},
      ROOT:'r',firebaseInit:()=>true,console:{error(){}},Promise,
      cloudBadge:(k,t)=>env.badges.push(t||k),setUnsavedChanges:b=>{ctx._unsaved=b;},
      localState:()=>({v:'memoria'}),clearTimeout(){},_cloudReplace:false,
      cloudPull:()=>{env.pulls++;return Promise.resolve(true);}};
    ctx.window=ctx;vm.createContext(ctx);vm.runInContext(trecho,ctx);
    ctx.commitState=st=>{env.commits.push(st);return Promise.resolve(true);};
    vm.runInContext(salvar,ctx);
    env.ctx=ctx;return env;
  }
  let h=harness(5);await h.ctx.cloudSave();
  ok(h.commits.length===1&&h.pulls===0,'nuvem na mesma revisao: grava direto');
  h=harness(9);await h.ctx.cloudSave();
  ok(h.commits.length===0&&h.pulls===1,'nuvem com revisao nova: le e mescla ANTES, sem gravar a copia velha');
  h=harness(5,true);const r=await h.ctx.cloudSave();
  ok(r===false&&h.commits.length===0,'sem conexao para conferir: nao grava nada por cima');
  ok(h.ctx._unsaved===true&&/guardadas neste aparelho/.test(h.badges.join(' ')),'e a edicao fica pendente, com aviso');
  h=harness(9);h.ctx._cloudReplace=true;await h.ctx.cloudSave();
  ok(h.commits.length===1&&h.pulls===0,'restaurar backup substitui de proposito: nao mescla');
  h=harness(9);const p1=h.ctx.cloudSave(),p2=h.ctx.cloudSave();await p1;await p2;
  ok(h.pulls===1,'duas gravacoes seguidas fazem UMA conferencia');

  /* ---------- [3] aviso de tempo real ---------- */
  console.log('\n[3] revisao avisada nao e revisao lida');
  const sub=src.slice(src.indexOf('  window.cloudSubscribe=function(){'),src.indexOf('  window.cloudStart='));
  let aviso=null,timers=[];
  const s={ROOT:'r',FB:{user:{},lastRev:5,pushing:false,db:{doc:()=>({onSnapshot:(o,f)=>{aviso=f;return ()=>{};}})}},
    cloudBadge(){},cloudPull(){},clearTimeout(){},setTimeout:(f,ms)=>{timers.push(f);return 1;}};
  s.window=s;vm.createContext(s);vm.runInContext(sub,s);s.cloudSubscribe();
  const snap=rev=>({exists:true,metadata:{hasPendingWrites:false},data:()=>({rev})});
  aviso(snap(7));
  ok(s.FB.lastRev===5,'o aviso de revisao 7 nao marca a revisao como lida');
  ok(timers.length===1,'agenda a leitura');
  aviso(snap(7));ok(timers.length===1,'o mesmo aviso repetido nao agenda outra leitura');
  s.FB.pushing=true;aviso(snap(8));
  ok(s.FB.lerDepois===true&&timers.length===1,'aviso durante um envio fica para ler logo depois dele');
  ok(/if\(FB\.lerDepois&&typeof window\.cloudPull==='function'\)\{FB\.lerDepois=false;return window\.cloudPull\(\);\}/.test(trecho),
    'o fim do envio le o que chegou durante ele');

  console.log('\nArmazenamento cheio: '+passes+' verificações — cofre na memória, conferência antes de gravar, aviso de tempo real.');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
