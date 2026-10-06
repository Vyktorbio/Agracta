/* LOGIN QUE "ENTRA SOZINHO E SAI DE NOVO".
 *
 * Relato de uso (06/10/2026): no celular de um assistente, "pisca a tela de
 * login, aí entra sozinho e depois sai de novo" — não dava nem para mexer.
 * Reproduzido no navegador com um Firebase falso: duas causas, as duas no
 * acesso-horario.js.
 *
 *  1. RELÓGIO DO CELULAR x HORA DO SERVIDOR. O banco decide a janela de horário
 *     pela hora dele; o app decidia pelo relógio do aparelho. Celular adiantado,
 *     atrasado ou no fuso errado: o banco aceitava a leitura, o app liberava a
 *     tela (entra) e 1,2 s depois travava e desconectava (sai).
 *  2. REDE LENTA. Com o cadastro do membro demorando a chegar, a tela ficava em
 *     branco e a rede de segurança de 10 s devolvia ao login (sai) quem já
 *     estava conectado e autorizado — e a pessoa ficava presa ali.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. Com o banco tendo aceitado e o servidor dizendo "dentro", o relógio do
 *     celular não derruba a sessão: nem trava, nem signOut, e a tela abre.
 *  2. A hora usada é a do servidor (cabeçalho Date + Age do próprio site), e o
 *     desvio fica guardado para quando não houver rede.
 *  3. Rede lenta: quem já está autorizado (banco aceitou, ou aparelho onde a
 *     pessoa já entrou) não volta ao login aos 10 s; a tela abre.
 *  4. Quem não entrou continua indo para o login aos 10 s (a rede de segurança
 *     segue existindo para tela branca de verdade).
 *  5. Fora do horário de verdade: trava, sem abrir a tela antes (nada de
 *     entra-e-sai), e desconecta.
 *  6. O motivo da recusa em palavras: e-mail não cadastrado, conta inativa ou
 *     fora do horário pela hora do servidor.
 *
 * Rodar: node tests/test_login_laco.js
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
let JSDOM; try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

let n = 0; function ok(c, msg) { assert.ok(c, msg); n++; console.log('  ok    ' + msg); }
const SRC = fs.readFileSync('acesso-horario.js', 'utf8');
const EM = 'assistente@example.test';
/* Hora de São Paulo agora (minutos) e o dia da semana, para montar janelas. */
const spMin = (ms) => { const d = new Date(ms - 180 * 60000); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
const spDia = new Date(Date.now() - 180 * 60000).getUTCDay();
const flush = () => new Promise((r) => setImmediate(r));

/* Monta uma página com o acesso-horario.js de verdade, relógio de timers na mão
   e um Firestore que só entrega o cadastro quando o teste mandar. */
function montar(op) {
  op = op || {};
  const dom = new JSDOM('<!doctype html><html class="pre-auth"><body></body></html>', { url: 'https://www.agracta.com.br/', runScripts: 'outside-only' });
  const w = dom.window, d = w.document, agenda = [];
  let agora = 0;
  w.setTimeout = (fn, ms) => { agenda.push({ t: agora + (ms || 0), fn }); return agenda.length; };
  w.clearTimeout = () => {};
  w.setInterval = () => 0; w.clearInterval = () => {};
  async function avancar(ms) {
    const fim = agora + ms;
    for (;;) {
      agenda.sort((a, b) => a.t - b.t);
      const i = agenda.findIndex((x) => x.t <= fim);
      if (i < 0) break;
      const x = agenda.splice(i, 1)[0]; agora = Math.max(agora, x.t); x.fn(); await flush();
    }
    agora = fim; await flush();
  }
  const ev = { signOut: 0, gate: [], liberou: 0 };
  /* O que o resto do app faria: portão de login e sessão. */
  w.showAuthGate = function () { let g = d.getElementById('authGate'); if (!g) { g = d.createElement('div'); g.id = 'authGate'; d.body.appendChild(g); } g.classList.add('on'); ev.gate.push('mostrou'); };
  w.hideAuthGate = function () { const g = d.getElementById('authGate'); if (g) g.classList.remove('on'); ev.gate.push('escondeu'); };
  new w.MutationObserver(() => { if (!d.documentElement.classList.contains('pre-auth')) ev.liberou++; })
    .observe(d.documentElement, { attributes: true, attributeFilter: ['class'] });
  let entregar = null, cadastro = op.cadastro === undefined ? { active: true } : op.cadastro;
  w.firebase = {
    apps: [1],
    auth: () => ({ signOut: () => { ev.signOut++; return Promise.resolve(); } }),
    firestore: () => ({ doc: () => ({ collection: () => ({ doc: () => ({
      onSnapshot: (next) => { entregar = () => next({ exists: !!cadastro, data: () => cadastro }); return () => { entregar = null; }; },
    }) }) }) }),
  };
  /* A hora do servidor sai do HEAD ao próprio site. */
  w.fetch = (url, o) => {
    ev.head = (ev.head || 0) + 1;
    if (op.semRede) return Promise.reject(new Error('sem rede'));
    const server = Date.now() + (op.servidorMin || 0) * 60000;
    return Promise.resolve({ headers: { get: (h) => (h === 'Date' ? new Date(server - (op.age || 0) * 1000).toUTCString() : h === 'Age' ? String(op.age || 0) : null) } });
  };
  if (op.confiavel) w.localStorage.setItem('agracta-trusted-device', JSON.stringify({ v: 2, uid: 'u1', email: EM, authenticatedAt: Date.now() }));
  if (op.leituraOk) w._agractaLeituraOk = Date.now();
  w.eval(SRC);
  return { w, d, ev, avancar, entregar: async () => { if (entregar) entregar(); await flush(); }, set cadastro(v) { cadastro = v; } };
}
const trava = (d) => { const l = d.getElementById('acessoLock'); return !!(l && l.classList.contains('on')); };
const gateOn = (d) => { const g = d.getElementById('authGate'); return !!(g && g.classList.contains('on')); };

(async () => {
  console.log('\n--- 1. Relógio do celular atrasado: o banco aceitou, o servidor diz "dentro" ---');
  {
    /* Janela que começa daqui a 10 min no relógio do celular; o servidor está 30 min à frente. */
    const j = { on: true, dias: [spDia], iniMin: spMin(Date.now()) + 10, fimMin: spMin(Date.now()) + 60 };
    const p = montar({ cadastro: { active: true, janela: j }, servidorMin: 30, leituraOk: true });
    p.w._authUser = { email: EM };
    p.w.hideAuthGate(); await p.avancar(0);
    await p.entregar(); await p.avancar(3000);
    ok(p.ev.signOut === 0, 'a sessão aceita pelo banco não é desconectada');
    ok(!trava(p.d), 'nem aparece a trava de fora do horário');
    ok(!p.d.documentElement.classList.contains('pre-auth'), 'a tela fica aberta');
    const r = p.w.agAcessoRelogio();
    ok(r.conferido && Math.abs(r.desvioMs - 30 * 60000) < 3000, 'o desvio do relógio vem do servidor (~30 min)');
    ok(Number(p.w.localStorage.getItem('agracta-relogio-desvio')) === r.desvioMs, 'e fica guardado para quando não houver rede');
    ok(p.ev.head >= 1, 'a hora foi conferida com um HEAD ao próprio site');
  }

  console.log('\n--- 2. A hora do servidor desconta o tempo em cache (Age) ---');
  {
    const p = montar({ servidorMin: 0, age: 120 });
    await p.avancar(0); await flush();
    ok(Math.abs(p.w.agAcessoRelogio().desvioMs) < 3000, 'Date + Age: resposta guardada há 2 min não atrasa o relógio');
  }

  console.log('\n--- 3. Rede lenta: o cadastro não chega em 10 s ---');
  {
    const p = montar({ confiavel: true });
    p.w._authUser = { email: EM };
    p.w.hideAuthGate(); await p.avancar(0);
    ok(p.d.documentElement.classList.contains('pre-auth'), 'sem cadastro e sem leitura da nuvem, a tela ainda espera');
    await p.avancar(10500);
    ok(!gateOn(p.d), 'aos 10 s, quem já entrou neste aparelho NÃO volta ao login');
    ok(!p.d.documentElement.classList.contains('pre-auth'), 'a tela abre');
    const q = montar({ leituraOk: true });
    q.w._authUser = { email: EM };
    q.w.hideAuthGate(); await q.avancar(0);
    ok(!q.d.documentElement.classList.contains('pre-auth'), 'banco já aceitou a leitura: a tela abre na hora, sem esperar o cadastro');
  }

  console.log('\n--- 4. Sem login, a rede de segurança continua levando ao login ---');
  {
    const p = montar({});
    await p.avancar(10500);
    ok(gateOn(p.d), 'tela branca sem ninguém conectado: aos 10 s aparece o login');
    ok(p.d.documentElement.classList.contains('pre-auth'), 'e o app continua escondido');
    const q = montar({});
    q.w._authUser = { email: EM };   /* conectado, mas nem banco aceitou nem é o aparelho dela */
    await q.avancar(10500);
    ok(gateOn(q.d), 'conectado num aparelho estranho, sem resposta do banco: login, como antes');
  }

  console.log('\n--- 5. Fora do horário de verdade: trava sem abrir antes ---');
  {
    const j = { on: true, dias: [spDia], iniMin: spMin(Date.now()) + 60, fimMin: spMin(Date.now()) + 120 };
    const p = montar({ cadastro: { active: true, janela: j }, servidorMin: 0 });
    p.w._authUser = { email: EM };
    p.w.hideAuthGate(); await p.avancar(0); await flush();
    await p.entregar(); await p.avancar(3000);
    ok(trava(p.d), 'aparece a trava de fora do horário');
    ok(p.ev.signOut >= 1, 'e a sessão é encerrada');
    ok(p.ev.liberou === 0, 'sem abrir a tela antes de travar (era o "entra sozinho e sai de novo")');
  }

  console.log('\n--- 6. O motivo da recusa em palavras ---');
  {
    const p = montar({ servidorMin: 0 });
    await p.avancar(0); await flush();
    const M = p.w.agAcessoMotivo;
    ok(/não está cadastrado no Painel Admin/.test(M(EM, null)), 'sem cadastro: diz que o e-mail não está cadastrado');
    ok(/está inativa no Painel Admin/.test(M(EM, { active: false })), 'conta inativa: diz que está inativa');
    const fora = M(EM, { active: true, janela: { on: true, dias: [spDia], iniMin: spMin(Date.now()) + 60, fimMin: spMin(Date.now()) + 120 } });
    ok(/Fora do horário de acesso: agora são \d\d:\d\d no horário do servidor\. Janela permitida: /.test(fora), 'fora do horário: diz a hora do servidor e a janela');
    ok(M(EM, { active: true }) === null, 'dentro e ativo: nenhum motivo');
    ok(M('vyktorbio@gmail.com', null) === null, 'administrador nunca é barrado por janela');
  }

  console.log('\n--- 7. firebase-sync: o banco aceitou, o banco recusou ---');
  {
    const { initial, database, client, seed, tick } = require('./test_sync_envio_pendente.js');
    const env = database(), a = client(env.db, initial()); seed(env, a.c, initial());
    a.c.__testFB.user.uid = 'u1';
    const r1 = await a.c.cloudPull();
    ok(r1 === true && Date.now() - a.c._agractaLeituraOk < 5000, 'leitura aceita deixa a marca de que o banco disse sim');
    /* Agora o banco nega os dados; o próprio cadastro (que a regra deixa ler) diz "inativa". */
    env.docs['workspaces/agracta/members/tecnico@example.test'] = { active: false };
    env.beforeRead = async (path) => {
      if (!/\/members\//.test(path)) throw Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });
    };
    const telas = [], porta = { classList: { contains: () => true, add() {}, remove() {} } };
    a.c.document.getElementById = (id) => (id === 'authGate' ? porta : null);
    a.c.authErr = (m) => { if (m) telas.push(m); };
    a.c.agAcessoMotivo = (email, m) => (m && m.active === false ? 'A conta ' + email + ' está inativa no Painel Admin.' : null);
    const r2 = await a.c.cloudPull(); await tick();
    ok(r2 === false && a.c._agractaLeituraOk === 0, 'leitura recusada apaga a marca');
    ok(telas.some((m) => /não está liberado/.test(m)), 'a tela de login avisa na hora, com o texto de sempre');
    ok(telas.some((m) => m === 'A conta tecnico@example.test está inativa no Painel Admin. Fale com o administrador.'),
      'e logo depois troca pelo motivo lido no cadastro');
  }

  console.log('\n' + n + ' verificações, nenhuma falha.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
