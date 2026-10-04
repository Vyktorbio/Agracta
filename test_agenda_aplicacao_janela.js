'use strict';
/* Aplicação registrada × planejada: janela por aplicação, um registro por planejada. */
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
function fn(nome){const i=src.indexOf('function '+nome+'(');assert.ok(i>=0,nome);let d=0;for(let k=src.indexOf('{',i);k<src.length;k++){if(src[k]==='{')d++;else if(src[k]==='}'&&--d===0)return src.slice(i,k+1);}}
const ctx={AvaliacaoCore:{avaliacao:()=>({complete:false})}};vm.createContext(ctx);
vm.runInContext(['pD','isoToBR','daysBetween','addDays','studyEventsV2'].map(fn).join('\n'),ctx);
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};
const apl=(st)=>ctx.studyEventsV2(st).filter(e=>e.type==='apl').map(e=>e.realizada);
const base={dataInicio:'2026-09-01',numAplicacoes:3,intervaloDias:14,avaliacoes:[]};
ok(apl({...base,aplicacoes:[{data:'2026-09-01'},{data:'2026-09-15'}]}).join()==='true,true,false','no dia: cumpridas na ordem');
ok(apl({...base,aplicacoes:[{data:'2026-09-04'}]}).join()==='true,false,false','3 dias atrasada (chuva) ainda cumpre a 1ª');
ok(apl({...base,aplicacoes:[{data:'2026-09-04'},{data:'2026-09-05'}]}).join()==='true,false,false','reaplicação na mesma janela não adianta a 2ª');
ok(apl({...base,aplicacoes:[{data:'2026-09-20'}]}).join()==='false,true,false','registro na janela da 2ª não cumpre a 1ª');
ok(apl({...base,aplicacoes:[{data:'2026-08-20'}]}).join()==='false,false,false','muito antes do início não conta');
ok(apl({dataInicio:'2026-09-01',numAplicacoes:1,intervaloDias:0,avaliacoes:[],aplicacoes:[{data:'2026-09-10'}]}).join()==='true','aplicação única: vale registro depois');
console.log('agenda · janela das aplicações: '+n+' verificações OK.');
/* Dispensa de avaliação pelo id: excluir uma avaliação anterior não move a dispensa. */
vm.runInContext(['_agEvKey','_agEstaDispensado'].map(fn).join('\n'),ctx);
{
  const st={dispensados:[{k:'eval#B'}]};
  ok(ctx._agEstaDispensado(st,{type:'eval',idx:2,id:'B'}),'dispensada pelo id');
  ok(!ctx._agEstaDispensado(st,{type:'eval',idx:2,id:'C'}),'outra avaliação na mesma posição não herda a dispensa');
  const velho={dispensados:[{k:'eval:3'}]};
  ok(ctx._agEstaDispensado(velho,{type:'eval',idx:3,id:'X'})&&velho.dispensados[0].k==='eval#X','dispensa antiga vale e migra para o id');
  ok(ctx._agEstaDispensado({dispensados:[{k:'apl:2'}]},{type:'apl',idx:2}),'aplicação segue pelo número');
  console.log('agenda · dispensa por id: OK ('+n+')');
}
