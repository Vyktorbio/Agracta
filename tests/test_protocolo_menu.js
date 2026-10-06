'use strict';
/* Menu do Protocolo: diz o que falta, aponta testemunha marcada só num dos dois
   lugares (checkbox × papel) e resume sem gravar nada. */
const assert = require('node:assert/strict'), fs = require('fs'), vm = require('vm');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const ctx = { console, document: { getElementById: () => null, querySelectorAll: () => [], head: { appendChild() {} }, body: null } };
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(`function studyTestemunha(s){ var t=(s.tratamentos||[]).filter(function(x){return x.testemunha;})[0]; return t?t.id:((s.tratamentos||[])[0]||{}).id; }
function estudoFinalizado(){return false;}`, ctx);
vm.runInContext(fs.readFileSync('protocolo-menu.js', 'utf8'), ctx);
const M = ctx.AgProtocoloMenu;
const st = { id: 'S1', codigo: 'E1', numRepeticoes: 4, dataInicio: '2026-03-01', protocolo: { tamanhoParcela: '3 x 5' },
  tratamentos: [{ id: 'T1', produto: 'Test.', testemunha: true, papelControle: 'sem_intervencao' }, { id: 'T2', produto: 'A', dose: '1 L/ha' }] };
let dg = M.diagnostico('Q', st);
ok(!dg.falta.length && !dg.aviso.length, 'protocolo completo: nada a apontar');
st.tratamentos[1].papelControle = 'sem_intervencao';
ok(M.testemunhaConflitos(st).length === 1 && /T2 tem papel "Testemunha \(controle negativo\)"/.test(M.testemunhaConflitos(st)[0]), 'papel Testemunha sem a marca: apontado');
st.tratamentos[1].papelControle = 'positivo'; st.tratamentos[1].testemunha = true;
ok(M.testemunhaConflitos(st).length === 0, 'padrão marcado como check: regra única, não é conflito');
st.tratamentos[1].papelControle = 'experimental';
ok(/T2 está marcado como Testemunha, mas o papel diz "Experimental"/.test(M.testemunhaConflitos(st)[0]), 'marcado Testemunha com papel Experimental: apontado');
st.tratamentos[1].testemunha = false; st.tratamentos[1].papelControle = 'experimental';
st.tratamentos.push({ id: 'T3', produto: '' });
dg = M.diagnostico('Q', st);
ok(dg.falta.some(f => /produto/.test(f.txt) && f.etapa === 3) && dg.falta.some(f => /dose/.test(f.txt)), 'falta produto e dose: leva à etapa 3');
delete st.protocolo; delete st.dataInicio;
dg = M.diagnostico('Q', st);
ok(dg.aviso.some(f => /tamanho da parcela/.test(f.txt) && f.etapa === 1) && dg.aviso.some(f => /1ª aplicação/.test(f.txt) && f.etapa === 2), 'avisos com a etapa certa');
const r = M.resumo('Q', st);
ok(r.tratamentos[0].papel === 'Testemunha (controle negativo)' && r.parcelas === 12 && r.croqui === 'não posicionado', 'resumo: papéis, parcelas e croqui');
const antes = JSON.stringify(st);
M.html('Q', st);
ok(JSON.stringify(st) === antes, 'montar a tela não altera o estudo');
ok(/<script/.test(M.html('Q', Object.assign({}, st, { codigo: '<script>x</script>' }))) === false, 'texto do estudo escapado');
console.log('menu do protocolo: ' + n + ' verificações OK.');
