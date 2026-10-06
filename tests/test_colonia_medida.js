/* MEDIR A COLÔNIA PELA FOTO, na tela: o botão do editor da placa abre a câmera,
 * a foto é medida com a placa como régua, a tela mostra o que mediu para
 * conferir, "Usar" grava os dois eixos e guarda a foto com a medida junto, e
 * "Usar e fotografar a próxima" já abre a câmera da placa seguinte.
 * Rodar: node tests/test_colonia_medida.js */
var fs=require('fs');
var JSDOM; try{ JSDOM=require('jsdom').JSDOM; }catch(e){ console.log('PULADO: jsdom ausente'); process.exit(0); }
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
var espera=function(ms){ return new Promise(function(r){ setTimeout(r,ms||10); }); };
/* a placa sintética do teste do motor */
var src=fs.readFileSync('tests/test_colonia_core.js','utf8');
eval(src.slice(src.indexOf('function placa(o)'),src.indexOf('function medir(o)')));

var dom=new JSDOM('<!doctype html><html><body><div id="avSubModal"></div></body></html>',{runScripts:'outside-only',url:'http://127.0.0.1/'});
var w=dom.window, d=w.document;
w.HTMLDialogElement.prototype.showModal=function(){ this.open=true; this.setAttribute('open',''); };
w.HTMLDialogElement.prototype.close=function(){ if(!this.open) return; this.open=false; this.removeAttribute('open'); var el=this; setTimeout(function(){ el.dispatchEvent(new w.Event('close')); },20); };
/* a "foto": o canvas devolve os pixels da placa sintética da vez */
var fotoDaVez=null;
w.createImageBitmap=function(file){ return Promise.resolve({width:fotoDaVez.w, height:fotoDaVez.h, close:function(){}}); };
w.HTMLCanvasElement.prototype.getContext=function(){
  var cv=this;
  return {drawImage:function(){}, putImageData:function(){}, getImageData:function(x,y,W,H){ return {data:fotoDaVez.px, width:W, height:H}; },
    createImageData:function(W,H){ return {data:new Uint8ClampedArray(W*H*4), width:W, height:H}; },
    beginPath:function(){}, ellipse:function(){ w.__elipses=(w.__elipses||0)+1; }, arc:function(){}, moveTo:function(){}, lineTo:function(){}, stroke:function(){}, fill:function(){}, fillText:function(){},
    set lineWidth(v){}, set strokeStyle(v){}, get strokeStyle(){ return '#000'; }, set fillStyle(v){}, set font(v){}};
};
var cliques=[]; w.HTMLInputElement.prototype.click=function(){ cliques.push(this); };
function entregar(){ var inp=cliques[cliques.length-1]; Object.defineProperty(inp,'files',{value:[new w.File(['x'],'placa.jpg',{type:'image/jpeg'})],configurable:true}); inp.onchange(); }
w.alert=function(t){ w.__alerta=t; };
/* o que o app entrega */
var V='Diâmetro da colônia (mm)', escritos=[], guardadas=[], abertos=[];
var rows=[{key:'T1R1',tratId:'T1',rep:1,parcela:'1A'},{key:'T2R1',tratId:'T2',rep:1,parcela:'2A'},{key:'T3R1',tratId:'T3',rep:1,parcela:'3A'}];
w._avAutoRows=function(){ return rows; };
w._avSubCtx={key:'T2R1', v:V};
w._avBioPlaca=function(v){ return v===V?{placaMm:90, discoMm:5}:null; };
w._avWriteBruto=function(k,v,c,val){ escritos.push([k,v,c,val]); return val; };
w._avPersistNow=function(){ w.__persist=(w.__persist||0)+1; };
w._avSubRender=function(){ w.__subRender=(w.__subRender||0)+1; };
w._avRefreshDer=function(){};
w.avOpenSub=function(k,v){ abertos.push(k); w._avSubCtx={key:k, v:v}; };
w.fotosGuardarDaGrade=function(k,file,extra){ guardadas.push({k:k, file:file, extra:extra}); return Promise.resolve(1); };
w._stxToast=function(t){ w.__toast=t; };
w.eval(fs.readFileSync('vendor/colonia-core.js','utf8'));
w.eval(fs.readFileSync('colonia-medida.js','utf8'));
function dlg(){ return d.querySelector('#coloniaDlg[open]'); }
async function aoMedir(){ for(var i=0;i<300;i++){ var g=dlg(); if(g && !/Medindo/.test(g.textContent) && g.querySelector('.cm-acoes button')) return g; await espera(10); } return dlg(); }
function botao(g,a){ return g.querySelector('[data-cm="'+a+'"]'); }
/* os números da tela ("Eixo 1 52,2 mm") e a tolerância do motor */
function eixos(g){ var b=g.querySelectorAll('.cm-res b'); return [0,1].map(function(i){ return parseFloat(b[i].textContent.replace(',','.')); }); }
function perto(a,b,pct){ return Math.abs(a-b)<=b*pct/100; }

(async function(){
  console.log('\n[1] o botão do editor da placa abre a câmera');
  var app=fs.readFileSync('app.js','utf8');
  ck(/avSubMedirFoto\(\)[^]{0,80}📷 Medir por foto/.test(app),'o editor do diâmetro em cruz tem "📷 Medir por foto"');
  fotoDaVez=placa({ruido:6, colonia:{r1:150,r2:150}});
  w.avSubMedirFoto();
  ck(cliques.length===1 && cliques[0].getAttribute('capture')==='environment','abre a câmera traseira direto, no mesmo toque');
  entregar();
  var g=await aoMedir();
  ck(!!g && /Medir colônia · 2A \(T2 · R1\)/.test(g.textContent),'a janela diz qual placa está sendo medida');
  var e1=eixos(g);
  ck(/Eixo 1/.test(g.textContent) && /Eixo 2 ⟂/.test(g.textContent) && perto(e1[0],51.9,1.5) && perto(e1[1],51.9,1.5),'mostra os dois eixos em mm: '+e1.join(' × ')+' (a colônia sintética tem 51,9)');
  ck(/azul/.test(g.textContent) && /verde/.test(g.textContent) && w.__elipses>0,'desenha a borda da placa e pede para conferir antes de usar');
  ck(!escritos.length,'nada entra na grade antes do "Usar"');

  console.log('\n[2] usar e fotografar a próxima');
  ck(/Usar e fotografar a próxima \(3A\)/.test(botao(g,'proxima').textContent),'oferece a próxima placa pelo nome (3A)');
  botao(g,'proxima').click();
  ck(escritos.length===2 && escritos[0][0]==='T2R1' && escritos[0][2]==='s0' && escritos[1][2]==='s1' && escritos[0][3]===String(e1[0]) && escritos[1][3]===String(e1[1]),'grava na 2A os dois eixos que a tela mostrou ('+escritos.map(function(e){ return e[3]; }).join(' e ')+'), com uma casa');
  ck(w.__persist>=1 && w.__subRender>=1,'salva e atualiza o editor');
  ck(guardadas.length===1 && guardadas[0].k==='T2R1' && guardadas[0].extra.medicao.d1Mm===e1[0] && guardadas[0].extra.medicao.metodo==='auto','guarda a foto na parcela com a medida junto (a evidência)');
  var med=guardadas[0].extra.medicao;
  ck(med.placaMm===90 && med.placa && med.placa.a>0 && med.eixos && med.eixos.length===2 && med.larguraMedida===800,'com a placa e a cruz em coordenadas relativas: dá para redesenhar a medida na foto original');
  ck(abertos[0]==='T3R1' && cliques.length===2,'abre o editor da 3A e a câmera no mesmo toque');

  console.log('\n[3] a próxima placa: colônia irregular');
  fotoDaVez=placa({ruido:6, colonia:{r1:170,r2:120,ang:0.6}});
  entregar();
  await espera(40);
  g=await aoMedir();
  var e3=eixos(g);
  ck(/Medir colônia · 3A/.test(g.textContent) && perto(e3[0],58.8,2) && perto(e3[1],41.5,2),'3A: '+e3.join(' × ')+' mm (real 58,8 × 41,5)');
  ck(/irregular/.test(g.textContent),'o aviso de colônia irregular aparece para conferir');
  ck(!botao(g,'proxima'),'última placa: não oferece "próxima"');

  console.log('\n[4] medir à mão, na escala da placa');
  botao(g,'mao').click();
  g=dlg(); var cv=g.querySelector('.cm-cv');
  cv.getBoundingClientRect=function(){ return {left:0, top:0, width:400, height:300}; };
  /* canvas de 800 px mostrado em 400: o toque em (100,150) é o pixel (200,300) */
  [[125,150],[275,150],[200,85],[200,215]].forEach(function(p){ cv.dispatchEvent(new w.MouseEvent('pointerdown',{clientX:p[0],clientY:p[1],bubbles:true})); });
  g=await aoMedir();
  var e4=eixos(g);
  ck(perto(e4[0],51.9,1.5) && perto(e4[1],45.0,1.5),'quatro toques: 300 px e 260 px na escala da placa = '+e4.join(' × ')+' mm (51,9 × 45,0 com a borda exata)');
  ck(/Cruz medida à mão/.test(g.textContent),'diz que a cruz foi medida à mão');
  botao(g,'usar').click();
  ck(escritos.slice(-2).map(function(e){ return e[0]+e[2]+'='+e[3]; }).join()==='T3R1s0='+e4[0]+',T3R1s1='+e4[1],'"Usar" grava a medida à mão da 3A');
  ck(guardadas[1].extra.medicao.metodo==='manual','e a foto guarda que foi medida à mão');

  console.log('\n[5] ajustar a borda com 3 toques');
  await espera(40);
  w._avSubCtx={key:'T1R1', v:V};
  fotoDaVez=placa({ruido:6, colonia:{r1:150,r2:150}});
  w.avSubMedirFoto(); entregar();
  g=await aoMedir();
  botao(g,'borda').click(); g=dlg(); cv=g.querySelector('.cm-cv');
  cv.getBoundingClientRect=function(){ return {left:0, top:0, width:800, height:600}; };
  /* a borda interna real tem raio 260 em (400,300); toques numa borda de raio 240 */
  [[640,300],[400,540],[160,300]].forEach(function(p){ cv.dispatchEvent(new w.MouseEvent('pointerdown',{clientX:p[0],clientY:p[1],bubbles:true})); });
  g=await aoMedir();
  ck(/56,3 mm/.test(g.querySelector('.cm-res').textContent) && /Borda da placa marcada à mão/.test(g.textContent),'a borda marcada vira a régua (raio 240 → a colônia de 300 px mede 56,3 mm)');

  console.log('\n[6] tomou a placa');
  botao(g,'outra').click();
  fotoDaVez=placa({ruido:6, colonia:{r1:262,r2:262}});
  entregar();
  await espera(40);
  g=await aoMedir();
  ck(/toda da mesma cor/.test(g.textContent) && botao(g,'tomou'),'placa toda coberta: não inventa número, oferece "Tomou a placa"');
  var antes=escritos.length;
  botao(g,'tomou').click();
  ck(escritos.slice(antes).map(function(e){ return e[2]+'='+e[3]; }).join()==='s0=90,s1=90','"Tomou a placa": os dois eixos viram o Ø da placa (90 mm)');

  console.log('\n[7] sem o Ø da placa no protocolo');
  await espera(40);
  w._avBioPlaca=function(){ return {placaMm:null}; };
  var nCliques=cliques.length; w.avSubMedirFoto();
  ck(cliques.length===nCliques && /diâmetro interno da placa/.test(w.__alerta||''),'não abre a câmera: pede o Ø da placa no protocolo');

  console.log('\n'+passes+' ok, '+falhas+' falha(s)');
  process.exit(falhas?1:0);
})().catch(function(e){ console.log('FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
