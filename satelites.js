/* Landsat, SMAP e FIRMS no mapa existente. Todos usam o proxy e o login Agracta. */
(function(){
  'use strict';
  var C = window.SatelitesCore;
  if(!C) return;
  var titles = {landsat:'Landsat · temperatura', smap:'SMAP · umidade do solo', firms:'NASA FIRMS · focos de calor'};
  var smapNames = {superficie:'SMAP_L4_Analyzed_Surface_Soil_Moisture', raizes:'SMAP_L4_Analyzed_Root_Zone_Soil_Moisture'};
  var states = {};
  Object.keys(titles).forEach(function(id){
    states[id] = {id:id, active:false, seq:0, layer:null, url:null, controller:null, loading:false,
      opacity:0.75, choice:'', smapType:'superficie', hours:'24', catalog:null, display:null,
      bb:null, status:'Camada desligada.', error:false};
  });
  var selected = 'landsat', panel, boundMap, moveTimer, probe = false, pointController, pointSeq = 0, probeCursor = '';
  function $(id){ return document.getElementById(id); }
  function sync(){ if(typeof window.agSincronizarGaveta === 'function') window.agSincronizarGaveta(); }
  function removeLayer(s){
    if(s.layer && boundMap) boundMap.removeLayer(s.layer);
    s.layer = null;
    if(s.url) URL.revokeObjectURL(s.url);
    s.url = null; s.display = null;
  }
  function cancel(s){
    s.seq++;
    if(s.controller) s.controller.abort();
    s.controller = null;
  }
  function stopProbe(){
    var wasProbe = probe;
    probe = false; pointSeq++;
    if(pointController) pointController.abort();
    pointController = null;
    if(wasProbe && boundMap && boundMap.getContainer().style.cursor === 'crosshair') boundMap.getContainer().style.cursor = probeCursor;
  }
  function stop(s){
    cancel(s); removeLayer(s); s.active = false; s.loading = false;
    s.status = 'Camada desligada.'; s.error = false;
    if(s.id === 'landsat') stopProbe();
    render(); sync();
  }
  window.agSateliteAtivo = function(id){ return !!(states[id] && states[id].active); };
  window.agSatelitesLimparRaster = function(){
    stop(states.landsat); stop(states.smap);
    if(panel && selected !== 'firms') panel.hidden = true;
  };
  window.agSatelitesDesligarTodos = function(){ Object.keys(states).forEach(function(id){ stop(states[id]); }); };

  function ensureMap(){
    if(!window._map && typeof window.initMap === 'function') window.initMap();
    if(!window._map || !window.LF) throw new Error('Abra o mapa para consultar os satélites.');
    if(boundMap !== window._map){
      if(boundMap){ boundMap.off('moveend', onMove); boundMap.off('click', onPoint); }
      boundMap = window._map;
      if(boundMap.getPane){
        [['agSatRasterPane',350],['agSatFirePane',470]].forEach(function(p){
          if(!boundMap.getPane(p[0])){
            var pane = boundMap.createPane(p[0], boundMap.getPane('rotatePane') || undefined); pane.style.zIndex = p[1];
            if(p[0] === 'agSatRasterPane') pane.style.pointerEvents = 'none';
          }
        });
      }
      boundMap.on('moveend', onMove); boundMap.on('click', onPoint);
    }
    return boundMap;
  }
  window.agSateliteAbrir = function(id){
    if(!states[id]) return;
    selected = id; ensurePanel(); panel.hidden = false;
    if(typeof window.agToggleDrawer === 'function') window.agToggleDrawer(false);
    if(!states[id].active) activate(states[id]);
    else render();
    var close = $('agSatClose'); if(close) close.focus();
  };
  function activate(s){
    try{ ensureMap(); }
    catch(e){ s.status = e.message; s.error = true; render(); return; }
    if(s.id !== 'firms'){
      stop(states[s.id === 'landsat' ? 'smap' : 'landsat']);
      var ndvi = $('ndviPanel');
      if(ndvi && ndvi.style.display === 'block' && typeof window.ndviClear === 'function') window.ndviClear();
    }
    s.active = true;
    reload(s, true); sync();
  }
  async function request(path, params, signal, isImage){
    var url = window.NDVI_PROXY + '/satelites/' + path + '?' + new URLSearchParams(params).toString();
    var response = await window.proxyFetch(url, {signal:signal, cache:'no-store'});
    if(!response.ok){
      var error = await response.json().catch(function(){ return {}; });
      if(response.status === 404 && /rota desconhecida/i.test(error.error || ''))
        throw new Error('Atualize o servidor de mapas para ativar estas camadas de satélite.');
      throw new Error(error.error || 'O serviço de satélite não respondeu. Tente novamente.');
    }
    if(isImage){
      if(!/image\/png/i.test(response.headers.get('Content-Type') || '')) throw new Error('O serviço não devolveu uma imagem válida.');
      return response.blob();
    }
    return response.json();
  }
  function decodeImage(blob, signal){
    return new Promise(function(resolve, reject){
      var url = URL.createObjectURL(blob), img = new Image();
      function clean(){ signal.removeEventListener('abort', abort); img.onload = img.onerror = null; }
      function abort(){ clean(); img.src = ''; URL.revokeObjectURL(url); reject(new DOMException('Cancelado','AbortError')); }
      if(signal.aborted){ abort(); return; }
      signal.addEventListener('abort', abort, {once:true});
      img.onload = function(){ clean(); resolve(url); };
      img.onerror = function(){ clean(); URL.revokeObjectURL(url); reject(new Error('Não foi possível ler a imagem do satélite.')); };
      img.src = url;
    });
  }
  async function reload(s, catalog){
    cancel(s); removeLayer(s);
    if(s.id === 'landsat') stopProbe();
    var seq = s.seq, ctl = new AbortController(); s.controller = ctl;
    var timer = setTimeout(function(){ ctl.abort(); }, 65000);
    s.loading = true; s.error = false; s.status = 'Consultando '+titles[s.id]+'…'; render();
    function current(){ return s.active && s.seq === seq && !ctl.signal.aborted; }
    try{
      var map = ensureMap();
      var bb = C.bbox(map.getBounds(), map.getCenter(), s.id); s.bb = bb;
      var params = {bbox:bb.join(',')}, display, blob;
      if(s.id === 'landsat'){
        if(catalog || !s.catalog){
          var dates = await request('landsat/datas', params, ctl.signal);
          if(!current()) return;
          if(!Array.isArray(dates.scenes)) throw new Error('O catálogo Landsat não devolveu datas válidas.');
          s.catalog = dates;
        }
        var scene = s.catalog.scenes.find(function(v){ return v.id === s.choice; }) || C.bestScene(s.catalog.scenes);
        if(!scene){ s.choice = ''; throw new Error('Nenhuma cena Landsat com temperatura nesta área nos últimos 90 dias.'); }
        s.choice = scene.id; render();
        display = {scene:scene, source:s.catalog.source};
        blob = await request('landsat/imagem', {bbox:params.bbox, item:scene.id, width:768}, ctl.signal, true);
      }else if(s.id === 'smap'){
        if(catalog || !s.catalog){
          var available = await request('smap/datas', {}, ctl.signal);
          if(!current()) return;
          if(!available.layers) throw new Error('O catálogo SMAP não devolveu datas válidas.');
          s.catalog = available;
        }
        var info = s.catalog.layers[smapNames[s.smapType]];
        if(!info || !Array.isArray(info.dates) || !info.dates.length) throw new Error('O SMAP está sem datas disponíveis.');
        if(info.dates.indexOf(s.choice) === -1) s.choice = info.latest;
        render(); display = {date:s.choice, type:s.smapType, source:s.catalog.source};
        blob = await request('smap/imagem', {bbox:params.bbox, camada:s.smapType, date:s.choice, width:768}, ctl.signal, true);
      }else{
        var fires = await request('firms', {bbox:params.bbox, horas:s.hours}, ctl.signal);
        if(!current()) return;
        if(!fires.meta || !Array.isArray(fires.features)) throw new Error('O FIRMS não devolveu dados válidos.');
        s.layer = window.LF.geoJSON(fires, {
          pointToLayer:function(feature, latlng){
            var colors = {low:'#e6b53a', nominal:'#f58232', high:'#e53f35'};
            return window.LF.circleMarker(latlng, {radius:5, color:'#fff', weight:1, fillOpacity:0.9, pane:'agSatFirePane',
              fillColor:colors[feature.properties.confidence] || '#f58232', bubblingMouseEvents:false});
          },
          onEachFeature:function(feature, layer){
            var p = feature.properties, cf = {low:'Baixa', nominal:'Nominal', high:'Alta'};
            layer.bindPopup('<div class="ag-sat-fire-popup"><b>Foco de calor · VIIRS NOAA-20</b>'+C.escape(C.timeLabel(p.datetime))+
              '<br>Confiança: '+C.escape(cf[p.confidence] || p.confidence)+'<br>Potência radiativa: '+C.escape(p.frpMW)+' MW'+
              '<br>Pixel nominal: 375 m<br>Uma detecção não delimita a área queimada.</div>');
          }
        }).addTo(map);
        s.display = {meta:fires.meta};
        s.status = fires.meta.count ? fires.features.length+' detecção(ões) nesta área.' : 'Nenhuma detecção no arquivo consultado para esta área e período.';
      }
      if(blob){
        if(!current()) return;
        var url = await decodeImage(blob, ctl.signal);
        if(!current()){ URL.revokeObjectURL(url); return; }
        s.url = url;
        s.layer = window.LF.imageOverlay(url, C.bounds(bb), {opacity:s.opacity, interactive:false, pane:'agSatRasterPane',
          className:s.id === 'smap' ? 'ag-sat-smap' : 'ag-sat-landsat'}).addTo(map);
        s.display = display;
        s.status = 'Imagem de '+C.dateLabel(s.id === 'landsat' ? display.scene.date : display.date)+' carregada.';
      }
    }catch(e){
      if(s.active && s.seq === seq){
        removeLayer(s); s.error = true;
        s.status = e.name === 'AbortError' ? 'A consulta demorou demais. Toque em Atualizar para tentar novamente.' : e.message;
      }
    }finally{
      clearTimeout(timer);
      if(s.seq === seq){
        if(s.active && ctl.signal.aborted && !s.error){
          removeLayer(s); s.error = true; s.status = 'A consulta demorou demais. Toque em Atualizar para tentar novamente.';
        }
        s.controller = null; s.loading = false; render(); sync();
      }
    }
  }
  function onMove(){
    clearTimeout(moveTimer);
    Object.keys(states).forEach(function(id){
      var s = states[id];
      if(s.active){ cancel(s); s.status = 'Atualizando a área do mapa…'; s.loading = true; }
    });
    stopProbe(); render();
    moveTimer = setTimeout(function(){
      Object.keys(states).forEach(function(id){ if(states[id].active) reload(states[id], id === 'landsat'); });
    }, 700);
  }
  async function onPoint(e){
    var s = states.landsat;
    if(!probe || !s.active || !s.display || !e.latlng) return;
    var displayed = s.display, generation = s.seq, point = e.latlng;
    stopProbe(); var seq = pointSeq, ctl = new AbortController(); pointController = ctl;
    var timer = setTimeout(function(){ ctl.abort(); }, 50000);
    s.status = 'Consultando a temperatura neste ponto…'; render();
    try{
      var data = await request('landsat/ponto', {item:displayed.scene.id, lat:point.lat, lng:point.lng}, ctl.signal);
      if(pointSeq !== seq || !s.active || s.seq !== generation || ctl.signal.aborted) return;
      var text = data.temperatureC == null ? C.escape(data.reason || 'Sem leitura válida.') :
        '<b>'+Number(data.temperatureC).toLocaleString('pt-BR',{maximumFractionDigits:1})+' °C</b>Temperatura da superfície';
      window.LF.popup().setLatLng(point).setContent('<div class="ag-sat-fire-popup">'+text+'<br>'+C.escape(C.timeLabel(data.datetime))+
        '<br>Landsat · térmico 100 m; grade 30 m</div>').openOn(boundMap);
      s.status = 'Consulta do ponto concluída.';
    }catch(error){
      if(pointSeq === seq && s.active && s.seq === generation){ s.status = error.name === 'AbortError' ? 'Consulta do ponto demorou demais. Tente novamente.' : error.message; s.error = true; }
    }finally{
      clearTimeout(timer);
      if(pointSeq === seq){ pointController = null; render(); }
    }
  }
  function ensurePanel(){
    if(panel) return;
    panel = document.createElement('aside'); panel.id = 'agSatPanel'; panel.className = 'ag-sat-panel';
    panel.setAttribute('aria-label','Camadas de satélite'); panel.hidden = true;
    panel.addEventListener('click', function(e){
      var button = e.target.closest('button[data-action]'); if(!button) return;
      var action = button.dataset.action, s = states[selected];
      if(action === 'close'){ panel.hidden = true; var tools = $('agToolsBtn'); if(tools) tools.focus(); }
      if(action === 'select') window.agSateliteAbrir(button.dataset.id);
      if(action === 'stop') stop(s);
      if(action === 'refresh'){ if(s.active) reload(s, true); else activate(s); }
      if(action === 'bounds' && s.bb && boundMap) boundMap.fitBounds(C.bounds(s.bb));
      if(action === 'probe' && s.display){
        stopProbe(); probe = true; probeCursor = boundMap.getContainer().style.cursor;
        boundMap.getContainer().style.cursor = 'crosshair'; s.status = 'Toque no mapa para consultar a temperatura.'; s.error = false; render();
      }
    });
    panel.addEventListener('change', function(e){
      var s = states[selected];
      if(e.target.id === 'agSatChoice') s.choice = e.target.value;
      else if(e.target.id === 'agSatSmapType'){ s.smapType = e.target.value; s.choice = ''; }
      else if(e.target.id === 'agSatHours') s.hours = e.target.value;
      else return;
      if(s.active) reload(s, false); else render();
    });
    panel.addEventListener('input', function(e){
      if(e.target.id !== 'agSatOpacity') return;
      var s = states[selected]; s.opacity = Number(e.target.value)/100;
      if(s.layer && typeof s.layer.setOpacity === 'function') s.layer.setOpacity(s.opacity);
      $('agSatOpacityValue').textContent = e.target.value+'%';
    });
    panel.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ panel.hidden = true; var tools = $('agToolsBtn'); if(tools) tools.focus(); } });
    document.body.appendChild(panel);
  }
  function option(value, title, choice){ return '<option value="'+C.escape(value)+'"'+(value === choice ? ' selected' : '')+'>'+C.escape(title)+'</option>'; }
  function render(){
    if(!panel) return;
    var s = states[selected], focused = panel.contains(document.activeElement) ? document.activeElement.id : '', controls = '', meta = '', legend = '';
    if(selected === 'landsat'){
      var scenes = s.catalog ? s.catalog.scenes : [];
      controls = '<label for="agSatChoice">Cena dos últimos 90 dias · nuvens na cena inteira</label><select id="agSatChoice"'+(!scenes.length?' disabled':'')+'>'+
        (scenes.length ? scenes.map(function(scene){return option(scene.id,C.dateLabel(scene.date)+' · '+scene.platform+' · '+Math.round(scene.cloud)+'% · '+scene.pathRow,s.choice);}).join('') : '<option>Sem cenas disponíveis</option>')+'</select>';
      legend = '<div class="ag-sat-colors" aria-hidden="true">'+['#313695','#74add1','#abd9e9','#fee090','#f46d43','#a50026'].map(function(color){ return '<span style="background:'+color+'"></span>'; }).join('')+
        '</div><div class="ag-sat-scale"><span>≤ 0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>≥ 60 °C</span></div>';
      if(s.display) meta = C.escape(s.display.source)+'<br>'+C.escape(C.timeLabel(s.display.scene.datetime))+' · '+Math.round(s.display.scene.cloud)+'% de nuvens na cena';
      if(s.catalog && s.catalog.truncated) meta += '<br>Catálogo limitado às primeiras 100 cenas. Aproxime o mapa para refinar.';
    }else if(selected === 'smap'){
      var info = s.catalog && s.catalog.layers[smapNames[s.smapType]], dates = info ? info.dates : [];
      controls = '<label for="agSatSmapType">Profundidade</label><select id="agSatSmapType">'+option('superficie','Superficial · 0–5 cm',s.smapType)+option('raizes','Zona radicular · 0–100 cm',s.smapType)+'</select>'+
        '<label for="agSatChoice">Data disponível · análise às 12h UTC</label><select id="agSatChoice"'+(!dates.length?' disabled':'')+'>'+
        (dates.length ? dates.map(function(day){return option(day,C.dateLabel(day),s.choice);}).join('') : '<option>Aguardando catálogo NASA</option>')+'</select>';
      if(s.catalog) legend = 'Umidade volumétrica (m³/m³)<img src="https://gibs.earthdata.nasa.gov/legends/SMAP_Analyzed_Soil_Moisture_H.svg" alt="Legenda oficial NASA da umidade do solo SMAP">';
      if(s.display) meta = C.escape(s.display.source)+'<br>'+C.dateLabel(s.display.date)+' · grade regional de 9 km · '+(s.display.type === 'superficie' ? '0–5 cm' : '0–100 cm');
    }else{
      controls = '<label for="agSatHours">Período das detecções · UTC</label><select id="agSatHours">'+option('24','Últimas 24 horas',s.hours)+option('48','Últimas 48 horas',s.hours)+option('168','Últimos 7 dias',s.hours)+'</select>';
      legend = '<span style="color:#e6b53a">●</span> Baixa · <span style="color:#f58232">●</span> Nominal · <span style="color:#e53f35">●</span> Alta confiança';
      if(s.display){
        var m = s.display.meta;
        meta = C.escape(m.source)+'<br>Arquivo consultado: '+C.escape(C.timeLabel(m.fetchedAt))+'<br>Última detecção no arquivo: '+C.escape(m.latestSourceDetection ? C.timeLabel(m.latestSourceDetection) : 'não informada');
        if(m.sourceLagHours != null && m.sourceLagHours > 6) meta += '<br>O arquivo está '+C.escape(m.sourceLagHours)+' h atrás da consulta; pode faltar cobertura recente.';
        if(m.truncated) meta += '<br>Exibindo os 2.000 focos mais recentes de '+C.escape(m.count)+'. Aproxime o mapa para refinar.';
      }
    }
    var descriptions = {
      landsat:'Temperatura da superfície, em °C. Sensor térmico de 100 m, distribuído em grade de 30 m. Nuvens e pixels sem leitura ficam transparentes.',
      smap:'Produto L4 com observações assimiladas em modelo. Resolução de 9 km: leitura regional, sem detalhe por quadra.',
      firms:'Detecções VIIRS NOAA-20, com pixel nominal de 375 m. Um foco de calor não delimita a área queimada; ausência de focos não confirma ausência de fogo.'
    };
    var sourceUrls = {landsat:'https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2',smap:'https://worldview.earthdata.nasa.gov/',firms:'https://firms.modaps.eosdis.nasa.gov/map/'};
    panel.innerHTML = '<div class="ag-sat-head"><h2>'+titles[selected]+'</h2><button class="ag-sat-close" id="agSatClose" data-action="close" aria-label="Fechar controles">×</button></div>'+
      '<div class="ag-sat-tabs" role="group" aria-label="Controles de satélite">'+Object.keys(titles).map(function(id){return '<button data-action="select" data-id="'+id+'" aria-pressed="'+(id === selected)+'">'+(id === 'firms'?'NASA FIRMS':id === 'smap'?'SMAP':'Landsat')+(states[id].active?' ●':'')+'</button>';}).join('')+'</div>'+
      '<div class="ag-sat-desc">'+descriptions[selected]+'</div>'+controls+
      (selected !== 'firms' ? '<label for="agSatOpacity">Opacidade</label><div class="ag-sat-opacity"><input id="agSatOpacity" type="range" min="10" max="100" value="'+Math.round(s.opacity*100)+'"><output id="agSatOpacityValue">'+Math.round(s.opacity*100)+'%</output></div>' : '')+
      '<p class="ag-sat-status'+(s.error?' error':'')+'" role="status" aria-live="polite">'+C.escape(s.status)+'</p>'+
      (meta ? '<div class="ag-sat-meta">'+meta+'</div>' : '')+'<div class="ag-sat-legend">'+legend+'</div>'+
      '<div class="ag-sat-actions"><button data-action="refresh">'+(s.active?'Atualizar':'Ligar camada')+'</button><button data-action="stop"'+(!s.active?' disabled':'')+'>Desligar</button></div>'+
      '<div class="ag-sat-actions"><button data-action="bounds"'+(!s.bb?' disabled':'')+'>Enquadrar dados</button>'+
      (selected === 'landsat' ? '<button data-action="probe"'+(!s.display?' disabled':'')+'>Consultar ponto</button>' : '')+'</div>'+
      '<p class="ag-sat-note">Dados da região central do mapa. A camada acompanha o mapa ao mover ou mudar o zoom. <a href="'+sourceUrls[selected]+'" target="_blank" rel="noopener noreferrer">Abrir fonte</a></p>';
    if(focused && $(focused)) $(focused).focus();
  }
})();
