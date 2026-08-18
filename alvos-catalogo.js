/* Agracta — catálogo de alvos biológicos por cultura.
 *
 * Doenças, pragas e plantas daninhas com o nome que o técnico usa no campo e o
 * binômio que o relatório exige. É consultado na criação da coluna de avaliação:
 * a cultura da quadra filtra a lista, e escolher um alvo escreve o nome — então
 * o gráfico já sai rotulado certo, sem digitação livre divergindo entre datas.
 *
 * Formato: [nome usado no campo, binômio científico].
 * Fonte dos nomes: nomenclatura corrente na fitopatologia e entomologia
 * agrícola brasileiras (Embrapa e literatura de referência). Onde a taxonomia
 * mudou recentemente, o comentário registra a mudança — o nome antigo continua
 * buscável para quem digita o que aprendeu.
 */
(function(){
  'use strict';

  /* Daninhas que aparecem em qualquer cultura — entram no fim de toda lista,
     porque ensaio de herbicida e de seletividade avalia a daninha, não a cultura. */
  var DANINHAS = [
    ['Capim-amargoso','Digitaria insularis'],
    ['Buva','Conyza bonariensis'],
    ['Buva-alta','Conyza sumatrensis'],
    ['Caruru','Amaranthus retroflexus'],
    ['Caruru-palmeri','Amaranthus palmeri'],
    ['Capim-pé-de-galinha','Eleusine indica'],
    ['Capim-colchão','Digitaria horizontalis'],
    ['Capim-carrapicho','Cenchrus echinatus'],
    ['Papuã / marmelada','Urochloa plantaginea'],
    ['Corda-de-viola','Ipomoea grandifolia'],
    ['Trapoeraba','Commelina benghalensis'],
    ['Leiteiro','Euphorbia heterophylla'],
    ['Picão-preto','Bidens pilosa'],
    ['Guanxuma','Sida rhombifolia'],
    ['Erva-quente','Spermacoce latifolia'],
    ['Tiririca','Cyperus rotundus'],
    ['Nabiça','Raphanus raphanistrum'],
    ['Losna-branca','Parthenium hysterophorus']
  ];

  var C = {};

  C['Soja'] = {
    doencas:[
      ['Ferrugem asiática','Phakopsora pachyrhizi'],
      ['Mancha-alvo','Corynespora cassiicola'],
      ['Mofo-branco','Sclerotinia sclerotiorum'],
      ['Antracnose','Colletotrichum truncatum'],
      ['Mancha parda / septoriose','Septoria glycines'],
      ['Crestamento foliar de cercospora','Cercospora kikuchii'],
      ['Oídio','Erysiphe diffusa'],
      ['Míldio','Peronospora manshurica'],
      ['Mela / rizoctoniose foliar','Rhizoctonia solani'],
      ['Cancro da haste','Diaporthe aspalathi'],
      ['Seca da haste e da vagem','Diaporthe longicolla'],
      ['Podridão radicular de fitóftora','Phytophthora sojae'],
      ['Síndrome da morte súbita','Fusarium virguliforme'],
      ['Podridão vermelha da raiz','Fusarium tucumaniae'],
      ['Macrofomina / podridão de carvão','Macrophomina phaseolina'],
      ['Mancha olho-de-rã','Cercospora sojina'],
      ['Nematoide de cisto da soja','Heterodera glycines'],
      ['Nematoide das galhas','Meloidogyne javanica'],
      ['Nematoide das lesões radiculares','Pratylenchus brachyurus'],
      ['Nematoide reniforme','Rotylenchulus reniformis'],
      ['Mosaico comum da soja','Soybean mosaic virus'],
      ['Necrose da haste','Cowpea mild mottle virus']
    ],
    pragas:[
      ['Lagarta-da-soja','Anticarsia gemmatalis'],
      ['Falsa-medideira','Chrysodeixis includens'],
      ['Helicoverpa','Helicoverpa armigera'],
      ['Lagarta-do-cartucho','Spodoptera frugiperda'],
      ['Lagarta militar','Spodoptera cosmioides'],
      ['Lagarta-das-vagens','Spodoptera eridania'],
      ['Broca-do-colo / lagarta-elasmo','Elasmopalpus lignosellus'],
      ['Percevejo-marrom','Euschistus heros'],
      ['Percevejo-verde','Nezara viridula'],
      ['Percevejo-verde-pequeno','Piezodorus guildinii'],
      ['Percevejo-barriga-verde','Dichelops melacanthus'],
      ['Mosca-branca','Bemisia tabaci'],
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Ácaro-branco','Polyphagotarsonemus latus'],
      ['Tripes','Frankliniella schultzei'],
      ['Vaquinha','Diabrotica speciosa'],
      ['Coró-das-pastagens','Diloboderus abderus']
    ]
  };

  /* A ramulária deixou de ser Ramularia areola: hoje é tratada como o complexo
     Ramulariopsis gossypii / R. pseudoglycines, e é o segundo que predomina no
     Brasil. O nome antigo fica na busca porque é o que muita gente digita. */
  C['Algodão'] = {
    doencas:[
      ['Mancha de ramulária','Ramulariopsis pseudoglycines'],
      ['Mancha de ramulária (complexo)','Ramulariopsis gossypii'],
      ['Ramulária (nome antigo)','Ramularia areola'],
      ['Mancha-alvo','Corynespora cassiicola'],
      ['Mancha de estenfílio','Stemphylium solani'],
      ['Mancha angular / bacteriose','Xanthomonas citri pv. malvacearum'],
      ['Ferrugem tropical','Phakopsora gossypii'],
      ['Antracnose','Colletotrichum gossypii'],
      ['Ramulose','Colletotrichum gossypii var. cephalosporioides'],
      ['Murcha de fusário','Fusarium oxysporum f. sp. vasinfectum'],
      ['Murcha de verticílio','Verticillium dahliae'],
      ['Mofo-branco','Sclerotinia sclerotiorum'],
      ['Tombamento / damping-off','Rhizoctonia solani'],
      ['Podridão de macrofomina','Macrophomina phaseolina'],
      ['Doença azul do algodoeiro','Cotton leafroll dwarf virus'],
      ['Mosaico das nervuras','Cotton vein mosaic virus'],
      ['Nematoide das galhas','Meloidogyne incognita'],
      ['Nematoide reniforme','Rotylenchulus reniformis']
    ],
    pragas:[
      ['Bicudo-do-algodoeiro','Anthonomus grandis'],
      ['Lagarta-das-maçãs','Helicoverpa armigera'],
      ['Lagarta-da-maçã','Chloridea virescens'],
      ['Lagarta-rosada','Pectinophora gossypiella'],
      ['Curuquerê-do-algodoeiro','Alabama argillacea'],
      ['Lagarta-do-cartucho','Spodoptera frugiperda'],
      ['Lagarta militar','Spodoptera cosmioides'],
      ['Falsa-medideira','Chrysodeixis includens'],
      ['Mosca-branca','Bemisia tabaci'],
      ['Pulgão-do-algodoeiro','Aphis gossypii'],
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Ácaro-branco','Polyphagotarsonemus latus'],
      ['Ácaro-vermelho','Tetranychus ludeni'],
      ['Tripes','Frankliniella schultzei'],
      ['Percevejo-castanho','Scaptocoris castanea'],
      ['Percevejo-marrom','Euschistus heros']
    ]
  };

  C['Milho'] = {
    doencas:[
      ['Mancha branca','Pantoea ananatis'],
      ['Cercosporiose','Cercospora zeina'],
      ['Ferrugem polissora','Puccinia polysora'],
      ['Ferrugem comum','Puccinia sorghi'],
      ['Ferrugem branca / tropical','Physopella zeae'],
      ['Helmintosporiose','Exserohilum turcicum'],
      ['Mancha de bipolaris','Bipolaris maydis'],
      ['Antracnose foliar','Colletotrichum graminicola'],
      ['Diplodia / podridão do colmo','Stenocarpella maydis'],
      ['Podridão de fusário','Fusarium verticillioides'],
      ['Enfezamento pálido','Spiroplasma kunkelii'],
      ['Enfezamento vermelho','Candidatus Phytoplasma pruni'],
      ['Risca do milho','Maize rayado fino virus'],
      ['Mosaico comum do milho','Sugarcane mosaic virus']
    ],
    pragas:[
      ['Lagarta-do-cartucho','Spodoptera frugiperda'],
      ['Helicoverpa','Helicoverpa armigera'],
      ['Lagarta-da-espiga','Helicoverpa zea'],
      ['Broca-da-cana em milho','Diatraea saccharalis'],
      ['Cigarrinha-do-milho','Dalbulus maidis'],
      ['Percevejo-barriga-verde','Dichelops melacanthus'],
      ['Pulgão-do-milho','Rhopalosiphum maidis'],
      ['Lagarta-elasmo','Elasmopalpus lignosellus'],
      ['Vaquinha','Diabrotica speciosa'],
      ['Coró','Phyllophaga cuyabana'],
      ['Ácaro-rajado','Tetranychus urticae']
    ]
  };

  C['Café'] = {
    doencas:[
      ['Ferrugem do cafeeiro','Hemileia vastatrix'],
      ['Cercosporiose / olho-pardo','Cercospora coffeicola'],
      ['Mancha aureolada','Pseudomonas syringae pv. garcae'],
      ['Antracnose dos frutos','Colletotrichum gloeosporioides'],
      ['Mal-das-fitas / rizoctoniose','Rhizoctonia solani'],
      ['Roseliniose','Rosellinia bunodes'],
      ['Requeima / phoma','Phoma costarricensis'],
      ['Mancha de ascochyta','Ascochyta tarda'],
      ['Nematoide das galhas do café','Meloidogyne exigua'],
      ['Nematoide Meloidogyne paranaensis','Meloidogyne paranaensis'],
      ['Nematoide das lesões','Pratylenchus coffeae'],
      ['Mancha anular do cafeeiro','Coffee ringspot virus']
    ],
    pragas:[
      ['Broca-do-café','Hypothenemus hampei'],
      ['Bicho-mineiro','Leucoptera coffeella'],
      ['Ácaro-vermelho do cafeeiro','Oligonychus ilicis'],
      ['Cochonilha-da-roseta','Planococcus citri'],
      ['Cochonilha-verde','Coccus viridis'],
      ['Cochonilha-branca da raiz','Dysmicoccus texensis'],
      ['Cigarra-do-cafeeiro','Quesada gigas'],
      ['Lagarta-dos-cafezais','Eacles imperialis magnifica'],
      ['Formiga cortadeira','Atta sexdens'],
      ['Broca-dos-ramos','Xylosandrus compactus']
    ]
  };

  C['Feijão'] = {
    doencas:[
      ['Antracnose','Colletotrichum lindemuthianum'],
      ['Mancha angular','Pseudocercospora griseola'],
      ['Ferrugem do feijoeiro','Uromyces appendiculatus'],
      ['Mofo-branco','Sclerotinia sclerotiorum'],
      ['Crestamento bacteriano comum','Xanthomonas axonopodis pv. phaseoli'],
      ['Murcha de curtobacterium','Curtobacterium flaccumfaciens'],
      ['Mela / teia micélica','Rhizoctonia solani'],
      ['Podridão radicular seca','Fusarium solani f. sp. phaseoli'],
      ['Murcha de fusário','Fusarium oxysporum f. sp. phaseoli'],
      ['Mosaico dourado','Bean golden mosaic virus'],
      ['Mosaico comum','Bean common mosaic virus'],
      ['Nematoide das galhas','Meloidogyne incognita']
    ],
    pragas:[
      ['Mosca-branca','Bemisia tabaci'],
      ['Cigarrinha-verde','Empoasca kraemeri'],
      ['Vaquinha','Diabrotica speciosa'],
      ['Lagarta-elasmo','Elasmopalpus lignosellus'],
      ['Lagarta-do-cartucho','Spodoptera frugiperda'],
      ['Helicoverpa','Helicoverpa armigera'],
      ['Tripes','Thrips tabaci'],
      ['Ácaro-branco','Polyphagotarsonemus latus'],
      ['Caruncho do feijão','Zabrotes subfasciatus']
    ]
  };

  C['Cana de açúcar'] = {
    doencas:[
      ['Ferrugem alaranjada','Puccinia kuehnii'],
      ['Ferrugem marrom','Puccinia melanocephala'],
      ['Carvão da cana','Sporisorium scitamineum'],
      ['Escaldadura das folhas','Xanthomonas albilineans'],
      ['Raquitismo da soqueira','Leifsonia xyli subsp. xyli'],
      ['Podridão abacaxi','Thielaviopsis paradoxa'],
      ['Podridão vermelha do colmo','Colletotrichum falcatum'],
      ['Mancha parda','Cercospora longipes'],
      ['Mancha anelar','Leptosphaeria sacchari'],
      ['Estria vermelha','Acidovorax avenae subsp. avenae'],
      ['Mosaico da cana','Sugarcane mosaic virus'],
      ['Amarelinho / folha amarela','Sugarcane yellow leaf virus']
    ],
    pragas:[
      ['Broca-da-cana','Diatraea saccharalis'],
      ['Broca-gigante','Telchin licus'],
      ['Broca-peluda','Hyponeuma taltula'],
      ['Cigarrinha-da-raiz','Mahanarva fimbriolata'],
      ['Cigarrinha-das-folhas','Mahanarva posticata'],
      ['Migdolus','Migdolus fryanus'],
      ['Sphenophorus / bicudo-da-cana','Sphenophorus levis'],
      ['Cupim-de-montículo','Heterotermes tenuis'],
      ['Formiga cortadeira','Atta capiguara'],
      ['Nematoide das galhas','Meloidogyne javanica'],
      ['Nematoide das lesões','Pratylenchus zeae']
    ]
  };

  C['Tomate'] = {
    doencas:[
      ['Requeima','Phytophthora infestans'],
      ['Pinta-preta','Alternaria tomatophila'],
      ['Septoriose','Septoria lycopersici'],
      ['Mancha de estenfílio','Stemphylium solani'],
      ['Oídio','Leveillula taurica'],
      ['Mofo-branco','Sclerotinia sclerotiorum'],
      ['Mofo-cinzento','Botrytis cinerea'],
      ['Murcha de fusário','Fusarium oxysporum f. sp. lycopersici'],
      ['Murcha de verticílio','Verticillium dahliae'],
      ['Murcha bacteriana','Ralstonia solanacearum'],
      ['Mancha bacteriana','Xanthomonas perforans'],
      ['Cancro bacteriano','Clavibacter michiganensis'],
      ['Vira-cabeça do tomateiro','Tomato spotted wilt virus'],
      ['Geminivirose / mosaico dourado','Tomato severe rugose virus'],
      ['Nematoide das galhas','Meloidogyne incognita']
    ],
    pragas:[
      ['Traça-do-tomateiro','Phthorimaea absoluta'],
      ['Broca-pequena do fruto','Neoleucinodes elegantalis'],
      ['Broca-grande do fruto','Helicoverpa zea'],
      ['Helicoverpa','Helicoverpa armigera'],
      ['Mosca-branca','Bemisia tabaci'],
      ['Tripes','Frankliniella schultzei'],
      ['Ácaro-do-bronzeamento','Aculops lycopersici'],
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Pulgão-verde','Myzus persicae'],
      ['Mosca-minadora','Liriomyza sativae']
    ]
  };

  C['Morango'] = {
    doencas:[
      ['Mofo-cinzento','Botrytis cinerea'],
      ['Antracnose','Colletotrichum acutatum'],
      ['Flor-preta','Colletotrichum fragariae'],
      ['Mancha de micosferela','Mycosphaerella fragariae'],
      ['Mancha angular bacteriana','Xanthomonas fragariae'],
      ['Oídio do morangueiro','Podosphaera aphanis'],
      ['Podridão de fitóftora','Phytophthora cactorum'],
      ['Murcha de verticílio','Verticillium dahliae'],
      ['Podridão de rizoctonia','Rhizoctonia fragariae'],
      ['Nematoide das galhas','Meloidogyne hapla']
    ],
    pragas:[
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Ácaro-branco','Polyphagotarsonemus latus'],
      ['Ácaro-do-enfezamento','Phytonemus pallidus'],
      ['Tripes','Frankliniella occidentalis'],
      ['Pulgão','Chaetosiphon fragaefolii'],
      ['Mosca-das-frutas','Drosophila suzukii'],
      ['Lagarta-rosca','Agrotis ipsilon'],
      ['Broca-do-morango','Lobiopa insularis']
    ]
  };

  C['Melão'] = {
    doencas:[
      ['Míldio das cucurbitáceas','Pseudoperonospora cubensis'],
      ['Oídio','Podosphaera xanthii'],
      ['Cancro das hastes','Stagonosporopsis cucurbitacearum'],
      ['Mancha aquosa','Acidovorax citrulli'],
      ['Murcha de fusário','Fusarium oxysporum f. sp. melonis'],
      ['Podridão de fitóftora','Phytophthora capsici'],
      ['Antracnose','Colletotrichum orbiculare'],
      ['Mosaico amarelo da abobrinha','Zucchini yellow mosaic virus'],
      ['Amarelão do meloeiro','Melon yellowing-associated virus'],
      ['Nematoide das galhas','Meloidogyne incognita']
    ],
    pragas:[
      ['Mosca-branca','Bemisia tabaci'],
      ['Mosca-minadora','Liriomyza trifolii'],
      ['Pulgão-do-algodoeiro','Aphis gossypii'],
      ['Broca-das-cucurbitáceas','Diaphania hyalinata'],
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Tripes','Thrips palmi'],
      ['Mosca-das-frutas','Anastrepha grandis']
    ]
  };

  C['CITROS'] = {
    doencas:[
      ['Greening / HLB','Candidatus Liberibacter asiaticus'],
      ['Cancro cítrico','Xanthomonas citri subsp. citri'],
      ['Pinta-preta','Phyllosticta citricarpa'],
      ['Clorose variegada dos citros','Xylella fastidiosa'],
      ['Gomose','Phytophthora parasitica'],
      ['Verrugose da laranja-doce','Elsinoe australis'],
      ['Verrugose do limoeiro','Elsinoe fawcettii'],
      ['Podridão floral','Colletotrichum acutatum'],
      ['Melanose','Diaporthe citri'],
      ['Leprose dos citros','Citrus leprosis virus C'],
      ['Tristeza dos citros','Citrus tristeza virus'],
      ['Declínio / morte súbita','Citrus sudden death virus']
    ],
    pragas:[
      ['Psilídeo dos citros','Diaphorina citri'],
      ['Ácaro da leprose','Brevipalpus yothersi'],
      ['Ácaro da falsa-ferrugem','Phyllocoptruta oleivora'],
      ['Ácaro-purpúreo','Panonychus citri'],
      ['Minador dos citros','Phyllocnistis citrella'],
      ['Mosca-das-frutas','Ceratitis capitata'],
      ['Mosca-sul-americana','Anastrepha fraterculus'],
      ['Cochonilha-pardinha','Selenaspidus articulatus'],
      ['Cochonilha-branca','Praelongorthezia praelonga'],
      ['Cigarrinha vetora da CVC','Bucephalogonia xanthophis'],
      ['Bicho-furão','Gymnandrosoma aurantianum']
    ]
  };

  C['Pastagem'] = {
    doencas:[
      ['Carvão do capim','Ustilago operta'],
      ['Rizoctoniose da braquiária','Rhizoctonia solani'],
      ['Helmintosporiose','Bipolaris maydis'],
      ['Ergot / mela das sementes','Claviceps paspali']
    ],
    pragas:[
      ['Cigarrinha-das-pastagens','Deois flavopicta'],
      ['Cigarrinha Notozulia','Notozulia entreriana'],
      ['Cigarrinha Mahanarva','Mahanarva spectabilis'],
      ['Lagarta-do-capim','Spodoptera frugiperda'],
      ['Curuquerê-dos-capinzais','Mocis latipes'],
      ['Percevejo-castanho','Scaptocoris castanea'],
      ['Coró-das-pastagens','Diloboderus abderus'],
      ['Formiga cortadeira','Atta capiguara'],
      ['Cupim de montículo','Cornitermes cumulans']
    ]
  };

  /* Estufa não é cultura: é ambiente. A lista reúne o que efetivamente aparece
     no cultivo protegido da estação — folhosas, solanáceas e cucurbitáceas. */
  C['ESTUFAS'] = {
    doencas:[
      ['Mofo-cinzento','Botrytis cinerea'],
      ['Oídio','Podosphaera xanthii'],
      ['Míldio da alface','Bremia lactucae'],
      ['Míldio das cucurbitáceas','Pseudoperonospora cubensis'],
      ['Mofo-branco','Sclerotinia sclerotiorum'],
      ['Requeima','Phytophthora infestans'],
      ['Pinta-preta','Alternaria tomatophila'],
      ['Murcha bacteriana','Ralstonia solanacearum'],
      ['Podridão de pítio','Pythium aphanidermatum'],
      ['Tombamento / damping-off','Rhizoctonia solani'],
      ['Vira-cabeça','Tomato spotted wilt virus'],
      ['Nematoide das galhas','Meloidogyne incognita']
    ],
    pragas:[
      ['Mosca-branca','Bemisia tabaci'],
      ['Tripes-do-vira-cabeça','Frankliniella occidentalis'],
      ['Ácaro-rajado','Tetranychus urticae'],
      ['Ácaro-branco','Polyphagotarsonemus latus'],
      ['Pulgão-verde','Myzus persicae'],
      ['Mosca-minadora','Liriomyza trifolii'],
      ['Traça-do-tomateiro','Phthorimaea absoluta'],
      ['Lagarta-rosca','Agrotis ipsilon'],
      ['Fungus gnat / mosca-do-substrato','Bradysia matogrossensis']
    ]
  };

  /* Pousio existe justamente para o manejo da comunidade infestante. */
  C['Pousio'] = { doencas:[], pragas:[
      ['Percevejo-barriga-verde','Dichelops melacanthus'],
      ['Lagarta-do-cartucho','Spodoptera frugiperda'],
      ['Coró-das-pastagens','Diloboderus abderus']
  ]};

  function montar(){
    var out = {};
    Object.keys(C).forEach(function(k){
      var g = C[k], lista = [];
      (g.doencas||[]).forEach(function(p){ lista.push({comum:p[0], cientifico:p[1], grupo:'doença'}); });
      (g.pragas ||[]).forEach(function(p){ lista.push({comum:p[0], cientifico:p[1], grupo:'praga'}); });
      DANINHAS.forEach(function(p){ lista.push({comum:p[0], cientifico:p[1], grupo:'daninha'}); });
      out[k] = lista;
    });
    return out;
  }

  window.ALVOS_POR_CULTURA = montar();

  /* Sem cultura declarada (ou cultura fora da lista) a busca varre tudo, sem
     repetir alvo — praga de soja e de algodão coincidem bastante. */
  window.ALVOS_TODOS = (function(){
    var vistos = {}, todos = [];
    Object.keys(window.ALVOS_POR_CULTURA).forEach(function(k){
      window.ALVOS_POR_CULTURA[k].forEach(function(a){
        var chave = a.comum + '|' + a.cientifico;
        if(vistos[chave]) return;
        vistos[chave] = 1; todos.push(a);
      });
    });
    return todos;
  })();

  /* Busca tolerante: ignora acento e caixa, e casa tanto o nome de campo quanto
     o binômio — quem digita "phako" e quem digita "ferrugem" chegam no mesmo. */
  function limpar(s){
    return String(s||'').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  }
  window.alvosBuscar = function(cultura, termo, limite){
    var base = (cultura && window.ALVOS_POR_CULTURA[cultura]) || window.ALVOS_TODOS;
    var q = limpar(termo);
    if(!q) return base.slice(0, limite||14);
    var comeca = [], contem = [];
    base.forEach(function(a){
      var c = limpar(a.comum), s = limpar(a.cientifico);
      if(c.indexOf(q) === 0 || s.indexOf(q) === 0) comeca.push(a);
      else if(c.indexOf(q) >= 0 || s.indexOf(q) >= 0) contem.push(a);
    });
    return comeca.concat(contem).slice(0, limite||14);
  };
})();
