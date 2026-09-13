'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom'),{indexedDB}=require('fake-indexeddb');
const tick=()=>new Promise(r=>setTimeout(r,40));
(async()=>{
const dom=new JSDOM(fs.readFileSync('relatorio-local.html','utf8'),{url:'https://agracta.test/relatorio-local.html',runScripts:'outside-only'}),w=dom.window,d=w.document,downloads=[],urls=new Map();let id=0,network=0,printed=0;
w.RelatorioCore=require('./vendor/relatorio-core');w.RelatorioDocx=require('./vendor/relatorio-docx');w.FotosPptx=require('./vendor/fotos-pptx');w.FotosStore=require('./vendor/fotos-store');w.indexedDB=indexedDB;w.TextEncoder=TextEncoder;w.Uint8Array=Uint8Array;w.Blob=Blob;
w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{network++;throw Error('Sem rede');};w.print=()=>printed++;
w.URL.createObjectURL=b=>{const u='blob:test-'+(++id);urls.set(u,b);return u;};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:urls.get(this.href)});};
w.Image=class{constructor(){this.naturalWidth=300;this.naturalHeight=600;}set src(v){setTimeout(()=>this.onload(),0);}};
w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}});
w.HTMLCanvasElement.prototype.toBlob=cb=>cb(new Blob(['JPEG'],{type:'image/jpeg'}));
await w.FotosStore.create(indexedDB,JSON.stringify(['owner','Q','S'])).put([{id:'photo',order:1,blob:new Blob(['original'],{type:'image/jpeg'}),treatment:'T1',rep:1,plot:'101',date:'2026-09-12'}]);
const ctx={owner:'owner',generated:'2026-09-12',projection:{qid:'Q',sid:'S',codigo:'Teste',tratamentos:[{id:'T1',produto:'SC CEGO'}],resultados:[{avaliacao:'A',data:'2026-09-12',variavel:'Severidade',tratamento:'T1',media:0,n:1,unidade:'%'}]},study:{id:'S',numRepeticoes:1,avaliacoes:[{id:'A',data:'2026-09-12',variaveis:['Severidade'],notas:{T1R1:{Severidade:0}}}]}};
w.eval(fs.readFileSync('relatorio-local.js','utf8'));
const post=origin=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin,data:{type:'agracta:report-context',context:ctx}}));
post('https://externo.test');await tick();assert(d.getElementById('actions').hidden);post('https://agracta.test');await tick();assert(!d.getElementById('actions').hidden);
assert.match(d.getElementById('photo-status').textContent,/1 foto/);d.getElementById('r').click();assert.equal(downloads[0].name,'Teste_R.zip');
d.getElementById('prepare').click();await tick();assert(!d.getElementById('downloads').hidden);assert.equal(d.querySelectorAll('figure').length,1); // somente gráfico
const box=d.getElementById('include-photos');box.checked=true;box.dispatchEvent(new w.Event('change'));assert(d.getElementById('downloads').hidden);d.getElementById('prepare').click();await tick();await tick();assert.equal(d.querySelectorAll('figure').length,2);assert.match(d.querySelectorAll('figcaption')[1].textContent,/SC CEGO.*R1.*101/);
d.getElementById('docx').click();d.getElementById('md').click();d.getElementById('pdf').click();assert.equal(printed,1);assert.equal(downloads[1].name,'Teste_relatorio.docx');assert.equal(downloads[2].name,'Teste_markdown.zip');
for(const f of downloads)assert.equal(new Uint8Array(await f.blob.arrayBuffer())[0],80);assert.equal(network,0);
assert.equal((await w.FotosStore.create(indexedDB,JSON.stringify(['owner','Q','S'])).list()).length,1);dom.window.close();
console.log('Relatório local: contexto externo rejeitado, prévia, fotos opcionais, Word, Markdown, PDF, R e zero transmissões OK.');
})().catch(e=>{console.error(e);process.exit(1);});
