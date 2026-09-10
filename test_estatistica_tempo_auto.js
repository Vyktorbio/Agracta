/* A curva de sobrevivência tem de nascer sozinha no painel.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O painel automático calcula UMA avaliação por vez: cada cartão é um par
 * (avaliação, variável). Sobrevivência no tempo é o contrário — precisa das
 * leituras TODAS juntas —, então nunca teve como virar cartão. Restava o
 * caminho manual: abrir "Configurar análise", trocar para a aba Tempo, mandar
 * rodar. Três botões para a análise que é a razão de existir do bioensaio.
 *
 * E havia um beco atrás disso: `renderRelatorioTempo` não chamava
 * `_agractaEmitirResultado`. O modo Tempo rodava, desenhava na tela do motor,
 * e nada voltava para o Agracta — nenhum cartão automático seria possível
 * mesmo que o job existisse.
 *
 * Terceira armadilha: o importador abre na PRIMEIRA data, e as colunas são
 * montadas antes de `setModo`. Num ensaio de campo com datas diferentes, o
 * modo Tempo receberia um ponto só.
 *
 * Rodar: node test_estatistica_tempo_auto.js
 */
'use strict';
const fs=require('fs'), vm=require('vm');
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

const ctx={String,Number,Math,isFinite,isNaN,parseFloat,parseInt,Object,Array,JSON,Date,console};
ctx.window=ctx; ctx.self=ctx; vm.createContext(ctx);
['pD','daysBetween','isoToBR','_fmtMom','avMomento','_numBR','_avRowKey','_avNota','_avTipo','_avCel',
 'esc','studyCultura','_doseSerieDoEstudo','_bioestatEixoTempo','_bioestatContagem','_bioestatAoa',
 '_bioestatTempoAoa','_bioestatJobsTempo','_bioestatDecisaoHtml','_bioestatTempoCard']
  .forEach(n=>vm.runInContext(pega(n),ctx));
ctx.LOCAIS={L1:{nome:'Lab'}}; ctx.QLOCAL={Q1:'L1'}; ctx.data={Q1:{estudos:[]}};
ctx.quadraNome=()=>'Bancada'; ctx.studyTestemunha=()=>'T1'; ctx.tratComponentes=()=>[];
ctx.AV_TIPOS={pct:1,contagem:1,razao:1,escala:1};

function bioensaio(tipoVar,momentos,datas){
  const N=10, base={T1:0,T2:4,T3:2};
  const trats=[{id:'T1',produto:'Test.',testemunha:true},{id:'T2',produto:'A'},{id:'T3',produto:'B'}];
  const avs=momentos.map((h,k)=>{
    const av={id:'av'+k,data:(datas?datas[k]:'2026-09-10'),tipo:'Mortalidade',variaveis:['Mortalidade'],
              tipos:{Mortalidade:tipoVar},varcfg:{Mortalidade:{N}},notas:{},bruto:{}};
    if(momentos[k]!=null && !datas) av.momento={valor:h,unidade:'HAT'};
    trats.forEach(t=>{ for(let r=1;r<=4;r++){
      const key=t.id+'R'+r, n=Math.min(N, base[t.id]*(k+1)+((r-2)>0?1:0));
      av.bruto[key]={Mortalidade:{n:String(n),N:String(N)}};
      av.notas[key]={Mortalidade:String(Math.round(n/N*1e4)/100)};
    }});
    return av;
  });
  return {id:'s1',codigo:'BIO',numRepeticoes:4,tratamentos:trats,avaliacoes:avs};
}

console.log('\nO job da curva existe sozinho');
const lab=bioensaio('razao',[2,12,24]);
const jt=ctx._bioestatJobsTempo('Q1',lab);
ck(jt.length===1,'um job de tempo por variável razão');
ck(jt[0].jobKey==='__tempo__|Mortalidade','a chave não colide com as por-avaliação');
ck(jt[0].unidade==='HAT','carrega a unidade do eixo');
const cab=jt[0].aoa[0], iT=cab.indexOf('Tempo'), iV=cab.indexOf('Variavel');
const temposJob=[...new Set(jt[0].aoa.slice(1).map(r=>r[iT]))].sort((a,b)=>a-b);
ck(temposJob.join(',')==='2,12,24','a tabela do job traz as TRÊS leituras juntas');
ck(jt[0].aoa.slice(1).every(r=>r[iV]==='Mortalidade'),'e só a variável dele');

console.log('\nQuando NÃO deve nascer');
ck(ctx._bioestatJobsTempo('Q1',bioensaio('pct',[2,12,24])).length===0,
   'variável em % não vira curva — sobrevivência se conta em indivíduos');
ck(ctx._bioestatJobsTempo('Q1',bioensaio('razao',[2])).length===0,'uma leitura só não é curva');
ck(ctx._bioestatJobsTempo('Q1',{...lab,desenho:'faixas'}).length===0,'faixas continuam fora');

console.log('\nO cartão');
const rel={ok:true,tipo_analise:'Mortalidade / sobrevivência no tempo',controle:'T1',correcao:'Abbott',
  tempos:[2,12,24],
  letras_mortalidade:[{tempo:2,letras:{T1:'b',T2:'a',T3:'ab'}},{tempo:24,letras:{T1:'c',T2:'a',T3:'b'}}],
  kaplan_meier:{curvas:[{tratamento:'T1',LT50:null,LT90:null,n:40,mortes:2},
                        {tratamento:'T2',LT50:8.4,LT90:19.7,n:40,mortes:33},
                        {tratamento:'T3',LT50:15.1,LT90:null,n:40,mortes:21}],
                logrank:{qui2:28.4,gl:2,p:0.0000007,significativo:true}},
  qa_qc:{impossiveis:0,duplicatas:0,monotonicidade:2,controle:[{tempo:24,mort_media:31,ok_mort:false}]},
  avisos:['Controle acima do limite em 24 h.']};
const card=ctx._bioestatTempoCard(jt[0],rel,'Q1','s1');
ck(/8,4 h/.test(card),'TL50 aparece na unidade do eixo');
ck(/19,7 h/.test(card),'TL90 também');
ck(/33\/40/.test(card),'mortes sobre expostos');
ck(/log-rank/i.test(card)&&/&lt;0,001/.test(card),'o log-rank compara as curvas inteiras');
ck(/>a</.test(card),'as letras do último tempo entram');
ck(/AUMENTOU no tempo/.test(card),'vivo que "ressuscita" é alertado, não escondido');
ck(/mortalidade do controle alta/.test(card),'controle fora do limite é alertado');
ck(/Como esta análise foi decidida/.test(card),'os avisos do motor ficam disponíveis');
ck(/_bioestatBaixarJson/.test(card),'e o relatório completo em JSON');
const ruim=ctx._bioestatTempoCard(jt[0],{ok:false,erro:'sem tempo>0'},'Q1','s1');
ck(/sem tempo&gt;0/.test(ruim),'falha diz o motivo em vez de sumir');

/* ---------------------------------------- lado motor ---------------------- */
function motor(aoa,modo){
  const dom=new JSDOM(fs.readFileSync('estatistica/index.html','utf8'),
    {url:'https://agracta.test/estatistica/index.html?agracta_engine=1',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.scrollTo=()=>{}; w.HTMLElement.prototype.scrollIntoView=()=>{}; w.alert=()=>{};
  w.loadPyodide=()=>new Promise(()=>{}); w.fetch=()=>new Promise(()=>{});
  const s=w.document.createElement('script');
  s.textContent=fs.readFileSync('estatistica/app.js','utf8');
  w.document.body.appendChild(s);
  w.__agractaHandoff({aoa,modo,titulo:'X',tipos:{Mortalidade:'razao'}});
  return w;
}
console.log('\nO motor recebe o job de tempo pronto para rodar');
const w1=motor(jt[0].aoa,'tempo');
const p1=w1.lerPapeisTempo();
['tratamento','tempo','n_total','n_vivos'].forEach(k=>ck(!!p1[k],'papel "'+k+'" já vem atribuído'));
ck(w1.avaliarPipelineAtual().bloqueia===false,'nada bloqueia: o job roda sem ninguém clicar');

console.log('\nEnsaio de CAMPO, uma leitura por data');
const campo=bioensaio('razao',[null,null,null],['2026-09-01','2026-09-08','2026-09-15']);
const jtc=ctx._bioestatJobsTempo('Q1',campo);
ck(jtc.length===1,'também rende curva, com o eixo em dias');
ck(jtc[0].unidade==='dias','eixo em dias quando não há HAT declarado');
const w2=motor(jtc[0].aoa,'tempo');
const p2=w2.lerPapeisTempo(), i2=w2.avaliarPipelineAtual();
ck(!!p2.tempo&&i2.bloqueia===false,'o filtro de data não corta o eixo para um ponto só');
const nT=[...new Set(w2.matrizLinhasFiltradas().map(r=>r.tempo))].length;
ck(nT===3,'as três datas continuam na mesa (era 1 antes do conserto)');

console.log('\n'+passou+' conferência(s) ok, '+falhas+' falha(s).');
process.exit(falhas?1:0);
