/* O NÚMERO NÃO SAI DA COLUNA.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A receita da bancada é uma tabela: cabeçalho em cima, uma linha por componente,
 * e o veículo fechando o volume. No modo essencial ela tem duas colunas —
 * "Componente" e "Por frasco" — porque "por frasco" é o único número que se lê com
 * o frasco na mão.
 *
 * Só que a dose passou a ser EDITÁVEL na própria linha (Modo Preparo), e a linha
 * editável tem três células numa grade declarada com duas colunas. O "por frasco"
 * caía para uma segunda linha da grade, embaixo do nome do componente — alinhado
 * com a coluna errada, ou seja, dizendo ser outra coisa. Numa tabela, a coluna é
 * metade do significado do número.
 *
 * A regra deste arquivo é uma só, e vale nos dois modos: TODA LINHA TEM TANTAS
 * CÉLULAS QUANTAS COLUNAS A GRADE DECLARA — o cabeçalho, as linhas de componente,
 * a linha do que ficou sem dose e a do veículo.
 *
 * Rodar: node test_calc_coluna.js
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

/* Um tratamento com receita ESTRUTURADA (a dose vira campo na linha) e outro com
   texto legado (a dose fica como texto). A mesma tabela precisa fechar nos dois. */
var ESTUDO={ id:'s1', codigo:'EST-1', numRepeticoes:4, doseUnidade:'L/ha',
  tratamentos:[
    {id:'T1',produto:'Sankari',dose:'1,5 L/ha',componentes:[
      {id:'cp1',itemId:'it1',nome:'Sankari',valor:1.5,unidade:'L/ha'},
      {id:'cp2',itemId:'adj1',nome:'Silwet',valor:0.033,unidade:'% v/v'}
    ]},
    /* Texto legado com nome duplo e uma dose só: gera a linha "não entra". */
    {id:'T2',produto:'Azoxistrobina + Benzovindiflupir 300 SC',dose:'0,5 L/ha'}
  ]};
ctx._calcStudy=function(){ return ESTUDO; };
ctx._calcSel={qid:'Q1', sid:'s1'};
ctx._calcMemSync=function(){};
ctx._calcBarraSync=function(){};
ctx.studyMetodosVariam=function(){ return false; };
ctx._calcSalvarParcela=function(){};

vm.runInContext([
  'var _calcDetalhe=false;',
  'var _calcVolAmbiguo=null, _calcAba=null, _calcSel=null;',
  pega('_numBR'), pega('_calcNum'), pega('_calcVal'), pega('_calcCapAtualL'), pega('_calcDoseUnit'),
  pega('doseUnidades'), pega('doseUnidadeDeclarada'), pega('doseSemUnidade'), pega('doseUnidadePendente'), pega('doseUnidadeDe'),
  'var TRAT_COMP_UNIDADES=[[\'L/ha\',\'L/ha\'],[\'mL/ha\',\'mL/ha\'],[\'g/ha\',\'g/ha\'],[\'kg/ha\',\'kg/ha\'],[\'% v/v\',\'% v/v\']];',
  pega('calcAbas'), pega('calcAbaAtual'), pega('_calcFinalizado'),
  pega('tratComponentes'), pega('tratTemReceita'),
  pega('_seCompUnidadeNormalizar'), pega('_seCompUnidadeOptions'),
  pega('calcVolumeAmbiguoHtml'), pega('calcVolumeDoTratamento'), pega('_calcCompute')
].join('\n'), ctx);

function pinta(detalhe){
  ctx._calcDetalhe=detalhe;
  ctx._calcAba='__todos';
  pintado.calcResults='';
  ctx._calcCompute();
  return pintado.calcResults||'';
}

/* Recorta cada tabela de receita e devolve as linhas com o que interessa:
   quantas COLUNAS a grade declara e quantas CÉLULAS a linha tem. */
function tabelas(html){
  return (html.match(/<div class="calc-mix">[\s\S]*?<\/div><\/div>/g)||[]).map(function(tab){
    var linhas=(tab.match(/<div class="calc-mix(?:h|r)[^"]*"[^>]*>[\s\S]*?(?=<div class="calc-mix|$)/g)||[]);
    return linhas.map(function(l){
      var st=l.match(/grid-template-columns:([^"]*)/);
      /* Sem style inline, vale a folha: .calc-mixh/.calc-mixr têm quatro colunas. */
      var colunas=st?(st[1].match(/minmax\(/g)||[]).length:4;
      /* Nenhuma célula desta tabela contém outro <span> ou <b> dentro de si, então
         contá-los é contar células. O <select> e o <i> da dose editável moram
         DENTRO da célula e não contam — é isso que se quer medir. */
      var celulas=(l.match(/<span/g)||[]).length+(l.match(/<b>/g)||[]).length;
      return {colunas:colunas, celulas:celulas, html:l};
    });
  });
}
function confereTabelas(html, modo){
  var tabs=tabelas(html);
  ck(tabs.length>0, 'no modo '+modo+' há receita pintada para conferir');
  var fora=[];
  tabs.forEach(function(linhas,i){
    linhas.forEach(function(l,j){
      if(l.celulas!==l.colunas) fora.push('tabela '+(i+1)+', linha '+(j+1)+': '+l.celulas+' célula(s) em '+l.colunas+' coluna(s)');
    });
  });
  ck(fora.length===0, 'no modo '+modo+', toda linha tem tantas células quantas colunas'+
     (fora.length?(' — '+fora.join(' · ')):''));
  return tabs;
}

/* ============================================================================== */
console.log('\n--- A grade fecha nos dois modos ---');
var ess=pinta(false), comp=pinta(true);
var tEss=confereTabelas(ess,'essencial');
var tComp=confereTabelas(comp,'completo');

console.log('\n--- A dose editável ganhou coluna, em vez de empurrar o número para fora ---');
/* T1 tem receita estruturada: a dose é campo na linha. Com duas colunas, a
   terceira célula caía para a linha de baixo — e o "por frasco" aparecia
   embaixo do nome do componente. */
var linhaEditavel=tEss[0].filter(function(l){ return /calc-mixr ed/.test(l.html); })[0];
ck(!!linhaEditavel,'a linha com dose editável existe no essencial');
eq(linhaEditavel.colunas,3,'e a grade daquela tabela declara três colunas');
eq(linhaEditavel.celulas,3,'com as três células da linha: componente, dose e por frasco');
ck(/calc-inpi/.test(linhaEditavel.html),'a dose é um campo, não um texto');
ck(/<b>8,25 mL<\/b>$|<b>8,25 mL<\/b><\/div>/.test(linhaEditavel.html),
   'e o "por frasco" é a ÚLTIMA célula da linha — a coluna que o cabeçalho anuncia');

console.log('\n--- O cabeçalho acompanha, e continua sem a dose escrita ---');
var cab=tEss[0][0];
eq(cab.colunas,3,'o cabeçalho tem as mesmas três colunas');
eq(cab.celulas,3,'e as mesmas três células');
ck(!/>Dose</.test(ess),'a dose ESCRITA continua fora do essencial — o que há na coluna é um campo');
ck(/>Por frasco</.test(cab.html),'e "Por frasco" continua sendo a última coluna');

console.log('\n--- Sem nada editável, a tabela volta a ter duas colunas ---');
/* T2 é texto legado: não há componente com id, não há o que editar na linha. */
var tabT2=tEss[1];
eq(tabT2[0].colunas,2,'a tabela do tratamento sem receita estruturada fica com duas colunas');
tabT2.forEach(function(l,i){ eq(l.celulas,2,'linha '+(i+1)+' da tabela sem edição tem duas células'); });

console.log('\n--- A linha do "não entra" e a do veículo também fecham ---');
var falta=tEss[1].filter(function(l){ return /calc-mixr falta/.test(l.html); })[0];
ck(!!falta,'o produto declarado sem dose continua aparecendo');
eq(falta.celulas,falta.colunas,'e a linha dele fecha a grade');
var veiculo=tEss[0].filter(function(l){ return /calc-mixr carrier/.test(l.html); })[0];
ck(!!veiculo,'a linha do veículo continua fechando a receita');
eq(veiculo.celulas,3,'e acompanha as três colunas quando há dose editável');

console.log('\n--- Estudo finalizado não tem dose editável, e a grade encolhe junto ---');
/* `_calcFinalizado` só pergunta quando há estudo selecionado na tela — e o
   preâmbulo do vm zera `_calcSel`, como nas outras extrações. */
ctx._calcSel={qid:'Q1', sid:'s1'};
ctx._bloqueadoPorFinalizacao=function(){ return true; };
var fim=pinta(false);
var tFim=confereTabelas(fim,'essencial (estudo finalizado)');
ck(!/calc-inpi/.test(fim),'num estudo finalizado não há campo de dose');
eq(tFim[0][0].colunas,2,'e a tabela volta às duas colunas do essencial');
ctx._bloqueadoPorFinalizacao=function(){ return false; };
ctx._calcSel=null;

console.log('\n--- Esconder não é deixar de calcular: os números não mudaram ---');
ck(/8,25 mL/.test(ess)&&/8,25 mL/.test(comp),'o Sankari continua dando 8,25 mL nos dois modos');
ck(/363 µL/.test(ess)&&/363 µL/.test(comp),'e o Silwet, 363 µL');

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
