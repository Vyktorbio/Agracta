'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../vendor/croqui-campo-core.js');
const app=fs.readFileSync('app.js','utf8'),a=app.indexOf('function croquiDesenhar('),b=app.indexOf('\nfunction ',a+1);
const free=C.grade({tratamentos:1,repeticoes:1,comprimento:0,largura:0,livre:{tipo:'ponto',itens:[{ordem:1,partes:[{x:0,y:0,r:1},{x:8,y:12,r:1}]}]}});
const grid=C.grade({tratamentos:1,repeticoes:1,comprimento:5,largura:3});
const polygons=[],lines=[];let g=free;
const layer=()=>({addTo(){return this;},bindTooltip(){return this;},openTooltip(){return this;},on(){return this;},options:{}});
const c={CroquiCore:C,croquiGrade:()=>g,_map:{getZoom:()=>18},_croquiMetrosPorPixel:()=>1,_croquiFonte:()=>{},
 LF:{polygon:(points,style)=>{polygons.push({points,style});return layer();},polyline:points=>{lines.push(points);return layer();}},window:{}};
vm.createContext(c);vm.runInContext(app.slice(a,b),c);
const pos={lat:-22,lng:-47,ang:0};
c.croquiDesenhar({}, {}, pos,false);
assert.equal(polygons.length,1,'só desenha a parcela real de árvores, sem retângulo envolvente');
assert.equal(polygons[0].points.length,2,'duas árvores continuam como duas copas separadas');
assert.equal(lines.length,0,'não inventa trajeto de máquina ligando árvores espalhadas');
polygons.length=0;g=grid;c.croquiDesenhar({}, {},pos,false);
assert.equal(polygons.length,2,'grade mantém contorno e parcela retangular reais');
console.log('Árvores marcadas: copas preservadas, sem moldura retangular fictícia; grade normal preservada OK.');
