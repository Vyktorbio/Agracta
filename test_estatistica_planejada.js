/* Fluxo real de seleção: uma data ou mesmas parcelas em várias datas. */
const assert=require('assert/strict'),fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
const src=fs.readFileSync('estatistica/app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');assert.ok(i>=0,nome);
  let d=0,abriu=false,j=i;
  for(;j<src.length;j++){if(src[j]==='{'){d++;abriu=true;}else if(src[j]==='}'&&--d===0&&abriu){j++;break;}}
  return src.slice(i,j);
}
const dom=new JSDOM(fs.readFileSync('estatistica/index.html','utf8'),{url:'https://agracta.test/estatistica/',runScripts:'outside-only'}),w=dom.window;
w.eval('var MATRIZ_IMPORT=null,COLUNAS=[],MODO="analise";');
Object.assign(w,{
  $:s=>w.document.querySelector(s),
  el:(tag,cls,txt)=>{const e=w.document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;},
  esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])),
  textoLimpo:v=>String(v??'').trim(),
  numBR:v=>{const s=String(v??'').trim();return s?Number(s.replace(',','.')):NaN;},
  invalidarResultado:()=>{},atualizarPipeline:()=>{},avisar:m=>{throw new Error(m);},
  preencherIdentificacaoSeVazia:()=>{},gerarIdAuditoria:()=> 'ID',setModo:m=>{w.MODO=m;},
  setTimeout:()=>{},
  carregarColunas:(cols,papeis)=>{w.COLUNAS=cols;w.ultimosPapeis=papeis;w.renderPapeis(w.papeisDeExemplo(papeis));}
});
w.eval(src.match(/^const PAPEL_OPCOES = .*$/m)[0].replace('const PAPEL_OPCOES','var PAPEL_OPCOES'));
const names=['normCab','textoValor','valorLinha','linhasMatrizDeAoa','matrizKey','matrizLabel','unicoOrdenado','addOpcao','matrizLinhasFiltradas','atualizarMatrizFiltros','atualizarMatrizPreview','renderMatrizImportador','colunasBioensaioDeMatriz','usarMatrizNoBioensaio','papeisDeExemplo','renderPapeis','popularTestemunha','lerPapeis','_agTipoResp','__agractaHandoff'];
w.eval(names.map(pega).join('\n'));
const header=['Local','Quadra','Estudo','Data_avaliacao','Tratamento','Repeticao','Produto','Variavel','Valor'];
const rows=[];
for(const data of ['01/09/2026','08/09/2026'])for(const t of ['T1','T2','T3'])for(let b=1;b<=4;b++)rows.push(['Fazenda','Q1','E1',data,t,b,t,'Severidade',10+b+(data==='08/09/2026'?3:0)]);
assert.equal(w.__agractaHandoff({aoa:[header,...rows],controle:'T3',tipos:{Severidade:'pct'},sentidos:{Severidade:false}}),true);
assert.equal(w.COLUNAS[0].valores.length,12,'abertura não reúne datas como repetições');
assert.equal(w.document.getElementById('opt-testemunha').value,'T3','testemunha marcada não precisa ser T1');
assert.equal(w.document.getElementById('opt-modelo').value,'auto');
assert.equal(w.document.getElementById('opt-tipo').value,'proporcao');
assert.equal(w.__agractaMaiorMelhor,false);
w.document.getElementById('matriz-produto').checked=true;w.usarMatrizNoBioensaio();
assert.equal(w.document.getElementById('opt-testemunha').value,'T3 - T3','nome do produto não perde a testemunha cadastrada');
w.document.getElementById('opt-testemunha').value='T2 - T2';
w.document.getElementById('matriz-produto').checked=false;w.usarMatrizNoBioensaio();
assert.equal(w.document.getElementById('opt-testemunha').value,'T2','trocar o rótulo preserva o controle escolhido manualmente');
w.document.getElementById('matriz-data').value='__todas';w.atualizarMatrizFiltros();w.usarMatrizNoBioensaio();
assert.equal(w.COLUNAS[0].valores.length,24);
assert.equal(w.document.getElementById('opt-modelo').value,'repetidas');
assert.equal(w.lerPapeis().unidade,'parcela');assert.equal(w.lerPapeis().tempo,'data_avaliacao');
const parcelas=w.COLUNAS.find(c=>c.nome==='parcela').valores;
assert.equal(new Set(parcelas).size,12);
assert.equal(parcelas[0],parcelas[12],'a mesma parcela mantém identificação entre datas');
assert.notEqual(parcelas[0],parcelas[4],'tratamentos diferentes não são a mesma unidade');
w.document.getElementById('matriz-data').value='01/09/2026';w.usarMatrizNoBioensaio();
assert.equal(w.COLUNAS[0].valores.length,12);
assert.equal(w.lerPapeis().unidade,undefined);assert.equal(w.document.getElementById('opt-modelo').value,'auto');
// Outro estudo sem testemunha não herda T3 nem a direção da variável anterior.
assert.equal(w.__agractaHandoff({aoa:[header,...rows.filter(r=>r[3]==='01/09/2026')]}),true);
assert.equal(w.document.getElementById('opt-testemunha').value,'');
assert.equal(w.__agractaMaiorMelhor,null);
dom.window.close();
console.log('Estatística: data isolada, longitudinal, identidade de parcela, tipo de resposta e controle explícito conferidos.');
