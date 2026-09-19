/* O MAPA CONTA O QUE ESTÁ RODANDO — TAMBÉM NO LABORATÓRIO.
 *
 * Relato de uso: "lá no laboratório ainda mostra a bolinha de 6 no mapa, mas
 * eu já finalizei os estudos".
 *
 * A quadra de campo já tinha a regra: o badge do rótulo lê `estudosAtivos`, e
 * ensaio encerrado sai da conta. O laboratório não tem polígono — ele é um
 * pino 🧪 com o nome ao lado — e o número desse pino ficou para trás, somando
 * `data[id].estudos` inteiro. Seis ensaios terminados continuavam pedindo
 * atenção de um lugar onde não há mais nada a fazer.
 *
 * Três coisas deste conserto moram aqui: o número do pino, o mesmo número na
 * ficha do laboratório, e o alerta vermelho — cujo filtro de finalizado tinha
 * se perdido no override v2 do `quadraHasAlert`.
 *
 * Rodar: node test_lab_mapa_finalizados.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');

/* Recorta uma função inteira da fonte, contando chaves. */
function fatia(marca){
  const i=src.indexOf(marca);
  assert.ok(i>=0,'não achei "'+marca+'" em app.js');
  let prof=0,abriu=false,j=src.indexOf('{',i);
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}

const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const estudoFinalizado=s=>!!(s&&s.finalizacao&&s.finalizacao.em);

/* ------------------------------------------------------- 1. o pino no mapa ---
   Roda a função de verdade e lê o HTML que ela entrega ao divIcon. */
function pinoHtml(estudos){
  let html=null;
  const marcador={on(){return marcador;},addTo(){return marcador;}};
  const ctx={ console, String, Number, Math, Object, Array,
    esc, estudoFinalizado,
    data:{LAB1:{tipo:'lab',estudos:estudos,ponto:[-21.1,-47.8]}},
    quadraPonto:()=>[-21.1,-47.8],
    quadraNome:()=>'Lab. Entomologia',
    estudosAtivos:qid=>((ctx.data[qid]||{}).estudos||[]).filter(s=>!estudoFinalizado(s)),
    editMode:false, editId:null, scoutingModeActive:false, _measure:null,
    _qLayer:{}, selectQuadra(){}, showD(){}, _touchQGEO(){}, saveQGEO(){}, save(){},
    LF:{ marker(){return marcador;},
         divIcon(o){ html=o.html; return o; } }
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext('var renderQuadraLab;\n'+fatia('function renderQuadraLab(id){'),ctx);
  ctx.renderQuadraLab('LAB1');
  assert.ok(html!=null,'a função chegou a montar o ícone do pino');
  return html;
}

const findo=n=>({id:'S'+n,codigo:'24-0'+n,finalizacao:{em:'2026-09-01T12:00:00Z',por:'Victor'}});
const seisFinalizados=[1,2,3,4,5,6].map(findo);

const soFim=pinoHtml(seisFinalizados);
assert.match(soFim,/lab-pin-b/,'o pino continua no mapa — o laboratório não some por ter acabado o trabalho');
assert.match(soFim,/Lab\. Entomologia/,'com o nome dele');
assert.ok(!/<b>/.test(soFim),
  'SEIS ENSAIOS FINALIZADOS NÃO SÃO SEIS ENSAIOS: sem nada rodando, o pino não mostra número nenhum');
assert.ok(!/6/.test(soFim),'e muito menos o "6" do relato');

const misto=pinoHtml(seisFinalizados.concat([{id:'S7',codigo:'24-118'},{id:'S8',codigo:'24-119'}]));
assert.match(misto,/<b>2<\/b>/,'com dois rodando no meio dos seis encerrados, o pino diz 2');

const vivos=pinoHtml([{id:'S1',codigo:'24-118'}]);
assert.match(vivos,/<b>1<\/b>/,'e um estudo em andamento continua contando, como sempre contou');

/* ---------------------------------------------------- 2. a ficha do lab ---
   O painel do laboratório dizia "ESTUDOS 6" logo acima de uma lista que já
   contava só os vivos ("ESTUDOS (0)"). Duas contas para o mesmo fato. */
const FICHA=src.slice(src.indexOf("var _lab=isQuadraLab(id)"),
                      src.indexOf("/* ESTUDOS: EM ANDAMENTO PRIMEIRO"));
assert.ok(FICHA.length>400,'achei a ficha da quadra dentro de showD');
const LINHA=FICHA.split('\n').find(l=>l.indexOf('>ESTUDOS<')>=0);
assert.ok(LINHA,'achei a linha do contador de estudos do laboratório');
assert.match(LINHA,/estudosAtivos\(id\)\.length/,
  'a ficha do laboratório conta os EM ANDAMENTO, a mesma conta do pino e da lista abaixo dela');

/* ------------------------------------------------- 3. o alerta vermelho ---
   `quadraHasAlert` é sobrescrito no fim do app.js para usar o motor v2, e o
   override tinha perdido o filtro de finalizado que o original tem. */
const ALERTA=fatia('quadraHasAlert=function(qid){');
assert.match(ALERTA,/estudoFinalizado/,
  'o override v2 do alerta também pula o finalizado — era por ele que a bolinha ficava vermelha');

const ctxA={ console, Array, Object, estudoFinalizado,
  normalizeStudy:s=>s,
  nextEventV2:()=>({ev:{type:'aval'},diff:0}),   /* HOJE, urgente, para todo estudo */
  data:{ LAB1:{estudos:seisFinalizados},
         Q9:{estudos:[{id:'S9',codigo:'24-118'}]} } };
ctxA.window=ctxA; ctxA.globalThis=ctxA;
vm.createContext(ctxA);
vm.runInContext('var quadraHasAlert;\n'+ALERTA+';',ctxA);
assert.equal(ctxA.quadraHasAlert('LAB1'),false,
  'quadra só com ensaio encerrado não alerta — não há o que lançar nem o que fazer');
assert.equal(ctxA.quadraHasAlert('Q9'),true,
  'e a quadra com ensaio rodando e avaliação para hoje alerta, como sempre alertou');

console.log('Laboratório no mapa: o pino conta só o que está rodando, a ficha concorda com ele e ensaio finalizado não pinta alerta OK.');
