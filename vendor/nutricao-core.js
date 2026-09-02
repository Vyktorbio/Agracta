/* Motor de nutricao — calagem e recomendacao de adubacao. Nucleo puro (sem DOM).
 *
 * Extraido de app.js sem uma linha de aritmetica alterada; so o empacotamento UMD e
 * a troca de uma dependencia por um parametro: recomendar() recebe o PACOTE de
 * tabelas em vez de le-lo do localStorage. Era a unica coisa que impedia este codigo
 * de rodar fora do navegador — e de ser testado sem simular armazenamento.
 *
 * O QUE ESTE MOTOR E, E O QUE ELE NAO E
 *
 * Ele traz as DEFINICOES universais de quimica de solo — SB = Ca+Mg+K, T = SB+(H+Al),
 * V% = 100·SB/T, m% = 100·Al/(SB+Al) — e a formula da calagem pelo metodo da
 * saturacao por bases, publicada e reproduzida ha decadas em material de extensao:
 *
 *     NC (t/ha) = (V2 - V1) x T / (10 x PRNT%)
 *
 * Ele NAO traz tabela de recomendacao nenhuma. O V2 desejado, as faixas de teor, as
 * doses por produtividade e os limites de micronutriente sao CONTEUDO de publicacao,
 * e entram por um pacote de tabelas carregado no aparelho — que nao e versionado
 * neste repositorio, porque o repositorio e publico e o site sai dele.
 *
 * Efeito colateral bom da separacao: trocando o pacote, o mesmo motor atende
 * CQFS-RS/SC ou a 5a Aproximacao de Minas, em vez de assumir Sao Paulo como universal.
 *
 * A TRILHA NAO E ENFEITE. E o que separa "o Agracta mandou passar 2,3 t/ha" de uma
 * conta conferivel: de qual faixa, de qual linha da tabela, com que criterio. Num
 * ensaio sob BPL, numero sem origem nao vale.
 */
(function(root,factory){
  var api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.NutricaoCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  /* Versao do motor. Vai gravada junto de qualquer numero que ele produza: sem ela,
     uma recomendacao guardada hoje nao se reconfere depois que a formula mudar. */
  var VERSION="1.0.0";

  function soloIndices(res){
    res=res||{};
    function n(k){ var v=res[k]; v=(v===''||v==null)?null:Number(v); return (v==null||!isFinite(v))?null:v; }
    var Ca=n('Ca'), Mg=n('Mg'), K=n('K'), HAl=n('HAl'), Al=n('Al');
    var out={SB:null, T:null, V:null, m:null};
    if(Ca!=null&&Mg!=null&&K!=null){ out.SB=Math.round((Ca+Mg+K)*10)/10; }
    if(out.SB!=null&&HAl!=null){ out.T=Math.round((out.SB+HAl)*10)/10; }
    if(out.SB!=null&&out.T){ out.V=Math.round(100*out.SB/out.T); }
    if(out.SB!=null&&Al!=null&&(out.SB+Al)>0){ out.m=Math.round(100*Al/(out.SB+Al)); }
    return out;
  }

  function calagem(res, V2, PRNT, profundidadeCm){
    var ind=soloIndices(res);
    V2=Number(V2); PRNT=Number(PRNT);
    if(ind.T==null||ind.V==null) return {erro:'Faltam Ca, Mg, K ou H+Al para calcular a CTC.'};
    if(!isFinite(V2)||V2<=0||V2>100) return {erro:'Informe a saturação por bases desejada (V2), de 1 a 100%.'};
    if(!isFinite(PRNT)||PRNT<=0||PRNT>100) return {erro:'Informe o PRNT do calcário, de 1 a 100%.'};
    if(V2<=ind.V) return {nc:0, V1:ind.V, V2:V2, T:ind.T, PRNT:PRNT,
                          nota:'A saturação atual já está em ou acima da desejada — não há necessidade de calagem.'};
    var nc=(V2-ind.V)*ind.T/(10*PRNT);
    /* A fórmula é para 0-20 cm. Outra profundidade escala proporcionalmente — e o
       ajuste vai dito na trilha, para ninguém aplicar dose de 40 cm achando que é padrão. */
    var prof=Number(profundidadeCm);
    var fator=(isFinite(prof)&&prof>0)?(prof/20):1;
    return {nc:Math.round(nc*fator*100)/100, ncBase:Math.round(nc*100)/100,
            V1:ind.V, V2:V2, T:ind.T, PRNT:PRNT,
            profundidade:(isFinite(prof)&&prof>0)?prof:20, fator:fator};
  }

  function calagemTrilha(c){
    if(!c||c.erro) return [];
    var L=[];
    L.push('Método da saturação por bases');
    L.push('NC (t/ha) = (V2 − V1) × T ÷ (10 × PRNT)');
    L.push('V1 (atual) = '+c.V1+'%   ·   V2 (desejada) = '+c.V2+'%');
    L.push('T (CTC a pH 7) = '+c.T+' mmolc/dm³   ·   PRNT = '+c.PRNT+'%');
    if(c.nc===0){ L.push(c.nota||'Sem necessidade de calagem.'); return L; }
    L.push('NC = ('+c.V2+' − '+c.V1+') × '+c.T+' ÷ (10 × '+c.PRNT+') = '+c.ncBase+' t/ha  (0–20 cm)');
    if(c.fator!==1) L.push('Ajuste para '+c.profundidade+' cm: '+c.ncBase+' × '+(Math.round(c.fator*100)/100)+' = '+c.nc+' t/ha');
    return L;
  }

  function validarPacote(obj){
    if(!obj||typeof obj!=='object') return 'Arquivo não é um pacote de tabelas.';
    if(!Array.isArray(obj.culturas)||!obj.culturas.length) return 'O pacote não traz nenhuma cultura.';
    for(var i=0;i<obj.culturas.length;i++){
      var c=obj.culturas[i];
      if(!c||!c.nome) return 'Cultura sem nome na posição '+(i+1)+'.';
      if(c.V2!=null&&(!isFinite(Number(c.V2))||Number(c.V2)<=0||Number(c.V2)>100))
        return 'V2 inválido em "'+c.nome+'" (esperado 1 a 100).';
    }
    return null;
  }

  /* Cultura do pacote. Recebe o pacote como argumento — no app.js ele vinha de uma
     variavel global alimentada pelo localStorage, e era so isso que impedia esta
     funcao de rodar no Node. */
  function culturaDoPacote(pac, nome, finalidade){
    if(!pac||!Array.isArray(pac.culturas)) return null;
    var achou=pac.culturas.filter(function(c){
      return c.nome===nome && (!finalidade || (c.finalidade||'')===finalidade);
    })[0];
    return achou||null;
  }

  function faixa(faixas, valor){
    if(!Array.isArray(faixas)||valor==null||!isFinite(valor)) return null;
    for(var i=0;i<faixas.length;i++){
      var f=faixas[i];
      if(f.ate==null) return f;
      if(valor<=Number(f.ate)) return f;
    }
    return faixas[faixas.length-1]||null;
  }

  function dose(linhas, produtividade){
    if(!Array.isArray(linhas)||!linhas.length) return null;
    /* null e '' viram 0 no Number(), e 0 é finito: sem esta guarda, "não informei a
       produtividade" passaria como "produtividade zero" e pegaria calada a menor dose
       da tabela, sem avisar ninguém. */
    var alvo=(produtividade===''||produtividade==null)?NaN:Number(produtividade);
    if(!isFinite(alvo)||alvo<=0) return {dose:linhas[0].dose, linha:linhas[0], semProdutividade:true};
    var ordenadas=linhas.slice().sort(function(a,b){ return Number(a.produtividade)-Number(b.produtividade); });
    for(var i=0;i<ordenadas.length;i++){
      if(alvo<=Number(ordenadas[i].produtividade)) return {dose:ordenadas[i].dose, linha:ordenadas[i]};
    }
    var ult=ordenadas[ordenadas.length-1];
    return {dose:ult.dose, linha:ult, extrapolou:true};
  }

  function recomendar(pac, analise, cultura, finalidade, produtividade){
    if(!pac) return {erro:'Nenhum pacote de tabelas carregado.'};
    var c=culturaDoPacote(pac, cultura, finalidade);
    if(!c) return {erro:'A cultura "'+cultura+'" não está no pacote carregado.'};
    if(!analise||!analise.resultados) return {erro:'Sem análise de solo lançada.'};

    var r=analise.resultados, out={cultura:c.nome, finalidade:c.finalidade||'', 
          produtividade:produtividade, pacote:(pac.nome||''), fonte:(pac.fonte||''),
          itens:[], trilha:[], V2:(c.V2!=null?Number(c.V2):null)};

    out.trilha.push('Pacote: '+(pac.nome||'sem nome')+(pac.versao?(' ('+pac.versao+')'):''));
    out.trilha.push('Cultura: '+c.nome+(c.finalidade?(' · '+c.finalidade):''));
    if(produtividade!=null&&produtividade!=='') out.trilha.push('Produtividade esperada: '+produtividade+' '+(c.unidadeProdutividade||'t/ha'));

    /* Nitrogênio: não sai da análise de solo. Vem de produtividade esperada e do
       histórico — por isso é tratado à parte, e a trilha diz isso em voz alta. */
    if(c.N){
      var linhasN=c.N.cobertura||[];
      var dN=dose(linhasN, produtividade);
      var totalN=(Number(c.N.plantio)||0)+(dN?Number(dN.dose)||0:0);
      if(totalN>0){
        out.itens.push({nutriente:'N', dose:totalN, unidade:(c.N.unidade||'kg/ha'),
                        detalhe:(c.N.plantio?('plantio '+c.N.plantio+' + cobertura '+(dN?dN.dose:0)):null)});
        out.trilha.push('N — não é estimado pela análise de solo; vem da produtividade esperada e do histórico da gleba.');
        if(c.N.plantio) out.trilha.push('   plantio '+c.N.plantio+' + cobertura '+(dN?dN.dose:0)+' = '+totalN+' kg/ha de N');
        if(dN&&dN.extrapolou) out.trilha.push('   ATENÇÃO: produtividade acima da última linha da tabela — dose extrapolada.');
      }
    }

    /* P e K saem do teor medido, classificado na faixa da tabela. */
    [['P2O5','P'],['K2O','K']].forEach(function(par){
      var chave=par[0], bloco=c[chave];
      if(!bloco) return;
      var criterio=bloco.criterio||par[1];
      var valor=(r[criterio]!=null&&r[criterio]!=='')?Number(r[criterio]):null;
      if(valor==null){
        out.trilha.push(chave+' — sem '+criterio+' no laudo; não calculado.');
        return;
      }
      var f=faixa(bloco.faixas, valor);
      if(!f){ out.trilha.push(chave+' — o teor de '+criterio+' não caiu em nenhuma faixa da tabela.'); return; }
      var d=dose(f.doses, produtividade);
      if(!d){ out.trilha.push(chave+' — a faixa "'+(f.classe||'')+'" não traz dose.'); return; }
      out.itens.push({nutriente:chave, dose:Number(d.dose), unidade:(bloco.unidade||'kg/ha'),
                      classe:(f.classe||null), teor:valor, criterio:criterio});
      out.trilha.push(chave+' — '+criterio+' medido '+valor+' → classe "'+(f.classe||'—')+'"'+
                      (f.ate!=null?(' (até '+f.ate+')'):' (acima da última faixa)')+
                      ' → '+d.dose+' '+(bloco.unidade||'kg/ha'));
      if(d.extrapolou) out.trilha.push('   ATENÇÃO: produtividade acima da última linha — dose extrapolada.');
      if(d.semProdutividade) out.trilha.push('   Sem produtividade esperada informada: usada a primeira linha da tabela.');
    });

    /* Micronutrientes: aplicam quando o teor está ABAIXO do limite da tabela. */
    (c.micro||[]).forEach(function(mi){
      var crit=mi.criterio||mi.nutriente;
      var valor=(r[crit]!=null&&r[crit]!=='')?Number(r[crit]):null;
      if(valor==null) return;
      if(valor<Number(mi.abaixoDe)){
        out.itens.push({nutriente:mi.nutriente, dose:Number(mi.dose), unidade:(mi.unidade||'kg/ha'), micro:true});
        out.trilha.push(mi.nutriente+' — teor '+valor+' abaixo de '+mi.abaixoDe+' → '+mi.dose+' '+(mi.unidade||'kg/ha'));
      }else{
        out.trilha.push(mi.nutriente+' — teor '+valor+' suficiente (limite '+mi.abaixoDe+'); sem aplicação.');
      }
    });

    if(out.V2!=null) out.trilha.push('V% desejada para esta cultura, segundo o pacote: '+out.V2+'%');
    return out;
  }

  return {
    VERSION:VERSION,
    soloIndices:soloIndices,
    calagem:calagem,
    calagemTrilha:calagemTrilha,
    validarPacote:validarPacote,
    culturaDoPacote:culturaDoPacote,
    faixa:faixa,
    dose:dose,
    recomendar:recomendar
  };
});
