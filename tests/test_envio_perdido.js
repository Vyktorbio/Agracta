/* Um envio lento nunca libera outro; o aparelho continua recebendo o colega. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {initial,database,client,seed,edit,root,tick,withDeadline}=require('./test_sync_envio_pendente.js');
const prazo=(a,ms)=>a.c.__timers.filter(t=>t.ms===ms&&!t.cancelled).at(-1);
async function fixture(options={}){
 const env=database(),a=client(env.db,initial());seed(env,a.c,initial());env.docs[root].writeId='w-lido';await a.c.cloudPull();
 env.attempts=[];env.commits=[];
 env.raiz={rev:env.docs[root].rev,writeId:env.docs[root].writeId};env.fetches=0;env.pulls=0;
 a.c.AGRACTA_FIREBASE_CONFIG.projectId='agracta-teste';a.c.__testFB.user.getIdToken=()=>Promise.resolve('tk');
 a.c.fetch=(url,opts)=>{env.fetches++;env.ultimoFetch={url,opts};
  if(options.fetchFalha)return Promise.reject(options.fetchFalha);
  if(options.fetchStatus)return Promise.resolve({ok:false,status:429,json:async()=>({error:{status:'RESOURCE_EXHAUSTED',message:'Quota exceeded.'}})});
  return Promise.resolve({ok:true,status:200,json:async()=>({fields:{rev:{integerValue:String(env.raiz.rev)},writeId:{stringValue:env.raiz.writeId}}})});
 };
 const pull=a.c.cloudPull;a.c.cloudPull=function(){env.pulls++;return pull();};
 env.beforeCommit=()=>new Promise(resolve=>env.release=resolve);
 edit(a,'T1R1',7,100);env.sending=a.c.cloudSave();await tick();assert.equal(env.attempts.length,1);
 return {env,a};
}
(async()=>{
 let {env,a}=await fixture();prazo(a,15000).fn();
 assert.ok(/^=⌛ \d+ alterações aguardando o servidor/.test(a.badges.at(-1)));
 assert.equal(a.c.__testFB.pushing,true);
 a.c.__testFB.queixas={cota:Date.now()};a.c.__testFB.ultimaQueixa='Firestore (12.15.0): FirebaseError: [code=resource-exhausted]: Quota exceeded.';
 prazo(a,15000).fn();assert.ok(/^=⚠ Servidor sem cota/.test(a.badges.at(-1)));
 assert.equal(a.c._syncParado,true);let alertText='';a.c.alert=s=>alertText=s;a.c.agractaSyncExplicar();
 assert.ok(/COTA/.test(alertText)&&/Detalhe técnico: FirebaseError/.test(alertText));
 prazo(a,90000).fn();await tick();
 assert.equal(a.c.__testFB.pushing,true);assert.equal(a.c._unsavedChanges,true);
 for(let i=0;i<50;i++){edit(a,'T1R2',i+20,200+i);a.c.cloudSave();}
 for(let i=0;i<10;i++){const p=prazo(a,60000);if(p)p.fn();await tick();}
 assert.equal(env.attempts.length,1,'50 pedidos e 10 minutos depois há uma só transação em andamento');
 // REST diagnostics read the server root once per interval, never resend the transaction.
 ({env,a}=await fixture());a.c.__testFB.myWrites={'w-meu-antigo':1};
 prazo(a,90000).fn();await tick();
 assert.equal(env.fetches,1);assert.ok(env.ultimoFetch.url.endsWith('/documents/workspaces/agracta'));
 assert.equal(env.ultimoFetch.opts.headers.Authorization,'Bearer tk');assert.equal(env.pulls,0);
 assert.ok(/servidor não confirma/i.test(a.badges.at(-1)));
 env.raiz={rev:4,writeId:'w-meu-antigo'};prazo(a,60000).fn();await tick();assert.equal(env.pulls,0);
 env.raiz={rev:5,writeId:'w-do-pc'};prazo(a,60000).fn();await tick();assert.equal(env.pulls,1);
 prazo(a,60000).fn();await tick();prazo(a,60000).fn();await tick();
 assert.equal(env.pulls,1,'a mesma revisão alheia não é relida');assert.equal(env.fetches,5);assert.equal(env.attempts.length,1);
 a.c.document.visibilityState='hidden';prazo(a,60000).fn();await tick();assert.equal(env.fetches,5);
 const quota=await fixture({fetchStatus:true});prazo(quota.a,90000).fn();await tick();assert.ok(/servidor sem cota/i.test(quota.a.badges.at(-1)));
 const offline=await fixture({fetchFalha:new TypeError('Failed to fetch')});prazo(offline.a,90000).fn();await tick();assert.ok(/sem conexão com o servidor/i.test(offline.a.badges.at(-1)));
 // The late confirmation completes that exact transaction, then sends queued edits once.
 ({env,a}=await fixture());const firstRev=env.docs[root].rev;
 prazo(a,90000).fn();await tick();edit(a,'T1R2',99,500);a.c.cloudSave();a.c.cloudSave();
 assert.equal(env.attempts.length,1);env.beforeCommit=null;env.release();await withDeadline(env.sending,'confirmação tardia');
 assert.equal(env.commits.length,2);assert.equal(env.docs[root].rev,firstRev+2);
 assert.equal(a.c._syncParado,false);assert.ok(!a.c.__testFB.espera);assert.ok(!prazo(a,60000));
 // Pure console interception is checked independently, with no real console mutation.
 const src=fs.readFileSync('firebase-sync.js','utf8'),start=src.indexOf('  function _registraQueixa('),end=src.indexOf('  function firebaseInit(');
 const output=[],c={FB:{},Array,String,Date,console:{error:(...x)=>output.push(x),warn:(...x)=>output.push(x),log(){}}};
 vm.createContext(c);vm.runInContext(src.slice(start,end),c);vm.runInContext('_escutarQueixasDoSdk();_escutarQueixasDoSdk();',c);
 c.console.error('@firebase/firestore:','Firestore (12.15.0): FirebaseError: [code=resource-exhausted]: Quota exceeded.');
 assert.ok(c.FB.queixas.cota>0);assert.equal(output.length,1);
 c.console.warn('@firebase/firestore:','Firestore (12.15.0): Could not reach Cloud Firestore backend. Connection failed 1 times.');
 assert.ok(c.FB.queixas.rede>0);
 c.console.error('[Agracta Firebase] gravação:','resource-exhausted');assert.equal(Object.keys(c.FB.queixas).length,2);
 console.log('Envio lento: tranca 15/90s, causa visível, REST sem duplicação, confirmação tardia e captura do SDK OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
