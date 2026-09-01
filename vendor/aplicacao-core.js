/* Motor da Calculadora Universal de Aplicacao — nucleo puro (sem DOM).
 *
 * Extraido de calculadora_aplicacao_universal.html, cujo proprio cabecalho ja
 * declarava: "engine.js — motor de calculo. Puro: nao le nem escreve no DOM.
 * Roda igual no navegador e no Node." Aqui ele vira modulo do Agracta, sem uma
 * linha de aritmetica alterada — so o empacotamento UMD e a lista de exports.
 *
 * E o que faltava para o roadmap secoes 7.2 e 7.3: este motor ja trata METODO POR
 * TRATAMENTO (resolveTreatmentApplication, com override por tratamento sobre o
 * padrao do estudo) e CALIBRACAO POR EQUIPAMENTO — trator/sider, drone, costal
 * pressurizado a CO2, atomizador costal motorizado e Torre de Potter.
 *
 * Complementa vendor/biocalc-campo-core.js: aquele resolve a mistura de uma calda
 * (componentes, veiculo, frascos); este resolve a OPERACAO de aplicacao inteira,
 * com equipamento, calibracao, volume morto, escorva, sobra tecnica, minimo
 * operacional e base de dosagem por area ou por unidade-alvo.
 *
 * UNICO DESVIO em relacao ao original: a linha do auditText que reportava os
 * autotestes internos passou a reportar a versao do motor. O runSelfTestsCore do
 * original testa o APP INTEIRO (chama csvEscape, exportacao), nao so o motor —
 * traze-lo arrastaria CSV e Word para dentro do nucleo. A verificacao equivalente
 * do nucleo extraido vive em test_aplicacao_core.js. Nenhuma aritmetica mudou.
 *
 * Convencoes preservadas do original: volumes em mL, taxas conforme a unidade
 * escolhida, e cada resultado carrega a memoria de calculo para auditoria.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.AplicacaoCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  // engine.js — motor de cálculo da Calculadora Universal de Aplicação.
  // Puro: não lê nem escreve no DOM. Roda igual no navegador e no Node.
  // Toda a aritmética auditável vive aqui; a interface está em ui.js.

  const APP_VERSION = "1.9.0";

  const EQUIPMENT_LABELS = {
    tractor: "Trator — sider",
    drone: "Drone",
    co2: "Pulverizador costal pressurizado a CO₂",
    atomizer: "Atomizador costal motorizado",
    lab: "Laboratório — Torre de Potter"
  };

  // Folha de rosto do protocolo. A ordem aqui é a ordem em que os campos
  // aparecem na memória auditável e no relatório Word.
  const PROTOCOL_FIELDS = [
    ["studyNumber", "Número de estudo"], ["status", "Status do estudo"], ["objective", "Objetivo do estudo"],
    ["proposal", "Proposta comercial"], ["ret", "RET ou dispensa"],
    ["director", "Diretor de estudo"], ["technician", "Técnico de campo"], ["station", "Estação experimental"],
    ["municipality", "Município"], ["uf", "UF"], ["address", "Endereço"],
    ["latitude", "Latitude (S)"], ["longitude", "Longitude (O)"], ["altitude", "Altitude"],
    ["crop", "Cultura"], ["cultivar", "Cultivar"], ["target", "Alvo"],
    ["plantingDate", "Data de plantio"], ["emergenceDate", "Data de emergência"],
    ["startDate", "Data de início (1ª aplicação)"], ["endDate", "Data de término"],
    ["plotSize", "Tamanho da parcela"], ["plantingSpacing", "Espaçamento de plantio"],
    ["population", "População"], ["block", "Quadra"],
    ["soil", "Classe de solo"], ["design", "Delineamento estatístico"],
    ["treatmentCount", "Número de tratamentos"], ["replicates", "Número de repetições"],
    ["equipment", "Equipamento"], ["pressure", "Pressão de trabalho"], ["sprayVolume", "Volume de calda"],
    ["tip", "Ponta de pulverização"], ["nozzleSetup", "Nº de bicos e espaçamento"],
    ["nozzleDistance", "Distância bico–cultura"], ["adjuvant", "Adjuvante utilizado"],
  ];

  const EMPTY_APPLICATION = {
    equipment:"drone", targetRate:"", basis:"", technicalSurplusPct:"", deadVolumeMl:"",
    primingVolumeMl:"", minimumOperatingMl:"", containerCount:"", containerCapacityMl:"",
    labFinalVolumeMl:"", labPreparationCount:"", labTargetCount:"",
    dosingBase:"", targetUnit:"", targetCount:"", targetPer:"", volumePerTargetMl:"", targetPreparations:"",
    profileConfirmed:true, profileSource:"padrões gerais conferidos"
  };

  const APPLICATION_FIELD_LABELS = {
    targetRate:"taxa-alvo", basis:"regra de preparo", technicalSurplusPct:"sobra técnica", deadVolumeMl:"volume morto",
    primingVolumeMl:"escorva/estabilização", minimumOperatingMl:"mínimo operacional", containerCount:"número de recipientes",
    containerCapacityMl:"capacidade dos recipientes", labFinalVolumeMl:"volume final de bancada",
    labPreparationCount:"preparações laboratoriais", labTargetCount:"potes/alvos do tratamento",
    dosingBase:"base de dosagem", targetUnit:"unidade-alvo", targetCount:"quantidade de unidades-alvo",
    targetPer:"denominador da dose", volumePerTargetMl:"calda por unidade-alvo", targetPreparations:"preparações",
    profileConfirmed:"confirmação do perfil de preparo", profileSource:"origem do perfil de preparo"
  };

  /**
   * Base de dosagem: contra o que a dose é escrita.
   *
   * "area" é o que sempre existiu — dose por hectare, calda por hectare.
   * "target" generaliza: dose por unidade-alvo (vaso, planta, árvore, placa,
   * inseto, metro de sulco, kg de semente), calda por unidade-alvo. É a mesma
   * álgebra: o hectare sempre foi uma unidade-alvo com nome de área.
   *
   * Com isso, tratamento de sementes, bioensaio em vaso e aplicação por árvore
   * deixam de exigir código novo — viram uma escolha.
   */
  const DOSING_BASES = {
    area:   "Por área (hectare)",
    target: "Por unidade-alvo",
  };

  /**
   * Unidades-alvo prontas. `plural` é o que aparece nos rótulos e `por` é o
   * denominador usual da bula — a de semente é escrita por 100 kg, não por kg,
   * e obrigar a dividir de cabeça é justamente onde o erro entra.
   */
  const TARGET_UNITS = [
    { id: "vaso",     singular: "vaso",           plural: "vasos",              por: 1 },
    { id: "planta",   singular: "planta",         plural: "plantas",            por: 1 },
    { id: "arvore",   singular: "árvore",         plural: "árvores",            por: 1 },
    { id: "placa",    singular: "placa",          plural: "placas",             por: 1 },
    { id: "inseto",   singular: "inseto",         plural: "insetos",            por: 1 },
    { id: "folha",    singular: "folha",          plural: "folhas",             por: 1 },
    { id: "semente",  singular: "kg de semente",  plural: "kg de semente",      por: 100 },
    { id: "metro",    singular: "metro de sulco", plural: "metros de sulco",    por: 1 },
    { id: "litro",    singular: "L de calda",     plural: "L de calda",         por: 100 },
    { id: "unidade",  singular: "unidade",        plural: "unidades",           por: 1 },
  ];

  /** Unidades de dose que valem por unidade-alvo. O rótulo troca "alvo" pelo nome escolhido. */
  const TARGET_UNIT_OPTIONS = [
    ["L/alvo",       "L por {alvo}"],
    ["mL/alvo",      "mL por {alvo}"],
    ["µL/alvo",      "µL por {alvo}"],
    ["kg/alvo",      "kg por {alvo}"],
    ["g/alvo",       "g por {alvo}"],
    ["mg/alvo",      "mg por {alvo}"],
    ["g i.a./alvo",  "g i.a. por {alvo} — requer concentração da formulação"],
  ];

  /** Unidades que dependem só do volume da calda: valem em qualquer base. */
  const BROTH_UNIT_IDS = ["%v/v", "mL/L", "g/L", "mg/L", "ppm", "%m/v"];

  const UNIT_OPTIONS = [
    ["L/ha", "L/ha — líquido por área"],
    ["mL/ha", "mL/ha — líquido por área"],
    ["g/ha", "g/ha — sólido por área"],
    ["kg/ha", "kg/ha — sólido por área"],
    ["g i.a./ha", "g i.a./ha — requer concentração da formulação"],
    ["kg i.a./ha", "kg i.a./ha — requer concentração da formulação"],
    ["%v/v", "% v/v — líquido no volume final"],
    ["mL/L", "mL/L — líquido na calda"],
    ["g/L", "g/L — sólido na calda"],
    ["mg/L", "mg/L — sólido na calda"],
    ["ppm", "ppm — assumido como mg/L em água"],
    ["%m/v", "% m/v — g por 100 mL"],
    ...TARGET_UNIT_OPTIONS
  ];

  /** A unidade-alvo escolhida, com o padrão seguro quando o id não existe. */
  function targetUnitOf(state) {
    const escolhida = TARGET_UNITS.find(unidade => unidade.id === state?.targetBase?.unit);
    return escolhida || TARGET_UNITS[TARGET_UNITS.length - 1];
  }

  /** Rótulo de uma unidade de dose já com o nome do alvo no lugar de "alvo". */
  function unitLabelFor(unitId, state) {
    const alvo = targetUnitOf(state);
    const por = Math.max(1, parseNumber(state?.targetBase?.per) || alvo.por);
    const nome = por > 1 ? `${formatSmart(por, 3)} ${alvo.plural}` : alvo.singular;
    const entrada = TARGET_UNIT_OPTIONS.find(([id]) => id === unitId);
    if (entrada) return entrada[1].replace("{alvo}", nome);
    const padrao = UNIT_OPTIONS.find(([id]) => id === unitId);
    return padrao ? padrao[1] : unitId;
  }

  /** Quais unidades de dose fazem sentido na base escolhida. */
  function unitsForBase(base) {
    const porAlvo = TARGET_UNIT_OPTIONS.map(([id]) => id);
    return UNIT_OPTIONS.filter(([id]) => {
      if (porAlvo.includes(id)) return base === "target";
      if (BROTH_UNIT_IDS.includes(id)) return true;
      return base !== "target";
    });
  }

  const FORMULATION_UNIT_OPTIONS = [
    ["g/L", "g i.a./L — formulação líquida"],
    ["g/kg", "g i.a./kg — formulação sólida"],
    ["%", "% de ingrediente ativo"]
  ];

  const DEFAULT_TREATMENTS = [
    { id: "t1", name: "SANKARI + SILWET 0,033%", application:cloneApplication("drone"), components: [
      { name: "SANKARI", type: "L/ha", dose: "1,5" },
      { name: "SILWET", type: "%v/v", dose: "0,033" }
    ]},
    { id: "t2", name: "SANKARI + SILWET 0,2%", application:cloneApplication("drone"), components: [
      { name: "SANKARI", type: "L/ha", dose: "1,5" },
      { name: "SILWET", type: "%v/v", dose: "0,2" }
    ]},
    { id: "t3", name: "SANKARI + SILWET 0,5%", application:cloneApplication("drone"), components: [
      { name: "SANKARI", type: "L/ha", dose: "1,5" },
      { name: "SILWET", type: "%v/v", dose: "0,5" }
    ]},
    { id: "t4", name: "Malathion", application:cloneApplication("drone"), components: [
      { name: "Malathion", type: "L/ha", dose: "1" }
    ]}
  ];

  // Versão do arquivo que originou o plano em memória. A memória auditável
  // avisa quando o plano veio de outra versão do motor.
  let loadedEngineVersion = "";

  function setLoadedEngineVersion(version) {
    loadedEngineVersion = typeof version === "string" ? version : "";
  }

  let selfTestCache = null;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function cloneApplication(equipment = "drone") { return { ...EMPTY_APPLICATION, equipment:EQUIPMENT_LABELS[equipment] ? equipment : "drone" }; }

  function parseNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    let text = String(value ?? "").trim().replace(/\s+/g, "");
    if (!text) return 0;
    if (text.includes(",") && text.includes(".")) {
      if (text.lastIndexOf(",") > text.lastIndexOf(".")) text = text.replace(/\./g, "").replace(",", ".");
      else text = text.replace(/,/g, "");
    } else if (text.includes(",")) text = text.replace(",", ".");
    // Milhar pt-BR: só quando o primeiro grupo não começa em zero.
    // "1.700" é 1700; "0.033" continua 0,033 (dose de adjuvante, não 33%).
    else if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  }

  // Leitura de coleta: "" e texto não numérico viram null (célula vazia);
  // 0 é um valor MEDIDO e precisa sobreviver até a média, o CV e os alertas.
  function parseReading(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    if (!text) return null;
    if (!/^-?[\d.,\s]*\d[\d.,\s]*$/.test(text)) return null;
    const number = parseNumber(text);
    return Number.isFinite(number) ? number : null;
  }

  function numberToInput(value) {
    if (!Number.isFinite(value)) return "";
    return String(value).replace(".", ",");
  }

  function positiveInt(value, fallback = 1, max = 9999) {
    const number = Math.round(parseNumber(value));
    return number > 0 ? Math.min(number, max) : fallback;
  }

  function round(value, digits = 9) {
    const factor = 10 ** digits;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function formatNumber(value, digits = 2) {
    if (!Number.isFinite(value)) return "—";
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(normalized);
  }

  function formatSmart(value, maxDigits = 3) {
    if (!Number.isFinite(value)) return "—";
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    const abs = Math.abs(normalized);
    const digits = abs > 0 && abs < .01 ? Math.min(6, maxDigits + 3) : abs < 1 ? Math.min(4, maxDigits + 1) : maxDigits;
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(normalized);
  }

  function formatMl(value) {
    if (!Number.isFinite(value)) return "—";
    if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, 3)} L`;
    if (Math.abs(value) > 0 && Math.abs(value) < .01) return `${formatNumber(value, 6)} mL`;
    if (Math.abs(value) > 0 && Math.abs(value) < 1) return `${formatNumber(value, 3)} mL`;
    return `${formatNumber(value, 2)} mL`;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "—";
    if (seconds < 60) return `${formatNumber(seconds, 1)} s`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds - minutes * 60;
    return `${minutes} min ${formatNumber(rest, 0)} s`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#039;" }[char]));
  }

  function cleanName(value, fallback) { return String(value ?? "").trim() || fallback; }

  function sampleCv(values) {
    const valid = values.filter(value => Number.isFinite(value));
    if (valid.length < 2) return null;
    const average = valid.reduce((sum, value) => sum + value, 0) / valid.length;
    const variance = valid.reduce((sum, value) => sum + (value - average) ** 2, 0) / (valid.length - 1);
    return average > 0 ? Math.sqrt(variance) / average * 100 : null;
  }

  function mean(values) {
    const valid = values.filter(value => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  }

  function meanOrNull(values) {
    const valid = values.filter(value => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  }

  function prepClampAlerts(prep) {
    const substituted = [];
    if (prep.technicalSurplusPct < 0) substituted.push(`sobra técnica de ${formatNumber(prep.technicalSurplusPct,2)}% tratada como 0%`);
    if (prep.deadVolumeMl < 0) substituted.push(`volume morto de ${formatNumber(prep.deadVolumeMl,2)} mL tratado como 0 mL`);
    if (prep.primingVolumeMl < 0) substituted.push(`escorva de ${formatNumber(prep.primingVolumeMl,2)} mL tratada como 0 mL`);
    if (prep.minimumOperatingMl < 0) substituted.push(`mínimo operacional de ${formatNumber(prep.minimumOperatingMl,2)} mL tratado como 0 mL`);
    return substituted.length ? [{ kind:"warning", text:`Valores fora de faixa substituídos no cálculo: ${substituted.join("; ")}. Corrija os campos para que a memória registre o valor pretendido.` }] : [];
  }

  function calculateCalibration(config) {
    const seconds = config.sampleSeconds;
    const requiredInputs = config.method === "individual" ? config.nozzles * 3 : 3;
    const blank = { valid:false, totalFlow:0, perNozzleFlow:0, cv:null, completed:0, requiredInputs, means:[], repeatMeans:[], zeroNozzles:[], negativeCount:0 };
    if (!(seconds > 0)) return blank;
    if (config.method === "individual") {
      const rows = Array.from({length:config.nozzles},(_,index) => ((config.calibration.individual[index] || ["","",""]).map(parseReading)));
      const cells = rows.flat();
      const completed = cells.filter(value => Number.isFinite(value) && value >= 0).length;
      const negativeCount = cells.filter(value => Number.isFinite(value) && value < 0).length;
      const means = rows.map(readings => meanOrNull(readings.filter(value => Number.isFinite(value) && value >= 0)));
      const measured = means.filter(value => value !== null);
      const totalFlow = measured.reduce((sum,ml) => sum + ml * 60 / (seconds * 1000), 0);
      return {
        valid: completed === requiredInputs && negativeCount === 0,
        totalFlow, perNozzleFlow: config.nozzles > 0 ? totalFlow / config.nozzles : 0,
        cv: measured.length > 1 ? sampleCv(measured) : null, completed, requiredInputs, means, repeatMeans:[],
        zeroNozzles: means.map((value,index) => value === 0 ? index + 1 : 0).filter(Boolean), negativeCount
      };
    }
    const cells = config.calibration.whole.map(parseReading);
    const repeats = cells.filter(value => Number.isFinite(value) && value >= 0);
    const negativeCount = cells.filter(value => Number.isFinite(value) && value < 0).length;
    const totalFlow = mean(repeats) * 60 / (seconds * 1000);
    return {
      valid: repeats.length === 3 && negativeCount === 0, totalFlow, perNozzleFlow: config.nozzles > 0 ? totalFlow / config.nozzles : 0,
      cv: repeats.length > 1 ? sampleCv(repeats) : null, completed: repeats.length, requiredInputs, means:[], repeatMeans:repeats,
      zeroNozzles:[], negativeCount
    };
  }

  function calculateWholeMachine(config) {
    const seconds = config.sampleSeconds;
    const cells = config.calibration.whole.map(parseReading);
    const repeats = cells.filter(value => Number.isFinite(value) && value >= 0);
    const negativeCount = cells.filter(value => Number.isFinite(value) && value < 0).length;
    const averageMl = mean(repeats);
    return {
      valid: seconds > 0 && repeats.length === 3 && negativeCount === 0,
      totalFlow: seconds > 0 ? averageMl * 60 / (seconds * 1000) : 0,
      perNozzleFlow: config.outletCount > 0 && seconds > 0 ? averageMl * 60 / (seconds * 1000) / config.outletCount : 0,
      cv: repeats.length > 1 ? sampleCv(repeats) : null,
      completed: repeats.length, requiredInputs:3, means:[], repeatMeans:repeats,
      zeroNozzles:[], negativeCount
    };
  }

  function labTargetAreaCm2(lab) {
    if (lab.targetShape === "rectangle") return Math.max(0,lab.widthCm) * Math.max(0,lab.lengthCm);
    if (lab.targetShape === "manual") return Math.max(0,lab.manualAreaCm2);
    const radiusCm = Math.max(0,lab.diameterCm) / 2;
    return Math.PI * radiusCm * radiusCm;
  }

  function calculateLabCalibration(lab,targetRate) {
    const areaPerTargetCm2 = labTargetAreaCm2(lab);
    const areaPerTargetM2 = areaPerTargetCm2 / 10000;
    const targetsPerShot = positiveInt(lab.targetsPerShot,1,9999);
    const totalAreaPerShotM2 = areaPerTargetM2 * targetsPerShot;
    const targetPerTargetUl = targetRate > 0 ? targetRate * areaPerTargetM2 * 100 : 0;
    const targetPerShotUl = targetPerTargetUl * targetsPerShot;
    const readings = (lab.collectedUl || []).map(parseReading).filter(value => Number.isFinite(value) && value >= 0);
    const meanCollectedUl = mean(readings);
    const actualRate = meanCollectedUl > 0 && totalAreaPerShotM2 > 0 ? meanCollectedUl / (totalAreaPerShotM2 * 100) : null;
    const deviationPct = actualRate !== null && targetRate > 0 ? (actualRate - targetRate) / targetRate * 100 : null;
    const recoveryPct = lab.chargeMl > 0 && meanCollectedUl > 0 ? meanCollectedUl / (lab.chargeMl * 1000) * 100 : null;
    const estimatedChargeMl = lab.chargeMl > 0 && meanCollectedUl > 0 && targetPerShotUl > 0 ? lab.chargeMl * targetPerShotUl / meanCollectedUl : null;
    return {
      areaPerTargetCm2, areaPerTargetM2, targetsPerShot, totalAreaPerShotM2, targetPerTargetUl, targetPerShotUl,
      readings, meanCollectedUl, actualRate, deviationPct, recoveryPct, estimatedChargeMl,
      calibration:{valid:readings.length === 3,totalFlow:0,perNozzleFlow:0,cv:readings.length > 1 ? sampleCv(readings) : null,completed:readings.length,requiredInputs:3,means:[],repeatMeans:readings,zeroNozzles:[],negativeCount:0}
    };
  }

  function calculateLabHelpers(lab) {
    const directValid = lab.c1 > 0 && lab.c2 >= 0 && lab.v2Ml > 0;
    const v1Ml = directValid ? lab.c2 * lab.v2Ml / lab.c1 : 0;
    const diluentMl = directValid ? lab.v2Ml - v1Ml : 0;
    const serialValid = lab.serialStart > 0 && lab.serialFactor > 1 && lab.serialCount > 0 && lab.serialVolumeMl > 0;
    const transferMl = serialValid ? lab.serialVolumeMl / lab.serialFactor : 0;
    const serialDiluentMl = serialValid ? lab.serialVolumeMl - transferMl : 0;
    const rows = serialValid ? Array.from({length:lab.serialCount},(_,index) => ({
      dose:index+1, concentration:lab.serialStart / (lab.serialFactor ** index),
      transferMl:index === 0 ? null : transferMl, diluentMl:index === 0 ? null : serialDiluentMl, finalMl:lab.serialVolumeMl
    })) : [];
    return {directValid,v1Ml,diluentMl,serialValid,transferMl,serialDiluentMl,rows};
  }

  function equipmentOperation(state) {
    const targetRate = state.prep.targetRate;
    let width = 0, speed = 0, measuredFlow = 0, calibration = null, details = {}, name = EQUIPMENT_LABELS[state.equipment];
    if (state.equipment === "lab") {
      const labResult = calculateLabCalibration(state.lab,targetRate);
      return {
        name, width:0, speed:0, measuredFlow:0, requiredFlow:0, actualRate:labResult.actualRate,
        deviationPct:labResult.deviationPct, idealSpeed:null, calibration:labResult.calibration,
        details:clone(state.lab), requiredCollectionTotalMl:null, requiredCollectionPerNozzleMl:null, isLab:true, lab:labResult
      };
    } else if (state.equipment === "tractor" || state.equipment === "co2") {
      const cfg = state[state.equipment];
      width = cfg.manualWidth > 0 ? cfg.manualWidth : cfg.nozzles * cfg.spacing;
      speed = cfg.speed;
      calibration = calculateCalibration(cfg);
      measuredFlow = calibration.valid ? calibration.totalFlow : 0;
      details = { nozzles:cfg.nozzles, spacing:cfg.spacing, manualWidth:cfg.manualWidth, sampleSeconds:cfg.sampleSeconds, method:cfg.method };
    } else if (state.equipment === "atomizer") {
      const cfg = state.atomizer;
      width = cfg.width;
      speed = cfg.speed;
      calibration = calculateWholeMachine(cfg);
      measuredFlow = calibration.valid ? calibration.totalFlow : 0;
      details = { sampleSeconds:cfg.sampleSeconds, outletCount:cfg.outletCount };
    } else {
      const cfg = state.drone;
      width = cfg.width;
      speed = cfg.speed;
      measuredFlow = cfg.observedFlow > 0 ? cfg.observedFlow : 0;
      calibration = { valid:cfg.observedFlow > 0, totalFlow:measuredFlow, perNozzleFlow:0, cv:null, completed:cfg.observedFlow > 0 ? 1 : 0, requiredInputs:1, means:[], repeatMeans:[] };
      details = clone(cfg);
      name = cleanName(cfg.model,"Drone");
    }
    const requiredFlow = targetRate > 0 && speed > 0 && width > 0 ? targetRate * speed * width / 600 : 0;
    const actualRate = measuredFlow > 0 && speed > 0 && width > 0 ? 600 * measuredFlow / (speed * width) : null;
    const deviationPct = actualRate !== null && targetRate > 0 ? (actualRate - targetRate) / targetRate * 100 : null;
    const idealSpeed = measuredFlow > 0 && targetRate > 0 && width > 0 ? 600 * measuredFlow / (targetRate * width) : null;
    const requiredCollectionTotalMl = details.sampleSeconds > 0 ? requiredFlow * 1000 * details.sampleSeconds / 60 : null;
    const requiredCollectionPerNozzleMl = requiredCollectionTotalMl !== null && details.nozzles > 0 ? requiredCollectionTotalMl / details.nozzles : null;
    return { name, width, speed, measuredFlow, requiredFlow, actualRate, deviationPct, idealSpeed, calibration, details, requiredCollectionTotalMl, requiredCollectionPerNozzleMl };
  }

  function calculateComponent(component, operation) {
    const dose = parseNumber(component.dose);
    const type = component.type;
    const batchMl = operation.finalBatchMl;
    const batchL = batchMl / 1000;
    const appliedMl = operation.appliedTotalMl;
    const appliedL = appliedMl / 1000;
    const areaHa = operation.treatmentAreaHa;
    let phase = "solid", baseUnit = "g", batchAmount = 0, appliedAmount = 0, concentration = "", formula = "", conversionError = "";
    // Uma dose escrita contra a base errada não pode ser calculada em silêncio.
    // O caso perigoso é o /ha na base por alvo: a taxa-alvo continua preenchida,
    // então a conta DARIA um número — só que um número sem significado, porque a
    // área do tratamento é zero. Trava explícita em vez de resultado plausível.
    const baseCruzada = operation.isTargetBase
      ? (type.endsWith("/ha") ? "ha" : "")
      : (type.endsWith("/alvo") ? "alvo" : "");
    if (baseCruzada === "ha") {
      conversionError = `A dose está escrita por hectare ("${type}"), mas este tratamento é dosado por unidade-alvo. Reescreva a dose por unidade-alvo ou volte a base para hectare; nada foi convertido.`;
      concentration = "base de dosagem incompatível";
      formula = "não calculada";
    } else if (baseCruzada === "alvo") {
      conversionError = `A dose está escrita por unidade-alvo ("${type}"), mas este tratamento é dosado por área. Reescreva a dose por hectare ou mude a base do tratamento; nada foi convertido.`;
      concentration = "base de dosagem incompatível";
      formula = "não calculada";
    } else if (type === "L/ha") {
      phase = "liquid"; baseUnit = "mL";
      batchAmount = operation.targetRate > 0 ? dose / operation.targetRate * batchMl : 0;
      appliedAmount = dose * areaHa * 1000;
      concentration = operation.targetRate > 0 ? `${formatSmart(dose / operation.targetRate * 1000,3)} mL/L (${formatSmart(dose / operation.targetRate * 100,3)}% v/v equivalente)` : "—";
      formula = `(${formatSmart(dose,6)} L/ha ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchMl,6)} mL`;
    } else if (type === "mL/ha") {
      phase = "liquid"; baseUnit = "mL";
      batchAmount = operation.targetRate > 0 ? dose / operation.targetRate * batchL : 0;
      appliedAmount = dose * areaHa;
      concentration = operation.targetRate > 0 ? `${formatSmart(dose / operation.targetRate,6)} mL/L` : "—";
      formula = `(${formatSmart(dose,6)} mL/ha ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
    } else if (type === "g/ha") {
      baseUnit = "g";
      batchAmount = operation.targetRate > 0 ? dose / operation.targetRate * batchL : 0;
      appliedAmount = dose * areaHa;
      concentration = operation.targetRate > 0 ? `${formatSmart(dose / operation.targetRate,6)} g/L` : "—";
      formula = `(${formatSmart(dose,6)} g/ha ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
    } else if (type === "kg/ha") {
      baseUnit = "g";
      batchAmount = operation.targetRate > 0 ? dose * 1000 / operation.targetRate * batchL : 0;
      appliedAmount = dose * areaHa * 1000;
      concentration = operation.targetRate > 0 ? `${formatSmart(dose * 1000 / operation.targetRate,6)} g/L` : "—";
      formula = `(${formatSmart(dose * 1000,6)} g/ha ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
    } else if (type === "g i.a./ha" || type === "kg i.a./ha") {
      const activeGHa = type === "kg i.a./ha" ? dose * 1000 : dose;
      const formulationConcentration = parseNumber(component.formulationConcentration);
      const formulationUnit = FORMULATION_UNIT_OPTIONS.some(([value]) => value === component.formulationUnit) ? component.formulationUnit : "g/L";
      if (!(formulationConcentration > 0)) {
        conversionError = "Dose em ingrediente ativo exige a concentração da formulação.";
        concentration = "concentração da formulação não informada";
        formula = "não calculada";
      } else if (formulationUnit === "g/L") {
        const commercialMlHa = activeGHa / formulationConcentration * 1000;
        phase = "liquid"; baseUnit = "mL";
        batchAmount = operation.targetRate > 0 ? commercialMlHa / operation.targetRate * batchL : 0;
        appliedAmount = commercialMlHa * areaHa;
        concentration = `${formatSmart(commercialMlHa / operation.targetRate,6)} mL produto/L; formulação ${formatSmart(formulationConcentration,6)} g i.a./L`;
        formula = `(${formatSmart(activeGHa,6)} g i.a./ha ÷ ${formatSmart(formulationConcentration,6)} g i.a./L × 1.000 mL/L ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
      } else if (formulationUnit === "g/kg") {
        const commercialGHa = activeGHa / formulationConcentration * 1000;
        baseUnit = "g";
        batchAmount = operation.targetRate > 0 ? commercialGHa / operation.targetRate * batchL : 0;
        appliedAmount = commercialGHa * areaHa;
        concentration = `${formatSmart(commercialGHa / operation.targetRate,6)} g produto/L; formulação ${formatSmart(formulationConcentration,6)} g i.a./kg`;
        formula = `(${formatSmart(activeGHa,6)} g i.a./ha ÷ ${formatSmart(formulationConcentration,6)} g i.a./kg × 1.000 g/kg ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
      } else {
        const activeFraction = formulationConcentration / 100;
        const commercialGHa = activeGHa / activeFraction;
        baseUnit = "g";
        batchAmount = operation.targetRate > 0 ? commercialGHa / operation.targetRate * batchL : 0;
        appliedAmount = commercialGHa * areaHa;
        concentration = `${formatSmart(commercialGHa / operation.targetRate,6)} g produto/L; formulação ${formatSmart(formulationConcentration,6)}% i.a.`;
        formula = `(${formatSmart(activeGHa,6)} g i.a./ha ÷ (${formatSmart(formulationConcentration,6)} ÷ 100) ÷ ${formatSmart(operation.targetRate,6)} L/ha) × ${formatSmart(batchL,6)} L`;
      }
    } else if (type === "%v/v") {
      phase = "liquid"; baseUnit = "mL";
      batchAmount = dose / 100 * batchMl;
      appliedAmount = dose / 100 * appliedMl;
      concentration = `${formatSmart(dose,6)}% v/v = ${formatSmart(dose * 10,6)} mL/L`;
      formula = `${formatSmart(dose,6)} ÷ 100 × ${formatSmart(batchMl,6)} mL`;
    } else if (type === "mL/L") {
      phase = "liquid"; baseUnit = "mL";
      batchAmount = dose * batchL;
      appliedAmount = dose * appliedL;
      concentration = `${formatSmart(dose,6)} mL/L`;
      formula = `${formatSmart(dose,6)} mL/L × ${formatSmart(batchL,6)} L`;
    } else if (type === "g/L") {
      baseUnit = "g";
      batchAmount = dose * batchL;
      appliedAmount = dose * appliedL;
      concentration = `${formatSmart(dose,6)} g/L`;
      formula = `${formatSmart(dose,6)} g/L × ${formatSmart(batchL,6)} L`;
    } else if (type === "mg/L" || type === "ppm") {
      baseUnit = "mg";
      batchAmount = dose * batchL;
      appliedAmount = dose * appliedL;
      concentration = type === "ppm" ? `${formatSmart(dose,6)} ppm ≈ ${formatSmart(dose,6)} mg/L (solução aquosa)` : `${formatSmart(dose,6)} mg/L`;
      formula = `${formatSmart(dose,6)} mg/L × ${formatSmart(batchL,6)} L`;
    } else if (type === "%m/v") {
      baseUnit = "g";
      batchAmount = dose * batchMl / 100;
      appliedAmount = dose * appliedMl / 100;
      concentration = `${formatSmart(dose,6)}% m/v = ${formatSmart(dose * 10,6)} g/L`;
      formula = `${formatSmart(dose,6)} g/100 mL × ${formatSmart(batchMl,6)} mL ÷ 100`;
    } else if (type.endsWith("/alvo")) {
      // A álgebra é a mesma da dose por área: concentração = dose ÷ calda por
      // unidade, e o fator de unidades cancela. Só o denominador mudou de nome.
      const volumeMl = operation.volumePerTargetMl;
      const fator = operation.targetFactor;
      const alvo = operation.targetLabel || "alvo";
      const escala = { "L/alvo":1000, "mL/alvo":1, "µL/alvo":0.001, "kg/alvo":1000, "g/alvo":1, "mg/alvo":0.001 }[type];
      if (type === "g i.a./alvo") {
        const formulationConcentration = parseNumber(component.formulationConcentration);
        const formulationUnit = FORMULATION_UNIT_OPTIONS.some(([value]) => value === component.formulationUnit) ? component.formulationUnit : "g/L";
        if (!(formulationConcentration > 0)) {
          conversionError = "Dose em ingrediente ativo exige a concentração da formulação.";
          concentration = "concentração da formulação não informada";
          formula = "não calculada";
        } else if (formulationUnit === "g/L") {
          const comercialMl = dose / formulationConcentration * 1000;
          phase = "liquid"; baseUnit = "mL";
          batchAmount = volumeMl > 0 ? comercialMl / volumeMl * batchMl : 0;
          appliedAmount = comercialMl * fator;
          concentration = `${formatSmart(volumeMl > 0 ? comercialMl / volumeMl * 1000 : 0,6)} mL produto/L de calda; formulação ${formatSmart(formulationConcentration,6)} g i.a./L`;
          formula = `(${formatSmart(dose,6)} g i.a. ÷ ${formatSmart(formulationConcentration,6)} g i.a./L × 1.000 mL/L ÷ ${formatSmart(volumeMl,6)} mL por ${alvo}) × ${formatSmart(batchMl,6)} mL`;
        } else {
          const fracao = formulationUnit === "%" ? formulationConcentration / 100 : formulationConcentration / 1000;
          const comercialG = dose / fracao;
          baseUnit = "g";
          batchAmount = volumeMl > 0 ? comercialG / volumeMl * batchMl : 0;
          appliedAmount = comercialG * fator;
          concentration = `${formatSmart(volumeMl > 0 ? comercialG / volumeMl * 1000 : 0,6)} g produto/L de calda; formulação ${formatSmart(formulationConcentration,6)} ${formulationUnit}`;
          formula = `(${formatSmart(dose,6)} g i.a. ÷ ${formatSmart(fracao,6)} ÷ ${formatSmart(volumeMl,6)} mL por ${alvo}) × ${formatSmart(batchMl,6)} mL`;
        }
      } else if (escala === undefined) {
        conversionError = `Unidade de dose "${type}" não reconhecida.`;
        concentration = "unidade não reconhecida"; formula = "não calculada";
      } else {
        const liquida = ["L/alvo", "mL/alvo", "µL/alvo"].includes(type);
        phase = liquida ? "liquid" : "solid";
        baseUnit = liquida ? "mL" : (type === "mg/alvo" ? "mg" : "g");
        const doseBase = type === "mg/alvo" ? dose : dose * escala;   // mg fica em mg
        const porMl = type === "mg/alvo" ? dose : dose * escala;
        batchAmount = volumeMl > 0 ? porMl / volumeMl * batchMl : 0;
        appliedAmount = doseBase * fator;
        concentration = volumeMl > 0
          ? `${formatSmart(porMl / volumeMl * 1000,6)} ${baseUnit}/L de calda`
          : "calda por unidade-alvo não informada";
        formula = `(${formatSmart(dose,6)} ${type.replace("/alvo", "")} por ${alvo} ÷ ${formatSmart(volumeMl,6)} mL por ${alvo}) × ${formatSmart(batchMl,6)} mL`;
      }
    } else {
      conversionError = `Unidade de dose "${type || "(ausente)"}" não reconhecida. Escolha uma unidade da lista; a dose não foi convertida.`;
      concentration = "unidade não reconhecida";
      formula = "não calculada";
    }
    const totalPreparedAmount = batchAmount * operation.batchCount;
    const consumedVolumeMl = Number.isFinite(operation.consumedTotalMl) ? operation.consumedTotalMl : operation.appliedTotalMl;
    const consumedAmount = batchMl > 0 ? batchAmount / batchMl * consumedVolumeMl : 0;
    const perTargetAmount = operation.state?.equipment === "lab" && batchMl > 0 ? batchAmount / batchMl * (operation.lab.targetPerTargetUl / 1000) : null;
    return {
      name: cleanName(component.name,"Componente sem nome"), type, dose, phase, baseUnit, batchAmount,
      totalPreparedAmount, appliedAmount, consumedAmount, residualAmount:totalPreparedAmount - consumedAmount,
      perContainerAmount: batchAmount / operation.containerCount, perTargetAmount, concentration, formula, conversionError,
      formulationConcentration:parseNumber(component.formulationConcentration), formulationUnit:component.formulationUnit || "g/L",
      // A física da calda (mixture.js) lê estes dois; o motor só os carrega.
      formulationClass:component.formulationClass || "indefinida", density:parseNumber(component.density)
    };
  }

  function calculateTreatment(treatment, operation) {
    const components = treatment.components.map(component => calculateComponent(component,operation));
    const liquidBatchMl = components.filter(component => component.phase === "liquid").reduce((sum,component) => sum + component.batchAmount,0);
    const waterBatchMl = operation.finalBatchMl - liquidBatchMl;
    const alerts = [];
    const protocol = treatment.protocol && typeof treatment.protocol === "object" ? treatment.protocol : null;
    if (!components.length) {
      alerts.push(protocol?.isControl
        ? { kind:"info", text:"Testemunha sem componentes — nada a preparar além do volume de calda." }
        : { kind:"warning", text:"Tratamento sem componentes." });
    }
    if (protocol?.check && protocol.check.ok === false) {
      alerts.push({ kind:"error", text:`Protocolo inconsistente: ${formatSmart(protocol.dose,6)} ${protocol.doseUnit} × ${formatSmart(protocol.concentration,6)} ${protocol.concentrationUnit} ÷ 1.000 = ${formatSmart(protocol.check.expected,6)} g i.a./ha, mas o protocolo declara ${formatSmart(protocol.check.declared,6)} (${formatNumber(protocol.check.deviationPct,1)}%). Corrija o protocolo antes de preparar; a conta abaixo usa a dose comercial.` });
    }
    if (protocol && protocol.applications > 1) {
      alerts.push({ kind:"info", text:`O protocolo prevê ${protocol.applications} aplicações${protocol.intervalDays > 0 ? ` a cada ${protocol.intervalDays} dias` : ""}. Os volumes abaixo são de UMA aplicação.` });
    }
    // Herdar sobra técnica, volume morto, escorva e mínimo operacional de OUTRO
    // equipamento é erro silencioso de calda — um tratamento terrestre não
    // carrega o volume morto nem o mínimo operacional do drone. Quando o
    // equipamento do tratamento muda, o perfil nasce pendente e trava aqui.
    const meta = operation.state?.applicationMeta;
    if (meta && meta.profileConfirmed === false) {
      alerts.push({ kind:"error", text:`O perfil de preparo de ${EQUIPMENT_LABELS[meta.equipment] || meta.equipment} ainda não foi conferido para este tratamento. Revise taxa, sobra técnica, volume morto, escorva, mínimo operacional, recipientes e capacidade; depois marque "Perfil de preparo conferido".` });
    }
    if (components.some(component => !(component.dose > 0))) alerts.push({ kind:"error", text:"Há componente com dose igual a zero ou inválida." });
    components.filter(component => component.conversionError).forEach(component => alerts.push({kind:"error",text:`${component.name}: ${component.conversionError}`}));
    if (waterBatchMl < -0.005) alerts.push({ kind:"error", text:`Os componentes líquidos somam ${formatMl(liquidBatchMl)}, acima do volume final de ${formatMl(operation.finalBatchMl)}. Não cabe água; revise taxa, dose ou concentração.` });
    else if (waterBatchMl <= 0.01) alerts.push({ kind:"warning", text:"Os líquidos ocupam praticamente todo o volume final; não há água livre para completar." });
    else if (operation.finalBatchMl > 0 && liquidBatchMl / operation.finalBatchMl >= .25) alerts.push({ kind:"warning", text:`Formulações líquidas ocupam ${formatNumber(liquidBatchMl / operation.finalBatchMl * 100,1)}% da calda. Confirme compatibilidade física, sequência de mistura e autorização para esta concentração.` });
    if (components.some(component => component.baseUnit !== "mL")) alerts.push({ kind:"info", text:"Sólidos são calculados em massa e não tiveram volume aparente subtraído. Dissolver e completar com água q.s.p. até o volume final." });
    if (operation.state.equipment === "lab" && operation.consumedTotalMl > operation.totalPreparedMl + .005) alerts.push({kind:"error",text:`A torre consumiria aproximadamente ${formatMl(operation.consumedTotalMl)}, acima dos ${formatMl(operation.totalPreparedMl)} preparados. Aumente o volume de bancada ou reduza o número de aplicações.`});
    const consumedMl = Number.isFinite(operation.consumedTotalMl) ? operation.consumedTotalMl : operation.appliedTotalMl;
    if (operation.totalPreparedMl > 0 && consumedMl >= 0) {
      const wastePct = (operation.totalPreparedMl - consumedMl) / operation.totalPreparedMl * 100;
      if (wastePct >= 50) {
        const discarded = components.filter(component => component.residualAmount > 0)
          .map(component => `${component.name} ${formatComponentAmount(component.residualAmount,component.baseUnit)}`).join("; ");
        alerts.push({ kind:"warning", text:`${formatNumber(wastePct,0)}% da calda preparada não será aplicada (${formatMl(operation.totalPreparedMl)} preparados, ${formatMl(consumedMl)} usados).${discarded ? ` Descarte previsto de produto: ${discarded}.` : ""} Em ensaio com amostra escassa, revise mínimo operacional, extras e número de preparações.` });
      }
    }
    return {
      id:treatment.id, name:cleanName(treatment.name,"Tratamento"), components, liquidBatchMl,
      waterBatchMl, waterTotalMl:waterBatchMl * operation.batchCount, waterPerContainerMl:waterBatchMl / operation.containerCount, alerts,
      protocol
    };
  }

  function hasApplicationOverride(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  }

  function applicationOverrideText(keys) {
    return keys.length ? keys.map(key => APPLICATION_FIELD_LABELS[key] || key).join(", ") : "nenhum; usados os padrões do equipamento";
  }

  function resolveTreatmentApplication(state,treatment) {
    const raw = treatment.application && typeof treatment.application === "object" ? treatment.application : {};
    const equipment = EQUIPMENT_LABELS[raw.equipment] ? raw.equipment : (EQUIPMENT_LABELS[state.equipment] ? state.equipment : "drone");
    const inheritedPrep = equipment === "lab" ? {
      ...state.prep, basis:"treatment", technicalSurplusPct:0, deadVolumeMl:0, primingVolumeMl:0, minimumOperatingMl:0, containerCount:1
    } : state.prep;
    const numberValue = (key,fallback) => hasApplicationOverride(raw[key]) ? parseNumber(raw[key]) : fallback;
    const basis = raw.basis === "plot" || raw.basis === "treatment" ? raw.basis : inheritedPrep.basis;
    const prep = {
      ...inheritedPrep,
      targetRate:numberValue("targetRate",inheritedPrep.targetRate),
      basis,
      technicalSurplusPct:numberValue("technicalSurplusPct",inheritedPrep.technicalSurplusPct),
      deadVolumeMl:numberValue("deadVolumeMl",inheritedPrep.deadVolumeMl),
      primingVolumeMl:numberValue("primingVolumeMl",inheritedPrep.primingVolumeMl),
      minimumOperatingMl:numberValue("minimumOperatingMl",inheritedPrep.minimumOperatingMl),
      containerCount:hasApplicationOverride(raw.containerCount) ? positiveInt(raw.containerCount,1,6) : inheritedPrep.containerCount,
      containerCapacityMl:numberValue("containerCapacityMl",inheritedPrep.containerCapacityMl)
    };
    const baseHerdada = state.targetBase || { base:"area", unit:"vaso", count:1, per:1, volumePerTargetMl:0, preparations:1 };
    const targetBase = {
      ...baseHerdada,
      base: raw.dosingBase === "area" || raw.dosingBase === "target" ? raw.dosingBase : baseHerdada.base,
      unit: hasApplicationOverride(raw.targetUnit) ? raw.targetUnit : baseHerdada.unit,
      count: numberValue("targetCount", baseHerdada.count),
      per: numberValue("targetPer", baseHerdada.per),
      volumePerTargetMl: numberValue("volumePerTargetMl", baseHerdada.volumePerTargetMl),
      preparations: hasApplicationOverride(raw.targetPreparations) ? positiveInt(raw.targetPreparations,1,9999) : baseHerdada.preparations,
    };
    const lab = {...state.lab,
      finalVolumeMl:numberValue("labFinalVolumeMl",state.lab.finalVolumeMl),
      preparationCount:hasApplicationOverride(raw.labPreparationCount) ? positiveInt(raw.labPreparationCount,1,9999) : state.lab.preparationCount,
      targetCount:hasApplicationOverride(raw.labTargetCount) ? positiveInt(raw.labTargetCount,1,999999) : state.lab.targetCount
    };
    const overrideKeys = ["targetRate","basis","technicalSurplusPct","deadVolumeMl","primingVolumeMl","minimumOperatingMl","containerCount","containerCapacityMl","labFinalVolumeMl","labPreparationCount","labTargetCount","dosingBase","targetUnit","targetCount","targetPer","volumePerTargetMl","targetPreparations"];
    // Só entra na memória auditável como "substituído" o parâmetro que este
    // equipamento realmente consome — registrar um no-op envenena a auditoria.
    const porAlvo = ["dosingBase","targetUnit","targetCount","targetPer","volumePerTargetMl","targetPreparations"];
    const ignored = equipment === "lab"
      ? ["basis", ...porAlvo]
      : targetBase.base === "target"
        ? ["basis","targetRate","labFinalVolumeMl","labPreparationCount","labTargetCount"]
        : ["labFinalVolumeMl","labPreparationCount","labTargetCount", ...porAlvo];
    return { equipment, prep, lab, targetBase, raw:clone(raw),
      // Um perfil não confirmado é dado, não decoração: o motor trava a receita
      // do tratamento até alguém dizer que conferiu.
      profileConfirmed: raw.profileConfirmed !== false,
      profileSource: cleanName(raw.profileSource, "padrões gerais conferidos"),
      overrideKeys:overrideKeys.filter(key => hasApplicationOverride(raw[key]) && !ignored.includes(key)) };
  }

  function calculateLabOperation(state) {
    const errors = [], alerts = [];
    const targetRate = state.prep.targetRate;
    const lab = calculateLabCalibration(state.lab,targetRate);
    const targetCount = positiveInt(state.lab.targetCount,1,999999);
    const shots = Math.ceil(targetCount / lab.targetsPerShot);
    const plotAreaM2 = lab.areaPerTargetM2;
    const plotAreaHa = plotAreaM2 / 10000;
    const treatmentAreaM2 = plotAreaM2 * targetCount;
    const treatmentAreaHa = treatmentAreaM2 / 10000;
    const usefulBatchMl = Math.max(0,state.lab.finalVolumeMl);
    const technicalBatchMl = usefulBatchMl * Math.max(0,state.prep.technicalSurplusPct) / 100;
    const deadVolumeMl = Math.max(0,state.prep.deadVolumeMl);
    const primingVolumeMl = Math.max(0,state.prep.primingVolumeMl);
    const theoreticalBatchMl = usefulBatchMl + technicalBatchMl + deadVolumeMl + primingVolumeMl;
    const finalBatchMl = Math.max(theoreticalBatchMl,Math.max(0,state.prep.minimumOperatingMl));
    const batchCount = positiveInt(state.lab.preparationCount,1,9999);
    const totalPreparedMl = finalBatchMl * batchCount;
    const appliedTotalMl = lab.targetPerTargetUl * targetCount / 1000;
    const consumedTotalMl = state.lab.chargeMl > 0 ? state.lab.chargeMl * shots : appliedTotalMl;
    const residualTotalMl = totalPreparedMl - consumedTotalMl;
    const minOperatingAdditionMl = Math.max(0,finalBatchMl - theoreticalBatchMl);
    const containerCount = state.prep.containerCount;
    const perContainerMl = finalBatchMl / containerCount;
    const equipment = equipmentOperation(state);
    const operation = {
      plotAreaM2,plotAreaHa,treatmentAreaM2,treatmentAreaHa,targetRate,basisIsPlot:false,batchAreaHa:targetRate > 0 ? usefulBatchMl/(targetRate*1000) : 0,batchCount,
      usefulBatchMl,technicalBatchMl,deadVolumeMl,primingVolumeMl,theoreticalBatchMl,minOperatingAdditionMl,finalBatchMl,totalPreparedMl,
      appliedTotalMl,consumedTotalMl,residualTotalMl,containerCount,containerCapacityMl:state.prep.containerCapacityMl,perContainerMl,
      routeLength:0,crossWidth:0,passesPerPlot:shots,exactFitWidth:0,totalPasses:shots,timePerPassSec:0,totalTimeSec:0,routedAreaM2:treatmentAreaM2,routeMismatchPct:0,routeVolumeMl:appliedTotalMl,
      equipment,lab:{...lab,targetCount,shots},state,errors,alerts
    };
    prepClampAlerts(state.prep).forEach(alert => alerts.push(alert));
    if (!(state.lab.pressurePsi > 0)) errors.push("Informe a pressão operacional da Torre de Potter.");
    else if (Math.abs(state.lab.pressurePsi - 13) > .05) alerts.push({kind:"warning",text:`A pressão foi alterada para ${formatNumber(state.lab.pressurePsi,2)} psi; a calibração conhecida foi informada como 13 psi.`});
    if (!(lab.areaPerTargetCm2 > 0)) errors.push("Informe dimensões ou área positiva para o pote/alvo.");
    if (!(targetRate > 0)) errors.push("Informe o volume de aplicação equivalente em L/ha.");
    if (!(state.lab.finalVolumeMl > 0)) errors.push("Informe um volume final de bancada maior que zero.");
    if (perContainerMl > state.prep.containerCapacityMl + .005 && state.prep.containerCapacityMl > 0) alerts.push({kind:"error",text:`Cada recipiente receberia ${formatMl(perContainerMl)}, acima da capacidade de ${formatMl(state.prep.containerCapacityMl)}.`});
    if (!(state.lab.chargeMl > 0)) alerts.push({kind:"info",text:"Volume carregado por aplicação não informado. Os µL no pote são calculados pela equivalência geométrica; o consumo e o saldo ainda não representam a carga real da torre."});
    else alerts.push({kind:"info",text:`Consumo estimado da torre = ${formatNumber(state.lab.chargeMl,3)} mL × ${shots} aplicação(ões) = ${formatMl(consumedTotalMl)}.`});
    if (!lab.calibration.valid) alerts.push({kind:"warning",text:`Calibração de deposição incompleta a ${formatNumber(state.lab.pressurePsi,2)} psi: ${lab.calibration.completed} de 3 leituras preenchidas.`});
    else if (!(lab.meanCollectedUl > 0)) alerts.push({kind:"error",text:"As três leituras de deposição são zero: nada chegou à área-alvo. Verifique pressão, bico da torre e posicionamento do coletor antes de usar esta calibração."});
    const cvLimit = state.prep.cvLimitPct > 0 ? state.prep.cvLimitPct : 10;
    const rateTolerance = state.prep.rateTolerancePct > 0 ? state.prep.rateTolerancePct : 5;
    if (lab.calibration.valid && lab.calibration.cv !== null) {
      if (lab.calibration.cv <= cvLimit) alerts.push({kind:"ok",text:`CV da deposição = ${formatNumber(lab.calibration.cv,1)}% (limite informado: ${formatNumber(cvLimit,1)}%).`});
      else alerts.push({kind:"error",text:`CV da deposição = ${formatNumber(lab.calibration.cv,1)}%, acima do limite de ${formatNumber(cvLimit,1)}%.`});
    }
    if (lab.deviationPct !== null) {
      const abs = Math.abs(lab.deviationPct);
      if (abs <= rateTolerance) alerts.push({kind:"ok",text:`Deposição calibrada a ${formatNumber(lab.actualRate,2)} L/ha equivalente, desvio de ${formatNumber(lab.deviationPct,1)}%.`});
      else if (abs <= rateTolerance*2) alerts.push({kind:"warning",text:`Deposição calibrada desviou ${formatNumber(lab.deviationPct,1)}% da meta equivalente.`});
      else alerts.push({kind:"error",text:`Deposição calibrada desviou ${formatNumber(lab.deviationPct,1)}% da meta equivalente; não liberar sem recalibração.`});
    }
    if (lab.estimatedChargeMl !== null) alerts.push({kind:"info",text:`Estimativa linear de carga para a meta: ${formatNumber(lab.estimatedChargeMl,4)} mL/aplicação. Confirmar por nova coleta; pressão e resposta podem não ser lineares.`});
    if (minOperatingAdditionMl > .005) alerts.push({kind:"warning",text:`O mínimo operacional acrescentou ${formatMl(minOperatingAdditionMl)} ao preparo laboratorial.`});
    return operation;
  }

  /**
   * Preparo quando a dose é escrita por unidade-alvo. A conta é a mesma da base
   * por área com outro denominador: onde ali entra "hectares pulverizados", aqui
   * entra "quantas porções de dose", e a calda útil é a calda por porção vezes
   * esse número. Tudo o que vem depois — extras, mínimo operacional, recipientes,
   * água q.s.p. — não muda, porque só depende do volume final.
   */
  function calculateTargetOperation(state) {
    const errors = [], alerts = [];
    const base = state.targetBase || {};
    const alvo = targetUnitOf(state);
    const contagem = Math.max(0, parseNumber(base.count));
    const por = Math.max(0, parseNumber(base.per)) || alvo.por;
    const volumePerTargetMl = Math.max(0, parseNumber(base.volumePerTargetMl));
    const targetFactor = por > 0 ? contagem / por : 0;
    const batchCount = positiveInt(base.preparations, 1, 9999);

    if (!(contagem > 0)) errors.push(`Informe quantos ${alvo.plural} o tratamento cobre.`);
    if (!(volumePerTargetMl > 0)) errors.push(`Informe a calda por ${por > 1 ? `${formatSmart(por,3)} ${alvo.plural}` : alvo.singular}.`);
    if (!(por > 0)) errors.push("O denominador da dose precisa ser maior que zero.");

    const usefulBatchMl = volumePerTargetMl * targetFactor / batchCount;
    const technicalBatchMl = usefulBatchMl * Math.max(0, state.prep.technicalSurplusPct) / 100;
    const deadVolumeMl = Math.max(0, state.prep.deadVolumeMl);
    const primingVolumeMl = Math.max(0, state.prep.primingVolumeMl);
    const theoreticalBatchMl = usefulBatchMl + technicalBatchMl + deadVolumeMl + primingVolumeMl;
    const finalBatchMl = Math.max(theoreticalBatchMl, Math.max(0, state.prep.minimumOperatingMl));
    const totalPreparedMl = finalBatchMl * batchCount;
    const appliedTotalMl = volumePerTargetMl * targetFactor;
    const residualTotalMl = totalPreparedMl - appliedTotalMl;
    const minOperatingAdditionMl = Math.max(0, finalBatchMl - theoreticalBatchMl);
    const containerCount = state.prep.containerCount;
    const perContainerMl = finalBatchMl / containerCount;
    const equipment = equipmentOperation(state);

    const rotuloPorcao = por > 1 ? `${formatSmart(por, 3)} ${alvo.plural}` : alvo.singular;
    const operation = {
      plotAreaM2:0, plotAreaHa:0, treatmentAreaM2:0, treatmentAreaHa:0,
      targetRate:state.prep.targetRate, basisIsPlot:false, batchAreaHa:0, batchCount,
      usefulBatchMl, technicalBatchMl, deadVolumeMl, primingVolumeMl, theoreticalBatchMl,
      minOperatingAdditionMl, finalBatchMl, totalPreparedMl, appliedTotalMl, residualTotalMl,
      containerCount, containerCapacityMl:state.prep.containerCapacityMl, perContainerMl,
      routeLength:0, crossWidth:0, passesPerPlot:0, exactFitWidth:0, totalPasses:0,
      timePerPassSec:0, totalTimeSec:0, routedAreaM2:0, routeMismatchPct:0, routeVolumeMl:appliedTotalMl,
      equipment, state, errors, alerts,
      isTargetBase:true, targetFactor, targetCount:contagem, targetPer:por,
      volumePerTargetMl, targetLabel:rotuloPorcao, targetUnitName:alvo,
    };

    prepClampAlerts(state.prep).forEach(alerta => alerts.push(alerta));
    if (perContainerMl > state.prep.containerCapacityMl + .005 && state.prep.containerCapacityMl > 0) {
      alerts.push({ kind:"error", text:`Cada recipiente receberia ${formatMl(perContainerMl)}, acima da capacidade de ${formatMl(state.prep.containerCapacityMl)}. Aumente o número de recipientes ou a capacidade.` });
    } else if (state.prep.containerCapacityMl > 0) {
      alerts.push({ kind:"ok", text:`Divisão compatível: ${formatMl(perContainerMl)} por recipiente de ${formatMl(state.prep.containerCapacityMl)}.` });
    }
    if (minOperatingAdditionMl > .005) alerts.push({ kind:"warning", text:`O mínimo operacional acrescentou ${formatMl(minOperatingAdditionMl)} a cada preparação. Esse volume também recebe produto para manter a concentração.` });
    if (usefulBatchMl > 0 && finalBatchMl / usefulBatchMl >= 3) alerts.push({ kind:"warning", text:`Cada preparação tem ${formatNumber(finalBatchMl / usefulBatchMl,1)}× o volume útil: ${formatMl(usefulBatchMl)} de calda aplicada dentro de ${formatMl(finalBatchMl)} preparados.` });
    if (contagem > 0 && por > 1 && contagem % por > 1e-9) {
      alerts.push({ kind:"info", text:`${formatSmart(contagem,3)} ${alvo.plural} não é múltiplo de ${formatSmart(por,3)}: o fator ficou ${formatSmart(targetFactor,4)}. A conta é proporcional, sem arredondamento.` });
    }
    alerts.push({ kind:"info", text:`Base por unidade-alvo: ${formatSmart(contagem,3)} ${alvo.plural} ÷ ${formatSmart(por,3)} = ${formatSmart(targetFactor,4)} porção(ões) de dose. Área da parcela e passadas não entram nesta base.` });
    if (!errors.length && !alerts.some(alerta => alerta.kind === "error") && !alerts.some(alerta => alerta.kind === "warning")) {
      alerts.push({ kind:"ok", text:"Nenhuma inconsistência automática encontrada nos dados informados." });
    }
    return operation;
  }

  function calculateSingleOperation(state) {
    if (state.equipment === "lab") return calculateLabOperation(state);
    if (state.targetBase?.base === "target") return calculateTargetOperation(state);
    const errors = [], alerts = [];
    const width = state.area.width, length = state.area.length, units = state.area.sprayedUnits;
    const plotAreaM2 = width * length;
    const plotAreaHa = plotAreaM2 / 10000;
    const treatmentAreaM2 = plotAreaM2 * units;
    const treatmentAreaHa = treatmentAreaM2 / 10000;
    const targetRate = state.prep.targetRate;
    if (!(width > 0) || !(length > 0)) errors.push("Informe dimensões positivas para a parcela.");
    if (!(targetRate > 0)) errors.push("Informe uma taxa-alvo maior que zero.");
    const basisIsPlot = state.prep.basis === "plot";
    const batchAreaHa = basisIsPlot ? plotAreaHa : treatmentAreaHa;
    const batchCount = basisIsPlot ? units : 1;
    const usefulBatchMl = targetRate * batchAreaHa * 1000;
    const technicalBatchMl = usefulBatchMl * Math.max(0,state.prep.technicalSurplusPct) / 100;
    const deadVolumeMl = Math.max(0,state.prep.deadVolumeMl);
    const primingVolumeMl = Math.max(0,state.prep.primingVolumeMl);
    const theoreticalBatchMl = usefulBatchMl + technicalBatchMl + deadVolumeMl + primingVolumeMl;
    const finalBatchMl = Math.max(theoreticalBatchMl,Math.max(0,state.prep.minimumOperatingMl));
    const totalPreparedMl = finalBatchMl * batchCount;
    const appliedTotalMl = targetRate * treatmentAreaHa * 1000;
    const residualTotalMl = totalPreparedMl - appliedTotalMl;
    const minOperatingAdditionMl = Math.max(0,finalBatchMl - theoreticalBatchMl);
    const containerCount = state.prep.containerCount;
    const perContainerMl = finalBatchMl / containerCount;
    const equipment = equipmentOperation(state);
    const routeLength = state.area.routeDirection === "width" ? width : length;
    const crossWidth = state.area.routeDirection === "width" ? length : width;
    const passesPerPlot = equipment.width > 0 ? Math.max(1,Math.ceil(crossWidth / equipment.width - 1e-10)) : 0;
    const exactFitWidth = passesPerPlot > 0 ? crossWidth / passesPerPlot : 0;
    const totalPasses = passesPerPlot * units;
    const timePerPassSec = equipment.speed > 0 ? routeLength / (equipment.speed / 3.6) : 0;
    const totalTimeSec = timePerPassSec * totalPasses;
    const routedAreaM2 = routeLength * equipment.width * totalPasses;
    const routeMismatchPct = treatmentAreaM2 > 0 ? (routedAreaM2 - treatmentAreaM2) / treatmentAreaM2 * 100 : 0;
    const routeVolumeMl = routedAreaM2 / 10000 * targetRate * 1000;
    const operation = {
      plotAreaM2, plotAreaHa, treatmentAreaM2, treatmentAreaHa, targetRate, basisIsPlot, batchAreaHa, batchCount,
      usefulBatchMl, technicalBatchMl, deadVolumeMl, primingVolumeMl, theoreticalBatchMl, minOperatingAdditionMl, finalBatchMl,
      totalPreparedMl, appliedTotalMl, residualTotalMl, containerCount, containerCapacityMl:state.prep.containerCapacityMl, perContainerMl,
      routeLength, crossWidth, passesPerPlot, exactFitWidth, totalPasses, timePerPassSec, totalTimeSec, routedAreaM2, routeMismatchPct, routeVolumeMl,
      equipment, state, errors, alerts,
      isTargetBase:false, targetFactor:0, volumePerTargetMl:0, targetLabel:""
    };

    prepClampAlerts(state.prep).forEach(alert => alerts.push(alert));
    if (!(equipment.width > 0)) errors.push("Informe uma largura de trabalho maior que zero.");
    if (!(equipment.speed > 0)) errors.push("Informe uma velocidade maior que zero.");
    if (perContainerMl > state.prep.containerCapacityMl + .005 && state.prep.containerCapacityMl > 0) alerts.push({ kind:"error", text:`Cada recipiente receberia ${formatMl(perContainerMl)}, acima da capacidade de ${formatMl(state.prep.containerCapacityMl)}. Aumente o número de recipientes ou a capacidade.` });
    else if (state.prep.containerCapacityMl > 0) alerts.push({ kind:"ok", text:`Divisão compatível: ${formatMl(perContainerMl)} por recipiente de ${formatMl(state.prep.containerCapacityMl)}.` });
    if (minOperatingAdditionMl > .005) alerts.push({ kind:"warning", text:`O mínimo operacional acrescentou ${formatMl(minOperatingAdditionMl)} a cada preparação. Esse volume também recebe produto para manter a concentração.` });
    if (usefulBatchMl > 0 && finalBatchMl / usefulBatchMl >= 3) alerts.push({ kind:"warning", text:`Cada preparação tem ${formatNumber(finalBatchMl / usefulBatchMl,1)}× o volume útil: ${formatMl(usefulBatchMl)} de calda aplicada dentro de ${formatMl(finalBatchMl)} preparados.` });
    if (batchCount > 1 && (deadVolumeMl + primingVolumeMl > 0)) alerts.push({ kind:"warning", text:`Como o preparo está “por parcela”, volume morto e escorva entram ${batchCount} vezes. Use “por tratamento” se o mesmo lote alimentar todas as parcelas sem novo preparo.` });
    if (Math.abs(routeMismatchPct) > 5) alerts.push({ kind:"warning", text:`O retângulo das passadas difere da área geométrica em ${formatNumber(routeMismatchPct,1)}%. Confira sobreposição, recorte de borda e largura efetiva.` });
    if (timePerPassSec > 0 && timePerPassSec < 5) alerts.push({ kind:"warning", text:`Cada passada dura somente ${formatNumber(timePerPassSec,1)} s. Partida, estabilização e fechamento podem representar parte importante da aplicação.` });

    const cal = equipment.calibration;
    if (state.equipment !== "drone") {
      if (cal.negativeCount > 0) alerts.push({ kind:"error", text:`${cal.negativeCount} leitura(s) de coleta com valor negativo. Corrija os valores: leituras negativas não entram no cálculo e bloqueiam a calibração.` });
      if (cal.zeroNozzles.length) alerts.push({ kind:"error", text:`Bico(s) ${cal.zeroNozzles.join(", ")} com coleta de 0 mL — sem vazão. Verifique entupimento, filtro e registro. O zero entra na média, na vazão total e no CV; não é leitura faltando.` });
      if (!cal.valid) alerts.push({ kind:"warning", text:`Calibração incompleta: ${cal.completed} de ${cal.requiredInputs} leituras preenchidas. A vazão medida e a taxa real ainda não podem ser confirmadas.` });
      else if (!(cal.totalFlow > 0)) alerts.push({ kind:"error", text:"Todas as leituras de coleta são zero: não há vazão medida. Verifique pressão, bomba e registro antes de aplicar." });
    }
    const cvLimit = state.prep.cvLimitPct > 0 ? state.prep.cvLimitPct : 10;
    const rateTolerance = state.prep.rateTolerancePct > 0 ? state.prep.rateTolerancePct : 5;
    if (cal.valid && cal.cv !== null) {
      if (cal.cv <= cvLimit) alerts.push({ kind:"ok", text:`CV de ${formatNumber(cal.cv,1)}% nas coletas (limite informado: ${formatNumber(cvLimit,1)}%).` });
      else alerts.push({ kind:"error", text:`CV de ${formatNumber(cal.cv,1)}% nas coletas, acima do limite informado de ${formatNumber(cvLimit,1)}%. Revise bicos, pressão e coleta.` });
    }
    if (equipment.deviationPct !== null) {
      const abs = Math.abs(equipment.deviationPct);
      if (abs <= rateTolerance) alerts.push({ kind:"ok", text:`Taxa calculada a partir da vazão está a ${formatNumber(equipment.deviationPct,1)}% da meta (tolerância: ±${formatNumber(rateTolerance,1)}%).` });
      else if (abs <= rateTolerance * 2) alerts.push({ kind:"warning", text:`Desvio de taxa de ${formatNumber(equipment.deviationPct,1)}%, acima da tolerância de ±${formatNumber(rateTolerance,1)}%. Avalie ajuste de velocidade ou vazão.` });
      else alerts.push({ kind:"error", text:`Desvio de taxa de ${formatNumber(equipment.deviationPct,1)}%, acima do dobro da tolerância informada. Não liberar sem recalibração.` });
    }

    if (state.equipment === "drone") {
      const d = state.drone;
      if (d.minFlow > 0 && equipment.requiredFlow < d.minFlow - 1e-6) alerts.push({ kind:"error", text:`A vazão requerida (${formatNumber(equipment.requiredFlow,3)} L/min) fica abaixo da mínima informada (${formatNumber(d.minFlow,3)} L/min). O controle pode impedir esta combinação.` });
      if (d.maxFlow > 0 && equipment.requiredFlow > d.maxFlow + 1e-6) alerts.push({ kind:"error", text:`A vazão requerida (${formatNumber(equipment.requiredFlow,3)} L/min) excede a máxima informada (${formatNumber(d.maxFlow,3)} L/min).` });
      if (d.effectiveWidthMin > 0 && d.width < d.effectiveWidthMin - 1e-6) alerts.push({ kind:"warning", text:`O espaçamento de rota está abaixo da faixa efetiva mínima cadastrada (${formatNumber(d.effectiveWidthMin,2)} m). Confirme a finalidade desse limite.` });
      if (d.effectiveWidthMax > 0 && d.width > d.effectiveWidthMax + 1e-6) alerts.push({ kind:"error", text:`O espaçamento de rota (${formatNumber(d.width,2)} m) supera a faixa efetiva máxima cadastrada (${formatNumber(d.effectiveWidthMax,2)} m). Não conclua que haverá deposição uniforme sem ensaio de faixa.` });
      if (!(d.observedFlow > 0)) alerts.push({ kind:"info", text:"Sem vazão observada, o programa calcula o setpoint requerido, mas não confirma a taxa real entregue." });
    }
    if (!errors.length && !alerts.some(alert => alert.kind === "error") && !alerts.some(alert => alert.kind === "warning")) alerts.push({ kind:"ok", text:"Nenhuma inconsistência automática encontrada nos dados informados." });

    return operation;
  }

  function calculateState(state) {
    const planErrors = [];
    if (!Array.isArray(state.treatments) || !state.treatments.length) planErrors.push("Adicione ao menos um tratamento.");
    const treatmentResults = (state.treatments || []).map((treatment,index) => {
      const application = resolveTreatmentApplication(state,treatment);
      const treatmentState = { ...state, equipment:application.equipment, prep:application.prep, lab:application.lab, targetBase:application.targetBase, treatments:[treatment], applicationMeta:application };
      const operation = calculateSingleOperation(treatmentState);
      return { ...calculateTreatment(treatment,operation), index, equipmentKey:application.equipment, application, operation };
    });
    return {
      state,
      errors:planErrors,
      treatmentResults,
      totalAppliedMl:treatmentResults.reduce((sum,result) => sum + result.operation.appliedTotalMl,0),
      totalConsumedMl:treatmentResults.reduce((sum,result) => sum + (Number.isFinite(result.operation.consumedTotalMl) ? result.operation.consumedTotalMl : result.operation.appliedTotalMl),0),
      totalPreparedMl:treatmentResults.reduce((sum,result) => sum + result.operation.totalPreparedMl,0),
      totalResidualMl:treatmentResults.reduce((sum,result) => sum + result.operation.residualTotalMl,0),
      equipmentKeys:[...new Set(treatmentResults.map(result => result.equipmentKey))]
    };
  }

  function formatComponentAmount(value, unit) {
    if (!Number.isFinite(value)) return "—";
    if (unit === "mL") return formatMl(value);
    if (unit === "g") return Math.abs(value) >= 1000 ? `${formatNumber(value / 1000,3)} kg` : `${formatSmart(value,4)} g`;
    if (unit === "mg") return Math.abs(value) >= 1000 ? `${formatSmart(value / 1000,4)} g` : `${formatSmart(value,4)} mg`;
    return `${formatSmart(value,4)} ${unit}`;
  }

  function operationFormulaText(op) {
    const e = op.equipment;
    if (op.state.equipment === "lab") {
      const lab = op.lab, cfg = op.state.lab;
      const geometry = cfg.targetShape === "circle"
        ? `Área circular = π × (${formatNumber(cfg.diameterCm,3)} cm ÷ 2)² = ${formatNumber(lab.areaPerTargetCm2,4)} cm²`
        : cfg.targetShape === "rectangle"
          ? `Área retangular = ${formatNumber(cfg.widthCm,3)} × ${formatNumber(cfg.lengthCm,3)} = ${formatNumber(lab.areaPerTargetCm2,4)} cm²`
          : `Área informada = ${formatNumber(lab.areaPerTargetCm2,4)} cm²`;
      const lines = [
        `Torre de Potter: pressão operacional = ${formatNumber(cfg.pressurePsi,2)} psi`,
        geometry,
        `Área de um alvo = ${formatNumber(lab.areaPerTargetCm2,4)} ÷ 10.000 = ${formatNumber(lab.areaPerTargetM2,8)} m²`,
        `Volume equivalente por alvo = L/ha × área(m²) × 100`,
        `                            = ${formatNumber(op.targetRate,3)} × ${formatNumber(lab.areaPerTargetM2,8)} × 100 = ${formatNumber(lab.targetPerTargetUl,4)} µL`,
        `Alvos por aplicação = ${lab.targetsPerShot}; volume equivalente no conjunto = ${formatNumber(lab.targetPerTargetUl,4)} × ${lab.targetsPerShot} = ${formatNumber(lab.targetPerShotUl,4)} µL`,
        `Alvos do tratamento = ${lab.targetCount}; aplicações na torre = teto(${lab.targetCount} ÷ ${lab.targetsPerShot}) = ${lab.shots}`
      ];
      if (lab.readings.length) lines.push(`Leituras recuperadas/depositadas = ${lab.readings.map(value => formatNumber(value,3)).join("; ")} µL`);
      if (lab.meanCollectedUl > 0) lines.push(
        `Média depositada = ${formatNumber(lab.meanCollectedUl,4)} µL/aplicação`,
        `Volume equivalente calibrado = ${formatNumber(lab.meanCollectedUl,4)} ÷ (${formatNumber(lab.totalAreaPerShotM2,8)} × 100) = ${formatNumber(lab.actualRate,3)} L/ha`
      );
      if (cfg.chargeMl > 0) lines.push(`Carga informada = ${formatNumber(cfg.chargeMl,4)} mL/aplicação`);
      if (lab.recoveryPct !== null) lines.push(`Fração recuperada na área-alvo = ${formatNumber(lab.meanCollectedUl,4)} ÷ (${formatNumber(cfg.chargeMl,4)} × 1.000) × 100 = ${formatNumber(lab.recoveryPct,3)}%`);
      if (lab.estimatedChargeMl !== null) lines.push(`Carga estimada para a meta = ${formatNumber(cfg.chargeMl,4)} × ${formatNumber(lab.targetPerShotUl,4)} ÷ ${formatNumber(lab.meanCollectedUl,4)} = ${formatNumber(lab.estimatedChargeMl,4)} mL/aplicação (estimativa linear; recalibrar)`);
      return lines.join("\n");
    }
    if (op.isTargetBase) {
      const alvo = op.targetUnitName;
      const linhas = [
        `Base por unidade-alvo: ${formatSmart(op.targetCount,4)} ${alvo.plural}`,
        `Dose e calda escritas por ${op.targetLabel}`,
        `Fator = ${formatSmart(op.targetCount,4)} ÷ ${formatSmart(op.targetPer,4)} = ${formatSmart(op.targetFactor,6)}`,
        `Calda por ${op.targetLabel} = ${formatNumber(op.volumePerTargetMl,3)} mL`,
        `Calda total nos alvos = ${formatNumber(op.volumePerTargetMl,3)} × ${formatSmart(op.targetFactor,6)} = ${formatNumber(op.appliedTotalMl,3)} mL`,
        "Área, largura de faixa e passadas não se aplicam a esta base."
      ];
      if (e.calibration && e.calibration.totalFlow > 0) {
        linhas.push(`Vazão medida do equipamento = ${formatNumber(e.calibration.totalFlow,4)} L/min (registrada; não converte em taxa por área nesta base)`);
      }
      return linhas.join("\n");
    }
    const lines = [
      `Largura de trabalho = ${formatNumber(e.width,3)} m`,
      `Velocidade = ${formatNumber(e.speed,3)} km/h`,
      `Vazão requerida = taxa × velocidade × largura ÷ 600`,
      `                 = ${formatNumber(op.targetRate,3)} × ${formatNumber(e.speed,3)} × ${formatNumber(e.width,3)} ÷ 600`,
      `                 = ${formatNumber(e.requiredFlow,4)} L/min`,
      `Passadas/parcela = teto(${formatNumber(op.crossWidth,3)} ÷ ${formatNumber(e.width,3)}) = ${op.passesPerPlot}`,
      `Largura para encaixe exato = ${formatNumber(op.crossWidth,3)} ÷ ${op.passesPerPlot || 1} = ${formatNumber(op.exactFitWidth,3)} m`,
      `Tempo/passada = ${formatNumber(op.routeLength,3)} ÷ (${formatNumber(e.speed,3)} ÷ 3,6) = ${formatNumber(op.timePerPassSec,2)} s`,
      `Tempo total = ${formatNumber(op.timePerPassSec,2)} × ${op.totalPasses} = ${formatNumber(op.totalTimeSec,2)} s`,
      `Área retangular pelas passadas = ${formatNumber(op.routeLength,3)} × ${formatNumber(e.width,3)} × ${op.totalPasses} = ${formatNumber(op.routedAreaM2,3)} m²`,
      `Diferença para a área geométrica = ${formatNumber(op.routeMismatchPct,2)}%`
    ];
    if (e.measuredFlow > 0) {
      lines.push(
        `Taxa medida = 600 × vazão medida ÷ (velocidade × largura)`,
        `            = 600 × ${formatNumber(e.measuredFlow,4)} ÷ (${formatNumber(e.speed,3)} × ${formatNumber(e.width,3)})`,
        `            = ${formatNumber(e.actualRate,3)} L/ha`,
        `Velocidade para a meta = 600 × ${formatNumber(e.measuredFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(e.width,3)}) = ${formatNumber(e.idealSpeed,3)} km/h`
      );
    }
    if (op.state.equipment === "drone") {
      const d = op.state.drone;
      if (d.minFlow > 0) lines.push(`Largura hidráulica na vazão mínima = 600 × ${formatNumber(d.minFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(e.speed,3)}) = ${formatNumber(600*d.minFlow/(op.targetRate*e.speed),3)} m`);
      if (d.maxFlow > 0) lines.push(`Largura hidráulica na vazão máxima = 600 × ${formatNumber(d.maxFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(e.speed,3)}) = ${formatNumber(600*d.maxFlow/(op.targetRate*e.speed),3)} m`);
    }
    return lines.join("\n");
  }

  function prepFormulaText(op) {
    if (op.state.equipment === "lab") return [
      `Volume final de bancada informado = ${formatNumber(op.usefulBatchMl,3)} mL por preparação`,
      `Preparações laboratoriais = ${op.batchCount}`,
      `Sobra técnica = ${formatNumber(op.usefulBatchMl,3)} × ${formatNumber(op.state.prep.technicalSurplusPct,3)}% = ${formatNumber(op.technicalBatchMl,3)} mL`,
      `Volume teórico = bancada + sobra + morto + escorva`,
      `                = ${formatNumber(op.usefulBatchMl,3)} + ${formatNumber(op.technicalBatchMl,3)} + ${formatNumber(op.deadVolumeMl,3)} + ${formatNumber(op.primingVolumeMl,3)} = ${formatNumber(op.theoreticalBatchMl,3)} mL`,
      `Volume final = máximo(${formatNumber(op.theoreticalBatchMl,3)}; mínimo operacional ${formatNumber(op.state.prep.minimumOperatingMl,3)}) = ${formatNumber(op.finalBatchMl,3)} mL`,
      `Total preparado = ${formatNumber(op.finalBatchMl,3)} × ${op.batchCount} = ${formatNumber(op.totalPreparedMl,3)} mL`,
      `Volume teórico que atinge os alvos = ${formatNumber(op.lab.targetPerTargetUl,4)} µL × ${op.lab.targetCount} ÷ 1.000 = ${formatNumber(op.appliedTotalMl,4)} mL`,
      op.state.lab.chargeMl > 0
        ? `Calda consumida pela torre = ${formatNumber(op.state.lab.chargeMl,4)} mL × ${op.lab.shots} = ${formatNumber(op.consumedTotalMl,4)} mL`
        : `Calda consumida provisória = volume teórico nos alvos = ${formatNumber(op.consumedTotalMl,4)} mL (carga não informada)`,
      `Saldo esperado no preparo = ${formatNumber(op.totalPreparedMl,3)} − ${formatNumber(op.consumedTotalMl,3)} = ${formatNumber(op.residualTotalMl,3)} mL`,
      `Por recipiente = ${formatNumber(op.finalBatchMl,3)} ÷ ${op.containerCount} = ${formatNumber(op.perContainerMl,3)} mL`
    ].join("\n");
    if (op.isTargetBase) {
      const alvo = op.targetUnitName;
      return [
        `Base de dosagem: por unidade-alvo (${alvo.plural})`,
        `Unidades-alvo do tratamento = ${formatSmart(op.targetCount,4)} ${alvo.plural}`,
        `Dose e calda escritas por = ${op.targetLabel}`,
        `Fator de dose = ${formatSmart(op.targetCount,4)} ÷ ${formatSmart(op.targetPer,4)} = ${formatSmart(op.targetFactor,6)} porção(ões)`,
        `Calda que atinge os alvos = ${formatNumber(op.volumePerTargetMl,3)} mL por ${op.targetLabel} × ${formatSmart(op.targetFactor,6)} = ${formatNumber(op.appliedTotalMl,3)} mL`,
        `Preparações = ${op.batchCount}`,
        `Calda útil/preparação = ${formatNumber(op.appliedTotalMl,3)} ÷ ${op.batchCount} = ${formatNumber(op.usefulBatchMl,3)} mL`,
        `Sobra técnica = ${formatNumber(op.usefulBatchMl,3)} × ${formatNumber(op.state.prep.technicalSurplusPct,3)}% = ${formatNumber(op.technicalBatchMl,3)} mL`,
        `Volume teórico = útil + sobra + morto + escorva`,
        `                = ${formatNumber(op.usefulBatchMl,3)} + ${formatNumber(op.technicalBatchMl,3)} + ${formatNumber(op.deadVolumeMl,3)} + ${formatNumber(op.primingVolumeMl,3)}`,
        `                = ${formatNumber(op.theoreticalBatchMl,3)} mL`,
        `Volume final = máximo(${formatNumber(op.theoreticalBatchMl,3)}; mínimo operacional ${formatNumber(op.state.prep.minimumOperatingMl,3)}) = ${formatNumber(op.finalBatchMl,3)} mL`,
        `Total preparado/tratamento = ${formatNumber(op.finalBatchMl,3)} × ${op.batchCount} = ${formatNumber(op.totalPreparedMl,3)} mL`,
        `Saldo esperado = ${formatNumber(op.totalPreparedMl,3)} − ${formatNumber(op.appliedTotalMl,3)} = ${formatNumber(op.residualTotalMl,3)} mL`,
        `Por recipiente = ${formatNumber(op.finalBatchMl,3)} ÷ ${op.containerCount} = ${formatNumber(op.perContainerMl,3)} mL`,
        "Nesta base não há área de parcela nem passadas: a dose é escrita contra o alvo, não contra o hectare."
      ].join("\n");
    }
    return [
      `Área da parcela = ${formatNumber(op.state.area.width,3)} × ${formatNumber(op.state.area.length,3)} = ${formatNumber(op.plotAreaM2,3)} m²`,
      `Área da parcela em ha = ${formatNumber(op.plotAreaM2,3)} ÷ 10.000 = ${formatNumber(op.plotAreaHa,6)} ha`,
      `Área do tratamento = ${formatNumber(op.plotAreaM2,3)} × ${op.state.area.sprayedUnits} = ${formatNumber(op.treatmentAreaM2,3)} m² = ${formatNumber(op.treatmentAreaHa,6)} ha`,
      `Base = ${op.basisIsPlot ? "uma parcela pulverizada" : "tratamento inteiro"}; preparações = ${op.batchCount}`,
      `Calda útil/preparação = ${formatNumber(op.targetRate,3)} L/ha × ${formatNumber(op.batchAreaHa,6)} ha × 1.000 = ${formatNumber(op.usefulBatchMl,3)} mL`,
      `Sobra técnica = ${formatNumber(op.usefulBatchMl,3)} × ${formatNumber(op.state.prep.technicalSurplusPct,3)}% = ${formatNumber(op.technicalBatchMl,3)} mL`,
      `Volume teórico = útil + sobra + morto + escorva`,
      `                = ${formatNumber(op.usefulBatchMl,3)} + ${formatNumber(op.technicalBatchMl,3)} + ${formatNumber(op.deadVolumeMl,3)} + ${formatNumber(op.primingVolumeMl,3)}`,
      `                = ${formatNumber(op.theoreticalBatchMl,3)} mL`,
      `Volume final = máximo(${formatNumber(op.theoreticalBatchMl,3)}; mínimo operacional ${formatNumber(op.state.prep.minimumOperatingMl,3)}) = ${formatNumber(op.finalBatchMl,3)} mL`,
      `Total preparado/tratamento = ${formatNumber(op.finalBatchMl,3)} × ${op.batchCount} = ${formatNumber(op.totalPreparedMl,3)} mL`,
      `Calda que deve atingir as parcelas = ${formatNumber(op.targetRate,3)} × ${formatNumber(op.treatmentAreaHa,6)} × 1.000 = ${formatNumber(op.appliedTotalMl,3)} mL`,
      `Saldo esperado = ${formatNumber(op.totalPreparedMl,3)} − ${formatNumber(op.appliedTotalMl,3)} = ${formatNumber(op.residualTotalMl,3)} mL`,
      `Por recipiente = ${formatNumber(op.finalBatchMl,3)} ÷ ${op.containerCount} = ${formatNumber(op.perContainerMl,3)} mL`
    ].join("\n");
  }

  function labHelpersText(lab) {
    const helper = calculateLabHelpers(lab);
    const lines = [];
    if (helper.directValid) lines.push(
      "DILUIÇÃO DIRETA — C1V1 = C2V2",
      `V1 = C2 × V2 ÷ C1 = ${formatSmart(lab.c2,6)} × ${formatSmart(lab.v2Ml,6)} ÷ ${formatSmart(lab.c1,6)} = ${formatNumber(helper.v1Ml,4)} mL de estoque`,
      `Diluente = V2 − V1 = ${formatNumber(lab.v2Ml,4)} − ${formatNumber(helper.v1Ml,4)} = ${formatNumber(helper.diluentMl,4)} mL`
    );
    if (helper.serialValid) {
      if (lines.length) lines.push("");
      lines.push(
        "DILUIÇÃO SERIADA",
        `Fator = 1:${formatSmart(lab.serialFactor,6)}; volume por dose = ${formatNumber(lab.serialVolumeMl,4)} mL`,
        `Transferir da solução anterior = ${formatNumber(lab.serialVolumeMl,4)} ÷ ${formatSmart(lab.serialFactor,6)} = ${formatNumber(helper.transferMl,4)} mL`,
        `Diluente por etapa = ${formatNumber(lab.serialVolumeMl,4)} − ${formatNumber(helper.transferMl,4)} = ${formatNumber(helper.serialDiluentMl,4)} mL`,
        ...helper.rows.map(row => `D${row.dose}: ${formatSmart(row.concentration,6)} ${cleanName(lab.serialUnit,"unidade")} · ${row.dose === 1 ? "preparar como estoque" : `transferir ${formatNumber(row.transferMl,4)} mL + ${formatNumber(row.diluentMl,4)} mL de diluente`}`)
      );
    }
    return lines.join("\n");
  }

  function calibrationAuditLines(op) {
    const state = op.state, e = op.equipment, lines = [];
    if (state.equipment === "lab") {
      const lab = op.lab, cfg = state.lab;
      lines.push(
        `Equipamento: Torre de Potter; pressão operacional = ${formatNumber(cfg.pressurePsi,2)} psi`,
        `Formato do alvo = ${cfg.targetShape === "circle" ? `circular; diâmetro ${formatNumber(cfg.diameterCm,3)} cm` : cfg.targetShape === "rectangle" ? `retangular; ${formatNumber(cfg.widthCm,3)} × ${formatNumber(cfg.lengthCm,3)} cm` : "área informada manualmente"}`,
        `Área por alvo = ${formatNumber(lab.areaPerTargetCm2,4)} cm² = ${formatNumber(lab.areaPerTargetM2,8)} m²`,
        `Alvos por aplicação = ${lab.targetsPerShot}; alvos no tratamento = ${lab.targetCount}; aplicações = ${lab.shots}`,
        `Volume equivalente no alvo = ${formatNumber(op.targetRate,3)} × ${formatNumber(lab.areaPerTargetM2,8)} × 100 = ${formatNumber(lab.targetPerTargetUl,4)} µL/alvo`,
        `Volume carregado informado = ${cfg.chargeMl > 0 ? formatNumber(cfg.chargeMl,4)+" mL/aplicação" : "não informado"}`
      );
      if (!lab.calibration.valid) lines.push(`Calibração incompleta: ${lab.calibration.completed}/3 leituras preenchidas de deposição na área-alvo.`);
      if (lab.readings.length) lines.push(`Leituras de deposição = ${lab.readings.map(value => formatNumber(value,3)).join("; ")} µL; média = ${formatNumber(lab.meanCollectedUl,4)} µL`);
      if (lab.actualRate !== null) lines.push(`Volume equivalente calibrado = ${formatNumber(lab.meanCollectedUl,4)} ÷ (${formatNumber(lab.totalAreaPerShotM2,8)} × 100) = ${formatNumber(lab.actualRate,3)} L/ha`);
      if (lab.recoveryPct !== null) lines.push(`Fração recuperada na área-alvo = ${formatNumber(lab.recoveryPct,3)}% da carga informada.`);
      if (lab.estimatedChargeMl !== null) lines.push(`Carga estimada linearmente para a meta = ${formatNumber(lab.estimatedChargeMl,4)} mL/aplicação; exige nova coleta de confirmação.`);
      if (lab.calibration.cv !== null) lines.push(`CV amostral da deposição = ${formatNumber(lab.calibration.cv,2)}%.`);
      lines.push("Nota: µL equivalentes no pote não são o mesmo que mL carregados na torre; perdas fora da área-alvo permanecem separadas.");
      return lines;
    }
    if (op.isTargetBase) {
      lines.push(`Base de dosagem: por unidade-alvo (${op.targetUnitName.plural}); a calibração do equipamento é registrada mas não vira taxa por área.`);
    }
    if (state.equipment === "drone") {
      const d = state.drone;
      lines.push(
        `Modelo/configuração: ${cleanName(d.model,"não informado")}`,
        `Origem dos limites: ${cleanName(d.profileSource,"não informada")}`,
        `Velocidade: ${formatNumber(d.speed,3)} km/h; gota: ${formatNumber(d.droplet,1)} µm; altura: ${formatNumber(d.height,2)} m`,
        `Espaçamento entre rotas: ${formatNumber(d.width,3)} m`,
        `Vazão requerida = ${formatNumber(op.targetRate,3)} × ${formatNumber(d.speed,3)} × ${formatNumber(d.width,3)} ÷ 600 = ${formatNumber(e.requiredFlow,4)} L/min`,
        `Vazão observada: ${d.observedFlow > 0 ? formatNumber(d.observedFlow,4)+" L/min" : "não informada"}`
      );
      if (d.observedFlow > 0) lines.push(`Taxa pela vazão observada = 600 × ${formatNumber(d.observedFlow,4)} ÷ (${formatNumber(d.speed,3)} × ${formatNumber(d.width,3)}) = ${formatNumber(e.actualRate,3)} L/ha`);
      if (d.minFlow > 0) lines.push(`Largura hidráulica inferida na vazão mínima = 600 × ${formatNumber(d.minFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(d.speed,3)}) = ${formatNumber(600*d.minFlow/(op.targetRate*d.speed),3)} m`);
      if (d.maxFlow > 0) lines.push(`Largura hidráulica inferida na vazão máxima = 600 × ${formatNumber(d.maxFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(d.speed,3)}) = ${formatNumber(600*d.maxFlow/(op.targetRate*d.speed),3)} m`);
      if (d.tankCapacity > 0 && op.targetRate > 0) {
        const areaTankHa = d.tankCapacity / op.targetRate;
        const plotsTank = op.plotAreaHa > 0 ? Math.floor(areaTankHa / op.plotAreaHa) : 0;
        lines.push(`Área teórica por tanque nominal = ${formatNumber(d.tankCapacity,3)} ÷ ${formatNumber(op.targetRate,3)} = ${formatNumber(areaTankHa,4)} ha`, `Parcelas geométricas inteiras por tanque nominal = piso(${formatNumber(areaTankHa,4)} ÷ ${formatNumber(op.plotAreaHa,6)}) = ${plotsTank}`);
      }
      lines.push("Nota: a relação hidráulica não reproduz o algoritmo proprietário DJI e não comprova faixa efetiva/deposição.");
      return lines;
    }
    const cfg = state[state.equipment];
    const cal = e.calibration;
    lines.push(`Método: ${state.equipment === "atomizer" ? "três coletas da vazão total" : cfg.method === "individual" ? "bico a bico, três leituras por bico" : "barra inteira, três leituras totais"}`);
    lines.push(`Tempo de coleta: ${formatNumber(cfg.sampleSeconds,2)} s`);
    if (state.equipment !== "atomizer") lines.push(`Bicos: ${cfg.nozzles}; espaçamento: ${formatNumber(cfg.spacing,3)} m; largura usada: ${formatNumber(e.width,3)} m`);
    else lines.push(`Faixa efetiva informada: ${formatNumber(cfg.width,3)} m; saídas informativas: ${cfg.outletCount}`);
    if (!cal.valid) lines.push(`Calibração incompleta: ${cal.completed}/${cal.requiredInputs} leituras preenchidas.`);
    if (cal.zeroNozzles && cal.zeroNozzles.length) lines.push(`Bico(s) sem vazão (coleta 0 mL): ${cal.zeroNozzles.join(", ")}. O zero foi mantido na média e no CV.`);
    if (cal.negativeCount) lines.push(`${cal.negativeCount} leitura(s) negativa(s) descartada(s); calibração bloqueada até correção.`);
    if (cfg.method === "individual") {
      cal.means.forEach((value,index) => lines.push(`Bico ${index+1}: média = ${value === null || value === undefined ? "sem leitura" : formatNumber(value,2)+" mL"}${Number.isFinite(value) ? `; vazão = ${formatNumber(value*60/(cfg.sampleSeconds*1000),4)} L/min${value === 0 ? " — BICO SEM VAZÃO" : ""}` : ""}`));
    } else if (cal.repeatMeans.length) lines.push(`Leituras totais válidas: ${cal.repeatMeans.map(value => formatNumber(value,2)).join("; ")} mL`);
    if (cal.totalFlow > 0) {
      lines.push(`Vazão total medida = média coletada × 60 ÷ tempo ÷ 1.000 = ${formatNumber(cal.totalFlow,4)} L/min`);
      if (state.equipment !== "atomizer") lines.push(`Vazão média por bico = ${formatNumber(cal.totalFlow,4)} ÷ ${cfg.nozzles} = ${formatNumber(cal.perNozzleFlow,4)} L/min`);
      lines.push(`Taxa real = 600 × ${formatNumber(cal.totalFlow,4)} ÷ (${formatNumber(e.speed,3)} × ${formatNumber(e.width,3)}) = ${formatNumber(e.actualRate,3)} L/ha`);
      lines.push(`Desvio = (${formatNumber(e.actualRate,3)} − ${formatNumber(op.targetRate,3)}) ÷ ${formatNumber(op.targetRate,3)} × 100 = ${formatNumber(e.deviationPct,2)}%`);
      lines.push(`Velocidade para a meta = 600 × ${formatNumber(cal.totalFlow,4)} ÷ (${formatNumber(op.targetRate,3)} × ${formatNumber(e.width,3)}) = ${formatNumber(e.idealSpeed,3)} km/h`);
    }
    if (cal.cv !== null) lines.push(`CV amostral = desvio-padrão amostral ÷ média × 100 = ${formatNumber(cal.cv,2)}%`);
    if (e.requiredCollectionTotalMl !== null) lines.push(`Coleta total necessária para a meta = ${formatNumber(e.requiredFlow,4)} × 1.000 × ${formatNumber(cfg.sampleSeconds,2)} ÷ 60 = ${formatNumber(e.requiredCollectionTotalMl,2)} mL`);
    if (e.requiredCollectionPerNozzleMl !== null) lines.push(`Coleta necessária por bico = ${formatNumber(e.requiredCollectionTotalMl,2)} ÷ ${cfg.nozzles} = ${formatNumber(e.requiredCollectionPerNozzleMl,2)} mL`);
    return lines;
  }

  function treatmentAuditLines(result,index,op) {
    const lines = ["", `T${index+1} — ${result.name}`];
    const protocol = result.protocol;
    if (protocol) {
      lines.push(`Protocolo T${protocol.number}${protocol.activeIngredient ? ` · i.a.: ${protocol.activeIngredient}` : ""}${protocol.isControl ? " · testemunha" : ""}`);
      if (protocol.concentration > 0) lines.push(`  Concentração declarada = ${formatSmart(protocol.concentration,6)} ${protocol.concentrationUnit}`);
      if (protocol.dose > 0) lines.push(`  Dose declarada = ${formatSmart(protocol.dose,6)} ${protocol.doseUnit}`);
      if (protocol.iaPerHa > 0) lines.push(`  g i.a./ha declarado = ${formatSmart(protocol.iaPerHa,6)}`);
      if (protocol.check) lines.push(`  Conferência: dose × concentração ÷ 1.000 = ${formatSmart(protocol.check.expected,6)} g i.a./ha → ${protocol.check.ok ? `confere (desvio ${formatNumber(protocol.check.deviationPct,2)}%)` : `NÃO CONFERE (desvio ${formatNumber(protocol.check.deviationPct,2)}%)`}`);
      if (protocol.applications > 1) lines.push(`  Aplicações previstas = ${protocol.applications}${protocol.intervalDays > 0 ? ` a cada ${protocol.intervalDays} dias` : ""} (o preparo abaixo é de uma)`);
      if (protocol.adjuvant) lines.push(`  Adjuvante no protocolo = ${protocol.adjuvant}`);
    }
    lines.push(`Volume final de uma preparação: ${formatNumber(op.finalBatchMl,3)} mL; preparações: ${op.batchCount}; recipientes/preparação: ${op.containerCount}`);
    result.components.forEach(component => {
      lines.push(`- ${component.name}: ${formatSmart(component.dose,6)} ${component.type}`);
      lines.push(`  Concentração/equivalência: ${component.concentration}`);
      lines.push(`  Por preparação = ${component.formula} = ${formatComponentAmount(component.batchAmount,component.baseUnit)}`);
      lines.push(`  Total preparado no tratamento = ${formatComponentAmount(component.batchAmount,component.baseUnit)} × ${op.batchCount} = ${formatComponentAmount(component.totalPreparedAmount,component.baseUnit)}`);
      lines.push(`  ${op.state.equipment === "lab" ? "Previsto depositado em todos os alvos" : "Previsto sobre a área"} = ${formatComponentAmount(component.appliedAmount,component.baseUnit)}`);
      if (op.state.equipment === "lab" && component.perTargetAmount !== null) lines.push(`  Previsto por pote/alvo = ${formatComponentAmount(component.perTargetAmount,component.baseUnit)}`);
      if (op.state.equipment === "lab") lines.push(`  Consumido na carga das aplicações = ${formatComponentAmount(component.consumedAmount,component.baseUnit)}`);
      lines.push(`  Saldo correspondente no preparo = ${formatComponentAmount(component.totalPreparedAmount,component.baseUnit)} − ${formatComponentAmount(component.consumedAmount,component.baseUnit)} = ${formatComponentAmount(component.residualAmount,component.baseUnit)}`);
      lines.push(`  Por recipiente = ${formatComponentAmount(component.batchAmount,component.baseUnit)} ÷ ${op.containerCount} = ${formatComponentAmount(component.perContainerAmount,component.baseUnit)}`);
    });
    lines.push(`- Líquidos por preparação = ${formatNumber(result.liquidBatchMl,3)} mL`);
    lines.push(`- Água q.s.p. por preparação = ${formatNumber(op.finalBatchMl,3)} − ${formatNumber(result.liquidBatchMl,3)} = ${formatNumber(result.waterBatchMl,3)} mL`);
    lines.push(`- Água por recipiente = ${formatNumber(result.waterBatchMl,3)} ÷ ${op.containerCount} = ${formatNumber(result.waterPerContainerMl,3)} mL`);
    if (result.alerts.length) result.alerts.forEach(alert => lines.push(`  [${alert.kind.toUpperCase()}] ${alert.text}`));
    return lines;
  }

  function collectPlanAlerts(plan) {
    const alerts = plan.errors.map(text => ({kind:"error",text}));
    plan.treatmentResults.forEach((result,index) => {
      const prefix = `T${index+1} — ${result.name}: `;
      result.operation.errors.forEach(text => alerts.push({kind:"error",text:prefix+text}));
      result.operation.alerts.forEach(alert => alerts.push({...alert,text:prefix+alert.text}));
      result.alerts.forEach(alert => alerts.push({...alert,text:prefix+alert.text}));
    });
    return alerts;
  }

  /**
   * Rastro da importação: de onde o plano veio, quando, com que regras e com que
   * avisos. Sem isto a memória descreve o plano sem dizer que ele foi lido de um
   * texto colado — e a regra das repetições, que multiplica a calda, ficaria
   * sem registro.
   */
  function protocolImportAuditLines(state) {
    const meta = state.protocolImport;
    if (!meta || !meta.applied) return [];
    const REGRAS = { sprayed:"parcelas pulverizadas separadamente", subplots:"subparcelas internas; uma aplicação por tratamento", keep:"área atual preservada" };
    const DOSE = { auto:"deduzida da formulação; pendente quando ambígua", ml:"imposta como mL/ha", g:"imposta como g/ha" };
    let quando = cleanName(meta.importedAt,"não registrado");
    try { if (meta.importedAt) quando = new Date(meta.importedAt).toLocaleString("pt-BR"); } catch (_) {}
    const lines = [
      "0.1 IMPORTAÇÃO DO PROTOCOLO",
      `Origem: ${cleanName(meta.source,"trecho copiado do protocolo")}`,
      `Importado em: ${quando}`,
      `Campos de folha de rosto reconhecidos: ${meta.studyFields ?? 0}; tratamentos: ${meta.treatmentCount ?? 0}`,
      `Equipamento aplicado: ${EQUIPMENT_LABELS[meta.equipment] || "não identificado"}${meta.equipmentFromProtocol ? ` (lido de "${cleanName(meta.rawEquipment,"—")}")` : " (escolhido na importação)"}`,
      `Regra das repetições: ${REGRAS[meta.repetitionRule] || meta.repetitionRule}`,
      `Dose sem unidade: ${DOSE[meta.doseFallback] || meta.doseFallback}`,
    ];
    if (meta.changes?.length) {
      lines.push("Alterações aplicadas ao plano:");
      meta.changes.forEach(item => lines.push(`  - ${item}`));
    }
    if (meta.warnings?.length) {
      lines.push("Avisos gerados na leitura do protocolo:");
      meta.warnings.forEach(item => lines.push(`  - ${item}`));
    }
    lines.push("");
    return lines;
  }

  /** Bloco da folha de rosto do protocolo, quando houver algo preenchido. */
  function protocolAuditLines(state) {
    const sheet = state.protocol && typeof state.protocol === "object" ? state.protocol : {};
    const filled = PROTOCOL_FIELDS.filter(([key]) => String(sheet[key] ?? "").trim() !== "");
    if (!filled.length) return [];
    const width = Math.max(...filled.map(([, label]) => label.length));
    return [
      "0. FOLHA DE ROSTO DO PROTOCOLO",
      ...filled.map(([key, label]) => `${label.padEnd(width, " ")} : ${String(sheet[key]).trim()}`),
      "(Transcrita do protocolo do estudo; a calculadora não valida esses campos.)",
      "",
    ];
  }

  function auditText(plan, generatedAt = new Date()) {
    const state = plan.state;
    const plotAreaM2 = state.area.width * state.area.length;
    const plotAreaHa = plotAreaM2 / 10000;
    const treatmentAreaM2 = plotAreaM2 * state.area.sprayedUnits;
    const treatmentAreaHa = treatmentAreaM2 / 10000;
    const equipmentNames = plan.equipmentKeys.map(key => EQUIPMENT_LABELS[key]);
    const hasLab = plan.equipmentKeys.includes("lab");
    const labToolText = hasLab ? labHelpersText(state.lab) : "";
    const lines = [
      "CALCULADORA UNIVERSAL DE APLICAÇÃO — MEMÓRIA AUDITÁVEL",
      `Versão do motor: ${APP_VERSION}`,
      ...(loadedEngineVersion && loadedEngineVersion !== APP_VERSION ? [`Atenção: plano carregado de um arquivo gerado pelo motor ${loadedEngineVersion}. Confira unidades e parâmetros antes de usar.`] : []),
      `Gerado em: ${generatedAt.toLocaleString("pt-BR")}`,
      "",
      ...protocolAuditLines(state),
      ...protocolImportAuditLines(state),
      "1. IDENTIFICAÇÃO",
      `Estudo/ensaio: ${cleanName(state.study.name,"não informado")}`,
      `Protocolo: ${cleanName(state.study.protocol,"não informado")}`,
      `Data prevista: ${cleanName(state.study.date,"não informada")}`,
      `Responsável: ${cleanName(state.study.operator,"não informado")}`,
      `Cultura/alvo: ${cleanName(state.study.cropTarget,"não informado")}`,
      `Observações: ${cleanName(state.study.notes,"nenhuma")}`,
      `Equipamentos previstos: ${equipmentNames.length ? equipmentNames.join("; ") : "nenhum"}`,
      "",
      "2. ÁREA E REGRA EXPERIMENTAL",
      ...(plan.treatmentResults.some(result => result.operation.isTargetBase)
        ? ["Há tratamento(s) dosados por unidade-alvo: neles a área da parcela não entra na conta; ver a seção do tratamento."]
        : []),
      `Parcela = ${formatNumber(state.area.width,3)} m × ${formatNumber(state.area.length,3)} m = ${formatNumber(plotAreaM2,3)} m² = ${formatNumber(plotAreaHa,6)} ha`,
      `Parcelas realmente pulverizadas por tratamento = ${state.area.sprayedUnits}`,
      `Subparcelas internas/avaliações = ${state.area.evaluationSubplots} (informativas; não multiplicam a área)`,
      `Área por tratamento = ${formatNumber(plotAreaM2,3)} × ${state.area.sprayedUnits} = ${formatNumber(treatmentAreaM2,3)} m² = ${formatNumber(treatmentAreaHa,6)} ha`,
      ...(hasLab ? ["Tratamentos de laboratório não usam a área da parcela; utilizam a geometria do pote/alvo registrada na Torre de Potter."] : []),
      "",
      "3. OPERAÇÃO, CALIBRAÇÃO E PREPARO POR TRATAMENTO"
    ];
    plan.treatmentResults.forEach((result,index) => {
      const op = result.operation;
      lines.push(
        "",
        `T${index+1} — ${result.name}`,
        `Equipamento = ${EQUIPMENT_LABELS[result.equipmentKey]}`,
        `${result.equipmentKey === "lab" ? "Volume de aplicação equivalente" : "Taxa-alvo"} = ${formatNumber(op.targetRate,3)} L/ha`,
        `Parâmetros próprios substituídos = ${applicationOverrideText(result.application.overrideKeys)}`,
        "Calibração/configuração:",
        ...calibrationAuditLines(op).map(line => `  ${line}`),
        result.equipmentKey === "lab" ? "Geometria, deposição e aplicações:" : "Passadas e tempo:",
        ...operationFormulaText(op).split("\n").map(line => `  ${line}`),
        "Volume e preparações:",
        ...prepFormulaText(op).split("\n").map(line => `  ${line}`)
      );
    });
    lines.push("", "4. RECEITAS POR TRATAMENTO");
    plan.treatmentResults.forEach((result,index) => {
      lines.push(...treatmentAuditLines(result,index,result.operation));
      const protocolo = result.protocol;
      if (protocolo?.equipmentSource || protocolo?.equipmentRaw) {
        lines.push(`- Método de aplicação = ${EQUIPMENT_LABELS[result.equipmentKey]} · origem: ${cleanName(protocolo.equipmentSource,"conferência manual")}${protocolo.equipmentRaw ? ` · texto lido: "${protocolo.equipmentRaw}"` : ""}`);
      }
      lines.push(`- Perfil de preparo: ${result.application.profileConfirmed ? "CONFERIDO" : "PENDENTE — NÃO LIBERAR"} · ${cleanName(result.application.profileSource,"origem não registrada")}`);
    });
    // A física da calda e o caderno de contas são calculados fora do motor
    // (mixture.js e notebook.js importam daqui; o motor não pode importar de
    // volta). Chegam prontos em plan.extras e entram na memória como o resto.
    if (plan.extras?.mistura?.length) {
      lines.push("", "4.1 FÍSICA DA CALDA — ORDEM DE MISTURA E FECHAMENTO DO VOLUME", ...plan.extras.mistura);
    }
    if (plan.extras?.caderno?.length) {
      lines.push("", "4.2 CADERNO DE CONTAS (declaradas pelo operador, com conferência dimensional)", ...plan.extras.caderno);
    }
    lines.push(
      "",
      "5. TOTAIS DO ENSAIO",
      `Tratamentos = ${plan.treatmentResults.length}`,
      `Calda útil total = ${plan.treatmentResults.map((result,index) => `T${index+1} ${formatNumber(result.operation.appliedTotalMl,3)}`).join(" + ") || "0"} = ${formatNumber(plan.totalAppliedMl,3)} mL`,
      `Calda preparada total = ${plan.treatmentResults.map((result,index) => `T${index+1} ${formatNumber(result.operation.totalPreparedMl,3)}`).join(" + ") || "0"} = ${formatNumber(plan.totalPreparedMl,3)} mL`,
      ...(hasLab ? [`Calda consumida total (inclui cargas da torre) = ${formatNumber(plan.totalConsumedMl,3)} mL`] : []),
      `Saldo total esperado = ${formatNumber(plan.totalPreparedMl,3)} − ${formatNumber(plan.totalConsumedMl,3)} = ${formatNumber(plan.totalResidualMl,3)} mL`,
      ...(hasLab ? ["", "6. DILUIÇÕES AUXILIARES DE LABORATÓRIO", labToolText || "C1V1 e série não preenchidos."] : []),
      "",
      `${hasLab ? "7" : "6"}. ALERTAS E PREMISSAS`
    );
    const allAlerts = [...collectPlanAlerts(plan), ...(plan.extras?.alertas ?? [])];
    if (allAlerts.length) allAlerts.forEach(alert => lines.push(`[${alert.kind.toUpperCase()}] ${alert.text}`));
    else lines.push("Nenhum alerta automático.");
    lines.push(
      "",
      "Premissas:",
      "- 1 ha = 10.000 m²; 1 L = 1.000 mL.",
      "- Vazão requerida Q (L/min) = taxa (L/ha) × velocidade (km/h) × largura (m) ÷ 600.",
      `- Critérios gerais informados: tolerância de taxa ±${formatNumber(state.prep.rateTolerancePct > 0 ? state.prep.rateTolerancePct : 5,1)}%; limite de CV ${formatNumber(state.prep.cvLimitPct > 0 ? state.prep.cvLimitPct : 10,1)}%.`,
      "- A água é o volume final menos componentes líquidos. Sólidos só têm volume aparente descontado quando a densidade é declarada; completar q.s.p. de qualquer forma.",
      "- Produto em volume extra é calculado na mesma concentração da calda aplicada.",
      ...(hasLab ? ["- Na Torre de Potter, L/ha × área do alvo determina os µL equivalentes depositados; o volume carregado na torre é um dado separado de calibração.", "- A estimativa de ajuste da carga pressupõe resposta linear e deve ser confirmada por nova coleta a 13 psi."] : []),
      "- Equipamento, taxa e preparo são resolvidos separadamente para cada tratamento; a calibração cadastrada do equipamento é reutilizada.",
      "- Cada tratamento é calculado como uma calda independente; reaproveitamento ou ajuste sequencial entre tratamentos não está incluído.",
      "- O saldo é uma previsão matemática; recuperação e descarte seguem procedimento aprovado.",
      "- O programa apoia o planejamento, mas não autoriza uso, dose, concentração, mistura ou condição operacional.",
      `- Motor: ${APP_VERSION} (nucleo extraido; a suite de verificacao vive em test_aplicacao_core.js).`,
      ...(plan.extras?.autotestes
        ? [`- Autotestes da física da calda e do caderno: ${plan.extras.autotestes.failed === 0 ? "aprovados" : "FALHA"} (${plan.extras.autotestes.total} verificações).`]
        : [])
    );
    return lines.join("\n");
  }

  function treatmentOnlyText(plan,index) {
    const result = plan.treatmentResults[index];
    const op = result.operation;
    return [
      `T${index+1} — ${result.name}`,
      `Equipamento: ${EQUIPMENT_LABELS[result.equipmentKey]}`,
      `${result.equipmentKey === "lab" ? "Volume de aplicação equivalente" : "Taxa"}: ${formatNumber(op.targetRate,3)} L/ha`,
      result.equipmentKey === "lab" ? `Pote/alvo: ${formatNumber(op.lab.areaPerTargetCm2,4)} cm²; ${formatNumber(op.lab.targetPerTargetUl,4)} µL equivalentes por alvo` : `Área: ${formatNumber(op.treatmentAreaM2,2)} m² (${formatNumber(op.treatmentAreaHa,6)} ha)`,
      ...treatmentAuditLines(result,index,op).slice(1)
    ].join("\n");
  }

  function stateFieldMap(state) {
    return {
      studyName:state.study?.name, protocolCode:state.study?.protocol, applicationDate:state.study?.date, operatorName:state.study?.operator,
      cropTarget:state.study?.cropTarget, fieldNotes:state.study?.notes, plotWidth:state.area?.width, plotLength:state.area?.length,
      sprayedUnits:state.area?.sprayedUnits, evaluationSubplots:state.area?.evaluationSubplots, routeDirection:state.area?.routeDirection,
      targetRate:state.prep?.targetRate, preparationBasis:state.prep?.basis, technicalSurplusPct:state.prep?.technicalSurplusPct,
      deadVolumeMl:state.prep?.deadVolumeMl, primingVolumeMl:state.prep?.primingVolumeMl, minimumOperatingMl:state.prep?.minimumOperatingMl,
      containerCount:state.prep?.containerCount, containerCapacityMl:state.prep?.containerCapacityMl,
      rateTolerancePct:state.prep?.rateTolerancePct, cvLimitPct:state.prep?.cvLimitPct,
      tractorNozzles:state.tractor?.nozzles, tractorSpacing:state.tractor?.spacing, tractorManualWidth:state.tractor?.manualWidth,
      tractorSpeed:state.tractor?.speed, tractorSampleSeconds:state.tractor?.sampleSeconds, tractorMethod:state.tractor?.method,
      co2Nozzles:state.co2?.nozzles, co2Spacing:state.co2?.spacing, co2ManualWidth:state.co2?.manualWidth,
      co2Speed:state.co2?.speed, co2SampleSeconds:state.co2?.sampleSeconds, co2Method:state.co2?.method,
      atomizerWidth:state.atomizer?.width, atomizerSpeed:state.atomizer?.speed, atomizerSampleSeconds:state.atomizer?.sampleSeconds,
      atomizerOutletCount:state.atomizer?.outletCount,
      droneModel:state.drone?.model, droneProfileSource:state.drone?.profileSource, droneSpeed:state.drone?.speed, droneWidth:state.drone?.width,
      droneDroplet:state.drone?.droplet, droneHeight:state.drone?.height, droneObservedFlow:state.drone?.observedFlow,
      droneMinFlow:state.drone?.minFlow, droneMaxFlow:state.drone?.maxFlow, droneTankCapacity:state.drone?.tankCapacity,
      droneEffectiveWidthMin:state.drone?.effectiveWidthMin, droneEffectiveWidthMax:state.drone?.effectiveWidthMax,
      labPressurePsi:state.lab?.pressurePsi, labTargetShape:state.lab?.targetShape, labDiameterCm:state.lab?.diameterCm,
      labWidthCm:state.lab?.widthCm, labLengthCm:state.lab?.lengthCm, labManualAreaCm2:state.lab?.manualAreaCm2,
      labTargetsPerShot:state.lab?.targetsPerShot, labTargetCount:state.lab?.targetCount, labFinalVolumeMl:state.lab?.finalVolumeMl,
      labPreparationCount:state.lab?.preparationCount, labChargeMl:state.lab?.chargeMl,
      labCollectedUl1:state.lab?.collectedUl?.[0], labCollectedUl2:state.lab?.collectedUl?.[1], labCollectedUl3:state.lab?.collectedUl?.[2],
      labC1:state.lab?.c1, labC2:state.lab?.c2, labV2Ml:state.lab?.v2Ml, labSerialStart:state.lab?.serialStart,
      labSerialFactor:state.lab?.serialFactor, labSerialCount:state.lab?.serialCount, labSerialVolumeMl:state.lab?.serialVolumeMl,
      labSerialUnit:state.lab?.serialUnit,
      dosingBase:state.targetBase?.base, targetUnit:state.targetBase?.unit,
      targetCount:state.targetBase?.count, targetPer:state.targetBase?.per,
      volumePerTargetMl:state.targetBase?.volumePerTargetMl, targetPreparations:state.targetBase?.preparations,
      ...Object.fromEntries(PROTOCOL_FIELDS.map(([key]) => [`protocol_${key}`, state.protocol?.[key]]))
    };
  }

  function normalizeTreatmentState(treatment,index,fallbackEquipment) {
    const source = treatment && typeof treatment === "object" ? treatment : {};
    const rawApplication = source.application && typeof source.application === "object" ? source.application : {};
    const equipment = EQUIPMENT_LABELS[rawApplication.equipment] ? rawApplication.equipment : (EQUIPMENT_LABELS[fallbackEquipment] ? fallbackEquipment : "drone");
    return {
      id:source.id || `t${Date.now()}-${index}`,
      name:source.name ?? `Tratamento ${index+1}`,
      application:{...cloneApplication(equipment),...rawApplication,equipment},
      components:Array.isArray(source.components) ? source.components.map(component => ({
        name:component?.name ?? "",type:component?.type ?? "",dose:component?.dose ?? "",
        formulationConcentration:component?.formulationConcentration ?? "", formulationUnit:FORMULATION_UNIT_OPTIONS.some(([value]) => value === component?.formulationUnit) ? component.formulationUnit : "g/L",
        formulationClass:component?.formulationClass ?? "", density:component?.density ?? ""
      })) : [],
      protocol:source.protocol && typeof source.protocol === "object" ? clone(source.protocol) : null
    };
  }
  /* Estado canonico de partida. Vivia no ui.js do original, mas e puro e e a
     referencia de todo golden test — sem ele cada teste inventaria o seu. */
  function defaultState() {
    return {
      version:APP_VERSION, equipment:"drone",
      study:{name:"",protocol:"",date:"",operator:"",cropTarget:"",notes:""},
      protocol:Object.fromEntries(PROTOCOL_FIELDS.map(([key]) => [key,""])),
      protocolImport:null,
      area:{width:11,length:20,sprayedUnits:1,evaluationSubplots:4,routeDirection:"length"},
      targetBase:{ base:"area", unit:"vaso", count:1, per:1, volumePerTargetMl:0, preparations:1 },
      prep:{targetRate:3,basis:"plot",technicalSurplusPct:0,deadVolumeMl:300,primingVolumeMl:0,minimumOperatingMl:1700,containerCount:1,containerCapacityMl:1900,rateTolerancePct:5,cvLimitPct:10},
      tractor:{nozzles:4,spacing:.5,manualWidth:0,speed:5,sampleSeconds:30,method:"individual",calibration:{individual:[],whole:["","",""]}},
      co2:{nozzles:4,spacing:.5,manualWidth:0,speed:4.5,sampleSeconds:30,method:"individual",calibration:{individual:[],whole:["","",""]}},
      atomizer:{width:3,speed:4,sampleSeconds:30,outletCount:1,calibration:{whole:["","",""]}},
      drone:{model:"DJI AGRAS T25P",profileSource:"Valores informados ou observados no controle; confirmar na calibração local",speed:20.2,width:11,droplet:320,height:3,observedFlow:0,minFlow:1.111,maxFlow:16,tankCapacity:20,effectiveWidthMin:0,effectiveWidthMax:0},
      lab:{pressurePsi:13,targetShape:"circle",diameterCm:7.1,widthCm:9,lengthCm:9,manualAreaCm2:0,targetsPerShot:1,targetCount:1,finalVolumeMl:100,preparationCount:1,chargeMl:0,collectedUl:["","",""],c1:0,c2:0,v2Ml:0,serialStart:0,serialFactor:2,serialCount:5,serialVolumeMl:10,serialUnit:"ppm"},
      treatments:clone(DEFAULT_TREATMENTS),
      // O caderno de contas mora no estado como qualquer outro dado do ensaio:
      // salva, carrega, entra na memória auditável e no relatório.
      notebook:[]
    };
  }

  return {
    /* identidade do motor — vai gravada na memoria de calculo */
    VERSION:APP_VERSION,

    /* catalogos */
    EQUIPMENT_LABELS:EQUIPMENT_LABELS,
    EMPTY_APPLICATION:EMPTY_APPLICATION,
    APPLICATION_FIELD_LABELS:APPLICATION_FIELD_LABELS,
    PROTOCOL_FIELDS:PROTOCOL_FIELDS,
    DOSING_BASES:DOSING_BASES,
    TARGET_UNITS:TARGET_UNITS,
    TARGET_UNIT_OPTIONS:TARGET_UNIT_OPTIONS,
    UNIT_OPTIONS:UNIT_OPTIONS,
    FORMULATION_UNIT_OPTIONS:FORMULATION_UNIT_OPTIONS,
    BROTH_UNIT_IDS:BROTH_UNIT_IDS,
    DEFAULT_TREATMENTS:DEFAULT_TREATMENTS,

    /* calculo */
    defaultState:defaultState,
    calculateState:calculateState,
    calculateTreatment:calculateTreatment,
    calculateComponent:calculateComponent,
    calculateCalibration:calculateCalibration,
    calculateWholeMachine:calculateWholeMachine,
    calculateLabCalibration:calculateLabCalibration,
    calculateLabHelpers:calculateLabHelpers,
    equipmentOperation:equipmentOperation,

    /* metodo por tratamento (roadmap 7.2) */
    resolveTreatmentApplication:resolveTreatmentApplication,
    hasApplicationOverride:hasApplicationOverride,
    applicationOverrideText:applicationOverrideText,
    normalizeTreatmentState:normalizeTreatmentState,
    cloneApplication:cloneApplication,

    /* memoria auditavel */
    auditText:auditText,
    treatmentOnlyText:treatmentOnlyText,
    calibrationAuditLines:calibrationAuditLines,
    treatmentAuditLines:treatmentAuditLines,
    operationFormulaText:operationFormulaText,
    prepFormulaText:prepFormulaText,
    labHelpersText:labHelpersText,
    collectPlanAlerts:collectPlanAlerts,
    stateFieldMap:stateFieldMap,

    /* utilitarios de numero e texto, para a interface nao reimplementar */
    parseNumber:parseNumber,
    parseReading:parseReading,
    numberToInput:numberToInput,
    formatNumber:formatNumber,
    formatSmart:formatSmart,
    formatMl:formatMl,
    formatTime:formatTime,
    round:round,
    sampleCv:sampleCv,
    mean:mean,
    targetUnitOf:targetUnitOf,
    unitLabelFor:unitLabelFor,
    unitsForBase:unitsForBase
  };
});
