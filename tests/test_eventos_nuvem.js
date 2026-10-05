'use strict';
/* eventos-app.js ↔ nuvem. Um Firestore falso que aplica as mesmas travas da
   regra real (tests/eventos-rules.cjs prova a regra no emulador): só criar,
   id = SHA-256 do json, remetente = sessão. Aqui se prova o lado do aparelho:
   envia o pendente, não reenvia o enviado, se recupera de confirmação perdida,
   baixa o de outro aparelho, recusa cópia adulterada, espera a rede — e rede
   pendurada nunca trava a gravação local. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { IDBFactory } = require('fake-indexeddb');

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const SERVER_TS = { __ts: true };
function servidor() {
  const docs = new Map();
  return { docs, falharConfirmacao: 0, pendurar: false, gravacoes: 0 };
}
function fakeFirebase(srv, email) {
  const ouvintes = [];
  const db = {
    doc(caminho) {
      const id = caminho.split('/').pop();
      return {
        set(d) {
          if (srv.pendurar) return new Promise(() => {});
          srv.gravacoes++;
          const e = new Error('permission-denied'); e.code = 'permission-denied';
          if (srv.docs.has(id)) return Promise.reject(e);                         /* só criar */
          if (id !== 'ev:' + crypto.createHash('sha256').update(d.json, 'utf8').digest('hex')) return Promise.reject(e);
          if (d.enviadoPor !== email || d.recebidoEm !== SERVER_TS) return Promise.reject(e);
          srv.docs.set(id, Object.assign({}, d, { recebidoEm: Date.now() }));
          if (srv.falharConfirmacao > 0) { srv.falharConfirmacao--; return Promise.reject(new Error('unavailable')); }
          return Promise.resolve();
        },
        get() { const d = srv.docs.get(id); return Promise.resolve({ exists: !!d, data: () => d }); }
      };
    },
    collection() {
      return { get() {
        return Promise.resolve({ forEach(fn) { srv.docs.forEach((d, id) => fn({ id, data: () => d })); } });
      } };
    }
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => SERVER_TS };
  return {
    apps: [1],
    auth: () => ({ currentUser: email ? { email } : null, onAuthStateChanged: fn => ouvintes.push(fn) }),
    firestore
  };
}

const APP = `
var AGRACTA_TIME_ZONE='America/Sao_Paulo';
var data={ Q19:{ estudos:[{ id:'S1', codigo:'AGR-1', audit:[], finalizacao:{rubrica:'r'}, finalizacoesAnteriores:[{motivo:'m'}] }] } };
var _authUser={ email:'ana@x.com' };
var _avReopen=null;
function _currentUserName(){ return 'Ana'; }
function logStudyAuditInObject(study, action, details, extra){ study.audit.push({ action:action }); return 'ok'; }`;
function aparelho(srv, email, idb) {
  const ctx = { console: { warn: () => { ctx._avisos++; } }, _avisos: 0,
    localStorage: { getItem: () => null, setItem: () => {} },
    indexedDB: idb || new IDBFactory(), Promise,
    setTimeout: (f, t) => { const h = setTimeout(f, t); if (h.unref) h.unref(); return h; }, clearTimeout,
    addEventListener: () => {}, navigator: { onLine: true }, firebase: fakeFirebase(srv, email) };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(APP, ctx);
  for (const f of ['vendor/observacao-core.js', 'vendor/eventos-core.js', 'eventos-app.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx;
}
const logar = (c, acao) => vm.runInContext(`logStudyAuditInObject(data.Q19.estudos[0],'${acao}','x')`, c);
const registro = async c => { await c.AgractaEventos.ocioso(); return c.AgractaEventos.registro('Q19', 'S1'); };

(async () => {
  /* 1. envia o pendente, uma vez só */
  const srv = servidor();
  const A = aparelho(srv, 'ana@x.com');
  logar(A, 'Finalização do Estudo');
  await A.AgractaEventos.ocioso();
  let r = await A.AgractaEventos.sincronizar();
  ok(r.enviados === 1 && srv.docs.size === 1, 'evento enviado à nuvem');
  const [id] = srv.docs.keys();
  ok(id === (await registro(A))[0].id, 'mesmo id no aparelho e na nuvem');
  ok(srv.docs.get(id).enviadoPor === 'ana@x.com' && srv.docs.get(id).estudo === A.ObservacaoCore.chaveEstudo('Q19', 'S1'), 'remetente e estudo');
  const antes = srv.gravacoes;
  r = await A.AgractaEventos.sincronizar();
  ok(r.enviados === 0 && srv.gravacoes === antes, 'o já enviado não é reenviado');
  ok(A.AgractaEventos.estado().pendentes === 0, 'nada pendente');

  /* 2. confirmação perdida: gravou na nuvem mas o aparelho não soube */
  srv.falharConfirmacao = 1;
  logar(A, 'Reabertura do Estudo');
  await A.AgractaEventos.ocioso();
  const g0 = srv.gravacoes;
  r = await A.AgractaEventos.sincronizar({ soEnviar: true });
  ok(r.enviados === 1 && A.AgractaEventos.estado().pendentes === 0 && srv.docs.size === 2, 'confere na nuvem e reconhece que já está lá');
  ok(srv.gravacoes === g0 + 1, 'sem regravar');

  /* 3. outro aparelho baixa e o grafo fica igual */
  const B = aparelho(srv, 'beto@x.com');
  r = await B.AgractaEventos.sincronizar();
  const regB = await registro(B), regA = await registro(A);
  ok(r.recebidos === 2 && regB.length === 2, 'eventos do outro aparelho descem');
  ok(JSON.stringify(regB.map(e => e.id)) === JSON.stringify(regA.map(e => e.id)), 'mesma ordem nos dois aparelhos');
  ok((await B.AgractaEventos.verificar('Q19', 'S1')).ok, 'registro baixado íntegro');
  r = await B.AgractaEventos.sincronizar();
  ok(r.enviados === 0, 'o que desceu não sobe de volta');

  /* 4. cópia adulterada na nuvem é recusada */
  const d0 = srv.docs.get(id);
  const falso = 'ev:' + 'f'.repeat(64);
  srv.docs.set(falso, Object.assign({}, d0, { json: d0.json.replace('Ana', 'Outra') }));
  const C = aparelho(srv, 'caio@x.com');
  r = await C.AgractaEventos.sincronizar();
  ok(r.recebidos === 2 && C.AgractaEventos.estado().rejeitados === 1 && C._avisos > 0, 'adulterado recusado, resto entra');
  srv.docs.delete(falso);

  /* 5. sem rede ou sem sessão: espera, e manda quando voltar */
  const srv2 = servidor();
  const D = aparelho(srv2, 'ana@x.com');
  D.navigator.onLine = false;
  logar(D, 'Finalização do Estudo');
  await D.AgractaEventos.ocioso();
  r = await D.AgractaEventos.sincronizar();
  ok(r.semNuvem && srv2.docs.size === 0, 'offline: nada sai');
  D.navigator.onLine = true;
  r = await D.AgractaEventos.sincronizar();
  ok(r.enviados === 1 && srv2.docs.size === 1, 'rede voltou: sai');
  const E2 = aparelho(servidor(), null);
  logar(E2, 'Finalização do Estudo');
  ok((await E2.AgractaEventos.sincronizar()).semNuvem && (await registro(E2)).length === 1, 'sem sessão: fica no aparelho');

  /* 6. rede pendurada não trava a gravação local */
  const srv3 = servidor(); srv3.pendurar = true;
  const F = aparelho(srv3, 'ana@x.com');
  logar(F, 'Finalização do Estudo');
  await F.AgractaEventos.ocioso();
  F.AgractaEventos.sincronizar();                       /* fica pendurada de propósito */
  logar(F, 'Reabertura do Estudo');
  const t0 = Date.now();
  const regF = await registro(F);
  ok(regF.length === 2 && Date.now() - t0 < 2000, 'gravação local não espera a nuvem');

  console.log('eventos na nuvem: ' + n + ' verificações OK.');
  process.exit(0);
})().catch(e => { console.error('FALHA', e); process.exit(1); });
