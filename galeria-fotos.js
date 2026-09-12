/* Ponte de mão única: somente identificação projetada entra na galeria.
   A página isolada nunca devolve fotos ao aplicativo ou à sincronização. */
(function(w){
'use strict';
w.abrirGaleriaFotos=function(s,initial){
 const user=w._authUser,owner=user&&(user.uid||user.id);
 if(!owner||document.documentElement.classList.contains('pre-auth')){alert('Entre no Agracta para abrir sua galeria local.');return;}
 const study=((w.data[s.qid]||{}).estudos||[]).find(x=>x.id===s.sid);
 if(!study||!s.tratamentos.length){alert('Cadastre os tratamentos antes de adicionar fotos.');return;}
 const prior=document.getElementById('galeriaFotosDialog');if(prior)prior.close();
 const dialog=document.createElement('dialog');dialog.id='galeriaFotosDialog';dialog.className='ep-photo-dialog';
 const heading=document.createElement('div');heading.className='ep-photo-dialog-head';
 const title=document.createElement('strong');title.textContent='Fotos locais · '+s.codigo;heading.appendChild(title);
 const close=document.createElement('button');close.type='button';close.className='con-btn';close.textContent='Fechar';heading.appendChild(close);
 const frame=document.createElement('iframe');frame.title='Galeria de fotos local do estudo';
 frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-modals');
 frame.referrerPolicy='no-referrer';
 frame.src='galeria-local.html?v=2';
 const context={owner:String(owner),qid:s.qid,sid:s.sid,codigo:s.codigo,cultura:s.cultura,alvo:s.alvo,local:s.local,reps:study.numRepeticoes,
   tratamentos:s.tratamentos.map(t=>({id:t.id,produto:t.produto,dose:t.dose})),avaliacoes:(study.avaliacoes||[]).map(a=>({id:a.id,data:a.data}))};
 if(initial)context.initial={treatment:initial.treatment,rep:initial.rep,assessment:initial.assessment,date:initial.date,plot:initial.plot};
 const focus=document.activeElement;
 frame.addEventListener('load',()=>{if(dialog.open)frame.contentWindow.postMessage({type:'agracta:fotos-local-context',context},location.origin);},{once:true});
 dialog.append(heading,frame);document.body.appendChild(dialog);dialog.showModal();close.focus();
 const guard=setInterval(()=>{const u=w._authUser;if(!u||String(u.uid||u.id)!==String(owner)||document.documentElement.classList.contains('pre-auth'))dialog.close();},300);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{clearInterval(guard);frame.remove();dialog.remove();if(focus&&focus.isConnected)focus.focus();},{once:true});
};
/* Mantém a posição da avaliação: fotografar não avança para outra parcela. */
w.avFotografarParcela=function(key){
 const user=w._authUser;
 if(!user||document.documentElement.classList.contains('pre-auth'))return;
 const study=w._avStudy();if(!study||w.estudoFinalizado(study))return;
 const auto=key==null?w._avAutoState():null;
 const row=auto?auto.row:w._avRowsForStudy(study,true).find(r=>r.key===key);
 if(!row)return;
 if(auto){const input=document.getElementById('avAutoInput');if(input)w.avAutoWrite(input.value);}
 w._avPersistNow();
 const av=w._avEditando();if(!av){alert('Não foi possível identificar a avaliação. Salve a avaliação antes de fotografar.');return;}
 const qid=w.curV,s=w.agConhecimento.projetar(qid,study,w.data[qid]);
 w.abrirGaleriaFotos(s,{treatment:row.tratId,rep:row.rep,assessment:av.id,date:av.data,plot:String(row.parcela||row.campo||row.key)});
};
document.addEventListener('click',function(ev){
 const b=ev.target.closest&&ev.target.closest('[data-av-photo],[data-av-photo-auto]');
 if(!b)return;
 w.avFotografarParcela(b.hasAttribute('data-av-photo-auto')?null:b.dataset.avPhoto);
});
})(window);
