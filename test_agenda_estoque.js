/* A agenda passa a saber do estoque.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * "O lote vence antes da próxima aplicação" e "o saldo não cobre o que falta" são
 * fatos que o app já podia deduzir do que grava — e que, sem isto, só apareciam no
 * dia em que faltou produto no campo. Que é tarde.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. NÃO VIRA EVENTO DA AGENDA. Evento é coisa que se faz numa data, e é sobre eles
 *     que o "próximo evento" se apoia. Um aviso de estoque ali empurraria a
 *     aplicação de amanhã para o segundo lugar.
 *  2. SÓ FALA DO QUE SABE. A necessidade por aplicação vem da BAIXA JÁ REGISTRADA,
 *     nunca de estimativa: um número inventado aqui vira compra errada.
 *  3. VALIDADE É SOBRE O USO PREVISTO. Vencer não importa; vencer ANTES da próxima
 *     aplicação importa.
 *  4. ESTUDO SEM APLICAÇÃO PENDENTE NÃO RECLAMA de estoque — e finalizado, menos ainda.
 *
 * Rodar: node test_agenda_estoque.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

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
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var ctx={console:console, Date:Date, String:String, Number:Number, Math:Math, Object:Object,
  Array:Array, JSON:JSON, isFinite:isFinite, parseInt:parseInt,
  estudoFinalizado:function(s){ return !!(s&&s.finalizado); }};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('pD'), pega('fD'), pega('fDIso'), pega('isoToBR'), pega('today0'), pega('addDays'),
  pega('daysBetween'), pega('_avTemNota'), pega('_avRowKey'),
  pega('studyEventsV2'), pega('aplicacaoConsumos'),
  pega('_itemNumero'), pega('_loteImpacto'), pega('itemLoteSaldo'),
  pega('estudoAvisosEstoque'),
  'function itemLotePorId(itemId,loteId){ return (LOTES||{})[loteId]||null; }'
].join('\n'), ctx);
function cod(as){ return as.map(function(a){return a.codigo;}).sort().join(','); }

/* Datas relativas a hoje: um estudo com aplicações ainda por fazer. */
function iso(desloc){
  var d=new Date(); d.setDate(d.getDate()+desloc);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function lote(o){
  return Object.assign({id:'l1', codigo:'SK-2311', unidade:'L', situacao:'ativo', validade:'',
    eventos:[{tipo:'recebimento', quantidade:5, unidade:'L', impacto:5}]}, o||{});
}
/* 3 aplicações no total, a 1ª já feita (com baixa registrada de 0,5 L), faltam 2. */
function estudo(){
  return {id:'s1', codigo:'AGR-1', numAplicacoes:3, intervaloDias:7, dataInicio:iso(-7),
    numRepeticoes:3, avaliacoes:[],
    tratamentos:[{id:'T1', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}}],
    aplicacoes:[{id:'ap1', data:iso(-7), consumos:[
      {loteId:'l1', itemId:'i1', codigo:'SK-2311', nome:'Sankari', quantidade:0.5, unidade:'L'}]}]};
}

console.log('\n--- Saldo folgado: nada a dizer ---');
ctx.LOTES={l1:lote()};                    /* 5 L, precisa de ~1 L */
eq(ctx.estudoAvisosEstoque(estudo(),'Q1').length, 0, 'lote que cobre o que falta não gera aviso');

console.log('\n--- Saldo que não cobre o que falta ---');
ctx.LOTES={l1:lote({eventos:[{tipo:'recebimento',quantidade:0.7,unidade:'L',impacto:0.7}]})};
var a1=ctx.estudoAvisosEstoque(estudo(),'Q1');
eq(cod(a1), 'saldo-nao-cobre', 'avisa que não cobre');
ck(a1[0].texto.indexOf('0,7')>=0, 'dizendo o saldo');
ck(a1[0].texto.indexOf('SK-2311')>=0, 'e o lote, para dar para agir');
ck(a1[0].texto.indexOf('já registrada')>=0,
   'declarando que a média vem do que foi GASTO, não de estimativa');
eq(a1[0].severidade, 'conferir', 'classificado como conferir');

console.log('\n--- Sem baixa registrada, o app NÃO chuta o consumo ---');
/* Sem nenhuma aplicação registrada não há como saber quanto se gasta por vez.
   Um número inventado aqui vira compra errada. */
var semBaixa=estudo(); semBaixa.aplicacoes=[];
ctx.LOTES={l1:lote({eventos:[{tipo:'recebimento',quantidade:0.001,unidade:'L',impacto:0.001}]})};
eq(ctx.estudoAvisosEstoque(semBaixa,'Q1').length, 0,
   'saldo minúsculo e nenhuma baixa registrada: cala em vez de estimar');

console.log('\n--- Validade: o que importa é vencer ANTES DO USO PREVISTO ---');
/* Faltam duas aplicações: hoje e daqui a 7 dias. O uso previsto vai até a ÚLTIMA. */
ctx.LOTES={l1:lote({validade:iso(3)})};       /* cabe a de hoje, não cabe a de +7 */
var av=ctx.estudoAvisosEstoque(estudo(),'Q1');
eq(cod(av), 'lote-vence-antes', 'vencer entre duas aplicações também inviabiliza o estudo');
ck(av[0].texto.indexOf('última')>=0, 'e a frase diz que é a última que fica de fora');
ctx.LOTES={l1:lote({validade:iso(-1)})};      /* vence antes até da próxima */
var av2=ctx.estudoAvisosEstoque(estudo(),'Q1');
eq(cod(av2), 'lote-vence-antes', 'vencido antes da próxima idem');
ck(av2[0].texto.indexOf('próxima')>=0, 'e aí a frase aponta a próxima — que é a urgente');
ctx.LOTES={l1:lote({validade:iso(400)})};
eq(ctx.estudoAvisosEstoque(estudo(),'Q1').length, 0, 'validade além de todo o estudo não é assunto');

console.log('\n--- Lote esgotado ou encerrado ---');
ctx.LOTES={l1:lote({eventos:[{tipo:'recebimento',quantidade:0,unidade:'L',impacto:0}]})};
eq(cod(ctx.estudoAvisosEstoque(estudo(),'Q1')), 'lote-sem-saldo', 'saldo zero avisa');
ctx.LOTES={l1:lote({situacao:'encerrado'})};
eq(cod(ctx.estudoAvisosEstoque(estudo(),'Q1')), 'lote-sem-saldo', 'encerrado também');
ck(ctx.estudoAvisosEstoque(estudo(),'Q1')[0].texto.indexOf('aplicação')>=0,
   'e a frase liga o problema ao que ainda falta fazer');

console.log('\n--- Estudo sem aplicação pendente não reclama ---');
ctx.LOTES={l1:lote({eventos:[{tipo:'recebimento',quantidade:0,unidade:'L',impacto:0}]})};
var feito=estudo(); feito.numAplicacoes=1;
eq(ctx.estudoAvisosEstoque(feito,'Q1').length, 0, 'todas as aplicações feitas: silêncio');
var fin=estudo(); fin.finalizado=true;
eq(ctx.estudoAvisosEstoque(fin,'Q1').length, 0, 'estudo finalizado idem — não há o que planejar');

console.log('\n--- Lote que sumiu do banco não quebra a tela ---');
ctx.LOTES={};
eq(ctx.estudoAvisosEstoque(estudo(),'Q1').length, 0, 'sem o lote, nenhum aviso e nenhum erro');
eq(ctx.estudoAvisosEstoque(null,'Q1').length, 0, 'e sem estudo também não');

console.log('\n--- Isto NÃO entra na agenda como evento ---');
/* Evento é coisa que se faz numa data. O "próximo evento" se apoia neles. */
ctx.LOTES={l1:lote({eventos:[{tipo:'recebimento',quantidade:0,unidade:'L',impacto:0}]})};
var evs=ctx.studyEventsV2(estudo());
eq(evs.filter(function(e){ return e.type!=='apl'&&e.type!=='eval'; }).length, 0,
   'a agenda continua só com aplicação e avaliação');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
