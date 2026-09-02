/* Concordância entre dois avaliadores (roadmap §10).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Severidade de doença, nota de fitotoxicidade, escala de dano são leituras humanas,
 * e leitura humana varia. A pergunta de um ensaio sob BPL não é "qual dos dois está
 * certo", é "o quanto eles concordam, e o que isso faz com o resultado".
 *
 * A LINHA QUE ESTE TESTE GUARDA COM MAIS CUIDADO:
 *
 *     CORRELAÇÃO NÃO É CONCORDÂNCIA.
 *
 * Se B lê sempre o DOBRO do que A lê, o r de Pearson entre eles é 1,000 — perfeito —
 * e a concordância é péssima. Reportar só o r é o jeito clássico de declarar
 * concordância excelente onde não existe nenhuma. Há um golden test inteiro para
 * esse caso, e um aviso no motor que precisa continuar disparando.
 *
 * E: LEITURA CEGA TEM DE SER CEGA. Enquanto A avalia, os valores de B não podem
 * chegar à tela — nem escurecidos, nem escondidos por CSS. Cegamento que se derrota
 * rolando a tela é enfeite que faz o estudo parecer mais rigoroso do que é.
 *
 * Rodar: node test_concordancia.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var C=require('./vendor/concordancia-core.js');

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
function perto(a,b,tol,n){ var ok=(a!=null&&isFinite(a)&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* ============================================================================== */
console.log('\n--- GOLDEN TEST do ICC(2,1), conferido à mão ---');
/* 4 parcelas, 2 avaliadores.  A: 10 20 30 40   B: 12 22 28 42
   médias de linha 11 21 29 41 · geral 25,5 · médias de coluna A=25 B=26
   SST = 974 · SSR = 2×483 = 966 · SSC = 4×0,5 = 2 · SSE = 6
   MSR = 966/3 = 322 · MSC = 2 · MSE = 6/3 = 2
   ICC = (322−2) / (322 + 1×2 + 2×(2−2)/4) = 320/324 = 0,987654 */
var ps=[{a:10,b:12},{a:20,b:22},{a:30,b:28},{a:40,b:42}];
perto(C.icc(ps),320/324,1e-12,'ICC = 320/324 = 0,987654');

console.log('\n--- GOLDEN TEST de Pearson ---');
/* Σ dA·dB = 480 · Σ dA² = 500 · Σ dB² = 472
   r = 480 / √(500×472) = 480/√236000 = 0,988064 */
perto(C.pearson(ps),480/Math.sqrt(236000),1e-12,'r = 480/√236000 = 0,988064');

console.log('\n--- GOLDEN TEST de Bland-Altman ---');
/* diferenças A−B: −2 −2 +2 −2 · média −1,0
   desvios de −1: −1 −1 +3 −1 · quadrados 1 1 9 1 = 12 · /3 = 4 · dp = 2
   limites: −1 ± 1,96×2 = −4,92 a 2,92 */
var d=C.diferencaMedia(ps);
perto(d.media,-1,1e-12,'viés = −1,0 (B lê 1 acima de A)');
perto(d.dp,2,1e-12,'dp das diferenças = 2');
perto(d.limiteInferior,-4.92,1e-12,'limite inferior −4,92');
perto(d.limiteSuperior,2.92,1e-12,'limite superior 2,92');
/* Quatro diferencas de modulo 2 (tres negativas, uma positiva): no empate vale a
   primeira encontrada. O que se leva para a discussao e o TAMANHO. */
perto(Math.abs(d.maiorDiferenca),2,1e-12,'e a maior diferença individual, em módulo');

console.log('\n--- CORRELAÇÃO NÃO É CONCORDÂNCIA (o teste que mais importa) ---');
/* B lê SEMPRE o dobro de A. Associação perfeita, concordância péssima.
   médias de linha 15 30 45 60 · geral 37,5 · colunas A=25 B=50
   SST = 3750 · SSR = 2250 · SSC = 1250 · SSE = 250
   MSR = 750 · MSC = 1250 · MSE = 250/3
   ICC = (750 − 83,333) / (750 + 83,333 + 2×(1250−83,333)/4) = 666,667/1416,667 = 8/17 */
var dobro=[{a:10,b:20},{a:20,b:40},{a:30,b:60},{a:40,b:80}];
perto(C.pearson(dobro),1,1e-12,'r = 1,000 — associação PERFEITA');
perto(C.icc(dobro),8/17,1e-12,'ICC = 8/17 = 0,4706 — concordância ruim');
ck(C.pearson(dobro)-C.icc(dobro)>0.5,'e a distância entre os dois é enorme');

var rel=C.concordancia({p1:10,p2:20,p3:30,p4:40},{p1:20,p2:40,p3:60,p4:80},
                       ['p1','p2','p3','p4'],{escala:'continua'});
ck(rel.avisos.some(function(a){ return /viés sistemático/.test(a); }),
   'e o motor AVISA que é viés sistemático, em vez de exibir o r e calar');
ck(rel.avisos.some(function(a){ return /Correlação alta aqui não é concordância/.test(a); }),
   'dizendo com todas as letras que r alto ali não é concordância');

console.log('\n--- GOLDEN TEST do kappa ponderado ---');
/* Notas 0,1,2 em 6 parcelas.  A: 0 0 1 1 2 2   B: 0 1 1 1 2 2
   concordância observada Po = 5/6 · esperada Pe = (2×1 + 2×3 + 2×2)/36 = 1/3
   kappa simples = (5/6 − 1/3) / (1 − 1/3) = 0,5/0,6667 = 0,75 */
var ord=[{a:0,b:0},{a:0,b:1},{a:1,b:1},{a:1,b:1},{a:2,b:2},{a:2,b:2}];
perto(C.kappa(ord,'nenhum'),0.75,1e-12,'kappa simples = 0,75');
/* Ponderado: o único erro é de 1 classe, o mais leve possível — sobe. */
ck(C.kappa(ord,'linear')>C.kappa(ord,'nenhum'),
   'o ponderado é MAIOR: errar de 0 para 1 não é o mesmo que errar de 0 para 5');
ck(C.kappa(ord,'quadratico')>C.kappa(ord,'linear'),'e o quadrático pune ainda menos o erro vizinho');

console.log('\n--- Recusa em vez de número sem significado ---');
/* Abaixo de 3 pares, o número teria a mesma cara de um número bom. */
eq(C.icc([{a:1,b:1},{a:2,b:2}]),null,'ICC com 2 pares é null');
eq(C.kappa([{a:1,b:1},{a:2,b:2}]),null,'kappa com 2 pares é null');
eq(C.pearson([{a:1,b:1},{a:2,b:2}]),null,'r com 2 pares é null');
/* Avaliador que deu a mesma nota a tudo: r indefinido, não zero. */
eq(C.pearson([{a:5,b:1},{a:5,b:2},{a:5,b:3}]),null,'r é null quando um dos dois não variou');
eq(C.kappa([{a:1,b:1},{a:1,b:1},{a:1,b:1}]),null,'kappa é null quando todos deram a mesma nota');
/* ICC negativo é ruído de estimação, não "concordância negativa". */
ck(C.icc([{a:1,b:9},{a:9,b:1},{a:5,b:5}])>=0,'ICC nunca sai negativo');

console.log('\n--- Parcela com uma leitura só não vira concordância ---');
var meio=C.concordancia({p1:10,p2:20,p3:30,p4:40,p5:50},{p1:12,p2:22,p3:28,p4:42},
                        ['p1','p2','p3','p4','p5'],{escala:'continua'});
eq(meio.n,4,'só os 4 pares completos entram');
eq(meio.soA,1,'e a parcela que só A avaliou vai CONTADA');
ck(meio.avisos.some(function(a){ return /ficaram de fora/.test(a); }),'com aviso na tela');
var pouco=C.concordancia({p1:1,p2:2},{p1:1,p2:2},['p1','p2'],{escala:'continua'});
eq(pouco.icc,null,'com 2 parcelas, nenhuma medida é calculada');
ck(pouco.avisos.some(function(a){ return /pelo menos 3/.test(a); }),'e o motor diz por quê');

console.log('\n--- A escala é DECLARADA, não adivinhada ---');
/* Kappa em severidade contínua não significa nada; ICC em nota de 3 classes,
   pouco. Por isso quem chama diz qual é. */
var cont=C.concordancia({p1:10,p2:20,p3:30,p4:40},{p1:12,p2:22,p3:28,p4:42},
                        ['p1','p2','p3','p4'],{escala:'continua'});
eq(cont.kappa,null,'em escala contínua, kappa NÃO é calculado');
eq(cont.principal,'icc','e a medida que manda é o ICC');
var ordi=C.concordancia({p1:0,p2:0,p3:1,p4:1,p5:2,p6:2},{p1:0,p2:1,p3:1,p4:1,p5:2,p6:2},
                        ['p1','p2','p3','p4','p5','p6'],{escala:'ordinal'});
ck(ordi.kappa!=null,'em escala ordinal, kappa é calculado');
eq(ordi.principal,'kappa','e é ele que manda');
eq(ordi.kappaPesos,'linear','ponderado por padrão, porque erro vizinho não é erro distante');

console.log('\n--- Zero é leitura, vazio é ausência ---');
/* Zero em severidade é uma parcela SADIA — dado, não falta de dado. */
var comZero=C.pares({p1:0,p2:5},{p1:0,p2:5},['p1','p2']);
eq(comZero.n,2,'zero entra como par válido');
var comVazio=C.pares({p1:'',p2:5},{p1:3,p2:5},['p1','p2']);
eq(comVazio.n,1,'string vazia não');
eq(comVazio.soB,1,'e conta como leitura só de B');

/* ============================ camada do app ================================= */
console.log('\n--- LEITURA CEGA: os valores do outro não chegam à tela ---');
var ctx={ console:console, String:String, Number:Number, Math:Math, JSON:JSON, Object:Object,
  Array:Array, isFinite:isFinite, Date:Date, parseInt:parseInt, ConcordanciaCore:C,
  normalizeStudy:function(s){ return s; },
  /* Rotulos de parcela: so a CHAVE importa para a concordancia. */
  _repLetter:function(r){ return String(r); }, _repDisplay:function(r){ return String(r); },
  _campoCode:function(t,r){ return t+'-'+r; },
  ensureStudyRandomizacao:function(s){ return {ordem:[]}; } };
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  "var AV_AVALIADORES=['A','B']; var _avQuem=null;",
  pega('avDupla'), pega('avAvaliadores'), pega('avQuemAtivo'), pega('avSetQuem'),
  pega('avNotasVisiveis'), pega('avConsolidar'), pega('_avNum'),
  pega('avEscalaDaVariavel'), pega('avConcordancia'),
  pega('_avRowKey'), pega('_avRowsForStudy')
].join('\n'), ctx);

var AV={id:'av1', duplaLeitura:true, tipos:{sev:'pct'}, avaliadores:{
  A:{nome:'Ana', notas:{T1R1:{sev:'10'},T1R2:{sev:'20'},T2R1:{sev:'30'},T2R2:{sev:'40'}}},
  B:{nome:'Bruno', notas:{T1R1:{sev:'12'},T1R2:{sev:'22'},T2R1:{sev:'28'},T2R2:{sev:'42'}}}
}};
ctx.avSetQuem('A');
var vis=ctx.avNotasVisiveis(AV);
eq(vis.T1R1.sev,'10','com A na prancheta, a grade lê as notas de A');
/* O objeto que a grade recebe É o de A. Os valores de B não estão nele — não há o
   que escurecer nem o que esconder, porque não chegaram. */
ck(vis!==AV.avaliadores.B.notas,'e o mapa devolvido NÃO é o de B');
eq(Object.keys(vis).map(function(k){return vis[k].sev;}).join(','),'10,20,30,40',
   'nenhum valor de B aparece no que a grade recebe');
ctx.avSetQuem('B');
eq(ctx.avNotasVisiveis(AV).T1R1.sev,'12','com B, o inverso');
ctx.avSetQuem(null);
var semQuem=ctx.avNotasVisiveis(AV);
ck(semQuem!==AV.avaliadores.A.notas && semQuem!==AV.avaliadores.B.notas,
   'sem avaliador ativo, a grade NÃO recebe a leitura de nenhum dos dois');
ck(!/style="display:none"[^>]*avaliador|opacity[^;]*avaliador/.test(src),
   'e o cegamento não é feito por CSS em lugar nenhum');

console.log('\n--- Consolidar é a MÉDIA, e vai marcada como derivada ---');
var org=ctx.avConsolidar(AV);
eq(AV.notas.T1R1.sev,11,'(10 + 12) / 2 = 11');
eq(AV.notas.T2R2.sev,41,'(40 + 42) / 2 = 41');
eq(org.tipo,'media-dois-avaliadores','a origem do número consolidado fica registrada');
eq(org.comDuas,4,'com quantas parcelas tiveram as duas leituras');
/* Parcela que só um avaliou fica com o valor dele: descartar perderia dado real, e
   inventar a segunda leitura seria muito pior. */
AV.avaliadores.A.notas.T3R1={sev:'50'};
var org2=ctx.avConsolidar(AV);
eq(AV.notas.T3R1.sev,50,'parcela com uma leitura só fica com o valor que existe');
eq(org2.comUma,1,'e isso vai contado');

console.log('\n--- A escala vem do tipo que o estudo já declarou ---');
eq(ctx.avEscalaDaVariavel({tipos:{x:'pct'}},'x'),'continua','pct é contínua');
eq(ctx.avEscalaDaVariavel({tipos:{x:'razao'}},'x'),'continua','razao também');
eq(ctx.avEscalaDaVariavel({tipos:{x:'contagem'}},'x'),'continua','contagem também');
eq(ctx.avEscalaDaVariavel({tipos:{x:'escala'}},'x'),'ordinal','nota de classe é ordinal');

console.log('\n--- A concordância da avaliação junta tudo ---');
var STUDY={id:'s1', numRepeticoes:2, tratamentos:[{id:'T1'},{id:'T2'}]};
var r=ctx.avConcordancia(STUDY, AV, 'sev');
eq(r.n,4,'quatro parcelas com as duas leituras');
perto(r.icc,320/324,1e-9,'e o ICC é o mesmo do golden test');
eq(r.nomeA,'Ana','com o nome de quem avaliou');
eq(r.nomeB,'Bruno','dos dois');
eq(r.escala,'continua','e a escala derivada do tipo da variável');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
