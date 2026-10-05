'use strict';
/* Croqui com parcelas livres: ordem do sorteio, plantas por parcela, retângulo
   solto, desfazer, forma no mapa, "Onde estou" pela planta e o que é salvo. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const ctx = { console, Math, JSON, document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} } } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('vendor/croqui-campo-core.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('croqui-livre.js', 'utf8'), ctx);
const C = ctx.CroquiCore, L = ctx.AgCroquiLivre;
const ordem = [{ tratId: 'T2', rep: 1, parcela: 1 }, { tratId: 'T1', rep: 1, parcela: 2 }, { tratId: 'T1', rep: 2, parcela: 3 }, { tratId: 'T2', rep: 2, parcela: 4 }];

/* fila na ordem do sorteio, sem tamanho de parcela */
const st = { tratamentos: [{ id: 'T1' }, { id: 'T2' }], numRepeticoes: 2, randomizado: true };
ctx.ensureStudyRandomizacao = () => ({ ordem });
const fila = L.filaDoEstudo(st);
ok(fila.length === 4 && fila[0].tratId === 'T2' && fila[1].tratId === 'T1' && fila[0].ordem === 1, 'fila segue o sorteio');

/* plantas: 3 por parcela; o 3º toque passa para a próxima */
const livre = { tipo: 'ponto', itens: [] }, cfg = { tipo: 'ponto', porParcela: 3, raio: 1.5, atual: 1 };
let r = L.adicionar(livre, cfg, 0, 0, 4); cfg.atual = r.atual;
r = L.adicionar(livre, cfg, 4, 0, 4); cfg.atual = r.atual;
ok(cfg.atual === 1 && L.plantasNa(livre, 1) === 2, 'duas plantas: ainda na mesma parcela');
r = L.adicionar(livre, cfg, 8, 0, 4); cfg.atual = r.atual;
ok(cfg.atual === 2 && L.plantasNa(livre, 1) === 3, 'terceira planta fecha a parcela');
cfg.atual = L.desfazer(livre, cfg);
ok(cfg.atual === 1 && L.plantasNa(livre, 1) === 2, 'desfazer tira a última planta e volta');
L.adicionar(livre, cfg, 8, 0, 4); cfg.atual = 2;
/* parcela 2 com árvores em outro lugar do pomar */
[[30, 20], [33, 20], [36, 20]].forEach(([x, y]) => { cfg.atual = L.adicionar(livre, cfg, x, y, 4).atual; });
ok(cfg.atual === 3, 'segunda parcela completa');

/* motor: grade livre */
const g = C.grade({ tratamentos: 2, repeticoes: 2, ordem, livre });
ok(g.livre && g.parcelas.length === 2 && g.faltam === 2, 'duas com lugar, duas faltando');
ok(g.problemas.some(p => /2 parcela\(s\) ainda sem lugar/.test(p)), 'o que falta é dito');
const p1 = g.parcelas[0];
ok(p1.tratId === 'T2' && p1.partes.length === 3 && Math.abs(p1.w - 11) < 1e-9, 'parcela de plantas: caixa envolve as copas');
ok(C.setas(g).length === 0 && C.caminho(g).length === 2, 'livre: caminho sim, setas de coluna não');
const anc = { lat: -21.5, lng: -48, ang: 0.2 };
const cant = C.cantosDaParcela(p1, anc);
ok(Array.isArray(cant[0][0][0]) && cant.length === 3, 'no mapa: um polígono por planta (multipolígono)');
ok(C.formaLocal(p1).length === 3 && C.formaLocal({ x: 0, y: 0, w: 3, h: 5 }).length === 1, 'forma: plantas e retângulo');
/* onde estou: em cima da planta = dentro; entre duas copas = não */
const em = (x, y) => C.pontoLatLng(x, y, anc);
let q = em(4, 0.3); let o = C.ondeEstou(q[0], q[1], 1, g, anc);
ok(o.parcela && o.parcela.ordem === 1, 'em cima da 2ª árvore: parcela 1');
q = em(20, 10); o = C.ondeEstou(q[0], q[1], 1, g, anc);
ok(!o.parcela || o.nivel !== 'dentro', 'no meio do pomar, longe das copas: não está em parcela');
ok(C.relacaoComParcela(4, 0, p1).dist === 0 && C.relacaoComParcela(4, 3, p1).dist > 1, 'distância conta pela copa');

/* retângulo solto */
const l2 = { tipo: 'ret', itens: [] }, c2 = { tipo: 'ret', comprimento: 5, largura: 3, atual: 1 };
c2.atual = L.adicionar(l2, c2, 10, 10, 4).atual;
ok(c2.atual === 2 && l2.itens[0].x === 8.5 && l2.itens[0].w === 3, 'retângulo C × L centrado no toque');
const g2 = C.grade({ tratamentos: 2, repeticoes: 2, ordem, livre: l2 });
ok(g2.parcelas[0].w === 3 && !g2.parcelas[0].partes, 'retângulo livre no motor');

/* grade normal continua igual */
const g3 = C.grade({ tratamentos: 2, repeticoes: 2, comprimento: 5, largura: 3, colunas: 2, ordem });
ok(!g3.livre && g3.parcelas.length === 4 && g3.parcelas.every(p => !p.partes), 'sem livre: grade de sempre');
ok(C.grade({ tratamentos: 2, repeticoes: 2, ordem }).problemas.some(p => /tamanho da parcela/.test(p)), 'grade sem medida continua recusada');

/* app.js: o que é salvo passa pelo filtro */
const src = fs.readFileSync('app.js', 'utf8');
function pega(nome) { const i = src.indexOf('function ' + nome + '('); let p = 0, j = i, a = false;
  for (; j < src.length; j++) { if (src[j] === '{') { p++; a = true; } else if (src[j] === '}' && --p === 0 && a) { j++; break; } } return src.slice(i, j); }
vm.runInContext(pega('_croquiLivreLimpo') + ';' + pega('croquiPos') + ';this._l=_croquiLivreLimpo;this._p=croquiPos;', ctx);
const limpo = ctx._l({ tipo: 'ponto', itens: [{ ordem: 1, partes: [{ x: '1,5', y: 2, r: 0 }] }, { ordem: 0, x: 1 }, null] });
ok(limpo.itens.length === 1 && limpo.itens[0].partes[0].r === 1, 'itens inválidos saem; raio ausente vira 1 m');
ok(ctx._l({ itens: [] }) === null, 'sem itens: não grava campo livre');
const pos = ctx._p({ croqui: { lat: 1, lng: 2, ang: 0, livre: livre } });
ok(pos.livre && pos.livre.itens.length === 2, 'croquiPos traz as parcelas livres salvas');
console.log('croqui livre: ' + n + ' verificações OK.');
