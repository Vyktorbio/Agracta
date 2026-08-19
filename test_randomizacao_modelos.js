/* =========================================================================
 * test_randomizacao_modelos.js — os 15 croquis de planilha, conferidos
 *
 *   node test_randomizacao_modelos.js
 *
 * Os modelos vêm de "Randomizações Sider.xlsx", a planilha oficial do
 * laboratório. Conferi os 15 contra ela: 13 batem token a token. Os dois que
 * divergem — T2 e T15 — divergem porque A PLANILHA está errada, e o app corrige:
 *
 *   T2  a planilha repete 1A,2A e não tem 1B,2B  -> app usa 1B,2B
 *   T15 a planilha repete 5B e não tem 4B        -> app usa 4B
 *
 * Este teste não depende do arquivo (que não está no repositório). Ele fixa as
 * PROPRIEDADES que a planilha deveria ter e que o app garante — se alguém
 * reimportar a planilha crua, os erros dela voltam e isto aqui acusa.
 *
 * Geometria (do croqui de campo, 9 tratamentos):
 *   sobe-se a faixa da ESQUERDA com as repetições A e B, cruza-se no topo, e
 *   desce-se a faixa da DIREITA com C e D. Por isso os tokens estão em ordem de
 *   CAMINHAMENTO: A, B, C, D — e C/D aparecem invertidos em relação à planilha,
 *   que é vista de plano. Quem anda o campo lê 1,2,3... sem pular de lugar.
 * ========================================================================= */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");

let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}

/* extrai só a tabela do app.js — sem precisar do sandbox de navegador inteiro */
const src = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
const bloco = src.match(/var RANDOMIZACAO_MODELOS=\{[\s\S]*?\n\};/);
if (!bloco) { console.error("RANDOMIZACAO_MODELOS não encontrado em app.js"); process.exit(1); }
const ctx = {}; vm.createContext(ctx); vm.runInContext(bloco[0], ctx);
const MOD = ctx.RANDOMIZACAO_MODELOS;

const REPS = ["A", "B", "C", "D"];
const parse = tok => { const m = /^(\d+)([A-Z])$/.exec(tok); return m ? { t: +m[1], r: m[2] } : null; };

S("Cobertura");
{
  const ns = Object.keys(MOD).map(Number).sort((a, b) => a - b);
  certo("modelos de T2 a T16, sem buraco",
    ns.length === 15 && ns[0] === 2 && ns[14] === 16 &&
    ns.every((n, i) => n === i + 2), "obtido " + ns.join(","));
}

S("Cada modelo é um quadrado completo (4 repetições × N tratamentos)");
Object.keys(MOD).map(Number).sort((a, b) => a - b).forEach(n => {
  const toks = MOD[n];
  const bons = toks.every(t => parse(t) !== null);
  const cnt = {};
  toks.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
  const dup = Object.keys(cnt).filter(k => cnt[k] > 1);
  const falta = [];
  REPS.forEach(r => { for (let t = 1; t <= n; t++) if (!cnt[t + r]) falta.push(t + r); });
  const fora = toks.map(parse).filter(p => p && (p.t < 1 || p.t > n || REPS.indexOf(p.r) < 0));

  certo("T" + n + ": todos os tokens são legíveis", bons);
  certo("T" + n + ": " + (4 * n) + " parcelas", toks.length === 4 * n, "obtido " + toks.length);
  certo("T" + n + ": nenhum tratamento repetido numa repetição", dup.length === 0, "repetidos: " + dup.join(","));
  certo("T" + n + ": nenhum tratamento faltando", falta.length === 0, "faltam: " + falta.join(","));
  certo("T" + n + ": nenhum tratamento fora da faixa 1.." + n, fora.length === 0);
});

S("Ordem de caminhamento: A, depois B, depois C, depois D");
Object.keys(MOD).map(Number).sort((a, b) => a - b).forEach(n => {
  const rs = MOD[n].map(t => parse(t).r);
  const esperado = [].concat(...REPS.map(r => new Array(n).fill(r)));
  certo("T" + n + ": as repetições saem em blocos A|B|C|D",
    rs.join("") === esperado.join(""), "obtido " + rs.join(""));
});

S("A 1ª repetição é sequencial — é o lado que se instala primeiro");
Object.keys(MOD).map(Number).sort((a, b) => a - b).forEach(n => {
  const a = MOD[n].slice(0, n).map(t => parse(t).t);
  const seq = Array.from({ length: n }, (_, i) => i + 1);
  certo("T" + n + ": rep A = 1.." + n + " em ordem", a.join(",") === seq.join(","), "obtido " + a.join(","));
});

S("As correções de erro da planilha, fixadas");
{
  certo("T2 usa 1B e 2B (a planilha repetia 1A,2A)",
    MOD[2].join(" ") === "1A 2A 1B 2B 1C 2C 1D 2D", "obtido " + MOD[2].join(" "));
  const t15b = MOD[15].slice(15, 30).map(t => parse(t).t);
  certo("T15 tem o 4 na rep B (a planilha repetia o 5)", t15b.indexOf(4) >= 0);
  certo("T15 não repete o 5 na rep B", t15b.filter(x => x === 5).length === 1);
}

S("As repetições B e C são embaralhadas");
Object.keys(MOD).map(Number).sort((a, b) => a - b).filter(n => n >= 4).forEach(n => {
  const seq = Array.from({ length: n }, (_, i) => i + 1).join(",");
  const iguais = [1, 2].filter(k =>
    MOD[n].slice(k * n, (k + 1) * n).map(t => parse(t).t).join(",") === seq);
  certo("T" + n + ": B e C não são cópias da ordem sequencial", iguais.length === 0,
    "sequenciais: " + iguais.map(k => REPS[k]).join(","));
});

/* A rep D do T4 é 1D 2D 3D 4D — igual à rep A. Conferi na planilha oficial: é
   assim NA ORIGEM, o app está fiel. Com 4 tratamentos, sair 1-2-3-4 num sorteio
   tem 1 chance em 24, então é resultado legítimo, não defeito de geração.
   Fica registrado porque tem consequência de campo: num ensaio de 4 tratamentos,
   duas das quatro repetições ficam com layout idêntico, o que enfraquece o
   controle de gradiente (fertilidade, declive, bordadura) justamente na direção
   do caminhamento. Se um dia a planilha for revista, é o primeiro caso a olhar. */
S("Nenhum modelo é degenerado (as 4 repetições não são todas iguais)");
/* T2 fica de fora e tem seção própria abaixo: ele É degenerado hoje. */
Object.keys(MOD).map(Number).sort((a, b) => a - b).filter(n => n >= 3).forEach(n => {
  const blocos = REPS.map((_, k) => MOD[n].slice(k * n, (k + 1) * n).map(t => parse(t).t).join(","));
  certo("T" + n + ": há mais de um arranjo entre as repetições",
    new Set(blocos).size > 1, "arranjos distintos: " + new Set(blocos).size);
});

/* ACHADO EM ABERTO — T2 é o único modelo degenerado.
   Hoje: 1A 2A | 1B 2B | 1C 2C | 1D 2D. O tratamento 1 vem antes do 2 nas QUATRO
   repetições, então não há randomização nenhuma: é um arranjo sistemático.

   Não é erro de digitação, é resultado do conserto. A planilha oficial repetia
   "1A 2A" no lugar de "1B 2B", e o reparo foi mínimo — trocou os duplicados
   pelos ausentes mantendo a ordem. O resultado ficou íntegro (cada tratamento
   1× por repetição) mas sem alternância.

   Consequência de campo: com 2 tratamentos o par é sempre lido na mesma ordem
   ao longo do caminhamento, então qualquer gradiente na direção da faixa
   (fertilidade, declive, bordadura, sombra) entra inteiro no contraste entre os
   dois. O padrão para 2 tratamentos é alternar: 1A 2A | 2B 1B | 1C 2C | 2D 1D.

   NÃO corrigido aqui de propósito: mudar um modelo muda o croqui de campo de
   quem já usa T2, e isso é decisão do usuário, não minha. O teste fixa o estado
   ATUAL — se alguém alterar o T2, isto quebra e a mudança aparece. */
S("T2 é degenerado hoje — achado registrado, aguardando decisão");
{
  certo("T2 segue exatamente como está publicado",
    MOD[2].join(" ") === "1A 2A 1B 2B 1C 2C 1D 2D", "obtido " + MOD[2].join(" "));
  const blocos = REPS.map((_, k) => MOD[2].slice(k * 2, (k + 1) * 2).map(t => parse(t).t).join(","));
  certo("as 4 repetições têm o MESMO arranjo (é isso que se quer rever)",
    new Set(blocos).size === 1);
  certo("ainda assim é íntegro: cada tratamento 1× por repetição",
    MOD[2].length === 8 && new Set(MOD[2]).size === 8);
}

S("T4: a coincidência conhecida entre as repetições A e D");
{
  const bloco = k => MOD[4].slice(k * 4, (k + 1) * 4).map(t => parse(t).t).join(",");
  certo("segue como na planilha oficial: D = 1,2,3,4 (igual a A)",
    bloco(0) === "1,2,3,4" && bloco(3) === "1,2,3,4",
    "A=" + bloco(0) + "  D=" + bloco(3));
  certo("mas B e C seguem distintas de A", bloco(1) !== bloco(0) && bloco(2) !== bloco(0));
}

console.log("\n" + (falhou === 0
  ? "\x1b[32m" + ok + " conferências, todas certas.\x1b[0m"
  : "\x1b[31m" + falhou + " falharam\x1b[0m de " + (ok + falhou)));
process.exit(falhou === 0 ? 0 : 1);
