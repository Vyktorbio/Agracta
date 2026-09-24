/* Sequência automática de fotos: cada foto da câmera fica na parcela da vez e a
   identificação avança sozinha para a próxima, na ordem recebida do estudo. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom'),{indexedDB}=require('fake-indexeddb');
const Store=require('./vendor/fotos-store.js'),Pptx=require('./vendor/fotos-pptx.js');
const tick=()=>new Promise(r=>setTimeout(r,30));
function pagina(){
 const dom=new JSDOM(fs.readFileSync('galeria-local.html','utf8'),{url:'https://agracta.test/galeria-local.html',runScripts:'outside-only'}),w=dom.window;
 w.indexedDB=indexedDB;w.FotosStore=Store;w.FotosPptx=Pptx;w.Blob=Blob;
 w.URL.createObjectURL=()=>'blob:test';w.URL.revokeObjectURL=()=>{};
 w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});
 w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new Blob(['miniatura'],{type:'image/jpeg'}));};
 w.Image=class{constructor(){this.naturalWidth=1200;this.naturalHeight=600;}set src(v){setTimeout(()=>this.onload(),0);}};
 w.eval(fs.readFileSync('galeria-local.js','utf8'));
 return w;
}
async function abrir(w,extra){
 const plots=[];['T1','T2'].forEach((t,i)=>{for(let r=1;r<=3;r++)plots.push({treatment:t,rep:r,plot:(i+1)+'ABC'[r-1]});});
 plots.push({treatment:'T9',rep:1,plot:'fora'},{treatment:'T1',rep:7,plot:'fora'});
 const context=Object.assign({owner:'seq-user',qid:'Q',sid:'S',codigo:'SEQ',reps:3,tratamentos:[{id:'T1',produto:'A'},{id:'T2',produto:'B'}],avaliacoes:[],plots},extra);
 w.dispatchEvent(new w.MessageEvent('message',{origin:'https://agracta.test',source:w,data:{type:'agracta:fotos-local-context',context}}));await tick();
}
async function foto(w,id){
 const input=w.document.getElementById(id);
 Object.defineProperty(input,'files',{value:[new Blob(['foto'],{type:'image/jpeg'})],configurable:true});
 input.dispatchEvent(new w.Event('change'));await tick();await tick();
}
(async()=>{
 let w=pagina(),d=w.document,$=id=>d.getElementById(id);
 await abrir(w,{initial:{treatment:'T1',rep:2,plot:'1B'}});
 assert.equal($('seq').hidden,false,'com várias parcelas a opção aparece');
 assert.equal($('seq-box').hidden,true,'começa desligada');
 $('seq-on').checked=true;$('seq-on').dispatchEvent(new w.Event('change'));
 assert.equal($('seq-plot').textContent,'1B','começa na parcela de onde a galeria foi aberta');
 assert.equal($('seq-pos').textContent,'2 de 6','parcelas fora do cadastro são descartadas');
 assert.equal($('camera-label').textContent,'Tirar foto · 1B');
 await foto(w,'camera');
 assert.equal($('seq-plot').textContent,'1C');assert.equal($('treatment').value,'T1');assert.equal($('rep').value,'3');assert.equal($('plot').value,'1C');
 assert.match($('status').textContent,/1B salva.*parcela 1C/);
 await foto(w,'camera');
 assert.equal($('seq-plot').textContent,'2A');assert.equal($('treatment').value,'T2');assert.equal($('rep').value,'1');
 await foto(w,'files');
 assert.equal($('seq-plot').textContent,'2A','foto da galeria do aparelho não avança');
 $('seq-skip').click();assert.equal($('seq-plot').textContent,'2B');assert.match($('status').textContent,/da vez: 2B/);
 $('seq-prev').click();$('seq-prev').click();assert.equal($('seq-plot').textContent,'1C');
 $('treatment').value='T2';$('rep').value='3';$('rep').dispatchEvent(new w.Event('change'));
 assert.equal($('seq-plot').textContent,'2C','trocar a identificação à mão reposiciona a sequência');
 await foto(w,'camera');
 assert.equal($('seq-plot').textContent,'2C','na última parcela a sequência para');assert.match($('status').textContent,/concluída/);
 const salvas=(await Store.create(indexedDB,JSON.stringify(['seq-user','Q','S'])).list()).map(p=>p.plot+':'+p.treatment+'R'+p.rep);
 assert.deepEqual(salvas,['1B:T1R2','1C:T1R3','2A:T2R1','2C:T2R3']);
 w.close();
 /* A escolha fica lembrada no aparelho; sem parcela de origem começa na primeira. */
 w=pagina();d=w.document;$=id=>d.getElementById(id);
 w.localStorage.setItem('agracta-fotos-sequencia','1');
 await abrir(w,{owner:'outro'});
 assert.equal($('seq-on').checked,true);assert.equal($('seq-plot').textContent,'1A');
 w.close();
 /* Uma parcela só: não há sequência a oferecer. */
 w=pagina();d=w.document;
 await abrir(w,{owner:'um',plots:[{treatment:'T1',rep:1,plot:'1A'}]});
 assert.equal(d.getElementById('seq').hidden,true);assert.equal(d.getElementById('camera-label').textContent,'Tirar foto');
 w.close();
 console.log('Sequência de fotos: avança após cada foto da câmera, pula, volta, reposiciona, para na última e lembra a escolha OK.');
})().catch(err=>{console.error(err);process.exit(1);});
