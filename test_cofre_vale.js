/* "Tem alguma coisa aqui?" — meaningful(), em firebase-sync.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Esta função responde uma pergunta só, e a resposta decide se um estado é
 * PRESERVADO ou ATROPELADO. Ela olhava estudos, cultura, itens, notas e
 * randomizações — e não olhava o mapa. Quadras desenhadas, locais cadastrados,
 * imagem georreferenciada: um dia inteiro desenhando a fazenda contava como
 * NADA.
 *
 * Isso quebrava em três lugares, e o terceiro apagava dado de verdade:
 *
 *   1. O app não abria offline para quem tinha só o mapa no aparelho.
 *   2. A restauração do cofre era pulada e o app abria vazio.
 *   3. Na primeira sincronização depois do login, se a NUVEM tivesse só o mapa,
 *      o merge era PULADO e o estado local subia por cima — e queueOps apaga da
 *      nuvem tudo que estava no snapshot lido e não está no local. As quadras do
 *      colega desapareciam, sem aviso e sem volta pelo app.
 *
 * Rodar: node test_cofre_vale.js
 */
var fs = require('fs'), vm = require('vm');
var src = fs.readFileSync('./firebase-sync.js', 'utf8');
function pega(n){
  var i = src.indexOf('function ' + n + '(');
  if (i < 0) throw new Error('não achei ' + n);
  var j = i, d = 0, v = false;
  for (; j < src.length; j++){ if (src[j] === '{'){ d++; v = true; } else if (src[j] === '}'){ d--; if (v && d === 0){ j++; break; } } }
  return src.slice(i, j);
}
var ctx = { Object:Object, Array:Array, JSON:JSON, console:console };
vm.createContext(ctx);
vm.runInContext(pega('meaningful'), ctx);
var vale = ctx.meaningful;

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }

console.log('\n--- O TRABALHO DE MAPA CONTA ---');
ck(vale({ qgeo:{ q1:[[-22.58,-47.52],[-22.59,-47.53],[-22.58,-47.54]] } }),
   'uma quadra desenhada já é trabalho — ninguém redesenha um talhão de cabeça');
ck(vale({ qgeo:{ q1:[], q2:[] } }), 'quadras registradas contam mesmo sem vértices gravados ainda');
ck(vale({ georef:{ corners:[[1,1],[2,2],[3,3],[4,4]] } }),
   'a imagem georreferenciada conta — alinhar mapa leva tempo');
ck(vale({ locais:{ a:{nome:'Iracemápolis'}, b:{nome:'Picolini'} } }),
   'mais de um local cadastrado conta');

console.log('\n--- O CASO DO RELATO: um dia de mapa, nenhum estudo ---');
var soMapa = {
  data:{ q1:{cultura:'', cultivar:'', plantio:'', area:null, estudos:[]},
         q2:{cultura:'', cultivar:'', plantio:'', area:null, estudos:[]} },
  qgeo:{ q1:[[-22.58,-47.52]], q2:[[-22.60,-47.52]] },
  locais:{ loc1:{nome:'Iracemápolis'}, loc2:{nome:'Picolini'} },
  notas_campo:[], randomizacoes:[], itens:{}
};
ck(vale(soMapa), 'duas quadras desenhadas e dois locais: isto É alguma coisa');
/* É esta resposta que faz o merge acontecer em vez de o local subir por cima.
   Com false aqui, as quadras da nuvem eram apagadas por quem sincronizasse
   depois com um estado "mais cheio". */

console.log('\n--- A lista de autorizados é trabalho, e perdê-la tira o acesso das pessoas ---');
ck(vale({ data:{ __config:{ allowedUsers:[{email:'a@b.c'}] } } }),
   'ter alguém autorizado conta');
ck(!vale({ data:{ __config:{ allowedUsers:[], adminEmail:'x@y.z', adminPassword:'hash' } } }),
   'mas o __config semeado sozinho, sem ninguém autorizado, continua não contando');

console.log('\n--- O que já contava continua contando ---');
ck(vale({ data:{ q1:{ estudos:[{id:'s1'}] } } }), 'um estudo criado');
ck(vale({ data:{ q1:{ cultura:'Soja', estudos:[] } } }), 'a cultura declarada');
ck(vale({ data:{ q1:{ cultivar:'BRS 284', estudos:[] } } }), 'a cultivar');
ck(vale({ data:{ q1:{ plantio:'2026-01-10', estudos:[] } } }), 'a data de plantio');
ck(vale({ itens:{ i1:{nome:'Folicur'} } }), 'um item no banco');
ck(vale({ notas_campo:[{id:'n1'}] }), 'uma nota de campo');
ck(vale({ randomizacoes:[{id:'r1'}] }), 'uma randomização guardada');

console.log('\n--- E o VAZIO continua vazio: o guarda não virou "sim para tudo" ---');
/* Esta metade importa tanto quanto a outra. Se meaningful passasse a dizer sim
   para qualquer coisa, um estado em branco poderia atropelar um cheio. */
ck(!vale(null), 'nulo não é nada');
ck(!vale(undefined), 'indefinido não é nada');
ck(!vale({}), 'objeto vazio não é nada');
ck(!vale({ data:{}, qgeo:{}, locais:{}, itens:{}, notas_campo:[], randomizacoes:[] }),
   'estado zerado de verdade continua sendo nada');
ck(!vale({ data:{ q1:{cultura:'', cultivar:'', plantio:'', area:null, estudos:[]} }, qgeo:{}, locais:{} }),
   'quadra registrada sem geometria, sem cultura e sem estudo: ainda nada');
ck(!vale({ locais:{ so:{nome:'Local principal'} } }),
   'o ÚNICO local padrão, criado sozinho pelo app, não é trabalho de ninguém');
ck(!vale({ georef:{} }), 'georreferência sem cantos não conta');
ck(!vale({ georef:{ corners:[] } }), 'nem com a lista de cantos vazia');
ck(!vale({ data:{ __config:{} } }), '__config vazio não conta');

console.log('\n--- Estado estragado não derruba a decisão ---');
[{qgeo:null}, {locais:null}, {georef:null}, {data:null}, {data:{q1:null}},
 {data:{__config:null}}, {itens:null}, {notas_campo:null}, {randomizacoes:null},
 {georef:{corners:null}}, {data:{__config:{allowedUsers:null}}}].forEach(function (mau, i) {
  try { vale(mau); ck(true, 'estado malformado #' + (i+1) + ' não estoura'); }
  catch (e) { ck(false, 'estado malformado #' + (i+1) + ' derrubou: ' + e.message); }
});

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
