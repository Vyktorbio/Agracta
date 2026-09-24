'use strict';
/* Observação canônica + eventos formais: identidade estável, projeção sem
   escrita, EPPO por injeção, momento sem "0 DAA" inventado, n e variância,
   eventos com hash, grafo offline, correção com conflito e trilha legada. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const O = require('./vendor/observacao-core');
const E = require('./vendor/eventos-core');

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); n++; };

/* ------------------------------------------------------------ observação */
const estudo = {
  id: 'S1', codigo: 'AGR-2026-113', numRepeticoes: 2, cultura: 'Soja', alvo: 'percevejo-marrom',
  alvoSci: 'Euschistus heros', desenho: 'dbc', doseUnidade: 'L/ha',
  tratamentos: [{ id: 'T1', produto: 'Testemunha', testemunha: true }, { id: 'T2', produto: 'Produto A', dose: '0,5', ingredienteAtivo: 'x' }],
  avaliacoes: [
    { id: 'A1', data: '2026-09-08', bbch: '65', tipo: 'Contagem', momento: { unidade: 'DAT', valor: '7' },
      variaveis: ['Ninfas'], tipos: { Ninfas: 'contagem' }, varcfg: { Ninfas: { unidade: 'ninfas/m', sub: 2 } },
      notas: { T1: { Ninfas: '10' }, T1R2: { Ninfas: 12 }, T2R1: { Ninfas: '2' }, T2R2: { Ninfas: '' } },
      bruto: { T1R1: { Ninfas: { sub: ['9', '11'] } } } },
    /* herda o esquema da anterior e não tem momento explícito */
    { id: 'A2', data: '2026-09-15', variaveis: [], notas: { T1R1: { Ninfas: '8' }, T2R1: { Ninfas: 'n/a' } } }
  ]
};
const copia = JSON.parse(JSON.stringify(estudo));
const eppo = (nome, tipo) => ({ 'Soja': 'GLXMA', 'Euschistus heros': 'EUSCHE' })[nome] || null;
const obs = O.extrair(estudo, { qid: 'Q19', organizacao: 'org-1', ambiente: 'campo', local: 'Estação' }, { eppo });

eq(estudo, copia, 'extrair não escreve no estudo');
ok(obs.length === 5, 'célula vazia não vira observação; texto não numérico vira sim: ' + obs.length);
const o1 = obs.find(o => o.parcela.chave === 'T1R1' && o.avaliacao.id === 'A1');
ok(o1.valor === 10, 'chave antiga só com id do tratamento vale para R1');
eq(o1.bruto, { subamostras: [9, 11] }, 'subamostras preservadas');
eq(o1.momento, { unidade: 'DAT', valor: 7, dias: 7, explicito: true }, 'DAT explícito');
eq(o1.cultura, { nome: 'Soja', eppo: 'GLXMA', resolvido: true, fonte: 'tabela' }, 'cultura via tabela');
ok(o1.alvo.eppo === 'EUSCHE' && o1.alvo.comum === 'percevejo-marrom', 'alvo pelo nome científico, comum guardado');
ok(o1.organizacao === 'org-1' && o1.schema === 1, 'organização e schema em todo registro');
ok(o1.variavel.unidade === 'ninfas/m' && o1.metodo.subamostras === 2, 'unidade e método');
ok(o1.tratamento.testemunha === true, 'testemunha marcada');
const a2 = obs.filter(o => o.avaliacao.id === 'A2');
ok(a2.length === 2 && a2[0].variavel.nome === 'Ninfas', 'A2 herdou variáveis de A1');
eq(a2[0].momento, { unidade: null, valor: null, dias: null, explicito: false }, 'sem referência: momento null, nunca 0 DAA');
const naoNum = a2.find(o => o.parcela.chave === 'T2R1');
ok(naoNum.valor === null && naoNum.valorOriginal === 'n/a', 'texto preservado como valorOriginal');
const comRef = O.extrair(estudo, { qid: 'Q19', dataReferencia: '01/09/2026' });
ok(comRef.find(o => o.avaliacao.id === 'A2').momento.dias === 14, 'DAA pela data de referência (dd/mm/aaaa)');
ok(comRef[0].organizacao === null && 'organizacao' in comRef[0], 'organizacao presente mesmo sem valor');
const semTabela = O.extrair(estudo, { qid: 'Q19' });
ok(semTabela[0].cultura.resolvido === false && semTabela[0].cultura.eppo === null, 'sem tabela: resolvido false');
const declarado = O.extrair(Object.assign({}, estudo, { culturaEppo: 'glxma' }), { qid: 'Q19' });
ok(declarado[0].cultura.eppo === 'GLXMA' && declarado[0].cultura.fonte === 'declarado', 'EPPO declarado normalizado');
ok(O.codigoEppo('abc') === null && O.codigoEppo('1EUSCG') === '1EUSCG', 'forma do código EPPO');

/* identidade */
const ids = new Set(obs.map(o => o.id));
ok(ids.size === obs.length, 'ids únicos');
const mudado = JSON.parse(JSON.stringify(estudo)); mudado.avaliacoes[0].notas.T1R2.Ninfas = 99;
ok(O.extrair(mudado, { qid: 'Q19' }).some(o => o.id === obs.find(x => x.parcela.chave === 'T1R2').id), 'mudar o valor não muda o id');
eq(O.partesDoId(o1.id), { qid: 'Q19', sid: 'S1', avaliacao: 'A1', parcela: 'T1R1', variavel: 'Ninfas', leitor: null }, 'id reversível');
ok(!o1.id.includes('/'), 'id serve de documento no Firestore');
assert.throws(() => O.idObservacao({ sid: 'S1', avaliacao: 'A1' })); n++;

/* dupla leitura */
const dupla = { id: 'S2', numRepeticoes: 1, tratamentos: [{ id: 'T1' }],
  avaliacoes: [{ id: 'D1', duplaLeitura: true, variaveis: ['Sev'], notas: { T1R1: { Sev: 5 } },
    avaliadores: { A: { nome: 'Ana', notas: { T1R1: { Sev: 4 } } }, B: { notas: { T1R1: { Sev: 6 } } } } }] };
const od = O.extrair(dupla, { qid: 'Q' });
eq(od.map(o => [o.leitor, o.valor]), [[null, 5], ['A', 4], ['B', 6]], 'consolidado + um por leitor');

/* resumo */
const rs = O.resumir(obs);
const r1 = rs.find(r => r.avaliacao.id === 'A1' && r.tratamento.id === 'T1');
ok(r1.n === 2 && r1.media === 11 && r1.variancia === 2, 'n, média e variância amostral');
ok(rs.find(r => r.avaliacao.id === 'A1' && r.tratamento.id === 'T2').variancia === null, 'n=1 sem variância');
ok(O.resumir(od).length === 1 && O.resumir(od)[0].media === 5, 'resumo ignora leitores individuais');
const f = O.faltasParaComparar(r1, O.resumir(semTabela).find(r => r.avaliacao.id === 'A1' && r.tratamento.id === 'T1'));
ok(f.includes('alvo sem código EPPO') && f.includes('ambientes diferentes (campo × laboratório)'), 'comparabilidade lista o que falta');
eq(O.faltasParaComparar(r1, r1), [], 'resumo comparável consigo mesmo');

/* ---------------------------------------------------------------- eventos */
ok(E.sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'vetor SHA-256');
for (const s of ['', 'ação — ç ü 😀', 'x'.repeat(1000), JSON.stringify(obs)]) {
  ok(E.sha256(s) === crypto.createHash('sha256').update(s, 'utf8').digest('hex'), 'SHA-256 igual ao do Node (' + s.length + ')');
}

const kEst = O.chaveEstudo('Q19', 'S1');
const ana = { email: 'Ana@X.com', nome: 'Ana', papel: 'supervisor' };
const dir = { email: 'dir@x.com', nome: 'Diretora', papel: 'diretor' };
const ctx = (autor, em, extra) => Object.assign({ autor, em, organizacao: 'org-1', dispositivo: 'tablet-1', fuso: 'America/Sao_Paulo' }, extra || {});

assert.throws(() => E.criar('estudo.reaberto', { entidade: { tipo: 'estudo', id: kEst } }, ctx(ana, '2026-09-20T10:00:00Z')), /motivo obrigatório/); n++;
assert.throws(() => E.criar('estudo.reaberto', { entidade: { tipo: 'estudo', id: kEst }, motivo: 'x' }, ctx(ana, '2026-09-20T10:00:00Z')), /rubrica/); n++;
assert.throws(() => E.criar('estudo.finalizado', { entidade: { tipo: 'estudo', id: kEst }, rubrica: 'r' }, ctx(ana, '2026-09-20T10:00:00Z')), /exige diretor/); n++;
assert.throws(() => E.criar('avaliacao.invalidada', { entidade: { tipo: 'avaliacao', id: 'A1' }, motivo: 'm', rubrica: 1 }, ctx(ana, '2026-09-20T10:00:00Z')), /estudo a que pertence/); n++;
assert.throws(() => E.criar('observacao.corrigida', { entidade: { tipo: 'observacao', id: o1.id }, motivo: 'm', de: 10, para: 10 }, ctx(ana, '2026-09-20T10:00:00Z')), /iguais/); n++;
assert.throws(() => E.criar('inventado', {}, ctx(ana, '2026-09-20T10:00:00Z')), /desconhecido/); n++;
assert.throws(() => E.criar('legado.registro', { entidade: { tipo: 'estudo', id: kEst } }, ctx(ana, '2026-09-20T10:00:00Z')), /reservado/); n++;
const semPapel = E.criar('estudo.finalizado', { entidade: { tipo: 'estudo', id: kEst }, rubrica: 'r' }, ctx({ nome: 'Zé' }, '2026-09-20T10:00:00Z'));
ok(semPapel.avisos.length === 1 && /papel/.test(semPapel.avisos[0]), 'papel ausente é aviso, não recusa');

let reg = [];
let r = E.anexar(reg, 'estudo.finalizado', { entidade: { tipo: 'estudo', id: kEst }, rubrica: 'data:rub' }, ctx(dir, '2026-09-20T10:00:00Z'));
reg = r.registro;
ok(Object.isFrozen(r.evento) && Object.isFrozen(r.evento.autor), 'evento imutável');
ok(/^ev:[0-9a-f]{64}$/.test(r.evento.id) && E.idDe(r.evento) === r.evento.id, 'id é o hash do conteúdo');
r = E.anexar(reg, 'estudo.reaberto', { entidade: { tipo: 'estudo', id: kEst }, motivo: 'erro de digitação em A1', rubrica: 'data:rub2' }, ctx(ana, '2026-09-21T09:00:00Z'));
reg = r.registro;
eq(r.evento.pais, [reg[0].id], 'reabertura aponta para a finalização');
ok(r.evento.autor.email === 'ana@x.com', 'e-mail do autor normalizado');
ok(E.verificar(reg).ok, 'registro íntegro');
ok(E.estado(reg).estudos[kEst].finalizado === false && E.estado(reg).estudos[kEst].reaberturas === 1, 'estado derivado');

/* adulteração */
const adult = JSON.parse(JSON.stringify(reg)); adult[1].motivo = 'outro motivo';
ok(!E.verificar(adult).ok && /alterado/.test(E.verificar(adult).problemas[0].problema), 'mudar o motivo acusa');
ok(!E.verificar([reg[1]]).ok, 'pai ausente acusa');

/* dois aparelhos offline corrigem a mesma nota */
const corr = (autor, em, de, para, disp) => E.anexar(reg, 'observacao.corrigida',
  { entidade: { tipo: 'observacao', id: o1.id }, motivo: 'transcrição', de, para }, ctx(autor, em, { dispositivo: disp }));
const ra = corr(ana, '2026-09-21T10:00:00Z', 10, 12, 'tablet-1');
const rb = corr(dir, '2026-09-21T10:05:00Z', 10, 13, 'celular-2');
const m1 = E.merge(ra.registro, rb.registro), m2 = E.merge(rb.registro, ra.registro);
eq(m1.map(e => e.id), m2.map(e => e.id), 'merge comutativo e ordem determinística');
eq(E.merge(m1, m1).map(e => e.id), m1.map(e => e.id), 'merge idempotente');
ok(E.pontas(m1).length === 2, 'concorrência deixa duas pontas');
const ap = E.aplicar(obs, m1).find(o => o.id === o1.id);
ok(ap.valor === 12 && ap.historico.length === 1 && ap.conflitos.length === 1 && ap.conflitos[0].para === 13,
   'segunda correção vira conflito visível, não sobrescrita');
ok(obs.find(o => o.id === o1.id).valor === 10, 'aplicar não altera a entrada');
const seguinte = E.anexar(m1, 'observacao.corrigida', { entidade: { tipo: 'observacao', id: o1.id }, motivo: 'resolve conflito', de: 12, para: 13 }, ctx(ana, '2026-09-22T08:00:00Z'));
eq(seguinte.evento.pais, E.pontas(m1), 'evento seguinte une as duas pontas');
ok(E.verificar(seguinte.registro).ok, 'grafo unido continua íntegro');

/* invalidação e exclusão lógica */
let r2 = E.anexar(reg, 'avaliacao.invalidada', { entidade: { tipo: 'avaliacao', id: 'A2', estudo: kEst }, motivo: 'avaliador sem treinamento', rubrica: 1 }, ctx(ana, '2026-09-22T09:00:00Z')).registro;
ok(E.aplicar(obs, r2).filter(o => o.situacao === 'invalidada').length === 2, 'avaliação invalidada marca suas observações');
ok(O.resumir(E.aplicar(obs, r2)).every(x => x.avaliacao.id !== 'A2'), 'invalidada sai do resumo');
r2 = E.anexar(r2, 'avaliacao.revalidada', { entidade: { tipo: 'avaliacao', id: 'A2', estudo: kEst }, motivo: 'treinamento comprovado', rubrica: 1 }, ctx(ana, '2026-09-22T10:00:00Z')).registro;
ok(E.aplicar(obs, r2).every(o => o.situacao === 'valida'), 'revalidação desfaz com outro evento');
const r3 = E.anexar(reg, 'registro.excluido', { entidade: { tipo: 'estudo', id: kEst }, motivo: 'estudo duplicado' }, ctx(ana, '2026-09-22T09:00:00Z')).registro;
ok(E.aplicar(obs, r3).every(o => o.situacao === 'excluida'), 'exclusão lógica do estudo');
ok(r3.length === 3, 'nada foi removido do registro');

/* relógio atrasado: aviso, não adulteração */
const atrasado = E.anexar(reg, 'avaliacao.invalidada', { entidade: { tipo: 'avaliacao', id: 'A1', estudo: kEst }, motivo: 'm', rubrica: 1 }, ctx(ana, '2026-09-19T00:00:00Z')).registro;
const va = E.verificar(atrasado);
ok(va.ok && va.avisos.length === 1, 'instante anterior ao pai é aviso');

/* trilha legada */
const audit = [
  { ts: Date.parse('2026-09-21T09:00:00Z'), user: 'Ana', por: 'ana@x.com', action: 'Reabertura do Estudo', details: 'Reaberto para edição. Motivo: "nota errada". A finalização de — foi arquivada.' },
  { ts: Date.parse('2026-09-20T10:00:00Z'), iso: '2026-09-20T10:00:00.000Z', user: 'Dir', por: 'dir@x.com', action: 'Finalização do Estudo', details: 'Estudo finalizado', rubrica: 1 },
  { ts: Date.parse('2026-09-10T10:00:00Z'), user: 'Zé', action: 'Avaliação editada', details: 'x', mudancas: [{ parcela: 'T1R1', variavel: 'N', de: '1', para: '2' }] },
  { user: 'sem data', action: 'x' }
];
const leg = E.deTrilhaLegada(audit, { estudo: kEst, organizacao: 'org-1' });
eq(leg.map(e => e.tipo), ['legado.registro', 'estudo.finalizado', 'estudo.reaberto'], 'trilha antiga em ordem, tipos mapeados, sem data fica de fora');
ok(leg.every(e => e.legado === true) && E.verificar(leg).ok, 'legado marcado e íntegro');
ok(leg[2].motivo === 'nota errada', 'motivo recuperado do texto da reabertura');
ok(leg[0].detalhe.mudancas[0].para === '2', 'de→para antigo preservado no detalhe');
eq(E.deTrilhaLegada(audit, { estudo: kEst, organizacao: 'org-1' }).map(e => e.id), leg.map(e => e.id), 'importação determinística (mesmos ids)');

console.log('Observação canônica e eventos formais: ' + n + ' verificações OK.');
