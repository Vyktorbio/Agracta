/* Página isolada: sem workspace, caches de pesquisa, app.js ou biblioteca de itens. */
(function(){
  'use strict';
  var app=firebase.initializeApp(window.AGRACTA_FIREBASE_CONFIG,'agracta-cliente'),auth=app.auth(),db=app.firestore();
  var portal=new URL(location.href).searchParams.get('portal'),stops=[],reportStops=[],reports=new Map(),geracao=0,reportGeracao=0,authPronto;
  function el(id){return document.getElementById(id);}function status(t){el('clienteStatus').textContent=t;}
  function e(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function n(x){return typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('pt-BR',{maximumFractionDigits:3}):'—';}
  function limparReports(){reportGeracao++;reportStops.forEach(function(f){f();});reportStops=[];reports.clear();el('clienteConteudo').replaceChildren();}
  function limpar(){geracao++;stops.forEach(function(f){f();});stops=[];limparReports();el('clienteTitulo').textContent='Consulta do cliente';}
  function erro(err){status(err&&err.code==='permission-denied'?'Este e-mail não tem acesso a esta consulta, ou o acesso foi revogado.':err&&/^auth\//.test(err.code||'')?'Não foi possível entrar. Confira o e-mail, a senha e a conexão.':'Não foi possível carregar a consulta. Confira sua conexão e tente novamente.');}
  function seguro(fn){return function(ev){if(ev)ev.preventDefault();Promise.resolve().then(fn).catch(erro);};}
  function clima(c){
    if(!c)return 'Sem clima registrado';var vs=[];
    [['temp','°C'],['ur','% UR'],['vento','km/h'],['chuva','mm'],['vpd','kPa VPD']].forEach(function(x){if(typeof c[x[0]]==='number')vs.push(n(c[x[0]])+' '+x[1]);});
    return e(vs.join(' · '))+'<small>'+e(c.fonte)+(c.histor?(c.instante?' · leitura do instante':' · resumo diário'):'')+(c.defasagem_s>120?' · defasagem '+n(c.defasagem_s/60)+' min':'')+'</small>';
  }
  function render(){
    el('clienteConteudo').innerHTML=Array.from(reports.values()).sort(function(a,b){return String(a.codigo).localeCompare(String(b.codigo),'pt-BR');}).map(function(s){
      var rs=s.resultados||[],av=new Map();rs.forEach(function(r){var key=JSON.stringify([r.avaliacao,r.data,r.hora,r.momento,r.variavel,r.unidade]);if(!av.has(key))av.set(key,[]);av.get(key).push(r);});
      return '<article class="cli-report"><h2>'+e(s.codigo)+'</h2><p>'+e(s.cultura)+' · '+e(s.alvo)+' · '+e(s.local)+' · '+(s.finalizado?'Finalizado':'Em execução')+'</p><p>'+e(s.desenho)+' · '+e(s.ambiente==='laboratorio'?'Laboratório':'Campo')+'</p><p class="con-note">Atualização: '+e(s.publicadoEm&&s.publicadoEm.toDate?s.publicadoEm.toDate().toLocaleString('pt-BR'):'não informada')+'</p>'+
        (rs.length?Array.from(av.values()).map(function(xs){var ref=xs[0],max=Math.max.apply(null,xs.map(function(r){return r.media;}));
          var bars=xs.every(function(r){return typeof r.media==='number'&&r.media>=0;})&&max>0?'<details><summary>Gráfico das médias desta avaliação</summary><ul class="cli-bars">'+xs.map(function(r){return '<li><span>'+e(r.tratamento)+' · '+e(r.produto)+' · '+n(r.media)+' '+e(r.unidade)+'</span><i aria-hidden="true" class="cli-bar" style="width:'+Math.max(0,Math.min(100,r.media/max*100))+'%"></i></li>';}).join('')+'</ul><p class="con-note">Escala de zero a '+n(max)+'. Comparação descritiva; não indica diferença estatística.</p></details>':'';
          return '<h3>'+e(ref.variavel)+' · '+e(ref.data)+' '+e(ref.hora)+(ref.momento?' · '+e(ref.momento):' · momento não declarado')+'</h3><div class="con-scroll"><table><thead><tr><th>Tratamento</th><th>Produto / dose / método</th><th>n</th><th>Média</th><th>DP</th><th>Controle</th></tr></thead><tbody>'+xs.map(function(r){return '<tr><td>'+e(r.tratamento)+(r.testemunha?'<small>Testemunha</small>':'')+'</td><td>'+e(r.produto)+'<small>'+e(r.dose)+' · '+e(r.metodo)+'</small></td><td>'+n(r.n)+'</td><td>'+n(r.media)+' '+e(r.unidade)+'</td><td>'+n(r.dp)+'</td><td>'+(r.controle==null?'—':n(r.controle)+'%')+'</td></tr>';}).join('')+'</tbody></table></div>'+bars;
        }).join(''):'<p class="con-empty">Sem resultados lançados.</p>')+'<h3>Aplicações e ambiente</h3><ol class="con-tempo">'+(s.ambienteEventos||[]).map(function(a){return '<li><b>'+e(a.tipo)+' · '+e(a.data)+' '+e(a.hora)+'</b><div>'+clima(a.clima)+'</div>'+(a.pos?'<small>Chuva '+n(a.pos.chuvaMm)+' mm / '+n(a.pos.horas)+' h'+(!a.pos.completa?' · janela parcial':'')+(!a.pos.horaConhecida?' · inclui o dia inteiro; hora ausente':'')+' · cobertura '+n(a.pos.coberturaPct)+'%</small>':'')+'</li>';}).join('')+'</ol><p class="con-note">'+e(s.nota)+'</p>'+(s.pendencias&&s.pendencias.length?'<p class="con-note">Pendências: '+s.pendencias.map(e).join(' · ')+'</p>':'')+'</article>';
    }).join('');
  }
  function iniciar(user){
    limpar();el('clienteLogin').hidden=!!user;el('clienteSair').hidden=!user;el('clienteVerificacao').hidden=!user||user.emailVerified;
    if(!portal||!/^[A-Za-z0-9_-]{1,100}$/.test(portal)){status('Abra o link da consulta que o responsável pelo estudo compartilhou.');return;}
    if(!user){status('Entre para consultar os estudos autorizados.');return;}
    if(!user.emailVerified){status('Confirme o endereço de e-mail antes de acessar.');return;}
    if(!navigator.onLine){status('Conecte-se para verificar o acesso e consultar os resultados.');return;}
    var g=geracao,ref=db.collection('clientPortals').doc(portal),memberOK=false,config=null;
    function atualizar(){
      if(g!==geracao)return;limparReports();if(!config||!memberOK)return;
      el('clienteTitulo').textContent=config.nome;status('Resultados dos estudos autorizados.');
      var rg=reportGeracao;
      (config.studies||[]).forEach(function(id){reportStops.push(ref.collection('reports').doc(id).onSnapshot({includeMetadataChanges:true},function(snap){
        if(g!==geracao||rg!==reportGeracao)return;if(snap.metadata.fromCache){reports.delete(id);render();return;}
        if(snap.exists)reports.set(id,snap.data());else reports.delete(id);render();
      },function(err){if(g!==geracao||rg!==reportGeracao)return;limparReports();erro(err);}));});
    }
    stops.push(ref.onSnapshot({includeMetadataChanges:true},function(snap){
      if(g!==geracao)return;
      if(snap.metadata.fromCache){config=null;limparReports();status('Verificando o acesso…');return;}
      if(!snap.exists||!snap.data().active){limpar();status('Esta consulta foi revogada ou não está disponível.');return;}
      config=snap.data();memberOK=false;limparReports();
      ref.collection('members').doc(user.email.toLowerCase()).get({source:'server'}).then(function(m){
        if(g!==geracao)return;memberOK=m.exists&&m.data().active&&m.data().accessVersion===config.accessVersion;atualizar();
      }).catch(function(err){if(g===geracao){limparReports();erro(err);}});
    },function(err){if(g===geracao){limpar();erro(err);}}));
    stops.push(ref.collection('members').doc(user.email.toLowerCase()).onSnapshot({includeMetadataChanges:true},function(snap){
      if(g!==geracao||snap.metadata.fromCache)return;
      if(!snap.exists||!snap.data().active){limpar();status('O acesso a esta consulta foi revogado.');return;}
      if(config){memberOK=snap.data().accessVersion===config.accessVersion;atualizar();}
    },function(err){if(g===geracao){limpar();erro(err);}}));
  }
  authPronto=auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
  auth.onAuthStateChanged(iniciar,erro);
  el('clienteAuth').addEventListener('submit',seguro(async function(){await authPronto;await auth.signInWithEmailAndPassword(el('clienteEmail').value.trim(),el('clienteSenha').value);el('clienteSenha').value='';}));
  el('clienteCriar').addEventListener('click',seguro(async function(){if(!el('clienteAuth').reportValidity())return;await authPronto;await auth.createUserWithEmailAndPassword(el('clienteEmail').value.trim(),el('clienteSenha').value);el('clienteSenha').value='';}));
  el('clienteRecuperar').addEventListener('click',seguro(async function(){if(!el('clienteEmail').reportValidity())return;await auth.sendPasswordResetEmail(el('clienteEmail').value.trim());status('Se o endereço tiver uma conta, verifique as instruções enviadas por e-mail.');}));
  el('clienteEnviarVerificacao').addEventListener('click',seguro(async function(){await auth.currentUser.sendEmailVerification();status('Confirmação enviada. Confira seu e-mail.');}));
  el('clienteVerificado').addEventListener('click',seguro(async function(){await auth.currentUser.reload();await auth.currentUser.getIdToken(true);iniciar(auth.currentUser);}));
  el('clienteSair').addEventListener('click',seguro(async function(){limpar();await auth.signOut();}));
  window.addEventListener('offline',function(){limpar();status('Conecte-se para verificar o acesso e consultar os resultados.');});
  window.addEventListener('online',function(){iniciar(auth.currentUser);});
})();
