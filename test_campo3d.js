/* "Ver no campo" — as regras em que a tela poderia mentir sem ninguém notar.
 *
 * Uma vista 3D erra bonito: as colunas continuam saindo, coloridas e plausíveis,
 * enquanto o eixo do tempo está falsificado ou a ausência virou zero. Nenhum
 * desses quatro erros produz tela quebrada, e é por isso que cada um tem teste.
 *
 * Rodar: node test_campo3d.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
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

w.close();
console.log('Ver no campo: DAA real, ausência que não é zero, sentido só na cor, variável sem escala, ordinal em degraus, grade variável e carga sob demanda OK.');
