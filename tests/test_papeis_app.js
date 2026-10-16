/* papeis-app.js e as travas no app.js.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * 1. O papel vem do cadastro no banco, e a tabela vem de politica/papeis.
 *    Mudou lá, muda aqui; sem rede, vale o último lido neste aparelho.
 * 2. A tela barra ANTES de tentar, com uma mensagem que diz o que a ação pede.
 *    Isto não é cosmético: o banco recusa a gravação de quem não pode, e a
 *    recusa prenderia a sincronização do aparelho.
 * 3. No Painel Admin: um seletor de papel na linha de cada pessoa (grava em
 *    members/{email}.papel) e a tabela "quem pode o quê" (grava em
 *    politica/papeis com a forma que as regras exigem).
 * 4. Cada ação crítica do app.js passa pela trava com a ação certa. Se alguém
 *    tirar a linha, ou trocar a ação, este teste reprova.
 *
 * Rodar: node tests/test_papeis_app.js (da raiz)
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const { JSDOM } = require('jsdom');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

/* ---- um Firestore de mentira, só com o que o módulo usa ------------------- */
function fakeFirebase() {
  const docs = {}, ouvintes = {}, gravados = [];
  const ref = path => ({
    path,
    collection: c => ({ doc: id => ref(path + '/' + c + '/' + id) }),
    onSnapshot(cb) { (ouvintes[path] = ouvintes[path] || []).push(cb); cb({ exists: !!docs[path], data: () => docs[path] }); return () => {}; },
    set(data, opt) { gravados.push({ path, data, opt }); docs[path] = Object.assign({}, opt && opt.merge ? docs[path] : {}, data); return Promise.resolve(); }
  });
  const fb = {
    apps: [1],
    firestore: Object.assign(() => ({ doc: p => ref(p) }), { FieldValue: { serverTimestamp: () => '__ts__' } })
  };
  const mudar = (path, data) => { docs[path] = data; (ouvintes[path] || []).forEach(cb => cb({ exists: !!data, data: () => data })); };
  return { fb, docs, gravados, mudar };
}

function montar(email, docsIniciais) {
  const dom = new JSDOM('<!doctype html><body><div><div id="admPerfisList"></div></div></body>', { runScripts: 'outside-only', url: 'https://agracta.test/' });
  const w = dom.window, F = fakeFirebase(), alertas = [], toasts = [];
  Object.assign(F.docs, docsIniciais || {});
  w.firebase = F.fb; w._authUser = email ? { email } : null;
  w.alert = m => alertas.push(m); w.confirm = () => true; w._stxToast = t => toasts.push(t);
  w.setInterval = () => 0;
  w.eval(fs.readFileSync('vendor/papeis-core.js', 'utf8'));
  w.eval(fs.readFileSync('papeis-app.js', 'utf8'));
  w.AgractaPapeis._vigiar();
  return { w, F, alertas, toasts };
}
const M = e => 'workspaces/agracta/members/' + e, POL = 'workspaces/agracta/politica/papeis';

(async () => {
  /* 1 e 2. técnico, com a tabela padrão */
  let t = montar('tec@x.com', { [M('tec@x.com')]: { active: true, papel: 'tecnico' } });
  eq(t.w.AgractaPapeis.papel(), 'tecnico', 'papel lido do cadastro');
  ok(!t.w.AgractaPapeis.exigir('finalizar'), 'técnico não finaliza');
  ok(/diretor/.test(t.alertas[0]) && /Painel Admin/.test(t.alertas[0]), 'a mensagem diz o que pede e onde se muda');
  ok(t.w.AgractaPapeis.exigir('corrigir', { proprio: true }), 'técnico corrige o que assinou');
  ok(!t.w.AgractaPapeis.exigir('corrigir', { proprio: false }), 'mas não o de outra pessoa');
  /* o administrador promove: vale na hora */
  t.F.mudar(M('tec@x.com'), { active: true, papel: 'diretor' });
  ok(t.w.AgractaPapeis.exigir('finalizar'), 'promovido, finaliza na hora');
  /* a tabela muda: vale na hora */
  t.F.mudar(POL, { schema: 1, minimo: { finalizar: 'tecnico', reabrir: 'diretor' }, corrigirPropria: false });
  t.F.mudar(M('tec@x.com'), { active: true, papel: 'supervisor' });
  ok(t.w.AgractaPapeis.exigir('finalizar'), 'tabela gravada: supervisor finaliza');
  ok(!t.w.AgractaPapeis.exigir('reabrir'), 'tabela gravada: reabrir passou a pedir diretor');
  eq(t.w.AgractaPapeis.exigido('excluir'), 'supervisor', 'o que a tabela não diz fica no padrão');

  /* sem rede: o último lido neste aparelho */
  const cache = t.w.localStorage.getItem('agracta-papel-cache');
  const off = new JSDOM('', { runScripts: 'outside-only', url: 'https://agracta.test/' }).window;
  off.localStorage.setItem('agracta-papel-cache', cache);
  off._authUser = { email: 'tec@x.com' }; off.setInterval = () => 0; off.alert = () => {};
  off.eval(fs.readFileSync('vendor/papeis-core.js', 'utf8')); off.eval(fs.readFileSync('papeis-app.js', 'utf8'));
  eq(off.AgractaPapeis.papel(), 'supervisor', 'offline: papel do último cadastro lido');
  ok(off.AgractaPapeis.exigir('finalizar'), 'offline: tabela da última leitura');

  /* cadastro sem papel e e-mail nunca visto */
  t = montar('sem@x.com', { [M('sem@x.com')]: { active: true } });
  eq(t.w.AgractaPapeis.papel(), 'tecnico', 'cadastro sem papel é técnico');
  /* administrador das regras */
  t = montar('vyktorbio@gmail.com', {});
  eq(t.w.AgractaPapeis.papel(), 'admin', 'administrador fixo');
  ok(t.w.AgractaPapeis.exigir('finalizar') && t.w.AgractaPapeis.exigir('restaurar'), 'administrador pode tudo');

  /* 3. Painel Admin (como administrador) */
  const d = t.w.document;
  t.w._perfisCache = [
    { email: 'vyktorbio@gmail.com', nome: 'Victor', papel: 'admin' },
    { email: 'ana@x.com', nome: 'Ana', papelEquipe: 'supervisor' },
    { email: 'ze@x.com', nome: 'Zé', papelEquipe: '' }
  ];
  d.getElementById('admPerfisList').innerHTML = '<div>admin</div><div>ana</div><div>ze</div>';
  t.w._renderPerfisList(t.w._perfisCache, {});
  ok(!d.getElementById('pp_0'), 'administrador não tem seletor de papel');
  eq(d.getElementById('pp_1').value, 'supervisor', 'seletor mostra o papel gravado');
  eq(d.getElementById('pp_2').value, 'tecnico', 'sem papel aparece como técnico');
  d.getElementById('pp_2').value = 'diretor';
  t.w.AgractaPapeis._salvarPapel(2);
  await new Promise(r => setTimeout(r, 0));
  const g = t.F.gravados.find(x => x.path === M('ze@x.com'));
  ok(g && g.data.papel === 'diretor' && g.opt && g.opt.merge, 'papel gravado no cadastro, sem apagar o resto');

  const box = d.getElementById('admPapeisPolitica');
  ok(box && /Quem pode o quê/.test(box.textContent), 'a tabela aparece abaixo da lista de contas');
  eq(box.querySelectorAll('select').length, t.w.PapeisCore.ACOES.length, 'uma linha por ação');
  ok(/BANCO/.test(box.textContent) && /TELA/.test(box.textContent), 'diz o que o banco confere e o que só a tela confere');
  d.getElementById('ppol_finalizar').value = 'supervisor';
  d.getElementById('ppol_propria').checked = false;
  t.w.AgractaPapeis._salvarPolitica();
  await new Promise(r => setTimeout(r, 0));
  const gp = t.F.gravados.find(x => x.path === POL);
  ok(gp, 'tabela gravada em politica/papeis');
  eq(Object.keys(gp.data).sort(), ['atualizadoEm', 'atualizadoPor', 'corrigirPropria', 'minimo', 'schema'], 'com a forma exata que as regras aceitam');
  eq(gp.data.minimo.finalizar, 'supervisor', 'com a escolha feita');
  eq(gp.data.corrigirPropria, false, 'e a opção da própria avaliação');
  eq(gp.data.atualizadoPor, 'vyktorbio@gmail.com', 'carimbada com quem salvou');

  /* técnico não vê a tabela */
  t = montar('tec@x.com', { [M('tec@x.com')]: { active: true } });
  t.w._renderPerfisList([], {});
  ok(!t.w.document.getElementById('admPapeisPolitica'), 'só o administrador vê a tabela');

  /* 4. cada ação crítica do app.js passa pela trava certa */
  const app = fs.readFileSync('app.js', 'utf8');
  const corpo = nome => {
    const i = app.indexOf('function ' + nome + '(');
    assert.ok(i >= 0, 'não achei ' + nome);
    let j = i, prof = 0, viu = false;
    for (; j < app.length; j++) { if (app[j] === '{') { prof++; viu = true; } else if (app[j] === '}') { prof--; if (viu && !prof) break; } }
    return app.slice(i, j);
  };
  const travas = {
    finalizarEstudo: 'finalizar', reabrirEstudo: 'reabrir', aprovarProtocolo: 'aprovar', saveStudyV2: 'emendar',
    deleteStudy: 'excluir', confirmDeleteStudy: 'excluir', removeAplicacao: 'excluir', removeAvaliacaoV2: 'excluir',
    deleteQuadra: 'excluir', deleteQuadraFromEdit: 'excluir', excluirLocal: 'excluir',
    cloudHistoryRestore: 'restaurar', safetyRestoreAt: 'restaurar', importData: 'restaurar', reabrirAvaliacao: 'corrigir'
  };
  Object.keys(travas).forEach(f => {
    const c = corpo(f), k = c.indexOf("_papelPermite('" + travas[f] + "'"), senha = c.indexOf('requireDeletePassword(');
    ok(k >= 0, f + ' passa pela trava de ' + travas[f]);
    ok(senha < 0 || k < senha, f + ': a trava vem antes de pedir a senha');
  });
  ok(/_avReopen=\{[^}]*proprio:_proprio/.test(app), 'a reabertura guarda se a correção é da própria avaliação (vai para o evento)');
  ok(corpo('safetyApply').indexOf('_papelPermiteMudanca(snap.data)') >= 0, 'restaurar (nuvem e backup local) confere o que a troca implica');
  ok(corpo('importData').indexOf('_papelPermiteMudanca(dd)') >= 0, 'importar backup também');
  ok(corpo('importData').indexOf('_papelPermiteMudanca(dd)') < corpo('importData').indexOf('window._cloudApplying=true'), 'e antes de mexer em qualquer dado');

  /* a conferência da troca, rodando: um supervisor que restaura uma versão
     finalizada é barrado ANTES — o banco pediria diretor */
  const vm = require('vm'), ctxR = { alert: m => ctxR.avisos.push(m), avisos: [], window: {} };
  vm.createContext(ctxR);
  vm.runInContext(fs.readFileSync('vendor/papeis-core.js', 'utf8').replace('typeof window !== \'undefined\' ? window : globalThis', 'this'), ctxR);
  ctxR.window.PapeisCore = ctxR.PapeisCore;
  ctxR.window.AgractaPapeis = { permite: a => ctxR.PapeisCore.pode('supervisor', a, null) };
  ctxR.data = { Q1: { estudos: [{ id: 'S1' }] } };
  vm.runInContext(corpo('_papelPermiteMudanca') + '}', ctxR);
  ok(!vm.runInContext("_papelPermiteMudanca({Q1:{estudos:[{id:'S1',finalizacao:{em:'x'}}]}})", ctxR), 'supervisor não restaura um estado finalizado');
  ok(/Finalizar estudo pede diretor/.test(ctxR.avisos[0]) && /Nada foi alterado/.test(ctxR.avisos[0]), 'e o aviso diz o que pede e que nada mudou');
  ok(vm.runInContext("_papelPermiteMudanca({Q1:{estudos:[{id:'S1',cultura:'Soja'}]}})", ctxR), 'restaurar campo comum passa');

  /* ordem de carga: o motor antes do app; a ligação depois do acesso-horario */
  const html = fs.readFileSync('index.html', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8');
  const v = (html.match(/vendor\/papeis-core\.js\?v=\d+/) || [])[0], va = (html.match(/papeis-app\.js\?v=\d+/) || [])[0];
  ok(v && html.indexOf(v) < html.indexOf('app.js?v='), 'motor carregado antes do app.js');
  ok(va && html.indexOf('acesso-horario.js?v=') < html.indexOf(va), 'ligação depois do acesso-horario (envolve a lista de contas dele)');
  ok(sw.indexOf("'./" + v + "'") >= 0 && sw.indexOf("'./" + va + "'") >= 0, 'os dois no pré-cache offline');

  console.log('papeis-app: ' + n + ' verificações OK.');
})().catch(e => { console.error('FALHA', e); process.exit(1); });
