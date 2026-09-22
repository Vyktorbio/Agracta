/* Configuração de voo do drone.

   RASCUNHO NO APARELHO, POR ESTUDO. Antes ela vivia só na sessão: recarregar o
   app ou reabrir a calculadora apagava velocidade, faixa, altura e vazões, e a
   pessoa redigitava tudo no campo. Agora o rascunho fica neste aparelho, por
   estudo — como a barra de calibração já fazia. Continua não sendo registro:
   só "Gravar cálculo" cria registro no estudo.

   CONFIGURAÇÃO VOLTA; MEDIDA DE OUTRO DIA NÃO. A vazão medida e a faixa
   validada são do dia em que foram feitas. Um rascunho de ontem volta com a
   configuração e SEM essas duas, porque reaparecerem sozinhas pareceria uma
   conferência que ninguém fez hoje.

   PERFIL APRENDIDO (roadmap §7.3). Um cálculo gravado com o drone conferido vira
   a configuração habitual da máquina, e o próximo estudo recebe a oferta datada
   de reusá-la. Só configuração, nunca leitura — a mesma linha dura da barra. */
(function(){
  'use strict';
  var drafts=Object.create(null);
  var RASC='agracta-calc-drone-';
  var CONFIG=['minimumOperatingMl','tankCapacity','speed','width','height','minFlow','maxFlow'];
  var MEDIDAS=['observedFlow','swathConfirmed'];
  function key(){return window._calcSel?JSON.stringify([_calcSel.qid,_calcSel.sid]):'';}
  function hoje(){
    try{ if(typeof todayISO==='function') return todayISO(); }catch(e){}
    var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function carregar(k){
    try{
      var o=JSON.parse(localStorage.getItem(RASC+k)||'null');
      if(!o||typeof o!=='object') return {};
      if(o._dia!==hoje()) MEDIDAS.forEach(function(m){ delete o[m]; });
      delete o._dia;
      return o;
    }catch(e){ return {}; }
  }
  function guardar(){
    var k=key(); if(!k||!drafts[k]) return;
    try{ localStorage.setItem(RASC+k, JSON.stringify(Object.assign({},drafts[k],{_dia:hoje()}))); }catch(e){}
  }
  function cfg(){var k=key(); if(!drafts[k]) drafts[k]=k?carregar(k):{}; return drafts[k];}
  function temConfig(c){ return CONFIG.some(function(f){ return c[f]!=null&&String(c[f]).trim()!==''; }); }
  function perfil(){ try{ return typeof perfilEquipDe==='function'?perfilEquipDe('drone'):null; }catch(e){ return null; } }
  window.calcDronePerfilUsar=function(){
    var p=perfil(); if(!p){ if(typeof _stxToast==='function') _stxToast('Sem configuração anterior do drone.'); return; }
    var c=cfg();
    CONFIG.forEach(function(f){ if(p[f]!=null&&p[f]!=='') c[f]=p[f]; });
    c.swathConfirmed=false; /* faixa se valida no voo de hoje, não se herda */
    guardar();
    if(typeof _calcRenderShell==='function') _calcRenderShell(); else _calcCompute();
    if(typeof _stxToast==='function') _stxToast('✓ Configuração do último cálculo com o drone');
  };
  /* Chamado quando um cálculo é gravado na aplicação. Só aprende de um preparo
     em que o drone ficou CONFERIDO (vazão, faixa e carga batendo). */
  window.calcDroneAprender=function(mem){
    if(!mem||!Array.isArray(mem.tratamentos)) return null;
    if(!mem.tratamentos.some(function(r){ return r&&r.drone&&r.aplicacaoConferida===true; })) return null;
    if(typeof perfilEquipGravarDrone!=='function') return null;
    var c=cfg(), conf={}; CONFIG.forEach(function(f){ if(c[f]!=null&&c[f]!=='') conf[f]=c[f]; });
    return perfilEquipGravarDrone(conf);
  };
  function ofertaHtml(c){
    var p=perfil(); if(!p||temConfig(c)) return '';
    var quando=''; try{ quando=new Date(p.em).toLocaleDateString('pt-BR'); }catch(e){}
    var det=[];
    if(p.speed) det.push(String(p.speed).replace('.',',')+' km/h');
    if(p.width) det.push('faixa '+String(p.width).replace('.',',')+' m');
    if(p.height) det.push(String(p.height).replace('.',',')+' m de altura');
    if(p.tankCapacity) det.push('tanque '+String(p.tankCapacity).replace('.',',')+' L');
    return '<div class="calc-barrahint">Último cálculo conferido com o drone'+(quando?(' em '+esc(quando)):'')+
      (det.length?(' — '+esc(det.join(' · '))):'')+
      ' <button type="button" class="calc-perfil" onclick="calcDronePerfilUsar()">usar esta configuração</button>'+
      '<br>Só a configuração. Vazão e faixa continuam sendo conferidas hoje.</div>';
  }
  function drone(study,t,qid){return typeof tratMetodo==='function'&&tratMetodo(study,qid||(window._calcSel||{}).qid,t)==='drone';}
  window.calcDroneConfig=function(){return Object.assign({},cfg());};
  window.calcDroneMinimum=function(study,t,config,qid){
    if(!drone(study,t,qid)) return 0;
    var v=(config||cfg()).minimumOperatingMl;
    if(v==null||String(v).trim()==='') return 0;
    var n=BioCalculoCampo.parseStrictNumber(v);
    return Number.isFinite(n)&&n>=0?n:0;
  };
  window.calcDroneSet=function(field,value){
    var c=cfg();
    if(['speed','width','height'].indexOf(field)>=0&&c[field]!==value){
      c.swathConfirmed=false;
      var check=document.getElementById('calcDroneSwath');if(check) check.checked=false;
    }
    c[field]=value;guardar();_calcCompute();
  };
  window.calcDroneResult=function(study,t,config,preparedMl,inputs){
    if(!drone(study,t,inputs&&inputs.qid)) return null;
    inputs=inputs||_calcConfigAtual();
    var vr=calcVolumeDoTratamento(t,inputs.volumeCaldaLHa);
    return DroneCore.calculate(Object.assign({},config||cfg(),{rate:vr.ambiguo?'':vr.valor,plotLength:inputs.parcelaComprimento,plotWidth:inputs.parcelaLargura,preparedMl:preparedMl}));
  };
  window.calcDroneHtml=function(study){
    if(!(study.tratamentos||[]).some(function(t){return drone(study,t);})) return '';
    var c=cfg();
    function field(name,label){return '<label class="calc-f"><span class="calc-lab">'+label+'</span><input class="calc-inp" inputmode="decimal" aria-label="'+label+'" value="'+esc(c[name]==null?'':c[name])+'" onchange="calcDroneSet(\''+name+'\',this.value)"></label>';}
    return '<details class="calc-drone"'+(c.open||c.minimumOperatingMl==null?' open':'')+' ontoggle="calcDroneSetOpen(this.open)"><summary>Drone <span>Configuração de voo e preparo</span></summary>'+ofertaHtml(c)+'<div class="calc-grid">'+
      field('minimumOperatingMl','Carga mínima inicial (mL)')+field('tankCapacity','Capacidade do tanque (L)')+
      field('speed','Velocidade (km/h)')+field('width','Espaçamento entre rotas (m)')+field('height','Altura de aplicação (m)')+
      field('minFlow','Vazão mínima (L/min)')+field('maxFlow','Vazão máxima (L/min)')+
      field('observedFlow','Vazão medida (L/min)')+
      '<label class="calc-drone-check"><input id="calcDroneSwath" type="checkbox"'+(c.swathConfirmed?' checked':'')+' onchange="calcDroneSet(\'swathConfirmed\',this.checked)">Faixa validada nesta velocidade e altura</label></div><p class="calc-drone-note">O mínimo é a carga inicial total por tratamento, incluindo o volume morto. O excedente mantém a concentração e sobra no equipamento. A faixa precisa ser medida; aumentar a velocidade não comprova uma faixa maior.</p></details>';
  };
  window.calcDroneSetOpen=function(open){cfg().open=open;guardar();};
  window.calcDroneSummaryHtml=function(r){
    if(!r) return '';
    function f(n){return n==null?'—':BioCalculoCampo.formatSmartBR(n,3);}
    var label=r.status==='incompativel'?'Rever configuração':r.status==='conferido'?'Vazão e faixa conferidas':'Conferência do drone pendente';
    return '<div class="calc-drone-status '+r.status+'"><strong>'+label+'</strong><div class="calc-kv"><span>Vazão requerida</span><b>'+f(r.requiredFlow)+' L/min</b><span>Taxa pela vazão medida</span><b>'+f(r.actualRate)+' L/ha</b><span>Velocidade</span><b>'+f(r.speedKmH)+' km/h · '+f(r.speedMS)+' m/s</b><span>Por parcela</span><b>'+f(r.passesPerPlot)+' passada(s) · '+f(r.secondsPerPass)+' s/passada</b></div>'+
      (r.minSpeed!=null&&r.maxSpeed!=null?'<p>Intervalo pela vazão: '+f(r.minSpeed)+'–'+f(r.maxSpeed)+' km/h. Confira também o limite de voo da máquina.</p>':'')+
      r.errors.concat(r.pending,r.warnings).map(function(s){return '<p>'+esc(s)+'</p>';}).join('')+'</div>';
  };
})();
