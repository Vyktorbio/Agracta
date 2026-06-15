# ISMS do Laboratório — modelo ISO/IEC 27001:2022 (Agracta)

Modelo de **Sistema de Gestão de Segurança da Informação (SGSI/ISMS)** para o
laboratório, com foco nos ativos de informação geridos pelo **Agracta**. Preencha os
`[ PREENCHER ]`. A ISO/IEC 27001:2022 exige: **escopo**, **política**, **avaliação e
tratamento de riscos** e **Declaração de Aplicabilidade (SoA)** dos controles do
**Anexo A** (93 controles em 4 temas).

> Isto cobre os ativos de SI do app. Um ISMS completo do laboratório pode abranger mais
> ativos (rede, e-mail, estações). Ajuste o escopo conforme a decisão da Gerência.

## 1. Escopo do ISMS
`[ PREENCHER: ex.: "Dados de ensaios de campo BPL geridos pelo app Agracta, incluindo banco Supabase, hospedagem GitHub Pages e os aparelhos da equipe." ]`
Limites: `[ PREENCHER ]` · Exclusões e justificativa: `[ PREENCHER ]`

## 2. Política de Segurança da Informação
`[ PREENCHER: declaração da Gerência — compromisso com confidencialidade, integridade e disponibilidade dos dados de estudo; conformidade legal/BPL; melhoria contínua. ]`
Aprovada por: `[ PREENCHER nome/cargo/data ]`

## 3. Papéis e responsabilidades
| Papel | Pessoa | Responsabilidade |
|---|---|---|
| Responsável pela SI (ISMS) | `[ PREENCHER ]` | Mantém o ISMS, riscos, SoA |
| Administrador do sistema | `[ PREENCHER ]` | Contas, acessos, backup, função criar/remover-tecnico |
| Garantia da Qualidade (GQ) | `[ PREENCHER ]` | Revisa trilha de auditoria e conformidade |
| Diretor de Estudo (DE) | `[ PREENCHER ]` | Integridade técnica dos dados do estudo |

## 4. Inventário de ativos de informação
| Ativo | Onde | Classificação | Dono |
|---|---|---|---|
| Dados de ensaio (quadras/estudos/aplicações/avaliações/lançamentos) | Supabase (Postgres) + aparelhos | `[ PREENCHER: confidencial? ]` | `[ PREENCHER ]` |
| Credenciais de login dos técnicos | Supabase Auth | Confidencial | Admin |
| Chave service_role / segredos | Supabase (Edge Functions) | Secreto | Admin |
| Backups (`app_state_history`, exports) | Supabase + `[ PREENCHER local dos exports ]` | Confidencial | Arquivista |

## 5. Avaliação e tratamento de riscos (registro)
| ID | Risco (à C/I/D) | Prob. | Impacto | Controle (Anexo A) | Tratamento | Resp./Prazo |
|---|---|---|---|---|---|---|
| R-01 | Acesso indevido por login compartilhado | `[ ]` | Alto | A.5.15–5.18, A.8.5 | POP: 1 login/pessoa; senha forte | `[ PREENCHER ]` |
| R-02 | Vazamento da chave service_role | `[ ]` | Alto | A.8.24, A.5.10 | Segredo só em Edge Function; nunca no app | `[ PREENCHER ]` |
| R-03 | Perda de dados (falha/erro) | `[ ]` | Alto | A.8.13, A.8.14 | Histórico server-side + diário local + export | `[ PREENCHER ]` |
| R-04 | Alteração não rastreada de dado | `[ ]` | Alto | A.8.15 (logging) | Trilha de auditoria + motivo | `[ PREENCHER ]` |
| R-05 | Conta de ex-membro ativa | `[ ]` | Médio | A.5.18 | Desativar via `remover-tecnico` na saída | `[ PREENCHER ]` |
| R-06 | `[ PREENCHER risco adicional ]` | | | | | |

## 6. Declaração de Aplicabilidade (SoA) — controles do Anexo A mais relevantes ao Agracta
Estado: ✅ implementado · 🟡 parcial · ⬜ a fazer · N/A não aplicável.

### Organizacional (A.5)
| Controle | Aplicável? | Como atende no Agracta | Estado |
|---|---|---|---|
| A.5.10 Uso aceitável de ativos/informação | Sim | POP de uso (ver SOP) | `[ PREENCHER ]` |
| A.5.15 Controle de acesso | Sim | Login individual + papéis admin/técnico (RLS) | ✅ |
| A.5.16 Gestão de identidade | Sim | 1 identidade Supabase por pessoa (`perfis`) | ✅ |
| A.5.17 Informação de autenticação (senhas) | Sim | Senha por usuário; `[ PREENCHER: política de senha forte no Supabase ]` | 🟡 |
| A.5.18 Direitos de acesso (conceder/revogar) | Sim | `criar-tecnico` / `remover-tecnico` (desativar mantém histórico) | ✅ |
| A.5.23 Segurança em serviços de nuvem | Sim | Supabase (avaliar termos/região) `[ PREENCHER ]` | 🟡 |
| A.5.30 Continuidade (TIC) | Sim | Backups + funcionamento offline | 🟡 |

### Pessoas (A.6)
| A.6.3 Conscientização/treinamento | Sim | `[ PREENCHER: treinamento da equipe em BPL/uso do app ]` | ⬜ |

### Físico (A.7)
| A.7.x Proteção física (aparelhos, arquivo) | Sim | `[ PREENCHER: guarda dos aparelhos e do arquivo BPL — NIT-Dicla-072 ]` | ⬜ |

### Tecnológico (A.8)
| Controle | Aplicável? | Como atende | Estado |
|---|---|---|---|
| A.8.2 Acesso privilegiado | Sim | Papel admin restrito; service_role só no servidor | ✅ |
| A.8.5 Autenticação segura | Sim | Supabase Auth; `[ PREENCHER: confirmar e-mail / 2FA? ]` | 🟡 |
| A.8.13 Backup | Sim | `app_state_history` (~400 versões) + diário local + export | ✅ |
| A.8.15 Logging (registro de eventos) | Sim | Trilha de auditoria (quem/quando/de→novo/motivo) | ✅ |
| A.8.16 Monitoramento | Sim | `[ PREENCHER: revisão da trilha pela GQ ]` | 🟡 |
| A.8.24 Criptografia | Sim | HTTPS/TLS; dados em repouso no Supabase | ✅ |
| A.8.28 Codificação segura | Sim | App customizado; ver [validacao-sistema.md](validacao-sistema.md) | 🟡 |

## 7. Revisão pela Direção
Periodicidade: `[ PREENCHER: ex.: anual ]` · Última: `[ PREENCHER ]` · Próxima: `[ PREENCHER ]`

Aprovação do ISMS — Gerência: `[ PREENCHER nome/assinatura/data ]`

Fonte: ISO/IEC 27001:2022 (norma e Anexo A — 93 controles / 4 temas).
