/* CONFERÊNCIA ANTES DE FINALIZAR: a pendência diz onde ela mora.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A tela de finalização sempre teve um checklist, e ele contava: "3 avaliação(ões)
 * sem lançamento", "5 valor(es) de parcela incompleto(s)". Contagem não é endereço.
 * Quem lia aquilo ia procurar QUAIS avaliações, em QUAL data, em QUAL parcela — e o
 * app sabia as três coisas o tempo todo.
 *
 * As quatro regras do motor (vendor/pendencias-core.js), e é isto que se cobra aqui:
 *
 *  1. APONTA, NÃO BLOQUEIA. Nenhuma pendência impede finalizar. Ensaio real fecha
 *     com buraco às vezes; o que não pode é fechar sem enxergar o buraco.
 *  2. UMA LINHA POR REGISTRO, nunca uma por célula. 24 parcelas × 5 avaliações são
 *     120 células: listá-las uma a uma é a mesma coisa que não listar nada.
 *  3. TODA LINHA CARREGA O SEU ALVO. Lista que não se pode tocar ninguém lê.
 *  4. A ORDEM É A DO FLUXO — protocolo, aplicação, avaliação, amostra.
 *
 * E o número da parcela é o da ESTACA (a randomização), não um índice interno.
 *
 * Rodar: node test_pendencias.js
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

/* Um ensaio como os que existem: 2 tratamentos × 2 repetições, randomizado, com a
   numeração de campo salteada — é assim que a estaca fica depois do sorteio. */
function ensaio(){
  return {
    id:'S1', codigo:'EST-77', numRepeticoes:2, numAplicacoes:2, randomizado:true,
    dataInicio:'2026-09-01',
    randomizacao:{ordem:[
      {parcela:11,tratId:'T2',rep:1},{parcela:12,tratId:'T1',rep:1},
      {parcela:23,tratId:'T1',rep:2},{parcela:24,tratId:'T2',rep:2}
    ]},
    tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},
                 {id:'T2',produto:'Produto A',dose:'1 L/ha'}],
    aplicacoes:[{id:'ap1',data:'2026-09-01',hora:'08:30'}],
    avaliacoes:[{id:'av1',data:'2026-09-08',variaveis:['Mort'],
                 notas:{T2R1:{Mort:3},T1R1:{Mort:0}}}],
    amostras:[]
  };
}
var OPTS={cultura:'Soja', testemunha:'T1',
          rotuloAvaliacao:function(){ return '7 DAA'; },
          rotuloData:function(d){ return d; }};
function tipos(l){ return l.map(function(x){ return x.tipo; }); }
function acha(l,tipo,chave){ return l.filter(function(x){ return x.tipo===tipo && (!chave||x.chave===chave); })[0]||null; }

/* ============================================================================ */
console.log('\n--- 1. A parcela que falta é dita pelo número da ESTACA ---');
var st=ensaio(), lst=P.listar(st,OPTS);
var av=acha(lst,'avaliacao');
ck(!!av,'a avaliação com parcela faltando vira uma pendência');
eq(av.texto,'2 parcelas sem avaliação','a linha conta quantas faltam, não quantas células');
ck(/7 DAA/.test(av.detalhe),'e diz de qual avaliação se trata');
eq(av.alvo.numero,23,'o alvo é a parcela 23 — o número do sorteio, não a ordem interna');
eq(av.alvo.parcela,'T1R2','com a chave da linha que a grade entende');
ck(/a próxima é a 23/.test(av.detalhe),'o texto diz por onde continuar');

console.log('\n--- 2. Uma linha por registro, nunca uma por célula ---');
/* Duas parcelas faltando em uma avaliação: UMA linha, não duas. */
eq(lst.filter(function(x){return x.tipo==='avaliacao';}).length,1,'as duas parcelas cabem numa linha só');
var muitas=ensaio(); muitas.avaliacoes[0].notas={};
eq(P.listar(muitas,OPTS).filter(function(x){return x.tipo==='avaliacao';}).length,1,
   'avaliação inteira vazia também é uma linha só');
eq(acha(P.listar(muitas,OPTS),'avaliacao').texto,'4 parcelas sem avaliação','com a contagem certa');

console.log('\n--- 3. Aplicação sem horário é pendência, e diz por quê ---');
var semHora=ensaio(); delete semHora.aplicacoes[0].hora;
var ph=acha(P.listar(semHora,OPTS),'aplicacao','hora:ap1');
ck(!!ph,'a aplicação sem hora aparece');
eq(ph.texto,'Aplicação sem horário','com o nome que a pessoa usa');
ck(/média do dia/.test(ph.detalhe),'e com a consequência: o clima carimbado vira a média do dia');
eq(ph.alvo.id,'ap1','o alvo é AQUELA aplicação');
ck(!acha(P.listar(ensaio(),OPTS),'aplicacao','hora:ap1'),'com hora preenchida ela some da lista');

console.log('\n--- 4. Aplicação prevista e não registrada ---');
var pf=acha(lst,'aplicacao','faltam');
eq(pf.texto,'1 aplicação não registrada','2 previstas, 1 registrada');
eq(pf.detalhe,'1 de 2 registradas','a linha mostra a conta');

console.log('\n--- 5. Amostra sem identificação ---');
var comAm=ensaio();
comAm.amostras=[{id:'am1',matriz:'Solo'},{id:'am2',matriz:'Raiz',momento:'15 DAA',entrada:'2026-09-10'},
                {id:'am3',matriz:'Solo',momento:'30 DAA'}];
var lam=P.listar(comAm,OPTS);
var ai=acha(lam,'amostra','ident:am1');
ck(!!ai,'amostra sem momento é amostra sem identificação');
eq(ai.texto,'Amostra sem identificação','o pote chega ao laboratório sem dizer de onde veio');
eq(ai.alvo.id,'am1','e o alvo é aquela amostra');
ck(!acha(lam,'amostra','ident:am2'),'a amostra completa não vira pendência');
ck(!!acha(lam,'amostra','entrada:am3'),'identificada mas sem entrada: a fila não anda, e isso é dito');

console.log('\n--- 6. Protocolo: o desenho antes do dado ---');
var semTest=ensaio();
semTest.tratamentos=[{id:'T1',produto:'A',dose:'1 L/ha'},{id:'T2',produto:'B',dose:'2 L/ha'}];
var lpt=P.listar(semTest,{cultura:'Soja',testemunha:'',rotuloAvaliacao:OPTS.rotuloAvaliacao});
ck(!!acha(lpt,'protocolo','testemunha'),'sem testemunha marcada, o % de controle não tem contra o que medir');
var semCult=P.listar(ensaio(),{cultura:'',testemunha:'T1',rotuloAvaliacao:OPTS.rotuloAvaliacao});
ck(!!acha(semCult,'protocolo','cultura'),'sem cultura, a pendência aparece');
var lab=P.listar(ensaio(),{cultura:'',testemunha:'T1',lab:true,rotuloAvaliacao:OPTS.rotuloAvaliacao});
ck(!acha(lab,'protocolo','cultura'),'numa bancada não se cobra cultura: ali não há planta plantada');

console.log('\n--- 7. A ordem é a do fluxo do estudo ---');
var todas=P.listar((function(){ var x=semTest; x.amostras=[{id:'am9'}]; delete x.aplicacoes[0].hora; return x; })(),
                   {cultura:'',testemunha:'',rotuloAvaliacao:OPTS.rotuloAvaliacao});
var ordem=tipos(todas).filter(function(t,i,a){ return a.indexOf(t)===i; });
eq(ordem.join('>'),'protocolo>aplicacao>avaliacao>amostra',
   'protocolo, aplicação, avaliação, amostra — a mesma ordem da trilha no alto da tela');

console.log('\n--- 8. Estudo completo não inventa pendência ---');
var ok=ensaio();
ok.numAplicacoes=1;
ok.avaliacoes[0].notas={T1R1:{Mort:0},T1R2:{Mort:1},T2R1:{Mort:3},T2R2:{Mort:2}};
eq(P.listar(ok,OPTS).length,0,'nada a apontar é uma lista vazia, não uma linha dizendo que está tudo bem');
eq(P.resumo(ok,OPTS).total,0,'e o resumo concorda');

console.log('\n--- 9. Sem randomização, a parcela é dita pelo que existe ---');
var semRand=ensaio(); semRand.randomizado=false; delete semRand.randomizacao;
var ar=acha(P.listar(semRand,OPTS),'avaliacao');
eq(ar.alvo.numero,null,'sem sorteio não há número de campo — e ele não é inventado');
ck(/T1 rep\. 2/.test(ar.detalhe),'a linha usa o tratamento e a repetição, que são o que existe');

console.log('\n--- 10. APONTA, NÃO BLOQUEIA: o motor não tem veto ---');
var api=Object.keys(P);
ck(api.indexOf('bloqueia')<0 && api.indexOf('impede')<0,'não existe função de bloqueio neste motor');
ck(P.listar(ensaio(),OPTS).every(function(x){ return x.bloqueia===undefined; }),
   'nenhuma pendência se declara impeditiva');

console.log('\n--- 11. A tela pinta a lista com o caminho de volta ---');
var ctx={ console:console, String:String, Array:Array, Object:Object, JSON:JSON,
  esc:function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); } };
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([pega('_avCroquiEscJs'), pega('pendListaHtml')].join('\n'), ctx);
var html=ctx.pendListaHtml('Q1','S1',lst);
ck(/<button type="button" class="pend-item/.test(html),'cada pendência é um botão — no campo se toca com o polegar');
ck(/pendIr\('Q1','S1','avaliacao','av1','T1R2'\)/.test(html),
   'e o botão leva à avaliação certa, na parcela certa');
ck(/pendIr\('Q1','S1','aplicacao','',''\)/.test(html),
   'a aplicação que ainda não existe leva à tela de registrar — sem id, porque não há registro ainda');
var htmlHora=ctx.pendListaHtml('Q1','S1',P.listar(semHora,OPTS));
ck(/pendIr\('Q1','S1','aplicacao','ap1',''\)/.test(htmlHora),
   'e a aplicação sem horário leva ao registro DELA, pelo id');
eq((html.match(/pend-item/g)||[]).length,lst.length,'uma linha para cada pendência, nenhuma a mais');
ck(/pend-avaliacao/.test(html)&&/pend-aplicacao/.test(html),'a família da pendência vai na classe, para a tarja de cor');

console.log('\n--- 12. Consulta não escreve no estudo ---');
var antes=JSON.stringify(st);
P.listar(st,OPTS); P.retomada(st,OPTS); P.resumo(st,OPTS);
eq(JSON.stringify(st),antes,'nem a lista, nem a retomada, nem o resumo tocam no estudo');

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
