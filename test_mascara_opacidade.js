/* QUANTO DA MÁSCARA APARECE É REGULAGEM DE QUEM OLHA.
 *
 * Relato de uso: "quero no menu mapa um botão de opacidade das máscaras, para
 * eu poder deslizar e deixar elas mais ou menos transparentes — eu regulo onde
 * eu quero no meu dispositivo. Igual já tem no NDVI".
 *
 * A máscara nascia com preenchimento fixo: 0,50 nos estados de trabalho e 0,16
 * fora do estudo. Bom padrão, e continua o padrão — mas quem confere o
 * satélite embaixo dela, no sol, precisa de menos tinta, e quem procura o
 * vermelho de relance quer mais. Não há número que sirva aos dois.
 *
 * Três regras moram aqui:
 *   1. é FATOR, não opacidade absoluta — "fora do estudo" tem de continuar
 *      mais discreta que "pendente", que é o que a máscara desenha de propósito;
 *   2. o NDVI fica de fora — ali a cor é medida do satélite e tem controle próprio;
 *   3. fica no APARELHO (localStorage), não no ensaio.
 *
 * Rodar: node test_mascara_opacidade.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const css=fs.readFileSync('styles.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const MascaraCore=require('./vendor/mascara-core.js');

function fatia(marca){
  const i=src.indexOf(marca);
  assert.ok(i>=0,'não achei "'+marca+'" em app.js');
  let prof=0,abriu=false,j=src.indexOf('{',i);
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}

/* Um localStorage de mentira que guarda de verdade: é ele quem prova a regra 3. */
function fazerCtx(guardado){
  const loja=Object.create(null);
  if(guardado!==undefined) loja['agracta-mascara-opac-v1']=String(guardado);
  const ctx={ console, String, Number, Math, Object, Array, isFinite, parseFloat, MascaraCore,
    localStorage:{ getItem:k=>(k in loja?loja[k]:null), setItem:(k,v)=>{loja[k]=String(v);} },
    document:{ getElementById:()=>null, querySelectorAll:()=>[] },
    _loja:loja };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  /* Só o miolo: o estado, _mascaraFill e mascaraSetOpac. As funções do painel
     ficam de fora porque mexem em DOM, e o que se mede aqui é a conta. */
  vm.runInContext('var _mascaraPainelValor=function(){};\n'+
    src.slice(src.indexOf("var MASCARA_OPAC_KEY="), src.indexOf("function toggleMascara("))+
    '\n'+fatia('function mascaraPct(){')+
    '\n'+fatia('function mascaraSetOpacPct(p){')+
    '\n'+fatia('function mascaraSetOpac(v){'),ctx);
  return ctx;
}

/* ------------------------------------------------------ 1. o fator em si --- */
const c=fazerCtx();
assert.equal(c.mascaraOpac,1,'sem nada guardado, nasce no padrão de fábrica: 100%');

const pend={_mfBase:MascaraCore.CORES.pendente.preenchimento,_mfMask:true};
const fora={_mfBase:MascaraCore.CORES.fora.preenchimento,_mfMask:true};

assert.equal(c._mascaraFill(pend),0.5,'em 100% a máscara pinta exatamente o que o motor manda');
assert.ok(Math.abs(c._mascaraFill(fora)-0.16)<1e-9,'inclusive o "fora do estudo", que é discreto de propósito');

c.mascaraSetOpac(0.5);
assert.ok(Math.abs(c._mascaraFill(pend)-0.25)<1e-9,'em 50%, "pendente" vai a 0,25');
assert.ok(Math.abs(c._mascaraFill(fora)-0.08)<1e-9,'e "fora do estudo" a 0,08');
assert.ok(c._mascaraFill(fora)<c._mascaraFill(pend),
  'É FATOR, NÃO OPACIDADE ABSOLUTA: em qualquer posição do controle, "fora do estudo" '+
  'continua mais discreta que "pendente" — um valor único achataria as duas e apagaria a distinção');

c.mascaraSetOpac(0);
assert.equal(c._mascaraFill(pend),0,'em 0% não sobra preenchimento nenhum — fica o contorno');
c.mascaraSetOpac(1);
assert.equal(c._mascaraFill(pend),0.5,'e volta inteiro ao padrão');

/* PARA CIMA TAMBÉM, ATÉ O DOBRO.
   Relato de uso: "quero aumentar a opacidade, pra mim o 100% aí tá no 70%".
   O máximo era o padrão de fábrica, e o padrão é um palpite sobre uma tela que
   não é a de quem está no campo. Travar o teto no palpite dizia que o palpite
   é o limite — o contrário do motivo deste controle existir. */
assert.equal(c.MASCARA_OPAC_MAX,2,'o curso vai até o dobro do padrão');
c.mascaraSetOpac(1.5);
assert.ok(Math.abs(c._mascaraFill(pend)-0.75)<1e-9,'em 150%, "pendente" passa do padrão e vai a 0,75');
assert.ok(Math.abs(c._mascaraFill(fora)-0.24)<1e-9,'e "fora do estudo" sobe junto, na proporção dela');
assert.ok(c._mascaraFill(fora)<c._mascaraFill(pend),'sem nunca alcançar quem tem trabalho pendente');
c.mascaraSetOpac(2);
assert.equal(c._mascaraFill(pend),1,'no talo, a máscara fica sólida: ali quem olha quer ler estado, não imagem');
assert.ok(c._mascaraFill(fora)<1,'mas "fora do estudo" continua deixando o satélite aparecer');

/* ---------------------------------------- 1b. o número na tela é a opacidade ---
   Relato de uso: "de 0 a 200%, mas podemos trocar pra mostrar 100% lá".
   200% não é número de opacidade. O curso do controle é o mesmo — de nada até
   a máscara sólida — mas a régua que o mede passa a medir a coisa certa: o que
   se lê É o preenchimento da quadra que tem trabalho. */
[[0,0],[25,0.25],[50,0.5],[70,0.7],[100,1]].forEach(([pct,fill])=>{
  c.mascaraSetOpacPct(pct);
  assert.equal(c.mascaraPct(),pct,'o que entra em porcentagem volta igual ('+pct+'%)');
  assert.ok(Math.abs(c._mascaraFill(pend)-fill)<1e-9,
    pct+'% na régua é exatamente '+fill.toFixed(2)+' de preenchimento — o número NÃO é porcentagem do padrão');
});
c.mascaraSetOpacPct(50);
assert.equal(c.mascaraOpac,1,'o padrão de fábrica aparece como 50%, no meio do curso');
c.mascaraSetOpacPct(100);
assert.equal(c.mascaraOpac,2,'e 100% é o topo, a máscara sólida');
c.mascaraSetOpacPct(500); assert.equal(c.mascaraPct(),100,'acima de 100% gruda em 100%');
c.mascaraSetOpacPct(-9);  assert.equal(c.mascaraPct(),0,'abaixo de 0 gruda em 0');
c.mascaraSetOpacPct('x'); assert.equal(c.mascaraPct(),0,'texto que não é número não mexe em nada');
/* O GUARDADO CONTINUA SENDO O FATOR. Trocar a unidade no localStorage releria
   o ajuste de quem já tinha regulado como outro número. */
c.mascaraSetOpacPct(100);
assert.equal(c._loja['agracta-mascara-opac-v1'],'2','no aparelho continua indo o fator, não a porcentagem');

c.mascaraSetOpac(0.2); /* volta ao estado que a seção seguinte espera */

/* Entrada fora da faixa não pode virar tinta fora da faixa. */
c.mascaraSetOpac(5);      assert.equal(c.mascaraOpac,2,'acima do dobro gruda no dobro');
c.mascaraSetOpac(-2);     assert.equal(c.mascaraOpac,0,'abaixo de 0 gruda em 0');
c.mascaraSetOpac('meio'); assert.equal(c.mascaraOpac,0,'texto que não é número não mexe em nada');

/* ------------------------------------------------- 2. o NDVI fica de fora --- */
const zona={_mfBase:0.62,_mfMask:false};
c.mascaraSetOpac(0.2);
assert.equal(c._mascaraFill(zona),0.62,
  'quadra pintada pelo NDVI não obedece a este controle: ali a cor É medida do satélite, '+
  'e o painel de índices já tem a opacidade dele');

/* ------------------------------------------------------- 3. fica no aparelho --- */
c.mascaraSetOpac(0.2);
assert.equal(c._loja['agracta-mascara-opac-v1'],'0.2','o valor é gravado no localStorage deste aparelho');
const c2=fazerCtx(0.35);
assert.ok(Math.abs(c2.mascaraOpac-0.35)<1e-9,'e volta na próxima abertura do app');
assert.ok(Math.abs(fazerCtx(1.6).mascaraOpac-1.6)<1e-9,
  'e um valor acima do padrão volta igual: quem subiu o controle não o encontra baixado no dia seguinte');
assert.equal(fazerCtx(7).mascaraOpac,1,'valor guardado fora da faixa é ignorado, não vira tinta errada');
assert.equal(fazerCtx('nada').mascaraOpac,1,'lixo no localStorage também cai no padrão');
assert.ok(!/mascaraOpac/.test(fatia('function dbUpsertQuadra(')||''),
  'e não viaja junto da quadra para a nuvem: é ajuste de tela, não do ensaio');

/* ---------------------------------------------- 4. o mapa lê daqui, só daqui --- */
const RENDER=fatia('function render(){');
assert.match(RENDER,/_mascaraPolys=\[\]/,'render() esquece os polígonos antigos junto com a camada que limpou');
assert.match(RENDER,/poly\._mfBase=_zfoBase; poly\._mfMask=!_zona;/,'cada quadra guarda a própria base');
assert.match(RENDER,/fillOpacity:_mascaraFill\(poly\)/,'e o preenchimento sai de _mascaraFill');
assert.match(RENDER,/mouseout[\s\S]{0,90}_mascaraFill\(this\)/,
  'o realce do ponteiro volta para o valor de AGORA: guardar o número no fecho faria o '+
  'mouseout devolver a opacidade de antes do ajuste');
assert.ok(!/fillOpacity:zfo\b/.test(RENDER),'e não sobrou nenhum preenchimento preso ao valor antigo');

/* ------------------------------------------------ 5. o botão no menu do mapa --- */
const DOCK=html.slice(html.indexOf('id="toolDock"'), html.indexOf('</div>',html.indexOf('id="toolDock"')));
assert.match(DOCK,/toggleMascara\(\)/,'o menu do mapa tem o botão — é de lá que o relato pediu');
assert.match(DOCK,/aria-label="Máscara"/,
  'com aria-label: no tema em uso o nome do botão sai de attr(aria-label), então sem ele o item fica mudo');
assert.ok(DOCK.indexOf('toggleMascara')<DOCK.indexOf('tool-fab'),'e antes do botão que abre e fecha o menu');

/* ------------------------------------------------------------ 6. o painel --- */
const PAINEL=fatia('function buildMascaraPanel(){');
assert.match(PAINEL,/oninput="mascaraSetOpacPct\(this\.value\)"/,'o controle ajusta enquanto desliza, como o do NDVI');
assert.match(PAINEL,/min="0" max="100" step="5"/,'de 0 a 100%, em passos de 5');
assert.match(PAINEL,/mascaraSetOpacPct\(this\.value\)/,
  'e fala em porcentagem, deixando a conversão para o fator num lugar só');
assert.match(PAINEL,/aria-label="Opacidade da máscara das quadras"/,'o controle se anuncia para quem usa leitor de tela');
assert.match(PAINEL,/mascaraSetOpacPct\(50\)/,'e há como voltar ao padrão sem adivinhar o número');
assert.match(PAINEL,/ndviPanel[\s\S]{0,80}display='none'/,
  'abrir este painel esconde o de índices: os dois moram no mesmo canto da tela');
assert.match(fatia('function toggleNdvi(){'),/mascaraPanel/,'e o de índices esconde este, na volta');
assert.match(fatia('function toggleClima(){'),/mascaraPanel/,'o clima também');

/* A amostra da legenda leva o alfa no FUNDO, não na opacidade do elemento:
   com opacity a borda desbotava junto e em 0% a legenda sumia inteira, uma
   fileira de rótulos sem nada ao lado, parecendo defeito. */
const SW=fatia('function _mascaraSwBg(cor,base){');
const ctxSw=fazerCtx();
vm.runInContext(SW,ctxSw);
assert.match(ctxSw._mascaraSwBg('#e0584c',0.5),/^rgba\(224,88,76,0\.500\)$/,
  'a amostra usa o MESMO preenchimento que a quadra vai ter: no padrão, meio a meio');
ctxSw.mascaraSetOpacPct(100);
assert.match(ctxSw._mascaraSwBg('#e0584c',0.5),/,1\.000\)$/,'no topo da régua ela fica cheia, como a quadra');
ctxSw.mascaraSetOpac(0);
assert.match(ctxSw._mascaraSwBg('#e0584c',0.5),/,0\.000\)$/,
  'em 0% o fundo some e sobra a borda da amostra — o mesmo que o mapa mostra: só o contorno');
ctxSw.mascaraSetOpac(1);
assert.ok(parseFloat(/,([\d.]+)\)$/.exec(ctxSw._mascaraSwBg('#9aa0a6',0.16))[1])<1,
  'e "fora do estudo" continua sendo uma fração, na legenda como no mapa');
assert.match(ctxSw._mascaraSwBg('não é cor',0.5),/^rgba\(/,'cor estranha não quebra a legenda');

const LEG=fatia('function _mascaraLegendaHtml(){');
assert.match(LEG,/MascaraCore\.CORES/,
  'a legenda lê as cores do motor; uma segunda tabela aqui sairia do lugar assim que a primeira mudasse');
assert.ok(!/#e0584c|#46a35a|#e3b341/.test(LEG),'e não tem nenhuma cor copiada à mão');

/* ----------------------------------------------------- 7. a folha acompanha --- */
['.masc-leg','.masc-sw','.masc-val','.masc-sub','.masc-zero'].forEach(sel=>{
  assert.ok(css.indexOf(sel)>=0,'styles.css precisa estilizar '+sel);
});
assert.match(fatia('function ic(n,sz){'),/contrast:/,'o ícone do botão sai do ic(), como todos os outros');

console.log('Opacidade da máscara: fator que preserva a hierarquia das cores, NDVI de fora, guardado no aparelho, botão no menu do mapa OK.');
