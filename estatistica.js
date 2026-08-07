/* =========================================================================
 * estatistica.js — núcleo estatístico do Agracta
 *
 * Módulo puro: sem DOM, sem Firebase, sem rede. Roda no navegador (offline,
 * no talhão) e no Node (para os testes). Toda saída é função determinística
 * da entrada — requisito de rastreabilidade.
 *
 * Uso no navegador:  <script src="estatistica.js"></script>  → window.Est
 * Uso no Node:       const Est = require("./estatistica.js");
 * ========================================================================= */
(function (raiz, definir) {
  const api = definir();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.Est = api;
})(typeof self !== "undefined" ? self : this, function () {
"use strict";

/* ---------------------------------------------------------------- básicos */
const soma  = v => v.reduce((a, b) => a + b, 0);
const media = v => soma(v) / v.length;

/* --------------------------------------------------------------- AACPD ---
 * Área abaixo da curva de progresso da doença, regra dos trapézios.
 * serie e tempos precisam ter o mesmo comprimento e ao menos 2 pontos.
 */
function aacpd(serie, tempos) {
  if (serie.length !== tempos.length) throw new Error("aacpd: série e tempos com tamanhos diferentes");
  if (serie.length < 2) throw new Error("aacpd: precisa de ao menos 2 avaliações");
  let a = 0;
  for (let i = 0; i < serie.length - 1; i++) {
    const dt = tempos[i + 1] - tempos[i];
    if (dt <= 0) throw new Error("aacpd: tempos precisam ser crescentes");
    a += ((serie[i] + serie[i + 1]) / 2) * dt;
  }
  return a;
}

/* ------------------------------------------------------- transformações ---
 * Aplicadas antes da ANOVA quando a variância cresce com a média.
 * As médias continuam sendo apresentadas na escala original.
 */
const TRANSFORMACOES = {
  nenhuma: { f: x => x,                        rotulo: "—" },
  sqrt:    { f: x => Math.sqrt(x + 0.5),       rotulo: "√(x + 0,5)" },
  log:     { f: x => Math.log(x + 1),          rotulo: "ln(x + 1)" },
  /* percentuais 0–100: arco-seno da raiz da proporção, em graus */
  arcsen:  { f: x => Math.asin(Math.sqrt(Math.min(Math.max(x, 0), 100) / 100)) * 180 / Math.PI,
             rotulo: "arcsen √(x/100)" }
};

/* ------------------------------------------ ANOVA — blocos casualizados ---
 * Y[i][j] = observação do tratamento i no bloco j (matriz completa).
 * Devolve as somas de quadrados, quadrados médios, F e CV%.
 */
function anovaDBC(Y) {
  const k = Y.length;
  if (k < 2) throw new Error("anovaDBC: precisa de ao menos 2 tratamentos");
  const r = Y[0].length;
  if (r < 2) throw new Error("anovaDBC: precisa de ao menos 2 blocos");
  if (Y.some(l => l.length !== r)) throw new Error("anovaDBC: matriz desbalanceada");
  if (Y.some(l => l.some(v => !Number.isFinite(v)))) throw new Error("anovaDBC: valor não numérico");

  const todos = Y.flat();
  const N = k * r;
  const G = media(todos);
  const mT = Y.map(media);
  const mB = Array.from({ length: r }, (_, j) => media(Y.map(l => l[j])));

  const SQtotal = soma(todos.map(y => (y - G) ** 2));
  const SQtrat  = r * soma(mT.map(m => (m - G) ** 2));
  const SQbloco = k * soma(mB.map(m => (m - G) ** 2));
  const SQerro  = SQtotal - SQtrat - SQbloco;

  const glTrat = k - 1, glBloco = r - 1, glErro = (k - 1) * (r - 1);
  const QMtrat = SQtrat / glTrat, QMbloco = SQbloco / glBloco, QMerro = SQerro / glErro;

  return {
    k, r, N, G, mediasTrat: mT, mediasBloco: mB,
    SQtrat, SQbloco, SQerro, SQtotal,
    glTrat, glBloco, glErro, glTotal: N - 1,
    QMtrat, QMbloco, QMerro,
    F: QMtrat / QMerro,
    Fbloco: QMbloco / QMerro,
    p: pF(QMtrat / QMerro, glTrat, glErro),
    pBloco: pF(QMbloco / QMerro, glBloco, glErro),
    CV: 100 * Math.sqrt(QMerro) / G
  };
}

/* ------------------------------------------------ distribuição F: p-valor --
 * Via beta incompleta regularizada (fração continuada de Lentz).
 */
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betacf(a, b, x) {
  const MAX = 300, EPS = 3e-15, MIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < MIN) d = MIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
    c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < MIN) d = MIN;
    c = 1 + aa / c; if (Math.abs(c) < MIN) c = MIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/* beta incompleta regularizada I_x(a,b) */
function betai(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betacf(a, b, x) / a
    : 1 - bt * betacf(b, a, 1 - x) / b;
}

/* P(F > f) para f com gl1 e gl2 graus de liberdade */
function pF(f, gl1, gl2) {
  if (!Number.isFinite(f) || f <= 0) return 1;
  return betai(gl2 / 2, gl1 / 2, gl2 / (gl2 + gl1 * f));
}

/* ------------------------------------------------ amplitude studentizada ---
 * q(α; k; ν) calculado numericamente, sem tabela. A versão anterior usava uma
 * tabela até k = 10 e truncava acima disso — com 30 tratamentos o DMS saía
 * pequeno demais e o teste acusava diferenças inexistentes.
 *
 *   P(Q ≤ q) = ∫ f_S(s) · P(W ≤ qs) ds
 *   P(W ≤ w) = k ∫ φ(z) [Φ(z) − Φ(z−w)]^(k−1) dz
 *
 * com W = amplitude de k normais padrão e S = χ_ν/√ν independente.
 * Os valores tabelados clássicos são usados como oráculo nos testes.
 */
function erfc(x){                                   /* |erro| < 1,2e-7 */
  const z = Math.abs(x), u = 2/(2+z);
  const r = u*Math.exp(-z*z - 1.26551223 + u*(1.00002368 + u*(0.37409196 + u*(0.09678418 +
    u*(-0.18628806 + u*(0.27886807 + u*(-1.13520398 + u*(1.48851587 +
    u*(-0.82215223 + u*0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const Phi = z => 0.5*erfc(-z/Math.SQRT2);
const phi = z => Math.exp(-0.5*z*z)/Math.sqrt(2*Math.PI);

/* P(W ≤ w) — amplitude de k normais padrão, por Simpson */
function pAmplitude(w, k){
  if(w <= 0) return 0;
  const a = -8.5, b = w + 8.5, n = 400, h = (b - a)/n;
  let acc = 0;
  for(let i = 0; i <= n; i++){
    const z = a + i*h;
    const f = phi(z) * Math.pow(Math.max(0, Phi(z) - Phi(z - w)), k - 1);
    acc += (i === 0 || i === n ? 1 : (i % 2 ? 4 : 2)) * f;
  }
  return Math.min(1, k * acc * h / 3);
}

/* P(Q ≤ q) — amplitude studentizada */
function pAmplitudeStudentizada(q, k, nu){
  if(q <= 0) return 0;
  if(!(nu > 0) || nu > 5000) return pAmplitude(q, k);
  const lc = (nu/2)*Math.log(nu) - lgamma(nu/2) - (nu/2 - 1)*Math.LN2;
  const dens = s => Math.exp(lc + (nu - 1)*Math.log(s) - nu*s*s/2);
  const dp = 1/Math.sqrt(2*nu);
  const a = Math.max(1e-9, 1 - 9*dp), b = 1 + 9*dp;
  const n = 160, h = (b - a)/n;
  let acc = 0;
  for(let i = 0; i <= n; i++){
    const s0 = a + i*h;
    acc += (i === 0 || i === n ? 1 : (i % 2 ? 4 : 2)) * dens(s0) * pAmplitude(q*s0, k);
  }
  return Math.min(1, acc * h / 3);
}

const _cacheQ = new Map();
function qTukey(k, gl, alfa){
  if(k < 2) throw new Error("qTukey: k precisa ser ≥ 2");
  if(!(gl >= 1)) throw new Error("qTukey: graus de liberdade precisam ser ≥ 1");
  alfa = alfa === undefined ? 0.05 : alfa;
  const chave = k + ":" + gl + ":" + alfa;
  if(_cacheQ.has(chave)) return _cacheQ.get(chave);
  const alvo = 1 - alfa;
  let lo = 0.5, hi = 30;
  for(let i = 0; i < 60 && hi - lo > 1e-5; i++){
    const m = (lo + hi)/2;
    if(pAmplitudeStudentizada(m, k, gl) < alvo) lo = m; else hi = m;
  }
  const q = (lo + hi)/2;
  _cacheQ.set(chave, q);
  return q;
}

/* diferença mínima significativa de Tukey */
function dmsTukey(QMerro, r, k, gl) {
  return qTukey(k, gl) * Math.sqrt(QMerro / r);
}

/* --------------------------------------------------- letras de Tukey ------
 * Método dos grupos maximais. Com as médias ordenadas e DMS constante,
 * o par limitante de um intervalo são sempre os extremos — por isso basta
 * estender enquanto (maior − menor) ≤ dms.
 *
 * Garantia: i e j compartilham letra  ⟺  |média_i − média_j| ≤ dms.
 *
 * crescente = true  → a menor média recebe "a" (use quando menos é melhor,
 * caso da severidade). false → a maior média recebe "a".
 */
function letrasTukey(medias, dms, crescente) {
  if (crescente === undefined) crescente = true;
  const n = medias.length;
  if (n === 0) return [];
  const ordem = medias.map((m, i) => ({ m, i }))
                      .sort((a, b) => crescente ? a.m - b.m : b.m - a.m);

  /* grupos maximais sobre a sequência ordenada */
  const grupos = [];
  for (let i = 0; i < n; i++) {
    let j = i;
    while (j + 1 < n && Math.abs(ordem[j + 1].m - ordem[i].m) <= dms + 1e-12) j++;
    grupos.push([i, j]);
  }
  /* descarta os que estão contidos em outro */
  const mant = grupos.filter(([a, b], idx) =>
    !grupos.some(([c, d], k2) => k2 !== idx && c <= a && b <= d && (d - c) > (b - a))
  );
  /* dedup */
  const vistos = new Set(), finais = [];
  mant.forEach(g => { const ch = g.join(":"); if (!vistos.has(ch)) { vistos.add(ch); finais.push(g); } });

  const letras = Array(n).fill("");
  finais.forEach(([a, b], gi) => {
    const L = String.fromCharCode(97 + gi);
    for (let p = a; p <= b; p++) letras[ordem[p].i] += L;
  });
  return letras;
}

/* ---------------------------------------------------------- Abbott --------
 * Eficácia de controle em relação à testemunha. Positiva = controle.
 */
function abbott(valorTratado, valorTestemunha) {
  if (!(valorTestemunha > 0)) throw new Error("abbott: testemunha precisa ser > 0");
  return 100 * (valorTestemunha - valorTratado) / valorTestemunha;
}

/* ================================================== análise completa ======
 * Entrada no formato longo — uma linha por lançamento, que é como o
 * Firestore já guarda e como o R espera:
 *
 *   analisar({
 *     tratamentos: ["T1","T2","T3"],
 *     blocos: [1,2,3,4],
 *     tempos: [7,14,21],                       // DAA das avaliações
 *     lancamentos: [{trat:"T1", bloco:1, tempo:7, valor:8.4}, ...],
 *     testemunha: "T1",
 *     transformacao: "sqrt",                   // nenhuma | sqrt | log | arcsen
 *     menosEhMelhor: true
 *   })
 */
function analisar(cfg) {
  const { tratamentos, blocos, tempos, lancamentos, testemunha } = cfg;
  const transf = cfg.transformacao || "sqrt";
  const menosEhMelhor = cfg.menosEhMelhor !== false;
  if (!TRANSFORMACOES[transf]) throw new Error("analisar: transformação desconhecida: " + transf);
  if (!tratamentos || !tratamentos.length) throw new Error("analisar: sem tratamentos");
  const iTest = tratamentos.indexOf(testemunha);
  if (iTest < 0) throw new Error("analisar: testemunha não está na lista de tratamentos");

  /* pivota longo → cubo [trat][bloco][tempo], validando cobertura */
  const cubo = tratamentos.map(() => blocos.map(() => Array(tempos.length).fill(null)));
  lancamentos.forEach(l => {
    const it = tratamentos.indexOf(l.trat), ib = blocos.indexOf(l.bloco), ie = tempos.indexOf(l.tempo);
    if (it < 0 || ib < 0 || ie < 0) throw new Error(`analisar: lançamento fora do delineamento (${l.trat}/${l.bloco}/${l.tempo})`);
    if (cubo[it][ib][ie] !== null) throw new Error(`analisar: lançamento duplicado (${l.trat}/${l.bloco}/${l.tempo})`);
    if (!Number.isFinite(l.valor)) throw new Error(`analisar: valor não numérico (${l.trat}/${l.bloco}/${l.tempo})`);
    cubo[it][ib][ie] = l.valor;
  });
  const faltando = [];
  cubo.forEach((bl, it) => bl.forEach((s, ib) => s.forEach((v, ie) => {
    if (v === null) faltando.push(`${tratamentos[it]}/${blocos[ib]}/${tempos[ie]} DAA`);
  })));
  if (faltando.length) throw new Error("analisar: faltam lançamentos — " + faltando.join(", "));

  /* AACPD por parcela e médias por tratamento na escala original */
  const AACPD = cubo.map(bl => bl.map(s => aacpd(s, tempos)));
  const mAACPD = AACPD.map(media);
  const mSeveridade = cubo.map(bl => tempos.map((_, ie) => media(bl.map(s => s[ie]))));

  /* ANOVA na escala transformada */
  const f = TRANSFORMACOES[transf].f;
  const anova = anovaDBC(AACPD.map(bl => bl.map(f)));
  const dms = dmsTukey(anova.QMerro, anova.r, anova.k, anova.glErro);
  const letras = letrasTukey(anova.mediasTrat, dms, menosEhMelhor);

  const eficacia = mAACPD.map((m, i) => i === iTest ? null : abbott(m, mAACPD[iTest]));

  return {
    tratamentos, blocos, tempos, testemunha,
    aacpdParcela: AACPD, mediaAACPD: mAACPD, mediaSeveridade: mSeveridade,
    eficacia, anova, dms, letras,
    q: qTukey(anova.k, anova.glErro),
    transformacao: { chave: transf, rotulo: TRANSFORMACOES[transf].rotulo },
    alfa: 0.05
  };
}

return { soma, media, aacpd, TRANSFORMACOES, anovaDBC,
         lgamma, betai, pF, erfc, Phi, pAmplitude, pAmplitudeStudentizada,
         qTukey, dmsTukey, letrasTukey, abbott, analisar };
});
