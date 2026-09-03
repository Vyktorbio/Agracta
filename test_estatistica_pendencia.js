/* A estatística que não sai tem de dizer por quê.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * `statDBC` devolve `null` para toda avaliação que não dá para analisar, e isso
 * está certo — um p-valor tirado de grade furada mede o acaso e tem cara de
 * resultado. O problema era o que se fazia com o nulo: sumir.
 *
 * Havia três sumiços encadeados, do menor para o pior:
 *   1. `_bioestatRapidoCard` devolvia string vazia → buraco na lista.
 *   2. `_bioestatJobs` descarta a avaliação sem 2 grupos de 2+ → nem cartão havia.
 *   3. `_bioestatIntegratedHtml` devolvia '' com zero jobs → o painel INTEIRO
 *      desaparecia da tela do estudo.
 *
 * O terceiro é o caro: sumiço é a única resposta que ninguém consegue
 * interpretar. A pessoa não sabe se falta dado, se o app quebrou, ou se aquele
 * ensaio não rende análise. E o dado que falta costuma ser resolvível no mesmo
 * dia, com a parcela ainda de pé — desde que alguém diga QUAL falta.
 *
 * Rodar: node test_estatistica_pendencia.js
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
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var ctx={ String:String, Number:Number, Math:Math, isFinite:isFinite,
          parseFloat:parseFloat, parseInt:parseInt, Object:Object, isNaN:isNaN,
          normalizeStudy:function(s){return s;} };
vm.createContext(ctx);
vm.runInContext([
  /* grade: notas[trat|rep] = valor, que é o formato do app */
  'function _avRowKey(tid,rep){ return tid+"|"+rep; }',
  'function _avNota(av,ref,v){ var n=(av&&av.notas)||{}; var o=n[ref.key]; return o?o[v]:null; }',
  pega('estudoTemReplicacao'),
  pega('statPendencia'),
  pega('statPendenciaTexto')
].join('\n'),ctx);

function estudo(reps,trats,desenho){
  return {numRepeticoes:reps, desenho:desenho||'dbc',
          tratamentos:trats.map(function(id){return {id:id};})};
}
function av(notas){ return {id:'a1', data:'2026-09-01', variaveis:['sev'], notas:notas}; }
function grade(trats,reps,buracos){
  var n={}; trats.forEach(function(t){ for(var r=1;r<=reps;r++){
    var pula=(buracos||[]).some(function(b){return b[0]===t&&b[1]===r;});
    if(!pula) n[t+'|'+r]={sev:10};
  }; });
  return n;
}

console.log('\n--- Grade cheia: nada a reclamar ---');
var p=ctx.statPendencia(estudo(4,['T1','T2','T3']), av(grade(['T1','T2','T3'],4)), 'sev');
ck(p.ok===true,'grade completa é ok');
ck(p.total===0,'nenhuma nota faltando');
ck(ctx.statPendenciaTexto(p)==='','e o texto fica vazio — nada a dizer');

console.log('\n--- Buraco na grade: nome e bloco ---');
p=ctx.statPendencia(estudo(4,['T1','T2','T3']), av(grade(['T1','T2','T3'],4,[['T3',2]])), 'sev');
ck(p.ok===false,'grade furada não é ok');
ck(p.total===1,'conta exatamente 1 nota faltando');
ck(p.celulas===12,'e sabe que a grade tem 12 células');
var txt=ctx.statPendenciaTexto(p);
ck(/T3/.test(txt)&&/^falta 1 nota/.test(txt),'o texto nomeia o tratamento: '+JSON.stringify(txt));
ck(/bloco 2/.test(txt),'e o bloco exato');

console.log('\n--- Vários buracos no mesmo tratamento ---');
p=ctx.statPendencia(estudo(4,['T1','T2']), av(grade(['T1','T2'],4,[['T2',2],['T2',4]])), 'sev');
ck(p.total===2,'duas notas faltando');
txt=ctx.statPendenciaTexto(p);
ck(/blocos 2, 4/.test(txt),'os dois blocos saem juntos: '+JSON.stringify(txt));

console.log('\n--- Delineamento que nunca renderia análise ---');
p=ctx.statPendencia(estudo(4,['T1']), av(grade(['T1'],4)), 'sev');
ck(p.ok===false && /não há o que comparar/.test(p.motivo),'um tratamento só: diz que não há comparação');
p=ctx.statPendencia(estudo(1,['T1','T2']), av(grade(['T1','T2'],1)), 'sev');
ck(p.ok===false && /repetição/.test(p.motivo),'uma repetição só: explica a falta de termo de erro');

console.log('\n--- Faixas sem treço usa o motivo próprio, que já ensina a saída ---');
p=ctx.statPendencia(estudo(4,['T1','T2'],'faixas'), av(grade(['T1','T2'],1)), 'sev');
ck(p.ok===false,'faixa com um ponto não analisa');
ck(/treços/.test(p.motivo||''),'e o motivo é o da faixa, não "faltam notas": '+JSON.stringify(p.motivo));

console.log('\n--- O texto não estoura com estudo grande ---');
var muitos=['T1','T2','T3','T4','T5','T6','T7','T8'];
p=ctx.statPendencia(estudo(4,muitos), av({}), 'sev');
ck(p.total===32,'grade inteira vazia conta 32');
txt=ctx.statPendenciaTexto(p);
ck(/e mais 4 tratamentos/.test(txt),'lista 4 e resume o resto: '+JSON.stringify(txt));

console.log('\n--- A DMS deixou de ser calculada em segredo ---');
ck(/DMS/.test(src),'o cartão rápido cita DMS');
ck(/st\.hsd/.test(src),'e é a hsd do statDBC que aparece nele');

console.log('\n--- O painel não some mais com zero jobs ---');
var corpo=src.slice(src.indexOf('function _bioestatIntegratedHtml('));
corpo=corpo.slice(0,corpo.indexOf('\nfunction '));
ck(!/if\(!jobs\.length\)return '';/.test(corpo),'o retorno vazio incondicional saiu');
ck(/_bioestatPendentesHtml/.test(corpo),'e a lista de pendências entrou no lugar');
ck(/body\+_pendHtml/.test(corpo),'as pendências também acompanham as análises que deram certo');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
