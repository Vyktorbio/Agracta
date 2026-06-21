/* Service Worker — Agracta
   - HTML (navegação): network-first (sempre pega a versão nova online; cache só como reserva offline)
   - Estáticos (vendor, ícones): cache-first
   - Nunca intercepta o proxy NDVI / tiles do satélite / Copernicus */
var CACHE = 'agracta-app-v62';
var PYO_CACHE = 'agracta-pyodide-v1'; /* Pyodide pesado (~115MB) — cache próprio, persiste entre updates do app */
var ASSETS = [
  './', './index.html',
  './vendor/leaflet.js', './vendor/leaflet.css',
  './vendor/leaflet-rotate.js',
  './vendor/Leaflet.ImageOverlay.Rotated.js',
  './vendor/quadras-default.js', './vendor/biocalc-campo-core.js', './vendor/supabase.js', './vendor/xlsx.full.min.js',
  './vendor/firebase-app-compat.js', './vendor/firebase-auth-compat.js',
  './vendor/firebase-firestore-compat.js', './firebase-config.js', './firebase-sync.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  /* Shell do BioEstat embutido (estatística). Pyodide pesado fica em cache próprio (runtime, 1º uso). */
  './estatistica/index.html', './estatistica/app.js', './estatistica/styles.css',
  './estatistica/exemplos.js', './estatistica/lib/xlsx.full.min.js',
  './modelos/modelo-protocolo.xls'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ if(k!==CACHE && k!==PYO_CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  /* Online sempre (sem cache): proxy NDVI, tiles do satélite e Copernicus */
  if(u.port === '8799' || u.hostname.indexOf('onrender.com') >= 0 || u.hostname.indexOf('supabase.co') >= 0 ||
     u.hostname.indexOf('googleapis.com') >= 0 || u.hostname.indexOf('firebaseio.com') >= 0 ||
     u.hostname.indexOf('arcgisonline') >= 0 || u.hostname.indexOf('google.com') >= 0 || u.hostname.indexOf('dataspace') >= 0) return;
  /* BioEstat embutido — Pyodide pesado (~115MB): cache PRÓPRIO persistente. 1º uso baixa (precisa de net), depois offline. */
  if(u.pathname.indexOf('/estatistica/pyodide/') >= 0){
    e.respondWith(caches.open(PYO_CACHE).then(function(c){
      return c.match(e.request).then(function(r){
        return r || fetch(e.request).then(function(resp){ if(resp && resp.ok) c.put(e.request, resp.clone()); return resp; });
      });
    }));
    return;
  }
  /* Resto do BioEstat (shell + motor .py): cache-first, runtime-cache o que faltar (NÃO cai no index do Agracta). */
  if(u.pathname.indexOf('/estatistica/') >= 0){
    e.respondWith(caches.match(e.request).then(function(r){
      return r || fetch(e.request).then(function(resp){ if(resp && resp.ok){ var copy=resp.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); } return resp; });
    }));
    return;
  }
  var isHTML = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');
  if(isHTML){
    e.respondWith(
      fetch(e.request).then(function(resp){
        var copy = resp.clone();
        caches.open(CACHE).then(function(c){ c.put('./index.html', copy); });
        return resp;
      }).catch(function(){ return caches.match('./index.html').then(function(r){ return r || caches.match('./'); }); })
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request); }));
});
