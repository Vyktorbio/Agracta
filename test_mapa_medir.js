'use strict';
/* "Medir" no mapa: a grade provisória mede certo, diz se cabe na quadra e
   não grava nada além das medidas digitadas. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const guardado = {};
const ctx = { console, document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, body: { appendChild() {} } },
  localStorage: { getItem: k => guardado[k] || null, setItem: (k, v) => { guardado[k] = v; } } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('vendor/croqui-campo-core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('mapa-medir.js', 'utf8'), ctx);
const A = ctx.AgMedir, C = ctx.CroquiCore;

/* 5 estudos de 12 × 30 m lado a lado, 2 m entre eles */
let r = A.retangulos({ comprimento: 30, largura: 12, quantidade: 5, colunas: 5, espaco: 2 });
ok(r.rets.length === 5 && r.m.W === 5 * 12 + 4 * 2 && r.m.L === 30, 'ocupação total: 68 × 30 m');
ok(Math.abs(r.rets[0].x + 34) < 1e-9 && Math.abs(r.rets[4].x + r.rets[4].w - 34) < 1e-9, 'centrado na âncora');
r = A.retangulos({ comprimento: 30, largura: 12, quantidade: 5, colunas: 2, espaco: 2 });
ok(r.m.cols === 2 && r.m.lin === 3 && r.m.L === 3 * 30 + 2 * 2, '2 lado a lado = 3 fileiras');
ok(A.retangulos({ comprimento: '', largura: 12, quantidade: 3 }).rets.length === 0, 'sem comprimento não desenha');
ok(A.medidas({ comprimento: '30,5', largura: '12', quantidade: 2, colunas: 9 }).comp === 30.5 &&
   A.medidas({ comprimento: 1, largura: 1, quantidade: 2, colunas: 9 }).cols === 2, 'vírgula decimal e colunas limitadas à quantidade');

/* quadra de 100 × 50 m (leste × norte) em volta da âncora */
const anc = { lat: -21.5, lng: -48.0, ang: 0 };
const quadra = [C.pontoLatLng(-50, -25, anc), C.pontoLatLng(50, -25, anc), C.pontoLatLng(50, 25, anc), C.pontoLatLng(-50, 25, anc)];
r = A.retangulos({ comprimento: 30, largura: 12, quantidade: 5, colunas: 5, espaco: 2 });
let v = A.veredito(r.rets, anc, { Q1: quadra });
ok(v.quadra === 'Q1' && v.cabem === 5, '5 × (12 × 30) cabem em 100 × 50');
r = A.retangulos({ comprimento: 30, largura: 12, quantidade: 8, colunas: 8, espaco: 2 });
v = A.veredito(r.rets, anc, { Q1: quadra });
ok(v.cabem === 6 && v.total === 8, '8 lado a lado: só os 6 do meio cabem');
v = A.veredito(r.rets, { lat: anc.lat, lng: anc.lng, ang: Math.PI / 2 }, { Q1: quadra });
ok(v.cabem < 8, 'girado 90° numa quadra deitada: passa da quadra');
v = A.veredito(r.rets, { lat: -10, lng: -40, ang: 0 }, { Q1: quadra });
ok(v.quadra === null, 'fora de qualquer quadra: sem veredito');
ok(A.dentro([anc.lat, anc.lng], quadra) && !A.dentro(C.pontoLatLng(60, 0, anc), quadra), 'ponto dentro/fora');

/* nada gravado no estudo: o módulo não conhece "data" nem chama gravação */
const src = fs.readFileSync('mapa-medir.js', 'utf8');
ok(!/\bdata\[|saveData|persist|firestore|_avPersist/i.test(src), 'não toca em dados do estudo nem na nuvem');
console.log('medir no mapa: ' + n + ' verificações OK.');

/* toque livre: pontos (árvores) e retângulos soltos, cada um conferido na quadra */
{
  const anc2 = { lat: -21.5, lng: -48.0, ang: 0 };
  const quadra2 = [C.pontoLatLng(-50, -25, anc2), C.pontoLatLng(50, -25, anc2), C.pontoLatLng(50, 25, anc2), C.pontoLatLng(-50, 25, anc2)];
  const em = (x, y) => { const p = C.pontoLatLng(x, y, anc2); return { lat: p[0], lng: p[1] }; };
  const itens = [Object.assign({ tipo: 'ponto', raio: 1.5 }, em(0, 0)), Object.assign({ tipo: 'ponto', raio: 1.5 }, em(49.9, 0)),
    Object.assign({ tipo: 'ret', comprimento: 10, largura: 4, ang: 0 }, em(10, 10)), Object.assign({ tipo: 'ret', comprimento: 10, largura: 4, ang: 0 }, em(48, 0))];
  const f = A.formaLivre(itens[2]);
  const loc = f.cantos.map(c => C.metrosLocais(c[0], c[1], anc2));
  if (!(Math.abs(loc[0].x - 8) < 0.01 && Math.abs(loc[2].y - 15) < 0.01)) throw new Error('retângulo livre fora do lugar');
  const q = A.livresNaQuadra(itens, { Q1: quadra2 });
  if (q.Q1.total !== 4 || q.Q1.dentro !== 3) throw new Error('livre na quadra: esperado 3 de 4, veio ' + JSON.stringify(q));
  console.log('medir livre: pontos e retângulos soltos OK.');
}
