/* Ponte de mão única: somente identificação projetada entra na galeria.
   A página isolada nunca devolve fotos ao aplicativo ou à sincronização. */
(function(w){
'use strict';
w.abrirGaleriaFotos=function(s){
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
 frame.src='galeria-local.html?v=1';
 const context={owner:String(owner),qid:s.qid,sid:s.sid,codigo:s.codigo,cultura:s.cultura,alvo:s.alvo,local:s.local,reps:study.numRepeticoes,
   tratamentos:s.tratamentos.map(t=>({id:t.id,produto:t.produto,dose:t.dose})),avaliacoes:(study.avaliacoes||[]).map(a=>({id:a.id,data:a.data}))};
 const focus=document.activeElement;
 frame.addEventListener('load',()=>{if(dialog.open)frame.contentWindow.postMessage({type:'agracta:fotos-local-context',context},location.origin);},{once:true});
 dialog.append(heading,frame);document.body.appendChild(dialog);dialog.showModal();close.focus();
 const guard=setInterval(()=>{const u=w._authUser;if(!u||String(u.uid||u.id)!==String(owner)||document.documentElement.classList.contains('pre-auth'))dialog.close();},300);
 close.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',()=>{clearInterval(guard);frame.remove();dialog.remove();if(focus&&focus.isConnected)focus.focus();},{once:true});
};
})(window);
