/* O essencial na tela, o resto atrás de um botão (roadmap §7.9).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A tela despejava tudo de uma vez: dose escrita, dose relida na outra unidade, por
 * frasco, total, calda por parcela, calda total, concentração, calda por frasco. Tudo
 * correto e tudo útil — para CONFERIR. Para EXECUTAR, no meio da lavoura com o celular
 * numa mão, o que se lê é uma coisa só: quanto pôr no frasco.
 *
 * Duas coisas precisam continuar valendo:
 *
 *  1. AVISO NUNCA SE ESCONDE. Esconder alerta atrás de um botão é o oposto de
 *     simplificar — é deixar o operador confiante e errado. Erro, aviso e problema de
 *     mistura aparecem nos dois modos, sem exceção. É a razão de este teste existir.
 *
 *  2. ESCONDER NÃO É DEIXAR DE CALCULAR. Os números continuam os mesmos nos dois
 *     modos; o que muda é o que se pinta. Se algum dia o modo essencial passar a
 *     calcular diferente do completo, este teste falha.
 *
 * Rodar: node test_calc_essencial.js
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

var ESTUDO={ id:'s1', codigo:'EST-1', numRepeticoes:4,
  tratamentos:[
    {id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
    {id:'T2',produto:'Sankari + Silwet',dose:'1,5 L/ha + 0,033%'},
    /* Dose que o produto não comporta: precisa gerar aviso de mistura. */
    {id:'T3',produto:'Produto B',dose:'sem número'},
    /* Strings propositalmente antigas: a receita estruturada deve mandar. */
    {id:'T4',produto:'Texto legado',dose:'99 L/ha',componentes:[
      {id:'cp1',itemId:'adj1',nome:'Adjuvante do banco',valor:.15,unidade:'% v/v'}
    ]}
  ]};
ctx._calcStudy=function(){ return ESTUDO; };
ctx._calcSel={qid:'Q1', sid:'s1'};
ctx._calcMemSync=function(){};
ctx._calcBarraSync=function(){};
ctx.studyMetodosVariam=function(){ return false; };
ctx.tratMetodo=function(){ return 'tractor'; };
ctx._calcSalvarParcela=function(){};

vm.runInContext([
  'var _calcDetalhe=false;',
  /* O volume de calda ambíguo é estado da tela: quando há um, a receita não é
     pintada. Aqui ele nasce nulo — este teste cobre a receita, não a pergunta. */
  'var _calcVolAmbiguo=null, _calcAba=null, _calcSel=null;',
  /* O Modo Preparo mostra um tratamento por vez; aqui a aba nasce nula, que
     equivale a "Todos" — este teste cobre a receita, não a navegação. */
  pega('_numBR'), pega('_calcNum'), pega('_calcVal'), pega('_calcCapAtualL'), pega('_calcDoseUnit'),
  /* A receita agora tem dose editável na linha: o compute pergunta se o
     tratamento tem receita estruturada e monta o seletor de unidade. */
  'var TRAT_COMP_UNIDADES=[[\'L/ha\',\'L/ha\'],[\'mL/ha\',\'mL/ha\'],[\'g/ha\',\'g/ha\'],[\'kg/ha\',\'kg/ha\'],[\'% v/v\',\'% v/v\']];',
  pega('calcAbas'), pega('calcAbaAtual'), pega('_calcFinalizado'),
  pega('tratComponentes'), pega('tratTemReceita'),
  pega('_seCompUnidadeNormalizar'), pega('_seCompUnidadeOptions'),
  pega('calcVolumeAmbiguoHtml'), pega('calcVolumeDoTratamento'), pega('_calcCompute')
].join('\n'), ctx);

function pinta(detalhe){
  ctx._calcDetalhe=detalhe;
  /* O Modo Preparo abre num tratamento por vez; este teste cobre a RECEITA (o
     que aparece no essencial e o que só aparece na conferência), não a
     navegação — que é do test_modo_preparo.js. Por isso pede a lista inteira. */
  ctx._calcAba='__todos';
  pintado.calcResults='';
  ctx._calcCompute();
  return pintado.calcResults||'';
}

/* ============================================================================== */
var ess=pinta(false), comp=pinta(true);

console.log('\n--- O essencial é "quanto pôr no frasco" ---');
ck(/Por frasco/.test(ess),'a coluna "Por frasco" aparece no essencial');
ck(/Calda \/ frasco/.test(ess),'e a calda por frasco também');
ck(/Calda total/.test(ess),'com a calda total, que é o que se prepara');
/* Conferência, não execução: sai do caminho de quem está aplicando. */
ck(!/>Dose</.test(ess),'a dose escrita NÃO aparece no essencial — ela já está no protocolo');
ck(!/>Total</.test(ess),'nem a coluna de total por componente');
ck(!/Concentração/.test(ess),'nem a concentração');
ck(!/Calda \/ parcela/.test(ess),'nem a calda por parcela');
ck(!/calc-eq/.test(ess),'nem a dose relida na outra unidade');

console.log('\n--- O completo traz tudo de volta ---');
ck(/>Dose</.test(comp),'a dose escrita volta');
ck(/>Total</.test(comp),'a coluna de total volta');
ck(/Concentração/.test(comp),'a concentração volta');
ck(/Calda \/ parcela/.test(comp),'a calda por parcela volta');
ck(/calc-eq/.test(comp),'e a leitura equivalente da dose volta');

console.log('\n--- O veículo fica nos dois modos ---');
/* "Água completa até X mL" é execução, não conferência: sem ela a receita não fecha
   o volume, e quem prepara não sabe até onde encher. */
ck(/calc-mixr carrier/.test(ess),'a linha do veículo aparece no essencial');
ck(/calc-mixr carrier/.test(comp),'e no completo');

console.log('\n--- AVISO NUNCA SE ESCONDE ---');
/* T3 tem produto sem dose numérica: parseComponents devolve problema. Esconder isso
   atrás de um botão deixaria o operador confiante e errado. */
ck(/calc-warn/.test(comp),'o modo completo mostra o aviso de mistura');
ck(/calc-warn/.test(ess),'e o essencial mostra o MESMO aviso — alerta não é detalhe');
var avisosEss=(ess.match(/calc-warn/g)||[]).length;
var avisosComp=(comp.match(/calc-warn/g)||[]).length;
eq(avisosEss,avisosComp,'o número de avisos é idêntico nos dois modos');

console.log('\n--- A testemunha continua sendo dita nos dois modos ---');
ck(/não preparar/.test(ess),'"não preparar" aparece no essencial');
ck(/não preparar/.test(comp),'e no completo');

console.log('\n--- Esconder não é deixar de calcular ---');
/* Parcela 5×2 m, 4 parcelas, 200 L/ha, volume morto 300 mL -> calda 1,1 L.
   T2: Sankari 1,5 L/ha -> 1,5 ÷ 200 × 1100 mL = 8,25 mL. Silwet 0,033% de 1100 = 0,363 mL.
   Os dois modos têm de trazer exatamente estes números. */
ck(/8,25 mL/.test(ess),'o essencial traz os 8,25 mL do Sankari');
ck(/8,25 mL/.test(comp),'e o completo traz os mesmos 8,25 mL');
ck(/363 µL/.test(ess),'o essencial traz os 363 µL do Silwet');
ck(/363 µL/.test(comp),'e o completo, os mesmos');
ck(/1,1 L/.test(ess)&&/1,1 L/.test(comp),'e a calda de 1,1 L bate nos dois');
ck(/Completar com Água até/.test(ess),'o preparo manda completar com água até o volume final');
ck(!/0,363 mL/.test(ess),'a tela não devolve o microlitro como decimal de mL');

console.log('\n--- A receita estruturada manda sobre o texto legado ---');
/* 0,15% de 1,1 L = 1,65 mL. Se a tela voltasse a ler "99 L/ha", apareceria um
   valor completamente diferente e o vínculo com o banco de itens seria perdido. */
ck(/Adjuvante do banco/.test(ess),'o componente vem da receita estruturada');
ck(/1,65 mL/.test(ess),'a dose estruturada de 0,15% calcula 1,65 mL');

console.log('\n--- A escolha é lembrada, e o padrão é o essencial ---');
ck(/CALC_DETALHE_KEY='agracta-calc-detalhe'/.test(src),'a preferência tem chave própria em localStorage');
ck(/localStorage\.getItem\(CALC_DETALHE_KEY\)==='1'/.test(src),
   'e o padrão é o ESSENCIAL: só o valor gravado "1" liga o completo');
ck(/onclick="calcToggleDetalhe\(\)"/.test(src),'e há um botão para alternar');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
