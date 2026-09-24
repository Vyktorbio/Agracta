/* Bioensaio em arena: pote = parcela, dose em kg/ha traduzida para o pote.
 *
 * O caso que motivou: moluscicida granulado sobre lesma em soja, pote de
 * 37 × 22 cm (0,0814 m²), 1 lesma por pote, doses de 2 a 7 kg/ha, D0 a D10.
 *
 * O QUE ESTE TESTE TRANCA
 *   - a área e a densidade do pote (1 lesma ≈ 12,3/m²);
 *   - kg/ha → mg por pote → pellets, a partir do PESO do pellet, nunca de
 *     "1 pellet por kg/ha"; sem peso, o motor diz o que falta e não chuta;
 *   - o desvio de dose causado por pellets inteiros vira aviso;
 *   - o papel de cada variável pelo nome ("desintegrados" não é "íntegros");
 *   - as três curvas (dano, sobrevivência, consumo de pellets) e o resumo do
 *     fim do ensaio contra a testemunha INFESTADA;
 *   - a condição inicial por tratamento e o aviso de desbalanço.
 *
 * Rodar: node test_arena.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
const A=require('./vendor/arena-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const perto=(a,b,tol,m)=>ok(a!=null&&Math.abs(a-b)<=(tol||1e-9),m+' (obtido '+a+', esperado '+b+')');

/* ---------- área e densidade ---------- */
const pote={forma:'retangular',comprimentoCm:37,larguraCm:22,organismosPorUnidade:1};
perto(A.area(pote).m2,0.0814,1e-9,'37 × 22 cm = 0,0814 m²');
perto(A.densidade(pote).porM2,12.285,0.001,'1 lesma por pote ≈ 12,3 lesmas/m²');
perto(A.area({forma:'circular',diametroCm:10}).m2,Math.PI*0.0025,1e-12,'arena circular pelo diâmetro');
ok(A.area({}).m2===null&&/comprimento/.test(A.area({}).motivo),'sem medidas: área nula com o motivo');
ok(A.densidade({comprimentoCm:37,larguraCm:22}).porM2===null,'sem nº de organismos: densidade nula');

/* ---------- dose por área → pote ---------- */
perto(A.doseNaArena(1,'kg/ha',pote).mg,8.14,1e-9,'1 kg/ha = 8,14 mg por pote');
const semPeso=A.doseNaArena(7,'kg/ha',pote);
perto(semPeso.mg,56.98,1e-9,'7 kg/ha = 56,98 mg por pote');
ok(semPeso.pellets===null&&/peso médio do pellet/.test(semPeso.motivo),'sem o peso do pellet: não chuta o nº de pellets');
const p8=A.doseNaArena(7,'kg/ha',Object.assign({pesoPelletMg:8.14},pote));
ok(p8.pelletsArred===7&&Math.abs(p8.desvioPct)<1e-9,'"7 kg/ha = 7 pellets" só vale com pellet de ~8 mg');
const p25=A.doseNaArena(7,'kg/ha',Object.assign({pesoPelletMg:25},pote));
perto(p25.pellets,2.2792,0.0001,'com pellet de 25 mg, 7 kg/ha são 2,28 pellets');
ok(p25.pelletsArred===2,'arredonda para pellets inteiros');
perto(p25.doseEfetiva,6.1425,0.0001,'e informa a dose que de fato vai para o pote');
ok(p25.avisos.some(a=>/desviam a dose/.test(a)),'desvio de −12% vira aviso');
const minimo=A.doseNaArena(2,'kg/ha',Object.assign({pesoPelletMg:60},pote));
ok(minimo.pelletsArred===1&&minimo.avisos.some(a=>/mínimo/.test(a)),'menos de meio pellet: 1 pellet, com aviso');
perto(A.doseNaArena(500,'g/ha',pote).mg,4.07,1e-9,'g/ha também é dose por área');
ok(/não é dose por área/.test(A.doseNaArena(2,'L/ha',pote).motivo),'L/ha não vira pellet');
ok(/não declarada/.test(A.doseNaArena(2,'',pote).motivo),'unidade ausente: pergunta, não assume');
ok(/dose não informada/.test(A.doseNaArena('',"kg/ha",pote).motivo),'testemunha sem dose: nada a pesar');

/* ---------- papel das variáveis ---------- */
ok(A.papel('Dano foliar (%)')==='dano','dano foliar');
ok(A.papel('Consumo foliar (%)')==='dano','consumo foliar entra na curva de dano');
ok(['Lesma ativa','Lesma se alimentando','Lesma paralisada','Muco (0–2)'].every(n=>A.papel(n)===null),'comportamentos da lesma não viram morte nem dano');
ok(A.papel('Lesma morta')==='morte','lesma morta');
ok(A.papel('Pellets íntegros')==='integros','pellets íntegros');
ok(A.papel('Pellets desintegrados')==='desintegrados','"desintegrados" não é "íntegros"');
ok(A.papel('Pellets consumidos/mordidos')==='mordidos','pellets mordidos');
ok(A.papel('Estado da lesma')===null&&A.papel('Folhas atacadas')===null&&A.papel('Meristema atacado')===null,
  'estado, folhas e meristema não entram nas curvas-resumo');

/* ---------- curvas e resumo ---------- */
const trats=[{id:'T01'},{id:'T02'},{id:'T03'}];
const M=(t2,t3)=>({T01:{'Dano foliar (%)':0},T02:t2,T03:t3});
const pontos=[
  {dia:0,medias:M({'Dano foliar (%)':0,'Lesma morta':0,'Pellets íntegros':0},
                  {'Dano foliar (%)':0,'Lesma morta':0,'Pellets íntegros':4,'Pellets mordidos':0,'Pellets desintegrados':0})},
  {dia:2,medias:M({'Dano foliar (%)':10,'Lesma morta':0},
                  {'Dano foliar (%)':4,'Lesma morta':50,'Pellets íntegros':2,'Pellets mordidos':1,'Pellets desintegrados':1})},
  {dia:4,medias:M({'Dano foliar (%)':30,'Lesma morta':25},
                  {'Dano foliar (%)':5,'Lesma morta':100,'Pellets íntegros':1,'Pellets mordidos':2,'Pellets desintegrados':1})}
];
const cv=A.curvas(pontos,trats);
ok(cv.dano.variavel==='Dano foliar (%)'&&cv.dano.series.T03.length===3,'curva de dano por tratamento');
ok(cv.sobrevivencia.series.T03.map(p=>p.y).join()==='100,50,0','sobrevivência = 100 − mortalidade');
ok(cv.consumo.series.T03.map(p=>p.y).join()==='0,50,75','consumo = (mordidos + desintegrados) / total');
ok(cv.consumo.series.T01.length===0,'testemunha não infestada sem pellets: sem ponto de consumo (não é zero)');
const R=A.resumo(cv,trats,'T02'), t3=R.linhas.find(l=>l.id==='T03');
perto(A.aacpd(cv.dano.series.T02),50,1e-9,'AACPD da testemunha infestada (trapézio)');
perto(t3.aacpd,13,1e-9,'AACPD do T03');
perto(t3.protecao,(1-13/50)*100,1e-9,'proteção relativa vs testemunha INFESTADA');
perto(t3.mortalidadeFinal,100,1e-9,'mortalidade final');
perto(t3.abbott,100,1e-9,'mortalidade corrigida de Abbott (testemunha com 25%)');
ok(t3.dia50===2,'dia em que a sobrevivência chegou a 50%');
perto(t3.pelletsAtacados,75,1e-9,'% de pellets atacados no fim');
ok(R.linhas.find(l=>l.id==='T02').protecao===null,'a testemunha não é comparada com ela mesma');
ok(A.resumo(cv,trats,null).semTestemunha===true,'sem testemunha marcada: o resumo diz, não inventa a base');

/* ---------- condição inicial ---------- */
const linhas=[{key:'T01R1',tratId:'T01'},{key:'T01R2',tratId:'T01'},{key:'T02R1',tratId:'T02'},{key:'T02R2',tratId:'T02'}];
const ci=A.condicaoInicial({T01R1:{'Peso da lesma (g)':'4,8'},T01R2:{'Peso da lesma (g)':5.2},T02R1:{'Peso da lesma (g)':8},T02R2:{'Peso da lesma (g)':''}},
  linhas,['Peso da lesma (g)']);
perto(ci.porTratamento.T01['Peso da lesma (g)'].media,5,1e-9,'média do peso inicial por tratamento (aceita vírgula)');
ok(ci.geral['Peso da lesma (g)'].faltam===1,'conta as parcelas ainda sem medida');
ok(ci.avisos.some(a=>/^T02:/.test(a)),'tratamento com lesmas muito mais pesadas é apontado');

/* ---------- ligação ---------- */
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const v=(html.match(/vendor\/arena-core\.js\?v=\d+/)||[])[0];
ok(v&&html.indexOf(v)<html.indexOf('app.js?v='),'motor carregado antes do app');
ok(sw.indexOf("'./"+v+"'")>=0,'motor no pré-cache com a mesma versão');

console.log('Arena: '+n+' verificações — área, densidade, dose no pote, papéis, curvas, resumo e condição inicial.');
