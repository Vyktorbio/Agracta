# Campo Vivo 3D — exportar PNG e MP4

Botão **Exportar** na vista do campo (ao lado de "Cenário"). Abre um modal com
formato (PNG / MP4), idioma (Português / English) e quatro caixas de conteúdo
(título, legenda, linha do tempo, marca Agracta).

## Arquivos

| Arquivo | Papel |
|---|---|
| `campo-3d.js` | Só ganhou o botão, o carregamento sob demanda e três leituras no `AgCampo3D`: `geometria()`, `prjCru()` e `estadoAtual()` (cópia, só leitura). A régua da altura (`reguaAltura`, `alturaDe`, `eixo`) mora aqui e a exportação a lê daqui. |
| `campo-3d-exportar.js` | Composição 1920×1080, PNG, MP4, modal e textos PT/EN. Carregado só no clique. |
| `vendor/mp4-muxer.js` | mp4-muxer 5.2.2 (MIT, ~74 KB, sem rede). Carregado só ao exportar vídeo. |
| `campo-3d-realista.js` | Estilo **Realista** (WebGL): blocos de folhagem, solo, gramado até o horizonte, mata ao fundo, luz de fim de tarde. Carregado só quando o estilo realista é escolhido. |
| `vendor/three-agracta.min.js` | Recorte mínimo do three.js r186 (MIT, ~575 KB, 145 KB comprimido), gerado com esbuild. Carregado junto com o realista. |
| `test_campo3d_exportar.js` | Testes dos auxiliares (ver abaixo). |

Nada muda no carregamento inicial do Agracta: os dois arquivos novos ficam no
cache do service worker para funcionar offline, mas só são executados quando
alguém exporta.

## Regras que a exportação segue

- **Nenhuma regra de dado nova.** Valor no instante (`valorEm`), faixas
  (`faixas`), cor (`corDe(fracaoRuim)`), altura (`alturaDe`, na régua da
  tela) e "sem avaliação" vêm do `AgCampo3D`, a mesma conta da tela. A legenda
  usa os mesmos cortes, com a pior faixa primeiro, e uma linha para a altura
  ("Altura: 0 a 30 %").
- **A altura tem régua.** Nos dois estilos a altura carrega o valor, então o
  quadro desenha a régua da tela no canto do fundo à esquerda, com os números
  e a unidade. Ela sai junto com a legenda (desmarcar "Legenda" limpa as duas).
- **Ausência não é zero.** Parcela sem dado sai como contorno tracejado no
  chão, sem altura e sem cor, e a legenda mostra "sem avaliação".
- **Transição não é avaliação.** O vídeo para em cada avaliação real, em ordem
  de DAA. Entre duas delas a coluna anda pelo mesmo `valorEm()` da tela (em
  degrau na escala ordinal) e o rodapé mostra "Transição entre X e Y DAA — não
  é avaliação", com um losango no lugar do ponto.
- **Tempo real.** Os pontos da linha do tempo ficam no espaçamento real em
  dias, com intervalos irregulares preservados.
- **Câmera estável.** O giro é o mesmo que a pessoa deixou na tela, com uma
  rotação total de 8° ao longo do vídeo. A escala é fixa, então não há zoom.
- **Folhagem é ilustração.** A legenda diz isso; o dado é a cor e a altura.
- **Nada sai do aparelho.** O quadro é desenhado no canvas e o vídeo é
  codificado pelo próprio navegador (WebCodecs).

## Altura e régua

- **Régua ampliada (padrão).** A altura vai do piso da escala até o menor
  número redondo que cobre o maior valor lançado no estudo inteiro (26,9 %
  vira 0 a 30 %, em 3 a 6 passos de 1, 2, 2,5 ou 5 × 10ⁿ). Antes ia sempre
  até o topo da escala (100 %), e num ensaio em que a testemunha chega a
  25 % todas as colunas ficavam no quinto de baixo: a diferença entre as
  parcelas era sutil demais (pedido de quem usa).
- **A cor não amplia.** As faixas continuam na escala inteira da variável;
  ampliar só mexe na altura. O teto sai do estudo inteiro, não do instante:
  a régua não anda com o tempo.
- **Escala inteira** continua a um toque na tela ("Ver na escala inteira"),
  para comparar alturas entre estudos. O vídeo e o PNG usam a régua que
  estava na tela.
- O piso da coluna baixou de 12 % para 4 % da altura: o zero medido segue
  sendo uma coluna rasa (a ausência é o contorno tracejado), mas os valores
  pequenos deixam de ficar todos no mesmo piso.

## Estilos

- **Realista** (padrão): cada parcela é um bloco de folhagem na posição da
  grade. **A cor da folhagem é a faixa do dado e a altura do bloco é o
  valor**, na mesma régua da tela; nas transições o bloco cresce liso (as
  folhas sobem junto com ele, nenhuma nasce nem some). Bloco cheio = 1,6 × o
  lado comprido da parcela. Até a 21ª publicação a altura era igual para
  todos; mudou a pedido de quem usa ("só muda a cor, o retângulo não cresce
  para cima"). A folhagem projeta sombra no chão mas não recebe: um bloco
  alto não escurece a cor do vizinho. Cada parcela é semeada só até a altura
  mais alta que ela atinge no estudo, com um orçamento de folhas para ensaios
  grandes: o vídeo custa perto do que custava com a altura fixa (1,2× no
  teste com WebGL por software, contra 2,5× semeando todas para o bloco
  cheio). Parcela sem avaliação fica com solo nu
  e contorno tracejado claro. Fundo de gramado, sem céu (o campo ocupa mais o
  quadro). Grama e luz são cenário.
- **Esquemático**: o desenho em canvas 2D, com altura = valor, como na tela.
- Sem WebGL, ou se o three.js não carregar, a exportação sai no esquemático e
  o modal avisa. Ela não falha.

## Vídeo

- MP4, H.264 (`avc1.640028` → `4d0028` → `42e028`, o primeiro que o navegador
  aceitar), 1920×1080, 30 fps, sem áudio, keyframe a cada 2 s.
- Renderização determinística: cada quadro é desenhado a partir do instante.
  Nada é gravado da tela, então o resultado é o mesmo em máquina lenta ou
  rápida.
- Duração: abertura de 1 s, parada de 0,6 s em cada avaliação, passagem proporcional aos dias (0,15 s por dia, de 2,5 a 4,5 s, em curva suave), encerramento de 1,2 s; teto de ~40 s. Câmera parada.
  com mais de 10), transições de 0,7 s (0,5 s com mais de 6), encerramento de
  1 s. Quatro avaliações dão cerca de 10,5 s.
- Navegador sem H.264 no WebCodecs: mensagem clara sugerindo o PNG. O
  exportador não gera WebM nem um MP4 inválido. Funciona no Chrome e no Edge
  (computador e Android) e no Safari 16.4 ou mais novo.
- Uma avaliação só: o vídeo fica parado nela (cerca de 3,6 s), e o modal avisa.

## Testes

`node tests/test_campo3d_exportar.js` cobre:
- nome do arquivo sanitizado;
- ordem temporal e transição nunca marcada como real;
- duração do vídeo;
- PT/EN com as mesmas chaves;
- legenda igual às faixas da tela;
- altura pela mesma conta da tela (régua ampliada e inteira), régua e linha
  "Altura" no quadro, nos dois idiomas; bloco realista na altura do valor;
- ausência sem valor e sem cor;
- outra variável;
- textos do quadro, incluindo as caixas de conteúdo;
- PNG sem alterar o estudo;
- erro de navegador sem H.264;
- todos os `VideoFrame` fechados, encoder fechado e canvas liberado, no sucesso,
  no erro no meio e no cancelamento.

O H.264 em si não roda no Chromium de teste, que é o build aberto e não tem
esse codificador. O resto do caminho (quadros, tempos, container) foi conferido
trocando só o codec. Ainda falta o teste manual num Chrome de verdade:

1. Abra um estudo com 3 ou mais avaliações → Ver no campo → Exportar.
2. PNG em Português e em English: abra o arquivo e confira título, variável,
   DAA, legenda e marca.
3. MP4: confira se toca no player do celular e no PowerPoint, e se as
   avaliações aparecem em ordem com o rodapé de transição entre elas.
4. Depois de exportar, a vista continua com a mesma variável, o mesmo instante
   e o mesmo giro.
