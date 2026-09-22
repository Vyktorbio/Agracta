/* Protocolo vivo (§6) — vendor/protocolo-vivo-core.js e a ligação no app. */
const assert=require('assert/strict'), fs=require('fs');
const PV=require('./vendor/protocolo-vivo-core.js');
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;}, eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++;};
const base=()=>({id:'S1',codigo:'SIN-01',cultura:'soja',numRepeticoes:4,numAplicacoes:2,intervaloDias:14,
  dataInicio:'2026-10-01',desenho:'dbc',randomizado:true,doseUnidade:'L/ha',
  tratamentos:[{id:'T1',produto:'Testemunha',dose:'',testemunha:true,_ts:1},{id:'T2',produto:'Sankari',dose:'1,5 L/ha',_ts:1}],
  volumeMorto:300,numFrascos:1,janela:{ventoMax:10}});

/* rascunho */
eq(PV.info(base()).aprovado,false,'sem aprovação é rascunho');
/* retrato ignora execução e campo técnico */
const a=base(), b=base(); b.volumeMorto=500; b.numFrascos=3; b.tratamentos[1]._ts=999;
eq(PV.diferencas(PV.retrato(a),PV.retrato(b)),[],'preparo e carimbo não são emenda');
/* diferenças legíveis */
const c=base(); c.numRepeticoes=5; c.tratamentos[1].dose='2 L/ha'; c.tratamentos.push({id:'T3',produto:'Sankari',dose:'3 L/ha'});
const d=PV.diferencas(PV.retrato(a),PV.retrato(c));
ok(d.some(x=>x.rotulo==='Repetições'&&x.de==='4'&&x.para==='5'),'repetições 4 → 5');
ok(d.some(x=>x.rotulo==='Tratamento T2 alterado'&&/1,5 L\/ha/.test(x.de)&&/2 L\/ha/.test(x.para)),'dose do T2');
ok(d.some(x=>x.rotulo==='Tratamento incluído'&&/T3/.test(x.para)),'T3 incluído');
const e=base(); e.tratamentos.pop();
ok(PV.diferencas(PV.retrato(a),PV.retrato(e)).some(x=>x.rotulo==='Tratamento removido'),'T2 removido');
const f=base(); f.tratamentos.reverse();
ok(PV.diferencas(PV.retrato(a),PV.retrato(f)).some(x=>x.rotulo==='Ordem dos tratamentos'),'ordem conta');
const j=base(); j.janela={ventoMax:8};
ok(PV.diferencas(PV.retrato(a),PV.retrato(j)).some(x=>x.campo==='janela'),'janela declarada é protocolo');

/* aprovação */
const s=base(); s.protocoloVivo=PV.aprovar(s,{em:'2026-10-01T10:00:00Z',por:'v@x',nome:'Machado, V. C.',rubrica:'data:x'});
eq(PV.info(s).versao,1); eq(PV.info(s).aprovado,true); eq(s.protocoloVivo.retrato.numRepeticoes,4);

/* emenda */
const antes=JSON.parse(JSON.stringify(s)); s.numRepeticoes=5;
assert.throws(()=>PV.emendar(antes,s,'  ',{}),/motivo/); n++;
eq(s.protocoloVivo.versao,1,'emenda recusada não muda versão');
const em=PV.emendar(antes,s,'Área maior liberada',{em:'2026-10-05T10:00:00Z',por:'v@x',nome:'V'});
eq([em.n,em.versaoDe,em.versaoPara],[1,1,2]); eq(PV.info(s).versao,2); eq(s.emendas.length,1);
eq(s.protocoloVivo.retrato.numRepeticoes,5,'retrato acompanha a versão');
eq(em.retratoAnterior.numRepeticoes,4,'a versão anterior fica guardada na emenda');
const antes2=JSON.parse(JSON.stringify(s)); s.volumeMorto=900;
eq(PV.emendar(antes2,s,'x',{}),null,'mudar só execução não gera emenda');
const rasc=base(), rasc2=base(); rasc2.numRepeticoes=6;
eq(PV.emendar(rasc,rasc2,'x',{}),null,'rascunho não tem emenda');

/* desvio */
assert.throws(()=>PV.desvio({descricao:' '}),/descrição/); n++;
const dv=PV.desvio({data:'2026-10-16',descricao:'2ª aplicação no dia 16',impacto:''},{por:'v@x',nome:'V'});
eq(dv.impacto,''); eq(dv.data,'2026-10-16'); ok(dv.id);

/* ligação no app */
const app=fs.readFileSync('app.js','utf8');
const save=app.slice(app.indexOf('function saveStudyV2'),app.indexOf('function closeStudyEditV2'));
ok(/ProtocoloVivoCore/.test(save)&&/Emenda ao protocolo/.test(save),'salvar passa pela emenda');
ok(/if\(_mot===null\) return;/.test(save),'cancelar a emenda não salva');
ok(save.indexOf('Emenda ao protocolo')<save.indexOf('q.estudos[idx]=s'),'emenda antes de gravar');
ok(/function aprovarProtocolo[\s\S]*requireDeletePassword[\s\S]*openRubrica/.test(app),'aprovar pede senha e rubrica');
ok(/function registrarDesvio[\s\S]*_bloqueadoPorFinalizacao/.test(app),'desvio respeita estudo finalizado');
ok(/protocoloVivoHtml\(qid,sid,study\)/.test(app),'seção na ficha do estudo');
const html=fs.readFileSync('index.html','utf8'), sw=fs.readFileSync('sw.js','utf8');
const tag=(html.match(/vendor\/protocolo-vivo-core\.js\?v=\d+/)||[])[0];
ok(tag && sw.indexOf('./'+tag)>=0,'motor carregado e pré-carregado com a mesma versão');
console.log('Protocolo vivo: '+n+' verificações — retrato, diferenças, aprovação, emenda, desvio e ligação.');
