/* Entrada de adjuvante na calculadora principal.
 *
 * A v175 corrigiu a conta e a leitura em µL, mas ainda escondia a entrada de
 * % v/v num prompt de texto. Este teste protege a parte que o operador realmente
 * usa: seletor visível, padrão para item do tipo adjuvante e edição da receita.
 */
"use strict";
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var BC=require('./vendor/biocalc-campo-core.js');
var DC=require('./vendor/dose-core.js');
var passou=0,falhou=0;
function ck(ok,n){if(ok){passou++;console.log('  ok    '+n);}else{falhou++;console.log('  FALHA '+n);}}
function eq(a,b,n){ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')'));}
function pega(nome){
  var i=src.indexOf('function '+nome+'(');if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;for(;j<src.length;j++){if(src[j]==='{'){d++;viu=true;}else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}}
  return src.slice(i,j);
}
var arr=src.match(/var TRAT_COMP_UNIDADES=\[[\s\S]*?\n\];/);
if(!arr)throw new Error('não achei TRAT_COMP_UNIDADES');
var itens={adj:{id:'adj',nome:'Silwet',tipo:'adjuvante'},prod:{id:'prod',nome:'Produto',tipo:'teste'}};
var ctx={console:console,String:String,Number:Number,Array:Array,Object:Object,isFinite:isFinite,
  DoseCore:DC,BioCalculoCampo:BC,workingStudy:{doseUnidade:'mL/ha'},
  _calcNum:function(v){var s=String(v||'').replace(/\s/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'');return parseFloat(s.replace(',','.'))||0;},
  itemPorId:function(id){return itens[id]||null;},
  esc:function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;');}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext([arr[0],pega('_seCompUnidadeNormalizar'),pega('_seCompUnidadeOptions'),
  pega('_seCompUnidadePadrao'),pega('_itemDoseUnidadeOptions'),pega('_seCompNumero'),
  pega('_seCompNumeroDaDose'),pega('_seCompUnidadeDaDose')].join('\n'),ctx);

console.log('\n--- Unidade visível e semanticamente correta ---');
var op=ctx._seCompUnidadeOptions('% v/v');
ck(/value="% v\/v" selected/.test(op),'o compositor oferece % v/v como opção selecionável');
ck(/adjuvante líquido/.test(op),'o rótulo explica para que serve a porcentagem');
eq(ctx._seCompUnidadeNormalizar('%'),'% v/v','% legado é mostrado explicitamente como v/v');
eq(ctx._seCompUnidadeNormalizar('%v/v'),'% v/v','grafia sem espaços também é reconhecida');

console.log('\n--- O tipo do item escolhe um padrão útil ---');
eq(ctx._seCompUnidadePadrao('adj'),'% v/v','item cadastrado como adjuvante nasce em % v/v');
eq(ctx._seCompUnidadePadrao('prod'),'mL/ha','produto normal herda a unidade de campo do estudo');
var cat=ctx._itemDoseUnidadeOptions('% v/v');
ck(/value="% v\/v" selected/.test(cat),'o Banco de itens também oferece % v/v');
ck(/value="ppm"/.test(cat),'o catálogo universal não perde as unidades de laboratório');

console.log('\n--- Decimal pequeno não vira dose mil vezes maior ---');
eq(ctx._seCompNumero('0,033'),0.033,'vírgula brasileira é aceita');
eq(ctx._seCompNumero('0.033'),0.033,'ponto decimal também é aceito');
eq(ctx._seCompNumero('abc'),null,'texto inválido é recusado');
eq(ctx._seCompNumeroDaDose('0.033 % v/v'),0.033,'porcentagem antiga com ponto não vira 33%');
eq(ctx._seCompNumeroDaDose('1.500 g/ha'),1500,'milhar brasileiro da dose por área continua preservado');
eq(ctx._seCompUnidadeDaDose('0,033 % v/v','L/ha'),'% v/v','dose antiga em porcentagem migra como v/v');

console.log('\n--- A opção está na calculadora principal, não só no CO₂ ---');
ck(/Itens, doses e adjuvante \(% v\/v\)/.test(src),'a calculadora principal tem atalho para editar a receita');
ck(/function calcEditarReceita\(\)/.test(src),'o atalho abre a etapa de tratamentos');
ck(/id="seCompUnidade/.test(src)&&/Unidade do componente/.test(src),'a receita tem seletor de unidade por componente');
ck(/function seTratCompConfirmar\(/.test(src)&&/tratCompAdicionar\(t,it\.id,valor,unidade,null\)/.test(src),'a escolha grava um componente estruturado');
ck(/<select id="dsUnidade">/.test(src),'o Banco de itens deixou de exigir unidade digitada à mão');
ck(pega('seTratCompNovo').indexOf('prompt(')<0,'adicionar componente não depende mais de prompt escondido');

console.log('\n--- Medidas da receita principal continuam operacionais ---');
eq(BC.formatAmount(.137,'mL'),'137 µL','0,137 mL aparece como 137 µL');
eq(BC.formatAmount(6.6,'mL'),'6,6 mL','6,600 mL aparece como 6,6 mL');

console.log('\n'+(falhou?(falhou+' FALHA(S) em '+(passou+falhou)):passou+' verificações, nenhuma falha.'));
process.exit(falhou?1:0);
