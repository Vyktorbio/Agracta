/* Campo inteligente — vendor/campo-inteligente-core.js + campo-inteligente.js
 *
 * O QUE ESTE TESTE PROTEGE
 *   [1] clima sozinho: só pede o que falta, no momento certo, e nunca na bancada;
 *   [2] nota estranha: acusa digitação (inclusive vírgula), cala quando não há
 *       base e quando a parcela só é um pouco diferente;
 *   [3] agenda: previstas vazias acompanham a 1ª aplicação real, uma vez só;
 *       o gerador do app respeita o deslocamento; BBCH prevê a próxima aplicação
 *       e diz de onde veio o número;
 *   [4] ligação: o módulo envolve as funções certas e o app carrega os arquivos.
 *
 * Rodar: node test_campo_inteligente.js
 */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const C=require('./vendor/campo-inteligente-core.js');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok    '+m);};
const utc=(iso,h)=>Date.UTC(+iso.slice(0,4),+iso.slice(5,7)-1,+iso.slice(8,10),h||0);

console.log('\n[1] clima sozinho');
const notas={T1R1:{sev:'10'}};
const st={aplicacoes:[{id:'A1',data:'2026-09-20',hora:'08:00'},{id:'A2',data:'2026-09-25'},{id:'A3',data:'2026-09-10',hora:'07:00',pos:{completa:true}}],
  avaliacoes:[{id:'V1',data:'2026-09-24',notas},{id:'V2',data:'2026-09-24',notas:{}},{id:'V3',data:'2026-09-30',notas},{id:'V4',data:'2026-09-23',notas,janela:{}}]};
let p=C.pendentesClima(st,utc('2026-09-26',12),{});
ok(p.some(x=>x.tipo==='pos'&&x.id==='A1'&&!x.forcar),'aplicação que ainda não leu a chuva entra');
ok(!p.some(x=>x.id==='A3'),'aplicação que já leu (janela fechada) não entra');
ok(p.some(x=>x.id==='A2'),'aplicação sem hora entra depois do fim do dia dela');
ok(!C.pendentesClima(st,utc('2026-09-25',20),{}).some(x=>x.id==='A2'),'…e não antes');
ok(p.some(x=>x.tipo==='janela'&&x.id==='V1'),'avaliação feita sem ambiente entra');
ok(!p.some(x=>x.id==='V2'),'avaliação vazia não entra');
ok(!p.some(x=>x.id==='V3'),'avaliação futura não entra');
ok(!p.some(x=>x.id==='V4'),'avaliação que já leu não entra');
const aberta={aplicacoes:[{id:'A',data:'2026-09-20',hora:'08:00',pos:{completa:false}}]};
ok(!C.pendentesClima(aberta,utc('2026-09-21',12),{}).length,'janela aberta que ainda não fechou: espera');
ok(C.pendentesClima(aberta,utc('2026-09-23',12),{})[0].forcar===true,'janela fechou: relê para completar');
ok(!C.pendentesClima(st,utc('2026-09-26',12),{lab:true}).length,'bancada: nada');
ok(C.lavagem({chuvaMm:12,choveu:true,primeiraChuvaHoras:3})&&!C.lavagem({chuvaMm:12,choveu:true,primeiraChuvaHoras:20}),'lavagem = chuva nas primeiras 6 h');
const glue=fs.readFileSync('campo-inteligente.js','utf8');
ok(/consultarPos\(/.test(glue)&&/consultarJanela\(/.test(glue),'usa as consultas que o app já tinha (grava e guarda histórico do mesmo jeito)');

console.log('\n[2] nota estranha na hora');
const g=(vals)=>vals.flatMap((reps,t)=>reps.map((v,r)=>({key:'T'+(t+1)+'R'+(r+1),trat:'T'+(t+1),valor:v})));
let grade=g([[20,22,18,80],[50,55,48,52],[5,7,6,4]]);
let a=C.notaAlerta(grade,'T1R4','pct');
ok(a&&/entre 18 e 22/.test(a.texto)&&/Confira/.test(a.texto),'80% com as outras em 18–22 avisa, dizendo a faixa');
ok(!C.notaAlerta(grade,'T1R2','pct'),'valor dentro do grupo não avisa');
ok(!C.notaAlerta(g([[20,22,18,30],[50,55,48,52],[5,7,6,4]]),'T1R4','pct'),'um pouco diferente (30 vs 18–22) não avisa');
a=C.notaAlerta(g([[12,14,13,130],[40,42,39,41]]),'T1R4','contagem');
ok(a&&a.virgula&&/vírgula/.test(a.texto),'130 com as outras em 12–14: aponta a vírgula');
ok(!C.notaAlerta(g([[20,80],[50,52]]),'T1R2','pct'),'só uma outra repetição: silêncio (sem base)');
ok(!C.notaAlerta(g([[20,22,18,'']]),'T1R4','pct'),'célula vazia: nada');
ok(!C.notaAlerta(g([[0,0,0,10],[0,0,0,0]]),'T1R4','pct'),'testemunha zerada e 10%: abaixo do piso, não avisa');
ok(/avValidateCell/.test(glue)&&/avAutoStep/.test(glue)&&/renderAvGrid/.test(glue),'avisa ao sair da célula, no lançamento rápido e marca na grade');

console.log('\n[3] agenda que acompanha o campo');
const est=()=>({dataInicio:'2026-09-01',avalInicio:'2026-09-08',avalIntervalo:7,avalNum:3,
  aplicacoes:[{id:'A1',data:'2026-09-04'}],
  avaliacoes:[{id:'auto_2026-09-08',data:'2026-09-08',auto:true,notas:{}},
              {id:'auto_2026-09-15',data:'2026-09-15',auto:true,notas:{}},
              {id:'auto_2026-09-22',data:'2026-09-22',auto:true,notas:{T1R1:{x:'3'}},variaveis:['x']}]});
let r=C.reancorar(est(),'2026-09-05');
ok(r&&r.delta===3,'aplicação 3 dias depois do previsto');
ok(r.itens.map(x=>x.de+'>'+x.para).join()==='2026-09-08>2026-09-11,2026-09-15>2026-09-18','move só as previstas VAZIAS, +3 dias');
ok(/3 dias depois do previsto/.test(r.texto),'a frase diz o porquê');
const e2=est();e2.avalDeslocamento=3;e2.avaliacoes[0].data='2026-09-11';e2.avaliacoes[1].data='2026-09-18';
ok(C.reancorar(e2,'2026-09-05')===null,'depois de ajustar, não pede de novo');
ok(C.reancorar(Object.assign(est(),{aplicacoes:[{id:'A',data:'2026-09-01'}]}),'2026-09-05')===null,'aplicação no dia previsto: nada');
ok(C.reancorar(Object.assign(est(),{aplicacoes:[]}),'2026-09-05')===null,'sem aplicação registrada: nada');
ok(C.reancorar(Object.assign(est(),{avalMomentos:'2, 12, 24'}),'2026-09-05')===null,'bancada por momentos: outra regra, não mexe');
/* o gerador do app respeita o deslocamento (senão salvar o estudo recriaria as datas antigas) */
const src=fs.readFileSync('app.js','utf8');
function pega(nome){ const i=src.indexOf('function '+nome+'('); let j=src.indexOf('{',i),d=0; for(;j<src.length;j++){ if(src[j]==='{')d++; else if(src[j]==='}'){ d--; if(!d) break; } } return src.slice(i,j+1); }
const ctx={};vm.createContext(ctx);
vm.runInContext(pega('_isoShift')+pega('_parseMomentos')+pega('_gerarAvalMomentos')+pega('gerarAvaliacoesAuto'),ctx);
const e3=est();e3.avaliacoes=[];e3.avalDeslocamento=3;
ctx.gerarAvaliacoesAuto(e3);
ok(e3.avaliacoes.map(x=>x.data).join()==='2026-09-11,2026-09-18,2026-09-25','gerador do app cria as previstas já deslocadas');
const e5=est();e5.avaliacoes=[{id:'V1',data:'2026-09-08',variaveis:['x'],notas:{T1R1:{x:'1'}}}];e5.avalDeslocamento=3;ctx.gerarAvaliacoesAuto(e5);
ok(e5.avaliacoes.map(x=>x.data).join()==='2026-09-08,2026-09-18,2026-09-25','avaliação já feita na data original cobre o horário: não nasce uma extra');
const e4=est();e4.avaliacoes=[];ctx.gerarAvaliacoesAuto(e4);
ok(e4.avaliacoes.map(x=>x.data).join()==='2026-09-08,2026-09-15,2026-09-22','sem deslocamento: exatamente como era');
/* BBCH */
const fen={dataInicio:'2026-09-01',numAplicacoes:2,intervaloDias:14,janela:{bbchMin:51,bbchMax:59},
  aplicacoes:[{id:'A1',data:'2026-09-01',bbch:'40'}],avaliacoes:[{id:'V1',data:'2026-09-06',bbch:'45'},{id:'V2',data:'2026-09-11',bbch:'50'}]};
let b=C.previsaoBBCH(fen,'2026-09-12');
ok(Math.abs(b.porDia-1)<1e-9,'ritmo observado: 1 estádio/dia');
ok(b.proxima&&b.proxima.data==='2026-09-15'&&Math.round(b.proxima.bbch)===54,'a aplicação 2 (01/09 + 14 dias) cai perto de BBCH 54');
ok(!b.alerta&&/ritmo observado neste estudo/.test(b.texto),'dentro da janela, e a frase diz de onde veio o número');
fen.intervaloDias=21;b=C.previsaoBBCH(fen,'2026-09-12');
ok(b.alerta==='depois'&&/acima do máximo 59/.test(b.texto)&&/20\/09/.test(b.texto),'21 dias depois passa do máximo: avisa e diz quando o máximo chega (20/09)');
ok(C.previsaoBBCH({aplicacoes:[{data:'2026-09-01',bbch:'40'}]},'2026-09-05')===null,'um BBCH só: silêncio');
ok(C.previsaoBBCH({aplicacoes:[{data:'2026-09-01',bbch:'50'}],avaliacoes:[{data:'2026-09-10',bbch:'40'}]},'2026-09-12')===null,'BBCH recuando: não inventa ritmo');

console.log('\n[4] ligação');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
ok(html.indexOf('vendor/campo-inteligente-core.js')<html.indexOf('campo-inteligente.js?v')&&html.indexOf('app.js?v=')<html.indexOf('vendor/campo-inteligente-core.js'),'carrega depois do app, motor antes da ligação');
ok(/campo-inteligente-core\.js\?v=1/.test(sw)&&/'\.\/campo-inteligente\.js\?v=1'/.test(sw),'os dois vão no pré-cache (abre offline no campo)');
ok(/logStudyAuditInObject\(s,'Agenda reancorada/.test(glue)&&/_markDeleted\(s,'_deletedAvaliacoes'/.test(glue),'ajuste da agenda fica na trilha e não ressuscita no merge');
ok(/confirm\(/.test(glue),'ajuste da agenda só com confirmação');

console.log('\nCampo inteligente: '+n+' verificações.');
