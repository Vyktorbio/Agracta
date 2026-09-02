/* Segundo formato de protocolo: mantém o modelo Agracta e acrescenta o
 * Sinergista sem achatar logo, merges ou formatação do arquivo recebido.
 *
 * Rodar: node test_protocolo_sinergista.js
 */
var fs=require('fs'),vm=require('vm'),crypto=require('crypto');
var JSZip=require('./vendor/jszip.min.js'),XLSX=require('./vendor/xlsx.full.min.js');
var src=fs.readFileSync('app.js','utf8');

function pega(nome){
  var i=src.indexOf('function '+nome+'(');if(i<0)throw new Error('não achei '+nome);
  var j=i,d=0,viu=false;for(;j<src.length;j++){
    if(src[j]==='{'){d++;viu=true;}else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}
  }
  return src.slice(i,j);
}
var f=0,p=0;
function ck(ok,n){if(ok){p++;console.log('  ok    '+n);}else{f++;console.log('  FALHA '+n);}}
function eq(a,b,n){ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')'));}
function sha(b){return crypto.createHash('sha256').update(b).digest('hex');}

var ITEMS={it1:{id:'it1',nome:'Synergist X',codigo:'SX-01',tipo:'teste',registro:'RET-123',formulacao:'SC',concentracao:'300 g/L',ativos:'Active A'}};
var study={id:'s1',codigo:'AGR-2026-009',descricao:'Evaluate the efficacy and selectivity of the synergist against Crysodeixis includens in soybean under field conditions.',
  cultura:'Soja',alvo:'Crysodeixis includens',delineamento:'DBC',desenho:'dbc',metodoAplicacao:'co2',metodoPorTratamento:false,
  numAplicacoes:2,intervaloDias:7,numRepeticoes:4,dataInicio:'2026-09-01',testemunha:'T1',
  protocolo:{ret:'RET-fallback',tamanhoParcela:'5 x 3 m',empresa:'Plantec Laboratories',volumeCalda:'150 L/ha'},
  tratamentos:[
    {id:'T1',produto:'Testemunha',dose:'0',testemunha:true},
    {id:'T2',itemId:'it1',produto:'Synergist X',dose:'0,4 L/ha',volume:'150 L/ha',concentracaoAtivo:120,adjuvante:'Silwet'},
    {id:'T3',produto:'Standard',dose:'100 g/ha',volume:'150 L/ha',ingredienteAtivo:'Active B',concentracao:'500 g/kg'}
  ],
  aplicacoes:[{id:'a1',data:'2026-09-01',inicio:{hora:'08:30'}}],
  avaliacoes:[
    {id:'v1',data:'2026-09-02',variaveis:['Eficácia','Fitotoxicidade']},
    {id:'v2',data:'2026-09-08',variaveis:['Produtividade']}
  ]
};
var ctx={console:console,Date:Date,Math:Math,String:String,Number:Number,Object:Object,Array:Array,JSON:JSON,
  parseInt:parseInt,parseFloat:parseFloat,isFinite:isFinite,data:{Q1:{cultura:'Milho',alvo:'outro',estudos:[study]}},
  normalizeStudy:function(s){return s;},studyCultura:function(s,q){return s.cultura||q.cultura||'';},
  studyTestemunha:function(s){return s.testemunha||'';},tratItem:function(t){return ITEMS[t.itemId]||null;},
  tratProdutoNome:function(t){var it=ITEMS[t.itemId];return it?it.nome:(t.produto||'');},
  tratEquivalenteIA:function(){return null;},doseTextoDe:function(s,v){return v||'';},
  studyMetodosVariam:function(){return false;},studyMetodo:function(s){return s.metodoAplicacao||'tractor';},
  tratMetodo:function(s,q,t){return t&&t.metodo||s.metodoAplicacao||'tractor';},
  isoToBR:function(v){var m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:v;}
};
ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
[
 '_sinergistaStaticCells','_sinergistaNorm','_sinergistaObjectiveLines','_sinergistaTreatmentItems','_sinergistaStudyItem',
 '_sinergistaDesign','_sinergistaMethod','_sinergistaFirstApplication','_sinergistaDayDiff',
 '_sinergistaAssessments','_sinergistaDynamicCells','buildStudySinergista','_sinergistaXmlEscape',
 '_sinergistaPatchCell','_sinergistaPatchSheetXml'
].forEach(function(n){vm.runInContext(pega(n),ctx);});

function cell(tsv,addr){
  var m=addr.match(/^([A-Z]+)(\d+)$/),col=0;for(var i=0;i<m[1].length;i++)col=col*26+m[1].charCodeAt(i)-64;
  var row=(tsv.split('\n')[+m[2]-1]||'').split('\t');return row[col-1]||'';
}

console.log('\n--- O segundo modelo lê o mesmo estudo, nas células do arquivo recebido ---');
var full=ctx.buildStudySinergista('Q1',study),dados=ctx.buildStudySinergista('Q1',study,{soDados:true});
eq(cell(full,'B5'),'CROP','o rótulo CROP permanece no modelo completo');
eq(cell(dados,'B5'),'','a cópia “só dados” não sobrescreve o rótulo');
eq(cell(full,'C5'),'Soja','cultura vem do estudo, não da quadra');
eq(cell(full,'C6'),'Crysodeixis includens','alvo');
eq(cell(full,'I5'),'Synergist X','PRODUCT usa o item de teste ligado ao tratamento');
eq(cell(full,'K5'),'RET-123','RET usa o registro do item');
eq(cell(full,'I7'),'SC','CLASS usa a formulação do item');
eq(cell(full,'C14'),'UNTREATED','a testemunha vira UNTREATED');
eq(cell(full,'C15'),'Synergist X','tratamento de teste');
eq(cell(full,'D15'),'Active A','ingrediente ativo herdado do banco de itens');
eq(cell(full,'E15'),'300 g/L','concentração herdada do banco de itens');
eq(cell(full,'F15'),'0,4 L/ha','dose conserva a unidade, sem número ambíguo');
eq(cell(full,'G15'),'120','taxa de ingrediente ativo');
eq(cell(full,'H15'),'2','número de aplicações');
eq(cell(full,'I15'),'7','intervalo');
eq(cell(full,'J15'),'150 L/ha','volume de calda');
eq(cell(full,'K15'),'Silwet','adjuvante');
eq(cell(full,'D24'),'Randomized Complete Block Design','DBC é traduzido como RCBD, não DIC');
eq(cell(full,'I24'),'5 x 3 m','tamanho da parcela');
eq(cell(full,'K24'),'4','repetições');
eq(cell(full,'D25'),'01/09/2026 08:30','primeira aplicação real com horário');
eq(cell(full,'D26'),'CO₂-pressurized backpack sprayer','método de aplicação em inglês');
eq(cell(full,'C29'),'1','primeira avaliação em dias após aplicação');
eq(cell(full,'C30'),'7','segunda avaliação em dias após aplicação');
eq(cell(full,'G29'),'X','parâmetro Efficiency marcado');
eq(cell(full,'I29'),'X','parâmetro Phytotoxicity marcado');
eq(cell(full,'K29'),'X','parâmetro Productivity marcado');

console.log('\n--- Limites físicos são explícitos; nada é cortado em silêncio ---');
var big=JSON.parse(JSON.stringify(study));big.tratamentos=[];for(var t=1;t<=10;t++)big.tratamentos.push({id:'T'+t,produto:'P'+t});
var msg='';try{ctx.buildStudySinergista('Q1',big);}catch(e){msg=e.message;}
ck(/até 9 tratamentos/.test(msg),'10 tratamentos bloqueiam com uma explicação clara');
big=JSON.parse(JSON.stringify(study));big.avaliacoes=[];for(var a=0;a<11;a++)big.avaliacoes.push({id:'a'+a,data:'2026-09-'+String(a+1).padStart(2,'0'),variaveis:[]});
msg='';try{ctx.buildStudySinergista('Q1',big);}catch(e){msg=e.message;}
ck(/até 10 avaliações/.test(msg),'11 avaliações também bloqueiam, em vez de sumirem');

async function arquivos(){
  console.log('\n--- O XLSX final mantém o arquivo visual original ---');
  var path='modelos/protocolo-sinergista.xlsx',buf=fs.readFileSync(path);
  eq(sha(buf),'1916c77ec5f5aeb5902393939369cce5e7159c8e4752eba3aead03a85a5bb14f','o template é exatamente o arquivo enviado');
  var zip=await JSZip.loadAsync(buf),media=await zip.file('xl/media/image1.png').async('nodebuffer');
  var xml=await zip.file('xl/worksheets/sheet1.xml').async('string');
  zip.file('xl/worksheets/sheet1.xml',ctx._sinergistaPatchSheetXml(xml,ctx._sinergistaDynamicCells('Q1',study)));
  var out=await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),z2=await JSZip.loadAsync(out);
  if(process.env.SINERGISTA_TEST_OUT)fs.writeFileSync(process.env.SINERGISTA_TEST_OUT,out);
  ck(!!z2.file('xl/drawings/drawing1.xml'),'o desenho da logo continua no arquivo');
  ck(!!z2.file('xl/worksheets/_rels/sheet1.xml.rels'),'a relação entre folha e logo continua');
  eq(sha(await z2.file('xl/media/image1.png').async('nodebuffer')),sha(media),'a imagem da logo não foi alterada');
  var wb=XLSX.read(out,{type:'buffer'}),ws=wb.Sheets[wb.SheetNames[0]];
  eq(ws.C5.v,'Soja','o Excel reabre e lê a cultura preenchida');
  eq(ws.I5.v,'Synergist X','o Excel reabre e lê o produto');
  eq(ws.C14.v,'UNTREATED','o exemplo antigo foi substituído pela testemunha atual');
  eq((ws['!merges']||[]).length,22,'os 22 merges do layout foram preservados');
  ck(!Object.keys(ws).some(function(k){return ws[k]&&ws[k].v==='Sankari';}),'nenhum tratamento do exemplo original vazou para o novo protocolo');

  console.log('\n--- Os dois formatos continuam acessíveis e offline ---');
  var sw=fs.readFileSync('sw.js','utf8'),html=fs.readFileSync('index.html','utf8');
  ck(/function downloadStudyWorkbook\(/.test(src)&&/modelos\/modelo-protocolo\.xls/.test(src),'o modelo Agracta atual continua no código');
  ck(/function downloadStudySinergista\(/.test(src)&&/showStudyWorkbookFormats/.test(src),'o Sinergista é uma segunda opção explícita');
  ck(/protocolo-sinergista\.xlsx/.test(sw)&&/jszip\.min\.js/.test(sw),'template e compactador entram no pré-cache offline');
  ck(html.indexOf('vendor/jszip.min.js')>=0&&html.indexOf('vendor/jszip.min.js')<html.indexOf('app.js?v=87'),'JSZip carrega antes do app');
}

arquivos().then(function(){
  console.log('\nResultado: '+p+' passaram; '+f+' falharam.');if(f)process.exit(1);
}).catch(function(e){console.error(e);process.exit(1);});
