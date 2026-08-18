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
          linha('agRowGps', IC.gps, 'Minha localização', 'Centraliza o mapa no GPS', 'agAcao(\'locateMe\')')+
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
