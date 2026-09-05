/* O merge de lápides de exclusão — app.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Uma lápide é {id: hora da exclusão}. Ela decide se um item apagado num
 * aparelho continua apagado nos outros — e `_vivoTomb` deixa viver quem foi
 * mexido DEPOIS da lápide, para que recriar algo apagado funcione.
 *
 * O merge dessas lápides copiava a nuvem e deixava o local por cima: "a minha
 * vence". Numa lápide isso não é uma regra, é o ponto de vista de quem está
 * executando o merge — e ponto de vista faz o merge NÃO CONVERGIR. Dois
 * aparelhos com exatamente os mesmos dois estados chegavam a respostas opostas,
 * e cada sync reimplantava o desacordo: a quadra piscava entre os aparelhos.
 *
 * A propriedade que este teste protege tem nome: merge(A,B) === merge(B,A).
 * Sem ela, sincronizar não termina nunca.
 *
 * Rodar: node test_lapides_merge.js
 */
var fs = require('fs'), vm = require('vm');
var src = fs.readFileSync('./app.js', 'utf8');
function pega(n){
  var i = src.indexOf('function ' + n + '(');
  if (i < 0) throw new Error('não achei ' + n);
  var j = i, d = 0, v = false;
  for (; j < src.length; j++){ if (src[j] === '{'){ d++; v = true; } else if (src[j] === '}'){ d--; if (v && d === 0){ j++; break; } } }
  return src.slice(i, j);
}
var ctx = { Math:Math, Number:Number, Object:Object, JSON:JSON, console:console };
vm.createContext(ctx);
vm.runInContext([pega('_mergeTombs'), pega('_vivoTomb'), pega('_mergeById')].join('\n'), ctx);

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n){ ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

console.log('\n--- O DEFEITO: dois aparelhos, os mesmos estados, respostas opostas ---');
/* O aparelho A apagou a quadra às 10h. O B, sem sinal, apagou a mesma às 12h.
   A quadra foi mexida às 11h, entre as duas exclusões. */
var A = {q7:1000}, B = {q7:2000};
var item = {id:'q7', _ts:1500};
var noA = ctx._mergeTombs(A, B), noB = ctx._mergeTombs(B, A);
eq(noA.q7, noB.q7, 'merge(A,B) e merge(B,A) dão o MESMO resultado');
eq(noA.q7, 2000, 'e o resultado é a exclusão mais nova — 12h, não 10h');
eq(ctx._vivoTomb(item, noA), ctx._vivoTomb(item, noB),
   'e por isso os dois aparelhos concordam sobre a quadra existir ou não');
eq(ctx._vivoTomb(item, noA), false, 'aqui ela fica apagada: a exclusão das 12h é posterior à mexida das 11h');

console.log('\n--- Recriar algo apagado continua funcionando ---');
/* É para isto que a lápide guarda a hora, e não um simples "apagado": item
   recriado DEPOIS da exclusão sobrevive. Ids determinísticos (avaliação
   auto_<data>) dependem disso — sem ele, uma data excluída uma vez condenaria
   toda avaliação futura daquela data. */
eq(ctx._vivoTomb({id:'q7', _ts:3000}, noA), true, 'mexido às 13h, depois da última exclusão: sobrevive');
eq(ctx._vivoTomb({id:'q7', _ts:2000}, noA), false, 'mexido no instante exato da exclusão: não sobrevive');
eq(ctx._vivoTomb({id:'outro', _ts:1}, noA), true, 'item sem lápide nenhuma sobrevive sempre');
eq(ctx._vivoTomb({id:'q7'}, noA), false, 'item sem carimbo não vence uma lápide');

console.log('\n--- A troca é comutativa em qualquer combinação ---');
/* Compara o CONTEÚDO, não a ordem das chaves: lápide é mapa, e a ordem em que
   as chaves entram no objeto não significa nada para quem só faz consulta por
   id. Comparar texto aqui reprovaria um merge correto. */
function estavel(o){
  return Object.keys(o).sort().map(function(k){ return k + '=' + o[k]; }).join('|');
}
function comuta(a, b, nome){
  var x = estavel(ctx._mergeTombs(a, b)), y = estavel(ctx._mergeTombs(b, a));
  ck(x === y, nome + (x === y ? '' : ' (' + x + ' ≠ ' + y + ')'));
}
comuta({a:1}, {a:2}, 'mesma chave, horas diferentes');
comuta({a:1}, {b:2}, 'chaves diferentes');
comuta({a:5, b:1}, {b:9, c:3}, 'sobreposição parcial');
comuta({}, {a:1}, 'um lado vazio');
comuta({}, {}, 'os dois vazios');
comuta({a:7}, {a:7}, 'valores iguais');

console.log('\n--- Nenhuma lápide se perde no caminho ---');
var u = ctx._mergeTombs({a:1, b:2}, {c:3, d:4});
eq(Object.keys(u).sort().join(','), 'a,b,c,d', 'a união traz as chaves dos dois lados');
eq(u.a, 1, 'valor só do lado local sobrevive');
eq(u.c, 3, 'valor só do lado da nuvem sobrevive');

console.log('\n--- Lixo no lugar do carimbo não vira exclusão eterna ---');
/* Um valor que não é número não pode virar Infinity nem NaN: NaN em comparação
   é sempre falso, e o item deixaria de existir sem que ninguém o tivesse
   apagado. */
var lixo = ctx._mergeTombs({a:'ontem'}, {a:500});
eq(lixo.a, 500, 'texto no carimbo local perde para o número da nuvem');
ck(typeof lixo.a === 'number' && isFinite(lixo.a), 'e o resultado continua sendo um número de verdade');
var doisLixos = ctx._mergeTombs({a:'x'}, {a:null});
eq(doisLixos.a, 0, 'dois carimbos ilegíveis viram zero — lápide que não segura ninguém');
eq(ctx._vivoTomb({id:'a', _ts:1}, doisLixos), true, 'e o item sobrevive, em vez de sumir por causa de lixo');

console.log('\n--- Entradas ausentes não estouram ---');
[[null, null], [undefined, {a:1}], [{a:1}, undefined], [null, {a:1}]].forEach(function (par, i) {
  try { ctx._mergeTombs(par[0], par[1]); ck(true, 'combinação nula #' + (i+1) + ' não derruba o merge'); }
  catch (e) { ck(false, 'combinação nula #' + (i+1) + ' derrubou: ' + e.message); }
});

console.log('\n--- O merge por id respeita a lápide dos dois lados ---');
var locais = [{id:'x', _ts:100}, {id:'y', _ts:3000}];
var nuvem  = [{id:'x', _ts:100}, {id:'z', _ts:50}];
var tombs  = ctx._mergeTombs({x:2000}, {z:2000});
var r = ctx._mergeById(locais, nuvem, null, tombs);
var ids = r.map(function(o){ return o.id; }).sort().join(',');
eq(ids, 'y', 'x e z ficam apagados; y, mexido depois, sobrevive');

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
