'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom'),C=require('./vendor/agenda-google-core.js');
const source=fs.readFileSync('agenda-google.js','utf8');
const item={iso:'2026-10-06',tipo:'av',qid:'Q1',study:{id:'S1',codigo:'TESTE'},ev:{id:'A1',type:'eval',idx:1}};
function setup(){
  const dom=new JSDOM('<!doctype html><html><body><button id="open">Agenda Google</button></body></html>',{url:'https://agracta.test/',runScripts:'dangerously'}),w=dom.window;
  w.AgendaGoogleCore=C;w.AbortController=AbortController;w._authUser={email:'a@example.test'};
  w.LOCAIS={L1:{nome:'Local A'}};w.QLOCAL={Q1:'L1'};w.HOME_LOCAL='L1';w.data={Q1:{estudos:[{id:'S1'}]}};
  w.quadraNome=()=> 'C4';w.agCalItens=()=>[item];
  w.setTimeout=()=>1;w.clearTimeout=()=>{};w.setInterval=()=>1;
  let sent=[];
  w.fetch=async(url,options)=>{
    const p=JSON.parse(options.body);sent.push({url,options,p});
    return {ok:true,json:async()=>({ok:true,protocol:C.PROTOCOL,requestId:p.requestId,action:p.action,eventId:C.eventId(p.key)})};
  };
  w.eval(source);
  const cfg={url:'https://n8n.example.test/webhook/agracta-google-agenda',token:'t'.repeat(48),localId:'L1',auto:false};
  const ck='agracta-agenda-google-config:a@example.test';
  return {dom,w,sent,cfg,ck};
}
(async()=>{
  const x=setup(),w=x.w;
  assert.equal(x.sent.length,0,'Não envia ao carregar o módulo.');
  w.agGoogleAbrir();
  assert.equal(w.document.querySelector('[name=auto]').checked,false);
  assert.match(w.document.getElementById('agGooglePreview').textContent,/1 compromissos/);
  w.localStorage.setItem(x.ck,JSON.stringify(x.cfg));
  await w.AgractaAgendaGoogle.sync(false);assert.equal(x.sent.length,0,'Automático desligado não envia.');
  x.cfg.auto=true;w.localStorage.setItem(x.ck,JSON.stringify(x.cfg));
  await w.AgractaAgendaGoogle.sync(false);assert.equal(x.sent.length,1);
  assert.equal(x.sent[0].options.headers.Authorization,'Bearer '+x.cfg.token);
  assert.equal(x.sent[0].options.redirect,'error');assert.equal(x.sent[0].options.credentials,'omit');
  assert.equal(x.sent[0].p.event.date,'2026-10-06');
  assert.equal(JSON.stringify(w.data).includes(x.cfg.token),false);
  await w.AgractaAgendaGoogle.sync(false);assert.equal(x.sent.length,1,'Mesmo evento não reenviado automaticamente.');
  w.agCalItens=()=>[Object.assign({},item,{iso:'2026-10-07'})];
  await w.AgractaAgendaGoogle.sync(false);assert.equal(x.sent.length,2);assert.equal(x.sent[1].p.key,x.sent[0].p.key);
  w.agCalItens=()=>[];await w.AgractaAgendaGoogle.sync(false);assert.equal(x.sent[2].p.action,'retire');
  w.agCalItens=()=>[item];w.fetch=async()=>{throw Error('rede indisponível');};
  await assert.rejects(w.AgractaAgendaGoogle.sync(false),/rede indisponível/);
  const ledger='agracta-agenda-google-recibos:a@example.test:'+x.cfg.url;
  assert.equal(Object.keys(JSON.parse(w.localStorage.getItem(ledger)).managed).length,0);
  assert.match(w.document.getElementById('agGoogleStatus').textContent,/rede indisponível/);
  w.fetch=async(url,options)=>{const p=JSON.parse(options.body);x.sent.push({p});return {ok:true,json:async()=>({ok:true,protocol:C.PROTOCOL,requestId:p.requestId,action:p.action,eventId:C.eventId(p.key)})};};
  await w.AgractaAgendaGoogle.sync(false);assert.equal(Object.keys(JSON.parse(w.localStorage.getItem(ledger)).managed).length,1);
  w._authUser={email:'b@example.test'};
  await assert.rejects(w.AgractaAgendaGoogle.sync(false),/URL/);
  w.document.documentElement.classList.add('pre-auth');
  await assert.rejects(w.AgractaAgendaGoogle.sync(false),/Entre no Agracta/);
  w.document.documentElement.classList.remove('pre-auth');w._authUser={email:'a@example.test'};
  w.AgractaFirebase={configured:()=>true,status:()=>({ready:false,pendingWrites:0})};
  await assert.rejects(w.AgractaAgendaGoogle.sync(false),/aguarde/);
  w.AgractaAgendaGoogle.close();assert.equal(w.document.getElementById('agGoogleOverlay'),null);
  w.AgractaFirebase=null;
  const y=setup();y.cfg.auto=true;y.w.localStorage.setItem(y.ck,JSON.stringify(y.cfg));
  y.w.fetch=async(url,options)=>{
    const p=JSON.parse(options.body);y.w._authUser={email:'b@example.test'};
    return {ok:true,json:async()=>({ok:true,protocol:C.PROTOCOL,requestId:p.requestId,action:p.action,eventId:C.eventId(p.key)})};
  };
  await y.w.AgractaAgendaGoogle.sync(false);
  assert.equal(y.w.localStorage.getItem('agracta-agenda-google-recibos:b@example.test:'+y.cfg.url),null);
  assert.equal(y.w.localStorage.getItem('agracta-agenda-google-recibos:a@example.test:'+y.cfg.url),null);
  domClose(x);domClose(y);
  console.log('OK: Agenda Google UI — desligada por padrão, isolamento, falha, retomada e sessão.');
})().catch(e=>{console.error(e);process.exitCode=1;});
function domClose(x){x.dom.window.close();}
