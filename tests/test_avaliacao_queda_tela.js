'use strict';
/* A GRADE DE AVALIAÇÃO, pela tela: o número abaixo da avaliação anterior fica
 * vermelho (sem travar), e a triagem forense completa roda e aparece durante o
 * lançamento.
 *
 * Pedido de quem usa: "dei 30% de severidade e no dia seguinte coloco 29% … não
 * bloquear, mas avisar, ficando o número em vermelho" e "o motor de triagem forense
 * funcionar também na avaliação em tempo real".
 *
 * As funções são as do app.js, recortadas e montadas num DOM de verdade (jsdom). O
 * motor estatístico (Pyodide) não roda aqui: o que se confere é a grade pedir o
 * cálculo ao motor de sempre e mostrar o que ele devolve — calculando, resultado,
 * resultado velho enquanto recalcula, falha com "Tentar de novo", e o silêncio
 * obrigatório na leitura dupla.
 *
 * Rodar: node tests/test_avaliacao_queda_tela.js
 */
const assert = require('node:assert/strict'), fs = require('fs');
let JSDOM; try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const source = fs.readFileSync('app.js', 'utf8');
function fn(name) { const i = source.indexOf('function ' + name + '('); assert(i >= 0, name); const j = source.indexOf('\nfunction ', i + 1); return source.slice(i, j < 0 ? source.length : j); }

const dom = new JSDOM('<!doctype html><html><body><div id="eeOvl" class="open"><input id="vData" value="2026-10-02"><fieldset id="avFs"><div id="avGridWrap"></div></fieldset></div></body></html>',
  { url: 'https://agracta.test', runScripts: 'outside-only' });
const w = dom.window, d = w.document;

/* o estudo: a1 já lançada; a2 aberta na grade */
const st = { id: 'S1', tratamentos: [{ id: 'T1' }, { id: 'T2' }], numRepeticoes: 1, avaliacoes: [
  { id: 'a1', data: '2026-10-01', variaveis: ['Severidade', 'Insetos mortos', 'Insetos vivos'],
    notas: { T1R1: { Severidade: '30', 'Insetos mortos': '30', 'Insetos vivos': '40' }, T2R1: { Severidade: '5', 'Insetos mortos': '2', 'Insetos vivos': '50' } } },
  { id: 'a2', data: '2026-10-02', variaveis: ['Severidade', 'Insetos mortos', 'Insetos vivos'], notas: {} }
] };
w.st = st;
w.eval('var _avGrid={variaveis:["Severidade","Insetos mortos","Insetos vivos"],notas:{T1R1:{Severidade:"29","Insetos mortos":"25","Insetos vivos":"12"},T2R1:{Severidade:"6","Insetos mortos":"3","Insetos vivos":"20"}},tipos:{"Insetos mortos":"contagem","Insetos vivos":"contagem"},meta:{},varcfg:{},bruto:{}};' +
  'var _avAuto={on:false,pos:0};var _avCroquiOpen=true,_avCroquiKey=null;var editingAvId="a2",draftAv=null,curV="Q1",curSid="S1";var _bioAutoCache={};');
w.st.avaliacoes[1].notas = w._avGrid.notas;   /* como o autosave deixa: a avaliação aponta para as notas da grade */
w.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
w.isoToBR = (x) => { const p = String(x || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : x; };
w._avCfg = (g, v) => ({ tipo: (g.tipos || {})[v] === 'contagem' ? 'contagem' : 'pct', sub: 1 });
w._avTetoPct = () => true; w._avCss = () => {}; w._avLegendaHtml = () => ''; w.avCroquiHtml = () => '';
w._avUsaBruto = (c) => c.tipo === 'razao' || c.tipo === 'escala' || c.sub > 1; w._avSubCheias = () => 0;
w._repDisplay = (r) => 'ABC'[r - 1]; w.ensureStudyRandomizacao = () => {};
const rows = [{ key: 'T1R1', tratId: 'T1', rep: 1, label: 'T1A', campo: '1A', repDisplay: 'A' }, { key: 'T2R1', tratId: 'T2', rep: 1, label: 'T2A', campo: '2A', repDisplay: 'A' }];
w._avStudy = () => w.st; w._avRowsForStudy = () => rows;
let gravacoes = 0; w._avPersistNow = () => { gravacoes++; }; const avisos = []; w._avAviso = (m) => avisos.push(m); w._stxToast = () => {};
w.AvaliacaoCore = require('../vendor/avaliacao-core.js');
['_avDerSuf', '_avNota', '_avCellHtml', '_avFichaHtml', 'renderAvGrid', '_avAutoRows', '_avAutoSteps', '_avStepVal', '_avAutoState', 'renderAvAutoBox',
 '_avRefAtual', '_avComoAvaliacao', '_avAcumula', '_avFmtNum', 'avAcumulaCol', '_avMarcarQuedas', 'avTriagemImediata',
 '_avGradeAberta', '_avDuplaAberta', 'avForenseCompletaAgendar', '_avFcResumo', 'avForenseCompletaPintar', 'avForenseCompletaStatus'].forEach((x) => w.eval(fn(x)));
/* o motor, de mentira: a grade só PEDE e MOSTRA */
let sig = 'sigA'; const pedidos = [];
w._bioestatSignature = () => sig;
w._bioestatJobsForense = () => [{ jobKey: '__forense__|Severidade', variavel: 'Severidade', datas: 2 }];
w._bioestatStatusTexto = () => ({ txt: 'Abrindo o motor estatístico no aparelho…', sub: '' });
w._bioestatEnsureStudy = (q, s) => pedidos.push(q + '|' + s);
w.avDupla = () => false;
const espera = (ms) => new Promise((r) => setTimeout(r, ms || 5));
const celula = (k, v) => d.querySelector('.av-table [data-t="' + k + '"][data-v="' + v + '"]');
const triagem = () => d.getElementById('avForenseLive').textContent.replace(/\s+/g, ' ');

(async () => {
  /* ---- 1. o vermelho ---- */
  w.renderAvGrid();
  const sev = celula('T1R1', 'Severidade');
  ok(sev.classList.contains('av-queda'), '30 % em 01/10 e 29 % hoje: o número fica vermelho');
  ok(/01\/10\/2026/.test(sev.title) && /\(30\)/.test(sev.title) && /fica gravado/.test(sev.title), 'e a célula diz a leitura anterior e que nada foi barrado: ' + sev.title);
  ok(celula('T1R1', 'Insetos mortos').classList.contains('av-queda'), 'morreram 30, hoje 25: vermelho');
  ok(!celula('T1R1', 'Insetos vivos').classList.contains('av-queda'), 'insetos VIVOS de 40 para 12: o produto funcionando, sem aviso');
  ok(!celula('T2R1', 'Severidade').classList.contains('av-queda'), '5 → 6 subiu: normal');
  ok(/Menor que na avaliação anterior \(2\)/.test(triagem()) && /Severidade · T1A: 29 \(30 em 01\/10\/2026\)/.test(triagem()), 'a triagem lista as quedas: ' + triagem().slice(0, 160));
  ok(gravacoes === 0, 'pintar o aviso não grava nada');

  /* ao digitar, na hora (sem esperar sair do campo) */
  sev.value = '35'; sev.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(!sev.classList.contains('av-queda') && !sev.title, 'digitou 35: sai do vermelho na hora');
  ok(/Menor que na avaliação anterior \(1\)/.test(triagem()), 'e a triagem conta uma queda só');
  sev.value = '28'; sev.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(sev.classList.contains('av-queda'), 'digitou 28: volta ao vermelho');
  ok(sev.value === '28', 'o valor digitado continua lá: aviso não apaga nem corrige');

  /* ---- 2. o ↗ da coluna liga e desliga ---- */
  const acum = (v) => Array.from(d.querySelectorAll('.av-acum')).find((b) => b.getAttribute('onclick').indexOf("'" + v + "'") >= 0);
  ok(acum('Severidade').getAttribute('aria-pressed') === 'true' && acum('Insetos vivos').getAttribute('aria-pressed') === 'false', '↗ nasce ligado em severidade e desligado em insetos vivos');
  w.avAcumulaCol('Insetos vivos');
  ok(w._avGrid.varcfg['Insetos vivos'].acumula === true && gravacoes === 1, 'ligar grava a escolha na avaliação');
  ok(celula('T1R1', 'Insetos vivos').classList.contains('av-queda') && acum('Insetos vivos').getAttribute('aria-pressed') === 'true', 'ligado à mão: 40 → 12 passa a avisar');
  w.avAcumulaCol('Insetos vivos');
  ok(!celula('T1R1', 'Insetos vivos').classList.contains('av-queda'), 'desligado de novo, o aviso some');

  /* ---- 3. a ficha da parcela diz embaixo dos campos ---- */
  w._avGrid.notas.T1R1.Severidade = '28';
  w.eval('_avCroquiKey="T1R1"'); w.renderAvGrid();
  const fq = d.querySelector('[data-ficha-queda="T1R1"]');
  ok(fq && /Severidade: 28 — menor que 30 em 01\/10\/2026/.test(fq.textContent) && /Insetos mortos/.test(fq.textContent), 'a ficha da parcela diz a queda: ' + (fq && fq.textContent));

  /* ---- 4. o modo automático: o campo grande e a linha embaixo ---- */
  w.eval('_avAuto.on=true;_avAuto.pos=0;_avCroquiKey=null'); w.renderAvGrid();
  const auto = d.getElementById('avAutoInput'), msg = d.getElementById('avAutoQueda');
  ok(auto.classList.contains('av-queda') && /30 → 28/.test(msg.textContent), 'modo automático: vermelho e "30 → 28" embaixo do campo: ' + msg.textContent);
  w._avGrid.notas.T1R1.Severidade = '31'; auto.value = '31'; auto.dispatchEvent(new w.Event('input', { bubbles: true }));
  ok(!auto.classList.contains('av-queda') && msg.textContent === '', 'corrigido para 31: limpa');
  w.eval('_avAuto.on=false');

  /* ---- 5. a triagem forense completa, ao vivo ---- */
  w.renderAvGrid();
  await espera(700);
  ok(pedidos[pedidos.length - 1] === 'Q1|S1', 'a grade aberta pede a triagem ao motor de sempre');
  ok(/Severidade: calculando/.test(triagem()) && /Insetos mortos: começa quando houver ao menos 2 tratamentos/.test(triagem()), 'enquanto calcula, diz; variável sem dado suficiente diz o que falta');
  w._bioAutoCache['Q1|S1'] = { sig: 'sigA', status: 'ready', results: { '__forense__|Severidade': { ok: true, veredito: { flags: 1, watches: 0, cobertura_suficiente: true },
    achados: [{ nome: 'Duplicatas', severidade: 'flag', leitura: '3 pares idênticos' }, { nome: 'Dígito final', severidade: 'na', leitura: 'inconclusivo' }] } } };
  w.avForenseCompletaPintar();
  ok(/Severidade \(2 avaliações\): 1 sinal\(is\) forte\(s\) — Duplicatas — 3 pares idênticos/.test(triagem()), 'o resultado do motor aparece na grade: ' + triagem().slice(-220));
  ok(!/Dígito final/.test(triagem()), 'teste inconclusivo não entra na lista curta');
  /* dado novo: a assinatura muda; o resultado velho fica, marcado, até o novo chegar */
  sig = 'sigB'; w._bioAutoCache['Q1|S1'] = { sig: 'sigB', status: 'loading', results: {} };
  w.avForenseCompletaPintar();
  ok(/Duplicatas/.test(triagem()) && /antes da última alteração; recalculando/.test(triagem()), 'recalculando: o último resultado continua à vista, marcado');
  ok(/Abrindo o motor estatístico/.test(triagem()), 'com a linha de status do motor');
  /* digitar reagenda: o motor só é chamado quando a pessoa para */
  const antes = pedidos.length;
  sev.value = '27'; w.avForenseCompletaAgendar(30); w.avForenseCompletaAgendar(30);
  await espera(60);
  ok(pedidos.length === antes + 1, 'duas mudanças seguidas, um pedido só');
  /* falha do motor: diz o motivo e oferece de novo */
  w._bioAutoCache['Q1|S1'] = { sig: 'sigB', status: 'ready', results: { '__forense__|Severidade': { ok: false, erro: 'O motor estatístico não abriu neste aparelho.' } } };
  w.avForenseCompletaPintar();
  ok(/não rodou — O motor estatístico não abriu/.test(triagem()) && Array.from(d.querySelectorAll('#avForenseLive button')).some((b) => /Tentar de novo/.test(b.textContent)), 'falha: motivo e "Tentar de novo"');
  /* leitura dupla: nada do motor na grade */
  w.avDupla = () => true;
  const antesD = pedidos.length; w.avForenseCompletaPintar(); w.avForenseCompletaAgendar(0); await espera(20);
  ok(/Leitura dupla/.test(triagem()) && !/Duplicatas|não rodou/.test(triagem()) && pedidos.length === antesD, 'leitura dupla: a triagem completa não aparece nem roda na grade (revelaria o outro avaliador)');
  w.avDupla = () => false;
  /* avaliação fechada: nada roda */
  d.getElementById('eeOvl').classList.remove('open');
  const antesF = pedidos.length; w.avForenseCompletaAgendar(0); await espera(20);
  ok(pedidos.length === antesF, 'com a avaliação fechada, o motor não é chamado por ela');

  console.log('grade de avaliação: queda em vermelho, ↗ por coluna, ficha, modo automático e triagem forense ao vivo — ' + n + ' verificações OK.');
  w.close();
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
