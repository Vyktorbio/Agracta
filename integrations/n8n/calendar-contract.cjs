'use strict';
const C=require('../../vendor/agenda-google-core.js');

function prepare(input,calendarId){
  if(!calendarId || calendarId==='CONFIGURE_O_ID_DA_AGENDA') throw Error('Configure o ID da agenda no nó Agenda de destino.');
  if(!input || input.protocol!==C.PROTOCOL || !/^agr-[a-z0-9-]{5,100}$/.test(input.requestId||'')) throw Error('Pedido de agenda inválido.');
  if(!['upsert','retire'].includes(input.action)) throw Error('Operação inválida.');
  let parts;
  try{parts=JSON.parse(input.key);}catch(e){throw Error('Identidade inválida.');}
  if(!Array.isArray(parts) || parts.length!==4 || parts[0]!=='agracta-v1' ||
    parts.some(p=>typeof p!=='string' || !p || p.length>160) ||
    !/^(apl:\d+|eval#.+|eval:\d+)$/.test(parts[3]) || JSON.stringify(parts)!==input.key) throw Error('Identidade inválida.');
  const id=C.eventId(input.key), base='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events';
  const result={requestId:input.requestId,action:input.action,key:input.key,eventId:id,base:base,url:base+'/'+id};
  if(input.action==='upsert'){
    const e=input.event;
    if(!e || !C.validDate(e.date) || typeof e.summary!=='string' || !e.summary.startsWith('Agracta · ') || e.summary.length>1000 ||
      typeof e.description!=='string' || e.description.length>5000 || typeof e.location!=='string' || e.location.length>500 ||
      typeof e.link!=='string' || !/^https?:\/\/[^\s]+$/.test(e.link) || e.link.length>2000) throw Error('Conteúdo do compromisso inválido.');
    result.googleBody={id:id,summary:e.summary,description:e.description,location:e.location,
      start:{date:e.date},end:{date:C.nextDate(e.date)},status:'confirmed',transparency:'transparent',
      reminders:{useDefault:true},extendedProperties:{private:{agractaSource:'agracta-v1',agractaKey:input.key,agractaState:'pendente'}}};
  }
  return result;
}

function plan(prepared,response){
  const code=response.statusCode, body=response.body||{};
  if(code===404){
    if(prepared.action==='retire') return {skip:true};
    return {skip:false,method:'POST',url:prepared.base,googleBody:prepared.googleBody,headers:{}};
  }
  if(code!==200) throw Error('A leitura da Agenda Google falhou (HTTP '+code+').');
  const meta=(body.extendedProperties||{}).private||{};
  if(body.id!==prepared.eventId || meta.agractaSource!=='agracta-v1' || meta.agractaKey!==prepared.key)
    throw Error('O compromisso não pertence a esta integração. Nenhuma alteração foi feita.');
  if(!body.etag) throw Error('A Agenda Google não informou a versão do compromisso.');
  let patch;
  if(prepared.action==='retire'){
    if(meta.agractaState==='encerrado') return {skip:true};
    patch={summary:'Encerrado · '+String(body.summary||'Agracta'),transparency:'transparent',
      reminders:{useDefault:false,overrides:[]},
      extendedProperties:{private:Object.assign({},meta,{agractaState:'encerrado'})}};
  }else{
    patch=Object.assign({},prepared.googleBody);delete patch.id;
  }
  return {skip:false,method:'PATCH',url:prepared.url,googleBody:patch,headers:{'If-Match':body.etag}};
}

function confirm(prepared,planned,response){
  if(!planned.skip){
    if(!response || response.statusCode<200 || response.statusCode>=300 || !response.body || response.body.id!==prepared.eventId)
      throw Error('A Agenda Google não confirmou a gravação (HTTP '+(response&&response.statusCode)+'). Reenvie para reconciliar.');
  }
  return {ok:true,protocol:C.PROTOCOL,requestId:prepared.requestId,action:prepared.action,eventId:prepared.eventId};
}
module.exports={prepare,plan,confirm};
