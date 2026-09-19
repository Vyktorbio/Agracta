/* Progresso operacional: consulta pura, sem criar notas, datas ou randomização. */
(function(root){
'use strict';
function lista(a){return Array.isArray(a)?a:[];}
function numero(v){
  if(v==null||typeof v==='boolean'||typeof v==='object'||String(v).trim()==='')return null;
  var n=Number(String(v).trim().replace(',','.'));return isFinite(n)?n:null;
}
function valor(m,row,v){
  m=m||{};var x=(m[row.key]||{})[v];
  if((x==null||x==='')&&row.rep===1)x=(m[row.tratId]||{})[v];
  return x;
}
function linhas(st){
  var out=[],reps=Math.max(1,parseInt(st.numRepeticoes,10)||1);
  lista(st.tratamentos).forEach(function(t){if(t)for(var r=1;r<=reps;r++)out.push({key:String(t.id)+'R'+r,tratId:t.id,rep:r});});
  return out;
}
/* A mesma herança da grade, sem escrever campos na avaliação consultada. */
function esquema(st,av){
  av=av||{};if(lista(av.variaveis).length)return av;
  var avs=lista(st.avaliacoes),idx=avs.indexOf(av);
  var prev=avs.map(function(a,i){return {a:a,i:i};}).filter(function(x){
    return x.a&&x.a!==av&&lista(x.a.variaveis).length&&(x.i<idx||String(x.a.data||'')<=String(av.data||''));
  }).sort(function(x,y){return String(x.a.data||'').localeCompare(String(y.a.data||''))||x.i-y.i;});
  if(!prev.length)return av;
  var fonte=prev[prev.length-1].a;
  return Object.assign({},av,{variaveis:fonte.variaveis,tipos:fonte.tipos,varcfg:fonte.varcfg});
}
function celula(av,row,v,somenteLeitor){
  if(av.duplaLeitura&&!somenteLeitor){
    var leitores=av.avaliadores||{},n=0;
    ['A','B'].forEach(function(k){if(numero(valor((leitores[k]||{}).notas,row,v))!==null)n++;});
    return {iniciada:n>0,completa:n===2};
  }
  var nota=numero(valor(av.notas,row,v)),cfg=(av.varcfg||{})[v]||{},tipo=(av.tipos||{})[v];
  var bruto=valor(av.bruto,row,v),sub=Math.max(1,Math.round(numero(cfg.sub)||1));
  // Registros antigos só têm a nota derivada: continuam legíveis e contáveis.
  if(!bruto||typeof bruto!=='object')return {iniciada:nota!==null,completa:nota!==null};
  if(tipo==='razao'){
    var n=numero(bruto.n),N=numero(bruto.N);
    // N pode vir pré-preenchido: sozinho não representa uma leitura feita.
    return {iniciada:n!==null,completa:n!==null&&N!==null&&n>=0&&N>0&&n<=N};
  }
  if(tipo==='escala'||sub>1){
    var xs=lista(bruto.sub).slice(0,sub),cheias=xs.filter(function(x){return numero(x)!==null;}).length;
    return {iniciada:cheias>0,completa:cheias===sub};
  }
  return {iniciada:nota!==null,completa:nota!==null};
}
function parcela(av,row,vars,somenteLeitor){
  var total=lista(vars).length,filled=0,started=0;
  lista(vars).forEach(function(v){var c=celula(av||{},row,v,somenteLeitor);if(c.completa)filled++;if(c.iniciada)started++;});
  return {total:total,filled:filled,started:started,pending:total-filled,
    state:total&&filled===total?'done':started?'partial':'empty'};
}
function avaliacao(st,av){
  var src=esquema(st,av),total=0,filled=0,started=0,counts={done:0,partial:0,empty:0};
  linhas(st).forEach(function(r){var p=parcela(src,r,src.variaveis);total+=p.total;filled+=p.filled;started+=p.started;counts[p.state]++;});
  var complete=total>0&&filled===total;
  return {total:total,filled:filled,started:started,pending:total-filled,complete:complete,
    pct:total?Math.floor(filled/total*100):0,state:complete?'done':started?'partial':'empty',parcelas:counts};
}
function estudo(st){
  var out={total:0,filled:0,started:0,pending:0,concluidas:0,parciais:0,vazias:0,avaliacoes:0,semGrade:0};
  lista(st.avaliacoes).forEach(function(av){if(!av)return;var p=avaliacao(st,av);out.avaliacoes++;
    out.total+=p.total;out.filled+=p.filled;out.started+=p.started;out.pending+=p.pending;
    if(!p.total)out.semGrade++;if(p.complete)out.concluidas++;else if(p.started)out.parciais++;else out.vazias++;
  });
  out.complete=out.avaliacoes>0&&out.concluidas===out.avaliacoes;
  out.pct=out.total?Math.floor(out.filled/out.total*100):0;
  if(!out.complete&&out.pct===100)out.pct=99;
  return out;
}
var api={numero:numero,valor:valor,linhas:linhas,esquema:esquema,parcela:parcela,avaliacao:avaliacao,estudo:estudo};
if(typeof module==='object'&&module.exports)module.exports=api;
root.AvaliacaoCore=api;
})(typeof self!=='undefined'?self:this);
