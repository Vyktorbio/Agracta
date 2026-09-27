/* BIOENSAIOS DE BANCADA NO APP: Torre de Potter e crescimento micelial em placa.
 *
 * O usuário faz no laboratório a Torre de Potter (mortalidade, eficácia de Abbott)
 * e o crescimento micelial em placa de Petri (diâmetro em cruz). Este teste roda o
 * app.js de verdade e segura:
 *  1. o método sai do tipo do estudo — não é mais uma pergunta;
 *  2. a primeira avaliação nasce com as variáveis do protocolo e o N da arena;
 *  3. o N padrão que a célula mostra é o que vale (antes, 5/20 na tela e nada salvo);
 *  4. o painel faz sozinho: mortalidade, Abbott, validade da testemunha (WHO), IOBC,
 *     inibição (Vincent), IVCM (Oliveira), fim pela borda, CL50/CE50 com a classe de
 *     Edgington — com as referências;
 *  5. a placa numa série de concentrações vai para a curva de dose, sobre o
 *     crescimento (diâmetro − disco), e a grade continua com o dado como foi lido;
 *  6. o editor grava o protocolo escrito uma vez.
 *
 * Rodar: node test_bioensaio_app.js
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

/* ---------- Torre de Potter: ácaro predador (inimigo natural) ---------- */
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
var P=aparelho({QE:{tipo:'lab',labTipo:'Entomologia',estudos:[JSON.parse(JSON.stringify(potter))]},
                QF:{tipo:'lab',labTipo:'Fitopatologia',estudos:[]}});
run(P,"curV='QE'; curSid='SP';");

console.log('\n[1] o método sai do estudo');
ck(run(P,"bioensaioMetodo(data.QE.estudos[0],'QE')")==='potter','Mortalidade numa quadra de laboratório → Torre de Potter');
ck(run(P,"bioensaioMetodo(Object.assign({},data.QE.estudos[0],{metodoAplicacao:'granulado'}),'QE')")==='','grânulos na arena não é Potter');
ck(run(P,"bioensaioMetodo(Object.assign({},data.QE.estudos[0],{tipoEstudo:'Fungo in vitro'}),'QE')")==='placa','Fungo in vitro → placa');

console.log('\n[2] a primeira avaliação nasce com o protocolo');
var sem=JSON.parse(run(P,"JSON.stringify(bioensaioSemente(data.QE.estudos[0],'QE'))"));
ck(sem && sem.variaveis[0]==='Mortalidade' && sem.tipos.Mortalidade==='razao','Mortalidade como razão mortos/N');
ck(sem && sem.varcfg.Mortalidade.N===10 && sem.varcfg.Mortalidade.sentido==='maior','N = 10 organismos por arena, sentido "maior"');
run(P,"window.__g={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{Mortalidade:{sentido:'maior'}},notas:{},bruto:{}}; bioensaioPadraoN(data.QE.estudos[0],'QE',window.__g);");
ck(run(P,"window.__g.varcfg.Mortalidade.N")===10,'leitura herdada sem N padrão recebe o N do protocolo');
run(P,"window.__g.varcfg.Mortalidade.N=12; bioensaioPadraoN(data.QE.estudos[0],'QE',window.__g);");
ck(run(P,"window.__g.varcfg.Mortalidade.N")===12,'N já declarado na leitura não é sobrescrito');

console.log('\n[3] o N que a célula mostra é o que vale');
run(P,"_avGrid={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{Mortalidade:{N:10}},notas:{},meta:{},bruto:{}}; _avWriteBruto('T2R1','Mortalidade','n','7');");
ck(run(P,"_avGrid.bruto.T2R1.Mortalidade.N")==='10','digitar só os mortos grava o N padrão da célula');
ck(run(P,"_avGrid.notas.T2R1.Mortalidade")==='70','e a mortalidade sai: 7/10 = 70%');
run(P,"_avWriteBruto('T2R2','Mortalidade','N','8'); _avWriteBruto('T2R2','Mortalidade','n','4');");
ck(run(P,"_avGrid.bruto.T2R2.Mortalidade.N")==='8' && run(P,"_avGrid.notas.T2R2.Mortalidade")==='50','N digitado (8, uma arena com fuga) manda: 4/8 = 50%');
/* o dado bruto de uma razão é SÓ n e N: nenhuma sub-amostra inventada (a
   primeira versão da correção do N deixou o "else" da sub-amostra pendurado no
   if novo, e cada N gravado virava também um sub[0] falso) */
ck(run(P,"JSON.stringify(Object.keys(_avGrid.bruto.T2R1.Mortalidade).sort())")==='["N","n"]','razão guarda só n e N (sem sub-amostra falsa)');
ck(run(P,"JSON.stringify(Object.keys(_avGrid.bruto.T2R2.Mortalidade).sort())")==='["N","n"]','inclusive quando o N é digitado');
run(P,"_avGrid.varcfg.Altura={sub:2}; _avGrid.variaveis.push('Altura'); _avGrid.tipos.Altura='numero'; _avWriteBruto('T1R1','Altura','s1','12,5');");
ck(run(P,"JSON.stringify(_avGrid.bruto.T1R1.Altura)")==='{"sub":["","12.5"]}','sub-amostra continua indo para o eixo certo');

console.log('\n[4] o painel da Potter');
run(P,"data.QE.estudos[0].avaliacoes=["+JSON.stringify(leituraPotter('a24',24,[[0,1,0,1],[1,2,1,2],[6,7,6,7],[10,10,10,9]]))+","+
                                        JSON.stringify(leituraPotter('a72',72,[[3,2,3,2],[3,4,3,4],[8,9,8,9],[10,10,10,10]]))+"];");
var ds=JSON.parse(run(P,"JSON.stringify(bioensaioDados(data.QE.estudos[0],'QE'))"));
ck(ds.leituras.length===2 && ds.leituras[0].rotulo==='24 HAT' && ds.leituras[1].rotulo==='72 HAT','duas leituras, na ordem do tempo (24 e 72 HAT)');
ck(ds.testemunha==='T1' && ds.leituras[0].parcelas.length===16,'testemunha marcada e 16 arenas lidas da grade');
ck(ds.serie && ds.serie.niveis===3 && ds.serie.unidade==='ppm','1, 10, 100 ppm do mesmo produto: série de doses');
var html=run(P,"bioensaioPainelHtml('QE','SP',data.QE.estudos[0])");
ck(/Torre de Potter/.test(html) && /resultado automático/.test(html),'painel da Torre de Potter');
ck(/24 HAT: testemunha 5%/.test(html),'24 HAT: testemunha 2/40 = 5% ✓');
ck(/72 HAT: testemunha 25% ✗ repetir/.test(html),'72 HAT: testemunha 25% → leitura inválida (WHO, 2016)');
ck(/<s>/.test(html),'a eficácia da leitura inválida sai riscada');
ck(/IOBC/.test(html) && /moderadamente nocivo|levemente nocivo|nocivo/.test(html),'inimigo natural: classe IOBC');
ck(/Depósito 1,8 mg\/cm²/.test(html),'depósito calculado pela pesagem (12,7 mg em Ø 3 cm ≈ 1,8 mg/cm²)');
ck(/calculando no motor estatístico/.test(html),'CL50: enquanto o motor não respondeu, diz que está calculando');
ck(/ABBOTT, W\. S\./.test(html) && /WORLD HEALTH ORGANIZATION/.test(html) && /STERK, G\./.test(html),'referências em ABNT no painel');
ck(/Mortalidade × tempo/.test(html) && /<svg/.test(html),'gráfico de mortalidade no tempo');
/* o motor respondeu: CL50/CL90 da leitura de 24 HAT */
run(P,"_bioAutoCache['QE|SP']={sig:'x',results:{'a24|Mortalidade':{ok:true,analise:{link:'probit',intercepto:-1.2,slope:1.8,slope_se:0.2,p_qui_quadrado:0.4,"+
  "resposta_natural:{metodo:'estimada',C:0.05,C_ep:0.02},doses_letais:[{p:0.5,dose:4.6,ic_inf:3.1,ic_sup:6.9,g:0.05},{p:0.9,dose:23,ic_inf:14,ic_sup:48,g:0.05}],"+
  "tabela_doses:[{dose:1,prop_obs:0.15},{dose:10,prop_obs:0.65},{dose:100,prop_obs:0.98}]}}}};");
html=run(P,"bioensaioPainelHtml('QE','SP',data.QE.estudos[0])");
ck(/CL50 e CL90/.test(html) && /4,6/.test(html) && /23/.test(html),'CL50 e CL90 do motor, com IC');
ck(/C=5%/.test(html),'resposta natural estimada aparece (C=5%)');
ck(/Curva de dose-resposta/.test(html) && /CL50 4,6/.test(html),'curva de dose-resposta com a CL50 marcada');
ck(/ROBERTSON, J\. L\.; RUSSELL/.test(html),'Robertson et al. (2007) entra nas referências');

console.log('\n[5] o editor grava o protocolo escrito uma vez');
run(P,"workingStudy=JSON.parse(JSON.stringify(data.QE.estudos[0]));");
var ed=run(P,"bioensaioEditorHtml(workingStudy)");
ck(/seBio_volumeMl/.test(ed) && /seBio_categoria/.test(ed) && /seBio_limiteTestemunha/.test(ed),'campos da Potter no editor');
ck(/seBioMetodo" value="potter"/.test(ed),'método registrado no editor');
var lido=JSON.parse(run(P,"(function(){ var v={seBioMetodo:{value:'potter'},seBio_volumeMl:{value:'2,5'},seBio_categoria:{value:'praga'},seBio_moribundoMorto:{checked:false},seBio_criterio:{value:'  imóvel ao toque '},seBio_pressaoKpa:{value:''}};"+
  " return JSON.stringify(bioensaioLerEditor(function(id){ return v[id]||null; }, {placa:{placaMm:60}})); })()"));
ck(lido.potter.volumeMl===2.5 && lido.potter.categoria==='praga' && lido.potter.moribundoMorto===false && lido.potter.criterio==='imóvel ao toque','lê número com vírgula, seleção, caixa e texto');
ck(!('pressaoKpa' in lido.potter),'campo vazio não é gravado');
ck(lido.placa && lido.placa.placaMm===60,'o protocolo do outro método fica guardado');
ck(/testemunha até 20%/.test(run(P,"bioensaioResumoTexto(data.QE.estudos[0],'QE')")),'resumo do protocolo para a trilha de auditoria');

/* ---------- placa: fungicida em série de concentrações ---------- */
console.log('\n[6] crescimento micelial em placa');
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
var F=aparelho({QF:{tipo:'lab',labTipo:'Fitopatologia',estudos:[JSON.parse(JSON.stringify(placa))]}});
run(F,"curV='QF'; curSid='SF';");
var semP=JSON.parse(run(F,"JSON.stringify(bioensaioSemente(data.QF.estudos[0],'QF'))"));
ck(semP.variaveis[0]==='Diâmetro da colônia (mm)' && semP.varcfg['Diâmetro da colônia (mm)'].sub===2,'placa nasce com o diâmetro em cruz (2 eixos)');
var c3=function(a,b){ return [[a,b],[a+1,b],[a,b+1]]; };
run(F,"data.QF.estudos[0].avaliacoes=["+
  JSON.stringify(leituraPlaca('d3',3,[c3(40,41),c3(34,35),c3(22,23),c3(9,9),c3(5,5)]))+","+
  JSON.stringify(leituraPlaca('d5',5,[c3(70,71),c3(60,61),c3(38,39),c3(12,12),c3(5,6)]))+","+
  JSON.stringify(leituraPlaca('d7',7,[c3(88,89),c3(76,77),c3(50,51),c3(15,15),c3(6,6)]))+"];");
var hp=run(F,"bioensaioPainelHtml('QF','SF',data.QF.estudos[0])");
ck(/Crescimento micelial em placa/.test(hp),'painel da placa');
ck(/Fim do ensaio: 7 DAT/.test(hp),'7 DAT: testemunha ≥ 95% de 90 mm → fim do ensaio');
ck(/Inibição/.test(hp) && /IVCM/.test(hp) && /Taxa radial/.test(hp),'inibição, IVCM e taxa radial na tabela');
ck(/VINCENT, J\. M\./.test(hp) && /OLIVEIRA, J\. A\./.test(hp) && /GROVER, R\. K\./.test(hp),'referências: Vincent, Oliveira, Grover & Moore');
ck(/borda da placa/.test(hp),'gráfico do crescimento com a borda da placa');

console.log('\n[7] a placa em série vai para a curva de dose, sobre o crescimento');
var jobs=JSON.parse(run(F,"JSON.stringify(_bioestatJobs('QF',data.QF.estudos[0]).map(function(j){ return {k:j.jobKey,m:j.modelo,d:j.desconto,v:j.aoa[1][11]}; }))"));
ck(jobs.length===3 && jobs.every(function(j){ return j.m==='curva' && j.d===5; }),'4 concentrações positivas: modelo "curva", desconto do disco de 5 mm');
var aoaC=JSON.parse(run(F,"JSON.stringify(_bioestatAoaCrescimento(_bioestatJobs('QF',data.QF.estudos[0])[2].aoa,5))"));
var iv=aoaC[0].indexOf('Valor'), ivar=aoaC[0].indexOf('Variavel');
ck(aoaC[1][iv]===83.5 && aoaC[1][ivar]==='Crescimento micelial (mm)','T1R1 aos 7 DAT: Ø 88,5 − 5 = 83,5 mm de crescimento');
ck(jobs[2].v==='88.5','a grade (e a triagem forense) continuam com o diâmetro lido');
run(F,"data.QF.estudos[0].tratamentos.pop();");
var jobs3=JSON.parse(run(F,"JSON.stringify(_bioestatJobs('QF',data.QF.estudos[0]).map(function(j){ return j.modelo||''; }))"));
ck(jobs3.every(function(m){ return m===''; }),'só 3 concentrações: fica a comparação de médias');
run(F,"data.QF.estudos[0].tratamentos.push({id:'T5',produto:'Carbendazim',dose:'100'});");
/* o motor respondeu a curva da leitura final */
run(F,"_bioAutoCache['QF|SF']={sig:'x',results:{'d7|Diâmetro da colônia (mm)':{ok:true,analise:{doses_efetivas:[{nivel:50,dose:1.3}],"+
  "doses_efetivas_absolutas:[{nivel:50,dose:1.4,ic_inf:0.9,ic_sup:2.1,extrapolado:false}],curva:[{dose:0.05,ajustado:80},{dose:1,ajustado:45},{dose:200,ajustado:1}],unidade:'ppm'}}}};");
hp=run(F,"bioensaioPainelHtml('QF','SF',data.QF.estudos[0])");
ck(/CE50 = 1,4 ppm/.test(hp),'CE50 absoluta do motor: 1,4 ppm');
ck(/moderadamente fungitóxico \(Edgington et al\., 1971\)/.test(hp),'classe de Edgington: 1,4 µg/mL = moderadamente fungitóxico');
ck(/EDGINGTON, L\. V\./.test(hp),'Edgington et al. (1971) entra nas referências');
var card=run(F,"_bioestatCurvaContinuaHtml({doses_efetivas:[{nivel:50,dose:1.3,ic_inf:1,ic_sup:1.7}],doses_efetivas_absolutas:[{nivel:50,dose:1.4,ic_inf:0.9,ic_sup:2.1}],parametros:{patamar_dose_zero_d:83,patamar_dose_alta_c:1,inclinacao_b:1.1},unidade:'ppm',r2:0.99},function(x,d){ return String(x); })");
ck(/CE50 \(vs testemunha\)/.test(card) && /moderadamente fungitóxico/.test(card),'cartão da estatística mostra a curva contínua e a CE50');

console.log('\n[8] a placa no editor de sub-amostras');
ck(run(F,"_avBioPlaca('Diâmetro da colônia (mm)')").placaMm===90,'o editor sabe o Ø da placa do protocolo');
ck(run(F,"_avBioPlaca('Esporulação (conídios/mL)')")===null,'outra variável: sem placa');
ck(/maior que a placa de 90 mm/.test(run(F,"_avSubPlacaAviso(['95','90'],{placaMm:90,discoMm:5})")),'95 mm numa placa de 90: aponta (não corta)');
ck(/menor que o disco|Menor que o disco/.test(run(F,"_avSubPlacaAviso(['3','4'],{placaMm:90,discoMm:5})")),'menor que o disco: aponta');
ck(run(F,"_avSubPlacaAviso(['40','41'],{placaMm:90,discoMm:5})")==='','leitura normal: sem aviso');
ck(/Crescimento: 35,5 mm/.test(run(F,"_avSubCrescTexto('40.5',{placaMm:90,discoMm:5})")),'mostra o crescimento sem o disco');
run(F,"_avGrid={variaveis:['Diâmetro da colônia (mm)'],tipos:{'Diâmetro da colônia (mm)':'numero'},varcfg:{'Diâmetro da colônia (mm)':{sub:2}},notas:{},meta:{},bruto:{}}; _avSubCtx={key:'T1R1',v:'Diâmetro da colônia (mm)'}; _avPersistNow=function(){}; _avSubRender=function(){}; avSubTomouPlaca();");
ck(run(F,"_avGrid.notas.T1R1['Diâmetro da colônia (mm)']")==='90','"Tomou a placa": os dois eixos viram 90 mm');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
