/* =========================================================================
 * test_planejamento_pronto.js — a etapa Planejamento não pede confirmação do
 * que o app já sabe, e não reescreve croqui com dado lançado
 *
 *   node test_planejamento_pronto.js
 *
 * O croqui é DERIVADO: semente fixa a partir do id + chave do protocolo. Logo
 * "randomizado = sim" já determina a ordem, e exigir que o usuário abra o modal
 * para confirmar era pedir ratificação de uma conta determinística.
 *
 * A fronteira que este teste protege: derivar sozinho é seguro enquanto NÃO há
 * nota lançada. Depois da primeira nota, a posição das parcelas no campo é fato
 * consumado — regenerar ali remapearia tratamento para parcela debaixo de dados
 * já colhidos. Se alguém "simplificar" essa guarda, este teste quebra.
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
try { vm.runInContext(fs.readFileSync(path.join(__dirname, "app.js"), "utf8"), ctx, { filename: "app.js" }); }
catch (e) { console.error("app.js não carregou:", e.message); process.exit(1); }

certo("_studyRandomOk existe", typeof ctx._studyRandomOk === "function");
certo("ensureStudyRandomizacao existe", typeof ctx.ensureStudyRandomizacao === "function");
if (typeof ctx._studyRandomOk !== "function") process.exit(1);

/* ------------------------------------------------------------ fábricas --- */
function estudo(over) {
  return Object.assign({
    id: "est-teste-1", codigo: "E-01", nome: "E-01",
    numRepeticoes: 4, randomizado: true, randomizacao: null,
    tratamentos: [
      { id: "T1", produto: "Testemunha", dose: "", testemunha: true },
      { id: "T2", produto: "A", dose: "1 L/ha" },
      { id: "T3", produto: "B", dose: "2 L/ha" }
    ],
    avaliacoes: []
  }, over || {});
}
/* uma avaliação COM nota — é o que caracteriza "dado lançado" */
function avaliacaoComNota() {
  return { data: "2026-08-19", tipo: "eficacia", variaveis: ["Mortalidade"],
           notas: { "T1|1": { "Mortalidade": 10 } } };
}

S("Marcar randomizado basta — sem etapa de confirmação");
{
  const s = estudo();
  certo("estudo novo, sem ordem guardada, já sai PRONTO", ctx._studyRandomOk(s) === true);
  certo("a ordem foi derivada e guardada",
    !!(s.randomizacao && Array.isArray(s.randomizacao.ordem)));
  certo("com uma parcela por tratamento por repetição (3 × 4 = 12)",
    s.randomizacao && s.randomizacao.ordem.length === 12,
    "obtido " + (s.randomizacao ? s.randomizacao.ordem.length : "nada"));
}

S("Derivar é determinístico — o mesmo estudo dá o mesmo croqui");
{
  const a = estudo(), b = estudo();
  ctx._studyRandomOk(a); ctx._studyRandomOk(b);
  const chave = r => r.randomizacao.ordem.map(p => p.parcela + ":" + p.tratId + ":" + p.rep).join("|");
  certo("duas derivações independentes coincidem", chave(a) === chave(b));

  /* e chamar de novo não embaralha o que já existe */
  const antes = chave(a);
  ctx._studyRandomOk(a); ctx._studyRandomOk(a);
  certo("idempotente: chamar de novo não muda a ordem", chave(a) === antes);
}

S("Não randomizado continua não randomizado");
{
  const s = estudo({ randomizado: false });
  certo("sem a marca, não deriva nada", ctx._studyRandomOk(s) === false);
  certo("e não inventa ordem", !s.randomizacao);
}

S("A GUARDA: com nota lançada, não se reescreve o croqui");
{
  /* estudo em andamento: ordem válida guardada + nota lançada */
  const s = estudo({ avaliacoes: [avaliacaoComNota()] });
  ctx._studyRandomOk(estudo());              /* deriva num gêmeo p/ copiar */
  const gemeo = estudo(); ctx._studyRandomOk(gemeo);
  s.randomizacao = JSON.parse(JSON.stringify(gemeo.randomizacao));
  const antes = JSON.stringify(s.randomizacao.ordem);
  certo("ordem válida + nota = pronto, sem mexer", ctx._studyRandomOk(s) === true);
  certo("a ordem guardada NÃO foi tocada", JSON.stringify(s.randomizacao.ordem) === antes);

  /* agora o conflito de verdade: mudou o protocolo DEPOIS de ter nota */
  const conflito = estudo({ avaliacoes: [avaliacaoComNota()] });
  const g2 = estudo(); ctx._studyRandomOk(g2);
  conflito.randomizacao = JSON.parse(JSON.stringify(g2.randomizacao));
  conflito.tratamentos.push({ id: "T4", produto: "C", dose: "3 L/ha" }); /* 3 -> 4 trat */
  const ordemAntes = JSON.stringify(conflito.randomizacao.ordem);
  const veredito = ctx._studyRandomOk(conflito);
  certo("ordem defasada COM nota => NÃO resolve sozinho (pede humano)", veredito === false);
  certo("e não reescreveu o croqui por baixo dos dados",
    JSON.stringify(conflito.randomizacao.ordem) === ordemAntes);
}

S("Sem nota, mudar o protocolo se resolve sozinho");
{
  const s = estudo();
  ctx._studyRandomOk(s);
  s.tratamentos.push({ id: "T4", produto: "C", dose: "3 L/ha" });
  certo("4 trat × 4 rep se acerta sem perguntar", ctx._studyRandomOk(s) === true);
  certo("agora são 16 parcelas", s.randomizacao.ordem.length === 16,
    "obtido " + s.randomizacao.ordem.length);
}

S("Casos degenerados não travam nem inventam");
{
  certo("sem estudo", ctx._studyRandomOk(null) === false);
  certo("1 tratamento só", ctx._studyRandomOk(estudo({ tratamentos: [{ id: "T1", produto: "X" }] })) === false);
  certo("0 repetições", ctx._studyRandomOk(estudo({ numRepeticoes: 0 })) === false);
}

console.log("\n" + (falhou === 0
  ? "\x1b[32m" + ok + " conferências, todas certas.\x1b[0m"
  : "\x1b[31m" + falhou + " falharam\x1b[0m de " + (ok + falhou)));
process.exit(falhou === 0 ? 0 : 1);
