/* Matriz Item × Dose: em que doses este item já foi testado.
 *
 * "Onde foi usado" é uma lista. A pergunta de pesquisa é outra: EM QUE DOSES, e
 * quantas vezes cada uma. Só dá para responder isso depois que o produto virou
 * identidade — antes, "Sankari" e "sankari" eram dois produtos diferentes.
 *
 * TRÊS COISAS QUE O RELATÓRIO NÃO PODE ERRAR:
 *
 *  1. A MESMA DOSE ESCRITA DE DOIS JEITOS É UMA LINHA SÓ. 0,4 L/ha e 400 mL/ha são
 *     a mesma dose. Se virarem duas linhas, a matriz mente sobre quantas vezes
 *     aquela dose foi testada.
 *  2. FAMÍLIAS DIFERENTES NÃO ESTÃO NA MESMA ESCADA. 0,4 L/ha (por área) e 2 mL/L
 *     (na calda) não se convertem sem a vazão. Empilhar as duas numa lista ordenada
 *     inventaria uma série que não existe — o motor de doses recusa a conversão, e
 *     o relatório tem de recusar junto.
 *  3. O QUE NÃO FOI LIDO APARECE. Um número que some do relatório é pior do que um
 *     marcado como ilegível — e o motivo tem de vir junto, senão ninguém corrige.
 *
 * Rodar: node test_matriz_dose.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var DoseCore=require('./vendor/dose-core.js');

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
function perto(a,b,n,tol){ var ok=Math.abs(a-b)<=(tol==null?1e-6:tol); ck(ok,n+(ok?'':' (obtido '+a+', esperado '+b+')')); }

var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  Object:Object, Array:Array, isFinite:isFinite, parseInt:parseInt, parseFloat:parseFloat,
  quadraNome:function(q){ return q; },
  studyCultura:function(s){ return s.cultura||''; },
  estudoFinalizado:function(s){ return !!s.finalizado; },
  esc:function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
};
ctx.window=ctx; ctx.globalThis=ctx;
ctx.window.DoseCore=DoseCore;
vm.createContext(ctx);
vm.runInContext([
  pega('_calcNum'),
  pega('_doseLer'), pega('_doseMotivo'),
  pega('itemOndeFoiUsado'), pega('itemMatrizDose'), pega('_itemMatrizHtml')
].join('\n'), ctx);

function usos(lista){
  ctx.data={ Q1:{ estudos:lista.map(function(x,i){
    return {id:'e'+i, codigo:'AGR-'+i, cultura:(x.cultura||'Soja'), finalizado:!!x.fin,
            tratamentos:[{id:'T1', itemId:'IT', dose:x.dose}]};
  })}};
}

console.log('\n--- A dose é lida como foi ESCRITA ---');
/* _calcDoseUnit() força tudo para unidade por área: leria "2 mL/L" como "2 mL/ha",
   que difere por três ordens de grandeza. */
eq(ctx._doseLer('0,4 L/ha').unidade,'L/ha','"0,4 L/ha" é dose por área');
eq(ctx._doseLer('400 mL/ha').unidade,'mL/ha','"400 mL/ha" também, em outra unidade');
eq(ctx._doseLer('2 mL/L').unidade,'mL/L','"2 mL/L" é concentração na calda, não dose por hectare');
eq(ctx._doseLer('1000 ppm').unidade,'ppm','ppm é reconhecido');
eq(ctx._doseLer('1,5 kg/ha').unidade,'kg/ha','kg/ha não é confundido com g/ha');
eq(ctx._doseLer('50 g/ha').unidade,'g/ha','nem g/ha com kg/ha');
perto(ctx._doseLer('0,4 L/ha').canonico.valor,400,'0,4 L/ha canoniza para 400 mL/ha');
perto(ctx._doseLer('400 mL/ha').canonico.valor,400,'e 400 mL/ha para o mesmo número');

console.log('\n--- A mesma dose escrita de dois jeitos é UMA linha ---');
usos([{dose:'0,4 L/ha'},{dose:'400 mL/ha'},{dose:'0,4 L/ha'}]);
var m=ctx.itemMatrizDose('IT');
eq(m.blocos.length,1,'uma família só, um bloco só');
eq(m.blocos[0].linhas.length,1,'e uma linha só: são a mesma dose');
eq(m.blocos[0].linhas[0].nUsos,3,'com os 3 usos contados juntos');
eq(m.blocos[0].linhas[0].texto,'0,4 L/ha','a grafia mais usada representa a linha');
ck(m.blocos[0].linhas[0].grafiasLista.indexOf('400 mL/ha')>=0,'e a outra grafia fica visível, não descartada');

console.log('\n--- Doses diferentes são linhas diferentes, em escada ---');
usos([{dose:'1 L/ha'},{dose:'0,5 L/ha'},{dose:'2 L/ha'},{dose:'0,5 L/ha'}]);
m=ctx.itemMatrizDose('IT');
eq(m.blocos[0].linhas.length,3,'três doses distintas');
eq(m.blocos[0].linhas.map(function(l){return l.texto;}).join(' < '),'0,5 L/ha < 1 L/ha < 2 L/ha','ordenadas de baixo para cima: é uma escada');
eq(m.blocos[0].linhas[0].nUsos,2,'a dose repetida acumula');

console.log('\n--- Famílias diferentes NÃO formam uma escada ---');
/* 0,4 L/ha e 2 mL/L não se convertem sem a vazão. O motor recusa; o relatório junto. */
usos([{dose:'0,4 L/ha'},{dose:'2 mL/L'},{dose:'1 L/ha'}]);
m=ctx.itemMatrizDose('IT');
eq(m.blocos.length,2,'dois blocos: por área e na calda');
eq(m.comparavel,false,'e a matriz se declara NÃO comparável');
var porArea=m.blocos.filter(function(b){return b.familia==='area';})[0];
var naCalda=m.blocos.filter(function(b){return b.familia==='calda';})[0];
eq(porArea.linhas.length,2,'a escada por área tem as suas duas doses');
eq(naCalda.linhas.length,1,'e a da calda a sua');
ck(!porArea.linhas.some(function(l){ return l.texto.indexOf('mL/L')>=0; }),'nenhuma dose de calda vazou para a escada por área');

var html=ctx._itemMatrizHtml('IT');
ck(html.indexOf('escalas diferentes')>=0,'a tela avisa que são escalas diferentes');
ck(html.indexOf('inventar uma serie que nao existe')>=0,'e diz por que não as junta');

console.log('\n--- Uma família só não ganha aviso: seria ruído ---');
usos([{dose:'1 L/ha'},{dose:'2 L/ha'}]);
m=ctx.itemMatrizDose('IT');
eq(m.comparavel,true,'com uma escala só, a matriz é comparável');
ck(ctx._itemMatrizHtml('IT').indexOf('escalas diferentes')<0,'e nenhum aviso aparece na tela');

console.log('\n--- "planta" não é "placa", mesmo com a mesma base ---');
/* mL/planta e mL/placa canonizam ambos para mL/alvo. Somá-los juntaria casa de
   vegetação com bancada. */
usos([{dose:'5 mL/planta'},{dose:'5 mL/placa'}]);
m=ctx.itemMatrizDose('IT');
eq(m.blocos.length,2,'dois blocos, apesar da base canônica ser a mesma');
eq(m.comparavel,false,'e não são comparáveis entre si');

console.log('\n--- O que não foi lido APARECE, com o motivo ---');
usos([{dose:'1 L/ha'},{dose:'0,05 %'},{dose:''},{dose:'a gosto'}]);
m=ctx.itemMatrizDose('IT');
eq(m.naoLidas.length,3,'os três ilegíveis são contados, não sumidos');
eq(m.nUsos,4,'e o total de usos continua batendo com a realidade');
var mot=m.naoLidas.map(function(x){return x.motivo;});
ck(mot.some(function(x){ return x.indexOf('v/v')>=0; }),'"%" sozinho é explicado: não diz se é v/v ou m/v');
ck(mot.some(function(x){ return x.indexOf('sem dose')>=0; }),'dose vazia é dita como vazia');
ck(mot.some(function(x){ return x.indexOf('sem numero')>=0; }),'e "a gosto" como sem número legível');
html=ctx._itemMatrizHtml('IT');
ck(html.indexOf('fora da matriz')>=0,'a tela mostra quantos ficaram de fora');
ck(html.indexOf('v/v')>=0,'com o motivo junto, para a pessoa poder corrigir o dado');

console.log('\n--- A matriz carrega o contexto que qualifica a dose ---');
/* "1 L/ha" em soja e "1 L/ha" em milho são dois dados, não um. */
usos([{dose:'1 L/ha', cultura:'Soja'},{dose:'1 L/ha', cultura:'Milho'},{dose:'1 L/ha', cultura:'Soja', fin:true}]);
m=ctx.itemMatrizDose('IT');
var ln=m.blocos[0].linhas[0];
eq(ln.nUsos,3,'os três usos na mesma dose');
eq(ln.nEstudos,3,'em três estudos');
eq(ln.culturasLista.sort().join(','),'Milho,Soja','com as duas culturas registradas');
eq(ln.finalizados,1,'e quantos já estão finalizados');

console.log('\n--- Item sem uso nenhum não inventa tela ---');
ctx.data={Q1:{estudos:[]}};
m=ctx.itemMatrizDose('IT');
eq(m.blocos.length,0,'nenhum bloco');
eq(ctx._itemMatrizHtml('IT'),'','e a ficha não ganha uma seção vazia');

console.log('\nResultado: '+p+' passaram; '+f+' falharam.');
if(f) process.exitCode=1;
