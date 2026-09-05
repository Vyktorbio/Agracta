/* O merge de aplicações entre aparelhos — app.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * `_mergeAplicacao` devolvia o objeto inteiro do lado mais novo, e só. Numa
 * aplicação isso apaga coisas que não são "versão antiga de um campo": são o
 * registro de algo que aconteceu uma vez e não acontece de novo.
 *
 * O caso real: de manhã, no campo, o técnico carimba o início da aplicação
 * (hora e clima), termina, carimba o fim, e grava a memória de cálculo na
 * calculadora. À tarde, do escritório, alguém corrige a observação. A edição da
 * tarde é mais nova, vence o item inteiro — e leva junto o carimbo de hora, o
 * clima e a MEMÓRIA DE CÁLCULO, que é a prova de quanto produto foi ao tanque.
 *
 * Corrigir uma vírgula apagava a evidência BPL.
 *
 * A outra metade do teste é igualmente importante: os campos que o app apaga DE
 * PROPÓSITO (hora, janela, avisos de consumo) não podem ser ressuscitados por
 * este merge, ou o conserto vira outro defeito.
 *
 * Rodar: node test_aplicacao_merge.js
 */
var fs = require('fs'), vm = require('vm');
var src = fs.readFileSync('./app.js', 'utf8');
function pega(n){
  var i = src.indexOf('function ' + n + '(');
  if (i < 0) throw new Error('não achei ' + n);
  var j = i, d = 0, v = false;
  for (; j < src.length; j++){ if (src[j] === '{'){ d++; v = true; } else if (src[j] === '}'){ d--; if (v && d === 0){ j++; break; } } }
  return src.slice(i, j);
}
function pegaVar(nome){
  var re = new RegExp('^var ' + nome + ' = .*$', 'm');
  var m = re.exec(src);
  if (!m) throw new Error('não achei var ' + nome);
  return m[0];
}
var ctx = { JSON:JSON, Object:Object, Array:Array, String:String, console:console };
vm.createContext(ctx);
vm.runInContext([pegaVar('APL_REGISTROS'), pega('_aplChave'),
                 pega('_mergeMemorias'), pega('_mergeAplicacao')].join('\n'), ctx);

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n){ ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

console.log('\n--- O CASO DO CAMPO: a correção da tarde não apaga a manhã ---');
var doCampo = { id:'ap1', _ts:1000, data:'2026-03-10', obs:'',
  inicio:{hora:'07:12', clima:{vento:6, temp:21}},
  fim:{hora:'09:40', clima:{vento:11, temp:27}},
  memoriaCalculo:{origem:'conferida', calda:1700, motor:'AplicacaoCore'},
  memoriasAnteriores:[{origem:'derivada'}] };
var doEscritorio = { id:'ap1', _ts:2000, data:'2026-03-10', obs:'Aplicado pela manhã' };
var r = ctx._mergeAplicacao(doCampo, doEscritorio);
eq(r.obs, 'Aplicado pela manhã', 'a edição mais nova vence o campo que ela editou');
ck(!!r.inicio && r.inicio.hora === '07:12', 'o carimbo de início sobrevive');
ck(!!r.inicio.clima && r.inicio.clima.vento === 6, 'com o clima que foi medido na hora');
ck(!!r.fim && r.fim.hora === '09:40', 'o carimbo de fim sobrevive');
ck(!!r.memoriaCalculo && r.memoriaCalculo.calda === 1700,
   'a MEMÓRIA DE CÁLCULO sobrevive — é a prova de quanto foi ao tanque');
eq((r.memoriasAnteriores||[]).length, 1, 'e a trilha de memórias anteriores também');

console.log('\n--- E o inverso: a edição do campo chegando depois ---');
/* A simetria importa: o registro não pode depender de qual lado é "o local". */
var r2 = ctx._mergeAplicacao(doEscritorio, doCampo);
ck(!!r2.inicio && !!r2.fim && !!r2.memoriaCalculo,
   'trocando os lados, os registros continuam todos lá');

console.log('\n--- Quem tem o registro mais novo mantém o dele ---');
var novoCarimbo = { id:'ap1', _ts:3000, inicio:{hora:'08:00'}, memoriaCalculo:{calda:2000} };
var velhoCarimbo = { id:'ap1', _ts:1000, inicio:{hora:'07:12'}, memoriaCalculo:{calda:1700} };
var r3 = ctx._mergeAplicacao(velhoCarimbo, novoCarimbo);
eq(r3.inicio.hora, '08:00', 'o carimbo do lado mais novo vence — herdar é para quem NÃO tem');
eq(r3.memoriaCalculo.calda, 2000, 'e a memória corrente é a do lado mais novo');
eq((r3.memoriasAnteriores||[]).length, 1, 'mas a memória do outro lado não some: vira histórico');
eq(r3.memoriasAnteriores[0].calda, 1700, 'e é a que foi substituída');
/* É a mesma regra que a gravação local já segue: "regravar não apaga o
   anterior, a memória antiga vira histórico". Cálculo conferido por alguém não
   é descartado porque o outro aparelho refez o dele depois. */

console.log('\n--- Memória igual dos dois lados não vira histórico duplicado ---');
var igual = ctx._mergeAplicacao(
  { id:'a', _ts:1, memoriaCalculo:{calda:1700} },
  { id:'a', _ts:2, memoriaCalculo:{calda:1700} });
eq((igual.memoriasAnteriores||[]).length, 0, 'a mesma memória dos dois lados não gera histórico nenhum');
var mesmaOutraOrdem = ctx._mergeAplicacao(
  { id:'a', _ts:1, memoriaCalculo:{calda:1700, motor:'X'} },
  { id:'a', _ts:2, memoriaCalculo:{motor:'X', calda:1700} });
eq((mesmaOutraOrdem.memoriasAnteriores||[]).length, 0,
   'e a ordem das chaves não faz duas memórias iguais parecerem diferentes');

console.log('\n--- A trilha não repete o que já está nela ---');
var t = ctx._mergeAplicacao(
  { id:'a', _ts:1, memoriasAnteriores:[{v:1},{v:2}] },
  { id:'a', _ts:2, memoriasAnteriores:[{v:2},{v:3}] });
eq(t.memoriasAnteriores.length, 3, 'a união traz as três, sem repetir a que os dois tinham');

console.log('\n--- O QUE O APP APAGA DE PROPÓSITO NÃO PODE RESSUSCITAR ---');
/* hora, janela e consumoAvisos são removidos deliberadamente quando deixam de
   valer (`delete ap.hora`, `delete ap.janela`). Herdá-los seria desfazer uma
   decisão do usuário — o conserto viraria outro defeito. */
var comExtras = { id:'a', _ts:1, hora:'07:00',
                  janela:{dentro:false, justificativa:'chuva'},
                  consumoAvisos:['sobrou calda'] };
var semExtras = { id:'a', _ts:2 };
var r4 = ctx._mergeAplicacao(comExtras, semExtras);
eq(r4.hora, undefined, 'hora apagada continua apagada');
eq(r4.janela, undefined, 'janela apagada continua apagada');
eq(r4.consumoAvisos, undefined, 'aviso de consumo apagado continua apagado');
ck(ctx.APL_REGISTROS.indexOf('hora') < 0 && ctx.APL_REGISTROS.indexOf('janela') < 0,
   'e eles não estão na lista de registros herdáveis, por escrito');

console.log('\n--- O merge não estraga os objetos que recebe ---');
/* O chamador continua usando os dois lados depois. Mutar a entrada aqui daria
   um bug que só aparece na segunda sincronização. */
var A = { id:'a', _ts:1, inicio:{hora:'07:00'} };
var B = { id:'a', _ts:2, obs:'x' };
var antes = JSON.stringify(B);
ctx._mergeAplicacao(A, B);
eq(JSON.stringify(B), antes, 'o lado vencedor volta intacto');
eq(JSON.stringify(A), '{"id":"a","_ts":1,"inicio":{"hora":"07:00"}}', 'e o perdedor também');

console.log('\n--- Empate e ausência de carimbo: o local vence, como sempre foi ---');
var e1 = ctx._mergeAplicacao({id:'a', _ts:5, obs:'local'}, {id:'a', _ts:5, obs:'nuvem'});
eq(e1.obs, 'local', 'empate no carimbo: o local vence (comportamento antigo, preservado)');
var e2 = ctx._mergeAplicacao({id:'a', obs:'local'}, {id:'a', obs:'nuvem'});
eq(e2.obs, 'local', 'sem carimbo nenhum, idem');
var e3 = ctx._mergeAplicacao({id:'a', obs:'local'}, {id:'a', _ts:9, obs:'nuvem'});
eq(e3.obs, 'nuvem', 'com carimbo só de um lado, esse lado vence');

console.log('\n--- Entradas ausentes não estouram ---');
eq(ctx._mergeAplicacao(null, {id:'a'}).id, 'a', 'só a nuvem: devolve a nuvem');
eq(ctx._mergeAplicacao({id:'a'}, null).id, 'a', 'só o local: devolve o local');
eq(ctx._mergeAplicacao(null, null), null, 'nenhum dos dois: null, sem estourar');
[[{}, {}], [{_ts:1}, {}], [{memoriasAnteriores:null}, {memoriasAnteriores:'lixo'}],
 [{memoriaCalculo:null}, {memoriaCalculo:undefined}]].forEach(function (par, i) {
  try { ctx._mergeAplicacao(par[0], par[1]); ck(true, 'par malformado #' + (i+1) + ' não derruba o merge'); }
  catch (e) { ck(false, 'par malformado #' + (i+1) + ' derrubou: ' + e.message); }
});

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
