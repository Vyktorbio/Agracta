/* Service Worker — Agracta
   - HTML (navegação): network-first (sempre pega a versão nova online; cache só como reserva offline)
   - Estáticos (vendor, ícones): cache-first
   - Nunca intercepta o proxy NDVI / tiles do satélite / Copernicus */
var CACHE = 'agracta-app-v296';
var PYO_CACHE = 'agracta-pyodide-v1'; /* Pyodide pesado (~115MB) — cache próprio, persiste entre updates do app */
var ASSETS = [
  './interface-neutra.css?v=3', './clima-pagina.css?v=4', './clima-pagina.js?v=2',
  './relatorio-estudo.js?v=1', './relatorio-local.html', './relatorio-local.js?v=1', './relatorio-local.css?v=1', './vendor/relatorio-core.js?v=2', './vendor/relatorio-docx.js?v=1',
  './galeria-fotos.js?v=3', './galeria-local.html', './galeria-local.js?v=3', './galeria-local.css?v=1', './vendor/fotos-store.js?v=1', './vendor/fotos-pptx.js?v=1',
  './croqui-parcelas.js?v=2', './croqui-parcelas.css?v=1',
  './profundidade.css?v=1',
  './estudo-pagina.js?v=17', './estudo-pagina.css?v=8',
  /* Vista do campo em 3D: carregada sob demanda pelo estudo-pagina.js, nunca
     no index.html. Fica no pre-cache para abrir offline sem pesar o arranque.
     Sem aspas neste comentario: o portao le strings entre aspas como se fossem
     arquivos da lista. */
  './campo-3d.js?v=9', './campo-3d.css?v=8',
  './vendor/drone-core.js?v=2', './calculadora-drone.js?v=3',
  './', './index.html',
  './integracoes.css?v=4', './integracoes.js?v=11', './integracoes-fontes.js?v=1', './integracoes-clientes.js?v=1',
  './vendor/avaliacao-core.js?v=1', './vendor/pendencias-core.js?v=1', './vendor/conhecimento-core.js?v=1', './vendor/mascara-core.js?v=1', './vendor/croqui-campo-core.js?v=3', './vendor/fontes-core.js?v=1', './vendor/portal-core.js?v=1',
  './cliente.html', './cliente.js?v=1',
  /* MANTER igual ao index.html: o pré-cache é por URL, então uma versão
     defasada aqui pré-carrega um arquivo que ninguém mais pede. */
  './styles.css?v=32', './theme-2026.css?v=9', './ui-campo.css?v=11', './app.js?v=177',
  './vendor/leaflet.js', './vendor/leaflet.css',
  './vendor/leaflet-rotate.js',
  './vendor/Leaflet.ImageOverlay.Rotated.js',
  './vendor/quadras-default.js?v=2', './vendor/biocalc-campo-core.js?v=8', './vendor/aplicacao-core.js?v=1', './vendor/nutricao-core.js', './vendor/concordancia-core.js', './vendor/dose-core.js?v=6', './vendor/consumo-core.js', './vendor/protocolo-core.js', './vendor/protocolo-vivo-core.js?v=1', './vendor/versoes-core.js?v=1', './vendor/fotos-notas-core.js?v=1', './vendor/arena-core.js?v=1', './vendor/agrofit-core.js?v=2', './vendor/ativos-en-core.js?v=1', './vendor/bbch-core.js?v=2', './vendor/janela-core.js?v=1', './vendor/historico-core.js?v=1', './data/agrofit.json?v=1', './data/agrofit-culturas.json?v=1', './vendor/biocalc-lab-core.js?v=3', './vendor/supabase.js', './vendor/xlsx.full.min.js', './vendor/jszip.min.js',
  './vendor/firebase-app-compat.js', './vendor/firebase-auth-compat.js',
  './vendor/firebase-firestore-compat.js', './firebase-config.js', './firebase-sync.js?v=15',
  './acesso-horario.js?v=3', './ui-campo.js?v=22', './alvos-catalogo.js?v=2',
  './manifest.webmanifest', './icon-192.png?v=3', './icon-512.png?v=3',
  /* Núcleo estatístico auditado + as pranchas de figura do relatório */
  './estatistica.js', './croqui.html', './prancha.html',
  /* Shell do BioEstat embutido (estatística). Pyodide pesado fica em cache próprio (runtime, 1º uso). */
  './estatistica/index.html', './estatistica/app.js', './estatistica/styles.css',
  './estatistica/exemplos.js', './estatistica/lib/xlsx.full.min.js',
  './modelos/modelo-protocolo.xls', './modelos/protocolo-sinergista.xlsx'
];
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
/* CADA MÓDULO LIMPA SÓ A PRÓPRIA CASA.
   O CacheStorage é da ORIGEM, não do escopo: este service worker e o da
   estatística (/estatistica/sw.js) enxergam exatamente a mesma lista de
   caches. Enquanto a faxina era "apague tudo que não seja meu", os dois se
   apagavam: abrir a estatística jogava fora o cache do app, e abrir o app
   jogava fora o da estatística — junto com os ~115MB do Pyodide, que levam
   uma conexão boa para voltar. Nada disso dá erro na tela; aparece no
   talhão, sem sinal, quando o app não abre.
   Agora a faxina é por PREFIXO: cada um só apaga as versões velhas de si
   mesmo. O PYO_CACHE já fica de fora do prefixo de propósito (é 'pyodide',
   não 'app'), e o teste continua guardando os dois. */
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){
      if(/^agracta-app-v/.test(k) && k!==CACHE && k!==PYO_CACHE) return caches.delete(k);
    }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  /* Online sempre (sem cache): proxy NDVI, tiles do satélite e Copernicus */
  if(u.port === '8799' || u.hostname.indexOf('onrender.com') >= 0 || u.hostname.indexOf('supabase.co') >= 0 ||
     u.hostname.indexOf('googleapis.com') >= 0 || u.hostname.indexOf('firebaseio.com') >= 0 ||
     u.hostname.indexOf('arcgisonline') >= 0 || u.hostname.indexOf('google.com') >= 0 || u.hostname.indexOf('dataspace') >= 0 ||
     u.hostname.indexOf('embrapa.br') >= 0) return;  /* GeoInfo: tiles e consulta de solo */
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
  /* Folhas de figura: são documento próprio, NÃO o shell do app. Abertas em
     iframe elas chegam com mode==='navigate' e caíam no ramo do index abaixo,
     que grava a resposta na chave './index.html' — ou seja, abrir a prancha
     sobrescrevia o app no cache. Rede primeiro, cache só como reserva offline,
     cada uma na sua própria chave. */
  if(/\/(prancha|croqui|cliente|galeria-local|relatorio-local)\.html$/.test(u.pathname)){
    var chave = u.origin + u.pathname;
    e.respondWith(
      fetch(e.request).then(function(resp){
        if(resp && resp.ok){ var cp=resp.clone(); caches.open(CACHE).then(function(c){ c.put(chave, cp); }); }
        return resp;
      }).catch(function(){ return caches.match(chave); })
    );
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
