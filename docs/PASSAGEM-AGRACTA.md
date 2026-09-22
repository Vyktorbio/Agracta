# Agracta — passagem para o Claude Code (22/09/2026)

Este documento acompanha `agracta-passagem.patch`. O patch traz o que já ficou
pronto e testado; o resto está desenhado aqui, com os pontos do código onde
cada coisa se liga.

## Como começar no Claude Code

1. Coloque os dois arquivos na raiz do repositório `Vyktorbio/Agracta`.
2. Crie uma branch e aplique:

   ```bash
   git checkout -b leva-14-bpl-drone
   git apply agracta-passagem.patch
   bash conferir.sh --pull-request
   ```

   O patch foi conferido contra o `main` de 22/09/2026 (aplica limpo) e o
   portão respondeu **PODE SUBIR**.

3. Primeira mensagem sugerida para o Claude Code:

   > Leia `PASSAGEM-AGRACTA.md`. O patch da Parte A já está aplicado nesta
   > branch. Confira a Parte A (rode `conferir.sh` e, se der, `npm run
   > test:regras`), depois implemente a Parte B na ordem B1 → B4, uma leva por
   > vez, seguindo as regras da casa descritas na seção "Como o app pensa".
   > Não publique nada: me mostre o diff de cada leva.

---

## Como o app pensa (regras que valem para tudo abaixo)

Tiradas do próprio código e do `docs/ROADMAP.md`. O Claude Code deve seguir:

- **Motor puro + interface.** Toda conta nova nasce em `vendor/<nome>-core.js`,
  sem DOM, exportando por `module.exports` e `window.<Nome>Core`, com teste
  `test_<nome>.js` na raiz (o `conferir.sh` roda todo `test_*.js`). O `app.js`
  só pinta e grava.
- **Aponta, não bloqueia.** Achado vira aviso com severidade (`conferir` /
  `nota`); não impede o trabalho de campo.
- **Configuração se herda; medida se faz.** Nada que é leitura de campo aparece
  pré-preenchido.
- **Não inventa número.** Dado faltando vira `null` com o motivo, nunca zero
  nem valor típico.
- **Toda publicação** sobe o `?v=` do arquivo no `index.html` **e** no `ASSETS`
  do `sw.js` (iguais), e sobe o `CACHE` (`agracta-app-vNNN`). O portão confere.
- **LEIA-ME.txt** ganha uma "N-ésima publicação" no topo, no estilo das
  anteriores: o que mudou, por quê, o que conferir depois de subir, testes.

---

## Parte A — o que o patch já traz

### A1. Histórico de versões no servidor (append-only)

**Problema:** na migração Supabase → Firebase o histórico imutável
(`app_state_history`) ficou para trás. O `firebase-sync.js` desviava o botão
"Histórico da nuvem" para os Backups locais, e as `firestore.rules` deixavam
qualquer membro ativo reescrever ou apagar qualquer documento.

**O que foi feito:**

- `vendor/versoes-core.js` (novo, motor puro): calcula as mudanças entre o que
  o servidor tinha e o que vai, monta um registro por documento com o conteúdo
  **anterior**, divide em lotes (≤450 escritas, ~8 MB) sem nunca separar o dado
  do seu registro, agrupa por gravação e reconstrói o estado **antes** de
  qualquer gravação.
- `firebase-sync.js` → `commitState`: cada documento alterado leva, no mesmo
  lote, um registro em `workspaces/agracta/historico/{auto}` com `rev`,
  `colecao`, `docId`, `acao` (criar/alterar/apagar), `anterior`, `em`
  (serverTimestamp), `por` (e-mail da sessão), `porNome`. Anterior acima de
  900 kB vai como `grande:true`, sem conteúdo. Sem o motor carregado, grava como
  antes (nunca deixa de salvar por causa do histórico).
- `firebase-sync.js` expõe `window.AgractaVersoes` (`listar`,
  `estadoAntesDe`, `doDocumento`) e **não** sobrescreve mais `openCloudHistory`.
- `app.js` → `openCloudHistory` / `cloudHistoryRestore` reescritos: lista
  gravações com hora do servidor, autor e resumo ("1 estudo · 3 avaliações");
  "Voltar para antes" pede senha, guarda o estado atual (safetyApply) e a
  própria restauração vira uma gravação nova no histórico. Sem nuvem, aponta os
  backups do aparelho.
- `firestore.rules`: `historico` aceita `create` só com os campos esperados,
  `em == request.time` e `por == request.auth.token.email`;
  `update, delete: if false`. A regra genérica do workspace passou a excluir
  `historico` (senão ela reabriria a escrita).

**Testes:** `test_versoes.js` (42, golden de restauração numa sequência
criar/alterar/apagar/recriar); `tests/historico-rules.cjs` (regras no
emulador — **não rodou aqui**, o emulador não baixa neste ambiente; já está no
`npm run test:regras`, que o CI do GitHub roda); `test_trilha_finalizacao.js`
atualizado (a seção 3 trancava o desvio antigo).

**Conferir antes de publicar (importante):**

- Rodar `npm run test:regras` (CI ou local). **Se a regra recusar um registro
  de histórico, o lote INTEIRO falha e a sincronização para.** O ponto mais
  sensível é `rev is int`: o SDK JS grava inteiros como integer, mas vale ver
  no emulador.
- Publicar as regras: `npx firebase-tools deploy --only firestore:rules`.
- No aparelho: salvar algo → abrir "Histórico da nuvem" → a gravação aparece
  com hora e nome; restaurar uma gravação de teste e conferir.
- **Custo:** cada documento alterado passa a gerar 2 escritas. Com um usuário
  cabe folgado nas 20 mil/dia do plano gratuito, mas vale olhar o console do
  Firebase na primeira semana.

**Limites honestos (vão para a doc de conformidade, B3):**

- O histórico só existe a partir desta publicação.
- É o app que escreve o registro. Um cliente fora do app, com credencial
  válida, poderia alterar um documento sem registrar. A proteção completa
  exige uma Cloud Function `onWrite` copiando a versão anterior no servidor
  (plano Blaze).
- Se dois aparelhos gravarem quase juntos, o "anterior" é o que ESTE aparelho
  tinha lido (`FB.remoteFlat`), que pode estar defasado.

### A2. Protocolo vivo (roadmap §6) — aprovação, emendas e desvios

- `vendor/protocolo-vivo-core.js` (novo, motor puro): `retrato(s)` separa o
  que é protocolo (tratamentos, doses, repetições, aplicações, intervalo,
  desenho, randomização, método, unidade de dose, janela declarada, plano de
  avaliações) do que é execução (volume morto, frascos). `diferencas` legíveis
  por tratamento; `aprovar`, `emendar` (exige motivo, sobe a versão, guarda o
  retrato anterior), `desvio` (exige descrição).
- `app.js`:
  - `saveStudyV2`: protocolo aprovado + campo de protocolo mudou → prompt com
    as mudanças e o motivo. Cancelar ou deixar vazio **não salva**. Registra
    `s.emendas[]` e a entrada "Emenda ao protocolo" na trilha.
  - `protocoloVivoHtml` na ficha do estudo (antes da trilha): rascunho /
    aprovado vN com rubrica, emendas (de → para, motivo) e desvios.
  - `aprovarProtocolo` (senha + rubrica, como a finalização) e
    `registrarDesvio` (descrição, data, impacto via prompt; respeita estudo
    finalizado).
  - `_studyFinalizationReview`: notas sobre protocolo não aprovado, versão,
    emendas e desvios.
- `theme-2026.css`: estilos `.pv-*`.
- **Teste:** `test_protocolo_vivo.js` (31).

**Melhorias possíveis depois:** trocar os `prompt()` do desvio por um
formulário próprio; levar emendas e desvios para a folha BPL / relatório
(`relatorio-estudo.js`, `prancha.html`).

### A3. Drone — a ponta solta

- `calculadora-drone.js`: a configuração de voo deixa de sumir ao recarregar.
  Rascunho no aparelho, por estudo (`agracta-calc-drone-<qid,sid>`).
  **Configuração volta sempre; vazão medida e faixa validada só voltam no mesmo
  dia.**
- Perfil aprendido do drone (§7.3): gravar um cálculo com o drone
  **conferido** ensina a configuração (carga mínima, tanque, velocidade, faixa,
  altura, vazões mín./máx.). Num estudo novo com a calculadora vazia aparece
  "usar esta configuração", datada; usar nunca traz vazão medida e deixa a
  faixa desmarcada.
- `app.js`: `_perfisEquip` passa a ler o aparelho **e**
  `data.__config.perfisEquip` (vale o mais novo por máquina);
  `_perfisEquipGuardar` grava nos dois, então os perfis (sider, costal, drone)
  sincronizam entre aparelhos. `perfilEquipGravarDrone` novo; gancho
  `calcDroneAprender(mem)` no gravar da memória.
- **Testes:** `test_drone_rascunho.js` (17); `test_metodo_aplicacao.js`
  ajustado (extrai `_perfisEquipGuardar`). `test_drone.js` e
  `test_drone_fluxo.js` seguem verdes.

### Ligação e versões no patch

`index.html` e `sw.js`: `vendor/protocolo-vivo-core.js?v=1`,
`vendor/versoes-core.js?v=1`, `app.js?v=176`, `calculadora-drone.js?v=3`,
`firebase-sync.js?v=14`, `theme-2026.css?v=9`, `sw.js?v=294` /
`CACHE agracta-app-v294`. `conferir.sh` checa a sintaxe dos dois motores novos.
`package.json`: `test:regras` roda também `tests/historico-rules.cjs`.
**Falta** a entrada no `LEIA-ME.txt` (ver B4).

---

## Parte B — o que falta

### B1. Relevo da quadra: altitude, declividade, orientação (roadmap §9)

O roadmap diz que falta `quadra.ambiente` porque "o app não tem fonte de
elevação". Existe uma:

- **Fonte:** API de elevação da Open-Meteo
  (`https://api.open-meteo.com/v1/elevation?latitude=a,b,…&longitude=a,b,…`),
  até 100 coordenadas por chamada, modelo **Copernicus DEM GLO-90 (90 m)**. O
  app já manda o centro da quadra para a Open-Meteo no clima, então não abre
  exposição nova de coordenada. Confirmar limites e datum na documentação
  atual antes de fixar no código.
- **Motor `vendor/ambiente-core.js`:**
  - `pontosAmostra(poligono[[lat,lng]], max=100)`: vértices + grade interna
    (ponto-no-polígono), no máximo 100.
  - `resumo(pontos com z)`: altitude mín./média/máx., desnível; ajuste de plano
    por mínimos quadrados em metros locais (x leste, y norte) → declividade
    % = 100·√(b²+c²); orientação = direção da descida (azimute de (−b, −c)) em
    graus e em rumo (N, NE, …); classe de relevo da Embrapa (plano 0–3 %,
    suave ondulado 3–8, ondulado 8–20, forte ondulado 20–45, montanhoso
    45–75, escarpado > 75).
  - **Honestidade de resolução:** se a maior dimensão da quadra for menor que
    ~2 células (≈180 m), marcar `confiavel:false` e dizer na tela que a
    declividade é indicativa. Quadra pequena num modelo de 90 m tende a sair
    "plana" por falta de pontos distintos, não porque seja plana.
- **Gravação:** `data[qid].ambiente = {altitude:{min,media,max}, desnivelM,
  declividadePct, orientacaoGraus, orientacao, classe, confiavel, pontos,
  origem:{tipo:'estimado', fonte:'Copernicus GLO-90 via Open-Meteo',
  resolucaoM:90, geradoEm}}`. Reconsultar manda o anterior para
  `ambienteAnteriores` (mesma doutrina de `janelasAnteriores`). Seguir
  `_soloSet` (app.js): `data[id]._ts=Date.now(); save(); dbUpsertQuadra(id)`.
- **Tela:** bloco "RELEVO" logo depois de `soloBlocoHtml(id)` em `showD`
  (app.js, linha ~7107), reusando as classes `.solo-box/.solo-h/.solo-rf/
  .solo-est/.solo-meta` (CSS injetado por `_soloCss`). Etiqueta "estimativa
  cartográfica", como o roadmap separa de análise. Quadra de laboratório
  (`isQuadraLab`) não mostra o bloco.
- **Teste:** golden com um plano conhecido (z = 500 + 0,05·x → 5 % para leste,
  descida para oeste), polígono em L para a amostragem, quadra pequena marcada
  como não confiável, pontos `null` ignorados.
- **Fora de escopo agora:** camada de declividade/altitude no croqui.

### B2. Agenda que avisa + "próxima janela boa"

Hoje a agenda (`renderAgenda`, app.js ~4518; eventos de
`allUpcomingEvents(dias)` → `{qid, study, diff, event:{type:'apl'|'eval', date,
idx, total}}`) só existe se o app for aberto. Não há `Notification` em lugar
nenhum.

1. **Exportar para o calendário (.ics)** — o caminho que funciona em qualquer
   celular, iPhone incluso. Motor `vendor/agenda-avisos-core.js` com
   `gerarIcs(eventos)`: um `VEVENT` por evento (dia inteiro), `UID` estável
   (`agracta-<sid>-<chave do evento>`) para reimportar sem duplicar, `VALARM`
   na véspera às 18h e no dia às 7h. Botão "Levar para o calendário" na
   agenda. Download: `Blob` + link (atenção: dentro do app instalado no iOS o
   download de `.ics` abre a folha de compartilhar; testar).
2. **Notificação no aparelho** — limite honesto: sem servidor de push, o
   navegador só avisa com o app aberto ou, em Chrome/Android com o PWA
   instalado, via Periodic Background Sync (o navegador decide a frequência,
   ~1×/dia no máximo). Desenho:
   - a página grava um resumo `{data, titulo, quadra}` dos próximos 7 dias num
     IndexedDB pequeno (`agracta-avisos`) a cada `save()`;
   - `sw.js` registra `periodicsync` (tag `agracta-agenda`) e, no evento, lê o
     resumo, filtra hoje/atrasados e chama `registration.showNotification`
     uma vez por dia; `notificationclick` abre o app;
   - pedir permissão só por botão ("Avisar neste aparelho"), nunca ao abrir.
   - No iPhone só funciona com o app na tela inicial e ainda assim sem
     sincronização periódica — o `.ics` é o plano principal lá.
3. **"Próxima janela boa"** nas aplicações pendentes de 0–2 dias: previsão
   horária da Open-Meteo no centro da quadra (`quadraCenter`), avaliada com os
   limites de `clima-pagina.js` (`LIMITES`, `avaliarHora`, exposto como
   `window.agClimaJanelas`), **com a janela declarada do estudo por cima**
   (`JanelaCore.normalizar(study.janela)`: tempMin/Max, urMin/Max, ventoMax
   vencem os genéricos — regra 4 do `janela-core.js`). Mostra "Amanhã 7h–10h"
   ou "nenhuma hora boa nas próximas 48 h". Buscar só ao abrir a agenda, com
   cache de 1 h por quadra; sem internet, a linha não aparece (não inventar).
   Melhor mover `avaliarHora/janelas` para o motor, para testar sem DOM.
- **Testes:** ICS (UID estável, alarmes, escaping de vírgula/ponto e vírgula,
  quebra de linha a 75 octetos), seleção dos avisos do dia, janela com limite
  declarado vencendo o genérico.

### B3. Documentos de conformidade

`docs/conformidade/README.md`, `integridade-dados-ALCOA.md`,
`SOP-acesso-assinatura-backup.md`, `validacao-sistema.md` e
`ISMS-ISO27001.md` ainda descrevem o Supabase (Supabase Auth, `perfis` + RLS,
função `criar-tecnico`, `app_state_history` como mitigação). Reescrever para o
estado real:

- Autenticação Firebase; membros em `workspaces/agracta/members/{email}` com
  `active` e janela de horário; administradores fixos nas regras.
- Histórico de versões = coleção `historico` append-only (A1), com hora do
  servidor e autor da sessão — atende ALCOA "original/contemporâneo" melhor
  que o `client_ts` antigo.
- Protocolo: aprovação com rubrica, emendas com motivo, desvios (A2).
- Lacunas que continuam: trilha por estudo (`study.audit`) ainda é escrita
  pelo cliente; o histórico depende do app escrever (Cloud Function resolveria);
  validação IQ/OQ/PQ ainda não executada; relógio do aparelho nos carimbos de
  campo.

### B4. Roadmap e LEIA-ME

- `docs/ROADMAP.md`: blocos "Estado (data)" em §6 (aprovação/emenda/desvio
  feitos; geração automática da agenda pelo protocolo e snapshot no relatório
  ainda não), §7.3 (drone no perfil; perfis sincronizados), §9 (relevo, se B1
  entrar), §13 (histórico append-only).
- `LEIA-ME.txt`: "14a publicação" no topo, no estilo das anteriores (inclui
  "publicar as regras do Firestore" no "o que conferir depois de subir").

### B5. Limpeza (leva separada, opcional)

Sobra muito Supabase morto: `var SB`, `cloudInit` original, `vendor/supabase.js`
no `index.html` e no pré-cache, os `.sql` e `supabase/functions/`. Não é bug,
mas confunde auditoria e pesa no carregamento. Fazer sozinha, com o portão
rodando a cada passo.

---

## Parte C — para depois: a "cópia do controle do Agras"

Ideia do Victor: informar na calculadora os mesmos parâmetros do controle do
DJI Agras e ver a velocidade de voo e as limitações (tamanho viável de parcela)
antes de ir a campo. O `vendor/drone-core.js` já calcula vazão requerida,
faixa de velocidade pela vazão, passadas e segundos por parcela.

**Antes de desenhar:** anotar da tela do controle o **modelo exato** do Agras
e a lista de campos com as faixas que ele aceita (taxa L/ha, largura de faixa,
altura, tamanho de gota/rotação do atomizador, velocidade máxima, vazão da
bomba). A lógica do controle é da DJI e muda por modelo e firmware; o app deve
reproduzir o **cálculo** com esses limites declarados, não "adivinhar" o
comportamento do equipamento.
