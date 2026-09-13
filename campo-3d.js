/* "Ver no campo" — as parcelas na posição da grade, o tempo subindo em DAA real.
 *
 * CARREGADO SOB DEMANDA. Não está no index.html: quem trabalha no campo nunca
 * baixa nem interpreta este arquivo. O estudo-pagina.js o injeta no primeiro
 * clique, e o service worker o pré-carrega para funcionar offline depois.
 *
 * Recebe um estudo e nada mais. Sem estado global, sem supor o que está aberto.
 *
 * ONDE ESTA TELA PODERIA MENTIR, E COMO NÃO MENTE
 * -----------------------------------------------
 * 1. O eixo do tempo é DAA real (data da avaliação − dataInicio). Avaliações aos
 *    0, 7, 14 e 31 dias têm degraus desiguais; degraus iguais falsificariam a
 *    inclinação da curva e a AACPD.
 * 2. Ausência não é zero. Sem lançamento, a coluna SOME naquele instante em vez
 *    de desabar até o chão, e a interpolação não atravessa o buraco: faltando
 *    qualquer das duas pontas, o trecho não existe.
 * 3. A cor vem da escala da VARIÁVEL (_avEscala), nunca do máximo observado.
 *    Pelo máximo observado, o pior tratamento fica vermelho sempre — inclusive
 *    num estudo em que ninguém passou de 4% — e dois estudos ficam incomparáveis.
 * 4. O sentido inverte a COR, não o valor. Mortalidade alta é verde e continua
 *    sendo o número que foi medido.
 * 5. Escala (nota ordinal) avança em degraus, sem interpolar, e não oferece
 *    AACPD. Ver a nota sobre McKinney em valorNoTempo().
 * 6. O valor vem como texto do banco. Vírgula decimal é aceita, não-numérico é
 *    ausente, e NaN não chega à tela.
 * 7. Todo número exibido passa por arredondamento explícito.
 */
(function(w){
'use strict';
var d=w.document;

/* ---------------------------------------------------------------- leitura ---
   Tudo daqui lê do MESMO lugar de onde o painel do estudo lê hoje: as notas da
   avaliação, pela chave de parcela do app (_avRowKey: "T2R2"), com _avNota
   respeitando a compatibilidade das notas antigas por tratamento. O protótipo
   propunha "T2:B"; o formato real é este, e é o que está gravado. */
function chaveParcela(tratId,rep){
  return typeof w._avRowKey==='function'?w._avRowKey(tratId,rep):String(tratId)+'R'+String(rep);
}
function rotuloRep(rep){
  return typeof w._repLetter==='function'?w._repLetter(rep):String(rep);
}
/* Texto -> número, com vírgula decimal. Ausente e não-numérico viram null, que
   é o que a tela sabe desenhar; NaN não passa daqui. */
function numero(bruto){
  if(bruto==null)return null;
  var s=String(bruto).trim();
  if(s==='')return null;
  var n=parseFloat(s.replace(',','.'));
  return isFinite(n)?n:null;
}
function leValor(av,tratId,rep,variavel){
  var linha={key:chaveParcela(tratId,rep),tratId:tratId,rep:rep};
  var bruto=typeof w._avNota==='function'?w._avNota(av,linha,variavel)
                                         :((av&&av.notas||{})[linha.key]||{})[variavel];
  return numero(bruto);
}
function diasEntre(iso1,iso2){
  var a=Date.parse(String(iso1)+'T00:00:00Z'), b=Date.parse(String(iso2)+'T00:00:00Z');
  if(!isFinite(a)||!isFinite(b))return null;
  return Math.round((b-a)/86400000);
}

/* ------------------------------------------------------------- o modelo ---
   Monta, do estudo cru, tudo que a tela precisa: a grade, as avaliações com DAA
   real e a escala/sentido da variável. Separado do desenho de propósito — é
   isto que os testes exercitam, sem canvas. */
function modelo(st,variavel){
  var trats=(st&&Array.isArray(st.tratamentos)?st.tratamentos:[]).filter(Boolean);
  var reps=Math.max(1,parseInt(st&&st.numRepeticoes,10)||1);
  /* A grade sai do estudo e varia: 5×4, 6×3, o que estiver cadastrado. */
  var grade=[];
  trats.forEach(function(t,ti){
    for(var r=1;r<=reps;r++)grade.push({ti:ti,rep:r,tratId:t.id,chave:chaveParcela(t.id,r),repLabel:rotuloRep(r)});
  });

  var avs=(st&&Array.isArray(st.avaliacoes)?st.avaliacoes:[])
    .filter(function(a){return a&&typeof a==='object'&&(a.variaveis||[]).indexOf(variavel)>=0;})
    .map(function(a){return {av:a,id:a.id,data:a.data,daa:diasEntre(st.dataInicio,a.data)};})
    /* Sem data não há DAA, e sem DAA não há eixo do tempo: a avaliação fica de
       fora da vista e o aviso diz isso, em vez de virar um degrau inventado. */
    .filter(function(x){return x.daa!==null;})
    .sort(function(a,b){return a.daa-b.daa;});

  var fonte=avs.length?avs[avs.length-1].av:null;
  var escala=typeof w._avEscala==='function'?w._avEscala(fonte,variavel)
            :{min:0,max:100,definida:true,tipo:'pct',porque:''};
  var sentido=typeof w._avSentido==='function'?w._avSentido(fonte,variavel):'menor';
  var cfg=typeof w._avCfg==='function'?w._avCfg(fonte,variavel):{tipo:'pct',escalaMax:4};

  return {
    trats:trats, reps:reps, grade:grade, avs:avs, variavel:variavel,
    escala:escala, sentido:sentido, tipo:cfg.tipo, escalaMax:cfg.escalaMax,
    daaMax:avs.length?avs[avs.length-1].daa:0,
    ordinal:cfg.tipo==='escala',
    semData:(st&&st.avaliacoes||[]).filter(function(a){
      return a&&(a.variaveis||[]).indexOf(variavel)>=0&&diasEntre(st.dataInicio,a.data)===null;}).length
  };
}

/* Valor da parcela no instante t (em DAA).
   Ordinal: degrau, nunca interpolação. O valor gravado em notas para o tipo
   "escala" é o índice de McKinney (0 a 100) derivado das notas de 0 a escalaMax
   — contínuo na aparência, ordinal na origem. Interpolar entre dois índices
   inventa um estado de doença que ninguém observou, então aqui também é degrau,
   e a AACPD não é oferecida. */
function valorEm(m,p,t){
  var avs=m.avs, i;
  if(!avs.length)return null;
  /* No INSTANTE de uma avaliação vale o que ela mediu, e só ela. Sem esta
     primeira passada, parar o tempo em cima de uma avaliação devolvia o valor da
     ANTERIOR no caso ordinal, e devolvia vazio quando a anterior faltava — nos
     dois casos escondendo uma medição que existe. */
  for(i=0;i<avs.length;i++)
    if(Math.abs(t-avs[i].daa)<1e-9)return leValor(avs[i].av,p.tratId,p.rep,m.variavel);
  if(t<avs[0].daa)return leValor(avs[0].av,p.tratId,p.rep,m.variavel);
  if(t>avs[avs.length-1].daa)return leValor(avs[avs.length-1].av,p.tratId,p.rep,m.variavel);
  /* Ordinal: degrau. Vale a última avaliação já ocorrida, sem inventar estado
     intermediário nenhum entre uma nota e a seguinte. */
  if(m.ordinal){
    for(i=avs.length-1;i>=0;i--)
      if(avs[i].daa<=t)return leValor(avs[i].av,p.tratId,p.rep,m.variavel);
    return null;
  }
  for(i=0;i<avs.length-1;i++){
    if(t>avs[i].daa&&t<avs[i+1].daa){
      var a=leValor(avs[i].av,p.tratId,p.rep,m.variavel);
      var b=leValor(avs[i+1].av,p.tratId,p.rep,m.variavel);
      /* Buraco: faltando qualquer ponta, o trecho não existe. */
      if(a===null||b===null)return null;
      var vao=avs[i+1].daa-avs[i].daa;
      if(vao<=0)return a;
      return a+(b-a)*((t-avs[i].daa)/vao);
    }
  }
  return null;
}

/* AACPD por trapézios sobre os intervalos COMPLETOS. O trecho com ponta faltando
   é ignorado; não sobrando nenhum intervalo, não há AACPD — e a tela diz isso em
   vez de mostrar uma área menor calada. */
function aacpd(m,p){
  if(m.ordinal)return null;
  var soma=0,usados=0,pulados=0;
  for(var i=0;i<m.avs.length-1;i++){
    var a=leValor(m.avs[i].av,p.tratId,p.rep,m.variavel);
    var b=leValor(m.avs[i+1].av,p.tratId,p.rep,m.variavel);
    if(a===null||b===null){pulados++;continue;}
    soma+=((a+b)/2)*(m.avs[i+1].daa-m.avs[i].daa);
    usados++;
  }
  return usados?{valor:soma,intervalos:usados,pulados:pulados}:null;
}

/* Fração 0..1 do valor dentro da escala da variável, e quanto disso é RUIM.
   O sentido inverte a cor; o valor devolvido para exibição não muda. */
function fracao(m,v){
  if(!m.escala.definida||m.escala.max===null)return null;
  var vao=m.escala.max-m.escala.min;
  if(!(vao>0))return null;
  return Math.max(0,Math.min(1,(v-m.escala.min)/vao));
}
function fracaoRuim(m,v){
  var f=fracao(m,v);
  if(f===null)return null;
  return m.sentido==='maior'?1-f:f;
}

/* ------------------------------------------------------------------ cor ---
   Verde (melhor) -> âmbar -> vermelho (pior), sobre a escala da variável. */
var BOM=[76,139,43], MEIO=[224,160,32], RUIM=[201,64,60];
function mistura(a,b,f){
  return 'rgb('+Math.round(a[0]+(b[0]-a[0])*f)+','+Math.round(a[1]+(b[1]-a[1])*f)+','+Math.round(a[2]+(b[2]-a[2])*f)+')';
}
function corDe(fr){
  if(fr===null)return 'rgb(150,154,158)';        /* sem escala: cinza, não verde */
  var f=Math.max(0,Math.min(1,fr));
  return f<.5?mistura(BOM,MEIO,f/.5):mistura(MEIO,RUIM,(f-.5)/.5);
}
function sombra(c,k){
  var p=c.match(/\d+/g);
  return 'rgb('+Math.round(p[0]*k)+','+Math.round(p[1]*k)+','+Math.round(p[2]*k)+')';
}

/* ------------------------------------------------------------- números ---
   Todo número exibido passa por aqui. Nada de toFixed solto na tela. */
function mostra(v,casas){
  if(v==null||!isFinite(v))return '—';
  var n=Math.round(v*Math.pow(10,casas))/Math.pow(10,casas);
  return n.toLocaleString('pt-BR',{minimumFractionDigits:casas,maximumFractionDigits:casas});
}
function esc(v){
  return String(v==null?'':v).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});
}

w.AgCampo3D={modelo:modelo,valorEm:valorEm,aacpd:aacpd,fracao:fracao,fracaoRuim:fracaoRuim,
             numero:numero,leValor:leValor,diasEntre:diasEntre,corDe:corDe,mostra:mostra};

/* =========================================================== a tela ===== */
var estado=null;

function fechar(){
  var ov=d.getElementById('campo3dOvl');
  if(ov)ov.hidden=true;
  if(estado){estado.vivo=false;if(estado.foco&&estado.foco.isConnected)estado.foco.focus();}
  estado=null;
}

/* s = estudo PROJETADO do Conhecimento (nomes já cegados quando é o caso).
   st = estudo cru, de onde saem os valores por parcela. */
function abrir(s,st,op){
  op=op||{};
  if(!st||!Array.isArray(st.avaliacoes)||!st.avaliacoes.length)return;
  var vars=[];
  st.avaliacoes.forEach(function(a){(a&&a.variaveis||[]).forEach(function(v){if(vars.indexOf(v)<0)vars.push(v);});});
  if(!vars.length)return;
  var variavel=vars.indexOf(op.variavel)>=0?op.variavel:vars[0];

  var ov=d.getElementById('campo3dOvl');
  if(!ov){
    ov=d.createElement('div');ov.id='campo3dOvl';ov.className='c3-overlay';
    ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
    ov.setAttribute('aria-label','Ver no campo');
    d.body.appendChild(ov);
  }
  ov.hidden=false;
  estado={s:s,st:st,vars:vars,variavel:variavel,t:0,rot:34*Math.PI/180,rodando:false,
          sel:null,vivo:true,foco:d.activeElement,ultimo:0,alvos:[]};
  /* A avaliação herdada do painel vira o instante inicial: quem já escolheu uma
     avaliação lá não escolhe de novo aqui. */
  var m=modelo(st,variavel);
  if(op.avaliacao){
    var achou=m.avs.find(function(x){return x.id===op.avaliacao;});
    if(achou)estado.t=achou.daa;
  }else if(m.avs.length)estado.t=m.avs[m.avs.length-1].daa;
  pintar();
  var b=ov.querySelector('[data-c3="fechar"]');if(b)b.focus();
}

function pintar(){
  var ov=d.getElementById('campo3dOvl');if(!ov||!estado)return;
  var m=modelo(estado.st,estado.variavel);
  estado.m=m;
  var s=estado.s;
  var avisos=[];
  if(!m.avs.length)avisos.push('Nenhuma avaliação desta variável tem data cadastrada, então não há eixo de tempo para montar.');
  if(m.semData)avisos.push(m.semData+' avaliação(ões) sem data ficaram de fora: sem data não há DAA.');
  if(!m.escala.definida)avisos.push('Esta variável está sem escala definida — '+m.escala.porque+'. As colunas saem cinza e com altura igual: a tela não inventa um máximo.');
  if(m.ordinal)avisos.push('Escala ordinal: o tempo avança em degraus, sem interpolar, e a AACPD não se aplica. O valor gravado é o índice de McKinney (0 a 100) derivado das notas de 0 a '+mostra(m.escalaMax,0)+'.');

  ov.innerHTML='<section class="c3-shell"><header class="c3-head">'+
    '<div><p class="c3-eyebrow">VER NO CAMPO</p><h2>'+esc(s.codigo)+'</h2>'+
    '<p class="c3-sub">'+esc(s.cultura||'Sem cultura')+' · '+esc(s.alvo||'Sem alvo')+' · '+
    m.trats.length+' tratamentos × '+m.reps+' repetições</p></div>'+
    '<button type="button" class="c3-btn" data-c3="fechar">Fechar ×</button></header>'+
    '<div class="c3-controles"><label>Variável<select data-c3="variavel">'+
      estado.vars.map(function(v){return '<option value="'+esc(v)+'"'+(v===estado.variavel?' selected':'')+'>'+esc(v)+'</option>';}).join('')+
    '</select></label></div>'+
    '<canvas id="c3cv" width="700" height="380" aria-label="Vista do campo: cada coluna é uma parcela na posição da grade; a altura e a cor mostram '+esc(estado.variavel)+'."></canvas>'+
    '<div class="c3-tempo"><button type="button" class="c3-btn acao" data-c3="rodar">'+(estado.rodando?'Parar':'Rodar')+'</button>'+
      '<input type="range" data-c3="tempo" min="0" max="'+(m.daaMax||0)+'" step="0.5" value="'+estado.t+'" aria-label="Dias após a aplicação">'+
      '<span class="c3-daa">'+mostra(estado.t,0)+' DAA</span></div>'+
    '<div class="c3-tempo"><label for="c3rot">Girar</label>'+
      '<input id="c3rot" type="range" data-c3="girar" min="0" max="360" step="1" value="'+Math.round(((estado.rot*180/Math.PI)%360+360)%360)+'"></div>'+
    legenda(m)+
    '<div class="c3-painel" id="c3painel">'+painel(m)+'</div>'+
    avisos.map(function(a){return '<p class="c3-nota">'+esc(a)+'</p>';}).join('')+
    '<p class="c3-nota">Marcas das avaliações no eixo do tempo: '+
      (m.avs.length?m.avs.map(function(x){return mostra(x.daa,0)+' DAA';}).join(' · '):'nenhuma')+
      '. O espaçamento é o real, em dias.</p>'+
    '</section>';
  ligarCanvas();
  if(!estado.laco){estado.laco=true;w.requestAnimationFrame(laco);}
}

function legenda(m){
  if(!m.escala.definida)
    return '<div class="c3-legenda"><span class="c3-chip"><i style="background:rgb(150,154,158)"></i>sem escala definida</span>'+
           '<span class="c3-chip"><i class="c3-vazio"></i>sem avaliação</span></div>';
  var bom=m.sentido==='menor'?m.escala.min:m.escala.max;
  var mau=m.sentido==='menor'?m.escala.max:m.escala.min;
  return '<div class="c3-legenda">'+
    '<span class="c3-chip"><i style="background:rgb(76,139,43)"></i>'+mostra(bom,0)+' — melhor</span>'+
    '<span class="c3-chip"><i style="background:rgb(224,160,32)"></i>intermediário</span>'+
    '<span class="c3-chip"><i style="background:rgb(201,64,60)"></i>'+mostra(mau,0)+' — pior</span>'+
    '<span class="c3-chip"><i class="c3-vazio"></i>sem avaliação</span>'+
    '<span class="c3-chip">'+(m.sentido==='maior'?'mais é melhor':'menos é melhor')+'</span></div>';
}

function painel(m){
  if(!estado.sel)
    return '<p class="c3-onde">Nenhuma parcela selecionada</p><p class="c3-valor">—</p>'+
           '<p class="c3-nota">Toque numa coluna para ver o valor e a AACPD daquela parcela.</p>';
  var p=estado.sel, t=m.trats[p.ti]||{id:p.tratId,produto:''};
  var proj=(estado.s.tratamentos||[]).find(function(x){return x.id===p.tratId;});
  /* O NOME do produto sai da projeção do Conhecimento, que já aplica o
     cegamento; o estudo cru entra só com os valores por parcela. */
  var nome=proj?proj.produto:'';
  var v=valorEm(m,p,estado.t);
  var h='<p class="c3-onde">'+esc(p.tratId)+(nome?' · '+esc(nome):'')+' · repetição '+esc(p.repLabel)+
        ' · '+mostra(estado.t,0)+' DAA</p>';
  if(v===null)
    return h+'<p class="c3-valor">sem avaliação</p><p class="c3-nota">Esta parcela não foi avaliada neste instante. '+
           'Ausência não é zero — a coluna some em vez de ir ao chão, e a interpolação não atravessa o buraco.</p>';
  h+='<p class="c3-valor">'+mostra(v,m.ordinal?0:1)+(m.escala.definida&&m.escala.max===100?'%':'')+'</p>';
  if(m.ordinal)return h+'<p class="c3-nota">Escala ordinal: não se interpola entre notas, e a AACPD não se aplica.</p>';
  var q=aacpd(m,p);
  h+='<p class="c3-nota">'+(q===null
      ? 'AACPD indisponível: não sobrou nenhum intervalo com as duas pontas lançadas nesta parcela.'
      : 'AACPD da parcela: '+mostra(q.valor,0)+' · '+q.intervalos+' intervalo(s) usado(s)'+
        (q.pulados?' · '+q.pulados+' ignorado(s) por falta de lançamento':'')+
        ' · '+(m.sentido==='maior'?'mais é melhor':'menos é melhor'))+'</p>';
  return h;
}

/* ------------------------------------------------------------- desenho ---
   Canvas 2D com projeção própria. Sem biblioteca. */
var TILT=.55, HMAX=26, PW=3, PL=5, SX=4.4, SY=6.8, LW=700, LH=380, PAD=26;
function ligarCanvas(){
  var cv=d.getElementById('c3cv');if(!cv)return;
  estado.cv=cv;estado.ctx=cv.getContext('2d');
  var dpr=w.devicePixelRatio||1;
  LW=cv.clientWidth||700;
  cv.width=LW*dpr;cv.height=LH*dpr;
  estado.ctx.setTransform(dpr,0,0,dpr,0,0);
}
/* Projeção em dois tempos: primeiro a rotação crua, depois escala e deslocamento
   calculados a partir da cena INTEIRA. Com a escala fixa, girar o campo jogava
   metade dele para fora do quadro e os rótulos dos tratamentos sumiam — o
   desenho continuava bonito, e faltando tratamento. */
function prjCru(rot,x,y,z){
  var si=Math.sin(rot), co=Math.cos(rot);
  var rx=x*co-y*si, ry=x*si+y*co;
  return [rx, -(ry*TILT+z*.62), ry];
}
/* Enquadra o chão e a coluna mais alta possível, com folga para os rótulos. */
function enquadrar(m){
  var larg=m.trats.length*SX, alt=m.reps*SY, ox=-larg/2, oy=-alt/2;
  var xs=[],ys=[];
  [[ox,oy],[ox+larg,oy],[ox+larg,oy+alt],[ox,oy+alt]].forEach(function(c){
    [0,HMAX].forEach(function(z){
      var p=prjCru(estado.rot,c[0],c[1],z);xs.push(p[0]);ys.push(p[1]);
    });
  });
  /* Os rótulos moram para fora da borda do chão: entram no cálculo, senão o
     enquadramento os deixa de fora exatamente quando o campo é largo. */
  [[ox-2.6,oy-2.6],[ox+larg+2.6,oy+alt+2.6],[ox-2.6,oy+alt+2.6],[ox+larg+2.6,oy-2.6]].forEach(function(c){
    var p=prjCru(estado.rot,c[0],c[1],0);xs.push(p[0]);ys.push(p[1]);
  });
  var minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs);
  var minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
  var esc=Math.min((LW-2*PAD)/Math.max(1e-6,maxX-minX),(LH-2*PAD)/Math.max(1e-6,maxY-minY));
  return {esc:esc, ox:ox, oy:oy, larg:larg, alt:alt,
          dx:PAD-minX*esc+((LW-2*PAD)-(maxX-minX)*esc)/2,
          dy:PAD-minY*esc+((LH-2*PAD)-(maxY-minY)*esc)/2};
}
function prj(m,x,y,z){
  var q=estado.quadro, p=prjCru(estado.rot,x,y,z);
  return [q.dx+p[0]*q.esc, q.dy+p[1]*q.esc, p[2]];
}
function poli(ctx,p,preencher,traco,esp){
  ctx.beginPath();ctx.moveTo(p[0][0],p[0][1]);
  for(var i=1;i<p.length;i++)ctx.lineTo(p[i][0],p[i][1]);
  ctx.closePath();
  if(preencher){ctx.fillStyle=preencher;ctx.fill();}
  if(traco){ctx.strokeStyle=traco;ctx.lineWidth=esp||1;ctx.stroke();}
}
function desenhar(){
  if(!estado||!estado.ctx||!estado.m)return;
  var ctx=estado.ctx, m=estado.m;
  ctx.clearRect(0,0,LW,LH);
  estado.alvos=[];
  estado.quadro=enquadrar(m);
  var larg=estado.quadro.larg, alt=estado.quadro.alt, ox=estado.quadro.ox, oy=estado.quadro.oy;
  poli(ctx,[prj(m,ox,oy,0),prj(m,ox+larg,oy,0),prj(m,ox+larg,oy+alt,0),prj(m,ox,oy+alt,0)],
       'rgba(26,28,30,0.045)','rgba(26,28,30,0.18)',1);

  var colunas=m.grade.map(function(p){
    var x0=ox+p.ti*SX, y0=oy+(p.rep-1)*SY;
    return {p:p,v:valorEm(m,p,estado.t),x0:x0,x1:x0+PW,y0:y0,y1:y0+PL,
            prof:prj(m,x0+PW/2,y0+PL/2,0)[2]};
  }).sort(function(a,b){return b.prof-a.prof;});

  colunas.forEach(function(o){
    var base=[prj(m,o.x0,o.y0,0),prj(m,o.x1,o.y0,0),prj(m,o.x1,o.y1,0),prj(m,o.x0,o.y1,0)];
    var marcada=estado.sel&&estado.sel.chave===o.p.chave;
    if(o.v===null){
      /* Ausência: contorno tracejado no chão, altura nenhuma. Não é zero, é vazio. */
      ctx.setLineDash([3,3]);
      poli(ctx,base,null,marcada?'#1a1c1e':'rgba(26,28,30,0.30)',marcada?1.5:1);
      ctx.setLineDash([]);
      estado.alvos.push({o:o,p:base});
      return;
    }
    var fr=fracao(m,o.v);
    /* Sem escala, altura fixa: a altura mentiria tanto quanto a cor. */
    var h=(fr===null?.45:Math.max(.12,fr))*HMAX;
    var c=corDe(fracaoRuim(m,o.v));
    var arestas=[[[o.x0,o.y0],[o.x1,o.y0]],[[o.x1,o.y0],[o.x1,o.y1]],
                 [[o.x1,o.y1],[o.x0,o.y1]],[[o.x0,o.y1],[o.x0,o.y0]]];
    arestas.map(function(e,i){
      return {e:e,i:i,prof:prj(m,(e[0][0]+e[1][0])/2,(e[0][1]+e[1][1])/2,0)[2]};
    }).sort(function(a,b){return b.prof-a.prof;}).forEach(function(f){
      poli(ctx,[prj(m,f.e[0][0],f.e[0][1],0),prj(m,f.e[1][0],f.e[1][1],0),
                prj(m,f.e[1][0],f.e[1][1],h),prj(m,f.e[0][0],f.e[0][1],h)],
           sombra(c,f.i%2===0?.74:.58),marcada?'#1a1c1e':null,1.5);
    });
    var topo=[prj(m,o.x0,o.y0,h),prj(m,o.x1,o.y0,h),prj(m,o.x1,o.y1,h),prj(m,o.x0,o.y1,h)];
    poli(ctx,topo,c,marcada?'#1a1c1e':null,1.5);
    estado.alvos.push({o:o,p:topo});
  });

  ctx.fillStyle='#4a4f55';
  ctx.font='500 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  m.trats.forEach(function(t,ti){
    var p=prj(m,ox+ti*SX+PW/2,oy-2.2,0);
    ctx.fillText(String(t.id),p[0],p[1]);
  });
  /* A repetição também tem nome: sem ela a grade vira um bloco anônimo e não dá
     para conferir a parcela selecionada contra a planilha de campo. */
  for(var r=1;r<=m.reps;r++){
    var q=prj(m,ox-2.2,oy+(r-1)*SY+PL/2,0);
    ctx.fillText(rotuloRep(r),q[0],q[1]);
  }
  ctx.textBaseline='alphabetic';
}
function laco(ts){
  if(!estado||!estado.vivo){if(estado)estado.laco=false;return;}
  var dt=estado.ultimo?(ts-estado.ultimo)/1000:0;
  estado.ultimo=ts;
  if(estado.rodando&&estado.m&&estado.m.daaMax>0){
    estado.t+=dt*(estado.m.daaMax/6);
    if(estado.t>estado.m.daaMax)estado.t=0;
    sincronizarTempo();
  }
  desenhar();
  w.requestAnimationFrame(laco);
}
function sincronizarTempo(){
  var ov=d.getElementById('campo3dOvl');if(!ov)return;
  var r=ov.querySelector('[data-c3="tempo"]');if(r)r.value=estado.t;
  var lbl=ov.querySelector('.c3-daa');if(lbl)lbl.textContent=mostra(estado.t,0)+' DAA';
  var pn=d.getElementById('c3painel');if(pn&&estado.m)pn.innerHTML=painel(estado.m);
}
function dentro(px,py,p){
  var d2=false;
  for(var i=0,j=p.length-1;i<p.length;j=i++){
    if((p[i][1]>py)!==(p[j][1]>py)&&
       px<(p[j][0]-p[i][0])*(py-p[i][1])/(p[j][1]-p[i][1])+p[i][0])d2=!d2;
  }
  return d2;
}

/* --------------------------------------------------------- interações --- */
var arrastando=false,ultX=0,andou=0;
d.addEventListener('pointerdown',function(ev){
  if(!estado||!ev.target.closest||!ev.target.closest('#c3cv'))return;
  arrastando=true;andou=0;ultX=ev.clientX;
});
d.addEventListener('pointermove',function(ev){
  if(!arrastando||!estado)return;
  var dx=ev.clientX-ultX;andou+=Math.abs(dx);ultX=ev.clientX;
  estado.rot+=dx*.012;
  var ov=d.getElementById('campo3dOvl');
  if(ov){var r=ov.querySelector('[data-c3="girar"]');if(r)r.value=Math.round(((estado.rot*180/Math.PI)%360+360)%360);}
});
d.addEventListener('pointerup',function(ev){
  if(!arrastando||!estado){arrastando=false;return;}
  arrastando=false;
  if(andou>6||!estado.cv)return;
  var r=estado.cv.getBoundingClientRect();
  var px=(ev.clientX-r.left)*(LW/r.width), py=(ev.clientY-r.top)*(LH/r.height);
  for(var i=estado.alvos.length-1;i>=0;i--){
    if(dentro(px,py,estado.alvos[i].p)){estado.sel=estado.alvos[i].o.p;sincronizarTempo();return;}
  }
  estado.sel=null;sincronizarTempo();
});
d.addEventListener('input',function(ev){
  if(!estado||!ev.target.dataset)return;
  var k=ev.target.dataset.c3;
  if(k==='tempo'){estado.t=parseFloat(ev.target.value)||0;sincronizarTempo();}
  else if(k==='girar')estado.rot=(parseFloat(ev.target.value)||0)*Math.PI/180;
});
d.addEventListener('change',function(ev){
  if(!estado||!ev.target.dataset||ev.target.dataset.c3!=='variavel')return;
  estado.variavel=ev.target.value;estado.sel=null;estado.t=0;pintar();
});
d.addEventListener('click',function(ev){
  if(!estado)return;
  var b=ev.target.closest&&ev.target.closest('#campo3dOvl [data-c3]');if(!b)return;
  if(b.dataset.c3==='fechar')return fechar();
  if(b.dataset.c3==='rodar'){estado.rodando=!estado.rodando;b.textContent=estado.rodando?'Parar':'Rodar';}
});
d.addEventListener('keydown',function(ev){
  var ov=d.getElementById('campo3dOvl');
  if(!ov||ov.hidden||ev.key!=='Escape')return;
  ev.preventDefault();fechar();
});

w.abrirCampo3D=abrir;
})(window);
