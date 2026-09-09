/* Importação explícita de propriedades licenciadas. Nenhum dado PPDB embarcado. */
(function(root){
  'use strict';
  function txt(x){return typeof x==='string'?x.trim():'';}
  function validar(j,itemId){
    if(!j||j.schema!==1||j.itemId!==itemId)throw Error('O arquivo precisa declarar schema 1 e o ID exato do item selecionado.');
    if(!txt(j.fonte)||!txt(j.licenca)||!/^\d{4}-\d{2}-\d{2}$/.test(txt(j.consultadoEm)))throw Error('Informe fonte, licença/autorização e data da consulta.');
    var url;try{url=new URL(j.url);}catch(e){throw Error('Informe a URL da fonte.');}
    if(url.protocol!=='https:'||url.username||url.password)throw Error('A fonte deve usar HTTPS, sem credenciais.');
    if(!Array.isArray(j.propriedades)||!j.propriedades.length||j.propriedades.length>100)throw Error('Informe entre 1 e 100 propriedades.');
    var seen=new Set(),ps=j.propriedades.map(function(p){
      if(!p||!txt(p.nome)||!txt(p.unidade)||!txt(p.condicoes)||!txt(p.referencia))throw Error('Cada propriedade precisa de nome, unidade, condições e referência.');
      if(typeof p.valor!=='number'||!Number.isFinite(p.valor))throw Error('O valor de cada propriedade deve ser um número finito.');
      var key=[p.nome,p.unidade,p.condicoes].join('|');if(seen.has(key))throw Error('Há propriedades duplicadas nas mesmas condições.');seen.add(key);
      return {nome:p.nome.trim().slice(0,200),valor:p.valor,unidade:p.unidade.trim().slice(0,100),condicoes:p.condicoes.trim().slice(0,500),referencia:p.referencia.trim().slice(0,1000)};
    });
    return {schema:1,itemId:itemId,fonte:j.fonte.trim().slice(0,200),licenca:j.licenca.trim().slice(0,1000),url:url.href,consultadoEm:j.consultadoEm,propriedades:ps};
  }
  var api={validar:validar};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.FontesCore=api;
})(typeof window!=='undefined'?window:null);
