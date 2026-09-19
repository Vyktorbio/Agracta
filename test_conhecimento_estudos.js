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
['vendor/dose-core.js','vendor/ativos-en-core.js','vendor/conhecimento-core.js','vendor/avaliacao-core.js','integracoes.js']
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
const antes=JSON.stringify(w.data), antesData=JSON.parse(antes);
const d=w.document, q=s=>d.querySelector(s), qa=s=>[...d.querySelectorAll(s)];
const clicar=async b=>{ b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})); await new Promise(r=>setTimeout(r,0)); };

w.abrirConhecimento({aba:'estudos'});

/* ---------- 1. situação visível, e contada ---------- */
const contagem=()=>Object.fromEntries(qa('.con-estado .con-btn')
  .map(b=>[b.dataset.estado, Number(b.querySelector('b').textContent)]));
assert.deepEqual(contagem(),{todos:2,andamento:1,finalizados:1},'os três grupos e suas contas');
assert.equal(qa('.con-cartao').length,2,'sem filtro, os dois estudos aparecem');
assert.equal(qa('.con-selo.em-execucao').length,1);
assert.equal(qa('.con-selo.finalizado').length,1);
/* Quem finalizou e quando: é isso que diferencia a lista de um mero rótulo. */
const fechado=qa('.con-cartao').find(x=>x.textContent.includes('JÁ FECHADO'));
assert.match(fechado.textContent,/Finalizado em .*por Maria Souza/,fechado.textContent);
/* Em execução primeiro: a lista é de trabalho pendente, não de arquivo. */
assert.ok(qa('.con-cartao')[0].textContent.includes('EM CURSO'),'em execução vem antes');
/* O código do estudo continua sendo texto, nunca HTML. */
assert.equal(qa('#conhecimentoOvl img').length,0,'nada de tag vinda do código do estudo');

/* ---------- 2. o filtro separa de verdade ---------- */
await clicar(q('.con-estado [data-estado="finalizados"]'));
assert.equal(qa('.con-cartao').length,1);
assert.ok(q('.con-cartao').textContent.includes('JÁ FECHADO'));
assert.deepEqual(contagem(),{todos:2,andamento:1,finalizados:1},'a conta é do acervo, não do filtro');
await clicar(q('.con-estado [data-estado="andamento"]'));
assert.equal(qa('.con-cartao').length,1);
assert.ok(q('.con-cartao').textContent.includes('EM CURSO'));
await clicar(q('.con-estado [data-estado="todos"]'));

/* ---------- 3. cada estudo oferece a ação que cabe no estado dele ---------- */
const acoes=el=>qa('.con-acoes [data-con]').filter(b=>el.contains(b)).map(b=>b.dataset.con);
/* pintar() reescreve a lista a cada clique: procurar de novo, nunca guardar nó. */
const cartao=texto=>qa('.con-cartao').find(x=>x.textContent.includes(texto));
assert.deepEqual(acoes(cartao('EM CURSO')),['estudo','estFinalizar','estExcluir'],'em execução: finalizar');
assert.deepEqual(acoes(cartao('JÁ FECHADO')),['estudo','estReabrir','estExcluir'],'finalizado: reabrir, nunca finalizar de novo');

/* ---------- 4. a ação é a do Agracta, com o estudo certo ---------- */
await clicar(cartao('EM CURSO').querySelector('[data-con="estFinalizar"]'));
assert.deepEqual(chamadas.pop(),['finalizarEstudo','Q1','S1']);
assert.equal(q('#conhecimentoOvl').hidden,true,'a tela fecha: senha e rubrica são do Agracta');

w.abrirConhecimento({aba:'estudos'});
await clicar(cartao('JÁ FECHADO').querySelector('[data-con="estReabrir"]'));
assert.deepEqual(chamadas.pop(),['reabrirEstudo','Q1','S2']);

w.abrirConhecimento({aba:'estudos'});
await clicar(q('.con-cartao [data-con="estExcluir"]'));
assert.deepEqual(chamadas.pop(),['confirmDeleteStudy','Q1','S1'],'excluir passa pela porta com senha');

/* ---------- 4b. progresso conta avaliação LANÇADA, não cadastrada ----------
   Duas avaliações cadastradas e uma lançada tem de dizer "1 de 2". Contar as
   cadastradas mostraria 100% num estudo em que ninguém foi a campo, e o cartão
   ficaria verde justamente no ensaio abandonado. */
const ontem=d=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);
{
  const semNota={id:'A9',data:ontem(-5),variaveis:['Dano'],tipos:{Dano:'contagem'},notas:{}};
  w.data.Q1.estudos[0].avaliacoes=[aval[0],semNota];
  w.abrirConhecimento({aba:'estudos'});
  const cartao=qa('.con-cartao').find(x=>x.textContent.includes('EM CURSO'));
  assert.match(cartao.textContent,/1 de 2\s*avaliações concluídas/,cartao.textContent);
  /* E a que está no passado sem nota é ATRASADA — calendário contra registro. */
  assert.ok(cartao.querySelector('.con-selo.atrasado'),'avaliação vencida sem nota é atrasada');
  assert.match(cartao.textContent,/1 atrasada/);
  /* O resumo lateral conta o mesmo estudo uma vez só. */
  const resumo=qa('.con-resumo strong').map(x=>Number(x.textContent));
  assert.equal(resumo[1],1,'um estudo com atraso, não um por avaliação');
  /* E ele aparece na agenda marcado como atrasado. */
  assert.ok(q('.con-agenda li.atrasada'),'a avaliação vencida entra na agenda em destaque');
}

/* Avaliação futura sem nota NÃO é atraso: é agenda. */
{
  const futura={id:'A8',data:ontem(3),variaveis:['Dano'],tipos:{Dano:'contagem'},notas:{}};
  w.data.Q1.estudos[0].avaliacoes=[aval[0],futura];
  w.abrirConhecimento({aba:'estudos'});
  const cartao=qa('.con-cartao').find(x=>x.textContent.includes('EM CURSO'));
  assert.ok(!cartao.querySelector('.con-selo.atrasado'),'o que ainda vai acontecer não está atrasado');
  assert.ok(cartao.textContent.includes('Em execução'));
  assert.equal(qa('.con-resumo strong').map(x=>Number(x.textContent))[1],0,'nenhum atraso');
}

/* Avaliação sem data não vira atraso nem agenda: sem data não há prazo. */
{
  const semData={id:'A7',data:'',variaveis:['Dano'],tipos:{Dano:'contagem'},notas:{}};
  w.data.Q1.estudos[0].avaliacoes=[aval[0],semData];
  w.abrirConhecimento({aba:'estudos'});
  const cartao=qa('.con-cartao').find(x=>x.textContent.includes('EM CURSO'));
  assert.ok(!cartao.querySelector('.con-selo.atrasado'),'sem data não há prazo para vencer');
  assert.match(cartao.textContent,/1 de 2\s*avaliações concluídas/,'mas ela continua contando como cadastrada');
}
w.data.Q1.estudos[0].avaliacoes=aval;

/* ---------- 5. e nada disso escreveu no acervo ---------- */
assert.equal(JSON.stringify(w.data),antes,'a tela de conhecimento continua só lendo');

/* ---------- 5b. tela menor NUNCA desce calada ----------
   Se o dossiê não chega ao aparelho, a ficha do estudo cai numa versão reduzida
   — sem gráficos, sem a vista do campo, sem estatística. Isso descia sem aviso:
   a tela abria parecendo normal e quem olhava concluía que os gráficos tinham
   sumido do aplicativo. Perder função em silêncio é pior que dar erro, porque
   não deixa pista de por quê nem do que fazer. */
{
  /* AgEstudoPagina AUSENTE é o estado de quem não recebeu o arquivo do dossiê. */
  assert.ok(!w.AgEstudoPagina,'este teste só vale com o dossiê ausente');
  w.data=antesData;
  w.abrirConhecimento({qid:'Q1',sid:'S1'});
  const t=q('#conhecimentoOvl').textContent;
  assert.match(t,/dossiê completo deste estudo não carregou/,'a ficha reduzida tem de dizer que é reduzida');
  assert.match(t,/sem gráficos/,'e dizer o que falta nela');
  assert.match(t,/com conexão/,'e o que fazer para resolver');
  assert.match(t,/Nada foi perdido/,'e que o dado está intacto — o susto é a metade do problema');
}

/* ---------- 6. as outras listas de estudo seguem sem botão de ação ---------- */
w.abrirConhecimento({qid:'Q1',sid:'S1'});
assert.equal(qa('.con-acoes').length,0,'ação só na aba Estudos; na ficha seria botão dentro de botão');
/* ---------- 6b. o dado que o campo produz, não o do fixture bonito ----------
   Nenhum destes quebra a tela de forma visível: eles a sujam. "[object Object]"
   num filtro, "NaN" num contador, "undefined" num rótulo — a página continua
   abrindo, e passa a mentir baixinho. */
{
  const sujo=t=>/NaN|undefined|Infinity|\[object/.test(t);
  const casos=[
    ['acervo vazio',{}],
    ['quadra sem estudos',{Q1:{estudos:[]}}],
    ['estudo só com id',{Q1:{estudos:[{id:'S1'}]}}],
    ['campos nulos',{Q1:{estudos:[{id:'S1',codigo:null,cultura:null,alvo:null,dataInicio:null,
      numRepeticoes:null,tratamentos:null,avaliacoes:null,integracoes:null}]}}],
    /* Objeto num campo de nome acontece com dado vindo torto da sincronização.
       A tela não tem como saber o que ele queria dizer: some, em vez de
       oferecer "[object Object]" como se fosse uma cultura para filtrar. */
    ['tipos trocados',{Q1:{estudos:[{id:'S1',codigo:123,cultura:{},alvo:[],numRepeticoes:'muitas',
      tratamentos:'nada',avaliacoes:'nada'}]}}],
    ['datas impossíveis',{Q1:{estudos:[{id:'S1',codigo:'X',dataInicio:'ontem',numRepeticoes:4,
      tratamentos:[{id:'T1'}],avaliacoes:[
        {id:'A',data:'31/02/2026',variaveis:['V'],tipos:{V:'pct'},notas:{}},
        {id:'B',data:'',variaveis:['V'],tipos:{V:'pct'},notas:{}},
        {id:'C',data:'9999-12-31',variaveis:['V'],tipos:{V:'pct'},notas:{}}]}]}}],
    ['notas com lixo',{Q1:{estudos:[{id:'S1',codigo:'X',dataInicio:'2026-01-01',numRepeticoes:2,
      tratamentos:[{id:'T1',produto:'P'}],avaliacoes:[{id:'A',data:'2026-01-05',variaveis:['V'],
      tipos:{V:'pct'},notas:{T1R1:{V:'n/a'},T1R2:{V:null}}}]}]}}]
  ];
  for(const [nome,dados] of casos){
    w.data=dados;
    w.abrirConhecimento({aba:'estudos'});
    const t=q('#conhecimentoOvl').textContent;
    assert.ok(!sujo(t),nome+' sujou a tela: '+(t.match(/.{0,50}(NaN|undefined|Infinity|\[object).{0,50}/)||[''])[0]);
  }
  /* XSS em TODO campo de texto, inclusive no cliente, que vem dos eventos. */
  const x='<img src=x onerror=alert(1)>';
  w.data={Q1:{cultura:x,estudos:[{id:'S1',codigo:x,cultura:x,alvo:x,dataInicio:'2026-01-01',
    numRepeticoes:2,tratamentos:[{id:x,produto:x}],
    avaliacoes:[{id:'A',data:'2026-01-05',variaveis:[x],tipos:{},notas:{}}],
    integracoes:{eventos:[{id:'e1',ts:1,por:'u',tipo:'campo',chave:'cliente',valor:x}]}}]}};
  w.abrirConhecimento({aba:'estudos'});
  assert.equal(qa('#conhecimentoOvl img').length,0,'nenhuma tag pode vir de dado do usuário');
  /* E a tela aguenta um acervo de verdade sem travar. */
  const muitos={Q1:{estudos:[]}};
  for(let i=0;i<300;i++)muitos.Q1.estudos.push({id:'S'+i,codigo:'E'+i,cultura:'C'+(i%9),alvo:'A'+(i%7),
    dataInicio:'2026-01-01',numRepeticoes:4,tratamentos:[{id:'T1'},{id:'T2'}],
    avaliacoes:[{id:'A',data:'2026-02-0'+(i%9+1),variaveis:['V'],tipos:{V:'pct'},notas:{T1R1:{V:'5'}}}]});
  w.data=muitos;
  const t0=Date.now(); w.abrirConhecimento({aba:'estudos'}); const ms=Date.now()-t0;
  assert.equal(qa('.con-cartao').length,300,'os 300 estudos aparecem');
  assert.ok(ms<4000,'300 estudos em '+ms+' ms — acima disso a aba trava no aparelho');
}

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

console.log('Estudos: situação visível, progresso pela avaliação lançada, atraso por calendário, ações pela porta do Agracta, dado torto sem sujar a tela, leitura intacta e finalizado protegido OK.');
})().catch(err=>{console.error(err);process.exit(1);});
