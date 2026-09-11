/* Interface de conhecimento. Consome o acervo já autenticado do Agracta.
 * Nenhuma leitura deste arquivo normaliza, salva ou migra um estudo.
 */
(function(w){
  'use strict';
  var C=w.ConhecimentoCore, view=viewLimpa(), acervo=null, ultimoFoco=null;
  /* A aba Estudos tem filtro proprio de situacao: ele sobrevive a troca de
     aba e a ida-e-volta para a ficha, senao quem abre um estudo finalizado
     volta para a lista e nao o encontra mais. */
  function viewLimpa(){return {aba:'produtos',busca:'',filtro:{},selecionado:'',estudo:'',estadoEstudo:'todos'};}
  function e(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function n(x){return x==null?'—':Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});}
  function dataBR(x){return /^\d{4}-\d{2}-\d{2}$/.test(String(x))?x.slice(8,10)+'/'+x.slice(5,7)+'/'+x.slice(0,4):e(x||'Sem data');}
  function lista(x){return C.lista(x);}
  function dinheiro(x){return x==null?'Sem preço':Number(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function isoTimestamp(x){var d=new Date(x);return x&&Number.isFinite(d.getTime())?d.toISOString():'';}
  function item(id,ctx){var its=ctx?ctx.itens:w.ITENS,del=ctx?ctx._deletedItens:w._delItens;return id&&its&&!(del||{})[id]?its[id]||null:null;}
  function msg(t){var b=document.getElementById('conhecimentoAviso');if(b)b.textContent=t;else if(w._stxToast)w._stxToast(t);}
  function metodo(st,qid,t){
    var m=st.metodoAplicacao;
    if(st.metodoPorTratamento&&t&&t.aplicacao&&t.aplicacao.metodo)m=t.aplicacao.metodo;
    if(!m&&st.protocolo&&st.protocolo.equipamento)m=st.protocolo.equipamento;
    return ({tractor:'Trator / sider',co2:'Costal CO₂',drone:'Drone',atomizer:'Atomizador',lab:'Laboratório'})[m]||m||'Não informado';
  }
  function identidades(t,qid,sid,ctx){
    var ps=[],nomes=[],cs=lista(t.componentes),base=item(t.itemId,ctx);
    if(base&&base.codigoCego)return {ids:[{key:'item:'+base.id,nome:base.codigoCego,tipo:'produto',identificado:true}],nome:base.codigoCego};
    if(!cs.length)cs=[{itemId:t.itemId,nome:t.produto,ia:t.ia||t.ingredienteAtivo}];
    cs.forEach(function(c){
      if(!c)return;
      var it=item(c.itemId,ctx);
      if(!it)Object.keys((ctx?ctx.itens:w.ITENS)||{}).some(function(id){
        var candidato=item(id,ctx);if(!candidato)return false;
        var vinculo=lista(candidato.vinculosHistoricos).some(function(v){return v.qid===qid&&v.estudoId===sid&&v.tratamentoId===t.id&&(v.componenteId||'')===(c.id||'');});
        if(vinculo)it=candidato;return vinculo;
      });
      var nome=it?(it.codigoCego||it.nome):c.nome;
      if(!nome)return;
      nomes.push(nome);
      ps.push({key:it?'item:'+it.id:'texto:'+C.normal(nome),nome:nome,tipo:'produto',identificado:!!it});
      // Cegamento acompanha a projeção: nem busca nem exportação levam o ativo.
      if(it&&it.codigoCego)return;
      var fonte=(it&&it.ativos)||c.ia||(!lista(t.componentes).length&&(t.ia||t.ingredienteAtivo))||'';
      if(fonte&&w.DoseCore&&w.DoseCore.ativosDe){
        w.DoseCore.ativosDe(fonte).forEach(function(a){
          var traduz=w.AtivosEN&&w.AtivosEN.emIngles?w.AtivosEN.emIngles(a.ia):null;
          var ativo=traduz&&traduz.traduzido?traduz.nome:a.ia;
          if(ativo)ps.push({key:'ativo:'+C.normal(ativo),nome:a.ia,tipo:'ativo',identificado:!!(traduz&&traduz.traduzido)});
        });
      }
    });
    // Um componente pode repetir o mesmo ativo numa mistura: indexa uma vez.
    var seen=new Set();ps=ps.filter(function(p){if(seen.has(p.key))return false;seen.add(p.key);return true;});
    return {ids:ps,nome:nomes.join(' + ')||(base&&base.codigoCego)||t.produto||'Sem produto'};
  }
  function clima(c){
    if(!c)return null;
    return {fonte:c.fonte||'Não informada',data:c.data||'',hora:c.hora||'',temp:C.numero(c.temp),ur:C.numero(c.umidade),vento:C.numero(c.vento),chuva:C.numero(c.chuva),vpd:C.numero(c.vpd),histor:!!c.histor,instante:!!c.instante,defasagem_s:C.numero(c.defasagem_s)};
  }
  function projetar(qid,st,q,ctx){
    var qlocal=ctx?ctx.qlocal:w.QLOCAL,locais=ctx?ctx.locais:w.LOCAIS;
    var lid=qlocal&&qlocal[qid],loc=lid&&locais&&locais[lid],p=st.protocolo||{};
    var lab=q.tipo==='lab';
    var out={key:C.chave(qid,st.id),qid:qid,sid:st.id,codigo:st.codigo||st.nome||st.id,
      cultura:st.cultura||q.cultura||'',alvo:st.alvo||p.alvo||'',tipoEstudo:st.tipoEstudo||'',
      local:loc&&loc.nome||'Sem local',quadra:typeof w.quadraNome==='function'?w.quadraNome(qid):qid,
      ambiente:lab?'laboratorio':'campo',inicio:st.dataInicio||'',finalizado:!!(st.finalizacao&&st.finalizacao.em),
      finalizadoEm:(st.finalizacao&&st.finalizacao.em)||'',finalizadoPor:(st.finalizacao&&(st.finalizacao.nome||st.finalizacao.por))||'',
      desenho:st.desenho==='faixas'?'Faixas / unidades registradas':st.desenho==='dbc'?'Blocos ao acaso':'Não informado',metodo:metodo(st,qid),
      tratamentos:[],resultados:[],aplicacoes:[],consumos:[],integracoes:st.integracoes||null,
      solo:q.solo||null,atualizadoEm:isoTimestamp(st._ts)};
    lista(st.tratamentos).forEach(function(t){if(!t)return;var ids=identidades(t,qid,st.id,ctx);
      out.tratamentos.push({id:t.id,produto:ids.nome,identidades:ids.ids,dose:t.dose||'',metodo:metodo(st,qid,t),testemunha:t.testemunha===true});
    });
    var test=out.tratamentos.find(function(t){return t.testemunha;});
    var reps=Math.max(1,parseInt(st.numRepeticoes,10)||1);
    lista(st.avaliacoes).forEach(function(av,ai){
      if(!av||typeof av!=='object')return;
      var sums={};
      out.tratamentos.forEach(function(t){sums[t.id]={};lista(av.variaveis).forEach(function(v){
        var xs=[];for(var rep=1;rep<=reps;rep++){
          var row={key:String(t.id)+'R'+rep,tratId:t.id,rep:rep};
          xs.push(typeof w._avNota==='function'?w._avNota(av,row,v):((av.notas||{})[row.key]||{})[v]);
        }
        sums[t.id][v]=C.resumo(xs);
      });});
      lista(av.variaveis).forEach(function(v){out.tratamentos.forEach(function(t){
        var s=sums[t.id][v];if(!s.n)return;
        var cfg=(av.varcfg||{})[v]||{},tipo=(av.tipos||{})[v]||'pct',sentido=cfg.sentido==='maior'?'maior':'menor';
        var ref=test&&sums[test.id]&&sums[test.id][v],ctrl=null;
        if(test&&t.id!==test.id&&ref&&ref.n&&typeof w._pctCtrl==='function')ctrl=w._pctCtrl(ref.media,s.media,sentido,tipo);
        var m=av.momento,momento=m&&C.numero(m.valor)!==null&&['HAT','DAT'].indexOf(m.unidade)>=0?n(C.numero(m.valor))+' '+m.unidade:'';
        out.resultados.push(Object.assign({},s,{avaliacao:av.id||'av-'+ai,tratamento:t.id,variavel:v,tipo:tipo,
          unidade:cfg.unidade||(['pct','razao','escala'].indexOf(tipo)>=0?'%':''),sentido:sentido,controle:ctrl,testemunha:!!(test&&t.id===test.id),
          momento:momento,data:av.data||'',hora:av.hora||'',clima:clima(av.carimbo&&av.carimbo.clima),ndvi:av.carimbo&&av.carimbo.ndvi||null}));
      });});
    });
    lista(st.aplicacoes).forEach(function(a,ai){
      var car=a.carimbo||{},ini=a.inicio||{};
      out.aplicacoes.push({id:a.id||'ap-'+ai,data:a.data||'',hora:a.hora||ini.hora||'',clima:clima(ini.clima||car.clima),ndvi:car.ndvi||null,pos:a.pos||null});
      lista(a.consumos).forEach(function(c,ci){
        var it=item(c.itemId,ctx),lt=it&&lista(it.lotes).find(function(l){return l.id===c.loteId;});
        out.consumos.push({id:JSON.stringify([a.id||ai,c.eventoId||c.id||ci]),aplicacao:a.id||'',data:a.data||'',tratamento:c.tratamentoId||'',
          descricao:it?(it.codigoCego||it.nome):(c.nome||c.produto||'Produto'),lote:lt&&lt.codigo||c.loteCodigo||'',
          quantidade:C.numero(c.quantidade),unidade:c.unidade||'',origem:c.origem==='derivada'?'Baixa derivada do preparo':'Baixa registrada'});
      });
    });
    return out;
  }
  function construir(){
    var todos=[];
    Object.keys(w.data||{}).forEach(function(qid){var q=w.data[qid];if(qid==='__config'||!q)return;
      lista(q.estudos).forEach(function(st){if(st&&st.id)todos.push(projetar(qid,st,q));});
    });
    acervo=C.construir(todos);return acervo;
  }
  function achar(key){return lista((acervo||construir()).estudos).find(function(s){return s.key===key;});}
  function abrir(op){
    if(document.documentElement.classList.contains('pre-auth'))return;
    construir();ultimoFoco=document.activeElement;
    view=viewLimpa();
    if(typeof op==='string'){view.selecionado='item:'+op;}
    else if(op){view.busca=op.busca||'';if(op.qid&&op.sid)view.estudo=C.chave(op.qid,op.sid);if(op.aba)view.aba=op.aba;}
    var ov=document.getElementById('conhecimentoOvl');
    if(!ov){ov=document.createElement('div');ov.id='conhecimentoOvl';ov.className='con-overlay';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-label','Conhecimento experimental');document.body.appendChild(ov);}
    ov.hidden=false;pintar();var b=ov.querySelector('[data-con="fechar"]');if(b)b.focus();
  }
  function fechar(){var ov=document.getElementById('conhecimentoOvl');if(ov)ov.hidden=true;if(ultimoFoco&&ultimoFoco.isConnected)ultimoFoco.focus();}
  function bot(acao,label,attrs,cls){return '<button type="button" class="con-btn '+(cls||'')+'" data-con="'+acao+'" '+(attrs||'')+'>'+label+'</button>';}
  function vazio(t){return '<p class="con-empty">'+e(t)+'</p>';}
  function filtros(estudos){
    function select(key,label,vs){var seen=Array.from(new Set(vs.filter(Boolean))).sort(function(a,b){return a.localeCompare(b,'pt-BR');});
      return '<label>'+label+'<select data-con-filtro="'+key+'"><option value="">Todos</option>'+seen.map(function(v){return '<option value="'+e(v)+'"'+(view.filtro[key]===v?' selected':'')+'>'+e(v)+'</option>';}).join('')+'</select></label>';}
    return '<div class="con-filtros">'+select('cultura','Cultura',estudos.map(function(s){return s.cultura;}))+
      select('local','Local',estudos.map(function(s){return s.local;}))+
      '<label>Ambiente<select data-con-filtro="ambiente"><option value="">Todos</option><option value="campo"'+(view.filtro.ambiente==='campo'?' selected':'')+'>Campo</option><option value="laboratorio"'+(view.filtro.ambiente==='laboratorio'?' selected':'')+'>Laboratório</option></select></label>'+
      select('variavel','Variável',estudos.flatMap(function(s){return s.resultados.map(function(r){return r.variavel;});}))+
      select('momento','Momento declarado',estudos.flatMap(function(s){return s.resultados.map(function(r){return r.momento;});}))+'</div>';
  }
  function tabela(linhas){
    if(!linhas.length)return vazio('Nenhum resultado lançado para esta seleção.');
    return '<div class="con-scroll"><table><caption>Resultados por estudo, avaliação e tratamento</caption><thead><tr><th>Estudo / tratamento</th><th>Produto e dose</th><th>Avaliação</th><th>n</th><th>Média</th><th>DP</th><th>Controle / eficácia</th></tr></thead><tbody>'+linhas.map(function(r){
      return '<tr><td>'+bot('estudo',e(r.codigo),'data-key="'+e(r.estudo)+'"','link')+'<small>'+e(r.tratamento)+' · '+e(r.local)+'</small></td><td>'+e(r.produto)+'<small>'+e(r.dose)+' · '+e(r.metodo)+'</small></td><td>'+e(r.variavel)+'<small>'+dataBR(r.data)+(r.momento?' · '+e(r.momento):' · momento não declarado')+'</small></td><td>'+n(r.n)+'</td><td>'+n(r.media)+(r.unidade?' '+e(r.unidade):'')+'</td><td>'+n(r.dp)+'</td><td>'+(r.testemunha?'Testemunha':r.controle==null?'—':n(r.controle)+'%')+'</td></tr>';
    }).join('')+'</tbody></table></div><p class="con-note">n = unidades com valor registrado. DP = desvio-padrão dessas unidades, não intervalo de confiança. Faixas e subamostras exigem conferir o delineamento. O controle usa somente testemunha explicitamente marcada; resultados de estudos distintos não são combinados.</p>';
  }
  function dataHoraBR(x){var d=new Date(x);return x&&Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'data não registrada';}
  function selo(s){
    if(!s.finalizado)return '<span class="con-selo em-execucao">Em execução</span>';
    return '<span class="con-selo finalizado">Finalizado</span>';
  }
  function cartaoEstudo(s){
    var rodape=s.finalizado
      ? 'Finalizado em '+dataHoraBR(s.finalizadoEm)+(s.finalizadoPor?' por '+e(s.finalizadoPor):'')
      : e(s.local)+' · '+(s.ambiente==='laboratorio'?'Laboratório':'Campo')+' · '+s.resultados.length+' resultados';
    return bot('estudo','<b>'+e(s.codigo)+'</b><span>'+e(s.cultura||'Sem cultura')+' · '+e(s.alvo||'Sem alvo')+'</span>'+selo(s)+
      '<small>'+rodape+'</small>','data-key="'+e(s.key)+'"','card');
  }
  /* Nenhuma destas acoes escreve daqui: cada uma chama a mesma funcao do
     Agracta que a ficha do estudo ja chama, com senha, rubrica e motivo.
     Duplicar o fluxo aqui seria criar uma segunda porta sem trilha. */
  function acoesEstudo(s){
    return '<div class="con-acoes">'+bot('estudo','Abrir','data-key="'+e(s.key)+'"')+
      (s.finalizado?bot('estReabrir','Reabrir','data-key="'+e(s.key)+'"')
                   :bot('estFinalizar','Finalizar','data-key="'+e(s.key)+'"'))+
      bot('estExcluir','Excluir','data-key="'+e(s.key)+'"','perigo')+'</div>';
  }
  function listaEstudos(xs,op){
    if(!xs.length)return vazio((op&&op.vazio)||'Nenhum estudo corresponde aos filtros.');
    return '<div class="con-estudos">'+xs.map(function(s){
      return op&&op.acoes?'<div class="con-estudo">'+cartaoEstudo(s)+acoesEstudo(s)+'</div>':cartaoEstudo(s);
    }).join('')+'</div>';
  }
  var ESTADOS=[['todos','Todos'],['andamento','Em execução'],['finalizados','Finalizados']];
  function noEstado(s,estado){return estado==='todos'||(estado==='finalizados'?!!s.finalizado:!s.finalizado);}
  function abaEstudos(){
    var todos=lista(acervo.estudos);
    var conta=function(k){return todos.filter(function(s){return noEstado(s,k);}).length;};
    /* Em execucao primeiro: e a lista de quem ainda tem trabalho pendente. */
    var xs=todos.filter(function(s){return noEstado(s,view.estadoEstudo);}).sort(function(a,b){
      if(!a.finalizado!==!b.finalizado)return a.finalizado?1:-1;
      return String(b.inicio||'').localeCompare(String(a.inicio||''));
    });
    return '<div class="con-estado" role="group" aria-label="Situação dos estudos">'+ESTADOS.map(function(p){
        return bot('estado',e(p[1])+' <b>'+conta(p[0])+'</b>','data-estado="'+p[0]+'" aria-pressed="'+(view.estadoEstudo===p[0])+'"',view.estadoEstudo===p[0]?'ativo':'');
      }).join('')+'</div>'+
      listaEstudos(xs,{acoes:true,vazio:view.estadoEstudo==='finalizados'?'Nenhum estudo finalizado até agora.':view.estadoEstudo==='andamento'?'Nenhum estudo em execução.':'Nenhum estudo cadastrado.'})+
      '<p class="con-note">Finalizar congela a estatística e deixa o estudo em leitura; reabrir exige motivo registrado. Um estudo finalizado só pode ser excluído depois de reaberto. As três ações pedem a senha e ficam na trilha de auditoria com autor e data.</p>';
  }
  function selecao(){
    var idx=acervo[view.aba]||[],query=C.normal(view.busca),vis=idx.filter(function(x){return !query||C.normal(x.nome).indexOf(query)>=0;});
    if(!view.selecionado)return '<label class="con-busca">Buscar '+(view.aba==='produtos'?'produto ou ingrediente ativo':view.aba==='alvos'?'alvo':'projeto')+'<input id="conBusca" type="search" value="'+e(view.busca)+'" autocomplete="off" placeholder="Digite um nome ou código"></label>'+
      '<div id="conLista">'+(vis.length?'<div class="con-catalogo">'+vis.map(function(x){return bot('selecionar','<b>'+e(x.nome)+'</b><span>'+x.estudos.length+' estudo'+(x.estudos.length===1?'':'s')+(x.tipo?' · '+(x.tipo==='ativo'?'ingrediente ativo':x.identificado?'item cadastrado':'texto do protocolo'):'')+'</span>','data-key="'+e(x.key)+'"','card');}).join('')+'</div>':vazio(view.aba==='projetos'?'Associe os estudos a um mesmo projeto na ficha de contexto.':'Nenhum registro encontrado. Nomes livres permanecem separados até a confirmação da identidade.'))+'</div>';
    var selected=idx.find(function(x){return x.key===view.selecionado;}),op={};
    if(!selected)return vazio('Este registro não está mais disponível.');
    if(view.aba==='produtos')op.produto=selected.key;else if(view.aba==='alvos')op.alvo=selected.nome;else op.projeto=selected.nome;
    var base=C.selecionar(acervo,op),xs=C.selecionar(acervo,Object.assign({},op,view.filtro));
    return bot('voltar','‹ '+(view.aba==='produtos'?'Produtos':view.aba==='alvos'?'Alvos':'Projetos'))+'<h2>'+e(selected.nome)+'</h2>'+filtros(base)+listaEstudos(xs)+tabela(C.resultados(xs,Object.assign({},op,view.filtro)));
  }
  function climaHtml(c){
    if(!c)return '<span>Sem clima registrado</span>';
    var vs=[];[['temp','°C'],['ur','% UR'],['vento','km/h'],['chuva','mm'],['vpd','kPa VPD']].forEach(function(p){if(c[p[0]]!=null)vs.push(n(c[p[0]])+' '+p[1]);});
    return e(vs.join(' · ')||'Sem valores')+'<small>'+e(c.fonte||'Fonte não informada')+(c.histor?(c.instante?' · leitura do instante':' · resumo diário'):'')+(c.defasagem_s>120?' · defasagem de '+n(c.defasagem_s/60)+' min':'')+'</small>';
  }
  function contextoHtml(s){
    var h='<h3>Aplicações, ambiente e avaliações</h3>',ev=C.ambiente(s);
    if(!ev.length)h+=vazio('Sem aplicações ou avaliações com resultados.');
    h+='<ol class="con-tempo">'+ev.map(function(a){
      var pos=a.pos,pg='';if(pos){pg='<div class="con-note">Chuva '+n(pos.chuvaMm)+' mm / '+n(pos.horas)+' h'+(pos.primeiraChuvaHoras!=null?' · primeira chuva em '+n(pos.primeiraChuvaHoras)+' h':'')+'. '+(!pos.horaConhecida?'Inclui o dia inteiro; hora da aplicação ausente. ':'')+(!pos.completa?'Janela parcial. ':'')+(pos.coberturaPct<100?'Cobertura '+n(pos.coberturaPct)+'%. ':'')+'</div>';}
      return '<li><b>'+dataBR(a.data)+' '+e(a.hora||'')+' · '+e(a.tipo)+(a.momento?' · '+e(a.momento):'')+'</b><div>'+climaHtml(a.clima)+'</div>'+pg+(a.ndvi&&a.ndvi.ndvi!=null?'<small>NDVI '+n(a.ndvi.ndvi)+' · imagem de '+dataBR(a.ndvi.data)+'. Leitura da área, respeitando a resolução do satélite.</small>':'')+'</li>';
    }).join('')+'</ol>';
    if(s.ambiente==='campo'){
      var solo=s.solo||{},a=C.soloNoInicio(solo.analises,s.inicio),cart=solo.cartografico||{},r=a&&a.resultados||{};
      h+='<h3>Solo e histórico da área</h3>'+(a?'<p>Laudo de '+dataBR(a.data)+' · '+e(a.laboratorio||'Laboratório não informado')+' · '+e(a.profundidade==null?'Não informada':a.profundidade)+' cm</p><div class="con-fatos">'+Object.keys(r).map(function(k){return '<span><b>'+e((lista(w.SOLO_ANALISE_CAMPOS).find(function(c){return c.k===k;})||{}).rot||k)+'</b> '+n(C.numero(r[k]))+' '+e((lista(w.SOLO_ANALISE_CAMPOS).find(function(c){return c.k===k;})||{}).un||'')+'</span>';}).join('')+'</div>':vazio('Sem análise de solo datada até o início deste estudo.'))+
        (cart.classe?'<p>Classe cartográfica: '+e(cart.classe)+'</p>':'')+'<p class="con-note">A análise de solo é da área e da profundidade coletada. O mapa pedológico não substitui o laudo nem mede diferenças entre parcelas.</p>';
      var anteriores=acervo.estudos.filter(function(x){return x.qid===s.qid&&x.key!==s.key&&x.inicio&&s.inicio&&x.inicio<=s.inicio;});
      if(anteriores.length)h+='<h4>Estudos anteriores na mesma área</h4>'+listaEstudos(anteriores);
    }
    return h;
  }
  var campos=[['projeto','Projeto / linha de pesquisa'],['cliente','Cliente do estudo'],['materialBiologico','População, espécie ou isolado'],['origemBiologica','Origem do material biológico'],['loteBiologico','Lote / geração / passagem'],['metodoLaboratorio','Método de laboratório']];
  function integracoesHtml(s){
    var es=C.estado(s.integracoes),h='<h3>Ligação entre laboratório e campo</h3><p>Use o mesmo projeto nos estudos que pertencem à mesma investigação. Produto e alvo já ligam o histórico automaticamente.</p><form id="conCampos" class="con-form">';
    campos.forEach(function(p){h+='<label>'+p[1]+'<input name="'+p[0]+'" value="'+e(es.campos[p[0]]||'')+'"'+(s.finalizado?' disabled':'')+'></label>';});
    h+='</form>'+(s.finalizado?'<p class="con-note">Estudo finalizado: o contexto registrado está em leitura.</p>':bot('salvarCampos','Salvar contexto','data-key="'+e(s.key)+'"'));
    var outros=es.campos.projeto?C.selecionar(acervo,{projeto:es.campos.projeto}).filter(function(x){return x.key!==s.key;}):[];
    if(outros.length)h+='<h4>Estudos ligados ao projeto</h4>'+listaEstudos(outros);
    return h;
  }
  function custosHtml(s){
    var c=C.custo(s.consumos,s.integracoes),h='<h3>Custo do estudo</h3><p><strong>'+dinheiro(c.total)+'</strong> '+(c.completo?'em registros com preço':c.semPreco?'· subtotal; '+c.semPreco+' registro(s) sem preço':'· nenhum custo registrado')+'</p>';
    if(c.linhas.length){
      [['tratamento','Por tratamento'],['aplicacao','Por aplicação']].forEach(function(p){
        h+='<h4>'+p[1]+'</h4><div class="con-fatos">'+C.agruparCustos(c,p[0]).map(function(g){var ap=p[0]==='aplicacao'&&s.aplicacoes.find(function(a){return a.id===g.nome;});return '<span><b>'+e(ap?'Aplicação '+dataBR(ap.data):g.nome)+'</b> '+dinheiro(g.total)+(g.semPreco?' · subtotal':'')+'</span>';}).join('')+'</div>';
      });
    }
    if(c.linhas.length)h+='<div class="con-scroll"><table><thead><tr><th>Origem</th><th>Quantidade</th><th>Preço unitário</th><th>Total</th><th>Ação</th></tr></thead><tbody>'+c.linhas.map(function(r){return '<tr><td>'+e(r.descricao)+'<small>'+e(r.categoria)+(r.origem?' · '+e(r.origem):'')+(r.lote?' · lote '+e(r.lote):'')+(r.tratamento?' · '+e(r.tratamento):'')+'</small></td><td>'+n(r.quantidade)+' '+e(r.unidade||'')+'</td><td>'+dinheiro(r.preco)+'</td><td>'+dinheiro(r.valor)+'</td><td>'+(s.finalizado?'':r.origem?bot('preco','Informar preço','data-key="'+e(s.key)+'" data-consumo="'+e(r.id)+'"'):bot('estornar','Estornar','data-key="'+e(s.key)+'" data-evento="'+e(r.id)+'"'))+'</td></tr>';}).join('')+'</tbody></table></div>';
    h+='<p class="con-note">Produtos usam as quantidades efetivamente baixadas dos lotes. Preço ausente não é custo zero. Horas de equipe e equipamento são lançadas separadamente; estimativas não alteram o estoque.</p>';
    if(!s.finalizado)h+='<details><summary>Adicionar horas ou despesa</summary><form id="conCusto" class="con-form"><label>Categoria<select name="categoria"><option>Equipe</option><option>Equipamento</option><option>Serviço</option><option>Outro</option></select></label><label>Descrição<input name="descricao" required maxlength="200"></label><label>Quantidade<input name="quantidade" inputmode="decimal" value="1" required></label><label>Unidade<input name="unidade" placeholder="hora, análise, diária…" required></label><label>Valor por unidade (R$)<input name="valorUnitario" inputmode="decimal" required></label><label>Data<input type="date" name="data" required value="'+e(typeof w.todayISO==='function'?w.todayISO():'')+'"></label></form>'+bot('salvarCusto','Registrar custo','data-key="'+e(s.key)+'"')+'</details>';
    return h;
  }
  function ficha(){
    var s=achar(view.estudo);if(!s)return vazio('O estudo não está disponível.');
    if(w.AgEstudoPagina)return w.AgEstudoPagina.render(s,{tabela:tabela(C.resultados([s],{})),contexto:contextoHtml(s),integracoes:integracoesHtml(s),custos:custosHtml(s)});
    return bot('voltar','‹ Conhecimento')+'<div class="con-titulo"><div><h2>'+e(s.codigo)+'</h2><p>'+e(s.cultura||'Sem cultura')+' · '+e(s.alvo||'Sem alvo')+' · '+e(s.local)+' · '+e(s.quadra)+'</p></div>'+bot('original','Abrir estudo','data-key="'+e(s.key)+'"')+'</div><p class="con-note">'+e(s.desenho)+' · '+e(s.metodo)+' · '+(s.finalizado?'Finalizado':'Em execução')+'</p>'+tabela(C.resultados([s],{}))+
      contextoHtml(s)+integracoesHtml(s)+custosHtml(s);
  }
  function pintar(){
    var ov=document.getElementById('conhecimentoOvl');if(!ov||ov.hidden)return;
    var abas=[['produtos','Produtos e ativos'],['alvos','Alvos'],['projetos','Projetos'],['estudos','Estudos'],['fontes','Fontes']];
    if(typeof w.isAdmin==='function'&&w.isAdmin())abas.push(['clientes','Clientes']);
    ov.innerHTML='<section class="con-shell"><header class="con-head"><div><p>AGRACTA</p><h1>Conhecimento experimental</h1></div>'+bot('fechar','Fechar ×')+'</header><nav aria-label="Conhecimento">'+abas.map(function(a){return bot('aba',a[1],'data-aba="'+a[0]+'" aria-current="'+(view.aba===a[0]?'page':'false')+'"',view.aba===a[0]?'ativo':'');}).join('')+'</nav><p id="conhecimentoAviso" role="status" aria-live="polite"></p><main>'+
      (view.estudo?ficha():view.aba==='estudos'?abaEstudos():view.aba==='fontes'?(w.agFontesHtml?w.agFontesHtml():vazio('Fontes indisponíveis.')):view.aba==='clientes'?(w.agClientesHtml?w.agClientesHtml(acervo):vazio('Gestão de clientes indisponível.')):selecao())+'</main></section>';
  }
  function adicionar(key,eventos){
    var s=achar(key);if(!s)throw Error('Estudo não encontrado.');
    var st=lista((w.data[s.qid]||{}).estudos).find(function(x){return x.id===s.sid;});
    if(!st||st.finalizacao&&st.finalizacao.em)throw Error('Este estudo está finalizado.');
    var por=typeof w._currentUserName==='function'?w._currentUserName():'Não identificado',ts=Date.now();
    var ev=eventos.map(function(x){return Object.assign({},x,{id:typeof w.uid==='function'?w.uid():crypto.randomUUID(),ts:ts,por:por});});
    st.integracoes=C.merge(st.integracoes,{eventos:ev});st._ts=ts;
    if(w.logStudyAuditInObject)w.logStudyAuditInObject(st,'integrações.registro',ev.map(function(x){return x.tipo+(x.chave?' · '+x.chave:'')+(x.descricao?' · '+x.descricao:'');}).join('; '));
    if(w.save()===false)throw Error('O registro foi mantido em memória, mas o armazenamento local falhou. Confira a sincronização.');
    if(w.dbUpsertEstudo)w.dbUpsertEstudo(s.qid,st);
    construir();pintar();msg('Registro salvo com autoria e data.');
  }
  function form(id){var f=document.getElementById(id);if(!f)return {};var o={};new FormData(f).forEach(function(v,k){o[k]=String(v).trim();});return o;}
  async function acao(b){
    var a=b.dataset.con,key=b.dataset.key;
    if(a==='fechar')return fechar();
    if(a==='aba'){view.aba=b.dataset.aba;view.estudo='';view.selecionado='';view.filtro={};view.busca='';pintar();return;}
    if(a==='voltar'){if(view.estudo)view.estudo='';else view.selecionado='';pintar();return;}
    if(a==='selecionar'){view.selecionado=key;view.filtro={};pintar();return;}
    if(a==='estudo'){view.estudo=key;pintar();var ov=document.getElementById('conhecimentoOvl');if(ov)ov.scrollTop=0;return;}
    if(a==='original'){var st=achar(key);fechar();if(st)w.openStudyDetail(st.qid,st.sid);return;}
    if(a==='estado'){view.estadoEstudo=b.dataset.estado;pintar();return;}
    if(a==='estFinalizar'||a==='estReabrir'||a==='estExcluir'){
      var alvo=achar(key);if(!alvo)throw Error('Este estudo não está mais disponível.');
      var fn=w[{estFinalizar:'finalizarEstudo',estReabrir:'reabrirEstudo',estExcluir:'confirmDeleteStudy'}[a]];
      if(typeof fn!=='function')throw Error('Esta ação não está disponível nesta tela.');
      /* Fecha antes: senha, rubrica e a ficha do estudo vivem na tela do Agracta. */
      fechar();fn(alvo.qid,alvo.sid);return;
    }
    if(a==='salvarCampos'){
      var dados=form('conCampos'),at=C.estado(achar(key).integracoes).campos;
      var changes=campos.filter(function(p){return (dados[p[0]]||'')!==(at[p[0]]||'');}).map(function(p){return {tipo:'campo',chave:p[0],valor:dados[p[0]]||''};});
      if(changes.length)adicionar(key,changes);else msg('Nenhuma alteração.');return;
    }
    if(a==='salvarCusto'){
      var c=form('conCusto'),q=C.numero(c.quantidade),v=C.numero(c.valorUnitario);
      if(!c.descricao||!c.unidade||!c.data||q===null||q<=0||v===null||v<0)throw Error('Informe descrição, data, unidade, quantidade positiva e valor não negativo.');
      adicionar(key,[Object.assign({},c,{tipo:'custo',quantidade:q,valorUnitario:v})]);return;
    }
    if(a==='preco'){
      var consumo=achar(key).consumos.find(function(x){return x.id===b.dataset.consumo;});if(!consumo)return;
      var raw=w.prompt('Preço em R$ por '+consumo.unidade+' de '+consumo.descricao+'. Fica registrado para este consumo.','');
      if(raw===null)return;var pr=C.numero(raw);if(pr===null||pr<0)throw Error('Informe um preço não negativo.');
      adicionar(key,[{tipo:'preco',chave:consumo.id,valor:pr,unidade:consumo.unidade}]);return;
    }
    if(a==='estornar'){if(w.confirm('Estornar este custo? O registro original permanecerá no histórico.'))adicionar(key,[{tipo:'estorno',alvo:b.dataset.evento}]);return;}
    if(a.indexOf('cliente')===0&&w.agClientesAcao)return w.agClientesAcao(a,b,acervo);
    if(a.indexOf('fonte')===0&&w.agFontesAcao)return w.agFontesAcao(a,b);
  }
  document.addEventListener('click',function(ev){
    var target=ev.target.closest&&ev.target.closest('[data-ag-conhecimento-item],[data-ag-conhecimento-qid],[data-ag-conhecimento-busca]');
    if(target){
      if(target.dataset.agConhecimentoItem)abrir(target.dataset.agConhecimentoItem);
      else abrir({qid:target.dataset.agConhecimentoQid,sid:target.dataset.agConhecimentoSid,busca:target.dataset.agConhecimentoBusca});
      return;
    }
    var b=ev.target.closest&&ev.target.closest('#conhecimentoOvl [data-con]');if(b)Promise.resolve().then(function(){return acao(b);}).catch(function(err){msg(err.message||'Não foi possível concluir.');});
  });
  document.addEventListener('input',function(ev){if(ev.target.id!=='conBusca')return;view.busca=ev.target.value;
    var old=document.getElementById('conLista'),tmp=document.createElement('div');tmp.innerHTML=selecao();var next=tmp.querySelector('#conLista');if(old&&next)old.innerHTML=next.innerHTML;
  });
  document.addEventListener('change',function(ev){var f=ev.target.dataset.conFiltro;if(f){view.filtro[f]=ev.target.value;pintar();}});
  document.addEventListener('keydown',function(ev){
    var ov=document.getElementById('conhecimentoOvl');if(!ov||ov.hidden)return;
    if(ev.key==='Escape'){ev.preventDefault();fechar();}
    if(ev.key==='Tab'){var xs=Array.from(ov.querySelectorAll('button,input,select,summary,a[href]')).filter(function(x){return !x.disabled&&x.getClientRects().length;});
      if(!xs.length)return;var first=xs[0],last=xs[xs.length-1];if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}
  });
  w.abrirConhecimento=abrir;
  w.agConhecimento={construir:construir,projetar:projetar,pintar:pintar,adicionar:adicionar,esc:e,numero:n,dinheiro:dinheiro,msg:msg,bot:bot};
})(window);
