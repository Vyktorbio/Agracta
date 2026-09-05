/* O índice entre ensaios — vendor/historico-core.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Este motor responde "você já usou este ativo?". A resposta errada aqui é
 * pior que resposta nenhuma: se ele disser que você já usou tebuconazol em
 * soja e você nunca usou, a próxima coisa que a pessoa faz é parar de
 * acreditar em tudo que o app afirma. Então o teste cobre, com o mesmo peso:
 *   - o que ele TEM de encontrar (tebuconazol = tebuconazole);
 *   - o que ele NÃO PODE encontrar (nome parecido, ensaio dele mesmo);
 *   - o que ele tem de ADMITIR que não sabe (`resolvido:false`);
 *   - e o silêncio, quando não há histórico.
 *
 * Rodar: node test_historico_ativo.js
 */
var H  = require('./vendor/historico-core.js');
var EN = require('./vendor/ativos-en-core.js');
var DC = require('./vendor/dose-core.js');
var deps = { AtivosEN: EN, DoseCore: DC };

var f = 0, p = 0;
function ck(ok, n) { if (ok) { p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n) { ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

function ensaio(sid, cultura, alvo, data, trats, extra) {
  var e = { qid:'q1', sid:sid, codigo:sid.toUpperCase(), cultura:cultura, alvo:alvo,
            tipoEstudo:'eficácia', dataInicio:data, finalizado:false, tratamentos:trats };
  if (extra) Object.keys(extra).forEach(function (k) { e[k] = extra[k]; });
  return e;
}
function t(id, produto, ia, dose, extra) {
  var o = { id:id, produto:produto, ia:ia, dose:dose, testemunha:false };
  if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
  return o;
}

/* O acervo de ensaio deste teste. */
var ACERVO = [
  ensaio('s1', 'Soja',  'Ferrugem asiática', '2024-01-10', [
    t('T1', '', '', '', { testemunha:true }),
    t('T2', 'Folicur', 'Tebuconazol', '0,5 L/ha'),
    t('T3', 'Folicur', 'Tebuconazol', '0,75 L/ha')
  ]),
  ensaio('s2', 'Milho', 'Cercospora',        '2024-06-02', [
    t('T1', 'Folicur', 'tebuconazole', '0,5 L/ha')          /* mesmo ativo, grafia ISO */
  ]),
  ensaio('s3', 'Soja',  'Ferrugem asiática', '2025-02-20', [
    t('T1', 'Priori Xtra', 'Azoxistrobina (200 g/L) + Ciproconazol (80 g/L)', '0,3 L/ha')
  ]),
  ensaio('s4', 'Soja',  'Percevejo',         '',           [   /* sem data */
    t('T1', 'Engeo Pleno', 'Tiametoxam', '150 mL/ha')
  ])
];
var IDX = H.indexar(ACERVO, deps);

console.log('\n--- O índice enxerga o acervo inteiro ---');
eq(IDX.ensaios, 4, 'quatro ensaios indexados');
ck(IDX.usos >= 6, 'os usos de ativo somam pelo menos seis (a mistura conta dois)');

console.log('\n--- Tebuconazol e tebuconazole são o MESMO ativo ---');
var r = H.consultar(IDX, 'Tebuconazol', {}, deps);
ck(!!r, 'tebuconazol tem histórico');
eq(r.usos, 3, 'três tratamentos usaram tebuconazol');
eq(r.ensaios.length, 2, 'em dois ensaios distintos');
ck(r.resolvido, 'o nome resolveu para a tabela ISO — a busca foi completa');
var r2 = H.consultar(IDX, 'tebuconazole', {}, deps);
eq(r2.usos, r.usos, 'perguntar em inglês dá exatamente a mesma resposta');
eq(r2.chave, r.chave, 'e cai na mesma chave');
var r3 = H.consultar(IDX, '  TEBUCONAZOL  ', {}, deps);
eq(r3.usos, r.usos, 'caixa e espaço sobrando não mudam a resposta');

console.log('\n--- O que ele conta e o que ele lista ---');
eq(r.culturas.length, 2, 'duas culturas');
/* Soja e Milho empatam em um ensaio cada, e o desempate é alfabético: a ordem
   não pode depender de qual apareceu primeiro no acervo. */
eq(r.culturas[0].nome, 'Milho', 'empate em um ensaio cada, desempatado em ordem alfabética');
eq(r.culturas[0].n, 1, 'um ensaio em milho');
eq(r.culturas[1].nome, 'Soja', 'e soja em seguida');
eq(r.alvos.length, 2, 'dois alvos: ferrugem e cercospora');
eq(r.doses.length, 2, 'duas doses distintas usadas');
eq(r.doses[0].texto, '0,5 L/ha', '0,5 L/ha é a mais repetida');
eq(r.doses[0].n, 2, 'usada duas vezes');
eq(r.naCultura, null, 'sem cultura na pergunta, não há contagem por cultura');
eq(H.consultar(IDX, 'Tebuconazol', { cultura:'Soja' }, deps).naCultura, 1, 'com cultura, diz quantos foram nela');
eq(H.consultar(IDX, 'Tebuconazol', { cultura:'Algodão' }, deps).naCultura, 0,
   'e diz zero quando nunca foi usado nesta cultura — o que também é resposta');

console.log('\n--- Mais recente primeiro; sem data, por último ---');
eq(r.ensaios[0].sid, 's2', 'o ensaio de junho vem antes do de janeiro');
var rt = H.consultar(IDX, 'Tiametoxam', {}, deps);
eq(rt.ensaios[0].sid, 's4', 'ensaio sem data ainda aparece');
eq(rt.ensaios[0].dataInicio, '', 'e não ganha uma data inventada');

console.log('\n--- Mistura: cada ativo entra por si ---');
var az = H.consultar(IDX, 'Azoxistrobina', {}, deps);
var ci = H.consultar(IDX, 'Ciproconazol', {}, deps);
ck(!!az, 'azoxistrobina é encontrada dentro da mistura');
ck(!!ci, 'ciproconazol também');
eq(az.ensaios[0].sid, 's3', 'e apontam para o ensaio certo');
eq(az.doses[0].texto, '0,3 L/ha', 'a dose registrada é a do tratamento, não a do ativo isolado');

console.log('\n--- O que ele NÃO pode encontrar ---');
ck(!H.consultar(IDX, 'Protioconazol', {}, deps),
   'protioconazol nunca foi usado: null, não um "parecido com tebuconazol"');
ck(!H.consultar(IDX, 'Tebu', {}, deps),
   'um pedaço do nome não casa — abreviação não é o ativo');
ck(!H.consultar(IDX, 'Glifosato', {}, deps), 'ativo ausente do acervo devolve null');
ck(!H.consultar(IDX, '', {}, deps), 'pergunta vazia devolve null');
ck(!H.consultar(IDX, null, {}, deps), 'pergunta nula devolve null');
ck(!H.consultar(null, 'Tebuconazol', {}, deps), 'índice ausente devolve null, não estoura');

console.log('\n--- O ensaio não é histórico de si mesmo ---');
var so = H.consultar(IDX, 'Tebuconazol', { excluirSid:'s1' }, deps);
eq(so.ensaios.length, 1, 'excluindo o s1, sobra um ensaio');
eq(so.usos, 1, 'e um uso');
eq(so.ensaios[0].sid, 's2', 'o que sobrou é o outro');
ck(!H.consultar(IDX, 'Tiametoxam', { excluirSid:'s4' }, deps),
   'ativo usado só no ensaio atual não tem histórico nenhum: silêncio');
ck(!H.consultar(H.indexar([ACERVO[0]], deps), 'Tebuconazol', { excluirSid:'s1' }, deps),
   'acervo de um ensaio só, excluindo ele mesmo, é silêncio');

console.log('\n--- O que ele admite não saber ---');
/* Um nome comercial não está na tabela ISO. Ele ainda casa consigo mesmo,
   literalmente — mas o resultado tem de dizer que a busca não foi por ativo. */
var IDXP = H.indexar([
  ensaio('p1', 'Soja', 'Mofo branco', '2024-03-01', [ t('T1', 'BioX 500', '', '2 L/ha') ]),
  ensaio('p2', 'Soja', 'Mofo branco', '2024-09-01', [ t('T1', 'BioX 500', '', '2 L/ha') ])
], deps);
var bp = H.consultar(IDXP, 'BioX 500', {}, deps);
ck(!!bp, 'produto sem ativo declarado ainda casa consigo mesmo');
eq(bp.ensaios.length, 2, 'nos dois ensaios em que apareceu');
eq(bp.resolvido, false, 'mas diz que não resolveu para um ativo conhecido');
ck(!H.consultar(IDXP, 'BioX', {}, deps), 'e não estende o casamento para nomes parecidos');
var tb = H.consultar(IDX, 'Tebuconazol', {}, deps);
eq(tb.resolvido, true, 'já um ativo da tabela ISO diz que resolveu');

console.log('\n--- Testemunha não é uso de produto ---');
var IDXT = H.indexar([
  ensaio('x1', 'Soja', 'Ferrugem', '2024-01-01', [
    t('T1', 'Água', 'Água', '', { testemunha:true }),
    t('T2', 'Folicur', 'Tebuconazol', '0,5 L/ha')
  ])
], deps);
ck(!H.consultar(IDXT, 'Água', {}, deps), 'a testemunha não entra no índice');
eq(H.consultar(IDXT, 'Tebuconazol', {}, deps).usos, 1, 'o tratamento de verdade entra');

console.log('\n--- Dose: agrupa vírgula com ponto, mostra o que foi escrito ---');
var IDXD = H.indexar([
  ensaio('d1', 'Soja', 'Ferrugem', '2024-01-01', [ t('T1', 'F', 'Tebuconazol', '0,5 L/ha') ]),
  ensaio('d2', 'Soja', 'Ferrugem', '2024-02-01', [ t('T1', 'F', 'Tebuconazol', '0.5 L/ha') ]),
  ensaio('d3', 'Soja', 'Ferrugem', '2024-03-01', [ t('T1', 'F', 'Tebuconazol', '0,5  L/ha') ])
], deps);
var rd = H.consultar(IDXD, 'Tebuconazol', {}, deps);
eq(rd.doses.length, 1, 'as três grafias são a mesma dose');
eq(rd.doses[0].n, 3, 'contadas as três');
eq(rd.doses[0].texto, '0,5 L/ha', 'e exibida como a primeira foi escrita, sem reescrever ninguém');

console.log('\n--- Sem tratamento com dose, a lista de doses fica vazia (não zero) ---');
var IDXS = H.indexar([ ensaio('n1', 'Soja', 'Ferrugem', '2024-01-01', [ t('T1', 'F', 'Tebuconazol', '') ]) ], deps);
var rs = H.consultar(IDXS, 'Tebuconazol', {}, deps);
eq(rs.doses.length, 0, 'nenhuma dose escrita, nenhuma dose listada');
eq(rs.usos, 1, 'mas o uso continua contado');

console.log('\n--- O motor funciona sem as dependências, e diz que está sem elas ---');
var IDXN = H.indexar(ACERVO, {});
var rn = H.consultar(IDXN, 'Tebuconazol', {}, {});
ck(!!rn, 'sem a tabela ISO ainda encontra pelo texto');
eq(rn.usos, 2, 'só que tebuconazole (grafia ISO) vira outro ativo: dois usos, não três');
eq(rn.resolvido, false, 'e admite que não resolveu');

console.log('\n--- A frase da tela ---');
var frase = H.resumo(r);
ck(/2 ensaios seus/.test(frase), 'a frase conta os ensaios');
ck(/Soja/.test(frase) && /Milho/.test(frase), 'e nomeia as culturas');
ck(/0,5 L\/ha/.test(frase), 'e traz as doses já usadas');
ck(!/eficácia|controle|melhor|recomend/i.test(frase),
   'e NÃO conclui nada sobre resultado — regra 1');
eq(H.resumo(null), '', 'sem histórico, a frase é vazia e a tela não escreve nada');
eq(H.resumo({ usos:0 }), '', 'zero usos também não vira frase');
var frase1 = H.resumo(H.consultar(IDX, 'Tiametoxam', {}, deps));
ck(/1 ensaio seu/.test(frase1) && !/1 ensaios/.test(frase1), 'um ensaio no singular');

console.log('\n--- Entradas estragadas não derrubam o índice ---');
[null, undefined, [], [null], [{}], [{ sid:'z', tratamentos:null }],
 [{ sid:'z', tratamentos:[null, {}] }]].forEach(function (mau, i) {
  try { H.indexar(mau, deps); ck(true, 'acervo malformado #' + (i + 1) + ' não derruba o índice'); }
  catch (e) { ck(false, 'acervo malformado #' + (i + 1) + ' derrubou: ' + e.message); }
});

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
