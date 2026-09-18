/* A FICHA DA QUADRA RESPONDE "O QUE ESTÁ ANDANDO AQUI?"
 *
 * Relato de uso: "quando eu finalizo, eles não somem de lá — eu nunca sei qual
 * estudo é que está em andamento".
 *
 * A lista da quadra era uma só, em ordem de cadastro, e o encerrado ficava no
 * meio dos que estão rodando. Quem abre a ficha faz UMA pergunta, e precisava
 * conferir estudo por estudo para respondê-la. Pior: o cartão do finalizado
 * ainda podia vestir etiqueta de urgência — ensaio terminado gritando mais alto
 * que o que está em campo.
 *
 * O finalizado NÃO sai do app: sai da frente. Duas regras, e este arquivo
 * guarda as duas.
 *
 * Rodar: node test_quadra_finalizados.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');

/* ---------------------------------------------------------------- extrair ---
   O cartão que a tela usa é um OVERRIDE no fim do app.js (o renderStudyCard
   declarado lá em cima é substituído). Testar o de cima seria testar código que
   não pinta nada — foi o que quase aconteceu quando este conserto foi escrito. */
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
const CARTAO=fatia('renderStudyCard=function(qid,study){');
assert.match(CARTAO,/study-card-v2/,'a fatia extraída é mesmo o cartão em uso');

/* ---------------------------------------------------------------- 1. cartão ---
   Com o estudo finalizado, nextEventV2 é DELIBERADAMENTE preparado para devolver
   um evento de hoje. Se a etiqueta aparecer, a regra não está valendo. */
const ctx={ console, String, Number, Math, JSON, Object, Array, isFinite,
  esc:v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  isoToBR:v=>String(v||''),
  normalizeStudy:s=>Object.assign({tratamentos:[],numRepeticoes:4,aplicacoes:[],avaliacoes:[]},s),
  _avTemNota:()=>false,
  _agFormatDateTime:v=>'20/11/2025, 11:30',
  estudoFinalizado:s=>!!(s&&s.finalizacao&&s.finalizacao.em),
  nextEventV2:()=>({ev:{type:'aval',idx:1},diff:0})   /* HOJE, urgente */
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext('var renderStudyCard;\n'+CARTAO+';',ctx);

const rodando={id:'S1',codigo:'24-118'};
const findo={id:'S2',codigo:'24-090',finalizacao:{em:'2025-11-20T14:30:00Z',por:'Victor'}};

const hVivo=ctx.renderStudyCard('Q1',rodando);
const hFim=ctx.renderStudyCard('Q1',findo);

assert.match(hVivo,/study-card-v2-next/,'o estudo em andamento continua mostrando o próximo evento');
assert.match(hVivo,/HOJE/,'com a etiqueta de urgência de sempre');

assert.ok(!/study-card-v2-next/.test(hFim),
  'ESTUDO FINALIZADO NÃO TEM PRÓXIMO: nenhuma etiqueta de evento no cartão dele');
assert.ok(!/HOJE|atrasado/.test(hFim),
  'e nenhuma palavra de urgência — ele acabou, não está atrasado');
assert.match(hFim,/study-card-v2 finalizada|finalizada/,'o cartão se declara finalizado por classe');
assert.match(hFim,/🔒/,'com o cadeado ao lado do código');
assert.match(hFim,/Finalizado em/,'e dizendo quando terminou');
assert.match(hFim,/Victor/,'e por quem, quando o registro tem quem');

/* --------------------------------------------------------------- 2. a seção ---
   O fluxo vive dentro de showD, que é grande demais para rodar fora do
   navegador — mas as decisões dele são legíveis na fonte, e são elas que este
   bloco fixa. Conferido em Chromium a 430px antes de escrever. */
const SECAO=src.slice(src.indexOf('/* ESTUDOS: EM ANDAMENTO PRIMEIRO'),
                      src.indexOf('/* NDVI é satélite sobre polígono'));
assert.ok(SECAO.length>400,'achei a seção de estudos da ficha da quadra');

assert.match(SECAO,/ESTUDOS \('\+_vivos\.length\+'\)/,
  'o título conta os EM ANDAMENTO — era o total, e o total não responde a pergunta de quem abre a ficha');
assert.match(SECAO,/_vivos\.forEach\(function\(study\)\{ h\+=renderStudyCard/,
  'a lista de cima é só a dos que estão rodando');
assert.match(SECAO,/studies-fim-t/,'os finalizados ficam atrás de um botão');
assert.match(SECAO,/aria-expanded/,'que diz se está aberto ou fechado');
assert.match(SECAO,/if\(_qFinAberto\)\{[\s\S]*_fim\.forEach/,
  'e só pinta os cartões finalizados quando o botão está aberto');
assert.ok(/Nenhum estudo em andamento/.test(SECAO),
  'quadra só com finalizados diz isso, e não "nenhum cadastrado" — que seria mentira e esconderia o histórico');
assert.ok(SECAO.indexOf('_fim.length')<SECAO.indexOf('studies-fim-lista'),
  'sem finalizado nenhum, nem o botão aparece');

/* Recolhido por padrão, e recolhido de novo a cada quadra: quem abriu o
   histórico numa quadra não pediu para abri-lo em todas. */
assert.match(src,/var _qFinAberto=false/,'o histórico nasce recolhido');
assert.match(src,/if\(id!==_qFinQuadra\)\{ _qFinQuadra=id; _qFinAberto=false; \}/,
  'e volta a recolher quando a quadra muda');
assert.match(src,/function toggleEstudosFinalizados\(\)/,'o botão tem função própria');

/* --------------------------------------------------- 3. a folha acompanha --- */
const css=fs.readFileSync('styles.css','utf8');
['.study-card-v2.finalizada','.studies-fim-t','.study-card-v2-fim'].forEach(sel=>{
  assert.ok(css.indexOf(sel)>=0,'styles.css precisa estilizar '+sel);
});
assert.match(css,/\.studies-fim-t:focus-visible/,
  'o botão do histórico é alcançável por teclado e mostra foco');

console.log('Ficha da quadra: em andamento na frente, finalizados atrás de um botão recolhido, e nenhuma etiqueta de urgência em ensaio terminado OK.');
