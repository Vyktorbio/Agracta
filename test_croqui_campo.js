/* O croqui do ensaio no mapa.
 *
 * Aqui a geometria vira posição no terreno, e é por isso que este teste é
 * rigoroso: um erro de sinal ou de eixo não dá exceção nenhuma — dá um croqui
 * bonito no lugar errado. Alguém vai ao campo procurar a parcela onde o
 * desenho mandou e não encontra nada. As cinco mentiras possíveis:
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

/* ------- 4b. O CAMINHO E AS SETAS — o que o autopropelido faz, e o que se
   anda avaliando. É o sentido da randomização: aplicar ou avaliar na ordem
   errada troca os dados de tratamento sem ninguém perceber, porque a parcela
   não tem placa dizendo qual é. */
{
  const nT=5, nR=4, fila=[];
  let j=1;
  for(let r=1;r<=nR;r++) for(let t=1;t<=nT;t++)
    fila.push({parcela:j++,rep:r,repLabel:'ABCD'[r-1],tratId:'T'+t,tratNum:t});
  const s2=C.grade({tratamentos:nT,repeticoes:nR,comprimento:5,largura:3,colunas:2,ordem:fila});

  const cam=C.caminho(s2);
  assert.equal(cam.length,20,'o caminho passa por todas as parcelas, uma vez cada');
  /* Ele sobe a primeira coluna... */
  for(let i=1;i<10;i++) assert.ok(cam[i][1]>cam[i-1][1],'subindo, o passo '+(i+1)+' fica adiante do anterior');
  /* ...atravessa uma vez, no alto... */
  assert.ok(cam[10][0]>cam[9][0],'a travessia para a coluna seguinte anda de lado');
  assert.ok(Math.abs(cam[10][1]-cam[9][1])<1e-9,'e acontece no alto, sem descer no meio do caminho');
  /* ...e desce a segunda. */
  for(let i=11;i<20;i++) assert.ok(cam[i][1]<cam[i-1][1],'descendo, o passo '+(i+1)+' fica atrás do anterior');
  /* Uma travessia só: duas significariam voltar atravessando o ensaio. */
  let travessias=0;
  for(let i=1;i<cam.length;i++) if(Math.abs(cam[i][0]-cam[i-1][0])>1e-9) travessias++;
  assert.equal(travessias,1,'o caminho atravessa o ensaio uma vez só');
  /* O caminho passa pelo MEIO da parcela — é por onde a barra passa. */
  const p1=s2.parcelas.find(p=>p.ordem===1);
  assert.ok(D(cam[0][0],p1.x+p1.w/2)&&D(cam[0][1],p1.y+p1.h/2),'o caminho corre pelo centro das parcelas');

  /* O caminho ORDENA, não confia na ordem em que as parcelas vieram. Hoje a
     grade já sai em ordem de caminhada, então a ordenação nunca é exercida
     pelo uso normal — e uma regra que nunca é exercida é uma regra que
     ninguém percebe quando quebra. Aqui ela é cobrada direto: parcelas
     embaralhadas têm de sair na ordem do sorteio. */
  {
    const baguncado={parcelas:s2.parcelas.slice().reverse()};
    const c2=C.caminho(baguncado);
    assert.equal(c2.length,20);
    const p1=s2.parcelas.find(p=>p.ordem===1), pN=s2.parcelas.find(p=>p.ordem===20);
    assert.ok(D(c2[0][0],p1.x+p1.w/2)&&D(c2[0][1],p1.y+p1.h/2),'o caminho começa na primeira, venha a lista como vier');
    assert.ok(D(c2[19][0],pN.x+pN.w/2)&&D(c2[19][1],pN.y+pN.h/2),'e termina na última');
  }

  /* As setas apontam para onde se anda: uma por coluna, sentidos opostos. */
  const st=C.setas(s2);
  assert.equal(st.length,2,'uma seta por coluna');
  const aponta=seta=>Math.sign(seta[1][1]-seta[0][1]);   /* ponta menos farpa, no eixo y */
  assert.equal(aponta(st[0]),1,'a seta da primeira coluna aponta para cima');
  assert.equal(aponta(st[1]),-1,'e a da segunda aponta para baixo — é a volta');
  st.forEach(seta=>{
    assert.equal(seta.length,3,'a seta é geometria de três pontos, não um caractere');
    assert.ok(D(seta[0][1],seta[2][1]),'as duas farpas ficam à mesma altura');
  });
  /* Sem serpentina as duas apontam para o mesmo lado — e é o que diferencia. */
  const reto=C.grade({tratamentos:nT,repeticoes:nR,comprimento:5,largura:3,colunas:2,serpentina:false,ordem:fila});
  const sr=C.setas(reto);
  assert.equal(aponta(sr[0]),aponta(sr[1]),'sem serpentina as colunas correm no mesmo sentido');
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

/* ------- 5b. A ÂNCORA DO GPS SERVE PARA ESTA PARCELA? ----------------------
   O croqui é ancorado pelo canto, e no campo esse canto vem do GPS. Um
   aparelho comum entrega de ±3 a ±30 m conforme o céu, e ±12 m não posiciona
   uma parcela de 3 m: o canto cai na parcela vizinha e o croqui inteiro sai
   deslocado um tratamento — o pior erro possível, porque continua parecendo
   certo. A régua tem de ser a PRÓPRIA PARCELA: ±4 m é ótimo num ensaio de
   parcela de 20 m e inútil num de 3 m. */
{
  const q=(a,w)=>C.qualidadeDaAncora(a,w).nivel;

  /* Menos de meia parcela: o canto está dentro da parcela certa. */
  assert.equal(q(1,3),'boa');
  assert.equal(q(1.5,3),'boa','exatamente meia parcela ainda serve');

  /* Entre meia parcela e uma parcela: pode escorregar, mas dá para conferir
     na imagem antes de salvar. */
  assert.equal(q(2.5,3),'limite');
  assert.equal(q(3,3),'limite','na largura exata ainda é conferível');

  /* Maior que a parcela: o canto pode cair uma parcela fora. */
  assert.equal(q(3.1,3),'ruim','passou da largura, já troca de vizinha');
  assert.equal(q(12,3),'ruim');

  /* A MESMA precisão muda de veredito com o tamanho da parcela — é isto que
     um limite fixo em metros erraria nos dois sentidos. */
  assert.equal(q(4,20),'boa','±4 m é ótimo numa parcela de 20 m');
  assert.equal(q(4,3),'ruim','e a MESMA leitura é inútil numa de 3 m');

  /* Sem precisão declarada, ou sem tamanho de parcela, não se inventa nota. */
  assert.equal(q(null,3),'desconhecida');
  assert.equal(q(0,3),'desconhecida','precisão zero não existe: é ausência de informação');
  assert.equal(q(5,0),'desconhecida','sem parcela não há régua para julgar');

  /* O texto tem de dizer o número e a comparação — "ruim" sozinho não ensina
     ninguém a esperar sinal melhor. */
  const ruim=C.qualidadeDaAncora(12,3).texto;
  assert.match(ruim,/12/,'o texto diz a precisão medida');
  assert.match(ruim,/3/,'e a largura com que ela foi comparada');
}

/* ------- 5c. EM QUE PARCELA EU ESTOU? --------------------------------------
   A pergunta que se faz andando. Ela tem uma resposta errada muito pior que
   "não sei": dizer 5A quando o GPS não consegue separar 5A de 3A. Quem lança
   a nota confia no nome que está na tela, e a nota vai para o tratamento
   errado sem deixar rastro — os dados continuam com cara de dados.

   Por isso o que se testa aqui não é só a geometria: é a RECUSA. */
{
  const anc0={lat:-23.5,lng:-46.6,ang:0};
  const base3={tratamentos:4,repeticoes:3,comprimento:5,largura:3,colunas:2,
    ordem:Array.from({length:12},(_,i)=>({parcela:i+1,rep:(i%3)+1,tratNum:(i%4)+1,campo:'P'+(i+1)}))};
  const gg=C.grade(base3);
  const em=(x,y,acc,g,a)=>{ const ll=C.pontoLatLng(x,y,a||anc0); return C.ondeEstou(ll[0],ll[1],acc,g||gg,a||anc0); };

  /* metrosLocais é o caminho de volta de pontoLatLng: a volta tem de fechar em
     qualquer ângulo. Um sinal trocado aqui não dá exceção — dá a parcela
     espelhada, que é a vizinha, que é o erro que ninguém vê. */
  [0, 0.4, -1.2, 2.9].forEach(ang=>{
    const a={lat:-23.5,lng:-46.6,ang:ang};
    const ll=C.pontoLatLng(7.5,13.25,a), volta=C.metrosLocais(ll[0],ll[1],a);
    perto(volta.x,7.5,0.02,'x não fecha com ângulo '+ang);
    perto(volta.y,13.25,0.02,'y não fecha com ângulo '+ang);
  });

  /* No MEIO da primeira parcela, com sinal bom: resposta com nome. */
  let r=em(1.5,2.5,1);
  assert.equal(r.nivel,'dentro');
  assert.equal(r.parcela.ordem,1,'a 1ª do caminho é a que encosta na âncora');
  assert.equal(r.candidatas.length,1,'com sinal bom não há dúvida a mostrar');
  assert.match(r.texto,/1ª no caminho/,'a ordem de caminhada vai junto: é ela que evita avaliar fora de ordem');

  /* A SERPENTINA TAMBÉM VALE AQUI. A segunda coluna corre ao contrário, então
     o topo dela é a parcela seguinte à última da primeira coluna — e não a de
     número 7. Confundir isso é a mentira nº 5 deste arquivo, agora do lado de
     quem caminha. */
  const topoDaSegunda=em(4.5,gg.comprimento-2.5,1);
  assert.equal(topoDaSegunda.nivel,'dentro');
  assert.equal(topoDaSegunda.parcela.ordem,7,'subiu a 1ª coluna e desceu a 2ª: a 7ª é o topo da segunda');

  /* ±8 m NUMA PARCELA DE 3 m NÃO RESPONDE. O ponto caiu numa parcela, mas o
     erro alcança as vizinhas: o veredito é a dúvida, com as candidatas. */
  r=em(1.5,2.5,8);
  assert.equal(r.nivel,'incerta');
  assert.ok(r.candidatas.length>1,'a dúvida tem de vir com as candidatas, não com uma escolha');
  assert.ok(r.candidatas.indexOf(r.parcela)===0,'a parcela em que o ponto caiu vem primeiro');
  assert.match(r.texto,/pode ser/,'o texto duvida por extenso — não afirma');

  /* A RÉGUA É A FOLGA ATÉ A BORDA, NÃO UM LIMITE FIXO. A mesma ±6 m que não
     serve numa parcela de 3 m resolve no meio de uma de 20 m. */
  const gLargo=C.grade({tratamentos:2,repeticoes:2,comprimento:40,largura:20,colunas:2});
  assert.equal(em(10,20,6,gLargo).nivel,'dentro','±6 m no meio de uma parcela de 20 m responde');
  assert.equal(em(1.5,2.5,6).nivel,'incerta','e a MESMA leitura não responde numa de 3 m');

  /* ENCOSTADO NA BORDA EXTERNA não há parcela vizinha — há o lado de fora.
     Dizer "você está em P1" aqui é a mesma mentira virada para fora. */
  r=em(0.2,2.5,1.5);
  assert.equal(r.nivel,'incerta','o erro atravessa a borda do croqui');
  assert.equal(r.candidatas.length,1,'não há vizinha para listar — a dúvida é estar fora');
  assert.match(r.texto,/fora do ensaio/,'e é isso que o texto tem de dizer');

  /* PRECISÃO NÃO DECLARADA NÃO É PRECISÃO BOA. */
  r=em(1.5,2.5,null);
  assert.equal(r.nivel,'incerta','sem o número declarado não se afirma parcela');
  assert.equal(C.ondeEstou(anc0.lat,anc0.lng,0,gg,anc0).nivel,'incerta','precisão zero é ausência de informação, não perfeição');

  /* O VÃO É LUGAR LEGÍTIMO: é por ele que se anda. Não é erro, e não vira
     parcela por aproximação. */
  const gCarr=C.grade(Object.assign({},base3,{carreador:4}));
  r=em(5,2.5,1,gCarr);
  assert.equal(r.nivel,'vao','entre as colunas se está no carreador, não numa parcela');
  assert.equal(r.parcela,null,'e o vão não tem parcela: aproximar seria inventar');
  assert.ok(r.distancia>0,'a distância até a mais próxima é o que serve para caminhar');

  /* FORA DO CROQUI: a distância e a parcela mais próxima — é com isso que se
     anda até o ensaio. */
  r=em(1.5,-40,5);
  assert.equal(r.nivel,'fora');
  perto(r.distancia,40,0.5,'a distância medida é a que se anda');
  assert.match(r.texto,/mais próxima/,'e o texto diz para onde ir');

  /* SEM CROQUI NÃO HÁ RESPOSTA — e também não há exceção: o modo de caminhada
     roda a cada leitura do GPS, e uma exceção ali mataria a tela no meio do
     ensaio. */
  const vazio=C.grade({tratamentos:4,repeticoes:3});
  r=C.ondeEstou(anc0.lat,anc0.lng,3,vazio,anc0);
  assert.equal(r.nivel,'fora');
  assert.equal(r.parcela,null);
  assert.doesNotThrow(()=>C.ondeEstou(anc0.lat,anc0.lng,3,null,anc0));

  /* O NOME DA PARCELA É UM SÓ para o mapa, o balão e o letreiro. */
  assert.equal(C.nomeDaParcela({campo:'5A'}),'5A','o código de campo manda quando existe');
  assert.equal(C.nomeDaParcela({tratNum:3,rep:2}),'T3 R2','e sem ele, tratamento e repetição');

  /* A lista no letreiro para no terceiro nome: quem está no campo lê três, e
     a partir daí a informação é "o sinal não serve aqui". */
  r=em(1.5,2.5,14);
  assert.ok(r.candidatas.length>3,'±14 m alcança muita parcela');
  assert.match(r.texto,/e mais \d+/,'o texto resume em vez de despejar a lista inteira');
}

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
    'a parcela entra no mapa ANTES de abrir o balão — senão o rótulo não aparece');

  /* NENHUMA PARCELA TEM ETIQUETA PRÓPRIA. Houve um par de etiquetas verdes
     "1 · início" e "fim", desenhadas em qualquer zoom. Relato de campo: balão
     de mapa tem tamanho em PIXEL, não em metro — ao afastar o zoom elas
     cresciam por cima do croqui e tapavam o que se queria ver. Eram
     redundantes: o código já traz o bloco (5A, 1D) e o caminho amarelo já
     mostra o sentido. */
  assert.ok(!/início|'fim'/.test(corpo),
    'sem etiqueta fixa de início/fim: em zoom afastado ela cresce e tapa o croqui');
  /* E o ESTILO do retângulo não pode olhar a posição da parcela no caminho:
     qualquer `p.ordem` ali dentro é uma parcela desenhada diferente das
     outras, que foi exatamente o que se pediu para tirar. A primeira versão
     deste teste só procurava as palavras "início" e "fim", e deixou passar um
     realce escrito como `p.ordem===1?`. */
  const estilo=corpo.slice(corpo.indexOf('LF.polygon(CroquiCore.cantosDaParcela'),
                           corpo.indexOf('var nome='));
  assert.ok(!/p\.ordem/.test(estilo),
    'o estilo da parcela não pode depender da posição no caminho — todas iguais');
  /* Um rótulo só, e só de perto. */
  assert.equal((corpo.match(/permanent:true/g)||[]).length,1,
    'existe UM rótulo permanente por parcela, e ele só entra com zoom suficiente');

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

  /* (d2) O RÓTULO ENCOLHE JUNTO COM A PARCELA.
     Balão de mapa tem tamanho em PIXEL: o croqui encolhe ao afastar o zoom e o
     texto não, então o rótulo acaba maior que a parcela que ele nomeia. Ligar
     e desligar num limite de zoom não resolve — só troca "grande demais" por
     "sumiu". A fonte tem de sair da LARGURA DA PARCELA NA TELA. */
  const desen=app.slice(app.indexOf('function croquiDesenhar('));
  const desenCorpo=desen.slice(0,desen.indexOf('\nfunction ')).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.match(desenCorpo,/larguraPx[\s\S]{0,40}mPorPx/,
    'a largura da parcela na tela sai de metros por pixel');
  assert.match(desenCorpo,/fonte=[\s\S]{0,60}larguraPx/,
    'e a fonte do rótulo sai dessa largura — não de um tamanho fixo');
  assert.match(desenCorpo,/rotulos=\(fonte>=\d+\)/,
    'o rótulo some quando não há o que ler, em vez de virar borrão');
  assert.ok(!/z>=18/.test(desenCorpo),
    'sem limite de zoom para o rótulo: quem manda é o tamanho da parcela, que varia com o ensaio');
  /* A folha de estilo tem de ler a variável; um px fixo aqui anularia a conta. */
  assert.match(app,/croqui-tip-fixa\{[^}]*font-size:var\(--croqui-fonte/,
    'o CSS do rótulo lê a variável de tamanho');
  assert.match(app,/croqui-tip-fixa\{[^}]*padding:\.\d+em/,
    'e o espaçamento vem em em, para acompanhar a fonte');

  /* A conta de metros por pixel é Web Mercator puro, e vale a pena fixá-la:
     um fator errado aqui faria o rótulo aparecer no zoom errado em silêncio. */
  {
    const vm=require('node:vm');
    const i=app.indexOf('function _croquiMetrosPorPixel(');
    const ctx=vm.createContext({Math:Math,parseFloat:parseFloat});
    vm.runInContext(app.slice(i,app.indexOf('\n}',i)+2)+'\nvar r={f:_croquiMetrosPorPixel};',ctx);
    const f=vm.runInContext('r.f',ctx);
    perto(f(0,0), 40075016.686/256, 1e-6, 'no equador e zoom 0 são 256 px na volta do mundo');
    perto(f(0,1), 40075016.686/512, 1e-6, 'cada nível de zoom divide por dois');
    /* Na latitude do ensaio, no zoom de quem está no talhão. */
    perto(f(-22.66,20), 0.1378, 0.0005, 'no zoom 20 cada pixel vale ~13,8 cm');
    /* E é por isso que a parcela de 3 m mede ~22 px ali. */
    perto(3/f(-22.66,20), 21.8, 0.5, 'a parcela de 3 m dá ~22 px no zoom 20');
  }

  /* O ESTILO DOS RÓTULOS ENTRA COM A CAMADA, não só com o painel de
     posicionar. croquiCss() era chamado apenas dentro de abrirCroquiEditor, e
     quem só olhava o mapa via os rótulos com o balão PADRÃO do Leaflet —
     fundo branco, 12px — em vez do escuro de 9px: vinte caixas brancas
     grandes por cima da lavoura. Quem desenha croqui precisa do estilo dele. */
  const camada=app.slice(app.indexOf('function croquiEnsureLayer('));
  assert.match(camada.slice(0,camada.indexOf('\nfunction ')),/croquiCss\(\)/,
    'a camada do croqui injeta o próprio CSS — senão o rótulo sai no estilo padrão do Leaflet');

  /* (e) A ÂNCORA DO GPS. Quatro regras, e as quatro são sobre honestidade. */
  const gps=app.slice(app.indexOf('function croquiAncorarNoGps('));
  const gpsCorpo=gps.slice(0,gps.indexOf('\nfunction ')).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.match(gpsCorpo,/gpsBest\(/,'usa o gpsBest que já existe, com filtro de precisão e erro explicado');
  /* Uma leitura só diz ONDE, nunca PARA ONDE. Girar o croqui por causa dela
     seria inventar orientação a partir de um ponto. */
  assert.ok(!/pos\.ang\s*=/.test(gpsCorpo),'uma leitura de GPS não pode mexer no ângulo');
  assert.match(gpsCorpo,/pos\.lat=melhor\.lat/,'o ponto lido vira a âncora — o canto da primeira parcela');

  /* Arrastar na mão apaga o carimbo do GPS: a âncora deixou de ser a lida, e
     o círculo daquela leitura não descreve mais este ponto. */
  const abre=app.slice(app.indexOf('function abrirCroquiEditor('));
  const abreCorpo=abre.slice(0,abre.indexOf('\nfunction '));
  const arrasto=abreCorpo.slice(abreCorpo.indexOf("mv.on('drag'"), abreCorpo.indexOf('var rot='));
  assert.match(arrasto,/croquiGpsCancelar\(\)/,'arrastar na mão tira o carimbo de GPS da posição');

  /* A procedência é salva: "marcado no GPS com ±2 m" e "arrastado no olho"
     são coisas diferentes, e daqui a seis meses ninguém lembra qual foi. */
  const salvaGps=app.slice(app.indexOf('function salvarCroqui('));
  const salvaCorpoGps=salvaGps.slice(0,salvaGps.indexOf('\nfunction '));
  assert.match(salvaCorpoGps,/ancora=\{fonte:'gps',acc:/,'croqui marcado no GPS guarda fonte e precisão');
  assert.match(salvaCorpoGps,/fonte:'mao'/,'e o arrastado na mão diz que foi na mão');

  /* (f) O ATALHO FECHA OS DOIS PAINÉIS, E CHAMA FUNÇÕES QUE EXISTEM.
     Este é o defeito que chegou ao campo: o atalho chamava `closeD`, que não
     existe neste app (a certa é `closeDetail`), embrulhada em
     `typeof x==='function'`. O guarda virou o nome errado em SILÊNCIO — nada
     fechava, nada reclamava, e o croqui era desenhado embaixo de duas telas
     cheias. Posicionar é tarefa de mapa: com a ficha e a janelinha por cima,
     não há o que arrastar.
     O teste cobra as duas coisas: que os painéis sejam fechados, e que TODA
     função chamada ali exista de verdade em app.js. */
  const atalho=app.slice(app.indexOf('function posicionarCroquiDoEstudo('));
  const atalhoCorpo=atalho.slice(0,atalho.indexOf('\n}')+2).replace(/\/\*[\s\S]*?\*\//g,'');
  assert.match(atalhoCorpo,/closeStudyDetail\(\)/,'fecha a ficha do estudo');
  assert.match(atalhoCorpo,/closeDetail\(\)/,'e fecha a janelinha da quadra — senão o mapa fica coberto');
  /* Nenhum typeof aqui: ele transformaria o próximo nome errado em silêncio. */
  assert.ok(!/typeof/.test(atalhoCorpo),
    'sem guarda typeof no atalho: ela esconde nome de função errado');
  /* E cada função chamada tem de estar declarada em app.js. */
  (atalhoCorpo.match(/\b([a-zA-Z_$][\w$]*)\s*\(/g)||[]).forEach(function(m){
    const nome=m.replace(/\s*\($/,'');
    if(nome==='function') return;
    assert.ok(new RegExp('function\\s+'+nome+'\\s*\\(').test(app),
      'o atalho chama '+nome+'(), que não está declarada em app.js');
  });

  /* (g) O CAMPO QUE NÃO EXISTIA. O croqui recusava desenhar dizendo "falta o
     tamanho da parcela no protocolo" — e não havia onde preencher: o valor só
     chegava pela planilha do protocolo importada. Quem cadastrava o estudo na
     mão ficava sem saída, mandado a um lugar inexistente. */
  const render=app.slice(app.indexOf('function renderStudyEditModal('));
  const etapa1=render.slice(0,render.indexOf('data-step="2"'));
  assert.ok(etapa1.indexOf('id="seParcelaComp"')>0 && etapa1.indexOf('id="seParcelaLarg"')>0,
    'o tamanho da parcela se preenche na etapa PROTOCOLO — foi onde o usuário foi procurar, e é onde o dado mora');

  /* Meia medida não é medida, e não pode apagar o que a planilha trouxe. */
  const sync=app.slice(app.indexOf('function syncStudyInputs('));
  const syncCorpo=sync.slice(0,sync.indexOf('\nfunction '));
  assert.match(syncCorpo,/_cOk&&_lOk/,'só grava com os dois lados preenchidos');
  assert.match(syncCorpo,/!_cOk&&!_lOk[\s\S]{0,120}delete/,
    'e só apaga com os dois vazios — um lado em branco é digitação pela metade, não intenção de limpar');
  assert.match(syncCorpo,/tamanhoParcela=/,'grava no mesmo campo que a calculadora e a planilha leem');

  /* A tela diz ONDE se preenche. O motor sabe o QUE falta e não conhece
     telas; sem esta linha o usuário procura o campo pela ficha inteira. */
  const painel=app.slice(app.indexOf('function croquiEditPanel('));
  assert.match(painel.slice(0,painel.indexOf('\nfunction ')),/Editar planejamento.*Protocolo.*Tamanho da parcela/,
    'a recusa do croqui aponta o caminho exato do campo');

  /* O círculo de incerteza entra no enquadramento. Enquadrar só o croqui
     jogava o círculo para fora da tela justamente quando ele era grande —
     escondendo o aviso exatamente no caso em que ele importa. */
  const enq=app.slice(app.indexOf('function croquiEnquadrar('));
  assert.match(enq.slice(0,enq.indexOf('\nfunction ')),/gps&&_croquiEdit\.gps\.acc/,
    'o enquadramento inclui o círculo de precisão');

  /* (h) O MODO DE CAMINHADA. Ele liga o GPS em watchPosition e desenha sobre
     o croqui — três coisas podem falhar caladas, e as três ficam fixadas: */

  /* O botão existe e chama quem deve: sem ele a função é código morto. */
  const ctl=app.slice(app.indexOf('function addCroquiControl('));
  const ctlCorpo=ctl.slice(0,ctl.indexOf('\nfunction '));
  assert.ok(ctlCorpo.indexOf('croquiEuBtn')>0,'o modo "Onde estou" precisa de botão no mapa');
  assert.match(ctlCorpo,/croquiEuBtn'\)\.onclick=croquiEuAlternar/,'e o botão tem de estar ligado na função');

  /* O watch do GPS tem de ser cancelado ao parar. Um watchPosition esquecido
     continua acordando o GPS com o app na mão de quem está no campo o dia
     inteiro — não dá tela de erro nenhuma, só come bateria. */
  const desliga=app.slice(app.indexOf('function croquiEuDesligar('));
  const desligaCorpo=desliga.slice(0,desliga.indexOf('\nfunction '));
  assert.match(desligaCorpo,/clearWatch\(_croquiEu\.watch\)/,'parar o modo tem de cancelar o watch do GPS');
  assert.match(desligaCorpo,/removeLayer\(_croquiEu\.camada\)/,'e apagar o realce, senão fica parcela acesa sem leitura');
  assert.match(desligaCorpo,/croquiEuHud'\)/,'e tirar o letreiro da tela');

  /* Caminhar e posicionar não convivem: com os dois ligados o realce persegue
     um croqui que está mudando de lugar debaixo dele. */
  const abreEditor=app.slice(app.indexOf('function abrirCroquiEditor('));
  assert.match(abreEditor.slice(0,abreEditor.indexOf('\nfunction ')),/croquiEuDesligar\(\)/,
    'abrir o editor de posição tem de encerrar a caminhada');

  /* E apagar a camada com a caminhada ligada deixaria o realce brilhando
     sozinho sobre a lavoura, sem o desenho a que ele se refere. */
  const tog=app.slice(app.indexOf('function toggleCroquis('));
  assert.match(tog.slice(0,tog.indexOf('\nfunction ')),/!_croquiOn\) croquiEuDesligar\(\)/,
    'desligar a camada do croqui tem de encerrar a caminhada');

  /* Toda função que o modo chama existe de verdade — o mesmo guarda que já
     pegou um `closeD` que não existia. */
  ['croquiEuAlternar','croquiEuLigar','croquiEuDesligar','croquiEuPosicao','croquiEuErro',
   'croquiEuDesenhar','croquiEuHud','croquiEuAlvos','croquiEuLigado'].forEach(function(nome){
    assert.ok(new RegExp('function\\s+'+nome+'\\s*\\(').test(app), nome+'() não está declarada em app.js');
  });

  /* E o motor que ele consome tem de existir no arquivo que o index carrega. */
  const core=fs.readFileSync('vendor/croqui-campo-core.js','utf8');
  ['ondeEstou','nomeDaParcela','metrosLocais'].forEach(function(nome){
    assert.ok(core.indexOf(nome+':'+nome)>0, nome+' não está exportado pelo motor');
  });
}

console.log('Croqui no mapa: recusa sem medida, serpentina de instalação, carreador no lugar certo, sorteio manda na posição, o giro fecha, e a caminhada não escolhe parcela quando o GPS não separa as duas. OK.');
