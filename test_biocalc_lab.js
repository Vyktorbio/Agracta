/* =========================================================================
 * test_biocalc_lab.js — validação do núcleo de cálculo do laboratório
 *
 *   node test_biocalc_lab.js
 *
 * Mesmo princípio do test_estatistica.js: nada é conferido contra a própria
 * implementação. Cada resultado é checado por uma fórmula independente, por
 * uma propriedade que precisa valer sempre (conservação de massa, ida e
 * volta), ou pelo núcleo de CAMPO — que foi escrito antes e não conhece este.
 * ========================================================================= */
"use strict";
const Lab   = require("./vendor/biocalc-lab-core.js");
const Campo = require("./vendor/biocalc-campo-core.js");

/* ------------------------------------------------------------- harness --- */
let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}
function quase(nome, a, b, tol) {
  tol = tol === undefined ? 1e-9 : tol;
  const d = Math.abs(a - b);
  certo(nome, d <= tol, `obtido ${a}  esperado ${b}  Δ ${d.toExponential(2)} > tol ${tol}`);
}
function lanca(nome, fn) {
  let jogou = false;
  try { fn(); } catch (e) { jogou = true; }
  certo(nome, jogou, "não lançou erro");
}

/* ===================================================== parsing PT-BR === */
S("Leitura de número (o bug que motivou o porte)");
/* O parseOptNum do calda.html lia "1.500" como 1,5 — dose 1000x menor. */
quase('"1.500" é mil e quinhentos, não 1,5', Lab.parseNum("1.500"), 1500);
quase('"2.000" é dois mil',                  Lab.parseNum("2.000"), 2000);
quase('"1.500,5" mantém o decimal',          Lab.parseNum("1.500,5"), 1500.5);
quase('"0.25" é um decimal com ponto',       Lab.parseNum("0.25"), 0.25);
quase('"1,5" é um decimal com vírgula',      Lab.parseNum("1,5"), 1.5);
quase('"  340 " ignora espaços',             Lab.parseNum("  340 "), 340);
quase("vazio é zero",                        Lab.parseNum(""), 0);

/* ============================================== campo -> bancada ======= */
S("Campo → bancada");

/* Oráculo à mão: 1 L/ha a 200 L/ha = 1000 mL / 200 L = 5 mL/L.
   Em 50 mL -> 5 * 0,050 = 0,25 mL = 250 µL. */
{
  const r = Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50 });
  quase("1 L/ha @200 L/ha em 50 mL = 0,25 mL", r.produtoMl, 0.25, 1e-9);
  quase("...que são 250 µL",                   r.produtoUl, 250, 1e-6);
  quase("solvente completa os 50 mL",          r.produtoMl + r.solventeMl, 50, 1e-9);
  certo("ação é pipetar",                      r.acao === "pipetar");
}

/* Oráculo independente: o núcleo de CAMPO calcula a concentração da calda
   sem saber que este módulo existe. As duas contas têm de bater. */
{
  const casos = [
    { dose: 1,   unidade: "L/ha",  vazao: 200 },
    { dose: 500, unidade: "mL/ha", vazao: 150 },
    { dose: 2.5, unidade: "L/ha",  vazao: 100 }
  ];
  casos.forEach(c => {
    const lab = Lab.calcCampo({ ...c, volumeMl: 50 });
    const cmp = Campo.calculateTreatment({
      doseHa: c.dose, doseUnit: c.unidade, sprayVolume: c.vazao,
      plotLength: 10, plotWidth: 5, numPlots: 1, numBottles: 1
    });
    /* campo devolve mL/L; lab devolve % v/v. 1 mL/L = 0,1 % v/v. */
    quase(`concentração bate com o núcleo de campo (${c.dose} ${c.unidade} @${c.vazao})`,
      lab.concentracaoPct, cmp.concentration / 10, 1e-9);
  });
}

/* Dose sólida sem densidade: tem de mandar PESAR, não pipetar.
   200 g/ha a 100 L/ha = 200 g / 100000 mL = 0,002 g/mL -> 50 mL = 0,1 g = 100 mg */
{
  const r = Lab.calcCampo({ dose: 200, unidade: "g/ha", vazao: 100, volumeMl: 50 });
  certo("g/ha sem densidade pede PESAR", r.acao === "pesar");
  quase("massa = 100 mg", r.massaMg, 100, 1e-9);
}
/* Com densidade, o mesmo caso vira volume: 0,1 g / 1,2 g/mL = 0,08333 mL */
{
  const r = Lab.calcCampo({ dose: 200, unidade: "g/ha", vazao: 100, volumeMl: 50, densidade: "1,2" });
  certo("g/ha com densidade pede PIPETAR", r.acao === "pipetar");
  quase("volume = massa / densidade", r.produtoMl, 0.1 / 1.2, 1e-9);
}

/* % v/v não usa vazão: 2% de 50 mL = 1 mL */
{
  const r = Lab.calcCampo({ dose: 2, unidade: "% v/v", volumeMl: 50 });
  quase("2 % v/v em 50 mL = 1 mL", r.produtoMl, 1, 1e-12);
  quase("solvente = 49 mL",        r.solventeMl, 49, 1e-12);
}

/* Dose em i.a.: 100 g i.a./ha com produto de 500 g/L -> 0,2 L/ha de formulado.
   0,2 L/ha a 200 L/ha = 200 mL / 200000 mL = 0,001 -> 50 mL * 0,001 = 0,05 mL */
{
  const r = Lab.calcCampo({ dose: 100, unidade: "g/ha", vazao: 200, volumeMl: 50,
                            base: "ia", iaValor: 500, iaUnid: "g/L" });
  quase("equivalente formulado = 0,2 L/ha", r.formuladoEquiv, 0.2, 1e-12);
  quase("pipetar 0,05 mL (50 µL)",          r.produtoMl, 0.05, 1e-12);
}
lanca("dose em i.a. com unidade L/ha é recusada",
  () => Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50,
                        base: "ia", iaValor: 500, iaUnid: "g/L" }));
lanca("vazão zero é recusada",
  () => Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 0, volumeMl: 50 }));

/* Pureza reduz o teor: para o mesmo alvo, é preciso MAIS produto. */
{
  const cheio = Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50 });
  const meio  = Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50, pureza: 50 });
  quase("pureza 50% dobra o volume de produto", meio.produtoMl, cheio.produtoMl * 2, 1e-9);
}

/* ============================================================= PPM ===== */
S("Preparo por concentração (ppm)");

/* 340 g/L = 340.000 ppm. Para 100 ppm em 50 mL:
   V = C2*V2/C1 = 100 * 50 / 340000 = 0,0147059 mL */
{
  const r = Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "gL", fonteValor: 340 });
  quase("fonte 340 g/L = 340.000 ppm", r.fontePpm, 340000, 1e-6);
  quase("C1V1 = C2V2",                 r.produtoMl, (100 * 50) / 340000, 1e-9);
  quase("produto + solvente = volume final", r.produtoMl + r.solventeMl, 50, 1e-9);
}
/* Pó puro: ppm = mg/L, então 100 ppm em 50 mL = 100 * 0,05 = 5 mg */
{
  const r = Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "puro" });
  certo("pó puro manda PESAR", r.acao === "pesar");
  quase("5 mg",                r.massaMg, 5, 1e-12);
}
/* Pureza 80%: precisa de 5 / 0,8 = 6,25 mg */
{
  const r = Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "puro", pureza: 80 });
  quase("pureza 80% -> 6,25 mg", r.massaMg, 6.25, 1e-12);
}
/* g/kg depende da densidade: 500 g/kg a 1,2 g/mL = 600 g/L = 600.000 ppm */
{
  const r = Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "gkg", fonteValor: 500, densidade: "1,2" });
  quase("500 g/kg x 1,2 = 600.000 ppm", r.fontePpm, 600000, 1e-6);
}
/* Alvo acima da fonte é impossível por diluição */
{
  const r = Lab.calcPPM({ alvoPpm: 500000, volumeMl: 50, fonteTipo: "gL", fonteValor: 340 });
  certo("alvo > fonte marca impossível", r.impossivel === true);
  certo("e avisa como crítico", r.avisos.some(a => a.nivel === "critico"));
}
lanca("ppm zero é recusado", () => Lab.calcPPM({ alvoPpm: 0, volumeMl: 50, fonteTipo: "puro" }));

/* Fonte em branco tem de ERRAR, não virar 0 ppm: com fonte 0 a divisão dá
   Infinity e a receita sairia sem número nenhum, calada. */
lanca("rótulo em branco é recusado",
  () => Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "gL", fonteValor: "" }));
lanca("solução-mãe em branco é recusada",
  () => Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "mae", fonteValor: "" }));
lanca("série com rótulo em branco é recusada",
  () => Lab.calcSerie({ doses: [500, 250], volumeMl: 50, fonteTipo: "gL", fonteValor: "" }));
certo("mas reagente puro dispensa valor de fonte",
  Lab.calcPPM({ alvoPpm: 100, volumeMl: 50, fonteTipo: "puro" }).massaMg === 5);
/* Nenhum resultado pode conter número não-finito */
{
  const r = Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50 });
  const numeros = Object.keys(r).filter(k => typeof r[k] === "number");
  certo("todo número devolvido é finito", numeros.every(k => Number.isFinite(r[k])),
    numeros.filter(k => !Number.isFinite(r[k])).join(", "));
}

S("Modo inverso (ida e volta)");
/* Propriedade: se preparar X mL a P ppm consome V de mãe, então partir de V
   de mãe tem de devolver exatamente X mL de volume final. */
{
  const direto  = Lab.calcPPM({ alvoPpm: 50, volumeMl: 250, fonteTipo: "mae", fonteValor: 5000 });
  const inverso = Lab.calcPPMInverso({ alvoPpm: 50, fonteTipo: "mae", fonteValor: 5000,
                                       disponivel: direto.produtoMl });
  quase("ida e volta recupera o volume final", inverso.volumeFinalMl, 250, 1e-6);
}
lanca("inverso com alvo >= mãe é recusado",
  () => Lab.calcPPMInverso({ alvoPpm: 5000, fonteTipo: "mae", fonteValor: 5000, disponivel: 10 }));
lanca("inverso não vale para rótulo g/L",
  () => Lab.calcPPMInverso({ alvoPpm: 100, fonteTipo: "gL", fonteValor: 340, disponivel: 10 }));

/* ==================================================== ajuste de i.a. === */
S("Ajuste de i.a.");
/* 650 g/L -> 400 g/L em 1000 mL: V = 400*1000/650 = 615,3846 mL */
{
  const r = Lab.calcAjusteIA({ origemValor: 650, origemUnid: "g/L",
                               alvoValor: 400, alvoUnid: "g/L",
                               volumeFinal: 1000, volumeUnid: "mL" });
  quase("C1V1 = C2V2", r.produtoMl, (400 * 1000) / 650, 1e-9);
  quase("fator de diluição = 1,625", r.fatorDiluicao, 1.625, 1e-9);
  quase("produto + solvente = volume final", r.produtoMl + r.solventeMl, 1000, 1e-6);
}
/* Unidades diferentes têm de convergir para o mesmo ppm: 1 % = 10.000 ppm */
quase("1 % = 10.000 ppm", Lab.concToPpm(1, "%"), 10000, 1e-12);
quase("1 g/L = 1.000 ppm", Lab.concToPpm(1, "g/L"), 1000, 1e-12);
quase("1 mg/mL = 1 g/L",   Lab.concToPpm(1, "mg/mL"), Lab.concToPpm(1, "g/L"), 1e-12);
lanca("alvo maior que a origem é recusado",
  () => Lab.calcAjusteIA({ origemValor: 100, origemUnid: "g/L", alvoValor: 200,
                           alvoUnid: "g/L", volumeFinal: 1000, volumeUnid: "mL" }));
lanca("g/kg sem densidade é recusado",
  () => Lab.calcAjusteIA({ origemValor: 500, origemUnid: "g/kg", alvoValor: 100,
                           alvoUnid: "g/L", volumeFinal: 1000, volumeUnid: "mL" }));

/* ============================================================ série ==== */
S("Série de doses");
{
  const doses = Lab.gerarSerieAuto(500, 2, 5);
  certo("série geométrica com 5 níveis", doses.length === 5);
  quase("topo = 500",   doses[0], 500, 1e-9);
  quase("último = 31,25", doses[4], 31.25, 1e-9);
  doses.slice(1).forEach((v, i) => quase(`razão constante no nível ${i + 2}`, doses[i] / v, 2, 1e-9));
}
{
  /* Conservação de massa em cada linha: ppm_alvo * V_final = ppm_fonte * V_produto */
  const r = Lab.calcSerie({ doses: [500, 250, 125], volumeMl: 50,
                            fonteTipo: "gL", fonteValor: 340 });
  certo("3 linhas", r.linhas.length === 3);
  certo("ordenada da maior para a menor", r.linhas[0].ppm > r.linhas[2].ppm);
  r.linhas.forEach(x => {
    quase(`massa conservada em ${x.ppm} ppm`,
      x.ppm * r.volumeMl, r.fontePpm * x.produtoMl, 1e-6);
    quase(`volume fecha em ${x.ppm} ppm`, x.produtoMl + x.solventeMl, 50, 1e-9);
  });
}
{
  /* Pó puro na série: ppm * L = mg */
  const r = Lab.calcSerie({ doses: [100, 10], volumeMl: 50, fonteTipo: "puro" });
  quase("100 ppm em 50 mL = 5 mg", r.linhas[0].massaMg, 5, 1e-12);
  quase("10 ppm em 50 mL = 0,5 mg", r.linhas[1].massaMg, 0.5, 1e-12);
  certo("0,5 mg dispara aviso de balança", r.linhas[1].avisos.length > 0);
}
lanca("lista de doses vazia é recusada", () => Lab.parseListaDoses("   "));
{
  const d = Lab.parseListaDoses("500; 250; 125; 62,5");
  certo("lista com ; e vírgula decimal", d.length === 4 && d[3] === 62.5);
}

/* =========================================================== avisos ==== */
S("Avisos de precisão e saída da solução-mãe");
certo("acima de 10 µL não avisa",     Lab.alertaPipeta(0.05) === null);
certo("10 µL avisa como médio",       Lab.alertaPipeta(0.01).nivel === "medio");
certo("0,8 µL avisa como alto",       Lab.alertaPipeta(0.0008).nivel === "alto");
certo("0,2 µL avisa como crítico",    Lab.alertaPipeta(0.0002).nivel === "critico");
certo("massa de 0,05 mg é crítica",   Lab.alertaMassa(0.05).nivel === "critico");

/* 5 µL em 50 mL: fator 10 leva a pipetagem para 50 µL, que é confortável. */
{
  const s = Lab.sugereMae(0.005, 50);
  certo("propõe solução-mãe",       s !== null);
  quase("fator 10",                 s.fator, 10, 1e-12);
  quase("passa a pipetar 0,05 mL",  s.pipetarMl, 0.05, 1e-12);
}
certo("volume confortável não gera proposta", Lab.sugereMae(0.5, 50) === null);
/* A proposta precisa preservar a massa: pipetar o volume x fator de uma
   solução fator vezes mais diluída entrega a mesma quantidade de produto. */
{
  const vOriginal = 0.003, s = Lab.sugereMae(vOriginal, 50);
  quase("a proposta conserva a massa", s.pipetarMl / s.fator, vOriginal, 1e-12);
}

/* ====================================================== formatação ===== */
S("Relatório de texto");
{
  const r = Lab.calcCampo({ dose: 1, unidade: "L/ha", vazao: 200, volumeMl: 50 });
  const t = Lab.formatar(r, { titulo: "T3 — Teste", data: "2026-08-10" });
  certo("traz o título",        t.indexOf("T3 — Teste") >= 0);
  certo("traz o passo pipetar", t.indexOf("PIPETAR") >= 0);
  certo("traz o volume do pote", t.indexOf("50") >= 0);
}
{
  const r = Lab.calcSerie({ doses: [500, 50, 5], volumeMl: 50, fonteTipo: "gL", fonteValor: 340 });
  const t = Lab.formatar(r);
  certo("série vira tabela", t.indexOf("ppm") >= 0 && t.split("\n").length > 8);
}

/* ============================================================ fecho ==== */
console.log("\n" + (falhou === 0
  ? `\x1b[32m${ok} verificações, nenhuma falha.\x1b[0m`
  : `\x1b[31m${falhou} FALHA(S) em ${ok + falhou} verificações.\x1b[0m`));
process.exit(falhou === 0 ? 0 : 1);
