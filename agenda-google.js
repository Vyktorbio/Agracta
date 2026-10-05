/* Integração opcional: Agracta -> n8n -> Agenda Google. Sem credencial Google
   no navegador; chave do webhook e recibos ficam fora do estado dos estudos. */
(function(w){
  'use strict';
  var C=w.AgendaGoogleCore, timer=null, running=null, dirty=false, status='', returnFocus=null;
  function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function account(){return String((w._authUser||{}).email||'').trim().toLowerCase();}
  function configKey(){return 'agracta-agenda-google-config:'+account();}
  function ledgerKey(url){return 'agracta-agenda-google-recibos:'+account()+':'+url;}
  function read(key, fallback){
    var s=w.localStorage.getItem(key);
    return s?JSON.parse(s):fallback;
  }
  function saved(){return read(configKey(),{});}
  function allowed(){
    if(!account() || document.documentElement.classList.contains('pre-auth') ||
      document.getElementById('acessoLock') && document.getElementById('acessoLock').style.display!=='none') return false;
    if(w.AgractaFirebase && w.AgractaFirebase.configured()){
      var s=w.AgractaFirebase.status();
      if(!s.ready || s.pendingWrites>0) return false;
    }
    return true;
  }
  function agenda(c){
    if(c.localId && !(w.LOCAIS||{})[c.localId]) throw Error('A localidade selecionada não está disponível. Confira a sincronização do Agracta.');
    if(typeof w.agCalItens!=='function') throw Error('A agenda do Agracta não está disponível.');
    var items=w.agCalItens(false).map(function(it){
      var loc=(w.QLOCAL||{})[it.qid]||w.HOME_LOCAL||'';
      return Object.assign({},it,{localId:loc,localNome:((w.LOCAIS||{})[loc]||{}).nome||loc,
        quadra:typeof w.quadraNome==='function'?w.quadraNome(it.qid):it.qid});
    });
    return C.fromAgenda(items,{localId:c.localId,baseUrl:new URL('./',w.location.href).href});
  }
  function message(s){
    status=s;
    var el=document.getElementById('agGoogleStatus'); if(el) el.textContent=s;
    el=document.getElementById('agGoogleBadge'); if(el) el.textContent=s;
  }
  function queue(){
    dirty=true;
    clearTimeout(timer);
    timer=setTimeout(function(){
      if(running) return;
      try{var c=saved();if(c.auto && allowed()) sync(false).catch(function(){});}catch(e){message('Confira a conexão com a Agenda Google.');}
    },1800);
  }
  async function send(c, op){
    var requestId='agr-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2), controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},30000);
    try{
      var r=await w.fetch(c.url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token},
        credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal,
        body:JSON.stringify({protocol:C.PROTOCOL,requestId:requestId,action:op.action,key:op.key,event:op.event||null})});
      if(!r.ok) throw Error(r.status===401 || r.status===403?'A chave de conexão foi recusada. Confira a credencial do webhook no n8n.':'O n8n não confirmou o envio (HTTP '+r.status+').');
      var response=await r.json();
      return {response:response,requestId:requestId};
    }finally{clearTimeout(timeout);}
  }
  async function run(force){
    if(!allowed()) throw Error('Entre no Agracta e aguarde a sincronização dos estudos antes de enviar.');
    var who=account(), c=C.config(saved()), lk=ledgerKey(c.url), receipt=read(lk,{managed:{}}), managed=receipt.managed||{};
    if(w.navigator.onLine===false){message('Sem internet. A agenda será enviada quando a conexão voltar e o Agracta estiver aberto.');return;}
    var current=agenda(c), ops=C.operations(current,managed,force);
    dirty=false;
    if(!ops.length){message('Agenda Google atualizada.');return;}
    for(var i=0;i<ops.length;i++){
      if(w.navigator.onLine===false || !allowed() || who!==account() || saved().url!==c.url || (!force && !saved().auto)){
        dirty=true;message('Envio pausado. Os compromissos restantes continuam pendentes.');return;
      }
      /* Uma edição durante a chamada torna o resto da fotografia antigo. O
         próximo envio recalcula tudo, inclusive retiradas e novas datas. */
      if(dirty){queue();return;}
      message('Sincronizando '+(i+1)+' de '+ops.length+'…');
      var result=await send(c,ops[i]);
      var next=C.acknowledge(managed,ops[i],result.response,result.requestId);
      /* Não registra recibo na conta de quem entrou durante a chamada. */
      if(who!==account()){dirty=true;return;}
      receipt={managed:next,lastSync:new Date().toISOString()};
      w.localStorage.setItem(lk,JSON.stringify(receipt)); managed=next;
    }
    message('Agenda Google atualizada: '+ops.length+' compromisso'+(ops.length===1?'':'s')+' confirmado'+(ops.length===1?'':'s')+'.');
  }
  function sync(force){
    if(running) return running;
    running=run(force).catch(function(e){
      dirty=true;
      message(e.name==='AbortError'?'O envio demorou demais. Os compromissos continuam pendentes.':(e.message||'Falha de conexão. Os compromissos continuam pendentes.'));
      throw e;
    }).finally(function(){running=null;});
    return running;
  }
  function close(){var el=document.getElementById('agGoogleOverlay');if(el)el.remove();if(returnFocus && returnFocus.focus)returnFocus.focus();}
  function open(){
    if(!account()){if(w.alert)w.alert('Entre no Agracta para configurar a Agenda Google.');return;}
    close(); returnFocus=document.activeElement;
    var formAccount=account();
    var c;try{c=saved();}catch(e){message('Não foi possível ler a conexão salva.');return;}
    var options='<option value="">Todos os locais</option>';
    Object.keys(w.LOCAIS||{}).sort().forEach(function(id){options+='<option value="'+esc(id)+'"'+(c.localId===id?' selected':'')+'>'+esc(w.LOCAIS[id].nome||id)+'</option>';});
    var ov=document.createElement('div');ov.id='agGoogleOverlay';ov.className='agg-overlay';
    ov.innerHTML='<section class="agg-dialog" role="dialog" aria-modal="true" aria-labelledby="agGoogleTitle">'+
      '<div class="agg-head"><h2 id="agGoogleTitle">Agenda Google</h2><button type="button" data-agg="close" aria-label="Fechar">×</button></div>'+
      '<p>Aplicações e avaliações pendentes viram compromissos de dia inteiro. O Agracta mantém as datas; o Google entrega os lembretes configurados na agenda.</p>'+
      '<form id="agGoogleForm"><label>URL de produção do n8n<input name="url" type="url" required autocomplete="off" placeholder="https://seu-n8n/webhook/agracta-google-agenda" value="'+esc(c.url)+'"></label>'+
      '<label>Chave de conexão<input name="token" type="password" required minlength="24" autocomplete="off" value="'+esc(c.token)+'"></label>'+
      '<div class="agg-key"><button type="button" data-agg="generate">Gerar chave</button><button type="button" data-agg="show">Mostrar chave</button></div>'+
      '<label>Agenda dos locais<select name="localId">'+options+'</select></label>'+
      '<label class="agg-check"><input name="auto" type="checkbox"'+(c.auto?' checked':'')+'>Sincronizar automaticamente enquanto o Agracta estiver aberto</label>'+
      '<p class="agg-note">Quando um compromisso sai da agenda do estudo, ele fica marcado como encerrado no Google e deixa de avisar. Edições feitas no Google não alteram o estudo. A conexão é salva para sua conta neste aparelho.</p>'+
      '<div class="agg-actions"><button type="submit">Salvar conexão</button><button type="button" data-agg="sync">Sincronizar agora</button></div></form>'+
      '<p id="agGooglePreview" class="agg-note"></p><p id="agGoogleStatus" role="status" aria-live="polite">'+esc(status)+'</p></section>';
    document.body.appendChild(ov);
    var form=document.getElementById('agGoogleForm');
    function values(){return {url:form.elements.url.value,token:form.elements.token.value,localId:form.elements.localId.value,auto:form.elements.auto.checked};}
    function sameAccount(){if(formAccount!==account())throw Error('A conta mudou. Abra novamente a conexão da sua conta.');}
    function preview(){try{document.getElementById('agGooglePreview').textContent=Object.keys(agenda(values())).length+' compromissos pendentes na seleção.';}catch(e){document.getElementById('agGooglePreview').textContent=e.message;}}
    form.elements.localId.addEventListener('change',preview);preview();
    form.addEventListener('submit',function(ev){ev.preventDefault();try{
      sameAccount();
      if(running)throw Error('Aguarde o envio atual antes de mudar a conexão.');
      var value=C.config(values());w.localStorage.setItem(configKey(),JSON.stringify(value));
      message('Conexão salva. '+(value.auto?'O envio automático está ligado.':'Use Sincronizar agora para enviar.'));if(value.auto)queue();
    }catch(e){message(e.message);}});
    ov.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-agg]'), action=b&&b.getAttribute('data-agg');
      if(ev.target===ov || action==='close'){close();return;}
      if(action==='show'){var input=form.elements.token;input.type=input.type==='password'?'text':'password';b.textContent=input.type==='password'?'Mostrar chave':'Ocultar chave';}
      if(action==='generate'){try{var bytes=new Uint8Array(24);w.crypto.getRandomValues(bytes);form.elements.token.value=Array.from(bytes).map(function(n){return n.toString(16).padStart(2,'0');}).join('');message('Copie esta chave para a credencial do webhook no n8n.');}catch(e){message('Não foi possível gerar a chave neste aparelho.');}}
      if(action==='sync'){try{
        sameAccount();
        if(running)throw Error('A sincronização já está em andamento.');
        var value=C.config(values());w.localStorage.setItem(configKey(),JSON.stringify(value));sync(true).catch(function(){});
      }catch(e){message(e.message);}}
    });
    ov.addEventListener('keydown',function(ev){
      if(ev.key==='Escape'){ev.preventDefault();close();}
      if(ev.key==='Tab'){var xs=Array.from(ov.querySelectorAll('button,input,select')).filter(function(x){return !x.disabled;}), first=xs[0],last=xs[xs.length-1];
        if(ev.shiftKey && document.activeElement===first){last.focus();ev.preventDefault();}else if(!ev.shiftKey && document.activeElement===last){first.focus();ev.preventDefault();}}
    });
    form.elements.url.focus();
  }
  w.agGoogleAcoesHtml=function(){return '<div class="agg-entry"><button type="button" onclick="agGoogleAbrir()">Agenda Google</button><span id="agGoogleBadge" role="status">'+esc(status)+'</span></div>';};
  w.agGoogleAbrir=open;
  w.AgractaAgendaGoogle={sync:sync,queue:queue,close:close};
  var showGate=w.showAuthGate,hideGate=w.hideAuthGate;
  if(typeof showGate==='function')w.showAuthGate=function(){close();status='';clearTimeout(timer);return showGate.apply(this,arguments);};
  if(typeof hideGate==='function')w.hideAuthGate=function(){var result=hideGate.apply(this,arguments);queue();setTimeout(deepLink,1000);return result;};
  ['agracta:agenda-alterada','agracta:sincronizado','online'].forEach(function(name){w.addEventListener(name,queue);});
  w.addEventListener('storage',function(ev){if(ev.key && ev.key.indexOf('agracta-agenda-google-')===0)queue();});
  /* Recupera mudanças feitas offline e a entrada numa sessão já persistida.
     Não há serviço de background: os lembretes são entregues pelo Google. */
  setInterval(function(){if(!document.hidden)queue();},60000);
  queue();
  function deepLink(){
    if(!allowed())return;
    var u=new URL(w.location.href),q=u.searchParams.get('agendaQuadra'),s=u.searchParams.get('agendaEstudo');
    if(!q||!s)return;
    var study=((w.data||{})[q]||{}).estudos||[], found=study.some(function(st){return st && String(st.id)===s;});
    if(!found)return;
    var av=u.searchParams.get('agendaAvaliacao')||'';
    u.searchParams.delete('agendaQuadra');u.searchParams.delete('agendaEstudo');u.searchParams.delete('agendaAvaliacao');
    w.history.replaceState(null,'',u.href);
    if(typeof w.closeAgendaAndOpen==='function')w.closeAgendaAndOpen(q,s,av);
  }
  w.addEventListener('agracta:sincronizado',deepLink);setTimeout(deepLink,2000);
})(window);
