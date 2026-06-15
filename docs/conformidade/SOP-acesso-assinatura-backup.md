# POP — Controle de Acesso, Assinatura Eletrônica e Backup (Agracta)

POP operacional alinhado a OECD No. 17/NIT-Dicla-038 (acesso, assinatura) e ISO/IEC
27001:2022 (A.5.15–5.18, A.8.5, A.8.13). Preencher `[ PREENCHER ]`, aprovar e treinar.

POP nº `[ PREENCHER ]` · Versão `[ PREENCHER ]` · Aprovado por `[ PREENCHER nome/data ]`

## 1. Controle de acesso
**Princípio:** uma pessoa = um login. **Proibido compartilhar login** (quebra a
atribuição ALCOA). Cadastro fechado — só o administrador cria contas.

**Conceder acesso a um técnico (admin):**
1. Menu ☰ → **Painel Admin** (senha do painel).
2. **"Criar acesso do técnico"** → e-mail + **nome completo** (obrigatório p/ auditoria)
   + senha (ou "Gerar"). Cria a conta no Supabase + perfil técnico.
3. Repasse as credenciais ao técnico por canal seguro. Ele entra em www.agracta.com.br.

**Revogar acesso (saída/desligamento):** Painel Admin → técnico → **"desativar acesso"**
(bane o login; **mantém o histórico** — recomendado p/ BPL). *(Requer a função
`remover-tecnico` publicada.)* Reativar: **"reativar acesso"**.

**Papéis:** `admin` (gere estrutura, contas, config) · `técnico` (registra trabalho de
campo). O servidor (RLS) impõe os papéis — técnico não altera estrutura nem apaga logs.

**Política de senha (definir no Supabase Auth):**
`[ PREENCHER: comprimento mínimo, complexidade, confirmação de e-mail on/off, 2FA? ]`

## 2. Assinatura eletrônica
- Ao concluir uma avaliação, o app pede a **rubrica** (assinatura por toque).
- O carimbo registra: **nome do assinante + significado ("Conferido e assinado") +
  data/hora**. Equivale à assinatura manuscrita (OECD No. 17 §assinaturas).
- **Avaliação assinada fica somente-leitura.** Para alterar: **"Reabrir para editar"** →
  exige **MOTIVO** (vai pra trilha) → a alteração **invalida a assinatura** e exige
  **nova rubrica**. Assim, todo dado assinado alterado é rastreável.
- Significado da assinatura usado: `[ PREENCHER: confirmar texto — "Conferido e assinado" / outro ]`

## 3. Backup e recuperação
**Camadas (defesa em profundidade):**
1. **Servidor (original):** Supabase/Postgres — registro de produção.
2. **Histórico de versões:** `app_state_history` guarda a versão anterior a cada
   gravação (~400 versões); trigger `app_state_guard`; **fora do alcance do usuário**.
3. **Diário local (aparelho):** menu ☰ → **"Recuperação de avaliações"** (IndexedDB,
   append-only) → **Exportar diário (JSON)**.
4. **Export periódico:** menu ☰ → **Backup (arquivo)** / **Exportar planilha**.

**Rotina de backup (definir):**
`[ PREENCHER: frequência do export (ex.: semanal), responsável, local de guarda (offline/segregado), retenção ]`

**Recuperação:**
- Item recém-excluído/alterado: **Histórico da nuvem** (menu) ou trilha do estudo.
- Restaurar versão anterior do banco: via `app_state_history` (Table Editor) — registrar
  a ação (quem/quando/por quê).
- Aparelho perdido: o dado já sincronizado está na nuvem; o não-sincronizado, no diário
  local daquele aparelho (se acessível).

**Teste de recuperação:** `[ PREENCHER: data do último teste de restauração e resultado ]`

## 4. Registros deste POP
Treinamento da equipe: `[ PREENCHER lista/datas ]` · Revisão: `[ PREENCHER periodicidade ]`
