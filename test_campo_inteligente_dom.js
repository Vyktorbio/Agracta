/* Campo inteligente no app DE VERDADE: carrega todos os scripts do index.html
 * num DOM (jsdom), abre um estudo e lança uma nota pelo caminho real.
 * Confere que o módulo engata nas funções do app — não só no teste isolado.
 * Rodar: node test_campo_inteligente_dom.js  (precisa de jsdom; sem ele, PULADO)
 */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
let jsdom;try{jsdom=require('jsdom');}catch(e){console.log('PULADO: jsdom não está instalado.');process.exit(0);}
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const erros=[];const vc=new jsdom.VirtualConsole();vc.on('jsdomError',e=>erros.push(e.message));
const dom=new jsdom.JSDOM(html,{runScripts:'outside-only',virtualConsole:vc,url:'https://agracta.test/'});
const w=dom.window,store={};
Object.defineProperty(w,'localStorage',{value:{getItem:k=>store[k]==null?null:store[k],setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];},clear(){}},configurable:true});
w.alert=()=>{};w.confirm=()=>true;w.navigator.geolocation={watchPosition(){},getCurrentPosition(){}};
const re=/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;let m;
while((m=re.exec(html))){const rel=m[1].split('?')[0];if(/^https?:/.test(rel))continue;const abs=path.join(__dirname,rel);if(!fs.existsSync(abs))continue;
  try{w.eval(fs.readFileSync(abs,'utf8'));}catch(e){console.error(rel,e.message);process.exit(1);} if(/leaflet\.js$/.test(rel))w.LF=w.L;}
ok(w.CampoInteligente&&w.CampoInteligenteCore,'o módulo carregou dentro do app');

console.log('\n[agenda] abrir o estudo mostra o cartão e o ajuste grava');
w.eval(`data={Q1:{estudos:[{id:'S1',codigo:'AGR-T',tratamentos:[{id:'T1',produto:'A',dose:'1'},{id:'T2',produto:'B',dose:'2'}],numRepeticoes:4,
  dataInicio:'2026-09-01',avalInicio:'2026-09-08',avalIntervalo:7,avalNum:3,numAplicacoes:2,intervaloDias:14,janela:{bbchMin:51,bbchMax:59},
  aplicacoes:[{id:'A1',data:'2026-09-04',bbch:'40'}],
  avaliacoes:[{id:'V0',data:'2026-09-07',bbch:'43',variaveis:['sev'],tipos:{},notas:{T1R1:{sev:'1'}}},
    {id:'auto_2026-09-08',data:'2026-09-08',auto:true,variaveis:[],tipos:{},notas:{}},
    {id:'auto_2026-09-15',data:'2026-09-15',auto:true,variaveis:[],tipos:{},notas:{}},
    {id:'auto_2026-09-22',data:'2026-09-22',auto:true,variaveis:[],tipos:{},notas:{}}]}]}};
  QLOCAL={Q1:'l'};LOCAIS={l:{nome:'Iracemápolis'}};QNOME={Q1:'Q1'};
  todayISO=function(){return '2026-09-09';};`);
w.openStudyDetail('Q1','S1');
const card=w.document.getElementById('ciAgenda');
ok(card&&/3 dias depois do previsto/.test(card.textContent),'o cartão "Agenda do campo" aparece com o motivo');
ok(/ritmo observado neste estudo/.test(card.textContent),'e a previsão de BBCH da próxima aplicação');
w.campoReancorar('Q1','S1');
const toastAgenda=(w.document.getElementById('stxToast')||{}).textContent||'';
const s=w.eval('data.Q1.estudos[0]');
ok(s.avaliacoes.filter(a=>a.auto).map(a=>a.data).join()==='2026-09-11,2026-09-18,2026-09-25','as previstas vazias foram para +3 dias');
ok(s.avalDeslocamento===3&&s._deletedAvaliacoes&&s._deletedAvaliacoes['auto_2026-09-08'],'deslocamento guardado e lápides das datas antigas');
ok(s.audit.some(e=>/Agenda reancorada/.test(e.action)),'o ajuste entrou na trilha de auditoria');
ok(!w.document.getElementById('ciAgenda')||!/depois do previsto/.test(w.document.getElementById('ciAgenda').textContent),'depois do ajuste, não pede de novo');

console.log('\n[nota] sair da célula com valor estranho avisa e marca');
w.eval(`curV='Q1';curSid='S1';_avGrid={variaveis:['sev'],tipos:{sev:'pct'},meta:{},varcfg:{},bruto:{},
  notas:{T1R1:{sev:'20'},T1R2:{sev:'22'},T1R3:{sev:'18'},T1R4:{sev:''},T2R1:{sev:'50'},T2R2:{sev:'55'},T2R3:{sev:'48'},T2R4:{sev:'52'}}};`);
const inp=w.document.createElement('input');inp.className='av-cell';inp.setAttribute('data-t','T1R4');inp.setAttribute('data-v','sev');inp.value='80';
const wrap=w.document.getElementById('avGridWrap')||(()=>{const d=w.document.createElement('div');d.id='avGridWrap';w.document.body.appendChild(d);return d;})();
wrap.appendChild(inp);
w.avValidateCell(inp);
const t=w.document.getElementById('stxToast');ok(t&&/T1 rep d/.test(t.textContent)&&/entre 18 e 22/.test(t.textContent),'o aviso aparece: "T1 rep d · sev: 80% — … entre 18 e 22"');
ok(inp.classList.contains('av-alerta'),'a célula fica marcada');
inp.value='21';w.avValidateCell(inp);
ok(!inp.classList.contains('av-alerta'),'corrigiu: a marca sai');
ok(/Agenda ajustada: 3 avaliações movidas/.test(toastAgenda),'mensagem do ajuste no plural certo');
ok(!erros.length,'nenhum erro de execução no app ('+erros.length+')');
console.log('\nCampo inteligente no app: '+n+' verificações.');
process.exit(0);
