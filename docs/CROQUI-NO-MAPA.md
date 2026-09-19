# Croqui do ensaio no mapa

## Consulta e posicionamento no celular — v267

- **Ver croqui das parcelas** e o croqui da avaliação usam a geometria de
  `CroquiCore`, incluindo serpentina, colunas, vãos e giro. O desenho rola sem
  reorganizar as parcelas conforme a largura da janela. Norte e início ficam
  indicados na consulta; os rótulos do mapa continuam proporcionais ao zoom.
- Tocar numa parcela no mapa ou na consulta abre sua identificação, valores
  por data, histórico de avaliações e galeria local. A abertura da avaliação
  mantém tratamento e repetição, incluindo a posição do modo automático.
- O seletor de avaliação determina as cores: vermelho pendente, amarelo
  parcial, verde concluída. Azul indica a seleção. Zero conta como preenchido.
  Ao entrar, usa a data cadastrada mais recente até hoje ou a primeira futura.
  Variáveis de uma avaliação ainda vazia seguem a mesma herança da ficha.
- Fotos abertas pela parcela são filtradas por **tratamento + repetição**, em
  todas as datas. Códigos antigos continuam incluídos. O filtro não altera nem
  remove fotos, e somente as fotos visíveis selecionadas entram na exportação.
- O painel de posicionamento começa recolhido em telas de até 700 px.
  **Ajustes / Recolher** controla os campos; Salvar e Cancelar ficam disponíveis.
  A precisão do GPS permanece visível mesmo recolhido. O enquadramento usa a
  área acima do painel no celular ou ao lado dele no computador, e acompanha
  alterações na altura do painel e na janela.

Arquivos: `croqui-parcelas.js`, `croqui-parcelas.css`, integração no `app.js` e
filtro na galeria local. Testes: `test_croqui_parcelas_ui.js` e
`test_fotos_parcela_filtro.js`, além das regressões de geometria e galeria.
Consulta não salva o estudo, não troca a randomização e respeita a leitura
ativa dos avaliadores. Estudo finalizado não oferece abrir edição nem posição.

O mapa dizia ONDE é a quadra; a ficha dizia COMO é o ensaio. Quem chegava no
talhão juntava as duas coisas de cabeça. Agora o croqui fica desenhado no chão
certo, na escala certa, por cima da imagem de satélite.

## O caminho de instalação é quem manda

O croqui não é uma tabela: é a ordem em que se anda o ensaio. No campo a
instalação **sobe por uma coluna de parcelas e desce pela seguinte**, em
serpentina — começa numa ponta e termina na outra, sem atravessar o ensaio de
volta. Os blocos se sucedem ao longo desse caminho: sobe-se instalando o bloco
A e depois o B, vira-se no alto, e desce-se instalando C e D.

É por isso que a randomização salva numera a parcela de forma **corrida**
(1 até tratamentos × repetições) em vez de reiniciar a cada bloco: esse número
É a ordem de caminhada. O motor só deita essa fila sobre a serpentina, e o
desenho na tela passa a ser o mesmo que se instala no chão.

**Todas as parcelas são desenhadas iguais, e o rótulo é só o código.** Houve
aqui um par de etiquetas verdes — `1 · início` e `fim` — desenhadas em qualquer
zoom para dizer por qual ponta se começa. Relato de campo: balão de mapa tem
tamanho em **pixel**, não em metro, então ao afastar o zoom elas cresciam por
cima do croqui e tapavam justamente o que se queria ver.

Eram redundantes: o código de cada parcela já traz o bloco (`5A`, `1D`) e o
caminho amarelo com as setas já mostra o sentido. Quem precisa do número da
caminhada toca na parcela e lê no balão (`5A · 12ª no caminho`).

## O caminho amarelo

A linha amarela é a mesma coisa em três usos: é por onde o autopropelido passa
**aplicando**, é por onde se anda **avaliando**, e é a ordem em que se
**instala**. É o sentido da randomização. Quem aplica ou avalia na ordem errada
troca os dados de tratamento sem perceber, porque a parcela não tem placa
dizendo qual é.

Ela corre pelo centro das parcelas, na ordem do sorteio, e leva uma seta por
coluna mostrando o sentido. As setas são **geometria em metros**, não
caracteres: o mapa do app gira, e uma seta de texto giraria junto com a tela
apontando para o lado errado. Em metros ela gira com o terreno.

## Tamanho real, e quanto dele cabe na tela

O croqui não é esquema: 3 × 5 m são 3 × 5 m. O que muda com o zoom é quanto
detalhe faz sentido desenhar.

| zoom | parcela 3×5 m | o que é desenhado |
|---|---|---|
| 21 | 44 × 73 px | tudo |
| 20 | 22 × 36 px | tudo — é o zoom de quem está no talhão |
| 19 | 11 × 18 px | tudo |
| 18 | 5 × 9 px | parcelas, caminho e os nomes |
| 17 | 3 × 5 px | parcelas e caminho, sem nomes |
| ≤16 | 1 × 2 px | **só a moldura** — "o ensaio é aqui" |

Abaixo do zoom 16,5 vinte retângulos de 3 px viram uma mancha suja sobre a
lavoura, que é pior que não desenhar.

## O que é desenhado, e o que não é inventado

Do estudo: tratamentos, repetições, tamanho da parcela (`protocolo.tamanhoParcela`)
e a ordem sorteada. Nada disso é estimado.

Do usuário, porque o app não tem como saber:

| campo | padrão | por quê |
|---|---|---|
| `colunas` | 2 | é a instalação padrão de campo; quem usa outra troca uma vez e o croqui lembra |
| `serpentina` | ligada | é assim que se instala; desligada, todas as colunas correm no mesmo sentido |
| `carreador` | 0 | vão entre colunas — é por ele que se anda |
| `espacamento` | 0 | vão entre parcelas dentro da coluna |

Os vãos nascem em **zero** de propósito: zero é visivelmente "não foi
informado", enquanto um carreador de 1 m inventado passaria por medida.

### Onde se preenche o tamanho da parcela

**Ficha do ensaio → Editar planejamento → etapa Protocolo → Tamanho da parcela**
(comprimento × largura, em metros).

Até a v262 esse campo **não existia em lugar nenhum**: `protocolo.tamanhoParcela`
só chegava pela planilha do protocolo importada. Quem cadastrava o estudo na mão
ficava sem saída — e a recusa do croqui mandava preencher num lugar inexistente.
Hoje o campo está na etapa *Protocolo* porque foi ali que o usuário foi procurar
e porque é ali que o dado mora; é o mesmo valor que a calculadora e a planilha
leem.

Duas regras de gravação, e as duas são sobre não perder dado:

- grava só com **os dois lados** preenchidos — meia medida não é medida;
- apaga só com **os dois vazios** — um lado em branco é digitação pela metade, e
  apagar por causa disso perderia o valor que veio da planilha.

O maior dos dois valores é tratado como o **comprimento** (o lado no sentido de
quem planta e pulveriza), independentemente da ordem em que for digitado.

**Sem tamanho de parcela no protocolo o croqui não é desenhado.** Chutar
"deve ser 3×5" colocaria no mapa um desenho com cara de medida — alguém iria ao
campo procurar a estaca onde ele mandou, e a estaca não estaria lá. Um croqui
errado é pior que croqui nenhum, porque o errado parece certo. Nesses casos o
painel diz o que falta e o botão Salvar fica bloqueado.

Sem randomização salva ele **desenha, mas avisa**: o croqui em ordem de cadastro
serve para ver onde o ensaio cabe; o que ele não pode é passar por sorteio.

## Onde a posição mora

Dentro do estudo (`study.croqui`), não num armazém novo:

```js
study.croqui = {lat, lng, ang, colunas, serpentina, espacamento, carreador}
```

O croqui é do ensaio, não do mapa — se o ensaio mudar de quadra ou for
exportado, a posição vai junto. E sincroniza pelo caminho que já existe:
`_mergeStudy` carrega os campos escalares do estudo e a edição mais nova vence,
pelo carimbo `_ts` que o salvamento põe.

**A âncora é um canto, não o centro**: o canto da primeira parcela do primeiro
bloco. É a referência que se acha no campo — ninguém acha o centro de um ensaio
andando — e é o ponto que o GPS vai marcar quando essa parte entrar. O centro
existe só como pegador de arrastar.

## Sistema de coordenadas

Do canto o croqui cresce para `+x` (atravessando as parcelas, o lado da
**largura**) e `+y` (no sentido do **comprimento**, a direção em que se anda). O
comprimento fica sempre no eixo y: parcela é faixa comprida no sentido de quem
planta e de quem pulveriza.

Com ângulo 0, `+x` aponta para o leste e `+y` para o norte — a mesma convenção
da régua de 1 ha, de propósito: os dois objetos giram com o mesmo pegador e para
o mesmo lado. Ao abrir pela primeira vez o croqui já nasce alinhado com o lado
maior da quadra (`quadraEixo`).

## Na tela

- Contorno branco fino, sem preenchimento forte: é marcação sobre a imagem, não
  uma camada de cor. Preencher esconderia a lavoura, que é o que se quer ver.
- Botão **Croqui** no agrupador da engrenagem liga e desliga todos — é filtro de
  camada, não ferramenta.
- Rótulo de cada parcela aparece a partir do zoom 18 (ver a tabela acima).
- Ensaio **finalizado** sai do mapa junto com o resto do andamento (`estudosAtivos`).
  O croqui continua salvo e volta se o ensaio for reaberto.

## Em que parcela eu estou?

Com o croqui ancorado, a pergunta se inverte: o desenho diz onde cada parcela
está, e quem caminha quer saber em qual delas está pisando. **Onde estou**, no
agrupador da engrenagem ao lado do botão *Croqui*, liga o GPS contínuo e
responde.

Não é conforto. A parcela não tem placa — é a mesma razão pela qual o caminho
amarelo existe. Quem avalia uma parcela pensando que é a vizinha lança a nota
no tratamento errado, e esse erro não aparece depois em lugar nenhum: o dado
fica com cara de dado, a estatística roda, e o resultado é de outro ensaio.

### A régua é a folga até a borda

A resposta é comparada com a distância do ponto até a **borda mais próxima da
parcela**, não com um limite fixo em metros nem com a largura da parcela. No
meio de uma parcela de 20 m, ±6 m responde sem dúvida; encostado na divisa
dessa mesma parcela, ±6 m não responde nada.

| situação | o que aparece |
|---|---|
| o erro do GPS cabe dentro da parcela | **5A** — nome, tratamento e a ordem no caminho |
| o erro alcança a vizinha | **5A ou 3A** — as candidatas, nunca uma escolhida |
| o erro alcança a borda externa | o ponto caiu em 5A, **e você pode estar fora do ensaio** |
| entre as colunas | *no vão* — o carreador é lugar legítimo, é por ele que se anda |
| longe | *fora do croqui*, com a distância e a parcela mais próxima |

O empate não é arredondado para a parcela mais provável. Escolher uma das duas
em silêncio dá cara de medida a um sorteio — e é exatamente nessa hora que a
pessoa lança a nota confiante. No mapa as candidatas acendem juntas, em âmbar:
duas parcelas acesas dizem "não lance ainda" sem depender de ninguém ler o
texto. Só a resposta com certeza acende em verde, e sozinha.

Precisão não declarada não é precisão boa: sem o número, o veredito é a dúvida.

### O que este modo não faz

- **Não persegue o mapa.** Centraliza uma vez, na primeira leitura, e depois
  deixa o mapa quieto: a tela puxando sozinha a cada segundo tira o mapa da mão
  de quem está tentando olhar a lavoura.
- **Não abre avaliação.** Ele diz onde você está, não o que fazer.
- **Não convive com o posicionamento.** Abrir *Posicionar croqui* encerra a
  caminhada — o realce perseguiria um desenho que está mudando de lugar debaixo
  dele. Desligar a camada *Croqui* também encerra, senão fica uma parcela acesa
  sobre a lavoura sem o desenho a que ela se refere.
- **Não deixa o GPS ligado depois.** Parar cancela o `watchPosition`. Um watch
  esquecido não dá tela de erro nenhuma; só come a bateria de quem está no campo
  o dia inteiro.

Erro passageiro do GPS não desliga o modo — a leitura seguinte costuma vir boa,
e encerrar por causa dela deixaria a pessoa sem nada no meio do ensaio. Só
permissão negada encerra, porque aí não há leitura seguinte.

## Arquivos

- `vendor/croqui-campo-core.js` — geometria pura, sem DOM e sem Leaflet
  (inclusive `ondeEstou`, que é quem se recusa a escolher parcela no empate)
- `app.js` — camada, pegadores, painel, botões e a leitura contínua do GPS
- `test_croqui_campo.js` — `node test_croqui_campo.js`

## Ancorar o canto no GPS

A âncora é o canto da primeira parcela justamente para isto: é o ponto que se
acha andando. Estando nele, **Marcar canto no GPS** põe o croqui no lugar. O
giro continua na mão, contra as linhas da lavoura — uma leitura só diz *onde*,
nunca *para onde*, e girar por causa dela seria inventar orientação a partir de
um ponto.

### A precisão é mostrada, não escondida

Um aparelho comum entrega de ±3 a ±30 m conforme o céu. **±12 m não posiciona
uma parcela de 3 m**: o canto cai na vizinha e o croqui inteiro sai deslocado um
tratamento — o pior erro possível, porque continua parecendo certo.

Por isso três coisas acontecem juntas:

1. o número aparece por extenso;
2. o veredito compara com a **largura da parcela**, não com um limite fixo em
   metros (±4 m é ótimo numa parcela de 20 m e inútil numa de 3 m);
3. o **círculo de incerteza** é desenhado em volta do canto e entra no
   enquadramento — um círculo de ±12 m ao redor de um croqui de 6 m conta a
   história sozinho, sem texto.

| precisão vs. largura da parcela | veredito |
|---|---|
| até metade da largura | **boa** — o canto está dentro da parcela certa |
| até uma largura | **limite** — confira na imagem antes de salvar |
| acima da largura | **ruim** — pode cair uma parcela fora |

Salvar com sinal ruim continua permitido: é decisão de quem está no campo. O
que não é permitido é fazê-lo sem saber.

### Procedência

Quem salva guarda também de onde veio o canto:

```js
study.croqui.ancora = {fonte:'gps', acc:1.5, em:'2026-09-18T23:27:13Z'}
// ou
study.croqui.ancora = {fonte:'mao', em:'…'}
```

Um croqui marcado no GPS com ±2 m e um arrastado no olho por cima da imagem são
coisas diferentes, e daqui a seis meses ninguém lembra qual foi. **Arrastar na
mão apaga o carimbo do GPS**: a âncora deixou de ser a lida, e o círculo daquela
leitura não descreve mais aquele ponto.

### Uma armadilha de teste

O mock de geolocalização do Chromium **não entrega leitura nenhuma** quando a
precisão declarada é baixa: com `accuracy: 12` vêm zero leituras e um timeout,
enquanto `accuracy: 1.5` chega na hora. Um aparelho real entrega ±20 m sem
problema. Para exercitar o caminho do sinal ruim, injete a leitura direto em
`navigator.geolocation.watchPosition` — assim o teste cobra o código do app, e
não o mock.
