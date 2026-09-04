/* As 19 unidades de dose da Calculadora Universal de Aplicação
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * calculateComponent() é a função que decide QUANTO PRODUTO VAI NO TANQUE.
 * Ela aceita 19 unidades de dose — L/ha, g i.a./ha, % v/v, ppm, mg por vaso,
 * e assim por diante. O golden test do motor (test_aplicacao_core.js) confere
 * duas delas: L/ha e % v/v. As outras dezessete nunca tinham sido conferidas
 * à mão.
 *
 * Um fator de escala errado aqui não aparece na tela como erro: aparece como
 * um número plausível. Mil vezes a dose ainda cabe no frasco.
 *
 * A CONFERÊNCIA É DE DOIS TIPOS, e o segundo é o que realmente protege:
 *
 * 1. VALOR À MÃO — cada resultado calculado a partir das entradas, na conta
 *    escrita no comentário, nunca copiado da saída do motor.
 *
 * 2. EQUIVALÊNCIA — a MESMA dose física escrita em duas unidades diferentes
 *    tem de dar o MESMO produto no tanque. 2 L/ha e 2.000 mL/ha são a mesma
 *    coisa; 0,5% v/v e 5 mL/L são a mesma coisa; 100 mg por vaso e 0,1 g por
 *    vaso são a mesma coisa. Este par não depende de eu ter feito a conta
 *    certa: se um dos dois caminhos tiver o fator trocado, os dois deixam de
 *    bater, e o teste falha sem precisar de árbitro.
 *
 * Rodar: node test_unidades_dose.js
 */
var M = require('./vendor/aplicacao-core.js');

var f = 0, p = 0;
function ck(ok, n) { if (ok) { p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n) { ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }
function perto(a, b, n, tol) {
  tol = tol == null ? 1e-9 : tol;
  var ok = (a != null && isFinite(a) && Math.abs(a - b) <= tol);
  ck(ok, n + (ok ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + b + ')'));
}
function mesmo(a, b, n) {
  var ok = (isFinite(a) && isFinite(b) && Math.abs(a - b) <= 1e-9);
  ck(ok, n + (ok ? '' : ' (' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b) + ')'));
}

/* ---------------------------------------------------------------------------
   Duas bancadas de ensaio, montadas pelo próprio motor para que os volumes
   sejam os de verdade e não uma ficção do teste.
   --------------------------------------------------------------------------- */

/* BANCADA A — dose por ÁREA.
   Parcela 10 × 20 m = 200 m² = 0,02 ha, uma unidade pulverizada.
   Taxa-alvo 100 L/ha, preparo por parcela, volume morto 500 mL,
   sem sobra técnica, sem escorva, sem mínimo operacional.
     calda útil     = 100 L/ha × 0,02 ha       = 2.000 mL
     lote final     = 2.000 + 500 (morto)      = 2.500 mL
     total aplicado = 100 L/ha × 0,02 ha       = 2.000 mL
   O lote (2.500) é maior que o aplicado (2.000) de propósito: se os dois
   fossem iguais, um erro que trocasse um pelo outro passaria despercebido. */
function bancadaArea() {
  var s = M.defaultState();
  s.equipment = 'drone';
  s.area = { width:10, length:20, sprayedUnits:1, evaluationSubplots:4, routeDirection:'length' };
  s.targetBase = { base:'area', unit:'vaso', count:1, per:1, volumePerTargetMl:0, preparations:1 };
  s.prep.targetRate = 100; s.prep.basis = 'plot';
  s.prep.technicalSurplusPct = 0; s.prep.deadVolumeMl = 500; s.prep.primingVolumeMl = 0;
  s.prep.minimumOperatingMl = 0; s.prep.containerCount = 1; s.prep.containerCapacityMl = 20000;
  return s;
}

/* BANCADA B — dose por UNIDADE-ALVO.
   40 vasos, dose escrita por 1 vaso, 5 mL de calda em cada vaso.
     fator          = 40 ÷ 1                   = 40 porções
     calda útil     = 5 mL × 40                = 200 mL
     lote final     = 200 + 50 (morto)         = 250 mL
     total aplicado = 5 mL × 40                = 200 mL */
function bancadaAlvo() {
  var s = M.defaultState();
  s.equipment = 'drone';
  s.targetBase = { base:'target', unit:'vaso', count:40, per:1, volumePerTargetMl:5, preparations:1 };
  s.prep.technicalSurplusPct = 0; s.prep.deadVolumeMl = 50; s.prep.primingVolumeMl = 0;
  s.prep.minimumOperatingMl = 0; s.prep.containerCount = 1; s.prep.containerCapacityMl = 20000;
  return s;
}

/* Roda um único componente na bancada e devolve o resultado do motor. */
function um(estado, componente) {
  var s = estado;
  s.treatments = [{ id:'t1', name:'T1', application:M.cloneApplication(s.equipment), components:[componente] }];
  var plano = M.calculateState(s);
  return { r: plano.treatmentResults[0].components[0], op: plano.treatmentResults[0].operation };
}
function lote(estado, componente) { return um(estado, componente).r.batchAmount; }

console.log('\n--- As bancadas são as que eu disse que são ---');
var opA = um(bancadaArea(), { name:'X', type:'L/ha', dose:'1' }).op;
perto(opA.treatmentAreaHa, 0.02, 'bancada A: 200 m² = 0,02 ha');
perto(opA.finalBatchMl, 2500, 'bancada A: lote final de 2.500 mL (2.000 úteis + 500 de volume morto)');
perto(opA.appliedTotalMl, 2000, 'bancada A: 2.000 mL efetivamente aplicados');
eq(opA.batchCount, 1, 'bancada A: uma única preparação');
var opB = um(bancadaAlvo(), { name:'X', type:'mL/alvo', dose:'1' }).op;
perto(opB.targetFactor, 40, 'bancada B: 40 porções de dose');
perto(opB.finalBatchMl, 250, 'bancada B: lote final de 250 mL (200 úteis + 50 de volume morto)');
perto(opB.appliedTotalMl, 200, 'bancada B: 200 mL efetivamente aplicados');

/* =========================================================================
   BASE POR ÁREA — as treze unidades
   ========================================================================= */

console.log('\n--- L/ha e mL/ha: líquido por hectare ---');
/* 2 L/ha ÷ 100 L/ha = 2% da calda; 2% de 2.500 mL = 50 mL no lote.
   Aplicado: 2 L/ha × 0,02 ha = 0,04 L = 40 mL. */
var a = um(bancadaArea(), { name:'X', type:'L/ha', dose:'2' }).r;
perto(a.batchAmount, 50, '2 L/ha → 50 mL no lote');
perto(a.appliedAmount, 40, '2 L/ha → 40 mL aplicados em 0,02 ha');
eq(a.baseUnit, 'mL', '2 L/ha sai em mL');
eq(a.phase, 'liquid', 'L/ha é líquido');
/* 2.000 mL/ha ÷ 100 L/ha = 20 mL/L; × 2,5 L = 50 mL. */
var b = um(bancadaArea(), { name:'X', type:'mL/ha', dose:'2000' }).r;
perto(b.batchAmount, 50, '2.000 mL/ha → 50 mL no lote');
perto(b.appliedAmount, 40, '2.000 mL/ha → 40 mL aplicados');
mesmo(a.batchAmount, b.batchAmount, 'EQUIVALÊNCIA: 2 L/ha e 2.000 mL/ha põem o mesmo no tanque');
mesmo(a.appliedAmount, b.appliedAmount, 'EQUIVALÊNCIA: e aplicam o mesmo na parcela');

console.log('\n--- g/ha e kg/ha: sólido por hectare ---');
/* 300 g/ha ÷ 100 L/ha = 3 g/L; × 2,5 L = 7,5 g. Aplicado: 300 × 0,02 = 6 g. */
var c = um(bancadaArea(), { name:'X', type:'g/ha', dose:'300' }).r;
perto(c.batchAmount, 7.5, '300 g/ha → 7,5 g no lote');
perto(c.appliedAmount, 6, '300 g/ha → 6 g aplicados');
eq(c.baseUnit, 'g', '300 g/ha sai em g');
eq(c.phase, 'solid', 'g/ha é sólido');
var d = um(bancadaArea(), { name:'X', type:'kg/ha', dose:'0,3' }).r;
perto(d.batchAmount, 7.5, '0,3 kg/ha → 7,5 g no lote');
perto(d.appliedAmount, 6, '0,3 kg/ha → 6 g aplicados');
mesmo(c.batchAmount, d.batchAmount, 'EQUIVALÊNCIA: 300 g/ha e 0,3 kg/ha são a mesma dose');
eq(d.baseUnit, 'g', 'kg/ha também sai em g — quem pesa, pesa em grama');

console.log('\n--- Ingrediente ativo por hectare: as três formulações ---');
/* 150 g i.a./ha de um produto a 500 g i.a./L = 0,3 L/ha = 300 mL/ha de produto.
   300 mL/ha ÷ 100 L/ha = 3 mL/L; × 2,5 L = 7,5 mL. */
var e = um(bancadaArea(), { name:'X', type:'g i.a./ha', dose:'150', formulationConcentration:'500', formulationUnit:'g/L' }).r;
perto(e.batchAmount, 7.5, '150 g i.a./ha a 500 g i.a./L → 7,5 mL de produto no lote');
perto(e.appliedAmount, 6, '150 g i.a./ha a 500 g i.a./L → 6 mL aplicados');
eq(e.baseUnit, 'mL', 'formulação g/L é líquida: mede-se em mL');
mesmo(e.batchAmount, lote(bancadaArea(), { name:'X', type:'mL/ha', dose:'300' }),
      'EQUIVALÊNCIA: 150 g i.a./ha a 500 g/L é o mesmo que 300 mL/ha de produto');
/* Sólido a 500 g i.a./kg: 150 ÷ 500 × 1.000 = 300 g/ha de produto → 7,5 g. */
var g1 = um(bancadaArea(), { name:'X', type:'g i.a./ha', dose:'150', formulationConcentration:'500', formulationUnit:'g/kg' }).r;
perto(g1.batchAmount, 7.5, '150 g i.a./ha a 500 g i.a./kg → 7,5 g de produto no lote');
eq(g1.baseUnit, 'g', 'formulação g/kg é sólida: mede-se em g');
mesmo(g1.batchAmount, lote(bancadaArea(), { name:'X', type:'g/ha', dose:'300' }),
      'EQUIVALÊNCIA: 150 g i.a./ha a 500 g/kg é o mesmo que 300 g/ha de produto');
/* 50% i.a. é a mesma formulação escrita de outro jeito: 500 g i.a. por kg. */
var g2 = um(bancadaArea(), { name:'X', type:'g i.a./ha', dose:'150', formulationConcentration:'50', formulationUnit:'%' }).r;
perto(g2.batchAmount, 7.5, '150 g i.a./ha a 50% i.a. → 7,5 g de produto no lote');
mesmo(g1.batchAmount, g2.batchAmount, 'EQUIVALÊNCIA: 500 g i.a./kg e 50% i.a. são a mesma formulação');
/* kg i.a./ha é só a mesma dose com a vírgula três casas adiante. */
var h = um(bancadaArea(), { name:'X', type:'kg i.a./ha', dose:'0,15', formulationConcentration:'500', formulationUnit:'g/L' }).r;
perto(h.batchAmount, 7.5, '0,15 kg i.a./ha a 500 g i.a./L → 7,5 mL no lote');
mesmo(e.batchAmount, h.batchAmount, 'EQUIVALÊNCIA: 150 g i.a./ha e 0,15 kg i.a./ha são a mesma dose');

console.log('\n--- Concentração na calda: % v/v e mL/L ---');
/* 0,5% de 2.500 mL = 12,5 mL no lote; 0,5% de 2.000 mL aplicados = 10 mL. */
var i = um(bancadaArea(), { name:'X', type:'%v/v', dose:'0,5' }).r;
perto(i.batchAmount, 12.5, '0,5% v/v → 12,5 mL no lote');
perto(i.appliedAmount, 10, '0,5% v/v → 10 mL aplicados');
var j = um(bancadaArea(), { name:'X', type:'mL/L', dose:'5' }).r;
perto(j.batchAmount, 12.5, '5 mL/L → 12,5 mL no lote');
perto(j.appliedAmount, 10, '5 mL/L → 10 mL aplicados');
mesmo(i.batchAmount, j.batchAmount, 'EQUIVALÊNCIA: 0,5% v/v é 5 mL/L');

console.log('\n--- Concentração na calda: g/L, % m/v, mg/L e ppm ---');
/* 4 g/L × 2,5 L = 10 g no lote; × 2 L aplicados = 8 g. */
var k = um(bancadaArea(), { name:'X', type:'g/L', dose:'4' }).r;
perto(k.batchAmount, 10, '4 g/L → 10 g no lote');
perto(k.appliedAmount, 8, '4 g/L → 8 g aplicados');
var l = um(bancadaArea(), { name:'X', type:'%m/v', dose:'0,4' }).r;
perto(l.batchAmount, 10, '0,4% m/v → 10 g no lote');
mesmo(k.batchAmount, l.batchAmount, 'EQUIVALÊNCIA: 0,4% m/v (0,4 g por 100 mL) é 4 g/L');
/* 250 mg/L × 2,5 L = 625 mg no lote; × 2 L = 500 mg aplicados. */
var m1 = um(bancadaArea(), { name:'X', type:'mg/L', dose:'250' }).r;
perto(m1.batchAmount, 625, '250 mg/L → 625 mg no lote');
perto(m1.appliedAmount, 500, '250 mg/L → 500 mg aplicados');
eq(m1.baseUnit, 'mg', 'mg/L sai em mg, não em g');
var m2 = um(bancadaArea(), { name:'X', type:'ppm', dose:'250' }).r;
perto(m2.batchAmount, 625, '250 ppm → 625 mg no lote');
mesmo(m1.batchAmount, m2.batchAmount, 'EQUIVALÊNCIA: em solução aquosa, ppm é mg/L');
/* A mesma massa escrita em g: 0,25 g/L → 0,625 g = 625 mg. */
mesmo(lote(bancadaArea(), { name:'X', type:'g/L', dose:'0,25' }) * 1000, m1.batchAmount,
      'EQUIVALÊNCIA: 0,25 g/L é 250 mg/L — a massa é a mesma, só a unidade muda');

/* =========================================================================
   BASE POR UNIDADE-ALVO — as sete unidades
   ========================================================================= */

console.log('\n--- Líquido por vaso: L, mL e µL ---');
/* 0,25 mL por vaso ÷ 5 mL de calda por vaso = 5% da calda;
   5% de 250 mL de lote = 12,5 mL. Aplicado: 0,25 × 40 vasos = 10 mL. */
var n1 = um(bancadaAlvo(), { name:'X', type:'mL/alvo', dose:'0,25' }).r;
perto(n1.batchAmount, 12.5, '0,25 mL por vaso → 12,5 mL no lote');
perto(n1.appliedAmount, 10, '0,25 mL por vaso → 10 mL em 40 vasos');
eq(n1.baseUnit, 'mL', 'mL por vaso sai em mL');
var n2 = um(bancadaAlvo(), { name:'X', type:'L/alvo', dose:'0,00025' }).r;
perto(n2.batchAmount, 12.5, '0,00025 L por vaso → 12,5 mL no lote');
mesmo(n1.batchAmount, n2.batchAmount, 'EQUIVALÊNCIA: 0,25 mL e 0,00025 L por vaso');
var n3 = um(bancadaAlvo(), { name:'X', type:'µL/alvo', dose:'250' }).r;
perto(n3.batchAmount, 12.5, '250 µL por vaso → 12,5 mL no lote');
mesmo(n1.batchAmount, n3.batchAmount, 'EQUIVALÊNCIA: 250 µL e 0,25 mL por vaso');
mesmo(n1.appliedAmount, n3.appliedAmount, 'EQUIVALÊNCIA: e aplicam a mesma coisa nos 40 vasos');

console.log('\n--- Sólido por vaso: kg, g e mg ---');
/* 0,1 g por vaso ÷ 5 mL = 0,02 g/mL; × 250 mL de lote = 5 g.
   Aplicado: 0,1 × 40 = 4 g. */
var o1 = um(bancadaAlvo(), { name:'X', type:'g/alvo', dose:'0,1' }).r;
perto(o1.batchAmount, 5, '0,1 g por vaso → 5 g no lote');
perto(o1.appliedAmount, 4, '0,1 g por vaso → 4 g em 40 vasos');
eq(o1.baseUnit, 'g', 'g por vaso sai em g');
eq(o1.phase, 'solid', 'g por vaso é sólido');
var o2 = um(bancadaAlvo(), { name:'X', type:'kg/alvo', dose:'0,0001' }).r;
perto(o2.batchAmount, 5, '0,0001 kg por vaso → 5 g no lote');
mesmo(o1.batchAmount, o2.batchAmount, 'EQUIVALÊNCIA: 0,1 g e 0,0001 kg por vaso');
/* mg fica em mg: 100 mg por vaso ÷ 5 mL × 250 mL = 5.000 mg. */
var o3 = um(bancadaAlvo(), { name:'X', type:'mg/alvo', dose:'100' }).r;
perto(o3.batchAmount, 5000, '100 mg por vaso → 5.000 mg no lote');
perto(o3.appliedAmount, 4000, '100 mg por vaso → 4.000 mg em 40 vasos');
eq(o3.baseUnit, 'mg', 'mg por vaso sai em mg, não em g');
mesmo(o3.batchAmount / 1000, o1.batchAmount, 'EQUIVALÊNCIA: 100 mg e 0,1 g por vaso pesam o mesmo');

console.log('\n--- Ingrediente ativo por vaso ---');
/* 0,05 g i.a. por vaso a 500 g i.a./L = 0,0001 L = 0,1 mL de produto por vaso.
   0,1 ÷ 5 × 250 = 5 mL no lote; aplicado 0,1 × 40 = 4 mL. */
var q1 = um(bancadaAlvo(), { name:'X', type:'g i.a./alvo', dose:'0,05', formulationConcentration:'500', formulationUnit:'g/L' }).r;
perto(q1.batchAmount, 5, '0,05 g i.a. por vaso a 500 g i.a./L → 5 mL de produto no lote');
perto(q1.appliedAmount, 4, '0,05 g i.a. por vaso a 500 g i.a./L → 4 mL aplicados');
eq(q1.baseUnit, 'mL', 'formulação líquida por vaso mede-se em mL');
mesmo(q1.batchAmount, lote(bancadaAlvo(), { name:'X', type:'mL/alvo', dose:'0,1' }),
      'EQUIVALÊNCIA: 0,05 g i.a. a 500 g/L é 0,1 mL de produto por vaso');
var q2 = um(bancadaAlvo(), { name:'X', type:'g i.a./alvo', dose:'0,05', formulationConcentration:'500', formulationUnit:'g/kg' }).r;
perto(q2.batchAmount, 5, '0,05 g i.a. por vaso a 500 g i.a./kg → 5 g de produto no lote');
eq(q2.baseUnit, 'g', 'formulação sólida por vaso mede-se em g');
var q3 = um(bancadaAlvo(), { name:'X', type:'g i.a./alvo', dose:'0,05', formulationConcentration:'50', formulationUnit:'%' }).r;
mesmo(q2.batchAmount, q3.batchAmount, 'EQUIVALÊNCIA: 500 g i.a./kg e 50% i.a. também por vaso');

/* =========================================================================
   O QUE O MOTOR TEM DE RECUSAR
   ========================================================================= */

console.log('\n--- Recusas: base cruzada ---');
/* O caso perigoso: por vaso, a taxa-alvo em L/ha continua preenchida, então a
   conta DARIA um número. Um número sem significado nenhum. */
var r1 = um(bancadaAlvo(), { name:'X', type:'L/ha', dose:'2' }).r;
ck(/hectare/i.test(r1.conversionError), 'dose por hectare num ensaio por vaso é recusada, não convertida');
perto(r1.batchAmount, 0, 'e nada é posto no tanque quando a base está cruzada');
var r2 = um(bancadaArea(), { name:'X', type:'mL/alvo', dose:'0,25' }).r;
ck(/unidade-alvo/i.test(r2.conversionError), 'dose por vaso num ensaio por área é recusada');
perto(r2.batchAmount, 0, 'e também não põe nada no tanque');

console.log('\n--- Recusas: falta a concentração da formulação ---');
var r3 = um(bancadaArea(), { name:'X', type:'g i.a./ha', dose:'150' }).r;
ck(/concentração/i.test(r3.conversionError), 'i.a./ha sem a concentração da formulação é recusado');
perto(r3.batchAmount, 0, 'sem concentração, nada é convertido');
var r4 = um(bancadaArea(), { name:'X', type:'g i.a./ha', dose:'150', formulationConcentration:'0', formulationUnit:'g/L' }).r;
ck(/concentração/i.test(r4.conversionError), 'concentração zero é ausência de concentração, não divisão por zero');
var r5 = um(bancadaAlvo(), { name:'X', type:'g i.a./alvo', dose:'0,05' }).r;
ck(/concentração/i.test(r5.conversionError), 'i.a. por vaso sem concentração também é recusado');

console.log('\n--- Recusas: unidade que o motor não conhece ---');
var r6 = um(bancadaArea(), { name:'X', type:'sacos/ha', dose:'1' }).r;
ck(/não reconhecida/i.test(r6.conversionError), 'unidade inventada por área é recusada');
perto(r6.batchAmount, 0, 'unidade não reconhecida não vira dose');
var r7 = um(bancadaAlvo(), { name:'X', type:'punhado/alvo', dose:'1' }).r;
ck(/não reconhecida/i.test(r7.conversionError), 'unidade inventada por alvo é recusada');
perto(r7.batchAmount, 0, 'nem por alvo');

console.log('\n--- Recusas: componente sem unidade nenhuma ---');
/* O motor já sabia responder "(ausente)" — a última linha de calculateComponent
   é escrita exatamente para isso. Mas o campo chegava a `endsWith` antes, e um
   type ausente derrubava o cálculo do plano inteiro com TypeError em vez de
   recusar aquele componente. Um produto sem unidade é um erro do usuário; não
   pode apagar a tela de quem está com o tanque aberto. */
[undefined, null, ''].forEach(function (t) {
  var rotulo = JSON.stringify(t);
  try {
    var r = um(bancadaArea(), { name:'X', type:t, dose:'1' }).r;
    ck(/não reconhecida/i.test(r.conversionError), 'type ' + rotulo + ': recusa em vez de derrubar o cálculo');
    perto(r.batchAmount, 0, 'type ' + rotulo + ': nada no tanque');
  } catch (err) {
    ck(false, 'type ' + rotulo + ' derrubou o motor: ' + err.message);
  }
});

/* =========================================================================
   O QUE O MOTOR DERIVA DA DOSE
   ========================================================================= */

console.log('\n--- Preparado, consumido e residual ---');
/* Duas preparações do mesmo lote: o preparado dobra, o aplicado não. */
var sA = bancadaArea();
sA.area.sprayedUnits = 2;              /* duas parcelas, preparo por parcela */
var dois = um(sA, { name:'X', type:'L/ha', dose:'2' });
eq(dois.op.batchCount, 2, 'duas parcelas com preparo por parcela = duas preparações');
perto(dois.r.batchAmount, 50, 'cada preparação leva os mesmos 50 mL');
perto(dois.r.totalPreparedAmount, 100, 'o total preparado é o do lote vezes o número de preparações');
/* Consumo: sem consumo informado, o motor usa o aplicado.
   50 mL ÷ 2.500 mL de lote × 4.000 mL aplicados (2 × 2.000) = 80 mL. */
perto(dois.r.consumedAmount, 80, 'o consumido acompanha o volume que realmente saiu');
perto(dois.r.residualAmount, 20, 'o residual é o preparado menos o consumido — 100 − 80');
mesmo(dois.r.totalPreparedAmount - dois.r.consumedAmount, dois.r.residualAmount,
      'e o residual fecha com a subtração, sempre');

console.log('\n--- A divisão por recipiente ---');
var sR = bancadaArea();
sR.prep.containerCount = 4;
var quatro = um(sR, { name:'X', type:'L/ha', dose:'2' }).r;
perto(quatro.batchAmount, 50, 'quatro recipientes não mudam quanto entra no lote');
perto(quatro.perContainerAmount, 12.5, 'mas cada recipiente recebe um quarto: 12,5 mL');

console.log('\n--- A memória de cálculo acompanha cada unidade ---');
['L/ha','mL/ha','g/ha','kg/ha','%v/v','mL/L','g/L','mg/L','ppm','%m/v'].forEach(function (u) {
  var r = um(bancadaArea(), { name:'X', type:u, dose:'1' }).r;
  ck(!!r.formula && r.formula !== 'não calculada' && !/NaN|Infinity|undefined/.test(r.formula),
     u + ': a conta fica escrita, com números legíveis');
  ck(!!r.concentration && !/NaN|Infinity|undefined/.test(r.concentration),
     u + ': a concentração na calda fica escrita');
});
['mL/alvo','L/alvo','µL/alvo','g/alvo','kg/alvo','mg/alvo'].forEach(function (u) {
  var r = um(bancadaAlvo(), { name:'X', type:u, dose:'1' }).r;
  ck(!!r.formula && r.formula !== 'não calculada' && !/NaN|Infinity|undefined/.test(r.formula),
     u + ': a conta fica escrita, com números legíveis');
});

console.log('\n--- Toda unidade oferecida na tela é uma unidade que o motor calcula ---');
/* Se a lista da interface e o cálculo saírem de sincronia, o usuário escolhe
   uma unidade que existe no menu e não existe na conta. */
M.UNIT_OPTIONS.forEach(function (par) {
  var u = par[0];
  var porAlvo = u.indexOf('/alvo') >= 0;
  var comp = { name:'X', type:u, dose:'1' };
  if (u.indexOf('i.a.') >= 0) { comp.formulationConcentration = '500'; comp.formulationUnit = 'g/L'; }
  var r = um(porAlvo ? bancadaAlvo() : bancadaArea(), comp).r;
  ck(!r.conversionError, 'a unidade "' + u + '" do menu tem conta no motor');
  ck(r.batchAmount > 0, 'a unidade "' + u + '" produz uma quantidade positiva');
});

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
