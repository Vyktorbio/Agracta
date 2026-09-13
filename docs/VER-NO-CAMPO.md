# Ver no campo — as parcelas na grade, o tempo em DAA

Vista tridimensional de um estudo, dentro do Conhecimento. Cada coluna é uma
parcela na posição da grade; a altura e a cor são a variável escolhida; o tempo
sobe em dias após a aplicação.

Arquivos: [`campo-3d.js`](../campo-3d.js), [`campo-3d.css`](../campo-3d.css),
teste [`test_campo3d.js`](../test_campo3d.js).

---

## Onde fica

Botão **Ver no campo** ao lado da curva por data, na seção *Resultados em
perspectiva* da página do estudo. O rótulo descreve o que a tela mostra, não a
técnica usada para desenhá-la.

Ele **herda o contexto**: a variável e a avaliação já escolhidas nos seletores
acima abrem selecionadas na vista, e a avaliação vira o instante inicial do
tempo. Quem já escolheu não escolhe de novo.

---

## Dois modos, duas perguntas

| Modo | Altura | O tempo | Responde |
|---|---|---|---|
| **Estado no dia** | o **valor** da variável | anda no controle | *como estava o ensaio no dia X* |
| **Histórico 3D** | o **tempo** (DAA) | é o próprio eixo vertical | *como o ensaio inteiro evoluiu* |

Misturar os dois numa tela só faria a altura significar duas coisas ao mesmo
tempo. O botão de modo diz, embaixo do nome, o que a altura mede em cada um.

No **Histórico 3D** cada parcela vira uma torre que sobe de 0 ao último DAA, com
a cor caminhando junto com o valor: a trajetória da parcela inteira, de uma vez.
Os controles de tempo somem — o tempo virou o eixo, e um controle ali competiria
com ele sugerindo que ainda há um instante escolhido.

### O que a torre marca, e o que ela não finge

- **A altura de cada trecho é proporcional aos dias que ele cobre.** Num ensaio
  com avaliações aos 0, 7, 14 e 31 dias, o último trecho ocupa 17/31 da torre.
  Trechos iguais desenhariam um ensaio que não existiu — e continuariam
  parecendo certos.
- **Anéis marcam as medições.** O que está entre dois anéis é interpolação, não
  dado. Sem a marca, a torre inteira pareceria medida de ponta a ponta.
- **O trecho sem lançamento vira gaiola tracejada**, ocupando a altura que teria.
  Vaza a vista, então o buraco continua evidente — e mantém a torre alcançável
  pelo toque. Sem isso, a parcela mal lançada virava um toco perto do chão que
  as torres inteiras escondiam: sumia justo da vista de quem foi procurar
  problema. As 20 parcelas do ensaio de referência foram conferidas como
  alcançáveis, incluindo a que tem buraco.
- **A cor sozinha não dá número**, então o painel da parcela traz a série
  completa: cada DAA com o seu valor, ou *sem lançamento*.
- No **ordinal**, o trecho inteiro segura a nota de baixo e o salto acontece na
  medição seguinte — mas as alturas continuam sendo os dias reais.

---

## Onde esta tela poderia mentir

Uma vista 3D erra bonito. As colunas continuam saindo, coloridas e plausíveis,
enquanto o eixo do tempo está falsificado ou a ausência virou zero. Nenhum
destes erros produz tela quebrada — por isso cada um tem teste.

### 1. O tempo é DAA real

`data da avaliação − dataInicio`. Avaliações aos 0, 7, 14 e 31 dias têm degraus
desiguais, e o último é mais que o dobro dos outros. Degraus iguais falsificariam
a inclinação da curva e a AACPD.

Avaliação **sem data** fica fora da vista — sem data não há DAA — e o aviso diz
quantas ficaram.

### 2. Ausência não é zero

Sem lançamento, a coluna **some** naquele instante, com o contorno tracejado no
chão, em vez de desabar até zero. A interpolação **não atravessa o buraco**:
faltando qualquer das duas pontas, o trecho não existe.

No instante exato de uma avaliação vale o que ela mediu, e só ela — senão parar
o tempo em cima de uma medição existente mostraria a anterior, ou vazio.

A **AACPD** ignora o trecho incompleto e diz quantos ignorou. Não sobrando
nenhum intervalo com as duas pontas, ela não é exibida: área menor calada seria
pior que área nenhuma.

### 3. A escala de cor é da variável, nunca do estudo

Pelo máximo observado, o pior tratamento fica vermelho **sempre** — inclusive
num estudo em que ninguém passou de 4% de severidade — e dois estudos ficam
incomparáveis entre si. A escala vem de `_avEscala()`.

### 4. O sentido inverte a cor, não o valor

Severidade 80 é vermelho; mortalidade 80 é verde. O número exibido é o mesmo nos
dois casos: o sentido nunca mexe no que foi medido.

### 5. Escala ordinal avança em degraus

Tipo `escala`: o tempo segura a nota vigente até a próxima avaliação, sem
interpolar, e a AACPD não é oferecida.

Sutileza real do Agracta: o valor gravado em `notas` para o tipo `escala` **não
é a nota crua**, é o índice de McKinney (0 a 100) derivado das notas de 0 a
`escalaMax` — ver `_avDerivar()`. Ele parece contínuo, mas a origem é ordinal, e
interpolar entre dois índices inventa um estado de doença que ninguém observou.
Por isso também aqui é degrau.

### 6. O valor vem como texto

Vírgula decimal é aceita, não-numérico e vazio viram ausência, e **NaN não chega
à tela**. Zero continua sendo observação válida, não ausência.

### 7. Todo número exibido passa por arredondamento explícito

Uma função só (`mostra`), com as casas declaradas na chamada.

---

## Metadados da variável: onde ficam, e por quê

A tarefa pedia para avaliar se `sentido`, `min`/`max` e `tipo` cabem num
cadastro central ou seguem por avaliação. **Os dois já existem, e em camadas** —
a resposta foi estender o que há, não abrir um terceiro lugar:

| Camada | O que é | Onde |
|---|---|---|
| 1 | o declarado naquela avaliação | `av.varcfg[v]` — já guarda `sentido`, `escalaMax`, `sub`, `N` |
| 2 | a escala natural do tipo | `av.tipos[v]` ∈ `pct` · `contagem` · `razao` · `escala` |
| 3 | o cadastro central | `CATALOGO_AVAL`, por categoria de estudo, que semeia 1 e 2 na criação |

Um quarto lugar dessincronizaria: `varcfg` é o que a avaliação seguinte **herda**
e o que a sincronização funde. A função nova `_avEscala(av, variavel)` só
resolve as camadas e devolve `{min, max, definida, tipo, porque}`.

`sentido` **já existia** (`_avSentido`), com inferência automática por catálogo e
por tipo. Nada a criar.

### Escalas por tipo

| Tipo | Escala | Observação |
|---|---|---|
| `pct` | 0 – 100 | porcentagem |
| `razao` | 0 – 100 | `n/N` é gravado como percentual |
| `escala` | 0 – 100 | índice de McKinney, derivado das notas de 0 a `escalaMax` |
| `contagem` | **indefinida** | não tem teto |

### Variável sem escala não quebra, e não inventa

`contagem` não tem máximo. A tela **diz que não sabe**: colunas cinza, altura
fixa, e um aviso explicando. Altura por escala inventada mentiria tanto quanto a
cor. Declarar `escalaMaxValor` no `varcfg` daquela avaliação resolve, sem
cadastro novo em lugar nenhum.

---

## Divergências entre o protótipo e o repositório

O protótipo de referência usava nomes idealizados. O que vale é o real:

| Protótipo | Real no Agracta |
|---|---|
| `data_inicio` | `dataInicio` |
| `num_repeticoes` | `numRepeticoes` |
| parcela `"T2:B"` | `"T2R2"` — `_avRowKey(tratId, rep)`, lida por `_avNota` |
| tipo `"nota"` | tipo `escala`, e o gravado é o índice de McKinney |
| `sentido` a criar | já existe em `av.varcfg[v].sentido` |
| `min`/`max` a criar | `escalaMax` já existe; o resto sai do tipo |
| sem cadastro central | `CATALOGO_AVAL` já é o cadastro central |

A leitura é a mesma do painel do estudo: `_avNota` sobre `av.notas`, que também
cobre a compatibilidade das notas antigas gravadas por tratamento. A migração
para Supabase não foi antecipada.

### A tela recebe dois objetos, não um

`abrirCampo3D(projetado, cru, opções)`. O estudo **cru** tem os valores por
parcela, que a projeção do Conhecimento não carrega (ela agrega em médias por
tratamento). O **projetado** tem os nomes de produto já **cegados**, e é dele
que sai o nome mostrado no painel da parcela.

Passar só o cru vazaria nome de produto numa tela dentro do Conhecimento, que é
exatamente o que a projeção existe para impedir. Nenhum dos dois vem de estado
global: os dois são argumentos.

---

## Render e peso

Canvas 2D com projeção própria. **Nenhuma biblioteca nova** — sem three.js, sem
nada.

O enquadramento é calculado a cada quadro sobre a cena inteira (chão, coluna mais
alta possível e a folga dos rótulos). Com escala fixa, girar o campo jogava
metade dele para fora do quadro e os rótulos dos tratamentos sumiam: o desenho
continuava bonito, e faltando tratamento.

### Carregamento inicial: mudou zero

`campo-3d.js` (23,9 kB) e `campo-3d.css` (2,7 kB) **não estão no `index.html`**.
Quem só trabalha no campo nunca os baixa nem os interpreta. O
`estudo-pagina.js` os injeta no primeiro clique.

O arranque hoje carrega 49 arquivos de JS e CSS, 4 290 kB. Esta tarefa
acrescentou **0 byte** a isso; os 26,6 kB do módulo (0,62% do arranque) só saem
da rede para quem abrir a vista.

Os dois arquivos **estão** no pré-cache do service worker: assim a vista abre
offline depois da primeira vez, sem pesar o arranque de ninguém. Se o módulo não
carregar (primeira vez, sem conexão), a mensagem diz exatamente isso.

### Interações

Arrastar gira · tocar seleciona a parcela · slider de tempo · Rodar/Parar ·
Esc fecha. O painel da parcela traz tratamento, produto (cegado quando é o
caso), repetição, DAA, valor e AACPD quando cabível.

---

## Validação

`test_campo3d.js` roda no portão e **extrai as funções reais do `app.js`
publicado** (`_avNota`, `_avCfg`, `_avEscala`, `_avSentido`, `_avRowKey`) em vez
de reimplementá-las — assim o teste não passa a validar uma cópia que divergiu.

Cobre: DAA desigual (incluindo a AACPD ponderada pelos dias reais), lançamento
ausente nos dois sentidos do buraco, sentido invertido separando cor de valor,
variável sem escala, ordinal em degraus, valor como texto com vírgula e lixo,
grade 5×4 e 6×3, avaliação sem data, e a ausência do módulo no `index.html` com
presença no service worker.

Conferido em navegador a 1280 px e 414 px: sem rolagem horizontal, sem erro de
console, rótulos de tratamento e de repetição legíveis, seleção de parcela
abrindo o painel com valor e AACPD.

## Limites

A vista lê `notas`, que para `razao` e `escala` já é o valor derivado — as
sub-amostras e o `n/N` bruto ficam na tela de avaliação, não aqui. Não há
exportação da figura, e a vista não entra no relatório nem nas pranchas.

No **Histórico 3D** a magnitude é lida pela cor e pelo painel da parcela, não
pela forma: a altura já é o tempo. Codificar o valor também na largura da torre
(uma silhueta que engrossa onde a severidade sobe) daria leitura quantitativa
sem gastar o eixo, e fica anotado como passo seguinte — não foi feito aqui
porque largura variável complica a ordenação de profundidade entre torres
vizinhas, e errar isso desenha parcela por cima de parcela.
