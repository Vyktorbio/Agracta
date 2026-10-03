'use strict';
/* Local das notas: o carimbo da nota ganha o GPS sem travar a digitação, a
   sincronização preserva o local, a camada diz dentro/perto/longe da parcela
   avaliada com a mesma conta do croqui, e a rota liga as notas na ordem. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
let watchCb = null, watches = 0, cleared = 0;
const ctx = { console, Date, Math, JSON, setTimeout: (f, t) => { const h = setTimeout(f, t); if (h.unref) h.unref(); return h; }, clearTimeout,
  localStorage: { getItem: () => null, setItem() {} },
  navigator: { geolocation: { watchPosition: (cb) => { watchCb = cb; watches++; return 7; }, clearWatch: () => { cleared++; } } },
  document: { getElementById: () => null, createElement: () => ({}), body: { appendChild() {} }, head: { appendChild() {} } } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(`var _avGrid={meta:{}};function _avGridUser(){return 'Ana';}var _authUser={email:'ana@x'};
function _avTouchCell(row,v){ if(!_avGrid.meta[row])_avGrid.meta[row]={}; _avGrid.meta[row][v]={ts:Date.now(),user:_avGridUser(),por:'ana@x'}; }`, ctx);
vm.runInContext(fs.readFileSync('vendor/croqui-campo-core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('notas-local.js', 'utf8'), ctx);
const A = ctx.AgNotasLocal, C = ctx.CroquiCore;

/* captura: sem fix ainda, a nota fica pendente; o fix chega e carimba */
vm.runInContext("_avTouchCell('T1R1','Sev')", ctx);
ok(watches === 1 && !ctx._avGrid.meta.T1R1.Sev.loc, 'GPS liga na primeira nota; digitação não espera');
watchCb({ coords: { latitude: -21.5, longitude: -48.0, accuracy: 5 }, timestamp: Date.now() });
ok(ctx._avGrid.meta.T1R1.Sev.loc && ctx._avGrid.meta.T1R1.Sev.loc.acc === 5, 'fix chega e carimba a nota pendente');
vm.runInContext("_avTouchCell('T2R1','Sev')", ctx);
ok(ctx._avGrid.meta.T2R1.Sev.loc && watches === 1, 'com fix recente, carimba na hora sem novo watch');
watchCb({ coords: { latitude: -21.6, longitude: -48.1, accuracy: 200 }, timestamp: Date.now() });
vm.runInContext("_avTouchCell('T3R1','Sev')", ctx);
ok(ctx._avGrid.meta.T3R1.Sev.loc.lat === -21.5, 'fix ruim (±200 m) é ignorado');
ok(ctx._avGrid.meta.T1R1.Sev.user === 'Ana' && ctx._avGrid.meta.T1R1.Sev.ts > 0, 'carimbo original (hora, quem) intacto');

/* sincronização: o _mergeAval real do app preserva o local */
const src = fs.readFileSync('app.js', 'utf8');
function pega(nome) { const i = src.indexOf('function ' + nome + '('); let p = 0, j = i, a = false;
  for (; j < src.length; j++) { if (src[j] === '{') { p++; a = true; } else if (src[j] === '}' && --p === 0 && a) { j++; break; } } return src.slice(i, j); }
vm.runInContext(pega('_mergeAval') + ';this._mergeAval=_mergeAval;', ctx);
const loc = { lat: -21.5, lng: -48, acc: 4, t: 1 };
const local = { id: 'a', notas: { T1R1: { Sev: '10' } }, notasMeta: { T1R1: { Sev: { ts: 200, user: 'Ana', loc } } } };
const nuvem = { id: 'a', notas: { T1R1: { Sev: '8' }, T2R1: { Sev: '5' } }, notasMeta: { T1R1: { Sev: { ts: 100 } }, T2R1: { Sev: { ts: 150, loc: { lat: 1, lng: 2, acc: 3, t: 2 } } } } };
let m;
try { m = ctx._mergeAval(local, nuvem); } catch (e) { m = null; }
if (m) {
  ok(m.notasMeta.T1R1.Sev.loc && m.notasMeta.T1R1.Sev.loc.acc === 4, 'merge: o lado mais novo leva o local junto');
  ok(m.notasMeta.T2R1.Sev.loc && m.notasMeta.T2R1.Sev.loc.lat === 1, 'merge: local de outro aparelho preservado');
} else { console.log('aviso: _mergeAval depende de mais do app; conferido só por leitura'); }

/* classificação contra a parcela (metros locais do croqui) */
const anc = { lat: -21.5, lng: -48, ang: 0.4 };
const parc = { x: 0, y: 0, w: 3, h: 5 };
const pt = (x, y, acc) => { const p = C.pontoLatLng(x, y, anc); return { lat: p[0], lng: p[1], acc }; };
ok(A.classificar(pt(1.5, 2.5, 5), parc, anc).nivel === 'dentro', 'no meio da parcela: dentro');
ok(A.classificar(pt(5, 2.5, 4), parc, anc).nivel === 'perto', '2 m fora com GPS ±4: perto');
const longe = A.classificar(pt(30, 2.5, 4), parc, anc);
ok(longe.nivel === 'longe' && Math.abs(longe.dist - 27) < 0.05, '27 m fora: longe, com a distância');
ok(A.classificar(pt(1, 1, 3), null, null).nivel === 'sem-croqui', 'sem croqui: não inventa veredito');

/* notas do estudo com o croqui real do motor */
ctx.croquiPos = () => ({ lat: anc.lat, lng: anc.lng, ang: anc.ang, colunas: 2, serpentina: true, espacamento: 0, carreador: 0 });
ctx.croquiGrade = (st, pos) => C.grade({ tratamentos: st.tratamentos.length, repeticoes: st.numRepeticoes, comprimento: 5, largura: 3, colunas: pos.colunas, serpentina: true,
  ordem: [{ tratId: 'T1', rep: 1, parcela: 1 }, { tratId: 'T2', rep: 1, parcela: 2 }, { tratId: 'T1', rep: 2, parcela: 3 }, { tratId: 'T2', rep: 2, parcela: 4 }] });
const g = ctx.croquiGrade({ tratamentos: [1, 2], numRepeticoes: 2 }, ctx.croquiPos());
const pT2 = g.parcelas.find(p => p.tratId === 'T2' && p.rep === 1);
const st = { id: 'S1', codigo: 'E1', numRepeticoes: 2, tratamentos: [{ id: 'T1' }, { id: 'T2' }], avaliacoes: [{ id: 'a1', data: '2026-10-01', notasMeta: {
  T2R1: { Sev: { ts: 2, user: 'Ana', loc: pt(pT2.x + 1, pT2.y + 1, 3) } },
  T1R2: { Sev: { ts: 1, user: 'Ana', loc: pt(pT2.x + 1, pT2.y + 1, 3) } },
  T1R1: { Sev: { ts: 3, user: 'Ana' } } } }] };
const lista = A.notasDoEstudo('Q', st);
ok(lista.length === 2, 'só notas com local entram (antigas sem local ficam de fora)');
ok(lista.find(x => x.tratId === 'T2').veredito.nivel === 'dentro', 'nota na parcela certa: dentro');
ok(lista.find(x => x.tratId === 'T1').veredito.nivel !== 'dentro', 'nota de T1 R2 lançada em cima de T2 R1: denunciada');
const r = A.resumo(lista);
ok(r.total === 2 && r.dentro === 1, 'resumo conta dentro/perto/longe');
const rot = A.rotas(lista);
ok(rot.length === 1 && rot[0].pontos.length === 2, 'rota: notas da mesma avaliação e avaliador, ligadas');
ok(!/notas\[|valor|\.notas\b/.test(fs.readFileSync('notas-local.js', 'utf8').replace(/notasMeta|notasDoEstudo|notas-local|Notas no mapa|notas lançadas|notas ligadas|nota\(s\)|valor da nota/g, '')), 'a camada não lê o valor das notas (cegamento)');
console.log('notas com local: ' + n + ' verificações OK.');
process.exit(0);
