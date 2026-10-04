/* Editor do protocolo: preparação integral antes de qualquer mutação. */
(function(w){
'use strict';
var ctx=null,copy=function(x){return JSON.parse(JSON.stringify(x));};
var papeis={experimental:'Tratamento experimental',sem_intervencao:'Testemunha (controle negativo)',sem_alvo:'Testemunha não infestada (sem alvo)',positivo:'Padrão (controle positivo)'};
function option(value,label,current){return '<option value="'+esc(value)+'"'+(value===current?' selected':'')+'>'+esc(label)+'</option>';}
function campo(label,html){return '<label class="pa-campo">'+label+html+'</label>';}
function input(k,v,type){return '<input data-pa="'+k+'" type="'+(type||'text')+'" value="'+esc(v==null?'':String(v))+'">';}
function estudo(){return data[ctx.qid].estudos.find(function(s){return s.id===ctx.sid;});}
w.openProtocoloAvaliacoes=function(qid,sid){
 var s=(data[qid].estudos||[]).find(function(s){return s.id===sid;});if(!s||estudoFinalizado(s))return;
 var p=copy(s.avaliacaoProtocolo||{variaveis:[]}),seen={};p.variaveis.forEach(function(r){seen[r.nome]=true;});
 if(!s.avaliacaoProtocolo)(s.avaliacoes||[]).forEach(function(a){(a.variaveis||[]).forEach(function(v){if(seen[v])return;seen[v]=true;
  /* variável que já existe abre com o cálculo que ela já tinha: sem calculoControle
     gravado, a tela calculava o % de controle — abrir em 'nenhum' fazia o simples
     salvar do protocolo apagar o % das avaliações seguintes. Escala em notas não tem. */
  var _vc=(a.varcfg||{})[v]||{},_tp=(a.tipos||{})[v]||'pct',_calc=(_tp==='escala'&&_vc.escalaModo==='nota')?'nenhum':'auto';
  p.variaveis.push({nome:v,tipo:_tp,cfg:Object.assign({calculoControle:_calc,referencia:studyTestemunha(s)},copy(_vc))});
 });});
 ctx={qid:qid,sid:sid,p:p,base:s._ts||0,roles:{},ids:[],motivo:""};var d=document.getElementById('paModal');if(!d){d=document.createElement('dialog');d.id='paModal';document.body.appendChild(d);}
 render();d.showModal();
};
function render(){
 var s=estudo(),h='<h2>Protocolo · avaliações e controles</h2><p>Vazio = pendente · 0 = resultado medido · — = não se aplica. As regras são explícitas, para qualquer alvo.</p>';
 h+='<h3>Papel dos tratamentos</h3>';
 s.tratamentos.forEach(function(t){h+=campo(esc(t.id+' · '+t.produto),'<select data-role="'+esc(t.id)+'">'+Object.keys(papeis).map(function(k){return option(k,papeis[k],ctx.roles[t.id]||t.papelControle||(t.testemunha?'sem_intervencao':'experimental'));}).join('')+'</select>');});
 h+='<h3>Variáveis</h3><div id="paVars">';
 ctx.p.variaveis.forEach(function(r,i){var c=r.cfg||{};
  h+='<fieldset data-rule="'+i+'"><legend>'+esc(r.nome)+'</legend>';
  h+=campo('Tipo','<select data-pa="tipo">'+Object.keys(AV_TIPO_LABEL).map(function(t){return option(t,AV_TIPO_LABEL[t],r.tipo);}).join('')+'</select>');
  h+=campo('Subamostras por parcela',input('sub',c.sub||1,'number'));
  h+=campo('N padrão (razão n/N)',input('N',c.N||0,'number'));
  h+='<div>Aplicável aos tratamentos:</div>';
  s.tratamentos.forEach(function(t){h+='<label class="pa-check"><input type="checkbox" data-trat="'+esc(t.id)+'"'+((c.naTratamentos||[]).indexOf(t.id)<0?' checked':'')+'> '+esc(t.id)+'</label>';});
  h+=campo('Datas específicas (AAAA-MM-DD, separadas por vírgula; vazio = todas)',input('datas',(r.datas||[]).join(', ')));
  h+=campo('Cálculo de controle','<select data-pa="calculoControle">'+option('nenhum','Somente resultados e médias',c.calculoControle||'nenhum')+option('auto','Eficácia / redução frente à referência',c.calculoControle)+'</select>');
  h+=campo('Referência do cálculo','<select data-pa="referencia">'+option('','Selecione',c.referencia)+s.tratamentos.map(function(t){return option(t.id,t.id+' · '+t.produto,c.referencia);}).join('')+'</select>');
  h+=campo('Sentido','<select data-pa="sentido">'+option('menor','Menor resultado é melhor',c.sentido||'menor')+option('maior','Maior resultado é melhor',c.sentido)+'</select>');
  h+='<details'+(r.tipo==='escala'?' open':'')+'><summary>Escala: limites e significado das notas</summary>';
  h+=campo('Nota mínima',input('escalaMin',c.escalaMin||0,'number'))+campo('Nota máxima',input('escalaMax',c.escalaMax||4,'number'));
  h+=campo('Resumo da escala','<select data-pa="escalaModo">'+option('nota','Manter notas (sem conversão percentual)',c.escalaModo||'indice')+option('indice','Índice percentual (McKinney)',c.escalaModo||'indice')+'</select>');
  h+=campo('Uma nota e descrição por linha','<textarea data-pa="escalaLegenda" placeholder="0 — normal&#10;1 — atividade reduzida">'+esc(c.escalaLegenda||c.escalaNome||'')+'</textarea>')+'</details></fieldset>';
 });
 h+='</div><button type="button" data-action="add">+ Variável</button><h3>Aplicar alterações</h3><p>Novas avaliações usarão estas regras. Selecione explicitamente quais avaliações existentes atualizar. Leituras preenchidas e assinaturas são protegidas.</p>';
 (s.avaliacoes||[]).forEach(function(a){h+='<label class="pa-check"><input type="checkbox" data-av="'+esc(a.id)+'"'+(ctx.ids.indexOf(a.id)>=0?' checked':'')+'> '+esc(a.data)+' · '+esc(a.momento?String(a.momento.valor)+' '+a.momento.unidade:(a.tipo||a.id))+'</label>';});
 h+=campo('Motivo da alteração', '<textarea id="paMotivo">'+esc(ctx.motivo)+'</textarea>');
 h+='<p id="paErro" role="alert"></p><div class="pa-actions"><button type="button" data-action="review">Revisar alterações</button><button type="button" data-action="close">Cancelar</button></div><div id="paReview"></div>';
 document.getElementById('paModal').innerHTML=h;
}
function ler(){
 var d=document.getElementById('paModal');
 Array.from(d.querySelectorAll('[data-role]')).forEach(function(x){ctx.roles[x.dataset.role]=x.value;});
 ctx.ids=Array.from(d.querySelectorAll('[data-av]:checked')).map(function(x){return x.dataset.av;});ctx.motivo=d.querySelector('#paMotivo').value;
 ctx.p.variaveis.forEach(function(r,i){var el=d.querySelector('[data-rule="'+i+'"]'),get=function(k){return el.querySelector('[data-pa="'+k+'"]').value;};
 r.tipo=get('tipo');r.datas=get('datas').split(',').map(function(x){return x.trim();}).filter(Boolean);
 r.cfg=Object.assign({},r.cfg,{sub:Math.max(1,Number(get('sub'))||1),N:Math.max(0,Number(get('N'))||0),calculoControle:get('calculoControle'),referencia:get('referencia'),sentido:get('sentido'),escalaMin:Number(get('escalaMin')),escalaMax:Number(get('escalaMax')),escalaModo:get('escalaModo'),escalaLegenda:get('escalaLegenda').trim(),naTratamentos:Array.from(el.querySelectorAll('[data-trat]')).filter(function(x){return !x.checked;}).map(function(x){return x.dataset.trat;})});
 });return d;
}
function preparar(){
 var d=ler(),s=estudo(),ids=Array.from(d.querySelectorAll('[data-av]:checked')).map(function(x){return x.dataset.av;}),motivo=d.querySelector('#paMotivo').value.trim();
 if(!motivo)throw Error('Informe o motivo para o histórico.');
 var mudancas=ProtocoloAvaliacaoCore.preparar(s,ctx.p,ids);
 return {s:s,ids:ids,motivo:motivo,mudancas:mudancas};
}
function salvar(){
 var d=document.getElementById('paModal'),x=preparar(),s=x.s,antes=copy(s),novo=copy(s);
 if((s._ts||0)!==ctx.base)throw Error('O estudo mudou desde a abertura. Feche e reabra o protocolo para revisar a versão atual.');
 if(estudoFinalizado(s))throw Error('Estudo finalizado: reabra pelo fluxo normal.');
 // Congela a herança anterior nas avaliações não selecionadas; novas regras não retroagem.
 novo.avaliacoes.forEach(function(a,i){if(!a.variaveis||!a.variaveis.length){var src=AvaliacaoCore.esquema(s,s.avaliacoes[i]);a.variaveis=copy(src.variaveis||[]);a.tipos=copy(src.tipos||{});a.varcfg=copy(src.varcfg||{});a.protocoloIgnorar=true;}});
 x.mudancas.forEach(function(m){var a=novo.avaliacoes.find(function(a){return a.id===m.av.id;});Object.assign(a,m.esquema);a._ts=Date.now();});
 novo.tratamentos.forEach(function(t){t.papelControle=d.querySelector('[data-role="'+t.id+'"]').value;t.testemunha=t.papelControle!=='experimental';});
 novo.avaliacaoProtocolo=copy(ctx.p);novo._ts=Date.now();
 if(w.ProtocoloVivoCore&&ProtocoloVivoCore.info(s).aprovado)ProtocoloVivoCore.emendar(s,novo,x.motivo,{em:new Date().toISOString(),por:(w._authUser||{}).email||'',nome:_currentUserName()});
 logStudyAuditInObject(novo,'Regras de avaliação',x.motivo,{antes:{protocolo:antes.avaliacaoProtocolo||null,tratamentos:antes.tratamentos,avaliacoes:antes.avaliacoes.filter(function(a){return x.ids.indexOf(a.id)>=0;})},depois:{protocolo:novo.avaliacaoProtocolo,avaliacoes:x.ids}});
 Object.assign(s,novo);save();d.close();openStudyDetail(ctx.qid,ctx.sid);
}
document.addEventListener('click',function(ev){var b=ev.target.closest('[data-action]'),d=document.getElementById('paModal');if(!b||!d||!d.contains(b))return;
 try{if(b.dataset.action==='close')d.close();
 else if(b.dataset.action==='add'){ler();var nome=prompt('Nome da variável:');if(nome&&nome.trim()){ctx.p.variaveis.push({nome:nome.trim(),tipo:'numero',cfg:{calculoControle:'nenhum',escalaModo:'nota'}});render();}}
 else if(b.dataset.action==='review'){var x=preparar();d.querySelector('#paReview').textContent='Serão atualizadas '+x.ids.length+' avaliações existentes ('+x.mudancas.map(function(m){return m.av.data;}).join(', ')+') e as regras para novas avaliações. Nenhuma leitura será alterada.';var btn=document.createElement('button');btn.textContent='Confirmar e salvar protocolo';btn.dataset.action='save';d.querySelector('#paReview').appendChild(btn);}
 else if(b.dataset.action==='save')salvar();
 }catch(e){d.querySelector('#paErro').textContent=e.message;}
});
document.addEventListener('input',function(ev){var d=document.getElementById('paModal');if(d&&d.contains(ev.target)){d.querySelector('#paReview').innerHTML='';d.querySelector('#paErro').textContent='';}});
})(window);

/* Controles visíveis no desktop; não intercepta arrasto, seleção de texto ou inputs. */
(function(){
 function instalar(){document.querySelectorAll('.av-scroll').forEach(function(box){
  if(box.dataset.navInstalada)return;box.dataset.navInstalada='1';box.tabIndex=0;box.setAttribute('aria-label','Tabela de avaliações; use as setas para rolar');
  var nav=document.createElement('div');nav.className='av-scroll-nav';
  [-1,1].forEach(function(dir){var b=document.createElement('button');b.type='button';b.textContent=dir<0?'← Colunas anteriores':'Próximas colunas →';b.onclick=function(){box.scrollBy({left:dir*Math.max(180,box.clientWidth*.7),behavior:'smooth'});};nav.appendChild(b);});
  box.parentNode.insertBefore(nav,box);function estado(){nav.hidden=box.scrollWidth<=box.clientWidth+1;nav.children[0].disabled=box.scrollLeft<=0;nav.children[1].disabled=box.scrollLeft+box.clientWidth>=box.scrollWidth-1;}
  box.addEventListener('scroll',estado,{passive:true});if(window.ResizeObserver){var ro=new ResizeObserver(function(){if(!box.isConnected){ro.disconnect();return;}estado();});ro.observe(box);}estado();
 });}
 var pendente=false;new MutationObserver(function(){if(pendente)return;pendente=true;(window.requestAnimationFrame||function(fn){return setTimeout(fn,16);})(function(){pendente=false;instalar();});}).observe(document.body,{childList:true,subtree:true});instalar();
})();
