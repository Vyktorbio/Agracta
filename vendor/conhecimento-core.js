/* Conhecimento entre ensaios. Projeções de leitura, sem alterar o dado de origem.
 * Uma linha pertence a um tratamento, uma avaliação e uma variável. Não existe
 * média, ranking ou teste estatístico entre estudos neste módulo.
 */
(function(root){
  'use strict';
  function lista(v){ return Array.isArray(v)?v:[]; }
  function texto(v){ return v==null?'':String(v).trim(); }
  function normal(v){ return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' '); }
  function numero(v){
    if(typeof v==='number') return Number.isFinite(v)?v:null;
    if(typeof v!=='string'||!/^[-+]?(?:\d+(?:[.,]\d+)?|[.,]\d+)$/.test(v.trim()))return null;
    var n=Number(v.trim().replace(',','.')); return Number.isFinite(n)?n:null;
  }
  function chave(qid,sid){ return JSON.stringify([texto(qid),texto(sid)]); }
  function resumo(valores){
    var xs=lista(valores).map(numero).filter(function(v){return v!==null;});
    if(!xs.length)return {n:0,media:null,dp:null,min:null,max:null};
    var m=xs.reduce(function(a,b){return a+b;},0)/xs.length;
    var s=xs.reduce(function(a,b){return a+(b-m)*(b-m);},0);
    return {n:xs.length,media:m,dp:xs.length>1?Math.sqrt(s/(xs.length-1)):null,min:Math.min.apply(null,xs),max:Math.max.apply(null,xs)};
  }
  function merge(a,b){
    var eventos=new Map();
    lista(a&&a.eventos).concat(lista(b&&b.eventos)).forEach(function(e){
      if(!e||!texto(e.id))return;
      var ant=eventos.get(e.id);
      if(!ant||Number(e.ts)>Number(ant.ts)||(Number(e.ts)===Number(ant.ts)&&JSON.stringify(e)>JSON.stringify(ant)))eventos.set(e.id,e);
    });
    return {versao:1,eventos:Array.from(eventos.values()).sort(function(x,y){return Number(x.ts)-Number(y.ts)||texto(x.id).localeCompare(texto(y.id));})};
  }
  function estado(integracoes){
    var ev=merge(integracoes,null).eventos, campos={}, precos={}, estornos=new Set();
    ev.forEach(function(e){if(e.tipo==='estorno')estornos.add(texto(e.alvo));});
    ev.forEach(function(e){
      if(estornos.has(e.id))return;
      if(e.tipo==='campo'&&['projeto','cliente','materialBiologico','origemBiologica','loteBiologico','metodoLaboratorio'].indexOf(e.chave)>=0)campos[e.chave]=texto(e.valor);
      if(e.tipo==='preco'&&texto(e.chave)&&numero(e.valor)!==null&&numero(e.valor)>=0)precos[e.chave]=e;
    });
    return {campos:campos,precos:precos,custos:ev.filter(function(e){return e.tipo==='custo'&&!estornos.has(e.id);}),eventos:ev};
  }
  function custo(consumos,integracoes){
    var es=estado(integracoes), linhas=[], total=0, semPreco=0;
    lista(consumos).forEach(function(c){
      var p=es.precos[c.id], qtd=numero(c.quantidade), preco=p?numero(p.valor):null;
      // O preço é por unidade da BAIXA registrada. Não convertemos g em mL.
      if(p&&normal(p.unidade)!==normal(c.unidade))preco=null;
      var valor=qtd!==null&&qtd>=0&&preco!==null?qtd*preco:null;
      if(valor===null)semPreco++; else total+=valor;
      linhas.push(Object.assign({},c,{preco:preco,valor:valor,categoria:'Produto'}));
    });
    es.custos.forEach(function(c){
      var q=numero(c.quantidade),p=numero(c.valorUnitario),valor=q!==null&&q>=0&&p!==null&&p>=0?q*p:null;
      if(valor===null)semPreco++;else total+=valor;
      linhas.push(Object.assign({},c,{preco:p,valor:valor}));
    });
    return {linhas:linhas,total:total,semPreco:semPreco,completo:linhas.length>0&&semPreco===0};
  }
  function construir(estudos){
    var ensaios=lista(estudos).filter(function(s){return s&&s.key;});
    var produtos=new Map(),alvos=new Map(),projetos=new Map();
    function indexar(idx,key,nome,s){
      if(!key||!nome)return null;
      if(!idx.has(key))idx.set(key,{key:key,nome:nome,estudos:[],tratamentos:[]});
      var x=idx.get(key);if(x.estudos.indexOf(s.key)<0)x.estudos.push(s.key);return x;
    }
    ensaios.forEach(function(s){
      if(s.alvo)indexar(alvos,normal(s.alvo),s.alvo,s);
      var es=estado(s.integracoes);if(es.campos.projeto)indexar(projetos,normal(es.campos.projeto),es.campos.projeto,s);
      lista(s.tratamentos).forEach(function(t){
        lista(t.identidades).forEach(function(p){
          var x=indexar(produtos,p.key,p.nome,s);if(!x)return;
          x.tratamentos.push({estudo:s.key,tratamento:t.id});
          x.tipo=p.tipo||'produto'; x.identificado=!!p.identificado;
        });
      });
    });
    function ordenar(m){return Array.from(m.values()).sort(function(a,b){return a.nome.localeCompare(b.nome,'pt-BR');});}
    return {estudos:ensaios,produtos:ordenar(produtos),alvos:ordenar(alvos),projetos:ordenar(projetos)};
  }
  function agruparCustos(custos,campo){
    var grupos=new Map();
    lista(custos&&custos.linhas).forEach(function(r){
      var k=texto(r[campo])||'Geral do estudo';
      if(!grupos.has(k))grupos.set(k,{nome:k,total:0,semPreco:0});
      var g=grupos.get(k);if(r.valor===null)g.semPreco++;else g.total+=r.valor;
    });
    return Array.from(grupos.values());
  }
  function selecionar(acervo,op){
    op=op||{};
    return lista(acervo.estudos).filter(function(s){
      if(op.estudo&&op.estudo!==s.key)return false;
      if(op.cultura&&normal(op.cultura)!==normal(s.cultura))return false;
      if(op.ambiente&&op.ambiente!==s.ambiente)return false;
      if(op.local&&normal(op.local)!==normal(s.local))return false;
      if(op.alvo&&normal(op.alvo)!==normal(s.alvo))return false;
      if(op.projeto&&normal(op.projeto)!==normal(estado(s.integracoes).campos.projeto))return false;
      if(op.produto&&!lista(s.tratamentos).some(function(t){return lista(t.identidades).some(function(p){return p.key===op.produto;});}))return false;
      if(op.busca){
        var hay=[s.codigo,s.cultura,s.alvo,s.local,estado(s.integracoes).campos.projeto].concat(lista(s.tratamentos).map(function(t){return t.produto;})).join(' ');
        if(normal(hay).indexOf(normal(op.busca))<0)return false;
      }
      return true;
    });
  }
  function resultados(estudos,op){
    op=op||{};var out=[];
    lista(estudos).forEach(function(s){lista(s.resultados).forEach(function(r){
      var t=lista(s.tratamentos).find(function(x){return x.id===r.tratamento;});
      if(!t)return;
      if(op.produto&&!lista(t.identidades).some(function(p){return p.key===op.produto;}))return;
      if(op.variavel&&normal(op.variavel)!==normal(r.variavel))return;
      if(op.momento&&texto(op.momento)!==texto(r.momento))return;
      if(r.n>0)out.push(Object.assign({},r,{estudo:s.key,codigo:s.codigo,cultura:s.cultura,alvo:s.alvo,local:s.local,ambiente:s.ambiente,desenho:s.desenho,produto:t.produto,dose:t.dose,metodo:t.metodo||s.metodo}));
    });});
    return out.sort(function(a,b){return texto(a.codigo).localeCompare(texto(b.codigo),'pt-BR')||texto(a.data).localeCompare(texto(b.data))||texto(a.momento).localeCompare(texto(b.momento))||texto(a.tratamento).localeCompare(texto(b.tratamento),undefined,{numeric:true});});
  }
  function ambiente(s){
    var eventos=[];
    lista(s.aplicacoes).forEach(function(a){eventos.push({tipo:'Aplicação',id:a.id,data:a.data,hora:a.hora,clima:a.clima||null,pos:a.pos||null,ndvi:a.ndvi||null});});
    var avals=new Map();
    lista(s.resultados).forEach(function(r){
      if(!avals.has(r.avaliacao))avals.set(r.avaliacao,{tipo:'Avaliação',id:r.avaliacao,data:r.data,hora:r.hora,momento:r.momento,variaveis:[],clima:r.clima||null,ndvi:r.ndvi||null});
      var a=avals.get(r.avaliacao);if(a.variaveis.indexOf(r.variavel)<0)a.variaveis.push(r.variavel);
    });
    Array.from(avals.values()).forEach(function(a){eventos.push(a);});
    return eventos.sort(function(a,b){return texto(a.data).localeCompare(texto(b.data))||texto(a.hora).localeCompare(texto(b.hora));});
  }
  function soloNoInicio(analises,inicio){
    // Uma análise posterior não descreve automaticamente o solo anterior.
    return lista(analises).filter(function(a){return a&&a.data&&inicio&&a.data<=inicio;}).slice().sort(function(a,b){return texto(b.data).localeCompare(texto(a.data));})[0]||null;
  }
  function pendencias(s){
    var r=[];
    if(!s.cultura)r.push('Cultura não informada');
    if(!s.alvo)r.push('Alvo não informado');
    if(!lista(s.resultados).length)r.push('Sem resultados lançados');
    if(!lista(s.tratamentos).some(function(t){return t.testemunha;}))r.push('Sem testemunha explicitamente definida');
    if(s.ambiente==='laboratorio'&&!estado(s.integracoes).campos.materialBiologico)r.push('Material biológico não identificado');
    return r;
  }
  function textoSeguro(v,max){return texto(v).slice(0,max||500);}
  function climaPublico(c){
    if(!c)return null;
    var x={};['fonte','data','hora'].forEach(function(k){if(c[k]!=null)x[k]=textoSeguro(c[k],100);});
    ['temp','ur','vento','chuva','vpd','defasagem_s'].forEach(function(k){var n=numero(c[k]);if(n!==null)x[k]=n;});
    x.histor=c.histor===true;x.instante=c.instante===true;
    return x;
  }
  function posPublico(p){
    if(!p)return null;
    var x={};['horas','chuvaMm','primeiraChuvaHoras','coberturaPct'].forEach(function(k){x[k]=numero(p[k]);});
    x.completa=p.completa===true;x.horaConhecida=p.horaConhecida===true;x.fonte=textoSeguro(p.fonte,100);return x;
  }
  function relatorioCliente(s){
    // Projeção por lista permitida. Nunca JSON do estudo, custos, usuários,
    // notas internas, documentos de outros clientes ou coordenadas da fazenda.
    var linhas=resultados([s],{}).map(function(r){
      var x={};['avaliacao','tratamento','produto','dose','variavel','unidade','momento','data','hora','metodo'].forEach(function(k){x[k]=textoSeguro(r[k]);});
      ['n','media','dp','controle'].forEach(function(k){x[k]=numero(r[k]);});
      x.testemunha=r.testemunha===true;return x;
    });
    return {
      schema:1,codigo:textoSeguro(s.codigo),cultura:textoSeguro(s.cultura),alvo:textoSeguro(s.alvo),
      ambiente:textoSeguro(s.ambiente),local:textoSeguro(s.local),inicio:textoSeguro(s.inicio),desenho:textoSeguro(s.desenho),
      finalizado:s.finalizado===true,
      tratamentos:lista(s.tratamentos).map(function(t){return {id:textoSeguro(t.id),produto:textoSeguro(t.produto),dose:textoSeguro(t.dose),metodo:textoSeguro(t.metodo),testemunha:t.testemunha===true};}),
      resultados:linhas,
      ambienteEventos:ambiente(s).map(function(a){return {tipo:a.tipo,data:textoSeguro(a.data),hora:textoSeguro(a.hora),momento:textoSeguro(a.momento),clima:climaPublico(a.clima),pos:posPublico(a.pos)};}),
      pendencias:pendencias(s),atualizadoEm:textoSeguro(s.atualizadoEm),
      nota:'Resultados descritivos por avaliação e tratamento. DP indica a dispersão das unidades registradas; não é intervalo de confiança. Estudos distintos não foram combinados.'
    };
  }
  var API={VERSION:'1.0.0',lista:lista,texto:texto,normal:normal,numero:numero,chave:chave,resumo:resumo,merge:merge,estado:estado,custo:custo,agruparCustos:agruparCustos,construir:construir,selecionar:selecionar,resultados:resultados,ambiente:ambiente,soloNoInicio:soloNoInicio,pendencias:pendencias,relatorioCliente:relatorioCliente};
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
  if(root)root.ConhecimentoCore=API;
})(typeof window!=='undefined'?window:null);
