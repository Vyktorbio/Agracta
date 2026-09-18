/* Croqui do ensaio no mapa — onde cada parcela está, em metros de verdade.
 *
 * Motor puro: entram o desenho experimental e o tamanho da parcela, sai a lista
 * de parcelas com cantos em lat/lng. Sem DOM, sem Leaflet, sem estado global —
 * por isso o teste roda sem navegador.
 *
 * O QUE ESTE MOTOR DESENHA E O QUE ELE NÃO INVENTA
 * -----------------------------------------------
 * Ele desenha o que o protocolo já disse: número de tratamentos, número de
 * repetições, tamanho da parcela e a ordem randomizada que o estudo salvou.
 * Nada disso é estimado aqui.
 *
 * Sem tamanho de parcela no protocolo ele NÃO desenha. Chutar "deve ser 3×5"
 * colocaria no mapa um croqui com cara de medida — alguém iria ao campo
 * procurar a estaca onde o desenho mandou, e a estaca não estaria lá. Um
 * croqui errado é pior que croqui nenhum, porque o errado parece certo.
 * Nesses casos volta `problemas` com o que falta, e `parcelas` vazio.
 *
 * ESPAÇAMENTO E CARREADOR SÃO INFORMADOS, NÃO DEDUZIDOS
 * ----------------------------------------------------
 * O app não guardava (e continua não deduzindo) a distância entre parcelas nem
 * a largura do carreador entre blocos. O padrão é ZERO — parcelas encostadas —
 * porque zero é visivelmente "não foi informado", enquanto um carreador de 1 m
 * inventado passaria por medida. Quem sabe a distância digita.
 *
 * O SISTEMA DE COORDENADAS
 * ------------------------
 * A âncora é um CANTO, não o centro: o canto da primeira parcela do primeiro
 * bloco. É o que se acha no campo — quem chega num ensaio chega por uma quina,
 * não pelo meio. É também o que o GPS vai marcar quando essa parte entrar.
 *
 * Do canto o croqui cresce para +x e +y:
 *   x = atravessando as parcelas (o lado da LARGURA da parcela)
 *   y = no sentido do comprimento da parcela (a direção em que se anda)
 * O ângulo gira esse par no terreno. Com ângulo 0, +x aponta para o leste e +y
 * para o norte — a MESMA convenção da régua de 1 ha do mapa, de propósito: os
 * dois objetos giram com o mesmo pegador e para o mesmo lado.
 *
 * O CAMINHO DE INSTALAÇÃO É QUEM MANDA
 * -------------------------------------
 * O croqui não é uma tabela: é a ordem em que se anda o ensaio. No campo a
 * instalação sobe por uma coluna de parcelas e DESCE pela seguinte, em
 * serpentina — começa numa ponta e termina na outra, sem atravessar o ensaio
 * de volta. Os blocos se sucedem ao longo desse caminho: sobe-se instalando o
 * bloco A e depois o B, vira no fim da coluna, e desce-se instalando C e D.
 *
 * É por isso que a randomização salva no app numera a parcela de forma CORRIDA
 * (1 até tratamentos × repetições) em vez de reiniciar a cada bloco: esse
 * número É a ordem de caminhada. O motor só precisa deitar essa fila sobre a
 * serpentina, e o desenho na tela passa a ser o mesmo que se instala no chão.
 *
 * Duas coisas descrevem a forma, e as duas são do usuário, não deduzidas:
 *   colunas    — quantas colunas de parcela o ensaio ocupa no talhão;
 *   serpentina — ligada, a coluna seguinte corre ao contrário (é o padrão,
 *                porque é assim que se instala); desligada, todas as colunas
 *                correm no mesmo sentido.
 * O COMPRIMENTO da parcela fica sempre no eixo y: parcela é faixa comprida no
 * sentido de quem planta e de quem pulveriza.
 *
 * Rodar o teste: node test_croqui_campo.js
 */
(function(root){
'use strict';


function num(v){ var n=parseFloat(v); return isFinite(n)?n:0; }
function inteiro(v){ var n=parseInt(v,10); return isFinite(n)&&n>0?n:0; }

/* Metro por grau na latitude dada. Mesma conta do app (grMeters): a longitude
   encolhe com o cosseno da latitude, a latitude não. */
function metrosPorGrau(lat){
  return { mlat:110540, mlng:111320*Math.cos(num(lat)*Math.PI/180) };
}

/* Um ponto local (x,y) em metros vira [lat,lng] no terreno. */
function pontoLatLng(x,y,anc){
  var ang=num(anc&&anc.ang), ca=Math.cos(ang), sa=Math.sin(ang);
  var m=metrosPorGrau(anc&&anc.lat);
  var leste = x*ca - y*sa;
  var norte = x*sa + y*ca;
  return [ num(anc&&anc.lat)+norte/m.mlat, num(anc&&anc.lng)+leste/m.mlng ];
}

/* A GRADE, em metros locais, antes de qualquer projeção.
   Volta também `problemas`: o que falta para o desenho ser honesto. */
function grade(cfg){
  cfg=cfg||{};
  var nTrat=inteiro(cfg.tratamentos), nRep=inteiro(cfg.repeticoes);
  var comp=num(cfg.comprimento), larg=num(cfg.largura);
  var esp=Math.max(0,num(cfg.espacamento)), carr=Math.max(0,num(cfg.carreador));
  var serp=(cfg.serpentina===undefined)?true:!!cfg.serpentina;
  var problemas=[];

  if(!(comp>0&&larg>0)) problemas.push('Sem o tamanho da parcela no protocolo. Sem ele não há croqui: o desenho teria medida inventada.');
  if(!nTrat) problemas.push('Sem tratamentos cadastrados.');
  if(!nRep) problemas.push('Sem repetições cadastradas.');
  if(problemas.length) return {parcelas:[],largura:0,comprimento:0,colunas:0,linhas:0,serpentina:serp,problemas:problemas};

  var total=nTrat*nRep;
  /* Sem número de colunas informado, cada bloco vira uma coluna — o desenho de
     livro. Quem instala em duas colunas troca uma vez e o croqui lembra. */
  var nCol=inteiro(cfg.colunas)||nRep;
  if(nCol>total) nCol=total;
  var nLin=Math.ceil(total/nCol);

  /* A fila de instalação: a ordem sorteada, pelo número corrido. */
  var fila=[];
  if(Array.isArray(cfg.ordem)&&cfg.ordem.length){
    fila=cfg.ordem.slice()
      .map(function(p,i){ return {p:p, n:(inteiro(p.parcela)||inteiro(p.pos)||(i+1)), i:i}; })
      .sort(function(a,b){ return (a.n-b.n)||(a.i-b.i); })
      .map(function(x){ return x.p; });
  }else{
    problemas.push('Sem randomização salva: a ordem mostrada é a de cadastro, não um sorteio.');
    for(var r=1;r<=nRep;r++) for(var t=1;t<=nTrat;t++) fila.push({rep:r,tratNum:t});
  }

  var celulas=[];
  fila.forEach(function(p,k){
    if(k>=total) return;                       /* fila maior que o desenho: não inventa lugar */
    var col=Math.floor(k/nLin), dentro=k%nLin;
    /* Serpentina: a coluna ímpar corre de cima para baixo. É a volta que se dá
       no fim da coluna — sem ela o croqui pede que se atravesse o ensaio. */
    var lin=(serp && (col%2===1)) ? (nLin-1-dentro) : dentro;
    celulas.push({
      col:col, lin:lin, ordem:k+1,
      rep:inteiro(p.rep)||1, pos:inteiro(p.parcela)||inteiro(p.pos)||(k+1),
      tratId:p.tratId||'', tratNum:inteiro(p.tratNum)||0,
      campo:p.campo||'', repLabel:p.repLabel||'', produto:p.produto||'',
      x: col*(larg+carr), y: lin*(comp+esp), w: larg, h: comp
    });
  });

  return {
    parcelas:celulas,
    largura: nCol*larg + Math.max(0,nCol-1)*carr,
    comprimento: nLin*comp + Math.max(0,nLin-1)*esp,
    colunas:nCol, linhas:nLin, serpentina:serp, problemas:problemas
  };
}

/* Os quatro cantos de uma parcela, em [lat,lng], prontos para o polígono. */
function cantosDaParcela(p,anc){
  return [
    pontoLatLng(p.x,        p.y,        anc),
    pontoLatLng(p.x+p.w,    p.y,        anc),
    pontoLatLng(p.x+p.w,    p.y+p.h,    anc),
    pontoLatLng(p.x,        p.y+p.h,    anc)
  ];
}

/* O retângulo que envolve o croqui inteiro — serve de moldura e de alvo de
   toque para arrastar o conjunto. */
function cantosDoConjunto(g,anc){
  return [
    pontoLatLng(0,          0,            anc),
    pontoLatLng(g.largura,  0,            anc),
    pontoLatLng(g.largura,  g.comprimento, anc),
    pontoLatLng(0,          g.comprimento, anc)
  ];
}

/* O CAMINHO — a linha que o autopropelido faz aplicando, e a mesma que se
   anda avaliando. Não é enfeite: é o sentido da randomização. Quem aplica ou
   avalia na ordem errada troca os dados de tratamento sem perceber, porque a
   parcela não tem placa dizendo qual é.
   Volta os centros das parcelas na ordem de caminhada, em metros locais. */
function caminho(g){
  if(!g||!g.parcelas||!g.parcelas.length) return [];
  return g.parcelas.slice()
    .sort(function(a,b){ return a.ordem-b.ordem; })
    .map(function(p){ return [p.x+p.w/2, p.y+p.h/2]; });
}

/* AS SETAS DO CAMINHO, uma por coluna, no meio do trecho.
   Desenhadas como GEOMETRIA (três pontos em metros) e não como caractere: o
   mapa do app gira, e uma seta em texto giraria junto com a tela apontando
   para o lado errado. Em metros ela gira com o terreno, que é o certo. */
function setas(g){
  var out=[];
  if(!g||!g.parcelas||!g.parcelas.length) return out;
  var porCol={};
  g.parcelas.forEach(function(p){ (porCol[p.col]=porCol[p.col]||[]).push(p); });
  Object.keys(porCol).forEach(function(c){
    var lista=porCol[c].slice().sort(function(a,b){ return a.ordem-b.ordem; });
    if(lista.length<2) return;
    var sobe=(lista[lista.length-1].lin>lista[0].lin)?1:-1;
    var meio=lista[Math.floor(lista.length/2)];
    var x=meio.x+meio.w/2, y=meio.y+meio.h/2;
    var L=Math.min(meio.w,meio.h)*0.35;
    /* Ponta no ponto, farpas atrás: atrás é o lado de onde se veio. */
    out.push([[x-L,y-L*sobe],[x,y],[x+L,y-L*sobe]]);
  });
  return out;
}

/* Centro do croqui, em [lat,lng]: onde mora o pegador de arrastar. */
function centro(g,anc){ return pontoLatLng(g.largura/2, g.comprimento/2, anc); }

/* Onde fica o pegador de girar: fora da moldura, no sentido +y, para não cair
   em cima de parcela nenhuma por menor que o croqui seja. */
function pegadorDeGiro(g,anc){
  return pontoLatLng(g.largura/2, g.comprimento + Math.max(6, g.comprimento*0.18), anc);
}

/* O ângulo que faz o eixo +y apontar para um ponto do terreno — é o que o
   arrasto do pegador de giro precisa. Mesma conta da régua de 1 ha. */
function anguloPara(lat,lng,anc){
  var m=metrosPorGrau(anc&&anc.lat);
  var leste=(num(lng)-num(anc&&anc.lng))*m.mlng;
  var norte=(num(lat)-num(anc&&anc.lat))*m.mlat;
  if(!leste&&!norte) return num(anc&&anc.ang);
  return Math.atan2(-leste, norte);
}

/* A ÂNCORA VEIO DO GPS: ELA SERVE PARA ESTA PARCELA?
   Um aparelho comum entrega de ±3 a ±30 m conforme o céu. Uma parcela de 3 m
   de largura não se posiciona com ±12 m: o canto cairia numa parcela vizinha,
   e o croqui ficaria deslocado um tratamento inteiro — o pior erro possível,
   porque continua parecendo certo.
   A régua é a própria parcela, não um número fixo: ±4 m é ótimo num ensaio de
   parcela de 20 m e inútil num de 3 m. Por isso a comparação é sempre contra a
   largura, que é o lado curto e o que troca de vizinho primeiro. */
function qualidadeDaAncora(acc,larguraParcela){
  var a=num(acc), w=num(larguraParcela);
  if(!(a>0)) return {nivel:'desconhecida', texto:'O aparelho não informou a precisão desta leitura.'};
  if(!(w>0)) return {nivel:'desconhecida', texto:'Sem o tamanho da parcela não dá para julgar a precisão.'};
  var m=Math.round(a*10)/10;
  if(a<=w/2) return {nivel:'boa',
    texto:'GPS ±'+m+' m — menos de meia parcela. Serve para marcar o canto.'};
  if(a<=w) return {nivel:'limite',
    texto:'GPS ±'+m+' m — quase a largura da parcela ('+w+' m). Confira o canto na imagem antes de salvar.'};
  return {nivel:'ruim',
    texto:'GPS ±'+m+' m é MAIOR que a parcela ('+w+' m): o canto pode cair uma parcela fora, e o croqui inteiro sai deslocado. Espere sinal melhor a céu aberto ou ajuste na mão pela imagem.'};
}

/* Área ocupada pelo croqui inteiro, em hectares — inclui carreador e
   espaçamento, porque é o chão que o ensaio toma no talhão. */
function areaHa(g){ return (num(g.largura)*num(g.comprimento))/10000; }

var api={
  metrosPorGrau:metrosPorGrau,
  pontoLatLng:pontoLatLng,
  grade:grade,
  caminho:caminho,
  setas:setas,
  cantosDaParcela:cantosDaParcela,
  cantosDoConjunto:cantosDoConjunto,
  centro:centro,
  pegadorDeGiro:pegadorDeGiro,
  anguloPara:anguloPara,
  areaHa:areaHa,
  qualidadeDaAncora:qualidadeDaAncora
};
if(typeof module==='object'&&module.exports) module.exports=api;
root.CroquiCore=api;
})(typeof self!=='undefined'?self:this);
