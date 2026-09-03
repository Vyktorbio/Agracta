/* A fenologia deixa de adivinhar.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O mapa de culturas roteava 53 culturas para a escala de OUTRA cultura sem que
 * nada dissesse isso. Um ensaio de eucalipto registrava "89 — Maturação plena
 * (ponto colheita)", herdado do citros. Trigo e arroz recebiam a escala do
 * milho, que não tem perfilhamento (2) nem emborrachamento (4) — justamente os
 * dois estádios em que se decide regulador, fungicida de folha bandeira e
 * herbicida de pós num cereal.
 *
 * O número saía com cara de BBCH oficial e ia para a folha BPL. É o mesmo erro
 * que o app proíbe em todo o resto: adivinhar em silêncio.
 *
 * Três destinos agora, e o teste guarda os três:
 *   1. escala PRÓPRIA para os cereais e para o arroz;
 *   2. escala EMPRESTADA continua existindo, mas DECLARADA na tela;
 *   3. SEM escala onde emprestar não é aproximação, é invenção.
 *
 * Rodar: node test_bbch_escala.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

function pega(n){var i=src.indexOf('function '+n+'(');var j=i,d=0,v=false;
 for(;j<src.length;j++){if(src[j]==='{'){d++;v=true;}else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}}}
 return src.slice(i,j);}
var ctx={esc:function(s){return String(s==null?'':s);}, Object:Object, String:String};
vm.createContext(ctx);
var i=src.indexOf('var BBCH = {');
var fim=src.indexOf('function getBBCHInfo');
vm.runInContext(src.slice(i,fim),ctx);

var BBCH=ctx.BBCH, MAP=ctx.BBCH_MAP, origem=ctx.getBBCHOrigem, lista=ctx.getBBCHList;

function principais(escala){
  var s={}; (BBCH[escala]||[]).forEach(function(e){ s[e.code[0]]=1; });
  return Object.keys(s).sort().join('');
}

console.log('\n--- Os cereais ganharam escala própria, com os dez estádios ---');
['Trigo','Cevada','Aveia','Centeio','Triticale'].forEach(function(c){
  var o=origem(c);
  ck(o && o.escala==='cereais' && o.propria===true, c+' usa a escala de cereais, como escala própria');
});
ck(principais('cereais')==='0123456789','a escala de cereais tem os 10 estádios principais ('+principais('cereais')+')');

console.log('\n--- E os dois estádios que faltavam existem de verdade ---');
var cer=BBCH.cereais.map(function(e){return e.label;}).join(' | ');
ck(/perfilhamento/i.test(cer),'perfilhamento está na escala');
ck(/emborrachamento/i.test(cer),'emborrachamento está na escala');
ck(/folha bandeira/i.test(cer),'folha bandeira está na escala');

console.log('\n--- Arroz saiu do milho ---');
var oa=origem('Arroz');
ck(oa && oa.escala==='arroz' && oa.propria===true,'arroz tem escala própria');
ck(principais('arroz')==='0123456789','com os 10 estádios principais');
ck(/pan[íi]cula/i.test(BBCH.arroz.map(function(e){return e.label;}).join(' ')),'e com a emissão da panícula, que é dele');

console.log('\n--- O que continua emprestado é DECLARADO ---');
[['Pimentão','tomate'],['Melancia','melão'],['Girassol','soja'],['Uva','citros'],['Sorgo','cereais']].forEach(function(par){
  var o=origem(par[0]);
  ck(o && o.propria===false,par[0]+' é declarado como escala emprestada');
  ck(o && o.base===par[1],'  e diz de quem: '+(o&&o.base));
  ck(!!(o&&o.nota),'  com o motivo escrito');
});

console.log('\n--- O aviso aparece só quando há empréstimo ---');
ck(ctx.bbchAvisoHtml('Uva').indexOf('Escala emprestada')>=0,'uva mostra o aviso');
ck(ctx.bbchAvisoHtml('Uva').indexOf('citros')>=0,'e nomeia a escala de origem');
ck(ctx.bbchAvisoHtml('Trigo')==='','trigo NÃO mostra aviso — a escala é dele');
ck(ctx.bbchAvisoHtml('Soja')==='','soja também não');
ck(ctx.bbchAvisoHtml('Eucalipto')==='','cultura sem escala não mostra aviso de empréstimo');

console.log('\n--- Onde emprestar seria invenção, o app não oferece nada ---');
['Eucalipto','Seringueira','Erva-mate','Chá'].forEach(function(c){
  ck(!MAP[c],c+' saiu do mapa — não tem fenologia de fruto');
  ck(lista(c)===null,'  e o seletor de estádio não aparece para ele');
  ck(origem(c)===null,'  nem origem de escala');
});

console.log('\n--- As culturas que já tinham escala própria não mudaram ---');
[['Soja','soja'],['Milho','milho'],['Algodão','algodao'],['Café','cafe'],['Citros','citros'],
 ['Feijão','feijao'],['Tomate','tomate'],['Cana','cana'],['Melão','melao'],['Pastagem','pastagem']].forEach(function(p){
  var o=origem(p[0]);
  ck(o && o.escala===p[1] && o.propria===true,p[0]+' segue com a sua escala');
});

console.log('\n--- Cultura desconhecida não ganha escala por acidente ---');
ck(lista('Quiabo')===null,'cultura fora do mapa não tem lista');
ck(origem('')===null,'cultura vazia não tem origem');

console.log('\n--- O estádio JÁ GRAVADO se explica sozinho ---');
/* A limpeza do mapa deixou registros órfãos: um ensaio de eucalipto que gravou
   "89" o fez quando o app servia a escala do citros. O código fica — apagá-lo
   seria reescrever o passado — mas não pode voltar a parecer interpretável. */
vm.runInContext([pega('getBBCHInfo'),pega('bbchRotulo')].join('\n'),ctx);
var rot=ctx.bbchRotulo;
ck(rot('Trigo','21')==='BBCH 21 · Perfilhamento','trigo 21 diz perfilhamento: '+rot('Trigo','21'));
ck(rot('Trigo','45')==='BBCH 45 · Emborrachamento','trigo 45 diz emborrachamento');
ck(/escala de citros/.test(rot('Uva','65')),'uva declara de quem é a fase: '+rot('Uva','65'));
ck(/sem escala/.test(rot('Eucalipto','89')),'eucalipto órfão diz que não há escala: '+rot('Eucalipto','89'));
ck(/fora da escala/.test(rot('Trigo','63')),'código que não existe na escala é apontado: '+rot('Trigo','63'));
ck(rot('Soja','')==='','sem estádio gravado, nada é dito');

console.log('\n--- Todo estádio de toda escala é bem formado ---');
var ruins=0;
Object.keys(BBCH).forEach(function(k){
  BBCH[k].forEach(function(e){
    if(!/^\d{2}$/.test(e.code) || !e.label || !e.fase) ruins++;
  });
});
ck(ruins===0,'nenhum estádio malformado em '+Object.keys(BBCH).length+' escalas');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
