# Ver no campo — as parcelas na grade, o tempo em DAA

Vista tridimensional de um estudo, dentro do Conhecimento. Cada coluna é uma
parcela na posição da grade; a altura e a cor são a variável escolhida; o tempo
sobe em dias após a aplicação.

Arquivos: [`campo-3d.js`](../campo-3d.js), [`campo-3d.css`](../campo-3d.css),
teste [`test_campo3d.js`](../test_campo3d.js).

---

## Onde fica

Depende do tamanho da tela, e a diferença tem um motivo.

**No celular** — botão **Ver no campo** ao lado da curva por data, na seção
*Resultados em perspectiva* da página do estudo. O rótulo descreve o que a tela
mostra, não a técnica usada para desenhá-la.

Ele **herda o contexto**: a variável e a avaliação já escolhidas nos seletores
acima abrem selecionadas na vista, e a avaliação vira o instante inicial do
tempo. Quem já escolheu não escolhe de novo.

**Na mesa** (tela larga, com a casca de `mesa.js` ligada) — a vista é o **topo
do dossiê**, aberta junto com o estudo, ao lado do croqui do experimento. Lá o
botão dos Gráficos **não existe**: duas portas para a mesma tela, uma acima da
outra, é o tipo de coisa que já ensinou alguém a procurar no lugar errado.

O módulo continua carregando **sob demanda** nos dois casos. Essa distinção é o
ponto: quem trabalha no campo nunca baixa nem interpreta `campo-3d.js` sem
pedir, e na mesa — onde a tela é grande, a conexão costuma ser outra e o estudo
é lido, não lançado — ele entra sozinho.

### Embutida não é janela

A mesma folha de estilo serve às duas casas; a classe `c3-embutida` desfaz só o
que é de janela (posição fixa, fundo próprio, rolagem). Três diferenças de
comportamento vêm junto, e cada uma tem teste em `test_estudo_topo.js`:

- **não tem botão de fechar** — fechar deixaria um buraco no topo do dossiê;
- **`Esc` não a fecha** — ali a tecla fecharia o dossiê por baixo dela, que é o
  oposto do que quem apertou espera;
- **não rouba o foco** — a janela leva o foco ao abrir, porque acabou de cobrir
  a tela; embutida, isso tiraria o foco de quem está lendo.

Existe **uma vista por vez**: as duas casas compartilham o mesmo estado e o
mesmo laço de animação.

---

## Quando não há o que mostrar

Dois casos existem de verdade no campo: **estudo sem avaliação cadastrada** e
**avaliação que não declara variável**. Nos dois, a vista abre assim mesmo e
diz o que falta.

Antes ela simplesmente voltava sem fazer nada — no celular o botão *Ver no
campo* não respondia, e no dossiê o topo ficava preso em "Montando a vista do
campo…". A tela existia, o estudo existia, e nada acontecia: do lado de quem
usa, isso é o app quebrado. **Um aviso é resposta; sumir não é**, e o teste
cobra que nenhuma saída de `abrir()` seja silenciosa.

## A cor anda em faixas

Cinco faixas, não degradê contínuo. O degradê parecia mais fino e lia pior:
entre uma parcela de 31 % e outra de 36 % ninguém enxerga a diferença de tom, e
não dá para dizer, olhando, em que altura da escala uma coluna está.

**A precisão não se perde: quem continua contínua é a ALTURA.** A coluna sobe
no valor exato, a cor diz em que faixa ele caiu, e o toque mostra o número.
Cor categórica com altura contínua lê melhor que as duas contínuas.

Duas regras:

- **os cortes saem da escala da variável**, em quintos — nunca de números fixos
  como 5/20/40/60, que valeriam só para severidade em porcentagem e virariam
  uma classificação inventada em qualquer outra variável;
- **a legenda mostra os cortes em número** (`≥ 80`, `60 – 80`, …). Faixa sem
  corte declarado é classificação secreta, e "intermediário" não deixa ninguém
  conferir onde a coluna caiu.

O sentido continua invertendo só a cor: com *mais é melhor*, o topo da escala
fica verde e o piso, vermelho.

## A régua da altura

A altura sempre significou alguma coisa e não dizia **quanto**: dava para ver
que uma coluna é maior que a outra, não que valor ela tem. Um canto da cena
agora carrega a régua — e ela **muda de assunto com o modo**, porque a altura
muda:

| Modo | Altura | Régua |
|---|---|---|
| Estado no dia | valor da variável | marcas na escala da variável (com a unidade) |
| Histórico 3D | tempo | marcas em DAA |

Duas condições, e as duas têm teste:

- **a régua usa a mesma conta que levanta a coluna.** Uma régua com mapeamento
  próprio seria pior que régua nenhuma: daria autoridade de medida a um
  desencontro;
- **sem escala definida não há régua** no modo dia. Ali a altura já é fixa por
  decisão, e uma régua sugeriria uma medida que não existe.

A geometria da régua é desenhada **antes** das colunas, para que elas a tapem
quando estão na frente — é assim que a profundidade se lê. Os números vão
**depois**, por cima de tudo, com halo claro: uma régua com as marcas de baixo
escondidas atrás do próprio campo não é régua.

A régua fica no canto **mais à esquerda** da cena e, entre os dois da esquerda,
no mais fundo. Era só "o mais fundo", e o canto mais fundo de uma vista
isométrica cai no alto e no meio da tela: a régua nascia por cima do campo, com
os números em cima das colunas. À esquerda ela fica fora do bolo, que é onde se
procura eixo vertical, e continuando fundo ela não passa na frente de nada.

## O cenário

A vista era um chão cinza com colunas em pé. Lia-se, e não se enxergava volume:
cada face recebia sombra **por índice** (a primeira e a terceira mais claras, as
outras mais escuras), então girar o campo não mudava sombreado nenhum e a cena
parecia recortada em papel.

O cenário é: céu em degradê, um **bloco de solo** com perfil à vista, luz de
verdade nas faces, sombra de contato no chão e uma rosa de orientação no canto.

### A luz

Cada face é iluminada pela sua **normal** — é daí que vem o relevo: girar o campo
reacende uma face de cada vez.

Duas decisões carregam a tela inteira:

- **o topo é a face de leitura e fica fora da luz.** Ele sai com a cor da faixa e
  mais nada por cima. A cor ali é dado, e dado não pode depender do ângulo em que
  o campo parou — sem essa regra, a mesma parcela mudaria de tom conforme o giro,
  e duas parcelas de valor igual sairiam de cores diferentes na mesma tela. O
  topo também é sempre a face **mais clara** da coluna (o teto das laterais fica
  abaixo dele): quem enxerga um tom cheio sabe que está olhando a face de
  leitura, e não uma lateral bem iluminada;
- **a luz fica presa na câmera, sobre o ombro esquerdo de quem olha.** Presa ao
  mundo, ela ficaria parada enquanto a cena gira, e metade das voltas deixaria as
  duas faces à vista contra a luz — sem relevo, que era o defeito que o cenário
  veio consertar. Presa na tela, em qualquer giro uma das duas faces visíveis
  pega luz cheia e a outra fica no piso.

### A faixa das laterais, e o erro que foi ao ar

O que manda no piso e no teto do escurecimento não é "não escurecer demais" — é a
**separação entre as três faces**. Isso foi errado dos dois lados, e o segundo
erro chegou a ser publicado:

| Faixa | O que aconteceu |
|---|---|
| 0,48 – 0,86, com a luz ainda apontada errado | as **duas** faces à vista caíam no piso e a coluna virava silhueta de barro |
| 0,72 – 0,97 | a lateral iluminada ficou a **três por cento** do topo (0,97 contra 1,00). A aresta do topo some, e cubo sem aresta de topo não é cubo: é um L chapado |
| **0,52 – 0,80** (atual) | topo cheio, uma lateral clara, a outra escura — três degraus que se leem de uma vez |

A faixa publicada por engano deixou a vista **menos** tridimensional do que a
versão que o cenário veio substituir (que tinha 1,00 / 0,74 / 0,58, fixos por
índice de face). Nenhum teste reclamou: todos perguntavam se a lateral era menor
que o topo, e 0,97 é menor que 1,00. Agora se exige **folga**, e o teste reprova
qualquer faixa que encoste a lateral no topo.

A matiz aguenta o piso mais baixo: 0,52 de um verde ainda é verde, e é a face na
sombra, onde escuro é o que se espera.

A altura cheia da coluna chegou a encolher de 26 para 20 unidades pelo mesmo
diagnóstico errado — "o topo some atrás das paredes". Ele não sumia por altura,
sumia por falta de contraste; resolvido isso, a altura voltou para 26. Coluna
alta mostra **mais** lateral, que é onde mora todo o sombreado: encurtá-la era
tirar justamente a superfície que dá volume.

### O degradê da face lateral

Quadrilátero de cor chapada é o que faz uma cena render como papel colado.
Superfície de verdade **escurece perto do chão**, onde a luz do céu chega menos,
e clareia no alto — dois pontos de parada por face, e a diferença entre uma
coluna e um retângulo é quase toda essa.

O degradê corre pela geometria da coluna **inteira**, não do trecho desenhado: no
Histórico a torre é fatiada em vários trechos de cores diferentes, e um degradê
reiniciando a cada fatia viraria listra.

### A sombra

Ela corre **no rumo da luz** — a mesma conta que escurece as faces decide para
onde a mancha aponta. Sombra num rumo e face acesa em outro é o erro que faz cena
boa parecer colagem.

O comprimento é **limitado**, e isso é licença de desenho assumida: a sombra fiel
de uma coluna cheia cruzaria meio ensaio e pintaria de cinza as parcelas
vizinhas — e mancha sobre parcela vira leitura errada de cor. O limite é o
carreador, o vão entre duas parcelas.

Todas as manchas saem num **traço só**: desenhadas uma a uma com transparência, a
sobreposição de duas dobraria o tom e nasceria uma mancha mais escura onde só há
duas colunas perto.

Antes dela vem o **assentamento**: uma auréola escura em volta do pé, para todo
lado. Não é a sombra da luz — é a luz do céu que deixa de chegar no encontro da
coluna com o chão. É ela que tira a coluna de cima do chão e a põe dentro dele;
sem ela, mesmo com sombra direcional, a coluna parece adesivo. Duas passadas,
cada uma num traço só, pelo mesmo motivo de sobreposição.

### O bloco de solo é cenário, não terreno

Ele é liso: **sem relevo, sem linha de plantio e sem vegetação**. O estudo não
guarda a topografia da área nem o sentido das linhas, e desenhar um morro, um
sulco ou uma soqueira seria pôr na tela o que ninguém mediu — numa vista
realista, isso passa por informação. O bloco dá chão, profundidade e escala, e
nada além.

A pegada de cada parcela fica marcada na superfície, na medida real do croqui (as
parcelas não se encostam: entre uma e outra há carreador). Assim a parcela sem
lançamento continua sendo **um lugar**, e não um buraco no meio da grade.

### O que separa render de desenho

Três detalhes carregam quase toda a diferença entre uma cena que parece
renderizada e uma que parece recorte de papel colado — e nenhum deles tem a ver
com a geometria, que já estava certa.

**Borda de tesoura.** Sombra de verdade tem penumbra: a fonte de luz tem tamanho,
então o limite entre sombra e chão é uma faixa, não uma linha. A mancha e o
assentamento saem borrados (`ctx.filter`, num traço só na GPU). Onde o navegador
não tem `ctx.filter`, a penumbra é feita à mão com quatro cópias deslocadas a um
terço da opacidade — não é borrão de verdade, mas tira a tesoura da borda, que é
o que importa. Borrar espalha a mesma tinta por muito mais área, então a
opacidade subiu junto: com o valor de quando a borda era dura, a sombra sumia.

**Chanfro.** Objeto real não tem quina infinitamente viva: a aresta tem uma
lasquinha de largura que pega luz, e é por isso que um canto brilha. Sem esse fio
de luz, o encontro de duas faces é só a fronteira entre dois preenchimentos. Ele
vai na quina da frente — recalculada a cada quadro, porque ela troca quando o
campo gira — e nas duas arestas de topo que saem dela. O fator é 1,18: acima
disso o canal estoura nas faixas já claras e o fio vira néon em volta das
colunas amarelas.

**Grão.** Chapa de cor lisa não passa por terra em tela nenhuma. Os pontos são
sorteados uma vez e guardados em coordenadas do **mundo**, não da tela: giram
junto com o bloco, como grão de terra faria, em vez de ficarem grudados no vidro.
Semente fixa, porque grão trocando de lugar a cada quadro é chuvisco de
televisão. E sorteio sem direção nenhuma: qualquer alinhamento viraria linha de
plantio, que nesta tela seria informação inventada.

O céu ganhou um clarão fraco do lado de onde a luz vem — não é sol desenhado, é o
céu sendo mais claro perto da fonte. Pequeno e discreto de propósito: grande e
forte, ele lava o azul inteiro e o que sobra é mancha de lente suja.

### Só redesenha quando muda

O laço de animação redesenhava sessenta vezes por segundo mesmo com a tela
parada. Com borrão de sombra e grão de solo no meio, isso é bateria de quem está
no campo indo embora à toa. Agora uma assinatura do estado visível (giro,
instante, realce, seleção, modo, cenário, variável, tamanho da caixa) decide: se
nada mudou, o quadro é idêntico e não se desenha. Mexer em `width`/`height` limpa
a tela, então `ligarCanvas()` marca o próximo quadro como obrigatório.

### A rosa não é bússola

Depois de meia volta ninguém sabe mais de que lado ficou o T1. Duas setas
resolvem: **T** para onde os tratamentos crescem, **R** para onde crescem as
repetições. Norte não entra, porque o estudo não guarda a orientação da área no
terreno — seta de bússola numa tela que não sabe onde é o norte é mentira
desenhada. A nota sob a cena diz isso com todas as letras, e some junto com o
cenário quando ele é desligado: aviso sobre o que não está mais na tela é ruído.

### Desliga no botão

**Cenário** devolve o chão chapado de antes, com a luz nova mantida. A cena é
ajuda, não pedágio, e a escolha sobrevive a fechar e abrir a vista: quem desligou
a decoração desligou porque ela atrapalha a leitura dele.

### Tema escuro

As cores da cena — céu, solo, tinta das réguas e dos rótulos, contornos — saem de
uma paleta por tema, escolhida pela **luminância do token `--bg`** e não por uma
classe (o app tem mais de um jeito de ligar o modo escuro, e uma classe só
acertaria um deles). De quebra isso consertou um defeito antigo: a tinta estava
fixa em cinza-chumbo desde o começo, e no tema escuro a tela desenhava chumbo
sobre chumbo — a régua de altura sumia.

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

Do cenário, cobre o que poderia virar dado sem ninguém notar: o topo recebendo
luz cheia em **qualquer** giro, nenhuma lateral alcançando a luz do topo nem
escurecendo a ponto de a matiz da faixa morrer, as duas faces à vista saindo com
tons diferentes em qualquer ângulo (senão não há volume), a sombra caindo sempre
para o mesmo lado da tela, a união da mancha num contorno só, e a ressalva de que
a rosa não aponta o norte.

E um teste que não é sobre a cena, e sim sobre o jeito de quebrá-la: **nenhum
nome pode ser declarado duas vezes no topo do módulo**. A constante horizontal da
luz nasceu chamada `LH`, que já era, vinte linhas acima, a altura do canvas. As
duas viraram a mesma variável, `ligarCanvas()` gravava 420 por cima da luz, todo
produto escalar virava zero — as quatro laterais saíam do mesmo tom e as sombras
encolhiam para nada. Nenhum erro no console: a cena simplesmente deixou de ser
cena. Num arquivo de um IIFE só, duas declarações do mesmo nome no topo nunca são
de propósito.

Conferido em navegador a 1280 px e 414 px: sem rolagem horizontal, sem erro de
console, rótulos de tratamento e de repetição legíveis, seleção de parcela
abrindo o painel com valor e AACPD.

O cenário foi conferido em Chromium nos dois temas e nos dois modos, com uma
parcela sem lançamento na grade: no claro e no escuro a tinta contrasta com o
solo, a parcela vazia aparece como pegada tracejada no chão, a régua fica à
esquerda fora das colunas, e o botão Cenário devolve o chão chapado sem mexer no
giro nem no instante escolhido.

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
