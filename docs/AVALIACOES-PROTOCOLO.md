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
