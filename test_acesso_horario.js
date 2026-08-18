/* Janela de acesso por técnico e escolha automática da data do NDVI.
 *
 * São as duas regras que decidem se o app é confiável no dia a dia: quem pode
 * abrir e a que horas, e qual imagem aparece quando alguém liga os índices.
 * Ambas são pura conta — dá para conferir sem navegador.
 *
 * O jsdom é opcional: sem ele o teste se declara PULADO, porque não ter a
 * biblioteca não diz nada sobre o app.
 */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var jsdom;
try{ jsdom = require('jsdom'); }
catch(e){
  console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).');
  process.exit(0);
}

var falhas = 0;
function ck(cond, nome){
  console.log((cond ? '  ok   ' : '  FALHA ') + nome);
  if(!cond) falhas++;
}
function titulo(t){ console.log('\n' + t); }

var dom = new jsdom.JSDOM('<!doctype html><html><head></head><body></body></html>',
  {url:'https://www.agracta.com.br/', pretendToBeVisual:true, runScripts:'outside-only'});
var win = dom.window;

/* localStorage do jsdom antigo pode não existir */
if(!win.localStorage){
  var mem = {};
  win.localStorage = {
    getItem:function(k){ return Object.prototype.hasOwnProperty.call(mem,k) ? mem[k] : null; },
    setItem:function(k,v){ mem[k] = String(v); },
    removeItem:function(k){ delete mem[k]; }
  };
}
win.fetch = function(){ return Promise.resolve({json:function(){ return Promise.resolve([]); }}); };

function carregar(arquivo){
  var src = fs.readFileSync(path.join(__dirname, arquivo), 'utf8');
  vm.runInContext(src, dom.getInternalVMContext(), {filename:arquivo});
}
carregar('acesso-horario.js');
carregar('ui-campo.js');

var A = win.AgractaAcesso;
var U = win.AgractaUI;

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
