/* =========================================================================
 * test_estatistica.js — validação do núcleo estatístico do Agracta
 *
 *   node test_estatistica.js
 *
 * Princípio: nenhum teste compara a implementação com ela mesma. Cada
 * resultado é conferido contra um oráculo independente — outra fórmula,
 * integração numérica, valor tabelado ou uma propriedade matemática que
 * precisa valer para qualquer entrada.
 * ========================================================================= */
"use strict";
const Est = require("./estatistica.js");

/* ------------------------------------------------------------- harness --- */
let ok = 0, falhou = 0, secao = "";
const S = t => { secao = t; console.log("\n\x1b[1m" + t + "\x1b[0m"); };
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
  let deu = false;
  try { fn(); } catch (e) { deu = true; }
  certo(nome, deu, "esperava um erro e nada foi lançado");
}

/* gerador determinístico para os testes de propriedade */
let _s = 987654321;
const rnd = () => (_s = (_s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;

/* ============================================================== AACPD === */
S("AACPD — regra dos trapézios");
{
  /* oráculo: severidade constante y por Δt dias ⇒ área = y · Δt (retângulo) */
  quase("severidade constante 10% de 7 a 21 DAA = 140", Est.aacpd([10, 10, 10], [7, 14, 21]), 140);

  /* oráculo: crescimento linear ⇒ trapézio é exato, área = (y0+y1)/2 · Δt */
  quase("crescimento linear 0→28 em 14 dias = 196", Est.aacpd([0, 28], [7, 21]), 196);

  /* oráculo: aditividade sobre subintervalos */
  const s = [2, 9, 17, 30], t = [7, 14, 21, 28];
  quase("aditiva por subintervalos",
        Est.aacpd(s, t),
        Est.aacpd(s.slice(0, 2), t.slice(0, 2)) + Est.aacpd(s.slice(1, 3), t.slice(1, 3)) + Est.aacpd(s.slice(2), t.slice(2)));

  /* oráculo: escala linear */
  quase("dobrar a severidade dobra a AACPD", Est.aacpd([4, 18, 34], t.slice(0, 3)), 2 * Est.aacpd([2, 9, 17], t.slice(0, 3)));

  quase("doença ausente ⇒ AACPD zero", Est.aacpd([0, 0, 0], [7, 14, 21]), 0);
  lanca("recusa série com um único ponto", () => Est.aacpd([5], [7]));
  lanca("recusa tempos não crescentes", () => Est.aacpd([1, 2, 3], [7, 7, 21]));
  lanca("recusa tamanhos diferentes", () => Est.aacpd([1, 2], [7, 14, 21]));
}

/* =============================================================== ANOVA == */
S("ANOVA em blocos casualizados");
{
  /* ORÁCULO 1 — SQerro pela definição, via resíduos e_ij = y_ij − ȳ_i· − ȳ_·j + ȳ··
     A implementação usa a via da subtração (SQtotal − SQtrat − SQbloco).
     São dois caminhos algébricos distintos: têm de coincidir. */
  const sqErroPorResiduos = Y => {
    const k = Y.length, r = Y[0].length;
    const G = Est.media(Y.flat());
    const mT = Y.map(Est.media);
    const mB = Array.from({ length: r }, (_, j) => Est.media(Y.map(l => l[j])));
    let s = 0;
    for (let i = 0; i < k; i++) for (let j = 0; j < r; j++) s += (Y[i][j] - mT[i] - mB[j] + G) ** 2;
    return s;
  };

  for (let caso = 0; caso < 200; caso++) {
    const k = 2 + Math.floor(rnd() * 7), r = 2 + Math.floor(rnd() * 6);
    const Y = Array.from({ length: k }, () => Array.from({ length: r }, () => rnd() * 100 - 20));
    const a = Est.anovaDBC(Y);
    if (Math.abs(a.SQerro - sqErroPorResiduos(Y)) > 1e-7 * Math.max(1, a.SQtotal)) {
      certo(`SQerro bate com a via dos resíduos (caso ${caso})`, false); break;
    }
    if (Math.abs(a.SQtrat + a.SQbloco + a.SQerro - a.SQtotal) > 1e-7 * Math.max(1, a.SQtotal)) {
      certo(`decomposição fecha (caso ${caso})`, false); break;
    }
    if (caso === 199) {
      certo("SQerro coincide com a via dos resíduos em 200 matrizes aleatórias", true);
      certo("SQtrat + SQbloco + SQerro = SQtotal em 200 matrizes aleatórias", true);
    }
  }

  /* ORÁCULO 2 — dados perfeitamente aditivos: y_ij = μ + τ_i + β_j ⇒ SQerro = 0 */
  const aditivo = Est.anovaDBC([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);
  quase("dados aditivos ⇒ SQerro = 0", aditivo.SQerro, 0, 1e-10);
  quase("dados aditivos ⇒ SQtrat = 54", aditivo.SQtrat, 54, 1e-10);
  quase("dados aditivos ⇒ SQbloco = 6", aditivo.SQbloco, 6, 1e-10);

  /* ORÁCULO 3 — invariâncias que precisam valer para qualquer dado */
  const Y0 = [[12, 15, 9, 14], [22, 25, 19, 24], [31, 36, 28, 33], [8, 11, 6, 10]];
  const base = Est.anovaDBC(Y0);
  const desloc = Est.anovaDBC(Y0.map(l => l.map(v => v + 1000)));
  quase("somar constante não muda SQtrat", desloc.SQtrat, base.SQtrat, 1e-6);
  quase("somar constante não muda F", desloc.F, base.F, 1e-9);

  const escala = Est.anovaDBC(Y0.map(l => l.map(v => v * 7)));
  quase("multiplicar por 7 multiplica SQtrat por 49", escala.SQtrat, base.SQtrat * 49, 1e-6);
  quase("multiplicar por constante não muda F", escala.F, base.F, 1e-9);
  quase("multiplicar por constante não muda CV%", escala.CV, base.CV, 1e-9);

  const permB = Est.anovaDBC(Y0.map(l => [l[2], l[0], l[3], l[1]]));
  quase("trocar a ordem dos blocos não muda F", permB.F, base.F, 1e-9);
  const permT = Est.anovaDBC([Y0[3], Y0[1], Y0[0], Y0[2]]);
  quase("trocar a ordem dos tratamentos não muda F", permT.F, base.F, 1e-9);

  /* graus de liberdade */
  certo("GL tratamento = k − 1", base.glTrat === 3);
  certo("GL bloco = r − 1", base.glBloco === 3);
  certo("GL resíduo = (k−1)(r−1)", base.glErro === 9);
  certo("GL somam o total", base.glTrat + base.glBloco + base.glErro === base.glTotal);

  /* CV pela definição */
  quase("CV% = 100·√QMerro / média geral", base.CV, 100 * Math.sqrt(base.QMerro) / base.G, 1e-12);

  lanca("recusa matriz desbalanceada", () => Est.anovaDBC([[1, 2, 3], [4, 5]]));
  lanca("recusa um único bloco", () => Est.anovaDBC([[1], [2]]));
  lanca("recusa valor não numérico", () => Est.anovaDBC([[1, 2], [3, NaN]]));
}

/* ========================================================= distribuição F */
S("Valor de p — distribuição F");
{
  /* ORÁCULO 1 — identidade da beta incompleta: I_x(a,b) + I_{1−x}(b,a) = 1 */
  let maxErro = 0;
  for (let i = 0; i < 300; i++) {
    const a = 0.5 + rnd() * 20, b = 0.5 + rnd() * 20, x = rnd();
    maxErro = Math.max(maxErro, Math.abs(Est.betai(a, b, x) + Est.betai(b, a, 1 - x) - 1));
  }
  certo("identidade I_x(a,b) + I_{1−x}(b,a) = 1 em 300 pontos", maxErro < 1e-12,
        `erro máximo ${maxErro.toExponential(2)}`);

  /* ORÁCULO 2 — integração numérica da densidade F por Simpson.
     Caminho totalmente distinto da fração continuada.
     Para gl1 = 1 a densidade tem singularidade integrável em x → 0
     (x^(gl1/2 − 1) → ∞), que Simpson não trata. A substituição x = u²
     absorve a singularidade: dx = 2u du e o expoente vira (gl1 − 1). */
  const logDensidadeU = (u, d1, d2) =>
    Est.lgamma((d1 + d2) / 2) - Est.lgamma(d1 / 2) - Est.lgamma(d2 / 2)
    + (d1 / 2) * Math.log(d1 / d2) + Math.log(2)
    + (d1 - 1) * Math.log(u) - ((d1 + d2) / 2) * Math.log(1 + d1 * u * u / d2);
  const gU = (u, d1, d2) => u <= 0 ? (d1 > 1 ? 0 : Math.exp(logDensidadeU(1e-300, d1, d2)))
                                   : Math.exp(logDensidadeU(u, d1, d2));
  const pPorSimpson = (f, d1, d2, n) => {
    n = n || 200000;
    const h = Math.sqrt(f) / n;
    let s = gU(0, d1, d2) + gU(Math.sqrt(f), d1, d2);
    for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * gU(i * h, d1, d2);
    return 1 - s * h / 3;
  };
  /* o oráculo precisa passar no seu próprio teste antes de julgar o código:
     integrar a densidade inteira tem de dar 1 */
  quase("oráculo íntegro: a densidade F(1,10) integra 1", pPorSimpson(1e7, 1, 10), 0, 1e-4);
  quase("oráculo íntegro: a densidade F(5,15) integra 1", pPorSimpson(1e7, 5, 15), 0, 1e-4);
  [[2.9013, 5, 15], [4.9646, 1, 10], [3.4903, 3, 12], [1.5, 4, 20], [8.0, 2, 8]].forEach(([f, d1, d2]) => {
    quase(`p(F=${f}; ${d1},${d2}) confere com integração numérica`,
          Est.pF(f, d1, d2), pPorSimpson(f, d1, d2), 1e-6);
  });

  /* ORÁCULO 3 — quantis tabelados de F a 5% e 1% devolvem p ≈ α */
  quase("F(0,05; 5,15) = 2,9013 ⇒ p ≈ 0,05", Est.pF(2.9013, 5, 15), 0.05, 1e-3);
  quase("F(0,05; 3,12) = 3,4903 ⇒ p ≈ 0,05", Est.pF(3.4903, 3, 12), 0.05, 1e-3);
  quase("F(0,01; 5,15) = 4,5556 ⇒ p ≈ 0,01", Est.pF(4.5556, 5, 15), 0.01, 1e-3);

  /* comportamento nos extremos e monotonicidade */
  quase("F = 0 ⇒ p = 1", Est.pF(0, 5, 15), 1, 1e-12);
  certo("F muito grande ⇒ p → 0", Est.pF(1e8, 5, 15) < 1e-12);
  let monotono = true;
  for (let f = 0.1; f < 20; f += 0.1) if (Est.pF(f + 0.1, 5, 15) > Est.pF(f, 5, 15)) monotono = false;
  certo("p decresce monotonicamente com F", monotono);
  certo("p sempre dentro de [0,1]",
        Array.from({ length: 500 }, () => Est.pF(rnd() * 50, 1 + Math.floor(rnd() * 10), 2 + Math.floor(rnd() * 40)))
             .every(p => p >= 0 && p <= 1));
}

/* =================================================================== Tukey */
S("Amplitude studentizada e DMS");
{
  /* ORÁCULO — valores publicados de q(0,05; k; ν). A implementação calcula
     numericamente, sem tabela: a tábua clássica só entra aqui, como juiz. */
  const TABUA = [
    [2,10,3.151],[3,10,3.877],[4,10,4.327],[6,10,4.912],[10,10,5.598],
    [2,15,3.014],[3,15,3.674],[6,15,4.595],[10,15,5.198],
    [4,20,3.958],[10,20,5.008],[3,24,3.532],[4,24,3.901],
    [5,12,4.508],[8,30,4.602],[2,60,2.829],[6,60,4.163],[10,60,4.646]
  ];   /* só valores de tábua conferíveis; acima de k = 10 o juiz é a
          propriedade P(Q ≤ q) = 1 − α, que não depende de nenhuma tabela */
  let pior = 0, quemPior = "";
  TABUA.forEach(([k,gl,ref])=>{
    const d = Math.abs(Est.qTukey(k,gl) - ref);
    if(d > pior){ pior = d; quemPior = `k=${k} gl=${gl}`; }
  });
  certo(`q calculado bate com a tábua em ${TABUA.length} pontos (k = 2..20)`, pior < 5e-3,
        `pior desvio ${pior.toFixed(4)} em ${quemPior}`);

  /* REGRESSÃO — a versão antiga tinha tabela até k = 10 e truncava acima.
     Com 30 tratamentos isso subestimava o DMS e inventava diferenças. */
  const q10 = Est.qTukey(10, 87), q30 = Est.qTukey(30, 87);
  certo("q continua crescendo acima de k = 10 (não trunca)", q30 > q10 + 0.5,
        `q(10;87)=${q10.toFixed(3)}  q(30;87)=${q30.toFixed(3)}`);
  certo("q(30; 87) fica na faixa esperada (5,3 a 5,7)", q30 > 5.3 && q30 < 5.7, `obtido ${q30.toFixed(3)}`);

  /* monotonicidade */
  certo("q cresce com o número de tratamentos",
        [2,4,8,16,30].every((k,i,arr)=> i===0 || Est.qTukey(k,20) > Est.qTukey(arr[i-1],20)));
  certo("q decresce com os graus de liberdade",
        [10,20,40,80].every((gl,i,arr)=> i===0 || Est.qTukey(5,gl) < Est.qTukey(5,arr[i-1])));

  /* a função de distribuição por trás precisa se comportar como distribuição */
  certo("P(Q ≤ q) parte de 0 e chega a 1",
        Est.pAmplitudeStudentizada(0.01,5,15) < 0.01 && Est.pAmplitudeStudentizada(40,5,15) > 0.999);
  /* ORÁCULO SEM TABELA — o q devolvido tem de satisfazer sua própria
     definição, inclusive muito além de onde as tábuas impressas chegam */
  let piorP = 0, ondeP = "";
  [[3,10],[6,15],[10,20],[14,40],[20,60],[30,87],[45,120]].forEach(([k,gl])=>{
    const dp = Math.abs(Est.pAmplitudeStudentizada(Est.qTukey(k,gl), k, gl) - 0.95);
    if(dp > piorP){ piorP = dp; ondeP = `k=${k} gl=${gl}`; }
  });
  certo("q satisfaz P(Q ≤ q) = 0,95 de k = 3 a k = 45", piorP < 1e-3,
        `pior desvio ${piorP.toExponential(2)} em ${ondeP}`);
  quase("α = 0,01 satisfaz P(Q ≤ q) = 0,99",
        Est.pAmplitudeStudentizada(Est.qTukey(6,15,0.01), 6, 15), 0.99, 1e-3);
  certo("q a 1% é maior que q a 5%", Est.qTukey(6,15,0.01) > Est.qTukey(6,15));

  /* DMS pela definição */
  quase("DMS = q · √(QMerro/r)", Est.dmsTukey(0.30, 4, 6, 15), Est.qTukey(6, 15) * Math.sqrt(0.30 / 4), 1e-12);
  certo("mais repetições ⇒ DMS menor", Est.dmsTukey(0.30, 8, 6, 15) < Est.dmsTukey(0.30, 4, 6, 15));
  lanca("recusa k < 2", () => Est.qTukey(1, 15));
  lanca("recusa graus de liberdade inválidos", () => Est.qTukey(5, 0));
}

S("Letras de Tukey — propriedade definidora");
{
  /* A propriedade que precisa valer sempre:
     dois tratamentos compartilham letra  ⟺  |diferença| ≤ DMS.
     Testada exaustivamente em todos os pares de 500 conjuntos aleatórios. */
  let violacoes = 0, exemplo = "";
  for (let caso = 0; caso < 500; caso++) {
    const n = 2 + Math.floor(rnd() * 9);
    const medias = Array.from({ length: n }, () => rnd() * 100);
    const dms = 2 + rnd() * 30;
    const letras = Est.letrasTukey(medias, dms);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const compartilha = [...letras[i]].some(c => letras[j].includes(c));
      const naoDifere = Math.abs(medias[i] - medias[j]) <= dms + 1e-12;
      if (compartilha !== naoDifere) {
        violacoes++;
        if (!exemplo) exemplo = `médias ${medias[i].toFixed(3)} e ${medias[j].toFixed(3)}, DMS ${dms.toFixed(3)}, letras "${letras[i]}" e "${letras[j]}"`;
      }
    }
  }
  certo("compartilhar letra ⟺ diferença ≤ DMS (500 conjuntos, todos os pares)", violacoes === 0,
        `${violacoes} violações — ex.: ${exemplo}`);

  certo("todo tratamento recebe ao menos uma letra",
        Array.from({ length: 200 }, () => {
          const n = 2 + Math.floor(rnd() * 9);
          return Est.letrasTukey(Array.from({ length: n }, () => rnd() * 50), 1 + rnd() * 20);
        }).every(ls => ls.every(l => l.length > 0)));

  /* casos-limite conhecidos */
  certo("médias idênticas ⇒ todas com a mesma letra",
        Est.letrasTukey([5, 5, 5, 5], 1).every(l => l === "a"));
  certo("DMS zero e médias distintas ⇒ nenhuma letra repetida",
        new Set(Est.letrasTukey([1, 2, 3, 4], 0)).size === 4);
  certo("DMS enorme ⇒ todas equivalentes",
        Est.letrasTukey([1, 50, 100], 1e6).every(l => l === "a"));

  /* sentido: menos doença recebe "a" quando menosEhMelhor */
  const sev = [40, 10, 25];
  certo('menor média recebe "a" com crescente = true', Est.letrasTukey(sev, 1, true)[1] === "a");
  certo('maior média recebe "a" com crescente = false', Est.letrasTukey(sev, 1, false)[0] === "a");
}

/* ================================================================= Abbott */
S("Eficácia de Abbott");
{
  quase("controle total ⇒ 100%", Est.abbott(0, 400), 100);
  quase("igual à testemunha ⇒ 0%", Est.abbott(400, 400), 0);
  quase("metade da testemunha ⇒ 50%", Est.abbott(200, 400), 50);
  quase("pior que a testemunha ⇒ negativa", Est.abbott(500, 400), -25);
  certo("independe da escala",
        Math.abs(Est.abbott(50, 200) - Est.abbott(500, 2000)) < 1e-12);
  lanca("recusa testemunha zerada", () => Est.abbott(10, 0));
}

/* ================================================== análise ponta a ponta */
S("analisar() — do lançamento ao resultado");
{
  const tratamentos = ["T1", "T2", "T3", "T4"];
  const blocos = [1, 2, 3, 4];
  const tempos = [7, 14, 21];
  const perfil = { T1: [8.4, 29.0, 55.0], T2: [2.8, 7.2, 12.8], T3: [1.2, 3.0, 5.4], T4: [6.0, 20.0, 39.7] };
  const fatorBloco = [0.95, 0.88, 1.12, 1.05];
  const lancamentos = [];
  tratamentos.forEach(tr => blocos.forEach((b, ib) => tempos.forEach((tp, it) =>
    lancamentos.push({ trat: tr, bloco: b, tempo: tp, valor: perfil[tr][it] * fatorBloco[ib] })
  )));
  const cfg = { tratamentos, blocos, tempos, lancamentos, testemunha: "T1", transformacao: "sqrt" };
  const r = Est.analisar(cfg);

  certo("delineamento lido corretamente", r.anova.k === 4 && r.anova.r === 4 && r.anova.glErro === 9);
  quase("eficácia da testemunha é nula por definição", r.eficacia[0] === null ? 0 : 1, 0);
  certo("T3 (menos doença) tem a maior eficácia",
        r.eficacia[2] > r.eficacia[1] && r.eficacia[1] > r.eficacia[3]);
  certo("eficácias dentro de (0, 100)", r.eficacia.slice(1).every(e => e > 0 && e < 100));
  certo('T3 recebe "a"', r.letras[2].includes("a"));
  certo("testemunha tem a maior AACPD", Math.max(...r.mediaAACPD) === r.mediaAACPD[0]);
  quase("AACPD confere com o cálculo direto de uma parcela",
        r.aacpdParcela[1][0], Est.aacpd(perfil.T2.map(v => v * fatorBloco[0]), tempos), 1e-12);

  /* determinismo — exigência de rastreabilidade */
  certo("duas execuções dão exatamente o mesmo resultado",
        JSON.stringify(Est.analisar(cfg)) === JSON.stringify(Est.analisar(cfg)));

  /* a ordem em que os lançamentos chegam do Firestore não pode importar */
  const embaralhado = lancamentos.slice().sort(() => rnd() - 0.5);
  certo("a ordem dos lançamentos não altera o resultado",
        JSON.stringify(Est.analisar(Object.assign({}, cfg, { lancamentos: embaralhado }))) === JSON.stringify(r));

  /* o app precisa gritar, não adivinhar */
  lanca("recusa lançamento faltando", () =>
    Est.analisar(Object.assign({}, cfg, { lancamentos: lancamentos.slice(0, -1) })));
  lanca("recusa lançamento duplicado", () =>
    Est.analisar(Object.assign({}, cfg, { lancamentos: lancamentos.concat([lancamentos[0]]) })));
  lanca("recusa tratamento fora do delineamento", () =>
    Est.analisar(Object.assign({}, cfg, { lancamentos: lancamentos.concat([{ trat: "T9", bloco: 1, tempo: 7, valor: 1 }]) })));
  lanca("recusa testemunha inexistente", () =>
    Est.analisar(Object.assign({}, cfg, { testemunha: "T7" })));
  lanca("recusa transformação desconhecida", () =>
    Est.analisar(Object.assign({}, cfg, { transformacao: "raiz-cubica" })));

  /* a transformação muda o teste, não as médias apresentadas */
  const semTransf = Est.analisar(Object.assign({}, cfg, { transformacao: "nenhuma" }));
  certo("médias de AACPD independem da transformação",
        semTransf.mediaAACPD.every((m, i) => Math.abs(m - r.mediaAACPD[i]) < 1e-12));
  certo("eficácia independe da transformação",
        semTransf.eficacia.slice(1).every((e, i) => Math.abs(e - r.eficacia[i + 1]) < 1e-12));
  certo("a transformação altera o CV do teste", Math.abs(semTransf.anova.CV - r.anova.CV) > 1e-6);
}

S("Delineamento grande — 30 tratamentos");
{
  const tratamentos = Array.from({length:30},(_,i)=>"T"+(i+1));
  const blocos = [1,2,3,4], tempos = [7,14,21];
  const lancamentos = [];
  tratamentos.forEach((tr,i)=> blocos.forEach((b,ib)=> tempos.forEach((tp,it)=>{
    const nivel = i === 0 ? [8.4,29,55] : [1+ (i%7)*0.6, 3+(i%7)*2.4, 6+(i%7)*5.1];
    lancamentos.push({trat:tr, bloco:b, tempo:tp, valor: nivel[it]*(0.9+ib*0.07)});
  })));
  const r = Est.analisar({tratamentos, blocos, tempos, lancamentos, testemunha:"T1"});
  certo("roda com 30 tratamentos", r.anova.k === 30 && r.anova.glErro === 87);
  certo("uma letra para cada tratamento", r.letras.length === 30 && r.letras.every(l=>l.length>0));
  certo("q corresponde a 30 tratamentos, não a 10",
        Math.abs(r.q - Est.qTukey(30, 87)) < 1e-9 && r.q > Est.qTukey(10, 87));
  let viol = 0;
  for(let i=0;i<30;i++) for(let j=i+1;j<30;j++){
    const comp = [...r.letras[i]].some(c=>r.letras[j].includes(c));
    const naoDif = Math.abs(r.anova.mediasTrat[i]-r.anova.mediasTrat[j]) <= r.dms + 1e-12;
    if(comp !== naoDif) viol++;
  }
  certo("propriedade das letras continua valendo com 30 tratamentos", viol === 0, `${viol} violações`);
}

/* ================================================================ resumo */
console.log("\n" + "─".repeat(58));
console.log(`${ok} passaram · ${falhou} falharam`);
console.log("─".repeat(58));
process.exit(falhou ? 1 : 0);
