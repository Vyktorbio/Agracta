/* Máscara das quadras no mapa — a cor diz o estado do lançamento.
 *
 * Motor puro: entra contagem de parcelas por estado, sai a cor. Sem DOM, sem
 * Leaflet, sem estado global — por isso o teste roda sem navegador.
 *
 * DE ONDE VEM ESTE VOCABULÁRIO
 * ----------------------------
 * Não é novo. É o mesmo do croqui da avaliação (`_avCroquiStatus` no app.js):
 * uma parcela está `empty` (nada lançado), `partial` (parte dos valores) ou
 * `done` (tudo lançado). O croqui já pinta assim há tempo; o mapa é que ainda
 * mostrava a cor da CULTURA e não dizia nada sobre o trabalho. Agora as duas
 * telas falam a mesma língua: mesma pergunta, mesma cor.
 *
 * O QUE A COR NÃO DIZ
 * -------------------
 * Nada sobre resultado. Verde é "todo valor previsto foi lançado", não "deu
 * certo"; vermelho é "ainda não foi lançado", não "deu errado". Severidade,
 * eficácia e AACPD moram na análise, onde têm escala e teste — pintar
 * resultado no mapa, sem escala, seria dar autoridade de medida a uma cor.
 *
 * E a máscara nunca cobre o NDVI: quando a camada de índice está ligada, quem
 * manda na cor é a imagem, porque ali a cor É uma medida.
 */
(function(root){
'use strict';

/* Fora do estudo fica translúcido de propósito: a quadra existe, o mapa não
   esconde ela, mas ela não disputa atenção com quem tem trabalho pendente. */
var CORES={
  avaliada:    {cor:'#46a35a', preenchimento:0.50, rotulo:'Avaliada'},
  parcial:     {cor:'#e3b341', preenchimento:0.50, rotulo:'Parcial'},
  pendente:    {cor:'#e0584c', preenchimento:0.50, rotulo:'Pendente'},
  selecionada: {cor:'#2e86f0', preenchimento:0.55, rotulo:'Selecionada'},
  fora:        {cor:'#9aa0a6', preenchimento:0.16, rotulo:'Fora do estudo'}
};

function inteiro(v){ var n=Number(v); return (isFinite(n)&&n>0)?Math.floor(n):0; }

/* Estado de UMA parcela: quantos valores previstos ela já tem lançados. Sem
   valor previsto (nenhuma avaliação cadastrada) ela não tem estado — devolve
   null, e quem soma ignora. Um zero aqui viraria "pendente" e encheria o mapa
   de vermelho por estudo que ainda nem tem avaliação desenhada. */
function estadoParcela(previstos, lancados){
  var t=inteiro(previstos), f=Math.min(inteiro(lancados),inteiro(previstos));
  if(!t) return null;
  return f===0?'empty':(f===t?'done':'partial');
}

/* Estado da QUADRA: o que pesa é a parcela, não o valor. Uma quadra com 24
   parcelas onde 23 estão prontas e 1 não começou é "parcial" — não "avaliada
   em 96%", que arredondaria para verde e sumiria com a parcela que falta. */
function estadoQuadra(contagem, opcoes){
  var o=opcoes||{}, c=contagem||{};
  if(o.selecionada) return 'selecionada';
  var done=inteiro(c.done), partial=inteiro(c.partial), empty=inteiro(c.empty);
  var total=done+partial+empty;
  if(!total) return 'fora';
  if(done===total) return 'avaliada';
  if(done===0&&partial===0) return 'pendente';
  return 'parcial';
}

function estilo(chave){ return CORES[chave]||CORES.fora; }

var api={CORES:CORES, estadoParcela:estadoParcela, estadoQuadra:estadoQuadra, estilo:estilo};
if(typeof module==='object'&&module.exports) module.exports=api;
root.MascaraCore=api;
})(typeof self!=='undefined'?self:this);
