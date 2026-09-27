/* O TIPO "NÚMERO": MEDIDA LIVRE, SEM TETO DE 100 E COM DECIMAIS.
 *
 * Antes dele, "% / número" era o único tipo digitável (teto de 100) e os modelos de
 * medida usavam "contagem", que trunca decimais (12,5 mm virava 12) e manda a variável
 * para análise de contagem. Este teste protege:
 *  1. número aceita acima de 100 e mantém decimais, em todos os caminhos de entrada;
 *  2. contagem com unidade de medida no nome não trunca; contagem comum continua inteira;
 *  3. coluna nova com nome de medida nasce como número quando ninguém escolheu o tipo;
 *     escolha explícita é respeitada;
 *  4. converter coluna existente vale para todas as avaliações e vai para a trilha;
 *  5. a estatística recebe número como variável contínua (a regex de contagem casava
 *     "número").
 *
 * Rodar: node test_tipo_numero.js
 */
var fs=require('fs'), vm=require('vm'), path=require('path');
var AG=__dirname+path.sep;
var db={ doc:function(){ return {collection:function(){ return {get:function(){return Promise.resolve({forEach:function(){}});},doc:function(){return {};}}; },get:function(){return Promise.resolve({exists:false,data:function(){return {};}});},onSnapshot:function(){return function(){};}}; }, settings:function(){}, batch:function(){ return {set:function(){},delete:function(){},update:function(){},commit:function(){return Promise.resolve();}}; } };
function FieldPath(){}
/* ---------- um aparelho ---------- */
function elStub(){ return new Proxy(function(){}, { get:function(t,k){ if(k==='style')return {}; if(k==='classList')return {add:function(){},remove:function(){},toggle:function(){},contains:function(){return false;}}; if(k==='value'||k==='textContent'||k==='innerHTML')return ''; if(k==='children'||k==='childNodes')return []; return elStub(); }, set:function(){return true;}, apply:function(){return elStub();} }); }
function aparelho(nome, estado){
  var store={};
  var c={console:{log:function(){},warn:function(){},error:function(){}},Promise:Promise,setTimeout:function(f,ms){ c.__timers.push({f:f,ms:ms}); return c.__timers.length; },clearTimeout:function(){},setInterval:function(){},clearInterval:function(){},
    Date:Date,JSON:JSON,Object:Object,Array:Array,String:String,Number:Number,Math:Math,RegExp:RegExp,Error:Error,isNaN:isNaN,parseInt:parseInt,parseFloat:parseFloat,Map:Map,Set:Set,Symbol:Symbol,
    encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,alert:function(){},confirm:function(){return true;},prompt:function(){return '';},__timers:[]};
  c.window=c; c.globalThis=c; c.self=c;
  c.btoa=function(s){return Buffer.from(s,'binary').toString('base64');}; c.atob=function(s){return Buffer.from(s,'base64').toString('binary');};
  c.localStorage={getItem:function(k){return store[k]==null?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
  c.sessionStorage={getItem:function(){return null;},setItem:function(){}};
  c.location={reload:function(){},href:'',search:'',hash:'',origin:'http://x'};
  c.navigator={onLine:true,userAgent:'node',serviceWorker:{register:function(){return Promise.resolve();},addEventListener:function(){}}};
  c.document=new Proxy({},{get:function(t,k){ if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS')return function(){return elStub();}; if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName')return function(){return [];}; if(k==='addEventListener'||k==='removeEventListener')return function(){}; if(k==='visibilityState')return 'visible'; if(k==='cookie')return ''; return elStub(); }});
  c.addEventListener=function(){}; c.removeEventListener=function(){}; c.requestAnimationFrame=function(){}; c.dispatchEvent=function(){}; c.CustomEvent=function(n,o){this.detail=o&&o.detail;};
  c.matchMedia=function(){return {matches:false,addListener:function(){},addEventListener:function(){}};};
  c.fetch=function(){return Promise.resolve({ok:true,json:function(){return Promise.resolve({});}});};
  c.firebase={apps:[1],app:function(){return {};},initializeApp:function(){return {};},
    auth:function(){ return {setPersistence:function(){},onAuthStateChanged:function(cb){ cb({uid:'u-'+nome,email:nome+'@x.com',emailVerified:true}); },signOut:function(){return Promise.resolve();}}; },
    firestore:function(){return db;}};
  c.firebase.auth.Auth={Persistence:{LOCAL:1,NONE:0}};
  c.firebase.firestore.FieldValue={serverTimestamp:function(){return 'ts';},delete:function(){return {__del:1};}};
  c.firebase.firestore.FieldPath=FieldPath;
  c.AGRACTA_FIREBASE_CONFIG={apiKey:'x',authDomain:'d',projectId:'p',appId:'a'};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(AG+'app.js','utf8'),c,{filename:'app.js'});
  vm.runInContext(fs.readFileSync(AG+'firebase-sync.js','utf8'),c,{filename:'firebase-sync.js'});
  vm.runInContext('data='+JSON.stringify(estado)+';',c);
  return c;
}
var falhas=0; function eq(a,b,msg){ var ok=(String(a)===String(b)); console.log((ok?'  ok   ':'  FALHA ')+msg+(ok?'':'  (esperado '+b+', veio '+a+')')); if(!ok) falhas++; }
var estudo={id:'S',codigo:'E',numRepeticoes:2,tratamentos:[{id:'T1'},{id:'T2'}],avaliacoes:[
  {id:'A1',data:'2026-03-05',variaveis:['Altura','Diâmetro (mm)','v2','Severidade'],tipos:{Altura:'numero','Diâmetro (mm)':'contagem',v2:'contagem',Severidade:'pct'},notas:{}},
  {id:'A2',data:'2026-03-19',variaveis:['Altura','Severidade'],tipos:{Altura:'numero',Severidade:'pct'},notas:{}}]};
var A=aparelho('A',{Q1:{cultura:'soja',estudos:[estudo]}});
vm.runInContext("LOCAIS={L1:{nome:'E'}}; QLOCAL={Q1:'L1'}; curV='Q1'; curSid='S'; _avGrid={variaveis:['Altura','Diâmetro (mm)','v2','Severidade'],tipos:{Altura:'numero','Diâmetro (mm)':'contagem',v2:'contagem',Severidade:'pct'},notas:{},meta:{},varcfg:{},bruto:{}};",A);
/* só a tela: sem elementos no DOM de teste, as rotinas visuais retornam cedo */
vm.runInContext("document={getElementById:function(){return null;},querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return {style:{},setAttribute:function(){},appendChild:function(){}};},addEventListener:function(){},body:{appendChild:function(){}},head:{appendChild:function(){}}}; renderAvGrid=function(){}; _stxToast=function(){};",A);
function valida(v,val){ return vm.runInContext("(function(){ var inp={getAttribute:function(){return "+JSON.stringify(v)+";},value:"+JSON.stringify(val)+"}; avValidateCell(inp); return inp.value; })()",A); }

console.log('\n[1] número: sem teto de 100, com decimais');
eq(valida('Altura','150'),'150','altura 150 não vira 100');
eq(valida('Altura','12.5'),'12.5','altura 12,5 mantém o decimal');
eq(valida('Severidade','150'),'100','% continua com teto de 100');
vm.runInContext("_avGrid.varcfg.Altura={sub:2}; _avWriteBruto('T1R1','Altura','s0','3500');",A);
eq(vm.runInContext("_avGrid.bruto.T1R1.Altura.sub[0]",A),'3500','sub-amostra de número também sem teto');

console.log('\n[2] contagem com unidade de medida não perde decimais');
eq(valida('Diâmetro (mm)','12.5'),'12.5','diâmetro (mm) em coluna de contagem: 12,5 fica 12,5');
eq(valida('v2','12.8'),'12','contagem comum continua inteira');

console.log('\n[3] coluna nova com nome de medida');
vm.runInContext("window._avColTipo='pct'; window._avColTipoEscolhido=false; window._avColOpts={sub:1,N:20,escalaMax:4,sentido:'menor'};",A);
vm.runInContext("document.getElementById=function(id){ if(id==='avColNome') return {value:'Produtividade (kg/ha)',style:{}}; return null; };",A); /* o document já é um objeto comum */
vm.runInContext("try{ avColConfirm(); }catch(e){}",A);
eq(vm.runInContext("_avGrid.tipos['Produtividade (kg/ha)']",A),'numero','sem escolha explícita, "Produtividade (kg/ha)" nasce como número');
vm.runInContext("window._avColTipo='pct'; window._avColTipoEscolhido=true; document.getElementById=function(id){ if(id==='avColNome') return {value:'Altura relativa (cm)',style:{}}; return null; }; try{ avColConfirm(); }catch(e){}",A);
eq(vm.runInContext("_avGrid.tipos['Altura relativa (cm)']",A),'pct','escolha explícita de % é respeitada');

/* sugestão ao digitar */
vm.runInContext("window._avColTipo='pct'; window._avColTipoEscolhido=false; window._avColTipoAntesDaSugestao=null; window.__nome='Peso de mil grãos (g)'; document.getElementById=function(id){ return id==='avColNome'?{value:window.__nome,style:{}}:null; }; _avColSugereTipo();",A);
eq(vm.runInContext("window._avColTipo",A),'numero','ao digitar nome de medida, o destaque vai para número');
vm.runInContext("window.__nome='Ferrugem'; _avColSugereTipo();",A);
eq(vm.runInContext("window._avColTipo",A),'pct','se o nome deixa de ser de medida, volta ao tipo anterior');
vm.runInContext("_avColType('pct',true); window.__nome='Altura (cm)'; _avColSugereTipo();",A);
eq(vm.runInContext("window._avColTipo",A),'pct','depois de um toque explícito, a sugestão não passa por cima');

console.log('\n[4] converter coluna existente');
vm.runInContext("_avGrid={variaveis:['Severidade'],tipos:{Severidade:'pct'},notas:{},meta:{},varcfg:{},bruto:{}}; confirm=function(){return true;}; data.Q1.estudos[0].audit=[]; try{ avTipoCol('Severidade'); }catch(e){ console.log(e); }",A);
eq(vm.runInContext("_avGrid.tipos.Severidade",A),'numero','a grade aberta passa a número');
eq(vm.runInContext("data.Q1.estudos[0].avaliacoes.map(function(a){return a.tipos.Severidade;}).join(',')",A),'numero,numero','e todas as avaliações do estudo junto (a série não se parte)');
eq(vm.runInContext("/Tipo de variável/.test(JSON.stringify(data.Q1.estudos[0].audit||[]))",A),'true','a troca vai para a trilha de auditoria');

console.log('\n[5] estatística');
var eng=fs.readFileSync(AG+'estatistica/app.js','utf8'), k=eng.indexOf('function _agTipoResp('), f=eng.slice(k, eng.indexOf('\n}',k)+2);
var c2={}; vm.createContext(c2); vm.runInContext(f,c2);
eq(c2._agTipoResp('numero'),'continua','número vai para a estatística como contínua (não contagem)');
eq(c2._agTipoResp('pct'),'proporcao','% continua proporção');
eq(vm.runInContext("_bioestatForenseTipo({variavel:'Altura',tipo:'numero'})",A),'cont','na triagem forense, número é contínuo');

if(falhas){ console.log('\n'+falhas+' falha(s).'); process.exitCode=1; }
else console.log('\nTipo número: sem teto, com decimais, sugestão pelo nome, conversão com trilha e rota contínua OK.');
