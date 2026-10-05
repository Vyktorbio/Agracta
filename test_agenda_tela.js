/* A AGENDA EM CALENDÁRIO E O PAINEL DO DIA, NA TELA.
 *
 * Pedido de uso: "um dashboard no Hoje, de hoje mesmo — o que tem pra hoje de
 * verdade" e "a agenda mostrar um calendário e uma bolinha nos dias".
 * O motor (vendor/agenda-core.js) tem teste próprio; este roda as funções do
 * app.js num DOM e toca nos botões como o dedo tocaria.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 *  1. A AGENDA ABRE NO CALENDÁRIO, com a bolinha certa em cada dia: atrasado
 *     vermelho, aplicação, avaliação, e o feito no dia em que FOI feito.
 *  2. TOCAR NO DIA MOSTRA O DIA; tocar de novo devolve o mês inteiro; trocar de
 *     mês mostra o mês novo; o atrasado de mês passado fica a um toque.
 *  3. A LISTA DE SEMPRE CONTINUA a um toque, e a escolha fica no aparelho. Sem o
 *     motor do calendário, a agenda é a lista — nunca uma tela em branco.
 *  4. O HOJE É HOJE. "Para fazer hoje" é o atrasado e o de hoje; o de amanhã vai
 *     para "Amanhã" — o `collectTodayEvents(0)` devolvia amanhã também, porque o
 *     0 virava 1, e o selo do botão HOJE contava o dia seguinte.
 *  5. O PAINEL DIZ O QUE SABIA E NÃO DIZIA: por qual parcela continuar a
 *     avaliação (e o botão abre nela), o aviso de estoque da aplicação, o que já
 *     foi feito hoje, e o clima só quando o mostrador do mapa tem leitura.
 *  6. A FAIXA DA SEMANA É A AGENDA: as mesmas bolinhas, e tocar num dia abre a
 *     agenda nele.
 *
 * Rodar: node test_agenda_tela.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('app.js','utf8');

/* Recorta uma função de nível zero do app.js: de "function nome(" até a chave
   que fecha na coluna zero — ou a própria linha, quando ela é de uma linha só. */
function pega(nome){
  const m=new RegExp('^function '+nome.replace(/\$/g,'\\$')+'\\(','m').exec(src);
  assert.ok(m,'não achei a função '+nome+' no app.js');
  const i=m.index, fimLinha=src.indexOf('\n',i), linha=src.slice(i,fimLinha);
  const conta=(s,c)=>s.split(c).length-1;
  if(conta(linha,'{')>0 && conta(linha,'{')===conta(linha,'}')) return linha;
  const j=src.indexOf('\n}',i);
  assert.ok(j>0,'não achei o fim de '+nome);
  return src.slice(i,j+2);
}

const HOJE='2026-10-05';
function montar(opts){
  opts=opts||{};
  const dom=new JSDOM('<!doctype html><html><body>'+
    '<button class="btn-today"><span id="todayBadge"></span></button>'+
    '<div class="agenda-panel" id="agendaPanel"></div>'+
    '<div class="today-overlay" id="todayOvl"><div id="todayPnl"></div></div>'+
    '</body></html>',{url:'https://agracta.test/',runScripts:'dangerously'});
  const w=dom.window, d=w.document;
  const chamadas=[];
  w.AvaliacaoCore=require('./vendor/avaliacao-core.js');
  w.PendenciasCore=require('./vendor/pendencias-core.js');
  if(!opts.semMotor) w.AgendaCore=require('./vendor/agenda-core.js');
  w.eval('var agModo=null, agMesVisto=null, agDiaSel=null, agVerDispensados=false, agO=false, _climaChipUltimo=null;');
  w.todayISO=()=>HOJE;
  w.normalizeStudy=s=>s;
  w.studyCultura=(st,q)=>(q&&q.cultura)||'';
  w.quadraNome=q=>({Q1:'Talhão Norte',Q2:'Talhão Sul'}[q]||q);
  w.ic=()=>'';
  w.save=()=>{}; w.cloudSaveSoon=()=>{}; w.render=()=>{}; w.updateAgendaBadge=()=>{};
  w.logStudyAuditInObject=()=>{}; w._currentUserName=()=>'Teste'; w._stxToast=()=>{};
  w.openStudyDetail=(q,s)=>chamadas.push(['estudo',q,s]);
  w.openStudyEditAvaliacao=(id,tipo,forca,parcela)=>chamadas.push(['avaliacao',id,parcela||'']);
  w.openStudyEditAplicacao=id=>chamadas.push(['aplicacao',id]);
  w.showD=q=>chamadas.push(['quadra',q]);
  w.estudoAvisosEstoque=(st)=>st.id==='S1'?[{codigo:'lote-vence-antes',texto:'O lote L-7 vence em 10/10/2026, antes da última aplicação programada (19/10/2026).'}]:[];
  ['pD','fD','fDIso','isoToBR','addDays','daysBetween','today0','esc','_avCroquiEscJs','_agDateParts','_agFormatDateTime',
   'studyEventsV2','estudoFinalizado','estudosAtivos','_agEvKey','_agDisp','_agEstaDispensado','_agAcharEstudo',
   '_agTotalDispensados','_agSalvar','agDispensar','agRestaurar','agToggleDispensados','allUpcomingEvents','collectTodayEvents',
   'toggleAgenda','_agModo','agSetModo','agCalItens','_agCalRotulo','_agRelativo','_agAcoesHtml','_agItemHtml','_agFeitoHtml',
   '_agCalItemHtml','renderAgenda','_agListaHtml','_agMesHtml','_agDiaConta','_agDetalheHtml','agMes','agMesHoje','agDia',
   'abrirAgendaNoDia','closeAgendaAndOpen','openToday','closeToday','renderToday','hojeAbrirDia','_hojeClimaHtml',
   '_hojeGuiaParcela','renderTodayCard','goToStudy','quickRegisterAvaliacao','quickRegisterAplicacao','updateTodayBadge'
  ].forEach(n=>w.eval(pega(n)));
  w.AGRACTA_TIME_ZONE='America/Sao_Paulo';
  w.curV=null; w.curSid=null;
  return {w,d,chamadas};
}

/* Um ensaio com de tudo um pouco, visto de segunda, 5/10/2026:
   - S1 (Talhão Norte): aplicações a cada 14 dias desde 21/9 — a 1ª registrada,
     a 2ª é HOJE, a 3ª em 19/10; avaliação de 28/9 completa, a de 2/10 começada
     e ATRASADA (parcela 101 lida, a próxima é a 102), uma em 8/10 e uma em 3/11.
   - S2 (Talhão Sul): duas aplicações, as duas registradas — a segunda HOJE às
     08:10; avaliação AMANHÃ. */
function dados(){
  const trats=[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Produto A',dose:'1 L/ha'}];
  const rand={ordem:[{parcela:101,tratId:'T1',rep:1},{parcela:102,tratId:'T2',rep:1},{parcela:201,tratId:'T2',rep:2},{parcela:202,tratId:'T1',rep:2}]};
  return {
    Q1:{cultura:'Soja',estudos:[{id:'S1',codigo:'AGR-SOJA-01',nome:'Fungicida na ferrugem',dataInicio:'2026-09-21',numAplicacoes:3,intervaloDias:14,
      numRepeticoes:2,tratamentos:trats,randomizado:true,randomizacao:rand,aplicacoes:[{id:'P1',data:'2026-09-21',hora:'07:40'}],
      avaliacoes:[
        {id:'A0',data:'2026-09-28',tipo:'Severidade',variaveis:['Sev'],notas:{T1R1:{Sev:12},T1R2:{Sev:9},T2R1:{Sev:3},T2R2:{Sev:4}}},
        {id:'A1',data:'2026-10-02',tipo:'Severidade',variaveis:['Sev'],notas:{T1R1:{Sev:10}}},
        {id:'A2',data:'2026-10-08',tipo:'Severidade',variaveis:[],notas:{}},
        {id:'A3',data:'2026-11-03',tipo:'Produtividade',variaveis:[],notas:{}}]}]},
    Q2:{cultura:'Milho',estudos:[{id:'S2',codigo:'AGR-MILHO-02',nome:'Inseticida na lagarta',dataInicio:'2026-09-15',numAplicacoes:2,intervaloDias:20,
      numRepeticoes:2,tratamentos:trats,aplicacoes:[{id:'P2',data:'2026-09-15',hora:'08:00'},{id:'P3',data:'2026-10-05',hora:'08:10'}],
      avaliacoes:[{id:'B1',data:'2026-10-06',tipo:'Lagartas/planta',variaveis:[],notas:{}}]}]}
  };
}
const pontosDe=(d,iso)=>{
  const b=[...d.querySelectorAll('#agendaPanel .agc-dia')].find(x=>x.getAttribute('onclick').indexOf("'"+iso+"'")>=0);
  assert.ok(b,'a grade tem o dia '+iso);
  return [...b.querySelectorAll('.agc-pt')].map(i=>i.className.replace('agc-pt ',''));
};
const textoDe=(d,sel)=>(d.querySelector(sel)||{textContent:''}).textContent.replace(/\s+/g,' ').trim();
/* JSON na comparação: o que vem da janela do DOM é Array de OUTRO realm, e a
   comparação estrita recusaria dois [1,2] iguais por causa do protótipo. */
let n=0; const ok=(c,m)=>{ assert.ok(c,m); n++; }, eq=(a,b,m)=>{ assert.deepEqual(JSON.parse(JSON.stringify(a)),b,m); n++; };

/* -------------------------------------------- 1. abre no calendário ----- */
{
  const {w,d}=montar(); w.data=dados();
  w.toggleAgenda();
  ok(d.getElementById('agendaPanel').classList.contains('open'),'o botão abre a agenda');
  ok(d.querySelector('#agendaPanel .agc-grade'),'e ela abre no CALENDÁRIO');
  eq(textoDe(d,'.agc-mes'),'outubro de 2026','no mês de hoje');
  eq(d.querySelectorAll('#agendaPanel .agc-sem:not(.agc-cab)').length,5,'outubro de 2026 em cinco semanas');
  ok(d.querySelector('.agc-dia.hoje.sel'),'com hoje marcado e escolhido');
  eq(pontosDe(d,'2026-10-02'),['atrasado'],'2/10: a avaliação começada e não terminada é bolinha de ATRASADO');
  eq(pontosDe(d,'2026-10-05'),['apl','feito'],'hoje: a aplicação que falta e a que foi registrada hoje cedo');
  eq(pontosDe(d,'2026-10-06'),['av'],'amanhã: avaliação');
  eq(pontosDe(d,'2026-10-19'),['apl'],'19/10: a 3ª aplicação');
  eq(pontosDe(d,'2026-09-28'),['feito'],'28/9 (ponta de setembro na grade): a avaliação completa aparece como feita');
  eq(pontosDe(d,'2026-10-07'),[],'dia livre não tem bolinha');
  ok(/1 atrasado/.test(textoDe(d,'.agc-atr')),'o atrasado tem atalho próprio no alto');
  const det=textoDe(d,'.agc-det');
  ok(/Segunda-feira, 5 de outubro · hoje/i.test(det),'embaixo, o dia escolhido: '+det.slice(0,60));
  ok(/APLICAÇÃO 2\/3/.test(det) && /Aplicação 2 registrada às 08:10/.test(det),'com o que falta e o que já foi feito nele');
  ok(det.indexOf('APLICAÇÃO 2/3')<det.indexOf('registrada'),'pendente antes de feito');
}

/* ----------------------------------------- 2. tocar, trocar de mês ----- */
{
  const {w,d,chamadas}=montar(); w.data=dados();
  w.toggleAgenda();
  const dia=iso=>[...d.querySelectorAll('.agc-dia')].find(x=>x.getAttribute('onclick').indexOf("'"+iso+"'")>=0);
  dia('2026-10-06').click();
  ok(/Terça-feira, 6 de outubro · amanhã/i.test(textoDe(d,'.agc-det-t')),'tocar no dia 6 mostra o dia 6');
  ok(/Talhão Sul/.test(textoDe(d,'.agc-det')) && /AVALIAÇÃO 1/.test(textoDe(d,'.agc-det')),'com a avaliação do Talhão Sul');
  dia('2026-10-06').click();
  ok(/Neste mês/.test(textoDe(d,'.agc-det-t')),'tocar de novo devolve o mês inteiro');
  ok(d.querySelectorAll('.agc-det .agc-det-dia').length>=5,'dia a dia');
  dia('2026-10-07').click();
  ok(/Nada marcado neste dia/.test(textoDe(d,'.agc-det')),'dia livre diz que está livre');
  ok(/Próximo: Avaliação 3 — Severidade em Talhão Norte · quinta-feira, 8 de outubro/.test(textoDe(d,'.agc-prox')),
    'e aponta o próximo compromisso: '+textoDe(d,'.agc-prox'));
  d.querySelector('.agc-prox').click();
  ok(/8 de outubro/.test(textoDe(d,'.agc-det-t')),'que leva até ele');
  d.querySelector('.agc-seta[aria-label="Próximo mês"]').click();
  eq(textoDe(d,'.agc-mes'),'novembro de 2026','a seta troca o mês');
  eq(pontosDe(d,'2026-11-03'),['av'],'novembro tem a avaliação do dia 3');
  ok(/Neste mês · 1 compromisso/.test(textoDe(d,'.agc-det-t')),'e embaixo, o mês novo inteiro');
  ok(/1 atrasado/.test(textoDe(d,'.agc-atr')),'o atrasado de outubro continua a um toque em novembro');
  d.querySelector('.agc-atr').click();
  ok(/Atrasados/.test(textoDe(d,'.agc-det-t')) && /AVALIAÇÃO 2/.test(textoDe(d,'.agc-det')),'e lista o atrasado de outro mês');
  d.querySelector('.agc-hoje').click();
  ok(d.querySelector('.agc-dia.hoje.sel') && textoDe(d,'.agc-mes')==='outubro de 2026','"Hoje" volta para hoje');
  ok(!d.querySelector('.agc-hoje'),'e o botão "Hoje" some quando já se está nele');
  dia('2026-09-30').click();
  eq(textoDe(d,'.agc-mes'),'setembro de 2026','tocar num dia de fora (ponta cinza da grade) leva ao mês dele');
  ok(/Quarta-feira, 30 de setembro/i.test(textoDe(d,'.agc-det-t')),'já com ele escolhido');
  /* Abrir o item leva ao registro, como na lista. */
  w.agMesHoje();
  const itemAv=[...d.querySelectorAll('.agc-det .ag-item')].find(x=>/APLICAÇÃO 2\/3/.test(x.textContent));
  itemAv.click();
  eq(chamadas.pop(),['estudo','Q1','S1'],'tocar no compromisso abre o estudo');
  ok(!d.getElementById('agendaPanel').classList.contains('open'),'e fecha a agenda');
  /* Reabrir pelo botão volta para hoje. */
  w.agDia('2026-11-03'); w.toggleAgenda(); w.toggleAgenda();
  ok(d.querySelector('.agc-dia.hoje.sel') && textoDe(d,'.agc-mes')==='outubro de 2026','abrir de novo pelo botão é abrir no hoje');
}

/* ---------------------- 3. lista a um toque, escolha guardada, sem motor ----- */
{
  const {w,d}=montar(); w.data=dados();
  w.toggleAgenda();
  [...d.querySelectorAll('.ag-modo button')].find(b=>/Lista/.test(b.textContent)).click();
  ok(!d.querySelector('#agendaPanel .agc-grade') && /ATRASADOS/.test(textoDe(d,'#agendaPanel')),'"Lista" mostra a lista de sempre');
  eq(w.localStorage.getItem('agracta-agenda-modo'),'lista','e a escolha fica guardada no aparelho');
  const outra=montar(); outra.w.data=dados();
  outra.w.localStorage.setItem('agracta-agenda-modo','lista');
  outra.w.eval('agModo=null'); outra.w.toggleAgenda();
  ok(!outra.d.querySelector('#agendaPanel .agc-grade'),'quem escolheu lista abre na lista');
  const vazio=montar(); vazio.w.data={};
  vazio.w.renderAgenda();
  eq(vazio.d.getElementById('agendaPanel').innerHTML,'','agenda fechada não se desenha à toa (cada gravação pede renderAgenda)');
  vazio.w.toggleAgenda();
  ok(/Nenhum compromisso nos estudos ativos/.test(textoDe(vazio.d,'.agc-det')),'sem estudo nenhum, o calendário diz de onde vêm os compromissos');
  const sem=montar({semMotor:true}); sem.w.data=dados(); sem.w.toggleAgenda();
  ok(/ATRASADOS/.test(textoDe(sem.d,'#agendaPanel')) && !sem.d.querySelector('.ag-modo'),
    'sem o motor do calendário a agenda é a lista — nunca uma tela em branco');
}

/* ---------------------------------------------- 4. o HOJE é hoje ----- */
{
  const {w,d,chamadas}=montar(); w.data=dados();
  eq(w.collectTodayEvents(0).map(e=>e.ev.type+':'+e.diff),['eval:-3','apl:0'],'collectTodayEvents(0) é atrasado + hoje — sem o de amanhã');
  eq(w.collectTodayEvents().length,3,'sem argumento continua valendo 1 dia, como os chamadores antigos esperam');
  w.updateTodayBadge();
  eq(d.getElementById('todayBadge').textContent,'2','o selo do botão HOJE conta 2, não 3');
  w.openToday();
  const t=textoDe(d,'#todayPnl');
  ok(/Para fazer hoje \(2\)/i.test(t),'"Para fazer hoje" tem 2');
  const blocos=d.querySelectorAll('#todayPnl .today-list');
  ok(/Atrasado 3d/.test(blocos[0].textContent) && /HOJE/.test(blocos[0].textContent) && !/Amanhã/.test(blocos[0].textContent),
    'o atrasado e o de hoje — o de amanhã não');
  ok(/Amanhã \(1\)/i.test(t) && /Lagartas\/planta/.test(blocos[1].textContent),'o de amanhã tem seção própria');
  eq([...d.querySelectorAll('.today-sum-n')].map(x=>x.textContent),['1','1','2'],'números: 1 atrasado, 1 hoje, 2 nos próximos 7 dias');
  ok(/Feito hoje \(1\)/i.test(t) && /Aplicação 2 registrada às 08:10/.test(textoDe(d,'.hj-feitos')),'o que já saiu hoje aparece em "Feito hoje"');

  /* 5. o que o cartão sabia e não dizia */
  ok(/Faltam 3 parcelas — a próxima é a 102\./.test(t),'a avaliação começada diz por qual parcela continuar');
  const cont=[...d.querySelectorAll('#todayPnl .today-card-quick')].find(b=>/Continuar/.test(b.textContent));
  cont.click();
  eq(chamadas.pop(),['avaliacao','A1','T2R1'],'e o "Continuar" abre a avaliação JÁ na parcela 102');
  ok(!d.getElementById('todayOvl').classList.contains('open'),'fechando o HOJE');
  w.openToday();
  ok(/O lote L-7 vence em 10\/10\/2026/.test(textoDe(d,'#todayPnl .today-card.today')),'a aplicação de hoje traz o aviso de estoque do estudo');
  ok(!/Faltam|para avaliar/.test(textoDe(d,'#todayPnl .today-card.today')),'e cartão de aplicação não fala de parcela');
  ok(!d.querySelector('.hj-clima'),'sem leitura do mostrador do mapa, não há linha de clima');
  w.eval("_climaChipUltimo={temp:24.5,umidade:61,vento:8,estacao:true,lugar:'Fazenda Teste',hora:'09:25',em:Date.now()}");
  w.renderToday();
  eq([textoDe(d,'.hj-clima span'),textoDe(d,'.hj-clima small')],['24,5 °C · UR 61% · vento 8 km/h','estação Fazenda Teste · 09:25'],
    'com leitura, a linha diz o valor E a fonte');
  w.eval("_climaChipUltimo.em=Date.now()-3*3600e3");
  w.renderToday();
  ok(!d.querySelector('.hj-clima'),'leitura velha (3 h) não se passa por "agora"');

  /* 6. a faixa da semana é a agenda */
  const faixa=[...d.querySelectorAll('.hj-faixa .hj-dia')];
  eq(faixa.map(b=>b.querySelector('.hj-sigla').textContent),['SEG','TER','QUA','QUI','SEX','SÁB','DOM'],'a faixa vai de hoje a domingo');
  eq([...faixa[0].querySelectorAll('.agc-pt')].map(i=>i.className.replace('agc-pt ','')),['apl','feito'],'com as mesmas bolinhas da agenda');
  faixa[1].click();
  ok(!d.getElementById('todayOvl').classList.contains('open') && d.getElementById('agendaPanel').classList.contains('open'),
    'tocar num dia da faixa fecha o HOJE e abre a agenda');
  ok(/Terça-feira, 6 de outubro/i.test(textoDe(d,'.agc-det-t')),'já no dia tocado');
}

/* ------------------------------ dispensar e ver dispensados ----- */
{
  const {w,d}=montar(); w.data=dados();
  w.openToday();
  const xAmanha=[...d.querySelectorAll('#todayPnl .today-card')].find(c=>/Amanhã/.test(c.querySelector('.today-card-lbl').textContent)).querySelector('.ag-x');
  xAmanha.click();
  ok(!/Amanhã \(/i.test(textoDe(d,'#todayPnl')),'dispensar o lembrete de amanhã tira ele do HOJE');
  ok(/Ver dispensados \(1\)/i.test(textoDe(d,'.hj-rodape')),'e o rodapé oferece ver o dispensado');
  [...d.querySelectorAll('.hj-rodape .ag-acao')].find(b=>/dispensados/.test(b.textContent)).click();
  ok(/Amanhã \(1\)/i.test(textoDe(d,'#todayPnl')),'"Ver dispensados" redesenha o HOJE — antes só redesenhava a agenda fechada');
  ok(d.querySelector('#todayPnl .today-card.ag-dispensado'),'e o dispensado aparece esmaecido');
  w.closeToday(); w.eval('agVerDispensados=false'); w.toggleAgenda();
  eq(pontosDe(d,'2026-10-06'),[],'na agenda, o dia do lembrete dispensado fica sem bolinha');
}

/* ---------------------------------------------- 7. publicação ----- */
{
  const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
  const pedido=(html.match(/vendor\/agenda-core\.js\?v=\d+/)||[])[0];
  ok(pedido,'o index.html carrega o motor da agenda');
  ok(sw.includes('./'+pedido),'e o sw.js pré-carrega a MESMA versão ('+pedido+'), para o calendário abrir sem rede');
  ok(html.indexOf(pedido)<html.indexOf('app.js?v='),'antes do app.js');
}

console.log('Agenda em calendário e painel do dia na tela: abre no calendário com a bolinha certa, toque no dia e troca de mês, '+
  'lista a um toque, HOJE só com hoje e atrasado, parcela do "continuar", estoque, feito hoje, clima com fonte e faixa da semana OK ('+n+' verificações).');
