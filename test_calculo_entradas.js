'use strict';
const assert=require('node:assert/strict'),B=require('./vendor/biocalc-campo-core.js');
const base={sprayVolume:3,plotLength:20,plotWidth:11,numPlots:4,numBottles:1,deadVolumeMl:300,minimumOperatingMl:1700,bottleCapacity:2};
for(const texto of ['0.033%','0,033%']){
  const p=B.parseComponents('Adjuvante',texto,'L/ha');
  assert.equal(p.problems.length,0);assert.equal(p.components[0].valor,.033);
  assert.equal(B.calculateMixture({...base,components:p.components}).components[0].total,.561,'0,033% de 1700 mL = 0,561 mL');
}
assert.equal(B.parseDose('1.500 g/ha').valor,1500);
assert.equal(B.parseDose('0.125 L/ha').valor,.125);
assert.equal(B.parseDose('1.500%').valor,1.5,'em porcentagem, o ponto é decimal');
for(const texto of ['500 mg/ha','2 g/L','1,5 lixo','1,2,3 L','0,2% m/v']){
  assert.ok(B.parseComponents('Produto',texto,'L/ha').problems.length,texto+' deve ser recusado, sem mudar a unidade');
}
for(const valor of ['1,5abc','1,2,3',-1,0,Infinity]){
  const p=B.parseStructuredComponents([{nome:'Produto',valor,unidade:'L/ha'}],'L/ha');
  assert.ok(p.problems.length,'dose inválida não passa pela receita estruturada');
  assert.throws(()=>B.calculateMixture({...base,components:[{nome:'Produto',valor,unidade:'L/ha'}]}));
}
assert.throws(()=>B.calculateMixture({...base,components:[{nome:'Produto',valor:3,unidade:'mg/ha'}]}),/Unidade/);
console.log('Dose: ponto e vírgula decimal, milhar, percentuais, unidades e entradas inválidas.');
