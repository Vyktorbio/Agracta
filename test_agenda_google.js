'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('./vendor/agenda-google-core.js'),N=require('./integrations/n8n/calendar-contract.cjs');
const workflow=JSON.parse(fs.readFileSync('integrations/n8n/agracta-google-agenda.json','utf8'));
const node=name=>workflow.nodes.find(n=>n.name===name);
function execute(name,json,refs){
  const $=n=>({first:()=>({json:refs[n]})});
  return new Function('$json','$input','$',node(name).parameters.jsCode)(json,{first:()=>({json})},$)[0].json;
}
const make=(opts={})=>Object.assign({iso:'2026-10-05',tipo:'av',qid:'Q1',quadra:'C4',localId:'L1',localNome:'Local A',
  study:{id:'S1',codigo:'ENSAIO-01'},ev:{id:'A1',type:'eval',idx:1,tipo:'Severidade'}},opts);
const key=JSON.stringify(['agracta-v1','Q1','S1','eval#A1']);
let google=new Map(),calls=[],rev=0,managed={};
const current=items=>C.fromAgenda(items,{localId:'L1',baseUrl:'https://agracta.com.br/'});
function request(op,options={}){
  const req={protocol:C.PROTOCOL,requestId:'agr-test-12345',action:op.action,key:op.key,event:op.event||null};
  const p=execute('Preparar evento',{body:req,calendarId:'test-calendar'},{});
  assert.deepEqual(p,N.prepare(req,'test-calendar'));
  const existing=google.get(p.eventId);
  const get=existing?{statusCode:200,body:existing}:{statusCode:404,body:{}};
  const plan=execute('Planejar gravação',get,{'Preparar evento':p});
  assert.deepEqual(plan,N.plan(p,get));
  let response={};
  if(!plan.skip){
    calls.push(plan.method);
    if(options.conflict)response={statusCode:412,body:{error:'conflict'}};
    else{
      assert.equal(plan.url.startsWith('https://www.googleapis.com/calendar/v3/calendars/test-calendar/events'),true);
      if(plan.method==='POST')assert.equal(google.has(p.eventId),false);
      if(plan.method==='PATCH')assert.equal(plan.headers['If-Match'],existing.etag);
      const updated=Object.assign({},existing,plan.googleBody,{id:p.eventId,etag:'"v'+(++rev)+'"'});
      google.set(p.eventId,updated);response={statusCode:plan.method==='POST'?201:200,body:updated};
    }
  }
  const result=execute('Confirmar envio',response,{'Preparar evento':p,'Planejar gravação':plan});
  assert.deepEqual(result,N.confirm(p,plan,response));
  if(!options.lost)managed=C.acknowledge(managed,op,result,req.requestId);
  return result;
}

// Resposta perdida depois da criação: GET encontra o ID, PATCH reconcilia.
const first=current([make()]);
request(C.operations(first,managed)[0],{lost:true});
assert.equal(Object.keys(managed).length,0);assert.equal(google.size,1);
request(C.operations(first,managed)[0]);assert.equal(google.size,1);
assert.deepEqual(calls,['POST','PATCH']);assert.equal(C.operations(first,managed).length,0);

// Reordenar avaliações não troca identidade; mudar data atualiza mesmo evento.
const moved=current([make({iso:'2026-11-01',ev:{id:'A1',type:'eval',idx:5,tipo:'Severidade'}})]);
assert.equal(moved[key].eventId,first[key].eventId);
request(C.operations(moved,managed)[0]);
assert.deepEqual(google.get(first[key].eventId).start,{date:'2026-11-01'});
assert.deepEqual(google.get(first[key].eventId).end,{date:'2026-11-02'});
assert.equal(google.size,1);

// Feito/dispensado desaparece da seleção; retirar desliga avisos e preserva evento.
assert.equal(Object.keys(current([make({feito:true}),make({dispensado:true})])).length,0);
request(C.operations({},managed)[0]);
assert.equal(google.get(first[key].eventId).reminders.useDefault,false);
assert.match(google.get(first[key].eventId).summary,/^Encerrado · /);
assert.equal(Object.keys(managed).length,0);assert.equal(google.size,1);
request(C.operations(first,managed)[0]);
assert.equal(google.get(first[key].eventId).reminders.useDefault,true);
assert.equal(google.get(first[key].eventId).summary.startsWith('Encerrado'),false);

// Identidade inclui quadra e estudo; separadores e acentos não colidem.
assert.notEqual(C.eventId('["a|b","c"]'),C.eventId('["a","b|c"]'));
assert.match(C.eventId('á😀'),/^[0-9a-v]{5,1024}$/);
assert.equal(C.nextDate('2026-12-31'),'2027-01-01');
assert.equal(C.nextDate('2024-02-28'),'2024-02-29');
assert.equal(C.validDate('2026-02-30'),false);
assert.throws(()=>current([make({iso:'2026-02-30'})]),/data inválida/);
assert.equal(Object.keys(current([make({localId:'L2'})])).length,0);
assert.throws(()=>current([make(),make()]),/mesma identidade/);
assert.throws(()=>C.config({url:'https://n8n.test/webhook-test/x',token:'a'.repeat(32)}),/produção/);
assert.throws(()=>C.config({url:'http://n8n.test/webhook/x',token:'a'.repeat(32)}),/HTTPS/);
assert.throws(()=>C.config({url:'https://n8n.test/webhook/x?token=secret',token:'a'.repeat(32)}),/parâmetros/);
assert.equal(C.config({url:'http://localhost:5678/webhook/x',token:'a'.repeat(32)}).auto,false);

// HTTP falho, recibo trocado e conflito nunca viram confirmação local.
const op=C.operations(moved,managed,true)[0], before=JSON.stringify(managed);
assert.throws(()=>request(op,{conflict:true}),/não confirmou/);assert.equal(JSON.stringify(managed),before);
assert.throws(()=>C.acknowledge(managed,op,{ok:true},'agr-test-12345'),/continua pendente/);
assert.throws(()=>N.prepare({protocol:C.PROTOCOL,requestId:'agr-test-12345',action:'delete',key},'primary'),/Operação/);
const prepared=N.prepare({protocol:C.PROTOCOL,requestId:'agr-test-12345',action:'retire',key},'primary');
assert.throws(()=>N.plan(prepared,{statusCode:200,body:{id:prepared.eventId,etag:'x',summary:'evento pessoal'}}),/não pertence/);
assert.throws(()=>N.plan(prepared,{statusCode:401,body:{}}),/leitura/);

// JSON importável usa autenticação obrigatória, destino fixo e nós existentes.
assert.equal(workflow.active,false);assert.deepEqual(workflow.pinData,{});
assert.equal(node('Receber agenda').parameters.authentication,'headerAuth');
assert.equal(node('Receber agenda').parameters.responseMode,'lastNode');
assert.equal(node('Receber agenda').parameters.responseData,'firstEntryJson');
for(const n of workflow.nodes){if(n.credentials)assert.equal(Object.keys(n.credentials).length,0);}
for(const [from,connection] of Object.entries(workflow.connections)){
  assert.ok(node(from));connection.main.flat().forEach(edge=>assert.ok(node(edge.node)));
}
for(const name of ['Consultar compromisso','Gravar compromisso']){
  assert.equal(node(name).parameters.nodeCredentialType,'googleCalendarOAuth2Api');
  assert.equal(node(name).parameters.options.response.response.fullResponse,true);
  assert.equal(node(name).parameters.options.response.response.neverError,true);
}
assert.equal(C.operations(first,managed,true).length,1);
assert.match(first[key].event.link,/agendaQuadra=Q1/);
assert.equal(/notas|tratamentos|token/i.test(first[key].signature),false);
console.log('OK: Agenda Google — ciclo completo, reenvio, datas, encerramento, autenticação e workflow.');
