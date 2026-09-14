/* O topo do dossiê na mesa: a vista do campo, a fila de destaques e o croqui.
 *
 * O que pode dar errado sem quebrar tela:
 *   1. o celular baixar o módulo 3D sem ninguém pedir — ele é pesado, e quem
 *      está no talhão não deve pagar por uma tela de mesa;
 *   2. duas portas para a mesma vista (a do topo e o botão dos Gráficos);
 *   3. o croqui inventar a ordem das parcelas, parecendo plano de campo;
 *   4. o croqui vazar o nome comercial que a projeção cegou;
 *   5. "melhor tratamento" ignorar o sentido da variável, ou chamar de melhor
 *      a testemunha sem dizer que é ela.
 *
 * Rodar: node test_estudo_topo.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{console.log('PULADO: jsdom não está instalado.');process.exit(0);}

const src=fs.readFileSync('app.js','utf8');
function montar(op){
 op=op||{};
 const dom=new JSDOM('<!DOCTYPE html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 ['vendor/conhecimento-core.js','integracoes.js','estudo-pagina.js'].forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
 w.eval(src.match(/function _avNota\([^]*?\n}/)[0]);
 w.QLOCAL={Q1:'l'};w.LOCAIS={l:{nome:'Fazenda Boa Vista'}};w.ITENS=op.itens||{};
 w.save=()=>{throw Error('Leitura não salva');};
 /* A ordem das parcelas vem do app; aqui ela é fingida de propósito, e carrega
    o nome CRU do produto — que é justamente o que o croqui não pode imprimir. */
 if(!op.semOrdem) w._avRowsForStudy=st=>{
  const out=[];(st.tratamentos||[]).forEach(t=>{for(let r=1;r<=(st.numRepeticoes||1);r++)
   out.push({key:t.id+'R'+r,tratId:t.id,rep:r,campo:t.id+r,produto:t.produto});});
  return out;
 };
 if(op.mesa)d.documentElement.classList.add('mesa');
 return {w,d};
}
function estudo(extra){
 return Object.assign({id:'S1',codigo:'24-118',cultura:'Soja',alvo:'Ferrugem asiática',numRepeticoes:4,dataInicio:'2026-06-01',
  tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Segredo comercial',dose:'0,5 L/ha'},{id:'T3',produto:'Padrão',dose:'0,6 L/ha'}],
  avaliacoes:[{id:'A1',data:'2026-07-22',variaveis:['Severidade'],tipos:{Severidade:'pct'},
   notas:Object.fromEntries(['T1','T2','T3'].flatMap((t,j)=>[1,2,3,4].map(r=>[t+'R'+r,{Severidade:[60,12,30][j]+r}])))}]},extra||{});
}
const texto=el=>el.textContent.replace(/\s+/g,' ').trim();

(async()=>{

/* ------------------------------------- 1. no celular nada muda ------------ */
{
 const {w,d}=montar();w.data={Q1:{estudos:[estudo()]}};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 assert.equal(d.getElementById('ep-campo'),null,'sem mesa não existe seção da vista do campo');
 assert.equal(d.getElementById('ep-campo3d'),null,'e o módulo 3D não é montado — no talhão ele não se baixa sozinho');
 assert.ok(d.querySelector('[data-ep-action="campo"]'),'o botão "Ver no campo" continua nos Gráficos');
 w.close();
}

/* ------------------------------------- 2. na mesa, uma porta só ----------- */
{
 const {w,d}=montar({mesa:true});w.data={Q1:{estudos:[estudo()]}};
 const montagens=[];w.abrirCampo3D=(s,st,o)=>montagens.push({s,st,op:o});
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 assert.ok(d.getElementById('ep-campo'),'na mesa a vista é seção do topo');
 assert.ok(d.querySelector('[data-ep-scroll="ep-campo"]'),'e entra na navegação do dossiê');
 assert.equal(d.querySelectorAll('[data-ep-action="campo"]').length,0,
   'o botão dos Gráficos some: duas portas para a mesma tela foi o que já confundiu uma vez');
 await new Promise(r=>setTimeout(r,0));
 assert.equal(montagens.length,1,'a vista é montada uma vez por pintura do dossiê');
 assert.equal(montagens[0].op.hospedeiro,d.getElementById('ep-campo3d'),'e dentro do topo, não numa janela');
 assert.equal(montagens[0].op.variavel,'Severidade','herda a variável que o painel já mostra');
 assert.equal(montagens[0].st.id,'S1','recebe o estudo cru, de onde saem os valores por parcela');
 w.close();
}

/* ------------------------------------- 3. o croqui não inventa ordem ------ */
{
 const {w,d}=montar({mesa:true,semOrdem:true});w.data={Q1:{estudos:[estudo()]}};
 w.abrirCampo3D=()=>{};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 assert.equal(d.querySelector('.ep-croqui'),null,
   'sem a ordem real das parcelas não se desenha croqui: grade em ordem de cadastro parecendo plano de campo é pior que croqui nenhum');
 w.close();
}
{
 const {w,d}=montar({mesa:true});w.data={Q1:{estudos:[estudo()]}};
 w.abrirCampo3D=()=>{};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 assert.equal(d.querySelectorAll('.ep-croqui-parcela').length,12,'3 tratamentos × 4 repetições');
 assert.equal(d.querySelectorAll('.ep-croqui-linha').length,4,'uma linha por bloco');
 assert.match(texto(d.querySelector('.ep-croqui .con-note')),/randomização não foi ativada/,
   'sem randomização salva o croqui diz que a ordem é a do cadastro');
 w.data.Q1.estudos[0].randomizado=true;
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 assert.match(texto(d.querySelector('.ep-croqui .con-note')),/Ordem randomizada salva/);
 w.close();
}

/* ------------------------------------- 4. cegamento no croqui ------------- */
{
 const itens={i:{id:'i',nome:'Segredo comercial',codigoCego:'Cego 01',ativos:'tebuconazol',
   vinculosHistoricos:[{qid:'Q1',estudoId:'S1',tratamentoId:'T2',componenteId:''}]}};
 const {w,d}=montar({mesa:true,itens:itens});w.data={Q1:{estudos:[estudo()]}};
 w.isAdmin=()=>false;w.abrirCampo3D=()=>{};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 const croqui=d.querySelector('.ep-croqui');
 assert.ok(croqui,'croqui desenhado');
 assert.ok(!/Segredo comercial/.test(croqui.innerHTML),
   'o croqui tira os nomes da PROJEÇÃO, que é quem cega — nunca das linhas de parcela, que trazem o nome cru');
 assert.match(croqui.innerHTML,/Cego 01/,'e mostra o código cego no lugar');
 w.close();
}

/* ------------------------------------- 5. a fila de destaques ------------- */
{
 const {w,d}=montar({mesa:true});w.data={Q1:{estudos:[estudo()]}};
 w.abrirCampo3D=()=>{};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 const kpis=Array.from(d.querySelectorAll('.ep-kpi')).map(texto);
 const media=kpis.find(x=>/Média de Severidade/.test(x));
 assert.ok(media,'a fila mostra a média da variável');
 assert.match(media,/36,5/,'média das médias por tratamento: (62,5 + 14,5 + 32,5) / 3');
 assert.match(media,/22\/07\/2026 · 51 DAA/,'e diz de QUAL avaliação está falando — sem a data, um número de um dia vira verdade do estudo');
 const melhor=kpis.find(x=>/Melhor tratamento/.test(x));
 assert.match(melhor,/T2/,'menor severidade é o melhor quando o sentido é "menor primeiro"');
 assert.match(melhor,/extremo pelo sentido declarado, não teste/,'e a fila não se apresenta como teste estatístico');
 assert.ok(kpis.some(x=>/Avaliações concluídas/.test(x)&&/1/.test(x)));
 assert.ok(kpis.some(x=>/Parcelas/.test(x)&&/12/.test(x)));

 /* Sentido invertido: com "maior primeiro", o melhor passa a ser o maior. */
 const st=w.data.Q1.estudos[0];
 st.avaliacoes[0].varcfg={Severidade:{sentido:'maior'}};
 w.abrirConhecimento({qid:'Q1',sid:'S1'});
 const invertido=Array.from(d.querySelectorAll('.ep-kpi')).map(texto).find(x=>/Menor valor|Melhor tratamento/.test(x));
 assert.match(invertido,/T1/,'com o sentido invertido o extremo muda de lado');
 assert.match(invertido,/Menor valor: a testemunha/,
   'e quando o extremo é a própria testemunha a fila diz isso, em vez de chamar de melhor tratamento quem não recebeu tratamento');
 w.close();
}

/* --------------------------- 6. a vista embutida não é janela ------------- */
{
 const dom=new JSDOM('<!DOCTYPE html><html><body><div id="host"></div></body></html>',
   {url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window,d=w.document;
 w.requestAnimationFrame=()=>0;
 /* jsdom não pinta: um contexto de mentirinha deixa a tela ser montada, que é
    o que este teste olha. O desenho em si é do test_campo3d.js. */
 w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({},{get:(o,k)=>k==='canvas'?{}:(k==='measureText'?(()=>({width:10})):(()=>{}))});
 w.eval(fs.readFileSync('app.js','utf8').match(/function _avNota\([^]*?\n}/)[0]);
 w.eval(fs.readFileSync('campo-3d.js','utf8'));
 const st=estudo(),proj={codigo:'24-118',cultura:'Soja',alvo:'Ferrugem asiática',tratamentos:st.tratamentos};
 const host=d.getElementById('host');
 w.abrirCampo3D(proj,st,{hospedeiro:host});
 assert.ok(host.querySelector('#c3cv'),'a vista é montada dentro do hospedeiro');
 assert.equal(d.getElementById('campo3dOvl'),null,'e não cria a janela modal em paralelo');
 assert.equal(host.getAttribute('aria-modal'),null,'embutida não é diálogo modal');
 assert.equal(host.querySelector('[data-c3="fechar"]'),null,'e não tem botão de fechar: fechar deixaria um buraco no topo do dossiê');
 assert.match(host.className,/c3-embutida/,'a classe é quem desfaz o que é de janela na folha de estilo');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.ok(host.querySelector('#c3cv'),'Esc não fecha a vista embutida — fecharia o dossiê por baixo dela');

 /* A janela continua sendo janela. */
 w.abrirCampo3D(proj,st,{});
 const ov=d.getElementById('campo3dOvl');
 assert.ok(ov&&ov.querySelector('[data-c3="fechar"]'),'o modal mantém o botão de fechar');
 assert.equal(ov.getAttribute('aria-modal'),'true');
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(ov.hidden,true,'e Esc continua fechando a janela');
 w.close();
}

console.log('Topo do dossiê: vista só na mesa, uma porta, croqui com ordem real e cega, destaques com data e sentido OK.');
})();
