/* ============================================================================
   AgendaCore — o calendário da agenda e o painel do dia, sem tela
   ----------------------------------------------------------------------------
   A agenda era uma lista. Ela respondia "o que vem aí" na ordem do tempo, mas
   não respondia a pergunta que se faz olhando uma folhinha: "como está o meu
   mês?". Três avaliações na mesma semana, uma aplicação esquecida no dia 2, um
   fim de semana livre — tudo isso estava na lista e nada disso se via.

   Este motor monta o calendário: a grade do mês, o que cai em cada dia e as
   bolinhas de cada dia. E monta o resumo do painel HOJE com a mesma régua, para
   o número do painel e a bolinha do calendário nunca discordarem.

   Motor puro: entra uma lista de itens datados — {iso, tipo, feito} e o que
   mais o app quiser carregar junto — e a data de hoje. Não lê estudo, não abre
   tela, não grava. Quem decide o que é item é o app; aqui só se arruma.

   CINCO REGRAS

   1. DATA É TEXTO 'AAAA-MM-DD', NUNCA Date. A agenda conversa no fuso de
      operação (America/Sao_Paulo) e o aparelho pode estar em outro. Somar dias
      num Date local, no dia de troca de horário, pula ou repete um dia. Aqui a
      conta é feita em UTC sobre a data civil, que não tem hora para escorregar.
   2. A BOLINHA DIZ O QUE É, NÃO QUANTOS. Um dia com cinco avaliações tem uma
      bolinha de avaliação; quantas são, a lista do dia diz. Cinco bolinhas numa
      célula de 44 px viram mancha.
   3. ATRASADO É PENDENTE COM DATA PASSADA, e ele vence a cor do tipo: é a única
      coisa no calendário que pede ação por si só.
   4. FEITO TAMBÉM APARECE, apagado. O calendário é também o diário do que
      aconteceu — mas feito nunca conta como pendente nem entra em contagem de
      trabalho.
   5. A SEMANA COMEÇA NO DOMINGO, como na folhinha brasileira.
   ============================================================================ */
(function(raiz){
  'use strict';
  var VERSION='1.0.0';

  var MESES=['janeiro','fevereiro','março','abril','maio','junho','julho',
             'agosto','setembro','outubro','novembro','dezembro'];
  var DIAS=['domingo','segunda-feira','terça-feira','quarta-feira',
            'quinta-feira','sexta-feira','sábado'];
  var SIGLAS=['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  var INICIAIS=['D','S','T','Q','Q','S','S'];
  var TIPOS={apl:1, av:1};
  /* O que pede ação vem primeiro; o que já foi feito fecha a fila. */
  var ORDEM_PONTOS=['atrasado','apl','av','feito'];

  function dois(n){ return (n<10?'0':'')+n; }
  function iso(ano,mes,dia){ return ano+'-'+dois(mes)+'-'+dois(dia); }
  function diasNoMes(ano,mes){ return new Date(Date.UTC(ano,mes,0)).getUTCDate(); }

  /* Só aceita data que existe: '2026-02-30' não é "2 de março", é erro. */
  function partes(s){
    var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s==null?'':s));
    if(!m) return null;
    var ano=+m[1], mes=+m[2], dia=+m[3];
    if(mes<1 || mes>12 || dia<1 || dia>diasNoMes(ano,mes)) return null;
    return {ano:ano, mes:mes, dia:dia};
  }
  function valida(s){ return !!partes(s); }
  function _utc(p){ return Date.UTC(p.ano,p.mes-1,p.dia); }
  function _deUtc(t){
    var d=new Date(t);
    return iso(d.getUTCFullYear(), d.getUTCMonth()+1, d.getUTCDate());
  }
  function somaDias(s,n){
    var p=partes(s); if(!p) return null;
    return _deUtc(_utc(p)+Math.round(Number(n)||0)*864e5);
  }
  /* b − a, em dias inteiros. */
  function diasEntre(a,b){
    var pa=partes(a), pb=partes(b);
    if(!pa || !pb) return null;
    return Math.round((_utc(pb)-_utc(pa))/864e5);
  }
  /* 0 = domingo … 6 = sábado. */
  function diaDaSemana(s){
    var p=partes(s);
    return p?new Date(_utc(p)).getUTCDay():null;
  }
  function mesDe(s){ var p=partes(s); return p?{ano:p.ano, mes:p.mes}:null; }
  function mesVizinho(ano,mes,delta){
    var t=ano*12+(mes-1)+(Math.round(Number(delta)||0));
    return {ano:Math.floor(t/12), mes:((t%12)+12)%12+1};
  }
  function rotuloMes(ano,mes){ return (MESES[mes-1]||'')+' de '+ano; }
  /* "domingo, 4 de outubro". Sem Intl: o rótulo é o mesmo em qualquer aparelho. */
  function rotuloDia(s){
    var p=partes(s); if(!p) return '';
    return DIAS[diaDaSemana(s)]+', '+p.dia+' de '+MESES[p.mes-1];
  }

  /* A grade do mês: semanas de domingo a sábado, com os dias dos meses vizinhos
     completando a primeira e a última. Só as semanas necessárias — fevereiro que
     começa num domingo cabe em quatro; agosto de 2026 pede seis. */
  function grade(ano,mes,hoje){
    var primeiro=iso(ano,mes,1), ultimo=iso(ano,mes,diasNoMes(ano,mes));
    if(!valida(primeiro)) return {ano:ano, mes:mes, rotulo:'', semanas:[]};
    var cur=somaDias(primeiro,-diaDaSemana(primeiro));
    var fim=somaDias(ultimo,6-diaDaSemana(ultimo));
    var hj=valida(hoje)?hoje:null, semanas=[], sem=[];
    while(cur<=fim){
      var p=partes(cur);
      sem.push({iso:cur, dia:p.dia, doMes:(p.ano===ano && p.mes===mes),
                hoje:(cur===hj), passado:!!(hj && cur<hj)});
      if(sem.length===7){ semanas.push(sem); sem=[]; }
      cur=somaDias(cur,1);
    }
    return {ano:ano, mes:mes, rotulo:rotuloMes(ano,mes), semanas:semanas};
  }

  /* Em que pé está um item, visto de hoje. Item sem data válida não tem estado
     e fica de fora de tudo — melhor sumir do calendário do que cair num dia
     inventado. */
  function estado(item,hoje){
    if(!item || !valida(item.iso)) return null;
    if(item.feito) return 'feito';
    var hj=valida(hoje)?hoje:null;
    if(hj && item.iso<hj) return 'atrasado';
    if(item.iso===hj) return 'hoje';
    return 'futuro';
  }

  /* As bolinhas de um dia: uma por TIPO de coisa, nunca uma por item. */
  function pontos(itens,hoje){
    var tem={};
    (itens||[]).forEach(function(it){
      var e=estado(it,hoje);
      if(!e) return;
      if(e==='feito') tem.feito=1;
      else if(e==='atrasado') tem.atrasado=1;
      else if(TIPOS[it.tipo]) tem[it.tipo]=1;
    });
    return ORDEM_PONTOS.filter(function(k){ return tem[k]; });
  }

  /* Pendente antes de feito, e aplicação antes de avaliação — a ordem em que o
     dia de campo costuma acontecer. Empate fica na ordem em que o app mandou. */
  function _peso(it){ return it.feito?2:(it.tipo==='apl'?0:1); }

  /* O que cai em cada dia: {iso: {iso, itens, pendentes, atrasados, feitos, pontos}}. */
  function porDia(itens,hoje){
    var out={}, ordem=[];
    (itens||[]).forEach(function(it,i){
      var e=estado(it,hoje);
      if(!e) return;
      var d=out[it.iso];
      if(!d){ d=out[it.iso]={iso:it.iso, itens:[], pendentes:0, atrasados:0, feitos:0, pontos:[]}; ordem.push(d); }
      d.itens.push({it:it, i:i});
      if(e==='feito') d.feitos++;
      else { d.pendentes++; if(e==='atrasado') d.atrasados++; }
    });
    ordem.forEach(function(d){
      d.itens.sort(function(a,b){ return (_peso(a.it)-_peso(b.it)) || (a.i-b.i); });
      d.itens=d.itens.map(function(x){ return x.it; });
      d.pontos=pontos(d.itens,hoje);
    });
    return out;
  }

  /* Os atrasados, do mais antigo para o mais novo: o que trava é o mais velho. */
  function atrasados(itens,hoje){
    return (itens||[]).map(function(it,i){ return {it:it, i:i}; })
      .filter(function(x){ return estado(x.it,hoje)==='atrasado'; })
      .sort(function(a,b){ return (a.it.iso<b.it.iso?-1:(a.it.iso>b.it.iso?1:0)) || (a.i-b.i); })
      .map(function(x){ return x.it; });
  }

  /* O resumo do painel HOJE. `semana` são os pendentes dos próximos sete dias,
     sem contar hoje; `proximo` é o primeiro pendente depois de hoje — a resposta
     para "e quando é a próxima coisa?" quando hoje não tem nada. */
  function resumo(itens,hoje){
    var r={atrasados:0, hoje:0, amanha:0, semana:0, feitosHoje:0, proximo:null};
    var hj=valida(hoje)?hoje:null;
    if(!hj) return r;
    var amanha=somaDias(hj,1), limite=somaDias(hj,7);
    (itens||[]).forEach(function(it){
      var e=estado(it,hj);
      if(!e) return;
      if(e==='feito'){ if(it.iso===hj) r.feitosHoje++; return; }
      if(e==='atrasado'){ r.atrasados++; return; }
      if(e==='hoje'){ r.hoje++; return; }
      if(it.iso===amanha) r.amanha++;
      if(it.iso<=limite) r.semana++;
      if(!r.proximo || it.iso<r.proximo.iso) r.proximo=it;
    });
    return r;
  }

  /* A faixa da semana do painel HOJE: hoje e os dias seguintes, com as mesmas
     bolinhas do calendário. */
  function faixa(hoje,itens,n){
    var hj=valida(hoje)?hoje:null;
    if(!hj) return [];
    n=Math.max(1,Math.min(14,Math.round(Number(n)||7)));
    var dias=porDia(itens,hj), out=[];
    for(var i=0;i<n;i++){
      var d=somaDias(hj,i), info=dias[d];
      out.push({iso:d, dia:partes(d).dia, sigla:SIGLAS[diaDaSemana(d)], hoje:(i===0),
                pontos:info?info.pontos:[], pendentes:info?info.pendentes:0, feitos:info?info.feitos:0});
    }
    return out;
  }

  var API={VERSION:VERSION, valida:valida, partes:partes, somaDias:somaDias,
           diasEntre:diasEntre, diaDaSemana:diaDaSemana, diasNoMes:diasNoMes,
           mesDe:mesDe, mesVizinho:mesVizinho, rotuloMes:rotuloMes, rotuloDia:rotuloDia,
           grade:grade, estado:estado, pontos:pontos, porDia:porDia,
           atrasados:atrasados, resumo:resumo, faixa:faixa,
           INICIAIS:INICIAIS.slice(), SIGLAS:SIGLAS.slice()};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.AgendaCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
