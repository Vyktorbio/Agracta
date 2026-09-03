/* Sem variação residual não existe teste — e o app não pode dar duas respostas.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Caso real de bancada: testemunha 0/0/0 e produto 10/10/10. As repetições
 * concordam perfeitamente dentro de cada tratamento, então a soma de quadrados
 * do resíduo é ZERO.
 *
 * O que acontecia até a v193: F virava Infinity, `_fpval` devolvia 1 — "não
 * significativo" — e a DMS virava ZERO, o que faz o Tukey separar QUALQUER
 * diferença. O cartão mostrava "p=1 · ns" ao lado das letras "a" e "b". Duas
 * respostas contrárias no mesmo lugar, justamente quando o produto funcionou
 * perfeitamente. E o agrônomo lê as letras.
 *
 * Nem "significativo" nem "não significativo" é verdade aqui: o teste F não pode
 * ser calculado sem termo de erro. Dizer p=1 é pior que calar, porque sugere
 * evidência de que NÃO há diferença — quando a diferença é total.
 *
 * O limiar é RELATIVO porque resíduo quase-zero de arredondamento é o mesmo
 * problema pelo outro lado: com valores na casa de 1e12 sobra ruído de ponto
 * flutuante, o F explode para 1e8 e sai "significativo" a partir de nada.
 *
 * Rodar: node test_sem_residuo.js
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

var ctx={Math:Math,String:String,Number:Number,isNaN:isNaN,isFinite:isFinite,
         parseFloat:parseFloat,parseInt:parseInt,Object:Object,Array:Array,
         normalizeStudy:function(s){return s;}};
vm.createContext(ctx);
vm.runInContext([
  'function _avRowKey(t,r){return t+"|"+r;}',
  'function _avNota(av,ref,v){var n=(av&&av.notas)||{};var o=n[ref.key];return o?o[v]:null;}',
  'function _avSentido(){return "menor";}',
  pega('_lgamma'), pega('_betacf'), pega('_betai'), pega('_fpval'),
  pega('_erfc'), pega('_ncdf'), pega('_prange'), pega('_ptukey'), pega('_qtukey'),
  pega('_tukeyLetters'), pega('estudoTemReplicacao'), pega('statDBC')
].join('\n'),ctx);

function estudo(trats,reps){ return {numRepeticoes:reps, desenho:'dbc',
  tratamentos:trats.map(function(t){return {id:t};})}; }
function av(notas){ return {id:'a1',data:'2026-09-01',variaveis:['sev'],notas:notas}; }
function grade(trats,reps,fn){ var n={};
  trats.forEach(function(t,ti){ for(var r=1;r<=reps;r++) n[t+'|'+r]={sev:fn(ti,r)}; }); return n; }

console.log('\n--- O caso real: testemunha 0/0/0, produto 10/10/10 ---');
var r=ctx.statDBC(estudo(['Testemunha','Produto'],3),
  av({'Testemunha|1':{sev:0},'Testemunha|2':{sev:0},'Testemunha|3':{sev:0},
      'Produto|1':{sev:10},'Produto|2':{sev:10},'Produto|3':{sev:10}}),'sev');
ck(!!r,'o resultado ainda existe — as médias servem');
ck(r.tMean['Testemunha']===0 && r.tMean['Produto']===10,'e as médias estão certas');
ck(!!r.semResiduo,'mas o motivo é declarado');
ck(r.p===null,'p é NULO, não 1 — dizer p=1 sugeriria evidência de que não há diferença');
ck(r.F===null,'F é nulo, não Infinity');
ck(r.sig===false,'e nada é declarado significativo');
ck(Object.keys(r.letras).length===0,'NENHUMA letra é atribuída — era a contradição');
ck(r.hsd===null,'nem DMS, que valia zero e separava tudo');
ck(/não há variação residual/i.test(r.semResiduo),'o motivo explica: '+r.semResiduo.slice(0,58));

console.log('\n--- Todos os valores iguais: motivo próprio ---');
r=ctx.statDBC(estudo(['T1','T2','T3'],4), av(grade(['T1','T2','T3'],4,function(){return 7;})),'sev');
ck(!!r.semResiduo,'declara o motivo');
ck(/mesmo valor/i.test(r.semResiduo),'e diz que todas as parcelas deram o mesmo valor');
ck(r.p===null && Object.keys(r.letras).length===0,'sem p e sem letras');

console.log('\n--- Doença que não ocorreu (tudo zero) ---');
r=ctx.statDBC(estudo(['T1','T2'],3), av(grade(['T1','T2'],3,function(){return 0;})),'sev');
ck(!!r.semResiduo,'tudo zero também não gera teste');
ck(r.cv===null,'e o CV não sai como 0% nem como divisão por zero');

console.log('\n--- Resíduo QUASE zero por arredondamento (o outro lado) ---');
/* Valores na casa de 1e12 perfeitamente aditivos: sobra ruído de ponto
   flutuante. Antes o F explodia para ~1e8 e saía SIGNIFICATIVO a partir de nada. */
r=ctx.statDBC(estudo(['T1','T2'],3), av(grade(['T1','T2'],3,function(ti,rp){return 1e12*(ti+1)+rp;})),'sev');
ck(!!r.semResiduo,'ruído de arredondamento não vira significância');
ck(r.sig===false,'e nada sai significativo');

console.log('\n--- Dado NORMAL continua sendo analisado ---');
r=ctx.statDBC(estudo(['T1','T2','T3'],4),
  av(grade(['T1','T2','T3'],4,function(ti,rp){ return 50-ti*12+(rp%2?3:-2)+(ti*rp%3); })),'sev');
ck(!r.semResiduo,'com resíduo de verdade, nada é bloqueado');
ck(typeof r.p==='number' && r.p>=0 && r.p<=1,'o p-valor sai: '+r.p);
ck(typeof r.F==='number' && isFinite(r.F),'o F sai finito: '+r.F);
ck(r.hsd>0,'a DMS é maior que zero — as letras voltam a significar algo');
ck(Object.keys(r.letras).length===3,'e há letra para cada tratamento');

console.log('\n--- As recusas antigas continuam valendo ---');
ck(ctx.statDBC(estudo(['T1'],4), av(grade(['T1'],4,function(){return 1;})),'sev')===null,
   'um tratamento só continua devolvendo nulo');
ck(ctx.statDBC(estudo(['T1','T2'],1), av(grade(['T1','T2'],1,function(){return 1;})),'sev')===null,
   'uma repetição só também');
ck(ctx.statDBC(estudo(['T1','T2'],3), av({'T1|1':{sev:1}}),'sev')===null,
   'grade incompleta também');

console.log('\n--- A tela não pode imprimir "<0,001" para p nulo ---');
/* `st.p<0.001` com p null é VERDADEIRO em JavaScript: null vira 0. Sem guarda,
   o cartão diria "<0,001" — o oposto exato do que o dado mostra. */
ck((null<0.001)===true,'a armadilha existe mesmo em JS');
ck(/st && st\.semResiduo/.test(src),'a planilha guarda o caso antes de formatar p');
ck(/st\.semResiduo\s*\n?\s*\?/.test(src)||/semResiduo\s*\?/.test(src),'e o cartão rápido também');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
