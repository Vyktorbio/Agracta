/* A dose certa não pode sumir por causa de uma grafia.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A cultura da DOSE e a cultura do ESTUDO são dois campos de texto livre,
 * escritos em momentos diferentes, muitas vezes por pessoas diferentes.
 * Comparar as duas letra a letra escondia a dose certa em silêncio: uma dose
 * cadastrada para "Soja" não aparecia num estudo cadastrado como "Soybean", e a
 * pessoa concluía que nunca tinha cadastrado a dose.
 *
 * Esconder o que existe é pior que apontar o que não existe: o segundo se
 * discute, o primeiro não se percebe.
 *
 * DUAS REGRAS DE CONTENÇÃO, porque afrouxar comparação é como se cria falso
 * positivo:
 *
 *  1. SÓ QUANDO AS DUAS RESOLVEM. Se uma das culturas está fora do vocabulário,
 *     a comparação volta a ser literal — assim uma dose cadastrada para cultura
 *     exótica não deixa de casar consigo mesma.
 *  2. O ALVO NÃO PASSA POR VOCABULÁRIO. São nomes científicos de praga e doença,
 *     e não existe tabela canônica deles. Inventar equivalência ali seria
 *     adivinhar.
 *
 * Rodar: node test_dose_cultura.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei '+n);
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var DOSES=[];
var ctx={ window:{BBCHCore:require('./vendor/bbch-core.js')},
          itemDoses:function(){ return DOSES; }, String:String };
vm.createContext(ctx);
vm.runInContext([pega('normStr'), pega('_mesmaCultura'), pega('itemDosesPara')].join('\n'),ctx);

function dose(cultura, alvo){ return {situacao:'ativa', cultura:cultura, alvo:alvo||'', valor:0.8}; }
function achou(cultura, alvo){ return ctx.itemDosesPara('i1', cultura, alvo).length; }

console.log('\n--- O caso que motivou: a dose sumia ---');
DOSES=[dose('Soja')];
ck(achou('Soja')===1,'"Soja" acha a dose de Soja');
ck(achou('Soybean')===1,'"Soybean" TAMBÉM acha — era isto que sumia');
ck(achou('soybeans')===1,'plural em inglês também');
ck(achou('SOJA')===1,'caixa alta');
ck(achou('  Soja ')===1,'com espaços');

console.log('\n--- E continua sem casar o que é de outra cultura ---');
ck(achou('Milho')===0,'"Milho" não acha a dose de Soja');
ck(achou('Corn')===0,'"Corn" também não — resolve para Milho');
ck(achou('Algodão')===0,'nem algodão');

console.log('\n--- A dose registrada em inglês acha o estudo em português ---');
DOSES=[dose('Corn')];
ck(achou('Milho')===1,'dose cadastrada como "Corn" aparece em estudo de Milho');
ck(achou('Soja')===0,'e não aparece em soja');

console.log('\n--- REGRA 1: cultura fora do vocabulário volta ao literal ---');
DOSES=[dose('Quiabo roxo do sertão')];
ck(achou('Quiabo roxo do sertão')===1,'a dose casa consigo mesma');
ck(achou('quiabo roxo do sertao')===1,'sem acento e sem caixa também');
ck(achou('Soja')===0,'e não casa com outra coisa');
DOSES=[dose('Soja')];
ck(achou('Quiabo roxo do sertão')===0,'cultura desconhecida não passa a achar tudo');

console.log('\n--- Dose sem cultura serve para qualquer estudo (o adjuvante) ---');
DOSES=[dose('')];
ck(achou('Soja')===1,'sem cultura declarada, serve');
ck(achou('Soybean')===1,'em qualquer grafia');
ck(achou('')===1,'e em estudo sem cultura');

console.log('\n--- Estudo sem cultura não filtra nada ---');
DOSES=[dose('Soja'), dose('Milho')];
ck(achou('')===2,'sem cultura no estudo, todas as doses aparecem');

console.log('\n--- REGRA 2: o alvo continua literal ---');
DOSES=[dose('Soja','Euschistus heros')];
ck(achou('Soja','Euschistus heros')===1,'alvo igual casa');
ck(achou('Soja','euschistus heros')===1,'sem caixa também');
ck(achou('Soja','Dichelops melacanthus')===0,'alvo diferente não casa');
ck(achou('Soja','')===1,'estudo sem alvo não filtra por alvo');
ck(achou('Soybean','Euschistus heros')===1,'cultura resolvida + alvo literal funcionam juntos');

console.log('\n--- Dose aposentada continua fora ---');
DOSES=[{situacao:'aposentada', cultura:'Soja', valor:1}];
ck(achou('Soja')===0,'dose aposentada não aparece');
ck(achou('Soybean')===0,'nem pela grafia nova');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
