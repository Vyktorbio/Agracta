/* Ponte de mão única para o relatório local. Nunca recebe imagens do iframe. */
(function(w){
'use strict';
w.abrirRelatorioEstudo=function(context){
 const u=w._authUser,owner=u&&(u.uid||u.id);if(!owner||document.documentElement.classList.contains('pre-auth')){alert('Entre no Agracta para gerar o relatório.');return;}
 const old=document.getElementById('relatorioEstudoDialog');if(old)old.close();
 const dialog=document.createElement('dialog');dialog.id='relatorioEstudoDialog';dialog.className='ep-photo-dialog';
 const head=document.createElement('div');head.className='ep-photo-dialog-head';const title=document.createElement('strong');title.textContent='Relatório · '+context.projection.codigo;const close=document.createElement('button');close.className='con-btn';close.textContent='Fechar';head.append(title,close);
 const frame=document.createElement('iframe');frame.title='Relatório completo e exportação para R';frame.src='relatorio-local.html?v=1';frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-downloads allow-modals');
 const focus=document.activeElement;frame.addEventListener('load',()=>{if(dialog.open)frame.contentWindow.postMessage({type:'agracta:report-context',context:{...context,owner:String(owner)}},location.origin);},{once:true});dialog.append(head,frame);document.body.appendChild(dialog);dialog.showModal();close.focus();close.onclick=()=>dialog.close();
 const guard=setInterval(()=>{const u=w._authUser;if(!u||String(u.uid||u.id)!==String(owner)||document.documentElement.classList.contains('pre-auth'))dialog.close();},300);
 dialog.addEventListener('close',()=>{clearInterval(guard);frame.remove();dialog.remove();if(focus&&focus.isConnected)focus.focus();},{once:true});
};
})(window);
