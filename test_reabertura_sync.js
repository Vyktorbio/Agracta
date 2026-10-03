/* REABRIR TEM DE VALER EM TODOS OS APARELHOS
 *
 * Reabrir um estudo apaga `finalizacao`. A mescla entre aparelhos junta o
 * estudo CAMPO a campo: a cópia mais nova vence nos campos que tem, mas um
 * campo que ela NÃO tem vinha da cópia velha. O `finalizacao` apagado voltava
 * da nuvem, o estudo reaparecia fechado no PC e nos outros celulares (e no
 * próprio celular depois do sync), e as avaliações lançadas depois da
 * reabertura eram barradas por "estudo finalizado".
 *
 * Regra: quem decide é a trilha de auditoria, que já é unida entre os
 * aparelhos. O último registro entre "Finalização do Estudo" e "Reabertura do
 * Estudo" diz se o estudo está fechado ou aberto.
 *
 * Rodar: node test_reabertura_sync.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');assert(i>=0,'não achei '+nome);
  let j=i,d=0,viu=false;
  for(;j<src.length;j++){if(src[j]==='{'){d++;viu=true;}else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}}
  return src.slice(i,j);
}
const ctx={};vm.createContext(ctx);
['_vivoTomb','_mergeById','_mergeTombs','_mergeTrilha','_mergeAplicacao','_mergeMemorias','_mergeAval','_mergeCondInicial','_estadoFechamentoPelaTrilha','_mergeStudy'].forEach(n=>vm.runInContext(pega(n),ctx));
['avDupla','avAvaliadores','avConsolidar','_avNum'].forEach(n=>vm.runInContext(pega(n),ctx));
vm.runInContext("var APL_REGISTROS=[];var AV_AVALIADORES=['A','B'];",ctx);

const fin={em:'2026-09-20T10:00:00.000Z',por:'a@x',nome:'Ana',rubrica:'data:,',nResultados:3};
const tFin=Date.parse('2026-09-20T10:00:00Z'),tReab=Date.parse('2026-09-24T09:00:00Z');
const eFin={ts:tFin,iso:'2026-09-20T10:00:00.000Z',action:'Finalização do Estudo',details:'Estudo finalizado'};
const eReab={ts:tReab,iso:'2026-09-24T09:00:00.000Z',action:'Reabertura do Estudo',details:'Reaberto. Motivo: "corrigir"'};
const base=()=>({id:'S1',codigo:'E1',tratamentos:[{id:'T1'}],avaliacoes:[],aplicacoes:[]});

/* Nuvem/PC: ainda finalizado. Celular: reabriu depois e lançou uma avaliação. */
const nuvem=Object.assign(base(),{_ts:tFin,finalizacao:fin,estatisticaFinal:{itens:[1,2,3]},audit:[eFin]});
const celular=Object.assign(base(),{_ts:tReab+5000,audit:[eFin,eReab],finalizacoesAnteriores:[{finalizacao:fin,motivo:'corrigir'}],
  avaliacoes:[{id:'AV9',data:'2026-09-24',_ts:tReab+5000,variaveis:['Sev'],notas:{T1R1:{Sev:'12'}}}]});

for(const [nome,a,b] of [['celular local, nuvem remota',celular,nuvem],['PC local, celular remoto',nuvem,celular]]){
  const m=ctx._mergeStudy(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.equal(m.finalizacao,undefined,nome+': reaberto continua aberto');
  assert.equal(m.estatisticaFinal,undefined,nome+': estatística congelada sai (fica em finalizacoesAnteriores)');
  assert.equal(m.finalizacoesAnteriores.length,1,nome+': finalização anterior arquivada');
  assert.equal(m.avaliacoes.length,1,nome+': avaliação feita após reabrir chega');
  assert.equal(m.audit.length,2,nome+': trilha unida');
}

/* Finalizou de novo depois de reabrir: volta fechado em todos. */
const tFin2=Date.parse('2026-09-25T08:00:00Z'),fin2=Object.assign({},fin,{em:'2026-09-25T08:00:00.000Z'});
const eFin2={ts:tFin2,iso:fin2.em,action:'Finalização do Estudo',details:'Estudo finalizado'};
const refinal=Object.assign(base(),{_ts:tFin2,finalizacao:fin2,estatisticaFinal:{itens:[1]},audit:[eFin,eReab,eFin2]});
for(const [a,b] of [[refinal,celular],[celular,refinal]]){
  const m=ctx._mergeStudy(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.equal(m.finalizacao&&m.finalizacao.em,fin2.em,'finalizado de novo prevalece');
  assert.equal(m.audit.length,3);
}

/* Finalização nova num aparelho, cópia aberta antiga no outro: continua fechado
   (a proteção de "finalizado não volta aberto" segue valendo). */
const aberto=Object.assign(base(),{_ts:tFin-100000,audit:[]});
const fechado=Object.assign(base(),{_ts:tFin,finalizacao:fin,estatisticaFinal:{itens:[1]},audit:[eFin]});
for(const [a,b] of [[aberto,fechado],[fechado,aberto]]){
  const m=ctx._mergeStudy(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.equal(m.finalizacao&&m.finalizacao.em,fin.em,'finalizado não volta aberto');
}

/* Dado antigo sem trilha: comportamento de antes (nada é apagado). */
const semTrilhaA=Object.assign(base(),{_ts:1,finalizacao:fin}),semTrilhaB=Object.assign(base(),{_ts:2});
assert.equal(ctx._mergeStudy(semTrilhaB,semTrilhaA).finalizacao.em,fin.em,'sem trilha: não apaga nada');

/* Leitura dupla: A lê no celular 1, B no celular 2. Nenhuma leitura some, e a média é refeita. */
const avA={id:'AV1',data:'2026-09-24',_ts:100,duplaLeitura:true,variaveis:['Sev'],notas:{},avaliadores:{A:{nome:'Ana',notas:{T1R1:{Sev:'10'},T1R2:{Sev:'20'}}},B:{nome:'',notas:{}}}};
const avB={id:'AV1',data:'2026-09-24',_ts:200,duplaLeitura:true,variaveis:['Sev'],notas:{},avaliadores:{A:{nome:'',notas:{}},B:{nome:'Bia',notas:{T1R1:{Sev:'30'}}}}};
for(const [a,b] of [[avA,avB],[avB,avA]]){
  const m=ctx._mergeAval(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  assert.deepEqual(JSON.parse(JSON.stringify(m.avaliadores.A.notas)),{T1R1:{Sev:'10'},T1R2:{Sev:'20'}},'leitura de A preservada');
  assert.deepEqual(JSON.parse(JSON.stringify(m.avaliadores.B.notas)),{T1R1:{Sev:'30'}},'leitura de B preservada');
  assert.equal(m.avaliadores.A.nome,'Ana');assert.equal(m.avaliadores.B.nome,'Bia');
  assert.equal(m.notas.T1R1.Sev,20,'média dos dois refeita');assert.equal(m.notas.T1R2.Sev,20,'só A leu: vale A');
}
/* Os dois leram a mesma célula de A (correção): vence o lado mais novo. */
const velho={id:'AV1',_ts:100,duplaLeitura:true,notas:{},avaliadores:{A:{notas:{T1R1:{Sev:'10'}}},B:{notas:{}}}};
const novo={id:'AV1',_ts:300,duplaLeitura:true,notas:{},avaliadores:{A:{notas:{T1R1:{Sev:'15'}}},B:{notas:{}}}};
assert.equal(ctx._mergeAval(velho,novo).avaliadores.A.notas.T1R1.Sev,'15');
assert.equal(ctx._mergeAval(JSON.parse(JSON.stringify(novo)),JSON.parse(JSON.stringify(velho))).avaliadores.A.notas.T1R1.Sev,'15');

/* Croqui tirado do mapa num aparelho: a remoção (null) do lado mais novo vence. */
const comCroqui=Object.assign(base(),{_ts:100,croqui:{lat:-22,lng:-47}}),semCroqui=Object.assign(base(),{_ts:200,croqui:null});
assert.equal(ctx._mergeStudy(JSON.parse(JSON.stringify(comCroqui)),JSON.parse(JSON.stringify(semCroqui))).croqui,null,'croqui removido não volta');
assert.equal(ctx._mergeStudy(JSON.parse(JSON.stringify(semCroqui)),JSON.parse(JSON.stringify(comCroqui))).croqui,null,'croqui removido não volta (ordem inversa)');
assert.match(src,/function removerCroqui[\s\S]{0,400}st\.croqui=null/,'removerCroqui grava null, não delete');

console.log('Leitura dupla entre aparelhos: A e B preservados, média refeita, correção mais nova vence OK.');
console.log('Reabertura entre aparelhos: reaberto fica aberto, refinalizado fica fechado, finalizado não volta aberto e dado sem trilha não muda OK.');
