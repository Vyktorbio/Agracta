/* O parser de ingrediente ativo contra o catálogo real inteiro.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * Rodar o parser contra os 4.397 registros do MAPA revelou 255 produtos (5,8%)
 * com o ativo mal lido — e 186 deles não devolviam nada. Isso importa porque é
 * esse campo que o catálogo grava em `concentracao` do item, e é dele que sai o
 * equivalente em i.a.
 *
 * Três causas, todas de leitura e nenhuma de aritmética:
 *
 *  1. DECIMAL SEM ZERO À ESQUERDA. O MAPA escreve "(.03 g/L)"; o padrão exigia
 *     dígito antes do ponto e o ativo saía sem nome.
 *  2. NOME COM PARÊNTESE PRÓPRIO. "acetato de (E,Z)-3,8-tetradecadienila" virava
 *     "acetato de", porque o nome era cortado no primeiro parêntese. Agora se
 *     remove UM grupo do FIM, contando parênteses — o que também atravessa o
 *     grupo aninhado "etefom (etileno (precursor de))".
 *  3. UNIDADE BIOLÓGICA. "100 vespas/copo", "80 fêmeas fertilizadas /embalagem".
 *     Não é concentração de massa: não existe grama de i.a. por hectare a partir
 *     dali, e converter produziria um número com cara de resultado. O nome passa
 *     a ser lido — que é o que a folha precisa — e a concentração vem marcada
 *     como não conversível, ficando FORA da conta.
 *
 * Rodar: node test_ativos_parser.js
 */
var fs=require('fs');
var D=require('./vendor/dose-core.js');
var A=require('./vendor/agrofit-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

console.log('\n--- Causa 1: decimal sem zero à esquerda ---');
var r=D.ativosDe('ácido indolacético (Auxinas) (.03 g/L)');
eq(r.length,1,'lê um ativo');
eq(r[0].ia,'ácido indolacético','com o nome inteiro');
eq(r[0].valor,0.03,'e o valor 0,03');
eq(D.ativosDe('x (y) (,5 g/kg)')[0].valor,0.5,'vírgula sem zero também');

console.log('\n--- Causa 2: nome que tem parêntese próprio ---');
r=D.ativosDe('acetato de (E,Z)-3,8-tetradecadienila (acetato insaturado) (1.4 g/kg)');
eq(r[0].ia,'acetato de (E,Z)-3,8-tetradecadienila','o parêntese do nome é preservado');
eq(r[0].valor,1.4,'e a concentração sai certa');
r=D.ativosDe('acetato de (E,Z)-3,8-tetradecadienila (acetato insaturado) (1.4 g/kg) + acetato de (Z)-9-hexadecenila (acetato insaturado) (0.6 g/kg)');
eq(r.length,2,'dois feromônios na mesma receita');
eq(r[1].ia,'acetato de (Z)-9-hexadecenila','o segundo também sai inteiro');

console.log('\n--- O grupo aninhado continua atravessado (regressão da v179) ---');
eq(D.ativosDe('etefom (etileno (precursor de)) (720 g/L)')[0].ia,'etefom','etefom, não "etefom (etileno"');

console.log('\n--- Causa 3: unidade biológica lê o nome mas não vira conta ---');
r=D.ativosDe('Trichogramma galloi (vespas) (100 vespas/copo)');
eq(r[0].ia,'Trichogramma galloi','o nome do agente é lido');
eq(r[0].conversivel,false,'e a concentração é marcada como NÃO conversível');
r=D.ativosDe('Chrysoperla externa (Biológico) (80 fêmeas fertilizadas /embalagem)');
eq(r[0].ia,'Chrysoperla externa','unidade longa com espaço também é reconhecida');
eq(r[0].conversivel,false,'e continua fora da conta');

console.log('\n--- E o equivalente em i.a. RECUSA em vez de inventar ---');
var e=D.equivalentesIA(2,'L/ha','Trichogramma galloi (vespas) (100 vespas/copo)');
ck(!!e.erro,'não calcula equivalente de "vespas/copo"');
ck(/não é massa|vespas/i.test(e.erro),'e diz por quê: '+JSON.stringify(e.erro));
ck(Array.isArray(e.biologicos)&&e.biologicos.length===1,'devolvendo qual ativo é biológico');

console.log('\n--- Mistura de químico com biológico: calcula o que dá, avisa o resto ---');
e=D.equivalentesIA(2,'L/ha','tebuconazol (triazol) (200 g/L) + Bacillus subtilis (bactéria) (1000000 UFC/g)');
ck(!e.erro,'a mistura é calculada');
eq(e.itens.length,1,'só o químico entra na conta');
ck(e.biologicos.length===1,'o biológico é listado à parte');
ck(e.parcial===true,'e o resultado se declara parcial');

console.log('\n--- Nada do que já funcionava mudou ---');
r=D.ativosDe('2,4-D (ácido ariloxialcanóico) (406 g/L) + picloram (ácido piridinocarboxílico) (103.6 g/L)');
eq(r.length,2,'a mistura clássica continua com dois ativos');
eq(r[0].ia,'2,4-D','2,4-D');
eq(r[1].valor,103.6,'picloram 103,6');
ck(r[0].conversivel===true,'e ambos são conversíveis');
r=D.ativosDe('500 g/L');
eq(r.length,1,'formato antigo sem parêntese continua valendo');
eq(r[0].ia,'','sem nome, como sempre foi');
eq(r[0].valor,500,'com o valor certo');
eq(D.ativosDe('70%')[0].valor,70,'porcentagem solta também');
eq(D.ativosDe('').length,0,'texto vazio não inventa ativo');
eq(D.ativosDe('sem concentração nenhuma aqui').length,0,'texto sem número também não');

console.log('\n--- O CATÁLOGO INTEIRO: nenhum produto fica sem ativo ---');
var cat=A.carregar(JSON.parse(fs.readFileSync('data/agrofit.json','utf8')));
var semAtivo=0, semNome=0, bio=0;
cat.produtos.forEach(function(p){
  var a=D.ativosDe(p.ativos);
  if(!a.length){ semAtivo++; return; }
  if(a.some(function(x){ return !x.ia; })) semNome++;
  if(a.some(function(x){ return !x.conversivel; })) bio++;
});
ck(semAtivo===0,'os '+cat.produtos.length+' registros devolvem ao menos um ativo (sem ativo: '+semAtivo+')');
ck(semNome===0,'e nenhum com nome vazio (vazio: '+semNome+')');
ck(bio>150,bio+' produtos biológicos lidos com nome, e todos fora da conta de i.a.');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
