/* Clima no mapa: local correto, unidade explícita e proteção contra resposta
 * atrasada de outro local. Rodar: node test_clima_chip.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}

var el={style:{display:'none'},innerHTML:'',title:'',attrs:{},setAttribute:function(k,v){this.attrs[k]=v;}};
var pedidos=[];
var ultimoPainel=null;
function fetchFake(url){
  var p={url:url};
  p.promise=new Promise(function(resolve,reject){p.resolve=resolve;p.reject=reject;});
  pedidos.push(p);return p.promise;
}
function resposta(current){return {ok:true,json:function(){return Promise.resolve({current:current});}};}
function gira(){return new Promise(function(resolve){setImmediate(resolve);});}

var ctx={
  console:console,Promise:Promise,Date:Date,String:String,Number:Number,Math:Math,isFinite:isFinite,
  fetch:fetchFake,CLIMA_PROXY:'https://proxy.test',
  document:{getElementById:function(id){return id==='climaChip'?el:null;}},
  ic:function(){return '';},esc:function(v){return String(v);},
  LOCAIS:{
    A:{nome:'Local A',centro:[-22.6000,-47.5000]},
    B:{nome:'Local B',centro:[-16.3000,-48.9000]},
    C:{nome:'Sem mapa',centro:null}
  },
  localAtivo:'A',quadrasDoLocal:function(){return [];},quadraCenter:function(){return null;},curV:null,
  _climaStations:[],_climaChipTimer:null,_climaChipMac:null,_climaChipSeq:0,_climaChipLocalMostrado:null,
  _climaTimer:null,_climaWhere:null,_climaWhereGPS:false,_climaPanelSeq:0,
  clearInterval:function(){},climaSay:function(){},
  climaLocalRender:function(j,ll,fromGps){ultimoPainel={j:j,ll:ll.slice(),fromGps:!!fromGps};}
};
ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('_climaNorm'),pega('climaMatch'),pega('_climaLocalCoord'),
  pega('_climaChipEl'),pega('climaChipPinta'),pega('climaChipAtualiza'),pega('climaLocalLoad')
].join('\n'),ctx);

var f=0,p=0;
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}

(async function(){
  console.log('Local e unidade da consulta');
  ctx.climaChipAtualiza();
  ck(pedidos.length===1,'local A iniciou uma consulta');
  ck(pedidos[0].url.indexOf('latitude=-22.6000')>=0 && pedidos[0].url.indexOf('longitude=-47.5000')>=0,
     'consulta usa a coordenada do local ativo');
  ck(pedidos[0].url.indexOf('wind_speed_unit=kmh')>=0 && pedidos[0].url.indexOf('timezone=America%2FSao_Paulo')>=0,
     'vento e horário têm unidade/fuso explícitos');

  console.log('\nTroca de local durante a consulta');
  ctx.localAtivo='B';
  ctx.climaChipAtualiza();
  ck(pedidos.length===2,'local B iniciou sua própria consulta');
  pedidos[1].resolve(resposta({temperature_2m:21.4,relative_humidity_2m:68,wind_speed_10m:7.2,time:'2026-08-17T10:15'}));
  await gira();await gira();
  ck(el.innerHTML.indexOf('21,4°')>=0 && el.title.indexOf('Local B')>=0,'resposta de B aparece no mapa');
  pedidos[0].resolve(resposta({temperature_2m:33.9,relative_humidity_2m:31,wind_speed_10m:15,time:'2026-08-17T10:10'}));
  await gira();await gira();
  ck(el.innerHTML.indexOf('21,4°')>=0 && el.innerHTML.indexOf('33,9°')<0,
     'resposta atrasada de A não sobrescreve o clima de B');

  console.log('\nLocal sem georreferência');
  ctx.localAtivo='C';
  var antes=pedidos.length;
  ctx.climaChipAtualiza();
  ck(pedidos.length===antes,'sem coordenada não dispara consulta inválida');
  ck(el.style.display==='flex' && el.innerHTML.indexOf('Clima sem coordenada')>=0,
     'chip explica por que não há leitura, em vez de simplesmente sumir');

  console.log('\nPainel completo');
  pedidos.length=0;ultimoPainel=null;ctx._climaPanelSeq=0;ctx._climaWhere=null;ctx.localAtivo='A';
  ctx.climaLocalLoad([-22.6,-47.5],false);
  ctx.localAtivo='B';ctx.climaLocalLoad([-16.3,-48.9],false);
  pedidos[1].resolve(resposta({temperature_2m:24,time:'2026-08-17T10:20'}));
  await gira();await gira();
  ck(ultimoPainel&&ultimoPainel.ll[0]===-16.3,'painel renderiza a consulta mais nova');
  pedidos[0].resolve(resposta({temperature_2m:31,time:'2026-08-17T10:10'}));
  await gira();await gira();
  ck(ultimoPainel&&ultimoPainel.ll[0]===-16.3,'resposta antiga também não sobrescreve o painel completo');
  ck(/_climaWhere\s*=\s*null;[\s\S]{0,120}_climaWhereGPS\s*=\s*false;/.test(src),
     'trocar de local limpa a coordenada anterior do painel');
  var pos=[],needle='api.open-meteo.com',at=0;
  while((at=src.indexOf(needle,at))>=0){pos.push(at);at+=needle.length;}
  ck(pos.length>=5 && pos.every(function(i){return src.slice(i,i+650).indexOf('wind_speed_unit=kmh')>=0;}),
     'todas as leituras Open-Meteo declaram vento em km/h');

  console.log('\n'+p+' ok, '+f+' falha(s)');
  process.exit(f?1:0);
})().catch(function(e){console.error(e);process.exit(1);});
