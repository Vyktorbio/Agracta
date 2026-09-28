/* ============================================================================
   ColoniaCore — o diâmetro da colônia medido na foto da placa
   ----------------------------------------------------------------------------
   Na bancada o diâmetro se mede com régua, em cruz, placa por placa. Aqui a
   foto basta: a própria placa é a régua — o Ø interno declarado no protocolo
   (90 mm, por padrão) dá a escala em mm por pixel.
     1. BORDA DA PLACA. Cada ponto de borda da imagem vota no centro ao longo
        da sua normal (Hough pelo gradiente); o raio sai do histograma das
        distâncias ao centro. A parede da placa aparece como DUAS bordas
        próximas (externa e interna): fica a interna, que é o Ø do protocolo.
        Foto tirada um pouco de lado transforma o círculo em elipse — a elipse
        ajustada à borda desfaz a inclinação antes de medir.
     2. COLÔNIA. Duas cores (k-médias, k = 2): uma semeada perto do centro,
        onde está o disco, outra perto da borda, no meio de cultura. Fica a
        mancha ligada ao centro, com os buracos preenchidos (anéis de zonação,
        disco de outra cor).
     3. CRUZ. O eixo maior da mancha e o perpendicular, pelo centro de massa,
        mais o diâmetro de área equivalente para conferência.
   MOTOR PURO: recebe os pixels (RGBA) e devolve números, contornos e avisos.
   Sem DOM. Quem mostra a medida e pede a confirmação é o app.
   ============================================================================ */
(function(root){
  'use strict';
  var VERSAO='1.0.0';

  /* ---------- imagem ---------- */
  function luminancia(px, w, h){
    var n=w*h, g=new Float32Array(n);
    for(var i=0,j=0;i<n;i++,j+=4) g[i]=0.299*px[j]+0.587*px[j+1]+0.114*px[j+2];
    return g;
  }
  /* suavização binomial 1-2-1 separável: tira o granulado sem borrar a borda */
  function suavizar(g, w, h){
    var t=new Float32Array(w*h), o=new Float32Array(w*h), x, y, r;
    for(y=0;y<h;y++){ r=y*w; for(x=0;x<w;x++) t[r+x]=(g[r+(x>0?x-1:x)]+2*g[r+x]+g[r+(x<w-1?x+1:x)])/4; }
    for(y=0;y<h;y++){ var up=(y>0?y-1:y)*w, md=y*w, dn=(y<h-1?y+1:y)*w;
      for(x=0;x<w;x++) o[md+x]=(t[up+x]+2*t[md+x]+t[dn+x])/4; }
    return o;
  }
  /* Sobel + supressão de não-máximos: bordas de 1 pixel, com a direção */
  function bordas(g, w, h){
    var n=w*h, gx=new Float32Array(n), gy=new Float32Array(n), m=new Float32Array(n), mx=0, x, y, i;
    for(y=1;y<h-1;y++) for(x=1;x<w-1;x++){
      i=y*w+x;
      var a=g[i-w-1], b=g[i-w], c=g[i-w+1], d=g[i-1], f=g[i+1], k=g[i+w-1], l=g[i+w], q=g[i+w+1];
      var sx=(c+2*f+q)-(a+2*d+k), sy=(k+2*l+q)-(a+2*b+c), mm=Math.sqrt(sx*sx+sy*sy);
      gx[i]=sx; gy[i]=sy; m[i]=mm; if(mm>mx) mx=mm;
    }
    if(!(mx>0)) return {gx:gx, gy:gy, m:m, pts:[], max:0};
    /* limiar: o 88º percentil do módulo — só as bordas de verdade votam */
    var H=new Uint32Array(512), cnt=0;
    for(i=0;i<n;i++){ if(m[i]>0){ H[Math.min(511,(m[i]/mx*511)|0)]++; cnt++; } }
    var alvo=cnt*0.88, acc=0, lim=0;
    for(var b2=0;b2<512;b2++){ acc+=H[b2]; if(acc>=alvo){ lim=b2/511*mx; break; } }
    lim=Math.max(lim, mx*0.06);
    var pts=[];
    for(y=2;y<h-2;y++) for(x=2;x<w-2;x++){
      i=y*w+x; var mi=m[i]; if(mi<lim) continue;
      var dx=Math.round(gx[i]/mi), dy=Math.round(gy[i]/mi);
      if(m[i+dy*w+dx]>mi || m[i-dy*w-dx]>mi) continue;
      pts.push(i);
    }
    if(pts.length>25000){ pts.sort(function(p1,p2){ return m[p2]-m[p1]; }); pts.length=25000; }
    return {gx:gx, gy:gy, m:m, pts:pts, max:mx};
  }
  function caixa(a, w, h, r){
    /* média móvel separável de raio r */
    var t=new Float32Array(w*h), o=new Float32Array(w*h), x, y, s;
    for(y=0;y<h;y++){ var row=y*w; s=0;
      for(x=-r;x<=r;x++) s+=a[row+Math.min(w-1,Math.max(0,x))];
      for(x=0;x<w;x++){ t[row+x]=s; s+=a[row+Math.min(w-1,x+r+1)]-a[row+Math.max(0,x-r)]; } }
    for(x=0;x<w;x++){ s=0;
      for(y=-r;y<=r;y++) s+=t[Math.min(h-1,Math.max(0,y))*w+x];
      for(y=0;y<h;y++){ o[y*w+x]=s; s+=t[Math.min(h-1,y+r+1)*w+x]-t[Math.max(0,y-r)*w+x]; } }
    return o;
  }

  /* ---------- geometria ---------- */
  function circuloPor3(p1, p2, p3){
    var ax=p1[0], ay=p1[1], bx=p2[0], by=p2[1], cx=p3[0], cy=p3[1];
    var d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
    if(Math.abs(d)<1e-9) return null;
    var a2=ax*ax+ay*ay, b2=bx*bx+by*by, c2=cx*cx+cy*cy;
    var ux=(a2*(by-cy)+b2*(cy-ay)+c2*(ay-by))/d, uy=(a2*(cx-bx)+b2*(ax-cx)+c2*(bx-ax))/d;
    return {cx:ux, cy:uy, r:Math.sqrt((ax-ux)*(ax-ux)+(ay-uy)*(ay-uy))};
  }
  /* A placa como elipse: centro, semi-eixos a ≥ b e ângulo do eixo maior.
     O círculo é a elipse com a = b. */
  function elipse(cx, cy, a, b, ang){
    var e={cx:cx, cy:cy, a:a, b:b, angulo:ang||0};
    e.cos=Math.cos(e.angulo); e.sin=Math.sin(e.angulo);
    return e;
  }
  /* imagem → plano da placa (a elipse vira o círculo de raio a) */
  /* seno e cosseno do ângulo: da elipse montada aqui, ou calculados — a placa
     também chega de fora (guardada na foto, marcada à mão) */
  function cs(E){ return (E.cos!=null&&E.sin!=null)?[E.cos,E.sin]:[Math.cos(E.angulo||0),Math.sin(E.angulo||0)]; }
  function paraPlaca(E, x, y){
    var t=cs(E), dx=x-E.cx, dy=y-E.cy;
    return [dx*t[0]+dy*t[1], (-dx*t[1]+dy*t[0])*E.a/E.b];
  }
  function daPlaca(E, u, v){
    var t=cs(E); v=v*E.b/E.a;
    return [E.cx+u*t[0]-v*t[1], E.cy+u*t[1]+v*t[0]];
  }
  function resolver(M, v){
    /* eliminação de Gauss com pivô parcial (sistemas 5×5) */
    var n=v.length, A=M.map(function(r,i){ return r.slice().concat([v[i]]); });
    for(var c=0;c<n;c++){
      var p=c; for(var r=c+1;r<n;r++) if(Math.abs(A[r][c])>Math.abs(A[p][c])) p=r;
      if(Math.abs(A[p][c])<1e-12) return null;
      var tmp=A[c]; A[c]=A[p]; A[p]=tmp;
      for(r=c+1;r<n;r++){ var f=A[r][c]/A[c][c]; for(var k=c;k<=n;k++) A[r][k]-=f*A[c][k]; }
    }
    var x=new Array(n);
    for(r=n-1;r>=0;r--){ var s=A[r][n]; for(k=r+1;k<n;k++) s-=A[r][k]*x[k]; x[r]=s/A[r][r]; }
    return x;
  }
  /* Cônica A x² + B xy + C y² + D x + E y = 1 por mínimos quadrados, nos pontos
     já centrados e escalados; devolve a elipse, ou null se não for elipse. */
  function ajustarElipse(pts, cx0, cy0, esc){
    if(pts.length<8) return null;
    var M=[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]], v=[0,0,0,0,0];
    pts.forEach(function(p){
      var x=(p[0]-cx0)/esc, y=(p[1]-cy0)/esc, row=[x*x, x*y, y*y, x, y];
      for(var i=0;i<5;i++){ v[i]+=row[i]; for(var j=0;j<5;j++) M[i][j]+=row[i]*row[j]; }
    });
    var s=resolver(M, v); if(!s) return null;
    var A=s[0], B=s[1], C=s[2], D=s[3], F=s[4];
    if(!(B*B-4*A*C<0)) return null;
    var det=4*A*C-B*B, x0=(B*F-2*C*D)/det, y0=(B*D-2*A*F)/det;
    var k=1-(A*x0*x0+B*x0*y0+C*y0*y0+D*x0+F*y0);   /* valor que a forma quadrática atinge na borda */
    var tr=A+C, dif=Math.sqrt((A-C)*(A-C)+B*B), l1=(tr-dif)/2, l2=(tr+dif)/2;
    if(!(l1>0&&l2>0&&k>0)) return null;
    var a=Math.sqrt(k/l1), b=Math.sqrt(k/l2);
    /* eixo maior: autovetor do menor autovalor */
    var ang=(Math.abs(B)<1e-12)?(A<=C?0:Math.PI/2):Math.atan2(l1-A, B/2);
    return elipse(cx0+x0*esc, cy0+y0*esc, a*esc, b*esc, ang);
  }

  /* ---------- 1. a borda da placa ---------- */
  function detectarPlaca(px, w, h){
    var g=suavizar(luminancia(px,w,h),w,h), E=bordas(g,w,h), lado=Math.min(w,h);
    var rmin=Math.max(12,Math.round(0.16*lado)), rmax=Math.round(0.56*lado);
    if(E.pts.length<50) return {ok:false, motivo:'A foto não tem bordas nítidas: foque a placa e fotografe de novo.'};
    /* centro: votos ao longo da normal de cada borda */
    var acc=new Float32Array(w*h), pts=E.pts, k, i, x, y, r, s;
    for(k=0;k<pts.length;k++){
      i=pts[k]; x=i%w; y=(i-x)/w; var mm=E.m[i], ux=E.gx[i]/mm, uy=E.gy[i]/mm;
      for(s=-1;s<=1;s+=2){
        for(r=rmin;r<=rmax;r++){
          var X=Math.round(x+s*ux*r), Y=Math.round(y+s*uy*r);
          if(X<0||Y<0||X>=w||Y>=h) break;
          acc[Y*w+X]+=1;
        }
      }
    }
    var sm=caixa(acc,w,h,3), best=-1, bi=0;
    for(i=0;i<w*h;i++) if(sm[i]>best){ best=sm[i]; bi=i; }
    var cx=bi%w, cy=(bi-cx)/w;
    /* Numa foto inclinada a placa é elipse, e as normais da elipse não passam
       pelo centro: os votos se juntam nas cúspides da evoluta, a dezenas de
       pixels dele. A nuvem de votos, porém, é simétrica em torno do centro —
       o centro é o centróide dos votos altos, não o pico. */
    var raioBusca=0.3*lado;
    for(var it=0;it<3;it++){
      var sx=0, sy=0, sw=0, lim=0.55*best;
      for(y=Math.max(0,Math.floor(cy-raioBusca));y<=Math.min(h-1,Math.ceil(cy+raioBusca));y++)
        for(x=Math.max(0,Math.floor(cx-raioBusca));x<=Math.min(w-1,Math.ceil(cx+raioBusca));x++){
          var q=sm[y*w+x]; if(q<lim) continue;
          if((x-cx)*(x-cx)+(y-cy)*(y-cy)>raioBusca*raioBusca) continue;
          q-=lim; sx+=q*x; sy+=q*y; sw+=q;
        }
      if(sw>0){ cx=sx/sw; cy=sy/sw; }
    }
    /* raio: histograma das distâncias das bordas alinhadas com o raio */
    var H=new Float32Array(rmax+3);
    for(k=0;k<pts.length;k++){
      i=pts[k]; x=i%w; y=(i-x)/w;
      var dx=x-cx, dy=y-cy, dist=Math.sqrt(dx*dx+dy*dy); if(dist<rmin-1||dist>rmax+1) continue;
      var dot=(dx*E.gx[i]+dy*E.gy[i])/(dist*E.m[i]); if(Math.abs(dot)<0.9) continue;
      H[Math.round(dist)]+=1;
    }
    var Hs=new Float32Array(H.length);
    for(r=2;r<H.length-2;r++) Hs[r]=(H[r-2]+2*H[r-1]+3*H[r]+2*H[r+1]+H[r+2])/9;
    /* cobertura: fração da circunferência com borda naquele raio (±2 px) */
    var picos=[];
    for(r=Math.max(3,rmin);r<=Math.min(rmax,Hs.length-3);r++){
      var cov=(H[r-2]+H[r-1]+H[r]+H[r+1]+H[r+2])/(2*Math.PI*r);
      if(Hs[r]>=Hs[r-1] && Hs[r]>Hs[r+1] && cov>=0.35) picos.push({r:r, cov:cov});
    }
    if(!picos.length) return {ok:false, motivo:'Não achei a borda da placa: fotografe de cima, com a placa inteira no quadro.'};
    /* A parede aparece como bordas vizinhas (externa, interna — e a tampa, se
       estiver na foto): desce enquanto o próximo pico está colado no anterior
       (até 4% do raio) e fica com o de dentro, que é o Ø interno. */
    picos.sort(function(p1,p2){ return p2.r-p1.r; });
    var R=picos[0].r;
    for(k=1;k<picos.length;k++){ if(picos[k].r>=0.96*R) R=picos[k].r; else break; }
    /* Elipse. 1ª volta: em cada setor de 5°, as bordas entre 80% e 106% do
       raio, de fora para dentro, descendo enquanto a próxima está colada na
       anterior (até 4%) — a mesma regra da parede, setor a setor, que numa foto
       inclinada separa a borda interna da externa e da tampa. A janela é larga
       (78% a 120%) porque o raio achado pode ser o do eixo menor. 2ª volta: a
       borda mais perto da elipse ajustada. */
    var E0=elipse(cx,cy,R,R,0), aro=[];
    for(var volta=0;volta<2;volta++){
      var setores={};
      for(k=0;k<pts.length;k++){
        i=pts[k]; x=i%w; y=(i-x)/w;
        var pl=paraPlaca(E0,x,y), rr=Math.sqrt(pl[0]*pl[0]+pl[1]*pl[1]), rel=rr/E0.a;
        if(volta===0 ? (rel<0.78||rel>1.2) : Math.abs(rel-1)>0.035) continue;
        var ddx=x-E0.cx, ddy=y-E0.cy, dd=Math.sqrt(ddx*ddx+ddy*ddy); if(!(dd>0)) continue;
        if(Math.abs(ddx*E.gx[i]+ddy*E.gy[i])/(dd*E.m[i])<0.8) continue;
        var sec=Math.floor((Math.atan2(pl[1],pl[0])+Math.PI)/(2*Math.PI)*72)%72;
        (setores[sec]=setores[sec]||[]).push({rel:rel, p:[x,y]});
      }
      aro=Object.keys(setores).map(function(kk){
        var l=setores[kk];
        if(volta===1){ l.sort(function(p1,p2){ return Math.abs(p1.rel-1)-Math.abs(p2.rel-1); }); return l[0].p; }
        l.sort(function(p1,p2){ return p2.rel-p1.rel; });
        var esc=l[0];
        for(var z=1;z<l.length;z++){ if(l[z].rel>=0.96*esc.rel) esc=l[z]; else break; }
        return esc.p;
      });
      var fit=(aro.length>=24)?ajustarElipse(aro, E0.cx, E0.cy, E0.a):null;
      /* setor que pegou outra coisa (placa vizinha, bancada): fora, e ajusta de novo */
      if(fit){
        var bons=aro.filter(function(p){ var q=paraPlaca(fit,p[0],p[1]); return Math.abs(Math.sqrt(q[0]*q[0]+q[1]*q[1])/fit.a-1)<=0.03; });
        if(bons.length>=24 && bons.length<aro.length){ var fit2=ajustarElipse(bons, fit.cx, fit.cy, fit.a); if(fit2) fit=fit2; }
      }
      if(fit && fit.b/fit.a>0.55 && Math.abs(fit.a-E0.a)/E0.a<0.3) E0=fit; else if(volta===0) break;
    }
    return {ok:true, placa:E0, cobertura:aro.length/72, raioCirculo:R};
  }

  /* ---------- 2. a colônia ---------- */
  function mediana(arr){ if(!arr.length) return 0; var a=arr.slice().sort(function(p,q){ return p-q; }); return a[a.length>>1]; }
  function segmentar(px, w, h, E){
    var n=w*h, x, y, i, k, roi=0.965;
    var lab=new Int8Array(n).fill(-1), rn=new Float32Array(n);
    var minX=Math.max(0,Math.floor(E.cx-E.a-2)), maxX=Math.min(w-1,Math.ceil(E.cx+E.a+2));
    var minY=Math.max(0,Math.floor(E.cy-E.a-2)), maxY=Math.min(h-1,Math.ceil(E.cy+E.a+2));
    var anel=[[],[],[]], volta=[[],[],[]], disco=[[],[],[]];
    for(y=minY;y<=maxY;y++) for(x=minX;x<=maxX;x++){
      var p=paraPlaca(E,x,y), rr=Math.sqrt(p[0]*p[0]+p[1]*p[1])/E.a; i=y*w+x;
      if(rr>=roi) continue;
      rn[i]=rr; lab[i]=0;
      var alvo=(rr>0.935&&rr<0.962)?anel:(rr>0.07&&rr<0.15)?volta:(rr<0.045)?disco:null;
      if(alvo){ alvo[0].push(px[4*i]); alvo[1].push(px[4*i+1]); alvo[2].push(px[4*i+2]); }
    }
    function cor(l){ return [mediana(l[0]),mediana(l[1]),mediana(l[2])]; }
    function dc(a,b){ return Math.sqrt((a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1])+(a[2]-b[2])*(a[2]-b[2])); }
    /* sementes: o meio perto da borda; a colônia logo fora do disco — ou o
       próprio disco, quando a colônia não cresceu além dele */
    var cVolta=cor(volta), cDisco=cor(disco);
    /* o meio: no anel de fora, os pixels mais diferentes da colônia — com a
       colônia cobrindo boa parte do anel, a mediana dele seria colônia */
    var ids=anel[0].map(function(_,j){ return j; });
    ids.sort(function(p1,p2){ return dc([anel[0][p2],anel[1][p2],anel[2][p2]],cVolta)-dc([anel[0][p1],anel[1][p1],anel[2][p1]],cVolta); });
    ids=ids.slice(0,Math.max(5,Math.floor(ids.length*0.4)));
    var meio=[mediana(ids.map(function(j){ return anel[0][j]; })),mediana(ids.map(function(j){ return anel[1][j]; })),mediana(ids.map(function(j){ return anel[2][j]; }))];
    var col=(dc(cVolta,meio)>=25 || dc(cVolta,meio)>=dc(cDisco,meio))?cVolta:cDisco;
    var contraste=dc(col,meio);
    /* k-médias com duas cores */
    var c0=meio.slice(), c1=col.slice();
    for(var it=0;it<8;it++){
      var s0=[0,0,0,0], s1=[0,0,0,0];
      for(y=minY;y<=maxY;y+=2) for(x=minX+(y&2?1:0);x<=maxX;x+=2){
        i=y*w+x; if(lab[i]<0) continue;
        var j4=4*i, r0=px[j4], g0=px[j4+1], b0=px[j4+2];
        var d0=(r0-c0[0])*(r0-c0[0])+(g0-c0[1])*(g0-c0[1])+(b0-c0[2])*(b0-c0[2]);
        var d1=(r0-c1[0])*(r0-c1[0])+(g0-c1[1])*(g0-c1[1])+(b0-c1[2])*(b0-c1[2]);
        var s=(d1<d0)?s1:s0; s[0]+=r0; s[1]+=g0; s[2]+=b0; s[3]++;
      }
      if(s0[3]) c0=[s0[0]/s0[3],s0[1]/s0[3],s0[2]/s0[3]];
      if(s1[3]) c1=[s1[0]/s1[3],s1[1]/s1[3],s1[2]/s1[3]];
    }
    for(y=minY;y<=maxY;y++) for(x=minX;x<=maxX;x++){
      i=y*w+x; if(lab[i]<0) continue;
      var q4=4*i, rq=px[q4], gq=px[q4+1], bq=px[q4+2];
      lab[i]=((rq-c1[0])*(rq-c1[0])+(gq-c1[1])*(gq-c1[1])+(bq-c1[2])*(bq-c1[2]) < (rq-c0[0])*(rq-c0[0])+(gq-c0[1])*(gq-c0[1])+(bq-c0[2])*(bq-c0[2]))?1:0;
    }
    /* maioria 3×3: some o granulado */
    var lab2=new Int8Array(lab);
    for(y=minY+1;y<maxY;y++) for(x=minX+1;x<maxX;x++){
      i=y*w+x; if(lab[i]<0) continue;
      var um=0, tot=0;
      for(var dy=-1;dy<=1;dy++) for(var dx=-1;dx<=1;dx++){ var v=lab[i+dy*w+dx]; if(v>=0){ tot++; if(v===1) um++; } }
      lab2[i]=(um*2>tot)?1:0;
    }
    lab=lab2;
    /* DE FORA é o meio ligado à borda da região; a colônia é a mancha, ligada
       ao centro, de tudo o que não é de fora. Assim um anel de zonação da cor
       do meio, cercado pela colônia, continua sendo colônia — e um reflexo ou
       uma contaminação solta no meio fica de fora. */
    var pilha=new Int32Array(n), topo=0, fora=new Uint8Array(n), X, Y, nb, c, cxp, cyp, nx, ny;
    for(y=minY;y<=maxY;y++) for(x=minX;x<=maxX;x++){
      i=y*w+x; if(lab[i]!==0) continue;
      var naBorda=false;
      for(ny=-1;ny<=1&&!naBorda;ny++) for(nx=-1;nx<=1;nx++){ X=x+nx; Y=y+ny; if(X<0||Y<0||X>=w||Y>=h||lab[Y*w+X]<0){ naBorda=true; break; } }
      if(naBorda){ fora[i]=1; pilha[topo++]=i; }
    }
    while(topo){
      c=pilha[--topo]; cxp=c%w; cyp=(c-cxp)/w;
      for(ny=-1;ny<=1;ny++) for(nx=-1;nx<=1;nx++){
        if(!nx&&!ny) continue; X=cxp+nx; Y=cyp+ny; if(X<0||Y<0||X>=w||Y>=h) continue;
        nb=Y*w+X; if(!fora[nb] && lab[nb]===0){ fora[nb]=1; pilha[topo++]=nb; }
      }
    }
    var ci=Math.round(E.cy)*w+Math.round(E.cx), semente=-1;
    if(lab[ci]>=0 && !fora[ci]) semente=ci;
    else{
      var melhor=1e9;
      for(y=minY;y<=maxY;y++) for(x=minX;x<=maxX;x++){ i=y*w+x; if(lab[i]>=0 && !fora[i] && rn[i]<0.12 && rn[i]<melhor){ melhor=rn[i]; semente=i; } }
    }
    var comp=new Uint8Array(n), area=0;
    if(semente>=0){
      topo=0; pilha[topo++]=semente; comp[semente]=1;
      while(topo){
        c=pilha[--topo]; area++; cxp=c%w; cyp=(c-cxp)/w;
        for(ny=-1;ny<=1;ny++) for(nx=-1;nx<=1;nx++){
          if(!nx&&!ny) continue; X=cxp+nx; Y=cyp+ny; if(X<0||Y<0||X>=w||Y>=h) continue;
          nb=Y*w+X; if(!comp[nb] && lab[nb]>=0 && !fora[nb]){ comp[nb]=1; pilha[topo++]=nb; }
        }
      }
    }
    /* chegou à borda? fração do anel de fora da região coberta pela colônia */
    var anelTot=0, anelCol=0;
    for(y=minY;y<=maxY;y++) for(x=minX;x<=maxX;x++){ i=y*w+x; if(lab[i]>=0 && rn[i]>0.94){ anelTot++; if(comp[i]) anelCol++; } }
    return {mascara:comp, area:area, contraste:contraste, corColonia:col, corMeio:meio, borda:anelTot?anelCol/anelTot:0};
  }

  /* ---------- 3. a cruz ---------- */
  function cruz(mascara, w, h, E){
    var n=w*h, su=0, sv=0, cnt=0, i, p;
    var us=[], vs=[];
    for(i=0;i<n;i++){ if(!mascara[i]) continue; var x=i%w, y=(i-x)/w; p=paraPlaca(E,x,y); us.push(p[0]); vs.push(p[1]); su+=p[0]; sv+=p[1]; cnt++; }
    if(!cnt) return null;
    var mu=su/cnt, mv=sv/cnt, cuu=0, cvv=0, cuv=0;
    for(i=0;i<cnt;i++){ var du=us[i]-mu, dv=vs[i]-mv; cuu+=du*du; cvv+=dv*dv; cuv+=du*dv; }
    var th=0.5*Math.atan2(2*cuv, cuu-cvv), e1=[Math.cos(th),Math.sin(th)], e2=[-Math.sin(th),Math.cos(th)];
    var tol=0.75*Math.max(1,E.a/E.b);
    function extensao(e, ep){
      var lo=Infinity, hi=-Infinity;
      for(var k=0;k<cnt;k++){
        var du2=us[k]-mu, dv2=vs[k]-mv, t=du2*e[0]+dv2*e[1], s=du2*ep[0]+dv2*ep[1];
        if(Math.abs(s)<=tol){ if(t<lo) lo=t; if(t>hi) hi=t; }
      }
      if(lo===Infinity) return null;
      return {comp:hi-lo+1, p1:daPlaca(E,mu+e[0]*(lo-0.5),mv+e[1]*(lo-0.5)), p2:daPlaca(E,mu+e[0]*(hi+0.5),mv+e[1]*(hi+0.5))};
    }
    var a1=extensao(e1,e2), a2=extensao(e2,e1);
    if(!a1||!a2) return null;
    return {eixo1:a1, eixo2:a2, areaPlano:cnt*E.a/E.b, centro:daPlaca(E,mu,mv)};
  }

  /* ---------- medida completa ---------- */
  function mmPorPx(E, placaMm){ return placaMm/(2*E.a); }
  function medirComPlaca(px, w, h, placaMm, E, extra){
    extra=extra||{};
    var avisos=(extra.avisos||[]).slice(), esc=mmPorPx(E,placaMm);
    var S=segmentar(px,w,h,E);
    var inclin=Math.acos(Math.min(1,E.b/E.a))*180/Math.PI;
    if(E.b/E.a<0.8) avisos.push('Foto muito inclinada ('+Math.round(inclin)+'°): a correção perde precisão — fotografe de cima.');
    else if(E.b/E.a<0.97) avisos.push('Foto um pouco inclinada ('+Math.round(inclin)+'°): corrigida pela elipse da placa.');
    /* placa toda da mesma cor: ou a colônia tomou a placa, ou não há contraste
       para separar — número nenhum aqui seria medida */
    if(S.contraste<12) return {ok:false, uniforme:true, sugestao:'tomou', placa:E, mmPorPx:esc, avisos:avisos,
      motivo:'A placa está toda da mesma cor: se a colônia tomou a placa, use "Tomou a placa"; se não, meça à mão.'};
    if(S.contraste<18) avisos.push('Pouco contraste entre a colônia e o meio: confira o contorno verde.');
    var X=cruz(S.mascara,w,h,E);
    if(!X||!S.area) return {ok:false, motivo:'Não achei a colônia no centro da placa.', placa:E, mmPorPx:esc, avisos:avisos};
    var d1=X.eixo1.comp*esc, d2=X.eixo2.comp*esc;
    if(d2>d1){ var tmp=X.eixo1; X.eixo1=X.eixo2; X.eixo2=tmp; tmp=d1; d1=d2; d2=tmp; }
    var dArea=2*Math.sqrt(X.areaPlano/Math.PI)*esc;
    var chegou=S.borda>0.25;
    if(chegou) avisos.push('A colônia chegou à borda da placa: se ela tomou a placa, use "Tomou a placa".');
    if(d2>0 && d1/d2>1.3) avisos.push('Colônia irregular: os dois eixos diferem '+Math.round((d1/d2-1)*100)+'%.');
    var conf='alta';
    if((extra.cobertura!=null && extra.cobertura<0.6) || S.contraste<30 || E.b/E.a<0.9) conf='media';
    if((extra.cobertura!=null && extra.cobertura<0.35) || S.contraste<18 || E.b/E.a<0.8) conf='baixa';
    if(extra.cobertura!=null && extra.cobertura<0.6) avisos.unshift('Borda da placa pouco visível ('+Math.round(extra.cobertura*100)+'% do contorno): confira o círculo azul.');
    return {ok:true, versao:VERSAO, placaMm:placaMm, mmPorPx:esc,
      placa:{cx:E.cx, cy:E.cy, a:E.a, b:E.b, angulo:E.angulo, cos:E.cos, sin:E.sin, inclinacao:inclin, cobertura:extra.cobertura==null?null:extra.cobertura},
      colonia:{d1Mm:d1, d2Mm:d2, mediaMm:(d1+d2)/2, dAreaMm:dArea, eixos:[[X.eixo1.p1,X.eixo1.p2],[X.eixo2.p1,X.eixo2.p2]], centro:X.centro,
        areaPx:S.area, chegouABorda:chegou, contraste:S.contraste, mascara:S.mascara},
      avisos:avisos, confianca:conf};
  }
  function medir(px, w, h, placaMm){
    if(!(placaMm>0)) return {ok:false, motivo:'Informe o diâmetro interno da placa no protocolo: é ele que dá a escala.'};
    var D=detectarPlaca(px,w,h);
    if(!D.ok) return D;
    return medirComPlaca(px,w,h,placaMm,D.placa,{cobertura:D.cobertura});
  }
  /* Borda ajustada à mão: três toques na borda interna. */
  function placaPor3(p1, p2, p3){ var c=circuloPor3(p1,p2,p3); return c?elipse(c.cx,c.cy,c.r,c.r,0):null; }
  /* Cruz medida à mão: quatro toques (as pontas do eixo 1, depois do eixo 2),
     na escala e na correção de inclinação da placa. */
  function medirPontos(E, placaMm, pts){
    if(!E||!pts||pts.length<4) return null;
    var esc=mmPorPx(E,placaMm), q=pts.map(function(p){ return paraPlaca(E,p[0],p[1]); });
    function dd(a,b){ return Math.sqrt((a[0]-b[0])*(a[0]-b[0])+(a[1]-b[1])*(a[1]-b[1])); }
    var d1=dd(q[0],q[1])*esc, d2=dd(q[2],q[3])*esc;
    return {d1Mm:Math.max(d1,d2), d2Mm:Math.min(d1,d2), mediaMm:(d1+d2)/2, mmPorPx:esc};
  }

  var API={VERSAO:VERSAO, medir:medir, medirComPlaca:medirComPlaca, detectarPlaca:detectarPlaca,
    placaPor3:placaPor3, medirPontos:medirPontos, circuloPor3:circuloPor3, elipse:elipse,
    paraPlaca:paraPlaca, daPlaca:daPlaca, ajustarElipse:ajustarElipse};
  root.ColoniaCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
