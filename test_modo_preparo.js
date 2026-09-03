/* Modo Preparo: a calculadora que facilita em vez de complicar.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A tela tinha sete campos sempre abertos e todos os tratamentos empilhados
 * abaixo. Quem está na bancada quer duas coisas — QUANTO PREPARAR e QUANTO MEDIR
 * — e rolava a tela para achá-las entre configurações que quase nunca mudam.
 *
 * O critério de aceite é do autor: "as calculadoras precisam facilitar de verdade
 * e não complicar mais". Por isso o que este teste cobra é comportamento de
 * navegação e de resumo, não aparência.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. O RESUMO OMITE O QUE NÃO FOI INFORMADO. Uma linha com "· frasco 0 L" só
 *     ocuparia espaço, que é o problema que esta tela veio resolver.
 *  2. "TODOS" NÃO SOME. A lista inteira é útil para conferir o preparo do dia;
 *     tirar isso trocaria um problema por outro.
 *  3. ANTERIOR/PRÓXIMO NÃO DÃO A VOLTA. Numa bancada, o botão que volta ao começo
 *     faz a pessoa perder a conta de onde estava.
 *  4. TROCAR DE ESTUDO NÃO MANTÉM UMA ABA QUE NÃO EXISTE.
 *
 * Rodar: node test_modo_preparo.js
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

var ctx={console:console, String:String, Number:Number, Math:Math, Array:Array, Object:Object,
  isFinite:isFinite, studyTestemunha:function(s){ return (s&&s.testemunha)||''; }};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(['var _calcAba=null;',
  pega('calcCfgResumo'), pega('calcAbas'), pega('calcAbaVizinha'), pega('calcAbaAtual')].join('\n'), ctx);

console.log('\n--- A linha de configuração, como se lê de relance ---');
/* É a linha do relato do autor. */
eq(ctx.calcCfgResumo({len:5, wid:3, plots:4, vol:3, dead:300, bottles:1, capL:1.9}),
   '5×3 m · 4 parcelas · 3 L/ha · morto 300 mL · frasco 1,9 L',
   'exatamente a linha pedida');
eq(ctx.calcCfgResumo({len:10, wid:5, plots:1, vol:150, dead:0, bottles:1, capL:0}),
   '10×5 m · 1 parcela · 150 L/ha',
   'o que não foi informado não ocupa espaço — nem "morto 0 mL", nem "frasco 0 L"');
eq(ctx.calcCfgResumo({len:5, wid:3, plots:4, vol:3, dead:300, bottles:2, capL:0.2}),
   '5×3 m · 4 parcelas · 3 L/ha · morto 300 mL · 2 frascos · frasco 200 mL',
   'frasco abaixo de um litro aparece em mL, que é como se pensa numa bancada');
eq(ctx.calcCfgResumo({}), '', 'sem nada informado, linha vazia');
eq(ctx.calcCfgResumo({len:5, wid:3, plots:1, vol:0}), '5×3 m · 1 parcela',
   'volume ainda por confirmar não vira "0 L/ha"');

console.log('\n--- Abas: um tratamento por vez, e "Todos" continua existindo ---');
var est={testemunha:'T1', tratamentos:[{id:'T1',testemunha:true},{id:'T2'},{id:'T3'},{id:'T4'}]};
var abas=ctx.calcAbas(est);
eq(abas.length, 5, 'quatro tratamentos mais "Todos"');
eq(abas[4].id, '__todos', '"Todos" é a última');
eq(abas[0].testemunha, true, 'a testemunha vai marcada — quem prepara precisa saber');
eq(ctx.calcAbas({tratamentos:[{id:'T1'}]}).length, 1,
   'com um tratamento só, "Todos" não aparece — seria a mesma tela duas vezes');
eq(ctx.calcAbas(null).length, 0, 'sem estudo, nenhuma aba');

console.log('\n--- Anterior e próximo não dão a volta ---');
eq(ctx.calcAbaVizinha(abas,'T2',1), 'T3', 'próximo anda');
eq(ctx.calcAbaVizinha(abas,'T2',-1), 'T1', 'anterior volta');
eq(ctx.calcAbaVizinha(abas,'T4',1), null, 'no último, próximo não existe — sem dar a volta');
eq(ctx.calcAbaVizinha(abas,'T1',-1), null, 'no primeiro, anterior idem');
eq(ctx.calcAbaVizinha(abas,'__todos',1), 'T1', 'de "Todos", a navegação começa do primeiro');
eq(ctx.calcAbaVizinha([],'T1',1), null, 'sem abas, nada');

console.log('\n--- A aba escolhida é lembrada, mas não além do estudo ---');
ctx._calcAba=null;
eq(ctx.calcAbaAtual(est), 'T1', 'sem escolha, abre no primeiro tratamento');
ctx._calcAba='T3';
eq(ctx.calcAbaAtual(est), 'T3', 'a escolha é mantida enquanto a tela está aberta');
ctx._calcAba='T9';
eq(ctx.calcAbaAtual(est), 'T1',
   'aba de outro estudo não sobrevive à troca — mostraria um tratamento inexistente');
ctx._calcAba='__todos';
eq(ctx.calcAbaAtual(est), '__todos', '"Todos" é uma escolha válida e é lembrada');
eq(ctx.calcAbaAtual({tratamentos:[]}), null, 'estudo sem tratamento não tem aba');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
