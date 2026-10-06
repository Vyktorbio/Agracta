/* Interface real em JSDOM: fonte do clima, respostas fora de ordem e consultas. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const app=fs.readFileSync('app.js','utf8');
const core=fs.readFileSync('vendor/agroapi-core.js','utf8');
const ui=fs.readFileSync('agroapi.js','utf8');
/* As funções do clima não têm chaves desemparelhadas dentro de strings. */
function extract(name){
 const start=app.indexOf('function '+name+'(');
 assert.ok(start>=0,name+' existe');
 let depth=0,seen=false;
 for(let i=start;i<app.length;i++){
  if(app[i]==='{'){depth++;seen=true;}
  else if(app[i]==='}'){depth--;if(seen&&depth===0)return app.slice(start,i+1);}
 }
 throw Error('Função incompleta '+name);
}
const tick=()=>new Promise(r=>setImmediate(r));
function montar(){
 const dom=new JSDOM('<!doctype html><html class="light"><body><div id="climaPanel" style="display:block"></div><div id="conhecimentoOvl"></div></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document,pedidos=[];
 w.NDVI_PROXY=w.CLIMA_PROXY='https://proxy.test';w.climaFonte='auto';w._climaPanelSeq=0;w._climaTimer=null;
 w._climaStations=[{mac:'AA:BB',name:'Estação A'},{mac:'CC:DD',name:'Estação B'}];
 let ll=[-22.58,-47.52];w._climaMapCoord=()=>ll;
 w._climaMapKey=p=>p?p.map(v=>Number(v).toFixed(3)).join('|'):'sem-coord';
 w._climaStationForCoord=()=>w._climaStations[0];w._climaStationByMac=mac=>w._climaStations.find(s=>s.mac===mac);
 w.climaMatch=()=>w._climaStations[0].mac;w.ic=()=>'';w.esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const renders={meteo:0,station:0};
 w.climaLocalLoad=()=>{w._climaPanelSeq++;renders.meteo++;d.getElementById('climaBody').textContent='Open-Meteo';};
 w.climaSay=x=>{d.getElementById('climaBody').textContent=x;};
 w.climaRender=()=>{renders.station++;d.getElementById('climaBody').textContent='Estação';};
 w.agFontesHtml=()=>'<p>Fontes existentes</p>';
 w.abrirConhecimento=op=>tab(op.aba);
 w.proxyFetch=url=>new Promise((resolve,reject)=>pedidos.push({url,resolve:payload=>resolve({ok:true,json:()=>Promise.resolve(payload)}),reject}));
 w.eval(['buildClimaPanel','climaFonteSet','climaInit','climaPick','climaLoad'].map(extract).join('\n'));
 w.eval(core);w.eval(ui);
 function tab(id){d.getElementById('conhecimentoOvl').innerHTML=w.agConhecimentoAbas.find(x=>x.id===id).html();}
 function click(action){const b=d.querySelector('[data-agro="'+action+'"]');assert.ok(b,action+' existe');b.click();}
 function change(id,value){const input=d.getElementById(id);input.value=value;input.dispatchEvent(new w.Event('change',{bubbles:true}));}
 return {w,d,pedidos,renders,tab,click,change,move:p=>{ll=p;}};
}
(async()=>{
 {
  const x=montar(),{w,d,pedidos,renders}=x;
  w.buildClimaPanel();
  const select=d.getElementById('climaFonte');
  assert.ok([...select.options].some(o=>o.value==='climapi'));
  assert.ok([...select.options].some(o=>o.value==='estacao:CC:DD'));
  w.climaFonteSet('climapi');
  assert.equal(renders.meteo,0,'ClimAPI não faz consulta Open-Meteo');
  assert.equal(d.getElementById('climaFonte').value,'climapi');
  assert.match(pedidos[0].url,/agroapi\/climapi\/datas/);
  pedidos[0].resolve({data:['2026-10-04','2026-10-06']});await tick();
  assert.equal(d.getElementById('agClimData').value,'2026-10-06');
  assert.match(pedidos[1].url,/lat=-22.5800/);assert.match(pedidos[1].url,/lng=-47.5200/);
  pedidos[1].resolve({data:[{data:'2026-10-06T12:00:00Z',valor:0}],variable:'tmax2m',modelDate:'2026-10-06',source:'Embrapa · ClimAPI / GFS'});await tick();
  assert.match(d.getElementById('agClimResultado').textContent,/0/,'zero permanece no resultado');
  assert.match(d.getElementById('climaBody').textContent,/PREVISÃO/);
  assert.match(d.getElementById('climaBody').textContent,/25 km/);
  x.click('climSerie');const old=pedidos[2];
  w.climaFonteSet('modelo');
  assert.equal(renders.meteo,1);
  old.resolve({data:[{valor:999}],variable:'tmax2m',modelDate:'2026-10-06'});await tick();
  assert.equal(d.getElementById('climaBody').textContent,'Open-Meteo','resposta ClimAPI não repinta a fonte trocada');
  w.climaFonteSet('estacao:CC:DD');
  assert.match(pedidos[3].url,/mac=CC%3ADD/,'escolhe a estação solicitada');
  pedidos[3].resolve({temp:{value:24}});await tick();
  assert.equal(renders.station,1);assert.equal(w.climaMac,'CC:DD');
  w.close();
 }
 {
  const x=montar(),{w,d,pedidos}=x;
  w.climaFonteSet('climapi');
  pedidos[0].resolve({data:['2026-10-06']});await tick();
  x.move([-16.3,-48.9]);
  pedidos[1].resolve({data:[{valor:999}],variable:'tmax2m',modelDate:'2026-10-06'});await tick();
  assert.doesNotMatch(d.getElementById('agClimResultado').textContent,/999/,'consulta do mapa anterior é descartada');
  w.climaLoad();pedidos[2].resolve({data:['2026-10-06']});await tick();
  d.getElementById('climaPanel').style.display='none';w._climaPanelSeq++;
  pedidos[3].resolve({data:[{valor:888}],variable:'tmax2m',modelDate:'2026-10-06'});await tick();
  assert.doesNotMatch(d.getElementById('agClimResultado').textContent,/888/,'fechar o painel invalida a consulta');
  w.close();
 }
 {
  const x=montar(),{w,d,pedidos}=x;x.tab('bioinsumos');x.click('bioBusca');
  pedidos[0].resolve({data:[{numero_registro:'7815',marca_comercial:['<img src=x onerror=alert(1)>'],ingrediente_ativo:['Bacillus'],
   documento_cadastrado:[{url:'javascript:alert(1)',descricao:'inválido'}]}],category:'produtos-biologicos',pagination:{page:1,pages:2,total:21},source:'Embrapa'});await tick();
  assert.equal(d.querySelector('#agBioResultado img'),null,'nome da fonte é texto');
  assert.equal(d.querySelector('#agBioResultado a[href^="javascript:"]'),null);
  assert.match(d.getElementById('agBioResultado').textContent,/7815/);
  x.click('bioProxima');assert.match(pedidos[1].url,/page=2/);
  x.change('agBioTipo','inoculantes');
  pedidos[1].resolve({data:[{marca_comercial:['ANTIGO']}],category:'produtos-biologicos',pagination:{page:2}});await tick();
  assert.doesNotMatch(d.getElementById('agBioResultado').textContent,/ANTIGO/,'filtros novos descartam resposta antiga');
  x.click('bioBusca');assert.match(pedidos[2].url,/tipo=inoculantes/);assert.match(pedidos[2].url,/page=1/);
  pedidos[2].resolve({data:[],category:'inoculantes',pagination:{page:1,pages:1}});await tick();
  assert.match(d.getElementById('agBioResultado').textContent,/Nenhum registro/);
  assert.ok(d.querySelector('[data-agro="bioProxima"]').disabled);
  w.close();
 }
 {
  const x=montar(),{w,d,pedidos}=x;x.tab('zarc');x.click('zarcMunicipios');
  pedidos[0].resolve({data:[{codigoIBGE:3523206,nome:'IRACEMÁPOLIS',uf:'SP'}]});await tick();
  x.change('agZarcMunicipio','3523206');assert.match(pedidos[1].url,/codigoIBGE=3523206/);
  pedidos[1].resolve({data:[{id:60,nome:'SOJA',hasZoneamento:true}]});await tick();
  x.change('agZarcCultura','60');x.click('zarcBusca');
  assert.match(pedidos[2].url,/idCultura=60/);assert.match(pedidos[2].url,/risco=20/);
  pedidos[2].resolve({data:[{municipio:'IRACEMÁPOLIS',uf:'SP',diaIni:21,mesIni:11,diaFim:30,mesFim:11,solo:'AD1',ciclo:'GRUPO I',risco:20,safraIni:2025,safraFim:2026,portaria:'Port. 381 de 26/06/2025'}],source:'Embrapa'});await tick();
  const t=d.getElementById('agZarcResultado').textContent;
  assert.match(t,/21\/11 a 30\/11/);assert.match(t,/AD1/);assert.match(t,/GRUPO I/);
  assert.match(t,/2025\/2026/);assert.match(t,/Port. 381/);
  x.change('agZarcUF','MG');
  assert.ok(d.getElementById('agZarcMunicipio').disabled);
  assert.equal(d.getElementById('agZarcResultado').textContent,'');
  w.close();
 }
 assert.match(fs.readFileSync('index.html','utf8'),/agroapi.js\?v=1/);
 assert.match(fs.readFileSync('sw.js','utf8'),/vendor\/agroapi-core.js\?v=1/);
 console.log('ok · seleção de clima, consultas, paginação, sigilo e respostas atrasadas');
})().catch(e=>{console.error(e);process.exitCode=1;});
