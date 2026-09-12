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
/* Barras agrupadas: cada avaliação conserva seu próprio valor e testemunha. */
function groupedChart(s,rows,metric){
 if(!rows.length)return empty('Ainda não há resultados para este gráfico.');
 var control=metric==='controle', evs=evaluations(rows), ts=s.tratamentos.filter(function(t){return rows.some(function(r){return r.tratamento===t.id;});});
 var value=function(r){return r?(control?r.controle:r.media):null;};
 var vals=rows.map(value).filter(function(v){return v!==null&&Number.isFinite(v);});
 var lo=Math.min(0,...vals),hi=Math.max(0,...vals);if(hi===lo)hi=lo+1;
 var step=(hi-lo)/5,top=hi+step*.5,bottom=lo<0?lo-step*.5:0;
 var bw=46,gap=5,groupW=Math.max(180,evs.length*(bw+gap)+30),width=86+ts.length*groupW+22,height=465;
 var y=function(v){return 316-(v-bottom)/(top-bottom)*260;};
 function whyMissing(t,av,r){
  if(t.testemunha)return 'Testemunha de referência';
  if(!r)return 'Sem valor registrado para este tratamento nesta avaliação';
  var ref=rows.find(function(x){return x.avaliacao===av.avaliacao&&x.testemunha;});
  if(!ref)return 'Abbott indisponível: sem testemunha com valor nesta avaliação';
  if(r.sentido==='maior'&&r.tipo==='contagem')return 'Abbott indisponível: mortalidade em contagem sem denominador';
  if(r.sentido!=='maior'&&ref.media<=0)return 'Abbott indisponível: testemunha menor ou igual a zero';
  if(r.sentido==='maior'&&(ref.media<0||ref.media>=100))return 'Abbott indisponível: testemunha fora do intervalo de 0 a menos de 100%';
  return 'Abbott indisponível: correção fora dos limites válidos do método';
 }
 var fill=function(i){return 'hsl(32, '+(66+i/Math.max(1,evs.length-1)*18)+'%, '+(75-i/Math.max(1,evs.length-1)*45)+'%)';};
 var title=control?'Controle por Abbott (%) por tratamento e data':rows[0].variavel+' por tratamento e data';
 var svg='<svg class="ep-group-svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+e(title)+'"><title>'+e(title)+'</title><desc>Cada grupo é um tratamento e cada cor é uma avaliação. Toque em uma barra para consultar valor, data e número de repetições.</desc>';
 for(var k=0;k<=5;k++){var v=lo+step*k;svg+='<line class="ep-grid" x1="74" x2="'+(width-16)+'" y1="'+y(v)+'" y2="'+y(v)+'"/><text x="64" y="'+(y(v)+5)+'" text-anchor="end">'+num(v)+'</text>';}
 svg+='<text x="74" y="25">'+e(control?'Controle por Abbott (%)':rows[0].variavel+(unit(rows[0])?' ('+unit(rows[0])+')':''))+'</text><line class="ep-baseline" x1="74" x2="'+(width-16)+'" y1="'+y(0)+'" y2="'+y(0)+'"/>';
 function wrap(text,max){var words=String(text||'').split(/\s+/),out=[],line='';words.forEach(function(word){if((line+' '+word).trim().length>max&&line){out.push(line);line='';}while(word.length>max){if(line){out.push(line);line='';}out.push(word.slice(0,max));word=word.slice(max);}line+=(line?' ':'')+word;});if(line)out.push(line);return out;}
 ts.forEach(function(t,ti){var gx=86+ti*groupW,offset=(groupW-evs.length*(bw+gap))/2;
  evs.forEach(function(av,ai){var r=rows.find(function(r){return r.tratamento===t.id&&r.avaliacao===av.avaliacao;}),v=value(r),x=gx+offset+ai*(bw+gap),missing=v===null||!Number.isFinite(v);
   var detail=t.id+' · '+t.produto+' · '+label(av)+' · '+(missing?(control?whyMissing(t,av,r):'Sem valor registrado'):(control?'Abbott: ':r.n===1?'Valor registrado: ':'Média: ')+num(v)+' '+(control?'%':unit(r)))+(r?' · n = '+r.n:'');
   if(missing){svg+='<text class="ep-bar-missing" x="'+(x+bw/2)+'" y="'+(y(0)-10)+'" text-anchor="middle" tabindex="0" data-ep-detail="'+e(detail)+'">'+(control&&t.testemunha?'Ref.':'—')+'<title>'+e(detail)+'</title></text>';return;}
   var barY=Math.min(y(0),y(v)),barH=Math.abs(y(0)-y(v));
   svg+='<g class="ep-bar" tabindex="0" data-ep-detail="'+e(detail)+'" data-value="'+v+'" data-n="'+r.n+'" aria-label="'+e(detail)+'"><title>'+e(detail)+'</title><rect x="'+x+'" y="'+barY+'" width="'+bw+'" height="'+barH+'" fill="'+fill(ai)+'"/><rect class="ep-bar-hit" x="'+x+'" y="'+(barH<8?y(0)-8:barY)+'" width="'+bw+'" height="'+Math.max(16,barH)+'" fill="transparent"/><text x="'+(x+bw/2)+'" y="'+(v<0?y(v)+18:y(v)-9)+'" text-anchor="middle">'+num(v)+'</text></g>';
  });
  var lines=[t.id].concat(wrap(t.produto,Math.max(18,Math.floor(groupW/8))).slice(0,3)).concat(wrap(t.dose||'',Math.max(18,Math.floor(groupW/8))).slice(0,2));
  lines.forEach(function(line,i){svg+='<text class="ep-group-label" x="'+(gx+groupW/2)+'" y="'+(343+i*19)+'" text-anchor="middle">'+e(line)+'</text>';});
 });
 svg+='</svg>';
 var ns=rows.map(function(r){return r.n;}),minN=Math.min(...ns),maxN=Math.max(...ns);
 return '<figure class="ep-grouped"><div class="ep-legend ep-date-legend">'+evs.map(function(av,i){return '<span><i style="background:'+fill(i)+'"></i>'+e(label(av))+'</span>';}).join('')+'</div><div class="ep-group-scroll" tabindex="0" role="region" aria-label="'+e(title)+'; role para os lados para ver todos os tratamentos">'+svg+'</div><output class="ep-bar-detail" aria-live="polite">Toque em uma barra para ver os detalhes. Deslize o gráfico para os lados.</output><figcaption>'+(control?'Controle calculado com a testemunha da mesma avaliação. ':'Resultados registrados por tratamento em cada avaliação. ')+(minN===maxN?'n = '+minN:'n = '+minN+' a '+maxN)+' por resultado. '+(maxN===1?'Uma repetição: cada barra mostra o resultado individual.':'Com uma repetição, mostra o valor individual; com duas ou mais, a média dos valores disponíveis.')+' Figura descritiva, sem teste de médias. Ausências não são representadas como zero.'+(control?' Ref. = testemunha. — = sem correção válida.':'')+'</figcaption></figure>';
}
function comparison(s,rows){
 var gs=[];rows.forEach(function(r){var key=signature(r);if(!gs.some(function(g){return g.key===key;}))gs.push({key:key,r:r});});
 return gs.map(function(g){return '<article class="ep-chart ep-comparison"><p class="ep-eyebrow">'+e(s.codigo)+'</p><h4>'+e(g.r.variavel)+' · resultados por data</h4>'+groupedChart(s,rows.filter(function(r){return signature(r)===g.key;}),'media')+'</article>';}).join('');
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
 return '<div class="ep-controls"><label>Variável<select data-ep="variable">'+gs.map(function(g){return '<option value="'+e(g.key)+'"'+(g.key===state.variable?' selected':'')+'>'+e(g.r.variavel)+' · '+e(unit(g.r)||g.r.tipo)+' · '+(g.r.sentido==='maior'?'maior primeiro':'menor primeiro')+'</option>';}).join('')+'</select></label><label>Avaliação do ranking<select data-ep="assessment">'+evs.map(function(r){return '<option value="'+e(r.avaliacao)+'"'+(r.avaliacao===state.assessment?' selected':'')+'>'+e(label(r))+'</option>';}).join('')+'</select></label><label>Barras por data<select data-ep="barMetric"><option value="media"'+(state.barMetric!=='controle'?' selected':'')+'>Resultado registrado</option><option value="controle"'+(state.barMetric==='controle'?' selected':'')+'>Controle por Abbott (%)</option></select></label></div><article class="ep-chart ep-comparison"><p class="ep-eyebrow">TODAS AS AVALIAÇÕES</p><h4>'+e(state.barMetric==='controle'?'Controle por Abbott (%)':rows[0].variavel)+' por tratamento e data</h4>'+groupedChart(state.s,rows,state.barMetric)+'</article><div class="ep-charts"><article class="ep-chart"><p class="ep-eyebrow">EVOLUÇÃO DO ENSAIO</p><h4>'+e(rows[0].variavel)+' por data</h4>'+lineChart(rows)+'</article><article class="ep-chart"><p class="ep-eyebrow">COMPARAÇÃO DOS TRATAMENTOS</p><h4>Ranking · '+e(rows[0].variavel)+'</h4><p class="ep-caption">'+e(label(evs.find(function(r){return r.avaliacao===state.assessment;})))+'</p>'+ranking(rows)+'</article></div>';
}
function rawTable(st,s){
 var rows=[];arr(st.avaliacoes).forEach(function(av,ai){if(state&&state.rawAv&&av.id!==state.rawAv)return;s.tratamentos.forEach(function(t){for(var rep=1;rep<=Math.max(1,parseInt(st.numRepeticoes,10)||1);rep++){arr(av.variaveis).forEach(function(v){var row={key:t.id+'R'+rep,tratId:t.id,rep:rep};var value=typeof w._avNota==='function'?w._avNota(av,row,v):((av.notas||{})[row.key]||{})[v];var val=C.numero(value);rows.push([e(date(av.data))+'<small>'+e(av.hora||'')+' · '+e(av.id||'av-'+ai)+'</small>',e(t.id)+' · '+e(t.produto),'R'+rep,e(v),val===null?'—':num(val)]);});}});});
 return (state&&state.rawAv?'<button class="con-btn" data-ep-source="">Mostrar todas as avaliações</button>':'')+(rows.length?table(['Avaliação','Tratamento','Repetição','Variável','Valor registrado'],rows)+ '<p class="con-note">— = sem valor numérico registrado; zero é uma observação válida. Valores exibidos na escala registrada, antes de transformações estatísticas.</p>':empty('Nenhuma avaliação cadastrada.'));
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
/* Relatórios completos, preservando as identidades projetadas do Conhecimento. */
function protectedReport(value,st,s){
 var hidden=[];
 arr(st.tratamentos).forEach(function(t){var safe=tr(s,t.id).produto;if(t.produto&&safe!==t.produto)hidden.push([t.produto,safe]);});
 Object.keys(w.ITENS||{}).forEach(function(k){var it=w.ITENS[k];if(it&&it.codigoCego){[it.nome,it.ativos].forEach(function(name){if(typeof name==='string'&&name)hidden.push([name,it.codigoCego]);});}});
 hidden.sort(function(a,b){return b[0].length-a[0].length;});
 function clean(x){if(typeof x==='string'){hidden.forEach(function(p){x=x.split(p[0]).join(p[1]);});return x;}if(Array.isArray(x))return x.map(clean);if(x&&typeof x==='object'){var out=Object.create(null);Object.keys(x).forEach(function(k){out[clean(k)]=clean(x[k]);});return out;}return x;}
 return clean(value);
}
/* Snapshot de leitura: um estudo, sem credenciais nem acervo de outros clientes. */
function exportContext(st,s){
 var hidden=[];
 arr(st.tratamentos).forEach(function(t){var safe=tr(s,t.id).produto;if(safe!==t.produto){[t.produto,t.ia,t.ingredienteAtivo].forEach(function(v){if(typeof v==='string'&&v)hidden.push([v,safe]);});arr(t.componentes).forEach(function(c){[c.nome,c.ia,c.ingredienteAtivo].forEach(function(v){if(typeof v==='string'&&v)hidden.push([v,safe]);});});}});
 hidden.sort(function(a,b){return b[0].length-a[0].length;});
 function clean(v){
  if(typeof v==='string'){if(/^data:|^blob:/.test(v))return '[Arquivo binário não incluído nos campos; fotos locais são opcionais na exportação]';hidden.forEach(function(p){v=v.split(p[0]).join(p[1]);});return v;}
  if(Array.isArray(v))return v.map(clean);
  if(v&&typeof v==='object'){var out=Object.create(null);Object.keys(v).forEach(function(k){if(/^(password|senha|access_token|refresh_token|token|apiKey|apikey|secret|credenciais)$/i.test(k))return;out[k]=clean(v[k]);});return out;}return v;
 }
 var q=w.data[s.qid]||{},lid=(w.QLOCAL||{})[s.qid],loc=(w.LOCAIS||{})[lid]||{};
 var context={local:{id:lid,nome:loc.nome},quadra:{id:s.qid,nome:s.quadra,tipo:q.tipo,cultura:q.cultura,solo:q.solo},geometria:(w.QGEO||{})[s.qid],vinculos:s.integracoes,consumos:s.consumos,custos:C.custo(s.consumos,s.integracoes),notas:typeof w.notasDoEstudo==='function'?w.notasDoEstudo(s.qid,st):[]};
 var findings=typeof w._forenseAchadosEstudo==='function'?w._forenseAchadosEstudo(st,s.qid):[];
 return clean(protectedReport({schema:'agracta-relatorio-1',generated:new Date().toISOString(),projection:s,study:st,context:context,analysis:analysisData(st,s),forensics:{estudo:findings,eventos:arr(st.avaliacoes).concat(arr(st.aplicacoes)).map(function(a){return {id:a.id,data:a.data,achados:typeof w._forenseAchados==='function'?w._forenseAchados(a):[]};})}},st,s));
}
function reportTree(value){
 if(value===null||value===undefined)return '<span>Não disponível</span>';
 if(typeof value!=='object')return '<span>'+e(typeof value==='boolean'?(value?'Sim':'Não'):value)+'</span>';
 var keys=Object.keys(value);if(!keys.length)return '<span>Sem registros</span>';
 var names={analise:'Análise',comparacao_medias:'Comparação de médias',descritiva:'Estatística descritiva',normalidade:'Normalidade',homogeneidade:'Homogeneidade',decisao:'Decisão do método',avisos:'Avisos',achados:'Achados',veredito:'Resumo da triagem',parametros:'Parâmetros',explicacao_inocente:'Explicação alternativa',executado:'Teste executado',na:'Inconclusivo'};
 return '<dl class="ep-report">'+keys.map(function(k){return '<div><dt>'+e(Array.isArray(value)?Number(k)+1:names[k]||k.replace(/_/g,' '))+'</dt><dd>'+reportTree(value[k])+'</dd></div>';}).join('')+'</dl>';
}
function analysisData(st,s){
 if(s.finalizado)return st.estatisticaFinal&&st.estatisticaFinal.avancado||null;
 return typeof w._bioestatSnapshotAvancado==='function'?w._bioestatSnapshotAvancado(s.qid,st):null;
}
function analyses(st,s){
 var a=analysisData(st,s), html='';
 if(!s.finalizado&&typeof w._bioestatEnsureStudy==='function')setTimeout(function(){if(state&&state.s.key===s.key)w._bioestatEnsureStudy(s.qid,s.sid);},0);
 if(!a)return empty(s.finalizado?'Este fechamento antigo não preservou o relatório avançado. A estatística disponível continua na seção Resultados.':'Motor estatístico indisponível nesta versão.');
 a=protectedReport(a,st,s);
 html+='<p class="con-note">'+(s.finalizado?'Relatórios preservados no fechamento de '+date(a.geradoEm.slice(0,10))+'.':'Resultados atualizados conforme cada análise termina.')+' Uma repetição mantém o resultado e Abbott quando aplicável; comparações estatísticas dependem do delineamento e dos dados.</p>';
 var count={calculado:0,pendente:0,erro:0};arr(a.jobs).forEach(function(j){var r=a.results[j.jobKey];count[!r?'pendente':r.ok===true?'calculado':'erro']++;});
 html+='<div class="ep-analysis-counts" role="status">'+count.calculado+' calculados · '+count.pendente+' pendentes · '+count.erro+' com erro · '+arr(a.indisponiveis).length+' sem comparação</div>';
 if(!s.finalizado&&count.erro&&!count.pendente)html+='<button class="con-btn" data-ep-action="retry">Tentar os cálculos novamente</button>';
 html+='<button class="con-btn" data-ep-action="download">Baixar dossiê de análises</button>';
 arr(a.jobs).forEach(function(j){
  var r=a.results[j.jobKey], status=!r?'Pendente':r.ok===true?'Calculado':'Erro de cálculo', title=(j.modo==='forense'?'Triagem forense':j.modo==='tempo'?'Sobrevivência no tempo':'Estatística')+' · '+j.variavel+(j.date?' · '+date(j.date):'');
  html+='<article class="ep-analysis-card"><h4>'+e(title)+'</h4><p class="ep-analysis-status">'+status+'</p>';
  if(j.avId)html+='<button class="con-btn" data-ep-source="'+e(j.avId)+'">Ver repetições desta avaliação</button>';
  if(!r)html+='<p>'+(s.finalizado?'Não estava calculado no fechamento.':'Aguardando o motor estatístico. O resultado aparecerá aqui automaticamente.')+'</p>';
  else if(r.ok!==true)html+='<p>'+e(r.erro||'O motor não retornou um relatório válido.')+'</p>';
  else{
   if(j.modo==='forense'){
    var v=r.veredito||{};
    html+='<p>'+e(v.resumo||'Consulte os testes e sua cobertura abaixo.')+'</p>';
    html+='<p>Testes executados: '+e(v.testes_executados==null?'Não informado':v.testes_executados)+' · Inconclusivos: '+e(v.testes_inconclusivos==null?'Não informado':v.testes_inconclusivos)+'</p>';
    html+=arr(r.achados).map(function(f){return '<details class="ep-finding"><summary>'+e(f.nome)+' · '+e(f.executado===false?'Inconclusivo':f.severidade==='clear'?'Sem sinal neste teste':f.severidade||'Conferir')+'</summary><p>'+e(f.leitura||'')+'</p><p>'+e(f.explicacao_inocente||'')+'</p></details>';}).join('');
   }else if(j.modo==='tempo'&&typeof w._bioestatTempoCard==='function')html+=w._bioestatTempoCard(j,r);
   else if(typeof w._bioestatResumoCard==='function')html+=w._bioestatResumoCard(j,r);
   html+='<details data-report-key="'+e(j.jobKey)+'"><summary>Relatório completo e parâmetros</summary>'+reportTree(r)+'</details>';
  }
  html+='</article>';
 });
 html+=arr(a.indisponiveis).map(function(j){return '<p class="con-note"><b>'+e(j.variavel)+' · '+e(date(j.date))+'</b>: '+e(j.motivo)+'</p>';}).join('');
 return html;
}
function localForensics(st,s){
 var out=[], globalFindings=typeof w._forenseAchadosEstudo==='function'?w._forenseAchadosEstudo(st,s.qid):[];
 arr(globalFindings).forEach(function(f){out.push({title:'Condução do estudo',f:f});});
 if(typeof w._forenseAchados==='function')arr(st.avaliacoes).concat(arr(st.aplicacoes)).forEach(function(av){arr(w._forenseAchados(av)).forEach(function(f){out.push({title:date(av.data),avId:arr(st.avaliacoes).includes(av)?av.id:null,f:f});});});
 out=protectedReport(out,st,s);
 return '<p>Conferências dos registros de campo. A triagem estatística aparece junto de cada análise acima. Os sinais pedem revisão e não comprovam fraude.</p>'+(out.length?out.map(function(x){return '<article class="ep-analysis-card"><h4>'+e(x.title)+'</h4><p>'+e(x.f.texto)+'</p>'+(x.avId?'<button class="con-btn" data-ep-source="'+e(x.avId)+'">Conferir valores desta avaliação</button>':'')+'</article>';}).join(''):empty('Nenhum alerta nas verificações locais disponíveis. Isso não indica que todos os testes forenses foram executados.'));
}
function timeline(st,s){
 var events=s.aplicacoes.map(function(a){var c=a.clima||{};return {data:a.data,tipo:'Aplicação',det:[c.temp==null?'':num(c.temp)+' °C',c.ur==null?'':'UR '+num(c.ur)+'%',c.vento==null?'':'Vento '+num(c.vento),c.fonte||''].filter(Boolean).join(' · ')||'Sem clima registrado'};});
 arr(st.avaliacoes).forEach(function(a){events.push({data:a.data,tipo:'Avaliação',det:arr(a.variaveis).join(' · ')});});
 events.sort(function(a,b){return String(a.data||'').localeCompare(String(b.data||''));});
 return '<p>Aplicações previstas: '+e(st.numAplicacoes||'Não informado')+' · registradas: '+s.aplicacoes.length+'. Avaliações cadastradas: '+arr(st.avaliacoes).length+'.</p>'+table(['Data','Evento','Registro'],events.map(function(x){return [e(date(x.data)),e(x.tipo),e(x.det)];}));
}
function updateAnalyses(c){
 var ov=document.getElementById('conhecimentoOvl'),box=document.getElementById('ep-analysis-body');
 if(!state||!ov||ov.hidden||!box||state.s.qid!==c.qid||state.s.sid!==c.sid||state.s.finalizado)return;
 var st=arr((w.data[c.qid]||{}).estudos).find(function(x){return x.id===c.sid;});if(!st)return;
 var open=Array.from(box.querySelectorAll('details[open][data-report-key]')).map(function(x){return x.dataset.reportKey;});
 box.innerHTML=analyses(st,state.s);box.querySelectorAll('[data-report-key]').forEach(function(x){x.open=open.includes(x.dataset.reportKey);});
}

function render(s,parts){
 var st=arr((w.data[s.qid]||{}).estudos).find(function(x){return x.id===s.sid;})||{},p=st.protocolo||{},gs=groups(s);
 if(!state||state.s.key!==s.key)state={s:s,variable:gs[0]&&gs[0].key,assessment:''};else{state.s=s;if(!gs.some(function(g){return g.key===state.variable;}))state.variable=gs[0]&&gs[0].key;}
 var avs=arr(st.avaliacoes),reps=Math.max(1,parseInt(st.numRepeticoes,10)||1),count=s.resultados.reduce(function(a,r){return a+r.n;},0),expected=avs.reduce(function(a,av){return a+arr(av.variaveis).length*s.tratamentos.length*reps;},0),pct=expected?Math.min(100,Math.round(count/expected*100)):0;
 var h='<div class="ep-page"><div class="ep-top">'+w.agConhecimento.bot('voltar','‹ Estudos e conhecimento')+w.agConhecimento.bot('original','Ficha operacional','data-key="'+e(s.key)+'"')+'</div><header class="ep-hero"><div><p class="ep-eyebrow">DOSSIÊ EXPERIMENTAL · '+(s.ambiente==='laboratorio'?'LABORATÓRIO':'CAMPO')+'</p><h2>'+e(s.codigo)+'</h2><p>'+e(s.cultura||'Cultura não informada')+' · '+e(s.alvo||'Alvo não informado')+'</p><p class="ep-location">'+e(s.local)+' / '+e(s.quadra)+'</p></div><div class="ep-progress"><span class="con-selo '+(s.finalizado?'finalizado':'em-execucao')+'">'+(s.finalizado?'Finalizado':'Em execução')+'</span><strong>'+pct+'<small>%</small></strong><span>dos valores previstos nas avaliações cadastradas</span><progress value="'+pct+'" max="100" aria-label="Preenchimento das avaliações">'+pct+'%</progress></div></header><div class="ep-stats">'+[['Tratamentos',s.tratamentos.length],['Repetições previstas',reps],['Avaliações',avs.length],['Valores registrados',count]].map(function(x){return '<div><strong>'+num(x[1])+'</strong><span>'+x[0]+'</span></div>';}).join('')+'</div><nav class="ep-nav" aria-label="Seções do estudo">'+[['fotos','Slides e fotos'],['graficos','Gráficos'],['protocolo','Protocolo'],['resultados','Resultados'],['analises','Estatística e forense'],['brutos','Repetições'],['conducao','Linha do tempo'],['ambiente','Ambiente'],['contexto','Contexto'],['custos','Custos'],['historico','Histórico']].map(function(x){return '<a href="#ep-'+x[0]+'" data-ep-scroll="ep-'+x[0]+'">'+x[1]+'</a>';}).join('')+'</nav>';
 h+=section('fotos','Gráficos, slides e fotos','<p>Configure os gráficos e baixe as figuras e os slides deste estudo. As fotos das parcelas ficam na galeria exclusiva deste aparelho.</p><button type="button" class="con-btn" data-ep-action="charts">Gráficos e slides</button> <button type="button" class="con-btn" data-ep-action="report">Relatório completo e R</button> <button type="button" class="con-btn" data-ep-action="photos">Abrir galeria local e montar slides</button>');
 h+=section('graficos','Resultados em perspectiva','<div id="ep-charts-body">'+charts()+'</div>');
 var facts=fact('Início',date(s.inicio))+fact('Delineamento',s.desenho)+fact('Método de aplicação',s.metodo)+fact('Cultivar',st.variedade||st.cultivar||p.cultivar)+fact('Aplicações previstas',st.numAplicacoes)+fact('Intervalo entre aplicações (dias)',st.intervaloDias)+fact('Parcela',p.tamanhoParcela)+fact('Volume de calda',p.volumeCalda||p.volumeCaldaLHa&&p.volumeCaldaLHa+' L/ha')+fact('Protocolo de origem',st.protocoloOrigem&&st.protocoloOrigem.nome);
 h+=section('protocolo','Protocolo e tratamentos',(st.descricao?'<p class="ep-description">'+e(st.descricao)+'</p>':'')+'<dl class="ep-facts">'+facts+'</dl>'+table(['Tratamento','Produto','Dose','Método','Referência'],s.tratamentos.map(function(t){return [e(t.id),e(t.produto),e(t.dose||'Não informada'),e(t.metodo),t.testemunha?'Testemunha':'—'];})));
 h+=section('resultados','Todos os resultados',parts.tabela+storedStats(st,s));
 h+=section('analises','Estatística e forense','<div id="ep-analysis-body">'+analyses(st,s)+'</div>');
 h+=section('forense','Conferência dos registros',localForensics(st,s));
 h+=section('brutos','Dados por repetição','<div id="ep-raw-body">'+rawTable(st,s)+'</div>');
 h+=section('conducao','Linha do tempo e execução',timeline(st,s));
 h+=section('ambiente','Ambiente e condução',parts.contexto+fieldNotes(st,s));
 h+=section('contexto','Identificação e vínculos',parts.integracoes);
 h+=section('custos','Consumo e custos',parts.custos);
 var audits=arr(st.audit||st.auditLog).slice().sort(function(a,b){return Number(b.ts||0)-Number(a.ts||0);});
 h+=section('historico','Histórico do estudo',(s.finalizado?'<p>Finalizado em '+e(s.finalizadoEm)+' · '+e(s.finalizadoPor||'Responsável não informado')+'</p>':'')+(audits.length?table(['Quando','Responsável','Ação'],audits.map(function(a){var dt=new Date(a.iso||a.ts);return [e(Number.isFinite(dt.getTime())?dt.toLocaleString('pt-BR'):'Sem data'),e(a.user||a.nome||'Não identificado'),e(a.action||a.acao||'Registro')];})):empty('Nenhum evento de auditoria disponível neste estudo.')));
 return h+'</div>';
}
 document.addEventListener('change',function(ev){if(!state||!ev.target.matches('#conhecimentoOvl [data-ep]'))return;var k=ev.target.dataset.ep;if(k==='variable'){state.variable=ev.target.value;state.assessment='';}else if(k==='barMetric')state.barMetric=ev.target.value;else state.assessment=ev.target.value;var el=document.getElementById('ep-charts-body');if(el){el.innerHTML=charts();var select=el.querySelector('[data-ep="'+k+'"]');if(select)select.focus();}});
 document.addEventListener('click',function(ev){var link=ev.target.closest&&ev.target.closest('[data-ep-scroll]');if(link){ev.preventDefault();var el=document.getElementById(link.dataset.epScroll);if(el)el.scrollIntoView({behavior:w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}});
 document.addEventListener('click',showBar);document.addEventListener('focusin',showBar);
 function showBar(ev){var bar=ev.target.closest&&ev.target.closest('#conhecimentoOvl [data-ep-detail]');if(!bar)return;var output=bar.closest('.ep-grouped').querySelector('.ep-bar-detail');if(output)output.textContent=bar.dataset.epDetail;}
 document.addEventListener('click',function(ev){
 var b=ev.target.closest&&ev.target.closest('#conhecimentoOvl [data-ep-action],#conhecimentoOvl [data-ep-source]');if(!b||!state)return;
 var s=state.s,st=arr((w.data[s.qid]||{}).estudos).find(function(x){return x.id===s.sid;});if(!st)return;
 if(b.hasAttribute('data-ep-source')){state.rawAv=b.dataset.epSource;var box=document.getElementById('ep-raw-body');box.innerHTML=rawTable(st,s);box.scrollIntoView({block:'start'});return;}
 if(b.dataset.epAction==='charts'&&typeof w.openPranchaEstudo==='function'){
  var rows=selected();w.openPranchaEstudo(s.qid,s.sid,rows.length?rows[0].variavel:undefined);
  var ov=document.getElementById('prOvl');if(ov)ov.style.zIndex='4001';
 }
 if(b.dataset.epAction==='report'&&typeof w.abrirRelatorioEstudo==='function')w.abrirRelatorioEstudo(exportContext(st,w.agConhecimento.projetar(s.qid,st,w.data[s.qid])));
 if(b.dataset.epAction==='photos'&&typeof w.abrirGaleriaFotos==='function')w.abrirGaleriaFotos(s);
 if(b.dataset.epAction==='retry'&&typeof w._bioestatRepetir==='function')w._bioestatRepetir(s.qid,s.sid);
 if(b.dataset.epAction==='download'){
  var report=protectedReport(analysisData(st,s),st,s);if(!report)return;
  w._sinergistaSaveBlob(new Blob([JSON.stringify({estudo:s.codigo,tratamentos:s.tratamentos.map(function(t){return {id:t.id,produto:t.produto,dose:t.dose};}),analises:report},null,2)],{type:'application/json'}),'agracta-dossie-'+String(s.codigo).replace(/[^a-z0-9_-]/gi,'_')+'.json');
 }
});
 w.AgEstudoPagina={render:render,comparar:comparison,atualizarAnalises:updateAnalyses};
})(window);
