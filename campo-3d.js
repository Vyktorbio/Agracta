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
             numero:numero,leValor:leValor,diasEntre:diasEntre,corDe:corDe,mostra:mostra};

/* =========================================================== a tela ===== */
var estado=null;

/* A vista tem DUAS casas, e uma variável só diz qual está valendo.
   1. Modal (#campo3dOvl): o gesto de sempre, "Ver no campo" no celular.
   2. Embutida: na mesa, ela é o TOPO do dossiê — o estudo abre já mostrando o
      campo, em vez de esconder isso atrás de um clique.
   Só existe uma vista por vez em qualquer dos casos: são a mesma tela, e dois
   estados vivos disputariam o mesmo laço de animação. */
var raiz=null;
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
function abrir(s,st,op){
  op=op||{};
  if(!st||!Array.isArray(st.avaliacoes)||!st.avaliacoes.length)return;
  var vars=[];
  st.avaliacoes.forEach(function(a){(a&&a.variaveis||[]).forEach(function(v){if(vars.indexOf(v)<0)vars.push(v);});});
  if(!vars.length)return;
  var variavel=vars.indexOf(op.variavel)>=0?op.variavel:vars[0];

  var embutido=!!(op.hospedeiro&&op.hospedeiro.nodeType===1), ov;
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
  estado={s:s,st:st,vars:vars,variavel:variavel,t:0,rot:34*Math.PI/180,rodando:false,
          modo:op.modo==='historico'?'historico':'dia',embutido:embutido,
          sel:null,vivo:true,foco:d.activeElement,ultimo:0,alvos:[]};
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
    '<canvas id="c3cv" width="700" height="380" aria-label="Vista do campo: cada coluna é uma parcela na posição da grade; a altura e a cor mostram '+esc(estado.variavel)+'."></canvas>'+
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
var TILT=.55, HMAX=26, PW=3, PL=5, SX=4.4, SY=6.8, LW=700, LH=380, PAD=26;
function ligarCanvas(){
  var cv=d.getElementById('c3cv');if(!cv)return;
  estado.cv=cv;estado.ctx=cv.getContext('2d');
  var dpr=w.devicePixelRatio||1;
  /* A CAIXA manda nas duas medidas. A largura já vinha dela; a altura era fixa
     em 380, e bastou a vista embutida no dossiê ter 320 de caixa para o desenho
     inteiro ser espremido 16 % na vertical — colunas mais baixas do que o valor
     que representam, que é exatamente o tipo de mentira que esta tela não pode
     contar. */
  LW=cv.clientWidth||700;
  LH=cv.clientHeight||380;
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
             sombra(c,g.i%2===0?.74:.58),marcada?'#1a1c1e':null,1.2);
      });
      var topo=[prj(m,o.x0,o.y0,z1),prj(m,o.x1,o.y0,z1),prj(m,o.x1,o.y1,z1),prj(m,o.x0,o.y1,z1)];
      if(k===fatias-1)poli(ctx,topo,c,marcada?'#1a1c1e':null,1.2);
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
      ctx.strokeStyle=marcada?'#1a1c1e':'rgba(26,28,30,0.42)';ctx.lineWidth=marcada?1.6:1;ctx.stroke();
    });
    var tampa=[prj(m,o.x0,o.y0,z1),prj(m,o.x1,o.y0,z1),prj(m,o.x1,o.y1,z1),prj(m,o.x0,o.y1,z1)];
    poli(ctx,tampa,null,marcada?'#1a1c1e':'rgba(26,28,30,0.42)',marcada?1.6:1);
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
         null,'rgba(26,28,30,0.55)',1);
  });
  if(!desenhou){
    /* Nenhum trecho completo: só o contorno no chão, como no outro modo. */
    ctx.setLineDash([3,3]);
    var base=[prj(m,o.x0,o.y0,0),prj(m,o.x1,o.y0,0),prj(m,o.x1,o.y1,0),prj(m,o.x0,o.y1,0)];
    poli(ctx,base,null,marcada?'#1a1c1e':'rgba(26,28,30,0.30)',marcada?1.5:1);
    ctx.setLineDash([]);
    estado.alvos.push({o:o,p:base});
  }
}
/* Sombra de contato: sem ela as colunas pairam sobre o chão e a leitura de
   altura fica pior justamente onde importa — no pé, que é de onde a altura
   começa a contar. */
function sombraNoChao(ctx,m,o){
  var d=0.45;
  poli(ctx,[prj(m,o.x0+d,o.y0+d,0),prj(m,o.x1+d,o.y0+d,0),
            prj(m,o.x1+d,o.y1+d,0),prj(m,o.x0+d,o.y1+d,0)],'rgba(26,28,30,0.13)',null);
}
/* A régua fica no canto mais FUNDO da cena, que é o único que nenhuma coluna
   tapa por inteiro. Ele muda quando o campo gira, então é calculado a cada
   quadro em vez de fixado num canto qualquer.

   Ela sai em DOIS tempos, e a razão é de leitura: a geometria vai ANTES das
   colunas, para que elas a tapem quando estão na frente — é assim que a
   profundidade se lê. Já os NÚMEROS vão depois, por cima de tudo: uma régua
   com as marcas de baixo escondidas atrás do próprio campo não é régua. */
function cantoDoFundo(m,ox,oy,larg,alt){
  var cantos=[[ox,oy],[ox+larg,oy],[ox+larg,oy+alt],[ox,oy+alt]];
  /* MAIOR profundidade é o canto mais fundo — é o mesmo critério que ordena as
     colunas (as mais fundas primeiro). Invertido, a régua nasce na frente. */
  var f=cantos.map(function(c,i){
    return {c:c,i:i,prof:prj(m,c[0],c[1],0)[2]};
  }).sort(function(a,b){return b.prof-a.prof;})[0];
  return {c:f.c, viz:[cantos[(f.i+1)%4],cantos[(f.i+3)%4]]};
}
function desenharEixo(ctx,m,ox,oy,larg,alt){
  var eix=eixo(m,estado.modo);
  if(!eix)return;
  var k=cantoDoFundo(m,ox,oy,larg,alt), c=k.c;
  var base=prj(m,c[0],c[1],0), topo=prj(m,c[0],c[1],HMAX);
  ctx.strokeStyle='rgba(26,28,30,0.28)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(base[0],base[1]);ctx.lineTo(topo[0],topo[1]);ctx.stroke();
  eix.marcas.forEach(function(mk){
    var z=mk.f*HMAX, p=prj(m,c[0],c[1],z);
    /* O "L" de cada marca corre pelas duas bordas do fundo: dá referência de
       altura sem riscar linha solta no ar, que sugeriria um plano inexistente. */
    ctx.strokeStyle='rgba(26,28,30,'+(mk.f===0?0.22:0.12)+')';
    k.viz.forEach(function(v){
      var q=prj(m,c[0]+(v[0]-c[0])*0.28,c[1]+(v[1]-c[1])*0.28,z);
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
    });
  });
}
function desenharEixoRotulos(ctx,m,ox,oy,larg,alt){
  var eix=eixo(m,estado.modo);
  if(!eix)return;
  var k=cantoDoFundo(m,ox,oy,larg,alt), c=k.c;
  ctx.fillStyle='#6b7075';
  ctx.font='500 10px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign='right';ctx.textBaseline='middle';
  /* Halo claro atrás do número: ele passa por cima de colunas de qualquer cor,
     e cinza sobre âmbar é ilegível justamente no meio da régua. */
  ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineJoin='round';
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
  poli(ctx,[prj(m,ox,oy,0),prj(m,ox+larg,oy,0),prj(m,ox+larg,oy+alt,0),prj(m,ox,oy+alt,0)],
       'rgba(26,28,30,0.045)','rgba(26,28,30,0.18)',1);
  desenharEixo(ctx,m,ox,oy,larg,alt);

  var colunas=m.grade.map(function(p){
    var x0=ox+p.ti*SX, y0=oy+(p.rep-1)*SY;
    return {p:p,v:valorEm(m,p,estado.t),x0:x0,x1:x0+PW,y0:y0,y1:y0+PL,
            prof:prj(m,x0+PW/2,y0+PL/2,0)[2]};
  }).sort(function(a,b){return b.prof-a.prof;});

  colunas.forEach(function(o){
    var marcada=estado.sel&&estado.sel.chave===o.p.chave;
    var sob=!marcada&&estado.hover===o.p.chave;
    if(sob)ctx.save(),ctx.shadowColor='rgba(26,28,30,.35)',ctx.shadowBlur=10;
    if(estado.modo==='historico')return desenharTorre(ctx,m,o,marcada);
    var base=[prj(m,o.x0,o.y0,0),prj(m,o.x1,o.y0,0),prj(m,o.x1,o.y1,0),prj(m,o.x0,o.y1,0)];
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
    sombraNoChao(ctx,m,o);
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
    poli(ctx,topo,c,marcada?'#1a1c1e':(sob?'rgba(26,28,30,.55)':null),marcada?1.5:1.2);
    if(sob)ctx.restore();
    estado.alvos.push({o:o,p:topo});
  });

  desenharEixoRotulos(ctx,m,ox,oy,larg,alt);

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
