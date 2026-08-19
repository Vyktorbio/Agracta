/* Agracta — casca de uso do mapa.
 *
 * Duas ideias, só isso:
 *
 *   1. UM ícone no topo abre uma gaveta com todas as ferramentas do mapa.
 *      Some o dock de botões flutuantes; o mapa fica limpo.
 *   2. Ligar os índices NÃO abre painel nenhum: abre direto a imagem mais
 *      recente com céu limpo e uma faixa fina de datas no rodapé. Trocar de
 *      data é um toque, na altura do polegar.
 *
 * O painel antigo (#ndviPanel) continua no DOM, vazio e invisível, porque o
 * resto do app pergunta a ele se o NDVI está ligado. Aqui ele vira um
 * interruptor: style.display 'block' = camada ativa.
 */
(function(){
  'use strict';

  var DCACHE   = 'agracta-ndvi-datas-v1';
  var IXKEY    = 'agracta-ndvi-indice';
  var CACHE_TTL= 6 * 3600 * 1000;
  var NUVEM_OK = 25;     /* % de nuvem que ainda dá uma imagem utilizável */
  var MESES    = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  var _datas = [];       /* [{date, cloud}] mais recente primeiro */
  var _warm  = false;

  function $(id){ return document.getElementById(id); }
  function svg(d, size){
    return '<svg width="'+(size||20)+'" height="'+(size||20)+'" viewBox="0 0 24 24" fill="none" '+
           'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  }

  var IC = {
    camadas:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    folha:'<path d="M4 10a7.31 7.31 0 0 0 10 10Z"/><path d="m9 15 3-3"/><path d="M17 13a6 6 0 0 0-6-6"/><path d="M21 13A10 10 0 0 0 11 3"/>',
    clima:'<path d="M12 2v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="M20 12h2"/><path d="m17.7 6.3 1.4-1.4"/><path d="M16 12a4 4 0 1 0-8 0"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
    regua:'<path d="M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/>',
    pino:'<path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    gps:'<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
    croqui:'<path d="M15 6.5 9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5Z"/><path d="M9 4v13"/><path d="M15 6.5v13"/>',
    lupa:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bussola:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5Z"/>',
    quadrado:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16"/><path d="M12 4v16"/>',
    lapis:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    ajustes:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
    x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };

  /* ====================================================================== */
  /* Interruptor de compatibilidade                                          */
  /* ====================================================================== */

  function shim(){
    var p = $('ndviPanel');
    if(!p){
      p = document.createElement('div');
      p.id = 'ndviPanel';
      p.className = 'ndvi-panel';
      p.style.display = 'none';
      document.body.appendChild(p);
    }
    return p;
  }
  function ligado(){ return shim().style.display === 'block'; }

  /* ====================================================================== */
  /* Gaveta de ferramentas                                                   */
  /* ====================================================================== */

  function linha(id, icone, titulo, sub, acao, comChave){
    return '<button class="ag-row" id="'+id+'" onclick="'+acao+'">'+
      '<span class="ag-ic">'+svg(icone)+'</span>'+
      '<span class="ag-lbl">'+titulo+(sub?'<span class="ag-sub">'+sub+'</span>':'')+'</span>'+
      (comChave?'<span class="ag-chk"></span>':'')+
    '</button>';
  }

  function montarGaveta(){
    if($('agDrawer')) return;

    var bg = document.createElement('div');
    bg.id = 'agDrawerBg';
    bg.className = 'ag-drawer-bg';
    bg.onclick = function(){ abrirGaveta(false); };
    document.body.appendChild(bg);

    var d = document.createElement('aside');
    d.id = 'agDrawer';
    d.className = 'ag-drawer';
    d.setAttribute('role','dialog');
    d.setAttribute('aria-label','Ferramentas do mapa');
    d.innerHTML =
      '<div class="ag-dw-head">'+
        '<h2>Ferramentas do mapa</h2>'+
        '<button class="ag-dw-x" onclick="agToggleDrawer(false)" aria-label="Fechar">'+svg(IC.x,20)+'</button>'+
      '</div>'+
      '<div class="ag-dw-body">'+
        '<div class="ag-sec">'+
          '<div class="ag-sec-t">Enquadrar o mapa</div>'+
          '<div class="ag-steps">'+
            '<button onclick="agZoom(1)">Aproximar +</button>'+
            '<button onclick="agZoom(-1)">Afastar −</button>'+
          '</div>'+
          linha('agRowGirar', IC.bussola, 'Girar o mapa',
                'Abre a régua de giro no rodapé', 'agRotBar(true)')+
          linha('agRowHa', IC.quadrado, 'Quadrado de 1 hectare',
                'Referência de 100 × 100 m no centro', 'agAcao(\'toggleHaRef\')')+
          linha('agRowEditar', IC.lapis, 'Editar quadras',
                'Mover vértices e redesenhar', 'agAcao(\'toggleQuadraEdit\')')+
        '</div>'+
        '<div class="ag-sec">'+
          '<div class="ag-sec-t">Satélite</div>'+
          linha('agRowNdvi', IC.folha, 'Índices de vegetação',
                'Sentinel-2 · abre na data mais recente', 'agLigarIndices()', true)+
          linha('agRowZonas', IC.camadas, 'Colorir quadras por valor',
                'Zonamento a partir do índice ativo', 'agZonas()', true)+
        '</div>'+
        '<div class="ag-sec">'+
          '<div class="ag-sec-t">Campo</div>'+
          linha('agRowNota', IC.pino, 'Registrar observação', 'Nota de campo georreferenciada', 'agAcao(\'toggleScoutingMode\')')+
          linha('agRowMedir', IC.regua, 'Medir área', 'No mapa ou caminhando com o GPS', 'agAcao(\'toggleMeasure\')')+
          linha('agRowGps', IC.gps, 'Minha localização', 'Bolinha azul no mapa · toque de novo para apagar', 'agGps()', true)+
        '</div>'+
        '<div class="ag-sec">'+
          '<div class="ag-sec-t">Consultar</div>'+
          linha('agRowClima', IC.clima, 'Clima do local', 'Estação Ecowitt · atualiza a cada 5 min', 'agAcao(\'toggleClima\')')+
          linha('agRowCroqui', IC.croqui, 'Croqui das quadras', 'Folha vetorial para o relatório', 'agAcao(\'openCroqui\')')+
        '</div>'+
      '</div>';
    document.body.appendChild(d);
  }

  function abrirGaveta(abrir){
    montarGaveta();
    var d = $('agDrawer'), bg = $('agDrawerBg'), b = $('agToolsBtn');
    var vai = (abrir === undefined) ? !d.classList.contains('on') : !!abrir;
    d.classList.toggle('on', vai);
    bg.classList.toggle('on', vai);
    if(b){ b.classList.toggle('on', vai); b.setAttribute('aria-expanded', vai?'true':'false'); }
    if(vai){ aquecerProxy(); sincronizarGaveta(); }
  }
  window.agToggleDrawer = abrirGaveta;

  function sincronizarGaveta(){
    var r = $('agRowNdvi');
    if(r) r.classList.toggle('on', ligado());
    var z = $('agRowZonas');
    if(z) z.classList.toggle('on', !!window.ndviZonas);
    var n = $('agRowNota');
    if(n) n.classList.toggle('on', !!window.scoutingModeActive);
    var g = $('agRowGps');
    if(g) g.classList.toggle('on', document.body.classList.contains('gps-manual-visible'));
    var b = $('agToolsBtn');
    if(b) b.classList.toggle('layer-on', ligado());
  }

  window.agAcao = function(nome){
    abrirGaveta(false);
    setTimeout(function(){
      try{ if(typeof window[nome] === 'function') window[nome](); }catch(e){}
      sincronizarGaveta();
    }, 180);
  };
  window.agLigarIndices = function(){
    window.toggleNdvi();
    sincronizarGaveta();
    if(ligado()) abrirGaveta(false);
  };
  /* O GPS ligava e não desligava: a bolinha azul ficava no mapa para sempre,
     porque locateMe() só sabe acender. Aqui ele é interruptor — segundo toque
     apaga o marcador, o círculo de precisão e o estado. */
  window.agGps = function(){
    var ligado = document.body.classList.contains('gps-manual-visible');
    if(ligado){
      try{ if(window._gpsMarker && window._map) window._map.removeLayer(window._gpsMarker); }catch(e){}
      try{ if(window._gpsCircle && window._map) window._map.removeLayer(window._gpsCircle); }catch(e){}
      window._gpsMarker = null; window._gpsCircle = null;
      document.body.classList.remove('gps-manual-visible');
      sincronizarGaveta();
      abrirGaveta(false);
      return;
    }
    abrirGaveta(false);
    setTimeout(function(){
      try{ if(typeof locateMe === 'function') locateMe(); }catch(e){}
      setTimeout(sincronizarGaveta, 400);
    }, 180);
  };

  window.agZonas = function(){
    try{ if(typeof ndviToggleZonas === 'function') ndviToggleZonas(); }catch(e){}
    sincronizarGaveta();
  };

  /* Botão único no topo, ao lado dos outros. */
  function montarBotao(){
    var tbr = document.querySelector('.top-bar-right');
    if(!tbr || $('agToolsBtn')) return;
    var b = document.createElement('button');
    b.id = 'agToolsBtn';
    b.className = 'btn-sm btn-tools';
    b.setAttribute('aria-label','Ferramentas do mapa');
    b.setAttribute('aria-expanded','false');
    b.innerHTML = svg(IC.camadas,18)+'<span class="tb-nav-label">Mapa</span><span class="ag-dot"></span>';
    b.onclick = function(){ abrirGaveta(); };
    tbr.insertBefore(b, tbr.firstChild);
  }

  /* ====================================================================== */
  /* Faixa de datas                                                          */
  /* ====================================================================== */

  function montarBarra(){
    if($('ndviBar')) return $('ndviBar');
    var el = document.createElement('div');
    el.id = 'ndviBar';
    el.className = 'ag-ndvibar';
    el.innerHTML =
      '<div class="nb-top">'+
        '<div class="nb-seg" id="nbSeg"></div>'+
        '<div class="nb-gap"></div>'+
        '<button class="nb-ico" id="nbProbe" onclick="agProbe()" title="Consultar o valor num ponto" aria-label="Consultar ponto">'+svg(IC.lupa,18)+'</button>'+
        '<button class="nb-ico" id="nbAdvBtn" onclick="agAvancado()" title="Ajustes" aria-label="Ajustes">'+svg(IC.ajustes,18)+'</button>'+
        '<button class="nb-ico" onclick="agDesligar()" title="Desligar os índices" aria-label="Desligar">'+svg(IC.x,18)+'</button>'+
      '</div>'+
      '<div class="nb-dates" id="nbDates"></div>'+
      '<div class="nb-status" id="ndviStatus"></div>'+
      '<div class="nb-adv" id="nbAdv">'+
        '<label class="ag-ctl"><span>Opacidade</span>'+
          '<input type="range" min="0.2" max="1" step="0.05" id="nbOpac" oninput="ndviSetOpacity(this.value)"></label>'+
        '<label class="ag-ctl" style="cursor:pointer"><span>Só nas quadras</span>'+
          '<input type="checkbox" id="nbClip" onchange="ndviSetClip(this.checked)" style="flex:none;width:auto"></label>'+
        '<div class="nb-rank" id="ndviRank"></div>'+
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  function rotulo(iso){
    var p = String(iso||'').split('-');
    if(p.length !== 3) return iso;
    return parseInt(p[2],10)+' '+MESES[parseInt(p[1],10)-1];
  }
  function corNuvem(c){
    if(c == null) return '#7f9085';
    if(c <= 12) return '#3bd27f';
    if(c <= 35) return '#efb24b';
    return '#ff7968';
  }

  function pintarSeg(){
    var s = $('nbSeg');
    if(!s) return;
    s.innerHTML = ['NDVI','NDRE','GNDVI','NDMI'].map(function(ix){
      return '<button class="'+(window.ndviIndex===ix?'on':'')+'" onclick="ndviSetIndex(\''+ix+'\')">'+ix+'</button>';
    }).join('');
  }

  function pintarDatas(){
    var box = $('nbDates');
    if(!box) return;
    if(!_datas.length){
      box.innerHTML = '<div style="font:550 11px var(--ag-font,system-ui);color:var(--gp-text-3,#7f9085);padding:8px 2px">'+
        'Sem lista de datas — os ajustes têm um campo para digitar uma.</div>';
      return;
    }
    box.innerHTML = _datas.slice(0,24).map(function(d, i){
      var sel = (d.date === window.ndviDate);
      return '<button class="nb-d'+(sel?' on':'')+(i===0?' novo':'')+'" style="--nb-c:'+corNuvem(d.cloud)+'" '+
        'onclick="ndviSetDate(\''+d.date+'\')" title="'+d.date+(d.cloud!=null?(' · '+Math.round(d.cloud)+'% de nuvem'):'')+'">'+
        '<b>'+rotulo(d.date)+'</b>'+
        '<i>'+(d.cloud!=null?(Math.round(d.cloud)+'%'):'—')+'</i>'+
      '</button>';
    }).join('');
    var on = box.querySelector('.nb-d.on');
    if(on && on.scrollIntoView) try{ on.scrollIntoView({block:'nearest', inline:'center'}); }catch(e){}
  }

  function mostrarBarra(v){
    var el = montarBarra();
    el.classList.toggle('on', !!v);
    document.body.classList.toggle('ndvibar-on', !!v);
    if(v){
      pintarSeg(); pintarDatas();
      var o = $('nbOpac'); if(o) o.value = window.ndviOpacity;
      var c = $('nbClip'); if(c) c.checked = !!window.ndviClip;
      var p = $('nbProbe'); if(p) p.classList.toggle('on', !!window.ndviProbe);
    }
  }

  window.agAvancado = function(){
    var a = $('nbAdv'), b = $('nbAdvBtn');
    if(!a) return;
    var on = !a.classList.contains('on');
    a.classList.toggle('on', on);
    if(b) b.classList.toggle('on', on);
  };
  window.agProbe = function(){
    try{ if(typeof ndviToggleProbe === 'function') ndviToggleProbe(); }catch(e){}
    var p = $('nbProbe');
    if(p) p.classList.toggle('on', !!window.ndviProbe);
  };
  window.agDesligar = function(){ window.ndviClear(); };

  /* ====================================================================== */
  /* Datas: cache, escolha automática e recuperação                          */
  /* ====================================================================== */

  function chave(bb){ return bb.map(function(v){ return Number(v).toFixed(2); }).join(','); }
  function lerCache(bb){
    try{
      var c = JSON.parse(localStorage.getItem(DCACHE) || 'null');
      if(c && c.k === chave(bb) && (Date.now() - c.ts) < CACHE_TTL && c.arr && c.arr.length) return c.arr;
    }catch(e){}
    return null;
  }
  function gravarCache(bb, arr){
    try{ localStorage.setItem(DCACHE, JSON.stringify({k:chave(bb), ts:Date.now(), arr:arr.slice(0,40)})); }catch(e){}
  }

  /* A mais recente que ainda serve para olhar. Uma imagem 90% nublada é a
     mais recente e não vale nada — era isso que obrigava a caçar data na mão. */
  function melhor(arr){
    if(!arr || !arr.length) return null;
    var i, lim = [NUVEM_OK, 45, 70];
    for(var k=0; k<lim.length; k++){
      for(i=0; i<arr.length; i++){
        if(arr[i].cloud != null && arr[i].cloud <= lim[k]) return arr[i];
      }
    }
    return arr[0];
  }
  function puladas(arr, alvo){
    var n = 0;
    for(var i=0; i<arr.length; i++){
      if(arr[i].date === alvo) return n;
      n++;
    }
    return 0;
  }

  function aquecerProxy(){
    if(_warm || typeof NDVI_PROXY === 'undefined') return;
    _warm = true;
    try{ fetch(NDVI_PROXY + '/health').catch(function(){}); }catch(e){}
  }

  function diagnosticar(){
    fetch(NDVI_PROXY + '/health').then(function(r){ return r.json(); }).then(function(h){
      if(!h || !h.hasCreds) ndviStatus('Servidor de imagens sem credencial do Copernicus.', 'err');
      else ndviStatus('O servidor respondeu, mas não achei imagem nesta área. Dê zoom-out e tente de novo.', 'err');
    }).catch(function(){
      ndviStatus('Servidor de imagens dormindo — acordando, tente de novo em ~1 min.', 'err');
    });
  }

  window.ndviLoadDates = function(){
    var seq = ++window._ndviDatesSeq;
    var bb = ndviBBox(), to = todayISO();
    var dt = new Date(); dt.setMonth(dt.getMonth() - 6);
    var from = dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');

    fetch(NDVI_PROXY + '/dates?bbox=' + bb.join(',') + '&from=' + from + '&to=' + to)
      .then(function(r){ return r.json(); })
      .then(function(arr){
        if(seq !== window._ndviDatesSeq) return;
        if(!arr || arr.error || !arr.length) throw new Error('vazio');
        arr = arr.slice().sort(function(a,b){ return String(b.date||'').localeCompare(String(a.date||'')); });
        _datas = arr;
        gravarCache(bb, arr);
        pintarDatas();
        if(window._ndviAutoLatest){
          var m = melhor(arr);
          if(m && m.date !== window.ndviDate){
            window.ndviDate = m.date;
            pintarDatas();
            ndviLoadImage();
          }
          var pulou = m ? puladas(arr, m.date) : 0;
          ndviStatus((window.ndviIndex||'NDVI') + ' · ' + rotulo(m.date) +
            (m.cloud != null ? (' · ' + Math.round(m.cloud) + '% de nuvem') : '') +
            (pulou ? (' · ' + pulou + ' data' + (pulou>1?'s':'') + ' nublada' + (pulou>1?'s':'') + ' à frente') : ''), 'ok');
        }else{
          ndviStatus(arr.length + ' datas disponíveis', 'ok');
        }
      })
      .catch(function(){
        if(seq !== window._ndviDatesSeq) return;
        if(_datas.length){ ndviStatus('Usando a lista de datas guardada no aparelho.'); pintarDatas(); return; }
        diagnosticar();
      });
  };

  window.ndviRefresh = function(){
    try{ localStorage.removeItem(DCACHE); }catch(e){}
    window._ndviAutoLatest = true;
    ndviLoadDates();
  };

  /* O /health deixou de ser porteiro: ele só é chamado quando algo falha.
     Antes eram três idas ao servidor antes da primeira imagem aparecer. */
  window.ndviCheckProxy = function(){ aquecerProxy(); };

  /* ====================================================================== */
  /* Ligar / desligar                                                        */
  /* ====================================================================== */

  window.buildNdviPanel = function(){
    shim();
    if(ligado()){ mostrarBarra(true); }
    sincronizarGaveta();
  };

  window.toggleNdvi = function(forcar){
    var p = shim();
    var quer = (forcar === undefined) ? !ligado() : !!forcar;
    if(!quer){ window.ndviClear(); return; }

    if(!window._map && typeof initMap === 'function') initMap();
    try{ ensureQGEO(); }catch(e){}
    try{
      if(window._map && !window._map.__ndviMove){
        window._map.__ndviMove = true;
        window._map.on('moveend', ndviOnMove);
      }
    }catch(e){}
    if(typeof scoutingModeActive !== 'undefined' && scoutingModeActive){
      try{ toggleScoutingMode(false); }catch(e){}
    }
    var cp = $('climaPanel'); if(cp) cp.style.display = 'none';

    if(!window.ndviIndex){
      var salvo = null;
      try{ salvo = localStorage.getItem(IXKEY); }catch(e){}
      window.ndviIndex = salvo || 'NDVI';
    }
    p.style.display = 'block';
    window._ndviAutoLatest = true;
    mostrarBarra(true);
    aquecerProxy();

    /* Abre com o que já está no aparelho — a imagem aparece antes da rede
       responder — e conserta em seguida se surgiu data melhor. */
    var bb = ndviBBox(), cache = lerCache(bb);
    if(cache){
      _datas = cache;
      pintarDatas();
      var m = melhor(cache);
      if(m){
        window.ndviDate = m.date;
        pintarDatas();
        ndviStatus('Abrindo ' + (window.ndviIndex||'NDVI') + ' de ' + rotulo(m.date) + '…');
        ndviLoadImage();
      }
    }else{
      ndviStatus('Procurando a imagem mais recente…');
    }
    ndviLoadDates();
  };

  window.ndviClear = function(){
    var p = shim();
    p.style.display = 'none';
    window.ndviMeans = null;
    window.ndviProbe = false;
    try{
      if(window.ndviOverlay && window._map){ window._map.removeLayer(window.ndviOverlay); }
    }catch(e){}
    window.ndviOverlay = null;
    try{ if(window._map) window._map.getContainer().style.cursor = ''; }catch(e){}
    try{ if(window._map && typeof onProbeClick === 'function') window._map.off('click', onProbeClick); }catch(e){}
    if(window.ndviZonas){ window.ndviZonas = false; }
    mostrarBarra(false);
    sincronizarGaveta();
    try{ if(typeof render === 'function') render(); }catch(e){}
  };

  window.ndviSetIndex = function(ix){
    window.ndviIndex = ix;
    try{ localStorage.setItem(IXKEY, ix); }catch(e){}
    pintarSeg();
    ndviStatus('Carregando ' + ix + '…');
    ndviLoadImage();
  };

  window.ndviSetDate = function(d){
    if(!d) return;
    window._ndviAutoLatest = false;
    window.ndviDate = d;
    pintarDatas();
    ndviLoadImage();
  };

  /* ====================================================================== */
  /* Encaixe                                                                 */
  /* ====================================================================== */

  function iniciar(){
    shim();
    montarBotao();
    montarGaveta();
    montarBarra();
    /* injectTopbarButtons() roda depois em alguns caminhos — garante o botão. */
    setTimeout(montarBotao, 400);
    setTimeout(montarBotao, 1500);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var d = $('agDrawer');
        if(d && d.classList.contains('on')) abrirGaveta(false);
      }
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  window.AgractaUI = {
    abrirGaveta: abrirGaveta,
    datas: function(){ return _datas.slice(); },
    melhorData: function(){ var m = melhor(_datas); return m && m.date; },
    escolherData: function(arr){ var m = melhor(arr); return m && m.date; },   /* exposto para teste */
    ligado: ligado
  };
})();

/* ==========================================================================
   Agracta — gaveta "Menu" e mapa sem chrome
   Engrenagem de controles, ☰ do menu principal e o botão "1 ha" viviam soltos
   por cima das quadras. Agora moram atrás de um único item na barra de baixo,
   que abre de lado igual ao "Mapa". Sobre a imagem sobra só o mostrador do
   clima. Rotação é o único controle que não cabe numa gaveta — quem gira
   precisa ver girando —, então ela vira uma faixa temporária no rodapé.
   ========================================================================== */
(function(){
  'use strict';

  function $(id){ return document.getElementById(id); }
  function svg(d, size){
    return '<svg width="'+(size||20)+'" height="'+(size||20)+'" viewBox="0 0 24 24" fill="none" '+
           'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';
  }
  var I = {
    menu:'<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    pin:'<path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    pinCheio:'<path d="M12 21s7-6.6 7-12a7 7 0 1 0-14 0c0 5.4 7 12 7 12Z" fill="currentColor" stroke="none"/><circle cx="12" cy="9" r="2.4" fill="#fff" stroke="none"/>',
    bussola:'<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5.5-5.5 2 2-5.5Z"/>',
    quadrado:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16"/><path d="M12 4v16"/>',
    lapis:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    baixar:'<path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/>',
    subir:'<path d="M12 21V9"/><path d="m7 12 5-5 5 5"/><path d="M5 3h14"/>',
    caixa:'<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/>',
    nuvem:'<path d="M20 17.6A4 4 0 0 0 18 10h-1.3A7 7 0 1 0 5 16.7"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/>',
    engrenagem:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
    escudo:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    sair:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    lua:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    recarregar:'<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
    celular:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };

  function existe(f){ return typeof window[f] === 'function'; }

  /* ====================================================================== */
  /* Locais: lista aberta na gaveta + escolha automática pelo GPS            */
  /* ====================================================================== */

  var _autoLocalFeito = false;   /* só tenta uma vez por sessão */
  var _autoLocalVetado = false;  /* se a pessoa desfizer, não insiste */

  function e_(t){ return (typeof esc === 'function') ? esc(t) : String(t||''); }

  /* Centro das quadras de um local. Sem quadras desenhadas, o local não entra
     na conta do GPS — palpite sem geometria é chute, não inteligência. */
  function centroLocal(id){
    try{
      var qs = quadrasDoLocal(id) || [], la = 0, lo = 0, n = 0;
      qs.forEach(function(q){
        var pts = (typeof QGEO !== 'undefined' && QGEO[q]) ? QGEO[q] : null;
        if(!pts || !pts.length){
          var pl = (typeof quadraPonto === 'function') ? quadraPonto(q) : null;
          pts = pl ? [pl] : [];
        }
        pts.forEach(function(p){ la += p[0]; lo += p[1]; n++; });
      });
      return n ? {lat: la/n, lng: lo/n, quadras: qs.length} : null;
    }catch(err){ return null; }
  }

  function km(aLat, aLng, bLat, bLng){
    var R = 6371, r = Math.PI/180;
    var dLat = (bLat-aLat)*r, dLng = (bLng-aLng)*r;
    var x = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 2*R*Math.asin(Math.min(1, Math.sqrt(x)));
  }

  /* Local mais próximo de uma coordenada, com a distância — quem decide se
     vale trocar é quem chama, porque "perto" depende do contexto. */
  window.agLocalMaisProximo = function(lat, lng){
    try{ ensureLocais(); }catch(err){ return null; }
    var melhor = null;
    Object.keys(LOCAIS || {}).forEach(function(id){
      var c = centroLocal(id);
      if(!c) return;
      var d = km(lat, lng, c.lat, c.lng);
      if(!melhor || d < melhor.km) melhor = {id: id, km: d, nome: (LOCAIS[id]||{}).nome || id};
    });
    return melhor;
  };

  function listaLocais(){
    var h = '';
    try{ ensureLocais(); }catch(err){ return '<div class="ag-local-dica">Locais indisponíveis.</div>'; }
    var ids = Object.keys(LOCAIS || {});
    if(!ids.length) return '<div class="ag-local-dica">Nenhum local cadastrado ainda.</div>';
    ids.forEach(function(id){
      var L = LOCAIS[id] || {}, n = 0;
      try{ n = (quadrasDoLocal(id) || []).length; }catch(err){}
      var ativo = (id === localAtivo);
      h += '<button class="ag-row ag-local' + (ativo ? ' on' : '') + '" onclick="agIrParaLocal(' + JSON.stringify(id).replace(/"/g,'&quot;') + ')">' +
             '<span class="ag-ic">' + svg(ativo ? I.pinCheio : I.pin) + '</span>' +
             '<span class="ag-lbl">' + e_(L.nome || id) +
               '<span class="ag-sub">' + n + ' quadra' + (n === 1 ? '' : 's') + (ativo ? ' · aqui agora' : '') + '</span>' +
             '</span>' +
           '</button>';
    });
    h += '<div class="ag-local-acoes">' +
           '<button onclick="agMenuAcao(\'abrirNovoLocal\')">+ Novo local</button>' +
           '<button onclick="agMenuAcao(\'gerenciarLocais\')">Gerenciar</button>' +
         '</div>';
    return h;
  }

  /* Ir a um local é o gesto mais comum aqui: troca e sai da frente. */
  window.agIrParaLocal = function(id){
    agMenu(false);
    setTimeout(function(){
      try{ if(existe('setLocalAtivo')) window.setLocalAtivo(id); }catch(err){}
    }, 160);
  };

  /* ---- O GPS decide, mas nunca sem avisar e nunca sem volta ---- */
  function avisoLocal(msg, rotulo, acao){
    var el = $('agLocalAviso');
    if(!el){
      el = document.createElement('div');
      el.id = 'agLocalAviso';
      el.className = 'ag-aviso';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span>' + msg + '</span>' +
      (acao ? '<button id="agAvisoBtn">' + rotulo + '</button>' : '');
    el.classList.add('on');
    if(acao){
      var b = $('agAvisoBtn');
      if(b) b.onclick = function(){ acao(); el.classList.remove('on'); };
    }
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.classList.remove('on'); }, 9000);
  }

  window.agAutoLocal = function(forcado){
    if(_autoLocalFeito && !forcado) return;
    if(_autoLocalVetado && !forcado) return;
    _autoLocalFeito = true;
    if(!existe('gpsBest')) return;
    try{ ensureLocais(); }catch(err){ return; }
    if(Object.keys(LOCAIS || {}).length < 2) return;   /* com um local só não há o que decidir */
    /* não interrompe quem está desenhando ou lançando */
    if(typeof editMode !== 'undefined' && editMode) return;

    window.gpsBest({target: 1, maxWait: 12000, maxAcc: 200}, null, function(b){
      if(!b) return;
      var perto = window.agLocalMaisProximo(b.lat, b.lng);
      if(!perto) return;
      /* 25 km é o raio de "estou nesta fazenda". Além disso a pessoa está no
         escritório ou na estrada, e trocar o local seria palpite. */
      if(perto.km > 25) return;
      if(perto.id === localAtivo) return;
      var anterior = localAtivo, nomeAnterior = ((LOCAIS[anterior] || {}).nome) || anterior;
      try{ if(existe('setLocalAtivo')) window.setLocalAtivo(perto.id); }catch(err){ return; }
      avisoLocal('Você está em <b>' + e_(perto.nome) + '</b> — local trocado.', 'Voltar para ' + e_(nomeAnterior), function(){
        _autoLocalVetado = true;
        try{ window.setLocalAtivo(anterior); }catch(err){}
      });
    });
  };

  function chamar(f, arg){
    agMenu(false);
    setTimeout(function(){ try{ if(existe(f)) window[f](arg); }catch(e){} }, 180);
  }
  window.agMenuAcao = chamar;

  function linha(icone, titulo, sub, acao){
    return '<button class="ag-row" onclick="'+acao+'">'+
      '<span class="ag-ic">'+svg(icone)+'</span>'+
      '<span class="ag-lbl">'+titulo+(sub?'<span class="ag-sub">'+sub+'</span>':'')+'</span>'+
    '</button>';
  }

  /* O administrador só existe depois do login, então o corpo é remontado a
     cada abertura em vez de uma vez só na carga. */
  function corpo(){
    var adm = false;
    try{ adm = existe('isAdmin') && window.isAdmin(); }catch(e){}
    var instalar = true;
    try{ instalar = existe('isStandalone') ? !window.isStandalone() : true; }catch(e){}
    var escuro = document.documentElement.classList.contains('light');

    return '<div class="ag-sec">'+
        '<div class="ag-sec-t">Locais</div>'+
        listaLocais()+
      '</div>'+
      '<div class="ag-sec">'+
        '<div class="ag-sec-t">Dados</div>'+
        linha(I.baixar, 'Backup em arquivo', 'Baixa tudo para o aparelho', 'agMenuAcao(\'exportData\')')+
        linha(I.subir, 'Importar arquivo', 'Restaura de um backup .json', 'agImportar()')+
        linha(I.caixa, 'Backups (restaurar)', 'Pontos de restauração guardados', 'agMenuAcao(\'openBackups\')')+
        linha(I.nuvem, 'Histórico da nuvem', 'Versões sincronizadas', 'agMenuAcao(\'openCloudHistory\')')+
        linha(I.recarregar, 'Recuperação de avaliações', 'Resgata lançamentos perdidos', 'agMenuAcao(\'openAvalRecovery\')')+
      '</div>'+
      '<div class="ag-sec">'+
        '<div class="ag-sec-t">Este aparelho</div>'+
        linha(I.lua, escuro?'Tema escuro':'Tema claro', 'Alterna o visual', 'agMenuAcao(\'toggleTheme\')')+
        linha(I.lapis, 'Meu nome e assinatura', 'Como você assina na trilha BPL', 'agMenuAcao(\'definirMeuNome\')')+
        linha(I.recarregar, 'Buscar versão nova', 'Força a atualização do app', 'agMenuAcao(\'forcarAtualizacao\')')+
        (instalar ? linha(I.celular, 'Instalar o app', 'Fica como aplicativo na tela inicial', 'agMenuAcao(\'installApp\')') : '')+
      '</div>'+
      (adm ? '<div class="ag-sec">'+
        '<div class="ag-sec-t">Administração</div>'+
        linha(I.engrenagem, 'Painel Admin', 'Técnicos, horários e acessos', 'agMenuAcao(\'openAdminPanel\')')+
        linha(I.escudo, 'Conformidade &amp; ISMS', 'Registro de segurança da informação', 'agMenuAcao(\'openComplianceISMS\')')+
      '</div>' : '')+
      '<div class="ag-sec">'+
        linha(I.sair, 'Sair da conta', '', 'agMenuAcao(\'doLogout\')')+
      '</div>';
  }

  function montarGaveta(){
    if($('agMenuDrawer')) return;
    var bg = document.createElement('div');
    bg.id = 'agMenuBg'; bg.className = 'ag-drawer-bg';
    bg.onclick = function(){ agMenu(false); };
    document.body.appendChild(bg);

    var d = document.createElement('aside');
    d.id = 'agMenuDrawer'; d.className = 'ag-drawer';
    d.setAttribute('role','dialog'); d.setAttribute('aria-label','Menu');
    d.innerHTML =
      '<div class="ag-dw-head"><h2>Menu</h2>'+
        '<button class="ag-dw-x" onclick="agMenu(false)" aria-label="Fechar">'+svg(I.x,20)+'</button></div>'+
      '<div class="ag-dw-body" id="agMenuBody"></div>';
    document.body.appendChild(d);
  }

  function agMenu(abrir){
    montarGaveta();
    var d = $('agMenuDrawer'), bg = $('agMenuBg'), b = $('agMenuBtn');
    var vai = (abrir === undefined) ? !d.classList.contains('on') : !!abrir;
    if(vai){
      $('agMenuBody').innerHTML = corpo();
      /* a gaveta do mapa e a do menu não convivem */
      try{ if(window.agToggleDrawer) window.agToggleDrawer(false); }catch(e){}
    }
    d.classList.toggle('on', vai);
    bg.classList.toggle('on', vai);
    if(b){ b.classList.toggle('on', vai); b.setAttribute('aria-expanded', vai?'true':'false'); }
  }
  window.agMenu = agMenu;

  window.agImportar = function(){
    agMenu(false);
    setTimeout(function(){ var i = $('imp'); if(i) i.click(); }, 180);
  };
  window.agZoom = function(d){
    try{ if(window._map) window._map.setZoom((window._map.getZoom()||0) + d); }catch(e){}
  };

  /* ---- régua de giro ---- */
  function montarRot(){
    if($('agRotBar')) return $('agRotBar');
    var el = document.createElement('div');
    el.id = 'agRotBar'; el.className = 'ag-rotbar';
    el.innerHTML =
      '<button onclick="agRotSet(0)">Norte</button>'+
      '<input type="range" id="agRotRange" min="0" max="359" step="1" value="0" oninput="agRotSet(this.value)">'+
      '<span class="rb-v" id="agRotVal">0°</span>'+
      '<button class="ok" onclick="agRotBar(false)">Pronto</button>';
    document.body.appendChild(el);
    return el;
  }
  window.agRotSet = function(v){
    v = ((Math.round(Number(v)||0) % 360) + 360) % 360;
    try{ if(window._map && window._map.setBearing) window._map.setBearing(v); }catch(e){}
    var r = $('agRotRange'); if(r && Number(r.value) !== v) r.value = v;
    var s = $('agRotVal'); if(s) s.textContent = v + '°';
  };
  window.agRotBar = function(abrir){
    var el = montarRot();
    var vai = (abrir === undefined) ? !el.classList.contains('on') : !!abrir;
    if(vai){
      agMenu(false);
      /* a régua mora no rodapé: qualquer gaveta aberta esconde o mapa que ela gira */
      try{ if(window.agToggleDrawer) window.agToggleDrawer(false); }catch(e){}
      var b = 0;
      try{ b = ((Math.round(window._map && window._map.getBearing && window._map.getBearing() || 0) % 360) + 360) % 360; }catch(e){}
      var r = $('agRotRange'); if(r) r.value = b;
      var s = $('agRotVal'); if(s) s.textContent = b + '°';
    }
    el.classList.toggle('on', vai);
  };

  /* ---- botão na barra de baixo ---- */
  function montarBotao(){
    var tbr = document.querySelector('.top-bar-right');
    if(!tbr || $('agMenuBtn')) return;
    var b = document.createElement('button');
    b.id = 'agMenuBtn';
    b.className = 'btn-sm btn-menu';
    b.setAttribute('aria-label','Menu');
    b.setAttribute('aria-expanded','false');
    b.innerHTML = svg(I.menu,18)+'<span class="tb-nav-label">Menu</span>';
    b.onclick = function(){ agMenu(); };
    tbr.appendChild(b);
  }

  function iniciar(){
    montarBotao(); montarGaveta(); montarRot();
    setTimeout(montarBotao, 400);
    setTimeout(montarBotao, 1500);
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        var d = $('agMenuDrawer');
        if(d && d.classList.contains('on')) agMenu(false);
      }
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();

  /* A troca automática espera o app estar de pé e visível: antes disso não há
     mapa medido nem quadras carregadas, e trocar de local seria no escuro. */
  function tentarAutoLocal(){
    if(document.documentElement.classList.contains('pre-auth')) return false;
    if(!window._map) return false;
    try{ if(!window.LOCAIS) ensureLocais(); }catch(e){ return false; }
    window.agAutoLocal();
    return true;
  }
  var _tentativas = 0;
  var _timerAuto = setInterval(function(){
    if(++_tentativas > 20 || tentarAutoLocal()) clearInterval(_timerAuto);
  }, 1500);
})();
