/* Ligar um item JÁ CADASTRADO ao Agrofit, sem gravar por cima.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A busca do catálogo existia só no formulário de item NOVO. Quem já tinha base
 * — todo mundo anterior à v185, e quem digita à mão — nunca podia ligar um item
 * a um registro depois. E como o achado de "produto sem registro para esta
 * cultura" só dispara em item COM registro, ele não rodava em base real nenhuma:
 * a verificação existia e não alcançava ninguém.
 *
 * Aqui a regra é o oposto da tela de item novo. Lá o formulário estava em branco
 * e preencher era ganho puro. Aqui já existe o que a pessoa digitou e conferiu:
 *
 *  1. CAMPO VAZIO pode ser preenchido em lote.
 *  2. CAMPO QUE DIVERGE nunca é sobrescrito — fica visível, com botão próprio.
 *     Divergência é informação: pode ser erro antigo de digitação, pode ser que
 *     o catálogo não descreva aquele item. Quem decide é quem conhece o produto.
 *  3. SINÔNIMOS só entram se não houver nenhum — apelidos que a equipe usa não
 *     podem ser trocados pelas marcas do registro.
 *
 * E o catálogo passa a declarar a própria idade: um retrato que envelhece calado
 * acaba mentindo, porque produto cancelado pelo MAPA continua parecendo
 * registrado.
 *
 * Rodar: node test_agrofit_ligar.js
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
var mapa=A.paraItem(multi, multi.marcas[0]);

var ITENS={}, patches=[];
var ctx={
  AgrofitCore:A, _agrofitCat:cat, _agLigSel:mapa, _agLigItem:null,
  _agrofitCarregando:false, _agrofitErro:'', _agLigTermo:'',
  itemPorId:function(id){ return ITENS[id]||null; },
  itemAtualizar:function(id,p){ patches.push([id,p]); Object.assign(ITENS[id],p); return ITENS[id]; },
  _itensPinta:function(){}, alert:function(m){ ctx._alerta=m; },
  esc:function(s){ return String(s==null?'':s); },
  isoToBR:function(s){ var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||''); return m?(m[3]+'/'+m[2]+'/'+m[1]):''; },
  Date:Date, Math:Math, String:String, Object:Object, JSON:JSON, Array:Array
};
vm.createContext(ctx);
vm.runInContext([pega('_agLigCampos'), pega('agrofitLigarAplicar'),
                 pega('agrofitLigarPreencherVazios'), pega('agrofitIdadeHtml')].join('\n'),ctx);

function item(extra){
  ITENS.i1=Object.assign({id:'i1', nome:'Meu produto', codigo:'', titular:'', registro:'',
                          formulacao:'', concentracao:'', ativos:'', sinonimos:[]}, extra||{});
  patches=[]; return ITENS.i1;
}

console.log('\n--- Item em branco: tudo é campo vazio ---');
var it=item();
var campos=ctx._agLigCampos(it, mapa);
ck(campos.length>=4,'o catálogo tem '+campos.length+' campos a oferecer');
ck(campos.every(function(c){ return c.vazio && !c.diverge; }),'todos marcados como vazios, nenhum divergente');

console.log('\n--- Preencher vazios grava tudo de uma vez ---');
ctx.agrofitLigarPreencherVazios('i1');
ck(patches.length===1,'uma gravação só');
ck(ITENS.i1.registro===multi.nr,'o registro entrou');
ck(ITENS.i1.titular===multi.titular,'o titular entrou');
ck(ITENS.i1.concentracao===multi.ativos,'a concentração entrou');
ck((ITENS.i1.sinonimos||[]).length===multi.marcas.length-1,'e os sinônimos, porque não havia nenhum');

console.log('\n--- REGRA 2: o que diverge NÃO é sobrescrito ---');
it=item({titular:'Nome que eu conferi à mão', concentracao:'', registro:''});
campos=ctx._agLigCampos(it, mapa);
var tit=campos.filter(function(c){ return c.campo==='titular'; })[0];
ck(tit.diverge===true,'o titular é marcado como divergente');
ck(tit.vazio===false,'e NÃO como vazio');
ctx.agrofitLigarPreencherVazios('i1');
ck(ITENS.i1.titular==='Nome que eu conferi à mão','preencher vazios não tocou no titular divergente');
ck(ITENS.i1.registro===multi.nr,'mas preencheu o registro, que estava vazio');

console.log('\n--- O divergente só muda por ação explícita ---');
ctx.agrofitLigarAplicar('i1','titular');
ck(ITENS.i1.titular===multi.titular,'aplicado um a um, aí sim substitui');

console.log('\n--- REGRA 3: sinônimos existentes não são trocados ---');
it=item({sinonimos:['apelido da equipe']});
ctx.agrofitLigarPreencherVazios('i1');
ck(ITENS.i1.sinonimos.length===1 && ITENS.i1.sinonimos[0]==='apelido da equipe',
   'o apelido que a equipe usa continua lá');

console.log('\n--- Nada a preencher avisa em vez de gravar vazio ---');
it=item({registro:multi.nr, titular:multi.titular, formulacao:multi.formulacao,
         concentracao:multi.ativos, ativos:multi.ativos, sinonimos:['x']});
ctx._alerta=null;
ctx.agrofitLigarPreencherVazios('i1');
ck(patches.length===0,'não grava nada');
ck(/vazio/i.test(ctx._alerta||''),'e diz que não havia campo vazio');

console.log('\n--- A idade do catálogo aparece ---');
var h=ctx.agrofitIdadeHtml();
ck(h.indexOf('Agrofit')>=0,'o texto cita o catálogo');
ck(/\d{2}\/\d{2}\/\d{4}/.test(h),'com a data em formato brasileiro: '+h.replace(/<[^>]+>/g,'').slice(0,70));
ck(/dia/.test(h),'e a idade em dias');

console.log('\n--- Catálogo velho vira aviso, não bloqueio ---');
ctx._agrofitCat={gerado:'2020-01-01'};
var velho=ctx.agrofitIdadeHtml();
ck(velho.indexOf('⚠')>=0,'passa a avisar depois de seis meses');
ck(/cancelado/.test(velho),'explicando o risco real: produto cancelado parecendo registrado');
ck(/agrofit-destila/.test(velho),'e dizendo como regerar');
ctx._agrofitCat={gerado:''};
ck(ctx.agrofitIdadeHtml()==='','sem data, não inventa idade');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
