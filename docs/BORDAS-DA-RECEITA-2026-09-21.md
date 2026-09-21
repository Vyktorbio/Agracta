# Bordas que sobraram da revisão das calculadoras — 21/09/2026

Base: `29fa1d4` (`main`), logo depois da
[revisão das calculadoras](REVISAO-CALCULADORAS-PROTOCOLOS-2026-09-21.md).

Aquela revisão trocou a leitura de número por uma leitura **estrita**: `0.033`
deixou de virar `33`, pureza zero deixou de virar 100%, densidade zero deixou de
virar 1 g/mL. O ganho é real e continua de pé. O que este documento corrige são
as quatro bordas em que a leitura estrita passou a recusar — ou a ler errado —
uma entrada que o campo escreve todo dia.

Todas foram reproduzidas no `main` antes da correção, e todas passavam pelos 145
arquivos de teste sem levantar uma linha vermelha.

| Borda | O que acontecia no `main` | Correção |
|---|---|---|
| `1.500` mL de volume morto | virava **1,5 mL** — mil vezes menos, em silêncio | ponto volta a ser milhar nos dois campos em mL |
| `1.900` mL de capacidade do frasco | virava **0,0019 L**: a tela recusava preparar por não caber no frasco | idem, e a unidade escolhida ao lado continua mandando |
| Frasco com texto ilegível | virava `NaN`, e o `NaN` ia para a memória gravada | campo vazio ou ilegível é **sem limite de frasco**, que é 0 |
| Testemunha com dose `0 L/ha` | `Dose "0 L/ha" não é um número maior que zero` | zero com unidade, e o traço, voltam a dispensar o preparo |
| `labPureza`/`labDensidade` gravados como 0 | a configuração se dizia completa e gravava memória com todos os tratamentos em erro | o portão recusa a mesma entrada que o motor recusa, e diz o que falta |

## Por que milhar só em dois campos

O ponto é ambíguo em português, e a escolha não pode ser a mesma em toda tela:

- **Volume morto e capacidade** são em mL e chegam aos milhares (300, 1.500,
  1.900). Lá, `1.500` é mil e quinhentos. Decimal nesses campos custa um fator
  de mil, sem nada na tela denunciando.
- **Tamanho de parcela e volume de calda** são pequenos e decimais por natureza
  (5 × 3 m, 3 L/ha, 1,5 L/ha). Lá, `1.5` é o número que o campo escreve, e a
  leitura estrita da revisão está certa — foi mantida.
- **Contagens** (parcelas, frascos) continuam estritas: `1.500` vira 1,5, que o
  motor recusa por não ser inteiro. É erro **visível**, e erro visível não é
  este problema.

O zero inicial continua distinguindo decimal de milhar: `0.300` é 0,3 mL.

## Ramo morto removido

`calcPPM` mandava `g/kg` para a pesagem, mas o ramo da **pipetagem** ainda
carregava uma linha de `massaEquivMg` para `g/kg` — inalcançável desde a
revisão. Removida. Não muda resultado nenhum: a linha nunca executava. A versão
do motor continua `1.1.0` por isso.

## Validação

- `bash conferir.sh --pull-request`: todos os arquivos de teste passam, nenhum pulado.
- `test_receita_bordas.js` (novo): milhar em mL, frasco ilegível, testemunha
  zerada com e sem unidade, controle positivo com dose, portão de
  pureza/densidade e `g/kg` como pesagem.
- As quatro bordas foram reproduzidas em `origin/main` antes da correção; o
  teste novo falha contra aquele código e passa contra este.
- `test_bancada_memoria.js` e `test_calculadoras_protocolos.js` extraem função
  por função: ganharam o novo auxiliar na lista de dependências que já declaram.
- Cache `agracta-app-v279`, `app.js?v=163`, `vendor/biocalc-lab-core.js?v=3`.

## O que NÃO foi mexido

Os rascunhos da bancada guardados por estudo e aba durante a sessão continuam
como estão: a revisão anterior os criou **de propósito**, para a troca de aba
não apagar o valor conferido. Vale rever se um volume atualizado no protocolo
deve vencer o rascunho digitado, mas isso é decisão de produto, não conserto de
bug — e mudar em silêncio seria desfazer o que foi pedido.
