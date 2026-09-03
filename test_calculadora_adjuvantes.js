/* Calculadora por área — mistura de itens e adjuvante % v/v para costal CO₂.
 *
 * O cenário reproduz uma parcela pequena, em que exibir tudo como 0,00 mL torna a
 * receita inútil. Os alvos abaixo são contas feitas à mão e protegem tanto a
 * aritmética quanto as unidades que o operador realmente mede.
 *
 * Rodar: node test_calculadora_adjuvantes.js
 */
"use strict";
const C=require("./vendor/biocalc-campo-core.js");

let passou=0,falhou=0;
function ok(cond,nome){
  if(cond){passou++;console.log("  ok    "+nome);}
  else{falhou++;console.log("  FALHA "+nome);}
}
function perto(valor,alvo,tol,nome){
  ok(Number.isFinite(valor)&&Math.abs(valor-alvo)<=tol,nome+
    (Math.abs(valor-alvo)<=tol?"":" (obtido "+valor+", esperado "+alvo+")"));
}

console.log("\n--- Receita estruturada: 3 itens + adjuvante ---");
const receita=C.parseStructuredComponents([
  {id:"c1",itemId:"it-a",nome:"Item A",valor:1,unidade:"L/ha",loteRef:{codigo:"A-01"}},
  {id:"c2",itemId:"it-b",nome:"Item B",valor:500,unidade:"mL/ha"},
  {id:"c3",itemId:"it-c",nome:"Item C",valor:.2,unidade:"L/ha"},
  {id:"c4",itemId:"it-adj",nome:"Adjuvante",valor:.15,unidade:"% v/v",
   doseRef:{origem:"bula",documento:"Bula vigente"}}
],"L/ha");

ok(receita.source==="structured","usa a receita estruturada, não remonta strings");
ok(receita.problems.length===0,"quatro componentes válidos");
ok(receita.components[3].unidade==="%","% v/v é normalizado como porcentagem de calda");
ok(receita.components[3].itemId==="it-adj","identidade do item é preservada");
ok(receita.components[0].loteRef.codigo==="A-01","lote é preservado para a memória BPL");
ok(receita.components[3].doseRef.origem==="bula","origem da dose é preservada");

/* 0,80 × 1,00 m = 0,8 m². A 200 L/ha: 16 mL/parcela.
   4 parcelas = 64 mL; + 300 mL de volume morto = 364 mL finais.
   Hectares equivalentes preparados = 0,364 L ÷ 200 L/ha = 0,00182 ha.
   Item A  = 1000 mL/ha × 0,00182 = 1,820 mL
   Item B  =  500 mL/ha × 0,00182 = 0,910 mL
   Item C  =  200 mL/ha × 0,00182 = 0,364 mL
   Adj.    = 0,15% × 364 mL       = 0,546 mL
   Líquidos = 3,640 mL; água q.s.p. 364 mL = 360,360 mL. */
const r=C.calculateMixture({
  components:receita.components,carrier:"Água",sprayVolume:200,
  plotLength:.8,plotWidth:1,numPlots:4,numBottles:1,
  deadVolumeMl:300,bottleCapacity:1
});

console.log("\n--- Conta por área, incluindo volume morto ---");
perto(r.sprayPerPlotMl,16,1e-9,"calda por parcela = 16 mL");
perto(r.sprayTotalMl,364,1e-9,"calda final = 364 mL");
perto(r.components[0].total,1.82,1e-9,"Item A = 1,82 mL");
perto(r.components[1].total,.91,1e-9,"Item B = 0,91 mL");
perto(r.components[2].total,.364,1e-9,"Item C = 0,364 mL");
perto(r.components[3].total,.546,1e-9,"adjuvante = 0,546 mL, já sobre a calda final");
perto(r.liquidTotalMl,3.64,1e-9,"soma dos líquidos = 3,64 mL");
perto(r.carrier.total,360.36,1e-9,"água q.s.p. = 360,36 mL");
ok(r.liquidFits&&r.bottleCapacityOk&&r.canPrepare,"receita fisicamente possível e dentro do frasco");

console.log("\n--- Unidade que o operador lê ---");
ok(C.formatAmount(.137,"mL")==="137 µL","0,137 mL vira 137 µL");
ok(C.formatAmount(.546,"mL")==="546 µL","0,546 mL vira 546 µL");
ok(C.formatAmount(6.6,"mL")==="6,6 mL","6,600 mL vira 6,6 mL");
ok(C.formatAmount(1100,"mL")==="1,1 L","1,10 L vira 1,1 L");
ok(C.formatAmount(.364,"g")==="364 mg","0,364 g vira 364 mg");
ok(C.doseUnitLabel("%") === "% v/v","a tela explicita % v/v");

console.log("\n--- Bloqueios antes do preparo ---");
const estoura=C.calculateMixture({
  components:[{nome:"Produto",valor:2,unidade:"L/ha"}],sprayVolume:1,
  plotLength:1,plotWidth:1,numPlots:1,numBottles:1,deadVolumeMl:0,bottleCapacity:1
});
ok(!estoura.liquidFits&&!estoura.canPrepare,"produto líquido maior que a calda bloqueia o preparo");

const naoCabe=C.calculateMixture({
  components:receita.components,sprayVolume:200,plotLength:.8,plotWidth:1,
  numPlots:4,numBottles:1,deadVolumeMl:300,bottleCapacity:.25
});
ok(naoCabe.minBottles===2&&!naoCabe.bottleCapacityOk&&!naoCabe.canPrepare,
   "capacidade insuficiente pede dois frascos e bloqueia o preparo");

console.log("\n"+(falhou?(falhou+" FALHA(S) em "+(passou+falhou)):passou+" verificações, nenhuma falha."));
process.exit(falhou?1:0);
