/* O que o cadastro grava é o que a tela mostra — e o que diverge, pergunta.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O risco original continua o mesmo: a pessoa busca "Arapoty", o formulário
 * preenche, ela reescreve o nome para o código do patrocinador e salva. Se o
 * número de registro do MAPA fosse junto, o item sairia com registro de um
 * produto que ele não é — com cara de dado oficial, que é o pior tipo de erro,
 * porque ninguém revisa o que parece certo.
 *
 * A DEFESA MUDOU DE FORMA NA v191, e a mudança é uma correção.
 *
 * Antes, os valores do catálogo viviam num estado invisível (`_agrofitSel`) e
 * eram descartados em silêncio quando o nome mudava — só que os CAMPOS na tela
 * continuavam cheios. Ver "registro 26824" preenchido e ele sumir ao salvar é
 * uma mentira de outro tipo.
 *
 * Agora o catálogo preenche os campos à vista, o que se salva é o que se vê, e
 * quando o nome deixa de ser o do catálogo mas o registro dele continua lá, o
 * app PERGUNTA em vez de decidir sozinho — nos dois sentidos.
 *
 * Rodar: node test_agrofit_cadastro.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var A=require('./vendor/agrofit-core.js');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei '+n);
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var cat=A.carregar(JSON.parse(fs.readFileSync('data/agrofit.json','utf8')));
var multi=cat.produtos.filter(function(p){ return p.marcas.length>2; })[0];
var escolha=A.paraItem(multi, multi.marcas[0]);

var CAMPOS={}, RECEBIDO=null, PERGUNTOU=null, RESPOSTA=true;
var ctx={
  document:{ getElementById:function(id){ return (id in CAMPOS)?{value:CAMPOS[id]}:null; } },
  alert:function(m){ ctx._alerta=m; },
  confirm:function(m){ PERGUNTOU=m; return RESPOSTA; },
  itemPossiveisDuplicatas:function(){ return []; },
  itemNovo:function(d){ RECEBIDO=d; return {id:'it1',nome:d.nome}; },
  _itensPinta:function(){}, _agrofitSel:null, _agrofitTermo:'', _agrofitErro:'',
  _itemRascunho:null, _itemAberto:null, String:String, Object:Object
};
vm.createContext(ctx);
vm.runInContext(pega('itemNovoSalvar'),ctx);

/* A tela DEPOIS de escolher no Agrofit: os campos ficam preenchidos à vista. */
function telaComCatalogo(nome){
  CAMPOS={itNome:nome, itNovoCodigo:'', itNovoTitular:escolha.titular,
          itNovoAtivos:escolha.concentracao, itNovoForm:escolha.formulacao,
          itNovoRegistro:escolha.registro, itNovoTipo:'referencia', itNovoSituacao:'registrado'};
}
function salva(){ RECEBIDO=null; PERGUNTOU=null; ctx._alerta=null; ctx.itemNovoSalvar(); return RECEBIDO; }

console.log('\n--- Nome intacto: grava o que está na tela ---');
telaComCatalogo(escolha.nome); ctx._agrofitSel=escolha;
var d=salva();
ck(!!d,'o item foi salvo');
ck(d.registro===multi.nr,'registro do MAPA');
ck(d.concentracao===multi.ativos,'concentração');
ck(d.formulacao===multi.formulacao,'formulação');
ck(Array.isArray(d.sinonimos)&&d.sinonimos.length===multi.marcas.length-1,'e os sinônimos do registro');
ck(PERGUNTOU===null,'sem pergunta nenhuma — nada divergia');

console.log('\n--- Nome reescrito: o app PERGUNTA em vez de decidir ---');
telaComCatalogo('XYZ-2026-01 (código do patrocinador)'); ctx._agrofitSel=escolha;
RESPOSTA=false;
d=salva();
ck(!!PERGUNTOU,'perguntou antes de gravar');
ck(/XYZ-2026-01/.test(PERGUNTOU),'nomeando o item novo');
ck(new RegExp(multi.nr).test(PERGUNTOU),'e o registro em questão');
ck(d.registro==='','respondendo "não", o registro é apagado');
ck((d.sinonimos||[]).length===0,'e os sinônimos também');
ck(d.concentracao===multi.ativos,'mas a concentração digitada FICA — ela descreve o produto, não a identidade dele');

console.log('\n--- Respondendo que sim, o registro é mantido ---');
telaComCatalogo('Mesmo produto, outro apelido'); ctx._agrofitSel=escolha;
RESPOSTA=true;
d=salva();
ck(!!PERGUNTOU,'perguntou de novo');
ck(d.registro===multi.nr,'e o registro foi mantido, porque a pessoa disse que sim');

console.log('\n--- Cadastro à mão, sem catálogo nenhum ---');
CAMPOS={itNome:'PTA0038-1971.24', itNovoCodigo:'', itNovoTitular:'Labin',
        itNovoAtivos:'Bifenthrin 50 g/L + Acido Nonanoico 400 g/L', itNovoForm:'EC',
        itNovoRegistro:'', itNovoTipo:'teste', itNovoSituacao:'experimental'};
ctx._agrofitSel=null;
d=salva();
ck(!!d && d.nome==='PTA0038-1971.24','o produto experimental é salvo');
ck(d.registro==='','sem registro, que é o normal para PTA');
ck(/Bifenthrin/.test(d.ativos),'com o ingrediente ativo digitado');
ck(d.formulacao==='EC','e a formulação');
ck(PERGUNTOU===null,'sem pergunta — não havia catálogo envolvido');

console.log('\n--- Nome vazio continua sendo recusado ---');
CAMPOS={itNome:'', itNovoAtivos:'', itNovoForm:'', itNovoRegistro:''};
d=salva();
ck(d===null,'não salva item sem nome');
ck(/nome/i.test(ctx._alerta||''),'e diz por quê');

console.log('\n--- Depois de salvar, a busca não fica pendurada ---');
telaComCatalogo(escolha.nome); ctx._agrofitSel=escolha; salva();
ck(ctx._agrofitSel===null,'a escolha é limpa');
ck(ctx._agrofitTermo==='','e o termo também');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
