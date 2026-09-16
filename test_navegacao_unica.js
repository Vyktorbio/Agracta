/* UMA NAVEGAÇÃO SÓ, EM QUALQUER LARGURA.
 *
 * Entre 14 e 16 de setembro de 2026 o app teve duas navegações: no celular, o
 * dock de baixo; no computador, uma coluna fixa de seções à esquerda
 * (mesa.js / mesa.css), com o mapa ganhando painéis ancorados ao lado dela
 * (mapa-mesa.js / mapa-mesa.css). Foi removida a pedido.
 *
 * O problema não era a coluna ser feia nem inútil — ela não criava tela
 * nenhuma, cada item abria a porta que já existia. O problema era o PREÇO que
 * ela cobrava do dock: para não haver duas portas para a mesma tela,
 * Conhecimento e Menu eram ESCONDIDOS da barra de baixo no computador. Quem
 * usa os dois aparelhos aprendia dois caminhos para o mesmo lugar, e num deles
 * o botão que procurava simplesmente não estava.
 *
 * Este teste não guarda uma tela: guarda uma DECISÃO. Ele falha se a coluna
 * voltar por baixo dos panos, e falha também se qualquer folha voltar a
 * esconder um botão do dock — que é a forma como a coisa começou.
 *
 * Rodar: node test_navegacao_unica.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');

const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
const folhas=fs.readdirSync('.').filter(f=>f.endsWith('.css'));
const css=folhas.map(f=>({nome:f,txt:fs.readFileSync(f,'utf8')}));

/* ============================ 1. os arquivos da casca não voltaram ========= */
['mesa.js','mesa.css','mapa-mesa.js','mapa-mesa.css'].forEach(f=>{
  assert.ok(!fs.existsSync(f),f+' foi removido: o computador navega pelo dock, como o celular');
  assert.ok(!html.includes(f),'o index.html não pode voltar a pedir '+f);
  assert.ok(!sw.includes(f),'nem o service worker a pré-carregar '+f);
});

/* ============================ 2. nenhuma folha esconde botão do dock ======= */
/* O dock é a navegação inteira agora. Esconder um botão dele em alguma largura
   é exatamente o que a coluna fazia, e o efeito é o mesmo com ou sem coluna:
   a pessoa procura no lugar certo e não acha. */
const PORTAS=['btn-studies','btn-menu'];
css.forEach(f=>{
  PORTAS.forEach(b=>{
    /* Regras que mencionam o botão E o mandam sumir, na mesma declaração. */
    const re=new RegExp('[^}]*\\.'+b+'[^{}]*\\{[^}]*display\\s*:\\s*none','g');
    const achou=f.txt.match(re);
    assert.ok(!achou,f.nome+' esconde .'+b+' — o dock é a navegação única e precisa estar inteiro'+
      (achou?': '+achou[0].replace(/\s+/g,' ').slice(0,90):''));
  });
});

/* ============================ 3. nenhum resto da coluna nas folhas ========= */
/* --mesa-w era a largura da coluna, e meia dúzia de painéis recuava por ela.
   Sobrando a variável sem a coluna, o recuo vira faixa em branco à esquerda —
   e ninguém liga a faixa à peça que saiu. */
css.forEach(f=>{
  assert.ok(!f.txt.includes('--mesa-w'),f.nome+' ainda recua por --mesa-w, que não existe mais');
  assert.ok(!/\.ag-mesa\b/.test(f.txt),f.nome+' ainda estiliza .ag-mesa, que não é mais pintado');
});

/* ============================ 4. o que ficou é medida, não casca =========== */
/* A tela larga ainda ganha UMA coisa: o dossiê abre com a vista do campo no
   topo. Isso não é navegação — é o custo de BAIXAR O MÓDULO 3D, que quem está
   no talhão não deve pagar sem pedir. A pergunta certa é a largura, medida
   direto; a classe da casca era um atalho que morreu com ela. */
const ep=fs.readFileSync('estudo-pagina.js','utf8');
assert.ok(!/classList\.contains\('mesa'\)/.test(ep),
  'o dossiê não pode voltar a perguntar pela classe da casca: ela não é posta por ninguém');
assert.match(ep,/matchMedia/,'ele mede a largura');
assert.match(ep,/min-width:1100px/,'no mesmo 1100px de sempre');

console.log('Navegação única: dock inteiro em qualquer largura, casca de mesa removida sem resto e o dossiê medindo largura em vez de classe OK.');
