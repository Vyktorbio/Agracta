# Conformidade do Agracta — BPL/GLP e ISO/IEC 27001

Dossiê de entrada: o que o Agracta faz pela integridade dos dados, o que ele
**não** faz, e onde está cada documento. Versão 2.0 — 11/10/2026.

> **Escopo.** O Agracta é a *ferramenta*. A conformidade é da **Instalação de
> Teste** (o laboratório): políticas, POPs, treinamento, validação executada e
> revisão da Garantia da Qualidade (GQ). Estes documentos são **modelos e
> mapeamentos** para o laboratório adaptar e formalizar — não substituem a
> avaliação do RT/GQ nem a inspeção do Inmetro/Cgcre.
>
> **O repositório é público** e o site sai dele. Aqui ficam os modelos. As
> cópias preenchidas, assinadas, e os registros de execução ficam no arquivo
> controlado do laboratório.

## Os documentos

| Documento | O quê | Quem preenche e mantém |
|---|---|---|
| [../VALIDACAO-SISTEMA.md](../VALIDACAO-SISTEMA.md) | **Validação do sistema (CSV):** escopo, arquitetura, risco, requisitos, matriz de rastreabilidade, IQ/OQ/PQ, lacunas, controle de mudanças | Dono do sistema + GQ |
| [integridade-dados-ALCOA.md](integridade-dados-ALCOA.md) | Política de integridade de dados: cada princípio ALCOA+ e como o app atende | RT + GQ |
| [SOP-acesso-assinatura-backup.md](SOP-acesso-assinatura-backup.md) | POP de acesso, assinatura eletrônica, cópia de segurança e restauração | RT + administrador |
| [ISMS-ISO27001.md](ISMS-ISO27001.md) | Modelo de SGSI (cláusulas 4–10), inventário, riscos e Declaração de Aplicabilidade (Anexo A) | Responsável pela SI + Gerência |

Ferramenta de apoio: `tools/registro-oq.sh` gera o registro de execução da OQ
automática (ver a validação, §5).

## O que o app já faz (evidência técnica)

| Exigência | Como o Agracta atende | Onde se prova |
|---|---|---|
| Acesso individual e revogável | Login por pessoa (Firebase Authentication). Só o administrador cadastra em `workspaces/agracta/members/{email}`; desativar o cadastro corta leitura e escrita na operação seguinte | `firestore.rules` · `tests/acesso-rules.cjs` |
| Acesso só em expediente | Janela de dias e horas por pessoa, imposta pelo **banco** com a hora do **servidor** | `firestore.rules` · `acesso-horario.js` |
| Atribuível e contemporâneo | Cada gravação deixa no servidor um registro com o autor da sessão e a hora do servidor — o aparelho não consegue carimbar outra pessoa nem outra hora | `historico/` · `tests/historico-rules.cjs` |
| Original preservado | O servidor guarda a versão **anterior** de cada documento a cada gravação; ninguém edita nem apaga esse histórico, nem o administrador pelo app | `vendor/versoes-core.js` · `tests/test_versoes.js` |
| Ações críticas como eventos | Finalizar, reabrir, aprovar protocolo, emendar e corrigir dado assinado viram eventos imutáveis, cujo id é o SHA-256 do conteúdo, recalculado pelo servidor | `vendor/eventos-core.js` · `tests/eventos-rules.cjs` |
| Alteração documentada | Editar avaliação assinada exige motivo; cada célula alterada vira um evento com de → para | `eventos-app.js` · `trilha-formal.js` |
| Assinatura eletrônica | SHA-256 do conteúdo assinado + nome, e-mail, significado e data/hora. Mudou o conteúdo, a assinatura deixa de conferir | `vendor/assinatura-core.js` |
| Protocolo controlado | Aprovação com senha e rubrica; mudança depois disso é emenda com motivo e nova versão; execução fora do protocolo é desvio | `vendor/protocolo-vivo-core.js` |
| Estudo encerrado | Finalização com senha, rubrica e estatística congelada; somente leitura; reabrir pede senha e motivo | `tests/test_finalizacao.js` |
| Sem "último aparelho vence" | Toda gravação é uma transação com revisão sequencial; dois aparelhos não se sobrescrevem | `firebase-sync.js` · `tests/sync-firestore.cjs` |
| Disponível offline | Cofre local no aparelho; sobe ao reconectar | `tests/test_offline_local.js` |

## O que o app **não** garante

A lista completa, com risco e ação proposta, está na validação, **§10
(lacunas L1–L10)**. As que mais pesam numa inspeção:

- **não há papéis** (técnico, supervisor, diretor): pelo banco, qualquer membro
  ativo aprova, finaliza e reabre;
- o registro de histórico é escrito pelo app, não por uma função do servidor;
- a cópia de segurança fora do Firebase depende de rotina manual, se o plano
  não tiver backup agendado;
- fotos de parcela ficam só no aparelho que fotografou;
- a validação ainda não foi executada.

## Retenção e arquivo (NIT-Dicla-072)

- **Período de guarda:** `[ PREENCHER — exigência aplicável aos estudos do laboratório ]`
- **Arquivista responsável e local do arquivo:** `[ PREENCHER ]`
- **Cópia de longo prazo:** export JSON (Menu → Backup) e relatório final em PDF
  por estudo finalizado, guardados em mídia controlada `[ PREENCHER ]`.
- **Migração de formato:** JSON e PDF são abertos; revisar a cada `[ PREENCHER ]` anos.

## Fontes oficiais

- **OECD GLP — Princípios de BPL**, Nº 1 (no Brasil: NIT-Dicla-035).
- **OECD — Aplicação dos princípios de BPL a sistemas computadorizados**,
  Advisory Document Nº 17 (2016) (no Brasil: NIT-Dicla-038).
- **OECD — GLP Data Integrity**, Advisory Document Nº 22 (2021) — ALCOA+.
  [PDF oficial](https://www.oecd.org/content/dam/oecd/en/publications/reports/2021/09/glp-data-integrity_c2f067ec/45779212-en.pdf)
- **ISO/IEC 27001:2022** — SGSI e Anexo A (93 controles em 4 temas).

## Histórico

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 14/06/2026 | Emissão inicial |
| 2.0 | 11/10/2026 | Reescrito para a arquitetura atual (Firebase). Absorve o antigo dossiê mestre (`docs/CONFORMIDADE-BPL-ISO-27001.md`); a validação passa a ser um documento só, `docs/VALIDACAO-SISTEMA.md` |
