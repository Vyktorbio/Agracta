/* ============================================================================
   VersoesCore — o histórico de versões que o servidor guarda
   ----------------------------------------------------------------------------
   Na época do Supabase, cada gravação deixava a versão anterior numa tabela
   que o cliente não conseguia reescrever (app_state_history). A migração para o
   Firebase levou o dado e deixou esse histórico para trás: o botão "Histórico
   da nuvem" passou a abrir só os backups do próprio aparelho, e os documentos
   de conformidade continuaram citando uma proteção que não existia mais.

   Este motor devolve essa proteção, do jeito que o Firestore permite sem
   Cloud Functions: toda gravação leva junto, NO MESMO LOTE, um registro por
   documento alterado com o conteúdo ANTERIOR dele. As regras do banco aceitam
   criar esse registro e recusam editar ou apagar — para qualquer pessoa,
   inclusive o administrador pelo app. O carimbo de hora é o do servidor, não o
   do aparelho, e o autor é o e-mail da sessão, conferido pela regra.

   QUATRO REGRAS

   1. GUARDA O ANTERIOR, NÃO O NOVO. O novo já está no documento vivo. Com o
      anterior de cada mudança, a cadeia inteira se reconstrói: o estado antes
      da gravação R é o estado atual com todas as gravações >= R desfeitas, da
      mais nova para a mais velha.
   2. CRIAR TAMBÉM É EVENTO. Um documento novo entra com anterior nulo. Sem
      isso, restaurar para antes dele não saberia que ele tem de sumir, e
      ninguém saberia pelo servidor quem o criou e quando.
   3. O QUE NÃO CABE É DITO, NÃO CORTADO. O Firestore recusa documento acima de
      1 MiB. Um anterior grande demais vai marcado `grande:true`, sem conteúdo,
      e a restauração lista esse documento como irrecuperável em vez de fingir
      que voltou.
   4. MOTOR PURO. Sem Firestore, sem DOM. Recebe objetos, devolve objetos, e
      por isso o teste roda no Node.
   ============================================================================ */
(function(root){
  'use strict';

  var VERSAO='1.0.0';
  /* Folga sob o limite de 1 MiB do Firestore para o envelope do registro. */
  var MAX_ANTERIOR_BYTES=900000;

  function stable(v){
    if(v===null||typeof v!=='object') return JSON.stringify(v);
    if(Array.isArray(v)) return '['+v.map(stable).join(',')+']';
    return '{'+Object.keys(v).sort().map(function(k){
      return JSON.stringify(k)+':'+stable(v[k]);
    }).join(',')+'}';
  }
  function clone(v){ return v==null?v:JSON.parse(JSON.stringify(v)); }
  function bytes(v){
    try{ return new TextEncoder().encode(JSON.stringify(v)).length; }
    catch(e){ return JSON.stringify(v).length*2; }
  }

  /* As mudanças entre o que o servidor tinha (prev) e o que vai (next), por
     coleção. Mesma comparação do firebase-sync: só entra o que mudou. */
  function mudancas(prev, next, colecoes){
    prev=prev||{}; next=next||{};
    var out=[];
    (colecoes||Object.keys(next)).forEach(function(c){
      var n=next[c]||{}, p=prev[c]||{};
      Object.keys(n).forEach(function(id){
        if(!p[id]) out.push({colecao:c, docId:id, acao:'criar', anterior:null, novo:n[id]});
        else if(stable(p[id])!==stable(n[id])) out.push({colecao:c, docId:id, acao:'alterar', anterior:p[id], novo:n[id]});
      });
      Object.keys(p).forEach(function(id){
        if(!n[id]) out.push({colecao:c, docId:id, acao:'apagar', anterior:p[id], novo:null});
      });
    });
    return out;
  }

  /* O registro que vai para `historico`. `em` e `por` quem preenche é o
     chamador: o carimbo é o serverTimestamp, que só existe no SDK. */
  function registro(m, rev, maxBytes){
    var lim=(maxBytes==null?MAX_ANTERIOR_BYTES:maxBytes);
    var r={rev:rev, colecao:m.colecao, docId:m.docId, acao:m.acao, anterior:null};
    if(m.anterior!=null){
      if(bytes(m.anterior)>lim) r.grande=true;
      else r.anterior=clone(m.anterior);
    }
    return r;
  }

  /* Divide em lotes que o Firestore aceita: até 500 escritas e um pedido de
     tamanho razoável. Cada mudança anda COLADA ao seu registro de histórico —
     um lote que gravasse o dado e deixasse o histórico para o próximo abriria
     uma janela em que a alteração existe e o anterior dela não. */
  function lotes(pares, maxOps, maxBytes){
    maxOps=maxOps||450; maxBytes=maxBytes||8000000;
    var out=[], atual=[], ops=0, tam=0;
    (pares||[]).forEach(function(p){
      var n=p.length, b=0;
      p.forEach(function(o){ b+=o.bytes!=null?o.bytes:bytes(o.data||null); });
      if(atual.length && (ops+n>maxOps || tam+b>maxBytes)){ out.push(atual); atual=[]; ops=0; tam=0; }
      p.forEach(function(o){ atual.push(o); });
      ops+=n; tam+=b;
    });
    if(atual.length) out.push(atual);
    return out;
  }

  /* Lista plana de registros → uma linha por gravação, da mais nova para a
     mais velha. É o que a tela mostra. */
  function porGravacao(lista){
    var g={};
    (lista||[]).forEach(function(r){
      if(!r || r.rev==null) return;
      var x=g[r.rev]||(g[r.rev]={rev:r.rev, em:null, por:'', porNome:'', total:0, colecoes:{}, grandes:0});
      x.total++;
      x.colecoes[r.colecao]=(x.colecoes[r.colecao]||0)+1;
      if(r.grande) x.grandes++;
      var t=emMs(r.em);
      if(t!=null && (x.em==null || t>x.em)) x.em=t;
      if(r.por && !x.por) x.por=r.por;
      if(r.porNome && !x.porNome) x.porNome=r.porNome;
    });
    return Object.keys(g).map(function(k){ return g[k]; })
      .sort(function(a,b){ return b.rev-a.rev; });
  }
  function emMs(v){
    if(v==null) return null;
    if(typeof v==='number') return v;
    if(typeof v.toMillis==='function') return v.toMillis();
    if(typeof v.seconds==='number') return v.seconds*1000+Math.round((v.nanoseconds||0)/1e6);
    var t=Date.parse(v); return isNaN(t)?null:t;
  }

  /* O estado ANTES da gravação `rev`: o atual com toda gravação >= rev
     desfeita, da mais nova para a mais velha. Devolve também o que não pôde
     voltar, com nome — restauração parcial calada seria pior que nenhuma. */
  function estadoAntesDe(flat, lista, rev){
    var out=clone(flat)||{}, irrecuperaveis=[];
    var alvo=(lista||[]).filter(function(r){ return r && r.rev>=rev; })
      .sort(function(a,b){ return b.rev-a.rev; });
    alvo.forEach(function(r){
      var c=out[r.colecao]||(out[r.colecao]={});
      if(r.acao==='criar'){ delete c[r.docId]; return; }
      if(r.grande || r.anterior==null){
        irrecuperaveis.push({colecao:r.colecao, docId:r.docId, rev:r.rev});
        return;
      }
      c[r.docId]=clone(r.anterior);
    });
    return {flat:out, irrecuperaveis:irrecuperaveis, desfeitos:alvo.length};
  }

  /* Resumo legível de uma gravação: "2 estudos · 5 avaliações". */
  var NOMES={locais:['local','locais'], quadras:['quadra','quadras'], estudos:['estudo','estudos'],
    aplicacoes:['aplicação','aplicações'], avaliacoes:['avaliação','avaliações'],
    lancamentos:['lançamento','lançamentos'], notas_campo:['nota de campo','notas de campo'],
    randomizacoes:['sorteio','sorteios'], itens:['item','itens'], config:['configuração','configurações'],
    media:['parte de foto','partes de foto']};
  function resumo(g){
    return Object.keys(g.colecoes||{}).sort().map(function(c){
      var n=g.colecoes[c], nm=NOMES[c]||[c,c];
      return n+' '+(n===1?nm[0]:nm[1]);
    }).join(' · ');
  }

  var API={VERSAO:VERSAO, MAX_ANTERIOR_BYTES:MAX_ANTERIOR_BYTES, stable:stable,
    mudancas:mudancas, registro:registro, lotes:lotes, porGravacao:porGravacao,
    estadoAntesDe:estadoAntesDe, resumo:resumo, emMs:emMs, bytes:bytes};
  root.VersoesCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
