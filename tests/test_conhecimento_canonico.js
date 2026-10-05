'use strict';
/* Aba "Entre estudos": lê pela forma canônica, aplica eventos formais, agrupa o
   que é comparável, não combina médias, respeita o cegamento e não grava nada. */
const assert = require('node:assert/strict'), fs = require('fs');
let JSDOM; try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://agracta.test', runScripts: 'outside-only' }), w = dom.window;
['vendor/dose-core.js', 'vendor/ativos-en-core.js', 'vendor/conhecimento-core.js', 'vendor/avaliacao-core.js',
 'vendor/observacao-core.js', 'vendor/eventos-core.js', 'vendor/eppo-core.js', 'integracoes.js', 'conhecimento-canonico.js']
  .forEach(p => w.eval(fs.readFileSync(p, 'utf8')));
const src = fs.readFileSync('app.js', 'utf8');
['_avNota', '_pctCtrl'].forEach(f => { const m = src.match(new RegExp('function ' + f + '\\([^]*?\\n}')); assert(m); w.eval(m[0]); });
w.QLOCAL = { Q1: 'l', Q2: 'l2' }; w.LOCAIS = { l: { nome: 'Local X' }, l2: { nome: 'Local Y' } };
w.ITENS = { i: { id: 'i', nome: 'Segredo comercial', codigoCego: 'Cego 01', ativos: 'tebuconazol (200 g/L)',
  vinculosHistoricos: [{ qid: 'Q1', estudoId: 'S1', tratamentoId: 'T2', componenteId: '' }] } };
w.isAdmin = () => false; w.quadraNome = id => id; w.save = () => { throw Error('Leitura não pode salvar'); };
const estudo = (id, cod, notas, extra) => Object.assign({ id, codigo: cod, numRepeticoes: 2, cultura: 'Soja', alvo: 'Percevejo-marrom', alvoSci: 'Euschistus heros',
  finalizacao: { em: '2026-09-01T00:00:00Z' }, aplicacoes: [{ data: '2026-08-01' }],
  tratamentos: [{ id: 'T1', produto: 'Testemunha', testemunha: true }, { id: 'T2', produto: 'Segredo comercial', ingredienteAtivo: 'tebuconazol', dose: '1 L/ha' }],
  avaliacoes: [{ id: 'A1', data: '2026-08-08', momento: { unidade: 'DAT', valor: 7 }, variaveis: ['Ninfas'], tipos: { Ninfas: 'contagem' },
    varcfg: { Ninfas: { unidade: 'ninfas/m' } }, notas }] }, extra || {});
/* S2/S3 usam nome livre sem item cego; só o S1 está vinculado ao item cegado. */
const semSegredo = st => { st.tratamentos[1].produto = 'Produto B'; st.tratamentos[1].ingredienteAtivo = 'ativo b'; return st; };
w.data = {
  Q1: { cultura: 'Soja', estudos: [estudo('S1', 'AGR-1', { T1R1: { Ninfas: 10 }, T1R2: { Ninfas: 12 }, T2R1: { Ninfas: 2 }, T2R2: { Ninfas: 4 } })] },
  Q2: { cultura: 'Soja', estudos: [
    semSegredo(estudo('S2', 'AGR-2', { T1R1: { Ninfas: 8 }, T1R2: { Ninfas: 9 }, T2R1: { Ninfas: 1 }, T2R2: { Ninfas: 3 } })),
    semSegredo(estudo('S3', 'AGR-3', { T1R1: { Ninfas: 50 }, T1R2: { Ninfas: 60 } }, { finalizacao: null }))
  ] }
};
const antes = JSON.stringify(w.data);
const acervo = w.agConhecimento.construir();
const CC = w.agConhecimentoCanonico;

/* núcleo */
let c = CC.comparacoes(acervo, w.data, {}, {});
ok(c.grupos.length === 1 && c.grupos[0].nEstudos === 2 && c.estudos === 2, 'finalizados por padrão: um grupo, dois estudos');
const linhas = c.grupos[0].linhas;
ok(linhas.length === 4 && linhas.every(l => l.n === 2 && l.variancia !== null), 'n e variância por estudo × tratamento');
ok(linhas.find(l => l.codigo === 'AGR-1' && l.tratamento.id === 'T1').media === 11, 'média do estudo, não combinada');
ok(!JSON.stringify(c).includes('Segredo comercial') && !JSON.stringify(c).includes('tebuconazol'), 'cegamento: nem nome cru nem ativo');
ok(linhas.find(l => l.codigo === 'AGR-1' && l.tratamento.id === 'T2').tratamento.produto === 'Cego 01', 'nome cegado da projeção');
ok(!JSON.stringify(c).includes('ativo b'), 'ingrediente ativo nunca sai, nem de nome livre');
ok(c.grupos[0].faltas.includes('alvo sem código EPPO'), 'sem tabela EPPO: diz o que falta');
ok(CC.comparacoes(acervo, w.data, {}, { andamento: true }).grupos[0].nEstudos === 3, 'em execução entram quando pedido');
ok(CC.primeiraAplicacao({ aplicacoes: [{ data: '10/08/2026' }, { data: '2026-08-01' }] }) === '2026-08-01', 'DAA pela primeira aplicação');

/* EPPO resolvido: sem faltas */
const eppo = w.EppoCore.criar({ culturas: { Soja: 'Glycine max' }, codigos: { 'Glycine max': { eppo: 'GLXMA' }, 'Euschistus heros': { eppo: 'EUSCHE' } } });
c = CC.comparacoes(acervo, w.data, {}, { eppo });
ok(c.grupos[0].faltas.length === 0 && c.grupos[0].alvo.eppo === 'EUSCHE', 'com EPPO e momento: comparáveis formalmente');

/* eventos formais: avaliação invalidada sai; correção entra */
const E = w.EventosCore, O = w.ObservacaoCore, k1 = O.chaveEstudo('Q1', 'S1');
const ctx = { autor: { email: 'a@x.com', nome: 'Ana' }, em: '2026-09-20T00:00:00Z' };
let reg = E.anexar([], 'observacao.corrigida', { entidade: { tipo: 'observacao', id: O.idObservacao({ qid: 'Q1', sid: 'S1', avaliacao: 'A1', parcela: 'T1R1', variavel: 'Ninfas' }) },
  motivo: 'transcrição', de: 10, para: 14 }, ctx).registro;
c = CC.comparacoes(acervo, w.data, { [k1]: reg }, {});
ok(c.grupos[0].linhas.find(l => l.codigo === 'AGR-1' && l.tratamento.id === 'T1').media === 13, 'correção formal aplicada');
reg = E.anexar(reg, 'avaliacao.invalidada', { entidade: { tipo: 'avaliacao', id: 'A1', estudo: k1 }, motivo: 'm', rubrica: 1 }, ctx).registro;
c = CC.comparacoes(acervo, w.data, { [k1]: reg }, {});
ok(c.grupos.length === 0 && c.fora === 4, 'avaliação invalidada sai, e a conta diz quantas ficaram de fora');

/* tela */
w.abrirConhecimento();
const aba = w.document.querySelector('[data-aba="entre"]');
ok(aba && aba.textContent === 'Entre estudos', 'aba registrada no Conhecimento');
aba.click();
(async () => {
  await new Promise(r => setTimeout(r, 30));
  let html = w.document.querySelector('#conhecimentoOvl main').innerHTML;
  ok(html.includes('Ninfas') && html.includes('AGR-1') && html.includes('AGR-2') && !html.includes('AGR-3'), 'aba mostra os finalizados');
  ok(!html.includes('Segredo comercial') && !html.includes('tebuconazol') && html.includes('Cego 01'), 'cegamento na tela');
  ok(html.includes('não são combinados') && html.includes('Para uma meta-análise ainda falta'), 'avisos honestos');
  w.document.querySelector('[data-con="entreAndamento"]').click();
  await new Promise(r => setTimeout(r, 30));
  html = w.document.querySelector('#conhecimentoOvl main').innerHTML;
  ok(html.includes('AGR-3') && html.includes('em execução'), 'alternar inclui em execução');
  w.document.querySelector('[data-aba="produtos"]').click();
  await new Promise(r => setTimeout(r, 30));
  ok(w.document.querySelector('#conhecimentoOvl main').innerHTML.includes('Buscar produto'), 'abas antigas intactas');
  ok(JSON.stringify(w.data) === antes, 'nada gravado');
  dom.window.close();
  console.log('Conhecimento entre estudos: ' + n + ' verificações OK.');
})().catch(e => { console.error('FALHA', e); process.exit(1); });
