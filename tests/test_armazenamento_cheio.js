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
 * Rodar: node tests/test_armazenamento_cheio.js
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
  const {initial,database,client,seed,remote,av,edit}=require('./test_sync_envio_pendente.js');
  const env=database(),a=client(env.db,initial()),b=client(env.db,initial());
  seed(env,a.c,initial());await a.c.cloudPull();await b.c.cloudPull();env.commits=[];
  edit(a,'T1R1',7,10);await a.c.cloudSave();
  ok(env.commits.length===1,'nuvem na mesma revisão: publica uma transação');
  edit(b,'T1R2',8,20);await b.c.cloudSave();
  edit(a,'T1R1',9,30);await a.c.cloudSave();
  ok(av(remote(env,a.c)).notas.T1R2.v===8&&av(remote(env,a.c)).notas.T1R1.v===9,'nuvem com revisão nova: lê e mescla antes de gravar a cópia local');
  env.offline=true;edit(a,'T1R1',10,40);const antes=JSON.stringify(env.docs);
  await assert.rejects(a.c.cloudSave(),/sem rede/);
  ok(JSON.stringify(env.docs)===antes,'sem conexão para conferir: não grava nada por cima');
  ok(a.c._unsavedChanges===true&&/salvo neste aparelho/.test(a.badges.join(' ')),'edição fica pendente com aviso');
  env.offline=false;await a.c.cloudSave();env.commits=[];
  edit(a,'T1R1',11,50);await Promise.all([a.c.cloudSave(),a.c.cloudSave()]);
  ok(env.commits.length===1,'duas solicitações simultâneas compartilham a mesma gravação');
  a.state.data.__config.restoreGeneration=Date.now();
  a.state.data.Q1.estudos[0].codigo='RESTAURADO';
  await a.c.cloudSave();await b.c.cloudSave();
  ok(remote(env,a.c).data.Q1.estudos[0].codigo==='RESTAURADO','restauração persistente não é desfeita pela cópia antiga');

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
  ok(/if\(FB\.lerDepois\)\{[\s\S]*?FB\.lerDepois=false;[\s\S]*?setTimeout\(function\(\)\{window\.cloudResync\(\);\},250\)/.test(src),
    'o fim do envio le o que chegou durante ele');

  console.log('\nArmazenamento cheio: '+passes+' verificações — cofre na memória, conferência antes de gravar, aviso de tempo real.');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
