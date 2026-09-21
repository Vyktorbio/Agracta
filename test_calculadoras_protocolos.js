/* Regressões com quantidades calculadas à mão: entradas, receita e registro. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const LB=require('./vendor/biocalc-lab-core.js'),BC=require('./vendor/biocalc-campo-core.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<=Math.max(1e-12,Math.abs(b)*1e-10),`${a} != ${b}`);
for(const valor of ['0.033','0,033',.033]){
  near(LB.parseNum(valor),.033);
  near(LB.calcCampo({dose:valor,unidade:'% v/v',volumeMl:50}).produtoUl,16.5);
}
near(LB.parseNum('1.500'),1500);
near(LB.parseNum('1.234e-3'),.001234);
for(const pureza of [0,-1,101,'abc',Infinity]){
  assert.throws(()=>LB.calcPPM({alvoPpm:100,volumeMl:50,fonteTipo:'puro',pureza}));
}
for(const densidade of [0,-1,'abc'])assert.throws(()=>LB.calcCampo({dose:100,unidade:'g/ha',vazao:100,volumeMl:50,densidade}));
for(const dose of ['abc','1,2,3','1 lixo',0,-1,Infinity])assert.throws(()=>LB.calcCampo({dose,unidade:'L/ha',vazao:100,volumeMl:50}));
assert.throws(()=>LB.calcCampo({dose:110,unidade:'% v/v',volumeMl:50}));
assert.throws(()=>LB.calcCampo({dose:1,unidade:'mg/ha',volumeMl:50,vazao:100}));
// 100 mg/L × 0,050 L = 5 mg i.a.; a 500 g/kg, pesar 10 mg de produto.
const solido=LB.calcPPM({alvoPpm:100,volumeMl:50,fonteTipo:'gkg',fonteValor:500});
assert.equal(solido.acao,'pesar');near(solido.massaMg,10);
assert.equal(solido.produtoMl,undefined);assert.equal(solido.fontePpm,null);
near(LB.calcSerie({doses:[100,50],volumeMl:50,fonteTipo:'gkg',fonteValor:500}).linhas[1].massaMg,5);
assert.throws(()=>LB.fontePpm('gkg',500));
assert.throws(()=>LB.calcPPM({alvoPpm:100,volumeMl:50,fonteTipo:'gkg',fonteValor:1001}));
assert.throws(()=>LB.calcAjusteIA({origemValor:500,origemUnid:'g/kg',alvoValor:100,alvoUnid:'g/kg',volumeFinal:100,volumeUnid:'mL',densidade:1.2}),/solução final/);
// Origem 500 g/kg × 1,2 kg/L = 600 g/L; alvo 100 g/kg × 1,05 = 105 g/L.
near(LB.calcAjusteIA({origemValor:500,origemUnid:'g/kg',alvoValor:100,alvoUnid:'g/kg',volumeFinal:100,volumeUnid:'mL',densidade:1.2,densidadeAlvo:1.05}).produtoMl,17.5);
near(LB.concToPpm('1.500','% m/v'),15000);
assert.throws(()=>LB.calcSerie({doses:[100,'erro',25],volumeMl:50,fonteTipo:'puro'}));
assert.throws(()=>LB.gerarSerieAuto(100,2,2.5));
assert.ok(LB.gerarSerieAuto(1e-8,10,4).every(v=>v>0));
assert.notEqual(LB.fmtVivo(1e-9),'0,000000');
assert.equal(LB.sugereMae(.000001,.001),null,'uma solução intermediária não pode ocupar mais que o volume final');
const base={components:[{nome:'A',valor:1,unidade:'L/ha'}],sprayVolume:100,plotLength:10,plotWidth:5,numPlots:4,numBottles:1};
for(const entry of [{numPlots:0},{numPlots:1.5},{numBottles:-1},{deadVolumeMl:-1},{bottleCapacity:-2},{minimumOperatingMl:'errado'},{plotLength:'10abc'}]){
  assert.throws(()=>BC.calculateMixture({...base,...entry}),JSON.stringify(entry));
}
near(BC.calculateMixture({...base,plotLength:'1.234'}).appliedMl,246.8);

const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="labOut"></div>',{runScripts:'outside-only'}),w=dom.window;
const src=fs.readFileSync('app.js','utf8');
const functionSource=name=>{const a=src.indexOf('function '+name+'(');assert.ok(a>=0);let depth=0,seen=false;for(let j=a;j<src.length;j++){if(src[j]==='{'){depth++;seen=true;}else if(src[j]==='}'&&--depth===0&&seen)return src.slice(a,j+1);}throw new Error(name);};
let study={id:'s1',doseModo:'campo',doseUnidade:'g/ha',tratamentos:[
  {id:'T1',produto:'Produto + Adjuvante',dose:'1,5 L/ha + 0.033%',volume:'300 L/ha'},
  {id:'T2',produto:'Sólido',dose:'200'}]};
Object.assign(w,{BioCalculoLab:LB,BioCalculoCampo:BC,_labTab:'campo',_labStudy:()=>study,
  esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
for(const [id,value] of Object.entries({labVol:50,labVazao:150,labPureza:'',labDens:''})){
  const el=w.document.createElement('input');el.id=id;el.value=value;w.document.body.append(el);
}
w.eval(['_labVal','_labAvisosHtml','_doseZerada','calcMemoriaLab','calcMemoriaLabTexto','_labCompute'].map(functionSource).join('\n'));
const cfg={doseModo:'campo',volumeMl:50,vazaoLHa:150};
let mem=w.calcMemoriaLab(study,cfg);
assert.equal(mem.tratamentos[0].testemunha,false,'primeiro tratamento não é automaticamente testemunha');
assert.equal(mem.tratamentos[0].componentes.length,2);
near(mem.tratamentos[0].componentes[0].produtoUl,250);
near(mem.tratamentos[0].componentes[1].produtoUl,16.5);
near(mem.tratamentos[0].solventeMl,49.7335);
near(mem.tratamentos[1].massaMg,200/150*.05*1000);
w._labCompute();
assert.match(w.document.getElementById('labOut').textContent,/250,0?0? µL|250 µL/);
assert.match(w._labTexto,/Adjuvante: PIPETAR 16,50 µL/);
assert.match(w._labTexto,/Sólido: PESAR/);
for(const t of [{id:'T1',produto:'A',dose:'erro'},{id:'T1',produto:'A',dose:'-1 L/ha'},
  {id:'T1',produto:'A + B',dose:'1 L/ha'},{id:'T1',produto:'A',dose:'200',volume:'100 ou 200 L/ha'}]){
  study.tratamentos=[t];w._labCompute();
  assert.match(w.document.getElementById('labOut').textContent,/⚠/);
  assert.match(w._labTexto,/RECEITA NÃO LIBERADA/);
  assert.doesNotMatch(w._labTexto,/PIPETAR|PESAR/);
}
study.tratamentos=[{id:'T1',produto:'A',dose:'10'}];study.doseUnidade='';
assert.match(w.calcMemoriaLab(study,cfg).tratamentos[0].erro,/unidade/);
study.tratamentos=[{id:'T1',produto:'Controle positivo',dose:'1 L/ha',testemunha:true}];
assert.equal(w.calcMemoriaLab(study,cfg).tratamentos[0].semPreparo,undefined);
study.tratamentos=[{id:'T1',produto:'Testemunha',dose:'0',testemunha:true}];
assert.equal(w.calcMemoriaLab(study,cfg).tratamentos[0].semPreparo,true);
study.tratamentos=[{id:'T1',produto:'A + B',dose:'60% + 50%'}];
mem=w.calcMemoriaLab(study,cfg);assert.equal(mem.tratamentos[0].liberado,false);
assert.doesNotMatch(w.calcMemoriaLabTexto(mem),/PIPETAR/);
// Reabrir a aba de receita preserva os valores conferidos na sessão.
w.document.body.innerHTML='<div id="calcLabOvl"></div>';
Object.assign(w,{_labSel:{qid:'QA',sid:'s1'},_labStudies:()=>[],
  _labDefs:()=>({vol:50,fonte:'gkg',valor:'500',pureza:'',dens:''})});
w.eval(['_labFonteSel','_labUnidSel','_labVazaoDefault','_labRenderShell','_labSetTab'].map(functionSource).join('\n'));
study.protocolo={volumeCalda:'150 L/ha'};
study.tratamentos=[{id:'T1',produto:'Produto',dose:'1 L/ha'}];
w._labRenderShell();
w.document.getElementById('labVol').value='125';w._labCompute();
w._labSetTab('ia');w._labSetTab('campo');
assert.equal(w.document.getElementById('labVol').value,'125');
assert.match(w._labTexto,/Pote 125,0 mL/);
study.doseModo='ppm';study.tratamentos[0].dose='100';w._labSetTab('ppm');
assert.match(w.document.getElementById('labOut').textContent,/10,00 mg/);
assert.equal(w.document.getElementById('labPpmPureza').disabled,true);
dom.window.close();
console.log('Calculadoras: entradas, densidades, massas, misturas, controles e concordância tela/memória conferidos.');
