/* Verificação do desenho do ensaio (motor puro).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O app conferia a execução — se a calda fecha, se a baixa do lote bate — e não
 * tinha opinião nenhuma sobre o DESENHO. E é ali que o erro custa mais caro: uma
 * calda mal calculada se refaz no mesmo dia; um braço que faltou no delineamento
 * só aparece na hora de analisar, com a safra já colhida.
 *
 * O caso que originou o motor está no golden test abaixo: um ensaio de sinergista
 * testa o adjuvante sozinho a 0,033% e 0,2%, e mistura com o produto SÓ na dose
 * baixa. Pode ser proposital — mas ninguém tinha perguntado.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. APONTA, NÃO BLOQUEIA. Ensaio experimental existe para sair do padrão.
 *  2. SEVERIDADE SEPARA o que quase sempre é erro ('conferir') do que é pergunta
 *     legítima ('nota'). Lista ruidosa ninguém lê.
 *  3. NÃO ADIVINHA RECEITA. Texto livre com produto e dose que não pareiam fica
 *     FORA das checagens por componente — achado falso mata a confiança.
 *  4. DESENHO LIMPO NÃO GERA ACHADO. Se tudo está certo, a lista sai vazia.
 *
 * Rodar: node test_protocolo_verifica.js
 */
var P=require('./vendor/protocolo-core.js');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function cods(as){ return as.map(function(a){return a.codigo;}).sort().join(','); }
function tem(as,c){ return as.some(function(a){return a.codigo===c;}); }
function doCod(as,c){ return as.filter(function(a){return a.codigo===c;}); }

function comp(nome,valor,unidade){ return {nome:nome, valor:valor, unidade:unidade}; }

/* ---- GOLDEN TEST: o ensaio real que originou o motor -------------------- */
console.log('\n--- GOLDEN TEST: o ensaio do sinergista ---');
var sinergista={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Untreated', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Sinergista',0.033,'% v/v')]},
  {id:'T3', componentes:[comp('Sinergista',0.2,'% v/v')]},
  {id:'T4', componentes:[comp('Silwet',0.033,'% v/v')]},
  {id:'T5', componentes:[comp('Silwet',0.2,'% v/v')]},
  {id:'T6', componentes:[comp('Sinergista',0.033,'% v/v'), comp('Sankari',1.5,'L/ha')]},
  {id:'T7', componentes:[comp('Sankari',1.5,'L/ha'), comp('Silwet',0.033,'% v/v')]},
  {id:'T8', componentes:[comp('Sankari',1.5,'L/ha')]},
  {id:'T9', componentes:[comp('Clorantraniliprole',0.2,'L/ha')]}
]};
var g=P.verificar(sinergista);
eq(g.length, 2, 'dois achados, e só dois — o resto do desenho está limpo');
eq(cods(g), 'dose-solo-sem-mistura,dose-solo-sem-mistura', 'ambos são o mesmo tipo');
ck(g.every(function(a){return a.severidade==='nota';}), 'classificados como nota, não como erro');
ck(g[0].texto.indexOf('0,2 % v/v')>=0, 'a frase nomeia a dose que ficou de fora da mistura');
ck(g[0].texto.indexOf('0,033')>=0, 'e a que entrou');
ck(g.some(function(a){return a.texto.indexOf('Sinergista')>=0;}), 'aponta o Sinergista');
ck(g.some(function(a){return a.texto.indexOf('Silwet')>=0;}), 'e o Silwet');
ck(!tem(g,'sem-testemunha'), 'não reclama de testemunha — ela existe');
ck(!tem(g,'mistura-sem-solo'), 'nem de braço solo — cada componente da mistura tem o seu');
ck(!tem(g,'unidades-misturadas'), 'nem de unidade — cada item usa sempre a mesma família');

console.log('\n--- Desenho limpo não gera achado ---');
var limpo={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',1,'L/ha')]},
  {id:'T3', componentes:[comp('Produto A',2,'L/ha')]}
]};
eq(P.verificar(limpo).length, 0, 'ensaio de dose-resposta simples sai sem nenhum achado');

console.log('\n--- Sem testemunha ---');
var semTest={numRepeticoes:4, tratamentos:[
  {id:'T1', componentes:[comp('Produto A',1,'L/ha')]},
  {id:'T2', componentes:[comp('Produto A',2,'L/ha')]}
]};
ck(tem(P.verificar(semTest),'sem-testemunha'), 'ensaio sem o zero é apontado');
eq(doCod(P.verificar(semTest),'sem-testemunha')[0].severidade, 'conferir', 'e é para conferir');

console.log('\n--- Sem replicação ---');
var umaRep={numRepeticoes:1, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',1,'L/ha')]}
]};
ck(tem(P.verificar(umaRep),'sem-replicacao'), 'uma repetição só é apontada');
ck(!tem(P.verificar(limpo),'sem-replicacao'), 'quatro repetições não são');

console.log('\n--- Dois tratamentos com a mesma receita ---');
/* Não são dois braços: é um, digitado duas vezes — e a estatística os trata
   como se fossem diferentes. */
var iguais={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',1,'L/ha')]},
  {id:'T3', componentes:[comp('Produto A',1,'L/ha')]}
]};
var ri=doCod(P.verificar(iguais),'tratamentos-iguais');
eq(ri.length, 1, 'a duplicata é apontada uma vez');
eq(ri[0].severidade, 'conferir', 'como conferir');
eq(ri[0].tratamentos.join(','), 'T2,T3', 'nomeando os dois');
/* A ordem dos componentes não pode esconder a duplicata. */
var iguaisTrocado={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('A',1,'L/ha'), comp('B',2,'L/ha')]},
  {id:'T3', componentes:[comp('B',2,'L/ha'), comp('A',1,'L/ha')]}
]};
ck(tem(P.verificar(iguaisTrocado),'tratamentos-iguais'), 'mesma mistura em ordem trocada também é duplicata');

console.log('\n--- Componente que nunca é testado sozinho ---');
var semSolo={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',1,'L/ha')]},
  {id:'T3', componentes:[comp('Produto A',1,'L/ha'), comp('Adjuvante',0.1,'% v/v')]}
]};
var rs=doCod(P.verificar(semSolo),'mistura-sem-solo');
eq(rs.length, 1, 'o adjuvante sem braço solo é apontado');
ck(rs[0].texto.indexOf('Adjuvante')>=0, 'nomeando ele');
ck(rs[0].texto.indexOf('separado')>=0, 'e dizendo por que importa');
eq(rs[0].severidade, 'nota', 'como nota — pode ser proposital');

console.log('\n--- Dose única não dispara o achado de mistura ---');
/* Se disparasse, todo produto de dose única viraria achado e a lista morreria. */
ck(!tem(P.verificar(semSolo),'dose-solo-sem-mistura'),
   'item com uma dose só nunca gera "dose sem mistura"');

console.log('\n--- Unidades de famílias diferentes para o mesmo item ---');
var unid={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',1,'L/ha')]},
  {id:'T3', componentes:[comp('Produto A',0.5,'% v/v')]}
]};
ck(tem(P.verificar(unid),'unidades-misturadas'), 'L/ha num braço e % v/v noutro é apontado');
ck(!tem(P.verificar(limpo),'unidades-misturadas'), 'mesma família em todos os braços não é');

console.log('\n--- Tratamento sem dose que não é testemunha ---');
var semDose={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'', testemunha:true},
  {id:'T2', componentes:[comp('Produto A',null,'L/ha')]}
]};
ck(tem(P.verificar(semDose),'tratamento-sem-dose'), 'braço sem dose é apontado');
ck(!P.verificar(semDose).some(function(a){ return a.tratamentos.indexOf('T1')>=0 && a.codigo==='tratamento-sem-dose'; }),
   'mas a testemunha sem dose NÃO — nela isso é o esperado');

console.log('\n--- Texto livre: pareia quando dá, e cala quando não dá ---');
var texto={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'0', testemunha:true},
  {id:'T2', produto:'Produto A', dose:'1 L/ha'},
  {id:'T3', produto:'Produto A + Adjuvante', dose:'1 L/ha + 0,1 %'}
]};
var rt=P.verificar(texto);
ck(tem(rt,'mistura-sem-solo'), 'texto livre bem pareado entra nas checagens');
/* Produto e dose que não batem em número: parear seria adivinhar. */
var ambiguo={numRepeticoes:4, tratamentos:[
  {id:'T1', produto:'Testemunha', dose:'0', testemunha:true},
  {id:'T2', produto:'A + B + C', dose:'1 L/ha'}
]};
var ra=P.verificar(ambiguo);
ck(!tem(ra,'mistura-sem-solo'), 'receita ambígua fica FORA das checagens por componente');
ck(!tem(ra,'tratamento-sem-dose'), 'e não vira achado falso de dose faltando');
eq(P.receitaDe({produto:'A + B + C', dose:'1 L/ha'}), null, 'a receita ambígua devolve null, declarando que não sabe');

console.log('\n--- Nada quebra com entrada vazia ---');
eq(P.verificar(null).length, 0, 'sem estudo');
eq(P.verificar({}).length, 0, 'estudo sem tratamentos');
eq(P.verificar({tratamentos:[]}).length, 0, 'lista vazia');
eq(P.verificar({tratamentos:[null,{}]}).length, 0, 'tratamentos sem id são ignorados');
eq(P.resumo([]), '', 'resumo de lista vazia é vazio');
ck(P.resumo(g).indexOf('2 ponto')>=0, 'e o resumo conta os achados');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
