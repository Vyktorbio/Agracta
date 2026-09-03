/* ============================================================================
   BBCHCore — fenologia para as culturas que se planta no Brasil
   ----------------------------------------------------------------------------
   A v186 tirou a mentira: culturas sem escala própria pararam de receber, em
   silêncio, os estádios de outra cultura. Mas deixou um buraco — eucalipto,
   seringueira e companhia ficaram sem nada, e "sem nada" não serve para quem
   precisa registrar em que estádio aplicou.

   O que fecha o buraco sem voltar a adivinhar é uma coisa que já existe e
   estava sendo ignorada: a BBCH tem uma ESCALA GERAL publicada, feita
   exatamente para a planta que não tem monografia própria. Ela descreve os dez
   estádios principais em termos genéricos — "primeiras flores abertas", "50% do
   tamanho final do fruto" — sem rótulo de cultura nenhuma.

   Isso não é emprestar a escala do citros para o eucalipto. É usar a escala que
   a norma define para esse caso.

   TRÊS NÍVEIS, SEMPRE DECLARADOS

     propria  A cultura tem monografia BBCH sua. Soja, milho, algodão, videira,
              batata, café, arroz.
     grupo    A própria BBCH agrupa: cereais de inverno (trigo, cevada, aveia,
              centeio, triticale) compartilham UMA escala oficial; pomáceas
              (maçã, pera) idem; caroços, brássicas, cucurbitáceas idem.
              Não é aproximação — é o recorte da norma.
     geral    Escala geral da BBCH. Vale para qualquer planta, e é isso que ela
              declara ser. Os rótulos são genéricos de propósito.

   O nível viaja com a escala e aparece na tela. Quem registra sabe o que está
   escolhendo; quem audita depois sabe o que foi escolhido.

   REGRA QUE NÃO SE QUEBRA: nenhuma cultura recebe os rótulos de OUTRA cultura.
   Ou tem a sua, ou tem a do grupo a que a norma a atribui, ou tem a geral.
   ============================================================================ */
(function(raiz){
  'use strict';
  var VERSION='1.0.0';

  function E(code,label,fase,equiv){ return {code:code,label:label,fase:fase,equiv:equiv||''}; }

  /* ---- escalas que já existiam no Agracta, movidas para cá sem alterar um
     estádio. O que mudou foi o endereço: motor puro, testável fora do
     navegador, como os demais vendor/*-core.js. ---- */
  var SOJA=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência (hipocótilo rompe o solo)","Germinação","VE"),
    E("10","10 — Cotilédones completamente abertos","Des. folhas","VC"),
    E("11","11 — 1º par de folhas unifolioladas","Des. folhas","V1"),
    E("12","12 — 1ª folha trifoliolada","Des. folhas","V2"),
    E("13","13 — 2ª folha trifoliolada","Des. folhas","V3"),
    E("14","14 — 3ª folha trifoliolada","Des. folhas","V4"),
    E("15","15 — 4ª folha trifoliolada","Des. folhas","V5"),
    E("16","16 — 5ª folha trifoliolada","Des. folhas","V6"),
    E("19","19 — 8+ folhas trifolioladas","Des. folhas","V7+"),
    E("51","51 — Primórdios florais visíveis","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração","R1"),
    E("61","61 — Início floração (10% abertas)","Floração","R1"),
    E("65","65 — Plena floração (50% abertas)","Floração","R2"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Vagens começam a desenvolver (10%)","Vagens","R3"),
    E("75","75 — 50% das vagens no tamanho final","Vagens","R4"),
    E("79","79 — Quase todas vagens no tamanho final","Vagens","R4/R5"),
    E("81","81 — Início enchimento de grãos (10%)","Grãos","R5.1"),
    E("85","85 — 50% dos grãos enchendo vagens","Grãos","R5.3"),
    E("89","89 — Grãos atingiram tamanho final","Grãos","R6"),
    E("91","91 — Início maturação (10% vagens maduras)","Maturação","R7"),
    E("95","95 — 50% das folhas amareladas ou caídas","Maturação","R7"),
    E("97","97 — Plantas maduras/secas","Maturação","R8"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var ALGODAO=[
    E("00","00 — Semente seca","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("10","10 — Cotilédones abertos","Des. folhas"),
    E("11","11 — 1ª folha verdadeira","Des. folhas"),
    E("13","13 — 3 folhas verdadeiras","Des. folhas"),
    E("15","15 — 5 folhas verdadeiras","Des. folhas"),
    E("19","19 — 9+ folhas verdadeiras","Des. folhas"),
    E("51","51 — 1º botão floral visível (square)","Botões","B1"),
    E("55","55 — Botões em ramos secundários","Botões"),
    E("59","59 — 1º botão prestes a abrir","Botões"),
    E("60","60 — Primeiras flores abertas","Floração","F1"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — 1ª maçã formada","Maçãs","M1"),
    E("75","75 — Maçãs em metade tamanho final","Maçãs"),
    E("79","79 — Maçãs no tamanho final","Maçãs"),
    E("81","81 — 10% das maçãs abertas","Abertura"),
    E("85","85 — 50% das maçãs abertas","Abertura"),
    E("89","89 — Maturação completa (90%+ abertas)","Maturação"),
    E("95","95 — 50% folhas caídas (desfolha)","Senescência"),
    E("97","97 — Planta seca/morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var CAFE=[
    E("00","00 — Gema dormente","Brotação"),
    E("07","07 — Início brotação","Brotação"),
    E("09","09 — Gemas abertas","Brotação"),
    E("11","11 — 1º par de folhas verdadeiras","Des. folhas"),
    E("15","15 — 5 pares de folhas","Des. folhas"),
    E("19","19 — 9+ pares de folhas","Des. folhas"),
    E("31","31 — Alongamento dos ramos","Des. ramos"),
    E("51","51 — Botões florais visíveis","Inflorescência"),
    E("55","55 — Botões grão de chumbo","Inflorescência"),
    E("59","59 — Botões prontos para abrir","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("67","67 — Pétalas murchando","Floração"),
    E("69","69 — Fim floração (queda pétalas)","Floração"),
    E("71","71 — Chumbinho (frutos pequenos verdes)","Frutos"),
    E("75","75 — Frutos em expansão (meio tamanho)","Frutos"),
    E("79","79 — Frutos no tamanho final, verdes","Frutos"),
    E("81","81 — Início maturação (verde-cana)","Maturação"),
    E("85","85 — Frutos cereja (maduros vermelhos)","Maturação"),
    E("87","87 — Frutos passa (escuros)","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("97","97 — Pós-colheita (repouso)","Repouso"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var MILHO=[
    E("00","00 — Semente seca","Germinação"),
    E("09","09 — Emergência","Germinação","VE"),
    E("11","11 — 1ª folha expandida","Des. folhas","V1"),
    E("13","13 — 3 folhas","Des. folhas","V3"),
    E("15","15 — 5 folhas","Des. folhas","V5"),
    E("17","17 — 7 folhas","Des. folhas","V7"),
    E("19","19 — 9+ folhas","Des. folhas","V9+"),
    E("32","32 — 2 nós visíveis","Alongamento"),
    E("34","34 — 4 nós visíveis","Alongamento"),
    E("51","51 — Pendão emerge da bainha","Inflorescência","VT"),
    E("55","55 — Metade do pendão visível","Inflorescência"),
    E("59","59 — Pendão totalmente emergido","Inflorescência"),
    E("61","61 — Início liberação de pólen","Floração"),
    E("63","63 — Estigmas visíveis","Floração","R1"),
    E("65","65 — Plena polinização","Floração"),
    E("69","69 — Fim floração (estigmas secando)","Floração"),
    E("71","71 — Grãos em bolha (16% MS)","Grãos","R2"),
    E("73","73 — Leitoso inicial","Grãos","R3"),
    E("75","75 — Leitoso pleno (40% MS)","Grãos","R4"),
    E("79","79 — Grãos tamanho final","Grãos"),
    E("83","83 — Pastoso mole (45% MS)","Maturação","R5"),
    E("85","85 — Pastoso duro (55% MS)","Maturação"),
    E("87","87 — Camada preta (maturação fisiológica)","Maturação","R6"),
    E("89","89 — Maturação completa (grão duro)","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var FEIJAO=[
    E("00","00 — Semente seca","Germinação"),
    E("09","09 — Emergência","Germinação","V1"),
    E("10","10 — Cotilédones abertos","Des. folhas","V2"),
    E("11","11 — 1ª folha trifoliolada","Des. folhas","V3"),
    E("13","13 — 3ª folha trifoliolada","Des. folhas","V4"),
    E("15","15 — 5ª folha trifoliolada","Des. folhas"),
    E("19","19 — 9+ folhas trifolioladas","Des. folhas"),
    E("51","51 — Botões florais visíveis","Inflorescência","R5"),
    E("60","60 — Primeiras flores abertas","Floração","R6"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim floração","Floração"),
    E("71","71 — Primeiras vagens formadas","Vagens","R7"),
    E("75","75 — Vagens metade tamanho","Vagens"),
    E("79","79 — Vagens tamanho final","Vagens","R8"),
    E("81","81 — Início maturação (10%)","Maturação","R9"),
    E("85","85 — 50% vagens maduras","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("97","97 — Planta seca","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var TOMATE=[
    E("00","00 — Semente seca","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("11","11 — 1ª folha verdadeira","Des. folhas"),
    E("15","15 — 5 folhas verdadeiras","Des. folhas"),
    E("19","19 — 9+ folhas verdadeiras","Des. folhas"),
    E("51","51 — 1º cacho floral visível","Inflorescência"),
    E("55","55 — Botões fechados","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim floração","Floração"),
    E("71","71 — Primeiros frutos formados","Frutos"),
    E("75","75 — Frutos metade tamanho","Frutos"),
    E("79","79 — Frutos tamanho final (verdes)","Frutos"),
    E("81","81 — Início maturação (1º fruto colorindo)","Maturação"),
    E("85","85 — 50% frutos coloridos","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var CANA=[
    E("00","00 — Tolete/muda dormente","Brotação"),
    E("09","09 — Emergência de broto","Brotação"),
    E("12","12 — 2 folhas","Des. folhas"),
    E("15","15 — 5 folhas","Des. folhas"),
    E("19","19 — 9+ folhas","Des. folhas"),
    E("21","21 — Início perfilhamento","Perfilhamento"),
    E("25","25 — Perfilhamento pleno","Perfilhamento"),
    E("29","29 — Fim perfilhamento","Perfilhamento"),
    E("31","31 — Início alongamento colmos","Alongamento"),
    E("35","35 — Colmos em alongamento pleno","Alongamento"),
    E("39","39 — Colmos atingem altura final","Alongamento"),
    E("51","51 — Início emissão do pendão","Florescimento"),
    E("65","65 — Plena florada (se ocorrer)","Florescimento"),
    E("81","81 — Início maturação (acúmulo sacarose)","Maturação"),
    E("85","85 — Maturação avançada","Maturação"),
    E("89","89 — Maturação plena (ponto de corte)","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var MORANGO=[
    E("00","00 — Muda dormente","Plantio"),
    E("09","09 — Pegamento da muda","Plantio"),
    E("11","11 — 1ª folha nova","Des. folhas"),
    E("15","15 — 5 folhas","Des. folhas"),
    E("19","19 — 9+ folhas","Des. folhas"),
    E("51","51 — Botões florais visíveis","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim floração","Floração"),
    E("71","71 — Primeiros frutos formados","Frutos"),
    E("79","79 — Frutos tamanho final (verdes)","Frutos"),
    E("85","85 — 50% frutos vermelhos","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var MELAO=[
    E("00","00 — Semente seca","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("11","11 — 1ª folha verdadeira","Des. folhas"),
    E("15","15 — 5 folhas","Des. folhas"),
    E("19","19 — 9+ folhas","Des. folhas"),
    E("21","21 — 1ª ramificação lateral","Ramificação"),
    E("51","51 — Botões florais visíveis","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("71","71 — Primeiros frutos formados","Frutos"),
    E("75","75 — Frutos metade tamanho","Frutos"),
    E("79","79 — Frutos tamanho final","Frutos"),
    E("81","81 — Início maturação","Maturação"),
    E("85","85 — Maturação avançada","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var PASTAGEM=[
    E("00","00 — Dormência/pós-pastejo","Rebrote"),
    E("09","09 — Emergência de brotos","Rebrote"),
    E("21","21 — Início perfilhamento","Perfilhamento"),
    E("25","25 — Perfilhamento pleno","Perfilhamento"),
    E("31","31 — Alongamento dos colmos","Alongamento"),
    E("39","39 — Altura de pré-pastejo atingida","Alongamento"),
    E("51","51 — Emergência da inflorescência","Florescimento"),
    E("65","65 — Plena floração","Florescimento"),
    E("85","85 — Sementes em maturação","Maturação"),
    E("92","92 — Senescência parcial","Senescência"),
    E("99","99 — Pós-pastejo/corte","Corte")
  ];
  var CITROS=[
    E("00","00 — Gemas dormentes","Repouso"),
    E("07","07 — Início brotação","Brotação"),
    E("09","09 — Brotações verdes visíveis","Brotação"),
    E("11","11 — 1ª folha nova","Des. folhas"),
    E("19","19 — Folhas novas maduras","Des. folhas"),
    E("51","51 — Botões florais visíveis","Inflorescência"),
    E("59","59 — Botões quase abrindo","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Queda de pétalas","Floração"),
    E("71","71 — Chumbinho (frutos pequenos)","Frutos"),
    E("75","75 — Frutos metade tamanho","Frutos"),
    E("79","79 — Frutos tamanho final (verdes)","Frutos"),
    E("81","81 — Início mudança de cor","Maturação"),
    E("85","85 — Cor típica da cultivar","Maturação"),
    E("89","89 — Maturação plena (ponto colheita)","Maturação"),
    E("99","99 — Fruto colhido","Colheita")
  ];
  var CEREAIS=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("07","07 — Coleóptilo emergiu","Germinação"),
    E("09","09 — Emergência (1ª folha rompe o coleóptilo)","Germinação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("12","12 — 2ª folha desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — Início do perfilhamento (1º perfilho)","Perfilhamento"),
    E("25","25 — 5 perfilhos visíveis","Perfilhamento"),
    E("29","29 — Fim do perfilhamento (nº máximo)","Perfilhamento"),
    E("30","30 — Início da elongação do colmo","Elongação"),
    E("31","31 — 1º nó detectável","Elongação"),
    E("32","32 — 2º nó detectável","Elongação"),
    E("37","37 — Folha bandeira apenas visível","Elongação"),
    E("39","39 — Lígula da folha bandeira visível","Elongação"),
    E("41","41 — Início do emborrachamento","Emborrachamento"),
    E("45","45 — Emborrachamento pleno (bainha inchada)","Emborrachamento"),
    E("49","49 — Primeiras aristas visíveis","Emborrachamento"),
    E("51","51 — Início do espigamento","Espigamento"),
    E("55","55 — Metade da espiga emergida","Espigamento"),
    E("59","59 — Fim do espigamento","Espigamento"),
    E("61","61 — Início da floração (antese)","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Grão aquoso","Enchimento"),
    E("75","75 — Grão leitoso","Enchimento"),
    E("83","83 — Massa mole (início)","Maturação"),
    E("85","85 — Massa mole","Maturação"),
    E("87","87 — Massa dura (ponto de maturação fisiológica)","Maturação"),
    E("89","89 — Maturação plena (grão duro)","Maturação"),
    E("92","92 — Sobrematuração","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];
  var ARROZ=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — Início do perfilhamento","Perfilhamento"),
    E("25","25 — 5 perfilhos visíveis","Perfilhamento"),
    E("29","29 — Fim do perfilhamento","Perfilhamento"),
    E("30","30 — Início da elongação do colmo","Elongação"),
    E("32","32 — 2º nó detectável","Elongação"),
    E("37","37 — Folha bandeira apenas visível","Elongação"),
    E("41","41 — Início do emborrachamento","Emborrachamento"),
    E("45","45 — Emborrachamento pleno","Emborrachamento"),
    E("51","51 — Início da emissão da panícula","Emissão da panícula"),
    E("55","55 — Metade da panícula emergida","Emissão da panícula"),
    E("59","59 — Panícula totalmente emergida","Emissão da panícula"),
    E("61","61 — Início da floração","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Grão aquoso","Enchimento"),
    E("75","75 — Grão leitoso","Enchimento"),
    E("83","83 — Massa mole","Maturação"),
    E("87","87 — Massa dura","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("92","92 — Sobrematuração","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- BATATA (monografia própria). O tubérculo é o órgão colhível, e ele tem
     estádios de formação e enchimento que nenhuma outra escala descreve. ---- */
  var BATATA=[
    E("00","00 — Tubérculo-semente em dormência","Brotação"),
    E("01","01 — Início da brotação do tubérculo","Brotação"),
    E("05","05 — Brotos com 2 mm","Brotação"),
    E("09","09 — Emergência das plantas","Brotação"),
    E("11","11 — 1ª folha da haste principal desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — 1ª haste lateral visível","Ramificação"),
    E("23","23 — 3 hastes laterais visíveis","Ramificação"),
    E("31","31 — Início do fechamento entre plantas na linha","Elongação"),
    E("35","35 — 50% das plantas se tocando na linha","Elongação"),
    E("39","39 — Fechamento completo entre linhas","Elongação"),
    E("40","40 — Início da tuberização (estolões engrossando)","Tuberização"),
    E("43","43 — Tubérculos com até 30% do tamanho final","Tuberização"),
    E("45","45 — Tubérculos com 50% do tamanho final","Tuberização"),
    E("47","47 — Tubérculos com 70% do tamanho final","Tuberização"),
    E("49","49 — Tubérculos no tamanho final","Tuberização"),
    E("51","51 — Primeiros botões florais visíveis","Inflorescência"),
    E("59","59 — Primeiras pétalas visíveis","Inflorescência"),
    E("61","61 — Início da floração (10% das flores abertas)","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Primeiras bagas (frutos) formadas","Frutificação"),
    E("81","81 — Início da senescência da folhagem","Maturação"),
    E("89","89 — Pele do tubérculo firme, folhagem seca","Maturação"),
    E("91","91 — Parte aérea totalmente seca","Senescência"),
    E("97","97 — Parte aérea morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- VIDEIRA (monografia própria). A brotação a partir de gema dormente e o
     fechamento do cacho são estádios que só a videira tem. ---- */
  var UVA=[
    E("00","00 — Gema dormente (dormência de inverno)","Brotação"),
    E("01","01 — Início do intumescimento da gema","Brotação"),
    E("05","05 — Gema algodão (lã visível)","Brotação"),
    E("07","07 — Ponta verde visível","Brotação"),
    E("09","09 — Brotação: folhas iniciais separando-se","Brotação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("53","53 — Inflorescências claramente visíveis","Inflorescência"),
    E("55","55 — Inflorescências alongadas, flores compactadas","Inflorescência"),
    E("57","57 — Inflorescências desenvolvidas, flores separadas","Inflorescência"),
    E("60","60 — Primeiras capuchas soltas","Floração"),
    E("61","61 — Início da floração (10% das capuchas caídas)","Floração"),
    E("65","65 — Plena floração (50% das capuchas caídas)","Floração"),
    E("68","68 — 80% das capuchas caídas","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Frutificação efetiva: bagas tamanho de chumbinho","Frutificação"),
    E("73","73 — Bagas tamanho de ervilha","Frutificação"),
    E("75","75 — Bagas com 50% do tamanho final","Frutificação"),
    E("77","77 — Bagas começando a se tocar","Frutificação"),
    E("79","79 — Cacho fechado","Frutificação"),
    E("81","81 — Início da maturação (véraison): bagas amolecendo","Maturação"),
    E("83","83 — Bagas com cor típica avançando","Maturação"),
    E("85","85 — Amolecimento das bagas","Maturação"),
    E("89","89 — Maturação plena (ponto de colheita)","Maturação"),
    E("91","91 — Fim do crescimento dos ramos, folhas verdes","Senescência"),
    E("93","93 — Início da queda das folhas","Senescência"),
    E("97","97 — Fim da queda das folhas: dormência","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- GIRASSOL (monografia própria). O capítulo tem estádios próprios de
     abertura e de inclinação que nenhuma outra escala descreve. ---- */
  var GIRASSOL=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência (cotilédones rompem o solo)","Germinação"),
    E("10","10 — Cotilédones completamente abertos","Des. folhas"),
    E("12","12 — 2º par de folhas desdobrado","Des. folhas"),
    E("14","14 — 4 pares de folhas desdobrados","Des. folhas"),
    E("18","18 — 8 pares de folhas desdobrados","Des. folhas"),
    E("31","31 — Início da elongação do caule","Elongação"),
    E("35","35 — Caule com 50% da altura final","Elongação"),
    E("39","39 — Altura final atingida","Elongação"),
    E("51","51 — Botão floral visível entre as folhas terminais","Inflorescência"),
    E("55","55 — Botão floral separado das folhas (estrela)","Inflorescência"),
    E("57","57 — Botão floral inclinando-se","Inflorescência"),
    E("59","59 — Brácteas abrindo, flores liguladas visíveis","Inflorescência"),
    E("61","61 — Início da floração: flores liguladas abertas","Floração"),
    E("63","63 — 30% das flores tubulares abertas","Floração"),
    E("65","65 — Plena floração (50% das flores tubulares)","Floração"),
    E("69","69 — Fim da floração: flores liguladas secando","Floração"),
    E("71","71 — Aquênios no tamanho final, dorso do capítulo verde","Enchimento"),
    E("75","75 — Aquênios com 50% da matéria seca","Enchimento"),
    E("79","79 — Aquênios no teor final de matéria seca","Enchimento"),
    E("81","81 — Dorso do capítulo amarelo-claro","Maturação"),
    E("85","85 — Dorso do capítulo amarelo-escuro, brácteas marrons","Maturação"),
    E("87","87 — Maturação fisiológica: dorso marrom","Maturação"),
    E("89","89 — Maturação plena: aquênios secos e duros","Maturação"),
    E("97","97 — Planta morta e seca","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- CANOLA / COLZA (monografia própria: Brassica napus oleaginosa). Não é a
     escala das brássicas de folha: aqui o órgão colhível é a síliqua. ---- */
  var CANOLA=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("10","10 — Cotilédones abertos","Des. folhas"),
    E("12","12 — 2 folhas verdadeiras desdobradas","Des. folhas"),
    E("14","14 — 4 folhas desdobradas","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("20","20 — Sem ramificações","Ramificação"),
    E("21","21 — 1ª ramificação lateral visível","Ramificação"),
    E("25","25 — 5 ramificações laterais","Ramificação"),
    E("30","30 — Início da elongação da haste","Elongação"),
    E("32","32 — 2 entrenós visíveis","Elongação"),
    E("39","39 — Fim da elongação","Elongação"),
    E("51","51 — Botões florais fechados, entre as folhas","Inflorescência"),
    E("55","55 — Botões florais individuais visíveis, ainda fechados","Inflorescência"),
    E("59","59 — Primeiras pétalas visíveis, botões amarelos","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("61","61 — Início da floração (10% das flores abertas)","Floração"),
    E("65","65 — Plena floração (50% abertas)","Floração"),
    E("67","67 — Floração declinando, pétalas caindo","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — 10% das síliquas no tamanho final","Frutificação"),
    E("75","75 — 50% das síliquas no tamanho final","Frutificação"),
    E("79","79 — Quase todas as síliquas no tamanho final","Frutificação"),
    E("81","81 — Início da maturação: 10% das síliquas maduras","Maturação"),
    E("85","85 — 50% das síliquas maduras, grãos escurecendo","Maturação"),
    E("89","89 — Maturação plena: grãos pretos e duros","Maturação"),
    E("97","97 — Planta morta e seca","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- MANDIOCA (monografia própria). O órgão colhível é a raiz tuberosa, e o
     ciclo é plurianual: não há maturação de fruto que faça sentido aqui. ---- */
  var MANDIOCA=[
    E("00","00 — Maniva (estaca) dormente","Brotação"),
    E("05","05 — Início da emissão de raízes na maniva","Brotação"),
    E("09","09 — Emergência das brotações","Brotação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — 1ª ramificação da haste","Ramificação"),
    E("25","25 — 5 ramificações","Ramificação"),
    E("31","31 — Início da elongação da haste principal","Elongação"),
    E("35","35 — Haste com 50% da altura final","Elongação"),
    E("39","39 — Altura final atingida","Elongação"),
    E("41","41 — Início do engrossamento das raízes","Tuberização"),
    E("45","45 — Raízes com 50% do peso final","Tuberização"),
    E("49","49 — Raízes no tamanho de colheita","Tuberização"),
    E("51","51 — Primórdios florais visíveis","Inflorescência"),
    E("61","61 — Início da floração","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("81","81 — Início da senescência foliar","Maturação"),
    E("89","89 — Raízes no ponto de colheita","Maturação"),
    E("93","93 — Queda das folhas (repouso da seca)","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- AMENDOIM (monografia própria). O ginóforo que enterra a vagem é
     exclusivo: nenhuma outra leguminosa tem esse estádio. ---- */
  var AMENDOIM=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência (cotilédones no nível do solo)","Germinação"),
    E("10","10 — Cotilédones abertos","Des. folhas"),
    E("11","11 — 1ª folha tetrafoliolada desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — 1ª ramificação lateral","Ramificação"),
    E("25","25 — 5 ramificações laterais","Ramificação"),
    E("51","51 — Primeiros botões florais visíveis","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("61","61 — Início da floração","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Primeiros ginóforos visíveis","Frutificação"),
    E("73","73 — Ginóforos penetrando o solo","Frutificação"),
    E("75","75 — Vagens com 50% do tamanho final","Frutificação"),
    E("79","79 — Vagens no tamanho final","Frutificação"),
    E("81","81 — Início da maturação: interior das vagens escurecendo","Maturação"),
    E("85","85 — 50% das vagens maduras","Maturação"),
    E("89","89 — Maturação plena (ponto de arranquio)","Maturação"),
    E("97","97 — Planta seca","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- POMÁCEAS (maçã, pera, marmelo). Grupo da própria norma: as três
     compartilham a monografia, incluindo os estádios de ponta verde e ponta
     rosada que orientam o manejo de inverno. ---- */
  var POMACEAS=[
    E("00","00 — Gema dormente","Brotação"),
    E("01","01 — Início do intumescimento da gema","Brotação"),
    E("03","03 — Fim do intumescimento, escamas separando","Brotação"),
    E("07","07 — Ponta verde visível","Brotação"),
    E("09","09 — Ponta verde de 5 mm","Brotação"),
    E("10","10 — Estádio de orelha de rato","Des. folhas"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — Folhas do ano completamente desenvolvidas","Des. folhas"),
    E("51","51 — Gemas florais inchadas","Inflorescência"),
    E("53","53 — Botões florais visíveis (ponta verde do cacho)","Inflorescência"),
    E("55","55 — Botões florais individuais separados","Inflorescência"),
    E("56","56 — Botão rosado: pétalas alongando","Inflorescência"),
    E("57","57 — Balão: pétalas ainda fechadas","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("61","61 — Início da floração (10% abertas)","Floração"),
    E("65","65 — Plena floração (50% abertas, 1ªs pétalas caindo)","Floração"),
    E("67","67 — Flores murchando, maioria das pétalas caída","Floração"),
    E("69","69 — Fim da floração: queda das pétalas completa","Floração"),
    E("71","71 — Queda fisiológica: frutos até 10 mm","Frutificação"),
    E("73","73 — Segunda queda fisiológica","Frutificação"),
    E("74","74 — Frutos com até 40% do tamanho final","Frutificação"),
    E("75","75 — Frutos com 50% do tamanho final","Frutificação"),
    E("77","77 — Frutos com 70% do tamanho final","Frutificação"),
    E("79","79 — Frutos com 90% do tamanho final","Frutificação"),
    E("81","81 — Início da coloração dos frutos","Maturação"),
    E("85","85 — Coloração avançada, cor típica da cultivar","Maturação"),
    E("87","87 — Frutos maduros para a colheita","Maturação"),
    E("89","89 — Maturação plena (aroma e firmeza de colheita)","Maturação"),
    E("91","91 — Fim do crescimento dos ramos, folhas verdes","Senescência"),
    E("93","93 — Início da queda das folhas","Senescência"),
    E("97","97 — Fim da queda das folhas: dormência","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- CAROÇOS (pêssego, nectarina, ameixa, cereja). Grupo da norma. O
     endurecimento do caroço é o estádio que separa este grupo das pomáceas. -- */
  var CAROCOS=[
    E("00","00 — Gema dormente","Brotação"),
    E("01","01 — Início do intumescimento da gema","Brotação"),
    E("07","07 — Início da brotação","Brotação"),
    E("09","09 — Ponta verde visível","Brotação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — Folhas do ano completamente desenvolvidas","Des. folhas"),
    E("51","51 — Gemas florais inchadas","Inflorescência"),
    E("53","53 — Escamas abrindo, pontas das flores visíveis","Inflorescência"),
    E("55","55 — Botões florais individuais visíveis, fechados","Inflorescência"),
    E("57","57 — Cálice aberto, pétalas visíveis (balão)","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("61","61 — Início da floração (10% abertas)","Floração"),
    E("65","65 — Plena floração (50% abertas)","Floração"),
    E("67","67 — Flores murchando, pétalas caindo","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Ovário engrossando, queda fisiológica","Frutificação"),
    E("73","73 — Segunda queda fisiológica","Frutificação"),
    E("75","75 — Frutos com 50% do tamanho final","Frutificação"),
    E("77","77 — Endurecimento do caroço","Frutificação"),
    E("79","79 — Frutos com 90% do tamanho final","Frutificação"),
    E("81","81 — Início da coloração dos frutos","Maturação"),
    E("85","85 — Coloração avançada","Maturação"),
    E("87","87 — Frutos maduros para a colheita","Maturação"),
    E("89","89 — Maturação plena","Maturação"),
    E("91","91 — Fim do crescimento dos ramos","Senescência"),
    E("93","93 — Início da queda das folhas","Senescência"),
    E("97","97 — Dormência","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- BRÁSSICAS DE FOLHA E INFLORESCÊNCIA (repolho, couve, couve-flor,
     brócolis). Grupo da norma. O órgão colhível é a cabeça ou a inflorescência
     — por isso o estádio 4 é o que importa, e não a maturação de fruto. ---- */
  var BRASSICAS=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("10","10 — Cotilédones completamente abertos","Des. folhas"),
    E("11","11 — 1ª folha verdadeira desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("41","41 — Início da formação da cabeça ou da inflorescência","Órgãos colhíveis"),
    E("43","43 — Órgão colhível com 30% do tamanho final","Órgãos colhíveis"),
    E("45","45 — Órgão colhível com 50% do tamanho final","Órgãos colhíveis"),
    E("47","47 — Órgão colhível com 70% do tamanho final","Órgãos colhíveis"),
    E("49","49 — Órgão colhível no tamanho de colheita","Órgãos colhíveis"),
    E("51","51 — Primórdios florais visíveis (pendoamento)","Inflorescência"),
    E("55","55 — Botões florais individuais visíveis","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Primeiras síliquas formadas","Frutificação"),
    E("79","79 — Síliquas no tamanho final","Frutificação"),
    E("81","81 — Início da maturação das sementes","Maturação"),
    E("89","89 — Sementes maduras","Maturação"),
    E("97","97 — Planta morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- BULBOSAS (cebola, alho, alho-poró). Grupo da norma. O bulbo é o órgão
     colhível e tem seus próprios estádios de formação e de tombamento. ---- */
  var BULBOSAS=[
    E("00","00 — Semente ou bulbilho seco","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência (cotilédone em alça)","Germinação"),
    E("11","11 — 1ª folha verdadeira visível","Des. folhas"),
    E("13","13 — 3ª folha visível","Des. folhas"),
    E("15","15 — 5ª folha visível","Des. folhas"),
    E("19","19 — 9 ou mais folhas visíveis","Des. folhas"),
    E("41","41 — Início do engrossamento do bulbo","Bulbificação"),
    E("43","43 — Bulbo com 30% do diâmetro final","Bulbificação"),
    E("45","45 — Bulbo com 50% do diâmetro final","Bulbificação"),
    E("47","47 — Bulbo com 70% do diâmetro final","Bulbificação"),
    E("48","48 — Bulbo no diâmetro final, folhas ainda eretas","Bulbificação"),
    E("49","49 — Tombamento (estalo) da parte aérea","Bulbificação"),
    E("51","51 — Haste floral visível (pendoamento)","Inflorescência"),
    E("55","55 — Espata da inflorescência visível","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("81","81 — Início da secagem da parte aérea","Maturação"),
    E("89","89 — Bulbo maduro, pele seca (ponto de colheita)","Maturação"),
    E("97","97 — Parte aérea seca","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- RAÍZES E TUBEROSAS (cenoura, beterraba, rabanete, nabo). Grupo da
     norma. Colhe-se a raiz: pendoamento aqui é PERDA, não etapa desejada. ---- */
  var RAIZES=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("10","10 — Cotilédones abertos","Des. folhas"),
    E("11","11 — 1ª folha verdadeira desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("41","41 — Início do engrossamento da raiz","Engrossamento"),
    E("43","43 — Raiz com 30% do diâmetro final","Engrossamento"),
    E("45","45 — Raiz com 50% do diâmetro final","Engrossamento"),
    E("47","47 — Raiz com 70% do diâmetro final","Engrossamento"),
    E("49","49 — Raiz no diâmetro de colheita","Engrossamento"),
    E("51","51 — Haste floral visível (pendoamento — perda comercial)","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("81","81 — Início da maturação das sementes","Maturação"),
    E("89","89 — Sementes maduras","Maturação"),
    E("97","97 — Planta morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- FOLHOSAS (alface, rúcula, espinafre, agrião). Grupo da norma. Colhe-se
     a folha: a floração é o fim da janela comercial, não o objetivo. ---- */
  var FOLHOSAS=[
    E("00","00 — Semente seca","Germinação"),
    E("05","05 — Radícula emergiu","Germinação"),
    E("09","09 — Emergência","Germinação"),
    E("10","10 — Cotilédones abertos","Des. folhas"),
    E("11","11 — 1ª folha verdadeira desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("41","41 — Início da formação da cabeça (cultivares repolhudas)","Órgãos colhíveis"),
    E("45","45 — Cabeça com 50% do tamanho final","Órgãos colhíveis"),
    E("49","49 — Ponto de colheita","Órgãos colhíveis"),
    E("51","51 — Início do pendoamento (fim da janela comercial)","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("89","89 — Sementes maduras","Maturação"),
    E("97","97 — Planta morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---- BANANEIRA (monografia própria). Ciclo por touceira: o lançamento do
     cacho e a queda das brácteas são estádios que só a Musa tem. ---- */
  var BANANA=[
    E("00","00 — Rizoma ou muda em repouso","Brotação"),
    E("09","09 — Emergência do rebento (filho)","Brotação"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("31","31 — Início da elongação do pseudocaule","Elongação"),
    E("35","35 — Pseudocaule com 50% da altura final","Elongação"),
    E("39","39 — Altura final atingida","Elongação"),
    E("51","51 — Folha-bandeira (folha estreita) emitida","Inflorescência"),
    E("55","55 — Lançamento: inflorescência emergindo do pseudocaule","Inflorescência"),
    E("57","57 — Inflorescência inclinando-se","Inflorescência"),
    E("60","60 — Primeira bráctea abrindo","Floração"),
    E("61","61 — Início da floração: primeiras pencas expostas","Floração"),
    E("65","65 — Plena floração: metade das pencas expostas","Floração"),
    E("69","69 — Fim da floração: todas as pencas expostas","Floração"),
    E("71","71 — Frutos iniciando o engrossamento","Frutificação"),
    E("75","75 — Frutos com 50% do calibre final","Frutificação"),
    E("79","79 — Frutos no calibre final, quinas marcadas","Frutificação"),
    E("81","81 — Início da perda das quinas","Maturação"),
    E("85","85 — Frutos roliços (3/4 gordos)","Maturação"),
    E("89","89 — Ponto de colheita","Maturação"),
    E("99","99 — Cacho colhido","Colheita")
  ];

  /* ---- ABACAXIZEIRO (monografia própria). A indução floral é prática de
     manejo, e o ciclo não tem nada de fruteira de clima temperado. ---- */
  var ABACAXI=[
    E("00","00 — Muda em repouso","Brotação"),
    E("09","09 — Pegamento da muda, primeiras raízes","Brotação"),
    E("11","11 — 1ª folha nova emitida","Des. folhas"),
    E("15","15 — 5ª folha nova emitida","Des. folhas"),
    E("19","19 — Roseta foliar formada","Des. folhas"),
    E("31","31 — Início do crescimento vegetativo acelerado","Elongação"),
    E("39","39 — Planta no porte de indução floral","Elongação"),
    E("51","51 — Diferenciação floral (cone visível no centro)","Inflorescência"),
    E("55","55 — Inflorescência visível acima da roseta","Inflorescência"),
    E("57","57 — Inflorescência no topo do pedúnculo","Inflorescência"),
    E("60","60 — Primeiras flores abertas (base do fruto)","Floração"),
    E("65","65 — Plena floração","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Fruto iniciando o engrossamento","Frutificação"),
    E("75","75 — Fruto com 50% do tamanho final","Frutificação"),
    E("79","79 — Fruto no tamanho final, ainda verde","Frutificação"),
    E("81","81 — Início da coloração da casca","Maturação"),
    E("85","85 — Metade dos frutilhos amarelos","Maturação"),
    E("89","89 — Maturação plena (ponto de colheita)","Maturação"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* ---------------------------------------------------------------------------
     ESCALA GERAL DA BBCH. Publicada para a planta sem monografia própria. Os
     rótulos são genéricos porque têm de valer para qualquer espécie — e é
     justamente essa generalidade que a torna honesta aqui: ela não promete
     descrever um cafeeiro nem um eucalipto em particular. --------------------- */
  var GERAL=[
    E("00","00 — Semente seca ou gema dormente","Germinação/Brotação"),
    E("01","01 — Início da embebição ou do intumescimento da gema","Germinação/Brotação"),
    E("05","05 — Radícula emergiu da semente","Germinação/Brotação"),
    E("07","07 — Início da brotação","Germinação/Brotação"),
    E("09","09 — Emergência ou brotações verdes visíveis","Germinação/Brotação"),
    E("10","10 — Primeiras folhas separando-se","Des. folhas"),
    E("11","11 — 1ª folha desdobrada","Des. folhas"),
    E("13","13 — 3ª folha desdobrada","Des. folhas"),
    E("15","15 — 5ª folha desdobrada","Des. folhas"),
    E("19","19 — 9 ou mais folhas desdobradas","Des. folhas"),
    E("21","21 — 1ª ramificação ou perfilho visível","Ramificação"),
    E("25","25 — 5 ramificações ou perfilhos visíveis","Ramificação"),
    E("29","29 — Fim da ramificação (número máximo)","Ramificação"),
    E("31","31 — Início da elongação (1º entrenó)","Elongação"),
    E("35","35 — 5 entrenós visíveis","Elongação"),
    E("39","39 — Fim da elongação","Elongação"),
    E("41","41 — Início do desenvolvimento das partes vegetativas colhíveis","Órgãos vegetativos"),
    E("45","45 — Partes vegetativas com 50% do tamanho final","Órgãos vegetativos"),
    E("49","49 — Partes vegetativas colhíveis no tamanho final","Órgãos vegetativos"),
    E("51","51 — Primórdios florais ou inflorescência visíveis","Inflorescência"),
    E("55","55 — Botões florais individuais visíveis","Inflorescência"),
    E("59","59 — Primeiras pétalas visíveis, flores ainda fechadas","Inflorescência"),
    E("60","60 — Primeiras flores abertas","Floração"),
    E("61","61 — Início da floração (10% das flores abertas)","Floração"),
    E("65","65 — Plena floração (50% das flores abertas)","Floração"),
    E("69","69 — Fim da floração","Floração"),
    E("71","71 — Frutos ou grãos com 10% do tamanho final","Frutificação"),
    E("75","75 — Frutos ou grãos com 50% do tamanho final","Frutificação"),
    E("79","79 — Frutos ou grãos com 90% do tamanho final","Frutificação"),
    E("81","81 — Início da maturação","Maturação"),
    E("85","85 — Maturação avançada","Maturação"),
    E("89","89 — Maturação plena (ponto de colheita)","Maturação"),
    E("91","91 — Fim do crescimento, folhagem ainda verde","Senescência"),
    E("92","92 — Início da descoloração das folhas","Senescência"),
    E("95","95 — 50% das folhas amareladas ou caídas","Senescência"),
    E("97","97 — Planta em repouso ou morta","Senescência"),
    E("99","99 — Produto colhido","Colheita")
  ];

  /* =========================================================================
     O MAPA. Cada cultura aponta para uma escala E declara o nível:

       propria  monografia BBCH da própria cultura
       grupo    escala que a NORMA atribui ao grupo (cereais de inverno,
                pomáceas, caroços, brássicas, cucurbitáceas...). Não é
                aproximação nossa: é o recorte da BBCH.
       geral    escala geral da BBCH, publicada para a planta sem monografia.
                Rótulos genéricos de propósito.

     Nenhuma cultura recebe os rótulos de OUTRA cultura. Esta é a regra que a
     v186 estabeleceu e que este mapa não pode violar — há teste para ela.
     ========================================================================= */
  var ESCALAS={
    soja:SOJA, milho:MILHO, algodao:ALGODAO, cafe:CAFE, feijao:FEIJAO,
    tomate:TOMATE, cana:CANA, morango:MORANGO, melao:MELAO, pastagem:PASTAGEM,
    citros:CITROS, cereais:CEREAIS, arroz:ARROZ, batata:BATATA, uva:UVA,
    girassol:GIRASSOL, canola:CANOLA, mandioca:MANDIOCA, amendoim:AMENDOIM,
    pomaceas:POMACEAS, carocos:CAROCOS, brassicas:BRASSICAS, bulbosas:BULBOSAS,
    raizes:RAIZES, folhosas:FOLHOSAS, banana:BANANA, abacaxi:ABACAXI, geral:GERAL
  };

  /* cultura -> [escala, nível]. A ordem aqui segue, grosso modo, a área
     plantada no Brasil: as primeiras são as que aparecem em quase todo ensaio. */
  var MAPA={
    /* --- grandes culturas, monografia própria --- */
    'Soja':['soja','propria'], 'Milho':['milho','propria'],
    'Cana':['cana','propria'], 'Cana-de-açúcar':['cana','propria'],
    'Algodão':['algodao','propria'], 'Algodao':['algodao','propria'],
    'Feijão':['feijao','propria'], 'Feijao':['feijao','propria'],
    'Arroz':['arroz','propria'], 'Café':['cafe','propria'], 'Cafe':['cafe','propria'],
    'Batata':['batata','propria'], 'Mandioca':['mandioca','propria'],
    'Amendoim':['amendoim','propria'], 'Girassol':['girassol','propria'],
    'Canola':['canola','propria'], 'Colza':['canola','propria'],
    'Tomate':['tomate','propria'], 'Uva':['uva','propria'], 'Videira':['uva','propria'],
    'Banana':['banana','propria'], 'Abacaxi':['abacaxi','propria'],
    'Morango':['morango','propria'], 'Melão':['melao','propria'], 'Melao':['melao','propria'],
    'Citros':['citros','propria'], 'CITROS':['citros','propria'],
    'Laranja':['citros','propria'], 'Limão':['citros','propria'],
    'Tangerina':['citros','propria'], 'Lima':['citros','propria'],
    /* --- cereais de inverno: grupo da norma --- */
    'Trigo':['cereais','grupo'], 'Cevada':['cereais','grupo'], 'Aveia':['cereais','grupo'],
    'Centeio':['cereais','grupo'], 'Triticale':['cereais','grupo'],
    'Sorgo':['cereais','grupo'], 'Milheto':['cereais','grupo'],
    /* --- leguminosas de grão: grupo da norma (escala do feijão) --- */
    'Caupi':['feijao','grupo'], 'Ervilha':['feijao','grupo'],
    'Grão-de-bico':['feijao','grupo'], 'Lentilha':['feijao','grupo'],
    'Soja perene':['feijao','grupo'],
    /* --- solanáceas de fruto: grupo da norma (escala do tomate) --- */
    'Pimentão':['tomate','grupo'], 'Pimenta':['tomate','grupo'], 'Berinjela':['tomate','grupo'],
    'Jiló':['tomate','grupo'],
    /* --- cucurbitáceas: grupo da norma (escala do melão) --- */
    'Melancia':['melao','grupo'], 'Pepino':['melao','grupo'],
    'Abóbora':['melao','grupo'], 'Abobrinha':['melao','grupo'], 'Chuchu':['melao','grupo'],
    /* --- pomáceas e caroços: grupos da norma --- */
    'Maçã':['pomaceas','grupo'], 'Maca':['pomaceas','grupo'], 'Pera':['pomaceas','grupo'],
    'Marmelo':['pomaceas','grupo'],
    'Pêssego':['carocos','grupo'], 'Nectarina':['carocos','grupo'],
    'Ameixa':['carocos','grupo'], 'Cereja':['carocos','grupo'],
    /* --- hortaliças por órgão colhível: grupos da norma --- */
    'Repolho':['brassicas','grupo'], 'Couve':['brassicas','grupo'],
    'Couve-flor':['brassicas','grupo'], 'Brócolis':['brassicas','grupo'],
    'Rúcula':['brassicas','grupo'], 'Mostarda':['brassicas','grupo'],
    'Cebola':['bulbosas','grupo'], 'Alho':['bulbosas','grupo'], 'Alho-poró':['bulbosas','grupo'],
    'Cenoura':['raizes','grupo'], 'Beterraba':['raizes','grupo'],
    'Rabanete':['raizes','grupo'], 'Nabo':['raizes','grupo'],
    'Alface':['folhosas','grupo'], 'Espinafre':['folhosas','grupo'], 'Agrião':['folhosas','grupo'],
    /* --- forrageiras: escala de pastagem, que é a genérica de gramínea --- */
    'Pastagem':['pastagem','propria'], 'Braquiária':['pastagem','grupo'],
    'Urochloa':['pastagem','grupo'], 'Mombaça':['pastagem','grupo'],
    'Panicum':['pastagem','grupo'], 'Tifton':['pastagem','grupo'],
    'Cynodon':['pastagem','grupo'], 'Azevém':['pastagem','grupo'],
    'Aveia forrageira':['pastagem','grupo'], 'Alfafa':['pastagem','grupo'],
    /* --- ESCALA GERAL. Perenes e demais culturas sem monografia própria. Não é
       empréstimo de escala alheia: é a escala que a norma publica para este
       caso, com rótulos genéricos. --- */
    'Eucalipto':['geral','geral'], 'Pinus':['geral','geral'], 'Seringueira':['geral','geral'],
    'Erva-mate':['geral','geral'], 'Chá':['geral','geral'], 'Cacau':['geral','geral'],
    'Manga':['geral','geral'], 'Abacate':['geral','geral'], 'Goiaba':['geral','geral'],
    'Mamão':['geral','geral'], 'Maracujá':['geral','geral'], 'Caqui':['geral','geral'],
    'Coco':['geral','geral'], 'Dendê':['geral','geral'], 'Oliveira':['geral','geral'],
    'Açaí':['geral','geral'], 'Caju':['geral','geral'], 'Castanha-do-brasil':['geral','geral'],
    'Guaraná':['geral','geral'], 'Pimenta-do-reino':['geral','geral'],
    'Fumo':['geral','geral'], 'Tabaco':['geral','geral'], 'Gergelim':['geral','geral'],
    'Linho':['geral','geral'], 'Mamona':['geral','geral'], 'Crotalária':['geral','geral'],
    'Nabo forrageiro':['geral','geral'], 'Trigo mourisco':['geral','geral'],
    'Quinoa':['geral','geral'], 'Batata-doce':['geral','geral'], 'Inhame':['geral','geral'],
    'Cará':['geral','geral'], 'Estufa':['geral','geral'], 'ESTUFAS':['geral','geral']
  };

  var NIVEL_TEXTO={
    propria:'escala da própria cultura',
    grupo:'escala do grupo, definida pela norma BBCH',
    geral:'escala geral da BBCH, para plantas sem monografia própria'
  };
  var NIVEL_NOTA={
    propria:'',
    grupo:'A BBCH agrupa culturas de fenologia equivalente numa escala só; esta é a do grupo, não a de outra cultura.',
    geral:'Os rótulos são genéricos porque a escala geral vale para qualquer planta. Registre o estádio pelo que a planta está fazendo, não pelo nome da cultura.'
  };

  /* ===== O NOME DA CULTURA, RESOLVIDO ======================================
     A cultura do estudo e CAMPO DE TEXTO LIVRE. Entra "Soja", "soja", "SOJA",
     "Soybean", "Soybeans", "Suggar cane" — e ate a v191 qualquer grafia fora do
     mapa desligava a escala BBCH e, pior, fazia a conferencia de registro
     ACUSAR: o app dizia que o glifosato nao tem registro para "Soybean", quando
     tem para Soja. Achado falso mata a confianca na ferramenta inteira, e este
     nascia de uma letra diferente.

     Aqui o nome e resolvido para a forma canonica antes de qualquer comparacao.
     O que NAO resolve devolve vazio — e quem chama fica em silencio em vez de
     afirmar. Nao reconhecer nao e o mesmo que estar errado.

     Os sinonimos em ingles nao sao enfeite: programa de PTA e lista de
     patrocinador internacional vem assim, e e nessa hora que o dado entra. */
  function _chaveCultura(s){
    s=String(s==null?'':s);
    return (s.normalize?s.normalize('NFD').replace(/[\u0300-\u036f]/g,''):s)
      .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  var SINONIMOS={
    /* ingles -> canonico */
    'soybean':'Soja','soybeans':'Soja','soya':'Soja','soy':'Soja',
    'corn':'Milho','maize':'Milho','cotton':'Algodão','wheat':'Trigo',
    'rice':'Arroz','barley':'Cevada','oat':'Aveia','oats':'Aveia','rye':'Centeio',
    'sorghum':'Sorgo','millet':'Milheto','coffee':'Café','sugar cane':'Cana-de-açúcar',
    'sugarcane':'Cana-de-açúcar','suggar cane':'Cana-de-açúcar','cane':'Cana-de-açúcar',
    'drybeans':'Feijão','dry beans':'Feijão','bean':'Feijão','beans':'Feijão',
    'common bean':'Feijão','cowpea':'Caupi','pea':'Ervilha','peas':'Ervilha',
    'chickpea':'Grão-de-bico','lentil':'Lentilha','peanut':'Amendoim','groundnut':'Amendoim',
    'sunflower':'Girassol','rapeseed':'Canola','oilseed rape':'Canola','sesame':'Gergelim',
    'cassava':'Mandioca','potato':'Batata','sweet potato':'Batata-doce',
    'tomato':'Tomate','pepper':'Pimentão','bell pepper':'Pimentão','eggplant':'Berinjela',
    'melon':'Melão','watermelon':'Melancia','cucumber':'Pepino','pumpkin':'Abóbora',
    'squash':'Abobrinha','zucchini':'Abobrinha',
    'cabbage':'Repolho','kale':'Couve','cauliflower':'Couve-flor','broccoli':'Brócolis',
    'onion':'Cebola','garlic':'Alho','leek':'Alho-poró','carrot':'Cenoura',
    'beet':'Beterraba','sugarbeet':'Beterraba','sugar beet':'Beterraba',
    'radish':'Rabanete','turnip':'Nabo','lettuce':'Alface','spinach':'Espinafre',
    'strawberry':'Morango','grape':'Uva','grapevine':'Uva','apple':'Maçã','pear':'Pera',
    'peach':'Pêssego','nectarine':'Nectarina','plum':'Ameixa','cherry':'Cereja',
    'citrus':'Citros','orange':'Laranja','lemon':'Limão','lime':'Lima','tangerine':'Tangerina',
    'banana':'Banana','papaya':'Mamão','mango':'Manga','avocado':'Abacate',
    'guava':'Goiaba','passion fruit':'Maracujá','pineapple':'Abacaxi','persimmon':'Caqui',
    'cocoa':'Cacau','coconut':'Coco','oil palm':'Dendê','olive':'Oliveira',
    'cashew':'Caju','tobacco':'Fumo','castor':'Mamona','flax':'Linho','quinoa':'Quinoa',
    'eucalyptus':'Eucalipto','pine':'Pinus','rubber tree':'Seringueira',
    'yerba mate':'Erva-mate','tea':'Chá','black pepper':'Pimenta-do-reino',
    'pasture':'Pastagem','grass':'Pastagem','ryegrass':'Azevém','alfalfa':'Alfafa',
    /* variantes em portugues que o campo livre produz */
    'cana':'Cana-de-açúcar','cana de acucar':'Cana-de-açúcar','cana soca':'Cana-de-açúcar',
    'soja ogm':'Soja','milho ogm':'Milho','algodao ogm':'Algodão','feijao comum':'Feijão',
    'cafe arabica':'Café','cafeeiro':'Café','citricos':'Citros','citrus sinensis':'Citros',
    'laranjeira':'Laranja','videira':'Uva','macieira':'Maçã','bananeira':'Banana',
    'batata inglesa':'Batata','tomateiro':'Tomate','pastagens':'Pastagem',
    'braquiaria':'Braquiária','capim':'Pastagem','trigo mourisco':'Trigo mourisco',
    /* Apelidos que o PROPRIO mapa carrega como chave (sem acento, forma curta).
       Eles servem para achar a escala; aqui se diz qual e a forma que vale
       quando o nome vai ser comparado com a lista de culturas do MAPA. */
    'algodao':'Algodão','cafe':'Café','feijao':'Feijão','melao':'Melão',
    'maca':'Maçã','cana':'Cana-de-açúcar','citros':'Citros','estufas':'Estufa',
    'colza':'Canola','videira':'Uva','limao':'Limão','pessego':'Pêssego',
    'brocolis':'Brócolis','couve flor':'Couve-flor','grao de bico':'Grão-de-bico',
    'alho poro':'Alho-poró','erva mate':'Erva-mate','cha':'Chá','acai':'Açaí',
    'dende':'Dendê','mamao':'Mamão','maracuja':'Maracujá','azevem':'Azevém',
    'rucula':'Rúcula','agriao':'Agrião','mombaca':'Mombaça','cara':'Cará'
  };
  /* Indice das chaves do MAPA por forma normalizada, montado uma vez. */
  var _CANON=null;
  function _canonIndice(){
    if(_CANON) return _CANON;
    _CANON={};
    Object.keys(MAPA).forEach(function(n){ _CANON[_chaveCultura(n)]=n; });
    return _CANON;
  }
  /* Devolve o nome canonico, ou '' quando nao reconhece. NUNCA chuta. */
  function canonica(nome){
    var k=_chaveCultura(nome);
    if(!k) return '';
    /* SINONIMOS vem ANTES do indice porque o proprio mapa carrega apelidos como
       chave — 'Algodao' sem acento e 'Cana' curto existem la para a busca de
       escala funcionar. Para a comparacao com a lista do MAPA, porem, vale a
       forma que o MAPA escreve: 'Cana' nao bate com 'Cana-de-acucar'. */
    if(SINONIMOS[k]) return SINONIMOS[k];
    var idx=_canonIndice();
    if(idx[k]) return idx[k];
    /* plural simples do proprio vocabulario: "citros" ja e plural, mas
       "tomates" e "morangos" aparecem em planilha. */
    if(/s$/.test(k) && idx[k.slice(0,-1)]) return idx[k.slice(0,-1)];
    if(/s$/.test(k) && SINONIMOS[k.slice(0,-1)]) return SINONIMOS[k.slice(0,-1)];
    return '';
  }

  function listaDe(cultura){
    var m=MAPA[canonica(cultura)]; return m?(ESCALAS[m[0]]||null):null;
  }
  function origemDe(cultura){
    cultura=canonica(cultura);
    var m=MAPA[cultura];
    if(!m) return null;
    return {escala:m[0], nivel:m[1], propria:(m[1]==='propria'),
            rotulo:NIVEL_TEXTO[m[1]]||'', nota:NIVEL_NOTA[m[1]]||''};
  }
  function infoDe(cultura,code){
    var l=listaDe(cultura); if(!l||!code) return null;
    for(var i=0;i<l.length;i++) if(l[i].code===code) return l[i];
    return null;
  }
  function culturas(){ return Object.keys(MAPA); }

  var API={VERSION:VERSION, ESCALAS:ESCALAS, MAPA:MAPA, GERAL:GERAL,
           listaDe:listaDe, origemDe:origemDe, infoDe:infoDe, culturas:culturas,
           canonica:canonica, SINONIMOS:SINONIMOS};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.BBCHCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
