/* O modo motor esconde a casca do BioEnsaio. Ele precisa valer SÓ no embed.
 *
 * Incondicional, ele escondia a tela inteira sempre: "Configurar análise" abria
 * esta mesma página (de propósito, sem ?agracta_engine=1) e mostrava apenas o
 * painel de resultados. Testemunha, modelo misto e medidas repetidas vivem em
 * #card-opcoes -- ninguém conseguia chegar neles, e a bateria toda passava,
 * porque nenhum teste renderiza CSS. Este renderiza.
 */
'use strict';
const assert=require('assert/strict'), fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

const html=fs.readFileSync('estatistica/index.html','utf8');

/* Os controles que a revisão de setembro prometeu precisam existir e morar
   dentro de #card-opcoes -- é esse card que o modo motor esconde. */
const opcoes=html.slice(html.indexOf('id="card-opcoes"'), html.indexOf('id="card-opcoes-tempo"'));
['opt-modelo','opt-comparacao','opt-testemunha'].forEach(id=>
  assert.ok(opcoes.includes('id="'+id+'"'), id+' deveria estar em #card-opcoes'));

function tela(busca){
  const dom=new JSDOM(html,{url:'https://agracta.test/estatistica/index.html'+busca,runScripts:'dangerously'});
  const w=dom.window, vis=sel=>{
    const el=w.document.querySelector(sel);
    assert.ok(el, 'sumiu do HTML: '+sel);
    return w.getComputedStyle(el).display!=='none';
  };
  return {motor:w.document.documentElement.classList.contains('agracta-motor'), vis, fechar:()=>w.close()};
}

/* 1. Sem o parâmetro -- o caminho do "Configurar análise" -- a tela é a completa. */
const cheia=tela('');
assert.equal(cheia.motor, false, 'sem ?agracta_engine=1 não é modo motor');
['#card-opcoes','#card-dados','#card-papeis','#card-pipeline','.acao-fixa','.appbar','.appnav']
  .forEach(s=>assert.ok(cheia.vis(s), s+' precisa aparecer quando o Agracta abre a estatística completa'));
cheia.fechar();

/* 2. Com o parâmetro -- a engrenagem do cartão automático -- some tudo menos o resultado. */
const motor=tela('?agracta_engine=1&v=agracta-9');
assert.equal(motor.motor, true, 'com ?agracta_engine=1 é modo motor');
['#card-opcoes','#card-dados','#card-papeis','#card-pipeline','.acao-fixa','.appbar','.appnav']
  .forEach(s=>assert.ok(!motor.vis(s), s+' precisa continuar escondido na engrenagem'));
assert.ok(motor.vis('#card-resultados'), 'o painel de resultados é o que a engrenagem mostra');
motor.fechar();

/* 3. As duas portas do app.js continuam sendo portas diferentes. Se alguém
      acrescentar o parâmetro ao overlay, a tela de configurar volta a sumir. */
const app=fs.readFileSync('app.js','utf8');
const overlay=app.slice(app.indexOf('function _openBioestatFrame'));
const abre=overlay.slice(0, overlay.indexOf('ov.style.display'));
assert.ok(/src="estatistica\/index\.html'\+\(modo==='forense'\?'#forense':''\)\+'"/.test(abre),
  '_openBioestatFrame deve abrir SEM ?agracta_engine=1 (é a tela completa)');
assert.ok(/estatistica\/index\.html\?agracta_engine=1&v='\+MOTOR_VERSAO/.test(app),
  'o motor automático deve abrir COM ?agracta_engine=1');

console.log('Modo motor: escondido só no embed, tela completa no "Configurar análise", portas distintas OK.');
