/* O mapa na mesa: painéis ancorados, e o mapa continuando vivo por trás.
 *
 * Duas coisas aqui quebram calado:
 *   1. a ficha ancorada é o MESMO overlay que era modal. Se ela voltar a
 *      capturar o ponteiro, o mapa inteiro morre por baixo de um retângulo
 *      transparente — dá para ver o talhão e não dá para clicar nele;
 *   2. a legenda conta o que a tela está pintando. Contar o banco inteiro, ou
 *      somar quadra com parcela, produz um número plausível e errado.
 *
 * Rodar: node test_mapa_mesa.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');

/* ------------------------------------------------------------- 1. o CSS -- */
const css=fs.readFileSync('mapa-mesa.css','utf8');
assert.match(css,/@media \(min-width:1100px\)/,'a folha inteira mora na media query: no celular nada disto existe');
assert.ok(css.indexOf('@media (min-width:1100px)')<css.indexOf('html.mesa .ag-drawer{'),
  'a ancoragem precisa estar DENTRO da media query');
const ficha=(css.match(/html\.mesa \.overlay#dOvl\{[^}]*\}/)||[''])[0];
assert.match(ficha,/pointer-events:none/,'o overlay da ficha não pode capturar o ponteiro: o mapa fica atrás dele');
const painel=(css.match(/html\.mesa \.overlay#dOvl \.panel\{[^}]*\}/)||[''])[0];
assert.match(painel,/pointer-events:auto/,'…mas a ficha em si precisa receber cliques, senão ela vira enfeite');
assert.match(css,/html\.mesa \.ag-drawer-bg\{display:none!important\}/,
  'o fundo escurecido é de janela modal: ancorado, ele apagaria o mapa que o painel serve para operar');
assert.match(css,/html\.mesa:has\(#dOvl\.open\) \.mm-ctrl/,
  'com a ficha aberta os controles saem de baixo dela');

/* ------------------------------------------------- 2. publicação ---------- */
const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
['mapa-mesa.css','mapa-mesa.js'].forEach(a=>{
  const pedido=(html.match(new RegExp(a.replace('.','\\.')+'\\?v=\\d+'))||[])[0];
  assert.ok(pedido,a+' precisa estar no index.html');
  assert.ok(sw.includes(pedido),'o sw.js precisa pré-carregar exatamente "'+pedido+'"');
});
assert.ok(html.indexOf('mesa.js?v=')<html.indexOf('mapa-mesa.js?v='),
  'o mapa-mesa.js carrega depois do mesa.js, que é quem declara a mesa no <html>');

/* --------------------------------------------------------- 3. a legenda -- */
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{console.log('PULADO: jsdom não está instalado.');process.exit(0);}
const M=require('./vendor/mascara-core.js');
const fonte=fs.readFileSync('mapa-mesa.js','utf8');

function abrir(op){
 op=op||{};
 const dom=new JSDOM('<!doctype html><html'+(op.mesa?' class="mesa"':'')+'><body></body></html>',
   {url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window;
 w.MascaraCore=M;
 w.quadrasAtivas=()=>Object.keys(op.quadras||{});
 w._mascaraContagem=id=>(op.quadras||{})[id];
 w.editMode=!!op.editando;w.editId=op.editando||null;
 w.agToggleDrawer=()=>{};
 w.eval(fonte);
 return {w,d:w.document};
}
const QUADRAS={
 Q1:{done:24,partial:0,empty:0},   /* tudo lançado */
 Q2:{done:12,partial:6,empty:6},   /* em lançamento */
 Q3:{done:0,partial:0,empty:16},   /* nada lançado */
 Q4:{done:0,partial:0,empty:0}     /* sem estudo/avaliação */
};
{
 const {w}=abrir({mesa:true,quadras:QUADRAS});
 const c=w.agMapaMesa.contar();
 assert.equal(c.avaliada,36,'soma as parcelas concluídas das quadras do local');
 assert.equal(c.parcial,6);
 assert.equal(c.pendente,22);
 assert.equal(c.fora,1,'quadra sem estudo conta como QUADRA, não como parcela');
 assert.equal(c.selecionada,0);
 const leg=w.agMapaMesa.legenda();
 assert.match(leg,/parcelas/);assert.match(leg,/quadras/,'as duas unidades aparecem nomeadas — somá-las daria um total sem significado');
 assert.ok(!/Selecionada/.test(leg),'sem quadra selecionada a linha não aparece, em vez de mostrar zero');
 assert.ok(leg.includes(M.estilo('avaliada').cor)&&leg.includes(M.estilo('pendente').cor),
   'a legenda usa as MESMAS cores que pintam os polígonos');
 w.close();
}
{
 /* A quadra em edição é contada como selecionada e sai das outras contagens:
    ela está azul no mapa, não verde. */
 const {w}=abrir({mesa:true,quadras:QUADRAS,editando:'Q1'});
 const c=w.agMapaMesa.contar();
 assert.equal(c.selecionada,1);
 assert.equal(c.avaliada,12,'as 24 parcelas da quadra selecionada não contam também como avaliadas');
 assert.match(w.agMapaMesa.legenda(),/Selecionada/);
 w.close();
}
{
 /* Sem o motor da máscara ou sem as funções do app, a legenda não inventa. */
 const dom=new JSDOM('<!doctype html><html class="mesa"><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 dom.window.eval(fonte);
 assert.deepEqual(JSON.parse(JSON.stringify(dom.window.agMapaMesa.contar())),
   {avaliada:0,parcial:0,pendente:0,fora:0,selecionada:0},'sem o app carregado a contagem é zero, não um palpite');
 dom.window.close();
}

/* ------------------------------------------- 4. só na mesa ---------------- */
{
 const {w,d}=abrir({quadras:QUADRAS});
 assert.equal(d.getElementById('mmLegenda'),null,'em tela estreita não se monta nada');
 assert.equal(d.getElementById('mmControles'),null);
 d.documentElement.classList.add('mesa');w.agMapaMesa.montar();
 assert.ok(d.getElementById('mmLegenda')&&d.getElementById('mmControles'),'na mesa, os dois painéis entram');
 w.agMapaMesa.desmontar();
 assert.equal(d.getElementById('mmLegenda'),null,'e saem quando a mesa sai');
 w.close();
}

/* ------------------------------- 5. a legenda acompanha o mapa ------------ */
{
 const dom=new JSDOM('<!doctype html><html class="mesa"><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window;
 w.MascaraCore=M;
 let quadras={Q1:{done:4,partial:0,empty:0}};
 w.quadrasAtivas=()=>Object.keys(quadras);
 w._mascaraContagem=id=>quadras[id];
 w.agToggleDrawer=()=>{};
 let renderizou=0;w.render=function(){renderizou++;return 'ok';};
 w.eval(fonte);
 assert.match(w.document.getElementById('mmLegenda').textContent,/4/);
 quadras={Q1:{done:4,partial:0,empty:0},Q2:{done:0,partial:0,empty:9}};
 assert.equal(w.render(),'ok','o render original continua devolvendo o que devolvia');
 assert.equal(renderizou,1,'e continua sendo chamado uma vez');
 assert.match(w.document.getElementById('mmLegenda').textContent,/9/,
   'repintar o mapa repinta a contagem: quem sabe que as cores mudaram é o render');
 w.close();
}

console.log('Mapa na mesa: painéis ancorados, mapa clicável por trás da ficha, legenda contando o que a tela pinta OK.');
