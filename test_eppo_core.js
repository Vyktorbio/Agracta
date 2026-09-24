'use strict';
/* EppoCore: tabela → código, sem aproximação; cultura pelo nome do app. */
const assert = require('node:assert/strict');
const P = require('./vendor/eppo-core');
const O = require('./vendor/observacao-core');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const tab = { culturas: { 'Soja': 'Glycine max', 'Cana de açúcar': 'Saccharum', 'Citros': 'Citrus', 'Morango': 'Fragaria x ananassa' },
  codigos: { 'Glycine max': { eppo: 'GLXMA' }, 'Saccharum': { eppo: 'SACSS' }, 'Citrus': { eppo: 'CIDSS' },
             'Fragaria x ananassa': { eppo: 'FRAAN' }, 'Euschistus heros': { eppo: 'EUSCHE' } } };
const e = P.criar(tab);
ok(e('Soja', 'cultura') === 'GLXMA' && e('SOJA', 'cultura') === 'GLXMA', 'cultura pelo nome do app');
ok(e('Cana-de-açúcar', 'cultura') === 'SACSS' && e('CITROS', 'cultura') === 'CIDSS', 'hífen, acento e caixa');
ok(e('Glycine max', 'cultura') === 'GLXMA', 'binômio direto também serve');
ok(e('Fragaria × ananassa', 'cultura') === 'FRAAN', 'sinal de híbrido');
ok(e('euschistus  heros', 'alvo') === 'EUSCHE', 'alvo pelo binômio');
ok(e('percevejo-marrom', 'alvo') === null && e('Euschistus', 'alvo') === null, 'sem aproximação');
ok(e('', 'alvo') === null && P.criar(null)('Soja', 'cultura') === null, 'vazio e sem tabela: null');
ok(e.total === 5, 'total de códigos');
const real = P.criar(require('./data/eppo.json'));
const cod = real('Soja', 'cultura');
ok(cod === null || O.codigoEppo(cod) === cod, 'tabela publicada carrega (vazia até o token, ou com código válido)');
/* ligado à observação canônica */
const obs = O.extrair({ id: 'S', numRepeticoes: 1, cultura: 'Soja', alvo: 'Percevejo-marrom', alvoSci: 'Euschistus heros',
  tratamentos: [{ id: 'T1' }], avaliacoes: [{ id: 'A', variaveis: ['N'], notas: { T1R1: { N: 3 } } }] }, { qid: 'Q' }, { eppo: e });
ok(obs[0].cultura.eppo === 'GLXMA' && obs[0].alvo.eppo === 'EUSCHE' && obs[0].alvo.fonte === 'tabela', 'observação resolve pela tabela');
(async () => {
  const g = globalThis.fetch; globalThis.fetch = () => Promise.resolve({ ok: false, status: 404 });
  delete require.cache[require.resolve('./vendor/eppo-core')];
  const P2 = require('./vendor/eppo-core');
  const f = await P2.carregar();
  ok(f('Soja', 'cultura') === null && f.total === 0, 'sem tabela no servidor: nunca falha, só não resolve');
  globalThis.fetch = g;
  console.log('EppoCore: ' + n + ' verificações OK.');
})();
