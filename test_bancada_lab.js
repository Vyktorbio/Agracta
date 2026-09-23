/* =========================================================================
 * test_bancada_lab.js — no laboratório a unidade é o POTE na bancada, não a
 * parcela no croqui
 *
 *   node test_bancada_lab.js
 *
 * Relato de uso (com print da ficha de um estudo LABIN): "no laboratório eu
 * uso potes, por que croqui? No campo sim, mas no lab? Tá pendente a etapa de
 * planejamento, fala 'conferir croqui'. Seria legal abrir uma grade com os
 * tratamentos, assim a gente avalia e já anota no lugar certo, já que eu faço
 * rotações randomizadas com os potes dentro do laboratório."
 *
 * O que este teste protege:
 *   1. Estudo de laboratório não fica pendente por "Conferir croqui".
 *   2. A ficha do lab mostra BANCADA (Ver bancada / Nova rotação), e nada de
 *      croqui nem "Posicionar no mapa". O campo continua como era.
 *   3. A rotação sorteia uma posição nova sem perder nem inventar pote, e a
 *      nota continua presa ao pote — girar não mexe em dado lançado.
 *   4. Cada avaliação vê a bancada como ela estava NA DATA dela.
 * ========================================================================= */
"use strict";
const fs = require("fs"), path = require("path");
let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}

/* ---- sandbox de navegador: MESMO padrão de test_fiacao_ui.js / test_avaliacao_tipos.js ---- */
const vm = require("vm");
function elStub(){
  return new Proxy(function(){}, {
    get: function(t, k){
      if(k === 'style') return {};
      if(k === 'classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      if(k === 'children' || k === 'childNodes') return [];
      return elStub();
    },
    set: function(){ return true; },
    apply: function(){ return elStub(); }
  });
}
const store = {};
const ctx = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
ctx.atob = function(s){ return Buffer.from(s, 'base64').toString('binary'); };
ctx.localStorage = {
  getItem: function(k){ return store[k] == null ? null : store[k]; },
  setItem: function(k, v){ store[k] = String(v); },
  removeItem: function(k){ delete store[k]; }
};
ctx.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
ctx.location = { reload: function(){}, href: '', search: '', hash: '' };
ctx.navigator = { onLine: true, userAgent: 'node', serviceWorker: {register: function(){ return Promise.resolve(); }, addEventListener: function(){}} };
ctx.document = new Proxy({}, {
  get: function(t, k){
    if(k === 'createElement' || k === 'getElementById' || k === 'querySelector' || k === 'createElementNS') return function(){ return elStub(); };
    if(k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return function(){ return []; };
    if(k === 'addEventListener' || k === 'removeEventListener') return function(){};
    if(k === 'body' || k === 'documentElement' || k === 'head') return elStub();
    if(k === 'visibilityState') return 'visible';
    if(k === 'cookie') return '';
    return elStub();
  }
});
ctx.addEventListener = function(){}; ctx.removeEventListener = function(){};
ctx.requestAnimationFrame = function(){};
ctx.matchMedia = function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; };
ctx.fetch = function(){ return Promise.resolve({json: function(){ return Promise.resolve({}); }}); };

vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'vendor/biocalc-lab-core.js'), 'utf8'), ctx, {filename:'biocalc-lab-core.js'});
ctx.AvaliacaoCore = require('./vendor/avaliacao-core');
try { vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), ctx, { filename: "app.js" }); }
catch (e) { console.error("app.js não carregou:", e.message); process.exit(1); }


ctx.data = {
  LAB: { tipo: "lab", labTipo: "Entomologia", nome: "LABIN", estudos: [] },
  CAMPO: { tipo: "campo", nome: "Talhão 1", estudos: [] }
};
vm.runInContext("data = window.data;", ctx);
function estudo(over) {
  return Object.assign({
    id: "S1", codigo: "LB 2749", nome: "LB 2749", numRepeticoes: 4, randomizado: false,
    tratamentos: [
      { id: "T1", produto: "Testemunha", dose: "", testemunha: true },
      { id: "T2", produto: "A", dose: "1 mL/L" },
      { id: "T3", produto: "B", dose: "2 mL/L" }
    ],
    avaliacoes: [], aplicacoes: []
  }, over || {});
}

S("Planejamento no laboratório não pede croqui");
{
  const s = estudo();
  const w = ctx._studyWorkflow("LAB", s);
  certo("tratamentos e repetições definidos: planejamento COMPLETO", w.planejamento.state === "complete", w.planejamento.state);
  certo("e sem a frase 'Conferir croqui'", !/croqui/i.test(w.planejamento.detail), w.planejamento.detail);
  certo("fala em potes: 3 × 4 = 12", /12 potes/.test(w.planejamento.detail), w.planejamento.detail);
  const falta = ctx._studyWorkflow("LAB", estudo({ numRepeticoes: 1 }));
  certo("faltando repetições, continua pendente", falta.planejamento.state === "pending");
  const campo = ctx._studyWorkflow("CAMPO", estudo());
  certo("no CAMPO nada muda: não randomizado segue 'Conferir croqui'", campo.planejamento.detail === "Conferir croqui", campo.planejamento.detail);
}

S("Rotação: sorteia de novo sem perder nem inventar pote");
{
  const chaves = Array.from({ length: 12 }, (_, i) => "K" + i);
  let iguais = 0, perdeu = false;
  for (let t = 0; t < 50; t++) {
    const r = ctx.bancadaSortear(chaves, chaves);
    if (r.slice().sort().join() !== chaves.slice().sort().join()) perdeu = true;
    if (r.join() === chaves.join()) iguais++;
  }
  certo("50 sorteios: sempre os mesmos 12 potes", !perdeu);
  certo("e nenhum igual à posição anterior", iguais === 0, iguais + " iguais");
}

S("A bancada guarda o rodízio e cada avaliação vê a posição da data dela");
{
  const s = estudo();
  ctx.data.LAB.estudos = [s];
  const inicial = ctx.bancadaPotes(s, null);
  certo("sem rotação: 12 potes na posição inicial", inicial.potes.length === 12 && !inicial.rotacao);
  certo("um tratamento por coluna por padrão (3)", inicial.colunas === 3, inicial.colunas);
  const k = inicial.potes.map(r => r.key);
  const ordemA = k.slice().reverse();
  const ordemB = k.slice(6).concat(k.slice(0, 6));
  s.bancada = { rotacoes: [{ data: "2026-09-10", ordem: ordemA }, { data: "2026-09-20", ordem: ordemB }] };
  const antes = ctx.bancadaPotes(s, "2026-09-05");
  certo("avaliação ANTES da 1ª rotação vê a posição inicial", !antes.rotacao && antes.potes[0].key === k[0]);
  const d15 = ctx.bancadaPotes(s, "2026-09-15");
  certo("avaliação do dia 15 vê a rotação 1", !!d15.rotacao && d15.rotacao.n === 1 && d15.potes[0].key === ordemA[0]);
  const d20 = ctx.bancadaPotes(s, "2026-09-20");
  certo("no dia da rotação 2, já vale a rotação 2", !!d20.rotacao && d20.rotacao.n === 2 && d20.potes[0].key === ordemB[0]);

  s.tratamentos.push({ id: "T4", produto: "C", dose: "3 mL/L" });
  const mais = ctx.bancadaPotes(s, null);
  certo("pote que não estava no rodízio entra no fim (16 potes)", mais.potes.length === 16 && mais.potes.slice(12).every(r => r.tratId === "T4"));
  s.tratamentos.pop(); s.tratamentos.shift();
  const menos = ctx.bancadaPotes(s, null);
  certo("pote de tratamento apagado sai (8 potes, nenhum T1)", menos.potes.length === 8 && !menos.potes.some(r => r.tratId === "T1"));
}

S("Girar não mexe em nota lançada");
{
  const s = estudo({ avaliacoes: [{ id: "A1", data: "2026-09-01", variaveis: ["Mortalidade"], notas: { "T2R1": { Mortalidade: 7 } } }] });
  ctx.data.LAB.estudos = [s];
  const notas = JSON.stringify(s.avaliacoes[0].notas);
  ctx.bancadaNovaRotacao("LAB", "S1");
  certo("a rotação foi gravada com todos os potes", !!s.bancada && s.bancada.rotacoes.length === 1 && s.bancada.rotacoes[0].ordem.length === 12);
  certo("as notas continuam idênticas", JSON.stringify(s.avaliacoes[0].notas) === notas);
  ctx.bancadaDesfazRotacao("LAB", "S1");
  certo("desfazer tira a última rotação", s.bancada.rotacoes.length === 0);
}

S("A ficha do laboratório mostra bancada, não croqui nem mapa");
{
  const src = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
  const i = src.indexOf("if(studyEhBancada(qid)){"), j = src.indexOf("}else{", i);
  const lab = src.slice(i, j);
  certo("achei o ramo do laboratório na ficha", i > 0 && j > i);
  certo("tem 'Ver bancada' e 'Nova rotação'", /Ver bancada/.test(lab) && /Nova rotação/.test(lab));
  certo("não tem croqui nem 'Posicionar no mapa'", !/Ver croqui|Posicionar no mapa|posicionarCroquiDoEstudo/.test(lab));
  certo("'Ver croqui' vindo de outro lugar, no laboratório, abre a bancada",
    /function openStudyParcelas\(qid,sid\)\{\s*if\(studyEhBancada\(qid\)\) return openBancada\(qid,sid\);/.test(src));
  certo("a grade da avaliação vira bancada no laboratório",
    /if\(typeof curV!=='undefined'&&studyEhBancada\(curV\)\) return bancadaAvaliacaoHtml\(st,vars\);/.test(src));
}

S("A grade: tocar no pote leva à nota dele");
{
  const s = estudo();
  const b = ctx.bancadaPotes(s, null);
  const html = ctx.bancadaGradeHtml(s, b, { onclick: "avCroquiSelect('{KEY}')" });
  certo("um botão por pote", (html.match(/class="av-croqui-parcela bancada-pote/g) || []).length === 12);
  certo("cada pote chama a nota pela chave dele", html.includes("avCroquiSelect('" + b.potes[0].key + "')"));
  certo("com a posição na bancada (A1 … D3)", html.includes('<span class="pos">A1</span>') && html.includes('<span class="pos">D3</span>'));
}

console.log("\n" + ok + " ok, " + falhou + " falha(s)");
if (falhou) process.exit(1);
console.log("Bancada do laboratório: sem croqui, potes em grade, rodízio com histórico e nota presa ao pote OK.");
