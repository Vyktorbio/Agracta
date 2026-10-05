/* O MOTOR ESTATÍSTICO NÃO TRAVA A TELA NEM FICA PRESO NA MEMÓRIA.
 *
 * "O Agracta está dando umas travadas; tem hora que fica tela preta, some tudo e
 * tem que abrir de novo." Medido no navegador ao abrir um estudo de bancada com
 * três leituras: o Python rodando na página parava a tela por 3,7 s (2,2 s de
 * uma vez); o iframe do motor nunca saía da memória (~150 MB do Python).
 *
 * Este teste segura as três peças da correção:
 *  1. o protocolo do worker (motor-worker.js): iniciar → pronto com os hashes;
 *     chamar → resposta com o JSON; erro vira resposta de erro, não trava;
 *  2. a página do motor (estatistica/app.js) fala com o worker e se recupera de
 *     falha — e sem Worker cai no caminho antigo;
 *  3. o app (app.js) desliga o motor quando a fila esvazia e quando vai para
 *     segundo plano, e nunca no meio de um cálculo.
 *
 * Rodar: node tests/test_motor_worker.js
 */
var fs=require('fs'), vm=require('vm');
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
function trecho(src,nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei '+nome);
  var d=0,j=src.indexOf('{',i);
  for(;j<src.length;j++){ var c=src[j]; if(c==='{')d++; else if(c==='}'){ d--; if(d===0) break; } }
  return src.slice(i,j+1);
}
var espera=function(){ return new Promise(function(r){ setTimeout(r,5); }); };

(async function(){
  /* ---------------------------------------------------------------- 1. worker */
  console.log('\n[1] protocolo do motor-worker.js');
  var chamadas=[], saida=[];
  var pyFake={
    loadPackage:function(p){ chamadas.push(['pacotes',p.join(',')]); return Promise.resolve(); },
    toPy:function(o){ chamadas.push(['arquivos',Object.keys(o).length]); return {destroy:function(){}}; },
    globals:{ set:function(){}, get:function(nome){
      if(nome==='_run_web') return Object.assign(function(a,b,c){ chamadas.push(['_run_web',a,b,c]); return JSON.stringify({ok:true,eco:JSON.parse(a)}); },{destroy:function(){ chamadas.push(['destroy']); }});
      if(nome==='_run_quebra') return Object.assign(function(){ throw new Error('ZeroDivisionError'); },{destroy:function(){}});
      return undefined; } },
    runPython:function(code){ chamadas.push(['python',code.indexOf('import')>=0?'importou':'?']); }
  };
  var W={console:console, Promise:Promise, TextEncoder:TextEncoder, Uint8Array:Uint8Array, Array:Array, String:String, JSON:JSON, Object:Object, Error:Error,
    crypto:require('crypto').webcrypto,
    importScripts:function(u){ chamadas.push(['importScripts',u]); },
    loadPyodide:function(o){ chamadas.push(['loadPyodide',o.indexURL]); return Promise.resolve(pyFake); },
    fetch:function(u){ chamadas.push(['fetch',u]); return Promise.resolve({ok:true,text:function(){ return Promise.resolve('# '+u); }}); },
    postMessage:function(m){ saida.push(m); }};
  W.self=W;
  vm.createContext(W);
  vm.runInContext(fs.readFileSync('estatistica/motor-worker.js','utf8'),W,{filename:'motor-worker.js'});
  ck(chamadas[0][0]==='importScripts' && chamadas[0][1]==='pyodide/pyodide.js','carrega o Pyodide dentro do worker');
  W.onmessage({data:{tipo:'iniciar',cfg:{arquivos:['a.py','b.py'],versao:'v9',bridge:'import json'}}});
  for(var i=0;i<400&&!saida.some(function(m){ return m.tipo==='pronto'; });i++) await espera();
  var pronto=saida.filter(function(m){ return m.tipo==='pronto'; })[0];
  ck(pronto && Object.keys(pronto.hashes).length===2 && /^[0-9a-f]{64}$/.test(pronto.hashes['a.py']),'pronto devolve o SHA-256 de cada arquivo do motor');
  ck(chamadas.some(function(c){ return c[0]==='fetch' && c[1]==='bioengine/a.py?v=v9'; }),'baixa os arquivos do motor na versão pedida');
  ck(saida.some(function(m){ return m.tipo==='progresso' && /importando/.test(m.sub||''); }),'avisa o progresso (para a tela de carregamento)');
  W.onmessage({data:{tipo:'chamar',id:7,fn:'_run_web',args:['{"x":1}','{}','{}']}});
  for(i=0;i<400&&!saida.some(function(m){ return m.id===7; });i++) await espera();
  var r7=saida.filter(function(m){ return m.id===7; })[0];
  ck(r7 && r7.ok===true && JSON.parse(r7.json).eco.x===1,'chamar devolve o JSON da função Python, com o mesmo id');
  ck(chamadas.some(function(c){ return c[0]==='destroy'; }),'a função Python é destruída depois da chamada (sem vazar memória)');
  W.onmessage({data:{tipo:'chamar',id:8,fn:'_run_quebra',args:[]}});
  W.onmessage({data:{tipo:'chamar',id:9,fn:'_run_inexistente',args:[]}});
  for(i=0;i<400&&saida.filter(function(m){ return m.id===8||m.id===9; }).length<2;i++) await espera();
  var r8=saida.filter(function(m){ return m.id===8; })[0], r9=saida.filter(function(m){ return m.id===9; })[0];
  ck(r8 && r8.ok===false && /ZeroDivision/.test(r8.erro),'erro no Python vira resposta de erro (o worker segue vivo)');
  ck(r9 && r9.ok===false && /desconhecida/.test(r9.erro),'função inexistente: erro claro');

  /* ------------------------------------------------------- 2. página do motor */
  console.log('\n[2] estatistica/app.js fala com o worker');
  var eng=fs.readFileSync('estatistica/app.js','utf8');
  var workers=[];
  function FakeWorker(url){ this.url=url; this.msgs=[]; this.terminado=false; workers.push(this); }
  FakeWorker.prototype.postMessage=function(m){ this.msgs.push(m); };
  FakeWorker.prototype.terminate=function(){ this.terminado=true; };
  var overlay=[];
  var P={console:console, Promise:Promise, Map:Map, JSON:JSON, Error:Error, Object:Object, String:String, setTimeout:setTimeout,
    Worker:FakeWorker, window:{},
    APP_VERSION:'bioensaio-auditoria-19', ENGINE_VERSION:'bioensaio-auditoria-19', ARQ_ENGINE:['a.py'], BRIDGE:'import json', ENGINE_HASHES:{},
    mostrarOverlay:function(m){ overlay.push(['mostrar',m]); }, setOverlay:function(m,s){ overlay.push(['set',m,s]); }, esconderOverlay:function(){ overlay.push(['esconder']); },
    pyodide:null, pyPronto:null, loadPyodide:function(){ return new Promise(function(){}); }};
  vm.createContext(P);
  var blocoWorker=eng.slice(eng.indexOf('let motorWorker = null'), eng.indexOf('async function iniciarPyodide()'));
  vm.runInContext(blocoWorker.replace('let motorWorker = null, _motorSeq = 0, _motorIniciado = false;','var motorWorker = null, _motorSeq = 0, _motorIniciado = false;').replace('const _motorPend = new Map();','var _motorPend = new Map();'),P);
  vm.runInContext(trecho(eng,'iniciarPyodide').replace(/^function/,'async function')+'\n'+trecho(eng,'garantirPyodide')+'\n'+trecho(eng,'rodarPythonComDados').replace(/^function/,'async function'),P);
  var prom=P.rodarPythonComDados('_run_web',{a:[1]},{resposta:'a'},{alfa:0.05});
  await espera();
  var w=workers[0];
  ck(w && /motor-worker\.js\?v=bioensaio-auditoria-19/.test(w.url),'cria o worker com a versão do motor na URL');
  ck(w.msgs[0].tipo==='iniciar' && w.msgs[0].cfg.bridge==='import json' && w.msgs[0].cfg.arquivos[0]==='a.py','manda o motor para o worker iniciar');
  w.onmessage({data:{tipo:'progresso',msg:'Carregando…',sub:'numpy'}});
  ck(overlay.some(function(o){ return o[0]==='set' && o[2]==='numpy'; }),'o progresso do worker aparece na tela de carregamento');
  w.onmessage({data:{tipo:'pronto',hashes:{'a.py':'abc'}}});
  for(i=0;i<400&&w.msgs.length<2;i++) await espera();
  ck(P.ENGINE_HASHES['a.py']==='abc','os hashes do motor vêm do worker (autoteste de integridade)');
  var ch=w.msgs[1];
  ck(ch && ch.tipo==='chamar' && ch.fn==='_run_web' && JSON.parse(ch.args[0]).a[0]===1 && JSON.parse(ch.args[2]).alfa===0.05,'a análise vai para o worker como JSON');
  w.onmessage({data:{tipo:'resposta',id:ch.id,ok:true,json:'{"ok":true,"analise":{"x":2}}'}});
  var rel=await prom;
  ck(rel.ok===true && rel.analise.x===2,'e o relatório volta pronto para a tela');
  /* erro de uma chamada não derruba o motor */
  var p2=P.rodarPythonComDados('_run_web',{},{},{}).then(function(){ return 'ok'; },function(e){ return 'erro:'+e.message; });
  for(i=0;i<400&&w.msgs.length<3;i++) await espera();
  w.onmessage({data:{tipo:'resposta',id:w.msgs[2].id,ok:false,erro:'boom'}});
  ck(await p2==='erro:boom','erro numa análise volta como erro daquela análise');
  /* o worker morre: as chamadas pendentes falham e a próxima recomeça do zero */
  var p3=P.rodarPythonComDados('_run_web',{},{},{}).then(function(){ return 'ok'; },function(e){ return 'erro:'+e.message; });
  for(i=0;i<400&&w.msgs.length<4;i++) await espera();
  w.onerror({message:'out of memory'});
  ck(await p3==='erro:out of memory','worker que cai libera quem esperava (a tela não fica presa)');
  ck(w.terminado && P.pyPronto===null,'e o motor é descartado para recomeçar na próxima análise');
  var p4=P.rodarPythonComDados('_run_web',{},{},{});
  await espera();
  ck(workers.length===2 && workers[1].msgs[0].tipo==='iniciar','a próxima análise cria um worker novo');
  var usouPagina=false; P.loadPyodide=function(){ usouPagina=true; return new Promise(function(){}); };
  workers[1].onmessage({data:{tipo:'falhou',erro:'sem rede'}});
  for(i=0;i<400&&!usouPagina;i++) await espera();
  ck(usouPagina && P.window.__motorNaPagina===true,'worker que não sobe (ex.: offline): recua sozinho para o Python na página');
  ck(workers.length===2,'e não fica criando worker de novo a cada análise');
  /* sem Worker, o caminho antigo */
  ck(vm.runInContext("Worker=undefined; _motorNoWorker()",P)===false,'sem Worker no navegador, o motor volta a rodar na página');
  ck(vm.runInContext("Worker=function(){}; window.__motorNaPagina=true; _motorNoWorker()",P)===false,'e dá para forçar o caminho antigo (diagnóstico)');

  /* ------------------------------------------------------- 3. o app libera */
  console.log('\n[3] app.js desliga o motor quando ocioso');
  var app=fs.readFileSync('app.js','utf8');
  var timers=[], removidos=0, ouvintes={};
  var frame={src:'estatistica/index.html',parentNode:{removeChild:function(){ removidos++; A.__frame=null; }}};
  var A={console:console, Math:Math, _bioAutoQueue:[], _bioAutoBusy:null, _bioEngineReady:true, __frame:frame,
    document:{getElementById:function(id){ return id==='bioEngineFrame'?A.__frame:null; }, hidden:false,
      addEventListener:function(ev,fn){ ouvintes[ev]=fn; }},
    setTimeout:function(fn,ms){ timers.push({fn:fn,ms:ms,ativo:true}); return timers.length; },
    clearTimeout:function(id){ if(id&&timers[id-1]) timers[id-1].ativo=false; },
    /* a vigia das etapas (test_motor_vida.js cobre os prazos) */
    setInterval:function(){ return 999; }, clearInterval:function(){}};
  vm.createContext(A);
  var bloco=app.slice(app.indexOf('var _bioLiberarT=null'), app.indexOf('function _bioestatPump(){'));
  vm.runInContext(bloco+'\n'+trecho(app,'_bioestatPump'),A);
  vm.runInContext('_bioestatPump()',A);
  var ativos=timers.filter(function(t){ return t.ativo; });
  ck(ativos.length===1 && ativos[0].ms===45000,'fila vazia: o desligamento fica agendado para daqui a 45 s');
  ativos[0].fn();
  ck(removidos===1 && A._bioEngineReady===false && frame.src==='about:blank','passados os 45 s, o iframe do motor sai (e o worker do Python com ele)');
  /* nunca no meio de um cálculo */
  A.__frame={src:'x',parentNode:{removeChild:function(){ removidos++; A.__frame=null; }}}; A._bioEngineReady=true;
  A._bioAutoBusy='req-1';
  ck(vm.runInContext('_bioestatLiberarMotor()',A)===false && A.__frame,'com cálculo em andamento, não desliga');
  A._bioAutoBusy=null; A._bioAutoQueue.push({});
  ck(vm.runInContext('_bioestatLiberarMotor()',A)===false && A.__frame,'com fila por calcular, não desliga');
  A._bioAutoQueue.length=0;
  /* segundo plano */
  ck(typeof ouvintes.visibilitychange==='function','ouve o app ir para segundo plano');
  A.document.hidden=true; ouvintes.visibilitychange();
  ck(!A.__frame && A._bioEngineReady===false,'app em segundo plano e motor ocioso: desliga na hora (menos chance do sistema matar a página)');
  /* nova análise cancela o desligamento agendado */
  timers.length=0; A.__frame={src:'x',parentNode:{removeChild:function(){ A.__frame=null; }}}; A._bioEngineReady=true;
  vm.runInContext('_bioestatAgendarLiberacao()',A);
  A._bioAutoQueue.push({}); A._bioEngineReady=false;
  vm.runInContext('_bioestatPump()',A);
  ck(timers[0].ativo===false,'chegou trabalho novo: o desligamento agendado é cancelado');

  /* ----------------------------------------------- 4. cache offline do worker */
  console.log('\n[4] o worker funciona offline');
  var swE=fs.readFileSync('estatistica/sw.js','utf8'), apv=(eng.match(/const APP_VERSION = "([^"]+)"/)||[])[1];
  ck(swE.indexOf('"./motor-worker.js?v='+apv+'"')>=0,'o service worker do motor pré-carrega o motor-worker.js na versão atual ('+apv+')');
  ck(/\.\/pyodide\/pyodide\.js/.test(swE),'e o Pyodide que ele importa');

  console.log('\n'+passes+' ok, '+falhas+' falha(s)');
  process.exit(falhas?1:0);
})().catch(function(e){ console.log('FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
