/* A falha do cofre offline precisa aparecer.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Seis pontos do sincronizador mandavam a falha de gravação do cofre offline
 * (IndexedDB) só para o console. O estado da nuvem continua salvo, então não há
 * perda de dado — mas o cofre DESTE APARELHO fica defasado, e isso só se
 * descobre no campo, sem sinal. Que é o pior lugar possível para descobrir.
 *
 * O mesmo erro já aparecia na tela no caminho puramente offline ("falha ao
 * salvar neste aparelho"); era só no caminho com nuvem que ficava mudo.
 *
 * Três garantias:
 *
 *  1. A FALHA APARECE, e o texto diz a verdade inteira: a nuvem está em dia,
 *     o que não atualizou é o cofre local. Assustar sem razão é tão ruim quanto
 *     calar.
 *  2. O AVISO SOME SOZINHO quando o próximo checkpoint dá certo. Aviso que fica
 *     depois de resolvido ensina a ignorar avisos.
 *  3. COM A PÁGINA INDO EMBORA (pagehide, visibilitychange) não se pinta selo —
 *     não adianta — mas o estado defasado FICA REGISTRADO.
 *
 * Rodar: node test_cofre_falha.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('firebase-sync.js','utf8');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei '+n);
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var SELOS=[];
var ctx={ FB:{}, console:{error:function(){}},
          document:{hidden:false},
          cloudBadge:function(kind,txt){ SELOS.push([kind,txt||'']); } };
vm.createContext(ctx);
vm.runInContext([pega('checkpointFalhou'), pega('checkpointOk')].join('\n'),ctx);

console.log('\n--- Garantia 1: a falha aparece, e diz a verdade inteira ---');
SELOS=[]; ctx.FB={};
ctx.checkpointFalhou(new Error('QuotaExceededError'));
ck(SELOS.length===1,'um selo é pintado');
ck(SELOS[0][0]==='offline','no estado offline, não "error" — a nuvem não falhou');
ck(/cofre offline/i.test(SELOS[0][1]),'o texto nomeia o cofre: '+SELOS[0][1]);
ck(/nuvem em dia/i.test(SELOS[0][1]),'e diz que a NUVEM está em dia — assustar sem razão é tão ruim quanto calar');
ck(ctx.FB.cofreDefasado===true,'e o estado fica registrado');

console.log('\n--- Garantia 2: o aviso some quando volta a funcionar ---');
SELOS=[];
ctx.checkpointOk();
ck(SELOS.length===1 && SELOS[0][0]==='saved','o selo volta para "saved"');
ck(ctx.FB.cofreDefasado===false,'e o estado defasado é limpo');

console.log('\n--- E não repinta à toa quando nunca houve falha ---');
SELOS=[]; ctx.FB={};
ctx.checkpointOk();
ck(SELOS.length===0,'checkpoint que sempre deu certo não pinta nada');
ctx.checkpointOk();
ck(SELOS.length===0,'nem na segunda vez');

console.log('\n--- Garantia 3: página indo embora não pinta, mas registra ---');
SELOS=[]; ctx.FB={}; ctx.document.hidden=true;
ctx.checkpointFalhou(new Error('x'));
ck(SELOS.length===0,'com a página oculta, nenhum selo é pintado');
ck(ctx.FB.cofreDefasado===true,'mas o cofre defasado FICA registrado');
SELOS=[];
ctx.checkpointOk();
ck(SELOS.length===0,'e a recuperação também não pinta com a página oculta');
ck(ctx.FB.cofreDefasado===false,'embora limpe o estado');
ctx.document.hidden=false;

console.log('\n--- Selo quebrado não pode derrubar a gravação ---');
ctx.cloudBadge=function(){ throw new Error('DOM sumiu'); };
ctx.FB={};
var estourou=false;
try{ ctx.checkpointFalhou(new Error('y')); }catch(e){ estourou=true; }
ck(!estourou,'falha ao pintar o selo não propaga');
ck(ctx.FB.cofreDefasado===true,'e o estado ainda é registrado');
estourou=false;
try{ ctx.checkpointOk(); }catch(e){ estourou=true; }
ck(!estourou,'o mesmo na recuperação');

console.log('\n--- Nenhum ponto do sincronizador engole mais a falha ---');
ck(!/catch\(function\(e\)\{console\.error\('\[Agracta offline\] checkpoint:',e\);\}\)/.test(src),
   'o padrão que só logava no console sumiu do arquivo');
ck((src.match(/catch\(checkpointFalhou\)/g)||[]).length===6,
   'e os seis pontos passam pelo tratador');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
