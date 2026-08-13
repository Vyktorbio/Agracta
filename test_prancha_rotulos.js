/* Rótulos da prancha: unidade do tempo e linha de identificação.
 *
 * Duas coisas que uma figura de relatório não pode errar:
 *
 *   MOMENTO — em bancada a leitura é a 2, 24, 36, 48, 72 horas. O eixo guardava
 *   sempre DIAS (é o que a AACPD integra), e o rótulo saía "0,1 DAA" onde a
 *   leitura foi "2 HAT". São informações diferentes; quem escolhe é o autor.
 *
 *   NOME CIENTÍFICO — nomenclatura binominal vai em itálico. Em redondo, a
 *   figura volta da revisão de qualquer periódico.
 *
 * Rodar: node test_prancha_rotulos.js
 */
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync('prancha.html', 'utf8');

/* pega uma função nomeada do <script> da página — mesma ideia dos outros testes
   com app.js. Declaração fecha na chave; const-arrow fecha no ponto e vírgula de
   nível zero (há arrow sem corpo em chaves, como o txtRuns). */
function pega(nome){
  var i = html.indexOf('function ' + nome + '(');
  if(i >= 0){
    var j = i, d = 0, viu = false;
    for(; j < html.length; j++){
      if(html[j] === '{'){ d++; viu = true; }
      else if(html[j] === '}'){ d--; if(viu && d === 0){ j++; break; } }
    }
    return html.slice(i, j);
  }
  i = html.indexOf('const ' + nome + ' =');
  if(i < 0) throw new Error('não achei ' + nome);
  var k = i, prof = 0;
  for(; k < html.length; k++){
    var c = html[k];
    if(c === '{' || c === '(' || c === '[') prof++;
    else if(c === '}' || c === ')' || c === ']') prof--;
    else if(c === ';' && prof === 0){ k++; break; }
  }
  return html.slice(i, k);
}

var ctx = { console: console, Math: Math, String: String, Number: Number, Array: Array, Object: Object };
vm.createContext(ctx);
vm.runInContext(
  /* dublês do que a página fornece */
  'var estado = {idioma:"pt", unidade:"auto", ident:{mostrar:1}};\n' +
  'var DAA = [], MOM = null, ESTUDO = {};\n' +
  'var APLREF = {pt:"da aplicação", en:"application"};\n' +
  'var E = function(){ return ESTUDO[estado.idioma] || {}; };\n' +
  'var esc = function(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };\n' +
  'var txt = function(x,y,s,o){ o=o||{}; return "<text>" + (o.raw ? s : esc(s)) + "</text>"; };\n' +
  pega('numRot') + '\n' + pega('rotMom') + '\n' + pega('rotEixoTempo') + '\n' +
  pega('txtRuns') + '\n' + pega('identRuns') + '\n' +
  /* const é ligação léxica: não vira propriedade do contexto sozinha */
  'var _rotMom = rotMom, _txtRuns = txtRuns;\n', ctx);
ctx.rotMom = ctx._rotMom;
ctx.txtRuns = ctx._txtRuns;

var f = 0, p = 0;
function ck(c, n){ if(c){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }

/* Bancada: 2 h, 24 h e 48 h guardados EM DIAS, como o app manda. */
function bancada(){
  vm.runInContext('DAA = [2/24, 1, 2]; MOM = ["2 HAT","24 HAT","48 HAT"]; estado.unidade = "auto"; estado.idioma = "pt";', ctx);
}

console.log('Unidade do tempo — o autor escolhe, e tudo acompanha');
bancada();
ck(ctx.rotMom(0) === '2 HAT', 'auto respeita o momento declarado na avaliação');
ck(ctx.rotEixoTempo() === 'Horas depois da aplicação', 'auto detecta HAT e o eixo fala em horas');

vm.runInContext('estado.unidade = "DAA";', ctx);
ck(ctx.rotMom(0) === '0,1 DAA', 'em DAA, 2 horas viram 0,1 dia — que é o motivo de existir a escolha');
ck(ctx.rotMom(2) === '2 DAA', 'e o inteiro não ganha casa decimal à toa');
ck(ctx.rotEixoTempo() === 'Dias depois da aplicação', 'o eixo volta a falar em dias');

vm.runInContext('estado.unidade = "HAT";', ctx);
ck(ctx.rotMom(0) === '2 HAT',  '2 horas');
ck(ctx.rotMom(1) === '24 HAT', '24 horas');
ck(ctx.rotMom(2) === '48 HAT', '48 horas');
ck(ctx.rotEixoTempo() === 'Horas depois da aplicação', 'e o eixo em horas');

vm.runInContext('estado.unidade = "DAT";', ctx);
ck(ctx.rotMom(2) === '2 DAT', 'DAT = dias após o tratamento');

vm.runInContext('estado.unidade = "HAT"; estado.idioma = "en";', ctx);
ck(ctx.rotEixoTempo() === 'Hours after application', 'em inglês, HAT também serve');
vm.runInContext('estado.unidade = "DAA";', ctx);
ck(ctx.rotMom(0) === '0.1 DAA', 'em inglês o decimal é ponto, não vírgula');

console.log('Campo sem momento declarado: nada muda');
vm.runInContext('DAA = [7,14,21]; MOM = null; estado.unidade = "auto"; estado.idioma = "pt";', ctx);
ck(ctx.rotMom(0) === '7 DAA', 'segue "7 DAA", como sempre foi');
ck(ctx.rotEixoTempo() === 'Dias depois da aplicação', 'e o eixo em dias');

console.log('Linha de identificação — o científico em itálico');
vm.runInContext(
  'ESTUDO = {codigo:"PL-2026-0210", alvo:"Ferrugem asiática", alvoSci:"Phakopsora pachyrhizi",' +
  ' variedade:"BMX Potência", plantio:"12/05/2026", pt:{cultura:"Soja"}, en:{cultura:"Soybean"}};', ctx);
var linha = ctx.txtRuns(0, 0, ctx.identRuns(), {});
ck(linha.indexOf('<tspan font-style="italic">Phakopsora pachyrhizi</tspan>') >= 0,
   'o nome científico sai em itálico');
ck(linha.indexOf('Ferrugem asiática (') >= 0, 'o nome comum vem antes, e o científico entre parênteses');
ck(linha.indexOf('Estudo PL-2026-0210') >= 0, 'o código do estudo entra');
ck(linha.indexOf('Soja') >= 0 && linha.indexOf('BMX Potência') >= 0, 'cultura e variedade entram');
ck(linha.indexOf('Plantio: 12/05/2026') >= 0, 'e a data de plantio');

console.log('Sem nome comum, o científico assume — e continua em itálico');
vm.runInContext('ESTUDO.alvo = "";', ctx);
var so = ctx.txtRuns(0, 0, ctx.identRuns(), {});
ck(so.indexOf('<tspan font-style="italic">Phakopsora pachyrhizi</tspan>') >= 0, 'itálico mantido');
ck(so.indexOf('(') < 0, 'sem parênteses sobrando');

console.log('Sem científico, nada de itálico vazio');
vm.runInContext('ESTUDO.alvo = "Ferrugem asiática"; ESTUDO.alvoSci = "";', ctx);
var sem = ctx.txtRuns(0, 0, ctx.identRuns(), {});
ck(sem.indexOf('tspan') < 0, 'nenhum tspan quando não há nome científico');
ck(sem.indexOf('Alvo: Ferrugem asiática') >= 0, 'e o alvo sai normalmente');

console.log('Campos vazios simplesmente não aparecem');
vm.runInContext('ESTUDO = {codigo:"X1", pt:{}, en:{}};', ctx);
var mag = ctx.txtRuns(0, 0, ctx.identRuns(), {});
ck(mag.indexOf('|') < 0, 'sem separador solto quando só há o código');
ck(mag.indexOf('Estudo X1') >= 0, 'o código continua lá');

console.log('O NOME da variável decide: medida ou alvo');
/* Os dois classificadores saem do próprio arquivo, não de uma cópia. */
function pegaRegex(nome){
  var i = html.indexOf('const ' + nome + ' = /');
  if(i < 0) throw new Error('não achei ' + nome);
  var ini = html.indexOf('/', html.indexOf('=', i));
  var j = ini + 1, esc = false;
  for(; j < html.length; j++){
    if(esc){ esc = false; continue; }
    if(html[j] === '\\'){ esc = true; continue; }
    if(html[j] === '/') break;
  }
  var flags = html.slice(j+1).match(/^[a-z]*/)[0];
  return new RegExp(html.slice(ini+1, j), flags);
}
var MEDIDAS = pegaRegex('_MEDIDAS'), MED_DOENCA = pegaRegex('_MED_DOENCA');
var ehMedida = function(n){ return MEDIDAS.test(n); };
var ehDoenca = function(n){ return !ehMedida(n) || MED_DOENCA.test(n); };

/* MEDIDAS — o nome já diz o que foi medido, então o rótulo é ele mesmo */
['Mortalidade','Insetos mortos','Eficácia','Incidência','Fitotoxicidade',
 'Inibição do crescimento micelial','Diâmetro da colônia (mm)','Produtividade',
 'Stand de plantas','Nº de lesões','Severidade'].forEach(function(n){
  ck(ehMedida(n), '"'+n+'" é medida — o rótulo é o próprio nome');
});
/* ALVOS — nomeiam a doença; o que se mede nela é a severidade */
['Mancha angular','Ferrugem asiática','Cercospora','Antracnose','Oídio'].forEach(function(n){
  ck(!ehMedida(n), '"'+n+'" é alvo — vira "Severidade de '+n+'"');
});

console.log('E "progresso da DOENÇA" só cabe quando a figura é de doença');
ck(ehDoenca('Mancha angular'),  'alvo: curva de progresso da doença');
ck(ehDoenca('Severidade'),      'severidade: idem');
ck(ehDoenca('Incidência'),      'incidência também é medida de doença');
ck(ehDoenca('Nº de lesões'),    'lesão idem');
ck(!ehDoenca('Mortalidade'),    'mortalidade NÃO: vira "curva de mortalidade no tempo"');
ck(!ehDoenca('Eficácia'),       'eficácia NÃO');
ck(!ehDoenca('Produtividade'),  'produtividade NÃO');
ck(!ehDoenca('Diâmetro da colônia (mm)'), 'diâmetro de colônia NÃO');

console.log('IC 95% usa t de Student, não "±2 erros padrão"');
vm.runInContext(pega('_T95') + '\n' + pega('t95') + '\nvar _t95 = t95;\n', ctx);
var t95 = ctx._t95;
/* valores de tabela — se alguém mexer no array, o teste pega */
ck(Math.abs(t95(3)  - 3.182) < 0.001, '3 gl -> 3,182');
ck(Math.abs(t95(4)  - 2.776) < 0.001, '4 gl -> 2,776  (o caso de 4 blocos)');
ck(Math.abs(t95(9)  - 2.262) < 0.001, '9 gl -> 2,262');
ck(Math.abs(t95(30) - 2.042) < 0.001, '30 gl -> 2,042');
ck(t95(60) === 1.96,  'acima de 30 gl cai na normal, 1,96');
ck(t95(0)  === 1.96,  'gl inválido não devolve undefined');
ck(t95(3) > t95(10) && t95(10) > t95(30),
   'e o t encolhe conforme os graus de liberdade crescem — o sentido certo');
/* o erro clássico: usar 2 no lugar de t. Com 4 blocos (3 gl) o IC sairia 36% menor. */
ck(Math.abs(t95(3)/2 - 1.59) < 0.02,
   'com 3 gl, usar "2" no lugar do t subestimaria o IC em ~37%');

console.log('Ordem dos tratamentos na figura');
var ctxO = { console: console, Math: Math, Object: Object, String: String, Array: Array,
             Number: Number, isFinite: isFinite, parseFloat: parseFloat, Infinity: Infinity };
vm.createContext(ctxO);
vm.runInContext(
  /* 5 tratamentos: T1 testemunha. Eficácia e leitura crescem de T2 a T5;
     a dose vai ao contrário, para as duas ordens não coincidirem por acaso. */
  'var _TRAT0 = [{id:"T1",testemunha:true,dose:0},{id:"T2",dose:0.9},{id:"T3",dose:0.7},' +
  '              {id:"T4",dose:0.5},{id:"T5",dose:0.3}];\n' +
  'var EFIC = [0, 40, 60, 80, 95];\n' +
  'var mSEV = [[5],[45],[65],[85],[97]];\n' +
  'var MENOS_MELHOR = false;\n' +           /* mortalidade: maior é melhor */
  'var estado = {sel:{ordem:"cadastro", manual:null, aval:-1}};\n' +
  'var DAA = [1];\n' +
  'function avalIdx(){ return 0; }\n' +
  pega('ordenaIdx') + '\n', ctxO);
var todos = [0,1,2,3,4];
var ids = v => v.map(function(i){ return ctxO._TRAT0[i].id; }).join(',');

ck(ids(ctxO.ordenaIdx(todos)) === 'T1,T2,T3,T4,T5', 'cadastro: como vieram');
vm.runInContext('estado.sel.ordem="efic";', ctxO);
ck(ids(ctxO.ordenaIdx(todos)) === 'T5,T4,T3,T2,T1', 'por eficácia: melhor primeiro, testemunha por último');
vm.runInContext('estado.sel.ordem="medida";', ctxO);
ck(ids(ctxO.ordenaIdx(todos)) === 'T5,T4,T3,T2,T1', 'pela leitura: em mortalidade, a MAIOR primeiro');
vm.runInContext('MENOS_MELHOR = true; estado.sel.ordem="medida";', ctxO);
ck(ids(ctxO.ordenaIdx(todos)) === 'T1,T2,T3,T4,T5', 'em dano/doença inverte: a MENOR primeiro');
vm.runInContext('MENOS_MELHOR = false; estado.sel.ordem="dose";', ctxO);
ck(ids(ctxO.ordenaIdx(todos)) === 'T1,T5,T4,T3,T2', 'por dose, da menor para a maior');
vm.runInContext('estado.sel.ordem="manual"; estado.sel.manual=["T3","T1","T5","T2","T4"];', ctxO);
ck(ids(ctxO.ordenaIdx(todos)) === 'T3,T1,T5,T2,T4', 'manual: exatamente a ordem que ele montou');
/* escondendo o T3 (índice 2), a ordem manual vale no que sobrou: T1,T5,T2,T4 */
ck(ids(ctxO.ordenaIdx([0,1,3,4])) === 'T1,T5,T2,T4', 'e continua valendo quando um tratamento sai da figura');
vm.runInContext('estado.sel.manual=["T3"];', ctxO);
ck(ctxO.ordenaIdx(todos).length === 5, 'ordem manual incompleta não perde tratamento nenhum');

console.log('');
console.log(p + ' ok, ' + f + ' falha(s)');
process.exit(f ? 1 : 0);
