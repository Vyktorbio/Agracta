# Relatório do estudo e exportação para R

Acesso: Conhecimento → Estudos → abrir estudo → Relatório completo e R.

O relatório é uma cópia de leitura dos registros no instante em que a janela é aberta. Não normaliza o estudo, não recalcula estatística e não modifica notas, finalizações ou auditoria. Para incorporar cálculos que terminaram depois, reabrir a janela.

## Formatos

- Word: arquivo DOCX nativo, texto e tabelas editáveis, cabeçalhos de tabela repetidos, figuras incorporadas.
- PDF: prévia local e impressão do navegador; selecionar Salvar como PDF conforme as opções do aparelho.
- Markdown: ZIP com relatorio.md e figuras JPEG referenciadas por caminhos relativos.
- R: ZIP com CSV UTF-8, script importar.R sem dependências externas, LEIA-ME e registros_completos.json.

## Conteúdo e cobertura

Identificação, protocolo, tratamentos, parcelas, aplicações, avaliações, resultados descritivos, situação das análises, relatórios estatísticos disponíveis, fechamento, contexto de solo e geometria, custos e consumos, notas da área, auditoria e anexo campo a campo do estudo. Resultados e arquivos de outros estudos não são agregados. Ausência de um registro é explicitada. A saída não representa aprovação ou conclusão científica automática.

O anexo mantém os campos estruturados do estudo exportável. Valores binários inline (data/blob) recebem marcador; documentos externos não são buscados. Fotos da galeria local podem ser incorporadas opcionalmente, com tratamento, repetição, parcela e avaliação identificados. As figuras dos resultados são descritivas e organizadas por avaliação e variável. O responsável deve revisar a interpretação e as lacunas.

Nomes cegados usam a projeção de Conhecimento. Não se exporta o cadastro inteiro de itens nem credenciais. Não é um exportador de backup para restauração do sistema.

## Contrato para R

Uma linha por parcela × avaliação × variável em observacoes.csv. Zero numérico é conservado, ausência tem valor vazio e estado ausente; texto não numérico tem estado nao_numerico. valor_original mantém a escrita. IDs permanecem texto no importador. Parcelas sem identificação de campo ficam vazias, sem randomização nova.

Avaliadores estão separados em avaliadores.csv. Subamostras e razões n/N estão em subamostras.csv: identificação da parcela, variável, campo JSON Pointer dentro da célula e valor. Índices do array sub começam em 0. Não tratar esses registros como repetições independentes.

metadados.csv conserva os campos estruturados; registros_completos.json preserva o snapshot exportável. Notas legadas fora da grade esperada não são descartadas do snapshot, mesmo que não possam ser associadas automaticamente à tabela principal. resultados.csv contém resumos e não substitui observacoes.csv numa análise.

Extrair o ZIP, abrir um projeto R na pasta e executar source("importar.R"). Escolher avaliação, variável e modelo apropriado. O importador não escolhe ANOVA, transformação ou delineamento pelo usuário.

## Fotos e privacidade

O iframe relatorio-local.html usa CSP connect-src 'none' e recebe apenas dados do estudo em uma mensagem do pai autenticado. Lê fotos da chave [usuário, quadra, estudo] no IndexedDB, sem devolvê-las à aplicação. Ao sair ou mudar de usuário, a janela é destruída. Word e Markdown incorporam as fotos escolhidas por opção local; pacote R não contém fotos. Os downloads ficam no aparelho.

## Validação

Testes verificam zeros, ausências, vírgula decimal, uma repetição, parcelas randomizadas, leituras separadas, subamostras, CSV, estruturas DOCX, rejeição de contexto externo, download de formatos, impressão e ausência de transmissão. Testes da página cobrem nomes cegados, credenciais e isolamento entre estudos. A renderização de um DOCX de exemplo verifica tabelas, páginas e figuras. A chamada de impressão é testada, mas o diálogo de impressão depende do sistema operacional. O script R é inspecionado e seus CSV são validados; execução em R nativo depende de instalação externa.
