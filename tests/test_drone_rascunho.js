/* Drone: o rascunho sobrevive a recarregar, a medida de outro dia não, e o
   perfil aprendido traz configuração e nunca leitura. */
const assert=require('assert/strict'), fs=require('fs');
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'('); assert.ok(i>=0,nome);
  let d=0,viu=false,j=i;
  for(;j<src.length;j++){ if(src[j]==='{'){d++;viu=true;} else if(src[j]==='}'&&--d===0&&viu){j++;break;} }
  return src.slice(i,j);
}
let n=0; const ok=(c,m)=>{assert.ok(c,m);n++;}, eq=(a,b,m)=>{assert.deepEqual(a,b,m);n++;};
function nova(){
  const w=new JSDOM('',{url:'https://agracta.test',runScripts:'outside-only'}).window;
  return w;
}
/* Um "aparelho": o localStorage é compartilhado entre janelas da mesma origem no jsdom?
   Não — então a persistência é simulada copiando o armazenamento entre janelas. */
function montar(store,dia){
  const w=nova();
  Object.keys(store).forEach(k=>w.localStorage.setItem(k,store[k]));
  let computes=0;
  Object.assign(w,{_calcSel:{qid:'Q1',sid:'s1'},_calcCompute:()=>{computes++;},todayISO:()=>dia,
    esc:v=>String(v??''),data:{__config:{}},PERFIL_EQUIP_KEY:'agracta-perfil-equip-v1',
    tratMetodo:(s,q,t)=>t.metodo,_stxToast:()=>{}});
  w.eval('var PERFIL_EQUIP_KEY="agracta-perfil-equip-v1";'+['_perfisEquip','_perfisEquipGuardar','perfilEquipDe','perfilEquipGravarDrone'].map(pega).join('\n'));
  w.eval(fs.readFileSync('calculadora-drone.js','utf8'));
  w._dump=()=>{ const o={}; for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);o[k]=w.localStorage.getItem(k);} return o; };
  return w;
}
const study={id:'s1',tratamentos:[{id:'T1',metodo:'drone'}]};

/* 1. digita, "recarrega" no mesmo dia: tudo volta */
let w=montar({},'2026-09-22');
const voo={minimumOperatingMl:'1700',tankCapacity:'20',speed:'20,2',width:'11',height:'3',minFlow:'1,111',maxFlow:'16',observedFlow:'1,11',swathConfirmed:true};
Object.entries(voo).forEach(([k,v])=>w.calcDroneSet(k,v));
let store=w._dump();
w=montar(store,'2026-09-22');
eq(w.calcDroneConfig().speed,'20,2','velocidade volta depois de recarregar');
eq(w.calcDroneConfig().observedFlow,'1,11','medida de hoje volta hoje');
eq(w.calcDroneConfig().swathConfirmed,true);

/* 2. no dia seguinte: configuração volta, medida não */
w=montar(store,'2026-09-23');
eq(w.calcDroneConfig().width,'11','faixa configurada volta');
eq(w.calcDroneConfig().observedFlow,undefined,'vazão medida ontem não reaparece');
eq(w.calcDroneConfig().swathConfirmed,undefined,'faixa validada ontem não reaparece');

/* 3. outro estudo começa vazio */
w=montar(store,'2026-09-22'); w._calcSel={qid:'Q1',sid:'s2'};
eq(w.calcDroneConfig().speed,undefined,'rascunho é por estudo');

/* 4. perfil: só aprende de preparo conferido */
w=montar(store,'2026-09-22');
eq(w.calcDroneAprender({tratamentos:[{drone:{},aplicacaoConferida:false}]}),null,'não conferido não ensina');
const p=w.calcDroneAprender({tratamentos:[{drone:{},aplicacaoConferida:true}]});
ok(p && p.speed==='20,2' && p.width==='11','configuração aprendida');
ok(!('observedFlow' in p) && !('swathConfirmed' in p),'leitura nunca vira perfil');
ok(w.data.__config.perfisEquip.drone.speed==='20,2','perfil vai para a configuração sincronizada');

/* 5. oferta no estudo novo, e usar traz só configuração */
store=w._dump();
w=montar(store,'2026-09-25'); w._calcSel={qid:'Q2',sid:'s9'};
ok(/usar esta configuração/.test(w.calcDroneHtml(study)),'oferta aparece com a calculadora vazia');
w.calcDronePerfilUsar();
eq(w.calcDroneConfig().speed,'20,2'); eq(w.calcDroneConfig().swathConfirmed,false,'faixa nunca vem validada');
eq(w.calcDroneConfig().observedFlow,undefined,'vazão nunca vem preenchida');
ok(!/usar esta configuração/.test(w.calcDroneHtml(study)),'oferta some depois de usada');

/* 6. perfil vindo de outro aparelho (só na nuvem) também vale */
w=montar({},'2026-09-25'); w.data.__config.perfisEquip={drone:{speed:'18',em:5}};
eq(w.perfilEquipDe('drone').speed,'18','perfil sincronizado é lido');
console.log('Drone rascunho e perfil: '+n+' verificações.');
