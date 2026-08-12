/* Carimbo: a data que aparece é a DO ENSAIO, não a de quem digitou.
 *
 * Registrar hoje uma aplicação feita ontem carimbava — e mostrava — a data e a
 * hora do momento em que se digitou. O clima já vinha certo (é lido pela data do
 * evento), então a folha ficava com um tempo de ontem debaixo de uma data de
 * hoje: a contradição que um auditor pega primeiro.
 *
 * São duas coisas distintas e as duas continuam gravadas:
 *   dataEvento/horaEvento — quando o ensaio aconteceu. É o que vale no relatório.
 *   data/ts               — quando se registrou. Rastreabilidade BPL, imutável.
 *
 * E um terceiro ponto de perda: corrigir a data DEPOIS de salvo não mexia em
 * nada, porque o carimbo só era criado uma vez. O clima ficava o do dia errado.
 *
 * Rodar: node test_carimbo_data_evento.js
 */
var fs=require('fs'),vm=require('vm');
var src=fs.readFileSync('app.js','utf8');

function pega(n){var i=src.indexOf('function '+n+'(');if(i<0)throw new Error('não achei '+n);
 var j=i,d=0,v=false;
 for(;j<src.length;j++){if(src[j]==='{'){d++;v=true}else if(src[j]==='}'){d--;if(v&&d===0){j++;break}}}
 return src.slice(i,j);}

var ctx={console:console,String:String,Date:Date,Number:Number,Math:Math};
vm.createContext(ctx);
vm.runInContext(
  pega('isoToBR')+'\n'+pega('_carimboQuando')+'\n'+pega('_carimboTSV')+'\n'+
  pega('_carimboFind')+'\n'+pega('_carimboSet')+'\n'+pega('_recarimbaEvento')+'\n'+
  /* dublês: o que o navegador daria */
  'var data={},curV=null,curSid=null,salvou=0,pedidos=[],climaResp=null;\n'+
  'function save(){salvou++;}\n'+
  'function document_stub(){}\n'+
  'var document={getElementById:function(){return null;}};\n'+
  'function _carimboClima(qid,d,h,cb){pedidos.push({qid:qid,data:d,hora:h});cb(climaResp);}\n'+
  'function openStudyDetail(){}\n', ctx);

var f=0,p=0;
function ck(c,n){ if(c){p++;console.log('  ok    '+n)}else{f++;console.log('  FALHA '+n)} }

console.log('_carimboQuando — o dia do ensaio, em texto');
ck(ctx._carimboQuando({dataEvento:'2026-08-11',horaEvento:'08:30'})==='11/08/2026 08:30',
   'data + hora do evento');
ck(ctx._carimboQuando({dataEvento:'2026-08-11'})==='11/08/2026',
   'só a data quando não há hora');
ck(ctx._carimboQuando({dataEvento:'2026-08-11',horaEvento:'08:30:00'})==='11/08/2026 08:30',
   'hora com segundos é cortada em HH:MM');
ck(ctx._carimboQuando({data:'12/08/2026 14:02'})==='',
   'carimbo antigo, sem dataEvento: não inventa data a partir do registro');
ck(ctx._carimboQuando({data:'12/08/2026 14:02'},'2026-08-11','07:15')==='11/08/2026 07:15',
   'carimbo antigo recupera a data pelo próprio registro da aplicação');

console.log('_carimboTSV — evento e registro são linhas diferentes');
var tsv=ctx._carimboTSV({data:'12/08/2026 14:02',dataEvento:'2026-08-11',horaEvento:'08:30'});
ck(tsv.indexOf('Evento 11/08/2026 08:30')>=0, 'exporta o evento');
ck(tsv.indexOf('Registrado 12/08/2026 14:02')>=0, 'e mantém o registro, separado');
ck(tsv.indexOf('Evento')<tsv.indexOf('Registrado'), 'o evento vem primeiro');

console.log('_recarimbaEvento — corrigir a data refaz o clima');
function cenario(){
  vm.runInContext(
    'data={Q1:{estudos:[{id:"E1",aplicacoes:[{id:"A1",data:"2026-08-11",hora:"08:30",'+
    'carimbo:{ts:1,data:"12/08/2026 14:02",dataEvento:"2026-08-12",horaEvento:null,'+
    'clima:{fonte:"estacao",temp:31}}}]}]}};'+
    'pedidos=[];salvou=0;climaResp={fonte:"estacao-hora",temp:24.4};', ctx);
}
cenario();
ctx._recarimbaEvento('Q1','E1','A1','apl','2026-08-11','08:30');
var ap=ctx.data.Q1.estudos[0].aplicacoes[0];
ck(ap.carimbo.dataEvento==='2026-08-11', 'dataEvento passa a ser a data corrigida');
ck(ap.carimbo.horaEvento==='08:30', 'horaEvento acompanha');
ck(ap.carimbo.data==='12/08/2026 14:02', 'o registro original NÃO é reescrito (BPL)');
ck(ap.carimbo.ts===1, 'nem o ts do registro');
ck(ctx.pedidos.length===1 && ctx.pedidos[0].data==='2026-08-11' && ctx.pedidos[0].hora==='08:30',
   'o clima é buscado de novo, pela data e hora do ensaio');
ck(ap.carimbo.clima && ap.carimbo.clima.temp===24.4, 'e o clima do dia errado é substituído');
ck(ap.carimbo.eventoRevisadoEm>0, 'fica registrado que o evento foi revisado');

console.log('_recarimbaEvento — sem mudança, não mexe em nada');
cenario();
ctx._recarimbaEvento('Q1','E1','A1','apl','2026-08-12',null);
ck(ctx.pedidos.length===0, 'data igual à do carimbo não dispara nova busca de clima');
ck(ctx.salvou===0, 'e não escreve à toa');

console.log('');
console.log(p+' ok, '+f+' falha(s)');
process.exit(f?1:0);
