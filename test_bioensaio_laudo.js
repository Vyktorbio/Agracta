/* O BIOENSAIO NO LAUDO E O TL50 NO PAINEL.
 *
 * "Levar o painel do bioensaio para o laudo exportado. Hoje ele aparece só na
 *  tela do estudo." e "TL50 no painel. O motor já calcula; aparece no cartão de
 *  estatística."
 *
 * Roda o app.js de verdade (mesmo aparelho do test_bioensaio_app.js) e segura:
 *  1. o painel da Potter mostra TL50/TL90 da curva de Kaplan-Meier do motor, com
 *     o log-rank, e diz "calculando" enquanto o motor não respondeu;
 *  2. o laudo sai das MESMAS contas do painel: protocolo, mortalidade e Abbott
 *     (leitura inválida marcada), validade da testemunha, TL50, CL50 com IC,
 *     avisos e referências em ABNT;
 *  3. os números do motor vêm do que foi preservado no fechamento: o que falta
 *     sai dito com o motivo (não calculado, fechamento antigo, sem análise);
 *  4. as figuras são SVG autônomo (namespace, tamanho, fundo branco) e sem
 *     <title> — sem o nome do produto escondido numa dica de mouse;
 *  5. a placa leva a leitura final, todas as leituras, CE50 com a classe de
 *     Edgington e os dois gráficos;
 *  6. estudo que não é bioensaio não ganha seção nenhuma.
 *
 * Rodar: node test_bioensaio_laudo.js
 */
var fs=require('fs'), vm=require('vm'), path=require('path');
var AG=__dirname+path.sep;
var db={ doc:function(){ return {collection:function(){ return {get:function(){return Promise.resolve({forEach:function(){}});},doc:function(){return {};}}; },get:function(){return Promise.resolve({exists:false,data:function(){return {};}});},onSnapshot:function(){return function(){};}}; }, settings:function(){}, batch:function(){ return {set:function(){},delete:function(){},update:function(){},commit:function(){return Promise.resolve();}}; } };
function FieldPath(){}
function elStub(){ return new Proxy(function(){}, { get:function(t,k){ if(k==='style')return {}; if(k==='classList')return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}}; if(k==='value'||k==='textContent'||k==='innerHTML')return ''; if(k==='children'||k==='childNodes')return []; return elStub(); }, set:function(){return true;}, apply:function(){return elStub();} }); }
function aparelho(estado){
  var store={};
  var c={console:{log:function(){},warn:function(){},error:function(){}},Promise:Promise,setTimeout:function(){ return 0; },clearTimeout:function(){},setInterval:function(){},clearInterval:function(){},
    Date:Date,JSON:JSON,Object:Object,Array:Array,String:String,Number:Number,Math:Math,RegExp:RegExp,Error:Error,isNaN:isNaN,isFinite:isFinite,parseInt:parseInt,parseFloat:parseFloat,Map:Map,Set:Set,Symbol:Symbol,
    encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,alert:function(){},confirm:function(){return true;},prompt:function(){return '';}};
  c.window=c; c.globalThis=c; c.self=c;
  c.btoa=function(s){return Buffer.from(s,'binary').toString('base64');}; c.atob=function(s){return Buffer.from(s,'base64').toString('binary');};
  c.localStorage={getItem:function(k){return store[k]==null?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
  c.sessionStorage={getItem:function(){return null;},setItem:function(){}};
  c.location={reload:function(){},href:'',search:'',hash:'',origin:'http://x',hostname:'x'};
  c.navigator={onLine:true,userAgent:'node',serviceWorker:{register:function(){return Promise.resolve();},addEventListener:function(){}}};
  c.document=new Proxy({},{get:function(t,k){ if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS')return function(){return elStub();}; if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName')return function(){return [];}; if(k==='addEventListener'||k==='removeEventListener')return function(){}; if(k==='visibilityState')return 'visible'; if(k==='cookie')return ''; return elStub(); }});
  c.addEventListener=function(){}; c.removeEventListener=function(){}; c.requestAnimationFrame=function(){}; c.dispatchEvent=function(){}; c.CustomEvent=function(n,o){this.detail=o&&o.detail;};
  c.matchMedia=function(){return {matches:false,addListener:function(){},addEventListener:function(){}};};
  c.fetch=function(){return Promise.resolve({ok:true,json:function(){return Promise.resolve({});}});};
  c.firebase={apps:[1],app:function(){return {};},initializeApp:function(){return {};},
    auth:function(){ return {setPersistence:function(){},onAuthStateChanged:function(cb){ cb({uid:'u',email:'u@x.com',emailVerified:true}); },signOut:function(){return Promise.resolve();}}; },
    firestore:function(){return db;}};
  c.firebase.auth.Auth={Persistence:{LOCAL:1,NONE:0}};
  c.firebase.firestore.FieldValue={serverTimestamp:function(){return 'ts';},delete:function(){return {__del:1};}};
  c.firebase.firestore.FieldPath=FieldPath;
  c.AGRACTA_FIREBASE_CONFIG={apiKey:'x',authDomain:'d',projectId:'p',appId:'a'};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(AG+'vendor/bioensaio-core.js','utf8'),c,{filename:'bioensaio-core.js'});
  vm.runInContext(fs.readFileSync(AG+'app.js','utf8'),c,{filename:'app.js'});
  vm.runInContext(fs.readFileSync(AG+'firebase-sync.js','utf8'),c,{filename:'firebase-sync.js'});
  vm.runInContext('data='+JSON.stringify(estado)+';',c);
  vm.runInContext("LOCAIS={L1:{nome:'Lab'}}; QLOCAL={QE:'L1',QF:'L1'}; _stxToast=function(){}; renderAvGrid=function(){};",c);
  return c;
}
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
function run(c,js){ return vm.runInContext(js,c); }

function razao(n,N){ return {n:String(n),N:String(N)}; }
var potter={id:'SP',codigo:'POT-01',tipoEstudo:'Mortalidade',metodoAplicacao:'lab',numRepeticoes:4,doseModo:'ppm',avalInicio:'2026-09-01',
  arena:{forma:'circular',diametroCm:3,organismosPorUnidade:10,organismo:'ácaro-predador'},
  bioensaio:{potter:{categoria:'inimigo',volumeMl:2,pressaoKpa:68.9,depositoAlvo:1.8,depositoTolPct:10,pesoAntesG:10,pesoDepoisG:10.0127,superficieCm:3}},
  tratamentos:[{id:'T1',produto:'Água',dose:'0',testemunha:true},{id:'T2',produto:'Abamectina',dose:'1'},{id:'T3',produto:'Abamectina',dose:'10'},{id:'T4',produto:'Abamectina',dose:'100'}],
  avaliacoes:[]};
function leituraPotter(id,hat,mortos){
  var b={}, notas={};
  ['T1','T2','T3','T4'].forEach(function(t,i){ mortos[i].forEach(function(m,r){ var k=t+'R'+(r+1); b[k]={Mortalidade:razao(m,10)}; notas[k]={Mortalidade:String(m*10)}; }); });
  return {id:id,data:'2026-09-0'+(1+Math.floor(hat/24)),momento:{valor:hat,unidade:'HAT'},variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{Mortalidade:{N:10,sentido:'maior'}},notas:notas,bruto:b};
}
var placa={id:'SF',codigo:'MIC-01',tipoEstudo:'Fungo in vitro',metodoAplicacao:'lab',numRepeticoes:3,doseModo:'ppm',avalInicio:'2026-09-01',
  bioensaio:{placa:{placaMm:90,discoMm:5}},
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},{id:'T2',produto:'Carbendazim',dose:'0,1'},{id:'T3',produto:'Carbendazim',dose:'1'},
               {id:'T4',produto:'Carbendazim',dose:'10'},{id:'T5',produto:'Carbendazim',dose:'100'}],avaliacoes:[]};
function leituraPlaca(id,dia,cruzes){
  var b={}, notas={};
  ['T1','T2','T3','T4','T5'].forEach(function(t,i){ cruzes[i].forEach(function(cz,r){ var k=t+'R'+(r+1); b[k]={'Diâmetro da colônia (mm)':{sub:cz.map(String)}};
    notas[k]={'Diâmetro da colônia (mm)':String((cz[0]+cz[1])/2)}; }); });
  return {id:id,data:'2026-09-0'+(1+dia),momento:{valor:dia,unidade:'DAT'},variaveis:['Diâmetro da colônia (mm)'],tipos:{'Diâmetro da colônia (mm)':'numero'},
    varcfg:{'Diâmetro da colônia (mm)':{sub:2,sentido:'menor'}},notas:notas,bruto:b};
}

var P=aparelho({QE:{tipo:'lab',labTipo:'Entomologia',estudos:[JSON.parse(JSON.stringify(potter))]}});
run(P,"curV='QE'; curSid='SP';");
run(P,"data.QE.estudos[0].avaliacoes=["+JSON.stringify(leituraPotter('a24',24,[[0,1,0,1],[1,2,1,2],[6,7,6,7],[10,10,10,9]]))+","+
                                        JSON.stringify(leituraPotter('a72',72,[[3,2,3,2],[3,4,3,4],[8,9,8,9],[10,10,10,10]]))+"];");
var KM={ok:true,tipo_analise:'Mortalidade / sobrevivência no tempo',kaplan_meier:{curvas:[
  {tratamento:'T1',LT50:null,LT90:null,n:40,mortes:10},{tratamento:'T2',LT50:null,LT90:null,n:40,mortes:14},
  {tratamento:'T3',LT50:30.2,LT90:null,n:40,mortes:34},{tratamento:'T4',LT50:18.5,LT90:40.2,n:40,mortes:40}],
  logrank:{qui2:85.31,gl:3,p:1e-6,significativo:true}}};
var CL24={ok:true,analise:{link:'probit',intercepto:-1.2,slope:1.8,slope_se:0.2,p_qui_quadrado:0.4,
  resposta_natural:{metodo:'estimada',C:0.05,C_ep:0.02},doses_letais:[{p:0.5,dose:4.6,ic_inf:3.1,ic_sup:6.9,g:0.05},{p:0.9,dose:23,ic_inf:14,ic_sup:48,g:0.05}],
  tabela_doses:[{dose:1,prop_obs:0.15},{dose:10,prop_obs:0.65},{dose:100,prop_obs:0.98}]}};

console.log('\n[1] TL50 no painel da Potter');
var man=JSON.parse(run(P,"JSON.stringify(_bioestatManifesto('QE',data.QE.estudos[0]).map(function(j){ return j.jobKey; }))"));
ck(man.indexOf('__tempo__|Mortalidade')>=0 && man.indexOf('a24|Mortalidade')>=0 && man.indexOf('a72|Mortalidade')>=0,
   'o estudo tem o job de sobrevivência no tempo e um por leitura (as chaves que o painel e o laudo leem)');
run(P,"_bioAutoCache['QE|SP']={sig:'x',results:{'a24|Mortalidade':"+JSON.stringify(CL24)+"}};");
var html=run(P,"bioensaioPainelHtml('QE','SP',data.QE.estudos[0])");
ck(/TL50: calculando no motor estatístico/.test(html),'motor ainda sem a curva de sobrevivência: diz que está calculando');
run(P,"_bioAutoCache['QE|SP'].results['__tempo__|Mortalidade']="+JSON.stringify(KM)+";");
html=run(P,"bioensaioPainelHtml('QE','SP',data.QE.estudos[0])");
ck(/TL50 e TL90/.test(html) && /18,5 h/.test(html) && /40,2 h/.test(html),'T4: TL50 18,5 h e TL90 40,2 h (leituras em HAT → horas)');
ck(/não chegou/.test(html),'testemunha não chega a 50% no período: "não chegou", e não um número inventado');
ck(/Log-rank χ²\(3\) = 85,31, p &lt; 0,001|Log-rank χ²\(3\) = 85,31, p < 0,001/.test(html) && /as curvas diferem/.test(html),'log-rank compara as curvas inteiras (Mantel, 1966)');
ck(/KAPLAN, E\. L\.; MEIER, P\./.test(html) && /MANTEL, N\./.test(html),'Kaplan & Meier (1958) e Mantel (1966) nas referências');
ck(/40\/40/.test(html),'mortos/N de cada curva');

console.log('\n[2] o laudo da Potter sai das mesmas contas');
var snap={versao:1,jobs:man.map(function(k){ return {jobKey:k}; }),results:{'a24|Mortalidade':CL24,'__tempo__|Mortalidade':KM}};
var L=JSON.parse(run(P,"JSON.stringify(bioensaioRelatorio('QE',data.QE.estudos[0],"+JSON.stringify(snap)+",true))"));
var tit=L.secoes.map(function(x){ return x.title; });
ck(L.metodo==='potter' && tit.join('|')==='Torre de Potter · protocolo|Torre de Potter · mortalidade e eficácia|Torre de Potter · validade da testemunha|Torre de Potter · TL50 e TL90|Torre de Potter · CL50 e CL90|Torre de Potter · avisos|Torre de Potter · referências',
   'seções: protocolo, mortalidade e eficácia, validade, TL50, CL50, avisos e referências');
function sec(t){ return L.secoes.filter(function(x){ return x.title==='Torre de Potter · '+t; })[0]; }
function linha(t,c){ return sec(t).rows.filter(function(r){ return r[0]===c; })[0]||[]; }
ck(/1,8 mg\/cm² · alvo 1,8 mg\/cm² ± 10% · dentro/.test(linha('protocolo','Depósito')[1]),'protocolo: depósito pesado, com o alvo e a tolerância');
ck(linha('protocolo','Categoria')[1]==='Inimigo natural (classes IOBC)' && linha('protocolo','Indivíduos por arena')[1]==='10','categoria e indivíduos por arena');
var me=sec('mortalidade e eficácia');
ck(me.headers.join('|')==='Leitura|Tratamento|Dose|Mortos / avaliados|Arenas|Mortalidade (%)|Eficácia Abbott (%)|Classe IOBC' && me.rows.length===8,'mortalidade e Abbott por leitura e tratamento (2 × 4), com a classe IOBC do inimigo natural');
var t1=me.rows[0], t4=me.rows[3], t4f=me.rows[7];
ck(t1[1]==='T1 (testemunha)' && t1[3]==='2 / 40' && t1[5]==='5' && t1[6]==='—','testemunha: 2/40 = 5%, sem eficácia de si mesma');
ck(t4[3]==='39 / 40' && t4[5]==='97,5' && t4[6]==='97,4','T4 em 24 HAT: 39/40 = 97,5% → Abbott 97,4%');
ck(/\(leitura inválida\)/.test(t4f[6]),'72 HAT (testemunha 25%): eficácia marcada como leitura inválida');
var va=sec('validade da testemunha');
ck(va.rows[0][1]==='5' && /dentro do esperado/.test(va.rows[0][2]) && va.rows[1][1]==='25' && /repita o teste/.test(va.rows[1][2]),'validade: 24 HAT dentro; 72 HAT acima do limite, repetir (WHO, 2016)');
var tl=sec('TL50 e TL90');
ck(tl.rows.length===4 && tl.rows[3][1]==='18,5 h' && tl.rows[0][1]==='Não atingiu' && /Log-rank \(Mantel, 1966\): χ²\(3\) = 85,31, p < 0,001/.test(tl.text),'TL50/TL90 com o log-rank');
var cl=sec('CL50 e CL90');
ck(cl.rows[0][1]==='4,6 (3,1–6,9)' && cl.rows[0][2]==='23 (14–48)' && /C = 5%/.test(cl.rows[0][4]),'CL50 e CL90 de 24 HAT com IC 95% e resposta natural');
ck(/não estava calculado no fechamento do estudo/.test(cl.rows[1][1]),'72 HAT sem curva no fechamento: dito, com o motivo');
var refs=sec('referências').rows.map(function(r){ return r[0]; }).join('\n');
ck(/ABBOTT, W\. S\./.test(refs) && /KAPLAN, E\. L\./.test(refs) && /MANTEL, N\./.test(refs) && /ROBERTSON, J\. L\./.test(refs) && /STERK, G\./.test(refs),'referências em ABNT: Abbott, Kaplan-Meier, Mantel, Robertson, Sterk');
ck(sec('avisos').rows.some(function(r){ return /72 HAT/.test(r[0]); }),'avisos do resumo vão para o laudo');

console.log('\n[3] figuras');
ck(L.figuras.length===2,'duas figuras: mortalidade no tempo e curva de dose-resposta');
var f0=L.figuras[0].svg, f1=L.figuras[1].svg;
ck(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="520" height="\d+"/.test(f0) && /<rect width="520" height="\d+" fill="#ffffff"\/>/.test(f0),'SVG autônomo: namespace, tamanho fixo e fundo branco');
ck(L.figuras[0].largura===520 && L.figuras[0].altura>220,'largura e altura para desenhar a imagem (a legenda vai dentro do desenho)');
ck(!/<title>/.test(f0+f1) && !/Abamectina/.test(f0+f1),'sem <title> — nada de nome de produto escondido numa dica de mouse');
ck(/T1 \(testemunha\)/.test(f0) && /T4/.test(f0),'a legenda dos tratamentos vai dentro do desenho');
ck(/CL50 4,6/.test(f1) && /24 HAT/.test(L.figuras[1].legenda),'curva de dose com a CL50 marcada e a leitura na legenda');

console.log('\n[4] o que falta sai dito, com o motivo');
var L2=JSON.parse(run(P,"JSON.stringify(bioensaioRelatorio('QE',data.QE.estudos[0],{jobs:"+JSON.stringify(snap.jobs)+",results:{}},false))"));
var tl2=L2.secoes.filter(function(x){ return /TL50/.test(x.title); })[0];
ck(tl2 && /ainda calculava quando o laudo foi gerado/.test(tl2.text),'estudo aberto: o motor ainda calculava');
ck(L2.figuras.length===1,'sem curva calculada, só o gráfico no tempo');
var L3=JSON.parse(run(P,"JSON.stringify(bioensaioRelatorio('QE',data.QE.estudos[0],null,true))"));
ck(/fechamento deste estudo não preservou as análises do motor/.test(L3.secoes.filter(function(x){ return /TL50|CL50/.test(x.title); }).map(function(x){ return x.text+JSON.stringify(x.rows); }).join()),'fechamento antigo, sem análises preservadas: dito');
var L4=JSON.parse(run(P,"JSON.stringify(bioensaioRelatorio('QE',data.QE.estudos[0],{jobs:[{jobKey:'__tempo__|Mortalidade'}],results:{}},true))"));
ck(/leitura sem análise automática/.test(JSON.stringify(L4.secoes.filter(function(x){ return /CL50/.test(x.title); })[0].rows)),'leitura que o motor nem recebeu: "sem análise automática", não "pendente"');

console.log('\n[5] placa: leitura final, todas as leituras, CE50 e gráficos');
var F=aparelho({QF:{tipo:'lab',labTipo:'Fitopatologia',estudos:[JSON.parse(JSON.stringify(placa))]}});
run(F,"curV='QF'; curSid='SF';");
var c3=function(a,b){ return [[a,b],[a+1,b],[a,b+1]]; };
run(F,"data.QF.estudos[0].avaliacoes=["+
  JSON.stringify(leituraPlaca('d3',3,[c3(40,41),c3(34,35),c3(22,23),c3(9,9),c3(5,5)]))+","+
  JSON.stringify(leituraPlaca('d5',5,[c3(70,71),c3(60,61),c3(38,39),c3(12,12),c3(5,6)]))+","+
  JSON.stringify(leituraPlaca('d7',7,[c3(88,89),c3(76,77),c3(50,51),c3(15,15),c3(6,6)]))+"];");
var manF=JSON.parse(run(F,"JSON.stringify(_bioestatManifesto('QF',data.QF.estudos[0]).map(function(j){ return {jobKey:j.jobKey}; }))"));
var CE={ok:true,analise:{doses_efetivas_absolutas:[{nivel:50,dose:1.4,ic_inf:0.9,ic_sup:2.1,extrapolado:false}],curva:[{dose:0.05,ajustado:80},{dose:1,ajustado:45},{dose:200,ajustado:1}],unidade:'ppm'}};
var LP=JSON.parse(run(F,"JSON.stringify(bioensaioRelatorio('QF',data.QF.estudos[0],{jobs:"+JSON.stringify(manF)+",results:{'d7|Diâmetro da colônia (mm)':"+JSON.stringify(CE)+"}},true))"));
var titP=LP.secoes.map(function(x){ return x.title; });
ck(LP.metodo==='placa' && titP.join('|')==='Crescimento micelial em placa · protocolo|Crescimento micelial em placa · leitura final (7 DAT)|Crescimento micelial em placa · todas as leituras|Crescimento micelial em placa · CE50 (7 DAT)|Crescimento micelial em placa · referências',
   'seções da placa: protocolo, leitura final, todas as leituras, CE50 e referências');
function secP(t){ return LP.secoes.filter(function(x){ return x.title==='Crescimento micelial em placa · '+t; })[0]; }
ck(secP('protocolo').rows.some(function(r){ return r[0]==='Placa (diâmetro interno)' && r[1]==='90 mm'; }),'protocolo: placa de 90 mm');
var fin=secP('leitura final (7 DAT)');
ck(/A testemunha chegou à borda em 7 DAT/.test(fin.text) && fin.rows.length===5,'leitura final pela borda (7 DAT), um tratamento por linha');
ck(fin.rows[0][0]==='T1 (testemunha)' && fin.rows[0][6]==='—' && fin.rows[4][6]!=='—','inibição só para os tratados');
ck(secP('todas as leituras').rows.length===15,'todas as leituras: 3 × 5');
var ce=secP('CE50 (7 DAT)').rows;
ck(ce[0][1]==='1,4 ppm' && ce[1][1]==='0,9 a 2,1 ppm' && ce[2][1]==='Sim' && /moderadamente fungitóxico/.test(ce[3][1]),'CE50 1,4 ppm (IC 0,9 a 2,1), dentro das doses, moderadamente fungitóxico (Edgington et al., 1971)');
ck(LP.figuras.length===2 && /borda da placa/.test(LP.figuras[0].svg) && /CE50 1,4/.test(LP.figuras[1].svg),'dois gráficos: crescimento no tempo com a borda, e a curva com a CE50');
ck(/EDGINGTON, L\. V\./.test(JSON.stringify(secP('referências').rows)) && /VINCENT, J\. M\./.test(JSON.stringify(secP('referências').rows)),'referências: Edgington, Vincent…');

console.log('\n[6] estudo que não é bioensaio');
ck(run(P,"bioensaioRelatorio('QE',Object.assign({},data.QE.estudos[0],{tipoEstudo:'Eficácia'}),null,false)")===null,'estudo de campo comum: sem seção de bioensaio');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
