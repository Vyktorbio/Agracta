/* O croqui do ensaio no mapa.
 *
 * Aqui a geometria vira posição no terreno, e é por isso que este teste é
 * rigoroso: um erro de sinal ou de eixo não dá exceção nenhuma — dá um croqui
 * bonito no lugar errado. Alguém vai ao campo procurar a parcela onde o
 * desenho mandou e não encontra nada. As quatro mentiras possíveis:
 *
 *   1. desenhar sem tamanho de parcela (chute com cara de medida);
 *   2. trocar comprimento por largura (parcela deitada no lugar de em pé);
 *   3. girar para o lado errado (o croqui espelhado parece certo na tela);
 *   4. somar carreador onde era espaçamento (colunas coladas, parcelas longe);
 *   5. ignorar a serpentina (metade do ensaio trocada de lugar, em silêncio).
 *
 * Rodar: node test_croqui_campo.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
const C=require('./vendor/croqui-campo-core.js');

const D=(a,b)=>Math.abs(a-b)<1e-6;
const perto=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol, (msg||'')+' — esperado ~'+b+', veio '+a);

/* ------------------------------------------------ 1. o que não se desenha --- */
let g=C.grade({tratamentos:4,repeticoes:3});
assert.equal(g.parcelas.length,0,'sem tamanho de parcela não sai croqui');
assert.match(g.problemas.join(' '),/tamanho da parcela/,'e o motivo é dito por extenso');

g=C.grade({tratamentos:0,repeticoes:3,comprimento:5,largura:3});
assert.equal(g.parcelas.length,0,'sem tratamento não há parcela para desenhar');
g=C.grade({tratamentos:4,repeticoes:0,comprimento:5,largura:3});
assert.equal(g.parcelas.length,0,'sem repetição não há bloco para desenhar');

/* Sem randomização salva ele DESENHA, mas avisa. O croqui em ordem de cadastro
   ainda serve para ver onde o ensaio cabe; o que ele não pode é passar por
   sorteio, senão alguém instala o ensaio sem randomizar. */
g=C.grade({tratamentos:4,repeticoes:3,comprimento:5,largura:3});
assert.equal(g.parcelas.length,12,'sem randomização o croqui sai em ordem de cadastro');
assert.match(g.problemas.join(' '),/não é um sorteio|não um sorteio/,'e avisa que não é sorteio');

/* ------------------------------------------- 2. a grade, em metros locais --- */
/* 4 tratamentos, 3 repetições, parcela 5 m de comprimento × 3 m de largura. */
const base={tratamentos:4,repeticoes:3,comprimento:5,largura:3};

g=C.grade(base);
assert.equal(g.parcelas.length,12);
assert.equal(g.colunas,3,'sem número informado, cada bloco vira uma coluna');
assert.equal(g.linhas,4);
assert.ok(D(g.largura,3*3),'a largura total é 3 colunas × 3 m');
assert.ok(D(g.comprimento,4*5),'e o comprimento é 4 linhas × 5 m');
/* A parcela mantém o comprimento no eixo y em QUALQUER forma de croqui. */
g.parcelas.forEach(p=>{ assert.ok(D(p.w,3)&&D(p.h,5),'parcela deitada: largura e comprimento trocados'); });

/* Mudar o número de colunas rearruma, não reinventa: as 12 parcelas continuam
   12, e a área ocupada é a mesma quando não há vão. */
[1,2,3,4,6,12].forEach(nc=>{
  const x=C.grade(Object.assign({},base,{colunas:nc}));
  assert.equal(x.parcelas.length,12,'nenhuma parcela pode sumir em '+nc+' coluna(s)');
  assert.equal(x.colunas,nc);
  assert.equal(x.linhas,Math.ceil(12/nc));
  assert.ok(D(C.areaHa(x),(12*3*5)/10000),'sem vão, a área é a soma das parcelas');
});
/* Pedir mais colunas do que parcelas não cria coluna vazia. */
assert.equal(C.grade(Object.assign({},base,{colunas:99})).colunas,12,'o croqui não tem coluna sem parcela');

/* --------------------------------- 3. carreador e espaçamento, cada um no
   seu eixo. Trocar os dois é o erro silencioso: a área total até parece
   plausível, mas as colunas ficam coladas e as parcelas afastadas. */
g=C.grade(Object.assign({},base,{colunas:2,espacamento:1,carreador:4}));
assert.ok(D(g.largura, 2*3 + 1*4),'o CARREADOR é o vão entre colunas — é por ele que se anda');
assert.ok(D(g.comprimento, 6*5 + 5*1),'e o ESPAÇAMENTO separa as parcelas dentro da coluna');

/* E o vão tem de aparecer NA POSIÇÃO DE CADA PARCELA, não só no tamanho da
   moldura. Conferir apenas o total deixa passar o croqui que soma certo por
   fora e distribui errado por dentro: parcelas sobrepostas dentro de um
   retângulo do tamanho exato. */
{
  const q=C.grade(Object.assign({},base,{colunas:2,espacamento:1,carreador:4}));
  const em=(c,l)=>q.parcelas.find(p=>p.col===c&&p.lin===l);
  assert.ok(D(em(0,0).x,0)&&D(em(0,0).y,0),'a primeira parcela nasce na âncora');
  assert.ok(D(em(1,0).x, 3+4),'a coluna seguinte anda a largura da parcela MAIS o carreador');
  assert.ok(D(em(0,1).y, 5+1),'e a parcela de cima anda o comprimento MAIS o espaçamento');
  /* Nenhuma parcela pode invadir a vizinha, em nenhum dos dois eixos. */
  q.parcelas.forEach(a=>q.parcelas.forEach(b=>{
    if(a===b) return;
    const sobrepoe = a.x < b.x+b.w-1e-9 && b.x < a.x+a.w-1e-9 &&
                     a.y < b.y+b.h-1e-9 && b.y < a.y+a.h-1e-9;
    assert.ok(!sobrepoe,'parcela sobre parcela: ordem '+a.ordem+' e '+b.ordem);
  }));
}

/* Vão negativo não existe: parcela não invade parcela. */
g=C.grade(Object.assign({},base,{espacamento:-9,carreador:-9}));
assert.ok(D(g.largura,3*3)&&D(g.comprimento,4*5),'vão negativo é tratado como zero');

/* ------------------------------ 4. A SERPENTINA — como o ensaio é instalado
   Este bloco vale pelo resto do arquivo. É o relato de campo: "sobe por uma
   coluna, desce pela outra; início embaixo à esquerda, fim embaixo à direita".
   A numeração corrida que o app salva É essa ordem de caminhada; deitá-la
   errado sobre o terreno troca as parcelas de lugar sem dar erro nenhum. */
{
  /* O caso da foto: 5 tratamentos × 4 repetições = 20 parcelas em 2 colunas.
     Sobe instalando os blocos A e B; vira no alto; desce instalando C e D. */
  const nT=5, nR=4, fila=[];
  let k=1;
  for(let r=1;r<=nR;r++) for(let t=1;t<=nT;t++)
    fila.push({parcela:k++,rep:r,repLabel:'ABCD'[r-1],tratId:'T'+t,tratNum:t});

  const s2=C.grade({tratamentos:nT,repeticoes:nR,comprimento:5,largura:3,colunas:2,ordem:fila});
  assert.equal(s2.parcelas.length,20);
  assert.equal(s2.colunas,2); assert.equal(s2.linhas,10);

  const em=(col,lin)=>s2.parcelas.find(p=>p.col===col&&p.lin===lin);
  /* A primeira parcela instalada é o pé da coluna da esquerda. */
  assert.equal(em(0,0).ordem,1,'a instalação começa embaixo, na primeira coluna');
  /* Sobe-se: a décima parcela é o topo dessa mesma coluna. */
  assert.equal(em(0,9).ordem,10,'e sobe até o alto da coluna');
  /* Vira-se no alto: a décima-primeira é o TOPO da coluna seguinte, não o pé. */
  assert.equal(em(1,9).ordem,11,'no alto vira para a coluna seguinte — não volta ao pé');
  /* E desce-se até o fim, que cai embaixo, do lado oposto ao início. */
  assert.equal(em(1,0).ordem,20,'e desce até terminar embaixo, na ponta oposta');

  /* Os blocos se sucedem ao longo do caminho, não por coluna:
     a coluna da esquerda leva A e B; a da direita, C e D. */
  const blocos=col=>Array.from(new Set(s2.parcelas.filter(p=>p.col===col)
    .sort((a,b)=>a.lin-b.lin).map(p=>p.repLabel)));
  assert.deepEqual(blocos(0),['A','B'],'subindo, instalam-se os blocos A e depois B');
  assert.deepEqual(blocos(1),['D','C'],'descendo, C vem no alto e D termina embaixo');

  /* SEM serpentina o caminho é outro: a coluna seguinte recomeça no pé, o que
     obriga a atravessar o ensaio de volta. Existe, mas não é o padrão. */
  const reto=C.grade({tratamentos:nT,repeticoes:nR,comprimento:5,largura:3,colunas:2,serpentina:false,ordem:fila});
  assert.equal(reto.parcelas.find(p=>p.col===1&&p.lin===0).ordem,11,'sem serpentina a coluna seguinte recomeça embaixo');
  assert.equal(reto.parcelas.find(p=>p.col===1&&p.lin===9).ordem,20);
  /* E a serpentina não pode ser um detalhe invisível: ela troca de lugar
     metade do ensaio. */
  const mudou=s2.parcelas.filter(p=>{
    const r=reto.parcelas.find(q=>q.ordem===p.ordem); return r.lin!==p.lin;
  }).length;
  assert.equal(mudou,10,'a serpentina reposiciona a coluna inteira da volta');
}

/* A ordem dentro do caminho é a do SORTEIO, não a de cadastro. */
{
  const sorteio=[
    {parcela:1,rep:1,tratId:'T3'},{parcela:2,rep:1,tratId:'T1'},{parcela:3,rep:1,tratId:'T2'},
    {parcela:4,rep:2,tratId:'T2'},{parcela:5,rep:2,tratId:'T3'},{parcela:6,rep:2,tratId:'T1'}];
  g=C.grade({tratamentos:3,repeticoes:2,comprimento:5,largura:3,colunas:2,ordem:sorteio});
  assert.equal(g.parcelas.find(p=>p.col===0&&p.lin===0).tratId,'T3','o primeiro instalado é o que o sorteio pôs em primeiro');
  assert.equal(g.parcelas.find(p=>p.col===1&&p.lin===2).tratId,'T2','e a virada leva o quarto para o alto da coluna 2');
  assert.equal(g.parcelas.find(p=>p.col===1&&p.lin===0).tratId,'T1','o último termina embaixo');
}

/* Fila maior que o desenho não vira parcela fantasma. */
g=C.grade({tratamentos:2,repeticoes:2,comprimento:5,largura:3,
  ordem:[1,2,3,4,5,6].map(n=>({parcela:n,rep:1,tratId:'T'+n}))});
assert.equal(g.parcelas.length,4,'o croqui tem o tamanho do ensaio, não o da fila');

/* ------------------------------------------------- 5. o chão de verdade ----- */
const anc={lat:-22.66052,lng:-47.52068,ang:0};
g=C.grade(Object.assign({},base,{arranjo:'coluna'}));

/* Com ângulo 0: +x vai para LESTE (longitude cresce) e +y para NORTE. */
let p0=g.parcelas.find(c=>c.col===0&&c.lin===0);
let c0=C.cantosDaParcela(p0,anc);
assert.ok(c0[1][1]>c0[0][1],'com ângulo 0 o lado da largura cresce para leste');
assert.ok(c0[3][0]>c0[0][0],'e o comprimento cresce para o norte');

/* E as medidas no terreno batem com as medidas em metro. */
const m=C.metrosPorGrau(anc.lat);
perto((c0[1][1]-c0[0][1])*m.mlng, 3, 0.01, 'a largura no terreno tem de dar 3 m');
perto((c0[3][0]-c0[0][0])*m.mlat, 5, 0.01, 'o comprimento no terreno tem de dar 5 m');

/* A ÂNCORA É O CANTO, não o centro. A primeira parcela nasce exatamente nela:
   é o ponto que se acha no campo, e é o que o GPS vai marcar. */
assert.ok(D(c0[0][0],anc.lat)&&D(c0[0][1],anc.lng),'a âncora é o canto da primeira parcela');
const ctr=C.centro(g,anc);
assert.ok(ctr[0]>anc.lat&&ctr[1]>anc.lng,'e o centro fica adiante dela, não em cima');

/* GIRAR 90° leva o comprimento do norte para o OESTE — e não para o leste.
   Espelhar aqui é o erro que não aparece na tela: o croqui continua bonito,
   só que refletido, e as parcelas de campo saem trocadas de lado. */
const anc90={lat:anc.lat,lng:anc.lng,ang:Math.PI/2};
const c90=C.cantosDaParcela(p0,anc90);
perto((c90[3][1]-c90[0][1])*m.mlng, -5, 0.02, 'girado 90° o comprimento aponta para oeste');
perto((c90[1][0]-c90[0][0])*m.mlat,  3, 0.02, 'e a largura passa a apontar para o norte');

/* Girar não muda tamanho: o ensaio não estica ao rodar. */
const d=(a,b)=>{ const dx=(b[1]-a[1])*m.mlng, dy=(b[0]-a[0])*m.mlat; return Math.sqrt(dx*dx+dy*dy); };
perto(d(c90[0],c90[1]), d(c0[0],c0[1]), 0.01, 'a largura tem de sobreviver ao giro');
perto(d(c90[0],c90[3]), d(c0[0],c0[3]), 0.01, 'e o comprimento também');

/* O pegador de giro fica FORA da moldura — senão ele cai em cima de uma
   parcela e o toque de arrastar disputa com o de abrir. */
const pg=C.pegadorDeGiro(g,anc), moldura=C.cantosDoConjunto(g,anc);
const topo=Math.max.apply(null,moldura.map(x=>x[0]));
assert.ok(pg[0]>topo,'o pegador de giro precisa ficar fora do croqui');

/* anguloPara é o inverso do giro: a volta tem de fechar. */
const alvo=C.pontoLatLng(0,30,{lat:anc.lat,lng:anc.lng,ang:0.7});
perto(C.anguloPara(alvo[0],alvo[1],anc), 0.7, 1e-3, 'o ângulo calculado do arrasto tem de reconstruir o giro');
assert.equal(C.anguloPara(anc.lat,anc.lng,anc),anc.ang,'arrasto em cima da âncora não gira nada');

/* ------------------------------------------- 6. a ligação com o app -------- */
/* O motor pode estar certo e o croqui não aparecer. Estas quatro já falharam
   uma vez cada, em silêncio, e é por isso que estão fixadas aqui. */
{
  const app=fs.readFileSync('app.js','utf8');

  /* (a) O BALÃO SÓ ABRE DEPOIS DA PARCELA ESTAR NO MAPA. openTooltip() numa
     camada fora do mapa não faz nada e não reclama: as marcas de início e fim
     do caminho simplesmente não eram desenhadas. */
  const desenha=app.slice(app.indexOf('function croquiDesenhar('));
  /* Sem os comentários: o próprio comentário que explica a regra cita
     openTooltip(), e a busca crua encontrava a explicação em vez do código. */
  const corpo=desenha.slice(0,desenha.indexOf('\nfunction ')).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.ok(corpo.indexOf('poly.addTo(camada)')<corpo.indexOf('.openTooltip()'),
    'a parcela entra no mapa ANTES de abrir o balão — senão a marca não aparece');
  assert.match(corpo,/1 · início/,'o croqui marca onde a instalação começa');
  assert.match(corpo,/'fim'/,'e onde termina — sem as duas pontas o tabuleiro é simétrico');

  /* (b) Croqui é leitura de andamento: ensaio encerrado sai do mapa junto com
     o resto, pela mesma função. */
  const rend=app.slice(app.indexOf('function renderCroquis('));
  assert.match(rend.slice(0,rend.indexOf('\nfunction ')),/estudosAtivos\(qid\)/,
    'o mapa só desenha croqui de ensaio em andamento');

  /* (c) A posição mora DENTRO do estudo e com carimbo: sem _ts a edição não
     vence no merge e o croqui volta ao lugar antigo em outro aparelho. */
  const salva=app.slice(app.indexOf('function salvarCroqui('));
  const salvaCorpo=salva.slice(0,salva.indexOf('\nfunction '));
  assert.match(salvaCorpo,/st\.croqui=\{/,'a posição é salva no estudo');
  assert.match(salvaCorpo,/st\._ts=Date\.now\(\)/,'e carimbada, senão o merge entre aparelhos a descarta');

  /* (d) O desenho precisa ser redesenhado pelo render do mapa, senão só
     aparece depois de mexer em outra coisa. */
  assert.match(app,/renderCroquis\(\);\s*\}catch\(e\)\{\}/,'o render do mapa chama o croqui');
}

console.log('Croqui no mapa: recusa sem medida, serpentina de instalação, carreador no lugar certo, sorteio manda na posição, e o giro fecha OK.');
