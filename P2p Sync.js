/*
 * Agracta - Motor de Sincronização Direta P2P pela Internet (WebRTC Mesh).
 *
 * Conecta automaticamente todos os aparelhos (celulares e computadores) que estão com o
 * Agracta aberto em qualquer rede (Wi-Fi, 4G, 5G, cidades diferentes) usando WebRTC DataChannels.
 *
 * Benefícios:
 * 1. Transmite atualizações do banco diretamente entre aparelhos abertos em tempo real (0 custo no Firebase).
 * 2. Quando um aparelho recebe o pacote via P2P, grava no seu IndexedDB local antes mesmo do Firebase
 *    disparar leituras, zerando o consumo de leitura nos dispositivos conectados.
 * 3. Se a cota diária do Firebase estourar (resource-exhausted), todos os aparelhos conectados
 *    continuam sincronizando entre si normalmente pela internet.
 */
(function() {
  'use strict';

  if (window.AgractaP2P) return;

  var ROOM_PREFIX = 'agracta-vyktorbio-mesh-v1-slot-';
  var MAX_SLOTS = 8; // Suporta até 8 nós cabeças de malha + conexões dinâmicas ilimitadas
  var CHUNK_SIZE = 16000; // 16 KB por frame WebRTC SCTP para máxima estabilidade em celulares
  var PEERJS_CDNS = [
    'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'
  ];

  var ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  var p2p = {
    deviceId: 'dev_' + Math.random().toString(36).slice(2, 10),
    slotIndex: 1,
    peer: null,
     peerId: null,
    connections: {}, // { [remotePeerId]: DataConnection }
    incomingBuffers: {}, // { [msgId]: { total, parts, count, ts } }
    seenMessages: {},
    ready: false,
    connecting: false,
    discoveryTimer: null,
    sentCount: 0,
    receivedCount: 0
  };

  function loadPeerJsLibrary() {
    if (typeof window.Peer === 'function') return Promise.resolve(window.Peer);
    return new Promise(function(resolve) {
      var idx = 0;
      function tryNext() {
        if (typeof window.Peer === 'function') return resolve(window.Peer);
        if (idx >= PEERJS_CDNS.length) return resolve(null);
        var script = document.createElement('script');
        script.src = PEERJS_CDNS[idx++];
        script.async = true;
        script.onload = function() { resolve(typeof window.Peer === 'function' ? window.Peer : null); };
        script.onerror = function() { tryNext(); };
        (document.head || document.documentElement).appendChild(script);
      }
      tryNext();
    });
  }

  function activePeerCount() {
    return Object.keys(p2p.connections).filter(function(k) {
      return p2p.connections[k] && p2p.connections[k].open;
    }).length;
  }

  // ==================== ENVIO E RECEBIMENTO COM FRAGMENTAÇÃO (CHUNKING 16 KB) ====================
  function sendRawOverConn(conn, obj) {
    if (!conn || !conn.open) return false;
    try {
      var raw = JSON.stringify(obj);
      if (raw.length <= CHUNK_SIZE) {
        conn.send({ t: 'MSG', d: raw });
        return true;
      }
      var msgId = p2p.deviceId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      var total = Math.ceil(raw.length / CHUNK_SIZE);
      for (var i = 0; i < total; i++) {
        conn.send({
          t: 'CHK',
          id: msgId,
          i: i,
          n: total,
          c: raw.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function broadcastPacket(packet, excludePeerId) {
    var keys = Object.keys(p2p.connections);
    var sent = 0;
    for (var i = 0; i < keys.length; i++) {
      var pid = keys[i];
      if (pid === excludePeerId) continue;
      var conn = p2p.connections[pid];
      if (conn && conn.open) {
        if (sendRawOverConn(conn, packet)) sent++;
      }
    }
    if (sent > 0) p2p.sentCount++;
    return sent;
  }

  function handleDecodedMessage(conn, msg) {
    if (!msg || !msg.type) return;
    if (msg.msgUid) {
      if (p2p.seenMessages[msg.msgUid]) return;
      p2p.seenMessages[msg.msgUid] = Date.now();
    }

    // 1. Handshake inicial: compara revisões entre os aparelhos conectados
    if (msg.type === 'HELLO' || msg.type === 'SYNC_CHECK') {
      if (!window.AgractaBundleEngine) return;
      window.AgractaBundleEngine.getCurrentBundle().then(function(myBundle) {
        var myRev = Number((myBundle && myBundle.rev) || window._cloudRev || 0);
        var peerRev = Number(msg.rev || 0);
        if (myRev > peerRev && myBundle && myBundle.flat) {
          sendRawOverConn(conn, {
            type: 'BUNDLE_PUSH',
            msgUid: 'push_' + p2p.deviceId + '_' + myRev + '_' + (myBundle.writeId || ''),
            sender: p2p.deviceId,
            bundle: myBundle
          });
        } else if (peerRev > myRev) {
          sendRawOverConn(conn, {
            type: 'BUNDLE_REQUEST',
            sender: p2p.deviceId,
            myRev: myRev
          });
        }
      });
      return;
    }

    // 2. Pedido explícito de banco atualizado por outro aparelho
    if (msg.type === 'BUNDLE_REQUEST') {
      if (!window.AgractaBundleEngine) return;
      window.AgractaBundleEngine.getCurrentBundle().then(function(myBundle) {
        var myRev = Number((myBundle && myBundle.rev) || 0);
        if (myBundle && myBundle.flat && myRev > Number(msg.myRev || 0)) {
          sendRawOverConn(conn, {
            type: 'BUNDLE_PUSH',
            msgUid: 'push_' + p2p.deviceId + '_' + myRev + '_' + (myBundle.writeId || ''),
            sender: p2p.deviceId,
            bundle: myBundle
          });
        }
      });
      return;
    }

    // 3. Recebimento de um Bundle atualizado pela internet via WebRTC
    if (msg.type === 'BUNDLE_PUSH' && msg.bundle) {
      p2p.receivedCount++;
      if (window.AgractaBundleEngine && typeof window.AgractaBundleEngine.receiveRemoteP2PBundle === 'function') {
        window.AgractaBundleEngine.receiveRemoteP2PBundle(msg.bundle).then(function(applied) {
          if (applied) {
            // Retransmite na malha P2P para outros aparelhos conectados a este nó
            broadcastPacket(msg, conn.peer);
          }
        });
      }
    }
  }

  function onRawFrameReceived(conn, frame) {
    if (!frame || typeof frame !== 'object') return;
    if (frame.t === 'MSG' && typeof frame.d === 'string') {
      try {
        handleDecodedMessage(conn, JSON.parse(frame.d));
      } catch (e) {}
      return;
    }
    if (frame.t === 'CHK' && frame.id && typeof frame.i === 'number' && typeof frame.n === 'number') {
      var buf = p2p.incomingBuffers[frame.id];
      if (!buf) {
        buf = { total: frame.n, parts: new Array(frame.n), count: 0, ts: Date.now() };
        p2p.incomingBuffers[frame.id] = buf;
      }
      if (buf.parts[frame.i] === undefined) {
        buf.parts[frame.i] = frame.c || '';
        buf.count++;
      }
      if (buf.count === buf.total) {
        var fullStr = buf.parts.join('');
        delete p2p.incomingBuffers[frame.id];
        try {
          handleDecodedMessage(conn, JSON.parse(fullStr));
        } catch (e) {}
      }
    }
  }

  // ==================== GERENCIAMENTO DE CONEXÕES E DESCOBERTA DE MALHA ====================
  function registerConnection(conn) {
    if (!conn || !conn.peer) return;
    if (conn.peer === p2p.peerId) return;

    conn.on('open', function() {
      p2p.connections[conn.peer] = conn;
      // Envia HELLO informando a revisão atual do aparelho
      if (window.AgractaBundleEngine) {
        window.AgractaBundleEngine.getCurrentBundle().then(function(b) {
          sendRawOverConn(conn, {
            type: 'HELLO',
            sender: p2p.deviceId,
            rev: Number((b && b.rev) || window._cloudRev || 0)
          });
        });
      }
    });

    conn.on('data', function(data) {
      onRawFrameReceived(conn, data);
    });

    conn.on('close', function() {
      delete p2p.connections[conn.peer];
    });

    conn.on('error', function() {
      delete p2p.connections[conn.peer];
    });
  }

  function connectToMeshPeers() {
    if (!p2p.peer || !p2p.ready || p2p.peer.destroyed) return;
    for (var s = 1; s <= MAX_SLOTS; s++) {
      var targetId = ROOM_PREFIX + s;
      if (targetId === p2p.peerId) continue;
      if (p2p.connections[targetId] && p2p.connections[targetId].open) continue;
      try {
        var conn = p2p.peer.connect(targetId, { reliable: true });
        registerConnection(conn);
      } catch (e) {}
    }
  }

  function startMeshNode(slotIdx) {
    if (p2p.connecting || p2p.ready) return;
    p2p.connecting = true;
    p2p.slotIndex = slotIdx || 1;

    loadPeerJsLibrary().then(function(PeerCtor) {
      if (!PeerCtor) {
        p2p.connecting = false;
        return;
      }

      var candidateId = (p2p.slotIndex <= MAX_SLOTS)
        ? (ROOM_PREFIX + p2p.slotIndex)
        : (ROOM_PREFIX + 'dyn-' + p2p.deviceId);

      var peer;
      try {
        peer = new PeerCtor(candidateId, {
          config: { iceServers: ICE_SERVERS }
        });
      } catch (e) {
        p2p.connecting = false;
        return;
      }

      peer.on('open', function(id) {
        p2p.peer = peer;
        p2p.peerId = id;
        p2p.ready = true;
        p2p.connecting = false;
        connectToMeshPeers();

        if (p2p.discoveryTimer) clearInterval(p2p.discoveryTimer);
        p2p.discoveryTimer = setInterval(function() {
          connectToMeshPeers();
          // Limpa buffers antigos incompletos
          var now = Date.now();
          Object.keys(p2p.incomingBuffers).forEach(function(k) {
            if (now - p2p.incomingBuffers[k].ts > 60000) delete p2p.incomingBuffers[k];
          });
        }, 25000);
      });

      peer.on('connection', function(conn) {
        registerConnection(conn);
      });

      peer.on('error', function(err) {
        var errType = String((err && err.type) || '');
        if (errType === 'unavailable-id') {
          // O slot já está ocupado por outro aparelho do Agracta online -> assume o próximo slot e conecta a ele!
          p2p.connecting = false;
          try { peer.destroy(); } catch (e) {}
          startMeshNode(p2p.slotIndex + 1);
          return;
        }
        p2p.connecting = false;
      });

      peer.on('disconnected', function() {
        p2p.ready = false;
        try { peer.reconnect(); } catch (e) {}
      });
    });
  }

  // ==================== INTEGRAÇÃO COM DIAGNÓSTICO E API PÚBLICA ====================
  function wrapSyncExplicar() {
    if (typeof window.agractaSyncExplicar === 'function' && !window.agractaSyncExplicar.__p2pWrapped) {
      var origExplicar = window.agractaSyncExplicar;
      var wrapped = function() {
        var bStatus = window.AgractaBundleEngine ? window.AgractaBundleEngine.getStatus() : null;
        console.info('[Agracta Sync P2P + Bundle Status]', {
          aparelhosConectadosP2P: activePeerCount(),
          meuPeerId: p2p.peerId,
          pacotesP2PEnviados: p2p.sentCount,
          pacotesP2PRecebidos: p2p.receivedCount,
          bundleStatus: bStatus
        });
        return origExplicar.apply(this, arguments);
      };
      wrapped.__p2pWrapped = true;
      window.agractaSyncExplicar = wrapped;
    }
  }

  window.AgractaP2P = {
    status: function() {
      return {
        ready: p2p.ready,
        peerId: p2p.peerId,
        connectedPeers: activePeerCount(),
        peers: Object.keys(p2p.connections).filter(function(k) {
          return p2p.connections[k] && p2p.connections[k].open;
        }),
        sentCount: p2p.sentCount,
        receivedCount: p2p.receivedCount
      };
    },
    broadcastBundle: function(bundleObj) {
      if (!bundleObj || !bundleObj.flat) return 0;
      var rev = Number(bundleObj.rev || 0);
      return broadcastPacket({
        type: 'BUNDLE_PUSH',
        msgUid: 'push_' + p2p.deviceId + '_' + rev + '_' + (bundleObj.writeId || Date.now()),
        sender: p2p.deviceId,
        bundle: bundleObj
      });
    },
    requestSyncFromPeers: function() {
      if (!window.AgractaBundleEngine) return;
      window.AgractaBundleEngine.getCurrentBundle().then(function(b) {
        var myRev = Number((b && b.rev) || window._cloudRev || 0);
        broadcastPacket({
          type: 'SYNC_CHECK',
          sender: p2p.deviceId,
          rev: myRev
        });
      });
    },
    reconnect: function() {
      connectToMeshPeers();
    }
  };

  // Inicia a malha P2P assim que a janela estiver ativa
  if (typeof window !== 'undefined') {
    setTimeout(function() {
      startMeshNode(1);
      wrapSyncExplicar();
    }, 800);

    if (typeof window.addEventListener === 'function') window.addEventListener('online', function() {
      if (!p2p.ready) startMeshNode(1);
      else connectToMeshPeers();
    });

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', function() {
      if (!document.hidden) {
        connectToMeshPeers();
        window.AgractaP2P.requestSyncFromPeers();
      }
    });
  }
})();