/* Service Worker — Estação Iracemápolis (offline do "casco" do app) */
var CACHE = 'iracema-app-v1';
var ASSETS = [
  './', './index.html',
  './vendor/leaflet.js', './vendor/leaflet.css',
  './vendor/Leaflet.ImageOverlay.Rotated.js',
  './vendor/quadras-default.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ if(k!==CACHE) return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  /* Online sempre: proxy NDVI (8799), tiles do satélite e API do Copernicus */
  if(u.port === '8799' || u.hostname.indexOf('arcgisonline') >= 0 || u.hostname.indexOf('dataspace') >= 0) return;
  e.respondWith(
    caches.match(e.request).then(function(r){
      return r || fetch(e.request).then(function(resp){
        return resp;
      }).catch(function(){ return r; });
    })
  );
});
