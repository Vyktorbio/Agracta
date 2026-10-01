/* Ficha da parcela: tocar numa parcela do croqui da avaliação abre, logo abaixo
   dele, os campos daquela parcela, a foto e a navegação para a vizinha. Os campos
   são os mesmos da tabela e ficam espelhados, para a tabela não apagar o valor. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?source.length:end);}
const dom=new JSDOM('<!doctype html><html><body><fieldset id="avFs"><div id="avGridWrap"></div></fieldset></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.eval('var _avGrid={variaveis:["Severidade","Plantas","Doentes"],notas:{T1R2:{Severidade:"20"}},tipos:{Plantas:"contagem"},meta:{},varcfg:{},bruto:{}};var _avAuto={on:false,pos:0};var _avCroquiOpen=true,_avCroquiKey=null;');
w._avCfg=(g,v)=>v==='Doentes'?{tipo:'razao',sub:1,N:10}:{tipo:g.tipos[v]==='contagem'?'contagem':'pct',sub:1};
w._avSubCheias=()=>0;w.AvaliacaoCore=require('./vendor/avaliacao-core');
w.eval(fn('_avDerSuf'));
const rows=[['T1',1],['T1',2],['T2',1]].map(([t,r])=>({key:t+'R'+r,tratId:t,rep:r,repDisplay:'abc'[r-1],campo:t.slice(1)+'ABC'[r-1],produto:'Produto '+t}));
w._avStudy=()=>({id:'S'});w._avRowsForStudy=()=>rows;
const selecionadas=[];w.avCroquiSelect=k=>{selecionadas.push(k);w.eval('_avCroquiKey='+JSON.stringify(k));};
let persistidos=0;w._avPersistNow=()=>persistidos++;w._stxToast=()=>{};w._avWriteBruto=(t,v,b,val)=>val;w._avRefreshDer=()=>{};
['_avCellHtml','_avFichaHtml','avFichaIr','_avEspelhar','avValidateCell'].forEach(n=>w.eval(fn(n)));
const wrap=d.getElementById('avGridWrap');
const pinta=()=>{wrap.innerHTML=w._avFichaHtml(rows,w._avGrid.variaveis)+'<table class="av-table"><tr><td>'+w._avCellHtml(rows[1],'Severidade')+'</td></tr></table>';};

assert.equal(w._avFichaHtml(rows,w._avGrid.variaveis),'','sem parcela tocada não há ficha');
w.eval('_avCroquiKey="T1R2"');pinta();
const ficha=d.getElementById('avFicha');assert(ficha,'a ficha aparece');
assert.match(ficha.textContent,/1B/);assert.match(ficha.textContent,/2 de 3/);assert.match(ficha.textContent,/Produto T1/);
assert.equal(ficha.querySelector('[data-v="Severidade"]').value,'20','traz o valor já lançado');
assert.equal(ficha.querySelectorAll('[data-v="Doentes"]').length,2,'razão n/N usa os mesmos dois campos da tabela');
assert.equal(ficha.querySelector('.av-photo-btn').dataset.avPhoto,'T1R2','foto da mesma parcela');
assert.equal(ficha.querySelector('.av-foto-n').dataset.avFotos,'T1R2','contador de fotos da mesma parcela, ao lado do botão');
const [ant,,prox]=ficha.querySelectorAll('.av-ficha-nav button:not(.av-foto-n)');assert.match(ant.textContent,/1A/);assert.match(prox.textContent,/2A/);

/* Digitar na ficha espelha na tabela, inclusive apagar. */
const naFicha=ficha.querySelector('[data-v="Severidade"]'),naTabela=d.querySelector('.av-table [data-v="Severidade"]');
naFicha.value='35';naFicha.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(naTabela.value,'35');
naFicha.value='';naFicha.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(naTabela.value,'');
naFicha.value='150';w.avValidateCell(naFicha);assert.equal(naFicha.value,'100');assert.equal(naTabela.value,'100','o valor ajustado também é espelhado');assert.equal(persistidos,1);

/* Enter: próximo campo; no último, próxima parcela. */
naFicha.focus();naFicha.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
assert.equal(d.activeElement.dataset.v,'Plantas');
const ultimo=Array.from(ficha.querySelectorAll('.av-cell')).pop();ultimo.focus();
ultimo.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.deepEqual(selecionadas,['T2R1']);
pinta();const fim=d.getElementById('avFicha').querySelectorAll('.av-ficha-nav button:not(.av-foto-n)')[2];assert(fim.disabled,'na última parcela não há próxima');

/* No modo automático a caixa dele já é a ficha. */
w.eval('_avAuto.on=true');assert.equal(w._avFichaHtml(rows,w._avGrid.variaveis),'');
console.log('Ficha da parcela: abre pelo croqui, mostra valores, espelha na tabela, Enter avança, foto e navegação OK.');

/* O modo guiado não muda o delineamento, nem depende de modelo randomizado. */
w.eval('var stGuiado={id:"S",randomizado:false,numRepeticoes:2,tratamentos:[{id:"T1"},{id:"T2"}]};');
w._avStudy=()=>w.stGuiado;
w.ensureStudyRandomizacao=()=>{throw Error('Não deve randomizar o estudo ao ligar o modo guiado');};
w._avCss=()=>{};w.avCroquiHtml=()=>'';w._avSyncInputs=()=>{};
w._avUsaBruto=c=>c.tipo==='razao'||c.tipo==='escala'||c.sub>1;
['_avLegendaHtml','_avAutoRows','_avAutoSteps','_avAutoState','_avStepVal','renderAvAutoBox','renderAvGrid','avAutoToggle'].forEach(n=>w.eval(fn(n)));
w._avGrid.bruto={};w._avGrid.varcfg={Doentes:{naTratamentos:['T1']}};
w._avAuto.on=false;w.renderAvGrid();assert.ok(d.querySelector('.av-auto-toggle'),'botão sem randomização');
w.avAutoToggle();assert.equal(w._avAuto.on,true);assert.equal(w.stGuiado.randomizado,false);assert.ok(d.getElementById('avAutoInput'));
assert.ok(w._avAutoSteps().every(s=>!(s.v==='Doentes'&&s.row.tratId==='T1')),'modo guiado pula não aplicáveis');
w.stGuiado.ambiente='laboratorio';w.renderAvGrid();assert.ok(d.getElementById('avAutoInput'),'mesmo modo guiado na bancada');
w.avAutoToggle();assert.equal(w._avAuto.on,false);assert.equal(w.stGuiado.randomizado,false);
console.log('Modo automático disponível no campo e laboratório sem randomizar; NA excluído da sequência OK.');
dom.window.close();
