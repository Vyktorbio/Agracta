/* O bioensaio no relatório local: as seções entram no Word, no Markdown e no PDF,
   e os gráficos (SVG autônomo) viram figuras antes das demais. Um gráfico que o
   aparelho não desenhe sai avisado, sem derrubar o relatório.
   Rodar: node tests/test_relatorio_bioensaio.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
let JSDOM,indexedDB;try{({JSDOM}=require('jsdom'));({indexedDB}=require('fake-indexeddb'));}catch{console.log('PULADO: jsdom ou fake-indexeddb não está instalado.');process.exit(0);}
const tick=()=>new Promise(r=>setTimeout(r,40));
(async()=>{
const dom=new JSDOM(fs.readFileSync('relatorio-local.html','utf8'),{url:'https://agracta.test/relatorio-local.html',runScripts:'outside-only'}),w=dom.window,d=w.document,downloads=[],urls=new Map(),desenhos=[];let id=0;
w.RelatorioCore=require('../vendor/relatorio-core');w.RelatorioDocx=require('../vendor/relatorio-docx');w.FotosPptx=require('../vendor/fotos-pptx');w.FotosStore=require('../vendor/fotos-store');w.indexedDB=indexedDB;w.TextEncoder=TextEncoder;w.Uint8Array=Uint8Array;w.Blob=Blob;
w.fetch=w.XMLHttpRequest=w.WebSocket=()=>{throw Error('Sem rede');};w.print=()=>{};
w.URL.createObjectURL=b=>{const u='blob:test-'+(++id);urls.set(u,b);return u;};w.URL.revokeObjectURL=()=>{};
w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:urls.get(this.href)});};
/* imagem: o SVG marcado com QUEBRA falha como falharia num aparelho que não o desenha */
w.Image=class{constructor(){this.naturalWidth=300;this.naturalHeight=600;}set src(v){const b=urls.get(v);(b&&b.type==='image/svg+xml'?b.text():Promise.resolve('')).then(t=>{if(/QUEBRA/.test(t))this.onerror();else{if(t)desenhos.push(t);this.onload();}});}};
let tamanhos=[];
w.HTMLCanvasElement.prototype.getContext=function(){const c=this;return {fillRect(){},drawImage(){tamanhos.push([c.width,c.height]);},fillText(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};};
w.HTMLCanvasElement.prototype.toBlob=cb=>cb(new Blob(['JPEG'],{type:'image/jpeg'}));
const svg=(txt,h)=>'<svg xmlns="http://www.w3.org/2000/svg" width="520" height="'+h+'" viewBox="0 0 520 '+h+'"><rect width="520" height="'+h+'" fill="#ffffff"/><text>'+txt+'</text></svg>';
const ctx={owner:'owner',generated:'2026-09-28',projection:{qid:'Q',sid:'S',codigo:'POT-01',local:'Lab',cultura:'—',tratamentos:[{id:'T1',produto:'Água'},{id:'T2',produto:'SC CEGO'}],resultados:[{avaliacao:'a24',data:'2026-09-02',variavel:'Mortalidade',tratamento:'T1',media:5,n:4,unidade:'%'}]},
 study:{id:'S',numRepeticoes:1,avaliacoes:[{id:'a24',data:'2026-09-02',variaveis:['Mortalidade'],notas:{T1R1:{Mortalidade:5}}}]},
 bioensaio:{metodo:'potter',titulo:'Torre de Potter',secoes:[
  {title:'Torre de Potter · mortalidade e eficácia',text:'Abbott (1925).',headers:['Leitura','Tratamento','Mortalidade (%)','Eficácia Abbott (%)'],rows:[['24 HAT','T1 (testemunha)','5','—'],['24 HAT','T2','97,5','97,4']]},
  {title:'Torre de Potter · TL50 e TL90',text:'Kaplan & Meier (1958).',headers:['Tratamento','TL50','TL90','Mortos / N'],rows:[['T2','18,5 h','40,2 h','40 / 40']]}],
  figuras:[{svg:svg('mortalidade',236),legenda:'Mortalidade (%) por tratamento ao longo das leituras.',largura:520,altura:236},
           {svg:svg('dose',220),legenda:'Curva de dose-resposta em 24 HAT.',largura:520,altura:220}]}};
w.eval(fs.readFileSync('relatorio-local.js','utf8'));
w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:'https://agracta.test',data:{type:'agracta:report-context',context:ctx}}));await tick();
d.getElementById('prepare').click();await tick();await tick();
const legendas=Array.from(d.querySelectorAll('figcaption')).map(x=>x.textContent);
assert.equal(legendas.length,3,'dois gráficos do bioensaio e o gráfico das médias');
assert.match(legendas[0],/^Mortalidade \(%\)/);assert.match(legendas[1],/^Curva de dose-resposta/);assert.match(legendas[2],/Mortalidade por tratamento/);
assert.deepEqual(tamanhos.slice(0,2),[[1300,590],[1300,550]],'desenhado em 2,5× o tamanho do SVG: nítido no Word e no PDF');
const h2=Array.from(d.querySelectorAll('#report h2')).map(x=>x.textContent);
assert(h2.indexOf('Torre de Potter · mortalidade e eficácia')>h2.indexOf('Resultados por tratamento e data')&&h2.indexOf('Torre de Potter · TL50 e TL90')<h2.indexOf('Estatística e investigação forense'),'seções do bioensaio na prévia, no lugar certo');
assert.match(d.getElementById('report').textContent,/18,5 h/);
d.getElementById('docx').click();d.getElementById('md').click();
const docx=downloads.find(f=>/docx$/.test(f.name)),md=downloads.find(f=>/markdown\.zip$/.test(f.name));
assert(docx&&md);const docxTxt=Buffer.from(await docx.blob.arrayBuffer()).toString('latin1');
assert(docxTxt.includes('word/media/image2.jpg')&&!docxTxt.includes('word/media/image3.jpg'),'Word com as três figuras');
const mdTxt=Buffer.from(await md.blob.arrayBuffer()).toString('utf8');assert(mdTxt.includes('## Torre de Potter · TL50 e TL90')&&mdTxt.includes('imagens/figura-3.jpg'));
/* um gráfico que o aparelho não desenha: avisado, e o resto do relatório sai */
ctx.bioensaio.figuras[0].svg=svg('QUEBRA',236);
d.getElementById('prepare').click();await tick();await tick();
assert.equal(d.querySelectorAll('figure').length,2,'o gráfico que falhou fica de fora; os outros entram');
assert.match(d.getElementById('report').textContent,/Gráfico\(s\) do bioensaio que este aparelho não desenhou: Mortalidade \(%\)/);
assert(!d.getElementById('downloads').hidden,'o relatório fica pronto mesmo assim');
dom.window.close();
console.log('Relatório com bioensaio: seções no lugar, gráficos SVG em figuras nítidas, Word e Markdown com as figuras, falha de desenho avisada sem derrubar o relatório OK.');
})().catch(e=>{console.error(e);process.exit(1);});
