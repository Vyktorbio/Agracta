'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<body>',{runScripts:'outside-only'}),w=dom.window;
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.requestAnimationFrame=()=>0;
w.esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
w.data={Q:{estudos:[{id:'S',numRepeticoes:1,tratamentos:[{id:'T1',testemunha:true},{id:'T2',testemunha:true},{id:'T3'}],avaliacoes:[{id:'a',data:'2026-09-29',variaveis:['isca'],tipos:{isca:'pct'},notas:{T3R1:{isca:0}}},{id:'b',data:'2026-09-30',variaveis:[],notas:{}}]}]}};
w.AV_TIPO_LABEL={pct:'%',numero:'número',escala:'escala'};w.studyTestemunha=()=> 'T2';w.estudoFinalizado=()=>false;w._currentUserName=()=> 'Teste';w.logStudyAuditInObject=(s,a,d,extra)=>{s.audit=[{a,d,extra}];};let saves=0;w.save=()=>saves++;w.openStudyDetail=()=>{};
for(const file of ['vendor/protocolo-avaliacao-core.js','vendor/avaliacao-core.js','protocolo-avaliacoes.js'])w.eval(fs.readFileSync(file,'utf8'));
w.openProtocoloAvaliacoes('Q','S');const d=w.document.getElementById('paModal');d.querySelector('[data-trat="T1"]').checked=false;d.querySelector('[data-trat="T2"]').checked=false;d.querySelector('[data-role="T1"]').value='sem_alvo';d.querySelector('[data-role="T2"]').value='sem_intervencao';d.querySelector('[data-role="T3"]').value='positivo';d.querySelector('[data-av="a"]').checked=true;d.querySelector('#paMotivo').value='Sem pellets nos controles';
/* variável existente abre COM o cálculo de controle que já tinha; sem referência aplicável a tela avisa e não grava */
assert.equal(d.querySelector('[data-pa="calculoControle"]').value,'auto');
d.querySelector('[data-action="review"]').click();assert.ok(!d.querySelector('[data-action="save"]'));assert.match(d.querySelector('#paErro').textContent,/referência aplicável/);
d.querySelector('[data-pa="calculoControle"]').value='nenhum';
d.querySelector('[data-action="review"]').click();assert.ok(d.querySelector('[data-action="save"]'));assert.equal(saves,0);d.querySelector('[data-action="save"]').click();assert.equal(saves,1,d.querySelector('#paErro').textContent);
const s=w.data.Q.estudos[0];assert.equal(w.AvaliacaoCore.avaliacao(s,s.avaliacoes[0]).complete,true);assert.equal(w.AvaliacaoCore.avaliacao(s,s.avaliacoes[1]).complete,false,'unselected prior schedule stays pending');assert.equal(s.avaliacoes[0].notas.T1R1,undefined);assert.equal(s.tratamentos[2].papelControle,'positivo');assert.ok(s.audit[0].extra.antes);assert.equal(s.avaliacaoProtocolo.variaveis[0].cfg.naTratamentos.length,2);
console.log('UI protocolo: revisão sem gravação, escopo selecionado, notas preservadas, controle positivo e histórico OK');dom.window.close();
