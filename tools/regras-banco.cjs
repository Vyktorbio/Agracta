#!/usr/bin/env node
/* Regras do banco no ar — Agracta (lacuna L8 da validação)
 * ============================================================================
 * Até a 38ª publicação as regras do Firestore subiam à mão, com
 * `npx firebase-tools deploy`, separadas do site. Nada conferia sozinho que o
 * que estava no ar era o `firestore.rules` do repositório: bastava alguém
 * colar uma versão no Console do Firebase, ou esquecer de publicar depois de
 * um merge, e a validação passava a descrever um banco que não existia.
 *
 * Este script fala direto com a API de regras do Firebase
 * (firebaserules.googleapis.com) e faz três coisas:
 *
 *   conferir   lê a versão no ar e compara com o firestore.rules daqui.
 *              Saída 0 = iguais; 1 = diferentes (mostra a diferença).
 *   publicar   se forem diferentes, cria a versão nova e põe no ar; depois
 *              confere de novo. Se já forem iguais, não mexe em nada.
 *   voltar     põe no ar uma versão anterior (o nome dela está no registro
 *              da publicação). Serve para sair rápido de uma regra que
 *              travou a sincronização de algum aparelho.
 *
 * Por que a API e não o firebase-tools: a conta de serviço precisa só do
 * papel "Administrador de regras do Firebase" (para conferir, só "Leitor").
 * O firebase-tools pede mais permissões do que publicar regras exige.
 *
 * CREDENCIAL (uma das duas, por variável de ambiente):
 *   FIREBASE_CHAVE_SA       o JSON da chave da conta de serviço (o CI usa)
 *   FIREBASE_TOKEN_ACESSO   um token já pronto, por exemplo
 *                           `gcloud auth print-access-token` (uso local)
 *
 * OUTRAS VARIÁVEIS:
 *   AGRACTA_PROJETO         projeto Firebase (padrão: o "default" do .firebaserc)
 *   GITHUB_SHA, GITHUB_ACTOR, GITHUB_RUN_ID, GITHUB_REPOSITORY,
 *   GITHUB_SERVER_URL       entram no registro quando roda no CI
 *   GITHUB_STEP_SUMMARY     se existir, o resumo vai para a página da execução
 *
 * USO:
 *   node tools/regras-banco.cjs conferir [--registro arq.json]
 *   node tools/regras-banco.cjs publicar [--registro arq.json]
 *   node tools/regras-banco.cjs voltar projects/P/rulesets/ID [--registro arq.json]
 *
 * O REGISTRO (JSON) é a evidência da IQ-04: projeto, commit, quem rodou, a
 * versão que estava no ar antes e a que ficou, o SHA-256 das duas e a hora
 * do servidor do Firebase. Vai para o arquivo controlado da GQ.
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = 'https://firebaserules.googleapis.com/v1/';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ESCOPO = 'https://www.googleapis.com/auth/cloud-platform';
const RELEASE = 'cloud.firestore';
const ARQUIVO_REGRAS = 'firestore.rules';

/* ---- texto ------------------------------------------------------------- */

/* O Console e o Windows trocam fim de linha e o último \n vem e vai. Nada
   disso muda a regra, então não conta como diferença. Qualquer outra coisa —
   até um espaço no meio da linha — conta. */
function normalizar(texto) {
  return String(texto == null ? '' : texto).replace(/\r\n?/g, '\n').replace(/\n+$/, '') + '\n';
}

function sha256(texto) {
  return crypto.createHash('sha256').update(normalizar(texto), 'utf8').digest('hex');
}

/* Diferença linha a linha (LCS). As regras têm algumas centenas de linhas,
   então a tabela cabe com folga. Devolve só as linhas que mudaram, com o
   número da linha no repositório (+) ou no ar (-). */
function diferenca(noAr, repo, limite) {
  const a = normalizar(noAr).split('\n'), b = normalizar(repo).split('\n');
  const n = a.length, m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    t[i][j] = a[i] === b[j] ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; continue; }
    /* No empate sai primeiro a linha velha: "- antes / + depois" lê melhor. */
    if (i < n && (j >= m || t[i + 1][j] >= t[i][j + 1])) { out.push('- ' + String(i + 1).padStart(4) + ' │ ' + a[i]); i++; }
    else { out.push('+ ' + String(j + 1).padStart(4) + ' │ ' + b[j]); j++; }
  }
  const max = limite || 60;
  return out.length > max ? out.slice(0, max).concat(['  … e mais ' + (out.length - max) + ' linha(s)']) : out;
}

/* ---- credencial -------------------------------------------------------- */

function b64url(x) {
  return Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/* Troca a chave da conta de serviço por um token de uma hora (JWT assinado
   aqui, trocado no endpoint do Google). Sem biblioteca: a chave não sai
   deste processo e o script não depende do node_modules. */
async function tokenDaChave(chaveJson, fetchFn, agora) {
  let chave;
  try { chave = typeof chaveJson === 'string' ? JSON.parse(chaveJson) : chaveJson; }
  catch (e) { throw new Error('FIREBASE_CHAVE_SA não é um JSON válido de chave de conta de serviço.'); }
  if (!chave || !chave.client_email || !chave.private_key)
    throw new Error('A chave da conta de serviço não tem client_email e private_key.');
  const iat = Math.floor((agora || Date.now()) / 1000);
  const cab = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({
    iss: chave.client_email, scope: ESCOPO, aud: chave.token_uri || TOKEN_URL, iat: iat, exp: iat + 3600,
  }));
  const assinatura = crypto.createSign('RSA-SHA256').update(cab + '.' + corpo).sign(chave.private_key);
  const jwt = cab + '.' + corpo + '.' + b64url(assinatura);
  const r = await fetchFn(chave.token_uri || TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + jwt,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token)
    throw new Error('O Google recusou a chave da conta de serviço (' + r.status + '): ' + (j.error_description || j.error || 'sem detalhe'));
  return { token: j.access_token, conta: chave.client_email };
}

/* ---- API de regras ----------------------------------------------------- */

class ErroApi extends Error {
  constructor(status, corpo, onde) {
    const e = (corpo && corpo.error) || {};
    super((onde ? onde + ': ' : '') + 'HTTP ' + status + (e.message ? ' — ' + e.message : ''));
    this.status = status;
    this.corpo = corpo;
  }
}

function cliente(fetchFn, token, projeto) {
  async function chamar(metodo, caminho, corpo, onde) {
    const r = await fetchFn(API + caminho, {
      method: metodo,
      headers: Object.assign({ Authorization: 'Bearer ' + token }, corpo ? { 'Content-Type': 'application/json' } : {}),
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new ErroApi(r.status, j, onde);
    return j;
  }
  const releaseNome = 'projects/' + projeto + '/releases/' + RELEASE;
  return {
    projeto: projeto,
    releaseNome: releaseNome,
    lerRelease: () => chamar('GET', releaseNome, null, 'ler a versão no ar'),
    lerRuleset: (nome) => chamar('GET', nome, null, 'ler o conjunto de regras'),
    criarRuleset: (conteudo) => chamar('POST', 'projects/' + projeto + '/rulesets',
      { source: { files: [{ name: ARQUIVO_REGRAS, content: conteudo }] } }, 'criar a versão nova'),
    criarRelease: (rulesetName) => chamar('POST', 'projects/' + projeto + '/releases',
      { name: releaseNome, rulesetName: rulesetName }, 'pôr no ar'),
    trocarRelease: (rulesetName) => chamar('PATCH', releaseNome,
      { release: { name: releaseNome, rulesetName: rulesetName } }, 'pôr no ar'),
  };
}

/* O que está no ar agora. `null` quando o projeto nunca teve regra publicada. */
async function lerNoAr(api) {
  let rel;
  try { rel = await api.lerRelease(); }
  catch (e) { if (e.status === 404) return null; throw e; }
  const rs = await api.lerRuleset(rel.rulesetName);
  const arquivos = (rs.source && rs.source.files) || [];
  const arq = arquivos.find(f => f.name === ARQUIVO_REGRAS) || arquivos[0] || {};
  return {
    ruleset: rel.rulesetName,
    criadoEm: rs.createTime || null,
    noArDesde: rel.updateTime || null,
    conteudo: arq.content == null ? '' : arq.content,
  };
}

/* O erro de compilação vem com linha e coluna; mostrar isso poupa abrir o
   Console para descobrir onde a regra quebrou. */
function explicarErro(e) {
  const linhas = [e.message];
  const det = (e.corpo && e.corpo.error && e.corpo.error.details) || [];
  det.forEach(d => (d.issues || []).forEach(q => {
    const p = q.sourcePosition || {};
    linhas.push('   linha ' + (p.line || '?') + ', coluna ' + (p.column || '?') + ': ' + (q.description || ''));
  }));
  if (e.status === 403) linhas.push('   A conta de serviço não tem o papel necessário neste projeto (conferir: Leitor de regras do Firebase; publicar/voltar: Administrador de regras do Firebase).');
  if (e.status === 401) linhas.push('   A credencial expirou ou não é deste projeto.');
  return linhas.join('\n');
}

/* ---- ações ------------------------------------------------------------- */

async function conferir(api, repo) {
  const ar = await lerNoAr(api);
  const iguais = !!ar && normalizar(ar.conteudo) === normalizar(repo);
  return {
    acao: 'conferir',
    resultado: iguais ? 'IGUAIS' : (ar ? 'DIFERENTES' : 'NADA_NO_AR'),
    sha256Repositorio: sha256(repo),
    noAr: ar && { ruleset: ar.ruleset, criadoEm: ar.criadoEm, noArDesde: ar.noArDesde, sha256: sha256(ar.conteudo) },
    diferenca: iguais ? [] : diferenca(ar ? ar.conteudo : '', repo),
  };
}

async function publicar(api, repo) {
  const antes = await lerNoAr(api);
  const base = {
    acao: 'publicar',
    sha256Repositorio: sha256(repo),
    antes: antes && { ruleset: antes.ruleset, criadoEm: antes.criadoEm, sha256: sha256(antes.conteudo) },
  };
  if (antes && normalizar(antes.conteudo) === normalizar(repo))
    return Object.assign(base, { resultado: 'JA_ESTAVA_NO_AR', depois: base.antes, diferenca: [] });
  const dif = diferenca(antes ? antes.conteudo : '', repo);
  /* Manda o arquivo como está no repositório (não o normalizado): o que fica
     no ar é byte a byte o que o commit tem. */
  const novo = await api.criarRuleset(repo);
  if (antes) await api.trocarRelease(novo.name); else await api.criarRelease(novo.name);
  const depois = await lerNoAr(api);
  const confere = !!depois && depois.ruleset === novo.name && normalizar(depois.conteudo) === normalizar(repo);
  return Object.assign(base, {
    resultado: confere ? 'PUBLICADO' : 'PUBLICADO_SEM_CONFERIR',
    depois: depois && { ruleset: depois.ruleset, criadoEm: depois.criadoEm, sha256: sha256(depois.conteudo) },
    diferenca: dif,
  });
}

async function voltar(api, rulesetName, repo) {
  if (!/^projects\/[^/]+\/rulesets\/[^/]+$/.test(String(rulesetName || '')))
    throw new Error('Para voltar, informe o nome completo da versão: projects/<projeto>/rulesets/<id> (está no registro da publicação, em "antes").');
  if (rulesetName.split('/')[1] !== api.projeto)
    throw new Error('A versão ' + rulesetName + ' é de outro projeto, não de ' + api.projeto + '.');
  const antes = await lerNoAr(api);
  const alvo = await api.lerRuleset(rulesetName); // falha aqui se não existir
  if (antes && antes.ruleset === rulesetName)
    return { acao: 'voltar', resultado: 'JA_ESTAVA_NO_AR', antes: { ruleset: antes.ruleset }, depois: { ruleset: rulesetName }, diferenca: [] };
  if (antes) await api.trocarRelease(rulesetName); else await api.criarRelease(rulesetName);
  const depois = await lerNoAr(api);
  return {
    acao: 'voltar',
    resultado: depois && depois.ruleset === rulesetName ? 'VOLTOU' : 'VOLTOU_SEM_CONFERIR',
    sha256Repositorio: sha256(repo),
    antes: antes && { ruleset: antes.ruleset, criadoEm: antes.criadoEm, sha256: sha256(antes.conteudo) },
    depois: depois && { ruleset: depois.ruleset, criadoEm: alvo.createTime || depois.criadoEm, sha256: sha256(depois.conteudo) },
    /* Depois de voltar, o repositório e o banco ficam diferentes de
       propósito; a conferência semanal vai dizer isso até a correção subir. */
    diferenca: depois ? diferenca(depois.conteudo, repo) : [],
  };
}

/* ---- saída ------------------------------------------------------------- */

const FRASE = {
  IGUAIS: 'As regras no ar são as do repositório.',
  DIFERENTES: 'As regras no ar NÃO são as do repositório.',
  NADA_NO_AR: 'Este projeto não tem regra do Firestore publicada.',
  JA_ESTAVA_NO_AR: 'Nada a publicar: o que está no ar já é esta versão.',
  PUBLICADO: 'Regras publicadas e conferidas: o que está no ar é o do repositório.',
  PUBLICADO_SEM_CONFERIR: 'A publicação foi aceita, mas a leitura de volta não confere. Abrir o Console do Firebase e verificar.',
  VOLTOU: 'A versão anterior voltou ao ar. O repositório e o banco agora estão diferentes até a correção subir.',
  VOLTOU_SEM_CONFERIR: 'A volta foi aceita, mas a leitura de volta não confere. Abrir o Console do Firebase e verificar.',
};

function resumoMarkdown(r) {
  const L = ['### Regras do banco — ' + r.acao, '', '**' + (FRASE[r.resultado] || r.resultado) + '**', '',
    '| | |', '|---|---|',
    '| Projeto | `' + r.projeto + '` |',
    '| Commit | `' + (r.commit || '—') + '` |',
    '| SHA-256 do `firestore.rules` | `' + (r.sha256Repositorio || '—') + '` |'];
  const v = (x) => x ? '`' + x.ruleset + '`' + (x.criadoEm ? ' (criada ' + x.criadoEm + ')' : '') : '—';
  if (r.noAr) L.push('| No ar | ' + v(r.noAr) + ' |');
  if ('antes' in r) L.push('| Antes | ' + v(r.antes) + ' |');
  if ('depois' in r) L.push('| Depois | ' + v(r.depois) + ' |');
  L.push('| Executado por | ' + (r.executadoPor || '—') + ' em ' + r.executadoEm + ' |');
  if (r.diferenca && r.diferenca.length) {
    L.push('', '<details><summary>Diferença (− no ar, + repositório)</summary>', '', '```diff');
    r.diferenca.forEach(l => L.push(l.replace(/^([+-]) +(\d+) │ /, '$1$2: ')));
    L.push('```', '</details>');
  }
  return L.join('\n') + '\n';
}

function projetoPadrao(raiz) {
  try {
    const rc = JSON.parse(fs.readFileSync(path.join(raiz, '.firebaserc'), 'utf8'));
    return rc.projects && rc.projects.default;
  } catch (e) { return null; }
}

async function principal(argv, env, fetchFn, raiz) {
  const args = argv.slice();
  let registro = null;
  const ir = args.indexOf('--registro');
  if (ir >= 0) { registro = args[ir + 1]; args.splice(ir, 2); }
  const acao = args[0];
  if (['conferir', 'publicar', 'voltar'].indexOf(acao) < 0 || (acao === 'voltar' && !args[1]) || !fetchFn) {
    console.error('uso: node tools/regras-banco.cjs conferir|publicar|voltar <ruleset> [--registro arq.json]');
    return 2;
  }
  const projeto = env.AGRACTA_PROJETO || projetoPadrao(raiz);
  if (!projeto) { console.error('Sem projeto: defina AGRACTA_PROJETO ou o "default" no .firebaserc.'); return 2; }
  const repo = fs.readFileSync(path.join(raiz, ARQUIVO_REGRAS), 'utf8');

  let token, conta = null;
  try {
    if (env.FIREBASE_TOKEN_ACESSO) token = env.FIREBASE_TOKEN_ACESSO;
    else if (env.FIREBASE_CHAVE_SA) ({ token, conta } = await tokenDaChave(env.FIREBASE_CHAVE_SA, fetchFn));
    else { console.error('Sem credencial: defina FIREBASE_CHAVE_SA (JSON da chave) ou FIREBASE_TOKEN_ACESSO.'); return 2; }
  } catch (e) { console.error(e.message); return 1; }

  const api = cliente(fetchFn, token, projeto);
  let r;
  try {
    if (acao === 'conferir') r = await conferir(api, repo);
    else if (acao === 'publicar') r = await publicar(api, repo);
    else r = await voltar(api, args[1], repo);
  } catch (e) {
    console.error('NÃO FOI POSSÍVEL ' + acao.toUpperCase() + '.\n' + (e instanceof ErroApi ? explicarErro(e) : e.message));
    return 1;
  }

  const rodada = env.GITHUB_RUN_ID && env.GITHUB_REPOSITORY
    ? (env.GITHUB_SERVER_URL || 'https://github.com') + '/' + env.GITHUB_REPOSITORY + '/actions/runs/' + env.GITHUB_RUN_ID : null;
  r = Object.assign({
    projeto: projeto,
    commit: env.GITHUB_SHA || null,
    executadoPor: env.GITHUB_ACTOR || env.USER || null,
    contaDeServico: conta,
    execucaoCI: rodada,
    executadoEm: new Date().toISOString(),
  }, r);

  console.log(FRASE[r.resultado] || r.resultado);
  console.log('  projeto      ' + projeto);
  console.log('  repositório  sha256 ' + r.sha256Repositorio);
  const mostra = (rot, x) => x && console.log('  ' + rot + x.ruleset + '  sha256 ' + x.sha256);
  mostra('no ar        ', r.noAr); mostra('antes        ', r.antes); mostra('depois       ', r.depois);
  if (r.diferenca && r.diferenca.length) { console.log('\nDiferença (− no ar, + repositório):'); r.diferenca.forEach(l => console.log('  ' + l)); }

  if (registro) fs.writeFileSync(registro, JSON.stringify(r, null, 2) + '\n');
  if (env.GITHUB_STEP_SUMMARY) { try { fs.appendFileSync(env.GITHUB_STEP_SUMMARY, resumoMarkdown(r)); } catch (e) { /* resumo é cortesia */ } }

  const bom = { IGUAIS: 1, JA_ESTAVA_NO_AR: 1, PUBLICADO: 1, VOLTOU: 1 };
  return bom[r.resultado] ? 0 : 1;
}

module.exports = { normalizar, sha256, diferenca, tokenDaChave, cliente, lerNoAr, conferir, publicar, voltar, resumoMarkdown, principal, ErroApi };

if (require.main === module) {
  principal(process.argv.slice(2), process.env, global.fetch, path.join(__dirname, '..'))
    .then(c => process.exit(c), e => { console.error(e && e.stack || e); process.exit(1); });
}
