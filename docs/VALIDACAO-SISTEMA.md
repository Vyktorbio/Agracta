# Agracta — Validação do Sistema Computadorizado (CSV)

| | |
|---|---|
| **Documento** | Plano e protocolo de validação do Agracta |
| **Versão** | 2.2 — 17/10/2026 |
| **Base** | OECD GLP Nº 1 (NIT-Dicla-035) · OECD Advisory Document Nº 17 (2016) — sistemas computadorizados (NIT-Dicla-038) · OECD Advisory Document Nº 22 (2021) — integridade de dados · GAMP 5 (abordagem baseada em risco) |
| **Substitui** | versão 1.0 (14/06/2026, arquitetura anterior) e `docs/conformidade/validacao-sistema.md`, que deixa de existir |

> **Este arquivo é o MODELO controlado e é público** (o repositório é público e o
> site sai dele). As cópias preenchidas e assinadas, e os registros de execução,
> ficam no arquivo controlado da Garantia da Qualidade — nunca aqui. Campos a
> preencher aparecem como `[ PREENCHER ]`.
>
> A tela "Conformidade & ISMS" do app cita este arquivo pelo caminho. Quem mover
> ou renomear precisa trocar a citação no `app.js`.
>
> A matriz da §6 e a lista da §11.2 são conferidas por um teste
> (`tests/test_validacao_rastreabilidade.js`): todo requisito precisa ter teste,
> todo teste citado precisa existir e rodar no portão, e todo arquivo crítico
> citado precisa existir. Se o documento e o código se separarem, o portão reprova.

---

## 0. Identificação

| Campo | Valor |
|---|---|
| Sistema | **Agracta** — registro eletrônico de ensaios de campo (mapa, protocolo, aplicações, avaliações, estatística, relatório) |
| Endereço | https://agracta.com.br (espelho: vyktorbio.github.io/Agracta) |
| Repositório | github.com/Vyktorbio/Agracta |
| Classificação GAMP 5 | **Categoria 5** (software customizado) sobre infraestrutura de Categoria 1 |
| Versão validada (commit) | `[ PREENCHER: hash completo ]` |
| Etiqueta da versão validada | `[ PREENCHER: ex.: validado-1.0 ]` — ver §11.4 |
| Versão do pacote no ar | `[ PREENCHER: agracta-app-vNNN, do sw.js ]` |
| Dono do sistema (System Owner) | `[ PREENCHER ]` |
| Responsável pela validação | `[ PREENCHER ]` |
| Garantia da Qualidade | `[ PREENCHER ]` |
| Período da validação | `[ PREENCHER ]` |

---

## 1. Escopo e uso pretendido

O Agracta registra **dados brutos eletrônicos** de estudos de campo: protocolo,
tratamentos, randomização, aplicações (calda, equipamento, calibração, clima no
ato), avaliações por parcela × variável, assinaturas, finalização e relatório.

| Dentro do escopo (crítico para BPL) | Fora do escopo (apoio, informativo) |
|---|---|
| Acesso, cadastro de pessoas e janela de horário | Satélites, NDVI, solo, relevo e clima consultados de fontes externas |
| Protocolo: aprovação, emendas, desvios | Aba "Conhecimento" e cruzamentos entre estudos |
| Registro de aplicações e avaliações | Vista 3D, croqui ilustrativo, slides de fotos |
| Assinatura, finalização, reabertura | Calculadora de drone (planejamento) |
| Histórico de versões e eventos formais no servidor | Portal do patrocinador (cópia selecionada, só leitura) |
| Estatística congelada na finalização e relatório | |
| Cálculos de dose, calda e preparo | |

O que está fora do escopo pode ser usado, mas **não gera dado bruto**. Quando um
valor externo vira registro do estudo (o clima carimbado na aplicação, por
exemplo), o registro guarda a origem, e a conferência é de quem registra.

---

## 2. Descrição do sistema

```
 aparelho de campo (Android / iPhone / computador)
 ├── PWA servido por GitHub Pages (HTTPS)       ← código: este repositório
 ├── armazenamento local: localStorage + cofre IndexedDB (trabalho offline)
 └── firebase-sync.js ──► Firebase (Google), projeto agracta-vyktorbio
                          ├── Authentication: e-mail/senha e Google
                          └── Firestore: workspaces/agracta
                              ├── members/{email}   cadastro: ativo + janela
                              ├── <dados>           locais, quadras, estudos,
                              │                      aplicações, avaliações…
                              ├── historico/        versão ANTERIOR de cada
                              │                      gravação (só acréscimo)
                              └── eventos/          ações críticas (só acréscimo,
                                                     id = SHA-256 do conteúdo)
 proxy Python (Render: ndvi-iracemapolis) ──► NDVI, satélites, clima  (fora do escopo)
```

**Como uma gravação acontece.** O aparelho grava primeiro localmente. Depois, numa
única transação do Firestore, sobem: os documentos que mudaram, um registro em
`historico/` com o conteúdo **anterior** de cada um, e a nova revisão do workspace.
As regras do banco recusam a transação inteira se a revisão não for a seguinte à
atual (sem "último aparelho vence"), e recusam registro de histórico com hora
diferente da do servidor ou autor diferente da sessão.

**Quem decide o acesso é o banco**, não a tela. As `firestore.rules` exigem, a cada
leitura e escrita: sessão autenticada, cadastro em `members/{email}` com
`active: true`, e hora do servidor dentro da janela daquela pessoa. Dois
administradores são fixos nas regras por e-mail.

**Fornecedores (infraestrutura, Categoria 1).** Google Firebase (autenticação e
banco), GitHub (código, CI e hospedagem), Render (proxy informativo). A
qualificação deles é documental: plano, região, termos — ver IQ-07.

---

## 3. Avaliação de risco

Base: OECD Nº 17 §1 e Nº 22 — o esforço de validação acompanha o impacto no dado.
Impacto e probabilidade: A (alto), M (médio), B (baixo). A detectabilidade diz se
uma falha apareceria antes de virar dado errado no relatório.

| # | Função | Impacto no dado | Prob. de falha | Detectabilidade | Risco | Controle principal | Verificado por |
|---|---|---|---|---|---|---|---|
| R1 | Controle de acesso | A | B | baixa | **M** | regras do banco; cadastro só do administrador | URS-01, URS-02 |
| R11 | Ação crítica por quem não tem papel para ela | A | M | média | **A** | papel no cadastro; tabela do administrador conferida pelo banco; a tela barra antes | URS-17 |
| R2 | Gravação e sincronização entre aparelhos | A | M | média | **A** | transação com revisão atômica; histórico na mesma transação | URS-07, URS-11 |
| R3 | Registro da avaliação | A | B | alta | M | grade por parcela; pendências antes de finalizar | URS-03 |
| R4 | Correção de dado assinado | A | M | média | **A** | motivo obrigatório; evento `observacao.corrigida`; assinatura deixa de conferir | URS-05, URS-06, URS-08 |
| R5 | Assinatura e finalização | A | B | alta | M | SHA-256 do conteúdo; senha na finalização | URS-06, URS-10 |
| R6 | Protocolo após aprovação | A | M | média | **A** | emenda com motivo e versão; desvio registrado | URS-09 |
| R7 | Cálculos (estatística, dose, calda) | A | B | **baixa** | **A** | oráculos independentes nos testes; dois motores de estatística comparados | URS-14 |
| R8 | Perda de dado (aparelho, falha, exclusão) | A | M | média | **A** | cofre local; histórico no servidor; lápides; restauração | URS-12, URS-13 |
| R9 | Versão errada no aparelho | M | M | média | M | número de cache conferido pelo portão | URS-16 |
| R10 | Relatório diferente do dado | A | B | média | M | relatório montado do dado gravado; estatística congelada | URS-15 |

O que os controles **não** fecham está na §10 (lacunas), com ação proposta.

---

## 4. Requisitos do usuário (URS)

| ID | Requisito | Crítico |
|---|---|---|
| URS-01 | Cada pessoa entra com login próprio. Só o administrador cadastra quem pode usar; conta sem cadastro não lê nem grava nada. | Sim |
| URS-02 | Revogar o acesso vale na operação seguinte, e a janela de horário de cada pessoa é imposta pelo servidor, pela hora do servidor. | Sim |
| URS-03 | Registrar avaliações por parcela × variável, com a data do ensaio escolhida por quem registra (não a data da digitação). | Sim |
| URS-04 | Toda gravação é **atribuível** (autor da sessão) e tem a hora do **servidor** registrada fora do alcance do aparelho. | Sim |
| URS-05 | Alterar dado assinado exige **motivo** e preserva o valor anterior (de → para). | Sim |
| URS-06 | Assinatura eletrônica com nome, significado e data/hora, ligada ao conteúdo assinado: alterar o conteúdo depois faz a assinatura deixar de conferir. | Sim |
| URS-07 | O servidor guarda a versão anterior de cada gravação, e ninguém — nem o administrador pelo app — edita ou apaga esse histórico. | Sim |
| URS-08 | Ações críticas (finalizar, reabrir, aprovar, emendar, corrigir dado assinado) viram eventos imutáveis e verificáveis. | Sim |
| URS-09 | Protocolo aprovado não muda em silêncio: mudança planejada é emenda (com motivo e nova versão); execução fora do protocolo é desvio. | Sim |
| URS-10 | Estudo finalizado fica somente leitura, com a estatística congelada; reabrir exige senha e motivo. | Sim |
| URS-11 | Funcionar offline no campo e sincronizar ao reconectar, sem que um aparelho apague o trabalho de outro. | Sim |
| URS-12 | Exclusão é rastreável (quem, quando, o que havia) e recuperável. | Sim |
| URS-13 | Cópia de segurança e restauração de um estado anterior. | Sim |
| URS-14 | Cálculos corretos: ANOVA/Tukey, eficácia, AACPD, dose, calda e preparo de bancada. | Sim |
| URS-15 | Relatório do estudo e exportação montados a partir do dado gravado. | Sim |
| URS-16 | A versão publicada é íntegra (todo arquivo existe) e identificável, e o aparelho instalado recebe a versão nova. | Sim |
| URS-17 | Cada pessoa tem um papel (técnico, supervisor, diretor). Finalizar, reabrir, aprovar protocolo, emendar e excluir exigem o papel mínimo da tabela que o administrador define, e o **banco** recusa quem não tem. Corrigir avaliação assinada e restaurar versão também exigem papel, conferido pela tela e registrado no evento. | Sim |
| URS-18 | `[ PREENCHER: requisitos próprios do laboratório ]` | |

---

## 5. Estratégia de teste

A OQ tem **duas metades**, e as duas são necessárias:

1. **OQ automática** — os testes do repositório, rodados pelo portão
   (`conferir.sh`) e pelas regras no emulador (`npm run test:regras`). Rodam em
   todo pull request no CI do GitHub. Provam a lógica e as regras do banco com
   entradas controladas, inclusive casos que à mão seriam impossíveis (dois
   aparelhos gravando no mesmo instante, confirmação perdida na rede).
   **Evidência:** o registro gerado por `bash tools/registro-oq.sh --com-regras`
   (cabeçalho com commit, data, quem rodou e ambiente; SHA-256 num arquivo ao
   lado), anexado ao dossiê. Teste **pulado** não é teste aprovado: a OQ
   automática só vale com 0 pulados.
2. **OQ manual** — o que só o ambiente real prova: o projeto Firebase de
   produção com as regras publicadas, os aparelhos da equipe, a interface.
   Feita com um **estudo de teste** identificado como tal (ex.: código
   `VAL-AAAA-01`), que é finalizado e mantido como evidência — nunca apagado.

A IQ confere que o que está no ar é exatamente o que foi testado. A PQ confere o
uso real, com registro em papel em paralelo.

---

## 6. Matriz de rastreabilidade

Cada requisito com os testes automáticos que o cobrem e os testes manuais que o
completam.

<!-- matriz:inicio -->
| URS | Testes automáticos | OQ / PQ manuais |
|---|---|---|
| URS-01 | `tests/acesso-rules.cjs` · `tests/test_login_laco.js` · `tests/test_admin_apagar_conta.js` · `tests/test_offline_local.js` | OQ-01, OQ-04 |
| URS-02 | `tests/acesso-rules.cjs` · `tests/test_acesso_horario.js` | OQ-02, OQ-03 |
| URS-03 | `tests/test_avaliacao_tipos.js` · `tests/test_avaliacao_n_parcela.js` · `tests/test_carimbo_data_evento.js` · `tests/test_avaliacao_sem_travar.js` | OQ-05, PQ-01 |
| URS-04 | `tests/historico-rules.cjs` · `tests/eventos-rules.cjs` · `tests/test_identidade_bpl.js` | OQ-06 |
| URS-05 | `tests/test_eventos_app.js` · `tests/test_observacao_eventos.js` · `tests/test_trilha_formal.js` | OQ-07 |
| URS-06 | `tests/test_assinatura.js` | OQ-08 |
| URS-07 | `tests/historico-rules.cjs` · `tests/test_versoes.js` · `tests/test_sync_parcial.js` | OQ-06, OQ-09 |
| URS-08 | `tests/eventos-rules.cjs` · `tests/test_eventos_nuvem.js` · `tests/test_observacao_eventos.js` · `tests/test_trilha_formal.js` | OQ-07, OQ-11 |
| URS-09 | `tests/test_protocolo_vivo.js` | OQ-10 |
| URS-10 | `tests/test_finalizacao.js` · `tests/test_trilha_finalizacao.js` · `tests/test_reabertura_sync.js` | OQ-11 |
| URS-11 | `tests/test_offline_local.js` · `tests/test_sync_edicao_aberta.js` · `tests/test_sync_envio_pendente.js` · `tests/test_sync_falha_visivel.js` · `tests/test_envio_perdido.js` · `tests/test_sw_shell_offline.js` · `tests/sync-firestore.cjs` | OQ-12, PQ-01, PQ-02 |
| URS-12 | `tests/test_lapides_merge.js` · `tests/test_versoes.js` | OQ-13 |
| URS-13 | `tests/test_backup_local.js` · `tests/test_backup_restauracao.js` · `tests/test_cofre_falha.js` · `tests/test_versoes.js` | OQ-09, OQ-14, PQ-04 |
| URS-14 | `tests/test_estatistica.js` · `tests/test_prancha_uma_repeticao.js` · `tests/test_motores_estatistica.js` · `tests/test_dose_core.js` · `tests/test_biocalc_mistura.js` · `tests/test_biocalc_lab.js` · `tests/test_aplicacao_core.js` | OQ-15 |
| URS-15 | `tests/test_relatorio.js` · `tests/test_relatorio_fluxo.js` | OQ-16, PQ-03 |
| URS-16 | `tests/check-assets.cjs` · `tests/test_cache_modulos.js` | IQ-02, IQ-03 |
| URS-17 | `tests/papeis-rules.cjs` · `tests/test_papeis.js` · `tests/test_papeis_app.js` | OQ-17, IQ-09 |
<!-- matriz:fim -->

---

## 7. IQ — Qualificação de Instalação

O que está no ar é o que foi testado, no ambiente especificado.

| ID | Verificação | Critério | Resultado | Evidência | Exec. / data |
|---|---|---|---|---|---|
| IQ-01 | Endereço publicado | https://agracta.com.br abre com certificado válido; o app instala como PWA | `[ ]` | captura | `[ ]` |
| IQ-02 | Versão no ar = versão validada | O `sw.js` publicado traz o mesmo `agracta-app-vNNN` do commit validado, e o `main` do GitHub está nesse commit | `[ ]` | captura do `sw.js` + commit | `[ ]` |
| IQ-03 | OQ automática no commit validado | Registro de `tools/registro-oq.sh --com-regras`: portão APROVADO, regras APROVADO, **0 pulados**; o `.sha256` confere | `[ ]` | registro anexado | `[ ]` |
| IQ-04 | Regras do banco publicadas = repositório | Console Firebase → Firestore → Regras: conteúdo igual ao `firestore.rules` do commit validado; anotar a data da publicação | `[ ]` | captura | `[ ]` |
| IQ-05 | Autenticação | Provedores ativos = e-mail/senha e Google (como no `firebase.json`). O auto-cadastro do Firebase fica ligado porque o Painel Admin cria contas por ele; isso não dá acesso a dado nenhum (URS-01) | `[ ]` | captura | `[ ]` |
| IQ-06 | Pessoas com acesso | Cadastros ativos = equipe atual, uma pessoa por e-mail, sem conta compartilhada; os dois administradores das regras são os esperados | `[ ]` | lista assinada | `[ ]` |
| IQ-07 | Fornecedores | Plano do Firebase `[ PREENCHER: Spark/Blaze ]` · região do banco `[ PREENCHER ]` · backup agendado do Firestore `[ PREENCHER: sim/não ]` · termos de serviço arquivados | `[ ]` | capturas | `[ ]` |
| IQ-08 | Aparelhos de campo | Para cada aparelho: modelo, sistema, navegador e versão; **data e hora automáticas ligadas**; app instalado | `[ ]` | lista | `[ ]` |
| IQ-09 | Papéis e tabela | Cada cadastro ativo tem o papel que a pessoa exerce no laboratório; a tabela "quem pode o quê" do Painel Admin é a aprovada pela GQ (anotar a data de "Salvar tabela") | `[ ]` | captura do Painel Admin | `[ ]` |

---

## 8. OQ manual — Qualificação de Operação

Executar com o estudo de teste `VAL-AAAA-01` e duas contas de teste (técnico A,
técnico B) cadastradas só para isso.

| ID | Teste | Passos | Esperado | Resultado | Exec. / data |
|---|---|---|---|---|---|
| OQ-01 | Entrada | Entrar com senha certa; com senha errada; com conta Google que não está cadastrada | Certa entra; errada é recusada com mensagem; conta sem cadastro não vê dado nenhum | `[ ]` | `[ ]` |
| OQ-02 | Revogação | Com o técnico A logado no aparelho dele, desativá-lo no Painel Admin; ele tenta gravar | A gravação não chega ao servidor e o app mostra a falha (não finge que salvou); o que estava no aparelho não se perde | `[ ]` | `[ ]` |
| OQ-03 | Janela de horário | Dar ao técnico B uma janela que termina em 15 min. Repetir com o relógio do aparelho adiantado 1 h | Aviso 10 min antes, sincroniza e trava no horário do **servidor**, nos dois casos | `[ ]` | `[ ]` |
| OQ-04 | Cadastro é do administrador | Técnico A tenta alterar um cadastro de pessoa | O banco recusa, mesmo que o painel abra | `[ ]` | `[ ]` |
| OQ-05 | Registro de avaliação | Técnico A lança uma avaliação completa com data do ensaio de ontem | Grava com o autor certo e a data de ontem; nenhuma pendência na finalização | `[ ]` | `[ ]` |
| OQ-06 | Hora e autor no servidor | Com o relógio do aparelho errado, gravar. Abrir Menu → Histórico da nuvem | A gravação aparece com o nome de quem gravou e a hora certa (do servidor) | `[ ]` | `[ ]` |
| OQ-07 | Correção de dado assinado | Assinar a avaliação. Reabrir para editar sem motivo; depois com motivo, trocando uma nota | Sem motivo, não reabre. Com motivo, a trilha formal mostra de → para, autor, hora e motivo, e o selo da trilha diz que o registro confere | `[ ]` | `[ ]` |
| OQ-08 | Assinatura ligada ao conteúdo | Ver a assinatura da avaliação antes e depois da correção do OQ-07 | Antes confere; depois, a assinatura antiga deixa de conferir e o app pede nova | `[ ]` | `[ ]` |
| OQ-09 | Restauração de versão | Menu → Histórico da nuvem → voltar para antes da correção | Pede senha; o estado volta; a própria restauração aparece como nova gravação no histórico | `[ ]` | `[ ]` |
| OQ-10 | Protocolo | Aprovar o protocolo (senha e rubrica). Mudar o número de repetições. Registrar um desvio | Aprovado vira versão 1; a mudança pede motivo e vira emenda (versão 2); o desvio fica registrado sem mudar o protocolo | `[ ]` | `[ ]` |
| OQ-11 | Finalização e reabertura | Finalizar (senha, rubrica). Tentar editar. Reabrir com senha e motivo | Estudo somente leitura, estatística congelada, fora da agenda; finalização e reabertura aparecem como eventos, a reabertura com motivo | `[ ]` | `[ ]` |
| OQ-12 | Offline e sincronização | Aparelho A em modo avião: lançar notas, fechar o app, reabrir sem rede, religar a rede. Ver no aparelho B | Notas preservadas offline; sobem ao reconectar; aparecem no B | `[ ]` | `[ ]` |
| OQ-13 | Exclusão rastreável | Excluir uma avaliação do estudo de teste (pede senha) | Some da tela; o Histórico da nuvem mostra quem excluiu, quando e o conteúdo anterior; é restaurável | `[ ]` | `[ ]` |
| OQ-14 | Cópia de segurança | Menu → Backup (arquivo) | Arquivo JSON gerado e legível, com estudos, avaliações e trilhas | `[ ]` | `[ ]` |
| OQ-15 | Cálculos contra referência | Lançar um conjunto de dados com resultado conhecido (calculado no R ou em tabela publicada) e conferir ANOVA, Tukey e eficácia. Conferir uma calda contra cálculo à mão | Valores iguais dentro do arredondamento declarado | `[ ]` | `[ ]` |
| OQ-17 | Papéis | Técnico A tenta finalizar, reabrir, aprovar e excluir; corrige uma avaliação que ele assinou e uma assinada pelo técnico B. Promover A a diretor no Painel Admin e repetir a finalização | A tela recusa cada ação dizendo o papel que ela pede; a correção da própria passa (com motivo) e a do colega não; promovido, A finaliza sem reabrir o app; a trilha formal mostra o papel de quem fez | `[ ]` | `[ ]` |
| OQ-16 | Relatório | Gerar o relatório do estudo de teste (Word/PDF) | Tratamentos, doses, aplicações, avaliações e estatística batem com o dado gravado | `[ ]` | `[ ]` |

---

## 9. PQ — Qualificação de Desempenho

Uso real, nas condições reais. O registro em papel em paralelo existe só durante
a PQ, e é ele que permite afirmar que o eletrônico está certo.

| ID | Cenário | URS | Critério | Resultado | Exec. / data |
|---|---|---|---|---|---|
| PQ-01 | Um estudo real conduzido inteiro no Agracta, com registro em papel em paralelo | 03, 11 | 100% dos valores do relatório batem com o papel; toda divergência explicada | `[ ]` | `[ ]` |
| PQ-02 | Dois técnicos, dois aparelhos, mesmo estudo, parcelas diferentes, ao mesmo tempo, com sinal ruim | 11 | Nenhum valor perdido nem sobrescrito; cada valor com o autor certo | `[ ]` | `[ ]` |
| PQ-03 | Reconstrução para inspeção: a GQ reconstrói o estado do estudo numa data passada pelo histórico e pelos eventos | 07, 08, 15 | A reconstrução bate com o registro em papel daquela data | `[ ]` | `[ ]` |
| PQ-04 | Aparelho perdido (simulado: apagar os dados do site no navegador) | 13 | Tudo que foi sincronizado volta ao entrar de novo | `[ ]` | `[ ]` |

---

## 10. Lacunas conhecidas e ações

Validar é também dizer o que o sistema **não** garante. Cada lacuna tem uma
decisão: corrigir, mitigar por procedimento, ou aceitar com justificativa.

| # | Lacuna | Risco | Mitigação atual | Ação proposta | Decisão / prazo |
|---|---|---|---|---|---|
| L1 | **Papéis: parte fica só na tela.** Desde a 36ª publicação o banco confere finalizar, reabrir, aprovar, emendar e excluir. Corrigir avaliação assinada e restaurar versão são conferidos só pela tela: uma nota lançada offline por um colega pode chegar ao servidor depois da assinatura sem que ninguém esteja corrigindo nada, e o banco não distingue os dois casos — recusar travaria a sincronização daquele aparelho. Um app antigo ou adulterado conseguiria corrigir sem o papel. E papel rebaixado com o aparelho sem rede: a tela usa o último papel lido, o banco recusa, e a sincronização daquele aparelho para até o papel voltar (ver LEIA-ME, 36ª) | M | a correção exige motivo e vira evento `observacao.corrigida` com o papel do autor e o exigido; a assinatura antiga deixa de conferir | Separar no banco a nota lançada da nota corrigida (exige a observação canônica gravada por célula) | `[ PREENCHER ]` |
| L2 | O registro em `historico/` é escrito pelo app. Um cliente fora do app, com credencial válida, conseguiria gravar dado sem deixar o anterior | M | só membros ativos gravam; revisão atômica | Função no servidor copiando o anterior (exige plano Blaze), ou regra que exija o registro na mesma transação | `[ PREENCHER ]` |
| L3 | Só cinco tipos de ação viram evento formal. As demais ficam na trilha do estudo (escrita pelo aparelho) e no histórico | M | o histórico guarda o anterior de tudo | Ampliar os tipos de evento conforme o uso | `[ PREENCHER ]` |
| L4 | Assinar avaliação é um toque, sem senha (escolha do laboratório). Finalizar, aprovar, reabrir, excluir e restaurar pedem senha | M | login individual; janela de horário; sessão por pessoa | Decidir se a assinatura da avaliação também pede senha | `[ PREENCHER ]` |
| L5 | Carimbos por célula (`_ts`) usam o relógio do aparelho. A hora oficial é a do servidor, no histórico e nos eventos | B | IQ-08 (hora automática); hora do servidor no histórico | Dizer no POP que a hora oficial é a do histórico | `[ PREENCHER ]` |
| L6 | Backup do banco depende do plano do Firebase. Sem backup agendado, a cópia fora do Firebase é o arquivo exportado à mão | A | histórico no servidor; cofre no aparelho; export JSON | Rotina de export com responsável e local segregado, ou backup agendado (Blaze) | `[ PREENCHER ]` |
| L7 | Os dois administradores são contas pessoais, fixas nas regras | M | — | Conta institucional; trocar exige publicar as regras | `[ PREENCHER ]` |
| L8 | As regras do banco são publicadas à mão, separadas do site; nada confere sozinho que o publicado é o do repositório | M | IQ-04 a cada validação | Publicar as regras pelo CI | `[ PREENCHER ]` |
| L9 | Fotos de parcela ficam só no aparelho que fotografou (desde a 14ª publicação) | A, se foto for dado bruto | slides e originais exportáveis | Definir no POP se foto é dado bruto e, se for, quando e onde arquivar | `[ PREENCHER ]` |
| L10 | Validação ainda não executada | A | — | Executar IQ/OQ/PQ deste documento | `[ PREENCHER ]` |

---

## 11. Controle de mudanças e revalidação

### 11.1 Como uma mudança entra

1. Toda mudança entra no `main` por commit. O site publica o `main`.
2. Mudança por pull request passa pelo CI (`conferir.sh --pull-request` e
   `npm run test:regras`). Mudança enviada direto pela web passa antes pelo
   portão no computador (duplo clique em "Conferir antes de publicar").
3. Cada publicação do app ganha uma entrada numerada no `LEIA-ME.txt`: o que
   mudou, por quê, o que conferir depois de subir e quais testes.
4. As regras do Firestore são publicadas **à parte** e registradas: data, quem
   publicou, commit de origem (ver L8).

### 11.2 Classificação

| Classe | O que toca | O que se repete |
|---|---|---|
| **Crítica** | qualquer arquivo da lista abaixo | OQ automática (registro novo) + os OQ manuais do requisito afetado + nova versão validada |
| **Normal** | interface, textos, funções fora do escopo (§1) | OQ automática (registro novo); anotar no histórico deste documento |
| **Documentação** | só `docs/`, `README`, `LEIA-ME` | nada |

Arquivos de classe crítica (conferidos pelo teste de rastreabilidade — se um for
renomeado, esta lista acompanha):

<!-- criticos:inicio -->
- `firestore.rules` — URS-01, 02, 04, 07, 08, 17
- `firebase-sync.js` — URS-04, 07, 11, 13
- `acesso-horario.js` — URS-02
- `eventos-app.js` · `trilha-formal.js` — URS-05, 08
- `vendor/eventos-core.js` · `vendor/observacao-core.js` — URS-05, 08
- `vendor/versoes-core.js` — URS-07, 12, 13
- `vendor/assinatura-core.js` — URS-06
- `vendor/protocolo-vivo-core.js` — URS-09
- `vendor/papeis-core.js` · `papeis-app.js` — URS-17
- `vendor/avaliacao-core.js` · `vendor/pendencias-core.js` — URS-03, 10
- `estatistica.js` — URS-14
- `vendor/dose-core.js` · `vendor/biocalc-campo-core.js` · `vendor/biocalc-lab-core.js` · `vendor/aplicacao-core.js` — URS-14
- `vendor/relatorio-core.js` · `relatorio-estudo.js` — URS-15
- `sw.js` — URS-16
- `app.js` — **crítico quando a mudança toca** gravação, avaliação, assinatura, finalização, protocolo, exclusão ou restauração
<!-- criticos:fim -->

### 11.3 Revalidação periódica

Mesmo sem mudança crítica: a cada `[ PREENCHER: 12 ]` meses, refazer IQ-02 a
IQ-08 e um registro novo da OQ automática.

### 11.4 Etiqueta da versão validada

Depois da validação aprovada e assinada, o commit validado recebe uma etiqueta
no GitHub, para qualquer pessoa achar exatamente aquele código depois:
**Releases → Draft a new release → Choose a tag** → `validado-1.0` →
*Target*: o commit validado → título "Versão validada 1.0" → publicar. Cada
revalidação aprovada ganha a seguinte (`validado-1.1`, `validado-2.0`).

---

## 12. Conclusão e liberação

| | |
|---|---|
| Resultado | `[ PREENCHER: Aprovado / Aprovado com ressalvas / Reprovado ]` |
| Ressalvas (lacunas aceitas e por quê) | `[ PREENCHER ]` |
| Validado por | `[ PREENCHER: nome, função, assinatura, data ]` |
| Revisado pela Garantia da Qualidade | `[ PREENCHER: nome, assinatura, data ]` |
| Liberado para uso em estudos BPL por | `[ PREENCHER: nome, função, assinatura, data ]` |

---

## Histórico deste documento

| Versão | Data | Alteração |
|---|---|---|
| 1.0 | 14/06/2026 | Emissão inicial (Supabase) |
| 2.2 | 17/10/2026 | URS-14: `tests/test_prancha_uma_repeticao.js` na matriz. A folha de gráficos com uma repetição sai descritiva (`Est.descrever`: médias, AACPD e Abbott, sem ANOVA, letras nem barra de erro) e não imprime p quando não há resíduo. Mudança crítica em `estatistica.js` (§11.2): registro novo da OQ automática e OQ-15 |
| 2.1 | 16/10/2026 | Papéis (URS-17, R11, OQ-17, IQ-09): papel no cadastro, tabela "quem pode o quê" no Painel Admin, conferida pelo banco para finalizar, reabrir, aprovar, emendar e excluir. L1 passa a cobrir só o que fica na tela |
| 2.0 | 11/10/2026 | Reescrita para o Firebase: arquitetura atual, histórico e eventos no servidor, protocolo vivo, assinatura por SHA-256; matriz de rastreabilidade conferida por teste; OQ automática com registro; lacunas L1–L10; controle de mudanças por classe. Junta e substitui `docs/conformidade/validacao-sistema.md` |

### Fontes
- OECD — *Application of GLP Principles to Computerised Systems*, Advisory Document Nº 17 (2016). No Brasil: NIT-Dicla-038.
- OECD — *GLP Data Integrity*, Advisory Document Nº 22 (2021).
- OECD — *Principles of Good Laboratory Practice*, Nº 1. No Brasil: NIT-Dicla-035.
- ISPE — GAMP 5, 2ª edição (2022): categorias de software e abordagem baseada em risco.
