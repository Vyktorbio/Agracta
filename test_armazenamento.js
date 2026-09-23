/* O armazenamento rápido não pode encher por causa do próprio app.
 *
 * O QUE ACONTECEU (22/09/2026)
 *   O localStorage do celular encheu e finalizar estudo deixou de gravar. O
 *   maior ocupante era o próprio app: safetyBackup guardava até 10 cópias
 *   completas dos dados, sempre que coubessem — comia toda a folga.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] o motor mede, classifica e só chama de descartável o que se refaz;
 *   [2] as cópias de segurança respeitam a folga dos dados: na abertura podem
 *       ser zero; antes de excluir, uma ainda é tentada;
 *   [3] fotos antigas do servidor: só saem as que estão salvas neste aparelho
 *       ou de notas com lápide — nunca as de nota apenas desconhecida.
 *
 * Rodar: node test_armazenamento.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const AC=require('./vendor/armazenamento-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};

console.log('\n[1] motor');
function fakeLS(obj,limite){
  const st=Object.assign({},obj);
  const total=()=>Object.keys(st).reduce((a,k)=>a+k.length+String(st[k]).length,0);
  return {get length(){return Object.keys(st).length;},key:i=>Object.keys(st)[i]||null,
    getItem:k=>k in st?st[k]:null,removeItem:k=>{delete st[k];},
    setItem(k,v){v=String(v);const antes=k in st?k.length+st[k].length:0;
      if(limite&&total()-antes+k.length+v.length>limite){const e=new Error('exceeded the quota');e.name='QuotaExceededError';throw e;}
      st[k]=v;},_st:st};
}
const ls=fakeLS({'iracema-v7':'x'.repeat(2000000),'iracema-safety':'y'.repeat(2500000),'agracta-solo-v1':'z'.repeat(100000),
  'agracta-prancha-handoff':'p'.repeat(50000),'agracta-solo-tabelas-v1':'t'.repeat(30000),'agracta-janela-cache':'j'});
const md=AC.medir(ls);
ok(md.itens[0].chave==='iracema-safety'&&md.porGrupo.seguranca>2500000,'as cópias de segurança aparecem como o maior ocupante');
ok(md.itens.filter(i=>i.descartavel).map(i=>i.chave).sort().join()==='agracta-prancha-handoff,agracta-solo-v1','só consulta de solo e passagem entre telas são descartáveis');
ok(!AC.classificar('agracta-solo-tabelas-v1').descartavel&&!AC.classificar('agracta-janela-cache').descartavel&&!AC.classificar('agracta-calc-drone-Q|S').descartavel,
  'tabelas carregadas, janela de acesso offline e rascunhos NÃO são descartáveis');
ok(AC.copiasPermitidas(2100000,2000000,2000000)===0,'dados de 2 M: nenhuma cópia cabe sem tirar a folga');
ok(AC.copiasPermitidas(300000,250000,250000)===10,'dados pequenos: as 10 cópias cabem');
ok(AC.copiasPermitidas(300000,250000,250000,undefined,3)===3,'e o máximo é respeitado');
const img=AC.imagens({estudos:[{finalizacao:{rubrica:'data:image/png;base64,'+'A'.repeat(500)},avaliacoes:[{carimbo:{rubrica:'data:image/png;base64,'+'B'.repeat(300)}}]}],foto:'data:image/jpeg;base64,'+'C'.repeat(200)});
ok(img.rubricas.n===2&&img.outras.n===1,'conta rubricas e outras imagens embutidas');
const W=10,H=6,px=new Uint8ClampedArray(W*H*4);px[(2*W+3)*4+3]=255;px[(4*W+7)*4+3]=255;
ok(JSON.stringify(AC.caixaDaTinta(px,W,H))==='{"x":3,"y":2,"w":5,"h":3}','caixa da tinta da rubrica');
ok(AC.caixaDaTinta(new Uint8ClampedArray(W*H*4),W,H)===null,'rubrica em branco: sem caixa');

console.log('\n[2] cópias de segurança no app');
function elStub(){return new Proxy(function(){},{get(t,k){if(k==='style'||k==='dataset')return {};
  if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false;}};if(k===Symbol.toPrimitive)return ()=>'';return elStub();},set(){return true;},apply(){return elStub();}});}
function app(lsObj){
  const ctx={console:{log(){},warn(){},error(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},
    Date,JSON,Math,Promise,Object,Array,String,Number,Error,RegExp,Symbol,Proxy,Map,Set,parseInt,parseFloat,isNaN,isFinite,encodeURIComponent,
    alert(){},confirm(){return true;},prompt(){return null;},localStorage:lsObj,
    sessionStorage:{getItem(){return null;},setItem(){}},location:{reload(){},href:'',search:'',hash:''},
    navigator:{onLine:true,userAgent:'node',serviceWorker:{register(){return Promise.resolve();},addEventListener(){}}},
    document:new Proxy({},{get(t,k){if(['createElement','getElementById','querySelector','createElementNS'].includes(k))return ()=>elStub();
      if(['querySelectorAll','getElementsByClassName','getElementsByTagName'].includes(k))return ()=>[];
      if(k==='addEventListener'||k==='removeEventListener')return ()=>{};if(k==='readyState')return 'complete';if(k==='cookie')return '';return elStub();}}),
    addEventListener(){},removeEventListener(){},requestAnimationFrame(){},matchMedia(){return {matches:false,addListener(){},addEventListener(){}};},
    fetch(){return Promise.resolve({json(){return Promise.resolve({});}});}};
  ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('vendor/armazenamento-core.js','utf8'),ctx);
  vm.runInContext(fs.readFileSync('app.js','utf8'),ctx,{filename:'app.js'});
  return src=>vm.runInContext(src,ctx);
}
/* aparelho com dados grandes (~2,2 M caracteres) e teto de 5 M */
const grande=fakeLS({},5000000);
let R=app(grande);
R("data={__config:{}, Q1:{cultura:'soja',estudos:[{id:'S1',codigo:'X',tratamentos:[],aplicacoes:[],avaliacoes:[],obs:'"+'o'.repeat(2200000)+"'}]}};save();");
ok(R("safetyBackup('ao abrir')")===false&&grande.getItem('iracema-safety')===null,'na abertura, com dados grandes: nenhuma cópia (a folga dos dados vem primeiro)');
ok(R("safetyBackup('antes de excluir estudo')")===true&&JSON.parse(grande.getItem('iracema-safety')).length===1,'antes de excluir: uma cópia ainda é feita');
R("safetyBackup('antes de excluir aplicação')");
ok(JSON.parse(grande.getItem('iracema-safety')).length===1,'e não empilha: continua uma');
R("data.Q1.estudos[0].obs+='"+'m'.repeat(300000)+"';");
ok(R("save()")===true,'depois disso o dado ainda cresce e grava (a folga existe)');
/* aparelho com dados pequenos: as cópias continuam como antes */
const pequeno=fakeLS({},5000000);R=app(pequeno);
R("data={__config:{}, Q1:{cultura:'soja',estudos:[]}};save();");
for(let i=0;i<12;i++) R("safetyBackup('ao abrir')");
ok(JSON.parse(pequeno.getItem('iracema-safety')).length===10,'dados pequenos: até 10 cópias, como sempre');

console.log('\n[3] fotos antigas no servidor');
const src=fs.readFileSync('firebase-sync.js','utf8');
const bloco=src.slice(src.indexOf('  window.AgractaFotosAntigas={'),src.indexOf('  var esc = window.esc ||'));
const docs=[{id:'m1',noteId:'N1',data:'a'.repeat(10)},{id:'m2',noteId:'N1',data:'b'},{id:'m3',noteId:'N2',data:'c'},{id:'m4',noteId:'N3',data:'d'},{id:'m5',noteId:'N4',data:'e'}];
const apagados=[];
const sctx={window:{},FB:{user:{},db:{batch:()=>({delete:r=>apagados.push(r.id),commit:()=>Promise.resolve()})}},firebaseInit:()=>true,Promise,Object,
  collectionRef:()=>({get:()=>Promise.resolve({forEach:f=>docs.forEach(d=>f({id:d.id,data:()=>d}))}),doc:id=>({id})})};
vm.createContext(sctx);vm.runInContext(bloco,sctx);
(async()=>{
  const r=await sctx.window.AgractaFotosAntigas.contar(['N1'],['N3']);
  ok(r.apagaveis.sort().join()==='m1,m2,m4','saem: foto salva neste aparelho (N1) e nota com lápide (N3)');
  ok(r.nPendentes===2,'ficam: N2 e N4 — só existem no servidor (N4 é nota que este aparelho nem conhece)');
  await sctx.window.AgractaFotosAntigas.apagar(r.apagaveis);
  ok(apagados.sort().join()==='m1,m2,m4','apaga exatamente as que podem sair');
  const menu=fs.readFileSync('app.js','utf8');
  ok(/openArmazenamento\(\)">'\+ic\('archive'\)\+' Armazenamento do aparelho/.test(menu),'Menu → Armazenamento do aparelho');
  /* A barra de baixo abre a gaveta de ui-campo.js, não o menu antigo: a porta
     tem de existir nos dois, senão ninguém acha (aconteceu em 23/09). */
  const gaveta=fs.readFileSync('ui-campo.js','utf8');
  ok(/agMenuAcao\(\\'openArmazenamento\\'\)/.test(gaveta)&&/agMenuAcao\(\\'openIntegridade\\'\)/.test(gaveta),'gaveta da barra de baixo → Armazenamento e Verificação de integridade');
  ok(/isAdmin\(\)\)\?'<button onclick="armFotosAntigas\(\)"/.test(menu),'fotos antigas no servidor: só o administrador');
  const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
  const v=(html.match(/vendor\/armazenamento-core\.js\?v=\d+/)||[])[0];
  ok(v&&html.indexOf(v)<html.indexOf('app.js?v=')&&sw.indexOf("'./"+v+"'")>=0,'motor carregado antes do app e no pré-cache');
  console.log('\nArmazenamento: '+n+' verificações.');
})().catch(e=>{console.error(e);process.exit(1);});
