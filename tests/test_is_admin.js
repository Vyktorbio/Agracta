/* Reconhecimento de administrador: configuração local não concede privilégios. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('app.js','utf8');
const base=app.slice(app.indexOf('function isAdmin(){'),app.indexOf('function toggleMainMenu(){'));
const c={console,Promise,setTimeout:()=>0,clearTimeout:()=>{},Date,JSON,
  localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
  sessionStorage:{getItem:()=>null,setItem:()=>{}},
  document:{addEventListener:()=>{},getElementById:()=>null,querySelector:()=>null},
  addEventListener:()=>{},data:{__config:{}},_authUser:null};
c.window=c;
vm.createContext(c);
vm.runInContext(base,c);
const admins=['machadovictorchaves@gmail.com'];
function checkBase(){
  for(const email of admins){
    c._authUser={email};assert.equal(c.isAdmin(),true,email);
    c._authUser={email:' '+email.toUpperCase()+' '};assert.equal(c.isAdmin(),true,'normalização');
  }
  c.data.__config.adminEmail='tecnico@example.test';
  c._authUser={email:'tecnico@example.test'};c._adminUnlocked=true;
  assert.equal(c.isAdmin(),false,'configuração e painel destravado não elevam técnico');
  for(const email of ['vyktorbio@gmail.com','',null,{},'constructor','__proto__','vyktorbio@gmail.com.evil.test']){
    c._authUser={email};assert.equal(c.isAdmin(),false,'identidade inválida não concede admin');
  }
  c._authUser=null;assert.equal(c.isAdmin(),false,'sem identidade');
}
checkBase();
vm.runInContext(fs.readFileSync('firebase-sync.js','utf8').replace('  var ROOT=', '  window.__testFB=FB;var ROOT='),c);
checkBase();
for(const email of admins){
  c.__testFB.user={email};c._authUser={email:'tecnico@example.test'};
  assert.equal(c.isAdmin(),true,'admin Firebase prevalece');
}
for(const email of ['vyktorbio@gmail.com','tecnico@example.test','','constructor','__proto__',null,{}]){
  c.__testFB.user={email};c._authUser={email:admins[0]};
  assert.equal(c.isAdmin(),false,'sessão não admin prevalece sobre identidade local antiga');
}
c.__testFB.user=null;
c._authUser={email:admins[0],offline:true};
assert.equal(c.isAdmin(),true,'administrador reconhecido na sessão offline');
c._authUser=null;assert.equal(c.isAdmin(),false,'sem sessão não herda painel destravado');
console.log('isAdmin: identidades fixas, sessão ativa, offline e tentativas de elevação OK.');
