/* Bibliotecas de planilha sob demanda (48ª publicação).
 *
 * O SheetJS (~930 KB) e o JSZip (~95 KB) saíram do index.html: o celular lia
 * quase 1 MB de JavaScript a cada abertura para uma função usada de vez em
 * quando. Agora o app.js os carrega na primeira exportação ou importação.
 *
 * O que este teste tranca:
 *   1. o index.html não os carrega na abertura;
 *   2. cada uso no app.js passa antes pelo carregador;
 *   3. a URL que o carregador pede é a MESMA do pré-cache do sw.js — senão,
 *      offline no campo, a planilha não sai;
 *   4. o carregador funciona: resolve, reaproveita o pedido em andamento,
 *      cai na reserva (CDN) se a cópia local falhar, e deixa tentar de novo
 *      depois de uma falha.
 */
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

let passou = 0;
function ok(cond, msg) { assert.ok(cond, msg); passou++; console.log('  ok    ' + msg); }

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
const sw = fs.readFileSync('sw.js', 'utf8');

console.log('--- Abertura do app ---');
ok(!/xlsx\.full\.min\.js/.test(html), 'o index.html não carrega o SheetJS na abertura');
ok(!/jszip\.min\.js/.test(html), 'o index.html não carrega o JSZip na abertura');

console.log('--- Pré-cache: mesma URL do carregador ---');
const assets = (sw.match(/var ASSETS\s*=\s*\[([\s\S]*?)\]/) || [])[1] || '';
ok(/'\.\/vendor\/xlsx\.full\.min\.js'/.test(assets) && /_libSob\('XLSX','\.\/vendor\/xlsx\.full\.min\.js'/.test(app),
  'SheetJS: o carregador pede a URL que o sw.js pré-carrega');
ok(/'\.\/vendor\/jszip\.min\.js'/.test(assets) && /_libSob\('JSZip','\.\/vendor\/jszip\.min\.js'/.test(app),
  'JSZip: o carregador pede a URL que o sw.js pré-carrega');

console.log('--- Todo uso passa pelo carregador ---');
/* Funções que leem ou gravam planilha direto. Cada uma precisa esperar a
   biblioteca, ou ser chamada só de dentro de quem esperou. */
function corpo(nome) {
  const i = app.search(new RegExp('(async )?function ' + nome + '\\('));
  assert.ok(i >= 0, 'função ' + nome + ' sumiu do app.js');
  return app.slice(i, i + 900);
}
ok(/await _libJSZip\(\)/.test(corpo('downloadStudySinergista')), 'protocolo Sinergista espera o JSZip');
ok(/await _libXLSX\(\)/.test(corpo('downloadStudyWorkbook')), 'modelo Agracta espera o SheetJS');
ok(/_libXLSX\(\)\.then/.test(corpo('_impFromFile')), 'importar planilha (assistente) espera o SheetJS');
ok(/_libXLSX\(\)\.then/.test(corpo('importStudyProtocolFile')), 'importar protocolo espera o SheetJS');
ok(/_libXLSX\(\)/.test(corpo('_loadSheetJS')), 'exportar ensaios (_loadSheetJS) usa o mesmo carregador');
ok(!/typeof XLSX==='undefined'|!window\.XLSX\)throw|!window\.JSZip\)throw/.test(app),
  'nenhum ponto exige que a biblioteca já tenha vindo na abertura');

console.log('--- O carregador funciona ---');
const ini = app.indexOf('var _libPromessas={};');
const fim = app.indexOf('function _loadSheetJS(cb)');
assert.ok(ini >= 0 && fim > ini, 'carregador não encontrado no app.js');
const codigo = app.slice(ini, fim);

function ambiente(comportamento) {
  const pedidos = [];
  const janela = {};
  const documento = {
    createElement() { return {}; },
    head: {
      appendChild(el) {
        pedidos.push(el.src);
        setTimeout(() => {
          const r = comportamento(el.src);
          if (r === 'erro') el.onerror();
          else { if (r) janela[r] = { nome: r }; el.onload(); }
        }, 1);
      },
    },
  };
  const ctx = { window: janela, document: documento, Promise, Error };
  vm.createContext(ctx);
  vm.runInContext(codigo + '\nwindow._libSob=_libSob;window._libXLSX=_libXLSX;window._libJSZip=_libJSZip;', ctx);
  return { janela, pedidos };
}

(async () => {
  {
    const { janela, pedidos } = ambiente(src => (src.indexOf('xlsx') >= 0 ? 'XLSX' : 'JSZip'));
    const [a, b] = await Promise.all([janela._libXLSX(), janela._libXLSX()]);
    ok(a === janela.XLSX && b === a, 'resolve com a biblioteca');
    ok(pedidos.length === 1, 'dois cliques ao mesmo tempo baixam uma vez só');
    await janela._libXLSX();
    ok(pedidos.length === 1, 'depois de carregada, não pede de novo');
    ok(pedidos[0] === './vendor/xlsx.full.min.js', 'a cópia local vem primeiro (offline)');
  }
  {
    const { janela, pedidos } = ambiente(src => (src.indexOf('./vendor/') === 0 ? 'erro' : 'XLSX'));
    await janela._libXLSX();
    ok(pedidos.length === 2 && /cdn\.sheetjs\.com/.test(pedidos[1]), 'cópia local faltando: cai no CDN');
  }
  {
    let vez = 0;
    const { janela, pedidos } = ambiente(() => (vez++ === 0 ? 'erro' : 'JSZip'));
    let falhou = false;
    try { await janela._libJSZip(); } catch (e) { falhou = /JSZip/.test(e.message); }
    ok(falhou, 'sem reserva, a falha chega à tela com o nome da biblioteca');
    await janela._libJSZip();
    ok(pedidos.length === 2, 'depois da falha, o próximo clique tenta de novo');
  }
  {
    const { janela, pedidos } = ambiente(() => null);
    let falhou = false;
    try { await janela._libJSZip(); } catch (e) { falhou = true; }
    ok(falhou && pedidos.length === 1, 'arquivo que carrega sem criar a biblioteca conta como falha');
  }
  console.log('\n' + passou + ' verificações, todas certas.');
})().catch(e => { console.error('FALHA', e.message); process.exitCode = 1; });
