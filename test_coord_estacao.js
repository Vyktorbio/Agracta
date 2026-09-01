/* Coordenada de estação meteorológica: de onde o Agracta tira a posição dela.
 *
 * O INCIDENTE QUE ORIGINOU ISTO
 * A coordenada de uma estação Ecowitt é digitada por quem instala e costuma ficar
 * no padrão de fábrica. Em agosto/2026, das quatro estações cadastradas, a de
 * Anápolis apontava para Cleveland (EUA), 7.259 km fora, e a de Iracemápolis para
 * a capital paulista, 138 km fora.
 *
 * COMO ERA, E POR QUE MUDOU
 * A primeira solução foi julgar a coordenada da Ecowitt: usar quando o erro fosse
 * tolerável (_coordPlausivel) e avisar quando fosse grande (_coordSuspeita). O
 * problema é que o aviso não tinha como sumir — a pessoa em campo não administra
 * a conta Ecowitt —, e virava um alerta permanente para quem não podia resolver.
 *
 * O desenho atual inverte a pergunta: o Agracta usa a coordenada DO PRÓPRIO MAPA
 * sempre que existe um Local com nome correspondente, e a coordenada da Ecowitt
 * passa a ser apenas a última reserva, aceita só se estiver no Brasil. Assim uma
 * estação no padrão de fábrica não desloca nada e não gera alerta nenhum — ela
 * simplesmente não é consultada para isso. (Ver o comentário em _climaStationCoord.)
 *
 * A LEITURA do tempo nunca dependeu disso: ela vem pelo MAC do aparelho.
 *
 * Este teste guarda o desenho atual, com os mesmos dois casos reais do incidente.
 *
 * Rodar: node test_coord_estacao.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

/* Falha alto quando a função não existe mais. A versão anterior deste arquivo
   seguia em frente com lixo e o teste morria lá adiante, com um erro que não
   dizia o que tinha sumido. */
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei a função '+n+' em app.js');
  var j=i,d=0,v=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;v=true;}
    else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}

var ctx={Math:Math,Number:Number,String:String,isFinite:isFinite,console:console,JSON:JSON,
         Object:Object,localAtivo:null,curV:null,_map:null,LOCAIS:null,_climaStations:null,
         quadrasDoLocal:function(){return [];},quadraCenter:function(){return null;}};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('_climaNorm'), pega('_climaNameTokens'), pega('_climaNamesMatch'),
  pega('_coordNoBrasil'), pega('_kmEntre'),
  pega('_climaCoordDoLocal'), pega('_climaLocalCoord'), pega('_climaMapCoord'),
  pega('_climaStationCoord'), pega('_climaStationForCoord'),
  'var CLIMA_STATION_RADIUS_KM=10;'
].join('\n'), ctx);

var f=0,p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ var ok=JSON.stringify(a)===JSON.stringify(b);
  ck(ok, n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

console.log('O mapa do Agracta manda na posição da estação');
vm.runInContext("LOCAIS={ira:{nome:'Iracemapolis',centro:[-22.658,-47.521]}}; localAtivo='ira';", ctx);
eq(ctx._climaStationCoord({name:'Estação_Iracemapolis', lat:-23.5304, lng:-46.6536}),
   [-22.658,-47.521],
   'estação com Local correspondente usa a coordenada do MAPA, não a da Ecowitt');
eq(ctx._climaStationCoord({name:'Estação_Iracemapolis', lat:41.5135, lng:-81.6908}),
   [-22.658,-47.521],
   'e isso vale mesmo quando a Ecowitt aponta para Cleveland');

console.log('\nSem Local correspondente, a Ecowitt é reserva — e só dentro do Brasil');
eq(ctx._climaStationCoord({name:'Estação Inaciolândia', lat:-18.53, lng:-49.94}),
   [-18.53,-49.94],
   'coordenada de fábrica plausível é aceita como reserva');
eq(ctx._climaStationCoord({name:'Estação Anapolis', lat:41.5135, lng:-81.6908}), null,
   'Cleveland é recusada: fora do Brasil não vira reserva');
eq(ctx._climaStationCoord({name:'Estação Anapolis', lat:null, lng:null}), null,
   'sem coordenada nenhuma devolve null, em vez de inventar uma');
eq(ctx._climaStationCoord(null), null, 'estação nula não quebra');

console.log('\nO limite do Brasil');
ck(ctx._coordNoBrasil(-22.58,-47.52)===true,  'Iracemápolis real passa');
ck(ctx._coordNoBrasil(-16.32,-48.95)===true,  'Anápolis real passa');
ck(ctx._coordNoBrasil(41.5135,-81.6908)===false,'Cleveland é rejeitada');
ck(ctx._coordNoBrasil(null,null)===false,     'nulo é rejeitado');
ck(ctx._coordNoBrasil('abc',-47)===false,     'lixo é rejeitado');

console.log('\nCasamento de nome ignora palavra genérica');
ck(ctx._climaNamesMatch('Estação_Iracemapolis','Iracemápolis')===true,
   'acento e prefixo "Estação" não atrapalham');
ck(ctx._climaNamesMatch('Estação Inaciolândia','Iracemapolis')===false,
   'lugares diferentes não casam');
ck(ctx._climaNamesMatch('Estação Experimental','Fazenda Experimental')===false,
   '"experimental" sozinho não casa: seria token genérico demais');

console.log('\nA estação só é adotada dentro do raio');
vm.runInContext("_climaStations=[{name:'Estação_Iracemapolis',mac:'AA',lat:-22.658,lng:-47.521}];", ctx);
ck(ctx._climaStationForCoord([-22.66,-47.53])!==null, 'a poucos km, a estação é usada');
ck(ctx._climaStationForCoord([-16.32,-48.95])===null,
   'a centenas de km, não — e aí o clima vem da previsão pela coordenada do mapa');

console.log('\nDistância confere (os dois casos reais do incidente)');
ck(Math.abs(ctx._kmEntre(-22.5806,-47.5228,-23.5304,-46.6536)-138)<3,'Iracemápolis->capital ~138 km');
ck(Math.abs(ctx._kmEntre(-16.3267,-48.9528,41.5135,-81.6908)-7259)<20,'Anápolis->Cleveland ~7259 km');

console.log('\nO sol não usa mais a coordenada da Ecowitt');
ck(/function _climaSunLL\(\)\{\s*return _climaMapCoord\(\);\s*\}/.test(src),
   '_climaSunLL segue o centro do mapa — a coordenada de fábrica não desloca o nascer do sol');

console.log('\n'+(f?f+' FALHA(S)':p+' verificações, nenhuma falha.'));
process.exit(f?1:0);
