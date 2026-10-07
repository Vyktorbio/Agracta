/* O AGRACTA NO iPHONE.
 *
 * Pedido de uso: "Estou no iPhone 18 Pro. Agora precisamos melhorar o agracta
 * no iPhone também". Conferido num iPhone simulado no Chromium (402 x 874 pt,
 * toque, áreas seguras do iOS) e contra o que o iOS 26/27 faz de diferente.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. viewport-fit=cover. Sem ele o iPhone encolhe a página para a área segura e
 *     devolve 0 em env(safe-area-inset-*): as regras que afastam a barra de baixo
 *     do indicador (e o conteúdo da ilha) não valiam nada.
 *  2. Sem zoom sozinho ao tocar num campo. O Safari amplia a tela quando o campo
 *     tem letra menor que 16px (o login tem 15px) e ela fica ampliada. O limite
 *     de escala entra SÓ no iOS — no Android ele tiraria a pinça de quem precisa.
 *  3. O ícone da Tela de Início é opaco. O iPhone pinta a transparência de preto:
 *     o icon-192 virava traço cinza num quadrado preto.
 *  4. A área segura de cima conta uma vez (o clima ia para 137px com 62px de
 *     área segura) e o iPhone deitado afasta da ilha o que encosta nas bordas.
 *  5. Gaveta fechada não pinta nada: a sombra dela fazia uma faixa cinza na
 *     borda direita de todas as telas.
 *  6. Número com vírgula. No iPhone em português o teclado decimal tem vírgula,
 *     e o campo type="number" do Safari a trata diferente a cada versão (recusa,
 *     troca por ponto, aceita). Campo decimal é texto com teclado decimal e o
 *     app lê "2,5"; campo inteiro abre o teclado de algarismos.
 *  7. A página que o iOS esquece deslocada (teclado, girar o aparelho no iOS 27)
 *     volta para o lugar — mas nunca enquanto a pessoa digita ou ampliou a tela.
 *  8. Instalar no iPhone: os passos do Safari atual e o motivo (dados).
 *
 * Rodar: node tests/test_iphone.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm'), zlib=require('zlib');
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

let n=0; function ok(c,msg){ assert.ok(c,msg); n++; console.log('  ok    '+msg); }

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const uiCss=fs.readFileSync('ui-campo.css','utf8');
const tema=fs.readFileSync('theme-2026.css','utf8');
const sw=fs.readFileSync('sw.js','utf8');

/* corpo da PRIMEIRA regra cujo seletor é exatamente `sel` */
function regra(css,sel){
  const i=css.indexOf(sel+'{'); assert.ok(i>=0,'falta a regra '+sel);
  return css.slice(i+sel.length+1, css.indexOf('}',i));
}
/* todas as regras com esse seletor exato, juntas (a cascata soma as declarações) */
function regras(css,sel){
  const out=[]; let i=-1;
  while((i=css.indexOf(sel+'{',i+1))>=0){
    const antes=css[i-1]; if(antes&&!/[\s}]/.test(antes)) continue;   /* `.x.ag-drawer{` não é `.ag-drawer{` */
    out.push(css.slice(i+sel.length+1, css.indexOf('}',i)));
  }
  assert.ok(out.length,'falta a regra '+sel); return out.join(';');
}
function pega(src,nome){
  const i=src.indexOf('function '+nome+'('); assert.ok(i>=0,'não achei '+nome);
  let j=src.indexOf('{',i), d=0;
  for(;j<src.length;j++){ if(src[j]==='{')d++; else if(src[j]==='}'&&--d===0){ j++; break; } }
  return src.slice(i,j);
}

(async()=>{
/* ------------------------------------------------------------------ 1 --- */
console.log('\n--- 1. A página vai até a borda e as áreas seguras valem ---');
const meta=(html.match(/<meta name="viewport" content="([^"]+)"/)||[])[1]||'';
ok(/viewport-fit=cover/.test(meta),'o viewport pede viewport-fit=cover');
ok(!/maximum-scale|user-scalable/.test(meta),'e não trava o zoom no HTML: o Android continua com a pinça');
ok(/name="apple-mobile-web-app-status-bar-style" content="default"/.test(html),
  'barra de status "default": no iOS 26+ a "black-translucent" faz o vidro borrar o topo do app');

/* ------------------------------------------------------------------ 2 --- */
console.log('\n--- 2. Tocar num campo não amplia a tela (só no iOS) ---');
const inline=(html.match(/<script>(\(function\(\)\{[^<]*maximum-scale[^<]*)<\/script>/)||[])[1];
ok(inline,'o index.html tem o ajuste do iOS logo depois do viewport');
ok(html.indexOf(inline)<html.indexOf('<link rel="stylesheet"'),'e ele roda antes de qualquer folha de estilo');
function rodaNo(nav){
  const dom=new JSDOM('<!doctype html><html><head><meta name="viewport" content="'+meta+'"></head><body></body></html>',{runScripts:'outside-only'});
  const w=dom.window;
  Object.keys(nav).forEach(k=>Object.defineProperty(w.navigator,k,{value:nav[k],configurable:true}));
  w.eval(inline); w.eval(inline);    /* duas vezes: não pode duplicar */
  return {meta:w.document.querySelector('meta[name="viewport"]').content, ios:w.document.documentElement.classList.contains('ios')};
}
const IPHONE={userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',platform:'iPhone',maxTouchPoints:5};
const IPAD={userAgent:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5};
const MAC={userAgent:IPAD.userAgent,platform:'MacIntel',maxTouchPoints:0};
const ANDROID={userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',platform:'Linux armv8l',maxTouchPoints:5};
let r=rodaNo(IPHONE);
ok(/maximum-scale=1/.test(r.meta)&&r.meta.split('maximum-scale').length===2,'iPhone: maximum-scale=1 entra uma vez só');
ok(/viewport-fit=cover/.test(r.meta),'sem perder o viewport-fit');
ok(r.ios,'e o <html> ganha a classe ios');
ok(/maximum-scale=1/.test(rodaNo(IPAD).meta),'iPad com iPadOS (se apresenta como Mac, com toque): também');
ok(!/maximum-scale/.test(rodaNo(MAC).meta),'Mac de verdade (sem toque): nada muda');
r=rodaNo(ANDROID);
ok(!/maximum-scale/.test(r.meta)&&!r.ios,'Android: nada muda, a pinça continua');

/* ------------------------------------------------------------------ 3 --- */
console.log('\n--- 3. O ícone da Tela de Início não vira um quadrado preto ---');
const toque=(html.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"/)||[])[1];
ok(toque,'o index.html aponta um apple-touch-icon');
const arq=toque.replace(/[?#].*$/,'');
ok(fs.existsSync(arq),'o arquivo existe: '+arq);
const png=fs.readFileSync(arq);
ok(png.slice(1,4).toString()==='PNG','é PNG');
const largura=png.readUInt32BE(16), altura=png.readUInt32BE(20), tipoCor=png[25];
ok(largura===180&&altura===180,'180 x 180, o tamanho que o iPhone usa');
ok(tipoCor===2||tipoCor===0,'sem canal alfa (o iPhone pinta a transparência de preto)');
ok(png.indexOf('tRNS')<0,'e sem cor transparente declarada');
/* o desenho está lá: decodifica o PNG (filtros por linha) e conta as cores */
{ let off=8; const idat=[]; while(off<png.length){ const len=png.readUInt32BE(off), tipo=png.slice(off+4,off+8).toString(); if(tipo==='IDAT')idat.push(png.slice(off+8,off+8+len)); off+=12+len; }
  const raw=zlib.inflateSync(Buffer.concat(idat)), bpp=tipoCor===2?3:1, lb=largura*bpp, pix=Buffer.alloc(lb*altura);
  for(let y=0;y<altura;y++){
    const f=raw[y*(lb+1)], src=raw.slice(y*(lb+1)+1,(y+1)*(lb+1));
    for(let i=0;i<lb;i++){
      const a=i>=bpp?pix[y*lb+i-bpp]:0, b=y?pix[(y-1)*lb+i]:0, c=(y&&i>=bpp)?pix[(y-1)*lb+i-bpp]:0;
      let pr=a; if(f===4){ const p0=a+b-c, pa=Math.abs(p0-a), pb=Math.abs(p0-b), pc=Math.abs(p0-c); pr=(pa<=pb&&pa<=pc)?a:(pb<=pc?b:c); }
      const add=f===0?0:f===1?a:f===2?b:f===3?((a+b)>>1):pr;
      pix[y*lb+i]=(src[i]+add)&255;
    }
  }
  const cor=(x,y)=>pix.slice(y*lb+x*bpp,y*lb+x*bpp+bpp).toString('hex');
  const fundo=cor(2,2), cores=new Set(); let desenho=0;
  for(let y=20;y<160;y+=4)for(let x=20;x<160;x+=4){ const c=cor(x,y); cores.add(c); if(c!==fundo)desenho++; }
  ok(cor(177,177)===fundo&&cor(2,177)===fundo,'o fundo é o mesmo nos cantos (o iPhone arredonda sobre ele)');
  ok(cores.size>3&&desenho>200,'e tem o desenho do Agracta no meio, não só a cor de fundo'); }
ok(new RegExp("'\\./"+arq.replace('.','\\.')+"\\?v=\\d+'").test(sw),'o sw.js guarda o ícone para abrir sem rede');

/* ------------------------------------------------------------------ 4 --- */
console.log('\n--- 4. Áreas seguras: em cima uma vez, deitado dos dois lados ---');
const topo=regra(uiCss,'.top-bar');
ok(/padding:calc\(8px \+ env\(safe-area-inset-top/.test(topo),'a moldura de cima desce a área segura de cima');
ok(/env\(safe-area-inset-left/.test(topo)&&/env\(safe-area-inset-right/.test(topo),'e afasta das laterais (ilha do iPhone deitado)');
const clima=regra(uiCss,'html body .clima-chip');
const topClima=(clima.match(/(?:^|[;\s])top:([^;]+)/)||[])[1]||'';
ok(topClima&&!/env\(/.test(topClima),'o clima, dentro da moldura, não soma a área segura outra vez (era 137px com 62px de área)');
ok(/padding-right:env\(safe-area-inset-right/.test(regras(uiCss,'.ag-drawer')),'gaveta deitada: o conteúdo não fica sob a ilha');
/* a faixa da tela larga (é a que vale no iPhone deitado, 874pt de largura) */
const barra=regra(tema.slice(tema.indexOf('A faixa de navegação não disputa mais o topo')),'.top-bar-right');
ok(/bottom:calc\(14px \+ env\(safe-area-inset-bottom/.test(barra),'a barra de baixo da tela larga (iPhone deitado) sai de cima do indicador');
ok(/\.leaflet-bottom\.leaflet-right\{right:env\(safe-area-inset-right/.test(tema),'o canto do mapa sai de baixo da ilha');
ok(/\.agenda-panel\{top:76px!important;right:calc\(14px \+ env\(safe-area-inset-right/.test(tema),'a agenda da tela larga também');
const navCel=tema.slice(tema.lastIndexOf('@media(max-width:720px)'));
ok(/height:calc\(64px \+ env\(safe-area-inset-bottom/.test(navCel)&&/padding:5px 8px calc\(5px \+ env\(safe-area-inset-bottom/.test(navCel),
  'em pé, a barra de baixo vai até a borda e os botões ficam acima do indicador');

/* ------------------------------------------------------------------ 5 --- */
console.log('\n--- 5. Gaveta fechada não pinta nada ---');
const gav=regras(uiCss,'.ag-drawer'), gavOn=regras(uiCss,'.ag-drawer.on');
ok(/visibility:hidden/.test(gav)&&/visibility:visible/.test(gavOn),'fechada, a gaveta fica invisível (a sombra dela não entra mais na tela)');
ok(/visibility 0s linear \.26s/.test(gav),'e só some no fim do deslize de .26s, não no meio');
ok(/visibility 0s(?! linear)/.test(gavOn),'abrir mostra na hora');
const veu=regras(uiCss,'.ag-drawer-bg'), veuOn=regras(uiCss,'.ag-drawer-bg.on');
ok(/visibility:hidden/.test(veu)&&/visibility:visible/.test(veuOn),'o véu de trás também (desfoque de tela inteira parado sobre o mapa)');
const faixa=regras(uiCss,'.ag-ndvibar'), faixaOn=regras(uiCss,'.ag-ndvibar.on');
ok(/visibility:hidden/.test(faixa)&&/visibility:visible/.test(faixaOn),'a faixa de datas do NDVI escondida também');
ok(/transform \.24s[^;]*opacity \.18s[^;]*visibility/.test(faixa),'sem perder o deslize e o esmaecer dela');

/* ------------------------------------------------------------------ 6 --- */
console.log('\n--- 6. Número com vírgula no teclado do iPhone ---');
const fontes={app, 'mapa-medir.js':fs.readFileSync('mapa-medir.js','utf8'), 'croqui-livre.js':fs.readFileSync('croqui-livre.js','utf8')};
Object.keys(fontes).forEach(nome=>{
  const src=fontes[nome];
  const ruins=(src.match(/type="number"[^>]{0,160}inputmode="decimal"|inputmode="decimal"[^>]{0,160}type="number"/g)||[]);
  ok(!ruins.length,(nome==='app'?'app.js':nome)+': nenhum campo type="number" com teclado decimal (a combinação que o Safari trata diferente a cada versão)');
});
const numeros=app.match(/<input[^>]*type="number"[^>]*>/g)||[];
ok(numeros.length&&numeros.every(t=>/inputmode="numeric"/.test(t)),'todo type="number" que sobrou é inteiro e abre o teclado de algarismos ('+numeros.length+' campos)');
[
  ['calcLen','comprimento da parcela'],['calcWid','largura da parcela'],['calcVol','volume de calda (drone: 12,5 L/ha)'],
  ['calcDead','volume morto'],['calcCap','capacidade do frasco'],['seParcelaComp','comprimento no estudo'],
  ['seParcelaLarg','largura no estudo'],['seLabVol','volume do pote'],['seVolMorto','volume morto do estudo'],['soloRecProd','produtividade esperada']
].forEach(([id,rot])=>{
  const tag=(app.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>'))||[])[0]||'';
  ok(/type="text"/.test(tag)&&/inputmode="decimal"/.test(tag),rot+' ('+id+'): texto com teclado decimal');
});
ok(/<input id="soloAn_'\+esc\(c\.k\)\+'" type="text" inputmode="decimal"/.test(app),'laudo de solo: texto com teclado decimal');
ok(/id="seJan_'\+chave\+'"/.test(app)&&/<input type="text" inputmode="decimal" id="seJan_/.test(app),'janela de aplicação: idem');
ok(/<label>Carreador \(m\)<\/label><input type="text" inputmode="decimal"/.test(app)&&/<label>Entre parcelas \(m\)<\/label><input type="text" inputmode="decimal"/.test(app),'vãos do croqui: idem');
ok(/<input id="ea" class="e-inp"[^>]*type="text" inputmode="decimal">/.test(app),'área da quadra: idem');
ok(/type="text" inputmode="decimal" data-medir=/.test(fontes['mapa-medir.js'])&&/type="text" inputmode="decimal" data-livre-cfg=/.test(fontes['croqui-livre.js']),'medir no mapa e parcelas livres: idem');
/* quem lê esses campos entende a vírgula */
const ctx={}; vm.createContext(ctx); vm.runInContext(pega(app,'_numBR'),ctx);
ok(ctx._numBR('0,35',null)===0.35&&ctx._numBR('2.5',null)===2.5&&ctx._numBR('',null)===null,'_numBR lê "0,35" e "2.5"; vazio continua vazio');
ok(/area:\(elArea\?\(_numBR\(elArea\.value,null\)\|\|null\)/.test(app),'a área da quadra é lida com _numBR (parseFloat("0,35") dava 0 e a área sumia)');
ok(/res\[c\.k\]=Number\(v\.replace\(',','\.'\)\)/.test(app),'o laudo de solo troca a vírgula antes de converter (Number("5,2") dava NaN)');
ok(/produtividade:\(prod!==''\?Number\(prod\.replace\(',','\.'\)\):null\)/.test(app),'a produtividade também');
ok(/var v=Math\.max\(0,parseFloat\(String\(valor\)\.replace\(',','\.'\)\)\|\|0\);/.test(pega(app,'croquiSetVao')),'os vãos do croqui já liam a vírgula');
ok(/replace\(',', '\.'\)/.test(fontes['mapa-medir.js'])&&/replace\(',', '\.'\)/.test(fontes['croqui-livre.js']),'medir e parcelas livres já liam a vírgula');
const BC=require('../vendor/biocalc-campo-core.js');
ok(BC.parseStrictNumber('2,5',true)===2.5&&BC.parseStrictNumber('0,8',false)===0.8,'a calculadora (parseStrictNumber) já lia a vírgula');

/* ------------------------------------------------------------------ 7 --- */
console.log('\n--- 7. A página deslocada pelo iOS volta para o lugar ---');
const fonte=fs.readFileSync('iphone.js','utf8');
ok(/<script src="iphone\.js\?v=(\d+)"><\/script>/.test(html),'o index.html carrega o iphone.js');
const vIphone=html.match(/iphone\.js\?v=(\d+)/)[1];
ok(sw.indexOf("'./iphone.js?v="+vIphone+"'")>=0,'e o sw.js guarda a mesma versão para abrir sem rede');
function montar(nav){
  const dom=new JSDOM('<!doctype html><html><body><input id="campo"><button id="botao">ok</button></body></html>',{runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  Object.keys(nav).forEach(k=>Object.defineProperty(w.navigator,k,{value:nav[k],configurable:true}));
  const ouvintes={};
  w.visualViewport={offsetTop:0,offsetLeft:0,scale:1,height:812,width:402,addEventListener:(t,f)=>{(ouvintes[t]=ouvintes[t]||[]).push(f);}};
  Object.defineProperty(w,'innerHeight',{value:812,configurable:true,writable:true});
  Object.defineProperty(w,'scrollY',{value:0,configurable:true,writable:true});
  w.chamadas=[]; w.scrollTo=function(x,y){ w.chamadas.push([x,y]); w.scrollY=0; };
  w.eval(fonte);
  return {w,d:w.document,ouvintes};
}
const esperar=ms=>new Promise(r=>setTimeout(r,ms));
let t=montar(IPHONE);
const P=t.w.AgractaIphone.precisaEndireitar, base={y:0,x:0,raizY:0,corpoY:0,vvTop:0,vvLeft:0,escala:1,tecladoPx:0};
ok(!P(base,false),'página no lugar: nada a fazer');
ok(P(Object.assign({},base,{y:62}),false),'rolada pela altura da barra de status (iOS 27, depois de girar): endireita');
ok(P(Object.assign({},base,{vvTop:-9}),false),'área visível deslocada depois do teclado: endireita');
ok(!P(Object.assign({},base,{y:62}),true),'com alguém digitando: não mexe');
ok(!P(Object.assign({},base,{y:120,tecladoPx:320}),false),'com o teclado aberto: não mexe (o iOS está mostrando o campo)');
ok(!P(Object.assign({},base,{vvTop:300,escala:2.5}),false),'ampliada com dois dedos: não mexe, foi a pessoa');

t.w.scrollY=62; t.w.dispatchEvent(new t.w.Event('orientationchange')); await esperar(380);
ok(t.w.chamadas.length===1&&t.w.chamadas[0][0]===0&&t.w.chamadas[0][1]===0,'girou e ficou rolada: volta para (0,0)');
t.w.scrollY=62; t.d.getElementById('campo').focus(); t.w.dispatchEvent(new t.w.Event('resize')); await esperar(380);
ok(t.w.chamadas.length===1,'com o campo em foco ela espera');
t.d.getElementById('botao').focus(); await esperar(380);
ok(t.w.chamadas.length===2,'saiu do campo (o teclado fechou) e ficou rolada: volta');
t=montar(ANDROID); t.w.scrollY=62; t.w.dispatchEvent(new t.w.Event('orientationchange')); await esperar(380);
ok(t.w.chamadas.length===0,'no Android nada disso liga');
ok(/'\.\/iphone\.js'|iphone\.js/.test(fs.readFileSync('conferir.sh','utf8')),'o portão confere a sintaxe do iphone.js');

/* ------------------------------------------------------------------ 8 --- */
console.log('\n--- 8. Instalar no iPhone: os passos de hoje e o porquê ---');
const ctx2={navigator:IPHONE}; vm.createContext(ctx2);
vm.runInContext(pega(app,'isiOS')+';var r1=isiOS();navigator='+JSON.stringify(IPAD)+';var r2=isiOS();navigator='+JSON.stringify(MAC)+';var r3=isiOS();',ctx2);
ok(ctx2.r1&&ctx2.r2&&!ctx2.r3,'isiOS reconhece iPhone e iPad (que se diz Mac), não o Mac');
const txt=(app.match(/var INSTALAR_IOS_TXT=([\s\S]*?);\nfunction installApp/)||[])[1];
ok(txt,'o texto de instalar no iPhone mora numa constante');
const ctx3={}; vm.createContext(ctx3); vm.runInContext('var T='+txt,ctx3);
ok(/•••/.test(ctx3.T)&&/Compartilhar/.test(ctx3.T),'o Compartilhar do Safari atual fica atrás do •••');
ok(/Adicionar à Tela de Início/.test(ctx3.T)&&/Abrir como App Web/.test(ctx3.T),'"Adicionar à Tela de Início" com "Abrir como App Web" ligado');
ok(/7 dias/.test(ctx3.T)&&/separado do Safari/.test(ctx3.T),'e o porquê: a limpeza de 7 dias do Safari, e o app instalado guarda separado');
ok(/if\(isiOS\(\)\)\{ alert\(INSTALAR_IOS_TXT\); return; \}/.test(pega(app,'installApp')),'installApp mostra esse texto no iPhone');

/* ------------------------------------------------------------------ 9 --- */
console.log('\n--- 9. A barra de baixo cresce com a área segura: nada flutua por cima dela ---');
/* Com a página indo até a borda, a barra de baixo ganha os 34pt do indicador.
   Painel flutuante com bottom fixo em px (a Medição ficava a 80px) passa a
   cobrir os botões da barra. Todo bottom fixo acima dela soma a área segura. */
const estilos=fs.readFileSync('styles.css','utf8');
[
  [app,'.measure-panel{position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(80px + env(safe-area-inset-bottom,0px));','Medição'],
  [app,'.measure-panel.drawing{width:268px;padding:9px;bottom:calc(72px + env(safe-area-inset-bottom,0px))}','Medição desenhando'],
  [app,'.croqui-panel{position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(80px + env(safe-area-inset-bottom,0px));','painéis do croqui, de Planejar parcelas e das notas no mapa'],
  [app,'.croqui-eu{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(80px + env(safe-area-inset-bottom,0px));','"onde estou" no croqui'],
  [app,'.solo-map-legend{position:fixed;right:calc(12px + env(safe-area-inset-right,0px));bottom:calc(82px + env(safe-area-inset-bottom,0px));','legenda do mapa de solos'],
  [estilos,'.ndvi-panel{top:auto;bottom:calc(78px + env(safe-area-inset-bottom,0px));left:calc(12px + env(safe-area-inset-left,0px));','painel do clima sobre o mapa'],
].forEach(([src,trecho,rot])=>ok(src.indexOf(trecho)>=0,rot+': acima da barra e longe da ilha'));
/* guarda geral: regra fixa com bottom fixo em px >= 60 e sem área segura */
const ignorados={'.toolbar-extra':'escondida pela casca (ui-campo.css)','.main-menu':'menu antigo, reserva','.cloud-badge':'o theme-2026.css manda (com área segura)'};
const fixas=[];
[['styles.css',estilos],['theme-2026.css',tema],['ui-campo.css',uiCss],['app.js',app]].forEach(([nome,src])=>{
  const re=/([^{}]{0,80})\{([^{}]*position:\s*fixed[^{}]*)\}/g; let m;
  while((m=re.exec(src))){
    const corpo=m[2], sel=(m[1].split(/['";]/).pop()||'').trim();
    const b=/(?:^|[;\s])bottom:\s*(\d+)px(?!\s*\+)/.exec(corpo);
    if(!b||Number(b[1])<60||/env\(safe-area-inset-bottom/.test(corpo)) continue;
    if(Object.keys(ignorados).some(k=>sel.endsWith(k))) continue;
    fixas.push(nome+': '+sel+' bottom:'+b[1]+'px');
  }
});
ok(!fixas.length,'nenhuma outra regra fixa com bottom em px sem a área segura'+(fixas.length?' — '+fixas.join(' | '):''));

/* ----------------------------------------------------------------- 10 --- */
console.log('\n--- 10. Telas cheias e a barra de salvar ---');
const integ=fs.readFileSync('integracoes.css','utf8'), c3=fs.readFileSync('campo-3d.css','utf8'),
  ep=fs.readFileSync('estudo-pagina.css','utf8'), fe=fs.readFileSync('fotos-estudo.css','utf8'),
  pc=fs.readFileSync('croqui-parcelas.css','utf8'), pm=fs.readFileSync('protocolo-menu.js','utf8');
ok(/\.sd-overlay\{[^}]*padding-left:env\(safe-area-inset-left[^}]*padding-right:env\(safe-area-inset-right/.test(estilos),'ficha do estudo deitada: o conteúdo sai de baixo da ilha');
ok(/\.today-overlay\{[^}]*padding-left:env\(safe-area-inset-left[^}]*padding-right:env\(safe-area-inset-right/.test(estilos),'Hoje: idem');
[[integ,'.con-overlay','Conhecimento'],[c3,'.c3-overlay','Ver no campo']].forEach(([css,sel,rot])=>{
  const base=css.slice(css.indexOf(sel+'{')), mob=css.slice(css.indexOf(sel+'{padding:16px'));
  ok(/padding:24px calc\(24px \+ env\(safe-area-inset-right[^;]*calc\(24px \+ env\(safe-area-inset-bottom[^;]*calc\(24px \+ env\(safe-area-inset-left/.test(base.slice(0,base.indexOf('}'))),rot+': folga da ilha dos lados e do indicador embaixo');
  ok(/padding:16px calc\(12px \+ env\(safe-area-inset-right[^;}]*calc\(16px \+ env\(safe-area-inset-bottom[^;}]*calc\(12px \+ env\(safe-area-inset-left/.test(mob.slice(0,mob.indexOf('}'))),rot+' no celular: idem');
});
ok(/\.ep-photo-dialog\{[^}]*box-sizing:border-box;padding:env\(safe-area-inset-top[^;]*env\(safe-area-inset-right[^;]*env\(safe-area-inset-bottom[^;]*env\(safe-area-inset-left/.test(ep),'relatório e galeria em tela cheia: dentro das áreas seguras');
ok(/dialog\.fe-amplia\{[^}]*box-sizing:border-box;padding:env\(safe-area-inset-top/.test(fe)&&/\.fe-folha,\.fe-painel\{[^}]*padding:0 env\(safe-area-inset-right[^;]*env\(safe-area-inset-bottom/.test(fe),'fotos (folha, painel e ampliação): idem');
ok(/\.pc-dialog\{margin:auto;width:min\(1080px,calc\(100% - 24px - env\(safe-area-inset-left[^;]*;max-height:calc\(100dvh - 24px - 2 \* env\(safe-area-inset-bottom/.test(pc),'parcelas do estudo: a janela centrada não encosta na ilha nem no indicador');
ok(/max-width:min\(760px,calc\(100vw - env\(safe-area-inset-left/.test(pm)&&/\.pm-body\{padding:12px 18px calc\(20px \+ env\(safe-area-inset-bottom/.test(pm),'menu do protocolo: idem');
/* O reset do styles.css zera a margem de TUDO (*{margin:0}), inclusive a margem
   automática com que o navegador centraliza o <dialog>: o croqui das parcelas e
   as avaliações do protocolo abriam grudados no canto de cima, à esquerda. */
ok(/\*,\*::before,\*::after\{[^}]*margin:0/.test(estilos),'(o reset que zera a margem de todo elemento continua lá)');
ok(/\.pc-dialog\{margin:auto;/.test(pc),'croqui das parcelas: centralizado (margin:auto)');
ok(/#paModal\{margin:auto;/.test(fs.readFileSync('protocolo-avaliacoes.css','utf8')),'avaliações do protocolo: centralizado');
ok(/\.fe-folha,\.fe-painel\{[^}]*margin:auto/.test(fe)&&/#protoMenu\{position:fixed;inset:0;margin:auto/.test(pm),'(fotos e menu do protocolo já centralizavam)');
ok(/@media\(min-width:721px\) and \(max-width:1209px\)\{\.agenda-panel\{max-height:calc\(100dvh - 156px - env\(safe-area-inset-bottom/.test(tema),
  'agenda da tela larga termina acima da faixa de navegação (iPhone deitado, iPad em pé)');
/* a barra de salvar: quem rola é o fundo (.se-overlay); bottom negativo a pendurava abaixo da tela */
const acoes=regra(tema,'.se-actions'), acoesCel=(tema.match(/\.se-panel\{padding:18px!important\}[^\n]*/)||[''])[0];
ok(/position:sticky!important;bottom:0!important/.test(acoes)&&/margin:20px -20px 0!important/.test(acoes),'"Salvar avaliação" gruda em bottom:0, sem margem negativa embaixo (era -20px: ficava pendurada abaixo da tela)');
ok(/\.se-actions\{bottom:0!important;margin:20px -18px 0!important/.test(acoesCel),'no celular também (era -18px menos a área segura: botão cortado e em cima do indicador)');
ok(/\.se-panel:has\(>\.se-actions:last-child\)\{padding-bottom:0!important\}/.test(tema)&&/\.se-panel:has\(>\.se-actions:last-child\)\{padding-bottom:0!important\}/.test(acoesCel),'e o painel que termina nela fecha rente, sem folga embaixo');
ok(/padding:14px 20px calc\(14px \+ env\(safe-area-inset-bottom/.test(acoes),'o padding de baixo da barra segura os botões acima do indicador');

/* ----------------------------------------------------------------- 11 --- */
console.log('\n--- 11. Detalhes do Safari do iPhone ---');
ok(/html\{-webkit-text-size-adjust:100%;text-size-adjust:100%\}/.test(estilos),'deitar o aparelho não aumenta o texto sozinho');
const soIOS=uiCss.slice(uiCss.indexOf('@supports (-webkit-touch-callout:none){'));
ok(soIOS.length>40&&/input\[type=date\],input\[type=time\][^{]*\{min-width:0;min-height:44px\}/.test(soIOS)&&/input::-webkit-date-and-time-value\{text-align:left\}/.test(soIOS),
  'data e hora (só no iOS): alinhadas como os outros campos, encolhem na grade e têm altura de toque');
ok(/\.sd-overlay,\.today-overlay,\.con-overlay,\.c3-overlay,\.ag-dw-body\{overscroll-behavior:contain\}/.test(uiCss),'rolar até o fim de uma tela cheia não arrasta o app (elástico)');
ok(/button\{touch-action:manipulation\}/.test(tema),'(botões já sem zoom de duplo toque: contar com toques rápidos não amplia a tela)');

console.log('\n'+n+' verificações, todas certas.');
})().catch(e=>{ console.error('FALHA '+e.message); process.exit(1); });
