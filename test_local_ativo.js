/* Em que lugar o app abre.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O relato foi "quando eu abro, ele vai pro Picolini e não sei por quê". Não era
 * aleatório: o app resolve o lugar ativo DUAS vezes por abertura — uma na partida,
 * com o que o aparelho guardou, e outra quando a nuvem chega com os lugares de
 * verdade. Num aparelho zerado (instalação nova, armazenamento limpo, ou logout,
 * que apaga tudo) a primeira vez acontece sem lugar nenhum: o app cria o "Local
 * principal" e escolhe ele.
 *
 * O erro estava na segunda vez. Como a variável já estava preenchida, a
 * preferência gravada nunca mais era consultada — e o padrão recém-criado não
 * existia na nuvem, então caía-se em `Object.keys(LOCAIS)[0]`, que não é "o
 * primeiro lugar" por critério nenhum: é a ordem em que as chaves entraram no
 * objeto. O usuário abria o app num lugar que nunca escolheu.
 *
 * Quatro coisas precisam continuar valendo:
 *
 *  1. A PREFERÊNCIA GRAVADA VENCE, sempre que o lugar ainda existir. Só o toque do
 *     usuário escreve essa chave.
 *  2. A NUVEM CHEGANDO DEPOIS NÃO ATROPELA a escolha — é o bug do relato.
 *  3. O PALPITE NÃO GRAVA. Se o último degrau decidisse e persistisse, a escolha do
 *     usuário seria apagada e o erro viraria permanente.
 *  4. LUGAR APAGADO NÃO TRAVA O APP: ele abre em algum lugar, sempre.
 *
 * Rodar: node test_local_ativo.js
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

var LS={};
var ctx={
  console:console, String:String, Object:Object, Array:Array, JSON:JSON,
  localStorage:{
    getItem:function(k){ return Object.prototype.hasOwnProperty.call(LS,k)?LS[k]:null; },
    setItem:function(k,v){ LS[k]=String(v); },
    removeItem:function(k){ delete LS[k]; }
  },
  LOCAL_ATIVO_KEY:'iracema-local-ativo',
  HOME_LOCAL:'iracemapolis',
  LOCAIS:null
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([pega('_localAtivoSalvo'), pega('_resolveLocalAtivo')].join('\n'), ctx);

/* Os lugares reais do usuário. A ordem das chaves é a ordem de criação — e
   "picolini" ser a primeira é exatamente o acidente que causava o relato. */
function nuvem(){
  return {picolini:{nome:'Picolini'}, sitio:{nome:'Sítio'}, fazenda:{nome:'Fazenda Nova'}};
}

console.log('\n--- O BUG DO RELATO: a nuvem chega depois e leva o usuário pro Picolini ---');
/* Aparelho zerado com a preferência ainda gravada (o logout apaga tudo, mas uma
   instalação nova sobre um cofre offline restaurado chega exatamente assim). */
LS={'iracema-local-ativo':'fazenda'};
ctx.LOCAIS={iracemapolis:{nome:'Local principal'}};      /* 1ª volta: só o padrão existe */
var passo1=ctx._resolveLocalAtivo(null);
eq(passo1, 'iracemapolis', 'na partida, sem os lugares reais, abre no padrão');
ctx.LOCAIS=nuvem();                                       /* 2ª volta: a nuvem chegou */
var passo2=ctx._resolveLocalAtivo(passo1);
eq(passo2, 'fazenda', 'quando a nuvem chega, volta para o lugar que o usuário escolheu');
ck(passo2!=='picolini', 'e NÃO para o primeiro do objeto — que era o Picolini');

console.log('\n--- A preferência gravada vence o que estiver na variável ---');
LS={'iracema-local-ativo':'sitio'};
ctx.LOCAIS=nuvem();
eq(ctx._resolveLocalAtivo('picolini'), 'sitio', 'a escolha do usuário manda');
eq(ctx._resolveLocalAtivo(null), 'sitio', 'inclusive quando não há nada na variável');

console.log('\n--- O palpite não grava ---');
/* Se o último degrau persistisse, a escolha do usuário seria apagada por um
   palpite e o erro viraria permanente — que é como ele se instalava. */
LS={'iracema-local-ativo':'fazenda'};
ctx.LOCAIS={picolini:{nome:'Picolini'}};                  /* a fazenda ainda não chegou */
eq(ctx._resolveLocalAtivo(null), 'picolini', 'sem alternativa, abre no que existe');
eq(LS['iracema-local-ativo'], 'fazenda', 'mas a preferência gravada continua intacta');
ctx.LOCAIS=nuvem();
eq(ctx._resolveLocalAtivo('picolini'), 'fazenda', 'e por isso ela ainda pode ser recuperada depois');

console.log('\n--- Lugar apagado não trava o app ---');
LS={'iracema-local-ativo':'lugar-que-nao-existe-mais'};
ctx.LOCAIS=nuvem();
eq(ctx._resolveLocalAtivo(null), 'picolini', 'preferência morta cai para o primeiro disponível');
eq(ctx._resolveLocalAtivo('sitio'), 'sitio', 'e um ativo válido na sessão vale mais que o palpite');

console.log('\n--- O lugar padrão vem antes do palpite ---');
LS={};
ctx.LOCAIS={picolini:{nome:'Picolini'}, iracemapolis:{nome:'Local principal'}};
eq(ctx._resolveLocalAtivo(null), 'iracemapolis', 'sem preferência, o padrão vence a ordem do objeto');

console.log('\n--- Nada quebra quando não há lugar nenhum ---');
LS={};
ctx.LOCAIS={};
eq(ctx._resolveLocalAtivo(null), undefined, 'sem lugares, devolve indefinido em vez de estourar');
ctx.LOCAIS=null;
eq(ctx._resolveLocalAtivo('x'), 'x', 'e antes de LOCAIS existir, não mexe no que veio');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
