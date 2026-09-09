(function(root){
  'use strict';
  function id(key){return encodeURIComponent(key);}
  function validar(x){
    var nome=String(x.nome||'').trim();if(!nome||nome.length>120)throw Error('Informe um nome de até 120 caracteres para a consulta.');
    var emails=Array.from(new Set(String(x.emails||'').split(/[,;\n]/).map(function(v){return v.trim().toLowerCase();}).filter(Boolean)));
    if(!emails.length||emails.length>20||emails.some(function(v){return !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(v)||v.length>254;}))throw Error('Informe de 1 a 20 e-mails válidos.');
    var estudos=Array.from(new Set(x.estudos||[]));if(!estudos.length||estudos.length>40)throw Error('Selecione de 1 a 40 estudos.');
    if(estudos.some(function(s){return typeof s!=='string'||s.length>300;}))throw Error('Referência de estudo inválida.');
    return {nome:nome,emails:emails,estudos:estudos,auto:x.auto===true};
  }
  var api={id:id,validar:validar};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.PortalCore=api;
})(typeof window!=='undefined'?window:null);
