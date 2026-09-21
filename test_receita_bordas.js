/* Bordas da receita, todas encontradas DEPOIS da revisão das calculadoras:
   o milhar dos campos em mL, a testemunha que escreve "0 L/ha" e a entrada que
   o motor recusa mas o portão da configuração deixava passar. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const LB=require('./vendor/biocalc-lab-core.js'),BC=require('./vendor/biocalc-campo-core.js');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('app.js','utf8');
const functionSource=name=>{const a=src.indexOf('function '+name+'(');assert.ok(a>=0,name);let depth=0,seen=false;for(let j=a;j<src.length;j++){if(src[j]==='{'){depth++;seen=true;}else if(src[j]==='}'&&--depth===0&&seen)return src.slice(a,j+1);}throw new Error(name);};

const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
Object.assign(w,{BioCalculoLab:LB,BioCalculoCampo:BC});
for(const id of ['calcLen','calcWid','calcPlots','calcVol','calcDead','calcBottles','calcCap','calcCapUn']){
  const el=w.document.createElement('input');el.id=id;el.value='';w.document.body.append(el);
}
const põe=(id,v)=>{w.document.getElementById(id).value=String(v);};
w.eval(['_calcVal','_calcCapAtualL','_calcConfigAtual','_doseZerada','_labPurezaOk','_labDensidadeOk',
  'calcConfigLabCompleta','calcConfigLabFaltando','calcMemoriaLab'].map(functionSource).join('\n'));

/* ---- 1. Volume morto e capacidade chegam aos milhares: o ponto é milhar ---- */
põe('calcLen',10);põe('calcWid',5);põe('calcPlots',4);põe('calcVol',3);põe('calcBottles',1);
põe('calcDead','1.500');põe('calcCap','1.900');põe('calcCapUn','mL');
let cfg=w._calcConfigAtual();
assert.equal(cfg.volumeMortoMl,1500,'"1.500" mL de volume morto não pode virar 1,5 mL');
assert.equal(cfg.capacidadeFrascoL,1.9,'"1.900" mL de frasco não pode virar 0,0019 L');
põe('calcCapUn','L');põe('calcCap','1,9');
assert.equal(w._calcCapAtualL(),1.9);
/* Campo vazio ou ilegível é SEM limite de frasco — nunca NaN na memória gravada. */
for(const lixo of ['','   ','abc','--']){põe('calcCap',lixo);assert.equal(w._calcCapAtualL(),0,lixo);}
/* O zero inicial continua sendo decimal, e o tamanho da parcela também. */
põe('calcDead','0.300');assert.equal(w._calcConfigAtual().volumeMortoMl,.3);
põe('calcLen','1.5');assert.equal(w._calcConfigAtual().parcelaComprimento,1.5);

/* ---- 2. Testemunha sem aplicação: zero com unidade continua sendo zero ---- */
for(const t of ['','0','0 L/ha','0,0 g/ha','0%','0 ppm','-','—'])assert.equal(w._doseZerada(t),true,`"${t}" é dose zerada`);
for(const t of ['1 L/ha','0,5%','abc','-1 L/ha'])assert.equal(w._doseZerada(t),false,`"${t}" não é dose zerada`);
const estudo={id:'s1',doseModo:'campo',doseUnidade:'L/ha',
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'0 L/ha',testemunha:true}]};
const memCfg={doseModo:'campo',volumeMl:50,vazaoLHa:150};
let reg=w.calcMemoriaLab(estudo,memCfg).tratamentos[0];
assert.equal(reg.semPreparo,true,'testemunha com "0 L/ha" dispensa preparo, não dá erro de dose');
assert.equal(reg.erro,undefined);
/* Controle positivo com dose de verdade continua sendo calculado. */
estudo.tratamentos=[{id:'T1',produto:'Controle',dose:'1 L/ha',testemunha:true}];
assert.equal(w.calcMemoriaLab(estudo,memCfg).tratamentos[0].semPreparo,undefined);

/* ---- 3. O portão da configuração recusa o que o motor recusa ---- */
const base={volumeMl:50,doseModo:'campo',vazaoLHa:150,fonteTipo:'gL',fonteValor:'500',pureza:'',densidade:''};
assert.equal(w.calcConfigLabCompleta(base),true);
assert.equal(w.calcConfigLabCompleta({...base,pureza:'0'}),false,'pureza 0 não é 100%');
assert.equal(w.calcConfigLabCompleta({...base,pureza:'101'}),false);
assert.equal(w.calcConfigLabCompleta({...base,densidade:'0'}),false,'densidade 0 não é 1 g/mL');
assert.equal(w.calcConfigLabCompleta({...base,pureza:'80',densidade:'1,2'}),true);
assert.match(w.calcConfigLabFaltando({...base,pureza:'0'}).join(' '),/pureza/);
assert.match(w.calcConfigLabFaltando({...base,densidade:'abc'}).join(' '),/densidade/);
/* O que a tela recusa, o motor também recusa — é a mesma entrada. */
assert.throws(()=>LB.calcPPM({alvoPpm:100,volumeMl:50,fonteTipo:'puro',pureza:'0'}));

/* ---- 4. g/kg é pesagem: não sobra massa equivalente de um ramo de pipeta ---- */
const solido=LB.calcPPM({alvoPpm:100,volumeMl:50,fonteTipo:'gkg',fonteValor:500,densidade:1.2});
assert.equal(solido.acao,'pesar');
assert.equal(solido.massaEquivMg,undefined,'massa equivalente é de líquido pipetado, não de pó pesado');
assert.ok(Math.abs(solido.massaMg-10)<1e-9);

dom.window.close();
console.log('Bordas da receita: milhar em mL, frasco ilegível, testemunha zerada, pureza/densidade e g/kg conferidos.');
