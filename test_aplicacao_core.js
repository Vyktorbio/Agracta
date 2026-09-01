/* Motor da Calculadora Universal de Aplicação — vendor/aplicacao-core.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Este motor não foi escrito aqui: foi EXTRAÍDO de
 * calculadora_aplicacao_universal.html, que já rodava e já era usada. A extração
 * mexeu só no empacotamento (UMD + lista de exports); nenhuma linha de aritmética
 * foi alterada.
 *
 * Extração que muda uma dose em silêncio é o pior resultado possível — pior que
 * não ter extraído. Então cada número abaixo foi conferido À MÃO a partir das
 * entradas, e não copiado da saída do próprio motor. Se uma alteração futura
 * mudar qualquer um deles, o teste falha, e isso é proposital: mudança de
 * resultado em motor de dose tem de ser decisão, nunca acidente.
 *
 * Rodar: node test_aplicacao_core.js
 */
var M = require('./vendor/aplicacao-core.js');

var f = 0, p = 0;
function ck(ok, n) { if (ok) { p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n) { ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }
function perto(a, b, tol, n) {
  var ok = (a != null && isFinite(a) && Math.abs(a - b) <= tol);
  ck(ok, n + (ok ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ~' + b + ')'));
}
function trat(plan, i) { return plan.treatmentResults[i]; }
function comp(plan, i, nome) {
  return (trat(plan, i).components || []).filter(function (c) { return c.name === nome; })[0];
}

console.log('\n--- O motor se identifica ---');
eq(M.VERSION, '1.9.0', 'versão do motor, para gravar na memória de cálculo');
ck(!!M.EQUIPMENT_LABELS.tractor && !!M.EQUIPMENT_LABELS.drone && !!M.EQUIPMENT_LABELS.co2 &&
   !!M.EQUIPMENT_LABELS.atomizer && !!M.EQUIPMENT_LABELS.lab,
   'os cinco métodos existem: trator/sider, drone, CO₂, atomizador e Torre de Potter');
eq(M.EQUIPMENT_LABELS.lab, 'Laboratório — Torre de Potter', 'a Torre de Potter é um método, não um app à parte');

console.log('\n--- GOLDEN: estado padrão (drone, taxa 3 L/ha, calda 1.700 mL) ---');
/* Conta à mão, para o tratamento 1 (SANKARI 1,5 L/ha + SILWET 0,033 % v/v):
     SANKARI = (1,5 L/ha ÷ 3 L/ha) × 1.700 mL = 0,5 × 1.700 = 850 mL
     SILWET  = 0,033 % de 1.700 mL           = 0,561 mL
     calda   = 850 + 0,561                   = 850,561 mL
     água    = 1.700 − 850,561               = 849,439 mL                        */
var plan = M.calculateState(M.defaultState());
eq(plan.errors.length, 0, 'o estado padrão calcula sem erro');
eq(plan.treatmentResults.length, 4, 'quatro tratamentos');

perto(comp(plan, 0, 'SANKARI').batchAmount, 850, 0.001, 'SANKARI = (1,5 ÷ 3) × 1.700 mL = 850 mL');
perto(comp(plan, 0, 'SILWET').batchAmount, 0.561, 0.001, 'SILWET = 0,033 % de 1.700 mL = 0,561 mL');
perto(trat(plan, 0).liquidBatchMl, 850.561, 0.001, 'calda do T1 = 850 + 0,561 mL');
perto(trat(plan, 0).waterBatchMl, 849.439, 0.001, 'água do T1 = 1.700 − 850,561 mL');

/* T2 tem SILWET a 0,2 % — seis vezes o do T1, e a mesma dose de SANKARI. */
perto(comp(plan, 1, 'SILWET').batchAmount, 3.4, 0.001, 'SILWET do T2 = 0,2 % de 1.700 mL = 3,4 mL');
perto(comp(plan, 1, 'SANKARI').batchAmount, 850, 0.001, 'SANKARI do T2 não muda com o adjuvante');
/* T4 é produto único a 1 L/ha. */
perto(comp(plan, 3, 'Malathion').batchAmount, 566.667, 0.01, 'Malathion = (1 ÷ 3) × 1.700 mL = 566,67 mL');

console.log('\n--- A memória de cálculo vem junto de cada componente ---');
var formula = comp(plan, 0, 'SANKARI').formula;
ck(formula.indexOf('1,5 L/ha') >= 0 && formula.indexOf('3 L/ha') >= 0 && formula.indexOf('1.700') >= 0,
   'a fórmula mostra a dose, a taxa-alvo e o volume — a conta inteira, conferível');
ck(comp(plan, 0, 'SANKARI').concentration.length > 0, 'e a concentração resultante');
eq(comp(plan, 0, 'SANKARI').conversionError, '', 'sem erro de conversão neste caminho');

console.log('\n--- Aplicado, consumido e residual ---');
/* Área: 11 × 20 m = 220 m² = 0,022 ha. A 3 L/ha → 66 mL aplicados por tratamento,
   e 4 tratamentos → 264 mL. O resto é volume morto + mínimo operacional. */
perto(plan.totalAppliedMl, 264, 0.5, 'aplicado = 0,022 ha × 3 L/ha × 4 tratamentos = 264 mL');
perto(plan.totalPreparedMl, 6800, 1, 'preparado = 1.700 mL × 4 tratamentos = 6.800 mL');
perto(plan.totalResidualMl, 6800 - 264, 1, 'residual = preparado − aplicado');
ck(plan.totalResidualMl > plan.totalAppliedMl,
   'nesta configuração sobra mais do que se aplica — é o que o mínimo operacional do drone impõe');

console.log('\n--- Método POR TRATAMENTO (roadmap §7.2) ---');
/* É o que faltava: T1 e T2 no drone, T3 no trator, T4 na Torre de Potter, tudo no
   mesmo estudo. O motor já resolvia isso; era o Agracta que não expunha. */
var st = M.defaultState();
st.treatments[2].application = Object.assign(M.cloneApplication('tractor'), { targetRate: '200' });
st.treatments[3].application = M.cloneApplication('lab');
var misto = M.calculateState(st);
eq(misto.treatmentResults[0].equipmentKey, 'drone', 'T1 continua no drone');
eq(misto.treatmentResults[2].equipmentKey, 'tractor', 'T3 passa para o trator, sozinho');
eq(misto.treatmentResults[3].equipmentKey, 'lab', 'T4 vai para a Torre de Potter');
ck(misto.equipmentKeys.length >= 3, 'o plano registra que há mais de um método em uso');

console.log('\n--- O override por tratamento é declarado, não silencioso ---');
var comOverride = M.hasApplicationOverride(st.treatments[2].application.targetRate);
ck(comOverride === true, 'taxa-alvo preenchida no tratamento conta como override');
ck(M.hasApplicationOverride('') === false, 'campo vazio não conta como override');
ck(M.hasApplicationOverride(null) === false, 'nulo não conta como override');
var resolvido = M.resolveTreatmentApplication(st, st.treatments[2]);
ck(!!resolvido, 'a resolução devolve a aplicação efetiva do tratamento');

console.log('\n--- Calibração da BARRA (roadmap §7.3) ---');
/* Conta à mão, barra de 4 bicos a 0,5 m, 5 km/h, coleta de 30 s:
     faixa   = 4 × 0,5                       = 2 m
     vazão   = 4 bicos × 500 mL / 30 s       = 4.000 mL/min = 4 L/min
     área/h  = 2 m × 5.000 m/h               = 10.000 m²/h  = 1 ha/h
     taxa    = 4 L/min × 60 ÷ 1 ha/h         = 240 L/ha

   `calibration.individual` é uma MATRIZ: uma linha por bico, três leituras cada.
   A medição fica em calculateCalibration; faixa, taxa e desvio em equipmentOperation. */
function bicos(vals) { return vals.map(function (v) { return [String(v), String(v), String(v)]; }); }
function barra(leituras, extra) {
  var st = M.defaultState();
  st.equipment = 'tractor';
  st.prep.targetRate = (extra && extra.targetRate) || 240;
  st.tractor.calibration.individual = bicos(leituras);
  if (extra && extra.speed) st.tractor.speed = extra.speed;
  return M.equipmentOperation(st);
}

var op = barra([500, 500, 500, 500]);
perto(op.width, 2, 0.001, 'faixa = 4 bicos × 0,5 m = 2 m');
perto(op.measuredFlow, 4, 0.001, 'vazão medida = 4 × 500 mL/30 s = 4 L/min');
perto(op.actualRate, 240, 0.5, 'taxa = 240 L/ha');
perto(op.deviationPct, 0, 0.5, 'com a taxa-alvo em 240, o desvio é zero');
perto(op.idealSpeed, 5, 0.1, 'e a velocidade ideal confirma os 5 km/h');
eq(op.calibration.valid, true, 'as 12 leituras completas validam a calibração');
eq(op.calibration.completed, 12, '4 bicos × 3 repetições = 12 leituras');
perto(op.calibration.cv, 0, 0.001, 'bicos idênticos dão CV zero');

console.log('\n--- A calibração denuncia o que a média esconde ---');
var desigual = barra([450, 500, 550, 500]);
ck(desigual.calibration.cv > 0, 'bicos desiguais geram CV maior que zero');
perto(desigual.actualRate, 240, 0.5,
   'mas a taxa média continua 240 L/ha — é o CV que denuncia a desuniformidade');

var bicoMorto = barra([500, 500, 0, 500]);
eq((bicoMorto.calibration.zeroNozzles || []).length, 1, 'bico entupido é apontado, não diluído na média');
eq(bicoMorto.calibration.zeroNozzles[0], 3, 'e nomeado: é o terceiro');

var incompleta = M.calculateCalibration({
  nozzles: 4, spacing: 0.5, manualWidth: 0, speed: 5, sampleSeconds: 30,
  method: 'individual', calibration: { individual: bicos([500, 500]), whole: ['', '', ''] }
});
eq(incompleta.valid, false,
   'calibração pela metade NÃO é dada como válida — meia calibração é pior que nenhuma');
eq(incompleta.completed, 6, 'e ela diz quantas leituras faltam');

console.log('\n--- Barra fora da taxa-alvo ---');
var rapido = barra([500, 500, 500, 500], { speed: 10 });
perto(rapido.actualRate, 120, 0.5, 'dobrar a velocidade com a mesma vazão corta a taxa pela metade');
ck(rapido.deviationPct < -40, 'e o desvio acusa que está muito abaixo dos 240 L/ha pedidos');
ck(rapido.idealSpeed < rapido.speed, 'a velocidade ideal aponta para desacelerar');

console.log('\n--- Máquina inteira, quando não dá para medir bico a bico ---');
var inteira = M.calculateCalibration({
  nozzles: 4, spacing: 0.5, manualWidth: 0, speed: 5, sampleSeconds: 30,
  method: 'whole', calibration: { individual: [], whole: ['2000', '2000', '2000'] }
});
eq(inteira.valid, true, 'três coletas da máquina inteira bastam');
perto(inteira.totalFlow, 4, 0.001, '2.000 mL/30 s = 4 L/min, a mesma vazão');
eq(inteira.completed, 3, 'e o método exige três leituras, não doze');

console.log('\n--- Torre de Potter: a área do alvo manda na taxa ---');
/* Placa circular de 7,1 cm de diâmetro → área = π × 3,55² = 39,59 cm² = 0,003959 m².
   A 3 L/ha: 3 × 0,003959 × 100 = 1,188 µL por alvo. */
var lab = M.calculateLabCalibration(
  { pressurePsi: 13, targetShape: 'circle', diameterCm: 7.1, targetsPerShot: 1,
    chargeMl: 0, collectedUl: ['100', '100', '100'] }, 3);
perto(lab.areaPerTargetCm2, 39.592, 0.01, 'placa de 7,1 cm → 39,59 cm² (π × 3,55²)');
perto(lab.targetPerTargetUl, 1.188, 0.01, 'a 3 L/ha, cada placa deveria receber 1,19 µL');
perto(lab.meanCollectedUl, 100, 0.001, 'média das três leituras coletadas');
ck(lab.actualRate > 3, 'coletar 100 µL onde cabiam 1,19 µL acusa taxa muito acima da alvo');
ck(lab.deviationPct > 0, 'e o desvio sai positivo');
eq(lab.calibration.valid, true, 'três leituras completas validam a calibração de bancada');

console.log('\n--- Recusas e bordas ---');
var vazio = M.calculateState(Object.assign(M.defaultState(), { treatments: [] }));
eq(vazio.treatmentResults.length, 0, 'estado sem tratamento não inventa resultado');
ck(Array.isArray(vazio.errors), 'e devolve a lista de erros, mesmo vazia');

var semDose = M.defaultState();
semDose.treatments = [{ id: 'x', name: 'Sem dose', application: M.cloneApplication('drone'),
                        components: [{ name: 'Produto', type: 'L/ha', dose: '' }] }];
var planSemDose = M.calculateState(semDose);
eq(planSemDose.treatmentResults.length, 1, 'tratamento sem dose ainda aparece no plano');
perto(comp(planSemDose, 0, 'Produto').batchAmount, 0, 0.001, 'com quantidade zero, não com lixo');

console.log('\n--- Números em pt-BR ---');
eq(M.parseNumber('1,5'), 1.5, 'vírgula é decimal');
eq(M.parseNumber('1.700'), 1700, 'ponto de milhar não vira decimal — 1.700 é mil e setecentos');
/* parseNumber('') -> 0 é intencional no original. Quem distingue "célula vazia" é
   parseReading, e a razão está comentada lá: 0 é um valor MEDIDO (bico entupido) e
   precisa sobreviver até a média, o CV e os alertas. Confundir os dois apagaria
   justamente o bico morto que a calibração existe para encontrar. */
eq(M.parseNumber(''), 0, 'parseNumber trata vazio como zero — é o contrato do original');
eq(M.parseReading(''), null, 'mas parseReading devolve null: célula vazia não é leitura');
eq(M.parseReading('0'), 0, 'e zero medido continua zero, não vira vazio');
eq(M.parseNumber('0.033'), 0.033, '0.033 não é milhar — continua trinta e três milésimos');
ck(M.formatNumber(1700, 0).indexOf('.') > 0 || M.formatNumber(1700, 0).indexOf('7') > 0,
   'a formatação devolve texto legível');

console.log('\n--- A memória auditável do plano inteiro ---');
var texto = M.auditText(plan, new Date('2026-09-01T12:00:00Z'));
ck(typeof texto === 'string' && texto.length > 200, 'auditText produz a memória completa');
ck(texto.indexOf('SANKARI') > 0, 'nomeando os tratamentos');
ck(texto.indexOf('1,5') > 0 || texto.indexOf('850') > 0, 'e trazendo os números do cálculo');

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
