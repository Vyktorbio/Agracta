/* O nome do ativo em inglês na folha de gráficos.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A prancha tem botão PT/EN desde sempre, e o campo `en` de cada tratamento
 * também — só que ele recebia o nome em português. A figura saía "em inglês"
 * com "tebuconazol" no eixo, para um relatório que vai ao registrante.
 *
 * A tentação aqui é a regra morfológica: -ol vira -ole, -ina vira -in. Ela
 * acerta muito e erra calada — "cipermetrina" não é "cipermetrin", é
 * "cypermethrin", com c, f e t trocados no meio da palavra. Nome de ativo errado
 * num relatório de registro é caro e ninguém revisa, porque parece plausível.
 *
 * Por isso é TABELA, e por isso o que não está nela sai em português: nome não
 * traduzido é visivelmente português; nome inventado passa por inglês.
 *
 * Rodar: node test_ativos_ingles.js
 */
var T=require('./vendor/ativos-en-core.js');
var D=require('./vendor/dose-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

console.log('\n--- Os casos que a regra morfológica erraria ---');
eq(T.emIngles('cipermetrina').nome,'cypermethrin','cipermetrina não vira "cipermetrin"');
eq(T.emIngles('clorotalonil').nome,'chlorothalonil','clorotalonil ganha o ch e o th');
eq(T.emIngles('mancozebe').nome,'mancozeb','mancozebe perde o e final');
eq(T.emIngles('acefato').nome,'acephate','acefato vira acephate, não "acefate"');
eq(T.emIngles('clorpirifós').nome,'chlorpyrifos','clorpirifós vira chlorpyrifos');
eq(T.emIngles('malationa').nome,'malathion','malationa vira malathion');

console.log('\n--- E os que ela acertaria, que também têm de sair certos ---');
eq(T.emIngles('tebuconazol').nome,'tebuconazole','tebuconazol → tebuconazole (o caso que motivou isto)');
eq(T.emIngles('azoxistrobina').nome,'azoxystrobin','azoxistrobina → azoxystrobin');
eq(T.emIngles('glifosato').nome,'glyphosate','glifosato → glyphosate');

console.log('\n--- Acento e caixa não atrapalham ---');
eq(T.emIngles('TEBUCONAZOL').nome,'tebuconazole','maiúsculas');
eq(T.emIngles('Clorpirifós').nome,'chlorpyrifos','acento e capitalização');

console.log('\n--- Nome científico não se traduz ---');
var m=T.emIngles('Metarhizium anisopliae');
eq(m.nome,'Metarhizium anisopliae','binômio latino sai igual');
ck(m.traduzido===true && m.cientifico===true,'e é marcado como científico, não como falta de tradução');
ck(T.ehCientifico('Beauveria bassiana'),'reconhece Beauveria bassiana');
ck(!T.ehCientifico('tebuconazol'),'e não confunde um ativo químico com binômio');

console.log('\n--- Sal e éster: traduz a base e recola o sufixo ---');
eq(T.emIngles('glifosato-sal de amônio').nome,'glyphosate-ammonium','sal de amônio');
eq(T.emIngles('glifosato-sal de isopropilamina').nome,'glyphosate-isopropylammonium','sal de isopropilamina');
eq(T.emIngles('glufosinato - sal de amônio').nome,'glufosinate-ammonium','com espaços ao redor do hífen');

console.log('\n--- O arquivo do MAPA às vezes já vem em inglês ---');
var b=T.emIngles('Benzovindiflupyr');
ck(b.traduzido===true && b.jaIngles===true,'reconhece que já está em inglês em vez de avisar falta');

console.log('\n--- REGRA: o que não está na tabela NÃO é inventado ---');
var x=T.emIngles('produto experimental XPTO-2026');
eq(x.nome,'produto experimental XPTO-2026','volta exatamente como entrou');
ck(x.traduzido===false,'e diz que não traduziu');
ck(/tabela/.test(x.motivo),'com o motivo: '+JSON.stringify(x.motivo));
eq(T.emIngles('').nome,'','vazio continua vazio');

console.log('\n--- Texto de mistura: cada ativo por si ---');
var r=T.textoEmIngles('tebuconazol (triazol) (200 g/L) + trifloxistrobina (estrobilurina) (100 g/L)', D);
ck(/tebuconazole/.test(r.texto),'o primeiro ativo foi traduzido');
ck(/trifloxystrobin/.test(r.texto),'o segundo também');
ck(/200 g\/L/.test(r.texto),'e a concentração não foi tocada: '+r.texto.slice(0,70));
ck(r.traduzidos.length===2,'os dois entram na lista do que foi traduzido');
ck(r.semTraducao.length===0,'e nada ficou pendente');

console.log('\n--- Mistura com um ativo desconhecido avisa em vez de calar ---');
r=T.textoEmIngles('tebuconazol (triazol) (200 g/L) + xisdrolina (nova classe) (50 g/L)', D);
ck(/tebuconazole/.test(r.texto),'o conhecido é traduzido');
ck(/xisdrolina/.test(r.texto),'o desconhecido permanece em português');
ck(r.semTraducao.indexOf('xisdrolina')>=0,'e é reportado como sem tradução');

console.log('\n--- A tabela não tem entrada duplicada nem valor vazio ---');
var vals=Object.keys(T.TABELA), ruins=0;
vals.forEach(function(k){ if(!T.TABELA[k] || k!==T.chave(k)) ruins++; });
ck(ruins===0,'as '+vals.length+' entradas estão normalizadas e preenchidas');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
