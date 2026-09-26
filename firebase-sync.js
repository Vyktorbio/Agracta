/* Agracta — adaptador Firebase + operação local-first.
 *
 * O estado ativo continua sendo gravado imediatamente no aparelho. O Firestore
 * recebe uma versão normalizada por entidade e sincroniza entre aparelhos.
 * O cofre offline e a fila de alterações pertencem ao próprio Agracta: não
 * ativamos o IndexedDB interno do Firestore, que pode quebrar ao retomar uma
 * aba suspensa. O Supabase antigo fica dormente para permitir rollback durante
 * a migração.
 */
(function(){
  'use strict';

  var CFG=window.AGRACTA_FIREBASE_CONFIG||{};
  var FB={
    app:null,auth:null,db:null,user:null,unsub:null,
    ready:false,pulling:false,pushing:false,resyncing:false,remoteFlat:null,
    lastRev:0,timer:null,checkpointTimer:null,checkpointPending:null,
    checkpointWaiters:[],checkpointChain:Promise.resolve(),pendingWrites:0,
    queuedState:null,pushPromise:null
  };
  var ROOT='workspaces/agracta';
  var ADMIN_EMAILS={
    'machadovictorchaves@gmail.com':true,
    'vyktorbio@gmail.com':true
  };
  var COLLECTIONS=['locais','quadras','estudos','aplicacoes','avaliacoes','lancamentos','notas_campo','randomizacoes','itens','config','media'];
  /* `media` (fotos das notas em fatias de base64) é só LEITURA desde a 14a
     publicação: a foto mora no aparelho (vendor/fotos-notas-core.js). As fatias
     antigas continuam sendo lidas, para cada aparelho migrar as suas, mas o app
     nunca mais grava, reescreve ou apaga nada ali — nem cria cópia delas no
     histórico. */
  var COLLECTIONS_GRAVACAO=COLLECTIONS.filter(function(c){return c!=='media';});
  var CHECKPOINT_DB='agracta-local-first',CHECKPOINT_STORE='snapshots',CHECKPOINT_KEY='active';
  var LOCAL_STATE_TS_KEY='agracta-local-state-ts';
  var TRUST_KEY='agracta-trusted-device',TRUST_VERSION=2;

  function configured(){
    return !!(CFG.apiKey&&CFG.authDomain&&CFG.projectId&&CFG.appId&&window.firebase);
  }
  function isFirebaseAdminEmail(email){
    return !!ADMIN_EMAILS[String(email||'').trim().toLowerCase()];
  }
  function clone(v){
    if(v==null)return v;
    return JSON.parse(JSON.stringify(v));
  }
  function clean(v){
    if(v===undefined)return null;
    if(v===null||typeof v==='string'||typeof v==='number'||typeof v==='boolean')return v;
    if(Array.isArray(v))return v.map(clean);
    if(typeof v==='object'){
      var o={};
      Object.keys(v).forEach(function(k){if(v[k]!==undefined)o[k]=clean(v[k]);});
      return o;
    }
    return String(v);
  }
  function stable(v){
    if(v===null||typeof v!=='object')return JSON.stringify(v);
    if(Array.isArray(v))return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}';
  }
  /* Firestore não aceita arrays diretamente dentro de outros arrays.
     O Agracta usa matrizes em geometrias/randomizações; por isso, arrays são
     representados como mapas numerados na nuvem e restaurados ao ler. */
  function firestoreEncode(v){
    if(Array.isArray(v)){
      var items={};
      v.forEach(function(x,i){items[String(i)]=firestoreEncode(x);});
      return {_agractaArray:true,_agractaLength:v.length,_agractaItems:items};
    }
    if(v&&typeof v==='object'){
      var o={};
      Object.keys(v).forEach(function(k){o[k]=firestoreEncode(v[k]);});
      return o;
    }
    return v;
  }
  function firestoreDecode(v){
    if(v&&typeof v==='object'&&v._agractaArray===true&&v._agractaItems){
      var a=[],n=Number(v._agractaLength)||0;
      for(var i=0;i<n;i++)a.push(firestoreDecode(v._agractaItems[String(i)]));
      return a;
    }
    if(v&&typeof v==='object'){
      var o={};
      Object.keys(v).forEach(function(k){o[k]=firestoreDecode(v[k]);});
      return o;
    }
    return v;
  }
  /* Nome de campo aceito pelo Firestore: não pode ser vazio nem reservado ('__...').
     Ponto e espaço são válidos aqui porque gravamos com set() de documento inteiro,
     que trata as chaves literalmente (não como field path). */
  function campoSeguro(k){
    k=String(k==null?'':k);
    return k!==''&&k.indexOf('__')!==0;
  }
  function docId(raw){
    var s=unescape(encodeURIComponent(String(raw)));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  /* "TEM ALGUMA COISA AQUI?" — e a resposta decide se um estado e preservado ou
     atropelado.
     ----------------------------------------------------------------------------
     Ela olhava so estudos, cultura, itens, notas e randomizacoes. NAO olhava o
     mapa: quadras desenhadas, locais cadastrados, imagem georreferenciada. Um dia
     inteiro desenhando a fazenda contava como NADA -- e isso quebrava em tres
     lugares, o ultimo deles apagando dado de verdade:

       1. hasLocalRecords/offlineAccessAllowed: quem mapeou a fazenda ontem nao
          conseguia abrir o app offline hoje, no campo. "Nao ha nada neste
          aparelho."
       2. A restauracao do cofre era pulada: o checkpoint com o mapa era ignorado
          e o app abria vazio.
       3. O PIOR, na primeira sincronizacao apos o login: se a NUVEM tem so o
          mapa, `meaningful(r.state)` dava false, o MERGE era pulado, e o estado
          local subia por cima. E queueOps apaga da nuvem tudo que existia no
          snapshot lido e nao existe no local -- ou seja, as quadras do colega
          desapareciam. Silencioso e sem volta pelo app.

     Agora conta o trabalho de mapa. Continua exigindo alguma coisa: workspace
     recem-criado tem `locais` com o unico local padrao e nada mais, e isso segue
     valendo nada -- e por isso que a contagem de locais pede MAIS de um, em vez
     de qualquer um. */
  function meaningful(st){
    if(!st)return false;
    if(Object.keys(st.itens||{}).length)return true;
    if((st.notas_campo||[]).length||(st.randomizacoes||[]).length)return true;
    /* Mapa desenhado e trabalho, e trabalho que ninguem refaz de cabeca. */
    if(Object.keys(st.qgeo||{}).length)return true;
    if(st.georef&&(st.georef.corners||[]).length)return true;
    if(Object.keys(st.locais||{}).length>1)return true;
    /* Lista de autorizados: perde-la e tirar o acesso das pessoas. O padrao e
       vazio, entao ter alguem aqui e declaracao de alguem. */
    try{ if((((st.data||{}).__config||{}).allowedUsers||[]).length)return true; }catch(e){}
    var d=st.data||{},yes=false;
    Object.keys(d).some(function(qid){
      if(qid==='__config')return false;
      var q=d[qid]||{};
      if((q.estudos||[]).length||q.cultura||q.cultivar||q.plantio){yes=true;return true;}
      return false;
    });
    return yes;
  }
  function localState(){
    try{return typeof cloudState==='function'?clone(cloudState()):null;}catch(e){return null;}
  }
  /* O lugar ativo NAO entra em cloudState() de proposito: ele e do APARELHO, nao
     da organizacao. Sincroniza-lo faria o tecnico que troca de talhao no celular
     arrastar a tela de quem esta no escritorio. Mas ele precisa sobreviver a
     restauracao do cofre, senao o aparelho volta com todos os dados e sem saber
     onde a pessoa estava — e cai num lugar arbitrario. Por isso viaja junto do
     checkpoint, que e local, e nao dentro do estado que sobe. */
  function localAtivoAtual(){
    try{return localStorage.getItem('iracema-local-ativo')||'';}catch(e){return '';}
  }

  function checkpointOpen(){
    return new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB indisponível'));return;}
      var req=indexedDB.open(CHECKPOINT_DB,1);
      req.onupgradeneeded=function(e){
        var db=e.target.result;
        if(!db.objectStoreNames.contains(CHECKPOINT_STORE))db.createObjectStore(CHECKPOINT_STORE);
      };
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error);};
    });
  }
  function checkpointWrite(record){
    return checkpointOpen().then(function(db){
      return new Promise(function(resolve,reject){
        var done=false;
        function close(){try{db.close();}catch(e){}}
        try{
          var tx=db.transaction(CHECKPOINT_STORE,'readwrite');
          tx.objectStore(CHECKPOINT_STORE).put(record,CHECKPOINT_KEY);
          tx.oncomplete=function(){
            if(done)return;done=true;close();
            /* O carimbo do localStorage só acompanha o checkpoint quando a
               última gravação síncrona do estado ativo não falhou. Se ela
               falhou por quota, deixar o carimbo antigo é proposital: na
               próxima abertura o checkpoint mais novo será restaurado. */
            if(window._agractaLocalSaveOk!==false){
              try{localStorage.setItem(LOCAL_STATE_TS_KEY,String(record.savedAt));}catch(e){}
            }
            resolve(true);
          };
          tx.onerror=function(){if(done)return;done=true;var e=tx.error||new Error('Falha ao gravar o cofre offline.');close();reject(e);};
          tx.onabort=function(){if(done)return;done=true;var e=tx.error||new Error('Gravação offline interrompida.');close();reject(e);};
        }catch(e){close();reject(e);}
      });
    });
  }
  function checkpointFlush(){
    clearTimeout(FB.checkpointTimer);FB.checkpointTimer=null;
    var pending=FB.checkpointPending;
    if(!pending)return FB.checkpointChain;
    FB.checkpointPending=null;
    var waiters=FB.checkpointWaiters.splice(0,FB.checkpointWaiters.length);
    /* Serializa as transações: um checkpoint antigo nunca pode terminar depois
       do novo e sobrescrevê-lo. */
    var run=FB.checkpointChain.catch(function(){}).then(function(){return checkpointWrite(pending);});
    FB.checkpointChain=run;
    run.then(function(v){checkpointOk();waiters.forEach(function(w){w.resolve(v);});},
             function(e){waiters.forEach(function(w){w.reject(e);});});
    return run;
  }
  /* ===== A FALHA DO COFRE OFFLINE PRECISA APARECER ==========================
     Seis pontos mandavam esta falha so para o console. O estado da nuvem
     continua salvo, entao nao ha perda de dado — mas o COFRE deste aparelho
     fica defasado, e isso so se descobre no campo, sem sinal, que e o pior
     lugar possivel para descobrir.

     O mesmo erro ja aparecia na tela no caminho puramente offline ("falha ao
     salvar neste aparelho"); era so aqui que ficava mudo. Silencio e a unica
     resposta que ninguem consegue interpretar.

     Nao muda NADA do que se le ou se grava: so troca o silencio por um aviso,
     e o aviso some sozinho quando o proximo checkpoint der certo. */
  function checkpointFalhou(e){
    console.error('[Agracta offline] checkpoint:',e);
    FB.cofreDefasado=true;
    /* Em pagehide/visibilitychange a pagina esta indo embora: pintar selo ali
       nao adianta, mas registrar que o cofre ficou para tras adianta. */
    try{ if(typeof document==='undefined' || !document.hidden)
      cloudBadge('offline','=⌁ nuvem em dia · o cofre offline deste aparelho não atualizou'); }catch(_e){}
  }
  function checkpointOk(){
    if(!FB.cofreDefasado) return;
    FB.cofreDefasado=false;
    try{ if(typeof document==='undefined' || !document.hidden) cloudBadge('saved'); }catch(_e){}
  }
  function checkpointPut(st,immediate){
    if(!st)return Promise.resolve(false);
    FB.checkpointPending={savedAt:Date.now(),state:clean(st),localAtivo:localAtivoAtual()};
    var promise=new Promise(function(resolve,reject){FB.checkpointWaiters.push({resolve:resolve,reject:reject});});
    clearTimeout(FB.checkpointTimer);
    if(immediate)checkpointFlush();
    else FB.checkpointTimer=setTimeout(checkpointFlush,90);
    return promise;
  }
  function checkpointGet(){
    return checkpointOpen().then(function(db){
      return new Promise(function(resolve){
        var tx=db.transaction(CHECKPOINT_STORE,'readonly');
        var req=tx.objectStore(CHECKPOINT_STORE).get(CHECKPOINT_KEY);
        req.onsuccess=function(){var v=req.result||null;db.close();resolve(v);};
        req.onerror=function(){db.close();resolve(null);};
      });
    }).catch(function(){return null;});
  }
  /* ===== ARMAZENAMENTO CHEIO NAO PODE DESFAZER TRABALHO ======================
     Com o armazenamento rapido (localStorage) cheio, save() falha e a edicao
     so fica na memoria e no cofre (IndexedDB). Na abertura seguinte o app lia
     o localStorage — a copia de ANTES da edicao — e tentava devolver o cofre
     para ele. Sem espaco, falhava calado, e o app abria com a copia velha:
     estudos finalizados voltavam abertos, a cada recarga.

     Agora, quando o cofre e mais novo e nao cabe no localStorage, ele entra
     direto na memoria, PELO MERGE (uniao: nada do que esta na memoria nem no
     cofre se perde), e a uniao sobe para a nuvem. O localStorage deixa de ser
     condicao para o dado existir. */
  function aplicarCofreNaMemoria(snap,tentativas){
    tentativas=tentativas||0;
    if(typeof window.cloudApply!=='function'||typeof window.cloudState!=='function'||
       (typeof document!=='undefined'&&document.readyState==='loading')){
      if(tentativas<50)setTimeout(function(){aplicarCofreNaMemoria(snap,tentativas+1);},200);
      return false;
    }
    try{
      var st=clone(snap.state);
      /* A revisao do cofre pode ser menor que a da nuvem ja lida; o cofre nao e
         leitura velha da nuvem, e trabalho deste aparelho — nao pode ser
         descartado pela protecao de "estado mais antigo". */
      delete st.rev;
      if(typeof setUnsavedChanges==='function')setUnsavedChanges(true);
      window.cloudApply(st);
      FB.cofreNaMemoria=true;
      cloudBadge('offline','=⚠ armazenamento do aparelho cheio · dados abertos pelo cofre offline');
      return true;
    }catch(e){console.error('[Agracta offline] cofre na memória:',e);return false;}
  }
  function restoreCheckpointToLocal(st,savedAt,localAtivo){
    if(!st)return false;
    try{
      /* Backups completos repetidos são a causa mais comum de quota cheia.
         O checkpoint já é o backup de recuperação mais novo; abre espaço antes
         de tentar devolver o estado ativo ao armazenamento síncrono. */
      try{localStorage.removeItem('iracema-safety');}catch(e){}
      if(st.data)localStorage.setItem('iracema-v7',JSON.stringify(st.data));
      if(st.qgeo)localStorage.setItem('iracema-qgeo-v1',JSON.stringify(st.qgeo));
      if(st.qgeots)localStorage.setItem('iracema-qgeots-v1',JSON.stringify(st.qgeots));
      if(st.georef)localStorage.setItem('iracema-georef-v1',JSON.stringify(st.georef));
      if(st.georefts!=null)localStorage.setItem('iracema-georefts-v1',String(st.georefts));
      if(st.locais)localStorage.setItem('iracema-locais-v1',JSON.stringify(st.locais));
      if(st.qlocal)localStorage.setItem('iracema-qlocal-v1',JSON.stringify(st.qlocal));
      if(st.qnome)localStorage.setItem('iracema-qnome-v1',JSON.stringify(st.qnome));
      if(st.qnomets)localStorage.setItem('iracema-qnomets-v1',JSON.stringify(st.qnomets));
      if(st.qlocalts)localStorage.setItem('iracema-qlocalts-v1',JSON.stringify(st.qlocalts));
      if(st.locaists)localStorage.setItem('iracema-locaists-v1',JSON.stringify(st.locaists));
      if(st.randomizacoes)localStorage.setItem('iracema-randomizacoes-v1',JSON.stringify(st.randomizacoes));
      if(st.notas_campo)localStorage.setItem('iracema-notas-v1',JSON.stringify(st.notas_campo));
      if(st._deletedQuadras)localStorage.setItem('iracema-delq-v1',JSON.stringify(st._deletedQuadras));
      if(st._deletedLocais)localStorage.setItem('iracema-dell-v1',JSON.stringify(st._deletedLocais));
      if(st._deletedNotas)localStorage.setItem('iracema-deln-v1',JSON.stringify(st._deletedNotas));
      if(st.itens)localStorage.setItem('agracta-itens-v1',JSON.stringify(st.itens));
      if(st.itensts)localStorage.setItem('agracta-itens-ts-v1',JSON.stringify(st.itensts));
      if(st._deletedItens)localStorage.setItem('agracta-itens-del-v1',JSON.stringify(st._deletedItens));
      /* Devolve o lugar em que a pessoa estava. So quando ele ainda existe entre
         os lugares restaurados: apontar para um lugar apagado faria o app cair no
         mesmo palpite que esta restauracao existe para evitar. */
      if(localAtivo&&st.locais&&st.locais[localAtivo])localStorage.setItem('iracema-local-ativo',localAtivo);
      localStorage.setItem('iracema-unsaved','true');
      localStorage.setItem(LOCAL_STATE_TS_KEY,String(savedAt||Date.now()));
      window._agractaLocalSaveOk=true;
      return true;
    }catch(e){window._agractaLocalSaveOk=false;return false;}
  }
  try{
    if(sessionStorage.getItem('agracta-idb-restored')!=='1'){
      checkpointGet().then(function(snap){
        if(snap&&snap.state&&meaningful(snap.state)){
          var temLocal=!!localStorage.getItem('iracema-v7');
          var localTs=parseInt(localStorage.getItem(LOCAL_STATE_TS_KEY)||'0',10)||0;
          var atual=localState(),iguais=false;
          try{iguais=stable(clean(atual))===stable(clean(snap.state));}catch(e){}
          if(iguais){
            try{localStorage.setItem(LOCAL_STATE_TS_KEY,String(snap.savedAt||localTs||Date.now()));}catch(e){}
            sessionStorage.setItem('agracta-idb-restored','1');
            return;
          }
          if(!temLocal || (snap.savedAt||0)>localTs){
            if(restoreCheckpointToLocal(snap.state,snap.savedAt,snap.localAtivo)){
              sessionStorage.setItem('agracta-idb-restored','1');
              location.reload();
            }else aplicarCofreNaMemoria(snap);
          }
        }
      });
    }
  }catch(e){}

  var originalSave=window.save;
  if(typeof originalSave==='function'){
    window.save=function(){
      var out=originalSave.apply(this,arguments);
      checkpointPut(localState()).catch(checkpointFalhou);
      return out;
    };
  }

  function firebaseInit(){
    if(FB.ready)return FB;
    if(!configured())return null;
    try{
      FB.app=window.firebase.apps&&window.firebase.apps.length?window.firebase.app():window.firebase.initializeApp(CFG);
      FB.auth=window.firebase.auth();
      FB.db=window.firebase.firestore();
      try{FB.db.settings({ignoreUndefinedProperties:true,merge:true});}catch(e){}
      /* Não habilitar enablePersistence() aqui. O SDK do Firestore mantém outra
         base IndexedDB e outra fila além do cofre local do Agracta. Em Chrome /
         WebKit essa persistência pode ficar inválida depois que a aba volta do
         segundo plano (INTERNAL ASSERTION FAILED: Unexpected state). Com o cache
         padrão em memória, uma tentativa sem rede continua marcada como pendente
         pelo Agracta e é reenviada a partir do checkpoint quando a conexão volta. */
      try{FB.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);}catch(e){}
      FB.ready=true;
      return FB;
    }catch(e){
      console.error('[Agracta Firebase] inicialização:',e);
      return null;
    }
  }
  function trustedDevice(){
    try{
      var t=JSON.parse(localStorage.getItem(TRUST_KEY)||'null');
      if(!t||t.v!==TRUST_VERSION||!t.uid||!t.email||!t.authenticatedAt)return null;
      return t;
    }catch(e){return null;}
  }
  function rememberTrustedUser(user,nome){
    if(!user||!user.uid||!user.email)return null;
    var old=trustedDevice()||{};
    var t={
      v:TRUST_VERSION,uid:String(user.uid),email:String(user.email).trim().toLowerCase(),
      name:String(nome||user.displayName||old.name||'').trim(),authenticatedAt:Date.now()
    };
    try{localStorage.setItem(TRUST_KEY,JSON.stringify(t));}catch(e){return null;}
    return t;
  }
  function trustedForUser(user){
    var t=trustedDevice();
    return !!(t&&user&&String(t.uid)===String(user.uid)&&t.email===String(user.email||'').trim().toLowerCase());
  }
  function offlineAccessAllowed(){return !!(trustedDevice()&&hasLocalRecords());}
  function startLocal(txt){
    if(!window._appStarted)window._appStarted=true;
    window._cloudInitDone=true;
    try{hideAuthGate();}catch(e){}
    try{cloudBadge('offline','=↻ salvando neste aparelho…');}catch(e){}
    checkpointPut(localState(),true).then(function(){
      try{cloudBadge('offline',txt||'=⌁ sessão local · sem sincronização');}catch(e){}
    }).catch(function(e){
      try{cloudBadge('error','— falha ao salvar neste aparelho');}catch(_e){}
      console.error('[Agracta offline] checkpoint:',e);
    });
  }
  function hasLocalRecords(){return meaningful(localState());}
  function addOfflineButton(){
    var box=document.querySelector('.auth-box');
    var trust=trustedDevice();
    if(!box||document.getElementById('authOfflineBtn')||!trust||!hasLocalRecords())return;
    var nome=String(trust.name||'').trim();
    try{if(!nome&&typeof window._currentUserName==='function')nome=String(window._currentUserName()||'').trim();}catch(e){}
    var nomeWrap=null;
    if(!nome){
      nomeWrap=document.createElement('label');
      nomeWrap.id='authOfflineNameWrap';
      nomeWrap.style.cssText='display:block;margin-top:14px;text-align:left;color:#5c6b62;font:650 12px/1.35 system-ui,sans-serif';
      nomeWrap.innerHTML='Seu nome no registro BPL<input id="authOfflineName" type="text" autocomplete="name" maxlength="120" placeholder="Ex.: Machado, V. C. — CRBio-01" style="display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:12px 13px;border:1px solid #cfd8d1;border-radius:12px;background:#fff;color:#26352c;font:600 14px system-ui,sans-serif;outline:none"><small style="display:block;margin-top:5px;color:#7a887f;font-weight:500">Fica salvo neste aparelho e aparece no lugar do e-mail.</small>';
    }
    var b=document.createElement('button');
    b.id='authOfflineBtn';b.type='button';b.className='auth-btn';
    b.style.cssText='margin-top:9px;background:#eef2ee;color:#35443b;border:1px solid #cfd8d1';
    b.textContent='Entrar sem conexão neste aparelho';
    b.onclick=function(){
      var n=nome;
      if(!n){var inp=document.getElementById('authOfflineName');n=String((inp&&inp.value)||'').trim();}
      if(!n||n.length<3){try{authErr('Informe o nome da pessoa responsável antes de continuar offline.');}catch(e){}var el=document.getElementById('authOfflineName');if(el)el.focus();return;}
      window._authUser={id:trust.uid,uid:trust.uid,email:trust.email,email_verified:true,
        displayName:n,name:n,offline:true};
      try{if(typeof window._gravarNomeAssinatura==='function')window._gravarNomeAssinatura(n);}catch(e){}
      rememberTrustedUser({uid:trust.uid,email:trust.email,displayName:n},n);
      startLocal('— sessão local · sem sincronização');
    };
    var foot=box.querySelector('.auth-foot');
    if(nomeWrap)box.insertBefore(nomeWrap,foot||null);
    box.insertBefore(b,foot||null);
  }
  var originalBuildAuthGate=window.buildAuthGate;
  window.buildAuthGate=function(){
    if(typeof originalBuildAuthGate==='function')originalBuildAuthGate();
    addOfflineButton();
  };
  var originalShowAuthGate=window.showAuthGate;
  window.showAuthGate=function(){
    if(typeof originalShowAuthGate==='function')originalShowAuthGate();
    setTimeout(addOfflineButton,0);
  };

  function onFirebaseUser(user){
    FB.user=user;
    window._authUser=user?{
      id:user.uid,uid:user.uid,email:user.email||'',email_verified:!!user.emailVerified,
      displayName:user.displayName||'',name:user.displayName||''
    }:null;
    if(user){
      if(trustedForUser(user)){
        try{hideAuthGate();}catch(e){}
      }else{
        try{buildAuthGate();showAuthGate();authErr('Verificando permissão de acesso…');authBusy(true);}catch(e){}
      }
      if(!window._appStarted)window._appStarted=true;
      /* Carrega o nome administrado no roster mesmo para usuários que nunca
         abriram o Painel Admin. Assim a primeira avaliação da sessão já é
         atribuída à pessoa, não ao e-mail. */
      try{
        var email=String(user.email||'').toLowerCase().trim();
        if(email&&FB.db) FB.db.doc(ROOT).collection('members').doc(email).get().then(function(doc){
          if(!doc||!doc.exists)return;
          var m=doc.data()||{}, nome=String(m.nome||'').trim();
          if(nome&&window._authUser){window._authUser.displayName=nome;window._authUser.name=nome;}
          var arr=window._perfisCache||[];
          var p=arr.find(function(x){return x&&x.email&&String(x.email).toLowerCase().trim()===email;});
          if(p){p.nome=nome||p.nome;p.active=m.active!==false;}
          else arr.push({email:email,nome:nome,active:m.active!==false});
          window._perfisCache=arr;
        }).catch(function(){});
      }catch(e){}
      cloudStart();
    }
  }

  window._saveOwnDisplayName=function(nome){
    nome=String(nome||'').trim();
    if(!nome||!FB.user||typeof FB.user.updateProfile!=='function')return Promise.resolve(false);
    return FB.user.updateProfile({displayName:nome}).then(function(){
      if(window._authUser){window._authUser.displayName=nome;window._authUser.name=nome;}
      return true;
    }).catch(function(){return false;});
  };
  window.authInit=function(){
    if(!firebaseInit()){
      buildAuthGate();showAuthGate();
      try{authErr(offlineAccessAllowed()
        ? 'Sem conexão com o login. Use a entrada offline deste aparelho.'
        : 'Sem conexão com o login. Este aparelho precisa entrar online ao menos uma vez.');}catch(e){}
      return;
    }
    buildAuthGate();
    FB.auth.onAuthStateChanged(function(user){
      if(user)onFirebaseUser(user);
      else{
        FB.user=null;window._authUser=null;
        /* O modo local continua disponível no botão, mas a tela de login precisa
           aparecer para que o usuário consiga retomar a sincronização. */
        showAuthGate();
      }
    });
  };
  window.doLogin=function(){
    if(!firebaseInit()){authErr('Firebase ainda não configurado.');return;}
    var email=((document.getElementById('authEmail')||{}).value||'').trim();
    var pass=(document.getElementById('authPass')||{}).value||'';
    if(!email||!pass){authErr('Preencha e-mail e senha.');return;}
    authErr('');authBusy(true);
    FB.auth.signInWithEmailAndPassword(email,pass).then(function(){
      authBusy(false);
    }).catch(function(err){
      authBusy(false);
      var msg=(err&&(/invalid-credential|wrong-password|user-not-found/.test(err.code||'')))?'E-mail ou senha incorretos.':
        ((err&&err.code==='auth/too-many-requests')?'Muitas tentativas. Aguarde alguns minutos.':'Não foi possível entrar: '+(err.message||err));
      authErr(msg);
    });
  };
  window.doLogout=function(){
    if(typeof closeMainMenu==='function')closeMainMenu();
    checkpointPut(localState(),true).catch(checkpointFalhou);
    try{localStorage.removeItem(TRUST_KEY);}catch(e){}
    if(FB.auth)FB.auth.signOut();
    FB.user=null;window._authUser=null;
    showAuthGate();
  };

  function splitState(st){
    var flat={};
    COLLECTIONS.forEach(function(c){flat[c]={};});
    st=st||{};
    flat.config.main=clean({
      data:(st.data&&st.data.__config)||{},
      georef:st.georef||null,georefts:st.georefts||0,
      deletedQuadras:st._deletedQuadras||{},
      deletedLocais:st._deletedLocais||{},
      deletedNotas:st._deletedNotas||{},
      deletedItens:st._deletedItens||{}
    });
    /* O banco de itens e global para a organizacao. Cada item ocupa um documento:
       alterar uma dose ou um lote nao regrava o catalogo inteiro, e dois aparelhos
       que criam itens diferentes podem sincronizar sem se atropelar. */
    Object.keys(st.itens||{}).forEach(function(id){
      if((st._deletedItens||{})[id] && (((st.itensts||{})[id]||0)<=(st._deletedItens||{})[id])) return;
      flat.itens[docId(id)]=clean({id:id,value:st.itens[id],ts:(st.itensts||{})[id]||0});
    });
    Object.keys(st.locais||{}).forEach(function(id){
      flat.locais[docId(id)]=clean({id:id,value:st.locais[id],ts:(st.locaists||{})[id]||0});
    });
    Object.keys(st.data||{}).forEach(function(qid){
      if(qid==='__config')return;
      var q=clone(st.data[qid]||{}),studies=q.estudos||[];
      delete q.estudos;
      flat.quadras[docId(qid)]=clean({
        id:qid,data:q,geo:(st.qgeo||{})[qid]||null,
        geoTs:(st.qgeots||{})[qid]||0,
        nome:(st.qnome||{})[qid]||qid,nomeTs:(st.qnomets||{})[qid]||0,
        localId:(st.qlocal||{})[qid]||'iracemapolis',localTs:(st.qlocalts||{})[qid]||0
      });
      studies.forEach(function(s,si){
        if(!s||!s.id)return;
        var study=clone(s),apps=study.aplicacoes||[],avs=study.avaliacoes||[];
        delete study.aplicacoes;delete study.avaliacoes;
        flat.estudos[docId(s.id)]=clean({id:s.id,quadraId:qid,order:si,data:study});
        apps.forEach(function(a,ai){
          if(a&&a.id)flat.aplicacoes[docId(a.id)]=clean({id:a.id,estudoId:s.id,order:ai,data:a});
        });
        avs.forEach(function(a,vi){
          if(!a||!a.id)return;
          var av=clone(a),notas=av.notas||{},metas=av.notasMeta||{};
          delete av.notas;delete av.notasMeta;
          /* bruto (sub-amostras / razão n-N) e varcfg são indexados por NOME DE VARIÁVEL, que é
             texto livre — e o Firestore recusa campo vazio ou com prefixo '__', derrubando o batch
             inteiro. Vão como string JSON: nome de variável nenhum vira nome de campo. */
          var brutoJson='',varcfgJson='';
          try{ if(av.bruto&&Object.keys(av.bruto).length) brutoJson=JSON.stringify(av.bruto); }catch(e){}
          try{ if(av.varcfg&&Object.keys(av.varcfg).length) varcfgJson=JSON.stringify(av.varcfg); }catch(e){}
          delete av.bruto; delete av.varcfg;
          if(brutoJson) av.brutoJson=brutoJson;
          if(varcfgJson) av.varcfgJson=varcfgJson;
          var avKey=s.id+'|'+a.id;
          /* notas/notasMeta vão DENTRO do doc da avaliação: 1 documento por avaliação em vez de
             1 por célula. readRemote() lê a coleção inteira a cada pull, então cada célula solta
             custava uma leitura por sincronização — era o que estourava a cota diária.
             Os docs antigos de 'lancamentos' ficam órfãos e o próprio queueOps os apaga.
             Parcela/variável agora são NOMES DE CAMPO; as que o Firestore recusa (vazias ou
             começando com '__') continuam indo como doc solto, senão o batch inteiro falharia. */
          var notasOk={},metasOk={};
          Object.keys(notas).forEach(function(parcela){
            Object.keys(notas[parcela]||{}).forEach(function(variavel){
              var meta=(metas[parcela]&&metas[parcela][variavel])||null;
              if(campoSeguro(parcela)&&campoSeguro(variavel)){
                (notasOk[parcela]=notasOk[parcela]||{})[variavel]=notas[parcela][variavel];
                if(meta)(metasOk[parcela]=metasOk[parcela]||{})[variavel]=meta;
                return;
              }
              var key=avKey+'|'+parcela+'|'+variavel;
              flat.lancamentos[docId(key)]=clean({
                key:key,avaliacaoKey:avKey,parcela:parcela,variavel:variavel,
                valor:notas[parcela][variavel],meta:meta
              });
            });
          });
          flat.avaliacoes[docId(avKey)]=clean({
            key:avKey,id:a.id,estudoId:s.id,order:vi,data:av,
            notas:notasOk,notasMeta:metasOk
          });
        });
      });
    });
    (st.notas_campo||[]).forEach(function(n,ni){
      if(!n||!n.id)return;
      /* A foto nunca sobe: fica no aparelho. Só a etiqueta `fotoLocal` viaja. */
      var note=clone(n);
      delete note.foto;
      flat.notas_campo[docId(n.id)]=clean({id:n.id,order:ni,data:note});
    });
    (st.randomizacoes||[]).forEach(function(r,ri){
      if(r&&r.id)flat.randomizacoes[docId(r.id)]=clean({id:r.id,order:ri,data:r});
    });
    COLLECTIONS.forEach(function(c){
      Object.keys(flat[c]).forEach(function(id){flat[c][id]=firestoreEncode(flat[c][id]);});
    });
    return flat;
  }

  function blankState(){
    return {data:{},qgeo:{},qgeots:{},georef:null,georefts:0,locais:{},qlocal:{},qnome:{},
      qnomets:{},qlocalts:{},locaists:{},randomizacoes:[],notas_campo:[],
      itens:{},itensts:{},_deletedItens:{},
      _deletedQuadras:{},_deletedLocais:{},_deletedNotas:{},rev:0};
  }
  function buildState(flat,meta){
    var decoded={};
    COLLECTIONS.forEach(function(c){
      decoded[c]={};
      Object.keys((flat&&flat[c])||{}).forEach(function(id){decoded[c][id]=firestoreDecode(flat[c][id]);});
    });
    flat=decoded;
    var st=blankState(),studies={},avs={},notes={},media={};
    var cfg=flat.config.main||{};
    st.data.__config=clone(cfg.data||{});
    st.georef=clone(cfg.georef||null);st.georefts=cfg.georefts||0;
    st._deletedQuadras=clone(cfg.deletedQuadras||{});
    st._deletedLocais=clone(cfg.deletedLocais||{});
    st._deletedNotas=clone(cfg.deletedNotas||{});
    st._deletedItens=clone(cfg.deletedItens||{});
    Object.keys(flat.itens).forEach(function(k){
      var r=flat.itens[k]; if(!r||!r.id)return;
      st.itens[r.id]=clone(r.value||{});st.itensts[r.id]=r.ts||0;
    });
    Object.keys(flat.locais).forEach(function(k){var r=flat.locais[k];st.locais[r.id]=clone(r.value||{});st.locaists[r.id]=r.ts||0;});
    Object.keys(flat.quadras).forEach(function(k){
      var r=flat.quadras[k],q=clone(r.data||{});q.estudos=[];st.data[r.id]=q;
      if(r.geo)st.qgeo[r.id]=clone(r.geo);st.qgeots[r.id]=r.geoTs||0;
      st.qnome[r.id]=r.nome||r.id;st.qnomets[r.id]=r.nomeTs||0;
      st.qlocal[r.id]=r.localId||'iracemapolis';st.qlocalts[r.id]=r.localTs||0;
    });
    Object.keys(flat.estudos).forEach(function(k){
      var r=flat.estudos[k],s=clone(r.data||{});s.id=r.id;s.aplicacoes=[];s.avaliacoes=[];
      studies[r.id]={row:r,value:s};
      if(st.data[r.quadraId])st.data[r.quadraId].estudos.push({order:r.order||0,value:s});
    });
    Object.keys(st.data).forEach(function(qid){
      if(qid!=='__config')st.data[qid].estudos=(st.data[qid].estudos||[]).sort(function(a,b){return a.order-b.order;}).map(function(x){return x.value;});
    });
    Object.keys(flat.aplicacoes).forEach(function(k){
      var r=flat.aplicacoes[k],s=studies[r.estudoId];
      if(s)s.value.aplicacoes.push({order:r.order||0,value:clone(r.data||{})});
    });
    Object.keys(flat.avaliacoes).forEach(function(k){
      var r=flat.avaliacoes[k],s=studies[r.estudoId];
      if(!s)return;
      var a=clone(r.data||{});a.id=r.id;a.notas=clone(r.notas||{});a.notasMeta=clone(r.notasMeta||{});
      if(a.brutoJson!=null){ try{ a.bruto=JSON.parse(a.brutoJson)||{}; }catch(e){ a.bruto={}; } delete a.brutoJson; }
      if(a.varcfgJson!=null){ try{ a.varcfg=JSON.parse(a.varcfgJson)||{}; }catch(e){ a.varcfg={}; } delete a.varcfgJson; }
      avs[r.key]=a;
      s.value.avaliacoes.push({order:r.order||0,value:a});
    });
    Object.keys(studies).forEach(function(id){
      var s=studies[id].value;
      s.aplicacoes.sort(function(a,b){return a.order-b.order;});
      s.aplicacoes=s.aplicacoes.map(function(x){return x.value;});
      s.avaliacoes.sort(function(a,b){return a.order-b.order;});
      s.avaliacoes=s.avaliacoes.map(function(x){return x.value;});
    });
    /* compat: células no formato antigo (1 doc por lançamento). Só preenchem o que o doc da
       avaliação ainda não trouxe — o formato novo tem prioridade durante a transição. */
    Object.keys(flat.lancamentos).forEach(function(k){
      var r=flat.lancamentos[k],a=avs[r.avaliacaoKey];
      if(!a)return;
      var row=(a.notas[r.parcela]=a.notas[r.parcela]||{});
      if(!Object.prototype.hasOwnProperty.call(row,r.variavel))row[r.variavel]=r.valor;
      if(r.meta){
        var mrow=(a.notasMeta[r.parcela]=a.notasMeta[r.parcela]||{});
        if(!mrow[r.variavel])mrow[r.variavel]=clone(r.meta);
      }
    });
    Object.keys(flat.media).forEach(function(k){
      var r=flat.media[k];(media[r.noteId]=media[r.noteId]||[])[r.part||0]=r.data||'';
    });
    Object.keys(flat.notas_campo).forEach(function(k){
      var r=flat.notas_campo[k],n=clone(r.data||{});n.id=r.id;
      /* Foto antiga ainda no servidor: entrega para o app migrar para o aparelho. */
      if(media[r.id]&&!(n.fotoLocal))n.foto=media[r.id].join('');
      notes[r.id]={order:r.order||0,value:n};
    });
    st.notas_campo=Object.keys(notes).map(function(id){return notes[id];}).sort(function(a,b){return a.order-b.order;}).map(function(x){return x.value;});
    st.randomizacoes=Object.keys(flat.randomizacoes).map(function(k){return flat.randomizacoes[k];}).sort(function(a,b){return (a.order||0)-(b.order||0);}).map(function(r){return clone(r.data||{});});
    st.rev=(meta&&meta.rev)||0;
    return st;
  }

  function collectionRef(name){return FB.db.doc(ROOT).collection(name);}
  function readCollection(name){
    return collectionRef(name).get().then(function(snap){
      var out={};snap.forEach(function(d){out[d.id]=d.data();});return out;
    });
  }
  function readRemote(){
    if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
    FB.pulling=true;
    var reads=COLLECTIONS.map(readCollection);
    reads.push(FB.db.doc(ROOT).get());
    return Promise.all(reads).then(function(all){
      var flat={};COLLECTIONS.forEach(function(c,i){flat[c]=all[i]||{};});
      var root=all[COLLECTIONS.length],meta=(root&&root.exists)?root.data():{};
      FB.remoteFlat=flat;FB.lastRev=meta.rev||0;FB.pulling=false;
      return {flat:flat,meta:meta,state:buildState(flat,meta)};
    }).catch(function(e){FB.pulling=false;throw e;});
  }
  function queueOps(next){
    var prev=FB.remoteFlat||{},ops=[];
    COLLECTIONS_GRAVACAO.forEach(function(c){
      var n=next[c]||{},p=prev[c]||{};
      Object.keys(n).forEach(function(id){
        if(!p[id]||stable(p[id])!==stable(n[id]))ops.push(opEscrita(c,id,p[id],n[id]).op);
      });
      Object.keys(p).forEach(function(id){
        if(!n[id])ops.push({type:'delete',ref:collectionRef(c).doc(id)});
      });
    });
    return ops;
  }
  function commitState(st){
    if(!firebaseInit()||!FB.user){
      cloudBadge('offline','=↻ salvando neste aparelho…');
      return checkpointPut(st,true).then(function(){cloudBadge('offline','=⌁ sessão local · sem sincronização');return false;},function(e){
        cloudBadge('error','— falha ao salvar neste aparelho');throw e;
      });
    }
    if(FB.pushing){
      FB.queuedState=st;
      return FB.pushPromise||Promise.resolve(false);
    }
    FB.pushing=true;window._cloudSavingActive=true;
    var next=splitState(st),newRev=Math.max(FB.lastRev||0,st.rev||0)+1;
    var ops=[],batches=[];
    /* Histórico de versões no servidor (vendor/versoes-core.js). Cada documento
       alterado leva, no MESMO lote, um registro em `historico` com o conteúdo
       anterior dele. As regras aceitam criar esse registro e recusam editar ou
       apagar. Sem o motor carregado, grava como antes — nunca deixa de salvar
       por causa do histórico. */
    var V=window.VersoesCore;
    if(V&&!FB.semHistorico){
      var porNome=(typeof window._currentUserName==='function'?window._currentUserName():(FB.user.displayName||''))||'';
      var pares=V.mudancas(FB.remoteFlat||{},next,COLLECTIONS_GRAVACAO).map(function(m){
        var w=opEscrita(m.colecao,m.docId,m.anterior,m.novo),dado=w.op;
        if(w.campos)m.campos=w.campos;
        var reg=V.registro(m,newRev);
        reg.em=window.firebase.firestore.FieldValue.serverTimestamp();
        reg.por=FB.user.email||'';reg.porNome=String(porNome).slice(0,120);
        return [dado,{type:'set',ref:collectionRef('historico').doc(),data:reg,
          bytes:reg.anterior?V.bytes(reg.anterior):256}];
      });
      V.lotes(pares).forEach(function(l){
        var batch=FB.db.batch();
        l.forEach(function(o){ops.push(o);naBatch(batch,o);});
        batches.push(batch);
      });
      FB.historicoAtivo=true;
    }else{
      ops=queueOps(next);
      for(var i=0;i<ops.length;i+=400){
        var batch=FB.db.batch();
        ops.slice(i,i+400).forEach(function(o){naBatch(batch,o);});
        batches.push(batch);
      }
    }
    if(!batches.length)batches.push(FB.db.batch());
    batches[batches.length-1].set(FB.db.doc(ROOT),{
      rev:newRev,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:FB.user.email||'',
      updatedByName:(typeof window._currentUserName==='function'?window._currentUserName():(FB.user.displayName||'')),
      schema:2
    },{merge:true});
    FB.pendingWrites=ops.length;
    cloudBadge('saving',ops.length?('· '+ops.length+' alterações'):'');
    /* O último lote publica a revisão: só pode sair após os anteriores.
       Uma rede lenta mantém um único envio ativo e conserva a edição seguinte. */
    var all=batches.reduce(function(p,b){return p.then(function(){return b.commit();});},Promise.resolve());
    /* DOIS PRAZOS, DUAS PERGUNTAS DIFERENTES ==================================
       LENTO nao e PERDIDO, e o remedio de um estraga o outro.

       O cao de guarda de 15 s responde "esta demorando": avisa na tela e NAO
       solta a tranca. Isso e proposital e esta trancado em teste — numa rede
       so lenta, disparar um segundo envio por cima do primeiro duplica escrita
       e gasta cota a toa; a edicao seguinte ja sai sozinha quando o envio em
       curso responder.

       Mas `commit()` do Firestore NAO rejeita quando o aparelho perde o sinal:
       ele fica PENDENTE ate reconectar, eventualmente para sempre. E
       `commitState` comeca com "se ja esta enviando, guarda e sai". Entao um
       unico envio pendurado trancava TODOS os seguintes: o celular seguia
       gravando no aparelho e nada mais subia para o servidor pela sessao
       inteira. A nova tentativa de 60 s nem era agendada, porque ela mora no
       tratamento de ERRO e a promessa nunca chegava a falhar. Mudo e parado,
       que e a pior combinacao possivel.

       Por isso o segundo prazo, bem mais longo: 90 s sem resposta nao e mais
       rede lenta, e envio perdido. Ai a tranca se solta e a tentativa e dada
       como abandonada.

       Uma tentativa abandonada ainda pode responder depois. A ordem de escrita
       do Firestore e preservada por cliente: os lotes dela, emitidos primeiro,
       chegam antes dos da proxima, que leva dado mais novo — a mais nova
       vence. O que ela nao pode fazer e DAR NOTICIA: nao anuncia "salvo", nao
       move `remoteFlat`/`lastRev` e nao mexe na tranca de quem veio depois. */
    FB.pushSeq=(FB.pushSeq||0)+1;
    var _meuEnvio=FB.pushSeq;
    function _souOEnvioAtual(){ return FB.pushSeq===_meuEnvio; }
    var watchdog=setTimeout(function(){
      if(FB.pushing&&_souOEnvioAtual()){
        window._cloudSavingActive=false;
        cloudBadge('offline','=⌛ '+FB.pendingWrites+' alterações aguardando envio');
      }
    },15000);
    var perdido=setTimeout(function(){
      if(FB.pushing&&_souOEnvioAtual()){
        FB.pushSeq++;                       /* esta tentativa vira passado */
        FB.pushing=false;FB.pushPromise=null;window._cloudSavingActive=false;
        setUnsavedChanges(true);
        cloudBadge('error','=⚠ o envio não respondeu · salvo neste aparelho · tentando de novo');
        _agendarNovaTentativa();
      }
    },90000);
    FB.pushPromise=all.then(function(){
      clearTimeout(watchdog);clearTimeout(perdido);
      /* Resposta de uma tentativa ja abandonada: as escritas dela chegaram e
         foram sobrepostas pela mais nova. Quem manda na tela e na contabilidade
         e o envio ATUAL. */
      if(!_souOEnvioAtual()) return;
      FB.pushing=false;window._cloudSavingActive=false;
      FB.pushPromise=null;
      FB.remoteFlat=next;FB.lastRev=newRev;FB.pendingWrites=0;
      window._cloudRev=newRev;
      var latest=localState()||FB.queuedState||st;
      FB.queuedState=null;
      var changed=stable(splitState(latest))!==stable(next);
      setUnsavedChanges(changed);cloudBadge(changed?'saving':'saved');
      /* Uma resposta antiga da rede nunca substitui o cofre com estado antigo. */
      checkpointPut(latest).catch(checkpointFalhou);
      // O portal recebe somente a cópia confirmada, nunca lançamentos em edição.
      try{window.dispatchEvent(new CustomEvent('agracta:sincronizado',{detail:{state:st,rev:newRev}}));}catch(_e){}
      clearTimeout(FB.timer);FB.timer=null;
      /* Outro aparelho gravou enquanto este enviava: le e mescla antes de seguir. */
      if(FB.lerDepois&&typeof window.cloudPull==='function'){FB.lerDepois=false;return window.cloudPull();}
      if(changed)return commitState(latest);
    },function(e){
      clearTimeout(watchdog);clearTimeout(perdido);
      console.error('[Agracta Firebase] gravação:',e);
      /* Falha de uma tentativa abandonada nao repinta a tela nem solta a tranca
         de quem veio depois: a que vale ja esta correndo. */
      if(!_souOEnvioAtual()) return;
      FB.pushing=false;window._cloudSavingActive=false;
      FB.pushPromise=null;setUnsavedChanges(true);
      var cod=(e&&(e.code||e.name))||'erro';
      /* O HISTORICO NUNCA IMPEDE O DADO DE SUBIR. Se o servidor recusou o lote
         e ele levava registros de historico (regra do banco mais estrita que o
         app, campo inesperado), o mesmo envio sai de novo SEM o historico. O
         dado e o que importa; a falta do historico fica registrada na tela. */
      if(!FB.semParcial&&ops.some(function(o){return o.type==='update';})&&
         (cod==='not-found'||cod==='invalid-argument'||cod==='failed-precondition')){
        FB.semParcial={em:Date.now(),codigo:cod};
        console.warn('[Agracta Firebase] gravação por campos recusada ('+cod+'); gravando documentos inteiros nesta sessão.');
        return commitState(localState()||st);
      }
      if(FB.historicoAtivo&&!FB.semHistorico&&(cod==='permission-denied'||cod==='invalid-argument')){
        FB.semHistorico={em:Date.now(),codigo:cod};FB.historicoAtivo=false;
        console.warn('[Agracta Firebase] histórico recusado pelo servidor ('+cod+'); gravando sem ele nesta sessão.');
        return commitState(localState()||st);
      }
      cloudBadge('error','=⚠ não subiu ('+cod+') · salvo neste aparelho · toque para tentar de novo');
      _agendarNovaTentativa();
      throw e;
    });
    /* Mantém a rejeição para quem aguarda; chamadas de autosave podem não aguardar. */
    FB.pushPromise.catch(function(){});
    return FB.pushPromise;
  }

  /* SÓ O QUE MUDOU SOBE (vendor/versoes-core.js, `campos`). Documento grande
     que já existe no servidor vai por update() dos campos alterados, não por
     set() do documento inteiro: lançar uma nota num estudo de 400 KB mandava
     ~1 MB por salvamento e estourava o prazo de envio no 4G. Documento pequeno
     segue inteiro (nada a ganhar). Se o servidor recusar o update (documento
     apagado por outro aparelho, caminho inesperado), `FB.semParcial` volta
     ao set() inteiro pelo resto da sessão — nunca deixa de salvar por isso. */
  var PARCIAL_MIN_BYTES=16384;
  function opEscrita(c,id,prevDoc,nextDoc){
    var ref=collectionRef(c).doc(id),V=window.VersoesCore;
    if(!nextDoc)return {op:{type:'delete',ref:ref,bytes:64},campos:null};
    if(prevDoc&&V&&typeof V.campos==='function'&&!FB.semParcial&&V.bytes(nextDoc)>=PARCIAL_MIN_BYTES){
      var cs=V.campos(prevDoc,nextDoc);
      if(cs.length){
        var b=0;cs.forEach(function(x){b+=x.ausente?32:V.bytes(x.valor);});
        return {op:{type:'update',ref:ref,campos:cs,bytes:b+64},campos:cs};
      }
    }
    return {op:{type:'set',ref:ref,data:nextDoc},campos:null};
  }
  function naBatch(batch,o){
    if(o.type==='delete')return batch.delete(o.ref);
    if(o.type==='update'){
      var fs=window.firebase.firestore,args=[o.ref];
      o.campos.forEach(function(x){
        args.push(new (Function.prototype.bind.apply(fs.FieldPath,[null].concat(x.caminho)))());
        args.push(x.ausente?fs.FieldValue.delete():x.valor);
      });
      return batch.update.apply(batch,args);
    }
    return batch.set(o.ref,o.data);
  }
  /* Envio que falhou tenta de novo sozinho, em 60 s, enquanto houver edição
     pendente. Antes, ficava parado até alguém tocar no selo ou reabrir o app. */
  function _agendarNovaTentativa(){
    if(FB.retryTimer)return;
    FB.retryTimer=setTimeout(function(){
      FB.retryTimer=null;
      if(window._unsavedChanges&&typeof window.cloudSave==='function')window.cloudSave();
    },60000);
  }
  /* A leitura de conferência não pode travar a gravação: sem resposta em 12 s
     conta como sem conexão (a edição fica no aparelho e tenta de novo). */
  function _comPrazo(p,ms){
    return new Promise(function(ok,falha){
      var t=setTimeout(function(){var e=new Error('sem resposta do servidor');e.code='deadline-exceeded';falha(e);},ms);
      p.then(function(v){clearTimeout(t);ok(v);},function(e){clearTimeout(t);falha(e);});
    });
  }

  /* ===== NUNCA GRAVAR POR CIMA DO QUE NAO FOI LIDO ===========================
     commitState grava cada documento que mudou em relacao a ULTIMA LEITURA
     deste aparelho. Se outro aparelho gravou depois dela, este gravava a sua
     copia do estudo por cima — e um estudo finalizado no computador voltava
     aberto porque o celular, com a copia de antes, mexeu em qualquer coisa nele.

     Antes de gravar: uma leitura do documento raiz (1 leitura, nao o banco
     inteiro). Revisao nova na nuvem -> le tudo, MESCLA com o aparelho (uniao) e
     grava a uniao. Sem conexao para conferir -> NAO grava: a edicao fica no
     aparelho e no cofre e sobe quando a conexao voltar. */
  function conferirAntesDeGravar(st){
    if(!firebaseInit()||!FB.user||!FB.db)return commitState(st);
    if(FB.pushing)return commitState(st);
    if(FB.conferindo)return FB.conferindo;
    var p=_comPrazo(FB.db.doc(ROOT).get(),12000).then(function(snap){
      FB.conferindo=null;
      var rev=(snap&&snap.exists&&(snap.data()||{}).rev)||0;
      if(rev>(FB.lastRev||0)&&typeof window.cloudPull==='function')return window.cloudPull();
      return commitState(localState()||st);
    },function(e){
      FB.conferindo=null;
      setUnsavedChanges(true);
      cloudBadge('offline','=⌁ sem conexão com o servidor ('+((e&&(e.code||e.name))||'erro')+') · alterações guardadas neste aparelho');
      console.error('[Agracta Firebase] conferência antes de gravar:',e);
      _agendarNovaTentativa();
      return false;
    });
    FB.conferindo=p;
    return p;
  }

  window.cloudInit=function(){return firebaseInit();};
  window.cloudSaveSoon=function(){
    setUnsavedChanges(true);
    var localPromise=checkpointPut(localState());
    if(!FB.user){
      cloudBadge('offline','=↻ salvando neste aparelho…');
      localPromise.then(function(){cloudBadge('offline','=⌁ sessão local · sem sincronização');},function(e){
        cloudBadge('error','— falha ao salvar neste aparelho');console.error('[Agracta offline] checkpoint:',e);
      });
      return localPromise;
    }
    clearTimeout(FB.timer);FB.timer=setTimeout(function(){cloudSave();},700);
    return localPromise;
  };
  window.cloudSave=function(){
    clearTimeout(FB.timer);
    var st=localState();if(!st)return;
    /* Restaurar backup ou importar SUBSTITUI de proposito: nao passa pelo merge. */
    var substituir=!!window._cloudReplace;
    window._cloudReplace=false;
    if(substituir)return commitState(st);
    return conferirAntesDeGravar(st);
  };
  window.cloudSyncNow=function(){return cloudSave();};
  function _agractaAcessoBanner(email){
    try{
      if(document.getElementById('acessoBanner')) return;
      var d=document.createElement('div'); d.id='acessoBanner';
      d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:5000;background:#3a2a12;color:#ffe7c4;border-top:2px solid #c79a4a;padding:12px 14px;box-shadow:0 -6px 24px rgba(0,0,0,.45);font:13px/1.45 -apple-system,system-ui,sans-serif';
      d.innerHTML='<div style="max-width:560px;margin:0 auto;display:flex;gap:10px;align-items:flex-start">'+
        '<div style="flex:1"><b>Seu acesso ainda não foi liberado.</b><br>Peça ao administrador para adicionar o e-mail <b>'+String(email||'(seu e-mail)').replace(/[<>&]/g,'')+'</b> no <b>Painel Admin</b>. Até lá, os dados da equipe não aparecem neste aparelho.</div>'+
        '<button id="acessoBannerOk" style="background:#5a4520;color:#ffe7c4;border:none;border-radius:8px;padding:8px 12px;font-weight:800;cursor:pointer;white-space:nowrap">OK</button>'+
      '</div>';
      document.body.appendChild(d);
      var b=document.getElementById('acessoBannerOk'); if(b) b.onclick=function(){ var x=document.getElementById('acessoBanner'); if(x) x.remove(); };
    }catch(e){}
  }
  window.cloudPull=function(){
    if(!FB.user){showAuthGate();return Promise.resolve(false);}
    cloudBadge('saving');
    return readRemote().then(function(r){
      /* Só um login que também conseguiu ler o workspace autoriza a futura
         entrada offline. Conta inativa/sem permissão não transforma o aparelho
         em confiável apenas por existir no Firebase Auth. */
      rememberTrustedUser(FB.user,(window._authUser&&window._authUser.displayName)||'');
      window._cloudInitDone=true;
      if(meaningful(r.state)){
        var merged=(typeof cloudMerge==='function')?cloudMerge(localState(),r.state):r.state;
        cloudApply(merged);
        checkpointPut(merged).catch(checkpointFalhou);
        if(stable(splitState(merged))!==stable(r.flat))commitState(merged);
        else cloudBadge('saved');
      }else if(meaningful(localState()))commitState(localState());
      else cloudBadge('saved');
      try{syncAllowedUsersToMembers();}catch(e){}
      try{authBusy(false);authErr('');hideAuthGate();}catch(e){}
      return true;
    }).catch(function(e){
      cloudBadge('offline','=⌁ usando dados do aparelho · sem sincronização');
      console.error('[Agracta Firebase] leitura:',e);
      if(e && (e.code==='permission-denied' || /permission|insufficient/i.test(String((e&&e.message)||e)))){
        try{
          localStorage.removeItem(TRUST_KEY);
          showAuthGate();authBusy(false);
          authErr('Este acesso não está liberado para os dados do Agracta. Fale com o administrador.');
          _agractaAcessoBanner((FB.user&&FB.user.email)||'');
        }catch(_e){}
      }else if(!trustedForUser(FB.user)){
        try{showAuthGate();authBusy(false);authErr('Não foi possível validar este aparelho. Conecte-se à internet e tente novamente.');}catch(_e){}
      }
      return false;
    });
  };
  /* Resync barato: 1 leitura (o doc raiz) para conferir o 'rev' e só então decidir.
     Antes isto chamava cloudPull() direto, e cloudPull relê todas as coleções INTEIRAS.
     Como ele dispara a cada foco na aba e a cada volta de rede, o banco inteiro era
     relido dezenas de vezes por dia por aparelho — foi o que estourou a cota. */
  window.cloudResync=function(){
    if(!FB.user){showAuthGate();return;}
    if(window._unsavedChanges){cloudSave();return;}
    if(!FB.db||FB.resyncing){return;}
    FB.resyncing=true;
    FB.db.doc(ROOT).get().then(function(snap){
      FB.resyncing=false;
      var rev=(snap&&snap.exists&&(snap.data()||{}).rev)||0;
      if(rev>FB.lastRev)cloudPull();
      else cloudBadge('saved');
    }).catch(function(e){
      FB.resyncing=false;
      cloudBadge('offline','=⌁ usando dados do aparelho · sem sincronização');
      console.error('[Agracta Firebase] resync:',e);
    });
  };
  window.cloudSubscribe=function(){
    if(!FB.user||!FB.db)return;
    if(FB.unsub){FB.unsub();FB.unsub=null;}
    FB.unsub=FB.db.doc(ROOT).onSnapshot({includeMetadataChanges:true},function(snap){
      if(!snap.exists||snap.metadata.hasPendingWrites)return;
      var rev=(snap.data()||{}).rev||0;
      /* `lastRev` so muda quando a leitura ACONTECE (readRemote). Marca-lo aqui
         fazia a conferencia antes de gravar achar que o aparelho ja tinha lido
         uma revisao que ainda estava a caminho. */
      if(rev>FB.lastRev&&FB.pushing){FB.lerDepois=true;return;}
      if(rev>FB.lastRev&&rev!==FB.revAvisado){
        FB.revAvisado=rev;clearTimeout(window._fbPullTimer);window._fbPullTimer=setTimeout(cloudPull,250);
      }
    },function(){cloudBadge('offline','=⌁ usando dados do aparelho · sem sincronização');});
  };
  window.cloudStart=function(){
    if(!FB.user){startLocal('— entre para sincronizar');return;}
    cloudPull().then(function(){cloudSubscribe();});
    if(!window.__firebaseNet){
      window.__firebaseNet=true;
      window.addEventListener('online',function(){cloudResync();});
      window.addEventListener('offline',function(){cloudBadge('offline','=⌁ salvo no aparelho · aguardando conexão');});
      document.addEventListener('visibilitychange',function(){
        if(document.visibilityState==='visible')cloudResync();
        else {checkpointPut(localState(),true).catch(checkpointFalhou);if(window._unsavedChanges)cloudSave();}
      });
      window.addEventListener('pagehide',function(){checkpointPut(localState(),true).catch(checkpointFalhou);if(window._unsavedChanges)cloudSave();});
    }
  };
  window.cloudApplyPending=function(){
    if(window._cloudPending&&!window._qEditing&&!window._avEditing){
      var p=window._cloudPending;window._cloudPending=null;cloudApply(p);
    }
  };

  window.deletePasswordConfirm=function(){
    var pass=(document.getElementById('deletePwdInput')||{}).value||'',err=document.getElementById('deletePwdErr');
    if(!pass){if(err)err.textContent='Digite a senha.';return;}
    if(!FB.user||!FB.auth){if(err)err.textContent='Entre na nuvem antes de confirmar.';return;}
    deletePasswordBusy(true);if(err)err.textContent='';
    var cred=window.firebase.auth.EmailAuthProvider.credential(FB.user.email,pass);
    FB.user.reauthenticateWithCredential(cred).then(function(){
      deletePasswordBusy(false);
      var cb=window._deletePwdCb;deletePasswordClose();if(typeof cb==='function')cb();
    }).catch(function(){
      deletePasswordBusy(false);if(err)err.textContent='Senha incorreta ou sessão expirada.';
    });
  };

  /* ---- Histórico de versões: leitura e restauração ----
     A tela mora no app.js (openCloudHistory); aqui ficam só as duas leituras
     que precisam do Firestore. */
  function lerHistorico(consulta){
    return consulta.get().then(function(snap){
      var out=[];snap.forEach(function(d){var r=d.data()||{};r._id=d.id;out.push(r);});return out;
    });
  }
  window.AgractaVersoes={
    disponivel:function(){return !!(firebaseInit()&&FB.user&&window.VersoesCore);},
    /* As gravações mais recentes, agrupadas. `limite` conta REGISTROS, não
       gravações: uma gravação grande ocupa muitos. */
    listar:function(limite){
      if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
      return lerHistorico(collectionRef('historico').orderBy('rev','desc').limit(limite||600))
        .then(function(l){return window.VersoesCore.porGravacao(l);});
    },
    /* Estado completo como estava ANTES da gravação `rev`, já no formato que
       safetyApply() entende. Lê o estado vivo do servidor na hora, não o cache. */
    estadoAntesDe:function(rev){
      if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
      return Promise.all([
        readRemote(),
        lerHistorico(collectionRef('historico').where('rev','>=',rev))
      ]).then(function(r){
        var res=window.VersoesCore.estadoAntesDe(r[0].flat,r[1],rev);
        return {state:buildState(res.flat,r[0].meta),irrecuperaveis:res.irrecuperaveis,desfeitos:res.desfeitos};
      });
    },
    /* Registros de UM documento — base do "o que mudou neste estudo". */
    doDocumento:function(colecao,docId){
      if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
      return lerHistorico(collectionRef('historico').where('docId','==',docId))
        .then(function(l){return l.filter(function(x){return x.colecao===colecao;})
          .sort(function(a,b){return b.rev-a.rev;});});
    }
  };

  /* ---- Fotos antigas na coleção `media` ----
     Desde a 14a publicação a foto da nota mora no aparelho, e o app não grava
     mais nada em `media`. As fatias antigas continuam lá. Aqui elas são
     contadas e, sob pedido do administrador, apagadas — SÓ as que já estão
     salvas neste aparelho ou que são de notas já excluídas. Foto que só
     existe no servidor fica: apagá-la seria perdê-la. */
  window.AgractaFotosAntigas={
    /* excluidas: notas com LÁPIDE. Nota que este aparelho só não conhece
       (criada noutro, ainda não sincronizada) NÃO conta como excluída. */
    contar:function(seguras, excluidas){
      if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
      var ok={},del={};(seguras||[]).forEach(function(id){ok[id]=1;});(excluidas||[]).forEach(function(id){del[id]=1;});
      return collectionRef('media').get().then(function(snap){
        var out={apagaveis:[],chars:0,notas:{},pendentes:{},charsPendentes:0,total:0};
        snap.forEach(function(d){
          var r=d.data()||{},id=r.noteId,t=String(r.data||'').length;out.total++;
          if(ok[id]||del[id]){out.apagaveis.push(d.id);out.chars+=t;out.notas[id]=1;}
          else{out.pendentes[id]=1;out.charsPendentes+=t;}
        });
        out.nNotas=Object.keys(out.notas).length;out.nPendentes=Object.keys(out.pendentes).length;
        return out;
      });
    },
    apagar:function(ids){
      if(!firebaseInit()||!FB.user)return Promise.reject(new Error('sem login'));
      var lotes=[];for(var i=0;i<(ids||[]).length;i+=400)lotes.push(ids.slice(i,i+400));
      return lotes.reduce(function(p,l){return p.then(function(){
        var b=FB.db.batch();l.forEach(function(id){b.delete(collectionRef('media').doc(id));});return b.commit();
      });},Promise.resolve()).then(function(){return (ids||[]).length;});
    }
  };

  var esc = window.esc || function(s){ return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  var originalIsAdmin=window.isAdmin;
  window.isAdmin=function(){
    if(FB.user&&isFirebaseAdminEmail(FB.user.email))return true;
    return typeof originalIsAdmin==='function' ? originalIsAdmin() : false;
  };
  var originalOpenAdminPanel=window.openAdminPanel;
  window.openAdminPanel=function(){
    if(FB.user&&isFirebaseAdminEmail(FB.user.email)){
      window._adminUnlocked=true;
      if(typeof showAdminDashboard==='function')showAdminDashboard();
      return;
    }
    if(typeof originalOpenAdminPanel==='function')originalOpenAdminPanel();
  };

  function syncAllowedUsersToMembers(){
    if(!FB.db || !FB.user) return;
    if(!isFirebaseAdminEmail(FB.user.email)) return;
    var users = [];
    try {
      users = data.__config.allowedUsers || [];
    } catch(e){}
    if(!users.length) return;
    FB.db.doc(ROOT).collection('members').get().then(function(snap){
      var existing = {};
      snap.forEach(function(d){ existing[d.id.toLowerCase()] = true; });
      users.forEach(function(u){
        if(!u || !u.email) return;
        var email = u.email.trim().toLowerCase();
        if(!existing[email]){
          console.log('[Agracta Firebase] Sincronizando técnico legado para o Firestore:', email);
          FB.db.doc(ROOT).collection('members').doc(email).set({
            email: email,
            nome: u.nome || '',
            active: true,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
          }, {merge: true}).catch(function(e){
            console.error('[Agracta Firebase] Falha ao sincronizar técnico legado:', email, e);
          });
        }
      });
    }).catch(function(err){
      console.error('[Agracta Firebase] Erro ao listar membros para sincronização:', err);
    });
  }

  window._invocarCriarTecnico = function(email, nome, senha, isReset){
    if(!firebaseInit() || !FB.db || !FB.auth || !FB.user){
      if(typeof _adminMsg === 'function') _adminMsg('Sem conexão com o Firebase.', true);
      return;
    }
    if(!isFirebaseAdminEmail(FB.user.email)){
      if(typeof _adminMsg === 'function') _adminMsg('Somente o administrador pode criar acessos.', true);
      return;
    }
    email = (email || '').trim().toLowerCase();
    nome = (nome || '').trim();

    var btn = document.getElementById('addUsrBtn');
    if(btn && !isReset){
      btn.disabled = true;
      btn.textContent = 'Processando…';
    }
    if(!isReset && typeof _adminMsg === 'function') _adminMsg('Processando acesso…', false);

    if(isReset){
      FB.auth.sendPasswordResetEmail(email).then(function(){
        if(typeof _stxToast === 'function') _stxToast('E-mail de redefinição enviado para ' + email);
        if(typeof _adminMsg === 'function') _adminMsg('E-mail de redefinição enviado.', false);
      }).catch(function(err){
        var msg = 'Erro ao enviar e-mail de redefinição: ' + (err.message || err);
        if(typeof _adminMsg === 'function') _adminMsg(msg, true);
        if(typeof _stxToast === 'function') _stxToast(msg);
      });
      return;
    }

    var pass = senha || (typeof _genSenhaTec === 'function' ? _genSenhaTec() : Math.random().toString(36).slice(-10));
    var secAppName = 'TempRegister_' + Date.now();
    var secApp = window.firebase.initializeApp(CFG, secAppName);
    var secAuth = secApp.auth();
    function closeSecondary(){
      try{secAuth.signOut().catch(function(){});}catch(e){}
      try{secApp.delete();}catch(e){}
    }
    function finishAccount(created){
      return FB.db.doc(ROOT).collection('members').doc(email).set({
        email: email,
        nome: nome,
        active: true,
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      }, {merge: true}).then(function(){
        try {
          if(typeof ensureConfig === 'function') ensureConfig();
          var arr = data.__config.allowedUsers || (data.__config.allowedUsers = []);
          var f = arr.find(function(u){ return u && u.email && u.email.toLowerCase().trim() === email; });
          if(f){ if(nome) f.nome = nome; } else { arr.push({email: email, nome: nome, addedAt: Date.now()}); }
          if(data.__config.delUsers) delete data.__config.delUsers[email];
          if(typeof save === 'function') save();
          if(typeof cloudSave === 'function') cloudSave();
        } catch(e){}
        window._ultimoAcessoCriado = {
          email: email,
          senha: created ? pass : '(conta já existente — use “redefinir senha”)',
          criado: created
        };
        if(typeof _adminMsg === 'function'){
          _adminMsg(created ? 'Conta criada com sucesso no Firebase.' : 'Conta existente reativada no Agracta.', false);
        }
        if(typeof renderAdminDashboard === 'function') renderAdminDashboard();
      });
    }
    try{secAuth.setPersistence(window.firebase.auth.Auth.Persistence.NONE);}catch(e){}
    secAuth.createUserWithEmailAndPassword(email, pass).then(function(userCreds){
      var user = userCreds.user;
      if(user && typeof user.updateProfile === 'function'){
        return user.updateProfile({displayName:nome}).then(function(){return true;});
      }
      return true;
    }).then(function(){
      closeSecondary();
      return finishAccount(true);
    }).catch(function(err){
      closeSecondary();
      if(err && err.code === 'auth/email-already-in-use'){
        return finishAccount(false);
      }
      throw err;
    }).catch(function(err){
      if(btn && !isReset){
        btn.disabled = false;
        btn.textContent = 'Criar acesso do técnico';
      }
      if(typeof _adminMsg === 'function') _adminMsg('Erro ao criar acesso: ' + (err.message || err), true);
    });
  };

  window.redefinirSenhaTecnico=function(i){
    var p=(window._perfisCache||[])[i];
    if(!p)return;
    if(!confirm('Enviar um link de redefinição de senha para '+p.email+'?'))return;
    window._invocarCriarTecnico(p.email,p.nome||'','',true);
  };

  window.alternarAcessoTecnico = function(i, isOff){
    var p = (window._perfisCache || [])[i];
    if(!p) return;
    var shouldBeActive = !!isOff;
    if(!confirm((shouldBeActive ? 'REATIVAR' : 'DESATIVAR') + ' o acesso de ' + (p.nome || p.email) + '?\n\n' + (shouldBeActive ? 'Ele volta a conseguir entrar no app.' : 'Ele NÃO consegue mais entrar (a conta e todo o histórico são mantidos).'))) return;
    if(!firebaseInit() || !FB.db){
      if(typeof _stxToast === 'function') _stxToast('Sem conexão.');
      return;
    }
    if(typeof _stxToast === 'function') _stxToast(shouldBeActive ? 'Reativando…' : 'Desativando…');
    FB.db.doc(ROOT).collection('members').doc(p.email.toLowerCase()).set({
      active: shouldBeActive,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, {merge: true}).then(function(){
      if(typeof _stxToast === 'function') _stxToast(shouldBeActive ? 'Acesso reativado' : 'Acesso desativado');
      _carregarPerfis();
    }).catch(function(err){
      if(typeof _stxToast === 'function') _stxToast('Erro: ' + (err.message || err));
    });
  };

  window.salvarNomePerfil = function(i){
    var p = (window._perfisCache || [])[i];
    if(!p || !firebaseInit() || !FB.db) return;
    var inp = document.getElementById('pf_' + i);
    var nome = inp ? inp.value.trim() : '';
    if(inp) inp.disabled = true;
    FB.db.doc(ROOT).collection('members').doc(p.email.toLowerCase()).set({
      nome: nome,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, {merge: true}).then(function(){
      if(inp) inp.disabled = false;
      p.nome = nome;
      try {
        if(typeof ensureConfig === 'function') ensureConfig();
        var arr = window.data.__config.allowedUsers || (window.data.__config.allowedUsers = []);
        var f = arr.find(function(u){ return u && u.email && u.email.toLowerCase().trim() === p.email.toLowerCase().trim(); });
        if(f){ f.nome = nome; } else { arr.push({email: p.email, nome: nome, addedAt: Date.now()}); }
        if(typeof save === 'function') save();
        if(typeof cloudSave === 'function') cloudSave();
      } catch(e){}
      if(typeof _stxToast === 'function') _stxToast('Nome salvo: ' + (nome || '(vazio)'));
    }).catch(function(err){
      if(inp) inp.disabled = false;
      if(typeof _stxToast === 'function') _stxToast('Erro ao salvar nome: ' + (err.message || err));
    });
  };

  window._carregarPerfis = function(){
    var box = document.getElementById('admPerfisList');
    if(!box) return;
    if(!firebaseInit() || !FB.db){
      box.innerHTML = '<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Sem conexão.</div>';
      return;
    }
    FB.db.doc(ROOT).collection('members').get().then(function(snap){
      var arr = [];
      snap.forEach(function(d){
        var mData = d.data();
        arr.push({
          email: mData.email || d.id,
          nome: mData.nome || '',
          active: mData.active !== false
        });
      });
      Object.keys(ADMIN_EMAILS).forEach(function(adminEmail){
        var found=arr.find(function(x){return x.email.toLowerCase()===adminEmail;});
        if(found)found.papel='admin';
        else arr.push({
          email:adminEmail,
          nome:adminEmail==='machadovictorchaves@gmail.com'?'Administrador Principal':'Administrador',
          active:true,
          papel:'admin'
        });
      });
      arr.sort(function(a, b){
        if(a.papel !== b.papel) return a.papel === 'admin' ? -1 : 1;
        return (a.email || '').localeCompare(b.email || '');
      });
      window._perfisCache = arr;
      if(!arr.length){
        box.innerHTML = '<div style="color:#8aa88a;font-size:12px;text-align:center;padding:8px">Nenhuma conta ainda. Crie a primeira abaixo.</div>';
        return;
      }
      var disabledSet = {};
      arr.forEach(function(x){
        if(!x.active) disabledSet[x.email.toLowerCase()] = 1;
      });
      if(typeof _renderPerfisList === 'function') _renderPerfisList(arr, disabledSet);
    }).catch(function(err){
      box.innerHTML = '<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Erro ao ler contas: '+esc(err.message || err)+'</div>';
    });
  };

  var originalAddAllowedUser=window.addAllowedUser;
  if(typeof originalAddAllowedUser==='function'){
    window.addAllowedUser=function(){
      var email=((document.getElementById('addUsrEmail')||{}).value||'').trim().toLowerCase();
      var nome=((document.getElementById('addUsrNome')||{}).value||'').trim();
      var out=originalAddAllowedUser.apply(this,arguments);
      var registered=false;
      try{
        registered=(data.__config.allowedUsers||[]).some(function(u){
          return u&&String(u.email||'').trim().toLowerCase()===email;
        });
      }catch(e){}
      if(email&&nome&&registered&&FB.user&&FB.db){
        FB.db.doc(ROOT).collection('members').doc(email).set({
          email:email,nome:nome,active:true,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true}).catch(function(e){console.error('[Agracta Firebase] membro:',e);});
      }
      return out;
    };
  }
  var originalRemoveAllowedUser=window.removeAllowedUser;
  if(typeof originalRemoveAllowedUser==='function'){
    window.removeAllowedUser=function(idx){
      var u=null;
      try{u=data.__config.allowedUsers[idx];}catch(e){}
      var email=(u&&u.email||'').trim().toLowerCase();
      var out=originalRemoveAllowedUser.apply(this,arguments);
      var stillRegistered=true;
      try{
        stillRegistered=(data.__config.allowedUsers||[]).some(function(x){
          return x&&String(x.email||'').trim().toLowerCase()===email;
        });
      }catch(e){}
      if(email&&!stillRegistered&&FB.user&&FB.db){
        FB.db.doc(ROOT).collection('members').doc(email).set({
          email:email,active:false,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp()
        },{merge:true}).catch(function(e){console.error('[Agracta Firebase] membro:',e);});
      }
      return out;
    };
  }

  window._dwOn=function(){return false;};
  try{localStorage.setItem('agracta-dualwrite','0');}catch(e){}
  window.AgractaFirebase={
    configured:configured,
    status:function(){return {configured:configured(),user:FB.user&&FB.user.email,ready:FB.ready,rev:FB.lastRev,pendingWrites:FB.pendingWrites};},
    pull:cloudPull,push:cloudSave,checkpoint:checkpointGet,
    flushLocal:function(){return checkpointPut(localState(),true);},
    offlineAccessAllowed:offlineAccessAllowed,trustedDevice:trustedDevice,
    splitState:splitState,buildState:buildState
  };
})();
