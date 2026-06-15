# Agracta — Validação do Sistema Computadorizado (CSV)

> Conforme **OECD Advisory Document Nº 17 (2016)** / **NIT-Dicla-038** (ciclo de vida, abordagem baseada em risco)
> e boas práticas **GAMP 5**. Sistema **customizado** → exige URS + qualificação (IQ/OQ/PQ) + revisão de código + controle de mudanças.
> Documento controlado — manter atualizado a cada mudança relevante de versão.

## 0. Identificação

| Campo | Valor |
|---|---|
| Sistema | Agracta (PWA + Supabase + proxy NDVI) |
| Versão validada | _[preencher: commit/tag, ex.: `95a3c9a`]_ |
| Classificação GAMP | Categoria 5 (software customizado) |
| Avaliação de risco | _[preencher — ver §5]_ |
| Responsável pela validação | _[preencher]_ |
| Data | _[preencher]_ |

---

## 1. URS — Especificação de Requisitos do Usuário

Requisitos que o sistema **deve** atender (base para os testes de PQ):

| ID | Requisito | Criticidade |
|---|---|---|
| URS-01 | Registrar avaliações por parcela/variável, com data do ensaio escolhida pelo usuário | Alta |
| URS-02 | Cada registro deve ser **atribuível** (autor) e **contemporâneo** (carimbo) | Alta (ALCOA+) |
| URS-03 | Edição de dado já assinado deve exigir **motivo** e manter o **valor anterior** | Alta (ALCOA+) |
| URS-04 | **Assinatura eletrônica** com nome, significado e data/hora | Alta |
| URS-05 | **Controle de acesso** por login individual e papéis (admin/técnico) | Alta |
| URS-06 | **Nenhum dado de avaliação pode ser perdido** por falha (backup/recuperação) | Alta |
| URS-07 | Carimbar **clima/GPS/NDVI** no momento da aplicação/avaliação | Média |
| URS-08 | Exportar dados (Excel) e relatório do estudo | Média |
| URS-09 | Funcionar **offline** no campo e sincronizar ao reconectar | Alta |
| URS-10 | Trilha de auditoria disponível para inspeção (DE/GQ/Inmetro) | Alta |

---

## 2. IQ — Qualificação de Instalação

Confirma que o sistema e o ambiente foram instalados conforme especificado.

| ID | Verificação | Critério | Resultado | Evidência |
|---|---|---|---|---|
| IQ-01 | App publicado em HTTPS | www.agracta.com.br responde 200, TLS válido | _[ ]_ | print/log |
| IQ-02 | Backend Supabase ativo | Projeto `atgmvbdcknslpmnjvnia` acessível | _[ ]_ | |
| IQ-03 | Tabelas/RLS criadas | `supabase-fase4-1` + blindagem aplicadas | _[ ]_ | |
| IQ-04 | Trigger de histórico ativo | `app_state_history` recebe versões | _[ ]_ | `app_state_history_count` |
| IQ-05 | Proxy NDVI no ar | /health hasCreds=true | _[ ]_ | |
| IQ-06 | Versão correta instalada | commit/tag = versão validada | _[ ]_ | git |

---

## 3. OQ — Qualificação de Operação

Confirma que cada função opera conforme especificado (testes em todas as faixas).

| ID | Teste | Passos | Critério (esperado) | Resultado |
|---|---|---|---|---|
| OQ-01 | Login/controle de acesso | Entrar com credencial válida e inválida | Válida entra; inválida recusa | _[ ]_ |
| OQ-02 | Papéis | Técnico não acessa funções de admin | Bloqueado pelo RLS/painel | _[ ]_ |
| OQ-03 | Registrar avaliação | Preencher grade e salvar | Salva com autor + carimbo `_ts` | _[ ]_ |
| OQ-04 | Trilha (de→para + motivo) | Editar avaliação assinada | Pede motivo; registra de→para; exige nova assinatura | _[ ]_ |
| OQ-05 | Assinatura | Assinar avaliação | Grava nome+significado+data; vira somente-leitura | _[ ]_ |
| OQ-06 | Backup/recuperação | Simular perda local | Recupera do histórico/diário | _[ ]_ |
| OQ-07 | Offline → sync | Salvar offline e reconectar | Dado sobe ao reconectar | _[ ]_ |
| OQ-08 | Soft-delete | Excluir avaliação | Marca excluída; não some do histórico | _[ ]_ |
| OQ-09 | Export | Exportar Excel | Abas corretas e completas | _[ ]_ |

---

## 4. PQ — Qualificação de Desempenho

Confirma que o sistema atende ao **uso real** (rastreia os URS), em condições normais.

| ID | Cenário real | URS coberto | Critério | Resultado |
|---|---|---|---|---|
| PQ-01 | Técnico avalia 1 estudo completo em campo (offline) | URS-01,02,09 | Dados íntegros e atribuídos após sincronizar | _[ ]_ |
| PQ-02 | Dois técnicos dividem parcelas do mesmo estudo | URS-02,06 | Sem sobrescrita; cada autor preservado | _[ ]_ |
| PQ-03 | Correção de erro pós-assinatura | URS-03,04,10 | Motivo + de→para + re-assinatura na trilha | _[ ]_ |
| PQ-04 | Auditoria: reconstrução histórica de um estudo | URS-10 | Trilha + histórico reproduzem o dado bruto | _[ ]_ |

---

## 5. Avaliação de risco (base da validação — OECD Nº 17)

| Função | Impacto na integridade | Probabilidade de falha | Risco | Mitigação |
|---|---|---|---|---|
| Salvamento de avaliação | Alto | Baixa | Médio | Tripla proteção (aparelho+diário+histórico) |
| Sincronização multiusuário | Alto | Média | **Alto** | LWW por célula + merge + trilha |
| Assinatura/trava | Alto | Baixa | Médio | Somente-leitura + re-assinatura |
| Controle de acesso | Alto | Baixa | Médio | RLS no banco + cadastro fechado |

---

## 6. Revisão de código e controle de mudanças

- **Repositório:** `Vyktorbio/Agracta` (Git) — cada mudança = commit descritivo (rastreável).
- **Revisão:** mudanças em caminhos críticos (salvamento/sync/auth) revisadas antes de produção.
- **Re-validação:** mudança relevante → repetir OQ/PQ afetados e atualizar a versão validada (§0).

## Controle de versões

| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-14 | _[preencher]_ | Emissão inicial |
