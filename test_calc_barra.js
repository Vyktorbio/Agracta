/* Barra e calibração na calculadora de aplicação (roadmap §7.3).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A calculadora de calda responde "quanto preparar". A calibração responde a outra
 * metade: a máquina entregou mesmo a taxa do protocolo? São contas diferentes e a
 * segunda é a que um auditor cobra, porque é a única que liga o número escrito no
 * papel ao líquido que caiu na parcela.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. GOLDEN TEST (§23.1). 4 bicos × 0,5 m a 5 km/h, coletando 500 mL em 30 s, dão
 *     2 m de barra, 4 L/min e 240 L/ha. Números conferidos à mão. Se uma alteração
 *     futura mudar qualquer um deles, este teste falha — de propósito.
 *  2. O CV NÃO PODE SUMIR NA MÉDIA. Bicos coletando 300/500/500/700 dão a MESMA
 *     média e a MESMA taxa "certa" de 240 L/ha do conjunto perfeito. É o caso em que
 *     o número tranquiliza e a faixa está errada: parte da parcela recebe 40% menos
 *     que a dose. O CV tem de acusar, e como ERRO.
 *  3. Coleta zero é MEDIDA, não célula vazia. Bico entupido tem vazão zero e isso
 *     precisa entrar na média, derrubar a taxa e virar erro nominal — não sumir.
 *  4. Calibração incompleta NÃO entra na memória de cálculo. Bloco vazio num registro
 *     BPL sugere calibração que não houve, e sugerir é pior do que omitir.
 *
 * Rodar: node test_calc_barra.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var AC=require('./vendor/aplicacao-core.js');
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
function perto(a,b,tol,n){ var ok=(a!=null&&isFinite(a)&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* Campos da calculadora de calda que a barra consulta (só calcVol importa aqui). */
var campos={calcLen:'5', calcWid:'2', calcPlots:'4', calcVol:'200',
            calcDead:'300', calcBottles:'1', calcCap:'0'};
var store={};
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  APP_VER:'teste', AplicacaoCore:AC, BioCalculoCampo:BC,
  localStorage:{ getItem:function(k){ return store[k]==null?null:store[k]; },
                 setItem:function(k,v){ store[k]=String(v); },
                 removeItem:function(k){ delete store[k]; } },
  document:{ getElementById:function(id){ return campos[id]!==undefined?{value:campos[id]}:null; },
             querySelector:function(){ return null; },
             querySelectorAll:function(){ return []; } },
  esc:function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; },
  _currentUserName:function(){ return 'Daria'; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

var ESTUDO={id:'s1', codigo:'EST-26148',
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
               {id:'T2',produto:'Produto A',dose:'1,5 L/ha'}]};
ctx._calcStudy=function(){ return ESTUDO; };

vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcDoseUnit'),
  'var CALC_BARRA_EQUIP='+JSON.stringify({tractor:'Trator / barra tratorizada', co2:'Costal pressurizado a CO₂'})+';',
  'var _calcBarra=null, _calcBarraAberta=false;',
  pega('_calcBarraPadrao'), pega('_calcBarraChave'), pega('_calcBarraEstado'),
  pega('_calcBarraSalvar'), pega('_calcBarraReset'), pega('_calcBarraLinhas'),
  pega('calcBarraTaxa'), pega('calcBarraOperacao'),
  pega('_calcBarraTol'), pega('_calcBarraCv'),
  pega('calcBarraAvisos'), pega('calcBarraResumo'),
  pega('calcBarraSaidaHtml'), pega('calcBarraHtml'), pega('calcBarraCfg'),
  pega('_calcConfigAtual'), pega('calcMemoria'), pega('calcMemoriaTexto')
].join('\n'), ctx);

/* Monta a barra do zero em cada cenário. As leituras chegam como STRING porque é
   assim que saem de um <input>: se o motor deixasse de aceitar texto, a tela pararia
   de calibrar e nenhum teste que passasse número perceberia. */
function barra(extra){
  ctx._calcBarra=null; store={};
  var b=ctx._calcBarraEstado();
  for(var k in extra) b[k]=extra[k];
  return b;
}
function coletas(vals){ return vals.map(function(v){ return [String(v),String(v),String(v)]; }); }

/* ============================================================================== */
console.log('\n--- GOLDEN TEST: 4 bicos × 0,5 m, 5 km/h, 500 mL em 30 s, meta 240 L/ha ---');
/* Largura = 4 × 0,5 = 2 m.
   Vazão requerida = 240 L/ha × 5 km/h × 2 m ÷ 600 = 4,000 L/min.
   Coleta esperada = 4 L/min × 1000 × 30 s ÷ 60 = 2000 mL na barra, 500 mL por bico.
   Medido: 500 mL/bico em 30 s = 1,000 L/min/bico = 4,000 L/min.
   Taxa real = 600 × 4 ÷ (5 × 2) = 240 L/ha -> desvio 0.
   Velocidade ideal = 600 × 4 ÷ (240 × 2) = 5,00 km/h. */
var b=barra({taxaAlvo:'240', leiturasBico:coletas([500,500,500,500])});
var op=ctx.calcBarraOperacao(b);
perto(op.width,2,1e-9,'largura de trabalho = bicos × espaçamento = 2 m');
perto(op.requiredFlow,4,1e-9,'vazão requerida 4,000 L/min');
perto(op.requiredCollectionTotalMl,2000,1e-6,'coleta esperada na barra 2000 mL');
perto(op.requiredCollectionPerNozzleMl,500,1e-6,'coleta esperada por bico 500 mL');
perto(op.measuredFlow,4,1e-9,'vazão medida 4,000 L/min');
perto(op.calibration.perNozzleFlow,1,1e-9,'vazão por bico 1,000 L/min');
perto(op.actualRate,240,1e-9,'taxa real 240 L/ha');
perto(op.deviationPct,0,1e-9,'desvio 0%');
perto(op.idealSpeed,5,1e-9,'velocidade ideal 5,00 km/h');
perto(op.calibration.cv,0,1e-9,'CV 0% com os quatro bicos iguais');
eq(op.calibration.valid,true,'calibração completa com 12 leituras');
eq(op.calibration.requiredInputs,12,'4 bicos × 3 repetições = 12 leituras exigidas');

console.log('\n--- Largura manual sobrepõe bicos × espaçamento ---');
/* Barra de 3 m declarada à mão: a vazão requerida sobe na mesma proporção
   (240 × 5 × 3 ÷ 600 = 6 L/min) mesmo com os mesmos 4 bicos. */
var op2=ctx.calcBarraOperacao(barra({taxaAlvo:'240', larguraManual:'3', leiturasBico:coletas([500,500,500,500])}));
perto(op2.width,3,1e-9,'largura manual de 3 m vence bicos × espaçamento');
perto(op2.requiredFlow,6,1e-9,'vazão requerida acompanha a largura declarada');
perto(op2.actualRate,160,1e-9,'mesma vazão medida em faixa maior = 160 L/ha');

console.log('\n--- O CV NÃO PODE SUMIR NA MÉDIA: 300/500/500/700 mL ---');
/* Média 500 mL, exatamente como no conjunto perfeito. A taxa fecha em 240 L/ha e o
   desvio dá zero — e mesmo assim um terço da faixa recebe 40% menos que a dose.
   Desvio-padrão amostral = raiz(80000/3) = 163,299 -> CV = 32,66%. */
var bcv=barra({taxaAlvo:'240', leiturasBico:coletas([300,500,500,700])});
var ocv=ctx.calcBarraOperacao(bcv);
perto(ocv.actualRate,240,1e-9,'taxa real continua 240 L/ha — a média não denuncia nada');
perto(ocv.deviationPct,0,1e-9,'desvio continua 0% — a média não denuncia nada');
perto(ocv.calibration.cv,32.6599,1e-3,'CV = 32,66%');
var acv=ctx.calcBarraAvisos(ocv,bcv);
ck(acv.some(function(a){ return a.k==='erro' && /CV/.test(a.t); }),'CV acima do limite vira ERRO, não aviso');
ck(acv.some(function(a){ return a.k==='ok' && /Taxa real/.test(a.t); }),'a taxa média continua sendo reportada como ok — as duas verdades convivem');
ck(/⚠/.test(ctx.calcBarraResumo(ocv,bcv)),'o resumo fechado marca o problema sem precisar abrir a seção');

console.log('\n--- Coleta zero é medida, não célula vazia ---');
/* Bico 2 entupido: 0 mL nas três leituras. A calibração continua COMPLETA (nada
   falta), a média do bico é 0, a vazão cai para 3 L/min e a taxa para 180 L/ha. */
var bz=barra({taxaAlvo:'240', leiturasBico:coletas([500,0,500,500])});
var oz=ctx.calcBarraOperacao(bz);
eq(oz.calibration.valid,true,'zero não é leitura faltando: a calibração está completa');
eq(JSON.stringify(oz.calibration.zeroNozzles),'[2]','bico 2 identificado pelo número, começando em 1');
perto(oz.calibration.means[1],0,1e-9,'a média do bico entupido é 0, não nula');
perto(oz.measuredFlow,3,1e-9,'vazão medida cai para 3 L/min');
perto(oz.actualRate,180,1e-9,'taxa real cai para 180 L/ha');
perto(oz.deviationPct,-25,1e-9,'desvio de −25%');
var az=ctx.calcBarraAvisos(oz,bz);
ck(az.some(function(a){ return a.k==='erro' && /Bico\(s\) 2/.test(a.t); }),'bico zerado vira erro nominal');
ck(az.some(function(a){ return a.k==='erro' && /recalibrar/.test(a.t); }),'desvio acima do dobro da tolerância não libera aplicação');

console.log('\n--- Leitura negativa bloqueia a calibração ---');
var bn=barra({taxaAlvo:'240', leiturasBico:[['-5','500','500'],['500','500','500'],['500','500','500'],['500','500','500']]});
var on=ctx.calcBarraOperacao(bn);
eq(on.calibration.negativeCount,1,'uma leitura negativa contada');
eq(on.calibration.valid,false,'negativo invalida a calibração inteira');
ck(ctx.calcBarraAvisos(on,bn).some(function(a){ return a.k==='erro' && /negativo/.test(a.t); }),'leitura negativa é erro explícito');

console.log('\n--- Método "barra inteira": 3 coletas do conjunto ---');
/* 2000 mL em 30 s = 4,000 L/min — o mesmo resultado por outro caminho de medição. */
var bw=barra({taxaAlvo:'240', metodo:'barra', leiturasBarra:['2000','2000','2000']});
var ow=ctx.calcBarraOperacao(bw);
eq(ow.calibration.requiredInputs,3,'barra inteira exige 3 leituras, não 12');
perto(ow.measuredFlow,4,1e-9,'vazão medida 4,000 L/min');
perto(ow.actualRate,240,1e-9,'taxa real 240 L/ha');
eq(JSON.stringify(ow.calibration.zeroNozzles),'[]','sem leitura por bico não há como acusar bico entupido');

console.log('\n--- Taxa-alvo em branco cai no volume de calda da calculadora ---');
var bt=barra({taxaAlvo:'', leiturasBico:coletas([500,500,500,500])});
perto(ctx.calcBarraTaxa(bt),200,1e-9,'sem taxa própria, usa os 200 L/ha do campo calcVol');
campos.calcVol='';
perto(ctx.calcBarraTaxa(bt),0,1e-9,'sem nenhum dos dois, taxa 0 — e não um palpite');
ck(ctx.calcBarraAvisos(ctx.calcBarraOperacao(bt),bt).some(function(a){ return /taxa-alvo/i.test(a.t); }),'a falta de taxa-alvo é dita, não silenciada');
campos.calcVol='200';

console.log('\n--- A matriz acompanha o nº de bicos sem perder o que foi digitado ---');
var bm=barra({bicos:4, leiturasBico:coletas([500,600,700,800])});
eq(ctx._calcBarraLinhas(bm).length,4,'quatro linhas para quatro bicos');
bm.bicos=2;
eq(ctx._calcBarraLinhas(bm).length,2,'reduzir para 2 bicos mostra 2 linhas');
perto(ctx.calcBarraOperacao(bm).calibration.requiredInputs,6,1e-9,'e o motor passa a exigir 6 leituras');
bm.bicos=4;
eq(ctx._calcBarraLinhas(bm)[3][0],'800','voltar a 4 bicos reencontra a coleta do bico 4 — nada foi truncado');

console.log('\n--- Tolerância e limite de CV são do protocolo, não do programa ---');
var bp=barra({taxaAlvo:'240', tolerancia:'', cvLimite:'', leiturasBico:coletas([500,500,500,500])});
perto(ctx._calcBarraTol(bp),5,1e-9,'tolerância em branco cai no padrão ±5%');
perto(ctx._calcBarraCv(bp),10,1e-9,'limite de CV em branco cai no padrão 10%');
var bp2=barra({taxaAlvo:'240', cvLimite:'40', leiturasBico:coletas([300,500,500,700])});
ck(ctx.calcBarraAvisos(ctx.calcBarraOperacao(bp2),bp2).some(function(a){ return a.k==='ok' && /CV/.test(a.t); }),
   'com limite de CV de 40% declarado, os mesmos 32,66% passam — o critério é do ensaio');

console.log('\n--- Calibração incompleta não entra na memória de cálculo ---');
barra({taxaAlvo:'240', leiturasBico:[['500','500','500']]});   /* só o bico 1 medido */
eq(ctx.calcBarraCfg(),null,'sem calibração válida, calcBarraCfg devolve null');
eq(ctx._calcConfigAtual().barra,null,'e a configuração da tela não carrega barra nenhuma');
var memSem=ctx.calcMemoria(ESTUDO, ctx._calcConfigAtual());
eq(memSem.barra,null,'a memória grava barra:null — ausência explícita, não bloco vazio');
ck(!/BARRA E CALIBRAÇÃO/.test(ctx.calcMemoriaTexto(memSem)),'e o texto copiado não inventa uma seção de calibração');

console.log('\n--- Calibração válida entra inteira, com motor e leituras ---');
barra({taxaAlvo:'240', leiturasBico:coletas([500,500,500,500])});
var cfg=ctx._calcConfigAtual();
ck(!!cfg.barra,'configuração da tela carrega a barra calibrada');
eq(cfg.barra.motor,'AplicacaoCore','a memória registra QUAL motor calibrou');
eq(cfg.barra.motorVersao,AC.VERSION,'e em que versão — sem isso o número não se reconfere depois');
eq(cfg.barra.bicos,4,'nº de bicos gravado');
perto(cfg.barra.resultado.taxaRealLHa,240,1e-9,'taxa real gravada');
perto(cfg.barra.resultado.cvPct,0,1e-9,'CV gravado');
eq(cfg.barra.leituras.bicos.length,4,'as leituras brutas vão junto — resultado sem dado bruto não se audita');
eq(cfg.barra.leituras.bicos[0][0],'500','leitura bruta preservada como foi digitada');

var mem=ctx.calcMemoria(ESTUDO, cfg);
ck(!!mem.barra,'a memória promove a barra a campo próprio');
eq(mem.entradas.barra,undefined,'e NÃO a deixa duplicada dentro de entradas');
eq(mem.entradas.parcelaComprimento,5,'as entradas da calda seguem intactas');
var txt=ctx.calcMemoriaTexto(mem);
ck(/BARRA E CALIBRAÇÃO/.test(txt),'o texto copiado traz a seção de calibração');
ck(/240/.test(txt),'com a taxa real');
ck(/Motor da calibração: AplicacaoCore/.test(txt),'e o motor que a produziu');

console.log('\n--- A barra não contamina o cálculo da calda ---');
/* Golden test da memória: parcela 5×2 m, 4 parcelas, 200 L/ha -> 0,004 ha -> 800 mL
   + 300 mL de volume morto = 1,1 L. T2 a 1,5 L/ha -> 6 mL de produto no aplicado,
   e 8,25 mL no preparo de 1,1 L. Ligar a calibração não pode mexer nisso. */
var t2=mem.tratamentos.filter(function(t){ return t.id==='T2'; })[0];
perto(t2.caldaTotalL,1.1,1e-9,'calda total continua 1,1 L com a barra ligada');
perto(t2.componentes[0].total,8.25,1e-9,'produto do T2 continua 8,25 mL');

console.log('\n--- A ficha da aplicação sabe dizer se há calibração junto ---');
var res=vm.runInContext('('+pega('aplicacaoMemoriaResumo')+')', ctx)({memoriaCalculo:mem});
ck(!!res.barra,'o resumo da aplicação enxerga a barra');
perto(res.barra.taxaRealLHa,240,1e-9,'e reporta a taxa real medida');
eq(vm.runInContext('('+pega('aplicacaoMemoriaResumo')+')', ctx)({memoriaCalculo:memSem}).barra,null,
   'sem calibração, o resumo diz null em vez de fingir que houve');

console.log('\n--- A tela desenha sem quebrar nos dois métodos ---');
ctx._calcBarraAberta=true;
barra({taxaAlvo:'240', leiturasBico:coletas([500,500,500,500])});
var h=ctx.calcBarraHtml();
ck(/calcBarraOut/.test(h),'o HTML aberto tem onde pendurar a saída');
ck(/_calcBarraLeitura\(3,2,/.test(h),'a matriz liga a última célula do último bico');
ck(/Meta por bico/.test(h),'a meta por bico aparece antes da coleta, que é quando serve');
barra({taxaAlvo:'240', metodo:'barra', leiturasBarra:['2000','2000','2000']});
ck(/_calcBarraLeitura\(0,2,/.test(ctx.calcBarraHtml()),'barra inteira liga as três coletas');
ctx._calcBarraAberta=false;
ck(!/calcBarraOut/.test(ctx.calcBarraHtml()),'fechada, a seção mostra só o cabeçalho e o resumo');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
