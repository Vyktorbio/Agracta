/* ============================================================================
   JanelaCore — o protocolo passa a ter opinião sobre QUANDO aplicar
   ----------------------------------------------------------------------------
   Até aqui o Agracta comentava o que já tinha acontecido. Ele sabia dizer que a
   calda não fechava, que o lote estava vencido, que choveu depois — sempre
   olhando o registro pronto. Sobre o que ERA PARA acontecer, ele não tinha nada,
   porque nada estava declarado: o plano era um número de aplicações e um
   intervalo em dias, e mais nada.

   Sem plano declarado não existe desvio. E é o desvio que faz um ensaio perder
   valor: aplicar fora da faixa de estádio pedida, ou com vento acima do que o
   protocolo admitia, é o tipo de coisa que se descobre na auditoria, meses
   depois, quando não há mais o que fazer.

   Este motor recebe a JANELA declarada e o que de fato OCORREU, e devolve os
   dois em confronto. Ele não grava, não bloqueia e não interpreta intenção.

   QUATRO REGRAS

   1. SEM JANELA DECLARADA, SILÊNCIO. Um estudo que não declarou nada continua
      funcionando exatamente como antes. A janela é opção, não obrigação.
   2. NÃO JULGA O QUE NÃO SABE. Estádio não anotado não é "fora da faixa": é
      "não dá para conferir". As duas coisas viram achados diferentes, porque
      são diferentes — a primeira é um desvio, a segunda é uma lacuna.
   3. APONTA, NÃO BLOQUEIA. Ensaio existe para sair do padrão, e há motivo
      legítimo para aplicar fora da janela. O que não pode é sair sem registro.
   4. O LIMITE DECLARADO VENCE O GENÉRICO. A recomendação de bula (vento < 10
      km/h) vale enquanto o protocolo não disser outra coisa; dito, é o
      protocolo que manda, porque é ele que o ensaio tem de cumprir.
   ============================================================================ */
(function(raiz){
  'use strict';
  var VERSION='1.0.0';

  function num(v){
    if(v==null||v==='') return null;
    var n=(typeof v==='number')?v:parseFloat(String(v).replace(',','.'));
    return isFinite(n)?n:null;
  }
  /* BBCH é código de dois dígitos e ordenado, então comparar como número é
     legítimo — mas só depois de garantir que É um código, e não texto solto. */
  function bbchNum(v){
    var s=String(v==null?'':v).trim();
    return /^\d{2}$/.test(s)?parseInt(s,10):null;
  }
  function temJanela(j){
    if(!j) return false;
    return ['bbchMin','bbchMax','intervaloMin','intervaloMax','tempMin','tempMax','urMin','urMax','ventoMax']
      .some(function(k){ return num(j[k])!=null; });
  }

  /* Um campo de cada vez. `obtido` nulo vira lacuna; fora dos limites vira
     desvio; dentro não vira nada — achado que sempre fala não é lido. */
  function _checa(out, cfg){
    var min=num(cfg.min), max=num(cfg.max), val=cfg.valor;
    if(min==null && max==null) return;                 /* nada declarado */
    if(val==null){
      out.push({campo:cfg.campo, tipo:'lacuna', rotulo:cfg.rotulo,
                texto:cfg.rotulo+' não foi registrado, então não dá para conferir contra a janela do protocolo.'});
      return;
    }
    var faixa=(min!=null&&max!=null)?(cfg.fmt(min)+' a '+cfg.fmt(max))
             :(min!=null?('a partir de '+cfg.fmt(min)):('até '+cfg.fmt(max)));
    if((min!=null && val<min) || (max!=null && val>max)){
      out.push({campo:cfg.campo, tipo:'desvio', rotulo:cfg.rotulo,
                esperado:faixa, obtido:cfg.fmt(val),
                texto:cfg.rotulo+' ficou em '+cfg.fmt(val)+', fora da janela do protocolo ('+faixa+').'});
    }
  }

  /* janela : {bbchMin,bbchMax,intervaloMin,intervaloMax,tempMin,tempMax,urMin,urMax,ventoMax}
     obs    : {bbch,intervaloDias,temp,ur,vento}
     Devolve {declarada, dentro, desvios, lacunas, achados}. `dentro` é null
     quando não há janela — não é "sim" nem "não", é "não perguntado". */
  function verificar(janela, obs){
    obs=obs||{};
    if(!temJanela(janela)) return {declarada:false, dentro:null, desvios:[], lacunas:[], achados:[]};
    var out=[];
    _checa(out,{campo:'bbch', rotulo:'O estádio BBCH', min:janela.bbchMin, max:janela.bbchMax,
                valor:bbchNum(obs.bbch), fmt:function(n){ return 'BBCH '+(n<10?('0'+n):n); }});
    _checa(out,{campo:'intervalo', rotulo:'O intervalo desde a aplicação anterior',
                min:janela.intervaloMin, max:janela.intervaloMax, valor:num(obs.intervaloDias),
                fmt:function(n){ return n+' dia'+(Math.abs(n)===1?'':'s'); }});
    _checa(out,{campo:'temp', rotulo:'A temperatura', min:janela.tempMin, max:janela.tempMax,
                valor:num(obs.temp), fmt:function(n){ return n+' °C'; }});
    _checa(out,{campo:'ur', rotulo:'A umidade relativa', min:janela.urMin, max:janela.urMax,
                valor:num(obs.ur), fmt:function(n){ return n+' %'; }});
    _checa(out,{campo:'vento', rotulo:'O vento', min:null, max:janela.ventoMax,
                valor:num(obs.vento), fmt:function(n){ return n+' km/h'; }});
    var desvios=out.filter(function(a){ return a.tipo==='desvio'; });
    var lacunas=out.filter(function(a){ return a.tipo==='lacuna'; });
    return {declarada:true, dentro:(desvios.length===0), desvios:desvios, lacunas:lacunas, achados:out};
  }

  /* Como a janela se lê numa linha, para a tela do protocolo e para a folha. */
  /* Faixa aberta se lê "até X" ou "a partir de X", nunca "—–30": travessão no
     lugar de um limite que não existe faz parecer que falta preencher algo. */
  function _faixa(rotulo, min, max, un){
    min=num(min); max=num(max);
    if(min==null && max==null) return null;
    if(min!=null && max!=null) return rotulo+' '+min+'–'+max+(un?(' '+un):'');
    if(max!=null) return rotulo+' até '+max+(un?(' '+un):'');
    return rotulo+' a partir de '+min+(un?(' '+un):'');
  }
  function resumo(janela){
    if(!temJanela(janela)) return '';
    return [_faixa('BBCH', janela.bbchMin, janela.bbchMax, ''),
            _faixa('intervalo', janela.intervaloMin, janela.intervaloMax, 'd'),
            _faixa('temp', janela.tempMin, janela.tempMax, '°C'),
            _faixa('UR', janela.urMin, janela.urMax, '%'),
            _faixa('vento', null, janela.ventoMax, 'km/h')]
      .filter(Boolean).join(' · ');
  }

  /* Normaliza o que veio da tela: número ou nada. Campo em branco NÃO é zero —
     "vento até 0 km/h" reprovaria toda aplicação já feita. */
  function normalizar(bruto){
    var out={};
    ['bbchMin','bbchMax','intervaloMin','intervaloMax','tempMin','tempMax','urMin','urMax','ventoMax']
      .forEach(function(k){ var n=num((bruto||{})[k]); if(n!=null) out[k]=n; });
    return out;
  }

  var API={VERSION:VERSION, verificar:verificar, resumo:resumo,
           normalizar:normalizar, temJanela:temJanela};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.JanelaCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
