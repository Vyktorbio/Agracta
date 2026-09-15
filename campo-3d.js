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

/* TRAJETÓRIA — o modo "Histórico": o eixo vertical é o TEMPO, não o valor.
 *
 * Devolve os trechos entre avaliações consecutivas, com a altura de cada um
 * proporcional aos DIAS REAIS que ele cobre. É a mesma exigência do outro modo
 * vista de outro ângulo: num ensaio com avaliações aos 0, 7, 14 e 31 dias, o
 * último trecho ocupa 17/31 da torre. Trechos de altura igual desenhariam um
 * ensaio que não existiu.
 *
 * Trecho com qualquer das pontas faltando NÃO entra: vira um buraco na torre,
 * que é exatamente o que aconteceu no campo. Emendar por cima esconderia a
 * falta, e é a falta que o revisor precisa enxergar.
 *
 * `pontos` são as medições: só elas foram observadas. O que está entre duas
 * medições é interpolação — modelo, não dado — e a tela marca a diferença.
 */
function trajetoria(m,p){
  var avs=m.avs, trechos=[], pontos=[], i;
  if(!avs.length)return {trechos:trechos,pontos:pontos,vazios:[],vao:0,buracos:0};
  var vao=avs[avs.length-1].daa-avs[0].daa;
  for(i=0;i<avs.length;i++){
    var v=leValor(avs[i].av,p.tratId,p.rep,m.variavel);
    pontos.push({daa:avs[i].daa,valor:v,
                 z:vao>0?(avs[i].daa-avs[0].daa)/vao:0, avId:avs[i].id});
  }
  var buracos=0, vazios=[];
  for(i=0;i<avs.length-1;i++){
    var a=pontos[i].valor, b=pontos[i+1].valor;
    if(a===null||b===null){
      buracos++;
      /* O trecho que falta também é devolvido, com a altura que ele OCUPARIA.
         Sem isso a torre de uma parcela mal lançada vira um toco perto do chão,
         que as torres inteiras escondem — a parcela com problema some justo da
         vista de quem foi procurar problema. */
      vazios.push({daa0:avs[i].daa,daa1:avs[i+1].daa,z0:pontos[i].z,z1:pontos[i+1].z,
                   dias:avs[i+1].daa-avs[i].daa});
      continue;
    }
    trechos.push({daa0:avs[i].daa,daa1:avs[i+1].daa,v0:a,
                  /* Ordinal não caminha entre notas: o trecho inteiro vale a
                     nota de baixo, e o salto acontece na medição seguinte. */
                  v1:m.ordinal?a:b,
                  z0:pontos[i].z,z1:pontos[i+1].z,
                  dias:avs[i+1].daa-avs[i].daa});
  }
  return {trechos:trechos,pontos:pontos,vazios:vazios,vao:vao,buracos:buracos};
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

/* ----------------------------------------------------------------- eixo ---
   A altura sempre significou alguma coisa e nunca dizia quanto: dava para ver
   que uma coluna é maior que a outra, não QUE VALOR ela tem. Estas marcas são a
   régua da altura — e ela muda de assunto com o modo, porque a altura muda:

     Estado no dia   altura = VALOR      → marcas na escala da variável
     Histórico 3D    altura = TEMPO      → marcas em DAA

   Sem escala definida não há régua no modo dia: ali a altura já é fixa por
   decisão (ver desenhar()), e uma régua sugeriria uma medida que não existe. */
function eixo(m,modo){
  if(modo==='historico'){
    if(!(m.daaMax>0))return null;
    return {titulo:'DAA',marcas:[0,.25,.5,.75,1].map(function(f){
      return {f:f,v:m.daaMax*f,texto:mostra(m.daaMax*f,0)};})};
  }
  if(!m.escala.definida||m.escala.max===null)return null;
  var vao=m.escala.max-m.escala.min;
  if(!(vao>0))return null;
  return {titulo:m.tipo==='pct'?'%':(m.tipo==='escala'?'índice':''),
    marcas:[0,.25,.5,.75,1].map(function(f){
      var v=m.escala.min+vao*f;
      return {f:f,v:v,texto:mostra(v,vao<5?1:0)};})};
}

/* ------------------------------------------------------------------ cor ---
   Verde (melhor) -> âmbar -> vermelho (pior), sobre a escala da variável.

   A cor anda em FAIXAS, não em degradê contínuo. O degradê parecia mais fino e
   era menos legível: entre duas parcelas de 31 % e 36 % a diferença de tom não
   se enxerga, e ninguém consegue dizer, olhando, em que altura da escala uma
   coluna está. Cinco faixas dão nome ao que se vê — e a legenda mostra os
   cortes em número, porque faixa sem corte declarado é classificação secreta.

   A PRECISÃO NÃO SE PERDE: quem continua contínua é a ALTURA. A coluna sobe no
   valor exato e a cor diz em que faixa ele caiu; clicando, o painel mostra o
   número. Cor categórica com altura contínua lê melhor que as duas contínuas. */
var BOM=[76,139,43], MEIO=[224,160,32], RUIM=[201,64,60];
var NFAIXAS=5;
function mistura(a,b,f){
  return 'rgb('+Math.round(a[0]+(b[0]-a[0])*f)+','+Math.round(a[1]+(b[1]-a[1])*f)+','+Math.round(a[2]+(b[2]-a[2])*f)+')';
}
function corContinua(f){
  return f<.5?mistura(BOM,MEIO,f/.5):mistura(MEIO,RUIM,(f-.5)/.5);
}
/* As faixas saem da ESCALA da variável, em quintos — nunca de cortes fixos como
   5/20/40/60, que valeriam só para severidade em porcentagem e virariam uma
   classificação inventada em qualquer outra variável. Cada faixa mostra os seus
   limites na legenda. */
function faixas(m){
  if(!m.escala.definida||m.escala.max===null)return null;
  var vao=m.escala.max-m.escala.min;
  if(!(vao>0))return null;
  var out=[];
  for(var i=0;i<NFAIXAS;i++){
    var f0=i/NFAIXAS, f1=(i+1)/NFAIXAS;
    /* A cor vem do MEIO da faixa na mesma rampa de sempre: quantiza o que já
       existia, em vez de estrear uma paleta. */
    var meio=(f0+f1)/2;
    out.push({de:m.escala.min+vao*f0, ate:m.escala.min+vao*f1,
              f0:f0, f1:f1,
              cor:corContinua(m.sentido==='maior'?1-meio:meio)});
  }
  return out;
}
/* Índice da faixa de um valor. O topo da escala pertence à última faixa — sem
   isso, o pior valor possível cairia fora de todas. */
function faixaDe(m,v){
  var fs=faixas(m); if(!fs)return null;
  var f=fracao(m,v); if(f===null)return null;
  var i=Math.floor(f*NFAIXAS);
  return Math.max(0,Math.min(NFAIXAS-1,i));
}
function corDe(fr){
  if(fr===null)return 'rgb(150,154,158)';        /* sem escala: cinza, não verde */
  var f=Math.max(0,Math.min(1,fr));
  /* Recebe a fração RUIM (já invertida pelo sentido): quantiza na mesma rampa. */
  var i=Math.max(0,Math.min(NFAIXAS-1,Math.floor(f*NFAIXAS)));
  return corContinua((i+0.5)/NFAIXAS);
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

w.AgCampo3D={modelo:modelo,valorEm:valorEm,aacpd:aacpd,trajetoria:trajetoria,fracao:fracao,fracaoRuim:fracaoRuim,eixo:eixo,faixas:faixas,faixaDe:faixaDe,
             numero:numero,leValor:leValor,diasEntre:diasEntre,corDe:corDe,mostra:mostra,
             /* O cenário também sai por aqui: luz e rumo da sombra são conta, e
                conta se confere sem canvas. */
             brilho:brilho,rumoDaLuz:rumoDaLuz,casco:casco,
             /* Função, não o vetor: este objeto é montado aqui em cima e as
                constantes do cenário só recebem valor lá embaixo. */
             normais:function(){return NORMAIS;}};

/* =========================================================== a tela ===== */
var estado=null;

/* A vista tem DUAS casas, e uma variável só diz qual está valendo.
   1. Modal (#campo3dOvl): o gesto de sempre, "Ver no campo" no celular.
   2. Embutida: na mesa, ela é o TOPO do dossiê — o estudo abre já mostrando o
      campo, em vez de esconder isso atrás de um clique.
   Só existe uma vista por vez em qualquer dos casos: são a mesma tela, e dois
   estados vivos disputariam o mesmo laço de animação. */
var raiz=null;
/* A escolha do cenário sobrevive a fechar e abrir a vista. Quem desligou a
   decoração desligou porque atrapalha a leitura dele — reacender a cada estudo
   seria fazer a escolha de novo no lugar dele. */
var cenaPref=true;
function caixa(){ return (raiz&&raiz.isConnected)?raiz:null; }

function fechar(){
  var ov=caixa();
  /* Embutida não fecha: ela não tem botão de fechar, e esconder o topo do
     dossiê deixaria um buraco no lugar de uma tela. */
  if(ov&&!(estado&&estado.embutido))ov.hidden=true;
  if(estado){estado.vivo=false;if(estado.foco&&estado.foco.isConnected)estado.foco.focus();}
  estado=null;raiz=null;
}

/* s = estudo PROJETADO do Conhecimento (nomes já cegados quando é o caso).
   st = estudo cru, de onde saem os valores por parcela. */
/* A caixa onde a vista mora — a mesma para a tela cheia e para o aviso de que
   não há o que mostrar. */
function prepararCaixa(embutido,op){
  var ov;
  if(embutido){
    ov=op.hospedeiro;
    /* Mesma folha de estilo, outra caixa: a classe c3-overlay carrega tudo que
       é de dentro (controles, canvas, legenda) e c3-embutida desfaz só o que é
       de janela — posição fixa, fundo próprio e a barra de rolagem dela. */
    ov.className='c3-overlay c3-embutida';
    ov.removeAttribute('role');ov.removeAttribute('aria-modal');
    ov.setAttribute('aria-label','Ver no campo');
  }else{
    ov=d.getElementById('campo3dOvl');
    if(!ov){
      ov=d.createElement('div');ov.id='campo3dOvl';ov.className='c3-overlay';
      ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');
      ov.setAttribute('aria-label','Ver no campo');
      d.body.appendChild(ov);
    }
  }
  ov.hidden=false;raiz=ov;
  return ov;
}
/* SEM DESISTIR CALADO.
   Estes dois casos — estudo sem avaliação, e avaliação sem variável declarada —
   faziam a função simplesmente RETORNAR. No celular, o botão "Ver no campo" não
   respondia; no dossiê, o topo ficava preso em "Montando a vista do campo…"
   para sempre. A tela existia, o estudo existia, e nada acontecia: do lado de
   quem usa, isso é o app quebrado.

   Agora a vista abre assim mesmo e DIZ o que falta. Um aviso é resposta; sumir
   não é. */
function semVista(s,op,motivo){
  var embutido=!!(op.hospedeiro&&op.hospedeiro.nodeType===1);
  var ov=prepararCaixa(embutido,op);
  estado={s:s,st:null,vars:[],embutido:embutido,vivo:false,sel:null,alvos:[],
          foco:d.activeElement,semVista:true};
  ov.innerHTML='<section class="c3-shell"><header class="c3-head">'+
    '<div><p class="c3-eyebrow">VER NO CAMPO</p>'+
    (embutido?'':'<h2>'+esc(s&&s.codigo||'')+'</h2>')+'</div>'+
    (embutido?'':'<button type="button" class="c3-btn" data-c3="fechar">Fechar ×</button>')+
    '</header><p class="c3-aviso">'+esc(motivo)+'</p></section>';
  if(!embutido){var b=ov.querySelector('[data-c3="fechar"]');if(b)b.focus();}
}

function abrir(s,st,op){
  op=op||{};
  if(!st||!Array.isArray(st.avaliacoes)||!st.avaliacoes.length)
    return semVista(s,op,'Este estudo ainda não tem avaliação cadastrada. A vista do campo mostra o que foi lançado em cada parcela — sem avaliação, não há o que pôr na grade.');
  var vars=[];
  st.avaliacoes.forEach(function(a){(a&&a.variaveis||[]).forEach(function(v){if(vars.indexOf(v)<0)vars.push(v);});});
  if(!vars.length)
    return semVista(s,op,'As avaliações deste estudo não declaram nenhuma variável. A vista precisa de uma variável — severidade, nota, contagem — para ter o que mostrar na altura e na cor. Abra a avaliação e declare a variável avaliada.');
  var variavel=vars.indexOf(op.variavel)>=0?op.variavel:vars[0];

  var embutido=!!(op.hospedeiro&&op.hospedeiro.nodeType===1);
  var ov=prepararCaixa(embutido,op);
  estado={s:s,st:st,vars:vars,variavel:variavel,t:0,rot:34*Math.PI/180,rodando:false,
          modo:op.modo==='historico'?'historico':'dia',embutido:embutido,
          cena:cenaPref,sel:null,vivo:true,foco:d.activeElement,ultimo:0,alvos:[]};
  /* A avaliação herdada do painel vira o instante inicial: quem já escolheu uma
     avaliação lá não escolhe de novo aqui. */
  var m=modelo(st,variavel);
  if(op.avaliacao){
    var achou=m.avs.find(function(x){return x.id===op.avaliacao;});
    if(achou)estado.t=achou.daa;
  }else if(m.avs.length)estado.t=m.avs[m.avs.length-1].daa;
  pintar();
  /* Levar o foco para o botão é certo numa janela que acabou de cobrir a tela.
     Embutida, isso roubaria o foco de quem está lendo o dossiê. */
  if(!embutido){var b=ov.querySelector('[data-c3="fechar"]');if(b)b.focus();}
}

function pintar(){
  var ov=caixa();if(!ov||!estado)return;
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
    (estado.embutido?'':'<button type="button" class="c3-btn" data-c3="fechar">Fechar ×</button>')+'</header>'+
    '<div class="c3-controles"><label>Variável<select data-c3="variavel">'+
      estado.vars.map(function(v){return '<option value="'+esc(v)+'"'+(v===estado.variavel?' selected':'')+'>'+esc(v)+'</option>';}).join('')+
    '</select></label>'+
    /* Dois modos, duas perguntas. No modo dia a altura é o VALOR e o tempo anda
       no slider; no histórico a altura é o TEMPO e a cor caminha com o valor.
       Misturar os dois eixos numa tela só faria altura significar duas coisas. */
    '<div class="c3-modos" role="group" aria-label="Modo da vista">'+
      [['dia','Estado no dia','altura = valor · o tempo anda no controle'],
       ['historico','Histórico 3D','altura = tempo · o ensaio inteiro de uma vez']]
      .map(function(x){
        return '<button type="button" class="c3-btn'+(estado.modo===x[0]?' ativo':'')+'" data-c3="modo" data-modo="'+x[0]+
               '" aria-pressed="'+(estado.modo===x[0])+'"><b>'+esc(x[1])+'</b><span>'+esc(x[2])+'</span></button>';
      }).join('')+
    '</div></div>'+
    '<canvas id="c3cv" width="700" height="380" aria-label="Vista do campo: cada coluna é uma parcela na posição da grade; a altura e a cor mostram '+esc(estado.variavel)+'. O cenário ao redor é decorativo."></canvas>'+
    (estado.modo==='dia'
      ? '<div class="c3-tempo"><button type="button" class="c3-btn acao" data-c3="rodar">'+(estado.rodando?'Parar':'Rodar')+'</button>'+
        '<input type="range" data-c3="tempo" min="0" max="'+(m.daaMax||0)+'" step="0.5" value="'+estado.t+'" aria-label="Dias após a aplicação">'+
        '<span class="c3-daa">'+mostra(estado.t,0)+' DAA</span></div>'
      /* No histórico o tempo É o eixo: um controle de tempo aqui competiria com
         ele e faria parecer que ainda há um instante escolhido. */
      : '<p class="c3-nota">O eixo vertical é o tempo, de 0 a '+mostra(m.daaMax,0)+' DAA. '+
        'A altura de cada trecho é proporcional aos dias que ele cobre, e os anéis marcam as avaliações — '+
        'entre dois anéis o que se vê é interpolação, não medição.</p>')+
    '<div class="c3-tempo"><label for="c3rot">Girar</label>'+
      '<input id="c3rot" type="range" data-c3="girar" min="0" max="360" step="1" value="'+Math.round(((estado.rot*180/Math.PI)%360+360)%360)+'">'+
      '<button type="button" class="c3-btn c3-cena'+(estado.cena?' ativo':'')+'" data-c3="cena" aria-pressed="'+(!!estado.cena)+'">Cenário</button></div>'+
    legenda(m)+
    '<div class="c3-painel" id="c3painel">'+painel(m)+'</div>'+
    avisos.map(function(a){return '<p class="c3-nota">'+esc(a)+'</p>';}).join('')+
    (estado.cena?'<p class="c3-nota">A rosa no canto mostra para onde a GRADE cresce — T para os tratamentos, '+
      'R para as repetições —, porque depois de meia volta some a referência de onde ficou o T1. '+
      'Não é bússola: o estudo não guarda a orientação da área no terreno, e o bloco de solo é cenário, '+
      'sem relevo, sem linha de plantio e sem vegetação — nada ali foi medido.</p>':'')+
    '<p class="c3-nota">Marcas das avaliações no eixo do tempo: '+
      (m.avs.length?m.avs.map(function(x){return mostra(x.daa,0)+' DAA';}).join(' · '):'nenhuma')+
      '. O espaçamento é o real, em dias.</p>'+
    '</section>';
  ligarCanvas();
  if(!estado.laco){estado.laco=true;w.requestAnimationFrame(laco);}
}

/* A legenda mostra os CORTES, não adjetivos. "Intermediário" não deixa ninguém
   conferir em que faixa uma coluna caiu; "20 – 40" deixa. A ordem começa pela
   pior faixa, que é a que se procura primeiro num ensaio. */
function rotuloFaixa(m,f,i,casas){
  if(i===NFAIXAS-1)return '≥ '+mostra(f.de,casas);
  if(i===0)return '< '+mostra(f.ate,casas);
  return mostra(f.de,casas)+' – '+mostra(f.ate,casas);
}
function legenda(m){
  if(!m.escala.definida)
    return '<div class="c3-legenda"><span class="c3-chip"><i style="background:rgb(150,154,158)"></i>sem escala definida</span>'+
           '<span class="c3-chip"><i class="c3-vazio"></i>sem avaliação</span></div>';
  var fs=faixas(m);
  if(!fs)return '<div class="c3-legenda"><span class="c3-chip"><i class="c3-vazio"></i>sem avaliação</span></div>';
  var vao=m.escala.max-m.escala.min, casas=vao<5?1:0;
  var itens=fs.map(function(f,i){
    return {ruim:m.sentido==='maior'?1-(f.f0+f.f1)/2:(f.f0+f.f1)/2,
            html:'<span class="c3-chip"><i style="background:'+f.cor+'"></i>'+esc(rotuloFaixa(m,f,i,casas))+'</span>'};
  }).sort(function(a,b){return b.ruim-a.ruim;});
  var unid=m.tipo==='pct'?' %':(m.tipo==='escala'?' (índice)':'');
  return '<div class="c3-legenda">'+
    '<span class="c3-chip c3-chip-t">'+esc(m.variavel+unid)+'</span>'+
    itens.map(function(x){return x.html;}).join('')+
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
  var quem='<p class="c3-onde">'+esc(p.tratId)+(nome?' · '+esc(nome):'')+' · repetição '+esc(p.repLabel);
  if(estado.modo==='historico'){
    /* Aqui não existe "o instante": a torre é o ensaio inteiro. O painel mostra
       a série medida, que é o que a cor sozinha não sabe dizer em número. */
    var tr=trajetoria(m,p), medidos=tr.pontos.filter(function(x){return x.valor!==null;});
    var hh=quem+' · '+medidos.length+' de '+tr.pontos.length+' avaliações lançadas</p>';
    hh+='<p class="c3-valor">'+(medidos.length
      ? mostra(medidos[medidos.length-1].valor,m.ordinal?0:1)+(m.escala.definida&&m.escala.max===100?'%':'')
      : 'sem avaliação')+'</p>';
    hh+='<ul class="c3-serie">'+tr.pontos.map(function(x){
      return '<li><b>'+mostra(x.daa,0)+' DAA</b> '+(x.valor===null
        ? '<i>sem lançamento</i>'
        : mostra(x.valor,m.ordinal?0:1)+(m.escala.definida&&m.escala.max===100?'%':''))+'</li>';
    }).join('')+'</ul>';
    if(tr.buracos)hh+='<p class="c3-nota">'+tr.buracos+' trecho(s) sem as duas pontas: a torre fica vazada ali, '+
      'em vez de emendar por cima e esconder a falta.</p>';
    if(m.ordinal)return hh+'<p class="c3-nota">Escala ordinal: o valor segura entre uma avaliação e a seguinte, e a AACPD não se aplica.</p>';
    var qq=aacpd(m,p);
    return hh+'<p class="c3-nota">'+(qq===null
      ? 'AACPD indisponível: não sobrou nenhum intervalo com as duas pontas lançadas.'
      : 'AACPD da parcela: '+mostra(qq.valor,0)+' · '+qq.intervalos+' intervalo(s) usado(s)'+
        (qq.pulados?' · '+qq.pulados+' ignorado(s) por falta de lançamento':''))+'</p>';
  }
  var v=valorEm(m,p,estado.t);
  var h=quem+' · '+mostra(estado.t,0)+' DAA</p>';
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
/* HMAX era 26 para 26,4 de campo largo: a coluna cheia ficava tão alta quanto
   o ensaio inteiro é largo, a vista virava uma floresta de paredes e o TOPO —
   que é a face onde a cor se lê — sumia atrás delas. Mais baixa, a grade se
   enxerga por cima e a altura continua tendo resolução de sobra. */
var TILT=.55, HMAX=20, PW=3, PL=5, SX=4.4, SY=6.8, LW=700, LH=380, PAD=26;
/* ------------------------------------------------------------- cenário ---
   O que a cena acrescenta — e o que ela tem PROIBIDO acrescentar.

   A vista era um chão cinza com colunas em pé. Lia-se, mas não se enxergava
   volume: cada face recebia sombra por ÍNDICE (a primeira e a terceira mais
   claras, as outras mais escuras), então girar o campo não mudava coisa nenhuma
   no sombreado, e a cena inteira parecia recortada em papel.

   Agora há luz de verdade: cada face é iluminada pela sua NORMAL, e girar o
   campo reacende as faces uma a uma. É daí que sai o relevo.

   A LUZ É PRESA NA CÂMERA, DE PROPÓSITO. Num motor de jogo o sol fica preso ao
   MUNDO: a cena gira e ele fica onde estava — e metade das voltas deixa todas
   as faces visíveis contra a luz. Aqui a cor carrega o dado, e a lateral de uma
   coluna é a mesma cor do topo escurecida: uma volta que jogasse todas as
   laterais para a sombra faria uma parcela boa parecer pior do que é. Presa na
   câmera, a faixa de escurecimento é sempre a mesma, o TOPO — a face de leitura
   — recebe luz cheia em qualquer ângulo, e o sombreado passa a ser forma, não
   valor. Tem teste: brilho() do topo não pode depender do giro.

   O BLOCO DE SOLO É CENÁRIO, NÃO TERRENO. Ele é liso, sem relevo, sem linha de
   plantio e sem vegetação. O estudo não guarda a topografia da área nem o
   sentido das linhas: desenhar um morro, um sulco ou uma soqueira seria pôr na
   tela o que ninguém mediu, e numa vista realista isso passa por informação. O
   bloco dá chão, profundidade e escala — nada além.

   A ROSA DO CANTO NÃO É BÚSSOLA. Ela mostra para onde a GRADE cresce (T de
   tratamento, R de repetição), porque depois de meia volta ninguém sabe mais
   onde ficou o T1. Norte seria invenção: o croqui não guarda a orientação da
   área no terreno.

   E tudo isto DESLIGA no botão Cenário. Quem acha que a decoração atrapalha a
   leitura fica com o chão chapado de antes — a cena é ajuda, não pedágio. */
var MARGEM=2.9, ESP=2.2;
/* A câmera de prjCru escrita em vetores: elevação fixa, sem ponto de fuga.
   CAM_U é o "para cima" da tela e CAM_V o "para fora" dela, os dois em
   coordenadas do mundo já girado. */
var CAM_U=[0,0.663,0.748], CAM_V=[0,-0.748,0.663];
/* Sol alto, sobre o OMBRO ESQUERDO de quem olha. Este vetor custou duas
   tentativas e as duas erradas valem registro, porque a escolha é um troco:

     luz do lado de LÁ  -> a sombra cai para cá, bem visível, e as duas faces
                           que se enxergam ficam as duas contra a luz: sem
                           relevo nenhum, que era o defeito que a cena veio
                           consertar;
     luz do lado de CÁ  -> as faces visíveis acendem de forma desigual (é daí
                           que vem o volume) e a sombra corre para o fundo,
                           aparecendo só nos vãos entre as parcelas.

   Fica o segundo: o que a tela mostra são as colunas, não as manchas. O rumo
   horizontal aponta para a esquerda e para a frente, de modo que, em qualquer
   giro, uma das duas faces à vista pega luz cheia e a outra fica no piso —
   duas faces do mesmo tom seriam uma silhueta chapada. */
var LUZ=[-0.416,0.464,0.782], AMB=0.72, LADO_MAX=0.97;
/* A luz decomposta: quanto ela tem de horizontal e de vertical no mundo já
   girado. O rumo e o comprimento da sombra saem destes dois.

   Os nomes são compridos de propósito. A primeira versão chamou o horizontal de
   LH — que já era, vinte linhas acima, a ALTURA DO CANVAS. As duas declarações
   viraram a mesma variável, ligarCanvas() gravava 420 por cima da luz, e o
   estrago era silencioso: nenhum erro, as quatro laterais saíam com o mesmo
   tom (dividido por 420, todo produto escalar vira zero) e as sombras encolhiam
   para nada. Cena chapada não quebra nada — só deixa de ser cena. */
var LUZ_HX=LUZ[0], LUZ_HY=LUZ[1]*CAM_U[1]+LUZ[2]*CAM_V[1];
var LUZ_HOR=Math.sqrt(LUZ_HX*LUZ_HX+LUZ_HY*LUZ_HY);
var LUZ_VER=LUZ[1]*CAM_U[2]+LUZ[2]*CAM_V[2];
/* Normais das quatro laterais, na MESMA ordem em que as arestas são montadas
   (y0, x1, y1, x0). Trocar a ordem aqui acende a coluna do lado errado. */
var NORMAIS=[[0,-1,0],[1,0,0],[0,1,0],[-1,0,0]];

/* O TOPO é a FACE DE LEITURA: sai com a cor da faixa e mais nada por cima —
   nem luz, nem sombra. É de propósito, e é a regra que segura a tela inteira:
   a cor ali é dado, e dado não pode depender do ângulo em que o campo parou.
   Por isso ele também é sempre a face mais clara da coluna (o teto das
   laterais é LADO_MAX, abaixo de 1): quem enxerga um tom cheio sabe que está
   olhando o topo, e não uma lateral bem iluminada.

   As laterais, essas sim, recebem a luz pela NORMAL, e é aí que mora o relevo:
   girar o campo reacende uma face de cada vez. */
function brilho(n,rot){
  if(n[2]>0.5)return 1;
  var si=Math.sin(rot), co=Math.cos(rot);
  var rx=n[0]*co-n[1]*si, ry=n[0]*si+n[1]*co;
  var dot=rx*LUZ_HX+ry*LUZ_HY;
  return AMB+(LADO_MAX-AMB)*Math.max(0,dot)/LUZ_HOR;
}
/* Para onde a sombra corre, em coordenadas do mundo (antes do giro). A luz fica
   parada na tela, então este rumo gira ao contrário do campo — é isso que faz
   todas as sombras apontarem para o mesmo lado da tela em qualquer ângulo. */
function rumoDaLuz(rot){
  var gx=-LUZ_HX/LUZ_HOR, gy=-LUZ_HY/LUZ_HOR;
  var si=Math.sin(rot), co=Math.cos(rot);
  return {x:gx*co+gy*si, y:-gx*si+gy*co, alongamento:LUZ_HOR/LUZ_VER};
}
/* Envoltória convexa (monotone chain). A sombra de um bloco é a união da base
   com a base deslocada; desenhar as duas com transparência dobraria o tom na
   sobreposição, e a mancha ficaria com um degrau no meio. O casco resolve as
   duas coisas de uma vez: uma figura só, um preenchimento só. */
function casco(pts){
  var p=pts.slice().sort(function(a,b){return a[0]-b[0]||a[1]-b[1];});
  function cruz(o,a,b){return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);}
  function meia(ps){
    var h=[];
    ps.forEach(function(q){
      while(h.length>1&&cruz(h[h.length-2],h[h.length-1],q)<=0)h.pop();
      h.push(q);
    });
    return h;
  }
  var b=meia(p), t=meia(p.slice().reverse());
  return b.slice(0,-1).concat(t.slice(0,-1));
}

/* As cores do cenário, por tema. A TINTA (réguas, rótulos, contornos) estava
   fixa em cinza-chumbo desde o começo: no tema escuro a tela desenhava chumbo
   sobre chumbo, e a régua de altura sumia. Agora a tinta vem daqui junto com o
   resto — a mesma troca que dá céu e solo conserta isso de lambuja. */
var PALETAS={
  claro:{ceu:['#dce7f0','#f3f7fa'], solo:[222,213,198], parede:[178,166,146],
         plot:'rgba(70,58,40,0.07)', linha:'rgba(58,48,34,0.18)', borda:'rgba(58,48,34,0.32)',
         chao:'rgba(26,28,30,0.045)', tinta:'#3c4044', tinta2:'#63686e',
         halo:'rgba(255,255,255,0.85)', sombra:'rgba(48,38,24,0.22)',
         vazio:'rgba(26,28,30,0.42)', anel:'rgba(26,28,30,0.55)',
         regua:'rgba(26,28,30,0.28)', marcado:'#1a1c1e', rosa:'rgba(255,255,255,0.72)',
         aresta:'rgba(26,28,30,0.16)'},
  escuro:{ceu:['#12151a','#1e232a'], solo:[62,57,48], parede:[46,42,36],
         plot:'rgba(246,242,232,0.05)', linha:'rgba(236,228,210,0.16)', borda:'rgba(236,228,210,0.30)',
         chao:'rgba(236,238,240,0.06)', tinta:'#e6e8ea', tinta2:'#b6bac0',
         halo:'rgba(14,16,19,0.85)', sombra:'rgba(0,0,0,0.34)',
         vazio:'rgba(236,238,240,0.42)', anel:'rgba(236,238,240,0.55)',
         regua:'rgba(236,238,240,0.30)', marcado:'#f4f5f6', rosa:'rgba(18,21,26,0.72)',
         aresta:'rgba(8,10,12,0.30)'}
};
var temaEscuro=false;
function P(){ return temaEscuro?PALETAS.escuro:PALETAS.claro; }
/* O tema sai da luminância de --bg, não de uma classe: o app tem mais de um
   jeito de ligar o modo escuro, e uma classe só acertaria um deles. */
function lerTema(){
  var c='';
  try{ c=String(w.getComputedStyle(d.documentElement).getPropertyValue('--bg')||'').trim(); }catch(e){}
  var r,g,b,mm;
  if(/^#[0-9a-f]{3}$/i.test(c)){r=parseInt(c[1]+c[1],16);g=parseInt(c[2]+c[2],16);b=parseInt(c[3]+c[3],16);}
  else if(/^#[0-9a-f]{6}$/i.test(c)){r=parseInt(c.slice(1,3),16);g=parseInt(c.slice(3,5),16);b=parseInt(c.slice(5,7),16);}
  else if((mm=c.match(/\d+/g))&&mm.length>=3){r=+mm[0];g=+mm[1];b=+mm[2];}
  /* Sem token legível, claro: é o :root do app, e errar para o claro deixa a
     tinta escura sobre fundo claro, que é legível de qualquer jeito. */
  else {temaEscuro=false;return;}
  temaEscuro=(0.2126*r+0.7152*g+0.0722*b)<128;
}
/* [r,g,b] * fator -> css. Irmão do sombra(), que recebe a cor já em texto. */
function tom(a,k){
  function q(v){return Math.max(0,Math.min(255,Math.round(v*k)));}
  return 'rgb('+q(a[0])+','+q(a[1])+','+q(a[2])+')';
}
function ligarCanvas(){
  var cv=d.getElementById('c3cv');if(!cv)return;
  estado.cv=cv;estado.ctx=cv.getContext('2d');
  /* Sem contexto 2D não há cena — e não há por que derrubar o resto. Controles,
     legenda e painel são HTML e continuam de pé; quem sai é o desenho. */
  if(!estado.ctx)return;
  var dpr=w.devicePixelRatio||1;
  /* A CAIXA manda nas duas medidas. A largura já vinha dela; a altura era fixa
     em 380, e bastou a vista embutida no dossiê ter 320 de caixa para o desenho
     inteiro ser espremido 16 % na vertical — colunas mais baixas do que o valor
     que representam, que é exatamente o tipo de mentira que esta tela não pode
     contar. */
  LW=cv.clientWidth||700;
  LH=cv.clientHeight||380;
  lerTema();
  cv.width=Math.round(LW*dpr);cv.height=Math.round(LH*dpr);
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
     enquadramento os deixa de fora exatamente quando o campo é largo. Com o
     cenário ligado quem manda na borda é o bloco de solo, que é maior e ainda
     desce ESP abaixo do chão — de fora da conta, ele sairia cortado. */
  var mg=estado.cena?MARGEM:2.6, fundo=estado.cena?-ESP:0;
  [[ox-mg,oy-mg],[ox+larg+mg,oy+alt+mg],[ox-mg,oy+alt+mg],[ox+larg+mg,oy-mg]].forEach(function(c){
    [0,fundo].forEach(function(z){
      var p=prjCru(estado.rot,c[0],c[1],z);xs.push(p[0]);ys.push(p[1]);
    });
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
/* Torre do modo Histórico: os trechos empilhados na altura do TEMPO, com a cor
   caminhando junto com o valor. Cada trecho é fatiado para a cor variar dentro
   dele — sem isso, a torre viraria uma escada de blocos chapados e sugeriria
   degraus onde há transição contínua. No ordinal a fatia é uma só, porque lá o
   degrau é verdade. */
function desenharTorre(ctx,m,o,marcada){
  var tr=trajetoria(m,o.p), desenhou=false;
  tr.trechos.forEach(function(t){
    var fatias=m.ordinal?1:4;
    for(var k=0;k<fatias;k++){
      var f0=k/fatias, f1=(k+1)/fatias;
      var z0=(t.z0+(t.z1-t.z0)*f0)*HMAX, z1=(t.z0+(t.z1-t.z0)*f1)*HMAX;
      var vm=t.v0+(t.v1-t.v0)*((f0+f1)/2);
      var c=corDe(fracaoRuim(m,vm));
      var arestas=[[[o.x0,o.y0],[o.x1,o.y0]],[[o.x1,o.y0],[o.x1,o.y1]],
                   [[o.x1,o.y1],[o.x0,o.y1]],[[o.x0,o.y1],[o.x0,o.y0]]];
      arestas.map(function(e,i){
        return {e:e,i:i,prof:prj(m,(e[0][0]+e[1][0])/2,(e[0][1]+e[1][1])/2,0)[2]};
      }).sort(function(a,b){return b.prof-a.prof;}).forEach(function(g){
        poli(ctx,[prj(m,g.e[0][0],g.e[0][1],z0),prj(m,g.e[1][0],g.e[1][1],z0),
                  prj(m,g.e[1][0],g.e[1][1],z1),prj(m,g.e[0][0],g.e[0][1],z1)],
             sombra(c,brilho(NORMAIS[g.i],estado.rot)),marcada?P().marcado:P().aresta,marcada?1.2:1);
      });
      var topo=[prj(m,o.x0,o.y0,z1),prj(m,o.x1,o.y0,z1),prj(m,o.x1,o.y1,z1),prj(m,o.x0,o.y1,z1)];
      if(k===fatias-1)poli(ctx,topo,c,marcada?P().marcado:P().aresta,marcada?1.2:1);
      estado.alvos.push({o:o,p:topo});
      desenhou=true;
    }
  });
  /* O trecho que falta fica como gaiola tracejada, ocupando a altura que teria.
     Vaza a vista (o buraco continua evidente), mantém a torre alcançável pelo
     toque e marca onde o lançamento deveria estar. */
  ctx.setLineDash([4,4]);
  tr.vazios.forEach(function(t){
    var z0=t.z0*HMAX, z1=t.z1*HMAX;
    [[o.x0,o.y0],[o.x1,o.y0],[o.x1,o.y1],[o.x0,o.y1]].forEach(function(c){
      var p0=prj(m,c[0],c[1],z0), p1=prj(m,c[0],c[1],z1);
      ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);
      ctx.strokeStyle=marcada?P().marcado:P().vazio;ctx.lineWidth=marcada?1.6:1;ctx.stroke();
    });
    var tampa=[prj(m,o.x0,o.y0,z1),prj(m,o.x1,o.y0,z1),prj(m,o.x1,o.y1,z1),prj(m,o.x0,o.y1,z1)];
    poli(ctx,tampa,null,marcada?P().marcado:P().vazio,marcada?1.6:1);
    estado.alvos.push({o:o,p:tampa});
    desenhou=true;
  });
  /* Anel em cada MEDIÇÃO: o que está entre dois anéis é interpolação, não dado.
     Sem essa marca, a torre inteira pareceria medida de ponta a ponta. */
  ctx.setLineDash([]);
  tr.pontos.forEach(function(pt){
    if(pt.valor===null)return;
    var z=pt.z*HMAX;
    poli(ctx,[prj(m,o.x0,o.y0,z),prj(m,o.x1,o.y0,z),prj(m,o.x1,o.y1,z),prj(m,o.x0,o.y1,z)],
         null,P().anel,1);
  });
  if(!desenhou){
    /* Nenhum trecho completo: só o contorno no chão, como no outro modo. */
    ctx.setLineDash([3,3]);
    var base=[prj(m,o.x0,o.y0,0),prj(m,o.x1,o.y0,0),prj(m,o.x1,o.y1,0),prj(m,o.x0,o.y1,0)];
    poli(ctx,base,null,marcada?P().marcado:P().regua,marcada?1.5:1);
    ctx.setLineDash([]);
    estado.alvos.push({o:o,p:base});
  }
}
/* Alguma avaliação lançou algum valor nesta parcela? É o que decide se a torre
   do Histórico projeta sombra: parcela sem lançamento nenhum não tem torre, e
   uma mancha no chão sem nada em cima seria coluna invisível. */
function temLancamento(m,p){
  for(var i=0;i<m.avs.length;i++)
    if(leValor(m.avs[i].av,p.tratId,p.rep,m.variavel)!==null)return true;
  return false;
}
/* Céu: só um degradê, e de propósito. Nuvem, sol ou morro no horizonte seriam
   paisagem inventada numa tela que existe para não inventar nada. O que o céu
   faz aqui é dar um "fora do bloco" — sem ele o solo não tem borda, e sem borda
   não há bloco nenhum, só um fundo pintado. */
function desenharCeu(ctx){
  var g=ctx.createLinearGradient(0,0,0,LH), p=P();
  g.addColorStop(0,p.ceu[0]);g.addColorStop(1,p.ceu[1]);
  ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
}
/* O bloco de solo. Paredes primeiro, superfície depois: as paredes do fundo
   ficam escondidas atrás da superfície, e é assim que a profundidade se lê.
   As duas da frente sobram à vista e são o perfil do bloco — o que dá a
   sensação de peso que um chão chapado não dá. */
function desenharTerreno(ctx,m,ox,oy,larg,alt){
  var p=P();
  var X0=ox-MARGEM, X1=ox+larg+MARGEM, Y0=oy-MARGEM, Y1=oy+alt+MARGEM;
  var cantos=[[X0,Y0],[X1,Y0],[X1,Y1],[X0,Y1]];
  cantos.map(function(c,i){
    var b=cantos[(i+1)%4];
    return {a:c,b:b,n:NORMAIS[i],prof:prj(m,(c[0]+b[0])/2,(c[1]+b[1])/2,0)[2]};
  }).sort(function(a,b){return b.prof-a.prof;}).forEach(function(pa){
    poli(ctx,[prj(m,pa.a[0],pa.a[1],0),prj(m,pa.b[0],pa.b[1],0),
              prj(m,pa.b[0],pa.b[1],-ESP),prj(m,pa.a[0],pa.a[1],-ESP)],
         tom(p.parede,brilho(pa.n,estado.rot)),null);
  });
  var pc=cantos.map(function(c){return prj(m,c[0],c[1],0);});
  /* Perspectiva aérea: o longe clareia na direção do céu. Numa projeção sem
     ponto de fuga, é o único sinal de distância que sobra — sem ele o bloco
     inteiro fica na mesma chapa e a profundidade some. */
  var ordem=pc.slice().sort(function(a,b){return b[2]-a[2];});
  var g=ctx.createLinearGradient(ordem[0][0],ordem[0][1],ordem[3][0],ordem[3][1]);
  g.addColorStop(0,tom(p.solo,1.07));
  g.addColorStop(1,tom(p.solo,0.90));
  poli(ctx,pc,g,null);
  /* A pegada de CADA parcela fica marcada no chão, na medida real do croqui
     (as parcelas não se encostam: entre uma e outra há carreador). Assim a
     parcela sem lançamento continua sendo um lugar, e não um buraco no meio
     da grade — dá para apontar onde falta lançar. */
  ctx.lineWidth=1;
  m.grade.forEach(function(gp){
    var x0=ox+gp.ti*SX, y0=oy+(gp.rep-1)*SY;
    poli(ctx,[prj(m,x0,y0,0),prj(m,x0+PW,y0,0),prj(m,x0+PW,y0+PL,0),prj(m,x0,y0+PL,0)],
         p.plot,p.linha,1);
  });
  poli(ctx,[prj(m,ox,oy,0),prj(m,ox+larg,oy,0),prj(m,ox+larg,oy+alt,0),prj(m,ox,oy+alt,0)],
       null,p.borda,1.2);
}
/* Sombra de contato: sem ela as colunas pairam sobre o chão e a leitura de
   altura fica pior justamente onde importa — no pé, que é de onde a altura
   começa a contar.

   Ela corre na direção da luz, e é ONDE A LUZ VAI DAR: a mesma conta que
   escurece as faces decide para onde a mancha aponta. Sombra num rumo e face
   acesa em outro é o erro que faz cena boa parecer colagem.

   O COMPRIMENTO É LIMITADO, e isso é licença de desenho assumida. Uma coluna
   cheia tem 26 unidades de altura para 3 de largura de parcela: a sombra fiel
   cruzaria meio ensaio e pintaria de cinza as parcelas vizinhas, que é
   justamente o que não pode — mancha sobre parcela vira leitura errada de cor.
   O limite é o CARREADOR, o vão entre duas parcelas: a mancha assenta a coluna
   no chão, aparece no vão onde há espaço para ela e para no pé da vizinha.

   Todas as manchas saem num TRAÇO SÓ (ver desenharSombras): desenhadas uma a
   uma com transparência, a sobreposição de duas dobraria o tom e inventaria
   uma mancha mais escura onde só há duas colunas perto. */
function contornoDaSombra(m,o,h){
  var r=rumoDaLuz(estado.rot);
  var comp=Math.min(h*r.alongamento,1.4);
  if(!(comp>0.05))return null;
  var pts=[];
  [[o.x0,o.y0],[o.x1,o.y0],[o.x1,o.y1],[o.x0,o.y1]].forEach(function(c){
    pts.push(prj(m,c[0],c[1],0));
    pts.push(prj(m,c[0]+r.x*comp,c[1]+r.y*comp,0));
  });
  return casco(pts);
}
function desenharSombras(ctx,m,colunas){
  ctx.beginPath();
  var tem=false;
  colunas.forEach(function(o){
    var c=contornoDaSombra(m,o,o.h);
    if(!c)return;
    tem=true;
    ctx.moveTo(c[0][0],c[0][1]);
    for(var i=1;i<c.length;i++)ctx.lineTo(c[i][0],c[i][1]);
    ctx.closePath();
  });
  if(!tem)return;
  ctx.fillStyle=P().sombra;ctx.fill();
}
/* A rosa da GRADE, não do norte. Depois de meia volta ninguém sabe mais de que
   lado ficou o T1, e a régua de altura não ajuda nisso. Duas setas resolvem:
   T para onde os tratamentos crescem, R para onde crescem as repetições.
   Norte não entra porque o estudo não guarda a orientação da área — seta de
   bússola numa tela que não sabe onde é o norte é mentira desenhada. */
function desenharRosa(ctx){
  var p=P(), r=26, cx=LW-r-14, cy=LH-r-12;
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
  ctx.fillStyle=p.rosa;ctx.fill();
  ctx.strokeStyle=p.linha;ctx.lineWidth=1;ctx.stroke();
  ctx.font='700 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  [[1,0,'T'],[0,1,'R']].forEach(function(e){
    var v=prjCru(estado.rot,e[0],e[1],0);
    var n=Math.sqrt(v[0]*v[0]+v[1]*v[1])||1, ux=v[0]/n, uy=v[1]/n;
    /* Haste curta, ponta e letra em anéis diferentes: letra em cima da haste
       fica ilegível, e é a letra que diz qual eixo é qual. */
    /* Haste até 9, ponta de 9 a 14, letra em 20: em anéis separados, porque
       letra em cima da seta não se lê — e é a letra que diz qual eixo é qual. */
    ctx.strokeStyle=p.tinta2;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+ux*9,cy+uy*9);ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx+ux*14,cy+uy*14);
    ctx.lineTo(cx+ux*9-uy*3.2,cy+uy*9+ux*3.2);
    ctx.lineTo(cx+ux*9+uy*3.2,cy+uy*9-ux*3.2);
    ctx.closePath();ctx.fillStyle=p.tinta2;ctx.fill();
    ctx.fillStyle=p.tinta;
    ctx.fillText(e[2],cx+ux*20,cy+uy*20);
  });
  ctx.restore();
  ctx.textAlign='center';ctx.textBaseline='middle';
}
/* A régua fica no canto mais À ESQUERDA da cena — e, entre os dois da
   esquerda, no mais fundo. Era só "o mais fundo", e o mais fundo de uma vista
   isométrica cai no ALTO E NO MEIO da tela: a régua nascia por cima do campo,
   com os números em cima das colunas. À esquerda ela fica fora do bolo, que é
   onde se procura eixo vertical, e continuando fundo ela não passa na frente
   de nada. O canto muda quando o campo gira, então sai a cada quadro.

   Ela sai em DOIS tempos, e a razão é de leitura: a geometria vai ANTES das
   colunas, para que elas a tapem quando estão na frente — é assim que a
   profundidade se lê. Já os NÚMEROS vão depois, por cima de tudo: uma régua
   com as marcas de baixo escondidas atrás do próprio campo não é régua. */
/* Com o cenário ligado a régua vai para o canto do BLOCO, não do campo: no
   canto do campo ela nascia no meio das colunas e os números caíam em cima
   delas. Afastada pela borda do solo, ela fica livre — e continua no canto mais
   fundo, que é o único que nenhuma coluna tapa. */
function bordaDaRegua(ox,oy,larg,alt){
  var mg=estado.cena?MARGEM*0.72:0;
  return [ox-mg,oy-mg,larg+2*mg,alt+2*mg];
}
function cantoDoFundo(m,ox,oy,larg,alt){
  var cantos=[[ox,oy],[ox+larg,oy],[ox+larg,oy+alt],[ox,oy+alt]];
  var pos=cantos.map(function(c,i){
    var p=prj(m,c[0],c[1],0);
    return {c:c,i:i,x:p[0],prof:p[2]};
  });
  /* Os dois da esquerda, e desses o mais fundo: MAIOR profundidade é o mesmo
     critério que ordena as colunas (as mais fundas primeiro). Escolhido o da
     frente, a régua nasceria na frente das colunas. */
  var f=pos.slice().sort(function(a,b){return a.x-b.x;}).slice(0,2)
          .sort(function(a,b){return b.prof-a.prof;})[0];
  return {c:f.c, viz:[cantos[(f.i+1)%4],cantos[(f.i+3)%4]]};
}
function desenharEixo(ctx,m,ox,oy,larg,alt){
  var eix=eixo(m,estado.modo);
  if(!eix)return;
  var r=bordaDaRegua(ox,oy,larg,alt);
  var k=cantoDoFundo(m,r[0],r[1],r[2],r[3]), c=k.c;
  var base=prj(m,c[0],c[1],0), topo=prj(m,c[0],c[1],HMAX);
  ctx.strokeStyle=P().regua;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(base[0],base[1]);ctx.lineTo(topo[0],topo[1]);ctx.stroke();
  eix.marcas.forEach(function(mk){
    var z=mk.f*HMAX, p=prj(m,c[0],c[1],z);
    /* O "L" de cada marca corre pelas duas bordas do fundo: dá referência de
       altura sem riscar linha solta no ar, que sugeriria um plano inexistente. */
    ctx.strokeStyle=P().regua;ctx.globalAlpha=mk.f===0?0.8:0.45;
    k.viz.forEach(function(v){
      var dx=v[0]-c[0], dy=v[1]-c[1], n=Math.sqrt(dx*dx+dy*dy)||1, L=1.8/n;
      var q=prj(m,c[0]+dx*L,c[1]+dy*L,z);
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
    });
    ctx.globalAlpha=1;
  });
}
function desenharEixoRotulos(ctx,m,ox,oy,larg,alt){
  var eix=eixo(m,estado.modo);
  if(!eix)return;
  var r=bordaDaRegua(ox,oy,larg,alt);
  var k=cantoDoFundo(m,r[0],r[1],r[2],r[3]), c=k.c;
  ctx.fillStyle=P().tinta2;
  ctx.font='500 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign='right';ctx.textBaseline='middle';
  /* Halo claro atrás do número: ele passa por cima de colunas de qualquer cor,
     e cinza sobre âmbar é ilegível justamente no meio da régua. */
  ctx.lineWidth=3;ctx.strokeStyle=P().halo;ctx.lineJoin='round';
  function marca(txt,x,y){ ctx.strokeText(txt,x,y); ctx.fillText(txt,x,y); }
  eix.marcas.forEach(function(mk){
    var p=prj(m,c[0],c[1],mk.f*HMAX);
    marca(mk.texto,p[0]-6,p[1]);
  });
  if(eix.titulo){
    var topo=prj(m,c[0],c[1],HMAX);
    ctx.textBaseline='bottom';marca(eix.titulo,topo[0]-6,topo[1]-6);
  }
  ctx.textAlign='center';ctx.textBaseline='middle';
}
function desenhar(){
  if(!estado||!estado.ctx||!estado.m)return;
  var ctx=estado.ctx, m=estado.m;
  ctx.clearRect(0,0,LW,LH);
  estado.alvos=[];
  estado.quadro=enquadrar(m);
  var larg=estado.quadro.larg, alt=estado.quadro.alt, ox=estado.quadro.ox, oy=estado.quadro.oy;
  if(estado.cena){
    desenharCeu(ctx);
    desenharTerreno(ctx,m,ox,oy,larg,alt);
  }else{
    poli(ctx,[prj(m,ox,oy,0),prj(m,ox+larg,oy,0),prj(m,ox+larg,oy+alt,0),prj(m,ox,oy+alt,0)],
         P().chao,P().borda,1);
  }
  desenharEixo(ctx,m,ox,oy,larg,alt);

  /* A ALTURA sai daqui, e não mais de dentro do laço de desenho: a sombra
     precisa dela antes, porque todas as manchas vão ao chão numa passada só,
     ANTES da primeira coluna. Desenhada dentro do laço, a sombra de uma coluna
     da frente caía por cima de outra já desenhada mais ao fundo. */
  var colunas=m.grade.map(function(p){
    var x0=ox+p.ti*SX, y0=oy+(p.rep-1)*SY;
    var v=valorEm(m,p,estado.t), h;
    if(estado.modo==='historico')h=temLancamento(m,p)?HMAX:0;
    else if(v===null)h=0;
    else{var fr=fracao(m,v);h=(fr===null?.45:Math.max(.12,fr))*HMAX;}
    return {p:p,v:v,h:h,x0:x0,x1:x0+PW,y0:y0,y1:y0+PL,
            prof:prj(m,x0+PW/2,y0+PL/2,0)[2]};
  }).sort(function(a,b){return b.prof-a.prof;});
  if(estado.cena)desenharSombras(ctx,m,colunas);

  colunas.forEach(function(o){
    var marcada=estado.sel&&estado.sel.chave===o.p.chave;
    var sob=!marcada&&estado.hover===o.p.chave;
    if(sob)ctx.save(),ctx.shadowColor=P().sombra,ctx.shadowBlur=10;
    if(estado.modo==='historico')return desenharTorre(ctx,m,o,marcada);
    var base=[prj(m,o.x0,o.y0,0),prj(m,o.x1,o.y0,0),prj(m,o.x1,o.y1,0),prj(m,o.x0,o.y1,0)];
    if(o.v===null){
      /* Ausência: contorno tracejado no chão, altura nenhuma. Não é zero, é vazio. */
      ctx.setLineDash([3,3]);
      poli(ctx,base,null,marcada?P().marcado:P().regua,marcada?1.5:1);
      ctx.setLineDash([]);
      estado.alvos.push({o:o,p:base});
      return;
    }
    /* Sem escala, altura fixa (ver o cálculo de o.h): a altura mentiria tanto
       quanto a cor. */
    var h=o.h, c=corDe(fracaoRuim(m,o.v));
    var arestas=[[[o.x0,o.y0],[o.x1,o.y0]],[[o.x1,o.y0],[o.x1,o.y1]],
                 [[o.x1,o.y1],[o.x0,o.y1]],[[o.x0,o.y1],[o.x0,o.y0]]];
    arestas.map(function(e,i){
      return {e:e,i:i,prof:prj(m,(e[0][0]+e[1][0])/2,(e[0][1]+e[1][1])/2,0)[2]};
    }).sort(function(a,b){return b.prof-a.prof;}).forEach(function(f){
      poli(ctx,[prj(m,f.e[0][0],f.e[0][1],0),prj(m,f.e[1][0],f.e[1][1],0),
                prj(m,f.e[1][0],f.e[1][1],h),prj(m,f.e[0][0],f.e[0][1],h)],
           sombra(c,brilho(NORMAIS[f.i],estado.rot)),marcada?P().marcado:P().aresta,marcada?1.5:1);
    });
    var topo=[prj(m,o.x0,o.y0,h),prj(m,o.x1,o.y0,h),prj(m,o.x1,o.y1,h),prj(m,o.x0,o.y1,h)];
    poli(ctx,topo,c,marcada?P().marcado:(sob?P().anel:P().aresta),marcada?1.5:1.2);
    if(sob)ctx.restore();
    estado.alvos.push({o:o,p:topo});
  });

  desenharEixoRotulos(ctx,m,ox,oy,larg,alt);

  /* Os rótulos passaram a cair EM CIMA do bloco de solo: cinza sobre terra
     some, então eles ganharam o mesmo halo que a régua de altura já tinha. */
  ctx.fillStyle=P().tinta;
  ctx.lineWidth=3;ctx.strokeStyle=P().halo;ctx.lineJoin='round';
  ctx.font='500 11px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  function rotulo(txt,x,y){ ctx.strokeText(txt,x,y); ctx.fillText(txt,x,y); }
  m.trats.forEach(function(t,ti){
    var p=prj(m,ox+ti*SX+PW/2,oy-2.2,0);
    rotulo(String(t.id),p[0],p[1]);
  });
  /* A repetição também tem nome: sem ela a grade vira um bloco anônimo e não dá
     para conferir a parcela selecionada contra a planilha de campo. */
  for(var r=1;r<=m.reps;r++){
    var q=prj(m,ox-2.2,oy+(r-1)*SY+PL/2,0);
    rotulo(rotuloRep(r),q[0],q[1]);
  }
  if(estado.cena)desenharRosa(ctx);
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
/* Passar o ponteiro realça a coluna sob ele. É acréscimo de mesa: no toque não
   existe "passar por cima", e o gesto de lá — tocar para selecionar — continua
   igual. */
d.addEventListener('pointermove',function(ev){
  if(arrastando||!estado||!estado.cv||ev.pointerType==='touch')return;
  var ov=caixa();if(!ov||!ev.target.closest||!ev.target.closest('#c3cv')){
    if(estado.hover){estado.hover=null;desenhar();}
    return;
  }
  var r=estado.cv.getBoundingClientRect();
  var px=(ev.clientX-r.left)*(LW/r.width), py=(ev.clientY-r.top)*(LH/r.height);
  var achou=null;
  for(var i=estado.alvos.length-1;i>=0;i--){
    if(dentro(px,py,estado.alvos[i].p)){achou=estado.alvos[i].o.p.chave;break;}
  }
  estado.cv.style.cursor=achou?'pointer':'grab';
  if(achou!==estado.hover){estado.hover=achou;desenhar();}
});
d.addEventListener('pointermove',function(ev){
  if(!arrastando||!estado)return;
  var dx=ev.clientX-ultX;andou+=Math.abs(dx);ultX=ev.clientX;
  estado.rot+=dx*.012;
  var ov=caixa();
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
  var ov=caixa();
  var b=ev.target.closest&&ev.target.closest('[data-c3]');
  if(!b||!ov||!ov.contains(b))return;
  if(b.dataset.c3==='fechar')return fechar();
  if(b.dataset.c3==='rodar'){estado.rodando=!estado.rodando;b.textContent=estado.rodando?'Parar':'Rodar';}
  if(b.dataset.c3==='cena'){
    estado.cena=!estado.cena;cenaPref=estado.cena;
    /* Repinta porque a nota que explica a rosa entra e sai com ela — aviso sobre
       uma coisa que não está mais na tela é ruído. O giro e o instante não se
       perdem: pintar() escreve os controles a partir do estado, não do zero. */
    pintar();
  }
  if(b.dataset.c3==='modo'&&b.dataset.modo!==estado.modo){
    estado.modo=b.dataset.modo;estado.rodando=false;
    /* A seleção sobrevive à troca: é a mesma parcela, vista de outro jeito. */
    pintar();
  }
});
d.addEventListener('keydown',function(ev){
  /* Esc fecha janela. Embutida não é janela: Esc ali fecharia o dossiê inteiro
     por baixo, que é o oposto do que quem apertou esperava. */
  var ov=caixa();
  if(!ov||ov.hidden||ev.key!=='Escape'||(estado&&estado.embutido))return;
  ev.preventDefault();fechar();
});

w.abrirCampo3D=abrir;
})(window);
