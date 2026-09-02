/* Motor de nutrição extraído para vendor/nutricao-core.js (roadmap §8).
 *
 * O QUE ESTE TESTE PROTEGE
 *
 * A aritmética de calagem e recomendação saiu do app.js sem uma linha alterada. Uma
 * extração que muda um número em silêncio é pior que não ter extraído — numa
 * recomendação de adubação, um fator de dez é a diferença entre a dose certa e uma
 * cara. Todos os números abaixo foram conferidos À MÃO a partir das entradas, não
 * copiados da saída do motor.
 *
 * E há uma linha que este teste guarda com mais cuidado que as outras: o motor NÃO
 * traz tabela nenhuma. V2, faixas de teor, doses e limites de micronutriente são
 * conteúdo de publicação e entram por um pacote carregado no aparelho. Se algum dia
 * alguém colar uma tabela aqui dentro, é distribuição pública — o repositório é
 * público e o site sai dele.
 *
 * Rodar: node test_nutricao_core.js
 */
var fs=require('fs');
var N=require('./vendor/nutricao-core.js');

var f=0,p=0;
function ck(ok,n){ if(ok){p++;console.log('  ok    '+n);} else {f++;console.log('  FALHA '+n);} }
function eq(a,b,n){ ck(a===b,n+(a===b?'':' (obtido '+JSON.stringify(a)+', esperado '+JSON.stringify(b)+')')); }
function perto(a,b,tol,n){ var ok=(a!=null&&isFinite(a)&&Math.abs(a-b)<=tol);
  ck(ok,n+(ok?'':' (obtido '+JSON.stringify(a)+', esperado ~'+b+')')); }

/* ============================================================================== */
console.log('\n--- Índices: definições universais de química de solo ---');
/* Laudo em mmolc/dm³: Ca 32, Mg 12, K 3,2, H+Al 28, Al 2.
   SB = 32 + 12 + 3,2 = 47,2
   T  = 47,2 + 28 = 75,2
   V% = 100 × 47,2 ÷ 75,2 = 62,77 -> 63
   m% = 100 × 2 ÷ (47,2 + 2) = 4,065 -> 4 */
var res={Ca:32, Mg:12, K:3.2, HAl:28, Al:2};
var ind=N.soloIndices(res);
perto(ind.SB,47.2,1e-9,'SB = Ca + Mg + K = 47,2');
perto(ind.T,75.2,1e-9,'T = SB + (H+Al) = 75,2');
eq(ind.V,63,'V% = 100 × SB ÷ T = 63');
eq(ind.m,4,'m% = 100 × Al ÷ (SB + Al) = 4');

console.log('\n--- Falta de dado é null, nunca zero ---');
/* Zero e "não medido" não são a mesma coisa: um V% de 0 acusaria solo estéril, e um
   laudo que não trouxe H+Al não diz nada sobre a CTC. */
var semHAl=N.soloIndices({Ca:32,Mg:12,K:3.2});
perto(semHAl.SB,47.2,1e-9,'sem H+Al a SB ainda sai');
eq(semHAl.T,null,'mas a CTC é null, não 0');
eq(semHAl.V,null,'e o V% também');
eq(N.soloIndices({}).SB,null,'laudo vazio não vira SB zero');
eq(N.soloIndices({Ca:32,Mg:12,K:''}).SB,null,'campo em branco não conta como zero');

console.log('\n--- GOLDEN TEST da calagem: método da saturação por bases ---');
/* NC = (V2 − V1) × T ÷ (10 × PRNT)
   V1 = 63 (calculado acima), V2 = 70, T = 75,2, PRNT = 85
   NC = (70 − 63) × 75,2 ÷ (10 × 85) = 526,4 ÷ 850 = 0,6193 -> 0,62 t/ha */
var c=N.calagem(res, 70, 85, 20);
perto(c.nc,0.62,1e-9,'NC = 0,62 t/ha em 0–20 cm');
eq(c.V1,63,'com V1 vindo da própria análise');
eq(c.V2,70,'e V2 informado, não embutido — ele é conteúdo de tabela');
perto(c.T,75.2,1e-9,'e a CTC calculada');

console.log('\n--- Profundidade escala, e a trilha diz que escalou ---');
/* 40 cm = fator 2. 0,6193 × 2 = 1,2386 -> 1,24 t/ha. Aplicar dose de 40 cm achando
   que é padrão é erro caro, então o ajuste vai dito. */
var c40=N.calagem(res, 70, 85, 40);
perto(c40.nc,1.24,1e-9,'a 40 cm, 1,24 t/ha');
perto(c40.ncBase,0.62,1e-9,'com a base de 0–20 cm preservada');
eq(c40.fator,2,'fator 2');
var tr=N.calagemTrilha(c40);
ck(tr.some(function(l){ return /Ajuste para 40 cm/.test(l); }),'e a trilha diz que ajustou para 40 cm');
ck(tr.some(function(l){ return /NC \(t\/ha\) = \(V2 − V1\) × T ÷ \(10 × PRNT\)/.test(l); }),
   'a trilha traz a fórmula, não só o resultado');
ck(tr.some(function(l){ return /75\.2|75,2/.test(l); }),'e os valores que entraram nela');

console.log('\n--- Não precisa de calagem é RESULTADO, não erro ---');
var ok=N.calagem(res, 60, 85, 20);
eq(ok.nc,0,'V2 abaixo do V1 atual dá NC zero');
ck(/já está em ou acima/.test(ok.nota||''),'com a nota explicando por quê');
ck(!ok.erro,'e não é erro');

console.log('\n--- Entrada impossível é recusada, não calculada ---');
ck(!!N.calagem({Ca:32}, 70, 85, 20).erro,'sem dados para a CTC, recusa');
ck(!!N.calagem(res, 0, 85, 20).erro,'V2 zero recusa');
ck(!!N.calagem(res, 150, 85, 20).erro,'V2 acima de 100 recusa');
ck(!!N.calagem(res, 70, 0, 20).erro,'PRNT zero recusa — dividiria por zero');
ck(!!N.calagem(res, 70, 150, 20).erro,'PRNT acima de 100 recusa');

console.log('\n--- Faixa: a primeira cujo "ate" cobre o valor ---');
var faixas=[{classe:'baixo',ate:15},{classe:'médio',ate:40},{classe:'alto'}];
eq(N.faixa(faixas,10).classe,'baixo','10 cai em baixo');
eq(N.faixa(faixas,15).classe,'baixo','o limite pertence à faixa que o declara');
eq(N.faixa(faixas,15.1).classe,'médio','e logo acima já é a próxima');
eq(N.faixa(faixas,999).classe,'alto','a última sem "ate" é o acima-de-tudo');
eq(N.faixa(faixas,null),null,'valor ausente não cai em faixa nenhuma');
eq(N.faixa(null,10),null,'sem tabela, sem faixa');

console.log('\n--- Dose: a linha que ATENDE a produtividade esperada ---');
var linhas=[{produtividade:3,dose:60},{produtividade:6,dose:90},{produtividade:9,dose:120}];
eq(N.dose(linhas,3).dose,60,'3 t/ha usa a linha de 3');
eq(N.dose(linhas,4).dose,90,'4 t/ha sobe para a linha de 6 — a que atende');
eq(N.dose(linhas,9).dose,120,'9 usa a de 9');
var ext=N.dose(linhas,12);
eq(ext.dose,120,'acima da última linha, usa a última');
eq(ext.extrapolou,true,'e MARCA que extrapolou — em silêncio viraria erro caro');

console.log('\n--- "Não informei" não é "informei zero" ---');
/* Number(null) é 0, e 0 é finito. Sem guarda, quem não informou a produtividade
   pegaria calada a menor dose da tabela. */
var sem=N.dose(linhas,null);
eq(sem.dose,60,'sem produtividade, usa a primeira linha');
eq(sem.semProdutividade,true,'mas MARCA que foi por falta de dado');
eq(N.dose(linhas,'').semProdutividade,true,'string vazia idem');
eq(N.dose(linhas,0).semProdutividade,true,'e zero explícito também — não existe produtividade zero');
eq(N.dose([],5),null,'tabela sem linhas não devolve dose');

console.log('\n--- Pacote malformado é recusado antes de virar recomendação ---');
ck(!!N.validarPacote(null),'null é recusado');
ck(!!N.validarPacote({}),'objeto sem culturas é recusado');
ck(!!N.validarPacote({culturas:[]}),'lista vazia é recusada');
ck(!!N.validarPacote({culturas:[{}]}),'cultura sem nome é recusada');
ck(/V2 inválido/.test(N.validarPacote({culturas:[{nome:'Soja',V2:150}]})||''),'V2 fora de 1..100 é recusado');
eq(N.validarPacote({culturas:[{nome:'Soja',V2:70}]}),null,'pacote bem formado passa');

console.log('\n--- GOLDEN TEST da recomendação, com pacote INVENTADO ---');
/* Os números deste pacote são inventados para o teste. O motor não traz tabela
   nenhuma, e é isso que permite trocar de publicação sem trocar de código. */
var pacote={ nome:'Pacote de teste', versao:'1', fonte:'valores inventados',
  culturas:[{ nome:'Soja', finalidade:'grão', V2:70, unidadeProdutividade:'t/ha',
    N:{plantio:20, unidade:'kg/ha', cobertura:[{produtividade:3,dose:0},{produtividade:6,dose:30}]},
    P2O5:{criterio:'P', unidade:'kg/ha', faixas:[
      {classe:'baixo',ate:15,doses:[{produtividade:3,dose:80},{produtividade:6,dose:100}]},
      {classe:'alto',doses:[{produtividade:3,dose:30},{produtividade:6,dose:40}]}]},
    K2O:{criterio:'K', unidade:'kg/ha', faixas:[
      {classe:'médio',ate:3,doses:[{produtividade:6,dose:70}]},
      {classe:'alto',doses:[{produtividade:6,dose:40}]}]},
    micro:[{nutriente:'B', criterio:'B', abaixoDe:0.3, dose:2, unidade:'kg/ha'},
           {nutriente:'Zn', criterio:'Zn', abaixoDe:0.6, dose:4, unidade:'kg/ha'}]
  }]};
/* Laudo: P = 10 (baixo), K = 3,2 (alto), B = 0,2 (deficiente), Zn = 1,0 (suficiente).
   Produtividade esperada 5 t/ha.
     N   = plantio 20 + cobertura 30 (linha de 6, que atende 5) = 50 kg/ha
     P2O5: P 10 -> faixa "baixo" (até 15) -> linha de 6 -> 100 kg/ha
     K2O : K 3,2 -> acima de 3 -> faixa "alto" -> 40 kg/ha
     B   : 0,2 < 0,3 -> aplica 2 kg/ha
     Zn  : 1,0 >= 0,6 -> não aplica */
var analise={resultados:{Ca:32,Mg:12,K:3.2,HAl:28,Al:2,P:10,B:0.2,Zn:1.0}};
var r=N.recomendar(pacote, analise, 'Soja', 'grão', 5);
ck(!r.erro,'a recomendação sai sem erro');
function item(n){ return (r.itens||[]).filter(function(i){return i.nutriente===n;})[0]; }
eq(item('N').dose,50,'N = plantio 20 + cobertura 30 = 50 kg/ha');
eq(item('P2O5').dose,100,'P2O5 = 100 kg/ha (P 10 -> baixo -> linha de 6)');
eq(item('P2O5').classe,'baixo','com a classe registrada');
eq(item('P2O5').teor,10,'e o teor que a produziu');
eq(item('K2O').dose,40,'K2O = 40 kg/ha (K 3,2 -> alto)');
eq(item('B').dose,2,'B aplicado: 0,2 abaixo do limite 0,3');
eq(item('Zn'),undefined,'Zn NÃO aplicado: 1,0 é suficiente');
eq(r.V2,70,'e o V2 da cultura vem do pacote, para alimentar a calagem');

console.log('\n--- A trilha diz de onde cada número saiu ---');
ck(r.trilha.some(function(l){ return /Pacote: Pacote de teste/.test(l); }),'qual pacote');
ck(r.trilha.some(function(l){ return /P2O5 — P medido 10 → classe "baixo"/.test(l); }),
   'de qual teor, para qual classe, com qual dose');
/* O N não sai da análise de solo, e dizer isso em voz alta evita que alguém confie
   num número que a análise não sustenta. */
ck(r.trilha.some(function(l){ return /N — não é estimado pela análise de solo/.test(l); }),
   'e que o N NÃO vem da análise de solo');
ck(r.trilha.some(function(l){ return /Zn — teor 1 suficiente/.test(l); }),
   'inclusive o que NÃO foi aplicado, e por quê');

console.log('\n--- Recusa em vez de chute ---');
ck(!!N.recomendar(null, analise, 'Soja', 'grão', 5).erro,'sem pacote, recusa');
ck(!!N.recomendar(pacote, analise, 'Milho', '', 5).erro,'cultura fora do pacote, recusa');
ck(!!N.recomendar(pacote, null, 'Soja', 'grão', 5).erro,'sem análise, recusa');
/* Laudo sem P: não se inventa um teor. */
var semP=N.recomendar(pacote, {resultados:{K:3.2}}, 'Soja', 'grão', 5);
ck(!(semP.itens||[]).some(function(i){return i.nutriente==='P2O5';}),'sem P no laudo, P2O5 não é calculado');
ck(semP.trilha.some(function(l){ return /sem P no laudo/.test(l); }),'e a trilha diz por quê');

console.log('\n--- O motor não carrega tabela de publicação nenhuma ---');
/* Esta é a checagem que protege o repositório, não o cálculo. Se alguém colar uma
   tabela real aqui dentro, o site público passa a distribuí-la. */
var fonte=fs.readFileSync('vendor/nutricao-core.js','utf8');
var semCom=fonte.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
ck(!/faixas\s*:\s*\[/.test(semCom),'nenhuma lista de faixas de teor embutida');
ck(!/\bV2\s*:\s*\d/.test(semCom),'nenhum V2 de cultura embutido');
ck(!/abaixoDe\s*:\s*\d/.test(semCom),'nenhum limite de micronutriente embutido');
ck(!/Boletim|IAC|FUNDAG/i.test(fonte),'e nenhuma referência a publicação no arquivo');
eq(typeof N.VERSION,'string','o motor declara versão, para o número se reconferir depois');

console.log('\n'+(f?('FALHA: '+f+' de '+(f+p)+' checagens'):('todas as '+p+' checagens passaram')));
process.exit(f?1:0);
