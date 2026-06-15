# Conformidade do Agracta — GLP/BPL + ISO/IEC 27001

Este pacote documenta como o **Agracta** (sistema computadorizado de registro de ensaios
de campo) apoia a **integridade de dados** e a **rastreabilidade** exigidas pelas Boas
Práticas de Laboratório (BPL/GLP) e os **controles de segurança da informação** da
ISO/IEC 27001 — e dá ao laboratório os **modelos para preencher** (ISMS, validação).

> **Aviso de escopo.** O Agracta é a *ferramenta*. A conformidade é da **Instalação de
> Teste** (o laboratório): exige políticas, POPs, treinamento, validação executada e
> revisão da Garantia da Qualidade (GQ). Estes documentos são **modelos e mapeamentos**
> para você adaptar e formalizar — não substituem a avaliação do seu RT/GQ nem a
> inspeção do Inmetro/Cgcre.

## Fontes oficiais usadas
- **OECD GLP — Princípios de BPL**, OECD Series on Principles of GLP and Compliance
  Monitoring **No. 1** (no Brasil: **NIT-Dicla-035**).
- **OECD GLP — Aplicação a Sistemas Computadorizados**, Advisory Document **No. 17**
  (no Brasil: **NIT-Dicla-038**).
- **OECD GLP — Data Integrity**, Advisory Document **No. 22 (2021)** — princípios
  **ALCOA+** e abordagem baseada em risco no ciclo de vida do dado.
- **ISO/IEC 27001:2022** — Sistema de Gestão de Segurança da Informação (ISMS) e
  **Anexo A** (93 controles em 4 temas: Organizacional 37, Pessoas 8, Físico 14,
  Tecnológico 34).

Links das fontes na seção final.

## Os documentos deste pacote
| Arquivo | O quê | Quem preenche/mantém |
|---|---|---|
| [integridade-dados-ALCOA.md](integridade-dados-ALCOA.md) | Política de integridade de dados (ALCOA+) e mapeamento de cada princípio às funções do app | RT + GQ |
| [validacao-sistema.md](validacao-sistema.md) | Validação formal do sistema (URS, IQ/OQ/PQ) — protocolo com campos a preencher | RT + TI + GQ |
| [ISMS-ISO27001.md](ISMS-ISO27001.md) | Modelo de ISMS: escopo, política, riscos e **Declaração de Aplicabilidade (SoA)** dos controles do Anexo A | Responsável pela SI + Gerência |
| [SOP-acesso-assinatura-backup.md](SOP-acesso-assinatura-backup.md) | POP de controle de acesso, assinatura eletrônica, backup e recuperação | RT + admin |

Convenção: trechos a completar aparecem como **`[ PREENCHER: … ]`**.

## Resumo do que o app JÁ apoia (evidência técnica)
- **Atribuível / autoria:** login individual (Supabase Auth), papéis **admin/técnico**
  (`perfis` + RLS), cadastro fechado (só o admin cria via função `criar-tecnico`).
- **Trilha de auditoria:** ao editar uma avaliação, registra **valor anterior → novo**,
  **quem**, **quando** e **motivo** (obrigatório ao alterar dado assinado).
- **Assinatura eletrônica:** rubrica + **nome do assinante + significado
  ("Conferido e assinado") + data/hora**; editar invalida e exige nova assinatura.
- **Original/Backup:** versão anterior de cada gravação em `app_state_history`
  (~400 versões, server-side, fora do alcance do usuário) + **diário local** (IndexedDB)
  por avaliação + exportação (Excel/JSON).
- **Disponível/Durável:** dados na nuvem (Supabase/Postgres) + cópia no aparelho (offline).

## Lacunas conhecidas (a tratar — honestidade BPL)
- **Trilha append-only no servidor:** hoje a trilha por avaliação é gravada pelo cliente
  (mitigada pelo histórico server-side imutável `app_state_history`). Recomendado:
  trilha imutável garantida por trigger/tabela própria no banco (ver
  [validacao-sistema.md](validacao-sistema.md) §Riscos).
- **Carimbo de tempo confiável:** o `client_ts`/`ts` de célula usa o relógio do
  **aparelho**; o `updated_at` do servidor é a hora confiável. Adotar o `updated_at`
  como autoridade na trilha.
- **Validação executada:** o protocolo IQ/OQ/PQ está pronto para ser **executado e
  assinado** (ainda não há registro de execução).
- **Confirmação de e-mail / senha forte:** definir política no Supabase Auth (ver SOP).

---
### Fontes
- [OECD GLP Data Integrity (No. 22, 2021) — PDF oficial](https://www.oecd.org/content/dam/oecd/en/publications/reports/2021/09/glp-data-integrity_c2f067ec/45779212-en.pdf)
- [OECD GLP Data Integrity — página OECD](https://www.oecd.org/en/publications/glp-data-integrity_45779212-en.html)
- ISO/IEC 27001:2022 — norma (aquisição na ISO/ABNT); panorama do Anexo A (2022, 93 controles / 4 temas).
