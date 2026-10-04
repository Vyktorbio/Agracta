/* APAGAR UM CADASTRO É DIFERENTE DE DESATIVAR, E O PAINEL TEM DE DIZER ISSO.
 *
 * Relato de uso: "quero excluir e-mails de registro de pessoas, lá no painel
 * admin".
 *
 * O botão nasceu chamando uma função de servidor do Supabase. Na migração ela
 * ficou para trás: o app.js seguia chamando o Supabase, e o botão terminava
 * sempre em "Sem conexão." depois das duas perguntas. Na 20a publicação o botão
 * passou ao firebase-sync.js, e este arquivo guarda as regras dele — que são de
 * gente, não de tela:
 *
 *   1. quem protege são as REGRAS do banco: só administrador grava em members,
 *      e sem cadastro ninguém lê nada. O app não apaga a conta de login de
 *      outra pessoa (isso exige servidor); apaga o cadastro, que é o que dá
 *      acesso.
 *   2. duas perguntas antes de apagar, e a segunda é o e-mail digitado. Uma
 *      lista de pessoas erra por linha, não por intenção.
 *   3. o aviso promete SÓ O QUE É VERDADE: o cadastro sai, a conta de login não
 *      é prometida como apagada, e a trilha BPL não some, porque cada
 *      lançamento guarda nome e e-mail de quem assinou dentro do registro.
 *   4. o e-mail sai também do roster local, COM lápide — allowedUsers
 *      sincroniza por união, e sem lápide o apagado volta do outro aparelho.
 *
 * Rodar: node test_admin_apagar_conta.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const sync=fs.readFileSync('firebase-sync.js','utf8');
const regras=fs.readFileSync('firestore.rules','utf8');

function fatiaDe(texto,marca,nome){
  const i=texto.indexOf(marca);
  assert.ok(i>=0,'não achei "'+marca+'" em '+nome);
  /* a chave que abre o bloco é a ÚLTIMA do marcador ("match /members/{email} {") */
  let prof=0,abriu=false,j=texto.indexOf('{',i+marca.length-1);
  for(;j<texto.length;j++){
    if(texto[j]==='{'){prof++;abriu=true;}
    else if(texto[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return texto.slice(i,j);
}
const fatia=m=>fatiaDe(src,m,'app.js');

/* -------------------------------------------- 1. as regras são quem protege --- */
const MEMBROS=fatiaDe(regras,'match /members/{email} {','firestore.rules');
assert.match(MEMBROS,/allow write: if isAdmin\(\);/,'só administrador grava (e apaga) cadastro');
assert.match(regras,/function isActiveMember\(\) \{\s*return memberExists\(\)/,
  'e sem cadastro não há acesso: é o cadastro que abre o Agracta');
assert.ok(!/apagarContaTecnico/.test(src.replace(/apagarContaTecnico\('\+i\+'\)/g,'')),
  'o app.js não tem mais a versão do Supabase: só o botão da lista chama a função');

/* ------------------------------------------------ 2. o caminho do botão --- */
const LISTA=fatia('function _renderPerfisList(arr, disabledSet){');
assert.match(LISTA,/apagarContaTecnico\('\+i\+'\)/,'cada pessoa da lista tem o botão de apagar');
assert.ok(LISTA.indexOf('apagarContaTecnico')>LISTA.indexOf('alternarAcessoTecnico'),
  'e ele vem DEPOIS de desativar: o que não tem volta fica por último');
assert.match(LISTA,/isAdm\?''/,'a linha de ações inteira não aparece para um admin — nem apagar, nem desativar');
assert.match(LISTA,/#c0392b/,'em vermelho fechado, que não se confunde com o "desativar"');
assert.match(LISTA,/>apagar cadastro<\/button>/,'e o rótulo diz o que apaga: o cadastro');

/* --------------------------------------------- 3. as duas perguntas -------- */
const F=fatiaDe(sync,'window.apagarContaTecnico = function(i){','firebase-sync.js');
assert.match(F,/confirm\(/,'pergunta antes');
assert.match(F,/prompt\(/,'e pede o e-mail digitado como segunda confirmação');
assert.match(F,/String\(conf\)\.trim\(\)\.toLowerCase\(\) !== email/,
  'comparando sem diferenciar maiúscula nem espaço, mas exigindo o e-mail certo');
assert.ok(F.indexOf('.delete()')>F.indexOf('prompt('),
  'e só APAGA depois de conferir — digitar errado não pode apagar nada');
assert.match(F,/collection\('members'\)\.doc\(email\)\.delete\(\)/,'o que se apaga é o cadastro em members');

/* O aviso não pode prometer o que não entrega, nem esconder o que custa. */
assert.match(F,/se perdem/,'diz o que se perde: nome e horário do cadastro');
assert.match(F,/trilha de auditoria não é tocada/,'e diz o que NÃO se perde: a trilha');
assert.match(F,/DESATIVAR/,'e aponta o caminho reversível para quem só quer tirar o acesso');
assert.ok(!/conta e o cadastro somem|apaga a conta/i.test(F),
  'e não promete apagar a conta de login, que o app não apaga');

/* --------------------------------------------- 4. o roster local e a lápide --- */
assert.ok(F.indexOf('_esquecerDoRoster')>F.indexOf('.delete()'),
  'depois de apagar o cadastro, some do roster local');
const R=fatia('function _esquecerDoRoster(email){');
assert.match(R,/delUsers\[alvo\]=Date\.now\(\)/,
  'DEIXANDO A LÁPIDE: allowedUsers sincroniza por união, e sem ela o apagado ressuscita no próximo merge');
assert.match(R,/allowedUsers=arr\.filter/,'e tira o e-mail da lista');
assert.match(R,/cloudSave/,'salvando na nuvem também, senão só este aparelho esquece');

/* A lápide é a MESMA que removeAllowedUser usa — uma regra só para o merge. */
assert.match(fatia('function removeAllowedUser(idx){'),/delUsers\[remEmail\]=Date\.now\(\)/,
  'a remoção do roster que já existia usa a mesma lápide');

/* ------------------------------------- 5. roda a função de verdade --------- */
function contexto(perfil,digitado){
  const apagados=[],avisos=[],esquecidos=[];let recarregou=0;
  const ctx={ console, String, Number, Date, Object, Array, Promise,
    ROOT:'workspaces/agracta',
    FB:{db:{doc(p){return {collection(n){return {doc(id){return {delete(){apagados.push(p+'/'+n+'/'+id);return Promise.resolve();}};}};}};}}},
    firebaseInit:()=>true,
    isFirebaseAdminEmail:e=>e==='admin@x.com',
    confirm:()=>true, prompt:()=>digitado,
    _stxToast:t=>avisos.push(t),
    _esquecerDoRoster:e=>esquecidos.push(e),
    _perfisCache:[perfil] };
  ctx.window=ctx; ctx.globalThis=ctx;
  ctx._carregarPerfis=()=>{recarregou++;};
  vm.createContext(ctx);
  vm.runInContext(F,ctx);
  return {ctx,apagados,avisos,esquecidos,get recarregou(){return recarregou;}};
}
const espera=()=>new Promise(r=>setImmediate(r));

(async()=>{
  const errado=contexto({email:'ana@x.com',nome:'Ana',active:true},'errado@x.com');
  errado.ctx.apagarContaTecnico(0); await espera();
  assert.equal(errado.apagados.length,0,'com o e-mail digitado errado, nada é apagado');
  assert.equal(errado.esquecidos.length,0,'e o roster fica intacto');

  const certo=contexto({email:'Ana@x.com ',nome:'Ana',active:true},'  ANA@x.com');
  certo.ctx.apagarContaTecnico(0); await espera();
  assert.deepEqual(certo.apagados,['workspaces/agracta/members/ana@x.com'],
    'com o e-mail certo (em outra caixa e com espaço), apaga o cadastro em members');
  assert.deepEqual(certo.esquecidos,['ana@x.com'],'e o roster local esquece o mesmo e-mail');
  assert.equal(certo.recarregou,1,'e a lista é relida');

  const adm=contexto({email:'admin@x.com',nome:'Adm',papel:'admin'},'admin@x.com');
  adm.ctx.apagarContaTecnico(0); await espera();
  assert.equal(adm.apagados.length,0,'administrador não se apaga por aqui (vem das regras, não do cadastro)');

  /* E com o e-mail certo, o roster esquece e a lápide fica. */
  const rctx={ console, String, Number, Date, Object, Array,
    data:{__config:{allowedUsers:[{email:'ana@x.com',nome:'Ana'}],delUsers:{}}},
    ensureConfig(){}, save(){}, cloudSave(){} };
  rctx.window=rctx; vm.createContext(rctx); vm.runInContext(R,rctx);
  rctx._esquecerDoRoster('ANA@x.com  ');
  assert.equal(rctx.data.__config.allowedUsers.length,0,'o e-mail sai do roster mesmo digitado com outra caixa');
  assert.ok(rctx.data.__config.delUsers['ana@x.com']>0,'e a lápide fica carimbada');

  console.log('Apagar cadastro no painel admin: regras protegem, duas confirmações, aviso honesto, cadastro apagado em members e roster esquecido com lápide OK.');
})().catch(e=>{console.error(e);process.exit(1);});
