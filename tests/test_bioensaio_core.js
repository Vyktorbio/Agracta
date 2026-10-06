/* BioensaioCore: as contas dos bioensaios de bancada, conferidas à mão contra
   as fórmulas publicadas. Rodar: node tests/test_bioensaio_core.js */
var B=require('../vendor/bioensaio-core.js');
var falhas=0, passes=0;
function ck(c,nome){ if(c){passes++;console.log('  ok    '+nome);} else {falhas++;console.log('  FALHA '+nome);} }
function perto(a,b,tol){ return a!=null && b!=null && Math.abs(a-b)<=(tol==null?1e-6:tol); }

console.log('\nEficácia: Abbott (1925) = Schneider-Orelli (1947), Henderson & Tilton (1955)');
ck(perto(B.abbott(80,10),(80-10)/(100-10)*100),'Abbott: (80−10)/(100−10)×100 = 77,78%');
ck(perto(B.abbott('75','5'),73.68421052631578),'aceita texto com vírgula/ponto: 73,68%');
ck(perto(B.abbott(5,10),-5.555555555555555),'tratamento abaixo da testemunha: negativo, não some');
ck(B.abbott(50,100)===null,'testemunha 100%: não existe correção');
ck(B.abbott(null,10)===null,'sem mortalidade: null');
ck(perto(B.hendersonTilton(10,100,90,100),(1-(10*100)/(100*90))*100),'Henderson-Tilton: vivos antes/depois = 88,89%');
ck(B.hendersonTilton(10,0,90,100)===null,'Henderson-Tilton sem contagem prévia: null');
ck(B.hendersonTilton(10,100,90,0)===null,'testemunha sem população na prévia: null (daria 100% para tudo)');

console.log('\nTestemunha (WHO, 2016)');
ck(B.validadeTestemunha(3).estado==='ok','3%: dentro do esperado');
ck(B.validadeTestemunha(10).estado==='corrigir','10%: corrige por Abbott');
ck(B.validadeTestemunha(25).estado==='invalido','25%: acima de 20%, repetir');
ck(B.validadeTestemunha(12,10).estado==='invalido','limite do protocolo (10%) manda');
ck(B.validadeTestemunha(null).estado==='sem','sem testemunha: diz que não dá para julgar');
ck(B.validadeTestemunha(25).refs.indexOf('who2016')>=0,'a regra cita WHO (2016)');

console.log('\nIOBC (Hassan, 1994; Sterk et al., 1999) e efeito total (Overmeer & van Zon, 1982)');
var lab=[[29.9,1],[30,2],[79.9,2],[80,3],[99,3],[99.5,4],[100,4]];
lab.forEach(function(p){ ck(B.iobcClasse(p[0]).classe===p[1],'laboratório '+p[0]+'% → classe '+p[1]); });
var campo=[[24.9,1],[25,2],[50,2],[51,3],[75,3],[76,4]];
campo.forEach(function(p){ ck(B.iobcClasse(p[0],'campo').classe===p[1],'campo '+p[0]+'% → classe '+p[1]); });
ck(B.iobcClasse(85).rotulo==='moderadamente nocivo','rótulo por extenso');
ck(perto(B.efeitoTotal(20,0.5),60),'E = 100 − (100 − 20) × 0,5 = 60%');
ck(B.efeitoTotal(20,-1)===null,'reprodução negativa não existe');

console.log('\nDepósito da Torre de Potter (pesagem)');
var dep=B.depositoPotter('10,0000','10,1150','8,5');
ck(perto(dep.mgCm2,115/(Math.PI*4.25*4.25),1e-9),'115 mg sobre Ø 8,5 cm = '+(dep.mgCm2||0).toFixed(3)+' mg/cm²');
ck(B.depositoPotter(10,9.9,8.5).mgCm2===null,'massa depois menor que antes: recusa com motivo');
ck(B.depositoPotter(10,10.1,null).motivo.indexOf('diâmetro')>=0,'sem diâmetro: diz o que falta');
var al=B.depositoNoAlvo(2.03,1.8,10);
ck(al && !al.dentro && perto(al.desvioPct,(2.03-1.8)/1.8*100),'2,03 contra alvo 1,8 ±10%: fora (+12,8%)');
ck(B.depositoNoAlvo(1.85,1.8,10).dentro,'1,85 contra 1,8 ±10%: dentro');

console.log('\nPlaca: diâmetro em cruz, crescimento, inibição (Vincent, 1947)');
ck(B.diametroMedio(['80','84'])===82,'cruz 80 × 84 → 82 mm');
ck(B.diametroMedio(['80',''])===80,'um eixo só: usa o que tem');
ck(B.crescimento(82,5)===77,'82 − disco de 5 = 77 mm');
ck(B.crescimento(4,5)===0,'menor que o disco: crescimento zero, não negativo');
ck(perto(B.inibicao(80,20),75),'(80 − 20)/80 × 100 = 75%');
ck(B.inibicao(0,20)===null,'testemunha sem crescimento: null');

console.log('\nIVCM (Oliveira, 1991) e taxa radial');
ck(perto(B.ivcm([{dias:1,cresc:10},{dias:2,cresc:25},{dias:3,cresc:40}]),10/1+15/2+15/3),'Σ(D − Da)/N = 22,5');
ck(perto(B.ivcm([{dias:3,cresc:40},{dias:1,cresc:10},{dias:2,cresc:25}]),22.5),'ordem das leituras não muda o IVCM');
var tx=B.taxaRadial([{dias:1,cresc:10},{dias:3,cresc:30},{dias:5,cresc:50}]);
ck(tx && perto(tx.mmDia,5) && perto(tx.r2,1),'raio 5→15→25 mm em 1,3,5 dias: 5 mm/dia, R²=1');
ck(B.taxaRadial([{dias:1,cresc:10}])===null,'um ponto só: sem taxa');

console.log('\nClasse de Edgington et al. (1971)');
[[0.5,1],[1,2],[10,2],[10.5,3],[50,3],[51,4]].forEach(function(p){
  ck(B.classeEdgington(p[0],'ppm').classe===p[1],'CE50 '+p[0]+' ppm → classe '+p[1]);
});
ck(B.classeEdgington(0.3,'mg/L').rotulo==='altamente fungitóxico','mg/L vale como ppm');
var ge=B.classeEdgington(3,'g/ha');
ck(ge && ge.classe===null && /µg\/mL/.test(ge.motivo),'dose de campo (g/ha): não classifica e diz por quê');

console.log('\nMétodo sai do estudo, protocolo com padrões');
ck(B.metodoDoEstudo({tipoEstudo:'Fungo in vitro'},true,'lab')==='placa','Fungo in vitro → placa');
ck(B.metodoDoEstudo({tipoEstudo:'Mortalidade'},true,'lab')==='potter','Mortalidade na bancada → Potter');
ck(B.metodoDoEstudo({tipoEstudo:'Folha destacada'},true,'lab')==='potter','Folha destacada → Potter');
ck(B.metodoDoEstudo({tipoEstudo:'Mortalidade'},true,'granulado')==='','grânulos na arena não é Potter');
ck(B.metodoDoEstudo({tipoEstudo:'Mortalidade'},false,'lab')==='','campo: nenhum');
var pr=B.protocolo({tipoEstudo:'Fungo in vitro',bioensaio:{placa:{placaMm:'60',discoMm:''}}},'placa');
ck(pr.placaMm===60 && pr.discoMm===5 && pr.meio==='BDA' && pr.bordaPct===95,'placa: gravado manda, vazio cai no padrão');
var pp=B.protocolo({arena:{organismosPorUnidade:'10',organismo:'ácaro-rajado',forma:'circular',diametroCm:'5'},bioensaio:{potter:{categoria:'inimigo',moribundoMorto:false}}},'potter');
ck(pp.individuosPorArena===10 && pp.organismo==='ácaro-rajado' && pp.arenaDiametroCm===5,'Potter lê N e organismo da arena (escritos uma vez)');
ck(pp.categoria==='inimigo' && pp.moribundoMorto===false && pp.limiteTestemunha===20,'categoria, moribundo e limite da testemunha');
var vi=B.variaveisIniciais('potter',pp);
ck(vi.length===1 && vi[0].tipo==='razao' && vi[0].N===10 && vi[0].sentido==='maior','Potter nasce com Mortalidade n/N, N=10');
var vp=B.variaveisIniciais('placa',pr);
ck(vp[0].tipo==='numero' && vp[0].sub===2 && vp[0].sentido==='menor','placa nasce com o diâmetro em cruz (2 eixos)');
ck(B.papelDaVariavel('placa','Diâmetro da colônia (mm)')==='diametro','papel: diâmetro da colônia');
ck(B.papelDaVariavel('potter','Mortalidade')==='mortalidade','papel: mortalidade');

console.log('\nResumo da Torre de Potter');
var trats=[{id:'T1',testemunha:true,dose:0},{id:'T2',dose:10},{id:'T3',dose:100}];
function arenas(t,mortos,N){ return mortos.map(function(m,i){ return {tratId:t,rep:i+1,n:m,N:N}; }); }
var rp=B.resumo({metodo:'potter', prot:B.protocolo({arena:{organismosPorUnidade:10},bioensaio:{potter:{categoria:'inimigo'}}},'potter'),
  testemunha:'T1', variavel:'Mortalidade', tratamentos:trats,
  leituras:[
    {avId:'a24',rotulo:'24 HAT',dias:1,parcelas:[].concat(arenas('T1',[0,1,0,1],10),arenas('T2',[7,8,7,8],10),arenas('T3',[10,10,10,9],10))},
    {avId:'a72',rotulo:'72 HAT',dias:3,parcelas:[].concat(arenas('T1',[3,2,3,2],10),arenas('T2',[9,9,8,9],10),[{tratId:'T3',rep:1,n:10,N:''}])}
  ]});
var l24=rp.leituras[0], t2=l24.linhas[1];
ck(perto(l24.testemunhaMort,5),'24 HAT: testemunha 2/40 = 5%');
ck(l24.validade.estado==='ok','24 HAT: testemunha válida');
ck(perto(t2.mortalidade,75) && perto(t2.abbott,(75-5)/95*100),'T2: 30/40 = 75% → Abbott 73,68%');
ck(t2.iobc && t2.iobc.classe===2,'inimigo natural: IOBC classe 2 (levemente nocivo)');
ck(perto(l24.linhas[2].abbott,(97.5-5)/95*100) && l24.linhas[2].iobc.classe===3,'T3: 97,5% → Abbott 97,4% → classe 3');
var l72=rp.leituras[1];
ck(perto(l72.testemunhaMort,25) && l72.validade.estado==='invalido','72 HAT: testemunha 25% → leitura inválida');
ck(rp.avisos.some(function(a){ return /72 HAT/.test(a)&&/repita/.test(a); }),'aviso: repetir o teste');
ck(rp.avisos.some(function(a){ return /sem N/.test(a); }),'arena sem N: fica fora e é avisada');
ck(rp.refs.some(function(x){ return x.chave==='hassan1994'; }) && rp.refs.some(function(x){ return x.chave==='abbott'; }),'referências do resumo incluem Abbott e IOBC');

console.log('\nResumo da placa');
var tp=[{id:'T1',testemunha:true,dose:0},{id:'T2',dose:1},{id:'T3',dose:10}];
function placas(t,cruzes){ return cruzes.map(function(c,i){ return {tratId:t,rep:i+1,sub:c}; }); }
var rpl=B.resumo({metodo:'placa', prot:B.protocolo({bioensaio:{placa:{placaMm:90,discoMm:5}}},'placa'), testemunha:'T1',
  variavel:'Diâmetro da colônia (mm)', tratamentos:tp,
  leituras:[
    {avId:'d2',rotulo:'2 DAT',dias:2,parcelas:[].concat(placas('T1',[[35,37],[36,36]]),placas('T2',[[20,22],[21,21]]),placas('T3',[[5,5],[6,5]]))},
    {avId:'d4',rotulo:'4 DAT',dias:4,parcelas:[].concat(placas('T1',[[65,67],[66,66]]),placas('T2',[[40,42],[41,41]]),placas('T3',[[7,7],[8,7]]))},
    {avId:'d6',rotulo:'6 DAT',dias:6,parcelas:[].concat(placas('T1',[[86,88],[87,87]]),placas('T2',[[60,62],[61,61]]),placas('T3',[[9,9],[10,9]]))},
    {avId:'d8',rotulo:'8 DAT',dias:8,parcelas:[].concat(placas('T1',[[90,90],[92,90]]),placas('T2',[[70,72],[71,71]]),placas('T3',[[11,11],[12,11]]))}
  ]});
var d2=rpl.leituras[0];
ck(perto(d2.linhas[0].diametro,36) && perto(d2.linhas[0].crescimento,31),'testemunha 2 DAT: Ø 36 mm, crescimento 31 mm');
ck(perto(d2.linhas[1].inibicao,(31-16)/31*100),'T2: inibição (31 − 16)/31 = 48,4%');
ck(!d2.testemunhaNaBorda,'2 DAT: testemunha longe da borda');
ck(rpl.fim && rpl.fim.avId==='d6','6 DAT: testemunha em 87 mm ≥ 95% de 90 → fim do ensaio');
ck(rpl.final && rpl.final.avId==='d6','a leitura final é a do fim, não a última anotada');
ck(rpl.avisos.some(function(a){ return /maior que a placa/.test(a); }),'placa com 92 mm numa placa de 90: aviso');
var iv=rpl.porTratamento.T2.ivcm;
ck(perto(iv,(16-0)/2+(36-16)/4+(56-36)/6+(66-56)/8),'IVCM do T2 pela série inteira');
ck(rpl.porTratamento.T2.taxa && rpl.porTratamento.T2.taxa.mmDia>0,'taxa radial do T2 positiva');
ck(rpl.refs.some(function(x){ return x.chave==='vincent1947'; }) && rpl.refs.some(function(x){ return x.chave==='oliveira1991'; }),'referências: Vincent (1947) e Oliveira (1991)');
ck(rpl.refs.every(function(x){ return /\d{4}\.$/.test(x.abnt); }),'toda referência em ABNT termina no ano');

console.log('\n'+passes+' ok, '+falhas+' falha(s)');
process.exit(falhas?1:0);
