/* A estatística guardada no aparelho não pode ser jogada fora por mudança de TELA.
 *
 * MOTOR_VERSAO fazia duas coisas: trocar a URL da engrenagem (para o navegador
 * buscar a casca nova) e entrar na assinatura do cache. Publicar telas novas
 * exigia a primeira, e a segunda vinha de carona: subir de agracta-12 para -13
 * -- que só acrescentou planejamento, equivalência e curva -- apagou a
 * estatística guardada de TODO aparelho. Quem abriu um estudo viu o painel sem
 * gráfico, esperando o Pyodide refazer o que já sabia.
 *
 * Este teste tranca a separação: a assinatura olha MOTOR_CALCULO, que só muda
 * quando o CÁLCULO muda.
 */
'use strict';
const assert = require('node:assert/strict'), fs = require('fs');
const src = fs.readFileSync('app.js', 'utf8');

function pega(nome){
  const i = src.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, 'falta a função ' + nome);
  let prof = 0, abriu = false, j = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') { prof++; abriu = true; }
    else if (src[j] === '}' && --prof === 0 && abriu) { j++; break; }
  }
  return src.slice(i, j);
}

/* Os dois números existem e são coisas diferentes. */
const verTela = src.match(/var MOTOR_VERSAO='([^']+)'/);
const verCalc = src.match(/var MOTOR_CALCULO='([^']+)'/);
assert.ok(verTela, 'falta MOTOR_VERSAO');
assert.ok(verCalc, 'falta MOTOR_CALCULO — sem ele a tela nova apaga o cálculo guardado');

/* A URL da engrenagem continua usando a versão da TELA: é ela que faz o
   navegador buscar a casca nova quando o motor muda de cara. */
assert.ok(src.includes("agracta_engine=1&v='+MOTOR_VERSAO"),
  'a engrenagem precisa continuar com MOTOR_VERSAO na URL, senão a casca nova não chega');

/* E a assinatura do cache usa a versão do CÁLCULO, não a da tela. */
const assinatura = pega('_bioestatSignature');
assert.ok(assinatura.includes('MOTOR_CALCULO'), 'a assinatura precisa usar MOTOR_CALCULO');
assert.ok(!assinatura.includes('MOTOR_VERSAO'),
  'a assinatura NÃO pode olhar MOTOR_VERSAO: mudar de tela apagaria a estatística guardada');
/* Gravação e leitura do cache no aparelho: o mesmo número dos dois lados. */
assert.ok(/os\.put\(\{[^}]*motor:MOTOR_CALCULO/.test(src), 'a gravação do cache precisa usar MOTOR_CALCULO');
assert.ok(src.includes('sav.motor===MOTOR_CALCULO'), 'a leitura do cache precisa usar MOTOR_CALCULO');

/* Comportamento, não só texto: a assinatura muda com o DADO e com o cálculo,
   e não muda quando só a tela do motor muda. */
function assinar(motorCalculo, estudo){
  const ctx = {MOTOR_CALCULO: motorCalculo, MOTOR_VERSAO: 'irrelevante-' + Math.random()};
  const fn = new Function('MOTOR_CALCULO', 'MOTOR_VERSAO', '_hashSeed',
    pega('_bioestatSignature') + '; return _bioestatSignature;')(
      ctx.MOTOR_CALCULO, ctx.MOTOR_VERSAO, s => {                 // hash simples e determinístico
        let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h;
      });
  return fn(estudo);
}
const estudo = {desenho:'dbc', numRepeticoes:4,
  tratamentos:[{id:'T1',produto:'A',dose:'1',testemunha:true},{id:'T2',produto:'B',dose:'2'}],
  avaliacoes:[{id:'A1',data:'2026-09-01',tipo:'severidade',variaveis:['Sev'],notas:{T1R1:10}}]};

const base = assinar('agracta-12', estudo);
assert.equal(base, assinar('agracta-12', estudo), 'a assinatura tem de ser estável');
/* Duas chamadas com MOTOR_VERSAO diferente (sorteado acima) deram a mesma
   assinatura -- é exatamente o ponto deste teste. */
assert.notEqual(base, assinar('agracta-13', estudo), 'mudar o CÁLCULO tem de invalidar');

const mexido = JSON.parse(JSON.stringify(estudo));
mexido.avaliacoes[0].notas.T1R1 = 99;
assert.notEqual(base, assinar('agracta-12', mexido), 'mudar a nota tem de invalidar');
const menosRep = JSON.parse(JSON.stringify(estudo));
menosRep.numRepeticoes = 3;
assert.notEqual(base, assinar('agracta-12', menosRep), 'mudar as repetições tem de invalidar');

console.log('Cache da estatística: tela e cálculo separados, assinatura estável, dado e cálculo ainda invalidam OK.');
