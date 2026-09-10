/* Configuração local da sessão. Só a ação "Gravar cálculo" cria registro no estudo. */
(function(){
  'use strict';
  var drafts=Object.create(null);
  function key(){return window._calcSel?JSON.stringify([_calcSel.qid,_calcSel.sid]):'';}
  function cfg(){return drafts[key()]||(drafts[key()]={});}
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
    c[field]=value;_calcCompute();
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
    return '<details class="calc-drone"'+(c.open||c.minimumOperatingMl==null?' open':'')+' ontoggle="calcDroneSetOpen(this.open)"><summary>Drone <span>Configuração de voo e preparo</span></summary><div class="calc-grid">'+
      field('minimumOperatingMl','Carga mínima inicial (mL)')+field('tankCapacity','Capacidade do tanque (L)')+
      field('speed','Velocidade (km/h)')+field('width','Espaçamento entre rotas (m)')+field('height','Altura de aplicação (m)')+
      field('minFlow','Vazão mínima (L/min)')+field('maxFlow','Vazão máxima (L/min)')+
      field('observedFlow','Vazão medida (L/min)')+
      '<label class="calc-drone-check"><input id="calcDroneSwath" type="checkbox"'+(c.swathConfirmed?' checked':'')+' onchange="calcDroneSet(\'swathConfirmed\',this.checked)">Faixa validada nesta velocidade e altura</label></div><p class="calc-drone-note">O mínimo é a carga inicial total por tratamento, incluindo o volume morto. O excedente mantém a concentração e sobra no equipamento. A faixa precisa ser medida; aumentar a velocidade não comprova uma faixa maior.</p></details>';
  };
  window.calcDroneSetOpen=function(open){cfg().open=open;};
  window.calcDroneSummaryHtml=function(r){
    if(!r) return '';
    function f(n){return n==null?'—':BioCalculoCampo.formatSmartBR(n,3);}
    var label=r.status==='incompativel'?'Rever configuração':r.status==='conferido'?'Vazão e faixa conferidas':'Conferência do drone pendente';
    return '<div class="calc-drone-status '+r.status+'"><strong>'+label+'</strong><div class="calc-kv"><span>Vazão requerida</span><b>'+f(r.requiredFlow)+' L/min</b><span>Taxa pela vazão medida</span><b>'+f(r.actualRate)+' L/ha</b><span>Velocidade</span><b>'+f(r.speedKmH)+' km/h · '+f(r.speedMS)+' m/s</b><span>Por parcela</span><b>'+f(r.passesPerPlot)+' passada(s) · '+f(r.secondsPerPass)+' s/passada</b></div>'+
      (r.minSpeed!=null&&r.maxSpeed!=null?'<p>Intervalo pela vazão: '+f(r.minSpeed)+'–'+f(r.maxSpeed)+' km/h. Confira também o limite de voo da máquina.</p>':'')+
      r.errors.concat(r.pending,r.warnings).map(function(s){return '<p>'+esc(s)+'</p>';}).join('')+'</div>';
  };
})();
