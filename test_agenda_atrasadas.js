/* Aplicação atrasada não pode sumir da agenda.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Havia um limite de três dias para trás. Uma aplicação planejada que não
 * aconteceu sumia da agenda no quarto dia e só reaparecia no checklist de
 * fechamento do estudo — meses depois, quando não há mais o que fazer.
 *
 * Pior: `nextEvent` tinha o mesmo corte, e ele alimenta o alerta do mapa e a
 * etiqueta do cartão. Passado o prazo devolvia nulo, e o ensaio MAIS ATRASADO
 * era o que parecia mais calmo.
 *
 * Atraso não deixa de ser verdade porque envelheceu — envelhecer é o que o torna
 * mais grave. Quem não quiser ver dispensa o lembrete ou finaliza o estudo: as
 * duas saídas já existiam, e ambas são decisão de alguém, não esquecimento.
 *
 * Rodar: node test_agenda_atrasadas.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei '+n);
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var hoje=new Date(); hoje.setHours(0,0,0,0);
function dias(n){ var d=new Date(hoje); d.setDate(d.getDate()+n); return d; }

var EVS={};
var ctx={
  today0:function(){ return hoje; },
  addDays:function(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; },
  daysBetween:function(a,b){ return Math.round((b-a)/86400000); },
  studyEventsV2:function(s){ return EVS[s.id]||[]; },
  normalizeStudy:function(s){ return s; },
  estudoFinalizado:function(s){ return !!s.finalizado; },
  _agEstaDispensado:function(s,ev){ return !!(s.disp&&s.disp[ev.idx]); },
  data:{}, Object:Object, Math:Math, Date:Date, Array:Array
};
vm.createContext(ctx);
vm.runInContext([pega('nextEvent'), pega('allUpcomingEvents')].join('\n'),ctx);

function cenario(evs, extra){
  var s=Object.assign({id:'E1'}, extra||{});
  EVS['E1']=evs;
  ctx.data={QA:{estudos:[s]}};
  return s;
}

console.log('\n--- A agenda enxerga o que está MUITO atrasado ---');
cenario([{type:'apl',idx:1,total:2,date:dias(-40)}]);
var ag=ctx.allUpcomingEvents(30);
ck(ag.length===1,'aplicação atrasada há 40 dias aparece na agenda');
ck(ag[0].diff===-40,'com o atraso certo: '+ag[0].diff+' dias');

console.log('\n--- E isso é o que mudou: antes o corte era 3 dias ---');
cenario([{type:'apl',idx:1,total:1,date:dias(-4)}]);
ck(ctx.allUpcomingEvents(30).length===1,'quatro dias de atraso — o caso exato que sumia');
ck(!/diff>=-3/.test(src),'o corte não existe mais no código');

console.log('\n--- O limite para FRENTE continua valendo ---');
cenario([{type:'av',idx:1,total:1,date:dias(60)}]);
ck(ctx.allUpcomingEvents(30).length===0,'evento a 60 dias fica fora da janela de 30');
ck(ctx.allUpcomingEvents(90).length===1,'e entra na de 90');

console.log('\n--- Realizado, dispensado e finalizado seguem fora ---');
cenario([{type:'apl',idx:1,total:1,date:dias(-40),realizada:true}]);
ck(ctx.allUpcomingEvents(30).length===0,'evento já realizado não vira lembrete');
cenario([{type:'apl',idx:1,total:1,date:dias(-40)}],{disp:{1:true}});
ck(ctx.allUpcomingEvents(30).length===0,'lembrete dispensado continua dispensado');
ck(ctx.allUpcomingEvents(30,true).length===1,'mas reaparece quando se pede para ver os dispensados');
cenario([{type:'apl',idx:1,total:1,date:dias(-40)}],{finalizado:true});
ck(ctx.allUpcomingEvents(30).length===0,'estudo finalizado não gera lembrete nenhum');

console.log('\n--- O cartão e o mapa param de mostrar calma falsa ---');
EVS['E2']=[{type:'apl',idx:1,total:2,date:dias(-40)},{type:'av',idx:2,total:2,date:dias(-10)}];
var ne=ctx.nextEvent({id:'E2'});
ck(!!ne,'estudo 40 dias atrasado TEM próximo evento — antes vinha nulo');
ck(ne.overdue===true,'marcado como atrasado');
ck(ne.idx===1 && ne.daysAgo===40,'e é o MAIS ANTIGO pendente ('+ne.daysAgo+'d), não o mais recente');

console.log('\n--- O que já foi feito é pulado ---');
EVS['E3']=[{type:'apl',idx:1,total:2,date:dias(-40),realizada:true},
           {type:'av',idx:2,total:2,date:dias(-10)}];
ne=ctx.nextEvent({id:'E3'});
ck(ne.idx===2 && ne.daysAgo===10,'a aplicação registrada é pulada; sobra a avaliação atrasada');

console.log('\n--- Estudo que cumpriu o plano inteiro não fica vermelho ---');
EVS['E4']=[{type:'apl',idx:1,total:1,date:dias(-40),realizada:true}];
ck(ctx.nextEvent({id:'E4'})===null,'tudo realizado devolve NULO — sem etiqueta de atraso');

console.log('\n--- Evento futuro continua sendo o próximo, sem marca de atraso ---');
EVS['E5']=[{type:'apl',idx:1,total:2,date:dias(-40),realizada:true},
           {type:'av',idx:2,total:2,date:dias(5)}];
ne=ctx.nextEvent({id:'E5'});
ck(ne.idx===2 && !ne.overdue,'evento a 5 dias à frente, sem overdue');

console.log('\n--- Estudo sem evento nenhum ---');
EVS['E6']=[];
ck(ctx.nextEvent({id:'E6'})===null,'não quebra e não inventa evento');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
