/* A troca automática de local pelo GPS — ui-campo.js
 *
 * POR QUE ESTE TESTE EXISTE
 *
 * Esta foi a causa REAL do relato "por que ele sempre fica indo pro Picolini?".
 * Três correções anteriores mexeram em quem LÊ a preferência de local. O
 * problema estava aqui, em quem a ESCREVIA: o GPS trocava de lugar e chamava
 * `setLocalAtivo`, que GRAVA — então o palpite sobrescrevia, em toda abertura,
 * a escolha feita à mão. Nenhum conserto do outro lado poderia funcionar.
 *
 * Eram três defeitos no mesmo lugar:
 *
 *   1. O palpite gravava por cima da escolha do usuário.
 *   2. O raio de "estou nesta fazenda" era 25 km — um município inteiro. Da casa
 *      do usuário o centro da outra fazenda caía dentro dele, e o app anunciava
 *      que ele estava onde não estava, à 01h42 da manhã.
 *   3. Quem tocasse em "Voltar para Iracemápolis" era atendido naquele instante
 *      e via a mesma troca na abertura seguinte: o veto era variável de módulo.
 *
 * Rodar: node test_gps_local.js
 */
var fs = require('fs'), vm = require('vm');
var src = fs.readFileSync('./ui-campo.js', 'utf8');

var f = 0, p = 0;
function ck(ok, n){ if (ok){ p++; console.log('  ok    ' + n); } else { f++; console.log('  FALHA ' + n); } }
function eq(a, b, n){ ck(a === b, n + (a === b ? '' : ' (obtido ' + JSON.stringify(a) + ', esperado ' + JSON.stringify(b) + ')')); }

/* ---------------------------------------------------------------------------
   O mundo do teste. Duas fazendas do relato, com a distância real entre elas na
   ordem de grandeza certa: ~0,09° de latitude ≈ 10 km.
   --------------------------------------------------------------------------- */
var LS = {};
var GRAVOU = [];      /* chamadas a setLocalAtivo   — as que GRAVAM preferência */
var SESSAO = [];      /* chamadas a setLocalAtivoSessao — as que não gravam     */
var AVISOS = [];
var GPSPOS = null;

/* Um DOM de mentira que aceita qualquer chamada. ui-campo.js monta a interface
   inteira ao carregar; nada disso interessa aqui, e um boneco permissivo é mais
   honesto que recortar o arquivo e testar outra coisa que não o que roda. */
function noOp(){}
function elBoneco(){
  var el = {
    id:'', className:'', _html:'', style:{}, dataset:{},
    classList:{ add:noOp, remove:noOp, contains:function(){ return false; }, toggle:noOp },
    appendChild:noOp, removeChild:noOp, insertBefore:noOp, remove:noOp,
    setAttribute:noOp, getAttribute:function(){ return null; }, removeAttribute:noOp,
    addEventListener:noOp, removeEventListener:noOp, focus:noOp, click:noOp,
    querySelector:function(){ return elBoneco(); },
    querySelectorAll:function(){ return []; },
    closest:function(){ return null; },
    getBoundingClientRect:function(){ return {left:0,top:0,right:0,bottom:0,width:0,height:0}; },
    onclick:null
  };
  Object.defineProperty(el, 'innerHTML', { get:function(){ return el._html; },
                                           set:function(v){ el._html = v; } });
  Object.defineProperty(el, 'textContent', { get:function(){ return ''; }, set:noOp });
  return el;
}
function elementoBoneco(){
  var doc = elBoneco();
  doc.documentElement = elBoneco();
  doc.body = elBoneco();
  doc.head = elBoneco();
  doc.readyState = 'complete';
  doc.getElementById = function(){ return null; };
  doc.createElement = function(){ return elBoneco(); };
  doc.querySelector = function(){ return null; };
  doc.querySelectorAll = function(){ return []; };
  doc.addEventListener = noOp;
  return doc;
}

function mundo(){
  LS = {}; GRAVOU = []; SESSAO = []; AVISOS = [];
  var ctx = {
    console:console, Math:Math, String:String, Object:Object, Array:Array,
    JSON:JSON, setTimeout:function(fn){ return 0; }, clearTimeout:function(){},
    localStorage:{
      getItem:function(k){ return Object.prototype.hasOwnProperty.call(LS,k)?LS[k]:null; },
      setItem:function(k,v){ LS[k]=String(v); },
      removeItem:function(k){ delete LS[k]; }
    },
    LOCAIS:{ iracema:{nome:'Iracemápolis'}, picolini:{nome:'Picolini'} },
    QGEO:{ qi:[[-22.580,-47.520]], qp:[[-22.670,-47.520]] },   /* ~10 km ao sul */
    QLOCAL:{ qi:'iracema', qp:'picolini' },
    localAtivo:'iracema',
    editMode:false,
    ensureLocais:function(){},
    quadrasDoLocal:function(id){ return id==='iracema'?['qi']:['qp']; },
    quadraPonto:function(){ return null; },
    esc:function(x){ return String(x==null?'':x); },
    /* ui-campo.js monta a barra de campo ao carregar. O teste não quer a barra,
       quer a decisão do GPS — então o DOM é um boneco que aceita tudo e não
       devolve nada. */
    document:elementoBoneco(),
    navigator:{ geolocation:null },
    setInterval:function(){ return 0; }, clearInterval:function(){},
    matchMedia:function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; },
    _stxToast:function(){}
  };
  ctx.window = ctx; ctx.globalThis = ctx;
  ctx.setLocalAtivo = function(id){ GRAVOU.push(id); ctx.localAtivo = id; };
  ctx.setLocalAtivoSessao = function(id){ SESSAO.push(id); ctx.localAtivo = id; return true; };
  ctx.gpsBest = function(opts, a, cb){ cb(GPSPOS); };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  /* Captura o aviso: o único pedaço de DOM que o teste realmente lê. */
  var elAviso = elBoneco();
  elAviso.classList = { add:function(){ AVISOS.push(elAviso._html); }, remove:noOp,
                        contains:function(){ return false; }, toggle:noOp };
  var elBotao = elBoneco();
  ctx._botaoVoltar = elBotao;      /* o teste toca nele para simular o usuário */
  ctx.document.getElementById = function(id){
    if(id === 'agLocalAviso') return elAviso;
    if(id === 'agAvisoBtn') return elBotao;
    return null;
  };
  return ctx;
}

console.log('\n--- A geometria do teste é a que eu disse que é ---');
var c = mundo();
var d = c.agLocalMaisProximo(-22.580, -47.520);
eq(d.id, 'iracema', 'em cima da quadra de Iracemápolis, ela é a mais próxima');
ck(d.km < 0.5, 'e a distância é praticamente zero');
ck(d.segundo && d.segundo.id === 'picolini', 'e o segundo lugar é declarado, para dar para medir ambiguidade');
ck(d.segundo.km > 9 && d.segundo.km < 11, 'as duas fazendas estão a ~10 km uma da outra');

console.log('\n--- O DEFEITO 1: o palpite do GPS gravava por cima da escolha ---');
/* Em cima da fazenda do Picolini: a troca é legítima, mas é sobre HOJE. */
c = mundo(); GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal();
eq(SESSAO.length, 1, 'o GPS troca o local');
eq(SESSAO[0], 'picolini', 'para a fazenda em que a pessoa realmente está');
eq(GRAVOU.length, 0, 'e NÃO grava preferência nenhuma — era isso que apagava a escolha do usuário');
ck(/local trocado só nesta sessão/.test(AVISOS[0]||''), 'e o aviso diz que a troca é só desta sessão');

console.log('\n--- O DEFEITO 2: 25 km era um município inteiro ---');
/* A casa do usuário, em Iracemápolis, a ~10 km do centro do Picolini. Pelo raio
   antigo isso era "você está no Picolini". Não estava: eram 01h42 da manhã. */
c = mundo(); c.localAtivo = 'picolini'; GPSPOS = {lat:-22.580, lng:-47.520};
c.agAutoLocal();
eq(SESSAO.length, 1, 'em cima da quadra de Iracemápolis, aí sim troca');
c = mundo(); GPSPOS = {lat:-22.625, lng:-47.520};    /* no meio do caminho */
c.agAutoLocal();
eq(SESSAO.length, 0, 'a meio caminho das duas, não troca nada');
eq(GRAVOU.length, 0, 'e não grava nada');
eq(AVISOS.length, 0, 'e não anuncia estar numa fazenda onde não está');
c = mundo(); GPSPOS = {lat:-22.400, lng:-47.520};    /* ~20 km ao norte de tudo */
c.agAutoLocal();
eq(SESSAO.length, 0, 'longe das duas, silêncio — a pessoa está em casa ou na estrada');

console.log('\n--- Perto de duas: o GPS não sabe, então não fala ---');
/* Duas fazendas vizinhas, a 2 km uma da outra: estar a 1 km de uma e 1,2 km da
   outra não é informação, é sorteio. */
c = mundo();
c.LOCAIS = { a:{nome:'Fazenda A'}, b:{nome:'Fazenda B'} };
c.QGEO = { qa:[[-22.580,-47.520]], qb:[[-22.598,-47.520]] };   /* ~2 km */
c.QLOCAL = { qa:'a', qb:'b' };
c.quadrasDoLocal = function(id){ return id==='a'?['qa']:['qb']; };
c.localAtivo = 'b';
GPSPOS = {lat:-22.5805, lng:-47.520};                          /* colado na A */
c.agAutoLocal();
eq(SESSAO.length, 0, 'vizinhas demais: nem estando em cima de uma o app arrisca');

console.log('\n--- O DEFEITO 3: o "não" do usuário não sobrevivia ao fechar do app ---');
c = mundo(); GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal();
eq(SESSAO[0], 'picolini', 'trocou');
/* A pessoa toca em "Voltar para Iracemápolis". */
var botao = c._botaoVoltar;
ck(typeof botao.onclick === 'function', 'o aviso traz o botão de voltar');
botao.onclick();
eq(SESSAO[SESSAO.length-1], 'iracema', 'voltou para o lugar de antes');
eq(LS['agracta-auto-local-vetado'], '1', 'e o "não" ficou GRAVADO, não numa variável que morre ao fechar');

console.log('\n--- Vetado, não insiste na próxima abertura ---');
c = mundo(); LS['agracta-auto-local-vetado'] = '1';
GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal();
eq(SESSAO.length, 0, 'quem disse não uma vez não é perguntado de novo');
eq(AVISOS.length, 0, 'e nem vê o aviso');

console.log('\n--- Mas dá para religar: a porta tem maçaneta dos dois lados ---');
c.agAutoLocalReligar();
eq(LS['agracta-auto-local-vetado'], undefined, 'religar apaga o veto');
c.agAutoLocal();
eq(SESSAO.length, 1, 'e a troca automática volta a funcionar');

console.log('\n--- Uma vez por sessão, e nunca no meio de um trabalho ---');
c = mundo(); GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal(); c.agAutoLocal(); c.agAutoLocal();
eq(SESSAO.length, 1, 'três chamadas, uma troca só');
c = mundo(); c.editMode = true; GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal();
eq(SESSAO.length, 0, 'quem está desenhando quadra não tem o mapa trocado embaixo do dedo');

console.log('\n--- Sem GPS, sem local, sem quadras: silêncio, nunca erro ---');
c = mundo(); GPSPOS = null;
try{ c.agAutoLocal(); ck(SESSAO.length===0, 'sem posição de GPS, não troca'); }
catch(e){ ck(false, 'sem GPS estourou: '+e.message); }
c = mundo(); c.LOCAIS = { so:{nome:'Único'} }; GPSPOS = {lat:-22.670, lng:-47.520};
c.agAutoLocal();
eq(SESSAO.length, 0, 'com um local só não há o que decidir');
c = mundo(); c.QGEO = {}; c.quadrasDoLocal = function(){ return []; };
GPSPOS = {lat:-22.670, lng:-47.520};
try{ c.agAutoLocal(); ck(SESSAO.length===0, 'local sem quadra desenhada não entra na conta do GPS'); }
catch(e){ ck(false, 'local sem geometria estourou: '+e.message); }
eq(mundo().agLocalMaisProximo(0,0) && 1, 1, 'a função responde mesmo longe de tudo');

console.log('\n--- O toque do usuário continua gravando ---');
/* A separação só faz sentido se o outro lado dela continuar inteiro: escolher o
   lugar à mão é declaração, e declaração se grava. */
ck(/window\.setLocalAtivoSessao/.test(src) || /setLocalAtivoSessao/.test(src),
   'o GPS usa a troca de sessão');
/* A separação só vale se o corpo do GPS não tiver mais nenhuma chamada à versão
   que grava. Fora dele, `agIrParaLocal` — o toque do usuário na gaveta — DEVE
   continuar gravando: ali é declaração, não palpite. */
var corpoGps = (function(){
  var i = src.indexOf('window.agAutoLocal =');
  var j = src.indexOf('function chamar(', i);
  return src.slice(i, j > i ? j : src.length);
})();
ck(corpoGps.length > 200, 'o corpo de agAutoLocal foi encontrado para inspeção');
ck(!/setLocalAtivo\(/.test(corpoGps.replace(/setLocalAtivoSessao\(/g, '')),
   'dentro do GPS não sobrou nenhuma chamada à versão que grava preferência');
ck(/window\.setLocalAtivo\(id\)/.test(src),
   'e o toque do usuário na gaveta continua gravando, como deve');
/* Sem a troca de sessão (app.js velho ainda em cache numa atualização), o GPS
   fica quieto em vez de cair na versão que grava. Não trocar de local é um
   incômodo de um dia; sobrescrever a escolha é um incômodo de todo dia. */
var c2 = mundo(); delete c2.setLocalAtivoSessao; delete c2.window.setLocalAtivoSessao;
GPSPOS = {lat:-22.670, lng:-47.520};
c2.agAutoLocal();
eq(GRAVOU.length, 0, 'sem a troca de sessão, o GPS não troca nada — e sobretudo não grava');

console.log('\n' + (f ? f + ' FALHA(S)' : p + ' verificações, nenhuma falha.'));
process.exit(f ? 1 : 0);
