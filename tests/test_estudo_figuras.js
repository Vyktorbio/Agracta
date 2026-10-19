/* A imagem exportada deve conter a figura inteira e apenas a projeção visível.
   A rasterização real e os downloads são conferidos no navegador. */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{console.log('PULADO: jsdom não está instalado.');process.exit(0);}
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:s=>({width:s.length*9})});
w.eval(fs.readFileSync('estudo-figuras.js','utf8'));
const card=w.document.createElement('article');
card.innerHTML='<h4>Ácaros &lt; 5 por tratamento</h4><div style="overflow:auto;width:320px"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2400 465"><text x="2300" y="450">ÚLTIMO TRATAMENTO</text><line class="ep-grid" x1="0" x2="2400" y1="50" y2="50"/><circle cx="100" cy="100" r="5" fill="blue" stroke="var(--surface)"/></svg></div><div class="ep-legend"><span><i style="background:rgb(20, 100, 180)"></i>13/08/2026 · 11:47</span></div><figcaption>n = 1. Zero é observado. Ausências não são zero.</figcaption>';
w.document.body.appendChild(card);
const meta={estudo:'ESTUDO CEGO',variavel:'Ácaros',tipo:'barras',faixas:true,referencia:'T4 · Sem tratamento'};
const f=w.AgractaFiguras.montar(card,meta);
assert.equal(f.width,2464);assert.match(f.svg,/ÚLTIMO TRATAMENTO/);assert.match(f.svg,/13\/08\/2026/);
assert.match(f.svg,/Ausências não são zero/);assert.match(f.svg,/subamostras/);assert.match(f.svg,/T4 · Sem tratamento/);
assert.match(f.svg,/&lt; 5/);assert(!/var\(--|foreignObject|https?:\/\/(?!www.w3.org)/.test(f.svg));
const parsed=new w.DOMParser().parseFromString(f.svg,'image/svg+xml');
assert.equal(parsed.querySelector('parsererror'),null);assert.equal(parsed.querySelector('circle').getAttribute('stroke'),'#ffffff');
assert.equal(parsed.querySelector('text').getAttribute('font-family'),'Arial, sans-serif');
card.innerHTML='<h4>Ranking · Ácaros</h4><p class="ep-caption">13/08/2026 · 11:47</p><ol class="ep-ranking"><li><span class="ep-rank">1</span><b>T2 · Código cego</b><strong>-2 contagem</strong><div class="ep-track"><span style="width:40%;background:#4169e1"></span></div><small>n = 4 · DP 2,5</small></li><li><span class="ep-rank">2</span><b>T1 · Testemunha</b><strong>0 contagem</strong><div class="ep-track"><span style="width:0%;background:#16a34a"></span></div><small>n = 4</small></li></ol><p class="con-note">Ordem descritiva. Não representa diferença estatística.</p>';
const rank=w.AgractaFiguras.montar(card,{...meta,tipo:'ranking'});
assert.match(rank.svg,/-2 contagem/);assert.match(rank.svg,/0 contagem/);assert.match(rank.svg,/Código cego/);
assert.match(rank.svg,/DP 2,5/);assert.match(rank.svg,/Não representa diferença estatística/);
assert(rank.svg.indexOf('T2')<rank.svg.indexOf('T1'));
// Nenhum tratamento escondido em dados globais pode aparecer no exportador.
w.data={segredo:'PRODUTO SECRETO'};
assert(!w.AgractaFiguras.montar(card,meta).svg.includes('PRODUTO SECRETO'));
card.innerHTML='<h4>Sem data</h4><p>Cadastre as datas.</p>';
assert.throws(()=>w.AgractaFiguras.montar(card,meta),/ainda não tem resultados/);
w.close();console.log('Exportação: figura completa, legenda, data, zero, sinal, ranking, XML válido, cegamento e ausência OK.');
