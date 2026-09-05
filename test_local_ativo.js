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
  LOCAL_ATIVO_NOME_KEY:'iracema-local-ativo-nome',
  quadrasDoLocal:function(id){
    var n=0, Q=ctx.QLOCAL||{};
    Object.keys(Q).forEach(function(q){ if(Q[q]===id) n++; });
    return {length:n};
  },
  HOME_LOCAL:'iracemapolis',
  LOCAIS:null, QGEO:null, QLOCAL:null, data:null, Number:Number
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([pega('_locNorm'), pega('_localAtivoSalvo'), pega('_localAtivoNomeSalvo'),
                 pega('_localPorNomeSalvo'), pega('_localPorEvidencia'), pega('_resolveLocalAtivo'),
                 pega('_localGravaPreferencia'), pega('_localAvisaPalpite')].join('\n'), ctx);
ctx._localAvisou=false;
var TOASTS=[];
ctx._stxToast=function(m,ms){ TOASTS.push({m:m, ms:ms}); };

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
ctx.LOCAIS=nuvem(); ctx.QGEO=null; ctx.QLOCAL=null; ctx.data=null;
/* Sem nenhuma evidência de trabalho, o desempate é por NOME — determinístico e
   explicável. Antes era a ordem das chaves, que é diferente em cada aparelho. */
eq(ctx._resolveLocalAtivo(null), 'fazenda', 'preferência morta cai num critério estável, não na ordem do objeto');
eq(ctx._resolveLocalAtivo('sitio'), 'sitio', 'e um ativo válido na sessão vale mais que o palpite');

console.log('\n--- O lugar padrão vem antes do palpite ---');
LS={};
ctx.LOCAIS={picolini:{nome:'Picolini'}, iracemapolis:{nome:'Local principal'}};
eq(ctx._resolveLocalAtivo(null), 'iracemapolis', 'sem preferência, o padrão vence a ordem do objeto');

console.log('\n--- O RELATO QUE VOLTOU: "por que ele sempre vai pro Picolini?" ---');
/* A correção anterior dependia de HOME_LOCAL ainda existir. Quem APAGOU o
   Iracemápolis original e criou outro no lugar ficou com um id novo: o degrau do
   padrão passou a apontar para um lugar que não existe mais, e a decisão caiu de
   volta no acaso da ordem das chaves — Picolini. O usuário trabalha em
   Iracemápolis todo dia e o app abre noutro lugar, sem explicação. */
LS={};                                            /* preferência perdida no logout */
ctx.LOCAIS={ picolini:{nome:'Picolini'},
             loc123:{nome:'Iracemápolis'},        /* recriado: id novo, não é HOME_LOCAL */
             sitio:{nome:'Sítio'} };
ctx.QLOCAL={ qA:'picolini', qB:'loc123', qC:'sitio' };
ctx.QGEO={ qA:1, qB:1, qC:1 };
ctx.data={ __config:{},
  qA:{estudos:[{_ts:1000}]},
  qB:{estudos:[{_ts:5000}, {_ts:9000}]},          /* onde ele mexeu por último */
  qC:{estudos:[{_ts:2000}]} };
eq(ctx._resolveLocalAtivo(null), 'loc123', 'abre onde o usuário mexeu por último, não no primeiro do objeto');
eq(LS['iracema-local-ativo'], undefined, 'e continua sem gravar: a evidência é palpite, não escolha');
eq(ctx._localMotivo, 'evidencia', 'e o app sabe dizer que foi ele quem escolheu');

console.log('\n--- A escolha do usuário ainda vence a evidência ---');
LS={'iracema-local-ativo':'picolini'};
eq(ctx._resolveLocalAtivo(null), 'picolini', 'quem tocou no nome do lugar manda, mesmo trabalhando mais noutro');
eq(ctx._localMotivo, 'escolha', 'e o motivo é a escolha, não o palpite');

console.log('\n--- A evidência é o carimbo do trabalho, não a quantidade de quadras ---');
LS={};
ctx.QLOCAL={ q1:'picolini', q2:'picolini', q3:'picolini', q4:'loc123' };
ctx.QGEO={ q1:1, q2:1, q3:1, q4:1 };
ctx.data={ q1:{estudos:[{_ts:10}]}, q2:{estudos:[]}, q3:{estudos:[]},
           q4:{estudos:[{_ts:99}]} };
eq(ctx._resolveLocalAtivo(null), 'loc123', 'três quadras paradas não vencem uma quadra em uso');

console.log('\n--- Sem trabalho nenhum, desempata por quadras; depois por nome ---');
ctx.data={ q1:{estudos:[]}, q2:{estudos:[]}, q3:{estudos:[]}, q4:{estudos:[]} };
eq(ctx._resolveLocalAtivo(null), 'picolini', 'sem carimbo de trabalho, ganha quem tem mais quadras');
ctx.QLOCAL={ q1:'picolini', q4:'loc123' }; ctx.QGEO={ q1:1, q4:1 };
ctx.data={ q1:{estudos:[]}, q4:{estudos:[]} };
eq(ctx._resolveLocalAtivo(null), 'loc123', 'empatado em quadras, ganha o primeiro nome em ordem alfabética');

console.log('\n--- A resposta não depende da ordem das chaves ---');
/* O mesmo acervo, com os lugares em outra ordem, tem de dar a mesma resposta:
   é justamente a ordem do objeto que difere de um aparelho para outro. */
LS={};
ctx.QLOCAL={ qA:'picolini', qB:'loc123' }; ctx.QGEO={ qA:1, qB:1 };
ctx.data={ qA:{estudos:[{_ts:1}]}, qB:{estudos:[{_ts:2}]} };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, loc123:{nome:'Iracemápolis'} };
var ordemA=ctx._resolveLocalAtivo(null);
ctx.LOCAIS={ loc123:{nome:'Iracemápolis'}, picolini:{nome:'Picolini'} };
var ordemB=ctx._resolveLocalAtivo(null);
eq(ordemA, ordemB, 'invertida a ordem das chaves, a decisão é a mesma');
eq(ordemA, 'loc123', 'e é a certa nas duas');

console.log('\n--- Acervo estragado não derruba a abertura do app ---');
[null, {}, {q:null}, {q:{estudos:null}}, {q:{estudos:[null]}}, {q:{estudos:[{_ts:'abc'}]}}]
.forEach(function(mau,i){
  ctx.data=mau;
  try{ ck(!!ctx._resolveLocalAtivo(null), 'acervo malformado #'+(i+1)+': o app ainda abre em algum lugar'); }
  catch(e){ ck(false, 'acervo malformado #'+(i+1)+' derrubou: '+e.message); }
});
ctx.QGEO=null; ctx.QLOCAL=null; ctx.data=null;

console.log('\n--- O RELATO NA TERCEIRA VOLTA: o id morreu, a escolha não ---');
/* "ainda vai pro picolini e dá a mensagem". Se a mensagem apareceu, a preferência
   gravada não foi encontrada. As duas rodadas anteriores consertaram quem DECIDE;
   o que estava errado é o que se GRAVA — só o id, que é a parte instável desta
   base. Local apagado e recriado ganha id novo; duplicata fundida faz o id
   perdedor sumir. Nos dois casos a escolha continuava gravada, apontando para
   nada. */
LS={ 'iracema-local-ativo':'iracemapolis-velho',
     'iracema-local-ativo-nome':'Iracemápolis' };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, loc999:{nome:'Iracemápolis'} };
ctx.QLOCAL={ q1:'picolini', q2:'picolini', q3:'loc999' };
ctx.QGEO={ q1:1, q2:1, q3:1 };
ctx.data={ q1:{estudos:[{_ts:9999}]}, q2:{estudos:[]}, q3:{estudos:[{_ts:1}]} };
/* Repare: a evidência apontaria para o Picolini (mexeu por último E mais quadras).
   A escolha do usuário tem de vencer mesmo assim. */
eq(ctx._localPorEvidencia(), 'picolini', 'a evidência de fato apontaria para o Picolini aqui');
eq(ctx._resolveLocalAtivo(null), 'loc999', 'mas o nome guardado resgata a escolha, e ela vence');
eq(ctx._localMotivo, 'escolha', 'e o motivo é escolha, não palpite: a tela não avisa nada');
eq(LS['iracema-local-ativo'], 'loc999', 'o id novo é regravado — o resgate acontece uma vez, não toda abertura');

console.log('\n--- Preferência antiga ganha o nome antes de precisar dele ---');
/* Quem já tinha a preferência gravada tem só o id — era o que existia. O nome é
   anotado na primeira abertura em que o id ainda é válido, que é justamente o
   momento em que dá para saber qual é. */
LS={ 'iracema-local-ativo':'loc999' };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, loc999:{nome:'Iracemápolis'} };
eq(ctx._resolveLocalAtivo(null), 'loc999', 'a preferência antiga continua valendo');
eq(LS['iracema-local-ativo-nome'], 'Iracemápolis', 'e o nome fica anotado para o dia em que o id mudar');
/* E aí o resgate já funciona, mesmo sem a pessoa ter tocado em nada. */
ctx.LOCAIS={ picolini:{nome:'Picolini'}, locNOVO:{nome:'Iracemápolis'} };
eq(ctx._resolveLocalAtivo(null), 'locNOVO', 'trocado o id, o nome anotado resgata sozinho');

console.log('\n--- O nome anotado não sobrescreve o que o usuário guardou ---');
LS={ 'iracema-local-ativo':'picolini', 'iracema-local-ativo-nome':'Iracemápolis' };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, locNOVO:{nome:'Iracemápolis'} };
eq(ctx._resolveLocalAtivo(null), 'picolini', 'id válido manda, como sempre mandou');
eq(LS['iracema-local-ativo-nome'], 'Iracemápolis', 'e o nome já guardado não é reescrito por cima');

console.log('\n--- O resgate por nome ignora acento e caixa ---');
LS={ 'iracema-local-ativo':'morto', 'iracema-local-ativo-nome':'IRACEMAPOLIS' };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, loc999:{nome:'Iracemápolis'} };
eq(ctx._resolveLocalAtivo(null), 'loc999', '"IRACEMAPOLIS" acha "Iracemápolis"');

console.log('\n--- Nome repetido: desempata como a fusão desempata ---');
LS={ 'iracema-local-ativo':'morto', 'iracema-local-ativo-nome':'Iracemápolis' };
ctx.LOCAIS={ locA:{nome:'Iracemápolis'}, locB:{nome:'Iracemápolis'}, picolini:{nome:'Picolini'} };
ctx.QLOCAL={ q1:'locA', q2:'locB', q3:'locB', q4:'picolini' };
eq(ctx._resolveLocalAtivo(null), 'locB', 'entre dois de mesmo nome, vence o que tem mais quadras');

console.log('\n--- O nome não resgata o que não existe ---');
LS={ 'iracema-local-ativo':'morto', 'iracema-local-ativo-nome':'Fazenda que nao existe' };
ctx.LOCAIS={ picolini:{nome:'Picolini'}, sitio:{nome:'Sítio'} };
ctx.QLOCAL={}; ctx.QGEO={}; ctx.data={};
eq(ctx._localPorNomeSalvo(), null, 'nome sem correspondente não inventa lugar');
LS={ 'iracema-local-ativo':'morto' };
eq(ctx._localPorNomeSalvo(), null, 'e sem nome guardado também não');

console.log('\n--- Gravar é conferido, não tentado ---');
ctx.LOCAIS={ loc999:{nome:'Iracemápolis'} };
LS={};
eq(ctx._localGravaPreferencia('loc999'), true, 'gravação normal confirma');
eq(LS['iracema-local-ativo'], 'loc999', 'o id fica guardado');
eq(LS['iracema-local-ativo-nome'], 'Iracemápolis', 'e o nome junto — é ele que resgata depois');
/* Cota cheia / modo privativo: o setItem estoura. Isto era engolido por um
   try/catch vazio, e a pessoa voltava para o lugar errado sem nenhuma pista. */
var setReal=ctx.localStorage.setItem;
ctx.localStorage.setItem=function(){ throw new Error('QuotaExceededError'); };
eq(ctx._localGravaPreferencia('loc999'), false, 'armazenamento recusando devolve false, para a tela poder avisar');
ctx.localStorage.setItem=setReal;
/* Gravação que não estoura mas também não persiste (storage inerte): a leitura
   de volta é o que denuncia. Tem de ser um lugar DIFERENTE do que já está lá —
   regravar o mesmo valor num storage inerte é indistinguível de sucesso, e de
   fato não é problema nenhum. */
ctx.LOCAIS={ loc999:{nome:'Iracemápolis'}, outro:{nome:'Sítio'} };
ctx.localStorage.setItem=function(){};
eq(ctx._localGravaPreferencia('outro'), false, 'gravação que não persiste é falha, não sucesso');
ctx.localStorage.setItem=setReal;
eq(ctx._localGravaPreferencia('outro'), true, 'e volta a funcionar quando o armazenamento volta');

console.log('\n--- Quando o app escolhe sozinho, ele diz ---');
/* Abrir no lugar errado sem falar nada foi o relato duas vezes: a pessoa via o
   app noutro lugar e não tinha como saber por quê nem o que fazer a respeito. */
TOASTS=[]; ctx._localAvisou=false;
ctx.LOCAIS={picolini:{nome:'Picolini'}, loc123:{nome:'Iracemápolis'}};
ctx.localAtivo='loc123'; ctx._localMotivo='evidencia';
ctx._localAvisaPalpite();
eq(TOASTS.length, 1, 'o app avisa que foi ele quem escolheu o lugar');
ck(/Iracemápolis/.test(TOASTS[0].m), 'e diz em qual lugar abriu');
ck(/Toque no nome/.test(TOASTS[0].m), 'e diz como trocar de uma vez por todas');
ck(TOASTS[0].ms > 1900, 'com tempo de leitura maior que o de um "salvo"');
ctx._localAvisaPalpite();
eq(TOASTS.length, 1, 'e avisa UMA vez por sessão, não a cada redesenho da barra');

console.log('\n--- Quem escolheu não recebe aviso ---');
TOASTS=[]; ctx._localAvisou=false; ctx._localMotivo='escolha';
ctx._localAvisaPalpite();
eq(TOASTS.length, 0, 'preferência gravada não gera aviso nenhum');
TOASTS=[]; ctx._localAvisou=false; ctx._localMotivo='padrao';
ctx._localAvisaPalpite();
eq(TOASTS.length, 0, 'nem o lugar padrão declarado');

console.log('\n--- Com um lugar só, não houve escolha a explicar ---');
TOASTS=[]; ctx._localAvisou=false; ctx._localMotivo='evidencia';
ctx.LOCAIS={picolini:{nome:'Picolini'}}; ctx.localAtivo='picolini';
ctx._localAvisaPalpite();
eq(TOASTS.length, 0, 'um lugar só: avisar seria ruído');

console.log('\n--- Nada quebra quando não há lugar nenhum ---');
LS={};
ctx.LOCAIS={};
eq(ctx._resolveLocalAtivo(null), undefined, 'sem lugares, devolve indefinido em vez de estourar');
ctx.LOCAIS=null;
eq(ctx._resolveLocalAtivo('x'), 'x', 'e antes de LOCAIS existir, não mexe no que veio');

console.log('');
if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
console.log('todas as '+p+' checagens passaram');
