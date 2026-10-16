/* =========================================================================
 * test_probit_core.js — motor probit/logit da bancada (vendor/probit-core.js)
 *
 *   node tests/test_probit_core.js
 *
 * Nada aqui é conferido contra a própria implementação. As referências são:
 *   1) a saída do PoloPlus 1.0 impressa em Robertson, Russell, Preisler &
 *      Savin, "Bioassays with Arthropods", 2ª ed. (2007), fig. 4.7 e 4.8
 *      (dados WickedWitch.txt, três populações);
 *   2) o statsmodels (Python), que ajustou os mesmos dados por conta própria
 *      — os números estão escritos abaixo;
 *   3) propriedades que precisam valer sempre (a DL50 da curva cai em 50%,
 *      o limite inferior fica abaixo da dose e o superior acima).
 * ========================================================================= */
"use strict";
const P = require("../vendor/probit-core.js");

let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}
/* igual ao valor impresso, arredondado no mesmo número de casas; admite 1 no
   último dígito (o PoloPlus calcula em precisão simples). */
function impresso(nome, obtido, ref, casas) {
  const u = Math.pow(10, -casas), d = Math.abs(obtido - ref);
  certo(nome, d <= u * 1.0001, `obtido ${obtido}  impresso ${ref}`);
}
function quase(nome, a, b, tolRel) {
  const d = Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
  certo(nome, d <= tolRel, `obtido ${a}  esperado ${b}  Δrel ${d.toExponential(2)}`);
}
function erro(nome, fn, trecho) {
  let msg = null; try { fn(); } catch (e) { msg = e.message; }
  certo(nome, msg !== null && (!trecho || msg.indexOf(trecho) >= 0), msg === null ? "não lançou erro" : "mensagem: " + msg);
}

const LIVRO = P.parsePolo(P.VALIDATION_DATA).preps;
const R = P.analyze(LIVRO, { model: "probit", natural: true, logDose: true, lds: [10, 50, 90] });
const porNome = n => R.preps.find(p => p.name === n);

S("1. Leitura do arquivo no formato PoloPlus");
certo("três preparações", LIVRO.length === 3);
certo("Fairfax com 6 linhas (controle incluso)", LIVRO[0].rows.length === 6);
const lido = P.parsePolo("=Título\n*A\n0 20 1\n2,5 50 20\n5;50;30\nlixo\n");
certo("vírgula decimal e ponto-e-vírgula", lido.preps[0].rows[1].dose === 2.5 && lido.preps[0].rows[2].r === 30);
certo("linha inválida vira erro com o número da linha", lido.errors.length === 1 && /Linha 6/.test(lido.errors[0]));
certo("título lido", lido.title === "Título");

S("2. Parâmetros contra o PoloPlus (fig. 4.7)");
const F = porNome("Fairfax"), X = porNome("Pixley"), H = porNome("Schaefer");
impresso("Fairfax intercepto", F.alpha, -1.603, 3); impresso("Fairfax EP intercepto", F.se[0], 0.249, 3);
impresso("Fairfax inclinação", F.beta, 2.598, 3);   impresso("Fairfax EP inclinação", F.se[1], 0.353, 3);
certo("Fairfax: controle sem resposta → sem resposta natural", F.estNatural === false);
impresso("Pixley intercepto", X.alpha, -3.556, 3);  impresso("Pixley EP intercepto", X.se[0], 0.529, 3);
impresso("Pixley resposta natural", X.C, 0.020, 3); impresso("Pixley EP resp. natural", X.se[2], 0.007, 3);
impresso("Pixley inclinação", X.beta, 2.917, 3);    impresso("Pixley EP inclinação", X.se[1], 0.402, 3);
impresso("Schaefer inclinação", H.beta, 2.812, 3);  impresso("Schaefer EP inclinação", H.se[1], 0.273, 3);
/* A covariância é a inversa da informação OBSERVADA — é o que o PoloPlus
   imprime. Com a informação esperada o EP do Pixley sairia 0,524, não 0,529. */
impresso("Fairfax var(intercepto)", F.cov[0][0], 0.0620215, 7);
impresso("Fairfax cov(int, incl)", F.cov[0][1], -0.0825184, 7);
impresso("Pixley var(inclinação)", X.cov[1][1], 0.161958, 6);
impresso("Pixley cov(int, natural)", X.cov[0][2], -0.000305567, 9);
impresso("Schaefer var(intercepto)", H.cov[0][0], 0.0345234, 7);

S("3. Qui-quadrado e heterogeneidade");
impresso("Fairfax χ²", F.chi2, 3.7541, 4); certo("Fairfax GL 3", F.df === 3); impresso("Fairfax heterog.", F.het, 1.2514, 4);
impresso("Pixley χ² (controle conta como observação)", X.chi2, 2.7080, 4); certo("Pixley GL 2", X.df === 2);
impresso("Schaefer χ²", H.chi2, 11.384, 3); impresso("Schaefer heterog.", H.het, 3.7946, 4);
impresso("Schaefer resíduo padr. na dose 50", H.table[H.table.length - 1].stdResid, -2.917, 3);
impresso("Pixley esperado no controle", X.table.find(r => r.isCtrl).expected, 7.07, 2);

S("4. Doses letais e limites fiduciais (90% e 95%)");
const LD = {
  Fairfax: [[1.329, .638, 1.924, .392, 2.112], [4.139, 3.279, 5.062, 2.926, 5.482], [12.892, 9.351, 24.008, 8.611, 36.089]],
  Pixley: [[6.022, 2.004, 9.276, .393, 10.588], [16.559, 11.676, 21.287, 8.096, 24.636], [45.538, 32.395, 102.577, 28.964, 329.883]],
  Schaefer: [[1.321, .485, 2.025, .207, 2.247], [3.773, 2.684, 5.025, 2.198, 5.717], [10.777, 7.418, 24.964, 6.747, 50.379]]
};
Object.keys(LD).forEach(n => porNome(n).ld.forEach((L, i) => {
  const r = LD[n][i], t = n + " DL" + L.level;
  impresso(t, L.dose, r[0], 3);
  impresso(t + " 90% inf", L.limits[0.9].lower, r[1], 3); impresso(t + " 90% sup", L.limits[0.9].upper, r[2], 3);
  impresso(t + " 95% inf", L.limits[0.95].lower, r[3], 3); impresso(t + " 95% sup", L.limits[0.95].upper, r[4], 3);
  certo(t + " 99% omitido (g > 0,5), como no livro", L.limits[0.99].lower === null && L.limits[0.99].upper === null);
}));
/* A dose estimada é (y − α)/β, não o centro do intervalo de Fieller: os dois
   só coincidem quando g = 0. O Schaefer tem g = 0,36 e mostra a diferença. */
certo("DL10 do Schaefer é a estimativa pontual (1,321), não o centro do intervalo", Math.abs(H.ld[0].dose - 1.321) < 0.001);

S("5. Testes de igualdade e paralelismo, razões de DL (fig. 4.7, linhas 113–146)");
certo("igualdade rejeitada, LR 136, GL 4", R.tests.equal.rejected && Math.round(R.tests.equal.lr) === 136 && R.tests.equal.df === 4);
impresso("paralelismo LR", R.tests.parallel.lr, 0.40, 2); certo("paralelismo GL 2", R.tests.parallel.df === 2);
impresso("paralelismo P", R.tests.parallel.p, 0.820, 3); certo("paralelismo não rejeitado", !R.tests.parallel.rejected);
const RZ = [[[.221, .132, .369], [1.006, .642, 1.577]], [[.250, .201, .311], [1.097, .902, 1.335]], [[.283, .186, .430], [1.196, .814, 1.758]]];
R.ratios.forEach((L, i) => L.rows.forEach((r, j) => {
  const ref = RZ[i][j], t = "razão DL" + L.level + " " + r.name;
  impresso(t, r.ratio, ref[0], 3); impresso(t + " inf", r.lower, ref[1], 3); impresso(t + " sup", r.upper, ref[2], 3);
}));
certo("Pixley difere do Fairfax nas três DLs, Schaefer não", R.ratios.every(L => L.rows[0].significant && !L.rows[1].significant));
/* Os limites das razões usam ±2 EP. Com 1,96 a DL10 do Schaefer sairia 0,648–1,563. */
const R196 = P.analyze(LIVRO, { ratioZ: 1.96 });
certo("com ±1,96 EP os limites estreitam", R196.ratios[0].rows[1].lower > 0.642 && R196.ratios[0].rows[1].upper < 1.577);
const Rref = P.analyze(LIVRO, { refIndex: 1 });
certo("referência trocada para o Pixley", Rref.ratios[0].ref === "Pixley" && Rref.ratios[0].rows.map(r => r.name).join() === "Fairfax,Schaefer");
quase("razão é a inversa ao trocar a referência", Rref.ratios[1].rows[0].ratio, 1 / R.ratios[1].rows[0].ratio, 1e-12);

S("6. Autoteste embutido (aba Validação)");
const v = P.validate();
certo("autoteste aprovado", v.passed);
certo("mais de 100 verificações", v.checks.length > 100);
certo("pelo menos 100 idênticas ao impresso", v.nIdentical >= 100, v.nIdentical + " idênticas");

S("7. Logit e dose linear contra o statsmodels");
const so = [{ name: "Fairfax", rows: LIVRO[0].rows.filter(r => r.dose > 0) }];
const lg = P.analyze(so, { model: "logit", natural: false }).preps[0];
quase("logit intercepto", lg.alpha, -2.63595444375614, 1e-8); quase("logit inclinação", lg.beta, 4.2662418679131, 1e-8);
quase("logit var(incl)", lg.cov[1][1], 0.37410619407840007, 1e-7); quase("logit log-verossimilhança", lg.loglik, -145.34874987949686, 1e-10);
const li = P.analyze(so, { model: "probit", natural: false, logDose: false }).preps[0];
quase("probit linear intercepto", li.alpha, -1.1023158866166234, 1e-7); quase("probit linear inclinação", li.beta, 0.22967998986371677, 1e-7);
quase("probit linear cov(int, incl)", li.cov[0][1], -0.005155593321319097, 1e-6);
certo("dose linear não calcula razões (exigem log)", P.analyze([so[0], so[0]], { logDose: false }).ratios === null);

S("8. Propriedades");
R.preps.forEach(p => {
  const L50 = p.ld.find(L => L.level === 50);
  quase(p.name + ": na DL50 a curva corrigida dá 50%", P.normCdf(p.alpha + p.beta * L50.x), 0.5, 1e-12);
  certo(p.name + ": limites cercam a dose", p.ld.every(L => L.limits[0.95].lower < L.dose && L.dose < L.limits[0.95].upper));
});
const p9 = P.analyze([LIVRO[2]], { lds: [99.9968] }).preps[0].ld[0];
quase("probit 9: DL99,9968 está a 4 desvios da DL50", Math.log10(p9.dose), (P.normInv(0.999968) - H.alpha) / H.beta, 1e-12);
certo("convergiu nas três", R.preps.every(p => p.converged));

S("9. Dados que não formam curva");
const um = rows => [{ name: "T", rows: rows.map(([dose, n, r]) => ({ dose, n, r })) }];
const falha = rows => P.analyze(um(rows)).failed[0];
certo("nenhuma resposta", /nenhuma resposta/.test(falha([[1, 20, 0], [2, 20, 0], [4, 20, 0]]).error));
certo("100% em todas as doses", /100% de resposta em todas/.test(falha([[1, 20, 20], [2, 20, 20]]).error));
certo("separação completa", /separação completa/.test(falha([[1, 20, 0], [2, 20, 0], [4, 20, 20], [8, 20, 20]]).error));
certo("controle 100%", /controle/.test(falha([[0, 20, 20], [1, 20, 20], [2, 20, 20]]).error));
certo("uma dose só", /duas doses/.test(falha([[0, 20, 0], [1, 20, 10]]).error));
certo("r maior que n", /inválida/.test(falha([[1, 20, 25], [2, 20, 10]]).error));
const mista = P.analyze([LIVRO[0], { name: "Ruim", rows: [{ dose: 1, n: 10, r: 0 }, { dose: 2, n: 10, r: 0 }] }]);
certo("preparação ruim não derruba as outras", mista.preps.length === 1 && mista.failed.length === 1 && !mista.tests);
const quaseSep = P.analyze(um([[1, 20, 0], [2, 20, 1], [4, 20, 19], [8, 20, 20]])).preps[0];
certo("quase separação ainda ajusta", quaseSep.converged && quaseSep.beta > 5);
const contr = P.analyze(um([[0, 50, 20], [1, 50, 22], [2, 50, 30], [4, 50, 40], [8, 50, 48]])).preps[0];
certo("controle com 40% vira resposta natural ≈ 0,40", contr.estNatural && Math.abs(contr.C - 0.4) < 0.02);

console.log(`\n${ok} certas, ${falhou} erradas`);
process.exit(falhou ? 1 : 0);
