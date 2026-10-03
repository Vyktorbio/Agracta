'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const start=src.indexOf('function enquadrarLocalInicial('),end=src.indexOf('\nfunction flyToLocal',start);
let calls=[];
const c={_mapInitialLocalPending:true,_map:{invalidateSize(){}},ensureLocais(){},LOCAIS:{home:{centro:[-14.235,-51.9253]}},localAtivo:'home',ESTACAO_CENTER:[-14.235,-51.9253],QGEO:{},quadrasDoLocal(){return Object.keys(c.QGEO);},quadraPonto(){return null;},flyToLocal(id){calls.push(id);}};
vm.createContext(c);vm.runInContext(src.slice(start,end),c);
c.enquadrarLocalInicial();assert.equal(calls.length,0);assert.equal(c._mapInitialLocalPending,true,'sem dados locais, aguarda a nuvem');
c.QGEO={C4:[[-22.5,-47.5]]};c.enquadrarLocalInicial();assert.deepEqual(calls,['home']);
c.enquadrarLocalInicial();assert.equal(calls.length,1,'sync posterior não move o mapa de novo');
c._mapInitialLocalPending=false;c.QGEO={C5:[[-22.6,-47.6]]};c.enquadrarLocalInicial();assert.equal(calls.length,1,'navegação/GPS cancelam a centralização pendente');
c._mapInitialLocalPending=true;c.QGEO={};c.LOCAIS.home.centro=[-22,-47];c.enquadrarLocalInicial();assert.equal(calls.length,2,'local com centro cadastrado funciona sem polígonos');
c._mapInitialLocalPending=true;c.LOCAIS.home.centro=[NaN,-47];c.enquadrarLocalInicial();assert.equal(calls.length,2,'centro inválido não consome a tentativa');
for(const name of ['cloudApply','_applyRowsState']){
 const a=src.indexOf('function '+name+'('),b=src.indexOf('\nfunction ',a+1);
 assert.match(src.slice(a,b),/enquadrarLocalInicial\(\)/,name+' refaz enquadramento após receber dados');
}
console.log('Mapa: reserva, sync tardia, enquadramento único e respeito à navegação OK');
