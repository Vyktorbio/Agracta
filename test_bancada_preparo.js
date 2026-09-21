/* A BANCADA PARA DE ADIVINHAR — testemunha e unidade da dose.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A calculadora de campo aprendeu duas coisas e a de laboratório ficou para trás,
 * com o mesmo estudo, a mesma dose e uma resposta diferente:
 *
 *  1. TESTEMUNHA É SÓ A MARCADA. `studyTestemunha()` usa o primeiro tratamento como
 *     recurso para a análise estatística de estudos antigos sem marcação. Na bancada
 *     isso não era rótulo: era PREPARO. T1 saía do pote como "só solvente" — um
 *     tratamento com dose declarada preparado como água, e nada na tela dizendo por
 *     quê. O preparo é o ato irreversível: o pote errado já foi para o ensaio.
 *
 *  2. NÃO SE CHUTA A UNIDADE DA DOSE. `_calcDoseUnit` devolve 'L/ha' para qualquer
 *     dose escrita só com número. A dose da bancada é dose de campo convertida para o
 *     pote: entre L/ha e g/ha há mil vezes de diferença — e ali isso é a diferença
 *     entre PIPETAR e PESAR, que são instrumentos diferentes.
 *
 * E uma terceira, que é das duas juntas: TELA E REGISTRO DIZEM A MESMA COISA. A tela
 * recusava preparar a testemunha com dose ("só solvente") enquanto a memória gravada
 * pela mesma bancada preparava o produto. Duas respostas para o mesmo tratamento, e a
 * que vai para a mão de quem prepara era a errada.
 *
 * Rodar: node test_bancada_preparo.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var LB=require('./vendor/biocalc-lab-core.js');
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
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ ck(Math.abs(a-b)<=tol,n+(Math.abs(a-b)<=tol?'':' (obtido '+a+', esperado '+b+')')); }

/* A tela da bancada: um campo por id, e um lugar onde o resultado é pintado. */
var campos={labVol:'100', labVazao:'200', labPureza:'', labDens:'',
            labPpmVol:'100', labPpmFonte:'gL', labPpmValor:'500', labPpmPureza:'', labPpmDens:''};
var pintado={innerHTML:''};
var auditoria=[];
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  RegExp:RegExp,
  BioCalculoLab:LB, BioCalculoCampo:BC,
  document:{ getElementById:function(id){
    if(id==='labOut') return pintado;
    if(campos[id]!==undefined) return {value:campos[id]};
    return null;
  }},
  esc:function(v){ return String(v==null?'':v).replace(/[&<>"']/g,function(c){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]; }); },
  /* O recurso do primeiro tratamento continua existindo — é dele que a bancada
     precisa parar de depender. Se ele sumisse, o teste não provaria nada. */
  studyTestemunha:function(s){
    var ts=(s.tratamentos||[]);
    for(var i=0;i<ts.length;i++){ if(ts[i]&&ts[i].testemunha) return ts[i].id; }
    return (ts[0]||{}).id||'';
  },
  logStudyAuditInObject:function(st,acao,det){ auditoria.push({acao:acao,det:det}); },
  save:function(){},
  _labRenderShell:function(){ ctx._labCompute(); }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  "var _labTab='campo', _labTexto='', _labSel={qid:'LAB1',sid:'b1'};",
  pega('_labVal'), pega('_calcNum'), pega('_numBR'), pega('_calcDoseUnit'),
  pega('doseUnidades'), pega('doseUnidadeDeclarada'), pega('doseSemUnidade'),
  pega('doseUnidadePendente'), pega('doseUnidadeDe'),
  pega('calcUnidadeDosePendenteHtml'), pega('_doseUnidadeDeclarar'), pega('labConfirmarUnidadeDose'),
  pega('_labAvisosHtml'), pega('_labCompute'),
  pega('calcConfigDoEstudoLab'), pega('calcMemoriaLab')
].join('\n'), ctx);

/* Um ensaio de bancada como os que existem: NINGUÉM marcou testemunha, e as doses
   estão escritas só com o número — que é como o modelo.xls chega. */
function ensaio(){
  return { id:'b1', codigo:'BIO-77', numRepeticoes:4,
    doseModo:'campo', doseUnidade:'',
    labVolumeMl:100, labFonteTipo:'gL', labFonteValor:'500', labPureza:'', labDensidade:'',
    protocolo:{volumeCalda:'200'},
    tratamentos:[
      {id:'T1',produto:'Produto A',dose:'1'},
      {id:'T2',produto:'Produto A',dose:'2'}
    ]};
}
function pinta(s){ ctx._labStudy=function(){ return s; }; pintado.innerHTML=''; ctx._labCompute(); return pintado.innerHTML||''; }

/* ============================================================================== */
console.log('\n--- 1. Sem unidade declarada, a bancada PERGUNTA em vez de preparar ---');
var semUnidade=ensaio();
var tela=pinta(semUnidade);
ck(/DECLARE A UNIDADE DA DOSE/.test(tela),'a bancada abre pedindo a unidade da dose');
ck(/labConfirmarUnidadeDose/.test(tela),'e a resposta volta para a bancada, não para a tela de campo');
ck(!/Pipetar|Pesar|só solvente/.test(tela),'nenhuma receita de pote é pintada enquanto a pergunta estiver aberta');
ctx.doseUnidades().forEach(function(u){
  ck(tela.indexOf("labConfirmarUnidadeDose('"+u+"')")>=0,'oferece '+u);
});

console.log('\n--- 2. Respondida a pergunta, o pote sai na unidade que se declarou ---');
auditoria.length=0;
ctx._labStudy=function(){ return semUnidade; };
ctx.labConfirmarUnidadeDose('g/ha');
eq(semUnidade.doseUnidade,'g/ha','a resposta fica gravada no estudo');
ck(auditoria.length===1 && /Unidade da dose declarada/.test(auditoria[0].acao),
   'e entra na auditoria do estudo, como na calculadora de campo');
tela=pinta(semUnidade);
ck(!/DECLARE A UNIDADE DA DOSE/.test(tela),'a pergunta não volta');
/* 1 g/ha a 200 L/ha: 1 g por 200.000 mL de calda = 0,000005 g/mL.
   No pote de 100 mL: 0,5 mg. Sem densidade, PESA-SE. */
ck(/Pesar/.test(tela),'a dose em g/ha manda PESAR — não é a mesma bancada que pipeta');
ck(/0,5000 mg/.test(tela),'e a massa é 0,5 mg no pote de 100 mL');
/* O chute antigo: 1 "L/ha" a 200 L/ha = 0,5 mL = 500 µL de produto pipetado.
   Mil vezes o volume, e o instrumento errado. */
ck(!/500,0 µL/.test(tela),'o número do chute antigo (500 µL, em L/ha) não aparece em lugar nenhum');

console.log('\n--- 3. Quem escreve a unidade na dose continua mandando na sua ---');
var mista=ensaio();
mista.doseUnidade='g/ha';
mista.tratamentos=[{id:'T1',produto:'Produto A',dose:'1 L/ha'}];
tela=pinta(mista);
ck(/Pipetar/.test(tela),'"1 L/ha" se pipeta, mesmo num estudo declarado em g/ha');
ck(/500,0 µL/.test(tela),'e são 500 µL — a dose escrita não é sobrescrita pela declaração');

console.log('\n--- 4. TESTEMUNHA É SÓ A MARCADA (ninguém marcou: ninguém é) ---');
var s4=ensaio(); s4.doseUnidade='L/ha';
tela=pinta(s4);
ck(!/só solvente/.test(tela),'T1 não vira "só solvente" por ser o primeiro da lista');
ck(!/\(test\.\)/.test(tela),'e não é rotulado de testemunha sem que ninguém tenha dito');
/* T1 = 1 L/ha e T2 = 2 L/ha a 200 L/ha, pote de 100 mL: 500 µL e 1 mL. */
ck(/500,0 µL/.test(tela),'T1 é preparado: 500 µL');
ck(/1\.000,0 µL/.test(tela),'e T2, o dobro');

console.log('\n--- 5. A testemunha MARCADA continua sendo só solvente ---');
var s5=ensaio(); s5.doseUnidade='L/ha';
s5.tratamentos[0].testemunha=true; s5.tratamentos[0].dose='0';
tela=pinta(s5);
ck(/só solvente/.test(tela),'testemunha marcada e sem dose: só solvente');
ck(/\(test\.\)/.test(tela),'e dita como testemunha no cartão');

console.log('\n--- 6. TELA E REGISTRO DIZEM A MESMA COISA ---');
/* Testemunha marcada que carrega dose: o verificador de desenho aponta isso, e é
   assunto do desenho. O preparo não pode responder duas coisas — a tela dizia
   "só solvente" e a memória gravada preparava o produto. */
var s6=ensaio(); s6.doseUnidade='L/ha';
s6.tratamentos[0].testemunha=true; s6.tratamentos[0].dose='1 L/ha';
tela=pinta(s6);
ck(/Pipetar/.test(tela),'testemunha COM dose é preparada na tela');
ck(/500,0 µL/.test(tela),'com o mesmo número que a memória grava');
var mem6=ctx.calcMemoriaLab(s6, ctx.calcConfigDoEstudoLab(s6,'LAB1'));
var r6=mem6.tratamentos[0];
eq(r6.semPreparo,undefined,'e a memória também prepara, em vez de marcar "sem preparo"');
perto(r6.produtoUl,500,1e-6,'os 500 µL do registro são os 500 µL da tela');

console.log('\n--- 7. A memória da bancada também parou de chutar a unidade ---');
var s7=ensaio();                       /* doses '1' e '2', nenhuma unidade declarada */
var mem7=ctx.calcMemoriaLab(s7, ctx.calcConfigDoEstudoLab(s7,'LAB1'));
var r7=mem7.tratamentos[0];
ck(/Unidade da dose não declarada/.test(r7.erro||''),'o registro guarda a PENDÊNCIA, não um número');
eq(r7.produtoUl,undefined,'nada é calculado por baixo do aviso');
eq(r7.doseUnidade,null,'e o campo da unidade diz que não há unidade, em vez de inventar uma');

var s7b=ensaio(); s7b.doseUnidade='g/ha';
var mem7b=ctx.calcMemoriaLab(s7b, ctx.calcConfigDoEstudoLab(s7b,'LAB1'));
var r7b=mem7b.tratamentos[0];
eq(r7b.doseUnidade,'g/ha','declarada a unidade, o registro diz qual foi');
eq(r7b.acao,'pesar','e a conta é a da unidade declarada: pesar');
perto(r7b.massaMg,0.5,1e-9,'0,5 mg — o mesmo número da tela');

console.log('\n--- 8. A memória da bancada não inventa testemunha ---');
var s8=ensaio(); s8.doseUnidade='L/ha';
var mem8=ctx.calcMemoriaLab(s8, ctx.calcConfigDoEstudoLab(s8,'LAB1'));
eq(mem8.tratamentos[0].testemunha,false,'T1 não é testemunha no registro sem marcação');
eq(mem8.tratamentos[0].semPreparo,undefined,'e por isso é preparado');

console.log('\n--- 9. "0,2%" é dose, e o motor da bancada sabe prepará-la ---');
/* % v/v não depende de vazão: 0,2% de 100 mL = 0,2 mL. O parser de unidade não
   enxerga porcentagem (não tem letra), e ela caía em L/ha — 33× a dose real. */
var s9=ensaio(); s9.doseUnidade='L/ha';
s9.tratamentos=[{id:'T1',produto:'Adjuvante',dose:'0,2%'}];
var mem9=ctx.calcMemoriaLab(s9, ctx.calcConfigDoEstudoLab(s9,'LAB1'));
var r9=mem9.tratamentos[0];
eq(r9.doseUnidade,'% v/v','a porcentagem é reconhecida como porcentagem');
perto(r9.produtoMl,0.2,1e-9,'0,2% de um pote de 100 mL são 0,2 mL');
perto(r9.solventeMl,99.8,1e-9,'e 99,8 mL de solvente');

console.log('\n--- 10. Em ppm nada disso se aplica: a dose É a concentração ---');
var s10=ensaio(); s10.doseModo='ppm'; s10.doseUnidade='';
s10.tratamentos=[{id:'T1',produto:'Produto A',dose:'50'}];
ctx._labTab='ppm';
tela=pinta(s10);
ck(!/DECLARE A UNIDADE DA DOSE/.test(tela),'a bancada em ppm não pergunta unidade por área');
ck(/Pipetar/.test(tela),'e prepara: 50 ppm num pote de 100 mL com rótulo 500 g/L');
ck(/10,00 µL/.test(tela),'são 10 µL de produto');
ctx._labTab='campo';

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
