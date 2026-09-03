/* Memória de cálculo da aplicação (Release B, §7.6 do roadmap).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Até esta leva o cálculo da calda vivia só na tela: era lido, copiado para a área
 * de transferência e morria ao fechar o overlay. A aplicação guardava data, BBCH,
 * observação e carimbo — nada do que foi efetivamente preparado. Num ensaio sob
 * BPL, cálculo que não fica registrado é cálculo que não aconteceu.
 *
 * Três coisas precisam continuar valendo:
 *
 *  1. GOLDEN TEST (§23.1). Entrada conhecida -> resultado conhecido. Se uma
 *     alteração futura mudar o número da calda, este teste falha. É proposital:
 *     mudança de resultado em motor de dose tem de ser decisão, nunca acidente.
 *  2. A memória guarda a VERSÃO DO MOTOR. Sem ela, um número gravado hoje não teria
 *     como ser reconferido depois que a fórmula mudasse.
 *  3. Regravar não apaga o cálculo anterior: ele vira histórico. Refazer a conta
 *     depois de mudar a parcela é informação, não correção silenciosa.
 *
 * Rodar: node test_memoria_calculo.js
 */
var fs=require('fs'),vm=require('vm');
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
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}
function eq(a,b,n){ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')'));}
function perto(a,b,tol,n){ var ok=(a!=null&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* Campos que a tela da calculadora estaria mostrando. */
var campos={calcLen:'5', calcWid:'2', calcPlots:'4', calcVol:'200',
            calcDead:'300', calcBottles:'1', calcCap:'10'};
var salvou=0, upserts=[], toasts=[], alertas=[], auditoria=[];

var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, parseFloat:parseFloat,
  APP_VER:'teste',
  BioCalculoCampo:BC,
  document:{ getElementById:function(id){
    if(campos[id]!==undefined) return {value:campos[id]};
    if(id==='calcMemBox'||id==='calcResults') return {innerHTML:''};
    return null;
  }},
  esc:function(v){ return String(v==null?'':v); },
  save:function(){ salvou++; },
  alert:function(m){ alertas.push(m); },
  _stxToast:function(m){ toasts.push(m); },
  dbUpsertAplicacao:function(q,s,a){ upserts.push(a.id); },
  logStudyAuditInObject:function(st,acao,det,extra){ auditoria.push({acao:acao,extra:extra}); },
  _currentUserName:function(){ return 'Daria'; },
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; },
  estudoFinalizado:function(st){ return !!st.finalizado; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

/* O estudo em teste vive fora do vm e é devolvido por _calcStudy. */
var ESTUDO={
  id:'s1', codigo:'EST-26148', nome:'Ensaio de exemplo',
  aplicacoes:[{id:'ap1', data:'2026-08-20', bbch:'65'},
              {id:'ap2', data:'2026-09-03', bbch:'71'}],
  tratamentos:[
    {id:'T1', produto:'Testemunha', dose:'0', testemunha:true},
    {id:'T2', produto:'Produto A',  dose:'1,5 L/ha'},
    {id:'T3', produto:'Produto B',  dose:'300 g/ha'}
  ]
};
ctx._calcStudy=function(){ return ESTUDO; };
ctx._calcSel={qid:'Q1', sid:'s1'};

vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcCapAtualL'), pega('_calcDoseUnit'),
  pega('_calcConfigAtual'), pega('calcMemoria'), pega('calcMemoriaTexto'),
  pega('calcAplicacoesDoEstudo'), pega('calcGravarMemoria'),
  pega('_calcMemSync'), pega('calcMemoriaBoxHtml'), pega('aplicacaoMemoriaResumo')
].join('\n'), ctx);

(function(){

console.log('\n--- Configuração lida da tela ---');
var cfg=ctx._calcConfigAtual();
eq(cfg.parcelaComprimento,5,'comprimento da parcela');
eq(cfg.parcelaLargura,2,'largura da parcela');
eq(cfg.parcelas,4,'parcelas por tratamento');
eq(cfg.volumeCaldaLHa,200,'volume de calda');
eq(cfg.volumeMortoMl,300,'volume morto');
campos.calcPlots='0';
eq(ctx._calcConfigAtual().parcelas,1,'zero parcelas vira 1 — dividir por zero daria NaN em silêncio');
campos.calcPlots='4';

console.log('\n--- GOLDEN TEST: parcela 5×2 m, 4 parcelas, 200 L/ha ---');
/* Área = 5 × 2 × 4 = 40 m² = 0,004 ha.  Calda = 0,004 × 200 = 0,8 L = 800 mL.
   Com 300 mL de volume morto, prepara-se 1,1 L.
   T2 a 1,5 L/ha -> 0,004 ha × 1500 mL/ha = 6 mL de produto. */
var mem=ctx.calcMemoria(ESTUDO, ctx._calcConfigAtual());
ck(!mem.erro,'a memória é gerada sem erro');
eq(mem.tratamentos.length,3,'um registro por tratamento');

var T2=mem.tratamentos[1];
eq(T2.id,'T2','o segundo é o T2');
eq(T2.doseUnidade,'L/ha','a unidade da dose é reconhecida do texto');
perto(T2.caldaTotalL,1.1,0.001,'calda total = 0,8 L + 0,3 L de volume morto = 1,1 L');
eq(T2.componentes.length,1,'um componente');
perto(T2.componentes[0].total,8.25,0.01,'produto total = 1,1 L × 7,5 mL/L = 8,25 mL');
eq(T2.componentes[0].unidadeMassa,'mL','produto líquido sai em mL');
ck(!!T2.veiculo,'o veículo que completa a calda vai junto');
perto(T2.veiculo.total,1091.75,0.5,'água = 1100 mL − 8,25 mL de produto');

var T3=mem.tratamentos[2];
eq(T3.doseUnidade,'g/ha','dose em g/ha é reconhecida');
perto(T3.componentes[0].total,1.65,0.01,'T3: 1,1 L × 1,5 g/L = 1,65 g');
eq(T3.componentes[0].unidadeMassa,'g','produto sólido sai em g');

console.log('\n--- Receita estruturada preserva item, lote e origem da dose ---');
ESTUDO.tratamentos.push({id:'T4',produto:'Texto legado',dose:'99 L/ha',componentes:[
  {id:'cp1',itemId:'adj1',nome:'Adjuvante do banco',valor:.15,unidade:'% v/v',
   loteRef:{loteId:'lt1',codigo:'L-01'},doseRef:{origem:'bula',documento:'Bula vigente'}}
]});
var memEstr=ctx.calcMemoria(ESTUDO,ctx._calcConfigAtual());
var T4=memEstr.tratamentos[3];
eq(T4.componentes[0].nome,'Adjuvante do banco','a memória usa o componente estruturado');
eq(T4.componentes[0].itemId,'adj1','identidade do item fica gravada');
eq(T4.componentes[0].loteRef.codigo,'L-01','lote fica gravado');
eq(T4.componentes[0].doseRef.origem,'bula','origem da dose fica gravada');
perto(T4.componentes[0].total,1.65,1e-9,'0,15% de 1,1 L = 1,65 mL, não a string antiga');
eq(T4.liberado,true,'receita válida e que cabe fica liberada para preparo');
ESTUDO.tratamentos.pop();

console.log('\n--- Testemunha sem dose não vira calda ---');
var T1=mem.tratamentos[0];
eq(T1.semPreparo,true,'testemunha sem dose é marcada como sem preparo');
eq(T1.componentes.length,0,'e não gera componente nenhum');
ck(!T1.erro,'isso é resultado, não erro');

console.log('\n--- Procedência da memória ---');
eq(mem.motor,'BioCalculoCampo','o motor fica registrado');
eq(mem.motorVersao,BC.VERSION,'com a versão exata que calculou');
ck(!!mem.motorVersao && mem.motorVersao!=='?','e a versão não é desconhecida');
eq(mem.user,'Daria','quem calculou');
eq(mem.app,'teste','a versão do app');
ck(mem.geradoEm>0 && !!mem.iso,'quando foi calculado');
eq(mem.estudo.codigo,'EST-26148','de qual estudo');
eq(mem.entradas.volumeMortoMl,300,'as entradas ficam guardadas junto do resultado');

console.log('\n--- Mudar a entrada muda o resultado (e a memória acompanha) ---');
campos.calcDead='0';
var semMorto=ctx.calcMemoria(ESTUDO, ctx._calcConfigAtual());
perto(semMorto.tratamentos[1].caldaTotalL,0.8,0.001,'sem volume morto, a calda é 0,8 L');
ck(semMorto.tratamentos[1].caldaTotalL < T2.caldaTotalL,'e é menor que com volume morto');
eq(semMorto.entradas.volumeMortoMl,0,'a entrada nova fica registrada');
campos.calcDead='300';

console.log('\n--- Texto derivado da memória, não recalculado ---');
var txt=ctx.calcMemoriaTexto(mem);
ck(txt.indexOf('EST-26148')>0,'o texto identifica o estudo');
ck(txt.indexOf('T2')>0 && txt.indexOf('T3')>0,'lista os tratamentos');
ck(txt.indexOf('BioCalculoCampo')>0 && txt.indexOf(BC.VERSION)>0,
   'e assina com motor e versão — sem isso o papel impresso não é conferível');
ck(txt.indexOf('Daria')>0,'e com quem calculou');
eq(ctx.calcMemoriaTexto({erro:'x'}),'x','memória com erro devolve o erro, não texto quebrado');

console.log('\n--- Gravar na aplicação ---');
var sel={value:'ap2'};
ctx.document.getElementById=function(id){
  if(id==='calcMemAlvo') return sel;
  if(campos[id]!==undefined) return {value:campos[id]};
  if(id==='calcMemBox'||id==='calcResults') return {innerHTML:''};
  return null;
};
ctx.calcGravarMemoria();
var ap2=ESTUDO.aplicacoes[1];
ck(!!ap2.memoriaCalculo,'a memória é gravada na aplicação escolhida');
eq(ap2.memoriaCalculo.estudo.codigo,'EST-26148','com o estudo certo');
ck(!ESTUDO.aplicacoes[0].memoriaCalculo,'e não vaza para a outra aplicação');
ck(salvou>0,'salva no aparelho');
ck(upserts.indexOf('ap2')>=0,'e enfileira a sincronização');
eq(auditoria.length,1,'a gravação entra na trilha de auditoria do estudo');
eq(auditoria[0].extra.motorVersao,BC.VERSION,'com a versão do motor na trilha');

console.log('\n--- Regravar preserva o cálculo anterior ---');
var primeira=ap2.memoriaCalculo.geradoEm;
campos.calcVol='300';
ctx.calcGravarMemoria();
eq((ap2.memoriasAnteriores||[]).length,1,'o cálculo anterior vira histórico');
eq(ap2.memoriasAnteriores[0].geradoEm,primeira,'e é o mesmo de antes');
eq(ap2.memoriaCalculo.entradas.volumeCaldaLHa,300,'a memória atual tem a entrada nova');
ck(ap2.memoriaCalculo.geradoEm>=primeira,'e é mais recente');
campos.calcVol='200';

console.log('\n--- Recusas ---');
alertas.length=0;
sel.value='';
ctx.calcGravarMemoria();
ck(/escolha em qual aplica/i.test(alertas.join(' ')),'sem escolher a aplicação, recusa e explica');
sel.value='inexistente';
alertas.length=0;
ctx.calcGravarMemoria();
ck(/não encontrei/i.test(alertas.join(' ')),'aplicação inexistente recusa');
sel.value='ap2';

ESTUDO.finalizado=true;
alertas.length=0;
var antes=ap2.memoriaCalculo.geradoEm;
ctx.calcGravarMemoria();
ck(/finalizado/i.test(alertas.join(' ')),'estudo finalizado recusa gravação');
eq(ap2.memoriaCalculo.geradoEm,antes,'e nada é alterado');
ESTUDO.finalizado=false;

console.log('\n--- Caixa de gravação na tela ---');
var box=ctx.calcMemoriaBoxHtml();
ck(box.indexOf('MEMÓRIA DE CÁLCULO')>0,'a caixa se identifica');
ck(box.indexOf('20/08/2026')>0,'lista as aplicações por data, em pt-BR');
ck(box.indexOf('BBCH 65')>0,'com o BBCH, para não confundir duas do mesmo dia');
ck(box.indexOf('✓')>0,'e marca a que já tem cálculo gravado');

var semAp=ESTUDO.aplicacoes;
ESTUDO.aplicacoes=[];
ck(ctx.calcMemoriaBoxHtml().indexOf('ainda não tem aplicação')>0,
   'sem aplicação cadastrada, explica o que fazer em vez de mostrar lista vazia');
ESTUDO.aplicacoes=semAp;

console.log('\n--- Resumo para a ficha e o relatório ---');
var r=ctx.aplicacaoMemoriaResumo(ap2);
eq(r.tratamentos,2,'conta os tratamentos que geraram calda (a testemunha não conta)');
eq(r.motor,'BioCalculoCampo '+BC.VERSION,'traz motor e versão');
eq(r.refeito,1,'e diz quantas vezes foi refeito');
eq(ctx.aplicacaoMemoriaResumo({}),null,'aplicação sem memória devolve null');

console.log('\n--- Estudo sem tratamentos ---');
ck(!!ctx.calcMemoria({id:'x',tratamentos:[]},ctx._calcConfigAtual()).erro,
   'estudo sem tratamento devolve erro legível, não memória vazia');

console.log('\n'+(f?f+' FALHA(S)':p+' verificações, nenhuma falha.'));
process.exit(f?1:0);

})();
