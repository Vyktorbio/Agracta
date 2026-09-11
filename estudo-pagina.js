/* Página de leitura por estudo. Usa a projeção autenticada e cegada do Conhecimento. */
(function(w){
'use strict';
var C=w.ConhecimentoCore, state=null;
var colors=['#16805b','#397be0','#b35a13','#a550ad','#00858c','#bc435d','#797025','#695fbb'];
function e(v){return w.agConhecimento.esc(v);}
function num(v){return w.agConhecimento.numero(v);}
function arr(v){return Array.isArray(v)?v:[];}
function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(v||'')?v.slice(8,10)+'/'+v.slice(5,7)+'/'+v.slice(0,4):String(v||'Sem data');}
function stamp(r){var d=/^\d{4}-\d{2}-\d{2}$/.test(r.data||'')?Date.parse(r.data+'T'+(/^\d{2}:\d{2}/.test(r.hora||'')?r.hora.slice(0,5):'00:00')+':00Z'):NaN;return Number.isFinite(d)?d:null;}
function signature(r){return JSON.stringify([r.variavel,r.tipo,r.unidade,r.sentido]);}
function unit(r){return r.unidade||(r.tipo==='pct'?'%':r.tipo==='contagem'?'contagem':'');}
function label(r){return date(r.data)+(r.hora?' · '+r.hora:'')+(r.momento?' · '+r.momento:'')+' · '+r.avaliacao;}
function tr(s,id){return s.tratamentos.find(function(t){return t.id===id;})||{id:id,produto:'Sem produto'};}
function color(s,id){return colors[Math.max(0,s.tratamentos.findIndex(function(t){return t.id===id;}))%colors.length];}
function section(id,title,body){return '<section id="ep-'+id+'" class="ep-section"><h3>'+title+'</h3>'+body+'</section>';}
function table(head,rows){return '<div class="con-scroll"><table><thead><tr>'+head.map(function(x){return '<th scope="col">'+e(x)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(x){return '<td>'+x+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
function empty(t){return '<p class="con-empty">'+e(t)+'</p>';}
function fact(label,value){return '<div><dt>'+e(label)+'</dt><dd>'+e(value==null||value===''?'Não informado':value)+'</dd></div>';}
function groups(s){var out=[];s.resultados.forEach(function(r){if(!out.some(function(g){return g.key===signature(r);}))out.push({key:signature(r),r:r});});return out.sort(function(a,b){return Number(/severidade/i.test(b.r.variavel))-Number(/severidade/i.test(a.r.variavel));});}
function selected(){return state.s.resultados.filter(function(r){return signature(r)===state.variable;});}
function evaluations(rows){var out=[];rows.forEach(function(r){if(!out.some(function(a){return a.avaliacao===r.avaliacao;}))out.push(r);});return out.sort(function(a,b){return (stamp(a)==null?-Infinity:stamp(a))-(stamp(b)==null?-Infinity:stamp(b));});}
function lineChart(rows){
 var s=state.s, dated=rows.filter(function(r){return stamp(r)!==null;}), times=Array.from(new Set(dated.map(stamp))).sort(function(a,b){return a-b;});
 if(!dated.length)return empty('Cadastre a data das avaliações para visualizar a evolução temporal.');
 var lo=Math.min(0,...dated.map(function(r){return r.media;})),hi=Math.max(0,...dated.map(function(r){return r.media;}));if(hi===lo)hi=lo+1;
 var y=function(v){return 252-(v-lo)/(hi-lo)*208;},x=function(t){return times.length===1?360:62+(t-times[0])/(times[times.length-1]-times[0])*586;};
 var svg='<svg class="ep-line" viewBox="0 0 700 320" role="img" aria-label="'+e(rows[0].variavel)+' por data. Médias por tratamento; os valores estão na tabela de resultados."><title>'+e(rows[0].variavel)+' por data</title>';
 for(var i=0;i<=4;i++){var v=lo+(hi-lo)*i/4;svg+='<line x1="62" x2="648" y1="'+y(v)+'" y2="'+y(v)+'" class="ep-grid"/><text x="52" y="'+(y(v)+5)+'" text-anchor="end">'+num(v)+'</text>';}
 var tickTimes=times.filter(function(t,i){return times.length<=5||i===0||i===times.length-1||i%Math.ceil(times.length/4)===0;});
 tickTimes.forEach(function(t){svg+='<text x="'+x(t)+'" y="283" text-anchor="middle">'+e(date(new Date(t).toISOString().slice(0,10)).slice(0,5))+'</text>';});
 svg+='<text x="62" y="22">'+e(unit(rows[0]))+'</text><text x="355" y="310" text-anchor="middle">Data da avaliação</text>';
 var evs=evaluations(rows).filter(function(r){return stamp(r)!==null;});
 s.tratamentos.forEach(function(t){
  var points=evs.map(function(ev){return rows.find(function(r){return r.avaliacao===ev.avaliacao&&r.tratamento===t.id;})||null;});
  var path='',previous=false;points.forEach(function(r){if(!r){previous=false;return;}path+=(previous?' L ':' M ')+x(stamp(r))+' '+y(r.media);previous=true;});
  svg+='<path d="'+path+'" fill="none" stroke="'+color(s,t.id)+'" stroke-width="3"'+(t.testemunha?' stroke-dasharray="7 5"':'')+'/>';
  points.filter(Boolean).forEach(function(r){var title=t.id+' · '+t.produto+' · '+label(r)+' · média '+num(r.media)+' '+unit(r)+' · n='+r.n;svg+='<circle cx="'+x(stamp(r))+'" cy="'+y(r.media)+'" r="5" fill="'+color(s,t.id)+'" stroke="var(--surface,#fff)" stroke-width="2" tabindex="0" aria-label="'+e(title)+'"><title>'+e(title)+'</title></circle>';});
 });
 svg+='</svg><div class="ep-legend">'+s.tratamentos.filter(function(t){return dated.some(function(r){return r.tratamento===t.id;});}).map(function(t){return '<span><i style="background:'+color(s,t.id)+'"></i>'+e(t.id)+' · '+e(t.produto)+(t.testemunha?' (testemunha)':'')+'</span>';}).join('')+'</div>';
 if(dated.length<rows.length)svg+='<p class="con-note">Resultados sem data permanecem nas tabelas e no ranking, mas não entram na curva.</p>';
 return svg;
}
function ranking(rows){
 var rs=rows.filter(function(r){return r.avaliacao===state.assessment;}).slice(),dir=rows[0].sentido==='maior'?-1:1;
 rs.sort(function(a,b){return dir*(a.media-b.media)||String(a.tratamento).localeCompare(String(b.tratamento));});
 if(!rs.length)return empty('Nenhum valor nesta avaliação.');
 var max=Math.max(1,...rs.map(function(r){return Math.abs(r.media);})),last=null,rank=0;
 return '<ol class="ep-ranking">'+rs.map(function(r,i){if(last!==r.media)rank=i+1;last=r.media;var t=tr(state.s,r.tratamento);return '<li><span class="ep-rank">'+rank+'</span><div class="ep-rank-main"><div><b>'+e(t.id)+' · '+e(t.produto)+'</b><strong>'+num(r.media)+' '+e(unit(r))+'</strong></div><div class="ep-track"><span style="width:'+Math.max(0,Math.abs(r.media)/max*100)+'%;background:'+color(state.s,r.tratamento)+'"></span></div><small>'+e(t.dose||'Dose não informada')+' · n = '+r.n+' · DP '+num(r.dp)+(r.testemunha?' · Testemunha':r.controle==null?'':' · Controle '+num(r.controle)+'%')+'</small></div></li>';}).join('')+'</ol><p class="con-note">Ordem descritiva das médias: '+(dir===1?'menor':'maior')+' valor primeiro. Não representa diferença estatística. Barras mostram a magnitude; o valor mantém o sinal. Empates recebem a mesma posição.</p>';
}
function charts(){
 var gs=groups(state.s);if(!gs.length)return empty('Ainda não há resultados numéricos. Os gráficos aparecerão aqui após o registro das avaliações.');
 var rows=selected(),evs=evaluations(rows);if(!evs.some(function(r){return r.avaliacao===state.assessment;}))state.assessment=evs[evs.length-1].avaliacao;
 return '<div class="ep-controls"><label>Variável<select data-ep="variable">'+gs.map(function(g){return '<option value="'+e(g.key)+'"'+(g.key===state.variable?' selected':'')+'>'+e(g.r.variavel)+' · '+e(unit(g.r)||g.r.tipo)+' · '+(g.r.sentido==='maior'?'maior primeiro':'menor primeiro')+'</option>';}).join('')+'</select></label><label>Avaliação do ranking<select data-ep="assessment">'+evs.map(function(r){return '<option value="'+e(r.avaliacao)+'"'+(r.avaliacao===state.assessment?' selected':'')+'>'+e(label(r))+'</option>';}).join('')+'</select></label></div><div class="ep-charts"><article class="ep-chart"><p class="ep-eyebrow">EVOLUÇÃO DO ENSAIO</p><h4>'+e(rows[0].variavel)+' por data</h4>'+lineChart(rows)+'</article><article class="ep-chart"><p class="ep-eyebrow">COMPARAÇÃO DOS TRATAMENTOS</p><h4>Ranking · '+e(rows[0].variavel)+'</h4><p class="ep-caption">'+e(label(evs.find(function(r){return r.avaliacao===state.assessment;})))+'</p>'+ranking(rows)+'</article></div>';
}
function rawTable(st,s){
 var rows=[];arr(st.avaliacoes).forEach(function(av,ai){s.tratamentos.forEach(function(t){for(var rep=1;rep<=Math.max(1,parseInt(st.numRepeticoes,10)||1);rep++){arr(av.variaveis).forEach(function(v){var row={key:t.id+'R'+rep,tratId:t.id,rep:rep};var value=typeof w._avNota==='function'?w._avNota(av,row,v):((av.notas||{})[row.key]||{})[v];var val=C.numero(value);rows.push([e(date(av.data))+'<small>'+e(av.hora||'')+' · '+e(av.id||'av-'+ai)+'</small>',e(t.id)+' · '+e(t.produto),'R'+rep,e(v),val===null?'—':num(val)]);});}});});
 return rows.length?table(['Avaliação','Tratamento','Repetição','Variável','Valor registrado'],rows)+ '<p class="con-note">— = sem valor numérico registrado; zero é uma observação válida. Valores exibidos na escala registrada, antes de transformações estatísticas.</p>':empty('Nenhuma avaliação cadastrada.');
}
function storedStats(st,s){
 var snap=st.estatisticaFinal;if(!snap)return '';
 return '<h4>Estatística preservada na finalização</h4><p class="con-note">'+e(snap.motor||'Motor registrado')+' · '+e(snap.gerado||'')+'. Valores do fechamento, sem recalcular o estudo.</p>'+arr(snap.itens).map(function(item){var r=item.stat||{};
 return '<h4>'+e(item.variavel)+' · '+e(date(item.data))+' '+e(item.momento||'')+'</h4><dl class="ep-facts">'+fact('p-valor',r.p==null?'Não disponível':String(r.p))+fact('CV (%)',num(r.cv))+fact('DMS de Tukey',num(r.hsd))+'</dl>'+table(['Tratamento','Média','Grupo'],arr(r.order).map(function(id){return [e(id)+' · '+e(tr(s,id).produto),num((r.tMean||{})[id]),e((r.letras||{})[id]||'—')];}));
 }).join('')+arr(snap.semAnalise).map(function(item){return '<p class="con-note">'+e(item.variavel)+' · '+e(date(item.data))+': '+e(item.porque||'Sem análise registrada')+'</p>';}).join('');
}
function fieldNotes(st,s){
 var notes=typeof w.notasDoEstudo==='function'?w.notasDoEstudo(s.qid,st):[];
 return notes.length?'<h4>Observações da área no período do estudo</h4>'+notes.map(function(note){var photo=typeof note.foto==='string'&&/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(note.foto)?'<img class="ep-photo" loading="lazy" src="'+e(note.foto)+'" alt="'+e(note.titulo||'Registro fotográfico')+'">':'';return '<article class="con-painel"><h4>'+e(note.titulo||'Observação')+'</h4><p>'+e(date(String(note.criadoEm||'').slice(0,10)))+' · '+(note.resolvido?'Resolvida':'Aberta')+'</p><p class="ep-description">'+e(note.descricao||'')+'</p>'+(note.recomendacao?'<p>'+e(note.recomendacao)+'</p>':'')+photo+'</article>';}).join(''):'';
}
function render(s,parts){
 var st=arr((w.data[s.qid]||{}).estudos).find(function(x){return x.id===s.sid;})||{},p=st.protocolo||{},gs=groups(s);
 if(!state||state.s.key!==s.key)state={s:s,variable:gs[0]&&gs[0].key,assessment:''};else{state.s=s;if(!gs.some(function(g){return g.key===state.variable;}))state.variable=gs[0]&&gs[0].key;}
 var avs=arr(st.avaliacoes),reps=Math.max(1,parseInt(st.numRepeticoes,10)||1),count=s.resultados.reduce(function(a,r){return a+r.n;},0),expected=avs.reduce(function(a,av){return a+arr(av.variaveis).length*s.tratamentos.length*reps;},0),pct=expected?Math.min(100,Math.round(count/expected*100)):0;
 var h='<div class="ep-page"><div class="ep-top">'+w.agConhecimento.bot('voltar','‹ Estudos e conhecimento')+w.agConhecimento.bot('original','Ficha operacional','data-key="'+e(s.key)+'"')+'</div><header class="ep-hero"><div><p class="ep-eyebrow">DOSSIÊ EXPERIMENTAL · '+(s.ambiente==='laboratorio'?'LABORATÓRIO':'CAMPO')+'</p><h2>'+e(s.codigo)+'</h2><p>'+e(s.cultura||'Cultura não informada')+' · '+e(s.alvo||'Alvo não informado')+'</p><p class="ep-location">'+e(s.local)+' / '+e(s.quadra)+'</p></div><div class="ep-progress"><span class="con-selo '+(s.finalizado?'finalizado':'em-execucao')+'">'+(s.finalizado?'Finalizado':'Em execução')+'</span><strong>'+pct+'<small>%</small></strong><span>dos valores previstos nas avaliações cadastradas</span><progress value="'+pct+'" max="100" aria-label="Preenchimento das avaliações">'+pct+'%</progress></div></header><div class="ep-stats">'+[['Tratamentos',s.tratamentos.length],['Repetições previstas',reps],['Avaliações',avs.length],['Valores registrados',count]].map(function(x){return '<div><strong>'+num(x[1])+'</strong><span>'+x[0]+'</span></div>';}).join('')+'</div><nav class="ep-nav" aria-label="Seções do estudo">'+[['graficos','Gráficos'],['protocolo','Protocolo'],['resultados','Resultados'],['brutos','Repetições'],['ambiente','Ambiente'],['contexto','Contexto'],['custos','Custos'],['historico','Histórico']].map(function(x){return '<a href="#ep-'+x[0]+'" data-ep-scroll="ep-'+x[0]+'">'+x[1]+'</a>';}).join('')+'</nav>';
 h+=section('graficos','Resultados em perspectiva','<div id="ep-charts-body">'+charts()+'</div>');
 var facts=fact('Início',date(s.inicio))+fact('Delineamento',s.desenho)+fact('Método de aplicação',s.metodo)+fact('Cultivar',st.variedade||st.cultivar||p.cultivar)+fact('Aplicações previstas',st.numAplicacoes)+fact('Intervalo entre aplicações (dias)',st.intervaloDias)+fact('Parcela',p.tamanhoParcela)+fact('Volume de calda',p.volumeCalda||p.volumeCaldaLHa&&p.volumeCaldaLHa+' L/ha')+fact('Protocolo de origem',st.protocoloOrigem&&st.protocoloOrigem.nome);
 h+=section('protocolo','Protocolo e tratamentos',(st.descricao?'<p class="ep-description">'+e(st.descricao)+'</p>':'')+'<dl class="ep-facts">'+facts+'</dl>'+table(['Tratamento','Produto','Dose','Método','Referência'],s.tratamentos.map(function(t){return [e(t.id),e(t.produto),e(t.dose||'Não informada'),e(t.metodo),t.testemunha?'Testemunha':'—'];})));
 h+=section('resultados','Todos os resultados',parts.tabela+storedStats(st,s));
 h+=section('brutos','Dados por repetição',rawTable(st,s));
 h+=section('ambiente','Ambiente e condução',parts.contexto+fieldNotes(st,s));
 h+=section('contexto','Identificação e vínculos',parts.integracoes);
 h+=section('custos','Consumo e custos',parts.custos);
 var audits=arr(st.audit||st.auditLog).slice().sort(function(a,b){return Number(b.ts||0)-Number(a.ts||0);});
 h+=section('historico','Histórico do estudo',(s.finalizado?'<p>Finalizado em '+e(s.finalizadoEm)+' · '+e(s.finalizadoPor||'Responsável não informado')+'</p>':'')+(audits.length?table(['Quando','Responsável','Ação'],audits.map(function(a){var dt=new Date(a.iso||a.ts);return [e(Number.isFinite(dt.getTime())?dt.toLocaleString('pt-BR'):'Sem data'),e(a.user||a.nome||'Não identificado'),e(a.action||a.acao||'Registro')];})):empty('Nenhum evento de auditoria disponível neste estudo.')));
 return h+'</div>';
}
 document.addEventListener('change',function(ev){if(!state||!ev.target.matches('#conhecimentoOvl [data-ep]'))return;var k=ev.target.dataset.ep;if(k==='variable'){state.variable=ev.target.value;state.assessment='';}else state.assessment=ev.target.value;var el=document.getElementById('ep-charts-body');if(el){el.innerHTML=charts();var select=el.querySelector('[data-ep="'+k+'"]');if(select)select.focus();}});
 document.addEventListener('click',function(ev){var link=ev.target.closest&&ev.target.closest('[data-ep-scroll]');if(link){ev.preventDefault();var el=document.getElementById(link.dataset.epScroll);if(el)el.scrollIntoView({behavior:w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}});
 w.AgEstudoPagina={render:render};
})(window);
