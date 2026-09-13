/* Resultados com erro não viram sucesso; fechamento e UI mantêm proveniência. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const fn=n=>src.match(new RegExp('function '+n+'\\([^]*?\\n}'))[0];
const c={JSON,Date,_bioAutoCache:{},MOTOR_CALCULO:'teste',_bioestatSignature:s=>s.sig,
 _bioestatJobs:()=>[{jobKey:'A|Sev',avId:'A',date:'2026-09-11',variavel:'Sev'}],
 _bioestatJobsTempo:()=>[{jobKey:'__tempo__|Mort',variavel:'Mort',unidade:'dias'}],
 _bioestatPendentes:()=>[],_biocGravar:()=>{throw Error('Não guardar erros');}};
vm.createContext(c);['_bioestatEstadoResultado','_bioestatManifesto','_bioestatSnapshotAvancado','_bioestatPersistir'].forEach(n=>vm.runInContext(fn(n),c));
const study={id:'S',sig:'nova'};
c._bioAutoCache['Q|S']={sig:'velha',results:{'A|Sev':{ok:true}}};
assert.equal(c._bioestatSnapshotAvancado('Q',study).pendencias.length,3,'cache antigo não fecha estudo');
const cache=c._bioAutoCache['Q|S']={sig:'nova',status:'ready',qid:'Q',sid:'S',results:{'A|Sev':{ok:true,analise:{p:.02}},'A|Sev|F':{ok:false,erro:'tempo esgotado'}}};
let snap=c._bioestatSnapshotAvancado('Q',study);assert.equal(snap.completo,false);assert.equal(snap.pendencias[0].estado,'erro');assert.equal(snap.pendencias[1].estado,'pendente');c._bioestatPersistir(cache);
cache.results['A|Sev|F']={ok:true};cache.results['__tempo__|Mort']={ok:true};snap=c._bioestatSnapshotAvancado('Q',study);assert.equal(snap.completo,true);
cache.results['A|Sev'].analise.p=.9;assert.equal(snap.results['A|Sev'].analise.p,.02,'snapshot independente do cache');
c._bioestatPendentes=()=>[{avId:'B',date:'2026-09-12',variavel:'Sev'}];assert.equal(c._bioestatSnapshotAvancado('Q',study).completo,false);
assert(src.includes('st.estatisticaFinal.avancado=_bioestatSnapshotAvancado(qid,st)'));
assert(src.includes('estatistica:st.estatisticaFinal||null'),'histórico preserva o snapshot completo');
const {JSDOM}=require('jsdom');
(async()=>{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
 ['vendor/conhecimento-core.js','integracoes.js','estudo-pagina.js'].forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
 w.HTMLElement.prototype.scrollIntoView=function(){};w.eval(fn('_avNota'));
 w.data={Q:{estudos:[{id:'S',codigo:'Estudo',numRepeticoes:1,tratamentos:[{id:'T1',produto:'Testemunha'},{id:'T2',produto:'Segredo'}],avaliacoes:[{id:'A',data:'2026-09-11',variaveis:['Sev'],notas:{T1R1:{Sev:40},T2R1:{Sev:10}}},{id:'B',data:'2026-09-12',variaveis:['Sev'],notas:{T2R1:{Sev:12}}}]}]}};
 w.QLOCAL={};w.LOCAIS={};w.ITENS={};
 const s=w.data.Q.estudos[0],projected=w.agConhecimento.projetar;
 let report={jobs:[{jobKey:'A|Sev',avId:'A',date:'2026-09-11',variavel:'Sev',modo:'analise'}],results:{'A|Sev':{ok:false,erro:'<img src=x onerror=alert(1)>'}},indisponiveis:[],geradoEm:'2026-09-11'};
 w._bioestatSnapshotAvancado=()=>report;w._forenseAchadosEstudo=()=>[];w._forenseAchados=()=>[];
 let retries=0;w._bioestatRepetir=()=>retries++;
 const before=JSON.stringify(s);w.abrirConhecimento({qid:'Q',sid:'S'});
 assert.match(d.querySelector('#ep-analysis-body').textContent,/1 com erro/);assert.equal(d.querySelectorAll('#ep-analysis-body img').length,0);
 d.querySelector('[data-ep-action="retry"]').click();assert.equal(retries,1);
 d.querySelector('[data-ep-source="A"]').click();assert.equal(d.querySelectorAll('#ep-raw-body tbody tr').length,2);
 d.querySelector('[data-ep-source=""]').click();assert.equal(d.querySelectorAll('#ep-raw-body tbody tr').length,4);
 report.results['A|Sev']={ok:true,decisao:'Rota verificada'};w.AgEstudoPagina.atualizarAnalises({qid:'Q',sid:'S'});assert.match(d.querySelector('#ep-analysis-body').textContent,/1 calculados/);
 assert.equal(JSON.stringify(s),before,'leitura não altera estudo');
 // Relatório de fechamento vem do estudo, mesmo em aparelho sem cache.
 s.finalizacao={em:'2026-09-11'};s.estatisticaFinal={avancado:JSON.parse(JSON.stringify(report))};s.estatisticaFinal.avancado.results['A|Sev'].decisao='Fechamento original';
 report.results['A|Sev'].decisao='Cache modificado';w.abrirConhecimento({qid:'Q',sid:'S'});assert.match(d.querySelector('#ep-analysis-body').textContent,/Fechamento original/);assert.doesNotMatch(d.querySelector('#ep-analysis-body').textContent,/Cache modificado/);
 // Protege nomes cegados também dentro dos relatórios livres.
 w.ITENS={i:{nome:'Segredo',codigoCego:'SC 001'}};s.estatisticaFinal.avancado.results['A|Sev'].decisao='Segredo foi analisado';w.abrirConhecimento({qid:'Q',sid:'S'});assert.doesNotMatch(d.querySelector('#ep-analysis-body').textContent,/Segredo/);assert.match(d.querySelector('#ep-analysis-body').textContent,/SC 001/);
 dom.window.close();console.log('Dossiê: erros, cache antigo, tempo, snapshot, fechamento, atualização, vínculo à avaliação, cegamento e XSS OK.');
})().catch(e=>{console.error(e);process.exit(1);});
