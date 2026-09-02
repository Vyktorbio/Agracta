/* Motor universal de doses.
 *
 * POR QUE ELE EXISTE
 *
 * O Agracta atende drone, sider, costal, atomizador, Torre de Potter e bioensaio em
 * placa. "L/ha" não cobre isso: uma dose pode ser por ÁREA (L/ha), por CONCENTRAÇÃO
 * NA CALDA (mL/L, % v/v, ppm) ou por UNIDADE-ALVO (por planta, por placa) — e as três
 * respondem perguntas diferentes.
 *
 * A REGRA QUE ESTE TESTE GUARDA
 *
 * Dentro da mesma família, converter é aritmética. ENTRE FAMÍLIAS, não é: passar de
 * mL/L para L/ha exige a VAZÃO, e de "por planta" para "por hectare" exige a
 * POPULAÇÃO. Sem esses números a conversão não é difícil — é impossível, e tem de ser
 * RECUSADA com o nome do que falta. Um app que converte assim mesmo, chutando 200 L/ha
 * porque é comum, produz uma dose errada com cara de dose certa. E ninguém confere o
 * que já veio calculado.
 *
 * Rodar: node test_dose_core.js
 */
var D=require('./vendor/dose-core.js');
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ var ok=(a!=null&&isFinite(a)&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* ============================================================================== */
console.log('\n--- GOLDEN: conversão dentro da família, conferida à mão ---');
perto(D.converter(1,'L/ha','mL/ha').valor,1000,1e-12,'1 L/ha = 1000 mL/ha');
perto(D.converter(800,'mL/ha','L/ha').valor,0.8,1e-12,'800 mL/ha = 0,8 L/ha');
perto(D.converter(1.5,'kg/ha','g/ha').valor,1500,1e-12,'1,5 kg/ha = 1500 g/ha');
/* 1% v/v = 1 mL em 100 mL = 10 mL por litro */
perto(D.converter(1,'% v/v','mL/L').valor,10,1e-12,'1% v/v = 10 mL/L');
perto(D.converter(0.033,'% v/v','mL/L').valor,0.33,1e-12,'0,033% v/v = 0,33 mL/L');
/* 1% m/v = 1 g em 100 mL = 10 g por litro */
perto(D.converter(1,'% m/v','g/L').valor,10,1e-12,'1% m/v = 10 g/L');
/* ppm = mg/L (água, densidade 1 — convenção de bancada) */
perto(D.converter(1000,'ppm','g/L').valor,1,1e-12,'1000 ppm = 1 g/L');
perto(D.converter(50,'ppm','mg/L').valor,50,1e-12,'50 ppm = 50 mg/L');
perto(D.converter(1000,'uL/placa','mL/placa').valor,1,1e-12,'1000 µL/placa = 1 mL/placa');

console.log('\n--- Fase não se cruza sem densidade ---');
/* mL/L descreve líquido, g/L descreve sólido. Converter um no outro exigiria saber a
   densidade do produto — e chutar 1,0 é o erro clássico. */
ck(!!D.converter(1,'mL/L','g/L').erro,'mL/L para g/L é recusado');
ck(/densidade/.test(D.converter(1,'mL/L','g/L').erro),'dizendo que falta a densidade');
ck(!!D.converter(1,'L/ha','kg/ha').erro,'L/ha para kg/ha idem');

console.log('\n--- ENTRE FAMÍLIAS: recusa com o nome do que falta ---');
var semVazao=D.converterComContexto(2,'mL/L','L/ha',{});
ck(!!semVazao.erro,'mL/L para L/ha sem vazão é RECUSADO');
eq(semVazao.falta,'vazaoLHa','e diz exatamente o que falta');
ck(/vazão/.test(semVazao.erro),'em português, na mensagem');
var semPop=D.converterComContexto(50,'mL/planta','L/ha',{});
ck(!!semPop.erro,'por planta para por hectare sem população é recusado');
eq(semPop.falta,'alvosPorHa','e diz o que falta');
ck(/planta/.test(semPop.erro),'nomeando o alvo, não um "alvo" genérico');

console.log('\n--- GOLDEN: com o contexto em mãos, converte ---');
/* 2 mL/L × 200 L de calda por ha = 400 mL/ha = 0,4 L/ha */
perto(D.converterComContexto(2,'mL/L','L/ha',{vazaoLHa:200}).valor,0.4,1e-12,
      '2 mL/L a 200 L/ha = 0,4 L/ha');
/* o caminho de volta: 0,4 L/ha ÷ 200 = 2 mL/L */
perto(D.converterComContexto(0.4,'L/ha','mL/L',{vazaoLHa:200}).valor,2,1e-12,
      'e 0,4 L/ha a 200 L/ha = 2 mL/L');
/* 50 mL por planta × 2000 plantas/ha = 100.000 mL/ha = 100 L/ha */
perto(D.converterComContexto(50,'mL/planta','L/ha',{alvosPorHa:2000}).valor,100,1e-12,
      '50 mL/planta com 2000 plantas/ha = 100 L/ha');
/* 500 ppm a 200 L/ha: 500 mg/L × 200 L = 100.000 mg = 100 g/ha */
perto(D.converterComContexto(500,'ppm','g/ha',{vazaoLHa:200}).valor,100,1e-9,
      '500 ppm a 200 L/ha = 100 g/ha');
eq(D.converterComContexto(2,'mL/L','L/ha',{vazaoLHa:200}).usou.vazaoLHa,200,
   'e o resultado diz QUE número usou');

console.log('\n--- GOLDEN: equivalente em ingrediente ativo ---');
/* Duas formulações a 1 L/ha não são a mesma dose se uma tem 250 g/L e a outra 500. */
perto(D.equivalenteIA(1,'L/ha',500,'g/L').valor,500,1e-12,'500 g/L a 1 L/ha = 500 g i.a./ha');
perto(D.equivalenteIA(0.8,'L/ha',500,'g/L').valor,400,1e-12,'a 0,8 L/ha = 400 g i.a./ha');
perto(D.equivalenteIA(1,'L/ha',250,'g/L').valor,250,1e-12,'e a 250 g/L, metade — a comparação que importa');
perto(D.equivalenteIA(1.5,'kg/ha',700,'g/kg').valor,1050,1e-12,'700 g/kg a 1,5 kg/ha = 1050 g i.a./ha');
perto(D.equivalenteIA(800,'mL/ha',500,'g/L').valor,400,1e-12,'800 mL/ha dá o mesmo que 0,8 L/ha');
/* 50% = 500 g por L (ou por kg) */
perto(D.equivalenteIA(1,'L/ha',50,'%').valor,500,1e-12,'concentração em % também vale: 50% a 1 L/ha = 500 g i.a./ha');

console.log('\n--- Fase cruzada no i.a. é recusada ---');
/* g/L descreve líquido; kg/ha é dose sólida. Casar as duas sem densidade daria um
   número plausível e falso. */
var cruz=D.equivalenteIA(1,'kg/ha',500,'g/L');
ck(!!cruz.erro,'concentração em g/L com dose em kg/ha é recusada');
ck(/densidade/.test(cruz.erro),'dizendo que sem a densidade essa conversão não existe');
ck(!!D.equivalenteIA(1,'g/ha',500,'g/L').erro,'g/ha com g/L idem');
/* i.a. por hectare só faz sentido para dose por área. */
ck(!!D.equivalenteIA(50,'ppm',500,'g/L').erro,'ppm não rende g i.a./ha — não há hectare em ppm');
ck(!!D.equivalenteIA(1,'L/ha',0,'g/L').erro,'concentração zero é recusada, não vira zero i.a.');

console.log('\n--- Famílias e fases estão declaradas ---');
eq(D.familia('L/ha'),'area','L/ha é por área');
eq(D.familia('% v/v'),'calda','% v/v é concentração na calda');
eq(D.familia('mL/placa'),'alvo','mL/placa é por unidade-alvo');
eq(D.fase('kg/ha'),'solido','kg/ha é sólido');
eq(D.fase('L/ha'),'liquido','L/ha é líquido');
ck(D.unidadesDaFamilia('alvo').length>=5,'a família por alvo cobre planta, parcela, placa, vaso e semente');
/* % m/m fica de fora de propósito: é fração de massa da MISTURA, e convertê-la
   exigiria a densidade da calda, que ninguém informa. */
eq(D.unidade('% m/m'),null,'% m/m NÃO está no catálogo, e isso é deliberado');

console.log('\n--- Escada de doses ---');
var e=D.escada(0.8,'L/ha',[0.25,0.5,1,2]);
eq(e.degraus.length,4,'quatro degraus');
perto(e.degraus[0].valor,0.2,1e-12,'0,25× de 0,8 = 0,2');
perto(e.degraus[1].valor,0.4,1e-12,'0,5× = 0,4');
perto(e.degraus[2].valor,0.8,1e-12,'1× = 0,8');
perto(e.degraus[3].valor,1.6,1e-12,'2× = 1,6');
eq(e.degraus[0].texto,'0,2 L/ha','com o texto pronto, em vírgula');
/* Os degraus saem em ordem, mesmo pedidos fora de ordem. */
eq(D.escada(1,'L/ha',[2,0.5,1]).degraus.map(function(g){return g.valor;}).join(','),'0.5,1,2',
   'degraus saem ordenados, mesmo pedidos fora de ordem');
/* Pedir 1× duas vezes não pode virar dois tratamentos iguais. */
eq(D.escada(1,'L/ha',[1,1,2]).degraus.length,2,'múltiplo repetido não vira degrau duplicado');
ck(!!D.escada(0,'L/ha',[1]).erro,'dose de referência zero é recusada');
ck(!!D.escada(1,'inventada',[1]).erro,'unidade desconhecida é recusada');
eq(D.escada(1,'L/ha',[]).degraus.length,4,'sem múltiplos, usa o padrão 0,25 · 0,5 · 1 · 2');

console.log('\n--- O texto da dose se lê como se escreve aqui ---');
eq(D.formatar(0.8,'L/ha'),'0,8 L/ha','vírgula, não ponto');
eq(D.formatar(1,'L/ha'),'1 L/ha','sem zeros à toa');
eq(D.formatar(0.033,'% v/v'),'0,033 % v/v','e casas quando o número é pequeno');
eq(D.formatar(null,'L/ha'),'—','sem valor, um travessão — não "0"');
eq(typeof D.VERSION,'string','o motor declara versão');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
