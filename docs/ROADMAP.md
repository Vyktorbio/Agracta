# Roadmap técnico do Agracta

Evolução para uma plataforma completa de P&D agrícola **sem ruptura da usabilidade atual**.

> **Este documento diz em que ORDEM construir e ONDE cada coisa mora na tela.**
> O que o Agracta deve ser, e por quê, está em [`ARQUITETURA.md`](ARQUITETURA.md) —
> a especificação-mãe. Os dois se complementam e devem ser lidos juntos.
>
> Divergências entre os dois estão registradas em **Decisões em aberto**, no fim do
> `ARQUITETURA.md`. Uma delas afeta este arquivo: a §12.7 aqui recusa o "score
> 96/100" que a especificação propõe. Enquanto não houver decisão, vale o que está
> escrito aqui — contagem e classificação, não score.
>
> As notas em blocos `Estado (data)` foram verificadas contra o código e existem para
> o roadmap não virar lista de desejos — quando um item já estiver pronto, a nota diz
> onde ele mora.

---

## 1. Objetivo

Implementar as doze evoluções propostas **sem transformar o sistema em outro software**.

> **O usuário não deve precisar reaprender o Agracta.**

As novas capacidades aparecem dentro das entidades e telas que já existem:

| Entidade | Continua sendo | Mas passa a conhecer |
|---|---|---|
| **Quadra** | Quadra | solo, fertilidade, clima, relevo, histórico, cultura, BBCH, sensoriamento |
| **Estudo** | Estudo | protocolo versionado, plano experimental, aplicações, plano estatístico, auditoria, análise, conclusões |
| **Aplicação** | Aplicação | calda, equipamento, calibração, volume morto, receita, ordem de mistura, clima, rastreabilidade |
| **Avaliação** | Avaliação | escala, alvo, BBCH, fotos, dois avaliadores, validação, inconsistências, estatística |

## 2. Regra fundamental de interface

**Não criar um menu novo a cada funcionalidade.** A informação mora onde conceitualmente
pertence, como blocos recolhíveis dentro da ficha que já existe.

**Não criar:** Menu Solo · Menu Fertilidade · Menu Clima · Menu BBCH · Menu Calda ·
Menu Auditoria · Menu Estatística · Menu Amostras. Isso destruiria a simplicidade —
essas informações já têm dono conceitual.

## 3. Estratégia: evoluir sem reescrever

O `app.js` coordena a interface. A lógica sai progressivamente dele para motores
independentes. A divisão não precisa ser feita de uma vez: **cada módulo novo já nasce
modular**.

```
Agracta
├── app.js                  coordenação da interface
├── vendor/ (core)
│   ├── biocalc-campo-core.js      ← existe (mistura de calda)
│   ├── biocalc-lab-core.js        ← existe (bancada: ppm, série, ajuste i.a.)
│   ├── aplicacao-core.js          ← existe (operação: equipamento + calibração)
│   ├── protocolo-core.js
│   ├── fertilidade-core.js
│   ├── fenotipagem-core.js
│   ├── ambiente-core.js
│   ├── qualidade-core.js
│   ├── auditoria-core.js
│   ├── amostras-core.js
│   ├── delineamento-core.js
│   └── inteligencia-core.js
├── estatistica/
├── croqui.html
└── dados/
```

## 4. Princípio "motor puro + interface"

```
interface → motor → resultado estruturado → interface mostra → banco grava
```

Permite testar sem navegador, reutilizar o cálculo em outras telas, gerar relatório e
auditoria, rodar testes automáticos e, no futuro, expor por API.

> **Estado (01/09/2026):** este padrão **já está estabelecido**.
> `vendor/biocalc-campo-core.js` (310 linhas) e `vendor/biocalc-lab-core.js` (462 linhas)
> são motores puros, sem DOM, devolvendo objetos e não strings. Cobertos por
> `test_biocalc_mistura.js` (50 conferências) e `test_biocalc_lab.js` (85 verificações).

---

## 5. Fase zero — fundação (impacto visual ~zero)

- **5.1 Versionamento de esquema** — `AGRACTA_SCHEMA_VERSION`, para evoluir sem quebrar dados antigos.
- **5.2 IDs estáveis** — `quadra_id`, `estudo_id`, `tratamento_id`, `aplicacao_id`, `avaliacao_id`, `analise_solo_id`, `amostra_id`, `recomendacao_id`. **Nunca usar nome como chave lógica permanente.**
- **5.3 Origem genérica** — `origem: {tipo, fonte, versao, geradoEm, geradoPor}`. Tipos: `manual · sensor · mapa · laboratorio · calculado · importado · estimado`.
- **5.4 Revisão genérica** — `revisao: {criadoEm, criadoPor, revisadoEm, revisadoPor}`.
- **5.5 Feature flags** — toda função grande liga/desliga.

> **Estado:** 5.3 e 5.4 já existem de fato no módulo de solo (`fonte`, `ts`/`iso`/`app`,
> `revisadoEm`) e no `carimbo`, mas **sem nome comum**. Vale padronizar antes de espalhar.

## 6. Fase 1 — Protocolo vivo · **P0**

O protocolo vira entidade permanente e origem formal do estudo.

```
estudo.protocolo = { versao, status, identificacao, delineamento, tratamentos,
                     planoAplicacao, planoAvaliacoes, planoEstatistico,
                     aprovadoEm, aprovadoPor }
```

Estados: `RASCUNHO → APROVADO → EM EXECUÇÃO → FINALIZADO`

**Nunca editar silenciosamente após aprovado** — criar `estudo.emendas[]` com anterior,
novo, motivo, autor e data.

O protocolo passa a **gerar** aplicações, avaliações, coletas e atividades: a agenda não
é cadastrada à parte.

Estudos antigos continuam abrindo, com a opção *"Gerar a partir do estudo atual"*.

**Concluída quando:** um estudo nasce inteiro no Agracta, tratamentos não são
redigitados, aplicações e avaliações saem dele, alterações ficam versionadas e o
relatório reconstrói a versão usada.

## 7. Fase 2 — Motor universal de aplicação · **P0**

- **7.1** Motor sem HTML: `calcularAplicacao(config)`.
- **7.2** ✅ (01/09/2026) `tratamento.aplicacao.metodo` — T1 e T2 drone, T3 trator no mesmo estudo. Os cinco métodos do catálogo, com a **regra de categoria**: bancada só tem Potter, campo não tem Potter.
- **7.3** ✅ (01/09/2026) Perfil de equipamento **aprendido**, sem tela de cadastro: toda calibração válida gravada vira a configuração habitual daquela máquina, e a calculadora oferece reusá-la, datada. **Devolve configuração, nunca leitura** — pré-preencher coleta seria forjar medição.
- **7.4** ✅ (01/09/2026) A aplicação **herda** do estudo: tratamentos, doses, parcelas, repetições, método. O operador não redigita — e ao salvar, a memória de cálculo é **derivada** do estudo sozinha.
- **7.6** `aplicacao.memoriaCalculo` — entradas, fórmulas, resultados, alertas, **versão do motor**. Não só texto para copiar.
- **7.7** Calibração por equipamento (CO₂: pressão, bicos, espaçamento, vazões individuais, tempo, CV entre bicos, velocidade, taxa. Drone: modelo, velocidade, largura, altura, vazão, taxa, capacidade, mínimo operacional). ✅ sider e costal CO₂ na tela (01/09/2026), com a diferença certa entre eles: **coleta bico a bico só no costal**. Drone e Torre de Potter pendentes — e a Potter tem de ser a do laboratório.
- **7.8** Laboratório vira **submodo** do mesmo motor: PPM, preparação inversa, campo→bancada, ajuste de i.a., série de doses, testemunha automática, alertas de pipetagem/massa mínima.
- **7.9** A tela mostra o essencial e esconde o resto atrás de *"Ver cálculo completo"*.

**Concluída quando:** nenhum operador precisa abrir calculadora externa para executar um
estudo do Agracta.

> **Estado (01/09/2026) — gap real desta fase:**
> - ✅ **7.1** feito: os dois motores puros já existem e são testados.
> - ✅ **7.8** parcialmente: `biocalc-lab-core.js` já traz `calcPPM`, `calcPPMInverso`, `calcCampo`, `calcAjusteIA`, `calcSerie`, `alertaPipeta`, `alertaMassa`.
> - ✅ **§32** resolvido: a calculadora **já é tela nativa** (`openCalcAplicacao`, `app.js:6786`), não iframe.
> - ✅ **7.4** feito (01/09/2026). O buraco não era de interface: a configuração de
>   preparo só existia na TELA, então quem registrasse a aplicação direto — o caminho
>   normal de quem está no campo com o celular — deixava a aplicação sem nenhum
>   registro do que foi preparado. `calcConfigDoEstudo(study, qid)` deriva a
>   configuração do estudo sem tocar no DOM, com a mesma ordem de preferência da
>   calculadora, e `aplicacaoMemoriaAuto` grava a memória ao salvar a aplicação.
>   **Derivada e conferida não são a mesma coisa**: memória derivada é conta que o app
>   fez sozinho a partir do que estava declarado; conferida é a que alguém olhou na
>   calculadora e mandou gravar. A origem vai marcada, e a derivada **nunca** grava por
>   cima de nada. Faltando parcela ou volume de calda, não grava — melhor sem memória
>   que com uma de zeros com cara de registro. Coberto por `test_aplicacao_herda.js`
>   (28 verificações, com golden test).
> - ✅ **7.6** feito (01/09/2026): `aplicacao.memoriaCalculo` grava entradas, resultado por componente, avisos, autoria e a versão do motor. Regravar preserva o anterior em `memoriasAnteriores`. Coberto por `test_memoria_calculo.js` (63 verificações, com golden test).
> - ✅ **7.7** feito (01/09/2026): **barra e calibração na calculadora.**
>   Seção própria dentro de `openCalcAplicacao`, fechada por padrão — a calculadora de
>   calda continua sendo o assunto principal da tela. Coleta bico a bico ou da barra
>   inteira, e devolve largura de trabalho, vazão requerida, **coleta esperada por bico**
>   (o número que se leva para o campo), vazão medida, taxa real em L/ha, desvio,
>   velocidade ideal e CV entre bicos.
>   **Duas máquinas, e elas não fazem a mesma coisa.** O costal a CO₂ é o pulverizador
>   de pesquisa: cada bico vai para um copo, e daí sai o CV **entre bicos**, que é a
>   uniformidade da faixa. O sider é a máquina usual de campo — ninguém coleta bico a
>   bico nela; o cálculo é o de sempre, e a barra inteira se confere em três coletas,
>   cujo CV mede **repetibilidade da máquina**, não uniformidade. O mesmo número com
>   dois significados, e a tela nomeia cada um pelo que ele é.
>   A máquina vem do protocolo do estudo (equipamento, nº de bicos,
>   espaçamento, ponta, pressão), não do teclado; o que é **medida** (velocidade) nasce
>   em branco, porque default chumbado produz taxa plausível e falsa. Tolerância de taxa e limite de CV são editáveis,
>   porque o critério é do protocolo e não do programa. Toda a aritmética vem de
>   `vendor/aplicacao-core.js` (`equipmentOperation`); aqui não se recalcula nada.
>   A calibração entra na `memoriaCalculo` da aplicação em campo próprio, com leituras
>   brutas e versão do motor — e **só quando é válida**: bloco vazio num registro BPL
>   sugeriria calibração que não houve. Coberto por `test_calc_barra.js` (74
>   verificações, golden tests conferidos à mão).
> - 🔶 **7.2 e 7.3** — o MOTOR chegou (01/09/2026): `vendor/aplicacao-core.js`, extraído
>   da Calculadora Universal, já traz método por tratamento (`resolveTreatmentApplication`,
>   com override declarado por tratamento) e calibração por equipamento — trator/sider,
>   drone, CO₂, atomizador e Torre de Potter. Coberto por `test_aplicacao_core.js`
>   (67 verificações, com golden tests conferidos à mão). **Falta**, destes dois: o
>   método por tratamento na tela (7.2) e os perfis de equipamento salvos (7.3) — a
>   calibração da barra já está exposta, drone e Torre de Potter ainda não.
>
> - ✅ **7.2 e 7.3** feitos (01/09/2026). Duas regras governam o método na tela:
>   **(1) categoria** — numa quadra de laboratório o único método é a Torre de Potter;
>   numa quadra de campo a Potter não existe. Oferecer sider numa bancada é a §7-bis
>   vista do outro lado. **(2) divergência é que é informação** — enquanto todos os
>   tratamentos usam o método do estudo, ele não vira tinta em lugar nenhum; quando um
>   diverge, todos passam a mostrar o seu. É a regra do `volsVariam` levada ao método.
>   O override é **declarado**: sem a chave "métodos diferentes por tratamento", um
>   método guardado num tratamento numa edição anterior não volta a valer sozinho.
>   Coberto por `test_metodo_aplicacao.js` (47 verificações).
>
> Ou seja: **os Pacotes 1 e 2 da §31 estão essencialmente prontos.** O trabalho da
> Release B é o Pacote 3 (aplicação do estudo) mais persistência, método por tratamento
> e perfis de equipamento.

## 7-bis. Revisão da categoria LABORATÓRIO · ✅ **feito (01/09/2026)**

A quadra de laboratório (`data[qid].tipo==='lab'`) já está bem separada em vários
pontos — o cartão da quadra troca cultura/DAP/BBCH pela especialidade, a programação
de avaliações conta em HAT em vez de "a cada X dias", a dose pode ser em ppm, e a
calculadora que abre é a de bancada. Mas **ainda sobra campo dentro do laboratório**.
Auditoria de 01/09/2026:

| Onde | O que vaza | Por que é errado |
|---|---|---|
| `openStudyEditV2`, passo 4 | `1ª aplicação` · `Nº aplicações` · `Intervalo (dias)` — sem guarda de lab | Mais abaixo o mesmo formulário já chama de **"Dia do tratamento"**. Ficam duas noções concorrentes de quando o tratamento aconteceu, no mesmo formulário. |
| `openStudyEditV2`, "Desenho do ensaio" | `Como os tratamentos estão no campo`, com a opção **Faixas** e o texto sobre solo, declive e bordadura | Não existe faixa numa bancada. O aviso inteiro fala de gradiente de terreno. |
| Editor de aplicação e de avaliação | `Estádio BBCH no momento` | Guardado **por acidente**: só não aparece porque `getBBCHList(studyCultura(...))` devolve vazio quando não há cultura. Uma quadra convertida de campo para lab que tenha mantido `data[qid].cultura` volta a mostrar fenologia de planta num ensaio de placa. |

**Resolvido**, pelo padrão que a seção de avaliações já seguia: **ramificar por
`isQuadraLab`, não esconder por ausência de dado.** A linha de aplicações some na
bancada (com uma frase dizendo que o momento é o "Dia do tratamento"), faixas nem é
oferecido — e um estudo de bancada que tenha herdado `desenho:'faixas'` de uma edição
antiga é **corrigido ao salvar**, porque o campo sumiu da tela mas o dado errado não
some sozinho. O BBCH passou por `bbchListDaQuadra(qid, cultura)`, que pergunta pela
quadra; nenhum ponto da tela chama `getBBCHList` direto, e há teste cobrando isso.

## 8. Fase 3 — Fertilidade e nutrição · **P1**

`quadra.fertilidade.analises[]` — banco temporal, cada análise com id, data,
profundidade, laboratório, valores e derivados.

Valores: pH · MO · P · K · Ca · Mg · H+Al · Al · S · B · Cu · Fe · Mn · Zn · argila
Derivados **calculados**: SB · CTC · V% · m%

**Nunca usar SoilGrids como análise química.** A tela separa `ANÁLISE LABORATORIAL` de
`ESTIMATIVA CARTOGRÁFICA`.

Motor: `nutricao-core.js` (nome interno; a interface diz "Recomendação de fertilidade",
não "Boletim 100"). Cada regra carrega `{fonte, publicacao, edicao, versaoRegra}`.

Quando a recomendação definir momento (N em cobertura, BBCH 14–16), isso entra na agenda.

No croqui: escolher **um** indicador por vez (P, K, pH, V%, MO) — não pintar 15
nutrientes simultaneamente.

> **Estado (01/09/2026):** entregue em boa parte no PR #2 — banco temporal de análises,
> derivados calculados, separação cartográfico/estimado/observado, motor de calagem e de
> recomendação com pacote de tabelas carregável e trilha de cálculo.
> **Falta:** nomear o motor `nutricao-core.js` e movê-lo do `app.js` para `vendor/`;
> ligar a recomendação à agenda por BBCH; camada de fertilidade no croqui.
> **Nota:** as tabelas ficam em `solo-tabelas.json`, fora do versionamento — o
> repositório é público e o site sai dele.

## 9. Fase 4 — Caracterização ambiental · **P1**

`quadra.ambiente` — permanentes (altitude média/mín/máx, declividade, orientação,
posição topográfica, solo) e temporais (`environmentSnapshots[]`, nunca um único valor).

Na aplicação: temperatura, UR, vento, chuva anterior/posterior, radiação.
Na avaliação: chuva desde a aplicação, graus-dia, temperatura média, dias desde chuva.

**Janela ambiental** — "ambiente entre a aplicação A e a avaliação X": 14 dias, 72 mm,
24,6 °C média, 31,2 °C máxima, 6 dias com chuva.

Croqui ganha Declividade e Altitude, sem alterar o modo padrão.

## 10. Fase 5 — Fenotipagem inteligente · **P1**

`Cultura → BBCH → Alvo → Variável → Método`, via `variaveis-catalogo.js`.
Escalas percentuais ou ordinais, com referência visual por imagem.

**Dois avaliadores** — `avaliacao.avaliadores = {A:{dados}, B:{dados}}`, A não vê B
durante a coleta. Depois: correlação, ICC, Kappa, diferença média.

Fotos carregam estudo, avaliação, parcela, tratamento, repetição, BBCH, avaliador, GPS e
data/hora.

Voz só depois do fluxo manual consolidado. **Visão computacional nunca substitui a
avaliação humana** — guardar `valor_humano`, `valor_algoritmo`, `modelo`, `versao_modelo`.

## 11. Fase 6 — Estatística como parte do estudo · **P0**

Não deve existir *"exportar → descobrir o que fazer → rodar estatística"*. O plano nasce
no protocolo: `estudo.planoEstatistico = {delineamento, fatores, blocos, modelo, comparacao, alfa}`.

1. Consolidar o que existe: ANOVA, Kruskal, Tukey, Dunnett, regressão
2. dose-resposta, EC50, LC50, Kaplan-Meier, Cox
3. medidas repetidas, modelos mistos, GLM, GLMM

**Diagnóstico antes do resultado:** resíduos, homogeneidade, outliers, CV, faltantes.

Cada análise guarda `{dadosSnapshot, modelo, parametros, resultado, script, motor, versao}`,
com *"Ver código R"* sempre que possível.

## 12. Fase 7 — Investigação forense · **P0**

`qualidade-core.js` — **nunca altera dados, somente aponta.**

- Domínio: fora de escala, % > 100, contagem negativa, data impossível, BBCH inconsistente
- Temporal: avaliação antes da aplicação, aplicação antes do plantio, intervalo errado, BBCH retrocedendo
- Estatística: outlier, resíduo extremo, CV elevado
- Duplicação suspeita → escrever **"Conferir"**, nunca "dados fraudados"
- Avaliadores: tendência sistemática entre A e B
- Geografia: *"⚠ Registro realizado 2,4 km fora da área experimental"*

Painel mostra **contagem e classificação**, não um "score 96/100" — score passa falsa
aparência de validação científica absoluta.

## 13. Fase 8 — BPL / integridade completa · **CRÍTICA**

`audit_event`: id, entidade, entidade_id, ação, valor anterior, valor novo, usuário,
data/hora, motivo, dispositivo. **Append-only.**

Exclusão é lógica (`deleted = true`), correção exige motivo, finalização exige checklist,
reabertura exige usuário autorizado + motivo, eventos importantes pedem rubrica.

**A versão definitiva não pode depender só do navegador** — eventos precisam ser
persistidos onde o cliente comum não reescreva.

## 14. Fase 9 — Amostras e laboratório · **P2**

Entidade `amostra` com identificador legível (`AGR-2026-113 T3 R2 DAT14 SOLO`) e id
interno. QR na etiqueta. Criação a partir da avaliação, recebimento por escaneamento.

Workflow por laboratório (Nematologia, Fitopatologia, Química). **Genealogia nunca se
perde** — amostra original → raiz, solo, DNA, extrato. Resultado retorna ao estudo sem
planilha.

## 15. Fase 10 — Implantação experimental · **P2**

Entradas: polígono, NDVI histórico, solo, relevo, fertilidade, histórico.
Detecta gradientes ("vigor aumenta 18% de oeste para leste") e sugere orientação de blocos.

**Nunca randomizar silenciosamente:** o Agracta propõe, o pesquisador aprova.
Faixas exigem tratar explicitamente a **pseudorreplicação**.

## 16. Fase 11 — Inteligência entre ensaios · **P3**

Camada canônica `fact_observation` (estudo, local, quadra, tratamento, dose, cultura,
alvo, BBCH, variável, momento, valor) — não consultar estruturas antigas heterogêneas.

Por padrão só estudos finalizados. Além da média: variabilidade, estabilidade,
heterogeneidade. Meta-análise quando apropriado. Explicação de diferenças apresenta
**associações, não causalidade automática**.

## 17. Fase 12 — Interoperabilidade · **P3**

Vocabulários padronizados; exportações XLSX/CSV/JSON/GeoJSON/SVG/PDF; API interna
(`/studies`, `/plots`, `/observations`, `/samples`); adaptadores para MIAPPE/BrAPI —
**criar adaptadores, não reconstruir o sistema para obedecer ao padrão**.

## 18. Camada final — IA

Só depois da estrutura anterior. **Não é dona dos dados, é interface para eles.**
Toda conclusão precisa de `[Ver dados]`.

---

## 19. Dependências

```
FUNDAÇÃO
├── PROTOCOLO ──┬── APLICAÇÃO
│               └── AVALIAÇÃO ── FENOTIPAGEM
└── AUDITORIA BASE
QUADRA (SOLO · FERTILIDADE · AMBIENTE)
        ↓
ESTATÍSTICA → QUALIDADE FORENSE → FINALIZAÇÃO BPL
        ↓
BANCO HISTÓRICO → INTELIGÊNCIA → IA
```

## 20. Ordem de implementação

| Release | Conteúdo | Impacto visual |
|---|---|---|
| **A** | schema version, origem, revisão, audit event básico, feature flags, IDs, motores fora do app.js | ~zero |
| **B** | método por tratamento, perfis de equipamento, volume morto, sobra, receitas, calibração, memória de cálculo, modos de laboratório | a tela de aplicação ganha seções |
| **C** | protocolo estruturado, versionamento, aprovação, emendas, agenda automática | ficha do estudo ganha "Protocolo" |
| **D** | fertilidade | ficha da quadra ganha "Fertilidade" |
| **E** | ambiente | ficha da quadra ganha "Ambiente" |
| **F** | fenotipagem | avaliação fica mais inteligente |
| **G** | estatística | ficha do estudo ganha "Estatística" |
| **H** | qualidade | ficha do estudo ganha "Qualidade" |
| **I** | BPL completa | os mesmos fluxos passam a registrar rastreabilidade |
| **J** | laboratório | expande a área existente |
| **K** | implantação | ferramenta dentro do planejamento |
| **L** | inteligência histórica | **aqui sim** justifica tela nova ("Inteligência") |
| **M** | interoperabilidade + IA | — |

## 21–22. Onde cada coisa mora

```
MAPA
├── LOCALIDADE
└── QUADRA
     ├── Cultura / BBCH · Solo · Fertilidade · Ambiente · NDVI · Histórico
     └── ESTUDO
          ├── Protocolo · Delineamento · Tratamentos
          ├── Aplicações   → equipamento · calibração · calda · clima
          ├── Avaliações   → BBCH · variáveis · parcelas · fotos · avaliadores
          ├── Amostras · Estatística · Qualidade · Auditoria · Relatório
```

## 23. Testes obrigatórios

Cada motor com testes automáticos, especialmente aplicação, fertilidade, estatística e
qualidade.

**Golden tests:** entrada conhecida → resultado conhecido. Se uma alteração futura mudar
o resultado, **o teste falha**.

**Laboratoriais:** PPM, solução-mãe, pó puro, g/L, g/kg, campo→lab, série, ajuste de i.a.
As regras de precisão para volumes e massas muito baixos precisam virar testes de regressão.

**Compatibilidade:** *nenhuma nova funcionalidade pode tornar um estudo existente ilegível.*

## 24–26. Offline, sincronização, segurança

Offline obrigatório: quadras, protocolos, tratamentos, agenda próxima, avaliações
abertas, perfis de equipamento, regras essenciais.

Toda escrita com `id`, `timestamp`, `device`, `user`. **Dado assinado/finalizado nunca
aceita "último dispositivo vence".**

Papéis: Técnico (executa, avalia, registra) · Supervisor (corrige, reabre, confere) ·
Diretor (aprova protocolo, finaliza estudo) · Administrador.

## 27–28. Relatório e snapshot

O relatório final monta tudo sozinho. E — essencial — **estudo finalizado guarda
snapshot**: se o mapa de solo for atualizado em 2028, o relatório de um estudo de 2026
continua sabendo o que estava registrado em 2026.

## 29–30. Como priorizar

1. Isso reduz digitação?
2. Isso reduz possibilidade de erro?
3. Isso transforma dado existente em informação nova?

**P0** fundação · protocolo vivo · aplicação · auditoria · estatística
**P1** fertilidade · ambiente · fenotipagem · qualidade forense
**P2** amostras · laboratório · implantação
**P3** inteligência histórica · interoperabilidade · IA

## 32. Decisão sobre as calculadoras

A Calculadora Universal **não** entra por iframe. Aproveitar **motor + regras + testes**;
descartar a casca visual independente, porque suas seções já têm lugar natural no Agracta.

> **Estado:** já é assim. A calculadora de aplicação é tela nativa e consome o motor.

---

## Regra de produto

> **Complexidade científica por baixo; simplicidade operacional por cima.**

Quem só precisa entrar na Q19 e lançar uma nota continuará fazendo praticamente isso. A
complexidade fica disponível quando for necessária, sem ficar permanentemente na frente
do usuário.
