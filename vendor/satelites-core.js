/* Cálculos da visualização; não estima umidade ou fogo a partir das cores. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.SatelitesCore = factory();
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  function bbox(bounds, center, kind){
    var min = kind === 'smap' ? 0.6 : kind === 'firms' ? 0.2 : 0.02;
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
  return {bbox:bbox, bounds:bounds, contains:contains, dateLabel:dateLabel, timeLabel:timeLabel,
          bestScene:bestScene, escape:escape};
});
