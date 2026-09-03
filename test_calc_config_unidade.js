/* A configuração GRAVADA tem de ser a mesma que a tela mostrou.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A v182 pôs um seletor mL/L ao lado da capacidade do frasco, justamente porque
 * "1900" digitado pensando em mililitros virava 1.900 L. `_calcCompute` passou a
 * ler esse seletor. `_calcConfigAtual` NÃO.
 *
 * O estrago não aparece na tela — ela continua certa. Aparece onde ninguém
 * confere na hora: `_calcConfigAtual` é o que alimenta a memória de cálculo
 * COPIADA e, pior, a memória GRAVADA dentro da aplicação. Ou seja, a tela dizia
 * "não cabe no frasco" e o registro guardado dizia que cabia, com uma capacidade
 * mil vezes maior. Memória de cálculo que contradiz a tela é pior que memória
 * nenhuma: ela tem cara de prova.
 *
 * Rodar: node test_calc_config_unidade.js
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
var falhas=0,passou=0;
function ck(ok,n){ if(ok){passou++;console.log('  ok    '+n);}else{falhas++;console.log('  FALHA '+n);} }
function perto(a,b,t,n){ ck(a!=null&&Math.abs(a-b)<=t,n+' (obtido '+a+', esperado '+b+')'); }

/* Campos da tela, como o DOM os devolveria. */
var CAMPOS={};
var ctx={
  document:{ getElementById:function(id){ return (id in CAMPOS)?{value:CAMPOS[id]}:null; } },
  _calcSel:{qid:'q1',sid:'s1'},
  window:{BioCalculoCampo:require('./vendor/biocalc-campo-core.js')},
  String:String, Number:Number, Math:Math, isFinite:isFinite, parseFloat:parseFloat, parseInt:parseInt
};
vm.createContext(ctx);
vm.runInContext(pega('_numBR')+'\n'+pega('_calcNum')+'\n'+pega('_calcVal')+'\n'+pega('_calcCapAtualL')+'\n'+pega('_calcConfigAtual'),ctx);

function cfg(cap,un){
  CAMPOS={calcLen:'5', calcWid:'3', calcPlots:'4', calcVol:'3',
          calcDead:'300', calcBottles:'1', calcCap:cap, calcCapUn:un};
  return ctx._calcConfigAtual();
}

console.log('\n--- O seletor de unidade vale para a configuração gravada ---');
perto(cfg('200','mL').capacidadeFrascoL, 0.2, 1e-9, '200 com "mL" selecionado são 0,2 L');
perto(cfg('1900','mL').capacidadeFrascoL, 1.9, 1e-9, '1900 mL são 1,9 L — o caso real do frasco de bancada');
perto(cfg('1,9','L').capacidadeFrascoL, 1.9, 1e-9, '1,9 com "L" selecionado continua 1,9 L');
perto(cfg('20','L').capacidadeFrascoL, 20, 1e-9, '20 L continua 20 L');

console.log('\n--- Sem seletor na tela, número puro continua sendo litros ---');
CAMPOS={calcLen:'5', calcWid:'3', calcPlots:'4', calcVol:'3',
        calcDead:'300', calcBottles:'1', calcCap:'20'};
perto(ctx._calcConfigAtual().capacidadeFrascoL, 20, 1e-9,
      'campo ausente cai em litros (é como todo estudo antigo está gravado)');

console.log('\n--- Capacidade vazia continua sendo "não conferir" ---');
perto(cfg('','mL').capacidadeFrascoL, 0, 1e-9, 'vazio com mL é 0');
perto(cfg('0','L').capacidadeFrascoL, 0, 1e-9, 'zero é 0');

console.log('\n--- O resto da configuração não regrediu ---');
var c=cfg('1900','mL');
perto(c.parcelaComprimento,5,1e-9,'comprimento');
perto(c.parcelaLargura,3,1e-9,'largura');
perto(c.parcelas,4,1e-9,'parcelas');
perto(c.volumeCaldaLHa,3,1e-9,'volume de calda');
perto(c.volumeMortoMl,300,1e-9,'volume morto');
perto(c.frascos,1,1e-9,'frascos');
ck(c.qid==='q1','a quadra vai junto');

console.log('');
if(falhas){ console.log('FALHOU: '+falhas+' de '+(falhas+passou)); process.exit(1); }
console.log('todas as '+passou+' checagens passaram');
