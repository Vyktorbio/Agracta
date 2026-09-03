/* A busca do Agrofit não pode destruir o campo em que se está digitando.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * `_itensPinta()` repinta a caixa inteira com innerHTML — ela DESTRÓI e recria
 * todo nó, inclusive o input em que a pessoa está digitando. Quando o catálogo
 * começava a carregar (na segunda letra), `_agrofitCarregar` chamava
 * `_itensPinta()`: o campo era arrancado debaixo dos dedos, o foco ia embora, e
 * as letras seguintes não chegavam a lugar nenhum.
 *
 * O sintoma para quem usa não é "está carregando". É "não busca".
 *
 * O comentário que proíbe isso já estava escrito em `_agrofitPintaLista` —
 * "repintar a tela inteira a cada tecla tiraria o foco do campo" — e o código
 * três linhas acima fazia exatamente isso. Por isso o teste é comportamental e
 * não uma leitura do texto: comentário não segura regressão, teste segura.
 *
 * Rodar: node test_agrofit_busca_foco.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
function pega(n){
  var i=src.indexOf('function '+n+'(');
  if(i<0) throw new Error('não achei '+n);
  var j=i,d=0,v=false;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;v=true;} else if(src[j]==='}'){d--;if(v&&d===0){j++;break;}} }
  return src.slice(i,j);
}
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

/* DOM mínimo com a propriedade que importa: repintar a caixa TROCA os nós.
   Cada nó tem uma identidade (geracao) para se saber se sobreviveu. */
var geracao=0, nos={};
function novoNo(id){ return {id:id, value:'', innerHTML:'', geracao:++geracao}; }
function repintaCaixa(){ nos.itAgrofitQ=novoNo('itAgrofitQ'); nos.itAgrofitRes=novoNo('itAgrofitRes'); }

var pintasCompletas=0;
var ctx={
  document:{ getElementById:function(id){ return nos[id]||null; } },
  esc:function(s){ return String(s==null?'':s); },
  _itensPinta:function(){ pintasCompletas++; repintaCaixa(); },
  AgrofitCore:require('./vendor/agrofit-core.js'),
  fetch:function(){ return {then:function(){ return {then:function(){ return {catch:function(){ return null; }}; }}; }}; },
  String:String, Object:Object, Array:Array, JSON:JSON, Math:Math
};
vm.createContext(ctx);
vm.runInContext([
  'var _agrofitCat=null,_agrofitCarregando=false,_agrofitSel=null,_agrofitErro="",_agrofitTermo="";',
  pega('_agrofitCarregar'), pega('agrofitBusca'),
  pega('_agrofitPintaLista'), pega('_agrofitListaHtml')
].join('\n'),ctx);

function digita(txt){ nos.itAgrofitQ.value=txt; ctx.agrofitBusca(); }

console.log('\n--- Digitando até disparar o carregamento do catálogo ---');
repintaCaixa();
var antes=nos.itAgrofitQ.geracao;
pintasCompletas=0;
digita('g');
ck(nos.itAgrofitQ.geracao===antes,'uma letra: o campo continua o MESMO nó');
digita('gl');
ck(nos.itAgrofitQ.geracao===antes,'duas letras (dispara o catálogo): o campo AINDA é o mesmo nó');
ck(pintasCompletas===0,'e nenhuma repintura completa foi disparada ('+pintasCompletas+')');

console.log('\n--- O que a pessoa digitou continua no campo ---');
ck(nos.itAgrofitQ.value==='gl','o texto não foi perdido');
digita('gli');
ck(nos.itAgrofitQ.geracao===antes,'a terceira letra chega no mesmo campo');
ck(ctx._agrofitTermo==='gli','e o termo acompanha: '+JSON.stringify(ctx._agrofitTermo));

console.log('\n--- A lista é o único pedaço repintado ---');
ck(nos.itAgrofitRes.geracao===antes+1,'a caixa de resultados não foi recriada');
ck(typeof nos.itAgrofitRes.innerHTML==='string' && nos.itAgrofitRes.innerHTML.length>0,'e recebeu conteúdo');

console.log('\n--- Com o catálogo já carregado, buscar não repinta nada além da lista ---');
ctx._agrofitCat=ctx.AgrofitCore.carregar(JSON.parse(fs.readFileSync('data/agrofit.json','utf8')));
ctx._agrofitCarregando=false;
pintasCompletas=0;
antes=nos.itAgrofitQ.geracao;
digita('glifosato');
ck(pintasCompletas===0,'nenhuma repintura completa');
ck(nos.itAgrofitQ.geracao===antes,'o campo sobrevive');
ck(/Glifosato/i.test(nos.itAgrofitRes.innerHTML),'e a lista traz resultado de verdade');

console.log('\n--- Nova tentativa limpa o erro anterior ---');
ctx._agrofitCat=null; ctx._agrofitCarregando=false; ctx._agrofitErro='falha antiga';
pintasCompletas=0; antes=nos.itAgrofitQ.geracao;
digita('teste');
ck(nos.itAgrofitQ.geracao===antes,'o campo sobrevive à nova tentativa');
ck(ctx._agrofitErro==='','o erro velho é limpo — tentar de novo não pode mostrar a falha passada');
ck(/Baixando/.test(nos.itAgrofitRes.innerHTML),'e a lista passa a dizer que está baixando');

console.log('\n--- Quando a falha acontece de verdade, ela aparece na lista ---');
ctx._agrofitCarregando=false;
ctx._agrofitErro='Não consegui abrir o catálogo (HTTP 404). Ele é baixado uma vez e depois funciona offline.';
pintasCompletas=0; antes=nos.itAgrofitQ.geracao;
ctx._agrofitPintaLista();
ck(pintasCompletas===0,'sem repintura completa');
ck(nos.itAgrofitQ.geracao===antes,'o campo continua de pé');
ck(/HTTP 404/.test(nos.itAgrofitRes.innerHTML),'e o motivo real está na tela');
ck(/funciona offline/.test(nos.itAgrofitRes.innerHTML),'com a explicação de que é baixado uma vez e depois funciona offline');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
