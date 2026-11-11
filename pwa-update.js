(function(w,d,n){
  'use strict';
  if(!n.serviceWorker) return;
  var swUrl='sw.js?v=395', reg=null, waiting=null, reloadAfterActivate=false, hadController=!!n.serviceWorker.controller, panel=null;
  function closePanel(){ if(panel&&panel.parentNode) panel.parentNode.removeChild(panel); panel=null; }
  function show(message, actions){
    if(!panel){
      panel=d.createElement('div'); panel.id='agracta-update-notice';
      panel.style.cssText='position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:12px;right:12px;z-index:2147483647;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:#142f52;color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.28);font:600 14px/1.4 system-ui,-apple-system,sans-serif';
      panel.setAttribute('role','status'); panel.setAttribute('aria-live','polite');
      (d.body||d.documentElement).appendChild(panel);
    }
    while(panel.firstChild) panel.removeChild(panel.firstChild);
    var text=d.createElement('span'); text.textContent=message; text.style.cssText='flex:1 1 240px';
    panel.appendChild(text);
    (actions||[]).forEach(function(a){
      var b=d.createElement('button'); b.type='button'; b.textContent=a.label;
      b.style.cssText='min-height:40px;padding:8px 13px;border:1px solid rgba(255,255,255,.45);border-radius:9px;background:'+(a.primary?'#fff':'transparent')+';color:'+(a.primary?'#142f52':'#fff')+';font:700 13px system-ui,-apple-system,sans-serif;cursor:pointer';
      b.addEventListener('click',a.run); panel.appendChild(b);
    });
  }
  function failed(){
    show('Não foi possível concluir a atualização. A versão atual continua disponível; tente novamente quando houver conexão.',[
      {label:'Tentar novamente',primary:true,run:checkNow},
      {label:'Fechar',run:closePanel}
    ]);
  }
  function ready(r){
    var candidate=r&&r.waiting;
    if(!candidate) return;
    waiting=candidate;
    show('Nova versão pronta. Salve o que estiver em edição e atualize quando for seguro.',[
      {label:'Atualizar agora',primary:true,run:applyWaiting},
      {label:'Depois',run:closePanel}
    ]);
  }
  function applyWaiting(){
    var worker=waiting||(reg&&reg.waiting);
    if(!worker){ checkNow(); return; }
    waiting=worker; reloadAfterActivate=true;
    show('Aplicando atualização… Aguarde alguns segundos.',[]);
    try{ worker.postMessage({type:'AGR_ACTIVATE_UPDATE'}); }
    catch(e){ reloadAfterActivate=false; failed(); }
  }
  function observe(r){
    reg=r;
    r.addEventListener('updatefound',function(){
      var next=r.installing; if(!next) return;
      next.addEventListener('statechange',function(){
        if(next.state==='installed'&&r.waiting) ready(r);
        else if(next.state==='redundant'&&n.onLine) failed();
      });
    });
    if(r.waiting) ready(r);
    r.update().catch(function(){ if(n.onLine) failed(); });
  }
  function register(){
    n.serviceWorker.register(swUrl,{updateViaCache:'none'}).then(observe).catch(function(){if(n.onLine)failed();});
  }
  function checkNow(){
    if(!reg){register();return;}
    if(reg.waiting){ready(reg);return;}
    show('Verificando atualizações…',[]);
    reg.update().then(function(){
      if(reg.waiting) ready(reg);
      else show('A verificação terminou. Se houver uma versão nova, ela será oferecida assim que terminar de baixar.',[
        {label:'Fechar',run:closePanel}
      ]);
    }).catch(function(){if(n.onLine)failed();});
  }
  w.agractaSolicitarAtualizacao=function(){
    if(reg&&(waiting||reg.waiting)){applyWaiting();return;}
    checkNow();
  };
  n.serviceWorker.addEventListener('controllerchange',function(){
    if(reloadAfterActivate){reloadAfterActivate=false;w.location.reload();return;}
    if(!hadController){hadController=true;return;}
    if(reg&&reg.waiting)ready(reg);
  });
  w.addEventListener('load',register);
})(window,document,navigator);
