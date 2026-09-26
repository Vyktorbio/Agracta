/* ============================================================================
   CampoInteligenteCore — o app liga o que já sabe, sem ninguém pedir
   ----------------------------------------------------------------------------
   O Agracta já tinha as peças: a estação, a chuva depois da aplicação, a
   janela do protocolo, o BBCH anotado em cada evento, as notas de cada
   repetição. O que faltava era o fio entre elas — cada uma esperava alguém
   tocar num botão, e o que ninguém toca no campo não acontece.

   Três ligações, um motor puro (sem DOM, sem rede, sem gravar):

   1. CLIMA SOZINHO. Quais aplicações ainda não leram a chuva das horas
      seguintes, e quais avaliações ainda não leram o ambiente desde a
      aplicação. O app consulta sozinho quando há rede; aqui só se decide O QUÊ.

   2. NOTA ESTRANHA NA HORA. Um valor muito longe das outras repetições do
      mesmo tratamento é, quase sempre, digitação. Descobrir isso na
      estatística, dias depois, é tarde: a parcela já foi embora. Avisa no
      momento em que se sai da célula — e não bloqueia: ensaio existe para
      achar diferença, e às vezes a parcela é mesmo diferente.

   3. AGENDA QUE ACOMPANHA O CAMPO. As avaliações previstas nascem de uma data
      fixa; a aplicação real atrasa. E o protocolo pede um estádio para a
      próxima aplicação, que o BBCH observado deixa prever.

   REGRAS
   - APONTA, NÃO DECIDE. Nada aqui muda dado: devolve o que a tela oferece.
   - SÓ FALA DO QUE SABE. Sem repetições suficientes, sem dois BBCH anotados,
     sem aplicação registrada: silêncio, não palpite.
   - DIZ DE ONDE VEIO. A previsão de estádio é o ritmo observado NESTE
     estudo, e a frase diz isso.
   ============================================================================ */
(function(root){
  'use strict';
  var VERSAO='1.0.0';
  var DIA=86400000;

  function num(v){
    if(v==null||typeof v==='boolean'||typeof v==='object') return null;
    var s=String(v).trim().replace(',','.'); if(s==='') return null;
    var n=Number(s); return isFinite(n)?n:null;
  }
  function mediana(a){
    var s=a.slice().sort(function(x,y){return x-y;}), n=s.length;
    if(!n) return null;
    return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;
  }
  function fmt(n){
    if(n==null||!isFinite(n)) return '';
    var r=Math.round(n*10)/10;
    return String(r).replace('.',',');
  }
  function isoMs(iso){
    var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); if(!m) return null;
    return Date.UTC(+m[1],+m[2]-1,+m[3]);
  }
  function msIso(ms){
    var d=new Date(ms); function p(x){return (x<10?'0':'')+x;}
    return d.getUTCFullYear()+'-'+p(d.getUTCMonth()+1)+'-'+p(d.getUTCDate());
  }
  function shift(iso,dias){ var t=isoMs(iso); return t==null?null:msIso(t+dias*DIA); }
  function diasEntre(a,b){ var x=isoMs(a),y=isoMs(b); return (x==null||y==null)?null:Math.round((y-x)/DIA); }
  function br(iso){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||'')); return m?(m[3]+'/'+m[2]):String(iso||''); }
  function bbchNum(v){ var m=/(\d{1,2})/.exec(String(v==null?'':v)); return m?parseInt(m[1],10):null; }
  function vazia(a){
    if(!a) return true;
    var temNota=false;
    Object.keys(a.notas||{}).forEach(function(r){
      Object.keys(a.notas[r]||{}).forEach(function(v){ var x=a.notas[r][v]; if(x!=null&&String(x)!=='') temNota=true; });
    });
    return !temNota&&!(a.variaveis&&a.variaveis.length)&&!a.obs&&!a.bbch&&!a.tipo;
  }

  /* ---------------------------------------------------------------- 1. clima */
  /* agoraMs: relógio; lab: bancada (não chove); horasPos: janela da chuva.
     Aplicação entra quando já passou 1 h dela e ainda não leu — ou leu com a
     janela aberta e a janela já fechou (aí a leitura nova completa a velha;
     a velha vira histórico, como o botão de reconsultar já faz). */
  function pendentesClima(study, agoraMs, opts){
    opts=opts||{};
    var horas=opts.horasPos||48, out=[];
    if(!study||opts.lab) return out;
    (study.aplicacoes||[]).forEach(function(ap){
      if(!ap||!ap.id||!ap.data) return;
      var t=isoMs(ap.data); if(t==null) return;
      var h=/^(\d{1,2}):(\d{2})/.exec(String(ap.hora||''));
      /* sem hora, a conta é do dia: o "depois" começa no fim do dia */
      var ini=h?(t+(+h[1])*3600000+(+h[2])*60000+3*3600000/*fuso BR*/):(t+DIA+3*3600000);
      if(agoraMs<ini+3600000) return;
      var fecha=ini+horas*3600000;
      if(!ap.pos) out.push({tipo:'pos', id:ap.id, forcar:false});
      else if(ap.pos.completa===false && agoraMs>fecha+2*3600000) out.push({tipo:'pos', id:ap.id, forcar:true});
    });
    var hoje=msIso(agoraMs-3*3600000);
    (study.avaliacoes||[]).forEach(function(av){
      if(!av||!av.id||!av.data||av.janela) return;
      if(String(av.data)>hoje) return;             /* futura: ainda não há o que ler */
      if(vazia(av)) return;                         /* só a que já foi feita */
      var antes=(study.aplicacoes||[]).filter(function(a){ return a&&a.data&&a.data<=av.data; })
        .sort(function(a,b){ return String(a.data).localeCompare(String(b.data)); });
      var ap=antes[antes.length-1];
      if(!ap||ap.data===av.data) return;
      out.push({tipo:'janela', id:av.id});
    });
    return out;
  }
  function lavagem(p){
    return !!(p&&!p.erro&&p.chuvaMm!=null&&p.choveu&&p.primeiraChuvaHoras!=null&&p.primeiraChuvaHoras<=6);
  }

  /* ------------------------------------------------------ 2. nota fora do padrão */
  /* d2 de Shewhart: desvio-padrão a partir da amplitude de n valores. */
  var D2={2:1.128,3:1.693,4:2.059,5:2.326,6:2.534,7:2.704,8:2.847,9:2.970,10:3.078};
  /* valores: [{key, trat, valor}] — a grade de UMA variável.
     key: a célula recém-digitada. tipo: 'pct' | 'contagem' | outro.
     Devolve null ou {texto, mediana, min, max, virgula}. */
  function notaAlerta(valores, key, tipo){
    valores=(valores||[]).map(function(x){ return {key:x.key, trat:String(x.trat), valor:num(x.valor)}; });
    var cel=null; valores.forEach(function(x){ if(x.key===key) cel=x; });
    if(!cel||cel.valor==null) return null;
    var outras=valores.filter(function(x){ return x.trat===cel.trat&&x.key!==key&&x.valor!=null; }).map(function(x){ return x.valor; });
    if(outras.length<2) return null;                /* sem base para comparar: silêncio */
    var med=mediana(outras), x=cel.valor, dist=Math.abs(x-med);
    /* espalhamento dentro de tratamento, dos OUTROS grupos e do próprio sem a
       célula — mediana entre grupos, para um grupo ruim não mascarar */
    var grupos={};
    valores.forEach(function(v){ if(v.valor==null||v.key===key) return; (grupos[v.trat]=grupos[v.trat]||[]).push(v.valor); });
    var sigmas=[];
    Object.keys(grupos).forEach(function(t){
      var g=grupos[t]; if(g.length<2) return;
      var amp=Math.max.apply(null,g)-Math.min.apply(null,g);
      sigmas.push(amp/(D2[Math.min(g.length,10)]||3.078));
    });
    var sigma=sigmas.length?mediana(sigmas):0;
    var amplOutras=Math.max.apply(null,outras)-Math.min.apply(null,outras);
    var piso=(tipo==='pct')?15:Math.max(3,Math.abs(med)*0.5);
    if(!(dist>4*sigma && dist>piso && dist>1.5*amplOutras)) return null;
    var virgula=false;
    if(med>0&&x>0){ var r=x/med; virgula=(r>=8&&r<=12.5)||(r>=0.08&&r<=0.125); }
    var lo=Math.min.apply(null,outras), hi=Math.max.apply(null,outras);
    var faixa=(lo===hi)?('em '+fmt(lo)):('entre '+fmt(lo)+' e '+fmt(hi));
    return {mediana:med, min:lo, max:hi, virgula:virgula,
      texto:fmt(x)+(tipo==='pct'?'%':'')+' — as outras repetições deste tratamento estão '+faixa+
        (virgula?'. Parece a vírgula no lugar errado.':'. Confira a digitação.')};
  }

  /* --------------------------------------------------- 3a. agenda na aplicação real */
  /* As avaliações previstas nascem de avalInicio (ou dataInicio) + i × intervalo.
     Se a 1ª aplicação REAL saiu D dias da prevista, as previstas ainda vazias
     acompanham. Devolve null ou {delta, de, para, itens:[{id,de,para}]}. */
  function reancorar(study, hoje){
    if(!study||!study.dataInicio) return null;
    var apls=(study.aplicacoes||[]).filter(function(a){ return a&&a.data; })
      .map(function(a){ return String(a.data).slice(0,10); }).sort();
    if(!apls.length) return null;
    var delta=diasEntre(study.dataInicio, apls[0]);
    if(delta==null||Math.abs(delta)>60) return null;
    var atual=parseInt(study.avalDeslocamento,10)||0;
    if(delta===atual) return null;
    var base=study.avalInicio||study.dataInicio, iv=parseInt(study.avalIntervalo,10)||0, n=parseInt(study.avalNum,10)||0;
    if(n<=0||String(study.avalMomentos||'').trim()) return null;   /* bancada/momentos: outra regra */
    var slots={};
    for(var i=0;i<n;i++){ var d=iv>0?shift(base,i*iv+atual):shift(base,atual); if(d) slots[d]=i; }
    var itens=[];
    (study.avaliacoes||[]).forEach(function(a){
      if(!a||!a.auto||!vazia(a)||!(a.data in slots)) return;
      var para=shift(a.data, delta-atual);
      if(hoje&&para<hoje&&a.data<hoje) return;       /* passado nos dois: não mexe */
      itens.push({id:a.id, de:a.data, para:para});
    });
    if(!itens.length) return null;
    return {delta:delta, anterior:atual, previsto:study.dataInicio, real:apls[0], itens:itens,
      texto:'A 1ª aplicação foi em '+br(apls[0])+', '+Math.abs(delta)+' dia'+(Math.abs(delta)===1?'':'s')+
        (delta>0?' depois':' antes')+' do previsto ('+br(study.dataInicio)+'). '+
        itens.length+' avaliação'+(itens.length===1?'':'ões')+' prevista'+(itens.length===1?'':'s')+
        ' ainda vazia'+(itens.length===1?'':'s')+' pode'+(itens.length===1?'':'m')+' acompanhar: '+
        itens.slice(0,4).map(function(x){ return br(x.de)+' → '+br(x.para); }).join(', ')+(itens.length>4?'…':'')+'.'};
  }

  /* ----------------------------------------------------- 3b. estádio da próxima */
  /* Pontos: BBCH anotado em aplicações e avaliações. Ritmo = inclinação por
     mínimos quadrados dos últimos até 5 pontos (estádio/dia). Exige 2 datas
     distintas, 3+ dias de intervalo e ritmo positivo. */
  function ritmoBBCH(study){
    var pts=[];
    (study.aplicacoes||[]).concat(study.avaliacoes||[]).forEach(function(e){
      if(!e||!e.data) return; var b=bbchNum(e.bbch), t=isoMs(e.data);
      if(b!=null&&t!=null) pts.push({t:t,b:b,data:String(e.data).slice(0,10)});
    });
    pts.sort(function(a,b){ return a.t-b.t; });
    var porDia={}; pts.forEach(function(p){ porDia[p.data]=p; });   /* um por dia: o último */
    pts=Object.keys(porDia).sort().map(function(k){ return porDia[k]; }).slice(-5);
    if(pts.length<2) return null;
    var span=(pts[pts.length-1].t-pts[0].t)/DIA; if(span<3) return null;
    var n=pts.length, mx=0, my=0; pts.forEach(function(p){ mx+=p.t/DIA; my+=p.b; }); mx/=n; my/=n;
    var sxy=0,sxx=0; pts.forEach(function(p){ var dx=p.t/DIA-mx; sxy+=dx*(p.b-my); sxx+=dx*dx; });
    if(!sxx) return null;
    var k=sxy/sxx; if(!(k>0)) return null;
    var ult=pts[pts.length-1];
    return {porDia:k, ultimo:ult, pontos:n,
      em:function(iso){ var t=isoMs(iso); return t==null?null:Math.min(99,Math.max(0,ult.b+k*(t-ult.t)/DIA)); },
      quando:function(b){ return msIso(ult.t+Math.max(0,(b-ult.b)/k)*DIA); }};
  }
  /* Próximas aplicações previstas (dataInicio + i × intervalo) ainda não feitas. */
  function aplicacoesPrevistas(study, hoje){
    var out=[]; if(!study||!study.dataInicio) return out;
    var n=Math.max(1,parseInt(study.numAplicacoes,10)||1), iv=parseInt(study.intervaloDias,10)||0;
    var feitas=(study.aplicacoes||[]).filter(function(a){ return a&&a.data; }).map(function(a){ return String(a.data).slice(0,10); });
    /* a prevista segue a real: depois da k-ésima feita, a (k+1)-ésima é real+intervalo */
    feitas.sort();
    for(var i=feitas.length;i<n;i++){
      var d=feitas.length&&iv>0?shift(feitas[feitas.length-1],(i-feitas.length+1)*iv):(iv>0?shift(study.dataInicio,i*iv):study.dataInicio);
      if(d&&(!hoje||d>=hoje)) out.push({idx:i+1,total:n,data:d});
    }
    return out;
  }
  function previsaoBBCH(study, hoje){
    var r=ritmoBBCH(study||{}); if(!r) return null;
    var j=(study&&study.janela)||{}, mn=num(j.bbchMin), mx=num(j.bbchMax);
    var prox=aplicacoesPrevistas(study,hoje)[0];
    var agora=hoje?r.em(hoje):r.ultimo.b;
    var base='No ritmo observado neste estudo ('+fmt(r.porDia)+' estádio/dia, '+r.pontos+' anotações)';
    var out={porDia:r.porDia, hoje:agora, alerta:null, texto:base+', hoje estaria perto de BBCH '+Math.round(agora)+'.'};
    if(!prox) return out;
    var b=r.em(prox.data); out.proxima={idx:prox.idx,total:prox.total,data:prox.data,bbch:b};
    var qual='a aplicação '+prox.idx+' de '+prox.total+' ('+br(prox.data)+')';
    if(mx!=null&&b>mx){
      out.alerta='depois';
      out.texto=base+', '+qual+' cairia perto de BBCH '+Math.round(b)+' — acima do máximo '+mx+' da janela. '+
        'O máximo chega por volta de '+br(r.quando(mx))+'. Antecipar?';
    }else if(mn!=null&&b<mn){
      out.alerta='antes';
      out.texto=base+', '+qual+' cairia perto de BBCH '+Math.round(b)+' — abaixo do mínimo '+mn+' da janela. '+
        'O mínimo chega por volta de '+br(r.quando(mn))+'.';
    }else{
      out.texto=base+', '+qual+' cairia perto de BBCH '+Math.round(b)+
        ((mn!=null||mx!=null)?', dentro da janela do protocolo.':'.');
    }
    return out;
  }

  var API={VERSAO:VERSAO, pendentesClima:pendentesClima, lavagem:lavagem, notaAlerta:notaAlerta,
    reancorar:reancorar, ritmoBBCH:ritmoBBCH, aplicacoesPrevistas:aplicacoesPrevistas, previsaoBBCH:previsaoBBCH,
    _shift:shift, _vazia:vazia};
  root.CampoInteligenteCore=API;
  if(typeof module!=='undefined'&&module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
