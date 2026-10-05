'use strict';
/* Eixo de % nunca passa de 100. O eixo de severidade chegou a 105% (a conta
   pulava para o múltiplo de 5 seguinte quando a maior média era 100) e a 110%
   (folga de +10). Confere a regra da prancha e o gráfico "ao longo do tempo". */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

/* prancha: a função de teto, com o tipo da variável */
const pr = fs.readFileSync('prancha.html', 'utf8');
const ini = pr.indexOf('const LIM_VAR'), fim = pr.indexOf('\n}', pr.indexOf('function tetoEixo')) + 2;
function teto(tipo, eixo) {
  const c = { ESTUDO: { variavel: { tipo } }, estado: { fig: { eixo: eixo || 'auto' } } };
  vm.createContext(c); vm.runInContext(pr.slice(ini, fim) + ';this.tetoEixo=tetoEixo;', c); return c.tetoEixo;
}
let T = teto('pct');
ok(T(100, 5) === 100, 'maior média 100 → eixo 100, não 105');
ok(T(100, 10) === 100, 'curva de severidade: 100, não 110');
ok(T(97.3, 5) === 100 && T(92, 10) === 100, 'arredonda para cima até o passo, sem passar de 100');
ok(T(43, 5) === 45 && T(40, 5) === 40, 'abaixo de 100: próximo múltiplo (40 fica 40)');
ok(T(0, 5) === 5, 'tudo zero: eixo mínimo, sem divisão por zero');
ok(teto('escala')(100, 5) === 100, 'índice de escala também para em 100');
T = teto('numero');
ok(T(132, 5) === 135, 'medida livre (número) não é limitada a 100');
ok(teto('contagem')(100, 5) === 100 && teto('contagem')(101, 5) === 105, 'contagem segue o dado');
ok(teto('numero')(120, 5, true) === 100, 'eficácia (Abbott) é sempre % e para em 100');
ok(teto('numero', '100')(300, 5) === 100, 'opção "fixo em 0–100%" continua valendo');
ok(!/Math\.floor\((maxV|maximo)\/5\)\+1/.test(pr) && !/\/10\)\*10 \+ 10/.test(pr), 'as contas antigas (múltiplo seguinte, +10) saíram');

/* app.js: _progressSvg com média 100 rotula o topo como 100 */
const src = fs.readFileSync('app.js', 'utf8');
function pega(nome) { const i = src.indexOf('function ' + nome + '('); let p = 0, j = i, a = false;
  for (; j < src.length; j++) { if (src[j] === '{') { p++; a = true; } else if (src[j] === '}' && --p === 0 && a) { j++; break; } } return src.slice(i, j); }
const c = { esc: s => String(s), _chartPal: () => '#000', AV_TIPOS: { pct: 1, escala: 1, numero: 1 }, Math, Date };
vm.createContext(c);
vm.runInContext(pega('_avTipo') + ';' + pega('_progressSvg') + ';this._progressSvg=_progressSvg;this._avTipo=_avTipo;', c);
c._avMeans = (st, a) => a._m;
const avs = [{ data: '2026-03-01', tipos: {}, _m: { T1: { Sev: 40 } } }, { data: '2026-03-15', tipos: {}, _m: { T1: { Sev: 100 } } }];
let svg = c._progressSvg({}, 'Sev', avs, 'T1', [{ id: 'T1' }]);
ok(/>100<\/text>/.test(svg) && !/>10[5-9]<\/text>/.test(svg), 'ao longo do tempo: topo 100');
avs[1]._m.T1.Sev = 97; svg = c._progressSvg({}, 'Sev', avs, 'T1', [{ id: 'T1' }]);
ok(/>100<\/text>/.test(svg), '97% → eixo 100');
console.log('teto dos eixos: ' + n + ' verificações OK.');
