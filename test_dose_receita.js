/* A dose escrita nunca diverge da receita estruturada.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Desde que a receita passou a mandar no cálculo, `t.produto` e `t.dose` viraram
 * texto DERIVADO dela. Quem calcula lê a receita; quem exibe — a tabela de
 * tratamentos, o relatório, a exportação, a prancha — lê o texto. Se os dois
 * discordarem, o app mostra uma dose e prepara outra, e ninguém percebe porque os
 * dois números parecem certos cada um no seu lugar.
 *
 * A tela já impede criar a divergência (dose fica readonly quando há receita), mas
 * isso só vale daqui para a frente. Um estudo em que alguém digitou "2 L/ha"
 * enquanto a receita dizia 1 guardaria a divergência para sempre — é o caso da
 * §7-bis: o campo sumiu da tela, mas o dado errado não some sozinho.
 *
 * Três coisas precisam continuar valendo:
 *
 *  1. SALVAR CURA. Tratamento com receita tem produto e dose refeitos a partir
 *     dela, e volta a concordar com o que o motor de calda vai calcular.
 *  2. A CORREÇÃO NÃO É SILENCIOSA. Ela entra na trilha de auditoria dizendo qual
 *     dose virou qual — corrigir dado gravado sem deixar rastro é o que a BPL
 *     proíbe.
 *  3. QUEM NÃO TEM RECEITA NÃO É TOCADO. O texto livre continua sendo a verdade
 *     de quem nunca abriu o compositor, e a testemunha não vira produto.
 *
 * Rodar: node test_dose_receita.js
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
/* O trecho de ressincronização vive DENTRO de saveStudyV2. Extraí-lo inteiro
   arrastaria meia interface para o teste, então roda-se o bloco em si — que é
   exatamente o texto do arquivo, não uma cópia reescrita aqui. */
function pegaBloco(){
  var ini=src.indexOf('  var _dessinc=[];');
  if(ini<0) throw new Error('não achei o bloco de ressincronização em saveStudyV2');
  var fim=src.indexOf('gerarAvaliacoesAuto(s);', ini);
  if(fim<0) throw new Error('não achei o fim do bloco');
  return src.slice(ini,fim);
}
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var ctx={console:console, String:String, Number:Number, Array:Array, Object:Object, JSON:JSON, Math:Math};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('tratComponentes'), pega('tratTemReceita'), pega('_tratSincronizaTexto'),
  'function ressincronizar(s){\n'+pegaBloco()+'\n return _dessinc; }'
].join('\n'), ctx);

console.log('\n--- Salvar cura a divergência ---');
/* A receita diz 1 L/ha; alguém digitou 2 L/ha no campo livre antes de ele virar
   readonly. O cálculo usa 1 e a tela mostra 2. */
var s={tratamentos:[{id:'T1', produto:'Sankari', dose:'2 L/ha',
  componentes:[{id:'cp1', nome:'Sankari', valor:1, unidade:'L/ha'}]}]};
var mud=ctx.ressincronizar(s);
eq(s.tratamentos[0].dose, '1 L/ha', 'a dose passa a ser a da receita');
eq(s.tratamentos[0].produto, 'Sankari', 'e o produto também vem dela');
eq(mud.length, 1, 'a mudança é contada');
ck(mud[0].indexOf('2 L/ha')>=0 && mud[0].indexOf('1 L/ha')>=0,
   'e registrada com o valor antigo E o novo — a trilha diz o que virou o quê');
ck(mud[0].indexOf('T1')>=0, 'nomeando o tratamento');

console.log('\n--- Receita de dois componentes ---');
var s2={tratamentos:[{id:'T2', produto:'coisa errada', dose:'9 L/ha',
  componentes:[{id:'cp1', nome:'Sankari', valor:0.8, unidade:'L/ha'},
               {id:'cp2', nome:'Silwet',  valor:0.1, unidade:'% v/v'}]}]};
ctx.ressincronizar(s2);
eq(s2.tratamentos[0].produto, 'Sankari + Silwet', 'o produto vira a soma dos componentes');
eq(s2.tratamentos[0].dose, '0,8 L/ha + 0,1 % v/v', 'e a dose, a de cada um — com a vírgula do país');

console.log('\n--- Quem já está certo não muda um caractere ---');
var s3={tratamentos:[{id:'T1', produto:'Sankari', dose:'1 L/ha',
  componentes:[{id:'cp1', nome:'Sankari', valor:1, unidade:'L/ha'}]}]};
var antes=JSON.stringify(s3);
var mud3=ctx.ressincronizar(s3);
eq(mud3.length, 0, 'nada é registrado como mudança');
eq(JSON.stringify(s3), antes, 'e o estudo sai idêntico — salvar não vira edição fantasma');

console.log('\n--- Sem receita, o texto livre continua sendo a verdade ---');
var s4={tratamentos:[
  {id:'T1', produto:'Produto digitado à mão', dose:'1,5 L/ha'},
  {id:'T2', produto:'Testemunha', dose:'0', testemunha:true},
  {id:'T3', produto:'Outro', dose:'2 kg/ha', componentes:[]}
]};
var mud4=ctx.ressincronizar(s4);
eq(mud4.length, 0, 'nenhum deles é tocado');
eq(s4.tratamentos[0].dose, '1,5 L/ha', 'o texto livre permanece');
eq(s4.tratamentos[1].produto, 'Testemunha', 'a testemunha não vira produto de receita');
eq(s4.tratamentos[2].dose, '2 kg/ha', 'receita vazia é o mesmo que não ter receita');

console.log('\n--- Estudo sem tratamento nenhum não quebra ---');
eq(ctx.ressincronizar({}).length, 0, 'estudo vazio passa batido');
eq(ctx.ressincronizar({tratamentos:[]}).length, 0, 'lista vazia idem');
eq(ctx.ressincronizar({tratamentos:[null]}).length, 0, 'e um buraco na lista não derruba o salvamento');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
