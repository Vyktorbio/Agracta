/* Planejamento do drone. Limites vêm da máquina/calibração, nunca do nome do modelo. */
(function(root,factory){
  var core=typeof module==='object'&&module.exports?require('./aplicacao-core.js'):root.AplicacaoCore;
  var api=factory(core);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.DroneCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  function calculate(input){
    input=input||{};
    var errors=[],pending=[],warnings=[];
    function n(key,label,required){
      var raw=input[key];
      if(raw==null||String(raw).trim()===''){
        if(required) pending.push('Informe '+label+'.');
        return null;
      }
      var value=Number(String(raw).trim().replace(',','.'));
      if(!Number.isFinite(value)||value<0||(required&&value===0)){
        errors.push('Confira '+label+': use um número '+(required?'maior que zero':'igual ou maior que zero')+'.');
        return null;
      }
      return value;
    }
    var rate=n('rate','a taxa (L/ha)',true),speed=n('speed','a velocidade (km/h)',true),width=n('width','o espaçamento entre rotas (m)',true);
    var minFlow=n('minFlow','a vazão mínima (L/min)'),maxFlow=n('maxFlow','a vazão máxima (L/min)'),observed=n('observedFlow','a vazão medida (L/min)');
    var height=n('height','a altura de aplicação (m)',true);
    var capacity=n('tankCapacity','a capacidade do tanque (L)'),minimum=n('minimumOperatingMl','a carga mínima inicial (mL)');
    var length=n('plotLength','o comprimento da parcela (m)',true),cross=n('plotWidth','a largura da parcela (m)',true);
    var prepared=n('preparedMl','o volume preparado (mL)');
    if(minimum===null) pending.push('Confirme a carga mínima inicial; informe 0 se a máquina não exigir mínimo.');
    if(minFlow===null||maxFlow===null) pending.push('Confirme os limites de vazão no controle ou na calibração.');
    if(!(capacity>0)) pending.push('Informe a capacidade do tanque.');
    if(minFlow!==null&&maxFlow!==null&&minFlow>maxFlow) errors.push('A vazão mínima supera a máxima.');
    var op=core.equipmentOperation({equipment:'drone',prep:{targetRate:rate||0},drone:{width:width||0,speed:speed||0,observedFlow:observed||0}});
    if(op.requiredFlow>0&&minFlow!==null&&op.requiredFlow<minFlow-1e-9) errors.push('A vazão necessária fica abaixo do mínimo informado.');
    if(op.requiredFlow>0&&maxFlow!==null&&op.requiredFlow>maxFlow+1e-9) errors.push('A vazão necessária supera o máximo informado.');
    if(capacity>0&&prepared>capacity*1000+1e-6) errors.push('O preparo por tratamento excede o tanque. Planeje cargas separadas.');
    if(capacity>0&&minimum>capacity*1000) errors.push('A carga mínima inicial excede a capacidade do tanque.');
    if(!(observed>0)) pending.push('Meça a vazão: o valor requerido é um planejamento.');
    if(input.swathConfirmed!==true) pending.push('Valide a faixa por deposição e uniformidade na velocidade e altura escolhidas.');
    var tolerance=5;
    if(op.deviationPct!==null&&Math.abs(op.deviationPct)>tolerance) errors.push('A taxa pela vazão medida difere mais de 5% da meta.');
    var passes=width>0&&cross>0?Math.ceil(cross/width-1e-10):null;
    var routeArea=passes&&length>0?passes*width*length:null;
    var plotArea=length>0&&cross>0?length*cross:null;
    var excess=routeArea!==null?Math.max(0,routeArea-plotArea):null;
    if(excess>1e-6) warnings.push('A faixa não encaixa na parcela. Há pulverização além dos limites; reveja rotas e bordaduras antes de aplicar.');
    var complete=!errors.length&&!pending.length&&!warnings.length;
    return {version:'1.0.0',errors:errors,pending:pending,warnings:warnings,status:errors.length?'incompativel':complete?'conferido':'pendente',
      requiredFlow:rate>0&&speed>0&&width>0?op.requiredFlow:null,actualRate:op.actualRate,deviationPct:op.deviationPct,
      speedKmH:speed,speedMS:speed===null?null:speed/3.6,routeSpacingM:width,heightM:height,
      minSpeed:rate>0&&width>0&&minFlow!==null?600*minFlow/(rate*width):null,
      maxSpeed:rate>0&&width>0&&maxFlow!==null?600*maxFlow/(rate*width):null,
      passesPerPlot:passes,plotAreaM2:plotArea,routeAreaM2:routeArea,excessAreaM2:excess,
      routeVolumeMl:routeArea!==null&&rate>0?routeArea*rate/10:null,
      usefulVolumeMl:plotArea!==null&&rate>0?plotArea*rate/10:null,
      secondsPerPass:length>0&&speed>0?length*3.6/speed:null,
      minimumOperatingMl:minimum,canApply:complete};
  }
  return {calculate:calculate};
});
