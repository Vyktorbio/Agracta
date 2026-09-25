/* ASSINATURA ELETRÔNICA POR SHA-256 (no lugar da rubrica desenhada)
 *
 * A assinatura é o SHA-256 do conteúdo assinado + quem, quando e o significado.
 * Mudou o dado depois de assinado? A conferência acusa. Mexeram em quem/quando?
 * Também acusa. Rodar: node test_assinatura.js
 */
'use strict';
const assert=require('node:assert/strict'),crypto=require('crypto'),fs=require('fs');
const A=require('./vendor/assinatura-core.js'),E=require('./vendor/eventos-core.js');

/* O SHA-256 é o de verdade: confere com o do Node. */
assert.equal(E.sha256('abc'),crypto.createHash('sha256').update('abc').digest('hex'));

const av={id:'AV1',data:'2026-09-24',variaveis:['Sev'],tipos:{},notas:{T1R1:{Sev:'12'},T2R1:{Sev:'30'}},carimbo:{},_ts:1};
const quem={por:'ana@x',nome:'Machado, A.',significado:'Conferido e assinado',em:'2026-09-25T10:00:00.000Z'};
const s=A.assinar('avaliacao',A.conteudoAvaliacao(av),quem);
assert.equal(s.alg,'SHA-256');assert.match(s.hash,/^[0-9a-f]{64}$/);assert.match(s.conteudoHash,/^[0-9a-f]{64}$/);
assert.equal(A.rubricaDe(s),'sha256:'+s.hash);assert(A.ehEletronica(A.rubricaDe(s)));assert(!A.ehEletronica('data:image/png;base64,AAA'));
assert.equal(A.curto(s.hash),s.hash.slice(0,16).replace(/(.{4})(?=.)/g,'$1 '));

/* Determinística: mesma entrada, mesmo hash; ordem das chaves não importa. */
const av2={_ts:9,carimbo:{rubrica:'x'},notas:{T2R1:{Sev:'30'},T1R1:{Sev:'12'}},tipos:{},variaveis:['Sev'],data:'2026-09-24',id:'AV1'};
assert.equal(A.assinar('avaliacao',A.conteudoAvaliacao(av2),quem).hash,s.hash,'carimbo, _ts e ordem não mudam o hash');

/* Confere enquanto nada muda. */
assert.deepEqual(A.conferir(s,A.conteudoAvaliacao(av)),{ok:true,motivo:null});
/* Nota alterada depois de assinada. */
const mexida=JSON.parse(JSON.stringify(av));mexida.notas.T1R1.Sev='13';
assert.equal(A.conferir(s,A.conteudoAvaliacao(mexida)).motivo,'conteudo');
/* Troca de quem assinou ou de quando. */
assert.equal(A.conferir(Object.assign({},s,{nome:'Outra pessoa'}),A.conteudoAvaliacao(av)).motivo,'cabecalho');
assert.equal(A.conferir(Object.assign({},s,{em:'2026-09-26T10:00:00.000Z'}),A.conteudoAvaliacao(av)).motivo,'cabecalho');
assert.equal(A.conferir(null,{}).motivo,'invalida');

/* Finalização: cobre a estatística congelada e cada avaliação. */
const st={id:'S1',codigo:'E1',tratamentos:[{id:'T1'}],numRepeticoes:3,estatisticaFinal:{itens:[{p:0.01}]},avaliacoes:[av]};
const f=A.assinar('estudo.finalizacao',A.conteudoFinalizacao(st),quem);
assert(A.conferir(f,A.conteudoFinalizacao(st)).ok);
const st2=JSON.parse(JSON.stringify(st));st2.avaliacoes[0].notas.T2R1.Sev='31';
assert.equal(A.conferir(f,A.conteudoFinalizacao(st2)).motivo,'conteudo','nota mudada depois da finalização');
const st3=JSON.parse(JSON.stringify(st));st3.estatisticaFinal.itens[0].p=0.5;
assert.equal(A.conferir(f,A.conteudoFinalizacao(st3)).motivo,'conteudo','estatística congelada mexida');

/* Protocolo: cobre o retrato aprovado. */
const pv={versao:1,retrato:{tratamentos:[{id:'T1',dose:'1 L/ha'}]}};
const p=A.assinar('protocolo.aprovado',A.conteudoProtocolo(pv),quem);
assert(A.conferir(p,A.conteudoProtocolo(pv)).ok);
assert.equal(A.conferir(p,A.conteudoProtocolo({versao:1,retrato:{tratamentos:[{id:'T1',dose:'2 L/ha'}]}})).motivo,'conteudo');

/* No app: sem desenho, e os três pontos assinam por SHA-256. */
const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(!/rubricaCanvas|_rubricaCompacta/.test(app+html),'o desenho saiu');
assert(/assinatura-core\.js\?v=\d+/.test(html),'motor carregado');
for(const esc of ["'estudo.finalizacao'","'protocolo.aprovado'","'avaliacao'"])assert(app.includes('_assinaturaNova('+esc),'assina '+esc);
console.log('Assinatura SHA-256: hash real, determinística, acusa conteúdo e cabeçalho alterados; finalização, protocolo e avaliação assinam sem desenho OK.');
