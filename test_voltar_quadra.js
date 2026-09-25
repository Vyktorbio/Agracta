/* VOLTAR PARA A QUADRA NÃO PODE REABRIR O ESTUDO SOZINHO
 *
 * "Voltar" fecha a ficha do estudo mas mantém curSid. Dois repintares em
 * segundo plano reabriam a ficha quando terminavam: o resultado da estatística
 * (o indicador #bioAutoStatus continua no DOM da ficha fechada e contava como
 * "aberta") e a chegada das culturas do Agrofit. Só repintam com a ficha
 * realmente aberta.
 *
 * Rodar: node test_voltar_quadra.js
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const src=fs.readFileSync('app.js','utf8');
function pega(nome){const i=src.indexOf('function '+nome+'(');assert(i>=0,nome);let j=i,d=0,viu=false;for(;j<src.length;j++){if(src[j]==='{'){d++;viu=true;}else if(src[j]==='}'){d--;if(viu&&d===0){j++;break;}}}return src.slice(i,j);}
const dom=new JSDOM('<!doctype html><div id="sdOvl" class="sd-overlay"><div id="sdPnl"><div id="bioAutoStatus"></div></div></div>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.eval('var curV="Q1",curSid="S1",_bioRefreshT=null;'+pega('_estudoNaTela')+pega('_bioestatRefreshOpen'));
const abriu=[];w.openStudyDetail=(q,s)=>abriu.push(q+'/'+s);
const espera=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  /* Ficha fechada (voltou para a quadra), com o indicador ainda no DOM. */
  w._bioestatRefreshOpen({qid:'Q1',sid:'S1'});await espera(200);
  assert.equal(abriu.length,0,'ficha fechada: o resultado da estatística não reabre o estudo');
  /* Ficha aberta: repinta. */
  d.getElementById('sdOvl').classList.add('open');
  w._bioestatRefreshOpen({qid:'Q1',sid:'S1'});await espera(200);
  assert.deepEqual(abriu,['Q1/S1'],'ficha aberta: repinta com o resultado');
  /* Fechou durante o intervalo de 120 ms: não reabre. */
  w._bioestatRefreshOpen({qid:'Q1',sid:'S1'});d.getElementById('sdOvl').classList.remove('open');await espera(200);
  assert.equal(abriu.length,1,'fechou antes do repintar: não reabre');
  /* Resultado de outro estudo: não mexe na tela. */
  d.getElementById('sdOvl').classList.add('open');
  w._bioestatRefreshOpen({qid:'Q1',sid:'S2'});await espera(200);
  assert.equal(abriu.length,1,'resultado de outro estudo não repinta este');
  /* Culturas do Agrofit: o repintar passa pela mesma conferência. */
  const pv=pega('protocoloVerificaHtml');
  assert.match(pv,/_agrofitCultCarregar\(function\(\)\{\s*if\(_estudoNaTela\(/,'culturas do Agrofit só repintam com a ficha aberta');
  console.log('Voltar para a quadra: estatística e Agrofit não reabrem o estudo; com a ficha aberta, repintam OK.');
})().catch(e=>{console.error(e);process.exit(1);});
