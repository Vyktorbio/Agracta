/* Cálculos da visualização; não estima umidade ou fogo a partir das cores. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.SatelitesCore = factory();
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  function bbox(bounds, center, kind){
    /* FIRMS: no mínimo ~45 km de lado. A pergunta de quem cuida do ensaio é
       "tem fogo perto das quadras?", e a resposta só vale até a borda do que
       foi consultado (veja raioGarantido) — com a quadra no centro, ~20 km. */
    var min = kind === 'smap' ? 0.6 : kind === 'firms' ? 0.4 : 0.02;
    var max = kind === 'landsat' ? 1.2 : 4;
    var lat = Math.max(-82, Math.min(82, Number(center.lat)));
    var lng = ((Number(center.lng) + 180) % 360 + 360) % 360 - 180;
    if(!isFinite(lat) || !isFinite(lng)) throw new Error('Centro do mapa inválido.');
    var dx = Number(bounds.getEast()) - Number(bounds.getWest());
    var dy = Number(bounds.getNorth()) - Number(bounds.getSouth());
    if(!isFinite(dx) || !isFinite(dy)) throw new Error('Área do mapa inválida.');
    dx = Math.max(min, Math.min(max, dx));
    dy = Math.max(min, Math.min(max, dy));
    // Não atravessa o antimeridiano: os provedores recebem uma caixa contínua.
    lng = Math.max(-180 + dx / 2, Math.min(180 - dx / 2, lng));
    return [lng-dx/2, lat-dy/2, lng+dx/2, lat+dy/2].map(function(v){return Number(v.toFixed(6));});
  }
  function bounds(bb){ return [[bb[1], bb[0]], [bb[3], bb[2]]]; }
  function contains(bb, point){
    return bb && bb[0] <= point.lng && point.lng <= bb[2] && bb[1] <= point.lat && point.lat <= bb[3];
  }
  function dateLabel(value){
    var match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
    return match ? match[3]+'/'+match[2]+'/'+match[1] : 'Sem data';
  }
  function timeLabel(value){
    return dateLabel(value) + (String(value || '').length >= 16 ? ' '+value.slice(11,16)+' UTC' : '');
  }
  function bestScene(scenes){
    return scenes.find(function(s){ return s.cloud <= 25; }) || scenes[0] || null;
  }
  function escape(value){
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
    });
  }

  /* ---- Hora de quem lê ---------------------------------------------------
     O FIRMS grava em UTC; no campo a pergunta é "foi de madrugada ou à
     tarde?". A hora vai no fuso do aparelho, com a idade ao lado; o UTC fica
     no popup só para conferir contra o site da NASA. */
  function dois(n){ return (n < 10 ? '0' : '') + n; }
  function horaLocal(value){
    var d = new Date(String(value || ''));
    if(isNaN(d.getTime())) return 'Sem data';
    return dois(d.getDate())+'/'+dois(d.getMonth()+1)+'/'+d.getFullYear()+' '+dois(d.getHours())+':'+dois(d.getMinutes());
  }
  function idade(value, agoraMs){
    var t = new Date(String(value || '')).getTime();
    if(isNaN(t)) return '';
    var min = Math.max(0, Math.round(((agoraMs == null ? Date.now() : agoraMs) - t) / 60000));
    if(min < 60) return 'há '+min+' min';
    var h = Math.round(min / 60);
    if(h < 48) return 'há '+h+' h';
    return 'há '+Math.round(h / 24)+' dias';
  }
  function numero(v, casas){
    var n = Number(v);
    return isFinite(n) ? n.toFixed(casas).replace('.', ',') : '—';
  }
  function km(v){
    if(v == null || !isFinite(v)) return '—';
    if(v < 1) return (Math.round(v * 20) * 50)+' m';      /* de 50 em 50 m: o pixel tem 375 */
    return v < 10 ? numero(v, 1)+' km' : Math.round(v)+' km';
  }

  /* ---- Foco x quadra ------------------------------------------------------
     O foco é o centro de um pixel de 375 m; a distância é até esse centro, sem
     fingir precisão que o sensor não tem. Plano local (equirretangular) em
     volta do foco: nas dezenas de km que importam o erro é desprezível. */
  var RAIO_TERRA = 6371.0088, GRAU = Math.PI / 180;
  function plano(lat, lng, lat0, lng0){
    return [(lng - lng0) * GRAU * RAIO_TERRA * Math.cos(lat0 * GRAU), (lat - lat0) * GRAU * RAIO_TERRA];
  }
  function dentro(pts){
    var sim = false;
    for(var i = 0, j = pts.length - 1; i < pts.length; j = i++){
      var a = pts[i], b = pts[j];
      if((a[1] > 0) !== (b[1] > 0) && 0 < (b[0] - a[0]) * (0 - a[1]) / (b[1] - a[1]) + a[0]) sim = !sim;
    }
    return sim;
  }
  function aoSegmento(a, b){
    var dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy;
    var t = l ? Math.max(0, Math.min(1, -(a[0] * dx + a[1] * dy) / l)) : 0;
    return Math.hypot(a[0] + t * dx, a[1] + t * dy);
  }
  /* km do ponto à quadra (0 quando cai dentro); null sem contorno válido. */
  function distanciaQuadra(lat, lng, anel){
    if(!Array.isArray(anel) || anel.length < 3 || !isFinite(lat) || !isFinite(lng)) return null;
    var pts = [];
    for(var i = 0; i < anel.length; i++){
      var la = Number(anel[i] && anel[i][0]), lo = Number(anel[i] && anel[i][1]);
      if(!isFinite(la) || !isFinite(lo)) return null;
      pts.push(plano(la, lo, lat, lng));
    }
    if(dentro(pts)) return 0;
    var m = Infinity;
    for(var k = 0; k < pts.length; k++) m = Math.min(m, aoSegmento(pts[k], pts[(k + 1) % pts.length]));
    return m;
  }
  /* quadras: [{id, nome, anel:[[lat,lng],...]}] -> {id, nome, km} da mais perto */
  function quadraMaisPerto(lat, lng, quadras){
    var melhor = null;
    (quadras || []).forEach(function(q){
      var d = distanciaQuadra(lat, lng, q && q.anel);
      if(d != null && (!melhor || d < melhor.km)) melhor = {id:q.id, nome:q.nome || q.id, km:d};
    });
    return melhor;
  }
  /* Até onde a consulta responde por todas as quadras: a menor distância entre
     um vértice de quadra e a borda da caixa. Um foco fora da caixa está no
     mínimo a essa distância — dentro dela, "nenhum foco" é afirmação segura.
     Quadra fora da caixa: null (a caixa não cobre a pergunta). */
  function raioGarantido(bb, quadras){
    if(!bb) return null;
    var r = Infinity, algum = false;
    for(var i = 0; i < (quadras || []).length; i++){
      var anel = quadras[i] && quadras[i].anel;
      if(!Array.isArray(anel) || anel.length < 3) continue;
      for(var j = 0; j < anel.length; j++){
        var lat = Number(anel[j][0]), lng = Number(anel[j][1]);
        if(!(bb[0] <= lng && lng <= bb[2] && bb[1] <= lat && lat <= bb[3])) return null;
        var c = Math.cos(lat * GRAU) * GRAU * RAIO_TERRA;
        r = Math.min(r, (lng - bb[0]) * c, (bb[2] - lng) * c, (lat - bb[1]) * GRAU * RAIO_TERRA, (bb[3] - lat) * GRAU * RAIO_TERRA);
        algum = true;
      }
    }
    return algum ? r : null;
  }
  /* A frase do painel. Só afirma o que a consulta cobre: "nenhum foco a menos
     de X" vale até o raio garantido; lista cortada (só os mais recentes) não
     garante o mais perto. Sem quadra no local ativo, não há o que dizer. */
  function resumoFocos(features, quadras, bb, truncado, agoraMs){
    var validas = (quadras || []).filter(function(q){ return q && Array.isArray(q.anel) && q.anel.length >= 3; });
    /* Mapa olhando outra região (nenhuma quadra na área): a frase seria ruído. */
    var algumaNaArea = bb && validas.some(function(q){
      return q.anel.some(function(p){ return bb[0] <= p[1] && p[1] <= bb[2] && bb[1] <= p[0] && p[0] <= bb[3]; });
    });
    if(!validas.length || !algumaNaArea) return null;
    var perto = null;
    (features || []).forEach(function(f){
      var c = f && f.geometry && f.geometry.coordinates;
      if(!c) return;
      var q = quadraMaisPerto(Number(c[1]), Number(c[0]), validas);
      if(q && (!perto || q.km < perto.km)) perto = {km:q.km, id:q.id, nome:q.nome, datetime:f.properties && f.properties.datetime};
    });
    var raio = raioGarantido(bb, validas), quando = perto ? ', '+idade(perto.datetime, agoraMs) : '';
    var onde = perto ? (perto.km === 0 ? 'sobre '+perto.nome : 'a '+km(perto.km)+' de '+perto.nome) : '';
    var texto;
    if(perto && truncado) texto = 'Mais perto das quadras, entre as detecções mostradas: '+onde+quando+'.';
    else if(perto && raio != null && perto.km <= raio) texto = 'Foco mais perto das quadras: '+onde+quando+'.';
    else if(raio != null) texto = 'Nenhum foco a menos de '+km(raio)+' das quadras.'+(perto ? ' O mais perto na área consultada está '+onde+quando+'.' : '');
    else if(perto) texto = 'Mais perto das quadras, dentro da área consultada: '+onde+quando+'.';
    else texto = 'As quadras do local ativo não cabem inteiras na área consultada; afaste o mapa ou toque em Atualizar.';
    return {texto:texto, perto:perto, raioKm:raio};
  }

  return {bbox:bbox, bounds:bounds, contains:contains, dateLabel:dateLabel, timeLabel:timeLabel,
          bestScene:bestScene, escape:escape, horaLocal:horaLocal, idade:idade, numero:numero, km:km,
          distanciaQuadra:distanciaQuadra, quadraMaisPerto:quadraMaisPerto, raioGarantido:raioGarantido,
          resumoFocos:resumoFocos};
});
