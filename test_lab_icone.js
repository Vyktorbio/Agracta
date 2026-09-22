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

/* ------------------------------------------- 1b. e ele é SÓ O CONTORNO ---
   Relato de uso: "não gostei, não combinam, é desarmônico; um microscópio só o
   contorno fica bom, esse aí tá muito cheio".

   Não era gosto: era densidade medida. O primeiro desenho tinha SEIS traços,
   dois deles de duas unidades (um risco na platina e a tampa da ocular),
   todos espremidos entre x=7 e x=13 — enquanto os vizinhos com que ele divide
   a tela são feitos de duas ou três formas grandes. Ao lado deles o
   microscópio saía mais escuro e mais pesado, e nos dois tamanhos em que ele
   mais aparece (13px no botão de tipo, 14px no pino do mapa) a tinta toda
   virava borrão.

   As duas regras que este bloco cobra saíram de olhar o ícone renderizado no
   navegador, não de teoria:

     A CONTA DE TRAÇOS. Quem vive ao lado dele é que dá a medida do que é
     "cheio" — por isso o teto sai da vizinhança, não de um número escolhido
     aqui. Se alguém enfeitar o `map`, o microscópio ganha a mesma licença;
     enquanto o conjunto for enxuto, ele também é.

     NENHUM DETALHE MENOR QUE QUATRO UNIDADES. Em 13px, uma unidade do
     viewBox de 24 vale meio pixel: o que for menor que isso não é desenho,
     é sujeira. Foi exatamente o que aconteceu com o `M9 14h2`. */
function tracos(nome){
  /* Conta SUBTRAÇOS, não elementos: o `sheet` mete quatro linhas dentro de um
     <path> só, e contar elemento diria que ele é o ícone mais simples do
     conjunto. O que pesa na tela é cada forma desenhada — cada `M` de cada
     `d`, mais os <rect> e <circle>, que são uma forma cada. */
  const d=fonteDoIcone(nome);
  let n=(d.match(/<rect|<circle/g)||[]).length;
  for(const m of d.matchAll(/\sd="([^"]*)"/g)) n+=(m[1].match(/[Mm]/g)||[]).length;
  return n;
}
function fonteDoIcone(nome){
  /* Lê o `d` da tabela do ic() direto da fonte: o SVG montado já veio com
     stroke e tamanho, e o que se quer medir é o DESENHO. */
  const m=new RegExp(nome+":'([^']*)'").exec(src);
  assert.ok(m,'não achei o ícone "'+nome+'" na tabela do ic()');
  return m[1];
}

const vizinhos=['map','sheet','calendar','gauge','archive','globe'];
const teto=Math.max(...vizinhos.map(tracos));
assert.ok(tracos('microscope')<=teto,
  'o microscópio não pode ser mais cheio que o vizinho mais cheio ('+
  tracos('microscope')+' traços contra um teto de '+teto+', dado por '+
  vizinhos.map(n=>n+':'+tracos(n)).join(' ')+')');

/* O que se mede é o TRAÇO SOLTO, não o segmento. Um risco de duas unidades
   sozinho no meio do desenho some em 13px e deixa só sujeira — foi o caso do
   `M9 14h2`. Já um degrau de uma unidade na quina de uma peça de nove apenas
   arredonda, e ninguém sente falta. Então a régua é o tamanho de cada
   SUBTRAÇO: da caneta descer ao papel até ela levantar. */
function extensoes(d){
  const fora=[];
  for(const m of d.matchAll(/\sd="([^"]*)"/g)){
    /* Quebra em subtraços (cada M/m) e acompanha o ponto corrente. O arco
       entra pelo ponto de chegada: a barriga dele só aumenta a extensão, e
       aqui o que se cobra é um mínimo. */
    for(const sub of m[1].split(/(?=[Mm])/)){
      if(!sub.trim()) continue;
      let x=0,y=0,minX=1/0,maxX=-1/0,minY=1/0,maxY=-1/0;
      const marca=()=>{ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; };
      for(const c of sub.matchAll(/([MmLlHhVvAaZz])([^MmLlHhVvAaZz]*)/g)){
        const cmd=c[1], n=(c[2].match(/-?\d*\.?\d+/g)||[]).map(Number);
        if(cmd==='M'||cmd==='L'){ x=n[0]; y=n[1]; }
        else if(cmd==='m'||cmd==='l'){ x+=n[0]; y+=n[1]; }
        else if(cmd==='H'){ x=n[0]; }      else if(cmd==='h'){ x+=n[0]; }
        else if(cmd==='V'){ y=n[0]; }      else if(cmd==='v'){ y+=n[0]; }
        else if(cmd==='A'){ x=n[5]; y=n[6]; }
        else if(cmd==='a'){ x+=n[5]; y+=n[6]; }
        marca();
      }
      fora.push(Math.max(maxX-minX, maxY-minY));
    }
  }
  return fora;
}
const miudos=extensoes(fonteDoIcone('microscope')).filter(v=>v<4);
assert.deepEqual(miudos,[],
  'nenhum traço solto do microscópio pode medir menos que 4 unidades — em '+
  '13px cada unidade vale meio pixel, e o que for menor que isso não é '+
  'desenho, é sujeira (achei: '+miudos.join(', ')+')');
/* A régua tem de pegar o defeito que ela existe para impedir. */
assert.ok(extensoes('<path d="M9 14h2"/>').some(v=>v<4),
  'e ela reprova mesmo o risco de duas unidades que saiu daqui');

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
