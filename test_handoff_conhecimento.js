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

// Placa numa série de concentrações: o Agracta pede a CURVA de dose (CE50). O pedido
// só vale com a coluna de dose — sem ela, a curva não tem eixo e fica a análise comum.
c.colunasBioensaioDeMatriz=()=>[{nome:'tratamento'},{nome:'bloco'},{nome:'dose'},{nome:'Crescimento micelial (mm)'}];
c.matrizLinhasFiltradas=()=>[{variavel:'Crescimento micelial (mm)'}];
c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'numero',modelo:'curva',doseUnit:'ppm',maiorMelhor:false});c.timers.shift()();
assert.equal(elements('opt-modelo').value,'curva','placa em série: curva de dose');
assert.equal(c.roles.dose,'dose','com a dose no papel certo');
assert.equal(elements('opt-unidade').value,'ppm','e a unidade da concentração');
c.colunasBioensaioDeMatriz=()=>[{nome:'tratamento'},{nome:'bloco'},{nome:'Crescimento micelial (mm)'}];
c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'numero',modelo:'curva'});c.timers.shift()();
assert.equal(elements('opt-modelo').value,'auto','sem coluna de dose, o pedido de curva não vale');
c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'pct'});c.timers.shift()();
assert.equal(elements('opt-modelo').value,'auto','sem pedido, continua automático');
console.log('Handoff: placa em série vai para a curva de dose (CE50) só com a dose no papel OK.');

// Mortalidade n/N numa série de doses: o Agracta manda mortos (Afetados) e avaliados
// (N_total). Isso é binomial "x de n" — a entrada da CL50 (Robertson et al., 2007).
// Antes o motor via só a porcentagem, chamava de contagem e recusava a curva.
c.colunasBioensaioDeMatriz=()=>[{nome:'tratamento',valores:['T1','T2']},{nome:'bloco',valores:['1','1']},{nome:'dose',valores:['0','1']},{nome:'Mortalidade',valores:['10','70']},{nome:'tempo_n_total',valores:['10','10']}];
c.matrizLinhasFiltradas=()=>[{variavel:'Mortalidade',afetados:'1',n_total:'10'},{variavel:'Mortalidade',afetados:'7',n_total:'10'}];
let colsVistas=null; c.carregarColunas=(cols,roles)=>{c.roles=roles;colsVistas=cols;};
elements('opt-tipo').options.push({value:'binomial'}); /* a tela real tem Binomial (x de n) */
c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'razao'});c.timers.shift()();
assert.equal(c.roles.n_total,'n_total','o N entra como n total (x de n)');
assert.equal(elements('opt-tipo').value,'binomial','a resposta é binomial, não contagem');
assert.deepEqual(colsVistas.find(x=>x.nome==='Mortalidade').valores,['1','7'],'a resposta passa a ser a contagem de mortos');
assert.ok(!colsVistas.some(x=>x.nome==='tempo_n_total'),'a coluna do modo Tempo sai de cena');
assert.equal(c.roles.dose,'dose','a dose segue no papel de dose');
assert.deepEqual(Array.from(c.roles.fatores),[],'série de um produto é UMA curva: sem agrupar por tratamento');
c.matrizLinhasFiltradas=()=>[{variavel:'Mortalidade',afetados:'1',n_total:'10'},{variavel:'Mortalidade',afetados:'',n_total:''}];
c.__agractaHandoff({aoa:[[1]],modo:'analise',tipo:'razao'});c.timers.shift()();
assert.ok(!c.roles.n_total,'par incompleto em alguma linha: não finge binomial');
console.log('Handoff: mortalidade n/N em série vira binomial x de n (CL50) OK.');
