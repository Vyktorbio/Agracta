/* Agracta — casca de mesa: a coluna de seções da tela larga.
 *
 * POR QUE EXISTE
 * --------------
 * No campo, uma tela de cada vez está certo: o mapa ocupa tudo e a navegação
 * fica no polegar. Na mesa, esse mesmo desenho obriga a fechar o que está
 * aberto toda vez que se troca de assunto — e a próxima porta some da vista.
 * Esta coluna deixa as seções sempre visíveis.
 *
 * O QUE ELA NÃO É
 * ---------------
 * Não é tela nova, e não é menu novo. Cada item abre exatamente a porta que já
 * existe: Estudos abre o Conhecimento na aba Estudos (a lista que tem gráficos,
 * vista do campo e estatística — a outra, paralela, foi removida de propósito),
 * Clima abre o painel de clima, Insights e Relatórios abrem seções do dossiê do
 * estudo em foco, Configurações abre a gaveta do menu.
 *
 * Por isso a barra de baixo perde, aqui, os botões Conhecimento e Menu: quem
 * mandou neles agora é a coluna. Duas portas para a mesma tela já confundiu uma
 * vez, e o teste test_atalho_conhecimento.js existe por causa disso.
 *
 * INSIGHTS E RELATÓRIOS SÃO DO ESTUDO, NÃO DA ORGANIZAÇÃO
 * ------------------------------------------------------
 * Não existe "insight" solto: análise, forense e relatório pertencem a um
 * estudo. A coluna guarda qual estudo está em foco (o dossiê aberto, ou o
 * último aberto neste uso) e, quando não há nenhum, ela diz isso e leva para
 * Estudos — em vez de abrir uma tela vazia que parece defeito.
 *
 * ONDE ELA SE DESLIGA
 * -------------------
 * Abaixo de 1100px e antes da autenticação não existe coluna nenhuma: o
 * <html> só recebe a classe .mesa quando as duas condições valem, e a folha
 * mesa.css inteira mora dentro da media query. O celular no talhão continua
 * exatamente como era.
 */
(function(w){
'use strict';
var d=w.document, LARGA='(min-width:1100px)';
var ativa='mapa';      /* seção marcada na coluna */
var foco=null;         /* {qid,sid} do estudo em foco, quando houver */

function existe(n){ return typeof w[n]==='function'; }
function chamar(n,a,b){ try{ if(existe(n)) return w[n](a,b); }catch(e){} }
function avisar(t){ if(existe('_stxToast')) w._stxToast(t,5000); }
function svg(p){
  return '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" '+
         'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';
}
var IC={
  estudos:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>',
  mapa:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
  clima:'<path d="M12 2v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="M20 12h2"/><path d="m17.7 6.3 1.4-1.4"/><path d="M16 12a4 4 0 1 0-8 0"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/>',
  insights:'<path d="M22 20H2"/><path d="M5 20V11"/><path d="M11 20V4"/><path d="M17 20v-7"/>',
  relatorios:'<path d="M15 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
  config:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
  cubo:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>'
};

/* ------------------------------------------------------------- o estudo --- */
/* A chave do Conhecimento é JSON ["quadra","estudo"]. Ler do DOM em vez de
   guardar estado próprio evita a coluna e a tela discordarem sobre qual estudo
   está aberto. */
function chave(txt){
  try{ var a=JSON.parse(txt); return (a&&a.length===2&&a[0]&&a[1])?{qid:String(a[0]),sid:String(a[1])}:null; }
  catch(e){ return null; }
}
function estudoEmFoco(){
  var ov=d.getElementById('conhecimentoOvl');
  if(ov&&!ov.hidden){
    var b=ov.querySelector('[data-con="original"][data-key]');
    if(b){ var k=chave(b.getAttribute('data-key')); if(k) return k; }
  }
  return foco;
}

/* --------------------------------------------------------------- portas --- */
function fecharTelas(){
  ['closeStudiesPanel','closeToday','closeDetail','closeSearch','fecharClimaPagina'].forEach(function(n){ chamar(n); });
  var ov=d.getElementById('conhecimentoOvl');
  if(ov&&!ov.hidden){
    /* Pelo botão, não pela marra: é ele que devolve o foco a quem abriu. */
    var x=ov.querySelector('[data-con="fechar"]');
    if(x) x.click(); else ov.hidden=true;
  }
}
function irMapa(){ fecharTelas(); }
function irEstudos(){
  if(!existe('abrirConhecimento')) return avisar('O Conhecimento não carregou neste aparelho. Abra de novo com conexão.');
  w.abrirConhecimento({aba:'estudos'});
}
function irClima(){
  fecharTelas();
  /* Na mesa o clima é página: previsão, histórico, estações e janela lado a
     lado. O cartão flutuante continua sendo a porta do celular, e vira a
     reserva daqui se a página não tiver carregado. */
  if(existe('abrirClimaPagina')) return w.abrirClimaPagina();
  if(!existe('toggleClima')) return avisar('O clima não está disponível nesta tela.');
  var p=d.getElementById('climaPanel');
  if(!p||p.style.display!=='block') w.toggleClima();
}
function semEstudo(secao){
  irEstudos();
  /* Quem manda na marcação é a tela que ficou aberta: a coluna não pode dizer
     "Insights" enquanto mostra a lista de estudos. */
  ativa='estudos'; marcar();
  avisar(secao+' é do estudo: abra um estudo e a seção vem com ele.');
}
function abrirDossie(e){
  if(!existe('abrirConhecimento')){ avisar('O Conhecimento não carregou neste aparelho. Abra de novo com conexão.'); return false; }
  w.abrirConhecimento({qid:e.qid,sid:e.sid});
  return true;
}
function rolarPara(ids){
  var tenta=function(){
    for(var i=0;i<ids.length;i++){
      var el=d.getElementById(ids[i]);
      if(el){ if(el.scrollIntoView) el.scrollIntoView({block:'start'}); return true; }
    }
    return false;
  };
  if(!tenta()) w.setTimeout(tenta,220);
}
function irInsights(){
  var e=estudoEmFoco(); if(!e) return semEstudo('Insights');
  if(abrirDossie(e)) rolarPara(['ep-analises','ep-graficos','ep-resultados']);
}
function irRelatorios(){
  var e=estudoEmFoco(); if(!e) return semEstudo('Relatórios');
  if(!abrirDossie(e)) return;
  var b=d.querySelector('#conhecimentoOvl [data-ep-action="report"]');
  if(b) b.click();
  else avisar('Este estudo abriu na ficha reduzida: o relatório precisa do dossiê completo. Abra o Agracta uma vez com conexão.');
}
function irConfig(){
  if(existe('agMenu')) w.agMenu(true);
  else avisar('O menu não está disponível nesta tela.');
}

var SECOES=[
  {id:'estudos',   rotulo:'Estudos',        icone:IC.estudos,    ir:irEstudos},
  {id:'mapa',      rotulo:'Mapa',           icone:IC.mapa,       ir:irMapa},
  {id:'clima',     rotulo:'Clima',          icone:IC.clima,      ir:irClima},
  {id:'insights',  rotulo:'Insights',       icone:IC.insights,   ir:irInsights},
  {id:'relatorios',rotulo:'Relatórios',     icone:IC.relatorios, ir:irRelatorios},
  {id:'config',    rotulo:'Configurações',  icone:IC.config,     ir:irConfig}
];

function ir(id){
  var s=SECOES.filter(function(x){return x.id===id;})[0];
  if(!s) return false;
  ativa=id; marcar();
  s.ir();
  /* A tela pode recusar a ida (sem estudo, módulo ausente): quem manda na
     marcação é o que está aberto, não o clique. */
  w.setTimeout(sincronizar,0);
  return true;
}

/* ------------------------------------------------------------ marcação --- */
/* A coluna reflete o que está aberto — inclusive quando a pessoa fecha o
   Conhecimento pelo "Fechar ×" e volta ao mapa sem passar por aqui. */
function sincronizar(){
  var ov=d.getElementById('conhecimentoOvl'), clima=d.getElementById('climaPanel');
  var pagina=d.getElementById('climaPaginaOvl');
  var conhecimento=!!(ov&&!ov.hidden);
  if(pagina&&!pagina.hidden) ativa='clima';
  else if(conhecimento) ativa=(ativa==='insights'||ativa==='relatorios')?ativa:'estudos';
  else if(clima&&clima.style.display==='block') ativa='clima';
  else if(ativa!=='config') ativa='mapa';
  marcar();
}
function marcar(){
  var nav=d.getElementById('agMesaNav'); if(!nav) return;
  Array.prototype.forEach.call(nav.querySelectorAll('.ag-mesa-item'),function(b){
    var on=b.getAttribute('data-secao')===ativa;
    b.setAttribute('aria-current',on?'page':'false');
  });
}

/* -------------------------------------------------------------- montar --- */
function montar(){
  if(d.getElementById('agMesa')) return;
  var el=d.createElement('nav');
  el.id='agMesa'; el.className='ag-mesa';
  el.setAttribute('aria-label','Seções do Agracta');
  el.innerHTML=
    '<div class="ag-mesa-marca">'+svg(IC.cubo)+'<b>Agracta</b></div>'+
    '<p class="ag-mesa-lema">Ciência que faz<br>o campo avançar</p>'+
    '<div class="ag-mesa-nav" id="agMesaNav">'+
      SECOES.map(function(s){
        return '<button type="button" class="ag-mesa-item" data-secao="'+s.id+'" aria-current="false">'+
               svg(s.icone)+'<span>'+s.rotulo+'</span></button>';
      }).join('')+
    '</div>'+
    '<div class="ag-mesa-rodape"><p>Mais dados. Melhores decisões.<br>Um agro mais produtivo.</p><span>Agracta</span></div>';
  el.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('.ag-mesa-item');
    if(b) ir(b.getAttribute('data-secao'));
  });
  d.body.insertBefore(el,d.body.firstChild);
  marcar();
}

/* ------------------------------------------------------- ligar/desligar --- */
function larga(){ try{ return !!(w.matchMedia&&w.matchMedia(LARGA).matches); }catch(e){ return false; } }
function autenticado(){ return !d.documentElement.classList.contains('pre-auth'); }
/* O mapa mede a caixa uma vez e guarda: entrar ou sair da coluna muda essa
   largura sem disparar resize, e sem esta conta o Leaflet continuaria pintando
   no tamanho antigo. */
function remedir(){
  w.setTimeout(function(){ try{ if(w._map&&w._map.invalidateSize) w._map.invalidateSize(); }catch(e){} },90);
}
function avaliar(){
  var quer=larga()&&autenticado(), tem=d.documentElement.classList.contains('mesa');
  if(quer===tem) return;
  if(quer){ montar(); d.documentElement.classList.add('mesa'); }
  else d.documentElement.classList.remove('mesa');
  remedir(); sincronizar();
}

function ligar(){
  /* Quem abre a ficha pelo mapa também define o estudo em foco. */
  if(existe('openStudyDetail')){
    var original=w.openStudyDetail;
    w.openStudyDetail=function(qid,sid){ if(qid&&sid) foco={qid:String(qid),sid:String(sid)}; return original.apply(this,arguments); };
  }
  d.addEventListener('click',function(ev){
    var b=ev.target.closest&&ev.target.closest('[data-con="estudo"][data-key],[data-con="original"][data-key]');
    if(b){ var k=chave(b.getAttribute('data-key')); if(k) foco=k; }
    w.setTimeout(sincronizar,0);
  },true);
  try{
    var mq=w.matchMedia&&w.matchMedia(LARGA);
    if(mq&&mq.addEventListener) mq.addEventListener('change',avaliar);
    else if(mq&&mq.addListener) mq.addListener(avaliar);
  }catch(e){}
  /* A porta de entrada tira a classe .pre-auth do <html> quando autentica —
     é esse o momento de a coluna existir, e nem um instante antes. */
  try{
    if(w.MutationObserver){
      new w.MutationObserver(avaliar).observe(d.documentElement,{attributes:true,attributeFilter:['class']});
    }
  }catch(e){}
  avaliar();
}

w.agMesa={ir:ir,avaliar:avaliar,sincronizar:sincronizar,estudoEmFoco:estudoEmFoco,secoes:SECOES};

/* O arquivo é o último do index.html: o <body> já existe, e as portas que a
   coluna reusa já foram registradas. Esperar o DOMContentLoaded só atrasaria a
   coluna — mas ele ainda serve de segunda chamada para quem carregar o arquivo
   antes da hora. */
ligar();
if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',avaliar);
})(window);
