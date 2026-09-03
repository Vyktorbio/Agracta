/* Equivalente em i.a. de produto com mais de um ativo.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * `item.concentracao` é texto livre, e quem o lia pegava a PRIMEIRA concentração
 * que encontrasse. Num produto de dois ativos — 2,4-D 406 g/L + picloram 103,6 g/L
 * — o equivalente saía 406 e calava sobre o resto: um número certo apresentado
 * como se fosse a história inteira, sem nenhum aviso.
 *
 * Enquanto a concentração era digitada à mão isso era raro. Com o catálogo do
 * Agrofit, onde 100% dos registros trazem o i.a. com a concentração embutida, vira
 * o caso comum — por isso se conserta ANTES de importar.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. UM RESULTADO POR ATIVO, E NENHUMA SOMA. Gramas de 2,4-D e gramas de picloram
 *     não são a mesma grandeza; um total único faria parecer que são.
 *  2. O FORMATO ANTIGO CONTINUA VALENDO. "500 g/L", sem parênteses, é como todo
 *     item já cadastrado está — quebrar isso seria o oposto da correção.
 *  3. A ÂNCORA É A CONCENTRAÇÃO, NÃO O NOME. Parêntese aninhado no grupo químico
 *     ("etefom (etileno (precursor de)) (720 g/L)") não pode derrubar a leitura.
 *  4. UNIDADE QUE NÃO É CONCENTRAÇÃO DE MASSA FICA FORA DA CONTA, não é
 *     adivinhada. Desde a v189 o NOME do ativo biológico é lido — antes ele
 *     sumia inteiro, e era isso que deixava 186 produtos do catálogo sem
 *     ingrediente ativo na tela. O que não se faz é aritmética de i.a. sobre
 *     "vespas/copo".
 *
 * Rodar: node test_equivalente_ia.js
 */
var D=require('./vendor/dose-core.js');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,t,n){ var ok=(a!=null&&Math.abs(a-b)<=t); ck(ok,n+(ok?'':' (obtido '+a+', esperado ~'+b+')')); }

console.log('\n--- O formato antigo, que todo item cadastrado usa ---');
var a1=D.ativosDe('500 g/L');
eq(a1.length, 1, 'um ativo');
eq(a1[0].valor, 500, 'com o valor');
eq(a1[0].ia, '', 'e sem nome — o texto não tinha');
eq(D.ativosDe('70%')[0].valor, 70, 'porcentagem solta também');
eq(D.ativosDe('250 g/kg')[0].unidade, 'g/kg', 'e g/kg');

console.log('\n--- GOLDEN TEST: mistura de dois ativos ---');
/* 1 L/ha de um produto com 406 g/L de 2,4-D e 103,6 g/L de picloram entrega
   406 g de um e 103,6 g do outro por hectare. Conferido à mão. */
var mix='2,4-D (ácido ariloxialcanóico) (406 g/L) + picloram (ácido piridinocarboxílico) (103.6 g/L)';
var r=D.equivalentesIA(1,'L/ha',mix);
ck(!r.erro, 'a mistura é calculada');
eq(r.itens.length, 2, 'com um resultado por ativo');
eq(r.ativos, 2, 'declarando quantos ativos existem');
eq(r.parcial, false, 'e que nenhum ficou de fora');
eq(r.itens[0].ia, '2,4-D', 'o primeiro é nomeado');
perto(r.itens[0].valor, 406, 1e-9, '406 g i.a./ha');
eq(r.itens[1].ia, 'picloram', 'o segundo também');
perto(r.itens[1].valor, 103.6, 1e-9, '103,6 g i.a./ha');
ck(!('total' in r), 'e NÃO existe total — somar 2,4-D com picloram não significa nada');

console.log('\n--- Dobrar a dose dobra cada ativo ---');
var r2=D.equivalentesIA(2,'L/ha',mix);
perto(r2.itens[0].valor, 812, 1e-9, '2 L/ha dá 812 g de 2,4-D');
perto(r2.itens[1].valor, 207.2, 1e-9, 'e 207,2 g de picloram');

console.log('\n--- Parêntese aninhado no grupo químico ---');
/* Foi o que derrubou o meu primeiro parser no reconhecimento do Agrofit: casar o
   grupo antes da concentração não sobrevive a "(etileno (precursor de))". */
var an=D.ativosDe('etefom (etileno (precursor de)) (720 g/L)');
eq(an.length, 1, 'lê apesar do aninhamento');
eq(an[0].ia, 'etefom', 'com o nome certo');
eq(an[0].valor, 720, 'e a concentração certa');
eq(D.ativosDe('propinebe (alquilenobis(ditiocarbamato)) (700 g/kg)')[0].valor, 700, 'outro caso idem');

console.log('\n--- Unidade que não é concentração de massa fica FORA da conta ---');
/* Este bloco mudou de contrato na v189, e a mudança é uma correção.
   Antes, unidade biológica fazia `ativosDe` devolver ZERO ativos — o ativo
   sumia inteiro, e com ele o NOME. Era o que deixava 186 produtos do catálogo
   sem ingrediente ativo nenhum na tela.
   Agora o nome é lido (a folha precisa dele) e a concentração vem marcada como
   `conversivel:false`. A garantia que este teste sempre defendeu continua de pé,
   e mais forte: ela agora é verificada onde a conta acontece, não pela ausência
   do dado. */
var bt=D.ativosDe('Bacillus thuringiensis (Produto Microbiológico) (700 ml/litro)');
eq(bt.length, 1, 'o ativo biológico passa a ser lido');
eq(bt[0].ia, 'Bacillus thuringiensis', 'com o nome, que antes se perdia');
eq(bt[0].conversivel, false, 'mas "ml/litro" NÃO é concentração de massa');
ck(!!D.equivalentesIA(1,'L/ha','Bacillus thuringiensis (Produto Microbiológico) (700 ml/litro)').erro,
   'e o equivalente em i.a. recusa em vez de calcular');
var ac=D.ativosDe('Phytoseiulus macropilis (Ácaros Vivos) (10000 ácaros/cilindro)');
eq(ac[0].ia, 'Phytoseiulus macropilis', 'ácaro predador idem: nome lido');
eq(ac[0].conversivel, false, 'e fora da conta — biológico não tem g/L');
eq(D.ativosDe('0,8 kg/ha').length, 0, 'dose por área continua não sendo concentração');
ck(!!D.equivalentesIA(1,'L/ha','sem concentração nenhuma').erro, 'texto sem concentração devolve erro nomeado');

console.log('\n--- A fase tem de casar, como sempre teve ---');
/* g/L é líquido, g/kg é sólido: o cruzamento exige densidade e é recusado. */
var fase=D.equivalentesIA(1,'kg/ha','406 g/L');
ck(!!fase.erro, 'dose em kg/ha com concentração em g/L é recusada');
ck(fase.erro.indexOf('densidade')>=0, 'nomeando a densidade que falta');

console.log('\n--- Mistura em que um ativo não converte ---');
var meio=D.equivalentesIA(1,'L/ha','A (grupo) (406 g/L) + B (grupo) (250 g/kg)');
eq(meio.itens.length, 1, 'sai o que dá para calcular');
eq(meio.parcial, true, 'marcado como PARCIAL — a tela precisa poder avisar');
eq(meio.ativos, 2, 'sabendo que havia dois');

console.log('\n--- Entrada vazia não quebra ---');
eq(D.ativosDe('').length, 0, 'texto vazio');
eq(D.ativosDe(null).length, 0, 'nulo');
ck(!!D.equivalentesIA(1,'L/ha','').erro, 'e o equivalente devolve erro em vez de estourar');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
