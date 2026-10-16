/* Motor de análise probit/logit para bioensaios de resposta binária.
 * Segue a metodologia de Robertson, Russell, Preisler & Savin,
 * "Bioassays with Arthropods" (2ª ed., 2007), caps. 3–4, e Finney (1971).
 * Funciona no navegador (window.ProbitEngine) e no Node (module.exports).
 */
(function (root) {
  'use strict';

  /* ---------------- Distribuições ---------------- */

  // erfc de alta precisão (W. J. Cody, 1969)
  function erfc(x) {
    const ax = Math.abs(x);
    let r;
    if (ax < 0.5) {
      const t = x * x;
      const top = (((0.185777706184603153 * t + 3.16112374387056560) * t + 113.864154151050156) * t + 377.485237685302021) * t + 3209.37758913846947;
      const bot = (((t + 23.6012909523441209) * t + 244.024637934444173) * t + 1282.61652607737228) * t + 2844.23683343917062;
      return 1 - x * top / bot;
    } else if (ax < 4) {
      const top = (((((((2.15311535474403846e-8 * ax + 0.564188496988670089) * ax + 8.88314979438837594) * ax + 66.1191906371416295) * ax + 298.635138197400131) * ax + 881.952221241769090) * ax + 1712.04761263407058) * ax + 2051.07837782607147) * ax + 1230.33935479799725;
      const bot = (((((((ax + 15.7449261107098347) * ax + 117.693950891312499) * ax + 537.181101862009858) * ax + 1621.38957456669019) * ax + 3290.79923573345963) * ax + 4362.61909014324716) * ax + 3439.36767414372164) * ax + 1230.33935480374942;
      r = Math.exp(-ax * ax) * top / bot;
    } else {
      const z = 1 / (ax * ax);
      const top = ((((0.0163153871373020978 * z + 0.305326634961232344) * z + 0.360344899949804439) * z + 0.125781726111229246) * z + 0.0160837851487422766) * z + 6.58749161529837803e-4;
      const bot = ((((z + 2.56852019228982242) * z + 1.87295284992346725) * z + 0.527905102951428412) * z + 0.0605183413124413191) * z + 2.33520497626869185e-3;
      r = Math.exp(-ax * ax) / ax * (0.564189583547756287 - z * top / bot);
    }
    return x < 0 ? 2 - r : r;
  }
  const SQRT2 = Math.SQRT2, INV_SQRT2PI = 0.3989422804014327;
  const normCdf = x => 0.5 * erfc(-x / SQRT2);
  const normPdf = x => INV_SQRT2PI * Math.exp(-0.5 * x * x);

  // Quantil normal (Acklam) + um passo de refinamento de Halley
  function normInv(p) {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    const pl = 0.02425; let q, r, x;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    else if (p <= 1 - pl) { q = p - 0.5; r = q * q; x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { q = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const e = normCdf(x) - p, u = e / normPdf(x);
    return x - u / (1 + x * u / 2);
  }

  function lgamma(x) {
    const g = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015; for (let j = 0; j < 6; j++) ser += g[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  // Gama incompleta regularizada P(a,x)
  function gammaP(a, x) {
    if (x <= 0) return 0;
    const gln = lgamma(a);
    if (x < a + 1) {
      let ap = a, sum = 1 / a, del = sum;
      for (let n = 0; n < 1000; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-15) break; }
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
    let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
  }
  const chi2Sf = (x, df) => (x <= 0 ? 1 : 1 - gammaP(df / 2, x / 2));

  // Beta incompleta regularizada I_x(a,b)
  function betacf(a, b, x) {
    const FPMIN = 1e-300; let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN; d = 1 / d; let h = d;
    for (let m = 1; m <= 1000; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN; c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-15) break;
    }
    return h;
  }
  function betaI(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  function tCdf(t, df) { const x = df / (df + t * t), p = 0.5 * betaI(x, df / 2, 0.5); return t > 0 ? 1 - p : p; }
  function tInv(p, df) { // bissecção robusta
    if (!isFinite(df) || df > 1e6) return normInv(p);
    let lo = -1e3, hi = 1e3;
    for (let i = 0; i < 200; i++) { const mid = (lo + hi) / 2; if (tCdf(mid, df) < p) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  /* ---------------- Álgebra linear ---------------- */
  function invert(M) {
    const n = M.length, A = M.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (Math.abs(A[piv][c]) < 1e-14) throw new Error('Matriz singular — o modelo não pôde ser ajustado com estes dados.');
      [A[c], A[piv]] = [A[piv], A[c]];
      const v = A[c][c]; for (let j = 0; j < 2 * n; j++) A[c][j] /= v;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c]; if (f) for (let j = 0; j < 2 * n; j++) A[r][j] -= f * A[c][j]; }
    }
    return A.map(r => r.slice(n));
  }

  /* ---------------- Modelos ---------------- */
  const MODELS = {
    probit: { F: normCdf, f: normPdf, df: x => -x * normPdf(x), inv: normInv, name: 'Probit' },
    logit: {
      F: x => (x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x))),
      f: x => { const e = Math.exp(-Math.abs(x)); return e / ((1 + e) * (1 + e)); },
      df: x => { const e = Math.exp(-Math.abs(x)), f = e / ((1 + e) * (1 + e)), F = x >= 0 ? 1 / (1 + e) : e / (1 + e); return f * (1 - 2 * F); },
      inv: p => Math.log(p / (1 - p)), name: 'Logit'
    }
  };

  /* Ajuste genérico por máxima verossimilhança (escore de Fisher com
   * busca linear). obs: [{x, n, r, isCtrl, a, b, c}] onde a/b/c são índices
   * dos parâmetros de intercepto, inclinação e resposta natural (c = -1 → C=0). */
  function fitGeneric(obs, nPar, model, start) {
    const M = MODELS[model];
    let th = start.slice();
    const probs = t => obs.map(o => {
      const C = o.c >= 0 ? t[o.c] : 0;
      if (o.isCtrl) return { p: C, eta: null, C };
      const eta = t[o.a] + t[o.b] * o.x; return { p: C + (1 - C) * M.F(eta), eta, C };
    });
    const loglik = t => {
      let ll = 0; const pr = probs(t);
      for (let i = 0; i < obs.length; i++) {
        const { n, r } = obs[i]; let p = pr[i].p;
        if (!(p >= 0 && p <= 1)) return -Infinity;
        p = Math.min(Math.max(p, 1e-300), 1 - 1e-16);
        if (r > 0) ll += r * Math.log(p);
        if (n - r > 0) ll += (n - r) * Math.log(1 - p);
      }
      return ll;
    };
    const scoreInfo = t => {
      const U = new Array(nPar).fill(0), I = Array.from({ length: nPar }, () => new Array(nPar).fill(0));
      const pr = probs(t);
      obs.forEach((o, i) => {
        const { p, eta, C } = pr[i]; const pp = Math.min(Math.max(p, 1e-12), 1 - 1e-12);
        const d = new Array(nPar).fill(0);
        if (o.isCtrl) { if (o.c >= 0) d[o.c] = 1; }
        else {
          const fe = (1 - C) * M.f(eta);
          d[o.a] += fe; d[o.b] += fe * o.x; if (o.c >= 0) d[o.c] += 1 - M.F(eta);
        }
        const w = (o.r - o.n * pp) / (pp * (1 - pp)), wi = o.n / (pp * (1 - pp));
        for (let j = 0; j < nPar; j++) { if (!d[j]) continue; U[j] += w * d[j]; for (let k = 0; k < nPar; k++) I[j][k] += wi * d[j] * d[k]; }
      });
      return { U, I };
    };
    let ll = loglik(th), iter = 0, converged = false;
    for (; iter < 200; iter++) {
      const { U, I } = scoreInfo(th);
      const Iinv = invert(I);
      const step = Iinv.map(row => row.reduce((s, v, j) => s + v * U[j], 0));
      let lam = 1, nt, nll;
      for (let h = 0; h < 40; h++) {
        nt = th.map((v, j) => v + lam * step[j]);
        // C precisa ficar em [0,1)
        let ok = true; obs.forEach(o => { if (o.c >= 0 && (nt[o.c] < 0 || nt[o.c] >= 1)) ok = false; });
        if (ok) { nll = loglik(nt); if (nll >= ll - 1e-12) break; }
        lam /= 2;
      }
      const delta = Math.max(...step.map((s, j) => Math.abs(lam * s) / (Math.abs(th[j]) + 1e-8)));
      th = nt; const dll = nll - ll; ll = nll;
      if (delta < 1e-10 || (Math.abs(dll) < 1e-12 && delta < 1e-7)) { converged = true; iter++; break; }
    }
    // Covariância = inversa da informação OBSERVADA (−Hessiana), como no PoloPlus
    const H = Array.from({ length: nPar }, () => new Array(nPar).fill(0));
    const pr = probs(th);
    obs.forEach((o, i) => {
      const { p, eta, C } = pr[i]; const pp = Math.min(Math.max(p, 1e-300), 1 - 1e-16);
      const w = o.r / pp - (o.n - o.r) / (1 - pp), w2 = -o.r / (pp * pp) - (o.n - o.r) / ((1 - pp) * (1 - pp));
      const d = new Array(nPar).fill(0), add = (j, k, v) => { H[j][k] += v; if (j !== k) H[k][j] += v; };
      if (o.isCtrl) { if (o.c >= 0) d[o.c] = 1; }
      else {
        const f = M.f(eta), fp = M.df(eta);
        d[o.a] += (1 - C) * f; d[o.b] += (1 - C) * f * o.x; if (o.c >= 0) d[o.c] += 1 - M.F(eta);
        add(o.a, o.a, w * (1 - C) * fp); add(o.a, o.b, w * (1 - C) * fp * o.x); add(o.b, o.b, w * (1 - C) * fp * o.x * o.x);
        if (o.c >= 0) { add(o.a, o.c, -w * f); add(o.b, o.c, -w * f * o.x); }
      }
      for (let j = 0; j < nPar; j++) for (let k = 0; k < nPar; k++) H[j][k] += w2 * d[j] * d[k];
    });
    let cov;
    try { cov = invert(H.map(r => r.map(v => -v))); if (cov.some((r, i) => !(r[i] > 0))) throw 0; }
    catch (e) { cov = invert(scoreInfo(th).I); }
    return { theta: th, cov, loglik: ll, iterations: iter, converged, probs: probs(th) };
  }

  function startValues(groups, model) {
    // regressão linear ponderada simples sobre proporções empíricas (corrigidas por Abbott)
    const M = MODELS[model];
    const ctrl = groups.filter(g => g.isCtrl);
    const ctrlN = ctrl.reduce((s, g) => s + g.n, 0), ctrlR = ctrl.reduce((s, g) => s + g.r, 0);
    const c0 = ctrlN > 0 ? ctrlR / ctrlN : 0;
    const pts = groups.filter(g => !g.isCtrl).map(g => {
      let p = (g.r / g.n - c0) / (1 - c0); p = Math.min(Math.max(p, 0.5 / g.n), 1 - 0.5 / g.n);
      return { x: g.x, y: M.inv(p), w: g.n };
    });
    const sw = pts.reduce((s, p) => s + p.w, 0);
    const mx = pts.reduce((s, p) => s + p.w * p.x, 0) / sw, my = pts.reduce((s, p) => s + p.w * p.y, 0) / sw;
    let sxy = 0, sxx = 0; pts.forEach(p => { sxy += p.w * (p.x - mx) * (p.y - my); sxx += p.w * (p.x - mx) ** 2; });
    let b = sxx > 0 ? sxy / sxx : 1; if (!(b > 0)) b = 1;
    return { a: my - b * mx, b, c: Math.min(Math.max(c0, 0.001), 0.9) };
  }

  /* ---------------- Preparação dos dados ---------------- */
  function prepare(prep, opts) {
    const rows = prep.rows.map(r => ({ dose: +r.dose, n: +r.n, r: +r.r }));
    for (const r of rows) {
      if (!(r.n > 0) || !(r.r >= 0) || r.r > r.n || !(r.dose >= 0) || !Number.isFinite(r.dose)) throw new Error(`Linha inválida em "${prep.name}": dose ${r.dose}, n ${r.n}, r ${r.r}`);
      if (opts.logDose && r.dose === 0) r.isCtrl = true;
      if (!opts.logDose && r.dose === 0 && opts.zeroIsControl !== false) r.isCtrl = true;
    }
    const treated = rows.filter(r => !r.isCtrl), ctrl = rows.filter(r => r.isCtrl);
    if (treated.length < 2) throw new Error(`"${prep.name}" precisa de pelo menos duas doses além do controle.`);
    const ctrlN = ctrl.reduce((s, g) => s + g.n, 0), ctrlR = ctrl.reduce((s, g) => s + g.r, 0);
    if (ctrlN > 0 && ctrlR === ctrlN) throw new Error(`"${prep.name}": 100% de resposta no controle — não há como estimar o efeito do tratamento.`);
    if (treated.every(r => r.r === 0)) throw new Error(`"${prep.name}": nenhuma resposta em nenhuma dose — o modelo não é estimável.`);
    if (treated.every(r => r.r === r.n)) throw new Error(`"${prep.name}": 100% de resposta em todas as doses — o modelo não é estimável.`);
    const partial = treated.filter(r => r.r > 0 && r.r < r.n);
    if (partial.length === 0) {
      const hi0 = Math.max(...treated.filter(r => r.r === 0).map(r => r.dose)), lo1 = Math.min(...treated.filter(r => r.r === r.n).map(r => r.dose));
      if (hi0 < lo1) throw new Error(`"${prep.name}": separação completa (só 0% e 100%, sem resposta intermediária) — a inclinação tende ao infinito. Inclua doses que causem resposta parcial.`);
    }
    // Resposta natural só é parâmetro quando houve resposta nos controles (como no PoloPlus)
    const estNatural = !!opts.natural && ctrlR > 0;
    const groups = rows.filter(r => !r.isCtrl || estNatural).map(r => ({ ...r, x: r.isCtrl ? null : (opts.logDose ? Math.log10(r.dose) : r.dose) }));
    return { name: prep.name, groups, estNatural, ctrlN, ctrlR, subjects: treated.reduce((s, g) => s + g.n, 0) };
  }

  /* ---------------- Análise individual ---------------- */
  function fiducial(alpha, beta, vaa, vab, vbb, y, tval, h) {
    // Resolve (alpha + beta x - y)^2 = t^2 h (vaa + 2x vab + x^2 vbb) — Fieller/Finney
    const k = tval * tval * h;
    const g = k * vbb / (beta * beta);
    const A = beta * beta - k * vbb, B = 2 * (beta * (alpha - y) - k * vab), Cc = (alpha - y) ** 2 - k * vaa;
    const disc = B * B - 4 * A * Cc;
    if (!(A > 0) || disc < 0) return { g, lower: null, upper: null };
    const s = Math.sqrt(disc);
    return { g, lower: (-B - s) / (2 * A), upper: (-B + s) / (2 * A) };
  }

  function analyzePrep(P, opts) {
    const M = MODELS[opts.model];
    const sv = startValues(P.groups, opts.model);
    const nPar = P.estNatural ? 3 : 2;
    const obs = P.groups.map(g => ({ ...g, a: 0, b: 1, c: P.estNatural ? 2 : -1 }));
    const fit = fitGeneric(obs, nPar, opts.model, P.estNatural ? [sv.a, sv.b, sv.c] : [sv.a, sv.b]);
    const [alpha, beta] = fit.theta, C = P.estNatural ? fit.theta[2] : 0;
    const cov = fit.cov, se = cov.map((r, i) => Math.sqrt(r[i]));
    // Qui-quadrado de Pearson
    let chi2 = 0;
    const table = P.groups.map((g, i) => {
      const p = fit.probs[i].p, exp = g.n * p, res = g.r - exp, sres = res / Math.sqrt(g.n * p * (1 - p));
      chi2 += sres * sres;
      return { dose: g.isCtrl ? 0 : g.dose, isCtrl: !!g.isCtrl, n: g.n, r: g.r, expected: exp, residual: res, p, stdResid: sres };
    });
    const df = P.groups.length - nPar;
    const het = df > 0 ? chi2 / df : NaN;
    const hetUsed = opts.hetCorrection && df > 0 && het > 1;
    const ld = opts.lds.map(L => {
      const y = M.inv(L / 100), xhat = (y - alpha) / beta;
      const limits = {};
      for (const lev of [0.90, 0.95, 0.99]) {
        const q = 1 - (1 - lev) / 2;
        const tval = hetUsed ? tInv(q, df) : normInv(q);
        const f = fiducial(alpha, beta, cov[0][0], cov[0][1], cov[1][1], y, tval, hetUsed ? het : 1);
        const ok = f.g <= opts.gMax && f.lower !== null;
        limits[lev] = { g: f.g, lower: ok ? back(f.lower, opts) : null, upper: ok ? back(f.upper, opts) : null };
      }
      return { level: L, x: xhat, dose: back(xhat, opts), limits };
    });
    return {
      name: P.name, estNatural: P.estNatural, subjects: P.subjects, controls: P.ctrlN, controlResp: P.ctrlR,
      alpha, beta, C, se, cov, tAlpha: alpha / se[0], tBeta: beta / se[1], tC: P.estNatural ? C / se[2] : null,
      chi2, df, pChi2: df > 0 ? chi2Sf(chi2, df) : NaN, het, hetUsed, table, ld, loglik: fit.loglik,
      converged: fit.converged, iterations: fit.iterations, slopeSignificant: Math.abs(beta / se[1]) >= 1.96
    };
  }
  const back = (x, opts) => (opts.logDose ? Math.pow(10, x) : x);

  /* ---------------- Testes de hipóteses (LR) ---------------- */
  function fitJoint(preps, opts, kind, indiv) {
    // kind: 'equal' (α e β comuns) ou 'parallel' (β comum, α por preparação)
    const k = preps.length; let nPar = 0; const aIdx = [], bIdx = [], cIdx = [];
    if (kind === 'equal') { aIdx.push(...Array(k).fill(0)); nPar = 1; } else { for (let j = 0; j < k; j++) aIdx.push(nPar++); }
    const bCommon = nPar++; for (let j = 0; j < k; j++) bIdx.push(bCommon);
    preps.forEach(P => cIdx.push(P.estNatural ? nPar++ : -1));
    const obs = []; preps.forEach((P, j) => P.groups.forEach(g => obs.push({ ...g, a: aIdx[j], b: bIdx[j], c: cIdx[j] })));
    const start = new Array(nPar).fill(0);
    const bMean = indiv.reduce((s, r) => s + r.beta, 0) / k;
    start[bCommon] = bMean;
    if (kind === 'equal') {
      const xbar = indiv.reduce((s, r) => s + (-r.alpha / r.beta), 0) / k; start[0] = -xbar * bMean;
    } else indiv.forEach((r, j) => { start[aIdx[j]] = -(-r.alpha / r.beta) * bMean; });
    indiv.forEach((r, j) => { if (cIdx[j] >= 0) start[cIdx[j]] = Math.max(r.C, 0.001); });
    const fit = fitGeneric(obs, nPar, opts.model, start);
    return { fit, nPar, aIdx, bIdx, cIdx, obs };
  }

  function lrTests(preps, indiv, opts) {
    const llFull = indiv.reduce((s, r) => s + r.loglik, 0);
    const kPar = preps.length;
    const out = {};
    for (const kind of ['equal', 'parallel']) {
      const J = fitJoint(preps, opts, kind, indiv);
      const lr = 2 * (llFull - J.fit.loglik);
      const df = kind === 'equal' ? 2 * kPar - 2 : kPar - 1;
      const p = chi2Sf(lr, df);
      out[kind] = { lr: Math.max(lr, 0), df, p, rejected: p < 0.05, theta: J.fit.theta, cov: J.fit.cov, aIdx: J.aIdx, bIdx: J.bIdx, cIdx: J.cIdx };
    }
    return out;
  }

  /* ---------------- Razões de dose letal (Robertson et al. 2007) ---------------- */
  function ldRatios(indiv, opts) {
    const M = MODELS[opts.model], refI = Math.min(Math.max(opts.refIndex || 0, 0), indiv.length - 1), ref = indiv[refI];
    const z = opts.ratioZ != null ? opts.ratioZ : normInv(1 - (1 - opts.ratioConf) / 2);
    return opts.lds.map(L => {
      const y = M.inv(L / 100);
      const th = r => (y - r.alpha) / r.beta;
      const vth = (r, t) => (r.cov[0][0] + 2 * t * r.cov[0][1] + t * t * r.cov[1][1]) / (r.beta * r.beta);
      const t1 = th(ref), v1 = vth(ref, t1);
      return {
        level: L, ref: ref.name, rows: indiv.filter((_, i) => i !== refI).map(r => {
          const t2 = th(r), v2 = vth(r, t2), a = t1 - t2, s = Math.sqrt(v1 + v2);
          const ratio = opts.logDose ? Math.pow(10, a) : NaN;
          const lo = opts.logDose ? Math.pow(10, a - z * s) : NaN, hi = opts.logDose ? Math.pow(10, a + z * s) : NaN;
          return { name: r.name, ratio, lower: lo, upper: hi, significant: !(lo <= 1 && hi >= 1) };
        })
      };
    });
  }

  /* ---------------- Entrada em formato PoloPlus ---------------- */
  function parsePolo(text) {
    const lines = text.replace(/\r/g, '').split('\n');
    const title = []; const preps = []; let cur = null; const errors = [];
    lines.forEach((raw, i) => {
      const s = raw.trim(); if (!s) return;
      if (s[0] === '=') { title.push(s.slice(1).trim()); return; }
      if (s[0] === '*') { cur = { name: s.slice(1).trim() || `Prep ${preps.length + 1}`, rows: [] }; preps.push(cur); return; }
      const f = s.split(/[\s;\t]+/).filter(Boolean).map(v => v.replace(',', '.'));
      if (f.length < 3 || f.slice(0, 3).some(v => !isFinite(+v))) { errors.push(`Linha ${i + 1}: esperado "dose n r" — "${s}"`); return; }
      if (!cur) { cur = { name: 'Prep 1', rows: [] }; preps.push(cur); }
      cur.rows.push({ dose: +f[0], n: +f[1], r: +f[2] });
    });
    return { title: title.join(' '), preps, errors };
  }

  /* ---------------- Análise completa ---------------- */
  function analyze(preps, options) {
    const opts = Object.assign({ model: 'probit', natural: true, logDose: true, lds: [10, 50, 90], gMax: 0.5, hetCorrection: true, ratioConf: 0.95, ratioZ: 2 }, options || {});
    const P = [], indiv = [], failed = [];
    for (const p of preps) {
      try {
        const pp = prepare(p, opts), r = analyzePrep(pp, opts);
        if (!r.converged) throw new Error(`"${p.name}": o ajuste não convergiu.`);
        P.push(pp); indiv.push(r);
      } catch (e) { failed.push({ name: p.name, error: e.message.replace(/^Matriz singular.*/, `"${p.name}": o modelo não pôde ser ajustado (dados degenerados).`) }); }
    }
    const res = { options: opts, preps: indiv, failed, nDoseGroups: preps.reduce((s, p) => s + p.rows.filter(r => +r.dose !== 0 || !opts.logDose).length, 0) };
    if (P.length > 1) {
      try { res.tests = lrTests(P, indiv, opts); } catch (e) { res.testsError = 'Os testes de igualdade/paralelismo não puderam ser calculados: ' + e.message; }
      res.ratios = opts.logDose ? ldRatios(indiv, opts) : null;
    }
    return res;
  }

  /* ---------------- Autoteste de validação ----------------
   * Referência: saída do PoloPlus 1.0 publicada em Robertson et al. (2007),
   * Bioassays with Arthropods, 2ª ed., Fig. 4.7 e 4.8 (dados WickedWitch.txt). */
  const VALIDATION_DATA = '*Fairfax\n0 30 0\n2 48 12\n3 50 15\n5 50 31\n7 48 31\n10 59 52\n*Pixley\n0 359 7\n10 70 22\n20 70 38\n30 50 38\n50 50 48\n*Schaefer\n0 60 0\n2 60 15\n3 120 41\n5 60 39\n10 120 110\n50 120 119';
  const REF = {
    Fairfax: { a: [-1.603, .249], b: [2.598, .353], cov: [.0620215, -.0825184, .124271], chi2: 3.7541, df: 3, het: 1.2514,
      ld: [[1.329, .638, 1.924, .392, 2.112], [4.139, 3.279, 5.062, 2.926, 5.482], [12.892, 9.351, 24.008, 8.611, 36.089]] },
    Pixley: { a: [-3.556, .529], b: [2.917, .402], C: [.020, .007], cov: [.280108, -.209702, .161958], chi2: 2.7080, df: 2, het: 1.3540,
      ld: [[6.022, 2.004, 9.276, .393, 10.588], [16.559, 11.676, 21.287, 8.096, 24.636], [45.538, 32.395, 102.577, 28.964, 329.883]] },
    Schaefer: { a: [-1.622, .186], b: [2.812, .273], cov: [.0345234, -.0466876, .0747859], chi2: 11.384, df: 3, het: 3.7946,
      ld: [[1.321, .485, 2.025, .207, 2.247], [3.773, 2.684, 5.025, 2.198, 5.717], [10.777, 7.418, 24.964, 6.747, 50.379]] },
    equal: [136, 4], parallel: [0.40, 2, 0.820],
    ratios: [[[.221, .132, .369], [1.006, .642, 1.577]], [[.250, .201, .311], [1.097, .902, 1.335]], [[.283, .186, .430], [1.196, .814, 1.758]]]
  };
  function decimals(v) { const s = String(v); return s.includes('.') ? s.split('.')[1].length : 0; }
  function validate() {
    const R = analyze(parsePolo(VALIDATION_DATA).preps, { model: 'probit', natural: true, logDose: true, lds: [10, 50, 90] });
    const checks = [];
    // Critério: igual ao valor impresso no último dígito; tolerância de ±1 unidade
    // no último dígito OU 1e-4 relativo (precisão simples do PoloPlus).
    const chk = (what, got, ref, dec) => {
      const d = dec == null ? decimals(ref) : dec, unit = Math.pow(10, -d);
      const diff = Math.abs(got - ref), exact = Math.abs(+got.toFixed(d) - ref) < unit / 2;
      const pass = exact || diff <= unit * 1.0001 || diff / Math.abs(ref) <= 1e-4;
      checks.push({ what, got, ref, dec: d, status: exact ? 'idêntico' : pass ? 'dentro da tolerância' : 'FALHOU', pass });
    };
    R.preps.forEach(p => {
      const ref = REF[p.name], n = p.name;
      chk(`${n} · intercepto`, p.alpha, ref.a[0]); chk(`${n} · EP intercepto`, p.se[0], ref.a[1]);
      chk(`${n} · inclinação`, p.beta, ref.b[0]); chk(`${n} · EP inclinação`, p.se[1], ref.b[1]);
      if (ref.C) { chk(`${n} · resposta natural`, p.C, ref.C[0]); chk(`${n} · EP resp. natural`, p.se[2], ref.C[1]); }
      chk(`${n} · var(intercepto)`, p.cov[0][0], ref.cov[0], 6 - Math.floor(Math.log10(Math.abs(ref.cov[0]))) - 1);
      chk(`${n} · cov(int, incl)`, p.cov[0][1], ref.cov[1], 6 - Math.floor(Math.log10(Math.abs(ref.cov[1]))) - 1);
      chk(`${n} · var(inclinação)`, p.cov[1][1], ref.cov[2], 6 - Math.floor(Math.log10(Math.abs(ref.cov[2]))) - 1);
      chk(`${n} · qui-quadrado`, p.chi2, ref.chi2); chk(`${n} · GL`, p.df, ref.df, 0); chk(`${n} · heterogeneidade`, p.het, ref.het);
      p.ld.forEach((L, i) => {
        const r = ref.ld[i], tag = `${n} · DL${L.level}`;
        chk(tag, L.dose, r[0]);
        chk(`${tag} LI 90%`, L.limits[0.9].lower, r[1]); chk(`${tag} LS 90%`, L.limits[0.9].upper, r[2]);
        chk(`${tag} LI 95%`, L.limits[0.95].lower, r[3]); chk(`${tag} LS 95%`, L.limits[0.95].upper, r[4]);
        checks.push({ what: `${tag} LI/LS 99% omitidos (g > 0,5)`, got: L.limits[0.99].lower, ref: null, status: L.limits[0.99].lower === null ? 'idêntico' : 'FALHOU', pass: L.limits[0.99].lower === null });
      });
    });
    chk('Igualdade · LR', R.tests.equal.lr, REF.equal[0], 0); chk('Igualdade · GL', R.tests.equal.df, 4, 0);
    chk('Paralelismo · LR', R.tests.parallel.lr, REF.parallel[0]); chk('Paralelismo · GL', R.tests.parallel.df, 2, 0);
    chk('Paralelismo · P', R.tests.parallel.p, REF.parallel[2]);
    R.ratios.forEach((L, i) => L.rows.forEach((r, j) => {
      const ref = REF.ratios[i][j], tag = `Razão DL${L.level} ${r.name}`;
      chk(tag, r.ratio, ref[0]); chk(`${tag} LI 95%`, r.lower, ref[1]); chk(`${tag} LS 95%`, r.upper, ref[2]);
    }));
    return { checks, passed: checks.every(c => c.pass), nIdentical: checks.filter(c => c.status === 'idêntico').length };
  }

  const api = { analyze, parsePolo, validate, VALIDATION_DATA, normCdf, normInv, tInv, tCdf, chi2Sf, MODELS, _fitGeneric: fitGeneric };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ProbitEngine = api;
})(typeof self !== 'undefined' ? self : this);
