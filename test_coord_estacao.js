/* Coordenada de estação meteorológica: quando usar e quando avisar.
 *
 * A coordenada de uma estação Ecowitt é digitada por quem instala e costuma
 * ficar no padrão de fábrica. Em agosto/2026, das quatro estações cadastradas,
 * a de Anápolis apontava para Cleveland (EUA), 7.259 km fora, e a de
 * Iracemápolis para a capital paulista, 138 km fora.
 *
 * São duas perguntas diferentes, e este teste guarda as duas:
 *   USAR   — recusa só erro grosseiro (fora do Brasil, > 300 km). A 138 km o
 *            erro no nascer do sol e de ~3,5 min: jogar fora seria pior.
 *   AVISAR — bem antes (> 50 km), porque e erro de cadastro que so o usuario
 *            conserta, e so conserta se alguem contar.
 *
 * A LEITURA do tempo nao depende disso: ela vem pelo MAC do aparelho.
 *
 * Rodar: node test_coord_estacao.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var ctx={Math:Math,Number:Number,isFinite:isFinite,console:console};
vm.createContext(ctx);
function pega(n){var i=src.indexOf('function '+n+'(');var j=i,d=0,v=false;
 for(;j<src.length;j++){if(src[j]==='{'){d++;v=true}else if(src[j]==='}'){d--;if(v&&d===0){j++;break}}}
 return src.slice(i,j);}
vm.runInContext(pega('_kmEntre')+'\n'+pega('_coordDistanciaDoLocal')+'\n'+pega('_coordNoBrasil')+'\n'+pega('_coordPlausivel')+'\n'+pega('_coordSuspeita')+'\nvar LOCAIS=null,localAtivo=null;',ctx);
var f=0,p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n)}else{f++;console.log('  FALHA '+n)} }
console.log('Sem local ativo: julga só pelo Brasil');
ck(ctx._coordPlausivel(-22.58,-47.52)===true,'Iracemápolis real passa');
ck(ctx._coordPlausivel(41.5135,-81.6908)===false,'Cleveland (Anápolis cadastrada) é rejeitada');
ck(ctx._coordPlausivel(-16.32,-48.95)===true,'Anápolis real passa');
ck(ctx._coordPlausivel(null,null)===false,'nulo é rejeitado');
ck(ctx._coordPlausivel('abc',-47)===false,'lixo é rejeitado');
console.log('Com local ativo em Iracemápolis: exige proximidade');
vm.runInContext("LOCAIS={ira:{nome:'Iracemapolis',centro:[-22.658,-47.521]}}; localAtivo='ira';",ctx);
ck(ctx._coordPlausivel(-22.60,-47.50)===true,'estação a poucos km passa');
ck(ctx._coordPlausivel(-23.5304,-46.6536)===true,'capital (138 km) ainda é USADA: erro no sol é ~3,5 min');
ck(ctx._coordSuspeita(-23.5304,-46.6536)===true,'mas 138 km GERA AVISO de cadastro errado');
ck(ctx._coordSuspeita(-22.60,-47.50)===false,'estação perto não gera aviso');
ck(ctx._coordSuspeita(41.5135,-81.6908)===true,'Cleveland gera aviso');
ck(ctx._coordPlausivel(41.5135,-81.6908)===false,'Cleveland segue rejeitada');
console.log('Distância confere');
ck(Math.abs(ctx._kmEntre(-22.5806,-47.5228,-23.5304,-46.6536)-138)<3,'Iracemápolis->capital ~138 km');
ck(Math.abs(ctx._kmEntre(-16.3267,-48.9528,41.5135,-81.6908)-7259)<20,'Anápolis->Cleveland ~7259 km');
console.log('\n'+(f?f+' FALHA(S)':p+' verificações, nenhuma falha.'));
process.exit(f?1:0);
