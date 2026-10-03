/* ============================================================================
   Medir a colônia pela foto — no editor do diâmetro em cruz da placa
   ----------------------------------------------------------------------------
   "📷 Medir por foto" abre a câmera. A foto é medida pelo ColoniaCore, com o Ø
   interno da placa do protocolo como régua, e a tela mostra O QUE foi medido —
   o círculo da placa, o contorno da colônia e a cruz — para quem está com a
   placa na mão conferir antes de usar. Nada entra na grade sem esse "Usar".
   "Usar e fotografar a próxima" grava os dois eixos, guarda a foto na parcela
   com a medida junto (a evidência) e já abre a câmera para a placa seguinte:
   um toque por placa, além do disparo da câmera.
   Se a medida automática não servir: ajustar a borda (3 toques) ou medir a
   cruz à mão na própria foto (4 toques), sempre na escala da placa.
   ============================================================================ */
(function(w){
'use strict';
var d=document, LADO=900;
var st=null;   /* {key, v, placaMm, file, W, H, base, med, modo, toques, E} */

function CC(){ return w.ColoniaCore; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function mm(x){ return (x==null||!isFinite(x))?'—':(Math.round(x*10)/10).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function um(x){ return Math.round(x*10)/10; }
function toast(t){ try{ if(typeof w._stxToast==='function') w._stxToast(t); }catch(e){} }

/* a parcela da vez e a seguinte, na ordem do modo automático */
function linhas(){ try{ return (typeof w._avAutoRows==='function')?w._avAutoRows():w._avRowsForStudy(w._avStudy(),true); }catch(e){ return []; } }
function rotulo(key){
  var r=linhas().filter(function(x){ return x.key===key; })[0];
  return r?String(r.parcela||r.campo||r.label||key)+(r.tratId?' ('+r.tratId+' · R'+r.rep+')':''):key;
}
function proxima(key){ var ls=linhas(); for(var i=0;i<ls.length-1;i++) if(ls[i].key===key) return ls[i+1]; return null; }

/* ---------- câmera ---------- */
var _entrada=null;
function camera(depois){
  if(!_entrada){ _entrada=d.createElement('input'); _entrada.type='file'; _entrada.accept='image/jpeg,image/png,image/webp'; _entrada.style.display='none'; d.body.appendChild(_entrada); }
  _entrada.setAttribute('capture','environment'); _entrada.value='';
  _entrada.onchange=function(){ var f=_entrada.files&&_entrada.files[0]; _entrada.value=''; if(f) depois(f); };
  _entrada.click();
}
/* a foto reduzida a ~900 px — sobra resolução para 0,1 mm e não pesa na memória */
function carregar(file){
  function viaImagem(){
    return new Promise(function(res,rej){
      var u=URL.createObjectURL(file), im=new Image();
      im.onload=function(){ URL.revokeObjectURL(u); res(im); };
      im.onerror=function(){ URL.revokeObjectURL(u); rej(new Error('Imagem não reconhecida.')); };
      im.src=u;
    });
  }
  var dec=(typeof w.createImageBitmap==='function')?w.createImageBitmap(file,{resizeWidth:LADO,resizeQuality:'high'}).catch(viaImagem):viaImagem();
  return dec.then(function(img){
    var W0=img.naturalWidth||img.width, H0=img.naturalHeight||img.height, k=Math.min(1,LADO/Math.max(W0,H0));
    var c=d.createElement('canvas'); c.width=Math.max(1,Math.round(W0*k)); c.height=Math.max(1,Math.round(H0*k));
    var g=c.getContext('2d'); g.drawImage(img,0,0,c.width,c.height);
    try{ if(img.close) img.close(); }catch(e){}
    return g.getImageData(0,0,c.width,c.height);
  });
}

/* ---------- o que foi medido, desenhado sobre a foto ---------- */
function desenhar(cv){
  var g=cv.getContext('2d'); g.putImageData(st.base,0,0);
  var med=st.med, E=(med&&med.placa&&med.placa.a)?med.placa:st.E, lw=Math.max(2,Math.round(st.W/300));
  if(med && med.colonia && med.colonia.mascara){
    /* contorno da colônia em verde: pixel da mancha com vizinho de fora */
    var M=med.colonia.mascara, W=st.W, H=st.H, ov=g.createImageData(W,H), o=ov.data;
    for(var y=1;y<H-1;y++) for(var x=1;x<W-1;x++){ var i=y*W+x; if(M[i] && (!M[i-1]||!M[i+1]||!M[i-W]||!M[i+W])){
      for(var dy=0;dy<lw;dy++) for(var dx=0;dx<lw;dx++){ var j=4*((Math.min(H-1,y+dy))*W+Math.min(W-1,x+dx)); o[j]=40; o[j+1]=230; o[j+2]=110; o[j+3]=255; } } }
    var off=d.createElement('canvas'); off.width=W; off.height=H; off.getContext('2d').putImageData(ov,0,0); g.drawImage(off,0,0);
  }
  if(E){ g.lineWidth=lw; g.strokeStyle='#2f85ff'; g.beginPath(); g.ellipse(E.cx,E.cy,E.a,E.b,E.angulo||0,0,2*Math.PI); g.stroke(); }
  if(med && med.colonia && med.colonia.eixos){
    med.colonia.eixos.forEach(function(e,k){
      g.strokeStyle=k?'#ff9f1a':'#ff4d4d'; g.lineWidth=lw; g.beginPath(); g.moveTo(e[0][0],e[0][1]); g.lineTo(e[1][0],e[1][1]); g.stroke();
      g.fillStyle=g.strokeStyle; g.font='bold '+(lw*9)+'px system-ui,sans-serif'; g.fillText(String(k+1),e[1][0]+lw*2,e[1][1]-lw*2);
    });
  }
  (st.toques||[]).forEach(function(p){ g.fillStyle='#ffe600'; g.beginPath(); g.arc(p[0],p[1],lw*3,0,2*Math.PI); g.fill(); });
}

/* ---------- a janela ---------- */
function janela(){
  var dg=d.getElementById('coloniaDlg');
  if(dg && dg.open) return dg;
  /* janela fechando (o "close" chega depois): sai de cena já, sem o id */
  if(dg){ dg.id=''; }
  var dono=st;
  dg=d.createElement('dialog'); dg.id='coloniaDlg'; dg.className='fe-folha cm-dlg';
  dg.innerHTML='<div class="fe-head"><strong class="cm-tit"></strong><button type="button" class="fe-x" aria-label="Fechar">×</button></div>'+
    '<div class="fe-corpo"><div class="cm-palco"><canvas class="cm-cv"></canvas></div><div class="cm-info"></div><div class="fe-acoes cm-acoes"></div></div>';
  d.body.appendChild(dg);
  dg.querySelector('.fe-x').onclick=function(){ dg.close(); };
  dg.addEventListener('close',function(){ if(st===dono) st=null; dg.remove(); });
  dg.addEventListener('click',function(ev){ var b=ev.target.closest('[data-cm]'); if(b) acao(b.getAttribute('data-cm')); });
  dg.querySelector('.cm-cv').addEventListener('pointerdown',toque);
  dg.showModal();
  return dg;
}
function pintar(){
  var dg=janela(), med=st.med, info='', bt='';
  dg.querySelector('.cm-tit').textContent='Medir colônia · '+rotulo(st.key);
  var cv=dg.querySelector('.cm-cv');
  if(st.base){ cv.width=st.W; cv.height=st.H; desenhar(cv); }
  if(st.modo==='lendo'){ info='<p class="cm-dica">Medindo a foto…</p>'; }
  else if(st.modo==='borda'){
    info='<p class="cm-dica"><b>Toque 3 pontos na borda INTERNA da placa</b>, afastados entre si ('+st.toques.length+' de 3).</p>';
    bt='<button type="button" data-cm="voltar">Voltar</button>';
  }else if(st.modo==='mao'){
    info='<p class="cm-dica"><b>Toque as 2 pontas do eixo 1 e depois as 2 do eixo 2</b>, perpendicular ('+st.toques.length+' de 4).</p>';
    bt='<button type="button" data-cm="voltar">Voltar</button>';
  }else if(med && med.ok){
    var c=med.colonia, prox=proxima(st.key);
    info='<div class="cm-res"><span>Eixo 1</span><b>'+mm(c.d1Mm)+' mm</b><span>Eixo 2 ⟂</span><b>'+mm(c.d2Mm)+' mm</b><span>Média</span><b>'+mm((um(c.d1Mm)+um(c.d2Mm))/2)+' mm</b></div>'+
      (med.avisos&&med.avisos.length?'<ul class="cm-avisos">'+med.avisos.map(function(a){ return '<li>'+esc(a)+'</li>'; }).join('')+'</ul>':'')+
      '<p class="cm-dica">Confira na foto: <b style="color:#2f85ff">azul</b> na borda interna da placa ('+mm(st.placaMm)+' mm), <b style="color:#1faa55">verde</b> no contorno da colônia.'+
      (med.metodo==='manual'?' Cruz medida à mão.':'')+'</p>';
    bt='<button type="button" data-cm="usar">Usar '+mm(c.d1Mm)+' × '+mm(c.d2Mm)+' mm</button>'+
       (prox?'<button type="button" data-cm="proxima">Usar e fotografar a próxima ('+esc(String(prox.parcela||prox.campo||prox.label||prox.key))+')</button>':'')+
       (c.chegouABorda?'<button type="button" data-cm="tomou">Tomou a placa ('+mm(st.placaMm)+' mm)</button>':'')+
       '<button type="button" data-cm="borda">Ajustar a borda</button><button type="button" data-cm="mao">Medir à mão</button><button type="button" data-cm="outra">Outra foto</button>';
  }else{
    info='<p class="cm-erro">'+esc(med&&med.motivo||'Não foi possível medir esta foto.')+'</p><p class="cm-dica">Fotografe de cima, sem a tampa, com a placa inteira no quadro e sem reflexo sobre a colônia.</p>';
    bt=(med&&med.sugestao==='tomou'?'<button type="button" data-cm="tomou">Tomou a placa ('+mm(st.placaMm)+' mm)</button>':'')+
       '<button type="button" data-cm="outra">Outra foto</button><button type="button" data-cm="borda">Marcar a borda</button>'+
       ((med&&med.placa)?'<button type="button" data-cm="mao">Medir à mão</button>':'');
  }
  dg.querySelector('.cm-info').innerHTML=info;
  dg.querySelector('.cm-acoes').innerHTML=bt;
}
function toque(ev){
  if(!st||(st.modo!=='borda'&&st.modo!=='mao')) return;
  var cv=ev.currentTarget, r=cv.getBoundingClientRect(); if(!(r.width>0)) return;
  st.toques.push([(ev.clientX-r.left)*cv.width/r.width, (ev.clientY-r.top)*cv.height/r.height]);
  var K=CC();
  if(st.modo==='borda' && st.toques.length===3){
    var E=K.placaPor3(st.toques[0],st.toques[1],st.toques[2]); st.toques=[];
    if(!E){ st.modo='resultado'; st.med={ok:false, motivo:'Os três pontos estão alinhados: toque em lugares afastados da borda.'}; pintar(); return; }
    st.E=E; st.med=K.medirComPlaca(st.base.data,st.W,st.H,st.placaMm,E,{avisos:['Borda da placa marcada à mão.']});
    if(st.med) st.med.metodo='borda-manual';
    st.modo='resultado';
  }else if(st.modo==='mao' && st.toques.length===4){
    var E2=(st.med&&st.med.placa&&st.med.placa.a)?st.med.placa:st.E, t=st.toques, m=K.medirPontos(E2,st.placaMm,t);
    st.toques=[];
    st.med={ok:true, metodo:'manual', placa:E2, mmPorPx:m.mmPorPx, avisos:['Cruz medida à mão na foto, na escala da placa.'],
      colonia:{d1Mm:m.d1Mm, d2Mm:m.d2Mm, mediaMm:m.mediaMm, eixos:[[t[0],t[1]],[t[2],t[3]]]}};
    st.modo='resultado';
  }
  pintar();
}
function medir(){
  st.modo='lendo'; pintar();
  /* deixa a tela dizer "medindo" antes da conta */
  setTimeout(function(){
    if(!st) return;
    try{ st.med=CC().medir(st.base.data,st.W,st.H,st.placaMm); if(st.med&&st.med.ok) st.med.metodo='auto'; if(st.med&&st.med.placa) st.E=st.med.placa; }
    catch(e){ st.med={ok:false, motivo:'Falha ao medir: '+(e&&e.message||e)}; }
    st.modo='resultado'; pintar();
  },30);
}
function abrir(key, v, placaMm){
  camera(function(file){
    st={key:key, v:v, placaMm:placaMm, file:file, modo:'lendo', toques:[], med:null, E:null};
    pintar();
    carregar(file).then(function(img){
      if(!st) return;
      st.base=img; st.W=img.width; st.H=img.height; medir();
    }).catch(function(e){ if(!st) return; st.med={ok:false, motivo:e&&e.message||'Imagem não reconhecida.'}; st.modo='resultado'; pintar(); });
  });
}

/* ---------- gravar ---------- */
function gravar(d1, d2, metodo){
  var key=st.key, v=st.v, med=st.med||{}, E=(med.placa&&med.placa.a)?med.placa:st.E;
  w._avWriteBruto(key,v,'s0',String(um(d1)));
  w._avWriteBruto(key,v,'s1',String(um(d2)));
  try{ w._avPersistNow(); }catch(e){}
  try{ if(w._avSubCtx && w._avSubCtx.key===key && typeof w._avSubRender==='function') w._avSubRender(); }catch(e){}
  try{ if(typeof w._avRefreshDer==='function') w._avRefreshDer(); }catch(e){}
  /* a foto fica na parcela, com a medida junto: a evidência de onde o número saiu */
  var W=st.W, H=st.H, rel=function(p){ return [p[0]/W, p[1]/H]; };
  var medicao={variavel:v, d1Mm:um(d1), d2Mm:um(d2), metodo:metodo, placaMm:st.placaMm, versao:(CC()||{}).VERSAO||'',
    larguraMedida:W, alturaMedida:H, mmPorPx:med.mmPorPx||null,
    placa:E?{cx:E.cx/W, cy:E.cy/H, a:E.a/W, b:E.b/W, angulo:E.angulo||0}:null,
    eixos:(med.colonia&&med.colonia.eixos&&metodo!=='tomou')?med.colonia.eixos.map(function(e){ return [rel(e[0]),rel(e[1])]; }):null,
    avisos:(med.avisos||[]).slice(0,6)};
  if(typeof w.fotosGuardarDaGrade==='function'){
    w.fotosGuardarDaGrade(key, st.file, {medicao:medicao}).then(function(n){ if(!n) toast('Medida gravada. Salve a avaliação para guardar também a foto.'); }).catch(function(){});
  }
  toast('Colônia '+rotulo(key)+': '+mm(d1)+' × '+mm(d2)+' mm');
}
function acao(a){
  if(!st) return;
  var dg=d.getElementById('coloniaDlg'), med=st.med;
  if(a==='usar'||a==='proxima'){
    if(!med||!med.ok) return;
    var key=st.key, v=st.v, placaMm=st.placaMm, prox=(a==='proxima')?proxima(key):null;
    gravar(med.colonia.d1Mm, med.colonia.d2Mm, med.metodo||'auto');
    if(dg) dg.close();
    /* a câmera da próxima abre no MESMO toque (o navegador só abre no gesto) */
    if(prox){ try{ if(typeof w.avOpenSub==='function') w.avOpenSub(prox.key, v); }catch(e){} abrir(prox.key, v, placaMm); }
  }else if(a==='tomou'){
    gravar(st.placaMm, st.placaMm, 'tomou'); if(dg) dg.close();
  }else if(a==='borda'){ st.modo='borda'; st.toques=[]; pintar(); }
  else if(a==='mao'){ st.modo='mao'; st.toques=[]; pintar(); }
  else if(a==='voltar'){ st.modo='resultado'; st.toques=[]; pintar(); }
  else if(a==='outra'){ var k=st.key, vv=st.v, pm=st.placaMm; if(dg) dg.close(); abrir(k, vv, pm); }
}

/* O botão do editor de sub-amostras da placa. */
w.avSubMedirFoto=function(){
  var ctx=w._avSubCtx; if(!ctx||!CC()) return;
  var P=(typeof w._avBioPlaca==='function')?w._avBioPlaca(ctx.v):null;
  if(!P||!(P.placaMm>0)){ alert('Informe o diâmetro interno da placa no protocolo do estudo: é ele que dá a escala da foto.'); return; }
  abrir(ctx.key, ctx.v, P.placaMm);
};
})(window);
