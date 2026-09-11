/* A lista de Estudos do Conhecimento vira um lugar de trabalho: mostra a
 * situação de cada estudo e deixa finalizar, reabrir e excluir dali.
 *
 * O que este teste tranca não é a aparência, são duas promessas:
 *  1. a tela continua SÓ LENDO — nenhum botão daqui escreve no acervo;
 *  2. cada ação chama a MESMA função do Agracta que a ficha do estudo chama,
 *     com a senha, a rubrica e o motivo que ela já exige. Uma segunda porta
 *     de exclusão, sem trilha, seria pior do que não ter botão nenhum.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('fs');
/* Biblioteca ausente não é app quebrado — o portão só sabe pular quem se declara. */
let JSDOM; try{ ({JSDOM}=require('jsdom')); }
catch(e){ console.log('PULADO: jsdom não está instalado (npm install jsdom para rodar este teste).'); process.exit(0); }

(async function(){
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://agracta.test',runScripts:'outside-only'}),w=dom.window;
['vendor/dose-core.js','vendor/ativos-en-core.js','vendor/conhecimento-core.js','integracoes.js']
  .forEach(p=>w.eval(fs.readFileSync(p,'utf8')));

w.QLOCAL={Q1:'l'};w.LOCAIS={l:{nome:'Local X'}};w.ITENS={};w.isAdmin=()=>false;w.quadraNome=id=>id;
w.save=()=>{throw Error('Leitura não pode salvar');};
const chamadas=[];
['openStudyDetail','finalizarEstudo','reabrirEstudo','confirmDeleteStudy'].forEach(f=>{
  w[f]=(qid,sid)=>chamadas.push([f,qid,sid]);
});
const trat=[{id:'T1',produto:'Testemunha',testemunha:true},{id:'T2',produto:'Produto',dose:'1 L/ha'}];
const aval=[{id:'A1',data:'2026-09-01',variaveis:['Dano'],tipos:{Dano:'contagem'},
             notas:{T1R1:{Dano:10},T1R2:{Dano:20},T2R1:{Dano:0},T2R2:{Dano:10}}}];
w.data={Q1:{cultura:'Soja',estudos:[
  {id:'S1',codigo:'EM CURSO <img src=x onerror=alert(1)>',cultura:'Soja',alvo:'Ferrugem',dataInicio:'2026-08-01',
   numRepeticoes:2,tratamentos:trat,avaliacoes:aval},
  {id:'S2',codigo:'JÁ FECHADO',cultura:'Milho',alvo:'Lagarta',dataInicio:'2026-05-01',
   numRepeticoes:2,tratamentos:trat,avaliacoes:aval,
   finalizacao:{em:'2026-09-05T12:00:00.000Z',nome:'Maria Souza',por:'maria@agracta'}}
]}};
const antes=JSON.stringify(w.data);
const d=w.document, q=s=>d.querySelector(s), qa=s=>[...d.querySelectorAll(s)];
const clicar=async b=>{ b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,0)); };

w.abrirConhecimento({aba:'estudos'});

/* ---------- 1. situação visível, e contada ---------- */
const contagem=()=>Object.fromEntries(qa('.con-estado .con-btn')
  .map(b=>[b.dataset.estado, Number(b.querySelector('b').textContent)]));
assert.deepEqual(contagem(),{todos:2,andamento:1,finalizados:1},'os três grupos e suas contas');
assert.equal(qa('.con-estudo').length,2,'sem filtro, os dois estudos aparecem');
assert.equal(qa('.con-selo.em-execucao').length,1);
assert.equal(qa('.con-selo.finalizado').length,1);
/* Quem finalizou e quando: é isso que diferencia a lista de um mero rótulo. */
const fechado=qa('.con-estudo').find(x=>x.textContent.includes('JÁ FECHADO'));
assert.match(fechado.textContent,/Finalizado em .*por Maria Souza/,fechado.textContent);
/* Em execução primeiro: a lista é de trabalho pendente, não de arquivo. */
assert.ok(qa('.con-estudo')[0].textContent.includes('EM CURSO'),'em execução vem antes');
/* O código do estudo continua sendo texto, nunca HTML. */
assert.equal(qa('#conhecimentoOvl img').length,0,'nada de tag vinda do código do estudo');

/* ---------- 2. o filtro separa de verdade ---------- */
await clicar(q('.con-estado [data-estado="finalizados"]'));
assert.equal(qa('.con-estudo').length,1);
assert.ok(q('.con-estudo').textContent.includes('JÁ FECHADO'));
assert.deepEqual(contagem(),{todos:2,andamento:1,finalizados:1},'a conta é do acervo, não do filtro');
await clicar(q('.con-estado [data-estado="andamento"]'));
assert.equal(qa('.con-estudo').length,1);
assert.ok(q('.con-estudo').textContent.includes('EM CURSO'));
await clicar(q('.con-estado [data-estado="todos"]'));

/* ---------- 3. cada estudo oferece a ação que cabe no estado dele ---------- */
const acoes=el=>qa('.con-acoes [data-con]').filter(b=>el.contains(b)).map(b=>b.dataset.con);
/* pintar() reescreve a lista a cada clique: procurar de novo, nunca guardar nó. */
const cartao=texto=>qa('.con-estudo').find(x=>x.textContent.includes(texto));
assert.deepEqual(acoes(cartao('EM CURSO')),['original','estFinalizar','estExcluir'],'em execução: finalizar');
assert.deepEqual(acoes(cartao('JÁ FECHADO')),['original','estReabrir','estExcluir'],'finalizado: reabrir, nunca finalizar de novo');

/* ---------- 4. a ação é a do Agracta, com o estudo certo ---------- */
await clicar(cartao('EM CURSO').querySelector('[data-con="estFinalizar"]'));
assert.deepEqual(chamadas.pop(),['finalizarEstudo','Q1','S1']);
assert.equal(q('#conhecimentoOvl').hidden,true,'a tela fecha: senha e rubrica são do Agracta');

w.abrirConhecimento({aba:'estudos'});
await clicar(cartao('JÁ FECHADO').querySelector('[data-con="estReabrir"]'));
assert.deepEqual(chamadas.pop(),['reabrirEstudo','Q1','S2']);

w.abrirConhecimento({aba:'estudos'});
await clicar(q('.con-estudo [data-con="estExcluir"]'));
assert.deepEqual(chamadas.pop(),['confirmDeleteStudy','Q1','S1'],'excluir passa pela porta com senha');

/* ---------- 5. e nada disso escreveu no acervo ---------- */
assert.equal(JSON.stringify(w.data),antes,'a tela de conhecimento continua só lendo');

/* ---------- 6. as outras listas de estudo seguem sem botão de ação ---------- */
w.abrirConhecimento({qid:'Q1',sid:'S1'});
assert.equal(qa('.con-acoes').length,0,'ação só na aba Estudos; na ficha seria botão dentro de botão');
w.close();

/* ---------- 7. excluir estudo finalizado exige reabrir antes ---------- */
const src=fs.readFileSync('app.js','utf8');
function pega(nome){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,'falta a função '+nome);
  let prof=0,abriu=false,j=i;
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}
for(const alvo of ['deleteStudy','confirmDeleteStudy']){
  const pedidos=[],avisos=[];
  const ctx={
    data:{Q1:{estudos:[{id:'S1'},{id:'S2',finalizacao:{em:'2026-09-05T12:00:00.000Z',nome:'Maria Souza'}}]}},
    requireDeletePassword:(l,cb)=>pedidos.push(l),
    alert:t=>avisos.push(t),
    safetyBackup(){}, _markDeleted(){}, save(){}, render(){}, updateAgendaBadge(){}, showD(){},
    closeStudyEdit(){}, closeStudyDetail(){},
    _identidadeBPL:nome=>({nome:nome}), _agFormatDateTime:x=>String(x),
    document:{getElementById:()=>({classList:{contains:()=>false}})}
  };
  const nomes=Object.keys(ctx);
  const fn=new Function(...nomes, [pega('estudoFinalizado'),pega('_estudoDe'),
    pega('_bloqueadoPorFinalizacao'),pega(alvo),'return '+alvo+';'].join('\n'))(...nomes.map(k=>ctx[k]));

  fn('Q1','S2');
  assert.equal(pedidos.length,0,alvo+': estudo finalizado não pode cair direto na exclusão');
  assert.match(avisos[0]||'',/Reabrir estudo/,alvo+': o aviso precisa dizer o caminho — '+avisos[0]);
  fn('Q1','S1');
  assert.equal(pedidos.length,1,alvo+': estudo em execução continua excluível, com senha');
}

console.log('Estudos: situação visível, filtro, ações pela porta do Agracta, leitura intacta e finalizado protegido OK.');
})().catch(err=>{console.error(err);process.exit(1);});
