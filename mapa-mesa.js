/* Agracta — o mapa na mesa: painéis ancorados em vez de janelas.
 *
 * No celular o mapa é a tela inteira e tudo o mais é janela que cobre: é o
 * certo com uma mão e 5 polegadas. Na mesa sobra espaço nas laterais, e o que
 * era janela pode ficar à vista o tempo todo — sem esconder o mapa e sem
 * precisar ser fechado para se olhar o talhão de novo.
 *
 * Três ancoragens, e NENHUMA tela nova:
 *
 *   1. Ferramentas do mapa — a mesma gaveta de sempre (ui-campo.js), ancorada
 *      à esquerda e já aberta. Cada interruptor e a sincronização deles
 *      continuam sendo os do arquivo original; aqui só se muda onde a caixa
 *      fica. O botão de ferramentas passa a recolher e trazer de volta.
 *   2. Ficha da quadra — o mesmo #dOvl, que deixa de ser modal e vira coluna à
 *      direita. O mapa continua clicável por trás dela.
 *   3. Estado das parcelas — a legenda das cores da máscara, com as contagens
 *      reais, mais os controles de enquadramento (zoom, GPS, norte, tela
 *      cheia) e a escala do Leaflet.
 *
 * A legenda conta o que o mapa está pintando NAQUELE momento: as quadras do
 * local ativo, pelo mesmo motor (MascaraCore) que pinta os polígonos. Se ela
 * contasse o banco inteiro, diria um número que a tela não mostra.
 *
 * Abaixo de 1100px nada disto existe: o módulo só age quando o mesa.js declara
 * a mesa no <html>.
 */
(function(w){
'use strict';
var d=w.document;

function existe(n){ return typeof w[n]==='function'; }
function naMesa(){ return d.documentElement.classList.contains('mesa'); }
function svg(p,t){
  return '<svg width="'+(t||20)+'" height="'+(t||20)+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
var IC={
  mais:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  menos:'<path d="M5 12h14"/>',
  gps:'<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  tela:'<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>'
};

/* ------------------------------------------------------------- legenda --- */
/* Conta parcelas, não valores: é a mesma unidade em que a cor foi decidida.
   "Fora do estudo" conta QUADRAS e diz isso — somar quadra com parcela na
   mesma coluna seria um total que não significa nada. */
function contar(){
  var out={avaliada:0,parcial:0,pendente:0,fora:0,selecionada:0};
  if(!existe('quadrasAtivas')||!existe('_mascaraContagem')||typeof w.MascaraCore!=='object')return out;
  var ids=[];
  try{ ids=w.quadrasAtivas()||[]; }catch(e){ return out; }
  ids.forEach(function(id){
    var c;
    try{ c=w._mascaraContagem(id); }catch(e){ return; }
    var selecionada=!!(w.editMode&&w.editId===id);
    if(selecionada){ out.selecionada++; return; }
    var chave=w.MascaraCore.estadoQuadra(c,{});
    if(chave==='fora'){ out.fora++; return; }
    out.avaliada+=c.done; out.parcial+=c.partial; out.pendente+=c.empty;
  });
  return out;
}
function legendaHtml(){
  var c=contar(), M=w.MascaraCore, linhas=[
    ['avaliada','Avaliada',c.avaliada,'parcelas'],
    ['parcial','Parcial',c.parcial,'parcelas'],
    ['pendente','Pendente',c.pendente,'parcelas'],
    ['selecionada','Selecionada',c.selecionada,'quadra'],
    ['fora','Fora do estudo',c.fora,'quadras']
  ];
  return '<h2>Estado das parcelas</h2>'+linhas.map(function(l){
    if(l[0]==='selecionada'&&!l[2])return '';
    var cor=M&&M.estilo?M.estilo(l[0]).cor:'#999';
    return '<div class="mm-leg-linha"><i style="background:'+cor+'"></i><span>'+l[1]+'</span>'+
           '<b>'+l[2]+'</b><small>'+l[3]+'</small></div>';
  }).join('')+
  '<p class="mm-leg-nota">Contagem das quadras deste local. A cor diz o que já foi lançado, não o resultado.</p>';
}
function pintarLegenda(){
  var el=d.getElementById('mmLegenda');
  if(el&&naMesa())el.innerHTML=legendaHtml();
}

/* ------------------------------------------------------------ controles -- */
function bearing(){
  try{ var b=w._map&&w._map.getBearing?w._map.getBearing():0; return ((Math.round(b)%360)+360)%360; }catch(e){ return 0; }
}
function pintarNorte(){
  var b=d.getElementById('mmNorte'); if(!b)return;
  var g=bearing(), agulha=b.querySelector('.mm-agulha');
  if(agulha)agulha.style.transform='rotate('+(-g)+'deg)';
  b.setAttribute('aria-label',g?('Mapa girado '+g+' graus — voltar ao norte'):'Mapa alinhado ao norte');
  b.classList.toggle('girado',!!g);
}
w.mmNorte=function(){ if(existe('agRotSet'))w.agRotSet(0); pintarNorte(); };
w.mmZoom=function(n){ if(existe('agZoom'))w.agZoom(n); };
w.mmGps=function(){ if(existe('agGps'))w.agGps(); else if(existe('locateMe'))w.locateMe(); };
w.mmTela=function(){ if(existe('toggleFullscreenMap'))w.toggleFullscreenMap(); };

function montar(){
  if(!d.getElementById('mmControles')){
    var ctl=d.createElement('div');
    ctl.id='mmControles'; ctl.className='mm-ctrl';
    ctl.innerHTML=
      '<button type="button" onclick="mmZoom(1)" aria-label="Aproximar">'+svg(IC.mais)+'</button>'+
      '<button type="button" onclick="mmZoom(-1)" aria-label="Afastar">'+svg(IC.menos)+'</button>'+
      '<button type="button" id="mmNorte" onclick="mmNorte()" aria-label="Mapa alinhado ao norte">'+
        '<span class="mm-agulha">N<i></i></span></button>'+
      '<button type="button" onclick="mmGps()" aria-label="Minha localização">'+svg(IC.gps)+'</button>'+
      '<button type="button" onclick="mmTela()" aria-label="Tela cheia">'+svg(IC.tela)+'</button>';
    d.body.appendChild(ctl);
  }
  if(!d.getElementById('mmLegenda')){
    var leg=d.createElement('aside');
    leg.id='mmLegenda'; leg.className='mm-leg';
    leg.setAttribute('aria-label','Estado das parcelas no mapa');
    d.body.appendChild(leg);
  }
  /* A gaveta existente vira o painel ancorado: mesma caixa, mesmos
     interruptores, mesma sincronização. */
  if(existe('agToggleDrawer')&&!d.querySelector('#agDrawer.on'))w.agToggleDrawer(true);
  /* Escala do Leaflet: métrica só — a régua em milhas num ensaio brasileiro
     seria ruído. */
  try{
    if(w._map&&w.LF&&w.LF.control&&!w._mmEscala){
      w._mmEscala=w.LF.control.scale({imperial:false,metric:true,position:'bottomright',maxWidth:180}).addTo(w._map);
    }
  }catch(e){}
  pintarLegenda(); pintarNorte();
}
function desmontar(){
  ['mmControles','mmLegenda'].forEach(function(id){ var el=d.getElementById(id); if(el)el.remove(); });
  try{ if(w._mmEscala&&w._map){ w._map.removeControl(w._mmEscala); w._mmEscala=null; } }catch(e){}
}

/* ------------------------------------------------------------- ligações -- */
function ligar(){
  /* A legenda acompanha o mapa: render() é quem repinta os polígonos, então é
     ele quem sabe que as contagens mudaram. Envelopar evita um relógio
     recontando o banco à toa. */
  if(existe('render')){
    var original=w.render;
    w.render=function(){ var r=original.apply(this,arguments); try{ pintarLegenda(); }catch(e){} return r; };
  }
  try{
    if(w._map&&w._map.on)w._map.on('rotate rotateend moveend',pintarNorte);
  }catch(e){}
  avaliar();
  try{
    if(w.MutationObserver)new w.MutationObserver(avaliar).observe(d.documentElement,{attributes:true,attributeFilter:['class']});
  }catch(e){}
}
function avaliar(){
  if(naMesa())montar(); else desmontar();
}
w.agMapaMesa={montar:montar,desmontar:desmontar,legenda:legendaHtml,contar:contar,pintar:pintarLegenda};

/* O arquivo é carregado no fim do <body>: o corpo já existe e o app.js já
   registrou o que envelopamos. Esperar o DOMContentLoaded só atrasaria os
   painéis — mas ele continua servindo de segunda passada, porque o mapa pode
   nascer depois deles. */
ligar();
if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',avaliar);
})(window);
