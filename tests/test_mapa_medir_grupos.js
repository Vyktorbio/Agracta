'use strict';
/* "Medir" com VÁRIOS GRUPOS, pela tela: + Grupo, Encher quadra, Desfazer,
   escolher grupo (botão e toque no mapa), medidas por grupo, Remover e
   Limpar — e nada gravado além das medidas digitadas.
   O Leaflet aqui é de mentira: o que se confere é o painel e o que ele manda
   desenhar, não o mapa. */
const assert = require('node:assert/strict'), fs = require('fs');
let JSDOM; try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://agracta.test', runScripts: 'outside-only' });
const w = dom.window;
w.requestAnimationFrame = (f) => setTimeout(f, 0);

/* Leaflet de mentira: guarda o que foi pedido */
function camada(tipo, ll, op) {
  const l = { tipo, ll, op: op || {}, eventos: {},
    on(ev, f) { l.eventos[ev] = f; return l; },
    addTo(alvo) { (alvo.addLayer ? alvo.addLayer(l) : alvo.push(l)); return l; },
    setLatLng(p) { l.ll = p; return l; }, getLatLng() { return Array.isArray(l.ll) ? { lat: l.ll[0], lng: l.ll[1] } : l.ll; },
    setOpacity(o) { l.opac = o; } };
  return l;
}
const L = {
  layerGroup() { const g = { itens: [], addTo(m) { m.addLayer(g); return g; }, addLayer(l) { g.itens.push(l); }, clearLayers() { g.itens = []; }, eachLayer(f) { g.itens.forEach(f); } }; return g; },
  polygon: (p, o) => camada('polygon', p, o), circle: (p, o) => camada('circle', p, o), marker: (p, o) => camada('marker', p, o),
  divIcon: (o) => o, latLngBounds: () => ({ extend() {}, isValid: () => false }),
  DomEvent: { disableClickPropagation() {}, disableScrollPropagation() {}, stopPropagation() {} }
};
const noMapa = [];
const mapa = { centro: null, getCenter() { return this.centro; }, on(ev, f) { this['on_' + ev] = f; }, off(ev) { delete this['on_' + ev]; },
  addLayer(l) { noMapa.push(l); }, removeLayer(l) { const i = noMapa.indexOf(l); if (i >= 0) noMapa.splice(i, 1); }, fitBounds() {} };

w.eval(fs.readFileSync('vendor/croqui-campo-core.js', 'utf8'));
const C = w.CroquiCore;
/* quadra de 100 × 50 m (leste × norte) em volta do centro do mapa */
const anc = { lat: -21.5, lng: -48.0, ang: 0 };
mapa.centro = { lat: anc.lat, lng: anc.lng };
w._map = mapa; w.L = L;
w.QGEO = { Q1: [C.pontoLatLng(-50, -25, anc), C.pontoLatLng(50, -25, anc), C.pontoLatLng(50, 25, anc), C.pontoLatLng(-50, 25, anc)] };
w.ensureQGEO = () => true; w.quadraNome = (id) => id === 'Q1' ? 'Quadra Norte' : id; w.quadraEixo = () => 0;
/* um estudo de 12 × 30 m, lembrado de uma vez anterior */
w.localStorage.setItem('agracta-medir-ultimo', JSON.stringify({ comprimento: 30, largura: 12, quantidade: 1, colunas: 1, espaco: 2 }));
w.eval(fs.readFileSync('mapa-medir.js', 'utf8'));
const A = w.AgMedir;
const espera = () => new Promise((r) => setTimeout(r, 5));

(async () => {
  A.abrir();
  const p = w.document.getElementById('medirPanel');
  const info = () => p.querySelector('.croqui-info').textContent.replace(/\s+/g, ' ');
  const chips = () => Array.from(p.querySelectorAll('[data-medir-grupo]'));
  const botao = (a) => p.querySelector('[data-medir-acao="' + a + '"]');
  const clica = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const camadaDoMedir = () => noMapa.find((l) => l.itens);
  const poligonos = () => camadaDoMedir().itens.filter((l) => l.tipo === 'polygon');

  ok(p && A.estado().grupos === 1, 'abre com um grupo');
  ok(/Cabe inteiro na quadra Quadra Norte/.test(info()), 'um grupo dentro da quadra: cabe');
  ok(chips().length === 0 && p.querySelector('[data-medir-chips]').style.display === 'none' && botao('remover').disabled && botao('voltar').disabled,
    'um grupo só: sem botões de grupo (o painel fica como era), remover e desfazer apagados');

  /* + Grupo: cópia na vaga do lado, inteira na quadra */
  clica(botao('novo'));
  ok(A.estado().grupos === 2 && A.estado().ativo === 1, '+ Grupo cria o segundo e já o escolhe');
  ok(chips().length === 2 && chips()[1].classList.contains('on'), 'dois botões de grupo, o novo marcado');
  ok(/Grupo 2:/.test(info()) && /2 de 2 grupo\(s\) cabem inteiros/.test(info()), 'o painel fala do grupo 2 e resume a quadra: ' + info());
  ok(/ocupam 0,07 de 0,5 ha \(14 %\)/.test(info()), 'e quanto da quadra eles ocupam: ' + info());
  ok(poligonos().length === 2 && poligonos().every((l) => l.op.interactive), 'dois retângulos, os dois tocáveis');
  ok(poligonos()[0].op.color !== poligonos()[1].op.color, 'cada grupo na sua cor');

  /* Encher quadra: cabem 7 numa fileira; já há 2, então mais 5 */
  clica(botao('encher'));
  ok(A.estado().grupos === 7, 'encher: 7 grupos na fileira, veio ' + A.estado().grupos);
  ok(/Cabem mais 5 grupo\(s\)/.test(info()) && /7 de 7 grupo\(s\) cabem/.test(info()), 'o painel diz quantos couberam a mais: ' + info());
  clica(botao('encher'));
  ok(A.estado().grupos === 7 && /Não cabe mais nenhum grupo igual/.test(info()), 'encher de novo: não cabe mais nenhum, e diz');

  /* Desfazer volta o encher inteiro */
  clica(botao('voltar'));
  ok(A.estado().grupos === 2, 'desfazer volta para os 2 grupos');

  /* escolher o grupo 1 pelo botão: as medidas passam a ser dele */
  clica(chips()[0]);
  ok(A.estado().ativo === 0, 'o botão do grupo 1 o escolhe');
  const muda = (k, v) => { const el = p.querySelector('[data-medir="' + k + '"]'); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  muda('quantidade', '3'); muda('colunas', '3');
  ok(poligonos().length === 4, 'o grupo 1 passa a ter 3 retângulos lado a lado; o 2 continua com 1');
  ok(/Encosta no grupo 2/.test(info()) && chips()[0].textContent.includes('✗'), 'agora o 1 encosta no 2, e o botão dele acusa');
  ok(poligonos().some((l) => l.op.color === '#ff5a5a'), 'os retângulos que se sobrepõem ficam em vermelho');
  ok(JSON.parse(w.localStorage.getItem('agracta-medir-ultimo')).quantidade === '3', 'as medidas digitadas ficam lembradas');

  /* tocar num retângulo do grupo 2 no mapa o escolhe */
  const doDois = poligonos().find((l) => l.op.color !== '#ff5a5a' && l.op.color === poligonos()[poligonos().length - 1].op.color) || poligonos()[poligonos().length - 1];
  doDois.eventos.click({});
  ok(A.estado().ativo === 1 && p.querySelector('[data-medir="quantidade"]').value === '1', 'tocar no grupo 2 o escolhe, com as medidas dele');

  /* mover pelo ✛ mexe só no grupo escolhido */
  const mover = noMapa.find((l) => l.tipo === 'marker' && l.op.draggable && /gr-move/.test(l.op.icon.html));
  const p2 = C.pontoLatLng(40, 0, anc);
  mover.ll = p2; mover.eventos.drag();
  await espera();
  ok(!/Encosta no grupo/.test(info()) && /2 de 2 grupo\(s\) cabem/.test(info()), 'afastado pelo ✛, os dois voltam a caber: ' + info());

  /* remover o escolhido */
  clica(botao('remover'));
  ok(A.estado().grupos === 1 && chips().length === 0 && botao('remover').disabled, 'remover deixa um grupo, e o último não sai');

  /* tocar no mapa no modo grade não marca nada */
  if (mapa.on_click) mapa.on_click({ latlng: { lat: anc.lat, lng: anc.lng } });
  ok(A.estado().grupos === 1, 'no modo grade o toque no mapa não cria nada');

  /* Limpar some com tudo */
  clica(botao('fechar'));
  ok(!w.document.getElementById('medirPanel') && A.estado() === null && !noMapa.some((l) => l.itens), 'limpar tira painel e desenho');
  const chaves = Object.keys(w.localStorage);
  ok(chaves.length === 1 && chaves[0] === 'agracta-medir-ultimo', 'nada gravado além das medidas: ' + chaves.join(', '));

  console.log('medir com vários grupos, pela tela: ' + n + ' verificações OK.');
  w.close();
})().catch((e) => { console.error('FALHA', e); process.exit(1); });
