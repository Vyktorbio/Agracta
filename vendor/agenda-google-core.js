/* Agenda Google: contrato e diferenças da agenda, sem rede nem armazenamento. */
(function(root){
  'use strict';
  var PROTOCOL='agracta.calendar.v1';
  function validDate(s){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s||'')) return false;
    var d=new Date(s+'T12:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0,10)===s;
  }
  function nextDate(s){
    if(!validDate(s)) throw Error('Data inválida na agenda.');
    var d=new Date(s+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }
  function eventId(key){
    /* Hexadecimal é subconjunto do base32hex exigido pelo Google. A codificação
       é reversível, sem colisão de hash; não inclui data ou posição da avaliação. */
    var encoded=encodeURIComponent(key), bytes=[];
    for(var i=0;i<encoded.length;i++){
      if(encoded[i]==='%'){ bytes.push(encoded.slice(i+1,i+3).toLowerCase()); i+=2; }
      else bytes.push(encoded.charCodeAt(i).toString(16).padStart(2,'0'));
    }
    var id='ag'+bytes.join('');
    if(id.length>1024) throw Error('Identificador do compromisso muito longo.');
    return id;
  }
  function config(value){
    var c=value||{}, u;
    try{ u=new URL(String(c.url||'').trim()); }catch(e){ throw Error('Informe a URL de produção do n8n.'); }
    var loopback=['localhost','127.0.0.1','[::1]'].indexOf(u.hostname)>=0;
    if(u.protocol!=='https:' && !(u.protocol==='http:' && loopback)) throw Error('A conexão precisa de HTTPS.');
    if(u.username || u.password || u.hash || u.search) throw Error('Use uma URL sem senha, parâmetros ou fragmento.');
    if(/\/webhook-test\//.test(u.pathname)) throw Error('Use a URL de produção, que contém /webhook/, em vez da URL de teste.');
    var token=String(c.token||'').trim();
    if(token.length<24 || /\s/.test(token)) throw Error('A chave precisa de pelo menos 24 caracteres, sem espaços.');
    return {url:u.href,token:token,localId:String(c.localId||''),auto:c.auto===true};
  }
  function fromAgenda(items, options){
    var o=options||{}, out={}, base=new URL(o.baseUrl||'https://agracta.com.br/');
    (items||[]).forEach(function(it){
      if(!it || it.feito || it.dispensado) return;
      if(o.localId && it.localId!==o.localId) return;
      var ev=it.ev||{}, st=it.study||{};
      if(!validDate(it.iso)) throw Error('Há um compromisso com data inválida. Corrija a agenda antes de enviar.');
      if(!it.qid || !st.id || !['apl','av'].includes(it.tipo)) throw Error('Compromisso sem identidade válida.');
      var ek=it.tipo==='apl'?'apl:'+ev.idx:(ev.id!=null && ev.id!==''?'eval#'+ev.id:'eval:'+ev.idx);
      var key=JSON.stringify(['agracta-v1',String(it.qid),String(st.id),ek]);
      var title=it.tipo==='apl'?'Aplicação '+ev.idx+'/'+ev.total:'Avaliação '+ev.idx+(ev.tipo?' · '+ev.tipo:'');
      var quadra=String(it.quadra||it.qid), study=String(st.codigo||st.nome||st.id);
      var link=new URL(base.href); link.searchParams.set('agendaQuadra',it.qid); link.searchParams.set('agendaEstudo',st.id);
      if(ev.type==='eval' && ev.id) link.searchParams.set('agendaAvaliacao',ev.id);
      var event={date:it.iso,summary:'Agracta · '+title+' · '+quadra+' · '+study,
        description:'Estudo: '+study+'\nQuadra: '+quadra+(it.localNome?'\nLocal: '+it.localNome:'')+
          '\nAtividade: '+title+'\nAbrir no Agracta: '+link.href,
        location:String(it.localNome||'')+(it.localNome?' · ':'')+quadra,link:link.href};
      if(event.summary.length>1000 || event.description.length>5000) throw Error('Nome do compromisso muito longo.');
      if(out[key]) throw Error('Há compromissos com a mesma identidade na agenda.');
      out[key]={key:key,eventId:eventId(key),event:event,signature:JSON.stringify(event)};
    });
    return out;
  }
  function operations(current, managed, force){
    var out=[]; managed=managed||{};
    Object.keys(current).sort().forEach(function(key){
      var c=current[key];
      if(force || !managed[key] || managed[key].signature!==c.signature)
        out.push({action:'upsert',key:key,eventId:c.eventId,event:c.event,signature:c.signature});
    });
    Object.keys(managed).sort().forEach(function(key){
      if(!current[key]) out.push({action:'retire',key:key,eventId:eventId(key)});
    });
    return out;
  }
  function acknowledge(managed, op, response, requestId){
    if(!response || response.ok!==true || response.protocol!==PROTOCOL ||
      response.requestId!==requestId || response.eventId!==op.eventId || response.action!==op.action)
      throw Error('O n8n não confirmou este compromisso. Ele continua pendente de envio.');
    var copy=Object.assign({},managed);
    if(op.action==='retire') delete copy[op.key];
    else copy[op.key]={signature:op.signature,eventId:op.eventId};
    return copy;
  }
  var api={PROTOCOL:PROTOCOL,validDate:validDate,nextDate:nextDate,eventId:eventId,
    config:config,fromAgenda:fromAgenda,operations:operations,acknowledge:acknowledge};
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.AgendaGoogleCore=api;
})(typeof window!=='undefined'?window:this);
