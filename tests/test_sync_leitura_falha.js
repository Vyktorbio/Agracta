/* Leitura de nuvem que falha não pode virar "já li a nuvem".
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Marcar `_cloudInitDone` depois de uma leitura que não aconteceu custa caro de
 * três maneiras ao mesmo tempo:
 *
 *   1. O SELO MENTE. Pinta "salvo" sem nada ter sido lido — quem está no campo
 *      com sinal ruim vê o app afirmar que está tudo em dia.
 *   2. A GRAVAÇÃO FICA LIBERADA por cima de uma nuvem que ninguém leu.
 *   3. O APARELHO VIRA "CONFIÁVEL" sem ter lido o workspace, e passa a abrir
 *      offline.
 *
 * Até a 19a publicação este arquivo testava o cloudPull do app.js, da época do
 * Supabase — código que o firebase-sync.js substituía na carga e que nunca
 * rodava. A garantia agora vale para o que roda: o cloudPull do Firebase, com o
 * adaptador real e um Firestore falso (test_sync_envio_pendente.js). Os casos de
 * "nuvem vazia" eram do blob único do Supabase e saíram com ele.
 *
 * Rodar: node tests/test_sync_leitura_falha.js
 */
'use strict';
const {initial,database,client,seed,remote,av,edit,root}=require('./test_sync_envio_pendente.js');

let f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

(async function(){

  console.log('\n--- Leitura que FALHA não é leitura ---');
  const env=database(),a=client(env.db,initial());seed(env,a.c,initial());
  a.c.__testFB.user.uid='u1';   /* login real tem uid: é ele que marca o aparelho */
  let aplicou=0;const aplicar=a.c.cloudApply;a.c.cloudApply=function(s){aplicou++;return aplicar(s);};
  eq(a.c._cloudInitDone,false,'aparelho recém-aberto ainda não leu a nuvem');
  env.offline=true;
  const r1=await a.c.cloudPull();
  eq(r1,false,'a leitura sem rede devolve false');
  eq(a.c._cloudInitDone,false,'e NÃO marca que a nuvem foi lida');
  ck(a.badges.length>0&&/sem sincroniza/.test(a.badges[a.badges.length-1]),'o selo diz que está sem sincronização');
  ck(a.badges.indexOf('saved')<0,'e em nenhum momento pinta "salvo" — o selo não mente');
  eq(env.commits.length,0,'nada é gravado por cima de uma nuvem que não foi lida');
  eq(aplicou,0,'e nenhum estado é aplicado');
  ck(!a.c.AgractaFirebase.trustedDevice(),'o aparelho não vira confiável para abrir offline');

  console.log('\n--- Leitura BOA marca, aplica e só então pinta "salvo" ---');
  env.offline=false;a.badges.length=0;
  const r2=await a.c.cloudPull();
  eq(r2,true,'a leitura devolve true');
  eq(a.c._cloudInitDone,true,'leitura com dado marca que a nuvem foi lida');
  ck(aplicou>0,'aplica o estado que veio');
  eq(a.badges[a.badges.length-1],'saved','e o selo pode dizer salvo, porque agora é verdade');
  ck(!!a.c.AgractaFirebase.trustedDevice(),'só agora o aparelho fica autorizado a abrir offline');

  console.log('\n--- Depois de uma leitura boa, a rede piscar não desfaz nada ---');
  env.offline=true;a.badges.length=0;
  const r3=await a.c.cloudPull();
  eq(r3,false,'a leitura falha');
  eq(a.c._cloudInitDone,true,'o que já foi lido continua lido');
  ck(/sem sincroniza/.test(a.badges[a.badges.length-1]||''),'só o selo avisa que a rede caiu');

  console.log('\n--- Leitura boa COM pendência local sobe o merge ---');
  env.offline=false;env.commits=[];
  edit(a,'T1R1',7,9999);
  await a.c.cloudPull();
  eq(env.commits.length,1,'a pendência sobe numa transação');
  eq(av(remote(env,a.c)).notas.T1R1.v,7,'e o que foi digitado aqui não se perde');
  ck(!!env.docs[root].rev,'com revisão publicada junto');

  console.log('');
  if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
  console.log('todas as '+p+' checagens passaram');
  process.exit(0);
})().catch(function(e){ console.error(e); process.exit(1); });
