/* Bioensaio de bancada: a análise é da AVALIAÇÃO, não da AACPD.
 *
 * A folha de mortalidade rodava ANOVA sobre √(AACPD) e decorava as barras com
 * as letras vindas dali. A figura dizia "mortalidade a 48 HAT" e o teste era de
 * outra coisa: a área sob a curva de knockdown, que não é resultado de nada —
 * mortalidade a 24 h é a leitura daquela hora, não um acumulado que se integre.
 *
 * E havia um erro de sinal escondido no caminho de avaliação única: as letras
 * saíam com `crescente = true` cravado, ou seja, a letra "a" ia para a MENOR
 * média. Num bioensaio isso premia quem menos matou.
 *
 * O que estes testes seguram:
 *   - sentido 'maior' analisa a avaliação em foco (ANOVA, DMS, Tukey, Abbott);
 *   - a letra "a" vai para quem MAIS matou;
 *   - trocar a avaliação em foco refaz a análise;
 *   - em dano/doença NADA disso muda: continua a AACPD do ensaio inteiro.
 *
 * Rodar: node test_bioensaio_por_data.js
 */
var fs = require('fs'), vm = require('vm');
var Est = require('./estatistica.js');
var html = fs.readFileSync('prancha.html', 'utf8');

function pega(nome){
  var i = html.indexOf('function ' + nome + '(');
  if(i < 0) throw new Error('não achei ' + nome);
  var j = i, d = 0, viu = false;
  for(; j < html.length; j++){
    if(html[j] === '{'){ d++; viu = true; }
    else if(html[j] === '}'){ d--; if(viu && d === 0){ j++; break; } }
  }
  return html.slice(i, j);
}

/* Monta o pedaço da prancha que decide a análise, com os dados do ensaio. */
function monta(sentido, SEV, DAA){
  var ctx = { console: console, Math: Math, Est: Est, Number: Number, Array: Array, Object: Object, String: String };
  vm.createContext(ctx);
  vm.runInContext(
    'var SEV = ' + JSON.stringify(SEV) + ';\n' +
    'var DAA = ' + JSON.stringify(DAA) + ';\n' +
    'var BLOCOS = [1,2,3,4];\n' +
    'var TRAT = ' + JSON.stringify(SEV.map(function(_,i){ return {id:'T'+(i+1), testemunha:i===0}; })) + ';\n' +
    'var SENT = "' + sentido + '";\n' +
    'var MENOS_MELHOR = (SENT !== "maior");\n' +
    'var UMA = DAA.length < 2;\n' +
    'var POR_DATA = UMA || SENT === "maior";\n' +
    'var _iT0 = 0;\n' +
    'var _md = function(v){ return v.reduce(function(a,b){return a+b;},0)/v.length; };\n' +
    'var _mSEV0 = TRAT.map(function(_,i){ return DAA.map(function(_,d){ return _md(BLOCOS.map(function(_,b){ return SEV[i][b][d]; })); }); });\n' +
    'var _efic1 = function(m, mT){ return SENT === "maior"\n' +
    '  ? ((mT < 100) ? 100*(m - mT)/(100 - mT) : null)\n' +
    '  : ((mT > 0) ? 100*(mT - m)/mT : null); };\n' +
    'var _lanc = [];\n' +
    'TRAT.forEach(function(t,i){ BLOCOS.forEach(function(b,j){ DAA.forEach(function(d,k){\n' +
    '  _lanc.push({trat:t.id, bloco:b, tempo:d, valor:SEV[i][j][k]}); }); }); });\n' +
    pega('analiseNaData') + '\n' + pega('analiseAACPD') + '\n', ctx);
  return ctx;
}

var f = 0, p = 0;
function ck(c, n){ if(c){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
var r1 = function(x){ return x == null ? null : Math.round(x*10)/10; };

/* Bancada: 4 tratamentos × 4 blocos, leituras a 2, 24 e 48 HAT (em dias).
   A testemunha quase não mata; a ordem dos produtos MUDA entre 2 h e 48 h —
   é justamente por isso que a avaliação analisada tem de ser escolhida. */
var MORT = [
  [[2,3,5],[2,3,5],[3,4,6],[2,4,5]],        /* T1 testemunha */
  [[30,60,86],[31,62,88],[29,59,85],[32,63,89]],
  [[8,70,94],[9,71,95],[7,69,93],[10,72,96]],
  [[45,50,60],[46,51,61],[44,49,59],[47,52,62]]
];
var HORAS = [2/24, 1, 2];

console.log('Mortalidade: a análise segue a avaliação em foco');
var M = monta('maior', MORT, HORAS);
ck(M.POR_DATA === true, 'sentido maior analisa por data, não pela AACPD');

var a2  = M.analiseNaData(0);
var a48 = M.analiseNaData(2);
ck(a2.mediaAACPD.map(r1).join(',') === '2.3,30.5,8.5,45.5', 'a 2 HAT, as médias são as da leitura de 2 h');
ck(a48.mediaAACPD.map(r1).join(',') === '5.3,87,94.5,60.5', 'a 48 HAT, as da leitura de 48 h');
ck(a2.anova.F !== a48.anova.F, 'a ANOVA é outra em cada avaliação');
ck(a2.dms !== a48.dms, 'e a DMS também');

console.log('A letra "a" vai para quem MAIS matou');
/* a 2 HAT o melhor é T4 (45,5%); a 48 HAT passa a ser T3 (94,5%) */
ck(a2.letras[3] === 'a',  'a 2 HAT, T4 é o "a" — foi quem mais matou naquela hora');
ck(a2.letras[0] !== 'a',  'e a testemunha não é "a"');
ck(a48.letras[2] === 'a', 'a 48 HAT o "a" muda de dono: T3 assume');
ck(a48.letras[0] !== 'a', 'a testemunha segue sem ser "a"');

console.log('Abbott corrigido, positivo e limitado a 100%');
/* T2 a 48 HAT: (87 − 5,3125)/(100 − 5,3125) × 100 = 86,27% */
ck(Math.abs(a48.eficacia[1] - 86.27) < 0.05, 'T2 a 48 HAT = 86,3% de eficácia');
ck(a48.eficacia.slice(1).every(function(e){ return e > 0 && e <= 100; }),
   'nenhuma eficácia negativa nem acima de 100%');
ck(a48.eficacia[0] === null, 'a testemunha não tem eficácia contra si mesma');

console.log('Avaliação única: o erro de sinal que premiava quem menos matou');
var U = monta('maior', [[[4],[4],[5],[3]], [[35],[36],[34],[35]], [[62],[63],[61],[62]], [[91],[92],[90],[91]]], [2]);
var u = U.analiseNaData(0);
ck(U.UMA === true && U.POR_DATA === true, 'uma avaliação só continua sendo análise por data');
ck(u.letras[3] === 'a', 'quem matou 91% recebe "a"');
ck(u.letras[0] !== 'a', 'quem matou 4% não recebe "a"');
ck(Math.abs(u.eficacia[3] - 90.6) < 0.1, 'e a eficácia é 90,6%');

console.log('Doença: nada muda — segue a AACPD do ensaio inteiro');
var SEVD = [
  [[12,28,46],[12,28,46],[13,29,47],[11,27,45]],
  [[4,9,15],[4,9,15],[5,10,16],[3,8,14]],
  [[2,5,9],[2,5,9],[3,6,10],[1,4,8]],
  [[7,17,29],[7,17,29],[8,18,30],[6,16,28]]
];
var D = monta('menor', SEVD, [7,14,21]);
ck(D.POR_DATA === false, 'sentido menor com várias datas NÃO vira análise por data');
var d = D.analiseAACPD();
ck(d.mediaAACPD[0] > d.mediaAACPD[1], 'a testemunha tem a maior AACPD');
ck(d.letras[2] === 'a', 'e a letra "a" vai para a MENOR severidade — o melhor fungicida');
ck(d.eficacia.slice(1).every(function(e){ return e > 0; }), 'as eficácias saem positivas');
/* T2: (399 − 129,5)/399 × 100 = 67,5% */
ck(Math.abs(d.eficacia[1] - 67.5) < 0.2, 'T2 = 67,5% de controle sobre a AACPD');

console.log('A cascata: o padrão vem do tipo, mas quem manda é o autor');
function cascata(sentido, tipoEstudo, nDatas, ehLab){
  var ctx = { console: console, Math: Math, Object: Object, String: String };
  vm.createContext(ctx);
  vm.runInContext(
    'var SENT = "' + sentido + '";\n' +
    'var LAB = ' + (!!ehLab) + ';\n' +
    'var UMA = ' + (nDatas < 2) + ';\n' +
    'var ESTUDO = {tipoEstudo:"' + tipoEstudo + '"};\n' +
    'var estado = {ensaio:"auto", base:"auto"};\n' +
    pega('presetAtual') + '\n' + pega('baseAnalise') + '\n' +
    pega('baseEficacia') + '\n' + pega('porData') + '\n' +
    /* PRESETS e o mapa de tipos são literais: copiados do arquivo */
    html.slice(html.indexOf('const PRESETS = {'), html.indexOf('function presetAtual()')).replace(/const /g, 'var ') + '\n',
    ctx);
  return ctx;
}
var cM = cascata('maior', 'Mortalidade', 3);
ck(cM.PRESET_DETECTADO === 'mortalidade', 'estudo cadastrado como Mortalidade detecta bioensaio');
ck(cM.baseAnalise() === 'data',   'e o padrão é analisar a avaliação');
ck(cM.baseEficacia() === 'data',  'com Abbott corrigido sobre ela');

vm.runInContext('estado.base = "aacpd";', cM);
ck(cM.baseAnalise() === 'aacpd',  'o autor pode pedir a ANOVA sobre a AACPD');
ck(cM.baseEficacia() === 'data',  'mas a eficácia NÃO segue: Abbott corrigido exige valor limitado a 100%');

var cD = cascata('menor', 'Eficácia', 3);
ck(cD.PRESET_DETECTADO === 'doenca', 'estudo de eficácia em campo detecta doença');
ck(cD.baseAnalise() === 'aacpd',  'e o padrão é a AACPD do ensaio inteiro');
ck(cD.baseEficacia() === 'aacpd', 'com a redução de Abbott sobre ela');
vm.runInContext('estado.base = "data";', cD);
ck(cD.baseEficacia() === 'data',  'em doença a eficácia PODE seguir para a avaliação, se ele pedir');

var cU = cascata('menor', 'Eficácia', 1);
ck(cU.baseAnalise() === 'data', 'com uma avaliação só, a AACPD não existe e a base é a data');
vm.runInContext('estado.base = "aacpd";', cU);
ck(cU.baseAnalise() === 'data', 'e nem pedindo dá para escolher AACPD onde não há curva');

var cSem = cascata('maior', '', 3);
ck(cSem.PRESET_DETECTADO === 'mortalidade',
   'sem tipo cadastrado, o sentido "maior" ainda entrega o palpite certo');

console.log('Bancada: a AACPD deixa de ser opção — ela não existe ali');
var cLab = cascata('maior', 'Mortalidade', 3, true);
ck(cLab.baseAnalise() === 'data', 'no laboratório a base é sempre a avaliação');
vm.runInContext('estado.base = "aacpd";', cLab);
ck(cLab.baseAnalise() === 'data',
   'e nem pedindo AACPD ela entra: integrar knockdown não produz resultado');
/* no campo, a mesma variável de sentido maior AINDA permite a escolha */
var cCampo = cascata('maior', 'Mortalidade', 3, false);
vm.runInContext('estado.base = "aacpd";', cCampo);
ck(cCampo.baseAnalise() === 'aacpd',
   'no campo a escolha continua sendo do autor');

console.log('');
console.log(p + ' ok, ' + f + ' falha(s)');
process.exit(f ? 1 : 0);
