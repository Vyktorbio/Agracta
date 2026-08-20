/* =========================================================================
 * test_auditoria_correcoes.js — trava as correções da auditoria de 19/08/2026
 *
 *   node test_auditoria_correcoes.js
 *
 * Cada bloco aqui existe porque o comportamento ERRADO já esteve publicado e
 * era silencioso: número plausível, nenhuma tela quebrada. Se alguém desfizer
 * qualquer um deles, isto acusa.
 * ========================================================================= */
"use strict";
const fs = require("fs"), vm = require("vm"), path = require("path");

let ok = 0, falhou = 0;
const S = t => console.log("\n\x1b[1m" + t + "\x1b[0m");
function certo(nome, cond, detalhe) {
  if (cond) { ok++; console.log("  \x1b[32m✓\x1b[0m " + nome); }
  else { falhou++; console.log("  \x1b[31m✗\x1b[0m " + nome + (detalhe ? "\n      " + detalhe : "")); }
}

/* ---- sandbox: mesmo padrão de test_fiacao_ui.js ---- */
function elStub(){
  return new Proxy(function(){}, {
    get(t,k){
      if(k==='style') return {};
      if(k==='classList') return {add(){},remove(){},toggle(){},contains:()=>false};
      if(k==='value'||k==='textContent'||k==='innerHTML') return '';
      if(k==='children'||k==='childNodes') return [];
      return elStub();
    }, set(){return true;}, apply(){return elStub();}
  });
}
const store = {};
const C = { console, Promise, setTimeout, clearTimeout, setInterval(){}, clearInterval(){},
  Date, JSON, Object, Array, String, Number, Math, RegExp, Error, isNaN, parseInt, parseFloat,
  isFinite, encodeURIComponent, decodeURIComponent, escape, unescape, Buffer,
  alert(){}, confirm: () => C.__confirma, prompt: () => '' };
C.__confirma = true;                       /* o teste responde "sim" por padrão */
C.window = C; C.globalThis = C; C.self = C;
C.btoa = s => Buffer.from(s,'binary').toString('base64');
C.atob = s => Buffer.from(s,'base64').toString('binary');
C.localStorage = { getItem: k => store[k] ?? null, setItem:(k,v)=>{store[k]=String(v)}, removeItem:k=>{delete store[k]} };
C.sessionStorage = { getItem:()=>null, setItem(){} };
C.location = { reload(){}, href:'', search:'', hash:'' };
C.navigator = { onLine:true, userAgent:'node', serviceWorker:{ register:()=>Promise.resolve(), addEventListener(){} } };
C.document = new Proxy({}, { get(t,k){
  if(k==='createElement'||k==='getElementById'||k==='querySelector'||k==='createElementNS') return ()=>elStub();
  if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName') return ()=>[];
  if(k==='addEventListener'||k==='removeEventListener') return ()=>{};
  if(k==='body'||k==='documentElement'||k==='head') return elStub();
  if(k==='visibilityState') return 'visible';
  if(k==='cookie') return '';
  return elStub();
}});
C.addEventListener=()=>{}; C.removeEventListener=()=>{}; C.requestAnimationFrame=()=>{};
C.matchMedia=()=>({matches:false,addListener(){},addEventListener(){}});
C.fetch=()=>Promise.resolve({json:()=>Promise.resolve({})});
vm.createContext(C);
vm.runInContext(fs.readFileSync(path.join(__dirname,'vendor/biocalc-campo-core.js'),'utf8'), C, {filename:'biocalc-campo-core.js'});
vm.runInContext(fs.readFileSync(path.join(__dirname,'vendor/biocalc-lab-core.js'),'utf8'), C, {filename:'biocalc-lab-core.js'});
try { vm.runInContext(fs.readFileSync(path.join(__dirname,'app.js'),'utf8'), C, {filename:'app.js'}); }
catch(e){ console.error('app.js não carregou:', e.message); process.exit(1); }

/* ===================================================================== */
S("Apagar tratamento NÃO desloca o dado de campo");
/* Era o pior: removeTrat renumerava os ids por posição e as notas ficavam
   presas às chaves antigas. Apagar o T2 de um ensaio de 5 fazia o Silwet
   reportar a mortalidade do Sankari, e a última nota virar órfã. */
{
  const novoEstudo = () => ({
    id:'e1', codigo:'E1', numRepeticoes:1, randomizado:false, testemunha:'T1',
    tratamentos:[
      {id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Sankari'},
      {id:'T3',produto:'Silwet'},{id:'T4',produto:'Assist'},{id:'T5',produto:'Malathion'}],
    avaliacoes:[{data:'2026-08-19',variaveis:['Mortos'],notas:{
      'T1R1':{Mortos:5},'T2R1':{Mortos:40},'T3R1':{Mortos:35},'T4R1':{Mortos:30},'T5R1':{Mortos:25}}}]
  });
  const est = novoEstudo();
  const antes = {}; est.tratamentos.forEach(t => antes[t.produto] = est.avaliacoes[0].notas[t.id+'R1'].Mortos);

  C.workingStudy = est;
  C.renderStudyEditModal = ()=>{}; C.syncStudyInputs = ()=>{};
  C.removeTrat(1);                                     /* apaga o T2 (Sankari) */

  certo("o Sankari saiu da lista", !est.tratamentos.some(t=>t.produto==='Sankari'));
  est.tratamentos.forEach(t => {
    const n = est.avaliacoes[0].notas[t.id+'R1'];
    certo(t.produto+" continua com a SUA nota ("+antes[t.produto]+")",
      !!n && n.Mortos === antes[t.produto],
      "leu " + (n ? n.Mortos : 'nada'));
  });
  certo("nenhuma chave órfã sobrou",
    Object.keys(est.avaliacoes[0].notas).every(k => est.tratamentos.some(t=>t.id+'R1'===k)),
    Object.keys(est.avaliacoes[0].notas).join(','));
  certo("a nota do tratamento apagado foi descartada, não realocada",
    Object.keys(est.avaliacoes[0].notas).length === 4);
  certo("a testemunha continua apontando para o T1", est.testemunha === 'T1');

  /* a confirmação é a única barreira contra o toque errado no "×" */
  const est2 = novoEstudo();
  C.workingStudy = est2; C.__confirma = false;
  C.removeTrat(1);
  certo("recusar a confirmação NÃO apaga nada", est2.tratamentos.length === 5);
  C.__confirma = true;

  /* sem nota lançada não precisa incomodar ninguém */
  const est3 = novoEstudo(); est3.avaliacoes = [];
  C.workingStudy = est3; C.__confirma = false;
  C.removeTrat(1);
  certo("sem nota, apaga direto (não pergunta)", est3.tratamentos.length === 4);
  C.__confirma = true;
}

/* ===================================================================== */
S("Abbott recusa contagem crua em vez de inventar porcentagem");
/* (val−ref)/(100−ref) só vale para variável limitada a 100. 'contagem' chega
   como nº bruto de insetos: dava 36,8% onde o certo era 77,8%, e 9.900% com
   testemunha 99, porque a guarda só barrava testemunha ≥ 100. */
{
  certo("contagem + 'maior' => não calcula (mostra —)",
    C._pctCtrl(5, 40, 'maior', 'contagem') === null);
  certo("o caso absurdo antigo (99 -> 198) também é recusado",
    C._pctCtrl(99, 198, 'maior', 'contagem') === null);

  const razao = C._pctCtrl(10, 80, 'maior', 'razao');
  certo("razão n/N segue calculando: (80−10)/(100−10) = 77,78%",
    Math.abs(razao - 77.7777778) < 1e-5, "obtido " + razao);
  certo("escala (McKinney) também segue", C._pctCtrl(10, 80, 'maior', 'escala') !== null);
  certo("pct também segue", C._pctCtrl(10, 80, 'maior', 'pct') !== null);

  /* o ramo 'menor' é razão adimensional: contagem ali é legítima */
  const red = C._pctCtrl(40, 10, 'menor', 'contagem');
  certo("redução em contagem continua válida: (40−10)/40 = 75%",
    Math.abs(red - 75) < 1e-9, "obtido " + red);
  certo("sem o tipo (chamadas antigas de AUDPC) o ramo 'menor' não muda",
    Math.abs(C._pctCtrl(40, 10, 'menor') - 75) < 1e-9);
}

/* ===================================================================== */
S("Bancada: porcentagem é porcentagem, e mistura tem os dois componentes");
/* _calcDoseUnit não conhece '%' e devolvia 'L/ha' para tudo: 0,2% era preparado
   como 0,2 L/ha. O motor de laboratório sempre soube fazer '% v/v'. */
{
  const LB = C.BioCalculoLab, BC = C.BioCalculoCampo;
  certo("o motor de lab expõe calcCampo", LB && typeof LB.calcCampo === 'function');

  const r = LB.calcCampo({dose:0.2, unidade:'% v/v', volumeMl:50, pureza:100, densidade:1});
  certo("Silwet 0,2% em 50 mL = 100 µL",
    Math.abs(r.produtoUl - 100) < 1e-9, "obtido " + r.produtoUl);
  certo("e sobra 49,9 mL de solvente", Math.abs(r.solventeMl - 49.9) < 1e-9);

  /* o que o caminho antigo fazia com a MESMA dose */
  const errado = LB.calcCampo({dose:0.2, unidade:'L/ha', vazao:200, volumeMl:50, pureza:100, densidade:1});
  certo("lido como L/ha daria outro número (é o erro que se corrigiu)",
    Math.abs(errado.produtoUl - 100) > 1);

  /* a mistura do protocolo é lida inteira */
  const m = BC.parseComponents('Sankari + Silwet', '1,5 L + 0,2%');
  certo("dois componentes lidos", m.components.length === 2);
  certo("o adjuvante mantém a base %", m.components[1].unidade === '%');
  certo("e o produto mantém L/ha", m.components[0].unidade === 'L/ha');
}

/* ===================================================================== */
S("A planilha de campo exportada usa o motor de mistura");
{
  const src = fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
  const bloco = src.slice(src.indexOf("'N°','Tratamento','Dose'"),
                          src.indexOf("'N°','Tratamento','Dose'") + 3000);
  certo("tem coluna de Avisos", /'Avisos'/.test(bloco));
  certo("chama calculateMixture, não mais calculateTreatment",
    /calculateMixture/.test(bloco) && !/calculateTreatment/.test(bloco));
  certo("o catch deixou de ser vazio", !/\}catch\(e\)\{\}/.test(bloco));
}

console.log("\n" + (falhou === 0
  ? "\x1b[32m" + ok + " conferências, todas certas.\x1b[0m"
  : "\x1b[31m" + falhou + " falharam\x1b[0m de " + (ok + falhou)));
process.exit(falhou === 0 ? 0 : 1);
