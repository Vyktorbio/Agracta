/* Compartilhamento explícito. Clientes nunca entram como membros do workspace. */
(function(w){
  'use strict';
  var C=w.ConhecimentoCore,P=w.PortalCore,portais=[],edicao=null,rascunho=null,confirmado=null,autoFila=Promise.resolve();
  function ui(){return w.agConhecimento;}function e(x){return ui().esc(x);}
  function admin(){if(!w.isAdmin||!w.isAdmin())throw Error('Somente o administrador pode alterar acessos.');}
  function db(){if(!w.firebase||!w.firebase.apps.length||!w.firebase.auth().currentUser)throw Error('Entre online para gerenciar a consulta do cliente.');return w.firebase.firestore();}
  function url(id){var u=new URL('cliente.html',location.href);u.searchParams.set('portal',id);return u.href;}
  function b(a,t,attrs){return ui().bot(a,t,attrs);}
  w.agClientesHtml=function(acervo){
    if(!w.isAdmin||!w.isAdmin())return '';
    var x=edicao||{nome:'',emails:[],studies:[],auto:true};
    return '<h2>Consulta do cliente</h2><p>Escolha os estudos e os e-mails autorizados. A página apresenta resultados, tratamentos e ambiente; cada cliente recebe apenas a seleção aprovada.</p>'+b('clienteCarregar','Carregar consultas')+' '+b('clienteNova','Nova consulta')+
      '<div class="con-estudos">'+portais.map(function(p){return b('clienteEditar','<b>'+e(p.nome)+'</b><span>'+p.studies.length+' estudos · '+(p.active?'ativa':'revogada')+'</span>','data-portal="'+e(p.id)+'"');}).join('')+'</div>'+
      '<section class="con-painel"><h3>'+e(edicao?'Editar consulta':'Preparar consulta')+'</h3><form id="clienteForm"><div class="con-form"><label>Nome da consulta<input name="nome" maxlength="120" value="'+e(x.nome)+'" required placeholder="Projeto / cliente"></label><label>E-mails autorizados<textarea name="emails" placeholder="Um por linha">'+e((x.emails||[]).join('\n'))+'</textarea></label></div><label class="con-check"><input type="checkbox" name="auto"'+(x.auto?' checked':'')+'>Atualizar os resultados após a equipe sincronizar os estudos.</label><div class="con-catalogo">'+acervo.estudos.map(function(s){return '<label class="con-check"><input type="checkbox" name="estudo" value="'+e(s.key)+'"'+(x.studies.indexOf(P.id(s.key))>=0?' checked':'')+'><span><b>'+e(s.codigo)+'</b><small>'+e(s.cultura)+' · '+e(s.alvo)+' · '+e(s.local)+'</small></span></label>';}).join('')+'</div></form>'+b('clienteRevisar','Revisar seleção')+(edicao?' '+b('clienteRevogar','Revogar acesso','data-portal="'+e(edicao.id)+'"')+' <a target="_blank" rel="noopener noreferrer" href="'+e(url(edicao.id))+'">Abrir página do cliente</a>':'')+'<div id="clienteRevisao"></div></section>';
  };
  async function carregar(){
    admin();var snap=await db().collection('clientPortals').get({source:'server'});portais=[];
    snap.forEach(function(d){portais.push(Object.assign({id:d.id},d.data()));});ui().pintar();
  }
  function projetado(state,key){
    var par;try{par=JSON.parse(key);}catch(err){return null;}
    var q=state&&state.data&&state.data[par[0]],s=q&&C.lista(q.estudos).find(function(st){return st.id===par[1];});
    return s?ui().projetar(par[0],s,q,state):null;
  }
  function relatorios(state,keys,rev){
    return keys.map(function(key){var s=projetado(state,key);if(!s)throw Error('Um estudo selecionado não existe mais. Revise a seleção.');
      return {id:P.id(key),dados:Object.assign(C.relatorioCliente(s),{sourceRev:rev,publicadoEm:w.firebase.firestore.FieldValue.serverTimestamp()})};
    });
  }
  async function sincronizar(){
    if(!navigator.onLine)throw Error('Conecte-se para confirmar os dados antes de compartilhar.');
    var antes=confirmado;await w.cloudSave();
    if(!confirmado||confirmado===antes)throw Error('Aguarde a sincronização terminar e tente novamente.');
    return confirmado;
  }
  w.agClientesAcao=async function(a,bot,acervo){
    admin();
    if(a==='clienteCarregar')return carregar();
    if(a==='clienteNova'){edicao=null;rascunho=null;ui().pintar();return;}
    if(a==='clienteEditar'){
      var x=portais.find(function(p){return p.id===bot.dataset.portal;});if(!x)return;
      var ms=await db().collection('clientPortals').doc(x.id).collection('members').get({source:'server'}),emails=[];
      ms.forEach(function(d){if(d.data().active)emails.push(d.id);});edicao=Object.assign({},x,{emails:emails});rascunho=null;ui().pintar();return;
    }
    if(a==='clienteRevisar'){
      var form=document.getElementById('clienteForm'),fd=new FormData(form);
      rascunho=P.validar({nome:fd.get('nome'),emails:fd.get('emails'),estudos:fd.getAll('estudo'),auto:fd.has('auto')});
      document.getElementById('clienteRevisao').innerHTML='<h4>O cliente terá acesso a</h4><p>'+e(rascunho.nome)+' · '+e(rascunho.emails.join(', '))+'</p><ul>'+rascunho.estudos.map(function(key){var s=acervo.estudos.find(function(x){return x.key===key;});return '<li>'+e(s.codigo)+' · '+s.resultados.length+' resultados'+(s.finalizado?' · finalizado':' · em execução')+'</li>';}).join('')+'</ul><p>'+ (rascunho.auto?'Novos resultados desses estudos serão incluídos após a sincronização da equipe.':'Os resultados serão atualizados quando você salvar esta seleção novamente.')+'</p><p class="con-note">Revise a seleção completa: tratamentos de comparação e nomes de produtos também serão visíveis. O cliente precisa entrar com um dos e-mails autorizados e verificá-lo.</p>'+b('clientePublicar','Confirmar seleção e liberar consulta');return;
    }
    if(a==='clientePublicar'){
      if(!rascunho)throw Error('Revise a seleção primeiro.');
      var now=new FormData(document.getElementById('clienteForm'));
      var novo=P.validar({nome:now.get('nome'),emails:now.get('emails'),estudos:now.getAll('estudo'),auto:now.has('auto')});
      if(JSON.stringify(novo)!==JSON.stringify(rascunho))throw Error('A seleção mudou. Revise novamente.');
      var plano=rascunho,orig=edicao&&edicao.id;ui().msg('Confirmando a sincronização…');
      var s=await sincronizar(),reports=relatorios(s.state,plano.estudos,s.rev),base=db().collection('clientPortals'),ref=orig?base.doc(orig):base.doc();
      var antigos=await ref.collection('members').get({source:'server'}),batch=db().batch();
      var accessVersion=crypto.randomUUID();
      batch.set(ref,{nome:plano.nome,active:true,auto:plano.auto,studies:reports.map(function(r){return r.id;}),schema:1,accessVersion:accessVersion});
      antigos.forEach(function(d){if(plano.emails.indexOf(d.id)<0)batch.delete(d.ref);});
      plano.emails.forEach(function(mail){batch.set(ref.collection('members').doc(mail),{active:true,accessVersion:accessVersion});});
      reports.forEach(function(r){batch.set(ref.collection('reports').doc(r.id),r.dados);});
      await batch.commit();edicao=null;rascunho=null;await carregar();ui().msg('Consulta liberada: '+url(ref.id));return;
    }
    if(a==='clienteRevogar'){
      if(!w.confirm('Revogar o acesso a esta consulta?'))return;
      await db().collection('clientPortals').doc(bot.dataset.portal).update({active:false,auto:false});edicao=null;await carregar();ui().msg('A consulta foi revogada.');
    }
  };
  async function atualizarAutomaticamente(s){
    var snap=await db().collection('clientPortals').where('auto','==',true).get({source:'server'}),ps=[];
    snap.forEach(function(d){if(d.data().active)ps.push({ref:d.ref,config:d.data()});});
    for(var p of ps){
      // Transação também lê a configuração: uma revogação concorrente vence.
      await db().runTransaction(async function(tx){
        var cfg=await tx.get(p.ref);if(!cfg.exists||!cfg.data().active||!cfg.data().auto)return;
        var studies=cfg.data().studies||[],writes=[];
        for(var id of studies){
          var ref=p.ref.collection('reports').doc(id),old=await tx.get(ref),key;
          try{key=decodeURIComponent(id);}catch(err){continue;}
          // Não recriar uma cópia antiga após outro aparelho publicar revisão mais nova.
          if(old.exists&&old.data().sourceRev>s.rev)continue;
          var src=projetado(s.state,key);
          if(!src){writes.push({ref:ref,remove:true});continue;}
          var dados=Object.assign(C.relatorioCliente(src),{sourceRev:s.rev,publicadoEm:w.firebase.firestore.FieldValue.serverTimestamp()});
          if(old.exists){var anterior=Object.assign({},old.data()),atual=Object.assign({},dados);delete anterior.sourceRev;delete anterior.publicadoEm;delete atual.sourceRev;delete atual.publicadoEm;if(JSON.stringify(anterior)===JSON.stringify(atual))continue;}
          writes.push({ref:ref,dados:dados});
        }
        writes.forEach(function(x){if(x.remove)tx.delete(x.ref);else tx.set(x.ref,x.dados);});
      });
    }
  }
  w.addEventListener('agracta:sincronizado',function(ev){
    confirmado=ev.detail;var s=ev.detail;
    autoFila=autoFila.then(function(){return atualizarAutomaticamente(s);}).catch(function(err){
      // Falhar no portal não reverte uma gravação de pesquisa já confirmada.
      ui().msg('Estudos salvos. A consulta do cliente não foi atualizada: '+(err.code==='permission-denied'?'confira a publicação das regras de acesso.':err.message));
    });
  });
})(window);
