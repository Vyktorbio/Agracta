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
       aqui o que se cobra é um mínimo.

       CADA COMANDO PODE TRAZER VÁRIOS CONJUNTOS DE NÚMEROS, e isso não é
       detalhe: `M10 4 6 1` é um moveto seguido de um lineto IMPLÍCITO, e
       `M9 3h3v3h1v6H8V6h1z` encadeia vários. A primeira versão desta régua
       lia só o primeiro conjunto de cada comando e devolvia extensão 0 para
       um traço inteiro — ou seja, media MENOS do que o desenho tem, que é o
       jeito perigoso de errar: reprova o que está certo e, pior, deixaria
       passar um traço miúdo escondido depois do primeiro par. */
    for(const sub of m[1].split(/(?=[Mm])/)){
      if(!sub.trim()) continue;
      let x=0,y=0,minX=1/0,maxX=-1/0,minY=1/0,maxY=-1/0;
      const marca=()=>{ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; };
      for(const c of sub.matchAll(/([MmLlHhVvAaZz])([^MmLlHhVvAaZz]*)/g)){
        let cmd=c[1];
        const n=(c[2].match(/-?\d*\.?\d+/g)||[]).map(Number);
        const passo={M:2,m:2,L:2,l:2,H:1,h:1,V:1,v:1,A:7,a:7,Z:0,z:0}[cmd];
        if(!passo){ marca(); continue; }
        for(let k=0;k<n.length;k+=passo){
          const v=n.slice(k,k+passo);
          if(cmd==='M'||cmd==='L'){ x=v[0]; y=v[1]; }
          else if(cmd==='m'||cmd==='l'){ x+=v[0]; y+=v[1]; }
          else if(cmd==='H'){ x=v[0]; }      else if(cmd==='h'){ x+=v[0]; }
          else if(cmd==='V'){ y=v[0]; }      else if(cmd==='v'){ y+=v[0]; }
          else if(cmd==='A'){ x=v[5]; y=v[6]; }
          else if(cmd==='a'){ x+=v[5]; y+=v[6]; }
          marca();
          /* Depois do primeiro par, um M/m vira lineto — é o que a norma diz
             e é exatamente o caso que passava batido. */
          if(cmd==='M') cmd='L'; else if(cmd==='m') cmd='l';
        }
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
/* A régua tem de pegar o defeito que ela existe para impedir... */
assert.ok(extensoes('<path d="M9 14h2"/>').some(v=>v<4),
  'e ela reprova mesmo o risco de duas unidades que saiu daqui');
/* ...e tem de MEDIR CERTO o lineto implícito, que é onde ela já errou: se
   `M10 4 6 1` voltar a medir 0, a régua reprova desenho bom e, pior, deixa
   passar traço miúdo escondido depois do primeiro par. */
assert.deepEqual(extensoes('<path d="M10 4 6 1"/>'),[4],
  'moveto seguido de lineto implícito mede a distância inteira, não zero');
assert.deepEqual(extensoes('<path d="M2 2 2 9 9 9"/>'),[7],
  'e com vários linetos implícitos em sequência também');

/* --------------------------------- 1c. cada especialidade tem seu desenho ---
   Relato de uso, com uma prancha de pentatomídeo em anexo: "seria legal se no
   laboratório de insetos esse fosse o ícone".

   O mapa já pintava Entomologia de âmbar, Fitopatologia de roxo e Nematologia
   de azul, e os três pinos eram o mesmo microscópio. COR SOZINHA É UM CANAL
   FRACO: no sol, no vidro sujo do aparelho, para quem não distingue bem as
   três, a única diferença sumia. Com forma, a diferença sobrevive ao campo, e
   quem enxerga cor ganha os dois sinais somados.

   O microscópio continua sendo o laboratório EM GERAL — é ele que aparece na
   escolha "Campo ou Laboratório", onde ainda não há especialidade. E é para
   ele que uma quadra sem especialidade marcada volta, pela mesma razão que
   labTipoCor a devolve ao verde: dizer "é um laboratório" sem inventar de qual
   é. */
const ESPECIALIDADES={Entomologia:'bug', Fitopatologia:'leaf', Nematologia:'nematode'};
Object.entries(ESPECIALIDADES).forEach(([esp,nome])=>{
  assert.ok(ctxI.ic(nome,14).length>ctxI.ic('naoexiste',14).length,
    esp+' tem desenho próprio na tabela do ic() ("'+nome+'")');
  /* A MESMA RÉGUA DO MICROSCÓPIO, senão o conjunto volta a desirmanar: foi
     por densidade que o microscópio foi redesenhado, e um ícone novo que a
     ignore recria o problema no pino do lado. */
  assert.ok(tracos(nome)<=teto,
    esp+': '+tracos(nome)+' traços contra o teto de '+teto+' da vizinhança');
  const finos=extensoes(fonteDoIcone(nome)).filter(v=>v<4);
  assert.deepEqual(finos,[],
    esp+' não pode ter traço solto abaixo de 4 unidades (achei: '+finos.join(', ')+')');
});

/* E a ligação especialidade -> desenho, com a volta ao microscópio no fim. */
const LIGA=fatia('function labTipoIcone(t){');
assert.match(LIGA,/LAB_ICONES\[t\]\|\|'microscope'/,
  'especialidade desconhecida ou em branco volta ao microscópio, não a um desenho em branco');
assert.match(src,/var LAB_ICONES=\{[^}]*Entomologia:'bug'[^}]*\}/,
  'a tabela liga cada especialidade ao seu desenho');
/* As três especialidades que existem têm de estar TODAS na tabela: com duas
   cobertas e uma no microscópio, o mapa vira meio sistema. */
const TIPOS=src.match(/var LAB_TIPOS=\[([^\]]*)\]/)[1].split(',').map(x=>x.replace(/['\s]/g,''));
TIPOS.forEach(t=>assert.ok(ESPECIALIDADES[t],
  'a especialidade "'+t+'" existe em LAB_TIPOS e precisa de desenho próprio'));
assert.equal(TIPOS.length,Object.keys(ESPECIALIDADES).length,
  'e não há desenho sobrando para especialidade que não existe');

/* Onde a especialidade é conhecida, é o desenho DELA que vai. */
[['a escolha "Qual laboratório?"', fatia('function novaQuadraLabTipo(){')],
 ['o pino do mapa',                fatia('function renderQuadraLab(id){')]
].forEach(([onde,trecho])=>{
  assert.match(trecho,/ic\(labTipoIcone\(/, onde+' desenha o ícone da especialidade');
});
/* E onde ela NÃO é conhecida, continua o microscópio. */
assert.match(fatia('function novaQuadraTipo(){'),/ic\('microscope'/,
  'a escolha "Campo ou Laboratório" fica no microscópio: ali ainda não há especialidade');

/* ------------------------------------------------------------- 2. o pino ---
   Roda renderQuadraLab de verdade, com o ic() e as cores de verdade. */
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CORES=src.match(/var LAB_CORES=\{[^}]*\};/)[0];
const ICONES=src.match(/var LAB_ICONES=\{[^}]*\};/)[0];

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
  vm.runInContext('var ic, LAB_CORES, LAB_ICONES, labTipoCor, labTipoIcone, renderQuadraLab;\n'+
    fatia('function ic(n,sz){')+';\n'+CORES+'\n'+ICONES+
    '\nlabTipoCor=function(t){ return LAB_CORES[t]||\'#21a86b\'; };\n'+
    '\nlabTipoIcone=function(t){ return LAB_ICONES[t]||\'microscope\'; };\n'+
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
/* A REGRA É "NENHUM EMOJI", NÃO "NENHUM TUBO DE ENSAIO".
   Este bloco nasceu caçando o 🧪 pelo nome, e por isso deixou passar um 🧫 na
   escolha da especialidade: o emoji que a correção trocou saiu, o vizinho
   dele ficou, e ninguém viu durante meses. A caça passa a ser pela FAIXA de
   pictogramas — o defeito era "o aparelho desenha", não "é aquele desenho". */
/* `Emoji_Presentation` é a propriedade exata: verdadeira para os caracteres
   que o aparelho pinta COLORIDO por conta própria (🧪 🧫 🌱) e falsa para os
   glifos de texto que este app usa de propósito e deve continuar usando —
   ✕ no botão de fechar, ⚠ no alerta, × → ✓ · —. Uma faixa de code points
   pegaria os dois grupos e reprovaria o botão de fechar. */
const EMOJI=/\p{Emoji_Presentation}/u;
LUGAR.forEach(([onde,trecho])=>{
  const achou=(trecho.match(/\p{Emoji_Presentation}/gu)||[]);
  assert.deepEqual(achou,[], onde+' não pode desenhar com emoji — quem desenha emoji é o '+
    'sistema do aparelho, e sai diferente em cada um (achei: '+achou.join(' ')+')');
});
const FICHA=src.slice(src.indexOf("var _lab=isQuadraLab(id)"),
                      src.indexOf("/* ESTUDOS: EM ANDAMENTO PRIMEIRO"));
assert.ok(!EMOJI.test(FICHA)&&!/\\ud83e\\udd/.test(FICHA),
  'a ficha do laboratório também não — lá o emoji estava ESCAPADO, e escapado continuava sendo emoji');
assert.match(FICHA,/ic\(labTipoIcone\(_labT\),20\)/,
  'e o crachá dela desenha o ícone DA ESPECIALIDADE, não um microscópio para as três');

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
