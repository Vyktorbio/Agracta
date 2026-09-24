/* EppoCore — nome → código EPPO, a partir de data/eppo.json
 *
 * É o `deps.eppo` que o ObservacaoCore espera. Não sabe nada além da tabela:
 * a tabela é gerada por tools/eppo-atualiza.py, que só grava código conferido
 * na própria EPPO. Aqui não há aproximação — nome que a tabela não tem devolve
 * null, e a camada de conhecimento diz "sem código EPPO" em vez de adivinhar.
 *
 * Cultura passa primeiro pelo nome do app ("Soja", "Cana-de-açúcar",
 * "CITROS") para o binômio da tabela; alvo já chega como binômio. A comparação
 * ignora caixa, acento, hífen, espaço repetido e o sinal de híbrido (× = x).
 */
(function (root) {
  'use strict';
  function chave(s) {
    s = String(s == null ? '' : s).replace(/×/g, 'x');
    s = s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s;
    return s.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function criar(tabela) {
    tabela = tabela || {};
    var culturas = {}, codigos = {};
    Object.keys(tabela.culturas || {}).forEach(function (k) { culturas[chave(k)] = tabela.culturas[k]; });
    Object.keys(tabela.codigos || {}).forEach(function (k) {
      var c = tabela.codigos[k]; if (c && c.eppo) codigos[chave(k)] = c.eppo;
    });
    function eppo(nome, tipo) {
      var k = chave(nome);
      if (!k) return null;
      if (tipo === 'cultura' && culturas[k]) k = chave(culturas[k]);
      return codigos[k] || null;
    }
    eppo.total = Object.keys(codigos).length;
    eppo.gerado = tabela.gerado || null;
    return eppo;
  }
  /* Carrega a tabela uma vez (o service worker guarda para o offline). Sem
     tabela, devolve um eppo que sempre responde null — nunca falha. */
  var _carga = null;
  function carregar(url) {
    if (_carga) return _carga;
    var f = root.fetch;
    _carga = (f ? f(url || 'data/eppo.json?v=1').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                : Promise.reject(new Error('sem fetch')))
      .then(criar, function () { return criar({}); });
    return _carga;
  }
  var api = { chave: chave, criar: criar, carregar: carregar };
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.EppoCore = api;
})(typeof self !== 'undefined' ? self : this);
