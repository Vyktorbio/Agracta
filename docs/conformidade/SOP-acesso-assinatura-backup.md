# POP — Acesso, Assinatura Eletrônica, Cópia de Segurança e Restauração (Agracta)

POP nº `[ PREENCHER ]` · Versão 2.1 (modelo de 16/10/2026) · Aprovado por `[ PREENCHER nome, data ]`

Alinhado a OECD Nº 17 / NIT-Dicla-038 (acesso, assinatura) e ISO/IEC 27001:2022
(A.5.15–5.18, A.8.5, A.8.13). Detalhe técnico na
[validação do sistema](../VALIDACAO-SISTEMA.md).

## 1. Controle de acesso

**Princípio:** uma pessoa, um login. **Proibido compartilhar login** — quebra a
atribuição (ALCOA+). Só o administrador cadastra quem pode usar.

**Quem pode administrar:** os dois e-mails de administrador fixos nas
`firestore.rules`. Trocá-los exige publicar as regras de novo (lacuna L7).

**Papéis:** cada pessoa é **técnico**, **supervisor** ou **diretor**
(técnico < supervisor < diretor; o administrador pode tudo). Cadastro novo,
ou antigo sem papel, é técnico. O papel se escolhe na linha da pessoa, no
Painel Admin, e vale na hora.

**Quem pode o quê:** no Painel Admin, abaixo da lista de contas, a tabela
diz o papel mínimo de cada ação. Começa assim (escolha de 16/10/2026):

| Ação | Papel mínimo | Quem confere |
|---|---|---|
| Corrigir avaliação assinada por outra pessoa | supervisor | tela |
| Corrigir a avaliação que a própria pessoa assinou | técnico (opção ligada) | tela |
| Reabrir estudo finalizado | supervisor | banco |
| Excluir estudo, aplicação ou avaliação | supervisor | banco |
| Voltar o banco a uma versão anterior | supervisor | tela |
| Aprovar protocolo | diretor | banco |
| Emendar protocolo aprovado | diretor | banco |
| Finalizar estudo | diretor | banco |

Mudar a tabela é decisão da Instalação de Teste: registrar quem decidiu e
quando `[ PREENCHER: onde ]`. O botão "Salvar tabela" grava também quem
salvou e a hora do servidor.

**Conceder acesso (administrador):**
1. Menu ☰ → **Painel Admin** (só aparece para administrador).
2. **Criar acesso do técnico**: e-mail + **nome completo** (é o nome que sai na
   trilha e nas assinaturas) + senha (ou gerar).
3. Repassar a senha por canal seguro. A pessoa entra em https://agracta.com.br.
4. Se o trabalho tem horário, definir a **janela** (dias e horas) da pessoa no
   mesmo painel. Fora da janela o banco recusa leitura e gravação; o app avisa
   10 minutos antes, sincroniza e trava.

**Revogar acesso (saída, afastamento):** Painel Admin → pessoa → **desativar**.
Vale na operação seguinte, em qualquer aparelho. O cadastro (nome, janela) fica,
e pode ser reativado. **Apagar** o cadastro é só para cadastro de teste ou
e-mail errado — para quem trabalhou em ensaio, desative. A trilha não depende do
cadastro: nome e e-mail de quem registrou ficam no próprio registro.

**Senha esquecida:** Painel Admin → pessoa → **redefinir senha** (o Firebase
manda e-mail de redefinição).

**Política de senha e segundo fator:** `[ PREENCHER: comprimento mínimo,
troca periódica, uso de conta Google com verificação em duas etapas ]`

**Revisão de acessos:** a cada `[ PREENCHER: 3 ]` meses, o administrador confere
a lista de cadastros ativos contra a equipe atual e registra (IQ-06 da validação).

## 2. Assinatura eletrônica

- **O que se assina:** a avaliação (ao concluir), a finalização do estudo e a
  aprovação do protocolo.
- **O que a assinatura é:** o SHA-256 do conteúdo assinado junto com nome,
  e-mail, significado e data/hora. Se o conteúdo mudar depois, a assinatura
  deixa de conferir e o app mostra isso.
- **Quem assina** é a pessoa logada naquele aparelho. Assinar avaliação é um
  toque; **finalizar, aprovar protocolo, reabrir, excluir e restaurar pedem a
  senha** de novo. `[ PREENCHER: o laboratório aceita assinatura de avaliação
  sem senha? — lacuna L4 ]`
- **Significado** registrado: `[ PREENCHER: confirmar o texto — ex.: "Conferido e assinado" ]`
- **Corrigir dado assinado:** **Reabrir para editar** → escrever o **motivo**
  (sem motivo não reabre) → corrigir → assinar de novo. Cada célula alterada vira
  um evento com de → para, autor, hora e motivo.
- **Estudo finalizado** fica somente leitura. Reabrir pede senha e motivo e fica
  registrado como evento.
- **Não deixar o aparelho desbloqueado e logado** sem supervisão: quem estiver
  com ele assina pela pessoa logada.

## 3. Cópia de segurança

**Camadas:**
1. **Banco (registro original):** Firestore, projeto `agracta-vyktorbio`.
2. **Histórico de versões no servidor:** a versão anterior de cada documento a
   cada gravação, só por acréscimo. Menu ☰ → **Histórico da nuvem**.
3. **Cofre no aparelho:** cópia local para trabalhar offline; menu ☰ →
   **Recuperação de avaliações** mostra o que está guardado ali.
4. **Arquivo exportado:** Menu ☰ → **Backup (arquivo)** gera um JSON com tudo.
5. **Backup agendado do Firestore:** `[ PREENCHER: existe? depende do plano — IQ-07 ]`

**Rotina:** `[ PREENCHER: frequência do export (ex.: semanal e a cada estudo
finalizado), responsável, local segregado fora do Firebase, retenção ]`

**Fotos de parcela** ficam no aparelho que fotografou e não sobem para a nuvem.
`[ PREENCHER: se foto é dado bruto, quando exportar ("Slides e originais") e
onde arquivar — lacuna L9 ]`

## 4. Restauração

- **Voltar o banco a um estado anterior:** Menu ☰ → **Histórico da nuvem** →
  escolher a gravação → confirmar com senha. O estado atual é guardado no
  aparelho antes, e a própria restauração entra no histórico como gravação nova
  (dá para desfazer). Registrar quem, quando e por quê `[ PREENCHER: onde ]`.
- **Documento grande demais** para o histórico aparece como irrecuperável na
  tela de restauração — o app diz isso em vez de fingir que voltou.
- **Aparelho perdido:** o que já sincronizou está no banco; basta entrar em
  outro aparelho. O que não sincronizou existe só no cofre do aparelho perdido.
  Por isso: **sincronizar ao sair de área sem sinal** (o selo de sincronização
  no app mostra pendências).
- **Teste de restauração:** `[ PREENCHER: data do último teste e resultado ]`
  (OQ-09 da validação).

## 5. Registros deste POP

Treinamento da equipe: `[ PREENCHER lista e datas ]` · Revisão do POP: `[ PREENCHER periodicidade ]`

## Histórico

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 14/06/2026 | Emissão inicial |
| 2.1 | 16/10/2026 | Papéis e a tabela "quem pode o quê" |
| 2.0 | 11/10/2026 | Reescrito para a arquitetura atual: cadastro e janela no Firebase, desativar × apagar, assinatura por SHA-256, ações que pedem senha, histórico da nuvem e restauração, fotos no aparelho |
