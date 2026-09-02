/* A aplicação herda do estudo (roadmap §7.4).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Até aqui a memória de cálculo só existia se alguém abrisse a calculadora e
 * apertasse "Gravar nesta aplicação". Quem registrasse a aplicação direto — que é o
 * caminho normal de quem está no campo com o celular — deixava a aplicação sem
 * nenhum registro do que foi preparado.
 *
 * O buraco não era de interface: a configuração de preparo só existia na TELA.
 * calcConfigDoEstudo a deriva do ESTUDO, sem DOM, com a mesma ordem de preferência
 * da calculadora (protocolo primeiro, cadastro do estudo depois).
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. GOLDEN TEST. A configuração derivada tem de bater com a que a tela mostraria, e
 *     o cálculo que sai dela com o golden test da calculadora.
 *  2. DERIVADA E CONFERIDA NÃO SÃO A MESMA COISA. Um registro BPL que não distinguisse
 *     as duas estaria afirmando uma conferência que não houve.
 *  3. NUNCA POR CIMA. Memória derivada não sobrescreve memória existente.
 *  4. FALTOU DADO, NÃO SE INVENTA. Sem parcela ou sem volume não há como transformar
 *     dose/ha em mililitro de frasco: melhor não gravar que gravar zeros com cara de
 *     registro.
 *
 * Rodar: node test_aplicacao_herda.js
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
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ var ok=(a!=null&&isFinite(a)&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  APP_VER:'teste', BioCalculoCampo:BC,
  document:{ getElementById:function(){ return null; } },
  esc:function(v){ return String(v==null?'':v); },
  studyTestemunha:function(st){ return (st.tratamentos||[]).filter(function(t){return t.testemunha;}).map(function(t){return t.id;})[0]||null; },
  _currentUserName:function(){ return 'Daria'; },
  isQuadraLab:function(){ return false; },
  tratMetodo:function(){ return 'tractor'; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('_calcNum'), pega('_calcVal'), pega('_calcDoseUnit'), pega('_numBR'),
  pega('_parseParcelaDim'),
  pega('calcConfigDoEstudo'), pega('calcConfigCompleta'),
  pega('aplicacaoMemoriaAuto'), pega('calcMemoria'), pega('calcMemoriaTexto')
].join('\n'), ctx);

function estudo(){
  return {
    id:'s1', codigo:'EST-26148',
    numRepeticoes:4, volumeMorto:'300', numFrascos:1, capacidadeFrasco:0,
    protocolo:{tamanhoParcela:'5x2', volumeCalda:'200', equipamento:'Trator — sider'},
    tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
                 {id:'T2',produto:'Produto A',dose:'1,5 L/ha'}]
  };
}

/* ============================================================================== */
console.log('\n--- A configuração vem do estudo, sem tela nenhuma ---');
var st=estudo();
var cfg=ctx.calcConfigDoEstudo(st,'Q1');
eq(cfg.parcelaComprimento,5,'comprimento da parcela, lido do protocolo');
eq(cfg.parcelaLargura,2,'largura da parcela');
eq(cfg.parcelas,4,'parcelas por tratamento = repetições do estudo');
eq(cfg.volumeCaldaLHa,200,'volume de calda do protocolo');
eq(cfg.volumeMortoMl,300,'volume morto do cadastro do estudo');
eq(cfg.frascos,1,'frascos');
eq(cfg.origem,'estudo','e a configuração diz de onde veio');
eq(cfg.qid,'Q1','com a quadra junto, porque o método depende da categoria dela');

console.log('\n--- Volume: protocolo primeiro; senão, só se todos concordarem ---');
var s2=estudo(); s2.protocolo.volumeCalda='';
s2.tratamentos[0].volume='150'; s2.tratamentos[1].volume='150';
eq(ctx.calcConfigDoEstudo(s2,'Q1').volumeCaldaLHa,150,'sem protocolo, o volume uniforme dos tratamentos vale');
s2.tratamentos[1].volume='50';
/* Um "padrão" inventado aqui seria aplicado justamente a quem não declarou nada. */
eq(ctx.calcConfigDoEstudo(s2,'Q1').volumeCaldaLHa,0,'volumes divergentes NÃO viram um padrão inventado');

console.log('\n--- GOLDEN TEST: a conta derivada é a mesma da calculadora ---');
/* Parcela 5×2 m, 4 parcelas -> 40 m² = 0,004 ha. Calda 0,004 × 200 = 0,8 L,
   + 300 mL de volume morto = 1,1 L. T2 a 1,5 L/ha em 1,1 L de calda = 8,25 mL. */
var mem=ctx.calcMemoria(st, cfg);
var t2=mem.tratamentos.filter(function(t){return t.id==='T2';})[0];
perto(t2.caldaTotalL,1.1,1e-9,'calda total 1,1 L — o mesmo número da tela');
perto(t2.componentes[0].total,8.25,1e-9,'produto do T2 8,25 mL — idem');

console.log('\n--- Derivada e conferida não são a mesma coisa ---');
var ap={id:'ap1', data:'2026-08-20'};
var auto=ctx.aplicacaoMemoriaAuto(st,'Q1',ap);
ck(!!auto,'salvar a aplicação produz memória sem ninguém abrir a calculadora');
eq(auto.origem,'derivada','marcada como DERIVADA');
eq(auto.derivadaDe,'protocolo e cadastro do estudo','dizendo de onde saiu');
perto(auto.tratamentos.filter(function(t){return t.id==='T2';})[0].componentes[0].total,8.25,1e-9,
      'e com a conta certa');
/* A memória gravada pela calculadora se marca 'conferida' — alguém olhou. O código
   que faz isso é o calcGravarMemoria, e ele não pode deixar de fazê-lo. */
ck(/mem\.origem='conferida';\s*\n\s*ap\.memoriaCalculo=mem;/.test(src),
   'a memória gravada pela calculadora se marca CONFERIDA');

console.log('\n--- Nunca por cima do que já existe ---');
ap.memoriaCalculo={origem:'conferida', tratamentos:[]};
eq(ctx.aplicacaoMemoriaAuto(st,'Q1',ap),null,'aplicação que já tem memória não é sobrescrita');
ap.memoriaCalculo={origem:'derivada', tratamentos:[]};
eq(ctx.aplicacaoMemoriaAuto(st,'Q1',ap),null,'nem uma derivada anterior');

console.log('\n--- Faltou dado declarado: não se inventa ---');
eq(ctx.calcConfigCompleta(cfg),true,'com parcela e volume, dá para calcular');
var semParc=estudo(); semParc.protocolo.tamanhoParcela='';
eq(ctx.calcConfigCompleta(ctx.calcConfigDoEstudo(semParc,'Q1')),false,'sem parcela, não dá');
eq(ctx.aplicacaoMemoriaAuto(semParc,'Q1',{id:'x'}),null,'e nenhuma memória de zeros é gravada');
var semVol=estudo(); semVol.protocolo.volumeCalda='';
eq(ctx.calcConfigCompleta(ctx.calcConfigDoEstudo(semVol,'Q1')),false,'sem volume de calda, não dá');
eq(ctx.aplicacaoMemoriaAuto(semVol,'Q1',{id:'x'}),null,'idem');
var semTrat=estudo(); semTrat.tratamentos=[];
eq(ctx.aplicacaoMemoriaAuto(semTrat,'Q1',{id:'x'}),null,'estudo sem tratamentos não gera memória');

console.log('\n--- O bloco herdado é somente leitura ---');
/* Editar por cima criaria uma segunda verdade sobre a mesma aplicação: o estudo
   diria uma dose e a aplicação, outra. Quem muda, muda no estudo. */
var bloco=src.slice(src.indexOf('function aplicacaoHerancaHtml('));
bloco=bloco.slice(0,bloco.indexOf('\n}\n'));
ck(bloco.indexOf('<input')<0,'nenhum campo editável no bloco herdado');
ck(bloco.indexOf('<select')<0,'nenhum seletor tampouco');
ck(/O que vai ser aplicado/.test(bloco),'e ele diz o que é');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
