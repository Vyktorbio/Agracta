/* QUAIS CAMPOS FALTAM, E POR QUÊ.
 *
 * Relato de uso (13/10/2026): "8 campos pendentes — eu preencho com 0 e
 * continua". O cartão dizia quantos faltavam, nunca quais: a célula que a
 * pessoa via vazia não era a que a contagem cobrava (outra variável, o N da
 * razão, uma sub-amostra, o 2º avaliador). Zero conta como preenchido.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. A lista tem exatamente o tamanho da contagem `pending`.
 *  2. Zero é valor: não aparece como pendente.
 *  3. Cada caso diz o motivo certo: vazio, falta o N, falta o n, n > N,
 *     sub-amostras x de y, dupla leitura sem o 2º avaliador.
 *  4. Tratamento que o protocolo marcou como "não se aplica" não é cobrado.
 *  5. O cartão da avaliação mostra a lista só na avaliação parcial.
 *
 * Rodar: node tests/test_avaliacao_pendentes.js
 */
'use strict';
const assert = require('node:assert/strict');
const C = require('../vendor/avaliacao-core.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; console.log('  ok    ' + m); };

const st = { numRepeticoes: 2, tratamentos: [{ id: 'T1' }, { id: 'T2' }] };
const av = {
  variaveis: ['Consumo foliar', 'Consumo de isca %', 'Mortalidade', 'Lesões'],
  tipos: { 'Consumo foliar': 'pct', 'Consumo de isca %': 'pct', 'Mortalidade': 'razao', 'Lesões': 'pct' },
  varcfg: { 'Lesões': { sub: 3 } },
  notas: {
    T1R1: { 'Consumo foliar': 0, 'Consumo de isca %': 0, 'Mortalidade': 0, 'Lesões': 10 },
    T1R2: { 'Consumo foliar': '0', 'Consumo de isca %': '', 'Mortalidade': 50, 'Lesões': 5 },
    T2R1: { 'Consumo foliar': 15, 'Mortalidade': 100, 'Lesões': 3 },
    T2R2: { 'Consumo foliar': 10, 'Mortalidade': null, 'Lesões': 1 }
  },
  bruto: {
    T1R1: { 'Mortalidade': { n: '0', N: '10' }, 'Lesões': { sub: ['10', '10', '10'] } },
    T1R2: { 'Mortalidade': { n: '5', N: '' }, 'Lesões': { sub: ['5', '', ''] } },
    T2R1: { 'Mortalidade': { n: '12', N: '10' }, 'Lesões': { sub: ['3', '3', '3'] } },
    T2R2: { 'Mortalidade': { n: '', N: '10' }, 'Lesões': { sub: ['1', '1', '1'] } }
  }
};
const p = C.pendentes(st, av), prog = C.avaliacao(st, av);
const de = (k, v) => p.find(x => x.key === k && x.variavel === v);
console.log('\n[1] a lista e a contagem');
ok(p.length === prog.pending, 'a lista tem o tamanho da contagem (' + p.length + ' = ' + prog.pending + ')');
console.log('\n[2] zero é valor');
ok(!de('T1R1', 'Consumo foliar') && !de('T1R2', 'Consumo foliar'), 'zero (número ou texto) não é pendente');
ok(!de('T1R1', 'Mortalidade'), 'razão 0/10 está completa');
console.log('\n[3] o motivo de cada um');
ok(de('T1R2', 'Consumo de isca %').motivo === 'vazio', 'célula em branco: vazio');
ok(de('T2R1', 'Consumo de isca %').motivo === 'vazio', 'variável sem nota nenhuma na parcela: vazio');
ok(de('T1R2', 'Mortalidade').motivo === 'falta o N (avaliados)', 'razão sem N: falta o N');
ok(de('T2R2', 'Mortalidade').motivo === 'falta o n (afetados)', 'razão sem n: falta o n');
ok(de('T2R1', 'Mortalidade').motivo === 'n maior que N', 'n > N: diz que n é maior que N');
ok(de('T1R2', 'Lesões').motivo === 'sub-amostras: 1 de 3 preenchidas', 'sub-amostra incompleta: diz quantas de quantas');
ok(de('T1R2', 'Consumo de isca %').tratId === 'T1' && de('T1R2', 'Consumo de isca %').rep === 2, 'cada pendente diz tratamento e repetição');
const dupla = Object.assign({}, av, { variaveis: ['Consumo foliar'], duplaLeitura: true,
  avaliadores: { A: { notas: { T1R1: { 'Consumo foliar': 0 }, T1R2: { 'Consumo foliar': 0 }, T2R1: { 'Consumo foliar': 1 }, T2R2: { 'Consumo foliar': 2 } } }, B: { notas: { T1R1: { 'Consumo foliar': 0 } } } } });
const pd = C.pendentes(st, dupla);
ok(pd.length === 3 && pd.every(x => /avaliador B \(dupla leitura\)/.test(x.motivo)), 'dupla leitura: falta a leitura do avaliador B');
console.log('\n[4] não se aplica não é cobrado');
const na = Object.assign({}, av, { varcfg: Object.assign({}, av.varcfg, { 'Consumo de isca %': { naTratamentos: ['T2'] } }) });
ok(!C.pendentes(st, na).some(x => x.variavel === 'Consumo de isca %' && x.tratId === 'T2'), 'tratamento desmarcado no protocolo sai da lista');
ok(C.pendentes(st, na).length === C.avaliacao(st, na).pending, 'e a contagem acompanha');
console.log('\n[5] o cartão da avaliação');
const src = require('fs').readFileSync('app.js', 'utf8');
const i = src.indexOf("var _prog=AvaliacaoCore.avaliacao(study,a);"), bloco = src.slice(i, i + 1400);
ok(/AvaliacaoCore\.pendentes\(study,a\)/.test(bloco), 'o cartão usa AvaliacaoCore.pendentes');
ok(/_prog\.started&&!_prog\.complete/.test(bloco), 'só na avaliação parcial');
ok(/esc\(x\.variavel\)/.test(bloco) && /esc\(x\.motivo\)/.test(bloco) && /esc\(x\.tratId\)/.test(bloco), 'mostra tratamento, variável e motivo, escapados');
console.log('\nPendentes: lista igual à contagem, zero é valor e cada falta diz o motivo (' + n + ' verificações) OK.');
