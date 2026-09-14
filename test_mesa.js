/* A casca de mesa: uma coluna, as portas que já existem, e nada no celular.
 *
 * O que este teste tranca:
 *   1. a coluna só existe em tela larga E depois da autenticação;
 *   2. cada seção abre a porta que já existe — nenhuma tela nova, nenhuma
 *      lista paralela de estudos (foi ela que já confundiu uma vez);
 *   3. Insights e Relatórios são do ESTUDO: sem estudo em foco, a coluna diz
 *      isso e leva para Estudos, em vez de abrir uma tela vazia;
 *   4. todo painel que ocupa a tela inteira recua diante da coluna. Este é o
 *      que mais se perde com o tempo: um painel novo com inset:0 nasceria por
 *      baixo da coluna, e a falha é visual — nenhum teste de lógica a pega.
 *
 * Rodar: node test_mesa.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');

/* ----------------------------------------------------- 1. a conta do CSS --- */
/* Posição fixa ignora o padding do body: cada painel em tela cheia precisa do
   próprio recuo em mesa.css. Em vez de confiar na memória, o teste varre as
   folhas e cobra a lista. */
const mesaCss=fs.readFileSync('mesa.css','utf8');
const recuados=(mesaCss.match(/html\.mesa\s*:is\(([^)]*)\)\s*\{\s*left:var\(--mesa-w\)/)||[])[1];
assert.ok(recuados,'mesa.css precisa ter a lista de painéis que recuam o left');
const declarados=new Set(recuados.split(',').map(s=>s.trim()).filter(Boolean));

const telaCheia=new Set();
['styles.css','theme-2026.css','ui-campo.css','integracoes.css','estudo-pagina.css','profundidade.css'].forEach(f=>{
  if(!fs.existsSync(f))return;
  const css=fs.readFileSync(f,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const re=/([^{}]+)\{([^{}]*)\}/g; let m;
  while((m=re.exec(css))){
    if(!/position\s*:\s*fixed/.test(m[2]))continue;
    if(!/(inset\s*:\s*0|left\s*:\s*0)/.test(m[2]))continue;
    m[1].split(',').map(s=>s.trim()).forEach(s=>{ if(s.startsWith('.')) telaCheia.add(s); });
  }
});
assert.ok(telaCheia.size>=8,'a varredura não achou os painéis de tela cheia — o padrão do CSS mudou?');
telaCheia.forEach(sel=>assert.ok(declarados.has(sel),
  sel+' ocupa a tela inteira mas não recua diante da coluna: acrescente-o à lista do mesa.css'));

/* --------------------------------------------- 2. publicação e pré-cache --- */
const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
['mesa.css','mesa.js'].forEach(a=>{
  const noHtml=(html.match(new RegExp(a.replace('.','\\.')+'\\?v=\\d+'))||[])[0];
  assert.ok(noHtml,a+' precisa estar no index.html');
  assert.ok(sw.includes(noHtml),'o sw.js precisa pré-carregar exatamente "'+noHtml+'" — versão defasada pré-carrega arquivo que ninguém pede');
});
/* A folha inteira mora na media query: sem isso, o celular no talhão herdaria
   a coluna e perderia o mapa. */
assert.ok(/@media\s*\(min-width:1100px\)/.test(mesaCss),'mesa.css precisa da media query de tela larga');
assert.ok(mesaCss.indexOf('@media (min-width:1100px)')<mesaCss.indexOf('.ag-mesa{'),
  'a coluna tem de estar DENTRO da media query');

/* ------------------------------------------------------------ 3. a tela --- */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

const fonte=fs.readFileSync('mesa.js','utf8');
function abrirDom(opc){
  opc=opc||{};
  const dom=new JSDOM('<!doctype html><html'+(opc.preAuth?' class="pre-auth"':'')+'><body></body></html>',
    {url:'https://agracta.test',runScripts:'outside-only'});
  const w=dom.window, chamadas=[];
  let largo=opc.largo!==false;
  w.__largo=v=>{largo=v;};
  w.matchMedia=q=>({matches:largo,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
  w.abrirConhecimento=op=>chamadas.push(['conhecimento',JSON.stringify(op||{})]);
  w.toggleClima=()=>chamadas.push(['clima']);
  w.agMenu=v=>chamadas.push(['menu',v]);
  w.closeStudiesPanel=()=>chamadas.push(['fecharEstudos']);
  w.closeToday=()=>chamadas.push(['fecharHoje']);
  w.openStudyDetail=(q,s)=>chamadas.push(['ficha',q,s]);
  w._stxToast=t=>chamadas.push(['aviso',t]);
  w.eval(fonte);
  return {w,d:w.document,chamadas};
}

/* 3.1 — antes da autenticação não existe coluna. */
{
  const {w,d}=abrirDom({preAuth:true});
  assert.equal(d.getElementById('agMesa'),null,'nada é pintado antes de autenticar');
  assert.equal(d.documentElement.classList.contains('mesa'),false);
  d.documentElement.classList.remove('pre-auth'); w.agMesa.avaliar();
  assert.ok(d.getElementById('agMesa'),'depois de autenticar a coluna entra');
  w.close();
}
/* 3.2 — no celular, nada muda. */
{
  const {w,d}=abrirDom({largo:false});
  assert.equal(d.getElementById('agMesa'),null,'em tela estreita não há coluna');
  assert.equal(d.documentElement.classList.contains('mesa'),false);
  w.close();
}
/* 3.3 — as seções são estas, e Equipe/Biblioteca não existem. */
{
  const {w,d}=abrirDom();
  const rotulos=Array.from(d.querySelectorAll('.ag-mesa-item span')).map(x=>x.textContent);
  assert.deepEqual(rotulos,['Estudos','Mapa','Clima','Insights','Relatórios','Configurações']);
  assert.ok(!/Equipe|Biblioteca/.test(d.getElementById('agMesa').textContent),
    'Equipe e Biblioteca não fazem parte do Agracta');
  assert.equal(d.body.firstChild.id,'agMesa','a navegação vem antes do conteúdo na ordem de leitura');
  w.close();
}
/* 3.4 — cada seção abre a porta que já existe. */
{
  const {w,d,chamadas}=abrirDom();
  w.agMesa.ir('estudos');
  assert.deepEqual(chamadas.pop(),['conhecimento','{"aba":"estudos"}'],
    'Estudos abre o Conhecimento na aba Estudos — não uma segunda lista');
  assert.ok(!/openStudiesPanel/.test(fonte),'a coluna não pode ressuscitar o painel paralelo de estudos');

  w.agMesa.ir('config');
  assert.deepEqual(chamadas.pop(),['menu',true],'Configurações abre a gaveta que já existe');

  w.agMesa.ir('clima');
  assert.ok(chamadas.some(c=>c[0]==='clima'),'Clima abre o painel de clima');
  const p=d.createElement('div'); p.id='climaPanel'; p.style.display='block'; d.body.appendChild(p);
  chamadas.length=0; w.agMesa.ir('clima');
  assert.ok(!chamadas.some(c=>c[0]==='clima'),'com o clima já aberto, clicar de novo não o fecha');
  w.close();
}
/* 3.5 — Mapa fecha o que está por cima, pelo botão (que devolve o foco). */
{
  const {w,d,chamadas}=abrirDom();
  const ov=d.createElement('div'); ov.id='conhecimentoOvl'; ov.hidden=false;
  ov.innerHTML='<button data-con="fechar">Fechar</button>';
  ov.querySelector('button').addEventListener('click',()=>chamadas.push(['fecharConhecimento']));
  d.body.appendChild(ov);
  w.agMesa.ir('mapa');
  assert.ok(chamadas.some(c=>c[0]==='fecharConhecimento'),'Mapa fecha o Conhecimento pelo botão dele');
  assert.ok(chamadas.some(c=>c[0]==='fecharEstudos'),'e fecha os painéis do mapa');
  w.close();
}
/* 3.6 — Insights e Relatórios são do estudo. */
{
  const {w,d,chamadas}=abrirDom();
  w.agMesa.ir('insights');
  assert.ok(chamadas.some(c=>c[0]==='aviso'&&/Insights/.test(c[1])),'sem estudo, Insights explica em vez de abrir tela vazia');
  assert.ok(chamadas.some(c=>c[0]==='conhecimento'&&c[1]==='{"aba":"estudos"}'),'e leva para Estudos');
  const ovEstudos=d.createElement('div'); ovEstudos.id='conhecimentoOvl'; ovEstudos.hidden=false; d.body.appendChild(ovEstudos);
  w.agMesa.sincronizar();
  assert.equal(d.querySelector('.ag-mesa-item[aria-current="page"]').getAttribute('data-secao'),'estudos',
    'e a coluna marca Estudos — não pode dizer Insights mostrando a lista');
  ovEstudos.remove();

  /* Abrir a ficha pelo mapa define o estudo em foco. */
  chamadas.length=0;
  w.openStudyDetail('Q1','S1');
  assert.deepEqual(chamadas.pop(),['ficha','Q1','S1'],'a função original continua sendo chamada');
  assert.equal(JSON.stringify(w.agMesa.estudoEmFoco()),'{"qid":"Q1","sid":"S1"}');
  w.agMesa.ir('insights');
  assert.deepEqual(chamadas.pop(),['conhecimento','{"qid":"Q1","sid":"S1"}'],'Insights abre o dossiê do estudo em foco');

  /* O dossiê aberto manda mais que a memória: a chave vem do próprio DOM. */
  const ov=d.createElement('div'); ov.id='conhecimentoOvl'; ov.hidden=false;
  ov.innerHTML='<button data-con="original" data-key=\'["Q9","S9"]\'>Ficha</button>'+
               '<button data-ep-action="report">Relatório</button>';
  d.body.appendChild(ov);
  assert.equal(JSON.stringify(w.agMesa.estudoEmFoco()),'{"qid":"Q9","sid":"S9"}','o dossiê aberto manda mais que a memória');
  let relatorio=0; ov.querySelector('[data-ep-action="report"]').addEventListener('click',()=>relatorio++);
  w.agMesa.ir('relatorios');
  assert.equal(relatorio,1,'Relatórios aciona o relatório do dossiê aberto');
  w.close();
}
/* 3.7 — a marcação segue o que está aberto, não o último clique. */
{
  const {w,d}=abrirDom();
  const marcada=()=>{const b=d.querySelector('.ag-mesa-item[aria-current="page"]');return b&&b.getAttribute('data-secao');};
  const ov=d.createElement('div'); ov.id='conhecimentoOvl'; ov.hidden=false; d.body.appendChild(ov);
  w.agMesa.sincronizar(); assert.equal(marcada(),'estudos');
  ov.hidden=true; w.agMesa.sincronizar(); assert.equal(marcada(),'mapa','fechado o Conhecimento, volta para o Mapa');
  w.close();
}

console.log('Casca de mesa: coluna só em tela larga e autenticada, portas reusadas, estudo em foco e painéis recuados OK.');
