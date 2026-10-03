/* ============================================================================
   Fotos do estudo — capturar com um toque, ver por parcela, comparar no tempo
   ----------------------------------------------------------------------------
   A galeria antiga abria, a cada "Foto", uma página inteira num diálogo com um
   formulário de identificação (tratamento, repetição, data, avaliação) antes
   da câmera — e mostrava as fotos numa lista corrida. Aqui:
     - o botão da parcela ABRE A CÂMERA; a foto nasce identificada pela parcela
       e pela avaliação abertas, e o botão passa a mostrar quantas ela tem;
     - "fotos da parcela" mostra a mesma parcela ao longo das leituras;
     - o painel do estudo é a matriz parcela × avaliação.
   Fotos em sequência e slides continuam na galeria de sempre
   (galeria-local.html): a tela de "fotos seguidas" e o montador com fotos por
   slide, prévia, seleção e ordem. Este arquivo só abre a galeria no lugar certo.
   O banco é o MESMO da galeria antiga (FotosStore, só neste aparelho): as fotos
   que já existiam aparecem aqui, e o relatório continua levando todas.
   Memória: na tela só miniaturas (480 px), carregadas quando aparecem; o
   original só é lido ao ampliar, e toda URL é liberada ao fechar.
   ============================================================================ */
(function(w){
'use strict';
var d=document;
var FC=w.FotosCore;
var LIMITE_BYTES=30*1024*1024, FOLGA_BYTES=200*1024*1024;
var _cont={chave:null, mapa:{}};       /* contagem por parcela da avaliação aberta */

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function toast(t){ try{ if(typeof w._stxToast==='function') w._stxToast(t); }catch(e){} }
function dono(){ var u=w._authUser; return u&&(u.uid||u.id)?String(u.uid||u.id):''; }
function banco(qid,sid){
  var o=dono(); if(!o||!w.FotosStore||!w.indexedDB) return null;
  try{ return w.FotosStore.create(w.indexedDB, JSON.stringify([o,qid,sid])); }catch(e){ return null; }
}
/* URLs de miniatura: cada janela guarda as SUAS e libera só as suas. O "close"
   do <dialog> chega depois, enfileirado: com uma lista comum, fechar e reabrir
   o painel fazia o fechamento atrasado da janela velha apagar as miniaturas da
   nova — fotos quebradas na tela. */
function url(blob, lista){ var u=URL.createObjectURL(blob); lista.push(u); return u; }
function liberar(lista){ lista.splice(0).forEach(function(u){ try{ URL.revokeObjectURL(u); }catch(e){} }); }
/* A janela velha sai de cena na hora: sem o id, ninguém a acha no lugar da nova
   enquanto o "close" dela não chega. */
function substituir(id){ var old=d.getElementById(id); if(old){ old.id=''; if(old.open&&old.close) old.close(); else old.remove(); } }
function estudo(qid,sid){ var q=(w.data||{})[qid]||{}; return (q.estudos||[]).filter(function(s){ return s&&s.id===sid; })[0]||null; }
function contexto(qid,sid){
  var st=estudo(qid,sid); if(!st) return null;
  var rows=[]; try{ rows=w._avRowsForStudy(st,true)||[]; }catch(e){}
  var trats={}; (st.tratamentos||[]).forEach(function(t){ if(t&&t.id) trats[t.id]=t; });
  var parcelas=rows.map(function(r){ var t=trats[r.tratId]||{}; return {tratamento:r.tratId, rep:r.rep, parcela:String(r.parcela||r.campo||r.label||r.key), produto:t.produto||'', chave:r.key}; });
  var avs=(st.avaliacoes||[]).filter(function(a){ return a&&a.id; }).map(function(a,i){
    var rot=''; try{ rot=w.avRotuloMomento(st,a); }catch(e){}
    return {id:a.id, data:a.data||'', rotulo:rot||FC.br(a.data)||a.id, ordem:i};
  });
  return {qid:qid, sid:sid, st:st, codigo:st.codigo||st.id, parcelas:parcelas, avaliacoes:avs,
    tratamentos:(st.tratamentos||[]).map(function(t){ return {id:t.id, produto:t.produto||'', dose:t.dose||''}; })};
}
function avRotulo(ctx, avId){ var a=(ctx.avaliacoes||[]).filter(function(x){ return String(x.id)===String(avId); })[0]; return a?a.rotulo:''; }

/* ---------- imagem: miniatura sem decodificar a foto inteira na memória ---------- */
function reduzir(blob, max, qualidade){
  function porCanvas(fonte, fw, fh){
    var r=Math.min(1, max/Math.max(fw,fh)), cw=Math.max(1,Math.round(fw*r)), ch=Math.max(1,Math.round(fh*r));
    var c=d.createElement('canvas'); c.width=cw; c.height=ch;
    var g=c.getContext('2d'); g.fillStyle='#fff'; g.fillRect(0,0,cw,ch); g.drawImage(fonte,0,0,cw,ch);
    return new Promise(function(res,rej){ c.toBlob(function(b){ if(b) res({blob:b,largura:cw,altura:ch,origL:fw,origA:fh}); else rej(new Error('Não foi possível preparar a imagem.')); },'image/jpeg',qualidade||0.86); });
  }
  if(typeof w.createImageBitmap==='function'){
    /* decodifica JÁ reduzido (só a largura é dada; a altura segue a proporção):
       uma foto de 12 MP nunca passa inteira pela memória — eram ~48 MB por foto.
       Retrato sai mais alto que "max" e o canvas, já pequeno, acerta o resto. */
    /* orientação pedida por extenso: foto de celular em pé vem deitada no
       arquivo com a marca EXIF de girar, e navegador que não aplica a marca por
       padrão entregava a miniatura de lado */
    return w.createImageBitmap(blob,{imageOrientation:'from-image',resizeWidth:max,resizeQuality:'medium'}).then(function(pq){
      return porCanvas(pq,pq.width,pq.height).then(function(o){ try{ pq.close&&pq.close(); }catch(e){} return o; });
    }).catch(function(){ return viaImagem(); });
  }
  return viaImagem();
  function viaImagem(){
    return new Promise(function(res,rej){
      var u=URL.createObjectURL(blob), im=new Image();
      im.onload=function(){ URL.revokeObjectURL(u); porCanvas(im,im.naturalWidth,im.naturalHeight).then(res,rej); };
      im.onerror=function(){ URL.revokeObjectURL(u); rej(new Error('Imagem não reconhecida. Use JPEG, PNG ou WebP.')); };
      im.src=u;
    });
  }
}
function espacoLivre(){
  try{ if(navigator.storage&&navigator.storage.estimate) return navigator.storage.estimate().then(function(e){ return (e&&e.quota)?(e.quota-(e.usage||0)):Infinity; }).catch(function(){ return Infinity; }); }catch(e){}
  return Promise.resolve(Infinity);
}

/* ---------- salvar: a foto nasce identificada ---------- */
function salvar(files, alvo, extra){
  var db=banco(alvo.qid,alvo.sid);
  if(!db){ alert('Entre no Agracta para salvar fotos neste aparelho.'); return Promise.resolve(0); }
  try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(function(){}); }catch(e){}
  var salvas=0;
  return files.reduce(function(p,file){
    return p.then(function(){
      if(!/^image\/(jpeg|png|webp)$/.test(file.type||'')) throw new Error('Use JPEG, PNG ou WebP.');
      if(file.size>LIMITE_BYTES) throw new Error('Foto com mais de 30 MB.');
      return espacoLivre().then(function(livre){
        if(livre<file.size*1.5+FOLGA_BYTES) throw new Error('Pouco espaço livre no aparelho. Baixe as fotos já salvas e libere espaço.');
        return reduzir(file,480,0.86);
      }).then(function(mini){
        var agora=new Date();
        var row=FC.novaFoto({blob:file, thumb:mini.blob, type:file.type, tratamento:alvo.tratamento, rep:alvo.rep, parcela:alvo.parcela,
          data:alvo.data||agora.toISOString().slice(0,10), hora:String(agora.getHours()).padStart(2,'0')+':'+String(agora.getMinutes()).padStart(2,'0'),
          avaliacao:alvo.avaliacao||'', momento:alvo.momento||'', autor:(typeof w._currentUserName==='function'?w._currentUserName():'')||''});
        if(extra) Object.keys(extra).forEach(function(k){ row[k]=extra[k]; });
        return db.put([row]).then(function(){ salvas++; });
      });
    });
  },Promise.resolve()).then(function(){ return salvas; },function(err){
    alert((salvas?salvas+' foto(s) salvas. ':'')+'Não foi possível salvar: '+(err&&err.name==='QuotaExceededError'?'sem espaço no aparelho.':err.message));
    return salvas;
  });
}
var _entrada=null;
function escolherArquivos(camera, depois){
  if(!_entrada){ _entrada=d.createElement('input'); _entrada.type='file'; _entrada.accept='image/jpeg,image/png,image/webp'; _entrada.style.display='none'; d.body.appendChild(_entrada); }
  if(camera) _entrada.setAttribute('capture','environment'); else _entrada.removeAttribute('capture');
  _entrada.multiple=!camera;
  _entrada.value='';
  _entrada.onchange=function(){ var fs=Array.prototype.slice.call(_entrada.files||[]); _entrada.value=''; if(fs.length) depois(fs); };
  _entrada.click();
}

/* ---------- avaliação aberta: um toque na parcela abre a câmera ---------- */
function alvoDaGrade(key){
  var st=w._avStudy&&w._avStudy(); if(!st) return null;
  var rows=w._avRowsForStudy(st,true), rw=null;
  if(key==null){ var a=w._avAutoState&&w._avAutoState(); rw=a?a.row:null; }
  else rows.forEach(function(r){ if(r.key===key) rw=r; });
  if(!rw) return null;
  var av=w._avEditando&&w._avEditando();
  var rot=''; try{ rot=av?w.avRotuloMomento(st,av):''; }catch(e){}
  return {qid:w.curV, sid:w.curSid, key:rw.key, tratamento:rw.tratId, rep:rw.rep, parcela:String(rw.parcela||rw.campo||rw.label||rw.key),
    avaliacao:av?av.id:'', data:av&&av.data||'', momento:rot};
}
/* ---------- fotos em sequência: a tela de sempre (galeria-local.html) ----------
   Cada foto da câmera fica na parcela da vez e a identificação passa sozinha
   para a próxima, na ordem do campo — é a tela de "fotos seguidas". O painel
   novo tinha deixado ela escondida atrás de "Galeria completa", e sem a
   avaliação: quem fotografava parcela por parcela perdeu o caminho. */
var SEQ_KEY='agracta-fotos-sequencia';
function sequenciaLembrada(){ try{ return w.localStorage.getItem(SEQ_KEY)==='1'; }catch(e){ return false; } }
function abrirGaleria(qid, sid, initial){
  var st=estudo(qid,sid);
  if(!st||typeof w.abrirGaleriaFotosCompleta!=='function'||!w.agConhecimento) return false;
  w.abrirGaleriaFotosCompleta(w.agConhecimento.projetar(qid,st,w.data[qid]), initial||null);
  return true;
}
function podeFotografarNaGrade(){
  var user=w._authUser;
  if(!user||d.documentElement.classList.contains('pre-auth')){ alert('Entre no Agracta para fotografar.'); return false; }
  var st=w._avStudy&&w._avStudy(); if(!st) return false;
  if(w.estudoFinalizado&&w.estudoFinalizado(st)){ alert('Estudo finalizado: não recebe fotos novas.'); return false; }
  return true;
}
function sequenciaDe(alvo){
  return {treatment:alvo.tratamento, rep:alvo.rep, assessment:alvo.avaliacao, date:alvo.data, plot:alvo.parcela, sequence:true};
}
/* Botão "Fotos em sequência" da avaliação: começa na parcela destacada no
   croqui, senão na da vez do modo automático, senão na primeira. */
w.fotosEmSequencia=function(){
  if(!podeFotografarNaGrade()) return;
  try{ w._avPersistNow(); }catch(e){}
  var st=w._avStudy(), rows=w._avRowsForStudy(st,true)||[], key=null;
  if(w._avCroquiKey && rows.some(function(r){ return r.key===w._avCroquiKey; })) key=w._avCroquiKey;
  if(key==null){ var a=w._avAutoState&&w._avAutoState(); if(a&&a.row) key=a.row.key; }
  if(key==null&&rows[0]) key=rows[0].key;
  var alvo=alvoDaGrade(key); if(!alvo) return;
  if(!alvo.avaliacao){ alert('Salve a avaliação antes de fotografar.'); return; }
  abrirGaleria(alvo.qid,alvo.sid,sequenciaDe(alvo));
};
w.avFotografarParcela=function(key){
  if(!podeFotografarNaGrade()) return;
  if(key==null){ var a=w._avAutoState&&w._avAutoState(); var inp=d.getElementById('avAutoInput'); if(a&&inp) w.avAutoWrite(inp.value); }
  try{ w._avPersistNow(); }catch(e){}
  var alvo=alvoDaGrade(key); if(!alvo) return;
  if(!alvo.avaliacao){ alert('Salve a avaliação antes de fotografar.'); return; }
  /* Quem deixou a sequência ligada volta à tela de sempre, já nesta parcela:
     tirar a foto e seguir para a próxima sem voltar à grade. */
  if(sequenciaLembrada() && abrirGaleria(alvo.qid,alvo.sid,sequenciaDe(alvo))) return;
  /* a câmera abre no MESMO toque (o navegador só permite abrir no gesto) */
  escolherArquivos(true,function(fs){
    salvar(fs,alvo).then(function(n){
      if(!n) return;
      _cont.chave=null;
      atualizarContagens().then(function(){
        var tot=_cont.mapa[FC.chaveParcela(alvo.tratamento,alvo.rep)]||n;
        toast('Foto salva · '+alvo.parcela+' ('+tot+' nesta leitura)');
      });
    });
  });
};
/* Contadores nos botões da grade: quantas fotos a parcela tem nesta avaliação. */
function atualizarContagens(){
  var st=w._avStudy&&w._avStudy(), av=w._avEditando&&w._avEditando();
  if(!st||!av) return Promise.resolve();
  var chave=w.curV+'|'+w.curSid+'|'+av.id, db=banco(w.curV,w.curSid);
  if(!db) return Promise.resolve();
  var p=(_cont.chave===chave)?Promise.resolve(_cont.mapa):db.list().then(function(fotos){ _cont={chave:chave, mapa:FC.contagem(fotos,av.id), todas:FC.contagem(fotos,null)}; return _cont.mapa; });
  return p.then(function(mapa){
    var rows=w._avRowsForStudy(st,true), porKey={};
    rows.forEach(function(r){ porKey[r.key]=FC.chaveParcela(r.tratId,r.rep); });
    Array.prototype.forEach.call(d.querySelectorAll('[data-av-fotos]'),function(b){
      var k=porKey[b.getAttribute('data-av-fotos')], n=(mapa||{})[k]||0, t=(_cont.todas||{})[k]||0;
      b.hidden=!(t>0); b.textContent=n?(n+' 📷'):(t+' ant.');
      b.title=n?(n+' foto(s) desta parcela nesta leitura — ver'):(t+' foto(s) desta parcela em outras leituras — ver');
    });
  }).catch(function(){});
}
w.fotosAtualizarContagens=function(){ _cont.chave=null; return atualizarContagens(); };
/* Guarda a foto de uma parcela da grade aberta com dados junto (a medida da
   colônia medida na foto, por exemplo). Sem avaliação salva, não guarda: a
   foto ficaria sem leitura. Devolve quantas guardou. */
w.fotosGuardarDaGrade=function(key, file, extra){
  var alvo=alvoDaGrade(key); if(!alvo||!alvo.avaliacao) return Promise.resolve(0);
  return salvar([file], alvo, extra).then(function(n){ if(n){ _cont.chave=null; atualizarContagens(); } return n; });
};
/* A grade é redesenhada inteira a cada lançamento: os contadores vêm junto. */
(function(){
  var orig=w.renderAvGrid; if(typeof orig!=='function') return;
  w.renderAvGrid=function(){ var r=orig.apply(this,arguments); try{ atualizarContagens(); }catch(e){} return r; };
})();

/* ---------- folha: as fotos de UMA parcela ao longo das leituras ---------- */
function folha(titulo, corpo, urls){
  substituir('fotoFolha');
  var dg=d.createElement('dialog'); dg.id='fotoFolha'; dg.className='fe-folha';
  dg.innerHTML='<div class="fe-head"><strong>'+esc(titulo)+'</strong><button type="button" class="fe-x" aria-label="Fechar">×</button></div><div class="fe-corpo">'+corpo+'</div>';
  d.body.appendChild(dg);
  dg.querySelector('.fe-x').onclick=function(){ dg.close(); };
  dg.addEventListener('close',function(){ liberar(urls); dg.remove(); try{ w.fotosAtualizarContagens(); }catch(e){} },{once:true});
  dg.showModal();
  return dg;
}
function miniatura(f, ctx, urls){
  return '<button type="button" class="fe-mini" data-foto="'+esc(f.id)+'" title="'+esc(FC.legenda(f,ctx))+'"><img loading="lazy" alt="'+esc(FC.legenda(f,ctx))+'" src="'+url(f.thumb||f.blob,urls)+'"></button>';
}
w.fotosDaParcela=function(key, qid, sid, avFoco){
  qid=qid||w.curV; sid=sid||w.curSid;
  var ctx=contexto(qid,sid); if(!ctx) return;
  var p=ctx.parcelas.filter(function(x){ return x.chave===key; })[0]; if(!p) return;
  var db=banco(qid,sid); if(!db){ alert('Entre no Agracta para ver as fotos deste aparelho.'); return; }
  db.list().then(function(fotos){
    var minhas=FC.daParcela(fotos,p.tratamento,p.rep), urls=[];
    var grupos={}, ordem=[];
    minhas.forEach(function(f){ var k=f.assessment||('data:'+(f.date||'')); if(!grupos[k]){ grupos[k]=[]; ordem.push(k); } grupos[k].push(f); });
    var cols=FC.colunas(minhas, ctx.avaliacoes).map(function(c){ return c.id; });
    ordem.sort(function(a,b){ return cols.indexOf(a)-cols.indexOf(b); });
    var h='<div class="fe-parcela-sub">'+esc(p.tratamento+(p.produto?' · '+p.produto:'')+' · R'+p.rep)+'</div>';
    var podeFotografar=!(w.estudoFinalizado&&w.estudoFinalizado(ctx.st));
    if(podeFotografar) h+='<div class="fe-acoes"><button type="button" data-fe="camera">📷 Tirar foto</button><button type="button" data-fe="arquivos">🖼 Da galeria do aparelho</button></div>';
    if(!minhas.length) h+='<p class="fe-vazio">Nenhuma foto desta parcela neste aparelho.</p>';
    ordem.forEach(function(k){
      var rot=k.indexOf('data:')===0?((FC.br(k.slice(5))||'Sem data')+' · sem avaliação'):(avRotulo(ctx,k)||k);
      h+='<section class="fe-leitura'+(avFoco&&k===avFoco?' fe-foco':'')+'"><h4>'+esc(rot)+' <small>'+grupos[k].length+'</small></h4><div class="fe-tira">'+grupos[k].map(function(f){ return miniatura(f,ctx,urls); }).join('')+'</div></section>';
    });
    var dg=folha('Fotos da parcela '+p.parcela, h, urls);
    function reabrir(av){ dg.close(); w.fotosDaParcela(key,qid,sid,av||avFoco); }
    var foco=dg.querySelector('.fe-foco'); if(foco&&foco.scrollIntoView) foco.scrollIntoView({block:'nearest'});
    dg.addEventListener('click',function(ev){
      var b=ev.target.closest('[data-fe],[data-foto]'); if(!b) return;
      if(b.dataset.foto){ ampliar(minhas, b.dataset.foto, ctx, db, function(){ reabrir(); }); return; }
      var avAberta=w._avEditando&&w._avEditando();
      var alvo={qid:qid, sid:sid, tratamento:p.tratamento, rep:p.rep, parcela:p.parcela,
        avaliacao:(avFoco&&avFoco.indexOf('data:')!==0)?avFoco:(avAberta?avAberta.id:''), data:'', momento:''};
      var av=(ctx.st.avaliacoes||[]).filter(function(a){ return a.id===alvo.avaliacao; })[0];
      if(av){ alvo.data=av.data||''; alvo.momento=avRotulo(ctx,av.id); }
      escolherArquivos(b.dataset.fe==='camera',function(fs){ salvar(fs,alvo).then(function(n){ if(n) reabrir(alvo.avaliacao); }); });
    });
  });
};

/* ---------- ampliar: o original só é lido aqui, e liberado ao fechar ---------- */
function ampliar(lista, id, ctx, db, aoExcluir){
  var i=lista.findIndex(function(f){ return f.id===id; }); if(i<0) return;
  /* <dialog> modal, e não um div fixo: a folha e o painel são diálogos modais, e
     modal fica numa camada acima de qualquer z-index — um div abria POR BAIXO */
  var ov=d.createElement('dialog'); ov.className='fe-amplia';
  var atual=null;
  function mostrar(){
    if(atual){ try{ URL.revokeObjectURL(atual); }catch(e){} }
    var f=lista[i]; atual=URL.createObjectURL(f.blob||f.thumb);
    ov.innerHTML='<img alt="'+esc(FC.legenda(f,ctx))+'" src="'+atual+'"><div class="fe-amplia-leg">'+esc(FC.legenda(f,ctx))+'</div>'+
      '<div class="fe-amplia-bar"><button type="button" data-a="ant"'+(i>0?'':' disabled')+'>‹</button><button type="button" data-a="baixar">Baixar original</button>'+
      '<button type="button" data-a="apagar">Excluir</button><button type="button" data-a="fechar">Fechar</button><button type="button" data-a="prox"'+(i<lista.length-1?'':' disabled')+'>›</button></div>';
  }
  function fechar(){ if(atual){ try{ URL.revokeObjectURL(atual); }catch(e){} atual=null; } if(ov.open) ov.close(); ov.remove(); }
  ov.addEventListener('cancel',function(ev){ ev.preventDefault(); fechar(); });
  ov.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-a]'); if(!b) return;
    var f=lista[i], a=b.dataset.a;
    if(a==='fechar') fechar();
    else if(a==='ant'&&i>0){ i--; mostrar(); }
    else if(a==='prox'&&i<lista.length-1){ i++; mostrar(); }
    else if(a==='baixar'){ var u=URL.createObjectURL(f.blob||f.thumb), el=d.createElement('a'); el.href=u; el.download=FC.nomeArquivo(f,i); d.body.appendChild(el); el.click(); el.remove(); setTimeout(function(){ URL.revokeObjectURL(u); },60000); }
    else if(a==='apagar'){
      if(!confirm('Excluir esta foto deste aparelho? Baixe uma cópia antes, se precisar dela.')) return;
      db.remove(f.id).then(function(){
        fechar(); _cont.chave=null;
        /* quem abriu a foto se redesenha sem ela; o painel embaixo também */
        if(aoExcluir) aoExcluir();
        var pan=d.getElementById('fotoPainel'); if(pan&&pan.open&&typeof pan._recarregar==='function') pan._recarregar();
        toast('Foto excluída deste aparelho.');
      });
    }
  });
  d.body.appendChild(ov); mostrar(); ov.showModal();
}

/* ---------- painel do estudo: matriz parcela × avaliação ---------- */
w.abrirPainelFotos=function(qid, sid){
  var ctx=contexto(qid,sid); if(!ctx){ alert('Estudo não encontrado.'); return; }
  var db=banco(qid,sid); if(!db){ alert('Entre no Agracta para ver as fotos deste aparelho.'); return; }
  substituir('fotoPainel');
  var dg=d.createElement('dialog'); dg.id='fotoPainel'; dg.className='fe-painel';
  d.body.appendChild(dg);
  var urls=[];
  function desenhar(fotos){
    liberar(urls);
    var M=FC.matriz(fotos, ctx.parcelas, ctx.avaliacoes);
    var comFoto=M.linhas.filter(function(l){ return l.celulas.some(function(c){ return c.fotos.length; }); }).length;
    var h='<div class="fe-head"><strong>Fotos · '+esc(ctx.codigo)+'</strong><button type="button" class="fe-x" aria-label="Fechar">×</button></div>';
    h+='<div class="fe-resumo">'+M.total+' foto(s) neste aparelho · '+comFoto+' de '+M.linhas.length+' parcelas · '+M.colunasComFoto+' leitura(s) com foto</div>';
    /* Slides e sequência são os da galeria de sempre: fotos por slide (1 a 8),
       prévia, seleção e ordem. O PPTX próprio deste painel saía com 4 fotos
       fixas por slide e a legenda inteira numa linha só — "saiu tudo errado". */
    var podeFotografar=!(w.estudoFinalizado&&w.estudoFinalizado(ctx.st));
    h+='<div class="fe-acoes">'+(podeFotografar&&ctx.parcelas.length>1?'<button type="button" data-p="sequencia">📷 Fotos em sequência</button>':'')+
      '<button type="button" data-p="slides">🖼 Slides e originais</button></div>';
    if(!M.total) h+='<p class="fe-vazio">Nenhuma foto ainda. Na avaliação, o botão <b>Foto</b> de cada parcela abre a câmera — a foto já sai identificada. Para fotografar uma parcela atrás da outra, use <b>Fotos em sequência</b>.</p>';
    else{
      h+='<div class="fe-matriz-wrap"><table class="fe-matriz"><thead><tr><th>Parcela</th>'+M.colunas.map(function(c){ return '<th>'+esc(c.rotulo)+'</th>'; }).join('')+'</tr></thead><tbody>';
      M.linhas.forEach(function(l){
        h+='<tr><th scope="row"><b>'+esc(l.parcela)+'</b><small>'+esc(l.tratamento+' · R'+l.rep+(l.orfa?' · fora do cadastro':''))+'</small></th>';
        l.celulas.forEach(function(c){
          if(!c.fotos.length){ h+='<td class="fe-cel-vazia">—</td>'; return; }
          var mais=c.fotos.length>1?'<span class="fe-mais">+'+(c.fotos.length-1)+'</span>':'';
          h+='<td><button type="button" class="fe-cel" data-parcela="'+esc(l.chave)+'" data-col="'+esc(c.coluna)+'"><img loading="lazy" alt="'+esc(FC.legenda(c.fotos[0],ctx))+'" src="'+url(c.fotos[0].thumb||c.fotos[0].blob,urls)+'">'+mais+'</button></td>';
        });
        h+='</tr>';
      });
      h+='</tbody></table></div><p class="fe-nota">Toque numa foto para ver a parcela ao longo das leituras. As fotos ficam só neste aparelho; baixe os originais para guardar.</p>';
    }
    dg.innerHTML=h;
    dg.querySelector('.fe-x').onclick=function(){ dg.close(); };
    dg._fotos=fotos;
  }
  dg._recarregar=function(){ db.list().then(desenhar); };
  dg.addEventListener('click',function(ev){
    var b=ev.target.closest('[data-p],.fe-cel'); if(!b) return;
    if(b.classList.contains('fe-cel')){
      var l=ctx.parcelas.filter(function(p){ return p.chave===b.dataset.parcela; })[0];
      if(l){ w.fotosDaParcela(l.chave,qid,sid,b.dataset.col); return; }
      var f=(dg._fotos||[]).filter(function(x){ return FC.chaveParcela(x.treatment,x.rep)===b.dataset.parcela; });
      if(f.length) ampliar(f,f[0].id,ctx,db,null);
      return;
    }
    /* o painel fica embaixo e se redesenha quando a galeria fecha */
    if(b.dataset.p==='sequencia') abrirGaleria(qid,sid,sequenciaDoPainel(ctx));
    else if(b.dataset.p==='slides') abrirGaleria(qid,sid,{slides:true});
  });
  dg.addEventListener('close',function(){ liberar(urls); dg.remove(); },{once:true});
  dg.showModal();
  dg.innerHTML='<div class="fe-head"><strong>Fotos · '+esc(ctx.codigo)+'</strong></div><p class="fe-vazio">Lendo as fotos deste aparelho…</p>';
  dg._recarregar();
};
/* Do painel não há avaliação aberta: a sequência vai para a leitura de HOJE,
   se o estudo tem uma; senão, data livre de hoje, como a galeria sempre fez.
   Começa na primeira parcela, na ordem do campo. */
function sequenciaDoPainel(ctx){
  var hoje='';
  try{ hoje=(typeof w.todayISO==='function'&&w.todayISO())||''; }catch(e){}
  var av=(ctx.st.avaliacoes||[]).filter(function(a){ return a&&a.id&&hoje&&a.data===hoje; }).pop();
  var p=ctx.parcelas[0]||{};
  return {treatment:p.tratamento, rep:p.rep, plot:p.parcela, assessment:av?av.id:'', date:av?av.data:hoje, sequence:true};
}

/* A página do estudo chama abrirGaleriaFotos: abre este painel. A galeria de
   sempre (sequência, slides e originais) abre pelos botões dele, pelo "Fotos em
   sequência" da avaliação e pelo botão Foto de quem deixou a sequência ligada. */
if(typeof w.abrirGaleriaFotos==='function' && !w.abrirGaleriaFotosCompleta) w.abrirGaleriaFotosCompleta=w.abrirGaleriaFotos;
w.abrirGaleriaFotos=function(s, initial){
  if(!s) return;
  if(initial && initial.treatment!=null){
    var ctx=contexto(s.qid,s.sid); var p=ctx&&ctx.parcelas.filter(function(x){ return String(x.tratamento)===String(initial.treatment)&&Number(x.rep)===Number(initial.rep); })[0];
    if(p){ w.fotosDaParcela(p.chave,s.qid,s.sid,initial.assessment||null); return; }
  }
  w.abrirPainelFotos(s.qid,s.sid);
};
/* "N 📷" ao lado do botão Foto: abre as fotos da parcela. "Fotos em sequência"
   da avaliação: a galeria de sempre, com a sequência ligada. Captura, não
   bolha: o painel da avaliação (#eePnl) para a propagação do clique. */
d.addEventListener('click',function(ev){
  var seq=ev.target.closest&&ev.target.closest('[data-av-photo-seq]');
  if(seq){ ev.preventDefault(); ev.stopPropagation(); w.fotosEmSequencia(); return; }
  var b=ev.target.closest&&ev.target.closest('[data-av-fotos]'); if(!b) return;
  ev.preventDefault(); ev.stopPropagation();
  var av=w._avEditando&&w._avEditando();
  w.fotosDaParcela(b.getAttribute('data-av-fotos'), w.curV, w.curSid, av?av.id:null);
},true);
})(window);
