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

## O que ainda não está aqui

Esta é a primeira etapa (casca + Estudos + Mapa, com Clima e Insights ligados
às telas que já existem). Continuam fora, e de propósito:

- a coluna de resumo do **Mapa** (parcela selecionada, fotos e anotações como
  painel lateral fixo, em vez de ficha sobre o mapa);
- a grade de cartões de estudo com miniatura e o alternador grade/lista;
- **Equipe** e **Biblioteca de conteúdos técnicos**: não fazem parte do
  Agracta, por decisão do dono do produto.
