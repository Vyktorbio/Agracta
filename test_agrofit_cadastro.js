/* O que o catálogo preenche no cadastro — e o que ele NÃO pode preencher.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Preencher campo a partir do Agrofit é útil enquanto o item na tela FOR aquele
 * produto. O risco mora no meio do caminho: a pessoa busca "Arapoty", o
 * formulário preenche, ela reescreve o nome para o código experimental do
 * patrocinador e salva. Se registro, titular e concentração fossem junto, o item
 * sairia com número de registro do MAPA de um produto que ele não é — e com cara
 * de dado oficial, que é o pior tipo de erro para uma folha de auditoria.
 *
 * A regra: o que veio do catálogo só entra se o nome ainda for o do catálogo.
 *
 * Rodar: node test_agrofit_cadastro.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var A=require('./vendor/agrofit-core.js');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei a função '+nome+' em app.js');
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var cat=A.carregar(JSON.parse(fs.readFileSync('data/agrofit.json','utf8')));
var multi=cat.produtos.filter(function(p){return p.marcas.length>2;})[0];
var escolha=A.paraItem(multi,multi.marcas[0]);

/* Campos da tela + o que itemNovo() recebeu. */
var CAMPOS={}, RECEBIDO=null;
var ctx={
  document:{ getElementById:function(id){ return (id in CAMPOS)?{value:CAMPOS[id]}:null; } },
  alert:function(m){ ctx._alerta=m; },
  confirm:function(){ return true; },
  itemPossiveisDuplicatas:function(){ return []; },
  itemNovo:function(d){ RECEBIDO=d; return {id:'it1',nome:d.nome}; },
  _itensPinta:function(){},
  _agrofitSel:null, _agrofitTermo:'', _agrofitErro:'', _itemRascunho:null, _itemAberto:null,
  String:String, Object:Object
};
vm.createContext(ctx);
vm.runInContext(pega('itemNovoSalvar'),ctx);

function salva(nome, sel){
  CAMPOS={itNome:nome, itNovoCodigo:'', itNovoTitular:'Alguém', itNovoTipo:'referencia', itNovoSituacao:'registrado'};
  ctx._agrofitSel=sel||null; RECEBIDO=null; ctx._alerta=null;
  ctx.itemNovoSalvar();
  return RECEBIDO;
}

console.log('\n--- Nome intacto: o catálogo entra inteiro ---');
var d=salva(escolha.nome, escolha);
ck(!!d,'o item foi salvo');
ck(d.registro===multi.nr,'registro do MAPA vai junto');
ck(d.formulacao===multi.formulacao,'formulação vai junto');
ck(d.concentracao===multi.ativos,'concentração/ingrediente ativo vai junto');
ck(Array.isArray(d.sinonimos)&&d.sinonimos.length===multi.marcas.length-1,'as outras marcas viram sinônimos');

console.log('\n--- Nome reescrito: o catálogo NÃO entra ---');
d=salva('XYZ-2026-01 (código do patrocinador)', escolha);
ck(!!d,'o item ainda é salvo — a pessoa pode cadastrar o que quiser');
ck(d.registro===undefined,'mas NÃO herda o número de registro do MAPA');
ck(d.concentracao===undefined,'nem a concentração');
ck(d.formulacao===undefined,'nem a formulação');
ck(d.sinonimos===undefined,'nem os sinônimos de um produto que ele não é');

console.log('\n--- Cadastro à mão, sem catálogo nenhum ---');
d=salva('Produto experimental do cliente', null);
ck(!!d && d.nome==='Produto experimental do cliente','continua funcionando como sempre funcionou');
ck(d.registro===undefined,'e não inventa registro');

console.log('\n--- Nome vazio continua sendo recusado ---');
d=salva('', escolha);
ck(d===null,'não salva item sem nome');
ck(/nome/i.test(ctx._alerta||''),'e diz por quê');

console.log('\n--- Depois de salvar, a busca não fica pendurada ---');
salva(escolha.nome, escolha);
ck(ctx._agrofitSel===null,'a escolha é limpa');
ck(ctx._agrofitTermo==='','e o termo também — o próximo item começa do zero');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
