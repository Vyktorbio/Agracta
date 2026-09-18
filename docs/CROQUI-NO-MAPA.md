# Croqui do ensaio no mapa

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

O croqui marca as duas pontas — `1 · início` e `fim`. Sem elas o desenho é um
tabuleiro simétrico: de pé no talhão não dá para saber por qual ponta se começa,
e começar pela errada aplica e avalia o ensaio espelhado.

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
| 18 | 5 × 9 px | parcelas, caminho, início e fim (os nomes entram aqui) |
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

## Arquivos

- `vendor/croqui-campo-core.js` — geometria pura, sem DOM e sem Leaflet
- `app.js` — camada, pegadores, painel, botão
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
