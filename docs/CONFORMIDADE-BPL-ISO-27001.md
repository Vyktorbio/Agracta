# Agracta — Conformidade BPL/GLP + ISO/IEC 27001 (dossiê mestre)

> Documento de referência da Instalação de Teste. Versão controlada — registre alterações no fim.
> Alinhado às fontes oficiais:
> - **OECD GLP** — *OECD Principles of Good Laboratory Practice* (Doc. Nº 1) e **NIT-Dicla-035** (tradução Inmetro).
> - **OECD — Sistemas computadorizados** — *Application of GLP Principles to Computerised Systems*, **Advisory Document Nº 17 (2016)** / **NIT-Dicla-038**.
> - **OECD — Integridade de Dados** — *OECD Advisory Document on GLP Data Integrity*, **Nº 22 (2021)** — princípios **ALCOA+**.
> - **ISO/IEC 27001:2022** — SGSI (cláusulas 4–10) + **Anexo A** (93 controles em 4 temas).

---

## 1. Escopo e identificação do sistema

| Campo | Valor |
|---|---|
| Sistema | **Agracta** — registros de ensaios de campo (BPL), mapa + NDVI |
| Tipo (OECD Nº 17) | Sistema **customizado** (desenvolvido sob medida) — exige validação do ciclo de vida e revisão de código |
| Categoria de dados | **Dados brutos eletrônicos** de estudos de campo (avaliações, aplicações, observações, carimbos clima/GPS/NDVI) |
| Hospedagem | App estático (GitHub Pages, HTTPS) · Backend Supabase (Postgres + Auth + Realtime) · Proxy NDVI (Render) |
| Instalação de Teste | _[preencher: razão social, endereço, reconhecimento BPL Cgcre/Inmetro nº ...]_ |
| Responsável pelo sistema (System Owner) | _[preencher]_ |
| Administrador técnico | machadovictorchaves@gmail.com |

---

## 2. Integridade de dados — ALCOA+ (OECD Nº 22) × como o Agracta atende

| Atributo ALCOA+ | Exigência | Como o Agracta atende | Status |
|---|---|---|---|
| **A**ttributable (Atribuível) | Quem gerou/alterou o dado | Login individual (Supabase Auth); cada avaliação/lançamento carimba autor (`notasMeta.user`, `updated_by`, `avaliador_email`); trilha registra e-mail + nome | ✅ |
| **L**egible (Legível) | Dado legível e permanente | Dados em texto/JSON; trilha e exportação (Excel) legíveis; backups versionados | ✅ |
| **C**ontemporaneous (Contemporâneo) | Registrado no momento | Carimbo no salvar (`_ts`, `client_ts`, `updated_at` do servidor); clima/GPS no instante | ⚠️ usa relógio do **aparelho** no `client_ts` — preferir `updated_at` do servidor (ver §6, melhoria) |
| **O**riginal | Dado original preservado | Servidor mantém **histórico de versões** (`app_state_history`, ~400) + diário local (IndexedDB) | ✅ |
| **A**ccurate (Exato) | Sem erro, com controle de alterações | Edição de avaliação assinada **exige motivo** e registra **de→para** na trilha; re-assinatura obrigatória | ✅ |
| **+ C**omplete | Nada omitido | Trilha append-only por estudo + soft-delete (nada é apagado de verdade) | ✅ (trilha é client-append — ver §6) |
| **+ C**onsistent | Sequência/carimbos coerentes | Revisão monotônica (`rev`), guarda anti-escrita-velha (LWW), tombstones | ✅ |
| **+ E**nduring | Perdura | Backup server-side + export periódico; plano de retenção (§7) | ⚠️ formalizar retenção/migração de formato |
| **+ A**vailable | Disponível p/ inspeção | Trilha visível no app; export Excel/JSON; histórico no painel Supabase | ✅ |

---

## 3. Sistemas computadorizados (OECD Nº 17 / NIT-Dicla-038)

| Requisito | Status | Evidência / pendência |
|---|---|---|
| **Trilha de auditoria** (quem, quando, valor anterior, motivo) | ✅ | `logStudyAuditInObject` registra ação + de→para + motivo + autor; visível na "🛡️ Trilha de Auditoria BPL" |
| **Assinatura eletrônica** (nome + significado + data) | ✅ | Rubrica grava `rubricaNome`, `rubricaSignificado`="Conferido e assinado", `rubricaEm` |
| **Controle de acesso** (login individual, perfis) | ✅ | Supabase Auth + papéis admin/técnico (`perfis` + RLS); cadastro fechado |
| **Dado protegido após assinar** | ✅ | Avaliação assinada = somente-leitura; reabrir exige motivo + invalida assinatura |
| **Backup/recuperação** | ✅ | Histórico server-side + diário IndexedDB + export |
| **Validação IQ/OQ/PQ + URS** | 📝 | Ver `VALIDACAO-SISTEMA.md` (dossiê a manter atualizado) |
| **Trilha imutável (server-side)** | ⚠️ | Hoje a trilha é append no documento (cliente). Server-side: `app_state_history` é imutável. Melhoria: tabela de trilha append-only com trigger (§6) |
| **Hora confiável (servidor)** | ⚠️ | Usar `updated_at` (Postgres `now()`) como autoridade (§6) |

---

## 4. ISO/IEC 27001:2022 — controles do Anexo A aplicáveis ao Agracta

> 93 controles em 4 temas: **Organizacional (37) · Pessoas (8) · Físico (14) · Tecnológico (34)**.
> Abaixo, os mais relevantes ao app e quem é responsável (App = já implementado no software; Lab = a documentar no ISMS).

| Controle (Anexo A) | Aplicação no Agracta | Resp. | Status |
|---|---|---|---|
| **A.5.15 Controle de acesso** | Papéis admin/técnico, RLS no banco | App | ✅ |
| **A.5.16 Gestão de identidade** | 1 conta por pessoa; admin cria/desativa (`criar-tecnico`/`remover-tecnico`) | App | ✅ (publicar `remover-tecnico`) |
| **A.5.17 Informação de autenticação** | Senha individual (Supabase); reset pelo admin | App/Lab | ✅ |
| **A.5.18 Direitos de acesso** | Provisionar/revogar acesso (desativar técnico) | App | ✅ |
| **A.8.2 Acesso privilegiado** | Painel Admin protegido por senha + papel admin | App | ✅ |
| **A.8.5 Autenticação segura** | Sessão persistente; e-mail confirmado | App | ✅ |
| **A.8.13 Backup** | Histórico de versões + export; **definir frequência/retenção** | App/Lab | ⚠️ formalizar política |
| **A.8.15 Logging (registro de eventos)** | Trilha de auditoria por estudo + `updated_by/at` | App | ✅ |
| **A.8.16 Monitoramento** | Selo de sincronização; logs do servidor | App/Lab | ⚠️ definir revisão periódica |
| **A.8.24 Criptografia** | HTTPS/TLS em trânsito; Postgres em repouso (Supabase) | App | ✅ |
| **A.8.28 Codificação segura** | Segredos fora do cliente (service_role só em Edge Function) | App | ✅ |
| **A.8.32 Gestão de mudanças** | Git versiona o app; commits descritivos | App/Lab | ✅ (ligar à validação) |
| **A.5.28 Coleta de evidências** | Export imutável (Excel/JSON) + histórico | App | ✅ |
| **A.5.24–.27 Gestão de incidentes** | Registro de incidentes de segurança/dados | Lab | 📝 (campo no ISMS, §5) |
| **A.5.9–.10 Inventário/uso aceitável de ativos** | Lista de ativos (app, banco, aparelhos) | Lab | 📝 |
| **A.7.x Físico** | Aparelhos de campo, arquivo físico | Lab | 📝 |
| **A.6.x Pessoas** | Treinamento, termos de confidencialidade | Lab | 📝 |

Legenda: ✅ atendido no app · ⚠️ atendido parcialmente / a formalizar · 📝 a documentar pelo laboratório (ISMS).

---

## 5. ISMS do laboratório — o que o LABORATÓRIO precisa preencher

> O app cobre os controles **técnicos**. O **SGSI/ISMS** (ISO 27001 cláusulas 4–10) é responsabilidade do laboratório. Use a tela **"Conformidade & ISMS"** no app (menu ☰ → Painel Admin) para preencher e exportar, ou preencha aqui:

1. **Contexto (cláusula 4):** escopo do SGSI, partes interessadas, requisitos legais/regulatórios (Inmetro/MAPA/ANVISA…).
2. **Liderança (5):** política de segurança da informação aprovada; papéis e responsabilidades (System Owner, GQ, Arquivista, Admin de TI).
3. **Planejamento (6):** **registro de riscos** (ativo, ameaça, probabilidade, impacto, tratamento) + objetivos de segurança.
4. **Apoio (7):** competências/treinamento, conscientização, controle de documentos.
5. **Operação (8):** avaliação e tratamento de riscos operacionais.
6. **Avaliação de desempenho (9):** auditorias internas, análise crítica pela direção, monitoramento.
7. **Melhoria (10):** não-conformidades e ações corretivas (CAPA).
8. **Declaração de Aplicabilidade (SoA):** lista dos 93 controles do Anexo A com aplicável/justificativa/status.

---

## 6. Melhorias recomendadas (para conformidade plena)

| # | Melhoria | Norma | Prioridade |
|---|---|---|---|
| 1 | Trilha de auditoria **imutável server-side** (tabela append-only + trigger, sem update/delete) | ALCOA+ "Original/Complete"; NIT-038 §3 | Alta |
| 2 | Carimbo de tempo do **servidor** como autoridade (não o relógio do aparelho) | ALCOA+ "Contemporaneous"; NIT-038 §3 | Alta |
| 3 | **PDF do estudo assinado** (relatório final BPL com trilha + assinatura) | OECD GLP — relatório final | Alta |
| 4 | Política formal de **backup/retenção** (frequência, período 5–20 anos, migração de formato) | A.8.13; NIT-Dicla-072 | Média |
| 5 | `_currentUserName` ler de `perfis` (não só do roster local) | atribuição confiável | Baixa |
| 6 | `remover-tecnico` publicada (revogar acesso pelo app) | A.5.18 | Média |

---

## 7. Retenção e arquivo (NIT-Dicla-072)

- **Período de guarda:** _[preencher — geralmente 5 a 20 anos; agrotóxicos podem exigir indeterminado]_.
- **Local do arquivo:** _[preencher]_. **Arquivista responsável:** _[preencher]_.
- **Backup:** histórico no Supabase + export **mensal** em JSON/Excel para mídia controlada _[definir]_.
- **Migração de formato:** revisar a cada _[X]_ anos para evitar obsolescência.

---

## Controle de versões deste documento

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-14 | _[preencher]_ | Emissão inicial (alinhada OECD Nº 17/22 e ISO 27001:2022) |
