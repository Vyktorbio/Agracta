/*
 * Agracta — sincronização automática P2P pela WebRTC.
 * O Firebase autentica presença e continua como fallback/autoridade; os dados
 * seguem diretamente no DataChannel quando os dois aparelhos estão conectados.
 */
(function(){
  'use strict';
  if(window.AgractaP2P)return;
  var ROOM_PREFIX='agracta-vyktorbio-mesh-v1-slot-',MAX_SLOTS=8;
  var CHUNK_SIZE=16000,MAX_P2P_CHARS=500000,MAX_CHUNKS=Math.ceil(MAX_P2P_CHARS/CHUNK_SIZE)+1,LOCAL_SYNC_COALESCE_MS=60;
  var PEERJS_CDNS=['https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'];
  var ICE_SERVERS=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
  var p2p={deviceId:'dev_'+Math.random().toString(36).slice(2,10),slotIndex:1,peer:null,peerId:null,sessionToken:'',
    connections:{},authenticated:{},authenticating:{},incomingBuffers:{},seenMessages:{},ready:false,connecting:false,
    discoveryTimer:null,presenceTimer:null,monitorTimer:null,localTimer:null,retryAfter:0,localSeq:0,sentCount:0,receivedCount:0};
  function engine(){return window.AgractaBundleEngine||null;}
  function tokenAleatorio(){
    try{var a=new Uint8Array(24);window.crypto.getRandomValues(a);return Array.prototype.map.call(a,function(x){return ('0'+x.toString(16)).slice(-2);}).join('');}
    catch(e){return p2p.deviceId+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);}
  }
  function loadPeerJsLibrary(){
    if(typeof window.Peer==='function')return Promise.resolve(window.Peer);
    return new Promise(function(resolve){
      var idx=0;
      function next(){
        if(typeof window.Peer==='function')return resolve(window.Peer);
        if(idx>=PEERJS_CDNS.length)return resolve(null);
        var s=document.createElement('script');s.src=PEERJS_CDNS[idx++];s.async=true;
        s.onload=function(){resolve(typeof window.Peer==='function'?window.Peer:null);};
        s.onerror=next;(document.head||document.documentElement).appendChild(s);
      }
      next();
    });
  }
  function activePeerIds(){return Object.keys(p2p.connections).filter(function(k){return p2p.connections[k]&&p2p.connections[k].open&&p2p.authenticated[k];});}
  function sendRawOverConn(conn,obj,allowUnauthenticated){
    if(!conn||!conn.open||(!allowUnauthenticated&&!p2p.authenticated[conn.peer]))return false;
    try{
      var raw=JSON.stringify(obj);
      if(raw.length>MAX_P2P_CHARS){
        if(obj&&obj.type==='BUNDLE_PUSH')return sendRawOverConn(conn,{type:'SYNC_HINT',rev:Number((obj.bundle||{}).rev)||0},false);
        return false;
      }
      if(raw.length<=CHUNK_SIZE){conn.send({t:'MSG',d:raw});return true;}
      var id=p2p.deviceId+'_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),total=Math.ceil(raw.length/CHUNK_SIZE);
      if(total>MAX_CHUNKS)return false;
      for(var i=0;i<total;i++)conn.send({t:'CHK',id:id,i:i,n:total,c:raw.slice(i*CHUNK_SIZE,(i+1)*CHUNK_SIZE)});
      return true;
    }catch(e){return false;}
  }
  function broadcastPacket(packet,excludePeerId){
    var ids=activePeerIds(),sent=0;
    ids.forEach(function(id){if(id===excludePeerId)return;if(sendRawOverConn(p2p.connections[id],packet))sent++;});
    if(sent)p2p.sentCount++;return sent;
  }
  function sendBundle(conn,b){
    if(!b||!b.flat)return false;
    var uid=b.local?'local_'+b.sender+'_'+b.seq:'push_'+p2p.deviceId+'_'+b.rev+'_'+(b.writeId||'');
    return sendRawOverConn(conn,{type:'BUNDLE_PUSH',msgUid:uid,sender:p2p.deviceId,bundle:b});
  }
  function sendHello(conn){
    var e=engine();if(!e)return;
    e.getCurrentBundle(false).then(function(b){
      sendRawOverConn(conn,{type:'HELLO',sender:p2p.deviceId,rev:Number((b&&b.rev)||0),writeId:String((b&&b.writeId)||'')});
    }).catch(function(){});
  }
  function authenticate(conn,sessionToken){
    var e=engine(),id=conn&&conn.peer;
    if(!e||!id||p2p.authenticating[id]||p2p.authenticated[id])return;
    p2p.authenticating[id]=true;
    e.verifyPeer(id,sessionToken).then(function(ok){
      delete p2p.authenticating[id];
      if(!ok||!conn.open){try{conn.close();}catch(_){}return;}
      p2p.authenticated[id]=true;sendHello(conn);
    }).catch(function(){delete p2p.authenticating[id];try{conn.close();}catch(_){}});
  }
  function handleDecodedMessage(conn,msg){
    if(!msg||!msg.type)return;
    if(msg.type==='AUTH'&&typeof msg.sessionToken==='string'){authenticate(conn,msg.sessionToken);return;}
    if(!p2p.authenticated[conn.peer])return;
    if(msg.msgUid){
      if(p2p.seenMessages[msg.msgUid])return;
      p2p.seenMessages[msg.msgUid]=Date.now();
    }
    var e=engine();
    if(msg.type==='HELLO'||msg.type==='SYNC_CHECK'){
      if(!e)return;
      e.getCurrentBundle(false).then(function(b){
        var myRev=Number((b&&b.rev)||0),peerRev=Number(msg.rev||0);
        if(b&&b.flat&&(myRev>peerRev||(myRev===peerRev&&b.writeId&&msg.writeId&&b.writeId!==msg.writeId)))sendBundle(conn,b);
        else if(peerRev>myRev)sendRawOverConn(conn,{type:'BUNDLE_REQUEST',sender:p2p.deviceId,myRev:myRev,writeId:(b&&b.writeId)||''});
      }).catch(function(){});
      return;
    }
    if(msg.type==='BUNDLE_REQUEST'){
      if(!e)return;
      e.getCurrentBundle(false).then(function(b){
        if(b&&b.flat&&(Number(b.rev)>Number(msg.myRev||0)||(Number(b.rev)===Number(msg.myRev||0)&&b.writeId!==String(msg.writeId||''))))sendBundle(conn,b);
      }).catch(function(){});
      return;
    }
    if(msg.type==='SYNC_HINT'){if(typeof window.cloudPull==='function')window.cloudPull();return;}
    if(msg.type==='BUNDLE_PUSH'&&msg.bundle){
      e&&e.receiveRemoteP2PBundle(msg.bundle).then(function(applied){
        if(applied){p2p.receivedCount++;broadcastPacket(msg,conn.peer);}
      }).catch(function(){});
    }
  }
  function onRawFrameReceived(conn,frame){
    if(!frame||typeof frame!=='object')return;
    if(frame.t==='MSG'&&typeof frame.d==='string'){try{handleDecodedMessage(conn,JSON.parse(frame.d));}catch(e){}return;}
    if(frame.t!=='CHK'||!p2p.authenticated[conn.peer]||!frame.id||typeof frame.i!=='number'||
       typeof frame.n!=='number'||typeof frame.c!=='string'||frame.n<1||frame.n>MAX_CHUNKS||
       frame.i<0||frame.i>=frame.n||frame.c.length>CHUNK_SIZE)return;
    var buf=p2p.incomingBuffers[frame.id];
    if(!buf){if(Object.keys(p2p.incomingBuffers).length>=2)return;buf=p2p.incomingBuffers[frame.id]={total:frame.n,parts:new Array(frame.n),count:0,ts:Date.now()};}
    if(buf.total!==frame.n)return;
    if(buf.parts[frame.i]===undefined){buf.parts[frame.i]=frame.c;buf.count++;}
    if(buf.count===buf.total){var full=buf.parts.join('');delete p2p.incomingBuffers[frame.id];try{handleDecodedMessage(conn,JSON.parse(full));}catch(e){}}
  }
  function sendAuth(conn){
    if(!p2p.ready||!conn||!conn.open||conn.__agractaAuthSent)return;
    conn.__agractaAuthSent=true;sendRawOverConn(conn,{type:'AUTH',sender:p2p.deviceId,sessionToken:p2p.sessionToken},true);
  }
  function registerConnection(conn){
    if(!conn||!conn.peer||conn.peer===p2p.peerId)return;
    function opened(){p2p.connections[conn.peer]=conn;if(p2p.ready)sendAuth(conn);}
    conn.on('open',opened);conn.on('data',function(data){onRawFrameReceived(conn,data);});
    function remove(){delete p2p.connections[conn.peer];delete p2p.authenticated[conn.peer];delete p2p.authenticating[conn.peer];}
    conn.on('close',remove);conn.on('error',remove);if(conn.open)opened();
  }
  function connectToMeshPeers(){
    if(!p2p.peer||!p2p.ready||p2p.peer.destroyed)return;
    for(var s=1;s<=MAX_SLOTS;s++){
      var id=ROOM_PREFIX+s;if(id===p2p.peerId)continue;
      if(p2p.connections[id]&&p2p.connections[id].open)continue;
      try{registerConnection(p2p.peer.connect(id,{reliable:true}));}catch(e){}
    }
  }
  function clearPeerTimers(){clearInterval(p2p.discoveryTimer);clearInterval(p2p.presenceTimer);p2p.discoveryTimer=p2p.presenceTimer=null;}
  function stopMeshNode(){
    clearPeerTimers();clearTimeout(p2p.localTimer);p2p.localTimer=null;
    var e=engine(),id=p2p.peerId,token=p2p.sessionToken,peer=p2p.peer;
    if(id&&token&&e&&e.removePeer)e.removePeer(id,token);
    Object.keys(p2p.connections).forEach(function(k){try{p2p.connections[k].close();}catch(_){}});
    if(peer)try{peer.destroy();}catch(_){}
    p2p.peer=null;p2p.peerId=null;p2p.sessionToken='';p2p.connections={};p2p.authenticated={};p2p.authenticating={};
    p2p.ready=false;p2p.connecting=false;
  }
  function startMeshNode(slotIdx){
    if(p2p.connecting||p2p.ready||Date.now()<p2p.retryAfter)return;
    var e=engine();if(!e||!e.canStart||!e.canStart())return;
    p2p.connecting=true;p2p.slotIndex=slotIdx||1;
    loadPeerJsLibrary().then(function(PeerCtor){
      if(!PeerCtor){p2p.connecting=false;p2p.retryAfter=Date.now()+30000;return;}
      var id=p2p.slotIndex<=MAX_SLOTS?ROOM_PREFIX+p2p.slotIndex:ROOM_PREFIX+'dyn-'+p2p.deviceId,peer;
      try{peer=new PeerCtor(id,{config:{iceServers:ICE_SERVERS}});}
      catch(err){p2p.connecting=false;p2p.retryAfter=Date.now()+30000;return;}
      peer.on('open',function(openId){
        if(p2p.peer&&p2p.peer!==peer)return;
        p2p.peer=peer;p2p.peerId=openId;p2p.sessionToken=tokenAleatorio();
        e.registerPeer(openId,p2p.sessionToken).then(function(){
          if(p2p.peer!==peer)return;
          p2p.ready=true;p2p.connecting=false;p2p.retryAfter=0;connectToMeshPeers();
          Object.keys(p2p.connections).forEach(function(k){sendAuth(p2p.connections[k]);});
          clearPeerTimers();
          p2p.discoveryTimer=setInterval(function(){
            connectToMeshPeers();var now=Date.now();
            Object.keys(p2p.incomingBuffers).forEach(function(k){if(now-p2p.incomingBuffers[k].ts>60000)delete p2p.incomingBuffers[k];});
            Object.keys(p2p.seenMessages).forEach(function(k){if(now-p2p.seenMessages[k]>300000)delete p2p.seenMessages[k];});
          },25000);
          p2p.presenceTimer=setInterval(function(){if(p2p.ready)e.refreshPeer(openId,p2p.sessionToken).catch(function(){});},120000);
          if(window._unsavedChanges)pushLocalBundle();
        }).catch(function(){p2p.connecting=false;p2p.retryAfter=Date.now()+30000;try{peer.destroy();}catch(_){}});
      });
      peer.on('connection',registerConnection);
      peer.on('error',function(err){
        var type=String((err&&err.type)||'');
        if(type==='unavailable-id'){
          p2p.connecting=false;try{peer.destroy();}catch(_){}
          startMeshNode(p2p.slotIndex+1);return;
        }
        if(!p2p.ready){p2p.connecting=false;p2p.retryAfter=Date.now()+30000;}
      });
      peer.on('disconnected',function(){p2p.ready=false;try{peer.reconnect();}catch(_){p2p.retryAfter=Date.now()+30000;}});
      peer.on('close',function(){if(p2p.peer===peer){stopMeshNode();p2p.retryAfter=Date.now()+10000;}});
    }).catch(function(){p2p.connecting=false;p2p.retryAfter=Date.now()+30000;});
  }
  function pushLocalBundle(){
    clearTimeout(p2p.localTimer);
    p2p.localTimer=setTimeout(function(){
      if(!p2p.ready)return;
      var e=engine();if(!e)return;
      e.getCurrentBundle(true,p2p.deviceId,++p2p.localSeq).then(function(b){
        if(b&&b.flat)broadcastPacket({type:'BUNDLE_PUSH',msgUid:'local_'+p2p.deviceId+'_'+b.seq,sender:p2p.deviceId,bundle:b});
      }).catch(function(){});
    },LOCAL_SYNC_COALESCE_MS);
  }
  function sendCommittedBundle(){
    if(!p2p.ready)return;
    var e=engine();if(!e)return;
    e.getCurrentBundle(false).then(function(b){
      if(b&&b.flat)broadcastPacket({type:'BUNDLE_PUSH',msgUid:'push_'+p2p.deviceId+'_'+b.rev+'_'+b.writeId,sender:p2p.deviceId,bundle:b});
    }).catch(function(){});
  }
  function maybeStart(){
    var e=engine();if(e&&e.canStart&&e.canStart()){startMeshNode(1);return;}
    if(p2p.peer||p2p.connecting)stopMeshNode();
  }
  function requestSyncFromPeers(){
    if(!p2p.ready)return;
    var e=engine();if(!e)return;
    e.getCurrentBundle(false).then(function(b){
      broadcastPacket({type:'SYNC_CHECK',sender:p2p.deviceId,rev:Number((b&&b.rev)||0),writeId:String((b&&b.writeId)||'')});
    }).catch(function(){});
  }
  function wrapSyncExplicar(){
    if(typeof window.agractaSyncExplicar!=='function'||window.agractaSyncExplicar.__p2pWrapped)return;
    var orig=window.agractaSyncExplicar;
    var wrapped=function(){console.info('[Agracta P2P]',{status:window.AgractaP2P.status()});return orig.apply(this,arguments);};
    wrapped.__p2pWrapped=true;window.agractaSyncExplicar=wrapped;
  }
  window.AgractaP2P={
    status:function(){return {ready:p2p.ready,connecting:p2p.connecting,peerId:p2p.peerId,connectedPeers:activePeerIds().length,
      peers:activePeerIds(),sentCount:p2p.sentCount,receivedCount:p2p.receivedCount};},
    broadcastBundle:function(bundle){if(!bundle||!bundle.flat)return 0;return broadcastPacket({type:'BUNDLE_PUSH',
      msgUid:'push_'+p2p.deviceId+'_'+Number(bundle.rev||0)+'_'+(bundle.writeId||Date.now()),sender:p2p.deviceId,bundle:bundle});},
    requestSyncFromPeers:requestSyncFromPeers,
    reconnect:function(){p2p.retryAfter=0;maybeStart();connectToMeshPeers();}
  };
  window.addEventListener('agracta:cloud-ready',function(){maybeStart();requestSyncFromPeers();});
  window.addEventListener('agracta:sincronizado',sendCommittedBundle);
  window.addEventListener('agracta:local-change',pushLocalBundle);
  window.addEventListener('online',function(){p2p.retryAfter=0;maybeStart();if(p2p.peer&&!p2p.ready)try{p2p.peer.reconnect();}catch(_){}});
  window.addEventListener('pagehide',stopMeshNode);
  window.addEventListener('pageshow',function(){p2p.retryAfter=0;maybeStart();});
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden){maybeStart();if(p2p.ready){var e=engine();if(e)e.refreshPeer(p2p.peerId,p2p.sessionToken).catch(function(){});connectToMeshPeers();requestSyncFromPeers();}}
  });
  p2p.monitorTimer=setInterval(maybeStart,2500);
  wrapSyncExplicar();
})();
