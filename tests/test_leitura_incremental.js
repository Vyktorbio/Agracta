/* Leitura incremental: o aparelho lê só o que mudou, e na dúvida lê tudo.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * 19/10/2026, 10h: "não subiu (resource-exhausted)". A cota diária de leituras
 * do plano gratuito do Firebase acabou de manhã e ninguém sincronizava. Cada
 * gravação de qualquer pessoa fazia cada aparelho aberto reler o banco INTEIRO,
 * e cada abertura do app também.
 *
 * Aqui se confere, com o adaptador real e um Firestore falso que conta leituras
 * como o Firebase cobra (um por documento devolvido):
 *   1. depois da gravação de um colega, o aparelho lê a raiz, os registros do
 *      histórico daquela revisão e só os documentos citados — e chega ao MESMO
 *      estado que a leitura completa;
 *   2. exclusão feita por outro aparelho também chega pela leitura incremental;
 *   3. reabrir o app usa a cópia guardada no aparelho (2 leituras, não o banco);
 *   4. volta à leitura completa quando falta registro de alguma revisão, quando
 *      a consulta é recusada, quando há registros demais, quando a cópia é de
 *      outro login e quando a última leitura completa passou de 24 h;
 *   5. sair da conta apaga a cópia guardada.
 *
 * Rodar: node tests/test_leitura_incremental.js
 */
'use strict';
const {initial,database,client,seed,av,edit,root,clone}=require('./test_sync_envio_pendente.js');

let f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

function stable(v){
  if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
  return JSON.stringify(v);
}
/* O que está no servidor, só os dados (sem raiz e sem histórico). */
function servidor(env){
  const flat={};
  Object.entries(env.docs).forEach(([k,v])=>{
    const parts=k.slice(root.length+1).split('/');
    if(parts.length===2&&parts[0]!=='historico'&&parts[0]!=='members'&&parts[0]!=='politica')(flat[parts[0]]||={})[parts[1]]=v;
  });
  return flat;
}
function semVazias(flat){const o={};Object.keys(flat||{}).forEach(c=>{if(Object.keys(flat[c]||{}).length)o[c]=flat[c];});return o;}
function espelho(env,c){return stable(semVazias(c.__testFB.remoteFlat))===stable(semVazias(servidor(env)));}
function comNotas(n){const st=initial();st.notas_campo=Array.from({length:n},(_,i)=>({id:'N'+i,titulo:'Nota '+i,_ts:10}));return st;}
async function cacheGravado(c){for(let i=0;i<20&&c.__testFB.cacheRemotoGravando;i++)await c.__testFB.cacheRemotoGravando;}
function mesmoAparelho(de,env,st){const n=client(env.db,st);n.c.indexedDB=de.c.indexedDB;return n;}
/* Gravação de fora, sem registro no histórico: app antigo ou a faxina das fotos. */
function gravacaoSemHistorico(env){env.docs[root+'/notas_campo/externa']={id:'externa',data:{id:'externa',titulo:'de fora',_ts:20}};env.docs[root].rev++;env.docs[root].writeId='fora-'+env.docs[root].rev;}

(async function(){
  const N=200;

  console.log('\n--- Gravação de um colega: lê só o que mudou ---');
  const env=database(),a=client(env.db,comNotas(N)),b=client(env.db,comNotas(N));seed(env,a.c,comNotas(N));
  await a.c.cloudPull();await b.c.cloudPull();
  eq(a.c.__testFB.ultimaLeitura,'completa','a primeira leitura do aparelho é completa');
  const completa=env.docReads;
  edit(b,'T1R1',7,1000);await b.c.cloudSave();
  let commits=env.commits.length;
  let antes=env.docReads;await a.c.cloudPull();const custo=env.docReads-antes;
  eq(env.commits.length,commits,'receber não provoca gravação de eco');
  eq(a.c.__testFB.ultimaLeitura,'incremental','depois da gravação do colega, a leitura é incremental');
  eq(av(a.state).notas.T1R1.v,7,'e o lançamento do colega chega');
  ck(espelho(env,a.c),'a cópia do servidor no aparelho é idêntica à do banco');
  ck(custo<=6,'custa poucas leituras ('+custo+'), não o banco inteiro');
  ck(custo*20<completa,'mais de 20x menos que a leitura completa ('+custo+' contra ~'+Math.round(completa/2)+' por aparelho)');
  const q=env.queries.filter(x=>x.colecao==='historico').pop();
  ck(!!q&&q.filters.some(x=>x[0]==='rev'&&x[1]==='>')&&q.filters.some(x=>x[0]==='rev'&&x[1]==='<='),'consulta o histórico pela faixa de revisões que faltam');

  console.log('\n--- Várias gravações seguidas, de aparelhos diferentes ---');
  edit(b,'T1R2',8,1100);await b.c.cloudSave();
  b.state.notas_campo.push({id:'NOVA',titulo:'Nota nova do colega',_ts:1200});b.c._unsavedChanges=true;await b.c.cloudSave();
  edit(b,'T1R1',9,1300);await b.c.cloudSave();
  commits=env.commits.length;
  antes=env.docReads;await a.c.cloudPull();
  eq(env.commits.length,commits,'receber três revisões não provoca gravação de eco');
  eq(a.c.__testFB.ultimaLeitura,'incremental','três revisões atrasadas ainda vão pela incremental');
  eq(av(a.state).notas.T1R2.v,8,'a primeira chega');
  ck(a.state.notas_campo.some(n=>n.id==='NOVA'),'o documento criado pelo colega chega');
  eq(av(a.state).notas.T1R1.v,9,'e a última vale');
  ck(espelho(env,a.c),'cópia idêntica ao banco');
  ck(env.docReads-antes<15,'com poucas leituras ('+(env.docReads-antes)+')');

  console.log('\n--- Exclusão feita noutro aparelho chega pela incremental ---');
  const idNova=Object.keys(servidor(env).notas_campo).find(k=>servidor(env).notas_campo[k].data&&servidor(env).notas_campo[k].data.id==='NOVA'||k==='NOVA');
  b.state.notas_campo=b.state.notas_campo.filter(n=>n.id!=='NOVA');b.state._deletedNotas=Object.assign({},b.state._deletedNotas,{NOVA:1400});
  b.c._unsavedChanges=true;await b.c.cloudSave();
  ck(!!idNova&&!env.docs[root+'/notas_campo/'+idNova],'o colega apagou o documento no servidor');
  commits=env.commits.length;
  await a.c.cloudPull();
  eq(env.commits.length,commits,'receber a exclusão não provoca gravação de eco');
  eq(a.c.__testFB.ultimaLeitura,'incremental','a leitura foi incremental');
  ck(!a.state.notas_campo.some(n=>n.id==='NOVA'),'e a nota apagada sai daqui também');
  ck(!idNova||!a.c.__testFB.remoteFlat.notas_campo[idNova],'e da cópia do servidor');
  ck(espelho(env,a.c),'cópia idêntica ao banco');

  console.log('\n--- Revisão sem registro no histórico: lê tudo ---');
  gravacaoSemHistorico(env);
  await a.c.cloudPull();
  eq(a.c.__testFB.ultimaLeitura,'completa','sem o registro de uma revisão, volta à leitura completa');
  ck(a.state.notas_campo.some(n=>n.id==='externa'),'e não perde a gravação de fora');
  ck(espelho(env,a.c),'cópia idêntica ao banco');

  console.log('\n--- Reabrir o app: usa a cópia guardada no aparelho ---');
  await cacheGravado(a.c);
  const a2=mesmoAparelho(a,env,clone(a.state));
  antes=env.docReads;await a2.c.cloudPull();
  eq(a2.c.__testFB.ultimaLeitura,'cache','nada mudou: usa a cópia guardada');
  eq(env.docReads-antes,2,'só duas leituras da raiz, em vez do banco inteiro');
  edit(b,'T1R2',33,1500);await b.c.cloudSave();
  await cacheGravado(a2.c);
  const a3=mesmoAparelho(a2,env,clone(a2.state));
  antes=env.docReads;await a3.c.cloudPull();
  eq(a3.c.__testFB.ultimaLeitura,'incremental','com uma gravação nova, a reabertura lê só a diferença');
  eq(av(a3.state).notas.T1R2.v,33,'e recebe o colega');
  ck(env.docReads-antes<=6,'com poucas leituras ('+(env.docReads-antes)+')');
  ck(espelho(env,a3.c),'cópia idêntica ao banco');

  console.log('\n--- A própria gravação também atualiza a cópia guardada ---');
  edit(a3,'T1R1',44,1600);await a3.c.cloudSave();await cacheGravado(a3.c);
  const a4=mesmoAparelho(a3,env,clone(a3.state));
  antes=env.docReads;await a4.c.cloudPull();
  eq(a4.c.__testFB.ultimaLeitura,'cache','depois de gravar, reabrir não relê nada');
  eq(env.docReads-antes,2,'só as duas leituras da raiz');
  eq(av(a4.state).notas.T1R1.v,44,'e o que foi gravado está lá');

  console.log('\n--- Cópia guardada de OUTRO login não é usada ---');
  await cacheGravado(a4.c);
  const outro=mesmoAparelho(a4,env,initial());outro.c.__testFB.user={email:'outra@example.test'};
  await outro.c.cloudPull();
  eq(outro.c.__testFB.ultimaLeitura,'completa','outro login lê tudo, não herda a cópia');

  console.log('\n--- Leitura completa com mais de 24 h: lê tudo de novo ---');
  edit(b,'T1R1',55,1700);await b.c.cloudSave();
  a4.c.__testFB.completaEm=Date.now()-25*60*60*1000;
  await a4.c.cloudPull();
  eq(a4.c.__testFB.ultimaLeitura,'completa','rede de segurança diária: leitura completa');
  eq(av(a4.state).notas.T1R1.v,55,'com o dado do colega');
  ck(Date.now()-a4.c.__testFB.completaEm<60000,'e renova a marca da última leitura completa');

  console.log('\n--- Consulta recusada pelo servidor: lê tudo ---');
  edit(b,'T1R2',66,1800);await b.c.cloudSave();
  env.beforeQuery=async(n)=>{if(n==='historico')throw Object.assign(new Error('Missing or insufficient permissions.'),{code:'permission-denied'});};
  const r1=await a4.c.cloudPull();
  env.beforeQuery=null;
  eq(r1,true,'a leitura não falha');
  eq(a4.c.__testFB.ultimaLeitura,'completa','cai para a leitura completa');
  eq(av(a4.state).notas.T1R2.v,66,'e recebe o colega');

  console.log('\n--- Sem rede na consulta: falha como antes, sem marcar nada ---');
  edit(b,'T1R2',77,1900);await b.c.cloudSave();
  const revAntes=a4.c.__testFB.lastRev;
  env.beforeQuery=async(n)=>{if(n==='historico')throw Object.assign(new Error('sem rede'),{code:'unavailable'});};
  const r2=await a4.c.cloudPull();
  env.beforeQuery=null;
  eq(r2,false,'a leitura falha');
  eq(a4.c.__testFB.lastRev,revAntes,'a revisão conhecida não avança');
  await a4.c.cloudPull();
  eq(av(a4.state).notas.T1R2.v,77,'com a rede de volta, recebe');

  console.log('\n--- Registros demais: lê tudo ---');
  const env2=database(),c1=client(env2.db,comNotas(5)),c2=client(env2.db,comNotas(5));seed(env2,c1.c,comNotas(5));
  await c1.c.cloudPull();await c2.c.cloudPull();
  c2.state.notas_campo=Array.from({length:120},(_,i)=>({id:'M'+i,titulo:'Muitas '+i,_ts:50}));
  c2.c._unsavedChanges=true;await c2.c.cloudSave();
  await c1.c.cloudPull();
  eq(c1.c.__testFB.ultimaLeitura,'completa','mais registros que documentos na cópia: a completa sai mais barata');
  ck(espelho(env2,c1.c),'cópia idêntica ao banco');

  console.log('\n--- Sair da conta apaga a cópia guardada ---');
  await cacheGravado(a4.c);
  a4.c.closeMainMenu=function(){};a4.c.showAuthGate=function(){};
  a4.c.doLogout();
  for(let i=0;i<50;i++)await Promise.resolve();
  await new Promise(r=>setImmediate(r));
  ck(a4.c.__testFB.remoteFlat===null,'a cópia na memória some');
  const depois=mesmoAparelho(a4,env,initial());
  await depois.c.cloudPull();
  eq(depois.c.__testFB.ultimaLeitura,'completa','e quem entrar depois lê tudo');

  console.log('');
  if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
  console.log('todas as '+p+' checagens passaram');
  process.exit(0);
})().catch(function(e){ console.error(e); process.exit(1); });
