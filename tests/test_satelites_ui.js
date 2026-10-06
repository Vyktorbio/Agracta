/* Menu real e requisições fora de ordem: nenhum overlay de seleção antiga volta. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {JSDOM} = require('jsdom');
const C = require('../vendor/satelites-core');
const root = path.join(__dirname,'..');
const wait = ms => new Promise(resolve => setTimeout(resolve,ms));
const flush = async () => { await wait(0); await wait(0); };
function deferred(){ let resolve; const promise = new Promise(r=>{resolve=r;}); return {promise,resolve}; }
const sceneA = {id:'LC09_L2SP_220076_20261001_02_T1',date:'2026-10-01',datetime:'2026-10-01T13:10:00Z',cloud:90,platform:'Landsat 9',pathRow:'220076'};
const sceneB = {id:'LC09_L2SP_220076_20260925_02_T1',date:'2026-09-25',datetime:'2026-09-25T13:10:00Z',cloud:10,platform:'Landsat 9',pathRow:'220076'};
const catalogs = {landsat:{scenes:[sceneA,sceneB],source:'USGS · teste'},smap:{source:'NASA GIBS · 12h UTC',layers:{
  SMAP_L4_Analyzed_Surface_Soil_Moisture:{dates:['2026-10-02','2026-10-01'],latest:'2026-10-02'},
  SMAP_L4_Analyzed_Root_Zone_Soil_Moisture:{dates:['2026-10-01'],latest:'2026-10-01'}
}}};

async function menuAndLayers(){
  const dom = new JSDOM('<body><div class="topbar"></div><div id="ndviPanel" style="display:none"></div><div id="map"></div></body>',
    {url:'https://www.agracta.com.br/',runScripts:'outside-only'});
  const w = dom.window, requests = [], layers = [], revoked = [], errors = [], popups = [], panes = {}, events = {};
  panes.rotatePane={style:{},name:'rotatePane'};
  w.addEventListener('error', e=>errors.push(e.error || e.message));
  let center = {lat:-22.58,lng:-47.52}, bounds = [-47.53,-22.59,-47.51,-22.57], serial = 0;
  w._map = {
    getBounds:()=>({getWest:()=>bounds[0],getSouth:()=>bounds[1],getEast:()=>bounds[2],getNorth:()=>bounds[3]}),
    getCenter:()=>center,getContainer:()=>w.document.getElementById('map'),
    on:(name,fn)=>{events[name]=fn;},off:name=>{delete events[name];},
    removeLayer:layer=>{const i=layers.indexOf(layer);if(i>=0)layers.splice(i,1);},
    getPane:name=>panes[name],createPane:(name,parent)=>(panes[name]={style:{},parent:parent}),
    fitBounds:()=>{}
  };
  function layer(kind,options){return {kind,options,opacity:options && options.opacity,
    addTo(){layers.push(this);return this;},setOpacity(value){this.opacity=value;},bindPopup(html){this.popup=html;return this;}};}
  w.L = {map:'O app reutiliza L para rótulos'};
  w.LF = {
    imageOverlay:(url,bb,options)=>Object.assign(layer('raster',options),{url,bb}),
    circleMarker:(ll,options)=>layer('point',options),
    geoJSON:(json,options)=>{
      const l=layer('firms'); l.features=json.features;
      l.points=json.features.map(f=>{const p=options.pointToLayer(f,{}); options.onEachFeature(f,p);return p;}); return l;
    },
    popup:()=>({setLatLng(){return this;},setContent(html){this.html=html;return this;},openOn(){popups.push(this);return this;}})
  };
  w.URL.createObjectURL=()=> 'blob:test-'+(++serial); w.URL.revokeObjectURL=url=>revoked.push(url);
  w.Image = class {set src(value){if(value) w.setTimeout(()=>{if(this.onload)this.onload();},0);}};
  w.NDVI_PROXY = 'https://proxy.test'; w.ndviIndex='NDVI'; w._ndviDatesSeq=0; w._ndviImageSeq=0;
  w.ndviBBox = ()=>bounds; w.todayISO = ()=>'2026-10-06'; w.render = ()=>{}; w.ndviStatus = ()=>{};
  w.proxyFetch = (url,opts)=>{const d=deferred();requests.push({url,opts,d,done:false});return d.promise;};
  w.fetch = url=>{assert.ok(url.endsWith('/health'),'Apenas health pode usar fetch direto');return Promise.resolve({json:()=>Promise.resolve({ok:true,hasCreds:true})});};
  function pending(route){const req=requests.find(r=>!r.done && r.url.includes(route));assert.ok(req,'Pedido pendente: '+route);return req;}
  async function answer(req,data,status=200){req.done=true;req.d.resolve({ok:status===200,status,headers:{get:()=> 'image/png'},
    json:()=>Promise.resolve(data),blob:()=>Promise.resolve(new w.Blob(['png'],{type:'image/png'}))});await flush();}
  function click(action){const btn=w.document.querySelector('#agSatPanel [data-action="'+action+'"]');assert.ok(btn);btn.click();}
  function change(id,value){const el=w.document.getElementById(id);el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}));}
  try{
    for(const file of ['ui-campo.js','vendor/satelites-core.js','satelites.js']) w.eval(fs.readFileSync(path.join(root,file),'utf8'));
    w.agToggleDrawer(true);
    for(const name of ['Landsat','Smap','Firms']){
      const row=w.document.getElementById('agRow'+name); assert.ok(row);
      assert.ok(row.closest('.ag-sec').querySelector('.ag-sec-t').textContent==='Satélite');
    }
    assert.ok(w.document.getElementById('agRowZonas').disabled,'Zonamento pede Sentinel ligado');
    w.agSateliteAbrir('landsat');
    const req=pending('landsat/datas');assert.ok(req.opts.signal);assert.equal(req.opts.cache,'no-store');
    await answer(req,catalogs.landsat);
    const oldImage=pending('landsat/imagem');assert.ok(oldImage.url.includes(sceneB.id),'Escolhe primeiro uma cena com até 25% de nuvens');
    change('agSatChoice',sceneA.id);
    const newImage=requests.find(r=>!r.done && r!==oldImage && r.url.includes('landsat/imagem'));
    assert.ok(oldImage.opts.signal.aborted);
    await answer(newImage,{});await flush();
    assert.equal(layers.length,1); assert.ok(w.document.getElementById('agSatPanel').textContent.includes('01/10/2026'));
    await answer(oldImage,{});assert.equal(layers.length,1,'Resposta antiga não cria overlay');
    assert.equal(layers[0].options.pane,'agSatRasterPane');
    assert.equal(panes.agSatRasterPane.parent,panes.rotatePane,'Raster acompanha o giro do mapa');
    w.document.getElementById('agSatOpacity').value=42;
    w.document.getElementById('agSatOpacity').dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(layers[0].opacity,0.42);
    assert.equal(w.document.getElementById('agRowLandsat').getAttribute('aria-pressed'),'true');

    w.agSateliteAbrir('smap');assert.equal(w.agSateliteAtivo('landsat'),false);assert.equal(layers.length,0);
    await answer(pending('smap/datas'),catalogs.smap);
    const smapOld=pending('smap/imagem');
    change('agSatSmapType','raizes');
    const smapNew=requests.find(r=>!r.done && r!==smapOld && r.url.includes('smap/imagem'));
    assert.ok(smapNew.url.includes('camada=raizes'));assert.ok(smapNew.url.includes('date=2026-10-01'));
    await answer(smapNew,{});await flush();await answer(smapOld,{});
    assert.equal(layers.length,1);assert.ok(w.document.getElementById('agSatPanel').textContent.includes('9 km'));
    assert.ok(w.document.getElementById('agSatPanel').textContent.includes('0–100 cm'));

    w.agSateliteAbrir('firms');assert.equal(w.agSateliteAtivo('smap'),true);
    await answer(pending('satelites/firms'),{type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[-47.5,-22.6]},
      properties:{datetime:'2026-10-06T10:30:00Z',confidence:'high',frpMW:5}}],meta:{count:1,source:'NASA FIRMS',fetchedAt:'2026-10-06T12:00:00Z',latestSourceDetection:'2026-10-06T10:30:00Z'}});
    assert.equal(layers.length,2,'FIRMS sobre SMAP');assert.ok(layers.find(l=>l.kind==='firms').points[0].popup.includes('10:30 UTC'));
    w.ndviLoadDates=()=>{};w.ndviLoadImage=()=>{};
    w.toggleNdvi(true);
    assert.equal(w.agSateliteAtivo('smap'),false,'Sentinel desliga SMAP');
    assert.equal(w.agSateliteAtivo('firms'),true,'Sentinel preserva FIRMS');
    assert.equal(layers.length,1);w.agSincronizarGaveta();
    assert.equal(w.document.getElementById('agRowZonas').disabled,false);
    w.ndviClear();
    w.agSateliteAbrir('smap');await answer(pending('smap/datas'),catalogs.smap);
    await answer(pending('smap/imagem'),{});await flush();w.agSateliteAbrir('firms');
    change('agSatHours','168');const pendingFire=pending('satelites/firms');
    assert.ok(pendingFire.url.includes('horas=168'));
    click('stop');await answer(pendingFire,{features:[],meta:{count:0}});
    assert.equal(layers.length,1,'Desligar FIRMS antes da resposta mantém apenas raster');
    assert.equal(w.agSateliteAtivo('firms'),false);

    center={lat:-15.6,lng:-49.2};bounds=[-49.3,-15.7,-49.1,-15.5];events.moveend();await wait(710);
    const moved=pending('smap/imagem');assert.ok(new URL(moved.url).searchParams.get('bbox').includes('-49.5'));
    await answer(moved,{});await flush();assert.equal(layers.length,1);

    w.agSateliteAbrir('landsat');await answer(pending('landsat/datas'),catalogs.landsat);
    await answer(pending('landsat/imagem'),{});await flush();
    click('probe');events.click({latlng:{lat:-15.6,lng:-49.2}});
    await answer(pending('landsat/ponto'),{temperatureC:null,reason:'Sem leitura válida.',datetime:sceneA.datetime});
    assert.ok(popups[0].html.includes('Sem leitura válida'));assert.ok(!popups[0].html.includes('0 °C'));
    click('probe');events.click({latlng:{lat:-15.6,lng:-49.2}});const stalePoint=pending('landsat/ponto');
    click('stop');await answer(stalePoint,{temperatureC:30,datetime:sceneA.datetime});
    assert.equal(popups.length,1,'Ponto antigo não abre popup depois de desligar');
    assert.equal(layers.length,0);assert.equal(revoked.length,serial,'Todos os blobs liberados');

    w.agSateliteAbrir('firms');await answer(pending('satelites/firms'),{error:'Entre no Agracta para consultar.'},401);
    assert.ok(w.document.querySelector('.ag-sat-status.error').textContent.includes('Entre no Agracta'));
    assert.ok(!w.document.querySelector('.ag-sat-status').textContent.includes('Nenhuma detecção'));
    assert.equal(layers.length,0);
    w.agSatelitesDesligarTodos();assert.equal(errors.length,0,errors.map(String).join('\n'));
    console.log('ok: menu, datas, profundidade, opacidade, FIRMS independente, área, erros e respostas fora de ordem');
  }finally{dom.window.close();}
}

async function sentinelDoesNotReturnAfterSwitch(){
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const fn=app.slice(app.indexOf('function ndviLoadImage(){'),app.indexOf('/* Série temporal por quadra'));
  const panel={style:{display:'block'}}, responses=[], images=[], overlays=[], revoked=[];
  const context={ndviIndex:'NDVI',ndviDate:'2026-10-01',_ndviImageSeq:0,NDVI_PROXY:'https://proxy',
    document:{getElementById:()=>panel},ndviBBox:()=>[-47.6,-22.7,-47.4,-22.5],ndviPx:()=>256,ndviStatus:()=>{},
    proxyFetch:()=>{const d=deferred();responses.push(d);return d.promise;},
    URL:{createObjectURL:()=> 'blob:sentinel',revokeObjectURL:url=>revoked.push(url)},
    Image:function(){images.push(this);},ndviClip:false,ndviOpacity:.7,ndviOverlay:null,_ndviObjURL:null,_map:{removeLayer:()=>{}},
    LF:{imageOverlay:()=>({addTo(){overlays.push(1);return this;},bringToFront(){}})},computeQuadraMeans:()=>{}};
  vm.createContext(context);vm.runInContext(fn,context);
  context.ndviLoadImage();
  responses[0].resolve({ok:true,blob:()=>Promise.resolve({})});await flush();
  assert.equal(images.length,1);
  panel.style.display='none';context._ndviImageSeq++;
  images[0].onload();assert.equal(overlays.length,0);assert.deepEqual(revoked,['blob:sentinel']);
  panel.style.display='block';context.ndviLoadImage();
  context.ndviDate='2026-09-25';context.ndviLoadImage();
  responses[1].resolve({ok:true,blob:()=>Promise.resolve({})});await flush();
  assert.equal(images.length,1,'Cena Sentinel anterior não é decodificada');
  responses[2].resolve({ok:true,blob:()=>Promise.resolve({})});await flush();
  images[1].onload();assert.equal(overlays.length,1,'Só a cena atual volta ao mapa');
  const means=app.slice(app.indexOf('function computeQuadraMeans(cb){'),app.indexOf('function renderNdviRank(){'));
  context.quadrasAtivas=()=>['q'];context.ndviBBoxMedida=context.ndviBBox;context._bboxDegenerada=()=>false;
  context.ndviZonas=false;
  vm.runInContext(means,context);
  context.computeQuadraMeans(()=>{context.ndviZonas=true;});
  responses[3].resolve({ok:true,blob:()=>Promise.resolve({})});await flush();
  panel.style.display='none';context._ndviImageSeq++;
  images[2].onload();
  assert.equal(context.ndviZonas,false,'Médias antigas não religam zonamento depois de desligar Sentinel');
  console.log('ok: imagem Sentinel pendente não reaparece ao trocar de camada/data');
}

(async function(){
  const tiny={getWest:()=>-47.521,getEast:()=>-47.519,getSouth:()=>-22.581,getNorth:()=>-22.579};
  const bb=C.bbox(tiny,{lat:-22.58,lng:-47.52},'smap');
  assert.ok(Math.abs(bb[2]-bb[0]-.6)<1e-6,'SMAP consulta região de pelo menos 0,6 grau');
  assert.equal(C.bestScene([sceneA,sceneB]).id,sceneB.id);
  assert.equal(C.timeLabel('2026-10-06T00:01:00Z'),'06/10/2026 00:01 UTC');
  assert.equal(C.escape('<img>'),'&lt;img&gt;');
  assert.throws(()=>C.bbox(tiny,{lat:NaN,lng:0},'smap'));
  const dateline=C.bbox({getWest:()=>178,getEast:()=>182,getSouth:()=>0,getNorth:()=>2},{lat:1,lng:180},'firms');
  assert.ok(dateline[0]>=-180 && dateline[2]<=180);
  await menuAndLayers();
  await sentinelDoesNotReturnAfterSwitch();
})().catch(error=>{console.error(error);process.exitCode=1;});
