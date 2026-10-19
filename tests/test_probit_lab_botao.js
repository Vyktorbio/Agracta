/* A ANÁLISE PROBIT É UMA FERRAMENTA A MAIS DO LABORATÓRIO.
 *
 * Pedido de uso: "vamos incluir isso no Agracta na sessão de laboratório.
 * Coloque como opção ou 'a mais'". A conta mora em vendor/probit-core.js
 * (tests/test_probit_core.js confere contra o PoloPlus impresso no livro); a
 * página é probit.html. Aqui se confere a ligação:
 *
 *   1. a ficha do LABORATÓRIO tem o botão Probit no lugar do NDVI, e a
 *      quadra de campo continua com o NDVI e sem o Probit;
 *   2. o botão abre probit.html na moldura das pranchas;
 *   3. a página roda com a CSP estrita das páginas isoladas (sem estilo nem
 *      script inline) e o service worker a guarda para abrir offline.
 *
 * Rodar: node tests/test_probit_lab_botao.js
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
const src = fs.readFileSync('app.js', 'utf8');

/* ---------------------------------------------- 1. os botões da ficha --- */
const ini = src.indexOf("h+='</div><div class=\"panel-btns\">'+");
const fim = src.indexOf('document.getElementById("dPnl").innerHTML=h;', ini);
assert.ok(ini > 0 && fim > ini, 'achei a fileira de botões da ficha da quadra');
const BOTOES = src.slice(ini, fim);
function botoes(lab) {
  const ctx = { h: '', id: 'Q1', _lab: lab, esc: s => String(s), ic: n => '[' + n + ']' };
  vm.createContext(ctx); vm.runInContext(BOTOES, ctx); return ctx.h;
}
const lab = botoes(true), campo = botoes(false);
assert.match(lab, /onclick="abrirProbit\(\)"[^>]*>\[curve\] Probit<\/button>/, 'laboratório: botão Probit com o ícone da curva');
assert.doesNotMatch(lab, /ndviSerie/, 'laboratório continua sem NDVI (não tem polígono nem satélite)');
assert.match(lab, /EDITAR LABORAT/, 'e o botão de editar o laboratório continua lá');
assert.match(campo, /ndviSerie\('Q1'\)/, 'quadra de campo continua com o NDVI');
assert.doesNotMatch(campo, /abrirProbit/, 'e não ganha o Probit: a ferramenta é da bancada');

/* ---------------------------------------------------- 2. o que ele abre --- */
const m = src.match(/function abrirProbit\(\)\{([^}]*)\}/);
assert.ok(m, 'abrirProbit existe');
assert.match(m[1], /_openPranchaFrame\('probit\.html'/, 'abre probit.html na moldura das pranchas (com Fechar)');
assert.match(src, /curve:'<path/, 'o ícone curve existe na tabela do ic()');

/* ----------------------------------------- 3. a página e o service worker --- */
const html = fs.readFileSync('probit.html', 'utf8');
assert.match(html, /Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self'/, 'probit.html com a CSP estrita das páginas isoladas');
assert.doesNotMatch(html, /<script>|<style>|\sstyle="/, 'sem script, estilo nem atributo style inline no HTML');
assert.match(html, /src="vendor\/probit-core\.js\?v=1"/, 'carrega o motor');
assert.match(html, /src="probit\.js\?v=1"/, 'carrega a tela');
const js = fs.readFileSync('probit.js', 'utf8');
assert.doesNotMatch(js, /style="|\.style\.|style=\\"/, 'a tela não pinta estilo inline (a CSP o bloquearia): cor de série é classe');
assert.doesNotMatch(js, /fill="var\(|stroke="var\(/, 'nem var() em atributo de SVG');

const sw = fs.readFileSync('sw.js', 'utf8');
/* As versões vêm do que a página pede: subir o ?v= da folha (41ª, vidro nos
   painéis) não pode quebrar o teste, só esquecer de subir no sw.js. */
const pagina = fs.readFileSync('probit.html', 'utf8');
const pedidos = ['probit.js', 'probit.css', 'vendor/probit-core.js'].map(n => {
  const m = pagina.match(new RegExp(n.replace(/[./]/g, '\\$&') + '\\?v=\\d+'));
  assert.ok(m, 'probit.html precisa pedir ' + n + ' com ?v='); return './' + m[0];
});
['./probit.html', ...pedidos].forEach(f =>
  assert.ok(sw.indexOf("'" + f + "'") > 0, 'sw.js pré-carrega ' + f));
assert.match(sw, /\(prancha\|croqui\|cliente\|galeria-local\|relatorio-local\|probit\)\\\.html/,
  'probit.html entra no ramo das folhas próprias: aberta em iframe ela não sobrescreve o index no cache');

console.log('Laboratório: botão Probit na ficha, abre probit.html com CSP estrita e o service worker guarda a página OK.');
