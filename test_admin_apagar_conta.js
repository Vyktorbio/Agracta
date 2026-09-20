/* APAGAR UMA CONTA É DIFERENTE DE DESATIVAR, E O PAINEL TEM DE DIZER ISSO.
 *
 * Relato de uso: "quero excluir e-mails de registro de pessoas, lá no painel
 * admin".
 *
 * O servidor já sabia apagar desde sempre (remover-tecnico, action:"delete");
 * o painel só expunha desativar. Este arquivo guarda as regras do botão que
 * faltava — e elas são de gente, não de tela:
 *
 *   1. as proteções moram no SERVIDOR. Só ele tem a service_role, e é ele que
 *      recusa apagar o próprio admin, outro admin, ou conta inexistente. O app
 *      não duplica essa regra: duplicada, ela sai de sincronia e a cópia do
 *      app vira uma promessa que o servidor não cumpre.
 *   2. duas perguntas antes de apagar, e a segunda é o e-mail digitado. Uma
 *      lista de pessoas erra por linha, não por intenção.
 *   3. o aviso promete SÓ O QUE É VERDADE: a trilha BPL não some, porque cada
 *      lançamento guarda nome e e-mail de quem assinou dentro do próprio
 *      registro.
 *   4. o e-mail sai também do roster local, COM lápide — allowedUsers
 *      sincroniza por união, e sem lápide o apagado volta do outro aparelho.
 *
 * Rodar: node test_admin_apagar_conta.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs'), vm=require('vm');
const src=fs.readFileSync('app.js','utf8');
const edge=fs.readFileSync('supabase/functions/remover-tecnico/index.ts','utf8');

function fatia(marca){
  const i=src.indexOf(marca);
  assert.ok(i>=0,'não achei "'+marca+'" em app.js');
  let prof=0,abriu=false,j=src.indexOf('{',i);
  for(;j<src.length;j++){
    if(src[j]==='{'){prof++;abriu=true;}
    else if(src[j]==='}'&&--prof===0&&abriu){j++;break;}
  }
  return src.slice(i,j);
}

/* ------------------------------------------ 1. o servidor é quem protege --- */
assert.match(edge,/\[\s*"disable",\s*"enable",\s*"delete"\s*\]/,'a função aceita a ação delete');
assert.match(edge,/target\.id === callerId/,'e recusa que o admin apague a si mesmo');
assert.match(edge,/papel === "admin"[\s\S]{0,120}não é permitido/,'e que se apague outro administrador');
assert.match(edge,/deleteUser\(target\.id\)/,'apagando de verdade no Auth');

/* ------------------------------------------------ 2. o caminho do botão --- */
const LISTA=fatia('function _renderPerfisList(arr, disabledSet){');
assert.match(LISTA,/apagarContaTecnico\('\+i\+'\)/,'cada pessoa da lista tem o botão de apagar');
assert.ok(LISTA.indexOf('apagarContaTecnico')>LISTA.indexOf('alternarAcessoTecnico'),
  'e ele vem DEPOIS de desativar: o que não tem volta fica por último');
assert.match(LISTA,/isAdm\?''/,'a linha de ações inteira não aparece para um admin — nem apagar, nem desativar');
assert.match(LISTA,/#c0392b/,'em vermelho fechado, que não se confunde com o "desativar"');

/* --------------------------------------------- 3. as duas perguntas -------- */
const F=fatia('function apagarContaTecnico(i){');
assert.match(F,/confirm\(/,'pergunta antes');
assert.match(F,/prompt\(/,'e pede o e-mail digitado como segunda confirmação');
assert.match(F,/!==String\(p\.email\|\|''\)\.trim\(\)\.toLowerCase\(\)/,
  'comparando sem diferenciar maiúscula nem espaço, mas exigindo o e-mail certo');
assert.ok(F.indexOf('SB.functions.invoke')>F.indexOf('prompt('),
  'e só CHAMA O SERVIDOR depois de conferir — digitar errado não pode apagar nada');
assert.match(F,/action:'delete'/,'a chamada é a ação delete');

/* O aviso não pode prometer o que não entrega, nem esconder o que custa. */
assert.match(F,/NÃO tem volta/,'diz que não tem volta');
assert.match(F,/trilha de auditoria não é tocada/,'e diz o que NÃO se perde: a trilha');
assert.match(F,/DESATIVAR/,'e aponta o caminho reversível para quem só quer tirar o acesso');

/* --------------------------------------------- 4. o roster local e a lápide --- */
assert.ok(F.indexOf('_esquecerDoRoster')>0,'depois de apagar no servidor, some do roster local');
const R=fatia('function _esquecerDoRoster(email){');
assert.match(R,/delUsers\[alvo\]=Date\.now\(\)/,
  'DEIXANDO A LÁPIDE: allowedUsers sincroniza por união, e sem ela o apagado ressuscita no próximo merge');
assert.match(R,/allowedUsers=arr\.filter/,'e tira o e-mail da lista');
assert.match(R,/cloudSave/,'salvando na nuvem também, senão só este aparelho esquece');

/* A lápide é a MESMA que removeAllowedUser usa — uma regra só para o merge. */
assert.match(fatia('function removeAllowedUser(idx){'),/delUsers\[remEmail\]=Date\.now\(\)/,
  'a remoção do roster que já existia usa a mesma lápide');

/* Roda a função de verdade: e-mail errado não pode chamar o servidor. */
const ctx={ console, String, Number, Date, Object, Array,
  data:{__config:{allowedUsers:[{email:'ana@x.com',nome:'Ana'}],delUsers:{}}},
  ensureConfig(){}, save(){}, _stxToast(){}, cloudInit:()=>true,
  _perfisCache:[{user_id:'u1',email:'ana@x.com',nome:'Ana',papel:'tecnico'}],
  confirm:()=>true, prompt:()=>'errado@x.com',
  SB:{functions:{invoke(){ throw new Error('NÃO podia ter chamado o servidor'); }}} };
ctx.window=ctx; ctx.globalThis=ctx;
vm.createContext(ctx);
vm.runInContext('var apagarContaTecnico,_esquecerDoRoster;\n'+F+'\n'+R,ctx);
assert.doesNotThrow(()=>ctx.apagarContaTecnico(0),
  'com o e-mail digitado errado, nada é chamado no servidor');
assert.equal(ctx.data.__config.allowedUsers.length,1,'e o roster fica intacto');

/* E com o e-mail certo, o roster esquece e a lápide fica. */
ctx._esquecerDoRoster('ANA@x.com  ');
assert.equal(ctx.data.__config.allowedUsers.length,0,'o e-mail sai do roster mesmo digitado com outra caixa');
assert.ok(ctx.data.__config.delUsers['ana@x.com']>0,'e a lápide fica carimbada');

console.log('Apagar conta no painel admin: servidor protege, duas confirmações, aviso honesto sobre a trilha, e o roster local esquece com lápide OK.');
