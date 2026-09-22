/* A foto da observação de campo mora no aparelho, com nome dado pelo Agracta.
 *
 * O QUE ESTE TESTE PROTEGE
 *
 *  1. O NOME É DO AGRACTA: Agracta_<local>_<quadra>_<data>_<titulo>_<id>.jpg,
 *     sem acento nem espaço, sem parte inventada quando falta dado.
 *  2. O ARMAZENAMENTO É DO APARELHO: guarda, lista, apaga; recusa o que não é imagem.
 *  3. A NOTA NUNCA CARREGA A FOTO: salvar guarda a imagem no aparelho ANTES e a
 *     nota leva só a etiqueta `fotoLocal`. Sem espaço, a nota não é salva.
 *  4. A MIGRAÇÃO NÃO PERDE FOTO: a antiga (base64 no estado) só sai do estado
 *     DEPOIS de guardada no aparelho; se guardar falhar, fica onde estava.
 *  5. NOTA APAGADA LEVA A FOTO JUNTO, inclusive a apagada em outro aparelho.
 *
 * Rodar: node test_fotos_notas.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const {indexedDB}=require('fake-indexeddb');
const C=require('./vendor/fotos-notas-core.js');
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei a função '+nome+' em app.js');
  let j=i,d=0,viu=false;
  for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}
    else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}
const FOTO='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==';
const espera=()=>new Promise(r=>setTimeout(r,30));
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};

(async()=>{
  /* 1. Nome */
  ok(C.nomeArquivo({local:'Fazenda São João',quadra:'Q 12',data:'2026-09-22T10:00',titulo:'Mancha de ferrugem, canto leste!',id:'note_abc123xyz999'})===
    'Agracta_Fazenda-Sao-Joao_Q-12_2026-09-22_Mancha-de-ferrugem-canto-leste_abc123xy.jpg','nome completo');
  ok(C.nomeArquivo({titulo:'Sem quadra',id:'note_1'})==='Agracta_Sem-quadra_1.jpg','parte que falta some do nome');
  ok(C.nomeArquivo({id:'note_1',tipo:'image/png'})==='Agracta_1.png','extensão segue o tipo');
  ok(C.nomeArquivo({id:'x',data:'22/09/2026'})==='Agracta_x.jpg','data fora do padrão não entra');
  ok(C.tipoDe(FOTO)==='image/jpeg'&&C.tipoDe('lixo')==='image/jpeg','tipo do dataURL');
  ok(/^[A-Za-z0-9_.-]+$/.test(C.nomeArquivo({local:'Ç/ã\\é:*?"<>|',quadra:'../..',titulo:'a b',id:'z'})),'nome sem caractere perigoso');

  /* 2. Armazenamento */
  const st=C.criar(indexedDB);
  await st.guardar('n1',FOTO,{nome:'Agracta_n1.jpg',em:'2026-09-22'});
  ok((await st.todas()).n1===FOTO,'guarda e lista');
  await assert.rejects(st.guardar('n2','texto qualquer'),/inválida/);n++;
  await st.apagar('n1');
  ok(!(await st.todas()).n1,'apaga');
  assert.throws(()=>C.criar(null));n++;

  /* 3–5. Ligação no app */
  const alertas=[],toasts=[];let salvou=0;
  const ctx={console,String,Array,Object,Date,Promise,Error,JSON,
    window:null,indexedDB,FotosNotasCore:C,
    LOCAIS:{L1:{nome:'Fazenda Boa Vista'}},localAtivo:'L1',
    quadraNome:id=>'Quadra '+id,uid:()=>'novo1',
    findQuadraContaining:()=>'Q1',
    document:{getElementById:id=>({noteTitle:{value:'Lagarta'},noteCategory:{value:'praga'},noteSeverity:{value:'alta'},noteRecommendation:{value:''},noteDescription:{value:''}})[id]||null},
    alert:m=>alertas.push(m),_stxToast:m=>toasts.push(m),
    closeNoteModal(){},toggleScoutingMode(){},renderNotas(){},
    saveNotas(){salvou++;},
    _currentNoteCoords:{lat:-22,lng:-47},_tempPhotoBase64:FOTO,
    NOTAS_CAMPO:[],_delNotas:{}};
  ctx.window=ctx;ctx.ensureNotas=function(){};
  vm.createContext(ctx);
  ['_fotosNotasStore','_fotoNota','_nomeFotoNota','_fotoNotaGuardar','_fotosNotasVerificar','saveNoteForm'].forEach(f=>vm.runInContext(pega(f),ctx));
  vm.runInContext("var _FOTO_NOTA={}, _fotosNotasPronto=false, _fotosNotasRodando=false, _fotosNotasBanco=null;",ctx);

  ctx.saveNoteForm();await espera();
  const nova=ctx.NOTAS_CAMPO[0];
  ok(nova&&nova.id==='note_novo1','nota salva');
  ok(!('foto' in nova),'a nota não carrega a foto');
  ok(nova.fotoLocal&&nova.fotoLocal.nome==='Agracta_Fazenda-Boa-Vista_Quadra-Q1_'+nova.criadoEm+'_Lagarta_novo1.jpg','etiqueta com o nome do Agracta');
  ok((await C.criar(indexedDB).todas()).note_novo1===FOTO,'foto guardada no aparelho');
  ok(ctx._fotoNota(nova)===FOTO,'o app enxerga a foto do aparelho');

  /* Sem espaço: nada é salvo. */
  const cheio={guardar:()=>Promise.reject(Object.assign(Error('cheio'),{name:'QuotaExceededError'})),todas:()=>Promise.resolve({}),apagar:()=>Promise.resolve()};
  vm.runInContext('_fotosNotasBanco=null',ctx);ctx.__cheio=cheio;vm.runInContext('_fotosNotasBanco=__cheio',ctx);
  ctx.uid=()=>'novo2';ctx.saveNoteForm();await espera();
  ok(ctx.NOTAS_CAMPO.length===1,'sem espaço, a nota não é salva');
  ok(/não há espaço/.test(alertas.pop()||''),'e o aviso diz por quê');

  /* Migração que falha deixa a foto onde estava. */
  const antiga={id:'note_velha',titulo:'Velha',criadoEm:'2026-01-02',quadraId:'Q1',localId:'L1',foto:FOTO};
  ctx.NOTAS_CAMPO.push(antiga);
  vm.runInContext('_fotosNotasPronto=true',ctx);
  ctx._fotosNotasVerificar();await espera();
  ok(antiga.foto===FOTO&&!antiga.fotoLocal,'guardar falhou: a foto continua no estado');

  /* Migração que dá certo: guarda primeiro, depois tira do estado. */
  vm.runInContext('_fotosNotasBanco=null;_fotosNotasPronto=false;_FOTO_NOTA={}',ctx);
  salvou=0;ctx._fotosNotasVerificar();await espera();
  ok(!('foto' in antiga)&&antiga.fotoLocal&&/^Agracta_.*_Velha_velha\.jpg$/.test(antiga.fotoLocal.nome),'foto antiga migrada com nome do Agracta');
  ok((await C.criar(indexedDB).todas()).note_velha===FOTO,'foto antiga está no aparelho');
  ok(salvou===1,'estado salvo sem a foto');

  /* Foto antiga chegando de novo do servidor: não duplica, só sai do estado. */
  antiga.foto=FOTO;salvou=0;ctx._fotosNotasVerificar();await espera();
  ok(!('foto' in antiga)&&salvou===1,'foto repetida do servidor sai do estado');

  /* Nota apagada em outro aparelho leva a foto deste. */
  ctx._delNotas.note_velha=Date.now();ctx._fotosNotasVerificar();await espera();
  ok(!(await C.criar(indexedDB).todas()).note_velha,'foto de nota apagada sai do aparelho');

  /* A página do estudo recebe a foto numa CÓPIA; a nota original fica sem ela. */
  ok(/c\.foto=f; return c;/.test(pega('notasDoEstudo')),'notasDoEstudo entrega cópia com a foto');

  /* Nada de foto no caminho que sincroniza. */
  ok(!/foto:_tempPhotoBase64/.test(src),'saveNoteForm não põe a foto na nota');
  ok(/delete _FOTO_NOTA\[noteId\]/.test(pega('deleteNote')),'excluir a nota apaga a foto do aparelho');
  const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
  const v=(html.match(/vendor\/fotos-notas-core\.js\?v=\d+/)||[])[0];
  ok(v&&html.indexOf(v)<html.indexOf('app.js?v='),'motor carregado antes do app');
  ok(sw.indexOf("'./"+v+"'")>=0,'motor no pré-cache com a mesma versão');

  console.log('Fotos das notas: '+n+' verificações — nome, aparelho, nota sem foto, migração e exclusão.');
})().catch(e=>{console.error(e);process.exitCode=1;});
