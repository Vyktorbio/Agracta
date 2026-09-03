/* Leitura de nuvem que falha não pode virar "já li a nuvem".
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O `.single()` do Supabase RESOLVE a promessa com {data:null, error:{…}} quando a
 * rede pisca ou a linha não vem — ele não rejeita. O `cloudPull` tratava isso como
 * leitura boa e marcava `_cloudInitDone`, e a partir daí três coisas davam errado
 * ao mesmo tempo:
 *
 *   1. O SELO MENTIA. Pintava "salvo" sem nada ter sido lido — quem está no campo
 *      com sinal ruim via o app afirmar que estava tudo em dia.
 *   2. A GRAVAÇÃO FICAVA LIBERADA. Com a nuvem "vazia", o _cloudSaveAttempt grava o
 *      estado local por cima dela SEM MERGE. Um aparelho com dado parcial podia
 *      empurrar o próprio estado para todo mundo.
 *   3. O RETRY SE DESLIGAVA. A releitura cuidadosa do cloudStart desiste assim que
 *      vê _cloudInitDone — ou seja, o mecanismo que existe exatamente para este
 *      caso era desarmado pelo próprio caso.
 *
 * O cloudStart sempre conferiu `res.error`. O cloudPull não conferia. Este teste
 * cobra a simetria.
 *
 * Rodar: node test_sync_leitura_falha.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei a função '+nome+' em app.js');
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function gira(){ return new Promise(function(r){ setImmediate(function(){ setImmediate(r); }); }); }

var selos=[], salvouNuvem=0, aplicou=[];
/* Só o suficiente da cadeia .from().select().eq().single() do Supabase. */
function supabaseFalso(single){
  return { from:function(){ return { select:function(){ return { eq:function(){
    return { single:single };
  } }; } }; } };
}
function contexto(resposta){
  selos=[]; salvouNuvem=0; aplicou=[];
  var ctx={
    console:console, Promise:Promise, Date:Date, String:String, Number:Number,
    Object:Object, Array:Array, JSON:JSON, setTimeout:setTimeout, clearTimeout:clearTimeout,
    SB:supabaseFalso(function(){ return Promise.resolve(resposta); }),
    cloudInit:function(){ return true; },
    cloudBadge:function(k){ selos.push(k); },
    cloudApply:function(st){ aplicou.push(st); },
    cloudMerge:function(a){ return a; },
    cloudState:function(){ return {data:{}}; },
    cloudSave:function(){ salvouNuvem++; },
    cloudSaveSoon:function(){ salvouNuvem++; },
    data:{Q1:{estudos:[]}},
    _unsavedChanges:false,
    _cloudInitDone:false
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  /* O contador é DO CONTEXTO: um timer pendente de um cenário anterior não pode
     pingar no contador do seguinte — foi o que me enganou na primeira rodada. */
  ctx._rearmou=0;
  ctx.window._cloudInitRetry=function(){ ctx._rearmou++; };
  vm.createContext(ctx);
  vm.runInContext([pega('_cloudPullFalhou'), pega('cloudPull')].join('\n'), ctx);
  return ctx;
}

(async function(){

  console.log('\n--- O BUG: leitura que resolve COM ERRO ---');
  /* É assim que o Supabase entrega uma leitura falha: promessa resolvida. */
  var c=contexto({data:null, error:{message:'network error'}});
  c.cloudPull(); await gira();
  eq(c._cloudInitDone, false, 'NÃO marca que a nuvem foi lida');
  eq(selos[selos.length-1], 'offline', 'e o selo diz offline, não "salvo"');
  ck(selos.indexOf('saved')<0, 'em nenhum momento pinta "salvo" — o selo não mente');
  eq(salvouNuvem, 0, 'não libera gravação por cima de uma nuvem que não foi lida');
  eq(aplicou.length, 0, 'e não aplica estado nenhum');

  console.log('\n--- E rearma a releitura cuidadosa, que o bug desligava ---');
  await new Promise(function(r){ setTimeout(r, 1700); });
  eq(c._rearmou, 1, 'a releitura com espera crescente volta a rodar');

  console.log('\n--- Promessa REJEITADA continua tratada ---');
  var c2=contexto(null);
  c2.SB=supabaseFalso(function(){ return Promise.reject(new Error('rede')); });
  c2.cloudPull(); await gira();
  eq(c2._cloudInitDone, false, 'rejeição também não marca leitura');
  eq(selos[selos.length-1], 'offline', 'e também pinta offline');

  console.log('\n--- Leitura BOA segue funcionando como sempre ---');
  var bom={data:{state:{data:{Q1:{estudos:[{id:'E1'}]}}, rev:7}}, error:null};
  var c3=contexto(bom);
  c3.cloudPull(); await gira();
  eq(c3._cloudInitDone, true, 'leitura com dado marca que a nuvem foi lida');
  eq(aplicou.length, 1, 'aplica o estado que veio');
  eq(selos[selos.length-1], 'saved', 'e o selo pode dizer salvo, porque agora é verdade');

  console.log('\n--- Leitura boa COM pendência local empurra o merge ---');
  var c4=contexto(bom); c4._unsavedChanges=true;
  c4.cloudPull(); await gira();
  eq(c4._cloudInitDone, true, 'marca leitura');
  eq(salvouNuvem, 1, 'e agenda a subida do merge — o que foi digitado aqui não se perde');

  console.log('\n--- Nuvem vazia: não semeia a partir de aparelho sem dado ---');
  /* Semear daqui empurraria um estado pobre por cima do de todo mundo. */
  var c5=contexto({data:{state:{}}, error:null});
  c5.data={};
  c5.cloudPull(); await gira();
  eq(c5._cloudInitDone, false, 'aparelho sem dado real não vira fonte da verdade');
  eq(salvouNuvem, 0, 'e não grava nada');

  console.log('\n--- Nuvem vazia COM dado local real e pendente: aí sim semeia ---');
  var c6=contexto({data:{state:{}}, error:null});
  c6._unsavedChanges=true;
  c6.cloudPull(); await gira();
  eq(c6._cloudInitDone, true, 'a primeira carga real da organização pode subir');
  eq(salvouNuvem, 1, 'e sobe');

  console.log('\n--- Depois de uma leitura boa, a rede piscar não rearma nada ---');
  var c7=contexto({data:null, error:{message:'timeout'}});
  c7._cloudInitDone=true;
  c7.cloudPull(); await gira();
  await new Promise(function(r){ setTimeout(r, 1700); });
  eq(c7._cloudInitDone, true, 'o que já foi lido continua lido');
  eq(c7._rearmou, 0, 'e a releitura inicial não é rearmada à toa');
  eq(selos[selos.length-1], 'offline', 'só o selo avisa que a rede caiu');

  console.log('');
  if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
  console.log('todas as '+p+' checagens passaram');
})();
