'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('app.js','utf8');
function fn(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);const end=source.indexOf('\nfunction ',start+1);return source.slice(start,end<0?source.length:end);}
const dom=new JSDOM('<!doctype html><html><body><button id="entry">Croqui</button></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.HTMLElement.prototype.scrollIntoView=function(){};
w.SVGElement.prototype.scrollIntoView=function(){};
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
w._authUser={uid:'tester'};w.normalizeStudy=s=>s;w._repLetter=r=>'ABCD'[r-1];w._repDisplay=w._repLetter;w._campoCode=(t,r)=>t+w._repLetter(r);w.ensureStudyRandomizacao=s=>s.randomizacao;
w._parseParcelaDim=s=>s?{comprimento:5,largura:3}:null;
['croquiPos','croquiGrade','_avRowKey','_avRowsForStudy'].forEach(name=>w.eval(fn(name)));
w.eval(fs.readFileSync('vendor/croqui-campo-core.js','utf8'));
const st={id:'S',codigo:'SC <teste>',numRepeticoes:4,randomizado:true,protocolo:{tamanhoParcela:'5 x 3 m'},tratamentos:Array.from({length:8},(_,i)=>({id:'T'+(i+1),produto:'Produto '+i})),croqui:{lat:-22,lng:-47,ang:.2,colunas:2,serpentina:true,carreador:0,espacamento:0},avaliacoes:[
 {id:'A',data:'2026-09-18',variaveis:['Severidade','Incidência'],notas:{T1R1:{Severidade:0,Incidência:0},T2R1:{Severidade:12}}},
 {id:'B',data:'2026-09-19',variaveis:[],notas:{}},
 {id:'F',data:'2026-09-25',variaveis:['Severidade'],notas:{}}
]};
st.randomizacao={ordem:Array.from({length:32},(_,i)=>({parcela:i+1,rep:Math.floor(i/8)+1,tratNum:i%8+1,tratId:'T'+(i%8+1),campo:(i%8+1)+'ABCD'[Math.floor(i/8)]}))};
w.data={Q:{estudos:[st]}};w.quadraNome=()=> 'Q';w.todayISO=()=> '2026-09-19';w.avQuemAtivo=()=>null;w.estudoFinalizado=s=>!!s.finalizacao;
w.agConhecimento={projetar:()=>({qid:'Q',sid:'S',codigo:st.codigo,tratamentos:st.tratamentos.map(t=>({id:t.id,produto:'Código cego'}))})};
let calls=[],redraws=0;
w.openStudyDetail=(q,s)=>calls.push(['study',q,s]);w.openStudyEditAvaliacao=id=>calls.push(['assessment',id]);w.avCroquiSelect=key=>calls.push(['row',key]);w.abrirGaleriaFotos=(s,initial)=>calls.push(['photos',initial]);w.renderCroquis=()=>redraws++;w.posicionarCroquiDoEstudo=(q,s)=>calls.push(['position',q,s]);
w.eval(fs.readFileSync('vendor/avaliacao-core.js','utf8'));
w.eval(fs.readFileSync('croqui-parcelas.js','utf8'));
const before=JSON.stringify(st),P=w.AgractaParcelas,g=P.layout(st);
assert.equal(g.parcelas.length,32);assert.equal(g.colunas,2);assert.equal(g.linhas,16);
assert.equal(g.parcelas[0].row.key,'T1R1');assert.equal(g.parcelas[0].lin,0);
assert.equal(g.parcelas[16].lin,15);assert.equal(g.parcelas[31].lin,0);assert.equal(g.parcelas[31].row.key,'T8R4');
for(const serpentina of [true,false])for(const colunas of [1,2,3,7]){
 const copy=JSON.parse(before);Object.assign(copy.croqui,{serpentina,colunas,espacamento:1,carreador:2});
 const actual=P.layout(copy),expected=w.croquiGrade(JSON.parse(JSON.stringify(copy)),w.croquiPos(copy));
 assert.equal(actual.parcelas.length,32);actual.parcelas.forEach((p,i)=>{assert.equal(p.x,expected.parcelas[i].x);assert.equal(p.y,expected.parcelas[i].y);assert.equal(p.row.tratId,expected.parcelas[i].tratId);});
}
assert.equal(P.status(g.parcelas[0].row,st.avaliacoes[0].variaveis,st.avaliacoes[0].notas,true),'done','zero é um valor completo');
assert.equal(P.status(g.parcelas[1].row,st.avaliacoes[0].variaveis,st.avaliacoes[0].notas,true),'partial');
assert.equal(P.status(g.parcelas[2].row,st.avaliacoes[0].variaveis,st.avaliacoes[0].notas,true),'empty');
P.open('Q','S');assert.equal(d.querySelector('#pc-assessment').value,'B','seleciona a data atual, não uma data futura');
assert.equal(d.querySelectorAll('[data-pc-pick]').length,32);assert.equal(d.querySelectorAll('.pc-cell.empty').length,32);
assert.equal(d.querySelectorAll('.pc-dialog script').length,0);
const setDate=id=>{const s=d.querySelector('#pc-assessment');s.value=id;s.dispatchEvent(new w.Event('change',{bubbles:true}));};
setDate('A');assert.equal(d.querySelectorAll('.pc-cell.done').length,1);assert.equal(d.querySelectorAll('.pc-cell.partial').length,1);assert.equal(d.querySelectorAll('.pc-cell.empty').length,30);
d.querySelector('[data-pc-pick="T2R1"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
assert.match(d.querySelector('.pc-detail').textContent,/Parcela 2A/);assert.match(d.querySelector('.pc-detail').textContent,/Código cego/);assert.doesNotMatch(d.querySelector('.pc-detail').textContent,/Produto 1/);
d.querySelector('[data-pc-action="photos"]').click();assert.equal(calls.at(-1)[1].treatment,'T2');assert.equal(calls.at(-1)[1].rep,1);assert.equal(calls.at(-1)[1].filter,true);
d.querySelector('[data-pc-action="evaluate"]').click();assert.deepEqual(calls.slice(-3),[['study','Q','S'],['assessment','A'],['row','T2R1']]);
P.open('Q','S','T8R4');assert.equal(d.querySelector('.pc-cell.selected').dataset.pcPick,'T8R4');
assert.equal(JSON.stringify(st),before,'consultar não altera estudo, ordem ou avaliações');
st.avaliacoes[0].duplaLeitura=true;st.avaliacoes[0].avaliadores={A:{notas:{T2R1:{Severidade:4}}},B:{notas:{T2R1:{Severidade:91}}}};w.avQuemAtivo=()=> 'A';P.refresh();
assert.equal(P.notes(st.avaliacoes[0]).T2R1.Severidade,4);
assert.equal(Object.keys(P.notes({duplaLeitura:true})).length,0,'leitura ausente não mostra notas de outro avaliador');
st.finalizacao={em:'2026-09-19'};P.refresh();assert.equal(d.querySelector('[data-pc-action="evaluate"]'),null);assert.equal(d.querySelector('[data-pc-action="position"]'),null);
delete st.finalizacao;const semPos=JSON.parse(before);delete semPos.croqui;assert.equal(P.layout(semPos).parcelas.length,0);
const semDim=JSON.parse(before);semDim.protocolo={};assert.equal(P.layout(semDim).parcelas.length,0);
const repetida=JSON.parse(before);repetida.randomizacao.ordem[1]=Object.assign({},repetida.randomizacao.ordem[0]);assert.equal(P.layout(repetida).parcelas.length,0,'duplicata não cria vínculo errado');
w._avCroquiOpen=true;w._avGrid={variaveis:['Severidade'],notas:{T1R1:{Severidade:0}}};w._avCroquiKey='T8R4';
const host=d.createElement('div');host.innerHTML=P.evaluation(st,[],[]);assert.equal(host.querySelectorAll('[data-pc-eval]').length,32);assert.equal(host.querySelector('.selected').dataset.pcEval,'T8R4');
// O painel compacto não se perde nos redesenhos e o enquadramento usa a área real.
let fitted=null;w._croquiEdit={qid:'Q',sid:'S',pos:st.croqui};w._estudoDe=()=>st;
let size={x:390,y:800};w._map={getSize:()=>size,getContainer:()=>({getBoundingClientRect:()=>({left:0,top:0,right:size.x,bottom:size.y})}),fitBounds:(bounds,options)=>{fitted=options;},panTo(){}};
w.LF={latLngBounds:p=>p};['croquiEnquadrar','croquiToggleAjustes'].forEach(name=>w.eval(fn(name)));
const panel=d.createElement('div');panel.id='croquiPanel';panel.className='croqui-panel pc-position croqui-compacto';panel.innerHTML='<button class="croqui-toggle" aria-expanded="false">Ajustes</button>';d.body.append(panel);
panel.getBoundingClientRect=()=>({left:8,right:382,top:panel.classList.contains('croqui-compacto')?580:340,bottom:710,height:panel.classList.contains('croqui-compacto')?130:370});
w.croquiEnquadrar();assert.equal(fitted.paddingBottomRight[1],240);
w.croquiToggleAjustes();assert.equal(panel.querySelector('button').getAttribute('aria-expanded'),'true');assert.equal(fitted.paddingBottomRight[1],480,'não limita a margem e deixa croqui atrás do painel');
w.croquiToggleAjustes();assert.equal(panel.querySelector('button').textContent,'Ajustes');assert.equal(fitted.paddingBottomRight[1],240);
size={x:1360,y:900};panel.getBoundingClientRect=()=>({left:12,right:312,top:380,bottom:820,height:440});w.croquiEnquadrar();assert.equal(fitted.paddingTopLeft[0],332,'desktop aproveita o espaço ao lado do painel');
assert.equal(redraws>0,true);
dom.window.close();console.log('Croqui interativo: geometria, serpentina, zeros, data, leitura cegada, parcela correta, fotos, finalização e painel recolhível OK.');
