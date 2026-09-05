/* Janela de acesso por técnico e escolha automática da data do NDVI.
 *
 * São as duas regras que decidem se o app é confiável no dia a dia: quem pode
 * abrir e a que horas, e qual imagem aparece quando alguém liga os índices.
 * Ambas são pura conta — dá para conferir sem navegador.
 *
 * ESTE TESTE PASSOU MESES SEM RODAR. Ele dependia do jsdom, que não está
 * instalado, e se declarava PULADO saindo com código 0 — e o conferir.sh, que
 * só olha o código de saída, imprimia "ok". O único teste do controle de acesso
 * nunca rodou, e o portão dizia que estava tudo certo. Um teste que mente é
 * pior que teste nenhum: teste nenhum pelo menos não dá confiança falsa.
 *
 * Agora o DOM é um boneco de 30 linhas aqui dentro e o teste roda sempre.
 * Dependência que não está instalada não pode decidir o que é conferido.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var falhas = 0;
function ck(cond, nome){
  console.log((cond ? '  ok   ' : '  FALHA ') + nome);
  if(!cond) falhas++;
}
function titulo(t){ console.log('\n' + t); }

/* Um DOM de mentira que aceita qualquer chamada. Os dois arquivos montam
   interface ao carregar; nada disso interessa aqui, e um boneco permissivo é
   mais honesto que recortar os arquivos e testar outra coisa que não o que roda. */
function noOp(){}
function elBoneco(){
  var el = {
    id:'', className:'', _html:'', style:{cssText:''}, dataset:{}, value:'', checked:false,
    classList:{ add:noOp, remove:noOp, contains:function(){ return false; }, toggle:noOp },
    appendChild:noOp, removeChild:noOp, insertBefore:noOp, remove:noOp,
    setAttribute:noOp, getAttribute:function(){ return null; }, removeAttribute:noOp,
    addEventListener:noOp, removeEventListener:noOp, focus:noOp, click:noOp,
    querySelector:function(){ return elBoneco(); }, querySelectorAll:function(){ return []; },
    closest:function(){ return null; },
    getBoundingClientRect:function(){ return {left:0,top:0,right:0,bottom:0,width:0,height:0}; },
    onclick:null
  };
  Object.defineProperty(el, 'innerHTML', { get:function(){ return el._html; }, set:function(v){ el._html = v; } });
  Object.defineProperty(el, 'textContent', { get:function(){ return ''; }, set:noOp });
  return el;
}
function docBoneco(){
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

var mem = {};
var win = {
  console:console, Math:Math, Date:Date, String:String, Number:Number, Object:Object,
  Array:Array, JSON:JSON, RegExp:RegExp, parseInt:parseInt, parseFloat:parseFloat, isNaN:isNaN,
  setTimeout:function(){ return 0; }, clearTimeout:noOp,
  setInterval:function(){ return 0; }, clearInterval:noOp,
  document: docBoneco(),
  navigator:{ geolocation:null },
  location:{ href:'https://www.agracta.com.br/', hostname:'www.agracta.com.br' },
  matchMedia:function(){ return {matches:false, addListener:noOp, addEventListener:noOp}; },
  fetch:function(){ return Promise.resolve({json:function(){ return Promise.resolve([]); }}); },
  Promise:Promise,
  localStorage:{
    getItem:function(k){ return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; },
    setItem:function(k,v){ mem[k] = String(v); },
    removeItem:function(k){ delete mem[k]; }
  }
};
win.window = win; win.globalThis = win; win.self = win;
vm.createContext(win);

function carregar(arquivo){
  var src = fs.readFileSync(path.join(__dirname, arquivo), 'utf8');
  vm.runInContext(src, win, {filename:arquivo});
}
carregar('acesso-horario.js');
carregar('ui-campo.js');

var A = win.AgractaAcesso;
var U = win.AgractaUI;
ck(!!A && typeof A.dentro === 'function', 'acesso-horario.js expôs a regra de janela');
ck(!!U && typeof U.escolherData === 'function', 'ui-campo.js expôs a escolha de data');

/* Sexta-feira, 14 de agosto de 2026. Os horários são de São Paulo (UTC-3), e
   é assim que o teste os monta — sem depender do fuso da máquina. */
function quando(dia, hora, minuto){
  var d = new Date(Date.UTC(2026, 7, dia, hora + 3, minuto || 0));
  return {
    getDay:  function(){ return d.getUTCDay(); },
    getHours:function(){ return d.getUTCHours() - 3; },
    getMinutes:function(){ return d.getUTCMinutes(); }
  };
}

titulo('Janela de horário do técnico');

var comercial = {on:true, dias:[1,2,3,4,5], iniMin:7*60, fimMin:17*60};

ck(A.dentro(comercial, quando(14, 9, 0)) === true,   'sexta às 9h: entra');
ck(A.dentro(comercial, quando(14, 6, 59)) === false, 'sexta às 6h59: cedo demais, não entra');
ck(A.dentro(comercial, quando(14, 17, 0)) === false, 'sexta às 17h em ponto: a janela já fechou');
ck(A.dentro(comercial, quando(14, 16, 59)) === true, 'sexta às 16h59: ainda dentro');
ck(A.dentro(comercial, quando(15, 10, 0)) === false, 'sábado às 10h: dia não liberado');
ck(A.dentro(comercial, quando(16, 10, 0)) === false, 'domingo às 10h: dia não liberado');

ck(A.minutosRestantes(comercial, quando(14, 16, 52)) === 8, 'faltando 8 min, o app sabe avisar');
ck(A.minutosRestantes(comercial, quando(15, 10, 0)) === -1, 'fora do dia devolve -1 (fechado)');

titulo('Sem restrição configurada, ninguém é barrado');
ck(A.dentro({on:false}, quando(16, 3, 0)) === true, 'janela desligada: domingo de madrugada entra');
ck(A.dentro(null, quando(16, 3, 0)) === true,       'sem janela nenhuma: entra');
ck(A.minutosRestantes(null, quando(14, 9, 0)) === null, 'sem janela não existe contagem regressiva');

titulo('Formato antigo (texto) continua valendo');
var texto = {on:true, dias:[5], ini:'08:30', fim:'12:00'};
ck(A.normalizar(texto).iniMin === 510, '"08:30" vira 510 minutos');
ck(A.dentro(texto, quando(14, 9, 0)) === true,  'sexta às 9h dentro de 08:30–12:00');
ck(A.dentro(texto, quando(14, 12, 5)) === false,'sexta às 12h05 já fora');

titulo('NENHUM DIA é uma decisão, não um formulário em branco');
/* O defeito: o administrador desmarcava TODOS os dias, querendo dizer "este
   acesso não abre", e `normalizar` trocava a lista vazia por seg–sex. O app
   salvava uma semana inteira de trabalho liberada e ainda avisava "horário
   salvo" com os dias que ninguém escolheu. Num portão de acesso, inventar
   permissão que ninguém concedeu é falhar para o lado errado. */
ck(A.normalizar({on:true, dias:[]}).dias.length === 0,
   'lista vazia continua vazia — a decisão do administrador sobrevive');
ck(A.dentro({on:true, dias:[], iniMin:420, fimMin:1080}, quando(14, 9, 0)) === false,
   'e nenhum dia liberado significa que ninguém entra, nem em horário comercial');
ck(/não abre nunca/.test(A.descrever({on:true, dias:[]})),
   'e a tela do admin diz isso em voz alta, para a configuração não passar batida');

/* Ausente e vazio são coisas diferentes: quem nunca escolheu dia nenhum está no
   formato antigo, e o padrão de sempre continua valendo. */
ck(A.normalizar({on:true}).dias.join(',') === '1,2,3,4,5',
   'sem a chave dias (formato antigo), o padrão seg–sex continua valendo');
ck(A.dentro({on:true, iniMin:420, fimMin:1080}, quando(14, 9, 0)) === true,
   'e quem está no formato antigo não é barrado por causa desta correção');

/* Lista só com lixo é declaração que não dá para entender. O que não se
   entende não vira permissão. */
ck(A.normalizar({on:true, dias:[99, -3]}).dias.length === 0,
   'dias inválidos não viram uma semana de trabalho liberada');

titulo('O texto que o técnico lê na tela');
ck(/seg, ter, qua, qui, sex · 07:00 às 17:00/.test(A.descrever(comercial)), 'descrição legível da janela');

titulo('NDVI: qual data abre quando ligo o botão');

/* Caso real: a imagem mais recente está encoberta. Abrir nela é o que fazia o
   técnico ter de caçar data na mão toda vez. */
var datas = [
  {date:'2026-08-16', cloud:78},
  {date:'2026-08-13', cloud:41},
  {date:'2026-08-11', cloud:6},
  {date:'2026-08-08', cloud:2}
];
ck(U.escolherData(datas) === '2026-08-11', 'pula as nubladas e abre na mais recente utilizável');

ck(U.escolherData([{date:'2026-08-16', cloud:3}, {date:'2026-08-13', cloud:1}]) === '2026-08-16',
   'se a mais recente está limpa, é ela mesma');

ck(U.escolherData([{date:'2026-08-16', cloud:96}, {date:'2026-08-13', cloud:91}]) === '2026-08-16',
   'se TODAS estão encobertas, mostra a mais recente em vez de não mostrar nada');

ck(U.escolherData([{date:'2026-08-16', cloud:null}]) === '2026-08-16',
   'sem informação de nuvem, mostra a mais recente');

ck(U.escolherData([]) === null && U.escolherData(null) === null,
   'lista vazia não quebra');

titulo('A porta de entrada não pode quebrar o mapa');

/* Aconteceu de verdade: esconder o app com display:none fazia o Leaflet nascer
   dentro de uma caixa de 0x0 e guardar esse tamanho. Depois do login o mapa
   voltava com um tile só e o desenho todo errado. Esconder por visibilidade
   mantém o layout — e este teste existe para a lição não se perder. */
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
var regra = (/html\.pre-auth body>[^{]*\{([^}]*)\}/.exec(html) || [])[1] || '';

ck(regra !== '', 'a regra que esconde o app antes do login existe');
ck(/visibility:\s*hidden/.test(regra), 'ela esconde por visibilidade');
ck(!/display:\s*none/.test(regra), 'ela NÃO usa display:none (mataria a medida do mapa)');

console.log('');
if(falhas){ console.log(falhas + ' FALHA(S)'); process.exit(1); }
console.log('tudo certo');
