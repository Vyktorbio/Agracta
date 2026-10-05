'use strict';
/* "NÃO DIMINUI": a leitura de hoje abaixo da avaliação anterior (AvaliacaoCore).
 *
 * Pedido de quem usa: "imagine que eu dei 30% de severidade e no dia seguinte eu
 * coloco 29%. Ou então se eu colocar que morreram 30 insetos hoje e amanhã colocar
 * que tem 25" — avisar, sem bloquear.
 *
 * O que este teste segura:
 *  1. a queda é contra a leitura ANTERIOR da MESMA parcela e variável (a mais recente
 *     antes desta, pulando a avaliação que não leu aquela parcela);
 *  2. só vale para variável que ACUMULA — insetos vivos podem cair, e avisar ali seria
 *     ensinar a ignorar o aviso; quem decide é o nome, a escolha explícita na
 *     avaliação, ou a escolha da avaliação anterior;
 *  3. é aviso: nada aqui escreve na avaliação.
 *
 * Rodar: node test_avaliacao_queda.js
 */
const assert = require('node:assert/strict');
const C = require('./vendor/avaliacao-core.js');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

/* 1. Pelo nome: o que acumula e o que pode cair */
['Severidade (%)', 'Mortalidade', 'Insetos mortos', 'Plantas mortas', 'Incidência', 'Lesões por folha', 'Desfolha',
 'Germinação', 'Emergência', 'Índice de doença', 'Ferrugem', 'Dano (%)', 'Óbitos'].forEach((v) =>
  ok(C.acumulaPorNome(v), v + ': acumula'));
['Insetos vivos', 'Nº de insetos', 'Fitotoxicidade', 'Altura (cm)', 'Lesma paralisada', 'Eficácia (%)', 'Produtividade', 'Vigor'].forEach((v) =>
  ok(!C.acumulaPorNome(v), v + ': pode cair, sem aviso'));

/* um estudo: T1 e T2, duas repetições, três avaliações */
const st = { tratamentos: [{ id: 'T1' }, { id: 'T2' }], numRepeticoes: 2, avaliacoes: [
  { id: 'a1', data: '2026-10-01', variaveis: ['Severidade', 'Insetos mortos', 'Insetos vivos'],
    notas: { T1R1: { Severidade: '30', 'Insetos mortos': '30', 'Insetos vivos': '40' }, T1R2: { Severidade: '10' }, T2R1: { Severidade: '5' } } },
  { id: 'a2', data: '2026-10-02', variaveis: ['Severidade', 'Insetos mortos', 'Insetos vivos'],
    notas: { T1R1: { Severidade: '29', 'Insetos mortos': '25', 'Insetos vivos': '12' }, T1R2: { Severidade: '' }, T2R1: { Severidade: '5' } } },
  { id: 'a3', data: '2026-10-05', variaveis: ['Severidade'], notas: { T1R1: { Severidade: '35' }, T1R2: { Severidade: '9,5' } } }
] };
const row = (t, r) => ({ key: t + 'R' + r, tratId: t, rep: r });
const [a1, a2, a3] = st.avaliacoes;

/* 2. Os dois exemplos do pedido */
let q = C.queda(st, a2, a2, row('T1', 1), 'Severidade', '29');
ok(q && q.antes === 30 && q.agora === 29 && q.data === '2026-10-01', '30 % e no dia seguinte 29 %: aviso, com a leitura anterior e a data dela');
q = C.queda(st, a2, a2, row('T1', 1), 'Insetos mortos', '25');
ok(q && q.antes === 30 && q.agora === 25, 'morreram 30 e no dia seguinte 25: aviso');
ok(C.queda(st, a2, a2, row('T1', 1), 'Insetos vivos', '12') === null, 'insetos VIVOS caindo de 40 para 12 é o inseticida funcionando: sem aviso');
ok(C.queda(st, a2, a2, row('T1', 1), 'Severidade', '30') === null, 'igual à anterior não é queda');
ok(C.queda(st, a2, a2, row('T1', 1), 'Severidade', '31') === null, 'maior não é queda');
ok(C.queda(st, a2, a2, row('T1', 1), 'Severidade', '') === null && C.queda(st, a2, a2, row('T1', 1), 'Severidade', 'abc') === null, 'sem número, sem comparação');
ok(C.queda(st, a2, a2, row('T1', 1), 'Severidade', '29,5').agora === 29.5, 'vírgula decimal');
ok(C.queda(st, a1, a1, row('T1', 1), 'Severidade', '1') === null, 'a primeira avaliação não tem anterior');

/* 3. A anterior é a mais recente ANTES, com número para a parcela */
ok(C.anterior(st, a3, row('T1', 1), 'Severidade').n === 29, 'antes da a3 vem a a2 (29), não a a1');
ok(C.anterior(st, a3, row('T1', 2), 'Severidade').n === 10 && C.anterior(st, a3, row('T1', 2), 'Severidade').avId === 'a1',
  'a a2 pulou a parcela T1R2: a anterior dela é a a1');
q = C.queda(st, a3, a3, row('T1', 2), 'Severidade', '9,5');
ok(q && q.antes === 10 && q.data === '2026-10-01', '9,5 depois de 10 (pulando a avaliação vazia): aviso');
ok(C.anterior(st, { id: 'nova', data: '2026-10-03' }, row('T1', 1), 'Severidade').n === 29, 'avaliação nova, ainda fora da lista: a anterior é pela data');
ok(C.anterior(st, { id: 'nova', data: '' }, row('T1', 1), 'Severidade') === null, 'sem data não há "antes"');
ok(C.anterior(st, a2, row('T1', 1), 'Severidade').avId === 'a1', 'a avaliação seguinte (a3) nunca é "anterior"');
/* mesmo dia: vale a ordem em que foram lançadas */
const dia = { tratamentos: [{ id: 'T1' }], numRepeticoes: 1, avaliacoes: [
  { id: 'm', data: '2026-10-01', variaveis: ['Mortos'], notas: { T1R1: { Mortos: '8' } } },
  { id: 't', data: '2026-10-01', variaveis: ['Mortos'], notas: { T1R1: { Mortos: '6' } } }] };
ok(C.queda(dia, dia.avaliacoes[1], dia.avaliacoes[1], row('T1', 1), 'Mortos', '6').antes === 8, 'mesmo dia: a lançada antes é a anterior');
ok(C.queda(dia, dia.avaliacoes[0], dia.avaliacoes[0], row('T1', 1), 'Mortos', '8') === null, 'e a lançada depois não conta para a primeira');
/* nota antiga por tratamento (rep 1) continua legível */
const antigo = { tratamentos: [{ id: 'T1' }], numRepeticoes: 1, avaliacoes: [
  { id: 'x', data: '2026-01-01', variaveis: ['Severidade'], notas: { T1: { Severidade: '20' } } },
  { id: 'y', data: '2026-01-08', variaveis: ['Severidade'], notas: { T1R1: { Severidade: '12' } } }] };
ok(C.quedas(antigo, antigo.avaliacoes[1]).length === 1, 'nota antiga gravada por tratamento entra na comparação');
/* não aplicável não compara */
const na = JSON.parse(JSON.stringify(st)); na.avaliacoes[1].varcfg = { Severidade: { naTratamentos: ['T1'] } };
ok(C.quedas(na, na.avaliacoes[1]).every((x) => !(x.tratId === 'T1' && x.v === 'Severidade')), 'parcela não aplicável não é comparada');

/* 4. A escolha explícita vence o nome, e segue para as próximas avaliações */
const esc = JSON.parse(JSON.stringify(st));
esc.avaliacoes[1].varcfg = { 'Insetos vivos': { acumula: true }, Severidade: { acumula: false } };
ok(C.acumula(esc, esc.avaliacoes[1], 'Insetos vivos') && !C.acumula(esc, esc.avaliacoes[1], 'Severidade'), 'ligado e desligado à mão, na avaliação');
ok(!C.acumula(esc, esc.avaliacoes[2], 'Severidade'), 'a avaliação seguinte herda a escolha (sem repetir a cada data)');
ok(C.acumula(esc, esc.avaliacoes[0], 'Severidade'), 'mas a anterior à escolha continua pelo nome');
ok(C.queda(esc, esc.avaliacoes[1], esc.avaliacoes[1], row('T1', 1), 'Insetos vivos', '12').antes === 40, 'ligado à mão, avisa');

/* 5. A lista da avaliação inteira, e nada escrito */
const antes = JSON.stringify(st);
const lista = C.quedas(st, a2);
ok(lista.length === 2 && lista.every((x) => x.row === 'T1R1' && x.dataAgora === '2026-10-02'), 'a2: severidade e mortos da T1R1 caíram: ' + JSON.stringify(lista.map((x) => x.v)));
ok(C.quedas(st, a1).length === 0, 'a primeira avaliação: nada');
ok(JSON.stringify(st) === antes, 'consulta pura: nenhuma nota alterada');

console.log('não diminui: ' + n + ' verificações OK.');
