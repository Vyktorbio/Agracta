/* =========================================================================
 * test_motor_diferencial.js — o motor do app x o núcleo auditado
 *
 *   node test_motor_diferencial.js
 *
 * O app.js tem seu próprio motor de ANOVA-DBC + Tukey embutido (rápido, sem
 * dependência, usado nas saídas de campo). O estatistica.js é o núcleo com
 * testes de oráculo. Este teste não escolhe um dos dois: ele PRENDE um ao
 * outro. Se alguém mexer no motor inline e o resultado sair do lugar, aqui
 * quebra — que é a garantia que a trilha BPL precisa.
 *
 * Os helpers são extraídos do próprio app.js em tempo de execução, então o
 * teste continua honesto conforme o app evolui.
 * ========================================================================= */
"use strict";
const fs = require("fs");
const path = require("path");
const Est = require("./estatistica.js");

/* ------------------------------------ extrai o motor inline do app.js --- */
const APP = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const NOMES = ["_lgamma", "_betacf", "_betai", "_fpval", "_erfc", "_ncdf",
               "_prange", "_ptukey", "_qtukey", "_tukeyLetters"];
const fonte = NOMES.map(n => {
  const m = APP.match(new RegExp("^function " + n + "\\b.*$", "m"));
  if (!m) throw new Error("não achei " + n + " no app.js — o motor inline mudou de forma");
  return m[0];
}).join("\n");
const motor = new Function(fonte + "\nreturn {" + NOMES.join(",") + "};")();
const { _fpval, _tukeyLetters } = motor;
/* O _qtukey do app integra numericamente e não tem cache — memoizar aqui só
   evita recalcular o mesmo (k, ν) mil vezes; o valor devolvido é o dele. */
const _memoQ = new Map();
function _qtukey(k, nu, alpha) {
  const c = k + "|" + nu + "|" + (alpha || 0.05);
  if (!_memoQ.has(c)) _memoQ.set(c, motor._qtukey(k, nu, alpha));
  return _memoQ.get(c);
}

/* --------------------------------------------------------- harness ----- */
let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}

/* ------------------ o motor inline, só a matemática do statDBC --------- */
function inline(Y, ts) {
  const t = ts.length, r = Y[0].length, N = t * r;
  const all = [].concat(...Y);
  const grand = all.reduce((a, b) => a + b, 0) / N;
  const tM = {}; ts.forEach((tid, i) => tM[tid] = Y[i].reduce((a, b) => a + b, 0) / r);
  const bM = []; for (let j = 0; j < r; j++) { let sb = 0; ts.forEach((tid, i) => sb += Y[i][j]); bM.push(sb / t); }
  let SSt = 0; ts.forEach(tid => SSt += (tM[tid] - grand) ** 2); SSt *= r;
  let SSb = 0; for (let j = 0; j < r; j++) SSb += (bM[j] - grand) ** 2; SSb *= t;
  let SStot = 0; all.forEach(x => SStot += (x - grand) ** 2);
  const SSe = Math.max(0, SStot - SSt - SSb), dft = t - 1, dfe = (t - 1) * (r - 1);
  const MSt = SSt / dft, MSe = dfe > 0 ? SSe / dfe : 0;
  const F = MSe > 0 ? MSt / MSe : Infinity;
  const q = _qtukey(t, dfe, 0.05), hsd = q * Math.sqrt(MSe / r);
  const order = ts.slice().sort((a, b) => tM[b] - tM[a]);
  return { grand, dft, dfe, SSt, SSb, SSe, SStot, MSt, MSe, F,
           p: _fpval(F, dft, dfe),
           cv: grand !== 0 ? Math.sqrt(MSe) / Math.abs(grand) * 100 : null,
           q, hsd, tMean: tM, letras: _tukeyLetters(order, tM, hsd), sig: _fpval(F, dft, dfe) < 0.05 };
}

/* --------------------------------- o mesmo, pelo núcleo auditado ------- */
function nucleo(Y, ts) {
  const A = Est.anovaDBC(Y);
  const hsd = Est.dmsTukey(A.QMerro, A.r, A.k, A.glErro);
  const ltr = Est.letrasTukey(A.mediasTrat, hsd, false); /* maior média recebe "a" */
  const tM = {}, letras = {};
  ts.forEach((tid, i) => { tM[tid] = A.mediasTrat[i]; letras[tid] = ltr[i]; });
  return { grand: A.G, dft: A.glTrat, dfe: A.glErro,
           SSt: A.SQtrat, SSb: A.SQbloco, SSe: A.SQerro, SStot: A.SQtotal,
           MSt: A.QMtrat, MSe: A.QMerro, F: A.QMerro > 0 ? A.F : Infinity, p: A.p,
           cv: A.G !== 0 ? Math.sqrt(A.QMerro) / Math.abs(A.G) * 100 : null,
           q: Est.qTukey(A.k, A.glErro), hsd, tMean: tM, letras, sig: A.p < 0.05 };
}

/* gerador determinístico — a mesma bateria a cada execução */
let _s = 4242424;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

/* ================================================== a bateria =========== */
S("ANOVA — o motor do app e o núcleo precisam dar o mesmo número");

const EXATOS = ["grand", "dft", "dfe", "SSt", "SSb", "SSe", "SStot", "MSt", "MSe", "F", "cv"];
const pior = {}; EXATOS.concat(["p", "q", "hsd"]).forEach(c => pior[c] = 0);
let casos = 0, letrasDif = 0, sigDif = 0;

for (const t of [2, 3, 4, 5, 6, 8, 10, 15, 20, 30]) {
  for (const r of [2, 3, 4, 5, 6]) {
    for (let it = 0; it < 25; it++) {
      const ts = Array.from({ length: t }, (_, i) => "T" + (i + 1));
      const efT = ts.map(() => rnd() * 40), efB = Array.from({ length: r }, () => rnd() * 8);
      const Y = ts.map((_, i) => Array.from({ length: r }, (_, j) => 5 + efT[i] + efB[j] + (rnd() - 0.5) * 6));
      const a = inline(Y, ts), b = nucleo(Y, ts);
      casos++;
      Object.keys(pior).forEach(c => {
        if (a[c] === null && b[c] === null) return;
        if (!isFinite(a[c]) && !isFinite(b[c])) return;
        const rel = Math.abs(a[c] - b[c]) / Math.max(1e-12, Math.abs(a[c]));
        if (rel > pior[c]) pior[c] = rel;
      });
      if (ts.map(x => a.letras[x]).join("|") !== ts.map(x => b.letras[x]).join("|")) letrasDif++;
      if (a.sig !== b.sig) sigDif++;
    }
  }
}

/* A ANOVA é aritmética fechada: tem que bater no bit. */
EXATOS.forEach(c => certo("`" + c + "` idêntico nos dois motores", pior[c] < 1e-12,
  `maior discrepância relativa ${pior[c].toExponential(2)}`));

/* p e q vêm de aproximação numérica — toleram diferença, mas pequena. */
certo("p-valor concorda até 1e-6", pior.p < 1e-6, `discrepância ${pior.p.toExponential(2)}`);
certo("q de Tukey concorda até 1%", pior.q < 1e-2, `discrepância ${pior.q.toExponential(2)}`);
certo("DMS concorda até 1%", pior.hsd < 1e-2, `discrepância ${pior.hsd.toExponential(2)}`);

/* O que sai no relatório não pode mudar. */
certo(`veredito de significância igual nos ${casos} casos`, sigDif === 0, `${sigDif} divergências`);
certo(`letras de Tukey iguais nos ${casos} casos`, letrasDif === 0, `${letrasDif} divergências`);

/* ---------------------------------------------------------------------- */
S("q de Tukey — os dois contra a tabela clássica (α = 0,05)");
[[2,10,3.151],[3,10,3.877],[4,10,4.327],[5,10,4.654],
 [2,20,2.950],[3,20,3.578],[4,20,3.958],[5,20,4.232],[10,20,5.008],
 [6,12,4.750],[3,15,3.673],[5,15,4.367],[4,30,3.845]].forEach(([k, nu, tab]) => {
  const v = _qtukey(k, nu, 0.05), n = Est.qTukey(k, nu, 0.05);
  certo(`k=${k} ν=${nu} → ${tab} (app ${v.toFixed(3)} · núcleo ${n.toFixed(3)})`,
        Math.abs(v - tab) < 0.01 && Math.abs(n - tab) < 0.01);
});

console.log("\n" + "─".repeat(58));
console.log(`${ok} passaram · ${falhou} falharam`);
console.log("─".repeat(58) + "\n");
process.exit(falhou ? 1 : 0);
