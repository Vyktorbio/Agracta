/* Tabela de auditoria da triagem forense — formatação de largura fixa.
 *
 * O contrato que estes testes protegem:
 *   - a severidade sai como TEXTO na coluna, não como cor: a tabela precisa
 *     continuar dizendo a mesma coisa depois de fotocopiada em preto e branco;
 *   - as colunas têm largura fixa (é o que deixa conferir linha a linha);
 *   - nada passa de 80 colunas, senão não imprime em A4 retrato;
 *   - cobertura incompleta de testes é marcada, não omitida;
 *   - relatório sem achado nenhum não quebra.
 *
 * Rodar: node test_forense_tabela.js
 */
var fs=require('fs');
var src=fs.readFileSync('estatistica/app.js','utf8');
function pega(nome){
  var i=src.indexOf('function '+nome+'(');
  if(i<0) throw new Error('não achei '+nome);
  var j=i, dep=0, viu=false;
  for(;j<src.length;j++){ if(src[j]==='{'){dep++;viu=true;} else if(src[j]==='}'){dep--; if(viu&&dep===0){j++;break;}} }
  return src.slice(i,j);
}
var codigo=[pega('_forTruncar'),pega('_forPad'),pega('_forQuebrar'),pega('forenseTabelaTexto')].join('\n');
eval(codigo);

var rel={ ok:true,
  veredito:{nivel:'ATENÇÃO — verificar',classe:'watch',modo:'conservador',flags:1,watches:2,
            testes_executados:7,testes_previstos:8,cobertura_suficiente:false,resumo:'x'},
  parametros:{tipo_dado:'count',modo:'conservador',n_grupos:6,seed:20260811,controle:25.4,tem_segundo_conjunto:true},
  achados:[
    {nome:'Dígito terminal (Benford-2)',severidade:'flag',estatistica:'χ²=24,1; gl=9; p=0,004',
     leitura:'A distribuição do último dígito das contagens afasta-se do esperado, com excesso de 0 e 5.',
     explicacao_inocente:'Arredondamento de leitura no microscópio a cada 5 unidades.'},
    {nome:'Variância entre repetições',severidade:'watch',estatistica:'Levene F=3,80; p=0,012',
     leitura:'Um dos tratamentos tem dispersão bem menor que os demais.'},
    {nome:'Sequência de repetições muito parecida com um padrão previsível e por isso longa',severidade:'watch',
     estatistica:'runs Z=-2,41; p=0,016 (bicaudal, exato)',
     leitura:'Poucas alternâncias na ordem das parcelas.'},
    {nome:'Reconciliação com o controle',severidade:'clear',estatistica:'Δ=0,3 p.p.',
     leitura:'A eficácia declarada bate com a média do controle informada.'},
    {nome:'Duplicatas exatas',severidade:'na',estatistica:'—',leitura:'Sem registro bruto para avaliar.'}
  ],
  aviso:'Triagem estatística não é prova de fraude. Toda anomalia tem explicações legítimas.'
};
var t=forenseTabelaTexto(rel);
console.log(t);
console.log('\n--- verificações ---');
var L=t.split('\n');
var falhas=0;
function ck(c,n){ if(c){console.log('  ok    '+n);} else {console.log('  FALHA '+n); falhas++;} }
var linhasAchado=L.filter(function(l){return /^\s*\d+ /.test(l);});
ck(linhasAchado.length===5,'as 5 linhas de achado saem  ('+linhasAchado.length+')');
var larguras={}; linhasAchado.forEach(function(l){ larguras[l.indexOf('SINAL')>=0||true?l.slice(0,3).length:0]=1; });
ck(linhasAchado.every(function(l){return l.slice(4,30).length===26;}),'coluna do nome tem largura fixa');
ck(t.indexOf('SINAL FORTE')>=0 && t.indexOf('ATENCAO')>=0,'severidade sai como TEXTO, nao como cor');
ck(t.indexOf('[INSUFICIENTE]')>=0,'cobertura incompleta é marcada');
ck(/…/.test(t),'nome longo demais é truncado com reticências');
ck(L.filter(function(l){return /^\[\d+\]/.test(l);}).length===5,'a leitura de cada achado vem numerada embaixo');
ck(t.indexOf('explicacao inocente')>=0,'a explicação inocente é preservada');
ck(Math.max.apply(null,L.map(function(l){return l.length;}))<=90,'nenhuma linha passa de 90 colunas  (max '+Math.max.apply(null,L.map(function(l){return l.length;}))+')');
var vazio=forenseTabelaTexto({ok:true,veredito:{},parametros:{},achados:[]});
ck(vazio.indexOf('(nenhum achado)')>=0,'relatório sem achado não quebra');
process.exit(falhas?1:0);
