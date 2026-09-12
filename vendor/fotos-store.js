/* Banco exclusivo da galeria: nunca participa de save(), outbox ou sincronização. */
(function(root){
'use strict';
function createStorage(idb,scope){
 if(!idb||!scope)throw Error('Armazenamento local indisponível.');
 function open(){return new Promise(function(resolve,reject){
  const rq=idb.open('agracta-fotos-locais',1);
  rq.onupgradeneeded=function(){const db=rq.result;if(!db.objectStoreNames.contains('fotos')){const os=db.createObjectStore('fotos',{keyPath:['scope','id']});os.createIndex('scope','scope');}};
  rq.onsuccess=function(){resolve(rq.result);};rq.onerror=function(){reject(rq.error);};rq.onblocked=function(){reject(Error('Feche outras abas da galeria para liberar o armazenamento local.'));};
 });}
 async function transaction(mode,action){
  const db=await open();return new Promise(function(resolve,reject){
   let result;const tx=db.transaction('fotos',mode),os=tx.objectStore('fotos');
   tx.oncomplete=function(){db.close();resolve(result);};
   tx.onabort=tx.onerror=function(){db.close();reject(tx.error||Error('Não foi possível salvar no aparelho.'));};
   try{action(os,function(value){result=value;});}catch(err){tx.abort();db.close();reject(err);}
  });
 }
 return {
  list:()=>transaction('readonly',(os,done)=>{const rq=os.index('scope').getAll(scope);rq.onsuccess=()=>done(rq.result.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)));}),
  put:rows=>transaction('readwrite',os=>{rows.forEach(row=>{if(!row.id)throw Error('Foto sem identificação.');os.put(Object.assign({},row,{scope}));});}),
  remove:id=>transaction('readwrite',os=>os.delete([scope,id]))
 };
}
if(typeof module==='object'&&module.exports)module.exports={create:createStorage};else root.FotosStore={create:createStorage};
})(typeof window==='object'?window:this);
