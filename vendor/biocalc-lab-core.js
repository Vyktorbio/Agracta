/* BioCalculo LABORATÓRIO — núcleo de cálculo puro (sem DOM), espelhando
   vendor/biocalc-campo-core.js. Portado de Vyktorbio/BioCalculo (calda.html),
   com duas mudanças deliberadas:

   1. parseNum usa a regra do Agracta (_calcNum), não o parseOptNum original:
      "1.500" no original virava 1,5 (dose 1000x menor). Aqui vira 1500.
   2. cada cálculo devolve um OBJETO (números + avisos), e a formatação em
      texto é uma função separada. Assim o resultado pode ser gravado no
      estudo, exportado ou conferido — o original só produzia string.

   Convenções: volumes em mL, massas em mg, concentração de i.a. em mg/L.
   O nome legado ppm neste módulo representa mg/L, não mg/kg nem µL/L.
   Fonte do produto: 'gL' | 'gkg' | 'mae' | 'puro'. */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.BioCalculoLab=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  /* Leitura integral: preserva 0.033 e notação científica. Em percentuais e
     densidades, ponto e vírgula são decimais; nos demais campos aceita milhar BR. */
  function parseNum(value,decimalOnly){
    if(value===null||value===undefined||value==="")return 0;
    if(typeof value==="number")return Number.isFinite(value)?value:NaN;
    var s=String(value).trim().replace(/\s/g,"");
    if(!decimalOnly && /^[+-]?[1-9]\d{0,2}(?:\.\d{3})+(?:,\d+)?$/.test(s))s=s.replace(/\./g,"");
    if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(s))return NaN;
    var n=Number(s.replace(",","."));
    return Number.isFinite(n)?n:NaN;
  }
  /* Opcional: devolve o padrão quando o campo está vazio (pureza/densidade). */
  function parseOpt(value,def){
    if(value===null||value===undefined||String(value).trim()==="")return def;
    return parseNum(value,true);
  }
  function resultadoFinito(out){
    Object.keys(out).forEach(function(k){
      if(typeof out[k]==='number'&&!Number.isFinite(out[k]))throw new Error('Os valores excedem o limite numérico do cálculo.');
    });
    return out;
  }
  function purezaValida(value){
    var p=parseOpt(value,100);
    if(!(p>0&&p<=100))throw new Error("A pureza deve ser maior que 0% e no máximo 100%.");
    return p;
  }
  function densidadeValida(value,obrigatoria){
    if(!informado(value)){
      if(obrigatoria)throw new Error("Informe a densidade para converter massa em volume.");
      return null;
    }
    var d=parseNum(value,true);
    if(!(d>0))throw new Error("A densidade deve ser um número maior que zero.");
    return d;
  }
  function parseTaxa(value){
    return parseNum(typeof value==='string'?value.replace(/\s*L\s*\/\s*ha\s*$/i,''):value);
  }
  function informado(value){
    return value!==null&&value!==undefined&&String(value).trim()!=="";
  }
  function round(value,places){
    var f=Math.pow(10,places===undefined?8:places);
    return Math.round((value+Number.EPSILON)*f)/f;
  }
  /* IMPORTANTE: os cálculos NÃO arredondam o que devolvem. Arredondar aqui
     quebra a conservação de massa (produto + solvente deixa de fechar com o
     volume final, e ppm x volume deixa de bater com a fonte). Quem arredonda
     é a exibição — fmtVivo/formatBR. */
  function formatBR(value,places){
    if(value===null||value===undefined||!Number.isFinite(Number(value)))return"-";
    return Number(value).toLocaleString("pt-BR",{
      minimumFractionDigits:places===undefined?2:places,
      maximumFractionDigits:places===undefined?2:places
    });
  }
  /* Número "vivo": casas decimais suficientes para o valor não virar 0,00 */
  function fmtVivo(v){
    if(!Number.isFinite(Number(v)))return"-";
    var a=Math.abs(v);
    if(a===0)return"0";
    if(a<0.000001)return Number(v).toExponential(4).replace('.',',');
    if(a>=100)return formatBR(v,1);
    if(a>=1)return formatBR(v,2);
    if(a>=0.01)return formatBR(v,4);
    return formatBR(v,6);
  }

  /* Versao do motor. Vai gravada na memoria de calculo: sem ela, um numero guardado
     hoje nao teria como ser reconferido depois que a formula mudasse. Sobe sempre que
     o calculo mudar de RESULTADO. */
  var VERSION="1.1.0";

  var FONTES={
    gL:  {rotulo:"Rótulo (g/L)",        campo:"Valor do rótulo (g/L)"},
    gkg: {rotulo:"Rótulo (g/kg) — pesar",campo:"Valor do rótulo (g/kg)"},
    mae: {rotulo:"Solução-mãe (mg/L)",  campo:"Concentração da solução-mãe (mg/L)"},
    puro:{rotulo:"Reagente puro (100%)",campo:""}
  };

  /* Concentração volumétrica da fonte em mg/L. Reagente sólido não tem
     concentração volumétrica sem um preparo: retorna null e calcula por massa.
     Valor em branco ou zero é ERRO, não zero: sem isso a divisão pela
     concentração da fonte dá Infinity e a receita sai em silêncio, sem número. */
  function fontePpm(tipo,valor,densidade){
    var d=densidadeValida(densidade,tipo==='gkg');
    if(tipo==="puro")return null;
    if(tipo!=="gL"&&tipo!=="gkg"&&tipo!=="mae")throw new Error("Fonte do produto não reconhecida.");
    var v=parseNum(valor);
    if(!(v>0))throw new Error(tipo==="mae"
      ? "Informe a concentração da solução-mãe (ppm)."
      : "Informe o valor do rótulo do produto ("+(tipo==="gkg"?"g/kg":"g/L")+").");
    if(tipo==='gkg'&&v>1000)throw new Error("O teor em g/kg não pode superar 1000.");
    if(tipo==="gL") return v*1000;
    if(tipo==="gkg")return v*d*1000;
    return v;
  }
  function concToPpm(valor,unidade,densidade){
    var v=parseNum(valor,unidade==='%'||unidade==='% m/v');
    if(unidade==="ppm"||unidade==="mg/L")return v;
    if(unidade==="%"||unidade==="% m/v")return v*10000;
    if(unidade==="g/L"||unidade==="mg/mL")return v*1000;
    if(unidade==="g/kg"){
      if(!(v>0&&v<=1000))throw new Error("O teor em g/kg deve estar entre 0 e 1000.");
      return v*densidadeValida(densidade,true)*1000;
    }
    return NaN;
  }
  function volToMl(v,u){
    if(u!=="L"&&u!=="mL")throw new Error("Use mL ou L para o volume final.");
    return u==="L"?parseNum(v)*1000:parseNum(v);
  }

  /* ---------------------------------------------------------- avisos --- */
  /* Volume de pipetagem: abaixo de ~10 µL o erro relativo domina o ensaio. */
  function alertaPipeta(mL){
    var uL=mL*1000;
    if(uL<=0)return null;
    if(uL<0.5)return{nivel:"critico",msg:"Volume de "+fmtVivo(uL)+" µL está abaixo do limite prático de micropipetas comuns."};
    if(uL<1)  return{nivel:"alto",   msg:"Volume de "+fmtVivo(uL)+" µL cai na zona de alto erro de pipetagem."};
    if(uL<=10)return{nivel:"medio",  msg:"Volume de "+fmtVivo(uL)+" µL exige micropipeta P10 calibrada."};
    return null;
  }
  function alertaMassa(mg){
    if(mg<=0)return null;
    if(mg<0.1)return{nivel:"critico",msg:"Massa de "+fmtVivo(mg)+" mg está abaixo da sensibilidade de muitas balanças analíticas."};
    if(mg<1)  return{nivel:"alto",   msg:"Massa de "+fmtVivo(mg)+" mg exige balança analítica de 0,01 mg."};
    return null;
  }
  /* Quando o volume é impipetável, propõe a diluição intermediária que resolve:
     fator 10^n que traz o volume para a faixa boa (>= 20 µL). */
  function sugereMae(mL,volumeFinalMl){
    var uL=mL*1000;
    if(!(uL>0)||uL>=20)return null;
    var fator=Math.pow(10,Math.ceil(Math.log10(20/uL)));
    if(!Number.isFinite(fator)||mL*fator>volumeFinalMl)return null;
    return{
      fator:fator,
      /* como preparar a mãe: 1 parte de produto em `fator` partes de solução */
      prepararMl:round(volumeFinalMl/fator,4),
      preparoTexto:"1 mL de produto + solvente até "+fmtVivo(fator)+" mL",
      pipetarMl:round(mL*fator,6),
      msg:"Prepare uma solução-mãe "+fmtVivo(fator)+"x ("+"1 mL de produto + solvente até "+fmtVivo(fator)+" mL"+") e pipete "+fmtVivo(mL*fator*1000)+" µL dela."
    };
  }

  /* ============================================================ PPM ===
     Preparar `volumeMl` a `alvoPpm` a partir da fonte escolhida. */
  function calcPPM(input){
    input=input||{};
    var alvoPpm=parseNum(input.alvoPpm), volumeMl=parseNum(input.volumeMl);
    var tipo=input.fonteTipo||"gL";
    var pureza=purezaValida(input.pureza), dens=densidadeValida(input.densidade,false);
    if(!(alvoPpm>0))throw new Error("A concentração alvo (ppm) deve ser maior que zero.");
    if(!(volumeMl>0))throw new Error("O volume final deve ser maior que zero.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    var teor=tipo==='gkg'?parseNum(input.fonteValor):null;
    if(tipo==='gkg'&&!(teor>0&&teor<=1000))throw new Error("Informe o teor do produto em g/kg, maior que zero e no máximo 1000.");
    var conc=tipo==='gkg'?(dens===null?null:fontePpm(tipo,input.fonteValor,dens)):fontePpm(tipo,input.fonteValor,dens);
    var out={
      modo:"ppm", alvoPpm:alvoPpm, volumeMl:volumeMl,
      fonteTipo:tipo, fonteRotulo:FONTES[tipo]?FONTES[tipo].rotulo:tipo,
      fontePpm:conc, pureza:pureza, densidade:dens,
      avisos:[], sugestaoMae:null
    };
    if(tipo!=="puro"&&pureza!==100)out.avisos.push({nivel:"medio",msg:"O teor declarado da fonte já define a quantidade de ingrediente ativo; a pureza adicional só se aplica ao reagente puro."});
    if(tipo==="puro"||tipo==="gkg"){
      var mg=alvoPpm*(volumeMl/1000)/(tipo==='puro'?pureza/100:teor/1000);
      if(tipo==='gkg'){ out.fonteValor=teor; out.fonteUnidade='g/kg'; }
      out.acao="pesar"; out.massaMg=mg; out.solventeMl=volumeMl;
      var am=alertaMassa(mg); if(am)out.avisos.push(am);
    }else{
      var vp=(alvoPpm*volumeMl)/conc;
      out.acao="pipetar"; out.produtoMl=vp; out.produtoUl=vp*1000;
      var solv=volumeMl-vp;
      if(solv<0){
        out.impossivel=true; out.solventeMl=0;
        out.avisos.push({nivel:"critico",msg:"A concentração alvo excede a fonte e não pode ser obtida por diluição. Use uma fonte mais concentrada ou reduza a concentração alvo."});
      }else{
        out.solventeMl=solv;
      }
      var ap=alertaPipeta(vp); if(ap)out.avisos.push(ap);
      out.sugestaoMae=sugereMae(vp,volumeMl);
    }
    return resultadoFinito(out);
  }

  /* PPM inverso: "tenho esta quantidade — que volume final consigo?" */
  function calcPPMInverso(input){
    input=input||{};
    var alvoPpm=parseNum(input.alvoPpm), disp=parseNum(input.disponivel);
    var tipo=input.fonteTipo||"puro", pureza=purezaValida(input.pureza);
    if(!(alvoPpm>0))throw new Error("A concentração alvo (ppm) deve ser maior que zero.");
    if(!(disp>0))throw new Error("Informe a quantidade disponível.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    if(tipo!=="puro"&&tipo!=="mae")throw new Error("O modo inverso só funciona com reagente puro ou solução-mãe.");
    var out={modo:"ppm-inverso",alvoPpm:alvoPpm,fonteTipo:tipo,
      fonteRotulo:FONTES[tipo].rotulo,disponivel:disp,pureza:pureza,avisos:[]};
    if(tipo==="puro"){
      var mgA=disp*(pureza/100);
      out.usarMassaMg=disp; out.massaEfetivaMg=mgA;
      out.volumeFinalMl=(mgA/alvoPpm)*1000;
    }else{
      var maePpm=fontePpm("mae",input.fonteValor,input.densidade);
      if(alvoPpm>=maePpm)throw new Error("A concentração alvo é maior ou igual à da solução-mãe — não se obtém por diluição.");
      var mg=maePpm*(disp/1000);
      out.maePpm=maePpm; out.usarVolumeMl=disp;
      out.volumeFinalMl=(mg/alvoPpm)*1000;
      var ap=alertaPipeta(disp); if(ap)out.avisos.push(ap);
    }
    return resultadoFinito(out);
  }

  /* ================================================ CAMPO -> BANCADA ===
     Converte a dose de campo (com a vazão) na receita do pote do lab. */
  function calcCampo(input){
    input=input||{};
    var unidade=input.unidade||"mL/ha";
    if(['mL/ha','L/ha','g/ha','kg/ha','% v/v'].indexOf(unidade)<0)throw new Error("Unidade da dose não reconhecida: "+unidade+".");
    var dose=parseNum(input.dose,unidade==='% v/v');
    var vazao=parseTaxa(input.vazao), volumeMl=parseNum(input.volumeMl);
    var base=input.base||"formulado";
    var pureza=purezaValida(input.pureza);
    var densDada=informado(input.densidade), dens=densidadeValida(input.densidade,false);
    if(!(dose>0))throw new Error("A dose deve ser maior que zero.");
    if(!(volumeMl>0))throw new Error("O volume do pote deve ser maior que zero.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    if(base!=='formulado'&&base!=='ia')throw new Error("Base da dose não reconhecida.");

    var out={modo:"campo",dose:dose,unidade:unidade,volumeMl:volumeMl,
      base:base,pureza:pureza,densidade:dens,avisos:[],sugestaoMae:null};
    if(pureza!==100)out.avisos.push({nivel:"medio",msg:"A dose de produto formulado usa o teor declarado, sem correção adicional de pureza. Para reagente puro, use o preparo por concentração."});
    pureza=100;

    /* % v/v não depende de vazão: é proporção direta na calda */
    if(unidade==="% v/v"){
      if(base!=="formulado")throw new Error('A unidade % v/v vale para produto formulado.');
      if(dose>100)throw new Error("A concentração em % v/v não pode superar 100%.");
      var q=volumeMl*(dose/100);
      out.acao="pipetar"; out.produtoMl=q; out.produtoUl=q*1000;
      out.solventeMl=Math.max(0,volumeMl-q);
      out.concentracaoPct=dose; out.concentracaoBase="v/v";
      out.concentracaoPpm=dose*10000; out.concentracaoUnidade='µL/L de produto';
      var a1=alertaPipeta(q); if(a1)out.avisos.push(a1);
      out.sugestaoMae=sugereMae(q,volumeMl);
      return resultadoFinito(out);
    }
    if(!(vazao>0))throw new Error("Informe a vazão (L/ha) maior que zero.");
    out.vazao=vazao;

    /* dose em i.a. -> equivalente em produto formulado */
    var df,uf;
    if(base==="formulado"){ df=dose; uf=unidade; }
    else{
      var val=parseNum(input.iaValor), iaU=input.iaUnid||"g/L";
      if(!(val>0))throw new Error("Informe a concentração de i.a. no produto.");
      if(!(unidade==="g/ha"||unidade==="kg/ha"))throw new Error("Quando a dose é em i.a., use g/ha ou kg/ha.");
      var dg0=unidade==="kg/ha"?dose*1000:dose;
      if(iaU==="g/L"||iaU==="mg/mL"){ df=dg0/val; uf="L/ha"; }
      else if(iaU==="g/kg"){
        if(val>1000)throw new Error("O teor em g/kg não pode superar 1000.");
        df=dg0/val; uf="kg/ha";
      }
      else throw new Error("Unidade de i.a. não reconhecida.");
      out.iaValor=val; out.iaUnid=iaU;
    }
    out.formuladoEquiv=df; out.formuladoUnid=uf;

    /* cr = quanto de produto por mL de calda */
    var cr,massaG=null,volProd=null,acao;
    if(uf==="mL/ha"||uf==="L/ha"){
      var dml=uf==="L/ha"?df*1000:df;
      cr=dml/(vazao*1000); volProd=volumeMl*cr; acao="pipetar";
      out.concentracaoBase="v/v";
    }else{
      var dg=uf==="kg/ha"?df*1000:df;
      cr=dg/(vazao*1000); massaG=volumeMl*cr;
      out.concentracaoBase="m/v";
      if(densDada){ volProd=massaG/dens; acao="pipetar"; } else { acao="pesar"; }
    }
    out.concentracaoPct=cr*100;
    out.concentracaoPpm=cr*1000000; /* 1 mL/mL = 1e6 ppm em base v/v */
    out.concentracaoUnidade=out.concentracaoBase==='v/v'?'µL/L de produto':'mg/L de produto';
    out.acao=acao;

    if(acao==="pesar"){
      var mgc=(massaG/(pureza/100))*1000;
      out.massaMg=mgc; out.massaG=mgc/1000;
      out.solventeMl=volumeMl;
      var am=alertaMassa(mgc); if(am)out.avisos.push(am);
    }else{
      var vc;
      if(massaG!==null){ var mc=massaG/(pureza/100); vc=mc/dens; out.massaEquivMg=mc*1000; }
      else { vc=volProd/(pureza/100); }
      out.produtoMl=vc; out.produtoUl=vc*1000;
      out.solventeMl=Math.max(0,volumeMl-vc);
      if(vc>volumeMl){
        out.impossivel=true;
        out.avisos.push({nivel:"critico",msg:"O volume de produto ("+fmtVivo(vc)+" mL) excede o volume do pote."});
      }
      var ap2=alertaPipeta(vc); if(ap2)out.avisos.push(ap2);
      out.sugestaoMae=sugereMae(vc,volumeMl);
    }
    return resultadoFinito(out);
  }

  /* ==================================================== AJUSTE DE i.a. ===
     Diluir um formulado concentrado até uma concentração menor (C1V1=C2V2). */
  function calcAjusteIA(input){
    input=input||{};
    var oU=input.origemUnid||"g/L", aU=input.alvoUnid||"g/L";
    var volU=input.volumeUnid||"mL", volFinal=parseNum(input.volumeFinal);
    var dens=densidadeValida(input.densidade,false);
    var densAlvo=densidadeValida(input.densidadeAlvo,false);
    if(!(parseNum(input.origemValor)>0)||!(parseNum(input.alvoValor)>0))throw new Error("Informe as concentrações de origem e alvo.");
    if(!(volFinal>0))throw new Error("O volume final deve ser maior que zero.");
    if(oU==="g/kg"&&dens===null)throw new Error("Para origem em g/kg, informe a densidade do produto.");
    if(aU==="g/kg"&&densAlvo===null)throw new Error("Para alvo em g/kg, informe a densidade da solução final; a densidade do produto não a substitui.");
    var op=concToPpm(input.origemValor,oU,input.densidade);
    var ap=concToPpm(input.alvoValor,aU,input.densidadeAlvo);
    if(!Number.isFinite(op)||!Number.isFinite(ap))throw new Error("Não foi possível converter as unidades.");
    if(ap>=op)throw new Error("A concentração desejada precisa ser menor que a atual.");
    var vfml=volToMl(volFinal,volU), pm=(ap*vfml)/op;
    var out={modo:"ia",origemPpm:op,alvoPpm:ap,
      volumeFinal:volFinal,volumeUnid:volU,volumeFinalMl:vfml,
      densidade:dens,densidadeAlvo:densAlvo,acao:"pipetar",produtoMl:pm,produtoUl:pm*1000,
      solventeMl:Math.max(0,vfml-pm),
      fatorDiluicao:op/ap,avisos:[]};
    var a=alertaPipeta(pm); if(a)out.avisos.push(a);
    out.sugestaoMae=sugereMae(pm,vfml);
    return resultadoFinito(out);
  }

  /* ========================================================== SÉRIE ===
     Série de doses (curva), cada uma no mesmo volume. */
  function parseListaDoses(str){
    var s=String(str||"").trim();
    var itens=s.indexOf(";")>=0?s.split(";"):s.split(/\s+/);
    var nums=itens.map(function(x){ return parseNum(x.trim()); });
    if(!nums.length||nums.some(function(n){return !(n>0);}))throw new Error("Toda dose deve ser um número maior que zero. Separe por ponto-e-vírgula (;).");
    return nums;
  }
  function gerarSerieAuto(topo,fator,n){
    topo=parseNum(topo); fator=parseNum(fator); n=parseNum(n);
    if(!(topo>0))throw new Error("A dose de topo deve ser maior que zero.");
    if(!(fator>1))throw new Error("O fator de diluição deve ser maior que 1.");
    if(!(Number.isInteger(n)&&n>0&&n<=1000))throw new Error("Informe um número inteiro de doses entre 1 e 1000.");
    var d=[],v=topo;
    for(var i=0;i<n;i++){
      if(!(v>0))throw new Error("A série excede a precisão numérica. Reduza o fator ou o número de doses.");
      d.push(v); v/=fator;
    }
    return d;
  }
  function calcSerie(input){
    input=input||{};
    var doses=(input.doses||[]).map(function(v){return parseNum(v);});
    if(!doses.length||doses.some(function(v){return !(v>0);}))throw new Error("Informe doses válidas, todas maiores que zero.");
    doses.sort(function(a,b){return b-a;});
    var linhas=[],avisos=[];
    doses.forEach(function(ppm,i){
      var r=calcPPM(Object.assign({},input,{alvoPpm:ppm}));
      r.ordem=i+1; r.ppm=ppm;
      r.avisos.forEach(function(a){avisos.push({ppm:ppm,aviso:a});});
      linhas.push(r);
    });
    var primeiro=linhas[0];
    return {modo:'serie',volumeMl:primeiro.volumeMl,fonteTipo:primeiro.fonteTipo,
      fonteRotulo:primeiro.fonteRotulo,fontePpm:primeiro.fontePpm,
      fonteValor:primeiro.fonteValor,fonteUnidade:primeiro.fonteUnidade,
      pureza:primeiro.pureza,densidade:primeiro.densidade,testemunha:!!input.testemunha,
      linhas:linhas,avisos:avisos};
  }

  /* ====================================================== FORMATAÇÃO ===
     Relatório de texto para copiar/colar (o objeto continua disponível). */
  function formatar(r,contexto){
    if(!r)return"";
    if(r.impossivel)return "PREPARO INVIÁVEL\n"+(r.avisos||[]).map(function(a){return a.msg;}).join("\n");
    var L=[],reg="--------------------------------------------------";
    function cab(t){ L.push(reg); L.push(t); if(contexto&&contexto.titulo)L.push(contexto.titulo); if(contexto&&contexto.data)L.push("Data: "+contexto.data); L.push(reg); }
    function passos(){ L.push(">>> COMO PREPARAR:"); }
    function avisos(list){
      if(!list||!list.length)return;
      L.push("");
      list.forEach(function(a){ L.push((a.nivel==="critico"?"!! ":"!  ")+a.msg); });
    }
    function mae(s){ if(s){ L.push(""); L.push("SAÍDA: "+s.msg); } }

    if(r.modo==="ppm"){
      cab("PREPARO POR CONCENTRAÇÃO (PPM)");
      L.push("Fonte: "+r.fonteRotulo+(r.fonteTipo==="gkg"?" — "+fmtVivo(r.fonteValor)+" g/kg":r.fonteTipo!=="puro"?" — "+fmtVivo(r.fontePpm)+" mg/L":""));
      L.push("Meta: "+fmtVivo(r.volumeMl)+" mL a "+fmtVivo(r.alvoPpm)+" mg/L (concentração de i.a.)");
      if(r.fonteTipo==="puro"&&r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
      L.push(reg); passos();
      if(r.acao==="pesar"){
        L.push("1. PESAR "+fmtVivo(r.massaMg)+" mg"+(r.pureza!==100?" (já corrigido para a pureza)":""));
      }else{
        L.push("1. PIPETAR "+fmtVivo(r.produtoMl)+" mL  (= "+fmtVivo(r.produtoUl)+" µL)");
        if(r.massaEquivMg!=null)L.push("   se for sólido: PESAR "+fmtVivo(r.massaEquivMg)+" mg");
      }
      L.push("2. COMPLETAR com solvente até "+fmtVivo(r.volumeMl)+" mL");
      avisos(r.avisos); mae(r.sugestaoMae);
    }
    else if(r.modo==="ppm-inverso"){
      cab("PREPARO POR QUANTIDADE DISPONÍVEL");
      L.push("Fonte: "+r.fonteRotulo);
      L.push("Alvo: "+fmtVivo(r.alvoPpm)+" ppm");
      L.push(reg); passos();
      if(r.fonteTipo==="puro"){
        L.push("1. USAR a massa disponível: "+fmtVivo(r.usarMassaMg)+" mg");
        if(r.pureza!==100)L.push("   massa efetiva de i.a.: "+fmtVivo(r.massaEfetivaMg)+" mg");
      }else{
        L.push("1. PIPETAR "+fmtVivo(r.usarVolumeMl)+" mL da solução-mãe ("+fmtVivo(r.maePpm)+" mg/L"+")");
      }
      L.push("2. COMPLETAR com solvente até "+fmtVivo(r.volumeFinalMl)+" mL");
      avisos(r.avisos);
    }
    else if(r.modo==="campo"){
      cab("CAMPO -> BANCADA");
      L.push("Dose de campo: "+fmtVivo(r.dose)+" "+r.unidade+(r.vazao?" | vazão "+fmtVivo(r.vazao)+" L/ha":""));
      if(r.base==="ia")L.push("Dose em i.a. ("+fmtVivo(r.iaValor)+" "+r.iaUnid+") -> "+fmtVivo(r.formuladoEquiv)+" "+r.formuladoUnid+" de formulado");
      L.push("Concentração da calda: "+fmtVivo(r.concentracaoPct)+" % "+r.concentracaoBase+" (~"+fmtVivo(r.concentracaoPpm)+" "+r.concentracaoUnidade+")");
      if(r.fonteTipo==="puro"&&r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
      L.push(reg);
      L.push(">>> PARA "+fmtVivo(r.volumeMl)+" mL NO POTE:");
      if(r.acao==="pesar"){
        L.push("1. PESAR "+fmtVivo(r.massaMg)+" mg");
      }else{
        L.push("1. PIPETAR "+fmtVivo(r.produtoMl)+" mL  (= "+fmtVivo(r.produtoUl)+" µL)");
        if(r.massaEquivMg!=null)L.push("   massa equivalente: "+fmtVivo(r.massaEquivMg)+" mg (densidade "+fmtVivo(r.densidade)+" g/mL)");
      }
      L.push("2. COMPLETAR com solvente até "+fmtVivo(r.volumeMl)+" mL");
      avisos(r.avisos); mae(r.sugestaoMae);
    }
    else if(r.modo==="ia"){
      cab("AJUSTE DE CONCENTRAÇÃO DE i.a.");
      L.push("De "+fmtVivo(r.origemPpm)+" ppm para "+fmtVivo(r.alvoPpm)+" ppm (diluição 1:"+fmtVivo(r.fatorDiluicao)+")");
      L.push("Volume final: "+fmtVivo(r.volumeFinal)+" "+r.volumeUnid);
      L.push(reg); passos();
      L.push("1. PIPETAR "+fmtVivo(r.produtoMl)+" mL  (= "+fmtVivo(r.produtoUl)+" µL)");
      L.push("2. COMPLETAR com solvente até "+fmtVivo(r.volumeFinal)+" "+r.volumeUnid);
      avisos(r.avisos); mae(r.sugestaoMae);
    }
    else if(r.modo==="serie"){
      L.push("=================================================="); L.push("SÉRIE DE DOSES");
      if(contexto&&contexto.titulo)L.push(contexto.titulo);
      if(contexto&&contexto.data)L.push("Data: "+contexto.data);
      L.push("==================================================");
      L.push("Fonte: "+r.fonteRotulo+(r.fonteTipo==="gkg"?" — "+fmtVivo(r.fonteValor)+" g/kg":r.fonteTipo!=="puro"?" — "+fmtVivo(r.fontePpm)+" mg/L":""));
      L.push("Volume por dose: "+fmtVivo(r.volumeMl)+" mL");
      L.push("Nº de doses: "+r.linhas.length+(r.testemunha?" + testemunha":""));
      if(r.fonteTipo==="puro"&&r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
      L.push("==================================================");
      L.push("");
      var puro=(r.fonteTipo==="puro"||r.fonteTipo==="gkg");
      var head=puro?"  mg/L (ppm)   | pesar (mg)   | completar até (mL)"
                   :"  mg/L (ppm)   | produto (µL) | completar até (mL)";
      L.push(head); L.push("  "+new Array(head.trim().length+1).join("-"));
      r.linhas.forEach(function(x){
        if(x.impossivel){L.push("  "+fmtVivo(x.ppm)+" mg/L: PREPARO INVIÁVEL");return;}
        var c1=String(fmtVivo(x.ppm)); while(c1.length<13)c1+=" ";
        var c2=String(puro?fmtVivo(x.massaMg):fmtVivo(x.produtoUl)); while(c2.length<13)c2+=" ";
        L.push("  "+c1+"| "+c2+"| "+fmtVivo(r.volumeMl));
      });
      if(r.testemunha)L.push("  0 (testem.)  |  —           | "+fmtVivo(r.volumeMl));
      if(r.avisos.length){
        L.push(""); L.push("AVISOS DE PRECISÃO:");
        r.avisos.forEach(function(a){ L.push("  "+fmtVivo(a.ppm)+" ppm: "+a.aviso.msg); });
      }
      L.push("==================================================");
    }
    return L.join("\n");
  }

  return{
    VERSION:VERSION,
    FONTES:FONTES,
    parseNum:parseNum, parseOpt:parseOpt, parseTaxa:parseTaxa, formatBR:formatBR, fmtVivo:fmtVivo, round:round,
    fontePpm:fontePpm, concToPpm:concToPpm, volToMl:volToMl,
    alertaPipeta:alertaPipeta, alertaMassa:alertaMassa, sugereMae:sugereMae,
    calcPPM:calcPPM, calcPPMInverso:calcPPMInverso, calcCampo:calcCampo,
    calcAjusteIA:calcAjusteIA, calcSerie:calcSerie,
    parseListaDoses:parseListaDoses, gerarSerieAuto:gerarSerieAuto,
    formatar:formatar
  };
});
