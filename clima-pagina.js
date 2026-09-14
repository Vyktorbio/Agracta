/* Agracta — Clima como página, na mesa.
 *
 * O clima já existia: um cartão flutuante sobre o mapa, com as condições de
 * agora e cinco dias de previsão. É o certo no celular — de relance, no
 * talhão. Na mesa, quem está decidindo QUANDO aplicar precisa de mais do que
 * um relance: quanto choveu no mês, como a umidade andou, quais estações
 * existem por perto e que horas de amanhã servem.
 *
 * ESTA PÁGINA NÃO INVENTA DADO. Cada bloco diz de onde veio o número, porque
 * aqui convivem três naturezas diferentes e confundi-las seria o erro grave:
 *
 *   MEDIDO     estação Ecowitt — sensor no campo, agora.
 *   PREVISTO   Open-Meteo — modelo, para frente no tempo.
 *   REANÁLISE  Open-Meteo — modelo, para trás no tempo. Não é a medição do
 *              que ocorreu na quadra; é a melhor reconstrução do modelo.
 *
 * As horas de molhamento são ESTIMATIVA, e a regra aparece na tela: horas com
 * umidade relativa ≥ 90 %. Não existe sensor de molhamento foliar aqui, e
 * chamar de "medido" um limiar de UR seria dar autoridade de sensor a uma
 * conta.
 *
 * A janela de aplicação desta página é PROSPECTIVA (as próximas 48 h) e usa
 * limites genéricos de recomendação. Ela não substitui a janela DECLARADA de
 * um protocolo: essa vive no estudo e é conferida pelo JanelaCore, que compara
 * o declarado com o ocorrido. Quando as duas discordarem, quem manda é o
 * protocolo — e a tela diz isso.
 *
 * Só na mesa: no celular o cartão flutuante continua sendo a porta.
 */
(function(w){
'use strict';
var d=w.document, estado=null;

/* ---------------------------------------------------------------- cores ---
   Séries conferidas pelo validador de paleta nos dois temas (banda de
   luminosidade, croma, separação para daltonismo e contraste com a
   superfície). Verde e azul nunca dividem o mesmo gráfico — chuva e umidade
   têm cada uma o seu, e a temperatura usa o par vermelho/azul. */
var COR={
  claro:{quente:'#c0392b',frio:'#397be0',umidade:'#16805b'},
  escuro:{quente:'#e4695c',frio:'#5a95e0',umidade:'#3aa676'}
};
function cores(){ return d.documentElement.classList.contains('light')?COR.claro:COR.escuro; }

function e(x){ return String(x==null?'':x).replace(/[&<>"']/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
function n(v,dec){
  if(v==null||v===''||!isFinite(Number(v)))return '—';
  return Number(v).toFixed(dec==null?1:dec).replace('.',',');
}
function dia(iso){ return /^\d{4}-\d{2}-\d{2}/.test(iso||'')?iso.slice(8,10)+'/'+iso.slice(5,7):'—'; }
function hora(iso){ var t=String(iso||'').split('T')[1]||''; return t.slice(0,5); }
function soma(xs){ return xs.reduce(function(a,b){return a+(isFinite(b)?b:0);},0); }
function media(xs){ var v=xs.filter(function(x){return isFinite(x);}); return v.length?soma(v)/v.length:null; }

/* -------------------------------------------------------------- gráficos ---
   SVG inline, sem biblioteca: são três formas simples e o app não carrega
   pacote de gráfico. Cada marca leva <title> e rótulo acessível, e a tabela
   completa fica a um clique — cor sozinha nunca é a única leitura. */
function eixoY(lo,hi,y,largura,fmt){
  var out='';
  for(var i=0;i<=4;i++){
    var v=lo+(hi-lo)*i/4;
    out+='<line x1="46" x2="'+largura+'" y1="'+y(v)+'" y2="'+y(v)+'" class="cp-grid"/>'+
         '<text x="40" y="'+(y(v)+4)+'" text-anchor="end">'+e(fmt?fmt(v):n(v,0))+'</text>';
  }
  return out;
}
function rotulosX(dias,x){
  var passo=Math.max(1,Math.ceil(dias.length/6)),out='';
  dias.forEach(function(t,i){
    if(i%passo&&i!==dias.length-1)return;
    out+='<text x="'+x(i)+'" y="192" text-anchor="middle">'+e(dia(t))+'</text>';
  });
  return out;
}
function barras(dias,vals,cor,unidade,titulo){
  if(!dias.length)return vazio('Sem série para o período.');
  var hi=Math.max(1,Math.max.apply(null,vals.map(function(v){return isFinite(v)?v:0;})));
  var L=700,y=function(v){return 170-(v/hi)*140;},x=function(i){return 52+(i+0.5)*((L-60)/dias.length);};
  var lg=(L-60)/dias.length, bw=Math.max(3,lg-2); /* 2px de respiro entre barras */
  var svg='<svg class="cp-svg" viewBox="0 0 '+L+' 200" role="img" aria-label="'+e(titulo)+'"><title>'+e(titulo)+'</title>'+
    eixoY(0,hi,y,L-8)+rotulosX(dias,x)+'<text x="46" y="18" class="cp-unid">'+e(unidade)+'</text>';
  dias.forEach(function(t,i){
    var v=isFinite(vals[i])?vals[i]:0, alt=Math.max(v>0?2:0,170-y(v));
    if(!alt)return;
    svg+='<rect x="'+(x(i)-bw/2)+'" y="'+(170-alt)+'" width="'+bw+'" height="'+alt+'" rx="2" fill="'+cor+'" tabindex="0" '+
      'aria-label="'+e(dia(t)+': '+n(v,1)+' '+unidade)+'"><title>'+e(dia(t)+' · '+n(v,1)+' '+unidade)+'</title></rect>';
  });
  return svg+'</svg>';
}
function linhas(dias,series,unidade,titulo){
  var todos=[];series.forEach(function(s){todos=todos.concat(s.vals.filter(function(v){return isFinite(v);}));});
  if(!dias.length||!todos.length)return vazio('Sem série para o período.');
  var lo=Math.min.apply(null,todos),hi=Math.max.apply(null,todos);
  if(hi===lo)hi=lo+1;
  var L=700,y=function(v){return 170-((v-lo)/(hi-lo))*140;},x=function(i){return 52+(i+0.5)*((L-60)/dias.length);};
  var svg='<svg class="cp-svg" viewBox="0 0 '+L+' 200" role="img" aria-label="'+e(titulo)+'"><title>'+e(titulo)+'</title>'+
    eixoY(lo,hi,y,L-8)+rotulosX(dias,x)+'<text x="46" y="18" class="cp-unid">'+e(unidade)+'</text>';
  series.forEach(function(s){
    var caminho='',antes=false;
    s.vals.forEach(function(v,i){
      if(!isFinite(v)){antes=false;return;}
      caminho+=(antes?' L ':' M ')+x(i)+' '+y(v);antes=true;
    });
    svg+='<path d="'+caminho+'" fill="none" stroke="'+s.cor+'" stroke-width="2" stroke-linejoin="round"/>';
    /* Rótulo direto na ponta: com duas séries, a identidade não fica só na cor. */
    for(var i=s.vals.length-1;i>=0;i--){ if(isFinite(s.vals[i])){
      svg+='<circle cx="'+x(i)+'" cy="'+y(s.vals[i])+'" r="4" fill="'+s.cor+'"/>'+
        '<text x="'+(x(i)-8)+'" y="'+(y(s.vals[i])-9)+'" text-anchor="end" class="cp-ponta">'+e(s.nome+' '+n(s.vals[i],0))+'</text>';
      break; } }
    s.vals.forEach(function(v,i){
      if(!isFinite(v))return;
      svg+='<circle cx="'+x(i)+'" cy="'+y(v)+'" r="7" fill="transparent" tabindex="0" '+
        'aria-label="'+e(s.nome+' em '+dia(dias[i])+': '+n(v,1)+' '+unidade)+'"><title>'+e(dia(dias[i])+' · '+s.nome+' '+n(v,1)+' '+unidade)+'</title></circle>';
    });
  });
  svg+='</svg>';
  if(series.length>1){
    svg+='<div class="cp-legenda">'+series.map(function(s){
      return '<span><i style="background:'+s.cor+'"></i>'+e(s.nome)+'</span>';}).join('')+'</div>';
  }
  return svg;
}
function vazio(t){ return '<p class="cp-vazio">'+e(t)+'</p>'; }
function cartao(rot,val,unid,nota){
  return '<div class="cp-num"><span>'+e(rot)+'</span><strong>'+val+(unid?'<small> '+e(unid)+'</small>':'')+'</strong>'+
    (nota?'<small class="cp-fonte">'+e(nota)+'</small>':'')+'</div>';
}

/* --------------------------------------------------------------- janela ---
   Limites genéricos de recomendação. Ficam visíveis na tela porque são um
   critério, não uma verdade: um protocolo pode declarar outros, e aí são os
   dele que valem. */
var LIMITES={ventoMax:10,urMin:50,urMax:90,tempMin:15,tempMax:30,chuvaMax:0.2};
function avaliarHora(h){
  var falhas=[];
  if(h.vento!=null&&h.vento>LIMITES.ventoMax)falhas.push('vento '+n(h.vento,0)+' km/h');
  if(h.ur!=null&&(h.ur<LIMITES.urMin||h.ur>LIMITES.urMax))falhas.push('UR '+n(h.ur,0)+' %');
  if(h.temp!=null&&(h.temp<LIMITES.tempMin||h.temp>LIMITES.tempMax))falhas.push('temp '+n(h.temp,0)+' °C');
  if(h.chuva!=null&&h.chuva>LIMITES.chuvaMax)falhas.push('chuva '+n(h.chuva,1)+' mm');
  return {ok:!falhas.length,falhas:falhas};
}
function janelas(horas){
  var out=[],atual=null;
  horas.forEach(function(h){
    var a=avaliarHora(h);
    if(a.ok){ if(!atual){atual={de:h.t,ate:h.t};out.push(atual);} else atual.ate=h.t; }
    else atual=null;
  });
  return out;
}
w.agClimaJanelas=janelas;

/* ---------------------------------------------------------------- dados --- */
function coord(){
  try{ if(typeof w._climaMapCoord==='function'){var c=w._climaMapCoord();if(c)return c;} }catch(err){}
  return null;
}
function buscar(ll){
  var base='https://api.open-meteo.com/v1/forecast?latitude='+(+ll[0]).toFixed(4)+'&longitude='+(+ll[1]).toFixed(4)+
    '&timezone=America%2FSao_Paulo&temperature_unit=celsius&precipitation_unit=mm&wind_speed_unit=kmh';
  var agora=base+'&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_direction_10m,vapour_pressure_deficit'+
    '&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m'+
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max&forecast_days=7';
  var passado=base+'&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,precipitation_sum'+
    '&hourly=relative_humidity_2m&past_days=30&forecast_days=1';
  var json=function(u){ return fetch(u).then(function(r){return r.json();}); };
  var estacoes=fetch((w.CLIMA_PROXY||'')+'/clima/estacoes').then(function(r){return r.json();}).catch(function(){return null;});
  return Promise.all([json(agora),json(passado),estacoes]);
}
function horasDe(j){
  var h=(j&&j.hourly)||{},t=h.time||[],out=[],agora=Date.now();
  t.forEach(function(x,i){
    var ts=Date.parse(x);
    if(!isFinite(ts)||ts<agora-3600000||ts>agora+48*3600000)return;
    out.push({t:x,temp:h.temperature_2m&&h.temperature_2m[i],ur:h.relative_humidity_2m&&h.relative_humidity_2m[i],
      chuva:h.precipitation&&h.precipitation[i],prob:h.precipitation_probability&&h.precipitation_probability[i],
      vento:h.wind_speed_10m&&h.wind_speed_10m[i]});
  });
  return out;
}
/* Molhamento: contagem de horas com UR ≥ 90 % no período. É estimativa, e a
   tela repete a regra ao lado do número. */
function molhamento(j){
  var h=(j&&j.hourly)||{},ur=h.relative_humidity_2m||[],t=h.time||[],agora=Date.now(),c=0;
  ur.forEach(function(v,i){ var ts=Date.parse(t[i]); if(isFinite(ts)&&ts<=agora&&isFinite(v)&&v>=90)c++; });
  return c;
}

/* ----------------------------------------------------------------- telas --- */
var ABAS=[['visao','Visão geral'],['previsao','Previsão'],['historico','Histórico'],['janela','Janela de aplicação'],['estacoes','Estações']];

function visao(){
  var a=(estado.agora&&estado.agora.current)||{}, dd=(estado.passado&&estado.passado.daily)||{};
  var dias=(dd.time||[]).slice(0,30), chuva=(dd.precipitation_sum||[]).slice(0,30);
  var tmed=(dd.temperature_2m_mean||[]).slice(0,30), urmed=(dd.relative_humidity_2m_mean||[]).slice(0,30);
  var js=janelas(estado.horas), livre=js.length?js[0]:null;
  return '<div class="cp-linha">'+
    '<section class="cp-card cp-agora"><p class="cp-olho">'+(estado.estacao?'MEDIDO · ESTAÇÃO '+e(estado.estacao.name||''):'PREVISTO · MODELO OPEN-METEO')+'</p>'+
      '<strong class="cp-temp">'+n(a.temperature_2m,1)+'<small>°C</small></strong>'+
      '<div class="cp-mini">'+
        cartao('Umidade relativa',n(a.relative_humidity_2m,0),'%')+
        cartao('Vento',n(a.wind_speed_10m,0),'km/h')+
        cartao('Chuva agora',n(a.precipitation,1),'mm')+
        cartao('VPD',n(a.vapour_pressure_deficit,2),'kPa')+
      '</div>'+
      '<p class="cp-fonte">'+(estado.estacao?'Sensor da estação mais próxima do centro do mapa.':'Sem estação no raio: o número é do modelo, para a coordenada do centro do mapa.')+'</p>'+
    '</section>'+
    '<section class="cp-card"><h3>Acumulados · últimos 30 dias</h3>'+
      '<div class="cp-mini">'+
        cartao('Precipitação',n(soma(chuva),1),'mm','soma das reanálises diárias')+
        cartao('Temperatura média',n(media(tmed),1),'°C')+
        cartao('Umidade média',n(media(urmed),0),'%')+
        cartao('Horas de molhamento',String(molhamento(estado.passado)),'h','estimativa: horas com UR ≥ 90 %')+
      '</div>'+
      '<p class="cp-fonte">Reanálise do modelo para esta coordenada — não é a medição do que ocorreu na quadra.</p>'+
    '</section></div>'+
    '<section class="cp-card"><h3>Precipitação diária · 30 dias</h3>'+
      barras(dias,chuva,cores().frio,'mm','Precipitação diária dos últimos 30 dias, em milímetros')+'</section>'+
    '<section class="cp-card cp-janela-resumo"><h3>Janela de aplicação · próximas 48 h</h3>'+
      (livre?'<p class="cp-selo ok">Há janela: '+e(dia(livre.de)+' '+hora(livre.de))+' às '+e(hora(livre.ate))+'</p>'
            :'<p class="cp-selo ruim">Nenhuma hora das próximas 48 h atende aos limites.</p>')+
      '<p class="cp-fonte">Limites genéricos: vento ≤ '+LIMITES.ventoMax+' km/h · UR '+LIMITES.urMin+'–'+LIMITES.urMax+' % · '+
      LIMITES.tempMin+'–'+LIMITES.tempMax+' °C · sem chuva na hora. Um protocolo com janela declarada manda mais que estes.</p></section>';
}
function previsao(){
  var dd=(estado.agora&&estado.agora.daily)||{},t=dd.time||[];
  if(!t.length)return vazio('Previsão indisponível agora.');
  var linhas7=t.map(function(x,i){
    return '<tr><th scope="row">'+e(dia(x))+'</th><td>'+n(dd.temperature_2m_min[i],0)+'° / '+n(dd.temperature_2m_max[i],0)+'°</td>'+
      '<td>'+n(dd.precipitation_sum[i],1)+' mm</td><td>'+n(dd.precipitation_probability_max&&dd.precipitation_probability_max[i],0)+' %</td></tr>';
  }).join('');
  var horas=estado.horas.slice(0,24).map(function(h){
    return '<tr><th scope="row">'+e(hora(h.t))+'</th><td>'+n(h.temp,0)+' °C</td><td>'+n(h.ur,0)+' %</td><td>'+n(h.vento,0)+' km/h</td><td>'+n(h.chuva,1)+' mm</td></tr>';
  }).join('');
  return '<section class="cp-card"><h3>Sete dias</h3><p class="cp-olho">PREVISTO · MODELO</p>'+
    '<table class="cp-tab"><thead><tr><th scope="col">Dia</th><th scope="col">Mín / Máx</th><th scope="col">Chuva</th><th scope="col">Prob.</th></tr></thead><tbody>'+linhas7+'</tbody></table></section>'+
    '<section class="cp-card"><h3>Próximas 24 horas</h3>'+
    '<table class="cp-tab"><thead><tr><th scope="col">Hora</th><th scope="col">Temp.</th><th scope="col">UR</th><th scope="col">Vento</th><th scope="col">Chuva</th></tr></thead><tbody>'+horas+'</tbody></table></section>';
}
function historico(){
  var dd=(estado.passado&&estado.passado.daily)||{},t=(dd.time||[]).slice(0,30);
  if(!t.length)return vazio('Histórico indisponível agora.');
  var c=cores();
  var tabela=t.map(function(x,i){
    return '<tr><th scope="row">'+e(dia(x))+'</th><td>'+n(dd.temperature_2m_min[i],1)+'</td><td>'+n(dd.temperature_2m_max[i],1)+'</td>'+
      '<td>'+n(dd.relative_humidity_2m_mean[i],0)+'</td><td>'+n(dd.precipitation_sum[i],1)+'</td></tr>';
  }).join('');
  return '<p class="cp-olho">REANÁLISE · MODELO, PARA TRÁS NO TEMPO</p>'+
    '<section class="cp-card"><h3>Temperatura · máxima e mínima</h3>'+
      linhas(t,[{nome:'Máx',cor:c.quente,vals:(dd.temperature_2m_max||[]).slice(0,30)},
                {nome:'Mín',cor:c.frio,vals:(dd.temperature_2m_min||[]).slice(0,30)}],'°C','Temperatura máxima e mínima diária dos últimos 30 dias')+'</section>'+
    '<section class="cp-card"><h3>Umidade relativa média</h3>'+
      linhas(t,[{nome:'UR',cor:c.umidade,vals:(dd.relative_humidity_2m_mean||[]).slice(0,30)}],'%','Umidade relativa média diária dos últimos 30 dias')+'</section>'+
    '<section class="cp-card"><h3>Precipitação</h3>'+
      barras(t,(dd.precipitation_sum||[]).slice(0,30),c.frio,'mm','Precipitação diária dos últimos 30 dias')+'</section>'+
    '<details class="cp-tabela"><summary>Ver a tabela destes 30 dias</summary>'+
      '<table class="cp-tab"><thead><tr><th scope="col">Dia</th><th scope="col">Mín (°C)</th><th scope="col">Máx (°C)</th><th scope="col">UR (%)</th><th scope="col">Chuva (mm)</th></tr></thead><tbody>'+tabela+'</tbody></table></details>';
}
function janela(){
  var linhasH=estado.horas.slice(0,48).map(function(h){
    var a=avaliarHora(h);
    return '<tr class="'+(a.ok?'ok':'')+'"><th scope="row">'+e(dia(h.t)+' '+hora(h.t))+'</th>'+
      '<td>'+n(h.temp,0)+' °C</td><td>'+n(h.ur,0)+' %</td><td>'+n(h.vento,0)+' km/h</td><td>'+n(h.chuva,1)+' mm</td>'+
      '<td>'+(a.ok?'<span class="cp-selo ok">dentro</span>':'<span class="cp-selo ruim">'+e(a.falhas.join(' · '))+'</span>')+'</td></tr>';
  }).join('');
  var js=janelas(estado.horas);
  return '<section class="cp-card"><h3>Faixas que atendem aos limites</h3>'+
    (js.length?'<ul class="cp-faixas">'+js.map(function(j){
      return '<li><b>'+e(dia(j.de)+' · '+hora(j.de)+' às '+hora(j.ate))+'</b></li>';}).join('')+'</ul>'
      :vazio('Nenhuma hora das próximas 48 h atende aos limites.'))+
    '<p class="cp-fonte">Limites genéricos de recomendação: vento ≤ '+LIMITES.ventoMax+' km/h · UR entre '+LIMITES.urMin+' e '+LIMITES.urMax+
    ' % · temperatura entre '+LIMITES.tempMin+' e '+LIMITES.tempMax+' °C · sem chuva na hora. '+
    'Esta é uma leitura da PREVISÃO, hora a hora. A janela declarada de um protocolo vive no estudo e vence estes limites; '+
    'quem confere o declarado contra o ocorrido é a ficha do estudo, não esta página.</p></section>'+
    '<section class="cp-card"><h3>Hora a hora · 48 h</h3><table class="cp-tab cp-horas"><thead><tr><th scope="col">Quando</th>'+
    '<th scope="col">Temp.</th><th scope="col">UR</th><th scope="col">Vento</th><th scope="col">Chuva</th><th scope="col">Situação</th></tr></thead><tbody>'+linhasH+'</tbody></table></section>';
}
function estacoes(){
  var lista=estado.estacoes||[];
  if(!lista.length)return vazio('Nenhuma estação Ecowitt respondeu. Sem elas, todo o clima desta página vem do modelo.');
  var ll=estado.ll;
  var linhasE=lista.map(function(s){
    var c=null;
    try{ c=(typeof w._climaStationCoord==='function')?w._climaStationCoord(s):null; }catch(err){}
    var km=(c&&ll&&typeof w._kmEntre==='function')?w._kmEntre(ll[0],ll[1],c[0],c[1]):null;
    return '<tr><th scope="row">'+e(s.name||s.mac||'Sem nome')+'</th><td>'+(c?e(n(c[0],3)+', '+n(c[1],3)):'sem coordenada')+'</td>'+
      '<td>'+(km==null?'—':e(n(km,1))+' km')+'</td>'+
      '<td>'+(estado.estacao&&estado.estacao.mac===s.mac?'<span class="cp-selo ok">em uso</span>':'')+'</td></tr>';
  }).join('');
  return '<section class="cp-card"><h3>Estações Ecowitt</h3><p class="cp-olho">MEDIDO · SENSOR EM CAMPO</p>'+
    '<table class="cp-tab"><thead><tr><th scope="col">Estação</th><th scope="col">Coordenada</th><th scope="col">Distância</th><th scope="col"></th></tr></thead><tbody>'+linhasE+'</tbody></table>'+
    '<p class="cp-fonte">A estação em uso é a mais próxima do centro do mapa. Fora do raio dela, o clima exibido passa a ser do modelo.</p></section>';
}

function pintar(){
  var ov=d.getElementById('climaPaginaOvl'); if(!ov||ov.hidden)return;
  var corpo=estado.erro?vazio(estado.erro)
    :(!estado.agora?'<p class="cp-vazio">Buscando clima…</p>'
    :{visao:visao,previsao:previsao,historico:historico,janela:janela,estacoes:estacoes}[estado.aba]());
  ov.innerHTML='<section class="cp-shell"><header class="cp-head"><div><p>AGRACTA</p><h1>Clima</h1>'+
      '<p class="cp-local">'+e(estado.local||'Local ativo')+(estado.ll?' · '+e(n(estado.ll[0],4)+', '+n(estado.ll[1],4)):'')+'</p></div>'+
      '<button type="button" class="con-btn" data-cp="fechar">Fechar ×</button></header>'+
    '<nav aria-label="Seções do clima">'+ABAS.map(function(a){
      return '<button type="button" class="con-btn'+(estado.aba===a[0]?' ativo':'')+'" data-cp="aba" data-aba="'+a[0]+'" aria-current="'+(estado.aba===a[0]?'page':'false')+'">'+a[1]+'</button>';
    }).join('')+'</nav><main>'+corpo+'</main></section>';
}

function abrir(op){
  op=op||{};
  var ov=d.getElementById('climaPaginaOvl');
  if(!ov){
    ov=d.createElement('div');ov.id='climaPaginaOvl';ov.className='con-overlay cp-overlay';
    ov.setAttribute('role','dialog');ov.setAttribute('aria-label','Clima');
    d.body.appendChild(ov);
  }
  ov.hidden=false;
  var ll=op.ll||coord();
  var nome='';
  try{ nome=(w.LOCAIS&&w.localAtivo&&w.LOCAIS[w.localAtivo]&&w.LOCAIS[w.localAtivo].nome)||''; }catch(err){}
  estado={aba:(op.aba||'visao'),ll:ll,local:nome,horas:[],agora:null,passado:null,estacoes:null,estacao:null,erro:null};
  if(!ll){ estado.erro='Este local ainda não tem coordenada: desenhe uma quadra no mapa, ou use o GPS.'; pintar(); return; }
  pintar();
  buscar(ll).then(function(r){
    if(!estado)return;
    estado.agora=r[0]&&!r[0].error?r[0]:null;
    estado.passado=r[1]&&!r[1].error?r[1]:null;
    estado.estacoes=Array.isArray(r[2])?r[2]:[];
    estado.horas=horasDe(estado.agora);
    try{ estado.estacao=(typeof w._climaStationForCoord==='function'&&estado.estacoes.length)?w._climaStationForCoord(ll):null; }catch(err){}
    if(!estado.agora)estado.erro='Sem conexão para o clima agora. A previsão e o histórico precisam de internet.';
    pintar();
  }).catch(function(){ if(estado){estado.erro='Sem conexão para o clima agora.';pintar();} });
}
function fechar(){ var ov=d.getElementById('climaPaginaOvl'); if(ov)ov.hidden=true; estado=null; }

d.addEventListener('click',function(ev){
  var b=ev.target.closest&&ev.target.closest('#climaPaginaOvl [data-cp]');
  if(!b||!estado)return;
  if(b.dataset.cp==='fechar')return fechar();
  if(b.dataset.cp==='aba'){ estado.aba=b.dataset.aba; pintar(); var ov=d.getElementById('climaPaginaOvl'); if(ov)ov.scrollTop=0; }
});
d.addEventListener('keydown',function(ev){
  var ov=d.getElementById('climaPaginaOvl');
  if(!ov||ov.hidden||ev.key!=='Escape')return;
  ev.preventDefault();fechar();
});

w.abrirClimaPagina=abrir;
w.fecharClimaPagina=fechar;
w.agClimaPagina={abrir:abrir,fechar:fechar,janelas:janelas,limites:LIMITES,avaliarHora:avaliarHora,cores:COR};
})(window);
