/* O LABORATÓRIO NO MAPA É DESENHO DO APP, NÃO EMOJI DO APARELHO.
 *
 * Relato de uso: "podemos mudar o ícone do laboratório também? tá feio".
 *
 * Era um 🧪 dentro de um círculo. Emoji quem desenha é o sistema do aparelho:
 * sai colorido e lustroso no iPhone, chapado no Android, outro no navegador do
 * computador — e nenhum deles no traço monocromático dos outros ícones do app,
 * que saem todos do ic(). Era o único desenho do mapa que o Agracta não
 * controlava.
 *
 * Agora é um microscópio do ic(), numa ETIQUETA QUADRADA com bico embaixo. O
 * quadrado é de propósito: no mapa, bolinha já quer dizer posição (o ponto do
 * GPS, o círculo de incerteza, as notas de campo), e o laboratório é prédio.
 *
 * E a cor virou informação: a especialidade, a mesma que a ficha do lab já
 * pintava e que o mapa ignorava.
 *
 * Rodar: node test_lab_icone.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

function fatia(marca){
  const i=src.indexOf(marca);
  assert.ok(i>=0,'não achei "'+marca+'" em app.js');
  let prof=0,abriu=false,j=src.indexOf('{',i);
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}

/* ------------------------------------------------------ 1. o ic() aprendeu ---
   O ícone tem de existir no conjunto do app, e sair no mesmo traço dos outros:
   viewBox 24, currentColor, sem preenchimento. */
const ctxI={ console, String, Number };
ctxI.window=ctxI; ctxI.globalThis=ctxI;
vm.createContext(ctxI);
vm.runInContext('var ic;\n'+fatia('function ic(n,sz){'),ctxI);

const micro=ctxI.ic('microscope',14);
assert.match(micro,/<svg/,'ic("microscope") devolve um SVG');
assert.match(micro,/viewBox="0 0 24 24"/,'no mesmo viewBox dos outros ícones');
assert.match(micro,/stroke="currentColor"/,'herdando a cor do texto — é assim que ele veste a especialidade');
assert.match(micro,/fill="none"/,'monocromático de traço, como o resto do conjunto');
assert.match(micro,/width="14" height="14"/,'e no tamanho pedido');
assert.ok(ctxI.ic('microscope',14).length>ctxI.ic('naoexiste',14).length,
  'o nome "microscope" está mesmo na tabela, não caiu no desenho vazio');
assert.ok(ctxI.ic('map',13).length>ctxI.ic('naoexiste',13).length,
  'e "map" também: Campo e Laboratório aparecem lado a lado, e trocar só um desirmanaria o par');

/* ------------------------------------------------------------- 2. o pino ---
   Roda renderQuadraLab de verdade, com o ic() e as cores de verdade. */
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CORES=src.match(/var LAB_CORES=\{[^}]*\};/)[0];

function pino(labTipo,estudos){
  let html=null;
  const marcador={on(){return marcador;},addTo(){return marcador;}};
  const ctx={ console, String, Number, Math, Object, Array, esc,
    data:{LAB1:{tipo:'lab',labTipo:labTipo,estudos:estudos||[],ponto:[-21.1,-47.8]}},
    quadraPonto:()=>[-21.1,-47.8],
    quadraNome:()=>'Lab. Um',
    quadraLabTipo:qid=>((ctx.data[qid]||{}).labTipo||''),
    estudosAtivos:qid=>((ctx.data[qid]||{}).estudos||[]),
    editMode:false, editId:null, scoutingModeActive:false, _measure:null,
    _qLayer:{}, selectQuadra(){}, showD(){}, _touchQGEO(){}, saveQGEO(){}, save(){},
    LF:{ marker(){return marcador;}, divIcon(o){ html=o.html; return o; } }
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext('var ic, LAB_CORES, labTipoCor, renderQuadraLab;\n'+
    fatia('function ic(n,sz){')+';\n'+CORES+
    '\nlabTipoCor=function(t){ return LAB_CORES[t]||\'#21a86b\'; };\n'+
    fatia('function renderQuadraLab(id){'),ctx);
  ctx.renderQuadraLab('LAB1');
  return html;
}

const ento=pino('Entomologia',[{id:'S1'}]);
assert.match(ento,/<svg/,'o pino do mapa desenha um SVG');
assert.ok(!/🧪/.test(ento),'e NÃO tem mais o emoji 🧪 — era ele que cada aparelho pintava do seu jeito');
assert.match(ento,/d99a2b/,'Entomologia veste o âmbar da especialidade, o mesmo que a ficha do lab usa');

assert.match(pino('Fitopatologia'),/7a5cd6/,'Fitopatologia, o roxo');
assert.match(pino('Nematologia'),/2f9bbf/,'Nematologia, o azul');
assert.match(pino(''),/21a86b/,'e laboratório sem especialidade fica no verde de sempre');

/* A cor vai também no número do rótulo: um pino âmbar com um "2" verde ao lado
   seriam duas cores dizendo coisas diferentes sobre a mesma coisa. */
assert.match(ento,/<b style="color:#d99a2b">1<\/b>/,
  'o número dos estudos usa a cor da especialidade, junto com o pino');

/* ------------------------------------------- 3. nenhum 🧪 sobrou no lugar ---
   As quatro telas onde o laboratório é LUGAR: o pino, a ficha, a escolha do
   tipo ao criar a quadra e o painel de edição. (A calculadora de laboratório
   é outra coisa — ferramenta, não lugar — e segue com o rótulo dela.) */
const LUGAR=[
  ['o pino do mapa', fatia('function renderQuadraLab(id){')],
  ['a escolha do tipo da quadra', fatia('function novaQuadraTipo(){')],
  ['o painel de edição de quadras', fatia('function buildEditPanel(){')]
];
LUGAR.forEach(([onde,trecho])=>{
  assert.ok(!/🧪/.test(trecho), onde+' não usa mais o emoji 🧪');
});
const FICHA=src.slice(src.indexOf("var _lab=isQuadraLab(id)"),
                      src.indexOf("/* ESTUDOS: EM ANDAMENTO PRIMEIRO"));
assert.ok(!/🧪|\\ud83e\\uddea/.test(FICHA),
  'a ficha do laboratório também não — lá o 🧪 estava escapado, e escapado continuava sendo emoji');
assert.match(FICHA,/ic\('microscope'/,'ela desenha o microscópio do app');

/* ---------------------------------------------------- 4. a folha acompanha --- */
const BLOCO=css.slice(css.indexOf('.lab-pin{'), css.indexOf('/* Seletor campo/lab'));
assert.ok(BLOCO.length>200,'achei o bloco do marcador do laboratório em styles.css');
assert.match(BLOCO,/border-radius:7px/,'ETIQUETA QUADRADA: o canto reto separa o prédio das bolinhas do mapa (GPS, notas)');
assert.ok(!/border-radius:50%/.test(BLOCO),'e não sobrou o círculo de antes');
assert.match(BLOCO,/border:1\.5px solid currentColor/,'a borda herda a cor da especialidade');
assert.match(BLOCO,/\.lab-pin-b::after/,'tem o bico embaixo');
assert.match(BLOCO,/border-top:5px solid currentColor/,'e o bico é da mesma cor');
assert.match(BLOCO,/\.lab-pin\.on \.lab-pin-b\{color:#ffce00!important/,
  'em modo de edição o marcador inteiro fica amarelo, como os pontos que se arrastam nas quadras');
assert.ok(!/\.lab-pin-t b\{color:#7fd6a6/.test(BLOCO),
  'o número não está mais preso ao verde fixo — quem manda nele é a especialidade');

console.log('Ícone do laboratório: microscópio do próprio app, etiqueta quadrada com bico, na cor da especialidade, e nenhum emoji sobrando OK.');
