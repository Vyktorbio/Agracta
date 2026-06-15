# Política de Integridade de Dados — ALCOA+ (Agracta)

**Base:** OECD GLP *Data Integrity* (Advisory Document No. 22, 2021) e OECD No. 17 /
NIT-Dicla-038 (sistemas computadorizados). Integridade de dados = *"extensão em que
todos os registros originais e cópias verdadeiras são completos, consistentes, exatos,
confiáveis, e em que todas as alterações são totalmente documentadas"* (OECD No. 22).

A No. 22 pede uma **abordagem baseada em risco** ao longo do **ciclo de vida do dado**
(geração → processamento → revisão → relato → retenção → descarte). Abaixo, cada
princípio **ALCOA+** com (a) o que a norma exige, (b) como o Agracta atende, (c) o que o
**laboratório** precisa formalizar.

| | Princípio | Como o Agracta atende | Ação do laboratório |
|---|---|---|---|
| **A** | **Attributable** (atribuível — quem e quando) | Login individual (Supabase Auth); papéis admin/técnico (`perfis`+RLS); cada lançamento/edição registra autor (e-mail + nome) e timestamp; `lancamentos` guarda o avaliador | Manter cadastro 1:1 pessoa↔login; **proibir login compartilhado** (POP) |
| **L** | **Legible** (legível e permanente) | Dados estruturados; trilha e exportações legíveis; nada é rasurado | Definir retenção e formato de leitura de longo prazo (ver §Retenção) |
| **C** | **Contemporaneous** (no momento do ato) | Registro no campo na hora; carimbo de data/hora + GPS + clima no ato | **Carimbo confiável:** adotar o `updated_at` do servidor como hora oficial (lacuna: hoje exibe relógio do aparelho) |
| **O** | **Original** (registro original / cópia verdadeira) | Dado original preservado; **versão anterior de cada gravação** em `app_state_history` (server-side, imutável p/ o usuário) + diário local (IndexedDB) | Tratar a nuvem como registro original; backups como cópias verdadeiras |
| **A** | **Accurate** (exato; alterações documentadas) | Edição registra **valor anterior → novo + quem + quando + MOTIVO**; editar avaliação assinada **invalida a assinatura** e exige nova | Revisão da trilha pela GQ (ver §Revisão da trilha) |
| **+C** | **Complete** | Tudo é salvo (campos, células, carimbos, rubrica); soft-delete (nada some de verdade — marca `deleted_at`) | Conferir que exclusões são justificadas |
| **+C** | **Consistent** | Sequência cronológica na trilha; ids únicos; merge por carimbo | — |
| **+E** | **Enduring** | Persistência em Postgres + cópia local; histórico de ~400 versões | Plano de retenção e migração de formato (obsolescência) |
| **+A** | **Available** | Acessível a inspeção/GQ a qualquer momento; export Excel/JSON | Definir acesso da GQ/auditor |

## Trilha de auditoria (OECD No. 22 §6.13 e §7.2)
**Exigência:** a trilha **não pode ser desligável** — ou, se for, isso tem de ser
detectável na própria trilha; deve registrar quem/quando/o-quê e o **valor anterior**;
e deve ser **revisada**.

**No Agracta:**
- A trilha por estudo (`study.audit`) registra ação, autor (nome + e-mail), data/hora,
  **mudanças célula a célula (de→para)** e **motivo** (obrigatório ao reabrir avaliação
  assinada). Visível no painel do estudo ("🛡️ Trilha de Auditoria BPL").
- **Rede de imutabilidade:** toda gravação salva a **versão anterior completa** em
  `app_state_history` no servidor (trigger `app_state_guard`), fora do alcance do
  usuário — funciona como trilha imutável de respaldo e permite reconstrução histórica.
- O diário local (IndexedDB, menu "Recuperação de avaliações") é uma caixa-preta
  adicional por aparelho.

**Lacuna e recomendação (risco médio):** a trilha por estudo é gravada pelo cliente
(poderia, em tese, ser reescrita por um cliente adulterado). A imutabilidade real hoje
vem do `app_state_history` (server-side). **Recomendado:** criar tabela/trigger de
trilha **append-only** no banco (sem UPDATE/DELETE via API), espelhando cada mudança de
célula com autor/hora-do-servidor/motivo. *(Item de melhoria — ver
[validacao-sistema.md](validacao-sistema.md).)*

## Revisão da trilha (responsabilidade da GQ)
`[ PREENCHER: periodicidade da revisão da trilha pela GQ — ex.: a cada avaliação crítica / mensal ]`
`[ PREENCHER: responsável pela revisão (nome/cargo) ]`
A GQ deve verificar: alterações pós-assinatura têm **motivo**; sem padrões suspeitos;
carimbos coerentes; exclusões justificadas.

## Retenção e descarte
`[ PREENCHER: período de retenção dos dados (ex.: conforme exigência do MAPA/Inmetro p/ resíduos/agrotóxicos) ]`
`[ PREENCHER: responsável pelo arquivo (Arquivista) e local do backup de longo prazo ]`
`[ PREENCHER: plano de migração de formato p/ evitar obsolescência (NIT-Dicla-072) ]`

## Cópia de segurança (resumo; detalhe no SOP)
- Nuvem (Supabase/Postgres) — registro original.
- `app_state_history` — versões anteriores (server-side).
- Export periódico (Excel/JSON) — `[ PREENCHER: frequência e responsável ]`.

---
**Aprovação**
RT/Diretor de Estudo: `[ PREENCHER nome/assinatura/data ]` · GQ: `[ PREENCHER ]`

Fonte: [OECD GLP Data Integrity (No. 22, 2021)](https://www.oecd.org/content/dam/oecd/en/publications/reports/2021/09/glp-data-integrity_c2f067ec/45779212-en.pdf).
