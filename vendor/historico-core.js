/* historico-core.js — o que você já fez com este ativo
 *
 * O Agracta guarda cada ensaio inteiro e não sabe nada sobre o conjunto. Quem
 * monta um tratamento novo faz de cabeça a pergunta que o app já poderia
 * responder: "eu já usei isso? em que cultura, contra o quê, em que dose?".
 *
 * Este motor responde essa pergunta e SÓ essa. É um índice, não um analista.
 *
 * QUATRO REGRAS, e a primeira é a que define o resto:
 *
 * 1. CONTA E LISTA; NUNCA RESUME RESULTADO.
 *    Devolve onde o ativo entrou e com que dose. Nunca uma eficácia média
 *    entre ensaios. Ensaios diferentes têm delineamento, pressão de praga,
 *    ano e local diferentes: a média entre eles é um número que não
 *    corresponde a experimento nenhum. Quem quiser comparar abre os dois.
 *
 * 2. SÓ CRUZA O QUE RESOLVE.
 *    Dois nomes são o mesmo ativo quando os dois chegam ao mesmo nome ISO
 *    (tebuconazol e tebuconazole). Um nome que a tabela não conhece casa só
 *    consigo mesmo, por igualdade literal, e o resultado diz `resolvido:false`
 *    — para a tela poder avisar em vez de deixar acreditar que a busca foi
 *    completa. Aproximar nome de defensivo por parecença é como o app passa a
 *    dizer que você já usou uma coisa que nunca usou.
 *
 * 3. O ENSAIO NÃO É HISTÓRICO DE SI MESMO.
 *    O estudo aberto sai da conta. Senão todo tratamento nasce anunciando que
 *    já foi usado uma vez — nele próprio.
 *
 * 4. SEM HISTÓRICO ANTERIOR, SILÊNCIO.
 *    Zero usos devolve null, e a tela não escreve nada. "Nenhum registro
 *    anterior" ocupa espaço em todo tratamento novo para não informar nada.
 *
 * DEPENDÊNCIAS por injeção, nunca por global: `deps.AtivosEN` (nome ISO) e
 * `deps.DoseCore` (separar "A (400 g/L) + B (100 g/L)" em dois ativos). Sem
 * elas o motor ainda funciona, só que casando por texto normalizado — e diz
 * isso em `resolvido`.
 */
(function (raiz) {
  'use strict';
  var VERSION = '1.0.0';

  function txt(v) { return String(v == null ? '' : v).trim(); }

  /* Normalização de texto: só acento, caixa e espaço. Nada de tirar sufixo nem
     de aproximar — ver regra 2. */
  function norma(s) {
    s = String(s == null ? '' : s);
    return (s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s)
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* A chave de um ativo. Resolve para o nome ISO quando a tabela conhece;
     senão devolve o texto normalizado e marca que não resolveu. */
  function chaveAtivo(nome, deps) {
    var orig = txt(nome);
    if (!orig) return null;
    var EN = deps && deps.AtivosEN;
    if (EN && EN.emIngles) {
      var r = null;
      try { r = EN.emIngles(orig); } catch (e) { r = null; }
      if (r && r.traduzido && r.nome) {
        return { chave: norma(r.nome), rotulo: orig, resolvido: true };
      }
    }
    return { chave: norma(orig), rotulo: orig, resolvido: false };
  }

  /* Os ativos de um tratamento. O campo de ingrediente ativo manda; sem ele,
     o nome do produto é o que se tem — e um nome comercial normalmente não
     resolve para ISO, o que já fica dito em `resolvido`. */
  function ativosDoTratamento(trat, deps) {
    if (!trat || trat.testemunha) return [];      /* testemunha não usa produto */
    var fonte = txt(trat.ia || trat.ingredienteAtivo);
    var partes = [];
    if (fonte) {
      var DC = deps && deps.DoseCore;
      if (DC && DC.ativosDe) {
        try {
          (DC.ativosDe(fonte) || []).forEach(function (a) { if (a && txt(a.ia)) partes.push(a.ia); });
        } catch (e) { /* separador falhou: o texto inteiro vira um ativo só */ }
      }
      if (!partes.length) partes = [fonte];
    } else {
      var p = txt(trat.produto);
      if (p) partes = [p];
    }
    var vistos = {}, out = [];
    partes.forEach(function (nome) {
      var k = chaveAtivo(nome, deps);
      if (!k || vistos[k.chave]) return;
      vistos[k.chave] = 1;
      out.push(k);
    });
    return out;
  }

  /* Dose como o usuário escreveu. Agrupa "1,5 L/ha" com "1.5 L/ha", mas exibe
     o literal que veio primeiro: reescrever a dose de alguém é como um erro de
     digitação vira verdade. */
  function chaveDose(d) {
    var s = norma(d).replace(',', '.');
    return s.replace(/\s*\/\s*/g, '/');
  }

  /* -------------------------------------------------------------------------
     ÍNDICE
     Entrada: lista de ensaios já achatada pela interface, cada um
       { qid, sid, codigo, cultura, alvo, tipoEstudo, dataInicio, finalizado,
         tratamentos:[{ id, produto, ia, dose, testemunha }] }
     ------------------------------------------------------------------------- */
  function indexar(ensaios, deps) {
    var idx = { porAtivo: {}, rotulo: {}, resolvido: {}, ensaios: 0, usos: 0, VERSION: VERSION };
    (ensaios || []).forEach(function (en) {
      if (!en || !en.sid) return;
      idx.ensaios++;
      (en.tratamentos || []).forEach(function (t) {
        ativosDoTratamento(t, deps).forEach(function (k) {
          if (!idx.porAtivo[k.chave]) {
            idx.porAtivo[k.chave] = [];
            idx.rotulo[k.chave] = k.rotulo;
            idx.resolvido[k.chave] = k.resolvido;
          }
          idx.porAtivo[k.chave].push({ ensaio: en, trat: t });
          idx.usos++;
        });
      });
    });
    return idx;
  }

  function contagem(lista) {
    var m = {}, ordem = [];
    lista.forEach(function (v) {
      var s = txt(v); if (!s) return;
      var k = norma(s);
      if (!m[k]) { m[k] = { nome: s, n: 0 }; ordem.push(k); }
      m[k].n++;
    });
    return ordem.map(function (k) { return m[k]; })
      .sort(function (a, b) { return b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'); });
  }

  /* -------------------------------------------------------------------------
     CONSULTA
     opcoes: { excluirSid, cultura }  — cultura só marca `naCultura`, não filtra:
     ter usado o mesmo ativo em outra cultura é informação, não ruído.
     ------------------------------------------------------------------------- */
  function consultar(idx, nome, opcoes, deps) {
    opcoes = opcoes || {};
    var k = chaveAtivo(nome, deps);
    if (!k || !idx || !idx.porAtivo) return null;
    var linhas = (idx.porAtivo[k.chave] || []).filter(function (l) {
      return !(opcoes.excluirSid && l.ensaio.sid === opcoes.excluirSid);
    });
    if (!linhas.length) return null;                       /* regra 4 */

    var porEnsaio = {}, ordemEnsaios = [];
    var doses = {}, ordemDoses = [];
    linhas.forEach(function (l) {
      var sid = l.ensaio.sid;
      if (!porEnsaio[sid]) {
        porEnsaio[sid] = {
          sid: sid, qid: l.ensaio.qid, codigo: txt(l.ensaio.codigo),
          cultura: txt(l.ensaio.cultura), alvo: txt(l.ensaio.alvo),
          tipoEstudo: txt(l.ensaio.tipoEstudo), dataInicio: txt(l.ensaio.dataInicio),
          finalizado: !!l.ensaio.finalizado, doses: []
        };
        ordemEnsaios.push(sid);
      }
      var d = txt(l.trat.dose);
      if (d && porEnsaio[sid].doses.indexOf(d) < 0) porEnsaio[sid].doses.push(d);
      if (d) {
        var dk = chaveDose(d);
        if (!doses[dk]) { doses[dk] = { texto: d, n: 0 }; ordemDoses.push(dk); }
        doses[dk].n++;
      }
    });

    var lista = ordemEnsaios.map(function (sid) { return porEnsaio[sid]; })
      /* Mais recente primeiro. Ensaio sem data vai para o fim: não sabemos
         quando foi, e chutar uma posição na linha do tempo é inventar. */
      .sort(function (a, b) {
        if (!a.dataInicio && !b.dataInicio) return 0;
        if (!a.dataInicio) return 1;
        if (!b.dataInicio) return -1;
        return b.dataInicio.localeCompare(a.dataInicio);
      });

    var culturaAtual = norma(opcoes.cultura);
    return {
      chave: k.chave,
      rotulo: idx.rotulo[k.chave] || k.rotulo,
      resolvido: !!idx.resolvido[k.chave] && k.resolvido,
      usos: linhas.length,
      ensaios: lista,
      culturas: contagem(lista.map(function (e) { return e.cultura; })),
      alvos: contagem(lista.map(function (e) { return e.alvo; })),
      doses: ordemDoses.map(function (dk) { return doses[dk]; })
        .sort(function (a, b) { return b.n - a.n || a.texto.localeCompare(b.texto, 'pt-BR'); }),
      naCultura: culturaAtual ? lista.filter(function (e) { return norma(e.cultura) === culturaAtual; }).length : null
    };
  }

  /* Uma frase para a linha discreta abaixo do campo. Devolve '' quando não há
     o que dizer — a tela nunca precisa decidir se escreve ou não. */
  function resumo(r) {
    if (!r || !r.usos) return '';
    var n = r.ensaios.length;
    var p = [n + (n === 1 ? ' ensaio seu' : ' ensaios seus')];
    if (r.culturas.length) {
      p.push(r.culturas.slice(0, 3).map(function (c) { return c.nome; }).join(', ') +
             (r.culturas.length > 3 ? ' e mais' : ''));
    }
    if (r.doses.length) {
      p.push(r.doses.length === 1 ? 'dose ' + r.doses[0].texto
                                  : 'doses ' + r.doses.slice(0, 3).map(function (d) { return d.texto; }).join(' · ') +
                                    (r.doses.length > 3 ? ' e mais' : ''));
    }
    return p.join(' — ');
  }

  var API = {
    VERSION: VERSION,
    indexar: indexar, consultar: consultar, resumo: resumo,
    chaveAtivo: chaveAtivo, ativosDoTratamento: ativosDoTratamento
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (raiz) raiz.HistoricoCore = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
