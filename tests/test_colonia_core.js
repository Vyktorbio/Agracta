/* ColoniaCore: o diâmetro da colônia medido na foto, com a placa como régua.
 * "A medição da colônia por foto que você planeja. O Ø da placa no protocolo já
 *  serve de escala."
 * Placas sintéticas de medida CONHECIDA: o motor tem de devolver o diâmetro com
 * erro de poucos por cento — clara ou escura, redonda ou irregular, com anéis de
 * zonação, foto inclinada, reflexo, tampa na foto, colônia na borda, sem
 * crescimento. Rodar: node tests/test_colonia_core.js */
var CC=require('../vendor/colonia-core.js');
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
function perto(a,b,tolPct){ return Math.abs(a-b)<=Math.abs(b)*tolPct/100; }
function f1(x){ return (Math.round(x*10)/10).toFixed(1); }

/* gerador de foto de placa: tudo é desenhado no PLANO DA PLACA (onde ela é um
   círculo de raio R) e projetado na imagem pela inclinação (razão b/a e ângulo) */
function placa(o){
  var w=o.w||800, h=o.h||600, cx=o.cx==null?w/2:o.cx, cy=o.cy==null?h/2:o.cy, R=o.R||260, parede=o.parede==null?7:o.parede;
  var razao=o.razao||1, ang=o.ang||0, co=Math.cos(ang), si=Math.sin(ang);
  var cor=Object.assign({fundo:[58,62,60], parede:[228,232,230], meio:[214,188,132], colonia:[246,244,238], zona:[222,214,190], disco:[168,150,105], reflexo:[255,255,255], tampa:[200,204,204]}, o.cor||{});
  var C=o.colonia||{r1:150,r2:150,ang:0,dx:0,dy:0}, cc=Math.cos(C.ang||0), cs=Math.sin(C.ang||0);
  var seed=o.seed||7; function rnd(){ seed=(seed*1103515245+12345)&0x7fffffff; return seed/0x7fffffff; }
  var px=new Uint8ClampedArray(w*h*4);
  function amostra(x,y){
    var dx=x-cx, dy=y-cy, u=dx*co+dy*si, v=(-dx*si+dy*co)/razao, rr=Math.sqrt(u*u+v*v);
    if(o.tampa && rr>=R+parede+6 && rr<R+parede+11) return cor.tampa;
    if(rr>=R+parede){
      if(o.vizinha){ var vx=x-o.vizinha.x, vy=y-o.vizinha.y, vr=Math.sqrt(vx*vx+vy*vy); if(vr<o.vizinha.r) return (vr<o.vizinha.r-7)?cor.meio:cor.parede; }
      return cor.fundo;
    }
    if(rr>=R) return cor.parede;
    if(o.reflexo){ var q=o.reflexo; if((u-q.u)*(u-q.u)+(v-q.v)*(v-q.v)<q.r*q.r) return cor.reflexo; }
    var uu=(u-(C.dx||0))*cc+(v-(C.dy||0))*cs, vv=-(u-(C.dx||0))*cs+(v-(C.dy||0))*cc, qd=(uu*uu)/(C.r1*C.r1)+(vv*vv)/(C.r2*C.r2);
    if(o.discoR && u*u+v*v<o.discoR*o.discoR) return cor.disco;
    if(o.caneta && Math.abs(v-o.caneta.v)<2.5 && u>o.caneta.u0 && u<o.caneta.u1) return [30,40,120];
    if(o.difusa && qd>1){
      /* micélio aéreo: a borda some aos poucos em ~difusa px */
      var dist=(Math.sqrt(qd)-1)*C.r1; if(dist<o.difusa){ var f=1-dist/o.difusa; return [cor.meio[0]+(cor.colonia[0]-cor.meio[0])*f*0.8, cor.meio[1]+(cor.colonia[1]-cor.meio[1])*f*0.8, cor.meio[2]+(cor.colonia[2]-cor.meio[2])*f*0.8]; }
    }
    if(qd<=1){
      if(o.zonas){ var anel=Math.floor(Math.sqrt(qd)*C.r1/o.zonas); if(anel%2===1 && Math.sqrt(qd)<0.92) return cor.zona; }
      return cor.colonia;
    }
    return cor.meio;
  }
  for(var y=0;y<h;y++) for(var x=0;x<w;x++){
    /* 2×2 sub-amostras: borda suave como numa foto */
    var s=[0,0,0];
    for(var sy=0;sy<2;sy++) for(var sx=0;sx<2;sx++){ var c=amostra(x+0.25+0.5*sx,y+0.25+0.5*sy); s[0]+=c[0]; s[1]+=c[1]; s[2]+=c[2]; }
    var j=4*(y*w+x), rz=o.ruido||0, luz=o.luz?(1-o.luz*(x/w-0.5)*2):1;
    px[j]=s[0]/4*luz+(rnd()-0.5)*2*rz; px[j+1]=s[1]/4*luz+(rnd()-0.5)*2*rz; px[j+2]=s[2]/4*luz+(rnd()-0.5)*2*rz; px[j+3]=255;
  }
  return {px:px, w:w, h:h, esperado:function(r){ return 2*r*90/(2*R); }};
}
function medir(o){ var P=placa(o); var t=Date.now(); var r=CC.medir(P.px,P.w,P.h,90); r.ms=Date.now()-t; r.P=P; return r; }
function linha(r){ return r.ok?(f1(r.colonia.d1Mm)+' × '+f1(r.colonia.d2Mm)+' mm (área '+f1(r.colonia.dAreaMm)+'), escala '+r.mmPorPx.toFixed(4)+' mm/px, '+r.ms+' ms'):('falhou: '+r.motivo); }

console.log('\n[1] colônia clara, redonda, placa de frente');
var r=medir({ruido:6});
console.log('        '+linha(r));
var esp=r.P.esperado(150);
ck(r.ok && perto(r.colonia.d1Mm,esp,1.5) && perto(r.colonia.d2Mm,esp,1.5),'Ø '+f1(esp)+' mm medido com erro ≤ 1,5% nos dois eixos');
ck(r.ok && perto(r.mmPorPx,90/520,1),'escala pela borda INTERNA da parede (90 mm = 520 px), não pela externa');
ck(r.ok && perto(r.colonia.dAreaMm,esp,1.5),'diâmetro de área equivalente confere');
ck(r.ok && r.confianca==='alta' && !r.avisos.length,'confiança alta, sem avisos');
ck(r.ms<3000,'mede em menos de 3 s ('+r.ms+' ms, 800×600)');

console.log('\n[2] colônia irregular (elíptica, girada 35°)');
r=medir({colonia:{r1:170,r2:120,ang:35*Math.PI/180}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(170),2) && perto(r.colonia.d2Mm,r.P.esperado(120),2),'eixo maior '+f1(r.P.esperado(170))+' e perpendicular '+f1(r.P.esperado(120))+' mm');
ck(r.ok && r.avisos.some(function(a){ return /irregular/.test(a); }),'avisa que a colônia é irregular');

console.log('\n[3] colônia escura num meio claro');
r=medir({cor:{colonia:[62,54,48], disco:[40,36,30]}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),1.5) && perto(r.colonia.d2Mm,r.P.esperado(150),1.5),'colônia escura medida igual');

console.log('\n[4] foto inclinada (placa vira elipse, razão 0,88, a 30°)');
r=medir({razao:0.88, ang:30*Math.PI/180, ruido:6});
console.log('        '+linha(r)+(r.ok?' · inclinação '+f1(r.placa.inclinacao)+'°':''));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),2.5) && perto(r.colonia.d2Mm,r.P.esperado(150),2.5),'a elipse da placa desfaz a inclinação: '+f1(r.P.esperado(150))+' mm nos dois eixos (±2,5%)');
ck(r.ok && r.avisos.some(function(a){ return /inclinada/.test(a); }),'avisa que corrigiu a inclinação');
var rSem=(function(){ var P=placa({razao:0.88, ang:30*Math.PI/180, ruido:6}); var E=CC.detectarPlaca(P.px,P.w,P.h).placa; return CC.medirComPlaca(P.px,P.w,P.h,90,CC.elipse(E.cx,E.cy,E.a,E.a,0)); })();
ck(rSem.ok && !perto(rSem.colonia.d2Mm,r.P.esperado(150),5),'sem a correção, o eixo encurtado sairia errado ('+f1(rSem.colonia.d2Mm)+' mm) — a correção importa');

console.log('\n[5] anéis de zonação e disco de outra cor');
r=medir({zonas:22, discoR:15, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),2) && perto(r.colonia.d2Mm,r.P.esperado(150),2),'os anéis e o disco ficam dentro da colônia: mede a borda de fora');

console.log('\n[6] reflexo solto no meio de cultura');
r=medir({reflexo:{u:-200,v:-60,r:18}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),1.5),'o reflexo não entra na colônia');

console.log('\n[7] tampa na foto (um aro a mais por fora)');
r=medir({tampa:true, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.mmPorPx,90/520,1.5) && perto(r.colonia.d1Mm,r.P.esperado(150),2),'o aro da tampa não vira a régua');

console.log('\n[8] colônia perto da parede, e colônia que tomou a placa');
r=medir({colonia:{r1:242,r2:242}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(242),2),'a 93% da placa ainda mede: '+f1(r.P.esperado(242))+' mm');
r=medir({colonia:{r1:247,r2:247}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(247),2) && r.colonia.chegouABorda && r.avisos.some(function(a){ return /Tomou a placa/.test(a); }),'a 95% (encostando na parede): mede '+f1(r.P.esperado(247))+' mm e lembra do "Tomou a placa"');
r=medir({colonia:{r1:262,r2:262}, ruido:6});
console.log('        '+(r.ok?linha(r):'não mede: '+r.motivo));
ck(!r.ok && r.uniforme && r.sugestao==='tomou','tomou a placa inteira: não inventa número, sugere "Tomou a placa"');

console.log('\n[9] sem crescimento: só o disco de 5 mm');
r=medir({colonia:{r1:14.4,r2:14.4}, discoR:0, ruido:4});
console.log('        '+linha(r));
ck(r.ok && Math.abs(r.colonia.d1Mm-5)<=0.8 && Math.abs(r.colonia.d2Mm-5)<=0.8,'mede o disco: ~5 mm (inibição total)');

console.log('\n[10] placa fora do centro da foto, menor e com mais ruído');
r=medir({cx:330, cy:330, R:190, colonia:{r1:100,r2:100}, ruido:14});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(100),2.5) && perto(r.colonia.d2Mm,r.P.esperado(100),2.5),'acha a placa onde ela estiver: '+f1(r.P.esperado(100))+' mm');

console.log('\n[10b] foto inclinada E com a tampa');
r=medir({razao:0.88, ang:-20*Math.PI/180, tampa:true, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),2.5) && perto(r.colonia.d2Mm,r.P.esperado(150),2.5),'inclinada e com a tampa: ainda '+f1(r.P.esperado(150))+' mm (±2,5%)');

console.log('\n[13] luz desigual (−15% a +15% de um lado ao outro)');
r=medir({luz:0.15, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),2.5) && perto(r.colonia.d2Mm,r.P.esperado(150),2.5),'luz desigual: '+f1(r.P.esperado(150))+' mm (±2,5%)');

console.log('\n[14] borda difusa (micélio aéreo sumindo em 10 px)');
r=medir({difusa:10, ruido:6});
console.log('        '+linha(r));
ck(r.ok && r.colonia.d1Mm>=r.P.esperado(150)*0.99 && r.colonia.d1Mm<=r.P.esperado(160)*1.01,'borda difusa: entre a colônia firme ('+f1(r.P.esperado(150))+') e o fim do micélio ('+f1(r.P.esperado(160))+' mm)');

console.log('\n[15] anotação de caneta no meio, perto da borda');
r=medir({caneta:{v:-200,u0:-90,u1:90}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(150),1.5) && perto(r.mmPorPx,90/520,1.5),'a caneta não vira colônia nem borda');

console.log('\n[16] outra placa aparecendo no canto da foto');
r=medir({cx:420, R:240, vizinha:{x:-120,y:300,r:260}, colonia:{r1:130,r2:130}, ruido:6});
console.log('        '+linha(r));
ck(r.ok && perto(r.colonia.d1Mm,r.P.esperado(130),2.5) && perto(r.colonia.d2Mm,r.P.esperado(130),2.5),'a placa do lado não confunde a régua: '+f1(r.P.esperado(130))+' mm');

console.log('\n[11] foto sem placa');
var vazio=new Uint8ClampedArray(400*300*4).fill(128);
var rv=CC.medir(vazio,400,300,90);
ck(!rv.ok && /bordas nítidas|borda da placa/.test(rv.motivo),'sem placa: diz o que fazer ("'+rv.motivo+'")');
ck(!CC.medir(placa({}).px,800,600,0).ok,'sem o Ø da placa no protocolo não há escala');

console.log('\n[12] à mão: borda por 3 toques e cruz por 4');
var c3=CC.circuloPor3([100,0],[0,100],[-100,0]);
ck(Math.abs(c3.cx)<1e-9 && Math.abs(c3.cy)<1e-9 && Math.abs(c3.r-100)<1e-9,'círculo por três pontos da borda');
ck(CC.circuloPor3([0,0],[1,1],[2,2])===null,'três pontos alinhados não definem borda');
var E=CC.placaPor3([400,40],[660,300],[400,560]);
var mp=CC.medirPontos(E,90,[[250,300],[550,300],[400,160],[400,440]]);
ck(Math.abs(mp.d1Mm-51.92)<0.05 && Math.abs(mp.d2Mm-48.46)<0.05,'cruz tocada: 300 px e 280 px numa placa de 520 px = 51,9 × 48,5 mm');
var Ei=CC.elipse(400,300,260,260*0.8,0);
var mi=CC.medirPontos(Ei,90,[[250,300],[550,300],[400,180],[400,420]]);
ck(Math.abs(mi.d1Mm-mi.d2Mm)<0.05 && Math.abs(mi.d1Mm-51.92)<0.05,'à mão também desfaz a inclinação: 240 px no eixo encurtado (×1/0,8) = 300 px');

var rP=medir({ruido:6});
var mP=CC.medirPontos({cx:rP.placa.cx, cy:rP.placa.cy, a:rP.placa.a, b:rP.placa.b, angulo:rP.placa.angulo},90,[[250,300],[550,300],[400,170],[400,430]]);
ck(mP && Math.abs(mP.d1Mm-51.92)<0.6 && Math.abs(mP.d2Mm-45)<0.6,'a placa guardada (só centro, eixos e ângulo) volta a servir de régua: '+(mP?mP.d1Mm.toFixed(1)+' × '+mP.d2Mm.toFixed(1):'—')+' mm');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
