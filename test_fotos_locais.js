'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {indexedDB}=require('fake-indexeddb');
const Store=require('./vendor/fotos-store.js'),Pptx=require('./vendor/fotos-pptx.js');
(async()=>{
 const a=Store.create(indexedDB,JSON.stringify(['user-a','Q','S'])),b=Store.create(indexedDB,JSON.stringify(['user-b','Q','S'])),other=Store.create(indexedDB,JSON.stringify(['user-a','Q','S2']));
 const one={id:'same-id',order:0,blob:new Blob(['original intacto'],{type:'image/jpeg'}),thumb:new Blob(['miniatura']),treatment:'T1',rep:1,date:'2026-09-12'};
 await a.put([one]);await b.put([Object.assign({},one,{treatment:'T2'})]);
 assert.equal((await a.list())[0].treatment,'T1');assert.equal((await b.list())[0].treatment,'T2');assert.equal((await other.list()).length,0);
 assert.equal(await (await a.list())[0].blob.text(),'original intacto');
 await b.remove(one.id);assert.equal((await a.list()).length,1,'remover na outra conta não apaga esta foto');
 await a.put([{id:'second',order:8,blob:one.blob},{id:'third',order:9,blob:one.blob}]);
 await a.put([Object.assign({},one,{order:9}),{id:'third',order:0,blob:one.blob}]);
 assert.deepEqual((await a.list()).map(p=>p.id),['third','second','same-id']);
 const fresh=Store.create(indexedDB,JSON.stringify(['user-a','Q','S']));assert.equal((await fresh.list()).length,3,'reabertura mantém as fotos');
 const failed=Store.create({open(){throw Object.assign(Error('sem espaço'),{name:'QuotaExceededError'});}},'test');await assert.rejects(failed.put([one]),/sem espaço/);
 // A galeria não usa nenhum caminho de transmissão ou sincronização.
 const child=fs.readFileSync('galeria-local.js','utf8'),html=fs.readFileSync('galeria-local.html','utf8'),bridge=fs.readFileSync('galeria-fotos.js','utf8');
 assert.match(html,/connect-src 'none'/);assert.match(html,/form-action 'none'/);
 assert.doesNotMatch(child,/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon|postMessage|save|outboxAdd|dbUpsertEstudo)\s*\(/);
 assert.doesNotMatch(child+bridge,/\.foto\s*=/);
 assert.match(bridge,/galeria-local\.html\?v=1/);assert.match(bridge,/frame\.remove\(\)/);
 // O iframe tem cache próprio, inclusive na primeira abertura offline.
 const handlers={},puts=[],scope={URL,Promise,self:{addEventListener:(type,fn)=>handlers[type]=fn},fetch:()=>Promise.reject(Error('offline')),caches:{match:key=>Promise.resolve(key==='https://agracta.test/galeria-local.html'?'galeria':'app'),open:()=>Promise.resolve({put:(key)=>puts.push(key)})}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),scope);
 let response;handlers.fetch({request:{url:'https://agracta.test/galeria-local.html?v=1',method:'GET',mode:'navigate'},respondWith:r=>response=r});assert.equal(await response,'galeria');
 scope.fetch=()=>Promise.resolve({ok:true,clone:()=>({})});
 handlers.fetch({request:{url:'https://agracta.test/galeria-local.html?v=1',method:'GET',mode:'navigate'},respondWith:r=>response=r});await response;await Promise.resolve();assert.deepEqual(puts,['https://agracta.test/galeria-local.html']);
 assert(fs.readFileSync('sw.js','utf8').includes("'./galeria-local.html'"));
 // Estrutura, relações, número de páginas, legendas escapadas e proporções.
 const images=Array.from({length:17},(_,i)=>({bytes:new Uint8Array([255,216,255,217]),width:i%2?600:1200,height:i%2?1200:600,label:'T'+i+' · Produto <experimental> & dose',detail:'R1 · 12/09/2026'}));
 const {JSDOM}=require('jsdom'),parser=new (new JSDOM('').window.DOMParser)();
 for(const n of [4,6,8]){
  const parts=Pptx.parts(images,n,{titulo:'Estudo <teste>',subtitulo:'Soja & alvo'}),slides=parts.filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.nome));
  assert.equal(slides.length,Math.ceil(images.length/n));
  let pics=0;
  for(const p of parts.filter(f=>/\.xml$|\.rels$/.test(f.nome))){
   const xml=new TextDecoder().decode(p.dados),doc=parser.parseFromString(xml,'application/xml');
   assert.equal(doc.querySelectorAll('parsererror').length,0,p.nome);
   if(/^ppt\/slides\/slide/.test(p.nome)){
    const list=doc.getElementsByTagName('p:pic');pics+=list.length;
    for(const el of list){const x=el.getElementsByTagName('a:xfrm')[0],off=x.getElementsByTagName('a:off')[0],ext=x.getElementsByTagName('a:ext')[0],w=Number(ext.getAttribute('cx')),h=Number(ext.getAttribute('cy'));
     assert(Number(off.getAttribute('x'))>=0&&Number(off.getAttribute('y'))>=0);assert(Number(off.getAttribute('y'))+h<7.5*914400);assert(Math.abs(w/h-2)<.0001||Math.abs(w/h-.5)<.0001);
    }
    assert.match(Array.from(doc.getElementsByTagName('a:t')).map(x=>x.textContent).join(' '),/<experimental> & dose/);
   }
  }
  assert.equal(pics,17);assert.equal(parts.filter(f=>f.nome.startsWith('ppt/media/')).length,17);
  const zip=await Pptx.build(images,n,{titulo:'Teste'}).arrayBuffer();assert.equal(new DataView(zip).getUint32(0,true),0x04034b50);
 }
 assert.throws(()=>Pptx.parts([],4,{}),/pelo menos/);assert.throws(()=>Pptx.layout(5),/4, 6 ou 8/);
 console.log('Fotos locais: contas/estudos isolados, persistência, originais, ordenação, quota, ausência de transmissão e PPTX 4/6/8 OK.');
})().catch(err=>{console.error(err);process.exit(1);});
