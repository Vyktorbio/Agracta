/* A cor da máscara das quadras no mapa.
 *
 * Três coisas aqui podem mentir, e é por isso que o teste existe:
 *   1. arredondar. 23 parcelas prontas de 24 é PARCIAL — verde ali some com a
 *      parcela que falta, que é justamente a informação que a cor existe para
 *      dar;
 *   2. pintar de vermelho quem não tem avaliação cadastrada. "Pendente" é
 *      parcela que espera lançamento, não estudo que ainda nem foi desenhado;
 *   3. cobrir o NDVI. Ali a cor é uma MEDIDA do satélite; estado de lançamento
 *      por cima dela trocaria um dado por um andamento.
 *
 * Rodar: node test_mascara.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('node:vm');
const M=require('./vendor/mascara-core.js');

/* ------------------------------------------------------- 1. o motor puro --- */
assert.equal(M.estadoParcela(4,0),'empty');
assert.equal(M.estadoParcela(4,2),'partial');
assert.equal(M.estadoParcela(4,4),'done');
assert.equal(M.estadoParcela(0,0),null,'sem valor previsto a parcela não tem estado');
assert.equal(M.estadoParcela(4,9),'done','mais lançamentos que previstos não passa de concluída');

assert.equal(M.estadoQuadra({done:24}),'avaliada');
assert.equal(M.estadoQuadra({done:23,empty:1}),'parcial','23 de 24 não arredonda para verde');
assert.equal(M.estadoQuadra({empty:8}),'pendente');
assert.equal(M.estadoQuadra({partial:1,empty:7}),'parcial','uma parcela começada já tira do pendente');
assert.equal(M.estadoQuadra({}),'fora');
assert.equal(M.estadoQuadra({done:2},{selecionada:true}),'selecionada','a seleção manda na cor');
['avaliada','parcial','pendente','selecionada','fora'].forEach(k=>{
  const e=M.estilo(k);
  assert.match(e.cor,/^#[0-9a-f]{6}$/,'a cor de '+k+' precisa ser um hex');
  assert.ok(e.preenchimento>0&&e.preenchimento<=1,'opacidade de '+k+' fora da faixa');
});
assert.equal(M.estilo('inventado').cor,M.CORES.fora.cor,'estado desconhecido não pinta cor de trabalho');
/* Cinco estados, cinco cores: duas iguais fariam a legenda mentir. */
const cores=['avaliada','parcial','pendente','selecionada','fora'].map(k=>M.estilo(k).cor);
assert.equal(new Set(cores).size,5,'cada estado precisa da sua própria cor');

/* -------------------------------------------- 2. a contagem, dentro do app --- */
const app=fs.readFileSync('app.js','utf8');
function pega(src,nome){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,'falta a função '+nome);
  let prof=0,abriu=false,j=i;
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}
function contar(estudos){
  const ctx=vm.createContext({
    MascaraCore:M, String, Number, Math,
    data:{Q1:{estudos:estudos}},
    normalizeStudy:x=>x,
    estudoFinalizado:st=>!!st.finalizado,
    _avRowsForStudy:st=>st.__parcelas,
    _avNota:(av,row,v)=>((av.notas||{})[row.key]||{})[v]
  });
  vm.runInContext(pega(app,'_mascaraContagem')+'\n'+pega(app,'_mascaraEstilo'),ctx);
  return {
    /* Cópia simples: o objeto volta do contexto do vm com outro protótipo,
       e deepEqual compararia realidade com realidade e reprovaria. */
    contagem:JSON.parse(JSON.stringify(vm.runInContext('_mascaraContagem("Q1")',ctx))),
    estilo:sel=>JSON.parse(JSON.stringify(vm.runInContext('_mascaraEstilo("Q1",'+(sel?'true':'false')+')',ctx)))
  };
}
const parcelas=[{key:'T1R1'},{key:'T1R2'},{key:'T2R1'},{key:'T2R2'}];
const avaliacao=notas=>({variaveis:['Severidade'],notas:notas});

/* Nada lançado: pendente. */
let r=contar([{__parcelas:parcelas,avaliacoes:[avaliacao({})]}]);
assert.deepEqual(r.contagem,{done:0,partial:0,empty:4});
assert.equal(r.estilo(false).cor,M.CORES.pendente.cor);

/* Tudo lançado: avaliada. Zero é valor lançado — "0 %" de severidade é um
   resultado, não uma lacuna. */
r=contar([{__parcelas:parcelas,avaliacoes:[avaliacao({T1R1:{Severidade:0},T1R2:{Severidade:'3,5'},T2R1:{Severidade:9},T2R2:{Severidade:'12'}})]}]);
assert.deepEqual(r.contagem,{done:4,partial:0,empty:0});
assert.equal(r.estilo(false).cor,M.CORES.avaliada.cor);
assert.equal(r.estilo(true).cor,M.CORES.selecionada.cor,'em edição a quadra fica azul');

/* Duas avaliações, só a primeira lançada: a parcela está parcial. */
r=contar([{__parcelas:parcelas,avaliacoes:[
  avaliacao({T1R1:{Severidade:1},T1R2:{Severidade:2},T2R1:{Severidade:3},T2R2:{Severidade:4}}),
  avaliacao({})]}]);
assert.deepEqual(r.contagem,{done:0,partial:4,empty:0});
assert.equal(r.estilo(false).cor,M.CORES.parcial.cor);

/* Espaço em branco não é lançamento. */
r=contar([{__parcelas:[{key:'T1R1'}],avaliacoes:[avaliacao({T1R1:{Severidade:'   '}})]}]);
assert.deepEqual(r.contagem,{done:0,partial:0,empty:1},'espaço em branco continua pendente');

/* Estudo sem avaliação cadastrada não pinta nada — fica fora do estudo. */
r=contar([{__parcelas:parcelas,avaliacoes:[]}]);
assert.deepEqual(r.contagem,{done:0,partial:0,empty:0});
assert.equal(r.estilo(false).cor,M.CORES.fora.cor,'estudo sem avaliação não vira vermelho');
assert.equal(contar([]).estilo(false).cor,M.CORES.fora.cor,'quadra sem estudo fica fora do estudo');

/* Estudo finalizado com lacuna: concluído, não amarelo para sempre. */
r=contar([{finalizado:true,__parcelas:parcelas,avaliacoes:[avaliacao({T1R1:{Severidade:1}})]}]);
assert.deepEqual(r.contagem,{done:4,partial:0,empty:0},'estudo fechado não admite mais lançamento');

/* Duas execuções na mesma quadra somam parcelas. */
r=contar([
  {__parcelas:[{key:'T1R1'}],avaliacoes:[avaliacao({T1R1:{Severidade:1}})]},
  {__parcelas:[{key:'T1R1'}],avaliacoes:[avaliacao({})]}]);
assert.deepEqual(r.contagem,{done:1,partial:0,empty:1});
assert.equal(r.estilo(false).cor,M.CORES.parcial.cor);

/* ------------------------------------------------ 3. quem manda na cor ----- */
const render=pega(app,'render');
const iNdvi=render.indexOf('_zona?_ndviColor'), iMask=render.indexOf('_mascaraEstilo');
assert.ok(iNdvi>=0&&iMask>=0,'render precisa consultar o NDVI e a máscara');
assert.match(render,/_zona\?null:_mascaraEstilo/,
  'com a camada de índice ligada a máscara nem é calculada: ali a cor é medida do satélite');
assert.match(render,/_mask\?_mask\.cor:ac/,
  'sem o motor da máscara o mapa volta à cor da cultura — leitura que falta não apaga a quadra');
assert.ok(!/fillOpacity:zona\?0\.8:0\.38/.test(render),
  'o realce do ponteiro não pode ser fixo: em cima de uma máscara de 0.50 ele clareava em vez de destacar');
assert.match(render,/Math\.min\(0\.82,zfo\+0\.22\)/,'o realce soma ao que já está pintado');

/* ------------------------------------------- 4. publicação e pré-cache ----- */
const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
const pedido=(html.match(/vendor\/mascara-core\.js\?v=\d+/)||[])[0];
assert.ok(pedido,'o index.html precisa carregar o motor da máscara');
assert.ok(sw.includes(pedido),'o sw.js precisa pré-carregar exatamente "'+pedido+'"');
assert.ok(html.indexOf(pedido)<html.indexOf('app.js?v='),'o motor tem de carregar ANTES do app.js');

console.log('Máscara das quadras: estados, arredondamento, estudo fechado, prioridade do NDVI e reserva da cultura OK.');
