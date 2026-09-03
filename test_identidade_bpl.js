/* Nome humano na trilha/documento BPL — inclusive registros legados.
 * Rodar: node test_identidade_bpl.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}

var ctx={
  console:console,Date:Date,String:String,Number:Number,Math:Math,Object:Object,Array:Array,
  isFinite:isFinite,isNaN:isNaN,parseInt:parseInt,
  data:{__config:{
    adminEmail:'victor@agracta.test',meuNome:'',
    nomesPorEmail:{'victor@agracta.test':'Victor Chaves'},
    allowedUsers:[{email:'ana@agracta.test',nome:'Ana Campo'}]
  }},
  _authUser:{email:'victor@agracta.test',displayName:''},
  _perfisCache:[{email:'bruno@agracta.test',nome:'Bruno Silva'}],
  uid:function(){return 'E1';},save:function(){},
  avMomento:function(){return {explicito:false};},
  measureDistance:function(){return 0;}
};
ctx.window=ctx;ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  pega('ensureConfig'),
  pega('_identidadeEhEmail'),pega('_identidadeNomeValido'),
  pega('_nomeCadastradoPorEmail'),pega('_identidadeBPL'),
  pega('_currentUserName'),pega('_forenseAchados'),pega('_forenseDe'),
  pega('_autorBPL'),pega('newStudy')
].join('\n'),ctx);

var f=0,p=0;
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}
function eq(a,b,n){ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')'));}

console.log('Cadastro e sessão');
eq(ctx._currentUserName(),'Victor Chaves','sessão devolve nome humano cadastrado');
ctx._authUser={email:'ana@agracta.test',displayName:'ana@agracta.test'};
eq(ctx._currentUserName(),'Ana Campo','displayName em formato de e-mail é ignorado');
ctx._authUser={email:'bruno@agracta.test',displayName:''};
eq(ctx._currentUserName(),'Bruno Silva','perfil Firebase completa o nome');

console.log('\nRegistros legados');
var id=ctx._identidadeBPL('victor@agracta.test','victor@agracta.test');
eq(id.nome,'Victor Chaves','e-mail antigo no campo nome é resolvido pelo cadastro');
eq(id.email,'victor@agracta.test','e-mail continua como identificador técnico separado');
id=ctx._identidadeBPL('Machado, V. C. — CRBio-01','victor@agracta.test');
eq(id.nome,'Machado, V. C. — CRBio-01','nome histórico existente não é reescrito pelo cadastro atual');
id=ctx._identidadeBPL('desconhecido@agracta.test','');
eq(id.nome,'Não identificado','e-mail desconhecido nunca aparece fingindo ser nome');
eq(id.email,'desconhecido@agracta.test','identificador desconhecido não é perdido');

console.log('\nFolha forense e autor do estudo');
ctx._authUser={email:'victor@agracta.test',displayName:''};
var reg=ctx._forenseDe({data:'2026-08-17',carimbo:{rubrica:'data:image/png',rubricaNome:'victor@agracta.test',rubricaPor:'victor@agracta.test'}},'AV');
eq(reg.assinadaPor,'Victor Chaves','carimbo forense exporta o nome da pessoa');
eq(reg.assinadaEmail,'victor@agracta.test','carimbo forense preserva o e-mail em outra coluna');
id=ctx._autorBPL({autor:'victor@agracta.test'});
eq(id.nome,'Victor Chaves','autor legado em formato de e-mail é resolvido');
id=ctx._autorBPL({autor:'outra.pessoa@agracta.test'});
eq(id.nome,'Não identificado','conta alheia sem cadastro não é atribuída a quem abriu a folha');
eq(id.email,'outra.pessoa@agracta.test','ID técnico da conta alheia continua disponível');
var novo=ctx.newStudy();
eq(novo.autor,'Victor Chaves','estudo novo captura o responsável na criação');
eq(novo.autorEmail,'victor@agracta.test','estudo novo captura também o identificador da conta');

console.log('\n'+p+' ok, '+f+' falha(s)');
process.exit(f?1:0);
