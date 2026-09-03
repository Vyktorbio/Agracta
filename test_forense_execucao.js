/* Achados de EXECUÇÃO na folha forense/BPL (roadmap §12).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O carimbo já respondia "quem, quando e onde". Faltava "o que aconteceu com o
 * material e com o tempo": de que lote o preparo saiu, se aquele lote estava
 * vencido no dia, o que se recusou a baixar, e se choveu logo depois. Tudo isso o
 * app passou a gravar sozinho — a folha só não olhava.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. O ACHADO NASCE DO DADO, não de alguém lembrar de anotar. Se a baixa marcou
 *     lote vencido, o achado existe.
 *  2. APONTA, NÃO ACUSA. "Lote vencido na data" é fato conferível; "fraude" seria
 *     conclusão que o programa não sustenta. A palavra é "conferir".
 *  3. SEVERIDADE SEPARA O QUE EXIGE RESPOSTA do que é contexto. E não existe score:
 *     um 96/100 daria aparência de validação absoluta a uma contagem.
 *  4. REGISTRO LIMPO NÃO GERA ACHADO — senão a lista vira ruído e ninguém lê.
 *
 * Rodar: node test_forense_execucao.js
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

var ctx={console:console, String:String, Number:Number, Array:Array, Object:Object, JSON:JSON,
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; }};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext(pega('_forenseAchados'), ctx);
function cod(as){ return as.map(function(a){return a.codigo;}); }

console.log('\n--- Registro limpo não gera achado ---');
eq(ctx._forenseAchados({data:'2026-09-03'}).length, 0, 'aplicação sem nada a apontar sai sem achado');
eq(ctx._forenseAchados(null).length, 0, 'e um registro inexistente não quebra');
eq(ctx._forenseAchados({consumos:[{codigo:'SK-1', vencido:false}]}).length, 0,
   'baixa normal, com lote dentro da validade, não é achado');

console.log('\n--- Lote vencido na data da aplicação ---');
var a1=ctx._forenseAchados({data:'2026-09-03',
  consumos:[{codigo:'SK-2311', nome:'Sankari', vencido:true, validade:'2026-08-01'}]});
eq(a1.length, 1, 'gera um achado');
eq(a1[0].codigo, 'lote-vencido', 'com código próprio');
eq(a1[0].severidade, 'conferir', 'classificado como "conferir"');
ck(a1[0].texto.indexOf('SK-2311')>=0, 'nomeando o lote');
ck(a1[0].texto.indexOf('01/08/2026')>=0, 'e a validade em data brasileira');
ck(!/fraud|falsific|adulter/i.test(a1[0].texto), 'e SEM acusação — o texto aponta, não conclui');

console.log('\n--- Baixa que não pôde ser registrada ---');
var a2=ctx._forenseAchados({consumoAvisos:[
  {nome:'Sankari', motivo:'Saldo insuficiente no lote SK-2311: esta aplicação pede 0.54 L e restam 0.2 L.'}]});
eq(a2[0].codigo, 'baixa-recusada', 'vira achado');
eq(a2[0].severidade, 'conferir', 'e é para conferir');
ck(a2[0].texto.indexOf('Saldo insuficiente')>=0, 'levando o motivo inteiro, não um resumo');

console.log('\n--- Chuva logo depois da aplicação ---');
var a3=ctx._forenseAchados({pos:{chuvaMm:22, choveu:true, primeiraChuvaHoras:2.5, horas:48,
  completa:true, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3}});
eq(cod(a3).join(','), 'chuva-apos-aplicacao', 'chuva 2,5 h depois é achado');
ck(a3[0].texto.indexOf('lavagem')>=0, 'e o texto levanta a hipótese de lavagem');
ck(a3[0].texto.indexOf('22')>=0, 'com o quanto choveu');

var a4=ctx._forenseAchados({pos:{chuvaMm:22, choveu:true, primeiraChuvaHoras:30, horas:48,
  completa:true, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3}});
eq(a4.length, 0, 'chuva 30 h depois NÃO é achado — lavagem tem janela');

var a5=ctx._forenseAchados({pos:{chuvaMm:0, choveu:false, horas:48,
  completa:true, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3}});
eq(a5.length, 0, 'não ter chovido não é achado nenhum');

console.log('\n--- Sem hora, o achado diz que a conta é do dia inteiro ---');
var a6=ctx._forenseAchados({pos:{chuvaMm:12, choveu:true, primeiraChuvaHoras:1, horas:48,
  completa:true, horaConhecida:false, coberturaPct:100, diasComLeitura:3, dias:3}});
ck(a6[0].texto.indexOf('dia inteiro')>=0, 'a ressalva viaja com o achado, não fica só na tela');

console.log('\n--- Leitura incompleta é NOTA, não "conferir" ---');
/* Janela aberta não é problema do ensaio: é leitura pela metade. Classificá-la
   como "conferir" encheria a lista de coisas que não pedem ação. */
var a7=ctx._forenseAchados({pos:{chuvaMm:3, choveu:true, primeiraChuvaHoras:20, horas:48,
  completa:false, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3}});
eq(cod(a7).join(','), 'chuva-janela-aberta', 'janela ainda aberta vira nota');
eq(a7[0].severidade, 'nota', 'classificada como nota');

var a8=ctx._forenseAchados({pos:{chuvaMm:3, choveu:true, primeiraChuvaHoras:20, horas:48,
  completa:true, horaConhecida:true, coberturaPct:67, diasComLeitura:2, dias:3}});
eq(cod(a8).join(','), 'chuva-cobertura-parcial', 'cobertura parcial idem');
eq(a8[0].severidade, 'nota', 'também nota');
ck(a8[0].texto.indexOf('2 de 3')>=0, 'dizendo quantos dias tiveram leitura');

console.log('\n--- Vários achados no mesmo registro convivem ---');
var a9=ctx._forenseAchados({data:'2026-09-03',
  consumos:[{codigo:'SK-2311', nome:'Sankari', vencido:true, validade:'2026-08-01'}],
  consumoAvisos:[{nome:'Silwet', motivo:'Saldo insuficiente.'}],
  pos:{chuvaMm:22, choveu:true, primeiraChuvaHoras:2, horas:48, completa:false,
       horaConhecida:true, coberturaPct:50, diasComLeitura:1, dias:2}});
eq(a9.length, 5, 'os cinco aparecem');
eq(a9.filter(function(x){return x.severidade==='conferir';}).length, 3, 'três pedem conferência');
eq(a9.filter(function(x){return x.severidade==='nota';}).length, 2, 'dois são contexto');

console.log('\n--- E a folha não inventa score ---');
/* Olha o que a folha IMPRIME, não o que os comentários dizem: o próprio comentário
   que explica a regra contém a palavra "score", e uma checagem ingênua acusava ele. */
var pranchaSemComentario=fs.readFileSync('prancha.html','utf8')
  .replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
var blocoA=pranchaSemComentario.split('ACHADOS DE EXECUÇÃO')[1]||'';
ck(blocoA.length>200, 'o bloco de achados existe na folha');
ck(!/score|\/100/i.test(blocoA.slice(0,2500)),
   'e ele conta e classifica, sem pontuação — score daria ares de validação absoluta');
ck(blocoA.indexOf('a conferir')>=0, 'o rodapé diz quantos há a conferir');
ck(blocoA.indexOf('APONTA e não conclui')>=0, 'e declara que aponta sem concluir');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
