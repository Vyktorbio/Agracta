# Avaliações e controles no protocolo

Na ficha operacional, **Protocolo: avaliações e controles** configura:

- Papel de cada tratamento: experimental, testemunha sem intervenção, referência sem alvo/inoculação ou controle positivo/padrão.
- Variáveis, tipo, subamostras e N padrão para razões.
- Tratamentos aplicáveis e datas específicas (vazio = todas).
- Resultado descritivo ou cálculo frente a uma referência explícita por variável.
- Escalas: limites, legenda e resultado em notas ou índice percentual.

Uma célula vazia continua pendente; zero é leitura; **—** significa não aplicável. O modo guiado pula os campos não aplicáveis. Eles não entram em médias ou análises numéricas.

## Alterações em registros existentes

Novas avaliações recebem o protocolo. Avaliações já cadastradas só mudam se forem selecionadas no editor. A revisão enumera as datas afetadas antes de salvar e exige motivo para a trilha. Não se convertem vazios em ausências por inferência.

A atualização é recusada quando ocultaria uma leitura, mudaria seu tipo/escala/subamostras ou alteraria uma avaliação assinada. Valores derivados antigos permanecem na interpretação anterior: não são convertidos para notas retrospectivamente. Protocolos aprovados geram emenda pelo fluxo existente.

No ensaio com soja, lesmas e pellets, marcar manualmente T1 como referência sem alvo, T2 como testemunha sem intervenção; declarar T1 e T2 não aplicáveis para as medidas dos pellets. Não existe migração automática do ensaio de produção.

## Operação

- Modo automático disponível sem randomização, no campo e na bancada. Ativá-lo não gera uma randomização.
- Avaliações recolhíveis; comparação com a referência fica em uma seção separada.
- Tabelas largas têm botões de rolagem, além da rolagem nativa.
- Estatística inferencial inicia pelo botão. Mudar os dados invalida a autorização anterior para recalcular; é necessário clicar novamente.
- Triagem local exibe alertas durante a digitação. A triagem forense completa continua assíncrona, pelo motor existente; o primeiro carregamento não é instantâneo. Alertas não constituem prova de erro ou fraude.
- “Ver no campo” abre parado. Rodar/Pausar usa a mesma raiz para animação, barra temporal e painel, na vista embutida e na janela.

## Verificação

Regressões em `test_protocolo_avaliacoes.js`, `test_protocolo_avaliacoes_ui.js`, `test_ficha_parcela.js`, `test_campo3d_reproducao.js`, `test_forense_dominio.js` e `test_forense_por_variavel.js`. O teste de reprodução usa Canvas simulado; não substitui a conferência visual em celular e desktop antes do merge.

Este PR não altera dados do servidor nem publica o app.

## Lançamento: o que a grade recusa (outubro/2026)

A grade **não ajusta** valor digitado: o que está errado é recusado, com aviso, e a célula fica vazia. Ajustar inventaria um dado com cara de lido.

| Digitado | Antes | Agora |
|---|---|---|
| `150` numa % | virava 100 | recusado: passa de 100% |
| `12` numa escala 0–9 | virava 9 | recusado: fora da escala |
| `-2` | virava 0 | recusado |
| `2,7` numa contagem | virava 2 | recusado: contagem é inteiro |
| `1.200` numa contagem | virava 1 | vale **1200** (ponto de milhar) |
| `1.250` numa % ou medida | virava 1,25 | recusado: ambíguo, use vírgula |
| `12a`, `1,5,3` | viravam 12 e 1,5 | recusados: não é número |
| n = 25 com N = 20 | virava 100% | recusado: n maior que N |

Durante a digitação (subamostras, modo automático) a leitura é silenciosa: "1," é número pela metade. O aviso aparece ao sair do campo. Ao salvar a grade, o app diz quantos valores não foram gravados.

### Agenda

- **Aplicação planejada × registrada.** Antes, a aplicação só contava como feita se o registro caísse a até 2 dias da data planejada. Uma aplicação atrasada 3 dias pela chuva ficava pendente para sempre. Agora cada aplicação planejada tem uma janela: começa um pouco antes da data (metade do intervalo, no mínimo 2 dias) e vai até o começo da janela da próxima. Cada registro cumpre uma aplicação só.
- **Lembrete dispensado** de avaliação fica preso ao id da avaliação, não à posição dela na lista. Antes, excluir uma avaliação anterior fazia a dispensa passar para a avaliação seguinte.

Testes: `test_tipo_numero.js`, `test_avaliacao_tipos.js`, `test_ficha_parcela.js`, `test_runtime.js`, `test_agenda_aplicacao_janela.js`.
