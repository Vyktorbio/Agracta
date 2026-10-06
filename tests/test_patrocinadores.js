/* PATROCINADORES: a consulta saiu do Conhecimento e fala a língua da BPL.
 *
 * Pedido de uso: "clientes pode sair do painel conhecimento... ou mudar para
 * patrocinadores, como diz na BPL". A consulta do patrocinador é acesso de quem
 * é de fora (que resultados cada patrocinador vê), não leitura de resultado:
 * mora no Menu › Administração, ao lado do Painel Admin, e abre a mesma tela de
 * antes, agora sem as abas do Conhecimento. As chaves internas ('clientes',
 * clientPortals, cliente.html) ficam como estão: o link que o patrocinador já
 * recebeu continua valendo.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. O Conhecimento não tem mais a aba, nem para o administrador.
 *  2. abrirPatrocinadores abre a tela própria: título Patrocinadores, sem a
 *     navegação do Conhecimento, e os botões da consulta continuam funcionando
 *     (repintar não devolve a tela para dentro do Conhecimento).
 *  3. Quem não é administrador não vê formulário nenhum.
 *  4. As portas: Menu › Administração (só administrador) e o menu antigo, que
 *     segue como reserva.
 *  5. Nenhum texto visível chama o patrocinador de cliente.
 *
 * Rodar: node tests/test_patrocinadores.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

let n=0;function ok(c,msg){assert.ok(c,msg);n++;console.log('  ok    '+msg);}

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window,d=w.document;
['vendor/dose-core.js','vendor/ativos-en-core.js','vendor/conhecimento-core.js','vendor/avaliacao-core.js','vendor/portal-core.js','integracoes.js','integracoes-clientes.js']
  .forEach(p=>w.eval(fs.readFileSync(p,'utf8')));
w.QLOCAL={Q1:'l'};w.LOCAIS={l:{nome:'Local X'}};w.ITENS={};w.quadraNome=id=>id;
w.data={Q1:{cultura:'Soja',estudos:[{id:'S1',codigo:'DEMO-1',numRepeticoes:2,
  tratamentos:[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Produto A',dose:'1 L/ha'}],avaliacoes:[]}]}};
let admin=true;w.isAdmin=()=>admin;

const ov=()=>d.getElementById('conhecimentoOvl');
/* Os botões passam pelo despachante do Conhecimento, que responde numa microtarefa. */
const tick=()=>new Promise(r=>setTimeout(r,20));
const tocar=async sel=>{ov().querySelector(sel).click();await tick();};
const visivel=()=>ov().textContent.replace(/\s+/g,' ');

(async()=>{
console.log('\n--- 1. O Conhecimento não tem mais a aba ---');
w.abrirConhecimento();
ok(!ov().hidden && /Conhecimento experimental/.test(ov().querySelector('h1').textContent),'o Conhecimento abre como sempre');
ok(ov().querySelector('nav[aria-label="Conhecimento"]'),'com a navegação das abas');
ok(!ov().querySelector('[data-aba="clientes"]'),'e sem a aba de clientes, mesmo para o administrador');
ok(!/Patrocinador|Clientes/.test(Array.from(ov().querySelectorAll('nav button')).map(b=>b.textContent).join(' ')),'nenhuma aba de patrocinadores ou clientes');

console.log('\n--- 2. abrirPatrocinadores abre a tela própria ---');
ok(typeof w.abrirPatrocinadores==='function','abrirPatrocinadores existe para o Menu chamar');
w.abrirPatrocinadores();
ok(!ov().hidden && ov().querySelector('h1').textContent==='Patrocinadores','título Patrocinadores');
ok(!ov().querySelector('nav[aria-label="Conhecimento"]'),'sem a navegação do Conhecimento');
ok(ov().getAttribute('aria-label')==='Patrocinadores','o leitor de tela também ouve Patrocinadores');
ok(ov().querySelector('[data-con="clienteNova"]') && ov().querySelector('#clienteForm'),'a consulta de sempre: Nova consulta e o formulário');
ok(/cada patrocinador recebe apenas a seleção aprovada/.test(visivel()),'o texto fala em patrocinador');
ok(ov().querySelector('#clienteForm [name="nome"]').getAttribute('placeholder')==='Projeto / patrocinador','o campo do nome também');
await tocar('[data-con="clienteNova"]');
  ok(ov().querySelector('h1').textContent==='Patrocinadores' && !ov().querySelector('nav[aria-label="Conhecimento"]'),
    'tocar em Nova consulta repinta a tela sem devolvê-la para dentro do Conhecimento');
  ok(!/\bclientes?\b/i.test(visivel()),'nenhum texto visível diz cliente');
  await tocar('[data-con="fechar"]');
  ok(ov().hidden,'Fechar fecha');

  console.log('\n--- 3. Só o administrador ---');
  admin=false;w.abrirPatrocinadores();
  ok(!ov().querySelector('#clienteForm'),'quem não é administrador não vê formulário');
  ok(/Só o administrador/.test(visivel()),'e a tela diz por quê');
  admin=true;
  w.abrirConhecimento();
  ok(ov().getAttribute('aria-label')==='Conhecimento experimental' && ov().querySelector('nav[aria-label="Conhecimento"]'),
    'depois dela, o Conhecimento volta inteiro, com o nome dele');

  console.log('\n--- 4. As portas ---');
  const menu=fs.readFileSync('ui-campo.js','utf8');
  const adm=menu.slice(menu.indexOf('<summary>Administração</summary>'),menu.indexOf("'</details>' : '')",menu.indexOf('<summary>Administração</summary>')));
  ok(/agMenuAcao\(\\'abrirPatrocinadores\\'\)/.test(adm) && /'Patrocinadores'/.test(adm),'Menu › Administração › Patrocinadores');
  ok(/\(adm \? '<details class="ag-sec ag-menu-details"><summary>Administração<\/summary>'/.test(menu),'o grupo Administração só aparece para administrador');
  const app=fs.readFileSync('app.js','utf8');
  ok(/\(adm\?'<button onclick="closeMainMenu\(\);if\(typeof abrirPatrocinadores===\\'function\\'\)abrirPatrocinadores\(\)">'\+ic\('archive'\)\+' Patrocinadores<\/button>':''\)/.test(app),
    'o menu antigo (reserva) também tem a porta, só para administrador');

  console.log('\n--- 5. A palavra da BPL nas outras telas ---');
  ok(/Consulta do patrocinador/.test(fs.readFileSync('cliente.html','utf8')) && /'Consulta do patrocinador'/.test(fs.readFileSync('cliente.js','utf8')),
    'a página que o patrocinador abre diz Consulta do patrocinador');
  ok(!/Consulta do cliente/.test(fs.readFileSync('cliente.html','utf8')+fs.readFileSync('cliente.js','utf8')),'e não Consulta do cliente');
  const integ=fs.readFileSync('integracoes.js','utf8');
  ok(/\['cliente','Patrocinador do estudo'\]/.test(integ) && /sel\('cliente','Patrocinador'/.test(integ),'ficha de contexto e filtro: Patrocinador');
  ok(/Patrocinador \/ titular/.test(app) && /como o patrocinador chama/.test(app) && /código, patrocinador ou ingrediente/.test(app) && /e-mail do patrocinador/.test(app),
    'Banco de itens: Patrocinador / titular');
  ok(!/<label>Cliente \/ titular<\/label>|placeholder="como o cliente chama"|placeholder="Buscar por nome, código, cliente ou|placeholder="bula, ficha técnica, e-mail do cliente"/.test(app),
    'o Banco de itens não diz mais cliente em rótulo nenhum');
  ok(/consulta do patrocinador/.test(fs.readFileSync('integracoes-fontes.js','utf8')) && /não para o patrocinador/.test(fs.readFileSync('prancha.html','utf8')),
    'Fontes e prancha de resultados também');

  dom.window.close();
  console.log('\n'+n+' verificações, nenhuma falha.');
})().catch(err=>{console.error(err);process.exitCode=1;});
