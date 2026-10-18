/* REGRAS DO BANCO NO AR = REPOSITÓRIO (lacuna L8, IQ-04)
 *
 * O tools/regras-banco.cjs confere e publica o firestore.rules pela API de
 * regras do Firebase. Aqui ele roda contra uma API FALSA, em memória, que se
 * comporta como a de verdade nos pontos que importam: conjunto de regras
 * criado ganha nome e hora, a versão no ar aponta para um conjunto, erro de
 * compilação volta 400 com linha e coluna, nome inexistente volta 404.
 *
 * O que não pode quebrar:
 *   - conferir diz IGUAIS só quando o texto é o mesmo (fim de linha não conta);
 *   - publicar não mexe em nada se já está no ar, e quando publica manda o
 *     arquivo byte a byte e confere a leitura de volta;
 *   - erro de compilação não troca o que está no ar;
 *   - voltar só aceita uma versão deste projeto;
 *   - a chave da conta de serviço vira um JWT assinado de verdade;
 *   - os workflows mantêm a ordem: testes no emulador → aprovação → publicar,
 *     e a conferência semanal não enxerga a chave que publica.
 *
 * Rodar: node tests/test_regras_banco.js (da raiz)
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const R = require('../tools/regras-banco.cjs');

let ok = 0;
const pendentes = [];
function teste(nome, fn) { pendentes.push([nome, fn]); }

/* ---- API falsa --------------------------------------------------------- */
function apiFalsa(projeto, opcoes) {
  opcoes = opcoes || {};
  const rulesets = {};
  let release = null, seq = 0;
  const chamadas = [];
  const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
  function criar(conteudo) {
    const nome = 'projects/' + projeto + '/rulesets/rs' + (++seq);
    rulesets[nome] = { name: nome, createTime: '2026-10-18T12:00:0' + seq + 'Z', source: { files: [{ name: 'firestore.rules', content: conteudo }] } };
    return nome;
  }
  if (opcoes.noAr != null) release = { name: 'projects/' + projeto + '/releases/cloud.firestore', rulesetName: criar(opcoes.noAr), updateTime: '2026-10-01T10:00:00Z' };
  async function fetchFn(url, init) {
    const metodo = (init && init.method) || 'GET';
    const corpo = init && init.body ? JSON.parse(init.body) : null;
    chamadas.push({ metodo, url, corpo });
    assert.match(init.headers.Authorization, /^Bearer tok-/);
    const caminho = url.replace('https://firebaserules.googleapis.com/v1/', '');
    if (metodo === 'GET' && /\/releases\/cloud\.firestore$/.test(caminho))
      return release ? resp(200, release) : resp(404, { error: { code: 404, message: 'Release not found' } });
    if (metodo === 'GET' && /\/rulesets\//.test(caminho))
      return rulesets[caminho] ? resp(200, rulesets[caminho]) : resp(404, { error: { code: 404, message: 'Ruleset not found' } });
    if (metodo === 'POST' && /\/rulesets$/.test(caminho)) {
      const c = corpo.source.files[0].content;
      if (/ERRO_DE_COMPILACAO/.test(c)) return resp(400, { error: { code: 400, message: 'Syntax error', details: [{ issues: [{ sourcePosition: { line: 7, column: 3 }, description: "Unexpected 'ERRO_DE_COMPILACAO'." }] }] } });
      return resp(200, rulesets[criar(c)]);
    }
    if (metodo === 'PATCH' && /\/releases\/cloud\.firestore$/.test(caminho)) {
      if (opcoes.ignorarTroca) return resp(200, release);
      if (!rulesets[corpo.release.rulesetName]) return resp(404, { error: { message: 'Ruleset not found' } });
      release = Object.assign({}, release, { rulesetName: corpo.release.rulesetName, updateTime: '2026-10-18T12:30:00Z' });
      return resp(200, release);
    }
    if (metodo === 'POST' && /\/releases$/.test(caminho)) {
      release = { name: corpo.name, rulesetName: corpo.rulesetName, updateTime: '2026-10-18T12:30:00Z' };
      return resp(200, release);
    }
    if (opcoes.negar) return resp(403, { error: { message: 'The caller does not have permission' } });
    throw new Error('chamada inesperada: ' + metodo + ' ' + url);
  }
  return { fetchFn, chamadas, rulesets, get release() { return release; }, criar };
}

const REGRAS = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{db}/documents {\n    allow read: if false;\n  }\n}\n";
const MUDADA = REGRAS.replace('allow read: if false;', 'allow read: if request.auth != null;');

/* ---- texto ------------------------------------------------------------- */
teste('fim de linha e \\n final não contam como diferença', () => {
  assert.equal(R.normalizar(REGRAS.replace(/\n/g, '\r\n')), R.normalizar(REGRAS));
  assert.equal(R.normalizar(REGRAS.replace(/\n$/, '')), R.normalizar(REGRAS));
  assert.equal(R.sha256(REGRAS + '\n\n'), R.sha256(REGRAS));
  assert.notEqual(R.sha256(REGRAS.replace('false', 'false ')), R.sha256(REGRAS), 'um espaço dentro da linha muda a regra');
});

teste('a diferença aponta a linha que mudou nos dois lados', () => {
  const d = R.diferenca(REGRAS, MUDADA);
  assert.equal(d.length, 2);
  assert.match(d[0], /^-\s+4 │ +allow read: if false;/);
  assert.match(d[1], /^\+\s+4 │ +allow read: if request\.auth != null;/);
  const longa = R.diferenca('', Array.from({ length: 100 }, (_, i) => 'l' + i).join('\n'), 10);
  assert.equal(longa.length, 11);
  assert.match(longa[10], /e mais \d+ linha/);
});

/* ---- conferir ---------------------------------------------------------- */
teste('conferir: iguais, diferentes e nada no ar', async () => {
  const f1 = apiFalsa('p1', { noAr: REGRAS.replace(/\n/g, '\r\n') });
  const r1 = await R.conferir(R.cliente(f1.fetchFn, 'tok-1', 'p1'), REGRAS);
  assert.equal(r1.resultado, 'IGUAIS');
  assert.equal(r1.noAr.ruleset, 'projects/p1/rulesets/rs1');
  assert.equal(r1.noAr.sha256, r1.sha256Repositorio);
  assert.ok(f1.chamadas.every(c => c.metodo === 'GET'), 'conferir só lê');

  const f2 = apiFalsa('p1', { noAr: REGRAS });
  const r2 = await R.conferir(R.cliente(f2.fetchFn, 'tok-1', 'p1'), MUDADA);
  assert.equal(r2.resultado, 'DIFERENTES');
  assert.notEqual(r2.noAr.sha256, r2.sha256Repositorio);
  assert.equal(r2.diferenca.length, 2);

  const f3 = apiFalsa('p1');
  const r3 = await R.conferir(R.cliente(f3.fetchFn, 'tok-1', 'p1'), REGRAS);
  assert.equal(r3.resultado, 'NADA_NO_AR');
  assert.equal(r3.noAr, null);
});

/* ---- publicar ---------------------------------------------------------- */
teste('publicar: se já está no ar, não cria nem troca nada', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS });
  const r = await R.publicar(R.cliente(f.fetchFn, 'tok-1', 'p1'), REGRAS);
  assert.equal(r.resultado, 'JA_ESTAVA_NO_AR');
  assert.ok(f.chamadas.every(c => c.metodo === 'GET'));
});

teste('publicar: cria a versão com o arquivo exato, troca a do ar e confere', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS });
  const comCRLF = MUDADA.replace(/\n/g, '\r\n');
  const r = await R.publicar(R.cliente(f.fetchFn, 'tok-1', 'p1'), comCRLF);
  assert.equal(r.resultado, 'PUBLICADO');
  const post = f.chamadas.find(c => c.metodo === 'POST');
  assert.equal(post.corpo.source.files[0].content, comCRLF, 'vai byte a byte, sem normalizar');
  assert.equal(post.corpo.source.files[0].name, 'firestore.rules');
  const patch = f.chamadas.find(c => c.metodo === 'PATCH');
  assert.equal(patch.corpo.release.name, 'projects/p1/releases/cloud.firestore');
  assert.equal(r.antes.ruleset, 'projects/p1/rulesets/rs1');
  assert.equal(r.depois.ruleset, 'projects/p1/rulesets/rs2');
  assert.equal(r.depois.sha256, r.sha256Repositorio);
  assert.equal(f.release.rulesetName, 'projects/p1/rulesets/rs2');
  assert.equal(r.diferenca.length, 2, 'o registro guarda o que mudou');
});

teste('publicar: projeto sem regra cria a versão no ar (POST, não PATCH)', async () => {
  const f = apiFalsa('p1');
  const r = await R.publicar(R.cliente(f.fetchFn, 'tok-1', 'p1'), REGRAS);
  assert.equal(r.resultado, 'PUBLICADO');
  assert.equal(r.antes, null);
  assert.ok(f.chamadas.some(c => c.metodo === 'POST' && /\/releases$/.test(c.url)));
  assert.ok(!f.chamadas.some(c => c.metodo === 'PATCH'));
});

teste('publicar: leitura de volta que não confere não passa como publicado', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS, ignorarTroca: true });
  const r = await R.publicar(R.cliente(f.fetchFn, 'tok-1', 'p1'), MUDADA);
  assert.equal(r.resultado, 'PUBLICADO_SEM_CONFERIR');
});

teste('publicar: erro de compilação não troca o que está no ar e diz a linha', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS });
  const quebrada = REGRAS.replace('allow read', 'ERRO_DE_COMPILACAO allow read');
  await assert.rejects(R.publicar(R.cliente(f.fetchFn, 'tok-1', 'p1'), quebrada), (e) => {
    assert.equal(e.status, 400);
    return true;
  });
  assert.equal(f.release.rulesetName, 'projects/p1/rulesets/rs1', 'o que estava no ar continua');
  assert.ok(!f.chamadas.some(c => c.metodo === 'PATCH'));
});

/* ---- voltar ------------------------------------------------------------ */
teste('voltar: só aceita versão deste projeto, com nome completo', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS });
  const api = R.cliente(f.fetchFn, 'tok-1', 'p1');
  await assert.rejects(R.voltar(api, 'rs1', REGRAS), /nome completo/);
  await assert.rejects(R.voltar(api, 'projects/outro/rulesets/rs1', REGRAS), /outro projeto/);
  await assert.rejects(R.voltar(api, 'projects/p1/rulesets/naoexiste', REGRAS), (e) => e.status === 404);
  assert.equal(f.release.rulesetName, 'projects/p1/rulesets/rs1');
});

teste('voltar: põe a anterior no ar e mostra a diferença para o repositório', async () => {
  const f = apiFalsa('p1', { noAr: REGRAS });
  const api = R.cliente(f.fetchFn, 'tok-1', 'p1');
  await R.publicar(api, MUDADA);
  const r = await R.voltar(api, 'projects/p1/rulesets/rs1', MUDADA);
  assert.equal(r.resultado, 'VOLTOU');
  assert.equal(r.antes.ruleset, 'projects/p1/rulesets/rs2');
  assert.equal(r.depois.ruleset, 'projects/p1/rulesets/rs1');
  assert.equal(r.diferenca.length, 2, 'depois de voltar, repositório e banco ficam diferentes de propósito');
  const r2 = await R.voltar(api, 'projects/p1/rulesets/rs1', MUDADA);
  assert.equal(r2.resultado, 'JA_ESTAVA_NO_AR');
});

/* ---- credencial -------------------------------------------------------- */
teste('a chave da conta de serviço vira um JWT RS256 assinado de verdade', async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const chave = { client_email: 'regras@p1.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  let visto = null;
  const fetchFn = async (url, init) => {
    visto = { url, init };
    const jwt = decodeURIComponent(init.body.match(/assertion=([^&]+)/)[1]);
    const [cab, corpo, ass] = jwt.split('.');
    const ok64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    const valido = crypto.createVerify('RSA-SHA256').update(cab + '.' + corpo).verify(publicKey, ok64(ass));
    const c = JSON.parse(ok64(corpo).toString());
    if (!valido || c.iss !== chave.client_email || c.exp - c.iat !== 3600 || !/cloud-platform/.test(c.scope))
      return { ok: false, status: 400, json: async () => ({ error: 'invalid_grant' }) };
    return { ok: true, status: 200, json: async () => ({ access_token: 'tok-da-chave' }) };
  };
  const r = await R.tokenDaChave(JSON.stringify(chave), fetchFn, Date.parse('2026-10-18T12:00:00Z'));
  assert.equal(r.token, 'tok-da-chave');
  assert.equal(r.conta, chave.client_email);
  assert.equal(visto.url, 'https://oauth2.googleapis.com/token');
  assert.match(visto.init.body, /grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer/);
  await assert.rejects(R.tokenDaChave('não é json', fetchFn), /JSON válido/);
  await assert.rejects(R.tokenDaChave('{}', fetchFn), /client_email/);
  const recusa = async () => ({ ok: false, status: 400, json: async () => ({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }) });
  await assert.rejects(R.tokenDaChave(JSON.stringify(chave), recusa), /Invalid JWT Signature/);
});

/* ---- linha de comando -------------------------------------------------- */
function raizFalsa(regras) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'regras-banco-'));
  fs.writeFileSync(path.join(d, 'firestore.rules'), regras);
  fs.writeFileSync(path.join(d, '.firebaserc'), JSON.stringify({ projects: { default: 'p1' } }));
  return d;
}
async function silencioso(fn) {
  const log = console.log, err = console.error, saida = [];
  console.log = (...a) => saida.push(a.join(' ')); console.error = (...a) => saida.push(a.join(' '));
  try { return { codigo: await fn(), saida: saida.join('\n') }; } finally { console.log = log; console.error = err; }
}

teste('linha de comando: códigos de saída, registro e resumo do CI', async () => {
  const raiz = raizFalsa(MUDADA);
  const env = { FIREBASE_TOKEN_ACESSO: 'tok-cli', GITHUB_SHA: 'abc123', GITHUB_ACTOR: 'Vyktorbio', GITHUB_RUN_ID: '42', GITHUB_REPOSITORY: 'Vyktorbio/Agracta', GITHUB_STEP_SUMMARY: path.join(raiz, 'resumo.md') };
  const f = apiFalsa('p1', { noAr: REGRAS });

  let r = await silencioso(() => R.principal(['conferir'], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 1, 'diferentes reprova a conferência');
  assert.match(r.saida, /NÃO são as do repositório/);

  const reg = path.join(raiz, 'registro.json');
  r = await silencioso(() => R.principal(['publicar', '--registro', reg], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 0);
  const j = JSON.parse(fs.readFileSync(reg, 'utf8'));
  assert.equal(j.resultado, 'PUBLICADO');
  assert.equal(j.projeto, 'p1');
  assert.equal(j.commit, 'abc123');
  assert.equal(j.executadoPor, 'Vyktorbio');
  assert.equal(j.execucaoCI, 'https://github.com/Vyktorbio/Agracta/actions/runs/42');
  assert.equal(j.antes.ruleset, 'projects/p1/rulesets/rs1', 'o registro guarda para onde voltar');
  assert.match(fs.readFileSync(env.GITHUB_STEP_SUMMARY, 'utf8'), /Regras publicadas e conferidas/);

  r = await silencioso(() => R.principal(['conferir'], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 0);
  assert.match(r.saida, /são as do repositório/);

  r = await silencioso(() => R.principal(['conferir'], { AGRACTA_PROJETO: 'p1' }, f.fetchFn, raiz));
  assert.equal(r.codigo, 2, 'sem credencial é erro de uso, não "diferente"');
  r = await silencioso(() => R.principal(['apagar'], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 2);
  r = await silencioso(() => R.principal(['voltar'], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 2, 'voltar sem dizer para onde');

  fs.writeFileSync(path.join(raiz, 'firestore.rules'), MUDADA.replace('allow read', 'ERRO_DE_COMPILACAO allow read'));
  r = await silencioso(() => R.principal(['publicar'], env, f.fetchFn, raiz));
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /linha 7, coluna 3/);
});

teste('linha de comando: permissão negada explica o papel que falta', async () => {
  const raiz = raizFalsa(REGRAS);
  const negar = async () => ({ ok: false, status: 403, json: async () => ({ error: { message: 'The caller does not have permission' } }) });
  const r = await silencioso(() => R.principal(['conferir'], { FIREBASE_TOKEN_ACESSO: 'tok-x' }, negar, raiz));
  assert.equal(r.codigo, 1);
  assert.match(r.saida, /Leitor de regras do Firebase/);
});

/* ---- os workflows não podem perder a ordem ----------------------------- */
teste('workflow de publicar: só no main, testes antes, aprovação no ambiente, chave só ali', () => {
  const y = fs.readFileSync('.github/workflows/regras-publicar.yml', 'utf8');
  assert.match(y, /branches:\s*\[\s*main\s*\]/);
  assert.match(y, /paths:\s*\[\s*firestore\.rules\s*\]/);
  const iTestes = y.indexOf('npm run test:regras'), iPublicar = y.indexOf('tools/regras-banco.cjs publicar');
  assert.ok(iTestes > 0 && iPublicar > iTestes, 'os testes no emulador vêm antes de publicar');
  assert.match(y, /environment:\s*regras-producao/);
  assert.match(y, /needs:\s*testar/);
  assert.match(y, /FIREBASE_CHAVE_SA:\s*\$\{\{\s*secrets\.FIREBASE_REGRAS_PUBLICAR\s*\}\}/);
  assert.equal((y.match(/secrets\.FIREBASE_REGRAS_PUBLICAR/g) || []).length, 2, 'a chave aparece só no job aprovado (publicar e voltar)');
  assert.match(y, /upload-artifact/);
  assert.match(y, /cancel-in-progress:\s*false/);
});

teste('workflow de conferir: semanal, só leitura, sem a chave que publica', () => {
  const y = fs.readFileSync('.github/workflows/regras-conferir.yml', 'utf8');
  assert.match(y, /schedule:/);
  assert.match(y, /tools\/regras-banco\.cjs conferir/);
  assert.ok(!/FIREBASE_REGRAS_PUBLICAR/.test(y), 'a conferência não enxerga a chave de publicar');
  assert.ok(!/regras-banco\.cjs (publicar|voltar)/.test(y));
  assert.match(y, /secrets\.FIREBASE_REGRAS_LEITURA/);
});

/* ---- roda ---------------------------------------------------------------- */
(async () => {
  for (const [nome, fn] of pendentes) {
    try { await fn(); ok++; console.log('  ✓ ' + nome); }
    catch (e) { console.log('  ✗ FALHA ' + nome + '\n      ' + (e && e.message)); process.exitCode = 1; }
  }
  console.log('\n' + ok + '/' + pendentes.length + ' verificações de regras do banco');
})();
