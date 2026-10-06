/* O SHELL OFFLINE É O APP, E SÓ O APP.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A navegação é "rede primeiro, guarda a resposta como index.html para o offline".
 * Sem conferir a resposta, qualquer página virava o app offline: um 404 (endereço
 * digitado errado) ou a página de login de um Wi-Fi com portal cativo — que chega
 * REDIRECIONADA e com status 200. No campo, sem sinal, o app abria essa página.
 *
 * Regras: só a página do próprio app, com resposta ok, não redirecionada e de mesma
 * origem, é guardada; sem rede, a navegação devolve o shell guardado.
 *
 * Rodar: node tests/test_sw_shell_offline.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');

function carregarSW(){
  const guardado=new Map(), ouvintes={};
  const caches={
    open:()=>Promise.resolve({ put:(k,v)=>{ guardado.set(String(k.url||k),v); return Promise.resolve(); },
                               match:k=>Promise.resolve(guardado.get(String(k.url||k))), addAll:()=>Promise.resolve() }),
    match:k=>Promise.resolve(guardado.get(String(k.url||k))),
    keys:()=>Promise.resolve([]), delete:()=>Promise.resolve(true)
  };
  let proxima=null;
  const ctx={URL,Promise,console,caches,
    fetch:()=>proxima?Promise.resolve(proxima):Promise.reject(new Error('sem rede')),
    self:{addEventListener:(k,f)=>{ouvintes[k]=f;},skipWaiting:()=>Promise.resolve(),
          clients:{claim:()=>Promise.resolve()},registration:{scope:'https://agracta.test/'}}};
  ctx.self.caches=caches; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('sw.js','utf8'),ctx);
  return {
    guardado,
    rede(resp){ proxima=resp; },
    async navegar(caminho){
      let p; ouvintes.fetch({request:{url:'https://agracta.test'+caminho,method:'GET',mode:'navigate'},respondWith:x=>{p=x;}});
      const r=await p; await new Promise(res=>setImmediate(res)); return r;
    }
  };
}
function resposta(corpo,o){ o=o||{};
  return {ok:(o.status||200)<300,status:o.status||200,redirected:!!o.redirected,type:o.type||'basic',corpo,clone(){return this;}}; }

(async()=>{
  let f=0; const ck=(ok,n)=>{ console.log((ok?'  ok    ':'  FALHA ')+n); if(!ok) f++; };
  const shell=()=>{ const v=sw.guardado.get('./index.html'); return v&&v.corpo; };

  var sw=carregarSW();
  sw.rede(resposta('APP')); await sw.navegar('/');
  ck(shell()==='APP','a página do app, íntegra, vira o shell offline');

  sw.rede(resposta('PAGINA 404',{status:404})); await sw.navegar('/agracta-digitado-errado');
  ck(shell()==='APP','um 404 NÃO substitui o shell');

  sw.rede(resposta('LOGIN DO WI-FI DA FAZENDA',{redirected:true})); await sw.navegar('/');
  ck(shell()==='APP','a página de portal cativo (redirecionada, status 200) NÃO substitui o shell');

  sw.rede(resposta('OUTRA PAGINA DO SITE')); await sw.navegar('/docs/');
  ck(shell()==='APP','outra página do site NÃO substitui o shell');

  sw.rede(null); const off=await sw.navegar('/');
  ck(off&&off.corpo==='APP','sem rede, a navegação abre o app guardado');

  if(f){ console.log('\n'+f+' falha(s).'); process.exitCode=1; }
  else console.log('Shell offline: só o app entra; 404, portal cativo e outras páginas ficam de fora.');
})().catch(e=>{ console.error(e); process.exitCode=1; });
