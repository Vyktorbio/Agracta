/* Contratos de apresentação: exemplos documentados e dados ausentes. */
'use strict';
const assert=require('node:assert/strict'),C=require('../vendor/agroapi-core.js');
const p=C.bio({marca_comercial:['Produto A','Produto B'],numero_registro:'7815',ingrediente_ativo:['Bacillus velezensis'],
 indicacao_uso:[{cultura:'Todas as culturas',praga_nome_cientifico:'Helicoverpa armigera',praga_nome_comum:['Lagarta-do-algodão']}],
 documento_cadastrado:[{url:'javascript:alert(1)'},{url:'https://agrofit.agricultura.gov.br/bula.pdf',descricao:'Bula'}]},'produtos-biologicos');
assert.equal(p.register,'7815');assert.equal(p.name,'Produto A; Produto B');
assert.equal(p.indications[0].culture,'Todas as culturas');assert.match(p.indications[0].target,/Helicoverpa/);
assert.equal(p.documents.length,1);assert.equal(C.safeUrl('https://user:pass@example.com/a'),'');
const i=C.bio({registro_produto:'BA0004685-3',especie:['TRICHODERMA ASPERELLUM'],garantia:'200000000 UFC/G',cultura:'Soja'},'inoculantes');
assert.equal(i.register,'BA0004685-3');assert.equal(i.guarantee,'200000000 UFC/G');
assert.equal(i.name,'TRICHODERMA ASPERELLUM');assert.equal(i.indications[0].culture,'Soja');
assert.equal(C.value(0),'0');assert.equal(C.value(null),'—');
assert.equal(C.period({diaIni:21,mesIni:12,diaFim:10,mesFim:1}),'21/12 a 10/01');
assert.equal(C.period({diaIni:null,mesIni:0,diaFim:35,mesFim:2}),'— a —');
const rows=[{solo:'AD1',ciclo:'GRUPO I',risco:20},{solo:'AD1',ciclo:'GRUPO II',risco:30},{solo:'AD2',ciclo:'GRUPO I',risco:40}];
assert.deepEqual(C.zarc(rows,{solo:'AD1',ciclo:'GRUPO II'}),[rows[1]]);
assert.equal(rows.length,3,'a consulta não altera dados da fonte');
assert.deepEqual(C.dates(['2026-10-04','2026-10-06T00:00:00Z','2026-10-06','inválida']),['2026-10-06','2026-10-04']);
const serie=C.serie([{data:'2026-10-06T12:00:00Z',valor:0},{data:'2026-10-06T18:00:00Z',valor:null}]);
assert.equal(serie.rows[0].valor,0);assert.equal(serie.rows[1].valor,null);
assert.deepEqual(serie.columns,['data','valor']);
assert.equal(C.serie({metadata:'sem série'}),null,'não inventa série para um envelope desconhecido');
assert.equal(C.variables.length,17);
console.log('ok · Bioinsumos, ZARC, datas, ausência de dados e unidades preservados');
