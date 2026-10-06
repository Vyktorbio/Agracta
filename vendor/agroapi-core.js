/* Dados de consulta da Embrapa. Não altera estudos, doses ou avaliações. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AgroAPICore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
var VARIABLES=[
 ['tmax2m','Temperatura máxima a 2 m','°C'],
 ['tmin2m','Temperatura mínima a 2 m','°C'],
 ['apcpsfc','Precipitação','kg/m²'],
 ['rh2m','Umidade relativa a 2 m','%'],
 ['gustsfc','Rajada na superfície','m/s'],
 ['dpt2m','Ponto de orvalho a 2 m','°C'],
 ['pevprsfc','Evaporação potencial','mm/6 h'],
 ['ugrd10m','Vento zonal a 10 m','m/s'],
 ['vgrd10m','Vento meridional a 10 m','m/s'],
 ['tmpsfc','Temperatura da superfície','°C'],
 ['soill0_10cm','Umidade volumétrica · 0–10 cm','m³/m³'],
 ['soill10_40cm','Umidade volumétrica · 10–40 cm','m³/m³'],
 ['soill40_100cm','Umidade volumétrica · 40–100 cm','m³/m³'],
 ['hcdchcll','Cobertura de nuvens altas','%'],
 ['mcdcmcll','Cobertura de nuvens médias','%'],
 ['lcdclcll','Cobertura de nuvens baixas','%'],
 ['sunsdsfc','Duração da luz do sol','s']
];
function list(x){return Array.isArray(x)?x:[];}
function text(x){return x==null?'':String(x);}
function join(x){return Array.isArray(x)?x.map(text).join('; '):text(x);}
function safeUrl(raw){
  try{var u=new URL(String(raw));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch(e){return '';}
}
function bio(record,category){
 var r=record||{},ino=category==='inoculantes';
 return {
  name:ino?(join(r.especie)||'Inoculante'):join(r.marca_comercial)||'Produto biológico',
  register:text(ino?r.registro_produto:r.numero_registro),
  holder:text(ino?r.razao_social:r.titular_registro),
  ingredients:join(ino?r.especie:r.ingrediente_ativo),
  formulation:text(ino?r.natureza_fisica:r.formulacao),
  guarantee:text(r.garantia),
  category:join(ino?r.tipo:r.classe_categoria_agronomica),
  indications:ino?[{culture:text(r.cultura),target:text(r.cultura_nome_cientifico)}]:
   list(r.indicacao_uso).map(function(x){return {culture:text(x.cultura),target:join(x.praga_nome_comum)+(x.praga_nome_cientifico?' · '+text(x.praga_nome_cientifico):'')};}),
  documents:list(r.documento_cadastrado).map(function(x){return {name:text(x.descricao||x.tipo_documento||'Documento'),url:safeUrl(x.url)};}).filter(function(x){return x.url;}),
  url:safeUrl(r.url_agrofit)
 };
}
function zarc(rows,filters){
 filters=filters||{};
 return list(rows).filter(function(r){
   return (!filters.solo||r.solo===filters.solo)&&(!filters.ciclo||r.ciclo===filters.ciclo);
 });
}
function period(r){
 function part(day,month){
  day=Number(day);month=Number(month);
  return Number.isInteger(day)&&day>=1&&day<=31&&Number.isInteger(month)&&month>=1&&month<=12?
   String(day).padStart(2,'0')+'/'+String(month).padStart(2,'0'):'—';
 }
 return part(r.diaIni,r.mesIni)+' a '+part(r.diaFim,r.mesFim);
}
function dates(payload){
 var x=Array.isArray(payload)?payload:payload&&Array.isArray(payload.data)?payload.data:
  payload&&Array.isArray(payload.datas)?payload.datas:payload&&typeof payload==='object'?Object.keys(payload):[];
 return Array.from(new Set(x.map(function(v){
  var s=typeof v==='string'?v:v&&text(v.data||v.date||v.data_execucao);
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(s||'')?s.slice(0,10):'';
 }).filter(Boolean))).sort().reverse();
}
function serie(payload){
 var xs=Array.isArray(payload)?payload:payload&&Array.isArray(payload.data)?payload.data:
  payload&&Array.isArray(payload.dados)?payload.dados:null;
 if(!xs)return null;
 var rows=xs.slice(0,500).map(function(v){return v&&typeof v==='object'&&!Array.isArray(v)?v:{valor:v};});
 var columns=[];
 rows.forEach(function(r){Object.keys(r).forEach(function(k){if(columns.indexOf(k)<0)columns.push(k);});});
 return {columns:columns.slice(0,20),rows:rows,total:xs.length};
}
function value(x){
 if(x==null)return '—';
 return typeof x==='object'?JSON.stringify(x):String(x);
}
return {variables:VARIABLES,bio:bio,safeUrl:safeUrl,zarc:zarc,period:period,dates:dates,serie:serie,value:value};
});
