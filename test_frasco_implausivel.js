/* Frasco grande demais também é erro de unidade.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O motor sabia reclamar do frasco que NÃO CABE. Do frasco absurdamente grande,
 * não: ele cabe com folga, `canPrepare` fica verdadeiro e nada é dito. Mas é
 * exatamente ali que mora o engano de unidade — "1900" digitado pensando em
 * mililitros vira 1.900 L, e um preparo de 318 mL entra nele sem esbarrar em
 * nada.
 *
 * O aviso APONTA, NÃO BLOQUEIA. Frasco maior que o preparo é rotina: 1 L num
 * costal de 20 L são 20× e não têm nada de errado. Só acima de cem preparos
 * inteiros a troca de unidade passa a ser a explicação mais provável — e mesmo
 * aí o texto pergunta em vez de afirmar, porque quem prepara é que sabe.
 *
 * Rodar: node test_frasco_implausivel.js
 */
var BC=require('./vendor/biocalc-campo-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

function mix(cap){
  return BC.calculateMixture({components:[{nome:'Sankari',dose:1.5,unit:'L/ha'}],
    carrier:'Água', sprayVolume:3, plotLength:5, plotWidth:3, numPlots:4,
    numBottles:1, deadVolumeMl:300, bottleCapacity:cap});
}
function avisoDeFrasco(r){
  return (r.warnings||[]).filter(function(w){ return /frasco declarado/i.test(w); })[0]||null;
}

console.log('\n--- O caso real: 318 mL de calda, frasco declarado 1.900 L ---');
var r=mix(1900);
ck(r.sprayTotalMl===318,'a calda continua 318 mL (o aviso não mexe na conta)');
var a=avisoDeFrasco(r);
ck(!!a,'o frasco implausível é apontado');
ck(/1,9 L/.test(a||''),'e a mensagem oferece a leitura em mililitros: '+JSON.stringify(a));
ck(r.canPrepare===true,'mas NÃO bloqueia: continua podendo preparar');

console.log('\n--- O frasco certo não gera ruído ---');
ck(avisoDeFrasco(mix(1.9))===null,'1,9 L para 318 mL passa calado');
ck(avisoDeFrasco(mix(0.5))===null,'500 mL para 318 mL passa calado');

console.log('\n--- Folga legítima continua legítima ---');
ck(avisoDeFrasco(mix(20))===null,'costal de 20 L para 318 mL ainda não é absurdo (63×)');
ck(avisoDeFrasco(mix(31.8))===null,'exatamente 100× é o limite e ainda não avisa');
ck(avisoDeFrasco(mix(32))!==null,'acima de 100× avisa');

console.log('\n--- Capacidade zero é "não conferir", não é aviso ---');
ck(avisoDeFrasco(mix(0))===null,'zero não gera aviso nenhum');

console.log('\n--- O caminho de produto único também ganhou o aviso ---');
var u=BC.calculateTreatment({doseHa:1.5, doseUnit:'L/ha', sprayVolume:3, plotLength:5, plotWidth:3,
                    numPlots:4, numBottles:1, deadVolumeMl:300, bottleCapacity:1900});
ck(!!u.bottleCapacityWarning,'produto único aponta o frasco implausível');
ck(/1,9 L/.test(u.bottleCapacityWarning||''),'com a mesma leitura alternativa');
var u2=BC.calculateTreatment({doseHa:1.5, doseUnit:'L/ha', sprayVolume:3, plotLength:5, plotWidth:3,
                     numPlots:4, numBottles:1, deadVolumeMl:300, bottleCapacity:1.9});
ck(u2.bottleCapacityWarning===null,'e cala com o frasco certo');
ck(u2.bottleCapacityOk===true,'sem mexer no campo que já existia');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
