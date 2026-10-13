/* A TELA QUE VAI PARA O LOGIN E VOLTA SOZINHA.
 *
 * Relato de uso (13/10/2026): "quando ele entra no celular dele, o meu fica
 * indo pra tela de login e voltando" — também na conta do administrador, que
 * as regras do banco nunca recusam.
 *
 * Reproduzido com o adaptador real e o banco simulado: das situações que a
 * entrada de um colega provoca (gravação dele, corrida de gravações, rede lenta,
 * uma recusa do banco), só a RECUSA mandava ao login um aparelho já
 * autorizado — e ainda apagava a marca de autorizado. A recusa passageira (o
 * crachá de login sendo renovado na hora da leitura) passava; a leitura
 * seguinte escondia o login: "sai e volta".
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. Aparelho autorizado + UMA recusa: não vai ao login, guarda a marca,
 *     renova o crachá e lê de novo — e a releitura dá certo.
 *  2. Recusa que se repete: é de verdade. Login, marca apagada, como sempre.
 *  3. Aparelho que nunca foi autorizado: a primeira recusa já vai ao login.
 *  4. Corrida de gravações e rede lenta continuam sem ir ao login.
 *  5. Cada ida ao login fica registrada no aparelho com hora e motivo.
 *
 * Rodar: node tests/test_login_recusa_passageira.js
 */
'use strict';
const assert = require('node:assert/strict');
const { database, client, seed, initial, tick } = require('./test_sync_envio_pendente.js');
const ROOT = 'workspaces/agracta';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('  ok    ' + m); };
const recusa = () => Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

async function disparar(c) { for (let k = 0; k < 6; k++) { const ts = c.__timers.splice(0); for (const t of ts) if (!t.cancelled) { try { t.fn(); } catch (e) {} } await tick(); } }
function colegaGravou(env) {
  const r = env.docs[ROOT]; r.rev = (r.rev || 1) + 1; r.writeId = 'colega-' + r.rev;
  env.listeners.forEach(fn => fn({ exists: true, data: () => JSON.parse(JSON.stringify(r)), metadata: { hasPendingWrites: false } }));
}
async function montar(autorizado) {
  const env = database(), A = client(env.db, initial());
  let renovou = 0;
  A.c.__testFB.user = { email: 'vyktorbio@gmail.com', uid: 'uidA', getIdToken: (f) => { if (f) renovou++; return Promise.resolve('tk'); } };
  seed(env, A.c, initial());
  const login = []; A.c.showAuthGate = () => login.push(1);
  const msgs = []; A.c.authErr = m => { if (m) msgs.push(m); };
  if (autorizado) { await A.c.cloudPull(); A.c.cloudSubscribe(); await tick(); }
  return { env, A, login, msgs, renovou: () => renovou };
}
const silencio = console.error; console.error = () => {};
(async () => {
  console.log('\n[1] uma recusa num aparelho autorizado');
  {
    const t = await montar(true);
    ok(!!t.A.c.__store['agracta-trusted-device'], 'o aparelho está autorizado (leu o banco)');
    let k = 0; t.env.beforeRead = async () => { if (k++ < 1) throw recusa(); };
    colegaGravou(t.env); await disparar(t.A.c);
    ok(t.login.length === 0, 'não vai ao login');
    ok(!!t.A.c.__store['agracta-trusted-device'], 'a marca de autorizado continua');
    ok(t.renovou() === 1, 'renova o crachá de login (getIdToken forçado)');
    ok(t.env.reads > 2 && k > 1, 'lê de novo depois da recusa');
    ok(!t.A.c.__testFB.recusaTentada, 'a releitura deu certo e zera a tentativa');
    const reg = t.A.c.agractaLoginRegistro();
    ok(reg.length === 1 && /recusa passageira/.test(reg[0].motivo) && reg[0].em, 'o registro guarda hora e motivo');
  }
  console.log('\n[2] recusa que se repete');
  {
    const t = await montar(true);
    t.env.beforeRead = async () => { throw recusa(); };
    colegaGravou(t.env); await disparar(t.A.c);
    ok(t.login.length === 1, 'vai ao login, uma vez');
    ok(!t.A.c.__store['agracta-trusted-device'], 'e apaga a marca de autorizado');
    ok(t.msgs.some(m => /não está liberado/.test(m)), 'com a frase de acesso não liberado');
    ok(t.A.c.agractaLoginRegistro().some(r => /banco recusou/.test(r.motivo)), 'registrado como recusa do banco');
  }
  console.log('\n[3] aparelho nunca autorizado');
  {
    const t = await montar(false);
    t.env.beforeRead = async () => { throw recusa(); };
    await t.A.c.cloudPull(); await disparar(t.A.c);
    ok(t.login.length >= 1 && t.renovou() === 0, 'a primeira recusa já vai ao login, sem nova tentativa');
  }
  console.log('\n[4] corrida de gravações e rede lenta');
  {
    const t = await montar(true);
    let k = 0; t.env.beforeRead = async p => { if (p === ROOT && k++ < 40) { const r = t.env.docs[ROOT]; r.rev++; r.writeId = 'c' + k; } };
    colegaGravou(t.env); await disparar(t.A.c);
    ok(t.login.length === 0, 'colega gravando sem parar: não vai ao login');
    const u = await montar(true);
    let j = 0; u.env.beforeRead = async () => { if (j++ < 3) throw Object.assign(new Error('sem resposta do servidor'), { code: 'deadline-exceeded' }); };
    colegaGravou(u.env); await disparar(u.A.c);
    ok(u.login.length === 0, 'rede lenta: não vai ao login');
  }
  console.error = silencio;
  console.log('\nLogin: recusa passageira não derruba aparelho autorizado; recusa de verdade continua indo ao login (' + n + ' verificações) OK.');
})().catch(e => { console.error = silencio; console.error(e); process.exit(1); });
