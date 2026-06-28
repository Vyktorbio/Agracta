/* Service worker - cache local do app.
   App shell, ícones, fontes, bioengine e Pyodide ficam em cache para uso offline. */
const CACHE = "bioensaio-v38-auditoria";
const SHELL = [
  "./", "./index.html", "./styles.css?v=bioensaio-auditoria-3", "./app.js?v=bioensaio-auditoria-3", "./exemplos.js?v=bioensaio-auditoria-3",
  "./manifest.webmanifest", "./manifest.webmanifest?v=bioensaio-auditoria-3",
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
  "./bioengine/glmcount.py", "./bioengine/decide.py", "./bioengine/tempo.py", "./bioengine/validacao.py", "./bioengine/forense.py",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png"
];

async function cacheMatch(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const url = new URL(req.url);
  if (url.search) {
    url.search = "";
    const semBusca = await caches.match(url.href);
    if (semBusca) return semBusca;
  }
  if (req.mode === "navigate") return caches.match("./index.html");
  return undefined;
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
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
