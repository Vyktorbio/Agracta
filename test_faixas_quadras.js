/* Quadras do ensaio em faixas, agrupadas por LOCAL.
 *
 * Nome de quadra repete entre locais de proposito — existe A1 em Iracemapolis
 * e A1 em Anapolis. Numa lista plana isso vira duas linhas "A1" sem nenhuma
 * pista de qual e qual, e o usuario amarra o tratamento na quadra errada.
 *
 * O contrato que estes testes protegem:
 *   - as quadras saem agrupadas por local, com o local ATIVO primeiro;
 *   - quadra de laboratorio nao entra (nao se aplica produto num laboratorio);
 *   - dentro do grupo, ordem alfabetica;
 *   - nome repetido entre locais e distinguivel.
 *
 * Rodar: node test_faixas_quadras.js
 */
var fs=require('fs'),vm=require('vm');
function elStub(){ return new Proxy(function(){},{get:function(t,k){ if(k==='style')return{}; if(k==='classList')return{add:function(){},remove:function(){},toggle:function(){},contains:function(){return false}}; if(k==='value'||k==='textContent'||k==='innerHTML')return''; if(k==='children'||k==='childNodes')return[]; return elStub(); },set:function(){return true},apply:function(){return elStub()}}); }
var ctx={console:console,Promise:Promise,setTimeout:setTimeout,clearTimeout:clearTimeout,setInterval:function(){},clearInterval:function(){},Date:Date,JSON:JSON,Object:Object,Array:Array,String:String,Number:Number,Math:Math,RegExp:RegExp,Error:Error,isNaN:isNaN,parseInt:parseInt,parseFloat:parseFloat,isFinite:isFinite,encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,alert:function(){},confirm:function(){return true},prompt:function(){return''}};
ctx.window=ctx;ctx.globalThis=ctx;ctx.self=ctx;
ctx.btoa=function(s){return Buffer.from(s,'binary').toString('base64')};ctx.atob=function(s){return Buffer.from(s,'base64').toString('binary')};
ctx.localStorage={getItem:function(){return null},setItem:function(){},removeItem:function(){}};
ctx.sessionStorage={getItem:function(){return null},setItem:function(){}};
ctx.location={reload:function(){},href:'',search:'',hash:''};
ctx.navigator={onLine:true,userAgent:'node',serviceWorker:{register:function(){return Promise.resolve()},addEventListener:function(){}}};
ctx.document=new Proxy({},{get:function(t,k){ if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS')return function(){return elStub()}; if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName')return function(){return []}; if(k==='addEventListener'||k==='removeEventListener')return function(){}; if(k==='body'||k==='documentElement'||k==='head')return elStub(); if(k==='visibilityState')return'visible'; if(k==='cookie')return''; return elStub(); }});
ctx.addEventListener=function(){};ctx.removeEventListener=function(){};ctx.requestAnimationFrame=function(){};
ctx.matchMedia=function(){return{matches:false,addListener:function(){},addEventListener:function(){}}};
ctx.fetch=function(){return Promise.resolve({json:function(){return Promise.resolve({})}})};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx,{filename:'app.js'});
var C=ctx;
/* dois locais, com uma quadra de nome REPETIDO entre eles */
C.LOCAIS={ira:{nome:'Iracemápolis',centro:[-22.6,-47.5]}, ana:{nome:'Anápolis',centro:[-16.3,-48.9]}, bos:{nome:'Bosqueiro',centro:[-22.7,-47.6]}};
C.QLOCAL={A1:'ira', B2:'ira', A1_ana:'ana', C9:'ana', BQ1:'bos', BQ2:'bos', BQ3:'bos', LAB1:'ira'};
C.QNOME={A1:'A1', B2:'B2', A1_ana:'A1', C9:'C9', BQ1:'Bosqueiro 1', BQ2:'Bosqueiro 2', BQ3:'Bosqueiro 3', LAB1:'Lab. Entomologia'};
C.data={A1:{estudos:[]},B2:{estudos:[]},A1_ana:{estudos:[]},C9:{estudos:[]},BQ1:{estudos:[]},BQ2:{estudos:[]},BQ3:{estudos:[]},LAB1:{estudos:[],tipo:'lab',labTipo:'Entomologia'},__config:{}};
C.localAtivo='bos';
var g=C._seQuadrasPorLocal();
var f=0,p=0; function ck(c,n){ if(c){p++;console.log('  ok    '+n)}else{f++;console.log('  FALHA '+n)} }
console.log('Agrupamento por local');
ck(g.length===3,'três locais  ('+g.length+')');
ck(g[0].local==='Bosqueiro','o local ATIVO vem primeiro: '+g[0].local);
ck(g[1].local==='Anápolis' && g[2].local==='Iracemápolis','os demais em ordem alfabética');
var todas=[].concat.apply([],g.map(function(x){return x.quadras}));
ck(todas.length===7,'as 7 quadras de campo entram  ('+todas.length+')');
ck(!todas.some(function(o){return o.id==='LAB1'}),'o laboratório NÃO entra (não se aplica produto nele)');
console.log('Nome repetido entre locais');
var a1=todas.filter(function(o){return o.nome==='A1'});
ck(a1.length===2,'existem duas quadras chamadas A1');
ck(a1[0].id!==a1[1].id,'com ids diferentes: '+a1.map(function(o){return o.id}).join(' e '));
var loc={}; g.forEach(function(x){x.quadras.forEach(function(o){loc[o.id]=x.local})});
ck(loc.A1==='Iracemápolis' && loc.A1_ana==='Anápolis','cada A1 no seu local');
console.log('Ordem dentro do grupo');
var bosq=g[0].quadras.map(function(o){return o.nome});
ck(bosq.join(',')==='Bosqueiro 1,Bosqueiro 2,Bosqueiro 3','alfabética dentro do local: '+bosq.join(', '));
console.log('\n'+(f?f+' FALHA(S)':p+' verificações, nenhuma falha.'));
process.exit(f?1:0);
