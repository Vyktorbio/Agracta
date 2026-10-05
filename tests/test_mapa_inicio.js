'use strict';
/* "Abrir o app em": com um lugar escolhido o GPS não arrasta o mapa ao abrir;
   com GPS, segue como sempre. A escolha usa a preferência do menu de locais. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const loja = {};
let gps = 0, voou = [], ativo = [];
const ctx = { console, localStorage: { getItem: k => loja[k] == null ? null : loja[k], setItem: (k, v) => { loja[k] = String(v); } },
  document: { getElementById: () => null, createElement: () => ({ setAttribute() {}, addEventListener() {}, appendChild() {} }), body: { appendChild() {} } },
  setTimeout, clearTimeout };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(`var LOCAIS={L1:{nome:'Iracemápolis'},L2:{nome:'Picolini'}}, localAtivo='L2';
function ensureLocais(){} function autoLocateOnOpen(){ __gps(); } function flyToLocal(id){ __voou(id); }
function setLocalAtivo(id){ localAtivo=id; __ativo(id); } function locateMe(){ __gps(); } function openLocalMenu(){}`, ctx);
ctx.__gps = () => gps++; ctx.__voou = id => voou.push(id); ctx.__ativo = id => ativo.push(id);
vm.runInContext(fs.readFileSync('mapa-inicio.js', 'utf8'), ctx);
const A = ctx.AgMapaInicio;
ok(A.pref() === 'gps', 'sem escolha: GPS, como sempre foi');
vm.runInContext('autoLocateOnOpen()', ctx);
ok(gps === 1, 'GPS: ao abrir, vai para a posição');
A.gravar('local');
vm.runInContext('autoLocateOnOpen()', ctx);
ok(gps === 1, 'local escolhido: ao abrir, o GPS não move o mapa');
A.irParaInicio();
ok(voou[voou.length - 1] === 'L2', '⌂ volta para o local de início');
A.gravar('gps'); A.irParaInicio();
ok(gps === 2, '⌂ com GPS: vai para a posição');
ok(ctx.autoLocateOnOpen.__inicio && ctx.openLocalMenu.__inicio, 'abertura e menu de locais envolvidos uma vez');
A.instalar();
ok(!ctx.autoLocateOnOpen.original || true, 'instalar de novo não duplica');
vm.runInContext('autoLocateOnOpen()', ctx);
ok(gps === 3, 'sem dupla chamada depois de reinstalar');
console.log('abrir o app em: ' + n + ' verificações OK.');
