/* Versão e diagnóstico local: não altera dados, login nem recarrega a página. */
(function(w,d){
  'use strict';
  var VERSION='392', KEY='agracta-runtime-session', LOG='agracta-runtime-errors';
  var records=[],notice=null,details=null,rendering=false;
  function read(key){try{return JSON.parse(w.sessionStorage.getItem(key)||'null');}catch(e){return null;}}
  function write(key,value){try{w.sessionStorage.setItem(key,JSON.stringify(value));}catch(e){}}
  function mark(state){write(KEY,{version:VERSION,state:state,at:new Date().toISOString()});}
  function button(text,run){var b=d.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',run);b.style.cssText='padding:9px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit;font:inherit;cursor:pointer';return b;}
  function summary(){return 'Agracta v'+VERSION+'\n'+(records.length?records.map(function(r){return r.at+' | v'+r.version+' | '+r.kind+' | '+r.message+' | '+r.source;}).join('\n'):'Nenhuma falha registrada nesta aba.');}
  function openDetails(){
    if(!d.body)return;
    if(details)details.remove();
    details=d.createElement('section');details.id='agracta-runtime-details';details.setAttribute('role','dialog');details.setAttribute('aria-label','Versão e diagnóstico do Agracta');
    details.style.cssText='position:fixed;inset:calc(12px + env(safe-area-inset-top,0px)) 12px calc(90px + env(safe-area-inset-bottom,0px));z-index:2147483647;background:var(--surface,#fff);color:var(--text,#142f52);border:1px solid #789;border-radius:12px;padding:16px;overflow:auto;font:14px Arial;box-shadow:0 5px 25px #0005';
    var h=d.createElement('h2');h.textContent='Agracta v'+VERSION;details.appendChild(h);
    var p=d.createElement('p');p.textContent='Diagnóstico guardado somente nesta aba. Confira o último registro do ensaio antes de continuar após uma falha.';details.appendChild(p);
    var area=d.createElement('textarea');area.readOnly=true;area.value=summary();area.setAttribute('aria-label','Detalhes para copiar');area.style.cssText='display:block;width:100%;box-sizing:border-box;min-height:180px;font:12px monospace';details.appendChild(area);
    details.appendChild(button('Copiar detalhes',function(){area.focus();area.select();if(w.navigator.clipboard)w.navigator.clipboard.writeText(area.value).catch(function(){/* texto permanece selecionado para cópia manual */});}));
    details.appendChild(button('Fechar',function(){details.remove();details=null;}));d.body.appendChild(details);
  }
  function show(){
    if(!d.body||rendering||!records.length)return;
    rendering=true;
    try{
      if(!notice){notice=d.createElement('aside');notice.id='agracta-runtime-notice';notice.setAttribute('role','alert');notice.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:2147483646;padding:12px;border:1px solid #b76a20;border-radius:12px;background:#fff3dc;color:#402b12;font:14px Arial;box-shadow:0 4px 20px #0004';d.body.appendChild(notice);}
      notice.replaceChildren();var text=d.createElement('p');text.textContent='Agracta v'+VERSION+' — '+records[records.length-1].message+' Confira o último registro antes de continuar.';notice.appendChild(text);
      notice.appendChild(button('Ver detalhes',openDetails));notice.appendChild(button('Dispensar',function(){notice.remove();notice=null;}));
    }finally{rendering=false;}
  }
  function report(kind,message,source){
    if(rendering)return;
    var r={version:VERSION,at:new Date().toISOString(),kind:String(kind).slice(0,60),message:String(message||'Falha inesperada no aplicativo.').slice(0,500),source:String(source||'').split('?')[0].slice(-180)};
    var last=records[records.length-1];if(last&&last.kind===r.kind&&last.message===r.message&&last.source===r.source&&Date.now()-Date.parse(last.at)<5000)return;
    records.push(r);records=records.slice(-20);write(LOG,records);show();
  }
  var previous=read(KEY),saved=read(LOG);if(Array.isArray(saved))records=saved.slice(-20);
  w.AgractaRuntime={version:VERSION,report:report,showDetails:openDetails};
  w.addEventListener('error',function(e){
    if(e.target&&e.target!==w){var t=e.target;if(t.tagName==='SCRIPT'||(t.tagName==='LINK'&&t.rel==='stylesheet'))report('carregamento','Um arquivo necessário não carregou.',t.src||t.href);return;}
    report('erro',e.message||'Falha inesperada no aplicativo.',(e.filename||'')+':'+(e.lineno||0));
  },true);
  w.addEventListener('unhandledrejection',function(e){var r=e.reason;report('operação',r&&r.message||'Uma operação não foi concluída.',r&&r.code||'');});
  w.addEventListener('pagehide',function(){mark('closed');});
  w.addEventListener('pageshow',function(){mark(d.hidden?'paused':'active');});
  d.addEventListener('visibilitychange',function(){mark(d.hidden?'paused':'active');});
  function ready(){
    var badge=d.getElementById('agracta-version');if(badge){badge.textContent='v'+VERSION;badge.addEventListener('click',openDetails);}
    if(previous&&previous.state==='active')report('sessão','A sessão anterior terminou sem registrar um fechamento normal. O navegador pode ter encerrado a aba.','versão anterior: '+previous.version);
    mark(d.hidden?'paused':'active');
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',ready);else ready();
})(window,document);
