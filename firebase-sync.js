/* Agracta — adaptador Firebase + operação local-first.
 *
 * O estado ativo continua sendo gravado imediatamente no aparelho. O Firestore
 * recebe uma versão normalizada por entidade, sincroniza entre aparelhos e
 * mantém sua própria fila offline. O Supabase antigo fica dormente para permitir
 * rollback durante a migração.
 */
(function(){
  'use strict';

  var CFG=window.AGRACTA_FIREBASE_CONFIG||{};
  var FB={
    app:null,auth:null,db:null,user:null,unsub:null,
    ready:false,pulling:false,pushing:false,remoteFlat:null,
    lastRev:0,timer:null,checkpointTimer:null,pendingWrites:0
  };
  var ROOT='workspaces/agracta';
  var COLLECTIONS=['locais','quadras','estudos','aplicacoes','avaliacoes','lancamentos','notas_campo','randomizacoes','config','media'];
  var CHECKPOINT_DB='agracta-local-first',CHECKPOINT_STORE='snapshots',CHECKPOINT_KEY='active';

  function configured(){
    return !!(CFG.apiKey&&CFG.authDomain&&CFG.projectId&&CFG.appId&&window.firebase);
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
  function docId(raw){
    var s=unescape(encodeURIComponent(String(raw)));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function meaningful(st){
    if(!st)return false;
    if((st.notas_campo||[]).length||(st.randomizacoes||[]).length)return true;
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
  function checkpointPut(st){
    if(!st)return;
    clearTimeout(FB.checkpointTimer);
    FB.checkpointTimer=setTimeout(function(){
      checkpointOpen().then(function(db){
        var tx=db.transaction(CHECKPOINT_STORE,'readwrite');
        tx.objectStore(CHECKPOINT_STORE).put({savedAt:Date.now(),state:clean(st)},CHECKPOINT_KEY);
        tx.oncomplete=function(){db.close();};
        tx.onerror=function(){db.close();};
      }).catch(function(){});
    },120);
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
  function restoreCheckpointToLocal(st){
    if(!st)return;
    try{
      if(st.data)localStorage.setItem('iracema-v7',JSON.stringify(st.data));
      if(st.qgeo)localStorage.setItem('iracema-qgeo-v1',JSON.stringify(st.qgeo));
      if(st.qgeots)localStorage.setItem('iracema-qgeots-v1',JSON.stringify(st.qgeots));
      if(st.georef)localStorage.setItem('iracema-georef-v1',JSON.stringify(st.georef));
      if(st.georefts!=null)localStorage.setItem('iracema-georefts-v1',String(st.georefts));
      if(st.locais)localStorage.setItem('iracema-locais-v1',JSON.stringify(st.locais));
      if(st.qlocal)localStorage.setItem('iracema-qlocal-v1',JSON.stringify(st.qlocal));
      if(st.qnome)localStorage.setItem('iracema-qnome-v1',JSON.stringify(st.qnome));
      if(st.randomizacoes)localStorage.setItem('iracema-randomizacoes-v1',JSON.stringify(st.randomizacoes));
      if(st.notas_campo)localStorage.setItem('iracema-notas-v1',JSON.stringify(st.notas_campo));
      if(st._deletedQuadras)localStorage.setItem('iracema-delq-v1',JSON.stringify(st._deletedQuadras));
      if(st._deletedLocais)localStorage.setItem('iracema-dell-v1',JSON.stringify(st._deletedLocais));
      if(st._deletedNotas)localStorage.setItem('iracema-deln-v1',JSON.stringify(st._deletedNotas));
    }catch(e){}
  }
  try{
    if(!localStorage.getItem('iracema-v7')&&sessionStorage.getItem('agracta-idb-restored')!=='1'){
      checkpointGet().then(function(snap){
        if(snap&&snap.state&&meaningful(snap.state)){
          restoreCheckpointToLocal(snap.state);
          sessionStorage.setItem('agracta-idb-restored','1');
          location.reload();
        }
      });
    }
  }catch(e){}

  var originalSave=window.save;
  if(typeof originalSave==='function'){
    window.save=function(){
      var out=originalSave.apply(this,arguments);
      checkpointPut(localState());
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
      try{FB.db.enablePersistence({synchronizeTabs:true}).catch(function(){});}catch(e){}
      try{FB.auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);}catch(e){}
      FB.ready=true;
      return FB;
    }catch(e){
      console.error('[Agracta Firebase] inicialização:',e);
      return null;
    }
  }
  function startLocal(txt){
    if(!window._appStarted)window._appStarted=true;
    window._cloudInitDone=true;
    try{hideAuthGate();}catch(e){}
    try{cloudBadge('offline',txt||'— dados protegidos neste aparelho');}catch(e){}
    checkpointPut(localState());
  }
  function hasLocalRecords(){return meaningful(localState());}
  function addOfflineButton(){
    var box=document.querySelector('.auth-box');
    if(!box||document.getElementById('authOfflineBtn')||!hasLocalRecords())return;
    var b=document.createElement('button');
    b.id='authOfflineBtn';b.type='button';b.className='auth-btn';
    b.style.cssText='margin-top:9px;background:#eef2ee;color:#35443b;border:1px solid #cfd8d1';
    b.textContent='Continuar offline neste aparelho';
    b.onclick=function(){try{localStorage.setItem('agracta-trusted-device','1');}catch(e){}startLocal('— modo offline');};
    var foot=box.querySelector('.auth-foot');
    box.insertBefore(b,foot||null);
  }
  function addGoogleButton(){
    var box=document.querySelector('.auth-box');
    if(!box||document.getElementById('authGoogleBtn'))return;
    var b=document.createElement('button');
    b.id='authGoogleBtn';b.type='button';b.className='auth-btn';
    b.style.cssText='margin-top:9px;background:#fff;color:#26322a;border:1px solid #cfd8d1';
    b.textContent='Entrar com Google';
    b.onclick=function(){doGoogleLogin();};
    var foot=box.querySelector('.auth-foot');
    box.insertBefore(b,foot||null);
  }
  var originalBuildAuthGate=window.buildAuthGate;
  window.buildAuthGate=function(){
    if(typeof originalBuildAuthGate==='function')originalBuildAuthGate();
    addGoogleButton();
    addOfflineButton();
  };
  var originalShowAuthGate=window.showAuthGate;
  window.showAuthGate=function(){
    if(typeof originalShowAuthGate==='function')originalShowAuthGate();
    setTimeout(addOfflineButton,0);
  };

  function onFirebaseUser(user){
    FB.user=user;
    window._authUser=user?{id:user.uid,uid:user.uid,email:user.email||'',email_verified:!!user.emailVerified}:null;
    if(user){
      try{localStorage.setItem('agracta-trusted-device','1');}catch(e){}
      try{hideAuthGate();}catch(e){}
      if(!window._appStarted)window._appStarted=true;
      cloudStart();
    }
  }
  window.authInit=function(){
    if(!firebaseInit()){startLocal('— Firebase ainda não configurado');return;}
    buildAuthGate();
    FB.auth.getRedirectResult().then(function(result){
      if(result&&result.user)onFirebaseUser(result.user);
    }).catch(function(err){
      authBusy(false);
      authErr('Não foi possível concluir o login com Google: '+((err&&err.message)||err));
    });
    FB.auth.onAuthStateChanged(function(user){
      if(user)onFirebaseUser(user);
      else{
        FB.user=null;window._authUser=null;
        var trusted=false;
        try{trusted=localStorage.getItem('agracta-trusted-device')==='1';}catch(e){}
        if(trusted&&hasLocalRecords())startLocal('— toque para entrar e sincronizar');
        else showAuthGate();
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
      var msg=(err&&err.code==='auth/invalid-credential')?'E-mail ou senha incorretos.':
        ((err&&err.code==='auth/too-many-requests')?'Muitas tentativas. Aguarde alguns minutos.':'Não foi possível entrar: '+(err.message||err));
      authErr(msg);
    });
  };
  window.doGoogleLogin=function(){
    if(!firebaseInit()){authErr('Firebase ainda não configurado.');return;}
    authErr('');authBusy(true);
    var provider=new window.firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:'select_account'});
    FB.auth.signInWithRedirect(provider).catch(function(err){
      authBusy(false);
      authErr('Não foi possível entrar com Google: '+((err&&err.message)||err));
    });
  };
  window.doLogout=function(){
    if(typeof closeMainMenu==='function')closeMainMenu();
    checkpointPut(localState());
    try{localStorage.removeItem('agracta-trusted-device');}catch(e){}
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
      deletedNotas:st._deletedNotas||{}
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
          var avKey=s.id+'|'+a.id;
          flat.avaliacoes[docId(avKey)]=clean({key:avKey,id:a.id,estudoId:s.id,order:vi,data:av});
          Object.keys(notas).forEach(function(parcela){
            Object.keys(notas[parcela]||{}).forEach(function(variavel){
              var key=avKey+'|'+parcela+'|'+variavel;
              flat.lancamentos[docId(key)]=clean({
                key:key,avaliacaoKey:avKey,parcela:parcela,variavel:variavel,
                valor:notas[parcela][variavel],
                meta:(metas[parcela]&&metas[parcela][variavel])||null
              });
            });
          });
        });
      });
    });
    (st.notas_campo||[]).forEach(function(n,ni){
      if(!n||!n.id)return;
      var note=clone(n),photo=note.foto||'';
      delete note.foto;
      var parts=photo?Math.ceil(photo.length/600000):0;
      flat.notas_campo[docId(n.id)]=clean({id:n.id,order:ni,data:note,photoParts:parts});
      for(var p=0;p<parts;p++){
        var pk=n.id+'|'+p;
        flat.media[docId(pk)]=clean({noteId:n.id,part:p,data:photo.slice(p*600000,(p+1)*600000)});
      }
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
      var a=clone(r.data||{});a.id=r.id;a.notas={};a.notasMeta={};avs[r.key]=a;
      s.value.avaliacoes.push({order:r.order||0,value:a});
    });
    Object.keys(studies).forEach(function(id){
      var s=studies[id].value;
      s.aplicacoes.sort(function(a,b){return a.order-b.order;});
      s.aplicacoes=s.aplicacoes.map(function(x){return x.value;});
      s.avaliacoes.sort(function(a,b){return a.order-b.order;});
      s.avaliacoes=s.avaliacoes.map(function(x){return x.value;});
    });
    Object.keys(flat.lancamentos).forEach(function(k){
      var r=flat.lancamentos[k],a=avs[r.avaliacaoKey];
      if(!a)return;
      (a.notas[r.parcela]=a.notas[r.parcela]||{})[r.variavel]=r.valor;
      if(r.meta)(a.notasMeta[r.parcela]=a.notasMeta[r.parcela]||{})[r.variavel]=clone(r.meta);
    });
    Object.keys(flat.media).forEach(function(k){
      var r=flat.media[k];(media[r.noteId]=media[r.noteId]||[])[r.part||0]=r.data||'';
    });
    Object.keys(flat.notas_campo).forEach(function(k){
      var r=flat.notas_campo[k],n=clone(r.data||{});n.id=r.id;
      if(r.photoParts)n.foto=(media[r.id]||[]).join('');
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
    COLLECTIONS.forEach(function(c){
      var n=next[c]||{},p=prev[c]||{};
      Object.keys(n).forEach(function(id){
        if(!p[id]||stable(p[id])!==stable(n[id]))ops.push({type:'set',ref:collectionRef(c).doc(id),data:n[id]});
      });
      Object.keys(p).forEach(function(id){
        if(!n[id])ops.push({type:'delete',ref:collectionRef(c).doc(id)});
      });
    });
    return ops;
  }
  function commitState(st){
    if(!firebaseInit()||!FB.user){cloudBadge('offline','— salvo neste aparelho');return Promise.resolve(false);}
    if(FB.pushing){
      clearTimeout(FB.timer);FB.timer=setTimeout(function(){commitState(localState());},500);
      return Promise.resolve(false);
    }
    FB.pushing=true;window._cloudSavingActive=true;
    var next=splitState(st),ops=queueOps(next),batches=[];
    for(var i=0;i<ops.length;i+=400){
      var batch=FB.db.batch();
      ops.slice(i,i+400).forEach(function(o){if(o.type==='delete')batch.delete(o.ref);else batch.set(o.ref,o.data);});
      batches.push(batch);
    }
    var newRev=Math.max(FB.lastRev||0,st.rev||0)+1;
    if(!batches.length)batches.push(FB.db.batch());
    batches[batches.length-1].set(FB.db.doc(ROOT),{
      rev:newRev,updatedAt:window.firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy:FB.user.email||'',schema:1
    },{merge:true});
    FB.pendingWrites=ops.length;
    cloudBadge('saving',ops.length?('· '+ops.length+' alterações'):'');
    var all=Promise.all(batches.map(function(b){return b.commit();}));
    var watchdog=setTimeout(function(){
      if(FB.pushing){
        FB.pushing=false;window._cloudSavingActive=false;
        cloudBadge('offline','— '+FB.pendingWrites+' aguardando envio');
      }
    },15000);
    all.then(function(){
      clearTimeout(watchdog);FB.pushing=false;window._cloudSavingActive=false;
      FB.remoteFlat=next;FB.lastRev=newRev;FB.pendingWrites=0;
      window._cloudRev=newRev;setUnsavedChanges(false);cloudBadge('saved');checkpointPut(st);
    }).catch(function(e){
      clearTimeout(watchdog);FB.pushing=false;window._cloudSavingActive=false;
      cloudBadge('error','— salvo localmente');
      console.error('[Agracta Firebase] gravação:',e);
    });
    return all;
  }

  window.cloudInit=function(){return firebaseInit();};
  window.cloudSaveSoon=function(){
    setUnsavedChanges(true);checkpointPut(localState());
    if(!FB.user){cloudBadge('offline','— salvo neste aparelho');return;}
    clearTimeout(FB.timer);FB.timer=setTimeout(function(){cloudSave();},700);
  };
  window.cloudSave=function(){
    clearTimeout(FB.timer);
    var st=localState();if(!st)return;
    window._cloudReplace=false;
    return commitState(st);
  };
  window.cloudSyncNow=function(){return cloudSave();};
  window.cloudPull=function(){
    if(!FB.user){showAuthGate();return Promise.resolve(false);}
    cloudBadge('saving');
    return readRemote().then(function(r){
      window._cloudInitDone=true;
      if(meaningful(r.state)){
        var merged=(typeof cloudMerge==='function')?cloudMerge(localState(),r.state):r.state;
        cloudApply(merged);checkpointPut(merged);
        if(stable(splitState(merged))!==stable(r.flat))commitState(merged);
        else cloudBadge('saved');
      }else if(meaningful(localState()))commitState(localState());
      else cloudBadge('saved');
      return true;
    }).catch(function(e){
      cloudBadge('offline','— usando dados do aparelho');
      console.error('[Agracta Firebase] leitura:',e);
      return false;
    });
  };
  window.cloudResync=function(){
    if(!FB.user){showAuthGate();return;}
    if(window._unsavedChanges)cloudSave();else cloudPull();
  };
  window.cloudSubscribe=function(){
    if(!FB.user||!FB.db)return;
    if(FB.unsub){FB.unsub();FB.unsub=null;}
    FB.unsub=FB.db.doc(ROOT).onSnapshot({includeMetadataChanges:true},function(snap){
      if(!snap.exists||snap.metadata.hasPendingWrites)return;
      var rev=(snap.data()||{}).rev||0;
      if(rev>FB.lastRev&&!FB.pushing){
        FB.lastRev=rev;clearTimeout(window._fbPullTimer);window._fbPullTimer=setTimeout(cloudPull,250);
      }
    },function(){cloudBadge('offline','— usando dados do aparelho');});
  };
  window.cloudStart=function(){
    if(!FB.user){startLocal('— entre para sincronizar');return;}
    cloudPull().then(function(){cloudSubscribe();});
    if(!window.__firebaseNet){
      window.__firebaseNet=true;
      window.addEventListener('online',function(){cloudResync();});
      window.addEventListener('offline',function(){cloudBadge('offline','— salvo neste aparelho');});
      document.addEventListener('visibilitychange',function(){
        if(document.visibilityState==='visible')cloudResync();
        else if(window._unsavedChanges)cloudSave();
      });
      window.addEventListener('pagehide',function(){checkpointPut(localState());if(window._unsavedChanges)cloudSave();});
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

  window.openCloudHistory=function(){
    if(typeof _stxToast==='function')_stxToast('Durante a migração, use Backups locais ou exporte um arquivo.');
    openBackups();
  };
  function authConsoleMessage(){
    var id=CFG.projectId||'o projeto';
    alert('As contas agora são gerenciadas no Firebase Authentication ('+id+'). Os dados locais e a lista de técnicos não foram apagados.');
  }
  window._invocarCriarTecnico=authConsoleMessage;
  window.alternarAcessoTecnico=authConsoleMessage;
  window.redefinirSenhaTecnico=authConsoleMessage;
  window.salvarNomePerfil=authConsoleMessage;
  window._carregarPerfis=function(){
    var box=document.getElementById('admPerfisList');
    if(box)box.innerHTML='<div style="color:#8aa88a;font-size:12px;padding:8px 0">Contas e senhas são gerenciadas no Firebase Authentication. A lista nominal do Agracta permanece neste painel.</div>';
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
    splitState:splitState,buildState:buildState
  };
})();
