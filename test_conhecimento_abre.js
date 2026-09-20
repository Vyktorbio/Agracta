/* O CONHECIMENTO TEM DE ABRIR.
 *
 * Relato de uso: "Conhecimento não está abrindo".
 *
 * A tela montava duas listas de atalho a partir de coleções DIFERENTES:
 *
 *   Próximas avaliações   percorre as avaliações  -> empilha {s, av, dias}
 *   Mexido por último     percorre os estudos     -> empilha {s, quando}
 *
 * Uma alteração pôs `data-av="'+e(x.av.id)+'"` nas duas. Na segunda não existe
 * `x.av`, e ler `.id` de undefined lança TypeError. E o estrago não era um item
 * torto na lista: a exceção sobe de dentro do render, antes de qualquer coisa
 * ser pintada, então a TELA INTEIRA deixava de abrir — sem aviso, sem toast,
 * sem nada. O botão parecia morto.
 *
 * "Mexido por último" responde "em que ensaios eu mexi?", não "qual avaliação
 * lançar", então ela abre o ESTUDO. Quem salta para uma avaliação é a outra
 * lista, que tem uma em mãos.
 *
 * Este teste roda as duas funções de verdade, com o formato de dado que cada
 * uma recebe, e falha se alguma voltar a ler um campo que a sua coleção não
 * tem.
 *
 * Rodar: node test_conhecimento_abre.js
 */
'use strict';
const assert=require('node:assert/strict'), fs=require('fs');
const src=fs.readFileSync('integracoes.js','utf8');

/* Recorta uma função do arquivo e a torna chamável, com as ajudantes que ela
   usa entregues de fora — é o mesmo HTML, sem precisar de navegador. */
function pegar(nome, extras){
  const i=src.indexOf('function '+nome+'(');
  assert.ok(i>=0,'não achei '+nome+' em integracoes.js');
  const corpo=src.slice(i, src.indexOf('\n  }', i)+4);
  const nomes=['e','rotulo','desdeQuando','dataBR','diasDe','bot','lista'].concat(Object.keys(extras||{}));
  const vals=[
    x=>String(x==null?'':x),
    x=>(x&&typeof x==='object')?'':String(x||''),
    ()=>'há 1 h',
    x=>String(x||''),
    ()=>1,
    (a,html,attrs)=>'<button data-con="'+a+'" '+(attrs||'')+'>'+html+'</button>',
    x=>Array.isArray(x)?x:[]
  ].concat(Object.values(extras||{}));
  return new Function(...nomes, corpo+';return '+nome+';')(...vals);
}

/* ------------------------------------------------- 1. "Mexido por último" ---
   A coleção dela é de ESTUDOS: {s, quando}. Nenhum `av` à vista. */
const atividadeRecente=pegar('atividadeRecente');
const estudo={key:'Q1|S1',sid:'S1',codigo:'24-118',cultura:'Soja',alvo:'',
              atualizadoEm:'2026-09-19T20:00:00Z'};
let html;
assert.doesNotThrow(()=>{ html=atividadeRecente([estudo]); },
  'com um estudo mexido recentemente, a lista NÃO pode lançar — era isso que fechava o Conhecimento inteiro');
assert.match(html,/Mexido por último/,'e a lista aparece');
assert.match(html,/data-con="estudo"/,
  'o atalho abre o ESTUDO: a pergunta aqui é "em que eu mexi?", não "qual avaliação lançar"');
assert.ok(!/data-av=/.test(html),
  'e não carrega data-av: esta lista não tem avaliação nenhuma em mãos para apontar');
assert.match(html,/24-118/,'com o código do ensaio');

/* Vários estudos, inclusive um sem alvo e um sem código — nada disso pode
   derrubar a tela. */
assert.doesNotThrow(()=>atividadeRecente([
  estudo,
  {key:'Q2|S2',sid:'S2',codigo:'',cultura:'Milho',atualizadoEm:'2026-09-18T10:00:00Z'},
  {key:'Q3|S3',sid:'S3',codigo:'24-120',atualizadoEm:'2026-09-17T10:00:00Z'},
  {key:'Q4|S4',sid:'S4',atualizadoEm:''}   /* sem carimbo: nem entra */
]),'nem estudo sem código, sem alvo ou sem carimbo derruba a lista');

/* ---------------------------------------------- 2. "Próximas avaliações" ---
   Esta SIM tem avaliação em mãos, e por isso pode saltar para ela. */
const proximas=pegar('proximasAvaliacoes');
const comAv={key:'Q1|S1',sid:'S1',codigo:'24-118',cultura:'Soja',finalizado:false,
             avaliacoes:[{id:'A1',data:'2026-09-20',completa:false}]};
let h2;
assert.doesNotThrow(()=>{ h2=proximas([comAv]); },'a lista das próximas também não lança');
assert.match(h2,/data-con="avaliacao"/,'ali o atalho salta direto para a avaliação');
assert.match(h2,/data-av="A1"/,'levando qual delas é — porque aqui existe uma');

/* ------------------------------------------- 3. a regra, na fonte ----------
   Guarda a distinção que o defeito apagou: só quem percorre avaliações pode
   pedir data-av. */
const REC=src.slice(src.indexOf('function atividadeRecente(todos)'),
                    src.indexOf('\n  }', src.indexOf('function atividadeRecente(todos)')))
  /* o comentário que explica o defeito cita o defeito; quem se mede aqui é o
     código, não a prosa sobre ele */
  .replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!/x\.av/.test(REC),
  'nada em "Mexido por último" pode ler x.av: a coleção dela é {s,quando}, não {s,av,dias}');
assert.match(REC,/evs\.push\(\{s:s,quando:/,'e ela continua empilhando estudo + carimbo');

console.log('Conhecimento abre: "Mexido por último" não lê avaliação que não tem, e a tela inteira deixa de cair por causa de uma lista OK.');
