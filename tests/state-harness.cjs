'use strict';
const fs=require('fs'),vm=require('vm');
exports.createContext=function(){
function elStub(){
  return new Proxy(function(){}, {
    get: function(t, k){
      if(k === 'style') return {};
      if(k === 'classList') return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}};
      if(k === 'value' || k === 'textContent' || k === 'innerHTML') return '';
      if(k === 'children' || k === 'childNodes') return [];
      return elStub();
    },
    set: function(){ return true; },
    apply: function(){ return elStub(); }
  });
}

var store = {'iracema-v7':'{}'};
var timers=[];
var context = {
  console: console, Promise: Promise, setTimeout:function(fn,ms){var t={fn:fn,ms:ms};timers.push(t);return t;}, clearTimeout:function(t){if(t)t.cancelled=true;},
  setInterval: function(){}, clearInterval: function(){}, Date: Date, JSON: JSON,
  Object: Object, Array: Array, String: String, Number: Number, Math: Math, RegExp: RegExp,
  Error: Error, TypeError: TypeError, TextEncoder: TextEncoder, isNaN: isNaN, parseInt: parseInt, parseFloat: parseFloat,
  encodeURIComponent: encodeURIComponent, decodeURIComponent: decodeURIComponent,
  escape: escape, unescape: unescape, Buffer: Buffer,
  alert: function(){}, confirm: function(){ return true; }, prompt: function(){ return ''; }
};
context.AGRACTA_FIREBASE_CONFIG={};
context.window = context; context.globalThis = context; context.self = context;
context.btoa = function(s){ return Buffer.from(s, 'binary').toString('base64'); };
context.atob = function(s){ return Buffer.from(s, 'base64').toString('binary'); };
context.localStorage = {
  getItem: function(k){ return store[k] == null ? null : store[k]; },
  setItem: function(k, v){ store[k] = String(v); },
  removeItem: function(k){ delete store[k]; }
};
context.sessionStorage = { getItem: function(){ return null; }, setItem: function(){} };
context.location = { reload: function(){}, href: '', search: '', hash: '' };
context.navigator = { onLine: true, userAgent: 'node', serviceWorker: {register: function(){ return Promise.resolve(); }, addEventListener: function(){}} };
context.document = new Proxy({}, {
  get: function(t, k){
    if(Object.prototype.hasOwnProperty.call(t,k))return t[k];
    if(k === 'createElement' || k === 'getElementById' || k === 'querySelector' || k === 'createElementNS') return function(){ return elStub(); };
    if(k === 'querySelectorAll' || k === 'getElementsByClassName' || k === 'getElementsByTagName') return function(){ return []; };
    if(k === 'addEventListener' || k === 'removeEventListener') return function(){};
    if(k === 'body' || k === 'documentElement' || k === 'head') return elStub();
    if(k === 'visibilityState') return 'visible';
    if(k === 'cookie') return '';
    return elStub();
  }
});
context.addEventListener = function(){}; context.removeEventListener = function(){};
context.dispatchEvent=function(){};context.CustomEvent=function(type,options){this.type=type;this.detail=options&&options.detail;};
context.requestAnimationFrame = function(){};
context.matchMedia = function(){ return {matches:false, addListener:function(){}, addEventListener:function(){}}; };
context.fetch = function(){ return Promise.resolve({json: function(){ return Promise.resolve({}); }}); };

context.indexedDB=new (require('fake-indexeddb').IDBFactory)();
vm.createContext(context);
/* Os motores que alteram os dados de sincronização precedem app.js, como no index. */
vm.runInContext(fs.readFileSync('vendor/versoes-core.js', 'utf8'), context, {filename:'vendor/versoes-core.js'});
vm.runInContext(fs.readFileSync('vendor/fotos-notas-core.js', 'utf8'), context, {filename:'vendor/fotos-notas-core.js'});
vm.runInContext(fs.readFileSync('app.js', 'utf8'), context, {filename: 'app.js'});
vm.runInContext(fs.readFileSync('firebase-sync.js', 'utf8').replace("  var ROOT=","  window.__testFB=FB;var ROOT="), context, {filename: 'firebase-sync.js'});


context.__timers=timers;context.__store=store;return context;
};
