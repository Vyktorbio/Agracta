/* Ler a concentração escrita à mão, sem parêntese e sem unidade.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O catálogo do MAPA escreve "nome (grupo) (406 g/L)". Uma planilha de programa
 * de PTAs escreve outra coisa:
 *
 *     Etiprole 70 + Bifentrina 45 + Acido Nonanoico 370 SE
 *     Bifenthrin50+Acido Nonanoico400 EC
 *
 * Sem parêntese, o número colado no nome, e — o que mais importa — SEM UNIDADE.
 * `ativosDe` devolve vazio nesses textos e faz certo: 70 o quê?
 *
 * A REGRA QUE NÃO SE QUEBRA: esta leitura não adivinha a unidade. Supor g/L
 * acertaria quase sempre e erraria calado nas vezes em que fosse g/kg — o tipo
 * de erro que ninguém revisa porque o número parece plausível. Ela lê o que dá e
 * DIZ o que não deu, para a tela poder perguntar.
 *
 * As formas aqui reproduzem a estrutura de uma lista real de PTAs (nomes
 * trocados): mistura de dois e três ativos, número colado, código de formulação
 * no fim, nota entre parênteses no meio.
 *
 * Rodar: node test_concentracao_livre.js
 */
var D=require('./vendor/dose-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

console.log('\n--- Três ativos com espaço e formulação no fim ---');
var r=D.lerConcentracaoLivre('Etiprole 70 + Bifentrina 45 + Acido Nonanoico 370 SE');
eq(r.componentes.length,3,'lê os três');
eq(r.componentes[0].nome,'Etiprole','o primeiro nome');
eq(r.componentes[0].valor,70,'e o valor');
eq(r.componentes[2].nome,'Acido Nonanoico','o terceiro, com nome de duas palavras');
eq(r.formulacao,'SE','a formulação sai do fim');
eq(r.semUnidade,true,'e o texto é marcado como SEM unidade');

console.log('\n--- Número colado no nome, sem espaço ---');
r=D.lerConcentracaoLivre('Bifenthrin50+Acido Nonanoico400 EC');
eq(r.componentes.length,2,'lê os dois');
eq(r.componentes[0].nome,'Bifenthrin','separa nome de número sem espaço');
eq(r.componentes[0].valor,50,'com o valor certo');
eq(r.componentes[1].valor,400,'o segundo idem');
eq(r.formulacao,'EC','formulação EC');

console.log('\n--- Nota entre parênteses no meio não engole o número ---');
r=D.lerConcentracaoLivre('D Limoneno 180 (Ol.Ess.Casca Lar) + Ac nonanoico 300 EC');
eq(r.componentes.length,2,'dois componentes');
eq(r.componentes[0].valor,180,'o valor é encontrado apesar da nota depois dele');
ck(/Ol\.Ess/.test(r.componentes[0].nome),'e a nota fica no nome: '+JSON.stringify(r.componentes[0].nome));

console.log('\n--- Sem código de formulação, não inventa um ---');
r=D.lerConcentracaoLivre('Acetamiprid 120 + Bifenthrin 120 + Ethiprole 164');
eq(r.formulacao,'','formulação vazia');
eq(r.componentes.length,3,'e os três ativos lidos');

console.log('\n--- Com unidade escrita, não pergunta nada ---');
r=D.lerConcentracaoLivre('tebuconazol 200 g/L + trifloxistrobina 100 g/L SC');
eq(r.semUnidade,false,'não está sem unidade');
eq(r.componentes[0].unidade,'g/L','a unidade é lida');
eq(r.formulacao,'SC','e a formulação também');
r=D.lerConcentracaoLivre('mancozebe 750 g/kg WG');
eq(r.componentes[0].unidade,'g/kg','g/kg também');
eq(r.semUnidade,false,'e não pede unidade');

console.log('\n--- Unidade em UM componente só ainda deixa o texto incompleto ---');
r=D.lerConcentracaoLivre('A 100 g/L + B 50');
eq(r.semUnidade,true,'o texto é marcado como incompleto');
eq(r.componentes[0].unidade,'g/L','o que tinha unidade a mantém');
eq(r.componentes[1].unidade,'','e o que não tinha continua sem — nada é herdado');

console.log('\n--- REGRA: a unidade nunca é adivinhada ---');
r=D.lerConcentracaoLivre('Etiprole 70 + Bifentrina 45');
ck(r.componentes.every(function(c){ return c.unidade===''; }),'nenhum componente recebe unidade suposta');

console.log('\n--- Aplicar a unidade reescreve no formato que o app já lê ---');
var novo=D.concentracaoComUnidade('Etiprole 70 + Bifentrina 45 + Acido Nonanoico 370 SE','g/L');
ck(/Etiprole \(70 g\/L\)/.test(novo),'o texto sai no formato com parêntese: '+novo);
var lido=D.ativosDe(novo);
eq(lido.length,3,'e agora o parser oficial lê os três');
eq(lido[0].valor,70,'com os valores preservados');
eq(lido[2].nome===undefined?lido[2].ia:lido[2].ia,'Acido Nonanoico','e os nomes');
ck(lido.every(function(a){ return a.conversivel; }),'todos conversíveis — o equivalente em i.a. passa a sair');

console.log('\n--- Quem já tinha unidade não é reescrito errado ---');
novo=D.concentracaoComUnidade('A 100 g/kg + B 50','g/L');
ck(/A \(100 g\/kg\)/.test(novo),'o componente que declarava g/kg mantém g/kg: '+novo);
ck(/B \(50 g\/L\)/.test(novo),'e só o que estava sem unidade recebe a escolhida');

console.log('\n--- Entrada vazia e degenerada ---');
eq(D.lerConcentracaoLivre('').componentes.length,0,'texto vazio');
eq(D.lerConcentracaoLivre(null).componentes.length,0,'nulo');
eq(D.concentracaoComUnidade('','g/L'),'','sem texto não há o que reescrever');
eq(D.concentracaoComUnidade('A 100','') ,'','sem unidade escolhida, não reescreve');
r=D.lerConcentracaoLivre('só nome nenhum número');
eq(r.componentes.length,1,'texto sem número vira um componente');
eq(r.componentes[0].valor,null,'sem valor, e sem inventar um');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
