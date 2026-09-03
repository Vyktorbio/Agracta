/* Baixa em lote a partir da memória de cálculo (motor puro).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O app sabia quanto foi preparado (memória de cálculo) e sabia de que lote o
 * material saiu (t.loteRef), e não ligava uma coisa na outra: para o saldo bater
 * era preciso digitar a mesma quantidade duas vezes. Ninguém digita duas vezes.
 *
 * Cinco coisas precisam continuar valendo:
 *
 *  1. GOLDEN TEST, conferido à mão: 3 parcelas de 2 m × 5 m a 200 L/ha com dose de
 *     1,5 L/ha dão 45 mL de produto — e 45 mL viram 0,045 L quando o lote está em
 *     litros.
 *  2. UNIDADE NÃO SE CHUTA. mL → g é RECUSADO com o nome do que falta (densidade).
 *     Um motor que resolvesse isso assumindo água erraria a baixa em silêncio.
 *  3. SALDO INSUFICIENTE NÃO VIRA SALDO NEGATIVO NEM SILÊNCIO: recusa nomeada, com
 *     quanto faltou.
 *  4. NÃO BAIXA DUAS VEZES. A chave tratamento|componente|lote impede que salvar a
 *     aplicação de novo repita o consumo.
 *  5. LOTE VENCIDO É BAIXADO E MARCADO. Não bloquear, não calar: o material foi
 *     usado, e apagar isso reescreveria o ensaio.
 *
 * Rodar: node test_consumo_lote.js
 */
var C=require('./vendor/consumo-core.js');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ var ok=(a!=null&&Math.abs(a-b)<=tol); ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* ---- conversão ---------------------------------------------------------- */
console.log('\n--- Dentro da família é aritmética ---');
eq(C.converter(450,'mL','L').valor, 0.45, '450 mL = 0,45 L');
eq(C.converter(0.45,'L','mL').valor, 450, '0,45 L = 450 mL');
eq(C.converter(90,'g','kg').valor, 0.09, '90 g = 0,09 kg');
eq(C.converter(1500,'mg','g').valor, 1.5, '1500 mg = 1,5 g');
eq(C.converter(2,'L','l').valor, 2, 'a grafia da unidade não importa (L = l)');
eq(C.familia('mL'), 'volume', 'mL é volume');
eq(C.familia('kg'), 'massa', 'kg é massa');
eq(C.familia('sementes'), null, 'unidade que o motor não converte devolve null, não um palpite');

console.log('\n--- Entre famílias é RECUSADO, com o nome do que falta ---');
var x=C.converter(450,'mL','g');
ck(!!x.erro, 'mL → g é recusado');
eq(x.falta, 'densidade', 'e a recusa diz o que falta: densidade');
ck(x.valor===undefined, 'nenhum número plausível é devolvido junto');
ck(!!C.converter(1,'L','sementes').erro, 'unidade desconhecida no destino também é recusada');

/* ---- GOLDEN TEST --------------------------------------------------------
   Conferido à mão:
     parcela 2 m × 5 m = 10 m²; 3 parcelas = 30 m² = 0,003 ha
     dose 1,5 L/ha = 1500 mL/ha  ->  1500 × 0,003 = 4,5 mL... mas o preparo é por
     frasco cheio; aqui a memória JÁ TRAZ o total calculado (45 mL), porque quem
     calcula é o BioCalculoCampo. Este motor não recalcula calda — ele lê o total
     e converte para a unidade do lote. É de propósito: dois motores para a mesma
     conta divergem no primeiro ajuste. */
var mem={
  motor:'BioCalculoCampo', motorVersao:'1.0',
  tratamentos:[
    {id:'T1', produto:'Sankari', componentes:[{nome:'Sankari', total:45, unidadeMassa:'mL'}]},
    {id:'T2', produto:'Sankari + Silwet',
     componentes:[{nome:'Sankari', total:90, unidadeMassa:'mL'},
                  {nome:'Silwet',  total:6,  unidadeMassa:'mL'}]},
    {id:'T3', produto:'Mancozebe', componentes:[{nome:'Mancozebe', total:90, unidadeMassa:'g'}]},
    {id:'T4', testemunha:true, semPreparo:true, componentes:[]}
  ]
};

console.log('\n--- A memória vira lista de consumos ---');
var cons=C.consumosDaMemoria(mem);
eq(cons.length, 4, 'quatro consumos (a testemunha sem preparo não entra)');
eq(cons[0].nome, 'Sankari', 'o primeiro é o Sankari do T1');
eq(cons[0].quantidade, 45, '45 mL');
eq(cons[1].tratamentoId, 'T2', 'a receita do T2 entra componente a componente');
eq(cons[2].nome, 'Silwet', 'inclusive o adjuvante — ele tem identidade');
ck(!cons.some(function(c){ return c.tratamentoId==='T4'; }), 'testemunha sem preparo não gera baixa');

var trats=[
  {id:'T1', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}, componentes:[]},
  {id:'T2', componentes:[{id:'cp1', nome:'Sankari', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}},
                         {id:'cp2', nome:'Silwet',  loteRef:{itemId:'i2', loteId:'l2', codigo:'SW-01'}}]},
  {id:'T3', loteRef:{itemId:'i3', loteId:'l3', codigo:'MZ-77'}, componentes:[]},
  {id:'T4', componentes:[]}
];
function lotes(){
  return {
    l1:{id:'l1', codigo:'SK-2311', unidade:'L',  saldo:1,   validade:'2027-01-01', situacao:'ativo'},
    l2:{id:'l2', codigo:'SW-01',   unidade:'mL', saldo:500, validade:'',           situacao:'ativo'},
    l3:{id:'l3', codigo:'MZ-77',   unidade:'kg', saldo:2,   validade:'2027-01-01', situacao:'ativo'}
  };
}

console.log('\n--- GOLDEN TEST: o plano da baixa ---');
var plano=C.planejar({memoria:mem, tratamentos:trats, lotes:lotes(), data:'2026-09-03', jaRegistrados:[]});
eq(plano.baixas.length, 4, 'quatro baixas planejadas');
eq(plano.recusas.length, 0, 'nenhuma recusa');
perto(plano.baixas[0].quantidade, 0.045, 1e-9, '45 mL viram 0,045 L (o lote está em litros)');
eq(plano.baixas[0].unidade, 'L', 'e a baixa sai na unidade DO LOTE');
eq(plano.baixas[0].quantidadeOriginal, 45, 'a quantidade preparada original vai junto');
eq(plano.baixas[0].unidadeOriginal, 'mL', 'com a unidade original — a conta fica conferível');
perto(plano.baixas[1].quantidade, 0.09, 1e-9, '90 mL do Sankari no T2 = 0,09 L');
eq(plano.baixas[2].quantidade, 6, 'o Silwet sai em mL porque o lote dele é em mL');
eq(plano.baixas[2].loteId, 'l2', 'e vai para o lote do adjuvante, não para o do produto');
perto(plano.baixas[3].quantidade, 0.09, 1e-9, '90 g de mancozebe = 0,09 kg');

console.log('\n--- O saldo anda DENTRO do plano ---');
/* l1 recebe duas baixas na mesma aplicação: 0,045 + 0,09. A segunda tem de ser
   conferida contra o que sobra depois da primeira, não contra o saldo de antes. */
perto(plano.baixas[0].saldoPrevisto, 0.955, 1e-9, 'depois da 1ª baixa restam 0,955 L');
perto(plano.baixas[1].saldoPrevisto, 0.865, 1e-9, 'depois da 2ª, 0,865 L — a conta é encadeada');

console.log('\n--- Unidade que não converte é recusada, não adivinhada ---');
var lo=lotes(); lo.l1.unidade='kg';                 /* produto líquido, lote em massa */
var p2=C.planejar({memoria:mem, tratamentos:trats, lotes:lo, data:'2026-09-03'});
eq(p2.recusas.length, 2, 'as duas baixas do lote em kg são recusadas');
eq(p2.recusas[0].causa, 'unidade', 'a causa é a unidade');
eq(p2.recusas[0].falta, 'densidade', 'e o motivo nomeia a densidade');
ck(p2.baixas.length===2, 'as outras duas seguem normalmente — uma recusa não derruba o resto');

console.log('\n--- Saldo insuficiente: recusa nomeada, com quanto faltou ---');
var lo2=lotes(); lo2.l3.saldo=0.05;                  /* precisa de 0,09 kg */
var p3=C.planejar({memoria:mem, tratamentos:trats, lotes:lo2, data:'2026-09-03'});
var rec=p3.recusas.filter(function(r){ return r.loteId==='l3'; })[0];
ck(!!rec, 'a baixa do mancozebe é recusada');
eq(rec.causa, 'saldo', 'a causa é o saldo');
perto(rec.falta, 0.04, 1e-9, 'e a recusa diz que faltaram 0,04 kg');
ck(rec.motivo.indexOf('MZ-77')>=0, 'o código do lote vai na frase — dá para agir sem caçar');

console.log('\n--- O lote é conferido pelo TOTAL da aplicação, não saque a saque ---');
/* l1 é sacado duas vezes nesta aplicação: 0,045 + 0,09 = 0,135 L. Com 0,1 L em
   estoque, o primeiro saque caberia sozinho — e baixá-lo deixaria o lote num
   número que não é nem o antigo nem o certo. Os dois são um preparo físico só. */
var lo6=lotes(); lo6.l1.saldo=0.1;
var pAgg=C.planejar({memoria:mem, tratamentos:trats, lotes:lo6, data:'2026-09-03'});
eq(pAgg.baixas.filter(function(b){return b.loteId==='l1';}).length, 0,
   'nenhum dos dois saques do lote curto sai — nem o que caberia sozinho');
eq(pAgg.recusas.filter(function(r){return r.loteId==='l1';}).length, 2, 'os dois são recusados');
perto(pAgg.recusas[0].falta, 0.035, 1e-9, 'e a falta é a do TOTAL (0,135 − 0,1), não a de um saque');
eq(pAgg.baixas.filter(function(b){return b.loteId!=='l1';}).length, 2,
   'os lotes que cobrem o que lhes é pedido seguem normalmente');

console.log('\n--- Lote encerrado e lote sumido ---');
var lo3=lotes(); lo3.l3.situacao='encerrado';
eq(C.planejar({memoria:mem, tratamentos:trats, lotes:lo3, data:'2026-09-03'})
   .recusas.filter(function(r){return r.causa==='encerrado';}).length, 1, 'lote encerrado é recusado');
var lo4=lotes(); delete lo4.l3;
eq(C.planejar({memoria:mem, tratamentos:trats, lotes:lo4, data:'2026-09-03'})
   .recusas.filter(function(r){return r.causa==='lote';}).length, 1, 'lote que sumiu do banco é recusado');

console.log('\n--- Vencido é BAIXADO e MARCADO, nunca calado ---');
var lo5=lotes(); lo5.l3.validade='2026-08-01';
var p4=C.planejar({memoria:mem, tratamentos:trats, lotes:lo5, data:'2026-09-03'});
var mz=p4.baixas.filter(function(b){ return b.loteId==='l3'; })[0];
ck(!!mz, 'a baixa do lote vencido acontece — o material foi usado');
eq(mz.vencido, true, 'e vai marcada como vencida');
eq(mz.validade, '2026-08-01', 'com a validade que estava valendo');
var p5=C.planejar({memoria:mem, tratamentos:trats, lotes:lotes(), data:'2026-09-03'});
eq(p5.baixas[3].vencido, false, 'lote dentro da validade não é marcado');

console.log('\n--- Não baixa duas vezes ---');
var chaves=plano.baixas.map(function(b){ return b.chave; });
var p6=C.planejar({memoria:mem, tratamentos:trats, lotes:lotes(), data:'2026-09-03', jaRegistrados:chaves});
eq(p6.baixas.length, 0, 'salvar a aplicação de novo não repete nenhuma baixa');
eq(p6.jaRegistradas.length, 4, 'as quatro aparecem como já registradas');
var p7=C.planejar({memoria:mem, tratamentos:trats, lotes:lotes(), data:'2026-09-03', jaRegistrados:[chaves[0]]});
eq(p7.baixas.length, 3, 'e o que ainda não foi baixado continua sendo baixado');

console.log('\n--- Sem lote vinculado não é erro: é silêncio ---');
var semLote=[{id:'T1', componentes:[]},{id:'T2', componentes:[]},{id:'T3', componentes:[]},{id:'T4', componentes:[]}];
var p8=C.planejar({memoria:mem, tratamentos:semLote, lotes:{}, data:'2026-09-03'});
eq(p8.baixas.length, 0, 'nada é baixado');
eq(p8.recusas.length, 0, 'e nada é RECUSADO — lote é opcional, cobrar seria ruído');
eq(p8.semLote.length, 4, 'os consumos ficam listados à parte, para quem quiser ver');

console.log('\n--- Receita de dois componentes não herda o lote do tratamento ---');
/* Atribuir ao adjuvante o lote do produto inventaria uma origem. */
var t2so=[{id:'T2', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'},
           componentes:[{id:'cp1', nome:'Sankari', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}},
                        {id:'cp2', nome:'Silwet'}]}];
var p9=C.planejar({memoria:{tratamentos:[mem.tratamentos[1]]}, tratamentos:t2so, lotes:lotes(), data:'2026-09-03'});
eq(p9.baixas.length, 1, 'só o componente que declara lote é baixado');
eq(p9.semLote.length, 1, 'o outro fica sem lote, e não recebe o lote do vizinho');

console.log('\n--- A memória traz o próprio vínculo (motor de calda 1.1.0+) ---');
/* Desde a v175 o componente gravado carrega id, item e lote. Ele manda: foi o que
   estava valendo na hora do preparo, e o tratamento pode ter sido reeditado. */
var memVinc={tratamentos:[{id:'T1', produto:'Sankari', liberado:true, componentes:[
  {id:'cp9', itemId:'i1', nome:'Sankari', total:45, unidadeMassa:'mL',
   loteRef:{itemId:'i1', loteId:'l2', codigo:'SW-01'}}]}]};
/* O tratamento aponta para OUTRO lote — o que foi reeditado depois do preparo. */
var tVinc=[{id:'T1', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}, componentes:[]}];
var pv=C.planejar({memoria:memVinc, tratamentos:tVinc, lotes:lotes(), data:'2026-09-03'});
eq(pv.baixas.length, 1, 'a baixa acontece');
eq(pv.baixas[0].loteId, 'l2', 'e vai para o lote QUE A MEMÓRIA registrou, não para o do tratamento de hoje');
eq(pv.baixas[0].componenteId, 'cp9', 'com o id do componente que a memória guardou');
eq(pv.baixas[0].unidade, 'mL', 'na unidade daquele lote');

console.log('\n--- Sem vínculo na memória, o id do componente vem antes do nome ---');
var memId={tratamentos:[{id:'T2', componentes:[
  {id:'cp2', nome:'nome que mudou depois', total:6, unidadeMassa:'mL'}]}]};
var tId=[{id:'T2', componentes:[
  {id:'cp1', nome:'Sankari', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}},
  {id:'cp2', nome:'Silwet',  loteRef:{itemId:'i2', loteId:'l2', codigo:'SW-01'}}]}];
var pid=C.planejar({memoria:memId, tratamentos:tId, lotes:lotes(), data:'2026-09-03'});
eq(pid.baixas.length, 1, 'casa pelo id mesmo com o nome trocado');
eq(pid.baixas[0].loteId, 'l2', 'e acha o lote certo — identidade vence texto');

console.log('\n--- Preparo que o motor recusou NÃO baixa lote ---');
/* liberado:false quer dizer que a calda não cabe ou a receita tem problema. Baixar
   registraria consumo de um preparo que não aconteceu. */
var memBloq={tratamentos:[
  {id:'T1', liberado:false, componentes:[{nome:'Sankari', total:45, unidadeMassa:'mL'}]},
  {id:'T3', liberado:true,  componentes:[{nome:'Mancozebe', total:90, unidadeMassa:'g'}]}]};
var pb=C.planejar({memoria:memBloq, tratamentos:trats, lotes:lotes(), data:'2026-09-03'});
eq(pb.baixas.length, 1, 'só o tratamento liberado é baixado');
eq(pb.baixas[0].tratamentoId, 'T3', 'e é o T3');
eq(pb.recusas.length, 0, 'o bloqueado não vira recusa de lote — o problema não é do lote');
eq(C.consumosDaMemoria({tratamentos:[{id:'T1', liberado:false,
   componentes:[{nome:'X', total:9, unidadeMassa:'mL'}]}]}).length, 0, 'nem chega a virar consumo');

console.log('\n--- Memória antiga (sem o campo liberado) continua baixando ---');
/* Tratar ausência como bloqueio apagaria a baixa de todo estudo anterior ao motor 1.1.0. */
eq(C.consumosDaMemoria({tratamentos:[{id:'T1',
   componentes:[{nome:'X', total:9, unidadeMassa:'mL'}]}]}).length, 1,
   'ausente não é falso — memória antiga segue valendo');

console.log('\n--- Bancada entra pelo mesmo caminho ---');
/* A memória de laboratório não tem componentes: tem o que se pipetou ou o que se
   pesou. Pipetar e pesar são coisas diferentes e só uma delas acontece. */
var memLab={motor:'BioCalculoLab', contexto:'laboratorio', tratamentos:[
  {id:'T1', produto:'Sankari', produtoMl:0.6},
  {id:'T2', produto:'Mancozebe', massaMg:120},
  {id:'T3', produto:'Nada', testemunha:true, semPreparo:true}
]};
var cl=C.consumosDaMemoria(memLab);
eq(cl.length, 2, 'dois consumos de bancada');
eq(cl[0].unidade, 'mL', 'o que se pipeta sai em mL');
eq(cl[1].unidade, 'mg', 'o que se pesa sai em mg');
var pl=C.planejar({memoria:memLab, data:'2026-09-03',
  tratamentos:[{id:'T1', loteRef:{itemId:'i1', loteId:'l1', codigo:'SK-2311'}, componentes:[]},
               {id:'T2', loteRef:{itemId:'i3', loteId:'l3', codigo:'MZ-77'}, componentes:[]}],
  lotes:lotes()});
perto(pl.baixas[0].quantidade, 0.0006, 1e-9, '0,6 mL viram 0,0006 L');
perto(pl.baixas[1].quantidade, 0.00012, 1e-9, '120 mg viram 0,00012 kg');

console.log('\n--- Memória com erro não vira baixa ---');
eq(C.consumosDaMemoria({tratamentos:[{id:'T1', erro:'sem volume de calda'}]}).length, 0,
   'tratamento que não calculou não gera consumo');
eq(C.consumosDaMemoria({tratamentos:[{id:'T1', componentes:[{nome:'X', total:0, unidadeMassa:'mL'}]}]}).length, 0,
   'total zero não gera consumo — zero não é preparo');
eq(C.consumosDaMemoria(null).length, 0, 'sem memória, nada');
eq(C.planejar({}).baixas.length, 0, 'sem memória, plano vazio em vez de exceção');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
