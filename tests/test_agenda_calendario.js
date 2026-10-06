/* O CALENDÁRIO DA AGENDA E O RESUMO DO DIA — vendor/agenda-core.js
 *
 * Pedido de uso: "seria legal a agenda mostrar um calendário e um pin, uma
 * bolinha nos dias, parece mais fácil de ver". E, no mesmo recado, um painel
 * HOJE que diga "o que tem pra hoje de verdade".
 *
 * O QUE ESTE TESTE PROTEGE
 *
 *  1. A CONTA DE DATA NÃO ESCORREGA. Data é texto 'AAAA-MM-DD' e a soma é feita
 *     em UTC: virada de mês, de ano, 29 de fevereiro e o dia da troca de
 *     horário dão o dia certo, em qualquer fuso do aparelho.
 *  2. A GRADE É A DA FOLHINHA: semana de domingo a sábado, só as semanas que o
 *     mês precisa, dias do mês vizinho marcados como de fora.
 *  3. A BOLINHA DIZ O QUE É, NÃO QUANTOS — e atrasado vence a cor do tipo.
 *  4. FEITO APARECE, MAS NÃO CONTA como trabalho a fazer.
 *  5. O RESUMO DO HOJE usa a mesma régua do calendário: o número do painel e a
 *     bolinha do dia não podem discordar.
 *
 * Rodar: node tests/test_agenda_calendario.js
 */
'use strict';
const assert=require('node:assert/strict');
const A=require('../vendor/agenda-core.js');

let n=0;
function eq(a,b,m){ assert.deepEqual(a,b,m); n++; }
function ok(c,m){ assert.ok(c,m); n++; }

/* ------------------------------------------------ 1. a conta de data ----- */
ok(A.valida('2026-10-04'),'data comum vale');
ok(!A.valida('2026-02-30'),'30 de fevereiro não existe — não vira 2 de março');
ok(!A.valida('2026-13-01') && !A.valida('04/10/2026') && !A.valida('') && !A.valida(null),
  'mês 13, data brasileira, vazio e nulo não são data ISO');
ok(A.valida('2028-02-29') && !A.valida('2026-02-29'),'29 de fevereiro só em ano bissexto');

eq(A.somaDias('2026-10-31',1),'2026-11-01','virada de mês');
eq(A.somaDias('2026-12-31',1),'2027-01-01','virada de ano');
eq(A.somaDias('2028-02-28',1),'2028-02-29','bissexto tem 29');
eq(A.somaDias('2026-03-01',-1),'2026-02-28','e voltar um dia de março cai em 28 de fevereiro');
eq(A.somaDias('2026-02-30',1),null,'data que não existe não vira outra');
eq(A.diasEntre('2026-10-04','2026-10-08'),4,'b − a, em dias');
eq(A.diasEntre('2026-10-08','2026-10-04'),-4,'e negativo para trás');
eq(A.diasEntre('2026-01-01','2027-01-01'),365,'um ano comum');

/* O dia da troca de horário era onde a conta em Date local pulava ou repetia
   um dia. Em 4/11/2018 São Paulo adiantou o relógio à meia-noite: aquele dia
   teve 23 horas. Aqui a conta não tem hora, então não tem como escorregar —
   e o teste roda também com o processo no fuso de São Paulo para provar. */
const tzAntes=process.env.TZ;
process.env.TZ='America/Sao_Paulo';
eq(A.somaDias('2018-11-03',1),'2018-11-04','véspera da troca de horário → o dia da troca');
eq(A.somaDias('2018-11-04',1),'2018-11-05','e do dia da troca para o seguinte');
eq(A.diasEntre('2018-11-03','2018-11-05'),2,'dois dias são dois dias, com 23 horas no meio');
eq(A.diaDaSemana('2018-11-04'),0,'4/11/2018 foi um domingo');
if(tzAntes===undefined) delete process.env.TZ; else process.env.TZ=tzAntes;

eq(A.diaDaSemana('2026-10-04'),0,'4/10/2026 é domingo');
eq(A.diaDaSemana('2026-10-01'),4,'1/10/2026 é quinta');
eq(A.diasNoMes(2026,2),28,'fevereiro de 2026 tem 28');
eq(A.diasNoMes(2028,2),29,'fevereiro de 2028 tem 29');
eq(A.mesVizinho(2026,1,-1),{ano:2025,mes:12},'janeiro menos um é dezembro do ano anterior');
eq(A.mesVizinho(2026,12,1),{ano:2027,mes:1},'dezembro mais um é janeiro do ano seguinte');
eq(A.mesVizinho(2026,10,-14),{ano:2025,mes:8},'e anda vários meses de uma vez');
eq(A.rotuloMes(2026,10),'outubro de 2026','rótulo do mês');
eq(A.rotuloDia('2026-10-04'),'domingo, 4 de outubro','rótulo do dia, sem depender do Intl do aparelho');
eq(A.rotuloDia('2026-10-05'),'segunda-feira, 5 de outubro','segunda');
eq(A.rotuloDia('xx'),'','data inválida não vira rótulo');

/* -------------------------------------------- 2. a grade da folhinha ----- */
const out=A.grade(2026,10,'2026-10-04');
eq(out.rotulo,'outubro de 2026','a grade diz o mês');
eq(out.semanas.length,5,'outubro de 2026 (quinta a sábado) ocupa cinco semanas');
ok(out.semanas.every(s=>s.length===7),'toda semana tem sete dias');
eq(out.semanas[0].map(c=>c.iso),
  ['2026-09-27','2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03'],
  'a primeira semana começa no DOMINGO, com os dias de setembro completando');
eq(out.semanas[0].map(c=>c.doMes),[false,false,false,false,true,true,true],'e os dias de setembro vêm marcados como de fora');
eq(out.semanas[4][6].iso,'2026-10-31','31 de outubro, um sábado, fecha a grade sem semana sobrando');
const cel=[].concat.apply([],out.semanas);
eq(cel.filter(c=>c.hoje).map(c=>c.iso),['2026-10-04'],'só hoje é hoje');
ok(cel.find(c=>c.iso==='2026-10-03').passado && !cel.find(c=>c.iso==='2026-10-04').passado &&
   !cel.find(c=>c.iso==='2026-10-05').passado,'passado é antes de hoje, e hoje não é passado');
eq(A.grade(2026,2,'2026-10-04').semanas.length,4,'fevereiro de 2026 começa no domingo: cabe em quatro semanas');
eq(A.grade(2026,8,'2026-10-04').semanas.length,6,'agosto de 2026 começa no sábado: pede seis');
eq(A.grade(2026,12,null).semanas[4][6].iso,'2027-01-02','a última semana de dezembro entra em janeiro');
const semHoje=[].concat.apply([],A.grade(2026,10,'lixo').semanas);
eq(semHoje.length,35,'sem hoje válido a grade continua de pé');
eq(semHoje.filter(c=>c.hoje||c.passado).length,0,'e não marca nada como hoje nem como passado');

/* -------------------------------------- 3. estado e bolinhas do dia ----- */
const H='2026-10-04';
eq(A.estado({iso:'2026-10-01',tipo:'apl'},H),'atrasado','pendente com data passada é atrasado');
eq(A.estado({iso:H,tipo:'av'},H),'hoje','pendente de hoje é hoje');
eq(A.estado({iso:'2026-10-08',tipo:'av'},H),'futuro','pendente de depois é futuro');
eq(A.estado({iso:'2026-10-01',tipo:'apl',feito:true},H),'feito','feito é feito, mesmo no passado');
eq(A.estado({iso:'2026-02-30',tipo:'apl'},H),null,'item sem data válida não tem estado');

eq(A.pontos([{iso:'2026-10-08',tipo:'av'},{iso:'2026-10-08',tipo:'av'},{iso:'2026-10-08',tipo:'av'}],H),['av'],
  'três avaliações no mesmo dia: UMA bolinha de avaliação');
eq(A.pontos([{iso:'2026-10-08',tipo:'av'},{iso:'2026-10-08',tipo:'apl'}],H),['apl','av'],
  'aplicação e avaliação: duas bolinhas, aplicação primeiro');
eq(A.pontos([{iso:'2026-10-01',tipo:'apl'},{iso:'2026-10-01',tipo:'av'}],H),['atrasado'],
  'no passado, o pendente vira UMA bolinha de atrasado — a cor do tipo cede');
eq(A.pontos([{iso:'2026-10-01',tipo:'apl'},{iso:'2026-10-01',tipo:'av',feito:true}],H),['atrasado','feito'],
  'atrasado e feito no mesmo dia: o atrasado vem antes');
eq(A.pontos([{iso:'2026-10-08',tipo:'nota'}],H),[],'tipo que o calendário não conhece não inventa bolinha');

/* ---------------------------------------------------- 4. por dia ----- */
const itens=[
  {iso:'2026-10-01',tipo:'apl',id:'apl-1-feita',feito:true},
  {iso:'2026-10-02',tipo:'av',id:'av-esquecida'},
  {iso:H,tipo:'av',id:'av-hoje'},
  {iso:H,tipo:'apl',id:'apl-hoje'},
  {iso:H,tipo:'apl',id:'apl-registrada-hoje',feito:true},
  {iso:'2026-10-05',tipo:'apl',id:'apl-amanha'},
  {iso:'2026-10-08',tipo:'av',id:'av-quinta'},
  {iso:'2026-10-11',tipo:'av',id:'av-domingo-que-vem'},
  {iso:'2026-10-12',tipo:'av',id:'av-fora-da-semana'},
  {iso:'2026-09-20',tipo:'apl',id:'apl-de-setembro'},
  {iso:'2026-02-30',tipo:'apl',id:'sem-data'}
];
const dias=A.porDia(itens,H);
eq(dias[H].itens.map(i=>i.id),['apl-hoje','av-hoje','apl-registrada-hoje'],
  'dentro do dia: pendente antes de feito, aplicação antes de avaliação');
eq([dias[H].pendentes,dias[H].atrasados,dias[H].feitos],[2,0,1],'e o dia conta o que tem');
eq(dias[H].pontos,['apl','av','feito'],'com as bolinhas do dia');
eq(dias['2026-10-02'].pontos,['atrasado'],'a avaliação esquecida do dia 2 é bolinha de atrasado');
ok(!Object.keys(dias).some(k=>!A.valida(k)),'item sem data não cria dia nenhum');
eq(A.atrasados(itens,H).map(i=>i.id),['apl-de-setembro','av-esquecida'],
  'os atrasados vêm do mais antigo para o mais novo — inclusive os de meses anteriores');

/* ---------------------------------------------- 5. resumo do HOJE ----- */
const r=A.resumo(itens,H);
eq([r.atrasados,r.hoje,r.amanha,r.semana,r.feitosHoje],[2,2,1,3,1],
  'atrasados, hoje, amanhã, próximos sete dias e feitos hoje');
eq(r.proximo.id,'apl-amanha','o próximo é o primeiro pendente depois de hoje');
const soFeitos=A.resumo([{iso:H,tipo:'apl',feito:true},{iso:'2026-10-02',tipo:'av',feito:true}],H);
eq([soFeitos.atrasados,soFeitos.hoje,soFeitos.semana,soFeitos.feitosHoje,soFeitos.proximo],[0,0,0,1,null],
  'feito nunca conta como trabalho a fazer — nem atrasado, nem hoje');
eq(A.resumo(itens,'lixo').atrasados,0,'sem hoje válido, o resumo não chuta');

const f=A.faixa(H,itens);
eq(f.length,7,'a faixa da semana tem sete dias');
eq(f.map(d=>d.sigla),['DOM','SEG','TER','QUA','QUI','SEX','SÁB'],'começando por hoje');
eq(f.map(d=>d.dia),[4,5,6,7,8,9,10],'com o número do dia');
ok(f[0].hoje && !f[1].hoje,'o primeiro é hoje');
eq(f[0].pontos,dias[H].pontos,'e as bolinhas da faixa são as MESMAS do calendário');
eq(f[1].pontos,['apl'],'amanhã tem aplicação');
eq(f[4].pontos,['av'],'quinta tem avaliação');
eq(f[2].pontos,[],'dia livre não tem bolinha');
eq(A.faixa(H,[],3).length,3,'a faixa aceita outro tamanho');
eq(A.faixa('lixo',itens),[],'sem hoje válido não há faixa');

/* Calendário e resumo com a MESMA régua: somar as bolinhas de atrasado da grade
   inteira (mês corrente) bate com o que o resumo conta dentro do mês. */
const atrasadosNoMes=Object.keys(dias).filter(k=>k.slice(0,7)==='2026-10').reduce((s,k)=>s+dias[k].atrasados,0);
eq(atrasadosNoMes,A.atrasados(itens,H).filter(i=>i.iso.slice(0,7)==='2026-10').length,
  'o atraso da grade e o atraso da lista são a mesma conta');

console.log('Agenda em calendário: conta de data sem escorregar (virada, bissexto, troca de horário), grade de domingo a sábado, '+
  'bolinha por tipo com atraso vencendo, feito sem contar como trabalho e resumo do Hoje na mesma régua OK ('+n+' verificações).');
