/* Regressões da página de leitura: médias, datas, sentido, cegamento e mutações. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{console.log('PULADO: jsdom não está instalado.');process.exit(0);}
(async()=>{
const dom=new JSDOM('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
['vendor/conhecimento-core.js','integracoes.js','estudo-pagina.js'].forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
const src=fs.readFileSync('app.js','utf8');w.eval(src.match(/function _avNota\([^]*?\n}/)[0]);
w.ITENS={};w.QLOCAL={Q1:'l'};w.LOCAIS={l:{nome:'Iracemápolis'}};w.save=()=>{throw Error('Leitura não salva')};let opened=0;w.openStudyDetail=()=>opened++;
const s={id:'S1',codigo:'SC 024 193',cultura:'Soja',alvo:'Phakopsora pachyrhizi',numRepeticoes:4,dataInicio:'2026-08-01',desenho:'dbc',metodoAplicacao:'co2',tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Experimental A',dose:'1,5 L/ha'},{id:'T3',produto:'Padrão de referência',dose:'0,6 L/ha'}],avaliacoes:['2026-08-15','2026-08-22','2026-09-05'].map((data,i)=>({id:'A'+i,data,variaveis:['Severidade','Produção'],tipos:{Severidade:'pct',Produção:'contagem'},varcfg:{Produção:{sentido:'maior',unidade:'kg/ha'}},notas:Object.fromEntries(['T1','T2','T3'].flatMap((t,j)=>[1,2,3,4].map(r=>[t+'R'+r,{Severidade:[25,5,10][j]*i+r-1,Produção:1000+j*100+r}])))}))};
w.data={Q1:{estudos:[s]}};const before=JSON.stringify(w.data);
const q=x=>d.querySelector(x),qa=x=>Array.from(d.querySelectorAll(x)),change=(sel,val)=>{q(sel).value=val;q(sel).dispatchEvent(new w.Event('change',{bubbles:true}));};
w.abrirConhecimento({aba:'estudos'});q('.con-acoes [data-con="estudo"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(opened,0);assert(q('.ep-page'));assert.equal(qa('.ep-line circle').length,9);assert.match(q('.ep-ranking li b').textContent,/T2/);assert.match(q('.ep-ranking li strong').textContent,/11,5/);assert.match(q('.ep-caption').textContent,/05\/09\/2026/);
change('[data-ep="assessment"]','A0');assert.deepEqual(qa('.ep-rank').map(x=>x.textContent),['1','1','1']);
change('[data-ep="variable"]',qa('[data-ep="variable"] option')[1].value);assert.match(q('.ep-ranking li b').textContent,/T3/);assert.equal(JSON.stringify(w.data),before);
change('[data-ep="variable"]',qa('[data-ep="variable"] option')[0].value);
if(process.env.EP_PREVIEW){for(const file of ['integracoes.css','estudo-pagina.css']){const style=d.createElement('style');style.textContent=fs.readFileSync(file,'utf8');d.head.appendChild(style);}fs.writeFileSync(process.env.EP_PREVIEW,dom.serialize());}
s.avaliacoes[2].data='';w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(qa('.ep-line circle').length,6);assert.match(q('.ep-chart').textContent,/sem data/);
s.avaliacoes=[];w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.match(q('#ep-charts-body').textContent,/Ainda não há resultados/);
s.codigo='<img src=x onerror=alert(1)>';w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(qa('.ep-page img').length,0);
w.close();console.log('Página do estudo: abertura, médias, última data, empates, sentido, valores zero, ausência de data, XSS e leitura sem mutação OK.');
})().catch(e=>{console.error(e);process.exit(1)});
