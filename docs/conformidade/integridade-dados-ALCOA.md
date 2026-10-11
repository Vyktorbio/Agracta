# Política de Integridade de Dados — ALCOA+ (Agracta)

Versão 2.0 — 11/10/2026.

**Base:** OECD GLP *Data Integrity* (Advisory Document Nº 22, 2021) e OECD Nº 17 /
NIT-Dicla-038. A Nº 22 define integridade de dados como a medida em que os
registros originais e as cópias verdadeiras são completos, consistentes, exatos
e confiáveis, com toda alteração documentada, e pede **abordagem baseada em
risco** ao longo do ciclo de vida do dado (geração → processamento → revisão →
relato → retenção → descarte).

Para cada princípio: o que o Agracta faz, e o que o **laboratório** precisa
formalizar. O detalhe técnico e as lacunas estão na
[validação do sistema](../VALIDACAO-SISTEMA.md).

| | Princípio | Como o Agracta atende | Ação do laboratório |
|---|---|---|---|
| **A** | **Atribuível** — quem fez | Login individual; cadastro só pelo administrador. Cada gravação deixa no servidor o e-mail da sessão (`historico/`, campo `por`), e a regra do banco recusa outro autor. Lançamentos e assinaturas guardam nome e e-mail | **Proibir login compartilhado** (POP); uma pessoa, um cadastro |
| **L** | **Legível** e permanente | Dados estruturados; trilha, relatório e exportação legíveis; nada é rasurado | Definir formato de guarda de longo prazo (ver dossiê, Retenção) |
| **C** | **Contemporâneo** | Registro no campo, na hora. A **hora oficial** é a do servidor, gravada no histórico e nos eventos (`em == request.time`). A data do ensaio é escolhida por quem registra e fica separada da data da digitação | Dizer no POP que a hora oficial é a do histórico. Aparelhos com data e hora automáticas |
| **O** | **Original** | O documento vivo no Firestore é o registro original. A cada gravação, o servidor guarda a versão **anterior** de cada documento, só por acréscimo | Tratar a nuvem como registro original; exports como cópias verdadeiras |
| **A** | **Exato** | Alteração de dado assinado exige motivo e vira evento com de → para; a assinatura antiga deixa de conferir. Protocolo aprovado só muda por emenda | GQ revisa a trilha (abaixo) |
| **+C** | **Completo** | Exclusão deixa lápide e o conteúdo anterior no histórico; pendências aparecem antes da finalização | Conferir que exclusões são justificadas |
| **+C** | **Consistente** | Revisão sequencial no servidor (sem "último aparelho vence"); eventos em grafo causal; ids estáveis | — |
| **+E** | **Duradouro** | Firestore (Google) + cofre no aparelho + export | Plano de retenção e de cópia fora do Firebase |
| **+A** | **Disponível** | Trilha e histórico visíveis no app para quem tem acesso; export JSON; relatório | Definir como a GQ e o inspetor acessam |

## Trilha de auditoria (OECD Nº 22)

**Exigência:** a trilha registra quem, quando, o quê e o valor anterior; não pode
ser desligada sem que isso apareça; e é revisada.

**No Agracta são três camadas:**

1. **Histórico de versões** (`workspaces/agracta/historico`) — a cada gravação, o
   conteúdo anterior de cada documento alterado, com autor da sessão e hora do
   servidor. Só acréscimo: as regras recusam editar e apagar, para qualquer
   pessoa. Aberto pelo Menu → **Histórico da nuvem**, que também restaura.
2. **Eventos formais** (`workspaces/agracta/eventos`) — finalização, reabertura,
   aprovação e emenda de protocolo, correção de dado assinado. Cada evento tem
   motivo, autor, hora e id igual ao SHA-256 do conteúdo, que o servidor
   recalcula. A ficha do estudo mostra o **selo**: o registro confere ou não, e
   os conflitos entre aparelhos.
3. **Trilha do estudo** (`study.audit`) — o relato legível de cada ação, com
   de → para. É escrita pelo aparelho; a prova está nas camadas 1 e 2.

**O que fica de fora** (lacunas L2 e L3 da validação): o histórico é escrito pelo
app, então um cliente fora do app com credencial válida poderia gravar sem ele; e
só cinco tipos de ação viram evento formal.

## Revisão da trilha (Garantia da Qualidade)

- Periodicidade: `[ PREENCHER — ex.: a cada estudo finalizado e mensalmente ]`
- Responsável: `[ PREENCHER ]`
- A GQ confere: toda alteração pós-assinatura tem motivo; o selo da trilha formal
  confere; não há conflito sem resolução; exclusões justificadas; horas coerentes.

---
**Aprovação**
RT / Diretor de Estudo: `[ PREENCHER nome, assinatura, data ]` · GQ: `[ PREENCHER ]`

## Histórico

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 14/06/2026 | Emissão inicial |
| 2.0 | 11/10/2026 | Reescrita para a arquitetura atual: histórico de versões e eventos formais no servidor, hora oficial do servidor, assinatura por SHA-256 |
