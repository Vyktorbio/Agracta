/* Consultas Embrapa: Bioinsumos e ZARC no Conhecimento; ClimAPI no clima. */
(function(w){
'use strict';
var d=w.document,C=w.AgroAPICore;
var bio={tipo:'produtos-biologicos',q:'',cultura:'',page:1,result:null,seq:0};
var z={uf:'SP',municipio:'',cultura:'',risco:'20',municipios:[],culturas:[],result:null,solo:'',ciclo:'',seq:0};
var clim={variable:'tmax2m',date:'',dates:[],seq:0};
var UFS='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
function e(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function bot(action,label,extra){return '<button type="button" class="con-btn" data-agro="'+action+'" '+(extra||'')+'>'+label+'</button>';}
function option(value,label,current){return '<option value="'+e(value)+'"'+(String(value)===String(current)?' selected':'')+'>'+e(label)+'</option>';}
function alive(el){return el&&el.isConnected&&d.getElementById(el.id)===el;}
function status(el,message){if(alive(el))el.innerHTML='<p class="agro-note" role="status">'+e(message)+'</p>';}
function source(result){
 var stamp=result&&result.queriedAt;
 return '<p class="agro-note">'+e(result&&result.source||'Embrapa')+
  (stamp?' · consulta '+e(new Date(stamp).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})):'')+'</p>';
}
async function request(path,params){
 if(d.documentElement.classList.contains('pre-auth'))throw Error('Entre no Agracta para consultar a Embrapa.');
 if(typeof w.proxyFetch!=='function')throw Error('Abra o Agracta novamente com conexão.');
 var base=w.NDVI_PROXY||w.CLIMA_PROXY;
 if(!base)throw Error('O serviço de consultas ainda não está disponível.');
 var qs=new URLSearchParams(params||{}).toString();
 var r=await w.proxyFetch(base+path+(qs?'?'+qs:''),{cache:'no-store'});
 var j;
 try{j=await r.json();}catch(err){throw Error('Não foi possível ler a resposta da Embrapa.');}
 if(r.ok===false||j.error)throw Error(j.error||'A consulta da Embrapa está indisponível.');
 return j;
}
function bioHtml(){
 return '<h2>Bioinsumos · Embrapa</h2><p>Consultar produtos biológicos e inoculantes registrados no MAPA.</p>'+
  '<form id="agBioForm" class="agro-form">'+
  '<label>Categoria<select id="agBioTipo">'+option('produtos-biologicos','Produtos para controle de pragas',bio.tipo)+option('inoculantes','Inoculantes',bio.tipo)+'</select></label>'+
  '<label>Buscar<input id="agBioQ" maxlength="160" value="'+e(bio.q)+'" placeholder="Produto, organismo, praga ou fabricante"></label>'+
  '<label>Cultura<input id="agBioCultura" maxlength="160" value="'+e(bio.cultura)+'" placeholder="Nome da cultura na fonte, como Soja"></label>'+
  bot('bioBusca','Consultar')+'</form><div id="agBioResultado" aria-live="polite">'+(bio.result?bioResult(bio.result):'')+'</div>'+
  '<p class="agro-note"><a href="https://www.agroapi.cnptia.embrapa.br/store/apis/info?name=Bioinsumos&amp;provider=agroapi&amp;version=v2" target="_blank" rel="noopener noreferrer">Fonte: API Bioinsumos da Embrapa</a></p>';
}
function bioResult(result){
 var records=Array.isArray(result.data)?result.data:[];
 var page=result.pagination||{},number=page.page||1;
 var h=source(result)+'<p>Página '+e(number)+(page.pages!=null?' de '+e(page.pages):'')+
  (page.total!=null?' · '+e(page.total)+' registros':'')+'</p>';
 if(!records.length)h+='<p>Nenhum registro encontrado para estes filtros.</p>';
 h+=records.map(function(record){
  var p=C.bio(record,result.category);
  return '<article class="con-painel agro-produto"><h3>'+e(p.name)+'</h3>'+
   '<dl><dt>Registro</dt><dd>'+e(p.register||'Não informado')+'</dd>'+
   '<dt>Titular</dt><dd>'+e(p.holder||'Não informado')+'</dd>'+
   '<dt>Organismo / ingrediente</dt><dd>'+e(p.ingredients||'Não informado')+'</dd>'+
   '<dt>Categoria</dt><dd>'+e(p.category||'Não informado')+'</dd>'+
   '<dt>Formulação</dt><dd>'+e(p.formulation||'Não informado')+'</dd>'+
   (p.guarantee?'<dt>Garantia</dt><dd>'+e(p.guarantee)+'</dd>':'')+'</dl>'+
   (p.indications.length?'<details><summary>Culturas e indicações da fonte</summary><ul>'+p.indications.map(function(x){return '<li>'+e(x.culture)+(x.target?' · '+e(x.target):'')+'</li>';}).join('')+'</ul></details>':'')+
   (p.url?'<p><a href="'+e(p.url)+'" target="_blank" rel="noopener noreferrer">Consultar registro no Agrofit</a></p>':'')+
   (p.documents.length?'<details><summary>Documentos da fonte</summary><ul>'+p.documents.map(function(x){return '<li><a href="'+e(x.url)+'" target="_blank" rel="noopener noreferrer">'+e(x.name)+'</a></li>';}).join('')+'</ul></details>':'')+'</article>';
 }).join('');
 h+='<div class="agro-actions">'+bot('bioAnterior','Página anterior',number<=1?'disabled':'')+
  bot('bioProxima','Próxima página',page.pages!=null&&number>=page.pages?'disabled':'')+'</div>';
 return h;
}
function readBio(){
 bio.tipo=d.getElementById('agBioTipo').value;
 bio.q=d.getElementById('agBioQ').value.trim();
 bio.cultura=d.getElementById('agBioCultura').value.trim();
}
async function bioSearch(page){
 readBio();bio.page=page||1;bio.result=null;
 var seq=++bio.seq,el=d.getElementById('agBioResultado');
 status(el,'Consultando Bioinsumos…');
 try{
  var result=await request('/agroapi/bioinsumos',{tipo:bio.tipo,q:bio.q,cultura:bio.cultura,page:bio.page});
  if(seq!==bio.seq||!alive(el))return;
  bio.result=result;el.innerHTML=bioResult(result);
 }catch(err){if(seq===bio.seq)status(el,err.message);}
}
function zarcHtml(){
 return '<h2>ZARC / Agritec · Embrapa</h2><p>Janelas de plantio do Zoneamento Agrícola de Risco Climático.</p>'+
 '<form id="agZarcForm" class="agro-form">'+
 '<label>Estado<select id="agZarcUF">'+UFS.map(function(uf){return option(uf,uf,z.uf);}).join('')+'</select></label>'+
 bot('zarcMunicipios','Carregar municípios')+
 '<label>Município<select id="agZarcMunicipio"'+(!z.municipios.length?' disabled':'')+'><option value="">Selecione</option>'+
 z.municipios.map(function(x){return option(x.codigoIBGE,x.nome,z.municipio);}).join('')+'</select></label>'+
 '<label>Cultura<select id="agZarcCultura"'+(!z.culturas.length?' disabled':'')+'><option value="">Selecione</option>'+
 z.culturas.map(function(x){return option(x.id,x.nomeCompleto||x.nome,z.cultura);}).join('')+'</select></label>'+
 '<label>Risco máximo<select id="agZarcRisco">'+[['20','20%'],['30','30%'],['40','40%'],['todos','Todos os níveis']].map(function(x){return option(x[0],x[1],z.risco);}).join('')+'</select></label>'+
 bot('zarcBusca','Consultar janelas')+'</form><div id="agZarcResultado" aria-live="polite">'+(z.result?zarcResult(z.result):'')+'</div>'+
 '<p class="agro-note"><a href="https://www.agroapi.cnptia.embrapa.br/store/apis/info?name=Agritec&amp;provider=agroapi&amp;version=v2" target="_blank" rel="noopener noreferrer">Fonte: Agritec / ZARC</a></p>';
}
function zarcResult(result){
 var data=Array.isArray(result.data)?result.data:[],rows=C.zarc(data,{solo:z.solo,ciclo:z.ciclo});
 function select(field,label,selected){
  var options=Array.from(new Set(data.map(function(r){return r[field];}).filter(Boolean))).sort();
  return '<label>'+label+'<select id="agZarc'+(field==='solo'?'Solo':'Ciclo')+'"><option value="">Todos</option>'+options.map(function(x){return option(x,x,selected);}).join('')+'</select></label>';
 }
 var h=source(result);
 if(!data.length)return h+'<p>A fonte não retornou janelas para esta consulta.</p>';
 h+='<div class="agro-form">'+select('solo','Solo / disponibilidade de água',z.solo)+select('ciclo','Grupo / ciclo',z.ciclo)+'</div>';
 if(!rows.length)return h+'<p>Nenhuma janela corresponde ao solo e ciclo selecionados.</p>';
 return h+'<div class="agro-scroll" tabindex="0"><table><caption>Janelas publicadas · '+e(rows[0].municipio||'')+' / '+e(rows[0].uf||'')+'</caption>'+
  '<thead><tr><th>Plantio</th><th>Solo</th><th>Ciclo</th><th>Risco</th><th>Safra</th><th>Portaria</th></tr></thead><tbody>'+
  rows.map(function(r){return '<tr><td>'+e(C.period(r))+'</td><td>'+e(r.solo)+'</td><td>'+e(r.ciclo)+'</td><td>'+e(r.risco==null?'—':r.risco+'%')+'</td><td>'+e(r.safraIni==null?'Não informada':r.safraIni+(r.safraFim!=null?'/'+r.safraFim:''))+'</td><td>'+e(r.portaria||'Não informada')+'</td></tr>';}).join('')+
  '</tbody></table></div><p class="agro-note">Cada linha mantém o solo, ciclo, risco, safra e portaria da fonte. A classificação de solo do ZARC deve ser escolhida conforme os critérios da portaria.</p>';
}
function clearZarc(){
 z.result=null;z.solo='';z.ciclo='';z.seq++;
 var el=d.getElementById('agZarcResultado');if(alive(el))el.innerHTML='';
}
async function municipalities(){
 clearZarc();z.uf=d.getElementById('agZarcUF').value;
 z.municipio='';z.cultura='';z.municipios=[];z.culturas=[];
 var seq=++z.seq,el=d.getElementById('agZarcResultado');
 var m=d.getElementById('agZarcMunicipio'),c=d.getElementById('agZarcCultura');
 m.disabled=c.disabled=true;m.innerHTML=c.innerHTML='<option value="">Selecione</option>';
 status(el,'Consultando municípios…');
 try{
  var result=await request('/agroapi/agritec/municipios',{uf:z.uf});
  if(seq!==z.seq||!alive(el))return;
  if(!Array.isArray(result.data))throw Error('Não foi possível ler os municípios da fonte.');
  z.municipios=result.data;m.innerHTML='<option value="">Selecione</option>'+z.municipios.map(function(x){return option(x.codigoIBGE,x.nome,'');}).join('');
  m.disabled=false;status(el,'Selecione o município para carregar as culturas.');
 }catch(err){if(seq===z.seq)status(el,err.message);}
}
async function cultures(){
 clearZarc();z.municipio=d.getElementById('agZarcMunicipio').value;
 z.cultura='';z.culturas=[];
 var seq=++z.seq,el=d.getElementById('agZarcResultado'),c=d.getElementById('agZarcCultura');
 c.innerHTML='<option value="">Selecione</option>';c.disabled=true;
 if(!z.municipio)return;
 status(el,'Consultando culturas do município…');
 try{
  var result=await request('/agroapi/agritec/culturas',{codigoIBGE:z.municipio});
  if(seq!==z.seq||!alive(el))return;
  if(!Array.isArray(result.data))throw Error('Não foi possível ler as culturas da fonte.');
  z.culturas=result.data.filter(function(x){return x.hasZoneamento!==false;});
  c.innerHTML='<option value="">Selecione</option>'+z.culturas.map(function(x){return option(x.id,x.nomeCompleto||x.nome,'');}).join('');c.disabled=false;
  status(el,z.culturas.length?'Selecione a cultura e consulte as janelas.':'A fonte não retornou culturas com zoneamento para este município.');
 }catch(err){if(seq===z.seq)status(el,err.message);}
}
async function zarcSearch(){
 clearZarc();z.municipio=d.getElementById('agZarcMunicipio').value;z.cultura=d.getElementById('agZarcCultura').value;z.risco=d.getElementById('agZarcRisco').value;
 var el=d.getElementById('agZarcResultado'),seq=++z.seq;
 if(!z.municipio||!z.cultura){status(el,'Selecione o município e a cultura.');return;}
 status(el,'Consultando janelas do ZARC…');
 try{
  var result=await request('/agroapi/agritec/zoneamento',{codigoIBGE:z.municipio,idCultura:z.cultura,risco:z.risco});
  if(seq!==z.seq||!alive(el))return;
  if(!Array.isArray(result.data))throw Error('Não foi possível ler as janelas da fonte.');
  z.result=result;el.innerHTML=zarcResult(result);
 }catch(err){if(seq===z.seq)status(el,err.message);}
}
function climateHeader(){
 return '<p class="agro-note"><b>PREVISÃO · Embrapa / GFS</b><br>Modelo regional de aproximadamente 25 km. Atualização da fonte a cada seis horas.</p>'+
 '<div class="agro-form"><label>Variável<select id="agClimVariavel">'+C.variables.map(function(x){return option(x[0],x[1]+' ('+x[2]+')',clim.variable);}).join('')+'</select></label>'+
 '<label>Execução do modelo<input id="agClimData" type="date" value="'+e(clim.date)+'" list="agClimDatas"></label>'+
 '<datalist id="agClimDatas">'+clim.dates.map(function(x){return '<option value="'+e(x)+'"></option>';}).join('')+'</datalist>'+
 bot('climDatas','Datas disponíveis')+bot('climSerie','Consultar previsão')+'</div><div id="agClimResultado" aria-live="polite"></div>';
}
function climateAlive(el,seq,panelSeq,key){
 var p=d.getElementById('climaPanel');
 return alive(el)&&seq===clim.seq&&panelSeq===w._climaPanelSeq&&w.climaFonte==='climapi'&&p&&p.style.display==='block'&&
  (typeof w._climaMapKey!=='function'||w._climaMapKey(w._climaMapCoord())===key);
}
function climateContext(){
 var ll=typeof w._climaMapCoord==='function'?w._climaMapCoord():null;
 return {ll:ll,key:typeof w._climaMapKey==='function'?w._climaMapKey(ll):'',panelSeq:w._climaPanelSeq};
}
async function climateDates(auto){
 var el=d.getElementById('agClimResultado'),ctx=climateContext(),seq=++clim.seq;
 clim.variable=d.getElementById('agClimVariavel').value;
 clim.date='';clim.dates=[];d.getElementById('agClimData').value='';
 status(el,'Consultando execuções disponíveis…');
 try{
  var result=await request('/agroapi/climapi/datas',{variavel:clim.variable});
  if(!climateAlive(el,seq,ctx.panelSeq,ctx.key))return;
  clim.dates=C.dates(result.data);
  d.getElementById('agClimDatas').innerHTML=clim.dates.map(function(x){return '<option value="'+e(x)+'"></option>';}).join('');
  if(!clim.dates.length){status(el,'A fonte não retornou datas reconhecidas. Informe a data da execução para consultar.');return;}
  clim.date=clim.dates[0];d.getElementById('agClimData').value=clim.date;
  if(auto)await climateSeries();else status(el,'Execuções disponíveis: '+clim.dates.join(', '));
 }catch(err){if(climateAlive(el,seq,ctx.panelSeq,ctx.key))status(el,err.message);}
}
function climateTable(result){
 var variable=C.variables.find(function(x){return x[0]===result.variable;});
 var h=source(result)+'<p><b>'+e(variable?variable[1]:result.variable)+'</b> · '+e(variable?variable[2]:'')+
  ' · execução '+e(result.modelDate)+'</p>';
 var series=C.serie(result.data);
 if(series&&series.rows.length){
  h+='<div class="agro-scroll" tabindex="0"><table><caption>Série de previsão · valores e horários conforme a fonte</caption><thead><tr>'+
   series.columns.map(function(k){return '<th>'+e(k)+'</th>';}).join('')+'</tr></thead><tbody>'+
   series.rows.map(function(row){return '<tr>'+series.columns.map(function(k){return '<td>'+e(C.value(row[k]))+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';
  if(series.total>series.rows.length)h+='<p>Exibindo os primeiros '+series.rows.length+' de '+series.total+' registros.</p>';
 }else if(series)h+='<p>A fonte não retornou valores para esta consulta.</p>';
 else h+='<p>Os dados retornaram em uma estrutura diferente de uma série tabular. Consulte o conteúdo da fonte abaixo.</p>';
 return h+'<details><summary>Dados retornados pela Embrapa</summary><pre class="agro-raw">'+e(JSON.stringify(result.data,null,2))+'</pre></details>'+
  '<p class="agro-note">Previsão do modelo para o centro do mapa. Os valores mantêm as unidades da ClimAPI; vento em m/s. Não representam uma leitura da estação.</p>';
}
async function climateSeries(){
 var ctx=climateContext(),el=d.getElementById('agClimResultado'),seq=++clim.seq;
 clim.variable=d.getElementById('agClimVariavel').value;clim.date=d.getElementById('agClimData').value;
 if(!ctx.ll){status(el,'Posicione o mapa ou use o GPS para consultar a previsão.');return;}
 if(!clim.date){status(el,'Selecione uma execução disponível ou informe sua data.');return;}
 status(el,'Consultando previsão da ClimAPI…');
 try{
  var result=await request('/agroapi/climapi/serie',{variavel:clim.variable,data:clim.date,lat:Number(ctx.ll[0]).toFixed(4),lng:Number(ctx.ll[1]).toFixed(4)});
  if(!climateAlive(el,seq,ctx.panelSeq,ctx.key))return;
  el.innerHTML=climateTable(result);
 }catch(err){if(climateAlive(el,seq,ctx.panelSeq,ctx.key))status(el,err.message);}
}
function climateLoad(ll){
 clim.seq++;
 var b=d.getElementById('climaBody');
 if(!b)return;
 if(!ll){b.innerHTML='<p>Posicione o mapa ou use o GPS para consultar a previsão.</p>';return;}
 b.innerHTML=climateHeader();climateDates(true);
}
w.agConhecimentoAbas=w.agConhecimentoAbas||[];
w.agConhecimentoAbas.push({id:'bioinsumos',rotulo:'Bioinsumos',html:bioHtml},{id:'zarc',rotulo:'ZARC / Agritec',html:zarcHtml});
var fontes=w.agFontesHtml;
w.agFontesHtml=function(){
 return (fontes?fontes():'')+'<section class="con-painel"><h3>Embrapa · AgroAPI</h3><p>Catálogo de bioinsumos e consulta de janelas de plantio.</p>'+
 bot('abrirBio','Consultar Bioinsumos')+' '+bot('abrirZarc','Consultar ZARC / Agritec')+'</section>';
};
d.addEventListener('submit',function(ev){
 if(ev.target.id==='agBioForm'){ev.preventDefault();bioSearch(1);}
 if(ev.target.id==='agZarcForm'){ev.preventDefault();zarcSearch();}
});
d.addEventListener('click',function(ev){
 var b=ev.target.closest&&ev.target.closest('[data-agro]');
 if(!b)return;
 var action=b.getAttribute('data-agro');
 if(action==='abrirBio'||action==='abrirZarc')return w.abrirConhecimento({aba:action==='abrirBio'?'bioinsumos':'zarc'});
 if(action==='bioBusca')return bioSearch(1);
 if(action==='bioAnterior')return bioSearch(Math.max(1,bio.page-1));
 if(action==='bioProxima')return bioSearch(bio.page+1);
 if(action==='zarcMunicipios')return municipalities();
 if(action==='zarcBusca')return zarcSearch();
 if(action==='climDatas')return climateDates(false);
 if(action==='climSerie')return climateSeries();
});
d.addEventListener('input',function(ev){
 if(ev.target.closest&&ev.target.closest('#agBioForm')){readBio();bio.seq++;bio.result=null;status(d.getElementById('agBioResultado'),'Filtros alterados. Toque em Consultar.');}
});
d.addEventListener('change',function(ev){
 var id=ev.target.id;
 if(ev.target.closest&&ev.target.closest('#agBioForm')){readBio();bio.seq++;bio.result=null;status(d.getElementById('agBioResultado'),'Filtros alterados. Toque em Consultar.');}
 if(id==='agZarcUF'){
  clearZarc();z.uf=ev.target.value;z.municipios=[];z.culturas=[];z.municipio='';z.cultura='';
  ['agZarcMunicipio','agZarcCultura'].forEach(function(name){var s=d.getElementById(name);s.disabled=true;s.innerHTML='<option value="">Selecione</option>';});
 }
 if(id==='agZarcMunicipio')return cultures();
 if(id==='agZarcCultura'){z.cultura=ev.target.value;clearZarc();}
 if(id==='agZarcRisco'){z.risco=ev.target.value;clearZarc();}
 if(id==='agZarcSolo'||id==='agZarcCiclo'){
  z.solo=d.getElementById('agZarcSolo').value;z.ciclo=d.getElementById('agZarcCiclo').value;
  if(z.result)d.getElementById('agZarcResultado').innerHTML=zarcResult(z.result);
 }
 if(id==='agClimVariavel')return climateDates(true);
 if(id==='agClimData'){clim.date=ev.target.value;clim.seq++;status(d.getElementById('agClimResultado'),'Data alterada. Toque em Consultar previsão.');}
});
w.agAgroAPI={request:request,climaLoad:climateLoad};
})(window);
