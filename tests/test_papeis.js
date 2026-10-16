/* PAPÉIS: quem pode o quê (vendor/papeis-core.js) — e o banco concorda.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * 1. A ordem dos papéis e a tabela padrão (a que o Victor escolheu em
 *    16/10/2026: técnico corrige o que ele mesmo assinou; supervisor corrige
 *    a de qualquer pessoa, reabre, exclui e restaura; diretor aprova, emenda
 *    e finaliza).
 * 2. Cadastro sem papel, ou com papel inventado, é técnico.
 * 3. A política gravada completa com o padrão o que falta, e a validação do
 *    Painel Admin recusa tabela malformada.
 * 4. O PADRÃO DAS REGRAS DO BANCO É O MESMO DO MOTOR. As firestore.rules
 *    repetem a tabela padrão (o banco não lê JavaScript). Se alguém mudar um
 *    lado e esquecer o outro, a tela e o banco passam a discordar — a tela
 *    deixa, o banco recusa, e a sincronização do aparelho trava. Aqui reprova.
 *
 * Rodar: node tests/test_papeis.js (da raiz)
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('fs');
const P = require('../vendor/papeis-core.js');
let n = 0;
const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

/* 1. ordem e padrão */
ok(P.nivel('tecnico') < P.nivel('supervisor') && P.nivel('supervisor') < P.nivel('diretor') && P.nivel('diretor') < P.nivel('admin'), 'ordem dos papéis');
const pad = P.politicaPadrao();
eq(pad, { minimo: { corrigir: 'supervisor', reabrir: 'supervisor', excluir: 'supervisor', restaurar: 'supervisor',
  aprovar: 'diretor', emendar: 'diretor', finalizar: 'diretor' }, corrigirPropria: true }, 'tabela padrão escolhida');

/* 2. sem papel é técnico */
eq(P.papelDe({}), 'tecnico', 'cadastro sem papel');
eq(P.papelDe({ papel: 'chefe' }), 'tecnico', 'papel inventado');
eq(P.papelDe({ papel: ' Supervisor ' }), 'supervisor', 'papel com espaço e maiúscula');
eq(P.papelDe({ papel: 'tecnico' }, true), 'admin', 'administrador das regras é admin');
eq(P.papelDe({ papel: 'admin' }), 'admin', 'admin escrito no cadastro não vem das regras, mas é reconhecido');

/* pode / não pode, com a tabela padrão */
const casos = [
  ['tecnico', 'finalizar', false], ['supervisor', 'finalizar', false], ['diretor', 'finalizar', true], ['admin', 'finalizar', true],
  ['tecnico', 'reabrir', false], ['supervisor', 'reabrir', true],
  ['tecnico', 'excluir', false], ['supervisor', 'excluir', true],
  ['supervisor', 'aprovar', false], ['diretor', 'aprovar', true],
  ['supervisor', 'emendar', false], ['diretor', 'emendar', true],
  ['tecnico', 'restaurar', false], ['supervisor', 'restaurar', true],
  ['tecnico', 'corrigir', false], ['supervisor', 'corrigir', true]
];
casos.forEach(([papel, acao, esperado]) => eq(P.pode(papel, acao, null).ok, esperado, papel + ' ' + acao));
const recusa = P.pode('tecnico', 'finalizar', null);
ok(/diretor/.test(recusa.motivo) && /técnico/.test(recusa.motivo), 'a recusa diz o que pede e o papel de quem tentou');
eq(P.pode('diretor', 'finalizar', null).motivo, null, 'quem pode não recebe motivo');

/* correção da própria avaliação */
ok(P.pode('tecnico', 'corrigir', null, { proprio: true }).ok, 'técnico corrige o que assinou');
ok(!P.pode('tecnico', 'corrigir', null, { proprio: false }).ok, 'técnico não corrige a de outra pessoa');
ok(!P.pode('tecnico', 'corrigir', { corrigirPropria: false }, { proprio: true }).ok, 'com a opção desligada, nem a própria');
ok(P.pode('supervisor', 'corrigir', { corrigirPropria: false }, { proprio: true }).ok, 'supervisor continua podendo');
assert.throws(() => P.pode('diretor', 'inventada', null)); n++;

/* 3. política gravada */
const parcial = P.normalizarPolitica({ minimo: { finalizar: 'supervisor', excluir: 'xyz', extra: 'diretor' }, corrigirPropria: false });
eq(parcial.minimo.finalizar, 'supervisor', 'o que está gravado vale');
eq(parcial.minimo.excluir, 'supervisor', 'papel inválido volta ao padrão');
ok(!('extra' in parcial.minimo), 'ação desconhecida é descartada');
eq(parcial.corrigirPropria, false, 'corrigirPropria gravado vale');
eq(P.normalizarPolitica(null), pad, 'sem documento, o padrão');
ok(P.pode('supervisor', 'finalizar', parcial).ok, 'a tabela gravada muda o que se pode');
eq(P.validarPolitica(pad), [], 'o padrão é válido');
ok(P.validarPolitica({ minimo: { finalizar: 'diretor' }, corrigirPropria: true }).length > 0, 'tabela incompleta é recusada');
ok(P.validarPolitica(Object.assign({}, pad, { corrigirPropria: 'sim' })).length > 0, 'corrigirPropria tem de ser booleano');
ok(P.validarPolitica({ minimo: Object.assign({}, pad.minimo, { finalizar: 'admin' }), corrigirPropria: true }).length > 0, 'admin não é papel de tabela');

/* assinante */
eq(P.assinanteDe({ carimbo: { assinatura: { por: 'Ana@X.com' } } }), 'ana@x.com', 'assinatura por SHA-256');
eq(P.assinanteDe({ carimbo: { rubricaPor: 'ze@x.com' } }), 'ze@x.com', 'rubrica antiga');
eq(P.assinanteDe({ carimbo: { rubricaPor: 'Zé da Silva' } }), null, 'nome no lugar do e-mail não identifica');
eq(P.assinanteDe({}), null, 'sem carimbo');

/* 4. o banco tem o mesmo padrão */
const regras = fs.readFileSync('firestore.rules', 'utf8');
const m = regras.match(/function papelPadrao\(acao\)\s*\{\s*return\s*(\{[^}]*\})/);
ok(!!m, 'as regras declaram papelPadrao(acao)');
const padraoRegras = {};
m[1].replace(/'(\w+)'\s*:\s*'(\w+)'/g, (_, k, v) => { padraoRegras[k] = v; });
P.ACOES.filter(a => a.servidor).forEach(a => {
  eq(padraoRegras[a.id], a.padrao, 'regras e motor concordam: ' + a.id);
});
P.ACOES.filter(a => !a.servidor).forEach(a => ok(!(a.id in padraoRegras), a.id + ' não é conferido pelo banco, e as regras não fingem que é'));
const nivelRegras = regras.match(/function nivelDe\(papel\)\s*\{\s*return\s*(\{[^}]*\})/);
ok(!!nivelRegras, 'as regras declaram nivelDe(papel)');
['tecnico', 'supervisor', 'diretor'].forEach(p => {
  const v = (nivelRegras[1].match(new RegExp("'" + p + "'\\s*:\\s*(\\d)")) || [])[1];
  eq(Number(v), P.nivel(p), 'nível igual nas regras: ' + p);
});


/* 5. eventos formais: o papel exigido é o da política, gravado no evento */
const E = require('../vendor/eventos-core.js');
const tec = { email: 'tec@x.com', nome: 'Técnico', papel: 'tecnico' };
const ctxE = (autor, extra) => Object.assign({ autor, em: '2026-10-16T10:00:00Z', organizacao: null, dispositivo: 'd1' }, extra || {});
const ent = { entidade: { tipo: 'estudo', id: 'Q1|S1' }, rubrica: 'sha256:x' };
assert.throws(() => E.criar('estudo.finalizado', ent, ctxE(tec)), /exige diretor/); n++;
const evTec = E.criar('estudo.finalizado', ent, ctxE(tec, { papelExigido: P.exigido('finalizar', { minimo: { finalizar: 'tecnico' } }) }));
eq(evTec.evento.papelExigido, 'tecnico', 'o evento guarda o papel que a política exigia');
ok(E.idDe(evTec.evento) === evTec.evento.id, 'papelExigido entra no hash do evento');
assert.throws(() => E.criar('estudo.finalizado', ent, ctxE(tec, { papelExigido: 'chefe' })), /papel exigido desconhecido/); n++;
const corr = { entidade: { tipo: 'observacao', id: 'obs1' }, motivo: 'digitei errado', de: 10, para: 12 };
assert.throws(() => E.criar('observacao.corrigida', corr, ctxE(tec)), /exige supervisor/); n++;
ok(!!E.criar('observacao.corrigida', corr, ctxE(tec, { papelExigido: P.exigido('corrigir', null, { proprio: true }) })).evento, 'técnico corrige o que assinou');
assert.throws(() => E.criar('observacao.corrigida', corr, ctxE(tec, { papelExigido: P.exigido('corrigir', null, { proprio: false }) })), /exige supervisor/); n++;
const legado = E.criar('estudo.finalizado', ent, ctxE({ email: 'z@x.com', nome: 'Zé' }));
ok(!('papelExigido' in legado.evento) && legado.avisos.length === 1, 'sem papel declarado continua aviso, e o evento antigo não muda de forma');

/* 6. restaurar ou importar: as ações que a troca de estado implica */
const est = (id, extra) => Object.assign({ id, aplicacoes: [{ id: 'P1' }], avaliacoes: [{ id: 'A1' }] }, extra || {});
const D = estudos => ({ __config: {}, Q1: { estudos } });
eq(P.acoesDaMudanca(D([est('S1')]), D([est('S1', { cultura: 'Soja' })])), [], 'mudar campo comum não implica nada');
eq(P.acoesDaMudanca(D([est('S1')]), D([est('S1', { finalizacao: { em: 'x' } })])), ['finalizar'], 'voltar a finalizado');
eq(P.acoesDaMudanca(D([est('S1', { finalizacao: { em: 'x' } })]), D([est('S1')])), ['reabrir'], 'voltar a aberto');
eq(P.acoesDaMudanca(D([est('S1')]), D([est('S1', { protocoloVivo: { status: 'aprovado', versao: 1 } })])), ['aprovar'], 'protocolo volta a aprovado');
eq(P.acoesDaMudanca(D([est('S1', { protocoloVivo: { status: 'aprovado', versao: 2 } })]), D([est('S1', { protocoloVivo: { status: 'aprovado', versao: 1 } })])), ['emendar'], 'versão do protocolo muda');
eq(P.acoesDaMudanca(D([est('S1'), est('S2')]), D([est('S1')])), ['excluir'], 'estudo some');
eq(P.acoesDaMudanca(D([est('S1')]), D([est('S1', { avaliacoes: [] })])), ['excluir'], 'avaliação some');
eq(P.acoesDaMudanca(D([est('S1')]), D([est('S1', { aplicacoes: [] })])), ['excluir'], 'aplicação some');
eq(P.acoesDaMudanca(D([]), D([est('S9', { finalizacao: { em: 'x' } })])), ['finalizar'], 'estudo que volta já finalizado');
eq(P.acoesDaMudanca(D([est('S1')]), { __config: {}, Q2: { estudos: [est('S1')] } }), [], 'estudo que muda de quadra não é exclusão (o documento é por estudo)');
eq(P.acoesDaMudanca(D([est('S1', { finalizacao: { em: 'x' } }), est('S2')]), D([est('S1')])), ['reabrir', 'excluir'], 'várias de uma vez, na ordem da tabela');

console.log('papeis + eventos: ' + n + ' verificações ok');
