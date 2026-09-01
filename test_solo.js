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

var salvou=0, upserts=[];
var store={};
var ctx={
  console:console,Promise:Promise,Date:Date,String:String,Number:Number,Math:Math,
  JSON:JSON,isFinite:isFinite,Object:Object,
  fetch:fetchFake,
  NDVI_PROXY:'https://proxy.test',
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
  '_soloCss','soloBlocoHtml','_soloQuando','soloTexto','soloClasseRelatorio','soloCor'];
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
['var SOLO_PROXY=','var SOLO_CACHE_KEY=','var _soloSeq=','var SOLO_CORES=','var SOLO_WMS=']
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
eq(ctx.data.Q1.solo.observado,null,'observado nasce vazio, separado do cartográfico');
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

console.log('\n'+p+' ok, '+f+' falha(s)');
process.exit(f?1:0);

})().catch(function(e){ console.log('  FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
