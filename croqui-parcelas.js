/* Uma geometria para mapa, consulta e avaliação. A consulta não grava dados. */
(function(w){
'use strict';
const e=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={empty:'Pendente',partial:'Parcial',done:'Concluída',planned:'Sem avaliação'};
const colors={empty:'#ff0000',partial:'#ffff00',done:'#00ff00',planned:'#87949f'};
let current=null,dialog=null,focusBefore=null;
const dates=new WeakMap();
function study(qid,sid){return ((w.data[qid]||{}).estudos||[]).find(s=>s.id===sid);}
function allowed(){return !!w._authUser&&!document.documentElement.classList.contains('pre-auth');}
function dateText(a){
 const date=String(a.data||''),br=/^\d{4}-\d{2}-\d{2}$/.test(date)?date.slice(8)+'/'+date.slice(5,7)+'/'+date.slice(0,4):date||'Sem data';
 return [br,a.hora,a.momento?a.momento.valor+' '+a.momento.unidade:'',a.tipo].filter(Boolean).join(' · ');
}
function assessments(st){return (st.avaliacoes||[]).slice().sort((a,b)=>String(a.data||'').localeCompare(String(b.data||''))||String(a.hora||'').localeCompare(String(b.hora||'')));}
function chosen(st){
 const avs=assessments(st),id=dates.get(st),saved=avs.find(a=>a.id===id);
 if(saved)return saved;
 const today=w.todayISO(),due=avs.filter(a=>a.data&&a.data<=today);
 return due[due.length-1]||avs[0]||null;
}
function schema(st,av){return av?w.AvaliacaoCore.esquema(st,av).variaveis||[]:[];}
function notes(av){
 if(!av)return {};
 // Não inicializa avaliadores durante consulta; mantém a leitura ativa cegada.
 const who=typeof w.avQuemAtivo==='function'?w.avQuemAtivo():null;
 return av.duplaLeitura&&who?((av.avaliadores||{})[who]||{}).notas||{}:av.notas||{};
}
function value(map,row,v){
 let val=(map[row.key]||{})[v];
 if((val==null||val==='')&&row.rep===1)val=(map[row.tratId]||{})[v];
 return val==null?'':val;
}
function status(row,vars,map,hasAssessment,av,singleReader){
 if(!hasAssessment)return 'planned';
 return w.AvaliacaoCore.parcela(av||{notas:map},row,vars,singleReader).state;
}
function source(st,av,grid){
 if(grid)return grid;
 const src=w.AvaliacaoCore.esquema(st,av),who=typeof w.avQuemAtivo==='function'?w.avQuemAtivo():null;
 // Na consulta cegada só conta a leitura visível, sem revelar o progresso de B.
 if(src.duplaLeitura&&who)return {notas:notes(av)};
 return src;
}
function layout(st){
 const pos=w.croquiPos(st);
 if(!pos)return {parcelas:[],problemas:['Posicione o croqui no mapa para ver a disposição física das parcelas.']};
 // As rotinas legadas normalizam o estudo. Só uma cópia entra na consulta.
 const copy=JSON.parse(JSON.stringify(st)),g=w.croquiGrade(copy,pos);
 const rows=w._avRowsForStudy(copy,false),seen=new Set();
 g.parcelas=g.parcelas.map(p=>{
  const t=(st.tratamentos||[])[p.tratNum-1],id=p.tratId||(t&&t.id);
  const row=rows.find(r=>r.tratId===id&&r.rep===p.rep);
  if(!row||seen.has(row.key))return null;
  seen.add(row.key);return Object.assign({},p,{row,key:row.key});
 });
 if(g.parcelas.some(p=>!p)||g.parcelas.length!==rows.length){
  g.parcelas=[];g.problemas=['A ordem de campo não corresponde às parcelas cadastradas. Confira a randomização antes de usar o croqui.'];
 }
 g.pos=pos;return g;
}
function legend(counts){const plural={empty:'pendentes',partial:'parciais',done:'concluídas',planned:'sem avaliação'};return '<div class="pc-legend">'+Object.keys(counts).map(k=>'<span><i style="background:'+colors[k]+'"></i>'+counts[k]+' '+(counts[k]===1?labels[k].toLowerCase():plural[k])+'</span>').join('')+'<span><i style="background:#2263ce"></i>Selecionada</span></div>';}
function diagram(st,g,av,selected,mode,grid){
 if(!g.parcelas.length)return '<p class="pc-notice">'+e((g.problemas||[]).join(' '))+'</p>';
 const vars=grid?grid.variaveis:schema(st,av),map=grid?grid.notas:notes(av),counts={empty:0,partial:0,done:0};
 if(!av&&!grid){delete counts.empty;delete counts.partial;delete counts.done;counts.planned=0;}
 const angle=g.pos.ang||0,ca=Math.cos(angle),sa=Math.sin(angle),scale=g.livre?Math.min(30,Math.max(4,48/Math.max(1,Math.min(...g.parcelas.map(p=>Math.max(p.w,p.h)))))):Math.max(48/g.parcelas[0].w,48/g.parcelas[0].h);
 const xy=(x,y)=>[(x*ca-y*sa)*scale,-(x*sa+y*ca)*scale];
 // Grade: um retângulo. Parcela livre de plantas: um círculo por planta (CroquiCore.formaLocal).
 const forma=p=>(w.CroquiCore.formaLocal?w.CroquiCore.formaLocal(p):[[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]]]);
 const corners=g.parcelas.map(p=>forma(p).map(anel=>anel.map(v=>xy(v[0],v[1]))));
 const pts=corners.flat(2),minX=Math.min(...pts.map(p=>p[0]))-44,maxX=Math.max(...pts.map(p=>p[0]))+44,minY=Math.min(...pts.map(p=>p[1]))-44,maxY=Math.max(...pts.map(p=>p[1]))+44;
 const width=maxX-minX,height=maxY-minY;
 const point=p=>p.map(n=>Math.round(n*100)/100).join(',');
 let svg='<svg xmlns="http://www.w3.org/2000/svg" class="pc-svg" width="'+width+'" height="'+height+'" viewBox="'+[minX,minY,width,height].join(' ')+'" aria-label="Disposição física das parcelas e percurso">';
 g.parcelas.forEach((p,i)=>{
  const state=status(p.row,vars,map,!!av||!!grid,source(st,av,grid),!!grid);counts[state]=(counts[state]||0)+1;
  const name=p.row.campo||p.row.label||p.key,center=xy(p.x+p.w/2,p.y+p.h/2);
  svg+='<g role="button" tabindex="0" data-pc-'+mode+'="'+e(p.key)+'" data-order="'+p.ordem+'" data-col="'+p.col+'" data-line="'+p.lin+'" aria-pressed="'+(selected===p.key)+'" aria-label="'+e(name+' · '+p.ordem+'ª no percurso · '+labels[state])+'" class="pc-cell '+state+(selected===p.key?' selected':'')+'"><title>'+e(name+' · '+p.row.tratId+' · '+p.ordem+'ª no percurso · '+labels[state])+'</title>'+corners[i].map(anel=>'<polygon points="'+anel.map(point).join(' ')+'"/>').join('')+'<text x="'+center[0]+'" y="'+(center[1]-4)+'">'+e(name)+'</text><text class="pc-order" x="'+center[0]+'" y="'+(center[1]+12)+'">'+p.ordem+'º</text></g>';
 });
 // A mesma linha e as mesmas setas do mapa; não há reordenação por bloco.
 const path=w.CroquiCore.caminho(g);
 if(path.length>1)svg+='<polyline class="pc-path" points="'+path.map(p=>point(xy(p[0],p[1]))).join(' ')+'"/>';
 w.CroquiCore.setas(g).forEach(s=>{svg+='<polyline class="pc-arrow" points="'+s.map(p=>point(xy(p[0],p[1]))).join(' ')+'"/>';});
 const first=g.parcelas[0],start=xy(first.x,first.y);
 svg+='<circle class="pc-start" cx="'+start[0]+'" cy="'+start[1]+'" r="5"/><text class="pc-start-label" x="'+start[0]+'" y="'+(start[1]+22)+'">Início</text></svg>';
 return '<div class="pc-map-meta"><span>'+(g.livre?(g.parcelas.length+' parcelas marcadas no mapa'+(g.faltam?' · '+g.faltam+' sem lugar':'')):(g.colunas+' colunas × '+g.linhas+' linhas · '+e(g.serpentina?'Vai e volta':'Sempre no mesmo sentido')))+'</span><span title="Norte geográfico">↑ N</span></div><div class="pc-viewport" tabindex="0" aria-label="Croqui rolável">'+svg+'</div>'+legend(counts)+'<p class="pc-hint">Toque na parcela. Arraste a área ou use a rolagem para percorrer o desenho. Dimensões, vãos e orientação seguem o croqui salvo.</p>';
}
/* A FIGURA DO CROQUI PARA O RELATÓRIO. Relato de uso: "não posso baixar a
   imagem desse croqui? Era legal ter o croqui do estudo além do das quadras".
   É o mesmo desenho da tela (mesma geometria, mesmo norte), mas limpo:
   cada parcela com o código de campo e o tratamento, sem as cores de
   andamento da avaliação nem o percurso, que são instrumentos de campo.
   Leva título, norte, escala em metros e a tabela de tratamentos da
   projeção que a ficha já mostra (cegada quando o estudo é cego). O rodapé
   segue a prancha do croqui de quadras: sem nome do app nem de quem gerou. */
function figura(st,g){
 const F='Arial, sans-serif',TINTA='#15181a',GRAF='#5b6470',LINHA='#c9ced3';
 const angle=g.pos.ang||0,ca=Math.cos(angle),sa=Math.sin(angle);
 const rot=(x,y)=>[x*ca-y*sa,-(x*sa+y*ca)];
 const forma=p=>(w.CroquiCore.formaLocal?w.CroquiCore.formaLocal(p):[[[p.x,p.y],[p.x+p.w,p.y],[p.x+p.w,p.y+p.h],[p.x,p.y+p.h]]]);
 const aneis=g.parcelas.map(p=>forma(p).map(a=>a.map(v=>rot(v[0],v[1]))));
 const todos=aneis.flat(2),mx=Math.min(...todos.map(v=>v[0])),Mx=Math.max(...todos.map(v=>v[0])),my=Math.min(...todos.map(v=>v[1])),My=Math.max(...todos.map(v=>v[1]));
 const larg=Math.max(Mx-mx,0.5),alt=Math.max(My-my,0.5);
 /* Escala: cabe numa área de ~1000 x 1300 px, mas nunca menor que a da tela
    (48 px na menor parcela), senão os rótulos se atropelam. */
 const menor=Math.max(0.5,Math.min(...g.parcelas.map(p=>Math.max(p.w||0,p.h||0)||1)));
 const k=Math.max(Math.min(1000/larg,1300/alt),g.livre?Math.min(30,Math.max(4,48/menor)):48/menor);
 const M=48,TOPO=118,DW=larg*k,DH=alt*k;
 const proj=w.agConhecimento&&w.agConhecimento.projetar?w.agConhecimento.projetar(current.qid,st,w.data[current.qid]):null;
 const trats=((proj&&proj.tratamentos)||(st.tratamentos||[])).map(t=>({id:t.id,txt:[t.produto||t.nome||'',t.dose||''].filter(Boolean).join(' · ')}));
 const COLW=trats.length?300:0,W=Math.ceil(Math.max(DW+2*M+(COLW?COLW+32:0),720)),H0=Math.ceil(TOPO+DH+M+90);
 const linhaTab=22,H=Math.max(H0,TOPO+40+trats.length*linhaTab+70);
 const X=x=>M+(x-mx)*k,Y=y=>TOPO+(y-my)*k,pt=v=>X(v[0]).toFixed(1)+','+Y(v[1]).toFixed(1);
 const t=(x,y,s,o={})=>'<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" font-family="'+F+'" font-size="'+(o.t||12)+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||TINTA)+'">'+e(s)+'</text>';
 let s='<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><rect width="100%" height="100%" fill="#fff"/>';
 const hoje=(()=>{const d=w.todayISO();return d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);})();
 s+=t(M,40,'Croqui das parcelas — '+(st.codigo||st.nome||st.id),{t:22,w:700});
 s+=t(M,66,[w.quadraNome(current.qid),(st.protocolo||{}).tamanhoParcela||'',g.parcelas.length+' parcelas',(st.tratamentos||[]).length+' tratamentos'].filter(Boolean).join(' · '),{t:14,c:GRAF});
 s+='<line x1="'+M+'" y1="84" x2="'+(W-M)+'" y2="84" stroke="'+LINHA+'"/>';
 g.parcelas.forEach((p,i)=>{
  s+='<g>'+aneis[i].map(a=>'<polygon points="'+a.map(pt).join(' ')+'" fill="#f3f5f4" stroke="'+TINTA+'" stroke-width="1.2"/>').join('');
  const c=rot(p.x+p.w/2,p.y+p.h/2),cx=X(c[0]),cy=Y(c[1]);
  const nome=p.row.campo||p.row.label||p.key;
  s+='<text x="'+cx.toFixed(1)+'" y="'+(cy-2).toFixed(1)+'" font-family="'+F+'" font-size="13" font-weight="700" text-anchor="middle" fill="'+TINTA+'" stroke="#fff" stroke-width="3" paint-order="stroke">'+e(nome)+'</text>';
  if(p.row.tratId&&p.row.tratId!==nome)s+='<text x="'+cx.toFixed(1)+'" y="'+(cy+13).toFixed(1)+'" font-family="'+F+'" font-size="11" text-anchor="middle" fill="'+GRAF+'" stroke="#fff" stroke-width="3" paint-order="stroke">'+e(p.row.tratId)+'</text>';
  s+='</g>';
 });
 /* Norte (o desenho já está orientado ao norte) e escala em metros. */
 const alvo=Math.max(DW*0.3,120)/k,passos=[0.5,1,2,5,10,20,25,50,100,200,500],m=passos.filter(v=>v<=alvo).pop()||passos[0];
 const ey=TOPO+DH+34;
 /* O norte fica ao lado da escala, embaixo: em cima ele disputava lugar com a
    tabela de tratamentos. */
 const nx=M+m*k+48,ny=ey-28;
 s+='<path d="M'+nx.toFixed(1)+' '+(ny+30)+'L'+(nx+8).toFixed(1)+' '+ny+'L'+(nx+16).toFixed(1)+' '+(ny+30)+'L'+(nx+8).toFixed(1)+' '+(ny+23)+'Z" fill="'+TINTA+'"/>'+t(nx+8,ny+46,'N',{t:13,w:700,a:'middle'});
 s+='<path d="M'+M+' '+(ey-6)+'V'+ey+'H'+(M+m*k).toFixed(1)+'V'+(ey-6)+'" fill="none" stroke="'+TINTA+'" stroke-width="1.5"/>'+t(M,ey+18,'0',{t:11,c:GRAF,a:'middle'})+t(M+m*k,ey+18,String(m).replace('.',',')+' m',{t:11,c:GRAF,a:'middle'});
 if(trats.length){
  const tx=W-M-COLW;let ty=TOPO+8;
  s+=t(tx,ty,'TRATAMENTOS',{t:11,w:700,c:GRAF});ty+=22;
  trats.forEach(tr=>{s+=t(tx,ty,tr.id,{t:12,w:700})+t(tx+44,ty,tr.txt.length>40?tr.txt.slice(0,39)+'…':tr.txt,{t:12,c:TINTA});ty+=linhaTab;});
 }
 s+='<line x1="'+M+'" y1="'+(H-34)+'" x2="'+(W-M)+'" y2="'+(H-34)+'" stroke="'+LINHA+'"/>';
 s+=t(M,H-16,'Coordenadas locais em metros, orientadas ao norte geográfico · origem: croqui posicionado no mapa · extraído em '+hoje,{t:11,c:GRAF});
 return {svg:s+'</svg>',width:W,height:H};
}
function rowList(st,g){
 if(g.parcelas.length)return '';
 return '<div class="pc-list">'+w._avRowsForStudy(JSON.parse(JSON.stringify(st)),false).map(r=>'<button type="button" data-pc-pick="'+e(r.key)+'">'+e(r.campo||r.label)+'</button>').join('')+'</div>';
}
function rowFor(st,key){return w._avRowsForStudy(JSON.parse(JSON.stringify(st)),false).find(r=>r.key===key);}
function detail(st){
 const row=rowFor(st,current.key);if(!row)return '<p class="pc-notice">Selecione uma parcela para consultar avaliações e fotos.</p>';
 const av=chosen(st),vars=schema(st,av),map=notes(av),s=status(row,vars,map,!!av,source(st,av));
 const projected=w.agConhecimento&&w.agConhecimento.projetar(current.qid,st,w.data[current.qid]);
 const t=projected&&projected.tratamentos.find(t=>t.id===row.tratId);
 let h='<h3 id="pc-detail-title">Parcela '+e(row.campo||row.label)+'</h3><p>'+e(row.tratId)+' · repetição '+e(row.repLabel||row.rep)+(t?'<br>'+e(t.produto)+(t.dose?' · '+e(t.dose):''):'')+'</p><p class="pc-state '+s+'">'+labels[s]+'</p>';
 if(av){
  h+='<dl class="pc-values">'+vars.map(v=>'<div><dt>'+e(v)+'</dt><dd>'+e(String(value(map,row,v)).trim()===''?'—':value(map,row,v))+'</dd></div>').join('')+'</dl>';
  if(!vars.length)h+='<p class="pc-hint">Esta avaliação ainda não tem variáveis definidas.</p>';
  if(av.duplaLeitura)h+='<p class="pc-hint">'+e(w.avQuemAtivo()?'Leitura do avaliador '+w.avQuemAtivo():'Leitura consolidada')+'</p>';
 }
 h+='<div class="pc-actions">';
 if(!w.estudoFinalizado(st))h+='<button type="button" data-pc-action="evaluate">'+(av?(av.carimbo&&av.carimbo.rubrica?'Consultar avaliação assinada':'Lançar valores e foto nesta parcela'):'Nova avaliação nesta parcela')+'</button>';
 else h+='<p class="pc-hint">Estudo finalizado · avaliações somente para consulta.</p>';
 h+='<button type="button" data-pc-action="photos">Fotos desta parcela</button></div><p class="pc-hint">As fotos ficam neste aparelho e nesta conta.</p><details class="pc-history" open><summary>Histórico de avaliações da parcela</summary>';
 h+=assessments(st).slice().reverse().map(a=>{
  const vs=schema(st,a),m=notes(a),state=status(row,vs,m,true,source(st,a));
  return '<article><button type="button" data-pc-assessment="'+e(a.id)+'">'+e(dateText(a))+'</button><span>'+labels[state]+(a.carimbo&&a.carimbo.rubrica?' · Assinada':'')+'</span><p>'+vs.map(v=>e(v)+': '+e(String(value(m,row,v)).trim()===''?'—':value(m,row,v))).join(' · ')+'</p></article>';
 }).join('')||'<p>Nenhuma avaliação cadastrada.</p>';
 return h+'</details>';
}
function render(){
 if(!current||!dialog||!dialog.open)return;
 const st=study(current.qid,current.sid);if(!st||!allowed()){close();return;}
 const old=dialog.querySelector('.pc-viewport'),scroll=old?{top:old.scrollTop,left:old.scrollLeft}:null;
 const g=layout(st),av=chosen(st);
 dialog.innerHTML='<header class="pc-head"><div><p>CROQUI DAS PARCELAS</p><h2>'+e(st.codigo||st.nome||st.id)+'</h2><span>'+e(w.quadraNome(current.qid))+' · '+e((st.protocolo||{}).tamanhoParcela||'Dimensões não informadas')+'</span></div><button type="button" data-pc-action="close" aria-label="Fechar croqui">×</button></header><div class="pc-toolbar"><label>Avaliação<select id="pc-assessment">'+(av?assessments(st).map(a=>'<option value="'+e(a.id)+'"'+(a.id===av.id?' selected':'')+'>'+e(dateText(a))+'</option>').join(''):'<option value="">Nenhuma avaliação cadastrada</option>')+'</select></label><button type="button" data-pc-action="fit">'+(current.fit?'Ampliar croqui':'Enquadrar tudo')+'</button>'+(!w.estudoFinalizado(st)?'<button type="button" data-pc-action="position">'+(g.pos?'Ajustar posição':'Posicionar no mapa')+'</button>':'')+(g.parcelas.length?'<button type="button" data-pc-action="png">Baixar PNG</button><button type="button" data-pc-action="svg">Baixar SVG</button>':'')+'</div><div class="pc-body"><section class="pc-drawing">'+diagram(st,g,av,current.key,'pick')+rowList(st,g)+(g.parcelas.length&&(g.problemas||[]).length?'<p class="pc-notice">'+e(g.problemas.join(' '))+'</p>':'')+'</section><aside class="pc-detail" aria-labelledby="pc-detail-title">'+detail(st)+'</aside></div>';
 const next=dialog.querySelector('.pc-viewport');if(next)next.classList.toggle('pc-fit',!!current.fit);if(scroll&&next){next.scrollTop=scroll.top;next.scrollLeft=scroll.left;}
}
function close(){if(dialog&&dialog.open)dialog.close();}
function locate(){
 const el=dialog&&Array.from(dialog.querySelectorAll('[data-pc-pick]')).find(el=>el.dataset.pcPick===current.key);
 if(el){el.scrollIntoView({block:'nearest',inline:'nearest'});el.focus({preventScroll:true});}
 if(current.key&&w.matchMedia&&w.matchMedia('(max-width:700px)').matches){const detail=dialog.querySelector('.pc-detail');if(detail)detail.scrollIntoView({block:'start'});}
}
function open(qid,sid,key){
 if(!allowed())return;
 const st=study(qid,sid);if(!st)return;
 current={qid,sid,key:key||null,fit:true};focusBefore=document.activeElement;
 if(!dialog){
  dialog=document.createElement('dialog');dialog.id='parcelasCampoDialog';dialog.className='pc-dialog';document.body.appendChild(dialog);
  dialog.addEventListener('close',()=>{if(focusBefore&&focusBefore.isConnected)focusBefore.focus();});
  dialog.addEventListener('click',ev=>{
   const pick=ev.target.closest('[data-pc-pick]');
   if(pick){current.key=pick.dataset.pcPick;render();locate();return;}
   const a=ev.target.closest('[data-pc-assessment]');
   if(a){const s=study(current.qid,current.sid);dates.set(s,a.dataset.pcAssessment);render();refreshMap();return;}
   const b=ev.target.closest('[data-pc-action]');if(!b)return;
   const s=study(current.qid,current.sid);if(!s||!allowed()){close();return;}
   const action=b.dataset.pcAction;
   if(action==='close'){close();return;}
   if(action==='fit'){current.fit=!current.fit;render();const vp=dialog.querySelector('.pc-viewport');if(vp){vp.scrollTop=0;vp.scrollLeft=0;}if(!current.fit)locate();return;}
   if(action==='position'){if(w.estudoFinalizado(s))return;close();w.posicionarCroquiDoEstudo(current.qid,current.sid);return;}
   if(action==='png'||action==='svg'){
    const g=layout(s);if(!g.parcelas.length)return;
    if(!w.AgractaFiguras||!w.AgractaFiguras.exportar){alert('O módulo de imagens não carregou. Reabra o Agracta e tente novamente.');return;}
    b.disabled=true;
    w.AgractaFiguras.exportar(figura(s,g),'Croqui-'+(s.codigo||s.nome||s.id),action)
     .catch(err=>alert(err&&err.message||'Não foi possível gerar a imagem.')).finally(()=>{b.disabled=false;});
    return;
   }
   const row=rowFor(s,current.key);if(!row)return;
   const av=chosen(s);
   if(action==='photos'){
    const projected=w.agConhecimento.projetar(current.qid,s,w.data[current.qid]);
    w.abrirGaleriaFotos(projected,{treatment:row.tratId,rep:row.rep,assessment:av&&av.id,date:av&&av.data,plot:row.campo||row.key,filter:true});
   }
   if(action==='evaluate'){
    if(w.estudoFinalizado(s))return;
    const {qid,sid}=current;close();w.openStudyDetail(qid,sid);
    w.openStudyEditAvaliacao(av?av.id:'__new__');w.avCroquiSelect(row.key);
   }
  });
  dialog.addEventListener('change',ev=>{if(ev.target.id==='pc-assessment'){dates.set(study(current.qid,current.sid),ev.target.value);render();refreshMap();}});
  dialog.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[data-pc-pick]')){ev.preventDefault();ev.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
 }
 if(!dialog.open)dialog.showModal();render();
 if(current.key)locate();else{const vp=dialog.querySelector('.pc-viewport');if(vp&&!current.fit)vp.scrollTop=vp.scrollHeight;dialog.querySelector('[data-pc-action="close"]').focus();}
}
function refreshMap(){if(typeof w.renderCroquis==='function')w.renderCroquis();}
function mapStyle(st,p){
 const av=chosen(st);if(!av)return null;
 const t=(st.tratamentos||[])[p.tratNum-1],row={tratId:p.tratId||(t&&t.id),rep:p.rep};row.key=w._avRowKey(row.tratId,row.rep);
 const state=status(row,schema(st,av),notes(av),true,source(st,av));
 return {color:colors[state],fillColor:colors[state],fillOpacity:.14,weight:1.5};
}
function evaluation(st,rows,vars){
 if(!w.croquiPos(st))return null;
 const g=layout(st);if(!g.parcelas.length)return null;
 let h='<div class="av-croqui pc-evaluation"><div class="av-croqui-head"><span class="av-croqui-title">Croqui de parcelas · disposição no campo</span><button type="button" class="av-croqui-toggle" onclick="toggleAvCroqui()">'+(w._avCroquiOpen?'Ocultar':'Mostrar')+'</button></div>';
 if(w._avCroquiOpen)h+=diagram(st,g,null,w._avCroquiKey,'eval',w._avGrid);
 return h+'</div>';
}
/* Captura: o croqui da avaliação mora no #eePnl, que para a propagação do clique. */
document.addEventListener('click',ev=>{const el=ev.target.closest&&ev.target.closest('[data-pc-eval]');if(el)w.avCroquiSelect(el.dataset.pcEval);},true);
document.addEventListener('keydown',ev=>{if((ev.key==='Enter'||ev.key===' ')&&ev.target.matches('[data-pc-eval]')){ev.preventDefault();w.avCroquiSelect(ev.target.dataset.pcEval);}});
// Fecha imediatamente quando a porta de acesso esconde o aplicativo.
new MutationObserver(()=>{if(!allowed())close();}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
w.AgractaParcelas={open,close,layout,status,notes,schema,mapStyle,evaluation,figura,refresh(){render();refreshMap();}};
})(window);
