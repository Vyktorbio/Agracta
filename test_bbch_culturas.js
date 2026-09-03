/* Fenologia para as culturas que se planta no Brasil.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A v186 tirou a mentira — culturas sem escala própria pararam de receber, em
 * silêncio, os estádios de OUTRA cultura. Mas deixou um buraco: eucalipto,
 * seringueira e companhia ficaram sem nada, e "sem nada" não serve para quem
 * precisa registrar em que estádio aplicou.
 *
 * O que fecha o buraco sem voltar a adivinhar é a ESCALA GERAL da BBCH, que a
 * norma publica exatamente para a planta sem monografia própria. Usá-la não é
 * emprestar o citros para o eucalipto: é usar a escala feita para esse caso.
 *
 * Três níveis, e o teste guarda a distinção entre eles:
 *   propria  monografia da própria cultura
 *   grupo    recorte da norma (cereais de inverno, pomáceas, caroços...)
 *   geral    escala geral, com rótulos genéricos de propósito
 *
 * A REGRA QUE NÃO SE QUEBRA: nenhuma cultura recebe os rótulos de outra
 * cultura. É a regra que a v186 estabeleceu, e há checagem para ela aqui.
 *
 * Rodar: node test_bbch_culturas.js
 */
var B=require('./vendor/bbch-core.js');
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }

function principais(lista){
  var s={}; lista.forEach(function(e){ s[e.code[0]]=1; });
  return Object.keys(s).sort().join('');
}

console.log('\n--- O catálogo de escalas ---');
ck(Object.keys(B.ESCALAS).length>=28,'ao menos 28 escalas ('+Object.keys(B.ESCALAS).length+')');
ck(B.culturas().length>=50,'ao menos 50 culturas mapeadas ('+B.culturas().length+')');

console.log('\n--- A escala geral tem os dez estádios principais ---');
ck(principais(B.GERAL)==='0123456789','a geral cobre 0 a 9 ('+principais(B.GERAL)+')');
ck(B.GERAL.length>=30,'com '+B.GERAL.length+' estádios');
var rotulosGerais=B.GERAL.map(function(e){return e.label;}).join(' ');
ck(!/trifoliolada|espiga|capítulo|cacho|tubérculo|bandeira/i.test(rotulosGerais),
   'e nenhum rótulo dela é específico de uma cultura');

console.log('\n--- As grandes culturas têm escala PRÓPRIA ---');
['Soja','Milho','Cana','Algodão','Feijão','Arroz','Café','Batata','Mandioca',
 'Amendoim','Girassol','Canola','Tomate','Uva','Banana','Abacaxi','Citros'].forEach(function(c){
  var o=B.origemDe(c);
  ck(o && o.nivel==='propria',c+' tem escala própria');
});

console.log('\n--- Os grupos são os da norma, não invenção nossa ---');
[['Trigo','cereais'],['Cevada','cereais'],['Sorgo','cereais'],
 ['Maçã','pomaceas'],['Pera','pomaceas'],
 ['Pêssego','carocos'],['Ameixa','carocos'],
 ['Repolho','brassicas'],['Brócolis','brassicas'],
 ['Cebola','bulbosas'],['Alho','bulbosas'],
 ['Cenoura','raizes'],['Beterraba','raizes'],
 ['Alface','folhosas'],
 ['Melancia','melao'],['Pepino','melao'],
 ['Pimentão','tomate'],['Berinjela','tomate'],
 ['Ervilha','feijao']].forEach(function(p){
  var o=B.origemDe(p[0]);
  ck(o && o.escala===p[1] && o.nivel==='grupo',p[0]+' → grupo '+p[1]);
});

console.log('\n--- As perenes sem monografia usam a GERAL, não a de outra fruteira ---');
['Eucalipto','Seringueira','Erva-mate','Chá','Cacau','Manga','Mamão','Coco',
 'Maracujá','Abacate','Goiaba','Caqui','Dendê','Açaí','Fumo','Mamona'].forEach(function(c){
  var o=B.origemDe(c);
  ck(o && o.escala==='geral' && o.nivel==='geral',c+' usa a escala geral');
});

console.log('\n--- REGRA: ninguém recebe os rótulos de OUTRA cultura ---');
/* Um rótulo específico só pode aparecer na cultura (ou grupo) a que pertence.
   "Fruto colhido" do citros não pode reaparecer sob eucalipto. */
/* `feijao` também é trifoliolada — Phaseolus tem folha de três folíolos como a
   soja. A checagem apontou e a botânica confirmou: a lista é que estava curta. */
var marcas=[['trifoliolada',['soja','feijao']],['espiga',['cereais','milho']],
            ['capítulo',['girassol']],['tubérculo',['batata']],
            ['folha bandeira',['cereais','arroz']],['ginóforo',['amendoim']],
            ['capucha',['uva']],['síliqua',['canola','brassicas']],
            ['perfilho',['cereais','arroz','pastagem','geral']],
            ['pseudocaule',['banana']],['maniva',['mandioca']]];
var vazou=0;
marcas.forEach(function(m){
  Object.keys(B.ESCALAS).forEach(function(k){
    if(m[1].indexOf(k)>=0) return;
    var txt=B.ESCALAS[k].map(function(e){return e.label;}).join(' ');
    if(new RegExp(m[0],'i').test(txt)){ vazou++; console.log('        vazou "'+m[0]+'" na escala '+k); }
  });
});
ck(vazou===0,'nenhum rótulo específico vazou para escala alheia');

console.log('\n--- O nível vem escrito, para a tela poder dizer ---');
var og=B.origemDe('Eucalipto');
ck(/geral/i.test(og.rotulo),'a geral se identifica: '+JSON.stringify(og.rotulo));
ck(og.nota.length>20,'e explica que os rótulos são genéricos');
var ogr=B.origemDe('Trigo');
ck(/grupo|norma/i.test(ogr.rotulo),'o grupo se identifica: '+JSON.stringify(ogr.rotulo));
ck(B.origemDe('Soja').nota==='','escala própria não tem nota — nada a explicar');

console.log('\n--- Consulta de estádio ---');
ck(B.infoDe('Trigo','21').fase==='Perfilhamento','trigo 21 é perfilhamento');
ck(B.infoDe('Batata','45').fase==='Tuberização','batata 45 é tuberização');
ck(B.infoDe('Uva','81').label.indexOf('véraison')>=0,'uva 81 é véraison');
ck(B.infoDe('Eucalipto','65').fase==='Floração','eucalipto 65 é floração pela escala geral');
ck(B.infoDe('Soja','99')!=null,'código existente é encontrado');
ck(B.infoDe('Soja','44')===null,'código inexistente devolve nulo, não um palpite');
ck(B.listaDe('Quiabo')===null,'cultura fora do mapa continua sem escala');
ck(B.origemDe('')===null,'cultura vazia não tem origem');

console.log('\n--- Todo estádio de todas as escalas é bem formado ---');
var ruins=0, tot=0;
Object.keys(B.ESCALAS).forEach(function(k){
  var vistos={};
  B.ESCALAS[k].forEach(function(e){
    tot++;
    if(!/^\d{2}$/.test(e.code)||!e.label||!e.fase) ruins++;
    if(vistos[e.code]) { ruins++; console.log('        código repetido '+e.code+' em '+k); }
    vistos[e.code]=1;
  });
});
ck(ruins===0,tot+' estádios, nenhum malformado nem repetido');

console.log('\n--- Toda escala referenciada pelo mapa existe ---');
var orfas=B.culturas().filter(function(c){ return !B.listaDe(c); });
ck(orfas.length===0,'nenhuma cultura aponta para escala inexistente'+(orfas.length?(': '+orfas.join(', ')):''));

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
