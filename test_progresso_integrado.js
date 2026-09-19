'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom'),C=require('./vendor/avaliacao-core');
(async()=>{
const src=fs.readFileSync('app.js','utf8');
const dom=new JSDOM('<!doctype html><html><body><div id="card"></div></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.todayISO=()=>'2026-09-19';w.AvaliacaoCore=C;w.normalizeStudy=s=>s;w._bioAutoCache={};w._bioestatJobs=()=>[];w._studyRandomOk=()=>true;
w.studyTestemunha=()=> 'T1';w.studyCultura=()=> 'Soja';w.isQuadraLab=()=>false;w.estudoFinalizado=s=>!!(s.finalizacao&&s.finalizacao.em);
w._currentUserName=()=> 'Teste';w._bioestatSnapshotAvancado=()=>({pendencias:[],indisponiveis:[]});
const names=['pD','isoToBR','addDays','daysBetween','today0','nextEventV2','_avCroquiEscJs','_avCroquiStatus','studyEventsV2','_studyPanelProgress','_studyPanelState','_studyWorkflow','_studyFinalizationReview','_mascaraContagem','renderTodayCard','quickRegisterAvaliacao','collectTodayEvents','closeAgendaAndOpen'];
for(const n of names){const match=src.match(new RegExp('function '+n+'\\([^]*?\\n}'));assert(match,n);w.eval(match[0]);}
w._agEstaDispensado=()=>false;w._agEvKey=ev=>ev.id;w.quadraNome=q=>q;w.esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w._avRowsForStudy=C.linhas;w.estudosAtivos=q=>(w.data[q].estudos||[]).filter(s=>!w.estudoFinalizado(s));
w.QLOCAL={};w.LOCAIS={};w.ITENS={};w.save=()=>{throw Error('Consulta não pode salvar');};
['vendor/conhecimento-core.js','integracoes.js','estudo-pagina.js'].forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
const av={id:"A'2",data:'2026-01-02',tipo:'Mortalidade',variaveis:['Mort','Inc'],notas:{},realizada:true};
const st={id:'S',codigo:'Progresso',numRepeticoes:2,tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Produto'}],avaliacoes:[av],aplicacoes:[]};
w.data={Q:{estudos:[st]}};
const ev=()=>w.studyEventsV2(st).find(e=>e.type==='eval');
const projected=()=>w.agConhecimento.projetar('Q',st,w.data.Q);
function check(filled,complete){
 const before=JSON.stringify(st),p=C.avaliacao(st,av);
 assert.equal(p.filled,filled);assert.equal(p.complete,complete);
 assert.equal(ev().realizada,complete,'agenda exige conclusão da grade, não flag legada');
 assert.equal(w._studyPanelProgress(st).complete,complete);
 assert.equal(w._studyWorkflow('Q',st).avaliacoes.state==='complete',complete);
 assert.equal(projected().avaliacoes[0].completa,complete);
 assert.equal(w.collectTodayEvents(1).length,complete?0:1,'parcial continua no Hoje');
 w.abrirConhecimento({qid:'Q',sid:'S'});
 const kpi=[...d.querySelectorAll('.ep-kpi')].find(e=>e.textContent.includes('Avaliações concluídas'));
 assert(kpi,'KPI de conclusão presente');assert.match(kpi.textContent,new RegExp((complete?'1':'0')+'\\s*de 1'));
 assert.equal(JSON.stringify(st),before,'consultas não modificam dados');
}
check(0,false);
av.notas.T1R1={Mort:0};check(1,false);
assert.equal(w._studyFinalizationReview('Q',st).ok,false);
assert.match(w._studyFinalizationReview('Q',st).issues.join(' '),/parcialmente/);
const R=require('./vendor/relatorio-core');
const report={projection:projected(),study:JSON.parse(JSON.stringify(st)),generated:'2026-09-19'};
const section=R.sections(report,R.data(report)).find(s=>s.title==='Avaliações');
assert.equal(section.rows[0][3],'Parcial');assert.equal(section.rows[0][4],'1 de 8','relatório mantém as mesmas pendências');

assert.equal(w._mascaraContagem('Q').partial,1);
w._avGrid=av;assert.equal(w._avCroquiStatus(C.linhas(st)[0],av.variaveis),'partial');
w.abrirConhecimento({aba:'estudos'});assert.match(d.querySelector('.con-cartao').textContent,/0 de 1/);assert.match(d.querySelector('.con-cartao').textContent,/atrasada/);
let opened=[],warnings=0;w.closeToday=()=>{};w.openStudyEditAvaliacao=id=>opened.push(id);w.openStudyDetail=()=>{};w._stxToast=()=>warnings++;
d.getElementById('card').innerHTML=w.renderTodayCard({qid:'Q',study:st,ev:ev(),diff:-1});
const button=d.querySelector('#card .today-card-quick');assert.match(button.textContent,/Continuar/);
w.eval(button.getAttribute('onclick'));assert.equal(opened.at(-1),av.id,'abre o ID exato, sem duplicar avaliação nem trocar data');assert.equal(st.avaliacoes.length,1);
const agenda=d.createElement('div');agenda.id='agendaPanel';agenda.classList.add('open');d.body.appendChild(agenda);
w.closeAgendaAndOpen('Q','S',av.id);assert.equal(opened.pop(),av.id);assert.equal(agenda.classList.contains('open'),false);
w.abrirConhecimento({aba:'estudos'});const link=d.querySelector('.con-agenda [data-con="avaliacao"]');assert(link);
link.click();await new Promise(r=>setTimeout(r,0));assert.equal(opened.pop(),av.id,'Conhecimento também retoma a avaliação prevista');

w.quickRegisterAvaliacao('Q','S','Mort','apagada');assert.equal(warnings,1);assert.equal(opened.length,1);
for(const r of C.linhas(st))av.notas[r.key]={Mort:0,Inc:'0,0'};
check(8,true);assert.equal(w._mascaraContagem('Q').done,4);
assert.equal(w._avCroquiStatus(C.linhas(st)[0],av.variaveis),'done');
av.notas.T2R2.Inc='texto';check(7,false);av.notas.T2R2.Inc='';check(7,false);av.notas.T2R2.Inc=0;
const future={id:'B',data:'2026-12-30',variaveis:[],notas:{}};st.avaliacoes.push(future);
assert.equal(C.avaliacao(st,future).total,8,'herda a grade sem copiar notas');assert.equal(w._studyPanelProgress(st).pct,50);assert.equal(C.estudo(st).concluidas,1);assert.equal(future.variaveis.length,0);st.avaliacoes.pop();
st.finalizacao={em:'2026-09-19'};av.notas.T2R2.Inc='';assert.equal(w.collectTodayEvents(1).length,0);assert.equal(w._mascaraContagem('Q').done,0);
w.quickRegisterAvaliacao('Q','S','Mort',av.id);assert.equal(opened.length,1,'atalho antigo não edita estudo finalizado');
// Subamostras e razão: média parcial não significa coleta terminada, N sozinho não é leitura.
const single={tratamentos:[{id:'T1'}],numRepeticoes:1,avaliacoes:[]};
const sub={variaveis:['Diam'],tipos:{Diam:'contagem'},varcfg:{Diam:{sub:2}},notas:{T1R1:{Diam:5}},bruto:{T1R1:{Diam:{sub:[5,'']}}}};
assert.equal(C.avaliacao(single,sub).state,'partial');sub.bruto.T1R1.Diam.sub[1]=0;assert.equal(C.avaliacao(single,sub).complete,true);
const ratio={variaveis:['Mort'],tipos:{Mort:'razao'},notas:{},bruto:{T1R1:{Mort:{N:20,n:''}}}};
assert.equal(C.avaliacao(single,ratio).state,'empty');ratio.bruto.T1R1.Mort.n=0;assert.equal(C.avaliacao(single,ratio).complete,true);
ratio.bruto.T1R1.Mort.n=21;assert.equal(C.avaliacao(single,ratio).complete,false);
const dual={variaveis:['Mort'],duplaLeitura:true,notas:{T1R1:{Mort:0}},avaliadores:{A:{notas:{T1R1:{Mort:0}}},B:{notas:{}}}};
assert.equal(C.avaliacao(single,dual).state,'partial');dual.avaliadores.B.notas.T1R1={Mort:0};assert.equal(C.avaliacao(single,dual).complete,true);
assert.equal(C.avaliacao(single,{variaveis:['Mort'],notas:{T1:{Mort:0}}}).complete,true,'leitura legada por tratamento preservada');
for(const invalid of [false,true,NaN,Infinity,{},' ', '2abc'])assert.equal(C.avaliacao(single,{variaveis:['Mort'],notas:{T1R1:{Mort:invalid}}}).complete,false);
assert.equal(C.avaliacao(single,{variaveis:[],realizada:true}).complete,false,'sem grade não é conclusão');
const wrongRow={variaveis:['Mort'],notas:{EXCLUIDA:{Mort:50}}};assert.equal(C.avaliacao(single,wrongRow).started,0,'nota fora das parcelas previstas não encerra avaliação');
dom.window.close();console.log('Progresso integrado: agenda, Hoje, mapa, croqui, Conhecimento, dossiê, fechamento, herança, zeros, subamostras, dois avaliadores e atalho por ID OK.');

})().catch(e=>{console.error(e);process.exit(1);});
