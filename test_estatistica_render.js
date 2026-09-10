/* A estatística que o motor calculou e a tela não mostrava.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O cartão de resumo (`_bioestatResumoCard`) lia meia dúzia de chaves do
 * relatório do motor e descartava o resto — em silêncio, que é o modo caro de
 * errar: quem olha a tela não tem como saber que existia mais.
 *
 *   1. DOSE-RESPOSTA. `decide.py` roteia série de doses para probit/logit e
 *      devolve CL50/CL90 com intervalo de Fieller, inclinação, aderência e
 *      razão de potência. Essa rota NÃO devolve descritiva nem normalidade —
 *      então o cartão renderizava uma tabela de médias VAZIA e, pior, dois ✗
 *      vermelhos de pressuposto, porque `undefined` caía no mesmo ramo de
 *      "reprovado". Afirmar que o pressuposto falhou num teste que nunca
 *      rodou desqualifica um resultado que estava certo.
 *   2. DECISÃO e AVISOS. O motor escreve por que escolheu aquele teste e o que
 *      teve de contornar. Isso saía só na planilha — e é justamente o que se
 *      precisa para defender o número numa auditoria.
 *   3. COMPARAÇÃO CONTRA CONTROLE. Com comparação contra testemunha o
 *      relatório traz apenas `comparacao_medias.controle`; a chave não estava
 *      na lista lida, então Dunnett rodava e sumia.
 *
 * Rodar: node test_estatistica_render.js
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

var ctx={ String:String, Number:Number, Math:Math, isFinite:isFinite, JSON:JSON,
          parseFloat:parseFloat, parseInt:parseInt, Object:Object, isNaN:isNaN,
          Date:Date, isoToBR:function(x){return x;} };
ctx.window=ctx; ctx.self=ctx;
vm.createContext(ctx);
['esc','_bioestatP','_bioestatRotuloDose','_bioestatDoseHtml','_bioestatDecisaoHtml','_bioestatResumoCard']
  .forEach(function(n){ vm.runInContext(pega(n),ctx); });

var job={variavel:'Mortalidade',date:'2026-09-09',jobKey:'av1|Mortalidade'};

/* ---------------------------------------------- 1. curva única de dose ---- */
console.log('\nDose-resposta de curva única');
var relDose={ok:true,
  decisao:'Resposta BINOMIAL com preditor de DOSE (4 níveis). Escolhida análise de DOSE-RESPOSTA.',
  avisos:['Mortalidade natural corrigida por Abbott.'],
  analise:{tipo_analise:'Dose-resposta (regressão probit)',link:'probit',escala_dose:'log10',
    slope:2.145,slope_se:0.312,qui_quadrado:1.84,gl:2,p_qui_quadrado:0.398,
    heterogeneo:false,abbott_aplicado:true,
    doses_letais:[{p:0.5,dose:12.34,ic_inf:9.8,ic_sup:15.6},
                  {p:0.9,dose:48.2,ic_inf:null,ic_sup:null}]}};
var c1=ctx._bioestatResumoCard(job,relDose,'Q1','s1');
ck(/CL50/.test(c1),'a CL50 aparece na tela');
ck(/12,34/.test(c1),'a estimativa da CL50 aparece');
ck(/9,8 – 15,6/.test(c1),'o intervalo de Fieller aparece');
ck(/CL90/.test(c1)&&/não estimável/.test(c1),'CL90 sem IC diz que não é estimável, não fica em branco');
ck(/inclinação 2,145/.test(c1)&&/±0,312/.test(c1),'inclinação e erro-padrão aparecem');
ck(/aderência/.test(c1),'o qui-quadrado de aderência aparece');
ck(/Abbott/.test(c1),'a correção de Abbott fica registrada na tela');
ck(!/Pressupostos:/.test(c1),'não inventa pressuposto reprovado onde nenhum teste rodou');
ck(!/<tbody><\/tbody>/.test(c1),'não sobra tabela de médias vazia');
ck(/Como esta análise foi decidida/.test(c1),'o log de decisão está na tela');
ck(/DOSE-RESPOSTA/.test(c1),'o texto da decisão do motor está na tela');
ck(/Abbott\./.test(c1),'os avisos do motor estão na tela');
ck(/_bioestatBaixarJson/.test(c1),'oferece o relatório completo em JSON');
ck(!/_bioestatBaixarJson/.test(ctx._bioestatResumoCard(job,relDose)),'sem estudo identificado, não oferece o JSON');

/* --------------------------------------------------- 2. várias curvas ---- */
console.log('\nDose-resposta com comparação de curvas');
var relMulti={ok:true,analise:{tipo_analise:'Dose-resposta (múltiplas curvas)',
  curvas:[{grupo:'Produto A',link:'logit',slope:1.9,doses_letais:[{p:0.5,dose:8,ic_inf:6,ic_sup:11}]},
          {grupo:'Produto B',link:'logit',slope:2.1,doses_letais:[{p:0.5,dose:24,ic_inf:19,ic_sup:31}]}],
  comparacao:{unidade:'g/ha',referencia:'Produto A',
    paralelismo:{qui2:0.42,gl:1,p:0.517,paralelo:true},
    diferenca_potencia:{qui2:18.3,gl:1,p:0.00002,difere:true},
    razoes:[{grupo:'Produto A',lc50:8,rr:1,ic_inf:1,ic_sup:1,referencia:true,significativo:false},
            {grupo:'Produto B',lc50:24,rr:3,ic_inf:2.1,ic_sup:4.3,referencia:false,significativo:true}]}}};
var c2=ctx._bioestatResumoCard(job,relMulti,'Q1','s1');
ck(/Produto A/.test(c2)&&/Produto B/.test(c2),'as duas curvas aparecem');
ck(/g\/ha/.test(c2),'a unidade da dose acompanha a estimativa');
ck(/paralelismo/.test(c2),'o teste de paralelismo aparece');
ck(/Razão de potência/.test(c2)&&/3×/.test(c2),'a razão de potência aparece');
ck(/referência Produto A/.test(c2),'a curva de referência fica declarada');

/* ------------------------------------------------ 3. contra o controle ---- */
console.log('\nComparação contra a testemunha');
var relCtl={ok:true,decisao:'ANOVA em blocos; comparação contra o controle.',
  descritiva:[{tratamento:'Test.',media:40,dp:5,n:4},{tratamento:'T2',media:12,dp:3,n:4}],
  analise:{tipo_analise:'ANOVA em blocos',mse:9,tabela_anova:[{fonte:'Tratamento',gl:1,sq:1568,qm:1568,F:174,p:0.0001}],
    normalidade:{teste:'Shapiro-Wilk',p:0.31,normal:true},
    homogeneidade:{teste:'Levene',p:0.62,homogenea:true}},
  comparacao_medias:{controle:{metodo:'Dunnett — vs. controle',ajustadas:true,
    medias:{'Test.':40,T2:12},erros_padrao:{'Test.':1.5,T2:1.5},
    letras:{'Test.':'a',T2:'b'},ordem:['Test.','T2']}}};
var c3=ctx._bioestatResumoCard(job,relCtl,'Q1','s1');
ck(/Dunnett/.test(c3),'o método contra o controle aparece (antes sumia)');
ck(/>b</.test(c3),'as letras do teste contra o controle chegam à tabela');
ck(/Shapiro-Wilk/.test(c3)&&/Levene/.test(c3),'os pressupostos testados continuam na tela');
ck(/Tabela ANOVA/.test(c3),'a tabela ANOVA continua disponível');
ck(/CV residual/.test(c3),'o CV residual continua na tela');

/* ----------------------------------------------------- 4. não regride ---- */
console.log('\nO que já funcionava continua funcionando');
var relTukey={ok:true,descritiva:[{tratamento:'T1',media:10,dp:7,n:4}],analise:{mse:4},
  comparacao_medias:{ajustadas:{metodo:'Holm',ajustadas:true,medias:{T1:12},erros_padrao:{T1:.5},ordem:['T1']}}};
var c4=ctx._bioestatResumoCard(job,relTukey,'Q1','s1');
ck(/Média ajustada/.test(c4)&&/±EP/.test(c4)&&/±0,5/.test(c4),'média ajustada e erro-padrão do modelo');
var c5=ctx._bioestatResumoCard(job,{ok:false,erro:'grade furada'},'Q1','s1');
ck(/grade furada/.test(c5),'relatório com erro continua dizendo o motivo');

console.log('\n'+passou+' conferência(s) ok, '+falhas+' falha(s).');
process.exit(falhas?1:0);
