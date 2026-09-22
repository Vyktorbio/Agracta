/* Service worker - cache local do app.
   App shell, ícones, fontes, bioengine e Pyodide ficam em cache para uso offline. */
const CACHE = "bioensaio-v50-modulos";
const SHELL = [
  "../interface-neutra.css?v=1",
  /* MANTER igual ao estatistica/index.html: o pré-cache é por URL. Uma versão
     defasada aqui pré-carrega um arquivo que ninguém mais pede, e deixa sem
     pré-carga justamente o que o HTML vai buscar — a casa parece offline e
     não está. O portão passa a conferir este pareamento (conferir.sh). */
  "./", "./index.html", "./styles.css?v=bioensaio-auditoria-12", "./app.js?v=bioensaio-auditoria-14", "./exemplos.js?v=bioensaio-auditoria-12",
  "./manifest.webmanifest", "./manifest.webmanifest?v=bioensaio-auditoria-12",
  "./fonts/inter.woff2", "./fonts/sora.woff2",
  "./lib/xlsx.full.min.js",
  "./pyodide/pyodide.js", "./pyodide/pyodide.asm.js", "./pyodide/pyodide.asm.wasm",
  "./pyodide/python_stdlib.zip", "./pyodide/pyodide-lock.json",
  "./pyodide/numpy-1.26.4-cp312-cp312-pyodide_2024_0_wasm32.whl",
  "./pyodide/openblas-0.3.26.zip",
  "./pyodide/packaging-23.2-py3-none-any.whl",
  "./pyodide/pandas-2.2.0-cp312-cp312-pyodide_2024_0_wasm32.whl",
  "./pyodide/patsy-0.5.6-py2.py3-none-any.whl",
  "./pyodide/python_dateutil-2.9.0.post0-py2.py3-none-any.whl",
  "./pyodide/pytz-2024.1-py2.py3-none-any.whl",
  "./pyodide/scipy-1.12.0-cp312-cp312-pyodide_2024_0_wasm32.whl",
  "./pyodide/six-1.16.0-py2.py3-none-any.whl",
  "./pyodide/statsmodels-0.14.2-cp312-cp312-pyodide_2024_0_wasm32.whl",
  "./bioengine/__init__.py", "./bioengine/detect.py", "./bioengine/diagnostics.py",
  "./bioengine/doseresponse.py", "./bioengine/posthoc.py", "./bioengine/anova.py",
  "./bioengine/contrastes.py", "./bioengine/mistos.py", "./bioengine/equivalencia.py", "./bioengine/dosecontinua.py", "./bioengine/poder.py", "./bioengine/glmcount.py", "./bioengine/decide.py", "./bioengine/tempo.py", "./bioengine/validacao.py", "./bioengine/forense.py",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png"
];

/* LÊ SÓ O CACHE DESTE MÓDULO.
   `caches.match()` procura em TODOS os caches da origem, e o app principal
   pré-carrega './estatistica/index.html' na lista dele — a mesma URL que esta
   casa guarda. Quem respondia à navegação daqui podia ser a cópia do app, de
   outra publicação, e aí a casca vinha de uma versão e os ?v= dos arquivos de
   outra. Abrindo o cache pelo nome, cada módulo responde com o que ele mesmo
   guardou. */
async function cacheMatch(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const url = new URL(req.url);
  if (url.search) {
    url.search = "";
    const semBusca = await cache.match(url.href);
    if (semBusca) return semBusca;
  }
  if (req.mode === "navigate") return cache.match("./index.html");
  return undefined;
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
/* CADA MÓDULO LIMPA SÓ A PRÓPRIA CASA. O CacheStorage é da ORIGEM: este
   service worker enxerga os caches do app principal (agracta-app-*) e o do
   Pyodide (agracta-pyodide-*, ~115MB). "Apague tudo que não seja meu" apagava
   os dois — e o app fazia o mesmo com este. Agora a faxina é por prefixo. */
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => /^bioensaio-/.test(k) && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const path = new URL(req.url).pathname;
  const interfaceFresh = req.mode === "navigate" ||
    /\/(index\.html|app\.js|styles\.css|exemplos\.js|manifest\.webmanifest|sw\.js)$/.test(path) ||
    /\/bioengine\/[^/]+\.py$/.test(path);
  if (interfaceFresh) {
    e.respondWith(
      fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => cacheMatch(req))
    );
    return;
  }
  // estratégia: cache-first com atualização em segundo plano (stale-while-revalidate)
  e.respondWith(
    cacheMatch(req).then(cached => {
      const rede = fetch(req).then(resp => {
        if (resp && resp.status === 200 && req.url.startsWith(self.location.origin)) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => cached);
      return cached || rede;
    })
  );
});
