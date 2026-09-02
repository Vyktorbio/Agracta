/* A bancada entra no mesmo pipeline de memória (roadmap §7.8).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A calculadora de laboratório já existia e já usava um motor puro. O que ela não
 * fazia era entrar na memória de cálculo: a aplicação de um estudo de bancada ficava
 * sem registro nenhum do que foi preparado, enquanto a de campo ganhava o seu.
 *
 * E a herança da §7.4 nasceu cega para a categoria — numa quadra de laboratório ela
 * pedia "tamanho da parcela" e "volume de calda". Não existe parcela numa placa de
 * Petri. Era a §7-bis reaparecendo dentro do código recém-escrito, o que diz bem por
 * que a fronteira precisa ser explícita em vez de presumida.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. GOLDEN TEST, conferido à mão nos dois modos de dose (ppm e campo→bancada).
 *  2. A CATEGORIA ESCOLHE O MOTOR. Bancada nunca cai no cálculo de calda, e campo
 *     nunca cai no de pote.
 *  3. PIPETAR E PESAR NÃO SÃO A MESMA COISA. Uma pede micropipeta, a outra balança;
 *     guardar as duas num campo "quantidade" perderia isso.
 *  4. FALTOU DADO, NÃO SE INVENTA — e o que falta é dito em português da bancada.
 *
 * Rodar: node test_bancada_memoria.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var LB=require('./vendor/biocalc-lab-core.js');
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

var LAB={LAB1:true};
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  APP_VER:'teste', BioCalculoLab:LB, BioCalculoCampo:BC,
  document:{ getElementById:function(){ return null; } },
  esc:function(v){ return String(v==null?'':v); },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; },
  _currentUserName:function(){ return 'Daria'; },
  isQuadraLab:function(qid){ return !!LAB[qid]; },
  tratMetodo:function(){ return 'lab'; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcDoseUnit'), pega('_numBR'),
  pega('_parseParcelaDim'),
  pega('calcConfigDoEstudoLab'), pega('calcConfigLabCompleta'), pega('calcConfigLabFaltando'),
  pega('calcMemoriaLab'), pega('calcMemoriaLabTexto'),
  pega('calcConfigDoEstudo'), pega('calcConfigCompleta'),
  pega('calcMemoria'), pega('calcMemoriaTexto'),
  pega('aplicacaoMemoriaAuto')
].join('\n'), ctx);

function bancada(){
  return {
    id:'b1', codigo:'BIO-01', numRepeticoes:4,
    labVolumeMl:100, labFonteTipo:'gL', labFonteValor:'500', labPureza:'', labDensidade:'',
    doseModo:'ppm',
    tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
                 {id:'T2',produto:'Produto A',dose:'50'}]
  };
}

/* ============================================================================== */
console.log('\n--- A configuração da bancada vem do cadastro do estudo ---');
var st=bancada();
var cfg=ctx.calcConfigDoEstudoLab(st,'LAB1');
eq(cfg.volumeMl,100,'volume do pote');
eq(cfg.fonteTipo,'gL','tipo da fonte');
eq(cfg.fonteValor,'500','valor do rótulo');
eq(cfg.doseModo,'ppm','modo da dose');
eq(cfg.origem,'estudo','e diz de onde veio');

console.log('\n--- GOLDEN TEST (ppm): 50 ppm num pote de 100 mL, rótulo 500 g/L ---');
/* Rótulo 500 g/L = 500.000 mg/L = 500.000 ppm.
   Produto = (50 ppm × 100 mL) ÷ 500.000 ppm = 0,01 mL = 10 µL.
   Solvente = 100 − 0,01 = 99,99 mL. */
var mem=ctx.calcMemoriaLab(st,cfg);
eq(mem.motor,'BioCalculoLab','a memória diz qual motor calculou');
eq(mem.motorVersao,LB.VERSION,'e em que versão');
eq(mem.contexto,'laboratorio','marcada como de bancada');
eq(mem.barra,null,'e sem barra: não há barra numa bancada');
var t2=mem.tratamentos.filter(function(t){return t.id==='T2';})[0];
eq(t2.acao,'pipetar','com rótulo em g/L se pipeta');
perto(t2.produtoMl,0.01,1e-12,'0,01 mL de produto');
perto(t2.produtoUl,10,1e-9,'ou seja, 10 µL — que é a unidade da bancada');
perto(t2.solventeMl,99.99,1e-9,'99,99 mL de solvente');
var t1=mem.tratamentos.filter(function(t){return t.id==='T1';})[0];
eq(t1.semPreparo,true,'testemunha sem dose não gera preparo');

console.log('\n--- Pipetar e pesar não são a mesma coisa ---');
/* Reagente puro = 1.000.000 ppm: pesa-se.
   Massa = 50 ppm × (100 mL ÷ 1000) = 5 mg. */
var puro=bancada(); puro.labFonteTipo='puro'; puro.labFonteValor='';
var mp=ctx.calcMemoriaLab(puro, ctx.calcConfigDoEstudoLab(puro,'LAB1'));
var p2=mp.tratamentos.filter(function(t){return t.id==='T2';})[0];
eq(p2.acao,'pesar','reagente puro se pesa, não se pipeta');
perto(p2.massaMg,5,1e-9,'5 mg — uma pede balança, a outra micropipeta');
eq(p2.produtoUl,undefined,'e não há volume a pipetar');

console.log('\n--- GOLDEN TEST (campo -> bancada): 1 L/ha a 200 L/ha, pote de 100 mL ---');
/* 1 L/ha = 1000 mL/ha. Por mL de calda: 1000 ÷ (200 × 1000) = 0,005 mL/mL.
   No pote de 100 mL: 0,5 mL de produto, 99,5 mL de solvente. Concentração 0,5%. */
var camp=bancada();
camp.doseModo='campo';
camp.protocolo={volumeCalda:'200'};
camp.tratamentos[1].dose='1 L/ha';
var cc=ctx.calcConfigDoEstudoLab(camp,'LAB1');
eq(cc.vazaoLHa,200,'a vazão vem do protocolo — é ela que diz quanto produto há por mL de calda');
var mc=ctx.calcMemoriaLab(camp,cc);
var c2=mc.tratamentos.filter(function(t){return t.id==='T2';})[0];
perto(c2.produtoMl,0.5,1e-9,'0,5 mL de produto no pote');
perto(c2.solventeMl,99.5,1e-9,'99,5 mL de solvente');
perto(c2.concentracaoPct,0.5,1e-9,'0,5% na calda');

console.log('\n--- A CATEGORIA escolhe o motor ---');
var apLab={id:'ap1', data:'2026-08-20'};
var auto=ctx.aplicacaoMemoriaAuto(st,'LAB1',apLab);
ck(!!auto,'aplicação de bancada passa a ter memória — antes não tinha nenhuma');
eq(auto.motor,'BioCalculoLab','e ela vem do motor de bancada');
eq(auto.origem,'derivada','marcada como derivada, igual ao campo');
/* Estudo de campo na mesma função tem de cair no outro motor. */
var campo={id:'s9', numRepeticoes:4, volumeMorto:'300', numFrascos:1,
  protocolo:{tamanhoParcela:'5x2', volumeCalda:'200'},
  tratamentos:[{id:'T2',produto:'A',dose:'1,5 L/ha'}]};
var autoC=ctx.aplicacaoMemoriaAuto(campo,'Q1',{id:'x'});
eq(autoC.motor,'BioCalculoCampo','estudo de campo cai no motor de calda');
eq(autoC.contexto,undefined,'e não se marca como bancada');
/* O inverso é o erro que a §7-bis existe para impedir: bancada caindo no cálculo de
   calda pediria parcela, que não existe numa placa de Petri. */
eq(ctx.calcConfigCompleta(ctx.calcConfigDoEstudo(st,'LAB1')),false,
   'o estudo de bancada NÃO teria como ser calculado pelo motor de calda');
ck(!!auto,'e mesmo assim ele ganha memória, porque a categoria o mandou para o motor certo');

console.log('\n--- Nunca por cima, e faltou dado não se inventa ---');
eq(ctx.aplicacaoMemoriaAuto(st,'LAB1',{id:'y',memoriaCalculo:{origem:'conferida'}}),null,
   'aplicação que já tem memória não é sobrescrita');
var semVol=bancada(); semVol.labVolumeMl=0;
eq(ctx.calcConfigLabCompleta(ctx.calcConfigDoEstudoLab(semVol,'LAB1')),false,'sem volume do pote, não dá');
eq(ctx.aplicacaoMemoriaAuto(semVol,'LAB1',{id:'z'}),null,'e nenhuma memória de zeros é gravada');
var semFonte=bancada(); semFonte.labFonteValor='';
eq(ctx.calcConfigLabCompleta(ctx.calcConfigDoEstudoLab(semFonte,'LAB1')),false,
   'sem o valor da fonte não dá — dividiria por zero e a receita sairia sem número');
/* Reagente puro é 100% por definição: nao tem valor de rotulo e nem por isso falta dado. */
var puroSemValor=bancada(); puroSemValor.labFonteTipo='puro'; puroSemValor.labFonteValor='';
eq(ctx.calcConfigLabCompleta(ctx.calcConfigDoEstudoLab(puroSemValor,'LAB1')),true,
   'mas reagente puro não precisa de valor de rótulo');
var campSemVazao=bancada(); campSemVazao.doseModo='campo';
eq(ctx.calcConfigLabCompleta(ctx.calcConfigDoEstudoLab(campSemVazao,'LAB1')),false,
   'dose de campo sem vazão não converte para o pote');

console.log('\n--- O que falta é dito em português da bancada ---');
var falta=ctx.calcConfigLabFaltando(ctx.calcConfigDoEstudoLab(semVol,'LAB1'));
ck(falta.join(' ').indexOf('pote')>=0,'fala em "pote", não em "parcela"');
ck(falta.join(' ').indexOf('parcela')<0,'e jamais em parcela');
ck(/aplicacaoHerancaLabHtml/.test(src),'há um bloco herdado próprio da bancada');
var bl=src.slice(src.indexOf('function aplicacaoHerancaLabHtml('));
bl=bl.slice(0,bl.indexOf('\n}\n'));
ck(bl.indexOf('parcela')<0,'que não menciona parcela');
ck(bl.indexOf('<input')<0,'e continua somente leitura');
ck(/if\(typeof isQuadraLab==='function' && isQuadraLab\(qid\)\)\{[\s\S]{0,200}aplicacaoHerancaLabHtml/.test(src),
   'e a herança pergunta pela categoria ANTES de pedir parcela');

console.log('\n--- O texto copiado é o da bancada ---');
var txt=ctx.calcMemoriaTexto(auto);
ck(/CALCULADORA DE BANCADA/.test(txt),'calcMemoriaTexto reconhece a memória de bancada');
ck(/Pote 100 mL/.test(txt),'e fala do pote');
ck(/µL/.test(txt),'com o volume em µL, que é a unidade da bancada');
ck(!/parcela/i.test(txt),'sem uma palavra sobre parcela');
ck(/Motor BioCalculoLab 1\.0\.0/.test(txt),'e diz qual motor e em que versão');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
