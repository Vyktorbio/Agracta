# Campo Vivo 3D — exportar PNG e MP4

Botão **Exportar** na vista do campo (ao lado de "Cenário"). Abre um modal com
formato (PNG / MP4), idioma (Português / English) e quatro caixas de conteúdo
(título, legenda, linha do tempo, marca Agracta).

## Arquivos

| Arquivo | Papel |
|---|---|
| `campo-3d.js` | Só ganhou o botão, o carregamento sob demanda e três leituras no `AgCampo3D`: `geometria()`, `prjCru()` e `estadoAtual()` (cópia, só leitura). |
| `campo-3d-exportar.js` | Composição 1920×1080, PNG, MP4, modal e textos PT/EN. Carregado só no clique. |
| `vendor/mp4-muxer.js` | mp4-muxer 5.2.2 (MIT, ~74 KB, sem rede). Carregado só ao exportar vídeo. |
| `test_campo3d_exportar.js` | Testes dos auxiliares (ver abaixo). |

Nada muda no carregamento inicial do Agracta: os dois arquivos novos ficam no
cache do service worker para funcionar offline, mas só são executados quando
alguém exporta.

## Regras que a exportação segue

- **Nenhuma regra de dado nova.** Valor no instante (`valorEm`), faixas
  (`faixas`), cor (`corDe(fracaoRuim)`), altura e "sem avaliação" vêm do
  `AgCampo3D`, a mesma conta da tela. A legenda usa os mesmos cortes, com a
  pior faixa primeiro.
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

## Vídeo

- MP4, H.264 (`avc1.640028` → `4d0028` → `42e028`, o primeiro que o navegador
  aceitar), 1920×1080, 30 fps, sem áudio, keyframe a cada 2 s.
- Renderização determinística: cada quadro é desenhado a partir do instante.
  Nada é gravado da tela, então o resultado é o mesmo em máquina lenta ou
  rápida.
- Duração: abertura de 1 s, cada avaliação 1,6 s (1,1 s com mais de 6; 0,8 s
  com mais de 10), transições de 0,7 s (0,5 s com mais de 6), encerramento de
  1 s. Quatro avaliações dão cerca de 10,5 s.
- Navegador sem H.264 no WebCodecs: mensagem clara sugerindo o PNG. O
  exportador não gera WebM nem um MP4 inválido. Funciona no Chrome e no Edge
  (computador e Android) e no Safari 16.4 ou mais novo.
- Uma avaliação só: o vídeo fica parado nela (cerca de 3,6 s), e o modal avisa.

## Testes

`node test_campo3d_exportar.js` cobre:
- nome do arquivo sanitizado;
- ordem temporal e transição nunca marcada como real;
- duração do vídeo;
- PT/EN com as mesmas chaves;
- legenda igual às faixas da tela;
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
