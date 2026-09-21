/* PENDÊNCIAS CONCRETAS DE UM ESTUDO — o que falta, uma a uma, com o registro de destino.
 *
 * Motor puro: não abre tela, não grava nada, não inventa dado. Entra o estudo,
 * sai uma lista de linhas que a tela pinta e o dedo alcança.
 *
 * QUATRO REGRAS GOVERNAM ESTE ARQUIVO:
 *
 * 1. PENDÊNCIA APONTA, NÃO BLOQUEIA. Ensaio real fecha com buraco às vezes — o
 *    que não pode é fechar sem ENXERGAR o buraco. Quem finaliza decide; este
 *    motor só garante que ninguém decide às cegas.
 *
 * 2. UMA LINHA POR REGISTRO, NUNCA UMA POR CÉLULA. Um estudo de 24 parcelas × 5
 *    avaliações tem 120 células; listá-las uma a uma seria a mesma coisa que não
 *    listar nada. A linha diz "2 parcelas sem leitura" e leva à PRIMEIRA delas.
 *
 * 3. TODA LINHA CARREGA O SEU ALVO. Lista que não se pode tocar é lista que
 *    ninguém lê: "aplicação sem horário" sem o caminho até aquela aplicação
 *    obriga a pessoa a procurar o que o app já sabe onde está.
 *
 * 4. A ORDEM É A DO FLUXO DO ESTUDO — protocolo, aplicação, avaliação, amostra —
 *    a mesma da trilha no alto da tela. Duas ordens diferentes para a mesma
 *    coisa fariam a pessoa reaprender a ler a cada tela.
 *
 * O NÚMERO DA PARCELA é o da randomização (`randomizacao.ordem[].parcela`), que
 * é o que está escrito na estaca. Sem randomização não há número de campo: a
 * linha sai com o código do tratamento, que é o que existe de verdade.
 */
(function(root,factory){
  var AV=(typeof module==='object'&&module.exports)?require('./avaliacao-core.js'):root.AvaliacaoCore;
  var api=factory(AV);
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PendenciasCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(AV){
  'use strict';

  function lista(a){ return Array.isArray(a)?a:[]; }
  function texto(v){ return String(v==null?'':v).trim(); }
  function plural(n,um,muitos){ return n+' '+(n===1?um:muitos); }

  /* O mapa da estaca: rowKey -> {numero, ordem}. `ordem` é a posição de caminhada
     no campo; sem randomização ela é a ordem dos tratamentos, que é como a grade
     da avaliação se apresenta. */
  function mapaParcelas(st){
    var reps=Math.max(1,parseInt(st&&st.numRepeticoes,10)||1);
    var mapa={}, i=0;
    var ordem=((st&&st.randomizacao)||{}).ordem;
    if(st&&st.randomizado&&Array.isArray(ordem)&&ordem.length){
      ordem.slice().sort(function(a,b){
        return (parseInt(a&&a.parcela,10)||0)-(parseInt(b&&b.parcela,10)||0);
      }).forEach(function(p){
        if(!p||!p.tratId)return;
        var k=String(p.tratId)+'R'+(parseInt(p.rep,10)||1);
        if(mapa[k])return;
        mapa[k]={numero:(parseInt(p.parcela,10)||null), campo:texto(p.campo), ordem:i++, tratId:p.tratId, rep:(parseInt(p.rep,10)||1)};
      });
    }
    lista(st&&st.tratamentos).forEach(function(t){
      if(!t||!t.id)return;
      for(var r=1;r<=reps;r++){
        var k=String(t.id)+'R'+r;
        if(!mapa[k]) mapa[k]={numero:null, campo:'', ordem:i++, tratId:t.id, rep:r};
      }
    });
    return mapa;
  }

  /* Como a parcela se chama numa frase. Número quando ele existe, código do
     tratamento quando não — nunca um número inventado para preencher a frase. */
  function nomeParcela(info){
    if(!info) return '';
    if(info.numero>0) return 'parcela '+info.numero;
    return 'parcela '+String(info.tratId)+' rep. '+info.rep;
  }

  /* As parcelas que ainda devem leitura nesta avaliação, na ordem de caminhada. */
  function parcelasPendentes(st,av,mapa){
    var src=AV.esquema(st,av), vars=lista(src.variaveis);
    if(!vars.length) return [];
    var out=[];
    AV.linhas(st).forEach(function(row){
      var p=AV.parcela(src,row,vars);
      if(p.state!=='done') out.push({key:row.key, estado:p.state, falta:p.pending, info:mapa[row.key]||null});
    });
    out.sort(function(a,b){
      var oa=(a.info&&a.info.ordem!=null)?a.info.ordem:1e9, ob=(b.info&&b.info.ordem!=null)?b.info.ordem:1e9;
      return oa-ob;
    });
    return out;
  }

  /* ============================ A LISTA ============================
     opts.lab               — quadra de laboratório (não se cobra cultura)
     opts.rotuloAvaliacao   — (av) -> "7 DAA"; sem ela, vale a data crua
     opts.rotuloData        — (iso) -> "12/09/2026"
     opts.testemunha        — id da testemunha marcada, quando o app já sabe
  */
  function listar(st,opts){
    opts=opts||{};
    st=st||{};
    var rotAv=opts.rotuloAvaliacao||function(av){ return texto(av&&av.data); };
    var rotData=opts.rotuloData||function(d){ return texto(d); };
    var mapa=mapaParcelas(st), out=[];
    function add(p){ out.push(p); }

    /* ---- 1. PROTOCOLO: o desenho antes do dado ---- */
    if(!opts.lab && !texto(opts.cultura)) add({
      tipo:'protocolo', chave:'cultura', texto:'Cultura não informada',
      detalhe:'O relatório e a fenologia saem sem a cultura do ensaio.',
      alvo:{tela:'protocolo'}
    });
    var trats=lista(st.tratamentos);
    if(trats.length<2) add({
      tipo:'protocolo', chave:'tratamentos', texto:'Menos de 2 tratamentos',
      detalhe:'Sem comparação não há ensaio: a estatística não tem o que comparar.',
      alvo:{tela:'protocolo'}
    });
    if(!texto(opts.testemunha)) add({
      tipo:'protocolo', chave:'testemunha', texto:'Testemunha de referência não definida',
      detalhe:'O % de controle é medido contra ela; sem marcação ele sai contra um tratamento.',
      alvo:{tela:'protocolo'}
    });
    var semDose=trats.filter(function(t){
      return t && !t.testemunha && t.id!==opts.testemunha && !texto(t.dose);
    });
    if(semDose.length) add({
      tipo:'protocolo', chave:'dose',
      texto:plural(semDose.length,'tratamento sem dose','tratamentos sem dose'),
      detalhe:semDose.map(function(t){ return texto(t.id); }).join(', '),
      alvo:{tela:'protocolo'}
    });

    /* ---- 2. APLICAÇÃO ---- */
    var previstas=Math.max(1,parseInt(st.numAplicacoes,10)||1), apls=lista(st.aplicacoes);
    if(apls.length<previstas) add({
      tipo:'aplicacao', chave:'faltam',
      texto:plural(previstas-apls.length,'aplicação não registrada','aplicações não registradas'),
      detalhe:apls.length+' de '+previstas+' registrada'+(previstas===1?'':'s'),
      alvo:{tela:'aplicacao', id:null}
    });
    apls.forEach(function(ap,i){
      if(!ap) return;
      /* A HORA NÃO É ENFEITE: é ela que escolhe a leitura da estação para o
         carimbo do clima. Sem hora, uma aplicação de ontem recebe a MÉDIA do dia
         — e a média de um dia de vento não descreve a hora em que se aplicou. */
      if(!texto(ap.hora)) add({
        tipo:'aplicacao', chave:'hora:'+texto(ap.id),
        texto:'Aplicação sem horário',
        detalhe:(rotData(ap.data)||('aplicação '+(i+1)))+' · o clima carimbado fica sendo a média do dia',
        alvo:{tela:'aplicacao', id:texto(ap.id)||null}
      });
      if(!texto(ap.data)) add({
        tipo:'aplicacao', chave:'data:'+texto(ap.id),
        texto:'Aplicação sem data',
        detalhe:'Sem data ela não entra na contagem de DAA nem na janela ambiental.',
        alvo:{tela:'aplicacao', id:texto(ap.id)||null}
      });
    });

    /* ---- 3. AVALIAÇÃO ---- */
    var avs=lista(st.avaliacoes);
    if(!avs.length) add({
      tipo:'avaliacao', chave:'nenhuma', texto:'Nenhuma avaliação cadastrada',
      detalhe:'Um estudo sem leitura não tem resultado para apresentar.',
      alvo:{tela:'avaliacao', id:null}
    });
    avs.forEach(function(av){
      if(!av) return;
      var rot=rotAv(av)||rotData(av.data), id=texto(av.id);
      var src=AV.esquema(st,av);
      if(!lista(src.variaveis).length){
        add({ tipo:'avaliacao', chave:'grade:'+id, texto:'Avaliação sem grade definida',
              detalhe:rot+' — nenhuma variável para medir.',
              alvo:{tela:'avaliacao', id:id||null} });
        return;
      }
      var pend=parcelasPendentes(st,av,mapa);
      if(!pend.length) return;
      var vazias=pend.filter(function(p){ return p.estado==='empty'; }).length;
      var primeira=pend[0];
      add({
        tipo:'avaliacao', chave:'parcelas:'+id,
        texto:plural(pend.length,'parcela sem avaliação','parcelas sem avaliação'),
        detalhe:rot+(vazias&&vazias!==pend.length?(' · '+vazias+' sem nenhum valor'):'')+
                (primeira.info?(' · a próxima é a '+nomeParcela(primeira.info).replace(/^parcela /,'')):''),
        alvo:{tela:'avaliacao', id:id||null, parcela:primeira.key,
              numero:(primeira.info&&primeira.info.numero)||null}
      });
    });

    /* ---- 4. AMOSTRA (fila do laboratório) ---- */
    lista(st.amostras).forEach(function(am,i){
      if(!am) return;
      var id=texto(am.id), quem=texto(am.codigo)||texto(am.matriz)||('amostra '+(i+1));
      /* Identificação é o que liga o vidro ao ensaio. Amostra sem matriz ou sem
         momento é um pote que chega ao laboratório sem dizer de onde veio. */
      if(!texto(am.matriz) || !texto(am.momento)) add({
        tipo:'amostra', chave:'ident:'+id, texto:'Amostra sem identificação',
        detalhe:quem+' — falta '+(!texto(am.matriz)?'a matriz':'')+
                ((!texto(am.matriz)&&!texto(am.momento))?' e ':'')+(!texto(am.momento)?'o momento':''),
        alvo:{tela:'amostra', id:id||null}
      });
      else if(!texto(am.entrada)) add({
        tipo:'amostra', chave:'entrada:'+id, texto:'Amostra sem data de entrada',
        detalhe:quem+' — o status da fila é derivado das datas; sem entrada ela não anda.',
        alvo:{tela:'amostra', id:id||null}
      });
    });

    return out;
  }

  /* ========================= CONTINUAR DE ONDE PAROU =========================
     A resposta para "onde eu estava?". Só existe quando há leitura COMEÇADA e não
     terminada — um estudo que nunca foi tocado não tem de onde retomar, e dizer
     que tem seria empurrar a pessoa para um lugar em que ela nunca esteve.

     Entre várias avaliações começadas, vale a mais recente pela data: é nela que
     a prancheta estava. */
  function retomada(st,opts){
    opts=opts||{};
    st=st||{};
    var rotAv=opts.rotuloAvaliacao||function(av){ return texto(av&&av.data); };
    var mapa=mapaParcelas(st), alvo=null;
    lista(st.avaliacoes).forEach(function(av){
      if(!av) return;
      var p=AV.avaliacao(st,av);
      if(!p.started || p.complete) return;
      var d=texto(av.data);
      if(!alvo || d>=alvo.data) alvo={av:av, data:d, prog:p};
    });
    if(!alvo) return null;
    var pend=parcelasPendentes(st,alvo.av,mapa);
    if(!pend.length) return null;
    var primeira=pend[0], nome=nomeParcela(primeira.info);
    var rot=rotAv(alvo.av);
    return {
      avId:texto(alvo.av.id)||null,
      parcela:primeira.key,
      numero:(primeira.info&&primeira.info.numero)||null,
      faltam:pend.length,
      rotulo:rot,
      texto:'Você parou na avaliação de '+rot,
      detalhe:'Faltam '+plural(pend.length,'parcela','parcelas')+' — a próxima é a '+nome.replace(/^parcela /,'')+'.',
      alvo:{tela:'avaliacao', id:texto(alvo.av.id)||null, parcela:primeira.key,
            numero:(primeira.info&&primeira.info.numero)||null}
    };
  }

  /* Contagem por família, para o botão dizer quantas são sem abrir a lista. */
  function resumo(st,opts){
    var c={total:0,protocolo:0,aplicacao:0,avaliacao:0,amostra:0};
    listar(st,opts).forEach(function(p){ c.total++; if(c[p.tipo]!=null)c[p.tipo]++; });
    return c;
  }

  return { listar:listar, retomada:retomada, resumo:resumo,
           mapaParcelas:mapaParcelas, nomeParcela:nomeParcela,
           parcelasPendentes:parcelasPendentes, VERSION:'1.0.0' };
});
