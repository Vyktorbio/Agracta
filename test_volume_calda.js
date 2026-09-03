/* Volume de calda: número, não texto.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O caso foi real e caro. O protocolo trazia
 *
 *     "1,5 L ÁGUA (TOTAL 3,0 L/ha)"
 *
 * e a calculadora pegava o PRIMEIRO número — 1,5. Com 1,5 L/ha no lugar de 3, o
 * produto a 1,5 L/ha passa a ocupar 100% da calda, não sobra espaço para água
 * nenhuma e a tela mostra "NÃO PREPARE". O bloqueio estava certo; ele só recusava
 * por um motivo invisível para quem estava na bancada.
 *
 * Três coisas precisam continuar valendo:
 *
 *  1. TEXTO COM MAIS DE UM NÚMERO NÃO É INTERPRETADO. Vira pergunta. Escolher
 *     outro número em silêncio não conserta o erro — só muda a vítima.
 *  2. A SUGESTÃO APONTA, NÃO DECIDE. Quando um único número está qualificado por
 *     área ("3,0 L/ha"), ele é sugerido; quem confirma é a pessoa.
 *  3. TEXTO INEQUÍVOCO CONTINUA FUNCIONANDO. "150", "3 L/ha", "1.500 L/ha" — nada
 *     que já funcionava pode passar a perguntar.
 *
 * Rodar: node test_volume_calda.js
 */
var D=require('./vendor/dose-core.js');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,t,n){ var ok=(a!=null&&Math.abs(a-b)<=t); ck(ok,n+(ok?'':' (obtido '+a+', esperado ~'+b+')')); }

console.log('\n--- GOLDEN TEST: o texto que causou o erro ---');
var r=D.volumeCalda('1,5 L ÁGUA (TOTAL 3,0 L/ha)');
eq(r.valor, null, 'NÃO devolve número — nem 1,5 nem 3');
eq(r.ambiguo, true, 'declara que é ambíguo');
eq(r.numeros, 2, 'contando os dois números');
perto(r.sugestao, 3, 1e-9, 'e sugere 3, o único qualificado por área');
ck(r.motivo.indexOf('não diz qual')>=0, 'com um motivo legível');
eq(r.candidatos.length, 2, 'os dois candidatos vão para a tela');
ck(r.candidatos.some(function(c){ return Math.abs(c.emLha-1.5)<1e-9; }), 'inclusive o 1,5 — quem decide é a pessoa');

console.log('\n--- Texto inequívoco continua funcionando ---');
[['3',3,'número puro'],
 ['3 L/ha',3,'com unidade'],
 ['150',150,'volume de campo'],
 ['1.500 L/ha',1500,'milhar PT-BR — não vira 1,5'],
 ['200 L/ha',200,'duzentos']].forEach(function(x){
  var v=D.volumeCalda(x[0]);
  perto(v.valor, x[1], 1e-9, x[2]+': "'+x[0]+'" → '+x[1]);
  ck(!v.ambiguo, '  e sem pergunta');
});
perto(D.volumeCalda('200 mL/ha').valor, 0.2, 1e-9, 'mL/ha vira L/ha');
eq(D.volumeCalda(3).valor, 3, 'número já é número');

console.log('\n--- Outros textos de duas leituras também param ---');
['1,5 L (total 3 L/ha)','10 a 20 L/ha','2 frascos de 150 L/ha'].forEach(function(t){
  eq(D.volumeCalda(t).ambiguo, true, '"'+t+'" é recusado');
});

console.log('\n--- Sem número, sem palpite ---');
eq(D.volumeCalda('água').valor, null, 'texto sem número não vira volume');
eq(D.volumeCalda('água').semNumero, true, 'e diz por quê');
eq(D.volumeCalda('').vazio, true, 'vazio é vazio');
eq(D.volumeCalda(null).vazio, true, 'nulo idem');

console.log('\n--- Dois números, nenhum qualificado: não há o que sugerir ---');
var s2=D.volumeCalda('1,5 e 3,0');
eq(s2.ambiguo, true, 'continua sendo pergunta');
eq(s2.sugestao, null, 'mas sem sugestão — o app não escolhe por conta própria');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
