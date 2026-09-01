/* Método de aplicação, perfis de equipamento e a fronteira campo/bancada.
 *   roadmap §7.2, §7.3 e §7-bis.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 *  1. CATEGORIA. Bancada e campo não compartilham método. Numa quadra de laboratório
 *     o único método é a Torre de Potter; numa quadra de campo a Potter não existe.
 *     Oferecer sider numa bancada é o mesmo erro que mostrar BBCH num ensaio de placa.
 *
 *  2. DIVERGÊNCIA É QUE É INFORMAÇÃO. Enquanto todos os tratamentos usam o mesmo
 *     método, ele não vira tinta na tela — repetir cinco vezes o mesmo rótulo não
 *     informa nada. Quando um diverge, todos passam a mostrar o seu.
 *
 *  3. O OVERRIDE É DECLARADO. Sem a chave ligada, um método guardado num tratamento
 *     numa edição anterior NÃO pode voltar a valer sozinho.
 *
 *  4. O PERFIL DEVOLVE CONFIGURAÇÃO, NUNCA LEITURA. Pré-preencher coleta seria forjar
 *     medição: números na tela que ninguém coletou, com cara de que alguém coletou.
 *
 * Rodar: node test_metodo_aplicacao.js
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
/* Objeto literal: casa as chaves, senão o recorte engole meio arquivo. */
function pegaVar(nome){
  var i=src.indexOf('var '+nome+'={');
  if(i<0) throw new Error('não achei a var '+nome);
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j)+';';
}

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var LAB={}, store={};
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseFloat:parseFloat, parseInt:parseInt,
  localStorage:{ getItem:function(k){ return store[k]==null?null:store[k]; },
                 setItem:function(k,v){ store[k]=String(v); } },
  isQuadraLab:function(qid){ return !!LAB[qid]; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pegaVar('APLIC_METODOS'), pegaVar('APLIC_METODOS_CURTO'),
  pega('aplicMetodosDe'), pega('aplicMetodoValido'), pega('aplicMetodoDoTexto'),
  pega('studyMetodo'), pega('tratMetodo'), pega('studyMetodosVariam'),
  "var PERFIL_EQUIP_KEY='agracta-perfil-equip-v1';",
  pega('_perfisEquip'), pega('perfilEquipDe'), pega('perfilEquipGravar')
].join('\n'), ctx);

LAB['LAB1']=true;   /* quadra de laboratório */
/* 'Q1' fica de fora do mapa: é quadra de campo */

/* ============================================================================== */
console.log('\n--- CATEGORIA: bancada e campo não compartilham método ---');
eq(JSON.stringify(ctx.aplicMetodosDe('Q1')),'["co2","tractor","drone","atomizer"]','campo oferece as quatro máquinas');
/* O primeiro da lista é o default de quem não declarou nada. Num app de P&D é o
   costal, que é o pulverizador de pesquisa — começar pelo sider faria o estudo sem
   protocolo nascer sem a planilha de coleta bico a bico. */
eq(ctx.aplicMetodosDe('Q1')[0],'co2','e o costal é o primeiro, que é quem vale por omissão');
eq(JSON.stringify(ctx.aplicMetodosDe('LAB1')),'["lab"]','bancada oferece só a Torre de Potter');
eq(ctx.aplicMetodoValido('Q1','lab'),false,'Potter NÃO existe em quadra de campo');
eq(ctx.aplicMetodoValido('LAB1','tractor'),false,'sider NÃO existe em bancada');
eq(ctx.aplicMetodoValido('LAB1','drone'),false,'drone tampouco');
eq(ctx.aplicMetodoValido('Q1','drone'),true,'drone é de campo');

console.log('\n--- O que a planilha escreveu por extenso ---');
eq(ctx.aplicMetodoDoTexto('Drone DJI Agras T25P'),'drone','drone');
eq(ctx.aplicMetodoDoTexto('Torre de Potter'),'lab','Potter');
eq(ctx.aplicMetodoDoTexto('Atomizador costal motorizado'),'atomizer','atomizador');
eq(ctx.aplicMetodoDoTexto('Pulverizador costal pressurizado a CO2'),'co2','costal a CO2');
eq(ctx.aplicMetodoDoTexto('Trator — sider'),'tractor','sider');
eq(ctx.aplicMetodoDoTexto('Costal CO2 sobre o sider'),'co2','CO2 vence quando as duas palavras aparecem');
/* Chutar aqui faria um estudo de drone ser calculado como barra. */
eq(ctx.aplicMetodoDoTexto('a definir'),null,'texto que não diz nada devolve null, não um palpite');
eq(ctx.aplicMetodoDoTexto(''),null,'célula vazia idem');

console.log('\n--- Método do estudo: declarado > protocolo > categoria ---');
var CAMPO={id:'s1', protocolo:{equipamento:'Drone DJI Agras T25P'}, tratamentos:[
  {id:'T1'},{id:'T2'},{id:'T3'}]};
eq(ctx.studyMetodo(CAMPO,'Q1'),'drone','sem declaração, vale o que o protocolo escreveu');
CAMPO.metodoAplicacao='co2';
eq(ctx.studyMetodo(CAMPO,'Q1'),'co2','declarado vence o protocolo');
/* A bancada não negocia: mesmo com "drone" declarado, quadra de lab é Potter. */
CAMPO.metodoAplicacao='drone';
eq(ctx.studyMetodo(CAMPO,'LAB1'),'lab','em bancada o método é Potter, dê no que der');
var SEM={id:'s2', tratamentos:[]};
eq(ctx.studyMetodo(SEM,'Q1'),'co2','sem nada, o primeiro válido da categoria');
eq(ctx.studyMetodo(SEM,'LAB1'),'lab','e na bancada, Potter');

console.log('\n--- O override é DECLARADO, não herdado em silêncio ---');
var S={id:'s3', metodoAplicacao:'co2', metodoPorTratamento:false, tratamentos:[
  {id:'T1'}, {id:'T2', aplicacao:{metodo:'drone'}}, {id:'T3'}]};
/* T2 tem um método guardado de uma edição anterior. Com a chave DESLIGADA ele não
   pode voltar a valer sozinho — senão o cálculo mudaria sem ninguém ter pedido. */
eq(ctx.tratMetodo(S,'Q1',S.tratamentos[1]),'co2','chave desligada: o método guardado NÃO vale');
eq(ctx.studyMetodosVariam(S,'Q1'),false,'e portanto nada diverge');
S.metodoPorTratamento=true;
eq(ctx.tratMetodo(S,'Q1',S.tratamentos[1]),'drone','ligada a chave, o override vale');
eq(ctx.tratMetodo(S,'Q1',S.tratamentos[0]),'co2','e quem não declarou segue o método do estudo');
eq(ctx.studyMetodosVariam(S,'Q1'),true,'agora sim, os tratamentos divergem');

console.log('\n--- Divergência é que é informação ---');
/* Quem ligou a chave e deixou tudo igual não ganha cinco rótulos repetidos. */
var IGUAL={id:'s4', metodoAplicacao:'co2', metodoPorTratamento:true, tratamentos:[
  {id:'T1',aplicacao:{metodo:'co2'}},{id:'T2',aplicacao:{metodo:'co2'}}]};
eq(ctx.studyMetodosVariam(IGUAL,'Q1'),false,'chave ligada com todos iguais NÃO conta como divergência');
IGUAL.tratamentos[1].aplicacao.metodo='tractor';
eq(ctx.studyMetodosVariam(IGUAL,'Q1'),true,'basta um diferente');

/* Um override de categoria errada não pode passar: 'lab' num estudo de campo. */
var CRUZ={id:'s5', metodoAplicacao:'co2', metodoPorTratamento:true, tratamentos:[
  {id:'T1',aplicacao:{metodo:'lab'}}]};
eq(ctx.tratMetodo(CRUZ,'Q1',CRUZ.tratamentos[0]),'co2','Potter declarado numa quadra de campo é ignorado, não aplicado');
eq(ctx.studyMetodosVariam(CRUZ,'Q1'),false,'e por isso nada diverge');

console.log('\n--- §7.3 Perfil: configuração se herda, medida se faz ---');
var BARRA={equipamento:'co2', bicos:4, espacamentoM:0.5, larguraManualM:0,
  velocidadeKmH:5, tempoColetaS:30, metodo:'bico a bico', toleranciaPct:5, cvLimitePct:10,
  ponta:'XR11002', pressao:'2 bar',
  leituras:{bicos:[['500','500','500'],['500','500','500'],['500','500','500'],['500','500','500']]},
  resultado:{taxaRealLHa:240, cvPct:0}};
var perf=ctx.perfilEquipGravar(BARRA);
eq(perf.bicos,4,'o perfil guarda o nº de bicos');
eq(perf.espacamentoM,0.5,'o espaçamento');
eq(perf.velocidadeKmH,5,'a velocidade');
eq(perf.tempoColetaS,30,'o tempo de coleta');
eq(perf.ponta,'XR11002','a ponta');
eq(perf.cvLimitePct,10,'e os critérios de aceitação');
/* A LINHA DURA. Leitura no perfil apareceria na tela como coleta que ninguém fez. */
eq(perf.leituras,undefined,'o perfil NÃO guarda as leituras');
eq(JSON.stringify(perf).indexOf('500'),-1,'nenhum valor de coleta sobrevive no perfil');
ck(perf.em>0,'e ele se data, para a oferta poder dizer de quando é');

eq(ctx.perfilEquipDe('co2').bicos,4,'o perfil é lido de volta pelo equipamento');
eq(ctx.perfilEquipDe('tractor'),null,'e não vaza de uma máquina para a outra');
/* Regravar substitui: a configuração habitual é a última que se julgou boa. */
BARRA.bicos=6; ctx.perfilEquipGravar(BARRA);
eq(ctx.perfilEquipDe('co2').bicos,6,'regravar atualiza o perfil');
eq(ctx.perfilEquipGravar({}),null,'barra sem equipamento não vira perfil');

console.log('\n--- §7-bis: as guardas do laboratório são explícitas no código ---');
/* Guarda por ausência de dado é guarda que volta a falhar quando o dado reaparece.
   Estes três pontos precisam continuar perguntando "é laboratório?", não "tem
   cultura?" / "tem faixa?". */
ck(/function bbchListDaQuadra\([\s\S]{0,220}isQuadraLab/.test(src),
   'o BBCH pergunta pela QUADRA, não pela ausência de cultura');
ck(src.indexOf('var bbchList=getBBCHList(')<0,
   'e nenhum ponto da tela chama getBBCHList direto, sem a guarda');
ck(/if\(isQuadraLab\(curV\)\)\{[\s\S]{0,400}Dia do tratamento/.test(src),
   'a linha "1ª aplicação / Nº aplicações / intervalo" some na bancada');
ck(/Faixa é arranjo de TERRENO[\s\S]{0,300}if\(!isQuadraLab\(curV\)\)/.test(src),
   'e o desenho em faixas nem é oferecido numa bancada');
ck(/if\(isQuadraLab\(curV\)\)\{ workingStudy\.desenho='dbc'/.test(src),
   'estudo de bancada que herdou "faixas" de uma edição antiga é corrigido ao salvar');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
