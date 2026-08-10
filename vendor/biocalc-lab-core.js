/* BioCalculo LABORATÓRIO — núcleo de cálculo puro (sem DOM), espelhando
   vendor/biocalc-campo-core.js. Portado de Vyktorbio/BioCalculo (calda.html),
   com duas mudanças deliberadas:

   1. parseNum usa a regra do Agracta (_calcNum), não o parseOptNum original:
      "1.500" no original virava 1,5 (dose 1000x menor). Aqui vira 1500.
   2. cada cálculo devolve um OBJETO (números + avisos), e a formatação em
      texto é uma função separada. Assim o resultado pode ser gravado no
      estudo, exportado ou conferido — o original só produzia string.

   Convenções: volumes em mL, massas em mg, concentrações em ppm (mg/L).
   Fonte do produto: 'gL' | 'gkg' | 'mae' | 'puro'. */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.BioCalculoLab=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  /* Mesma regra do _calcNum do app.js: remove o ponto de MILHAR (ponto seguido de
     exatamente 3 dígitos e um não-dígito/fim) antes de trocar a vírgula decimal. */
  function parseNum(value){
    if(value===null||value===undefined||value==="")return 0;
    if(typeof value==="number")return isFinite(value)?value:0;
    var s=String(value).replace(/\s/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"");
    var n=Number.parseFloat(s.replace(",","."));
    return Number.isFinite(n)?n:0;
  }
  /* Opcional: devolve o padrão quando o campo está vazio (pureza/densidade). */
  function parseOpt(value,def){
    if(value===null||value===undefined||String(value).trim()==="")return def;
    var n=parseNum(value);
    return Number.isFinite(n)&&n!==0?n:def;
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
    if(a>=100)return formatBR(v,1);
    if(a>=1)return formatBR(v,2);
    if(a>=0.01)return formatBR(v,4);
    return formatBR(v,6);
  }

  var FONTES={
    gL:  {rotulo:"Rótulo (g/L)",        campo:"Valor do rótulo (g/L)"},
    gkg: {rotulo:"Rótulo (g/kg)",       campo:"Valor do rótulo (g/kg)"},
    mae: {rotulo:"Solução-mãe (ppm)",   campo:"Concentração da solução-mãe (ppm)"},
    puro:{rotulo:"Reagente puro (100%)",campo:""}
  };

  /* Concentração da FONTE em ppm (mg/L). Pó puro = 1.000.000 ppm.
     Valor em branco ou zero é ERRO, não zero: sem isso a divisão pela
     concentração da fonte dá Infinity e a receita sai em silêncio, sem número. */
  function fontePpm(tipo,valor,densidade){
    var d=parseOpt(densidade,1);
    if(tipo==="puro")return 1000000;
    if(tipo!=="gL"&&tipo!=="gkg"&&tipo!=="mae")throw new Error("Fonte do produto não reconhecida.");
    var v=parseNum(valor);
    if(!(v>0))throw new Error(tipo==="mae"
      ? "Informe a concentração da solução-mãe (ppm)."
      : "Informe o valor do rótulo do produto ("+(tipo==="gkg"?"g/kg":"g/L")+").");
    if(tipo==="gL") return v*1000;
    if(tipo==="gkg")return v*d*1000;
    return v;
  }
  function concToPpm(valor,unidade,densidade){
    var d=parseOpt(densidade,1), v=parseNum(valor);
    if(unidade==="ppm")return v;
    if(unidade==="%")return v*10000;
    if(unidade==="g/L"||unidade==="mg/mL")return v*1000;
    if(unidade==="g/kg")return v*d*1000;
    return NaN;
  }
  function volToMl(v,u){ return u==="L"?parseNum(v)*1000:parseNum(v); }

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
    var pureza=parseOpt(input.pureza,100), dens=parseOpt(input.densidade,1);
    if(!(alvoPpm>0))throw new Error("A concentração alvo (ppm) deve ser maior que zero.");
    if(!(volumeMl>0))throw new Error("O volume final deve ser maior que zero.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    var conc=fontePpm(tipo,input.fonteValor,input.densidade);
    var out={
      modo:"ppm", alvoPpm:alvoPpm, volumeMl:volumeMl,
      fonteTipo:tipo, fonteRotulo:FONTES[tipo]?FONTES[tipo].rotulo:tipo,
      fontePpm:conc, pureza:pureza, densidade:dens,
      avisos:[], sugestaoMae:null
    };
    if(tipo==="puro"){
      var mg=alvoPpm*(volumeMl/1000)/(pureza/100);
      out.acao="pesar"; out.massaMg=mg; out.solventeMl=volumeMl;
      var am=alertaMassa(mg); if(am)out.avisos.push(am);
    }else{
      var vp=(alvoPpm*volumeMl)/conc;
      out.acao="pipetar"; out.produtoMl=vp; out.produtoUl=vp*1000;
      if(tipo==="gkg"){ out.massaEquivMg=vp*dens*1000; }
      var solv=volumeMl-vp;
      if(solv<0){
        out.impossivel=true; out.solventeMl=0;
        out.avisos.push({nivel:"critico",msg:"O volume de produto ("+fmtVivo(vp)+" mL) excede o volume final. Reduza a concentração alvo ou aumente o volume."});
      }else{
        out.solventeMl=solv;
      }
      var ap=alertaPipeta(vp); if(ap)out.avisos.push(ap);
      out.sugestaoMae=sugereMae(vp,volumeMl);
    }
    return out;
  }

  /* PPM inverso: "tenho esta quantidade — que volume final consigo?" */
  function calcPPMInverso(input){
    input=input||{};
    var alvoPpm=parseNum(input.alvoPpm), disp=parseNum(input.disponivel);
    var tipo=input.fonteTipo||"puro", pureza=parseOpt(input.pureza,100);
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
    return out;
  }

  /* ================================================ CAMPO -> BANCADA ===
     Converte a dose de campo (com a vazão) na receita do pote do lab. */
  function calcCampo(input){
    input=input||{};
    var dose=parseNum(input.dose), unidade=input.unidade||"mL/ha";
    var vazao=parseNum(input.vazao), volumeMl=parseNum(input.volumeMl);
    var base=input.base||"formulado";
    var pureza=parseOpt(input.pureza,100);
    var densDada=informado(input.densidade), dens=parseOpt(input.densidade,1);
    if(!(dose>0))throw new Error("A dose deve ser maior que zero.");
    if(!(volumeMl>0))throw new Error("O volume do pote deve ser maior que zero.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    if(!(dens>0))throw new Error("A densidade deve ser maior que zero.");

    var out={modo:"campo",dose:dose,unidade:unidade,volumeMl:volumeMl,
      base:base,pureza:pureza,densidade:dens,avisos:[],sugestaoMae:null};

    /* % v/v não depende de vazão: é proporção direta na calda */
    if(unidade==="% v/v"){
      if(base!=="formulado")throw new Error('A unidade % v/v vale para produto formulado.');
      var q=volumeMl*(dose/100);
      out.acao="pipetar"; out.produtoMl=q; out.produtoUl=q*1000;
      out.solventeMl=Math.max(0,volumeMl-q);
      out.concentracaoPct=dose; out.concentracaoBase="v/v";
      var a1=alertaPipeta(q); if(a1)out.avisos.push(a1);
      out.sugestaoMae=sugereMae(q,volumeMl);
      return out;
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
      else if(iaU==="g/kg"){ df=dg0/val; uf="kg/ha"; }
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
    return out;
  }

  /* ==================================================== AJUSTE DE i.a. ===
     Diluir um formulado concentrado até uma concentração menor (C1V1=C2V2). */
  function calcAjusteIA(input){
    input=input||{};
    var oU=input.origemUnid||"g/L", aU=input.alvoUnid||"g/L";
    var volU=input.volumeUnid||"mL", volFinal=parseNum(input.volumeFinal);
    var densDada=informado(input.densidade), dens=parseOpt(input.densidade,1);
    if(!(parseNum(input.origemValor)>0)||!(parseNum(input.alvoValor)>0))throw new Error("Informe as concentrações de origem e alvo.");
    if(!(volFinal>0))throw new Error("O volume final deve ser maior que zero.");
    if((oU==="g/kg"||aU==="g/kg")&&!densDada)throw new Error("Para g/kg, informe a densidade do produto.");
    var op=concToPpm(input.origemValor,oU,input.densidade);
    var ap=concToPpm(input.alvoValor,aU,input.densidade);
    if(!Number.isFinite(op)||!Number.isFinite(ap))throw new Error("Não foi possível converter as unidades.");
    if(ap>=op)throw new Error("A concentração desejada precisa ser menor que a atual.");
    var vfml=volToMl(volFinal,volU), pm=(ap*vfml)/op;
    var out={modo:"ia",origemPpm:op,alvoPpm:ap,
      volumeFinal:volFinal,volumeUnid:volU,volumeFinalMl:vfml,
      densidade:dens,acao:"pipetar",produtoMl:pm,produtoUl:pm*1000,
      solventeMl:Math.max(0,vfml-pm),
      fatorDiluicao:op/ap,avisos:[]};
    var a=alertaPipeta(pm); if(a)out.avisos.push(a);
    out.sugestaoMae=sugereMae(pm,vfml);
    return out;
  }

  /* ========================================================== SÉRIE ===
     Série de doses (curva), cada uma no mesmo volume. */
  function parseListaDoses(str){
    var s=String(str||"");
    var itens=s.indexOf(";")>=0?s.split(";"):s.split(/\s+/);
    var nums=itens.map(function(x){ return parseNum(x.trim()); }).filter(function(n){ return Number.isFinite(n)&&n>0; });
    if(!nums.length)throw new Error("Nenhuma dose válida. Separe por ponto-e-vírgula (;).");
    return nums;
  }
  function gerarSerieAuto(topo,fator,n){
    topo=parseNum(topo); fator=parseNum(fator); n=Math.round(parseNum(n));
    if(!(topo>0))throw new Error("A dose de topo deve ser maior que zero.");
    if(!(fator>1))throw new Error("O fator de diluição deve ser maior que 1.");
    if(!(n>0))throw new Error("Informe o número de doses.");
    var d=[],v=topo;
    for(var i=0;i<n;i++){ d.push(round(v,8)); v/=fator; }
    return d;
  }
  function calcSerie(input){
    input=input||{};
    var volumeMl=parseNum(input.volumeMl), tipo=input.fonteTipo||"gL";
    var pureza=parseOpt(input.pureza,100), dens=parseOpt(input.densidade,1);
    var doses=(input.doses||[]).map(parseNum).filter(function(n){return n>0;});
    if(!(volumeMl>0))throw new Error("O volume por dose deve ser maior que zero.");
    if(!(pureza>0))throw new Error("A pureza deve ser maior que 0%.");
    if(!doses.length)throw new Error("Informe ao menos uma dose.");
    var conc=fontePpm(tipo,input.fonteValor,input.densidade);
    doses.sort(function(a,b){ return b-a; });
    var puro=(tipo==="puro"), linhas=[], avisos=[];
    doses.forEach(function(ppm,i){
      var L={ordem:i+1,ppm:ppm,avisos:[]};
      if(puro){
        var mg=(ppm*(volumeMl/1000))/(pureza/100);
        L.acao="pesar"; L.massaMg=mg; L.solventeMl=volumeMl;
        var am=alertaMassa(mg); if(am){ L.avisos.push(am); avisos.push({ppm:ppm,aviso:am}); }
      }else{
        var vp=(ppm*volumeMl)/conc;
        L.acao="pipetar"; L.produtoMl=vp; L.produtoUl=vp*1000;
        if(vp>volumeMl){ L.impossivel=true; L.solventeMl=0;
          var im={nivel:"critico",msg:"volume de produto maior que o volume final"};
          L.avisos.push(im); avisos.push({ppm:ppm,aviso:im});
        } else { L.solventeMl=volumeMl-vp; }
        var ap=alertaPipeta(vp); if(ap){ L.avisos.push(ap); avisos.push({ppm:ppm,aviso:ap}); }
        L.sugestaoMae=sugereMae(vp,volumeMl);
      }
      linhas.push(L);
    });
    return{modo:"serie",volumeMl:volumeMl,fonteTipo:tipo,
      fonteRotulo:FONTES[tipo]?FONTES[tipo].rotulo:tipo,fontePpm:conc,
      pureza:pureza,densidade:dens,testemunha:!!input.testemunha,
      linhas:linhas,avisos:avisos};
  }

  /* ====================================================== FORMATAÇÃO ===
     Relatório de texto para copiar/colar (o objeto continua disponível). */
  function formatar(r,contexto){
    if(!r)return"";
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
      L.push("Fonte: "+r.fonteRotulo+(r.fonteTipo!=="puro"?" — "+fmtVivo(r.fontePpm)+" ppm":""));
      L.push("Meta: "+fmtVivo(r.volumeMl)+" mL a "+fmtVivo(r.alvoPpm)+" ppm");
      if(r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
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
        L.push("1. PIPETAR "+fmtVivo(r.usarVolumeMl)+" mL da solução-mãe ("+fmtVivo(r.maePpm)+" ppm)");
      }
      L.push("2. COMPLETAR com solvente até "+fmtVivo(r.volumeFinalMl)+" mL");
      avisos(r.avisos);
    }
    else if(r.modo==="campo"){
      cab("CAMPO -> BANCADA");
      L.push("Dose de campo: "+fmtVivo(r.dose)+" "+r.unidade+(r.vazao?" | vazão "+fmtVivo(r.vazao)+" L/ha":""));
      if(r.base==="ia")L.push("Dose em i.a. ("+fmtVivo(r.iaValor)+" "+r.iaUnid+") -> "+fmtVivo(r.formuladoEquiv)+" "+r.formuladoUnid+" de formulado");
      L.push("Concentração da calda: "+fmtVivo(r.concentracaoPct)+" % "+r.concentracaoBase+" (~"+fmtVivo(r.concentracaoPpm)+" ppm)");
      if(r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
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
      L.push("Fonte: "+r.fonteRotulo+(r.fonteTipo!=="puro"?" — "+fmtVivo(r.fontePpm)+" ppm":""));
      L.push("Volume por dose: "+fmtVivo(r.volumeMl)+" mL");
      L.push("Nº de doses: "+r.linhas.length+(r.testemunha?" + testemunha":""));
      if(r.pureza!==100)L.push("Pureza: "+fmtVivo(r.pureza)+"%");
      L.push("==================================================");
      L.push("");
      var puro=(r.fonteTipo==="puro");
      var head=puro?"  ppm          | pesar (mg)   | solvente (mL)"
                   :"  ppm          | produto (µL) | solvente (mL)";
      L.push(head); L.push("  "+new Array(head.trim().length+1).join("-"));
      r.linhas.forEach(function(x){
        var c1=String(fmtVivo(x.ppm)); while(c1.length<13)c1+=" ";
        var c2=String(puro?fmtVivo(x.massaMg):fmtVivo(x.produtoUl)); while(c2.length<13)c2+=" ";
        L.push("  "+c1+"| "+c2+"| "+fmtVivo(x.solventeMl));
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
    FONTES:FONTES,
    parseNum:parseNum, parseOpt:parseOpt, formatBR:formatBR, fmtVivo:fmtVivo, round:round,
    fontePpm:fontePpm, concToPpm:concToPpm, volToMl:volToMl,
    alertaPipeta:alertaPipeta, alertaMassa:alertaMassa, sugereMae:sugereMae,
    calcPPM:calcPPM, calcPPMInverso:calcPPMInverso, calcCampo:calcCampo,
    calcAjusteIA:calcAjusteIA, calcSerie:calcSerie,
    parseListaDoses:parseListaDoses, gerarSerieAuto:gerarSerieAuto,
    formatar:formatar
  };
});
