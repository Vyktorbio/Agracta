/* Campo inteligente — liga as peças que já existiam (vendor/campo-inteligente-core.js).
   1. Clima sozinho: chuva depois da aplicação e ambiente desde a aplicação são
      lidos da estação quando há rede, sem ninguém tocar em "Choveu depois?".
      Chuva nas primeiras horas vira aviso na tela.
   2. Nota estranha na hora: ao sair da célula, valor muito longe das outras
      repetições do tratamento avisa — e a célula fica marcada até conferir.
   3. Agenda: avaliações previstas acompanham a 1ª aplicação real (um toque),
      e o BBCH observado prevê em que estádio cai a próxima aplicação.
   Aponta, não bloqueia; o que grava usa as funções que o app já tinha. */
(function(w){
'use strict';
var C=w.CampoInteligenteCore; if(!C) return;
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function toast(t,ms){ try{ if(typeof w._stxToast==='function') w._stxToast(t,ms||6000); }catch(e){} }
function estudo(qid,sid){ var q=(w.data||{})[qid]; return q&&(q.estudos||[]).filter(function(s){ return s&&s.id===sid; })[0]||null; }
function finalizado(s){ try{ return typeof w.estudoFinalizado==='function'&&w.estudoFinalizado(s); }catch(e){ return false; } }
function lab(qid){ try{ return typeof w.isQuadraLab==='function'&&w.isQuadraLab(qid); }catch(e){ return false; } }
function hoje(){ try{ return w.todayISO(); }catch(e){ return new Date().toISOString().slice(0,10); } }

/* ============================================================ 1. clima */
var LIMITE_POR_CICLO=8, _rodando=false, _tentou={}, AVISADOS='agracta-lavagem-avisada';
function avisados(){ try{ return JSON.parse(localStorage.getItem(AVISADOS)||'{}')||{}; }catch(e){ return {}; } }
function marcaAvisado(k){ try{ var a=avisados(); a[k]=Date.now(); localStorage.setItem(AVISADOS,JSON.stringify(a)); }catch(e){} }
function fila(){
  var out=[], agora=Date.now();
  Object.keys(w.data||{}).forEach(function(qid){
    if(qid==='__config'||lab(qid)) return;
    if(typeof w._stationMacForQuadra==='function'&&!w._stationMacForQuadra(qid)) return;
    ((w.data[qid]||{}).estudos||[]).forEach(function(s){
      if(!s||!s.id||finalizado(s)) return;
      C.pendentesClima(s,agora,{}).forEach(function(p){
        var k=qid+'|'+s.id+'|'+p.tipo+'|'+p.id;
        if(_tentou[k]&&agora-_tentou[k]<30*60000) return;   /* erro recente: espera */
        out.push({qid:qid,sid:s.id,p:p,k:k});
      });
    });
  });
  return out.slice(0,LIMITE_POR_CICLO);
}
function cicloClima(){
  if(_rodando||(typeof navigator!=='undefined'&&navigator.onLine===false)) return;
  if(typeof w.consultarPos!=='function'||typeof w.consultarJanela!=='function') return;
  var itens=fila(); if(!itens.length) return;
  _rodando=true; var mudou={};
  (function proximo(i){
    if(i>=itens.length){
      _rodando=false;
      /* repinta o estudo aberto, se ninguém estiver editando nele */
      if(mudou[w.curV+'|'+w.curSid]&&!w._avEditing&&document.getElementById('study-stage-execucao')){
        try{ w.openStudyDetail(w.curV,w.curSid); }catch(e){}
      }
      return;
    }
    var it=itens[i], s=estudo(it.qid,it.sid); _tentou[it.k]=Date.now();
    function segue(r){
      if(r&&!r.erro){ mudou[it.qid+'|'+it.sid]=1; delete _tentou[it.k]; }
      if(it.p.tipo==='pos'&&C.lavagem(r)){
        var ak=it.sid+'|'+it.p.id;
        if(!avisados()[ak]){
          marcaAvisado(ak);
          toast('🌧 '+(s&&(s.codigo||s.nome)||'Estudo')+': choveu '+String(r.chuvaMm).replace('.',',')+' mm, a primeira '+
            String(r.primeiraChuvaHoras).replace('.',',')+' h depois da aplicação de '+
            ((typeof w.isoToBR==='function'&&w.isoToBR(r.data))||r.data)+' — possível lavagem.',9000);
        }
      }
      setTimeout(function(){ proximo(i+1); },1200);
    }
    try{
      if(!s){ return segue(null); }
      if(it.p.tipo==='pos'){
        var ap=(s.aplicacoes||[]).filter(function(a){ return a.id===it.p.id; })[0];
        if(!ap) return segue(null);
        w.consultarPos(it.qid,it.sid,ap,48,!!it.p.forcar,segue);
      }else{
        var av=(s.avaliacoes||[]).filter(function(a){ return a.id===it.p.id; })[0];
        if(!av) return segue(null);
        w.consultarJanela(it.qid,it.sid,av,false,segue);
      }
    }catch(e){ segue(null); }
  })(0);
}
setTimeout(cicloClima,25000);
w.addEventListener('online',function(){ setTimeout(cicloClima,5000); });
setInterval(function(){ if(document.visibilityState==='visible') cicloClima(); },30*60000);

/* ================================================== 2. nota fora do padrão */
function tipoCore(v){
  var t=null;
  try{ if(typeof w._avCfg==='function') t=(w._avCfg(w._avGrid,v)||{}).tipo; }catch(e){}
  t=t||((w._avGrid&&w._avGrid.tipos)||{})[v];
  return (t==='contagem'||t==='escala')?'contagem':'pct';
}
function valorGrid(row,v){
  var n=(w._avGrid&&w._avGrid.notas)||{}, x=(n[row.key]||{})[v];
  if((x==null||x==='')&&row.rep===1&&n[row.tratId]) x=n[row.tratId][v];
  return x;
}
function alertaDe(key,v){
  try{
    var st=w._avStudy&&w._avStudy(); if(!st||!key||!v) return null;
    var rows=w._avRowsForStudy(st,false);
    return C.notaAlerta(rows.map(function(r){ return {key:r.key,trat:r.tratId,valor:valorGrid(r,v)}; }),key,tipoCore(v));
  }catch(e){ return null; }
}
function rotulo(key){
  try{
    var r=w._avRowsForStudy(w._avStudy(),true).filter(function(x){ return x.key===key; })[0];
    if(!r) return key;
    return (r.parcela?('Parcela '+r.parcela+' · '):'')+r.tratId+' rep '+(r.repDisplay||r.rep);
  }catch(e){ return key; }
}
var _ultimo={k:'',t:0};
function avisar(key,v){
  var a=alertaDe(key,v); marcar();
  if(!a) return;
  var k=key+'|'+v+'|'+a.texto;
  if(_ultimo.k===k&&Date.now()-_ultimo.t<4000) return;
  _ultimo={k:k,t:Date.now()};
  toast('⚠ '+rotulo(key)+' · '+v+': '+a.texto,7000);
}
function marcar(){
  try{
    var wrap=document.getElementById('avGridWrap'); if(!wrap) return;
    Array.prototype.forEach.call(wrap.querySelectorAll('.av-cell[data-t][data-v]'),function(inp){
      if(inp.getAttribute('data-b')) return;
      var a=alertaDe(inp.getAttribute('data-t'),inp.getAttribute('data-v'));
      inp.classList.toggle('av-alerta',!!a);
      if(a) inp.title='Conferir: '+a.texto; else if(/^Conferir: /.test(inp.title||'')) inp.title='';
    });
    var ai=document.getElementById('avAutoInput'), st=w._avAutoState&&w._avAutoState();
    var old=document.getElementById('avAutoAlerta'); if(old) old.remove();
    if(ai&&st&&!st.campo){
      var a2=alertaDe(st.row.key,st.v);
      ai.classList.toggle('av-alerta',!!a2);
      if(a2){ var d=document.createElement('div'); d.id='avAutoAlerta'; d.className='av-alerta-msg'; d.textContent='⚠ '+a2.texto; ai.parentNode.insertBefore(d,ai.nextSibling); }
    }
  }catch(e){}
}
function css(){
  if(document.getElementById('campoIntCss')) return;
  var s=document.createElement('style'); s.id='campoIntCss';
  s.textContent='.av-cell.av-alerta,#avAutoInput.av-alerta{border-color:#e0a030!important;box-shadow:0 0 0 2px rgba(224,160,48,.35)}'+
    '.av-alerta-msg{font-size:12px;color:#f0c060;margin:6px 0;line-height:1.35}'+
    '.ci-card{margin:0 0 12px;padding:10px 12px;border-radius:12px;border:1px solid var(--border,#26322b);background:var(--surface-2,#0c1210);font-size:12.5px;line-height:1.45}'+
    '.ci-card .jan-t{margin-bottom:4px}.ci-card p{margin:4px 0}.ci-card .ci-alerta{color:#f0c060}'+
    '.ci-card button{margin-top:6px;min-height:36px;border-radius:9px;border:1px solid var(--gp-line-2,#3c4740);background:var(--gp-s3,#1b211d);color:var(--gp-text,#e9ede9);font:700 12.5px system-ui,sans-serif;padding:0 12px;cursor:pointer}';
  document.head.appendChild(s);
}
function envolve(nome,depois,antes){
  var orig=w[nome]; if(typeof orig!=='function') return;
  w[nome]=function(){
    var ctx=antes?antes.apply(this,arguments):null;
    var r=orig.apply(this,arguments);
    try{ depois.call(this,ctx,arguments); }catch(e){}
    return r;
  };
}
function estadoAuto(){ var a=w._avAutoState&&w._avAutoState(); return a&&!a.campo?{key:a.row.key,v:a.v}:null; }
envolve('renderAvGrid',function(){ css(); marcar(); });
envolve('avValidateCell',function(ctx,args){
  var inp=args[0]; if(!inp) return;
  var k=inp.getAttribute('data-t'), v=inp.getAttribute('data-v');
  if(inp.getAttribute('data-b')) return;
  if(!k||!v){ var a=estadoAuto(); if(!a) return; k=a.key; v=a.v; }
  else{ try{ if(typeof w._avSyncInputs==='function') w._avSyncInputs(); }catch(e){} }  /* a grade na tela é a verdade */
  avisar(k,v);
});
envolve('avAutoStep',function(ctx){ if(ctx) avisar(ctx.key,ctx.v); },estadoAuto);
envolve('avAutoPreset',function(ctx){ if(ctx) avisar(ctx.key,ctx.v); },estadoAuto);

/* ============================================================ 3. agenda */
function cartao(qid,s){
  if(!s||finalizado(s)||lab(qid)) return '';
  var h=hoje(), r=null, b=null;
  try{ r=C.reancorar(s,h); }catch(e){}
  try{ b=C.previsaoBBCH(s,h); }catch(e){}
  if(!r&&!(b&&b.proxima)) return '';
  var out='<div class="ci-card" id="ciAgenda"><div class="jan-t">AGENDA DO CAMPO</div>';
  if(r) out+='<p>'+esc(r.texto)+'</p><button type="button" onclick="campoReancorar(\''+esc(qid)+'\',\''+esc(s.id)+'\')">Ajustar as avaliações previstas</button>';
  if(b&&b.proxima) out+='<p class="'+(b.alerta?'ci-alerta':'')+'">'+(b.alerta?'⚠ ':'🌱 ')+esc(b.texto)+'</p>';
  return out+'</div>';
}
envolve('openStudyDetail',function(ctx,args){
  var qid=args[0], sid=args[1], s=estudo(qid,sid);
  var anc=document.getElementById('study-stage-execucao'); if(!anc) return;
  var velho=document.getElementById('ciAgenda'); if(velho) velho.remove();
  var html=cartao(qid,s); if(!html) return;
  css();
  var d=document.createElement('div'); d.innerHTML=html;
  anc.parentNode.insertBefore(d.firstChild,anc.nextSibling);
});
w.campoReancorar=function(qid,sid){
  var s=estudo(qid,sid); if(!s) return;
  if(typeof w._bloqueadoPorFinalizacao==='function'&&w._bloqueadoPorFinalizacao(qid,sid)) return;
  var r=C.reancorar(s,hoje()); if(!r) return;
  if(!w.confirm(r.texto+'\n\nMover as avaliações previstas vazias?')) return;
  var movidas=[];
  r.itens.forEach(function(it){
    var i=-1; (s.avaliacoes||[]).forEach(function(a,j){ if(a&&a.id===it.id) i=j; });
    if(i<0||!C._vazia(s.avaliacoes[i])) return;
    s.avaliacoes.splice(i,1);
    if(typeof w._markDeleted==='function') w._markDeleted(s,'_deletedAvaliacoes',it.id);
    var jaTem=(s.avaliacoes||[]).some(function(a){ return a&&a.data===it.para; });
    if(!jaTem){
      var nid='auto_'+it.para;
      if(s._deletedAvaliacoes) delete s._deletedAvaliacoes[nid];
      s.avaliacoes.push({id:nid,data:it.para,tipo:'',bbch:'',obs:'',variaveis:[],tipos:{},notas:{},auto:true,_ts:Date.now()});
    }
    movidas.push((w.isoToBR?w.isoToBR(it.de):it.de)+' → '+(w.isoToBR?w.isoToBR(it.para):it.para));
  });
  s.avaliacoes.sort(function(a,b){ return String(a.data||'').localeCompare(String(b.data||'')); });
  s.avalDeslocamento=r.delta;
  try{ w.logStudyAuditInObject(s,'Agenda reancorada na aplicação real',
    '1ª aplicação real em '+r.real+' (prevista '+r.previsto+'): deslocamento de '+r.delta+' dia(s). Avaliações previstas movidas: '+movidas.join('; ')+'.'); }catch(e){}
  s._ts=Date.now();
  try{ w.save(); }catch(e){}
  try{ if(typeof w.cloudSaveSoon==='function') w.cloudSaveSoon(); }catch(e){}
  toast('Agenda ajustada: '+movidas.length+(movidas.length===1?' avaliação movida.':' avaliações movidas.'));
  try{ w.openStudyDetail(qid,sid); }catch(e){}
};
w.CampoInteligente={cicloClima:cicloClima,alertaDe:alertaDe,cartao:cartao};
})(window);
