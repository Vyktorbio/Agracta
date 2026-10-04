/* AVALIAÇÕES COM A FÓRMULA DA LITERATURA, ESCOLHIDA SOZINHA — E A MESMA EM TODO LUGAR.
 *
 *  1. Contagem de vivos com leitura ANTES da 1ª aplicação (prévia): a eficácia é a de
 *     Henderson & Tilton (1955), não a redução de Abbott — e a tabela, o ranking, a
 *     planilha e a página do estudo dão o MESMO número;
 *  2. na própria prévia não há eficácia (nada foi aplicado);
 *  3. sem aplicação registrada, sem prévia reconhecida: Abbott, como sempre;
 *  4. escala com mínimo 1 (EWRC 1–9): parcela sem sintoma dá índice 0, não 11%;
 *  5. CV do ensaio classificado por Pimentel-Gomes (2009).
 *
 * Rodar: node test_avaliacoes_literatura.js
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
    encodeURIComponent:encodeURIComponent,decodeURIComponent:decodeURIComponent,escape:escape,unescape:unescape,Buffer:Buffer,alert:function(){},confirm:function(){return true;},prompt:function(){return '';},
    FormData:function(){ this.forEach=function(){}; }};
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
  ['vendor/bioensaio-core.js','vendor/avaliacao-core.js','vendor/conhecimento-core.js'].forEach(function(f){ vm.runInContext(fs.readFileSync(AG+f,'utf8'),c,{filename:f}); });
  vm.runInContext(fs.readFileSync(AG+'app.js','utf8'),c,{filename:'app.js'});
  vm.runInContext(fs.readFileSync(AG+'firebase-sync.js','utf8'),c,{filename:'firebase-sync.js'});
  vm.runInContext(fs.readFileSync(AG+'integracoes.js','utf8'),c,{filename:'integracoes.js'});
  vm.runInContext('data='+JSON.stringify(estado)+';',c);
  vm.runInContext("LOCAIS={L1:{nome:'Fazenda'}}; QLOCAL={Q1:'L1'}; _stxToast=function(){}; renderAvGrid=function(){};",c);
  return c;
}
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
function run(c,js){ return vm.runInContext(js,c); }
function perto(a,b,t){ return a!=null&&b!=null&&Math.abs(a-b)<=(t==null?1e-6:t); }

/* Ácaro-rajado contado em folhas (vivos por folha): prévia em 08/03, aplicação em
   10/03, leitura em 17/03. T2 partiu de uma população MAIOR que a testemunha. */
function av(id,data,contagens,sev){
  var notas={};
  Object.keys(contagens).forEach(function(k){ notas[k]={'Ácaros vivos':String(contagens[k])}; if(sev) notas[k].Severidade=String(sev[k]); });
  var vars=['Ácaros vivos'].concat(sev?['Severidade']:[]);
  var tipos={'Ácaros vivos':'contagem'}; if(sev) tipos.Severidade='pct';
  return {id:id,data:data,variaveis:vars,tipos:tipos,varcfg:{},notas:notas};
}
var estudo={id:'S',codigo:'ACA-01',numRepeticoes:2,
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true},{id:'T2',produto:'Acaricida A',dose:'1'}],
  aplicacoes:[{id:'ap1',data:'2026-03-10'}],
  avaliacoes:[
    av('pre','2026-03-08',{T1R1:40,T1R2:60,T2R1:90,T2R2:110},{T1R1:5,T1R2:7,T2R1:6,T2R2:8}),
    av('pos','2026-03-17',{T1R1:70,T1R2:90,T2R1:12,T2R2:8},{T1R1:20,T1R2:30,T2R1:5,T2R2:3})
  ]};
var A=aparelho({Q1:{cultura:'algodão',estudos:[estudo]}});
run(A,"curV='Q1'; curSid='S'; var S=data.Q1.estudos[0]; var PRE=S.avaliacoes[0], POS=S.avaliacoes[1];");

console.log('\n[1] contagem com prévia: Henderson & Tilton (1955)');
ck(run(A,"_avMetodoEficacia(S,PRE,'Ácaros vivos').metodo")==='previa','a leitura de 08/03 (antes da aplicação de 10/03) é prévia');
ck(run(A,"_avMetodoEficacia(S,POS,'Ácaros vivos').metodo")==='ht','a de 17/03 usa Henderson & Tilton');
/* à mão: Tb=100, Cb=50 (prévia); Ta=10, Ca=80 → (1 − 10·50 / 100·80) × 100 = 93,75% */
var ht=run(A,"var m=_avMeans(S,POS); _avEficacia(S,POS,'Ácaros vivos','T2',m.T1['Ácaros vivos'],m.T2['Ácaros vivos'])");
ck(perto(ht,93.75),'T2: (1 − 10·50 ÷ 100·80) × 100 = 93,75% ('+ht+')');
var ab=run(A,"var m=_avMeans(S,POS); _pctCtrl(m.T1['Ácaros vivos'],m.T2['Ácaros vivos'],'menor','contagem')");
ck(perto(ab,87.5),'(a redução de Abbott daria 87,5% — ignorando que T2 partiu do dobro)');
var tab=run(A,"avResultHtml(S,POS)");
ck(/% efic \(H-T\)/.test(tab) && /93,8%|93\.8%/.test(tab),'a tabela da avaliação mostra 93,8% com a coluna H-T');
ck(/contagem prévia de 08\/03\/2026/.test(tab),'e diz de qual prévia a conta partiu');
ck(/% ctrl/.test(tab),'severidade (%) segue com a redução de Abbott na mesma tabela');
ck(run(A,"_avMetodoEficacia(S,POS,'Severidade').metodo")==='abbott','Henderson & Tilton é só para contagem de indivíduos');

console.log('\n[2] a prévia não tem eficácia');
var tp=run(A,"avResultHtml(S,PRE)");
ck(/leitura antes da 1ª aplicação/.test(tp) && />base</.test(tp),'a prévia aparece como base da comparação');
ck(!/\d%<\/td><\/tr>/.test(tp.split('Severidade')[0]),'sem nenhum % de controle na prévia');
ck(run(A,"_avEficacia(S,PRE,'Ácaros vivos','T2',50,100)")===null,'_avEficacia devolve nada na prévia');

console.log('\n[3] o mesmo número em todo lugar');
var proj=JSON.parse(run(A,"JSON.stringify(agConhecimento.projetar('Q1',S,data.Q1).resultados.filter(function(r){ return r.variavel==='Ácaros vivos'; }))"));
var p2=proj.filter(function(r){ return r.avaliacao==='pos'&&r.tratamento==='T2'; })[0];
var pp=proj.filter(function(r){ return r.avaliacao==='pre'&&r.tratamento==='T2'; })[0];
ck(p2 && perto(p2.controle,93.75) && p2.eficacia==='ht','página do estudo / portal: 93,75% e o método H-T');
ck(pp && pp.controle==null && pp.eficacia==='previa','na prévia a projeção não inventa eficácia');
var bars=run(A,"studyChartsHtml(S)");
ck(/eficácia de Henderson &amp; Tilton|eficácia de Henderson & Tilton/.test(bars),'o ranking usa a mesma fórmula');
/* planilhas, resumo e exportação tidy: nenhuma conta de eficácia fora do _avEficacia
   (a redução de Abbott da AACPD é a única que segue direta, e é a certa ali) */
var fonte=fs.readFileSync(AG+'app.js','utf8');
var diretas=(fonte.match(/_pctCtrl\([^;{]*/g)||[]).filter(function(c){ return c.indexOf('_pctCtrl(ref, val, sentido, tipo)')!==0; });
var permitidas=diretas.filter(function(c){ return c.indexOf('_pctCtrl(tm,mv,_avSentido(av,v),_avTipo(av,v))')===0 || c.indexOf('_pctCtrl(ta,a')===0; });
ck(diretas.length===3 && permitidas.length===3,
   'fora da AACPD, só o _avEficacia chama _pctCtrl ('+diretas.join(' | ')+')');
ck((fonte.match(/_avEficacia\(s,a,v,t\.id,/g)||[]).length>=4,'as exportações (planilha, xlsx, resumo, tidy) usam _avEficacia');

console.log('\n[4] sem aplicação registrada, não há como saber o que é prévia');
run(A,"var S2=JSON.parse(JSON.stringify(S)); S2.aplicacoes=[]; S2.dataInicio='2026-03-10';");
ck(run(A,"_avMetodoEficacia(S2,S2.avaliacoes[1],'Ácaros vivos').metodo")==='abbott','sem aplicação: Abbott, como sempre');
ck(run(A,"_avMetodoEficacia(S2,S2.avaliacoes[0],'Ácaros vivos').metodo")==='abbott','e nada vira prévia por palpite');
run(A,"var S3=JSON.parse(JSON.stringify(S)); S3.avaliacoes[0].notas.T1R1['Ácaros vivos']='0'; S3.avaliacoes[0].notas.T1R2['Ácaros vivos']='0';");
ck(run(A,"var m3=_avMeans(S3,S3.avaliacoes[1]); _avEficacia(S3,S3.avaliacoes[1],'Ácaros vivos','T2',m3.T1['Ácaros vivos'],m3.T2['Ácaros vivos'])")===null,'testemunha zerada na prévia: sem eficácia (a conta daria 100% para tudo)');
run(A,"var S4=JSON.parse(JSON.stringify(S)); S4.avaliacoes.forEach(function(a){ a.varcfg={'Ácaros vivos':{sentido:'maior'}}; });");
ck(run(A,"_avMetodoEficacia(S4,S4.avaliacoes[1],'Ácaros vivos').metodo")==='abbott-mort','contagem de MORTOS (sentido maior): Abbott corrigido');

console.log('\n[5] escala com mínimo: EWRC (1964) de 1 a 9');
var ewrc={tipo:'escala',sub:4,N:0,escalaMax:9,escalaMin:1,escalaNome:''};
ck(run(A,"_avDerivar("+JSON.stringify(ewrc)+",{sub:['1','1','1','1']})")==='0','todas as plantas sem sintoma (nota 1): índice 0%');
ck(run(A,"_avDerivar("+JSON.stringify(ewrc)+",{sub:['9','9']})")==='100','todas mortas (nota 9): 100%');
ck(run(A,"_avDerivar("+JSON.stringify(ewrc)+",{sub:['5']})")==='50','nota 5, o meio da escala: 50%');
ck(run(A,"_avDerivar({tipo:'escala',sub:2,N:0,escalaMax:4,escalaMin:0},{sub:['2','4']})")==='75','escala de 0 a 4 continua igual: (2+4)/(2×4) = 75%');
ck(run(A,"_avCfg({varcfg:{v:{escalaMin:5,escalaMax:4}},tipos:{v:'escala'}},'v').escalaMin")===0,'mínimo ≥ máximo é descartado (volta a 0)');
run(A,"_avGrid={variaveis:['Nota EWRC'],tipos:{'Nota EWRC':'escala'},varcfg:{'Nota EWRC':{escalaMin:1,escalaMax:9,sub:1}},notas:{},meta:{},bruto:{}}; _avWriteBruto('T1R1','Nota EWRC','s0','0');");
ck(run(A,"_avGrid.bruto.T1R1['Nota EWRC'].sub[0]")==='','nota 0 numa escala que começa em 1 é recusada (não vira 1)');
var cat=JSON.parse(run(A,"JSON.stringify(CATALOGO_AVAL['Seletividade/Fitotoxicidade'].filter(function(x){ return x.nome==='Nota EWRC'; })[0])"));
ck(cat.escalaMin===1 && cat.escalaMax===9 && /EWRC \(1964\)/.test(cat.escalaNome),'o catálogo traz a EWRC 1–9 com a descrição e a referência');
/* o document do sandbox é um Proxy que ignora atribuição: troca-se o objeto inteiro */
run(A,"window._avColItens=CATALOGO_AVAL['Seletividade/Fitotoxicidade']; document={getElementById:function(id){ return id==='avColNome'?{value:'Nota EWRC',style:{}}:null; },querySelector:function(){return null;},querySelectorAll:function(){return [];},createElement:function(){return {style:{},setAttribute:function(){},appendChild:function(){}};},addEventListener:function(){},body:{appendChild:function(){}},head:{appendChild:function(){}}}; _avColType=function(t){ window._avColTipo=t; }; "+
      "avColPreset(window._avColItens.map(function(x){ return x.nome; }).indexOf('Nota EWRC')); _avGrid={variaveis:[],tipos:{},varcfg:{},notas:{},meta:{},bruto:{}}; avColConfirm();");
var cfgE=JSON.parse(run(A,"JSON.stringify(_avGrid.varcfg['Nota EWRC']||null)"));
ck(cfgE && cfgE.escalaMin===1 && cfgE.escalaMax===9 && /EWRC/.test(cfgE.escalaNome||''),'coluna criada pelo catálogo já nasce 1–9, com a descrição');
ck(/de 1 a 9/.test(run(A,"_avEscala({varcfg:{v:{escalaMin:1,escalaMax:9}},tipos:{v:'escala'}},'v').porque")),'a explicação da escala diz de 1 a 9');

console.log('\n[6] CV pela tabela de Pimentel-Gomes (2009)');
[[9.9,'baixo'],[10,'médio'],[20,'médio'],[20.1,'alto'],[30,'alto'],[30.5,'muito alto']].forEach(function(p){
  ck(run(A,"_cvClassePG("+p[0]+")")===p[1],'CV '+p[0]+'% → '+p[1]);
});
ck(run(A,"_cvClassePG(null)")==='','sem CV: nada');
ck(/PIMENTEL-GOMES, F\./.test(run(A,"BioensaioCore.REFERENCIAS.pimentelGomes2009.abnt")),'referência em ABNT no registro');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
