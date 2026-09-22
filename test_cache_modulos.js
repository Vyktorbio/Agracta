/* CADA MÓDULO LIMPA SÓ A PRÓPRIA CASA.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O Agracta publica DOIS service workers na mesma origem: o do app (sw.js) e o
 * do motor estatístico (estatistica/sw.js). O CacheStorage não é do escopo, é
 * da ORIGEM — os dois enxergam exatamente a mesma lista de caches.
 *
 * Enquanto a faxina de cada um era "apague tudo que não seja meu", eles se
 * apagavam: abrir a estatística jogava fora o cache offline do app E os ~115MB
 * do Pyodide; abrir o app jogava fora o da estatística. Nenhum dos dois dá erro
 * na tela. O defeito aparece no talhão, sem sinal, quando o app não abre.
 *
 * TRÊS REGRAS:
 *
 *  1. CADA UM APAGA SÓ O SEU PREFIXO. Versão velha da própria casa sai; cache
 *     do vizinho fica.
 *  2. O PYODIDE FICA. Ele tem cache próprio de propósito, porque baixar 115MB
 *     de novo no campo não é atualização, é prejuízo.
 *  3. CADA UM RESPONDE COM O QUE ELE MESMO GUARDOU. `caches.match()` procura em
 *     TODOS os caches da origem, e o app pré-carrega './estatistica/index.html'
 *     — a mesma URL que a estatística guarda. Quem respondia à navegação de lá
 *     podia ser a cópia do app, de outra publicação.
 *
 * Rodar: node test_cache_modulos.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');

/* Um CacheStorage de mentira, COMPARTILHADO pelos dois workers — que é
   exatamente a condição do navegador real. Guardar o conteúdo por cache
   permite provar de qual casa veio a resposta. */
function cacheStorageFalso(conteudo){
  const caixas=new Map();
  Object.keys(conteudo).forEach(k=>caixas.set(k, new Map(Object.entries(conteudo[k]))));
  const chave=req=>String(req && req.url ? req.url : req);
  function abrir(nome){
    if(!caixas.has(nome)) caixas.set(nome,new Map());
    const m=caixas.get(nome);
    return Promise.resolve({
      match:r=>Promise.resolve(m.get(chave(r))),
      put:(r,v)=>{ m.set(chave(r),v); return Promise.resolve(); },
      addAll:()=>Promise.resolve()
    });
  }
  return {
    caixas,
    keys:()=>Promise.resolve([...caixas.keys()]),
    delete:k=>Promise.resolve(caixas.delete(k)),
    open:abrir,
    /* o `caches.match` global: varre TODAS as caixas, na ordem de inserção */
    match:r=>{ for(const m of caixas.values()){ const v=m.get(chave(r)); if(v!==undefined) return Promise.resolve(v); }
               return Promise.resolve(undefined); }
  };
}

/* OS NOMES VÊM DA FONTE, NÃO DAQUI.
   Fixá-los no teste faria duas coisas ruins: quebraria a cada publicação (o
   nome sobe junto com a lista) e, pior, se alguém atualizasse só um lado o
   teste passaria a guardar um cache que não existe mais — dizendo "o corrente
   sobrevive" sobre um nome morto. */
function nomeDoCache(arquivo, variavel){
  const m=fs.readFileSync(arquivo,'utf8').match(new RegExp('(?:var|const)\\s+'+variavel+'\\s*=\\s*["\']([^"\']+)["\']'));
  assert.ok(m,'não achei '+variavel+' em '+arquivo);
  return m[1];
}
const APP=nomeDoCache('sw.js','CACHE'),
      PYO=nomeDoCache('sw.js','PYO_CACHE'),
      EST=nomeDoCache('estatistica/sw.js','CACHE');
assert.notEqual(APP,EST,'os dois módulos não podem compartilhar o nome do cache');

function carregar(arquivo, caches){
  const ouvintes={};
  const ctx={ URL, Promise, console, fetch:()=>Promise.reject(new Error('sem rede')),
    caches, self:{ addEventListener:(k,f)=>{ouvintes[k]=f;}, skipWaiting:()=>Promise.resolve(),
                   clients:{claim:()=>Promise.resolve()} } };
  ctx.self.caches=caches; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(arquivo,'utf8'), ctx);
  return {ctx, ouvintes,
    async ativar(){ let p; ouvintes.activate({waitUntil:x=>{p=x;}}); await p; }};
}

(async()=>{
  let f=0,p=0;
  const ck=(ok,n)=>{ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} };

  console.log('\n--- 1. O app faz a faxina e NÃO leva a estatística junto ---');
  let caches=cacheStorageFalso({
    'agracta-app-v1':{}, [APP]:{}, [PYO]:{},
    'bioensaio-v48-velho':{}, [EST]:{}, 'outra-coisa':{}
  });
  await carregar('sw.js', caches).ativar();
  let vivos=[...caches.caixas.keys()];
  ck(!vivos.includes('agracta-app-v1'),'a versão velha do próprio app sai');
  ck(vivos.includes(APP),'a versão corrente fica ('+APP+')');
  ck(vivos.includes(PYO),'O PYODIDE FICA — 115MB não se rebaixa no campo');
  ck(vivos.includes(EST)&&vivos.includes('bioensaio-v48-velho'),
     'e os caches da estatística ficam INTEIROS: não é casa dele para limpar');
  ck(vivos.includes('outra-coisa'),'cache de terceiro também não é assunto dele');

  console.log('\n--- 2. A estatística faz a faxina e NÃO leva o app junto ---');
  caches=cacheStorageFalso({
    [APP]:{}, [PYO]:{},
    'bioensaio-v48-velho':{}, [EST]:{}, 'outra-coisa':{}
  });
  await carregar('estatistica/sw.js', caches).ativar();
  vivos=[...caches.caixas.keys()];
  ck(!vivos.includes('bioensaio-v48-velho'),'a versão velha da própria estatística sai');
  ck(vivos.includes(EST),'a corrente fica ('+EST+')');
  ck(vivos.includes(APP),'o cache do app fica');
  ck(vivos.includes(PYO),'e o Pyodide também — era ele o maior prejuízo');
  ck(vivos.includes('outra-coisa'),'e o de terceiro fica');

  console.log('\n--- 3. Os dois abrindo em sequência, como acontece de verdade ---');
  /* Quem usa o app e depois a estatística no mesmo aparelho fazia os dois
     ativarem um atrás do outro. Antes, a segunda ativação zerava a primeira. */
  caches=cacheStorageFalso({[APP]:{}, [PYO]:{}, [EST]:{}});
  await carregar('sw.js', caches).ativar();
  await carregar('estatistica/sw.js', caches).ativar();
  await carregar('sw.js', caches).ativar();
  vivos=[...caches.caixas.keys()].sort();
  assert.deepEqual(vivos,[APP,PYO,EST].sort());
  ck(true,'depois de app → estatística → app, os três caches continuam de pé');

  console.log('\n--- 4. A estatística responde com o que ELA guardou ---');
  /* A mesma URL mora nas duas casas: o app pré-carrega './estatistica/index.html'
     na lista dele. Antes, `caches.match` podia devolver a cópia do app. */
  const URL_COMUM='https://agracta.test/estatistica/index.html';
  caches=cacheStorageFalso({
    [APP]:{[URL_COMUM]:'CASCA VINDA DO APP'},
    [EST]:{[URL_COMUM]:'CASCA DA ESTATISTICA'}
  });
  const est=carregar('estatistica/sw.js', caches);
  const resp=await est.ctx.cacheMatch({url:URL_COMUM, mode:'navigate'});
  ck(resp==='CASCA DA ESTATISTICA','a navegação da estatística vem do cache dela, não do app');
  ck(await caches.match(URL_COMUM)==='CASCA VINDA DO APP',
     '(e o caches.match global realmente devolveria a do app — o risco era real)');

  /* AS TRÊS BUSCAS DO cacheMatch, uma a uma. A primeira versão deste teste só
     exercitava a primeira: a URL pedida estava no cache, então as outras duas
     linhas nunca rodavam, e trocar `cache.match` por `caches.match` nelas
     passava batido na prova de mutação. Cada caminho precisa do seu caso. */
  caches=cacheStorageFalso({
    [APP]:{'https://agracta.test/estatistica/app.js':'JS DO APP',
           './index.html':'CASCA VINDA DO APP'},
    [EST]:{'https://agracta.test/estatistica/app.js':'JS DA ESTATISTICA',
           './index.html':'CASCA DA ESTATISTICA'}
  });
  const est2=carregar('estatistica/sw.js', caches);
  ck(await est2.ctx.cacheMatch({url:'https://agracta.test/estatistica/app.js'})==='JS DA ESTATISTICA',
     'busca direta: vem da casa dela');
  ck(await est2.ctx.cacheMatch({url:'https://agracta.test/estatistica/app.js?v=qualquer'})==='JS DA ESTATISTICA',
     'busca sem a query: também');
  ck(await est2.ctx.cacheMatch({url:'https://agracta.test/estatistica/pagina-que-nao-existe',
                                mode:'navigate'})==='CASCA DA ESTATISTICA',
     'e a reserva de navegação, que é onde as duas casas guardam a MESMA URL');

  console.log('\n--- 5. A lista de cada casa pede o que o HTML dela pede ---');
  /* Mesma conferência do portão, aqui também: o pré-cache é por URL, e uma
     versão defasada na lista guarda um arquivo que ninguém pede. */
  const semQuery=u=>String(u).replace(/^\.\//,'').replace(/[?#].*$/,'');
  [{nome:'app', sw:'sw.js', lista:/var ASSETS\s*=\s*\[([\s\S]*?)\]/, html:'index.html', base:''},
   {nome:'estatística', sw:'estatistica/sw.js', lista:/const SHELL\s*=\s*\[([\s\S]*?)\]/,
    html:'estatistica/index.html', base:'estatistica/'}].forEach(c=>{
    const m=fs.readFileSync(c.sw,'utf8').match(c.lista);
    assert.ok(m,'achei a lista de '+c.sw);
    const lista=(m[1].match(/["'][^"']+["']/g)||[]).map(s=>s.slice(1,-1).replace(/^\.\//,''));
    const porCaminho={};
    lista.forEach(u=>{ (porCaminho[semQuery(u)]=porCaminho[semQuery(u)]||[]).push(u); });
    const html=fs.readFileSync(c.html,'utf8');
    const fora=[];
    for(const x of html.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)){
      const pedido=x[1].replace(/^\.\//,''), tem=porCaminho[semQuery(pedido)];
      if(tem && !tem.includes(pedido)) fora.push(pedido+' vs '+tem.join('/'));
    }
    ck(fora.length===0, c.nome+': a lista do service worker casa com o HTML'+
       (fora.length?' (fora: '+fora.join(', ')+')':''));
  });

  console.log('\n======================================');
  console.log('  '+p+' ok, '+f+' falha(s)');
  console.log('======================================');
  process.exit(f?1:0);
})().catch(e=>{ console.error('erro inesperado:', e); process.exit(1); });
