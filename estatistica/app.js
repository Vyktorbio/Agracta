/* BioEnsaio — lógica da interface + ponte com o motor Python (Pyodide) */
"use strict";

const ARQ_ENGINE = ["__init__.py","detect.py","diagnostics.py","doseresponse.py",
                    "posthoc.py","anova.py","glmcount.py","decide.py","tempo.py",
                    "validacao.py","forense.py"];
const APP_VERSION = "bioensaio-auditoria-3";
const ENGINE_VERSION = APP_VERSION;
const SW_CACHE_VERSION = "bioensaio-v37-auditoria";
const AUDIT_FORMAT = "BioEnsaio audit package v2";
const SELFTEST_STORAGE_KEY = `bioensaio:selftest:${APP_VERSION}`;
const CRITERIOS_PADRAO_VALIDACAO = {
  r2_min: 0.99,
  recuperacao_min: 80,
  recuperacao_max: 120,
  cv_max: 20,
  horrat_min: 0.5,
  horrat_max: 2.0,
};
const VALIDACAO_REGRAS = [
  "Seletividade",
  "Linearidade / faixa de trabalho / sensibilidade",
  "Limite de Detecção (LD) e Limite de Quantificação (LQ)",
  "Tendência / recuperação",
  "Precisão: repetibilidade, precisão intermediária e reprodutibilidade",
  "Robustez opcional",
  "Outliers: Grubbs e resíduos padronizados Jackknife",
  "Homocedasticidade: Cochran, Levene e Brown-Forsythe",
  "Comparações: teste F, teste t de Student/Welch e ANOVA",
  "Descritiva: média, desvio padrão amostral, CV/DPR e Horwitz",
  "Premissa gaussiana com investigação adicional quando a normalidade falhar",
];
const FORENSE_REGRAS = [
  "Índice de dispersão (variância/média) para contagens",
  "Homogeneidade de variância entre grupos (CV das variâncias)",
  "Distribuição do último dígito (qui-quadrado)",
  "Arredondamento preferencial / heaping (múltiplos de 5)",
  "Reconciliação de %eficácia contra controle informado",
  "Linhas/grupos duplicados (possível copy-paste)",
  "Presença de valores extremos (dados lisos demais)",
  "Acoplamento entre avaliações por teste de permutação (seed fixo, reprodutível)",
];
const CONTROLES_CONFORMIDADE = [
  {
    referencia: "OECD GLP / BPL",
    controle: "Estudo planejado, executado, registrado e reportado com rastreabilidade",
    evidencia: "Identificação obrigatória do registro, pipeline guiado, relatório técnico e pacote JSON",
    status: "Apoiado pelo app",
  },
  {
    referencia: "OECD GLP Data Integrity",
    controle: "Gestão do ciclo de vida dos dados por risco, criticidade e fluxo",
    evidencia: "Snapshot dos dados, cadeia de custódia, papéis, opções, resultado e hashes SHA-256",
    status: "Apoiado pelo app",
  },
  {
    referencia: "OECD GLP Computadorizado/IT",
    controle: "Versão do sistema e arquivos usados no cálculo",
    evidencia: "Versão do app, versão do motor, cache do service worker e hashes dos arquivos Python",
    status: "Apoiado pelo app",
  },
  {
    referencia: "ISO/IEC 27001",
    controle: "Integridade e disponibilidade da informação como parte do ISMS",
    evidencia: "Hashes, exportação local, service worker versionado e runtime científico publicado no PWA",
    status: "Controle técnico parcial",
  },
  {
    referencia: "ISO/IEC 27001",
    controle: "Confidencialidade, acesso, backup, assinatura e aprovação",
    evidencia: "Dependem de política, infraestrutura e procedimento do laboratório",
    status: "Fora do escopo do app",
  },
];
const LACUNAS_ORGANIZACIONAIS = [
  "controle de acesso por usuário e trilha de login",
  "assinatura/aprovação eletrônica por responsável autorizado",
  "backup institucional e retenção formal dos registros",
  "validação formal do sistema computadorizado no ambiente do laboratório",
  "gestão de riscos, procedimentos e auditoria interna do ISMS",
];

const BRIDGE = `
import json, math
import numpy as np
from bioengine import analisar

def _clean(o):
    if o is None or isinstance(o,(bool,int,str)): return o
    if isinstance(o,(np.bool_,)): return bool(o)
    if isinstance(o,(np.integer,)): return int(o)
    if isinstance(o,(np.floating,float)):
        f=float(o); return f if math.isfinite(f) else None
    if isinstance(o,(np.str_,)): return str(o)
    if isinstance(o,np.ndarray): return [_clean(x) for x in o.tolist()]
    if isinstance(o,(set,frozenset)): return [_clean(x) for x in o]
    if isinstance(o,dict):
        return {(k if isinstance(k,str) else str(_clean(k))):_clean(v) for k,v in o.items()}
    if isinstance(o,(list,tuple)): return [_clean(x) for x in o]
    return str(o)

def _run_web(dados_json, papeis_json, opcoes_json):
    dados=json.loads(dados_json); papeis=json.loads(papeis_json); opcoes=json.loads(opcoes_json)
    papeis={k:v for k,v in papeis.items() if v not in (None,"",[])}
    if "fatores" in papeis and not papeis["fatores"]: del papeis["fatores"]
    try:
        rel=analisar(dados,papeis,opcoes)
    except Exception as e:
        import traceback
        rel={"ok":False,"erro":str(e),"trace":traceback.format_exc()}
    return json.dumps(_clean(rel))

def _run_tempo(dados_json, papeis_json, opcoes_json):
    from bioengine import tempo as _T
    dados=json.loads(dados_json); papeis=json.loads(papeis_json); opcoes=json.loads(opcoes_json)
    papeis={k:v for k,v in papeis.items() if v not in (None,"",[])}
    try:
        rel=_T.analisar_tempo(dados,papeis,opcoes)
    except Exception as e:
        import traceback
        rel={"ok":False,"erro":str(e),"trace":traceback.format_exc()}
    return json.dumps(_clean(rel))

def _run_validacao(dados_json, papeis_json, opcoes_json):
    from bioengine import validacao as _V
    dados=json.loads(dados_json); papeis=json.loads(papeis_json); opcoes=json.loads(opcoes_json)
    papeis={k:v for k,v in papeis.items() if v not in (None,"",[])}
    try:
        rel=_V.analisar_validacao(dados,papeis,opcoes)
    except Exception as e:
        import traceback
        rel={"ok":False,"erro":str(e),"trace":traceback.format_exc()}
    return json.dumps(_clean(rel))

def _run_forense(dados_json, papeis_json, opcoes_json):
    from bioengine import forense as _F
    dados=json.loads(dados_json); papeis=json.loads(papeis_json); opcoes=json.loads(opcoes_json)
    papeis={k:v for k,v in papeis.items() if v not in (None,"",[])}
    try:
        rel=_F.analisar_forense(dados,papeis,opcoes)
    except Exception as e:
        import traceback
        rel={"ok":False,"erro":str(e),"trace":traceback.format_exc()}
    return json.dumps(_clean(rel))
`;

let pyodide = null;
let pyPronto = null;          // promessa de inicialização
let COLUNAS = [];             // [{nome, valores:[...]}]
let MODO = "analise";         // "analise" | "tempo" | "validacao" | "forense"
let MATRIZ_IMPORT = null;     // linhas normalizadas da planilha exportada pelo Matriz
let ENGINE_HASHES = {};
let FONTE_DADOS = null;
let ULTIMA_EXECUCAO = null;
let ULTIMO_RELATORIO = null;
let AUDIT_ATUAL = null;
let PRONTIDAO_SISTEMA = null;

const $ = (s) => document.querySelector(s);
const el = (t, c, txt) => { const e=document.createElement(t); if(c)e.className=c; if(txt!=null)e.textContent=txt; return e; };
let toastTimer = null;

function esc(v){
  return String(v == null ? "" : v).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[ch]));
}
function avisar(msg, tipo="erro"){
  const box = $("#toast");
  if(!box) return;
  clearTimeout(toastTimer);
  box.textContent = msg;
  box.className = "toast " + (tipo === "ok" ? "toast-ok" : "toast-erro");
  toastTimer = setTimeout(()=>box.classList.add("oculto"), 4200);
}
function resultadoVisivel(){
  const card=$("#card-resultados");
  const box=$("#resultados");
  return !!(card && box && !card.classList.contains("oculto") && box.children.length);
}
function invalidarResultado(motivo){
  const tinhaResultado = !!(ULTIMO_RELATORIO || AUDIT_ATUAL || resultadoVisivel());
  ULTIMO_RELATORIO = null;
  AUDIT_ATUAL = null;
  if(tinhaResultado){
    const card=$("#card-resultados");
    const box=$("#resultados");
    if(box) box.innerHTML = "";
    if(card) card.classList.add("oculto");
    setNavTravado("resultados", true);
    atualizarNav();
    avisar(`${motivo || "Entrada alterada"}. Recalcule antes de copiar, imprimir ou exportar auditoria.`, "ok");
  }
}
function canonicalizar(v){
  if(v === undefined) return null;
  if(v === null || typeof v === "string" || typeof v === "boolean") return v;
  if(typeof v === "number") return Number.isFinite(v) ? v : String(v);
  if(Array.isArray(v)) return v.map(canonicalizar);
  if(typeof v === "object"){
    const out = {};
    Object.keys(v).sort().forEach(k=>{ out[k] = canonicalizar(v[k]); });
    return out;
  }
  return String(v);
}
function jsonEstavel(v){ return JSON.stringify(canonicalizar(v)); }
async function sha256Hex(texto){
  if(!window.crypto || !crypto.subtle || !window.TextEncoder) return "sha256-indisponivel";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(texto)));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function clonarAuditavel(v){ return JSON.parse(JSON.stringify(canonicalizar(v))); }
function carregarProntidaoSistema(){
  if(PRONTIDAO_SISTEMA && PRONTIDAO_SISTEMA.app_version === APP_VERSION) return PRONTIDAO_SISTEMA;
  try{
    const raw = localStorage.getItem(SELFTEST_STORAGE_KEY);
    if(!raw) return null;
    const p = JSON.parse(raw);
    const ok = !!p.ok && p.app_version === APP_VERSION && p.sw_cache_version === SW_CACHE_VERSION &&
      p.audit_format === AUDIT_FORMAT && String(p.pacote_sha256 || "").length === 64;
    PRONTIDAO_SISTEMA = ok ? p : null;
    return PRONTIDAO_SISTEMA;
  }catch(_e){
    return null;
  }
}
function sistemaPronto(){
  return !!carregarProntidaoSistema();
}
function salvarProntidaoSistema(res){
  if(!res || !res.ok) return null;
  const registro = {
    ok: true,
    app_version: APP_VERSION,
    engine_version: ENGINE_VERSION,
    sw_cache_version: SW_CACHE_VERSION,
    audit_format: AUDIT_FORMAT,
    pacote_sha256: res.pacote_sha256 || "",
    checks_ok: (res.checks || []).filter(c=>c.status === "ok").length,
    checks_falha: (res.checks || []).filter(c=>c.status === "falha").length,
    checks_aviso: (res.checks || []).filter(c=>c.status === "aviso").length,
    concluido_em: res.concluido_em || new Date().toISOString(),
  };
  PRONTIDAO_SISTEMA = registro;
  try{ localStorage.setItem(SELFTEST_STORAGE_KEY, JSON.stringify(registro)); }catch(_e){}
  return registro;
}
function resumoProntidaoSistema(){
  const p = carregarProntidaoSistema();
  return p ? clonarAuditavel(p) : {
    ok: false,
    app_version: APP_VERSION,
    sw_cache_version: SW_CACHE_VERSION,
    motivo: "Autoteste da versão ainda não aprovado neste navegador.",
  };
}
function atualizarBotaoAutoteste(){
  const btn = $("#btn-autoteste");
  if(!btn) return;
  const p = carregarProntidaoSistema();
  btn.classList.toggle("pronto", !!p);
  btn.textContent = p ? "Autoteste OK" : "Autoteste";
  btn.title = p
    ? `Autoteste aprovado em ${new Date(p.concluido_em).toLocaleString("pt-BR")}`
    : "Executar autoteste da versão antes de analisar";
  btn.setAttribute("aria-label", btn.title);
}
function criterioNumerico(selector, fallback){
  const elCampo = $(selector);
  if(!elCampo) return fallback;
  const n = numBR(elCampo.value);
  return Number.isFinite(n) ? n : fallback;
}
function lerCriteriosValidacao(){
  return {
    r2_min: criterioNumerico("#opt-crit-r2", CRITERIOS_PADRAO_VALIDACAO.r2_min),
    recuperacao_min: criterioNumerico("#opt-crit-rec-min", CRITERIOS_PADRAO_VALIDACAO.recuperacao_min),
    recuperacao_max: criterioNumerico("#opt-crit-rec-max", CRITERIOS_PADRAO_VALIDACAO.recuperacao_max),
    cv_max: criterioNumerico("#opt-crit-cv-max", CRITERIOS_PADRAO_VALIDACAO.cv_max),
    horrat_min: criterioNumerico("#opt-crit-horrat-min", CRITERIOS_PADRAO_VALIDACAO.horrat_min),
    horrat_max: criterioNumerico("#opt-crit-horrat-max", CRITERIOS_PADRAO_VALIDACAO.horrat_max),
  };
}

/* ----------------------------------------------------------------------- */
/* Inicialização do Pyodide + motor                                        */
/* ----------------------------------------------------------------------- */
async function iniciarPyodide() {
  try {
    mostrarOverlay("Carregando motor estatístico…", "Inicializando bibliotecas científicas.");
    pyodide = await loadPyodide({ indexURL: "pyodide/" });
    window.__pyodide = pyodide;
    setOverlay("Carregando bibliotecas…", "numpy, scipy, pandas, statsmodels");
    await pyodide.loadPackage(["numpy", "scipy", "pandas", "statsmodels"]);
    setOverlay("Preparando o motor…", "");
    const arquivos = {};
    for (const f of ARQ_ENGINE) {
      const r = await fetch("bioengine/" + f + "?v=" + ENGINE_VERSION, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status + " em bioengine/" + f);
      const conteudo = await r.text();
      arquivos[f] = conteudo;
      ENGINE_HASHES[f] = await sha256Hex(conteudo);
    }
    const proxy = pyodide.toPy(arquivos);
    pyodide.globals.set("_engine_files", proxy);
    pyodide.runPython(`
import os, sys
os.makedirs("bioengine", exist_ok=True)
for _nome, _conteudo in dict(_engine_files).items():
    with open(os.path.join("bioengine", _nome), "w") as _fh:
        _fh.write(_conteudo)
if "" not in sys.path:
    sys.path.insert(0, "")
`);
    proxy.destroy();
    pyodide.runPython(BRIDGE);
    esconderOverlay();
  } catch (e) {
    console.error("iniciarPyodide:", e);
    setOverlay("Erro ao carregar o motor", String((e && e.message) || e));
    throw e;
  }
}
function garantirPyodide(){ if(!pyPronto) pyPronto = iniciarPyodide(); return pyPronto; }

/* ----------------------------------------------------------------------- */
/* Overlay                                                                 */
/* ----------------------------------------------------------------------- */
function mostrarOverlay(msg, sub){ $("#overlay-msg").textContent=msg; $("#overlay-sub").textContent=sub||""; $("#overlay").classList.remove("oculto"); }
function setOverlay(msg, sub){ $("#overlay-msg").textContent=msg; if(sub!=null)$("#overlay-sub").textContent=sub; }
function esconderOverlay(){ $("#overlay").classList.add("oculto"); }

/* ----------------------------------------------------------------------- */
/* Navegação principal                                                     */
/* ----------------------------------------------------------------------- */
function navItem(nome){ return document.querySelector(`.appnav-item[data-nav="${nome}"]`); }
function setNavAtivo(nome){
  document.querySelectorAll(".appnav-item").forEach(a=>a.classList.toggle("ativo", a.dataset.nav===nome));
}
function setNavTravado(nome, travado){
  const item=navItem(nome); if(!item) return;
  item.classList.toggle("travado", !!travado);
  item.setAttribute("aria-disabled", travado ? "true" : "false");
}
function atualizarNav(){
  const temDados = COLUNAS.length > 0;
  const temResultados = !$("#card-resultados").classList.contains("oculto") && $("#resultados").children.length > 0;
  setNavTravado("papeis", !temDados);
  setNavTravado("resultados", !temResultados);
}
function irPara(secao){
  if(secao==="dados"){
    setNavAtivo("dados");
    $("#card-dados").scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  if(secao==="papeis"){
    if(!COLUNAS.length){ setNavAtivo("dados"); $("#card-dados").scrollIntoView({behavior:"smooth", block:"start"}); return; }
    setNavAtivo("papeis");
    $("#card-papeis").scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  if(secao==="geral" || secao==="tempo" || secao==="validacao" || secao==="forense"){
    setModo(secao==="tempo" ? "tempo" : (secao==="validacao" ? "validacao" : (secao==="forense" ? "forense" : "analise")));
    setNavAtivo(secao);
    const alvo = secao==="tempo" ? $("#card-opcoes-tempo") : (secao==="validacao" ? $("#card-opcoes-validacao") : (secao==="forense" ? $("#card-opcoes-forense") : $("#card-opcoes")));
    (COLUNAS.length ? alvo : $("#card-dados")).scrollIntoView({behavior:"smooth", block:"start"});
    return;
  }
  if(secao==="resultados"){
    if($("#card-resultados").classList.contains("oculto")) return;
    setNavAtivo("resultados");
    $("#card-resultados").scrollIntoView({behavior:"smooth", block:"start"});
  }
}
document.querySelectorAll(".appnav-item").forEach(a=>a.addEventListener("click", e=>{
  e.preventDefault();
  if(a.classList.contains("travado")){
    if(a.dataset.nav==="resultados" && COLUNAS.length){ irPara(MODO==="tempo" ? "tempo" : (MODO==="validacao" ? "validacao" : (MODO==="forense" ? "forense" : "geral"))); return; }
    irPara("dados");
    return;
  }
  irPara(a.dataset.nav);
}));

/* ----------------------------------------------------------------------- */
/* Tabs                                                                    */
/* ----------------------------------------------------------------------- */
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => {
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("ativo"));
  t.classList.add("ativo");
  document.querySelectorAll(".painel").forEach(p=>p.classList.add("oculto"));
  document.querySelector(`.painel[data-painel="${t.dataset.modo}"]`).classList.remove("oculto");
}));

/* ----------------------------------------------------------------------- */
/* Modo: Análise geral × Mortalidade no tempo                              */
/* ----------------------------------------------------------------------- */
function setModo(m){
  if(MODO !== m) invalidarResultado("Modo de análise alterado");
  MODO = m;
  document.querySelectorAll(".analysis-mode[data-modo]").forEach(a=>
    a.classList.toggle("ativo", a.dataset.modo===m));
  $("#card-opcoes").classList.toggle("oculto", m!=="analise");
  $("#card-opcoes-tempo").classList.toggle("oculto", m!=="tempo");
  $("#card-opcoes-validacao").classList.toggle("oculto", m!=="validacao");
  $("#card-opcoes-forense").classList.toggle("oculto", m!=="forense");
  $("#card-resultados").classList.add("oculto");
  setNavTravado("resultados", true);
  if(COLUNAS.length){ renderPapeis(MODO==="tempo" ? adivinharPapeisTempo() : (MODO==="validacao" ? adivinharPapeisValidacao() : (MODO==="forense" ? adivinharPapeisForense() : adivinharPapeis()))); }
  preencherExemplosPorModo();
  atualizarPipeline();
  if(navItem("geral")) setNavAtivo(m==="tempo" ? "tempo" : (m==="validacao" ? "validacao" : (m==="forense" ? "forense" : "geral")));
}
document.querySelectorAll(".analysis-mode[data-modo]").forEach(a=>
  a.addEventListener("click", (e)=>{ e.preventDefault(); setModo(a.dataset.modo); }));
if(location.hash==="#tempo") setModo("tempo");
if(location.hash==="#validacao") setModo("validacao");
if(location.hash==="#forense") setModo("forense");
atualizarNav();

/* ----------------------------------------------------------------------- */
/* Parsing                                                                 */
/* ----------------------------------------------------------------------- */
function detectarSeparador(texto){
  const l = texto.split(/\r?\n/).find(x=>x.trim()!=="") || "";
  if (l.includes("\t")) return "\t";
  if ((l.match(/;/g)||[]).length >= (l.match(/,/g)||[]).length) return ";";
  return ",";
}
function parseTexto(texto){
  const sep = detectarSeparador(texto);
  const linhas = texto.split(/\r?\n/).filter(x=>x.trim()!=="");
  if (!linhas.length) throw new Error("Sem dados.");
  const matriz = linhas.map(l => l.split(sep).map(c=>c.trim()));
  return matriz;
}
function matrizParaColunas(matriz){
  const headers = matriz[0].map((h,i)=> h==="" ? `col${i+1}` : h);
  const corpo = matriz.slice(1);
  return headers.map((nome,i)=>({ nome, valores: corpo.map(l => l[i]!==undefined ? l[i] : "") }));
}
function aoaTexto(aoa){
  return (aoa || []).map(r => (r || []).map(c => c == null ? "" : String(c).trim()));
}
function cabAvaliacao(v){ return normCab(v); }
function ehCabTratamento(v){
  const n = cabAvaliacao(v);
  return n === "trat" || n === "tratamento" || n === "treatment";
}
function rotuloReplicata(v, fallback){
  const raw = String(v == null ? "" : v).trim();
  const n = cabAvaliacao(raw);
  if(["a","b","c","d"].includes(n)) return raw || n;
  if(/^r\d+$/.test(n) || /^rep\d+$/.test(n) || /^replicata\d+$/.test(n) || /^repeticao\d+$/.test(n)) return raw || n;
  if(/^rep$/.test(n) || /^replicata$/.test(n) || /^repeticao$/.test(n)) return raw || fallback;
  return "";
}
function celulaNumerica(v){ return Number.isFinite(numBR(v)); }
function buscarTituloAvaliacao(aoa, headerRow, col){
  for(let r=headerRow-1; r>=Math.max(0, headerRow-3); r--){
    const linha = aoa[r] || [];
    const ini = Math.max(0, col-2);
    const fim = Math.min(linha.length, col+8);
    for(let c=ini; c<fim; c++){
      const txt = textoLimpo(linha[c]);
      if(/avalia/i.test(txt)) return txt;
    }
  }
  return "";
}
function detectarBlocosAvaliacao(aoa){
  const blocos = [];
  aoa.forEach((linha, r) => {
    (linha || []).forEach((cel, c) => {
      if(!ehCabTratamento(cel)) return;
      const limite = Math.min((linha || []).length, c + 10);
      const reps = [];
      let mediaCol = -1;
      let eficienciaCol = -1;
      for(let j=c+1; j<limite; j++){
        if(ehCabTratamento(linha[j])) break;
        const n = cabAvaliacao(linha[j]);
        const rep = rotuloReplicata(linha[j], `rep${reps.length+1}`);
        if(n === "media" || n === "m") mediaCol = j;
        else if(n === "e" || n === "eficiencia" || n === "eficacia" || n === "controle") eficienciaCol = j;
        else if(rep) reps.push({col:j, rotulo:rep});
      }
      if(reps.length >= 2){
        blocos.push({
          headerRow: r,
          startCol: c,
          reps,
          mediaCol,
          eficienciaCol,
          titulo: buscarTituloAvaliacao(aoa, r, c),
        });
      }
    });
  });
  return blocos;
}
function matrizNumericaSemCabecalho(aoa){
  const linhas = aoa.filter(r => (r || []).some(c => textoLimpo(c) !== ""));
  if(linhas.length < 2) return null;
  const largura = Math.max(...linhas.map(r => r.length));
  if(largura < 3 || largura > 8) return null;
  let validas = 0;
  linhas.forEach(r => {
    const trat = textoLimpo(r[0]);
    const reps = [r[1], r[2], r[3], r[4]].filter(celulaNumerica);
    if(trat && reps.length >= 2) validas++;
  });
  if(validas < Math.max(2, Math.ceil(linhas.length * 0.6))) return null;
  const rows = [];
  linhas.forEach(r => {
    const tratamento = textoLimpo(r[0]);
    if(!tratamento) return;
    ["a","b","c","d"].forEach((rep, idx) => {
      const valor = numBR(r[idx+1]);
      if(Number.isFinite(valor)){
        rows.push({
          avaliacao: "Avaliação 1",
          tratamento,
          replicata: rep,
          resultado: valor,
          media_planilha: "",
          eficiencia_planilha: "",
        });
      }
    });
  });
  return rows.length ? {rows, blocos:1, semCabecalho:true} : null;
}
function linhasAvaliacaoModelo(aoaOriginal){
  const aoa = aoaTexto(aoaOriginal);
  const blocos = detectarBlocosAvaliacao(aoa);
  if(!blocos.length) return matrizNumericaSemCabecalho(aoa);
  const rows = [];
  blocos.forEach((bloco, idx) => {
    const titulo = bloco.titulo || "Avaliação";
    const avaliacao = blocos.length > 1 ? `${titulo} ${idx+1}` : titulo;
    for(let r=bloco.headerRow+1; r<aoa.length; r++){
      const linha = aoa[r] || [];
      const tratamento = textoLimpo(linha[bloco.startCol]);
      if(!tratamento) continue;
      if(/^obs\b/i.test(tratamento) || /^observa/i.test(tratamento)) break;
      const valores = bloco.reps
        .map(rep => ({rep, valor: numBR(linha[rep.col])}))
        .filter(x => Number.isFinite(x.valor));
      if(!valores.length) continue;
      const media = bloco.mediaCol >= 0 && celulaNumerica(linha[bloco.mediaCol]) ? String(numBR(linha[bloco.mediaCol])) : "";
      const eficiencia = bloco.eficienciaCol >= 0 ? textoLimpo(linha[bloco.eficienciaCol]) : "";
      valores.forEach(x => rows.push({
        avaliacao,
        tratamento,
        replicata: x.rep.rotulo,
        resultado: x.valor,
        media_planilha: media,
        eficiencia_planilha: eficiencia,
      }));
    }
  });
  if(!rows.length) return null;
  return {rows, blocos:blocos.length, semCabecalho:false};
}
function colunasAvaliacaoModelo(info){
  const rows = info.rows;
  return [
    {nome:"avaliacao", valores:rows.map(r=>r.avaliacao)},
    {nome:"tratamento", valores:rows.map(r=>r.tratamento)},
    {nome:"replicata", valores:rows.map(r=>r.replicata)},
    {nome:"resultado", valores:rows.map(r=>String(r.resultado))},
    {nome:"media_planilha", valores:rows.map(r=>r.media_planilha)},
    {nome:"eficiencia_planilha", valores:rows.map(r=>r.eficiencia_planilha)},
  ];
}
function resumoAvaliacaoModelo(info){
  const tratamentos = unicoOrdenado(info.rows.map(r=>r.tratamento)).length;
  const reps = unicoOrdenado(info.rows.map(r=>r.replicata)).length;
  const avaliacoes = unicoOrdenado(info.rows.map(r=>r.avaliacao)).length;
  return {tratamentos, reps, avaliacoes, linhas:info.rows.length};
}
function papeisAvaliacaoModelo(info){
  const resumo = resumoAvaliacaoModelo(info);
  if(MODO === "validacao"){
    return {
      resposta: "resultado",
      grupo: "tratamento",
      replicata: "replicata",
      dia: resumo.avaliacoes > 1 ? "avaliacao" : "",
    };
  }
  if(MODO === "forense"){
    return {resposta: "resultado", tratamento: "tratamento"};
  }
  return {
    resposta: "resultado",
    fatores: resumo.avaliacoes > 1 ? ["tratamento","avaliacao"] : ["tratamento"],
    bloco: "replicata",
  };
}
function setStatusColagem(msg){
  const box = $("#colar-status");
  if(box) box.textContent = msg || "";
}
function carregarAvaliacaoModeloSePossivel(matriz, fonte){
  const info = linhasAvaliacaoModelo(matriz);
  if(!info) return false;
  const resumo = resumoAvaliacaoModelo(info);
  const detalhe = `${resumo.avaliacoes} avaliação(ões), ${resumo.tratamentos} tratamento(s), ${resumo.reps} repetição(ões), ${resumo.linhas} valor(es)`;
  carregarColunas(colunasAvaliacaoModelo(info), papeisAvaliacaoModelo(info), Object.assign({}, fonte, {
    formato_detectado: info.semCabecalho ? "avaliacao-modelo-sem-cabecalho" : "avaliacao-modelo",
    detalhe: `Bloco de avaliação do modelo detectado: ${detalhe}`,
    avaliacoes: resumo.avaliacoes,
    tratamentos: resumo.tratamentos,
    repeticoes: resumo.reps,
    valores: resumo.linhas,
  }));
  setStatusColagem(`Avaliação detectada: ${detalhe}.`);
  return true;
}

/* Colar */
$("#btn-colar").addEventListener("click", () => {
  try {
    const texto = $("#entrada-colar").value;
    const matriz = parseTexto(texto);
    const fonte = {
      origem: "colar",
      detalhe: "Texto colado no painel Dados",
      separador: detectarSeparador(texto),
    };
    if(carregarAvaliacaoModeloSePossivel(matriz, fonte)){
      avisar("Bloco de avaliação carregado.", "ok");
      return;
    }
    carregarColunas(matrizParaColunas(matriz), null, {
      origem: "colar",
      detalhe: "Texto colado no painel Dados",
      separador: detectarSeparador(texto),
    });
    setStatusColagem("Tabela carregada no formato genérico.");
  }
  catch(e){ avisar("Não consegui ler: " + e.message); }
});

/* Arquivo */
$("#entrada-arquivo").addEventListener("change", async (ev) => {
  const file = ev.target.files[0]; if(!file) return;
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, {header:1, blankrows:false, defval:""});
    if (!aoa.length) throw new Error("planilha vazia");
    const fonte = {
      origem: "arquivo",
      arquivo: file.name,
      tamanho_bytes: file.size,
      tipo_mime: file.type || "",
      aba: wb.SheetNames[0],
      abas: wb.SheetNames,
    };
    if(carregarAvaliacaoModeloSePossivel(aoa, fonte)){
      avisar("Bloco de avaliação da planilha carregado.", "ok");
      return;
    }
    carregarColunas(matrizParaColunas(aoa.map(r=>r.map(c=>c===null?"":String(c)))), null, fonte);
  } catch(e){ avisar("Erro ao ler arquivo: " + e.message); }
});

/* Importar planilha exportada pelo Matriz */
function normCab(s){
  return String(s||"").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"");
}
function valorLinha(row, nomes){
  for(const nome of nomes){
    const k=normCab(nome);
    if(Object.prototype.hasOwnProperty.call(row,k)) return row[k];
  }
  return "";
}
function numBR(v){
  if(v==null || v==="") return NaN;
  if(typeof v==="number") return v;
  let s=String(v).trim();
  if(!s) return NaN;
  if(s.includes(",") && s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
  else s=s.replace(",",".");
  const n=parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}
function textoLimpo(v){ return String(v==null?"":v).trim(); }
function linhasMatrizDeAoa(aoa){
  const idx=aoa.findIndex(r=>{
    const ns=(r||[]).map(normCab);
    return ns.includes("tratamento") && ns.includes("variavel") && ns.includes("valor");
  });
  if(idx<0) throw new Error("Não achei cabeçalho do Matriz. Preciso de Tratamento, Variavel e Valor.");
  const headers=aoa[idx].map(normCab);
  const linhas=[];
  aoa.slice(idx+1).forEach((r,i)=>{
    const obj={_linha:i+idx+2};
    headers.forEach((h,j)=>{ if(h) obj[h]=r[j]; });
    const valor=numBR(valorLinha(obj,["Valor"]));
    const trat=textoLimpo(valorLinha(obj,["Tratamento"]));
    const variavel=textoLimpo(valorLinha(obj,["Variavel","Variável"]));
    if(!trat || !variavel || !Number.isFinite(valor)) return;
    linhas.push({
      local:textoLimpo(valorLinha(obj,["Local"])),
      quadra:textoLimpo(valorLinha(obj,["Quadra"])),
      cultura:textoLimpo(valorLinha(obj,["Cultura"])),
      estudo:textoLimpo(valorLinha(obj,["Estudo"])),
      descricao:textoLimpo(valorLinha(obj,["Descricao","Descrição"])),
      data:textoLimpo(valorLinha(obj,["Data_avaliacao","Data avaliação","Data_avaliação"])),
      tipo:textoLimpo(valorLinha(obj,["Tipo"])),
      bbch:textoLimpo(valorLinha(obj,["BBCH"])),
      tratamento:trat,
      repeticao:textoLimpo(valorLinha(obj,["Repeticao","Repetição","Bloco"])) || "1",
      produto:textoLimpo(valorLinha(obj,["Produto"])),
      variavel:variavel,
      valor:valor
    });
  });
  return linhas;
}
function matrizKey(r){ return [r.local,r.quadra,r.estudo,r.descricao].join("||"); }
function matrizLabel(key){
  const r=(MATRIZ_IMPORT&&MATRIZ_IMPORT.linhas||[]).find(x=>matrizKey(x)===key);
  if(!r) return key || "(sem estudo)";
  const partes=[r.estudo||"(sem estudo)", r.quadra, r.local].filter(Boolean);
  return partes.join(" - ");
}
function unicoOrdenado(arr){
  return [...new Set(arr.filter(v=>String(v).trim()!==""))].sort((a,b)=>String(a).localeCompare(String(b), "pt-BR", {numeric:true}));
}
function addOpcao(sel, valor, texto){
  const o=el("option"); o.value=valor; o.textContent=texto==null?valor:texto; sel.appendChild(o);
}
function matrizLinhasFiltradas(){
  if(!MATRIZ_IMPORT) return [];
  const estudo=$("#matriz-estudo") ? $("#matriz-estudo").value : "";
  const data=$("#matriz-data") ? $("#matriz-data").value : "";
  const variavel=$("#matriz-variavel") ? $("#matriz-variavel").value : "";
  return MATRIZ_IMPORT.linhas.filter(r=>
    (!estudo || matrizKey(r)===estudo) &&
    (!data || r.data===data) &&
    (!variavel || r.variavel===variavel)
  );
}
function atualizarMatrizFiltros(){
  if(!MATRIZ_IMPORT) return;
  const linhas=MATRIZ_IMPORT.linhas;
  const estudoSel=$("#matriz-estudo"), dataSel=$("#matriz-data"), varSel=$("#matriz-variavel");
  if(!estudoSel || !dataSel || !varSel) return;

  const estudo=estudoSel.value;
  const datas=unicoOrdenado(linhas.filter(r=>!estudo || matrizKey(r)===estudo).map(r=>r.data));
  const dataAtual=dataSel.value;
  dataSel.innerHTML="";
  datas.forEach(d=>addOpcao(dataSel,d,d));
  if(datas.includes(dataAtual)) dataSel.value=dataAtual;

  const data=dataSel.value;
  const vars=unicoOrdenado(linhas.filter(r=>
    (!estudo || matrizKey(r)===estudo) && (!data || r.data===data)
  ).map(r=>r.variavel));
  const varAtual=varSel.value;
  varSel.innerHTML="";
  vars.forEach(v=>addOpcao(varSel,v,v));
  if(vars.includes(varAtual)) varSel.value=varAtual;
  atualizarMatrizPreview();
}
function atualizarMatrizPreview(){
  const out=$("#matriz-preview"); if(!out) return;
  const linhas=matrizLinhasFiltradas();
  const trats=unicoOrdenado(linhas.map(r=>r.tratamento));
  const reps=unicoOrdenado(linhas.map(r=>r.repeticao));
  out.innerHTML="";
  out.appendChild(el("p","dica",`${linhas.length} valores prontos - ${trats.length} tratamento(s) x ${reps.length} repetição(ões).`));
  if(linhas.length){
    const tab=el("table");
    const thead=el("thead"), htr=el("tr");
    ["tratamento","bloco","valor","produto"].forEach(h=>htr.appendChild(el("th",null,h)));
    thead.appendChild(htr); tab.appendChild(thead);
    const tb=el("tbody");
    linhas.slice(0,6).forEach(r=>{
      const tr=el("tr");
      [r.tratamento,r.repeticao,String(r.valor),r.produto].forEach(v=>tr.appendChild(el("td",null,v)));
      tb.appendChild(tr);
    });
    tab.appendChild(tb);
    const rol=el("div","tab-rolavel"); rol.appendChild(tab); out.appendChild(rol);
  }
}
function renderMatrizImportador(){
  const box=$("#matriz-importador"); if(!box || !MATRIZ_IMPORT) return;
  box.innerHTML=""; box.classList.remove("oculto");
  box.appendChild(el("p","dica",`${MATRIZ_IMPORT.linhas.length} linhas de avaliação encontradas na aba Dados.`));

  const grid=el("div","matriz-grid");
  const estudoWrap=el("label",null,"Estudo");
  const estudoSel=el("select"); estudoSel.id="matriz-estudo";
  unicoOrdenado(MATRIZ_IMPORT.linhas.map(matrizKey)).forEach(k=>addOpcao(estudoSel,k,matrizLabel(k)));
  estudoWrap.appendChild(estudoSel); grid.appendChild(estudoWrap);

  const dataWrap=el("label",null,"Data");
  const dataSel=el("select"); dataSel.id="matriz-data";
  dataWrap.appendChild(dataSel); grid.appendChild(dataWrap);

  const varWrap=el("label",null,"Variável");
  const varSel=el("select"); varSel.id="matriz-variavel";
  varWrap.appendChild(varSel); grid.appendChild(varWrap);

  const produtoWrap=el("label","matriz-check");
  const produto=el("input"); produto.type="checkbox"; produto.id="matriz-produto";
  produtoWrap.appendChild(produto);
  produtoWrap.appendChild(document.createTextNode(" Incluir produto no nome do tratamento"));
  grid.appendChild(produtoWrap);
  box.appendChild(grid);

  const preview=el("div","matriz-preview"); preview.id="matriz-preview"; box.appendChild(preview);
  const btn=el("button","btn","Usar no BioEnsaio"); btn.type="button"; btn.addEventListener("click", usarMatrizNoBioensaio); box.appendChild(btn);

  estudoSel.addEventListener("change", atualizarMatrizFiltros);
  dataSel.addEventListener("change", atualizarMatrizFiltros);
  varSel.addEventListener("change", atualizarMatrizPreview);
  produto.addEventListener("change", atualizarMatrizPreview);
  atualizarMatrizFiltros();
}
function colunasBioensaioDeMatriz(linhas, resposta, incluirProduto){
  return [
    {nome:"tratamento", valores:linhas.map(r=>(incluirProduto && r.produto) ? `${r.tratamento} - ${r.produto}` : r.tratamento)},
    {nome:"bloco", valores:linhas.map(r=>r.repeticao || "1")},
    {nome:resposta, valores:linhas.map(r=>String(r.valor))},
    {nome:"produto", valores:linhas.map(r=>r.produto)},
    {nome:"estudo", valores:linhas.map(r=>r.estudo)},
    {nome:"data_avaliacao", valores:linhas.map(r=>r.data)}
  ];
}
function usarMatrizNoBioensaio(){
  const linhas=matrizLinhasFiltradas();
  if(!linhas.length){ avisar("Escolha um estudo/data/variável com valores numéricos."); return; }
  const resposta=$("#matriz-variavel").value || "valor";
  const incluirProduto=$("#matriz-produto") && $("#matriz-produto").checked;
  const cols=colunasBioensaioDeMatriz(linhas, resposta, incluirProduto);
  const ref=linhas[0] || {};
  preencherIdentificacaoSeVazia(
    gerarIdAuditoria("MATRIZ", [ref.estudo, ref.data, resposta].filter(Boolean).join(" ")),
    "Importação Matriz"
  );
  setModo("analise");
  carregarColunas(cols, {resposta:resposta, fatores:["tratamento"], bloco:"bloco"}, {
    origem: "matriz",
    arquivo: MATRIZ_IMPORT?.arquivo || "",
    aba: MATRIZ_IMPORT?.sheet || "",
    estudo: ref.estudo || "",
    data: ref.data || "",
    variavel: resposta,
    incluir_produto: !!incluirProduto,
  });
}
const entradaMatriz=$("#entrada-matriz");
if(entradaMatriz){
  entradaMatriz.addEventListener("change", async (ev)=>{
    const file=ev.target.files[0]; if(!file) return;
    try{
      const buf=await file.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array"});
      const sheetName=wb.SheetNames.includes("Dados") ? "Dados" : wb.SheetNames[0];
      const ws=wb.Sheets[sheetName];
      const aoa=XLSX.utils.sheet_to_json(ws,{header:1, blankrows:false, defval:""});
      const linhas=linhasMatrizDeAoa(aoa);
      if(!linhas.length) throw new Error("A aba Dados foi encontrada, mas não há linhas com Tratamento, Variavel e Valor numérico.");
      MATRIZ_IMPORT={arquivo:file.name, sheet:sheetName, linhas};
      renderMatrizImportador();
    }catch(e){
      MATRIZ_IMPORT=null;
      const box=$("#matriz-importador"); if(box){ box.innerHTML=""; box.classList.add("oculto"); }
      avisar("Não consegui importar a planilha do Matriz: " + e.message);
    }
  });
}
window.__bioensaioMatriz = {
  linhasMatrizDeAoa,
  matrizKey,
  colunasBioensaioDeMatriz,
  linhasAvaliacaoModelo,
  colunasAvaliacaoModelo,
  resumoAvaliacaoModelo,
  numBR,
  normCab,
};

/* Exemplos (mode-aware) */
function conjuntoExemplos(){
  if(MODO==="tempo") return window.EXEMPLOS_TEMPO || {};
  if(MODO==="validacao") return window.EXEMPLOS_VALIDACAO || {};
  if(MODO==="forense") return window.EXEMPLOS_FORENSE || {};
  return window.EXEMPLOS || {};
}
function preencherExemplosPorModo(){
  const sel = $("#sel-exemplo"); if(!sel) return;
  sel.innerHTML="";
  Object.keys(conjuntoExemplos()).forEach(nome=>{
    const o = el("option"); o.value=nome; o.textContent=nome; sel.appendChild(o);
  });
}
preencherExemplosPorModo();
$("#btn-exemplo").addEventListener("click", () => {
  const nomeExemplo = $("#sel-exemplo").value;
  const ex = conjuntoExemplos()[nomeExemplo];
  if(!ex) return;
  const cols = ex.colunas.map((nome,i)=>({ nome, valores: ex.linhas.map(l=>String(l[i])) }));
  preencherIdentificacaoSeVazia(gerarIdAuditoria("EXEMPLO", nomeExemplo), "BioEnsaio demo");
  carregarColunas(cols, Object.assign({}, ex.papeis, ex.papeis_extra||{}), {
    origem: "exemplo",
    nome: nomeExemplo,
    modo: MODO,
  });
});

/* Digitar — grade editável */
function montarGrade(nCols=3, nLin=4){
  const wrap = $("#grade-wrap"); wrap.innerHTML="";
  const tab = el("table","grade");
  const thead = el("thead"); const trh = el("tr");
  for(let c=0;c<nCols;c++){ const th=el("th"); const i=el("input"); i.value=["tratamento","x","y"][c]||`col${c+1}`; i.dataset.col=c; th.appendChild(i); trh.appendChild(th); }
  thead.appendChild(trh); tab.appendChild(thead);
  const tb = el("tbody");
  for(let r=0;r<nLin;r++){ const tr=el("tr"); for(let c=0;c<nCols;c++){ const td=el("td"); const i=el("input"); td.appendChild(i); tr.appendChild(td);} tb.appendChild(tr); }
  tab.appendChild(tb); wrap.appendChild(tab);
}
montarGrade();
$("#add-col").addEventListener("click", ()=>{
  const tab=$(".grade"); const c=tab.querySelectorAll("thead th").length;
  const th=el("th"); const i=el("input"); i.value=`col${c+1}`; th.appendChild(i); tab.querySelector("thead tr").appendChild(th);
  tab.querySelectorAll("tbody tr").forEach(tr=>{ const td=el("td"); td.appendChild(el("input")); tr.appendChild(td); });
});
$("#add-lin").addEventListener("click", ()=>{
  const tab=$(".grade"); const nc=tab.querySelectorAll("thead th").length;
  const tr=el("tr"); for(let c=0;c<nc;c++){ const td=el("td"); td.appendChild(el("input")); tr.appendChild(td);} tab.querySelector("tbody").appendChild(tr);
});
$("#btn-digitar").addEventListener("click", ()=>{
  const tab=$(".grade");
  const headers=[...tab.querySelectorAll("thead input")].map(i=>i.value.trim()||"col");
  const linhas=[...tab.querySelectorAll("tbody tr")].map(tr=>[...tr.querySelectorAll("input")].map(i=>i.value.trim()));
  const validas=linhas.filter(l=>l.some(c=>c!==""));
  if(!validas.length){ avisar("Preencha ao menos uma linha."); return; }
  carregarColunas(headers.map((nome,i)=>({nome, valores: validas.map(l=>l[i]||"")})), null, {
    origem: "digitar",
    detalhe: "Tabela digitada na grade editável",
  });
});

/* ----------------------------------------------------------------------- */
/* Carregar colunas → preview + papéis                                     */
/* ----------------------------------------------------------------------- */
function ehNumerica(valores){
  let ok=0,tot=0;
  valores.forEach(v=>{ if(String(v).trim()===""){return;} tot++; if(!isNaN(parseFloat(String(v).replace(",",".")))) ok++; });
  return tot>0 && ok/tot>0.7;
}
function adivinharPapeis(){
  const papeis = {};
  const usado = {};
  COLUNAS.forEach(col=>{
    const n = col.nome.toLowerCase();
    let papel = "ignorar";
    if(/dose|dosagem|conc|ppm|concentra/.test(n)) papel="dose";
    else if(/^n$|total|testad|n_?test|num_?test|n_?total/.test(n)) papel="n_total";
    else if(/bloco|block|repet|^rep$|^rep\d/.test(n)) papel="bloco";
    else if(/trat|produto|isolad|meio|lote|cultivar|variedad|fungic|inset|herbic|fator|grupo|especie|esp\b/.test(n)) papel="fator";
    else if(/mort|afet|resp|incid|doente|germin|viv|event|sever|sobreviv|nota|diam|cresc|peso|altura|colon|conta|num/.test(n)) papel="resposta";
    papeis[col.nome]=papel; usado[papel]=(usado[papel]||0)+1;
  });
  // garante exatamente uma resposta: se nenhuma, usa a última coluna numérica livre
  if(!Object.values(papeis).includes("resposta")){
    for(let i=COLUNAS.length-1;i>=0;i--){
      const c=COLUNAS[i];
      if(["ignorar","fator"].includes(papeis[c.nome]) && ehNumerica(c.valores)){ papeis[c.nome]="resposta"; break; }
    }
  }
  // se há dose mas nenhum n_total e a resposta parece proporção pequena, mantém
  return papeis;
}
function montarFonteDados(fonte, cols){
  const base = fonte || {};
  const linhas = cols[0]?.valores?.length || 0;
  return Object.assign({
    origem: base.origem || "não informado",
    detalhe: base.detalhe || "",
    carregado_em: new Date().toISOString(),
    linhas,
    colunas: cols.length,
    nomes_colunas: cols.map(c=>c.nome),
  }, base);
}
function carregarColunas(cols, papeisForcados, fonteDados){
  invalidarResultado("Dados alterados");
  COLUNAS = cols;
  FONTE_DADOS = montarFonteDados(fonteDados, cols);
  renderPreview();
  let papeis;
  if(MODO==="tempo") papeis = papeisForcados ? papeisDeExemploTempo(papeisForcados) : adivinharPapeisTempo();
  else if(MODO==="validacao") papeis = papeisForcados ? papeisDeExemploValidacao(papeisForcados) : adivinharPapeisValidacao();
  else if(MODO==="forense") papeis = papeisForcados ? papeisDeExemploForense(papeisForcados) : adivinharPapeisForense();
  else papeis = papeisForcados ? papeisDeExemplo(papeisForcados) : adivinharPapeis();
  renderPapeis(papeis);
  $("#card-papeis").classList.remove("oculto");
  $("#card-opcoes").classList.toggle("oculto", MODO!=="analise");
  $("#card-opcoes-tempo").classList.toggle("oculto", MODO!=="tempo");
  $("#card-opcoes-validacao").classList.toggle("oculto", MODO!=="validacao");
  $("#card-opcoes-forense").classList.toggle("oculto", MODO!=="forense");
  $("#card-resultados").classList.add("oculto");
  setNavTravado("resultados", true);
  $(".acao-fixa").classList.remove("oculto");
  $("#btn-analisar").disabled = false;
  atualizarPipeline();
  atualizarNav();
  setNavAtivo("papeis");
  garantirPyodide().catch(e=>console.error(e));
  $("#card-papeis").scrollIntoView({behavior:"smooth", block:"start"});
}
function papeisDeExemplo(p){
  const map={};
  COLUNAS.forEach(c=>map[c.nome]="ignorar");
  if(p.resposta) map[p.resposta]="resposta";
  if(p.n_total) map[p.n_total]="n_total";
  if(p.dose) map[p.dose]="dose";
  if(p.bloco) map[p.bloco]="bloco";
  (p.fatores||[]).forEach(f=>map[f]="fator");
  return map;
}
function papeisDeExemploTempo(p){
  const map={};
  COLUNAS.forEach(c=>map[c.nome]="ignorar");
  ["tratamento","tempo","n_total","n_vivos","repeticao","item_teste"].forEach(k=>{
    if(p[k]) map[p[k]]=k;
  });
  return map;
}
function papeisDeExemploValidacao(p){
  const map={};
  COLUNAS.forEach(c=>map[c.nome]="ignorar");
  ["resposta","concentracao","grupo","analista","dia","matriz","replicata","referencia","branco"].forEach(k=>{
    if(p[k]) map[p[k]]=k;
  });
  return map;
}
function papeisDeExemploForense(p){
  const map={};
  COLUNAS.forEach(c=>map[c.nome]="ignorar");
  ["resposta","tratamento","resposta2"].forEach(k=>{
    if(p[k]) map[p[k]]=k;
  });
  return map;
}
function renderPreview(){
  const wrap=$("#preview"); wrap.innerHTML=""; wrap.classList.remove("oculto");
  const n = Math.min(6, COLUNAS[0]?.valores.length||0);
  const tab=el("table");
  const trh=el("tr"); COLUNAS.forEach(c=>trh.appendChild(el("th",null,c.nome)));
  const thead=el("thead"); thead.appendChild(trh); tab.appendChild(thead);
  const tb=el("tbody");
  for(let r=0;r<n;r++){ const tr=el("tr"); COLUNAS.forEach(c=>tr.appendChild(el("td",null,c.valores[r]??""))); tb.appendChild(tr); }
  tab.appendChild(tb);
  const cap=el("p","dica",`${COLUNAS[0]?.valores.length||0} linhas × ${COLUNAS.length} colunas (mostrando ${n})`);
  wrap.appendChild(cap);
  const rol=el("div","tab-rolavel"); rol.appendChild(tab); wrap.appendChild(rol);
}
const PAPEL_OPCOES = [["resposta","Resposta"],["dose","Dose/concentração"],["fator","Fator/tratamento"],["bloco","Bloco/repetição"],["n_total","n total (x de n)"],["ignorar","Ignorar"]];
const PAPEL_OPCOES_TEMPO = [["tratamento","Tratamento"],["tempo","Tempo (dia/hora)"],["n_total","N total (inicial)"],["n_vivos","N vivos"],["repeticao","Repetição"],["item_teste","Item/produto"],["ignorar","Ignorar"]];
const PAPEL_OPCOES_VALIDACAO = [
  ["resposta","Resposta/resultado"],
  ["concentracao","Concentração/nível"],
  ["referencia","Valor referência/fortificado"],
  ["grupo","Grupo/condição"],
  ["analista","Analista"],
  ["dia","Dia/série"],
  ["matriz","Matriz/amostra"],
  ["replicata","Replicata"],
  ["branco","Branco?"],
  ["ignorar","Ignorar"]
];
const PAPEL_OPCOES_FORENSE = [
  ["resposta","Resposta (numérica)"],
  ["tratamento","Tratamento/grupo"],
  ["resposta2","2ª avaliação (opcional)"],
  ["ignorar","Ignorar"]
];
function renderPapeis(papeis){
  const lista=$("#papeis-lista"); lista.innerHTML="";
  const opcoes = MODO==="tempo" ? PAPEL_OPCOES_TEMPO : (MODO==="validacao" ? PAPEL_OPCOES_VALIDACAO : (MODO==="forense" ? PAPEL_OPCOES_FORENSE : PAPEL_OPCOES));
  COLUNAS.forEach(col=>{
    const item=el("div","papel-item");
    item.appendChild(el("span","papel-nome",col.nome));
    const sel=el("select"); sel.dataset.coluna=col.nome;
    opcoes.forEach(([v,t])=>{ const o=el("option"); o.value=v; o.textContent=t; if(papeis[col.nome]===v)o.selected=true; sel.appendChild(o); });
    sel.addEventListener("change", ()=>{
      if(MODO==="tempo") popularControleNeg();
      invalidarResultado("Papéis das colunas alterados");
      atualizarPipeline();
    });
    item.appendChild(sel); lista.appendChild(item);
  });
  if(MODO==="tempo") popularControleNeg();
}
function adivinharPapeisTempo(){
  const papeis={};
  COLUNAS.forEach(col=>{
    const n=col.nome.toLowerCase(); let p="ignorar";
    if(/n[_\s]?vivo|vivos|alive|^live|sobreviv/.test(n)) p="n_vivos";
    else if(/n[_\s]?total|inicial|initial|^total$|^n$|n[_\s]?inicial/.test(n)) p="n_total";
    else if(/tempo|dia|hora|^dap$|day|hour|tempo[_\s]?valor/.test(n)) p="tempo";
    else if(/repet|^rep$|^rep\d|replic|bloco/.test(n)) p="repeticao";
    else if(/item|produto|test[_\s]?item|item[_\s]?teste/.test(n)) p="item_teste";
    else if(/trat|treatment$|^trat/.test(n)) p="tratamento";
    papeis[col.nome]=p;
  });
  if(!Object.values(papeis).includes("tratamento")){
    const c=COLUNAS.find(c=>papeis[c.nome]==="ignorar" && !ehNumerica(c.valores));
    if(c) papeis[c.nome]="tratamento";
  }
  return papeis;
}
function adivinharPapeisValidacao(){
  const papeis={};
  COLUNAS.forEach(col=>{
    const n=col.nome.toLowerCase(); let p="ignorar";
    if(/refer|teor|esperad|fortific|valor[_\s]?real|valor[_\s]?alvo|alvo|nominal/.test(n)) p="referencia";
    else if(/conc|concent|nivel|nível|calib|padrao|padrão|dose|x$/.test(n)) p="concentracao";
    else if(/resposta|resultado|sinal|area|área|absorb|leitura|medid|valor|y$/.test(n)) p="resposta";
    else if(/analista|operador|tecnico|técnico/.test(n)) p="analista";
    else if(/dia|data|serie|série|corrida|run|ensaio/.test(n)) p="dia";
    else if(/matriz|amostra|matrix|sample/.test(n)) p="matriz";
    else if(/replic|repet|^rep$|replica|réplica/.test(n)) p="replicata";
    else if(/branco|blank/.test(n)) p="branco";
    else if(/grupo|condic|condição|condicao|robust|lote|laboratorio|laboratório|lab/.test(n)) p="grupo";
    papeis[col.nome]=p;
  });
  if(!Object.values(papeis).includes("resposta")){
    for(let i=COLUNAS.length-1;i>=0;i--){
      const c=COLUNAS[i];
      if(["ignorar","referencia","concentracao"].includes(papeis[c.nome]) && ehNumerica(c.valores)){
        papeis[c.nome]="resposta";
        break;
      }
    }
  }
  return papeis;
}
function adivinharPapeisForense(){
  const papeis={};
  COLUNAS.forEach(col=>{
    const n=col.nome.toLowerCase(); let p="ignorar";
    if(/trat|produto|grupo|isolad|cultivar|variedad|fator|parcela/.test(n)) p="tratamento";
    else if(/resposta2|aval2|leitura2|segunda|conta2|valor2|y2|2$/.test(n)) p="resposta2";
    else if(/resp|result|conta|colon|sever|nota|valor|leitura|incid|mort|num|y$/.test(n)) p="resposta";
    papeis[col.nome]=p;
  });
  // tratamento: 1ª coluna de texto livre, se não houver
  if(!Object.values(papeis).includes("tratamento")){
    const c=COLUNAS.find(c=>papeis[c.nome]==="ignorar" && !ehNumerica(c.valores));
    if(c) papeis[c.nome]="tratamento";
  }
  // resposta: 1ª coluna numérica livre, se não houver
  if(!Object.values(papeis).includes("resposta")){
    const c=COLUNAS.find(c=>papeis[c.nome]==="ignorar" && ehNumerica(c.valores));
    if(c) papeis[c.nome]="resposta";
  }
  return papeis;
}
function popularControleNeg(){
  const sel=$("#opt-controle-neg"); if(!sel) return;
  // acha a coluna marcada como tratamento
  let tratCol=null;
  document.querySelectorAll("#papeis-lista select").forEach(s=>{ if(s.value==="tratamento") tratCol=s.dataset.coluna; });
  const atual=sel.value;
  sel.innerHTML='<option value="">(1º tratamento)</option>';
  if(tratCol){
    const col=COLUNAS.find(c=>c.nome===tratCol);
    if(col){
      const niveis=[...new Set(col.valores.map(v=>String(v).trim()).filter(v=>v!==""))]
        .sort((a,b)=>{ const na=parseInt((a.match(/\d+/)||[1e9])[0]), nb=parseInt((b.match(/\d+/)||[1e9])[0]); return na-nb || a.localeCompare(b); });
      niveis.forEach(v=>{ const o=el("option"); o.value=v; o.textContent=v; if(v===atual)o.selected=true; sel.appendChild(o); });
    }
  }
}
function lerPapeis(){
  const r={ fatores:[] };
  document.querySelectorAll("#papeis-lista select").forEach(sel=>{
    const col=sel.dataset.coluna, p=sel.value;
    if(p==="resposta") r.resposta=col;
    else if(p==="dose") r.dose=col;
    else if(p==="bloco") r.bloco=col;
    else if(p==="n_total") r.n_total=col;
    else if(p==="fator") r.fatores.push(col);
  });
  const tipo=$("#opt-tipo").value; if(tipo) r.tipo_resposta=tipo;
  return r;
}
function montarDados(){
  const d={}; COLUNAS.forEach(c=>d[c.nome]=c.valores); return d;
}
function lerIdentificacao(){
  return {
    estudo: ($("#audit-estudo")?.value || "").trim(),
    responsavel: ($("#audit-responsavel")?.value || "").trim(),
  };
}
function lerCustodia(){
  const c = {
    origem_primaria: ($("#audit-origem-bruta")?.value || "").trim(),
    registro_bruto: ($("#audit-registro-bruto")?.value || "").trim(),
    coletor_origem: ($("#audit-coletor")?.value || "").trim(),
    data_hora_coleta: ($("#audit-data-coleta")?.value || "").trim(),
    local_equipamento: ($("#audit-local-equipamento")?.value || "").trim(),
    observacao_anexo: ($("#audit-observacao-custodia")?.value || "").trim(),
  };
  const valores = Object.values(c).filter(Boolean);
  c.informada = valores.length > 0;
  c.minima = !!(c.origem_primaria && c.registro_bruto);
  return c;
}
function resumoCustodia(custodia){
  const c = custodia || lerCustodia();
  const informada = !!c.informada || ["origem_primaria","registro_bruto","coletor_origem","data_hora_coleta","local_equipamento","observacao_anexo"].some(k=>!!c[k]);
  const minima = !!c.minima || !!(c.origem_primaria && c.registro_bruto);
  if(!informada) return "ausente";
  if(minima) return "mínima registrada";
  return "parcial";
}
function gerarIdAuditoria(prefixo, texto){
  const base = String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 56);
  return [prefixo, base].filter(Boolean).join("-").slice(0, 80) || prefixo;
}
function preencherIdentificacaoSeVazia(estudo, responsavel){
  const estudoEl = $("#audit-estudo");
  const respEl = $("#audit-responsavel");
  if(estudoEl && !estudoEl.value.trim() && estudo) estudoEl.value = estudo;
  if(respEl && !respEl.value.trim() && responsavel) respEl.value = responsavel;
  atualizarPipeline();
}
function lerPapeisTempo(){
  const r={};
  document.querySelectorAll("#papeis-lista select").forEach(sel=>{
    const col=sel.dataset.coluna, p=sel.value;
    if(p!=="ignorar") r[p]=col;
  });
  return r;
}
function lerPapeisValidacao(){
  const r={};
  document.querySelectorAll("#papeis-lista select").forEach(sel=>{
    const col=sel.dataset.coluna, p=sel.value;
    if(p!=="ignorar") r[p]=col;
  });
  return r;
}
function lerPapeisForense(){
  const r={};
  document.querySelectorAll("#papeis-lista select").forEach(sel=>{
    const col=sel.dataset.coluna, p=sel.value;
    if(p==="resposta"||p==="tratamento"||p==="resposta2") r[p]=col;
  });
  return r;
}

/* ----------------------------------------------------------------------- */
/* Pipeline guiado + QA/QC                                                 */
/* ----------------------------------------------------------------------- */
function papelSelecoesAtuais(){
  const porColuna={}, porPapel={};
  document.querySelectorAll("#papeis-lista select").forEach(sel=>{
    const col=sel.dataset.coluna, papel=sel.value;
    porColuna[col]=papel;
    if(papel!=="ignorar"){
      if(!porPapel[papel]) porPapel[papel]=[];
      porPapel[papel].push(col);
    }
  });
  return {porColuna, porPapel};
}
function colunaPorNome(nome){ return COLUNAS.find(c=>c.nome===nome); }
function valoresColuna(nome){ return (colunaPorNome(nome)||{}).valores || []; }
function linhasAtuais(){
  const n=COLUNAS[0]?.valores.length || 0;
  return Array.from({length:n}, (_,i)=>{
    const row={};
    COLUNAS.forEach(c=>row[c.nome]=c.valores[i] ?? "");
    return row;
  });
}
function textoValor(v){ return String(v==null?"":v).trim(); }
function valoresValidos(arr){ return arr.map(textoValor).filter(v=>v!==""); }
function nUnicos(arr){ return new Set(valoresValidos(arr)).size; }
function taxaNumerica(arr){
  const vals=valoresValidos(arr);
  if(!vals.length) return {total:0, ok:0, taxa:0};
  const ok=vals.filter(v=>Number.isFinite(numBR(v))).length;
  return {total:vals.length, ok, taxa:ok/vals.length};
}
function numsColuna(nome){ return valoresColuna(nome).map(v=>numBR(v)); }
function pushCheck(checks, severidade, titulo, detalhe, bloqueia=false){
  checks.push({severidade, titulo, detalhe, bloqueia: !!bloqueia});
}
function checksRastreabilidade(){
  const checks=[];
  const ident=lerIdentificacao();
  if(ident.estudo) pushCheck(checks,"ok","ID do estudo registrado",ident.estudo);
  else pushCheck(checks,"critico","ID do estudo obrigatório","Informe um identificador do estudo antes de analisar.", true);
  if(ident.responsavel) pushCheck(checks,"ok","Responsável registrado",ident.responsavel);
  else pushCheck(checks,"critico","Responsável obrigatório","Informe o responsável pela execução ou revisão antes de analisar.", true);
  return checks;
}
function checksCustodia(modo){
  const checks=[];
  const c=lerCustodia();
  if(c.minima){
    pushCheck(checks,"ok","Cadeia de custódia mínima",`${c.origem_primaria} · ${c.registro_bruto}`);
  }else if(c.informada){
    pushCheck(checks,"aviso","Cadeia de custódia parcial","Informe pelo menos origem primária e registro bruto para fortalecer a rastreabilidade.");
  }else{
    const msg = modo==="forense"
      ? "Triagem forense fica mais fraca sem origem primária e registro bruto."
      : "Informe origem primária e registro bruto quando o registro precisar de rastreabilidade formal.";
    pushCheck(checks,"aviso","Cadeia de custódia ausente",msg);
  }
  return checks;
}
function checksProntidaoSistema(){
  const checks=[];
  const p = carregarProntidaoSistema();
  if(p){
    pushCheck(checks,"ok","Autoteste da versão aprovado",`${APP_VERSION} · ${p.checks_ok || 0} OK · pacote ${String(p.pacote_sha256 || "").slice(0,12)}…`);
  }else if(!window.__agractaEmbed){
    pushCheck(checks,"critico","Autoteste da versão obrigatório","Execute o Autoteste desta versão antes de liberar qualquer análise.", true);
  }
  /* Embutido no Agracta: SEM gate nem aviso de autoteste — o motor já faz parte do app auditado. */
  return checks;
}
function nomeControleProvavel(v){
  return /controle|testemunha|control|check|sem\s*trat|negativo/i.test(String(v||""));
}
function inferirTipoResposta(papeis){
  if(papeis.tipo_resposta) return papeis.tipo_resposta;
  if(papeis.n_total) return "binomial";
  const resp=valoresValidos(valoresColuna(papeis.resposta));
  if(!resp.length) return "";
  const norm=resp.map(v=>v.toLowerCase());
  const palavrasBinarias=norm.every(v=>/^(sim|s|yes|y|true|1|nao|não|n|no|false|0|vivo|morto|germinou|nao germinou|não germinou)$/.test(v));
  if(palavrasBinarias) return "binario";
  const nums=resp.map(v=>numBR(v));
  const numericos=nums.filter(Number.isFinite);
  if(numericos.length/resp.length < .7) return "continua";
  const inteiros=numericos.every(v=>Number.isInteger(v) && v>=0);
  const nome=(papeis.resposta||"").toLowerCase();
  if(inteiros && /mort|vivo|afet|evento|germin|doente|colon|cont|n[ºo]?/i.test(nome)) return "contagem";
  if(numericos.every(v=>v>=0 && v<=100) && /sev|incid|porc|percent|%|efic|mortal/i.test(nome)) return "proporcao";
  return "continua";
}
function rotaGeral(papeis, tipo){
  const temDose=!!papeis.dose;
  const fatores=(papeis.fatores||[]).length;
  if(temDose && ["binario","binomial"].includes(tipo)){
    return {
      titulo:"Dose-resposta",
      descricao:"Ajustar curva logit/probit, estimar CL/DL e avaliar aderência/heterogeneidade.",
      chips:["curva","CL/DL","Abbott se informado"]
    };
  }
  if(temDose && !["binario","binomial"].includes(tipo)){
    return {
      titulo:"Dose como tratamento",
      descricao:"Resposta não-binomial com coluna de dose; comparar níveis de dose como tratamentos ou avançar para regressão.",
      chips:["dose","comparação"]
    };
  }
  if(tipo==="binomial" && fatores){
    return {titulo:"GLM binomial", descricao:"Comparar proporções x de n por tratamento, com letras por contrastes.", chips:["x de n","logístico"]};
  }
  if(tipo==="binario" && fatores){
    return {titulo:"GLM binomial agregado", descricao:"Agregar eventos individuais por tratamento e comparar proporções.", chips:["binário","agregação"]};
  }
  if(tipo==="contagem" && fatores){
    return {titulo:"GLM de contagem", descricao:"Usar Poisson e trocar para binomial negativa se houver sobredispersão.", chips:["Poisson","sobredispersão"]};
  }
  if(["continua","proporcao"].includes(tipo) && fatores){
    return {titulo:"ANOVA + pós-teste", descricao:"Checar pressupostos, transformar se necessário e comparar médias.", chips:["ANOVA","Tukey/Scott-Knott"]};
  }
  return {titulo:"Descritiva", descricao:"Sem fator/tratamento suficiente; apresentar estatística descritiva e normalidade.", chips:["resumo"]};
}
function checarDuplicatasGerais(checks){
  const rows=linhasAtuais();
  const vistos=new Set();
  let duplicatas=0;
  rows.forEach(r=>{
    const key=COLUNAS.map(c=>textoValor(r[c.nome])).join("||");
    if(vistos.has(key)) duplicatas++;
    else vistos.add(key);
  });
  if(duplicatas) pushCheck(checks,"aviso","Linhas duplicadas",`${duplicatas} linha(s) idêntica(s) no arquivo. Confira se não é lançamento repetido.`);
  else pushCheck(checks,"ok","Duplicatas exatas","Nenhuma linha idêntica encontrada.");
}
function avaliarPipelineGeral(){
  const checks=[];
  const sel=papelSelecoesAtuais();
  const papeis=lerPapeis();
  const nLin=COLUNAS[0]?.valores.length || 0;
  pushCheck(checks,"ok","Dados carregados",`${nLin} linha(s) e ${COLUNAS.length} coluna(s).`);

  ["resposta","dose","bloco","n_total"].forEach(p=>{
    if((sel.porPapel[p]||[]).length>1) pushCheck(checks,"critico","Papéis conflitantes",`Mais de uma coluna marcada como ${p}: ${sel.porPapel[p].join(", ")}.`, true);
  });
  if(!papeis.resposta) pushCheck(checks,"critico","Resposta ausente","Marque uma coluna como Resposta.", true);

  const tipo=papeis.resposta ? inferirTipoResposta(papeis) : "";
  const rota=rotaGeral(papeis, tipo);

  if(papeis.resposta){
    const resp=valoresColuna(papeis.resposta);
    const faltantes=resp.filter(v=>textoValor(v)==="").length;
    if(faltantes) pushCheck(checks,"aviso","Resposta com vazios",`${faltantes} linha(s) sem valor de resposta.`);
    const taxa=taxaNumerica(resp);
    if(!["binario"].includes(tipo) && taxa.total && taxa.taxa<.9){
      pushCheck(checks,"critico","Resposta não-numérica",`Apenas ${taxa.ok}/${taxa.total} valores da resposta são numéricos.`, true);
    } else {
      pushCheck(checks,"ok","Resposta compatível",`Tipo inferido: ${tipo || "a confirmar"}.`);
    }
  }

  if(papeis.n_total){
    const y=numsColuna(papeis.resposta), n=numsColuna(papeis.n_total);
    let invalidos=0, impossiveis=0;
    n.forEach((nn,i)=>{
      if(!Number.isFinite(nn) || nn<=0 || !Number.isFinite(y[i])) invalidos++;
      else if(y[i]<0 || y[i]>nn) impossiveis++;
    });
    if(invalidos) pushCheck(checks,"critico","Binomial incompleto",`${invalidos} linha(s) com resposta ou n total inválidos.`, true);
    if(impossiveis) pushCheck(checks,"critico","Eventos impossíveis",`${impossiveis} linha(s) com eventos < 0 ou eventos > n total.`, true);
    if(!invalidos && !impossiveis) pushCheck(checks,"ok","x de n válido","Eventos e totais passam na checagem básica.");
  }

  if(papeis.dose){
    const dose=numsColuna(papeis.dose);
    const invalidas=dose.filter(v=>!Number.isFinite(v)).length;
    const positivas=[...new Set(dose.filter(v=>Number.isFinite(v) && v>0).map(v=>String(v)))];
    if(invalidas) pushCheck(checks,"critico","Dose não-numérica",`${invalidas} linha(s) com dose inválida.`, true);
    else pushCheck(checks,"ok","Dose numérica",`${positivas.length} nível(is) positivo(s) de dose.`);
    if(["binario","binomial"].includes(tipo) && positivas.length<3){
      pushCheck(checks,"critico","Poucos níveis de dose","Dose-resposta precisa de pelo menos 3 doses positivas para estimar curva com segurança.", true);
    }
  }

  const fatores=papeis.fatores||[];
  if(fatores.length){
    const chave=fatores.map(f=>valoresColuna(f));
    const grupos=new Map();
    for(let i=0;i<nLin;i++){
      const g=fatores.map((f,j)=>textoValor(chave[j][i])).join(" / ");
      if(!g.trim()) continue;
      grupos.set(g,(grupos.get(g)||0)+1);
    }
    if(grupos.size<2 && !papeis.dose) pushCheck(checks,"critico","Poucos tratamentos","É preciso ao menos 2 tratamentos/grupos para comparação.", true);
    else pushCheck(checks,"ok","Tratamentos detectados",`${grupos.size} tratamento(s)/grupo(s).`);
    const poucos=[...grupos.entries()].filter(([,n])=>n<2).map(([g])=>g);
    if(poucos.length) pushCheck(checks,"aviso","Repetição baixa",`${poucos.slice(0,4).join(", ")}${poucos.length>4?"...":""} com menos de 2 repetição(ões).`);
  } else if(!papeis.dose){
    pushCheck(checks,"aviso","Sem fator/tratamento","A rota ficará limitada a descritiva se nenhum fator for marcado.");
  }

  if(papeis.bloco){
    const vazios=valoresColuna(papeis.bloco).filter(v=>textoValor(v)==="").length;
    if(vazios) pushCheck(checks,"aviso","Bloco incompleto",`${vazios} linha(s) sem bloco/repetição.`);
    else pushCheck(checks,"ok","Blocos preenchidos",`${nUnicos(valoresColuna(papeis.bloco))} bloco(s)/repetição(ões).`);
  }

  if(papeis.n_total && papeis.resposta){
    const rows=linhasAtuais();
    const y=numsColuna(papeis.resposta), n=numsColuna(papeis.n_total);
    const controle=rows.map((r,i)=>({r,i})).filter(({r})=>
      (papeis.dose && Number.isFinite(numBR(r[papeis.dose])) && numBR(r[papeis.dose])===0) ||
      (papeis.fatores||[]).some(f=>nomeControleProvavel(r[f]))
    );
    if(controle.length){
      const mortalidades=controle.map(({i})=>Number.isFinite(y[i])&&Number.isFinite(n[i])&&n[i]>0 ? (y[i]/n[i])*100 : NaN).filter(Number.isFinite);
      const media=mortalidades.reduce((a,b)=>a+b,0)/(mortalidades.length||1);
      if(mortalidades.length && media>20) pushCheck(checks,"aviso","Controle alto",`Mortalidade/evento médio do controle: ${fmt(media,1)}%.`);
      else if(mortalidades.length) pushCheck(checks,"ok","Controle dentro do esperado",`Média do controle: ${fmt(media,1)}%.`);
    } else {
      pushCheck(checks,"aviso","Controle não identificado","Não encontrei dose 0 nem nome de controle/testemunha.");
    }
  }

  checarDuplicatasGerais(checks);
  return montarInfoPipeline("analise", rota, tipo, checks);
}
function avaliarPipelineTempo(){
  const checks=[];
  const papeis=lerPapeisTempo();
  const nLin=COLUNAS[0]?.valores.length || 0;
  const obrig=["tratamento","tempo","n_total","n_vivos"];
  pushCheck(checks,"ok","Dados carregados",`${nLin} linha(s) e ${COLUNAS.length} coluna(s).`);
  obrig.forEach(k=>{ if(!papeis[k]) pushCheck(checks,"critico","Papel obrigatório ausente",`Marque a coluna de ${k}.`, true); });
  const rota={titulo:"Mortalidade no tempo", descricao:"Checar sobrevivência por avaliação, correção do controle, letras por tempo, LT50/LT90 e modelos de tempo.", chips:["QA/QC","Kaplan-Meier","GLM tempo"]};

  if(obrig.every(k=>papeis[k])){
    const tempo=numsColuna(papeis.tempo), nt=numsColuna(papeis.n_total), nv=numsColuna(papeis.n_vivos);
    let invalidos=0, impossiveis=0;
    for(let i=0;i<nLin;i++){
      if(!Number.isFinite(tempo[i]) || !Number.isFinite(nt[i]) || !Number.isFinite(nv[i]) || nt[i]<=0) invalidos++;
      else if(nv[i]<0 || nv[i]>nt[i]) impossiveis++;
    }
    if(invalidos) pushCheck(checks,"critico","Valores inválidos",`${invalidos} linha(s) com tempo, n total ou n vivos inválidos.`, true);
    if(impossiveis) pushCheck(checks,"critico","Vivos impossíveis",`${impossiveis} linha(s) com n vivos < 0 ou maior que n total.`, true);
    if(!invalidos && !impossiveis) pushCheck(checks,"ok","Contagens válidas","n vivos e n total passam na checagem básica.");

    const tratamentos=valoresColuna(papeis.tratamento);
    const temposUnicos=[...new Set(tempo.filter(Number.isFinite).map(v=>String(v)))];
    if(nUnicos(tratamentos)<2) pushCheck(checks,"critico","Poucos tratamentos","É preciso ao menos 2 tratamentos para mortalidade no tempo.", true);
    else pushCheck(checks,"ok","Tratamentos detectados",`${nUnicos(tratamentos)} tratamento(s).`);
    if(temposUnicos.length<2) pushCheck(checks,"critico","Poucos tempos","É preciso ao menos 2 tempos de avaliação.", true);
    else pushCheck(checks,"ok","Tempos detectados",`${temposUnicos.length} tempo(s) de avaliação.`);

    const rep= papeis.repeticao ? valoresColuna(papeis.repeticao) : Array.from({length:nLin},()=> "1");
    const vistos=new Set(); let duplicatas=0;
    const series=new Map();
    for(let i=0;i<nLin;i++){
      const key=[textoValor(tratamentos[i]), textoValor(rep[i]), String(tempo[i])].join("||");
      if(vistos.has(key)) duplicatas++; else vistos.add(key);
      const skey=[textoValor(tratamentos[i]), textoValor(rep[i])].join("||");
      if(!series.has(skey)) series.set(skey,[]);
      series.get(skey).push({tempo:tempo[i], vivos:nv[i]});
    }
    if(duplicatas) pushCheck(checks,"critico","Avaliações duplicadas",`${duplicatas} combinação(ões) tratamento/repetição/tempo repetidas.`, true);
    else pushCheck(checks,"ok","Sem duplicatas por tempo","Tratamento + repetição + tempo está único.");

    let aumentos=0;
    series.forEach(lista=>{
      lista.filter(x=>Number.isFinite(x.tempo)&&Number.isFinite(x.vivos)).sort((a,b)=>a.tempo-b.tempo)
        .forEach((x,i,arr)=>{ if(i && x.vivos>arr[i-1].vivos) aumentos++; });
    });
    if(aumentos) pushCheck(checks,"aviso","N vivos aumentou no tempo",`${aumentos} aumento(s) detectado(s). Pode ser erro de lançamento ou reposição de indivíduos.`);
    else pushCheck(checks,"ok","Monotonicidade","n vivos não aumenta ao longo do tempo nas séries.");

    const controle=$("#opt-controle-neg")?.value || textoValor([...new Set(tratamentos.map(textoValor).filter(Boolean))][0]||"");
    const ctrlMax=parseFloat(($("#opt-ctrlmax")?.value||"20").replace(",",".")) || 20;
    if(controle){
      const mortCtrl=[];
      for(let i=0;i<nLin;i++){
        if(textoValor(tratamentos[i])===controle && Number.isFinite(nt[i]) && nt[i]>0 && Number.isFinite(nv[i])){
          mortCtrl.push(((nt[i]-nv[i])/nt[i])*100);
        }
      }
      if(mortCtrl.length){
        const max=Math.max(...mortCtrl);
        if(max>ctrlMax) pushCheck(checks,"aviso","Controle acima do critério",`Controle ${controle}: mortalidade máxima ${fmt(max,1)}% (critério ${fmt(ctrlMax,1)}%).`);
        else pushCheck(checks,"ok","Controle dentro do critério",`Controle ${controle}: mortalidade máxima ${fmt(max,1)}%.`);
      }
    }
  }
  return montarInfoPipeline("tempo", rota, "tempo", checks);
}
function avaliarPipelineValidacao(){
  const checks=[];
  const sel=papelSelecoesAtuais();
  const papeis=lerPapeisValidacao();
  const nLin=COLUNAS[0]?.valores.length || 0;
  const rota={
    titulo:"Validação de método",
    descricao:"Calcular seletividade, linearidade, LD/LQ, recuperação, precisão, robustez, Grubbs, homocedasticidade, comparações e Horwitz.",
    chips:["INMETRO/analítico","Grubbs","Cochran/Levene","Horwitz"]
  };
  pushCheck(checks,"ok","Dados carregados",`${nLin} linha(s) e ${COLUNAS.length} coluna(s).`);
  ["resposta","concentracao","referencia","grupo","analista","dia","matriz","replicata","branco"].forEach(p=>{
    if((sel.porPapel[p]||[]).length>1) pushCheck(checks,"critico","Papéis conflitantes",`Mais de uma coluna marcada como ${p}: ${sel.porPapel[p].join(", ")}.`, true);
  });
  if(!papeis.resposta) pushCheck(checks,"critico","Resposta ausente","Marque a coluna de resposta/resultado.", true);
  if(papeis.resposta){
    const taxa=taxaNumerica(valoresColuna(papeis.resposta));
    if(!taxa.total || taxa.taxa<.9) pushCheck(checks,"critico","Resposta não-numérica",`Apenas ${taxa.ok}/${taxa.total} valores da resposta são numéricos.`, true);
    else pushCheck(checks,"ok","Resposta numérica",`${taxa.ok} valor(es) numéricos para análise.`);
  }
  const colConcentracao = papeis.concentracao || papeis.referencia;
  if(colConcentracao){
    const taxa=taxaNumerica(valoresColuna(colConcentracao));
    const niveis=nUnicos(valoresColuna(colConcentracao));
    if(taxa.taxa<.9) pushCheck(checks,"critico","Concentração não-numérica",`Apenas ${taxa.ok}/${taxa.total} níveis numéricos.`, true);
    else if(niveis<3) pushCheck(checks,"aviso","Poucos níveis","Linearidade e LD/LQ ficam mais fracos com menos de 3 níveis.");
    else pushCheck(checks,"ok","Faixa de trabalho",`${niveis} nível(is) de concentração/referência detectado(s).`);
  } else {
    pushCheck(checks,"aviso","Sem concentração","Linearidade, sensibilidade e LD/LQ por curva precisam de concentração/nível.");
  }
  if(papeis.referencia) pushCheck(checks,"ok","Referência informada","Recuperação e tendência serão calculadas.");
  else pushCheck(checks,"aviso","Sem referência","Tendência/recuperação precisam de valor referência/fortificado.");
  if(papeis.branco){
    if($("#opt-valid-branco")?.checked) pushCheck(checks,"ok","Branco para LD/LQ","A coluna de branco será usada como estimativa adicional de LD/LQ.");
    else pushCheck(checks,"aviso","Branco ignorado","Há coluna de branco marcada, mas a opção de usar branco em LD/LQ está desativada.");
  }
  if(papeis.grupo || papeis.analista || papeis.dia || papeis.matriz){
    const nomes=[papeis.grupo&&"grupo",papeis.analista&&"analista",papeis.dia&&"dia/série",papeis.matriz&&"matriz"].filter(Boolean);
    pushCheck(checks,"ok","Condições variadas",`${nomes.join(", ")} habilitam comparações, precisão intermediária, seletividade ou robustez.`);
  } else {
    pushCheck(checks,"aviso","Sem condições variadas","Teste t/F/ANOVA, robustez e seletividade dependem de grupos, analistas, dias ou matrizes.");
  }
  if(colConcentracao || papeis.grupo || papeis.analista){
    const base=colConcentracao || papeis.grupo || papeis.analista;
    const vals=valoresColuna(base).map(textoValor);
    const cont={}; vals.forEach(v=>{ if(v) cont[v]=(cont[v]||0)+1; });
    const gruposRep=Object.values(cont).filter(n=>n>=2).length;
    if(gruposRep>=2) pushCheck(checks,"ok","Repetições para variância",`${gruposRep} grupo(s)/nível(is) com repetição para Cochran/Levene/Brown-Forsythe.`);
    else pushCheck(checks,"aviso","Poucas repetições","Homocedasticidade e repetibilidade precisam de pelo menos 2 grupos com repetição.");
  }
  if($("#opt-horwitz-c") && ($("#opt-horwitz-c").value||"").trim()) pushCheck(checks,"ok","Horwitz habilitado","C informado para calcular PRSDR e HorRat.");
  else pushCheck(checks,"aviso","Horwitz sem C","Informe C como fração mássica para comparar CV observado com Horwitz.");
  checarDuplicatasGerais(checks);
  return montarInfoPipeline("validacao", rota, "validacao", checks);
}
function avaliarPipelineForense(){
  const checks=[];
  const sel=papelSelecoesAtuais();
  const papeis=lerPapeisForense();
  const nLin=COLUNAS[0]?.valores.length || 0;
  const rota={
    titulo:"Triagem forense de dados",
    descricao:"Rastrear padrões atípicos (subdispersão, homogeneidade de variância, último dígito, arredondamento, duplicatas, extremos, acoplamento) que merecem verificação humana.",
    chips:["triagem","não é prova","verificar fonte"]
  };
  pushCheck(checks,"ok","Dados carregados",`${nLin} linha(s) e ${COLUNAS.length} coluna(s).`);
  ["resposta","tratamento","resposta2"].forEach(p=>{
    if((sel.porPapel[p]||[]).length>1) pushCheck(checks,"critico","Papéis conflitantes",`Mais de uma coluna marcada como ${p}: ${sel.porPapel[p].join(", ")}.`, true);
  });
  if(!papeis.resposta) pushCheck(checks,"critico","Resposta ausente","Marque a coluna de resposta (numérica).", true);
  else {
    const taxa=taxaNumerica(valoresColuna(papeis.resposta));
    if(!taxa.total || taxa.taxa<.9) pushCheck(checks,"critico","Resposta não-numérica",`Apenas ${taxa.ok}/${taxa.total} valores da resposta são numéricos.`, true);
    else pushCheck(checks,"ok","Resposta numérica",`${taxa.ok} valor(es) numéricos para a triagem.`);
  }
  if(!papeis.tratamento) pushCheck(checks,"critico","Tratamento ausente","Marque a coluna de tratamento/grupo (define as repetições).", true);
  else {
    const niveis=nUnicos(valoresColuna(papeis.tratamento));
    if(niveis<2) pushCheck(checks,"critico","Grupos insuficientes","São necessários ao menos 2 grupos com valores válidos.", true);
    else {
      const vals=valoresColuna(papeis.tratamento).map(textoValor);
      const cont={}; vals.forEach(v=>{ if(v) cont[v]=(cont[v]||0)+1; });
      const com3=Object.values(cont).filter(n=>n>=3).length;
      pushCheck(checks,"ok","Grupos detectados",`${niveis} grupo(s); ${com3} com ≥3 repetições (índice de dispersão exige ≥3).`);
      if(com3<2) pushCheck(checks,"aviso","Poucas repetições por grupo","Vários testes (dispersão, último dígito, heaping) ficam fracos ou inativos com poucas repetições.");
    }
  }
  if(papeis.resposta2){
    const taxa=taxaNumerica(valoresColuna(papeis.resposta2));
    if(taxa.taxa<.9) pushCheck(checks,"aviso","2ª avaliação não-numérica",`Apenas ${taxa.ok}/${taxa.total} valores da 2ª avaliação são numéricos; o teste de acoplamento pode não rodar.`);
    else pushCheck(checks,"ok","Acoplamento habilitado","2ª avaliação informada: teste de permutação rep-a-rep será executado.");
  } else {
    pushCheck(checks,"aviso","Sem 2ª avaliação","O teste de acoplamento entre avaliações independentes exige uma 2ª coluna de resposta.");
  }
  checarDuplicatasGerais(checks);
  return montarInfoPipeline("forense", rota, "forense", checks);
}
function montarInfoPipeline(modo, rota, tipo, checks){
  const todos=checksProntidaoSistema().concat(checksRastreabilidade()).concat(checksCustodia(modo)).concat(checks);
  const criticos=todos.filter(c=>c.severidade==="critico").length;
  const avisos=todos.filter(c=>c.severidade==="aviso").length;
  const oks=todos.filter(c=>c.severidade==="ok").length;
  return {modo, rota, tipo, checks:todos, criticos, avisos, oks, bloqueia: todos.some(c=>c.bloqueia)};
}
function avaliarPipelineAtual(){
  if(!COLUNAS.length) return null;
  if(MODO==="tempo") return avaliarPipelineTempo();
  if(MODO==="validacao") return avaliarPipelineValidacao();
  if(MODO==="forense") return avaliarPipelineForense();
  return avaliarPipelineGeral();
}
function pipelineHtml(info, compacto=false){
  if(!info) return "";
  const chips=(info.rota.chips||[]).map(c=>chip(esc(c),"chip-info")).join("");
  const status=info.criticos ? chip(`${info.criticos} crítico(s)`,"chip-alerta") : chip("sem críticos","chip-ok");
  const resumo=`<div class="pipeline-resumo">`+
    `<span>${status}</span><span>${chip(info.avisos+" aviso(s)", info.avisos?"chip-alerta":"chip-ok")}</span><span>${chip(info.oks+" OK","chip-ok")}</span>`+
    `</div>`;
  const checks=info.checks.map(c=>
    `<li class="qa-item qa-${c.severidade}"><b>${esc(c.titulo)}</b><span>${esc(c.detalhe||"")}</span></li>`
  ).join("");
  return `<div class="pipeline-panel">`+
    `<div class="pipeline-head"><div><span class="pipeline-kicker">Rota recomendada</span><h3>${esc(info.rota.titulo)}</h3><p>${esc(info.rota.descricao)}</p></div><div class="pipeline-chipset">${chips}</div></div>`+
    resumo+
    (compacto ? "" : `<ul class="qa-list">${checks}</ul>`)+
    `</div>`;
}
function renderPipelineStatus(info){
  const card=$("#card-pipeline"), box=$("#pipeline-status");
  if(!card || !box) return;
  if(!info){ card.classList.add("oculto"); box.innerHTML=""; return; }
  card.classList.remove("oculto");
  box.innerHTML=pipelineHtml(info);
  const btn=$("#btn-analisar");
  if(btn) btn.disabled=!!info.bloqueia;
}
function atualizarPipeline(){
  const info=avaliarPipelineAtual();
  renderPipelineStatus(info);
  atualizarBotaoAutoteste();
  return info;
}
function validarPipelineAntesDeAnalisar(){
  const info=atualizarPipeline();
  if(info && info.bloqueia){
    const faltaAutoteste = (info.checks || []).some(c=>c.titulo === "Autoteste da versão obrigatório");
    avisar(faltaAutoteste ? "Execute o Autoteste da versão antes de analisar." : "Corrija os pontos críticos da conferência antes de analisar.");
    if(faltaAutoteste){
      $("#btn-autoteste")?.focus();
      $("#card-pipeline").scrollIntoView({behavior:"smooth", block:"start"});
      return false;
    }
    const ident=lerIdentificacao();
    const alvo=!ident.estudo ? $("#audit-estudo") : (!ident.responsavel ? $("#audit-responsavel") : null);
    if(alvo) alvo.focus();
    else $("#card-pipeline").scrollIntoView({behavior:"smooth", block:"start"});
    return false;
  }
  return true;
}
function renderPipelineRelatorio(out){
  const info=avaliarPipelineAtual();
  if(info) out.appendChild(secao("Pipeline guiado", pipelineHtml(info, true)));
}
function resumirPipelineParaAuditoria(info){
  if(!info) return null;
  return {
    modo: info.modo,
    tipo: info.tipo,
    rota: info.rota ? {
      titulo: info.rota.titulo,
      descricao: info.rota.descricao,
      chips: info.rota.chips || [],
    } : null,
    criticos: info.criticos,
    avisos: info.avisos,
    oks: info.oks,
    bloqueia: !!info.bloqueia,
    checks: (info.checks || []).map(c=>({
      severidade: c.severidade,
      titulo: c.titulo,
      detalhe: c.detalhe || "",
      bloqueia: !!c.bloqueia,
    })),
  };
}
function registrarExecucao(papeis, opcoes){
  const dados = montarDados();
  ULTIMA_EXECUCAO = {
    iniciado_em: new Date().toISOString(),
    modo: MODO,
    dados: clonarAuditavel(dados),
    fonte_dados: clonarAuditavel(FONTE_DADOS || montarFonteDados(null, COLUNAS)),
    papeis: clonarAuditavel(papeis || {}),
    opcoes: clonarAuditavel(opcoes || {}),
    identificacao: clonarAuditavel(lerIdentificacao()),
    custodia: clonarAuditavel(lerCustodia()),
    prontidao_sistema: clonarAuditavel(resumoProntidaoSistema()),
    pipeline: resumirPipelineParaAuditoria(avaliarPipelineAtual()),
    colunas: COLUNAS.map(c=>({nome:c.nome, n:(c.valores||[]).length})),
  };
  ULTIMO_RELATORIO = null;
  AUDIT_ATUAL = null;
}
function execucaoFallback(){
  return {
    iniciado_em: new Date().toISOString(),
    modo: MODO,
    dados: clonarAuditavel(montarDados()),
    fonte_dados: clonarAuditavel(FONTE_DADOS || montarFonteDados(null, COLUNAS)),
    papeis: {},
    opcoes: {},
    identificacao: clonarAuditavel(lerIdentificacao()),
    custodia: clonarAuditavel(lerCustodia()),
    prontidao_sistema: clonarAuditavel(resumoProntidaoSistema()),
    pipeline: resumirPipelineParaAuditoria(avaliarPipelineAtual()),
    colunas: COLUNAS.map(c=>({nome:c.nome, n:(c.valores||[]).length})),
  };
}
function modoPwaAtual(){
  if(window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return "standalone";
  if(window.navigator && window.navigator.standalone) return "standalone-ios";
  return "browser";
}
function regrasOperacionais(exec){
  if(exec.modo === "validacao"){
    return {
      fonte: "BioEnsaio/bioengine/validacao.py",
      itens: VALIDACAO_REGRAS,
      observacao: "O Python é tratado como fonte operacional das regras estatísticas executadas no app.",
    };
  }
  if(exec.modo === "forense"){
    return {
      fonte: "BioEnsaio/bioengine/forense.py",
      itens: FORENSE_REGRAS,
      observacao: "Triagem estatística de anomalias. Sinaliza padrões atípicos para verificação humana; não constitui prova de fraude.",
    };
  }
  return {
    fonte: "BioEnsaio/bioengine",
    itens: ["Detecção automática de rota", "Conferência de dados", "Motor estatístico Python/Pyodide"],
  };
}
function avaliarCriteriosValidacao(rel, criterios){
  const c = criterios || CRITERIOS_PADRAO_VALIDACAO;
  const itens = [];
  const add = (status, item, criterio, valor, detalhe) => {
    itens.push({status, item, criterio, valor: valor == null ? "" : String(valor), detalhe: detalhe || ""});
  };
  const ok = (cond, item, criterio, valor, detalheOk, detalheFalha) => {
    add(cond ? "ok" : "falha", item, criterio, valor, cond ? detalheOk : detalheFalha);
  };
  const na = (item, criterio, detalhe) => add("nao_avaliado", item, criterio, "", detalhe);

  if(!rel || !rel.ok){
    add("falha", "Execução", "análise concluída sem erro", rel?.erro || "erro", "A análise precisa concluir antes da liberação técnica.");
    return {
      tipo: "criterios_validacao_v1",
      conclusao: "revisar",
      resumo: "Revisar antes de liberar",
      criterios: clonarAuditavel(c),
      itens,
    };
  }

  const lin = rel.linearidade || {};
  if(lin.aplicavel){
    ok(lin.r2 >= c.r2_min, "Linearidade", `R² >= ${fmt(c.r2_min,4)}`, fmt(lin.r2,5), "Curva atende ao limite configurado.", "R² abaixo do limite configurado.");
    if(lin.falta_ajuste){
      ok(!!lin.falta_ajuste.sem_falta_ajuste, "Falta de ajuste", "p > alfa", `p=${fmt(lin.falta_ajuste.p,4)}`, "Sem evidência de falta de ajuste.", "Falta de ajuste detectada.");
    }
  } else {
    na("Linearidade", `R² >= ${fmt(c.r2_min,4)}`, lin.nota || "Concentração/nível insuficiente.");
  }

  const norm = rel.premissa_gaussiana?.normalidade;
  if(norm && norm.p != null){
    ok(!!norm.normal, "Premissa gaussiana", "normalidade compatível", `p=${fmt(norm.p,4)}`, "Distribuição compatível com a premissa paramétrica.", "Investigar transformação, modelo robusto ou abordagem não-paramétrica.");
  } else {
    na("Premissa gaussiana", "normalidade compatível", "Sem n suficiente para teste formal.");
  }

  const g = rel.outliers?.grubbs || {};
  if(g.aplicavel) ok(!g.outlier, "Outlier por Grubbs", "sem outlier", `G=${fmt(g.estatistica,4)}`, "Sem outlier pelo critério de Grubbs.", "Valor aberrante detectado por Grubbs.");
  else na("Outlier por Grubbs", "sem outlier", g.nota || "Não aplicável.");
  const j = rel.outliers?.jackknife || {};
  if(j.aplicavel) ok(!(j.outliers || []).length, "Outlier por Jackknife", "sem resíduo padronizado aberrante", `máx |r|=${fmt(j.max_abs,3)}`, "Sem outlier pelos resíduos Jackknife.", "Resíduo Jackknife aberrante detectado.");
  else na("Outlier por Jackknife", "sem resíduo padronizado aberrante", j.nota || "Não aplicável.");

  const h = rel.homocedasticidade || {};
  if(h.aplicavel){
    const lOk = !!h.levene?.homogenea;
    const bOk = !!h.brown_forsythe?.homogenea;
    const cOk = h.cochran?.homogenea == null ? true : !!h.cochran.homogenea;
    ok(lOk && bOk && cOk, "Homocedasticidade", "Levene, Brown-Forsythe e Cochran sem heterogeneidade", `Levene p=${fmt(h.levene?.p,4)}; Brown p=${fmt(h.brown_forsythe?.p,4)}`, "Variâncias compatíveis nos testes disponíveis.", "Heterogeneidade de variâncias detectada.");
  } else {
    na("Homocedasticidade", "variâncias homogêneas", h.nota || "Não aplicável.");
  }

  const rec = rel.recuperacao || {};
  if(rec.aplicavel){
    const media = rec.recuperacao?.media;
    const cv = rec.recuperacao?.cv;
    ok(media >= c.recuperacao_min && media <= c.recuperacao_max, "Recuperação", `${fmt(c.recuperacao_min,1)}% a ${fmt(c.recuperacao_max,1)}%`, `${fmt(media,3)}%`, "Recuperação média dentro da faixa configurada.", "Recuperação média fora da faixa configurada.");
    if(cv != null) ok(cv <= c.cv_max, "DPR da recuperação", `CV/DPR <= ${fmt(c.cv_max,1)}%`, `${fmt(cv,2)}%`, "Variação da recuperação dentro do limite.", "Variação da recuperação acima do limite.");
  } else {
    na("Recuperação", `${fmt(c.recuperacao_min,1)}% a ${fmt(c.recuperacao_max,1)}%`, rec.nota || "Referência não informada.");
  }

  const rep = rel.precisao?.repetibilidade || {};
  if(rep.aplicavel && rep.cv_r != null) ok(rep.cv_r <= c.cv_max, "Repetibilidade", `CVr <= ${fmt(c.cv_max,1)}%`, `${fmt(rep.cv_r,2)}%`, "Repetibilidade dentro do limite configurado.", "Repetibilidade acima do limite configurado.");
  else na("Repetibilidade", `CVr <= ${fmt(c.cv_max,1)}%`, "Repetições insuficientes ou média zero.");
  const repro = rel.precisao?.reprodutibilidade || {};
  if(repro.aplicavel && repro.cv_R != null) ok(repro.cv_R <= c.cv_max, "Reprodutibilidade", `CVR <= ${fmt(c.cv_max,1)}%`, `${fmt(repro.cv_R,2)}%`, "Reprodutibilidade dentro do limite configurado.", "Reprodutibilidade acima do limite configurado.");
  else na("Reprodutibilidade", `CVR <= ${fmt(c.cv_max,1)}%`, "Condições insuficientes ou média zero.");

  const comps = (rel.comparacoes || []).filter(x=>x && x.aplicavel);
  if(comps.length){
    const semelhantes = comps.every(x => {
      const anovaOk = !x.anova || !!x.anova.sem_diferenca;
      const tOk = !x.teste_t || !!x.teste_t.sem_diferenca;
      return anovaOk && tOk;
    });
    ok(semelhantes, "Condições variadas", "sem diferença estatística relevante", `${comps.length} comparação(ões)`, "Grupos/condições sem diferença estatística nos testes aplicáveis.", "Diferença entre grupos/condições detectada.");
  } else {
    na("Condições variadas", "sem diferença estatística relevante", "Sem grupos, analistas, dias ou matrizes suficientes.");
  }

  const sel = rel.seletividade || {};
  if(sel.aplicavel) ok(!!sel.seletivo, "Seletividade", "sem efeito de matriz/grupo", sel.modelo || "comparação", "Seletividade compatível nos testes aplicáveis.", "Efeito de matriz/grupo detectado.");
  else na("Seletividade", "sem efeito de matriz/grupo", sel.nota || "Não aplicável.");

  const robust = rel.robustez || {};
  if(robust.aplicavel){
    const robustOk = (robust.comparacoes || []).every(x => !x.aplicavel || ((!x.anova || x.anova.sem_diferenca) && (!x.teste_t || x.teste_t.sem_diferenca)));
    ok(robustOk, "Robustez", "sem diferença entre variações deliberadas", `${(robust.comparacoes || []).length} comparação(ões)`, "Robustez compatível com as condições avaliadas.", "Diferença estatística em condição de robustez.");
  } else {
    na("Robustez", "opcional quando houver condição variada", robust.nota || "Não avaliada.");
  }

  const hor = rel.horwitz || {};
  if(hor.aplicavel && hor.HorRat != null){
    ok(hor.HorRat >= c.horrat_min && hor.HorRat <= c.horrat_max, "Horwitz/HorRat", `${fmt(c.horrat_min,2)} a ${fmt(c.horrat_max,2)}`, fmt(hor.HorRat,3), "HorRat dentro da faixa configurada.", "HorRat fora da faixa configurada.");
  } else {
    na("Horwitz/HorRat", `${fmt(c.horrat_min,2)} a ${fmt(c.horrat_max,2)}`, hor.nota || "C não informado ou CV indisponível.");
  }

  const falhas = itens.filter(i=>i.status === "falha").length;
  const naoAvaliados = itens.filter(i=>i.status === "nao_avaliado").length;
  const conclusao = falhas ? "revisar" : (naoAvaliados ? "aprovado_com_ressalvas" : "aprovado");
  return {
    tipo: "criterios_validacao_v1",
    conclusao,
    resumo: conclusao === "aprovado" ? "Atende aos critérios configurados" : (conclusao === "aprovado_com_ressalvas" ? "Atende ao que foi avaliado; há itens não avaliados" : "Revisar antes de liberar"),
    criterios: clonarAuditavel(c),
    falhas,
    nao_avaliados: naoAvaliados,
    oks: itens.filter(i=>i.status === "ok").length,
    itens,
  };
}
function statusCriterioChip(status){
  if(status === "ok") return chip("OK", "chip-ok");
  if(status === "falha") return chip("revisar", "chip-alerta");
  return chip("não avaliado", "chip-info");
}
function blocoParecerValidacao(parecer){
  const cls = parecer.conclusao === "revisar" ? "chip-alerta" : (parecer.conclusao === "aprovado" ? "chip-ok" : "chip-info");
  let h = `<div class="criteria-summary">${chip(esc(parecer.resumo), cls)} `+
    `${chip(`${parecer.oks || 0} OK`, "chip-ok")} ${chip(`${parecer.falhas || 0} revisar`, parecer.falhas ? "chip-alerta" : "chip-ok")} `+
    `${chip(`${parecer.nao_avaliados || 0} não avaliado(s)`, parecer.nao_avaliados ? "chip-info" : "chip-ok")}</div>`;
  h += `<div class="tab-rolavel"><table><thead><tr><th>Parâmetro</th><th>Critério</th><th>Valor</th><th>Status</th><th>Detalhe</th></tr></thead><tbody>`;
  (parecer.itens || []).forEach(i=>{
    h += `<tr><td>${esc(i.item)}</td><td>${esc(i.criterio)}</td><td>${esc(i.valor)}</td><td>${statusCriterioChip(i.status)}</td><td>${esc(i.detalhe)}</td></tr>`;
  });
  return h + `</tbody></table></div><p class="dica">Os limites são critérios internos editáveis do método/laboratório e ficam registrados no pacote de auditoria.</p>`;
}
async function hashPacoteAuditoria(pacote){
  const copia = clonarAuditavel(pacote || {});
  if(copia.metadata && copia.metadata.hashes) copia.metadata.hashes.pacote_sha256 = null;
  return sha256Hex(jsonEstavel(copia));
}
async function montarPacoteAuditoriaDeExecucao(exec, rel, relatorioTexto){
  const dadosJson = jsonEstavel(exec.dados);
  const papeisJson = jsonEstavel(exec.papeis);
  const opcoesJson = jsonEstavel(exec.opcoes);
  const custodiaJson = jsonEstavel(exec.custodia || {});
  const resultado = clonarAuditavel(rel || ULTIMO_RELATORIO || {});
  const resultadoJson = jsonEstavel(resultado);
  const relatorioTextoLimpo = String(relatorioTexto || "").trim();
  const dataHash = await sha256Hex(dadosJson);
  const gerado = exec.iniciado_em || new Date().toISOString();
  const criteriosAceitacao = exec.opcoes && exec.opcoes.criterios_aceitacao ? exec.opcoes.criterios_aceitacao : null;
  const parecerAceitacao = exec.modo === "validacao" ? avaliarCriteriosValidacao(resultado, criteriosAceitacao || CRITERIOS_PADRAO_VALIDACAO) : null;
  const meta = {
    record_id: `${APP_VERSION}-${dataHash.slice(0,12)}-${gerado.replace(/[-:.TZ]/g,"").slice(0,14)}`,
    app_version: APP_VERSION,
    engine_version: ENGINE_VERSION,
    sw_cache_version: SW_CACHE_VERSION,
    modo: exec.modo,
    iniciado_em: gerado,
    concluido_em: new Date().toISOString(),
    url: location.href,
    user_agent: navigator.userAgent,
    pwa_display_mode: modoPwaAtual(),
    formato: AUDIT_FORMAT,
    identificacao: exec.identificacao || {},
    custodia: exec.custodia || {},
    fonte_dados: exec.fonte_dados || null,
    prontidao_sistema: exec.prontidao_sistema || null,
    rastreabilidade: {
      obrigatoria: true,
      estudo_informado: !!(exec.identificacao && exec.identificacao.estudo),
      responsavel_informado: !!(exec.identificacao && exec.identificacao.responsavel),
      custodia_informada: !!(exec.custodia && exec.custodia.informada),
      custodia_minima: !!(exec.custodia && exec.custodia.minima),
    },
    dados: {
      linhas: exec.colunas[0]?.n || 0,
      colunas: exec.colunas.length,
      nomes_colunas: exec.colunas.map(c=>c.nome),
    },
    regras_operacionais: regrasOperacionais(exec),
    hashes: {
      dados_sha256: dataHash,
      custodia_sha256: await sha256Hex(custodiaJson),
      papeis_sha256: await sha256Hex(papeisJson),
      opcoes_sha256: await sha256Hex(opcoesJson),
      resultado_sha256: await sha256Hex(resultadoJson),
      relatorio_texto_sha256: relatorioTextoLimpo ? await sha256Hex(relatorioTextoLimpo) : null,
      arquivos_motor_sha256: clonarAuditavel(ENGINE_HASHES),
      pacote_sha256: null,
    },
    pipeline: exec.pipeline,
    criterios_aceitacao: criteriosAceitacao,
    parecer_aceitacao: parecerAceitacao,
    controles_conformidade: clonarAuditavel(CONTROLES_CONFORMIDADE),
    lacunas_organizacionais: clonarAuditavel(LACUNAS_ORGANIZACIONAIS),
    limite_compliance: "Registro técnico de apoio a OECD GLP/BPL e ISO/IEC 27001; não substitui validação formal do sistema, controle de acesso, backup, assinatura/aprovação eletrônica ou certificação organizacional.",
  };
  const pacote = {
    metadata: meta,
    dados: exec.dados,
    papeis: exec.papeis,
    opcoes: exec.opcoes,
    identificacao: exec.identificacao || {},
    custodia: exec.custodia || {},
    fonte_dados: exec.fonte_dados || null,
    pipeline: exec.pipeline,
    parecer_aceitacao: parecerAceitacao,
    resultado,
    relatorio_texto: relatorioTextoLimpo,
  };
  pacote.metadata.hashes.pacote_sha256 = await hashPacoteAuditoria(pacote);
  return pacote;
}
async function montarPacoteAuditoria(rel){
  const exec = ULTIMA_EXECUCAO || execucaoFallback();
  const relatorioTexto = ($("#resultados")?.innerText || "").trim();
  return montarPacoteAuditoriaDeExecucao(exec, rel, relatorioTexto);
}
async function verificarPacoteAuditoria(pacote){
  const meta = pacote?.metadata || {};
  const hs = meta.hashes || {};
  const checks = [];
  const add = (status, item, detalhe, esperado, obtido) => checks.push({
    status, item, detalhe: detalhe || "", esperado: esperado == null ? "" : String(esperado), obtido: obtido == null ? "" : String(obtido),
  });
  if(!pacote || typeof pacote !== "object"){
    add("falha", "Formato", "JSON inválido para pacote BioEnsaio.", AUDIT_FORMAT, "");
    return {ok:false, checks, metadata:{}};
  }
  add(meta.formato === AUDIT_FORMAT || meta.formato === "BioEnsaio audit package v1" ? "ok" : "falha", "Formato", meta.formato || "não informado", AUDIT_FORMAT, meta.formato || "");
  const pacoteCalc = await hashPacoteAuditoria(pacote);
  if(hs.pacote_sha256){
    add(hs.pacote_sha256 === pacoteCalc ? "ok" : "falha", "SHA-256 do pacote", "Hash do pacote exportado.", hs.pacote_sha256, pacoteCalc);
  } else {
    add("aviso", "SHA-256 do pacote", "Pacote antigo sem hash externo auto-verificável.", "presente", "ausente");
  }
  const dadosCalc = await sha256Hex(jsonEstavel(pacote.dados || {}));
  add(hs.dados_sha256 === dadosCalc ? "ok" : "falha", "SHA-256 dos dados", "Recalculado a partir de dados.", hs.dados_sha256, dadosCalc);
  const custodiaCalc = await sha256Hex(jsonEstavel(pacote.custodia || {}));
  if(hs.custodia_sha256){
    add(hs.custodia_sha256 === custodiaCalc ? "ok" : "falha", "SHA-256 da custódia", "Recalculado a partir da cadeia de custódia.", hs.custodia_sha256, custodiaCalc);
  }else{
    add("aviso", "SHA-256 da custódia", "Pacote antigo ou sem cadeia de custódia.", "presente", "ausente");
  }
  const papeisCalc = await sha256Hex(jsonEstavel(pacote.papeis || {}));
  add(hs.papeis_sha256 === papeisCalc ? "ok" : "falha", "SHA-256 dos papéis", "Recalculado a partir dos papéis.", hs.papeis_sha256, papeisCalc);
  const opcoesCalc = await sha256Hex(jsonEstavel(pacote.opcoes || {}));
  add(hs.opcoes_sha256 === opcoesCalc ? "ok" : "falha", "SHA-256 das opções", "Recalculado a partir das opções.", hs.opcoes_sha256, opcoesCalc);
  const resultadoCalc = await sha256Hex(jsonEstavel(pacote.resultado || {}));
  add(hs.resultado_sha256 === resultadoCalc ? "ok" : "falha", "SHA-256 do resultado", "Recalculado a partir do resultado.", hs.resultado_sha256, resultadoCalc);
  if(hs.relatorio_texto_sha256){
    const relCalc = await sha256Hex(pacote.relatorio_texto || "");
    add(hs.relatorio_texto_sha256 === relCalc ? "ok" : "falha", "SHA-256 do relatório", "Recalculado a partir do texto do relatório.", hs.relatorio_texto_sha256, relCalc);
  } else {
    add("aviso", "SHA-256 do relatório", "Relatório textual ausente ou pacote antigo.", "presente", "ausente");
  }
  const rastreavel = !!(meta.rastreabilidade && meta.rastreabilidade.estudo_informado && meta.rastreabilidade.responsavel_informado);
  add(rastreavel ? "ok" : "falha", "Rastreabilidade", "ID de estudo e responsável informados.", "completa", rastreavel ? "completa" : "incompleta");
  const okFinal = checks.every(c=>c.status === "ok" || c.status === "aviso");
  return {
    ok: okFinal,
    metadata: meta,
    checks,
    pacote_sha256_calculado: pacoteCalc,
    limite: "Verificação de integridade interna; não substitui assinatura eletrônica, controle de acesso ou validação formal do sistema.",
  };
}
function blocoVerificacaoAuditoria(ver){
  const cls = ver.ok ? "chip-ok" : "chip-alerta";
  let h = `<div class="criteria-summary">${chip(ver.ok ? "integridade interna OK" : "integridade com falha", cls)} `+
    `${chip(`${ver.checks.filter(c=>c.status==="ok").length} OK`, "chip-ok")} `+
    `${chip(`${ver.checks.filter(c=>c.status==="falha").length} falha(s)`, ver.checks.some(c=>c.status==="falha") ? "chip-alerta" : "chip-ok")} `+
    `${chip(`${ver.checks.filter(c=>c.status==="aviso").length} aviso(s)`, "chip-info")}</div>`;
  h += `<div class="kv"><dt>Registro</dt><dd>${esc(ver.metadata?.record_id || "não informado")}</dd>`+
    `<dt>App</dt><dd>${esc(ver.metadata?.app_version || "não informado")}</dd>`+
    `<dt>Pacote calculado</dt><dd class="hash">${esc(ver.pacote_sha256_calculado || "")}</dd></div>`;
  h += `<div class="tab-rolavel"><table><thead><tr><th>Item</th><th>Status</th><th>Esperado</th><th>Obtido</th><th>Detalhe</th></tr></thead><tbody>`;
  ver.checks.forEach(c=>{
    const chipStatus = c.status === "ok" ? chip("OK","chip-ok") : (c.status === "falha" ? chip("falha","chip-alerta") : chip("aviso","chip-info"));
    h += `<tr><td>${esc(c.item)}</td><td>${chipStatus}</td><td class="hash">${esc(c.esperado)}</td><td class="hash">${esc(c.obtido)}</td><td>${esc(c.detalhe)}</td></tr>`;
  });
  return h + `</tbody></table></div><p class="dica">${esc(ver.limite || "")}</p>`;
}
function renderVerificacaoPacote(ver){
  const out = $("#resultados");
  out.innerHTML = "";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  out.appendChild(secao("Verificação do pacote de auditoria", blocoVerificacaoAuditoria(ver)));
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}
function dadosDeExemplo(ex){
  const dados = {};
  (ex.colunas || []).forEach((nome, i)=>{
    dados[nome] = (ex.linhas || []).map(l=>String(l[i] == null ? "" : l[i]));
  });
  return dados;
}
function adicionarCheckAutoteste(checks, status, item, detalhe, evidencia){
  checks.push({status, item, detalhe: detalhe || "", evidencia: evidencia || ""});
}
function checkAutoteste(checks, cond, item, detalheOk, detalheFalha, evidencia){
  adicionarCheckAutoteste(checks, cond ? "ok" : "falha", item, cond ? detalheOk : detalheFalha, evidencia);
}
function chipStatusAutoteste(status){
  if(status === "ok") return chip("OK", "chip-ok");
  if(status === "aviso") return chip("aviso", "chip-info");
  return chip("falha", "chip-alerta");
}
function blocoAutoteste(res){
  const falhas = res.checks.filter(c=>c.status === "falha").length;
  const avisos = res.checks.filter(c=>c.status === "aviso").length;
  const oks = res.checks.filter(c=>c.status === "ok").length;
  const status = falhas ? "Autoteste com falha" : "Autoteste OK";
  let h = `<div class="criteria-summary">${chip(status, falhas ? "chip-alerta" : "chip-ok")} `+
    `${chip(`${oks} OK`, "chip-ok")} ${chip(`${falhas} falha(s)`, falhas ? "chip-alerta" : "chip-ok")} ${chip(`${avisos} aviso(s)`, "chip-info")}</div>`;
  h += `<div class="kv">`+
    `<dt>App</dt><dd>${esc(res.app_version)}</dd>`+
    `<dt>Motor</dt><dd>${esc(res.engine_version)}</dd>`+
    `<dt>Cache PWA</dt><dd>${esc(res.sw_cache_version)}</dd>`+
    `<dt>Pacote</dt><dd>${esc(res.audit_format)}</dd>`+
    `<dt>SHA-256 do pacote</dt><dd class="hash">${esc(res.pacote_sha256 || "")}</dd>`+
    `</div>`;
  h += `<div class="tab-rolavel"><table><thead><tr><th>Item</th><th>Status</th><th>Detalhe</th><th>Evidência</th></tr></thead><tbody>`;
  res.checks.forEach(c=>{
    h += `<tr><td>${esc(c.item)}</td><td>${chipStatusAutoteste(c.status)}</td><td>${esc(c.detalhe)}</td><td class="hash">${esc(c.evidencia)}</td></tr>`;
  });
  return h + `</tbody></table></div><p class="dica">Autoteste interno com exemplo determinístico; não substitui validação formal do sistema no ambiente do laboratório.</p>`;
}
function renderAutoteste(res){
  ULTIMO_RELATORIO = null;
  AUDIT_ATUAL = null;
  const out = $("#resultados");
  out.innerHTML = "";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  out.appendChild(secao("Autoteste técnico GLP/BPL/ISO 27001", blocoAutoteste(res)));
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}
async function executarAutoteste(){
  const checks = [];
  const btn = $("#btn-autoteste");
  if(btn) btn.disabled = true;
  const iniciado = new Date().toISOString();
  let pacote = null;
  try{
    mostrarOverlay("Executando autoteste…", "Validando motor estatístico, critérios, auditoria e PWA.");
    const exemplos = window.EXEMPLOS_VALIDACAO || {};
    const nomeExemplo = Object.keys(exemplos)[0];
    const ex = exemplos[nomeExemplo];
    checkAutoteste(checks, !!ex, "Exemplo de validação", "Exemplo interno encontrado.", "Exemplo interno ausente.", nomeExemplo || "");
    if(!ex) throw new Error("Exemplo de validação indisponível.");

    const dados = dadosDeExemplo(ex);
    const linhas = Object.values(dados)[0]?.length || 0;
    checkAutoteste(checks, linhas >= 30 && Object.keys(dados).length >= 6, "Dados determinísticos", `${linhas} linhas carregadas para autoteste.`, "Dados de autoteste insuficientes.", `${linhas} linhas; ${Object.keys(dados).length} colunas`);

    const papeis = clonarAuditavel(Object.assign({}, ex.papeis, ex.papeis_extra || {}));
    const opcoes = {
      alfa: 0.05,
      robustez: true,
      usar_branco: true,
      horwitz_c: "1e-6",
      criterios_aceitacao: clonarAuditavel(CRITERIOS_PADRAO_VALIDACAO),
    };
    setOverlay("Executando motor estatístico…", "Validação analítica de exemplo.");
    const rel = await rodarPythonComDados("_run_validacao", dados, papeis, opcoes);
    checkAutoteste(checks, !!rel.ok, "Motor Python/Pyodide", "Motor executou a validação sem erro.", rel.erro || "Motor retornou erro.", rel.tipo || "");
    checkAutoteste(checks, Object.keys(ENGINE_HASHES).length === ARQ_ENGINE.length, "Hashes do motor", "Todos os arquivos Python foram hasheados.", "Nem todos os arquivos Python têm hash registrado.", `${Object.keys(ENGINE_HASHES).length}/${ARQ_ENGINE.length}`);

    checkAutoteste(checks, rel.linearidade?.aplicavel && rel.linearidade.r2 > 0.99, "Linearidade", "R² do exemplo acima de 0,99.", "Linearidade do exemplo fora do esperado.", `R²=${fmt(rel.linearidade?.r2,5)}`);
    checkAutoteste(checks, rel.outliers?.grubbs?.aplicavel, "Teste de Grubbs", "Grubbs aplicável no exemplo.", "Grubbs não ficou aplicável.", `n=${rel.outliers?.grubbs?.n || ""}`);
    checkAutoteste(checks, rel.homocedasticidade?.aplicavel, "Homocedasticidade", "Cochran/Levene/Brown-Forsythe executados.", "Homocedasticidade não executou.", `${rel.homocedasticidade?.k_grupos || 0} grupos`);
    checkAutoteste(checks, rel.recuperacao?.aplicavel, "Recuperação", "Recuperação/tendência calculadas.", "Recuperação não calculada.", `${fmt(rel.recuperacao?.recuperacao?.media,3)}%`);
    checkAutoteste(checks, rel.precisao?.repetibilidade?.aplicavel, "Precisão", "Repetibilidade calculada.", "Repetibilidade não calculada.", `CVr=${fmt(rel.precisao?.repetibilidade?.cv_r,2)}%`);
    checkAutoteste(checks, rel.horwitz?.aplicavel, "Horwitz", "HorRat calculado com C=1e-6.", "Horwitz não calculado.", `HorRat=${fmt(rel.horwitz?.HorRat,3)}`);

    setOverlay("Executando regressões estatísticas…", "Transformação de proporção e cobertura forense.");
    const dadosProporcao = {
      tratamento: ["A","A","A","A","A","A","A","A","B","B","B","B","B","B","B","B","C","C","C","C","C","C","C","C"],
      severidade: [0,0,0,5,5,5,10,15,30,35,40,45,55,60,65,70,85,90,95,95,95,100,100,100],
    };
    const relProporcao = await rodarPythonComDados(
      "_run_web",
      dadosProporcao,
      {resposta:"severidade", fatores:["tratamento"], tipo_resposta:"proporcao"},
      {alfa:0.05, tipo_resposta:"proporcao"},
    );
    const transformacaoProporcao = relProporcao?.analise?.transformacao || "";
    checkAutoteste(
      checks,
      !!relProporcao.ok &&
        transformacaoProporcao === "arcsen√ (proporção 0–100)" &&
        relProporcao?.comparacao_medias?.tukey?.escala_teste === transformacaoProporcao &&
        relProporcao?.comparacao_medias?.scott_knott?.escala_teste === transformacaoProporcao,
      "Regressão: transformação de proporção",
      "ANOVA, Tukey e Scott-Knott usaram arco-seno da raiz na escala 0–100.",
      "A rota percentual não propagou a transformação por toda a análise.",
      `${transformacaoProporcao || relProporcao?.erro || "sem transformação"} · `+
        `Tukey=${relProporcao?.comparacao_medias?.tukey?.escala_teste || "—"} · `+
        `SK=${relProporcao?.comparacao_medias?.scott_knott?.escala_teste || "—"}`,
    );

    const relForense = await rodarPythonComDados(
      "_run_forense",
      {resposta:[1,2,3,4], tratamento:["A","A","B","B"]},
      {resposta:"resposta", tratamento:"tratamento"},
      {tipo:"count", modo:"conservador", seed:12345},
    );
    const vereditoForense = relForense?.veredito || {};
    checkAutoteste(
      checks,
      !!relForense.ok &&
        vereditoForense.nivel === "EVIDÊNCIA INSUFICIENTE" &&
        vereditoForense.cobertura_suficiente === false,
      "Regressão: cobertura forense",
      "Baixa cobertura bloqueou o veredito limpo.",
      "Baixa cobertura ainda permitiu falsa ausência de sinais.",
      `${vereditoForense.nivel || relForense?.erro || "sem veredito"} · `+
        `${vereditoForense.testes_executados || 0}/${vereditoForense.testes_previstos || 0}`,
    );

    const parecer = avaliarCriteriosValidacao(rel, opcoes.criterios_aceitacao);
    checkAutoteste(checks, parecer.itens.length >= 10 && parecer.falhas >= 1, "Parecer automático", "Parecer detectou aprovações e pontos para revisão.", "Parecer não classificou os critérios como esperado.", `${parecer.oks} OK; ${parecer.falhas} revisar; ${parecer.nao_avaliados} não avaliados`);

    const exec = {
      iniciado_em: iniciado,
      modo: "validacao",
      dados: clonarAuditavel(dados),
      fonte_dados: {
        origem: "autoteste",
        nome: nomeExemplo,
        detalhe: "Exemplo determinístico interno",
        carregado_em: iniciado,
        linhas,
        colunas: Object.keys(dados).length,
        nomes_colunas: Object.keys(dados),
      },
      papeis,
      opcoes,
      identificacao: {estudo: `AUTOTESTE-${APP_VERSION}`, responsavel: "BioEnsaio"},
      custodia: {
        origem_primaria: "autoteste",
        registro_bruto: nomeExemplo,
        coletor_origem: "BioEnsaio",
        data_hora_coleta: iniciado,
        local_equipamento: "runtime Pyodide",
        observacao_anexo: "Exemplo interno determinístico",
        informada: true,
        minima: true,
      },
      pipeline: {
        modo: "validacao",
        tipo: "autoteste",
        rota: {titulo: "Autoteste de validação", descricao: "Execução interna determinística.", chips: ["motor","auditoria","PWA"]},
        criticos: 0,
        avisos: 0,
        oks: checks.filter(c=>c.status === "ok").length,
        bloqueia: false,
        checks: [],
      },
      colunas: Object.keys(dados).map(nome=>({nome, n: linhas})),
    };
    pacote = await montarPacoteAuditoriaDeExecucao(exec, rel, "Autoteste técnico GLP/BPL/ISO 27001 BioEnsaio.");
    const verificacao = await verificarPacoteAuditoria(pacote);
    checkAutoteste(checks, !!verificacao.ok, "Verificador do pacote", "Hashes internos recalculados com sucesso.", "Verificador encontrou falha no pacote.", verificacao.checks.map(c=>`${c.item}:${c.status}`).join("; "));
    checkAutoteste(checks, (pacote.metadata.hashes.pacote_sha256 || "").length === 64, "SHA-256 do pacote", "Hash final do pacote gerado.", "Hash final do pacote ausente.", pacote.metadata.hashes.pacote_sha256 || "");
    checkAutoteste(checks, (pacote.metadata.hashes.custodia_sha256 || "").length === 64, "SHA-256 da custódia", "Hash da cadeia de custódia gerado.", "Hash da custódia ausente.", pacote.metadata.hashes.custodia_sha256 || "");
    checkAutoteste(checks, pacote.metadata.rastreabilidade?.estudo_informado && pacote.metadata.rastreabilidade?.responsavel_informado, "Rastreabilidade", "ID de estudo e responsável registrados.", "Rastreabilidade incompleta no pacote.", pacote.metadata.record_id);

    const manifestHref = document.querySelector('link[rel="manifest"]')?.getAttribute("href") || "";
    checkAutoteste(checks, manifestHref.includes(APP_VERSION), "Manifesto PWA", "Manifesto aponta para a versão atual.", "Manifesto não aponta para a versão atual.", manifestHref);
    checkAutoteste(checks, SW_CACHE_VERSION.startsWith("bioensaio-v"), "Cache PWA", "Versão do service worker registrada.", "Versão do service worker ausente.", SW_CACHE_VERSION);
    if("serviceWorker" in navigator) adicionarCheckAutoteste(checks, "ok", "Service worker", "Navegador suporta service worker.", SW_CACHE_VERSION);
    else adicionarCheckAutoteste(checks, "aviso", "Service worker", "Navegador não expõe service worker neste contexto.", SW_CACHE_VERSION);
  }catch(e){
    console.error("autoteste:", e);
    adicionarCheckAutoteste(checks, "falha", "Autoteste", e.message || String(e), "");
  }finally{
    esconderOverlay();
    if(btn) btn.disabled = false;
  }
  const res = {
    ok: checks.every(c=>c.status !== "falha"),
    app_version: APP_VERSION,
    engine_version: ENGINE_VERSION,
    sw_cache_version: SW_CACHE_VERSION,
    audit_format: AUDIT_FORMAT,
    pacote_sha256: pacote?.metadata?.hashes?.pacote_sha256 || "",
    iniciado_em: iniciado,
    concluido_em: new Date().toISOString(),
    checks,
  };
  if(res.ok) salvarProntidaoSistema(res);
  atualizarBotaoAutoteste();
  atualizarPipeline();
  renderAutoteste(res);
  avisar(res.ok ? "Autoteste concluído sem falhas." : "Autoteste encontrou falhas.", res.ok ? "ok" : "erro");
  return res;
}
if(typeof window !== "undefined"){
  window.BioEnsaioAudit = Object.freeze({
    appVersion: APP_VERSION,
    swCacheVersion: SW_CACHE_VERSION,
    auditFormat: AUDIT_FORMAT,
    montarPacoteAtual: () => montarPacoteAuditoria(ULTIMO_RELATORIO),
    verificarPacote: verificarPacoteAuditoria,
    prontidaoSistema: resumoProntidaoSistema,
    executarAutoteste,
  });
}
function blocoControlesConformidade(meta){
  const controles = meta.controles_conformidade || [];
  const rows = controles.map(c=>`<tr><td>${esc(c.referencia)}</td><td>${esc(c.controle)}</td><td>${esc(c.evidencia)}</td><td>${esc(c.status)}</td></tr>`).join("");
  const lacunas = (meta.lacunas_organizacionais || []).map(x=>`<li>${esc(x)}</li>`).join("");
  return `<details class="audit-rules"><summary>Matriz de controles e limites</summary>`+
    `<div class="tab-rolavel"><table><thead><tr><th>Referência</th><th>Controle</th><th>Evidência</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`+
    (lacunas ? `<h4>Dependências do laboratório</h4><ul>${lacunas}</ul>` : "")+
    `</details>`;
}
function blocoCustodiaAuditoria(custodia){
  const c = custodia || {};
  const rows = [
    ["Origem primária", c.origem_primaria],
    ["Registro bruto", c.registro_bruto],
    ["Coletor/origem", c.coletor_origem],
    ["Data/hora da coleta", c.data_hora_coleta],
    ["Local/equipamento", c.local_equipamento],
    ["Observação/anexo", c.observacao_anexo],
  ].map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v || "não informado")}</td></tr>`).join("");
  return `<details class="audit-rules"><summary>Cadeia de custódia</summary>`+
    `<div class="tab-rolavel"><table><thead><tr><th>Campo</th><th>Valor registrado</th></tr></thead><tbody>${rows}</tbody></table></div>`+
    `</details>`;
}
function blocoAuditoria(meta){
  const hs = meta.hashes || {};
  const pipe = meta.pipeline || {};
  const regras = meta.regras_operacionais || {};
  const ident = meta.identificacao || {};
  const custodia = meta.custodia || {};
  const fonte = meta.fonte_dados || {};
  const parecer = meta.parecer_aceitacao || {};
  const prontidao = meta.prontidao_sistema || {};
  const rastreavel = meta.rastreabilidade && meta.rastreabilidade.estudo_informado && meta.rastreabilidade.responsavel_informado;
  const lista = (regras.itens || []).map(r=>`<li>${esc(r)}</li>`).join("");
  return `<div class="audit-panel">`+
    `<div class="audit-grid">`+
      `<div><span>Registro</span><b>${esc(meta.record_id)}</b></div>`+
      `<div><span>Estudo</span><b>${esc(ident.estudo || "não informado")}</b></div>`+
      `<div><span>Responsável</span><b>${esc(ident.responsavel || "não informado")}</b></div>`+
      `<div><span>Cadeia de custódia</span><b>${esc(resumoCustodia(custodia))}</b></div>`+
      `<div><span>Fonte dos dados</span><b>${esc([fonte.origem, fonte.arquivo || fonte.nome || fonte.detalhe].filter(Boolean).join(" · ") || "não informada")}</b></div>`+
      `<div><span>App</span><b>${esc(meta.app_version)}</b></div>`+
      `<div><span>Motor</span><b>${esc(meta.engine_version)}</b></div>`+
      `<div><span>Dados</span><b>${fmt(meta.dados.linhas,0)} linhas × ${fmt(meta.dados.colunas,0)} colunas</b></div>`+
      `<div><span>SHA-256 dos dados</span><b class="hash">${esc(hs.dados_sha256)}</b></div>`+
      `<div><span>SHA-256 da custódia</span><b class="hash">${esc(hs.custodia_sha256 || "não informado")}</b></div>`+
      `<div><span>SHA-256 do resultado</span><b class="hash">${esc(hs.resultado_sha256)}</b></div>`+
      `<div><span>SHA-256 do pacote</span><b class="hash">${esc(hs.pacote_sha256 || "em geração")}</b></div>`+
      `<div><span>Parecer de aceitação</span><b>${esc(parecer.resumo || "não aplicável")}</b></div>`+
      ((typeof window!=='undefined' && window.__agractaEmbed) ? '' : `<div><span>Autoteste da versão</span><b>${prontidao.ok ? `aprovado · ${esc(prontidao.checks_ok || 0)} OK · ${esc(String(prontidao.pacote_sha256 || "").slice(0,12))}…` : "não aprovado"}</b></div>`)+
      `<div><span>Conferência</span><b>${fmt(pipe.criticos||0,0)} crítico(s), ${fmt(pipe.avisos||0,0)} aviso(s), ${fmt(pipe.oks||0,0)} OK</b></div>`+
      `<div><span>Rastreabilidade</span><b>${rastreavel ? "completa" : "incompleta"}</b></div>`+
      `<div><span>PWA</span><b>${esc(meta.pwa_display_mode)}</b></div>`+
    `</div>`+
    (lista ? `<details class="audit-rules"><summary>Regras estatísticas registradas</summary><ul>${lista}</ul></details>` : "")+
    blocoCustodiaAuditoria(custodia)+
    blocoControlesConformidade(meta)+
    `<p class="dica">${esc(meta.limite_compliance)}</p>`+
    `</div>`;
}
function anexarTrilhaAuditoria(out, rel){
  ULTIMO_RELATORIO = clonarAuditavel(rel || {});
  const bloco = secao("Trilha de auditoria GLP/BPL/ISO/IEC 27001", `<p class="dica">Gerando registro técnico da execução…</p>`);
  out.appendChild(bloco);
  montarPacoteAuditoria(rel).then(pacote=>{
    AUDIT_ATUAL = pacote;
    bloco.innerHTML = `<h3>Trilha de auditoria GLP/BPL/ISO/IEC 27001</h3>${blocoAuditoria(pacote.metadata)}`;
  }).catch(e=>{
    console.error("auditoria:", e);
    bloco.innerHTML = `<h3>Trilha de auditoria GLP/BPL/ISO/IEC 27001</h3><p class="dica">Não foi possível gerar o registro de auditoria: ${esc(e.message || e)}</p>`;
  });
}
["#opt-tipo","#opt-alfa","#opt-unidade","#opt-niveis","#opt-controle","#opt-logdose",
	 "#opt-controle-neg","#opt-sk","#opt-alfa-tempo","#opt-ctrlmax",
	 "#opt-alfa-valid","#opt-horwitz-c","#opt-robustez","#opt-valid-branco",
   "#opt-crit-r2","#opt-crit-rec-min","#opt-crit-rec-max","#opt-crit-cv-max","#opt-crit-horrat-min","#opt-crit-horrat-max"].forEach(sel=>{
  const node=$(sel);
  if(node){
    node.addEventListener("change", ()=>{ invalidarResultado("Opções de análise alteradas"); atualizarPipeline(); });
    node.addEventListener("input", ()=>{ invalidarResultado("Opções de análise alteradas"); atualizarPipeline(); });
  }
});
["#audit-estudo","#audit-responsavel","#audit-origem-bruta","#audit-registro-bruto","#audit-coletor","#audit-data-coleta","#audit-local-equipamento","#audit-observacao-custodia"].forEach(sel=>{
  const node=$(sel);
  if(node){
    node.addEventListener("input", ()=>{ invalidarResultado("Rastreabilidade do registro alterada"); atualizarPipeline(); });
    node.addEventListener("change", ()=>{ invalidarResultado("Rastreabilidade do registro alterada"); atualizarPipeline(); });
  }
});

/* ----------------------------------------------------------------------- */
/* Analisar                                                                */
/* ----------------------------------------------------------------------- */
async function rodarPython(fnNome, papeis, opcoes){
  await garantirPyodide();
  mostrarOverlay("Analisando…","");
  await new Promise(r=>setTimeout(r,30));
  try{
    return await rodarPythonComDados(fnNome, montarDados(), papeis, opcoes);
  }finally{
    esconderOverlay();
  }
}
async function rodarPythonComDados(fnNome, dados, papeis, opcoes){
  await garantirPyodide();
  const fn = pyodide.globals.get(fnNome);
  try{
    const json = fn(JSON.stringify(dados), JSON.stringify(papeis), JSON.stringify(opcoes));
    return JSON.parse(json);
  }finally{
    fn.destroy();
  }
}

$("#btn-analisar").addEventListener("click", async () => {
  if(MODO==="tempo") return analisarTempo();
  if(MODO==="validacao") return analisarValidacao();
  if(MODO==="forense") return analisarForense();
  if(!validarPipelineAntesDeAnalisar()) return;
  const papeis = lerPapeis();
  if(!papeis.resposta){ avisar("Defina qual coluna é a Resposta."); return; }
  const opcoes = { alfa: parseFloat($("#opt-alfa").value), log_dose: $("#opt-logdose").checked };
  const uni = ($("#opt-unidade").value||"").trim(); if(uni) opcoes.unidade_dose = uni;
  const niveisStr = ($("#opt-niveis").value||"").trim();
  if(niveisStr){
    const probs = niveisStr.split(/[;,]/).map(s=>parseFloat(s.replace(",","."))/100)
                           .filter(p=>p>0 && p<1);
    if(probs.length) opcoes.probs = probs;
  }
  const ctrlStr = ($("#opt-controle").value||"").trim();
  if(ctrlStr){ const c=parseFloat(ctrlStr.replace(",","."))/100; if(c>0 && c<1) opcoes.controle_mort = c; }
  try{
    registrarExecucao(papeis, opcoes);
    renderRelatorio(await rodarPython("_run_web", papeis, opcoes));
  }catch(e){ esconderOverlay(); renderRelatorio({ok:false, erro:e.message}); console.error(e); }
});

async function analisarTempo(){
  if(!validarPipelineAntesDeAnalisar()) return;
  const papeis = lerPapeisTempo();
  const falta = ["tratamento","tempo","n_total","n_vivos"].filter(k=>!papeis[k]);
  if(falta.length){ avisar("Defina as colunas: "+falta.join(", ")); return; }
  const opcoes = {
    alfa: parseFloat($("#opt-alfa-tempo").value),
    sk_threshold: parseInt($("#opt-sk").value),
    ctrl_mort_max: parseFloat(($("#opt-ctrlmax").value||"20").replace(",",".")) || 20,
  };
  const cn = $("#opt-controle-neg").value; if(cn) opcoes.controle_neg = cn;
  try{
    registrarExecucao(papeis, opcoes);
    renderRelatorioTempo(await rodarPython("_run_tempo", papeis, opcoes));
  }catch(e){ esconderOverlay(); renderRelatorioTempo({ok:false, erro:e.message}); console.error(e); }
}
async function analisarValidacao(){
  if(!validarPipelineAntesDeAnalisar()) return;
  const papeis = lerPapeisValidacao();
  if(!papeis.resposta){ avisar("Defina qual coluna é a resposta/resultado."); return; }
  const opcoes = {
    alfa: parseFloat($("#opt-alfa-valid").value),
    robustez: !!$("#opt-robustez").checked,
    usar_branco: !!$("#opt-valid-branco").checked,
    criterios_aceitacao: lerCriteriosValidacao(),
  };
  const hc = ($("#opt-horwitz-c").value||"").trim();
  if(hc) opcoes.horwitz_c = hc.replace(",", ".");
  try{
    registrarExecucao(papeis, opcoes);
    renderRelatorioValidacao(await rodarPython("_run_validacao", papeis, opcoes));
  }catch(e){ esconderOverlay(); renderRelatorioValidacao({ok:false, erro:e.message}); console.error(e); }
}
async function analisarForense(){
  if(!validarPipelineAntesDeAnalisar()) return;
  const papeis = lerPapeisForense();
  if(!papeis.resposta){ avisar("Defina a coluna de Resposta."); return; }
  if(!papeis.tratamento){ avisar("Defina a coluna de Tratamento (grupo)."); return; }
  const opcoes = {
    tipo: $("#opt-forense-tipo").value,        // "count" | "cont"
    modo: $("#opt-forense-modo").value,        // "conservador" | "sensivel"
  };
  const ctrl = ($("#opt-forense-controle").value||"").trim();
  if(ctrl) opcoes.controle = ctrl.replace(",", ".");
  try{
    registrarExecucao(papeis, opcoes);
    renderRelatorioForense(await rodarPython("_run_forense", papeis, opcoes));
  }catch(e){ esconderOverlay(); renderRelatorioForense({ok:false, erro:e.message}); console.error(e); }
}

/* ----------------------------------------------------------------------- */
/* Render do relatório                                                     */
/* ----------------------------------------------------------------------- */
function fmt(x, d=3){ if(x==null||x===undefined) return "—"; if(typeof x!=="number") return String(x); if(!isFinite(x)) return "∞"; return x.toLocaleString("pt-BR",{maximumFractionDigits:d, minimumFractionDigits:0}); }
function p_chip(p){ if(p==null) return ""; const sig=p<0.05; return `<span class="chip ${sig?'chip-ok':'chip-info'}">p=${fmt(p,4)}</span>`; }

function renderRelatorio(rel){
  const out=$("#resultados"); out.innerHTML="";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  if(!rel.ok){
    out.appendChild(renderErroRelatorio(rel));
    anexarTrilhaAuditoria(out, rel);
    _agractaEmitirResultado(rel);
    $("#card-resultados").scrollIntoView({behavior:"smooth"}); return;
  }
  renderPipelineRelatorio(out);
  // Detecção
  const det=rel.deteccao;
  out.appendChild(secao("Detecção",
    `<div>${chip(det.tipo_resposta,"chip-ok")} ${det.desenho.tem_dose?chip("dose-resposta","chip-info"):""} `+
    `${det.desenho.n_fatores?chip(det.desenho.n_fatores+" fator(es)","chip-info"):""} `+
    `${det.desenho.tem_bloco?chip("com bloco","chip-info"):""}</div>`+
    `<p class="dica">${det.detalhe_resposta||""}</p>`));

  if(rel.decisao) out.appendChild(htmlBloco(`<div class="decisao"><b>Decisão do app:</b> ${rel.decisao}</div>`));
  (rel.avisos||[]).forEach(a=> out.appendChild(htmlBloco(`<div class="aviso"><b>Aviso:</b> ${a}</div>`)));

  if(rel.descritiva) out.appendChild(secao("Estatística descritiva", tabelaDescritiva(rel.descritiva)));

  const a = rel.analise || {};
  if(a.doses_letais || a.curvas) renderDose(out, a);
  else if(a.tabela_anova) renderAnova(out, rel);
  else if(a.medias_estimadas || a.proporcoes_estimadas) renderGlm(out, a);
  else if(a.normalidade) out.appendChild(secao("Normalidade", tabelaNormalidade(a.normalidade)));

  anexarTrilhaAuditoria(out, rel);
  _agractaEmitirResultado(rel);
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}

function secao(titulo, htmlInterno){ const b=el("div","bloco"); b.innerHTML=`<h3>${titulo}</h3>`+htmlInterno; return b; }
function htmlBloco(html){ const b=el("div","bloco"); b.innerHTML=html; return b; }
function chip(t,c="chip-info"){ return `<span class="chip ${c}">${t}</span>`; }
function renderErroRelatorio(rel){
  const detalhe = rel.trace ? `<details class="trace-box"><summary>Detalhes técnicos</summary><pre>${esc(rel.trace)}</pre></details>` : "";
  return htmlBloco(`<div class="erro-box"><b>Não foi possível analisar.</b><br>${esc(rel.erro||"Verifique os dados e os papéis das colunas.")}</div>${detalhe}`);
}

function tabelaDescritiva(desc){
  const temProp = desc[0] && ("proporcao" in desc[0]);
  let h=`<div class="tab-rolavel"><table><thead><tr><th>Tratamento</th><th>n</th>`;
  h += temProp ? `<th>Eventos</th><th>Proporção</th>` : `<th>Média</th><th>DP</th><th>EP</th><th>CV%</th><th>Mín</th><th>Máx</th>`;
  h += `</tr></thead><tbody>`;
  desc.forEach(d=>{
    h += `<tr><td>${esc(d.tratamento)}</td><td>${d.n}</td>`;
    h += temProp ? `<td>${d.eventos}</td><td>${fmt(d.proporcao,3)}</td>`
                 : `<td>${fmt(d.media)}</td><td>${fmt(d.dp)}</td><td>${fmt(d.ep)}</td><td>${fmt(d.cv,1)}</td><td>${fmt(d.min)}</td><td>${fmt(d.max)}</td>`;
    h += `</tr>`;
  });
  return h+`</tbody></table></div>`;
}
function tabelaNormalidade(n){
  return `<div class="kv"><dt>Teste</dt><dd>${n.teste}</dd>`+
    `<dt>Estatística</dt><dd>${fmt(n.estatistica,4)}</dd>`+
    `<dt>p-valor</dt><dd>${fmt(n.p,4)} ${n.normal?chip("normal","chip-ok"):chip("não-normal","chip-alerta")}</dd>`+
    (n.assimetria!=null?`<dt>Assimetria</dt><dd>${fmt(n.assimetria,3)}</dd>`:"")+
    (n.curtose!=null?`<dt>Curtose</dt><dd>${fmt(n.curtose,3)}</dd>`:"")+`</div>`;
}

/* ---- Dose-resposta ---- */
function renderDose(out, a){
  const curvas = a.curvas ? a.curvas : [a];
  const uni = (document.getElementById('opt-unidade')?.value || "").trim();
  const sufUni = uni ? " " + uni : "";
  curvas.forEach(c=>{
    const titulo = c.grupo && c.grupo!=="(único)" ? `Dose-resposta — ${c.grupo}` : "Dose-resposta";
    let h = `<div class="kv">`+
      `<dt>Modelo</dt><dd>${c.tipo_analise} ${chip("ligação: "+c.link,"chip-info")}</dd>`+
      `<dt>Inclinação (slope)</dt><dd>${fmt(c.slope,3)} ± ${fmt(c.slope_se,3)}</dd>`+
      `<dt>χ² aderência</dt><dd>${fmt(c.qui_quadrado,2)} (gl=${c.gl}) ${p_chip(c.p_qui_quadrado)}</dd>`+
      `<dt>Heterogeneidade (h)</dt><dd>${fmt(c.heterogeneidade_h,2)} ${c.heterogeneo?chip("heterogêneo → IC por t","chip-alerta"):chip("homogêneo","chip-ok")}</dd>`+
      (c.abbott_aplicado?`<dt>Abbott</dt><dd>${chip("corrigido (controle "+fmt(c.controle_mortalidade*100,1)+"%)","chip-info")}</dd>`:"")+
      `</div>`;
    const colDose = "Dose" + (uni ? ` (${uni})` : "");
    h += `<div class="tab-rolavel"><table><thead><tr><th>Letal</th><th>${esc(colDose)}</th><th>IC95% inf.</th><th>IC95% sup.</th></tr></thead><tbody>`;
    c.doses_letais.forEach(dl=>{
      h += `<tr><td>CL/DL${Math.round(dl.p*100)}</td><td><b>${fmt(dl.dose,3)}${sufUni}</b></td><td>${fmt(dl.ic_inf,3)}</td><td>${fmt(dl.ic_sup,3)}</td></tr>`;
    });
    h += `</tbody></table></div>`;
    if(c.modelo_natural_mle) h += `<p class="dica">Modelo com mortalidade natural estimada (Finney): C=${fmt(c.modelo_natural_mle.C*100,1)}%.</p>`;
    const b = secao(titulo, h);
    const cv = el("canvas"); cv.width=600; cv.height=320; b.appendChild(cv);
    out.appendChild(b);
    desenharDose(cv, c, uni);
  });
  if(a.comparacao) renderComparacaoCurvas(out, a.comparacao, uni);
}

function renderComparacaoCurvas(out, comp, uni){
  const sufUni = uni ? " "+uni : "";
  let h = "";
  const par = comp.paralelismo || {};
  if(par.erro){
    h += `<div class="aviso">Não foi possível testar paralelismo: ${par.erro}</div>`;
  } else {
    h += `<div style="margin-bottom:8px">`+
      (par.paralelo ? chip("curvas paralelas (p="+fmt(par.p,3)+")","chip-ok")
                    : chip("inclinações diferem (p="+fmt(par.p,3)+") — potência varia com a dose","chip-alerta"));
    if(comp.diferenca_potencia){
      const dp=comp.diferenca_potencia;
      h += dp.difere ? chip("potências diferem (p="+fmt(dp.p,3)+")","chip-info")
                     : chip("sem diferença de potência (p="+fmt(dp.p,3)+")","chip-ok");
    }
    h += `</div>`;
  }
  h += `<p class="dica">Referência (RR=1): <b>${comp.referencia||"—"}</b> — menor CL50 (mais sensível/potente). `+
       `RR &gt; 1 = menos sensível (mais resistente / menos potente).</p>`;
  h += `<div class="tab-rolavel"><table><thead><tr><th>Produto/Pop.</th><th>CL50${uni?" ("+uni+")":""}</th>`+
       `<th>Razão (RR)</th><th>IC95%</th></tr></thead><tbody>`;
  (comp.razoes||[]).forEach(r=>{
    const sig = r.significativo && !r.referencia ? " significativo" : "";
    const tag = r.referencia ? ` <span class="op-tag">ref</span>` : "";
    h += `<tr><td>${esc(r.grupo)}${tag}</td><td>${fmt(r.lc50,3)}${sufUni}</td>`+
         `<td><b>${fmt(r.rr,2)}×</b>${sig}</td>`+
         `<td>${r.referencia?"—":fmt(r.ic_inf,2)+" – "+fmt(r.ic_sup,2)}</td></tr>`;
  });
  h += `</tbody></table></div><p class="dica">Significativo = RR significativamente diferente de 1 (IC não inclui 1).</p>`;
  out.appendChild(secao("Comparação de potência / resistência", h));
}

/* ---- ANOVA ---- */
function renderAnova(out, rel){
  const a = rel.analise;
  let diag = `<div>`+
    (a.normalidade? (a.normalidade.normal?chip("resíduos normais","chip-ok"):chip("resíduos não-normais (p="+fmt(a.normalidade.p,3)+")","chip-alerta")) : "")+
    (a.homogeneidade? (a.homogeneidade.homogenea?chip("variâncias homogêneas","chip-ok"):chip("variâncias heterogêneas","chip-alerta")) : "")+
    (a.transformacao?chip("transformação: "+a.transformacao,"chip-info"):"")+
    (a.pressupostos_ok?chip("pressupostos OK","chip-ok"):chip("pressupostos violados","chip-alerta"))+
    `</div>`;
  out.appendChild(secao(a.tipo_analise, diag));

  let h=`<div class="tab-rolavel"><table><thead><tr><th>Fonte</th><th>GL</th><th>SQ</th><th>QM</th><th>F</th><th>p</th></tr></thead><tbody>`;
  a.tabela_anova.forEach(l=>{
    h+=`<tr><td>${l.fonte}</td><td>${fmt(l.gl,0)}</td><td>${fmt(l.sq,2)}</td><td>${fmt(l.qm,2)}</td><td>${fmt(l.F,2)}</td><td>${l.p!=null?fmt(l.p,4):"—"} ${l.p!=null&&l.p<0.05?"significativo":""}</td></tr>`;
  });
  h+=`</tbody></table></div>`;
  if(a.kruskal) h+=`<p class="dica">Kruskal-Wallis (não-paramétrico): H=${fmt(a.kruskal.H,2)}, p=${fmt(a.kruskal.p,4)}.</p>`;
  out.appendChild(secao("Tabela da ANOVA", h));

  const cm = rel.comparacao_medias || {};
  renderComparacoes(out, cm, rel.descritiva);
}

/* ---- GLM contagem/proporção ---- */
function renderGlm(out, a){
  const medias = a.medias_estimadas || a.proporcoes_estimadas;
  const rotulo = a.proporcoes_estimadas ? "Proporção estimada" : "Média estimada";
  let head = `<div>${chip(a.familia,"chip-info")} ${a.sobredispersao?chip("φ="+fmt(a.sobredispersao.phi,2),(a.sobredispersao.sobredisperso?"chip-alerta":"chip-ok")):""}</div>`;
  if(a.nota_modelo) head += `<p class="dica">${a.nota_modelo}</p>`;
  out.appendChild(secao(a.tipo_analise, head));

  let h=`<div class="tab-rolavel"><table><thead><tr><th>Tratamento</th><th>${esc(rotulo)}</th><th>Grupo</th></tr></thead><tbody>`;
  a.ordem.forEach(t=> h+=`<tr><td>${esc(t)}</td><td>${fmt(medias[t],3)}</td><td><span class="letra">${esc(a.letras[t]||"")}</span></td></tr>`);
  h+=`</tbody></table></div><p class="dica">Tratamentos com a mesma letra não diferem (α=${a.alfa}).</p>`;
  const b=secao("Comparação de tratamentos", h);
  const cv=el("canvas"); cv.width=600; cv.height=300; b.appendChild(cv);
  out.appendChild(b);
  desenharBarras(cv, a.ordem, medias, a.letras, rotulo);
}

function renderComparacoes(out, cm, descritiva){
  const medias={}, erros={};
  (descritiva||[]).forEach(d=>{ medias[d.tratamento]=d.media; if(d.ep!=null) erros[d.tratamento]=d.ep; });
  ["tukey","scott_knott","dunn"].forEach(metodo=>{
    const r=cm[metodo]; if(!r) return;
    const ordem = r.ordem || Object.keys(r.letras);
    const valores = r.medias_exibicao || r.medias || r.medianas || medias;
    const rotuloValor = r.medianas ? "Mediana" : (r.escala_teste && r.escala_teste !== "original" ? "Média (escala original)" : "Média");
    let h=`<div class="tab-rolavel"><table><thead><tr><th>Tratamento</th><th>${rotuloValor}</th>${r.medianas?"":"<th>± EP</th>"}<th>Grupo</th></tr></thead><tbody>`;
    ordem.forEach(t=> h+=`<tr><td>${esc(t)}</td><td>${fmt(valores[t],3)}</td>${r.medianas?"":`<td>${erros[t]!=null?"± "+fmt(erros[t],2):"—"}</td>`}<td><span class="letra">${esc(r.letras[t]||"")}</span></td></tr>`);
    h+=`</tbody></table></div><p class="dica">Mesma letra = não diferem (α=${r.alfa}).${r.medianas?"":" Barras = média ± erro-padrão."}`+
      (r.escala_teste && r.escala_teste !== "original" ? ` Agrupamento calculado na escala ${esc(r.escala_teste)}; valores exibidos na escala original.` : "")+
      `</p>`;
    const b=secao(r.metodo, h);
    const cv=el("canvas"); cv.width=600; cv.height=300; b.appendChild(cv);
    out.appendChild(b);
    desenharBarras(cv, ordem, valores, r.letras, r.medianas?"Mediana":"Média", r.medianas?null:erros);
  });
}

/* ---- Validação de método ---- */
function chipBool(v, okTxt="OK", alertaTxt="verificar"){
  if(v===null || v===undefined) return chip("não aplicável","chip-info");
  return chip(v ? okTxt : alertaTxt, v ? "chip-ok" : "chip-alerta");
}
function tabelaStatsLista(lista, titulo="Grupo"){
  if(!lista || !lista.length) return `<p class="dica">Sem grupos suficientes.</p>`;
  let h=`<div class="tab-rolavel"><table><thead><tr><th>${esc(titulo)}</th><th>n</th><th>Média</th><th>DP</th><th>CV/DPR %</th><th>Mediana</th><th>Mín</th><th>Máx</th></tr></thead><tbody>`;
  lista.forEach(d=>{
    h+=`<tr><td>${esc(d.grupo||"geral")}</td><td>${fmt(d.n,0)}</td><td>${fmt(d.media,4)}</td><td>${fmt(d.dp,4)}</td><td>${fmt(d.cv,2)}</td><td>${fmt(d.mediana,4)}</td><td>${fmt(d.min,4)}</td><td>${fmt(d.max,4)}</td></tr>`;
  });
  return h+`</tbody></table></div>`;
}
function blocoLinearidade(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "Linearidade não aplicável.")}</p>`;
  const faixa=v.faixa_trabalho||{};
  let h=`<div class="kv">`+
    `<dt>Equação</dt><dd>y = ${fmt(v.intercepto,5)} + ${fmt(v.inclinação,5)}x</dd>`+
    `<dt>Sensibilidade</dt><dd>${fmt(v.sensibilidade,5)} ${p_chip(v.p_inclinacao)}</dd>`+
    `<dt>R² / R² ajustado</dt><dd>${fmt(v.r2,5)} / ${fmt(v.r2_ajustado,5)}</dd>`+
    `<dt>Faixa de trabalho</dt><dd>${fmt(faixa.min,4)} a ${fmt(faixa.max,4)} (${faixa.niveis||"—"} níveis)</dd>`+
    `<dt>Desvio residual</dt><dd>${fmt(v.s_residual,5)}</dd>`+
    `</div>`;
  if(v.normalidade_residuos) h+=`<p class="dica">Normalidade dos resíduos: p=${fmt(v.normalidade_residuos.p,4)} ${chipBool(v.normalidade_residuos.normal,"compatível com Gauss","não-normal")}</p>`;
  if(v.falta_ajuste){
    h+=`<p class="dica">Falta de ajuste: F=${fmt(v.falta_ajuste.F,3)}, p=${fmt(v.falta_ajuste.p,4)} ${chipBool(v.falta_ajuste.sem_falta_ajuste,"sem falta de ajuste","falta de ajuste")}</p>`;
  }
  return h;
}
function blocoLdLq(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "LD/LQ não aplicável.")}</p>`;
  let h=`<div class="tab-rolavel"><table><thead><tr><th>Base</th><th>s</th><th>n</th><th>LD</th><th>LQ</th></tr></thead><tbody>`;
  (v.metodo||[]).forEach(m=>{
    h+=`<tr><td>${esc(m.base)}</td><td>${fmt(m.s,5)}</td><td>${fmt(m.n,0)}</td><td><b>${fmt(m.ld,5)}</b></td><td><b>${fmt(m.lq,5)}</b></td></tr>`;
  });
  return h+`</tbody></table></div>`;
}
function blocoOutliers(v){
  const g=v?.grubbs||{}, j=v?.jackknife||{};
  let h=`<div class="kv">`+
    `<dt>Grubbs</dt><dd>${g.aplicavel ? `G=${fmt(g.estatistica,4)}; crítico=${fmt(g.critico,4)}; suspeito=${fmt(g.valor_suspeito,4)} ${chipBool(!g.outlier,"sem outlier","outlier")}` : esc(g.nota||"não aplicável")}</dd>`+
    `<dt>Jackknife</dt><dd>${j.aplicavel ? `máx |r|=${fmt(j.max_abs,3)}; crítico=${fmt(j.critico,3)} ${chipBool(!(j.outliers||[]).length,"sem outlier","outlier")}` : esc(j.nota||"não aplicável")}</dd>`+
    `</div>`;
  if(j.aplicavel && (j.outliers||[]).length){
    h+=`<div class="tab-rolavel"><table><thead><tr><th>Índice</th><th>x</th><th>y</th><th>Resíduo Jackknife</th></tr></thead><tbody>`;
    j.outliers.forEach(o=> h+=`<tr><td>${o.indice}</td><td>${fmt(o.x,4)}</td><td>${fmt(o.y,4)}</td><td>${fmt(o.residuo,4)}</td></tr>`);
    h+=`</tbody></table></div>`;
  }
  return h;
}
function blocoHomocedasticidade(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "Homocedasticidade não aplicável.")}</p>`;
  const c=v.cochran||{}, l=v.levene||{}, b=v.brown_forsythe||{};
  return `<div class="kv">`+
    `<dt>Cochran</dt><dd>C=${fmt(c.C,4)}; crítico=${fmt(c.critico,4)} ${chipBool(c.homogenea,"homogênea","heterogênea")} ${c.nota?`<span class="dica">${esc(c.nota)}</span>`:""}</dd>`+
    `<dt>Levene</dt><dd>W=${fmt(l.estatistica,4)}; p=${fmt(l.p,4)} ${chipBool(l.homogenea,"homogênea","heterogênea")}</dd>`+
    `<dt>Brown-Forsythe</dt><dd>W=${fmt(b.estatistica,4)}; p=${fmt(b.p,4)} ${chipBool(b.homogenea,"homogênea","heterogênea")}</dd>`+
    `</div>`;
}
function blocoRecuperacao(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "Recuperação não aplicável.")}</p>`;
  const r=v.recuperacao||{}, t=v.tendencia||{}, tt=v.teste_t_100||{};
  let h=`<div class="kv">`+
    `<dt>Recuperação média</dt><dd>${fmt(r.media,3)}% ± ${fmt(r.dp,3)} (CV=${fmt(r.cv,2)}%)</dd>`+
    `<dt>Tendência média</dt><dd>${fmt(t.media,5)} ± ${fmt(t.dp,5)}</dd>`+
    `<dt>Teste t vs. 100%</dt><dd>t=${fmt(tt.t,4)}; p=${fmt(tt.p,4)} ${chipBool(tt.sem_tendencia,"sem tendência","tendência")}</dd>`+
    `</div>`;
  if(v.por_grupo && v.por_grupo.length) h+=tabelaStatsLista(v.por_grupo, "Nível/grupo");
  return h;
}
function blocoPrecisao(v){
  if(!v) return "";
  const rep=v.repetibilidade||{}, repro=v.reprodutibilidade||{};
  let h=`<div class="kv">`+
    `<dt>Repetibilidade</dt><dd>${rep.aplicavel ? `sᵣ=${fmt(rep.s_r,5)}; CVᵣ=${fmt(rep.cv_r,2)}%; gl=${fmt(rep.gl,0)}` : "não aplicável"}</dd>`+
    `<dt>Reprodutibilidade</dt><dd>${repro.aplicavel ? `sᴿ=${fmt(repro.s_R,5)}; CVᴿ=${fmt(repro.cv_R,2)}%; condições=${fmt(repro.condicoes,0)}` : "não aplicável"}</dd>`+
    `</div>`;
  if(rep.grupos && rep.grupos.length) h+=tabelaStatsLista(rep.grupos, "Nível/matriz");
  (v.precisao_intermediaria||[]).forEach(c=>{
    h+=`<h4>${esc(c.fator)}</h4>`+blocoComparacaoValidacao(c);
  });
  return h;
}
function blocoComparacaoValidacao(c){
  if(!c || !c.aplicavel) return `<p class="dica">${esc(c?.nota || "Comparação não aplicável.")}</p>`;
  let h=tabelaStatsLista(c.descritiva||[], "Grupo");
  if(c.teste_t) h+=`<p class="dica">Teste t (${c.teste_t.tipo}): t=${fmt(c.teste_t.t,4)}, p=${fmt(c.teste_t.p,4)} ${chipBool(c.teste_t.sem_diferenca,"sem diferença","diferença")}</p>`;
  if(c.teste_F_variancias) h+=`<p class="dica">Teste F de variâncias: F=${fmt(c.teste_F_variancias.F,4)}, p=${fmt(c.teste_F_variancias.p,4)} ${chipBool(c.teste_F_variancias.variancias_semelhantes,"variâncias semelhantes","variâncias diferentes")}</p>`;
  if(c.anova) h+=`<p class="dica">ANOVA: F=${fmt(c.anova.F,4)}, p=${fmt(c.anova.p,4)} ${chipBool(c.anova.sem_diferenca,"sem diferença","diferença")}</p>`;
  return h;
}
function blocoSeletividade(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "Seletividade não aplicável.")}</p>`;
  if(v.modelo){
    return `<div class="kv">`+
      `<dt>Modelo</dt><dd>${esc(v.modelo)}</dd>`+
      `<dt>Matriz</dt><dd>p=${fmt(v.p_matriz,4)}</dd>`+
      `<dt>Interação</dt><dd>p=${fmt(v.p_interacao,4)}</dd>`+
      `<dt>Conclusão</dt><dd>${chipBool(v.seletivo,"sem efeito de matriz","efeito de matriz")}</dd>`+
      `</div>`;
  }
  return blocoComparacaoValidacao(v.comparacao)+`<p class="dica">Conclusão: ${chipBool(v.seletivo,"seletivo","verificar seletividade")}</p>`;
}
function blocoHorwitz(v){
  if(!v || !v.aplicavel) return `<p class="dica">${esc(v?.nota || "Horwitz não aplicável.")}</p>`;
  return `<div class="kv">`+
    `<dt>C</dt><dd>${fmt(v.C,8)}</dd>`+
    `<dt>PRSDR teórico</dt><dd>${fmt(v.prsd_R,2)}%</dd>`+
    `<dt>CV observado</dt><dd>${fmt(v.cv_observado,2)}%</dd>`+
    `<dt>HorRat</dt><dd>${fmt(v.HorRat,3)} ${chipBool(v.compativel,"compatível","fora da faixa")}</dd>`+
    `</div>`;
}
function renderRelatorioValidacao(rel){
  const out=$("#resultados"); out.innerHTML="";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  if(!rel.ok){
    out.appendChild(renderErroRelatorio(rel));
    anexarTrilhaAuditoria(out, rel);
    $("#card-resultados").scrollIntoView({behavior:"smooth"}); return;
  }
  renderPipelineRelatorio(out);
  const parecer = avaliarCriteriosValidacao(rel, ULTIMA_EXECUCAO?.opcoes?.criterios_aceitacao || CRITERIOS_PADRAO_VALIDACAO);
  out.appendChild(secao("Parecer de aceitação", blocoParecerValidacao(parecer)));
  const prem=rel.premissa_gaussiana||{};
  out.appendChild(secao("Premissa Gaussiana",
    `<p class="dica">${esc(prem.texto||"")}</p>`+
    (prem.normalidade ? tabelaNormalidade(prem.normalidade) : "")));
  const desc=rel.descritiva||{};
  out.appendChild(secao("Estatísticas descritivas",
    tabelaStatsLista([{grupo:"geral", ...(desc.geral||{})}], "Conjunto")+
    (desc.por_concentracao?.length ? `<h4>Por concentração/nível</h4>${tabelaStatsLista(desc.por_concentracao,"Concentração")}` : "")+
    (desc.por_grupo?.length ? `<h4>Por grupo/condição</h4>${tabelaStatsLista(desc.por_grupo,"Grupo")}` : "")));
  out.appendChild(secao("Linearidade / faixa / sensibilidade", blocoLinearidade(rel.linearidade)));
  out.appendChild(secao("LD e LQ", blocoLdLq(rel.ld_lq)));
  out.appendChild(secao("Outliers", blocoOutliers(rel.outliers)));
  out.appendChild(secao("Homocedasticidade", blocoHomocedasticidade(rel.homocedasticidade)));
  out.appendChild(secao("Tendência / recuperação", blocoRecuperacao(rel.recuperacao)));
  out.appendChild(secao("Precisão", blocoPrecisao(rel.precisao)));
  if((rel.comparacoes||[]).length){
    let h=""; rel.comparacoes.forEach(c=>{ h+=`<h4>${esc(c.fator)}</h4>${blocoComparacaoValidacao(c)}`; });
    out.appendChild(secao("Comparação de grupos e condições", h));
  }
  out.appendChild(secao("Seletividade", blocoSeletividade(rel.seletividade)));
  out.appendChild(secao("Robustez", rel.robustez?.aplicavel
    ? `<p class="dica">${esc(rel.robustez.criterio||"")}</p>` + (rel.robustez.comparacoes||[]).map(c=>`<h4>${esc(c.fator)}</h4>${blocoComparacaoValidacao(c)}`).join("")
    : `<p class="dica">${esc(rel.robustez?.nota || "Robustez não aplicável.")}</p>`));
  out.appendChild(secao("Horwitz", blocoHorwitz(rel.horwitz)));
  anexarTrilhaAuditoria(out, rel);
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}

/* ----------------------------------------------------------------------- */
/* Render — Triagem forense                                                */
/* ----------------------------------------------------------------------- */
const FORENSE_SEV = {
  flag:  { rotulo:"SINAL FORTE", chip:"chip-alerta", item:"qa-critico" },
  watch: { rotulo:"ATENÇÃO",     chip:"chip-alerta", item:"qa-aviso"  },
  clear: { rotulo:"OK",          chip:"chip-ok",     item:"qa-ok"     },
  na:    { rotulo:"NÃO AVALIADO",chip:"chip-info",   item:"qa-aviso"  },
};
const FORENSE_CLASSE_BLOCO = { flag:"erro-box", watch:"aviso", clear:"decisao" };
function renderRelatorioForense(rel){
  const out=$("#resultados"); out.innerHTML="";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  _agractaEmitirResultado(rel); /* devolve o forense p/ o runner headless do Agracta */
  if(!rel.ok){
    out.appendChild(renderErroRelatorio(rel));
    anexarTrilhaAuditoria(out, rel);
    $("#card-resultados").scrollIntoView({behavior:"smooth"}); return;
  }
  renderPipelineRelatorio(out);

  // Veredito
  const v = rel.veredito || {};
  const blocoCls = FORENSE_CLASSE_BLOCO[v.classe] || "decisao";
  const sevChip = (FORENSE_SEV[v.classe] || FORENSE_SEV.clear).chip;
  out.appendChild(secao("Veredito da triagem",
    `<div class="${blocoCls}"><b>${esc(v.nivel||"—")}</b> `+
    `${chip("régua: "+(v.modo||"—"), "chip-info")} `+
    `${chip(`${v.flags||0} sinal(is) forte(s)`, v.flags?"chip-alerta":"chip-ok")} `+
    `${chip(`${v.watches||0} atenção`, v.watches?"chip-alerta":"chip-ok")} `+
    `${chip(`${v.testes_executados||0}/${v.testes_previstos||0} testes executados`, v.cobertura_suficiente?"chip-ok":"chip-alerta")}</div>`+
    `<p class="dica">${esc(v.resumo||"")}</p>`));

  // Achados
  const achados = rel.achados || [];
  const itens = achados.map(a=>{
    const sev = FORENSE_SEV[a.severidade] || FORENSE_SEV.clear;
    return `<li class="qa-item ${sev.item}">`+
      `<b>${esc(a.nome)} ${chip(sev.rotulo, sev.chip)}</b>`+
      `<span>${esc(a.estatistica||"")}</span>`+
      `<span>${esc(a.leitura||"")}</span>`+
      (a.explicacao_inocente ? `<span class="dica"><i>Explicação inocente possível:</i> ${esc(a.explicacao_inocente)}</span>` : "")+
      `</li>`;
  }).join("");
  out.appendChild(secao("Achados (ordenados por severidade)", `<ul class="qa-list">${itens}</ul>`));

  // Parâmetros
  const par = rel.parametros || {};
  out.appendChild(secao("Parâmetros da triagem",
    `<div>`+
    chip("tipo: "+(par.tipo_dado||"—"), "chip-info")+
    chip("régua: "+(par.modo||"—"), "chip-info")+
    chip("grupos: "+(par.n_grupos!=null?par.n_grupos:"—"), "chip-info")+
    chip("seed: "+(par.seed!=null?par.seed:"—"), "chip-info")+
    (par.controle!=null ? chip("controle: "+fmt(par.controle,2), "chip-info") : "")+
    (par.tem_segundo_conjunto ? chip("2ª avaliação: sim", "chip-info") : chip("2ª avaliação: não", "chip-info"))+
    `</div>`));

  // Disclaimer (sempre visível)
  if(rel.aviso) out.appendChild(htmlBloco(`<div class="aviso"><b>Importante:</b> ${esc(rel.aviso)}</div>`));

  anexarTrilhaAuditoria(out, rel);
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}

/* ----------------------------------------------------------------------- */
/* Render — Mortalidade no tempo                                           */
/* ----------------------------------------------------------------------- */
function renderRelatorioTempo(rel){
  const out=$("#resultados"); out.innerHTML="";
  $("#card-resultados").classList.remove("oculto");
  setNavTravado("resultados", false);
  setNavAtivo("resultados");
  if(!rel.ok){
    out.appendChild(renderErroRelatorio(rel));
    anexarTrilhaAuditoria(out, rel);
    $("#card-resultados").scrollIntoView({behavior:"smooth"}); return;
  }
  renderPipelineRelatorio(out);
  // Cabeçalho
  out.appendChild(secao(rel.tipo_analise,
    `<div>${chip(rel.n_tratamentos+" tratamentos","chip-info")} ${chip(rel.tempos.length+" tempos","chip-info")} `+
    `${chip("controle: "+rel.controle,"chip-info")} ${chip("correção: "+rel.correcao,"chip-ok")}</div>`));
  (rel.avisos||[]).forEach(a=> out.appendChild(htmlBloco(`<div class="aviso"><b>Aviso:</b> ${a}</div>`)));

  // QA/QC
  const qa=rel.qa_qc||{};
  let qah=`<div>`+
    (qa.controle_ok===true?chip("controle OK","chip-ok"):qa.controle_ok===false?chip("controle FORA do critério","chip-alerta"):"")+
    chip("impossíveis: "+qa.impossiveis, qa.impossiveis?"chip-alerta":"chip-ok")+
    chip("duplicatas: "+qa.duplicatas, qa.duplicatas?"chip-alerta":"chip-ok")+
    chip("vivos↑ no tempo: "+qa.monotonicidade, qa.monotonicidade?"chip-alerta":"chip-ok")+`</div>`;
  if((qa.controle||[]).length){
    qah+=`<div class="tab-rolavel"><table><thead><tr><th>Tempo</th><th>Mort. controle</th><th>Estabilidade</th><th>OK?</th></tr></thead><tbody>`;
    qa.controle.forEach(c=> qah+=`<tr><td>${fmt(c.tempo,0)}</td><td>${fmt(c.mort_media,1)}%</td><td>${fmt(c.estabilidade,1)}%</td><td>${c.ok_mort&&c.ok_estab?"sim":"não"}</td></tr>`);
    qah+=`</tbody></table></div>`;
  }
  out.appendChild(secao("QA/QC", qah));

  // Curva de mortalidade no tempo
  if((rel.tempos||[]).length>=2){
    const bc=secao("Mortalidade (%) ao longo do tempo","");
    const cv=el("canvas"); cv.width=600; cv.height=300; bc.appendChild(cv);
    out.appendChild(bc);
    desenharLinhasTempo(cv, rel.letras_mortalidade, rel.tratamentos, "mortalidade (%)");
  }

  // Letras por tempo
  out.appendChild(secao("Mortalidade (%) por tempo — letras",
    tabelaLetrasTempo(rel.letras_mortalidade, rel.tratamentos)));
  if((rel.letras_eficacia||[]).some(l=>Object.keys(l.medias||{}).length))
    out.appendChild(secao("Eficácia (%) por tempo — letras",
      tabelaLetrasTempo(rel.letras_eficacia, rel.tratamentos.filter(t=>t!==rel.controle))));

  // Rankings
  const rk=rel.rankings||{};
  out.appendChild(secao("Rankings",
    `<div class="grid-rank">`+
    blocoRanking("Mortalidade — média no tempo", rk.mort_global, "%")+
    blocoRanking("Mortalidade — tempo final", rk.mort_final, "%")+
    blocoRanking("Eficácia — média no tempo", rk.efic_global, "%")+
    blocoRanking("Eficácia — tempo final", rk.efic_final, "%")+`</div>`));

  // Kaplan-Meier
  const km=rel.kaplan_meier;
  if(km && (km.curvas||[]).length){
    let kh=`<div class="tab-rolavel"><table><thead><tr><th>Tratamento</th><th>LT50</th><th>LT90</th><th>n</th><th>mortes</th></tr></thead><tbody>`;
    km.curvas.forEach(c=> kh+=`<tr><td>${esc(c.tratamento)}</td><td>${c.LT50!=null?fmt(c.LT50,2):"—"}</td><td>${c.LT90!=null?fmt(c.LT90,2):"—"}</td><td>${c.n}</td><td>${c.mortes}</td></tr>`);
    kh+=`</tbody></table></div>`;
    if(km.logrank) kh+=`<p class="dica">Log-rank: χ²=${fmt(km.logrank.qui2,2)} (gl=${km.logrank.gl}), `+
      `${km.logrank.significativo?chip("p="+fmt(km.logrank.p,4)+" — diferem","chip-ok"):chip("p="+fmt(km.logrank.p,4)+" — não diferem","chip-info")}</p>`;
    kh+=`<p class="dica">LT50/LT90 = tempo para 50%/90% de mortalidade (interpolado; "—" = não atingido no período).</p>`;
    const b=secao("Kaplan-Meier (sobrevivência) + LT50/LT90", kh);
    const cv=el("canvas"); cv.width=600; cv.height=320; b.appendChild(cv);
    out.appendChild(b);
    desenharKM(cv, km.curvas, rel.tempos);
  }

  // Modelos
  const mo=rel.modelos||{};
  let moh="";
  if(mo.glm_robusto){
    moh+= mo.glm_robusto.convergiu
      ? `<div class="kv"><dt>GLM binomial (cluster)</dt><dd>efeito de tratamento ${p_chip(mo.glm_robusto.p_tratamento)} ${mo.glm_robusto.p_tempo!=null?"• tempo "+p_chip(mo.glm_robusto.p_tempo):""}</dd></div><p class="dica">${mo.glm_robusto.nota||""}</p>`
      : `<p class="dica">GLM robusto não convergiu.</p>`;
  }
  if(mo.beta_eficacia && mo.beta_eficacia.convergiu){
    moh+= `<div class="kv"><dt>Beta-regressão (eficácia, tempo ${fmt(mo.beta_eficacia.tempo,0)})</dt><dd>efeito de tratamento ${p_chip(mo.beta_eficacia.p_tratamento)}</dd></div>`;
  }
  if(moh) out.appendChild(secao("Modelos (inferência)", moh));

  anexarTrilhaAuditoria(out, rel);
  $("#card-resultados").scrollIntoView({behavior:"smooth"});
}

function tabelaLetrasTempo(linhas, tratamentos){
  if(!linhas || !linhas.length) return `<p class="dica">Sem dados.</p>`;
  let h=`<div class="tab-rolavel"><table><thead><tr><th>Tratamento</th>`;
  linhas.forEach(l=> h+=`<th>t=${fmt(l.tempo,0)}</th>`);
  h+=`</tr></thead><tbody>`;
  tratamentos.forEach(tr=>{
    h+=`<tr><td>${esc(tr)}</td>`;
    linhas.forEach(l=>{
      const m=(l.medias||{})[tr], ltr=(l.letras||{})[tr]||"";
      h+= m!=null ? `<td>${fmt(m,1)} <span class="letra">${ltr}</span></td>` : `<td>—</td>`;
    });
    h+=`</tr>`;
  });
  h+=`</tbody></table></div>`;
  h+=`<p class="dica">Método por tempo: `+linhas.map(l=>`t=${fmt(l.tempo,0)}: ${l.metodo}`).join(" • ")+`</p>`;
  return h;
}
function blocoRanking(titulo, lista, suf){
  if(!lista || !lista.length) return "";
  let h=`<div class="rank-card"><b>${titulo}</b><ol>`;
  lista.slice(0,8).forEach(r=> h+=`<li>${r.item||r.tratamento} — <b>${fmt(r.valor,1)}${suf}</b></li>`);
  h+=`</ol></div>`;
  return h;
}
function desenharKM(cv, curvas, tempos){
  const ctx=cv.getContext("2d"); const W=cv.width,H=cv.height; ctx.clearRect(0,0,W,H);
  const ml=46,mr=120,mt=14,mb=40, pw=W-ml-mr, ph=H-mt-mb;
  const tmax=Math.max(...tempos,1);
  const X=t=> ml+(t/tmax)*pw, Y=s=> mt+ph-s*ph;
  ctx.strokeStyle="#cbd5e1"; ctx.beginPath(); ctx.moveTo(ml,mt); ctx.lineTo(ml,mt+ph); ctx.lineTo(ml+pw,mt+ph); ctx.stroke();
  ctx.fillStyle="#64748b"; ctx.font="11px sans-serif"; ctx.textAlign="right";
  [0,.25,.5,.75,1].forEach(s=>{ const y=Y(s); ctx.fillText((s*100)+"%",ml-5,y+4); ctx.strokeStyle="#eef2f7"; ctx.beginPath(); ctx.moveTo(ml,y); ctx.lineTo(ml+pw,y); ctx.stroke(); });
  const cores=["#0d9488","#0891b2","#4338ca","#b45309","#9333ea","#0e7490","#be123c","#15803d"];
  curvas.forEach((c,i)=>{
    const col=cores[i%cores.length]; ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath();
    let px=X(0), py=Y(1); ctx.moveTo(px,py);
    for(let k=0;k<c.tempos.length;k++){ const nx=X(c.tempos[k]); ctx.lineTo(nx,py); const ny=Y(c.surv[k]); ctx.lineTo(nx,ny); py=ny; px=nx; }
    ctx.stroke(); ctx.lineWidth=1;
    ctx.fillStyle=col; ctx.textAlign="left"; ctx.font="11px sans-serif";
    ctx.fillText(String(c.tratamento).slice(0,12), ml+pw+6, mt+12+i*15);
  });
  // linha 50%
  ctx.strokeStyle="rgba(198,40,40,.5)"; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(ml,Y(0.5)); ctx.lineTo(ml+pw,Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle="#475569"; ctx.textAlign="center"; ctx.font="12px sans-serif";
  ctx.fillText("tempo", ml+pw/2, mt+ph+30);
  ctx.save(); ctx.translate(13,mt+ph/2); ctx.rotate(-Math.PI/2); ctx.fillText("sobrevivência", 0, 0); ctx.restore();
}

const CORES_CAT=["#0d9488","#0891b2","#4338ca","#b45309","#9333ea","#0e7490","#be123c","#15803d"];
function desenharLinhasTempo(cv, linhas, tratamentos, ylabel){
  const ctx=cv.getContext("2d"); const W=cv.width,H=cv.height; ctx.clearRect(0,0,W,H);
  const ml=46,mr=120,mt=14,mb=40, pw=W-ml-mr, ph=H-mt-mb;
  const tempos=linhas.map(l=>l.tempo); const tmin=Math.min(...tempos), tmax=Math.max(...tempos);
  let vmax=0; linhas.forEach(l=>tratamentos.forEach(t=>{ const m=(l.medias||{})[t]; if(m!=null&&m>vmax)vmax=m; }));
  vmax=Math.max(vmax*1.1,1);
  const X=t=> ml+(tmax===tmin?0.5:(t-tmin)/(tmax-tmin))*pw, Y=v=> mt+ph-(v/vmax)*ph;
  ctx.strokeStyle="#cbd5e1"; ctx.beginPath(); ctx.moveTo(ml,mt); ctx.lineTo(ml,mt+ph); ctx.lineTo(ml+pw,mt+ph); ctx.stroke();
  ctx.fillStyle="#64748b"; ctx.font="11px sans-serif"; ctx.textAlign="right";
  for(let i=0;i<=4;i++){ const v=vmax*i/4, y=Y(v); ctx.fillText(fmt(v,0),ml-5,y+4); ctx.strokeStyle="#eef2f7"; ctx.beginPath(); ctx.moveTo(ml,y); ctx.lineTo(ml+pw,y); ctx.stroke(); }
  ctx.textAlign="center"; ctx.fillStyle="#64748b";
  tempos.forEach(t=> ctx.fillText("t="+fmt(t,0), X(t), mt+ph+16));
  tratamentos.forEach((t,i)=>{
    const col=CORES_CAT[i%CORES_CAT.length]; ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=2.2; ctx.beginPath();
    let started=false;
    linhas.forEach(l=>{ const m=(l.medias||{})[t]; if(m==null)return; const px=X(l.tempo),py=Y(m); started?ctx.lineTo(px,py):ctx.moveTo(px,py); started=true; });
    ctx.stroke(); ctx.lineWidth=1;
    linhas.forEach(l=>{ const m=(l.medias||{})[t]; if(m==null)return; ctx.beginPath(); ctx.arc(X(l.tempo),Y(m),3,0,6.28); ctx.fill(); });
    ctx.textAlign="left"; ctx.font="11px sans-serif"; ctx.fillText(String(t).slice(0,12), ml+pw+6, mt+12+i*15);
  });
  ctx.save(); ctx.translate(13,mt+ph/2); ctx.rotate(-Math.PI/2); ctx.textAlign="center"; ctx.fillStyle="#475569"; ctx.font="12px sans-serif"; ctx.fillText(ylabel,0,0); ctx.restore();
}

/* ----------------------------------------------------------------------- */
/* Gráficos (canvas)                                                       */
/* ----------------------------------------------------------------------- */
function desenharBarras(cv, ordem, valores, letras, ylabel){
  const ctx=cv.getContext("2d"); const W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H); ctx.font="13px sans-serif";
  const ml=46,mr=14,mt=22,mb=64; const pw=W-ml-mr, ph=H-mt-mb;
  const vals=ordem.map(t=>valores[t]||0);
  const erros=arguments[5]||null;  // map trat -> erro-padrão (opcional)
  const topo=ordem.map(t=>(valores[t]||0)+(erros&&erros[t]?erros[t]:0));
  const vmax=Math.max(...topo,0.0001)*1.16, vmin=Math.min(0,...vals);
  const y0=v=> mt+ph-(v-vmin)/(vmax-vmin)*ph;
  // eixos
  ctx.strokeStyle="#cbd5e1"; ctx.beginPath(); ctx.moveTo(ml,mt); ctx.lineTo(ml,mt+ph); ctx.lineTo(ml+pw,mt+ph); ctx.stroke();
  ctx.fillStyle="#64748b"; ctx.textAlign="right"; ctx.font="11px sans-serif";
  for(let i=0;i<=4;i++){ const v=vmin+(vmax-vmin)*i/4; const y=y0(v); ctx.fillText(fmt(v,1),ml-5,y+4); ctx.strokeStyle="#eef2f7"; ctx.beginPath(); ctx.moveTo(ml,y); ctx.lineTo(ml+pw,y); ctx.stroke(); }
  const bw=pw/ordem.length*0.62;
  ordem.forEach((t,i)=>{
    const cx=ml+pw*(i+0.5)/ordem.length; const v=valores[t]||0; const y=y0(v);
    // barra (degradê teal)
    const grad=ctx.createLinearGradient(0,y,0,mt+ph); grad.addColorStop(0,"#14b8a6"); grad.addColorStop(1,"#0d9488");
    ctx.fillStyle=grad; ctx.fillRect(cx-bw/2,y,bw,mt+ph-y);
    // barra de erro (média ± EP)
    const se=erros&&erros[t]?erros[t]:0;
    if(se>0){ const yt=y0(v+se), yb=y0(v-se); ctx.strokeStyle="#0f766e"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(cx,yt); ctx.lineTo(cx,yb); ctx.moveTo(cx-5,yt); ctx.lineTo(cx+5,yt); ctx.moveTo(cx-5,yb); ctx.lineTo(cx+5,yb); ctx.stroke(); ctx.lineWidth=1; }
    ctx.fillStyle="#0f766e"; ctx.textAlign="center"; ctx.font="bold 13px sans-serif";
    ctx.fillText(letras[t]||"", cx, y0(v+se)-6);
    ctx.fillStyle="#334155"; ctx.font="11px sans-serif";
    ctx.save(); ctx.translate(cx,mt+ph+8); ctx.rotate(-Math.PI/7); ctx.textAlign="right";
    ctx.fillText(String(t).slice(0,14),0,6); ctx.restore();
  });
  ctx.save(); ctx.translate(13,mt+ph/2); ctx.rotate(-Math.PI/2); ctx.textAlign="center"; ctx.fillStyle="#475569"; ctx.font="12px sans-serif"; ctx.fillText(ylabel,0,0); ctx.restore();
}

function desenharDose(cv, c, uni){
  uni = (uni||"").trim();
  const ctx=cv.getContext("2d"); const W=cv.width,H=cv.height;
  ctx.clearRect(0,0,W,H);
  const ml=48,mr=16,mt=16,mb=46; const pw=W-ml-mr, ph=H-mt-mb;
  // domínio em log10(dose) a partir das doses letais (usa CL10..CL99 p/ amplitude)
  const dls=c.doses_letais; const xs=dls.map(d=>d.log_dose);
  let xmin=Math.min(...xs), xmax=Math.max(...xs); const pad=(xmax-xmin)*0.25||0.5; xmin-=pad; xmax+=pad;
  const X=x=> ml+(x-xmin)/(xmax-xmin)*pw;
  const Y=p=> mt+ph-p*ph;
  ctx.strokeStyle="#cbd5e1"; ctx.beginPath(); ctx.moveTo(ml,mt); ctx.lineTo(ml,mt+ph); ctx.lineTo(ml+pw,mt+ph); ctx.stroke();
  ctx.fillStyle="#64748b"; ctx.textAlign="right"; ctx.font="11px sans-serif";
  [0,.25,.5,.75,1].forEach(p=>{ const y=Y(p); ctx.fillText((p*100)+"%",ml-5,y+4); ctx.strokeStyle="#eef2f7"; ctx.beginPath(); ctx.moveTo(ml,y); ctx.lineTo(ml+pw,y); ctx.stroke(); });
  // curva ajustada
  const b0=c.intercepto,b1=c.slope, probit=(c.link==="probit");
  const F = probit ? (z=>0.5*(1+erf(z/Math.SQRT2))) : (z=>1/(1+Math.exp(-z)));
  ctx.strokeStyle="#0f766e"; ctx.lineWidth=2.2; ctx.beginPath();
  for(let i=0;i<=120;i++){ const x=xmin+(xmax-xmin)*i/120; const p=F(b0+b1*x); const px=X(x),py=Y(p); i?ctx.lineTo(px,py):ctx.moveTo(px,py); }
  ctx.stroke(); ctx.lineWidth=1;
  // linha CL50
  const cl50=dls.find(d=>d.p===0.5);
  if(cl50){ const x=cl50.log_dose; ctx.strokeStyle="#b91c1c"; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(X(x),Y(0.5)); ctx.lineTo(X(x),mt+ph); ctx.moveTo(ml,Y(0.5)); ctx.lineTo(X(x),Y(0.5)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle="#b91c1c"; ctx.textAlign="left"; ctx.fillText("CL50 = "+fmt(cl50.dose,2)+(uni?" "+uni:""), X(x)+4, mt+12); }
  // rótulo eixo x
  ctx.fillStyle="#475569"; ctx.textAlign="center"; ctx.font="12px sans-serif";
  const eixoX = (c.escala_dose==="log10"?"log₁₀(dose)":"dose") + (uni?" — "+uni:"");
  ctx.fillText(eixoX, ml+pw/2, mt+ph+34);
  ctx.fillText("mortalidade", 12, mt+ph/2);
}
// erf para a curva probit
function erf(x){ const t=1/(1+0.3275911*Math.abs(x)); const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x); return x>=0?y:-y; }

/* ----------------------------------------------------------------------- */
/* Exportar                                                                */
/* ----------------------------------------------------------------------- */
function baixarArquivo(nome, conteudo, tipo){
  const blob = new Blob([conteudo], {type: tipo || "application/octet-stream"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 800);
}
$("#btn-imprimir").addEventListener("click", ()=>{
  if(!ULTIMO_RELATORIO){ avisar("Gere uma análise atualizada antes de imprimir."); return; }
  window.print();
});
$("#btn-copiar").addEventListener("click", ()=>{
  if(!ULTIMO_RELATORIO){ avisar("Gere uma análise atualizada antes de copiar."); return; }
  const texto = $("#resultados").innerText;
  if(navigator.clipboard){
    navigator.clipboard.writeText(texto).then(()=>avisar("Relatório copiado.", "ok"));
  }else{
    baixarArquivo("bioensaio-relatorio.txt", texto, "text/plain;charset=utf-8");
    avisar("Clipboard indisponível; relatório baixado como texto.", "ok");
  }
});
$("#btn-audit-json").addEventListener("click", async ()=>{
  if(!ULTIMO_RELATORIO){
    avisar("Gere uma análise antes de baixar o pacote de auditoria.");
    return;
  }
  try{
    const pacote = await montarPacoteAuditoria(ULTIMO_RELATORIO);
    AUDIT_ATUAL = pacote;
    const nome = `${pacote.metadata.record_id}.json`;
    baixarArquivo(nome, JSON.stringify(pacote, null, 2), "application/json;charset=utf-8");
    avisar("Pacote de auditoria baixado.", "ok");
  }catch(e){
    console.error(e);
    avisar("Não foi possível baixar o pacote de auditoria.");
  }
});
const btnAuditVerificar = $("#btn-audit-verificar");
const entradaAuditJson = $("#entrada-audit-json");
if(btnAuditVerificar && entradaAuditJson){
  btnAuditVerificar.addEventListener("click", ()=>entradaAuditJson.click());
  entradaAuditJson.addEventListener("change", async ()=>{
    const file = entradaAuditJson.files && entradaAuditJson.files[0];
    if(!file) return;
    try{
      const pacote = JSON.parse(await file.text());
      const verificacao = await verificarPacoteAuditoria(pacote);
      renderVerificacaoPacote(verificacao);
      avisar(verificacao.ok ? "Pacote verificado." : "Pacote com falha de integridade.", verificacao.ok ? "ok" : "erro");
    }catch(e){
      console.error(e);
      avisar("Não foi possível verificar o JSON de auditoria.");
    }finally{
      entradaAuditJson.value = "";
    }
  });
}
const btnAutoteste = $("#btn-autoteste");
if(btnAutoteste){
  atualizarBotaoAutoteste();
  btnAutoteste.addEventListener("click", ()=>executarAutoteste());
}

/* Instalação PWA + Service worker */
let promptInstalacao = null;
const btnInstalar = $("#btn-instalar");
function appEmStandalone(){ return modoPwaAtual() !== "browser"; }
function atualizarBotaoInstalar(){
  if(!btnInstalar) return;
  btnInstalar.classList.toggle("oculto", appEmStandalone());
  btnInstalar.title = promptInstalacao
    ? "Instalar BioEnsaio como aplicativo"
    : "Instalar BioEnsaio ou adicionar à tela inicial pelo navegador";
  btnInstalar.setAttribute("aria-label", btnInstalar.title);
}
window.addEventListener("beforeinstallprompt", (e)=>{
  e.preventDefault();
  promptInstalacao = e;
  atualizarBotaoInstalar();
});
window.addEventListener("appinstalled", ()=>{
  promptInstalacao = null;
  atualizarBotaoInstalar();
  avisar("BioEnsaio instalado.", "ok");
});
if(btnInstalar){
  atualizarBotaoInstalar();
  btnInstalar.addEventListener("click", async ()=>{
    if(promptInstalacao){
      try{
        await promptInstalacao.prompt();
        await promptInstalacao.userChoice.catch(()=>null);
      }catch(e){
        avisar("Use o menu do navegador para instalar ou adicionar à tela inicial.", "ok");
      }finally{
        promptInstalacao = null;
        atualizarBotaoInstalar();
      }
      return;
    }
    avisar("Para instalar, use o menu do navegador e escolha instalar/adicionar à tela inicial.", "ok");
  });
}
async function registrarServiceWorker(){
  return; /* Agracta embed: o service worker do Agracta governa o cache; não registrar SW próprio aqui */
  if(!("serviceWorker" in navigator)) return;
  try{
    const reg = await navigator.serviceWorker.register("sw.js?v="+APP_VERSION);
    if(reg.update) reg.update().catch(()=>{});
    reg.addEventListener("updatefound", ()=>{
      const novo = reg.installing;
      if(!novo) return;
      novo.addEventListener("statechange", ()=>{
        if(novo.state === "activated" && navigator.serviceWorker.controller){
          avisar("BioEnsaio atualizado para uso offline.", "ok");
        }
      });
    });
  }catch(e){
    console.warn("Service worker indisponível", e);
  }
}
registrarServiceWorker();

/* ===== Handoff do Agracta: recebe a matriz da avaliação e carrega automaticamente =====
   O Agracta grava localStorage['agracta-bioestat-handoff'] = {aoa, modo, titulo} e abre
   este app num iframe. Aqui lemos, parseamos pela via Matriz já existente e carregamos. */
function _agractaEmitirResultado(rel){
  try{
    if(!window.__agractaEmbed || window.parent===window || !window.__agractaRequestId) return;
    window.parent.postMessage({
      type:'agracta:bioestat-result',
      requestId:window.__agractaRequestId,
      resultado:clonarAuditavel(rel||{})
    }, window.location.origin);
  }catch(e){ console.warn('[Agracta motor] não foi possível devolver o resultado',e); }
}
function _agTipoResp(t){
  t=String(t||'').toLowerCase();
  if(/sever|incid|fitotox|efic|propor|%/.test(t)) return 'proporcao';
  if(/inset|popula|contag|coloni|n[úu]mero/.test(t)) return 'contagem';
  if(/altura|produ|peso|di[âa]m|stand|compr|massa|cont[íi]nu/.test(t)) return 'continua';
  return '';
}
function __agractaHandoff(payload){
  try{
    if(!payload || !payload.aoa || !payload.aoa.length) return false;
    window.__agractaEmbed = true; /* gate do autoteste vira só aviso (análise consultiva no Agracta) */
    window.__agractaRequestId = payload.requestId || '';
    var modo = payload.modo || 'analise';
    var linhas = linhasMatrizDeAoa(payload.aoa);
    if(!linhas.length){ avisar('Não encontrei valores (Tratamento/Variável/Valor) para analisar.'); return false; }
    MATRIZ_IMPORT = { arquivo: payload.titulo || 'Agracta', sheet: 'Dados', linhas: linhas };
    renderMatrizImportador(); /* seletor de estudo/data/variável continua disponível p/ re-escolher */
    var resposta = (linhas[0] && linhas[0].variavel) || 'valor';
    var lv = linhas.filter(function(r){ return r.variavel === resposta; });
    var cols = colunasBioensaioDeMatriz(lv, resposta, false);
    var ref = lv[0] || {};
    function _set(id,v){ var el=document.getElementById(id); if(el && v!=null && String(v)!=='' && !String(el.value||'').trim()) el.value=String(v); }
    function _setSel(id,v){ var el=document.getElementById(id); if(el && v && [].some.call(el.options,function(o){return o.value===v;})) el.value=v; }
    function _carrega(){
      try{
        /* pré-preenche tudo que o Agracta já sabe — menos digitação */
        _set('audit-estudo', payload.titulo || ref.estudo);
        _set('audit-responsavel', payload.responsavel);
        _setSel('audit-origem-bruta','matriz');
        _set('audit-registro-bruto', [payload.local, payload.quadra, payload.titulo].filter(Boolean).join(' · '));
        _set('audit-coletor', payload.responsavel);
        preencherIdentificacaoSeVazia(payload.titulo || gerarIdAuditoria('AGRACTA', [ref.estudo, ref.data, resposta].filter(Boolean).join(' ')), payload.responsavel || 'Agracta');
        setModo(modo);
        var papeis = (modo === 'analise') ? {resposta: resposta, fatores: ['tratamento'], bloco: 'bloco'} : null;
        carregarColunas(cols, papeis, {origem:'agracta', estudo: ref.estudo||'', data: ref.data||'', variavel: resposta});
        /* tipo de resposta: deixa o MOTOR detectar pelos dados (mais confiável que o rótulo da avaliação) */
        _set('opt-unidade', payload.doseUnit);
        if(modo==='forense' && payload.forenseTipo) _setSel('opt-forense-tipo', payload.forenseTipo);
        if(typeof atualizarPipeline==='function') atualizarPipeline();
        /* auto-roda a análise quando nada bloqueia (autoteste é só aviso no embed) */
        setTimeout(function(){ var b=document.getElementById('btn-analisar'); if(b && !b.disabled) b.click(); }, 400);
      }catch(e){ console.error('[Agracta handoff carrega]', e); }
    }
    _carrega();
    return true;
  }catch(e){ console.error('[Agracta handoff]', e); return false; }
}
window.__agractaHandoff = __agractaHandoff;
window.addEventListener('message',function(ev){
  try{
    if(ev.origin!==window.location.origin || !ev.data || ev.data.type!=='agracta:bioestat-run') return;
    __agractaHandoff(ev.data.payload||{});
  }catch(e){ console.error('[Agracta motor message]',e); }
});
(function(){
  try{
    var raw = localStorage.getItem('agracta-bioestat-handoff');
    if(!raw) return;
    window.__agractaEmbed = true; /* cedo: 1ª conferência já enxerga o embed */
    localStorage.removeItem('agracta-bioestat-handoff');
    var payload = JSON.parse(raw);
    setTimeout(function(){ __agractaHandoff(payload); }, 80);
  }catch(e){ console.warn('[Agracta handoff] falhou', e); }
})();
