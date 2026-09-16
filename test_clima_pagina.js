/* A página de Clima: três naturezas de dado que não podem se misturar.
 *
 *   MEDIDO     sensor da estação, agora.
 *   PREVISTO   modelo, para frente.
 *   REANÁLISE  modelo, para trás — NÃO é a medição do que ocorreu na quadra.
 *
 * Um número de modelo exibido como se fosse do sensor é o erro caro desta
 * tela: ele parece igual, e é a base de uma decisão de aplicação.
 *
 * E as horas de molhamento são ESTIMATIVA (UR ≥ 90 %). Sem a regra ao lado do
 * número, um limiar de umidade vira "sensor de molhamento foliar".
 *
 * Rodar: node test_clima_pagina.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
let JSDOM;try{({JSDOM}=require('jsdom'));}catch{console.log('PULADO: jsdom não está instalado.');process.exit(0);}

const fonte=fs.readFileSync('clima-pagina.js','utf8');

/* ------------------------------------------------------- 1. a janela ------ */
{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window;w.eval(fonte);
 const A=w.agClimaPagina, bom={temp:24,ur:70,vento:6,chuva:0};
 const h=(t,x)=>Object.assign({t:'2026-09-14T'+t+':00'},bom,x||{});

 assert.equal(A.avaliarHora(h('08')).ok,true,'hora dentro de todos os limites entra');
 /* Os objetos voltam do contexto do jsdom com outro protótipo: compara-se o
    conteúdo, não a identidade da classe. */
 assert.equal(JSON.stringify(A.avaliarHora(h('09',{vento:18})).falhas),'["vento 18 km/h"]','a falha DIZ qual limite estourou');
 assert.equal(A.avaliarHora(h('10',{ur:35})).ok,false,'UR abaixo do mínimo reprova');
 assert.equal(A.avaliarHora(h('11',{ur:95})).ok,false,'UR acima do máximo também');
 assert.equal(A.avaliarHora(h('12',{temp:33})).ok,false,'calor demais reprova');
 assert.equal(A.avaliarHora(h('13',{chuva:1.2})).ok,false,'chuva na hora reprova');
 assert.equal(A.avaliarHora(h('14',{vento:19,temp:38})).falhas.length,2,'duas falhas são duas falhas, não uma');

 /* Faixas contínuas: uma hora ruim PARTE a janela em duas. */
 const serie=[h('08'),h('09'),h('10',{vento:22}),h('11'),h('12'),h('13')];
 const js=A.janelas(serie);
 assert.equal(js.length,2,'a hora reprovada corta a faixa');
 assert.deepEqual([js[0].de.slice(11,16),js[0].ate.slice(11,16)],['08:00','09:00']);
 assert.deepEqual([js[1].de.slice(11,16),js[1].ate.slice(11,16)],['11:00','13:00']);
 assert.equal(A.janelas([h('08',{vento:30}),h('09',{chuva:5})]).length,0,'sem hora boa, nenhuma faixa');
 /* Valor ausente não inventa reprovação nem aprovação falsa: o limite só
    julga o que existe. */
 assert.equal(A.avaliarHora({t:'x',temp:null,ur:null,vento:null,chuva:null}).ok,true);
 w.close();
}

/* ------------------------------------- 2. as cores das séries ------------- */
{
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window;w.eval(fonte);
 const C=w.agClimaPagina.cores;
 ['claro','escuro'].forEach(t=>{
  const set=new Set([C[t].quente,C[t].frio,C[t].umidade]);
  assert.equal(set.size,3,'as três séries têm cores distintas no tema '+t);
  Object.values(C[t]).forEach(c=>assert.match(c,/^#[0-9a-f]{6}$/,'cor hex em '+t));
 });
 /* O escuro é ESCOLHIDO, não invertido: os passos precisam ser outros. */
 assert.notEqual(C.claro.quente,C.escuro.quente,'o tema escuro tem o seu próprio passo de vermelho');
 assert.notEqual(C.claro.frio,C.escuro.frio);
 assert.notEqual(C.claro.umidade,C.escuro.umidade);
 w.close();
}

/* --------------------------------- 3. a página, com dado de mentirinha ---- */
function montar(op){
 op=op||{};
 const dom=new JSDOM('<!doctype html><html class="light"><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'});
 const w=dom.window;
 const dias=Array.from({length:30},(_,i)=>'2026-08-'+String(i+1).padStart(2,'0'));
 const horas=Array.from({length:60},(_,i)=>'2026-09-14T'+String(i%24).padStart(2,'0')+':00');
 const agora={current:{temperature_2m:24.1,relative_humidity_2m:78,precipitation:0,wind_speed_10m:12,vapour_pressure_deficit:0.7},
  hourly:{time:horas,temperature_2m:horas.map(()=>24),relative_humidity_2m:horas.map(()=>70),
   precipitation:horas.map(()=>0),precipitation_probability:horas.map(()=>10),wind_speed_10m:horas.map(()=>6)},
  daily:{time:dias.slice(0,7),temperature_2m_max:dias.slice(0,7).map(()=>28),temperature_2m_min:dias.slice(0,7).map(()=>17),
   precipitation_sum:dias.slice(0,7).map(()=>2),precipitation_probability_max:dias.slice(0,7).map(()=>30)}};
 const passado={daily:{time:dias,temperature_2m_max:dias.map((_,i)=>28+i%3),temperature_2m_min:dias.map(()=>17),
   temperature_2m_mean:dias.map(()=>23),relative_humidity_2m_mean:dias.map(()=>76),precipitation_sum:dias.map(()=>4.4)},
  hourly:{time:dias.flatMap(d=>[d+'T01:00',d+'T02:00']),relative_humidity_2m:dias.flatMap(()=>[95,80])}};
 w.fetch=url=>Promise.resolve({json:()=>Promise.resolve(
   String(url).indexOf('past_days')>=0?passado:(String(url).indexOf('estacoes')>=0?(op.estacoes||[]):agora))});
 w._climaMapCoord=()=>[-15.6,-47.8];
 w._climaStationForCoord=()=>op.estacao||null;
 w._climaStationCoord=()=>[-15.61,-47.81];
 w._kmEntre=()=>2.3;
 w.CLIMA_PROXY='https://exemplo.test';
 w.eval(fonte);
 return {w,d:w.document,dias};
}
const texto=el=>el.textContent.replace(/\s+/g,' ');

(async()=>{
{
 const {w,d}=montar();
 w.abrirClimaPagina();
 await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 const ov=d.getElementById('climaPaginaOvl');
 assert.ok(ov&&!ov.hidden,'a página abre');
 const t=texto(ov);
 assert.match(t,/PREVISTO · MODELO/,'sem estação, o bloco de agora se declara MODELO');
 assert.ok(!/MEDIDO/.test(t),'…e não diz MEDIDO em lugar nenhum');
 assert.match(t,/Reanálise do modelo para esta coordenada/,'os acumulados dizem que são reanálise');
 assert.match(t,/estimativa: horas com UR ≥ 90 %/,'a regra do molhamento fica ao lado do número');
 assert.match(t,/132,0 mm/,'30 dias × 4,4 mm = 132 mm de precipitação acumulada');
 assert.match(t,/Horas de molhamento/);
 const molha=Array.from(ov.querySelectorAll('.cp-num')).find(x=>/molhamento/i.test(x.textContent));
 assert.match(molha.querySelector('strong').textContent,/^30/,'uma hora por dia com UR 95 % → 30 horas');
 /* Barras: uma por dia, cada uma com título legível. */
 const barras=ov.querySelectorAll('.cp-svg rect');
 assert.equal(barras.length,30,'uma barra por dia');
 assert.ok(Array.from(barras).every(b=>b.querySelector('title')&&b.getAttribute('aria-label')),
   'cada barra carrega título e rótulo: a cor nunca é a única leitura');
 assert.match(t,/Limites genéricos/,'a janela diz quais limites usou');
 assert.match(t,/protocolo com janela declarada manda mais/,'…e que o protocolo vence os genéricos');
 w.close();
}
{
 /* Com estação, o bloco de agora passa a se declarar MEDIDO — e só ele. */
 const {w,d}=montar({estacao:{mac:'AA',name:'Boa Vista'},estacoes:[{mac:'AA',name:'Boa Vista'}]});
 w.abrirClimaPagina();
 await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 const ov=d.getElementById('climaPaginaOvl');
 assert.match(texto(ov),/MEDIDO · ESTAÇÃO BOA VISTA|MEDIDO · ESTAÇÃO Boa Vista/,'com estação, o agora é medição');
 assert.match(texto(ov),/Reanálise do modelo/,'mas os acumulados continuam sendo reanálise');
 w.close();
}
{
 /* Histórico: gráficos com legenda de duas séries e a tabela dos 30 dias. */
 const {w,d}=montar();
 w.abrirClimaPagina({aba:'historico'});
 await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 const ov=d.getElementById('climaPaginaOvl');
 assert.match(texto(ov),/REANÁLISE · MODELO, PARA TRÁS NO TEMPO/);
 const legendas=ov.querySelectorAll('.cp-legenda');
 assert.ok(legendas.length>=1,'a temperatura tem legenda: duas séries nunca ficam só na cor');
 assert.equal(legendas[0].querySelectorAll('span').length,2);
 assert.equal(ov.querySelectorAll('.cp-tabela tbody tr').length,30,'a tabela dos 30 dias existe para quem não lê o gráfico');
 w.close();
}
{
 /* Sem coordenada, a página explica em vez de desenhar gráfico vazio. */
 const {w,d}=montar();
 w._climaMapCoord=()=>null;
 w.abrirClimaPagina();
 await new Promise(r=>setTimeout(r,0));
 assert.match(texto(d.getElementById('climaPaginaOvl')),/ainda não tem coordenada/);
 assert.equal(d.querySelectorAll('.cp-svg').length,0,'e não desenha gráfico nenhum');
 w.close();
}

/* --------------------- 4. no telefone: mesma página, sem tabela vazando ---- */
{
 const {w,d}=montar();
 w.abrirClimaPagina({aba:'janela'});
 await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 const ov=d.getElementById('climaPaginaOvl');
 const tabelas=Array.from(ov.querySelectorAll('table'));
 assert.ok(tabelas.length,'a aba da janela tem tabela');
 tabelas.forEach(t=>assert.ok(t.closest('.cp-rolagem'),
   'toda tabela mora num container que rola na horizontal: seis colunas não cabem em 390 px, e página que anda de lado faz perder o lugar da leitura'));
 /* As outras abas também. */
 for(const aba of ['previsao','historico','estacoes']){
  w.abrirClimaPagina({aba:aba});
  await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
  Array.from(d.getElementById('climaPaginaOvl').querySelectorAll('table')).forEach(t=>
   assert.ok(t.closest('.cp-rolagem'),'tabela sem container rolável na aba '+aba));
 }
 w.close();
}
{
 /* O cartão do telefone leva à página — e só oferece o caminho se o módulo
    estiver carregado: botão que não responde é pior que botão nenhum. */
 const app=fs.readFileSync('app.js','utf8');
 const i=app.indexOf('function buildClimaPanel(');
 const corpo=app.slice(i,app.indexOf('\n}',i));
 assert.match(corpo,/typeof abrirClimaPagina==='function'/,'o cartão confere se a página carregou');
 assert.match(corpo,/onclick="abrirClimaPagina\(\)"/,'e abre a mesma página da mesa, não uma cópia');
 /* Num aparelho menor o cartão cheio passa da altura da tela e rola por dentro:
    depois do corpo, o botão nasce fora da vista, no fim de uma lista que
    parece terminada — existindo e sendo impossível de achar. */
 assert.ok(corpo.indexOf('maisClima+')<corpo.indexOf("'<div id=\"climaBody\"></div>'"),
   'o botão vem ANTES do corpo do cartão, onde a rolagem interna não o esconde');
 const css=fs.readFileSync('clima-pagina.css','utf8');
 assert.match(css,/@media\(max-width:700px\)/,'a página tem passo próprio para telefone');
 assert.match(css,/\.cp-rolagem\{overflow-x:auto/,'o container de tabela rola');
 assert.ok(!/@media\(min-width:1100px\)/.test(css),
   'a página NÃO é exclusiva da mesa: se voltar a ser, o clima some do talhão, que é onde ele decide');
}

/* --------------------------- 5. a porta, e uma só ------------------------- */
/* A coluna de seções da tela larga foi embora: o PC voltou a navegar pelo dock
   de baixo, igual ao celular, e com ela sumiu a porta que a coluna dava para o
   Clima. A porta que SOBRA é a do cartão de clima do mapa, e ela precisa
   continuar existindo — sem coluna, ela é a única. */
{
 const pag=fs.readFileSync('clima-pagina.js','utf8');
 assert.match(pag,/w\.abrirClimaPagina=/,'a página tem porta pública');
 assert.match(pag,/w\.fecharClimaPagina=/,'e fecha por fora também');
 const app=fs.readFileSync('app.js','utf8');
 assert.ok(app.includes("onclick=\"abrirClimaPagina()\""),
   'o cartão do clima no mapa continua sendo a porta da página — sem a coluna, é a única');
 assert.ok(!fs.existsSync('mesa.js'),
   'e a casca de mesa não voltou por baixo dos panos: duas navegações na mesma tela foi o que já confundiu uma vez');
 const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
 ['clima-pagina.css','clima-pagina.js'].forEach(a=>{
  const pedido=(html.match(new RegExp(a.replace('.','\\.')+'\\?v=\\d+'))||[])[0];
  assert.ok(pedido,a+' precisa estar no index.html');
  assert.ok(sw.includes(pedido),'o sw.js precisa pré-carregar exatamente "'+pedido+'"');
 });
}

console.log('Página de Clima: telefone e mesa, janela por limites declarados, medido ≠ previsto ≠ reanálise, molhamento como estimativa e tabela junto do gráfico OK.');
})();
