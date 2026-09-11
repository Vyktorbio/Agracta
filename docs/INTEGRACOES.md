# Conhecimento experimental

O menu **Dados → Conhecimento** conecta o acervo existente por produto/ativo, alvo e projeto. A ficha de um item abre seus resultados; a ficha de estudo abre resultados e contexto. Não há migração nem alteração automática dos estudos ao consultar.

## Resultados e identidade

Uma linha corresponde a estudo, tratamento, avaliação e variável, com dose, método, n, média e desvio-padrão amostral. Valores vazios não são zero. Não há média geral entre ensaios, ranking de eficácia, teste de significância ou inferência de EC50 a partir desses resumos.

O controle usa a função existente do aplicativo e exige testemunha explicitamente marcada. Hora/dia após tratamento só aparece quando o protocolo declarou HAT/DAT. O usuário deve conferir delineamento, independência das unidades, variável e escala antes de comparar. O gráfico da área do cliente compara médias da mesma avaliação, começando em zero; não indica significância.

Produtos ligados ao banco têm identidade pelo ID. Ativos usam a tabela ISO já embarcada. Nomes livres permanecem separados; a consulta não faz associação aproximada. Vínculos históricos confirmados no banco são respeitados sem editar estudos finalizados. Códigos cegos ocultam o nome e os ativos na consulta e na projeção do cliente.

## A aba Estudos

A aba lista todos os estudos do acervo com a situação de cada um — **Em execução** ou **Finalizado** — e um filtro por situação com a contagem de cada grupo. A contagem é do acervo inteiro, não do que o filtro mostra. Em execução vem primeiro: a lista é de trabalho pendente, e o arquivo vem depois. Estudos finalizados exibem a data da finalização e quem assinou.

Cada estudo oferece **Abrir**, **Finalizar** ou **Reabrir** (conforme a situação) e **Excluir**. Nenhuma dessas ações é implementada aqui: cada botão fecha a consulta e chama a mesma função do aplicativo que a ficha do estudo chama, com a senha, a rubrica e o motivo que ela já exige. Uma segunda porta de exclusão, sem trilha, seria pior do que não ter botão nenhum — por isso o teste `test_conhecimento_estudos.js` verifica que a ação chamada é a do aplicativo, com o estudo certo, e que a tela de conhecimento continua apenas lendo.

Estudo finalizado não pode ser excluído direto. A exclusão passa a exigir **Reabrir** antes, que pede senha e registra o motivo na auditoria — sem isso a baixa de um estudo assinado e com a estatística congelada não deixaria rastro do porquê. O aviso diz esse caminho. As demais listas de estudos (histórico da área, estudos do projeto, resultados filtrados) continuam sem botões de ação.

## Ambiente, solo, laboratório e custo

- Aplicações e avaliações mostram o clima registrado, origem, leitura instantânea/resumo diário e defasagem. Chuva pós-aplicação informa cobertura e janelas parciais. NDVI é contexto da área, com a data da imagem, sem atribuição a uma parcela menor que sua resolução.
- O solo usa o último laudo datado até o início do estudo, com unidades e profundidade. Laudos posteriores não descrevem retroativamente o solo inicial. O histórico inclui estudos anteriores da mesma quadra.
- Projeto, material biológico, origem, lote/geração/passagem e método ligam laboratório e campo. São metadados auditados; não autorizam combinar estatisticamente experimentos distintos.
- Quantidades baixadas dos lotes recebem preço na unidade registrada. A interface identifica baixas derivadas da memória de cálculo; elas não são mensurações independentes de consumo. Não há conversão entre massa e volume sem dados. Custos de equipe, equipamento e serviços podem ser registrados e estornados. Há subtotal por estudo, tratamento e aplicação; despesas gerais não são rateadas automaticamente.

Contexto e custos são eventos com ID, responsável e timestamp. A sincronização une eventos por ID para preservar lançamentos concorrentes. Estudos finalizados permanecem em leitura; é preciso usar o fluxo existente de reabertura para editar ou excluir.

## Consulta do cliente

O administrador abre a aba **Clientes**, seleciona estudos e e-mails, revisa a seleção e confirma a liberação. A tela cria um link `cliente.html?portal=...`. A criação não envia convite por e-mail automaticamente.

O cliente entra nessa página com o endereço autorizado. No primeiro acesso, cria sua conta e confirma o endereço pelo Firebase Auth. O aplicativo principal não é carregado: não há leitura de `workspaces/agracta`, mapa, backup ou biblioteca interna. Criar uma conta não concede acesso à pesquisa.

As regras exigem e-mail verificado, vínculo ativo na consulta, versão vigente do acesso, consulta ativa e estudo selecionado. A configuração só pode ser alterada pelos administradores definidos nas regras existentes. Retirar um estudo ou revogar a consulta bloqueia novas leituras quando as regras/alterações se propagam. Informações já vistas ou copiadas por alguém não podem ser recolhidas.

São compartilhados nome/código do estudo, cultura, alvo, local, métodos, tratamentos, doses, resultados descritivos, ambiente e pendências. Comparadores do protocolo também aparecem: a revisão deve conferir toda a seleção. Dados brutos, auditoria, coordenadas, custos, contatos e propriedades licenciadas não entram na projeção.

Com atualização automática habilitada, uma sincronização bem-sucedida da equipe atualiza as cópias dos estudos previamente autorizados. O publicador usa a cópia confirmada e transação de Firestore; não publica lançamentos ainda em edição nem recria uma revisão mais antiga. Depende de um aparelho da equipe sincronizar com esta versão; não é uma função de servidor que observa alterações feitas fora do aplicativo. A página exibe a última publicação confirmada e exige conexão para verificar acesso.

## Fontes externas

**Agrofit:** a base aberta do MAPA já é embarcada em `data/agrofit*.json`. O novo workflow verifica atualizações às segundas-feiras e também pode ser executado manualmente. Uma mudança abre PR; não integra nem publica automaticamente. O repositório precisa permitir que Actions crie pull requests. A atualização não exige token AgroAPI e não altera protocolos existentes. A data exibida é a geração da cópia distribuída, não uma garantia de vigência da bula.

**PPDB:** nenhum dado foi copiado ou raspado. A aba Fontes importa JSON licenciado para um item explicitamente selecionado, após revisão e confirmação da autorização. Isso prepara a entrada de dados, mas não constitui uma conexão API automática com a PPDB. A integração direta depende da autorização e do meio de acesso que o provedor fornecer. [Condições da PPDB](https://sitem.herts.ac.uk/aeru/ppdb/en/support_cite.htm).

Formato de importação: objeto com `schema: 1`, `itemId`, `fonte`, `url` HTTPS sem credenciais, `licenca`, `consultadoEm` no formato AAAA-MM-DD e `propriedades`. Cada propriedade declara `nome`, `valor` numérico, `unidade`, `condicoes` e `referencia`. Limites: 250 kB e 100 propriedades. A importação substitui o conjunto anterior após revisão. Valores ambientais não viram recomendação de dose.

## Validação e publicação

1. `npm install --ignore-scripts --no-audit --no-fund`.
2. `npm test`: portão existente, incluindo testes de projeção, matemática, cegamento, interfaces e revogação de callbacks.
3. `npm run test:regras`: testes adversariais no emulador Firestore local, projeto `demo-agracta-integracoes`. Requer Java 17+ com firebase-tools 14; o CI usa Java 21. Não usa dados nem credenciais de produção.
4. Antes de ativar a consulta do cliente, publicar `firestore.rules` no projeto correto (`firebase deploy --only firestore:rules --project agracta-vyktorbio`, em sessão autorizada) e publicar os arquivos estáticos pelo fluxo atual do repositório. O cliente falha fechado sem as novas regras.
5. Conferir com duas contas de teste que cada uma vê somente sua seleção; testar remoção, revogação e atualização após uma sincronização. Nenhum acesso de cliente real é criado durante os testes automatizados.

O service worker mantém `cliente.html` em sua própria chave. Abrir a consulta não sobrescreve `index.html` no cache. O HTML público contém somente a interface; os resultados vêm de Firestore após autorização.
