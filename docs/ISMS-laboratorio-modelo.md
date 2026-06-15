# SGSI / ISMS do Laboratório — modelo (ISO/IEC 27001:2022)

> Modelo para o laboratório documentar seu **Sistema de Gestão de Segurança da Informação**.
> Cobre as cláusulas **4–10** da ISO/IEC 27001:2022 + a **Declaração de Aplicabilidade (SoA)** do Anexo A.
> O app Agracta implementa os controles **técnicos**; este documento (e a tela "Conformidade & ISMS" no app)
> é onde o laboratório registra contexto, riscos, políticas e responsabilidades.
> Substitua os _[campos]_. Documento controlado.

## 4. Contexto da organização
- **4.1 Organização e contexto:** _[o que o laboratório faz, estudos BPL de campo, etc.]_
- **4.2 Partes interessadas e requisitos:** _[Inmetro/Cgcre, MAPA, patrocinadores, clientes, LGPD…]_
- **4.3 Escopo do SGSI:** _[ex.: "registros eletrônicos de estudos de campo no app Agracta e infraestrutura associada (Supabase, aparelhos de campo)"]_
- **4.4 O SGSI:** _[como é mantido e melhorado]_

## 5. Liderança
- **5.1 Comprometimento da direção:** _[nome do responsável da direção]_
- **5.2 Política de Segurança da Informação:** _[anexar/declarar a política aprovada]_
- **5.3 Papéis e responsabilidades:**

| Papel | Pessoa | Responsabilidade |
|---|---|---|
| System Owner / Responsável SGSI | _[ ]_ | Governança da segurança do Agracta |
| Diretor de Estudo (DE) | _[ ]_ | Integridade técnica/científica dos dados |
| Garantia da Qualidade (GQ) | _[ ]_ | Auditoria independente |
| Arquivista | _[ ]_ | Custódia/retenção dos registros |
| Admin de TI/sistema | machadovictorchaves@gmail.com | Acessos, backup, mudanças |

## 6. Planejamento
- **6.1 Riscos e oportunidades — Registro de Riscos:**

| ID | Ativo | Ameaça | Prob. | Impacto | Risco | Tratamento | Responsável |
|---|---|---|---|---|---|---|---|
| R-01 | Dados de avaliação | Perda por falha de sync | _[ ]_ | Alto | _[ ]_ | Tripla proteção + backup | _[ ]_ |
| R-02 | Credenciais | Acesso indevido | _[ ]_ | Alto | _[ ]_ | Login individual + papéis + cadastro fechado | _[ ]_ |
| R-03 | Aparelho de campo | Roubo/perda | _[ ]_ | Médio | _[ ]_ | Dado na nuvem + tela de bloqueio | _[ ]_ |
| R-... | _[ ]_ | _[ ]_ | | | | | |

- **6.2 Objetivos de segurança:** _[ex.: zero perda de dado bruto; 100% dos acessos individuais; backup mensal verificado]_

## 7. Apoio
- **7.2 Competência/treinamento:** _[registro de treinamento da equipe no app e em BPL/segurança]_
- **7.3 Conscientização:** _[como a equipe é orientada]_
- **7.5 Informação documentada:** _[controle de versões de POPs, planos, este SGSI]_

## 8. Operação
- **8.1 Planejamento e controle operacional:** _[procedimentos de uso do app, criação/revogação de acessos]_
- **8.2/8.3 Avaliação e tratamento de riscos:** _[periodicidade]_

## 9. Avaliação de desempenho
- **9.1 Monitoramento/medição:** _[indicadores: nº de incidentes, % backups ok…]_
- **9.2 Auditoria interna:** _[plano e registros]_
- **9.3 Análise crítica pela direção:** _[atas]_

## 10. Melhoria
- **10.1 Não-conformidades e ações corretivas (CAPA):**

| ID | Data | Não-conformidade | Causa | Ação corretiva | Responsável | Status |
|---|---|---|---|---|---|---|
| NC-01 | _[ ]_ | | | | | |

---

## Declaração de Aplicabilidade (SoA) — Anexo A (93 controles, 4 temas)

> Marque cada controle: **Aplicável?** (S/N), **Justificativa**, **Status** (implementado/parcial/planejado) e **Responsável** (App = software Agracta; Lab = laboratório). Resumo dos mais relevantes ao Agracta (ver lista completa dos 93 na norma):

| Controle | Aplicável | Justificativa | Status | Resp. |
|---|---|---|---|---|
| A.5.15 Controle de acesso | S | Login + papéis admin/técnico | Implementado | App |
| A.5.16 Gestão de identidade | S | Admin cria/desativa contas | Implementado | App |
| A.5.18 Direitos de acesso | S | Provisionar/revogar | Implementado | App |
| A.5.24–.27 Gestão de incidentes | S | Registrar incidentes | Planejado | Lab |
| A.5.28 Coleta de evidências | S | Export + histórico imutável | Implementado | App |
| A.5.9/.10 Inventário/uso de ativos | S | Listar app, banco, aparelhos | Planejado | Lab |
| A.6.3 Conscientização/treinamento | S | Treinar equipe | Planejado | Lab |
| A.7.x Controles físicos | S/N | Arquivo, aparelhos | Planejado | Lab |
| A.8.2 Acesso privilegiado | S | Painel admin protegido | Implementado | App |
| A.8.13 Backup | S | Histórico + export; política | Parcial | App+Lab |
| A.8.15 Registro de eventos (logs) | S | Trilha de auditoria | Implementado | App |
| A.8.16 Monitoramento | S | Selo sync + logs servidor | Parcial | App+Lab |
| A.8.24 Criptografia | S | TLS + repouso (Supabase) | Implementado | App |
| A.8.28 Codificação segura | S | Segredo só no servidor | Implementado | App |
| A.8.32 Gestão de mudanças | S | Git + validação | Implementado | App+Lab |
| _[demais controles do Anexo A…]_ | | | | |

## Controle de versões
| Versão | Data | Autor | Alteração |
|---|---|---|---|
| 1.0 | 2026-06-14 | _[preencher]_ | Emissão inicial |
