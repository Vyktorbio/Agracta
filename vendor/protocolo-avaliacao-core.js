/* Regras explícitas; nunca deduz ausência a partir de uma célula vazia. */
(function(root){
'use strict';
var clone=function(x){return JSON.parse(JSON.stringify(x));};
function snapshot(p,av){
 var out={variaveis:[],tipos:{},varcfg:{}};
 (p.variaveis||[]).forEach(function(r){
  out.variaveis.push(r.nome);out.tipos[r.nome]=r.tipo;
  out.varcfg[r.nome]=clone(r.cfg||{});
  out.varcfg[r.nome].naoAvaliar=!!(r.datas&&r.datas.length&&r.datas.indexOf(av.data)<0);
 });return out;
}
function na(av,row,v){var c=(av.varcfg||{})[v]||{};return c.naoAvaliar===true||(c.naTratamentos||[]).indexOf(row.tratId)>=0;}
function temDado(av,row,v){
 function val(m){var a=m&&m[row.key]&&m[row.key][v];if((a==null||a==='')&&row.rep===1)a=m&&m[row.tratId]&&m[row.tratId][v];return a;}
 function cheio(x){return x!=null&&String(x).trim()!=='';}
 if(cheio(val(av.notas)))return true;
 var b=val(av.bruto)||{};
 if(cheio(b.n)||(b.sub||[]).some(cheio))return true;
 return Object.keys(av.avaliadores||{}).some(function(k){return cheio(val(av.avaliadores[k].notas));});
}
function preparar(st,p,ids){
 var nomes={},tids=(st.tratamentos||[]).map(function(t){return t.id;});
 if(!(p.variaveis||[]).length)throw Error('Cadastre ao menos uma variável.');
 p.variaveis.forEach(function(r){
  if(!r.nome||nomes[r.nome])throw Error('Nome de variável vazio ou repetido.');nomes[r.nome]=true;
  var c=r.cfg||{};
  if(['pct','numero','contagem','razao','escala'].indexOf(r.tipo)<0)throw Error('Tipo inválido: '+r.nome);
  if((c.naTratamentos||[]).some(function(t){return tids.indexOf(t)<0;}))throw Error('Tratamento inexistente: '+r.nome);
  if(c.calculoControle!=='nenhum'&&(!c.referencia||tids.indexOf(c.referencia)<0||(c.naTratamentos||[]).indexOf(c.referencia)>=0))throw Error('Escolha uma referência aplicável para '+r.nome+'.');
  if(r.tipo==='escala'&&(!(Number(c.escalaMax)>Number(c.escalaMin))||!c.escalaLegenda))throw Error('Informe limites e legenda da escala '+r.nome+'.');
  if(r.tipo==='escala'&&c.escalaModo==='nota'&&c.calculoControle!=='nenhum')throw Error('Escala em notas: use resumo sem eficácia percentual.');
  if((r.datas||[]).some(function(d){var dt=new Date(d+'T00:00:00Z');return !/^\d{4}-\d{2}-\d{2}$/.test(d)||!isFinite(dt)||dt.toISOString().slice(0,10)!==d;}))throw Error('Datas devem estar no formato AAAA-MM-DD.');
 });
 if(ids.some(function(id){return !(st.avaliacoes||[]).some(function(a){return a.id===id;});}))throw Error('Avaliação selecionada não existe mais. Reabra o protocolo.');
 var alteradas=[];
 (st.avaliacoes||[]).filter(function(a){return ids.indexOf(a.id)>=0;}).forEach(function(a){
  if(a.carimbo&&(a.carimbo.rubrica||a.carimbo.assinatura))throw Error('Reabra a avaliação assinada de '+a.data+' antes de mudar suas regras.');
  var s=snapshot(p,a);
  (st.tratamentos||[]).forEach(function(t){for(var rep=1;rep<=Math.max(1,st.numRepeticoes||1);rep++){
   var row={key:t.id+'R'+rep,tratId:t.id,rep:rep};
   (a.variaveis||[]).forEach(function(v){if(!temDado(a,row,v))return;
    var before=(a.varcfg||{})[v]||{},after=s.varcfg[v];
    if(!after||na(s,row,v))throw Error(a.data+' · '+row.key+' · '+v+': existe leitura. Não é possível ocultá-la como não aplicável.');
    if(((a.tipos||{})[v]||'pct')!==s.tipos[v]||['escalaModo','escalaMin','escalaMax','sub'].some(function(k){
     var defaults={escalaModo:'indice',escalaMin:0,escalaMax:4,sub:1};return (before[k]==null?defaults[k]:before[k])!==(after[k]==null?defaults[k]:after[k]);
    }))throw Error(a.data+' · '+v+': não é permitido reinterpretar leituras existentes mudando o tipo, escala ou subamostras.');
   });
  }});
  alteradas.push({av:a,esquema:s});
 });return alteradas;
}
var api={snapshot:snapshot,na:na,temDado:temDado,preparar:preparar};
if(typeof module==='object'&&module.exports)module.exports=api;root.ProtocoloAvaliacaoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
