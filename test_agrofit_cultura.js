/* O produto tem registro para a cultura deste estudo?
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O catálogo sabe, por registro, para quais culturas o MAPA aprovou cada
 * produto. Isso responde uma pergunta que o app não sabia fazer.
 *
 * Mas a resposta tem de ser dada com cuidado, e são três cuidados:
 *
 *  1. NUNCA BLOQUEIA, e a severidade é "nota", não "conferir". Ensaio de
 *     registro existe JUSTAMENTE para gerar dado de cultura ainda não
 *     registrada — tratar isso como erro seria brigar com a finalidade do
 *     trabalho.
 *  2. ITEM SEM REGISTRO NÃO GERA ACHADO. O experimental do patrocinador não tem
 *     número de registro por definição, e ausência de registro não é ausência de
 *     conformidade.
 *  3. "TODAS AS CULTURAS" É UMA ENTRADA REAL do Agrofit e significa exatamente
 *     isso. Lê-la como nome literal de cultura faria o app apontar falta de
 *     registro em produto registrado para tudo.
 *
 * Rodar: node test_agrofit_cultura.js
 */
var fs=require('fs'),vm=require('vm');
var A=require('./vendor/agrofit-core.js');
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

var cc=A.carregarCulturas(JSON.parse(fs.readFileSync('data/agrofit-culturas.json','utf8')));

console.log('\n--- O motor responde as três formas ---');
ck(!!cc,'o arquivo de culturas carrega');
ck(A.registradoPara(cc,'26824','Soja').registrado===true,'glifosato 26824 é registrado para soja');
ck(A.registradoPara(cc,'26824','Morango').registrado===false,'e NÃO é para morango');
ck(A.registradoPara(cc,'99999','Soja').conhecido===false,'registro desconhecido não afirma nada');

console.log('\n--- Cuidado 3: "Todas as culturas" não é nome de cultura ---');
var t=A.registradoPara(cc,'35523','Soja');
ck(t.registrado===true && t.todas===true,'produto para "Todas as culturas" cobre qualquer cultura');
ck(A.registradoPara(cc,'35523','Quiabo').registrado===true,'inclusive uma que nem está na lista do MAPA');

console.log('\n--- Estudo sem cultura declarada não vira achado ---');
ck(A.registradoPara(cc,'26824','').registrado===null,'sem cultura, a pergunta não tem resposta');

console.log('\n--- Agora o achado que chega na tela ---');
var ITENS={
  i1:{id:'i1', nome:'Glifosino 720 WG', registro:'26824'},
  i2:{id:'i2', nome:'XPTO-2026 experimental', registro:''},
  i3:{id:'i3', nome:'Biológico total', registro:'35523'}
};
var ctx={
  AgrofitCore:A, _agrofitCult:cc,
  window:{BBCHCore:require('./vendor/bbch-core.js')},
  data:{q1:{cultura:'Morango'}},
  itemPorId:function(id){ return ITENS[id]||null; },
  tratComponentes:function(t){ return (t&&t.componentes)||[]; },
  studyCultura:function(s,q){ return (s&&s.cultura)||(q&&q.cultura)||''; },
  String:String, Array:Array
};
vm.createContext(ctx);
vm.runInContext(pega('agrofitAchadosCultura'),ctx);

function estudo(cultura, comps){
  return {id:'s1', cultura:cultura,
          tratamentos:[{id:'T1', componentes:comps}]};
}

var a=ctx.agrofitAchadosCultura('q1', estudo('Morango',[{itemId:'i1'}]));
ck(a.length===1,'produto sem registro para morango gera UM achado');
ck(a[0].severidade==='nota','e a severidade é NOTA, não "conferir"');
ck(/Morango/.test(a[0].texto),'o texto nomeia a cultura');
ck(/26824/.test(a[0].texto),'e o número de registro');
ck(/ensaio de registro isso é esperado/i.test(a[0].texto),'e diz que num ensaio de registro isso é esperado');
ck(a[0].tratamentos[0]==='T1','apontando o tratamento');

console.log('\n--- Cultura registrada: silêncio ---');
ck(ctx.agrofitAchadosCultura('q1', estudo('Soja',[{itemId:'i1'}])).length===0,
   'soja está registrada — nada a dizer');

console.log('\n--- Cuidado 2: item sem registro é silêncio, não achado ---');
ck(ctx.agrofitAchadosCultura('q1', estudo('Morango',[{itemId:'i2'}])).length===0,
   'o experimental do patrocinador não gera achado');
ck(ctx.agrofitAchadosCultura('q1', estudo('Morango',[{itemId:'i3'}])).length===0,
   'e "Todas as culturas" também não');

console.log('\n--- Sem cultura em lugar nenhum, sem achado ---');
/* Estudo sem cultura CAI NA CULTURA DA QUADRA, e isso está certo — a quadra é o
   padrão geográfico. Para não haver cultura de verdade, nem a quadra pode ter. */
ck(ctx.agrofitAchadosCultura('q1', estudo('',[{itemId:'i1'}])).length===1,
   'estudo sem cultura herda a da quadra e o achado continua valendo');
ctx.data.q2={};
ck(ctx.agrofitAchadosCultura('q2', estudo('',[{itemId:'i1'}])).length===0,
   'sem cultura no estudo NEM na quadra, o app não tem o que comparar');

console.log('\n--- Sem o arquivo carregado, ausência de dado não vira afirmação ---');
ctx._agrofitCult=null;
ck(ctx.agrofitAchadosCultura('q1', estudo('Morango',[{itemId:'i1'}])).length===0,
   'antes do arquivo chegar, o app não diz nada');
ctx._agrofitCult=cc;

console.log('\n--- O mesmo produto em dois componentes não duplica o achado ---');
ck(ctx.agrofitAchadosCultura('q1', estudo('Morango',[{itemId:'i1'},{itemId:'i1'}])).length===1,
   'um achado por produto e tratamento');

console.log('\n--- O NOME DA CULTURA É RESOLVIDO ANTES DE COMPARAR ---');
/* A cultura é campo de texto livre e a lista do MAPA está em português. Antes,
   "Soybean" não batia com nada e o app ACUSAVA falta de registro num produto
   que tem registro para Soja. Achado falso mata a confiança na ferramenta. */
ctx.data.q3={cultura:'Soybean'};
var aEn=ctx.agrofitAchadosCultura('q3', estudo('',[{itemId:'i1'}]));
ck(!aEn.some(function(x){ return x.codigo==='produto-sem-registro-para-cultura'; }),
   '"Soybean" NÃO gera mais acusação de falta de registro');
ctx.data.q4={cultura:'Corn'};
ck(ctx.agrofitAchadosCultura('q4', estudo('',[{itemId:'i1'}])).length===0,
   '"Corn" resolve para Milho, que É registrado — silêncio total');
ctx.data.q5={cultura:'Strawberry'};
var aMo=ctx.agrofitAchadosCultura('q5', estudo('',[{itemId:'i1'}]));
ck(aMo.length===1 && /Morango/.test(aMo[0].texto),
   '"Strawberry" resolve para Morango e aí sim aponta, com o nome certo: '+(aMo[0]||{}).texto);

console.log('\n--- Cultura irreconhecível: explica, não acusa ---');
ctx.data.q6={cultura:'Xilofagia tropical'};
var aX=ctx.agrofitAchadosCultura('q6', estudo('',[{itemId:'i1'}]));
ck(aX.length===1,'gera um achado');
ck(aX[0].codigo==='cultura-nao-reconhecida','de código próprio, não de falta de registro');
ck(aX[0].severidade==='nota','como nota');
ck(/não reconheço/i.test(aX[0].texto),'dizendo que não reconhece: '+aX[0].texto.slice(0,60));
ck(/Soybean/.test(aX[0].texto),'com exemplo de como resolver');

console.log('\n--- Sem produto registrado, nem isso vale dizer ---');
ck(ctx.agrofitAchadosCultura('q6', estudo('',[{itemId:'i2'}])).length===0,
   'estudo só com item experimental não perde nada por a cultura ser desconhecida');

console.log('\n--- Componente de texto livre, sem item, é ignorado ---');
ck(ctx.agrofitAchadosCultura('q1', estudo('Morango',[{nome:'algo escrito à mão'}])).length===0,
   'sem itemId não há registro a conferir');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
