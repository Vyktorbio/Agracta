/* O app manda o login em todo pedido ao proxy (NDVI, clima, solo).
   O servidor (ndvi-proxy.py, test_proxy_login.py) confere; aqui, o lado do app:
   proxyFetch põe o token, renova uma vez quando o proxy diz 401, e nenhuma
   chamada ao proxy ficou de fora — só /health e a legenda do solo são abertas.
   Rodar: node tests/test_proxy_fetch.js */
var fs=require('fs'), vm=require('vm');
var app=fs.readFileSync('app.js','utf8');
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }

function trecho(src,nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei '+nome);
  var d=0,j=src.indexOf('{',i);
  for(;j<src.length;j++){ var c=src[j]; if(c==='{')d++; else if(c==='}'){ d--; if(d===0) break; } }
  return src.slice(i,j+1);
}

function montar(tokens){
  var pedidos=[], respostas=[], pedidosToken=[];
  var ctx={
    window:{},
    fetch:function(url,o){ pedidos.push({url:url,o:o||{}}); return Promise.resolve(respostas.length?respostas.shift():{status:200,ok:true}); }
  };
  if(tokens!==undefined){
    ctx.window.agractaTokenLogin=function(forcar){
      pedidosToken.push(!!forcar);
      var t=tokens.shift();
      if(t instanceof Error) return Promise.reject(t);
      return Promise.resolve(t===undefined?null:t);
    };
  }
  vm.createContext(ctx);
  vm.runInContext(trecho(app,'proxyFetch'),ctx);
  return {ctx:ctx, pedidos:pedidos, respostas:respostas, pedidosToken:pedidosToken};
}

(async function(){
  console.log('\nproxyFetch põe o login no pedido');
  var t=montar(['T1']);
  var r=await t.ctx.proxyFetch('https://proxy/dates?x=1');
  ck(r.status===200,'devolve a resposta do proxy');
  ck(t.pedidos.length===1 && t.pedidos[0].url==='https://proxy/dates?x=1','um pedido, mesma URL');
  ck(t.pedidos[0].o.headers && t.pedidos[0].o.headers.Authorization==='Bearer T1','leva Authorization: Bearer <token>');
  ck(t.pedidosToken.join()==='false','pede o token guardado (sem forçar renovação)');

  t=montar(['T1']);
  await t.ctx.proxyFetch('https://proxy/index',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  var o=t.pedidos[0].o;
  ck(o.method==='POST' && o.body==='{}','mantém método e corpo');
  ck(o.headers['Content-Type']==='application/json' && o.headers.Authorization==='Bearer T1','junta o token aos cabeçalhos que já existiam');

  console.log('\nsem login, o pedido sai sem token (o proxy decide)');
  t=montar(undefined);
  await t.ctx.proxyFetch('https://proxy/clima?mac=A');
  ck(!(t.pedidos[0].o.headers||{}).Authorization,'sem Firebase carregado: sem Authorization');
  t=montar([null]);
  await t.ctx.proxyFetch('https://proxy/clima?mac=A');
  ck(!(t.pedidos[0].o.headers||{}).Authorization,'sessão local (sem usuário): sem Authorization');
  t=montar([new Error('sem rede')]);
  r=await t.ctx.proxyFetch('https://proxy/clima?mac=A');
  ck(t.pedidos.length===1 && !(t.pedidos[0].o.headers||{}).Authorization,'token falhou ao renovar: o pedido ainda sai (e o proxy responde)');

  console.log('\n401: renova o token uma vez e repete');
  t=montar(['VELHO','NOVO']);
  t.respostas.push({status:401,ok:false},{status:200,ok:true,tag:'segunda'});
  r=await t.ctx.proxyFetch('https://proxy/stats');
  ck(t.pedidos.length===2,'dois pedidos: o recusado e o repetido');
  ck(t.pedidos[1].o.headers.Authorization==='Bearer NOVO','o segundo leva o token novo');
  ck(t.pedidosToken.join()==='false,true','e o novo foi pedido com renovação forçada');
  ck(r.tag==='segunda','devolve a resposta do segundo pedido');

  t=montar(['MESMO','MESMO']);
  t.respostas.push({status:401,ok:false,tag:'401'});
  r=await t.ctx.proxyFetch('https://proxy/stats');
  ck(t.pedidos.length===1 && r.tag==='401','renovação deu o mesmo token: não repete à toa');

  t=montar([null]);
  t.respostas.push({status:401,ok:false,tag:'401'});
  r=await t.ctx.proxyFetch('https://proxy/stats');
  ck(t.pedidos.length===1 && t.pedidosToken.length===1 && r.tag==='401','sem login, 401 volta direto (nada para renovar)');

  t=montar(['T1','T2']);
  t.respostas.push({status:403,ok:false,tag:'403'});
  r=await t.ctx.proxyFetch('https://proxy/stats');
  ck(t.pedidos.length===1 && r.tag==='403','403 (não é membro) não adianta repetir');

  console.log('\nnenhuma chamada ao proxy ficou de fora');
  var re=/(^|[^A-Za-z])fetch\(\s*(NDVI_PROXY|CLIMA_PROXY|SOLO_PROXY)\s*\+\s*'([^'?]*)/g, m, soltas=[];
  [['app.js',app],['ui-campo.js',fs.readFileSync('ui-campo.js','utf8')]].forEach(function(par){
    re.lastIndex=0;
    while((m=re.exec(par[1]))!==null){ if(m[3]!=='/health') soltas.push(par[0]+': '+m[3]); }
  });
  ck(soltas.length===0,'fetch direto ao proxy só em /health'+(soltas.length?(' — soltas: '+soltas.join(', ')):''));
  var comLogin=(app.match(/proxyFetch\(\s*(NDVI_PROXY|CLIMA_PROXY|SOLO_PROXY)\s*\+/g)||[]).length;
  ck(comLogin>=15,'as rotas de NDVI, clima e solo passam por proxyFetch ('+comLogin+')');
  ['/clima/pos?mac=','/clima/janela?mac='].forEach(function(rota){
    var i=app.indexOf("var url=NDVI_PROXY+'"+rota), j=app.indexOf('(url)',i);
    ck(i>0 && app.slice(j-10,j)==='proxyFetch','URL montada em variável também leva o login: '+rota);
  });
  var iEp=app.indexOf("NDVI_PROXY+'/clima/historico?mac='"), jEp=app.indexOf('(ep)',iEp);
  ck(iEp>0 && app.slice(jEp-10,jEp)==='proxyFetch','carimbo de clima da avaliação (estação) leva o login');
  ck(/proxyFetch\s*:\s*fetch\)\(NDVI_PROXY \+ '\/dates\?/.test(fs.readFileSync('ui-campo.js','utf8')),'ui-campo: lista de datas do NDVI leva o login');
  ck(/w\.proxyFetch:fetch\)\(\(w\.CLIMA_PROXY/.test(fs.readFileSync('clima-pagina.js','utf8')),'página do clima: estações levam o login');
  ck(app.indexOf("SOLO_PROXY+'/solo/legenda?camada='")>0,'legenda do solo segue como <img> (rota aberta no proxy)');
  var py=fs.readFileSync('ndvi-proxy.py','utf8');
  ck(/ROTAS_ABERTAS = \{"\/health", "\/solo\/legenda"\}/.test(py),'e o proxy mantém exatamente essas duas rotas abertas');

  console.log('\nfirebase-sync entrega o token do usuário logado');
  var fsync=fs.readFileSync('firebase-sync.js','utf8');
  var i=fsync.indexOf('window.agractaTokenLogin=function(');
  ck(i>0,'window.agractaTokenLogin existe');
  var corpo=fsync.slice(i,fsync.indexOf('\n  };',i)+5);
  var chamadas=[];
  var c2={window:{},FB:{auth:{currentUser:{getIdToken:function(f){ chamadas.push(f); return Promise.resolve('TK'+(f?'!':'')); }}},user:null}};
  vm.createContext(c2); vm.runInContext(corpo,c2);
  ck(await c2.window.agractaTokenLogin()==='TK' && chamadas[0]===false,'token guardado (getIdToken(false))');
  ck(await c2.window.agractaTokenLogin(true)==='TK!' && chamadas[1]===true,'renovação forçada (getIdToken(true))');
  var c3={window:{},FB:{auth:null,user:null}};
  vm.createContext(c3); vm.runInContext(corpo,c3);
  ck(await c3.window.agractaTokenLogin()===null,'sem usuário: null, sem erro');
  var c4={window:{},FB:{auth:{currentUser:{getIdToken:function(){ return Promise.reject(new Error('offline')); }}}}};
  vm.createContext(c4); vm.runInContext(corpo,c4);
  ck(await c4.window.agractaTokenLogin()===null,'renovação falhou (offline): null, sem erro');

  console.log('\n'+passes+' ok, '+falhas+' falha(s)');
  process.exit(falhas?1:0);
})().catch(function(e){ console.log('FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
