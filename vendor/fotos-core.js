/* ============================================================================
   FotosCore — as fotos do estudo organizadas como o ensaio é organizado
   ----------------------------------------------------------------------------
   A foto de campo tem dono: uma PARCELA (tratamento × repetição) numa
   AVALIAÇÃO (data, momento). A galeria antiga pedia essa identificação num
   formulário a cada foto e mostrava tudo numa lista corrida. Aqui a foto nasce
   identificada pela parcela da vez, e o painel a devolve no lugar dela: a
   matriz tratamento × avaliação, que é o jeito de comparar o ensaio no tempo.

   MOTOR PURO: sem DOM e sem IndexedDB. Recebe as linhas do banco local
   (FotosStore) e o que o estudo sabe; devolve agrupamentos e legendas.
   Compatível com as fotos já gravadas pela galeria antiga (mesmos campos:
   treatment, rep, date, assessment, plot, createdAt, order).
   ============================================================================ */
(function(root){
  'use strict';
  var VERSAO='1.0.0';

  function br(d){ return /^\d{4}-\d{2}-\d{2}$/.test(d||'')?(d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4)):''; }
  function chaveParcela(tratamento, rep){ return String(tratamento)+'R'+String(rep); }
  function ordemFoto(a,b){
    return String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))||((a.order||0)-(b.order||0));
  }

  /* Linha nova do banco, com a identificação que o app já sabe. */
  function novaFoto(meta){
    meta=meta||{};
    var agora=meta.agora?new Date(meta.agora):new Date();
    var iso=agora.toISOString();
    return {id:meta.id||('f'+agora.getTime().toString(36)+Math.random().toString(36).slice(2,8)),
      order:meta.order!=null?meta.order:agora.getTime(), createdAt:iso,
      blob:meta.blob||null, thumb:meta.thumb||null, type:meta.type||'image/jpeg',
      treatment:String(meta.tratamento), rep:Number(meta.rep), plot:String(meta.parcela||chaveParcela(meta.tratamento,meta.rep)).slice(0,40),
      date:meta.data||iso.slice(0,10), hora:meta.hora||'', assessment:meta.avaliacao||'', momento:meta.momento||'',
      autor:meta.autor||'', origem:'app', largura:meta.largura||null, altura:meta.altura||null};
  }

  /* Contagem por parcela — numa avaliação, ou em todas (avaliacao = null). */
  function contagem(fotos, avaliacao){
    var o={};
    (fotos||[]).forEach(function(f){
      if(!f||f.treatment==null) return;
      if(avaliacao && String(f.assessment||'')!==String(avaliacao)) return;
      var k=chaveParcela(f.treatment,f.rep); o[k]=(o[k]||0)+1;
    });
    return o;
  }
  function daParcela(fotos, tratamento, rep){
    return (fotos||[]).filter(function(f){ return f && String(f.treatment)===String(tratamento) && Number(f.rep)===Number(rep); }).sort(ordemFoto);
  }

  /* Colunas da matriz: as avaliações do estudo na ordem do tempo, e — se houver
     foto sem avaliação (galeria antiga, foto avulsa) — uma coluna por data. */
  function colunas(fotos, avaliacoes){
    var cols=(avaliacoes||[]).filter(function(a){ return a&&a.id; }).map(function(a){
      return {id:String(a.id), rotulo:a.rotulo||br(a.data)||String(a.id), data:a.data||'', ordem:a.ordem!=null?a.ordem:0, avaliacao:true};
    });
    var ids={}; cols.forEach(function(c){ ids[c.id]=1; });
    var avulsas={};
    (fotos||[]).forEach(function(f){
      if(!f) return;
      var a=String(f.assessment||'');
      if(a && ids[a]) return;
      var d=f.date||'sem-data';
      avulsas['data:'+d]={id:'data:'+d, rotulo:(br(d)||'Sem data')+' · sem avaliação', data:(d==='sem-data'?'':d), ordem:null, avaliacao:false};
    });
    Object.keys(avulsas).forEach(function(k){ cols.push(avulsas[k]); });
    return cols.sort(function(a,b){
      var da=a.data||'9999', db=b.data||'9999';
      return da.localeCompare(db) || ((a.ordem==null?1e9:a.ordem)-(b.ordem==null?1e9:b.ordem));
    });
  }
  function colunaDa(f, cols){
    var a=String(f.assessment||'');
    for(var i=0;i<cols.length;i++){ if(cols[i].avaliacao && cols[i].id===a) return cols[i].id; }
    return 'data:'+(f.date||'sem-data');
  }

  /* A matriz do painel: uma linha por parcela, na ordem do campo; em cada
     célula, as fotos daquela parcela naquela avaliação. */
  function matriz(fotos, parcelas, avaliacoes){
    var cols=colunas(fotos, avaliacoes), porCelula={};
    (fotos||[]).forEach(function(f){
      if(!f||f.treatment==null) return;
      var k=chaveParcela(f.treatment,f.rep)+'|'+colunaDa(f,cols);
      (porCelula[k]=porCelula[k]||[]).push(f);
    });
    Object.keys(porCelula).forEach(function(k){ porCelula[k].sort(ordemFoto); });
    var conhecidas={}, linhas=(parcelas||[]).map(function(p){
      var chave=chaveParcela(p.tratamento,p.rep); conhecidas[chave]=1;
      return {chave:chave, tratamento:String(p.tratamento), rep:Number(p.rep), parcela:p.parcela||chave, produto:p.produto||'',
        celulas:cols.map(function(c){ return {coluna:c.id, fotos:porCelula[chave+'|'+c.id]||[]}; })};
    });
    /* foto de parcela que não existe mais no cadastro (tratamento apagado): não some */
    var orfas={};
    (fotos||[]).forEach(function(f){ if(f&&f.treatment!=null&&!conhecidas[chaveParcela(f.treatment,f.rep)]) orfas[chaveParcela(f.treatment,f.rep)]={tratamento:String(f.treatment),rep:Number(f.rep),parcela:f.plot}; });
    Object.keys(orfas).sort().forEach(function(chave){
      var p=orfas[chave];
      linhas.push({chave:chave, tratamento:p.tratamento, rep:p.rep, parcela:p.parcela||chave, produto:'', orfa:true,
        celulas:cols.map(function(c){ return {coluna:c.id, fotos:porCelula[chave+'|'+c.id]||[]}; })});
    });
    var total=(fotos||[]).length;
    return {colunas:cols, linhas:linhas, total:total,
      colunasComFoto:cols.filter(function(c){ return linhas.some(function(l){ return l.celulas.some(function(x){ return x.coluna===c.id&&x.fotos.length; }); }); }).length};
  }

  /* Legenda de uma foto: o que um revisor precisa ler embaixo dela. */
  function legenda(f, ctx){
    ctx=ctx||{};
    var t=(ctx.tratamentos||[]).filter(function(x){ return String(x.id)===String(f.treatment); })[0];
    var av=(ctx.avaliacoes||[]).filter(function(a){ return String(a.id)===String(f.assessment||''); })[0];
    var partes=[String(f.treatment)+(t&&t.produto?' · '+t.produto:'')+(t&&t.dose?' · '+t.dose:''), 'R'+f.rep];
    if(f.plot && f.plot!==chaveParcela(f.treatment,f.rep)) partes.push('parcela '+f.plot);
    var quando=[av&&av.rotulo&&av.rotulo!==br(av.data)?av.rotulo:(f.momento||''), br(f.date)+(f.hora?' '+String(f.hora).slice(0,5):'')].filter(Boolean).join(' · ');
    if(quando) partes.push(quando);
    return partes.join(' · ');
  }

  /* Nome de arquivo estável e legível para o ZIP de originais. */
  function nomeArquivo(f, i){
    var ext=f.type==='image/png'?'png':(f.type==='image/webp'?'webp':'jpg');
    return String(i+1).padStart(3,'0')+'_'+String(f.treatment).replace(/[^a-z0-9_-]/gi,'_')+'_R'+f.rep+'_'+(f.date||'sem-data')+'.'+ext;
  }

  var API={VERSAO:VERSAO, chaveParcela:chaveParcela, novaFoto:novaFoto, contagem:contagem, daParcela:daParcela,
    colunas:colunas, matriz:matriz, legenda:legenda, nomeArquivo:nomeArquivo, br:br};
  root.FotosCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
