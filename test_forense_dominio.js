/* Achados de DOMÍNIO e TEMPORAIS na folha forense (roadmap §12).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Estes achados não precisam de registro novo: são comparações entre campos que já
 * estão gravados. "Avaliação antes da aplicação" e "BBCH retrocedendo" são erros
 * que ninguém percebe lendo a tela um evento por vez, e que saltam quando se olha
 * a sequência inteira — que é o que a folha BPL faz.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. O ACHADO NASCE DA SEQUÊNCIA. Um evento sozinho não sabe que veio antes do
 *     que deveria.
 *  2. CONTA EM VEZ DE LISTAR CÉLULA A CÉLULA. Vinte valores acima de 100% são um
 *     achado com vinte ocorrências, não vinte achados.
 *  3. AGENDA NÃO É ERRO. Avaliação PROGRAMADA para o futuro é o normal; registro
 *     com data futura é digitação.
 *  4. ESTUDO CERTO NÃO GERA ACHADO.
 *
 * Rodar: node test_forense_dominio.js
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

var ctx={console:console, String:String, Number:Number, Object:Object, Array:Array,
  Math:Math, JSON:JSON, isFinite:isFinite, parseInt:parseInt, parseFloat:parseFloat,
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; },
  todayISO:function(){ return '2026-09-03'; },
  studyPlantio:function(s){ return s.plantio||''; },
  _numBR:function(v,d){ var n=parseFloat(String(v==null?'':v).replace(',','.')); return isFinite(n)?n:d; }};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  'var AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};',
  pega('_avTipo'), pega('_avCfg'),
  pega('_forenseAchadosEstudo'), pega('_forenseDominio')
].join('\n'), ctx);
function cods(as){ return as.map(function(a){return a.codigo;}).sort().join(','); }
function tem(as,c){ return as.some(function(a){return a.codigo===c;}); }

console.log('\n--- Estudo em ordem não gera achado ---');
var ok={plantio:'2026-06-01',
  aplicacoes:[{id:'a1', data:'2026-07-01', bbch:'14', carimbo:{}}],
  avaliacoes:[{id:'v1', data:'2026-07-08', bbch:'16'}]};
eq(ctx._forenseAchadosEstudo(ok).length, 0, 'plantio → aplicação → avaliação, BBCH subindo: nada a dizer');

console.log('\n--- Avaliação antes da aplicação ---');
var antes={aplicacoes:[{id:'a1', data:'2026-07-10'}],
  avaliacoes:[{id:'v1', data:'2026-07-02'},{id:'v2', data:'2026-07-15'}]};
var r1=ctx._forenseAchadosEstudo(antes);
eq(cods(r1), 'avaliacao-antes-da-aplicacao', 'só a avaliação anterior é apontada');
eq(r1[0].severidade, 'conferir', 'como conferir');
ck(r1[0].texto.indexOf('02/07/2026')>=0, 'com a data em formato brasileiro');

console.log('\n--- Aplicação antes do plantio ---');
var preplantio={plantio:'2026-06-15',
  aplicacoes:[{id:'a1', data:'2026-06-01'}], avaliacoes:[]};
eq(cods(ctx._forenseAchadosEstudo(preplantio)), 'aplicacao-antes-do-plantio', 'apontada');
var semPlantio={aplicacoes:[{id:'a1', data:'2026-06-01'}], avaliacoes:[]};
eq(ctx._forenseAchadosEstudo(semPlantio).length, 0, 'sem plantio declarado, não se inventa a comparação');

console.log('\n--- Data no futuro: agenda não é erro ---');
/* Avaliação PROGRAMADA para o futuro é o normal do app. Só o que tem registro
   conta — senão a agenda inteira viraria achado. */
var futuroProgramado={aplicacoes:[], avaliacoes:[{id:'v1', data:'2026-12-01'}]};
eq(ctx._forenseAchadosEstudo(futuroProgramado).length, 0, 'avaliação só programada não é achado');
var futuroRegistrado={aplicacoes:[], avaliacoes:[{id:'v1', data:'2026-12-01', notas:{'T1R1':{sev:'10'}}}]};
ck(tem(ctx._forenseAchadosEstudo(futuroRegistrado),'data-no-futuro'), 'mas com nota lançada, sim');
var aplFuturo={aplicacoes:[{id:'a1', data:'2026-12-01', carimbo:{}}], avaliacoes:[]};
ck(tem(ctx._forenseAchadosEstudo(aplFuturo),'data-no-futuro'), 'aplicação carimbada no futuro também');

console.log('\n--- BBCH não retrocede ---');
var bbch={aplicacoes:[{id:'a1', data:'2026-07-01', bbch:'65'}],
  avaliacoes:[{id:'v1', data:'2026-07-10', bbch:'31'}]};
var rb=ctx._forenseAchadosEstudo(bbch);
ck(tem(rb,'bbch-retrocedendo'), 'a planta não volta de estádio');
ck(rb[0].texto.indexOf('65')>=0 && rb[0].texto.indexOf('31')>=0, 'a frase mostra os dois estádios');
var bbchOk={aplicacoes:[{id:'a1', data:'2026-07-01', bbch:'31'}],
  avaliacoes:[{id:'v1', data:'2026-07-10', bbch:'65'}]};
eq(ctx._forenseAchadosEstudo(bbchOk).length, 0, 'subindo, nada a dizer');
var bbchVazio={aplicacoes:[{id:'a1', data:'2026-07-01', bbch:''}],
  avaliacoes:[{id:'v1', data:'2026-07-10', bbch:'65'}]};
eq(ctx._forenseAchadosEstudo(bbchVazio).length, 0, 'evento sem BBCH não entra na comparação');

console.log('\n--- Domínio: valor fora do que a variável admite ---');
var av={variaveis:['Severidade'], tipos:{Severidade:'pct'},
  notas:{'T1R1':{Severidade:'120'},'T1R2':{Severidade:'115'},'T2R1':{Severidade:'40'}}};
var rd=ctx._forenseDominio(av);
eq(rd.length, 1, 'um achado, não dois');
ck(rd[0].texto.indexOf('2 valor')>=0, 'contando as ocorrências');
ck(rd[0].texto.indexOf('acima de 100%')>=0, 'e dizendo qual é o problema');
ck(rd[0].texto.indexOf('Severidade')>=0, 'na variável nomeada');

var neg={variaveis:['Insetos'], tipos:{Insetos:'contagem'}, notas:{'T1R1':{Insetos:'-3'}}};
ck(ctx._forenseDominio(neg)[0].texto.indexOf('negativo')>=0, 'contagem negativa é apontada');
var frac={variaveis:['Insetos'], tipos:{Insetos:'contagem'}, notas:{'T1R1':{Insetos:'3,5'}}};
ck(ctx._forenseDominio(frac)[0].texto.indexOf('fracionada')>=0, 'contagem fracionada também');
var esc={variaveis:['Nota'], tipos:{Nota:'escala'}, varcfg:{Nota:{escalaMax:4}},
  notas:{'T1R1':{Nota:'7'}}};
ck(ctx._forenseDominio(esc)[0].texto.indexOf('escala')>=0, 'nota acima do máximo da escala idem');

console.log('\n--- Valores válidos não geram achado ---');
var bom={variaveis:['Severidade'], tipos:{Severidade:'pct'},
  notas:{'T1R1':{Severidade:'0'},'T1R2':{Severidade:'100'},'T2R1':{Severidade:'42,5'}}};
eq(ctx._forenseDominio(bom).length, 0, '0, 100 e decimal em % são todos válidos');
eq(ctx._forenseDominio({variaveis:['X'], notas:{'T1R1':{X:''}}}).length, 0, 'célula vazia não é achado');
eq(ctx._forenseDominio({variaveis:['X'], notas:{'T1R1':{X:'abc'}}}).length, 0, 'texto não numérico é ignorado');
eq(ctx._forenseDominio(null).length, 0, 'sem avaliação, lista vazia');
eq(ctx._forenseAchadosEstudo(null).length, 0, 'sem estudo, lista vazia');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
