/* ============================================================================
   AgrofitCore — o catálogo oficial de produtos registrados, dentro do app
   ----------------------------------------------------------------------------
   Todo item cadastrado à mão é uma chance de errar concentração, titular ou
   número de registro — e esses três são exatamente os campos que a folha BPL
   leva para a auditoria. O Agrofit é a fonte que o próprio MAPA publica; este
   motor põe os 4.397 registros ao alcance do cadastro.

   POR QUE ARQUIVO EMBARCADO E NÃO CHAMADA DE API

   O Agrofit tem API (AgroAPI/Embrapa), e ela pede um token de assinatura por
   conta. Token é credencial de servidor: num PWA, ficaria legível para qualquer
   pessoa que abrisse o código da página. E o Agracta é usado em campo — a hora
   em que o técnico procura um produto é justamente a hora em que ele não tem
   sinal. Consulta que depende da rede falha quando mais precisa funcionar.

   Os mesmos dados saem como dados abertos, sem chave, sob CC-BY. `tools/
   agrofit-destila.py` os destila; este motor consulta o resultado, offline.

   DUAS REGRAS QUE ESTE MOTOR SEGUE

   1. NÃO ESCOLHE MARCA POR NINGUÉM. Um registro pode carregar até 19 marcas
      comerciais (Arapoty, Glifosino 720 WG, Glifosino 720 WG Cropdefend…). São
      rótulos diferentes do mesmo registro, e só quem tem a embalagem na mão
      sabe qual está usando. `paraItem` exige a marca; sem ela, recusa.
   2. NÃO REESCREVE O QUE JÁ ESTÁ CADASTRADO. O motor devolve campos; quem
      decide se sobrescreve é a interface, com a pessoa vendo. Um catálogo que
      corrige item em silêncio apaga a versão que a pessoa conferiu.

   Fonte: Ministério da Agricultura e Pecuária — Agrofit, dados abertos (CC-BY).
   ============================================================================ */
(function(raiz){
  'use strict';
  var VERSION='1.0.0';

  /* Busca de bancada: quem digita "algodao" tem de achar "Algodão", e quem
     digita "2,4-d" tem de achar "2,4-D". Acento e caixa saem; o resto fica. */
  function chave(s){
    return String(s==null?'':s)
      .normalize? String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim()
      : String(s==null?'':s).toLowerCase().trim();
  }

  /* Expande o formato compacto (vocabulários + índices) para objetos legíveis.
     O formato existe para caber no aparelho; o resto do app não deve conhecê-lo. */
  function carregar(bruto){
    if(!bruto || !Array.isArray(bruto.p)) return null;
    var voc=bruto.voc||{}, v=function(nome,i){ var a=voc[nome]||[]; return (i>=0&&i<a.length)?a[i]:''; };
    var produtos=bruto.p.map(function(r){
      return { nr:String(r[0]||''), marcas:(r[1]||[]).slice(), ativos:r[2]||'',
               formulacao:v('f',r[3]), titular:v('t',r[4]), classe:v('c',r[5]),
               modoAcao:v('a',r[6]), toxicologica:v('x',r[7]), ambiental:v('e',r[8]),
               organico:r[9]===1 };
    });
    var porNr={}, indice=[];
    produtos.forEach(function(p){
      porNr[p.nr]=p;
      /* Uma entrada de busca POR MARCA. É o nome do rótulo que a pessoa procura;
         o registro com 19 marcas tem de aparecer 19 vezes, uma por nome real. */
      p.marcas.forEach(function(m){ indice.push({marca:m, k:chave(m), p:p}); });
      if(!p.marcas.length) indice.push({marca:'', k:'', p:p});
    });
    return { fonte:bruto.fonte||'', gerado:bruto.gerado||'', produtos:produtos,
             porNr:porNr, indice:indice, VERSION:VERSION };
  }

  /* Ordena por onde o termo bateu, não por relevância inventada: marca que
     COMEÇA com o termo vem antes de marca que o contém, que vem antes de
     ingrediente ativo. O número de registro é busca exata e ganha de todas. */
  function buscar(cat, termo, opcoes){
    opcoes=opcoes||{};
    var limite=opcoes.limite>0?opcoes.limite:20;
    var t=chave(termo);
    if(t.length<2) return [];
    var out=[], vistos={};
    function poe(p, marca, peso){
      var id=p.nr+'|'+marca;
      if(vistos[id]!=null){ if(peso<vistos[id].peso){ vistos[id].peso=peso; } return; }
      var reg={produto:p, marca:marca, peso:peso};
      vistos[id]=reg; out.push(reg);
    }
    /* Registro é identificador: quem digita o número quer aquele registro. */
    if(/^\d+$/.test(t) && cat.porNr[t]) poe(cat.porNr[t], (cat.porNr[t].marcas[0]||''), 0);
    cat.indice.forEach(function(e){
      if(!e.k) return;
      var i=e.k.indexOf(t);
      if(i===0) poe(e.p, e.marca, 1);
      else if(i>0) poe(e.p, e.marca, 2);
    });
    if(out.length<limite){
      cat.produtos.forEach(function(p){
        if(chave(p.ativos).indexOf(t)>=0) poe(p, (p.marcas[0]||''), 3);
      });
    }
    if(out.length<limite){
      cat.produtos.forEach(function(p){
        if(chave(p.titular).indexOf(t)>=0) poe(p, (p.marcas[0]||''), 4);
      });
    }
    out.sort(function(a,b){
      if(a.peso!==b.peso) return a.peso-b.peso;
      if(a.marca.length!==b.marca.length) return a.marca.length-b.marca.length;
      return a.marca.localeCompare(b.marca,'pt-BR');
    });
    return out.slice(0,limite);
  }

  function porRegistro(cat, nr){
    return (cat && cat.porNr[String(nr==null?'':nr).trim()]) || null;
  }

  /* Traduz um registro do Agrofit nos campos do item do Agracta.
     RECUSA sem marca: ver regra 1 no topo. Devolve {erro} em vez de adivinhar. */
  function paraItem(produto, marca){
    if(!produto) return {erro:'Nenhum produto do Agrofit foi escolhido.'};
    var m=String(marca==null?'':marca).trim();
    if(!m){
      if(produto.marcas.length===1) m=produto.marcas[0];
      else return {erro:'Este registro tem '+produto.marcas.length+
                        ' marcas comerciais. Escolha a que está na embalagem.',
                   marcas:produto.marcas.slice()};
    }
    if(produto.marcas.length && produto.marcas.indexOf(m)<0)
      return {erro:'"'+m+'" não é uma das marcas deste registro.', marcas:produto.marcas.slice()};
    /* As outras marcas do MESMO registro viram sinônimos: é literalmente o
       mesmo produto com outro rótulo, e a busca do app passa a achá-lo por
       qualquer um dos nomes. */
    var sinonimos=produto.marcas.filter(function(x){ return x!==m; });
    return {
      nome:m,
      sinonimos:sinonimos,
      titular:produto.titular,
      registro:produto.nr,
      formulacao:produto.formulacao,
      /* O Agrofit traz a concentração DENTRO do ingrediente ativo — é o mesmo
         formato que DoseCore.ativosDe() já lê, parênteses aninhados inclusive. */
      concentracao:produto.ativos,
      ativos:produto.ativos,
      tipo:(produto.classe && /biol[oó]gico|microbiol/i.test(produto.classe))?'biologico':'referencia',
      situacao:'registrado',
      /* Procedência do preenchimento. Campo sem origem não se defende em auditoria. */
      origem:{fonte:'agrofit', registro:produto.nr, classe:produto.classe,
              toxicologica:produto.toxicologica, ambiental:produto.ambiental,
              modoAcao:produto.modoAcao, organico:produto.organico}
    };
  }

  /* ===== PRODUTO x CULTURA REGISTRADA =======================================
     O catalogo traz, por registro, as culturas para as quais o MAPA o aprovou.
     Isso responde uma pergunta que o app nao sabia fazer: o produto deste ensaio
     tem registro para a cultura deste estudo?

     A RESPOSTA NUNCA BLOQUEIA, e a severidade e "nota", nao "conferir". Ensaio
     de registro existe JUSTAMENTE para gerar dado de cultura ainda nao
     registrada — tratar isso como erro seria brigar com a finalidade do
     trabalho. O que o app faz e nao deixar passar despercebido.

     E NAO OPINA SOBRE O QUE NAO CONHECE: item sem numero de registro (o
     experimental do patrocinador) nao gera achado nenhum. Ausencia de registro
     nao e ausencia de conformidade. */
  function carregarCulturas(bruto){
    if(!bruto || !Array.isArray(bruto.culturas) || !bruto.p) return null;
    return {culturas:bruto.culturas, p:bruto.p, gerado:bruto.gerado||''};
  }
  function culturasDe(cc, nr){
    if(!cc) return null;
    var idx=cc.p[String(nr==null?'':nr).trim()];
    if(!idx) return null;
    return idx.map(function(i){ return cc.culturas[i]; }).filter(Boolean);
  }
  /* "Todas as culturas" e uma entrada REAL do Agrofit, e significa exatamente
     isso. Tratá-la como uma cultura de nome literal faria o app apontar falta de
     registro em produto que tem registro para tudo. */
  function _todasAsCulturas(lista){
    return (lista||[]).some(function(c){ return /^todas as culturas$/i.test(chave(c)); });
  }
  function registradoPara(cc, nr, cultura){
    var lista=culturasDe(cc, nr);
    if(!lista) return {conhecido:false};
    var alvo=chave(cultura);
    if(!alvo) return {conhecido:true, registrado:null, culturas:lista, motivo:'o estudo não declara cultura'};
    if(_todasAsCulturas(lista))
      return {conhecido:true, registrado:true, todas:true, culturas:lista};
    var achou=lista.some(function(c){ return chave(c)===alvo; });
    return {conhecido:true, registrado:achou, culturas:lista};
  }

  /* Uma linha para a tela de resultado. */
  function rotulo(r){
    if(!r||!r.produto) return '';
    var p=r.produto, partes=[p.classe, p.formulacao].filter(Boolean);
    return (r.marca||p.nr)+(partes.length?(' · '+partes.join(' · ')):'');
  }

  var API={VERSION:VERSION, chave:chave, carregar:carregar, buscar:buscar,
           porRegistro:porRegistro, paraItem:paraItem, rotulo:rotulo,
           carregarCulturas:carregarCulturas, culturasDe:culturasDe,
           registradoPara:registradoPara};
  if(typeof module!=='undefined' && module.exports) module.exports=API;
  if(raiz) raiz.AgrofitCore=API;
})(typeof window!=='undefined'?window:(typeof globalThis!=='undefined'?globalThis:this));
