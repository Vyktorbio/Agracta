/* Banco de itens e doses.
 *
 * O QUE ESTE MÓDULO RESOLVE
 *
 * Até aqui o produto de um tratamento era uma STRING digitada. "Sankari", "sankari",
 * "SANKARI 500 SC" e "Sankari (lote novo)" eram quatro produtos diferentes para o
 * app, e nenhum se ligava a nada. "Onde mais este item foi testado?" só se respondia
 * com um humano lembrando que os quatro textos eram a mesma coisa.
 *
 * QUATRO COISAS PRECISAM CONTINUAR VALENDO:
 *
 *  1. ITEM, DOSE E LOTE SÃO DIFERENTES. Dose solta não é informação: "1 L/ha" em soja
 *     contra ferrugem e "1 L/ha" em milho contra lagarta são dois dados, não um.
 *  2. A DOSE VAI CONGELADA NO TRATAMENTO. Se a bula mudar no ano que vem, o ensaio
 *     antigo tem de continuar dizendo o que ele realmente usou. Referência viva
 *     reescreveria a história.
 *  3. O TEXTO LIVRE CONTINUA VALENDO. Trinta e tantos estudos já existem com o
 *     produto digitado; apagá-los para "modernizar" seria destruir dado real.
 *  4. DUPLICATA AVISA, NÃO FUNDE. Fusão automática de cadastro é como se perde dado
 *     sem ninguém notar.
 *
 * Rodar: node test_banco_itens.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

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
function pegaVar(nome){
  var i=src.indexOf('var '+nome+'=[');
  if(i<0) throw new Error('não achei a var '+nome);
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='['){d++;viu=true;}
    else if(src[j]===']'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j)+';';
}
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var store={}, salvou=0;
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  Object:Object, Array:Array, isFinite:isFinite, parseInt:parseInt, parseFloat:parseFloat,
  localStorage:{ getItem:function(k){ return store[k]==null?null:store[k]; },
                 setItem:function(k,v){ store[k]=String(v); },
                 removeItem:function(k){ delete store[k]; } },
  save:function(){ salvou++; },
  _currentUserName:function(){ return 'Daria'; },
  quadraNome:function(q){ return q; },
  studyCultura:function(s){ return s.cultura||''; },
  estudoFinalizado:function(s){ return !!s.finalizado; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('uid'), pega('normStr'), pega('_calcNum'),
  "var ITENS_KEY='agracta-itens-v1', ITENSTS_KEY='agracta-itens-ts-v1', DELITENS_KEY='agracta-itens-del-v1';",
  "var ITENS=null, ITENS_TS=null, _delItens={};",
  pegaVar('ITEM_TIPOS'), pegaVar('ITEM_SITUACOES'), pegaVar('DOSE_ORIGENS'),
  pega('itemTipoRotulo'), pega('doseOrigemRotulo'),
  pega('ensureItens'), pega('saveItens'), pega('_touchItem'),
  pega('_itemChave'), pega('itemPossiveisDuplicatas'),
  pega('itensLista'), pega('itemPorId'), pega('itemNovo'), pega('itemAtualizar'), pega('itemExcluir'),
  pega('itemDoses'), pega('itemDoseAdicionar'), pega('itemDoseAposentar'),
  pega('_mesmaCultura'), pega('itemDosesPara'), pega('doseTexto'),
  pega('itemVinculosHistoricos'), pega('_vinculoHistoricoChave'), pega('itemVincularHistorico'),
  pega('tratItem'), pega('tratProdutoNome'), pega('tratLigarItem'), pega('tratDesligarItem'),
  pega('tratDoseForaDaBula'), pega('itemOndeFoiUsado')
].join('\n'), ctx);

/* ============================================================================== */
console.log('\n--- O item se cadastra uma vez ---');
var A=ctx.itemNovo({nome:'Produto A', codigo:'XYZ-26', titular:'Cliente X',
                    tipo:'teste', situacao:'experimental', formulacao:'SC', concentracao:'500 g/L'});
ck(!!A.id,'o item ganha ID permanente');
eq(A.nome,'Produto A','com o nome');
eq(A.titular,'Cliente X','e o cliente que o mandou');
eq(ctx.itensLista().length,1,'e aparece na lista');
eq(ctx.itemPorId(A.id).codigo,'XYZ-26','e se recupera pelo ID');
eq(ctx.itemNovo({nome:'   '}),null,'item sem nome não chega a ser persistido');
var salvouAntes=salvou;ctx.itemAtualizar(A.id,{titular:'Cliente X revisado'});
ck(salvou>salvouAntes,'editar o item agenda persistência offline e na nuvem');
ctx.itemAtualizar(A.id,{titular:'Cliente X'});

console.log('\n--- Duplicata AVISA, não funde ---');
/* Fusão automática de cadastro é como se perde dado sem ninguém notar. */
var B=ctx.itemNovo({nome:'PRODUTO  A'});
var dup=ctx.itemPossiveisDuplicatas('produto a', B.id);
eq(dup.length,1,'"PRODUTO  A" acha "Produto A" — caixa, acento e espaço não separam');
eq(dup[0].id,A.id,'e aponta qual é');
eq(ctx.itensLista().length,2,'mas os DOIS continuam existindo: quem decide é a pessoa');
eq(ctx.itemPossiveisDuplicatas('Produto B','').length,0,'nome diferente não acusa nada');
ctx.itemExcluir(B.id);

console.log('\n--- Excluir é lápide, não sumiço ---');
/* Sem lápide, um aparelho que sincroniza depois ressuscita o item apagado. */
eq(ctx.itemPorId(B.id),null,'o item some da leitura');
ck(store['agracta-itens-del-v1'].indexOf(B.id)>=0,'mas fica a lápide, para o merge não o trazer de volta');

console.log('\n--- A dose é qualificada por cultura e alvo ---');
/* "1 L/ha" sozinho não é informação. */
var d1=ctx.itemDoseAdicionar(A.id,{cultura:'Soja', alvo:'Ferrugem', valor:'0,6', valorMax:'0,8',
                                   unidade:'L/ha', origem:'bula', documento:'Bula mai/2026'});
var d2=ctx.itemDoseAdicionar(A.id,{cultura:'Milho', valor:'1,0', unidade:'L/ha', origem:'patrocinador'});
var d3=ctx.itemDoseAdicionar(A.id,{valor:'0,1', unidade:'% v/v', origem:'manual'});
eq(ctx.itemDoses(A.id).length,3,'três doses no item');
eq(ctx.itemDosesPara(A.id,'Soja','Ferrugem').length,2,'em soja/ferrugem valem a dela e a sem cultura');
eq(ctx.itemDosesPara(A.id,'Milho','').length,2,'em milho, a de milho e a sem cultura');
eq(ctx.itemDosesPara(A.id,'Algodão','').length,1,'em algodão, só a que não declara cultura');
/* Dose sem cultura é o caso do adjuvante: não é específica. */
eq(ctx.itemDosesPara(A.id,'Soja','Mofo-branco').length,1,'alvo diferente exclui a dose específica');
ck(/Soja · Ferrugem · 0,6–0,8 L\/ha/.test(ctx.doseTexto(d1)),'a dose se lê numa linha, com faixa');
var antesDose=ctx.itemDoses(A.id).length;
ck(!!ctx.itemDoseAdicionar(A.id,{valor:'abc',unidade:'L/ha'}).erro,'dose não numérica é recusada');
ck(!!ctx.itemDoseAdicionar(A.id,{valor:'0',unidade:'L/ha'}).erro,'dose zero é recusada');
ck(!!ctx.itemDoseAdicionar(A.id,{valor:'1',valorMax:'0,5',unidade:'L/ha'}).erro,'faixa invertida é recusada');
eq(ctx.itemDoses(A.id).length,antesDose,'entrada inválida não cria dose fantasma');

console.log('\n--- Dose aposentada some da escolha, mas não do mundo ---');
/* Um protocolo antigo pode tê-la usado; o registro daquele ensaio não pode ficar
   apontando para o nada. */
ctx.itemDoseAposentar(A.id,d2.id);
eq(ctx.itemDosesPara(A.id,'Milho','').length,1,'a aposentada sai da lista de escolha');
eq(ctx.itemDoses(A.id).length,3,'mas continua guardada no item');
eq(ctx.itemDoses(A.id).filter(function(d){return d.id===d2.id;})[0].situacao,'substituida','marcada como substituída');

console.log('\n--- A DOSE VAI CONGELADA NO TRATAMENTO ---');
/* Se a bula mudar no ano que vem, o ensaio antigo tem de continuar dizendo o que ele
   realmente usou. Referência viva reescreveria a história. */
var T={id:'T3', produto:'sankari escrito à mão', dose:''};
ctx.tratLigarItem(T, A.id, d1.id);
eq(T.itemId,A.id,'o tratamento passa a apontar para o item');
eq(T.produto,'Produto A','e o nome vem do catálogo');
eq(T.produtoOriginal,'sankari escrito à mão','o texto original NÃO se perde');
eq(T.dose,'0,6 L/ha','a dose entra a partir do cadastro');
eq(T.doseRef.origem,'bula','com a origem congelada');
eq(T.doseRef.documento,'Bula mai/2026','e o documento que a sustenta');
/* Agora a dose do catálogo muda. O tratamento NÃO pode mudar junto. */
ctx.itemDoses(A.id)[0].valor=9.9;
eq(T.doseRef.valor,0.6,'mudar a dose no catálogo NÃO altera o tratamento já montado');
ctx.itemDoses(A.id)[0].valor=0.6;

console.log('\n--- Dose fora da bula é permitida, e marcada ---');
/* Ensaio experimental existe para sair da bula. Bloquear seria inútil; calar seria
   pior. */
eq(ctx.tratDoseForaDaBula(T),false,'0,6 está dentro da faixa 0,6–0,8');
T.dose='0,8 L/ha'; eq(ctx.tratDoseForaDaBula(T),false,'0,8 também');
T.dose='1,5 L/ha'; eq(ctx.tratDoseForaDaBula(T),true,'1,5 está fora e é acusada');
T.dose='0,3 L/ha'; eq(ctx.tratDoseForaDaBula(T),true,'abaixo do mínimo também');
/* Dose do patrocinador não tem faixa de bula para comparar: não se acusa nada. */
var T2={id:'T4'}; ctx.tratLigarItem(T2, A.id, d3.id);
eq(ctx.tratDoseForaDaBula(T2),false,'dose que não vem de bula não é comparada com bula nenhuma');

console.log('\n--- O texto livre continua valendo ---');
/* Trinta e tantos estudos já existem com o produto digitado. */
var velho={id:'T1', produto:'Produto antigo digitado', dose:'2 L/ha'};
eq(ctx.tratItem(velho),null,'tratamento sem item não quebra');
eq(ctx.tratProdutoNome(velho),'Produto antigo digitado','e continua mostrando o que foi digitado');
ctx.tratDesligarItem(T);
eq(T.itemId,undefined,'desligar tira o vínculo');
eq(T.produto,'sankari escrito à mão','e devolve o texto original');
eq(T.doseRef,undefined,'sem deixar referência órfã');

console.log('\n--- Código cego esconde a identidade de quem não deve vê-la ---');
ctx.itemAtualizar(A.id,{codigoCego:'T-04'});
var Tc={id:'T5'}; ctx.tratLigarItem(Tc, A.id, null);
eq(ctx.tratProdutoNome(Tc),'T-04','o executor vê o código cego');
eq(ctx.tratProdutoNome(Tc,true),'Produto A','e quem tem direito vê a identidade');
ctx.itemAtualizar(A.id,{codigoCego:''});
eq(ctx.tratProdutoNome(Tc),'Produto A','sem código cego, o nome normal');

console.log('\n--- "Onde este item já foi testado?" ---');
/* É a pergunta que o catálogo veio permitir. Com texto livre, "Sankari" e
   "SANKARI 500 SC" nunca se encontrariam. */
ctx.data={ __config:{}, Q1:{cultura:'Soja', estudos:[
  {id:'s1', codigo:'EST-1', tratamentos:[{id:'T3', itemId:A.id, dose:'0,8 L/ha', doseRef:{origem:'bula'}},
                                          {id:'T1', produto:'texto livre'}]}]},
  Q2:{cultura:'Milho', estudos:[
  {id:'s2', codigo:'EST-2', finalizado:true, tratamentos:[{id:'T2', itemId:A.id, dose:'1,0 L/ha'}]}]} };
var usos=ctx.itemOndeFoiUsado(A.id);
eq(usos.length,2,'dois ensaios usaram o item');
eq(usos[0].estudo,'EST-1','o primeiro');
eq(usos[1].finalizado,true,'e o segundo, que está finalizado');
ck(usos.every(function(u){ return u.tratamento&&u.quadra; }),'com quadra e tratamento, para se poder voltar até a origem');
eq(ctx.itemOndeFoiUsado('inexistente').length,0,'item sem uso devolve lista vazia');
/* __config não é quadra e não pode entrar na varredura. */
ck(!usos.some(function(u){ return u.qid==='__config'; }),'e __config não entra na varredura');

console.log('\n--- Excluir item em uso é impedido na tela ---');
var apagar=src.slice(src.indexOf('function itemApagar('));
apagar=apagar.slice(0,apagar.indexOf('\n}\n'));
ck(/itemOndeFoiUsado\(id\)/.test(apagar),'a tela consulta onde o item foi usado antes de excluir');
ck(/Cancelado/.test(apagar),'e sugere marcar como cancelado em vez de apagar');

console.log('\n--- O catálogo é GLOBAL, não de uma quadra ---');
/* Um item é da organização, não de um talhão. */
ck(/itens:\(typeof ITENS!=='undefined'\?ITENS:null\)/.test(src),'ITENS entra em cloudState');
ck(/itensts:\(typeof ITENS_TS/.test(src),'com o mapa de timestamps para o merge');
ck(/_deletedItens:/.test(src),'e as lápides');
ck(/if\(st\.itens && typeof st\.itens==='object'\)/.test(src),'e cloudApply o lê de volta');
ck(/version:6/.test(src) && /itens:\(typeof ITENS/.test(src),'o backup em arquivo inclui itens, doses e lotes');
ck(/if\(imported\.itens && typeof imported\.itens==='object'\)/.test(src),'e a importação restaura o catálogo');
ck(/function safetySnap\(\)[\s\S]*_deletedItens:/.test(src),'o snapshot local também guarda as lápides dos itens');

console.log('\n--- Os seletores auxiliares não viram campo do tratamento ---');
/* t.__item seria lixo persistido, e o sweep de extras o levaria para o banco. */
ck(/delete t\.__item; delete t\.__dose;/.test(src),
   'syncTratInputs descarta __item e __dose');

console.log('\n--- O tratamento vira RECEITA ---');
/* "Sankari + Silwet" morava numa string. O motor de calda sabia parti-la, mas nada
   mais entendia: o catálogo não via dois itens, e "onde este adjuvante foi usado" não
   tinha resposta. */
ctx.DoseCore=require('./vendor/dose-core.js');
vm.runInContext([
  pega('tratComponentes'), pega('tratTemReceita'), pega('tratCompAdicionar'),
  pega('tratCompRemover'), pega('_tratSincronizaTexto'), pega('_tratProximoId'),
  pega('tratEscadaCriar'), pega('_calcDoseUnit')
].join('\n'), ctx);
var ADJ=ctx.itemNovo({nome:'Silwet', tipo:'adjuvante'});
var Tr={id:'T6', produto:'', dose:''};
ctx.tratCompAdicionar(Tr, A.id, '0,8', 'L/ha');
ctx.tratCompAdicionar(Tr, ADJ.id, '0,1', '% v/v');
eq(ctx.tratComponentes(Tr).length,2,'dois componentes na receita');
eq(ctx.tratTemReceita(Tr),true,'o tratamento se declara receita');
/* O motor de calda lê t.produto e t.dose como TEXTO. Mantê-los em dia é o que permite
   a receita existir sem reescrever o motor — e sem tela e cálculo discordarem. */
eq(Tr.produto,'Produto A + Silwet','o texto do produto acompanha a receita');
eq(Tr.dose,'0,8 L/ha + 0,1 % v/v','e o texto da dose também');
eq(ctx.tratComponentes(Tr)[1].itemId,ADJ.id,'o adjuvante entra COM identidade, não como texto');
ctx.data.Q3={cultura:'Soja',estudos:[{id:'s3',codigo:'EST-3',tratamentos:[Tr]}]};
var usosAdj=ctx.itemOndeFoiUsado(ADJ.id);
eq(usosAdj.length,1,'o item dentro da receita aparece em onde foi usado');
eq(usosAdj[0].dose,'0,1 % v/v','com a dose do componente, não a dose combinada da receita');
eq(usosAdj[0].componente,'Silwet','e identificado como componente');
ctx.tratCompRemover(Tr, ctx.tratComponentes(Tr)[1].id);
eq(ctx.tratComponentes(Tr).length,1,'remover componente funciona');
eq(Tr.produto,'Produto A','e o texto se atualiza junto');

console.log('\n--- Escada de doses cria os tratamentos ---');
var EST={id:'sx', tratamentos:[]};
var r=ctx.tratEscadaCriar(EST, A.id, 0.8, 'L/ha', [0.25,0.5,1,2], {comTestemunha:true});
ck(!r.erro,'a escada é criada');
eq(EST.tratamentos.length,5,'testemunha + quatro degraus');
/* A testemunha é o ZERO da escada: sem ela um ensaio de dose-resposta não tem de
   onde partir. E ela NÃO é um item do banco — cadastrar "testemunha" como produto
   inventaria um produto que não existe. */
eq(EST.tratamentos[0].testemunha,true,'a testemunha entra primeiro');
eq(EST.tratamentos[0].itemId,undefined,'e NÃO é um item do banco');
eq(EST.tratamentos[1].id,'T2','os IDs seguem em sequência');
eq(EST.tratamentos[4].id,'T5','até o último');
eq(ctx.tratComponentes(EST.tratamentos[1])[0].valor,0.2,'0,25× de 0,8 = 0,2');
eq(ctx.tratComponentes(EST.tratamentos[4])[0].valor,1.6,'2× = 1,6');
eq(EST.tratamentos[4].escada.multiplo,2,'e cada degrau lembra seu multiplicador');
eq(EST.tratamentos[4].escada.referencia,0.8,'e a referência de onde saiu');
/* ID não pode colidir com o que já existe no estudo. */
var EST2={id:'sy', tratamentos:[{id:'T1'},{id:'T2'}]};
ctx.tratEscadaCriar(EST2, A.id, 1, 'L/ha', [1], {});
eq(EST2.tratamentos[2].id,'T3','a escada não repete ID já usado');

console.log('\n--- Justificativa de dose fora da bula é campo próprio ---');
/* Escondê-la em "observações" seria o mesmo que não pedir. */
ck(/data-f="justificativaDose"/.test(src),'há campo de justificativa no tratamento');
ck(/obrigatório para dose fora da bula/.test(src),'que se declara obrigatório');
ck(/tratDoseForaDaBula\(t\)\)\{/.test(src),'e ele só aparece quando a dose sai da faixa');

console.log('\n--- Novo item é rascunho até salvar ---');
var abrirNovo=pega('itemAbrirNovo');
ck(abrirNovo.indexOf("_itemAberto='__novo__'")>=0,'abrir o formulário cria apenas um rascunho de tela');
ck(abrirNovo.indexOf('itemNovo({nome')<0,'e não salva item vazio antes da confirmação');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
