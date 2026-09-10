/* O funil de seis colunas entre o Agracta e o motor.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O motor tem modo "Tempo" (sobrevivência, LT50, Kaplan-Meier) e rota de
 * dose-resposta (CL50 com Fieller). Nenhum dos dois era alcançável a partir do
 * Agracta, e por um motivo só: a tabela entregue ao motor passava por
 * `linhasMatrizDeAoa`, que copiava uma LISTA FIXA de campos, e por
 * `colunasBioensaioDeMatriz`, que devolvia uma LISTA FIXA de seis colunas.
 * Tudo que não estivesse nas duas listas era descartado em silêncio.
 *
 *   1. TEMPO. Bioensaio de bancada lê a 2, 12 e 24 HAT — e as três leituras
 *      têm a MESMA data. A tabela levava só `Data_avaliacao`, então as três
 *      viravam linhas indistinguíveis. No modo Tempo isso dava três "Papel
 *      obrigatório ausente" (tempo, n_total, n_vivos) e o botão Analisar
 *      morto. O dado existia: `momento:{valor,unidade}` na avaliação e n/N
 *      por parcela na variável do tipo razão.
 *   2. DOSE. O Agracta já montava a coluna `Dose` (e só quando o ensaio é
 *      mesmo uma série de doses). Ela morria no mesmo funil, então
 *      `decide.py` nunca via `tem_dose` e nunca escolhia a rota de
 *      dose-resposta.
 *   3. E o modo GERAL não pode mudar por causa disso. "tempo_n_vivos" casa
 *      com /viv/ no adivinhador do Geral e viraria uma SEGUNDA resposta — a
 *      análise do mesmo estudo mudaria de resultado só porque alguém passou
 *      pela aba Tempo.
 *
 * Rodar: node test_estatistica_tempo.js
 */
'use strict';
const fs=require('fs'), vm=require('vm'), assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
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

/* ---------------------------------------- lado Agracta: monta a tabela ---- */
const ctx={String,Number,Math,isFinite,isNaN,parseFloat,parseInt,Object,Array,JSON,Date,console};
ctx.window=ctx; ctx.self=ctx; vm.createContext(ctx);
['pD','daysBetween','isoToBR','_fmtMom','avMomento','_numBR','_avRowKey','_avNota','_avTipo','_avCel',
 'studyCultura','_doseSerieDoEstudo','_bioestatEixoTempo','_bioestatContagem','_bioestatAoa']
  .forEach(n=>vm.runInContext(pega(n),ctx));
ctx.LOCAIS={L1:{nome:'Lab'}}; ctx.QLOCAL={Q1:'L1'}; ctx.data={Q1:{estudos:[]}};
ctx.quadraNome=()=>'Bancada'; ctx.studyTestemunha=()=>'T1'; ctx.tratComponentes=()=>[];
ctx.AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};
ctx._calcNum=s=>parseFloat(String(s||'').replace(',','.'));
ctx._calcDoseUnit=s=>String(s||'').replace(/[\d.,\s]/g,'')||'';
ctx.doseUnidadeDe=(st,d)=>ctx._calcDoseUnit(d);

/* bioensaio de bancada: mortalidade razão n/N lida a 2, 12 e 24 HAT */
const N=10, mortos={T1:{2:0,12:1,24:1},T2:{2:3,12:7,24:9},T3:{2:1,12:4,24:6}};
const trats=[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'A'},{id:'T3',produto:'B'}];
const avaliacoes=[2,12,24].map(h=>{
  const av={id:'av'+h,data:'2026-09-10',tipo:'Mortalidade',variaveis:['Mortalidade'],
            momento:{valor:h,unidade:'HAT'},tipos:{Mortalidade:'razao'},
            varcfg:{Mortalidade:{N}},notas:{},bruto:{}};
  trats.forEach(t=>{ for(let r=1;r<=4;r++){
    const key=t.id+'R'+r, n=Math.max(0,Math.min(N,mortos[t.id][h]+r-2));
    av.bruto[key]={Mortalidade:{n:String(n),N:String(N)}};
    av.notas[key]={Mortalidade:String(Math.round(n/N*1e4)/100)};
  }});
  return av;
});
const estudoLab={id:'s1',codigo:'BIO',numRepeticoes:4,tratamentos:trats,avaliacoes,avalUnidade:'horas'};

console.log('\nA tabela que o Agracta entrega (bioensaio em horas)');
const aoaLab=ctx._bioestatAoa('Q1',estudoLab), cab=aoaLab[0];
ck(cab.includes('Tempo'),'leva a coluna Tempo');
ck(cab.includes('N_total')&&cab.includes('N_vivos'),'leva as contagens N_total e N_vivos');
const iT=cab.indexOf('Tempo'), iNT=cab.indexOf('N_total'), iNV=cab.indexOf('N_vivos');
const temposNaTabela=[...new Set(aoaLab.slice(1).map(r=>r[iT]))].sort((a,b)=>a-b);
ck(temposNaTabela.join(',')==='2,12,24','os três momentos HAT chegam distintos (antes as 3 datas eram iguais)');
/* T2 rep1 @24 HAT: 8 mortos de 10 -> 2 vivos */
const l=aoaLab.slice(1).find(r=>r[iT]===24&&r[7]==='T2'&&r[8]===1);
ck(l[iNT]===10&&l[iNV]===2,'N_vivos = avaliados − mortos (10 − 8 = 2)');

console.log('\nO eixo do tempo');
ck(ctx._bioestatEixoTempo(estudoLab).unidade==='HAT','estudo todo em HAT sai em horas');
const umaSo={...estudoLab,avaliacoes:[avaliacoes[0]]};
ck(ctx._bioestatEixoTempo(umaSo)===null,'uma avaliação só não vira eixo de tempo');
const semMomento={...estudoLab,avaliacoes:[{...avaliacoes[0],momento:null,data:'2026-09-10'},
                                           {...avaliacoes[1],momento:null,data:'2026-09-17'}]};
const eixoDias=ctx._bioestatEixoTempo(semMomento);
ck(eixoDias&&eixoDias.unidade==='dias','sem momento declarado o eixo cai para dias da primeira data');
ck(eixoDias&&eixoDias.valores['av2']===0&&eixoDias.valores['av12']===7,'e conta 0 e 7 dias');

/* série de doses legítima: mesmo item, 4 níveis, mesma unidade */
const tratsDose=[{id:'T0',produto:'Delta',testemunha:true,dose:''},{id:'T1',produto:'Delta',dose:'5 g/ha'},
                 {id:'T2',produto:'Delta',dose:'10 g/ha'},{id:'T3',produto:'Delta',dose:'20 g/ha'},
                 {id:'T4',produto:'Delta',dose:'40 g/ha'}];
const avD={id:'a1',data:'2026-09-10',tipo:'Mortalidade',variaveis:['Mortalidade'],notas:{}};
const mm={T0:5,T1:20,T2:45,T3:70,T4:92};
tratsDose.forEach(t=>{for(let r=1;r<=4;r++)avD.notas[t.id+'R'+r]={Mortalidade:String(mm[t.id]+r-2)};});
const estudoDose={id:'s9',codigo:'CL50',numRepeticoes:4,tratamentos:tratsDose,avaliacoes:[avD]};
const aoaDose=ctx._bioestatAoa('Q1',estudoDose);
ck(aoaDose[0].includes('Dose'),'série de doses ainda leva a coluna Dose');

/* --------------------------------- lado motor: o funil deixa passar? ----- */
function motor(aoa){
  const dom=new JSDOM(fs.readFileSync('estatistica/index.html','utf8'),
    {url:'https://agracta.test/estatistica/index.html?agracta_engine=1',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=()=>{}; w.alert=()=>{};
  w.loadPyodide=()=>new Promise(()=>{}); w.fetch=()=>new Promise(()=>{});
  const s=w.document.createElement('script');
  s.textContent=fs.readFileSync('estatistica/app.js','utf8');
  w.document.body.appendChild(s);            /* script clássico: escopo global */
  w.__agractaHandoff({aoa,modo:'analise',titulo:'X',tipos:{Mortalidade:'razao'}});
  return w;
}
console.log('\nO motor, com a tabela do bioensaio em horas');
const wLab=motor(aoaLab);
const geral=wLab.lerPapeis();
ck(geral.resposta==='Mortalidade','no Geral a resposta continua sendo a variável');
ck(!JSON.stringify(geral).includes('tempo_n_vivos'),'as colunas do modo Tempo não invadem o Geral');
ck(wLab.avaliarPipelineAtual().bloqueia===false,'o modo Geral segue liberado');
wLab.setModo('tempo');
const pT=wLab.lerPapeisTempo();
['tratamento','tempo','n_total','n_vivos'].forEach(k=>ck(!!pT[k],'modo Tempo tem o papel obrigatório "'+k+'"'));
const infoT=wLab.avaliarPipelineAtual();
ck(infoT.bloqueia===false&&infoT.criticos===0,'modo Tempo não bloqueia mais (era 3 críticos)');
ck(wLab.document.getElementById('btn-analisar').disabled===false,'o botão Analisar fica habilitado');
wLab.setModo('analise');
ck(wLab.avaliarPipelineAtual().bloqueia===false,'ida e volta entre as abas não quebra o Geral');

console.log('\nO motor, com a série de doses');
const wD=motor(aoaDose);
ck(wD.lerPapeis().dose==='dose','a dose chega COM papel (senão a rota nunca é escolhida)');
ck(wD.avaliarPipelineAtual().bloqueia===false,'a análise da série de doses segue liberada');
ck(wD.setModo('tempo')===undefined&&wD.avaliarPipelineAtual().bloqueia===true,
   'ensaio de uma data só continua barrado no modo Tempo — sem eixo, sem curva');

console.log('\n'+passou+' conferência(s) ok, '+falhas+' falha(s).');
process.exit(falhas?1:0);
