/* SLIDES NA ORDEM DO PROTOCOLO: T1 com todas as repetições, depois T2, T3…
 *
 * Relato de uso: "Agora os slides não estão saindo certo. Era pra sair na
 * ordem, t1, t2, t3… todas as repetições de t1, todas de t2…"
 *
 * Os slides seguiam a ordem em que as fotos foram guardadas. As fotos em
 * sequência são tiradas andando pelo campo, na ordem sorteada das parcelas
 * (101 = T3 R1, 102 = T1 R1…), e o PowerPoint saía nessa ordem.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. O motor (FotosCore.ordemDosSlides): avaliação → tratamento na ordem do
 *     protocolo (T10 depois de T9) → repetição → ordem de captura. Tratamento
 *     apagado vai para o fim, sem sumir; a lista recebida não é mexida.
 *  2. A galeria: a grade, a prévia, o PowerPoint e o ZIP saem nessa ordem,
 *     com as fotos tiradas na ordem do campo.
 *  3. As setas só trocam fotos da mesma parcela e data (a vista geral antes do
 *     detalhe); entre tratamentos a ordem é a do protocolo.
 *  4. O relatório (Word/PDF) com fotos usa a mesma ordem.
 *  5. As páginas carregam o motor antes de usá-lo, com as versões que o sw.js
 *     guarda para abrir sem rede.
 *  6. A tela dos slides tem a escolha "Ordem dos slides": T1, T2, T3… (o
 *     padrão, para qualquer foto, tirada em sequência ou não) ou na ordem em
 *     que tirei, com as setas livres. A escolha fica lembrada no aparelho.
 *
 * Rodar: node tests/test_fotos_ordem_slides.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
let JSDOM,indexedDB;
try{ ({JSDOM}=require('jsdom')); ({indexedDB}=require('fake-indexeddb')); }
catch(e){ console.log('PULADO: jsdom/fake-indexeddb não estão instalados (npm install para rodar este teste).'); process.exit(0); }
const Core=require('../vendor/fotos-core.js'),Store=require('../vendor/fotos-store.js'),Pptx=require('../vendor/fotos-pptx.js');

let n=0; function ok(c,msg){ assert.ok(c,msg); n++; console.log('  ok    '+msg); }
const tick=()=>new Promise(r=>setTimeout(r,30));
const rot=f=>f.treatment+'R'+f.rep;

(async()=>{
/* ------------------------------------------------------------------ 1 --- */
console.log('\n--- 1. O motor: avaliação, tratamento do protocolo, repetição, captura ---');
const T=[{id:'T1'},{id:'T2'},{id:'T3'}], A=[{id:'A1',data:'2026-10-08'}];
/* tiradas andando pelo campo: 101 102 103 / 201 202 203 */
const campo=[['T3',1],['T1',1],['T2',1],['T2',2],['T3',2],['T1',2]]
  .map(([t,r],i)=>({id:'c'+i,treatment:t,rep:r,date:'2026-10-08',assessment:'A1',order:i}));
const copia=campo.map(f=>f.id).join();
let out=Core.ordemDosSlides(campo,{tratamentos:T,avaliacoes:A});
assert.equal(out.map(rot).join(' '),'T1R1 T1R2 T2R1 T2R2 T3R1 T3R2');
ok(true,'tiradas na ordem do campo, saem T1R1 T1R2 T2R1 T2R2 T3R1 T3R2');
ok(campo.map(f=>f.id).join()===copia,'a lista recebida não é reordenada (devolve uma cópia)');

const dez=Array.from({length:10},(_,i)=>({id:'T'+(i+1)}));
out=Core.ordemDosSlides([{treatment:'T10',rep:1},{treatment:'T2',rep:1},{treatment:'T9',rep:1},{treatment:'T1',rep:1}],{tratamentos:dez});
ok(out.map(f=>f.treatment).join()==='T1,T2,T9,T10','T10 depois de T9 (ordem do protocolo, não alfabética)');
out=Core.ordemDosSlides([{treatment:'TX',rep:1},{treatment:'T2',rep:1},{treatment:'T1',rep:1}],{tratamentos:[{id:'T2'},{id:'T1'}]});
ok(out.map(f=>f.treatment).join()==='T2,T1,TX','vale a ordem em que o protocolo lista os tratamentos; tratamento apagado vai para o fim, sem sumir');
out=Core.ordemDosSlides([{treatment:'T1',rep:10},{treatment:'T1',rep:2},{treatment:'T1',rep:1}],{tratamentos:T});
ok(out.map(f=>f.rep).join()==='1,2,10','repetição em número (R10 depois de R2)');

const duas=[
  {id:'b1',treatment:'T1',rep:1,date:'2026-10-08',assessment:'A1',order:5},
  {id:'a2',treatment:'T2',rep:1,date:'2026-10-01',assessment:'A0',order:9},
  {id:'a1',treatment:'T1',rep:1,date:'2026-10-01',assessment:'A0',order:8},
  {id:'s1',treatment:'T1',rep:1,date:'',assessment:'',order:1}];
out=Core.ordemDosSlides(duas,{tratamentos:T,avaliacoes:[{id:'A0'},{id:'A1'}]});
ok(out.map(f=>f.id).join()==='a1,a2,b1,s1','uma avaliação depois da outra; foto sem data no fim');
const hat=[
  {id:'h24',treatment:'T1',rep:1,date:'2026-10-08',assessment:'H24',order:1},
  {id:'h1t2',treatment:'T2',rep:1,date:'2026-10-08',assessment:'H1',order:2},
  {id:'h1t1',treatment:'T1',rep:1,date:'2026-10-08',assessment:'H1',order:3}];
out=Core.ordemDosSlides(hat,{tratamentos:T,avaliacoes:[{id:'H1'},{id:'H24'}]});
ok(out.map(f=>f.id).join()==='h1t1,h1t2,h24','duas leituras no mesmo dia (1 e 24 HAT): uma depois da outra, cada uma com T1, T2…');
const mesma=[{id:'detalhe',treatment:'T1',rep:1,date:'2026-10-08',order:7},{id:'geral',treatment:'T1',rep:1,date:'2026-10-08',order:3}];
ok(Core.ordemDosSlides(mesma,{tratamentos:T}).map(f=>f.id).join()==='geral,detalhe','várias fotos da mesma parcela: na ordem guardada');
ok(Core.mesmoGrupoDoSlide(mesma[0],mesma[1])&&!Core.mesmoGrupoDoSlide(campo[0],campo[1]),'mesmo grupo = mesma parcela e mesma leitura');
ok(Core.ordemDosSlides(null,{}).length===0&&Core.ordemDosSlides([null,campo[0]],null).length===1,'lista vazia ou buracos não quebram');

/* ------------------------------------------------------------------ 2 --- */
console.log('\n--- 2. A galeria: grade, prévia, PowerPoint e ZIP na ordem do protocolo ---');
const dom=new JSDOM(fs.readFileSync('galeria-local.html','utf8'),{url:'https://agracta.test/galeria-local.html',runScripts:'outside-only'}),w=dom.window,d=w.document;
const downloads=[],blobs=new Map();let serial=0,slides=null,zipados=null;
w.indexedDB=indexedDB;w.FotosStore=Store;w.FotosCore=Core;w.Blob=Blob;w.TextEncoder=TextEncoder;w.Uint8Array=Uint8Array;
w.FotosPptx=Object.assign({},Pptx,{
  build:(entries,per,meta)=>{slides=Array.from(entries,e=>e.label.split(' · ')[0]+' '+e.detail.split(' · ')[1]+' '+e.detail.split(' · ')[2]);return Pptx.build(entries,per,meta);},
  zip:entries=>{zipados=Array.from(entries,e=>e.nome);return Pptx.zip(entries);}});
w.URL.createObjectURL=b=>{const u='blob:t-'+(++serial);blobs.set(u,b);return u;};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);};
w.HTMLElement.prototype.scrollIntoView=function(){};
w.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});
w.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new Blob(['jpeg'],{type:'image/jpeg'}));};
w.Image=class{constructor(){this.naturalWidth=1200;this.naturalHeight=900;}set src(v){setTimeout(()=>this.onload(),0);}};
w.confirm=()=>true;
w.eval(fs.readFileSync('galeria-local.js','utf8'));

/* As fotos no banco do aparelho, na ordem em que foram tiradas no campo. */
const dono='ordem-user', loja=Store.create(indexedDB,JSON.stringify([dono,'Q','S']));
const img=()=>new Blob(['foto'],{type:'image/jpeg'});
const linha=(id,t,r,plot,date,av,order)=>({id,treatment:t,rep:r,plot,date,assessment:av,order,createdAt:'2026-10-08T10:0'+order+':00Z',blob:img(),thumb:img(),type:'image/jpeg'});
await loja.put([
  linha('p101','T3',1,'101','2026-10-08','A1',0), linha('p102','T1',1,'102','2026-10-08','A1',1),
  linha('p103','T2',1,'103','2026-10-08','A1',2), linha('p201','T2',2,'201','2026-10-08','A1',3),
  linha('p202','T3',2,'202','2026-10-08','A1',4), linha('p203','T1',2,'203','2026-10-08','A1',5),
  linha('antiga','T2',1,'103','2026-10-01','A0',6), linha('p102b','T1',1,'102','2026-10-08','A1',7)]);
const context={owner:dono,qid:'Q',sid:'S',codigo:'EST 77',reps:2,
  tratamentos:[{id:'T1',produto:'Testemunha'},{id:'T2',produto:'Produto A'},{id:'T3',produto:'Produto B'}],
  avaliacoes:[{id:'A0',data:'2026-10-01'},{id:'A1',data:'2026-10-08'}]};
w.dispatchEvent(new w.MessageEvent('message',{origin:'https://agracta.test',source:w,data:{type:'agracta:fotos-local-context',context}}));
await tick();await tick();
const esperado=['antiga','p102','p102b','p203','p103','p201','p101','p202'];
const grade=()=>Array.from(d.querySelectorAll('.photo')).map(el=>el.dataset.id);
assert.deepEqual(grade(),esperado);
ok(true,'grade: a avaliação de 01/10 primeiro; depois T1 (R1, R1, R2), T2 (R1, R2), T3 (R1, R2)');

d.getElementById('preview-button').click();
const previa=Array.from(d.querySelectorAll('.preview-slide figcaption')).map(f=>f.textContent);
ok(previa.length===8&&/^T2 · Produto A/.test(previa[0])&&/^T1 · Testemunha.*102/.test(previa[1])&&/^T3 · Produto B.*202/.test(previa[7]),'prévia dos slides na mesma ordem');

d.getElementById('per-slide').value='2';
d.getElementById('pptx').click();for(let i=0;i<8;i++)await tick();
assert.ok(slides,'o PowerPoint foi montado');
assert.deepEqual(slides,['T2 R1 01/10/2026','T1 R1 08/10/2026','T1 R1 08/10/2026','T1 R2 08/10/2026','T2 R1 08/10/2026','T2 R2 08/10/2026','T3 R1 08/10/2026','T3 R2 08/10/2026']);
ok(downloads[0]==='EST_77_fotos.pptx','PowerPoint: T1 com todas as repetições, depois T2, depois T3 (dentro de cada avaliação)');

d.getElementById('originals').click();for(let i=0;i<8;i++)await tick();
ok(zipados&&zipados.slice(0,4).join()==='001_T2_R1_2026-10-01.jpg,002_T1_R1_2026-10-08.jpg,003_T1_R1_2026-10-08.jpg,004_T1_R2_2026-10-08.jpg','ZIP dos originais numerado na mesma ordem');

/* ------------------------------------------------------------------ 3 --- */
console.log('\n--- 3. As setas: só entre fotos da mesma parcela e data ---');
const card=id=>d.querySelector('.photo[data-id="'+id+'"]');
ok(card('p102').querySelector('[data-move="1"]')&&!card('p102').querySelector('[data-move="-1"]'),'a 1ª foto da parcela 102 pode ir depois da 2ª (mesma parcela e data)');
ok(card('p102b').querySelector('[data-move="-1"]')&&!card('p102b').querySelector('[data-move="1"]'),'a 2ª pode voltar para antes da 1ª');
ok(['antiga','p203','p103','p201','p101','p202'].every(id=>!card(id).querySelector('[data-move]')),'foto única da parcela naquela data não tem seta: a ordem é a do protocolo');
card('p102').querySelector('[data-move="1"]').click();await tick();await tick();
assert.deepEqual(grade(),['antiga','p102b','p102','p203','p103','p201','p101','p202']);
ok(true,'trocar as duas fotos da parcela 102 mexe só nelas');
const guardadas=Core.ordemDosSlides(await loja.list(),context).map(f=>f.id);
ok(guardadas.join()===grade().join(),'e a troca fica guardada no aparelho (reabrir dá a mesma ordem)');

/* uma foto nova de T1 R2 entra no lugar dela, não no fim */
d.getElementById('treatment').value='T1';d.getElementById('rep').value='2';d.getElementById('assessment').value='A1';d.getElementById('date').value='2026-10-08';
const arquivo=d.getElementById('files');Object.defineProperty(arquivo,'files',{value:[img()],configurable:true});arquivo.dispatchEvent(new w.Event('change'));
for(let i=0;i<6;i++)await tick();
const depois=grade();
const nova=depois.find(id=>!esperado.includes(id));
ok(depois.length===9&&depois.indexOf('p203')===3&&depois.indexOf(nova)===4&&depois.indexOf('p103')===5,'foto nova de T1 R2 entra logo depois da outra T1 R2, antes do T2');
dom.window.close();

/* ------------------------------------------------------------------ 4 --- */
console.log('\n--- 4. O relatório (Word/PDF): as fotos na mesma ordem ---');
{
const rd=new JSDOM(fs.readFileSync('relatorio-local.html','utf8'),{url:'https://agracta.test/relatorio-local.html',runScripts:'outside-only'}),rw=rd.window,rdoc=rw.document;let rid=0;
rw.RelatorioCore=require('../vendor/relatorio-core');rw.RelatorioDocx=require('../vendor/relatorio-docx');rw.FotosPptx=Pptx;rw.FotosStore=Store;rw.FotosCore=Core;
rw.indexedDB=indexedDB;rw.TextEncoder=TextEncoder;rw.Uint8Array=Uint8Array;rw.Blob=Blob;
rw.URL.createObjectURL=()=>'blob:r-'+(++rid);rw.URL.revokeObjectURL=()=>{};
rw.Image=class{constructor(){this.naturalWidth=300;this.naturalHeight=600;}set src(v){setTimeout(()=>this.onload(),0);}};
rw.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}});
rw.HTMLCanvasElement.prototype.toBlob=cb=>cb(new Blob(['JPEG'],{type:'image/jpeg'}));
const rloja=Store.create(indexedDB,JSON.stringify(['rel-user','Q','S']));
await rloja.put([linha('r101','T3',1,'101','2026-10-08','A1',0),linha('r102','T1',1,'102','2026-10-08','A1',1),linha('r103','T2',1,'103','2026-10-08','A1',2),
  linha('r201','T2',2,'201','2026-10-08','A1',3),linha('r202','T3',2,'202','2026-10-08','A1',4),linha('r203','T1',2,'203','2026-10-08','A1',5)]);
const rctx={owner:'rel-user',generated:'2026-10-08',projection:{qid:'Q',sid:'S',codigo:'EST 77',tratamentos:context.tratamentos,resultados:[]},
  study:{id:'S',numRepeticoes:2,avaliacoes:[{id:'A1',data:'2026-10-08',dados:{}}]},context:{},analysis:{}};
rw.eval(fs.readFileSync('relatorio-local.js','utf8'));
rw.dispatchEvent(new rw.MessageEvent('message',{source:rw,origin:'https://agracta.test',data:{type:'agracta:report-context',context:rctx}}));
for(let i=0;i<3;i++)await tick();
const caixa=rdoc.getElementById('include-photos');caixa.checked=true;caixa.dispatchEvent(new rw.Event('change'));
rdoc.getElementById('prepare').click();for(let i=0;i<10;i++)await tick();
const legendas=Array.from(rdoc.querySelectorAll('figcaption')).map(f=>f.textContent).filter(t=>/ · R\d · Parcela /.test(t)).map(t=>t.split(' · ')[0]+' '+t.match(/ · (R\d) · /)[1]);
assert.deepEqual(legendas,['T1 R1','T1 R2','T2 R1','T2 R2','T3 R1','T3 R2']);
ok(true,'fotos do relatório: T1 R1, T1 R2, T2 R1, T2 R2, T3 R1, T3 R2 (tiradas na ordem do campo)');
rd.window.close();
}

/* ------------------------------------------------------------------ 5 --- */
console.log('\n--- 5. As páginas carregam o motor, nas versões que o sw.js guarda ---');
const html=fs.readFileSync('galeria-local.html','utf8'),sw=fs.readFileSync('sw.js','utf8'),index=fs.readFileSync('index.html','utf8');
const vCore=(html.match(/vendor\/fotos-core\.js\?v=(\d+)/)||[])[1],vGal=(html.match(/galeria-local\.js\?v=(\d+)/)||[])[1];
ok(vCore&&html.indexOf('vendor/fotos-core.js')<html.indexOf('galeria-local.js?v='),'galeria-local.html carrega o motor antes da galeria');
ok(sw.indexOf("'./vendor/fotos-core.js?v="+vCore+"'")>=0&&index.indexOf('vendor/fotos-core.js?v='+vCore+'"')>=0,'mesma versão do motor no sw.js e no app (v='+vCore+')');
ok(sw.indexOf("'./galeria-local.js?v="+vGal+"'")>=0,'e a da galeria (v='+vGal+')');
ok(/A sequência abaixo é a ordem dos slides: por avaliação, T1 com todas as repetições/.test(html),'a página diz qual é a ordem');
const rel=fs.readFileSync('relatorio-local.html','utf8'),vRel=(rel.match(/relatorio-local\.js\?v=(\d+)/)||[])[1];
ok(rel.indexOf('vendor/fotos-core.js?v='+vCore+'"')>=0&&rel.indexOf('vendor/fotos-core.js')<rel.indexOf('relatorio-local.js?v='),'relatorio-local.html carrega o mesmo motor antes do relatório');
ok(sw.indexOf("'./relatorio-local.js?v="+vRel+"'")>=0,'e o sw.js guarda a versão do relatório (v='+vRel+')');
const pontes=[['galeria-fotos.js',/frame\.src='galeria-local\.html\?v=(\d+)'/],['relatorio-estudo.js',/frame\.src='relatorio-local\.html\?v=(\d+)'/]];
ok(pontes.every(([f,re])=>re.test(fs.readFileSync(f,'utf8'))),'as pontes abrem as páginas com ?v= (o iPhone não reaproveita a página velha)');

/* ------------------------------------------------------------------ 6 --- */
console.log('\n--- 6. A escolha na tela dos slides: T1, T2, T3… ou na ordem em que tirei ---');
/* Relato de uso, depois da correção: "se eu não tirar em sequência elas saem
   na ordem que tirei. Poderia ter uma opção de colocar em sequência na tela de
   fazer slides". A ordem por tratamento vale para qualquer foto; a tela dos
   slides não dizia isso. Agora a escolha fica nela, ao lado de "Fotos por slide". */
{
async function abrir(dono,lembrado){
  const g=new JSDOM(fs.readFileSync('galeria-local.html','utf8'),{url:'https://agracta.test/galeria-local.html',runScripts:'outside-only'}),gw=g.window,gd=gw.document,out={};let k=0;
  gw.indexedDB=indexedDB;gw.FotosStore=Store;gw.FotosCore=Core;gw.Blob=Blob;gw.TextEncoder=TextEncoder;gw.Uint8Array=Uint8Array;
  gw.FotosPptx=Object.assign({},Pptx,{build:(entries,per,meta)=>{out.slides=Array.from(entries,e=>e.label.split(' · ')[0]+'R'+e.detail.split(' · ')[1].slice(1));return Pptx.build(entries,per,meta);}});
  gw.URL.createObjectURL=()=>'blob:o-'+(++k);gw.URL.revokeObjectURL=()=>{};gw.HTMLAnchorElement.prototype.click=function(){};gw.HTMLElement.prototype.scrollIntoView=function(){};
  gw.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){},drawImage(){}});gw.HTMLCanvasElement.prototype.toBlob=function(cb){cb(new Blob(['jpeg'],{type:'image/jpeg'}));};
  gw.Image=class{constructor(){this.naturalWidth=1200;this.naturalHeight=900;}set src(v){setTimeout(()=>this.onload(),0);}};
  if(lembrado)gw.localStorage.setItem('agracta-fotos-ordem-slides',lembrado);
  gw.eval(fs.readFileSync('galeria-local.js','utf8'));
  gw.dispatchEvent(new gw.MessageEvent('message',{origin:'https://agracta.test',source:gw,data:{type:'agracta:fotos-local-context',context:Object.assign({},context,{owner:dono,initial:{slides:true}})}}));
  await tick();await tick();
  return {g,gw,gd,out,grade:()=>Array.from(gd.querySelectorAll('.photo'),el=>el.dataset.id)};
}
/* tiradas uma a uma, sem a sequência, numa ordem qualquer */
const avulsas=Store.create(indexedDB,JSON.stringify(['avulsa-user','Q','S']));
await avulsas.put([linha('x1','T2',2,'201','2026-10-08','A1',0),linha('x2','T3',1,'101','2026-10-08','A1',1),linha('x3','T1',2,'203','2026-10-08','A1',2),linha('x4','T1',1,'102','2026-10-08','A1',3)]);
let G=await abrir('avulsa-user');
const sel=G.gd.querySelector('.export #slide-order');
ok(sel&&sel.closest('label').textContent.startsWith('Ordem dos slides')&&G.gd.querySelector('.export #per-slide'),'a tela dos slides ("Montar apresentação") tem "Ordem dos slides", ao lado de "Fotos por slide"');
ok(sel.value==='tratamento'&&/T1, T2, T3/.test(sel.selectedOptions[0].textContent),'começa em T1, T2, T3… (todas as repetições de cada)');
assert.deepEqual(G.grade(),['x4','x3','x1','x2']);
ok(true,'fotos tiradas sem a sequência, numa ordem qualquer, também saem T1R1 T1R2 T2R2 T3R1');
ok(/T1 com todas as repetições/.test(G.gd.getElementById('order-hint').textContent),'o aviso da galeria diz a ordem escolhida');

sel.value='captura';sel.dispatchEvent(new G.gw.Event('change'));await tick();
assert.deepEqual(G.grade(),['x1','x2','x3','x4']);
ok(true,'"Na ordem em que tirei": a grade volta à ordem em que foram tiradas');
ok(/ordem em que as fotos foram tiradas/.test(G.gd.getElementById('order-hint').textContent),'e o aviso muda junto');
const setas=id=>Array.from(G.gd.querySelectorAll('.photo[data-id="'+id+'"] [data-move]'),b=>b.dataset.move).join();
ok(setas('x1')==='1'&&setas('x2')==='-1,1'&&setas('x4')==='-1','nesse modo as setas mudam qualquer foto de lugar, como antes');
G.gd.querySelector('.photo[data-id="x3"] [data-move="1"]').click();await tick();await tick();
assert.deepEqual(G.grade(),['x1','x2','x4','x3']);
G.gd.getElementById('per-slide').value='1';G.gd.getElementById('pptx').click();for(let i=0;i<8;i++)await tick();
assert.deepEqual(G.out.slides,['T2R2','T3R1','T1R1','T1R2']);
ok(true,'o PowerPoint sai na ordem escolhida (a troca com a seta vale)');
ok(G.gw.localStorage.getItem('agracta-fotos-ordem-slides')==='captura','a escolha fica lembrada neste aparelho');
sel.value='tratamento';sel.dispatchEvent(new G.gw.Event('change'));await tick();
ok(G.grade().join()==='x4,x3,x1,x2'&&!G.gd.querySelector('.photo [data-move]'),'voltar para T1, T2, T3… reordena de novo; sem fotos repetidas na parcela, sem setas');
G.g.window.close();

G=await abrir('avulsa-user','captura');
ok(G.gd.getElementById('slide-order').value==='captura'&&G.grade().join()==='x1,x2,x4,x3','reabrir a galeria com "Na ordem em que tirei" lembrado abre nela');
G.g.window.close();
G=await abrir('avulsa-user','qualquer-coisa');
ok(G.gd.getElementById('slide-order').value==='tratamento','valor estranho guardado não vale: fica T1, T2, T3…');
G.g.window.close();
}

console.log('\n'+n+' verificações, todas certas.');
})().catch(e=>{ console.error('FALHA '+e.message); process.exit(1); });
