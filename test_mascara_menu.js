/* O CONTROLE TEM DE ESTAR ONDE O MENU DO MAPA ESTÁ DE VERDADE.
 *
 * Relato de uso: "que flutuante, se tá doido — tem que ser no menu Mapa".
 *
 * A primeira versão deste controle entrou num botão da `.toolbar-extra`, o
 * dock flutuante do canto do mapa. Só que a casca de uso (ui-campo.css) apaga
 * esse dock inteiro há tempo — `display:none!important` na primeira tela da
 * folha — e põe no lugar a gaveta "Ferramentas do mapa", aberta pelo botão da
 * barra de cima. O botão existia, passava no teste de existir, e NINGUÉM podia
 * tocar nele. Teste que só pergunta "o elemento está no HTML?" não percebe
 * isso; este pergunta se ele está no menu que o usuário abre.
 *
 * A régua do rodapé é o mesmo gesto da régua de giro, e pelo mesmo motivo:
 * para escolher a opacidade é preciso VER o mapa mudando, e a gaveta cobre o
 * mapa. Então a linha fecha a gaveta e deixa só a faixa no rodapé.
 *
 * Rodar: node test_mascara_menu.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
const ui=fs.readFileSync('ui-campo.js','utf8');
const uicss=fs.readFileSync('ui-campo.css','utf8');
const html=fs.readFileSync('index.html','utf8');

/* ------------------------------------- 1. o dock flutuante segue apagado --- */
assert.match(uicss,/\.toolbar-extra,\.toolbar-extra\.open\{display:none!important\}/,
  'a casca de uso continua apagando o dock flutuante — é o fato que torna tudo abaixo necessário');

/* --------------------------------- 2. a linha está na gaveta de verdade --- */
const GAVETA=ui.slice(ui.indexOf("d.setAttribute('aria-label','Ferramentas do mapa')"),
                      ui.indexOf("document.body.appendChild(d);"));
assert.ok(GAVETA.length>800,'achei a gaveta "Ferramentas do mapa"');
assert.match(GAVETA,/agRowMasc/,'a gaveta do mapa tem a linha da máscara — é ESTE o menu que abre no aparelho');
assert.match(GAVETA,/Opacidade da máscara/,'com nome que diz o que regula');
assert.match(GAVETA,/agMascBar\(true\)/,'e que abre a régua do rodapé');
assert.ok(GAVETA.indexOf('agRowMasc')>GAVETA.indexOf('agRowGirar'),
  'logo depois de "Girar o mapa": as duas são réguas de rodapé, o mesmo gesto');

/* ------------------------------------------- 3. a régua funciona mesmo --- */
const BARRA=ui.slice(ui.indexOf('function montarMasc(){'), ui.indexOf('window.agRotBar = function'));
assert.match(BARRA,/id="agMascRange"/,'a régua tem o controle deslizante');
assert.match(BARRA,/min="0" max="200" step="5"/,
  'de 0 a 200%, em passos de 5: o padrão de fábrica (100%) fica no MEIO do curso, '+
  'porque o controle também precisa saber PÔR tinta — "pra mim o 100% aí tá no 70%"');
assert.match(BARRA,/aria-label="Opacidade da máscara das quadras"/,'anunciada para leitor de tela');
assert.match(BARRA,/oninput="agMascSet\(this\.value\)"/,'ajusta enquanto desliza');
assert.match(BARRA,/mascaraSetOpac/,'e chama o motor que já existe no app.js, em vez de recalcular por fora');
assert.match(BARRA,/agMascSet\(100\)/,'tem como voltar ao padrão sem adivinhar o número');
assert.match(BARRA,/ag-rotbar ag-mascbar/,'veste a mesma faixa da régua de giro: uma folha só para as duas');

/* Abrir a régua fecha o que estiver cobrindo o mapa — senão não dá para ver
   o que se está regulando, que é o motivo de ela existir. */
const ABRE=ui.slice(ui.indexOf('window.agMascBar = function'), ui.indexOf('window.agRotBar = function'));
assert.match(ABRE,/agMenu\(false\)/,'fecha o menu do app');
assert.match(ABRE,/agToggleDrawer\(false\)/,'fecha a gaveta das ferramentas');
assert.match(ABRE,/agRotBar\(false\)/,'e a régua de giro, que divide o mesmo pedaço de rodapé');
assert.match(ui.slice(ui.indexOf('window.agRotBar = function')),/agMascBar\(false\)/,
  'e a de giro fecha esta, na volta: uma faixa de cada vez no rodapé');
assert.match(ui,/montarBotao\(\); montarGaveta\(\); montarRot\(\); montarMasc\(\);/,
  'as duas réguas nascem juntas com o resto da casca');

/* -------------------------------- 4. o painel flutuante sai desta casca --- */
assert.match(uicss,/#mascaraPanel\{display:none!important\}/,
  'o painel que eu tinha feito não aparece aqui: nesta casca quem regula é a gaveta mais a régua');
assert.ok(uicss.indexOf('#mascaraPanel')>uicss.indexOf('#ndviPanel'),
  'ao lado do #ndviPanel, que some pelo mesmo motivo e já fazia isso antes');

/* O botão do dock continua no HTML de propósito: se ui-campo.css não carregar,
   o dock reaparece e ele volta a ser o caminho — como todos os irmãos dele. */
assert.match(html,/toggleMascara\(\)/,
  'o botão do dock fica como reserva, igual a NDVI, Clima e Medir, para o caso de a casca não carregar');

/* --------------------------------------------- 5. a folha acompanha --- */
assert.match(uicss,/\.ag-rotbar \.rb-t\{/,'a faixa tem rótulo, porque "Máscara" precisa se identificar');
assert.match(ui,/contraste:'<circle/,'e o ícone da linha sai da tabela da própria gaveta');

console.log('Máscara no menu do mapa: linha na gaveta "Ferramentas do mapa", régua no rodapé irmã da de giro, painel flutuante fora desta casca OK.');
