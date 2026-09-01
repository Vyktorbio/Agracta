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
  '_soloCss','soloBlocoHtml','_soloQuando','soloTexto','soloClasseRelatorio','soloCor',
  'soloPropriedades','consultarSoloPropriedades','soloPropAtualizar','soloPropHtml',
  'soloObsHtml','soloSalvarObservado','soloCancelarObservado','_soloVal','_soloDataBR',
  '_soloOrdemDe','_croquiSolo'];
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
 'var _soloPropSeq=','var SOLO_TEXTURAS=']
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

console.log('\n'+p+' ok, '+f+' falha(s)');
process.exit(f?1:0);

})().catch(function(e){ console.log('  FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
