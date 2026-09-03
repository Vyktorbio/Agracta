/* Cadeia de custódia por lote — livro-razão append-only do material físico.
 * Rodar: node test_cadeia_custodia.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
function pega(nome){
  var i=src.indexOf('function '+nome+'(');if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;for(;j<src.length;j++){if(src[j]==='{'){d++;viu=true;}else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}}
  return src.slice(i,j);
}
function pegaVar(nome){
  var i=src.indexOf('var '+nome+'=[');if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;for(;j<src.length;j++){if(src[j]==='['){d++;viu=true;}else if(src[j]===']'){d--;if(viu&&d===0){j++;break;}}}
  return src.slice(i,j)+';';
}
var f=0,p=0;
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}
function eq(a,b,n){ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')'));}
var store={};
var ctx={console:console,Date:Date,String:String,Number:Number,Math:Math,JSON:JSON,Object:Object,Array:Array,
  isFinite:isFinite,parseInt:parseInt,parseFloat:parseFloat,
  localStorage:{getItem:function(k){return store[k]==null?null:store[k];},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}},
  save:function(){},_currentUserName:function(){return 'Daria';}};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
vm.runInContext([
  pega('uid'),pega('normStr'),
  "var ITENS_KEY='agracta-itens-v1', ITENSTS_KEY='agracta-itens-ts-v1', DELITENS_KEY='agracta-itens-del-v1';",
  "var ITENS=null,ITENS_TS=null,_delItens={};",
  pegaVar('ITEM_TIPOS'),pegaVar('ITEM_SITUACOES'),
  pega('ensureItens'),pega('saveItens'),pega('_touchItem'),pega('itemPorId'),pega('itemNovo'),
  pega('itemDoses'),
  "var LOTE_EVENTOS=['recebimento','entrada','movimentacao','consumo','ajuste','descarte','devolucao'];",
  pega('itemLotes'),pega('itemLotePorId'),pega('_itemNumero'),pega('_loteImpacto'),pega('itemLoteSaldo'),
  pega('itemLotesAtivos'),pega('_loteEventoMontar'),pega('itemLoteNovo'),pega('itemLoteEvento'),
  pega('tratLigarItem'),pega('tratDesligarItem'),pega('tratLigarLote')
].join('\n'),ctx);

console.log('\n--- Recebimento cria o lote e o primeiro evento ---');
var it=ctx.itemNovo({nome:'Amostra X',armazenamento:'Armário 2'});
ck(!!ctx.itemLoteNovo(it.id,{codigo:'',quantidade:10,unidade:'mL'}).erro,'código do lote é obrigatório');
ck(!!ctx.itemLoteNovo(it.id,{codigo:'L-01',quantidade:0,unidade:'mL'}).erro,'quantidade recebida deve ser positiva');
var lote=ctx.itemLoteNovo(it.id,{codigo:'L-01',quantidade:'500',unidade:'mL',recebidoEm:'2026-09-02',
  fornecedor:'Patrocinador',documento:'NF 123'});
ck(!!lote.id,'lote ganha identidade própria');
eq(lote.eventos.length,1,'recebimento já entra no livro-razão');
eq(lote.eventos[0].tipo,'recebimento','com tipo explícito');
eq(ctx.itemLoteSaldo(lote),500,'saldo nasce da soma dos eventos');
eq(lote.armazenamento,'Armário 2','herda a condição de armazenamento do item');

console.log('\n--- Movimentação não altera saldo; consumo altera ---');
var mov=ctx.itemLoteEvento(it.id,lote.id,{tipo:'movimentacao',quantidade:500,destino:'Laboratório',documento:'OS 9'});
eq(mov.saldo,500,'mover fisicamente não cria nem destrói material');
var eventoRecebido=JSON.stringify(lote.eventos[0]);
var cons=ctx.itemLoteEvento(it.id,lote.id,{tipo:'consumo',quantidade:125,estudoId:'E-1',tratamentoId:'T2'});
eq(cons.saldo,375,'consumo baixa o saldo');
eq(JSON.stringify(lote.eventos[0]),eventoRecebido,'registrar evento novo não reescreve o recebimento');
eq(lote.eventos[2].estudoId,'E-1','consumo aponta para o estudo');
eq(lote.eventos[2].tratamentoId,'T2','e para o tratamento');

console.log('\n--- Saldo negativo e ajuste silencioso são recusados ---');
var nEventos=lote.eventos.length;
ck(!!ctx.itemLoteEvento(it.id,lote.id,{tipo:'consumo',quantidade:400}).erro,'não consome além do saldo');
eq(lote.eventos.length,nEventos,'tentativa recusada não deixa evento parcial');
ck(!!ctx.itemLoteEvento(it.id,lote.id,{tipo:'ajuste',quantidade:-10}).erro,'ajuste exige justificativa');
ck(!!ctx.itemLoteEvento(it.id,lote.id,{tipo:'consumo',quantidade:1,unidade:'kg'}).erro,'unidade diferente do lote é recusada');
var aj=ctx.itemLoteEvento(it.id,lote.id,{tipo:'ajuste',quantidade:-25,obs:'Correção após inventário'});
eq(aj.saldo,350,'ajuste justificado entra como novo evento');
eq(aj.evento.obs,'Correção após inventário','com a justificativa preservada');

console.log('\n--- Lote liga ao protocolo por snapshot ---');
var t={id:'T2',produto:'texto antigo'};
ctx.tratLigarItem(t,it.id,null);ctx.tratLigarLote(t,lote.id);
eq(t.loteRef.loteId,lote.id,'tratamento aponta para o lote');
eq(t.loteRef.codigo,'L-01','e congela o código legível');
var outro=ctx.itemNovo({nome:'Outro item'});
ctx.tratLigarItem(t,outro.id,null);
eq(t.loteRef,undefined,'trocar de item remove lote incompatível');

console.log('\n--- A trilha é somente de acréscimo na interface ---');
ck(src.indexOf('function itemLoteEventoExcluir(')<0,'não existe ação para apagar evento');
ck(src.indexOf('function itemLoteEventoEditar(')<0,'não existe ação para editar evento');
ck(/\['id','doses','lotes','vinculosHistoricos','criadoEm','criadoPor'\]/.test(src),'edição comum do item não sobrescreve o livro-razão');
ck(/Correções entram como novo ajuste justificado/.test(src),'a tela explica como corrigir sem apagar história');

console.log('\nResultado: '+p+' passaram; '+f+' falharam.');
if(f)process.exitCode=1;
