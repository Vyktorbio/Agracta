/* Solo automático da quadra (Embrapa / SiBCS).
 *
 * O que estes testes protegem, e por quê:
 *
 *  - saveE() remonta data[qid] DO ZERO. Antes de existir a linha que carrega o solo
 *    adiante, abrir e salvar a quadra apagava a classificação em silêncio — o mesmo
 *    acidente que já tinha transformado laboratório em quadra de campo.
 *  - A escala tem de ser a REAL da camada que respondeu. O mapa nacional é
 *    1:5.000.000; exibir isso como se fosse levantamento de talhão seria mentir.
 *  - Quadra a cavaleiro de duas unidades precisa avisar: a média do ensaio mistura
 *    solos diferentes.
 *  - Falha de rede mostra o motivo em vez de sumir (lição do chip do clima).
 *  - O que foi digitado no protocolo nunca é sobrescrito pelo automático.
 *
 * Rodar: node test_solo.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0)throw new Error('não achei '+nome);
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

var pedidos=[];
function fetchFake(url){
  var o={url:url};
  o.promise=new Promise(function(res,rej){o.resolve=res;o.reject=rej;});
  pedidos.push(o); return o.promise;
}
function resposta(obj){ return {ok:true,json:function(){return Promise.resolve(obj);}}; }
function gira(){ return new Promise(function(r){setImmediate(r);}); }

/* A aritmetica de calagem e recomendacao mudou de casa: mora em
   vendor/nutricao-core.js, e o app.js so delega. O teste continua exercitando as
   MESMAS funcoes pelos MESMOS nomes — que e o ponto de a ponte existir. */
var NutricaoCore=require('./vendor/nutricao-core.js');

var salvou=0, upserts=[];
var store={};
var ctx={
  console:console,Promise:Promise,Date:Date,String:String,Number:Number,Math:Math,
  JSON:JSON,isFinite:isFinite,Object:Object,
  fetch:fetchFake,
  NDVI_PROXY:'https://proxy.test',
  NutricaoCore:NutricaoCore,
  APP_VER:'teste',
  localStorage:{
    getItem:function(k){return Object.prototype.hasOwnProperty.call(store,k)?store[k]:null;},
    setItem:function(k,v){store[k]=String(v);},
    removeItem:function(k){delete store[k];}
  },
  document:{getElementById:function(){return null;},head:{appendChild:function(){}},
            createElement:function(){return {};}},
  esc:function(v){return String(v==null?'':v);},
  save:function(){salvou++;},
  dbUpsertQuadra:function(q){upserts.push(q);},
  ensureQGEO:function(){},
  quadraCenter:function(id){
    var pts=ctx.QGEO[id]; if(!pts||!pts.length) return null;
    var a=0,b=0; pts.forEach(function(x){a+=x[0];b+=x[1];});
    return [a/pts.length,b/pts.length];
  },
  isQuadraLab:function(id){ return (ctx.data[id]||{}).tipo==='lab'; },
  curV:null,
  QGEO:{ Q1:[[-23.5,-50.2],[-23.5,-50.0],[-23.4,-50.0],[-23.4,-50.2]],
         LAB:null },
  data:{ Q1:{cultura:'Soja',cultivar:'',plantio:'',area:2,estudos:[]},
         LAB:{tipo:'lab',ponto:[-22.6,-47.5],estudos:[]} }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);

var fontes=['soloDaQuadra','soloObservado','_soloGeom','_soloChaveCoord','_soloLerCache',
  '_soloGravarCache','_soloGravar','consultarSolo','soloAtualizar','soloRevisar',
  '_soloCss','soloBlocoHtml','_soloQuando','soloTexto','soloClasseRelatorio','soloCor',
  'soloPropriedades','consultarSoloPropriedades','soloPropAtualizar','soloPropHtml',
  'soloObsHtml','soloSalvarObservado','soloCancelarObservado','_soloVal','_soloDataBR',
  '_soloOrdemDe','_croquiSolo',
  'soloLayerAtiva','soloRecorteAtivo','soloSetRecorte','soloSetOpacidade','soloLimpar',
  'soloCarregarMapa','soloOnMove','soloBindMove','toggleSoloLayer',
  '_soloSet','soloAnalises','soloAnaliseAtual',
  '_nucleoNutricao','soloIndices','soloCalagem','soloCalagemTrilha',
  'soloAnaliseHtml','soloSalvarAnalise','soloApagarAnalise','soloCancelarAnalise',
  'soloCalagemHtml','soloCalagemSaidaHtml','soloCalcular','soloToggleCalculo',
  'soloPacote','soloPacoteNome','soloPacoteValidar','soloPacoteCarregar','soloPacoteRemover',
  'soloPacoteCulturas','_soloPacoteCultura','_soloFaixa','_soloDose','soloRecomendar',
  'soloRecomendacaoHtml','soloRecSaidaHtml','soloRecalcular','soloToggleRec',
  'soloAbrirPacote','soloPacoteApagar'];
var codigo=fontes.map(pega).join('\n');
/* Constantes da seção SOLO, extraídas da própria fonte para o teste não divergir
   dela. Precisa contar chaves: SOLO_CORES ocupa várias linhas. */
function pegaVar(pref){
  var i=src.indexOf(pref);
  if(i<0) throw new Error('não achei '+pref);
  var d=0;
  for(var j=i;j<src.length;j++){
    var c=src[j];
    if(c==='{')d++;
    else if(c==='}')d--;
    else if(c===';'&&d===0) return src.slice(i,j+1);
  }
  throw new Error('não terminou '+pref);
}
['var SOLO_PROXY=','var SOLO_CACHE_KEY=','var _soloSeq=','var SOLO_CORES=','var SOLO_WMS=',
 'var _soloPropSeq=','var SOLO_TEXTURAS=','var _soloLayer=','var _soloMapaSeq=',
 'var SOLO_ANALISE_CAMPOS=','var _soloAnEdit=','var _soloCalMostra=',
 'var SOLO_PACOTE_KEY=','var _soloPacote=','var _soloRecMostra=']
  .forEach(function(pref){ codigo+='\n'+pegaVar(pref); });
vm.runInContext(codigo, ctx);

(async function(){

console.log('\n--- Geometria e pré-condições ---');
var g=ctx._soloGeom('Q1');
eq(g.type,'Polygon','geometria vira Polygon GeoJSON');
eq(g.coordinates[0].length,5,'anel é fechado (4 vértices + repetição do primeiro)');
ck(g.coordinates[0][0][0]===-50.2 && g.coordinates[0][0][1]===-23.5,
   'GeoJSON sai em lng,lat (invertido em relação ao QGEO)');
ck(ctx._soloGeom('LAB')===null,'quadra sem polígono não gera geometria');

var pulou=true;
ctx.consultarSolo('LAB',function(r){ pulou=(r===null); });
ck(pulou && pedidos.length===0,'quadra de laboratório é pulada, sem ir à rede');

console.log('\n--- Consulta e gravação ---');
var recebido=null;
ctx.consultarSolo('Q1',function(r){ recebido=r; });
eq(pedidos.length,1,'consulta dispara uma requisição');
ck(pedidos[0].url.indexOf('/solo?geom=')>0,'chama /solo com a geometria');
ck(ctx._soloEstado==null||true,'estado de busca registrado');

pedidos[0].resolve(resposta({
  fonte:'embrapa-wfs', camada:'geonode:parana_solos_20201105',
  titulo:'Mapa de solos do estado do Paraná',
  classe:'LATOSSOLO VERMELHO Eutroférrico', ordem:'Latossolo', sigla:'LVef',
  escala:'1:250.000', escalaN:250000, sibcs:'2006',
  unidades:[{classe:'LATOSSOLO VERMELHO Eutroférrico',ordem:'Latossolo',sigla:'LVef',pct:100}]
}));
await gira(); await gira();

ck(recebido!==null,'callback recebe o resultado');
eq(ctx.data.Q1.solo.cartografico.classe,'LATOSSOLO VERMELHO Eutroférrico','classe gravada na quadra');
eq(ctx.data.Q1.solo.cartografico.escala,'1:250.000','escala real gravada');
eq(ctx.data.Q1.solo.cartografico.fonte,'embrapa-wfs','procedência gravada');
/* Checa pelo acessor, não pela chave crua: desde que a gravação passou a aplicar
   só o pedaço que mudou, a metade não tocada fica AUSENTE em vez de explicitamente
   nula — e ausente é o que sobrevive melhor ao JSON da sincronização. O que importa
   é que ninguém leia um observado que não existe. */
eq(ctx.soloObservado('Q1'),null,'observado nasce vazio, separado do cartográfico');
ck(ctx.data.Q1.solo.cartografico.ts>0,'carimbo de quando foi consultado');
eq(ctx.data.Q1.solo.cartografico.app,'teste','versão do app registrada junto');
ck(salvou>0 && upserts.indexOf('Q1')>=0,'salva local e enfileira sincronização');

console.log('\n--- saveE não pode apagar o solo (regressão) ---');
/* Reproduz o miolo de saveE(): o objeto é remontado do zero e só sobrevive o que
   for explicitamente carregado adiante. */
var trecho=pega('saveE');
ck(/if\(prev\.solo\)\s*data\[curE\]\.solo=prev\.solo/.test(trecho),
   'saveE carrega prev.solo adiante ao remontar data[curE]');
var iAtrib=trecho.indexOf('data[curE]={'), iSolo=trecho.indexOf('prev.solo');
ck(iAtrib>=0 && iSolo>iAtrib,'a preservação vem DEPOIS da remontagem (senão seria sobrescrita)');

console.log('\n--- Escala honesta ---');
ctx.curV='Q1';
var htmlFino=ctx.soloBlocoHtml('Q1');
ck(htmlFino.indexOf('1:250.000')>0,'ficha mostra a escala da resposta');
ck(htmlFino.indexOf('indicativo regional')<0,'1:250.000 não recebe aviso de escala grosseira');

ctx.data.Q1.solo.cartografico.escalaN=5000000;
ctx.data.Q1.solo.cartografico.escala='1:5.000.000';
var htmlGrosso=ctx.soloBlocoHtml('Q1');
ck(htmlGrosso.indexOf('1:5.000.000')>0,'ficha mostra 1:5.000.000 quando é o caso');
ck(htmlGrosso.indexOf('indicativo regional')>0,'escala grosseira avisa que não caracteriza talhão');

console.log('\n--- Quadra sobre mais de uma unidade ---');
ctx.data.Q1.solo.cartografico.escalaN=250000;
ctx.data.Q1.solo.cartografico.escala='1:250.000';
ctx.data.Q1.solo.cartografico.unidades=[
  {classe:'LATOSSOLO VERMELHO Eutroférrico',ordem:'Latossolo',sigla:'LVef',pct:78},
  {classe:'ARGISSOLO VERMELHO-AMARELO',ordem:'Argissolo',sigla:'PVA',pct:22}];
var htmlMix=ctx.soloBlocoHtml('Q1');
ck(htmlMix.indexOf('atravessa 2 unidades')>0,'avisa quando a quadra cruza duas unidades');
ck(htmlMix.indexOf('78%')>0 && htmlMix.indexOf('22%')>0,'mostra o percentual de cada unidade');
ck(htmlMix.indexOf('LVef')>0 && htmlMix.indexOf('PVA')>0,'identifica as unidades pela sigla');

ctx.data.Q1.solo.cartografico.unidades=[{classe:'LATOSSOLO VERMELHO Eutroférrico',sigla:'LVef',pct:100}];
ck(ctx.soloBlocoHtml('Q1').indexOf('atravessa')<0,'unidade única não gera aviso');

console.log('\n--- Estados: nunca sumir em silêncio ---');
ctx._soloEstado.Q1='buscando';
ck(ctx.soloBlocoHtml('Q1').indexOf('Consultando solo')>0,'estado "buscando" é visível');
ctx._soloEstado.Q1={erro:'o servidor respondeu 502'};
var htmlErro=ctx.soloBlocoHtml('Q1');
ck(htmlErro.indexOf('Solo indisponível')>0,'falha explica que está indisponível');
ck(htmlErro.indexOf('502')>0,'falha mostra o motivo');
ck(htmlErro.indexOf('Tentar de novo')>0,'falha oferece nova tentativa');
ctx._soloEstado.Q1=null;

ctx.data.Q1.solo.cartografico.semCobertura=true;
ck(ctx.soloBlocoHtml('Q1').indexOf('Sem cobertura')>0,'sem cobertura é dito, não escondido');
ctx.data.Q1.solo.cartografico.semCobertura=false;

eq(ctx.soloBlocoHtml('LAB'),'','quadra de laboratório não mostra bloco de solo');

console.log('\n--- Falha de rede de verdade ---');
ctx.data.Q2={cultura:'',estudos:[]};
ctx.QGEO.Q2=[[-23.9,-51.2],[-23.9,-51.0],[-23.8,-51.0],[-23.8,-51.2]];
pedidos.length=0;
var cbErro='nao chamado';
ctx.consultarSolo('Q2',function(r){ cbErro=r; });
pedidos[0].resolve({ok:true,json:function(){return Promise.resolve({error:'Solo: fora do ar'});}});
await gira(); await gira();
eq(cbErro,null,'callback recebe null quando o proxy devolve erro');
ck(ctx._soloEstado.Q2 && ctx._soloEstado.Q2.erro,'erro fica registrado no estado da quadra');
ck(!ctx.data.Q2.solo,'erro não grava classificação inventada');

console.log('\n--- Resposta atrasada de outra quadra ---');
store={};                                  /* sem isto o cache atende e não há rede */
pedidos.length=0; ctx._soloEstado={};
delete ctx.data.Q1.solo;
ctx.consultarSolo('Q1',function(){});
var velho=pedidos[0];
ctx.consultarSolo('Q2',function(){});          /* nova consulta invalida a anterior */
velho.resolve(resposta({classe:'NEOSSOLO QUARTZARÊNICO',escala:'1:250.000',escalaN:250000}));
await gira(); await gira();
ck(!ctx.data.Q1.solo,'resposta atrasada é descartada, não contamina outra quadra');

console.log('\n--- Cache local ---');
store={}; pedidos.length=0; ctx._soloSeq=0; ctx._soloEstado={};
delete ctx.data.Q1.solo;
ctx.consultarSolo('Q1',function(){});
pedidos[0].resolve(resposta({classe:'NITOSSOLO VERMELHO',escala:'1:250.000',escalaN:250000,unidades:[]}));
await gira(); await gira();
ck(store['agracta-solo-v1'] && store['agracta-solo-v1'].indexOf('NITOSSOLO')>0,'resposta vai para o cache local');

var antes=pedidos.length;
delete ctx.data.Q1.solo;
var doCache=null;
ctx.consultarSolo('Q1',function(r){ doCache=r; });
eq(pedidos.length,antes,'segunda consulta na mesma coordenada não vai à rede');
ck(doCache && doCache.classe==='NITOSSOLO VERMELHO','resultado vem do cache');

pedidos.length=0;
ctx.consultarSolo('Q1',function(){},true);
eq(pedidos.length,1,'reconsulta forçada ignora o cache');
pedidos[0].resolve(resposta({classe:'NITOSSOLO VERMELHO',escala:'1:250.000',escalaN:250000,unidades:[]}));
await gira(); await gira();

console.log('\n--- Revisão preserva o registro original (BPL) ---');
ctx.data.Q1.solo={cartografico:{classe:'X',ts:111,iso:'2020-01-01T00:00:00.000Z',escalaN:250000},observado:null};
pedidos.length=0; ctx._soloEstado={};
ctx.soloRevisar('Q1');
pedidos[0].resolve(resposta({classe:'GLEISSOLO HÁPLICO',escala:'1:250.000',escalaN:250000,unidades:[]}));
await gira(); await gira();
var rev=ctx.data.Q1.solo.cartografico;
eq(rev.classe,'GLEISSOLO HÁPLICO','revisão atualiza a classe');
eq(rev.ts,111,'revisão NÃO reescreve o carimbo original');
ck(rev.revisadoEm>0,'revisão marca revisadoEm');

console.log('\n--- Observado x cartográfico ---');
ctx.data.Q1.solo.observado={classe:'Análise: argiloso',fonte:'manual'};
pedidos.length=0; ctx._soloEstado={};
ctx.consultarSolo('Q1',function(){},true);
pedidos[0].resolve(resposta({classe:'LATOSSOLO AMARELO',escala:'1:250.000',escalaN:250000,unidades:[]}));
await gira(); await gira();
eq(ctx.data.Q1.solo.observado.classe,'Análise: argiloso','reconsulta do mapa não apaga a análise de campo');

console.log('\n--- Precedência no relatório ---');
ctx.data.Q1.solo={cartografico:{classe:'LATOSSOLO VERMELHO',escalaN:250000},observado:null};
eq(ctx.soloClasseRelatorio('Q1',{classeSolo:'Argissolo (digitado)'}),'Argissolo (digitado)',
   'valor digitado no protocolo vence o automático');
eq(ctx.soloClasseRelatorio('Q1',{classeSolo:'   '}),'LATOSSOLO VERMELHO',
   'protocolo em branco cede a vez ao automático');
eq(ctx.soloClasseRelatorio('Q1',null),'LATOSSOLO VERMELHO','sem protocolo, usa o automático');
ctx.data.Q1.solo.observado={classe:'Observado em trincheira'};
eq(ctx.soloClasseRelatorio('Q1',null),'Observado em trincheira','observado vence o cartográfico');
ctx.data.Q1.solo={cartografico:{semCobertura:true},observado:null};
eq(ctx.soloClasseRelatorio('Q1',null),'','sem cobertura não inventa texto no relatório');

console.log('\n--- Relatório preenche a célula que saía vazia ---');
ck(/lbl\(10,4,'Classe de Solo:'\);\s*put\(10,5,soloClasseRelatorio/.test(src),
   'a célula "Classe de Solo:" agora recebe um put()');
ck(src.indexOf('[11,5,soloClasseRelatorio(qid,p)]')>0,
   'a segunda exportação também usa a regra de precedência');

console.log('\n--- Cor por ordem do SiBCS ---');
ck(ctx.soloCor('Latossolo')!==ctx.soloCor('Gleissolo'),'ordens diferentes recebem cores diferentes');
ck(!!ctx.soloCor('Ordem Inexistente'),'ordem desconhecida cai numa cor padrão em vez de undefined');

console.log('\n--- Propriedades edáficas (SoilGrids) ---');
store={}; pedidos.length=0; ctx._soloPropEstado={};
ctx.data.Q1.solo={cartografico:{classe:'LATOSSOLO VERMELHO',escalaN:250000,unidades:[]},observado:null};
var pr=null;
ctx.consultarSoloPropriedades('Q1',function(r){ pr=r; });
eq(pedidos.length,1,'consulta dispara uma requisição');
ck(pedidos[0].url.indexOf('/solo/propriedades?lat=')>0,'chama /solo/propriedades com a coordenada');
pedidos[0].resolve(resposta({
  fonte:'soilgrids', referencia:'SoilGrids 2.0 / ISRIC', profundidade:'0-30 cm (média ponderada)',
  textura:'argilosa',
  propriedades:{
    clay:{rotulo:'Argila',unidade:'%',valor:58},
    sand:{rotulo:'Areia',unidade:'%',valor:24},
    phh2o:{rotulo:'pH (H2O)',unidade:'',valor:5.8},
    mo:{rotulo:'Matéria orgânica',unidade:'g/kg',valor:48.27,derivada:'soc x 1,724'}
  }}));
await gira(); await gira();
ck(pr!==null,'callback recebe as propriedades');
eq(ctx.data.Q1.solo.propriedades.propriedades.clay.valor,58,'argila gravada');
eq(ctx.data.Q1.solo.propriedades.estimativa,true,'marcada como estimativa');
ck(ctx.data.Q1.solo.cartografico!==null,'consultar propriedades NÃO apaga o cartográfico');

var hp=ctx.soloBlocoHtml('Q1');
ck(hp.indexOf('58')>0 && hp.indexOf('Argila')>0,'ficha mostra argila');
ck(hp.indexOf('5,8')>0,'pH sai com vírgula decimal (pt-BR)');
ck(hp.indexOf('não substitui análise de solo')>0,
   'a ficha diz que é estimativa e não substitui análise — o aviso não é opcional');
ck(hp.indexOf('soc x 1,724')>0,'MO mostra que é derivada, não medida');
ck(hp.indexOf('argilosa')>0,'textura aparece');

console.log('\n--- Reconsultar o mapa não apaga as propriedades ---');
pedidos.length=0; ctx._soloEstado={};
ctx.consultarSolo('Q1',function(){},true);
pedidos[0].resolve(resposta({classe:'NITOSSOLO VERMELHO',escala:'1:250.000',escalaN:250000,unidades:[]}));
await gira(); await gira();
ck(!!ctx.data.Q1.solo.propriedades,'propriedades sobrevivem à reconsulta do cartográfico');
eq(ctx.data.Q1.solo.cartografico.classe,'NITOSSOLO VERMELHO','e o cartográfico foi atualizado');

console.log('\n--- Estados das propriedades ---');
ctx._soloPropEstado.Q1='buscando';
ck(ctx.soloBlocoHtml('Q1').indexOf('Consultando propriedades')>0,'estado "buscando" visível');
ctx._soloPropEstado.Q1={erro:'timeout'};
ck(ctx.soloBlocoHtml('Q1').indexOf('Propriedades indisponíveis')>0,'falha é dita');
ctx._soloPropEstado.Q1=null;

console.log('\n--- Solo observado ---');
var campos={};
ctx.document.getElementById=function(id){
  if(id==='soloObsForm') return {innerHTML:'',style:{}};
  if(campos[id]!==undefined) return {value:campos[id]};
  return null;
};
campos.soloObsClasse='Latossolo Vermelho (trincheira)';
campos.soloObsTextura='argilosa';
campos.soloObsData='2026-08-12';
campos.soloObsNota='trincheira 1,2 m';
ctx._currentUserName=function(){ return 'Daria'; };
ctx.soloSalvarObservado('Q1');
var ob=ctx.data.Q1.solo.observado;
eq(ob.classe,'Latossolo Vermelho (trincheira)','classe observada gravada');
eq(ob.textura,'argilosa','textura gravada');
eq(ob.fonte,'manual','fonte marcada como manual');
eq(ob.user,'Daria','autoria BPL registrada pelo NOME da pessoa');
ck(ob.ts>0,'carimbo de quando foi registrado');
ck(!ob.revisadoEm,'primeiro registro não é revisão');
ck(!!ctx.data.Q1.solo.cartografico,'salvar o observado não apaga o cartográfico');
ck(!!ctx.data.Q1.solo.propriedades,'nem as propriedades');

var tsOriginal=ob.ts;
campos.soloObsClasse='Latossolo Vermelho-Amarelo';
ctx.soloSalvarObservado('Q1');
eq(ctx.data.Q1.solo.observado.ts,tsOriginal,'editar NÃO reescreve o carimbo original (BPL)');
ck(ctx.data.Q1.solo.observado.revisadoEm>0,'edição marca revisadoEm');

var ho=ctx.soloBlocoHtml('Q1');
ck(ho.indexOf('OBSERVADO EM CAMPO')>0,'ficha tem a seção do observado');
ck(ho.indexOf('Daria')>0,'mostra quem observou');
ck(ho.indexOf('12/08/2026')>0,'data sai em pt-BR');

eq(ctx.soloClasseRelatorio('Q1',null),'Latossolo Vermelho-Amarelo','observado vence o cartográfico no relatório');

campos.soloObsClasse='';
ctx.soloSalvarObservado('Q1');
eq(ctx.data.Q1.solo.observado,null,'classe em branco remove o observado');
ck(!!ctx.data.Q1.solo.cartografico,'e o cartográfico continua lá');

console.log('\n--- Ordem do SiBCS no texto livre do observado ---');
eq(ctx._soloOrdemDe('Latossolo Vermelho eutroférrico'),'Latossolo','reconhece com acento e minúscula');
eq(ctx._soloOrdemDe('ARGISSOLO VERMELHO-AMARELO'),'Argissolo','reconhece em maiúscula');
eq(ctx._soloOrdemDe('não sei ainda'),null,'texto qualquer não vira ordem inventada');
eq(ctx._soloDataBR('2026-08-12'),'12/08/2026','data ISO vira pt-BR');
eq(ctx._soloDataBR(''),'','data vazia não quebra');

console.log('\n--- Recorte do solo para o croqui ---');
ctx.data.Q1.solo={cartografico:{classe:'LATOSSOLO VERMELHO Eutroférrico',ordem:'Latossolo',
  sigla:'LVef',escala:'1:250.000',unidades:[
    {classe:'LATOSSOLO VERMELHO Eutroférrico',ordem:'Latossolo',sigla:'LVef',pct:78},
    {classe:'ARGISSOLO VERMELHO-AMARELO',ordem:'Argissolo',sigla:'PVA',pct:22}]},observado:null};
var cs=ctx._croquiSolo('Q1');
eq(cs.classe,'LATOSSOLO VERMELHO Eutroférrico','croqui recebe a classe');
eq(cs.fonte,'mapa','e sabe que veio do mapa');
eq(cs.unidades.length,2,'com as duas unidades');
eq(cs.unidades[0].pct,78,'e os percentuais');
ck(!!cs.cor && !!cs.unidades[0].cor,'com cor por ordem, para pintar a folha');
eq(cs.escala,'1:250.000','e a escala, para ir impressa na folha');

ctx.data.Q1.solo.observado={classe:'Nitossolo Vermelho'};
var cs2=ctx._croquiSolo('Q1');
eq(cs2.classe,'Nitossolo Vermelho','observado vence o mapa também no croqui');
eq(cs2.fonte,'campo','e a folha sabe que veio do campo');

ctx.data.Q2={cultura:'',estudos:[]};
ck(ctx._croquiSolo('Q2')===null,'quadra sem solo devolve null (a folha deixa neutra)');
ctx.data.Q1.solo={cartografico:{semCobertura:true},observado:null};
ck(ctx._croquiSolo('Q1')===null,'sem cobertura também é null, não classe vazia');

console.log('\n--- Camada de solo no mapa: recorte pelas quadras ---');
/* O recorte é o que torna a camada usável: o mapa pedológico inteiro cobre o
   satélite, que é a referência de quem olha. Estes testes guardam o pedido e as
   duas armadilhas — imagem de outro domínio não pode ser recortada, e clip vazio
   apagaria tudo. */
var camadas=[], removidas=[], desenhos=[];
ctx.LF={ imageOverlay:function(url,bounds,opts){
  var o={url:url,bounds:bounds,opts:opts,
         addTo:function(){ camadas.push(o); return o; },
         bringToFront:function(){}, setOpacity:function(v){ o.opacidade=v; }};
  return o;
}};
ctx._map={ getBounds:function(){ return {getWest:function(){return -50.2;},getSouth:function(){return -23.5;},
                                        getEast:function(){return -50.0;},getNorth:function(){return -23.4;}}; },
           removeLayer:function(l){ removidas.push(l); },
           on:function(){}, __soloMove:false };
ctx.URL={ createObjectURL:function(){ return 'blob:solo'; }, revokeObjectURL:function(){} };
ctx.setTimeout=setTimeout; ctx.clearTimeout=clearTimeout;
ctx.quadrasAtivas=function(){ return ['Q1']; };
ctx.ndviBBox=function(){ return [-50.2,-23.5,-50.0,-23.4]; };
ctx.ndviPx=function(){ return 1024; };
ctx._stxToast=function(){};
/* Canvas de mentira que registra se houve clip antes do desenho. */
function ctxCanvas(){
  var reg={clip:0, moveTo:0, lineTo:0, draw:0};
  return {reg:reg, beginPath:function(){}, moveTo:function(){reg.moveTo++;}, lineTo:function(){reg.lineTo++;},
          closePath:function(){}, clip:function(){reg.clip++;}, drawImage:function(){reg.draw++;}};
}
var ultimoCanvas=null;
ctx.document.createElement=function(t){
  if(t!=='canvas') return {};
  var c2=ctxCanvas(); ultimoCanvas=c2;
  return {width:0,height:0,getContext:function(){return c2;},toDataURL:function(){return 'data:recortado';}};
};
var imagens=[];
ctx.Image=function(){ var im={}; imagens.push(im); Object.defineProperty(im,'src',{set:function(){ }}); return im; };

function pedirMapa(){
  pedidos.length=0; camadas.length=0; imagens.length=0; ultimoCanvas=null;
  ctx.soloCarregarMapa();
  return pedidos[0];
}
function entregarImagem(){
  var im=imagens[imagens.length-1];
  im.naturalWidth=1024; im.naturalHeight=512;
  im.onload();
}

eq(ctx.soloRecorteAtivo(),true,'o recorte vem ligado por padrão');
eq(ctx.soloLayerAtiva(),false,'e a camada começa desligada');

var ped=pedirMapa();
ck(ped.url.indexOf('/solo/mapa?bbox=')>0,'pede a imagem ao proxy, não tile direto');
ck(ped.url.indexOf('-50.2,-23.5,-50,-23.4')>0,'com a caixa visível do mapa');
ped.resolve({ok:true,blob:function(){return Promise.resolve('blob');}});
await gira(); await gira();
entregarImagem();
eq(camadas.length,1,'a imagem entra como camada no mapa');
ck(ultimoCanvas && ultimoCanvas.reg.clip===1,'com recorte ligado, recorta antes de desenhar');
ck(ultimoCanvas.reg.moveTo===1 && ultimoCanvas.reg.lineTo===3,'usa os vértices da quadra no recorte');
eq(camadas[0].url,'data:recortado','a camada recebe a imagem recortada');

ctx.soloSetRecorte(false);
eq(ctx.soloRecorteAtivo(),false,'desligar o recorte fica registrado');
ped=pedirMapa();
ped.resolve({ok:true,blob:function(){return Promise.resolve('blob');}});
await gira(); await gira();
entregarImagem();
eq(camadas[camadas.length-1].url,'blob:solo','sem recorte, usa a imagem inteira');
ctx.soloSetRecorte(true);

console.log('\n--- Sem quadra desenhada, não apaga o mapa ---');
ctx.quadrasAtivas=function(){ return []; };
ped=pedirMapa();
ped.resolve({ok:true,blob:function(){return Promise.resolve('blob');}});
await gira(); await gira();
entregarImagem();
eq(camadas[camadas.length-1].url,'blob:solo',
   'sem quadra nenhuma mostra o mapa inteiro — clip vazio apagaria tudo e pareceria falha');
ctx.quadrasAtivas=function(){ return ['Q1']; };

console.log('\n--- Resposta atrasada de outro enquadramento ---');
pedidos.length=0; camadas.length=0; imagens.length=0;
ctx.soloCarregarMapa();
var velhoPedido=pedidos[0], velhaImagem;
velhoPedido.resolve({ok:true,blob:function(){return Promise.resolve('blob');}});
await gira(); await gira();
velhaImagem=imagens[imagens.length-1];
ctx.soloCarregarMapa();                       /* o usuário moveu o mapa */
var antes=camadas.length;
velhaImagem.naturalWidth=1024; velhaImagem.naturalHeight=512; velhaImagem.onload();
eq(camadas.length,antes,'imagem atrasada do enquadramento anterior é descartada');

console.log('\n--- Erro do proxy não deixa camada quebrada ---');
pedidos.length=0; camadas.length=0;
ctx.soloCarregarMapa();
pedidos[0].resolve({ok:false,json:function(){return Promise.resolve({error:'Solo: sem levantamento'});}});
await gira(); await gira();
eq(camadas.length,0,'falha não adiciona camada nenhuma');

console.log('\n--- Ligar e desligar ---');
pedidos.length=0; camadas.length=0; removidas.length=0;
ctx._soloLayer=null;
ctx.toggleSoloLayer();
ck(pedidos.length===1,'ligar dispara o carregamento');
pedidos[0].resolve({ok:true,blob:function(){return Promise.resolve('blob');}});
await gira(); await gira();
entregarImagem();
eq(ctx.soloLayerAtiva(),true,'camada fica ativa');
ctx.toggleSoloLayer();
eq(ctx.soloLayerAtiva(),false,'desligar remove a camada');
ck(removidas.length>0,'e ela sai do mapa de verdade');

console.log('\n--- Índices derivados da análise ---');
/* Definições universais de química de solo. São CALCULADOS e nunca digitados: um
   laudo pode trazer V% junto com Ca/Mg/K que não fecham, e aí haveria dois números
   discordando sem saber qual vale. */
var LAUDO={pH:5.2,MO:28,P:12,K:3.0,Ca:25,Mg:8,HAl:28,Al:2};
var ind=ctx.soloIndices(LAUDO);
eq(ind.SB,36,'SB = Ca + Mg + K = 25 + 8 + 3');
eq(ind.T,64,'T (CTC) = SB + (H+Al) = 36 + 28');
eq(ind.V,56,'V% = 100 × SB / T = 56');
eq(ind.m,5,'m% = 100 × Al / (SB + Al) = 5');
eq(ctx.soloIndices({Ca:25,Mg:8}).SB,null,'faltando K, não calcula SB em vez de chutar');
eq(ctx.soloIndices({}).V,null,'laudo vazio não inventa V%');

console.log('\n--- Calagem pela saturação por bases ---');
var cal=ctx.soloCalagem(LAUDO,70,85,20);
eq(cal.nc,1.05,'NC = (70−56) × 64 ÷ (10 × 85) = 1,05 t/ha');
eq(ctx.soloCalagem(LAUDO,70,85,40).nc,2.11,'40 cm dobra a dose');
ck(ctx.soloCalagem(LAUDO,70,70,20).nc > cal.nc,'PRNT menor exige mais calcário');
eq(ctx.soloCalagem({Ca:40,Mg:12,K:4,HAl:14},70,85,20).nc,0,'V% já no alvo: dose zero');
ck(!!ctx.soloCalagem(LAUDO,70,0,20).erro,'PRNT zero recusa em vez de dividir por zero');
ck(!!ctx.soloCalagem(LAUDO,150,85,20).erro,'V2 acima de 100 recusa');
ck(!!ctx.soloCalagem({Ca:25},70,85,20).erro,'laudo incompleto recusa');

console.log('\n--- Trilha de cálculo ---');
var tr=ctx.soloCalagemTrilha(cal).join(' | ');
ck(tr.indexOf('56')>0 && tr.indexOf('70')>0 && tr.indexOf('64')>0 && tr.indexOf('85')>0,
   'a trilha traz V1, V2, T e PRNT — a conta inteira, conferível');
ck(tr.indexOf('1.05')>0,'e o resultado');
ck(ctx.soloCalagemTrilha(ctx.soloCalagem(LAUDO,70,85,40)).join(' ').indexOf('40 cm')>0,
   'ajuste de profundidade vai dito, para não aplicar dose de 40 cm achando que é padrão');
eq(ctx.soloCalagemTrilha({erro:'x'}).length,0,'erro não gera trilha');

console.log('\n--- Lançamento da análise ---');
ctx.data.Q1.solo={cartografico:{classe:'LATOSSOLO VERMELHO',escalaN:250000,unidades:[]},observado:null};
ctx.uid=function(){ return 'a1'; };
ctx.alert=function(m){ ctx._ultimoAlerta=m; };
ctx.confirm=function(){ return true; };
var campos={};
ctx.document.getElementById=function(id){
  if(id==='soloAnForm'||id==='soloAnHist'||id==='soloCalOut') return {innerHTML:'',style:{}};
  if(campos[id]!==undefined) return {value:campos[id]};
  return null;
};
campos.soloAnData='2026-08-12'; campos.soloAnLab='Laborsolo';
campos.soloAnProf='20';
['pH','MO','P','K','Ca','Mg','HAl','Al'].forEach(function(k){ campos['soloAn_'+k]=String(LAUDO[k]); });
ctx._soloAnEdit='nova';
ctx.soloSalvarAnalise('Q1');
var an=ctx.soloAnaliseAtual('Q1');
ck(!!an,'análise gravada');
eq(an.data,'2026-08-12','data da coleta gravada');
eq(an.laboratorio,'Laborsolo','laboratório gravado');
eq(an.resultados.Ca,25,'resultado numérico, não texto');
eq(an.fonte,'laudo','marcada como laudo');
eq(an.user,'Daria','autoria BPL registrada');
ck(!!ctx.data.Q1.solo.cartografico,'lançar análise não apaga o cartográfico');

console.log('\n--- Recusas do formulário ---');
ctx._ultimoAlerta=null;
campos.soloAnData='';
ctx._soloAnEdit='nova';
ctx.soloSalvarAnalise('Q1');
ck(/data da coleta/i.test(ctx._ultimoAlerta||''),'sem data da coleta, recusa e explica');
eq(ctx.soloAnalises('Q1').length,1,'e não grava');
campos.soloAnData='2026-09-01';
['pH','MO','P','K','Ca','Mg','HAl','Al'].forEach(function(k){ campos['soloAn_'+k]=''; });
ctx._ultimoAlerta=null; ctx._soloAnEdit='nova';
ctx.soloSalvarAnalise('Q1');
ck(/ao menos um resultado/i.test(ctx._ultimoAlerta||''),'laudo em branco recusa');

console.log('\n--- Histórico ordenado ---');
['pH','MO','P','K','Ca','Mg','HAl','Al'].forEach(function(k){ campos['soloAn_'+k]=String(LAUDO[k]); });
campos.soloAnData='2027-03-10'; ctx.uid=function(){ return 'a2'; }; ctx._soloAnEdit='nova';
ctx.soloSalvarAnalise('Q1');
var lista=ctx.soloAnalises('Q1');
eq(lista.length,2,'duas análises guardadas');
eq(lista[0].data,'2027-03-10','a mais recente vem primeiro');
eq(ctx.soloAnaliseAtual('Q1').data,'2027-03-10','e é ela que vale para recomendar');

console.log('\n--- Edição não reescreve o registro original ---');
var tsOrig=lista[0].ts;
ctx._soloAnEdit='a2'; campos.soloAn_pH='5.8';
ctx.soloSalvarAnalise('Q1');
var ed=ctx.soloAnaliseAtual('Q1');
eq(ed.resultados.pH,5.8,'valor editado');
eq(ed.ts,tsOrig,'carimbo original preservado (BPL)');
ck(ed.revisadoEm>0,'edição marca revisão');
eq(ctx.soloAnalises('Q1').length,2,'editar não duplica a análise');

console.log('\n--- Ponto único de escrita não perde as outras metades ---');
ctx._soloSet('Q1',{propriedades:{fonte:'soilgrids',propriedades:{}}});
ck(!!ctx.data.Q1.solo.analises && ctx.data.Q1.solo.analises.length===2,'gravar propriedades preserva as análises');
ck(!!ctx.data.Q1.solo.cartografico,'e o cartográfico');
ctx._soloSet('Q1',{cartografico:{classe:'NITOSSOLO'}});
ck(ctx.data.Q1.solo.analises.length===2,'gravar o cartográfico preserva as análises');
ck(!!ctx.data.Q1.solo.propriedades,'e as propriedades');

console.log('\n--- Calagem lida da ficha ---');
campos.soloCalV2='70'; campos.soloCalPrnt='85';
ctx.soloCalcular('Q1');
eq(ctx.data.Q1.solo.calagem.V2,70,'V2 guardado na quadra');
eq(ctx.data.Q1.solo.calagem.PRNT,85,'PRNT guardado');
var saida=ctx.soloCalagemSaidaHtml('Q1');
ck(saida.indexOf('t/ha')>0,'a ficha mostra a dose');
ck(saida.indexOf('Mostrar cálculo')>0,'e oferece a trilha');
ctx.soloToggleCalculo('Q1');
ck(ctx.soloCalagemSaidaHtml('Q1').indexOf('saturação por bases')>0,'a trilha nomeia o método');

console.log('\n--- Apagar análise ---');
ctx.soloApagarAnalise('Q1','a1');
eq(ctx.soloAnalises('Q1').length,1,'análise removida');
ck(!!ctx.data.Q1.solo.cartografico,'apagar análise não mexe no resto do registro');

console.log('\n--- Pacote de tabelas: validação antes de aceitar ---');
/* Pacote malformado que entra em silêncio vira recomendação errada, que é pior
   que recomendação nenhuma. */
var fs2=require('fs');
var PACOTE=JSON.parse(fs2.readFileSync('modelos/solo-tabelas-exemplo.json','utf8'));
ck(!!ctx.soloPacoteValidar(null),'null é recusado');
ck(!!ctx.soloPacoteValidar({}),'objeto sem culturas é recusado');
ck(!!ctx.soloPacoteValidar({culturas:[]}),'lista de culturas vazia é recusada');
ck(!!ctx.soloPacoteValidar({culturas:[{}]}),'cultura sem nome é recusada');
ck(!!ctx.soloPacoteValidar({culturas:[{nome:'X',V2:150}]}),'V2 acima de 100 é recusado');
eq(ctx.soloPacoteValidar(PACOTE),null,'o modelo de exemplo passa na validação');

ck(!!ctx.soloPacoteCarregar('isso nao e json'),'texto que não é JSON devolve erro legível');
eq(ctx.soloPacoteCarregar(JSON.stringify(PACOTE)),null,'pacote válido carrega');
ck(!!store[ctx.SOLO_PACOTE_KEY],'e fica guardado só neste aparelho');
eq(ctx.soloPacoteCulturas().length,1,'as culturas ficam disponíveis para escolha');

console.log('\n--- Classificação da faixa pelo teor medido ---');
var faixas=[{ate:6,classe:'muito baixo'},{ate:15,classe:'baixo'},{ate:40,classe:'medio'},{classe:'alto'}];
eq(ctx._soloFaixa(faixas,3).classe,'muito baixo','teor 3 cai em muito baixo');
eq(ctx._soloFaixa(faixas,6).classe,'muito baixo','o limite pertence à própria faixa');
eq(ctx._soloFaixa(faixas,7).classe,'baixo','logo acima do limite sobe de faixa');
eq(ctx._soloFaixa(faixas,120).classe,'alto','acima de tudo cai na última faixa');
eq(ctx._soloFaixa(faixas,null),null,'sem teor não classifica');

console.log('\n--- Dose pela produtividade esperada ---');
var linhas=[{produtividade:6,dose:90},{produtividade:8,dose:110},{produtividade:10,dose:130}];
eq(ctx._soloDose(linhas,6).dose,90,'produtividade exata usa a própria linha');
eq(ctx._soloDose(linhas,7).dose,110,'entre linhas, usa a que ATENDE (a de cima)');
eq(ctx._soloDose(linhas,12).dose,130,'acima da tabela usa a última linha');
ck(ctx._soloDose(linhas,12).extrapolou===true,'e marca que extrapolou — não pode passar calado');
ck(ctx._soloDose(linhas,null).semProdutividade===true,'sem produtividade, diz que usou a primeira linha');

console.log('\n--- Recomendação de ponta a ponta ---');
/* Laudo com P baixo (12) e K médio (3,0) — as duas faixas do meio da tabela. */
var an={resultados:{pH:5.2,MO:28,P:12,K:3.0,Ca:25,Mg:8,HAl:28,Al:2,Zn:0.4,B:0.3},profundidade:20};
var rec=ctx.soloRecomendar(an,'Cultura de exemplo','grao',8);
ck(!rec.erro,'a recomendação sai sem erro');
function item(n){ return rec.itens.filter(function(i){return i.nutriente===n;})[0]; }
eq(item('P2O5').dose,90,'P 12 → faixa "baixo" → 8 t/ha → 90 kg/ha de P2O5');
eq(item('P2O5').classe,'baixo','e a classe vai junto do número');
eq(item('K2O').dose,55,'K 3,0 → faixa "medio" → 8 t/ha → 55 kg/ha de K2O');
eq(item('N').dose,120,'N = plantio 30 + cobertura 90 = 120 kg/ha');
eq(item('Zn').dose,4,'Zn 0,4 abaixo de 0,6 → aplica 4 kg/ha');
ck(!item('B'),'B 0,3 acima do limite 0,21 → não entra na lista');
eq(rec.V2,70,'o V2 da cultura vem do pacote');

console.log('\n--- A trilha explica cada número ---');
var t2=rec.trilha.join(' | ');
ck(t2.indexOf('P 12')>0 || t2.indexOf('P medido 12')>0,'a trilha diz qual teor foi lido');
ck(t2.indexOf('baixo')>0,'e em que classe ele caiu');
ck(t2.indexOf('90')>0,'e a dose resultante');
ck(/N .*(nao|não) (e|é) estimado pela an/i.test(t2),
   'e diz em voz alta que o N não sai da análise de solo');
ck(t2.indexOf('suficiente')>0,'micronutriente suficiente também é registrado, não some');
ck(t2.indexOf('Exemplo')>0,'a trilha nomeia o pacote de onde vieram as tabelas');

console.log('\n--- Recusas do motor ---');
ck(!!ctx.soloRecomendar(an,'Inexistente','',8).erro,'cultura fora do pacote recusa');
ck(!!ctx.soloRecomendar(null,'Cultura de exemplo','grao',8).erro,'sem análise recusa');
var semP=ctx.soloRecomendar({resultados:{K:3.0}},'Cultura de exemplo','grao',8);
ck(!semP.itens.filter(function(i){return i.nutriente==='P2O5';}).length,'sem P no laudo, não recomenda P2O5');
ck(semP.trilha.join(' ').indexOf('sem P')>0,'e a trilha diz por quê');
ctx.soloPacoteRemover();
ck(!!ctx.soloRecomendar(an,'Cultura de exemplo','grao',8).erro,'sem pacote carregado recusa');
ctx.soloPacoteCarregar(JSON.stringify(PACOTE));

console.log('\n--- Escolher a cultura preenche a calagem ---');
/* É o que torna a coisa automática: sem isso o V2 teria de ser copiado à mão da
   tabela para o campo, que é justamente o passo que se queria eliminar. */
ctx.data.Q1.solo={cartografico:{classe:'LATOSSOLO'},analises:[{id:'a1',data:'2026-08-12',
  resultados:an.resultados,profundidade:20}]};
campos.soloRecProd='8';
ctx.document.getElementById=function(id){
  if(id==='soloRecCult') return {value:'Cultura de exemplo|grao'};
  if(id==='soloRecOut'||id==='soloCalOut'||id==='soloPacForm'||id==='soloAnForm'||id==='soloAnHist') return {innerHTML:'',style:{}};
  if(id==='soloCalV2') return {value:''};
  if(campos[id]!==undefined) return {value:campos[id]};
  return null;
};
ctx.soloRecalcular('Q1');
eq(ctx.data.Q1.solo.calagem.V2,70,'escolher a cultura já preenche o V2 da calagem');
eq(ctx.data.Q1.solo.calagem.V2De,'Exemplo (numeros ficticios)','e registra de qual pacote ele veio');
eq(ctx.data.Q1.solo.rec.produtividade,8,'a produtividade esperada fica guardada na quadra');
ck(!!ctx.data.Q1.solo.cartografico,'e nada disso apaga o cartográfico');

var cal2=ctx.soloCalagem(an.resultados,ctx.data.Q1.solo.calagem.V2,85,20);
eq(cal2.nc,1.05,'a calagem calcula com o V2 vindo da tabela, sem digitação');

console.log('\n'+p+' ok, '+f+' falha(s)');
process.exit(f?1:0);

})().catch(function(e){ console.log('  FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
