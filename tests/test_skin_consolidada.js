/* A skin royal deixou de ser uma camada por cima da interface.
 *
 * Até a 40ª publicação, skin-royal.css repintava interface-neutra.css com
 * !important: Arial, vidro, azul royal e azul de seleção. Funcionava, mas toda
 * tela nova brigava com duas folhas, e a skin deixava dois restos:
 *
 *  1. o index.html baixava Inter, Archivo e IBM Plex Mono do Google, num
 *     <link> que trava a primeira pintura, para depois forçar Arial em tudo.
 *     No campo, com sinal fraco, era espera por fonte que não aparece;
 *  2. a regra de fonte alcançava <text> de SVG, então o croqui e a prancha
 *     apareciam em Arial na tela e saíam no arquivo com a fonte da figura
 *     (IBM Plex Sans Condensed), que é a fonte com que a prancha calcula a
 *     largura dos rótulos.
 *
 * Agora as cores moram em interface-neutra.css (tokens --skin-* nos dois
 * temas) e a fonte em tipografia.css. Este teste guarda o acordo.
 *
 * Rodar: node tests/test_skin_consolidada.js
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs');
const ler = f => fs.readFileSync(f, 'utf8');

const PAGINAS = ['index.html', 'cliente.html', 'croqui.html', 'prancha.html', 'probit.html',
  'galeria-local.html', 'relatorio-local.html', 'estatistica/index.html'];

/* ------------------------------------------- 1. a camada antiga saiu ----- */
assert.ok(!fs.existsSync('skin-royal.css'), 'skin-royal.css voltou: as cores moram em interface-neutra.css e a fonte em tipografia.css');
for (const f of [...PAGINAS, 'sw.js', 'estatistica/sw.js'])
  assert.ok(!/skin-royal\.css/.test(ler(f)), f + ' ainda pede skin-royal.css — com o arquivo removido, isso vira 404');

/* ------------------------- 2. toda página tem a tipografia, na mesma versão */
const sw = ler('sw.js');
const pedidoIndex = (ler('index.html').match(/tipografia\.css\?v=\d+/) || [])[0];
assert.ok(pedidoIndex, 'o index.html precisa pedir tipografia.css');
assert.ok(sw.includes("'./" + pedidoIndex + "'"), 'o sw.js precisa pré-carregar exatamente ' + pedidoIndex);
for (const f of PAGINAS)
  assert.ok(ler(f).includes(pedidoIndex), f + ' precisa pedir ' + pedidoIndex + ' (Arial, como o resto do app)');

/* ------------------------------ 3. nenhuma fonte baixada no app principal */
assert.ok(!/fonts\.googleapis|fonts\.gstatic/.test(ler('index.html')),
  'o index.html voltou a baixar fonte do Google: o app usa Arial, e o <link> trava a abertura sem sinal');

/* ----------------------------- 4. a fonte da tela não alcança as figuras */
const tipo = ler('tipografia.css');
const guarda = tipo.split('\n').find(l => l.startsWith('html body') && /!important/.test(l)) || '';
assert.ok(/font-family:Arial/.test(guarda), 'a regra que segura Arial nos elementos antigos sumiu');
assert.ok(!/[,(]\s*text\s*[,)]/.test(guarda),
  'a regra de Arial voltou a pegar <text> de SVG: a prancha e o croqui apareceriam diferentes do arquivo baixado');
assert.ok(!/svg|tspan/.test(guarda), 'a regra de Arial não deve mirar SVG');

/* ------------------------- 5. as cores da skin nascem na interface, nos 2 temas */
const neutra = ler('interface-neutra.css');
const bloco = sel => { const i = neutra.indexOf(sel + '{'); assert.ok(i >= 0, 'falta o bloco ' + sel); return neutra.slice(i, neutra.indexOf('}', i)); };
const claro = bloco(':root,html.light,html.ag-depth-light');
const escuro = bloco('html:not(.light):has(#authGate)');
for (const t of ['--skin-royal', '--skin-selection', '--skin-selection-ink', '--skin-glass', '--skin-card', '--skin-edge', '--skin-ink'])
  assert.ok(claro.includes(t + ':'), 'o tema claro precisa definir ' + t);
for (const t of ['--skin-glass', '--skin-card', '--skin-edge', '--skin-ink'])
  assert.ok(escuro.includes(t + ':'), 'o tema escuro precisa definir ' + t + ' — senão herda o vidro branco');
assert.match(claro, /--gp-glass:var\(--skin-glass\)/, 'o vidro antigo (--gp-glass) segue o da skin');

/* ------------------------ 6. ligado = azul de seleção, sem perder para o grupo escuro */
const iGrupo = neutra.indexOf('html :is(.con-btn.ativo,.con-btn.primary,.btn-save');
const iSel = neutra.indexOf('html :is(.con-btn.ativo,.con-btn.primary){background:var(--skin-selection)');
assert.ok(iGrupo >= 0 && iSel > iGrupo,
  'o botão ligado precisa vir DEPOIS do grupo escuro, com o mesmo seletor-base, para vencer na cascata');
assert.match(neutra, /html \.ag-row\.on\{background:var\(--skin-selection\)/, 'a linha ligada da gaveta é azul de seleção');

console.log('Skin consolidada: cores na interface, Arial sem download, figuras com a própria fonte OK.');
