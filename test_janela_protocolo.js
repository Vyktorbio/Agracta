/* O protocolo passa a ter opinião sobre QUANDO aplicar.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Até aqui o app comentava o que já tinha acontecido: a calda que não fecha, o
 * lote vencido, a chuva depois. Sobre o que ERA PARA acontecer não tinha nada,
 * porque nada estava declarado — o plano era um número de aplicações e um
 * intervalo em dias.
 *
 * Sem plano declarado não existe desvio. E é o desvio que faz um ensaio perder
 * valor: aplicar fora da faixa de estádio pedida, ou com vento acima do que o
 * protocolo admitia, é o tipo de coisa que se descobre na auditoria, meses
 * depois, quando não há mais o que fazer.
 *
 * QUATRO REGRAS, e o teste existe para elas:
 *
 *  1. SEM JANELA DECLARADA, SILÊNCIO. `dentro` é null — não é "sim" nem "não",
 *     é "não perguntado". Estudo antigo continua como estava.
 *  2. NÃO JULGA O QUE NÃO SABE. Estádio não anotado é LACUNA, não desvio. As
 *     duas coisas são diferentes: uma é falha de execução, a outra de registro.
 *  3. APONTA, NÃO BLOQUEIA. Sair da janela é decisão de quem conduz o ensaio;
 *     o que não pode é sair sem registro do motivo.
 *  4. CAMPO VAZIO NÃO É ZERO. "vento até 0 km/h" reprovaria toda aplicação já
 *     feita — em branco significa "não confiro isto".
 *
 * Rodar: node test_janela_protocolo.js
 */
var J=require('./vendor/janela-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var jan={bbchMin:61,bbchMax:69,intervaloMin:14,intervaloMax:21,tempMax:30,urMin:50,ventoMax:10};

console.log('\n--- REGRA 1: sem janela declarada, silêncio ---');
[{}, null, undefined, {bbchMin:''}, {ventoMax:null}].forEach(function(j,i){
  var r=J.verificar(j,{bbch:'99',vento:99});
  ck(r.declarada===false && r.dentro===null && r.achados.length===0,
     'janela vazia #'+(i+1)+' não julga nada (dentro='+r.dentro+')');
});
ck(J.resumo({})==='','e não tem resumo para mostrar');

console.log('\n--- Dentro da janela: nada a dizer ---');
var r=J.verificar(jan,{bbch:'65',intervaloDias:18,temp:26,ur:70,vento:6});
ck(r.dentro===true,'aplicação conforme');
ck(r.achados.length===0,'nenhum achado — verificador que sempre fala não é lido');

console.log('\n--- Desvio de estádio, que é o caso caro ---');
r=J.verificar(jan,{bbch:'75',intervaloDias:18,temp:26,ur:70,vento:6});
ck(r.dentro===false,'fora da janela');
ck(r.desvios.length===1 && r.desvios[0].campo==='bbch','um desvio, no estádio');
ck(/BBCH 75/.test(r.desvios[0].texto),'diz o que ocorreu');
ck(/BBCH 61 a BBCH 69/.test(r.desvios[0].texto),'e o que era esperado: '+r.desvios[0].texto);

console.log('\n--- Cada limite é conferido por si ---');
ck(J.verificar(jan,{bbch:'65',intervaloDias:9,temp:26,ur:70,vento:6}).desvios[0].campo==='intervalo','intervalo curto');
ck(J.verificar(jan,{bbch:'65',intervaloDias:18,temp:34,ur:70,vento:6}).desvios[0].campo==='temp','temperatura alta');
ck(J.verificar(jan,{bbch:'65',intervaloDias:18,temp:26,ur:30,vento:6}).desvios[0].campo==='ur','umidade baixa');
ck(J.verificar(jan,{bbch:'65',intervaloDias:18,temp:26,ur:70,vento:22}).desvios[0].campo==='vento','vento alto');
r=J.verificar(jan,{bbch:'75',intervaloDias:18,temp:26,ur:70,vento:22});
ck(r.desvios.length===2,'dois desvios ao mesmo tempo saem os dois');

console.log('\n--- REGRA 2: não anotado é LACUNA, não desvio ---');
r=J.verificar(jan,{intervaloDias:18,temp:26,ur:70,vento:6});
ck(r.lacunas.length===1 && r.lacunas[0].campo==='bbch','estádio ausente vira lacuna');
ck(r.desvios.length===0,'e NÃO vira desvio — são coisas diferentes');
ck(r.dentro===true,'lacuna não reprova a aplicação: não se sabe, não se acusa');
ck(/não dá para conferir/.test(r.lacunas[0].texto),'o texto diz isso: '+r.lacunas[0].texto);

console.log('\n--- BBCH tem de ser código de dois dígitos ---');
ck(J.verificar(jan,{bbch:'florescimento',temp:26,ur:70,vento:6,intervaloDias:18}).lacunas.length===1,
   'texto solto não vira número — vira lacuna');
ck(J.verificar(jan,{bbch:'5',temp:26,ur:70,vento:6,intervaloDias:18}).lacunas.length===1,
   'um dígito só também não');

console.log('\n--- REGRA 4: campo vazio não é zero ---');
var so={ventoMax:10};
r=J.verificar(so,{bbch:'99',temp:99,ur:0,vento:6,intervaloDias:999});
ck(r.dentro===true,'declarar só o vento não faz o resto reprovar');
ck(r.achados.length===0,'e nem gera lacuna do que não foi declarado');
ck(J.normalizar({ventoMax:'',bbchMin:'0'}).ventoMax===undefined,'campo em branco não vira 0');
ck(J.normalizar({ventoMax:'0'}).ventoMax===0,'mas zero digitado é zero de verdade');

console.log('\n--- Faixa aberta se lê como faixa aberta ---');
ck(J.resumo({tempMax:30})==='temp até 30 °C','só máximo: "até"');
ck(J.resumo({bbchMin:61})==='BBCH a partir de 61','só mínimo: "a partir de"');
ck(J.resumo({bbchMin:61,bbchMax:69})==='BBCH 61–69','os dois: faixa');
ck(J.resumo(jan).indexOf('—')<0,'nunca aparece travessão de limite inexistente: '+J.resumo(jan));

console.log('\n--- Limite só de um lado confere só aquele lado ---');
ck(J.verificar({tempMax:30},{temp:34}).desvios.length===1,'acima do máximo reprova');
ck(J.verificar({tempMax:30},{temp:5}).desvios.length===0,'abaixo não, porque não há mínimo');
ck(J.verificar({urMin:50},{ur:30}).desvios.length===1,'abaixo do mínimo reprova');
ck(J.verificar({urMin:50},{ur:95}).desvios.length===0,'acima não');

console.log('\n--- Valores em texto com vírgula, como vêm da tela ---');
ck(J.verificar({ventoMax:10},{vento:'12,5'}).desvios.length===1,'"12,5" é lido como número');
ck(J.verificar({ventoMax:10},{vento:'8,5'}).desvios.length===0,'e "8,5" passa');
ck(J.verificar({ventoMax:10},{vento:''}).lacunas.length===1,'string vazia é lacuna, não zero');

console.log('\n--- A normalização guarda só o que foi preenchido ---');
var n=J.normalizar({bbchMin:'61',bbchMax:'',ventoMax:'10',tempMax:'abc'});
ck(n.bbchMin===61 && n.ventoMax===10,'o que veio, veio numérico');
ck(!('bbchMax' in n) && !('tempMax' in n),'o que não veio (ou não é número) não entra');
ck(J.temJanela(n)===true,'e isso é uma janela');
ck(J.temJanela({})===false && J.temJanela(null)===false,'objeto vazio e nulo não são');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
