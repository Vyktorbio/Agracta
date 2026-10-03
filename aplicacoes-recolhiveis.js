/* Mantém a lista de aplicações legível no celular e no computador.
   O bloco é transformado depois de cada renderização porque a ficha do estudo
   é repintada ao salvar, sincronizar ou trocar de estudo. */
(function(){
  'use strict';
  var open={};
  function atualizar(){
    document.querySelectorAll('.sd-section').forEach(function(sec){
      var title=sec.querySelector(':scope > .sd-section-title');
      if(!title || !/^Aplicações/.test((title.textContent||'').trim())) return;
      sec.querySelectorAll(':scope > .eventos-list > .evento-item:not(details)').forEach(function(item,i){
        var head=item.querySelector('.evento-head');
        if(!head) return;
        var key=(item.dataset.aplicacaoId||'')+'|'+i+'|'+(head.textContent||'');
        var d=document.createElement('details'); d.className=item.className; d.dataset.aplicacaoId=key;
        if(open[key]) d.open=true;
        var s=document.createElement('summary');
        s.appendChild(head.cloneNode(true));
        var status=document.createElement('small'); status.textContent='Registrada'; s.appendChild(status);
        d.appendChild(s);
        Array.prototype.slice.call(item.childNodes).forEach(function(n){ if(n!==head)d.appendChild(n.cloneNode(true)); });
        d.addEventListener('toggle',function(){ open[key]=d.open; });
        d.querySelectorAll('button').forEach(function(b){ b.addEventListener('click',function(e){ e.stopPropagation(); }); });
        item.replaceWith(d);
      });
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',atualizar);
  else atualizar();
  new MutationObserver(atualizar).observe(document.body,{childList:true,subtree:true});
})();
