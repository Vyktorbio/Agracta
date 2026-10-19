/* O AGRACTA NÃO DESENHA COM EMOJI.
 *
 * Relato de uso: "eu quero remover todos os emoticons do Agracta".
 *
 * Emoji quem desenha é o sistema do aparelho: sai colorido e lustroso no
 * iPhone, outro no Galaxy, outro no computador, e nenhum no traço dos ícones
 * do app (ic()). O pino do laboratório já tinha saído do emoji por isso
 * (test_lab_icone.js); esta regra estende o acordo para o app inteiro.
 *
 * O que conta como emoji é o que o aparelho pinta COLORIDO por conta própria:
 *  - caractere com Emoji_Presentation (📷 🔒 ✅ ⌛ ...);
 *  - qualquer caractere seguido do seletor de emoji U+FE0F (⚠️ ✏️ ⚖️);
 *  - pictogramas do plano suplementar (🌧 🖼 ...), que não têm versão de texto;
 *  - as mesmas coisas escritas ESCAPADAS (📍) ou como entidade HTML
 *    (&#128205;), que continuam sendo emoji na tela.
 * Ficam os glifos de TEXTO que o app usa de propósito: ✕ × ✓ ⚠ ☰ → · —.
 *
 * Onde o emoji era o único desenho de um botão ou etiqueta, entrou um ícone
 * do app (cadeado, lixeira, copiar, pino, régua, baixar). Onde ele enfeitava
 * um texto, saiu.
 *
 * Rodar: node tests/test_sem_emoji.js
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs'), path = require('path');

function fontes(dir) {
  let out = [];
  for (const n of fs.readdirSync(dir)) {
    const p = path.join(dir, n), rel = path.relative('.', p);
    if (/^(node_modules|tests|vendor|estatistica\/lib|\.git|docs|tools)(\/|$)/.test(rel)) continue;
    const st = fs.statSync(p);
    if (st.isDirectory()) out = out.concat(fontes(p));
    else if (/\.(js|html|css)$/.test(n)) out.push(rel);
  }
  return out;
}

const REGRAS = [
  ['emoji colorido', /\p{Emoji_Presentation}/gu],
  ['caractere com seletor de emoji (U+FE0F)', /.️/gu],
  ['pictograma do plano suplementar', /[\u{1F000}-\u{1FAFF}]/gu],
  ['emoji escapado em JS', /\\u[dD]83[cdeCDE]\\u[dD][c-fC-F][0-9a-fA-F]{2}/g],
  ['emoji como entidade HTML', /&#1[2-3]\d{4};|&#x1F[0-9a-fA-F]{3};|&#65039;/g],
];

const arquivos = fontes('.');
assert.ok(arquivos.includes('app.js') && arquivos.includes('index.html'), 'a varredura alcança o app');
const achados = [];
for (const f of arquivos) {
  const s = fs.readFileSync(f, 'utf8');
  for (const [nome, rx] of REGRAS) {
    for (const m of s.matchAll(rx)) {
      const linha = s.slice(0, m.index).split('\n').length;
      achados.push(f + ':' + linha + ' ' + nome + ' "' + m[0] + '"');
    }
  }
}
assert.deepEqual(achados, [], 'nenhum emoji nas telas do Agracta:\n' + achados.join('\n'));

/* A régua tem de reprovar o que ela existe para impedir... */
const pega = t => REGRAS.some(([, rx]) => { rx.lastIndex = 0; return rx.test(t); });
['📷 Fotos', '🔒', '⚠️ Atenção', '✏️', '\\ud83d\\udccd ALINHAR', '&#128205;', '🌧 Choveu'].forEach(t =>
  assert.ok(pega(t), 'a régua reprova ' + JSON.stringify(t)));
/* ...e deixar passar os glifos de texto que o app usa de propósito. */
['✕', '×', '✓', '⚠ aviso', '☰ Menu', '→', '·', '—', '＋ Nova', '⋮'].forEach(t =>
  assert.ok(!pega(t), 'a régua NÃO reprova o glifo de texto ' + JSON.stringify(t)));

/* Os ícones que entraram no lugar existem no ic(). */
const app = fs.readFileSync('app.js', 'utf8');
['lock', 'trash', 'copy', 'pin', 'ruler', 'download', 'archive', 'pencil', 'map'].forEach(n =>
  assert.match(app, new RegExp('\\n  ' + n + ":'<"), 'o ic() tem o desenho "' + n + '"'));

console.log('Sem emoji: ' + arquivos.length + ' arquivos do app varridos, nenhum emoji; os glifos de texto ficam OK.');
