/* A tela, a memória e a troca de tratamentos devem usar a mesma receita. */
const assert=require('assert/strict'), fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,nome);
  let d=0,viu=false,j=i;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'&&--d===0&&viu){j++;break;}
  }
  return src.slice(i,j);
}
const dom=new JSDOM('<div id="calcOvl"></div>',{url:'https://agracta.test',runScripts:'outside-only'});
const w=dom.window;
const estudos={s1:{id:'s1',codigo:'DRONE',numRepeticoes:4,volumeMorto:300,numFrascos:1,capacidadeFrasco:2,
  protocolo:{volumeCalda:'3 L/ha'},tratamentos:[
    {id:'T1',produto:'Produto + Adjuvante',dose:'1,5 L/ha + 0,033%',metodo:'drone'},
    {id:'T2',produto:'Produto',dose:'1,5 L/ha',metodo:'co2'}]},
  s2:{id:'s2',codigo:'OUTRO',numRepeticoes:4,protocolo:{volumeCalda:'200 L/ha'},tratamentos:[{id:'T1',produto:'Produto',dose:'1 L/ha',metodo:'co2'}]}};
Object.assign(w,{
  BioCalculoCampo:require('./vendor/biocalc-campo-core.js'),DroneCore:require('./vendor/drone-core.js'),DoseCore:require('./vendor/dose-core.js'),
  _calcSel:{qid:'Q1',sid:'s1'},_calcAba:'T1',_calcVolAmbiguo:null,_calcDetalhe:false,_calcCfgAberta:false,
  _calcInputDrafts:Object.create(null),_calcRenderKey:null,APLIC_METODOS_CURTO:{drone:'drone',co2:'costal CO₂'},TRAT_COMP_UNIDADES:[],
  _calcStudy:()=>estudos[w._calcSel.sid],_calcAllStudies:()=>Object.values(estudos).map(s=>({qid:'Q1',sid:s.id,label:s.codigo})),
  _parseParcelaDim:()=>({comprimento:20,largura:11}),_calcParcelaDefault:()=>({comprimento:20,largura:11}),
  _calcSalvarParcela:()=>{},_calcMemSync:()=>{},_calcBarraSync:()=>{},quadraNome:()=> 'Área',
  studyMetodosVariam:s=>new Set(s.tratamentos.map(t=>t.metodo)).size>1,tratMetodo:(s,q,t)=>t.metodo,
  esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))
});
const nomes=['_numBR','_calcNum','_calcVal','_calcCapAtualL','_calcDoseUnit','calcAbas','calcAbaAtual','calcAbaVizinha','calcAba','_calcPick','calcCfgResumo','_calcFinalizado','tratComponentes','tratTemReceita','_seCompUnidadeNormalizar','_seCompUnidadeOptions','calcVolumeDoEstudo','calcVolumeDoTratamento','calcVolumeAmbiguoHtml','calcConfirmarVolume','_calcRememberInputs','_calcRenderShell','_calcCompute','_calcConfigAtual','calcMemoria','_bioestatP','_bioestatResumoCard'];
w.eval(nomes.map(pega).join('\n'));
w.eval(fs.readFileSync('calculadora-drone.js','utf8'));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const html=()=>w.document.getElementById('calcResults').innerHTML;
w._calcRenderShell();
assert.match(html(),/Confirme a carga mínima/);
assert.doesNotMatch(html(),/class="calc-prep/);
const voo={minimumOperatingMl:'1700',tankCapacity:'20',speed:'20,2',width:'11',height:'3',minFlow:'1,111',maxFlow:'16',observedFlow:'1,111',swathConfirmed:true};
Object.entries(voo).forEach(([k,v])=>w.calcDroneSet(k,v));
assert.match(html(),/PREPARAR/);
assert.match(html(),/1,7 L/);
assert.match(html(),/850 mL/);
let mem=w.calcMemoria(estudos.s1,w._calcConfigAtual());
let r=mem.tratamentos[0];
near(r.caldaTotalMl,1700);near(r.componentes[0].total,850);near(r.componentes[1].total,.561);
near(r.aplicadoMl,264);near(r.residualMl,1436);assert.equal(r.aplicacaoConferida,true);
near(mem.tratamentos[1].caldaTotalMl,564);assert.equal(mem.tratamentos[1].drone,null);
// O primeiro tratamento não é uma testemunha implícita na memória.
assert.equal(r.testemunha,false);assert.ok(r.componentes.length);
estudos.s1.tratamentos[0].dose='1,5 L/ha + 0.033%';w._calcCompute();
near(w.calcMemoria(estudos.s1,w._calcConfigAtual()).tratamentos[0].componentes[1].total,.561);
assert.match(html(),/561 µL/,'dose com ponto conserva a quantidade na tela');
near(w._calcNum('0.125'),.125);
w.calcDroneSet('minimumOperatingMl','1.700');
near(w.calcMemoria(estudos.s1,w._calcConfigAtual()).tratamentos[0].caldaTotalMl,1700);
w.calcDroneSet('minimumOperatingMl','1700');
// A alteração de parcela e unidade permanece ao trocar de aba ou estudo.
w.document.getElementById('calcLen').value='25';
w.document.getElementById('calcCap').value='1900';
w.document.getElementById('calcCapUn').value='mL';
w._calcCompute();w.calcAba('T2');
assert.equal(w.document.getElementById('calcLen').value,'25');
near(w._calcConfigAtual().capacidadeFrascoL,1.9);
assert.match(html(),/630 mL/);
w._calcPick('Q1|s2');assert.equal(w.document.getElementById('calcLen').value,'20');
assert.equal(w.calcDroneConfig().minimumOperatingMl,undefined);
w._calcPick('Q1|s1');w.calcAba('T1');
assert.equal(w.document.getElementById('calcLen').value,'25');
assert.equal(w.calcDroneConfig().minimumOperatingMl,'1700');
near(w.calcMemoria(estudos.s1,w._calcConfigAtual()).tratamentos[0].aplicadoMl,330);
// Mudar a altura invalida a confirmação de deposição, sem apagar as medidas.
w.calcDroneSet('height','4');
assert.equal(w.calcDroneConfig().swathConfirmed,false);
assert.equal(w.document.getElementById('calcDroneSwath').checked,false);
assert.match(html(),/CALDA PLANEJADA/);
assert.equal(w.calcMemoria(estudos.s1,w._calcConfigAtual()).tratamentos[0].aplicacaoConferida,false);
// Valores ajustados usam o erro do modelo; transformação não gera CV híbrido.
w.isoToBR=x=>x;
const rel={ok:true,analise:{mse:4},descritiva:[{tratamento:'T1',media:10,dp:7,n:4}],comparacao_medias:{ajustadas:{metodo:'Holm',ajustadas:true,medias:{T1:12},erros_padrao:{T1:.5},ordem:['T1']}}};
let card=w._bioestatResumoCard({variavel:'Resposta',date:'2026-09-09'},rel);
assert.match(card,/Média ajustada/);assert.match(card,/>±EP</);assert.match(card,/±0,5/);
rel.analise.transformacao='log';
card=w._bioestatResumoCard({variavel:'Resposta',date:'2026-09-09'},rel);
assert.doesNotMatch(card,/CV residual/);
// Confirmar um volume ambíguo deve atualizar também o campo preservado.
estudos.s3={...estudos.s2,id:'s3',protocolo:{volumeCalda:'1,5 L água (TOTAL 3,0 L/ha)'}};
w._calcPick('Q1|s3');assert.match(html(),/CONFIRME O VOLUME/);
w.calcConfirmarVolume(3);
near(w._calcConfigAtual().volumeCaldaLHa,3);
assert.match(html(),/PREPARAR/);assert.doesNotMatch(html(),/CONFIRME O VOLUME/);
dom.window.close();
console.log('Integração: receita na tela e na memória, métodos distintos, troca de estudo e validade da calibração conferidos.');
