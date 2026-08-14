/* Renomear a coluna de avaliação sem partir o ensaio em dois.
 *
 * O nome da variável não é rótulo: é a CHAVE. Ele indexa notas, tipos, varcfg e
 * bruto, e é por ele que a prancha junta a série no tempo. Corrigir o nome só na
 * avaliação aberta deixaria "Severidde" em três datas e "Severidade" na quarta —
 * duas variáveis com o mesmo significado, e a curva perdendo pontos em silêncio,
 * sem nenhum erro na tela.
 *
 * Rodar: node test_renomear_coluna.js
 */
var fs = require('fs'), vm = require('vm');

function elStub(){
  return new Proxy(function(){}, {
    get: function(t,k){
      if(k==='style') return {};
      if(k==='classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k==='value'||k==='textContent'||k==='innerHTML') return '';
      if(k==='children'||k==='childNodes') return [];
      /* elemento também devolve lista vazia: o app varre .av-cell com forEach */
      if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName') return function(){ return []; };
      if(k==='dataset') return {};
      return elStub();
    },
    set: function(){ return true; }, apply: function(){ return elStub(); }
  });
}
var store = {}, avisos = [], perguntas = [];
var ctx = {
  console: console, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat, isFinite: isFinite,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(m){ avisos.push(String(m)); }, confirm: function(){ return true; }
};
ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
ctx.prompt = function(){ return perguntas.length ? perguntas.shift() : null; };
ctx.window.prompt = ctx.prompt;
ctx.btoa = function(s){ return Buffer.from(s,'binary').toString('base64'); };
ctx.atob = function(s){ return Buffer.from(s,'base64').toString('binary'); };
ctx.localStorage = { getItem:function(k){ return store[k]==null?null:store[k]; },
                     setItem:function(k,v){ store[k]=String(v); }, removeItem:function(k){ delete store[k]; } };
ctx.sessionStorage = { getItem:function(){ return null; }, setItem:function(){} };
ctx.location = { reload:function(){}, href:'', search:'', hash:'', protocol:'http:' };
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

/* Estudo com o nome escrito errado em TRÊS avaliações e nota lançada em todas */
function montaEstudo(){
  var mk = function(id, data, val){
    return {id:id, data:data, variaveis:['Severidde'],
            tipos:{'Severidde':'pct'},
            varcfg:{'Severidde':{sentido:'menor', sub:10}},
            notas:{'T1R1':{'Severidde':val}, 'T2R1':{'Severidde':String(Number(val)/2)}},
            notasMeta:{'T1R1':{'Severidde':{por:'vc'}}},
            bruto:{'T1R1':{'Severidde':{sub:[1,2,3]}}}};
  };
  return ctx.normalizeStudy({
    id:'E1', codigo:'PL-1', tipoEstudo:'Eficácia', numRepeticoes:4,
    tratamentos:[{id:'T1',testemunha:true},{id:'T2'}],
    avaliacoes:[ mk('A1','2026-07-01','20'), mk('A2','2026-07-08','35'), mk('A3','2026-07-15','48') ]
  });
}

/* o app precisa achar o estudo aberto por curV/curSid */
ctx.data = { Q1: {cultura:'Feijão', cultivar:'IPR', plantio:'01/03/2026', estudos:[]} };
var est = montaEstudo();
ctx.data.Q1.estudos = [est];
ctx.curV = 'Q1'; ctx.curSid = 'E1';
/* a grade aberta é a 1ª avaliação */
ctx.editingAvId = 'A1';
ctx._avGrid = {
  variaveis:['Severidde'],
  tipos:{'Severidde':'pct'},
  varcfg:{'Severidde':{sentido:'menor', sub:10}},
  notas:{'T1R1':{'Severidde':'20'}, 'T2R1':{'Severidde':'10'}},
  meta:{'T1R1':{'Severidde':{por:'vc'}}},
  bruto:{'T1R1':{'Severidde':{sub:[1,2,3]}}}
};

console.log('O nome errado está em três avaliações');
ck(est.avaliacoes.every(function(a){ return a.variaveis[0]==='Severidde'; }), 'as três nasceram com "Severidde"');

console.log('Corrigir numa corrige em TODAS — senão a série do gráfico se parte');
perguntas.push('Severidade');
ctx.avRenameCol('Severidde');

ck(ctx._avGrid.variaveis[0]==='Severidade', 'a grade aberta passou a "Severidade"');
ck(est.avaliacoes.every(function(a){ return a.variaveis[0]==='Severidade'; }),
   'e as TRÊS avaliações do estudo também');
ck(est.avaliacoes.every(function(a){ return a.variaveis.indexOf('Severidde')<0; }),
   'o nome errado não sobrou em lugar nenhum');

console.log('E o dado vai junto com a chave — nada se perde no caminho');
var a2 = est.avaliacoes[1];
ck(a2.notas['T1R1']['Severidade']==='35', 'a nota de T1R1 seguiu para a chave nova');
ck(a2.notas['T2R1']['Severidade']==='17.5', 'a de T2R1 também');
ck(a2.notas['T1R1']['Severidde']===undefined, 'e não ficou cópia na chave velha');
ck(a2.tipos['Severidade']==='pct', 'o tipo da coluna acompanhou');
ck(a2.varcfg['Severidade'] && a2.varcfg['Severidade'].sentido==='menor', 'a config (sentido, sub-amostras) acompanhou');
ck(a2.bruto['T1R1']['Severidade'].sub.join(',')==='1,2,3', 'o dado BRUTO das sub-amostras acompanhou');
ck(a2.notasMeta['T1R1']['Severidade'], 'e o notasMeta acompanhou');

console.log('Fica na trilha de auditoria, como manda a BPL');
var trilha = (est.audit||[]).filter(function(e){ return /nome de vari/i.test(e.acao||e.action||''); });
ck(trilha.length===1, 'uma entrada registrada');
ck(/Severidde/.test(JSON.stringify(trilha[0])) && /Severidade/.test(JSON.stringify(trilha[0])),
   'com o nome velho e o novo');

console.log('Não deixa juntar duas colunas por engano');
ctx._avGrid.variaveis.push('Stand');
est.avaliacoes[0].variaveis.push('Stand');
avisos.length = 0;
perguntas.push('Stand');            /* tentar renomear "Severidade" para um nome que já existe */
ctx.avRenameCol('Severidade');
ck(ctx._avGrid.variaveis.indexOf('Severidade')>=0, '"Severidade" continua existindo — a troca foi recusada');
ck(ctx._avGrid.variaveis.filter(function(v){return v==='Stand';}).length===1, 'e não duplicou "Stand"');

console.log('Cancelar não mexe em nada');
var antes = JSON.stringify(est.avaliacoes);
perguntas.push(null);
ctx.avRenameCol('Severidade');
ck(JSON.stringify(est.avaliacoes)===antes, 'cancelando, o estudo fica intacto');
perguntas.push('   ');
ctx.avRenameCol('Severidade');
ck(JSON.stringify(est.avaliacoes)===antes, 'nome só com espaço também não mexe');

console.log('');
console.log(p+' ok, '+f+' falha(s)');
process.exit(f?1:0);
