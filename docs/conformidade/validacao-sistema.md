# Validação do Sistema Computadorizado — Agracta

**Base:** OECD No. 17 / **NIT-Dicla-038** — ciclo de vida do sistema (URS → projeto/
validação **IQ/OQ/PQ** → operação → aposentadoria). Agracta é um sistema **customizado**
(exige validação do ciclo de desenvolvimento + testes), hospedado sobre **COTS**
(Supabase/Postgres, GitHub Pages, Leaflet).

> Preencha os campos `[ PREENCHER ]`, execute os testes, registre resultado/evidência e
> **assine**. A GQ revisa e arquiva. Re-validar a cada mudança significativa.

## 1. Identificação
- Sistema: **Agracta** — registro de ensaios de campo (mapa, fenologia, aplicações, avaliações, NDVI).
- Versão validada (commit): `[ PREENCHER: hash do commit, ex.: d4de06b ]`
- URL: https://www.agracta.com.br · Repositório: github.com/Vyktorbio/Agracta
- Fornecedores COTS: Supabase (banco/auth/realtime), GitHub Pages (hospedagem), Render (proxy NDVI).
- Responsável pela validação: `[ PREENCHER ]` · Data: `[ PREENCHER ]`

## 2. URS — Especificação de Requisitos do Usuário
| # | Requisito | Crítico? |
|---|---|---|
| URS-01 | Acesso restrito por login individual; papéis admin/técnico | Sim |
| URS-02 | Registrar avaliações/aplicações por parcela×variável, com data/GPS/clima | Sim |
| URS-03 | Trilha de auditoria: quem/quando/valor anterior→novo/motivo | Sim |
| URS-04 | Assinatura eletrônica com nome, significado e data/hora | Sim |
| URS-05 | Não perder dados (backup/versionamento; funcionar offline no campo) | Sim |
| URS-06 | Exportar dados (Excel/JSON) p/ análise e arquivo | Sim |
| URS-07 | Sincronizar entre aparelhos da equipe | Sim |
| URS-08 | `[ PREENCHER: requisitos adicionais do laboratório ]` | |

## 3. IQ — Qualificação de Instalação (o ambiente está instalado conforme especificado?)
| # | Verificação | Resultado | Evidência | Exec./Data |
|---|---|---|---|---|
| IQ-01 | App carrega em https (PWA instalável) em iOS e Android | `[ ]` | `[ ]` | `[ ]` |
| IQ-02 | Projeto Supabase ativo; tabelas Fase 4 + `app_state` presentes | `[ ]` | `[ ]` | `[ ]` |
| IQ-03 | RLS habilitado (anônimo não lê/escreve; só autenticado) | `[ ]` | `[ ]` | `[ ]` |
| IQ-04 | Trigger de histórico (`app_state_guard`) ativo; `app_state_history` recebendo versões | `[ ]` | `[ ]` | `[ ]` |
| IQ-05 | **Realtime habilitado** e tabelas na publicação `supabase_realtime` | `[ ]` | `[ ]` | `[ ]` |
| IQ-06 | Funções `criar-tecnico` / `remover-tecnico` publicadas | `[ ]` | `[ ]` | `[ ]` |

## 4. OQ — Qualificação de Operação (cada função opera como esperado?)
| # | Teste | Esperado | Resultado | Exec./Data |
|---|---|---|---|---|
| OQ-01 | Login com credencial errada | Bloqueia; mensagem clara | `[ ]` | `[ ]` |
| OQ-02 | Técnico não-admin tenta gravar estrutura (quadra/estudo) | RLS bloqueia | `[ ]` | `[ ]` |
| OQ-03 | Registrar avaliação com notas por parcela | Salva; aparece na lista | `[ ]` | `[ ]` |
| OQ-04 | Editar avaliação assinada | Exige **motivo**; invalida assinatura; trilha mostra de→novo + motivo | `[ ]` | `[ ]` |
| OQ-05 | Assinar avaliação | Carimbo com nome + significado + data/hora | `[ ]` | `[ ]` |
| OQ-06 | Excluir avaliação | Soft-delete (recuperável); registrado | `[ ]` | `[ ]` |
| OQ-07 | Exportar Excel/JSON | Arquivo íntegro com os dados | `[ ]` | `[ ]` |
| OQ-08 | Backup server-side | Versão anterior em `app_state_history` após gravar | `[ ]` | `[ ]` |

## 5. PQ — Qualificação de Desempenho (atende em uso real?)
| # | Teste | Esperado | Resultado | Exec./Data |
|---|---|---|---|---|
| PQ-01 | Dois técnicos avaliam parcelas diferentes do mesmo estudo ao mesmo tempo | Nenhum sobrescreve o outro | `[ ]` | `[ ]` |
| PQ-02 | Edição com aparelho **offline** e posterior reconexão | Dado sobe sem perda | `[ ]` | `[ ]` |
| PQ-03 | Dado registrado no aparelho A **aparece no B** | Propaga (realtime) — *depende de IQ-05* | `[ ]` | `[ ]` |
| PQ-04 | Recuperação a partir de backup/histórico | Dado restaurável | `[ ]` | `[ ]` |

## 6. Riscos do sistema e mitigação (análise baseada em risco — OECD No. 22)
| Risco | Sev. | Mitigação atual | Ação |
|---|---|---|---|
| Trilha por estudo gravada pelo cliente (adulterável) | Média | `app_state_history` imutável server-side | **Trilha append-only por trigger** `[ PREENCHER prazo ]` |
| Carimbo de tempo do aparelho (relógio errado) | Média | `updated_at` do servidor existe | Adotar `updated_at` como hora oficial na trilha |
| Realtime não entregar (sync) | Alta (uso) | Resync no foco/online | Confirmar IQ-05; per-linha já implementado |
| Perda de aparelho com dado offline não sincronizado | Média | Diário local + flush ao esconder | POP: sincronizar ao sair de área sem sinal |

## 7. Conclusão e liberação
Resultado global: `[ PREENCHER: Aprovado / Aprovado com ressalvas / Reprovado ]`
Validado por (RT/TI): `[ PREENCHER nome/assinatura/data ]` · Revisado pela GQ: `[ PREENCHER ]`

Fonte: OECD No. 17 (Computerised Systems) / NIT-Dicla-038.
