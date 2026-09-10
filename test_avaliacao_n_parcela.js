/* O N da parcela tem de sobreviver à avaliação.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Numa variável do tipo razão n/N, o N é o DENOMINADOR: quantos indivíduos
 * aquela parcela tem. Em ensaio de coleta — um ramo por parcela, cada ramo com
 * o seu número de insetos — o N é propriedade DA PARCELA, e vale para todas as
 * leituras seguintes.
 *
 * A grade da avaliação nova herdava variáveis, tipos e varcfg da anterior, mas
 * `bruto` nascia do `av.bruto` vazio — e o N por parcela mora exatamente ali.
 * Sobrava só o N padrão da variável (varcfg.N), pintado igual em toda linha:
 * quem lançou 17, 23 e 19 via os três virarem 20 na avaliação seguinte, e o
 * percentual saía sobre o denominador errado.
 *
 * O que NÃO pode acontecer: herdar o n. O n (mortos/afetados) é a leitura
 * desta avaliação; repetir o anterior seria inventar dado.
 *
 * Rodar: node test_avaliacao_n_parcela.js
 */
'use strict';
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei a função '+nome+' em app.js');
  let d=0,viu=false,j=i;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;viu=true;} else if(src[j]==='}'&&--d===0&&viu){j++;break;} }
  return src.slice(i,j);
}
let falhas=0, passou=0;
const ck=(ok,n)=>{ if(ok){passou++;console.log('  ok    '+n);} else {falhas++;console.log('  FALHA '+n);} };

const ctx={String,Number,Math,isFinite,isNaN,parseFloat,parseInt,Object,Array,JSON,console};
ctx.window=ctx; ctx.self=ctx; vm.createContext(ctx);
ctx.AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};
['_numBR','_avTipo','_avCfg','_avCel','_avDerivar','_avHerdarN'].forEach(n=>vm.runInContext(pega(n),ctx));

/* coleta de campo: cada ramo tem o seu número de insetos */
const Ns={T1R1:'17',T1R2:'23',T2R1:'19',T2R2:'31'};
const av1={id:'a1',data:'2026-09-10',variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},
           varcfg:{Mortalidade:{N:20}},bruto:{},notas:{}};
Object.keys(Ns).forEach(k=>{ av1.bruto[k]={Mortalidade:{n:'3',N:Ns[k]}}; });

const av2={id:'a2',data:'2026-09-17',variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},
           varcfg:{Mortalidade:{N:20}},bruto:{},notas:{}};
const study={id:'s1',avaliacoes:[av1,av2]};

const grade={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},
             varcfg:{Mortalidade:{N:20}},bruto:{},notas:{}};
ctx._avHerdarN(study, av2, grade);

console.log('\nA avaliação seguinte');
Object.keys(Ns).forEach(k=>{
  const cel=(grade.bruto[k]||{}).Mortalidade||{};
  ck(cel.N===Ns[k], 'parcela '+k+' mantém N='+Ns[k]+' (antes voltava para 20)');
  ck(cel.n==null||cel.n==='', 'parcela '+k+' NÃO herda o n — a leitura é nova');
});
console.log('  e a grade não deriva nada ainda: '+
  JSON.stringify(ctx._avDerivar(ctx._avCfg(grade,'Mortalidade'),(grade.bruto.T1R1||{}).Mortalidade)));
ck(ctx._avDerivar(ctx._avCfg(grade,'Mortalidade'),(grade.bruto.T1R1||{}).Mortalidade)==='',
   'sem o n lançado, o percentual continua vazio');

console.log('\nO denominador certo muda a conta');
grade.bruto.T1R1.Mortalidade.n='5';
ck(ctx._avDerivar(ctx._avCfg(grade,'Mortalidade'),grade.bruto.T1R1.Mortalidade)==='29.41',
   '5 de 17 = 29,41% (com o N errado de 20 daria 25%)');

console.log('\nO que não pode mudar');
const g2={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{Mortalidade:{N:20}},
          bruto:{T1R1:{Mortalidade:{N:'40'}}},notas:{}};
ctx._avHerdarN(study, av2, g2);
ck(g2.bruto.T1R1.Mortalidade.N==='40','N já preenchido nesta grade não é sobrescrito');

const g3={variaveis:['Severidade'],tipos:{Severidade:'pct'},varcfg:{},bruto:{},notas:{}};
ctx._avHerdarN(study, av2, g3);
ck(Object.keys(g3.bruto).length===0,'variável que não é razão não ganha N nenhum');

const g4={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{},bruto:{},notas:{}};
ctx._avHerdarN(study, av1, g4);
ck(Object.keys(g4.bruto).length===0,'a PRIMEIRA avaliação não tem de quem herdar');

/* a mais recente ganha: o ramo foi recontado na segunda leitura */
const av3={id:'a3',data:'2026-09-24',variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},
           varcfg:{Mortalidade:{N:20}},bruto:{T1R1:{Mortalidade:{n:'2',N:'15'}}},notas:{}};
const study3={id:'s1',avaliacoes:[av1,av3,{id:'a4',data:'2026-10-01',variaveis:['Mortalidade'],
              tipos:{Mortalidade:'razao'},varcfg:{},bruto:{},notas:{}}]};
const g5={variaveis:['Mortalidade'],tipos:{Mortalidade:'razao'},varcfg:{},bruto:{},notas:{}};
ctx._avHerdarN(study3, study3.avaliacoes[2], g5);
ck((g5.bruto.T1R1||{}).Mortalidade.N==='15','recontagem posterior manda: vale o N mais recente, não o primeiro');

console.log('\n'+passou+' conferência(s) ok, '+falhas+' falha(s).');
process.exit(falhas?1:0);
