/* ============================================================================
   ArmazenamentoCore — o que ocupa o armazenamento rápido do aparelho
   ----------------------------------------------------------------------------
   O localStorage do navegador tem teto de ~5 milhões de caracteres por site.
   Em 22/09/2026 ele encheu num celular e finalizar estudo deixou de gravar.
   O motivo principal estava no próprio app: a cada abertura e antes de cada
   exclusão, safetyBackup guardava ATÉ 10 CÓPIAS COMPLETAS dos dados ali, e
   só parava quando não cabia mais. Ele ocupava todo o espaço livre — e a
   gravação seguinte, maior por uma finalização com rubrica e estatística,
   não tinha para onde crescer.

   REGRAS
   1. A CÓPIA DE SEGURANÇA NÃO PODE COMER A FOLGA DO DADO. As cópias só usam o
      que sobra depois de reservar uma folga generosa para os dados crescerem.
      Na abertura, isso pode dar zero cópias — e está certo: o cofre (IndexedDB)
      e o histórico da nuvem continuam guardando. Antes de excluir ou restaurar,
      uma cópia ainda é tentada (a promessa da tela).
   2. SÓ É DESCARTÁVEL O QUE SE REFAZ SOZINHO. Consulta de solo, datas de NDVI,
      passagem de dados para outras telas. Tabelas de solo carregadas, rascunhos
      e a janela de acesso offline NÃO são descartáveis.
   3. MOTOR PURO: recebe um objeto parecido com localStorage, devolve números.
   ============================================================================ */
(function(root){
  'use strict';

  var VERSAO='1.0.0';
  /* Teto usual por site (Chrome/Android, Safari): ~5 milhões de caracteres.
     É estimativa — o navegador não diz o número exato. */
  var LIMITE=5000000;

  var REGRAS=[
    {re:/^iracema-v7$/, grupo:'dados', rotulo:'Estudos, quadras e avaliações'},
    {re:/^iracema-notas-v1$/, grupo:'dados', rotulo:'Observações de campo'},
    {re:/^iracema-safety$/, grupo:'seguranca', rotulo:'Cópias de segurança automáticas'},
    {re:/^agracta-(bioestat|prancha|croqui)-handoff$/, grupo:'cache', rotulo:'Passagem de dados para outra tela', descartavel:true},
    {re:/^agracta-solo-v1$/, grupo:'cache', rotulo:'Consultas de solo (refeitas quando precisar)', descartavel:true},
    {re:/^agracta-ndvi-(datas-v1|indice)$/, grupo:'cache', rotulo:'Datas de NDVI (refeitas quando precisar)', descartavel:true},
    {re:/^iracema-(qgeo|qgeots|georef|georefts|locais|qlocal|qnome|qnomets|qlocalts|locaists|randomizacoes|delq|dell|deln)(-v1)?$/, grupo:'dados', rotulo:'Mapa, locais e sorteios'},
    {re:/^agracta-itens/, grupo:'dados', rotulo:'Banco de itens'},
    {re:/^agracta-solo-tabelas/, grupo:'outros', rotulo:'Tabelas de solo carregadas'},
    {re:/^agracta-calc-drone-/, grupo:'outros', rotulo:'Rascunhos da calculadora do drone'}
  ];
  var GRUPOS={dados:'Seus dados',seguranca:'Cópias de segurança',cache:'Cache descartável',outros:'Outros'};

  function classificar(chave){
    for(var i=0;i<REGRAS.length;i++) if(REGRAS[i].re.test(chave))
      return {grupo:REGRAS[i].grupo, rotulo:REGRAS[i].rotulo, descartavel:!!REGRAS[i].descartavel};
    return {grupo:'outros', rotulo:chave, descartavel:false};
  }

  /* ls: {length, key(i), getItem(k)} */
  function medir(ls){
    var itens=[], total=0, porGrupo={dados:0,seguranca:0,cache:0,outros:0};
    var n=0; try{ n=ls.length||0; }catch(e){}
    for(var i=0;i<n;i++){
      var k=null, v=''; try{ k=ls.key(i); v=ls.getItem(k)||''; }catch(e){ continue; }
      if(k==null) continue;
      var c=classificar(k), chars=k.length+v.length;
      itens.push({chave:k, chars:chars, grupo:c.grupo, rotulo:c.rotulo, descartavel:c.descartavel});
      total+=chars; porGrupo[c.grupo]+=chars;
    }
    itens.sort(function(a,b){ return b.chars-a.chars; });
    return {itens:itens, total:total, porGrupo:porGrupo, limite:LIMITE, livre:Math.max(0,LIMITE-total),
      usoPct:Math.min(100,total/LIMITE*100)};
  }

  /* Quantas cópias de segurança cabem sem tirar a folga dos dados.
     semSeguranca: caracteres ocupados por tudo que NÃO é cópia;
     copia: caracteres de uma cópia; dados: caracteres do estado principal. */
  function copiasPermitidas(semSeguranca, copia, dados, limite, maximo){
    limite=limite||LIMITE; maximo=maximo==null?10:maximo;
    var folga=Math.max(1000000, (dados||0)*0.5);
    var sobra=limite-folga-(semSeguranca||0);
    if(!(copia>0)) return 0;
    return Math.max(0, Math.min(maximo, Math.floor(sobra/copia)));
  }

  /* Imagens embutidas no estado (rubricas, fotos antigas): quantas e quanto. */
  function imagens(obj){
    var out={rubricas:{n:0,chars:0}, outras:{n:0,chars:0}}, vistos=0;
    (function anda(x, chave){
      if(vistos>2000000) return;
      if(typeof x==='string'){
        if(x.length>100 && x.slice(0,11)==='data:image/'){
          var g=/rubrica|assinatura/i.test(chave||'')?out.rubricas:out.outras;
          g.n++; g.chars+=x.length;
        }
        return;
      }
      if(!x||typeof x!=='object') return;
      vistos++;
      if(Array.isArray(x)){ for(var i=0;i<x.length;i++) anda(x[i], chave); return; }
      for(var k in x) if(Object.prototype.hasOwnProperty.call(x,k)) anda(x[k], k);
    })(obj,'');
    return out;
  }

  /* Caixa da tinta num ImageData (canal alfa): {x,y,w,h} ou null se vazio. */
  function caixaDaTinta(px, largura, altura){
    var x0=largura, y0=altura, x1=-1, y1=-1;
    for(var y=0;y<altura;y++){
      var base=y*largura*4;
      for(var x=0;x<largura;x++){
        if(px[base+x*4+3]>16){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      }
    }
    if(x1<0) return null;
    return {x:x0, y:y0, w:x1-x0+1, h:y1-y0+1};
  }

  function mb(chars){ return chars*2/1048576; }   /* UTF-16: 2 bytes por caractere */

  var API={VERSAO:VERSAO, LIMITE:LIMITE, GRUPOS:GRUPOS, classificar:classificar, medir:medir,
    copiasPermitidas:copiasPermitidas, imagens:imagens, caixaDaTinta:caixaDaTinta, mb:mb};
  root.ArmazenamentoCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
