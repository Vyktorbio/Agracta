/* Chuva depois da aplicação, no app (roadmap §9).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * O proxy faz a conta (test_pos_aplicacao_proxy.py). Aqui está o que só o app
 * pode errar: guardar mal o que foi lido, ou mostrar um número sem as ressalvas
 * que o tornam legível.
 *
 * Cinco coisas precisam continuar valendo:
 *
 *  1. FICA GRAVADA, não recalculada. A leitura muda quando a Ecowitt reprocessa;
 *     num registro BPL vale o que foi lido quando se registrou — e a aplicação
 *     precisa abrir offline, no campo.
 *  2. RECONSULTAR NÃO APAGA: a leitura anterior vira histórico.
 *  3. A HORA DA APLICAÇÃO VAI NA CONSULTA. Sem ela a conta é do dia inteiro, e a
 *     tela tem de DIZER isso — "choveu 12 mm depois de pulverizar" e "choveu
 *     12 mm no dia em que se pulverizou" são frases diferentes.
 *  4. JANELA ABERTA NÃO SE APRESENTA COMO FECHADA. Zero mm em 6 das 48 horas não
 *     é "não choveu depois da aplicação".
 *  5. NUMA BANCADA NÃO CHOVE. Oferecer isso ali seria a §7-bis de novo.
 *
 * Rodar: node test_pos_aplicacao.js
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
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

var pedidos=[], pendentes=[];
function fetchFake(url){
  pedidos.push(url);
  return new Promise(function(res,rej){ pendentes.push({res:res,rej:rej}); });
}
function responde(obj){ pendentes.shift().res({ok:true,json:function(){return Promise.resolve(obj);}}); }
function falha(){ pendentes.shift().rej(new Error('rede')); }
function gira(){ return new Promise(function(r){ setImmediate(function(){ setImmediate(r); }); }); }

var salvou=0, upserts=[], toasts=[], ehLab=false, semEstacao=false;
var ctx={
  console:console, Promise:Promise, Date:Date, String:String, Number:Number, Math:Math,
  JSON:JSON, isFinite:isFinite, Object:Object, Array:Array, setImmediate:setImmediate,
  encodeURIComponent:encodeURIComponent, parseInt:parseInt,
  fetch:fetchFake, NDVI_PROXY:'https://proxy.test', APP_VER:'teste',
  esc:function(v){ return String(v==null?'':v); },
  isoToBR:function(d){ var x=String(d||'').split('-'); return x.length===3?(x[2]+'/'+x[1]+'/'+x[0]):d; },
  save:function(){ salvou++; },
  dbUpsertAplicacao:function(q,s,a){ upserts.push(a.id); },
  _stxToast:function(m){ toasts.push(m); },
  _stationMacForQuadra:function(qid){ return (!semEstacao && qid==='Q1')?'AA:BB':null; },
  isQuadraLab:function(){ return ehLab; },
  openStudyDetail:function(){}
};
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext([
  'var _posSeq=0, _posEstado={}, POS_HORAS_PADRAO=48;',
  pega('posDaAplicacao'), pega('_posChave'), pega('consultarPos'),
  pega('posResumo'), pega('posRessalvas'), pega('posBlocoHtml'), pega('posBuscar')
].join('\n'), ctx);

function monta(hora){
  var ap={id:'ap1', data:'2026-09-03'};
  if(hora) ap.hora=hora;
  ctx.data={ Q1:{estudos:[{id:'s1', codigo:'AGR-2026-11', aplicacoes:[ap], avaliacoes:[], tratamentos:[]}]} };
  return ap;
}
var RESP={horas:48, hora_conhecida:true, completa:true, dias:3, dias_com_leitura:3,
          cobertura_pct:100, dias_sem_leitura:[], chuva_mm:17.0, choveu:true,
          primeira_chuva_horas:3.0, fonte:'ecowitt-historico'};

(async function(){

  console.log('\n--- A hora da aplicação vai na consulta ---');
  var ap=monta('15:00'); pedidos=[];
  ctx.consultarPos('Q1','s1',ap,48,false,function(){});
  await gira();
  ck(pedidos[0].indexOf('/clima/pos')>=0, 'chama /clima/pos');
  ck(pedidos[0].indexOf('mac=AA%3ABB')>=0, 'com a estação da quadra');
  ck(pedidos[0].indexOf('data=2026-09-03')>=0, 'com a data da aplicação');
  ck(pedidos[0].indexOf('hora=15%3A00')>=0, 'e com a HORA — sem ela a conta seria do dia inteiro');
  ck(pedidos[0].indexOf('horas=48')>=0, 'a janela pedida é de 48 h');
  responde(RESP); await gira();

  console.log('\n--- Fica gravada, não recalculada ---');
  eq(ap.pos.chuvaMm, 17, 'a leitura fica na aplicação');
  eq(ap.pos.horas, 48, 'com a janela que foi lida');
  eq(ap.pos.primeiraChuvaHoras, 3, 'e quando veio a primeira chuva');
  ck(!!ap.pos.ts && !!ap.pos.iso, 'carimbada com o instante da leitura');
  eq(ap.pos.mac, 'AA:BB', 'e com a estação que respondeu');
  ck(salvou>0, 'salvou');
  eq(upserts[0], 'ap1', 'e subiu para o banco');
  var antes=pedidos.length;
  ctx.consultarPos('Q1','s1',ap,48,false,function(){});
  await gira();
  eq(pedidos.length, antes, 'abrir de novo NÃO rebate na estação — a leitura gravada vale');

  console.log('\n--- Reconsultar não apaga: vira histórico ---');
  ctx.consultarPos('Q1','s1',ap,24,true,function(){});
  await gira();
  ck(pedidos[pedidos.length-1].indexOf('horas=24')>=0, 'forçar rebate, agora com 24 h');
  responde({horas:24, hora_conhecida:true, completa:true, dias:2, dias_com_leitura:2,
            cobertura_pct:100, dias_sem_leitura:[], chuva_mm:12.0, choveu:true,
            primeira_chuva_horas:3.0, fonte:'ecowitt-historico'});
  await gira();
  eq(ap.pos.chuvaMm, 12, 'a nova leitura vale');
  eq(ap.posAnteriores.length, 1, 'e a anterior virou histórico');
  eq(ap.posAnteriores[0].chuvaMm, 17, 'com o valor que tinha sido lido antes');

  console.log('\n--- A frase que se lê em voz alta ---');
  eq(ctx.posResumo(ap.pos), '12,0 mm nas 24 h seguintes — a primeira chuva 3,0 h depois',
     'resumo com o total e o quando');
  eq(ctx.posResumo({horas:48, chuvaMm:0, choveu:false, coberturaPct:100, completa:true, horaConhecida:true}),
     'não choveu nas 48 h seguintes', 'não choveu é uma resposta, e é dita assim');
  eq(ctx.posResumo({horas:48, chuvaMm:null, coberturaPct:0}),
     'sem leitura da estação nas 48 h seguintes',
     'sem leitura NÃO vira "não choveu" — seria afirmar o que não se sabe');

  console.log('\n--- As ressalvas acompanham o número, sempre ---');
  eq(ctx.posRessalvas({completa:true, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3}).length, 0,
     'leitura completa e sem falha não precisa de ressalva');
  var rAberta=ctx.posRessalvas({completa:false, horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3});
  eq(rAberta.length, 1, 'janela ainda aberta gera ressalva');
  ck(rAberta[0].indexOf('ainda não fechou')>=0, 'e ela diz que o total é parcial');
  var rSemHora=ctx.posRessalvas({completa:true, horaConhecida:false, coberturaPct:100, diasComLeitura:3, dias:3});
  ck(rSemHora[0].indexOf('DIA INTEIRO')>=0, 'sem hora, a ressalva diz que a conta é do dia inteiro');
  ck(rSemHora[0].indexOf('antes de pulverizar')>=0, 'e que a chuva de antes está incluída');
  var rParcial=ctx.posRessalvas({completa:true, horaConhecida:true, coberturaPct:67, diasComLeitura:2, dias:3});
  ck(rParcial[0].indexOf('2 de 3')>=0, 'cobertura parcial vai nomeada');
  var rMuda=ctx.posRessalvas({completa:true, horaConhecida:true, coberturaPct:0, diasComLeitura:0, dias:3});
  ck(rMuda[0].indexOf('nenhum dia')>=0, 'estação muda o tempo todo é dito com todas as letras');

  console.log('\n--- Chuva nas primeiras horas tropeça em quem lê ---');
  var apL=monta('15:00');
  apL.pos={horas:48, chuvaMm:22, choveu:true, primeiraChuvaHoras:2.5, completa:true,
           horaConhecida:true, coberturaPct:100, diasComLeitura:3, dias:3, ts:Date.now()};
  var htmlL=ctx.posBlocoHtml('Q1','s1',apL);
  ck(htmlL.indexOf('pos-lavou')>=0, 'chuva 2,5 h depois pinta o bloco de alerta');
  ck(htmlL.indexOf('lavagem')>=0, 'e a tela levanta a hipótese de lavagem');
  apL.pos.primeiraChuvaHoras=30;
  ck(ctx.posBlocoHtml('Q1','s1',apL).indexOf('pos-lavou')<0, 'chuva 30 h depois não é alerta de lavagem');

  console.log('\n--- Numa bancada não chove ---');
  ehLab=true;
  var apB=monta('15:00');
  eq(ctx.posBlocoHtml('Q1','s1',apB), '', 'o bloco nem é oferecido na quadra de laboratório');
  var erroLab=null;
  ctx.consultarPos('Q1','s1',apB,48,false,function(r){ erroLab=r; });
  ck(erroLab && !!erroLab.erro, 'e consultar à força é recusado, com motivo');
  ehLab=false;

  console.log('\n--- Sem estação, e sem rede ---');
  var apS=monta('15:00');
  var erroS=null; semEstacao=true;
  ctx.consultarPos('Q1','s1',apS,48,false,function(r){ erroS=r; });
  semEstacao=false;
  ck(erroS && erroS.erro.indexOf('estação')>=0, 'quadra sem estação é recusada com motivo');
  eq(apS.pos, undefined, 'e nada é gravado');
  var apR=monta('15:00');
  var erroR=null;
  ctx.consultarPos('Q1','s1',apR,48,false,function(r){ erroR=r; });
  await gira(); falha(); await gira();
  ck(erroR && !!erroR.erro, 'rede caída vira erro tratado');
  eq(apR.pos, undefined, 'e nada é gravado na aplicação');
  ck(ctx.posBlocoHtml('Q1','s1',apR).indexOf('não consegui')>=0, 'a tela lembra que a última tentativa falhou');

  console.log('\n--- Aplicação sem hora: consulta sem hora, e a tela declara ---');
  var apSH=monta(null); pedidos=[];
  ctx.consultarPos('Q1','s1',apSH,48,false,function(){});
  await gira();
  ck(pedidos[0].indexOf('hora=')<0, 'sem hora na aplicação, nada de hora na consulta');
  responde({horas:48, hora_conhecida:false, completa:true, dias:3, dias_com_leitura:3,
            cobertura_pct:100, dias_sem_leitura:[], chuva_mm:20.0, choveu:true,
            primeira_chuva_horas:null, fonte:'ecowitt-historico'});
  await gira();
  eq(apSH.pos.horaConhecida, false, 'e o registro guarda que a hora não era conhecida');
  ck(ctx.posBlocoHtml('Q1','s1',apSH).indexOf('DIA INTEIRO')>=0, 'a tela diz isso, não esconde');

  console.log('');
  if(f){ console.log('FALHA: '+f+' de '+(f+p)+' checagens'); process.exit(1); }
  console.log('todas as '+p+' checagens passaram');
})();
