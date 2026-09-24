'use strict';
/* eventos-app.js: a trilha de sempre roda primeiro e intacta; o evento sai ao
   lado, num armazenamento próprio; falha no evento nunca sobe; desligável. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

function memoria(inicial) {
  const m = new Map(Object.entries(inicial || {}));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)),
           removeItem: k => m.delete(k), _m: m };
}
/* Um "app" mínimo com as mesmas declarações globais que o app.js usa. */
const APP = `
var AGRACTA_TIME_ZONE='America/Sao_Paulo';
var data={ Q19:{ estudos:[{ id:'S1', codigo:'AGR-1', audit:[] }] }, __config:{} };
var _authUser={ email:'ana@x.com' };
var _avReopen=null;
function _currentUserName(){ return 'Ana'; }
function logStudyAuditInObject(study, action, details, extra){
  study.audit.push({ action:action, details:details, extra:extra||null });
  return 'retorno-original';
}`;
function carregar(opts) {
  opts = opts || {};
  const ctx = { console: { warn: () => { ctx._avisos++; } }, _avisos: 0, localStorage: opts.ls || memoria() };
  ctx.window = ctx; ctx.self = ctx;
  vm.createContext(ctx);
  vm.runInContext(APP, ctx);
  if (!opts.semMotores) {
    vm.runInContext(fs.readFileSync('vendor/observacao-core.js', 'utf8'), ctx);
    vm.runInContext(fs.readFileSync('vendor/eventos-core.js', 'utf8'), ctx);
  }
  vm.runInContext(fs.readFileSync('eventos-app.js', 'utf8'), ctx);
  return ctx;
}
/* As chamadas do app.js resolvem o nome global: simulamos assim. */
const chamar = (ctx, src) => vm.runInContext(src, ctx);

/* instalado */
let c = carregar();
ok(c.logStudyAuditInObject.__eventos === true, 'instalado sobre a função global');
let st = c.data.Q19.estudos[0];
st.finalizacao = { rubrica: 'data:image/png;base64,AAAA', nResultados: 3 };
ok(chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Finalização do Estudo','x',{rubrica:1})") === 'retorno-original', 'retorno é o do original');
ok(st.audit.length === 1 && st.audit[0].action === 'Finalização do Estudo', 'trilha de sempre gravada');
let reg = c.AgractaEventos.registro('Q19', 'S1');
ok(reg.length === 1 && reg[0].tipo === 'estudo.finalizado', 'evento formal ao lado');
ok(/^sha256:[0-9a-f]{64}$/.test(reg[0].rubrica), 'rubrica referida por hash, sem copiar a imagem');
ok(reg[0].autor.email === 'ana@x.com' && reg[0].autor.nome === 'Ana' && reg[0].fuso === 'America/Sao_Paulo', 'autor e fuso do app');
ok(/^disp-/.test(reg[0].dispositivo), 'dispositivo identificado');
ok(!JSON.stringify(c.data).includes('ev:'), 'nada gravado dentro de data');

/* reabertura: motivo vem do arquivo da finalização */
st.finalizacoesAnteriores = [{ motivo: 'nota trocada' }];
chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Reabertura do Estudo','Reaberto para edição. Motivo: \"nota trocada\".')");
reg = c.AgractaEventos.registro('Q19', 'S1');
ok(reg.length === 2 && reg[1].tipo === 'estudo.reaberto' && reg[1].motivo === 'nota trocada', 'reabertura com motivo');
ok(reg[1].pais[0] === reg[0].id, 'encadeado ao evento anterior');

/* emenda */
chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Emenda ao protocolo','Emenda 1 — versão 1 → 2: Repetições',{motivo:'área menor',emenda:1})");
reg = c.AgractaEventos.registro('Q19', 'S1');
ok(reg[2].tipo === 'protocolo.emendado' && reg[2].de.versao === 1 && reg[2].para.versao === 2, 'emenda com versões');

/* edição de avaliação assinada: uma correção por célula que mudou de fato */
chamar(c, `_avReopen={avid:'A1',motivo:'transcrição'};
  logStudyAuditInObject(data.Q19.estudos[0],'Edição de Avaliação','Notas',{motivo:'transcrição',
    mudancas:[{parcela:'T1R2',variavel:'Ninfas',de:'10',para:'12'},{parcela:'T2',variavel:'Ninfas',de:'3',para:''},
              {parcela:'T3R1',variavel:'Ninfas',de:'1,0',para:'1'}]});
  _avReopen=null;`);
reg = c.AgractaEventos.registro('Q19', 'S1');
const corr = reg.filter(e => e.tipo === 'observacao.corrigida');
ok(corr.length === 2, 'mudança só de formato (1,0 → 1) não vira correção');
ok(corr.some(e => e.de === 10 && e.para === 12), 'valores numéricos canônicos');
ok(corr.some(e => e.de === 3 && e.para === null), 'apagar vira para:null');
const O = c.ObservacaoCore;
ok(corr.some(e => O.partesDoId(e.entidade.id).parcela === 'T2R1'), 'chave antiga de parcela vira R1');
ok(corr.every(e => O.partesDoId(e.entidade.id).avaliacao === 'A1'), 'aponta para a avaliação reaberta');
ok(c.AgractaEventos.verificar('Q19', 'S1').ok, 'registro íntegro');

/* edição comum (sem reabertura) e outras ações: só trilha */
const antes = c.AgractaEventos.registro('Q19', 'S1').length;
chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Edição de Avaliação','x',{motivo:null,mudancas:[{parcela:'T1R1',variavel:'N',de:'1',para:'2'}]})");
chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Volume de calda confirmado','x')");
ok(c.AgractaEventos.registro('Q19', 'S1').length === antes, 'ação comum não gera evento');
ok(st.audit.length === 6, 'mas continua na trilha');

/* evento recusado: trilha grava, nada sobe, aviso no console */
c = carregar();
const av0 = c._avisos;
ok(chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Reabertura do Estudo','sem motivo nenhum')") === 'retorno-original', 'recusa não afeta o retorno');
ok(c.data.Q19.estudos[0].audit.length === 1 && c.AgractaEventos.registro('Q19', 'S1').length === 0 && c._avisos > av0, 'recusa vira aviso');

/* armazenamento quebrado: trilha segue */
const quebrado = memoria(); quebrado.setItem = () => { throw new Error('QuotaExceeded'); };
c = carregar({ ls: quebrado });
c.data.Q19.estudos[0].finalizacao = { rubrica: 'r' };
chamar(c, "logStudyAuditInObject(data.Q19.estudos[0],'Finalização do Estudo','x')");
ok(c.data.Q19.estudos[0].audit.length === 1, 'armazenamento cheio não impede a trilha');

/* desligado e sem motores: nada instalado */
c = carregar({ ls: memoria({ 'agracta-eventos-off': '1' }) });
ok(!c.logStudyAuditInObject.__eventos, 'desligável');
c = carregar({ semMotores: true });
ok(!c.logStudyAuditInObject.__eventos, 'sem motores, não instala');

/* instalar de novo não embrulha duas vezes */
c = carregar();
ok(c.AgractaEventos.instalar() === false, 'instalação idempotente');

console.log('eventos-app: ' + n + ' verificações OK.');
