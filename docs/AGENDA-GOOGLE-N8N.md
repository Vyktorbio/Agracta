# Agracta → n8n → Agenda Google

O Agracta usa os mesmos compromissos pendentes de `agCalItens(false)`: aplicações
programadas e avaliações ainda incompletas de estudos ativos. A integração é
opcional e começa desligada. Não cria avaliações ou altera o protocolo.

## Comportamento

- Cada compromisso tem um ID Google estável, baseado na quadra, estudo e
  identidade da atividade. Avaliações com ID mantêm o compromisso ao mudar de
  posição; reagendar altera o mesmo evento. Reenvio depois de resposta perdida
  consulta esse ID antes de criar, evitando duplicata.
- As datas são civis, em dia inteiro, com fim exclusivo no dia seguinte.
  Nenhuma hora de aplicação é inventada. Os eventos não bloqueiam o dia como
  ocupado. Configure os lembretes padrão da agenda Google de destino.
- Quando uma atividade é realizada, dispensada, excluída, ou seu estudo é
  finalizado, o compromisso já confirmado recebe o prefixo `Encerrado ·` e
  perde os lembretes. O evento permanece como histórico. Reabrir/reativar o
  compromisso atualiza o mesmo ID e restaura os lembretes padrão.
- Os eventos recebem apenas data, atividade, código/nome do estudo, quadra,
  local e link para o Agracta. Notas experimentais, doses, fotos e resultados
  não são enviados. Não há participantes, convites nem e-mails a terceiros.
- Edições no Google não retornam ao Agracta. O Agracta mantém suas datas.
- O automático roda enquanto o Agracta está aberto, autenticado e com os dados
  da nuvem prontos. Sem rede, os estudos continuam salvos normalmente e o envio
  é retomado ao abrir o app ou recuperar a conexão. Depois de sincronizados,
  os avisos Google funcionam com o Agracta fechado.

## Configurar no n8n

1. Tenha uma instância n8n acessível por HTTPS. Importe
   [`integrations/n8n/agracta-google-agenda.json`](../integrations/n8n/agracta-google-agenda.json).
   O workflow é importado **inativo**, sem credenciais.
2. Crie ou escolha uma agenda Google para os compromissos do Agracta. Uma agenda
   dedicada facilita mostrar/ocultar todos os ensaios e configurar lembretes.
   Em Google Agenda → Configurações → Integrar agenda, copie o ID. No nó
   **Agenda de destino**, substitua `CONFIGURE_O_ID_DA_AGENDA` por esse ID.
   `primary` também funciona, se você quiser usar sua agenda principal.
3. No n8n, configure **Google Calendar OAuth2 API** com a conta que pode editar
   essa agenda. Selecione a mesma credencial nos nós **Consultar compromisso**
   e **Gravar compromisso**, em Predefined Credential Type. O n8n guarda os
   tokens Google; eles não são copiados para o Agracta. A conexão Google do
   ChatGPT é independente e não pode ser reutilizada como credencial n8n.
4. No Agracta → Agenda → **Agenda Google**, use **Gerar chave**, **Mostrar chave**
   e copie o valor. No nó **Receber agenda**, crie uma credencial **Header Auth**:
   nome `Authorization`, valor `Bearer ` seguido dessa chave, com um espaço.
   O segredo deve ficar na credencial n8n e no formulário do Agracta, nunca no
   arquivo JSON, no repositório ou em parâmetro da URL.
5. No webhook → Options → Allowed Origins, mantenha a origem do seu Agracta.
   O JSON permite `https://agracta.com.br`, `https://www.agracta.com.br` e
   `https://vyktorbio.github.io`. Para testes locais, adicione a origem exata do
   servidor de teste. Se houver proxy na frente do n8n, ele deve responder
   corretamente ao preflight `OPTIONS` e permitir `Authorization` e
   `Content-Type` nas requisições dessa origem.
6. Publique/ative o workflow. Copie a **Production URL** do webhook para a URL
   no Agracta. A URL `/webhook-test/` não mantém uma automação em produção.
7. Selecione os locais, salve e use **Sincronizar agora**. Confira o evento e
   seus lembretes no Google antes de ligar o envio automático.

Para n8n Cloud, o login Google usa a configuração oferecida pela plataforma.
Na instalação própria, configure o aplicativo OAuth no Google Cloud e copie
exatamente a Redirect URL exibida pelo n8n. Habilite a Google Calendar API.
Se o consentimento OAuth ficar em modo de teste, confira as restrições de
renovação de token antes de usar a integração continuamente.

## Limites e operação

Configure **um aparelho publicador por conexão/agenda**. Os recibos e a chave
são isolados por conta autenticada e URL do n8n neste navegador; não fazem parte
do backup de estudos nem da sincronização Firestore. Dois publicadores com
estados diferentes poderiam aplicar datas antigas. A integração atual não é
uma fila central de servidor e não garante publicação com todos os aparelhos
fechados. Alterações offline são reconciliadas no próximo envio.

Mudar a URL do n8n abre um conjunto separado de recibos: não encerra eventos
na conexão anterior. Se mudar a agenda no nó n8n mantendo a mesma URL, use
**Sincronizar agora**, que reenvia todos os compromissos atuais. Preserve a
agenda antiga até conferir a transição. Pausar o automático mantém os eventos
e os lembretes que já estão no Google.

Um recibo só é gravado depois da confirmação Google devolvida pelo n8n para o
mesmo pedido e ID. Falha de rede, CORS, credencial, limite Google, conflito de
versão (`412`) ou resposta incompleta deixa o envio pendente. Uma criação que
retorne `409` será reconciliada pelo GET no reenvio. Se um evento tiver sido
excluído diretamente no Google, pode ser necessário restaurá-lo lá antes de
reutilizar seu ID. A integração nunca modifica um evento cuja marca privada
não corresponda à sua própria identidade.

## Verificação e manutenção

- `node test_agenda_google.js`: reenvio sem duplicação, mudança de data,
  encerramento/restauração, identificação estável, isolamento, erros de
  confirmação e execução dos nós de código do JSON importável.
- `node test_agenda_google_ui.js`: configuração desligada por padrão,
  autenticação, envio, falha, retomada e troca de conta no navegador simulado.
- `node tools/n8n-agenda-workflow.cjs`: regenera o JSON depois de alterar o
  contrato ou o núcleo. Não contém dependências comunitárias ou código remoto.
- `npm test -- --pull-request`: verificações gerais do Agracta.

Esses testes não substituem o teste com suas credenciais e sua instância n8n.
Nenhum evento real é criado pelos testes do repositório.

Referências oficiais:

- [Webhook n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [HTTP Request e credenciais predefinidas](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- [Google OAuth no n8n](https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/)
- [Google: criar eventos e fornecer ID próprio](https://developers.google.com/workspace/calendar/api/guides/create-events)
