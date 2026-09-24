/* ============================================================================
   ArenaCore — bioensaio em arena (pote = parcela)
   ----------------------------------------------------------------------------
   Ensaio de bancada em que cada unidade experimental é um pote com solo,
   planta e organismo — o caso que motivou: moluscicida granulado sobre lesma
   em soja, 12 tratamentos × 4 repetições, D0 a D10.

   O pote NÃO finge ser área de campo. A dose oficial continua em kg/ha; o
   motor traduz para o que a mão coloca no pote (mg de produto, nº de pellets),
   e diz o quanto o arredondamento para pellets inteiros desvia da dose.

   REGRAS
   1. NÃO INVENTA NÚMERO. Sem área, sem peso de pellet ou com unidade que não
      é por área: devolve null COM o motivo. "7 kg/ha = 7 pellets" só é
      verdade se o pellet pesar ~8 mg — quem decide é a balança, não o texto.
   2. APONTA, NÃO BLOQUEIA. Desvio de dose, desbalanço da condição inicial e
      série incompleta viram aviso.
   3. MOTOR PURO: sem DOM. O app entrega as médias por tratamento de cada
      avaliação (a mesma conta que ele já faz) e recebe séries e resumos.
   ============================================================================ */
(function(root){
  'use strict';

  var VERSAO='1.0.0';
  /* mg de produto por m² para cada unidade de dose por área */
  var MG_POR_M2={'kg/ha':100,'g/ha':0.1,'g/m2':1000,'g/m²':1000,'mg/m2':1,'mg/m²':1};
  var DESVIO_AVISO=10;   /* % de desvio da dose que vira aviso */

  function num(v){
    if(v==null||typeof v==='boolean'||typeof v==='object') return null;
    var s=String(v).trim(); if(!s) return null;
    var n=Number(s.replace(/\s/g,'').replace(',','.'));
    return isFinite(n)?n:null;
  }
  function r(x,c){ if(x==null||!isFinite(x)) return null; var f=Math.pow(10,c==null?2:c); return Math.round(x*f)/f; }

  /* ---------- unidade experimental ---------- */
  /* {forma:'retangular'|'circular', comprimentoCm, larguraCm, diametroCm} → m² */
  function area(a){
    a=a||{};
    if(a.forma==='circular'){
      var d=num(a.diametroCm);
      if(!(d>0)) return {m2:null,motivo:'diâmetro da arena não informado'};
      return {m2:Math.PI*Math.pow(d/200,2),motivo:null};
    }
    var c=num(a.comprimentoCm), l=num(a.larguraCm);
    if(!(c>0)||!(l>0)) return {m2:null,motivo:'comprimento e largura da arena não informados'};
    return {m2:(c/100)*(l/100),motivo:null};
  }
  /* organismos por unidade → por m² */
  function densidade(a){
    var ar=area(a), n=num((a||{}).organismosPorUnidade);
    if(ar.m2==null) return {porM2:null,motivo:ar.motivo};
    if(n==null||n<0) return {porM2:null,motivo:'nº de organismos por unidade não informado'};
    return {porM2:n/ar.m2,motivo:null};
  }

  /* ---------- dose por área → o que vai no pote ---------- */
  function doseNaArena(doseValor, unidade, a){
    a=a||{};
    var out={mg:null,pellets:null,pelletsArred:null,mgAplicado:null,doseEfetiva:null,desvioPct:null,unidade:unidade||'',motivo:null,avisos:[]};
    var v=num(doseValor);
    if(v==null){ out.motivo='dose não informada'; return out; }
    var k=MG_POR_M2[String(unidade||'').trim()];
    if(k==null){ out.motivo=unidade?('a unidade '+unidade+' não é dose por área'):'unidade da dose não declarada'; return out; }
    var ar=area(a); if(ar.m2==null){ out.motivo=ar.motivo; return out; }
    out.mg=v*k*ar.m2;
    var p=num(a.pesoPelletMg);
    if(!(p>0)){ out.motivo='peso médio do pellet não informado — pese 100 pellets e divida por 100'; return out; }
    out.pellets=out.mg/p;
    out.pelletsArred=Math.round(out.pellets);
    if(v>0 && out.pelletsArred===0){
      out.pelletsArred=1;
      out.avisos.push('a dose pede menos de meio pellet por pote; 1 pellet é o mínimo possível');
    }
    out.mgAplicado=out.pelletsArred*p;
    out.doseEfetiva=out.mgAplicado/(k*ar.m2);
    out.desvioPct=v>0?((out.doseEfetiva-v)/v*100):0;
    if(Math.abs(out.desvioPct)>DESVIO_AVISO)
      out.avisos.push('pellets inteiros desviam a dose em '+String(r(out.desvioPct,0)).replace('.',',')+'%');
    return out;
  }

  /* ---------- papel de cada variável ---------- */
  /* Identifica pelo NOME, na mesma linguagem do catálogo. "desintegrados"
     contém "integr" — por isso é testado antes de "íntegros". */
  function papel(nome){
    var s=String(nome||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    if(/desintegr/.test(s)) return 'desintegrados';
    if(/pellet|grao|granulo|isca/.test(s)){
      if(/integr/.test(s)) return 'integros';
      if(/mordid|consumid|atacad/.test(s)) return 'mordidos';
    }
    if(/dano|desfolha|area foliar consumida|consumo foliar/.test(s)) return 'dano';
    if(/(lesma|caracol|molusco).*mort|mortalidade|mortos?\b|morta\b/.test(s)) return 'morte';
    return null;
  }
  function variaveisPorPapel(vars){
    var o={};
    (vars||[]).forEach(function(v){ var p=papel(v); if(p && !o[p]) o[p]=v; });
    return o;
  }

  /* ---------- curvas ---------- */
  /* pontos: [{dia, rotulo, medias:{T:{variavel:valor}}}] ordenáveis por dia.
     tratamentos: [{id, ...}]. Devolve as três séries do ensaio:
       dano          — média da variável de dano, %
       sobrevivencia — 100 − mortalidade (%), começa em 100 onde houver leitura
       consumo       — (mordidos + desintegrados) / (íntegros + mordidos + desintegrados) × 100 */
  function curvas(pontos, tratamentos, vars){
    var P=(pontos||[]).filter(function(p){ return p && isFinite(p.dia); }).slice()
      .sort(function(a,b){ return a.dia-b.dia; });
    var pv=variaveisPorPapel(vars||[].concat.apply([],P.map(function(p){
      var ks={}; Object.keys(p.medias||{}).forEach(function(t){ Object.keys(p.medias[t]||{}).forEach(function(v){ ks[v]=1; }); });
      return Object.keys(ks);
    })));
    var out={variaveis:pv, dano:null, sobrevivencia:null, consumo:null};
    function serie(fn){
      var s={}, alguma=false;
      (tratamentos||[]).forEach(function(t){
        var xs=[];
        P.forEach(function(p){ var m=(p.medias||{})[t.id]||{}, y=fn(m); if(y!=null&&isFinite(y)){ xs.push({dia:p.dia,rotulo:p.rotulo||'',y:y}); alguma=true; } });
        s[t.id]=xs;
      });
      return alguma?s:null;
    }
    if(pv.dano) out.dano={variavel:pv.dano, series:serie(function(m){ return num(m[pv.dano]); })};
    if(pv.morte) out.sobrevivencia={variavel:pv.morte, series:serie(function(m){
      var x=num(m[pv.morte]); return x==null?null:Math.max(0,Math.min(100,100-x)); })};
    if(pv.integros||pv.mordidos||pv.desintegrados){
      out.consumo={variavel:'Pellets atacados (%)', series:serie(function(m){
        var i=num(m[pv.integros])||0, mo=num(m[pv.mordidos])||0, de=num(m[pv.desintegrados])||0;
        var algum=[m[pv.integros],m[pv.mordidos],m[pv.desintegrados]].some(function(x){ return num(x)!=null; });
        var tot=i+mo+de;
        return (!algum||!(tot>0))?null:(mo+de)/tot*100;
      })};
    }
    ['dano','sobrevivencia','consumo'].forEach(function(k){ if(out[k] && !out[k].series) out[k]=null; });
    return out;
  }

  /* Área sob a curva por trapézio; null se faltar ponto no meio da série. */
  function aacpd(xs){
    if(!xs||xs.length<2) return null;
    var s=0; for(var i=1;i<xs.length;i++) s+=(xs[i-1].y+xs[i].y)/2*(xs[i].dia-xs[i-1].dia);
    return s;
  }
  function ultimo(xs){ return (xs&&xs.length)?xs[xs.length-1]:null; }

  /* ---------- resumo do fim do ensaio, por tratamento ---------- */
  /* testemunha = id da testemunha INFESTADA (base da proteção e do Abbott). */
  function resumo(cv, tratamentos, testemunha){
    cv=cv||{};
    var linhas=[], ref={};
    function S(k,id){ return cv[k]&&cv[k].series?cv[k].series[id]:null; }
    if(testemunha){
      ref.aacpd=aacpd(S('dano',testemunha));
      var ms=ultimo(S('sobrevivencia',testemunha)); ref.mort=ms?100-ms.y:null;
    }
    (tratamentos||[]).forEach(function(t){
      var d=S('dano',t.id), so=S('sobrevivencia',t.id), co=S('consumo',t.id);
      var l={id:t.id, testemunha:t.id===testemunha,
        danoFinal:ultimo(d)?ultimo(d).y:null, diaFinal:ultimo(d)?ultimo(d).dia:null,
        aacpd:aacpd(d), protecao:null,
        mortalidadeFinal:ultimo(so)?100-ultimo(so).y:null, abbott:null,
        dia50:null, pelletsAtacados:ultimo(co)?ultimo(co).y:null};
      /* proteção relativa: redução da AACPD de dano frente à testemunha infestada */
      if(!l.testemunha && l.aacpd!=null && ref.aacpd>0) l.protecao=(1-l.aacpd/ref.aacpd)*100;
      /* mortalidade corrigida de Abbott */
      if(!l.testemunha && l.mortalidadeFinal!=null && ref.mort!=null && ref.mort<100)
        l.abbott=(l.mortalidadeFinal-ref.mort)/(100-ref.mort)*100;
      /* primeiro dia em que a sobrevivência média chega a 50% ou menos (leitura,
         não interpolação: é o dia em que se viu) */
      if(so) for(var i=0;i<so.length;i++){ if(so[i].y<=50){ l.dia50=so[i].dia; break; } }
      linhas.push(l);
    });
    return {linhas:linhas, testemunha:testemunha||null, semTestemunha:!testemunha};
  }

  /* ---------- condição inicial (D0) das parcelas ---------- */
  /* valores: {chaveParcela:{variavel:valor}}; linhas: [{key,tratId,rep}]
     Devolve média, dp e n por tratamento e variável, e aponta desbalanço:
     média de um tratamento que foge mais de 20% da média geral. */
  function condicaoInicial(valores, linhas, variaveis){
    valores=valores||{};
    var por={}, geral={}, avisos=[];
    (variaveis||[]).forEach(function(v){
      var nome=typeof v==='string'?v:v.nome; if(!nome) return;
      var todos=[];
      (linhas||[]).forEach(function(rw){
        var x=num((valores[rw.key]||{})[nome]); if(x==null) return;
        ((por[rw.tratId]=por[rw.tratId]||{})[nome]=por[rw.tratId][nome]||[]).push(x);
        todos.push(x);
      });
      var mg=todos.length?todos.reduce(function(a,b){return a+b;},0)/todos.length:null;
      geral[nome]={n:todos.length, media:mg, faltam:(linhas||[]).length-todos.length};
      if(mg){
        Object.keys(por).forEach(function(t){
          var xs=(por[t]||{})[nome]; if(!xs||!xs.length) return;
          var m=xs.reduce(function(a,b){return a+b;},0)/xs.length;
          if(Math.abs(m-mg)/Math.abs(mg)>0.2) avisos.push(t+': '+nome+' médio '+String(r(m,2)).replace('.',',')+' contra '+String(r(mg,2)).replace('.',',')+' no ensaio (>20%)');
        });
      }
    });
    var resumoT={};
    Object.keys(por).forEach(function(t){
      resumoT[t]={};
      Object.keys(por[t]).forEach(function(v){
        var xs=por[t][v], n=xs.length, m=xs.reduce(function(a,b){return a+b;},0)/n;
        var dp=n>1?Math.sqrt(xs.reduce(function(a,b){return a+(b-m)*(b-m);},0)/(n-1)):null;
        resumoT[t][v]={n:n,media:m,dp:dp};
      });
    });
    return {porTratamento:resumoT, geral:geral, avisos:avisos};
  }

  var API={VERSAO:VERSAO, MG_POR_M2:MG_POR_M2, num:num, area:area, densidade:densidade,
    doseNaArena:doseNaArena, papel:papel, variaveisPorPapel:variaveisPorPapel,
    curvas:curvas, aacpd:aacpd, resumo:resumo, condicaoInicial:condicaoInicial};
  root.ArenaCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
