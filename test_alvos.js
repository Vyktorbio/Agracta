/* Catálogo de alvos biológicos: cobertura e busca.
 *
 * O catálogo é a memória da estação — se ele estiver errado, o erro sai
 * impresso no relatório com cara de certeza. Este teste não julga biologia;
 * ele guarda as propriedades que o uso depende: toda cultura do app tem lista,
 * todo alvo tem binômio, e a busca acha por nome de campo, por gênero e mesmo
 * digitado sem acento — que é como se digita com a mão suja.
 */
var vm = require('vm');
var fs = require('fs');
var path = require('path');

var falhas = 0;
function ck(cond, nome){
  console.log((cond ? '  ok   ' : '  FALHA ') + nome);
  if(!cond) falhas++;
}
function titulo(t){ console.log('\n' + t); }

var ctx = {window:{}, console:console};
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'alvos-catalogo.js'),'utf8'), ctx, {filename:'alvos-catalogo.js'});
var W = ctx.window;

/* As culturas que o app oferece no cadastro da quadra (CL, em app.js). */
var CULTURAS = ['Soja','Algodão','Milho','Café','Feijão','Tomate','Morango','Melão',
                'Cana de açúcar','Pastagem','CITROS','ESTUFAS','Pousio'];

titulo('Toda cultura do app tem alvos');
CULTURAS.forEach(function(c){
  var lista = W.ALVOS_POR_CULTURA[c];
  ck(!!lista && lista.length > 0, c + ' — ' + ((lista&&lista.length)||0) + ' alvos');
});

titulo('Todo alvo está completo e bem formado');
var semBinomio = [], semGrupo = [], binomioEstranho = [];
W.ALVOS_TODOS.forEach(function(a){
  if(!a.comum || !a.cientifico) semBinomio.push(a.comum || '(sem nome)');
  if(['doença','praga','daninha'].indexOf(a.grupo) < 0) semGrupo.push(a.comum);
  /* Binômio começa com gênero em maiúscula. Vírus e Candidatus fogem da regra
     e são exceção legítima, não erro de digitação. */
  if(a.cientifico && !/^[A-Z][a-z]/.test(a.cientifico) && !/^Candidatus/.test(a.cientifico)) binomioEstranho.push(a.cientifico);
});
ck(semBinomio.length === 0, 'nenhum alvo sem nome científico' + (semBinomio.length?(' → '+semBinomio.join(', ')):''));
ck(semGrupo.length === 0, 'todo alvo é doença, praga ou daninha' + (semGrupo.length?(' → '+semGrupo.join(', ')):''));
ck(binomioEstranho.length === 0, 'binômios com gênero capitalizado' + (binomioEstranho.length?(' → '+binomioEstranho.join(', ')):''));

titulo('Plantas daninhas acompanham toda cultura');
/* Ensaio de herbicida avalia a daninha, não a lavoura — se a lista de alvos
   não trouxer daninha, o técnico volta a digitar à mão e a padronização morre. */
CULTURAS.forEach(function(c){
  var tem = (W.ALVOS_POR_CULTURA[c]||[]).some(function(a){ return a.grupo === 'daninha'; });
  ck(tem, c + ' oferece daninhas');
});

titulo('A busca acha do jeito que a pessoa digita');
function acha(cultura, termo, esperado){
  var r = W.alvosBuscar(cultura, termo, 8) || [];
  return r.some(function(a){ return a.comum === esperado || a.cientifico === esperado; });
}
ck(acha('Soja','ferrugem','Ferrugem asiática'),            'nome de campo: "ferrugem" na soja');
ck(acha('Soja','FERRUGEM','Ferrugem asiática'),            'caixa alta não atrapalha');
ck(acha('Soja','ferrugem asiatica','Ferrugem asiática'),   'sem acento também acha');
ck(acha('Soja','phakopsora','Ferrugem asiática'),          'pelo gênero: "phakopsora"');
ck(acha('Café','hemileia','Ferrugem do cafeeiro'),         'pelo gênero no café');
ck(acha('Cana de açúcar','broca','Broca-da-cana'),         'praga da cana pelo nome curto');
ck(acha('Soja','buva','Buva'),                             'daninha aparece na soja');

titulo('O filtro por cultura realmente separa');
var soja = W.alvosBuscar('Soja','bicudo',8).map(function(a){return a.comum;});
var algo = W.alvosBuscar('Algodão','bicudo',8).map(function(a){return a.comum;});
ck(algo.indexOf('Bicudo-do-algodoeiro') >= 0, 'bicudo aparece no algodão');
ck(soja.indexOf('Bicudo-do-algodoeiro') < 0,  'bicudo NÃO aparece na soja');

titulo('Sem cultura declarada, procura em tudo');
ck(acha('', 'hemileia', 'Ferrugem do cafeeiro'),           'cultura vazia varre o catálogo inteiro');
ck(acha('Cultura Que Não Existe', 'phakopsora', 'Ferrugem asiática'), 'cultura desconhecida não quebra');
ck((W.alvosBuscar('Soja','xyzabc',8)||[]).length === 0,     'termo sem resultado devolve lista vazia');

titulo('A taxonomia recente do algodão está registrada');
/* A ramulária deixou de ser Ramularia areola e virou o complexo Ramulariopsis.
   Os dois precisam existir: o novo para o relatório, o antigo porque é o que
   muita gente ainda digita. */
ck(acha('Algodão','ramularia','Ramulariopsis pseudoglycines'), 'nome atual (Ramulariopsis) é encontrável');
ck(acha('Algodão','ramularia','Ramularia areola'),             'nome antigo continua achando o alvo');

console.log('');
if(falhas){ console.log(falhas + ' FALHA(S)'); process.exit(1); }
console.log('tudo certo — ' + W.ALVOS_TODOS.length + ' alvos em ' + Object.keys(W.ALVOS_POR_CULTURA).length + ' culturas');
