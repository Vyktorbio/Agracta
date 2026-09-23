/* O ensaio de arena no app: cadastro, dose no pote, condição inicial e gráficos.
 *
 * Roda o app.js de verdade (com o vendor/arena-core.js) sobre o ensaio que
 * motivou: 12 tratamentos × 4 repetições, pote 37 × 22 cm, 1 lesma por pote,
 * T01 testemunha sem lesma, T02 testemunha infestada, D0–D10.
 *
 * Rodar: node test_arena_tela.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};

function elStub(){
  return new Proxy(function(){},{get(t,k){
    if(k==='style'||k==='dataset')return {};
    if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false;}};
    if(k===Symbol.toPrimitive)return ()=>'';
    return elStub();},set(){return true;},apply(){return elStub();}});
}
const store={};
const ctx={console:{log(){},warn(){},error(){}},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},
  Date,JSON,Math,Promise,Object,Array,String,Number,Error,RegExp,Symbol,Proxy,Map,Set,parseInt,parseFloat,isNaN,isFinite,encodeURIComponent,
  alert(){},confirm(){return true;},prompt(){return null;},
  localStorage:{getItem:k=>store[k]==null?null:store[k],setItem(k,v){store[k]=String(v);},removeItem(k){delete store[k];}},
  sessionStorage:{getItem(){return null;},setItem(){}},location:{reload(){},href:'',search:'',hash:''},
  navigator:{onLine:true,userAgent:'node',serviceWorker:{register(){return Promise.resolve();},addEventListener(){}}},
  document:new Proxy({},{get(t,k){
    if(['createElement','getElementById','querySelector','createElementNS'].includes(k))return ()=>elStub();
    if(['querySelectorAll','getElementsByClassName','getElementsByTagName'].includes(k))return ()=>[];
    if(k==='addEventListener'||k==='removeEventListener')return ()=>{};
    if(k==='readyState')return 'complete';if(k==='cookie')return '';return elStub();}}),
  addEventListener(){},removeEventListener(){},requestAnimationFrame(){},
  matchMedia(){return {matches:false,addListener(){},addEventListener(){}};},
  fetch(){return Promise.resolve({json(){return Promise.resolve({});}});}};
ctx.window=ctx;ctx.self=ctx;ctx.globalThis=ctx;
ctx.btoa=s=>Buffer.from(s,'binary').toString('base64');ctx.atob=s=>Buffer.from(s,'base64').toString('binary');
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('vendor/arena-core.js','utf8'),ctx,{filename:'arena-core.js'});
vm.runInContext(fs.readFileSync('vendor/avaliacao-core.js','utf8'),ctx,{filename:'avaliacao-core.js'});
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx,{filename:'app.js'});
const R=src=>vm.runInContext(src,ctx);
/* a ficha inteira não é o assunto aqui: as seções são testadas uma a uma */
R("openStudyDetail=function(){};");

/* ---------- o ensaio ---------- */
const trats=[{id:'T01',produto:'Testemunha não infestada',dose:''},{id:'T02',produto:'Testemunha infestada',dose:'',testemunha:true}];
[2,3,4,5,7,2,3,4,5,7].forEach((d,i)=>trats.push({id:'T'+String(i+3).padStart(2,'0'),produto:'Moluscicida '+(i<5?'A':'B'),dose:String(d)}));
const study={id:'S1',codigo:'MOL-01',tipoEstudo:'Moluscicida em arena',metodoAplicacao:'granulado',doseUnidade:'kg/ha',
  numRepeticoes:4,tratamentos:trats,aplicacoes:[],avaliacoes:[],avalInicio:'2026-09-24',
  arena:{forma:'retangular',comprimentoCm:37,larguraCm:22,organismosPorUnidade:1,organismo:'lesma',pesoPelletMg:25,
    substrato:'solo de campo peneirado',posicoes:'P1–P7',pontoInfestacao:'X central'}};
ctx.__st=study;
R("data={__config:{}, LAB:{tipo:'lab',labTipo:'Entomologia',estudos:[__st]}};");

console.log('\n[1] cadastro');
ok(R("aplicMetodosDe('LAB').join()")==='lab,granulado','a bancada oferece Potter e grânulos');
ok(R("studyMetodo(data.LAB.estudos[0],'LAB')")==='granulado','o estudo de arena usa grânulos');
ok(R("studyMetodo({metodoAplicacao:'drone'},'LAB')")==='lab','método de campo não vale na bancada');
ok(R("TIPOS_POR_LAB.Entomologia.indexOf('Moluscicida em arena')>=0"),'tipo "Moluscicida em arena" na Entomologia');
const cat=R("CATALOGO_AVAL['Moluscicida em arena']");
ok(cat.length===10&&cat.find(c=>c.nome==='Lesma morta').sentido==='maior'&&cat.find(c=>c.nome==='Lesma morta').N===1,'catálogo com 10 variáveis, lesma morta = razão N=1, sentido maior');
ok(!cat.find(c=>c.nome==='Dano foliar (%)').sentido,'dano foliar: sentido menor (a testemunha é a maior)');
const res=R("arenaResumoTexto(data.LAB.estudos[0])");
ok(/37 × 22 cm/.test(res)&&/0,0814 m²/.test(res)&&/12,3\/m²/.test(res),'ficha: medidas, área e densidade ('+res+')');
const lidos=R("_arenaLerCampos(function(id){ return ({seArForma:{value:'retangular'},seArComp:{value:'37'},seArLarg:{value:'22,0'},seArPellet:{value:''},seArOrg:{value:'1'}})[id]||null; })");
ok(lidos.larguraCm===22&&!('pesoPelletMg' in lidos)&&!('substrato' in lidos),'editor: aceita vírgula e não grava campo vazio');

console.log('\n[2] dose no pote');
const tab=R("arenaDoseTabela(data.LAB.estudos[0],'LAB')");
const t07=tab.linhas.find(l=>l.id==='T07');
ok(Math.abs(t07.mg-56.98)<1e-9&&t07.pelletsArred===2,'T07 (7 kg/ha): 56,98 mg = 2 pellets de 25 mg');
ok(tab.linhas.find(l=>l.id==='T02').mg===null,'testemunha sem dose: nada a pesar');
const html=R("arenaDoseHtml(data.LAB.estudos[0],'LAB','aplicacao')");
ok(/O que vai em cada pote/.test(html)&&/T03, T05, T06, T07.*pellets inteiros desviam a dose em mais de 10%/.test(html),'a aplicação mostra a tabela e o aviso de desvio');
ok(R("aplicacaoMemoriaAuto(data.LAB.estudos[0],'LAB',{id:'a1'})")===null,'grânulos não geram memória de calda');
const semPeso=R("(function(){var s=JSON.parse(JSON.stringify(data.LAB.estudos[0]));delete s.arena.pesoPelletMg;return arenaDoseHtml(s,'LAB','estudo');})()");
ok(/Falta o peso médio do pellet/.test(semPeso),'sem peso do pellet: a tela pede, não chuta');

console.log('\n[3] condição inicial');
R("condicaoInicialDefinir('LAB','S1',1)");
ok(R("data.LAB.estudos[0].condicaoInicial.variaveis.length")===4,'variáveis da arena definidas');
R("condicaoInicialSet('LAB','S1','T03R1','Peso da lesma (g)','4,8')");
R("condicaoInicialSet('LAB','S1','T03R2','Peso da lesma (g)','5,2')");
R("condicaoInicialSet('LAB','S1','T04R1','Peso da lesma (g)','9')");
ok(R("data.LAB.estudos[0].condicaoInicial.valores.T03R1['Peso da lesma (g)']")==='4,8','medida gravada como digitada');
R("condicaoInicialSet('LAB','S1','T03R1','Peso da lesma (g)','4,9')");
ok(R("data.LAB.estudos[0].audit.some(function(a){return a.action==='Condição inicial corrigida';})"),'correção de medida vai para a trilha');
const ciH=R("condicaoInicialHtml('LAB','S1',data.LAB.estudos[0])");
ok(/Condição inicial das parcelas/.test(ciH)&&/não começaram iguais/.test(ciH),'resumo por tratamento aponta o desbalanço (T04 com lesma de 9 g)');
const merged=R("_mergeCondInicial({variaveis:['P'],valores:{A:{P:'1'}},meta:{A:{P:{em:'2026-09-24T10:00:00Z'}}}},"+
  "{variaveis:['P'],valores:{A:{P:'2'},B:{P:'3'}},meta:{A:{P:{em:'2026-09-24T09:00:00Z'}},B:{P:{em:'2026-09-24T09:30:00Z'}}}},true)");
ok(merged.valores.A.P==='1'&&merged.valores.B.P==='3','merge célula a célula: vence a medida mais nova de cada pote, nada se perde');
R("data.LAB.estudos[0].finalizacao={em:'2026-10-05'}");
ok(/disabled/.test(R("condicaoInicialHtml('LAB','S1',data.LAB.estudos[0])")),'estudo finalizado: condição inicial só leitura');
R("delete data.LAB.estudos[0].finalizacao");

console.log('\n[4] gráficos');
/* D0..D10 simulados: testemunha infestada ganha dano e a lesma vive; T07 mata no D3. */
const avs=[];
for(let d=0;d<=10;d+=2){
  const notas={};
  trats.forEach((t,ti)=>{for(let r=1;r<=4;r++){
    const k=t.id+'R'+r, trat=ti>=2, forte=t.id==='T07'||t.id==='T12';
    const morta=t.id==='T01'?'':(trat&&(forte?d>=3:d>=6)?100:0);
    notas[k]={'Dano foliar (%)':t.id==='T01'?0:(trat?(forte?Math.min(d,3):Math.min(d*2,10)):d*6),
      'Lesma morta':morta,
      'Pellets íntegros':trat?Math.max(0,2-Math.floor(d/4)):'',
      'Pellets mordidos':trat?Math.min(2,Math.floor(d/4)):'',
      'Pellets desintegrados':trat?0:''};
  }});
  const dt=new Date(Date.UTC(2026,8,24+d)).toISOString().slice(0,10);
  avs.push({id:'av'+d,data:dt,momento:{valor:d,unidade:'DAT'},variaveis:cat.map(c=>c.nome),
    tipos:Object.fromEntries(cat.map(c=>[c.nome,c.tipo])),varcfg:{'Lesma morta':{N:1,sentido:'maior'}},notas});
}
ctx.__avs=avs;R("data.LAB.estudos[0].avaliacoes=__avs;");
const pts=R("arenaPontos(data.LAB.estudos[0])");
ok(pts.length===6&&pts[5].dia===10&&pts[5].rotulo==='10 DAT','dias vêm do momento declarado (D0–D10)');
const G=R("arenaGraficosHtml(data.LAB.estudos[0],'LAB')");
ok(/Dano na planta × dias/.test(G)&&/Sobrevivência do organismo × dias/.test(G)&&/Pellets atacados × dias/.test(G),'as três curvas');
ok((G.match(/<svg/g)||[]).length===3,'uma figura por pergunta (nunca dois eixos na mesma)');
ok(/Resultado no fim do ensaio/.test(G)&&/10 DAT/.test(G),'tabela do fim do ensaio no D10');
ok(/Base da proteção e do Abbott: <b>T02<\/b>/.test(G),'a base é a testemunha infestada');
const cv=R("ArenaCore.resumo(ArenaCore.curvas(arenaPontos(data.LAB.estudos[0]),data.LAB.estudos[0].tratamentos),data.LAB.estudos[0].tratamentos,'T02')");
const l7=cv.linhas.find(l=>l.id==='T07');
ok(l7.mortalidadeFinal===100&&l7.abbott===100&&l7.dia50===4,'T07: 100% de mortalidade, primeira leitura com ≤50% vivos no D4');
ok(l7.protecao>90,'T07 protege a soja frente à testemunha infestada ('+Math.round(l7.protecao)+'%)');
ok(cv.linhas.find(l=>l.id==='T01').mortalidadeFinal===null,'T01 sem lesma: mortalidade em branco, não zero');
ok(/<title>T07 · Moluscicida A — 4 DAT: 3%<\/title>/.test(G),'cada ponto mostra o valor ao passar o dedo/mouse');
ok(R("arenaGraficosHtml({tipoEstudo:'Mortalidade',tratamentos:[],avaliacoes:[]},'LAB')")==='','outros bioensaios não ganham a seção');

console.log('\nArena na tela: '+n+' verificações.');
fs.writeFileSync(process.env.ARENA_HTML||'/dev/null','<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:560px;margin:16px auto;background:#f4f6f4">'+
  R("arenaDoseHtml(data.LAB.estudos[0],'LAB','estudo')")+R("condicaoInicialHtml('LAB','S1',data.LAB.estudos[0])")+G+'</body>');
