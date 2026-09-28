/* FotosCore: as fotos organizadas como o ensaio (parcela × avaliação).
   Rodar: node test_fotos_core.js */
var F=require('./vendor/fotos-core.js');
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }

console.log('\nfoto nova já identificada');
var f=F.novaFoto({tratamento:'T2',rep:1,parcela:'B1',avaliacao:'av2',data:'2026-09-10',hora:'08:12',momento:'7 DAA',autor:'Ana',agora:'2026-09-10T11:12:00Z'});
ck(f.treatment==='T2' && f.rep===1 && f.plot==='B1' && f.assessment==='av2','tratamento, repetição, parcela e avaliação vêm do app, sem formulário');
ck(f.date==='2026-09-10' && f.hora==='08:12' && f.momento==='7 DAA' && f.autor==='Ana' && f.origem==='app','data, hora, momento e autor');
ck(typeof f.id==='string' && f.id.length>6 && f.createdAt==='2026-09-10T11:12:00.000Z','id e carimbo de criação');
var g=F.novaFoto({tratamento:'T1',rep:2});
ck(g.plot==='T1R2' && /^\d{4}-\d{2}-\d{2}$/.test(g.date),'sem parcela nomeada: T1R2; sem data: hoje');

console.log('\ncontagem por parcela');
var fotos=[
  {id:'a',treatment:'T1',rep:1,assessment:'av1',date:'2026-09-03',createdAt:'2026-09-03T10:00:00Z'},
  {id:'b',treatment:'T1',rep:1,assessment:'av2',date:'2026-09-10',createdAt:'2026-09-10T10:00:00Z'},
  {id:'c',treatment:'T1',rep:1,assessment:'av2',date:'2026-09-10',createdAt:'2026-09-10T10:05:00Z'},
  {id:'d',treatment:'T2',rep:1,assessment:'av2',date:'2026-09-10',createdAt:'2026-09-10T10:10:00Z'},
  {id:'e',treatment:'T2',rep:2,assessment:'',date:'2026-08-30',createdAt:'2026-08-30T09:00:00Z',plot:'B2'},
  {id:'z',treatment:'T9',rep:1,assessment:'av1',date:'2026-09-03',createdAt:'2026-09-03T12:00:00Z',plot:'X9'}
];
var c2=F.contagem(fotos,'av2');
ck(c2.T1R1===2 && c2.T2R1===1 && !c2.T2R2,'nesta avaliação: T1R1 2, T2R1 1');
var ct=F.contagem(fotos,null);
ck(ct.T1R1===3 && ct.T2R2===1,'em todas as leituras: T1R1 3');
var dp=F.daParcela(fotos,'T1',1);
ck(dp.map(function(x){ return x.id; }).join()==='a,b,c','fotos da parcela em ordem de tempo');

console.log('\nmatriz parcela × avaliação');
var parcelas=[{tratamento:'T1',rep:1,parcela:'A1',produto:'Testemunha'},{tratamento:'T2',rep:1,parcela:'A2',produto:'Produto X'},
              {tratamento:'T1',rep:2,parcela:'B1'},{tratamento:'T2',rep:2,parcela:'B2'}];
var avs=[{id:'av2',data:'2026-09-10',rotulo:'7 DAA',ordem:1},{id:'av1',data:'2026-09-03',rotulo:'0 DAA',ordem:0}];
var M=F.matriz(fotos,parcelas,avs);
ck(M.colunas.map(function(c){ return c.id; }).join()==='data:2026-08-30,av1,av2','colunas no tempo; foto antiga sem avaliação vira coluna da sua data');
ck(M.colunas[0].rotulo==='30/08/2026 · sem avaliação' && M.colunas[1].rotulo==='0 DAA','rótulos: momento da avaliação; data para a avulsa');
var l0=M.linhas[0];
ck(l0.parcela==='A1' && l0.celulas[2].fotos.length===2 && l0.celulas[1].fotos[0].id==='a','A1: 1 foto em 0 DAA e 2 em 7 DAA, na ordem do campo');
ck(M.linhas[3].celulas[0].fotos[0].id==='e','a foto avulsa de B2 está na coluna da data dela');
var orf=M.linhas.filter(function(l){ return l.orfa; })[0];
ck(orf && orf.tratamento==='T9' && orf.celulas[1].fotos[0].id==='z','foto de tratamento apagado não some: linha "fora do cadastro"');
ck(M.total===6 && M.colunasComFoto===3,'totais do painel');

console.log('\nlegenda e arquivo');
var ctx={tratamentos:[{id:'T2',produto:'Produto X',dose:'1 L/ha'}],avaliacoes:avs};
var lg=F.legenda({treatment:'T2',rep:1,plot:'A2',assessment:'av2',date:'2026-09-10',hora:'08:12:00'},ctx);
ck(lg==='T2 · Produto X · 1 L/ha · R1 · parcela A2 · 7 DAA · 10/09/2026 08:12','legenda completa: tratamento, dose, repetição, parcela, momento, data e hora');
ck(F.legenda({treatment:'T2',rep:1,date:'2026-09-10'},{tratamentos:[]})==='T2 · R1 · 10/09/2026','sem cadastro: o essencial');
ck(F.nomeArquivo({treatment:'T 2/a',rep:3,date:'2026-09-10',type:'image/png'},4)==='005_T_2_a_R3_2026-09-10.png','nome de arquivo estável e sem caracteres perigosos');

ck(F.legenda({treatment:'T1',rep:2,date:'2026-09-08',medicao:{d1Mm:34.1,d2Mm:34,metodo:'auto'}},{tratamentos:[]})==='T1 · R2 · 08/09/2026 · Ø 34,1 × 34,0 mm (medida na foto)','a colônia medida na foto aparece na legenda, com uma casa');
ck(/tomou a placa\)$/.test(F.legenda({treatment:'T1',rep:1,date:'2026-09-08',medicao:{d1Mm:90,d2Mm:90,metodo:'tomou'}},{})),'e "tomou a placa" quando foi o caso');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
