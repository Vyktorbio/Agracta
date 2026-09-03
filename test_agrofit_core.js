/* O catálogo do Agrofit dentro do app.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Todo item cadastrado à mão é uma chance de errar concentração, titular ou
 * número de registro — os três campos que a folha BPL leva para a auditoria. O
 * catálogo existe para que esses campos venham da fonte oficial em vez da
 * memória de quem digita.
 *
 * Mas um catálogo que preenche demais é pior que catálogo nenhum. Duas regras
 * seguram isso, e este teste existe para elas não se perderem:
 *
 *  1. NÃO ESCOLHE MARCA POR NINGUÉM. Um registro carrega até 19 marcas
 *     comerciais — rótulos diferentes do MESMO registro. Só quem tem a
 *     embalagem na mão sabe qual está usando. Sem marca, `paraItem` recusa e
 *     devolve a lista; não chuta a primeira.
 *  2. NÃO INVENTA CONCENTRAÇÃO. Ela vem do campo do MAPA como está, no formato
 *     que `DoseCore.ativosDe` já lê — inclusive parêntese aninhado e mistura de
 *     dois ativos, que é onde o parser antigo quebrava.
 *
 * Rodar: node test_agrofit_core.js
 */
var fs=require('fs');
var A=require('./vendor/agrofit-core.js');
var D=require('./vendor/dose-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

var cat=A.carregar(JSON.parse(fs.readFileSync('data/agrofit.json','utf8')));

console.log('\n--- O catálogo carrega ---');
ck(!!cat,'o formato compacto expande');
ck(cat.produtos.length>4000,'tem mais de 4.000 registros ('+cat.produtos.length+')');
ck(cat.indice.length>cat.produtos.length,'e mais entradas de busca que registros — marcas múltiplas');
ck(/CC-BY/i.test(cat.fonte),'a procedência CC-BY viaja junto: '+JSON.stringify(cat.fonte.slice(0,40)));

console.log('\n--- Busca por marca, que é o que está no rótulo ---');
var r=A.buscar(cat,'arapoty',{limite:5});
ck(r.length>0 && r[0].marca==='Arapoty','acha pela marca comercial');
ck(r[0].produto.nr==='26824','e chega no registro certo ('+r[0].produto.nr+')');

console.log('\n--- Prefixo vem antes de miolo ---');
r=A.buscar(cat,'glifosato',{limite:6});
ck(r.length>1,'termo comum devolve vários');
ck(A.chave(r[0].marca).indexOf('glifosato')===0,'o primeiro COMEÇA com o termo: '+JSON.stringify(r[0].marca));

console.log('\n--- Acento não atrapalha quem digita sem ---');
r=A.buscar(cat,'Canario',{limite:8});
ck(r.some(function(x){return x.marca==='Canário';}),'"Canario" acha "Canário"');

console.log('\n--- Número de registro é identificador, não palpite ---');
r=A.buscar(cat,'31918',{limite:3});
ck(r.length>0 && r[0].produto.nr==='31918','busca pelo número acha o registro exato');

console.log('\n--- Termo curto demais não devolve o catálogo inteiro ---');
ck(A.buscar(cat,'a',{limite:50}).length===0,'uma letra não busca');
ck(A.buscar(cat,'',{limite:50}).length===0,'vazio não busca');

console.log('\n--- Regra 1: não escolhe marca por ninguém ---');
var multi=cat.produtos.filter(function(p){return p.marcas.length>2;})[0];
ck(!!multi,'existe registro com mais de duas marcas ('+multi.marcas.length+')');
var semMarca=A.paraItem(multi,'');
ck(!!semMarca.erro,'sem marca, RECUSA em vez de chutar a primeira');
ck(Array.isArray(semMarca.marcas)&&semMarca.marcas.length===multi.marcas.length,'e devolve a lista para a pessoa escolher');
var errada=A.paraItem(multi,'Marca Que Não Existe');
ck(!!errada.erro,'marca que não é do registro também é recusada');

console.log('\n--- Registro de marca única pode resolver sozinho ---');
var unico=cat.produtos.filter(function(p){return p.marcas.length===1;})[0];
var it=A.paraItem(unico,'');
ck(!it.erro && it.nome===unico.marcas[0],'com uma marca só, não há escolha a fazer');

console.log('\n--- O item sai com os campos que a BPL cobra ---');
it=A.paraItem(multi,multi.marcas[1]);
ck(it.nome===multi.marcas[1],'nome é a marca escolhida');
ck(it.registro===multi.nr,'registro do MAPA');
ck(it.titular===multi.titular,'titular do registro');
ck(it.formulacao===multi.formulacao,'formulação');
ck(it.situacao==='registrado','situação "registrado" — não é item experimental');
ck(it.sinonimos.length===multi.marcas.length-1,'as outras marcas viram sinônimos');
ck(it.sinonimos.indexOf(multi.marcas[1])<0,'e a escolhida não é sinônimo de si mesma');
ck(it.origem&&it.origem.fonte==='agrofit','a procedência fica gravada no item');

console.log('\n--- Regra 2: a concentração é lida, não inventada ---');
var p31918=A.porRegistro(cat,'31918');
ck(!!p31918,'acha o registro 31918 pelo número');
var ativos=D.ativosDe(p31918.ativos);
ck(ativos.length===2,'o DoseCore lê os DOIS ativos da mistura');
ck(ativos[0].valor===406 && ativos[0].unidade==='g/L','2,4-D 406 g/L');
ck(ativos[1].valor===103.6 && ativos[1].unidade==='g/L','picloram 103,6 g/L — decimal com ponto, como o MAPA publica');

console.log('\n--- Parêntese aninhado do MAPA não derruba o parser ---');
var aninhado=cat.produtos.filter(function(p){return (p.ativos.match(/\(/g)||[]).length>=3;})[0];
ck(!!aninhado,'existe registro com parêntese aninhado');
ck(D.ativosDe(aninhado.ativos).length>0,'e o DoseCore ainda extrai o ativo: '+JSON.stringify(aninhado.ativos.slice(0,60)));

console.log('\n--- Todo produto tem os campos que o cadastro vai usar ---');
var semIA=cat.produtos.filter(function(p){return !p.ativos;}).length;
var semMarcas=cat.produtos.filter(function(p){return !p.marcas.length;}).length;
var semTitular=cat.produtos.filter(function(p){return !p.titular;}).length;
ck(semIA===0,'nenhum registro sem ingrediente ativo');
ck(semMarcas===0,'nenhum registro sem marca comercial');
ck(semTitular===0,'nenhum registro sem titular');

console.log('\n--- Biológico é reconhecido como tipo próprio ---');
var bio=cat.produtos.filter(function(p){return /Biol[oó]gico|Microbiol/i.test(p.classe);})[0];
ck(!!bio && A.paraItem(bio,bio.marcas[0]).tipo==='biologico','agente biológico não entra como "referência" química');

console.log('\n--- A sujeira de codificação do arquivo do MAPA foi limpa ---');
var sujo=cat.produtos.filter(function(p){return /[\x80-\x9f]/.test(p.toxicologica+p.ativos+p.titular);}).length;
ck(sujo===0,'nenhum byte CP1252 solto sobrou no catálogo');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
