/* Exporta as figuras já projetadas/cegadas da página, sem reler dados brutos.
   SVG próprio (sem captura da tela): inclui a área inteira que rola no celular,
   legendas e notas. Não depende de fontes, imagens ou serviços externos. */
(function(w){
'use strict';
var NS='http://www.w3.org/2000/svg';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function text(el){return el?el.textContent.trim():'';}
function montar(card,meta){
 var original=card.querySelector('svg'), ranking=card.querySelector('.ep-ranking');
 if(!original&&!ranking)throw Error('Esta figura ainda não tem resultados para exportar.');
 var vb=original?original.getAttribute('viewBox').trim().split(/[ ,]+/).map(Number):null;
 var width=Math.max(1000,vb?vb[2]+64:1000),y=36,parts=[];
 var measure=document.createElement('canvas').getContext('2d');
 if(!measure)throw Error('Não foi possível preparar a figura neste navegador.');
 function line(t,x,yy,size,bold,fill){return '<text x="'+x+'" y="'+yy+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="'+(bold?'700':'400')+'" fill="'+(fill||'#1e293b')+'">'+esc(t)+'</text>';}
 function paragraph(t,size,bold,x,max){
  if(!t)return;
  x=x==null?32:x;max=max||width-x-32;measure.font=(bold?'bold ':'')+size+'px Arial';
  var current='';
  function flush(){parts.push(line(current,x,y,size,bold));y+=size*1.45;current='';}
  String(t).split(/\s+/).forEach(function(word){
   if(current&&measure.measureText(current+' '+word).width>max)flush();
   /* Um código de produto pode ser uma palavra longa: também precisa caber. */
   Array.from(word).forEach(function(char){
    if(measure.measureText(current+char).width>max)flush();
    current+=char;
   });
   current+=' ';
  });
  if(current.trim())flush();
 }
 paragraph(meta.estudo,17,true);
 paragraph(text(card.querySelector('h4')),26,true);
 paragraph(text(card.querySelector('.ep-caption'))||meta.periodo,17,false);
 y+=12;
 if(original){
  var svg=original.cloneNode(true);
  svg.setAttribute('xmlns',NS);svg.setAttribute('x',32);svg.setAttribute('y',y);
  svg.setAttribute('width',width-64);svg.setAttribute('height',vb[3]*(width-64)/vb[2]);
  svg.querySelectorAll('text').forEach(function(el){el.setAttribute('fill','#1e293b');el.setAttribute('font-family','Arial, sans-serif');el.setAttribute('font-size','14');});
  svg.querySelectorAll('.ep-grid').forEach(function(el){el.setAttribute('stroke','#d6dce5');el.setAttribute('stroke-dasharray','4 5');});
  svg.querySelectorAll('.ep-baseline').forEach(function(el){el.setAttribute('stroke','#64748b');});
  svg.querySelectorAll('circle').forEach(function(el){el.setAttribute('stroke','#ffffff');});
  svg.querySelectorAll('[tabindex]').forEach(function(el){el.removeAttribute('tabindex');});
  parts.push(new XMLSerializer().serializeToString(svg));
  y+=Number(svg.getAttribute('height'))+24;
  card.querySelectorAll('.ep-legend>span').forEach(function(item){
   var swatch=item.querySelector('i'),fill=swatch?w.getComputedStyle(swatch).backgroundColor:'#64748b';
   parts.push('<rect x="32" y="'+(y-13)+'" width="14" height="14" rx="3" fill="'+esc(fill)+'"/>');
   paragraph(text(item),17,false,58);y+=4;
  });
 }else{
  ranking.querySelectorAll('li').forEach(function(item){
   paragraph(text(item.querySelector('.ep-rank'))+' · '+text(item.querySelector('b')),21,true);
   paragraph(text(item.querySelector('strong')),20,true);
   var bar=item.querySelector('.ep-track span');
   var pct=bar?parseFloat(bar.style.width):0;
   parts.push('<rect x="32" y="'+y+'" width="'+(width-64)+'" height="12" rx="6" fill="#edf0f5"/>');
   parts.push('<rect x="32" y="'+y+'" width="'+((width-64)*Math.max(0,Math.min(100,pct||0))/100)+'" height="12" rx="6" fill="'+esc(bar?w.getComputedStyle(bar).backgroundColor:'#4169e1')+'"/>');
   y+=38;paragraph(text(item.querySelector('small')),17,false);y+=25;
  });
 }
 y+=12;
 card.querySelectorAll('figcaption,.con-note').forEach(function(el){paragraph(text(el),16,false);y+=8;});
 if(!card.querySelector('figcaption,.con-note'))paragraph('Figura descritiva. Os pontos mostram os valores individuais ou as médias disponíveis, sem teste de médias. Ausências não são representadas como zero.',16,false);
 if(meta.faixas&&!/subamostras/.test(card.textContent))paragraph('Uma faixa por tratamento. n indica os trechos avaliados (subamostras), não repetições independentes. DP, quando mostrado, descreve a variação entre os trechos.',16,false);
 if(meta.referencia)paragraph('Testemunha selecionada para esta figura: '+meta.referencia+'.',16,false);
 y=Math.ceil(y+24);
 return {width:width,height:y,svg:'<svg xmlns="'+NS+'" width="'+width+'" height="'+y+'" viewBox="0 0 '+width+' '+y+'"><rect width="100%" height="100%" fill="#ffffff"/>'+parts.join('')+'</svg>'};
}
function salvar(blob,nome){
 if(!blob)throw Error('O navegador não conseguiu gerar a imagem. Tente baixar em SVG.');
 var url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=nome;document.body.appendChild(a);a.click();a.remove();
 /* Downloads no celular precisam manter o endereço vivo após o clique. */
 w.setTimeout(function(){URL.revokeObjectURL(url);},60000);
}
async function baixar(card,meta,formato){
 var fig=montar(card,meta),nome=('Agracta-'+meta.estudo+'-'+meta.variavel+'-'+meta.tipo+(meta.avaliacao?'-'+meta.avaliacao:''))
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'_').slice(0,180);
 var blob=new Blob([fig.svg],{type:'image/svg+xml;charset=utf-8'});
 if(formato==='svg'){salvar(blob,nome+'.svg');return;}
 await new Promise(function(resolve,reject){
  var url=URL.createObjectURL(blob),img=new Image();
  img.onload=function(){
   URL.revokeObjectURL(url);
   try{
    var canvas=document.createElement('canvas');
    /* Até 2x, com limite de memória para aparelhos móveis. Nunca recorta. */
    var scale=Math.min(2,8192/fig.width,8192/fig.height,Math.sqrt(16000000/(fig.width*fig.height)));
    canvas.width=Math.ceil(fig.width*scale);canvas.height=Math.ceil(fig.height*scale);
    var ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas indisponível. Tente baixar em SVG.');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    canvas.toBlob(function(png){try{salvar(png,nome+'.png');resolve();}catch(err){reject(err);}},'image/png');
   }catch(err){reject(err);}
  };
  img.onerror=function(){URL.revokeObjectURL(url);reject(Error('Não foi possível gerar o PNG. Tente baixar em SVG.'));};
  img.src=url;
 });
}
w.AgractaFiguras={montar:montar,baixar:baixar};
})(window);
