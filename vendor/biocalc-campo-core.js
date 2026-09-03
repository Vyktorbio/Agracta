(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.BioCalculoCampo=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  function parseNum(value){
    if(value===null||value===undefined||value==="")return 0;
    var cleaned=String(value).trim().replace(/\s+/g,"").replace(",",".");
    var number=Number.parseFloat(cleaned);
    return Number.isFinite(number)?number:0;
  }

  function round(value,places){
    var factor=Math.pow(10,places===undefined?8:places);
    return Math.round((value+Number.EPSILON)*factor)/factor;
  }

  /* Uma mesma unidade chega do protocolo de vários jeitos ("%", "%v/v",
     "% v/v", "ml/ha"). O núcleo trabalha com um identificador único para que
     uma grafia diferente nunca transforme adjuvante em dose por hectare. */
  function normalizeDoseUnit(unit){
    var raw=String(unit==null?"":unit).trim();
    var s=raw.toLowerCase().replace(/\s+/g,"");
    if(s.indexOf("%")>=0)return"%";
    if(s==="l"||s==="l/ha"||s==="lha")return"L/ha";
    if(s==="ml"||s==="ml/ha"||s==="mlha")return"mL/ha";
    if(s==="kg"||s==="kg/ha"||s==="kgha")return"kg/ha";
    if(s==="g"||s==="g/ha"||s==="gha")return"g/ha";
    return raw;
  }

  function doseConfig(dose,unit){
    var numeric=parseNum(dose);
    unit=normalizeDoseUnit(unit);
    if(unit==="L/ha")return{perHa:numeric*1000,productUnit:"mL",concentrationUnit:"mL/L",liquid:true};
    if(unit==="mL/ha")return{perHa:numeric,productUnit:"mL",concentrationUnit:"mL/L",liquid:true};
    if(unit==="kg/ha")return{perHa:numeric*1000,productUnit:"g",concentrationUnit:"g/L",liquid:false};
    return{perHa:numeric,productUnit:"g",concentrationUnit:"g/L",liquid:false};
  }

  function calculateTreatment(input){
    input=input||{};
    var cfg=doseConfig(input.doseHa,input.doseUnit||"L/ha");
    var sprayVolume=parseNum(input.sprayVolume);
    var plotLength=parseNum(input.plotLength);
    var plotWidth=parseNum(input.plotWidth);
    var numPlots=Math.max(1,Math.round(parseNum(input.numPlots))||1);
    var numBottles=Math.max(1,Math.round(parseNum(input.numBottles))||1);
    var deadVolumeMl=Math.max(0,parseNum(input.deadVolumeMl));
    var bottleCapacity=Math.max(0,parseNum(input.bottleCapacity));

    if(cfg.perHa<=0)throw new Error("A dose deve ser maior que zero.");
    if(sprayVolume<=0)throw new Error("O volume de calda deve ser maior que zero.");
    if(plotLength<=0||plotWidth<=0)throw new Error("As dimensões da parcela devem ser maiores que zero.");

    var plotAreaM2=plotLength*plotWidth;
    var plotAreaHa=plotAreaM2/10000;
    var concentration=cfg.perHa/sprayVolume;
    var sprayPerPlotMl=sprayVolume*plotAreaHa*1000;
    var productPerPlot=cfg.perHa*plotAreaHa;
    var sprayPlotsOnlyMl=sprayPerPlotMl*numPlots;
    var productPlotsOnly=productPerPlot*numPlots;
    var deadProduct=concentration*(deadVolumeMl/1000);
    var sprayTotalMl=sprayPlotsOnlyMl+deadVolumeMl;
    var productTotal=productPlotsOnly+deadProduct;
    var sprayPerBottleMl=sprayTotalMl/numBottles;
    var productPerBottle=productTotal/numBottles;
    var waterPerBottleMl=cfg.liquid?Math.max(sprayPerBottleMl-productPerBottle,0):sprayPerBottleMl;
    var minBottles=bottleCapacity>0?Math.ceil(sprayTotalMl/(bottleCapacity*1000)):0;

    return{
      plotAreaM2:round(plotAreaM2),
      plotAreaHa:round(plotAreaHa),
      concentration:round(concentration),
      sprayPerPlotMl:round(sprayPerPlotMl),
      productPerPlot:round(productPerPlot),
      sprayPlotsOnlyMl:round(sprayPlotsOnlyMl),
      productPlotsOnly:round(productPlotsOnly),
      deadVolumeMl:round(deadVolumeMl),
      deadProduct:round(deadProduct),
      sprayTotalMl:round(sprayTotalMl),
      productTotal:round(productTotal),
      sprayPerBottleMl:round(sprayPerBottleMl),
      productPerBottle:round(productPerBottle),
      waterPerBottleMl:round(waterPerBottleMl),
      minBottles:minBottles,
      requestedBottles:numBottles,
      bottleCapacityL:round(bottleCapacity),
      productUnit:cfg.productUnit,
      concentrationUnit:cfg.concentrationUnit,
      liquid:cfg.liquid,
      bottleCapacityOk:minBottles===0||numBottles>=minBottles,
      /* Este retorno nunca teve lista de avisos; o campo é próprio para não
         mudar a forma do objeto para quem já o consome. */
      bottleCapacityWarning:bottleTooLargeWarning(sprayTotalMl,bottleCapacity,formatAmount)
    };
  }

  /* CAPACIDADE IMPLAUSÍVEL. O motor só sabia reclamar de frasco PEQUENO demais —
     o que não cabe. Frasco grande demais passava calado, e é justamente por ali
     que entra o erro de unidade: "1900" digitado pensando em mililitros vira
     1.900 L, o preparo de 318 mL cabe folgado e nada denuncia.

     APONTA, NÃO BLOQUEIA: um frasco muito maior que o preparo pode ser
     legítimo (1 L num costal de 20 L são 20×). Só quando o recipiente comporta
     mais de cem preparos inteiros é que a unidade vira a explicação mais
     provável — e ainda assim o texto pergunta, não afirma. */
  function bottleTooLargeWarning(sprayTotalMl,bottleCapacityL,formatAmount){
    if(!(bottleCapacityL>0)||!(sprayTotalMl>0))return null;
    var capMl=bottleCapacityL*1000;
    /* "mais de cem preparos" é para valer: exatamente cem ainda passa. O
       epsilon existe porque 31,8 L × 1000 não dá 31800 redondo em ponto
       flutuante, e um limite que oscila com o arredondamento não é limite. */
    if(capMl <= sprayTotalMl*100*(1+1e-9)) return null;
    return "O frasco declarado ("+formatAmount(capMl,"mL")+") comporta "+
      Math.floor(capMl/sprayTotalMl)+" preparos inteiros deste. Se o número foi digitado em mililitros, "+
      "a capacidade seria "+formatAmount(bottleCapacityL,"mL")+" — confira a unidade antes de preparar.";
  }

  function calculateCalibration(input){
    input=input||{};
    var measured=Math.max(1,Math.min(6,Math.round(parseNum(input.measuredNozzles))||1));
    var totalNozzles=Math.max(1,Math.round(parseNum(input.totalNozzles))||1);
    var spacing=parseNum(input.nozzleSpacing);
    var sprayVolume=parseNum(input.sprayVolume);
    var plotLength=parseNum(input.plotLength);
    var readings=Array.isArray(input.readings)?input.readings:[];
    var perNozzle=[];

    for(var i=0;i<measured;i++){
      var row=Array.isArray(readings[i])?readings[i]:[];
      var valid=row.map(parseNum).filter(function(value){return value>0;});
      var average30=valid.length?valid.reduce(function(sum,value){return sum+value;},0)/valid.length:0;
      perNozzle.push({
        nozzle:i+1,
        readings:row.map(parseNum),
        validReadings:valid.length,
        averageMl30s:round(average30),
        averageLmin:round(average30*2/1000)
      });
    }

    var validNozzles=perNozzle.filter(function(item){return item.averageMl30s>0;});
    var generalAverageMl30s=validNozzles.length?
      validNozzles.reduce(function(sum,item){return sum+item.averageMl30s;},0)/validNozzles.length:0;
    var generalAverageLmin=generalAverageMl30s*2/1000;
    var cv=null;
    if(validNozzles.length>=2){
      var variance=validNozzles.reduce(function(sum,item){
        return sum+Math.pow(item.averageMl30s-generalAverageMl30s,2);
      },0)/validNozzles.length;
      cv=generalAverageMl30s>0?(Math.sqrt(variance)/generalAverageMl30s)*100:null;
    }
    var totalFlow=generalAverageLmin*totalNozzles;
    var boomWidth=totalNozzles*spacing;
    var speedKmh=sprayVolume>0&&spacing>0?(600*generalAverageLmin)/(sprayVolume*spacing):0;
    var speedMs=speedKmh/3.6;
    var passTimeSeconds=speedMs>0&&plotLength>0?plotLength/speedMs:0;

    return{
      measuredNozzles:measured,
      totalNozzles:totalNozzles,
      perNozzle:perNozzle,
      validNozzles:validNozzles.length,
      generalAverageMl30s:round(generalAverageMl30s),
      generalAverageLmin:round(generalAverageLmin),
      coefficientVariationPct:cv===null?null:round(cv),
      estimatedTotalFlowLmin:round(totalFlow),
      boomWidthM:round(boomWidth),
      speedKmh:round(speedKmh),
      speedMs:round(speedMs),
      passTimeSeconds:round(passTimeSeconds)
    };
  }

  /* ======================= MISTURA (dois ou mais componentes) =======================
     O app já escreve mistura como texto, com " + " separando: produto
     "Sankari + Silwet", dose "1,5 L + 0,033%". Só a conta é que não sabia ler:
     parseNum("1,5 L + 0,033%") devolve 1,5 e o adjuvante sumia CALADO — e uma
     dose "0,20%" virava 0,2 L/ha, 33× a real. O que falta é isto:

       1. ler cada componente com a SUA base;
       2. aceitar % v/v, que é como todo adjuvante é dosado;
       3. deixar o veículo (o que completa o volume) ser óleo, não só água.

     Base de cada componente:
       "area" — L/ha, mL/ha, g/ha, kg/ha: dose por hectare, independe da calda.
       "pct"  — % v/v SOBRE A CALDA FINAL. 0,2% em 3 L/ha de calda = 6 mL/ha.

     O veículo não é dose: é o resto. Volume de calda menos a soma dos líquidos.
     É por isso que ele precisa ser nomeado — em metade dos tratamentos de drone
     o resto é óleo de soja, e chamar isso de "água" no preparo é erro de bancada. */

  var DOSE_UNITS=["L/ha","mL/ha","g/ha","kg/ha","%"];

  /* Uma dose isolada: "1,5 L" -> {valor:1.5, unidade:"L/ha"}; "0,033%" -> pct.
     Sem unidade escrita, cai em `fallbackUnit` (o que o estudo declarou). */
  function parseDose(raw,fallbackUnit){
    var s=String(raw==null?"":raw).trim();
    if(!s)return null;
    /* milhar PT-BR ("1.500 g" = 1500) antes de qualquer coisa — mesma regra do app */
    var limpo=s.replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"");
    var valor=parseNum(limpo);
    var u=limpo.toLowerCase();
    var unidade;
    if(/%/.test(u))                       unidade="%";
    else if(/m\s*l/.test(u))              unidade="mL/ha";
    else if(/k\s*g/.test(u))              unidade="kg/ha";
    else if(/(^|[^k])g(\b|ramas|\/|$)/.test(u)) unidade="g/ha";
    else if(/l/.test(u))                  unidade="L/ha";
    else{
      var fallback=normalizeDoseUnit(fallbackUnit);
      unidade=(DOSE_UNITS.indexOf(fallback)>=0?fallback:"L/ha");
    }
    return{valor:valor,unidade:unidade,texto:s};
  }

  /* Casa "A + B" com "1,5 L + 0,033%". Devolve {components, problems}.
     NUNCA adivinha: se a contagem não bate, o problema é relatado e quem chama
     decide — o pecado antigo era justamente seguir em frente em silêncio. */
  function parseComponents(produtoTxt,doseTxt,fallbackUnit){
    var SEP=/\s\+\s|\s*\+\s*/;
    var nomes=String(produtoTxt==null?"":produtoTxt).split(SEP)
      .map(function(x){return x.trim();}).filter(function(x){return x!=="";});
    var doses=String(doseTxt==null?"":doseTxt).split(SEP)
      .map(function(x){return x.trim();}).filter(function(x){return x!=="";});
    var problems=[];
    if(doses.length===0)return{components:[],problems:["Sem dose."]};
    if(nomes.length===0)nomes=doses.map(function(_,i){return"Componente "+(i+1);});
    if(nomes.length!==doses.length){
      problems.push("A mistura tem "+nomes.length+" produto(s) e "+doses.length+
        " dose(s). Escreva na mesma ordem, separados por \" + \".");
    }
    var n=Math.max(nomes.length,doses.length);
    var comps=[];
    for(var i=0;i<n;i++){
      var d=parseDose(doses[i],fallbackUnit);
      if(!d)continue;
      if(!(d.valor>0))problems.push("Dose \""+(doses[i]||"")+"\" não é um número maior que zero.");
      comps.push({nome:nomes[i]||("Componente "+(i+1)),valor:d.valor,unidade:d.unidade,texto:d.texto});
    }
    return{components:comps,problems:problems};
  }

  /* Receita nova do Agracta: cada componente já tem identidade, dose e unidade.
     Ela manda sobre as strings legadas `produto` e `dose`. Além de evitar partir
     texto de novo, conserva item, lote e origem da dose até a memória BPL. */
  function parseStructuredComponents(source,fallbackUnit){
    var list=Array.isArray(source)?source:[];
    var problems=[],comps=[];
    if(!list.length)return{components:[],problems:["Sem componentes na receita."],source:"structured"};
    list.forEach(function(c,i){
      c=c||{};
      var nome=String(c.nome||c.name||("Componente "+(i+1))).trim()||("Componente "+(i+1));
      var raw=(c.valor!==undefined&&c.valor!==null)?c.valor:c.dose;
      var valor=parseNum(raw);
      var unidade=normalizeDoseUnit(c.unidade||c.unit||c.type||fallbackUnit);
      if(DOSE_UNITS.indexOf(unidade)<0){
        problems.push("Unidade \""+(c.unidade||c.unit||c.type||"")+"\" não reconhecida em "+nome+".");
        unidade=normalizeDoseUnit(fallbackUnit);
        if(DOSE_UNITS.indexOf(unidade)<0)unidade="L/ha";
      }
      if(!(valor>0))problems.push("A dose de "+nome+" deve ser maior que zero.");
      comps.push({
        id:c.id||null,itemId:c.itemId||null,nome:nome,valor:valor,unidade:unidade,
        texto:String(raw==null?"":raw)+(unidade?(" "+(unidade==="%"?"% v/v":unidade)):""),
        doseRef:c.doseRef||null,loteRef:c.loteRef||null
      });
    });
    return{components:comps,problems:problems,source:"structured"};
  }

  /* mL (ou g) por hectare de UM componente, dado o volume de calda em L/ha. */
  function perHaOf(comp,sprayVolumeLha){
    if(comp.unidade==="%")return{perHa:parseNum(comp.valor)*10*parseNum(sprayVolumeLha),unit:"mL",liquid:true};
    var cfg=doseConfig(comp.valor,comp.unidade);
    return{perHa:cfg.perHa,unit:cfg.productUnit,liquid:cfg.liquid};
  }

  function calculateMixture(input){
    input=input||{};
    var comps=Array.isArray(input.components)?input.components:[];
    var sprayVolume=parseNum(input.sprayVolume);
    var plotLength=parseNum(input.plotLength);
    var plotWidth=parseNum(input.plotWidth);
    var numPlots=Math.max(1,Math.round(parseNum(input.numPlots))||1);
    var numBottles=Math.max(1,Math.round(parseNum(input.numBottles))||1);
    var deadVolumeMl=Math.max(0,parseNum(input.deadVolumeMl));
    var bottleCapacity=Math.max(0,parseNum(input.bottleCapacity));
    var carrier=String(input.carrier||"Água").trim()||"Água";

    if(!comps.length)throw new Error("Nenhum componente para calcular.");
    if(sprayVolume<=0)throw new Error("O volume de calda deve ser maior que zero.");
    if(plotLength<=0||plotWidth<=0)throw new Error("As dimensões da parcela devem ser maiores que zero.");

    var plotAreaHa=(plotLength*plotWidth)/10000;
    var sprayPerPlotMl=sprayVolume*plotAreaHa*1000;
    var sprayTotalMl=sprayPerPlotMl*numPlots+deadVolumeMl;
    var sprayPerBottleMl=sprayTotalMl/numBottles;
    var haTotal=sprayVolume>0?(sprayTotalMl/1000)/sprayVolume:0; /* ha equivalentes na calda preparada */

    var liquidoMl=0,itens=[];
    comps.forEach(function(c){
      var p=perHaOf(c,sprayVolume);
      var total=p.perHa*haTotal;
      if(p.liquid)liquidoMl+=total;
      itens.push({
        id:c.id||null,itemId:c.itemId||null,doseRef:c.doseRef||null,loteRef:c.loteRef||null,
        nome:c.nome,unidade:normalizeDoseUnit(c.unidade),dose:parseNum(c.valor),liquid:p.liquid,
        perHa:round(p.perHa),unit:p.unit,
        concentration:round(sprayVolume>0?p.perHa/sprayVolume:0),
        concentrationUnit:p.liquid?"mL/L":"g/L",
        /* A MESMA dose lida do outro jeito. Uma % só vira quantidade depois de
           saber o volume: 0,25% é 7,5 mL/ha a 3 L/ha e 375 mL/ha a 150 L/ha —
           50× de diferença escrevendo igual. E uma dose por área tem uma % que
           lhe corresponde naquele volume. Guardar as duas leituras deixa a
           troca de volume visível em vez de silenciosa.
           Só faz sentido para líquido: sólido não tem v/v. */
        pctCalda:p.liquid&&sprayVolume>0?round((p.perHa/(sprayVolume*1000))*100):null,
        perPlot:round(p.perHa*plotAreaHa),
        total:round(total),
        perBottle:round(total/numBottles)
      });
    });

    var carrierTotalMl=sprayTotalMl-liquidoMl;
    var warnings=[];
    if(carrierTotalMl<0){
      warnings.push("Os líquidos somam "+round(liquidoMl/1000,3)+" L e a calda tem só "+
        round(sprayTotalMl/1000,3)+" L. Não cabe "+carrier.toLowerCase()+" nenhum: revise dose ou volume de calda.");
    }
    var minBottles=bottleCapacity>0?Math.ceil(sprayTotalMl/(bottleCapacity*1000)):0;
    itens.forEach(function(c){
      if(c.liquid&&c.perBottle>0&&c.perBottle<0.02){
        warnings.push(c.nome+": "+formatAmount(c.perBottle,"mL")+
          " por frasco é um volume muito pequeno. Confira se o instrumento mede essa faixa ou use uma diluição intermediária validada.");
      }
    });
    var _big=bottleTooLargeWarning(sprayTotalMl,bottleCapacity,formatAmount);
    if(_big) warnings.push(_big);
    var liquidFits=carrierTotalMl>=-0.000001;
    var bottleCapacityOk=minBottles===0||numBottles>=minBottles;

    return{
      components:itens,
      carrier:{nome:carrier,total:round(Math.max(carrierTotalMl,0)),
               perBottle:round(Math.max(carrierTotalMl,0)/numBottles),unit:"mL"},
      liquidTotalMl:round(liquidoMl),
      liquidFractionPct:round(sprayTotalMl>0?(liquidoMl/sprayTotalMl)*100:0),
      plotAreaHa:round(plotAreaHa),
      sprayPerPlotMl:round(sprayPerPlotMl),
      sprayTotalMl:round(sprayTotalMl),
      sprayPerBottleMl:round(sprayPerBottleMl),
      deadVolumeMl:round(deadVolumeMl),
      hectaresTotal:round(haTotal),
      minBottles:minBottles,
      requestedBottles:numBottles,
      liquidFits:liquidFits,
      bottleCapacityOk:bottleCapacityOk,
      canPrepare:liquidFits&&bottleCapacityOk,
      warnings:warnings
    };
  }

  function stableStringify(value){
    if(value===null||typeof value!=="object")return JSON.stringify(value);
    if(Array.isArray(value))return"["+value.map(stableStringify).join(",")+"]";
    return"{"+Object.keys(value).sort().map(function(key){
      return JSON.stringify(key)+":"+stableStringify(value[key]);
    }).join(",")+"}";
  }

  function formatBR(value,places){
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return"-";
    return Number(value).toLocaleString("pt-BR",{
      minimumFractionDigits:places,
      maximumFractionDigits:places
    });
  }

  /* Formatação operacional: precisão interna não muda, mas a bancada deixa de ver
     "0,54 mL" ou "6,600 mL" quando o instrumento real lê 540 µL e 6,6 mL. */
  function formatSmartBR(value,maxPlaces){
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return"-";
    var n=Number(value),lim=(maxPlaces==null?3:Math.max(0,maxPlaces));
    if(Math.abs(n)<1e-12)n=0;
    return n.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:lim});
  }

  function formatAmount(value,unit){
    var n=Number(value);
    if(!Number.isFinite(n))return"-";
    var a=Math.abs(n),u=String(unit||"");
    if(u==="mL"){
      if(a>=1000)return formatSmartBR(n/1000,3)+" L";
      if(a>0&&a<1)return formatSmartBR(n*1000,3)+" µL";
      return formatSmartBR(n,3)+" mL";
    }
    if(u==="g"){
      if(a>=1000)return formatSmartBR(n/1000,3)+" kg";
      if(a>0&&a<1)return formatSmartBR(n*1000,3)+" mg";
      return formatSmartBR(n,3)+" g";
    }
    return formatSmartBR(n,3)+(u?(" "+u):"");
  }

  function doseUnitLabel(unit){ return normalizeDoseUnit(unit)==="%"?"% v/v":normalizeDoseUnit(unit); }

  /* Versao do motor. Vai gravada na memoria de calculo de cada aplicacao: sem
     ela, um resultado guardado em 2026 nao teria como ser reconferido depois que
     a formula mudasse. Subir aqui sempre que o calculo mudar de resultado. */
  var VERSION="1.1.0";

  return{
    VERSION:VERSION,
    parseNum:parseNum,
    calculateTreatment:calculateTreatment,
    calculateCalibration:calculateCalibration,
    parseDose:parseDose,
    parseComponents:parseComponents,
    parseStructuredComponents:parseStructuredComponents,
    normalizeDoseUnit:normalizeDoseUnit,
    doseUnitLabel:doseUnitLabel,
    calculateMixture:calculateMixture,
    DOSE_UNITS:DOSE_UNITS,
    stableStringify:stableStringify,
    formatBR:formatBR,
    formatSmartBR:formatSmartBR,
    formatAmount:formatAmount
  };
});
