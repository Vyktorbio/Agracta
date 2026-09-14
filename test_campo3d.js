/* "Ver no campo" — as regras em que a tela poderia mentir sem ninguém notar.
 *
 * Uma vista 3D erra bonito: as colunas continuam saindo, coloridas e plausíveis,
 * enquanto o eixo do tempo está falsificado ou a ausência virou zero. Nenhum
 * desses quatro erros produz tela quebrada, e é por isso que cada um tem teste.
 *
 * Rodar: node test_campo3d.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),fs2=fs;
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

const dom=new JSDOM('<!doctype html><html><body></body></html>',
  {url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window;
w.requestAnimationFrame=()=>0;

/* As funções reais do app que o módulo consome, extraídas do app.js publicado —
   assim o teste exercita a MESMA leitura de nota e a MESMA escala da variável
   que o aparelho usa, e não uma cópia que pode divergir depois. */
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,'falta a função '+nome+' no app.js');
  let prof=0,abriu=false,j=i;
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}
w.eval('var AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};var REP_LETTERS="ABCDEFGHIJKLMNOPQRSTUVWXYZ";');
w.eval(pega('_numBR'));
['_avTipo','_avCfg','_avEscala','_avSentido','_avNota','_avRowKey','_repLetter'].forEach(f=>w.eval(pega(f)));
/* O módulo lê window._avNota etc.; em navegador elas são globais do app.js. */
w.eval('window._avNota=_avNota;window._avRowKey=_avRowKey;window._repLetter=_repLetter;'+
       'window._avCfg=_avCfg;window._avEscala=_avEscala;window._avSentido=_avSentido;');
w.eval(fs.readFileSync('campo-3d.js','utf8'));
const M=w.AgCampo3D;
assert.ok(M,'campo-3d.js precisa exportar AgCampo3D');

const trats=[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Padrão'},{id:'T3',produto:'Candidato'}];
const parcela=(t,r)=>({tratId:t,rep:r,chave:t+'R'+r});

function estudo(avs,extra){
  return Object.assign({dataInicio:'2026-01-12',numRepeticoes:4,tratamentos:trats,avaliacoes:avs},extra||{});
}
function av(id,data,notas,tipo,cfg){
  return {id:id,data:data,variaveis:['sev'],tipos:{sev:tipo||'pct'},
          varcfg:cfg?{sev:cfg}:{},notas:notas};
}
/* Notas de todas as parcelas com o mesmo valor, salvo exceções. */
function todas(valor,excecoes){
  const n={};
  trats.forEach(t=>{for(let r=1;r<=4;r++)n[t.id+'R'+r]={sev:valor};});
  Object.keys(excecoes||{}).forEach(k=>{n[k]={sev:excecoes[k]};});
  return n;
}

/* ============================================ 1. DAA desigual, nunca degraus iguais */
{
  // Avaliações aos 0, 7, 14 e 31 dias: o último intervalo é mais que o dobro.
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-01-19',todas('20')),
    av('A3','2026-01-26',todas('30')), av('A4','2026-02-12',todas('40'))
  ]),'sev');
  assert.deepEqual(m.avs.map(x=>x.daa),[0,7,14,31],'o DAA sai da data, não da ordem');
  assert.equal(m.daaMax,31);

  const p=parcela('T2',1);
  // No meio do trecho 14→31 (22,5 DAA) o valor tem de refletir o vão REAL.
  const meio=M.valorEm(m,p,22.5);
  assert.ok(Math.abs(meio-35)<1e-9,'interpolação usa o vão real de 17 dias, deu '+meio);
  // Se os degraus fossem iguais (4 passos de 1), 22,5 DAA nem existiria no eixo.
  // Prova direta: aos 17,5 DAA — o meio SE os passos fossem iguais — o valor
  // ainda está bem abaixo de 35, porque o trecho longo mal começou.
  assert.ok(M.valorEm(m,p,17.5)<33,'degraus iguais empurrariam o valor para o meio cedo demais');
  // E a AACPD pesa cada trecho pelo seu número de dias.
  const q=M.aacpd(m,p);
  assert.equal(q.valor,(15*7)+(25*7)+(35*17),'AACPD por trapézios sobre os dias reais');
  assert.equal(q.intervalos,3);
}

/* ================================= 2. Lançamento ausente NÃO é zero, e o buraco corta */
{
  // T3R2 sem lançamento aos 14 DAA (a chave existe, o valor é vazio).
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-01-19',todas('20')),
    av('A3','2026-01-26',todas('30',{'T3R2':''})), av('A4','2026-02-12',todas('40'))
  ]),'sev');
  const buraco=parcela('T3',2), inteira=parcela('T2',2);

  assert.equal(M.valorEm(m,buraco,14),null,'no instante sem lançamento não há valor');
  assert.equal(M.valorEm(m,buraco,10),null,'o trecho 7→14 não existe: falta a ponta de cima');
  assert.equal(M.valorEm(m,buraco,20),null,'o trecho 14→31 não existe: falta a ponta de baixo');
  assert.notEqual(M.valorEm(m,buraco,10),0,'ausente NUNCA é zero');
  assert.ok(Math.abs(M.valorEm(m,buraco,3.5)-15)<1e-9,'o trecho 0→7, com as duas pontas, continua valendo');
  assert.ok(Math.abs(M.valorEm(m,inteira,10)-24.285714285714285)<1e-9,'a parcela completa não é afetada');

  // A AACPD ignora os trechos incompletos e diz quantos ignorou.
  const q=M.aacpd(m,buraco);
  assert.equal(q.valor,15*7,'só o intervalo 0→7 entra');
  assert.equal(q.intervalos,1);
  assert.equal(q.pulados,2,'e os dois trechos sem ponta ficam contados');

  // Sem nenhum intervalo completo, não há AACPD — e não é zero.
  const so=M.modelo(estudo([
    av('A1','2026-01-12',todas('10',{'T1R1':''})), av('A2','2026-01-19',todas('20',{'T1R1':''}))
  ]),'sev');
  assert.equal(M.aacpd(so,parcela('T1',1)),null,'sem intervalo completo, AACPD não existe');
}

/* ======================================= 3. Sentido inverte a COR, não o valor */
{
  const base=[av('A1','2026-01-12',todas('80')),av('A2','2026-01-19',todas('80'))];
  const menor=M.modelo(estudo(base),'sev');
  const maiorAv=[av('A1','2026-01-12',todas('80'),'pct',{sentido:'maior'}),
                 av('A2','2026-01-19',todas('80'),'pct',{sentido:'maior'})];
  const maior=M.modelo(estudo(maiorAv),'sev');

  assert.equal(menor.sentido,'menor');
  assert.equal(maior.sentido,'maior');
  const p=parcela('T2',1);
  // O VALOR é o mesmo nos dois: o sentido não mexe no que foi medido.
  assert.equal(M.valorEm(menor,p,3),M.valorEm(maior,p,3),'o sentido não altera o valor medido');
  assert.equal(M.valorEm(maior,p,3),80);
  // A fração dentro da escala também é a mesma...
  assert.ok(Math.abs(M.fracao(menor,80)-0.8)<1e-9);
  assert.ok(Math.abs(M.fracao(maior,80)-0.8)<1e-9);
  // ...mas o quanto disso é RUIM inverte, e é isso que pinta.
  assert.ok(Math.abs(M.fracaoRuim(menor,80)-0.8)<1e-9,'severidade 80 é ruim');
  assert.ok(Math.abs(M.fracaoRuim(maior,80)-0.2)<1e-9,'mortalidade 80 é boa');
  const vermelho=M.corDe(M.fracaoRuim(menor,80)), verde=M.corDe(M.fracaoRuim(maior,80));
  assert.notEqual(vermelho,verde,'a cor tem de mudar com o sentido');
  const rgb=c=>c.match(/\d+/g).map(Number);
  assert.ok(rgb(vermelho)[0]>rgb(verde)[0],'severidade alta puxa para o vermelho');
  assert.ok(rgb(verde)[1]>rgb(vermelho)[1],'mortalidade alta puxa para o verde');
}

/* ============================ 4. Variável sem escala cadastrada: diz que não sabe */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('12'),'contagem'), av('A2','2026-01-19',todas('40'),'contagem')
  ]),'sev');
  assert.equal(m.escala.definida,false,'contagem não tem teto: a escala não está definida');
  assert.equal(m.escala.max,null);
  assert.match(m.escala.porque,/teto/,'e o motivo é dito em palavras: '+m.escala.porque);
  assert.equal(M.fracao(m,40),null,'sem escala não há fração');
  assert.equal(M.fracaoRuim(m,40),null);
  assert.equal(M.corDe(null),'rgb(150,154,158)','sem escala a coluna sai cinza, não verde nem vermelha');
  // O valor continua legível: o que falta é a escala de cor, não o dado.
  assert.equal(M.valorEm(m,parcela('T1',1),0),12);

  // Declarar o teto na avaliação resolve, sem cadastro novo em outro lugar.
  const comTeto=M.modelo(estudo([
    av('A1','2026-01-12',todas('12'),'contagem',{escalaMaxValor:50}),
    av('A2','2026-01-19',todas('40'),'contagem',{escalaMaxValor:50})
  ]),'sev');
  assert.equal(comTeto.escala.definida,true);
  assert.equal(comTeto.escala.max,50);
  assert.ok(Math.abs(M.fracao(comTeto,40)-0.8)<1e-9);
}

/* ================================ escala ordinal: degrau, e sem AACPD */
{
  const cfg={escalaMax:9};
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('0'),'escala',cfg), av('A2','2026-01-19',todas('33,3'),'escala',cfg),
    av('A3','2026-02-12',todas('66,7'),'escala',cfg)
  ]),'sev');
  assert.equal(m.ordinal,true);
  const p=parcela('T2',1);
  assert.equal(M.valorEm(m,p,3.5),0,'entre avaliações a nota NÃO se move: é degrau');
  assert.equal(M.valorEm(m,p,7),33.3,'no instante da avaliação, o valor daquela avaliação');
  assert.equal(M.valorEm(m,p,20),33.3,'e segue valendo até a próxima');
  assert.equal(M.aacpd(m,p),null,'AACPD não se aplica a escala ordinal');
  // A escala é a do índice de McKinney (0 a 100), não a da nota crua de 0 a 9.
  assert.equal(m.escala.max,100);
  assert.match(m.escala.porque,/McKinney/);
}

/* ================================== valor como texto: vírgula, lixo, vazio */
{
  assert.equal(M.numero('12,5'),12.5,'vírgula decimal é aceita');
  assert.equal(M.numero(' 7 '),7);
  assert.equal(M.numero('0'),0,'zero é observação válida, não ausência');
  assert.equal(M.numero(''),null);
  assert.equal(M.numero(null),null);
  assert.equal(M.numero(undefined),null);
  assert.equal(M.numero('n/a'),null,'texto não-numérico é ausente');
  assert.equal(M.numero('--'),null);
  ['12,5','','n/a',null,undefined,'0'].forEach(v=>{
    const n=M.numero(v);
    assert.ok(n===null||Number.isFinite(n),'NaN não pode escapar daqui: '+v);
  });
  // E nada de NaN pela via do modelo.
  const m=M.modelo(estudo([av('A1','2026-01-12',todas('n/a')),av('A2','2026-01-19',todas('12,5'))]),'sev');
  const v=M.valorEm(m,parcela('T1',1),3);
  assert.ok(v===null||Number.isFinite(v),'valorEm nunca devolve NaN');
}

/* ====================================== a grade varia com o estudo */
{
  const cinco=[1,2,3,4,5].map(i=>({id:'T'+i,produto:'P'+i}));
  const seis=[1,2,3,4,5,6].map(i=>({id:'T'+i,produto:'P'+i}));
  const a=M.modelo({dataInicio:'2026-01-12',numRepeticoes:4,tratamentos:cinco,
                    avaliacoes:[av('A1','2026-01-12',{}),av('A2','2026-01-19',{})]},'sev');
  const b=M.modelo({dataInicio:'2026-01-12',numRepeticoes:3,tratamentos:seis,
                    avaliacoes:[av('A1','2026-01-12',{}),av('A2','2026-01-19',{})]},'sev');
  assert.equal(a.grade.length,20,'5 × 4 dá 20 parcelas');
  assert.equal(b.grade.length,18,'6 × 3 dá 18 parcelas');
  assert.equal(a.grade[0].chave,'T1R1','a chave é a do app (_avRowKey), não "T1:A"');
  assert.equal(b.grade[b.grade.length-1].chave,'T6R3');
  // numRepeticoes ausente não quebra a grade: vira 1.
  const c=M.modelo({dataInicio:'2026-01-12',tratamentos:cinco,avaliacoes:[av('A1','2026-01-12',{})]},'sev');
  assert.equal(c.grade.length,5);
}

/* ============================ avaliação sem data fica de fora, e é dito */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','',todas('20')), av('A3','2026-01-26',todas('30'))
  ]),'sev');
  assert.deepEqual(m.avs.map(x=>x.daa),[0,14],'sem data não há DAA, e a avaliação sai do eixo');
  assert.equal(m.semData,1,'e a tela sabe quantas ficaram de fora para avisar');
}

/* ============ MODO HISTÓRICO: o eixo vertical passa a ser o TEMPO ============
   Mesma exigência do outro modo, vista de outro ângulo: a altura de cada trecho
   é proporcional aos DIAS que ele cobre. Trechos de altura igual desenhariam um
   ensaio que não existiu — e continuariam parecendo certos. */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-01-19',todas('20')),
    av('A3','2026-01-26',todas('30')), av('A4','2026-02-12',todas('40'))
  ]),'sev');
  const tr=M.trajetoria(m,parcela('T2',1));

  assert.equal(tr.vao,31,'a torre cobre o vão inteiro do ensaio, em dias');
  assert.equal(tr.trechos.length,3);
  assert.deepEqual([...tr.trechos.map(t=>t.dias)],[7,7,17]);
  // 7/31, 7/31 e 17/31 — nada de um terço para cada.
  const alturas=tr.trechos.map(t=>t.z1-t.z0);
  alturas.forEach((h,i)=>assert.ok(Math.abs(h-tr.trechos[i].dias/31)<1e-9,
    'altura proporcional aos dias: trecho '+i+' deu '+h));
  assert.ok(Math.abs(alturas[2]/alturas[0]-17/7)<1e-9,
    'o trecho de 17 dias é 2,43× o de 7 — não igual aos outros');
  assert.notEqual(Number(alturas[0].toFixed(6)),Number((1/3).toFixed(6)),
    'e não é um terço, que é o que degraus iguais dariam');
  // A soma das alturas fecha em 1: a torre vai do primeiro ao último DAA.
  assert.ok(Math.abs(alturas.reduce((a,b)=>a+b,0)-1)<1e-9);
  // Os pontos são as MEDIÇÕES, e a posição de cada um é o DAA dele.
  assert.deepEqual([...tr.pontos.map(x=>x.daa)],[0,7,14,31]);
  tr.pontos.forEach(x=>assert.ok(Math.abs(x.z-x.daa/31)<1e-9,'o anel fica no DAA real'));
  assert.equal(tr.buracos,0);
  assert.equal(tr.vazios.length,0);
}

/* O buraco vira vão na torre, e o vão continua existindo como espaço. */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-01-19',todas('20')),
    av('A3','2026-01-26',todas('30',{'T3R2':''})), av('A4','2026-02-12',todas('40'))
  ]),'sev');
  const tr=M.trajetoria(m,parcela('T3',2));
  assert.equal(tr.trechos.length,1,'só o trecho 0→7 tem as duas pontas');
  assert.equal(tr.buracos,2);
  assert.equal(tr.pontos[2].valor,null,'e a medição que falta aparece como falta, não como zero');
  // Os trechos vazios são devolvidos COM a altura que ocupariam: sem isso a
  // parcela mal lançada vira um toco que as torres inteiras escondem, e some
  // justo da vista de quem foi procurar problema.
  assert.equal(tr.vazios.length,2);
  assert.deepEqual([...tr.vazios.map(v=>v.dias)],[7,17]);
  const total=tr.trechos.concat(tr.vazios).reduce((a,t)=>a+(t.z1-t.z0),0);
  assert.ok(Math.abs(total-1)<1e-9,'cheios e vazios juntos cobrem a torre inteira');
  // Nenhum trecho emenda por cima do buraco: não existe trecho de 0 a 31.
  assert.ok(!tr.trechos.some(t=>t.daa0===0&&t.daa1===31),'a torre não emenda por cima da falta');
}

/* Ordinal: o trecho inteiro segura a nota de baixo, e o salto é na medição. */
{
  const cfg={escalaMax:9};
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('0'),'escala',cfg), av('A2','2026-01-19',todas('33,3'),'escala',cfg),
    av('A3','2026-02-12',todas('66,7'),'escala',cfg)
  ]),'sev');
  const tr=M.trajetoria(m,parcela('T2',1));
  tr.trechos.forEach(t=>assert.equal(t.v0,t.v1,'no ordinal o trecho não caminha: v0 === v1'));
  assert.deepEqual([...tr.trechos.map(t=>t.v0)],[0,33.3]);
  // Mas as alturas continuam sendo os dias reais: 7 e 24 de 31.
  assert.deepEqual([...tr.trechos.map(t=>t.dias)],[7,24]);
}

/* Sem avaliação nenhuma, a trajetória é vazia em vez de explodir. */
{
  const m=M.modelo(estudo([]),'sev');
  const tr=M.trajetoria(m,parcela('T1',1));
  assert.equal(tr.trechos.length,0);
  assert.equal(tr.pontos.length,0);
  assert.equal(tr.vao,0);
}

/* Os dois modos existem na tela e dizem o que cada um mede. */
{
  const c3=fs.readFileSync('campo-3d.js','utf8');
  assert.ok(/\['dia','Estado no dia'/.test(c3)&&/\['historico','Histórico 3D'/.test(c3),
    'faltam os dois modos na lista que monta os botões');
  assert.ok(/data-modo="/.test(c3),'os botões precisam carregar qual modo acionam');
  assert.ok(/altura = valor/.test(c3)&&/altura = tempo/.test(c3),
    'cada botão precisa dizer o que a altura significa naquele modo');
  // No histórico o tempo é o eixo: não pode sobrar um controle de tempo
  // competindo com ele e sugerindo que ainda há um instante escolhido.
  assert.ok(/estado\.modo==='dia'\s*\n?\s*\?/.test(c3)||/estado\.modo==='dia'/.test(c3),
    'os controles de tempo precisam ser condicionais ao modo');
}

/* ==================== o módulo NÃO é carregado no arranque do app ============ */
{
  const index=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
  assert.ok(!/campo-3d\.(js|css)/.test(index),
    'campo-3d não pode estar no index.html: o caminho de campo não paga esse download');
  assert.ok(/\.\/campo-3d\.js\?v=\d+/.test(sw)&&/\.\/campo-3d\.css\?v=\d+/.test(sw),
    'mas precisa estar no pré-cache do service worker, senão não abre offline');
  const ep=fs.readFileSync('estudo-pagina.js','utf8');
  assert.ok(/createElement\('script'\)/.test(ep)&&/campo-3d\.js/.test(ep),
    'o estudo-pagina.js precisa injetar o módulo sob demanda');
  assert.ok(/data-ep-action="campo"/.test(ep),'falta o botão Ver no campo');
  assert.ok(/Ver no campo/.test(ep)&&!/>3D</.test(ep),
    'o rótulo descreve o que mostra, não a técnica');
  assert.ok(/data-ep-variavel=/.test(ep)&&/data-ep-avaliacao=/.test(ep),
    'o botão precisa levar a variável e a avaliação já escolhidas no painel');
  const c3=fs.readFileSync('campo-3d.js','utf8');
  assert.ok(!/three|THREE|import\s|require\(/.test(c3),'nenhuma biblioteca nova: canvas 2D e pronto');
  assert.ok(/getContext\('2d'\)/.test(c3),'o desenho é canvas 2D com projeção própria');
}

/* ====================================== 9. a régua da altura diz o que a altura é
   A altura sempre significou alguma coisa e não dizia quanto. A régua resolve
   isso — e só vale se usar a MESMA conta que levanta a coluna. Uma régua com
   mapeamento próprio seria pior que régua nenhuma: daria autoridade de medida a
   um desencontro. */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-02-02',todas('40'))
  ]),'sev');

  const dia=M.eixo(m,'dia');
  assert.equal(dia.marcas.length,5,'cinco marcas: 0, 25, 50, 75 e 100 % da altura');
  assert.equal(dia.marcas[0].v,m.escala.min);
  assert.equal(dia.marcas[4].v,m.escala.max,'o topo da régua é o topo da escala da variável');
  /* O laço que importa: a marca em f vale v, e a coluna de valor v sobe até f. */
  dia.marcas.forEach(mk=>assert.ok(Math.abs(M.fracao(m,mk.v)-mk.f)<1e-9,
    'a régua e a altura da coluna precisam ser a mesma conta (marca '+mk.texto+')'));
  assert.equal(dia.titulo,'%','a régua diz a unidade da variável');

  /* No histórico a altura é TEMPO, então a régua muda de assunto junto. */
  const hist=M.eixo(m,'historico');
  assert.equal(hist.titulo,'DAA');
  assert.equal(hist.marcas[4].v,m.daaMax,'o topo é o último DAA do ensaio');
  assert.equal(hist.marcas[0].v,0);
  assert.notEqual(dia.marcas[4].texto,hist.marcas[4].texto,
    'as duas réguas não podem coincidir por acaso neste estudo');

  /* Sem escala definida não há régua no modo dia: ali a altura já é fixa por
     decisão, e uma régua sugeriria uma medida que não existe. */
  const semEscala=M.modelo(estudo([av('A1','2026-01-12',todas('3'),'contagem')]),'sev');
  assert.equal(semEscala.escala.definida,false);
  assert.equal(M.eixo(semEscala,'dia'),null,'sem escala, sem régua');

  /* Uma avaliação só, no dia zero: não há eixo de tempo para medir. */
  const umDia=M.modelo(estudo([av('A1','2026-01-12',todas('10'))]),'sev');
  assert.equal(umDia.daaMax,0);
  assert.equal(M.eixo(umDia,'historico'),null,'sem tempo decorrido, sem régua de tempo');
}

/* ================================== 10. a cor anda em faixas, com corte visível
   Degradê contínuo parecia mais fino e lia pior: entre 31 % e 36 % ninguém
   enxerga a diferença de tom, e não dá para dizer em que altura da escala uma
   coluna está. O que NÃO pode acontecer é a faixa virar classificação secreta —
   por isso a legenda mostra os cortes em número — nem os cortes serem fixos em
   5/20/40/60, que só fariam sentido para severidade em porcentagem. */
{
  const m=M.modelo(estudo([
    av('A1','2026-01-12',todas('10')), av('A2','2026-02-02',todas('40'))
  ]),'sev');
  const fs=M.faixas(m);
  assert.equal(fs.length,5,'cinco faixas');
  assert.equal(fs[0].de,m.escala.min,'a primeira começa no piso da escala');
  assert.equal(fs[4].ate,m.escala.max,'e a última termina no teto');
  fs.forEach((f,i)=>{ if(i)assert.equal(f.de,fs[i-1].ate,'sem buraco nem sobreposição entre faixas'); });

  /* Todo valor da escala cai em exatamente uma faixa, inclusive as pontas. */
  assert.equal(M.faixaDe(m,m.escala.min),0,'o piso cai na primeira');
  assert.equal(M.faixaDe(m,m.escala.max),4,'o teto pertence à última — não fica fora de todas');
  assert.equal(M.faixaDe(m,m.escala.min+(m.escala.max-m.escala.min)*0.5),2,'o meio cai na do meio');

  /* Dois valores da MESMA faixa recebem a mesma cor; de faixas vizinhas, não. */
  const vao=m.escala.max-m.escala.min, cor=v=>fs[M.faixaDe(m,v)].cor;
  assert.equal(cor(m.escala.min+vao*0.05),cor(m.escala.min+vao*0.15),'mesma faixa, mesma cor');
  assert.notEqual(cor(m.escala.min+vao*0.15),cor(m.escala.min+vao*0.25),'faixa vizinha, cor diferente');

  /* O sentido continua invertendo só a COR: com "maior é melhor", o topo da
     escala fica verde e o piso vermelho. */
  const maiorAv2=[av('A1','2026-01-12',todas('10'),'pct',{sentido:'maior'})];
  const mm=M.modelo(estudo(maiorAv2),'sev');
  assert.equal(mm.sentido,'maior');
  assert.equal(M.faixas(mm)[4].cor,M.faixas(m)[0].cor,'invertido, o teto usa a cor que o piso usava');
  assert.equal(M.faixas(mm)[0].cor,M.faixas(m)[4].cor);

  /* A ALTURA continua contínua: quantizar a cor não pode quantizar a medida. */
  const a=M.fracao(m,m.escala.min+vao*0.11), b=M.fracao(m,m.escala.min+vao*0.19);
  assert.notEqual(a,b,'dois valores da mesma faixa mantêm alturas diferentes');

  /* Sem escala, sem faixa — e a cor cai no cinza de "sem escala". */
  const semEscala=M.modelo(estudo([av('A1','2026-01-12',todas('3'),'contagem')]),'sev');
  assert.equal(M.faixas(semEscala),null);
  assert.equal(M.faixaDe(semEscala,3),null);

  /* A legenda mostra número, não adjetivo — conferido na função dela, não no
     arquivo inteiro: "intermediário" aparece num comentário sobre escala
     ordinal, que é outro assunto. */
  const src=fs2.readFileSync('campo-3d.js','utf8');
  const leg=src.slice(src.indexOf('function legenda('),src.indexOf('\n}',src.indexOf('function legenda(')));
  assert.match(src,/function rotuloFaixa/,'a legenda tem rótulo por faixa');
  assert.ok(/rotuloFaixa/.test(leg),'e a usa');
  assert.ok(!/intermediário|melhor<|pior</.test(leg),
    'adjetivo não deixa ninguém conferir em que faixa a coluna caiu; "20 – 40" deixa');
  assert.ok(!/[^\w](5|20|40|60)\s*,\s*(20|40|60|80)[^\w]/.test(src),
    'os cortes saem da escala da variável, não de números fixos de severidade');
}

/* ============================ 11. a caixa manda nas DUAS medidas do desenho */
{
  const c3=fs.readFileSync('campo-3d.js','utf8');
  const lig=c3.slice(c3.indexOf('function ligarCanvas('),c3.indexOf('\n}',c3.indexOf('function ligarCanvas(')));
  assert.match(lig,/clientWidth/,'a largura vem da caixa');
  assert.match(lig,/clientHeight/,
    'e a altura também: fixa em 380, uma caixa de 320 espremia o desenho 16 % na vertical — coluna mais baixa do que o valor que ela representa');
}

w.close();
console.log('Ver no campo: DAA real, ausência que não é zero, sentido só na cor, variável sem escala, ordinal em degraus, grade variável, trajetória do Histórico 3D proporcional aos dias e carga sob demanda OK.');
