'use strict';
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const c=require('./state-harness.cjs').createContext();
const dom=new JSDOM('<div id="avGridWrap"><input class="av-cell" data-t="T1R1" data-v="Mort" data-b="n"><input class="av-cell" data-t="T1R1" data-v="Mort" data-b="N" value="10"><input class="av-cell" data-t="T1R1" data-v="Mort" data-b="n"><input class="av-cell" data-t="T1R1" data-v="Mort" data-b="N" value="10"></div>');
c.document=dom.window.document;
const av={id:'A',variaveis:['Mort'],tipos:{Mort:'razao'},notas:{},bruto:{},varcfg:{Mort:{N:10}}};
const study={id:'S',numRepeticoes:1,tratamentos:[{id:'T1'}],avaliacoes:[av]};
c.data={Q:{estudos:[study]}};c.curV='Q';c.curSid='S';c.editingAvId='A';c._avGrid=av;
c.avTriagemImediata=()=>{};c.avForenseCompletaAgendar=()=>{};
c._avAutoState=()=>({row:{key:'T1R1'},v:'Mort',campo:'n',total:1});
c.renderAvGrid=()=>{};
for(const n of ['1','7','0']){
 c.avAutoWrite(n);
 assert.equal(av.bruto.T1R1.Mort.n,n);
 assert.equal(Number(av.notas.T1R1.Mort),Number(n)*10);
 for(const el of c.document.querySelectorAll('[data-b="n"]'))assert.equal(el.value,n);
 c._avGravaLocalJa();
 assert.equal(JSON.parse(c.__store['iracema-v7']).Q.estudos[0].avaliacoes[0].bruto.T1R1.Mort.n,n);
}
c.avAutoPreset(5);assert.equal(av.bruto.T1R1.Mort.n,'5');
const sig=c._bioestatSignature(study);av.bruto.T1R1.Mort={n:'10',N:'20'};
assert.notEqual(c._bioestatSignature(study),sig,'mesma porcentagem com outro N invalida a análise');
assert.match(c.posResumo({horas:48,chuvaMm:0,choveu:false,completa:false,coberturaPct:33}),/parcial/);
assert.match(c.posResumo({horas:48,chuvaMm:0,choveu:false,completa:true,coberturaPct:33}),/leituras disponíveis/);
assert.equal(c.posResumo({horas:48,chuvaMm:0,choveu:false,completa:true,coberturaPct:100}),'não choveu nas 48 h seguintes');
console.log('Automático: espelho, zero, atalho, persistência local, cache n/N e chuva parcial OK.');
