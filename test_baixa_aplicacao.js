/* A aplicação baixa o lote ao ser salva (ligação memória de cálculo × custódia).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O motor (test_consumo_lote.js) já garante a conta. Este garante a LIGAÇÃO: que
 * salvar a aplicação escreve mesmo o evento no lote, com a trilha que uma
 * auditoria vai pedir, e que ela não faz nada além disso.
 *
 * Cinco coisas precisam continuar valendo:
 *
 *  1. O EVENTO SAI DE VERDADE, com aplicação, estudo, tratamento e origem
 *     'derivada' gravados nele. Consumo que não sabe de onde veio é meia trilha.
 *  2. O SALDO CAI, e cai pelo caminho normal do lote (soma de eventos), não por
 *     alguém escrevendo um número por cima.
 *  3. SALVAR DE NOVO NÃO REPETE. É o erro que faria o estoque sumir sozinho.
 *  4. A RECUSA FICA GRAVADA NA APLICAÇÃO. Um aviso que só existe no instante do
 *     salvamento é notificação, não registro — amanhã ninguém saberia que a baixa
 *     não saiu.
 *  5. NADA DISSO IMPEDE A APLICAÇÃO DE SER SALVA. A pulverização aconteceu.
 *
 * Rodar: node test_baixa_aplicacao.js
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
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ var ok=(a!=null&&Math.abs(a-b)<=tol); ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

var salvou=0, upserts=[], auditoria=[];
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  isFinite:isFinite, Object:Object, Array:Array, parseInt:parseInt, parseFloat:parseFloat,
  ConsumoCore:require('./vendor/consumo-core.js'),
  esc:function(v){ return String(v==null?'':v); },
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; },
  save:function(){ salvou++; },
  saveItens:function(){},
  dbUpsertAplicacao:function(q,s,a){ upserts.push(a.id); },
  _currentUserName:function(){ return 'Técnico de teste'; },
  logStudyAuditInObject:function(st,acao,det,extra){ auditoria.push({acao:acao,det:det,extra:extra}); },
  _stxToast:function(){},
  openStudyDetail:function(){},
  _bloqueadoPorFinalizacao:function(){ return false; }
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  "var LOTE_EVENTOS=['recebimento','entrada','movimentacao','consumo','ajuste','descarte','devolucao'];",
  'var ITENS={}, ITENS_TS={}, _delItens={};',
  'function ensureItens(){ return ITENS; }',
  'function _touchItem(id){ ITENS_TS[id]=Date.now(); }',
  'function uid(){ return "s"+(Math.random().toString(36).slice(2,10)); }',
  pega('normStr'), pega('itemPorId'), pega('itemLotes'), pega('itemLotePorId'),
  pega('_itemNumero'), pega('_loteImpacto'), pega('itemLoteSaldo'),
  pega('_loteEventoMontar'), pega('itemLoteEvento'),
  pega('_consumoNucleo'), pega('aplicacaoConsumos'), pega('_consumoLotesDoEstudo'),
  pega('consumoPlanoDaAplicacao'), pega('aplicacaoBaixarLotes'), pega('consumoBlocoHtml'),
  pega('consumoConferir')
].join('\n'), ctx);

/* ---- cenário ------------------------------------------------------------- */
function monta(saldoSankari){
  ctx.ITENS={
    i1:{id:'i1', nome:'Sankari 500 SC', lotes:[{
      id:'l1', codigo:'SK-2311', unidade:'L', situacao:'ativo', validade:'2027-05-01',
      eventos:[{id:'ev0', tipo:'recebimento', quantidade:(saldoSankari==null?1:saldoSankari),
                unidade:'L', impacto:(saldoSankari==null?1:saldoSankari), em:'2026-01-10'}]
    }]},
    i2:{id:'i2', nome:'Silwet', lotes:[{
      id:'l2', codigo:'SW-01', unidade:'mL', situacao:'ativo', validade:'',
      eventos:[{id:'ev0', tipo:'recebimento', quantidade:500, unidade:'mL', impacto:500, em:'2026-01-10'}]
    }]}
  };
  var ap={id:'ap1', data:'2026-09-03', hora:'09:31',
    memoriaCalculo:{motor:'BioCalculoCampo', motorVersao:'1.0', tratamentos:[
      {id:'T1', produto:'Sankari', componentes:[{nome:'Sankari', total:450, unidadeMassa:'mL'}]},
      {id:'T2', produto:'Sankari + Silwet', componentes:[
        {nome:'Sankari', total:90, unidadeMassa:'mL'},
        {nome:'Silwet',  total:6,  unidadeMassa:'mL'}]},
      {id:'T3', testemunha:true, semPreparo:true, componentes:[]}
    ]}};
  var study={id:'s1', codigo:'AGR-2026-11', aplicacoes:[ap], tratamentos:[
    {id:'T1', produto:'Sankari', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}},
    {id:'T2', produto:'Sankari + Silwet', componentes:[
      {id:'cp1', nome:'Sankari', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}},
      {id:'cp2', nome:'Silwet',  loteRef:{itemId:'i2', loteId:'l2', codigo:'SW-01'}}]},
    {id:'T3', testemunha:true}
  ]};
  ctx.data={ Q1:{estudos:[study]} };
  return {study:study, ap:ap};
}
function saldo(item,lote){ return ctx.itemLoteSaldo(ctx.itemLotePorId(item,lote)); }

console.log('\n--- A baixa sai de verdade, e o saldo cai ---');
var c=monta();
perto(saldo('i1','l1'), 1, 1e-9, 'o lote começa com 1 L');
var r=ctx.aplicacaoBaixarLotes(c.study,'Q1',c.ap);
eq(r.feitas.length, 3, 'três baixas gravadas (T1, e os dois componentes do T2)');
eq(r.avisos.length, 0, 'nenhuma recusa');
perto(saldo('i1','l1'), 0.46, 1e-9, '1 L − 0,45 L − 0,09 L = 0,46 L');
perto(saldo('i2','l2'), 494, 1e-9, '500 mL − 6 mL = 494 mL de adjuvante');

console.log('\n--- O evento carrega a trilha inteira ---');
var ev=ctx.itemLotePorId('i1','l1').eventos.filter(function(e){ return e.tipo==='consumo'; })[0];
eq(ev.tipo, 'consumo', 'é um consumo');
eq(ev.aplicacaoId, 'ap1', 'e ele sabe de que APLICAÇÃO saiu');
eq(ev.estudoId, 's1', 'de que estudo');
eq(ev.tratamentoId, 'T1', 'de que tratamento');
eq(ev.origemRegistro, 'derivada', "e que foi DERIVADO, não lançado à mão");
eq(ev.em, '2026-09-03', 'a data do evento é a da aplicação, não a de hoje');
eq(ev.responsavel, 'Técnico de teste', 'com responsável');
ck(String(ev.obs).indexOf('AGR-2026-11')>=0, 'e a observação diz de que ensaio veio');
perto(ev.saldoApos, 0.55, 1e-9, 'o saldo depois vai gravado no próprio evento');

console.log('\n--- A aplicação guarda o que foi baixado ---');
eq(c.ap.consumos.length, 3, 'três consumos registrados na aplicação');
eq(c.ap.consumos[0].quantidadeOriginal, 450, 'com a quantidade preparada original');
eq(c.ap.consumos[0].unidadeOriginal, 'mL', 'na unidade original');
eq(c.ap.consumos[0].unidade, 'L', 'e a baixa na unidade do lote');
ck(!!c.ap.consumos[0].eventoId, 'apontando para o evento que foi criado');
eq(c.ap.consumoAvisos, undefined, 'sem avisos quando tudo deu certo');
ck(auditoria.some(function(a){ return a.acao==='Baixa em lote'; }), 'e a auditoria do estudo registra a baixa');

console.log('\n--- Salvar de novo NÃO repete a baixa ---');
var r2=ctx.aplicacaoBaixarLotes(c.study,'Q1',c.ap);
eq(r2.feitas.length, 0, 'nada de novo é gravado');
perto(saldo('i1','l1'), 0.46, 1e-9, 'o saldo não se mexe');
eq(c.ap.consumos.length, 3, 'e a aplicação continua com três consumos');
eq(ctx.itemLotePorId('i1','l1').eventos.filter(function(e){return e.tipo==='consumo';}).length, 2,
   'o lote continua com dois eventos de consumo — não quatro');

console.log('\n--- Saldo insuficiente: recusa gravada, aplicação intacta ---');
/* O lote tem 0,2 L e esta aplicação pede 0,45 + 0,09 = 0,54 L dele. Os dois
   saques são um preparo físico só: baixar o que coube deixaria o saldo num
   número que não é nem o antigo nem o certo. Então nenhum dos dois sai. */
var c2=monta(0.2);
var r3=ctx.aplicacaoBaixarLotes(c2.study,'Q1',c2.ap);
eq(r3.feitas.length, 1, 'só o adjuvante passa — ele é de outro lote, que tem saldo');
eq(r3.avisos.length, 2, 'os dois saques do lote curto são recusados, não um só');
eq(c2.ap.consumoAvisos.length, 2, 'e a recusa fica GRAVADA na aplicação, não só na tela');
eq(c2.ap.consumoAvisos[0].causa, 'saldo', 'com a causa nomeada');
ck(c2.ap.consumoAvisos[0].motivo.indexOf('0.54')>=0, 'que nomeia o TOTAL pedido, não o saque isolado');
perto(saldo('i1','l1'), 0.2, 1e-9, 'o saldo do lote não foi tocado — nem em parte');
ck(saldo('i1','l1')>=0, 'e em nenhum momento ficou negativo');

console.log('\n--- Unidade que não converte também é recusa, não palpite ---');
var c3=monta();
ctx.ITENS.i1.lotes[0].unidade='kg';       /* líquido em mL contra lote em massa */
var r4=ctx.aplicacaoBaixarLotes(c3.study,'Q1',c3.ap);
eq(r4.feitas.length, 1, 'só o adjuvante é baixado');
eq(c3.ap.consumoAvisos[0].causa, 'unidade', 'a causa é a unidade');
ck(c3.ap.consumoAvisos[0].motivo.indexOf('densidade')>=0, 'e o motivo nomeia a densidade que falta');

console.log('\n--- Lote vencido: baixa e marca ---');
var c4=monta();
ctx.ITENS.i1.lotes[0].validade='2026-08-01';   /* aplicação é 03/09 */
var r5=ctx.aplicacaoBaixarLotes(c4.study,'Q1',c4.ap);
eq(r5.feitas.length, 3, 'a baixa acontece — o material foi usado');
eq(r5.feitas[0].vencido, true, 'e vai marcada como vencida');
var evv=ctx.itemLotePorId('i1','l1').eventos.filter(function(e){return e.tipo==='consumo';})[0];
ck(String(evv.obs).indexOf('vencido')>=0, 'o próprio evento do lote diz que estava vencido');
ck(ctx.consumoBlocoHtml(c4.ap).indexOf('lote vencido')>=0, 'e o cartão da aplicação avisa na tela');

console.log('\n--- Sem memória de cálculo não há o que baixar ---');
var c5=monta(); delete c5.ap.memoriaCalculo;
eq(ctx.aplicacaoBaixarLotes(c5.study,'Q1',c5.ap), null, 'sem memória, nada acontece (e não quebra)');
eq(ctx.consumoBlocoHtml(c5.ap), '', 'e o cartão não mostra bloco nenhum');

console.log('\n--- Estudo sem lote vinculado: silêncio, não erro ---');
var c6=monta();
delete c6.study.tratamentos[0].loteRef;
delete c6.study.tratamentos[1].componentes[0].loteRef;
delete c6.study.tratamentos[1].componentes[1].loteRef;
var r6=ctx.aplicacaoBaixarLotes(c6.study,'Q1',c6.ap);
eq(r6.feitas.length, 0, 'nada é baixado');
eq(r6.avisos.length, 0, 'e nada é cobrado — lote é opcional');
eq(ctx.consumoBlocoHtml(c6.ap), '', 'o cartão fica limpo');

console.log('\n--- O lote que só a MEMÓRIA conhece continua sendo achado ---');
/* O componente gravado carrega o lote que valia na hora do preparo. Se o
   tratamento foi reeditado depois e aponta para outro lote, procurar só no
   tratamento recusaria a baixa com "o lote não existe mais" — quando ele existe e
   é justamente o que foi usado. */
var cm=monta();
cm.ap.memoriaCalculo.tratamentos[0].componentes[0].loteRef={itemId:'i2', loteId:'l2', codigo:'SW-01'};
delete cm.study.tratamentos[0].loteRef;          /* o tratamento não aponta mais para lote nenhum */
var rm=ctx.aplicacaoBaixarLotes(cm.study,'Q1',cm.ap);
eq(rm.avisos.length, 0, 'nenhuma recusa por lote inexistente');
ck(rm.feitas.some(function(x){ return x.loteId==='l2' && x.tratamentoId==='T1'; }),
   'a baixa do T1 vai para o lote que a memória registrou');

console.log('\n--- Preparo bloqueado pelo motor não baixa lote ---');
var cb=monta();
cb.ap.memoriaCalculo.tratamentos[0].liberado=false;   /* a calda do T1 não cabe */
var rb=ctx.aplicacaoBaixarLotes(cb.study,'Q1',cb.ap);
ck(!rb.feitas.some(function(x){ return x.tratamentoId==='T1'; }),
   'o T1 não é baixado — o preparo não aconteceu');
ck(rb.feitas.some(function(x){ return x.tratamentoId==='T2'; }),
   'e os tratamentos liberados seguem normalmente');

console.log('\n--- Conferir de novo depois de repor o lote ---');
var c7=monta(0.2);
ctx.aplicacaoBaixarLotes(c7.study,'Q1',c7.ap);
eq(c7.ap.consumos.length, 1, 'na primeira vez só o adjuvante entrou');
ctx.itemLoteEvento('i1','l1',{tipo:'entrada', quantidade:5, unidade:'L', em:'2026-09-04'});
ctx.consumoConferir('Q1','s1','ap1');
eq(c7.ap.consumos.length, 3, 'reposto o lote, as duas baixas que faltavam entram');
perto(saldo('i1','l1'), 4.66, 1e-9, '0,2 + 5 − 0,45 − 0,09 = 4,66 L');
eq(c7.ap.consumoAvisos, undefined, 'e o aviso some porque deixou de ser verdade');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
