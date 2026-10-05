'use strict';
/* Exportação do Campo Vivo (PNG/MP4): nome do arquivo, ordem do tempo, PT/EN,
   legenda com os cortes da tela, ausência que não vira zero, transição que não
   se passa por avaliação, e recursos liberados no sucesso e no erro.
   O vídeo de verdade (H.264) só existe no navegador: aqui o encoder e o muxer
   são de mentira, e o que se confere é o caminho em volta deles. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let n = 0, fim = false;
process.on('exit', (c) => { if (!fim && c === 0) { console.error('FALHA: o teste parou no meio'); process.exitCode = 1; } });
const ok = (c, m) => { assert.ok(c, m); n++; };

/* contexto 2D que só registra: quanto texto saiu e quantas formas foram cheias */
function ctx2d(reg) {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(_, k) {
      if (k === 'fillText') return (s) => reg.textos.push(String(s));
      if (k === 'fill') return () => { reg.cheios++; };
      if (k === 'measureText') return (s) => ({ width: String(s).length * 12 });
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k in reg.props) return reg.props[k];
      return () => {};
    },
    set(_, k, v) { reg.props[k] = v; return true; }
  });
}
function carregar(extra) {
  const reg = { textos: [], cheios: 0, props: {}, canvases: [], urls: [], revogados: [] };
  const doc = {
    activeElement: null, addEventListener() {},
    createElement: (t) => {
      if (t === 'canvas') { const c = { width: 0, height: 0, getContext: () => ctx2d(reg), toBlob: (f) => f({ size: 1, type: 'image/png' }) }; reg.canvases.push(c); return c; }
      return { style: {}, click() {}, remove() {}, setAttribute() {} };
    },
    body: { appendChild() {} }, head: { appendChild(el) { reg.scripts = (reg.scripts || 0) + 1; setTimeout(() => el.onerror && el.onerror(), 0); } }, getElementById: () => null, querySelector: () => null
  };
  const ctx = Object.assign({ console, document: doc, Promise, Blob: class { constructor(p, o) { this.parts = p; this.type = o.type; } },
    URL: { createObjectURL: () => { const u = 'blob:' + reg.urls.length; reg.urls.push(u); return u; }, revokeObjectURL: (u) => reg.revogados.push(u) },
    setTimeout: (f, t) => { if (t > 100) return 0; return setTimeout(f, t); }, requestAnimationFrame: () => 0, _repLetter: (r) => 'ABCDEFGH'[r - 1] }, extra || {});
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('campo-3d.js', 'utf8'), ctx);
  vm.runInContext(fs.readFileSync('campo-3d-exportar.js', 'utf8'), ctx);
  ctx._reg = reg;
  return ctx;
}

/* estudo: 3 tratamentos × 2 reps, avaliações FORA de ordem e com intervalo irregular */
function estudo(variavel) {
  const notas = (v) => { const o = {}; ['T1', 'T2', 'T3'].forEach((t, i) => { o[t + 'R1'] = { [variavel]: v[i] }; o[t + 'R2'] = { [variavel]: v[i] }; }); return o; };
  const avs = [
    { id: 'A3', data: '2026-03-31', variaveis: [variavel], notas: notas(['40', '20', '5']) },
    { id: 'A1', data: '2026-03-01', variaveis: [variavel], notas: notas(['5', '5', '5']) },
    { id: 'A2', data: '2026-03-08', variaveis: [variavel], notas: notas(['20', '', '5']) }
  ];
  delete avs[2].notas.T2R2; // parcela sem dado
  return { codigo: 'LB 2749/077:26 S', cultura: 'Soja', alvo: 'Ferrugem asiática', dataInicio: '2026-03-01', numRepeticoes: 2,
    tratamentos: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }], avaliacoes: avs };
}

(async () => {
  const c = loadOk();
  function loadOk() { return carregar(); }
  const X = c.AgCampoExportar, C = c.AgCampo3D;

  /* nome do arquivo */
  ok(X.nomeArquivo('LB 2749/077:26 S', 'Severidade (%)', '42DAA', 'png') === 'agracta_LB-2749-077-26-S_Severidade_42DAA.png', 'nome sanitizado');
  ok(X.nomeArquivo('Ensaio Ação', 'Fitotoxidez', '', 'mp4') === 'agracta_Ensaio-Acao_Fitotoxidez.mp4', 'acento e parte vazia');
  ok(!/[\\/:*?"<>|\s]/.test(X.nomeArquivo('a/b\\c*d?e"f<g>h|i j', 'v', 'r', 'png')), 'sem caractere inválido');

  /* roteiro: ordem, duração, transição não é real */
  const r = X.roteiro([0, 7, 30]);
  ok(r.fps === 30 && r.segundos >= 6 && r.segundos <= 20, 'duração razoável: ' + r.segundos);
  const reais = []; let viuTransicao = false;
  for (let f = 0; f < r.quadros; f++) {
    const q = X.instante(r, f);
    if (q.real) { if (reais[reais.length - 1] !== q.t) reais.push(q.t); }
    else { viuTransicao = true; ok(q.t > r.daas[q.de] - 1e-9 && q.t < r.daas[q.para] + 1e-9, 'transição dentro do vão'); }
  }
  ok(JSON.stringify(reais) === '[0,7,30]', 'avaliações reais em ordem: ' + reais);
  ok(viuTransicao, 'há transição entre avaliações');
  ok(X.roteiro([]) === null, 'sem avaliação, sem roteiro');
  const r1 = X.roteiro([14]);
  ok(r1.quadros > 0 && [...Array(r1.quadros).keys()].every(f => X.instante(r1, f).real), 'uma avaliação: vídeo parado nela, sempre real');
  ok(X.roteiro(Array.from({ length: 14 }, (_, i) => i * 7)).segundos <= 41, 'muitas avaliações não viram novela');
  { const r2 = X.roteiro([0, 7, 35]); const tr = r2.segmentos.filter(x => x.tipo === 'transicao'); ok(tr[1].dur > tr[0].dur && tr[0].dur >= 2.5, 'passagem proporcional aos dias, nunca menos de 2,5 s'); }

  /* modelo: ordem por DAA e variável selecionada */
  const st = estudo('Severidade');
  const cena = X.preparar({ s: st, st, variavel: 'Severidade', rot: 0.6, t: 7 }, { lang: 'pt' });
  ok(JSON.stringify(cena.daas) === '[0,7,30]', 'DAA em ordem, intervalo irregular preservado');
  const cenaOutra = X.preparar({ s: st, st: estudo('Altura'), variavel: 'Altura' }, { lang: 'pt' });
  ok(cenaOutra.variavel === 'Altura' && cenaOutra.daas.length === 3, 'outra variável, mesma conta');

  /* ausência não vira zero */
  const p = cena.m.grade.find(g => g.chave === 'T2R2');
  ok(X.colunaEm(cena, p, 7).v === null && X.colunaEm(cena, p, 7).cor === null, 'parcela sem dado: sem valor e sem cor');
  ok(X.colunaEm(cena, cena.m.grade.find(g => g.chave === 'T2R1'), 7).v === null, 'nota vazia também é ausência');
  const t1 = X.colunaEm(cena, cena.m.grade.find(g => g.chave === 'T1R1'), 7);
  ok(t1.v === 20 && t1.cor === C.corDe(C.fracaoRuim(cena.m, 20)), 'valor e cor iguais aos da tela');

  /* transição: a cor passa de uma faixa para a outra sem salto; em cima da
     avaliação é a faixa exata */
  {
    const pT1 = cena.m.grade.find(g => g.chave === 'T1R1'); /* 5 -> 20 -> 40 */
    const c7 = X.colunaEm(cena, pT1, 7).cor, c30 = X.colunaEm(cena, pT1, 30).cor;
    ok(c7 === C.corDe(C.fracaoRuim(cena.m, 20)) && c30 === C.corDe(C.fracaoRuim(cena.m, 40)), 'em cima da avaliação: cor da faixa exata');
    const meio = X.colunaEm(cena, pT1, 18.5).cor;
    ok(meio !== c7 && meio !== c30 && /^rgb\(/.test(meio), 'no meio da transição: cor intermediária, sem pulo de faixa');
    const passos = [8, 12, 16, 20, 24, 28].map(t => X.colunaEm(cena, pT1, t).cor.match(/\d+/g).map(Number));
    const salto = Math.max(...passos.slice(1).map((c, i) => Math.abs(c[0] - passos[i][0]) + Math.abs(c[1] - passos[i][1]) + Math.abs(c[2] - passos[i][2])));
    ok(salto < 120, 'passo a passo a cor muda aos poucos (maior salto ' + salto + ')');
    const r4 = X.roteiro([0, 7, 30, 50]), seg = r4.segmentos;
    ok(seg.find(x => x.tipo === 'transicao').dur > seg.find(x => x.tipo === 'avaliacao').dur, 'transição mais longa que a parada: sem solavanco');
  }

  /* ALTURA: o bloco cresce para cima (pedido de quem usa: "só muda a cor, o
     retângulo da parcela não cresce"). A fração é a da régua da TELA
     (alturaDe), ampliada por padrão: o maior lançado aqui é 40, então a régua
     vai de 0 a 40 e a parcela de 40 enche a coluna. */
  {
    const pT1 = cena.m.grade.find(g => g.chave === 'T1R1'), pT3 = cena.m.grade.find(g => g.chave === 'T3R1');
    const a30 = X.colunaEm(cena, pT1, 30), a7 = X.colunaEm(cena, pT1, 7), b30 = X.colunaEm(cena, pT3, 30);
    ok(a30.f === C.alturaDe(cena.m, 40) && a30.h === a30.f * C.geometria().HMAX, 'altura = a mesma conta da tela (alturaDe), em fração e no esquemático');
    ok(cena.m.altura.ampliada && cena.m.altura.max === 40 && a30.f === 1, 'régua ampliada até o maior lançado: 40 enche a coluna');
    ok(Math.abs(a7.f - 0.5) < 1e-9 && Math.abs(b30.f - 0.125) < 1e-9, '20 é metade de 40 e 5 é um oitavo: a altura segue proporcional ao valor');
    ok(X.colunaEm(cena, pT1, 18.5).f > a7.f && X.colunaEm(cena, pT1, 18.5).f < a30.f, 'na transição a coluna sobe aos poucos, entre as duas avaliações');
    const inteira = X.preparar({ s: st, st, variavel: 'Severidade', rot: 0.6, altura: 'inteira' }, { lang: 'pt' });
    ok(inteira.m.altura.max === 100 && Math.abs(X.colunaEm(inteira, pT1, 30).f - 0.4) < 1e-9, 'a escolha "escala inteira" da tela vale no vídeo');
    ok(X.colunaEm(inteira, pT1, 30).cor === a30.cor, 'e a cor não depende da régua da altura');
    ok(X.colunaEm(cena, p, 7).f === 0, 'ausente não tem altura');
    ok(JSON.stringify(cena.eixo.marcas.map(mk => mk.v)) === '[0,10,20,30,40]', 'a régua do quadro é a da tela: ' + JSON.stringify(cena.eixo.marcas.map(mk => mk.v)));
  }

  /* legenda: mesmos cortes, pior primeiro, + sem avaliação; PT/EN */
  const legPt = X.legendaItens(cena.m, 'pt'), legEn = X.legendaItens(cena.m, 'en');
  ok(legPt.length === 6 && legPt[5].vazio && legPt[5].texto === 'sem avaliação', 'cinco faixas + sem avaliação');
  ok(legPt[0].texto === '≥ 80' && legPt[4].texto === '< 20', 'pior faixa primeiro, cortes da escala');
  ok(legPt.slice(0, 5).map(i => i.cor).join() === C.faixas(cena.m).map(f => f.cor).reverse().join(), 'cores = faixas da tela');
  ok(legEn[5].texto === 'not assessed', 'legenda em inglês');

  /* traduções: as duas línguas têm as mesmas chaves */
  ok(JSON.stringify(Object.keys(X.I18N.pt).sort()) === JSON.stringify(Object.keys(X.I18N.en).sort()), 'PT e EN com as mesmas chaves');
  ok(X.tr('en', 'generatedByAgracta') === 'Generated by Agracta' && X.tr('pt', 'generatedByAgracta') === 'Gerado pelo Agracta', 'marca nos dois idiomas');
  ok(X.num(12.5, 1, 'pt') === '12,5' && X.num(12.5, 1, 'en') === '12.5', 'número no formato da língua');

  /* composição: o que aparece no quadro */
  const reg = c._reg; reg.textos = [];
  X.compor(ctx2d(reg), cena, { t: 7, real: true, i: 1, rot: 0.6 });
  let txt = reg.textos.join('|');
  ok(txt.includes('LB 2749/077:26 S') && txt.includes('Soja · Ferrugem asiática'), 'título, cultura e alvo');
  ok(txt.includes('Avaliação 2 de 3 · 7 DAA') && txt.includes('08/03/2026'), 'avaliação real com DAA e data');
  ok(txt.includes('Bloco A') && txt.includes('T3') && txt.includes('Gerado pelo Agracta'), 'rótulos da grade e marca');
  /* a altura tem régua no quadro e linha na legenda, com os números */
  ok(reg.textos.includes('Altura (%)') && ['0', '10', '20', '30', '40'].every(s => reg.textos.includes(s)), 'régua da altura desenhada, com título e marcas');
  ok(txt.includes('Altura: 0 a 40 %') && /Altura ampliada/.test(txt), 'legenda diz a régua da altura e que ela foi ampliada');
  ok(!/igual para todos/.test(txt), 'nenhum texto diz mais que a altura é igual para todos');
  reg.textos = [];
  X.compor(ctx2d(reg), cena, { t: 15, real: false, de: 1, para: 2, rot: 0.6 });
  txt = reg.textos.join('|');
  ok(txt.includes('não é avaliação') && !/Avaliação \d de/.test(txt), 'transição nunca rotulada como avaliação');
  const cenaEn = X.preparar({ s: st, st, variavel: 'Severidade', rot: 0.6 }, { lang: 'en', marca: false, legenda: false });
  reg.textos = [];
  X.compor(ctx2d(reg), cenaEn, { t: 30, real: true, i: 2 });
  txt = reg.textos.join('|');
  ok(txt.includes('Assessment 3 of 3 · 30 DAA') && txt.includes('Block A') && !txt.includes('Agracta') && !txt.includes('not assessed'), 'EN e caixas de conteúdo respeitadas');
  ok(!/Height/.test(txt) && !reg.textos.includes('40'), 'sem legenda, sem régua: o quadro limpo é limpo');
  const cenaEn2 = X.preparar({ s: st, st, variavel: 'Severidade', rot: 0.6 }, { lang: 'en' });
  reg.textos = [];
  X.compor(ctx2d(reg), cenaEn2, { t: 30, real: true, i: 2 });
  txt = reg.textos.join('|');
  ok(txt.includes('Height: 0 to 40%') && reg.textos.includes('Height (%)') && /zoomed/.test(txt), 'régua e legenda da altura em inglês');

  /* PNG: instante da tela; entre avaliações vira transição */
  ok(X.instantePNG(cena, 7).real && X.instantePNG(cena, 12).real === false, 'PNG distingue real de transição');
  const png = await X.gerarPNG({ s: st, st, variavel: 'Severidade', t: 30, rot: 0.6 }, { lang: 'pt' });
  ok(png.nome === 'agracta_LB-2749-077-26-S_Severidade_30DAA.png', 'nome do PNG: ' + png.nome);
  ok(reg.canvases.every(cv => cv.width === 0), 'canvas do PNG liberado');
  ok(JSON.stringify(st.avaliacoes.map(a => a.id)) === '["A3","A1","A2"]', 'estudo não foi reordenado nem alterado');

  /* estilo realista sem WebGL/three: cai no esquemático e avisa, nunca falha */
  const pngR = await X.gerarPNG({ s: st, st, variavel: 'Severidade', t: 30, rot: 0.6 }, { lang: 'pt', estilo: 'realista' });
  ok(pngR.semReal === true && pngR.nome.endsWith('_30DAA.png') && reg.scripts >= 1, 'realista indisponível: PNG esquemático + aviso');
  ok(X.tr('pt', 'realFallback').includes('esquemático') && X.tr('en', 'styleRealistic') === 'Realistic', 'textos do estilo nos dois idiomas');
  const semEstilo = await X.gerarPNG({ s: st, st, variavel: 'Severidade', t: 30, rot: 0.6 }, { lang: 'pt' });
  ok(semEstilo.semReal === false, 'sem pedir realista, nada de WebGL é carregado');

  /* REALISTA: o bloco de folhagem tem a altura do valor, pela fração da tela.
     (O WebGL não roda aqui; o que se confere é a conta e a fiação dela.) */
  {
    vm.runInContext(fs.readFileSync('campo-3d-realista.js', 'utf8'), c);
    const R = c.AgCampoRealista, g = C.geometria(), HR = R.alturaCheia(g);
    ok(HR > Math.max(g.PW, g.PL), 'bloco cheio mais alto que a parcela é comprida: a diferença aparece');
    ok(R.alturaDoBloco(1, HR) === HR && Math.abs(R.alturaDoBloco(0.5, HR) - HR / 2) < 1e-9, 'fração da régua vezes a altura cheia');
    ok(R.alturaDoBloco(0, HR) > 0 && R.alturaDoBloco(7, HR) === HR && R.alturaDoBloco(NaN, HR) > 0, 'nunca negativo, nunca acima do cheio, nunca NaN');
    const src = fs.readFileSync('campo-3d-realista.js', 'utf8');
    ok(/colunaEm\(cena, pi\.p, t\)/.test(src) && /alturaDoBloco\(col\.f, HR\)/.test(src), 'a altura do bloco sai da mesma coluna da tela (colunaEm → alturaDe)');
    ok(/folhas\.receiveShadow = false/.test(src), 'folhagem não recebe sombra: bloco alto não escurece a cor (o dado) do vizinho');
    ok(/function maisAlta\(p\)/.test(src) && /ORCAMENTO/.test(src) && /pi\.ks\[fi\]/.test(src),
      'folhas semeadas só até a altura mais alta de cada parcela, com orçamento: o vídeo não fica pesado');
    ok(!/altura não é dado/.test(src), 'o comentário antigo ("a altura não é dado") não sobrevive para enganar');
  }

  /* MP4 sem WebCodecs: erro claro, não arquivo inválido */
  await X.gerarMP4({ s: st, st, variavel: 'Severidade', rot: 0.6 }, { lang: 'pt' }).then(() => ok(false, 'devia falhar'),
    e => ok(e.codigo === 'videoUnsupported', 'navegador sem H.264 avisa'));

  /* MP4 com encoder de mentira: quadros fechados, encoder fechado, canvas liberado */
  function comVideo(falharNoQuadro) {
    const est = { frames: 0, fechados: 0, encodados: 0, encoderFechado: 0, finalizado: 0 };
    class VideoFrame { constructor() { est.frames++; } close() { est.fechados++; } }
    class VideoEncoder {
      constructor(o) { this.o = o; this.state = 'unconfigured'; this.encodeQueueSize = 0; }
      static isConfigSupported(cfg) { return Promise.resolve({ supported: cfg.codec === 'avc1.4d0028' }); }
      configure(cfg) { this.state = 'configured'; est.codec = cfg.codec; }
      encode(f, op) { est.encodados++; if (falharNoQuadro && est.encodados === falharNoQuadro) throw new Error('boom'); this.o.output({ k: op.keyFrame }, {}); }
      flush() { return Promise.resolve(); }
      close() { this.state = 'closed'; est.encoderFechado++; }
    }
    const Mp4Muxer = { ArrayBufferTarget: class { constructor() { this.buffer = new ArrayBuffer(8); } },
      Muxer: class { constructor(o) { this.target = o.target; est.cfgMux = o; } addVideoChunk() {} finalize() { est.finalizado++; } } };
    return { est, c: carregar({ VideoFrame, VideoEncoder, Mp4Muxer }) };
  }
  let v = comVideo();
  const fases = [];
  const mp4 = await v.c.AgCampoExportar.gerarMP4({ s: st, st, variavel: 'Severidade', rot: 0.6 }, { lang: 'en' }, a => fases.push(a.fase));
  ok(mp4.nome === 'agracta_LB-2749-077-26-S_Severidade_0-30DAA.mp4' && mp4.blob.type === 'video/mp4', 'MP4 com nome e tipo');
  ok(v.est.codec === 'avc1.4d0028' && v.est.cfgMux.video.width === 1920 && v.est.cfgMux.video.height === 1080 && v.est.cfgMux.video.frameRate === 30 && !v.est.cfgMux.audio, '1920×1080, 30 fps, H.264, sem áudio');
  ok(v.est.frames === mp4.quadros && v.est.fechados === v.est.frames, 'todo VideoFrame fechado');
  ok(v.est.encoderFechado === 1 && v.est.finalizado === 1 && v.c._reg.canvases.every(cv => cv.width === 0), 'encoder fechado e canvas liberado');
  ok(fases[0] === 'preparing' && fases.includes('rendering') && fases[fases.length - 1] === 'encoding', 'progresso informado');
  v = comVideo(10);
  await v.c.AgCampoExportar.gerarMP4({ s: st, st, variavel: 'Severidade', rot: 0.6 }, {}).then(() => ok(false, 'devia falhar'), () => {});
  ok(v.est.encoderFechado === 1 && v.est.fechados === v.est.frames && v.est.finalizado === 0 && v.c._reg.canvases.every(cv => cv.width === 0), 'erro no meio: tudo liberado, nada entregue');
  v = comVideo();
  let pedidos = 0;
  await v.c.AgCampoExportar.gerarMP4({ s: st, st, variavel: 'Severidade', rot: 0.6 }, {}, null, () => ++pedidos > 2).then(() => ok(false, 'devia cancelar'),
    e => ok(e.codigo === 'canceled' && v.est.encoderFechado === 1, 'cancelar libera o encoder'));

  fim = true;
  console.log('exportação do campo: ' + n + ' verificações OK.');
  process.exit(0);
})().catch(e => { console.error('FALHA', e); process.exit(1); });
