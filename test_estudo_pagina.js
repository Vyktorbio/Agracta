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
s.avaliacoes[2].data='';w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(qa('.ep-line circle').length,6);assert.match(q('.ep-line').closest('.ep-chart').textContent,/sem data/);
s.avaliacoes=[];w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.match(q('#ep-charts-body').textContent,/Ainda não há resultados/);
s.codigo='<img src=x onerror=alert(1)>';w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(qa('.ep-page img').length,0);
// Uma repetição e grade parcial produzem valores descritivos e Abbott.
w.eval(src.match(/function _pctCtrl\([^]*?\n}/)[0]);
s.codigo='Ensaio único';s.numRepeticoes=1;s.avaliacoes=[{id:'U1',data:'2026-09-10',variaveis:['Severidade'],tipos:{Severidade:'pct'},notas:{T1R1:{Severidade:40},T2R1:{Severidade:10},T3R1:{Severidade:0}}}];
const single=JSON.stringify(w.data);w.abrirConhecimento({qid:'Q1',sid:'S1'});
assert.equal(qa('.ep-grouped .ep-bar').length,3);assert.deepEqual(qa('.ep-grouped .ep-bar').map(x=>Number(x.dataset.value)),[40,10,0]);
assert.match(q('.ep-grouped figcaption').textContent,/Uma repetição/);
change('[data-ep="barMetric"]','controle');assert.deepEqual(qa('.ep-grouped .ep-bar').map(x=>Number(x.dataset.value)),[75,100]);
q('.ep-grouped .ep-bar').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.match(q('.ep-bar-detail').textContent,/Abbott: 75 %.*n = 1/);
assert.equal(JSON.stringify(w.data),single);
s.numRepeticoes=4;w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.deepEqual(qa('.ep-grouped .ep-bar').map(x=>Number(x.dataset.n)),[1,1]);
s.avaliacoes[0].notas.T1R1.Severidade=0;w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(qa('.ep-grouped .ep-bar').length,0);assert.equal(qa('.ep-bar-missing').length,3);
// Páginas de alvo mantêm um gráfico independente por estudo.
const other=JSON.parse(JSON.stringify(s));other.id='S2';other.codigo='Outro estudo';w.data.Q1.estudos.push(other);
w.abrirConhecimento({aba:'alvos'});q('[data-con="selecionar"]').click();await new Promise(r=>setTimeout(r,0));assert.equal(qa('.ep-comparison').length,2);
w.close();console.log('Barras agrupadas: uma repetição, zero, Abbott, grade parcial e estudos separados OK.');console.log('Página do estudo: abertura, médias, última data, empates, sentido, valores zero, ausência de data, XSS e leitura sem mutação OK.');
})().catch(e=>{console.error(e);process.exit(1)});
