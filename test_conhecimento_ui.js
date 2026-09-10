'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
const dom=new JSDOM('<!doctype html><html><body><button id="abrir">Abrir</button></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window;
['vendor/dose-core.js','vendor/ativos-en-core.js','vendor/conhecimento-core.js','integracoes.js'].forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
const src=fs.readFileSync('app.js','utf8');['_avNota','_pctCtrl'].forEach(f=>{const m=src.match(new RegExp('function '+f+'\\([^]*?\\n}'));assert(m);w.eval(m[0]);});
w.QLOCAL={Q1:'l'};w.LOCAIS={l:{nome:'Local X'}};w.ITENS={i:{id:'i',nome:'Segredo comercial',codigoCego:'Cego 01',ativos:'tebuconazol (200 g/L)',vinculosHistoricos:[{qid:'Q1',estudoId:'S1',tratamentoId:'T2',componenteId:''}]}};w.isAdmin=()=>false;w.quadraNome=id=>id;w.save=()=>{throw Error('Leitura não pode salvar');};
w.data={Q1:{cultura:'Soja',tipo:'lab',estudos:[{id:'S1',codigo:'Estudo <img src=x onerror=alert(1)>',numRepeticoes:2,tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Segredo comercial',dose:'1 L/ha'}],avaliacoes:[{id:'A1',data:'2026-09-01',variaveis:['Dano'],tipos:{Dano:'contagem'},notas:{T1R1:{Dano:10},T1R2:{Dano:20},T2R1:{Dano:0},T2R2:{Dano:10}}}]}]}};
const antes=JSON.stringify(w.data),a=w.agConhecimento.construir();assert.equal(JSON.stringify(w.data),antes);assert.equal(a.estudos[0].ambiente,'laboratorio');assert.equal(a.estudos[0].resultados[1].media,5);assert(Math.abs(a.estudos[0].resultados[1].controle-100*10/15)<1e-10);
assert.equal(a.produtos.some(p=>p.nome==='Cego 01'),true);assert.equal(JSON.stringify(a).includes('Segredo comercial'),false);assert.equal(JSON.stringify(a).includes('tebuconazol'),false);
w.abrirConhecimento();assert(w.document.querySelector('#conhecimentoOvl'));assert.equal(w.document.querySelectorAll('[data-aba="clientes"]').length,0);
w.abrirConhecimento({qid:'Q1',sid:'S1'});assert.equal(w.document.querySelectorAll('#conhecimentoOvl img').length,0);assert.equal(JSON.stringify(w.data),antes);
delete w.data.Q1.estudos[0].tratamentos[0].testemunha;assert.equal(w.agConhecimento.construir().estudos[0].resultados[1].controle,null);
const snap=JSON.parse(JSON.stringify({data:w.data,qlocal:w.QLOCAL,locais:w.LOCAIS,itens:w.ITENS}));w.ITENS.i.codigoCego='Alterado depois';assert.equal(w.agConhecimento.projetar('Q1',snap.data.Q1.estudos[0],snap.data.Q1,snap).tratamentos[1].produto,'Cego 01');
dom.window.close();console.log('Interface: leitura sem mutação, notas reais, cegamento histórico, XSS e cópia sincronizada OK.');
