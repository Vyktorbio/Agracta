'use strict';
const assert=require('node:assert/strict');
const {createContext}=require('./state-harness.cjs');
const c=createContext();
const study={id:'S',avaliacoes:[{id:'A',variaveis:['v1','Severidade','Razao','Classe'],tipos:{v1:'pct',Severidade:'contagem',Razao:'razao',Classe:'escala'},notas:{T1R1:{v1:10}}}]};
// O job agregado por variável já traz o tipo configurado e não possui avId.
// A classificação atual distingue contagens reguladas e estimativas visuais.
for(const [variavel,tipo,expected] of [
 ['v1','pct','cont'],['Severidade','contagem','count'],['Severidade','pct','pct'],
 ['Lagartas','pct','cont'],['Estande plantas','contagem','cont'],
 ['Razao','razao','cont'],['Classe','escala','pct']
])assert.equal(c._bioestatForenseTipo({variavel,tipo}),expected,variavel+' / '+tipo);
assert.equal(c._bioestatForenseTipo({variavel:'Nova'}),'cont','tipo desconhecido não recebe teste de Poisson');
const sig=c._bioestatSignature(study);study.avaliacoes[0].tipos.v1='contagem';assert.notEqual(c._bioestatSignature(study),sig,'alterar o tipo invalida resultado guardado');
const sig2=c._bioestatSignature(study);study.avaliacoes[0].varcfg={v1:{N:100}};assert.notEqual(c._bioestatSignature(study),sig2,'alterar denominador também invalida');
console.log('Forense: tipo configurado, estimativa visual, contagem regulada, organismo, razão, escala e cache OK.');
