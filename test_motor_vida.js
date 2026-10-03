/* O PAINEL DE ESTATÍSTICA NUNCA FICA "CARREGANDO" SEM FIM.
 *
 * Relato de 29/09, com foto: "fica sempre carregando verificações avançadas no
 * aparelho e não para". O painel tinha UM prazo para tudo — 70 s por trabalho,
 * contados do envio —, e é o primeiro trabalho que sobe o motor: no primeiro
 * uso ~115 MB de Python, e num celular a partida passa de um minuto mesmo com
 * tudo guardado. Estourado o prazo, o app desistia e mandava o próximo trabalho
 * para a MESMA página do motor, que ainda subia; como a página respondia com o
 * número do ÚLTIMO trabalho recebido, a análise de uma avaliação voltava com o
 * número da outra (medido no navegador: com a partida atrasada, a triagem
 * forense recebeu um relatório de ANOVA). E nada na tela dizia se o motor
 * baixava, calculava ou tinha parado.
 *
 * Este teste segura as duas pontas:
 *  [1] a página do motor (estatistica/app.js): um trabalho por vez, cada
 *      resposta com o número do próprio trabalho, sempre UMA resposta, e o
 *      aviso periódico de em que pé está;
 *  [2] o app (app.js): cada etapa com o seu prazo (abrir, confirmar, silêncio,
 *      carregar, calcular), só com o app na tela, e o que não deu sai com o
 *      motivo em vez de ficar carregando.
 *
 * Rodar: node test_motor_vida.js
 */
'use strict';
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
function entre(src,ini,fim){
  var i=src.indexOf(ini); if(i<0) throw new Error('não achei o início: '+ini.slice(0,50));
  var j=src.indexOf(fim,i); if(j<0) throw new Error('não achei o fim: '+fim.slice(0,50));
  return src.slice(i,j);
}
/* relógio de mentira: setTimeout/setInterval andam só quando o teste manda */
function relogio(){
  var R={agora:1000000, t:new Map(), seq:0};
  R.setTimeout=function(fn,ms){ var id=++R.seq; R.t.set(id,{fn:fn,at:R.agora+(+ms||0)}); return id; };
  R.setInterval=function(fn,ms){ var id=++R.seq; R.t.set(id,{fn:fn,at:R.agora+(+ms||0),cada:+ms||1}); return id; };
  R.clear=function(id){ R.t.delete(id); };
  R.saltar=function(ms){ R.agora+=ms; R.t.forEach(function(x){ if(x.at<R.agora) x.at=R.agora; }); };
  R.avancar=function(ms){
    var fim=R.agora+ms;
    for(;;){
      var prox=null, pid=null;
      R.t.forEach(function(x,id){ if(x.at<=fim&&(!prox||x.at<prox.at||(x.at===prox.at&&id<pid))){ prox=x; pid=id; } });
      if(!prox) break;
      R.agora=prox.at;
      if(prox.cada) prox.at+=prox.cada; else R.t.delete(pid);
      prox.fn();
    }
    R.agora=fim;
  };
  return R;
}
var espera=function(){ return new Promise(function(r){ setImmediate(r); }); };

(async function(){
  /* ============================================ [1] a página do motor */
  console.log('\n[1] a página do motor atende um trabalho por vez');
  var eng=fs.readFileSync('estatistica/app.js','utf8');
  function novoMotor(){
    var R=relogio(), saida=[], ouvinte=null, handoffs=[];
    var W={console:{log(){},warn(){},error(){}}, JSON:JSON, Object:Object, String:String, Date:{now:function(){ return R.agora; }},
      URLSearchParams:URLSearchParams, APP_VERSION:'teste-1',
      setTimeout:R.setTimeout, clearTimeout:R.clear, setInterval:R.setInterval, clearInterval:R.clear,
      location:{search:'?agracta_engine=1', origin:'https://agracta.test'},
      clonarAuditavel:function(v){ if(v&&v.__naoClona) throw new Error('circular'); return JSON.parse(JSON.stringify(v)); },
      _motorEstado:{fase:'parado',msg:'',sub:'',em:0},
      __agractaHandoff:function(p){ handoffs.push(p); if(!W.__semClique&&W._agAtual) W._agAtual.clicou=true; return W.__handoffDevolve!==false; }};
    W.window={parent:{postMessage:function(m){ saida.push(m); }}, location:W.location,
      addEventListener:function(tipo,fn){ if(tipo==='message') ouvinte=fn; }, __agractaEmbed:true, __agractaRequestId:''};
    vm.createContext(W);
    vm.runInContext(trecho(eng,'_agractaEmitirResultado'),W);
    vm.runInContext(entre(eng,'var _agFila=[]','(function(){\n  try{\n    /* O motor invisível'),W);
    return {W:W, R:R, saida:saida, handoffs:handoffs,
      chega:function(rid){ ouvinte({origin:'https://agracta.test', data:{type:'agracta:bioestat-run', payload:{requestId:rid, aoa:[[1]]}}}); },
      doTipo:function(t){ return saida.filter(function(m){ return m.type==='agracta:bioestat-'+t; }); }};
  }
  var M=novoMotor();
  ck(M.doTipo('ola').length===1,'o motor embutido avisa que já escuta (o app não espera cada fonte da página carregar)');
  M.chega('r1'); M.chega('r2');
  var rec=M.doTipo('status').filter(function(m){ return m.fase==='recebido'; }).map(function(m){ return m.requestId; });
  ck(rec.indexOf('r1')>=0 && rec.indexOf('r2')>=0,'cada trabalho é confirmado assim que chega');
  ck(M.handoffs.length===1 && M.handoffs[0].requestId==='r1','o segundo espera: a página do motor é uma só (colunas, modo e papéis são dela)');
  M.W._motorEstado.fase='carregando'; M.W._motorEstado.msg='Carregando bibliotecas…';
  M.R.avancar(4000);
  var pulso=M.doTipo('status').filter(function(m){ return m.requestId==='r1' && m.fase==='motor'; });
  ck(pulso.length>=1 && /bibliotecas/.test(pulso[pulso.length-1].msg),'a cada 4 s ela diz em que pé está: motor carregando, e o quê');
  M.W._motorEstado.fase='pronto';
  M.R.avancar(4000);
  ck(M.doTipo('status').some(function(m){ return m.requestId==='r1' && m.fase==='calculando'; }),'motor pronto: "calculando"');
  vm.runInContext("_agractaEmitirResultado({ok:true,eco:'um'})",M.W);
  vm.runInContext("_agractaEmitirResultado({ok:true,eco:'repetido'})",M.W);
  M.R.avancar(1);
  var res=M.doTipo('result');
  ck(res.length===1 && res[0].requestId==='r1' && res[0].resultado.eco==='um','a resposta leva o número do PRÓPRIO trabalho, uma vez só');
  ck(res[0].motor && res[0].motor.fase==='pronto','e diz como estava o motor (o app separa falha de motor de falha de dado)');
  ck(M.handoffs.length===2 && M.handoffs[1].requestId==='r2','só então o próximo entra na mesa');
  /* mesmo que chegue um terceiro no meio, o r2 continua dono da resposta */
  M.chega('r3');
  M.W.__semClique=true;
  vm.runInContext("_agractaEmitirResultado({ok:true,eco:'dois'})",M.W); M.R.avancar(1);
  res=M.doTipo('result');
  ck(res[1].requestId==='r2' && res[1].resultado.eco==='dois','com outro trabalho chegando no meio, a resposta não troca de dono (era o defeito)');
  /* r3: a análise nunca começa (erro inesperado no preparo) */
  M.R.avancar(8001);
  res=M.doTipo('result');
  ck(res.length===3 && res[2].requestId==='r3' && res[2].resultado.ok===false && /não começou/.test(res[2].resultado.erro),'análise que não começa não prende a fila: sai com o motivo em 8 s');
  /* dados que nem carregam */
  M.W.__semClique=false; M.W.__handoffDevolve=false; M.chega('r4'); M.R.avancar(1);
  res=M.doTipo('result');
  ck(res[3] && res[3].requestId==='r4' && res[3].resultado.ok===false,'dados que não carregam: resposta de erro na hora, com o número dele');
  M.W.__handoffDevolve=true;
  /* relatório que não atravessa */
  M.chega('r5'); vm.runInContext("_agractaEmitirResultado({__naoClona:true})",M.W); M.R.avancar(1);
  res=M.doTipo('result');
  ck(res[4] && res[4].requestId==='r5' && res[4].resultado.ok===false && /não pôde ser devolvido/.test(res[4].resultado.erro),'relatório que não atravessa ainda devolve uma resposta');
  /* motivo de uma análise que parou antes de calcular */
  M.chega('r6');
  vm.runInContext("_agUltimoAviso={msg:'Defina as colunas: tempo', em:Date.now()}",M.W);
  ck(vm.runInContext("_agMotivo(_agAtual,'x')",M.W)==='Defina as colunas: tempo','o motivo é o último aviso da própria análise');
  vm.runInContext("_agUltimoAviso={msg:'aviso velho', em:Date.now()-60000}",M.W);
  ck(vm.runInContext("_agMotivo(_agAtual,'padrão')",M.W)==='padrão','aviso de outro trabalho não vira motivo deste');
  M.W._motorEstado.fase='falhou'; M.W._motorEstado.sub='sem rede';
  ck(/não carregou neste aparelho \(sem rede\)/.test(vm.runInContext("_agMotivo(_agAtual,'x')",M.W)),'motor que não subiu é dito como tal');
  vm.runInContext("_agractaEmitirResultado({ok:false,erro:'Traceback (most recent call last): x'})",M.W); M.R.avancar(1);
  res=M.doTipo('result');
  ck(/^O motor estatístico não carregou neste aparelho \(sem rede\)/.test(res[res.length-1].resultado.erro),'e a resposta de um trabalho com o motor caído diz isso, não o traceback');

  /* trabalho sem dados nenhum: o "embutido" nem chega a ser ligado pela página,
     e mesmo assim a resposta sai (senão a fila ficava presa nele) */
  var M2=novoMotor(); M2.W.window.__agractaEmbed=false; M2.W.__handoffDevolve=false;
  M2.chega('v1'); M2.chega('v2'); M2.R.avancar(1);
  res=M2.doTipo('result');
  ck(res.length===2 && res[0].requestId==='v1' && res[1].requestId==='v2','trabalho vazio responde com erro e a fila anda');

  var X={}; vm.createContext(X); vm.runInContext(trecho(eng,'_erroCurto'),X);
  ck(X._erroCurto("Traceback (most recent call last):\n  File \"/home/pyodide/bioengine/doseresponse.py\", line 28, in <module>\n    import statsmodels.api as sm\nModuleNotFoundError: No module named 'statsmodels'\nThe module 'statsmodels' is included in the Pyodide distribution, but it is not installed.")==="ModuleNotFoundError: No module named 'statsmodels'",
     'traceback do Python vira a linha que diz o erro (o resto fica nos detalhes técnicos)');
  ck(X._erroCurto('Failed to fetch')==='Failed to fetch','erro que não é traceback passa como veio');

  /* ================================================== [2] o app */
  console.log('\n[2] o app dá prazo a cada etapa e nunca fica carregando sem fim');
  var app=fs.readFileSync('app.js','utf8');
  var ORIGEM='https://agracta.test';
  var codigoApp=[trecho(app,'_bioestatEnsureFrame'),trecho(app,'_bioestatMotorAberto'),trecho(app,'_bioestatPrimeiroUso'),
    entre(app,'var _bioLiberarT=null','function _bioestatPump(){'),trecho(app,'_bioestatPump'),trecho(app,'_bioestatDescartarFila'),
    trecho(app,'_bioestatRepetir'),
    'var __ouvinte='+entre(app,"window.addEventListener('message',function(ev){\n  if(ev.origin!==window.location.origin||!ev.data)return;","\n/* ===================== IMPORTAR PROTOCOLO").replace(/^window\.addEventListener\('message',/,'').replace(/\);\s*$/,'')+';'
  ].join('\n');
  function novoApp(o){
    o=o||{};
    var R=relogio(), corpo={filhos:[]}, statusEl=null, refrescos=[];
    corpo.appendChild=function(f){ f.parentNode=corpo; corpo.filhos.push(f); };
    corpo.removeChild=function(f){ corpo.filhos=corpo.filhos.filter(function(x){ return x!==f; }); f.parentNode=null; };
    function Frame(){ var s=this; this.style={}; this.recebidos=[]; this.contentWindow={postMessage:function(m){ s.recebidos.push(m); }}; }
    var doc={hidden:false, body:corpo,
      getElementById:function(id){ if(id==='bioAutoStatus') return statusEl; return corpo.filhos.filter(function(f){ return f.id===id; })[0]||null; },
      createElement:function(){ return new Frame(); }, addEventListener:function(){}};
    var A={console:{log(){},warn(){},error(){}}, JSON:JSON, Object:Object, Array:Array, String:String, Math:Math, URL:URL, Promise:Promise,
      Date:{now:function(){ return R.agora; }},
      setTimeout:R.setTimeout, clearTimeout:R.clear, setInterval:R.setInterval, clearInterval:R.clear,
      document:doc, location:{href:ORIGEM+'/'}, window:{location:{origin:ORIGEM}},
      caches:o.caches, MOTOR_VERSAO:'t',
      esc:function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); },
      _bioAutoCache:{}, _bioAutoQueue:[], _bioAutoPending:{}, _bioAutoBusy:null, _bioEngineReady:false,
      _bioestatRefreshOpen:function(c){ refrescos.push(c); }, _bioestatPersistir:function(){},
      _estudoDe:function(){ return {}; }, estudoFinalizado:function(){ return false; }, _bioestatEnsureStudy:function(){}};
    vm.createContext(A);
    vm.runInContext(codigoApp,A);
    return {A:A, R:R, doc:doc, refrescos:refrescos,
      status:function(qid,sid){ statusEl={innerHTML:'', getAttribute:function(k){ return k==='data-qid'?qid:(k==='data-sid'?sid:null); }}; return statusEl; },
      frame:function(){ return doc.getElementById('bioEngineFrame'); },
      fila:function(key,sig,jobs){
        A._bioAutoCache[key]={sig:sig,status:'loading',done:0,total:jobs.length,results:{},qid:key.split('|')[0],sid:key.split('|')[1]};
        jobs.forEach(function(jk,i){ var rid=key+'|'+sig+'|'+i;
          var it={requestId:rid,key:key,sig:sig,job:{jobKey:jk},payload:{requestId:rid,aoa:[[1]],modo:'analise'}};
          A._bioAutoQueue.push(it); A._bioAutoPending[rid]=it; });
        A._bioestatEnsureFrame(); A._bioestatPump();
      },
      ola:function(f){ A.__ouvinte({origin:ORIGEM, source:f.contentWindow, data:{type:'agracta:bioestat-ola'}}); },
      sinal:function(f,rid,fase,msg,sub){ A.__ouvinte({origin:ORIGEM, source:f.contentWindow, data:{type:'agracta:bioestat-status',requestId:rid,fase:fase,msg:msg,sub:sub}}); },
      resposta:function(rid,rel,motor){ A.__ouvinte({origin:ORIGEM, source:null, data:{type:'agracta:bioestat-result',requestId:rid,resultado:rel,motor:motor}}); }};
  }
  function ultimo(f){ return f.recebidos[f.recebidos.length-1]; }

  /* ---- partida lenta (o caso da foto) */
  var P=novoApp({caches:{match:function(){ return Promise.resolve(undefined); }}});
  P.fila('Q|S','s1',['av1|consumo foliar','av2|consumo foliar','__forense__|consumo foliar']);
  var f=P.frame();
  ck(f && /agracta_engine=1/.test(f.src),'abre a página do motor');
  ck(f.recebidos.length===0,'nada é mandado antes de ela dizer que escuta');
  P.ola(f);
  ck(f.recebidos.length===1 && ultimo(f).payload.requestId==='Q|S|s1|0','com o "olá", o primeiro trabalho vai');
  await espera();
  var el=P.status('Q','S');
  P.sinal(f,'Q|S|s1|0','recebido');
  for(var t=0;t<300;t+=4){ P.sinal(f,'Q|S|s1|0','motor','Carregando bibliotecas…','numpy, scipy, pandas, statsmodels'); P.R.avancar(4000); }
  var c=P.A._bioAutoCache['Q|S'];
  ck(f.recebidos.length===1 && c.done===0 && c.status==='loading','5 min carregando o motor (1º uso, rede lenta): ninguém desiste nem empurra o próximo — antes, aos 70 s, sim');
  ck(/Baixando o módulo estatístico/.test(el.innerHTML) && /5 min/.test(el.innerHTML) && /bibliotecas/.test(el.innerHTML),'a linha diz o que acontece e há quanto tempo ('+el.innerHTML.replace(/<small>.*$/,'')+')');
  ck(/115 MB/.test(el.innerHTML) && /Wi-Fi/.test(el.innerHTML),'e que é o primeiro uso, com o tamanho');
  P.sinal(f,'Q|S|s1|0','calculando'); P.R.avancar(3000);
  ck(/Calculando no aparelho… 0 de 3 prontas/.test(el.innerHTML),'motor pronto: "calculando", com a contagem');
  P.resposta('Q|S|s1|0',{ok:true,eco:'av1'},{fase:'pronto'});
  ck(c.results['av1|consumo foliar'] && c.results['av1|consumo foliar'].eco==='av1' && c.done===1,'a resposta entra no trabalho certo');
  ck(f.recebidos.length===2 && ultimo(f).payload.requestId==='Q|S|s1|1','e só então o segundo vai');
  ck(/Calculando no aparelho… 1 de 3 prontas/.test(el.innerHTML),'entre um trabalho e o próximo a linha segue "calculando" (sem piscar "carregando")');
  P.resposta('Q|S|s1|0',{ok:true,eco:'atrasada'},{fase:'pronto'});
  ck(c.done===1 && c.results['av1|consumo foliar'].eco==='av1','resposta repetida não conta duas vezes');
  P.sinal(f,'Q|S|s1|1','calculando'); P.resposta('Q|S|s1|1',{ok:true,eco:'av2'},{fase:'pronto'});
  P.sinal(f,'Q|S|s1|2','calculando'); P.resposta('Q|S|s1|2',{ok:true,eco:'forense'},{fase:'pronto'});
  ck(c.status==='ready' && c.results['__forense__|consumo foliar'].eco==='forense','fim: pronto, cada relatório no seu cartão');
  P.R.avancar(3000);
  ck(P.A._bioVigiaT===null,'fila vazia: a vigia para');
  P.R.avancar(45000);
  ck(!P.frame() && f.src==='about:blank','e o motor sai da memória 45 s depois, como antes');

  /* ---- página do motor que não abre */
  var B=novoApp();
  B.fila('Q|S','s',['a','b']);
  var f1=B.frame();
  B.R.avancar(58000);
  ck(B.frame()===f1,'aos 58 s a página ainda tem tempo para abrir');
  B.R.avancar(6000);
  var f2=B.frame();
  ck(f2 && f2!==f1 && f1.parentNode===null,'página do motor que não abre em 60 s é trocada por outra');
  B.R.avancar(64000);
  c=B.A._bioAutoCache['Q|S'];
  ck(c.status==='ready' && c.results.a.ok===false && /não abriu/.test(c.results.b.erro),'não abriu de novo: os trabalhos saem com o motivo — nada de "carregando" para sempre');
  ck(!B.A._bioAutoQueue.length && !B.A._bioAutoBusy && !B.frame(),'fila limpa, motor desmontado');
  ck(B.refrescos.some(function(x){ return x===c; }),'e a ficha aberta é repintada com os cartões de erro');

  /* ---- página que abre mas não confirma o trabalho */
  var E=novoApp();
  E.fila('Q|S','s',['a','b']);
  f1=E.frame(); E.ola(f1);
  var rid0=ultimo(f1).payload.requestId;
  E.R.avancar(21000);
  f2=E.frame();
  ck(f2 && f2!==f1 && f1.parentNode===null && f2.recebidos.length===0,'motor que não confirma em 20 s: página nova, e o trabalho espera ela abrir');
  E.ola(f2);
  ck(f2.recebidos.length===1 && ultimo(f2).payload.requestId===rid0,'o mesmo trabalho vai de novo, com o mesmo número');
  E.R.avancar(21000);
  c=E.A._bioAutoCache['Q|S'];
  ck(c.status==='ready' && /não respondeu/.test(c.results.a.erro) && /não respondeu/.test(c.results.b.erro) && !E.A._bioAutoQueue.length,'surdo duas vezes: tudo sai com o motivo');

  /* ---- motor que emudece no meio da partida */
  var F=novoApp();
  F.fila('Q|S','s',['a','b']);
  f1=F.frame(); F.ola(f1); rid0=ultimo(f1).payload.requestId;
  F.sinal(f1,rid0,'recebido'); F.sinal(f1,rid0,'motor','Carregando motor estatístico…');
  F.R.avancar(42000);
  ck(F.frame()===f1,'42 s calado ainda não é "mudo"');
  F.R.avancar(7000);
  f2=F.frame();
  ck(f2 && f2!==f1,'45 s sem nenhum aviso com trabalho na mesa: motor novo');
  F.ola(f2);
  ck(ultimo(f2).payload.requestId===rid0,'e o mesmo trabalho reenviado');
  F.sinal(f2,rid0,'recebido');
  F.R.avancar(49000);
  c=F.A._bioAutoCache['Q|S'];
  ck(c.results.a && c.results.a.ok===false && /parou de responder/.test(c.results.a.erro),'emudeceu de novo: esse trabalho sai com erro');
  var f3=F.frame(); F.ola(f3);
  ck(f3 && ultimo(f3) && ultimo(f3).payload.requestId!==rid0 && !c.results.b,'mas o próximo segue num motor novo');

  /* ---- análise que não termina */
  var G=novoApp();
  G.fila('Q|S','s',['a','b']);
  f1=G.frame(); G.ola(f1); rid0=ultimo(f1).payload.requestId;
  G.sinal(f1,rid0,'recebido');
  for(t=0;t<144;t+=4){ G.sinal(f1,rid0,'calculando'); G.R.avancar(4000); }
  ck(f1.parentNode && !G.A._bioAutoCache['Q|S'].results.a,'2 min 24 s calculando, avisando a cada 4 s: ainda dentro do prazo');
  for(t=144;t<156;t+=4){ G.sinal(f1,rid0,'calculando'); G.R.avancar(4000); }
  c=G.A._bioAutoCache['Q|S'];
  ck(c.results.a && /Tempo esgotado/.test(c.results.a.erro),'cálculo que passa de 150 s sai com "tempo esgotado"');
  ck(f1.parentNode===null,'e o motor preso nele é desmontado (o worker sai junto)');
  f2=G.frame(); G.ola(f2);
  ck(f2 && ultimo(f2).payload.requestId===G.A._bioAutoPending[ultimo(f2).payload.requestId].requestId && !c.results.b,'a próxima análise vai para um motor novo');

  /* ---- segundo plano */
  var H=novoApp();
  H.fila('Q|S','s',['a']);
  f1=H.frame(); H.ola(f1); rid0=ultimo(f1).payload.requestId;
  H.sinal(f1,rid0,'recebido'); H.sinal(f1,rid0,'motor');
  H.doc.hidden=true; H.R.avancar(30*60000); H.doc.hidden=false;
  ck(H.frame()===f1 && H.A._bioAutoBusy===rid0 && !H.A._bioAutoCache['Q|S'].done,'30 min com o app em segundo plano não contam como motor mudo nem lento');
  /* página presa (tique atrasado) conta no máximo dois tiques */
  H.sinal(f1,rid0,'motor'); H.R.saltar(10*60000); H.R.avancar(3000);
  ck(H.frame()===f1,'linha de execução presa por 10 min não vira "motor mudo" de uma vez');

  /* ---- motor que não sobe devolve o motivo uma vez */
  var J=novoApp();
  J.fila('Q|S','s',['a','b','c']);
  f1=J.frame(); J.ola(f1); rid0=ultimo(f1).payload.requestId;
  J.sinal(f1,rid0,'recebido');
  J.resposta(rid0,{ok:false,erro:'O motor estatístico não carregou neste aparelho: sem rede.'},{fase:'falhou'});
  c=J.A._bioAutoCache['Q|S'];
  ck(c.status==='ready' && c.results.b.erro===c.results.a.erro && c.results.c.erro===c.results.a.erro,'motor que não subiu: os outros trabalhos do estudo saem com o mesmo motivo de uma vez');
  ck(f1.recebidos.length===1,'sem mandar um por um para falhar igual');
  /* erro de DADO não derruba os outros */
  var J2=novoApp();
  J2.fila('Q|S','s',['a','b']);
  f1=J2.frame(); J2.ola(f1); rid0=ultimo(f1).payload.requestId;
  J2.resposta(rid0,{ok:false,erro:'Conferência da análise: resposta ausente'},{fase:'pronto'});
  ck(!J2.A._bioAutoCache['Q|S'].results.b && f1.recebidos.length===2,'erro de dado numa análise não derruba as outras');

  /* ---- olá de página velha e fila que não perde trabalho */
  var K=novoApp();
  K.fila('Q|S','s',['a']);
  f1=K.frame(); K.A._bioestatReiniciarMotor(); K.A._bioestatPump(); f2=K.frame();
  K.ola(f1);
  ck(!K.A._bioEngineReady && f2.recebidos.length===0,'"olá" de uma página já desmontada não conta');
  K.ola(f2);
  ck(f2.recebidos.length===1,'o da página da vez, sim');
  var L=novoApp();
  L.A._bioEngineReady=true;
  L.A._bioAutoCache['Q|S']={sig:'s',status:'loading',done:0,total:1,results:{}};
  var it={requestId:'x1',key:'Q|S',sig:'s',job:{jobKey:'a'},payload:{requestId:'x1'}};
  L.A._bioAutoQueue.push(it); L.A._bioAutoPending.x1=it;
  L.A._bioestatPump();
  ck(L.A._bioAutoQueue.length===1 && L.frame(),'motor fora da memória: o trabalho fica na fila e a página volta (antes ele saía da fila e sumia)');

  /* ---- a grade mudou: a fila velha sai */
  var I=novoApp();
  I.fila('Q|S','v1',['a','b','c']);
  f1=I.frame(); I.ola(f1);
  I.A._bioestatDescartarFila('Q|S');
  ck(I.A._bioAutoQueue.length===0 && Object.keys(I.A._bioAutoPending).length===1,'dados mudaram: os trabalhos da grade velha saem da fila (só o que já está na mesa termina)');

  /* ---- tentar de novo recomeça o motor e não perde trabalho de outro estudo */
  var T=novoApp();
  T.fila('Q|OUTRO','s',['x']);
  f1=T.frame(); T.ola(f1); var ridOutro=ultimo(f1).payload.requestId;
  T.A._bioestatRepetir('Q','S');
  f2=T.frame();
  ck(f1.parentNode===null && f2 && f2!==f1,'"Tentar de novo" recomeça o motor (a página nova esquece o Python que não subiu)');
  T.ola(f2);
  ck(ultimo(f2) && ultimo(f2).payload.requestId===ridOutro,'e o trabalho do outro estudo que estava na mesa volta para a fila');

  console.log('\n'+passes+' ok, '+falhas+' falha(s)');
  process.exit(falhas?1:0);
})().catch(function(e){ console.log('FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
