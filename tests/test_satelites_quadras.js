/* FOCOS DE CALOR x QUADRAS: a pergunta de quem cuida do ensaio.
 *
 * Pedido de uso: "dá pra pôr o NASA FIRMS?" — e, numa estação de ensaios, a
 * pergunta que vem junto é "tem fogo perto das quadras?". O FIRMS dá o centro
 * de um pixel de 375 m em UTC; a tela precisa responder em km, na hora local, e
 * sem afirmar mais do que a área consultada cobre.
 *
 * O QUE ESTE TESTE PROTEGE
 *  1. Distância foco -> quadra: 0 dentro, km até a borda fora, null sem contorno.
 *  2. Raio garantido: "nenhum foco a menos de X" só vale até a borda da área
 *     consultada; quadra fora da área não ganha garantia nenhuma.
 *  3. A frase do painel em cada caso (perto, nenhum, lista cortada, fora).
 *  4. Hora local (fuso do aparelho), idade e número com vírgula.
 *  5. Na tela: o popup traz hora local, UTC para conferir, distância e MW com
 *     vírgula; o painel traz a frase das quadras e diz qual satélite faltou.
 *  6. Arrastar/aproximar dentro da área já consultada não consulta de novo;
 *     sair dela consulta, e os pontos antigos ficam até os novos chegarem.
 *
 * Rodar: node tests/test_satelites_quadras.js
 */
'use strict';
process.env.TZ = 'America/Sao_Paulo';
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../vendor/satelites-core');
let JSDOM; try { ({ JSDOM } = require('jsdom')); }
catch (e) { console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

let n = 0; function ok(c, msg) { assert.ok(c, msg); n++; console.log('  ok    ' + msg); }
const root = path.join(__dirname, '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { await wait(0); await wait(0); };

/* Quadra de ~100 x 110 m perto de Iracemápolis (coordenadas de teste). */
const QA = [[-22.58, -47.52], [-22.58, -47.519], [-22.579, -47.519], [-22.579, -47.52]];
const QB = [[-22.60, -47.55], [-22.60, -47.549], [-22.599, -47.549], [-22.599, -47.55]];
const quadras = [{ id: 'QA', nome: 'Quadra A', anel: QA }, { id: 'QB', nome: 'Quadra B', anel: QB }];
const AGORA = Date.parse('2026-10-06T12:40:00Z');
const foco = (lng, lat, iso, extra) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] },
  properties: Object.assign({ datetime: iso || '2026-10-06T04:40:00Z', confidence: 'nominal', frpMW: 1.25, satellite: 'NOAA-21' }, extra || {}) });

(async () => {
  console.log('\n--- 1. Distância foco -> quadra ---');
  ok(C.distanciaQuadra(-22.5795, -47.5195, QA) === 0, 'foco dentro da quadra: 0');
  const d = C.distanciaQuadra(-22.58, -47.50, QA);
  ok(Math.abs(d - 1.953) < 0.02, 'foco a leste: ~1,95 km até a borda (' + d.toFixed(3) + ')');
  ok(C.distanciaQuadra(-22.58, -47.50, [[1, 2]]) === null && C.distanciaQuadra(NaN, -47.5, QA) === null, 'sem contorno ou sem coordenada: null, nunca zero');
  const perto = C.quadraMaisPerto(-22.6, -47.56, quadras);
  ok(perto.id === 'QB' && perto.nome === 'Quadra B', 'escolhe a quadra mais perto');

  console.log('\n--- 2. Raio garantido pela área consultada ---');
  const caixa = [-47.72, -22.78, -47.32, -22.38];
  const raio = C.raioGarantido(caixa, quadras);
  ok(raio > 17 && raio < 21, 'quadras no meio de uma caixa de 0,4°: ~18 km garantidos (' + raio.toFixed(1) + ')');
  ok(C.raioGarantido([-47.53, -22.59, -47.50, -22.57], quadras) === null, 'quadra fora da caixa: sem garantia');
  ok(C.raioGarantido(caixa, []) === null, 'sem quadra: sem garantia');

  console.log('\n--- 3. A frase do painel ---');
  let r = C.resumoFocos([foco(-47.50, -22.58)], quadras, caixa, false, AGORA);
  ok(r.texto === 'Foco mais perto das quadras: a 2,0 km de Quadra A, há 8 h.', 'foco dentro do raio: distância, quadra e idade');
  r = C.resumoFocos([], quadras, caixa, false, AGORA);
  ok(/^Nenhum foco a menos de 1\d km das quadras\.$/.test(r.texto), 'nenhum foco: afirma só até o raio garantido (' + r.texto + ')');
  r = C.resumoFocos([foco(-47.33, -22.58)], quadras, caixa, false, AGORA);
  ok(/^Nenhum foco a menos de .* O mais perto na área consultada está a 1\d km de Quadra A, há 8 h\.$/.test(r.texto),
    'foco além do raio: não chama de "o mais perto" sem ressalva');
  r = C.resumoFocos([foco(-47.50, -22.58)], quadras, caixa, true, AGORA);
  ok(/^Mais perto das quadras, entre as detecções mostradas:/.test(r.texto), 'lista cortada: o mais perto só entre os mostrados');
  r = C.resumoFocos([], quadras, [-47.53, -22.59, -47.50, -22.57], false, AGORA);
  ok(/não cabem inteiras na área consultada/.test(r.texto), 'quadras fora da área: diz isso, não "nenhum foco"');
  ok(C.resumoFocos([foco(-47.5, -22.58)], [], caixa, false, AGORA) === null, 'sem quadra no local ativo: nenhuma frase');
  ok(C.resumoFocos([foco(-46.55, -22.55)], quadras, [-46.75, -22.75, -46.35, -22.35], false, AGORA) === null, 'nenhuma quadra na área (mapa noutra região): nenhuma frase');
  r = C.resumoFocos([foco(-47.5195, -22.5795)], quadras, caixa, false, AGORA);
  ok(r.texto === 'Foco mais perto das quadras: sobre Quadra A, há 8 h.', 'foco sobre a quadra');

  console.log('\n--- 4. Hora local, idade e números ---');
  ok(C.horaLocal('2026-10-06T04:40:00Z') === '06/10/2026 01:40', 'UTC 04:40 é 01:40 em Brasília');
  ok(C.horaLocal('lixo') === 'Sem data', 'data inválida não vira hora');
  ok(C.idade('2026-10-06T12:10:00Z', AGORA) === 'há 30 min' && C.idade('2026-10-06T04:40:00Z', AGORA) === 'há 8 h' &&
     C.idade('2026-10-01T12:40:00Z', AGORA) === 'há 5 dias', 'idade em min, h e dias');
  ok(C.numero(1.25, 1) === '1,3' && C.km(0.43) === '450 m' && C.km(2.04) === '2,0 km' && C.km(15.6) === '16 km', 'vírgula decimal e km/m');

  console.log('\n--- 5 e 6. Na tela ---');
  const dom = new JSDOM('<body><div id="ndviPanel" style="display:none"></div><div id="map"></div></body>', { url: 'https://www.agracta.com.br/', runScripts: 'outside-only' });
  const w = dom.window, requests = [], layers = [], events = {}, panes = { rotatePane: { style: {} } };
  let bounds = [-47.53, -22.59, -47.51, -22.57], center = { lat: -22.58, lng: -47.52 };
  w._map = {
    getBounds: () => ({ getWest: () => bounds[0], getSouth: () => bounds[1], getEast: () => bounds[2], getNorth: () => bounds[3] }),
    getCenter: () => center, getContainer: () => w.document.getElementById('map'),
    on: (name, fn) => { events[name] = fn; }, off: (name) => { delete events[name]; },
    removeLayer: (l) => { const i = layers.indexOf(l); if (i >= 0) layers.splice(i, 1); },
    getPane: (name) => panes[name], createPane: (name) => (panes[name] = { style: {} }), fitBounds: () => {},
  };
  const layer = (kind) => ({ kind, addTo() { layers.push(this); return this; }, setOpacity() {}, bindPopup(html) { this.popup = html; return this; } });
  w.LF = {
    circleMarker: () => layer('ponto'),
    imageOverlay: () => layer('raster'),
    geoJSON: (json, o) => { const l = layer('firms'); l.points = json.features.map((f) => { const p = o.pointToLayer(f, {}); o.onEachFeature(f, p); return p; }); return l; },
  };
  w.NDVI_PROXY = 'https://proxy.test'; w._ndviDatesSeq = 0; w._ndviImageSeq = 0;
  w.quadrasAtivas = () => ['QA', 'QB']; w.ensureQGEO = () => {}; w.QGEO = { QA, QB };
  w.quadraNome = (id) => ({ QA: 'Quadra A', QB: 'Quadra B' })[id];
  w.proxyFetch = (url) => new Promise((resolve) => requests.push({ url, resolve, done: false }));
  const pendente = () => requests.find((q) => !q.done);
  const responder = async (q, body) => { q.done = true; q.resolve({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) }); await flush(); };
  const resposta = (features, extra) => ({ type: 'FeatureCollection', features, meta: Object.assign({
    count: features.length, source: 'NASA FIRMS · VIIRS NOAA-20, NOAA-21 · NRT', fetchedAt: '2026-10-06T12:00:00Z',
    latestSourceDetection: '2026-10-06T07:05:00Z', sourceLagHours: 5,
    sources: [{ satellite: 'S-NPP', ok: false, error: 'O provedor de satélite está indisponível. Tente novamente.' },
      { satellite: 'NOAA-20', ok: true }, { satellite: 'NOAA-21', ok: true }] }, extra || {}) });
  try {
    for (const f of ['ui-campo.js', 'vendor/satelites-core.js', 'satelites.js']) w.eval(fs.readFileSync(path.join(root, f), 'utf8'));
    w.agSateliteAbrir('firms');
    const q1 = pendente();
    const bb1 = new URL(q1.url).searchParams.get('bbox').split(',').map(Number);
    ok(Math.abs(bb1[2] - bb1[0] - 0.4) < 1e-6, 'a consulta de focos cobre pelo menos 0,4° em volta do centro');
    await responder(q1, resposta([foco(-47.50, -22.58)]));
    const firms = layers.find((l) => l.kind === 'firms');
    const pop = firms.points[0].popup;
    ok(/Foco de calor · VIIRS NOAA-21/.test(pop), 'popup diz qual satélite viu');
    ok(/06\/10\/2026 01:40 · há /.test(pop) && /04:40 UTC/.test(pop), 'hora local com idade, e o UTC para conferir');
    ok(/A 2,0 km de Quadra A/.test(pop), 'distância até a quadra mais perto');
    ok(/1,3 MW/.test(pop) && !/1\.25/.test(pop), 'potência com vírgula');
    const painel = w.document.getElementById('agSatPanel').textContent;
    ok(/Foco mais perto das quadras: a 2,0 km de Quadra A/.test(painel), 'o painel responde a pergunta das quadras');
    ok(/Sem dados do S-NPP nesta consulta/.test(painel) && /Os outros satélites foram usados/.test(painel), 'o satélite que faltou é dito, não escondido');
    ok(/1 detecção na área consultada/.test(painel), 'contagem no singular');

    bounds = [-47.6, -22.65, -47.45, -22.5]; center = { lat: -22.575, lng: -47.525 };
    events.moveend(); await wait(760);
    ok(!pendente(), 'arrastar dentro da área já consultada não consulta de novo');
    ok(layers.filter((l) => l.kind === 'firms').length === 1, 'e os pontos continuam no mapa');

    bounds = [-46.6, -22.6, -46.5, -22.5]; center = { lat: -22.55, lng: -46.55 };
    events.moveend(); await wait(760);
    const q2 = pendente();
    ok(q2 && /bbox=-46\.75/.test(decodeURIComponent(q2.url)), 'sair da área consulta a área nova');
    ok(layers.filter((l) => l.kind === 'firms').length === 1, 'enquanto a resposta não chega, os pontos antigos ficam');
    await responder(q2, resposta([foco(-46.55, -22.55, '2026-10-06T10:00:00Z'), foco(-46.56, -22.56, '2026-10-06T10:00:00Z')], { sources: [] }));
    const agora = layers.filter((l) => l.kind === 'firms');
    ok(agora.length === 1 && agora[0].points.length === 2, 'a camada nova substitui a antiga, sem sobrar duas');
    ok(/2 detecções na área consultada/.test(w.document.getElementById('agSatPanel').textContent), 'contagem no plural');
    const longe = w.document.getElementById('agSatPanel').textContent;
    ok(!/Nenhum foco a menos|mais perto das quadras/i.test(longe), 'mapa noutra região: nada de frase sobre quadras que não estão ali');

    w.quadrasAtivas = () => ['QA'];
    events.moveend(); await wait(760);
    ok(pendente(), 'trocar o local ativo (outras quadras) consulta de novo, mesmo sem sair da área');
    w.agSatelitesDesligarTodos();
    ok(layers.length === 0, 'desligar tira tudo do mapa');
  } finally { dom.window.close(); }
  console.log('\n' + n + ' verificações, nenhuma falha.');
})().catch((e) => { console.error(e); process.exitCode = 1; });
