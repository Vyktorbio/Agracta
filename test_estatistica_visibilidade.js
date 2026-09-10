'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
const html=fs.readFileSync('estatistica/index.html','utf8').replace(/<link rel="stylesheet"[^>]*>/,'<style>'+fs.readFileSync('estatistica/styles.css','utf8')+'</style>');
for(const motor of [false,true]){
  const dom=new JSDOM(html,{url:'https://agracta.test/estatistica/index.html'+(motor?'?agracta_engine=1':''),runScripts:'dangerously'});
  const w=dom.window;
  // Estado após importar dados: os controles já deixaram o estado inicial oculto.
  for(const sel of ['#card-dados','#card-papeis','#card-opcoes','#card-pipeline','.acao-fixa'])w.document.querySelector(sel).classList.remove('oculto');
  for(const sel of ['#card-dados','#card-papeis','#card-opcoes','#card-pipeline','.acao-fixa'])
    assert.equal(w.getComputedStyle(w.document.querySelector(sel)).display==='none',motor,sel+' só fica oculto na execução automática');
  for(const id of ['opt-modelo','opt-comparacao','opt-testemunha'])
    assert.ok(w.document.getElementById(id).closest('#card-opcoes'));
  dom.window.close();
}
/* As duas portas do app.js precisam continuar sendo portas diferentes: é a
   assimetria do ?agracta_engine=1 que faz a regra de CSS acima valer só na
   engrenagem. Se alguém acrescentar o parâmetro ao overlay, a tela de
   configurar volta a sumir -- e nenhuma checagem de CSS notaria. */
const app=fs.readFileSync('app.js','utf8');
const overlay=app.slice(app.indexOf('function _openBioestatFrame'));
const abre=overlay.slice(0,overlay.indexOf('ov.style.display'));
assert.ok(/src="estatistica\/index\.html'\+\(modo==='forense'\?'#forense':''\)\+'"/.test(abre),
  '_openBioestatFrame deve abrir SEM ?agracta_engine=1 (é a tela completa)');
assert.ok(/estatistica\/index\.html\?agracta_engine=1&v='\+MOTOR_VERSAO/.test(app),
  'o motor automático deve abrir COM ?agracta_engine=1');

console.log('Controles visíveis na análise configurável; execução automática conserva sua tela de resultados; portas distintas.');
