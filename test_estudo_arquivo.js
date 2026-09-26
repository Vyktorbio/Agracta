/* O arquivo de finalizações anteriores mora fora do documento do estudo.
 *
 * O QUE ACONTECEU (26/09/2026)
 *   Cada reabertura guarda a finalização inteira (com rubrica desenhada antiga,
 *   ~110 KB) dentro do estudo. O maior estudo já tinha 463 KB com 3 reaberturas;
 *   mais algumas e ele passaria de 1 MB — o Firestore recusa, e aí NADA daquele
 *   aparelho sobe mais.
 *
 * O QUE ESTE TESTE TRANCA
 *   [1] o estudo vai para a nuvem sem o arquivo; cada finalização arquivada
 *       vira um documento em `estudos_arquivo`, gravado ANTES de `estudos`;
 *   [2] ida e volta devolve o estudo idêntico;
 *   [3] aparelho em versão antiga (grava o arquivo dentro do estudo, e não lê
 *       `estudos_arquivo`) não faz nada sumir: a leitura junta os dois lados;
 *   [4] documento acima de 1 MB é dito pelo nome.
 *
 * Rodar: node test_estudo_arquivo.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const src=fs.readFileSync('firebase-sync.js','utf8');
const store={};
const ctx={console:{log(){},warn(){},error(){}},Promise,setTimeout,clearTimeout,Date,JSON,Object,Array,String,Number,Math,
  encodeURIComponent,decodeURIComponent,escape,unescape,Buffer,
  localStorage:{getItem:k=>store[k]==null?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
  sessionStorage:{getItem:()=>null,setItem(){}},location:{reload(){}},
  document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){},visibilityState:'visible'},
  addEventListener(){},cloudState:()=>null,cloudPull(){},cloudSave(){}};
ctx.window=ctx;ctx.globalThis=ctx;ctx.btoa=s=>Buffer.from(s,'binary').toString('base64');
vm.createContext(ctx);vm.runInContext(src,ctx);
const F=ctx.AgractaFirebase;
const stable=v=>v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(stable).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}';
const B=v=>Buffer.byteLength(JSON.stringify(v));
const rubrica='data:image/png;base64,'+'A'.repeat(110000);
const fin=i=>({finalizacao:{rubrica,em:'2026-09-2'+i+'T10:00:00Z'},estatistica:{x:i},reabertoEm:'2026-09-2'+i+'T12:00:00.000Z',reabertoPor:'a@x',reabertoNome:'Ana',motivo:'erro '+i});
const estado=()=>({data:{Q1:{cultura:'soja',estudos:[{id:'S1',codigo:'AGR-1',audit:[{a:1}],finalizacoesAnteriores:[fin(1),fin(2),fin(3)],
  aplicacoes:[],avaliacoes:[]}]}},qnome:{Q1:'Q1'}});

console.log('\n[1] estudo leve na nuvem, arquivo à parte');
const st=estado(),flat=F.splitState(st);
const doc=Object.values(flat.estudos)[0];
ok(!('finalizacoesAnteriores' in doc.data),'o estudo vai sem o arquivo');
ok(B(doc)<5000,'o documento do estudo caiu para '+B(doc)+' bytes (com o arquivo: ~'+Math.round(B(st.data.Q1.estudos[0])/1024)+' KB)');
const arq=Object.values(flat.estudos_arquivo);
ok(arq.length===3&&arq.every(r=>r.estudoId==='S1'&&r.tipo==='finalizacaoAnterior'&&B(r)<1000000),'uma finalização arquivada por documento, cada um bem abaixo de 1 MB');
ok(/'quadras','estudos_arquivo','estudos'/.test(src),'o arquivo é gravado antes do estudo');

console.log('\n[2] ida e volta');
const volta=F.buildState(JSON.parse(JSON.stringify(flat)),{rev:1});
ok(stable(volta.data.Q1.estudos[0].finalizacoesAnteriores)===stable(st.data.Q1.estudos[0].finalizacoesAnteriores),'o arquivo volta idêntico e na ordem');
ok(stable(F.splitState(volta))===stable(flat),'nuvem → aparelho → nuvem não muda nada');

console.log('\n[3] aparelho em versão antiga não apaga o arquivo');
/* versão antiga leu o estudo sem o arquivo, reabriu de novo e gravou o estudo INTEIRO com só o item novo dentro */
const velho=JSON.parse(JSON.stringify(flat));
const d=Object.keys(velho.estudos)[0];
velho.estudos[d].data.finalizacoesAnteriores={_agractaArray:true,_agractaLength:1,_agractaItems:{0:JSON.parse(JSON.stringify(fin(4)))}};
const lido=F.buildState(velho,{rev:2}).data.Q1.estudos[0].finalizacoesAnteriores;
ok(lido.length===4&&lido.map(x=>x.motivo).join()==='erro 1,erro 2,erro 3,erro 4','junta o que está nos dois lados, sem repetir, em ordem');
const repetido=JSON.parse(JSON.stringify(flat));
repetido.estudos[d].data.finalizacoesAnteriores={_agractaArray:true,_agractaLength:1,_agractaItems:{0:JSON.parse(JSON.stringify(fin(2)))}};
ok(F.buildState(repetido,{rev:3}).data.Q1.estudos[0].finalizacoesAnteriores.length===3,'item que está nos dois lados não duplica');
const regravado=F.splitState(F.buildState(velho,{rev:2}));
ok(Object.keys(regravado.estudos_arquivo).length===4&&!('finalizacoesAnteriores' in Object.values(regravado.estudos)[0].data),'a versão nova tira o item de dentro do estudo na próxima gravação');
const semArquivo=estado();semArquivo.data.Q1.estudos[0].finalizacoesAnteriores=[];
ok(Object.keys(F.splitState(semArquivo).estudos_arquivo).length===0,'estudo sem reabertura não cria arquivo');

console.log('\n[4] documento acima de 1 MB é dito pelo nome');
ok(/_documentoGrandeDemais\(next\)/.test(src)&&/passou de 1 MB/.test(src),'a tela diz qual documento passou do limite');
const trecho=src.slice(src.indexOf('  function _documentoGrandeDemais('),src.indexOf('  /* Envio que falhou tenta de novo sozinho'));
const c2={window:{VersoesCore:require('./vendor/versoes-core.js')},Object,Math,String};vm.createContext(c2);vm.runInContext(trecho,c2);
const g=c2._documentoGrandeDemais({estudos:{x:{id:'S9',data:{codigo:'AGR-9',p:'x'.repeat(1100000)}}},avaliacoes:{y:{d:1}}});
ok(g&&g.nome==='o estudo AGR-9'&&g.kb>1000,'aponta "o estudo AGR-9"');
ok(c2._documentoGrandeDemais({estudos:{x:{id:'S1',data:{}}}})===null,'nada acima do limite: não acusa');

console.log('\nArquivo de finalizações: '+n+' verificações.');
