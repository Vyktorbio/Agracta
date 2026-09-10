# Planejamento, equivalência e curva de dose — setembro de 2026

Três recursos que a revisão anterior deixou anotados como lacunas úteis no
fim do [`REVISAO-DRONE-ESTATISTICA.md`](REVISAO-DRONE-ESTATISTICA.md), mais
um que faltava para fechar a pergunta do cliente.

Nenhum deles prova eficácia de produto. Todos exigem que a pergunta seja
declarada **antes**, e é isso que os torna diferentes de rodar mais um teste.

---

## 1. Quantas repetições — a pergunta de antes do ensaio

Na tela da estatística, **Planejar o próximo ensaio**. Não precisa de dados
carregados: a pergunta é anterior a eles.

O erro que isto evita não aparece como erro. Monta-se o ensaio com quatro
blocos porque sempre foram quatro, a análise dá "sem diferença significativa",
e as duas explicações possíveis saem com a mesma frase no relatório:

- o produto não funcionou; ou
- o ensaio nunca teve tamanho para enxergar se funcionou.

A entrada obrigatória é a **diferença agronomicamente relevante** — aquela
que mudaria a decisão. Sem ela declarada não há plano, só desejo.

### O que é calculado

| | |
|---|---|
| Poder de uma comparação | t não-central, com GL do delineamento e o crítico da família |
| Poder do teste F geral | F não-central, no cenário mais duro: dois tratamentos separados por δ e os demais no meio |
| Menor diferença detectável | a inversa, para cada número de repetições |
| Repetições mínimas | o primeiro r que alcança o poder pedido |

GL do resíduo: `(k-1)(r-1)` em blocos, `k(r-1)` inteiramente casualizado —
o bloco cobra grau de liberdade, e isso aparece na conta. Erro-padrão da
diferença: `dp·√(2/r)`.

A correção de multiplicidade entra no plano, não só na análise: Tukey para
todos entre si, Dunnett para todos contra a testemunha (correlação 0,5 entre
contrastes, mesma integração e semente do motor de análise). Planejar para uma
família e analisar em outra desalinha as duas coisas, então a família é
entrada, não detalhe.

### A vantagem que só o Agracta tem

Qualquer calculadora de poder precisa de um chute da variabilidade. O Agracta
não precisa chutar: depois de rodar uma análise, o botão **Usar a
variabilidade da análise feita** preenche o desvio-padrão a partir do QME
daquele modelo, com os graus de liberdade dele. Quando esses GL são poucos,
sai aviso — o plano é tão incerto quanto a estimativa que o alimenta.

Também aceita CV%, que é como se pensa no campo; a ponte para desvio-padrão
é a média esperada, e sem ela o CV não diz nada em unidade nenhuma.

### A tabela importa mais que o número

O resultado não é um número só: é a curva ao redor dele, mostrando o que cada
bloco a mais compra — e onde parar, porque a partir de certo ponto cada bloco
novo compra quase nada.

### O que poder não é

Poder é a probabilidade de detectar uma diferença **do tamanho declarado**,
caso ela exista. Não é probabilidade de o produto funcionar, nem garantia de
resultado significativo.

---

## 2. Equivalência e não-inferioridade — "é tão bom quanto?"

Em **Comparar tratamentos**, junto com "todos entre si" e "contra a
testemunha".

Todo relatório deste motor carimba *"não comprova equivalência"* depois de um
teste que não deu diferença. O carimbo está certo — não rejeitar não é provar
igualdade, e um ensaio pequeno o bastante não rejeita nada. Mas é um beco sem
saída, porque "é tão bom quanto o padrão?" é a pergunta que o cliente faz.

A pergunta tem teste próprio, e ele exige o que a comparação comum não exige:
declarar **antes** quanto é "tão bom quanto". Essa margem é agronômica — é a
perda que ainda não muda a decisão. A tela avisa que ajustá-la depois de ver o
resultado invalida o teste.

### Como é feito

Dois testes unilaterais (TOST) sobre os contrastes **já estimados** pela
análise, preservando o erro e os graus de liberdade daquele modelo. Equivale a
exigir que o intervalo de 1−2α caiba inteiro dentro das margens — **90% quando
α é 5%**, e não 95%; é assim mesmo, e a tela diz qual intervalo está mostrando.

Aceita margem na unidade da variável ou em % da referência.

### Três respostas, não duas

| Conclusão | Significa |
|---|---|
| **Equivalente** | o intervalo inteiro cabe dentro da margem |
| **Diferença relevante** | o intervalo está inteiro fora, de um lado |
| **Inconclusivo** | o intervalo cruza a margem: o ensaio não sustenta nem uma coisa nem outra |

"Inconclusivo" **é resposta**. Confundi-lo com equivalência é o mesmo erro do
"não deu diferença, então é igual" — de máscara nova.

A não-inferioridade é a versão unilateral, e qual lado é o pior depende da
variável: severidade quanto menos melhor.

### O que é recusado

- **GLM de contagem e x de n.** Os contrastes ficam na escala de ligação, e uma
  margem declarada em "5 sacas" ou "10 pontos de severidade" não vale lá.
  Converter pelas costas entregaria veredito de equivalência sobre outra
  pergunta. A recusa explica o porquê.
- **Modelo misto com inferência suspensa** (componente na fronteira ou
  curvatura insuficiente): sem erro confiável não há julgamento.
- **Sob transformação**, sai aviso: a margem foi julgada na escala do modelo.

Multiplicidade: cada comparação é julgada ao nível α, sem correção por padrão
— prática usual, e o aviso diz que com vários tratamentos a chance de ao menos
um "equivalente" por acaso é maior que α. Holm é opcional e só endurece.

---

## 3. Curva de dose para resposta contínua (DE50)

Em **Estrutura do ensaio**, "Curva de dose — resposta contínua".

O motor de dose-resposta que já existia é binomial: mortos de n, probit,
CL50 por Fieller. Serve para bioensaio de mortalidade e não serve para o
ensaio de campo mais comum — doses contra severidade, percentual de controle
ou produtividade.

Sem curva, o ensaio de titulação só diz quais doses diferem entre si. Não
responde "qual dose entrega 90% de controle?", nem coloca intervalo nisso.

### Modelo

Log-logística de quatro parâmetros, o padrão da área:

```
y(x) = c + (d − c) / (1 + (x/e)^b)

d = patamar na dose zero    e = DE50
c = patamar na dose alta    b = inclinação
```

Com `b > 0` a curva vai de `d` até `c`, servindo tanto para resposta que cai
(severidade) quanto para a que sobe (controle %) — quem decide o sentido são
`c` e `d`.

A **testemunha entra como o limite x → 0**, que é exatamente `d`. Não é
descartada nem empurrada para uma "dose muito pequena" arbitrária.

`DEp = e·(p/(1−p))^(1/b)`, com intervalo pelo **logaritmo da dose** (método
delta) e depois exponenciado — por isso assimétrico na escala da dose, como
deve ser.

### O que é recusado ou marcado

- **Menos de quatro doses positivas distintas:** recusa. Quatro parâmetros
  sobre três doses seria desenho, não estimativa.
- **Extrapolação:** uma DE fora do intervalo de doses testado sai marcada
  como tal, e o aviso diz que o número existe mas o ensaio não o sustenta.
  É o abuso mais comum da técnica.
- **Falta de ajuste:** com repetições dentro de cada dose dá para separar o
  erro puro do erro do modelo. Se a log-logística não descreve os pontos, o
  teste F acusa — e um R² alto não acusaria.
- Inclinação na fronteira, curva sem convergência, resposta que não varia
  entre a menor e a maior dose: recusa.

---

## Validação

Os testes rodam o Python publicado, no mesmo Pyodide e nas mesmas bibliotecas
WASM entregues ao aparelho (`tests/motor_poder.py`,
`tests/motor_equivalencia.py`, `tests/motor_dosecontinua.py`,
`tests/motor_rotas_novas.py`).

Os oráculos são independentes da implementação, não recálculos dela:

- **Poder.** Duas identidades exatas: com dois tratamentos, a amplitude
  studentizada sobre √2 é o próprio t bilateral, e o teste F com um grau de
  liberdade no numerador **é** o t bilateral. Mais uma simulação de 200 mil
  réplicas que constrói o t pela definição — diferença normal sobre desvio de
  um qui-quadrado — e conta rejeições, batendo com a fórmula não-central
  dentro de 0,6 ponto percentual.
- **Equivalência.** Na fronteira o p do TOST é exatamente α, por construção.
  Mais o espelho (trocar o sinal troca os dois p de lado) e a duplicidade
  entre o teste e o intervalo de 1−2α.
- **Curva.** Identidades algébricas da própria curva (`y(0)=d`, `y(e)` no meio,
  `DEp` devolvendo exatamente o nível p) e recuperação de parâmetros
  conhecidos a partir de dados gerados do modelo.

Há ainda um teste de tela (`test_estatistica_planejar_ui.js`) que **renderiza
o CSS** e confere que os três recursos têm porta visível na tela de configurar
e continuam escondidos na engrenagem automática. Ele existe porque o buraco
anterior foi exatamente esse: motor pronto, testes de motor passando, e os
controles escondidos por uma regra de CSS que nenhum teste renderizava.

### Desempenho, que aqui é decisão de projeto

No Pyodide do aparelho, `studentized_range.ppf` custa cerca de **460 ms por
chamada** — 170 vezes um `t.ppf`. Varrer 2 a 40 repetições recalculando o
crítico travaria a tela por vinte segundos. O motor faz **bissecção** (o poder
cresce com r, então basta busca binária: seis avaliações), guarda os críticos
em cache e mostra a curva só na janela ao redor da resposta.

## Limites

Permanecem fora: GLMM para respostas não gaussianas, AR(1), covariância não
estruturada, inclinações aleatórias, Kenward–Roger, comparação de curvas de
dose contínua entre produtos (razão de potência existe só na rota binomial),
e planejamento para delineamentos além de blocos e inteiramente casualizado.

Não houve revisão visual em navegador para o relatório da curva de dose com
dados reais de campo; o painel de planejamento foi exercitado em navegador.

## Referências

- [SciPy — t não-central, F não-central, amplitude studentizada](https://docs.scipy.org/doc/scipy/reference/stats.html).
- [Schuirmann (1987) — TOST](https://doi.org/10.1007/BF01068419).
- [Ritz, Baty, Streibig e Gerhard (2015) — Dose-Response Analysis Using R](https://doi.org/10.1371/journal.pone.0146021).
- [Hurlbert, 1984 — Pseudoreplication and the Design of Ecological Field Experiments](https://sciences.ucf.edu/biology/d4lab/wp-content/uploads/sites/23/2018/08/Hurlbert-1984.pdf).
