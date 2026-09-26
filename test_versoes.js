/* Histórico de versões no servidor — vendor/versoes-core.js
   O golden test é uma sequência de gravações reais em miniatura: criar,
   alterar, apagar e recriar. Restaurar para antes de cada uma tem de devolver
   EXATAMENTE o estado daquele momento. */
const assert=require('assert/strict');
const fs=require('fs');
const V=require('./vendor/versoes-core.js');
let n=0; function ok(c,m){ assert.ok(c,m); n++; }
function eq(a,b,m){ assert.deepEqual(a,b,m); n++; }
const COL=['estudos','avaliacoes','media'];
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---- mudanças ---- */
let m=V.mudancas({estudos:{A:{x:1}}},{estudos:{A:{x:1}}},COL);
eq(m,[],'nada mudou, nada vai');
m=V.mudancas({estudos:{A:{x:1,y:2}}},{estudos:{A:{y:2,x:1}}},COL);
eq(m,[],'ordem de chave não é mudança');
m=V.mudancas({estudos:{A:{x:1}}},{estudos:{A:{x:2},B:{z:1}}},COL);
eq(m.map(x=>x.acao+':'+x.docId).sort(),['alterar:A','criar:B']);
eq(m.find(x=>x.docId==='A').anterior,{x:1},'o anterior é o que o servidor tinha');
m=V.mudancas({estudos:{A:{x:1}}},{estudos:{}},COL);
eq(m[0].acao,'apagar'); eq(m[0].anterior,{x:1},'apagar guarda o que foi apagado');

/* ---- registro ---- */
let r=V.registro({colecao:'estudos',docId:'A',acao:'criar',anterior:null},7);
eq(r,{rev:7,colecao:'estudos',docId:'A',acao:'criar',anterior:null},'criar vai sem anterior');
r=V.registro({colecao:'media',docId:'F',acao:'alterar',anterior:{d:'x'.repeat(2000)}},8,1000);
ok(r.grande===true && r.anterior===null,'grande demais vira marca, não corte');

/* ---- golden: sequência de gravações ---- */
let servidor={estudos:{},avaliacoes:{},media:{}}, historico=[], estados={};
function grava(rev,novo){
  estados[rev]=clone(servidor);           /* como estava ANTES desta gravação */
  V.mudancas(servidor,novo,COL).forEach(x=>historico.push(V.registro(x,rev)));
  servidor=clone(novo);
}
grava(1,{estudos:{E1:{c:'A'}},avaliacoes:{},media:{}});
grava(2,{estudos:{E1:{c:'B'}},avaliacoes:{V1:{n:{p1:10}}},media:{}});
grava(3,{estudos:{E1:{c:'B'}},avaliacoes:{V1:{n:{p1:12}}},media:{}});
grava(4,{estudos:{},avaliacoes:{V1:{n:{p1:12}}},media:{}});
grava(5,{estudos:{E1:{c:'C'}},avaliacoes:{},media:{}});
for(const rev of [1,2,3,4,5]){
  const res=V.estadoAntesDe(servidor,historico,rev);
  eq(res.flat,estados[rev],'antes da gravação '+rev);
  eq(res.irrecuperaveis,[]);
}
eq(servidor.estudos.E1.c,'C','restaurar não mexe no objeto de entrada');

/* ---- o que não coube é dito ---- */
let h2=[{rev:9,colecao:'media',docId:'F',acao:'alterar',anterior:null,grande:true}];
let res=V.estadoAntesDe({media:{F:{d:'novo'}}},h2,9);
eq(res.irrecuperaveis,[{colecao:'media',docId:'F',rev:9}]);
eq(res.flat.media.F,{d:'novo'},'fica como está, e isso é dito');

/* ---- agrupamento ---- */
const g=V.porGravacao([
  {rev:2,colecao:'avaliacoes',em:{seconds:100,nanoseconds:0},por:'a@x',porNome:'Ana'},
  {rev:2,colecao:'estudos',em:{seconds:100,nanoseconds:0},por:'a@x'},
  {rev:3,colecao:'avaliacoes',em:{seconds:200,nanoseconds:0},por:'b@x'}]);
eq(g.map(x=>x.rev),[3,2],'mais nova primeiro');
eq(g[1].total,2); eq(g[1].em,100000); eq(g[1].porNome,'Ana');
eq(V.resumo(g[1]),'1 avaliação · 1 estudo');

/* ---- lotes: o dado nunca se separa do seu histórico ---- */
const pares=[]; for(let i=0;i<300;i++) pares.push([{id:'d'+i,bytes:10},{id:'h'+i,bytes:10}]);
const L=V.lotes(pares,450,1e9);
ok(L.length===2,'600 escritas em 2 lotes');
L.forEach(l=>{ ok(l.length<=450); ok(l.length%2===0,'par inteiro no lote'); });
const L2=V.lotes([[{bytes:5e6},{bytes:5e6}],[{bytes:10},{bytes:10}]],450,8e6);
ok(L2.length===2 && L2[0].length===2,'par grande sozinho, sem ser partido');

/* ---- ligação no firebase-sync e nas regras ---- */
/* ---- gravação por campos: só o que mudou sobe, e o histórico ainda volta ---- */
{
  const grande='R'.repeat(5000);
  const A={id:'E1',data:{audit:[1],rub:grande,est:{a:1,b:{x:1}},sai:1}};
  const B={id:'E1',data:{audit:[1,2],rub:grande,est:{a:1,b:{x:2}},novo:'n'}};
  const cs=V.campos(A,B);
  eq(cs.map(x=>x.caminho.join('.')).sort(),['data.audit','data.est.b','data.novo','data.sai'],'só os caminhos que mudaram (até 3 níveis)');
  ok(!cs.some(x=>x.caminho.join('.').includes('rub')),'o campo pesado que não mudou não sobe');
  eq(V.aplicarCampos(A,cs),B,'aplicar os campos no anterior dá exatamente o novo');
  ok(V.bytes(cs.map(x=>x.valor))<500,'o envio é pequeno perto do documento');
  eq(V.campos(A,A),[],'nada mudou, nada sobe');
  eq(V.campos({d:{'':1}},{d:{'':2}}).map(x=>x.caminho),[['d']],'nome de campo inválido: o pai vira folha');
  eq(V.campos({d:{_agractaArray:true,_agractaLength:1,_agractaItems:{0:1}}},{d:{_agractaArray:true,_agractaLength:2,_agractaItems:{0:1,1:2}}}).map(x=>x.caminho),[['d']],'lista codificada vai inteira');
  /* golden: sequência com gravações parciais restaura cada momento exato */
  let srv={estudos:{}}, hist=[], ant={};
  function gp(rev,novo){
    ant[rev]=clone(srv);
    V.mudancas(srv,novo,['estudos']).forEach(m=>{
      if(m.acao==='alterar') m.campos=V.campos(m.anterior,m.novo);
      const r=V.registro(m,rev);
      if(m.acao==='alterar') ok(r.anterior._parcial===true && V.bytes(r.anterior)<V.bytes(m.anterior),'histórico guarda só o anterior dos campos');
      hist.push(JSON.parse(JSON.stringify(r)));   /* ida e volta como o Firestore */
    });
    srv=clone(novo);
  }
  gp(1,{estudos:{E1:A}});
  gp(2,{estudos:{E1:B}});
  gp(3,{estudos:{E1:Object.assign(clone(B),{data:Object.assign(clone(B.data),{audit:[1,2,3]})})}});
  gp(4,{estudos:{}});
  for(const rev of [1,2,3,4]){
    const res=V.estadoAntesDe(srv,hist,rev);
    eq(res.flat,ant[rev],'parcial: antes da gravação '+rev);
    eq(res.irrecuperaveis,[]);
  }
  const orf=V.estadoAntesDe({estudos:{}},[{rev:9,colecao:'estudos',docId:'X',acao:'alterar',anterior:{_parcial:true,campos:[{c:'["a"]',v:1}]}}],9);
  eq(orf.irrecuperaveis.length,1,'parcial sem o documento para desfazer é dito, não inventado');
}
const sync=fs.readFileSync('firebase-sync.js','utf8');
ok(/collectionRef\('historico'\)\.doc\(\)/.test(sync),'o sync grava em historico');
ok(/V\.lotes\(pares\)/.test(sync),'o sync usa os lotes pareados');
ok(/serverTimestamp\(\)/.test(sync.split("reg.em=")[1]||''),'a hora do registro é a do servidor');
ok(!/window\.openCloudHistory=function/.test(sync),'o sync não esconde mais o histórico atrás dos backups locais');
const rules=fs.readFileSync('firestore.rules','utf8');
ok(/match \/historico\/\{registro\}[\s\S]*allow update, delete: if false;/.test(rules),'histórico append-only');
ok(/request\.resource\.data\.em == request\.time/.test(rules),'hora do servidor exigida');
ok(/request\.resource\.data\.por == request\.auth\.token\.email/.test(rules),'autor da sessão exigido');
ok(/collection != 'historico'/.test(rules),'a regra genérica não reabre o histórico');
const app=fs.readFileSync('app.js','utf8');
const tela=app.slice(app.indexOf('function openCloudHistory'),app.indexOf('/* ===================== VERIFICADOR DE INTEGRIDADE'));
ok(!/SB\.rpc/.test(tela),'a tela não chama mais o Supabase');
ok(/AgractaVersoes/.test(tela),'a tela lê o histórico do Firebase');
ok(/function opEscrita/.test(sync)&&/type==='update'/.test(sync),'o sync grava por campos');
ok(/FB\.semParcial=/.test(sync),'recusa do update volta ao documento inteiro');
console.log('Versões: '+n+' verificações — mudanças, registro, golden de restauração, lotes e ligação.');
