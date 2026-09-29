/* Unidade de dose POR TRATAMENTO
 *
 * "Quero poder colocar unidades diferentes no mesmo protocolo, como mg/ha, g/ha
 * e litros por hectare no mesmo." (29/09)
 *
 * A unidade mora no TEXTO da dose ("500 mg/ha"), que é o que toda conta e todo
 * rótulo já leem primeiro (doseUnidadeDe: o escrito na dose manda sobre o que o
 * estudo declarou). O seletor ao lado da dose só escreve ali. Este teste tranca:
 *   [1] o que o seletor reconhece e o que ele se recusa a reescrever (mistura);
 *   [2] na tela: trocar a unidade reescreve a dose; escolher antes de digitar
 *       também vale; digitar a unidade move o seletor;
 *   [3] um protocolo com T1 em mg/ha, T2 em g/ha e T3 em L/ha: cada tratamento
 *       é lido e calculado na SUA unidade, nunca na do estudo;
 *   [4] a faixa da bula é comparada na mesma unidade.
 *
 * Rodar: node test_unidade_por_tratamento.js
 */
var fs=require('fs'),vm=require('vm');
var JSDOM; try{ JSDOM=require('jsdom').JSDOM; }catch(e){ console.log('PULADO: jsdom ausente'); process.exit(0); }
var src=fs.readFileSync(__dirname+'/app.js','utf8');
function recorta(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei '+nome);
  var d=0,visto=false;
  for(var j=i;j<src.length;j++){ if(src[j]==='{'){d++;visto=true;} else if(src[j]==='}'&&--d===0&&visto) return src.slice(i,j+1); }
}
var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }

/* 'dangerously': os onchange="..." escritos no HTML precisam rodar, como no app */
var dom=new JSDOM('<!doctype html><html><body><div id="seTratList"></div></body></html>',{runScripts:'dangerously'});
var w=dom.window;
w.eval(fs.readFileSync(__dirname+'/vendor/biocalc-campo-core.js','utf8'));
w.eval(fs.readFileSync(__dirname+'/vendor/dose-core.js','utf8'));
['esc','_calcNum','_calcDoseUnit','doseUnidades','doseUnidadeDeclarada','doseSemUnidade','doseUnidadePendente','doseUnidadeDe','doseTextoDe',
 '_seTratUnidadeAtual','_seTratDoseComUnidade','_seTratUnidadeSelect','seTratUnidade','seTratDoseDigitada','syncTratInputs','tratDoseForaDaBula']
  .forEach(function(n){ w.eval(recorta(n)); });
ck(!!w.BioCalculoCampo && !!w.DoseCore,'motores de campo e de dose carregados');

console.log('\n[1] o que o seletor reconhece');
eq(w._seTratUnidadeAtual('500'),'','número solto: vale a unidade do estudo');
eq(w._seTratUnidadeAtual('500 mg/ha'),'mg/ha','"500 mg/ha" é mg/ha');
eq(w._seTratUnidadeAtual('200 g/ha'),'g/ha','"200 g/ha" é g/ha');
eq(w._seTratUnidadeAtual('1,5 L/ha'),'L/ha','"1,5 L/ha" é L/ha');
eq(w._seTratUnidadeAtual('0,5 kg/ha'),'kg/ha','"0,5 kg/ha" é kg/ha');
eq(w._seTratUnidadeAtual('1,5 + 0,2%'),null,'mistura com adjuvante: a unidade é de cada parte');
eq(w._seTratUnidadeAtual('1,5 + 2'),null,'mistura só de números também não é UMA dose');
eq(w._seTratUnidadeAtual('0,2%'),null,'% da calda não é dose por área');
eq(w._seTratUnidadeAtual('500 µg/ha'),null,'unidade que o motor não conhece não vira L/ha escondido');
eq(w._seTratDoseComUnidade('500','mg/ha'),'500 mg/ha','escolher mg/ha escreve "500 mg/ha"');
eq(w._seTratDoseComUnidade('500 g/ha','mg/ha'),'500 mg/ha','trocar g/ha por mg/ha troca só a unidade');
eq(w._seTratDoseComUnidade('1.500 g/ha','kg/ha'),'1.500 kg/ha','o número fica como foi escrito');
eq(w._seTratDoseComUnidade('500 mg/ha',''),'500','"unidade do estudo" volta ao número solto');
eq(w._seTratDoseComUnidade('1,5 + 2','g/ha'),'1,5 + 2','mistura NUNCA é reescrita (perderia o "+ 2")');
eq(w._seTratDoseComUnidade('','g/ha'),'','sem número ainda, não inventa dose');

console.log('\n[2] na tela');
var estudo={doseUnidade:'L/ha',doseModo:'campo',tratamentos:[{id:'T1',produto:'A',dose:'500'}]};
w.workingStudy=estudo;
var lista=w.document.getElementById('seTratList');
function linha(t){
  lista.innerHTML='<div class="se-trat" data-idx="0"><input type="text" data-f="dose" value="'+w.esc(t.dose)+'" onchange="seTratDoseDigitada(this)">'+
    w._seTratUnidadeSelect(0,t,estudo)+'<input type="text" data-f="volume" value=""></div>';
  return {dose:lista.querySelector('[data-f="dose"]'), sel:lista.querySelector('select[data-f="__doseUnid"]')};
}
var L=linha(estudo.tratamentos[0]);
var opcoes=Array.prototype.map.call(L.sel.options,function(o){ return o.value; });
ck(opcoes.join()===',L/ha,mL/ha,g/ha,kg/ha,mg/ha','o seletor tem mg/ha, g/ha, L/ha... e a do estudo');
eq(L.sel.options[0].textContent,'estudo (L/ha)','a primeira opção diz qual é a do estudo');
eq(L.sel.value,'','número solto começa na do estudo');
L.sel.value='mg/ha'; L.sel.dispatchEvent(new w.Event('change'));
eq(L.dose.value,'500 mg/ha','trocar para mg/ha reescreve a dose na hora');
eq(estudo.tratamentos[0].dose,'500 mg/ha','e o tratamento guarda "500 mg/ha"');
ck(!('__doseUnid' in estudo.tratamentos[0]),'o seletor não vira campo solto no tratamento');
L.sel.value=''; L.sel.dispatchEvent(new w.Event('change'));
eq(estudo.tratamentos[0].dose,'500','voltar para a do estudo tira a unidade do texto');
/* escolher a unidade antes de digitar a dose */
estudo.tratamentos[0].dose=''; L=linha(estudo.tratamentos[0]);
L.sel.value='g/ha'; L.sel.dispatchEvent(new w.Event('change'));
eq(L.dose.value,'','sem número, nada é inventado');
L.dose.value='200'; L.dose.dispatchEvent(new w.Event('change'));
eq(estudo.tratamentos[0].dose,'200 g/ha','a unidade escolhida antes entra quando a dose é digitada');
/* digitar a unidade move o seletor */
L.dose.value='0,5 kg/ha'; L.dose.dispatchEvent(new w.Event('change'));
eq(L.sel.value,'kg/ha','digitar "0,5 kg/ha" move o seletor para kg/ha');
L.dose.value='1,5 + 0,2%'; L.dose.dispatchEvent(new w.Event('change'));
ck(L.sel.disabled,'mistura desliga o seletor (a unidade vai em cada parte)');
L.dose.value='3'; L.dose.dispatchEvent(new w.Event('change'));
ck(!L.sel.disabled && L.sel.value==='','voltou a ser uma dose só: o seletor volta');

console.log('\n[3] T1 em mg/ha, T2 em g/ha e T3 em L/ha no mesmo protocolo');
var BC=w.BioCalculoCampo;
var P={doseUnidade:'L/ha',doseModo:'campo',tratamentos:[
  {id:'T1',produto:'Produto A',dose:'500 mg/ha'},
  {id:'T2',produto:'Produto B',dose:'200 g/ha'},
  {id:'T3',produto:'Produto C',dose:'1,5 L/ha'},
  {id:'T4',produto:'Produto D',dose:'2'}]};
eq(P.tratamentos.map(function(t){ return w.doseUnidadeDe(P,t.dose); }).join(' | '),'mg/ha | g/ha | L/ha | L/ha','cada tratamento na sua unidade; o número solto (T4) na do estudo');
eq(P.tratamentos.map(function(t){ return w.doseTextoDe(P,t.dose); }).join(' | '),'500 mg/ha | 200 g/ha | 1,5 L/ha | 2 L/ha','o rótulo impresso de cada um');
ck(!w.doseUnidadePendente(P),'nada fica pendente de unidade');
var base={sprayVolume:200,plotLength:5,plotWidth:3,numPlots:4,numBottles:1,deadVolumeMl:0};
var r=P.tratamentos.map(function(t){
  var m=BC.parseComponents(t.produto,t.dose,P.doseUnidade);
  return {problemas:m.problems.length,unidade:m.components[0]&&m.components[0].unidade,
    calc:BC.calculateMixture(Object.assign({components:m.components},base))};
});
ck(r.every(function(x){ return x.problemas===0; }),'a calculadora lê os quatro sem problema');
eq(r.map(function(x){ return x.unidade; }).join(' | '),'mg/ha | g/ha | L/ha | L/ha','e cada um na SUA unidade — a do estudo (L/ha) não engole mg/ha nem g/ha');
/* 4 parcelas de 15 m² = 0,006 ha:
     T1 500 mg/ha → 3 mg = 0,003 g; T2 200 g/ha → 1,2 g; T3 1,5 L/ha → 9 mL */
function perto(a,b){ return a!=null && Math.abs(a-b)<1e-9; }
ck(perto(r[0].calc.components[0].total,0.003),'T1: 500 mg/ha em 4 parcelas = 0,003 g');
ck(perto(r[1].calc.components[0].total,1.2),'T2: 200 g/ha em 4 parcelas = 1,2 g');
ck(perto(r[2].calc.components[0].total,9),'T3: 1,5 L/ha em 4 parcelas = 9 mL');

console.log('\n[4] a bula é comparada na mesma unidade');
var T={id:'T5',dose:'500 mL/ha',doseRef:{origem:'bula',valor:0.5,valorMax:0.8,unidade:'L/ha'}};
eq(w.tratDoseForaDaBula(T,P),false,'500 mL/ha está dentro de 0,5–0,8 L/ha');
T.dose='900 mL/ha'; eq(w.tratDoseForaDaBula(T,P),true,'900 mL/ha está fora');
T.dose='0,6 L/ha'; eq(w.tratDoseForaDaBula(T,P),false,'0,6 L/ha dentro');
T.dose='0,6 mL/ha'; eq(w.tratDoseForaDaBula(T,P),true,'0,6 mL/ha (mil vezes menos) é acusada');
T.dose='600'; eq(w.tratDoseForaDaBula(T,{doseUnidade:'mL/ha'}),false,'número solto num estudo em mL/ha: 600 mL/ha, dentro');

console.log('\n'+(f?f+' FALHA(S) em '+(p+f)+' verificações.':(p+' verificações, nenhuma falha.')));
process.exit(f?1:0);
