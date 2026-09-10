/* Os controles novos precisam EXISTIR e estar ALCANÇÁVEIS.
 *
 * O buraco anterior foi exatamente esse: o motor tinha testemunha, modelo
 * misto e medidas repetidas, os testes do motor passavam, e a tela escondia
 * os seletores com display:none. Nenhum teste renderizava CSS, então ninguém
 * viu. Este renderiza.
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM} = require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

const html = fs.readFileSync('estatistica/index.html', 'utf8')
  .replace(/<link rel="stylesheet"[^>]*>/, '<style>' + fs.readFileSync('estatistica/styles.css', 'utf8') + '</style>');

for (const motor of [false, true]) {
  const dom = new JSDOM(html, {url: 'https://agracta.test/estatistica/index.html' + (motor ? '?agracta_engine=1' : ''),
                               runScripts: 'dangerously'});
  const w = dom.window, vis = sel => {
    const e = w.document.querySelector(sel);
    assert.ok(e, 'sumiu do HTML: ' + sel);
    return w.getComputedStyle(e).display !== 'none';
  };
  // Estado depois de carregar dados: o app tira o .oculto destes cartões.
  for (const sel of ['#card-opcoes', '#card-planejar']) w.document.querySelector(sel).classList.remove('oculto');
  // A engrenagem automática esconde tudo; a tela de configurar mostra tudo.
  assert.equal(vis('#card-opcoes'), !motor, '#card-opcoes');
  assert.equal(vis('#card-planejar'), !motor, '#card-planejar — planejar é a pergunta de antes do ensaio');
  w.close();
}

/* Os três recursos precisam ter porta na tela, e cada uma no cartão certo. */
const dom = new JSDOM(html, {url: 'https://agracta.test/estatistica/index.html', runScripts: 'dangerously'});
const d = dom.window.document;
const opcoes = id => { const e = d.getElementById(id); assert.ok(e, 'falta #' + id); return [...e.options].map(o => o.value); };

// 1. curva de dose contínua
assert.ok(opcoes('opt-modelo').includes('curva'), 'falta a curva de dose em #opt-modelo');
// 2. equivalência e não-inferioridade
const cmp = opcoes('opt-comparacao');
assert.ok(cmp.includes('equivalencia') && cmp.includes('nao_inferioridade'), cmp);
// a margem tem de estar no mesmo cartão das opções, senão some junto no embed
assert.ok(d.getElementById('opt-margem').closest('#card-opcoes'), 'a margem precisa morar em #card-opcoes');
assert.ok(opcoes('opt-margem-tipo').includes('percent'));
// 3. planejamento, com todos os campos que o motor exige
for (const id of ['pl-k', 'pl-delta', 'pl-var', 'pl-var-tipo', 'pl-media', 'pl-desenho', 'pl-familia', 'pl-poder', 'pl-alfa'])
  assert.ok(d.getElementById(id) && d.getElementById(id).closest('#card-planejar'), 'falta #' + id + ' em #card-planejar');
assert.ok(d.getElementById('btn-planejar').closest('#card-planejar'));

/* A margem só aparece quando a pergunta é de equivalência -- e precisa
   aparecer, senão o usuário escolhe a pergunta e não tem onde responder.
   O jsdom não busca o app.js (script externo), então a função é extraída do
   arquivo e exercitada contra este DOM, como os outros testes de tela fazem. */
const app = fs.readFileSync('estatistica/app.js', 'utf8');
function pega(nome){
  const i = app.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, 'falta a função ' + nome);
  let prof = 0, abriu = false, j = i;
  for (; j < app.length; j++) {
    if (app[j] === '{') { prof++; abriu = true; }
    else if (app[j] === '}' && --prof === 0 && abriu) { j++; break; }
  }
  return app.slice(i, j);
}
const w = dom.window;
w.$ = sel => w.document.querySelector(sel);
w.eval(pega('atualizarCamposComparacao'));
assert.equal(d.getElementById('lbl-margem').hidden, true, 'a margem começa escondida');
d.getElementById('opt-comparacao').value = 'equivalencia';
w.eval('atualizarCamposComparacao()');
assert.equal(d.getElementById('lbl-margem').hidden, false, 'escolher equivalência tem de revelar a margem');
assert.equal(d.getElementById('dica-margem').hidden, false, 'e o aviso de que ela vem antes do resultado');
d.getElementById('opt-comparacao').value = 'nao_inferioridade';
w.eval('atualizarCamposComparacao()');
assert.equal(d.getElementById('lbl-margem').hidden, false, 'não-inferioridade também precisa de margem');
d.getElementById('opt-comparacao').value = 'todos';
w.eval('atualizarCamposComparacao()');
assert.equal(d.getElementById('lbl-margem').hidden, true);
/* E o listener tem de estar registrado, senão nada disso acontece na tela. */
assert.ok(/#opt-comparacao['"]\)\.addEventListener\('change', *atualizarCamposComparacao\)/.test(app)
       || app.includes("addEventListener('change', atualizarCamposComparacao)"),
  'o seletor de comparação precisa chamar atualizarCamposComparacao');
w.close();

/* O motor precisa ser entregue ao aparelho: os .py novos na lista de arquivos
   que o app busca, e na lista que o service worker pré-carrega. */
const sw = fs.readFileSync('estatistica/sw.js', 'utf8');
for (const py of ['poder.py', 'equivalencia.py', 'dosecontinua.py']) {
  assert.ok(fs.existsSync('estatistica/bioengine/' + py), 'falta o arquivo ' + py);
  assert.ok(app.includes('"' + py + '"'), py + ' fora de ARQ_ENGINE — o app não vai buscá-lo');
  assert.ok(sw.includes('bioengine/' + py), py + ' fora do SHELL do sw.js');
}
/* E a ponte tem de existir, senão o botão de planejar chama o vazio. */
assert.ok(app.includes('_run_planejar'), 'falta a ponte _run_planejar');
assert.ok(app.includes('from bioengine import planejar'), 'a ponte precisa importar planejar');

console.log('Tela: curva, equivalência e planejamento com porta visível, margem condicional e motores entregues OK.');
