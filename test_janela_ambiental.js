/* Janela ambiental na avaliação (roadmap §9).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O carimbo guarda o INSTANTE de cada evento: fazia 26 °C quando se aplicou. Isso não
 * responde à pergunta que explica o resultado do ensaio — o que aconteceu ENTRE a
 * aplicação e esta avaliação. Choveu 72 mm dois dias depois? Passou de 31 °C na
 * semana do florescimento? É o que separa "o produto não funcionou" de "o produto
 * foi lavado".
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. A JANELA PARTE DA APLICAÇÃO ANTERIOR, não do início do estudo. O intervalo que
 *     interessa é o que o tratamento passou exposto.
 *  2. FICA GRAVADA, não recalculada. A leitura de uma estação muda quando a Ecowitt
 *     reprocessa, e num registro BPL vale o que foi lido quando se registrou. E a
 *     avaliação precisa abrir offline, no campo.
 *  3. RECONSULTAR NÃO APAGA: a leitura anterior vira histórico.
 *  4. COBERTURA VAI JUNTO, SEMPRE. Uma média de 11 dias apresentada como "os 14 dias
 *     da janela" é mentira — e passa despercebida porque o número parece limpo.
 *
 * Rodar: node test_janela_ambiental.js
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

/* fetch falso, resolvido à mão para o teste poder ver o estado no meio do caminho */
var pedidos=[], pendentes=[];
function fetchFake(url){
  pedidos.push(url);
  return new Promise(function(res,rej){ pendentes.push({res:res,rej:rej}); });
}
function responde(obj){ pendentes.shift().res({ok:true,json:function(){return Promise.resolve(obj);}}); }
function falha(){ pendentes.shift().rej(new Error('rede')); }
function gira(){ return new Promise(function(r){ setImmediate(function(){ setImmediate(r); }); }); }

var salvou=0, upserts=[], toasts=[];
var ctx={
  console:console, Promise:Promise, Date:Date, String:String, Number:Number, Math:Math,
  JSON:JSON, isFinite:isFinite, Object:Object, Array:Array, setImmediate:setImmediate,
  encodeURIComponent:encodeURIComponent, parseInt:parseInt,
  fetch:fetchFake, NDVI_PROXY:'https://proxy.test', APP_VER:'teste',
  esc:function(v){ return String(v==null?'':v); },
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; },
  save:function(){ salvou++; },
  dbUpsertAvaliacao:function(q,s,a){ upserts.push(a.id); },
  _stxToast:function(m){ toasts.push(m); },
  _stationMacForQuadra:function(qid){ return (qid==='Q1')?'AA:BB':null; },
  openStudyDetail:function(){}
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  'var _janelaSeq=0, _janelaEstado={};',
  pega('janelaAplicacaoAnterior'), pega('janelaDaAvaliacao'), pega('_janelaChave'),
  pega('consultarJanela'), pega('janelaResumo'), pega('janelaCobertura'),
  pega('janelaBlocoHtml')
].join('\n'), ctx);

function monta(){
  ctx.data={ Q1:{estudos:[{id:'s1',
    aplicacoes:[{id:'ap1',data:'2026-08-05'},{id:'ap2',data:'2026-08-20'}],
    avaliacoes:[{id:'av1',data:'2026-09-02'},{id:'av2',data:'2026-08-10'},{id:'av3',data:'2026-08-05'}]
  }]},
    /* A Q2 TEM aplicacao: o que falta nela e a ESTACAO. Sem a aplicacao, o app
       reportaria o problema mais fundamental primeiro — e com razao. */
    Q2:{estudos:[{id:'s2',aplicacoes:[{id:'apz',data:'2026-08-20'}],
                  avaliacoes:[{id:'avx',data:'2026-09-02'}]}]} };
  return ctx.data.Q1.estudos[0];
}
var RETORNO={ dias:14, dias_com_leitura:10, cobertura_pct:71,
  dias_sem_leitura:['2026-08-26','2026-08-27','2026-08-28','2026-08-29'],
  chuva_mm:72.1, dias_com_chuva:3, temp_media:24.6, temp_max:31.2, temp_min:18.0,
  ur_media:70, vento_medio:5, rajada_max:22, radiacao_media:300,
  fonte:'ecowitt-historico' };

/* ============================================================================== */
(async function(){

console.log('\n--- A janela parte da APLICAÇÃO ANTERIOR ---');
var st=monta();
/* Duas aplicações no estudo. A avaliação de 02/09 pertence à janela que começa na de
   20/08 — não na de 05/08, e não no início do estudo. */
eq(ctx.janelaAplicacaoAnterior(st, st.avaliacoes[0]).id,'ap2','a de 02/09 parte da aplicação de 20/08');
eq(ctx.janelaAplicacaoAnterior(st, st.avaliacoes[1]).id,'ap1','a de 10/08 parte da de 05/08');
eq(ctx.janelaAplicacaoAnterior(st, {data:'2026-08-01'}),null,'avaliação antes de qualquer aplicação não tem de onde partir');

console.log('\n--- Recusa em vez de janela vazia ---');
var r1=null; ctx.consultarJanela('Q1','s1',{id:'zz',data:'2026-08-01'},false,function(x){r1=x;});
ck(!!(r1&&r1.erro),'sem aplicação anterior, recusa com motivo');
var r2=null; ctx.consultarJanela('Q1','s1',st.avaliacoes[2],false,function(x){r2=x;});
ck(/mesmo dia/.test((r2||{}).erro||''),'avaliação no mesmo dia da aplicação não tem intervalo a resumir');
var r3=null; ctx.consultarJanela('Q2','s2',ctx.data.Q2.estudos[0].avaliacoes[0],false,function(x){r3=x;});
ck(/estação/.test((r3||{}).erro||''),'quadra sem estação diz isso, em vez de inventar');
eq(pedidos.length,0,'e nenhuma delas bateu no servidor');

console.log('\n--- GOLDEN TEST: a janela gravada na avaliação ---');
var av=st.avaliacoes[0], j=null;
ctx.consultarJanela('Q1','s1',av,false,function(x){ j=x; });
eq(pedidos.length,1,'uma chamada ao proxy');
ck(/de=2026-08-20/.test(pedidos[0]),'com a data da aplicação anterior');
ck(/ate=2026-09-02/.test(pedidos[0]),'e a da avaliação');
ck(/mac=AA%3ABB/.test(pedidos[0]),'e a estação da quadra');
responde(RETORNO); await gira();
ck(!!j&&!j.erro,'a janela volta');
eq(av.janela.dias,14,'14 dias');
eq(av.janela.chuvaMm,72.1,'72,1 mm');
eq(av.janela.tempMax,31.2,'máxima 31,2 °C');
eq(av.janela.coberturaPct,71,'cobertura 71%');
eq(av.janela.de,'2026-08-20','com o início da janela gravado');
eq(av.janela.aplicacao,'ap2','e QUAL aplicação a começou');
ck(salvou>0,'e foi salva');
eq(upserts[0],'av1','e sincronizada');

console.log('\n--- Fica gravada: não se recalcula a cada abertura ---');
/* A leitura de uma estação muda quando a Ecowitt reprocessa. Num registro BPL vale o
   que foi lido quando se registrou — e a avaliação precisa abrir offline, no campo. */
var antes=pedidos.length, j2=null;
ctx.consultarJanela('Q1','s1',av,false,function(x){ j2=x; });
eq(pedidos.length,antes,'segunda leitura NÃO bate no servidor');
eq(j2,av.janela,'devolve a que já estava gravada');

console.log('\n--- Reconsultar não apaga: o anterior vira histórico ---');
ctx.consultarJanela('Q1','s1',av,true,function(){});
responde(Object.assign({},RETORNO,{chuva_mm:80.0})); await gira();
eq(av.janela.chuvaMm,80,'a nova leitura entra');
eq((av.janelasAnteriores||[]).length,1,'e a anterior vira histórico');
eq(av.janelasAnteriores[0].chuvaMm,72.1,'com o valor que tinha');

console.log('\n--- O resumo se lê em voz alta ---');
var res=ctx.janelaResumo(av.janelasAnteriores[0]);
ck(/14 dias/.test(res),'"14 dias"');
ck(/72,1 mm/.test(res),'"72,1 mm" — com vírgula, que é como se escreve aqui');
ck(/média 24,6/.test(res),'"média 24,6"');
ck(/3 dias com chuva/.test(res),'"3 dias com chuva"');

console.log('\n--- COBERTURA: o número limpo não pode esconder a falta ---');
var cob=ctx.janelaCobertura(av.janela);
ck(/10 de 14/.test(cob),'diz quantos dias tinham leitura');
ck(/71%/.test(cob),'e o percentual');
ck(/não entra no total/.test(cob),'e AVISA que a chuva dos dias mudos não está somada');
eq(ctx.janelaCobertura(Object.assign({},av.janela,{coberturaPct:100})),'',
   'janela completa não gasta linha dizendo que está completa');
var vazia=Object.assign({},av.janela,{coberturaPct:0,diasComLeitura:0});
ck(/nenhum dia/.test(ctx.janelaCobertura(vazia)),'e sem leitura nenhuma, diz isso com todas as letras');

console.log('\n--- Erro de rede não vira janela ---');
var av2=st.avaliacoes[1], e=null;
ctx.consultarJanela('Q1','s1',av2,false,function(x){ e=x; });
falha(); await gira();
ck(!!(e&&e.erro),'falha de rede devolve erro');
eq(av2.janela,undefined,'e NÃO grava janela nenhuma');
var av2b=st.avaliacoes[1], e2=null;
ctx.consultarJanela('Q1','s1',av2b,false,function(x){ e2=x; });
responde({error:'Clima: janela de mais de 180 dias.'}); await gira();
ck(/180/.test((e2||{}).erro||''),'e o erro do proxy chega em português, inteiro');
eq(av2b.janela,undefined,'sem gravar nada');

console.log('\n--- A tela mostra o estado, nunca some ---');
var h=ctx.janelaBlocoHtml('Q1','s1',av);
ck(/AMBIENTE ENTRE A APLICAÇÃO/.test(h),'janela gravada vira bloco');
ck(/72|80/.test(h),'com os números');
ck(/reconsultar/.test(h),'e o botão de reconsultar');
ck(/⚠/.test(h),'e o aviso de cobertura, porque ela é parcial');
var hSem=ctx.janelaBlocoHtml('Q1','s1',st.avaliacoes[1]);
ck(/Ambiente desde a aplicação de 05\/08/.test(hSem),'sem janela ainda, oferece buscá-la e diz de quando parte');
eq(ctx.janelaBlocoHtml('Q1','s1',st.avaliacoes[2]),'','avaliação sem intervalo não oferece nada');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
})();
