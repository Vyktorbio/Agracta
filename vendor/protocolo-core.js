/* ============================================================================
   ProtocoloCore — o app passa a ter opinião sobre o DESENHO do ensaio
   ----------------------------------------------------------------------------
   Até aqui o Agracta conferia a execução: se a conta da calda fecha, se a baixa
   do lote bate, se o registro tem carimbo. Sobre o desenho — se o conjunto de
   tratamentos responde à pergunta que o ensaio faz — ele não tinha nada a dizer.

   E é ali que o erro custa mais caro. Uma calda mal calculada se refaz no mesmo
   dia; um braço que faltou no delineamento só aparece na hora de analisar, com a
   safra já colhida.

   O caso que originou este motor: um ensaio de sinergista testava o adjuvante
   sozinho em duas doses, 0,033% e 0,2%, e misturava com o produto SÓ na dose
   baixa. Pode ser proposital. Mas ninguém tinha perguntado — e a folha não
   perguntava.

   TRÊS REGRAS QUE ESTE MOTOR SEGUE

   1. APONTA, NÃO BLOQUEIA, e nunca corrige. Ensaio experimental existe para sair
      do padrão; um verificador que impedisse desenhos incomuns seria pior que
      nenhum. A saída é lista, não veto.
   2. SEVERIDADE SEPARA O QUE QUASE SEMPRE É ERRO ('conferir' — ensaio sem
      testemunha, dois tratamentos idênticos) DO QUE É PERGUNTA LEGÍTIMA ('nota' —
      um braço de mistura que não existe). Misturar os dois faria a lista virar
      ruído, e lista ruidosa ninguém lê.
   3. NÃO ADIVINHA RECEITA. Quando o tratamento é texto livre e o número de
      produtos não bate com o de doses, o motor NÃO tenta parear: ele deixa aquele
      tratamento de fora das checagens por componente. Um pareamento errado
      geraria achado falso, e achado falso mata a confiança na ferramenta inteira.

   Sem DOM, sem armazenamento, sem rede.
   ========================================================================== */
(function(raiz){
  'use strict';

  var VERSION='1.0.0';

  function norm(s){
    return String(s==null?'':s).trim().toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g,'')
      .replace(/\s+/g,' ');
  }
  function num(v){
    if(v===''||v==null) return null;
    var s=String(v).replace(',','.').match(/-?\d+(?:\.\d+)?/);
    if(!s) return null;
    var n=Number(s[0]);
    return isFinite(n)?n:null;
  }
  /* Família da unidade: comparar 1,5 L/ha com 1,5 % v/v seria comparar coisas
     diferentes escritas parecido. */
  function familia(u){
    var s=norm(u).replace(/\s/g,'');
    if(s.indexOf('%')>=0) return 'concentracao';
    if(/(l|ml|g|kg)\/ha/.test(s)) return 'area';
    if(/ppm|mg\/l|g\/l|ml\/l/.test(s)) return 'concentracao';
    return s?'outra':'';
  }
  function unidadeDe(txt){
    var s=String(txt==null?'':txt).trim();
    var m=s.match(/(%\s*v\/v|%|[a-zA-Z]+\s*\/\s*[a-zA-Z]+|ppm)/);
    return m?m[0].replace(/\s+/g,''):'';
  }

  /* A receita de um tratamento, normalizada. `componentes` estruturados mandam;
     texto livre é partido em " + " e SÓ é aceito quando produto e dose têm o
     mesmo número de partes. */
  function receitaDe(t){
    if(!t) return null;
    var cs=(t.componentes&&t.componentes.length)?t.componentes:null;
    if(cs) return cs.map(function(c){
      return {nome:String(c.nome||'').trim(), chave:norm(c.nome),
              valor:num(c.valor), unidade:String(c.unidade||'').trim()};
    }).filter(function(c){ return c.chave; });

    var ps=String(t.produto||'').split(/\s\+\s/).map(function(x){ return x.trim(); }).filter(Boolean);
    var ds=String(t.dose||'').split(/\s\+\s/).map(function(x){ return x.trim(); }).filter(Boolean);
    if(!ps.length) return [];
    if(ps.length>1 && ps.length!==ds.length) return null;   /* não parear às cegas */
    return ps.map(function(p,i){
      var d=(ds.length===ps.length)?ds[i]:(ds[0]||'');
      return {nome:p, chave:norm(p), valor:num(d), unidade:unidadeDe(d)};
    });
  }

  function ehTestemunha(study, t){
    if(!t) return false;
    if(t.testemunha) return true;
    return !!(study && study.testemunha && study.testemunha===t.id &&
              (study.tratamentos||[]).some(function(x){ return x.id===t.id && x.testemunha; }));
  }
  function temTestemunha(study){
    return (study&&study.tratamentos||[]).some(function(t){ return t&&t.testemunha; });
  }
  function doseRotulo(c){
    if(!c) return '';
    var v=(c.valor==null)?'':String(c.valor).replace('.',',');
    return (v+(c.unidade?(' '+c.unidade):'')).trim();
  }

  function verificar(study){
    var out=[];
    if(!study || !Array.isArray(study.tratamentos) || !study.tratamentos.length) return out;
    var trats=study.tratamentos.filter(function(t){ return t && t.id; });
    if(!trats.length) return out;

    function achado(codigo, severidade, texto, ids){
      out.push({codigo:codigo, severidade:severidade, texto:texto, tratamentos:(ids||[])});
    }

    /* ---- 1. Sem testemunha ------------------------------------------------
       Sem o zero não há % de controle, e sem % de controle o ensaio não compara
       com nada. */
    if(!temTestemunha(study))
      achado('sem-testemunha','conferir',
        'Nenhum tratamento está marcado como testemunha. Sem ela não há base para o % de controle.',[]);

    /* ---- 2. Replicação ----------------------------------------------------- */
    var reps=Math.max(1, parseInt(study.numRepeticoes,10)||1);
    if(reps<2)
      achado('sem-replicacao','conferir',
        'O estudo tem '+reps+' repetição: sem repetir não há como separar efeito de variação do campo.',[]);

    /* ---- 3. Tratamento sem dose -------------------------------------------- */
    trats.forEach(function(t){
      if(ehTestemunha(study,t)) return;
      var r=receitaDe(t);
      if(r===null) return;                  /* receita ambígua: não se opina */
      var temDose=r.some(function(c){ return c.valor!=null && c.valor>0; });
      if(!r.length || !temDose)
        achado('tratamento-sem-dose','conferir',
          'O tratamento '+t.id+' não tem dose declarada e não está marcado como testemunha.',[t.id]);
    });

    /* ---- 3-bis. Testemunha COM produto e dose ------------------------------
       A testemunha e o zero do ensaio: e contra ela que o % de controle se
       calcula. Uma testemunha que carrega produto nao e zero de nada, e o % de
       controle sai medido contra um tratamento — numero que parece resultado e
       nao e. Ou a marca esta errada, ou o produto esta no lugar errado. */
    trats.forEach(function(t){
      if(!ehTestemunha(study,t)) return;
      var r=receitaDe(t);
      if(r===null || !r.length) return;
      var comDose=r.filter(function(c){ return c.valor!=null && c.valor>0; });
      if(comDose.length)
        achado('testemunha-com-produto','conferir',
          'O tratamento '+t.id+' está marcado como testemunha, mas tem produto e dose ('+
          comDose.map(function(c){ return c.nome+' '+doseRotulo(c); }).join(' + ')+
          '). O % de controle sai medido contra ele.',[t.id]);
    });

    /* ---- 4. Tratamentos idênticos ------------------------------------------
       Dois braços com a mesma receita não são dois braços: são um, digitado
       duas vezes — e a estatística os trata como se fossem diferentes. */
    var porAssinatura={};
    trats.forEach(function(t){
      if(ehTestemunha(study,t)) return;
      var r=receitaDe(t);
      if(r===null || !r.length) return;
      var ass=r.map(function(c){ return c.chave+'|'+(c.valor==null?'':c.valor)+'|'+norm(c.unidade); }).sort().join(' + ');
      (porAssinatura[ass]=porAssinatura[ass]||[]).push(t.id);
    });
    Object.keys(porAssinatura).forEach(function(a){
      var ids=porAssinatura[a];
      if(ids.length>1)
        achado('tratamentos-iguais','conferir',
          'Os tratamentos '+ids.join(', ')+' têm exatamente a mesma receita e dose.',ids);
    });

    /* ---- Índice de onde cada item aparece, sozinho e em mistura ------------ */
    var solo={}, mistura={}, nomes={};
    trats.forEach(function(t){
      if(ehTestemunha(study,t)) return;
      var r=receitaDe(t);
      if(r===null || !r.length) return;
      var alvo=(r.length===1)?solo:mistura;
      r.forEach(function(c){
        nomes[c.chave]=c.nome;
        var m=alvo[c.chave]=alvo[c.chave]||{};
        (m[doseRotulo(c)]=m[doseRotulo(c)]||[]).push(t.id);
      });
    });

    /* ---- 5. Componente de mistura que nunca é testado sozinho --------------
       Sem o braço solo não dá para dizer se o efeito da mistura é do produto, do
       adjuvante, ou dos dois. */
    Object.keys(mistura).forEach(function(k){
      if(solo[k]) return;
      var ids=[];
      Object.keys(mistura[k]).forEach(function(d){ ids=ids.concat(mistura[k][d]); });
      achado('mistura-sem-solo','nota',
        '"'+nomes[k]+'" só aparece em mistura ('+ids.join(', ')+'), nunca sozinho — '+
        'o efeito dele não poderá ser separado do parceiro.',ids);
    });

    /* ---- 6. Dose testada sozinha que nunca entra em mistura ----------------
       ESTE É O CASO QUE ORIGINOU O MOTOR. Testar o adjuvante sozinho a 0,033% e
       0,2%, e misturar só a 0,033%, deixa metade da pergunta sem braço. Só vale
       quando o item TEM outras doses que entram na mistura — senão dispararia em
       todo produto de dose única. */
    Object.keys(solo).forEach(function(k){
      if(!mistura[k]) return;
      var dosesSolo=Object.keys(solo[k]), dosesMix=Object.keys(mistura[k]);
      if(dosesSolo.length<2) return;
      var faltando=dosesSolo.filter(function(d){ return dosesMix.indexOf(d)<0; });
      if(!faltando.length || faltando.length===dosesSolo.length) return;
      var ids=[]; faltando.forEach(function(d){ ids=ids.concat(solo[k][d]); });
      achado('dose-solo-sem-mistura','nota',
        '"'+nomes[k]+'" é testado sozinho em '+dosesSolo.length+' doses ('+dosesSolo.join(' e ')+
        '), mas só '+dosesMix.join(' e ')+' aparece em mistura — não há braço de mistura em '+
        faltando.join(' e ')+'.',ids);
    });

    /* ---- 7. O mesmo item em famílias de unidade diferentes ------------------
       1,5 L/ha e 1,5 % v/v se escrevem parecido e não são comparáveis sem o
       volume de calda. Entre braços do mesmo ensaio, isso impede a leitura. */
    var fam={};
    trats.forEach(function(t){
      var r=receitaDe(t);
      if(r===null) return;
      r.forEach(function(c){
        var f=familia(c.unidade);
        if(!f||f==='outra') return;
        (fam[c.chave]=fam[c.chave]||{})[f]=true;
        nomes[c.chave]=nomes[c.chave]||c.nome;
      });
    });
    Object.keys(fam).forEach(function(k){
      if(Object.keys(fam[k]).length>1)
        achado('unidades-misturadas','nota',
          '"'+nomes[k]+'" aparece com dose por área em um tratamento e por concentração em outro — '+
          'as duas só se comparam depois de fixado o volume de calda.',[]);
    });

    return out;
  }

  function resumo(achados){
    if(!achados||!achados.length) return '';
    var c=achados.filter(function(a){ return a.severidade==='conferir'; }).length;
    return achados.length+' ponto(s)'+(c?(' · '+c+' a conferir'):'');
  }

  var API={VERSION:VERSION, verificar:verificar, resumo:resumo, receitaDe:receitaDe};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.ProtocoloCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
