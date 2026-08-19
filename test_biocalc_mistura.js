/* =========================================================================
 * test_biocalc_mistura.js — mistura, % v/v e veículo (óleo) no núcleo de campo
 *
 *   node test_biocalc_mistura.js
 *
 * Mesmo princípio dos outros: nada é conferido contra a própria implementação.
 * Os alvos vêm de três fontes independentes —
 *   (a) o núcleo ANTIGO (calculateTreatment), para garantir que produto único
 *       continua dando exatamente o mesmo número de antes;
 *   (b) contas feitas à mão a partir do protocolo do ensaio de Dalbulus
 *       (calda 3 L/ha), as mesmas que foram para a bancada em Falcon;
 *   (c) propriedades que precisam valer sempre: conservação de volume
 *       (líquidos + veículo = calda) e proporcionalidade.
 * ========================================================================= */
"use strict";
const C = require("./vendor/biocalc-campo-core.js");

let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}
const perto = (a, b, tol) => Math.abs(a - b) <= (tol === undefined ? 1e-6 : tol);
function quase(nome, obtido, esperado, tol) {
  certo(nome, perto(obtido, esperado, tol), "obtido " + obtido + ", esperado " + esperado);
}

/* Geometria escolhida para a calda total dar exatamente 1000 mL: assim cada
   "total" lido no resultado É o mL por litro de calda — a coluna que foi para
   a bancada. 3 L/ha × 0,333333 ha = 1,0 L. */
const UM_LITRO = { sprayVolume: 3, plotLength: 333.3333333333, plotWidth: 10,
                   numPlots: 1, numBottles: 1, deadVolumeMl: 0, bottleCapacity: 0 };
const achar = (r, nome) => r.components.find(c => c.nome === nome);

/* ---------------------------------------------------------- leitura da dose */
S("Leitura da dose — o que quebrava antes");
{
  certo('"0,20%" é porcentagem, não 0,2 L/ha',
    C.parseDose("0,20%").unidade === "%" && C.parseDose("0,20%").valor === 0.2);
  certo('"1,5 L" é L/ha', C.parseDose("1,5 L").unidade === "L/ha" && C.parseDose("1,5 L").valor === 1.5);
  certo('"500 mL/ha" é mL/ha', C.parseDose("500 mL/ha").unidade === "mL/ha");
  certo('"1.500 g/ha" respeita o milhar PT-BR', C.parseDose("1.500 g/ha").valor === 1500);
  certo('"200" sem unidade cai no padrão do estudo',
    C.parseDose("200", "g/ha").unidade === "g/ha");

  /* o pecado antigo, registrado: parseNum engolia a mistura inteira */
  certo("parseNum sozinho ainda enxerga só o 1º número (por isso a mistura precisa de parser)",
    C.parseNum("1,5 L + 0,033%") === 1.5);
}

S("Mistura — casar produtos com doses");
{
  const m = C.parseComponents("Sankari + Silwet", "1,5 L + 0,033%");
  certo("dois componentes", m.components.length === 2);
  certo("nomes na ordem", m.components[0].nome === "Sankari" && m.components[1].nome === "Silwet");
  certo("bases distintas", m.components[0].unidade === "L/ha" && m.components[1].unidade === "%");
  certo("sem problemas a relatar", m.problems.length === 0);

  const ruim = C.parseComponents("A + B + C", "1 L + 2 L");
  certo("contagem desigual é DENUNCIADA, não adivinhada", ruim.problems.length > 0,
    JSON.stringify(ruim.problems));
}

/* ------------------------------------------------- compatibilidade com o antigo */
S("Produto único: número idêntico ao núcleo antigo");
{
  const base = { doseHa: 1.5, doseUnit: "L/ha", sprayVolume: 200, plotLength: 5, plotWidth: 10,
                 numPlots: 4, numBottles: 2, deadVolumeMl: 300, bottleCapacity: 20 };
  const velho = C.calculateTreatment(base);
  const novo = C.calculateMixture({
    components: [{ nome: "X", valor: 1.5, unidade: "L/ha" }],
    sprayVolume: 200, plotLength: 5, plotWidth: 10,
    numPlots: 4, numBottles: 2, deadVolumeMl: 300, bottleCapacity: 20 });
  const c = achar(novo, "X");
  quase("produto/parcela igual", c.perPlot, velho.productPerPlot, 1e-6);
  quase("produto total igual", c.total, velho.productTotal, 1e-6);
  quase("produto/frasco igual", c.perBottle, velho.productPerBottle, 1e-6);
  quase("concentração igual", c.concentration, velho.concentration, 1e-6);
  quase("calda total igual", novo.sprayTotalMl, velho.sprayTotalMl, 1e-6);
  quase("água = calda − produto (era waterPerBottleMl)",
    novo.carrier.perBottle, velho.waterPerBottleMl, 1e-6);
  certo("frascos: mesmo veredito", novo.bottleCapacityOk === velho.bottleCapacityOk &&
    novo.minBottles === velho.minBottles);
}

/* ------------------------------------------- protocolo real, conta feita à mão */
S("Protocolo Dalbulus (calda 3 L/ha) — alvos calculados à mão");
{
  /* T4: Sankari 1,5 L/ha + Silwet 0,033% v/v, veículo água.
     À mão: Sankari 1,5/3,0 = 50% da calda = 500 mL/L.
            Silwet 0,033% de 1000 mL = 0,33 mL/L.
            Água = 1000 − 500 − 0,33 = 499,67 mL/L. */
  const t4 = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Sankari + Silwet", "1,5 L + 0,033%").components,
    carrier: "Água" }));
  quase("T4 Sankari = 500 mL/L", achar(t4, "Sankari").total, 500, 1e-4);
  quase("T4 Silwet = 0,33 mL/L", achar(t4, "Silwet").total, 0.33, 1e-4);
  quase("T4 água = 499,67 mL/L", t4.carrier.total, 499.67, 1e-3);
  certo("T4 veículo se chama Água", t4.carrier.nome === "Água");

  /* T5: mesmo, Silwet a 0,2% -> 2,0 mL/L, água 498. */
  const t5 = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Sankari + Silwet", "1,5 L + 0,2%").components,
    carrier: "Água" }));
  quase("T5 Silwet = 2,0 mL/L", achar(t5, "Silwet").total, 2, 1e-4);
  quase("T5 água = 498 mL/L", t5.carrier.total, 498, 1e-3);

  /* T10: Assist 0,25% -> 2,5 mL/L, água 497,5. */
  const t10 = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Sankari + Assist", "1,5 L + 0,25%").components,
    carrier: "Água" }));
  quase("T10 Assist = 2,5 mL/L", achar(t10, "Assist").total, 2.5, 1e-4);
  quase("T10 água = 497,5 mL/L", t10.carrier.total, 497.5, 1e-3);

  /* T11: Malathion 1 L/ha em 3 L/ha = 333,33 mL/L; o resto é ÓLEO, 666,67. */
  const t11 = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Malathion", "1 L").components,
    carrier: "Óleo de soja" }));
  quase("T11 Malathion = 333,33 mL/L", achar(t11, "Malathion").total, 333.3333, 1e-3);
  quase("T11 óleo = 666,67 mL/L", t11.carrier.total, 666.6667, 1e-3);
  certo("T11 veículo é óleo, não água", t11.carrier.nome === "Óleo de soja");

  /* T9: Sankari 1,5 L + óleo — meio a meio. */
  const t9 = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Sankari", "1,5 L").components, carrier: "Óleo de soja" }));
  quase("T9 óleo = 500 mL/L (metade)", t9.carrier.total, 500, 1e-4);
}

S("Porcentagem depende da calda; dose por área, não");
{
  const seis = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: [{ nome: "Adj", valor: 0.2, unidade: "%" }], carrier: "Água" }));
  quase("0,2% em calda 3 L/ha = 6 mL/ha", achar(seis, "Adj").perHa, 6, 1e-6);

  const dobro = C.calculateMixture(Object.assign({}, UM_LITRO, {
    sprayVolume: 6, components: [{ nome: "Adj", valor: 0.2, unidade: "%" }], carrier: "Água" }));
  quase("dobrou a calda, dobrou o adjuvante (12 mL/ha)", achar(dobro, "Adj").perHa, 12, 1e-6);

  const area = C.calculateMixture(Object.assign({}, UM_LITRO, {
    sprayVolume: 6, components: [{ nome: "P", valor: 1.5, unidade: "L/ha" }], carrier: "Água" }));
  quase("dose por área NÃO muda com a calda", achar(area, "P").perHa, 1500, 1e-6);
}

S("Propriedades que precisam valer sempre");
{
  const r = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("A + B + C", "1 L + 0,5 L + 0,1%").components, carrier: "Água" }));
  const somaLiquidos = r.components.filter(c => c.liquid).reduce((s, c) => s + c.total, 0);
  quase("líquidos + veículo = calda total", somaLiquidos + r.carrier.total, r.sprayTotalMl, 1e-6);

  /* sólido (g/ha) não desloca volume: a água continua completando a calda inteira */
  const sol = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: C.parseComponents("Pó", "500 g/ha").components, carrier: "Água" }));
  quase("sólido não tira volume do veículo", sol.carrier.total, 1000, 1e-6);
  certo("sólido sai em g", achar(sol, "Pó").unit === "g");

  /* volume morto entra na calda e puxa produto junto, proporcionalmente */
  const semMorto = C.calculateMixture(Object.assign({}, UM_LITRO, {
    components: [{ nome: "P", valor: 1.5, unidade: "L/ha" }], carrier: "Água" }));
  const comMorto = C.calculateMixture(Object.assign({}, UM_LITRO, {
    deadVolumeMl: 1000, components: [{ nome: "P", valor: 1.5, unidade: "L/ha" }], carrier: "Água" }));
  quase("calda dobrou com 1 L de volume morto", comMorto.sprayTotalMl, 2000, 1e-6);
  quase("produto acompanhou proporcionalmente", comMorto.components[0].total,
    semMorto.components[0].total * 2, 1e-6);
}

S("Avisos — o que antes passava calado");
{
  /* líquidos que não cabem na calda: 2 L/ha de produto numa calda de 1 L/ha */
  const estoura = C.calculateMixture(Object.assign({}, UM_LITRO, {
    sprayVolume: 1, components: [{ nome: "P", valor: 2, unidade: "L/ha" }], carrier: "Água" }));
  certo("calda que não comporta os líquidos gera aviso", estoura.warnings.length > 0,
    JSON.stringify(estoura.warnings));
  certo("veículo não fica negativo", estoura.carrier.total === 0);

  let erro = "";
  try { C.calculateMixture(Object.assign({}, UM_LITRO, { components: [] })); }
  catch (e) { erro = e.message; }
  certo("sem componente, erro explícito", /[Nn]enhum componente/.test(erro), erro);

  erro = "";
  try {
    C.calculateMixture({ components: [{ nome: "P", valor: 1, unidade: "L/ha" }],
                         sprayVolume: 0, plotLength: 5, plotWidth: 5 });
  } catch (e) { erro = e.message; }
  certo("calda zero, erro explícito", /volume de calda/i.test(erro), erro);
}

console.log("\n" + (falhou === 0
  ? "\x1b[32m" + ok + " conferências, todas certas.\x1b[0m"
  : "\x1b[31m" + falhou + " falharam\x1b[0m de " + (ok + falhou)));
process.exit(falhou === 0 ? 0 : 1);
