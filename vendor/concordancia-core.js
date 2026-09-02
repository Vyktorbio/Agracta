/* Concordancia entre dois avaliadores — nucleo puro (sem DOM).
 *
 * POR QUE ISTO EXISTE
 *
 * Severidade de doenca, nota de fitotoxicidade, escala de dano: sao leituras
 * humanas, e leitura humana varia. Dois avaliadores olhando a mesma parcela dao
 * numeros diferentes — e a pergunta de um ensaio sob BPL nao e "qual dos dois esta
 * certo", e sim "o quanto eles concordam, e o que isso faz com o resultado".
 *
 * A DISTINCAO QUE ESTE MODULO EXISTE PARA GUARDAR
 *
 * CORRELACAO NAO E CONCORDANCIA. Se o avaliador B le sempre o DOBRO do que A le, a
 * correlacao de Pearson entre eles e 1,000 — perfeita — e a concordancia e pessima.
 * Um mede o quanto os dois sobem juntos; o outro, o quanto dizem o MESMO numero.
 * Reportar so o r e o jeito classico de declarar concordancia excelente onde nao
 * existe nenhuma, e por isso aqui os dois saem sempre lado a lado.
 *
 * O QUE SE USA PARA QUE
 *
 *   ICC(2,1)      — concordancia absoluta, para escala continua (severidade em %,
 *                   contagem, razao). E a medida certa quando o numero importa.
 *   Bland-Altman  — vies (a diferenca media entre A e B) e os limites dentro dos
 *                   quais 95% das diferencas caem. Diz em UNIDADE DA VARIAVEL o
 *                   tamanho da discordancia, que e o que se leva para a discussao.
 *   Kappa         — para escala ORDINAL (nota de classe 0..n). Ponderado, porque
 *                   errar de 0 para 1 nao e o mesmo que errar de 0 para 5, e o
 *                   kappa simples trata os dois como o mesmo erro.
 *   Pearson       — associacao. Vai junto para poder ser CONTRASTADO com o ICC.
 *
 * Kappa em severidade continua nao significa nada, e ICC em nota ordinal de tres
 * classes significa pouco. Por isso a escala e DECLARADA, nao adivinhada: o app
 * a deriva do tipo da variavel, que ele ja conhece.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.ConcordanciaCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  var VERSION="1.0.0";

  /* Numero de verdade, ou null. String vazia e "nao avaliei", nao zero — e zero em
     severidade e uma LEITURA (parcela sadia), entao os dois nao podem se confundir. */
  function num(v){
    if(v===''||v==null) return null;
    var n=(typeof v==='number')?v:Number(String(v).replace(',','.'));
    return isFinite(n)?n:null;
  }

  /* Pares completos. Parcela que so um dos dois avaliou nao entra: comparar A com o
     nada de B inventaria concordancia onde nao houve segunda leitura. O descarte vai
     CONTADO, para a tela poder dizer quantas parcelas ficaram de fora. */
  function pares(mapaA, mapaB, chaves){
    var out=[], soA=0, soB=0, vazias=0;
    (chaves||[]).forEach(function(k){
      var a=num(mapaA?mapaA[k]:null), b=num(mapaB?mapaB[k]:null);
      if(a!=null&&b!=null) out.push({chave:k, a:a, b:b});
      else if(a!=null) soA++;
      else if(b!=null) soB++;
      else vazias++;
    });
    return {pares:out, n:out.length, soA:soA, soB:soB, vazias:vazias};
  }

  function media(v){ return v.length?v.reduce(function(s,x){return s+x;},0)/v.length:null; }

  /* Desvio-padrao AMOSTRAL (n-1). Os avaliadores medidos sao uma amostra do que
     qualquer avaliador faria, nao a populacao inteira. */
  function dp(v){
    if(v.length<2) return null;
    var m=media(v);
    return Math.sqrt(v.reduce(function(s,x){ return s+(x-m)*(x-m); },0)/(v.length-1));
  }

  /* Vies e limites de concordancia (Bland-Altman). O numero que se leva para a
     discussao: "B le em media 1,0 ponto a menos que A, e 95% das leituras caem entre
     -4,9 e +2,9". Isso um ICC de 0,98 nao conta. */
  function diferencaMedia(ps){
    if(!ps || ps.length<2) return null;
    var d=ps.map(function(p){ return p.a-p.b; });
    var m=media(d), s=dp(d);
    return {
      n:ps.length, media:m, dp:s,
      /* 1,96 desvios: a faixa em que caem 95% das diferencas, se elas forem normais. */
      limiteInferior:(s==null?null:m-1.96*s),
      limiteSuperior:(s==null?null:m+1.96*s),
      maiorDiferenca:d.reduce(function(mx,x){ return Math.abs(x)>Math.abs(mx)?x:mx; }, 0)
    };
  }

  /* Pearson: quanto os dois sobem juntos. NAO diz se dizem o mesmo numero. */
  function pearson(ps){
    if(!ps || ps.length<3) return null;
    var a=ps.map(function(p){return p.a;}), b=ps.map(function(p){return p.b;});
    var ma=media(a), mb=media(b), sab=0, sa=0, sb=0;
    for(var i=0;i<ps.length;i++){
      var da=a[i]-ma, db=b[i]-mb;
      sab+=da*db; sa+=da*da; sb+=db*db;
    }
    if(sa<=0||sb<=0) return null;   /* um dos dois nao variou: r indefinido */
    return sab/Math.sqrt(sa*sb);
  }

  /* ICC(2,1) — duas vias, efeitos aleatorios, CONCORDANCIA ABSOLUTA, medida unica.
     E a forma certa para dois avaliadores fixos lendo as mesmas parcelas quando o
     valor absoluto importa. A forma de "consistencia" ignoraria um vies sistematico,
     que e exatamente o que se quer enxergar.

       ICC = (MSR - MSE) / (MSR + (k-1)*MSE + k*(MSC - MSE)/n) */
  function icc(ps){
    var n=ps?ps.length:0, k=2;
    if(n<3) return null;              /* abaixo disso o numero nao significa nada */
    var todos=[];
    ps.forEach(function(p){ todos.push(p.a, p.b); });
    var g=media(todos);
    var SST=todos.reduce(function(s,x){ return s+(x-g)*(x-g); },0);
    var SSR=0;
    ps.forEach(function(p){ var rm=(p.a+p.b)/2; SSR+=(rm-g)*(rm-g); });
    SSR*=k;
    var mA=media(ps.map(function(p){return p.a;})), mB=media(ps.map(function(p){return p.b;}));
    var SSC=n*((mA-g)*(mA-g)+(mB-g)*(mB-g));
    var SSE=SST-SSR-SSC;
    var MSR=SSR/(n-1), MSC=SSC/(k-1), MSE=SSE/((n-1)*(k-1));
    var den=MSR+(k-1)*MSE+k*(MSC-MSE)/n;
    if(!(Math.abs(den)>1e-12)) return null;
    var v=(MSR-MSE)/den;
    /* ICC negativo e ruido de estimacao, nao "concordancia negativa": vira 0. */
    if(v<0) v=0;
    if(v>1) v=1;
    return v;
  }

  /* Kappa de Cohen, ponderado. Para escala ORDINAL.
     `pesos`: 'linear' (padrao), 'quadratico' ou 'nenhum'.
     Errar de 0 para 1 nao e o mesmo que errar de 0 para 5 — o kappa simples trata
     os dois como o mesmo erro, e por isso o padrao aqui e o ponderado. */
  function kappa(ps, pesos){
    if(!ps || ps.length<3) return null;
    var niveis=[];
    ps.forEach(function(p){
      [p.a,p.b].forEach(function(v){ if(niveis.indexOf(v)<0) niveis.push(v); });
    });
    niveis.sort(function(x,y){ return x-y; });
    var k=niveis.length;
    if(k<2) return null;             /* todos deram a mesma nota: kappa indefinido */
    var idx={}; niveis.forEach(function(v,i){ idx[v]=i; });
    var O=[], i, j;
    for(i=0;i<k;i++){ O.push([]); for(j=0;j<k;j++) O[i].push(0); }
    ps.forEach(function(p){ O[idx[p.a]][idx[p.b]]++; });
    var n=ps.length, linha=[], coluna=[];
    for(i=0;i<k;i++){ linha.push(0); coluna.push(0); }
    for(i=0;i<k;i++) for(j=0;j<k;j++){ linha[i]+=O[i][j]; coluna[j]+=O[i][j]; }

    function peso(a,b){
      if(pesos==='nenhum') return (a===b)?0:1;
      var d=Math.abs(a-b)/(k-1);
      return (pesos==='quadratico')?(d*d):d;
    }
    var somaO=0, somaE=0;
    for(i=0;i<k;i++) for(j=0;j<k;j++){
      var w=peso(i,j);
      somaO+=w*O[i][j];
      somaE+=w*(linha[i]*coluna[j]/n);
    }
    if(!(somaE>1e-12)) return null;   /* concordancia esperada nula: kappa indefinido */
    return 1-(somaO/somaE);
  }

  /* Leitura em portugues. Faixas de Landis & Koch para kappa, e as mesmas ordens de
     grandeza para o ICC — sao convencao de literatura, nao lei, e por isso a frase
     diz "considerada" em vez de afirmar. */
  function _faixa(v){
    if(v==null) return null;
    if(v<0.20) return 'ruim';
    if(v<0.40) return 'sofrível';
    if(v<0.60) return 'moderada';
    if(v<0.80) return 'substancial';
    return 'quase perfeita';
  }

  /* O relatorio inteiro. `escala`: 'ordinal' para nota de classe, 'continua' para
     severidade em %, contagem e razao. Declarada, nao adivinhada. */
  function concordancia(mapaA, mapaB, chaves, opts){
    opts=opts||{};
    var pr=pares(mapaA, mapaB, chaves);
    var ps=pr.pares;
    var ordinal=(opts.escala==='ordinal');
    var out={
      motor:'ConcordanciaCore', motorVersao:VERSION,
      escala:(ordinal?'ordinal':'continua'),
      n:pr.n, soA:pr.soA, soB:pr.soB, vazias:pr.vazias,
      icc:null, kappa:null, kappaPesos:null, pearson:null, diferenca:null,
      leitura:[], avisos:[]
    };

    /* Menos de tres pares nao rende medida de concordancia nenhuma. Emitir um numero
       aqui seria pior que nao emitir: ele teria a mesma cara de um numero bom. */
    if(pr.n<3){
      out.avisos.push('Só '+pr.n+' parcela(s) com as duas leituras. Concordância precisa de pelo menos 3 — nenhuma medida foi calculada.');
      if(pr.soA||pr.soB) out.avisos.push('Faltou a segunda leitura em '+(pr.soA+pr.soB)+' parcela(s).');
      return out;
    }
    if(pr.soA||pr.soB){
      out.avisos.push(pr.soA+pr.soB+' parcela(s) com uma leitura só ficaram de fora do cálculo.');
    }

    out.pearson=pearson(ps);
    out.diferenca=diferencaMedia(ps);
    if(ordinal){
      out.kappaPesos=(opts.pesos||'linear');
      out.kappa=kappa(ps, out.kappaPesos);
      /* ICC vai junto na ordinal porque a nota de classe vira indice depois; mas a
         medida que manda ali e o kappa. */
      out.icc=icc(ps);
      out.principal='kappa';
    }else{
      out.icc=icc(ps);
      out.principal='icc';
    }

    var v=(out.principal==='kappa')?out.kappa:out.icc;
    var f=_faixa(v);
    if(v!=null) out.leitura.push('Concordância '+(f||'—')+' ('+(out.principal==='kappa'?'kappa ponderado':'ICC')+' = '+v.toFixed(3).replace('.',',')+').');

    /* A LINHA QUE ESTE MODULO EXISTE PARA ESCREVER. Um r alto com ICC baixo e o caso
       classico de vies sistematico: os dois sobem juntos e nao dizem o mesmo numero. */
    if(out.pearson!=null && out.icc!=null && (out.pearson-out.icc)>0.10){
      out.avisos.push('Os avaliadores variam JUNTOS (r = '+out.pearson.toFixed(3).replace('.',',')+
        ') mas não dizem o mesmo número (ICC = '+out.icc.toFixed(3).replace('.',',')+
        '). É viés sistemático: um lê consistentemente acima do outro. Correlação alta aqui não é concordância.');
    }
    if(out.diferenca && out.diferenca.media!=null){
      var d=out.diferenca;
      out.leitura.push('B lê em média '+Math.abs(d.media).toFixed(2).replace('.',',')+
        (d.media<0?' acima':' abaixo')+' de A; 95% das diferenças entre '+
        d.limiteInferior.toFixed(2).replace('.',',')+' e '+d.limiteSuperior.toFixed(2).replace('.',',')+'.');
    }
    return out;
  }

  return {
    VERSION:VERSION,
    num:num, pares:pares, media:media, dp:dp,
    diferencaMedia:diferencaMedia, pearson:pearson, icc:icc, kappa:kappa,
    concordancia:concordancia
  };
});
