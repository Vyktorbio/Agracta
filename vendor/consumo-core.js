/* ============================================================================
   ConsumoCore — o que a aplicação tirou do lote
   ----------------------------------------------------------------------------
   O app já sabia as duas pontas e não ligava uma na outra.

   De um lado, a memória de cálculo da aplicação sabe exatamente quanto de cada
   componente foi preparado — 450 mL de Sankari, 90 g de mancozebe. Do outro, o
   tratamento aponta para o LOTE físico de onde o material saiu, e o lote tem um
   saldo que é a soma de eventos imutáveis. Entre as duas coisas não havia fio
   nenhum: quem aplicava registrava a aplicação e, para o estoque bater, tinha de
   ir à tela do item e digitar de novo a mesma quantidade. Ninguém faz isso duas
   vezes — então o saldo não batia, e a cadeia de custódia tinha um buraco
   exatamente no ponto em que o material vira ensaio.

   Este motor é a conta desse fio. Ele não escreve nada: recebe a memória, os
   vínculos de lote e os saldos, e devolve o que DEVE ser baixado e o que não
   pode ser — cada recusa com o nome do que faltou. Quem grava é o app.

   TRÊS REGRAS QUE ESTE MOTOR EXISTE PARA SUSTENTAR

   1. UNIDADE NÃO SE CHUTA. A memória fala em mL e g; o lote foi cadastrado em L
      ou kg. Converter dentro da mesma família é aritmética. Entre famílias —
      mL para g — é RECUSADO com o nome do que falta (a densidade). Um motor que
      "resolvesse" isso assumindo água produziria baixa errada com cara de baixa
      certa, e o erro só apareceria no inventário do ano seguinte.

   2. SALDO INSUFICIENTE NÃO VIRA SALDO NEGATIVO NEM SILÊNCIO. A recusa sai
      nomeada, com quanto faltou. O app mostra e a aplicação é salva do mesmo
      jeito: a pulverização aconteceu, e um registro que se recusa a existir
      porque o estoque estava mal lançado é pior que um aviso.

   3. LOTE VENCIDO NA DATA DA APLICAÇÃO É BAIXADO E MARCADO. Não bloquear, não
      calar. O material foi usado — apagar isso reescreveria o ensaio. Marcar é
      o que transforma o fato num achado de auditoria em vez de numa surpresa.

   Sem DOM, sem armazenamento, sem rede: dá para testar sem navegador.
   ========================================================================== */
(function(raiz){
  'use strict';

  var VERSION = '1.0.0';

  /* Famílias físicas. A chave é a unidade normalizada; o valor, quanto vale na
     unidade-base da família (mL para volume, g para massa). */
  var VOLUME = {
    'ml':1, 'mililitro':1, 'mililitros':1, 'cc':1, 'cm3':1,
    'l':1000, 'litro':1000, 'litros':1000,
    'ul':0.001, 'µl':0.001, 'microlitro':0.001, 'microlitros':0.001
  };
  var MASSA = {
    'g':1, 'grama':1, 'gramas':1,
    'mg':0.001, 'miligrama':0.001, 'miligramas':0.001,
    'kg':1000, 'quilo':1000, 'quilos':1000, 'quilograma':1000, 'quilogramas':1000
  };
  var NOME_FAMILIA = { volume:'volume', massa:'massa' };

  function norm(u){
    return String(u==null?'':u).trim().toLowerCase()
      .replace(/\.$/,'')
      .replace(/\s+/g,'');
  }
  function num(v){
    if(v===''||v==null) return null;
    var n=(typeof v==='number')?v:Number(String(v).replace(',','.'));
    return isFinite(n)?n:null;
  }
  function arred(n){ return Math.round(n*1000000)/1000000; }

  /* A que família uma unidade pertence — ou null quando é unidade que este motor
     não sabe converter (semente, planta, dose por parcela). Devolver null é
     resposta: o app não baixa, e diz por quê. */
  function familia(u){
    var k=norm(u);
    if(Object.prototype.hasOwnProperty.call(VOLUME,k)) return 'volume';
    if(Object.prototype.hasOwnProperty.call(MASSA,k)) return 'massa';
    return null;
  }

  function fator(u){
    var k=norm(u);
    if(Object.prototype.hasOwnProperty.call(VOLUME,k)) return VOLUME[k];
    if(Object.prototype.hasOwnProperty.call(MASSA,k)) return MASSA[k];
    return null;
  }

  /* Converter dentro da família. Fora dela, RECUSA com o nome do que falta —
     nunca um número plausível. */
  function converter(valor, de, para){
    var v=num(valor);
    if(v==null) return {erro:'Quantidade não numérica.'};
    var fDe=familia(de), fPara=familia(para);
    if(!fDe) return {erro:'Não sei converter a unidade "'+String(de)+'".', unidade:String(de)};
    if(!fPara) return {erro:'Não sei converter para a unidade "'+String(para)+'".', unidade:String(para)};
    if(fDe!==fPara){
      return {erro:'"'+String(de)+'" é '+NOME_FAMILIA[fDe]+' e "'+String(para)+'" é '+
                   NOME_FAMILIA[fPara]+'. Converter um no outro exige a densidade do produto, '+
                   'que o lote não declara.',
              falta:'densidade', de:String(de), para:String(para)};
    }
    return {valor:arred(v*fator(de)/fator(para)), unidade:String(para), familia:fDe};
  }

  /* ---- O que a memória de cálculo diz que foi preparado ----------------------
     Duas formas de memória, um só formato de saída. A de CAMPO traz componentes
     com total em mL ou g; a de BANCADA traz o que se pipetou (mL) ou o que se
     pesou (mg) por tratamento. Um "quantidade/unidade" só, para o resto do motor
     não precisar saber de qual bancada veio. */
  function consumosDaMemoria(mem){
    var out=[];
    if(!mem || !Array.isArray(mem.tratamentos)) return out;
    var lab=(mem.contexto==='laboratorio');

    mem.tratamentos.forEach(function(t){
      if(!t || t.semPreparo || t.erro || t.impossivel) return;
      /* `liberado:false` quer dizer que o motor recusou o preparo — a calda não
         cabe, ou a receita tem problema. Não se baixa lote de um preparo que não
         aconteceu. Só bloqueia quando é FALSO de verdade: memória antiga não tem
         este campo, e tratá-la como bloqueada apagaria a baixa de todo estudo
         anterior a esta versão do motor. */
      if(t.liberado===false) return;

      if(!lab){
        (t.componentes||[]).forEach(function(c,i){
          var q=num(c&&c.total);
          if(q==null||q<=0) return;
          out.push({tratamentoId:(t.id||null), indice:i, nome:(c.nome||''),
                    /* Desde o motor de calda 1.1.0 o componente da memória carrega
                       a própria identidade: id do componente, item e lote. Quando
                       ela vem, é ela que manda — casar por nome era heurística
                       necessária só enquanto o vínculo não viajava junto. */
                    componenteId:((c&&c.id)||null), itemId:((c&&c.itemId)||null),
                    loteRef:((c&&c.loteRef)||null),
                    quantidade:arred(q), unidade:(c.unidadeMassa||c.unidade||''),
                    contexto:'campo'});
        });
        return;
      }

      /* Bancada: pipetar e pesar são coisas diferentes e só uma delas acontece. */
      var q=null, u=null;
      if(num(t.produtoMl)!=null && num(t.produtoMl)>0){ q=num(t.produtoMl); u='mL'; }
      else if(num(t.massaMg)!=null && num(t.massaMg)>0){ q=num(t.massaMg); u='mg'; }
      if(q==null) return;
      out.push({tratamentoId:(t.id||null), indice:0, nome:(t.produto||''),
                quantidade:arred(q), unidade:u, contexto:'laboratorio'});
    });
    return out;
  }

  /* A chave é o que impede baixar duas vezes a mesma coisa. Ela não inclui a
     aplicação porque quem chama já guarda a lista POR aplicação — e incluir a
     aplicação aqui faria uma memória regravada parecer consumo novo. */
  function chaveBaixa(tratamentoId, componenteId, loteId){
    return String(tratamentoId||'')+'|'+String(componenteId||'-')+'|'+String(loteId||'');
  }

  /* Qual lote responde por este consumo. O componente manda quando declara o
     seu; senão vale o do tratamento — que é o caso de quem nunca abriu a receita
     e tem um produto só.

     TRÊS CAMINHOS, NESTA ORDEM, e a ordem é a questão. Se a própria memória
     trouxe o lote, é ele: foi o que estava valendo na hora do preparo, e o
     tratamento pode ter sido reeditado desde então. Depois, o id do componente,
     que é identidade e não texto. Só então o nome — que é o que sobra para
     memória gravada antes de o vínculo viajar junto. */
  function _vinculoDe(trat, consumo){
    var cs=(trat&&trat.componentes)||[];
    var c=null;

    if(consumo.loteRef && consumo.loteRef.loteId){
      return {loteRef:consumo.loteRef, componenteId:(consumo.componenteId||null),
              componenteNome:consumo.nome, fonte:'memoria'};
    }
    if(cs.length && consumo.componenteId){
      for(var k=0;k<cs.length;k++){
        if(cs[k] && cs[k].id===consumo.componenteId){ c=cs[k]; break; }
      }
    }
    if(!c && cs.length){
      var alvo=norm(consumo.nome);
      for(var i=0;i<cs.length;i++){
        if(alvo && norm(cs[i]&&cs[i].nome)===alvo){ c=cs[i]; break; }
      }
      if(!c && cs[consumo.indice]) c=cs[consumo.indice];
    }
    if(c && c.loteRef && c.loteRef.loteId) return {loteRef:c.loteRef, componenteId:(c.id||null), componenteNome:(c.nome||consumo.nome)};
    /* Receita com mais de um componente NÃO herda o lote do tratamento: o lote é
       de um produto, e atribuir a um componente o lote do outro inventaria uma
       origem. Herdar só faz sentido quando há um componente só. */
    if(trat && trat.loteRef && trat.loteRef.loteId && cs.length<=1)
      return {loteRef:trat.loteRef, componenteId:(c&&c.id)||null, componenteNome:(c&&c.nome)||consumo.nome};
    return null;
  }

  /* ---- O plano ---------------------------------------------------------------
     Entra: memória, tratamentos (com os vínculos de lote), os lotes com saldo, a
     data da aplicação e o que já foi baixado antes.
     Sai: o que baixar, o que se recusou a baixar e por quê, e o que já estava
     baixado. Nada aqui escreve — quem grava é o app. */
  function planejar(cfg){
    cfg=cfg||{};
    var mem=cfg.memoria, trats=cfg.tratamentos||[], lotes=cfg.lotes||{};
    var data=String(cfg.data||''), jaFeitas=cfg.jaRegistrados||[];
    var plano={baixas:[], recusas:[], jaRegistradas:[], semLote:[], versao:VERSION};

    if(!mem) return plano;
    var porId={};
    trats.forEach(function(t){ if(t&&t.id) porId[t.id]=t; });

    /* O saldo anda dentro do próprio plano: dois tratamentos do mesmo lote na
       mesma aplicação precisam ser conferidos contra o que sobra depois do
       primeiro, não contra o saldo de antes dos dois.

       E a conferência é do TOTAL, não saque a saque. Os saques que uma aplicação
       faz de um lote são um preparo físico só: se o lote não cobre o conjunto,
       baixar a parte que coube deixaria o saldo num número que não é nem o
       antigo nem o certo — mantido na aparência e errado no fundo, que é o pior
       dos três estados. Ou o lote cobre a aplicação inteira, ou nenhuma baixa
       dele sai e a recusa diz quanto faltou no total. */
    var saldoAndando={}, pedidoPorLote={};

    consumosDaMemoria(mem).forEach(function(c){
      var t0=porId[c.tratamentoId]||null;
      var v0=_vinculoDe(t0, c);
      if(!v0) return;
      var l0=lotes[v0.loteRef.loteId];
      if(!l0) return;
      /* O que já foi baixado antes já saiu do saldo: contá-lo de novo aqui faria
         uma reconferência recusar o que ela existe para completar. */
      if(jaFeitas.indexOf(chaveBaixa(c.tratamentoId, v0.componenteId, v0.loteRef.loteId))>=0) return;
      var q0=converter(c.quantidade, c.unidade, l0.unidade);
      if(q0.erro) return;
      pedidoPorLote[v0.loteRef.loteId]=arred((pedidoPorLote[v0.loteRef.loteId]||0)+q0.valor);
    });

    consumosDaMemoria(mem).forEach(function(c){
      var t=porId[c.tratamentoId]||null;
      var v=_vinculoDe(t, c);
      if(!v){ plano.semLote.push({tratamentoId:c.tratamentoId, nome:c.nome,
                                  quantidade:c.quantidade, unidade:c.unidade}); return; }

      var loteId=v.loteRef.loteId, lote=lotes[loteId]||null;
      var base={chave:chaveBaixa(c.tratamentoId, v.componenteId, loteId),
                tratamentoId:c.tratamentoId, componenteId:v.componenteId,
                nome:(v.componenteNome||c.nome), itemId:(v.loteRef.itemId||null),
                loteId:loteId, codigo:(v.loteRef.codigo||(lote&&lote.codigo)||''),
                quantidadeOriginal:c.quantidade, unidadeOriginal:c.unidade};

      if(jaFeitas.indexOf(base.chave)>=0){ plano.jaRegistradas.push(base); return; }

      if(!lote){ base.motivo='O lote vinculado a este tratamento não existe mais no banco de itens.';
                 base.causa='lote'; plano.recusas.push(base); return; }
      if(lote.situacao==='encerrado'){ base.motivo='O lote '+(lote.codigo||loteId)+' está encerrado.';
                 base.causa='encerrado'; plano.recusas.push(base); return; }

      var conv=converter(c.quantidade, c.unidade, lote.unidade);
      if(conv.erro){ base.motivo=conv.erro; base.causa='unidade'; base.falta=conv.falta||null;
                     plano.recusas.push(base); return; }

      var disponivel=num(lote.saldo); if(disponivel==null) disponivel=0;
      var pedido=pedidoPorLote[loteId]||conv.valor;
      /* Confere o TOTAL que esta aplicação pede deste lote, não este saque. */
      if(pedido - disponivel > 0.0000001){
        base.motivo='Saldo insuficiente no lote '+(lote.codigo||loteId)+': esta aplicação pede '+
                    pedido+' '+lote.unidade+' e restam '+arred(disponivel)+' '+lote.unidade+'.';
        base.causa='saldo'; base.quantidade=conv.valor; base.unidade=lote.unidade;
        base.falta=arred(pedido-disponivel);
        plano.recusas.push(base); return;
      }
      var saldo=(saldoAndando[loteId]!=null)?saldoAndando[loteId]:disponivel;

      base.quantidade=conv.valor; base.unidade=lote.unidade;
      /* Vencido não impede: impede é apagar. */
      base.vencido=!!(data && lote.validade && String(lote.validade)<data);
      if(base.vencido) base.validade=String(lote.validade);
      saldoAndando[loteId]=arred(saldo-conv.valor);
      base.saldoPrevisto=saldoAndando[loteId];
      plano.baixas.push(base);
    });

    return plano;
  }

  /* Uma linha para o cartão da aplicação, do jeito que se lê em voz alta. */
  function resumo(plano){
    if(!plano) return '';
    var p=[];
    if(plano.baixas.length) p.push(plano.baixas.length+' baixa'+(plano.baixas.length===1?'':'s'));
    if(plano.recusas.length) p.push(plano.recusas.length+' recusada'+(plano.recusas.length===1?'':'s'));
    if(plano.jaRegistradas.length) p.push(plano.jaRegistradas.length+' já registrada'+(plano.jaRegistradas.length===1?'':'s'));
    return p.join(' · ');
  }

  var API = {VERSION:VERSION, familia:familia, converter:converter,
             consumosDaMemoria:consumosDaMemoria, chaveBaixa:chaveBaixa,
             planejar:planejar, resumo:resumo};

  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.ConsumoCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
