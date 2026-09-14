# Casca de mesa — a coluna de seções da tela larga

`mesa.js` · `mesa.css` · `test_mesa.js`

## O problema

O Agracta foi desenhado para o talhão: uma tela de cada vez, o mapa ocupando
tudo e a navegação na altura do polegar. No campo isso está certo. Na mesa de
trabalho o mesmo desenho cobra um preço que no celular não existe — para trocar
de assunto é preciso fechar o que está aberto, e a próxima porta some da vista
enquanto se olha para a anterior.

## O que a coluna é

Uma barra fixa à esquerda, sempre visível, com seis seções:

| Seção | O que abre | Função que já existia |
|---|---|---|
| **Estudos** | Conhecimento, aba Estudos | `abrirConhecimento({aba:'estudos'})` |
| **Mapa** | fecha o que está por cima e devolve o mapa | `closeStudiesPanel`, `closeToday`, `closeDetail`, `closeSearch` e o "Fechar ×" do Conhecimento |
| **Clima** | painel de clima do local | `toggleClima()` |
| **Insights** | dossiê do estudo em foco, na estatística | `abrirConhecimento({qid,sid})` + seção `#ep-analises` |
| **Relatórios** | relatório completo do estudo em foco | botão `data-ep-action="report"` do dossiê |
| **Configurações** | a gaveta do menu | `agMenu(true)` |

## O que a coluna não é

**Não é tela nova e não é menu novo.** Nenhum item tem lógica própria: todos
chamam a porta que já existia. É por isso que ela não contraria a regra de
interface do `ROADMAP.md` §2 — a regra proíbe criar um menu por funcionalidade,
e aqui não há funcionalidade nenhuma nascendo.

**Não duplica portas.** Na mesa, os botões *Conhecimento* e *Menu* saem da
barra de baixo: quem manda neles passa a ser a coluna. Duas portas para a mesma
tela, com poderes diferentes, já ensinou alguém a procurar no lugar errado uma
vez — é o que o `test_atalho_conhecimento.js` tranca.

**Não existe no celular.** A folha `mesa.css` inteira mora dentro de
`@media (min-width:1100px)`, e o `mesa.js` só põe a classe `.mesa` no `<html>`
quando a tela é larga **e** a autenticação já aconteceu. Abaixo disso, ou antes
de entrar, o app é exatamente o de antes — inclusive os botões que a mesa
esconde.

## Duas contas que não são óbvias

**1. Posição fixa ignora o `padding` do body.** O app ao lado da coluna é
deslocado com `padding-left` no `body`, mas todo painel `position:fixed` com
`inset:0` continuaria colado na borda da janela, por baixo da coluna. Por isso
`mesa.css` lista, um a um, os painéis de tela cheia que recuam o próprio
`left`. Essa lista não é de confiança: o `test_mesa.js` varre as folhas de
estilo atrás de regras `position:fixed` com `inset:0` e reprova qualquer painel
que não esteja nela. Um painel novo em tela cheia nasce, assim, obrigado a se
declarar — a falha seria só visual, e nenhum teste de lógica a pegaria.

**2. O mapa mede a caixa uma vez e guarda.** Entrar ou sair da coluna muda a
largura do mapa sem disparar `resize`, e o Leaflet continuaria pintando no
tamanho antigo. `mesa.js` chama `invalidateSize()` toda vez que a coluna entra
ou sai.

## Insights e Relatórios pertencem ao estudo

Não existe "insight" solto: análise, forense e relatório são de um estudo. A
coluna guarda qual estudo está em foco — o dossiê aberto (lido do próprio DOM,
para coluna e tela nunca discordarem) ou o último aberto neste uso. Sem estudo
nenhum, essas duas seções **dizem isso e levam para Estudos**, em vez de abrir
uma tela vazia que parece defeito.

## O mapa na mesa

`mapa-mesa.js` · `mapa-mesa.css` · `test_mapa_mesa.js`

No celular o mapa é a tela inteira e todo o resto é janela que cobre — o certo
com uma mão e cinco polegadas. Na mesa sobra lateral, e o que era janela fica à
vista o tempo todo. **Nada cobre o mapa inteiro**, e nada aqui é tela nova:

| Painel | O que é, de verdade |
|---|---|
| **Ferramentas do mapa** (topo à esquerda) | a própria gaveta do `ui-campo.js`, ancorada e já aberta. Os interruptores e a sincronização continuam sendo os de lá; só muda onde a caixa fica |
| **Ficha da quadra** (coluna à direita) | o mesmo `#dOvl`, que deixa de ser modal |
| **Estado das parcelas** (rodapé à esquerda) | a legenda das cores da máscara, com as contagens reais |
| **Controles** (à direita) | zoom, GPS, norte e tela cheia, chamando `agZoom`, `agGps`, `agRotSet` e `toggleFullscreenMap`; mais a escala métrica do Leaflet |

Três cuidados que o teste tranca:

- **a ficha ancorada não captura o ponteiro.** Ela é o mesmo overlay que era
  modal: se voltar a capturar, o mapa inteiro morre por baixo de um retângulo
  transparente — dá para ver o talhão e não dá para clicar nele. O overlay fica
  com `pointer-events:none` e só o painel recebe cliques;
- **a legenda conta o que a tela está pintando** — as quadras do local ativo,
  pelo mesmo motor que pinta os polígonos. Contar o banco inteiro diria um
  número que o mapa não mostra. Parcelas e quadras aparecem como unidades
  separadas: somá-las daria um total sem significado;
- **o painel de ferramentas para antes da legenda.** Cobri-la esconderia
  justamente o que explica as cores embaixo dele.

## Clima como página

`clima-pagina.js` · `clima-pagina.css` · `test_clima_pagina.js`

No celular o clima é um cartão flutuante sobre o mapa — de relance, no talhão,
é o certo. Na mesa, quem decide *quando aplicar* precisa de mais: quanto choveu
no mês, como a umidade andou, que estações existem por perto e que horas de
amanhã servem. A seção **Clima** da coluna passa a abrir uma página com cinco
abas: visão geral, previsão, histórico, janela de aplicação e estações.

### Três naturezas de dado que não podem se misturar

| Rótulo na tela | O que é |
|---|---|
| **MEDIDO** | sensor da estação Ecowitt, agora |
| **PREVISTO** | modelo (Open-Meteo), para frente no tempo |
| **REANÁLISE** | modelo, para trás no tempo — **não** é a medição do que ocorreu na quadra |

Cada bloco carrega o seu rótulo. Um número de modelo exibido como se fosse do
sensor é o erro caro desta tela: parece igual, e é a base de uma decisão de
aplicação.

As **horas de molhamento** são estimativa — horas com UR ≥ 90 % — e a regra
aparece ao lado do número. Não há sensor de molhamento foliar aqui, e chamar de
medido um limiar de umidade seria dar autoridade de sensor a uma conta.

### A janela desta página é prospectiva

Ela lê a previsão hora a hora das próximas 48 h contra limites genéricos de
recomendação (vento ≤ 10 km/h · UR 50–90 % · 15–30 °C · sem chuva na hora), e
mostra quais limites usou. **Não** substitui a janela declarada de um protocolo:
essa vive no estudo e é conferida pelo `JanelaCore`, que compara o declarado com
o ocorrido. Quando as duas discordarem, quem manda é o protocolo — e a página
diz isso.

### Os gráficos

Três formas simples em SVG inline, sem biblioteca: barras para precipitação,
duas linhas para temperatura máxima e mínima, uma linha para umidade. As cores
de série foram conferidas pelo validador de paleta nos **dois** temas (banda de
luminosidade, croma, separação para daltonismo e contraste com a superfície) —
o tema escuro tem passos próprios, não é o claro invertido. Verde e azul nunca
dividem o mesmo gráfico. Cada marca leva título e rótulo acessível, duas séries
sempre trazem legenda e rótulo direto na ponta, e a tabela dos 30 dias fica a um
clique: cor sozinha nunca é a única leitura.

## O que ainda não está aqui

Esta é a primeira etapa (casca + Estudos + Mapa, com Clima e Insights ligados
às telas que já existem). Continuam fora, e de propósito:

- a grade de cartões de estudo com miniatura e o alternador grade/lista;
- **Equipe** e **Biblioteca de conteúdos técnicos**: não fazem parte do
  Agracta, por decisão do dono do produto.
