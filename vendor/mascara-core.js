/* Máscara das quadras no mapa — a cor é lembrete de PRAZO (estadoPrazo):
 * vermelho hoje/atrasado, amarelo em até 3 dias, verde no prazo, cinza sem
 * estudo, azul selecionada. O estado do lançamento (estadoQuadra, abaixo)
 * continua no motor e no croqui das parcelas.
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
/* Cores PADRÃO e vivas (as mesmas dos estados do app, cores-padrao.css). As
   anteriores — verde-musgo, mostarda, vermelho fosco — sobre o satélite e a
   50% de opacidade ficavam pastéis, apagadas: "as cores no mapa continuam
   feias". Por cima da imagem a cor precisa de saturação para ser lida. */
var CORES={
  avaliada:    {cor:'#00ff00', preenchimento:0.50, rotulo:'Avaliada'},
  parcial:     {cor:'#ffff00', preenchimento:0.50, rotulo:'Parcial'},
  pendente:    {cor:'#ff0000', preenchimento:0.50, rotulo:'Pendente'},
  selecionada: {cor:'#2563eb', preenchimento:0.55, rotulo:'Selecionada'},
  fora:        {cor:'#9ca3af', preenchimento:0.16, rotulo:'Fora do estudo'},
  /* A COR DA QUADRA É LEMBRETE DE DATA (pedido de uso): o que importa de longe
     é "onde tenho que ir". Mesmos eventos da agenda — aplicação ou avaliação
     ainda não feita e não dispensada. */
  vencida:     {cor:'#ff0000', preenchimento:0.50, rotulo:'Hoje ou atrasado'},
  proxima:     {cor:'#ffff00', preenchimento:0.50, rotulo:'Nos próximos 3 dias'},
  emdia:       {cor:'#00ff00', preenchimento:0.50, rotulo:'No prazo'},
  semestudo:   {cor:'#9ca3af', preenchimento:0.16, rotulo:'Sem estudo'}
};
/* Ordem da legenda da máscara de prazos. */
var ORDEM_PRAZO=['vencida','proxima','emdia','semestudo','selecionada'];

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

/* Estado da quadra pelo PRAZO. `menorDiff` = dias até o evento pendente mais
   próximo (negativo = atrasado; null = nenhum evento pendente). Sem estudo
   ativo é cinza mesmo com evento: não há o que lembrar. */
function estadoPrazo(info, opcoes){
  var o=opcoes||{}, i=info||{};
  if(o.selecionada) return 'selecionada';
  if(!i.temEstudo) return 'semestudo';
  var d=(i.menorDiff==null||!isFinite(Number(i.menorDiff)))?null:Number(i.menorDiff);
  if(d!==null&&d<=0) return 'vencida';
  if(d!==null&&d<=3) return 'proxima';
  return 'emdia';
}

function estilo(chave){ return CORES[chave]||CORES.fora; }

var api={CORES:CORES, ORDEM_PRAZO:ORDEM_PRAZO, estadoParcela:estadoParcela, estadoQuadra:estadoQuadra, estadoPrazo:estadoPrazo, estilo:estilo};
if(typeof module==='object'&&module.exports) module.exports=api;
root.MascaraCore=api;
})(typeof self!=='undefined'?self:this);
