/* Observações de campo aparecem no estudo a que pertencem.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A nota de scouting já nasce sabendo em que quadra está — o app resolve isso pela
 * geometria na hora de criar. Faltava o caminho de volta: o cartão do estudo não
 * sabia que alguém registrou "mancha de ferrugem no canto leste" no meio do ensaio.
 * E é exatamente esse o contexto que falta quando uma avaliação sai fora da curva.
 *
 * Três coisas precisam continuar valendo:
 *
 *  1. O RECORTE É QUADRA + PERÍODO. A quadra tem observações de anos; só as do
 *     intervalo do estudo dizem alguma coisa sobre ele. Sem recorte, vira ruído e
 *     ninguém lê.
 *  2. ESTUDO SEM DATA DE INÍCIO NÃO LISTA NADA. Melhor nenhuma lista do que a
 *     história inteira da quadra apresentada como se fosse do ensaio.
 *  3. NOTA APAGADA NÃO VOLTA. A lápide de exclusão vale aqui como em todo o resto.
 *
 * Rodar: node test_notas_estudo.js
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

var ctx={console:console, String:String, Array:Array, Object:Object, Date:Date,
  ensureNotas:function(){},
  todayISO:function(){ return '2026-09-03'; },
  estudoFinalizado:function(s){ return !!(s&&s.finalizado); },
  _delNotas:{}};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(pega('notasDoEstudo'), ctx);

ctx.NOTAS_CAMPO=[
  {id:'n1', quadraId:'Q1', criadoEm:'2026-06-01', titulo:'Antes do ensaio'},
  {id:'n2', quadraId:'Q1', criadoEm:'2026-07-10', titulo:'Mancha no canto leste', severidade:'alta'},
  {id:'n3', quadraId:'Q1', criadoEm:'2026-08-02', titulo:'Falha de estande', resolvido:true},
  {id:'n4', quadraId:'Q2', criadoEm:'2026-07-12', titulo:'Outra quadra'},
  {id:'n5', quadraId:'Q1', criadoEm:'2026-12-20', titulo:'Depois do fim'},
  {id:'n6', quadraId:'Q1', criadoEm:'', titulo:'Sem data'}
];
/* Ensaio finalizado: 01/07 a 15/08. */
var estudo={id:'s1', dataInicio:'2026-07-01', finalizado:true,
  aplicacoes:[{id:'a1', data:'2026-07-05'}], avaliacoes:[{id:'v1', data:'2026-08-15'}]};

console.log('\n--- O recorte é quadra + período ---');
var r=ctx.notasDoEstudo('Q1', estudo);
eq(r.length, 2, 'só as duas notas da quadra dentro do período');
eq(r.map(function(n){return n.id;}).join(','), 'n3,n2', 'mais recente primeiro');
ck(!r.some(function(n){return n.id==='n1';}), 'a de antes do início fica de fora');
ck(!r.some(function(n){return n.id==='n5';}), 'a de depois do fim também');
ck(!r.some(function(n){return n.id==='n4';}), 'e a de outra quadra nunca entra');
ck(!r.some(function(n){return n.id==='n6';}), 'nota sem data não é encaixada a palpite');

console.log('\n--- Ensaio em andamento vale até hoje ---');
var andando={id:'s2', dataInicio:'2026-07-01', aplicacoes:[{id:'a1', data:'2026-07-05'}], avaliacoes:[]};
var r2=ctx.notasDoEstudo('Q1', andando);
eq(r2.length, 2, 'pega o que veio até hoje');
ck(!r2.some(function(n){return n.id==='n5';}), 'mas não o que ainda está no futuro');

console.log('\n--- Sem data de início, não se lista nada ---');
/* Melhor nenhuma lista do que a historia inteira da quadra apresentada como se
   fosse do ensaio. */
eq(ctx.notasDoEstudo('Q1', {id:'s3', aplicacoes:[], avaliacoes:[]}).length, 0,
   'estudo sem início não puxa observação nenhuma');

console.log('\n--- Nota apagada não volta ---');
ctx._delNotas={n2:Date.now()};
var r3=ctx.notasDoEstudo('Q1', estudo);
eq(r3.length, 1, 'a lápide de exclusão vale aqui também');
eq(r3[0].id, 'n3', 'e sobra a que não foi apagada');
ctx._delNotas={};

console.log('\n--- Nada quebra sem quadra, sem estudo ou sem notas ---');
eq(ctx.notasDoEstudo(null, estudo).length, 0, 'sem quadra, lista vazia');
eq(ctx.notasDoEstudo('Q1', null).length, 0, 'sem estudo, lista vazia');
ctx.NOTAS_CAMPO=[];
eq(ctx.notasDoEstudo('Q1', estudo).length, 0, 'sem notas, lista vazia');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
