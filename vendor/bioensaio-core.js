/* ============================================================================
   BioensaioCore — bioensaios de laboratório com as contas da literatura
   ----------------------------------------------------------------------------
   Dois testes de bancada. O que vale para o ensaio inteiro é escrito UMA vez,
   no protocolo; a avaliação só anota o que se vê; o resto sai sozinho, com a
   referência de cada conta ao lado do número.

   TORRE DE POTTER (Potter, 1952) — artrópodes pulverizados na torre, em arena.
     Na leitura: mortos de N por arena, em cada momento (HAT/DAT).
     Sai sozinho: mortalidade; validade da testemunha (WHO, 2016); eficácia de
     Abbott (1925) / Schneider-Orelli (1947); classe IOBC do inimigo natural
     (Hassan, 1994; Sterk et al., 1999); efeito total com a reprodução
     (Overmeer & van Zon, 1982); depósito da torre por pesagem (mg/cm²); e,
     numa série de concentrações, CL50/CL90 pelo motor de Robertson et al. (2007).

   CRESCIMENTO MICELIAL EM PLACA — meio envenenado (Grover & Moore, 1962).
     Na leitura: o diâmetro da colônia em cruz (dois eixos perpendiculares).
     Sai sozinho: diâmetro médio; crescimento descontado o disco; inibição do
     crescimento (Vincent, 1947); IVCM (Oliveira, 1991); taxa de crescimento
     radial; o fim do ensaio quando a testemunha chega à borda; e, numa série
     de concentrações, a CE50 com a classe de Edgington et al. (1971).
     O diâmetro pode vir da régua ou de foto: o diâmetro da placa, declarado no
     protocolo, é a escala (mm por pixel) da medição por imagem.

   REGRAS
   1. NÃO INVENTA NÚMERO. Sem testemunha, sem N, sem disco: devolve null COM o
      motivo. Uma eficácia sem testemunha válida não é resultado.
   2. APONTA, NÃO BLOQUEIA. Testemunha acima do limite, depósito fora do alvo,
      colônia maior que a placa: viram aviso — quem decide é o pesquisador.
   3. MOTOR PURO: sem DOM. O app entrega leituras já lidas da grade.
   ============================================================================ */
(function(root){
  'use strict';

  var VERSAO='1.1.0';

  /* ---------- referências (ABNT) ---------- */
  var REFERENCIAS={
    abbott:{curta:'Abbott (1925)', abnt:'ABBOTT, W. S. A method of computing the effectiveness of an insecticide. Journal of Economic Entomology, v. 18, p. 265-267, 1925.'},
    schneiderOrelli:{curta:'Schneider-Orelli (1947)', abnt:'SCHNEIDER-ORELLI, O. Entomologisches Praktikum: Einführung in die land- und forstwirtschaftliche Insektenkunde. 2. Aufl. Aarau: H. R. Sauerländer, 1947.'},
    hendersonTilton:{curta:'Henderson & Tilton (1955)', abnt:'HENDERSON, C. F.; TILTON, E. W. Tests with acaricides against the brown wheat mite. Journal of Economic Entomology, v. 48, p. 157-161, 1955.'},
    sunShepard:{curta:'Sun & Shepard (1947)', abnt:'SUN, Y. P.; SHEPARD, H. H. Methods of calculating and correcting the mortality of insects. Journal of Economic Entomology, v. 40, p. 710-715, 1947.'},
    potter:{curta:'Potter (1952)', abnt:'POTTER, C. An improved laboratory apparatus for applying direct sprays and surface films, with data on the electrostatic charge on atomized spray fluids. Annals of Applied Biology, v. 39, p. 1-28, 1952.'},
    who2016:{curta:'WHO (2016)', abnt:'WORLD HEALTH ORGANIZATION. Test procedures for insecticide resistance monitoring in malaria vector mosquitoes. 2. ed. Geneva: WHO, 2016.'},
    hassan1994:{curta:'Hassan (1994)', abnt:'HASSAN, S. A. Activities of the IOBC/WPRS Working Group "Pesticides and Beneficial Organisms". IOBC/WPRS Bulletin, v. 17, n. 10, p. 1-5, 1994.'},
    sterk1999:{curta:'Sterk et al. (1999)', abnt:'STERK, G. et al. Results of the seventh joint pesticide testing programme carried out by the IOBC/WPRS-Working Group "Pesticides and Beneficial Organisms". BioControl, v. 44, p. 99-117, 1999.'},
    overmeer1982:{curta:'Overmeer & van Zon (1982)', abnt:'OVERMEER, W. P. J.; VAN ZON, A. Q. A standardized method for testing the side effects of pesticides on the predacious mite, Amblyseius potentillae (Acarina: Phytoseiidae). Entomophaga, v. 27, p. 357-364, 1982.'},
    finney1971:{curta:'Finney (1971)', abnt:'FINNEY, D. J. Probit analysis. 3. ed. Cambridge: Cambridge University Press, 1971.'},
    robertson2007:{curta:'Robertson et al. (2007)', abnt:'ROBERTSON, J. L.; RUSSELL, R. M.; PREISLER, H. K.; SAVIN, N. E. Bioassays with arthropods. 2. ed. Boca Raton: CRC Press, 2007.'},
    robertsonPreisler1992:{curta:'Robertson & Preisler (1992)', abnt:'ROBERTSON, J. L.; PREISLER, H. K. Pesticide bioassays with arthropods. Boca Raton: CRC Press, 1992.'},
    wheeler2006:{curta:'Wheeler et al. (2006)', abnt:'WHEELER, M. W.; PARK, R. M.; BAILER, A. J. Comparing median lethal concentration values using confidence interval overlap or ratio tests. Environmental Toxicology and Chemistry, v. 25, p. 1441-1444, 2006.'},
    groverMoore1962:{curta:'Grover & Moore (1962)', abnt:'GROVER, R. K.; MOORE, J. D. Toximetric studies of fungicides against the brown rot organisms, Sclerotinia fructicola and S. laxa. Phytopathology, v. 52, p. 876-880, 1962.'},
    vincent1947:{curta:'Vincent (1947)', abnt:'VINCENT, J. M. Distortion of fungal hyphae in the presence of certain inhibitors. Nature, v. 159, p. 850, 1947.'},
    edgington1971:{curta:'Edgington et al. (1971)', abnt:'EDGINGTON, L. V.; KHEW, K. L.; BARRON, G. L. Fungitoxic spectrum of benzimidazole compounds. Phytopathology, v. 61, p. 42-44, 1971.'},
    ewrc1964:{curta:'EWRC (1964)', abnt:'EUROPEAN WEED RESEARCH COUNCIL. Report of the 3rd and 4th meetings of EWRC Committee of Methods in Weed Research. Weed Research, v. 4, p. 88, 1964.'},
    mckinney1923:{curta:'McKinney (1923)', abnt:'MCKINNEY, H. H. Influence of soil temperature and moisture on infection of wheat seedlings by Helminthosporium sativum. Journal of Agricultural Research, v. 26, p. 195-217, 1923.'},
    townsendHeuberger1943:{curta:'Townsend & Heuberger (1943)', abnt:'TOWNSEND, G. R.; HEUBERGER, J. W. Methods for estimating losses caused by diseases in fungicide experiments. Plant Disease Reporter, v. 27, p. 340-343, 1943.'},
    pimentelGomes2009:{curta:'Pimentel-Gomes (2009)', abnt:'PIMENTEL-GOMES, F. Curso de estatística experimental. 15. ed. Piracicaba: FEALQ, 2009.'},
    kaplanMeier1958:{curta:'Kaplan & Meier (1958)', abnt:'KAPLAN, E. L.; MEIER, P. Nonparametric estimation from incomplete observations. Journal of the American Statistical Association, v. 53, p. 457-481, 1958.'},
    mantel1966:{curta:'Mantel (1966)', abnt:'MANTEL, N. Evaluation of survival data and two new rank order statistics arising in its consideration. Cancer Chemotherapy Reports, v. 50, p. 163-170, 1966.'},
    oliveira1991:{curta:'Oliveira (1991)', abnt:'OLIVEIRA, J. A. Efeito do tratamento fungicida em sementes no controle de tombamento de plântulas de pepino (Cucumis sativus L.) e pimentão (Capsicum annum L.). Dissertação (Mestrado) – Escola Superior de Agricultura de Lavras, Lavras, 1991.'}
  };
  function refsDe(chaves){
    var vistos={}, out=[];
    (chaves||[]).forEach(function(k){ if(REFERENCIAS[k]&&!vistos[k]){ vistos[k]=1; out.push({chave:k, curta:REFERENCIAS[k].curta, abnt:REFERENCIAS[k].abnt}); } });
    return out.sort(function(a,b){ return a.abnt.localeCompare(b.abnt); });
  }

  /* ---------- números ---------- */
  function num(v){
    if(v==null||typeof v==='boolean'||typeof v==='object') return null;
    var s=String(v).trim(); if(!s) return null;
    var n=Number(s.replace(/\s/g,'').replace(',','.'));
    return isFinite(n)?n:null;
  }
  function r(x,c){ if(x==null||!isFinite(x)) return null; var f=Math.pow(10,c==null?2:c); return Math.round(x*f)/f; }
  function media(xs){ xs=(xs||[]).filter(function(x){ return x!=null&&isFinite(x); }); if(!xs.length) return null; return xs.reduce(function(a,b){return a+b;},0)/xs.length; }
  function dp(xs){
    xs=(xs||[]).filter(function(x){ return x!=null&&isFinite(x); });
    if(xs.length<2) return null;
    var m=media(xs); return Math.sqrt(xs.reduce(function(a,b){ return a+(b-m)*(b-m); },0)/(xs.length-1));
  }

  /* ---------- métodos e protocolo ---------- */
  /* Cada método declara o que se pergunta UMA vez (parametros), o que a
     avaliação anota (variaveis) e de onde vêm as contas (refs). Os padrões são
     os do laboratório — o protocolo de cada estudo pode mudar tudo. */
  var METODOS={
    potter:{
      rotulo:'Torre de Potter', especialidade:'Entomologia',
      descricao:'Artrópodes pulverizados na Torre de Potter; mortos de N por arena em cada leitura.',
      parametros:{
        volumeMl:{rotulo:'Volume pulverizado (mL)', padrao:2},
        pressaoKpa:{rotulo:'Pressão (kPa)', padrao:null},
        depositoAlvo:{rotulo:'Depósito alvo (mg/cm²)', padrao:null},
        depositoTolPct:{rotulo:'Tolerância do depósito (%)', padrao:10},
        categoria:{rotulo:'O organismo é', padrao:'praga'},      /* praga | inimigo */
        estagio:{rotulo:'Estágio', padrao:''},
        criterio:{rotulo:'Critério de morte', padrao:'Sem movimento coordenado ao toque com pincel fino'},
        moribundoMorto:{rotulo:'Moribundo conta como morto', padrao:true},
        limiteTestemunha:{rotulo:'Mortalidade máxima da testemunha (%)', padrao:20},
        pesoAntesG:{rotulo:'Massa antes (g)', padrao:null},
        pesoDepoisG:{rotulo:'Massa depois (g)', padrao:null},
        superficieCm:{rotulo:'Diâmetro da superfície pesada (cm)', padrao:null}
      },
      variaveis:[
        {nome:'Mortalidade', tipo:'razao', sentido:'maior', papel:'mortalidade', refs:['abbott']}
      ],
      refs:['potter','abbott','schneiderOrelli','who2016','robertson2007','finney1971']
    },
    placa:{
      rotulo:'Crescimento micelial em placa', especialidade:'Fitopatologia',
      descricao:'Meio envenenado; diâmetro da colônia em cruz em cada leitura.',
      parametros:{
        placaMm:{rotulo:'Diâmetro interno da placa (mm)', padrao:90},
        discoMm:{rotulo:'Disco de micélio (mm)', padrao:5},
        meio:{rotulo:'Meio de cultura', padrao:'BDA'},
        temperaturaC:{rotulo:'Temperatura (°C)', padrao:25},
        fotoperiodo:{rotulo:'Fotoperíodo', padrao:''},
        isolado:{rotulo:'Isolado / espécie', padrao:''},
        bordaPct:{rotulo:'Fim quando a testemunha chegar a (% da placa)', padrao:95}
      },
      variaveis:[
        {nome:'Diâmetro da colônia (mm)', tipo:'numero', sub:2, sentido:'menor', papel:'diametro', refs:['groverMoore1962']}
      ],
      refs:['groverMoore1962','vincent1947','oliveira1991','edgington1971']
    }
  };

  /* O método sai do que o estudo JÁ diz — não é mais uma pergunta:
       Fungo in vitro                          → placa
       Mortalidade / Folha destacada na bancada → Torre de Potter
     metodoAplic é o método de aplicação do estudo ('lab' = Potter). */
  function metodoDoEstudo(study, ehLab, metodoAplic){
    var t=String((study&&study.tipoEstudo)||'');
    if(!ehLab) return '';
    if(t==='Fungo in vitro') return 'placa';
    if((t==='Mortalidade'||t==='Folha destacada') && (metodoAplic==null||metodoAplic==='lab')) return 'potter';
    return '';
  }

  /* Protocolo normalizado: o que o estudo gravou, com os padrões por baixo. */
  function protocolo(study, metodo){
    var b=(study&&study.bioensaio&&typeof study.bioensaio==='object')?study.bioensaio:{};
    var def=METODOS[metodo]; if(!def) return null;
    var gravado=(b[metodo]&&typeof b[metodo]==='object')?b[metodo]:{}, out={metodo:metodo};
    Object.keys(def.parametros).forEach(function(k){
      var v=gravado[k], pd=def.parametros[k].padrao;
      if(typeof pd==='number'||pd===null){ var n=num(v); out[k]=(n!=null)?n:pd; }
      else if(typeof pd==='boolean'){ out[k]=(v==null||v==='')?pd:!!v; }
      else out[k]=(v==null||String(v).trim()==='')?pd:String(v);
    });
    if(metodo==='potter'){
      out.categoria=(out.categoria==='inimigo')?'inimigo':'praga';
      /* indivíduos por arena: é o N — já vive na unidade experimental do estudo */
      var a=(study&&study.arena)||{};
      out.individuosPorArena=num(a.organismosPorUnidade);
      out.organismo=String(a.organismo||'');
      out.arenaDiametroCm=(a.forma==='circular')?num(a.diametroCm):null;
    }
    return out;
  }

  /* Variáveis com que a PRIMEIRA avaliação nasce — o esquema das seguintes vem
     por herança, como sempre. N da mortalidade = indivíduos por arena. */
  function variaveisIniciais(metodo, prot){
    var def=METODOS[metodo]; if(!def) return [];
    return def.variaveis.map(function(v){
      var o={nome:v.nome, tipo:v.tipo, sentido:v.sentido, papel:v.papel};
      if(v.sub) o.sub=v.sub;
      if(v.tipo==='razao' && prot && prot.individuosPorArena>0) o.N=Math.round(prot.individuosPorArena);
      return o;
    });
  }
  function papelDaVariavel(metodo, nome){
    var s=String(nome||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    if(metodo==='placa' && /diametr/.test(s) && /(colonia|micel|halo)/.test(s)) return 'diametro';
    if(metodo==='placa' && /^diametro\b/.test(s)) return 'diametro';
    if(metodo==='potter' && /mortalidad|mortos?\b|mortas?\b|morte/.test(s)) return 'mortalidade';
    if(metodo==='potter' && /ovos|oviposi|fecundid|reproduc/.test(s)) return 'reproducao';
    return null;
  }

  /* ---------- fórmulas ---------- */
  /* Abbott (1925) sobre mortalidade — a mesma de Schneider-Orelli (1947):
       E = (Mt − Mc) / (100 − Mc) × 100
     Negativo é informação (o tratamento matou menos que a testemunha) e sai
     como está; só não existe com testemunha ≥ 100%. */
  function abbott(mt, mc){
    mt=num(mt); mc=num(mc);
    if(mt==null||mc==null||mc>=100||mc<0) return null;
    return (mt-mc)/(100-mc)*100;
  }
  /* Henderson & Tilton (1955): contagens de VIVOS antes (b) e depois (a).
       E = (1 − (Ta × Cb) / (Tb × Ca)) × 100
     Sem população na prévia (Tb ou Cb zero) ou na testemunha depois (Ca zero) a
     conta não mede nada — com Cb = 0 daria 100% para qualquer tratamento. */
  function hendersonTilton(Ta, Tb, Ca, Cb){
    Ta=num(Ta); Tb=num(Tb); Ca=num(Ca); Cb=num(Cb);
    if(Ta==null||Tb==null||Ca==null||Cb==null||!(Tb>0)||!(Ca>0)||!(Cb>0)) return null;
    return (1-(Ta*Cb)/(Tb*Ca))*100;
  }
  /* WHO (2016): testemunha até 5% dispensa correção; de 5% a 20% corrige por
     Abbott; acima de 20% o teste é descartado e repetido. O limite superior é
     do protocolo (padrão 20). */
  function validadeTestemunha(mc, limite){
    mc=num(mc); var lim=num(limite); if(lim==null) lim=20;
    if(mc==null) return {estado:'sem', texto:'Sem mortalidade na testemunha para julgar a leitura.', refs:['who2016']};
    if(mc>lim) return {estado:'invalido', texto:'Testemunha com '+r(mc,1)+'% de mortalidade, acima de '+r(lim,1)+'%: a leitura não sustenta eficácia — repita o teste.', refs:['who2016']};
    if(mc>5) return {estado:'corrigir', texto:'Testemunha com '+r(mc,1)+'%: a eficácia é corrigida por Abbott.', refs:['who2016','abbott']};
    return {estado:'ok', texto:'Testemunha com '+r(mc,1)+'%: dentro do esperado.', refs:['who2016']};
  }
  /* IOBC/WPRS — classes de efeito (Hassan, 1994; Sterk et al., 1999).
     Laboratório: 1 inócuo < 30%; 2 levemente nocivo 30–79%; 3 moderadamente
     nocivo 80–99%; 4 nocivo > 99%. Semicampo e campo: < 25; 25–50; 51–75; > 75. */
  var IOBC_ROTULOS=['inócuo','levemente nocivo','moderadamente nocivo','nocivo'];
  function iobcClasse(efeito, fase){
    var e=num(efeito); if(e==null) return null;
    var c;
    if(fase==='campo'||fase==='semicampo'){ c=(e<25)?1:(e<=50)?2:(e<=75)?3:4; }
    else { c=(e<30)?1:(e<80)?2:(e<=99)?3:4; }
    return {classe:c, rotulo:IOBC_ROTULOS[c-1], efeito:e, fase:(fase==='campo'||fase==='semicampo')?fase:'laboratorio', refs:['hassan1994','sterk1999']};
  }
  /* Efeito total (Overmeer & van Zon, 1982): E = 100 − (100 − M) × R, com M a
     mortalidade corrigida e R a reprodução do tratado sobre a da testemunha. */
  function efeitoTotal(Mcorr, R){
    var m=num(Mcorr), q=num(R); if(m==null||q==null||q<0) return null;
    return 100-(100-m)*q;
  }
  /* Depósito da torre por pesagem: (depois − antes) em mg sobre a área. */
  function depositoPotter(antesG, depoisG, diametroCm){
    var a=num(antesG), d=num(depoisG), dm=num(diametroCm);
    if(a==null||d==null) return {mgCm2:null, motivo:'pesagem incompleta'};
    if(!(dm>0)) return {mgCm2:null, motivo:'diâmetro da superfície pesada não informado'};
    if(d<a) return {mgCm2:null, motivo:'massa depois menor que antes'};
    var area=Math.PI*Math.pow(dm/2,2);
    return {mgCm2:(d-a)*1000/area, areaCm2:area, motivo:null};
  }
  function depositoNoAlvo(mgCm2, alvo, tolPct){
    var v=num(mgCm2), a=num(alvo), t=num(tolPct); if(t==null) t=10;
    if(v==null||!(a>0)) return null;
    var desvio=(v-a)/a*100;
    return {desvioPct:desvio, dentro:Math.abs(desvio)<=t};
  }

  /* Placa: diâmetro médio da cruz, crescimento descontado o disco, inibição. */
  function diametroMedio(sub){
    var xs=(sub||[]).map(num).filter(function(x){ return x!=null; });
    return xs.length?media(xs):null;
  }
  function crescimento(diam, discoMm){
    var d=num(diam), k=num(discoMm); if(d==null) return null; if(k==null) k=0;
    return Math.max(0, d-k);
  }
  /* Vincent (1947): I = (C − T) / C × 100, com C e T o crescimento da
     testemunha e do tratamento. */
  function inibicao(C, T){
    var c=num(C), t=num(T); if(c==null||t==null||!(c>0)) return null;
    return (c-t)/c*100;
  }
  /* IVCM (Oliveira, 1991): Σ (D − Da) / N — D o crescimento médio da leitura,
     Da o da leitura anterior, N os dias desde a repicagem. Começa do zero: no
     dia da repicagem a colônia é só o disco. */
  function ivcm(serie){
    var pts=(serie||[]).filter(function(p){ return p && p.dias>0 && p.cresc!=null && isFinite(p.cresc); })
      .slice().sort(function(a,b){ return a.dias-b.dias; });
    if(!pts.length) return null;
    var s=0, ant=0;
    pts.forEach(function(p){ s+=(p.cresc-ant)/p.dias; ant=p.cresc; });
    return s;
  }
  /* Taxa de crescimento radial (mm/dia): inclinação da reta raio × dias. */
  function taxaRadial(serie){
    var pts=(serie||[]).filter(function(p){ return p && p.dias!=null && isFinite(p.dias) && p.cresc!=null && isFinite(p.cresc); });
    if(pts.length<2) return null;
    var xs=pts.map(function(p){ return p.dias; }), ys=pts.map(function(p){ return p.cresc/2; });
    var mx=media(xs), my=media(ys), sxx=0, sxy=0, syy=0;
    for(var i=0;i<xs.length;i++){ sxx+=(xs[i]-mx)*(xs[i]-mx); sxy+=(xs[i]-mx)*(ys[i]-my); syy+=(ys[i]-my)*(ys[i]-my); }
    if(!(sxx>0)) return null;
    var b=sxy/sxx;
    return {mmDia:b, r2:(syy>0)?(sxy*sxy)/(sxx*syy):null, pontos:pts.length};
  }
  /* Edgington et al. (1971): CE50 em µg/mL (= mg/L = ppm).
     < 1 altamente fungitóxico; 1–10 moderadamente; 10–50 pouco; > 50 não fungitóxico. */
  function classeEdgington(ce50, unidade){
    var v=num(ce50); if(v==null||v<=0) return null;
    var u=String(unidade||'').toLowerCase().replace(/\s/g,'');
    if(u && !/^(ppm|mg\/l|µg\/ml|ug\/ml|mcg\/ml)$/.test(u)) return {classe:null, rotulo:null, motivo:'a classe de Edgington é em µg/mL (ppm); a dose deste estudo está em '+unidade, refs:['edgington1971']};
    var rot=(v<1)?'altamente fungitóxico':(v<=10)?'moderadamente fungitóxico':(v<=50)?'pouco fungitóxico':'não fungitóxico';
    var cl=(v<1)?1:(v<=10)?2:(v<=50)?3:4;
    return {classe:cl, rotulo:rot, ce50:v, refs:['edgington1971']};
  }

  /* ---------- resumo do ensaio ---------- */
  /* ds (montado pelo app a partir da grade):
       {metodo, prot, testemunha, variavel,
        tratamentos:[{id, nome, dose, testemunha}],
        leituras:[{avId, rotulo, dias, parcelas:[{tratId, rep, n, N, sub:[..], valor}]}]}
     Devolve, por leitura e por tratamento, tudo o que as fórmulas acima dão. */
  function resumoPotter(ds){
    var prot=ds.prot||{}, test=ds.testemunha, avisos=[], refs=['potter','abbott','schneiderOrelli','who2016'];
    var leituras=(ds.leituras||[]).map(function(L){
      var por={};
      (L.parcelas||[]).forEach(function(p){
        var n=num(p.n), N=num(p.N);
        var o=(por[p.tratId]=por[p.tratId]||{n:0,N:0,arenas:0,pcts:[],semN:0});
        if(n==null) return;
        if(N==null||!(N>0)){ o.semN++; return; }
        if(n>N) n=N;
        o.n+=n; o.N+=N; o.arenas++; o.pcts.push(n/N*100);
      });
      var mc=null, tInfo=por[test];
      if(tInfo && tInfo.N>0) mc=tInfo.n/tInfo.N*100;
      var val=validadeTestemunha(mc, prot.limiteTestemunha);
      var linhas=(ds.tratamentos||[]).map(function(t){
        var o=por[t.id]||{n:0,N:0,arenas:0,pcts:[],semN:0};
        var mort=(o.N>0)?o.n/o.N*100:null;
        var l={tratId:t.id, nome:t.nome||'', dose:(t.dose!=null?t.dose:null), testemunha:t.id===test,
          mortos:o.N>0?o.n:null, avaliados:o.N>0?o.N:null, arenas:o.arenas, mortalidade:mort,
          dpArenas:dp(o.pcts), abbott:null, iobc:null, semN:o.semN};
        if(!l.testemunha && mort!=null && mc!=null) l.abbott=abbott(mort, mc);
        if(!l.testemunha && prot.categoria==='inimigo' && l.abbott!=null) l.iobc=iobcClasse(Math.max(0,l.abbott),'laboratorio');
        return l;
      });
      var semN=linhas.reduce(function(a,l){ return a+(l.semN||0); },0);
      if(semN) avisos.push(L.rotulo+': '+semN+' arena(s) com mortos anotados e sem N — ficam fora da conta.');
      return {avId:L.avId, rotulo:L.rotulo, dias:L.dias, testemunhaMort:mc, validade:val, linhas:linhas};
    });
    if(!test) avisos.push('Nenhum tratamento marcado como testemunha: sem ela não há Abbott nem validade do teste.');
    if(prot.categoria==='inimigo') refs.push('hassan1994','sterk1999');
    var dep=depositoPotter(prot.pesoAntesG, prot.pesoDepoisG, prot.superficieCm||prot.arenaDiametroCm);
    var noAlvo=(dep.mgCm2!=null)?depositoNoAlvo(dep.mgCm2, prot.depositoAlvo, prot.depositoTolPct):null;
    if(noAlvo && !noAlvo.dentro) avisos.push('Depósito de '+r(dep.mgCm2,2)+' mg/cm², '+r(noAlvo.desvioPct,1)+'% do alvo de '+r(prot.depositoAlvo,2)+' mg/cm² (tolerância ±'+r(prot.depositoTolPct,0)+'%): recalibre a torre.');
    leituras.forEach(function(L){ if(L.validade.estado==='invalido') avisos.push(L.rotulo+': '+L.validade.texto); });
    return {metodo:'potter', variavel:ds.variavel, prot:prot, deposito:dep, depositoNoAlvo:noAlvo,
      leituras:leituras, final:leituras.length?leituras[leituras.length-1]:null,
      avisos:avisos, refs:refsDe(refs)};
  }

  function resumoPlaca(ds){
    var prot=ds.prot||{}, test=ds.testemunha, avisos=[], refs=['groverMoore1962','vincent1947','oliveira1991'];
    var placa=num(prot.placaMm), disco=num(prot.discoMm);
    var acimaDaPlaca=0;
    var leituras=(ds.leituras||[]).slice().sort(function(a,b){ return (a.dias||0)-(b.dias||0); }).map(function(L){
      var por={};
      (L.parcelas||[]).forEach(function(p){
        var dmed=(p.sub&&p.sub.length)?diametroMedio(p.sub):num(p.valor);
        if(dmed==null) return;
        if(placa>0 && dmed>placa+0.5) acimaDaPlaca++;
        (por[p.tratId]=por[p.tratId]||[]).push(dmed);
      });
      var tDiam=media(por[test]||[]), tCres=crescimento(tDiam, disco);
      var linhas=(ds.tratamentos||[]).map(function(t){
        var ds_=por[t.id]||[], dm=media(ds_), cr=crescimento(dm, disco);
        return {tratId:t.id, nome:t.nome||'', dose:(t.dose!=null?t.dose:null), testemunha:t.id===test,
          placas:ds_.length, diametro:dm, dpDiametro:dp(ds_), crescimento:cr,
          inibicao:(t.id===test||cr==null)?null:inibicao(tCres, cr)};
      });
      var alvoBorda=(placa>0)?placa*(num(prot.bordaPct)||95)/100:null;
      return {avId:L.avId, rotulo:L.rotulo, dias:L.dias, testemunhaDiametro:tDiam,
        testemunhaNaBorda:!!(alvoBorda!=null && tDiam!=null && tDiam>=alvoBorda), linhas:linhas};
    });
    if(acimaDaPlaca) avisos.push(acimaDaPlaca+' placa(s) com diâmetro maior que a placa de '+r(placa,0)+' mm: confira a leitura.');
    if(!test) avisos.push('Nenhum tratamento marcado como testemunha: sem ela não há inibição do crescimento.');
    if(disco==null) avisos.push('Disco de micélio não informado no protocolo: o crescimento sai com o disco incluído.');
    /* por tratamento, na série inteira */
    var porTrat={};
    (ds.tratamentos||[]).forEach(function(t){
      var serie=leituras.map(function(L){
        var l=L.linhas.filter(function(x){ return x.tratId===t.id; })[0];
        return {dias:L.dias, cresc:l?l.crescimento:null};
      });
      porTrat[t.id]={ivcm:ivcm(serie), taxa:taxaRadial(serie)};
    });
    var fim=null;
    for(var i=0;i<leituras.length;i++){ if(leituras[i].testemunhaNaBorda){ fim=leituras[i]; break; } }
    return {metodo:'placa', variavel:ds.variavel, prot:prot, leituras:leituras, porTratamento:porTrat,
      fim:fim?{avId:fim.avId, rotulo:fim.rotulo, dias:fim.dias,
               texto:'A testemunha chegou à borda em '+fim.rotulo+' ('+r(fim.testemunhaDiametro,1)+' mm de '+r(placa,0)+' mm): é a leitura final do ensaio.'}:null,
      final:fim||(leituras.length?leituras[leituras.length-1]:null),
      avisos:avisos, refs:refsDe(refs)};
  }

  function resumo(ds){
    if(!ds||!METODOS[ds.metodo]) return null;
    return ds.metodo==='placa'?resumoPlaca(ds):resumoPotter(ds);
  }

  var API={VERSAO:VERSAO, REFERENCIAS:REFERENCIAS, refsDe:refsDe, METODOS:METODOS,
    metodoDoEstudo:metodoDoEstudo, protocolo:protocolo, variaveisIniciais:variaveisIniciais,
    papelDaVariavel:papelDaVariavel,
    num:num, abbott:abbott, hendersonTilton:hendersonTilton, validadeTestemunha:validadeTestemunha,
    iobcClasse:iobcClasse, efeitoTotal:efeitoTotal, depositoPotter:depositoPotter, depositoNoAlvo:depositoNoAlvo,
    diametroMedio:diametroMedio, crescimento:crescimento, inibicao:inibicao, ivcm:ivcm, taxaRadial:taxaRadial,
    classeEdgington:classeEdgington, resumo:resumo, resumoPotter:resumoPotter, resumoPlaca:resumoPlaca};
  root.BioensaioCore=API;
  if(typeof module!=='undefined' && module.exports) module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
