'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class Emitter{constructor(){this.listeners={};}on(k,f){(this.listeners[k]||=[]).push(f);}emit(k,v){for(const f of this.listeners[k]||[])f(v);}}
const peers=[],intervals=[],timeouts=[],events={},docEvents={};let bundles=0;
class Conn extends Emitter{constructor(peer){super();this.peer=peer;this.open=false;this.closed=0;}close(){this.closed++;this.emit('close');}send(){this.sent=(this.sent||0)+1;}}
class Peer extends Emitter{constructor(id){super();this.id=id;this.conns=[];this.destroys=0;peers.push(this);}connect(id){const c=new Conn(id);this.conns.push(c);return c;}destroy(){this.destroys++;assert.ok(this.destroys<3,'destroy não recursa');this.destroyed=true;for(const c of this.conns)c.close();this.emit('close');}}
const c={console,Promise,Date,Math,crypto:require('node:crypto').webcrypto,Peer,
 document:{hidden:false,addEventListener:(k,f)=>docEvents[k]=f},
 setInterval:(fn,ms)=>{const t={fn,ms};intervals.push(t);return t;},clearInterval:t=>{if(t)t.cancelled=true;},
 setTimeout:(fn,ms)=>{const t={fn,ms};timeouts.push(t);return t;},clearTimeout:t=>{if(t)t.cancelled=true;},
 addEventListener:(k,f)=>events[k]=f,
 AgractaBundleEngine:{canStart:()=>true,registerPeer:()=>Promise.resolve(),removePeer:()=>Promise.resolve(),verifyPeer:()=>Promise.resolve(true),refreshPeer:()=>Promise.resolve(),getCurrentBundle:()=>{bundles++;return Promise.resolve({});}}};
c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('P2p Sync.js','utf8'),c);
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
(async()=>{
 events['agracta:cloud-ready']();await flush();const first=peers[0];first.emit('open',first.id);await flush();
 assert.equal(first.conns.length,7);
 const discover=intervals.find(t=>t.ms===25000);
 for(let i=0;i<30;i++)discover.fn();
 assert.equal(first.conns.length,7,'conexões pendentes não se multiplicam a cada descoberta');
 events['agracta:sincronizado']();events['agracta:local-change']();
 for(const t of timeouts)if(!t.cancelled&&t.ms===60)t.fn();await flush();
 assert.equal(bundles,0,'sem pares autenticados não monta cópias completas do estado');
 const conn=first.conns[0];conn.open=true;conn.emit('open');
 conn.emit('data',{t:'MSG',d:JSON.stringify({type:'AUTH',sessionToken:'token'})});await flush();
 for(const n of [NaN,1.5])assert.doesNotThrow(()=>conn.emit('data',{t:'CHK',id:'ruim',i:0,n,c:'x'}));
 const sent=conn.sent;conn.bufferSize=1;
 assert.equal(c.AgractaP2P.broadcastBundle({flat:{},rev:1}),0,'fila ocupada não acumula snapshots');
 assert.equal(conn.sent,sent);conn.bufferSize=0;conn.dataChannel={bufferedAmount:3000000};
 assert.equal(c.AgractaP2P.broadcastBundle({flat:{},rev:1}),0,'buffer cheio preserva memória');
 conn.dataChannel.bufferedAmount=0;assert.equal(c.AgractaP2P.broadcastBundle({flat:{},rev:1}),1);
 events.pagehide();assert.equal(first.destroys,1,'fechar libera o peer sem recursão');
 assert.equal(c.AgractaP2P.status().ready,false);
 events.pageshow();await flush();const second=peers[1];second.emit('error',{type:'server-error'});
 assert.equal(second.destroys,1,'falha antes de abrir libera recursos do peer');
 c.document.hidden=true;docEvents.visibilitychange();const before=peers.length;
 intervals.find(t=>t.ms===2500).fn();await flush();assert.equal(peers.length,before,'segundo plano não recria conexões');
 console.log('P2P: 30 descobertas sem crescimento, liberação sem recursão, falha de partida e suspensão OK.');
})().catch(e=>{console.error(e);process.exitCode=1;});
