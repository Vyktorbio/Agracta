/* BACKUP LOCAL: a rede de segurança tem de pegar o que ela promete pegar.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * `safetyBackup` tira um retrato do aparelho antes de toda ação destrutiva, e a
 * tela promete: "Restaurar guarda o estado atual antes". O retrato, porém,
 * guardava CINCO CAMPOS A MENOS que o exportData() — e os que faltavam eram
 * justamente os que a rede existe para proteger.
 *
 *  1. AS LÁPIDES DE EXCLUSÃO. Apagar uma quadra grava uma lápide (_delQuadras)
 *     num localStorage separado do QGEO, e `quadrasDoLocal` respeita a lápide:
 *     quadra com lápide não aparece, mesmo existindo no QGEO. Como o retrato não
 *     guardava a lápide e a restauração não a desfazia, restaurar um backup de
 *     ANTES da exclusão devolvia a quadra ao QGEO e ela continuava invisível. A
 *     rede não pegava exatamente a ação destrutiva para a qual ela existe.
 *  2. AS NOTAS DE CAMPO. Não estavam no retrato nem na restauração: nota apagada
 *     antes de restaurar não voltava, e nada avisava.
 *  3. A PRÓPRIA REDE PODIA NÃO EXISTIR. `safetyBackup` engolia toda falha e não
 *     devolvia nada; `safetyApply` seguia em frente. Com o aparelho sem espaço,
 *     restaurar trocava um estado por outro SEM VOLTA — o oposto do que o botão
 *     promete.
 *
 * E a trava contra a reincidência: as listas de campos do backup e do exportar
 * têm de continuar IGUAIS. Campo novo em um tem de entrar no outro.
 *
 * Rodar: node test_backup_local.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');

let f=0,p=0;
const ck=(ok,n)=>{ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} };

function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,'não achei a função '+nome);
  let j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}

/* Um aparelho de mentira: localStorage com cota regulável, para poder encher. */
function aparelho(opts){
  opts=opts||{};
  const caixa={}; let cota=opts.cota||1e9;
  const alertas=[];
  const ctx={ console, JSON, Date, Array, Object, Math, String, Number,
    localStorage:{
      getItem:k=>(k in caixa?caixa[k]:null),
      setItem:(k,v)=>{ const tam=Object.keys(caixa).reduce((s,x)=>x===k?s:s+caixa[x].length,0)+v.length;
                       if(tam>cota){ const e=new Error('QuotaExceededError'); e.name='QuotaExceededError'; throw e; }
                       caixa[k]=v; } },
    alert:m=>alertas.push(m),
    /* o estado vivo do aparelho */
    data:{}, QGEO:{}, QGEO_TS:{}, _geo:null, GEOREF_TS:0,
    LOCAIS:{}, QLOCAL:{}, QNOME:{}, QNOME_TS:{}, QLOCAL_TS:{}, LOCAIS_TS:{},
    ITENS:{}, ITENS_TS:{}, _delItens:{}, RZLIB:[],
    NOTAS_CAMPO:[], _delQuadras:{}, _delLocais:{}, _delNotas:{},
    DELN_KEY:'iracema-deln-v1',
    /* as gravações são o que o app faz de verdade; aqui só precisam existir */
    saveQGEO(){}, saveGeoref(){}, saveGeorefTS(){}, saveLocais(){}, saveQLocal(){},
    saveQNome(){}, saveQGEOTS(){}, saveCfgTS(){}, saveItens(){}, saveRZLib(){},
    saveNotas(){}, saveDelTombs(){}, normalizeRZLib:x=>x,
    ensureLocais(){}, ensureCfgTS(){}, ensureItens(){}, ensureNotas(){},
    buildLocalChip(){}, save(){}, render(){}, updateAgendaBadge(){},
    _cloudReplace:false, cota:c=>{cota=c;}, alertas, caixa };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  vm.runInContext([pega('safetySnap'),pega('_safetyCounts'),pega('safetyList'),
                   pega('safetyBackup'),pega('safetyApply')].join('\n'),ctx);
  return ctx;
}

/* ============================================================================ */
console.log('\n--- 1. O retrato guarda as lápides e as notas ---');
let a=aparelho();
a.QGEO={Q1:[[1,2],[3,4],[5,6]]};
a.data={Q1:{estudos:[]}};
a.NOTAS_CAMPO=[{id:'n1',texto:'broca na bordadura'}];
a._delQuadras={Q9:1700000000000};
a._delLocais={L9:1700000000000};
a._delNotas={n9:1700000000000};
a.GEOREF_TS=42;
let snap=a.safetySnap();
ck(Array.isArray(snap.notas_campo)&&snap.notas_campo[0].texto==='broca na bordadura',
   'a nota de campo entra no retrato');
ck(snap._deletedQuadras&&snap._deletedQuadras.Q9===1700000000000,'a lápide da quadra entra');
ck(snap._deletedLocais&&snap._deletedLocais.L9,'a do local também');
ck(snap._deletedNotas&&snap._deletedNotas.n9,'e a da nota');
ck(snap.georefts===42,'e o carimbo do georreferenciamento');

console.log('\n--- 2. A restauração desfaz a exclusão, que é o motivo da rede existir ---');
/* O caso real: a quadra existe, alguém a apaga (some do QGEO e ganha lápide),
   e depois restaura o backup de antes. Antes, a quadra voltava ao QGEO e
   continuava invisível, porque a lápide sobrevivia à restauração. */
a=aparelho();
a.QGEO={Q1:[[1,2],[3,4],[5,6]]}; a.data={Q1:{estudos:[]}}; a._delQuadras={};
a.NOTAS_CAMPO=[{id:'n1',texto:'antes'}];
ck(a.safetyBackup('antes de excluir')===true,'o backup é tirado antes de excluir');
/* a exclusão, como o app faz */
delete a.QGEO.Q1; delete a.data.Q1; a._delQuadras.Q1=Date.now();
a.NOTAS_CAMPO=[];
const guardado=a.safetyList()[0];
ck(a.safetyApply(guardado)===true,'restaurar devolve true');
ck(!!a.QGEO.Q1,'a quadra volta ao QGEO');
ck(!a._delQuadras.Q1,'E A LÁPIDE SAI — senão ela voltaria invisível, e o backup seria de mentira');
ck(a.NOTAS_CAMPO.length===1&&a.NOTAS_CAMPO[0].texto==='antes','a nota de campo volta junto');

console.log('\n--- 2b. E quem a lápide realmente escondia era a quadra de LABORATÓRIO ---');
/* Vale ser exato, porque a diferença muda o tamanho do estrago e eu já errei
   nela uma vez: quadrasDoLocal só consulta a lápide no SEGUNDO laço, o das
   quadras sem geometria. Quadra de campo entra pelo primeiro, por ter polígono
   no QGEO, e volta visível mesmo com a lápide de pé — ali o problema não é a
   tela, é a lápide velha seguir no pacote que sobe para a nuvem. Quadra de
   laboratório mora só no `data` e some de verdade. */
const laco=pega('quadrasDoLocal');
const primeiro=laco.slice(0,laco.indexOf('Object.keys(data)'));
ck(!/\_delQuadras/.test(primeiro),
   'o laço do QGEO (quadra de campo) não consulta a lápide');
ck(/\_delQuadras\[q\]\)\s*return/.test(laco.slice(laco.indexOf('Object.keys(data)'))),
   'e o laço do data (quadra de laboratório) consulta — é lá que ela sumia');

console.log('\n--- 3. Sem conseguir guardar o estado atual, NÃO restaura ---');
a=aparelho();
a.data={Q1:{estudos:[{id:'atual'}]}};
a.safetyBackup('um backup qualquer');
const antes=a.data;
a.cota(80);                                   /* o aparelho enche */
const ok=a.safetyApply({data:{Q1:{estudos:[{id:'do backup'}]}}});
ck(ok===false,'a restauração recusa');
ck(a.data===antes,'e o estado atual fica INTACTO — trocar sem volta é o oposto do que o botão promete');
ck(a.alertas.length===1&&/não teria volta/i.test(a.alertas[0]),
   'e a pessoa é avisada do porquê: '+(a.alertas[0]||'').slice(0,46)+'…');

console.log('\n--- 4. safetyBackup diz a verdade sobre ter guardado ---');
a=aparelho();
ck(a.safetyBackup('cabe')===true,'com espaço, devolve true');
a.cota(10);
ck(a.safetyBackup('não cabe')===false,'sem espaço, devolve false em vez de calar');

console.log('\n--- 5. A poda por cota encolhe até caber, não até dois ---');
/* Cada retrato aqui ocupa ~40 bytes; com cota para dois, o terceiro só entra
   se a poda continuar depois de chegar a dois. */
a=aparelho();
for(let i=0;i<6;i++) a.safetyBackup('n'+i);
const cheia=a.safetyList().length;
ck(cheia===6,'seis backups cabem quando há espaço');
a.cota(JSON.stringify(a.safetyList().slice(-1)).length+40);
ck(a.safetyBackup('o apertado')===true,'com espaço para um só, ainda assim guarda');
ck(a.safetyList().length<cheia,'sacrificando os mais antigos');

console.log('\n--- 6. Valor corrompido não derruba o backup ---');
a=aparelho();
a.localStorage.setItem('iracema-safety','{"nao":"e uma lista"}');
ck(Array.isArray(a.safetyList())&&a.safetyList().length===0,'safetyList devolve lista vazia');
ck(a.safetyBackup('depois do lixo')===true,'e o backup seguinte funciona');

console.log('\n--- 7. Retrato inválido não é aplicado ---');
a=aparelho();
a.data={Q1:{}};
const intacto=a.data;
[null,undefined,{},{data:null},{data:[]},{data:'x'}].forEach(mau=>{
  a.safetyApply(mau);
});
ck(a.data===intacto,'nenhum retrato quebrado substitui o estado');

console.log('\n--- 8. A TRAVA: o backup guarda o mesmo que o exportar ---');
/* É o que impede a reincidência. Os dois tiram o retrato do MESMO estado; se
   um ganha campo e o outro não, a rede volta a ter buraco — e foi exatamente
   assim que os cinco sumiram. O `ts` é só do backup (quando foi tirado) e os
   quatro de cabeçalho são só do arquivo exportado. */
function camposDe(trecho){
  const m=trecho.match(/\{[\s\S]*\}/);
  return [...m[0].matchAll(/^\s{4,6}([A-Za-z_][\w]*)\s*:/gm)].map(x=>x[1]);
}
const noBackup=new Set(camposDe(pega('safetySnap')));
const noExport=new Set(camposDe(pega('exportData')));
['ts'].forEach(x=>noBackup.delete(x));
['_iracema','version','exported'].forEach(x=>noExport.delete(x));
const soNoExport=[...noExport].filter(x=>!noBackup.has(x));
const soNoBackup=[...noBackup].filter(x=>!noExport.has(x));
/* Piso de sanidade: se o recorte parar de achar os campos (alguém reindentou
   o exportData, por exemplo), as duas listas ficariam vazias e a comparação
   passaria dizendo que está tudo igual — igual em nada. */
ck(noExport.size>=15,'o recorte achou mesmo a lista do exportar ('+noExport.size+' campos)');
ck(soNoExport.length===0,'nada que o exportar guarda falta no backup'+
   (soNoExport.length?' (falta: '+soNoExport.join(', ')+')':''));
ck(soNoBackup.length===0,'e nada sobra só no backup'+
   (soNoBackup.length?' (sobra: '+soNoBackup.join(', ')+')':''));

console.log('\n======================================');
console.log('  '+p+' ok, '+f+' falha(s)');
console.log('======================================');
process.exit(f?1:0);
