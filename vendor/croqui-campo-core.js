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

/* ================= ONDE EU ESTOU ==========================================
   O croqui já diz onde cada parcela está. A pergunta que se faz ANDANDO é a
   inversa: em qual delas eu estou pisando agora?

   Ela não é de conforto. A parcela não tem placa dizendo qual é — é isso que
   está escrito na razão de ser do caminho amarelo. Quem avalia uma parcela
   pensando que é a vizinha lança a nota no tratamento errado, e o erro não
   aparece em lugar nenhum: os dados ficam com cara de dados, a estatística
   roda, e o resultado é de outro ensaio.

   A REGRA É NÃO CHUTAR PARCELA. O GPS entrega um ponto com um erro declarado;
   se esse erro alcança a parcela vizinha, a resposta honesta é "5A ou 3A", não
   "5A". Escolher uma das duas em silêncio é dar a cara de medida a um sorteio
   — e é exatamente o caso em que a pessoa lança a nota confiante.

   Por isso a comparação não é contra um limite fixo em metros, e nem contra a
   largura da parcela: é contra a FOLGA, a distância do ponto até a borda mais
   próxima. No meio de uma parcela de 20 m, ±6 m responde sem dúvida; encostado
   na divisa da mesma parcela, ±6 m não responde nada. */

/* O nome que aparece na parcela, no balão e no letreiro — um só lugar, para os
   três não divergirem. */
function nomeDaParcela(p){
  if(!p) return '';
  return p.campo || ((p.tratId||('T'+p.tratNum))+' '+(p.repLabel||('R'+p.rep)));
}

/* O caminho de volta de pontoLatLng: um ponto do terreno vira (x,y) em metros
   locais, medidos a partir da âncora e já desgirados pelo ângulo do croqui. */
function metrosLocais(lat,lng,anc){
  var ang=num(anc&&anc.ang), ca=Math.cos(ang), sa=Math.sin(ang);
  var m=metrosPorGrau(anc&&anc.lat);
  var leste=(num(lng)-num(anc&&anc.lng))*m.mlng;
  var norte=(num(lat)-num(anc&&anc.lat))*m.mlat;
  return { x: leste*ca + norte*sa, y: -leste*sa + norte*ca };
}

/* Distância do ponto até o retângulo da parcela, e a folga até a borda.
   dist  = 0 quando está dentro; em metros, quando está fora.
   folga = positiva dentro (o quanto sobra até a borda mais próxima),
           negativa fora. É ela que decide se a precisão do GPS resolve. */
function _relacaoComParcela(x,y,p){
  var dx=Math.max(p.x-x, 0, x-(p.x+p.w));
  var dy=Math.max(p.y-y, 0, y-(p.y+p.h));
  return {
    dist: Math.sqrt(dx*dx+dy*dy),
    folga: Math.min(x-p.x, (p.x+p.w)-x, y-p.y, (p.y+p.h)-y)
  };
}

/* Metro escrito como se escreve em português: vírgula, e uma casa só
   enquanto ela significa alguma coisa. Acima de 10 m o decímetro é ruído. */
function _m(v){
  var n=(Math.abs(v)<10) ? (Math.round(v*10)/10) : Math.round(v);
  return String(n).replace('.',',');
}
/* A lista de candidatas no letreiro para no terceiro nome. Quem está no campo
   com o celular na mão lê três; a partir daí a informação é outra — "o sinal
   não serve aqui" — e é essa que precisa caber na tela. A lista completa
   continua vindo em `candidatas`, para quem desenha o mapa. */
function _lista(ps){
  var n=ps.map(nomeDaParcela);
  if(n.length<2) return n.join('');
  if(n.length>3) return n.slice(0,3).join(', ')+' e mais '+(n.length-3);
  return n.slice(0,-1).join(', ')+' ou '+n[n.length-1];
}

/* A RESPOSTA. Entra a leitura do aparelho (lat, lng e a precisão que ele
   declarou) e sai o veredito, com os candidatos quando a leitura não separa:

     dentro   o erro do GPS cabe inteiro dentro desta parcela
     incerta  caiu numa parcela, mas o erro alcança a vizinha
     vao      está no carreador ou no espaçamento — onde se anda, aliás
     fora     está fora do croqui; a parcela mais próxima vai junto, com a
              distância, que é o que serve para caminhar até ela            */
function ondeEstou(lat,lng,acc,g,anc){
  if(!g||!g.parcelas||!g.parcelas.length){
    return {nivel:'fora', parcela:null, candidatas:[], folga:0, distancia:0,
            precisao:num(acc), texto:'Sem croqui desenhado não há parcela para localizar.'};
  }
  var a=num(acc), loc=metrosLocais(lat,lng,anc);
  var dentro=null, folga=0, perto=null, dPerto=Infinity, alcance=[];

  g.parcelas.forEach(function(p){
    var r=_relacaoComParcela(loc.x,loc.y,p);
    if(r.dist<=0 && r.folga>=0){ if(!dentro || r.folga>folga){ dentro=p; folga=r.folga; } }
    if(r.dist<dPerto){ dPerto=r.dist; perto=p; }
    if(a>0 && r.dist>0 && r.dist<a) alcance.push({p:p, d:r.dist});
  });
  alcance.sort(function(x,y){ return x.d-y.d; });
  var vizinhas=alcance.map(function(o){ return o.p; });

  if(dentro){
    /* Precisão desconhecida não é precisão boa. Sem o número declarado não dá
       para afirmar que a vizinha está fora do erro — e afirmar mesmo assim
       seria o chute com cara de medida que este motor existe para recusar. */
    if(!(a>0)){
      return {nivel:'incerta', parcela:dentro, candidatas:[dentro], folga:folga, distancia:0, precisao:0,
        texto:'O ponto caiu em '+nomeDaParcela(dentro)+', mas o aparelho não informou a precisão desta leitura: não dá para garantir que a vizinha está fora do erro.'};
    }
    if(folga>=a && !vizinhas.length){
      return {nivel:'dentro', parcela:dentro, candidatas:[dentro], folga:folga, distancia:0, precisao:a,
        texto:'Você está em '+nomeDaParcela(dentro)+' · '+dentro.ordem+'ª no caminho. GPS ±'+_m(a)+' m, e a borda está a '+_m(folga)+' m.'};
    }
    if(vizinhas.length){
      return {nivel:'incerta', parcela:dentro, candidatas:[dentro].concat(vizinhas), folga:folga, distancia:0, precisao:a,
        texto:'GPS ±'+_m(a)+' m com a borda a '+_m(folga)+' m: pode ser '+_lista([dentro].concat(vizinhas))+
              '. Ande para o meio da parcela ou confira a estaca antes de lançar.'};
    }
    /* Encostado na borda EXTERNA do croqui: não há parcela vizinha dentro do
       erro, mas há o lado de fora. Dizer "você está em 1A" aqui seria afirmar
       que a pessoa está no ensaio quando a leitura admite que ela esteja na
       rua ao lado — e é a mesma mentira, só que para fora. */
    return {nivel:'incerta', parcela:dentro, candidatas:[dentro], folga:folga, distancia:0, precisao:a,
      texto:'O ponto caiu em '+nomeDaParcela(dentro)+', mas a borda do croqui está a '+_m(folga)+
            ' m e o GPS erra ±'+_m(a)+' m: com esta leitura você também pode estar fora do ensaio.'};
  }

  var noRetangulo=(loc.x>=0 && loc.x<=num(g.largura) && loc.y>=0 && loc.y<=num(g.comprimento));
  var cands=vizinhas.slice();
  if(perto && cands.indexOf(perto)<0) cands.unshift(perto);
  if(noRetangulo){
    return {nivel:'vao', parcela:null, candidatas:cands, folga:0, distancia:dPerto, precisao:a,
      texto:'Você está no vão entre as parcelas — a mais perto é '+nomeDaParcela(perto)+', a '+_m(dPerto)+' m.'};
  }
  return {nivel:'fora', parcela:null, candidatas:cands, folga:0, distancia:dPerto, precisao:a,
    texto:'Você está a '+_m(dPerto)+' m do croqui. A parcela mais próxima é '+nomeDaParcela(perto)+'.'};
}

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
  qualidadeDaAncora:qualidadeDaAncora,
  nomeDaParcela:nomeDaParcela,
  metrosLocais:metrosLocais,
  ondeEstou:ondeEstou
};
if(typeof module==='object'&&module.exports) module.exports=api;
root.CroquiCore=api;
})(typeof self!=='undefined'?self:this);
