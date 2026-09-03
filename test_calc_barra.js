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

/* Campos da calculadora de calda que a calibração conecta à parcela. */
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
  isQuadraLab:function(){ return false; },   /* estudo de campo */
  tratMetodo:function(){ return 'co2'; },
  _currentUserName:function(){ return 'Daria'; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

var ESTUDO={id:'s1', codigo:'EST-26148',
  protocolo:{equipamento:'Pulverizador costal pressurizado a CO2', bicos:'4 bicos x 0,5 m',
             ponta:'XR11002', pressao:'2 bar', volumeCalda:'200'},
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
               {id:'T2',produto:'Produto A',dose:'1,5 L/ha'}]};
ctx._calcStudy=function(){ return ESTUDO; };

vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcDoseUnit'),
  'var CALC_BARRA_EQUIP='+JSON.stringify({tractor:'Trator — sider', co2:'Costal pressurizado a CO₂'})+';',
  'var APLIC_METODOS='+JSON.stringify({tractor:'Trator — sider',co2:'Costal pressurizado a CO₂',drone:'Drone',atomizer:'Atomizador costal motorizado',lab:'Torre de Potter — bancada'})+';',
  "var _CALC_BARRA_FORA={drone:'drone', atomizer:'atomizador', lab:'Torre de Potter'};",
  pega('aplicMetodosDe'), pega('aplicMetodoValido'), pega('aplicMetodoDoTexto'),
  pega('studyMetodo'), pega('_calcBarraMetodo'),
  'var _calcBarra=null, _calcBarraAberta=false;',
  pega('_parseBicos'), pega('_calcBarraEquip'), pega('_calcBarraProto'),
  pega('_calcBarraPadrao'), pega('_calcBarraChave'), pega('_calcBarraEstado'),
  pega('_calcBarraSalvar'), pega('_calcBarraReset'), pega('_calcBarraLinhas'),
  pega('calcBarraTaxa'), pega('calcBarraOperacao'), pega('calcBarraParcela'),
  pega('_calcBarraTol'), pega('_calcBarraCv'),
  pega('calcBarraAvisos'), pega('calcBarraResumo'),
  pega('calcBarraSaidaHtml'), pega('calcBarraHtml'), pega('calcBarraCfg'),
  pega('_calcConfigAtual'), pega('calcMemoria'), pega('calcMemoriaTexto')
].join('\n'), ctx);

/* Monta a barra do zero em cada cenário. As leituras chegam como STRING porque é
   assim que saem de um <input>: se o motor deixasse de aceitar texto, a tela pararia
   de calibrar e nenhum teste que passasse número perceberia. */
/* O padrao agora NASCE EM BRANCO no que e medida (velocidade, e bicos/espacamento
   quando o protocolo nao diz). Os cenarios abaixo declaram o que precisam, que e como
   o operador declara na tela. */
function barra(extra){
  ctx._calcBarra=null; store={};
  var b=ctx._calcBarraEstado();
  b.bicos=4; b.espacamento=0.5; b.velocidade=5; b.larguraManual=0;
  for(var k in extra) b[k]=extra[k];
  return b;
}
function coletas(vals){ return vals.map(function(v){ return [String(v),String(v),String(v)]; }); }
/* calcBarraCfg le o estado corrente, entao o cenario precisa estar instalado. */
function cfgSider(b){ ctx._calcBarra=b; return ctx.calcBarraCfg(); }

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

console.log('\n--- Costal CO₂ conectado à parcela por área ---');
/* Parcela 0,80 × 1,00 m = 0,8 m²; a 200 L/ha são 16 mL. Com faixa de
   1 m e 1,8 km/h (0,5 m/s), é uma passada de 0,8 m em 1,6 s. */
campos.calcLen='0.8'; campos.calcWid='1'; campos.calcVol='200';
var bco2=barra({equipamento:'co2',bicos:2,espacamento:.5,velocidade:1.8,taxaAlvo:'200'});
var oco2=ctx.calcBarraOperacao(bco2), pco2=ctx.calcBarraParcela(oco2,bco2);
perto(pco2.areaM2,.8,1e-9,'área da parcela = 0,8 m²');
perto(pco2.caldaAlvoMl,16,1e-9,'calda-alvo por parcela = 16 mL');
eq(pco2.passadas,1,'faixa de 1 m fecha a largura com uma passada');
perto(pco2.tempoPassadaS,1.6,1e-9,'percurso de 0,8 m a 1,8 km/h leva 1,6 s');
ctx._calcBarra=bco2; ctx._calcBarraAberta=true;
ck(/COSTAL CO₂ E CALIBRAÇÃO/.test(ctx.calcBarraHtml()),'a seção se identifica como costal CO₂, não como trator');
ck(/POR PARCELA/.test(ctx.calcBarraSaidaHtml())&&/16 mL/.test(ctx.calcBarraSaidaHtml()),
   'a saída mostra o volume operacional por parcela');
ctx._calcBarraAberta=false; campos.calcLen='5'; campos.calcWid='2';

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
ck(!/(?:COSTAL CO₂|SIDER) E CALIBRAÇÃO/.test(ctx.calcMemoriaTexto(memSem)),'e o texto copiado não inventa uma seção de calibração');

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
ck(/COSTAL CO₂ E CALIBRAÇÃO/.test(txt),'o texto copiado traz a seção de calibração do equipamento certo');
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

console.log('\n--- A maquina vem do protocolo, nao do teclado ---');
/* A planilha de protocolo tem UMA celula para bicos e espacamento, entao ela chega
   como texto livre. Pedir de novo o que ela ja diz e o que "poluir a interface"
   significa na pratica. */
eq(JSON.stringify(ctx._parseBicos('4 bicos x 0,5 m')),'{"bicos":4,"espacamento":0.5}','"4 bicos x 0,5 m"');
eq(JSON.stringify(ctx._parseBicos('6 bicos espacados 50 cm')),'{"bicos":6,"espacamento":0.5}','cm vira m');
eq(JSON.stringify(ctx._parseBicos('4 x 0,5 m')),'{"bicos":4,"espacamento":0.5}','sem a palavra "bico"');
eq(ctx._parseBicos('4').bicos,4,'so a contagem');
eq(ctx._parseBicos('4').espacamento,null,'sem espacamento declarado nao se inventa um');
eq(ctx._parseBicos('0,5 m').espacamento,0.5,'so o espacamento');
eq(ctx._parseBicos('0,5 m').bicos,null,'0,5 nao vira "0 bicos" nem "5 bicos"');
eq(ctx._parseBicos(''),null,'celula vazia nao vira configuracao');
eq(ctx._parseBicos('a definir'),null,'texto sem numero nao vira configuracao');
eq(JSON.stringify(ctx._parseBicos('11 bicos, 0,5 m, ponta XR11002')),'{"bicos":11,"espacamento":0.5}',
   'o numero do modelo da ponta nao contamina a leitura');

eq(ctx._calcBarraEquip('Pulverizador costal pressurizado a CO2').chave,'co2','costal a CO2');
eq(ctx._calcBarraEquip('Trator — sider').chave,'tractor','sider fica: o calculo dele e o usual');
eq(ctx._calcBarraEquip('Trator com barra').chave,'tractor','"trator" no protocolo e o sider');
/* Drone, atomizador e Potter o motor calcula, mas esta tela nao expoe. Trata-los como
   barra daria largura e taxa plausiveis para maquina que nao tem barra. */
eq(ctx._calcBarraEquip('Drone DJI Agras T25P').chave,null,'drone nao vira barra em silencio');
eq(ctx._calcBarraEquip('Drone DJI Agras T25P').naoSuportado,'drone','e a tela diz por que');
eq(ctx._calcBarraEquip('Torre de Potter').naoSuportado,'Torre de Potter','bancada idem');
/* O metodo DECLARADO manda sobre a frase do protocolo: um estudo declarado de drone
   nao pode continuar sendo calibrado como barra porque a planilha escreveu
   "pulverizador". */
var GUARDAM=ESTUDO.metodoAplicacao;
ESTUDO.metodoAplicacao='drone'; ctx._calcBarra=null; store={};
eq(ctx._calcBarraProto().naoSuportado,'drone','o metodo declarado vence o texto do protocolo');
ESTUDO.metodoAplicacao=GUARDAM; ctx._calcBarra=null; store={};
eq(ctx._calcBarraEquip('Costal CO2 sobre o sider').chave,'co2','costal vence quando as duas palavras aparecem');

ctx._calcBarra=null; store={};
var bproto=ctx._calcBarraEstado();
eq(bproto.equipamento,'co2','equipamento herdado do protocolo');
eq(bproto.bicos,4,'nº de bicos herdado');
eq(bproto.espacamento,0.5,'espacamento herdado');
eq(ctx._calcBarraProto().ponta,'XR11002','ponta lida do protocolo');
eq(ctx._calcBarraProto().pressao,'2 bar','pressao lida do protocolo');

console.log('\n--- O que e MEDIDA nasce em branco, nao com um palpite ---');
/* Um "5 km/h" chumbado que ninguem corrigiu nao deixa a tela vazia: produz uma taxa
   real plausivel e FALSA. Em branco, o aviso diz o que falta. */
eq(bproto.velocidade,'','velocidade nasce em branco — ninguem sabe a velocidade do trator');
eq(bproto.tempoS,30,'tempo de coleta 30 s permanece: e convencao de metodo, nao medida');
var oproto=ctx.calcBarraOperacao(bproto);
eq(oproto.actualRate,null,'sem velocidade nao existe taxa real');
ck(ctx.calcBarraAvisos(oproto,bproto).some(function(a){ return /velocidade/i.test(a.t); }),'e o aviso cobra a velocidade');

/* Estudo sem protocolo importado: nada e inventado. */
var GUARDA=ESTUDO.protocolo; ESTUDO.protocolo=null;
ctx._calcBarra=null; store={};
var bsem=ctx._calcBarraEstado();
eq(bsem.bicos,'','sem protocolo, nº de bicos em branco — nao "4"');
eq(bsem.espacamento,'','sem protocolo, espacamento em branco — nao "0,5"');
eq(ctx.calcBarraOperacao(bsem).actualRate,null,'e nenhuma taxa e produzida do nada');
/* CONSEQUENCIA DO PADRAO SER O SIDER: sem protocolo, o metodo e barra inteira, e nao
   ha matriz bico a bico — porque no sider nao se coleta bico a bico. E correto, e
   precisa continuar assim. */
eq(bsem.equipamento,'tractor','sem protocolo, o padrao da operacao e o sider');
eq(ctx._calcBarraMetodo(bsem),'barra','e no sider a leitura e da barra inteira');
ctx._calcBarraAberta=true;
ck(!/Método de coleta/.test(ctx.calcBarraHtml()),'sem escolha de metodo, porque nao ha o que escolher');
/* Ja quem DECLARA o costal recebe a matriz — e ela nao abre sem os bicos. */
bsem.equipamento='co2'; ctx._calcBarra=bsem;
ck(/Informe o nº de bicos/.test(ctx.calcBarraHtml()),'no costal, a planilha de coleta nao abre sem bicos declarados');
ctx._calcBarraAberta=false;
ESTUDO.protocolo=GUARDA; ctx._calcBarra=null; store={};

console.log('\n--- Ponta e pressao entram no registro sem virar campo ---');
/* "4 L/min" sem dizer com que ponta e a que pressao nao se reproduz. */
barra({taxaAlvo:'240', leiturasBico:coletas([500,500,500,500])});
var cfgP=ctx._calcConfigAtual();
eq(cfgP.barra.equipamento,'co2','o registro grava a maquina');
eq(cfgP.barra.equipamentoRotulo,'Costal pressurizado a CO₂','com o rotulo por extenso');
eq(cfgP.barra.ponta,'XR11002','ponta gravada na memoria');
eq(cfgP.barra.pressao,'2 bar','pressao gravada na memoria');
ck(/XR11002/.test(ctx.calcMemoriaTexto(ctx.calcMemoria(ESTUDO,cfgP))),'e sai no texto copiado');

console.log('\n--- O sider nao se coleta bico a bico ---');
/* O costal a CO2 e o pulverizador de pesquisa: cada bico vai para um copo. O sider e a
   maquina usual de campo — ninguem coleta bico a bico nela. O calculo dela e o de
   sempre, e a barra inteira se confere em tres coletas. */
var bs=barra({equipamento:'tractor', taxaAlvo:'240', metodo:'individual',
              leiturasBarra:['2000','2000','2000']});
eq(ctx._calcBarraMetodo(bs),'barra','no sider o metodo nao e escolha: e consequencia da maquina');
var os=ctx.calcBarraOperacao(bs);
eq(os.calibration.requiredInputs,3,'tres coletas da barra, nao 12');
perto(os.measuredFlow,4,1e-9,'vazao medida 4,000 L/min');
perto(os.actualRate,240,1e-9,'e o calculo usual entrega os mesmos 240 L/ha');
perto(os.requiredFlow,4,1e-9,'com a vazao requerida que se ajusta na maquina');
eq(cfgSider(bs).metodo,'barra inteira','o registro grava o metodo real, nao o que estava guardado');
eq(cfgSider(bs).equipamentoRotulo,'Trator — sider','e a maquina certa');

/* O MESMO numero com dois significados. Entre bicos o CV mede uniformidade da faixa;
   entre repeticoes mede repetibilidade da maquina. Chamar os dois de "CV das coletas"
   faria o sider parecer uniforme sem que ninguem tivesse medido uniformidade. */
var bsCv=barra({equipamento:'tractor', taxaAlvo:'240', leiturasBarra:['1600','2000','2400']});
var osCv=ctx.calcBarraOperacao(bsCv);
perto(osCv.calibration.cv,20,1e-9,'CV de 20% entre as tres coletas');
var aCv=ctx.calcBarraAvisos(osCv,bsCv);
ck(aCv.some(function(a){ return a.k==='erro' && /nao repetiu|não repetiu/.test(a.t); }),
   'no sider o CV alto fala de repetibilidade da maquina');
ck(!aCv.some(function(a){ return /faixa/.test(a.t); }),
   'e NAO fala de uniformidade de faixa, que ninguem mediu');
var bcCv=barra({taxaAlvo:'240', leiturasBico:coletas([300,500,500,700])});
ck(ctx.calcBarraAvisos(ctx.calcBarraOperacao(bcCv),bcCv).some(function(a){ return /faixa/.test(a.t); }),
   'no costal, sim: ai a faixa foi medida bico a bico');

ctx._calcBarraAberta=true;
ctx._calcBarra=bs;
var hs=ctx.calcBarraHtml();
ck(!/Método de coleta/.test(hs),'no sider nao se oferece a escolha de metodo');
ck(/CV entre repetições/.test(hs),'e o rotulo do CV diz o que ele mede');
ctx._calcBarra=bcCv;
ck(/CV entre bicos/.test(ctx.calcBarraHtml()),'no costal o rotulo muda junto');
ctx._calcBarraAberta=false;

console.log('\n--- A tela desenha sem quebrar nos dois métodos ---');
ctx._calcBarraAberta=true;
barra({taxaAlvo:'240', leiturasBico:coletas([500,500,500,500])});
var h=ctx.calcBarraHtml();
ck(/calcBarraOut/.test(h),'o HTML aberto tem onde pendurar a saída');
ck(/_calcBarraLeitura\(3,2,/.test(h),'a matriz liga a última célula do último bico');
ck(/Método de coleta/.test(h),'no costal, o método de coleta é escolha');
ck(/Meta por bico/.test(h),'a meta por bico aparece antes da coleta, que é quando serve');
ck(/Do protocolo/.test(h),'a tela diz de onde veio o que ja esta preenchido');
ck(/XR11002/.test(h),'inclusive a ponta, que nao e campo mas e contexto');
barra({taxaAlvo:'240', metodo:'barra', leiturasBarra:['2000','2000','2000']});
ck(/_calcBarraLeitura\(0,2,/.test(ctx.calcBarraHtml()),'barra inteira liga as três coletas');
ctx._calcBarraAberta=false;
ck(!/calcBarraOut/.test(ctx.calcBarraHtml()),'fechada, a seção mostra só o cabeçalho e o resumo');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
