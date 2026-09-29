/* Digitar na grade de avaliação não pode travar
 *
 * _avPersistNow roda a cada célula e, no lançamento rápido, a CADA TECLA. Ele
 * gravava o `data` inteiro no localStorage ali mesmo, síncrono — com as notas
 * de campo e suas fotos em base64, alguns MB serializados por número digitado.
 *
 * O contrato agora:
 *   1. a avaliação EM MEMÓRIA é atualizada na hora, a cada chamada;
 *   2. o DISCO é gravado uma vez só, depois que a digitação para;
 *   3. se o app vai para segundo plano, o pendente é gravado JÁ;
 *   4. save() cobre a pendência (não grava duas vezes).
 *
 * Rodar: node test_avaliacao_sem_travar.js
 */
var fs = require('fs'), vm = require('vm');
var src = fs.readFileSync(__dirname + '/app.js', 'utf8');
function recorta(nome) {
  var i = src.indexOf('function ' + nome + '(');
  if (i < 0) throw new Error('não achei ' + nome);
  var d = 0, visto = false;
  for (var j = i; j < src.length; j++) {
    if (src[j] === '{') { d++; visto = true; }
    else if (src[j] === '}' && --d === 0 && visto) return src.slice(i, j + 1);
  }
}
var f = 0, p = 0;
function ck(ok, n) { if (ok) { p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }

var timers = [], gravacoes = 0, listeners = {};
var ctx = {
  timers: timers,
  setTimeout: function (fn, ms) { var t = { fn: fn, ms: ms, vivo: true }; timers.push(t); return t; },
  clearTimeout: function (t) { if (t) t.vivo = false; },
  localStorage: { setItem: function (k, v) { if (k === 'iracema-v7') gravacoes++; } },
  JSON: JSON, Date: Date,
  document: { getElementById: function () { return null; }, visibilityState: 'visible',
              addEventListener: function (ev, fn) { listeners[ev] = fn; } },
  window: { addEventListener: function (ev, fn) { listeners['w:' + ev] = fn; } }
};
vm.createContext(ctx);
vm.runInContext(
  'var data={Q:{estudos:[{id:"S1",avaliacoes:[{id:"A1",notas:{}}]}]}};' +
  'var curV="Q", curSid="S1", editingAvId="A1", draftAv=null;' +
  'var _avGrid={variaveis:["Sev"],tipos:{},meta:{},notas:{},varcfg:{},bruto:{}};' +
  src.slice(src.indexOf('var _avGravaTimer=null;'), src.indexOf('function _avPersistNow(')) +
  recorta('_avPersistNow'), ctx);
function rodaTimers() { timers.splice(0).forEach(function (t) { if (t.vivo) t.fn(); }); }

console.log('\n--- Digitar "12,5" (5 teclas) ---');
['1', '12', '12,', '12,5', '12.5'].forEach(function (v) {
  vm.runInContext('_avGrid.notas={P1:{Sev:' + JSON.stringify(v) + '}}; _avPersistNow();', ctx);
});
ck(gravacoes === 0, 'nenhuma gravação em disco enquanto digita');
ck(vm.runInContext('data.Q.estudos[0].avaliacoes[0].notas.P1.Sev', ctx) === '12.5',
   'mas a avaliação em memória já tem o último valor');
rodaTimers();
ck(gravacoes === 1, 'parou de digitar: UMA gravação só (antes eram cinco)');
ck(timers.length === 0, 'e nada mais fica agendado');

console.log('\n--- App vai para segundo plano no meio da digitação ---');
gravacoes = 0;
vm.runInContext('_avPersistNow();', ctx);
ck(gravacoes === 0, 'digitou, ainda não gravou');
ctx.document.visibilityState = 'hidden';
listeners.visibilitychange();
ck(gravacoes === 1, 'foi para segundo plano: gravou na hora');
rodaTimers();
ck(gravacoes === 1, 'e o agendado não grava de novo');
listeners['w:pagehide']();
ck(gravacoes === 1, 'pagehide sem pendência não serializa à toa');
ctx.document.visibilityState = 'visible';

console.log('\n--- save() cobre a pendência ---');
ck(/function save\(\)\{[\s\S]{0,400}clearTimeout\(_avGravaTimer\)/.test(src),
   'save() cancela a gravação adiada da grade');
ck(!/_avPersistNow[\s\S]{0,40}\{[\s\S]*?localStorage\.setItem\("iracema-v7"[\s\S]*?\n\}/.test(recorta('_avPersistNow')),
   '_avPersistNow não grava mais o localStorage direto');

console.log('\n' + (f ? f + ' FALHA(S) em ' + (p + f) + ' verificações.' : (p + ' verificações, nenhuma falha.')));
process.exit(f ? 1 : 0);
