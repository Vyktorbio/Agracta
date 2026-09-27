'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const app=fs.readFileSync('app.js','utf8'),engine=fs.readFileSync('estatistica/app.js','utf8');
const fn=(src,n)=>src.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0];
const c={console,AV_TIPOS:{pct:1,contagem:1},_bioestatJobAoa:()=>[['header'],[0,0,0,0,0,0,0,'T1'],[0,0,0,0,0,0,0,'T1'],[0,0,0,0,0,0,0,'T2'],[0,0,0,0,0,0,0,'T2']]};
vm.createContext(c);vm.runInContext(app.match(/function _avTipo\([^\n]+/)[0],c);vm.runInContext(fn(app,'_bioestatJobs'),c);
const jobs=c._bioestatJobs('Q',{avaliacoes:[{id:'A',tipo:'Ferrugem',variaveis:['Ferrugem','Insetos'],tipos:{Ferrugem:'pct',Insetos:'contagem'}}]});
assert.equal(jobs[0].tipo,'pct');assert.equal(jobs[1].tipo,'contagem');
const fields={},elements=id=>fields[id]||(fields[id]={value:'',options:['proporcao','contagem','continua','cont','count','matriz'].map(value=>({value})),disabled:false,click(){c.clicks++;}});
Object.assign(c,{$:id=>elements(id.slice(1)),document:{getElementById:elements},window:c,clicks:0,results:[],timers:[],setTimeout:f=>c.timers.push(f),avisar:()=>{},linhasMatrizDeAoa:()=>[{}],renderMatrizImportador:()=>{},matrizLinhasFiltradas:()=>[{variavel:'Ferrugem'}],colunasBioensaioDeMatriz:()=>[{nome:'tratamento'},{nome:'bloco'},{nome:'Ferrugem'}],preencherIdentificacaoSeVazia:()=>{},gerarIdAuditoria:()=>'',setModo:()=>{},carregarColunas:(cols,roles)=>c.roles=roles,atualizarPipeline:()=>c.pipeline,_agractaEmitirResultado:r=>c.results.push(r),pipeline:{bloqueia:false}});
vm.runInContext(fn(engine,'preencherIdentificacaoSeVazia')+'\n'+fn(engine,'_agTipoResp')+'\n'+fn(engine,'__agractaHandoff'),c);
c.__agractaHandoff({aoa:[[1]],modo:'forense',tipo:jobs[0].tipo,forenseTipo:'cont'});c.timers.shift()();
assert.equal(c.roles.resposta,'Ferrugem');assert.equal(c.roles.tratamento,'tratamento');assert.equal(elements('opt-tipo').value,'proporcao');assert.equal(c.clicks,1);
/* Forense é por VARIÁVEL: leva a repetição (desconto de bloco, gradiente e ordem) e usa
   a data como estrato. Com a matriz aberta na 1ª data, triaria uma avaliação só. */
assert.equal(c.roles.repeticao,'bloco');assert.deepEqual(Array.from(c.roles.estrato),['data_avaliacao']);
c.pipeline={bloqueia:true,checks:[{severidade:'critico',titulo:'Resposta ausente',detalhe:'Selecione a resposta'}]};
c.__agractaHandoff({aoa:[[1]],modo:'forense',tipo:'pct'});c.timers.shift()();
assert.equal(c.clicks,1);assert.equal(c.results[0].ok,false);assert.match(c.results[0].erro,/Resposta ausente/);
{ /* seletor de datas: forense abre em TODAS, como o modo Tempo */
  const sel={value:'2026-01-10',options:[{value:'2026-01-10'},{value:'2026-01-24'},{value:'__todas'}]};let filtrou=0;
  fields['matriz-data']=sel;c.atualizarMatrizFiltros=()=>{filtrou++;};c.pipeline={bloqueia:false};
  c.__agractaHandoff({aoa:[[1]],modo:'forense',tipo:'pct',forenseTipo:'pct'});c.timers.shift()();
  assert.equal(sel.value,'__todas','triagem forense usa todas as datas');assert.equal(filtrou,1,'e reaplica o filtro antes de montar as colunas');
  sel.value='2026-01-10';c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'pct'});c.timers.shift()();
  assert.equal(sel.value,'2026-01-10','a análise por data continua abrindo numa data só');
  delete fields['matriz-data'];c.clicks=1;c.results.length=0;
}
console.log('Handoff: tipo por variável, papéis forenses explícitos e bloqueio devolvido sem timeout OK.');

// O mesmo motor atende estudos consecutivos: identificação e custódia não podem vazar.
c.pipeline={bloqueia:false};
c.__agractaHandoff({aoa:[[1]],titulo:'ESTUDO A',responsavel:'Equipe A',local:'Local A',quadra:'A1',doseUnit:'g/ha'});c.timers.shift()();
assert.equal(elements('audit-estudo').value,'ESTUDO A');
elements('audit-data-coleta').value='2026-01-01';
elements('audit-local-equipamento').value='Equipamento A';
elements('audit-observacao-custodia').value='Observação de A';
c.__agractaHandoff({aoa:[[1]],titulo:'ESTUDO B',local:'Local B',quadra:'B1'});c.timers.shift()();
assert.equal(elements('audit-estudo').value,'ESTUDO B');
assert.equal(elements('audit-responsavel').value,'Agracta');
assert.equal(elements('audit-coletor').value,'');
assert.equal(elements('audit-registro-bruto').value,'Local B · B1 · ESTUDO B');
for(const id of ['audit-data-coleta','audit-local-equipamento','audit-observacao-custodia','opt-unidade']) assert.equal(elements(id).value,'',id);
console.log('Handoff: identificação e custódia isoladas entre estudos OK.');
