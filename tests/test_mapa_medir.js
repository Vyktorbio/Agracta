'use strict';
/* "Medir" no mapa: cada grupo provisório mede certo, diz se cabe na quadra e
   se encosta em outro grupo, o "Encher" acha as vagas certas, e nada é
   gravado além das medidas digitadas. */
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
ok(!/saveData|\bsave\(|persist|firestore|_avPersist|\.croqui\s*=|\.estudos\s*=|setItem\(\s*['"]iracema/i.test(src), 'só lê a lista de estudos: não grava estudo, croqui nem nuvem');
console.log('medir no mapa: ' + n + ' verificações OK.');

/* VÁRIOS GRUPOS ao mesmo tempo (pedido de quem usa: "adicionar mais grupos de
   parcelas ao mesmo tempo para medir quantos estudos caberiam na quadra").
   Quadra de 100 × 50 m; cada grupo é 1 estudo de 12 × 30 m com 2 m de espaço. */
{
  const anc0 = { lat: -21.5, lng: -48.0, ang: 0 };
  const Q = [C.pontoLatLng(-50, -25, anc0), C.pontoLatLng(50, -25, anc0), C.pontoLatLng(50, 25, anc0), C.pontoLatLng(-50, 25, anc0)];
  const cfg = () => ({ comprimento: 30, largura: 12, quantidade: 1, colunas: 1, espaco: 2 });
  const em = (x, y, ang) => { const p = C.pontoLatLng(x, y, anc0); return { cfg: cfg(), lat: p[0], lng: p[1], ang: ang || 0 }; };

  /* área da quadra, para o "ocupam X de Y ha" */
  ok(Math.abs(A.areaM2(Q) - 5000) < 1, 'área da quadra: 100 × 50 = 5000 m², veio ' + A.areaM2(Q));

  /* eixo separador: encostar não é sobrepor; 10 cm para dentro já é */
  const R = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  ok(!A.sobrepoe(R(0, 0, 12, 30), R(12, 0, 12, 30)), 'lado a lado, encostados: cabem');
  ok(A.sobrepoe(R(0, 0, 12, 30), R(11.9, 0, 12, 30)), '10 cm por cima: sobrepõe');
  const giro = (pts, a, cx, cy) => pts.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
  ok(!A.sobrepoe(R(0, 0, 10, 10), giro(R(13, 0, 10, 10), 0.3, 18, 5)), 'girado e afastado: não sobrepõe');
  ok(A.sobrepoe(R(0, 0, 10, 10), giro(R(11, 0, 10, 10), 0.3, 16, 5)), 'girado 17°, o canto avança 1,3 m: a 1 m de folga já sobrepõe');
  ok(A.sobrepoe(R(0, 0, 10, 10), giro(R(8, 0, 10, 10), 0.3, 13, 5)), 'girado e por cima: sobrepõe');

  /* dois grupos lado a lado, os dois cabem; o resumo da quadra diz 2 de 2 */
  let gs = [em(0, 0), em(14, 0)];
  let an = A.analisar(gs, { Q1: Q });
  ok(an.grupos.every(g => g.quadra === 'Q1' && g.cabe && !g.encosta.length), 'dois grupos com 2 m entre eles: os dois cabem');
  ok(an.quadras.Q1.cabem === 2 && an.quadras.Q1.grupos.length === 2 && Math.abs(an.quadras.Q1.areaCabem - 2 * 12 * 30) < 1e-6, 'resumo: 2 de 2, ocupando 720 m²');
  /* um em cima do outro: os dois acusam, e dizem com quem */
  gs = [em(0, 0), em(6, 0)];
  an = A.analisar(gs, { Q1: Q });
  ok(!an.grupos[0].cabe && an.grupos[0].estado[0] === 'choque' && an.grupos[0].encosta[0] === 1 && an.grupos[1].encosta[0] === 0, 'sobrepostos: choque, e cada um sabe com quem');
  ok(an.quadras.Q1.cabem === 0, 'e nenhum dos dois conta como cabendo');
  /* um passando da borda: fora, só ele */
  gs = [em(0, 0), em(45, 0)];
  an = A.analisar(gs, { Q1: Q });
  ok(an.grupos[0].cabe && !an.grupos[1].cabe && an.grupos[1].estado[0] === 'fora' && an.grupos[1].inteiros === 0, 'o da borda passa da quadra; o outro segue cabendo');
  /* um fora de qualquer quadra: sem veredito de quadra, sem resumo para ele */
  gs = [em(0, 0), em(300, 0)];
  an = A.analisar(gs, { Q1: Q });
  ok(an.grupos[1].quadra === null && !an.grupos[1].cabe && an.quadras.Q1.grupos.length === 1, 'fora de quadra não entra no resumo da quadra');
  /* um grupo de 5 estudos e um girado ao lado: a conta é por retângulo */
  const g5 = { cfg: { comprimento: 30, largura: 12, quantidade: 3, colunas: 3, espaco: 2 }, lat: anc0.lat, lng: anc0.lng, ang: 0 };
  an = A.analisar([g5, em(-30, 0, 0.4)], { Q1: Q });
  ok(an.grupos[0].estado.filter(e => e === 'choque').length >= 1 && an.grupos[0].estado.some(e => e === 'ok'), 'só os retângulos que se tocam acusam, não o grupo inteiro');

  /* AS VAGAS: cópias do grupo, no mesmo giro, que cabem inteiras na quadra.
     Passo = 12 + 2 na largura e 30 + 2 no comprimento: na quadra de 100 × 50
     cabem 7 numa fileira (centros em -42 … 42) e só uma fileira. */
  gs = [em(0, 0)];
  let v = A.vagas(gs, 0, { Q1: Q }, { quadra: 'Q1' });
  ok(v.length === 6, 'encher: cabem mais 6 iguais ao lado (7 na fileira), veio ' + v.length);
  ok(v.every(g => A.analisar(gs.concat([g]), { Q1: Q }).grupos[1].cabe), 'cada vaga cabe inteira e não encosta no original');
  ok(A.analisar(gs.concat(v), { Q1: Q }).quadras.Q1.cabem === 7, 'e todas juntas: 7 de 7 cabem, sem se sobrepor');
  const xs = v.map(g => Math.round(C.metrosLocais(g.lat, g.lng, anc0).x));
  ok(xs[0] === 14 && xs[1] === -14, 'a primeira vaga é a do lado (à direita, depois à esquerda): ' + xs.slice(0, 2));
  ok(A.vagas(gs, 0, { Q1: Q }, { quadra: 'Q1', max: 1 }).length === 1, 'o "+ Grupo" pede uma vaga só');
  /* com um grupo atravessado no caminho, a vaga dele some */
  v = A.vagas([em(0, 0), em(28, 0)], 0, { Q1: Q }, { quadra: 'Q1' });
  ok(v.length === 5 && v.every(g => Math.abs(C.metrosLocais(g.lat, g.lng, anc0).x - 28) > 1), 'vaga ocupada por outro grupo não conta (7 casas − o original − a ocupada = 5), veio ' + v.length);
  /* girado 90°: o estudo deita (30 m no sentido dos 100 m, 12 m no dos 50) e
     a grade de cópias vira 3 × 3 — o giro muda a conta, e ela acompanha */
  const deitado = em(0, 0, Math.PI / 2);
  ok(A.analisar([deitado], { Q1: Q }).grupos[0].cabe, 'girado 90°, o original cabe');
  v = A.vagas([deitado], 0, { Q1: Q }, { quadra: 'Q1' });
  ok(v.length === 8 && A.analisar([deitado].concat(v), { Q1: Q }).quadras.Q1.cabem === 9, 'girado 90°: 3 × 3 = 9 na quadra (o original + 8), veio ' + (v.length + 1));
  /* fora de quadra, o "+ Grupo" ainda acha a vaga livre do lado */
  ok(A.vagas([em(300, 0)], 0, { Q1: Q }, { max: 1 }).length === 1, 'sem quadra: a vaga livre mais perto');
  ok(A.vagas([{ cfg: { comprimento: '', largura: 12 }, lat: anc0.lat, lng: anc0.lng }], 0, { Q1: Q }, { quadra: 'Q1' }).length === 0, 'sem medida, sem vaga');
  console.log('medir com vários grupos: sobreposição, veredito por grupo, resumo da quadra e vagas OK.');
}

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
