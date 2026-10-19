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
/* A figura do croqui para o relatório (Baixar PNG / Baixar SVG).
   Relato de uso: "não posso baixar a imagem desse croqui? Era legal ter o
   croqui do estudo além do das quadras". */
const P=w.AgractaParcelas,before=JSON.stringify(st);
let exportado=null;
w.AgractaFiguras={exportar:(fig,nome,formato)=>{exportado={fig,nome,formato};return Promise.resolve();}};
P.open('Q','S');
const png=d.querySelector('[data-pc-action="png"]'),svgB=d.querySelector('[data-pc-action="svg"]');
assert.ok(png&&svgB,'a barra do croqui tem Baixar PNG e Baixar SVG');
svgB.click();
assert.equal(exportado.formato,'svg');assert.match(exportado.nome,/^Croqui-SC <teste>$/,'nome do arquivo leva o código do estudo (o exportador limpa os caracteres)');
png.click();assert.equal(exportado.formato,'png');
const fig=exportado.fig,svg=fig.svg;
assert.ok(fig.width>=720&&fig.height>200,'figura com tamanho de página');
assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/,'SVG que abre sozinho, fora do app');
assert.doesNotMatch(svg,/<script|var\(--|class="/,'sem script, sem variável de CSS e sem classe: o arquivo não depende da folha do app');
/* Cada parcela, com o código de campo e o tratamento. */
for(const o of st.randomizacao.ordem){
  assert.ok(svg.includes('>'+o.campo+'</text>'),'a parcela '+o.campo+' aparece na figura');
}
assert.equal((svg.match(/<polygon /g)||[]).length,32,'um polígono por parcela');
assert.ok(svg.includes('>T8</text>'),'o tratamento aparece sob o código da parcela');
/* Limpo: sem as cores de andamento e sem o percurso, que são instrumentos de campo. */
assert.doesNotMatch(svg,/#ff0000|#ffff00|#00ff00|#2263ce/i,'sem as cores de pendente/parcial/concluída/selecionada');
assert.doesNotMatch(svg,/Início|<polyline/,'sem o percurso nem o ponto de início');
/* Relatório: título, norte, escala, tabela de tratamentos e rodapé honesto. */
assert.match(svg,/Croqui das parcelas — SC &lt;teste&gt;/,'título com o código do estudo, escapado');
assert.match(svg,/>N<\/text>/,'seta de norte');
assert.match(svg,/>\d+(,\d+)? m<\/text>/,'barra de escala em metros');
assert.match(svg,/>TRATAMENTOS</,'tabela de tratamentos');
assert.ok(svg.includes('Código cego')&&!svg.includes('Produto 1'),'os tratamentos vêm da projeção (cegada), não do cadastro bruto');
assert.match(svg,/Coordenadas locais em metros, orientadas ao norte/,'o rodapé diz que sistema de coordenadas é');
assert.doesNotMatch(svg,/Agracta|tester/,'rodapé sem o nome do app nem de quem gerou, como a prancha do croqui de quadras');
assert.match(svg,/font-family="Arial, sans-serif"/,'fonte declarada no próprio texto, igual na tela e no arquivo');
assert.equal(JSON.stringify(st),before,'baixar a figura não altera o estudo');
/* Sem croqui posicionado não há o que baixar: os botões somem. */
const semPos=JSON.parse(before);delete semPos.croqui;w.data.Q.estudos.push(Object.assign(semPos,{id:'S2'}));
P.open('Q','S2');assert.equal(d.querySelector('[data-pc-action="png"]'),null,'sem posição no mapa, nada para baixar');
if(process.env.FIGURA_SAIDA)fs.writeFileSync(process.env.FIGURA_SAIDA,svg);
console.log('Croqui das parcelas: figura limpa para o relatório, em PNG e SVG, com norte, escala e tratamentos da projeção OK.');
