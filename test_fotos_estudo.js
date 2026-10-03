/* FOTOS DO ESTUDO: um toque na parcela abre a câmera, a foto nasce identificada,
 * a grade mostra quantas a parcela tem e o painel é a matriz parcela × leitura.
 * "O painel de fotos está meio arcaico, parece uma lógica ruim."
 * Rodar: node test_fotos_estudo.js */
var fs=require('fs');
var JSDOM; try{ JSDOM=require('jsdom').JSDOM; }catch(e){ console.log('PULADO: jsdom ausente'); process.exit(0); }
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
var espera=function(ms){ return new Promise(function(r){ setTimeout(r,ms||10); }); };

var dom=new JSDOM('<!doctype html><html><body><div id="avGridWrap">'+
  ['T1R1','T2R1','T1R2','T2R2'].map(function(k){ return '<button data-av-photo="'+k+'">Foto</button><button class="av-foto-n" data-av-fotos="'+k+'" hidden></button>'; }).join('')+
  '</div></body></html>',{runScripts:'outside-only',url:'http://127.0.0.1/'});
var w=dom.window;
/* o que o jsdom não tem: diálogo modal, canvas e ImageBitmap */
w.HTMLDialogElement.prototype.showModal=function(){ this.open=true; this.setAttribute('open',''); };
/* como no navegador: o evento "close" chega DEPOIS, enfileirado — foi essa
   demora que quebrava as miniaturas ao fechar e reabrir o painel */
w.HTMLDialogElement.prototype.close=function(){ if(!this.open) return; this.open=false; this.removeAttribute('open'); var el=this; setTimeout(function(){ el.dispatchEvent(new w.Event('close')); },30); };
w.HTMLCanvasElement.prototype.getContext=function(){ return {fillRect:function(){},drawImage:function(){},set fillStyle(v){}}; };
w.HTMLCanvasElement.prototype.toBlob=function(cb,tipo){ var c=this; cb(new w.Blob(['mini '+c.width+'x'+c.height],{type:tipo||'image/jpeg'})); };
w.createImageBitmap=function(blob,op){ var lw=(op&&op.resizeWidth)||4000; return Promise.resolve({width:lw,height:Math.round(lw*0.75),close:function(){}}); };
var revogadas={};
w.URL.createObjectURL=function(){ return 'blob:x'+Math.random(); }; w.URL.revokeObjectURL=function(u){ revogadas[u]=1; };
function quebradas(sel){ return Array.prototype.filter.call(w.document.querySelectorAll(sel+' img'),function(im){ return revogadas[im.getAttribute('src')]; }).length; }
w.alert=function(t){ w.__alertas.push(t); }; w.__alertas=[]; w.confirm=function(){ return true; };
w.HTMLInputElement.prototype.click=function(){ w.__cliques.push(this); }; w.__cliques=[];
/* banco em memória com a mesma forma do FotosStore */
var bancoMem={};
w.FotosStore={create:function(idb,escopo){ var lista=bancoMem[escopo]=bancoMem[escopo]||[];
  return {list:function(){ return Promise.resolve(lista.slice()); }, put:function(rows){ rows.forEach(function(r){ lista.push(r); }); return Promise.resolve(); },
          remove:function(id){ var i=lista.findIndex(function(x){ return x.id===id; }); if(i>=0) lista.splice(i,1); return Promise.resolve(); }}; }};
w.indexedDB={};
/* o que o app entrega */
var estudo={id:'S1',codigo:'EST-1',numRepeticoes:2,tratamentos:[{id:'T1',produto:'Testemunha'},{id:'T2',produto:'Fungicida X',dose:'1 L/ha'}],
  aplicacoes:[{id:'ap',data:'2026-09-01'}],avaliacoes:[{id:'av1',data:'2026-09-08'},{id:'av2',data:'2026-09-15'}]};
w.data={Q1:{estudos:[estudo]}}; w.curV='Q1'; w.curSid='S1';
w._authUser={uid:'u1'}; w._currentUserName=function(){ return 'Ana'; };
var rows=[{key:'T1R1',tratId:'T1',rep:1,parcela:'1A'},{key:'T2R1',tratId:'T2',rep:1,parcela:'2A'},{key:'T1R2',tratId:'T1',rep:2,parcela:'1B'},{key:'T2R2',tratId:'T2',rep:2,parcela:'2B'}];
w._avRowsForStudy=function(){ return rows; };
w._avStudy=function(){ return estudo; };
w.__avAberta=estudo.avaliacoes[0];
w._avEditando=function(){ return w.__avAberta; };
w._avPersistNow=function(){ w.__persistiu=(w.__persistiu||0)+1; };
w.avRotuloMomento=function(s,a){ return a.id==='av1'?'7 DAA':'14 DAA'; };
w.estudoFinalizado=function(s){ return !!s.finalizado; };
w._stxToast=function(t){ w.__toasts.push(t); }; w.__toasts=[];
w.agConhecimento={projetar:function(qid,st){ return {qid:qid,sid:st.id}; }};
w.renderAvGrid=function(){ w.__render=(w.__render||0)+1; };
w.abrirGaleriaFotos=function(s,ini){ w.__antiga=true; w.__galeria.push({s:s,ini:ini}); }; w.__galeria=[];
w.todayISO=function(){ return '2026-09-15'; };
w.eval(fs.readFileSync('vendor/fotos-core.js','utf8'));
w.eval(fs.readFileSync('fotos-estudo.js','utf8'));

function arquivo(nome){ return new w.File(['x'.repeat(1000)],nome,{type:'image/jpeg'}); }
function entregar(files){ var inp=w.__cliques[w.__cliques.length-1]; Object.defineProperty(inp,'files',{value:files,configurable:true}); inp.onchange(); }

(async function(){
  console.log('\n[1] um toque na parcela abre a câmera');
  w.avFotografarParcela('T2R1');
  var inp=w.__cliques[0];
  ck(inp && inp.type==='file' && inp.getAttribute('capture')==='environment','abre a câmera traseira direto, no mesmo toque (sem formulário)');
  ck(w.__persistiu===1,'o que já foi lançado na grade é salvo antes de sair para a câmera');
  entregar([arquivo('a.jpg')]);
  for(var i=0;i<100&&!(bancoMem['["u1","Q1","S1"]']||[]).length;i++) await espera();
  var f=bancoMem['["u1","Q1","S1"]'][0];
  ck(f && f.treatment==='T2' && f.rep===1 && f.plot==='2A' && f.assessment==='av1','a foto nasce com parcela, tratamento, repetição e avaliação');
  ck(f.date==='2026-09-08' && f.momento==='7 DAA' && f.autor==='Ana' && /^\d{2}:\d{2}$/.test(f.hora),'e com a data da avaliação, o momento, quem fotografou e a hora');
  ck(f.blob && f.thumb && f.thumb.size>0 && f.blob.size===1000,'guarda o original intacto e uma miniatura à parte');
  for(i=0;i<100&&!w.__toasts.length;i++) await espera();
  ck(/Foto salva · 2A \(1 nesta leitura\)/.test(w.__toasts[0]||''),'confirma na hora: "Foto salva · 2A (1 nesta leitura)"');
  var chip=w.document.querySelector('[data-av-fotos="T2R1"]');
  ck(!chip.hidden && chip.textContent==='1 📷','a grade mostra o contador na parcela');
  ck(w.document.querySelector('[data-av-fotos="T1R1"]').hidden,'parcela sem foto continua sem contador');

  console.log('\n[2] regras');
  w.__avAberta={id:''}; w.__cliques.length=0;
  w.avFotografarParcela('T1R1');
  ck(!w.__cliques.length && /Salve a avaliação/.test(w.__alertas.pop()||''),'avaliação ainda não salva: pede para salvar antes (a foto não ficaria órfã)');
  w.__avAberta=estudo.avaliacoes[0];
  estudo.finalizado=true; w.avFotografarParcela('T1R1');
  ck(!w.__cliques.length && /finalizado/.test(w.__alertas.pop()||''),'estudo finalizado não recebe foto nova');
  estudo.finalizado=false;
  var gr=w.__render||0; w.renderAvGrid();
  ck(w.__render===gr+1,'a grade continua sendo desenhada pelo app (o contador vem junto)');

  console.log('\n[3] o painel é a matriz parcela × leitura');
  w.__avAberta=estudo.avaliacoes[1];
  w.avFotografarParcela('T2R1'); entregar([arquivo('b.jpg')]);
  for(i=0;i<100&&bancoMem['["u1","Q1","S1"]'].length<2;i++) await espera();
  w.abrirPainelFotos('Q1','S1');
  for(i=0;i<100&&!w.document.querySelector('#fotoPainel .fe-matriz');i++) await espera();
  var pn=w.document.querySelector('#fotoPainel[open]');
  var cab=Array.prototype.map.call(pn.querySelectorAll('.fe-matriz thead th'),function(th){ return th.textContent; });
  ck(cab.join('|')==='Parcela|7 DAA|14 DAA','colunas: as leituras do estudo, no tempo');
  var linha2A=Array.prototype.filter.call(pn.querySelectorAll('.fe-matriz tbody tr'),function(tr){ return /2A/.test(tr.querySelector('th').textContent); })[0];
  ck(linha2A && linha2A.querySelectorAll('.fe-cel').length===2,'2A tem foto nas duas leituras — lado a lado para comparar');
  ck(/2 foto\(s\) neste aparelho · 1 de 4 parcelas · 2 leitura\(s\) com foto/.test(pn.textContent),'resumo do que existe');
  linha2A.querySelector('.fe-cel').click();
  for(i=0;i<100&&!w.document.querySelector('#fotoFolha[open]');i++) await espera();
  var fo=w.document.querySelector('#fotoFolha[open]');
  ck(fo && /Fotos da parcela 2A/.test(fo.textContent) && fo.querySelectorAll('.fe-mini').length===2,'tocar na célula abre a parcela ao longo das leituras');
  ck(/Fungicida X/.test(fo.textContent),'com o tratamento por extenso');
  ck(!quebradas('#fotoPainel[open]'),'a folha aberta por cima não apaga as miniaturas do painel embaixo');
  fo.close(); await espera(60);
  ck(!quebradas('#fotoPainel[open]'),'nem ao fechar');
  pn.close();
  /* fechar e reabrir na hora: o "close" atrasado da janela velha não pode
     apagar as miniaturas da nova (o defeito visto no navegador) */
  w.abrirPainelFotos('Q1','S1');
  for(i=0;i<100&&!w.document.querySelector('#fotoPainel[open] .fe-matriz');i++) await espera();
  await espera(80);
  ck(w.document.querySelectorAll('#fotoPainel[open] img').length===2 && !quebradas('#fotoPainel[open]'),'fechar e reabrir o painel logo em seguida: as miniaturas continuam lá');
  ck(w.document.querySelectorAll('#fotoPainel').length===1,'uma janela só, a velha sai de cena');
  w.fotosDaParcela('T2R1','Q1','S1','av1');
  for(i=0;i<100&&!w.document.querySelector('#fotoFolha[open]');i++) await espera();
  w.fotosDaParcela('T2R1','Q1','S1','av2');
  await espera(20);
  for(i=0;i<100&&!(w.document.querySelector('#fotoFolha[open] .fe-foco h4')||{textContent:''}).textContent.match(/14 DAA/);i++) await espera();
  await espera(80);
  ck(w.document.querySelectorAll('#fotoFolha[open] img').length===2 && !quebradas('#fotoFolha[open]'),'reabrir a folha (depois de fotografar) também não quebra as miniaturas');
  ck(w.document.querySelectorAll('#fotoFolha').length===1,'uma folha só');
  w.document.querySelector('#fotoFolha[open]').close(); w.document.querySelector('#fotoPainel[open]').close(); await espera(60);

  console.log('\n[4] quem chamava a galeria antiga');
  w.abrirGaleriaFotos({qid:'Q1',sid:'S1'});
  for(i=0;i<100&&!w.document.querySelector('#fotoPainel[open]');i++) await espera();
  ck(!!w.document.querySelector('#fotoPainel[open]') && !w.__antiga,'a página do estudo abre o painel novo');
  w.document.querySelector('#fotoPainel[open]').close();
  w.abrirGaleriaFotos({qid:'Q1',sid:'S1'},{treatment:'T2',rep:1,assessment:'av1'});
  for(i=0;i<100&&!w.document.querySelector('#fotoFolha[open]');i++) await espera();
  ck(!!w.document.querySelector('#fotoFolha[open]'),'chamada com a parcela abre direto as fotos dela');
  w.document.querySelector('#fotoFolha[open]').close();
  ck(typeof w.abrirGaleriaFotosCompleta==='function','a galeria de sempre segue carregada');

  console.log('\n[5] slides e fotos em sequência: a galeria de sempre, aberta no lugar certo');
  /* "Por favor, corrija os slides das fotos, saiu tudo errado, sumiu o botão de
     escolher quantas fotos por slide" — o PPTX próprio do painel saía com 4
     fotos fixas por slide e a legenda inteira numa linha. Os slides voltam a
     ser os da galeria (1 a 8 por slide, prévia, seleção e ordem). */
  ck(!/fotos-pptx/.test(fs.readFileSync('index.html','utf8')),'a abertura do app não carrega o gerador de PPTX/ZIP');
  ck(!/FotosPptx|carregarPptx/.test(fs.readFileSync('fotos-estudo.js','utf8')),'o painel não tem mais um gerador de slides próprio');
  w.abrirPainelFotos('Q1','S1');
  for(i=0;i<100&&!w.document.querySelector('#fotoPainel[open] [data-p="slides"]');i++) await espera();
  var pn5=w.document.querySelector('#fotoPainel[open]');
  ck(!pn5.querySelector('[data-p="pptx"],[data-p="zip"]'),'nada de "Apresentação (PPTX)" com 4 fotos fixas');
  w.__galeria.length=0;
  pn5.querySelector('[data-p="slides"]').click();
  var g=w.__galeria[0];
  ck(g && g.s.qid==='Q1' && g.s.sid==='S1' && g.ini && g.ini.slides===true,'"Slides e originais" abre a galeria de sempre, já na montagem da apresentação');
  pn5.querySelector('[data-p="sequencia"]').click();
  g=w.__galeria[1];
  ck(g && g.ini.sequence===true && g.ini.treatment==='T1' && g.ini.rep===1 && g.ini.plot==='1A','"Fotos em sequência" abre a tela de fotos seguidas, na primeira parcela');
  ck(g.ini.assessment==='av2' && g.ini.date==='2026-09-15','e presa à leitura de hoje, quando o estudo tem uma');
  ck(!!w.document.querySelector('#fotoPainel[open]'),'o painel fica embaixo (redesenha quando a galeria fecha)');

  console.log('\n[5b] na avaliação');
  w.__avAberta=estudo.avaliacoes[0]; w.__galeria.length=0; w.__cliques.length=0;
  w.document.body.insertAdjacentHTML('beforeend','<div id="eePnl"><button type="button" data-av-photo-seq="1">📷 Fotos em sequência</button></div>');
  w.document.getElementById('eePnl').addEventListener('click',function(ev){ ev.stopPropagation(); });
  w._avCroquiKey='T2R2';
  w.document.querySelector('[data-av-photo-seq]').click();
  g=w.__galeria[0];
  ck(g && g.ini.sequence===true && g.ini.treatment==='T2' && g.ini.rep===2 && g.ini.plot==='2B' && g.ini.assessment==='av1' && g.ini.date==='2026-09-08',
     'o botão da avaliação abre a sequência na parcela destacada, presa à leitura aberta (mesmo com o painel parando o clique)');
  ck(!w.__cliques.length,'e não abre a câmera solta');
  w._avCroquiKey=null;
  w.localStorage.setItem('agracta-fotos-sequencia','1');
  w.avFotografarParcela('T1R2');
  g=w.__galeria[1];
  ck(g && g.ini.sequence===true && g.ini.plot==='1B' && !w.__cliques.length,'quem deixou a sequência ligada: o botão Foto volta a abrir a tela de fotos seguidas, nesta parcela');
  w.localStorage.setItem('agracta-fotos-sequencia','0');
  w.avFotografarParcela('T1R2');
  ck(w.__galeria.length===2 && w.__cliques.length===1,'sequência desligada: o botão Foto abre a câmera direto, como no painel novo');
  w.__cliques.length=0;

  console.log('\n[6] excluir');
  var pn6=w.document.querySelector('#fotoPainel[open]');
  w.fotosDaParcela('T2R1','Q1','S1','av1');
  for(i=0;i<100&&!w.document.querySelector('#fotoFolha[open] .fe-mini');i++) await espera();
  w.document.querySelector('#fotoFolha[open] .fe-mini').click();
  var amp=w.document.querySelector('dialog.fe-amplia[open]');
  ck(amp && /2A/.test(amp.textContent),'tocar na miniatura amplia a foto, com a legenda');
  amp.querySelector('[data-a="apagar"]').click();
  for(i=0;i<100&&bancoMem['["u1","Q1","S1"]'].length!==1;i++) await espera();
  for(i=0;i<100&&!(w.document.querySelector('#fotoFolha[open]')&&w.document.querySelectorAll('#fotoFolha[open] .fe-mini').length===1);i++) await espera();
  ck(bancoMem['["u1","Q1","S1"]'].length===1,'a foto sai do aparelho');
  ck(w.document.querySelectorAll('#fotoFolha[open] .fe-mini').length===1,'a folha da parcela se redesenha sem ela (não fecha na cara de quem estava vendo)');
  for(i=0;i<100&&!/1 foto\(s\) neste aparelho/.test((w.document.querySelector('#fotoPainel[open]')||{}).textContent||'');i++) await espera();
  ck(/1 foto\(s\) neste aparelho/.test(pn6.textContent),'e o painel embaixo também');
  w.document.querySelector('#fotoFolha[open]').close(); pn6.close(); await espera(60);

  console.log('\n'+passes+' ok, '+falhas+' falha(s)');
  process.exit(falhas?1:0);
})().catch(function(e){ console.log('FALHA erro inesperado: '+(e&&e.stack||e)); process.exit(1); });
