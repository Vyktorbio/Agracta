/* mg/ha — miligramas por hectare
 *
 * Unidade nova (set/2026). O perigo dela não é a conta: é a LEITURA. Todo
 * parser do app que procura "g" achava o "g" de "mg" e devolvia g/ha — dose
 * mil vezes maior, com cara de dose certa. Por isso este teste confere as duas
 * coisas: o valor à mão e, principalmente, a EQUIVALÊNCIA com g/ha
 * (500 mg/ha tem de preparar exatamente o mesmo que 0,5 g/ha).
 *
 * Rodar: node test_dose_mg_ha.js
 */
var fs = require('fs'), vm = require('vm');
var BC = require('./vendor/biocalc-campo-core.js');
var AC = require('./vendor/aplicacao-core.js');
var DC = require('./vendor/dose-core.js');
var LB = require('./vendor/biocalc-lab-core.js');

var f = 0, p = 0;
function ck(ok, n) { if (ok) { p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n) { ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }
function perto(a, b, n, tol) {
  tol = tol == null ? 1e-9 : tol;
  var ok = (a != null && isFinite(a) && Math.abs(a - b) <= tol);
  ck(ok, n + (ok ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + b + ')'));
}

console.log('\n--- Motor de campo (BioCalculoCampo) ---');
eq(BC.normalizeDoseUnit('mg/ha'), 'mg/ha', '"mg/ha" é reconhecido');
eq(BC.normalizeDoseUnit('MG'), 'mg/ha', '"MG" também');
eq(BC.normalizeDoseUnit('g'), 'g/ha', '"g" continua g/ha');
ck(BC.DOSE_UNITS.indexOf('mg/ha') >= 0, 'mg/ha está na lista de unidades do motor');
var d = BC.parseDose('500 mg/ha', '');
eq(d.unidade, 'mg/ha', '"500 mg/ha" é lido como mg/ha');
eq(d.erro, null, 'sem erro');
var d2 = BC.parseDose('500', 'mg/ha');
eq(d2.unidade, 'mg/ha', 'número sozinho num estudo declarado em mg/ha herda mg/ha');

/* Parcela 3 × 5 m = 15 m² = 0,0015 ha; calda 200 L/ha; 4 parcelas; sem volume morto.
     500 mg/ha = 0,5 g/ha
     por parcela = 0,5 g/ha × 0,0015 ha = 0,00075 g = 0,75 mg
     4 parcelas  = 3 mg = 0,003 g
     concentração = 0,5 g/ha ÷ 200 L/ha = 0,0025 g/L */
var base = { sprayVolume:200, plotLength:5, plotWidth:3, numPlots:4, numBottles:1, deadVolumeMl:0 };
var rMg = BC.calculateTreatment(Object.assign({ doseHa:500, doseUnit:'mg/ha' }, base));
var rG  = BC.calculateTreatment(Object.assign({ doseHa:0.5, doseUnit:'g/ha'  }, base));
perto(rMg.productPerPlot, 0.00075, '500 mg/ha → 0,00075 g (0,75 mg) por parcela');
perto(rMg.productTotal, 0.003, '4 parcelas → 0,003 g (3 mg)');
perto(rMg.concentration, 0.0025, 'concentração 0,0025 g/L');
eq(rMg.productUnit, 'g', 'sai na base em grama, como o resto do motor');
eq(rMg.liquid, false, 'mg/ha é sólido');
perto(rMg.productTotal, rG.productTotal, 'EQUIVALÊNCIA: 500 mg/ha = 0,5 g/ha no lote');
eq(BC.formatAmount(rMg.productPerPlot, rMg.productUnit), '0,75 mg', 'a tela mostra "0,75 mg", não "0,001 g"');

var mix = BC.parseComponents('Produto A + Adjuvante', '500 mg + 0,2%', '');
eq(mix.problems.length, 0, 'mistura "500 mg + 0,2%" lê sem problema');
eq(mix.components[0].unidade, 'mg/ha', 'e o produto sai em mg/ha');
var st = BC.parseStructuredComponents([{ nome:'A', valor:'500', unidade:'mg/ha' }], '');
eq(st.problems.length, 0, 'componente estruturado em mg/ha é aceito');
var mm = BC.calculateMixture(Object.assign({ components:st.components }, base));
perto(mm.components[0].total, 0.003, 'na mistura, 500 mg/ha em 4 parcelas = 0,003 g');

console.log('\n--- Calculadora Universal (AplicacaoCore) ---');
function bancadaArea() {
  var s = AC.defaultState();
  s.equipment = 'drone';
  s.area = { width:10, length:20, sprayedUnits:1, evaluationSubplots:4, routeDirection:'length' };
  s.targetBase = { base:'area', unit:'vaso', count:1, per:1, volumePerTargetMl:0, preparations:1 };
  s.prep.targetRate = 100; s.prep.basis = 'plot';
  s.prep.technicalSurplusPct = 0; s.prep.deadVolumeMl = 500; s.prep.primingVolumeMl = 0;
  s.prep.minimumOperatingMl = 0; s.prep.containerCount = 1; s.prep.containerCapacityMl = 20000;
  return s;
}
function um(estado, comp) {
  estado.treatments = [{ id:'t1', name:'T1', application:AC.cloneApplication(estado.equipment), components:[comp] }];
  return AC.calculateState(estado).treatmentResults[0].components[0];
}
ck(AC.UNIT_OPTIONS.some(function (u) { return u[0] === 'mg/ha'; }), 'mg/ha aparece na lista da tela');
/* Bancada: 0,02 ha, 100 L/ha, lote 2,5 L.
     300 mg/ha ÷ 100 L/ha = 3 mg/L; × 2,5 L = 7,5 mg no lote
     aplicado: 300 mg/ha × 0,02 ha = 6 mg */
var a = um(bancadaArea(), { name:'X', type:'mg/ha', dose:'300' });
perto(a.batchAmount, 7.5, '300 mg/ha → 7,5 mg no lote');
perto(a.appliedAmount, 6, '300 mg/ha → 6 mg aplicados');
eq(a.baseUnit, 'mg', 'sai em mg');
eq(a.phase, 'solid', 'é sólido');
var ag = um(bancadaArea(), { name:'X', type:'g/ha', dose:'0,3' });
perto(a.batchAmount / 1000, ag.batchAmount, 'EQUIVALÊNCIA: 300 mg/ha = 0,3 g/ha no lote');

console.log('\n--- DoseCore (catálogo e equivalente em i.a.) ---');
ck(DC.unidades().indexOf('mg/ha') >= 0, 'mg/ha está no catálogo');
var cv = DC.converter(500, 'mg/ha', 'g/ha');
perto(cv.valor, 0.5, '500 mg/ha → 0,5 g/ha');
var cv2 = DC.converter(2, 'kg/ha', 'mg/ha');
perto(cv2.valor, 2000000, '2 kg/ha → 2.000.000 mg/ha');
ck(!!DC.converter(1, 'mg/ha', 'mL/ha').erro, 'mg/ha → mL/ha é recusado (sólido × líquido)');
/* 500 mg/ha de produto a 800 g/kg = 0,0005 kg/ha × 800 = 0,4 g i.a./ha */
var ia = DC.equivalenteIA(500, 'mg/ha', 800, 'g/kg');
perto(ia.valor, 0.4, '500 mg/ha a 800 g/kg → 0,4 g i.a./ha');

console.log('\n--- Bancada do laboratório (BiocalcLab) ---');
/* 500 mg/ha, vazão 200 L/ha, pote 100 mL:
     0,5 g/ha ÷ 200.000 mL/ha = 2,5e-6 g/mL; × 100 mL = 0,00025 g */
var lb = LB.calcCampo({ dose:'500', unidade:'mg/ha', vazao:'200', volumeMl:'100' });
perto(lb.massaG, 0.00025, '500 mg/ha → 0,25 mg no pote de 100 mL');
var lbg = LB.calcCampo({ dose:'0,5', unidade:'g/ha', vazao:'200', volumeMl:'100' });
perto(lb.massaG, lbg.massaG, 'EQUIVALÊNCIA com 0,5 g/ha');

console.log('\n--- Leitura de texto no app (o "g" de "mg") ---');
var src = fs.readFileSync('./app.js', 'utf8');
function recorta(nome) {
  var i = src.indexOf('function ' + nome + '(');
  var j = src.indexOf('\n}\n', i);
  return src.slice(i, j + 2);
}
var ctx = { window:{} };
vm.createContext(ctx);
vm.runInContext(recorta('_calcDoseUnit') + recorta('doseUnidades') + recorta('_seCompUnidadeNormalizar') +
  'var TRAT_COMP_UNIDADES=[["L/ha"],["mL/ha"],["g/ha"],["kg/ha"],["mg/ha"],["% v/v"]];' +
  recorta('_seCompUnidadeDaDose'), ctx);
eq(vm.runInContext('_calcDoseUnit("500 mg/ha")', ctx), 'mg/ha', '"500 mg/ha" NÃO vira g/ha');
eq(vm.runInContext('_calcDoseUnit("500 mg")', ctx), 'mg/ha', '"500 mg" também não');
eq(vm.runInContext('_calcDoseUnit("500 g/ha")', ctx), 'g/ha', '"500 g/ha" continua g/ha');
eq(vm.runInContext('_calcDoseUnit("0,5 kg/ha")', ctx), 'kg/ha', '"0,5 kg/ha" continua kg/ha');
eq(vm.runInContext('_calcDoseUnit("500 mL/ha")', ctx), 'mL/ha', '"500 mL/ha" continua mL/ha');
ck(vm.runInContext('doseUnidades()', ctx).indexOf('mg/ha') >= 0, 'mg/ha é unidade declarável no estudo');
eq(vm.runInContext('_seCompUnidadeDaDose("500 mg/ha")', ctx), 'mg/ha', 'compositor da mistura lê mg/ha');
eq(vm.runInContext('_seCompUnidadeDaDose("500 g/ha")', ctx), 'g/ha', 'e g/ha continua g/ha');

console.log('\n' + (f ? f + ' FALHA(S) em ' + (p + f) + ' verificações.' : (p + ' verificações, nenhuma falha.')));
process.exit(f ? 1 : 0);
