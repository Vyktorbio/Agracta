# SGSI / ISMS do Laboratório — modelo ISO/IEC 27001:2022 (Agracta)

Versão 2.0 — 11/10/2026.

Modelo do **Sistema de Gestão de Segurança da Informação** do laboratório, com
foco nos ativos geridos pelo Agracta. A ISO/IEC 27001:2022 exige as cláusulas
**4 a 10** e a **Declaração de Aplicabilidade (SoA)** dos controles do Anexo A
(93 controles em 4 temas). O app cobre controles **técnicos**; o resto é do
laboratório. A tela "Conformidade & ISMS" do app (Menu ☰, só para administrador) guarda as
respostas do laboratório e exporta.

> Um SGSI completo do laboratório pode abranger mais ativos (rede, e-mail,
> estações). Ajuste o escopo conforme a decisão da Gerência.

## 4. Contexto da organização
- **4.1 Organização:** `[ PREENCHER: o que o laboratório faz; estudos BPL de campo ]`
- **4.2 Partes interessadas e requisitos:** `[ PREENCHER: Inmetro/Cgcre, MAPA, patrocinadores, LGPD… ]`
- **4.3 Escopo do SGSI:** `[ PREENCHER — ex.: "registros eletrônicos de estudos de campo no Agracta: app (GitHub Pages), Firebase (autenticação e banco) e os aparelhos da equipe" ]`
- **4.4 Como o SGSI é mantido:** `[ PREENCHER ]`

## 5. Liderança
- **5.1 Comprometimento da direção:** `[ PREENCHER: nome ]`
- **5.2 Política de Segurança da Informação:** `[ PREENCHER: declaração da Gerência — confidencialidade, integridade e disponibilidade dos dados de estudo; conformidade legal e BPL; melhoria contínua ]` · Aprovada por `[ PREENCHER ]`
- **5.3 Papéis:**

| Papel | Pessoa | Responsabilidade |
|---|---|---|
| Dono do sistema / responsável pelo SGSI | `[ PREENCHER ]` | Governança do Agracta, riscos, SoA |
| Administrador do sistema | `[ PREENCHER ]` | Cadastros, janelas, cópia de segurança, publicação das regras |
| Diretor de Estudo | `[ PREENCHER ]` | Integridade técnica e científica dos dados do estudo |
| Garantia da Qualidade | `[ PREENCHER ]` | Revisão da trilha; auditoria independente |
| Arquivista | `[ PREENCHER ]` | Guarda e retenção dos registros |

## 6. Planejamento

### 6.1 Inventário de ativos

| Ativo | Onde | Classificação | Dono |
|---|---|---|---|
| Dados de ensaio (locais, quadras, estudos, aplicações, avaliações) | Firestore `workspaces/agracta` + cofre nos aparelhos | `[ PREENCHER ]` | `[ PREENCHER ]` |
| Histórico de versões e eventos formais | Firestore (`historico/`, `eventos/`) | `[ PREENCHER ]` | GQ |
| Cadastro de pessoas e janelas | Firestore (`members/`) | Interno | Administrador |
| Credenciais de login | Firebase Authentication | Confidencial | Cada pessoa |
| Fotos de parcela | Só no aparelho que fotografou | `[ PREENCHER ]` | `[ PREENCHER ]` |
| Código e regras de acesso | GitHub (repositório **público**) | Público | Dono do sistema |
| Exports e cópias de segurança | `[ PREENCHER: local ]` | Confidencial | Arquivista |
| Registros de validação | Arquivo da GQ | Controlado | GQ |

### 6.2 Riscos

| ID | Risco (C/I/D) | Prob. | Impacto | Controle (Anexo A) | Tratamento | Resp. / prazo |
|---|---|---|---|---|---|---|
| R-01 | Acesso indevido por login compartilhado | `[ ]` | Alto | A.5.15–5.18, A.8.5 | POP: uma pessoa, um login; senha forte | `[ PREENCHER ]` |
| R-02 | Ex-membro com acesso | `[ ]` | Médio | A.5.18 | Desativar no Painel Admin na saída; revisão trimestral de acessos | `[ PREENCHER ]` |
| R-03 | Perda de dado (falha, erro, aparelho) | `[ ]` | Alto | A.8.13, A.8.14 | Histórico no servidor + cofre + export; rotina fora do Firebase | `[ PREENCHER ]` |
| R-04 | Alteração não rastreada | `[ ]` | Alto | A.8.15 | Histórico e eventos só por acréscimo; motivo obrigatório | `[ PREENCHER ]` |
| R-05 | Ação crítica por quem não deveria (sem papéis) | `[ ]` | Alto | A.5.15, A.8.2 | Senha na ação + evento com autor; papéis (lacuna L1) | `[ PREENCHER ]` |
| R-06 | Aparelho desbloqueado e logado | `[ ]` | Médio | A.8.1, A.7.7 | Bloqueio de tela; janela de horário | `[ PREENCHER ]` |
| R-07 | Regras publicadas diferentes do repositório | `[ ]` | Alto | A.8.32 | Conferência a cada validação (IQ-04); publicar pelo CI (L8) | `[ PREENCHER ]` |
| R-08 | `[ PREENCHER ]` | | | | | |

### 6.3 Objetivos de segurança
`[ PREENCHER — ex.: zero perda de dado bruto; 100% de acessos individuais; cópia fora do Firebase verificada todo mês ]`

## 7. Apoio
- **7.2 Competência e treinamento:** `[ PREENCHER: registro de treinamento no app, em BPL e neste POP ]`
- **7.3 Conscientização:** `[ PREENCHER ]`
- **7.5 Informação documentada:** este pacote (`docs/conformidade/` e `docs/VALIDACAO-SISTEMA.md`) é versionado no git; as cópias assinadas ficam no arquivo da GQ.

## 8. Operação
- **8.1 Controle operacional:** POP de acesso, assinatura e backup; controle de mudanças da validação (§11).
- **8.2 / 8.3 Avaliação e tratamento de riscos:** `[ PREENCHER: periodicidade ]`

## 9. Avaliação de desempenho
- **9.1 Indicadores:** `[ PREENCHER — ex.: incidentes, % de exports verificados, acessos revisados no prazo ]`
- **9.2 Auditoria interna:** `[ PREENCHER ]`
- **9.3 Análise crítica pela direção:** periodicidade `[ PREENCHER ]` · última `[ ]` · próxima `[ ]`

## 10. Melhoria — não conformidades e ações corretivas

| ID | Data | Não conformidade | Causa | Ação corretiva | Responsável | Status |
|---|---|---|---|---|---|---|
| NC-01 | `[ ]` | | | | | |

## Declaração de Aplicabilidade (SoA) — controles mais relevantes ao Agracta

Estado: ✅ implementado · 🟡 parcial · ⬜ a fazer · N/A.

| Controle | Aplicável | Como atende | Estado |
|---|---|---|---|
| A.5.10 Uso aceitável | Sim | POP de uso | `[ PREENCHER ]` |
| A.5.15 Controle de acesso | Sim | Cadastro fechado + regras do banco; **sem papéis** (L1) | 🟡 |
| A.5.16 Gestão de identidade | Sim | Uma conta Firebase por pessoa; nome completo no cadastro | ✅ |
| A.5.17 Informação de autenticação | Sim | Senha por pessoa; redefinição por e-mail; `[ PREENCHER: política e segundo fator ]` | 🟡 |
| A.5.18 Direitos de acesso | Sim | Criar, desativar, reativar e apagar no Painel Admin; janela de horário | ✅ |
| A.5.23 Serviços de nuvem | Sim | Firebase (Google), GitHub, Render — `[ PREENCHER: plano, região, termos ]` | 🟡 |
| A.5.30 Continuidade de TIC | Sim | Trabalho offline; histórico; export | 🟡 |
| A.6.3 Conscientização e treinamento | Sim | `[ PREENCHER ]` | ⬜ |
| A.7.7 Mesa e tela limpas | Sim | `[ PREENCHER: bloqueio de tela dos aparelhos ]` | ⬜ |
| A.8.2 Acesso privilegiado | Sim | Dois administradores fixos nas regras; contas pessoais (L7) | 🟡 |
| A.8.5 Autenticação segura | Sim | Firebase Authentication (e-mail/senha, Google) | 🟡 |
| A.8.13 Backup | Sim | Histórico no servidor + cofre + export; rotina fora do Firebase a definir (L6) | 🟡 |
| A.8.15 Registro de eventos | Sim | Histórico e eventos só por acréscimo, hora do servidor | ✅ |
| A.8.16 Monitoramento | Sim | `[ PREENCHER: revisão da trilha pela GQ ]` | 🟡 |
| A.8.24 Criptografia | Sim | HTTPS/TLS em trânsito; criptografia em repouso do Google; SHA-256 nas assinaturas e eventos | ✅ |
| A.8.28 Codificação segura | Sim | Portão de testes em todo PR; validação ([../VALIDACAO-SISTEMA.md](../VALIDACAO-SISTEMA.md)) | 🟡 |
| A.8.32 Gestão de mudanças | Sim | PR + CI + LEIA-ME por publicação; classes de mudança na validação §11 | 🟡 |

---
Aprovação do SGSI — Gerência: `[ PREENCHER nome, assinatura, data ]`

Fonte: ISO/IEC 27001:2022 (norma e Anexo A).

## Histórico

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 14/06/2026 | Emissão inicial |
| 2.0 | 11/10/2026 | Arquitetura atual (Firebase). Absorve as cláusulas 4–10 do antigo `docs/ISMS-laboratorio-modelo.md`, que deixa de existir |
