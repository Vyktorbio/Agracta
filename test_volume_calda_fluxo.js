/* Integração do volume confirmado com os textos reais dos tratamentos.
 * Rodar: node test_volume_calda_fluxo.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');
var D=require('./vendor/dose-core.js');
var BC=require('./vendor/biocalc-campo-core.js');

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
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }
function perto(a,b,t,n){ ck(a!=null&&Math.abs(a-b)<=t,n+' (obtido '+a+', esperado '+b+')'); }

var ctx={window:{DoseCore:D},DoseCore:D,String:String,Number:Number,Math:Math,isFinite:isFinite,parseFloat:parseFloat};
vm.createContext(ctx);
vm.runInContext(pega('_numBR')+'\n'+pega('_calcNum')+'\n'+pega('calcVolumeDoTratamento'),ctx);

console.log('\n--- Uma confirmação resolve o protocolo e seus tratamentos ---');
[
  '1,5 L AGUA (TOTAL 3,0 L/HA)',
  '1,5 L AGUA+ASSIST 0,25%vv (total 3,0 L/ha)',
  '2 L Oleo de soja (TOTAL 3,0 L/HA)'
].forEach(function(txt){
  var r=ctx.calcVolumeDoTratamento({volume:txt},3);
  perto(r.valor,3,1e-9,'3 L/ha confirmado concilia "'+txt+'"');
  ck(r.conciliado===true,'  e registra que houve conciliação explícita');
});

console.log('\n--- Divergência continua bloqueada ---');
var ruim=ctx.calcVolumeDoTratamento({volume:'1,5 L (TOTAL 3,0 L/ha)'},150);
ck(ruim.ambiguo===true,'150 L/ha não é aplicado a um texto que declara total 3 L/ha');
ck(ruim.valor==null,'nenhum número é inventado na divergência');

console.log('\n--- Número inequívoco e campo estruturado continuam mandando ---');
perto(ctx.calcVolumeDoTratamento({volume:'200 L/ha'},3).valor,200,1e-9,'volume inequívoco do tratamento');
perto(ctx.calcVolumeDoTratamento({volume:'texto antigo',volumeCaldaLHa:175},3).valor,175,1e-9,'volume estruturado do tratamento');
perto(ctx.calcVolumeDoTratamento({},150).valor,150,1e-9,'ausente herda o volume geral');

console.log('\n--- Golden test do preparo real ---');
var mix=BC.parseComponents('SANKARI + SILWET','1,5 L/ha + 0,033%','L/ha');
var receita=BC.calculateMixture({components:mix.components,carrier:'Água',sprayVolume:3,
  plotLength:5,plotWidth:3,numPlots:4,numBottles:1,deadVolumeMl:300,bottleCapacity:1.9});
perto(receita.sprayTotalMl,318,1e-9,'5×3 m × 4, 3 L/ha e 300 mL morto = 318 mL finais');
perto(receita.components[0].total,159,1e-9,'SANKARI 1,5 L/ha = 159 mL');
perto(receita.components[1].total,0.10494,1e-9,'SILWET 0,033% v/v = 0,10494 mL internamente');
ck(BC.formatAmount(receita.components[1].total,receita.components[1].unit)==='104,94 µL',
   'a tela apresenta o SILWET diretamente como 104,94 µL');
ck(receita.canPrepare===true,'a receita cabe no frasco de 1,9 L e pode ser preparada');

console.log('');
if(falhas){ console.log('FALHA: '+falhas+' de '+(falhas+passou)+' checagens'); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
