/* A fiação do histórico entre ensaios — as funções de app.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * O motor (test_historico_ativo.js) já está coberto. O que sobra é a parte que
 * mais quebra calada: LER o ativo de um tratamento. Um tratamento pode trazer
 * a identidade em três lugares — receita estruturada, item do banco, campo de
 * texto livre — e ler o lugar errado faz o app dizer que você nunca usou uma
 * coisa que usou, ou pior, que já usou uma que nunca tocou.
 *
 * Cobre também o silêncio: sem histórico, a tela não escreve nada.
 *
 * Rodar: node test_historico_tela.js
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
  var re = new RegExp('^var ' + nome + '=.*$', 'm');
  var m = re.exec(src);
  if (!m) throw new Error('não achei var ' + nome);
  return m[0];
}

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n){ ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

var H  = require('./vendor/historico-core.js');
var EN = require('./vendor/ativos-en-core.js');
var DC = require('./vendor/dose-core.js');

/* O banco de itens e as quadras deste teste. */
var ITENS = {
  i1: { id:'i1', nome:'Folicur',     ativos:'Tebuconazol (200 g/L)' },
  i2: { id:'i2', nome:'Assist',      ativos:'' },                       /* adjuvante sem ativo */
  i3: { id:'i3', nome:'Priori Xtra', ativos:'Azoxistrobina (200 g/L) + Ciproconazol (80 g/L)' }
};

var ctx = {
  window:{ HistoricoCore:H, AtivosEN:EN, DoseCore:DC },
  data:{}, curV:'q1',
  console:console, Object:Object, Math:Math, Date:Date, Array:Array, String:String, JSON:JSON, RegExp:RegExp,
  esc:function(s){ return String(s == null ? '' : s); },
  itemPorId:function(id){ return ITENS[id] || null; },
  tratItem:function(t){ return (t && t.itemId) ? (ITENS[t.itemId] || null) : null; },
  tratComponentes:function(t){ return (t && Array.isArray(t.componentes)) ? t.componentes : []; },
  studyCultura:function(st, q){ return String((st && st.cultura) || '').trim() || String((q && q.cultura) || '').trim(); },
  estudoFinalizado:function(st){ return !!(st && st.finalizacao && st.finalizacao.em); },
  renderStudyEditModal:function(){},
  openStudyDetail:function(){},
  workingStudy:null
};
ctx.window.data = ctx.data;
vm.createContext(ctx);
vm.runInContext([
  pegaVar('_histCache'), pegaVar('_histAbertos'),
  pega('_histIaDoTrat'), pega('_histAcervo'), pega('_histSelo'), pega('_histDeps'),
  pega('_histIndice'), pega('_histInvalida'), pega('_histNomesDoTrat'),
  pega('_histSidAtual'), pega('histToggle'), pega('histTratHtml'),
  pega('_histData'), pega('_histListaHtml')
].join('\n'), ctx);

console.log('\n--- De onde sai a identidade do ativo ---');
eq(ctx._histIaDoTrat({ itemId:'i1' }), 'Tebuconazol (200 g/L)',
   'item ligado: o ativo vem do banco, não do nome comercial');
eq(ctx._histIaDoTrat({ produto:'Folicur', ingredienteAtivo:'Tebuconazol' }), 'Tebuconazol',
   'sem item, vale o campo de texto livre');
eq(ctx._histIaDoTrat({ produto:'Coisa X' }), 'Coisa X',
   'sem ativo nenhum, o nome do produto é o último recurso');
eq(ctx._histIaDoTrat({ itemId:'i1', ingredienteAtivo:'Protioconazol' }), 'Tebuconazol (200 g/L)',
   'o item ligado VENCE o texto livre — a identidade cadastrada é a confiável');
eq(ctx._histIaDoTrat({ componentes:[{ itemId:'i1' }, { itemId:'i3' }] }),
   'Tebuconazol (200 g/L) + Azoxistrobina (200 g/L) + Ciproconazol (80 g/L)',
   'receita estruturada: todos os componentes entram');
eq(ctx._histIaDoTrat({ itemId:'i1', componentes:[{ itemId:'i3' }] }),
   'Azoxistrobina (200 g/L) + Ciproconazol (80 g/L)',
   'a receita VENCE o item do cabeçalho: é a mais específica');
eq(ctx._histIaDoTrat({ componentes:[{ itemId:'i2', nome:'Assist' }] }), 'Assist',
   'componente sem ativo cadastrado entra pelo nome');
eq(ctx._histIaDoTrat(null), '', 'tratamento nulo não estoura');
eq(ctx._histIaDoTrat({}), '', 'tratamento vazio devolve texto vazio');

console.log('\n--- Os nomes separados de um tratamento ---');
var nomes = ctx._histNomesDoTrat({ itemId:'i3' });
eq(nomes.length, 2, 'a mistura vira dois ativos');
ck(nomes.indexOf('Azoxistrobina') >= 0 && nomes.indexOf('Ciproconazol') >= 0, 'e são os dois certos');
eq(ctx._histNomesDoTrat({ itemId:'i1' }).length, 1, 'produto de ativo único vira um nome');
eq(ctx._histNomesDoTrat({}).length, 0, 'tratamento sem identidade não gera nome nenhum');

console.log('\n--- O acervo achatado ---');
ctx.data.q1 = { cultura:'Soja', estudos:[
  { id:'s1', codigo:'ENS-01', cultura:'', alvo:'Ferrugem asiática', dataInicio:'2024-01-10', _ts:1,
    tratamentos:[ { id:'T1', testemunha:true, produto:'Água' }, { id:'T2', itemId:'i1', dose:'0,5 L/ha' } ] },
  { id:'s2', codigo:'ENS-02', cultura:'Milho', alvo:'Cercospora', dataInicio:'2024-06-02', _ts:2,
    finalizacao:{ em:'2024-09-01' },
    tratamentos:[ { id:'T1', itemId:'i1', dose:'0,75 L/ha' } ] }
]};
var ac = ctx._histAcervo();
eq(ac.length, 2, 'dois ensaios no acervo');
eq(ac[0].cultura, 'Soja', 'estudo sem cultura própria herda a da quadra');
eq(ac[1].cultura, 'Milho', 'estudo com cultura própria mantém a dele');
eq(ac[1].finalizado, true, 'o ensaio finalizado é marcado como tal');
eq(ac[0].tratamentos[1].ia, 'Tebuconazol (200 g/L)', 'o ativo do tratamento entra resolvido');
eq(ac[0].tratamentos[0].testemunha, true, 'a testemunha é marcada, para o motor descartar');

console.log('\n--- A linha da tela ---');
ctx.workingStudy = { id:'s3' };                       /* montando um ensaio novo */
var html = ctx.histTratHtml({ itemId:'i1', dose:'0,5 L/ha' }, 'Soja');
ck(/Já usado/.test(html), 'a linha aparece quando há histórico');
ck(/Tebuconazol/.test(html), 'e nomeia o ativo');
ck(/2 ensaios seus/.test(html), 'contando os dois ensaios anteriores');
ck(/0,5 L\/ha/.test(html) && /0,75 L\/ha/.test(html), 'com as duas doses já usadas');
ck(!/eficácia|controle de|melhor|pior|recomend/i.test(html),
   'e sem NENHUMA afirmação sobre resultado — regra 1 do motor');

console.log('\n--- O silêncio ---');
eq(ctx.histTratHtml({ ingredienteAtivo:'Glifosato' }, 'Soja'), '',
   'ativo nunca usado: a tela não escreve nada');
eq(ctx.histTratHtml({ testemunha:true, produto:'Água' }, 'Soja'), '',
   'a testemunha não recebe linha de histórico');
eq(ctx.histTratHtml({}, 'Soja'), '', 'tratamento sem identidade: silêncio');
eq(ctx.histTratHtml(null, 'Soja'), '', 'tratamento nulo: silêncio, não erro');

console.log('\n--- O ensaio aberto não é histórico de si mesmo ---');
ctx.workingStudy = { id:'s1' };
var h1 = ctx.histTratHtml({ itemId:'i1', dose:'0,5 L/ha' }, 'Soja');
ck(/1 ensaio seu/.test(h1), 'editando o s1, sobra só o s2 no histórico');
ck(!/ENS-01/.test(h1) || !/1 ensaios/.test(h1), 'e o próprio ensaio não se cita');
ctx.workingStudy = { id:'s2' };
ck(/1 ensaio seu/.test(ctx.histTratHtml({ itemId:'i1' }, 'Soja')), 'e o mesmo vale editando o s2');

console.log('\n--- Avisa quando nunca foi usado NESTA cultura ---');
ctx.workingStudy = { id:'s3' };
ck(/Nunca usado em Algodão/.test(ctx.histTratHtml({ itemId:'i1' }, 'Algodão')),
   'usar em soja e milho não é ter usado em algodão, e a tela diz isso');
ck(!/Nunca usado/.test(ctx.histTratHtml({ itemId:'i1' }, 'Soja')),
   'e não avisa quando já foi usado na cultura atual');

console.log('\n--- Avisa quando a busca foi só por texto ---');
ctx.data.q1.estudos.push({ id:'s4', codigo:'ENS-04', cultura:'Soja', alvo:'Mofo', dataInicio:'2024-03-01', _ts:3,
  tratamentos:[ { id:'T1', produto:'BioX 500', dose:'2 L/ha' } ] });
ctx.data.q1.estudos.push({ id:'s5', codigo:'ENS-05', cultura:'Soja', alvo:'Mofo', dataInicio:'2024-08-01', _ts:4,
  tratamentos:[ { id:'T1', produto:'BioX 500', dose:'2 L/ha' } ] });
ctx._histInvalida();
var hb = ctx.histTratHtml({ produto:'BioX 500' }, 'Soja');
ck(/Já usado/.test(hb), 'nome comercial repetido ainda é encontrado');
ck(/tabela de nomes ISO/.test(hb),
   'mas a tela avisa que a busca foi por texto — não fingir busca completa');
ck(!/tabela de nomes ISO/.test(ctx.histTratHtml({ itemId:'i1' }, 'Soja')),
   'e não avisa quando o ativo resolveu de verdade');

console.log('\n--- O painel dos ensaios ---');
ctx.histToggle(ctx._histIndice() && Object.keys(ctx._histIndice().porAtivo).filter(function(k){ return /tebuconazole/.test(k); })[0]);
var hp = ctx.histTratHtml({ itemId:'i1' }, 'Soja');
ck(/ENS-01/.test(hp) && /ENS-02/.test(hp), 'aberto, lista os dois ensaios');
ck(/finalizado/.test(hp), 'e marca qual já foi finalizado');
ck(/não combina resultados/.test(hp), 'e diz, no próprio painel, o que ele não faz');
ck(/02\/06\/2024/.test(hp), 'a data sai em DD/MM/AAAA');

console.log('\n--- A data não anda para trás ---');
eq(ctx._histData('2024-01-10'), '10/01/2024', 'data ISO vira brasileira sem passar por new Date()');
eq(ctx._histData(''), '', 'data vazia continua vazia');
eq(ctx._histData('sem data'), 'sem data', 'texto que não é data volta intacto');

console.log('\n--- O cache não serve histórico velho ---');
var i1 = ctx._histIndice();
ck(ctx._histIndice() === i1, 'sem mudança, o índice é reaproveitado');
ctx.data.q1.estudos.push({ id:'s6', codigo:'ENS-06', cultura:'Soja', alvo:'Mofo', dataInicio:'2025-01-01', _ts:9,
  tratamentos:[ { id:'T1', itemId:'i1', dose:'1 L/ha' } ] });
ck(ctx._histIndice() !== i1, 'estudo novo invalida o índice');
ctx.workingStudy = { id:'s3' };
ck(/3 ensaios seus/.test(ctx.histTratHtml({ itemId:'i1' }, 'Soja')), 'e o novo já aparece no histórico');

console.log('\n--- Dados estragados não derrubam a tela ---');
[{ q1:null }, { q1:{ estudos:null } }, { q1:{ estudos:[null] } },
 { q1:{ estudos:[{ id:'z', tratamentos:null }] } }].forEach(function (mau, i) {
  ctx.data = mau; ctx.window.data = mau; ctx._histInvalida();
  try { ctx.histTratHtml({ itemId:'i1' }, 'Soja'); ck(true, 'acervo malformado #' + (i + 1) + ' não derruba a tela'); }
  catch (e) { ck(false, 'acervo malformado #' + (i + 1) + ' derrubou: ' + e.message); }
});

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
