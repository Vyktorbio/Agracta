/* Agracta — o que o iPhone faz diferente, num lugar só.
 *
 * A PÁGINA QUE O iOS ESQUECE DESLOCADA
 * O html e o body do Agracta não rolam (overflow:hidden em styles.css): o mapa
 * ocupa a tela e tudo que rola mora dentro dos painéis. Mesmo assim o iOS
 * desloca a página inteira em dois momentos, e às vezes não a devolve:
 *
 *   - ao abrir o teclado, para mostrar o campo. Fechado o teclado, a página
 *     pode ficar alguns pixels para cima e a barra de baixo flutua;
 *   - no iOS 27, com o app instalado na Tela de Início: girar deitado → em pé
 *     deixa a página rolada pela altura da barra de status. Nada aparece
 *     errado, mas o toque passa a cair deslocado — perto do topo e da barra de
 *     baixo os botões "não pegam".
 *
 * Como a página nunca deveria estar rolada, a correção é devolvê-la a (0,0).
 * Só quando ninguém está digitando (campo em foco ou teclado aberto) e a pessoa
 * não ampliou a tela com dois dedos: nesses casos o deslocamento é dela.
 *
 * Só roda no iPhone/iPad. A decisão (precisaEndireitar) é pura e testada em
 * tests/test_iphone.js; o resto só lê o estado da tela e chama scrollTo.
 */
(function (w, d) {
  'use strict';

  function ehIOS(nav) {
    nav = nav || w.navigator || {};
    var ua = String(nav.userAgent || '');
    /* O iPad com iPadOS se apresenta como Mac; o que o entrega é a tela de toque. */
    return /iP(hone|od|ad)/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  }

  /* Teclado aberto: a área visível encolhe bem mais que qualquer barra do Safari. */
  var TECLADO_PX = 150;

  /* e = {y, x, raizY, corpoY, vvTop, vvLeft, escala, tecladoPx}; digitando = há campo em foco. */
  function precisaEndireitar(e, digitando) {
    if (!e || digitando) return false;
    if (e.escala && Math.abs(e.escala - 1) > 0.01) return false;   /* ampliou com dois dedos: foi a pessoa */
    if ((e.tecladoPx || 0) > TECLADO_PX) return false;              /* teclado aberto: o iOS ainda está mostrando o campo */
    return [e.y, e.x, e.raizY, e.corpoY, e.vvTop, e.vvLeft].some(function (v) { return Math.abs(v || 0) >= 1; });
  }

  function digitando() {
    var a = d.activeElement;
    if (!a || a === d.body) return false;
    if (a.isContentEditable) return true;
    if (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT') return true;
    if (a.tagName !== 'INPUT') return false;
    return !/^(button|submit|reset|checkbox|radio|range|color|file|image|hidden)$/i.test(a.type || 'text');
  }

  function estado() {
    var vv = w.visualViewport, raiz = d.documentElement || {}, corpo = d.body || {};
    return {
      y: w.scrollY || w.pageYOffset || 0,
      x: w.scrollX || w.pageXOffset || 0,
      raizY: raiz.scrollTop || 0,
      corpoY: corpo.scrollTop || 0,
      vvTop: vv ? vv.offsetTop : 0,
      vvLeft: vv ? vv.offsetLeft : 0,
      escala: vv ? vv.scale : 1,
      tecladoPx: vv ? Math.max(0, (w.innerHeight || 0) - vv.height - (vv.offsetTop || 0)) : 0
    };
  }

  function endireitar() {
    if (!precisaEndireitar(estado(), digitando())) return false;
    try { w.scrollTo(0, 0); } catch (e) {}
    try { if (d.documentElement) d.documentElement.scrollTop = 0; if (d.body) d.body.scrollTop = 0; } catch (e) {}
    return true;
  }

  /* O iOS termina de girar/fechar o teclado em alguns quadros; espera assentar. */
  var timer = null;
  function agendar() { clearTimeout(timer); timer = setTimeout(endireitar, 300); }

  function ligar() {
    w.addEventListener('orientationchange', agendar);
    w.addEventListener('resize', agendar);
    if (w.visualViewport) w.visualViewport.addEventListener('resize', agendar);
    d.addEventListener('focusout', agendar);
    /* Voltar do segundo plano depois de girar com o app fechado também acontece. */
    d.addEventListener('visibilitychange', function () { if (!d.hidden) agendar(); });
  }

  w.AgractaIphone = { ehIOS: ehIOS, precisaEndireitar: precisaEndireitar, endireitar: endireitar, estado: estado, digitando: digitando };
  if (ehIOS()) ligar();
})(window, document);
