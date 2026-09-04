/* A dose chega ao motor — e só quando faz sentido.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O Agracta tem análise de dose-resposta completa em
 * `estatistica/bioengine/doseresponse.py`: correção de Abbott, GLM com link
 * escolhido por AIC, intervalo de Fieller, teste de paralelismo, comparação de
 * curvas. Ela nunca rodou uma única vez, porque a tabela que o app manda ao
 * motor não levava a DOSE — e o roteador não tem como escolher dose-resposta
 * sem preditor quantitativo.
 *
 * Só que ligar a dose SEM CRITÉRIO seria pior que deixar desligado. Num
 * rastreio de trinta produtos diferentes, cada um na sua dose, existe um número
 * na coluna "dose" e ele não forma curva nenhuma: ajustar uma CL50 ali produz um
 * número plausível e sem sentido, com intervalo de confiança e tudo. Número
 * errado com aparência de resultado é o pior tipo, porque ninguém revisa.
 *
 * Série de doses é uma coisa específica: O MESMO item, em doses diferentes, na
 * mesma unidade, com pelo menos três níveis. Com dois pontos passa uma reta por
 * qualquer lugar.
 *
 * Rodar: node test_dose_resposta.js
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

var ctx={
  data:{q1:{cultura:'Soja'}},
  LOCAIS:{}, QLOCAL:{},
  quadraNome:function(){ return 'Q1'; },
  studyCultura:function(s,q){ return (s&&s.cultura)||(q&&q.cultura)||''; },
  studyTestemunha:function(s){ return (s&&s._test)||''; },
  isoToBR:function(x){ return x; },
  tratComponentes:function(t){ return (t&&t.componentes)||[]; },
  doseUnidadeDe:function(s,d){ return /g\/ha/i.test(String(d))?'g/ha':'L/ha'; },
  _calcDoseUnit:function(){ return 'L/ha'; },
  _avRowKey:function(t,r){ return t+'|'+r; },
  _avNota:function(a,ref,v){ var n=(a&&a.notas)||{}; var o=n[ref.key]; return (o&&o[v]!=null)?o[v]:''; },
  _avTipo:function(a,v){ return (a&&a.tipos&&a.tipos[v])||'pct'; },
  _avCel:function(a,key,v){ return ((a&&a.bruto&&a.bruto[key])||{})[v]||null; },
  String:String, Object:Object, Math:Math, parseInt:parseInt, parseFloat:parseFloat,
  isNaN:isNaN, Array:Array
};
vm.createContext(ctx);
vm.runInContext([pega('_calcNum').replace(/var BC=[^\n]*\n\s*return[^\n]*\n/, 'return parseFloat(s.replace(",","."))||0;\n'),
                 pega('_doseSerieDoEstudo'), pega('_bioestatJobAoa')].join('\n'),ctx);

function trat(id,produto,dose,itemId,test){
  var t={id:id,produto:produto,dose:dose};
  if(itemId) t.componentes=[{itemId:itemId}];
  if(test) t.testemunha=true;
  return t;
}
function estudo(trats){ return {id:'s1',codigo:'E-1',cultura:'Soja',numRepeticoes:3,tratamentos:trats}; }

console.log('\n--- Série de doses de VERDADE: mesmo item, quatro níveis ---');
var serie=estudo([
  trat('T1','Testemunha','',null,true),
  trat('T2','Produto X','0,5','i1'),
  trat('T3','Produto X','1,0','i1'),
  trat('T4','Produto X','2,0','i1'),
  trat('T5','Produto X','4,0','i1')
]);
var s=ctx._doseSerieDoEstudo(serie);
ck(!!s,'reconhecida como série');
ck(s.niveis===4,'quatro níveis de dose distintos');
ck(s.doses['T1']===0,'a testemunha entra como dose ZERO — é o controle do Abbott');
ck(s.doses['T4']===2,'e as doses são numéricas');

console.log('\n--- REGRA: rastreio de produtos diferentes NÃO é curva ---');
var rastreio=estudo([
  trat('T1','Testemunha','',null,true),
  trat('T2','PTA-001','1,0','i1'),
  trat('T3','PTA-002','1,5','i2'),
  trat('T4','PTA-003','2,0','i3'),
  trat('T5','PTA-004','2,5','i4')
]);
ck(ctx._doseSerieDoEstudo(rastreio)===null,
   'cinco produtos diferentes com doses diferentes NÃO viram dose-resposta');

console.log('\n--- E as outras três contenções ---');
ck(ctx._doseSerieDoEstudo(estudo([
  trat('T1','Produto X','1,0','i1'), trat('T2','Produto X','2,0','i1')
]))===null,'duas doses só: por dois pontos passa qualquer reta');
ck(ctx._doseSerieDoEstudo(estudo([
  trat('T1','Produto X','1,0','i1'), trat('T2','Produto X','1,0','i1'),
  trat('T3','Produto X','1,0','i1'), trat('T4','Produto X','1,0','i1')
]))===null,'quatro tratamentos na MESMA dose não são quatro níveis');
ck(ctx._doseSerieDoEstudo(estudo([
  trat('T1','Produto X','1,0 L/ha','i1'), trat('T2','Produto X','2,0 L/ha','i1'),
  trat('T3','Produto X','500 g/ha','i1')
]))===null,'unidades misturadas: 1 L/ha e 1 g/ha não são o mesmo "1"');

console.log('\n--- Sem vínculo de item, o texto do produto decide ---');
ck(!!ctx._doseSerieDoEstudo(estudo([
  trat('T1','Sankari','0,5'), trat('T2','Sankari','1,0'),
  trat('T3','Sankari','2,0'), trat('T4','sankari ','4,0')
])),'mesmo texto (sem caixa nem espaço) é o mesmo produto');
ck(ctx._doseSerieDoEstudo(estudo([
  trat('T1','Sankari','0,5'), trat('T2','Silwet','1,0'), trat('T3','Assist','2,0')
]))===null,'textos diferentes, não');

console.log('\n--- A tabela que vai ao motor ganha a coluna Dose ---');
var av={id:'a1',data:'2026-09-01',variaveis:['mort'],tipos:{mort:'pct'},
        notas:{'T1|1':{mort:'2'},'T2|1':{mort:'30'},'T3|1':{mort:'55'},'T4|1':{mort:'80'},'T5|1':{mort:'95'}}};
var aoa=ctx._bioestatJobAoa('q1',serie,av,'mort');
ck(aoa[0].indexOf('Dose')>=0,'o cabeçalho tem Dose');
ck(aoa[0].indexOf('Afetados')<0,'mas NÃO tem Afetados — a variável é do tipo pct, não razão');
var iD=aoa[0].indexOf('Dose');
ck(aoa[1][iD]===0,'a linha da testemunha leva dose 0');
ck(aoa[5][iD]===4,'e a última leva 4');

console.log('\n--- No rastreio, a coluna nem existe ---');
var aoaR=ctx._bioestatJobAoa('q1',rastreio,
  {id:'a1',data:'2026-09-01',variaveis:['mort'],tipos:{},notas:{'T2|1':{mort:'30'}}},'mort');
ck(aoaR[0].indexOf('Dose')<0,'sem série, sem coluna Dose — nada muda para quem já usava');

console.log('\n--- Variável de RAZÃO leva n e N, que é o que a binomial pede ---');
var avR={id:'a2',data:'2026-09-01',variaveis:['mort'],tipos:{mort:'razao'},
  notas:{'T2|1':{mort:'60'},'T3|1':{mort:'80'}},
  bruto:{'T2|1':{mort:{n:30,N:50}},'T3|1':{mort:{n:40,N:50}}}};
var aoaN=ctx._bioestatJobAoa('q1',serie,avR,'mort');
ck(aoaN[0].indexOf('Afetados')>=0 && aoaN[0].indexOf('N_total')>=0,'cabeçalho ganha Afetados e N_total');
var iA=aoaN[0].indexOf('Afetados'), iN=aoaN[0].indexOf('N_total');
ck(aoaN[1][iA]===30 && aoaN[1][iN]===50,'x de n vai como contagem, não como porcentagem');

console.log('\n--- Parcela com meio par não entra pela metade ---');
var avM={id:'a3',data:'2026-09-01',variaveis:['mort'],tipos:{mort:'razao'},
  notas:{'T2|1':{mort:'60'}}, bruto:{'T2|1':{mort:{n:30}}}};
var aoaM=ctx._bioestatJobAoa('q1',serie,avM,'mort');
var jA=aoaM[0].indexOf('Afetados'), jN=aoaM[0].indexOf('N_total');
ck(aoaM[1][jA]==='' && aoaM[1][jN]==='',
   'sem o N, o n também não vai — meia informação faria o motor pesar errado');

console.log('\n--- Os nomes das colunas casam com o mapeamento de papéis do motor ---');
/* estatistica/app.js atribui papel por REGEX no nome da coluna. Se o nome não
   casar, a coluna vira "ignorar" e a dose-resposta não roda mesmo assim. */
var papel=fs.readFileSync('estatistica/app.js','utf8');
var reDose=/if\(\/([^/]+)\/\.test\(n\)\) papel="dose"/.exec(papel);
var reN=/else if\(\/([^/]+)\/\.test\(n\)\) papel="n_total"/.exec(papel);
var reResp=/else if\(\/([^/]+)\/\.test\(n\)\) papel="resposta"/.exec(papel);
ck(!!reDose && new RegExp(reDose[1]).test('dose'),'"Dose" cai no papel dose');
ck(!!reN && new RegExp(reN[1]).test('n_total'),'"N_total" cai no papel n_total');
ck(!!reResp && new RegExp(reResp[1]).test('afetados'),'"Afetados" cai no papel resposta');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
