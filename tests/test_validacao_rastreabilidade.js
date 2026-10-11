/* A VALIDAÇÃO NÃO PODE DESCOLAR DO CÓDIGO.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O docs/VALIDACAO-SISTEMA.md diz, para cada requisito (URS), quais testes
 * automáticos o cobrem e quais arquivos são de mudança crítica. Um documento
 * de validação que cita teste renomeado, apagado ou que não roda é pior que
 * nenhum: o inspetor lê "coberto por X" e X não existe mais. A versão 1.0
 * deste documento passou quatro meses citando tabelas e funções do Supabase
 * depois que o app tinha migrado para o Firebase, e nada reclamou.
 *
 * Aqui o portão reclama:
 *   1. todo URS definido na §4 aparece na matriz da §6;
 *   2. todo URS da matriz tem pelo menos um teste automático;
 *   3. todo teste citado existe E roda — no portão (tests/test_*.js,
 *      tests/test_*.py, ou chamado pelo nome no conferir.sh) ou nas regras
 *      do emulador (npm run test:regras);
 *   4. todo OQ/PQ/IQ citado na matriz existe nas tabelas do documento;
 *   5. todo arquivo da lista de mudança crítica (§11.2) existe;
 *   6. a tela "Conformidade & ISMS" do app.js ainda aponta para este arquivo;
 *   7. o documento não volta a falar do Supabase como estado atual.
 *
 * Rodar: node tests/test_validacao_rastreabilidade.js (da raiz)
 */
'use strict';
const fs = require('fs');
const path = require('path');

let ok = 0, falhas = 0;
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log('  ✓ ' + nome); }
  else { falhas++; console.log('  ✗ FALHA ' + nome + (detalhe ? '\n      ' + detalhe : '')); }
}

const DOC = 'docs/VALIDACAO-SISTEMA.md';
const doc = fs.readFileSync(DOC, 'utf8');
const conferir = fs.readFileSync('conferir.sh', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const regras = (pkg.scripts && pkg.scripts['test:regras']) || '';

function bloco(nome) {
  const ini = doc.indexOf('<!-- ' + nome + ':inicio -->');
  const fim = doc.indexOf('<!-- ' + nome + ':fim -->');
  return ini >= 0 && fim > ini ? doc.slice(ini, fim) : null;
}

/* ---- 1 e 2: requisitos e matriz ---------------------------------------- */
console.log('\nRequisitos e matriz');
const definidos = [...new Set((doc.match(/^\| (URS-\d+) \|/gm) || []).map(l => l.slice(2, -2).trim()))];
const matriz = bloco('matriz');
certo('a matriz está marcada no documento', !!matriz);
const linhas = (matriz || '').split('\n').filter(l => /^\| URS-\d+ \|/.test(l));
const naMatriz = {};
linhas.forEach(l => {
  const cel = l.split('|').map(s => s.trim());
  naMatriz[cel[1]] = { testes: (cel[2].match(/`([^`]+)`/g) || []).map(s => s.slice(1, -1)), manuais: cel[3] || '' };
});
/* URS definidos na §4 são os que aparecem na tabela de requisitos e NÃO só na
   matriz. Um requisito a preencher pelo laboratório (texto [ PREENCHER ]) fica
   de fora: ele ainda não tem conteúdo para ter teste. */
const requisitos = definidos.filter(id => {
  const re = new RegExp('^\\| ' + id + ' \\| (.+?) \\|', 'm');
  const m = doc.match(re);
  return m && !/PREENCHER/.test(m[1]) && !/`tests\//.test(m[1]);
});
certo('a §4 define requisitos (achados: ' + requisitos.length + ')', requisitos.length >= 10);
requisitos.forEach(id => {
  certo(id + ' está na matriz', !!naMatriz[id]);
  if (naMatriz[id]) certo(id + ' tem teste automático', naMatriz[id].testes.length > 0);
});
Object.keys(naMatriz).forEach(id => certo(id + ' da matriz é um requisito definido', requisitos.indexOf(id) >= 0));

/* ---- 3: todo teste citado existe e roda --------------------------------- */
console.log('\nTestes citados');
const citados = [...new Set([].concat(...Object.values(naMatriz).map(x => x.testes)))];
citados.forEach(t => {
  const existe = fs.existsSync(t);
  certo(t + ' existe', existe);
  if (!existe) return;
  const base = path.basename(t);
  const peloPortao = /^tests\/test_[^/]+\.(js|py)$/.test(t) || conferir.indexOf(t) >= 0;
  const pelasRegras = regras.indexOf(t) >= 0;
  certo(t + ' roda no portão ou nas regras', peloPortao || pelasRegras,
    base + ' não é tests/test_*.js nem *.py, não é chamado no conferir.sh e não está no test:regras');
});

/* ---- 4: identificadores manuais existem --------------------------------- */
console.log('\nTestes manuais citados');
const manuais = [...new Set(((matriz || '').match(/\b(?:OQ|PQ|IQ)-\d+\b/g) || []))];
manuais.forEach(id => {
  certo(id + ' tem linha própria no documento', new RegExp('^\\| ' + id + ' \\|', 'm').test(doc));
});

/* ---- 5: arquivos de mudança crítica existem ----------------------------- */
console.log('\nArquivos de mudança crítica');
const criticos = bloco('criticos');
certo('a lista de arquivos críticos está marcada no documento', !!criticos);
const arquivos = [...new Set(((criticos || '').match(/`([^`]+\.(?:js|rules))`/g) || []).map(s => s.slice(1, -1)))];
certo('a lista tem arquivos (achados: ' + arquivos.length + ')', arquivos.length >= 10);
arquivos.forEach(a => certo(a + ' existe', fs.existsSync(a)));

/* ---- 6: o app aponta para cá -------------------------------------------- */
console.log('\nLigação com o app');
const app = fs.readFileSync('app.js', 'utf8');
certo('a tela "Conformidade & ISMS" cita ' + DOC, app.indexOf(DOC) >= 0);

/* ---- 7: sem Supabase como estado atual ---------------------------------- */
console.log('\nEstado atual');
/* O histórico do documento pode dizer que a 1.0 era da época do Supabase. Fora
   dele, o nome não deve aparecer. */
const semHistorico = doc.split('## Histórico deste documento')[0];
certo('o corpo do documento não descreve o Supabase', !/supabase|app_state_history|criar-tecnico|\bRLS\b/i.test(semHistorico));
const pacote = ['docs/conformidade/README.md', 'docs/conformidade/integridade-dados-ALCOA.md',
  'docs/conformidade/SOP-acesso-assinatura-backup.md', 'docs/conformidade/ISMS-ISO27001.md'];
pacote.forEach(p => {
  if (!fs.existsSync(p)) { certo(p + ' existe', false); return; }
  const corpo = fs.readFileSync(p, 'utf8').split(/^## Histórico/m)[0];
  certo(p + ' não descreve o Supabase como atual', !/app_state_history|criar-tecnico|perfis` *\+ *RLS|Supabase Auth/i.test(corpo));
});

console.log('\n' + ok + ' ok, ' + falhas + ' falha(s)');
if (falhas) process.exit(1);
