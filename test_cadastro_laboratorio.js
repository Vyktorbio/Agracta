/* Laboratório não é campo. O cadastro passa a saber disso.
 *
 * O Agracta nasceu para o CAMPO — severidade, incidência, AACPD, dias após a
 * aplicação. O laboratório entrou depois, e por um tempo foi tratado como um
 * caso especial de campo: mesma lista de tipos de estudo, mesma programação em
 * dias, e a família da variável deduzida só do que estava digitado na coluna.
 *
 * O preço apareceu numa folha: bioensaio de mortalidade saindo com o título
 * "CURVA DE PROGRESSO DA DOENÇA", legenda "curva de progresso da severidade de
 * Mortalidade", eficácia de -1431% e a letra "a" na testemunha.
 *
 * O que estes testes seguram:
 *   - numa quadra de lab só aparecem tipos de laboratório;
 *   - a programação em HORAS cria uma avaliação por MOMENTO, não por data —
 *     2, 12 e 24 HAT caem todas no mesmo dia e não podem se engolir;
 *   - o sentido da variável, quando ninguém o declarou, vem do tipo do estudo,
 *     e escolha explícita do usuário nunca é sobrescrita.
 *
 * Rodar: node test_cadastro_laboratorio.js
 */
var fs = require('fs'), vm = require('vm');

function elStub(){
  return new Proxy(function(){}, {
    get: function(t,k){
      if(k==='style') return {};
      if(k==='classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k==='value'||k==='textContent'||k==='innerHTML') return '';
      if(k==='children'||k==='childNodes') return [];
      return elStub();
    },
    set: function(){ return true; }, apply: function(){ return elStub(); }
  });
}
var store = {};
var ctx = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.btoa = function(s){ return Buffer.from(s,'binary').toString('base64'); };
ctx.atob = function(s){ return Buffer.from(s,'base64').toString('binary'); };
ctx.localStorage = { getItem:function(k){ return store[k]==null?null:store[k]; },
                     setItem:function(k,v){ store[k]=String(v); }, removeItem:function(k){ delete store[k]; } };
ctx.sessionStorage = { getItem:function(){ return null; }, setItem:function(){} };
ctx.location = { reload:function(){}, href:'', search:'', hash:'' };
ctx.navigator = { onLine:true, userAgent:'node', serviceWorker:{register:function(){return Promise.resolve();},addEventListener:function(){}} };
ctx.document = new Proxy({}, { get:function(t,k){
  if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS') return function(){ return elStub(); };
  if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName') return function(){ return []; };
  if(k==='addEventListener'||k==='removeEventListener') return function(){};
  if(k==='body'||k==='documentElement'||k==='head') return elStub();
  if(k==='visibilityState') return 'visible';
  if(k==='cookie') return '';
  return elStub();
}});
ctx.addEventListener=function(){}; ctx.removeEventListener=function(){};
ctx.requestAnimationFrame=function(){};
ctx.matchMedia=function(){ return {matches:false,addListener:function(){},addEventListener:function(){}}; };
ctx.fetch=function(){ return Promise.resolve({json:function(){return Promise.resolve({});}}); };

vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app.js','utf8'), ctx, {filename:'app.js'});

var f=0, p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n)}else{f++;console.log('  FALHA '+n)} }

console.log('Na quadra de laboratório só aparecem tipos de laboratório');
var ent = ctx.TIPOS_POR_LAB.Entomologia, fit = ctx.TIPOS_POR_LAB.Fitopatologia;
ck(ent.indexOf('Mortalidade')>=0,        'Entomologia oferece Mortalidade');
ck(ent.indexOf('Folha destacada')>=0,    'Entomologia oferece Folha destacada');
ck(ent.indexOf('Eficácia')<0,            'Entomologia NÃO oferece mais "Eficácia" (tipo de campo)');
ck(ent.indexOf('Seletividade/Fitotoxicidade')<0, 'nem Seletividade/Fitotoxicidade');
ck(fit.indexOf('Fungo in vitro')>=0,     'Fitopatologia oferece Fungo in vitro');
ck(fit.indexOf('Folha destacada')>=0,    'e Folha destacada');
ck(fit.indexOf('Fungo in vivo')>=0,      'Fungo in vivo FICA: é bancada com planta inoculada, mede severidade');
ck(fit.indexOf('Eficácia')<0,            'Fitopatologia NÃO oferece mais "Eficácia" (tipo de campo)');
ck(ctx.TIPOS_ESTUDO.indexOf('Folha destacada')>=0, 'Folha destacada entrou no catálogo geral');
var cat = ctx.CATALOGO_AVAL['Folha destacada'];
ck(!!cat && cat.length>0, 'e tem catálogo de variáveis próprio');
ck(cat.some(function(c){ return c.nome==='Mortalidade' && c.sentido==='maior'; }),
   'com Mortalidade já marcada como "quanto maior, melhor"');

console.log('Programação em HORAS: uma avaliação por MOMENTO, não por data');
function estudoH(momentos){
  return ctx.normalizeStudy({
    id:'E1', codigo:'LAB-1', tipoEstudo:'Mortalidade',
    dataInicio:'2026-08-10', avalInicio:'2026-08-10', avalHora0:'08:00',
    avalUnidade:'horas', avalMomentos:momentos,
    tratamentos:[{id:'T1',testemunha:true},{id:'T2'}], numRepeticoes:4, avaliacoes:[]
  });
}
var e1 = estudoH('2, 12, 24, 48, 72');
var n1 = ctx.gerarAvaliacoesAuto(e1);
ck(n1===5, 'cinco momentos geram cinco avaliações (veio '+n1+')');
var moms = e1.avaliacoes.map(function(a){ return a.momento && a.momento.valor; });
ck(moms.join(',')==='2,12,24,48,72', 'na ordem, com o momento gravado: '+moms.join(','));
ck(e1.avaliacoes.every(function(a){ return a.momento.unidade==='HAT'; }), 'todos em HAT');
/* 2 h e 12 h caem no MESMO dia — é exatamente o caso que o gerador de campo funde */
var d2 = e1.avaliacoes[0], d12 = e1.avaliacoes[1], d24 = e1.avaliacoes[2];
ck(d2.data===d12.data, '2 h e 12 h caem no mesmo dia...');
ck(d2.id!==d12.id,     '...e mesmo assim são duas avaliações distintas');
ck(d2.hora==='10:00',  '2 h depois das 08:00 = 10:00 (veio '+d2.hora+')');
ck(d12.hora==='20:00', '12 h depois = 20:00 (veio '+d12.hora+')');
ck(d24.data==='2026-08-11' && d24.hora==='08:00', '24 h vira o dia seguinte às 08:00');

console.log('Rodar de novo não duplica, e o que tem dado não é apagado');
/* Contrato herdado do campo, de propósito: o gerador APAGA os placeholders auto
   ainda vazios e os reprograma. Só não encosta em avaliação que já tem dado. */
ctx.gerarAvaliacoesAuto(e1);
ck(e1.avaliacoes.length===5, 'segunda passada não duplica: seguem cinco');
ck(e1.avaliacoes.map(function(a){return a.momento.valor;}).join(',')==='2,12,24,48,72',
   'e nos mesmos momentos');
e1.avaliacoes[0].variaveis=['Mortalidade'];
e1.avaliacoes[0].notas={'T2R1':{Mortalidade:'60'}};
e1.avalMomentos='2, 12, 24, 48, 72, 96';
ctx.gerarAvaliacoesAuto(e1);
ck(e1.avaliacoes.length===6, 'acrescentar 96 h dá seis avaliações');
ck(e1.avaliacoes.filter(function(a){ return a.momento.valor===2; }).length===1,
   'e a de 2 h não foi duplicada');
var comNota = e1.avaliacoes.filter(function(a){ return a.notas && a.notas['T2R1']; });
ck(comNota.length===1 && comNota[0].notas['T2R1'].Mortalidade==='60',
   'a avaliação COM nota lançada sobreviveu intacta');

console.log('Lista mal digitada não derruba nada');
var rot=function(txt,un){ return ctx._parseMomentos(txt,un||'horas').map(function(m){return m.valor+m.unidade;}).join(','); };
ck(rot('2, 12, 24')==='2HAT,12HAT,24HAT', 'vírgula');
ck(rot('2 12 24')==='2HAT,12HAT,24HAT',   'espaço');
ck(rot('24; 2; 12')==='2HAT,12HAT,24HAT', 'ponto e vírgula, e ordena');
ck(rot('24, 24, 2')==='2HAT,24HAT',       'tira repetido');
ck(rot('2, abc, 12')==='2HAT,12HAT',      'ignora lixo');
ck(rot('0.5; 2')==='0.5HAT,2HAT',         'meia hora com PONTO decimal');
ck(rot('0,5')==='0HAT,5HAT',              'vírgula segue sendo separador, sem ambiguidade calada');
ck(ctx._parseMomentos('',"horas").length===0, 'vazio não gera nada');

console.log('A unidade é ESCOLHA sua — e o sufixo permite misturar quando precisa');
ck(rot('2, 12, 24, 36, 72','horas')==='2HAT,12HAT,24HAT,36HAT,72HAT',
   'em horas, número solto é hora');
ck(rot('1, 3, 7','dias')==='1DAT,3DAT,7DAT',
   'em dias, número solto é dia — DAT 1, DAT 3, DAT 7');
/* o choque: 2 horas depois e, daí em diante, um por dia */
ck(rot('2h, 1d, 2d, 3d','dias')==='2HAT,1DAT,2DAT,3DAT',
   'com sufixo, 2h + DAT 1, 2, 3 convivem na mesma agenda');
ck(rot('3d, 2h, 1d','dias')==='2HAT,1DAT,3DAT',
   'e saem em ordem cronológica de verdade: 2 h vem antes de 1 dia');
ck(rot('2 hat, 1 dia','dias')==='2HAT,1DAT', 'aceita "hat" e "dia" por extenso');

console.log('O choque, ponta a ponta: 2 h + DAT 1, 2, 3');
var eC = ctx.normalizeStudy({
  id:'E9', codigo:'LAB-9', tipoEstudo:'Mortalidade',
  dataInicio:'2026-08-10', avalInicio:'2026-08-10', avalHora0:'08:00',
  avalUnidade:'dias', avalMomentos:'2h, 1d, 2d, 3d',
  tratamentos:[{id:'T1',testemunha:true},{id:'T2'}], numRepeticoes:4, avaliacoes:[]
});
ctx.gerarAvaliacoesAuto(eC);
ck(eC.avaliacoes.length===4, 'quatro avaliações');
ck(eC.avaliacoes[0].momento.unidade==='HAT' && eC.avaliacoes[0].momento.valor===2, 'a 1ª é o choque, 2 HAT');
ck(eC.avaliacoes[0].data==='2026-08-10' && eC.avaliacoes[0].hora==='10:00', 'no mesmo dia, às 10:00');
ck(eC.avaliacoes[1].momento.unidade==='DAT' && eC.avaliacoes[1].data==='2026-08-11', 'a 2ª é DAT 1, no dia seguinte');
ck(eC.avaliacoes[3].data==='2026-08-13', 'e a última, DAT 3, três dias depois');

console.log('Duas leituras no MESMO dia sobrevivem à deduplicação');
var eD2 = ctx.normalizeStudy({
  id:'E10', codigo:'LAB-10', tipoEstudo:'Mortalidade',
  tratamentos:[{id:'T1',testemunha:true}], numRepeticoes:4,
  avaliacoes:[
    /* sem momento declarado: só a HORA separa uma da outra */
    {id:'M1', data:'2026-08-11', hora:'09:00', variaveis:['Mortalidade'], notas:{'T1R1':{Mortalidade:'10'}}},
    {id:'M2', data:'2026-08-11', hora:'17:00', variaveis:['Mortalidade'], notas:{'T1R1':{Mortalidade:'35'}}}
  ]
});
ck(eD2.avaliacoes.length===2, 'as duas do mesmo dia continuam existindo');
ck(eD2.avaliacoes[0].notas['T1R1'].Mortalidade==='10' &&
   eD2.avaliacoes[1].notas['T1R1'].Mortalidade==='35', 'e cada uma com a sua nota');

console.log('Em dias, o campo segue exatamente como sempre foi');
var eD = ctx.normalizeStudy({
  id:'E2', codigo:'PL-1', tipoEstudo:'Eficácia',
  dataInicio:'2026-07-01', avalInicio:'2026-07-01', avalIntervalo:7, avalNum:3,
  tratamentos:[{id:'T1',testemunha:true},{id:'T2'}], numRepeticoes:4, avaliacoes:[]
});
ck(eD.avalUnidade==='dias', 'o padrão continua sendo dias');
var nD = ctx.gerarAvaliacoesAuto(eD);
ck(nD===3, 'três avaliações de 7 em 7');
ck(eD.avaliacoes.map(function(a){return a.data;}).join(',')==='2026-07-01,2026-07-08,2026-07-15', 'nas datas certas');
ck(eD.avaliacoes.every(function(a){ return !a.momento; }), 'e sem momento HAT, como sempre');

console.log('O sentido da variável vem do TIPO quando ninguém o declarou');
var eS = ctx.normalizeStudy({
  id:'E3', codigo:'LAB-2', tipoEstudo:'Mortalidade',
  tratamentos:[{id:'T1',testemunha:true},{id:'T2'}], numRepeticoes:4,
  avaliacoes:[
    /* coluna criada à mão: sem sentido declarado — era daqui que saía o -1431% */
    {id:'A1', data:'2026-08-11', variaveis:['Mortalidade'], varcfg:{}, notas:{}},
    /* e uma em que o usuário escolheu 'menor' de propósito */
    {id:'A2', data:'2026-08-12', variaveis:['Mortalidade'], varcfg:{Mortalidade:{sentido:'menor'}}, notas:{}}
  ]
});
ck(eS.avaliacoes[0].varcfg.Mortalidade.sentido==='maior',
   'coluna sem sentido declarado passa a "maior", pelo tipo Mortalidade');
ck(eS.avaliacoes[1].varcfg.Mortalidade.sentido==='menor',
   'escolha explícita do usuário NÃO é sobrescrita');
ck(ctx._avSentido(eS.avaliacoes[0],'Mortalidade')==='maior', '_avSentido enxerga o conserto');

var eF = ctx.normalizeStudy({
  id:'E4', codigo:'PL-2', tipoEstudo:'Eficácia',
  tratamentos:[{id:'T1',testemunha:true}], numRepeticoes:4,
  avaliacoes:[{id:'A1', data:'2026-07-01', variaveis:['Severidade'], varcfg:{}, notas:{}}]
});
ck(ctx._avSentido(eF.avaliacoes[0],'Severidade')==='menor',
   'no campo, severidade segue "menor" — nada mudou');

var eN = ctx.normalizeStudy({
  id:'E5', codigo:'LAB-3', tipoEstudo:'Mortalidade',
  tratamentos:[{id:'T1',testemunha:true}], numRepeticoes:4,
  avaliacoes:[{id:'A1', data:'2026-08-11', variaveis:['Insetos mortos'], varcfg:{}, notas:{}}]
});
ck(ctx._avSentido(eN.avaliacoes[0],'Insetos mortos')==='maior',
   'num estudo de Mortalidade, coluna com "mortos" no nome também vira "maior"');

console.log('');
console.log(p+' ok, '+f+' falha(s)');
process.exit(f?1:0);
