/* Capacidade do frasco: o campo passa a aceitar a unidade.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O caso foi real. Num preparo de 62 mL, a folha saiu com "frasco 200 L". A pessoa
 * digitou 200 pensando em mililitros — e não sem razão: o campo fica ao lado de
 * "Volume morto (mL)", e dois campos vizinhos em unidades diferentes é uma
 * armadilha, não um descuido de quem preenche.
 *
 * Três coisas precisam continuar valendo:
 *
 *  1. NÚMERO PURO CONTINUA SENDO LITROS. É como todo estudo já cadastrado está
 *     gravado; mudar a interpretação reescreveria a capacidade de estudo antigo.
 *  2. COM UNIDADE ESCRITA, VALE A UNIDADE ESCRITA. "200 mL" são 0,2 L.
 *  3. A IDA E VOLTA NÃO PERDE O VALOR. O que se digita, se salva e se reabre tem de
 *     voltar igual — senão editar um estudo duas vezes muda a capacidade sozinho.
 *
 * Rodar: node test_capacidade_frasco.js
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
function perto(a,b,t,n){ var ok=(a!=null&&Math.abs(a-b)<=t); ck(ok,n+(ok?'':' (obtido '+a+', esperado ~'+b+')')); }

var ctx={console:console, String:String, Number:Number, Math:Math, parseFloat:parseFloat, isFinite:isFinite};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([pega('_numBR'), pega('_capFrascoL'), pega('_capFrascoTexto')].join('\n'), ctx);

console.log('\n--- Número puro continua sendo litros ---');
eq(ctx._capFrascoL('200'), 200, '200 são 200 L, como sempre foram');
eq(ctx._capFrascoL('0,5'), 0.5, 'decimal com vírgula');
eq(ctx._capFrascoL('2'), 2, 'dois litros');

console.log('\n--- O CASO REAL: com a unidade escrita, vale a unidade ---');
perto(ctx._capFrascoL('200 mL'), 0.2, 1e-12, '"200 mL" são 0,2 L — não 200');
perto(ctx._capFrascoL('200ml'), 0.2, 1e-12, 'sem espaço também');
perto(ctx._capFrascoL('200 ML'), 0.2, 1e-12, 'e em maiúsculas');
eq(ctx._capFrascoL('200 L'), 200, '"200 L" segue sendo 200');
eq(ctx._capFrascoL('2 l'), 2, 'litro minúsculo idem');

console.log('\n--- Ida e volta não perde o valor ---');
/* Editar um estudo duas vezes não pode mudar a capacidade sozinho. */
[0.2, 2, 200, 0.062, 1].forEach(function(v){
  perto(ctx._capFrascoL(ctx._capFrascoTexto(v)), v, 1e-9, v+' L sobrevive à ida e volta');
});

console.log('\n--- Como o valor é mostrado ---');
eq(ctx._capFrascoTexto(0.2), '200 mL', 'abaixo de um litro aparece em mL, que é como se pensa numa bancada');
eq(ctx._capFrascoTexto(2), '2 L', 'acima, em litros');
eq(ctx._capFrascoTexto(0), '', 'zero fica vazio — o campo diz "0 = não conferir"');

console.log('\n--- Entrada inútil vira zero, não erro ---');
eq(ctx._capFrascoL(''), 0, 'vazio');
eq(ctx._capFrascoL('abc'), 0, 'texto sem número');
eq(ctx._capFrascoL(null), 0, 'nulo');
eq(ctx._capFrascoL('-5'), 0, 'negativo não é capacidade');
eq(ctx._capFrascoL('0'), 0, 'zero é zero — e significa "não conferir"');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
