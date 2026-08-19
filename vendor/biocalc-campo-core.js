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

  function doseConfig(dose,unit){
    var numeric=parseNum(dose);
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
      bottleCapacityOk:minBottles===0||numBottles>=minBottles
    };
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
    else unidade=(DOSE_UNITS.indexOf(fallbackUnit)>=0?fallbackUnit:"L/ha");
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
        nome:c.nome,unidade:c.unidade,dose:parseNum(c.valor),liquid:p.liquid,
        perHa:round(p.perHa),unit:p.unit,
        concentration:round(sprayVolume>0?p.perHa/sprayVolume:0),
        concentrationUnit:p.liquid?"mL/L":"g/L",
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

    return{
      components:itens,
      carrier:{nome:carrier,total:round(Math.max(carrierTotalMl,0)),
               perBottle:round(Math.max(carrierTotalMl,0)/numBottles),unit:"mL"},
      liquidTotalMl:round(liquidoMl),
      plotAreaHa:round(plotAreaHa),
      sprayPerPlotMl:round(sprayPerPlotMl),
      sprayTotalMl:round(sprayTotalMl),
      sprayPerBottleMl:round(sprayPerBottleMl),
      deadVolumeMl:round(deadVolumeMl),
      hectaresTotal:round(haTotal),
      minBottles:minBottles,
      requestedBottles:numBottles,
      bottleCapacityOk:minBottles===0||numBottles>=minBottles,
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

  return{
    parseNum:parseNum,
    calculateTreatment:calculateTreatment,
    calculateCalibration:calculateCalibration,
    parseDose:parseDose,
    parseComponents:parseComponents,
    calculateMixture:calculateMixture,
    DOSE_UNITS:DOSE_UNITS,
    stableStringify:stableStringify,
    formatBR:formatBR
  };
});
