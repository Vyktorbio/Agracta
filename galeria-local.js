/* Esta página não envia mensagens, fotos, métricas ou requisições de rede. */
(function(){
'use strict';
let context=null,storage=null,photos=[],busy=false,urls=[],selected=new Set();
const $=id=>document.getElementById(id),esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const br=date=>/^\d{4}-\d{2}-\d{2}$/.test(date||'')?date.slice(8)+'/'+date.slice(5,7)+'/'+date.slice(0,4):'Sem data';
function message(text,error){$('status').textContent=text;$('status').className=error?'error':'';}
function setBusy(value){busy=value;document.querySelectorAll('input,select,button').forEach(el=>{el.disabled=value;});}
function revoke(){urls.forEach(u=>URL.revokeObjectURL(u));urls=[];}
function url(blob){const u=URL.createObjectURL(blob);urls.push(u);return u;}
function treatment(id){return context.tratamentos.find(t=>t.id===id);}
function label(photo){const t=treatment(photo.treatment);return String(photo.treatment)+' · '+(t?t.produto:'Tratamento não disponível no cadastro atual')+(t&&t.dose?' · '+t.dose:'');}
function detail(photo){return [photo.plot||photo.treatment+'R'+photo.rep,'R'+photo.rep,br(photo.date)].join(' · ');}
function selection(){return photos.filter(p=>selected.has(p.id));}
function count(){const n=selection().length,per=Number($('per-slide').value);$('selection-count').textContent=n+' foto(s) selecionada(s) · '+Math.ceil(n/per)+' slide(s).';$('all').textContent=n===photos.length&&n?'Desmarcar todas':'Selecionar todas';$('preview').replaceChildren();}
function draw(){
 revoke();$('gallery-title').textContent=photos.length+' foto(s) salvas neste aparelho';
 $('gallery').innerHTML=photos.length?photos.map((p,i)=>'<article class="photo" data-id="'+esc(p.id)+'"><img loading="lazy" src="'+url(p.thumb)+'" alt="'+esc(label(p)+' · '+detail(p))+'"><label><input type="checkbox" data-select="'+esc(p.id)+'" '+(selected.has(p.id)?'checked':'')+'> '+esc(label(p))+'</label><p class="hint">'+esc(detail(p))+'</p><div class="actions"><button type="button" class="secondary" data-move="-1" '+(!i?'disabled':'')+' aria-label="Mover foto '+(i+1)+' para antes">← Antes</button><button type="button" class="secondary" data-move="1" '+(i===photos.length-1?'disabled':'')+' aria-label="Mover foto '+(i+1)+' para depois">Depois →</button><button type="button" class="danger" data-delete="1">Excluir</button></div></article>').join(''):'<p class="empty">Escolha o tratamento e a repetição acima para adicionar a primeira foto.</p>';
 count();
}
function imageOf(blob){
 return new Promise((resolve,reject)=>{const u=URL.createObjectURL(blob),img=new Image();img.onload=()=>{URL.revokeObjectURL(u);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(u);reject(Error('Imagem não reconhecida. Escolha JPEG, PNG ou WebP.'));};img.src=u;});
}
async function normalized(blob,max){
 const img=await imageOf(blob),w=img.naturalWidth,h=img.naturalHeight;
 if(!w||!h||w*h>80000000)throw Error('Imagem muito grande para o aparelho. Use uma foto com até 80 megapixels.');
 const ratio=Math.min(1,max/Math.max(w,h)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(w*ratio));canvas.height=Math.max(1,Math.round(h*ratio));
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar a imagem neste navegador.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
 const result=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Não foi possível preparar a imagem.')),'image/jpeg',.92));
 return {blob:result,width:canvas.width,height:canvas.height};
}
function binding(){
 if(!$('capture-form').reportValidity())throw Error('Preencha tratamento, repetição e data.');
 const t=$('treatment').value,rep=Number($('rep').value),date=$('date').value;
 if(!treatment(t)||!(rep>=1&&rep<=context.reps)||!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Confira a identificação da parcela.');
 return {treatment:t,rep,date,assessment:$('assessment').value,plot:$('plot').value.trim()};
}
async function addFiles(files){
 if(!context||busy||!files.length)return;
 let bind;try{bind=binding();}catch(err){message(err.message,true);return;}
 setBusy(true);let saved=0,failure='';
 try{
  for(const file of files){
   if(photos.length>=100)throw Error('Esta galeria chegou a 100 fotos. Baixe os originais e remova as fotos que não precisa manter aqui.');
   if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>30*1024*1024)throw Error('Use JPEG, PNG ou WebP com até 30 MB por foto.');
   message('Salvando foto '+(saved+1)+' de '+files.length+' somente neste aparelho…');
   const thumb=await normalized(file,480),row=Object.assign({id:crypto.randomUUID(),order:photos.length?Math.max(...photos.map(p=>p.order))+1:0,createdAt:new Date().toISOString(),blob:file,thumb:thumb.blob,type:file.type},bind);
   await storage.put([row]);photos.push(row);selected.add(row.id);saved++;
  }
 }catch(err){failure=err.name==='QuotaExceededError'?'Sem espaço no aparelho. Baixe as fotos já salvas e libere espaço.':err.message;}
 finally{setBusy(false);draw();$('camera').value='';$('files').value='';message(saved+' foto(s) salvas localmente.'+(failure?' '+failure:''),!!failure);}
}
function download(blob,name){
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);
}
function filename(){return String(context.codigo||'estudo').replace(/[^a-z0-9_-]/gi,'_').slice(0,80);}
async function exportFiles(kind){
 if(busy||!context)return;const chosen=selection();if(!chosen.length){message('Selecione pelo menos uma foto.',true);return;}
 setBusy(true);
 try{
  const entries=[],manifest=[];
  for(let i=0;i<chosen.length;i++){
   const p=chosen[i];message('Preparando '+(i+1)+' de '+chosen.length+' fotos no aparelho…');
   if(kind==='pptx'){const image=await normalized(p.blob,2048);entries.push({width:image.width,height:image.height,bytes:new Uint8Array(await image.blob.arrayBuffer()),label:label(p),detail:detail(p)});}
   else{
    const ext=p.type==='image/png'?'png':p.type==='image/webp'?'webp':'jpg',name=String(i+1).padStart(3,'0')+'_'+String(p.treatment).replace(/[^a-z0-9_-]/gi,'_')+'_R'+p.rep+'_'+p.date+'.'+ext;
    entries.push({nome:name,dados:new Uint8Array(await p.blob.arrayBuffer())});manifest.push({arquivo:name,tratamento:label(p),repeticao:p.rep,parcela:p.plot,data:p.date,avaliacao:p.assessment,adicionadaEm:p.createdAt});
   }
  }
  if(kind==='pptx')download(FotosPptx.build(entries,Number($('per-slide').value),{titulo:context.codigo,subtitulo:[context.cultura,context.alvo,context.local].filter(Boolean).join(' · ')}),filename()+'_fotos.pptx');
  else{entries.push({nome:'legendas.json',dados:new TextEncoder().encode(JSON.stringify(manifest,null,2))});download(new Blob([FotosPptx.zip(entries)],{type:'application/zip'}),filename()+'_originais.zip');}
  message('Download preparado. Confira o arquivo na pasta de downloads. As fotos continuam salvas neste aparelho.');
 }catch(err){message('Não foi possível exportar: '+err.message+'. As fotos salvas continuam na galeria.',true);}
 finally{setBusy(false);draw();}
}
function preview(){
 const chosen=selection(),n=Number($('per-slide').value);if(!chosen.length){message('Selecione pelo menos uma foto.',true);return;}
 let html='';for(let i=0;i<chosen.length;i+=n){html+='<section class="preview-slide"><h3>Slide '+(Math.floor(i/n)+1)+' · '+esc(context.codigo)+'</h3><div class="preview-grid cols-'+n/2+'">'+chosen.slice(i,i+n).map(p=>'<figure><img src="'+url(p.thumb)+'" alt="'+esc(label(p))+'"><figcaption><b>'+esc(label(p))+'</b><br>'+esc(detail(p))+'</figcaption></figure>').join('')+'</div></section>';}
 $('preview').innerHTML=html;$('preview').scrollIntoView({block:'start'});
}
window.addEventListener('message',async function(ev){
 if(context||ev.source!==parent||ev.origin!==location.origin||!ev.data||ev.data.type!=='agracta:fotos-local-context')return;
 const c=ev.data.context;
 if(!c||typeof c.owner!=='string'||!c.owner||!c.qid||!c.sid||!Array.isArray(c.tratamentos)||!c.tratamentos.length)return;
 context=c;context.reps=Math.max(1,Math.min(1000,parseInt(c.reps)||1));
 try{
  storage=FotosStore.create(indexedDB,JSON.stringify([c.owner,c.qid,c.sid]));
  $('study-title').textContent=c.codigo;
  c.tratamentos.forEach(t=>{$('treatment').add(new Option(t.id+' · '+t.produto,t.id));});
  for(let r=1;r<=context.reps;r++)$('rep').add(new Option('R'+r,String(r)));
  (c.avaliacoes||[]).forEach(a=>{$('assessment').add(new Option(br(a.data)+' · '+a.id,a.id));});
  const now=new Date();$('date').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  photos=await storage.list();photos.forEach(p=>selected.add(p.id));$('workspace').hidden=false;draw();message('Galeria pronta. Armazenamento exclusivo deste aparelho.');
 }catch(err){message('Galeria indisponível: '+err.message,true);}
});
$('capture-form').addEventListener('submit',ev=>ev.preventDefault());
['camera','files'].forEach(id=>$(id).addEventListener('change',ev=>addFiles(Array.from(ev.target.files||[]))));
$('assessment').addEventListener('change',()=>{const a=context.avaliacoes.find(a=>a.id===$('assessment').value);if(a&&a.data)$('date').value=a.data;});
$('date').addEventListener('change',()=>{const a=context.avaliacoes.find(a=>a.id===$('assessment').value);if(a&&a.data!==$('date').value)$('assessment').value='';});
$('gallery').addEventListener('change',ev=>{const id=ev.target.dataset.select;if(!id)return;if(ev.target.checked)selected.add(id);else selected.delete(id);count();});
$('gallery').addEventListener('click',async ev=>{
 const b=ev.target.closest('button'),card=b&&b.closest('[data-id]');if(!card||busy)return;
 const p=photos.find(x=>x.id===card.dataset.id);if(!p)return;
 if(b.dataset.delete&&!confirm('Excluir esta foto deste aparelho? Baixe uma cópia antes de excluir.'))return;
 setBusy(true);
 try{
  if(b.dataset.delete){await storage.remove(p.id);photos=photos.filter(x=>x.id!==p.id);selected.delete(p.id);}
  else{const i=photos.indexOf(p),j=i+Number(b.dataset.move);if(j<0||j>=photos.length)return;const other=photos[j];const changed=[Object.assign({},p,{order:other.order}),Object.assign({},other,{order:p.order})];await storage.put(changed);photos[i]=changed[1];photos[j]=changed[0];}
  message('Galeria atualizada neste aparelho.');
 }catch(err){message('Não foi possível alterar: '+err.message,true);}
 finally{setBusy(false);draw();}
});
$('all').addEventListener('click',()=>{selected=selection().length===photos.length?new Set():new Set(photos.map(p=>p.id));draw();});
$('per-slide').addEventListener('change',count);
$('preview-button').addEventListener('click',preview);
$('pptx').addEventListener('click',()=>exportFiles('pptx'));
$('originals').addEventListener('click',()=>exportFiles('zip'));
window.addEventListener('pagehide',revoke);
})();
