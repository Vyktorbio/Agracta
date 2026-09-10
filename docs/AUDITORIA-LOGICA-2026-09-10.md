# Revisão de lógica — 10 de setembro de 2026

Base revisada: produção `85662110a4235e598c9b9d19abd6502ecb21d9ea`.
Revisão direcionada às calculadoras, entrada de dados estatísticos, abertura da
análise e sincronização. Os cenários abaixo foram reproduzidos em dados sintéticos;
não há evidência de que tenham afetado registros reais de um estudo.

| Prioridade | Falha reproduzida | Consequência | Correção |
|---|---|---|---|
| Alta | `0.033%` lido como `33%`; `500 mg/ha` lido como `500 g/ha` | Dose multiplicada por 1.000 | Preservar decimal e reconhecer a unidade inteira; unidades não suportadas são recusadas |
| Alta | Dose estruturada `1,5abc` aceita como `1,5` | Preparo liberado a partir de entrada inválida | Validar o número completo na receita e no núcleo de mistura |
| Alta | Eventos 0/1 com total de 30 classificados como indivíduo binário | O denominador era descartado; 1/30 podia ser tratado como 1/1 | O total declarado define a rota binomial; impedir mudança de tipo que o ignore |
| Alta | Texto inválido descartado e bloco/tratamento vazio aceito no GLM | Modelo ajustado com linhas removidas ou categoria fictícia | Recusar entrada inválida e identidade ausente; informar exclusões de respostas realmente ausentes |
| Alta | Confirmação antiga da nuvem após uma nova edição | Cofre podia ser regravado com estado anterior e a edição nova aparecer como salva | Serializar envios, preservar o estado atual no cofre e encaminhar a edição pendente |
| Alta | Último lote, que anuncia a nova revisão, enviado em paralelo com os anteriores | Outro aparelho podia iniciar a leitura antes de todos os lotes terminarem | Publicar a revisão somente depois dos lotes precedentes; falha interrompe a sequência |
| Alta | CSS do modo automático aplicado também a “Configurar análise” | Seletores e botão Analisar ficavam escondidos | Limitar as regras ao parâmetro do motor automático |
| Média | Incluir produto no rótulo perdia a seleção da testemunha | Configuração interrompida ou seleção refeita | Preservar o identificador, inclusive quando o controle foi escolhido manualmente |
| Média | Núcleo do drone aceitava 100 mL preparados para mínimo de 1.700 mL | Conferência isolada podia aprovar carga insuficiente | Conferir preparo mínimo e quantidade para uma parcela; manter a mesma leitura da carga na tela e na memória |

## Evidência e regressões

- `test_calculo_entradas.js`: 0,033% de 1.700 mL = **0,561 mL**, com ponto ou
  vírgula; milhar PT-BR; unidade desconhecida; números malformados.
- `test_drone.js` e `test_drone_fluxo.js`: carga mínima, interpretação da vazão,
  receita exibida e memória gravada usam as mesmas quantidades.
- `tests/motor_entradas.py`: proporção estimada confrontada com eventos/total em
  cada tratamento; rejeição de texto, identidade ausente e porcentagem impossível.
  Executado no Python/WASM e bibliotecas entregues ao aparelho.
- `test_estatistica_visibilidade.js`: estilos reais, após carregamento de dados,
  nos modos configurável e automático. É teste DOM/CSS, não teste visual em navegador.
- `test_estatistica_planejada.js`: controle permanece ligado ao identificador,
  mesmo após troca do rótulo; datas e parcelas continuam preservadas.
- `test_sync_envio_pendente.js`: rede lenta, edição durante envio, conclusão
  antiga, ordem dos lotes e falha antes da publicação da revisão. Transporte
  e relógio simulados; nenhum dado real foi escrito para reproduzir os casos.

## Trabalho já existente e limites

A falha de visibilidade e a perda da pré-seleção do controle também constam da
[revisão #53](https://github.com/Vyktorbio/Agracta/pull/53), que estava em rascunho
durante esta auditoria. Esta alteração inclui o conserto de acesso à tela; há
sobreposição com os arquivos de interface dessa revisão. As mudanças de testes
e de modo de execução de `conferir.sh` propostas ali não foram incorporadas aqui.

`estatistica/sw.js` continua sem registro ativo: o cache efetivo da estatística
é gerido pelo service worker da raiz. Nesta entrega, os caches e referências da
raiz foram atualizados. A presença do segundo arquivo é uma dívida de manutenção.

Não foram alterados dados de estudo, credenciais, regras de acesso ou cálculos
históricos. As correções valem para novos cálculos e novas operações. Não foi
feita uma auditoria retrospectiva dos estudos nem revisão visual em navegador.
Esta revisão não demonstra ausência de outros defeitos.
