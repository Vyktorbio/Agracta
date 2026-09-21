/* CONTINUAR DE ONDE PAROU — o estudo lembra a parcela, não a pessoa.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Quem avalia 24 parcelas no sol não termina de uma vez: para no meio, atende o
 * telefone, volta depois do almoço. Ao reabrir o estudo, o app mostrava a "próxima
 * melhor ação" — genérica, do fluxo inteiro — e a pessoa ia procurar em qual
 * avaliação estava e em qual parcela tinha parado. O app sabia as duas coisas.
 *
 * AS TRÊS REGRAS DESTA LINHA:
 *
 *  1. SÓ EXISTE QUANDO HÁ ONDE VOLTAR. Leitura começada e não terminada. Estudo
 *     que ninguém tocou não tem de onde retomar, e prometer um lugar em que a
 *     pessoa nunca esteve é pior que não dizer nada.
 *  2. ELA VEM ANTES DA PRÓXIMA MELHOR AÇÃO. Quem largou a prancheta na parcela 23
 *     não quer saber do dossiê: quer voltar para a 23.
 *  3. UM TOQUE RETOMA NA PARCELA CERTA. Abrir a avaliação e deixar a pessoa achar
 *     a parcela 23 numa grade de 24 é a metade do favor.
 *
 * Rodar: node test_retomar.js
 */
var fs=require('fs'), vm=require('vm');
var P=require('./vendor/pendencias-core.js');
var src=fs.readFileSync('app.js','utf8');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei a função '+nome+' em app.js');
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}

/* 2 tratamentos × 2 repetições. A numeração de campo é a do sorteio: a segunda
   repetição do T1 é a parcela 23 — e é nela que a pessoa parou. */
function ensaio(){
  return {
    id:'S1', codigo:'EST-77', numRepeticoes:2, numAplicacoes:1, randomizado:true,
    dataInicio:'2026-09-01',
    randomizacao:{ordem:[
      {parcela:11,tratId:'T2',rep:1},{parcela:12,tratId:'T1',rep:1},
      {parcela:23,tratId:'T1',rep:2},{parcela:24,tratId:'T2',rep:2}
    ]},
    tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Produto A',dose:'1 L/ha'}],
    aplicacoes:[{id:'ap1',data:'2026-09-01',hora:'08:00'}],
    avaliacoes:[{id:'av1',data:'2026-09-08',variaveis:['Mort'],
                 notas:{T2R1:{Mort:3},T1R1:{Mort:0}}}],
    amostras:[]
  };
}
var OPTS={rotuloAvaliacao:function(){ return '7 DAA'; }};

/* ============================================================================ */
console.log('\n--- 1. Você parou na parcela 23, na avaliação de 7 DAA ---');
var r=P.retomada(ensaio(),OPTS);
ck(!!r,'há de onde retomar');
eq(r.rotulo,'7 DAA','a avaliação é dita pelo momento, como no resto do app');
eq(r.numero,23,'e a parcela pelo número da estaca');
eq(r.parcela,'T1R2','com a chave que a grade da avaliação entende');
eq(r.faltam,2,'e diz quantas ainda faltam');
ck(/Você parou na avaliação de 7 DAA/.test(r.texto),'a frase é a da pessoa: "você parou..."');
ck(/a próxima é a 23/.test(r.detalhe),'e aponta por onde continuar');

console.log('\n--- 2. Só existe quando há onde voltar ---');
var intocado=ensaio(); intocado.avaliacoes[0].notas={};
eq(P.retomada(intocado,OPTS),null,'avaliação nunca tocada não gera retomada');
var pronto=ensaio();
pronto.avaliacoes[0].notas={T1R1:{Mort:0},T1R2:{Mort:1},T2R1:{Mort:3},T2R2:{Mort:2}};
eq(P.retomada(pronto,OPTS),null,'avaliação terminada também não: não há o que retomar');
eq(P.retomada({id:'X',tratamentos:[],avaliacoes:[]},OPTS),null,'estudo sem avaliação nenhuma não inventa uma');

console.log('\n--- 3. Entre várias começadas, vale a mais recente ---');
var duas=ensaio();
duas.avaliacoes=[
  {id:'velha',data:'2026-09-08',variaveis:['Mort'],notas:{T1R1:{Mort:1}}},
  {id:'nova', data:'2026-09-15',variaveis:['Mort'],notas:{T2R1:{Mort:2}}}
];
eq(P.retomada(duas,OPTS).avId,'nova','a prancheta estava na leitura mais recente');

console.log('\n--- 4. A linha do topo troca a próxima ação pela retomada ---');
var ctx={ console:console, String:String, Array:Array, Object:Object, JSON:JSON, Math:Math,
  esc:function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); },
  PendenciasCore:P,
  normalizeStudy:function(s){ return s; },
  estudoFinalizado:function(s){ return !!(s&&s.finalizacao&&s.finalizacao.em); },
  isQuadraLab:function(){ return false; },
  studyCultura:function(){ return 'Soja'; },
  studyTestemunha:function(){ return 'T1'; },
  isoToBR:function(d){ return d; },
  data:{Q1:{estudos:[]}},
  /* O fluxo e o próximo evento são a ENTRADA desta tela, não o assunto do teste:
     entram prontos para que o que se meça seja a escolha da linha de foco. */
  nextEventV2:function(){ return {ev:{type:'eval',id:'av1',tipo:'avaliação'},diff:0}; },
  _studyWorkflow:function(){
    var st=function(id,label,state,detail){ return {id:id,label:label,anchor:'a-'+id,state:state,detail:detail}; };
    var w={protocolo:st('protocolo','Protocolo','complete','Conferido'),
           planejamento:st('planejamento','Planejamento','complete','Croqui randomizado'),
           execucao:st('execucao','Aplicação','complete','1 de 1'),
           avaliacoes:st('avaliacoes','Avaliações','active','0 de 1 concluídas'),
           analise:st('analise','Análise','ready','Pronta'),
           dossie:st('dossie','Dossiê','pending','Aguardando')};
    w.stages=[w.protocolo,w.planejamento,w.execucao,w.avaliacoes,w.analise,w.dossie];
    return w;
  },
  fD:function(d){ return String(d); }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('_avCroquiEscJs'), pega('avRotuloMomento'), pega('_pendOpts'),
  pega('pendRetomada'), pega('_studyWorkflowHtml')
].join('\n'), ctx);
/* avRotuloMomento pede a base de DAA do estudo; aqui ela entra direta. */
ctx._pranchaBase=function(){ return {data:new Date('2026-09-01T00:00:00')}; };
ctx.pD=function(d){ var x=new Date(String(d)+'T00:00:00'); return isNaN(x)?null:x; };
ctx.daysBetween=function(a,b){ return Math.round((b-a)/864e5); };
ctx.avMomento=function(av,daa){ return {rotulo:(daa==null?'':daa)+' DAA'}; };

var est=ensaio();
var html=ctx._studyWorkflowHtml('Q1','S1',est);
ck(/CONTINUE DE ONDE PAROU/.test(html),'a tarja do foco passa a ser a da retomada');
ck(!/PRÓXIMA MELHOR AÇÃO/.test(html),'e a próxima melhor ação sai da frente — uma coisa por vez');
ck(/Você parou na avaliação de 7 DAA/.test(html),'o título diz onde a pessoa parou');
ck(/a próxima é a 23/.test(html),'o detalhe diz a parcela');
ck(/>Retomar</.test(html),'e o botão se chama Retomar');
ck(/pendIr\('Q1','S1','avaliacao','av1','T1R2'\)/.test(html),
   'um toque abre a avaliação certa JÁ na parcela certa');
ck(/study-focus retomar/.test(html),'a faixa ganha a classe própria, para não se confundir com a verde');

console.log('\n--- 5. Sem retomada, a próxima melhor ação continua como era ---');
var htmlPronto=ctx._studyWorkflowHtml('Q1','S1',pronto);
ck(/PRÓXIMA MELHOR AÇÃO/.test(htmlPronto),'estudo em dia volta à linha de sempre');
ck(!/CONTINUE DE ONDE PAROU/.test(htmlPronto),'sem leitura pela metade não há o que retomar');

console.log('\n--- 6. Estudo finalizado não convida a voltar ---');
var fim=ensaio(); fim.finalizacao={em:'2026-09-20T10:00:00Z'};
var htmlFim=ctx._studyWorkflowHtml('Q1','S1',fim);
ck(!/CONTINUE DE ONDE PAROU/.test(htmlFim),
   'finalizado é somente-leitura: retomar ali seria convidar para uma porta trancada');

console.log('\n--- 7. A porta da parcela é a mesma do croqui ---');
/* `avCroquiSelect` já sabe posicionar o modo automático, rolar até a célula e pôr
   o foco nela. Uma segunda regra de "ir para a parcela" sairia de sincronia. */
var abre=pega('openStudyEditAvaliacao');
ck(/function openStudyEditAvaliacao\(aid,tipoSugerido,forceUnlock,irParaParcela\)/.test(abre),
   'openStudyEditAvaliacao aceita a parcela de destino');
ck(/if\(irParaParcela\)\{[\s\S]*avCroquiSelect\(irParaParcela\)/.test(abre),
   'e usa avCroquiSelect — o mesmo caminho do toque no croqui');
var ir=pega('pendIr');
ck(/openStudyEditAvaliacao\(id,null,false,parcela\|\|''\)/.test(ir),
   'pendIr repassa a parcela ao abrir a avaliação');
ck(/openNemAmostras/.test(ir)&&/openStudyEditAplicacao/.test(ir)&&/openStudyEditV2/.test(ir),
   'e cada família de pendência tem a sua porta');

console.log('\n--- 8. Consulta não escreve no estudo ---');
var antes=JSON.stringify(est);
ctx._studyWorkflowHtml('Q1','S1',est);
P.retomada(est,OPTS);
eq(JSON.stringify(est),antes,'pintar a linha não altera o estudo');

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
