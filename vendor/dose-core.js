/* Motor universal de doses — nucleo puro (sem DOM).
 *
 * POR QUE ELE EXISTE
 *
 * O Agracta atende drone, sider, costal, atomizador, Torre de Potter e bioensaio em
 * placa. "L/ha" nao cobre isso. Uma dose pode ser escrita por AREA (L/ha), por
 * CONCENTRACAO NA CALDA (mL/L, % v/v, ppm) ou por UNIDADE-ALVO (por planta, por
 * placa, por vaso) — e as tres respondem perguntas diferentes.
 *
 * A REGRA QUE ESTE MODULO EXISTE PARA GUARDAR
 *
 * DENTRO DA MESMA FAMILIA, converter e aritmetica: 1 L/ha = 1000 mL/ha, 1% v/v =
 * 10 mL/L. ENTRE FAMILIAS, nao e. Passar de mL/L para L/ha exige saber a VAZAO —
 * quantos litros de calda por hectare —, e passar de "por planta" para "por hectare"
 * exige a POPULACAO. Sem esses numeros a conversao nao e dificil: e impossivel.
 *
 * Entao ela e RECUSADA, com o nome do que falta. Um app que converte assim mesmo,
 * chutando 200 L/ha porque e comum, produz uma dose errada com cara de dose certa —
 * e ninguem confere o que ja veio calculado.
 *
 * EQUIVALENTE EM INGREDIENTE ATIVO
 *
 * Duas formulacoes a 1 L/ha nao sao a mesma dose se uma tem 250 g/L e a outra 500.
 * Comparar ensaios pelo produto formulado, sem olhar o i.a., e comparar rotulos.
 * O modulo calcula o equivalente — e RECUSA quando a fase nao bate: concentracao em
 * g/L descreve liquido, e uma dose em kg/ha e solida. Casar as duas sem densidade
 * daria um numero plausivel e falso.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.DoseCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  var VERSION="1.0.0";

  /* familia: 'area' | 'calda' | 'alvo'
     base:    unidade canonica da familia, para comparar sem converter duas vezes
     fase:    'liquido' | 'solido' — o que casa com a concentracao do produto
     Fatores conferidos a mao:
       1 L      = 1000 mL
       1 kg     = 1000 g
       1% v/v   = 1 mL em 100 mL = 10 mL/L
       1% m/v   = 1 g em 100 mL  = 10 g/L
       1 ppm    = 1 mg/L (agua, densidade 1 — e a convencao de bancada) */
  var UNIDADES={
    'L/ha':      {familia:'area',  base:'mL/ha', fator:1000, fase:'liquido', rotulo:'litros por hectare'},
    'mL/ha':     {familia:'area',  base:'mL/ha', fator:1,    fase:'liquido', rotulo:'mililitros por hectare'},
    'kg/ha':     {familia:'area',  base:'g/ha',  fator:1000, fase:'solido',  rotulo:'quilos por hectare'},
    'g/ha':      {familia:'area',  base:'g/ha',  fator:1,    fase:'solido',  rotulo:'gramas por hectare'},

    'mL/L':      {familia:'calda', base:'mL/L',  fator:1,    fase:'liquido', rotulo:'mililitros por litro de calda'},
    '% v/v':     {familia:'calda', base:'mL/L',  fator:10,   fase:'liquido', rotulo:'por cento volume/volume'},
    'g/L':       {familia:'calda', base:'mg/L',  fator:1000, fase:'solido',  rotulo:'gramas por litro de calda'},
    '% m/v':     {familia:'calda', base:'mg/L',  fator:10000,fase:'solido',  rotulo:'por cento massa/volume'},
    'mg/L':      {familia:'calda', base:'mg/L',  fator:1,    fase:'solido',  rotulo:'miligramas por litro'},
    'ppm':       {familia:'calda', base:'mg/L',  fator:1,    fase:'solido',  rotulo:'partes por milhao'},

    'mL/planta': {familia:'alvo',  base:'mL/alvo', fator:1,   fase:'liquido', alvo:'planta', rotulo:'mililitros por planta'},
    'g/planta':  {familia:'alvo',  base:'mg/alvo', fator:1000,fase:'solido',  alvo:'planta', rotulo:'gramas por planta'},
    'mL/parcela':{familia:'alvo',  base:'mL/alvo', fator:1,   fase:'liquido', alvo:'parcela',rotulo:'mililitros por parcela'},
    'mL/placa':  {familia:'alvo',  base:'mL/alvo', fator:1,   fase:'liquido', alvo:'placa',  rotulo:'mililitros por placa'},
    'uL/placa':  {familia:'alvo',  base:'mL/alvo', fator:0.001,fase:'liquido',alvo:'placa',  rotulo:'microlitros por placa'},
    'mL/vaso':   {familia:'alvo',  base:'mL/alvo', fator:1,   fase:'liquido', alvo:'vaso',   rotulo:'mililitros por vaso'},
    'g/kg semente':{familia:'alvo',base:'mg/alvo', fator:1000,fase:'solido',  alvo:'kg de semente', rotulo:'gramas por quilo de semente'}
  };

  /* % m/m fica de FORA do catalogo de propósito. Ela e fracao de massa da MISTURA:
     converter para g/L exige a densidade da calda, que ninguem informa na pratica, e
     aceita-la sem densidade seria oferecer uma conversao que nao existe. Quem precisa
     dela escreve % m/v, que e o que a bancada usa de verdade. */

  function unidades(){ return Object.keys(UNIDADES); }
  function unidade(u){ return UNIDADES[u]||null; }
  function familia(u){ var d=UNIDADES[u]; return d?d.familia:null; }
  function fase(u){ var d=UNIDADES[u]; return d?d.fase:null; }
  function rotulo(u){ var d=UNIDADES[u]; return d?d.rotulo:String(u||''); }
  function unidadesDaFamilia(f){ return unidades().filter(function(u){ return UNIDADES[u].familia===f; }); }

  function num(v){
    if(v===''||v==null) return null;
    var n=(typeof v==='number')?v:Number(String(v).replace(',','.'));
    return isFinite(n)?n:null;
  }

  /* Valor na unidade canonica da familia. E o que permite comparar 1 L/ha com
     800 mL/ha sem converter duas vezes e acumular arredondamento. */
  function canonico(valor, u){
    var d=UNIDADES[u], v=num(valor);
    if(!d||v==null) return null;
    return {valor:v*d.fator, unidade:d.base, familia:d.familia, fase:d.fase};
  }

  /* Conversao DENTRO da familia. Fora dela, ver converterComContexto. */
  function converter(valor, de, para){
    var a=UNIDADES[de], b=UNIDADES[para], v=num(valor);
    if(!a||!b) return {erro:'Unidade desconhecida.'};
    if(v==null) return {erro:'Dose não informada.'};
    if(a.familia!==b.familia)
      return {erro:'"'+de+'" e "'+para+'" medem coisas diferentes ('+a.familia+' e '+b.familia+'). Use converterComContexto.'};
    if(a.base!==b.base)
      return {erro:'"'+de+'" descreve '+a.fase+' e "'+para+'" descreve '+b.fase+'. Converter exigiria a densidade.'};
    return {valor:v*a.fator/b.fator, unidade:para};
  }

  /* Conversao ENTRE familias. Só acontece com o número que falta em mãos:
       calda -> area  precisa da VAZAO (L de calda por ha)
       alvo  -> area  precisa de quantos ALVOS por ha (população, parcelas/ha…)
     Sem ele, recusa dizendo o nome do que falta. Chutar 200 L/ha porque é comum
     produziria uma dose errada com cara de dose certa. */
  function converterComContexto(valor, de, para, ctx){
    ctx=ctx||{};
    var a=UNIDADES[de], b=UNIDADES[para], v=num(valor);
    if(!a||!b) return {erro:'Unidade desconhecida.'};
    if(v==null) return {erro:'Dose não informada.'};
    if(a.familia===b.familia) return converter(valor, de, para);

    var vazao=num(ctx.vazaoLHa), porHa=num(ctx.alvosPorHa);

    if(a.familia==='calda' && b.familia==='area'){
      if(!(vazao>0)) return {erro:'Para passar de concentração na calda para dose por área é preciso a vazão (L de calda por hectare).', falta:'vazaoLHa'};
      /* mL/L x L/ha = mL/ha ; mg/L x L/ha = mg/ha -> g/ha */
      var c=canonico(v, de);
      var emHa=(c.unidade==='mL/L') ? {valor:c.valor*vazao, unidade:'mL/ha'}
                                    : {valor:c.valor*vazao/1000, unidade:'g/ha'};
      if(UNIDADES[para].base!==emHa.unidade)
        return {erro:'"'+de+'" descreve '+a.fase+' e "'+para+'" descreve '+b.fase+'.'};
      return {valor:emHa.valor/UNIDADES[para].fator, unidade:para, usou:{vazaoLHa:vazao}};
    }
    if(a.familia==='area' && b.familia==='calda'){
      if(!(vazao>0)) return {erro:'Para passar de dose por área para concentração na calda é preciso a vazão (L de calda por hectare).', falta:'vazaoLHa'};
      var ca=canonico(v, de);
      var emCalda=(ca.unidade==='mL/ha') ? {valor:ca.valor/vazao, unidade:'mL/L'}
                                         : {valor:ca.valor*1000/vazao, unidade:'mg/L'};
      if(UNIDADES[para].base!==emCalda.unidade)
        return {erro:'"'+de+'" descreve '+a.fase+' e "'+para+'" descreve '+b.fase+'.'};
      return {valor:emCalda.valor/UNIDADES[para].fator, unidade:para, usou:{vazaoLHa:vazao}};
    }
    if(a.familia==='alvo' && b.familia==='area'){
      if(!(porHa>0)) return {erro:'Para passar de dose por '+(a.alvo||'alvo')+' para dose por área é preciso quantos '+(a.alvo||'alvos')+' há por hectare.', falta:'alvosPorHa'};
      var cl=canonico(v, de);
      var alvoHa=(cl.unidade==='mL/alvo') ? {valor:cl.valor*porHa, unidade:'mL/ha'}
                                          : {valor:cl.valor*porHa/1000, unidade:'g/ha'};
      if(UNIDADES[para].base!==alvoHa.unidade)
        return {erro:'"'+de+'" descreve '+a.fase+' e "'+para+'" descreve '+b.fase+'.'};
      return {valor:alvoHa.valor/UNIDADES[para].fator, unidade:para, usou:{alvosPorHa:porHa}};
    }
    return {erro:'Conversão de '+a.familia+' para '+b.familia+' não é definida.'};
  }

  /* ---- Equivalente em ingrediente ativo ----
     Duas formulacoes a 1 L/ha nao sao a mesma dose se uma tem 250 g/L e a outra 500.
     A FASE tem de casar: concentracao em g/L descreve liquido, g/kg descreve solido.
     Casar as duas sem densidade daria numero plausivel e falso. */
  var CONC_UNIDADES={
    'g/L':  {fase:'liquido', porUnidadeBase:1},      /* g de i.a. por LITRO de produto */
    'g/kg': {fase:'solido',  porUnidadeBase:1},      /* g de i.a. por QUILO de produto */
    '%':    {fase:'ambos',   porUnidadeBase:10}      /* 1% = 10 g por L (ou por kg) */
  };

  function equivalenteIA(doseValor, doseUnidade, concValor, concUnidade){
    var d=UNIDADES[doseUnidade], c=CONC_UNIDADES[concUnidade];
    var v=num(doseValor), cc=num(concValor);
    if(!d) return {erro:'Unidade de dose desconhecida.'};
    if(!c) return {erro:'Unidade de concentração desconhecida (use g/L, g/kg ou %).'};
    if(v==null||cc==null||!(cc>0)) return {erro:'Informe a dose e a concentração do produto.'};
    if(d.familia!=='area') return {erro:'O equivalente em i.a. por hectare só faz sentido para dose por área.'};
    if(c.fase!=='ambos' && c.fase!==d.fase)
      return {erro:'A concentração está em '+concUnidade+' ('+c.fase+') e a dose em '+doseUnidade+' ('+d.fase+'). Sem a densidade do produto, essa conversão não existe.'};

    /* dose em L/ha (ou kg/ha) x g de i.a. por L (ou por kg) = g de i.a./ha */
    var emUnidadeGrande = (d.base==='mL/ha') ? (v*d.fator/1000) : (v*d.fator/1000);
    var gPorUnidade = cc*c.porUnidadeBase;
    return {valor:emUnidadeGrande*gPorUnidade, unidade:'g i.a./ha',
            base:{dose:v, doseUnidade:doseUnidade, conc:cc, concUnidade:concUnidade}};
  }

  /* ---- Volume de calda escrito em texto livre ------------------------------
     UM CAMPO DE TEXTO QUE ALIMENTA UMA CONTA E UMA CONTA QUE ACEITA QUALQUER
     COISA. O caso real: o protocolo trazia

         "1,5 L ÁGUA (TOTAL 3,0 L/ha)"

     e quem lia pegava o PRIMEIRO numero — 1,5. Com 1,5 L/ha no lugar de 3, o
     produto a 1,5 L/ha passa a ocupar 100% da calda, nao sobra espaco para agua
     nenhuma, e a calculadora recusa preparar. O bloqueio estava certo; ele so
     recusava por um motivo que ninguem conseguia ver na tela.

     A REGRA E RECUSAR, NAO ESCOLHER. Quando ha mais de um numero, este motor NAO
     decide sozinho: devolve `ambiguo` com os candidatos e, quando um deles esta
     explicitamente qualificado por area (o "3,0 L/ha"), aponta esse como
     SUGESTAO. Quem confirma e a pessoa. Escolher em silencio e exatamente o que
     produziu o erro — trocar qual numero se escolhe em silencio nao conserta
     nada, so muda a vitima. */
  var RE_NUM_UN=/(\d+(?:\.\d{3})*(?:[.,]\d+)?)\s*(l\s*\/\s*ha|ml\s*\/\s*ha|l\/ha|ml\/ha|[a-zà-ú%°]+|)/gi;
  function _n(txt){
    /* milhar PT-BR: "1.500" e 1500, nao 1,5 */
    var s=String(txt).replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    var v=Number(s); return isFinite(v)?v:null;
  }
  function volumeCalda(texto){
    var s=String(texto==null?'':texto).trim();
    if(!s) return {valor:null, vazio:true};
    if(typeof texto==='number') return {valor:(isFinite(texto)?texto:null), unidade:'L/ha'};

    var achados=[], m;
    RE_NUM_UN.lastIndex=0;
    while((m=RE_NUM_UN.exec(s))!==null){
      var v=_n(m[1]); if(v==null) continue;
      var un=String(m[2]||'').toLowerCase().replace(/\s/g,'');
      achados.push({valor:v, unidade:un, porArea:(un==='l/ha'||un==='ml/ha'),
                    mL:(un==='ml/ha'), texto:m[0].trim()});
    }
    if(!achados.length) return {valor:null, semNumero:true};

    function emLha(a){ return a.mL ? a.valor/1000 : a.valor; }
    if(achados.length===1) return {valor:emLha(achados[0]), unidade:'L/ha', numeros:1};

    var porArea=achados.filter(function(a){ return a.porArea; });
    var sug=(porArea.length===1)?emLha(porArea[0]):null;
    return {valor:null, ambiguo:true, numeros:achados.length,
            candidatos:achados.map(function(a){ return {valor:emLha(a), rotulo:a.texto,
                                                        porArea:a.porArea, emLha:emLha(a)}; }),
            sugestao:sug,
            motivo:'O texto tem '+achados.length+' números e não diz qual é o volume de calda.'};
  }

  /* ---- Produto de MAIS DE UM ativo ----------------------------------------
     `item.concentracao` e um texto livre, e ate aqui quem o lia pegava a PRIMEIRA
     concentracao que encontrasse. Num produto de dois ativos — 2,4-D 406 g/L +
     picloram 103,6 g/L — o equivalente em i.a. saia com um terco da historia e
     sem avisar. Hoje isso e raro porque a concentracao e digitada a mao; com a
     importacao do Agrofit, onde 100% dos registros trazem o i.a. com a
     concentracao embutida, vira o caso comum.

     A ANCORA E A CONCENTRACAO, NAO O NOME. Procurar "(numero unidade)" e segmentar
     por ali atravessa parenteses aninhados no grupo quimico — `etefom (etileno
     (precursor de)) (720 g/L)` — que quebram qualquer tentativa de casar o grupo
     primeiro. */
  var RE_CONC=/\(\s*([\d]+(?:[.,][\d]+)?)\s*(g\/L|g\/l|g\/kg|mg\/kg|mg\/L|mg\/l|%)\s*\)/g;
  function ativosDe(texto){
    var s=String(texto==null?'':texto);
    var achados=[], m;
    RE_CONC.lastIndex=0;
    while((m=RE_CONC.exec(s))!==null) achados.push({ini:m.index, fim:RE_CONC.lastIndex, valor:m[1], un:m[2]});
    if(!achados.length){
      /* SEM PARENTESE e como o campo foi preenchido a mao desde sempre — "500 g/L",
         "70%". Cair fora aqui apagaria o equivalente em i.a. de todo item ja
         cadastrado, que e o oposto do que esta correcao existe para fazer. Um ativo,
         sem nome, e o comportamento identico ao de antes. */
      var b=s.match(/([\d]+(?:[.,][\d]+)?)\s*(g\/L|g\/l|g\/kg|mg\/kg|mg\/L|mg\/l|%)/);
      if(!b) return [];
      return [{ia:'', valor:num(b[1].replace(',','.')),
               unidade:b[2].replace('g/l','g/L').replace('mg/l','mg/L')}];
    }
    var out=[], corte=0;
    achados.forEach(function(a){
      var antes=s.slice(corte, a.ini);
      /* O nome e o que vem antes do primeiro parentese do trecho; sem parentese,
         e o trecho inteiro. O separador " + " e o " e " ficam de fora. */
      var nome=antes.replace(/^[\s+]+/,'').split('(')[0].trim().replace(/[,;]$/,'');
      var un=a.un.replace('g/l','g/L').replace('mg/l','mg/L');
      out.push({ia:nome, valor:num(a.valor.replace(',','.')), unidade:un});
      corte=a.fim;
    });
    return out;
  }

  /* Equivalente em i.a. de um produto que pode ter varios ativos.
     NAO SOMA os ativos: gramas de 2,4-D e gramas de picloram nao sao a mesma
     grandeza, e um total unico daria a impressao de que sao. Devolve um resultado
     por ativo, e quem le decide o que fazer com eles. */
  function equivalentesIA(doseValor, doseUnidade, textoConcentracao){
    var ativos=ativosDe(textoConcentracao);
    if(!ativos.length) return {erro:'Não achei concentração no formato "(valor unidade)" — ex.: "406 g/L".'};
    var itens=[], erro=null;
    ativos.forEach(function(a){
      var r=equivalenteIA(doseValor, doseUnidade, a.valor, a.unidade);
      if(r.erro){ if(!erro) erro=r.erro; return; }
      itens.push({ia:a.ia, valor:r.valor, unidade:r.unidade,
                  conc:a.valor, concUnidade:a.unidade});
    });
    if(!itens.length) return {erro:erro||'Não foi possível calcular o equivalente.'};
    return {itens:itens, ativos:ativos.length, parcial:(itens.length<ativos.length)};
  }

  /* Como a dose se escreve. Vírgula, porque é como se escreve aqui. */
  function formatar(valor, u, casas){
    var v=num(valor);
    if(v==null) return '—';
    var s=v.toFixed(casas==null?(Math.abs(v)<1?3:2):casas);
    s=s.replace(/\.?0+$/,'');           /* 0,800 -> 0,8 ; 1,00 -> 1 */
    return s.replace('.',',')+(u?(' '+u):'');
  }

  /* ---- Escada de doses (dose-resposta) ----
     Multiplos de uma dose de referencia. O uso classico e 0,25x 0,5x 1x 2x.
     Devolve os degraus JA na unidade da referencia — a escada existe para o
     pesquisador nao fazer quatro contas a mao e errar uma. */
  function escada(doseRef, unidade, multiplos){
    var v=num(doseRef);
    if(v==null||!(v>0)) return {erro:'Informe a dose de referência.'};
    if(!UNIDADES[unidade]) return {erro:'Unidade desconhecida.'};
    var ms=(Array.isArray(multiplos)&&multiplos.length)?multiplos:[0.25,0.5,1,2];
    var out=[], vistos={};
    ms.forEach(function(m){
      var k=num(m);
      if(k==null||!(k>0)) return;
      var val=v*k;
      var chave=val.toFixed(6);
      if(vistos[chave]) return;         /* 1x pedido duas vezes nao vira dois degraus */
      vistos[chave]=1;
      out.push({multiplo:k, valor:val, unidade:unidade, texto:formatar(val, unidade)});
    });
    out.sort(function(a,b){ return a.valor-b.valor; });
    return {degraus:out, referencia:v, unidade:unidade};
  }

  return {
    VERSION:VERSION,
    UNIDADES:UNIDADES, CONC_UNIDADES:CONC_UNIDADES,
    unidades:unidades, unidade:unidade, familia:familia, fase:fase, rotulo:rotulo,
    unidadesDaFamilia:unidadesDaFamilia,
    num:num, canonico:canonico, converter:converter, converterComContexto:converterComContexto,
    equivalenteIA:equivalenteIA, ativosDe:ativosDe, equivalentesIA:equivalentesIA,
    volumeCalda:volumeCalda,
    formatar:formatar, escada:escada
  };
});
