'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
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
console.log('Controles visíveis na análise configurável; execução automática conserva sua tela de resultados.');
