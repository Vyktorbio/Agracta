/* Migração dos estudos já digitados para o banco de itens.
 *
 * O QUE ESTE MÓDULO RESOLVE
 *
 * O banco de itens nasceu vazio, com dezenas de estudos já digitados atrás dele.
 * Um catálogo que só conhece o que for cadastrado de hoje em diante não é
 * identidade: é uma segunda planilha, ao lado da primeira. A migração é o que
 * liga o passado ao catálogo — e o pedido foi explícito: os estudos atuais devem
 * ser MIGRADOS, não recriados.
 *
 * QUATRO REGRAS QUE NÃO PODEM CAIR:
 *
 *  1. PROPÕE, NÃO ADIVINHA. Ligar sozinho seria decidir que "Sankari" e
 *     "Sankari 500" são o mesmo produto. Quando erra, erra calado, dentro de um
 *     estudo que já foi a campo. A varredura propõe; a pessoa confirma.
 *  2. ESTUDO FINALIZADO NÃO SE TOCA. Foi congelado com assinatura e data.
 *     Acrescentar identidade a um tratamento dele agora reescreveria um registro
 *     fechado. Ele aparece CONTADO, para ninguém achar que foi esquecido.
 *  3. MISTURA NÃO VIRA ITEM SOZINHO. "Sankari + Silwet" são dois produtos.
 *     Vincular a um item só perderia o adjuvante — isso é trabalho do compositor
 *     de receita. E o número na tela tem de dizer isso ANTES do clique.
 *  4. O TEXTO ORIGINAL FICA. Migrar não é apagar o que foi digitado.
 *
 * Rodar: node test_migracao_itens.js
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

var store={}, auditados=[];
var ctx={
  console:console, Date:Date, String:String, Number:Number, Math:Math, JSON:JSON,
  Object:Object, Array:Array, isFinite:isFinite, parseInt:parseInt, parseFloat:parseFloat,
  localStorage:{ getItem:function(k){ return store[k]==null?null:store[k]; },
                 setItem:function(k,v){ store[k]=String(v); },
                 removeItem:function(k){ delete store[k]; } },
  save:function(){},
  _currentUserName:function(){ return 'Daria'; },
  studyCultura:function(s){ return s.cultura||''; },
  estudoFinalizado:function(s){ return !!s.finalizado; },
  logStudyAuditInObject:function(st,acao,txt,extra){ auditados.push({estudo:st.id, acao:acao, txt:txt, extra:extra}); },
  esc:function(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
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
  pega('itensLista'), pega('itemPorId'), pega('itemNovo'),
  pega('itemDoses'), pega('itemDoseAdicionar'), pega('itemDosesPara'), pega('doseTexto'),
  pega('tratItem'), pega('tratComponentes'), pega('tratTemReceita'),
  pega('tratLigarItem'),
  pega('migracaoCandidatos'), pega('migracaoLigar'), pega('migracaoCriarELigar'),
  "var _migAberta=false,_migResumo=null,_migPendentes=0;",
  pega('_migracaoHtml')
].join('\n'), ctx);

/* Um retrato do que existe hoje: nomes digitados à mão, com todas as sujeiras
   reais — caixa trocada, espaço a mais, mistura, testemunha e estudo fechado. */
function mundo(){
  ctx.data={
    __config:{ nao:'sou uma quadra' },
    Q1:{ estudos:[
      { id:'e1', codigo:'AGR-01', tratamentos:[
        {id:'T1', produto:'Testemunha', dose:'0', testemunha:true},
        {id:'T2', produto:'Sankari', dose:'0,4 L/ha'},
        {id:'T3', produto:'Silwet', dose:'0,05 %'}
      ]},
      { id:'e2', codigo:'AGR-02', tratamentos:[
        {id:'T1', produto:'SANKARI ', dose:'0,5 L/ha'},
        {id:'T2', produto:'Sankari + Silwet', dose:'0,4 L/ha + 0,05 %'}
      ]}
    ]},
    Q2:{ estudos:[
      { id:'e3', codigo:'AGR-03', finalizado:true, tratamentos:[
        {id:'T1', produto:'Sankari', dose:'0,4 L/ha'},
        {id:'T2', produto:'Fechado', dose:'1 L/ha'}
      ]},
      { id:'e4', codigo:'AGR-04', tratamentos:[
        {id:'T1', produto:'sankari', dose:'0,4 L/ha'},
        {id:'T2', produto:'Já ligado', dose:'1 L/ha', itemId:'x'}
      ]}
    ]}
  };
}
mundo();

console.log('\n--- A varredura enxerga o que foi digitado ---');
var r=ctx.migracaoCandidatos();
var porNome={}; r.candidatos.forEach(function(c){ porNome[c.nome]=c; });
ck(!!porNome['Sankari'],'"Sankari" aparece como candidato');
ck(!!porNome['Silwet'],'"Silwet" também');
eq(r.candidatos.length,2,'e só eles: testemunha, item já ligado e finalizado ficam fora');
ck(!porNome['Testemunha'],'testemunha NÃO é item de banco — ela é o zero da escada');
ck(!porNome['Já ligado'],'quem já tem itemId não é proposto de novo');
ck(!porNome['Fechado'],'o produto que só existe em estudo finalizado não é proposto');

console.log('\n--- Grafias diferentes são o MESMO produto ---');
/* Se "Sankari", "SANKARI " e "sankari" virassem três itens, o catálogo teria
   nascido com o problema que veio resolver. */
var sk=porNome['Sankari'];
eq(sk.chave,ctx._itemChave('sankari'),'caixa e espaço não separam: uma chave só');
eq(sk.nEstudos,3,'reconhecido nos três estudos abertos');
ck(sk.grafias.length>=3,'e as grafias ficam registradas, não descartadas');
eq(sk.nome,'Sankari','a grafia mais usada vira o nome proposto');

console.log('\n--- O estudo finalizado é CONTADO, não migrado ---');
/* Some sem contar seria pior do que aparecer: ninguém saberia que ficou de fora. */
eq(r.finalizados,2,'as 2 ocorrências do estudo fechado aparecem no total');
ck(sk.nEstudos===3,'mas nenhuma delas entra na conta de estudos a migrar');

console.log('\n--- O número na tela é honesto ANTES do clique ---');
/* Contar a mistura junto faria a tela prometer 4 e ligar 3. */
eq(sk.ocorrencias,4,'"Sankari" tem 4 usos no total');
eq(sk.simples,3,'3 deles dão para ligar agora');
eq(sk.emMistura,1,'e 1 está dentro de "Sankari + Silwet"');
eq(sk.simples+sk.emMistura,sk.ocorrencias,'as duas contas fecham o total');

console.log('\n--- Ligar de verdade ---');
var it=ctx.itemNovo({nome:'Sankari 500 SC', codigo:'SK-500', titular:'Cliente X'});
var lig=ctx.migracaoLigar(sk.chave, it.id);
eq(lig.ligados,3,'liga exatamente os 3 usos simples que prometeu');
eq(lig.estudos,3,'em 3 estudos');
eq(ctx.data.Q1.estudos[0].tratamentos[1].itemId,it.id,'o tratamento passa a apontar para o item');
eq(ctx.data.Q2.estudos[1].tratamentos[0].itemId,it.id,'inclusive o que estava com caixa trocada');

console.log('\n--- O que a migração NÃO tocou ---');
eq(ctx.data.Q2.estudos[0].tratamentos[0].itemId,undefined,'estudo finalizado continua intacto: nada de identidade nova em registro fechado');
eq(ctx.data.Q1.estudos[1].tratamentos[1].itemId,undefined,'a mistura continua como estava — ela vira receita, não vínculo simples');
eq(ctx.data.Q1.estudos[0].tratamentos[0].itemId,undefined,'a testemunha segue sem item');

console.log('\n--- Migrar não apaga o que foi digitado ---');
var t=ctx.data.Q1.estudos[0].tratamentos[1];
ck(!!t.itemMigrado,'o vínculo vai marcado como vindo de migração');
eq(t.itemMigrado.por,'Daria','com quem confirmou');
ck(!!t.itemMigrado.em,'e quando');
ck(String(t.itemMigrado.de).toLowerCase().indexOf('sankari')>=0,'guardando o texto original que estava lá');

console.log('\n--- A trilha BPL registra, uma vez por estudo ---');
eq(auditados.length,3,'uma entrada de auditoria por estudo tocado');
ck(auditados.every(function(a){ return a.acao==='tratamento.item'; }),'sob a ação de vínculo de item');
ck(auditados.every(function(a){ return a.extra && a.extra.origem==='migracao'; }),'marcada como migração, não como escolha no protocolo');

console.log('\n--- Depois de ligar, a fila encolhe ---');
/* O que sobra de "Sankari" é a menção dentro de "Sankari + Silwet". Ela CONTINUA
   listada, porque continua sendo texto solto de verdade — some-la seria fingir que
   a mistura já tem identidade. O que muda é que ela deixa de ser trabalho: zero usos
   ligáveis, então nada de botão e nada na conta do aviso. */
var r2=ctx.migracaoCandidatos();
var sk2=r2.candidatos.filter(function(c){ return c.nome==='Sankari'; })[0];
eq(sk2.simples,0,'"Sankari" não tem mais nenhum uso solto para ligar');
eq(sk2.emMistura,1,'só resta a menção dentro da mistura, que não some por decreto');
eq(r2.ligaveis,1,'e a conta do aviso cai para 1: sobrou só o "Silwet"');
ck(r2.candidatos.filter(function(c){ return c.nome==='Silwet'; }).length===1,'"Silwet" continua esperando');

console.log('\n--- Só sobra mistura: a tela recusa em vez de prometer ---');
var sw=r2.candidatos.filter(function(c){ return c.nome==='Silwet'; })[0];
eq(sw.simples,1,'"Silwet" ainda tem 1 uso solto');
eq(sw.emMistura,1,'e 1 dentro da mistura');
ck(r2.candidatos[0].nome==='Silwet','e ele vem primeiro: o que dá para fazer fica no topo');

console.log('\n--- Cadastrar e ligar numa passada só ---');
/* É o caminho normal: quase todo nome digitado ainda não existe no banco. */
mundo(); auditados.length=0;
var r3=ctx.migracaoCandidatos();
var sk3=r3.candidatos.filter(function(c){ return c.nome==='Sankari'; })[0];
var novo=ctx.migracaoCriarELigar(sk3.chave,'Sankari',{titular:'Cliente X', tipo:'teste'});
ck(novo.criado,'o item é criado');
eq(novo.ligados,3,'e já sai ligado nos 3 usos simples');
eq(novo.item.nome,'Sankari','com o nome que estava digitado');
eq(novo.item.titular,'Cliente X','e o que mais foi preenchido na hora');
ck(!!ctx.itemPorId(novo.item.id),'e o item existe no banco depois disso');

console.log('\n--- A fila prioriza o que dá para fazer ---');
mundo();
ctx.data.Q1.estudos.push({id:'e5', codigo:'AGR-05', tratamentos:[{id:'T1', produto:'SóEmMistura + Outro', dose:'1'}]});
var r4=ctx.migracaoCandidatos();
eq(r4.candidatos[0].simples>0,true,'o primeiro da lista é sempre algo que dá para ligar');
var so=r4.candidatos.filter(function(c){ return c.nome==='SóEmMistura'; })[0];
eq(so.simples,0,'o que só existe em mistura tem zero usos simples');
eq(r4.ligaveis,r4.candidatos.filter(function(c){return c.simples>0;}).length,'e a contagem de "ligáveis" bate com a lista');
ck(r4.ligaveis<r4.candidatos.length,'o botão promete menos do que a lista inteira — porque nem tudo dá para ligar');

console.log('\n--- A tela diz a verdade, não só o número bonito ---');
ctx._migResumo=r4;
var html=ctx._migracaoHtml();
ck(html.indexOf('mistura')>=0,'a tela explica o caso da mistura em vez de escondê-lo');
ck(html.indexOf('finalizado')>=0,'e diz que o estudo fechado ficou de fora, e por quê');
ck(html.indexOf('Cadastrar')>=0,'com a ação disponível para o que dá para ligar');
/* O candidato que não dá para ligar não pode ganhar um botão que mente. */
var trecho=html.slice(html.indexOf('SóEmMistura'));
ck(trecho.indexOf('migracaoAcaoCriar')<0,'e NENHUM botão de ligar no candidato que só existe em mistura');

console.log('\n--- A varredura não confunde configuração com quadra ---');
ck(r4.candidatos.every(function(c){ return c.nome!=='sou uma quadra'; }),'a chave __config é pulada, como na busca');

console.log('\nResultado: '+p+' passaram; '+f+' falharam.');
if(f) process.exitCode=1;
