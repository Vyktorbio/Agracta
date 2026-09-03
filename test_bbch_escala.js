/* A ponte do app para o motor de fenologia.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * As escalas mudaram de endereço (app.js -> vendor/bbch-core.js) porque viraram
 * conteúdo grande demais para viver dentro da interface. Este teste cuida do que
 * ficou no app: a ponte, o aviso na tela e o rótulo do estádio já gravado.
 * O conteúdo em si é de `test_bbch_culturas.js`.
 *
 * As três garantias da v186 continuam valendo e continuam verificadas aqui:
 *
 *  1. Trigo e arroz NÃO usam a escala do milho — eles perfilham e emborracham,
 *     e era isso que o milho não tinha.
 *  2. Nenhuma cultura recebe os rótulos de OUTRA cultura. O que mudou na v187 é
 *     que quem não tem monografia própria passou a usar a ESCALA GERAL da BBCH
 *     (publicada para esse caso, com rótulos genéricos) em vez de ficar sem nada.
 *  3. O estádio já gravado se explica sozinho, inclusive o órfão.
 *
 * Rodar: node test_bbch_escala.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei a função '+n+' em app.js');
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var BBCHCore=require('./vendor/bbch-core.js');
var ctx={ window:{BBCHCore:BBCHCore}, BBCHCore:BBCHCore,
          esc:function(s){return String(s==null?'':s);},
          String:String, Object:Object };
vm.createContext(ctx);
vm.runInContext([pega('_nucleoBBCH'), pega('bbchListDaQuadra'), pega('getBBCHList'),
                 pega('getBBCHOrigem'), pega('bbchAvisoHtml'), pega('getBBCHInfo'),
                 pega('bbchRotulo')].join('\n'),ctx);

console.log('\n--- A ponte encontra o motor ---');
ck(ctx._nucleoBBCH()===BBCHCore,'o app acha o BBCHCore');
ck(ctx.getBBCHList('Soja')!==null,'e devolve a escala da soja');
ck(ctx.getBBCHList('Quiabo')===null,'cultura fora do mapa continua sem escala');

console.log('\n--- Garantia 1 da v186: cereais não usam a escala do milho ---');
['Trigo','Cevada','Aveia','Centeio','Triticale'].forEach(function(c){
  ck(ctx.getBBCHOrigem(c).escala==='cereais',c+' usa a escala de cereais');
});
ck(ctx.getBBCHOrigem('Arroz').escala==='arroz','arroz tem a sua');
var cer=ctx.getBBCHList('Trigo').map(function(e){return e.label;}).join(' | ');
ck(/perfilhamento/i.test(cer),'e perfilhamento está lá');
ck(/emborrachamento/i.test(cer),'e emborrachamento também');
ck(!/camada preta|grão duro \(milho\)/i.test(cer),'sem rótulo de milho no meio');

console.log('\n--- Garantia 2: eucalipto não recebe os rótulos do citros ---');
var euc=ctx.getBBCHList('Eucalipto');
ck(euc!==null,'eucalipto TEM escala agora (a geral) — não ficou sem nada');
var eucTxt=euc.map(function(e){return e.label;}).join(' | ');
ck(!/gema dormente \(citros\)|fruto colhido/i.test(eucTxt),'e nenhum rótulo de citros nela');
ck(ctx.getBBCHOrigem('Eucalipto').nivel==='geral','o nível é declarado como geral');
var cit=ctx.getBBCHList('Citros');
ck(cit!==euc,'a escala do citros e a geral são objetos diferentes');

console.log('\n--- O aviso da tela ---');
ck(ctx.bbchAvisoHtml('Soja')==='','escala própria não gera aviso');
ck(ctx.bbchAvisoHtml('Milho')==='','milho também não');
var aG=ctx.bbchAvisoHtml('Eucalipto');
ck(aG.length>0,'escala geral gera aviso');
ck(/geral/i.test(aG),'que diz que é a geral');
var aGr=ctx.bbchAvisoHtml('Trigo');
ck(aGr.length>0,'escala de grupo gera aviso');
ck(/norma|grupo/i.test(aGr),'que diz que o grupo é da norma');
ck(ctx.bbchAvisoHtml('Quiabo')==='','cultura sem escala não gera aviso de escala');

console.log('\n--- Garantia 3: o estádio já gravado se explica ---');
var rot=ctx.bbchRotulo;
ck(rot('Trigo','21')==='BBCH 21 · Perfilhamento','trigo 21: '+rot('Trigo','21'));
ck(rot('Batata','45').indexOf('Tuberização')>=0,'batata 45: '+rot('Batata','45'));
ck(/fora da escala/.test(rot('Trigo','63')),'código inexistente é apontado: '+rot('Trigo','63'));
ck(/sem escala/.test(rot('Quiabo','89')),'cultura sem escala é apontada: '+rot('Quiabo','89'));
ck(rot('Soja','')==='','sem estádio gravado, nada é dito');
ck(/escala geral/i.test(rot('Eucalipto','65')),'estádio na geral declara a procedência: '+rot('Eucalipto','65'));
ck(!/escala/i.test(rot('Trigo','21')),'e no grupo NÃO repete a procedência em todo registro — vira ruído');

console.log('\n--- Laboratório continua sem fenologia de planta ---');
ctx.isQuadraLab=function(qid){ return qid==='lab1'; };
vm.runInContext(pega('bbchListDaQuadra'),ctx);
ck(ctx.bbchListDaQuadra('lab1','Soja')===null,'quadra de laboratório não oferece BBCH nem com cultura preenchida');
ck(ctx.bbchListDaQuadra('q1','Soja')!==null,'quadra de campo oferece');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
