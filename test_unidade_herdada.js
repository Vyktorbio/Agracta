/* QUEM COMPLETA A DOSE SEM UNIDADE É O ESTUDO — não o vizinho de linha.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Quando alguém declara a unidade da dose, a auditoria do Agracta registra a frase
 * que define o ato: "é ela que passa a completar toda dose escrita sem unidade".
 * A calculadora não estava cumprindo isso em mistura.
 *
 * `doseUnidadeDe` lê a unidade do texto INTEIRO da dose. Num tratamento escrito
 * "1,5 L/ha + 0,2", ela encontra o "L" do primeiro componente e devolve L/ha — e
 * era esse L/ha que ia completar o "0,2" do segundo, mesmo num estudo declarado em
 * g/ha. O componente que não escreveu unidade nenhuma herdava a do vizinho de
 * linha, em vez da que o estudo declarou.
 *
 * Não é diferença de rótulo: 0,2 g/ha e 0,2 L/ha são mil vezes, e um se pesa
 * enquanto o outro se pipeta.
 *
 * A dose que TRAZ a sua unidade continua mandando na sua — a declaração completa
 * quem está sem, nunca sobrescreve quem escreveu.
 *
 * Rodar: node test_unidade_herdada.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var BC=require('./vendor/biocalc-campo-core.js');

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

var campos={calcLen:'5', calcWid:'2', calcPlots:'4', calcVol:'200',
            calcDead:'300', calcBottles:'1', calcCap:'0'};
var pintado={};
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  APP_VER:'teste', BioCalculoCampo:BC,
  document:{ getElementById:function(id){
    if(campos[id]!==undefined) return {value:campos[id]};
    if(id==='calcResults'||id==='calcMemBox'||id==='calcBarraBox')
      return {set innerHTML(v){ pintado[id]=v; }, get innerHTML(){ return pintado[id]||''; }};
    return null;
  }},
  esc:function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

/* Parcela 5×2 m, 4 parcelas, 200 L/ha, volume morto 300 mL -> calda 1,1 L.
   Mistura escrita à moda antiga: o primeiro traz a unidade, o segundo não. */
var ESTUDO={ id:'s1', codigo:'EST-1', numRepeticoes:4, doseUnidade:'g/ha',
  tratamentos:[ {id:'T1', produto:'Produto A + Produto B', dose:'1,5 L/ha + 0,2'} ] };
ctx._calcStudy=function(){ return ESTUDO; };
ctx._calcMemSync=function(){};
ctx._calcBarraSync=function(){};
ctx.studyMetodosVariam=function(){ return false; };
ctx._calcSalvarParcela=function(){};

vm.runInContext([
  'var _calcDetalhe=true;',
  'var _calcVolAmbiguo=null, _calcAba=null, _calcSel=null;',
  pega('_numBR'), pega('_calcNum'), pega('_calcVal'), pega('_calcCapAtualL'), pega('_calcDoseUnit'),
  pega('doseUnidades'), pega('doseUnidadeDeclarada'), pega('doseSemUnidade'), pega('doseUnidadePendente'), pega('doseUnidadeDe'),
  'var TRAT_COMP_UNIDADES=[[\'L/ha\',\'L/ha\'],[\'mL/ha\',\'mL/ha\'],[\'g/ha\',\'g/ha\'],[\'kg/ha\',\'kg/ha\'],[\'% v/v\',\'% v/v\']];',
  pega('calcAbas'), pega('calcAbaAtual'), pega('_calcFinalizado'),
  pega('tratComponentes'), pega('tratTemReceita'),
  pega('_seCompUnidadeNormalizar'), pega('_seCompUnidadeOptions'),
  pega('calcVolumeAmbiguoHtml'), pega('calcUnidadeDosePendenteHtml'), pega('calcVolumeDoTratamento'), pega('_calcCompute')
].join('\n'), ctx);

function pinta(){ ctx._calcAba='__todos'; pintado.calcResults=''; ctx._calcCompute(); return pintado.calcResults||''; }

/* ============================================================================== */
console.log('\n--- O motor sempre soube: o que decide é o fallback que se entrega a ele ---');
var comL=BC.parseComponents('Produto A + Produto B','1,5 L/ha + 0,2','L/ha');
var comG=BC.parseComponents('Produto A + Produto B','1,5 L/ha + 0,2','g/ha');
eq(comL.components[1].unidade,'L/ha','com fallback L/ha, o componente sem unidade vira L/ha');
eq(comG.components[1].unidade,'g/ha','com fallback g/ha, vira g/ha — mil vezes de diferença');
eq(comG.components[0].unidade,'L/ha','e o que escreveu a sua continua com a sua nos dois casos');

console.log('\n--- A tela entrega o que o ESTUDO declarou ---');
var tela=pinta();
/* 0,2 g/ha × 0,0055 ha de calda = 0,0011 g = 1,1 mg.
   Lido como 0,2 L/ha seriam 1,1 mL — mesmos dígitos, outro instrumento. */
ck(/1,1 mg/.test(tela),'o componente sem unidade sai em massa: 1,1 mg (0,2 g/ha)');
ck(!/1,1 mL/.test(tela),'e não em volume: 1,1 mL era a leitura herdada do vizinho de linha');
ck(/8,25 mL/.test(tela),'o componente que escreveu "1,5 L/ha" continua dando 8,25 mL');
ck(/0,2 g\/ha|0,2\s*g\/ha/.test(tela.replace(/&nbsp;/g,' ')),'a dose do segundo é mostrada em g/ha');

console.log('\n--- Sem estudo declarando nada, a calculadora pergunta (não herda) ---');
ESTUDO.doseUnidade='';
var semDecl=pinta();
ck(/DECLARE A UNIDADE DA DOSE/.test(semDecl),
   'texto de mistura com um componente sem unidade e estudo sem declaração: a pergunta volta');
ck(!/1,1 mg|1,1 mL/.test(semDecl),'e nada é calculado enquanto a pergunta estiver aberta');
ESTUDO.doseUnidade='g/ha';

console.log('\n--- A declaração completa quem está sem, nunca sobrescreve quem escreveu ---');
ESTUDO.tratamentos=[{id:'T1', produto:'Produto A', dose:'1,5 L/ha'}];
var soEscrita=pinta();
ck(/8,25 mL/.test(soEscrita),'"1,5 L/ha" num estudo declarado em g/ha continua sendo 1,5 L/ha');
ck(!/8,25 mg/.test(soEscrita),'a declaração não converte em massa o que já tinha unidade');

console.log('\n--- A memória de cálculo usa o MESMO fallback da tela ---');
/* O registro BPL não pode ser calculado com outra regra que a da tela: são o
   mesmo preparo. As duas funções leem `_fbUnidade`, e é isso que se cobra aqui. */
var memSrc=pega('calcMemoria'), compSrc=pega('_calcCompute');
[['calcMemoria',memSrc],['_calcCompute',compSrc]].forEach(function(par){
  ck(/var _fbUnidade=doseUnidadeDeclarada\(study\)\|\|dunit;/.test(par[1]),
     par[0]+' deriva a unidade que completa o componente a partir da declaração do estudo');
  ck(/parseStructuredComponents\(t\.componentes,_fbUnidade\)/.test(par[1]),
     par[0]+' entrega esse fallback à receita estruturada');
  ck(/parseComponents\(t\.produto, t\.dose, _fbUnidade\)/.test(par[1]),
     par[0]+' e ao texto legado');
});

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
