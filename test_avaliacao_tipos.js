/* Tipos de variável de avaliação: razão n/N, escala (McKinney) e sub-amostras.
 *
 * O contrato que estes testes protegem:
 *   - notas[parcela][variavel] continua sendo o número DERIVADO (é o que a ANOVA,
 *     a AACPD, a prancha e o % de controle consomem);
 *   - o BRUTO (sub-amostras e n/N) vive em bruto[parcela][variavel] e não pode se
 *     perder nem no merge entre aparelhos nem na ida/volta do Firebase;
 *   - sub-amostra NÃO vira repetição (a parcela entra na análise pela média).
 *
 * Rodar: node test_avaliacao_tipos.js
 */
var fs = require('fs');
var vm = require('vm');

/* ---------- sandbox de navegador mínimo (mesmo padrão de test_sync_regressoes.js) ---------- */
function elStub(){
  return new Proxy(function(){}, {
    get: function(t, k){
      if(k === 'style') return {};
      if(k === 'classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      if(k === 'children' || k === 'childNodes') return [];
      return elStub();
    },
    set: function(){ return true; },
    apply: function(){ return elStub(); }
  });
}
var store = {};
var context = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
context.window = context; context.globalThis = context; context.self = context;
context.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
context.atob = function(s){ return Buffer.from(s, 'base64').toString('binary'); };
context.localStorage = {
  getItem: function(k){ return store[k] == null ? null : store[k]; },
  setItem: function(k, v){ store[k] = String(v); },
  removeItem: function(k){ delete store[k]; }
};
context.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
context.location = { reload: function(){}, href: '', search: '', hash: '' };
context.navigator = { onLine: true, userAgent: 'node', serviceWorker: {register: function(){ return Promise.resolve(); }, addEventListener: function(){}} };
context.document = new Proxy({}, {
  get: function(t, k){
    if(k === 'createElement' || k === 'getElementById' || k === 'querySelector' || k === 'createElementNS') return function(){ return elStub(); };
    if(k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return function(){ return []; };
    if(k === 'addEventListener' || k === 'removeEventListener') return function(){};
    if(k === 'body' || k === 'documentElement' || k === 'head') return elStub();
    if(k === 'visibilityState') return 'visible';
    if(k === 'cookie') return '';
    return elStub();
  }
});
context.addEventListener = function(){}; context.removeEventListener = function(){};
context.requestAnimationFrame = function(){};
context.matchMedia = function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; };
context.fetch = function(){ return Promise.resolve({json: function(){ return Promise.resolve({}); }}); };

vm.createContext(context);
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});
vm.runInContext(fs.readFileSync('firebase-sync.js', 'utf8'), context, {filename: 'firebase-sync.js'});

var falhas = 0, passes = 0;
function check(ok, nome){
  if(ok){ passes++; console.log('  ok   ' + nome); }
  else { falhas++; console.log('  FALHA ' + nome); }
}
function eq(a, b, nome){
  var ok = String(a) === String(b);
  if(!ok) nome += '  (esperado ' + b + ', veio ' + a + ')';
  check(ok, nome);
}

/* ---------- 1. derivação ---------- */
console.log('\n[1] valor derivado a partir do bruto');
var cfgRaz = {tipo:'razao', sub:1, N:20, escalaMax:4};
eq(context._avDerivar(cfgRaz, {n:5, N:20}), '25', 'razão 5/20 = 25%');
eq(context._avDerivar(cfgRaz, {n:0, N:20}), '0', 'razão 0/20 = 0% (e não vazio)');
eq(context._avDerivar(cfgRaz, {n:30, N:20}), '100', 'n maior que N satura em 100%');
eq(context._avDerivar(cfgRaz, {n:5, N:0}), '', 'N zero não deriva (evita divisão instável)');
eq(context._avDerivar(cfgRaz, {n:5}), '', 'sem N não deriva');

var cfgMed = {tipo:'pct', sub:10, N:0, escalaMax:4};
eq(context._avDerivar(cfgMed, {sub:['10','20','30']}), '20', 'média de 3 sub-amostras');
eq(context._avDerivar(cfgMed, {sub:['10','','30']}), '20', 'sub-amostra em branco não conta como zero');
eq(context._avDerivar(cfgMed, {sub:[]}), '', 'sem nenhuma sub-amostra não deriva');
eq(context._avDerivar(cfgMed, {sub:['1,5','2,5']}), '2', 'aceita vírgula decimal do teclado BR');

var cfgEsc = {tipo:'escala', sub:4, N:0, escalaMax:4};
/* McKinney: Σnota / (n × máx) × 100 */
eq(context._avDerivar(cfgEsc, {sub:['4','4','4','4']}), '100', 'escala toda no máximo = índice 100%');
eq(context._avDerivar(cfgEsc, {sub:['0','0','0','0']}), '0', 'escala toda zero = índice 0%');
eq(context._avDerivar(cfgEsc, {sub:['1','2','0','1']}), '25', 'McKinney 4/(4×4) = 25%');

/* ---------- 2. escrita no bruto + recálculo do derivado ---------- */
console.log('\n[2] _avWriteBruto grava o bruto e recalcula notas[][]');
context._avGrid = {variaveis:['Mortalidade'], notas:{}, tipos:{Mortalidade:'razao'}, meta:{}, varcfg:{Mortalidade:{N:20}}, bruto:{}};
context._avWriteBruto('T1R1','Mortalidade','n','7');
context._avWriteBruto('T1R1','Mortalidade','N','20');
eq(context._avGrid.notas.T1R1.Mortalidade, '35', 'notas recebe o derivado (7/20 = 35%)');
eq(context._avGrid.bruto.T1R1.Mortalidade.n, '7', 'bruto guarda o n');
eq(context._avGrid.bruto.T1R1.Mortalidade.N, '20', 'bruto guarda o N');
check(context._avGrid.meta.T1R1 && context._avGrid.meta.T1R1.Mortalidade, 'a célula recebe carimbo de edição (para o merge)');

context._avGrid = {variaveis:['Nota'], notas:{}, tipos:{Nota:'escala'}, meta:{}, varcfg:{Nota:{sub:4, escalaMax:4}}, bruto:{}};
context._avWriteBruto('T2R1','Nota','s0','9');
eq(context._avGrid.bruto.T2R1.Nota.sub[0], '4', 'nota acima do máximo da escala é limitada ao máximo');
context._avWriteBruto('T2R1','Nota','s3','-2');
eq(context._avGrid.bruto.T2R1.Nota.sub[3], '0', 'nota negativa vira zero');
eq(context._avGrid.bruto.T2R1.Nota.sub.length, 4, 'as posições intermediárias existem em branco');
eq(context._avDerivar(context._avCfg(context._avGrid,'Nota'), context._avGrid.bruto.T2R1.Nota), '50', 'índice usa só as sub-amostras preenchidas');

context._avGrid = {variaveis:['Sev'], notas:{}, tipos:{Sev:'pct'}, meta:{}, varcfg:{Sev:{sub:10}}, bruto:{}};
context._avWriteBruto('T1R1','Sev','s0','150');
eq(context._avGrid.bruto.T1R1.Sev.sub[0], '100', 'porcentagem acima de 100 é limitada');

/* ---------- 3. tipos legados intocados ---------- */
console.log('\n[3] pct e contagem simples continuam fora do bruto');
check(context._avUsaBruto({tipo:'pct',sub:1}) === false, 'pct sem sub-amostra não usa bruto');
check(context._avUsaBruto({tipo:'contagem',sub:1}) === false, 'contagem sem sub-amostra não usa bruto');
check(context._avUsaBruto({tipo:'pct',sub:10}) === true, 'pct com 10 sub-amostras usa bruto');
check(context._avUsaBruto({tipo:'razao',sub:1}) === true, 'razão sempre usa bruto');
check(context._avUsaBruto({tipo:'escala',sub:1}) === true, 'escala sempre usa bruto');

var avLegado = {id:'a1', variaveis:['sev'], tipos:{}, notas:{T1R1:{sev:'42'}}, notasMeta:{}};
eq(context._avNota(avLegado, {key:'T1R1', tratId:'T1', rep:1}, 'sev'), '42', 'avaliação antiga segue lida igual');
eq(context._avCfg(avLegado,'sev').tipo, 'pct', 'variável antiga sem tipo continua sendo pct');
eq(context._avCfg(avLegado,'sev').sub, 1, 'variável antiga sem config tem 1 sub-amostra');

/* ---------- 3b. % de controle nas duas famílias ---------- */
console.log('\n[3b] % de controle: redução (dano) x mortalidade corrigida (Abbott)');
/* dano/severidade: testemunha alta, tratado baixo */
eq(context._pctCtrl(80, 20), 75, 'severidade 80 -> 20 = 75% de controle');
eq(context._pctCtrl(80, 20, 'menor'), 75, 'sentido menor é o padrão');
eq(context._pctCtrl(0, 20, 'menor'), null, 'testemunha zero não deriva no sentido menor');
/* mortalidade: testemunha baixa, tratado alto */
eq(context._pctCtrl(10, 85, 'maior'), (85-10)/(100-10)*100, 'mortalidade 10% -> 85% = Abbott corrigido');
eq(context._pctCtrl(0, 90, 'maior'), 90, 'testemunha sem mortalidade: corrigida = a própria mortalidade');
eq(context._pctCtrl(100, 100, 'maior'), null, 'testemunha em 100% não deriva (divisão por zero)');
eq(context._pctCtrl(20, 20, 'maior'), 0, 'igual à testemunha = 0% de controle');
/* era exatamente o caso que devolvia "—" antes */
check(context._pctCtrl(10, 85) === null && context._pctCtrl(10, 85, 'maior') !== null,
  'mortalidade só sai com sentido maior (no padrão continua "—")');

var avMort = {id:'a', variaveis:['Mort'], tipos:{Mort:'razao'}, varcfg:{Mort:{N:20, sentido:'maior'}}, notas:{}, bruto:{}};
eq(context._avSentido(avMort,'Mort'), 'maior', 'sentido lido da config da variável');
eq(context._avSentido(avMort,'Outra'), 'menor', 'variável sem config fica no padrão menor');

/* ---------- 4. normalizeStudy ---------- */
console.log('\n[4] normalizeStudy prepara estudos antigos');
var st = context.normalizeStudy({id:'S1', codigo:'E1', avaliacoes:[{id:'a1', data:'2026-08-01', variaveis:['sev'], notas:{}}]});
eq(typeof st.tipoEstudo, 'string', 'estudo antigo ganha tipoEstudo');
check(st.avaliacoes[0].varcfg && typeof st.avaliacoes[0].varcfg === 'object', 'avaliação antiga ganha varcfg');
check(st.avaliacoes[0].bruto && typeof st.avaliacoes[0].bruto === 'object', 'avaliação antiga ganha bruto');

/* ---------- 5. merge entre aparelhos ---------- */
console.log('\n[5] _mergeAval não perde sub-amostra entre dois aparelhos');
/* celular A avaliou T1R1, celular B avaliou T2R1 — ninguém pode sumir */
var aparelhoA = {
  id:'av1', data:'2026-08-01', _ts:1000, variaveis:['Sev'], tipos:{Sev:'pct'},
  varcfg:{Sev:{sub:3}},
  notas:{T1R1:{Sev:'20'}}, notasMeta:{T1R1:{Sev:{ts:1000}}},
  bruto:{T1R1:{Sev:{sub:['10','20','30']}}}
};
var aparelhoB = {
  id:'av1', data:'2026-08-01', _ts:900, variaveis:['Sev'], tipos:{Sev:'pct'},
  varcfg:{Sev:{sub:3}},
  notas:{T2R1:{Sev:'50'}}, notasMeta:{T2R1:{Sev:{ts:900}}},
  bruto:{T2R1:{Sev:{sub:['40','50','60']}}}
};
var mrg = context._mergeAval(aparelhoA, aparelhoB);
eq(mrg.notas.T1R1.Sev, '20', 'derivado do aparelho A sobrevive');
eq(mrg.notas.T2R1.Sev, '50', 'derivado do aparelho B sobrevive');
eq((mrg.bruto.T1R1.Sev.sub||[]).join(','), '10,20,30', 'sub-amostras do aparelho A sobrevivem');
eq((mrg.bruto.T2R1.Sev.sub||[]).join(','), '40,50,60', 'sub-amostras do aparelho B sobrevivem');
eq(mrg.varcfg.Sev.sub, 3, 'a config da variável sobrevive ao merge');

/* mesma célula nos dois, carimbos diferentes: o mais novo leva bruto E derivado juntos */
var novo = {
  id:'av1', _ts:2000, variaveis:['Sev'], tipos:{Sev:'pct'}, varcfg:{Sev:{sub:2}},
  notas:{T1R1:{Sev:'80'}}, notasMeta:{T1R1:{Sev:{ts:2000}}},
  bruto:{T1R1:{Sev:{sub:['70','90']}}}
};
var velho = {
  id:'av1', _ts:1000, variaveis:['Sev'], tipos:{Sev:'pct'}, varcfg:{Sev:{sub:2}},
  notas:{T1R1:{Sev:'10'}}, notasMeta:{T1R1:{Sev:{ts:1000}}},
  bruto:{T1R1:{Sev:{sub:['5','15']}}}
};
var m2 = context._mergeAval(novo, velho);
eq(m2.notas.T1R1.Sev, '80', 'a edição mais nova vence o derivado');
eq((m2.bruto.T1R1.Sev.sub||[]).join(','), '70,90', 'o bruto acompanha o lado que venceu (não fica trocado)');
var m2b = context._mergeAval(velho, novo);
eq(m2b.notas.T1R1.Sev, '80', 'mesmo resultado com os lados invertidos');
eq((m2b.bruto.T1R1.Sev.sub||[]).join(','), '70,90', 'bruto coerente com os lados invertidos');

/* o outro aparelho mexeu só no derivado (avaliação sem bruto): não pode apagar as sub-amostras */
var semBruto = {id:'av1', _ts:900, variaveis:['Sev'], tipos:{}, notas:{T1R1:{Sev:'20'}}, notasMeta:{T1R1:{Sev:{ts:900}}}};
var comBruto = {id:'av1', _ts:1000, variaveis:['Sev'], tipos:{}, notas:{T1R1:{Sev:'20'}}, notasMeta:{T1R1:{Sev:{ts:1000}}}, bruto:{T1R1:{Sev:{sub:['10','30']}}}};
var m3 = context._mergeAval(semBruto, comBruto);
eq(((m3.bruto.T1R1||{}).Sev||{}).sub.join(','), '10,30', 'bruto é herdado quando o vencedor não tem');

/* ---------- 6. ida e volta pelo Firebase ---------- */
console.log('\n[6] splitState/buildState preservam bruto e varcfg');
function estado(varNome){
  var av = {
    id:'av1', data:'2026-08-01', _ts:1, variaveis:[varNome], tipos:{}, notas:{}, notasMeta:{},
    varcfg:{}, bruto:{}
  };
  av.tipos[varNome]='razao';
  av.varcfg[varNome]={N:20};
  av.notas.T1R1={}; av.notas.T1R1[varNome]='35';
  av.bruto.T1R1={}; av.bruto.T1R1[varNome]={n:'7',N:'20'};
  return {
    data:{__config:{}, Q1:{cultura:'soja', estudos:[{id:'S1', codigo:'E1', aplicacoes:[], avaliacoes:[av]}]}},
    qgeo:{}, qgeots:{}, georef:null, georefts:0, locais:{}, qlocal:{}, qnome:{},
    qnomets:{}, qlocalts:{}, locaists:{}, randomizacoes:[], notas_campo:[],
    _deletedQuadras:{}, _deletedLocais:{}, _deletedNotas:{}, rev:1
  };
}
var flat = context.AgractaFirebase.splitState(estado('Mortalidade'));
var docAv = flat.avaliacoes[Object.keys(flat.avaliacoes)[0]];
check(typeof docAv.data.brutoJson === 'string', 'bruto vai serializado (nome de variável não vira nome de campo)');
check(docAv.data.bruto === undefined, 'o objeto cru não vai junto');
var volta = context.AgractaFirebase.buildState(flat, {rev:1}).data.Q1.estudos[0].avaliacoes[0];
eq(volta.bruto.T1R1.Mortalidade.n, '7', 'n volta íntegro do Firebase');
eq(volta.bruto.T1R1.Mortalidade.N, '20', 'N volta íntegro do Firebase');
eq(volta.varcfg.Mortalidade.N, 20, 'a config da variável volta íntegra');
eq(volta.notas.T1R1.Mortalidade, '35', 'o derivado volta íntegro');
check(volta.brutoJson === undefined, 'o campo serializado não fica sobrando no estado');

/* nome de variável que o Firestore recusaria como campo */
var flatRuim = context.AgractaFirebase.splitState(estado('__soma'));
var docRuim = flatRuim.avaliacoes[Object.keys(flatRuim.avaliacoes)[0]];
check(typeof docRuim.data.brutoJson === 'string', 'variável com prefixo reservado não quebra o doc');
var voltaRuim = context.AgractaFirebase.buildState(flatRuim, {rev:1}).data.Q1.estudos[0].avaliacoes[0];
eq(voltaRuim.bruto.T1R1['__soma'].n, '7', 'bruto de variável com nome reservado volta íntegro');

/* ---------- 7. fusão de avaliações duplicadas na mesma data ---------- */
console.log('\n[7] _fundeAval junta o bruto sem perder célula');
var keep = {id:'a1', data:'2026-08-01', variaveis:['Sev'], tipos:{}, notas:{T1R1:{Sev:'20'}}, notasMeta:{}, varcfg:{}, bruto:{T1R1:{Sev:{sub:['10','30']}}}};
var extra = {id:'a2', data:'2026-08-01', variaveis:['Sev'], tipos:{}, notas:{T2R1:{Sev:'40'}}, notasMeta:{}, varcfg:{Sev:{sub:2}}, bruto:{T2R1:{Sev:{sub:['30','50']}}}};
context._fundeAval(keep, extra);
eq(keep.bruto.T1R1.Sev.sub.join(','), '10,30', 'bruto que já estava fica');
eq(keep.bruto.T2R1.Sev.sub.join(','), '30,50', 'bruto da duplicada é incorporado');
eq(keep.varcfg.Sev.sub, 2, 'config da duplicada é incorporada');

/* ---------- resultado ---------- */
console.log('\n' + passes + ' passaram, ' + falhas + ' falharam');
if(falhas) process.exit(1);
