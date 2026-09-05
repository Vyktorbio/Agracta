/* O filtro de alvos por cultura — alvos-catalogo.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Esta tela existe para uma coisa: escolher o alvo escreve o nome certo, e o
 * gráfico sai rotulado igual em todas as datas. Se ela oferece praga de algodão
 * num ensaio de citros, faz o oposto do que existe para fazer.
 *
 * Era o que acontecia. A cultura era procurada por IGUALDADE LITERAL de chave, e
 * as chaves deste arquivo são 'CITROS' (caixa alta) e 'Cana de açúcar' (sem
 * hífen). Quadra dizendo "Citros" ou "Cana-de-açúcar" — a forma que o resto do
 * app usa e produz — não casava, caía calada na lista inteira (99 alvos de treze
 * culturas), e a tela ainda escrevia "Alvos de Citros" em cima deles.
 *
 * Sete de onze grafias reais falhavam assim.
 *
 * Rodar: node test_alvos_cultura.js
 */
global.window = global.window || {};
require('./alvos-catalogo.js');
require('./vendor/bbch-core.js');
var W = global.window;

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n){ ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

var TUDO = W.ALVOS_TODOS.length;

console.log('\n--- O catálogo é o que eu disse que é ---');
ck(TUDO > 80, 'a lista completa tem os alvos de todas as culturas (' + TUDO + ')');
ck(!!W.ALVOS_POR_CULTURA['CITROS'], 'a chave de citros está em caixa alta, como sempre esteve');
ck(!!W.ALVOS_POR_CULTURA['Cana de açúcar'], 'e a da cana é escrita sem hífen');
ck(W.ALVOS_POR_CULTURA['Soja'].length < TUDO, 'e filtrar por soja dá menos alvos que o total');

console.log('\n--- AS GRAFIAS QUE FALHAVAM ---');
/* Cada uma destas caía nos 99 alvos de todas as culturas, sob um cabeçalho que
   jurava ter filtrado. */
[['Citros','CITROS'], ['citros','CITROS'], ['CITROS','CITROS'],
 ['Cana-de-açúcar','Cana de açúcar'], ['Cana de açúcar','Cana de açúcar'],
 ['soja','Soja'], ['SOJA','Soja'], ['Soja','Soja'],
 ['Cafe','Café'], ['Café','Café'], ['CAFÉ','Café'],
 ['Tomate ','Tomate'], [' Milho','Milho'], ['feijao','Feijão'],
 ['algodao','Algodão'], ['Morango','Morango']
].forEach(function(par){
  eq(W.alvosCultura(par[0]), par[1], JSON.stringify(par[0]) + ' resolve para ' + par[1]);
  ck(W.alvosBuscar(par[0], '', 999).length < TUDO,
     '  e a busca por ' + JSON.stringify(par[0]) + ' devolve menos que o catálogo inteiro');
});

console.log('\n--- Os sinônimos do resto do app valem aqui também ---');
/* O botão de inglês do gráfico produz "Soybean"; a tabela do BBCHCore é a mesma
   que resolve isso na busca do Agrofit e na do histórico. */
eq(W.alvosCultura('Soybean'), 'Soja', '"Soybean" chega em Soja pela tabela de sinônimos');
eq(W.alvosCultura('Cana'), 'Cana de açúcar', '"Cana" chega em Cana de açúcar');

console.log('\n--- O filtro é filtro de verdade, não decoração ---');
var soja = W.alvosBuscar('Soja', '', 999).map(function(a){ return a.comum; });
var citros = W.alvosBuscar('Citros', '', 999).map(function(a){ return a.comum; });
ck(soja.length !== citros.length || soja.join() !== citros.join(),
   'soja e citros não devolvem a mesma lista');
ck(citros.indexOf('Ferrugem asiática') < 0,
   'a ferrugem da soja NÃO aparece num ensaio de citros');
ck(soja.indexOf('Ferrugem asiática') >= 0, 'mas aparece num ensaio de soja');
/* As daninhas entram em toda cultura de propósito: ensaio de herbicida avalia a
   daninha, não a cultura. Isso não é vazamento de filtro. */
ck(citros.indexOf('Buva') >= 0 && soja.indexOf('Buva') >= 0,
   'as daninhas entram em toda cultura, e isso é intencional');

console.log('\n--- O que ele NÃO conhece, ele admite ---');
/* Trigo é cultura de verdade e não está no catálogo. Cair na lista inteira é
   aceitável; fingir que filtrou não é. */
eq(W.alvosCultura('Trigo'), null, 'cultura fora do catálogo devolve null, não uma chave qualquer');
eq(W.alvosBuscar('Trigo', '', 999).length, TUDO, 'e a busca abre a lista inteira');
eq(W.alvosCultura(''), null, 'sem cultura declarada, null');
eq(W.alvosCultura(null), null, 'cultura nula, null');
eq(W.alvosCultura('   '), null, 'só espaço em branco, null');
eq(W.alvosCultura('Bugiganga'), null, 'nome inventado não é aproximado para nenhuma cultura');

console.log('\n--- A busca por termo continua funcionando ---');
var fer = W.alvosBuscar('Soja', 'ferrugem', 9);
ck(fer.length > 0 && /Ferrugem/i.test(fer[0].comum), '"ferrugem" acha a ferrugem');
var pha = W.alvosBuscar('Soja', 'phako', 9);
ck(pha.length > 0 && /Phakopsora/i.test(pha[0].cientifico),
   '"phako" acha pelo binômio — quem sabe o patógeno chega no mesmo lugar');
ck(W.alvosBuscar('Soja', 'FERRUGEM', 9).length === fer.length, 'caixa alta não muda o resultado');
ck(W.alvosBuscar('Soja', 'ferrugêm', 9).length >= 0, 'acento sobrando não estoura');
eq(W.alvosBuscar('Soja', 'zzzznaoexiste', 9).length, 0, 'termo sem correspondente devolve lista vazia');
ck(W.alvosBuscar('Soja', '', 5).length === 5, 'o limite é respeitado');

console.log('\n--- Nada quebra com entrada estragada ---');
[undefined, null, 0, {}, []].forEach(function (mau, i) {
  try { W.alvosBuscar(mau, mau, 5); ck(true, 'entrada estragada #' + (i+1) + ' não derruba a busca'); }
  catch (e) { ck(false, 'entrada estragada #' + (i+1) + ' derrubou: ' + e.message); }
});

console.log('\n--- Sem o BBCHCore carregado, ainda resolve o que dá ---');
/* O catálogo não pode depender de outro arquivo ter carregado: sem a tabela de
   sinônimos ele perde "Soybean", mas não pode perder "Citros". */
var B = W.BBCHCore; delete W.BBCHCore;
eq(W.alvosCultura('Citros'), 'CITROS', 'sem BBCHCore, a normalização sozinha já resolve Citros');
eq(W.alvosCultura('Cana-de-açúcar'), 'Cana de açúcar', 'e o hífen da cana também');
eq(W.alvosCultura('Soybean'), null, 'só o sinônimo em inglês se perde — e vira null, não palpite');
W.BBCHCore = B;

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
