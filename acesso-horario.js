/* Agracta — janela de acesso por pessoa.
 *
 * O app é corporativo: os dados de pesquisa só devem ficar na tela enquanto o
 * técnico está em expediente. Este arquivo faz três coisas, nesta ordem:
 *
 *   1. mantém o app invisível (classe .pre-auth no <html>) até que a pessoa
 *      esteja autenticada E dentro do horário permitido — quem não tem senha
 *      não vê sequer o desenho da interface;
 *   2. vigia o relógio durante a sessão: avisa 10 minutos antes de fechar,
 *      força a sincronização e só então cobre a tela e encerra a sessão, para
 *      que nenhum lançamento de campo se perca;
 *   3. dá ao administrador, dentro do Painel Admin, o controle de dias e
 *      horas de cada técnico.
 *
 * A trava de verdade está nas firestore.rules: mesmo que alguém contorne a
 * tela, o banco recusa leitura e escrita fora da janela.
 */
(function(){
  'use strict';

  var TZ_OFFSET_MIN = -180;           /* America/Sao_Paulo, sem horário de verão */
  var AVISO_MIN     = 10;             /* aviso antes de fechar */
  var CHECAGEM_MS   = 30000;
  var CACHE_KEY     = 'agracta-janela-cache';
  var ROOT          = 'workspaces/agracta';
  var ADMINS        = {'machadovictorchaves@gmail.com':1,'vyktorbio@gmail.com':1};

  var DIAS = ['dom','seg','ter','qua','qui','sex','sáb'];

  function $(id){ return document.getElementById(id); }

  var estado = {
    email:'', janela:null, verificado:false, travado:false,
    avisou:false, timer:null, unsub:null
  };

  /* ---------- utilidades de horário ---------- */

  function agoraLocal(){
    var d = new Date();
    return new Date(d.getTime() + (d.getTimezoneOffset() + TZ_OFFSET_MIN) * 60000);
  }
  function hhmm(min){
    min = Math.max(0, Math.min(1439, Math.round(min||0)));
    return String(Math.floor(min/60)).padStart(2,'0')+':'+String(min%60).padStart(2,'0');
  }
  function paraMin(txt){
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(txt||'').trim());
    if(!m) return null;
    var v = parseInt(m[1],10)*60 + parseInt(m[2],10);
    return (v>=0 && v<=1439) ? v : null;
  }
  /* Normaliza qualquer formato guardado (novo, antigo ou vazio) numa só forma. */
  function normalizar(j){
    if(!j || typeof j!=='object') return {on:false, dias:[1,2,3,4,5], iniMin:420, fimMin:1080};
    var dias = Array.isArray(j.dias) ? j.dias.map(Number).filter(function(d){return d>=0&&d<=6;}) : [1,2,3,4,5];
    var ini = (typeof j.iniMin==='number') ? j.iniMin : paraMin(j.ini);
    var fim = (typeof j.fimMin==='number') ? j.fimMin : paraMin(j.fim);
    return {
      on: !!j.on,
      dias: dias.length ? dias : [1,2,3,4,5],
      iniMin: (ini==null?420:ini),
      fimMin: (fim==null?1080:fim)
    };
  }
  /* Minutos restantes até o fim da janela. null = sem restrição. */
  function minutosRestantes(j, quando){
    j = normalizar(j);
    if(!j.on) return null;
    var d = quando || agoraLocal();
    var dia = d.getDay(), min = d.getHours()*60 + d.getMinutes();
    if(j.dias.indexOf(dia) < 0) return -1;
    if(min < j.iniMin) return -1;
    return j.fimMin - min;
  }
  function dentro(j, quando){
    var r = minutosRestantes(j, quando);
    return r===null || r>0;
  }
  function descrever(j){
    j = normalizar(j);
    if(!j.on) return 'Acesso liberado a qualquer hora.';
    var d = j.dias.slice().sort(function(a,b){return a-b;}).map(function(i){return DIAS[i];}).join(', ');
    return d+' · '+hhmm(j.iniMin)+' às '+hhmm(j.fimMin);
  }

  /* ---------- cache local (campo sem sinal não pode travar o trabalho) ---------- */

  function lerCache(email){
    try{
      var c = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
      if(c && c.email===email) return c.janela;
    }catch(e){}
    return null;
  }
  function gravarCache(email, janela){
    try{ localStorage.setItem(CACHE_KEY, JSON.stringify({email:email, janela:janela, ts:Date.now()})); }catch(e){}
  }

  /* ---------- tela de bloqueio ---------- */

  function css(){
    if(document.getElementById('acessoLockCss')) return;
    var s = document.createElement('style');
    s.id = 'acessoLockCss';
    s.textContent =
      '#acessoLock{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;padding:24px;'+
        'background:radial-gradient(120% 90% at 50% 0%,#fbfbfc,#eef0f2 58%,#e4e7ea);font-family:var(--ag-font,system-ui)}'+
      '#acessoLock.on{display:flex}'+
      '#acessoLock .lk{max-width:360px;width:100%;text-align:center;background:#fff;border:1px solid #e2e5e8;border-radius:20px;'+
        'padding:32px 26px;box-shadow:0 24px 60px rgba(20,24,28,.12)}'+
      '#acessoLock .lk-ic{width:52px;height:52px;margin:0 auto 16px;border-radius:16px;background:#f2f4f6;display:flex;align-items:center;justify-content:center;color:#3a4650}'+
      '#acessoLock .lk-t{font:800 20px/1.25 var(--ag-display,system-ui);color:#16201b;margin-bottom:8px}'+
      '#acessoLock .lk-s{font:500 13px/1.6 var(--ag-font,system-ui);color:#6c7770}'+
      '#acessoLock .lk-w{margin-top:16px;padding:11px 13px;border-radius:12px;background:#f5f7f8;border:1px solid #e6eaec;'+
        'font:650 12px/1.5 var(--ag-font,system-ui);color:#3f4d45}'+
      '#acessoLock .lk-b{margin-top:18px;width:100%;border:none;border-radius:12px;padding:13px;cursor:pointer;'+
        'font:800 14px var(--ag-font,system-ui);background:linear-gradient(180deg,#2c323a,#1d2229);color:#fff}'+
      '#acessoAviso{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom));z-index:8000;'+
        'display:none;align-items:center;gap:10px;max-width:92vw;padding:11px 16px;border-radius:999px;'+
        'background:#3a2c0b;color:#ffd98a;border:1px solid #6b531b;box-shadow:0 12px 34px rgba(0,0,0,.3);'+
        'font:700 12.5px/1.3 var(--ag-font,system-ui)}'+
      '#acessoAviso.on{display:flex}';
    document.head.appendChild(s);
  }

  function mostrarTrava(motivo){
    css();
    var el = document.getElementById('acessoLock');
    if(!el){
      el = document.createElement('div');
      el.id = 'acessoLock';
      document.body.appendChild(el);
    }
    el.innerHTML =
      '<div class="lk">'+
        '<div class="lk-ic"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>'+
        '<div class="lk-t">Fora do horário de acesso</div>'+
        '<div class="lk-s">Seus dados foram salvos e sincronizados. O Agracta volta a abrir dentro do horário liberado pelo administrador.</div>'+
        '<div class="lk-w">'+String(motivo||'').replace(/[<>&]/g,'')+'</div>'+
        '<button class="lk-b" onclick="location.reload()">Tentar de novo</button>'+
      '</div>';
    el.classList.add('on');
    document.documentElement.classList.add('pre-auth');
    estado.travado = true;
  }

  function esconderAviso(){
    var a = document.getElementById('acessoAviso');
    if(a) a.classList.remove('on');
  }
  function mostrarAviso(minutos){
    css();
    var a = document.getElementById('acessoAviso');
    if(!a){
      a = document.createElement('div');
      a.id = 'acessoAviso';
      document.body.appendChild(a);
    }
    a.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'+
      '<span>Seu acesso encerra em '+minutos+' min — finalize o lançamento.</span>';
    a.classList.add('on');
  }

  /* Salva tudo que dá antes de encerrar a sessão. */
  function encerrar(motivo){
    if(estado.travado) return;
    esconderAviso();
    try{ if(typeof cloudSave==='function') cloudSave(); }catch(e){}
    setTimeout(function(){
      mostrarTrava(motivo);
      try{ if(window.firebase && window.firebase.apps && window.firebase.apps.length) window.firebase.auth().signOut(); }catch(e){}
    }, 1200);
  }

  /* ---------- vigilância ---------- */

  function checar(){
    if(estado.travado) return;
    if(ADMINS[estado.email]) return;                 /* administrador nunca é travado */
    var j = estado.janela;
    if(!j || !normalizar(j).on){ esconderAviso(); return; }
    var rest = minutosRestantes(j);
    if(rest === null){ esconderAviso(); return; }
    if(rest <= 0){
      encerrar('Janela permitida: '+descrever(j));
      return;
    }
    if(rest <= AVISO_MIN){ mostrarAviso(rest); }
    else { esconderAviso(); }
  }

  function iniciarVigilancia(){
    clearInterval(estado.timer);
    estado.timer = setInterval(checar, CHECAGEM_MS);
    document.addEventListener('visibilitychange', function(){ if(!document.hidden) checar(); });
    checar();
  }

  /* ---------- liberação da tela ---------- */

  /* Devolver a tela é mais que tirar a classe: o Leaflet mede o container uma
     vez e guarda. Se ele mediu enquanto a tela estava escondida — ou se ficou
     escondido durante uma trava —, o mapa volta com o tamanho errado. Um
     invalidateSize depois da liberação resolve, e é barato. */
  function liberarTela(){
    var estava = document.documentElement.classList.contains('pre-auth');
    document.documentElement.classList.remove('pre-auth');
    var el = $('acessoLock');
    if(el) el.classList.remove('on');
    if(!estava) return;
    [60, 400].forEach(function(ms){
      setTimeout(function(){
        try{ if(window._map && window._map.invalidateSize) window._map.invalidateSize(); }catch(e){}
        try{ if(typeof render === 'function') render(); }catch(e){}
      }, ms);
    });
  }

  /* Assina o documento do membro: se o administrador mudar o horário, vale na hora. */
  function vigiarMembro(email){
    if(!window.firebase || !window.firebase.apps || !window.firebase.apps.length) return false;
    var db;
    try{ db = window.firebase.firestore(); }catch(e){ return false; }
    if(!db) return false;
    try{ if(estado.unsub) estado.unsub(); }catch(e){}
    estado.unsub = db.doc(ROOT).collection('members').doc(email).onSnapshot(function(doc){
      var m = (doc && doc.exists) ? (doc.data()||{}) : {};
      estado.janela = normalizar(m.janela);
      gravarCache(email, estado.janela);
      estado.verificado = true;
      if(ADMINS[email] || dentro(estado.janela)){ liberarTela(); checar(); }
      else { liberarTela(); encerrar('Janela permitida: '+descrever(estado.janela)); }
    }, function(){
      /* sem leitura (offline ou regra recusou): usa o último horário conhecido */
      estado.janela = normalizar(lerCache(email));
      estado.verificado = true;
      if(ADMINS[email] || dentro(estado.janela)) liberarTela();
      else encerrar('Janela permitida: '+descrever(estado.janela));
    });
    return true;
  }

  function aoAutenticar(){
    var u = window._authUser || null;
    var email = String((u && u.email) || '').trim().toLowerCase();
    estado.email = email;
    estado.travado = false;
    estado.avisou = false;

    if(!email){                     /* modo offline assinado no aparelho */
      liberarTela();
      iniciarVigilancia();
      return;
    }
    if(ADMINS[email]){ liberarTela(); iniciarVigilancia(); return; }

    /* Decide já com o horário em cache para não piscar a interface, e confirma
       com a nuvem em seguida. */
    var cache = lerCache(email);
    if(cache){
      estado.janela = normalizar(cache);
      if(dentro(estado.janela)) liberarTela();
      else { encerrar('Janela permitida: '+descrever(estado.janela)); return; }
    }
    if(!vigiarMembro(email)) liberarTela();
    iniciarVigilancia();
  }

  /* ---------- ganchos no fluxo de login existente ---------- */

  var _hide = window.hideAuthGate;
  window.hideAuthGate = function(){
    if(typeof _hide === 'function') _hide.apply(this, arguments);
    setTimeout(aoAutenticar, 0);
  };
  var _show = window.showAuthGate;
  window.showAuthGate = function(){
    document.documentElement.classList.add('pre-auth');
    clearInterval(estado.timer);
    try{ if(estado.unsub) estado.unsub(); }catch(e){}
    estado.unsub = null; estado.travado = false;
    esconderAviso();
    if(typeof _show === 'function') return _show.apply(this, arguments);
  };

  /* Se o app já tinha liberado antes deste arquivo carregar (sessão persistida),
     alinha o estado sem esperar um novo login. */
  if(window._appStarted && !document.documentElement.classList.contains('pre-auth')){
    setTimeout(aoAutenticar, 0);
  }

  /* Rede de segurança: esconder o app é ótimo para proteger o dado e péssimo se
     alguma coisa quebrar antes de alguém mandar mostrar de novo — daria tela
     branca para a equipe inteira. Se em 10 segundos não houver nem login, nem
     trava, nem app na tela, a tela de login aparece. Nunca o app. */
  setTimeout(function(){
    var pre  = document.documentElement.classList.contains('pre-auth');
    var gate = $('authGate'), lock = $('acessoLock');
    var vendo = (gate && gate.classList.contains('on')) || (lock && lock.classList.contains('on'));
    if(pre && !vendo){
      try{ showAuthGate(); }catch(e){}
    }
  }, 10000);

  /* ---------- Painel Admin: editor da janela por técnico ---------- */

  window._carregarPerfis = function(){
    var box = document.getElementById('admPerfisList');
    if(!box) return;
    var db = null;
    try{ if(window.firebase && window.firebase.apps && window.firebase.apps.length) db = window.firebase.firestore(); }catch(e){}
    if(!db){
      box.innerHTML = '<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Sem conexão.</div>';
      return;
    }
    db.doc(ROOT).collection('members').get().then(function(snap){
      var arr = [];
      snap.forEach(function(d){
        var m = d.data()||{};
        arr.push({email:(m.email||d.id), nome:m.nome||'', active:m.active!==false, janela:normalizar(m.janela)});
      });
      Object.keys(ADMINS).forEach(function(a){
        var f = arr.find(function(x){ return String(x.email).toLowerCase()===a; });
        if(f) f.papel = 'admin';
        else arr.push({email:a, nome:a==='machadovictorchaves@gmail.com'?'Administrador Principal':'Administrador',
                       active:true, papel:'admin', janela:normalizar(null)});
      });
      arr.sort(function(a,b){
        if(a.papel !== b.papel) return a.papel==='admin' ? -1 : 1;
        return String(a.email||'').localeCompare(String(b.email||''));
      });
      window._perfisCache = arr;
      if(!arr.length){
        box.innerHTML = '<div style="color:#8aa88a;font-size:12px;text-align:center;padding:8px">Nenhuma conta ainda. Crie a primeira abaixo.</div>';
        return;
      }
      var off = {};
      arr.forEach(function(x){ if(!x.active) off[String(x.email).toLowerCase()] = 1; });
      if(typeof _renderPerfisList === 'function') _renderPerfisList(arr, off);
    }).catch(function(err){
      box.innerHTML = '<div style="color:#ff8a8a;font-size:12px;text-align:center;padding:8px">Erro ao ler contas: '+
        String(err && err.message || err).replace(/[<>&]/g,'')+'</div>';
    });
  };

  var _renderOrig = window._renderPerfisList;
  window._renderPerfisList = function(arr, disabledSet){
    if(typeof _renderOrig === 'function') _renderOrig(arr, disabledSet);
    var box = document.getElementById('admPerfisList');
    if(!box) return;
    var linhas = box.children;
    (arr||[]).forEach(function(p, i){
      if(p.papel === 'admin') return;
      var linha = linhas[i];
      if(!linha) return;
      var j = normalizar(p.janela);
      var wrap = document.createElement('div');
      wrap.style.cssText = 'margin-top:7px;border-top:1px dashed #22312a;padding-top:7px';
      wrap.innerHTML =
        '<label style="display:flex;align-items:center;gap:7px;font-size:11px;color:#9fb8a8;cursor:pointer">'+
          '<input type="checkbox" id="jn_on_'+i+'" '+(j.on?'checked':'')+' onchange="_janelaToggle('+i+')" style="width:auto">'+
          '<span>Só no horário de trabalho</span>'+
        '</label>'+
        '<div id="jn_box_'+i+'" style="'+(j.on?'':'display:none;')+'margin-top:6px">'+
          '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">'+
            DIAS.map(function(d, k){
              var on = j.dias.indexOf(k) >= 0;
              return '<button type="button" id="jn_d_'+i+'_'+k+'" onclick="_janelaDia('+i+','+k+')" '+
                'style="flex:1;min-width:34px;padding:5px 0;border-radius:7px;cursor:pointer;font:700 10px system-ui;text-transform:uppercase;'+
                (on?'background:#1f5a2a;color:#eafaea;border:1px solid #2e7d3e':'background:#111b13;color:#6f8f76;border:1px solid #24332a')+'">'+d+'</button>';
            }).join('')+
          '</div>'+
          '<div style="display:flex;gap:6px;align-items:center">'+
            '<input type="time" id="jn_i_'+i+'" value="'+hhmm(j.iniMin)+'" class="delpwd-inp" style="padding:6px;font-size:12px;flex:1">'+
            '<span style="color:#6f8f76;font-size:11px">até</span>'+
            '<input type="time" id="jn_f_'+i+'" value="'+hhmm(j.fimMin)+'" class="delpwd-inp" style="padding:6px;font-size:12px;flex:1">'+
            '<button onclick="_janelaSalvar('+i+')" style="background:#1f5a2a;color:#eafaea;border:none;border-radius:7px;padding:0 12px;font-size:11px;font-weight:700;cursor:pointer;align-self:stretch">Salvar</button>'+
          '</div>'+
        '</div>';
      linha.appendChild(wrap);
    });
  };

  window._janelaToggle = function(i){
    var cx = document.getElementById('jn_on_'+i), bx = document.getElementById('jn_box_'+i);
    if(bx) bx.style.display = (cx && cx.checked) ? 'block' : 'none';
  };
  window._janelaDia = function(i, k){
    var p = (window._perfisCache||[])[i];
    if(!p) return;
    p.janela = normalizar(p.janela);
    var pos = p.janela.dias.indexOf(k);
    if(pos >= 0) p.janela.dias.splice(pos, 1); else p.janela.dias.push(k);
    var b = document.getElementById('jn_d_'+i+'_'+k);
    var on = p.janela.dias.indexOf(k) >= 0;
    if(b) b.style.cssText = b.style.cssText.replace(/background:[^;]+;color:[^;]+;border:[^;"]+/,
      on ? 'background:#1f5a2a;color:#eafaea;border:1px solid #2e7d3e'
         : 'background:#111b13;color:#6f8f76;border:1px solid #24332a');
  };
  window._janelaSalvar = function(i){
    var p = (window._perfisCache||[])[i];
    if(!p) return;
    var db = null;
    try{ if(window.firebase && window.firebase.apps && window.firebase.apps.length) db = window.firebase.firestore(); }catch(e){}
    if(!db){ if(typeof _stxToast==='function') _stxToast('Sem conexão.'); return; }
    var on   = !!(document.getElementById('jn_on_'+i)||{}).checked;
    var ini  = paraMin((document.getElementById('jn_i_'+i)||{}).value);
    var fim  = paraMin((document.getElementById('jn_f_'+i)||{}).value);
    if(on && (ini==null || fim==null)){ if(typeof _stxToast==='function') _stxToast('Preencha as duas horas.'); return; }
    if(on && fim <= ini){ if(typeof _stxToast==='function') _stxToast('A hora final precisa ser depois da inicial.'); return; }
    var dias = normalizar(p.janela).dias;
    if(on && !dias.length){ if(typeof _stxToast==='function') _stxToast('Escolha pelo menos um dia.'); return; }
    var janela = {on:on, dias:dias.slice().sort(function(a,b){return a-b;}),
                  iniMin:(ini==null?420:ini), fimMin:(fim==null?1080:fim),
                  ini:hhmm(ini==null?420:ini), fim:hhmm(fim==null?1080:fim)};
    db.doc(ROOT).collection('members').doc(String(p.email).toLowerCase()).set({
      janela: janela,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    }, {merge:true}).then(function(){
      p.janela = normalizar(janela);
      if(typeof _stxToast==='function') _stxToast(on ? ('Horário salvo — '+descrever(janela)) : 'Acesso liberado a qualquer hora');
    }).catch(function(err){
      if(typeof _stxToast==='function') _stxToast('Erro ao salvar horário: '+(err && err.message || err));
    });
  };

  window.AgractaAcesso = {
    janela: function(){ return estado.janela; },
    dentro: dentro,
    descrever: descrever,
    normalizar: normalizar,
    minutosRestantes: minutosRestantes,
    checar: checar
  };
})();
