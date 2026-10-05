'use strict';
/* Testemunha × papel do tratamento: a caixinha e o papel andam juntos, e a base
   do % de controle só muda quando um controle positivo / sem alvo estava
   ocupando o lugar de uma testemunha de verdade. Estudo antigo: mesma base. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const src = fs.readFileSync('app.js', 'utf8');
function fn(nome) {
  const i = src.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, nome + ' existe');
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); }
}
const ctx = {}; vm.createContext(ctx);
vm.runInContext(['_tratAlinharPapel', 'studyTestemunha', 'studyTestemunhas'].map(fn).join('\n'), ctx);
const T = (id, m, p) => Object.assign({ id, testemunha: m }, p ? { papelControle: p } : {});
const base = s => ctx.studyTestemunha(s);

// estudos antigos, sem papel: base idêntica à de antes
ok(base({ testemunha: 'T3', tratamentos: [T('T1', true), T('T2'), T('T3', true)] }) === 'T3', 'antigo: s.testemunha marcada continua a base');
ok(base({ testemunha: '', tratamentos: [T('T1'), T('T2', true)] }) === 'T2', 'antigo: 1ª marcada');
ok(base({ testemunha: '', tratamentos: [T('T1'), T('T2')] }) === 'T1', 'antigo: nada marcado → 1º, como antes');
// papéis
ok(base({ testemunha: '', tratamentos: [T('T1', true, 'positivo'), T('T2'), T('T5', true, 'sem_intervencao')] }) === 'T5', 'padrão antes da testemunha: base é a testemunha');
ok(base({ testemunha: 'T1', tratamentos: [T('T1', true, 'sem_alvo'), T('T4', true, 'sem_intervencao')] }) === 'T4', 'sem alvo não vira base se há testemunha');
ok(base({ testemunha: '', tratamentos: [T('T1', true, 'positivo'), T('T2')] }) === 'T1', 'só o padrão marcado: comportamento antigo');
ok(ctx.studyTestemunhas({ testemunha: '', tratamentos: [T('T1', true, 'positivo'), T('T5', true, 'sem_intervencao')] }).length === 2, 'os dois seguem como checks');
// caixinha ⇄ papel
let t = ctx._tratAlinharPapel(T('T1', true)); ok(t.papelControle === 'sem_intervencao', 'marcar sem papel → sem intervenção');
t = ctx._tratAlinharPapel(T('T1', false, 'sem_intervencao')); ok(t.papelControle === 'experimental', 'desmarcar → experimental');
t = ctx._tratAlinharPapel(T('T1', true, 'positivo')); ok(t.papelControle === 'positivo', 'padrão marcado fica padrão');
t = ctx._tratAlinharPapel(T('T2', false)); ok(!('papelControle' in t), 'não marcado e sem papel: não ganha campo novo');
console.log('testemunha × papel: ' + n + ' verificações OK.');
