/* O modo offline não pode ser porta lateral (relato de campo, 02/09/2026).
 *
 * O QUE ACONTECEU
 *
 * Abrir o Agracta sem internet, num aparelho que nunca entrou, mostrava as 32
 * quadras com culturas, cultivares, plantios, áreas e coordenadas. Sem senha.
 *
 * A causa é uma linha só de authInit():
 *
 *     if(!cloudInit()){ ... cloudStart(); return; }     // abre o app, sem portão
 *
 * E cloudInit() falha justamente quando não há rede. Ou seja: "não consegui
 * verificar quem é você" estava sendo tratado como "pode entrar".
 *
 * O QUE ESTE TESTE GUARDA
 *
 *  1. Aparelho que NUNCA autenticou não abre o app offline. Vê a tela de login, e
 *     com o motivo — portão que aparece sem explicar parece defeito, e defeito é o
 *     que faz alguém procurar a porta dos fundos.
 *  2. Aparelho que JÁ autenticou continua trabalhando offline. É para isso que o
 *     modo offline existe: o técnico que entrou de manhã e passa o dia no talhão.
 *  3. Sair desautoriza o APARELHO, não só a sessão.
 *
 * Rodar: node test_acesso_offline.js
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

var store={}, eventos=[];
function ctxNovo(temNuvem){
  var ctx={
    console:console, Promise:Promise, Date:Date, String:String, Number:Number,
    JSON:JSON, Object:Object, Math:Math, setTimeout:function(fn){ fn(); },
    localStorage:{ getItem:function(k){ return store[k]==null?null:store[k]; },
                   setItem:function(k,v){ store[k]=String(v); },
                   removeItem:function(k){ delete store[k]; } },
    document:{ getElementById:function(){ return null; }, querySelector:function(){ return null; },
               createElement:function(){ return {style:{},appendChild:function(){},querySelector:function(){return null;}}; } },
    esc:function(v){ return String(v==null?'':v); },
    buildAuthGate:function(){ eventos.push('gate:build'); },
    showAuthGate:function(){ eventos.push('gate:show'); },
    hideAuthGate:function(){ eventos.push('gate:hide'); },
    authGateAviso:function(m){ eventos.push('gate:aviso:'+m); },
    cloudStart:function(){ eventos.push('APP:abriu'); },
    cloudResync:function(){},
    cloudInit:function(){ return temNuvem?{}:null; },
    clearLocalStorageData:function(){ eventos.push('dados:limpos'); },
    _appStarted:false, _authUser:null, SB:null, _cloudInitDone:false, _unsavedChanges:false
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext([
    "var AUTH_DISPOSITIVO_KEY='agracta-aparelho-autorizado';",
    pega('authAparelhoMarcar'), pega('authAparelhoAutorizado'),
    pega('authAparelhoQuem'), pega('authAparelhoLimpar'),
    pega('onAuthed'), pega('doLogout'), pega('authInit')
  ].join('\n'), ctx);
  return ctx;
}
function abriu(){ return eventos.indexOf('APP:abriu')>=0; }
function mostrouGate(){ return eventos.indexOf('gate:show')>=0; }

/* ============================================================================== */
console.log('\n--- Aparelho que NUNCA entrou não abre offline ---');
store={}; eventos=[];
var c1=ctxNovo(false);          /* sem rede: cloudInit() devolve null */
c1.authInit();
ck(!abriu(),'o app NÃO abre — era exatamente este o buraco');
ck(mostrouGate(),'a tela de login aparece');
ck(eventos.some(function(e){ return /gate:aviso:.*Sem conexão/.test(e); }),
   'e diz por quê, em vez de parecer defeito');
ck(eventos.some(function(e){ return /entre uma vez com internet/i.test(e); }),
   'explicando o que fazer para poder trabalhar offline depois');

console.log('\n--- Aparelho que JÁ entrou continua trabalhando offline ---');
/* É para isto que o modo offline existe: quem entrou de manhã e passa o dia no
   talhão sem sinal não pode ser travado. */
store={}; eventos=[];
var c2=ctxNovo(true);
c2.onAuthed({uid:'u1', email:'tecnico@agracta.com.br'});
ck(eventos.indexOf('APP:abriu')>=0,'entrar com conta abre o app');
ck(!!store['agracta-aparelho-autorizado'],'e marca o APARELHO como autorizado');

eventos=[];                      /* segundo dia, no campo, sem sinal */
var c3=ctxNovo(false);
c3.authInit();
ck(abriu(),'no dia seguinte, offline, o app abre normalmente');
ck(!mostrouGate(),'sem pedir login de novo');

console.log('\n--- Sair desautoriza o APARELHO, não só a sessão ---');
/* Senão o próximo a abrir offline entraria pela porta que este logout fechou. */
eventos=[];
c3.doLogout();
eq(store['agracta-aparelho-autorizado'],undefined,'a marca do aparelho é apagada');
eventos=[];
var c4=ctxNovo(false);
c4.authInit();
ck(!abriu(),'e depois do logout o app volta a NÃO abrir offline');
ck(mostrouGate(),'mostrando o login');

console.log('\n--- Falha ao LER a sessão usa o mesmo critério ---');
/* Ler a sessão pode falhar por rede. Aparelho autorizado trabalha; aparelho novo
   não entra. "Não consegui verificar" nunca pode virar "pode entrar". */
var trecho=src.slice(src.indexOf('function authInit('));
trecho=trecho.slice(0,trecho.indexOf('\n}\n'));
ck(/authAparelhoAutorizado\(\)/.test(trecho),'authInit consulta a marca do aparelho');
ck((trecho.match(/authAparelhoAutorizado\(\)/g)||[]).length>=2,
   'nos DOIS caminhos: sem cliente de nuvem e falha ao ler a sessão');
ck(!/if\(!cloudInit\(\)\)\{ if\(!_appStarted\)\{ _appStarted=true;[^}]*cloudStart\(\)[^}]*\} return; \}/.test(src),
   'e a linha que abria o app sem portão nenhum não existe mais');

console.log('\n--- O que isto NÃO resolve, dito em voz alta ---');
/* Honestidade sobre o alcance da correção: os dados seguem em localStorage, em
   claro. Quem tem o aparelho desbloqueado e abre o inspetor lê tudo, com portão ou
   sem. Fechar isso exige cifrar o armazenamento local — outra decisão. */
ck(/localStorage, em\s*\n?\s*claro|continuam em localStorage/.test(src),
   'o código registra que o portão não cifra o armazenamento local');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
