/* O Conhecimento tem UMA porta, e ela tem de existir.
 *
 * Ele estava em dois lugares: o menu e um botão da barra que, na verdade, abria
 * OUTRO painel de estudos — sem gráficos, sem vista do campo, sem estatística.
 * Duas listas com poderes diferentes ensinam a procurar no lugar errado, e foi
 * o que aconteceu. Agora o botão da barra abre o Conhecimento e o menu não
 * repete a entrada.
 *
 * Tirar a porta do menu só é seguro se a outra for confiável. É isso que este
 * teste tranca: a barra é construída ANTES do mapa e em try próprio, então um
 * render() que estoure não leva a navegação embora junto.
 *
 * Rodar: node test_atalho_conhecimento.js
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs');

const app = fs.readFileSync('app.js', 'utf8');
const menu = fs.readFileSync('ui-campo.js', 'utf8');

function pega(src, nome){
  const i = src.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, 'falta a função ' + nome);
  let prof = 0, abriu = false, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') { prof++; abriu = true; }
    else if (src[j] === '}' && --prof === 0 && abriu) { j++; break; }
  }
  return src.slice(i, j);
}

/* ---------------------------------------------- 1. o botão abre o Conhecimento */
const inject = pega(app, 'injectTopbarButtons');
assert.match(inject, /abrirConhecimento\(\{aba:'estudos'\}\)/,
  'o botão da barra tem de abrir o Conhecimento na aba Estudos');
assert.ok(!/openStudiesPanel/.test(inject),
  'o botão NÃO pode mais abrir o painel paralelo de estudos: era ele que não tinha os gráficos');
assert.match(inject, /Conhecimento<\/span>/, 'e o rótulo tem de dizer Conhecimento');
/* Sem o Conhecimento carregado o botão avisa, em vez de não fazer nada — um
   botão que não responde é indistinguível de um app travado. */
assert.match(inject, /typeof abrirConhecimento==='function'/,
  'o botão precisa checar se o Conhecimento carregou');
assert.match(inject, /_stxToast/, 'e avisar quando não carregou');

/* ------------------------------- 2. o menu não repete a entrada */
assert.ok(!/abrirConhecimento/.test(menu),
  'o Conhecimento saiu do menu: duas portas para a mesma tela foi o que já confundiu');
/* Mas o resto do menu continua de pé — remover uma linha não pode levar vizinhas. */
['abrirItens', 'exportData', 'openBackups'].forEach(a => assert.ok(menu.includes(a),
  'o menu perdeu ' + a + ' junto'));

/* --------------- 3. a navegação é construída antes do mapa, em try próprio */
/* Comentários fora antes de medir ordem: o comentário que EXPLICA a ordem
   menciona render(), e um indexOf ingênuo casava com ele em vez da chamada. */
const semComentario = t => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
const init = semComentario(pega(app, 'init'));
const iNav = init.indexOf('injectTopbarButtons()');
const iRender = init.indexOf('render()');
assert.ok(iNav >= 0 && iRender >= 0, 'init precisa ter os dois');
assert.ok(iNav < iRender,
  'a navegação tem de ser construída ANTES do render: um mapa que estoure não pode levar a barra embora');
assert.match(init.slice(Math.max(0, iNav - 40), iNav + 60), /try\{\s*injectTopbarButtons\(\);\s*\}catch/,
  'e em try próprio, senão ela volta a depender do que vem depois');

/* Prova de comportamento: com render() estourando, o botão ainda é criado.
   Só as duas funções, sem o resto do app — é a fiação que está sob teste. */
let JSDOM; try { ({JSDOM} = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

const dom = new JSDOM('<!doctype html><html><body><div class="top-bar">' +
  '<div class="top-bar-right"><button id="btnAgenda">Agenda</button></div></div>' +
  '<span id="dateInfo"></span></body></html>',
  {url: 'https://agracta.test', runScripts: 'outside-only'});
const w = dom.window;
w.eval('function ic(n,s){return "<svg></svg>";}');
w.eval('function openToday(){} function openSearch(){}');
w.eval('var abriu=null; function abrirConhecimento(op){abriu=op;}');
w.eval(inject);
w.eval('injectTopbarButtons();');

const b = w.document.querySelector('.btn-studies');
assert.ok(b, 'o botão tem de existir na barra');
assert.match(b.textContent, /Conhecimento/);
assert.equal(b.getAttribute('aria-label'), 'Conhecimento experimental');
b.onclick();
assert.deepEqual(JSON.parse(JSON.stringify(w.eval('abriu'))), {aba: 'estudos'},
  'clicar tem de abrir o Conhecimento na aba Estudos');
/* Chamar duas vezes não duplica os botões. */
w.eval('injectTopbarButtons();');
assert.equal(w.document.querySelectorAll('.btn-studies').length, 1, 'nada de botão duplicado');
w.close();

console.log('Atalho do Conhecimento: botão único na barra, construído antes do mapa, menu sem entrada repetida OK.');
