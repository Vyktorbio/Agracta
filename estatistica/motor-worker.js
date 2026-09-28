/* Motor estatístico FORA da tela (Web Worker).

   O Python (Pyodide + numpy, scipy, pandas, statsmodels) rodava na página.
   O iframe do motor é da mesma origem que o app, então divide com ele a mesma
   linha de execução: cada análise congelava a TELA INTEIRA do Agracta. Medido
   num computador rápido, abrir um estudo de bancada com três leituras travava
   a tela por 4,2 s (a maior travada, 2,2 s seguidos); no celular isso é 3 a 5
   vezes mais — o "Agracta travando".

   Aqui o Python roda numa linha própria. A página manda {tipo:'chamar', fn,
   args} e recebe o JSON de volta; a interface nunca espera o cálculo. Fechar o
   iframe do motor encerra este worker e devolve toda a memória do Python. */
'use strict';
importScripts('pyodide/pyodide.js');

let py = null;
let pronto = null;

function avisar(msg, sub){ try{ self.postMessage({tipo:'progresso', msg:msg, sub:sub||''}); }catch(e){} }

async function sha256Hex(texto){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(b)).map(function(x){ return x.toString(16).padStart(2,'0'); }).join('');
}

async function iniciar(cfg){
  avisar('Carregando motor estatístico…', 'Inicializando bibliotecas científicas.');
  py = await loadPyodide({ indexURL: 'pyodide/' });
  avisar('Carregando bibliotecas…', 'numpy, scipy, pandas, statsmodels');
  await py.loadPackage(['numpy', 'scipy', 'pandas', 'statsmodels']);
  avisar('Preparando o motor…', '');
  const arquivos = {}, hashes = {};
  for (const f of cfg.arquivos){
    const r = await fetch('bioengine/' + f + '?v=' + cfg.versao, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' em bioengine/' + f);
    const conteudo = await r.text();
    arquivos[f] = conteudo;
    hashes[f] = await sha256Hex(conteudo);
  }
  avisar('Preparando o motor…', 'arquivos do motor baixados');
  const proxy = py.toPy(arquivos);
  py.globals.set('_engine_files', proxy);
  py.runPython(
    'import os, sys\n' +
    'os.makedirs("bioengine", exist_ok=True)\n' +
    'for _nome, _conteudo in dict(_engine_files).items():\n' +
    '    with open(os.path.join("bioengine", _nome), "w") as _fh:\n' +
    '        _fh.write(_conteudo)\n' +
    'if "" not in sys.path:\n' +
    '    sys.path.insert(0, "")\n');
  proxy.destroy();
  avisar('Preparando o motor…', 'importando as bibliotecas estatísticas');
  py.runPython(cfg.bridge);
  return hashes;
}

self.onmessage = async function(ev){
  const m = ev.data || {};
  if (m.tipo === 'iniciar'){
    try{
      if (!pronto) pronto = iniciar(m.cfg);
      const hashes = await pronto;
      self.postMessage({ tipo: 'pronto', hashes: hashes });
    }catch(e){
      pronto = null;
      self.postMessage({ tipo: 'falhou', erro: String((e && e.message) || e) });
    }
    return;
  }
  if (m.tipo === 'chamar'){
    let fn = null;
    try{
      await pronto;
      fn = py.globals.get(m.fn);
      if (!fn) throw new Error('função do motor desconhecida: ' + m.fn);
      const json = fn.apply(null, m.args || []);
      self.postMessage({ tipo: 'resposta', id: m.id, ok: true, json: json });
    }catch(e){
      self.postMessage({ tipo: 'resposta', id: m.id, ok: false, erro: String((e && e.message) || e) });
    }finally{
      try{ if (fn && fn.destroy) fn.destroy(); }catch(e){}
    }
  }
};
