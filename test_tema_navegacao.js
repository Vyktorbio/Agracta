/* A navegação acompanha o tema.
 *
 * A gaveta era preta nos DOIS temas. No modo dia o app inteiro é branco e
 * chumbo, e ela chegava como um bloco preto do lado direito — uma gaveta é a
 * mesma sala da tela que a chamou, e quem troca de tema espera que ela troque
 * junto.
 *
 * O que este teste guarda: para cada regra escura da navegação existe a
 * correspondente clara, e o passo claro é mesmo CLARO — um "tema dia" com
 * fundo #333 passaria despercebido numa revisão de diff e seria o mesmo
 * defeito com outro nome.
 *
 * Rodar: node test_tema_navegacao.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
const css=fs.readFileSync('interface-neutra.css','utf8');

function regra(seletor){
  const i=css.indexOf(seletor+'{');
  assert.ok(i>=0,'falta a regra para '+seletor);
  return css.slice(i+seletor.length+1,css.indexOf('}',i));
}
/* Luminância relativa simplificada: só para separar claro de escuro. */
function luz(hex){
  let n=hex.replace('#','');
  if(n.length===3)n=n[0]+n[0]+n[1]+n[1]+n[2]+n[2];   /* #fff é #ffffff */
  const v=[0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255);
  return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];
}
function fundo(corpo){ const m=corpo.match(/background:(#[0-9a-f]{3,6})/i); return m&&m[1]; }
function texto(corpo){ const m=corpo.match(/color:(#[0-9a-f]{3,6})/i); return m&&m[1]; }

/* ---------------------------------------- 1. os dois passos existem ------- */
const GRUPOS=[
  '.main-menu,.loc-menu,.ag-drawer',
  '.main-menu button,.loc-mi,.ag-row,.ag-dw-x',
  '.main-menu button,.loc-mi,.ag-row',        /* :hover */
  '.ag-dw-head,.ag-sec-t,.mm-user,.mm-user b'
];
GRUPOS.forEach(g=>{
  const escuro=css.indexOf('html :is('+g+')');
  const claro=css.indexOf('html.light :is('+g+')');
  assert.ok(escuro>=0,'o passo escuro de '+g+' sumiu');
  assert.ok(claro>=0,'falta o passo claro de '+g+' — a gaveta ficaria preta no modo dia');
  assert.ok(claro>escuro,'o passo claro precisa vir depois do escuro para vencer no cascata');
});
['html .ag-row.on','html.light .ag-row.on'].forEach(r=>
  assert.ok(css.indexOf(r+'{')>=0,'falta '+r+': a linha ligada é o estado que mais se olha'));

/* ------------------------------------- 2. claro é mesmo claro ------------- */
const corpoClaro=regra('html.light :is(.main-menu,.loc-menu,.ag-drawer)');
const fClaro=fundo(corpoClaro), tClaro=texto(corpoClaro);
assert.ok(fClaro&&luz(fClaro)>0.85,'o fundo do modo dia precisa ser claro de verdade, não um cinza escuro: '+fClaro);
assert.ok(tClaro&&luz(tClaro)<0.2,'…e o texto, escuro: '+tClaro);
assert.ok(/!important/.test(corpoClaro),'sem !important o passo claro perde para o escuro, que o usa');

const corpoEscuro=regra('html :is(.main-menu,.loc-menu,.ag-drawer)');
assert.ok(luz(fundo(corpoEscuro))<0.2,'o tema escuro continua escuro');
assert.ok(luz(texto(corpoEscuro))>0.85,'e com texto claro');

/* ------------------------------------- 3. o véu não pinta de noite -------- */
const veu=regra('html.light .ag-drawer-bg');
assert.match(veu,/rgba\(/,'o véu do modo dia é translúcido');
const alfa=Number((veu.match(/rgba\([^)]*?,\s*([\d.]+)\)/)||[])[1]);
assert.ok(alfa>0&&alfa<0.4,'no dia o véu só apaga um pouco o que está atrás (alfa '+alfa+')');

/* ------------- 4. a coluna da mesa NÃO entra: é moldura, não gaveta ------- */
assert.ok(!/html\.light[^{]*\.ag-mesa/.test(css),
  'a coluna da mesa continua escura nos dois temas — é a moldura do app, como o desenho a define, e não a mesma peça que a gaveta');

/* --------------------------------------- 5. publicação -------------------- */
const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
const pedido=(html.match(/interface-neutra\.css\?v=\d+/)||[])[0];
assert.ok(pedido,'o index.html precisa pedir a folha');
assert.ok(sw.includes(pedido),'o sw.js precisa pré-carregar exatamente "'+pedido+'"');

console.log('Tema da navegação: gaveta clara no dia, escura na noite, véu translúcido e a coluna da mesa fora do acordo OK.');
