/* Dose escrita só com o número, em estudo que não declarou a unidade.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O app tinha um chute embutido: dose sem unidade virava L/ha. O chute aparecia
 * em três camadas independentes — o padrão do estudo novo (doseUnidade:'L/ha'),
 * a migração do estudo antigo, e o `||'L/ha'` no fundo do motor de campo — e por
 * isso sobrevivia a consertar uma delas sozinha.
 *
 * Não era erro de rótulo. O motor lê L/ha como valor×1000 em mL de LÍQUIDO:
 *
 *     10 g/ha  ->      10 g   de sólido
 *     10 L/ha  ->  10.000 mL  de líquido
 *
 * Mil vezes de diferença, trocando sólido por líquido, num número que sai
 * impresso na receita que a equipe leva para a balança. E o mesmo chute ia para
 * o eixo do gráfico da prancha, que vai para o relatório do cliente: um estudo
 * dosado em g/ha estampava "10 L/ha" com a mesma autoridade de uma unidade que
 * alguém tivesse escolhido.
 *
 * O que precisa continuar valendo:
 *
 *  1. Sem unidade declarada, NINGUÉM inventa uma — nem a tela, nem o motor.
 *  2. O rótulo sai com o número cru. Incômodo de propósito: mostra que falta.
 *  3. A calculadora PERGUNTA e não calcula nada enquanto não for respondida.
 *  4. A memória BPL registra a pendência em vez de gravar preparo adivinhado.
 *  5. Declarada a unidade, a conta usa ELA — g/ha não vira litro.
 *  6. Quem já escreve a unidade na dose ("500 mL/ha") nunca é interrompido.
 *
 * Rodar: node test_dose_sem_unidade.js
 */
var fs=require('fs'), vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var BC=require('./vendor/biocalc-campo-core.js');

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
function eq(a,b,n){ ck(a===b, n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var campos={calcLen:'5', calcWid:'2', calcPlots:'4', calcVol:'200',
            calcDead:'300', calcBottles:'1', calcCap:'10'};
var auditoria=[];

var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, RegExp:RegExp,
  APP_VER:'teste', BioCalculoCampo:BC,
  document:{ getElementById:function(id){
    if(campos[id]!==undefined) return {value:campos[id]};
    if(id==='calcMemBox'||id==='calcResults') return {innerHTML:''};
    return null;
  }},
  esc:function(v){ return String(v==null?'':v); },
  save:function(){}, alert:function(){}, _stxToast:function(){},
  logStudyAuditInObject:function(st,acao,det,extra){ auditoria.push({acao:acao,det:det}); },
  _currentUserName:function(){ return 'Victor'; },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; },
  estudoFinalizado:function(){ return false; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcCapAtualL'), pega('_calcDoseUnit'),
  pega('doseUnidades'), pega('doseUnidadeDeclarada'), pega('doseSemUnidade'),
  pega('doseUnidadePendente'), pega('doseUnidadeDe'), pega('doseTextoDe'),
  pega('_calcConfigAtual'), pega('calcMemoria'),
  pega('calcUnidadeDosePendenteHtml'), pega('calcConfirmarUnidadeDose'), pega('_calcCompute')
].join('\n'), ctx);
ctx._calcSalvarParcela=function(){};
ctx.studyMetodosVariam=function(){ return false; };
ctx._calcRenderShell=function(){};

/* O caso real: 11 tratamentos escritos só com o número, dosados em g/ha. */
function estudoSemUnidade(){
  return { id:'s1', codigo:'5457193 039', doseModo:'campo', doseUnidade:'',
    tratamentos:[
      {id:'T1', produto:'Testemunha',   dose:'',   testemunha:true},
      {id:'T2', produto:'20.SC 054 10', dose:'10'},
      {id:'T3', produto:'20.SC 054 15', dose:'15'}
    ]};
}

console.log('\n--- 1. O estudo sabe que não sabe ---');
var sem=estudoSemUnidade();
eq(ctx.doseUnidadeDeclarada(sem), '', 'estudo sem unidade declarada devolve vazio, não L/ha');
eq(ctx.doseUnidadePendente(sem), true, 'dose só com número + estudo sem unidade = pendente');
eq(ctx.doseUnidadeDe(sem,'10'), '', 'doseUnidadeDe não inventa unidade para "10"');

console.log('\n--- 2. Ninguém é interrompido à toa ---');
var comUnid=estudoSemUnidade(); comUnid.doseUnidade='g/ha';
eq(ctx.doseUnidadePendente(comUnid), false, 'estudo que declarou g/ha não pergunta nada');
var escrita={doseModo:'campo', doseUnidade:'', tratamentos:[{id:'T2', dose:'500 mL/ha'}]};
eq(ctx.doseUnidadePendente(escrita), false, 'dose que traz a própria unidade não pergunta');
eq(ctx.doseUnidadeDe(escrita,'500 mL/ha'), 'mL/ha', 'a unidade escrita na dose manda');
var soTest={doseModo:'campo', doseUnidade:'', tratamentos:[{id:'T1', dose:'0', testemunha:true}]};
eq(ctx.doseUnidadePendente(soTest), false, 'testemunha sozinha não tem preparo, logo não pergunta');
var ppm={doseModo:'ppm', doseUnidade:'', tratamentos:[{id:'T2', dose:'10'}]};
eq(ctx.doseUnidadePendente(ppm), false, 'ppm é concentração, não dose por área');
var mistura={doseModo:'campo', doseUnidade:'', tratamentos:[{id:'T2', dose:'1,5 + 0,2%'}]};
eq(ctx.doseUnidadePendente(mistura), true, 'na mistura, o componente sem unidade ainda pendura o preparo');

console.log('\n--- 3. O rótulo do gráfico não inventa unidade ---');
/* A regressão que originou tudo: o eixo da prancha estampava "10 L/ha". */
eq(ctx.doseTextoDe(sem,'10'), '10', 'sem unidade declarada, o rótulo sai com o número cru');
ck(ctx.doseTextoDe(sem,'10').indexOf('L/ha')<0, 'o rótulo NUNCA inventa L/ha');
eq(ctx.doseTextoDe(comUnid,'10'), '10 g/ha', 'declarado g/ha, o rótulo sai em g/ha');
eq(ctx.doseTextoDe(escrita,'500 mL/ha'), '500 mL/ha', 'dose com unidade escrita passa intacta');

console.log('\n--- 4. O motor recusa em vez de assumir litro ---');
var semFallback=BC.parseComponents('20.SC 054 10','10','');
ck((semFallback.problems||[]).length>0, 'motor sem fallback relata problema');
ck(/sem unidade/i.test((semFallback.problems||[]).join(' ')), 'o problema diz que falta a unidade');
var comFallback=BC.parseComponents('20.SC 054 10','10','g/ha');
eq((comFallback.problems||[]).length, 0, 'com g/ha declarado o motor aceita');
eq(comFallback.components[0].unidade, 'g/ha', 'e usa g/ha, não L/ha');

console.log('\n--- 5. Os mil vezes, medidos ---');
/* É este número que dá o tamanho do estrago que o chute causava. */
var emG=BC.calculateTreatment({doseHa:10, doseUnit:'g/ha', sprayVolume:200,
  plotLength:5, plotWidth:2, numPlots:4, numBottles:1, bottleCapacity:10});
var emL=BC.calculateTreatment({doseHa:10, doseUnit:'L/ha', sprayVolume:200,
  plotLength:5, plotWidth:2, numPlots:4, numBottles:1, bottleCapacity:10});
ck(Math.abs(emL.productTotal - emG.productTotal*1000) < 1e-6,
   '10 L/ha prepara mil vezes o produto de 10 g/ha ('+emL.productTotal+' mL vs '+emG.productTotal+' g)');
ck(emG.liquid===false && emL.liquid===true,
   'e o motor troca sólido por líquido junto com a unidade');
eq(emG.productUnit, 'g',  '10 g/ha sai em grama (sólido)');
eq(emL.productUnit, 'mL', '10 L/ha sai em mililitro (líquido)');

console.log('\n--- 6. A memória BPL registra a pendência, não um preparo ---');
ctx._calcStudy=function(){ return sem; };
ctx._calcSel={qid:'Q1', sid:'s1'};
var mem=ctx.calcMemoria(sem, ctx._calcConfigAtual());
var regT2=(mem.tratamentos||[]).filter(function(r){ return r.id==='T2'; })[0];
ck(!!regT2, 'T2 aparece na memória');
ck(!!(regT2&&regT2.erro), 'T2 fica com erro registrado em vez de receita');
ck(!!(regT2&&/não declarada/i.test(regT2.erro||'')), 'o erro nomeia a unidade não declarada');
eq(regT2&&regT2.liberado, false, 'preparo não liberado enquanto a unidade não for declarada');
eq(regT2&&regT2.componentes.length, 0, 'e nenhum componente calculado por baixo do aviso');

console.log('\n--- 7. Declarada a unidade, a conta anda — em g/ha ---');
var memOk=ctx.calcMemoria(comUnid, ctx._calcConfigAtual());
var okT2=(memOk.tratamentos||[]).filter(function(r){ return r.id==='T2'; })[0];
ck(!(okT2&&okT2.erro), 'com g/ha declarado, T2 calcula sem erro');
eq(okT2&&okT2.doseUnidade, 'g/ha', 'a memória grava g/ha, e não o L/ha do parser de texto');
ck(!!(okT2&&okT2.componentes.length), 'e os componentes saem calculados');
eq(okT2&&okT2.componentes[0].unidadeMassa, 'g', 'o produto é pesado em grama');

console.log('\n--- 8. A migração do estudo antigo não crava L/ha ---');
var normalizeStudy=null;
try{
  var ctx2={console:console, String:String, Number:Number, Math:Math, JSON:JSON, Object:Object,
            Array:Array, isFinite:isFinite, parseFloat:parseFloat, RegExp:RegExp, Date:Date};
  ctx2.window=ctx2; ctx2.globalThis=ctx2; vm.createContext(ctx2);
  vm.runInContext(pega('_calcDoseUnit'), ctx2);
  normalizeStudy=true;
}catch(e){}
/* A migração vive dentro de normalizeStudy, que puxa meio app.js. Em vez de
   recortá-la inteira, confere-se a regra que ela aplica: sem unidade escrita em
   NENHUM tratamento, não há o que inferir — e o que não se infere fica vazio. */
var trechoMigracao=src.slice(src.indexOf('function normalizeStudy('));
trechoMigracao=trechoMigracao.slice(0, trechoMigracao.indexOf('if(typeof s.testemunha'));
ck(/_uk\.length===1\)\?_uk\[0\]:''/.test(trechoMigracao.replace(/\s/g,'')) ||
   /_uk\.length===1\)\?_uk\[0\]:\s*''/.test(trechoMigracao),
   'sem acordo entre os tratamentos, a migração deixa a unidade vazia');
ck(!/_uk\.length===1\)\?_uk\[0\]:'L\/ha'/.test(trechoMigracao.replace(/\s/g,'')),
   'a migração não crava L/ha');

console.log('\n--- 9. O padrão do estudo novo é "não declarada" ---');
var trechoNovo=src.slice(src.indexOf("doseModo:'campo',"));
trechoNovo=trechoNovo.slice(0, trechoNovo.indexOf('DESENHO EXPERIMENTAL'));
ck(/doseUnidade:''/.test(trechoNovo.replace(/\s/g,'')), 'estudo novo nasce sem unidade declarada');
ck(!/doseUnidade:'L\/ha'/.test(trechoNovo.replace(/\s/g,'')), 'estudo novo não nasce em L/ha');

console.log('\n--- 10. A calculadora pergunta, e não calcula antes da resposta ---');
/* O `document` falso devolve o mesmo objeto para 'calcResults', então dá para
   ler o que a tela teria pintado. */
var tela={innerHTML:''};
ctx.document.getElementById=function(id){
  if(id==='calcResults') return tela;
  if(campos[id]!==undefined) return {value:campos[id]};
  return null;
};
var pendente=estudoSemUnidade();
ctx._calcStudy=function(){ return pendente; };
ctx._calcCompute();
ck(/DECLARE A UNIDADE DA DOSE/.test(tela.innerHTML), 'a calculadora abre pedindo a unidade');
ck(/20\.SC 054 10 = 10/.test(tela.innerHTML), 'e mostra qual dose está sem unidade');
ck(!/Produto\/parcela|calc-eqline|Calda total/i.test(tela.innerHTML),
   'nenhuma receita é mostrada enquanto a pergunta estiver aberta');
ctx.doseUnidades().forEach(function(u){
  ck(tela.innerHTML.indexOf('calcConfirmarUnidadeDose(\''+u+'\')')>=0, 'oferece '+u);
});

/* Responder a pergunta resolve o estudo inteiro, uma vez só. */
auditoria.length=0;
ctx.calcConfirmarUnidadeDose('g/ha');
eq(pendente.doseUnidade, 'g/ha', 'a resposta fica gravada no estudo');
eq(ctx.doseUnidadePendente(pendente), false, 'e a pergunta não volta');
ck(auditoria.length===1 && /Unidade da dose declarada/.test(auditoria[0].acao),
   'a declaração entra na auditoria do estudo');
ck(/não declarada/.test(auditoria[0].det||''), 'a auditoria diz de onde veio');
/* O portão precisa ABRIR: um portão que nunca deixa passar não é portão. */
tela.innerHTML='';
try{ ctx._calcCompute(); }catch(e){ tela.innerHTML='<erro>'+e.message; }
ck(!/DECLARE A UNIDADE DA DOSE/.test(tela.innerHTML),
   'respondida a pergunta, a calculadora para de perguntar');
ctx.calcConfirmarUnidadeDose('L/ha');
eq(pendente.doseUnidade, 'L/ha', 'trocar depois continua possível');
ctx.calcConfirmarUnidadeDose('barril/alqueire');
eq(pendente.doseUnidade, 'L/ha', 'unidade fora da lista é recusada em silêncio');

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
