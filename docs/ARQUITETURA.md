# Agracta — Arquitetura para um Sistema Operacional de P&D Agrícola

**Especificação-mãe do projeto.** Descreve *o que* o Agracta deve ser e *por quê*.
O `ROADMAP.md`, ao lado, descreve *em que ordem* construir e *onde cada coisa mora na
tela* — os dois se complementam e devem ser lidos juntos.

> Divergências entre os dois documentos ficam registradas em **Decisões em aberto**
> (fim deste arquivo). Duas especificações que se contradizem em silêncio são piores
> que uma só.

---

## 1. Visão geral

O Agracta pode evoluir de um sistema de gerenciamento de ensaios para uma plataforma
integrada de P&D, cobrindo o ciclo inteiro:

```
planejamento → implantação → aplicação → avaliação → análise
             → interpretação → relatório → auditoria → conhecimento histórico
```

A vantagem não vem de reunir funcionalidades que existem em outros softwares. Vem da
**integração entre áreas que normalmente permanecem separadas**: delineamento,
execução de campo, laboratório, georreferenciamento, sensoriamento remoto, fenologia,
estatística, qualidade de dados, BPL e inteligência histórica.

**Princípio central:** cada informação registrada uma vez deve poder ser reutilizada em
todo o restante do sistema.

| A partir de | Deriva |
|---|---|
| coordenadas da quadra | área, altitude, solo, relevo, clima, NDVI, histórico ambiental |
| cultura | escala BBCH, alvos relevantes, tipos de avaliação, recomendação nutricional |
| tratamentos | cálculo de calda, método, volumes, produtos, equipamentos, sequência, doses reais |
| avaliações | qualidade, estatística, gráficos, comparação histórica, relatório, banco de conhecimento |

O Agracta deixa de ser um conjunto de telas e passa a operar como **modelo integrado do
experimento**.

---

## 2. Princípios de arquitetura

Estes princípios orientam toda implementação nova. Quando um módulo e um princípio
discordarem, **o princípio ganha**.

### 2.1 Fonte única de verdade
Uma informação não é digitada duas vezes. Se a cultura da quadra já é Soja, o protocolo,
o BBCH, as avaliações, o relatório e a recomendação herdam isso. Se o polígono existe,
área, coordenada, solo, NDVI e relevo derivam dele.

### 2.2 Histórico em vez de sobrescrita
Informação experimental não desaparece ao ser editada. Preserva-se valor original, novo
valor, usuário, data/hora e **motivo**. Vale para avaliações, protocolos, aplicações,
análises, tratamentos, randomização e exclusões.

### 2.3 Separar observado, calculado e estimado
O sistema identifica a natureza de cada dado — solo cartográfico, solo observado,
textura estimada por modelo, análise química de laboratório.

> **Um dado estimado nunca assume autoridade de um dado medido.**

### 2.4 Rastreabilidade de toda derivação
Sempre que o Agracta produzir um número, tem de ser possível responder *"de onde saiu?"*.
Para "80 kg/ha de K₂O": análise usada, teor de K, cultura, produtividade esperada, regra
aplicada, fonte, versão da metodologia, data do cálculo.

### 2.5 Automação sem perda de autoridade humana
O sistema pode sugerir delineamento, outliers, dose, análise, momento de avaliação. Mas
decisões metodológicas ficam registradas como **decisões humanas**. O algoritmo é
assistente científico, não caixa-preta.

---

## 3. Módulo 1 — Protocolo vivo

Transformar o protocolo em entidade estruturada e versionada. Hoje ele nasce como
planilha ou PDF e precisa ser reinterpretado por quem executa.

**Conteúdo:** identificação (número, título, cliente, objetivo, responsável, localidade,
cultura, cultivar, início, duração) · delineamento (tipo, tratamentos, repetições,
blocos, parcelas, dimensões, bordaduras, randomização) · tratamentos (código, produto,
i.a., concentração, dose, unidade, adjuvante, volume, método, nº de aplicações,
intervalo) · avaliações (variável, método, unidade, escala, alvo, momento, DAA/DAT/HAT,
BBCH esperado, nº de avaliadores, agregação).

**Estados:** `Rascunho → Aprovado → Em execução → Finalizado`

Após aprovado, alteração relevante gera **emenda** — o valor anterior permanece.

```
estudo
 ├── protocolo { versao, status, metadados, tratamentos, avaliacoes, plano_estatistico }
 └── emendas[]
```

**Benefício:** o protocolo passa a dirigir o estudo. A agenda, o cálculo de calda, as
avaliações e o relatório derivam dele.

## 4. Módulo 2 — Motor de implantação experimental

Muitos ensaios são delineados sem usar informação já disponível (gradiente de
fertilidade, declividade, solo, NDVI histórico, drenagem, bordaduras). Isso aumenta o
erro experimental.

O Agracta analisa a área antes da implantação, detecta gradiente espacial
(*"variabilidade predominante no eixo norte–sul"*) e sugere orientação de blocos.

A randomização deixa de ser matriz abstrata: cada parcela recebe coordenada, tratamento,
repetição, bloco, área e identificação.

**Alertas metodológicos:** tratamento concentrado numa extremidade · blocos desalinhados
com o gradiente · parcela colada na bordadura · área cruzando duas unidades de solo ·
pseudorreplicação em faixas.

**Modo "simular delineamento":** DBC, DIC, faixas, split-plot visualizados na área real
antes de criar o estudo.

## 5. Módulo 3 — Execução de aplicação completa

**Cada tratamento tem método próprio** — trator/sider, barra CO₂, costal, atomizador,
drone, Torre de Potter, manual, tratamento de sementes, laboratorial. Isso permite
comparar metodologias dentro do mesmo protocolo.

O sistema já conhece dose, área, parcela, repetições e método; pergunta só os parâmetros
do equipamento (drone: volume, velocidade, faixa, vazão, altura, modelo, tanque · barra:
pressão, bicos, vazão, espaçamento, velocidade · Potter: pressão, diâmetro da placa,
volume equivalente, volume por placa).

**Registro de execução:** operador, data, hora inicial e final, temperatura, UR, vento,
nebulosidade, BBCH, equipamento, calibração, lote do produto, **dose efetivamente
aplicada**.

**Checklist antes:** calibração conferida · equipamento limpo · produto correto · dose
conferida · condições ambientais adequadas.

> A aplicação deixa de ser um evento descrito depois e passa a ter registro de execução.

## 6. Módulo 4 — Fenotipagem inteligente

Conectar `Cultura → BBCH → alvo → variável → método`. Soja em BBCH 65 com mancha-alvo
oferece incidência, severidade, escala diagramática, desfolha, fitotoxicidade.

Escalas visuais incorporadas (tocar em 1% / 3% / 5% / 10% / 20% / 40%, ou consultar
imagens referenciais).

Fotografia por parcela recebe automaticamente estudo, parcela, tratamento, repetição,
BBCH, data, GPS e avaliador — um banco fenotípico rastreável.

**Dois avaliadores em modo independente** (A não vê B), depois média, diferença,
correlação, ICC e kappa ponderado quando aplicável.

Avaliação por voz (*"T3 R2, severidade 18"*). Visão computacional é etapa futura, com o
valor manual sempre preservado para comparação.

## 7. Módulo 5 — Caracterização ambiental automática

Ficha ambiental permanente por quadra.

**Topografia** (de modelo digital de elevação): altitude, declividade, orientação,
posição na paisagem.
**Clima por estudo:** chuva acumulada, temperatura média/máx/mín, UR, graus-dia, DPV,
radiação, eventos extremos.
**Sensoriamento:** NDVI, NDRE, GNDVI, histórico temporal, anomalia em relação à média.

Reconstruir *"condições nos 15 dias anteriores à aplicação"* ou *"chuva acumulada entre
aplicação e avaliação"*.

Depois esses dados entram como **covariáveis**: *"eficácia correlacionou negativamente
com chuva nas primeiras 24 h"*.

## 8. Módulo 6 — Fertilidade e nutrição

Análise de solo **não é atributo permanente do solo** — a quadra tem análise de 2025,
2026, 2027. Cada uma com data, laboratório, profundidade, método, pH, MO, P, K, Ca, Mg,
Al, H+Al, S, micronutrientes, argila.

Derivados **calculados**: SB, CTC, V%, m%.

Recomendação recebe cultura, produtividade esperada, análise, PRNT e sistema produtivo;
produz calagem, N, P₂O₅, K₂O, S, micronutrientes e parcelamento.

Fonte metodológica registrada: `{fonte, referência, edição, versão das regras}`.
Quando a metodologia definir época fenológica, isso entra na agenda da quadra.

## 9. Módulo 7 — Estatística integrada

O plano começa no protocolo, antes de coletar dados.

Básicas: ANOVA, Kruskal-Wallis, Tukey, Dunnett, Scott-Knott, regressão ·
Bioensaios: EC50, LC50, log-logísticos, dose-resposta ·
Sobrevivência: Kaplan-Meier, Cox ·
Medidas repetidas, modelos mistos, GLM/GLMM.

**Diagnóstico antes de executar:** normalidade dos resíduos, homogeneidade, outliers,
independência, CV. O sistema recomenda a abordagem (*"variância heterogênea detectada;
considere transformação ou modelo heterocedástico"*).

Cada análise arquiva o script e liga gráfico ↔ dados ↔ versão.

## 10. Módulo 8 — Investigação forense dos dados

Detectar problemas antes que cheguem ao relatório. Pode ser um dos maiores diferenciais.

- **Coerência biológica:** severidade 48% no DAT 7 e 4% no DAT 14 → *"queda incomum, conferir"*. Não significa necessariamente erro.
- **Valores impossíveis:** % > 100, nota fora da escala, mortalidade negativa, contagem decimal.
- **Duplicação:** sequências idênticas improváveis — **sinalizar, nunca apagar**.
- **Assinatura do avaliador:** viés sistemático (*"avaliador B fornece notas em média 14% maiores"*).
- **Coerência temporal:** avaliação antes da aplicação, BBCH retrocedendo, aplicação antes do plantio, intervalo fora do protocolo.
- **GPS:** avaliação registrada a quilômetros da quadra.
- **Outliers espaciais:** parcela isolada divergindo das vizinhas.

## 11. Módulo 9 — BPL e integridade

Audit trail com usuário, ação, objeto, valor anterior, valor novo, data, hora,
dispositivo e **motivo**.

Finalizado → bloqueado. Reabrir exige justificativa, permissão e registro. Eventos
importantes pedem rubrica.

Status: rascunho · aprovado · em execução · aguardando análise · analisado · finalizado ·
arquivado.

> **Dados científicos não são apagados fisicamente.** Ficam marcados como excluídos, com
> motivo, recuperáveis pela auditoria.

## 12. Módulo 10 — Rastreabilidade de amostras e laboratório

Identificador único (`AGR-26-015 T3 R2 FOLHA DAT14`) com QR Code. Coleta no campo
registra parcela, tratamento, repetição, data, BBCH, matriz e responsável. Entrada no
laboratório por escaneamento.

Workflow por área (nematologia, fitopatologia, química). Subamostras (raiz, solo, folha,
DNA, extrato) mantêm **genealogia registrada**. O resultado retorna ao estudo de origem
sem copiar planilha.

## 13. Módulo 11 — Inteligência entre ensaios

Todo estudo finalizado alimenta um banco analítico com produto, i.a., dose, cultura,
alvo, BBCH, localização, solo, clima, ano, tecnologia de aplicação, variável e resultado.

Consultas do tipo *"todos os ensaios com Produto A em soja"* ou *"ensaios sob chuva
> 20 mm após aplicação"*.

Meta-análise: nº de ensaios, efeito médio, variabilidade, IC, consistência,
heterogeneidade. Quando os resultados divergem, o sistema **testa possíveis
explicações** — BBCH, chuva, dose, solo, temperatura, pressão inicial, tecnologia.

Benchmark interno considera média, variância, estabilidade e nº de ambientes — não só a
maior média.

## 14. Módulo 12 — Interoperabilidade

Vocabulários padronizados: BBCH para fenologia, nome científico + comum para taxonomia,
vocabulário controlado para alvos, unidade e método explícitos para variáveis.

Aproximar a estrutura ao **MIAPPE**; expor parte por **BrAPI** no futuro. Exportar CSV,
XLSX, JSON, GeoJSON, PDF, SVG, R. API interna para drones, sensores, estações, LIMS,
equipamentos, aplicativos e IA.

## 15. Camada de IA

Não é módulo isolado — é **interface sobre todos os módulos**. *"Crie um estudo de
fungicida em soja com 6 tratamentos"*, *"o que tenho para avaliar hoje?"*, *"quanto
produto preparar para T4?"*, *"algum dado parece errado?"*, *"compare com estudos
anteriores"*.

> **Regra fundamental:** a IA nunca responde só com linguagem natural quando existe dado
> estruturado. Cada conclusão aponta *"ver dados que sustentam esta resposta"*.

---

## 16. Modelo conceitual

```
ORGANIZAÇÃO
└── LOCALIDADE
     └── ÁREA                    ← ver Decisão em aberto nº 1
          ├── SOLO · RELEVO · CLIMA · HISTÓRICO
          └── QUADRA
               ├── CULTURA · BBCH · FERTILIDADE · SENSORIAMENTO
               └── ESTUDO
                    ├── PROTOCOLO · TRATAMENTOS · PARCELAS
                    ├── APLICAÇÕES · AVALIAÇÕES · AMOSTRAS
                    ├── RESULTADOS · ESTATÍSTICA
                    └── AUDITORIA · RELATÓRIO
BANCO HISTÓRICO
└── estudos · ambientes · tratamentos · resultados · inteligência
```

## 17–18. Prioridade

**Fase 1 — base experimental:** protocolo vivo · fertilidade · aplicação integrada · auditoria
**Fase 2 — qualidade científica:** estatística expandida · forense · fenotipagem · ambiente
**Fase 3 — integração total:** amostras e laboratório · motor de implantação · interoperabilidade
**Fase 4 — inteligência institucional:** banco histórico · IA

Se fosse necessário escolher **cinco**:

1. **Protocolo vivo** — porque todo o restante nasce dele
2. **Auditoria e integridade** — porque transforma registros em documentação confiável
3. **Estatística integrada** — porque fecha o ciclo experimental
4. **Inteligência entre ensaios** — porque transforma dados antigos em patrimônio
5. **Rastreabilidade campo–laboratório** — porque elimina a maior fragmentação operacional

## 19. O diferencial

Um sistema tradicional responde:

> T3 apresentou 82% de controle.

O Agracta deve responder:

> T3 apresentou 82% de controle aos 14 DAT. Foi estatisticamente superior à testemunha e
> semelhante a T4. O ensaio ocorreu em Latossolo Vermelho, soja BBCH 65, com 14 mm de
> chuva nas primeiras 48 horas. Em 11 ensaios anteriores em condições semelhantes, o
> mesmo tratamento apresentou controle médio de 79,6%. A resposta está dentro do
> intervalo histórico esperado.

O Agracta deixa de ser onde dados são armazenados e passa a preservar **contexto,
execução, evidência, interpretação e memória científica**.

---

## Decisões em aberto

Pontos onde esta especificação e o `ROADMAP.md` divergem, ou onde ela diverge do código
atual. **Nenhum foi resolvido unilateralmente** — ficam aqui até haver decisão.

### 1. Existe a entidade ÁREA entre Localidade e Quadra?

- **Esta especificação (§16)** propõe `LOCALIDADE → ÁREA → QUADRA`, com solo, relevo, clima e histórico na ÁREA.
- **O código hoje** tem `LOCALIDADE → QUADRA` direto (`QLOCAL[qid]` liga uma à outra; não existe entidade ÁREA). `area` é um número — hectares da quadra.
- **O que já foi construído** pendurou solo, fertilidade e propriedades na **quadra**, por decisão tomada em setembro/2026: é a quadra que tem o polígono, e por isso a consulta espacial é exata.

Criar ÁREA agora significa migrar o que já existe e responder o que acontece quando uma
quadra atravessa duas áreas. **Recomendação:** manter na quadra até aparecer um caso real
em que várias quadras precisem compartilhar a mesma caracterização — aí ÁREA se paga.

### 2. Score de integridade: número ou contagem?

- **Esta especificação (§10)** propõe `Integridade dos dados: 96/100`, com a ressalva de que não é qualidade científica absoluta.
- **O `ROADMAP.md` (§12.7)** diz o contrário: *"evitaria um score 96/100, porque pode passar falsa aparência de validação científica absoluta; contagem e classificação são mais transparentes"*.

**Recomendação:** ficar com contagem e classificação. Um "96/100" num relatório de BPL
vira, na prática, um selo — e é exatamente o que não se quer que ele seja. A ressalva no
texto não acompanha o número quando ele é lido fora de contexto.

### 3. Ordem de ataque

- **Esta especificação (§17)** põe protocolo vivo, fertilidade, aplicação e auditoria juntos na Fase 1.
- **O `ROADMAP.md`** ordena Release A (fundação invisível) → B (aplicação) → C (protocolo).

Não são incompatíveis: a especificação diz *o quê*, o roadmap diz *em que ordem*. O que
está em execução hoje segue o roadmap — Release B começou, com a memória de cálculo
entregue.
