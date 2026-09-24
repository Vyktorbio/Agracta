# Observação canônica e eventos formais

Fundação comum das fases 8 (BPL / integridade) e 11 (inteligência entre ensaios)
do [ROADMAP](ROADMAP.md). As duas se desenham juntas porque se tocam num ponto:
**um evento de "corrigir dado finalizado" precisa apontar para uma observação com
identidade estável.**

Motores: `vendor/observacao-core.js`, `vendor/eventos-core.js` e `vendor/eppo-core.js`.
Módulos do app: `eventos-app.js` (eventos no aparelho e na nuvem) e
`conhecimento-canonico.js` (aba "Entre estudos").
Testes: `test_observacao_eventos.js`, `test_eventos_app.js`, `test_eventos_nuvem.js`,
`test_eppo_core.js`, `test_eppo_ferramenta.py`, `test_conhecimento_canonico.js` e
`tests/eventos-rules.cjs` (emulador).

**Estado:** motores prontos e ligados ao app por um módulo separado,
`eventos-app.js` (teste: `test_eventos_app.js`). O `app.js` não foi alterado. O
módulo escuta `logStudyAuditInObject` e, **depois** que a trilha de sempre foi
gravada, grava o evento formal num IndexedDB próprio do aparelho
(`agracta-eventos`), fora do objeto `data` e do merge do app. De lá, os eventos
vão para a nuvem numa coleção própria e só-de-acréscimo (seção 4). O `localStorage`
fica de fora de propósito: ele tem teto de ~5 milhões de caracteres, e o save do app
depende dele. A gravação é assíncrona e enfileirada, então a tela nunca espera. Falha
no evento vira aviso no console e nunca chega à tela. Para desligar:
`localStorage['agracta-eventos-off']='1'`. O `main` de antes da primeira ligação
está salvo na branch `salve/antes-eventos-2026-09-24`.

| Ação no app | Evento |
|---|---|
| Finalização do estudo | `estudo.finalizado` (rubrica guardada como hash do desenho) |
| Reabertura do estudo | `estudo.reaberto` (rubrica = reautenticação por senha, que é o que o app pede) |
| Aprovação do protocolo | `protocolo.aprovado` |
| Emenda ao protocolo | `protocolo.emendado` (de→para = versões) |
| Edição de avaliação **assinada** | uma `observacao.corrigida` por célula que mudou de valor |
| Qualquer outra ação | nenhum evento: continua só na trilha |

---

## 1. Observação canônica

```
observação = organização + estudo + ambiente + local + parcela + tratamento + dose
             + cultura + alvo + BBCH + variável + momento + valor + unidade + método
```

`ObservacaoCore.extrair(estudo, ctx, deps)` é uma **projeção**: lê o estudo como ele
está gravado hoje e devolve observações novas. Nada é escrito no estudo, então o dado
antigo continua legível do jeito que era.

| Campo | Origem | Quando não se sabe |
|---|---|---|
| `id` | estudo + avaliação + parcela + variável + leitor | — (obrigatório) |
| `organizacao` | `ctx.organizacao` | `null`, mas o campo **sempre existe** |
| `estudo` | `{chave, qid, sid, codigo}` | — |
| `ambiente`, `local` | `ctx` | `null` |
| `parcela` | `{chave:'T2R3', tratamento, repeticao}` | — |
| `tratamento` | produto, i.a., dose, unidade da dose, testemunha | `null` por campo |
| `cultura`, `alvo` | `{nome, eppo, resolvido, fonte}` | `eppo:null, resolvido:false` |
| `bbch` | avaliação | `null` |
| `variavel` | `{nome, tipo, unidade, sentido, escalaMax}` | `null` por campo |
| `momento` | DAT/HAT explícito, senão DAA pela `ctx.dataReferencia` | `{dias:null}`, **nunca "0 DAA"** |
| `valor` | nota numérica | `null`; o texto original vai para `valorOriginal` |
| `bruto` | subamostras, n/N | `null` |
| `metodo` | tipo de avaliação, nº de subamostras, descrição | `null` por campo |
| `leitor` | `null` = consolidado; `'A'`/`'B'` na dupla leitura | — |
| `situacao` | `valida` · `invalidada` · `excluida` (vem dos eventos) | `valida` |

### Decisões

- **Identidade sem valor.** Corrigir 12 → 21 não muda o `id`; se mudasse, a correção
  apontaria para uma observação que deixou de existir. O id é JSON codificado
  (`obs:…`), reversível por `partesDoId`, sem `/`, e serve de id de documento no
  Firestore.
- **Célula nunca tocada não é observação.** É pendência, e quem trata pendência é o
  `pendencias-core`.
- **EPPO por injeção.** `deps.eppo(nome, 'cultura'|'alvo')` devolve o código. O motor
  só confere a forma (5–6 caracteres). Não existe tabela embutida, e o motor não
  aproxima nomes por semelhança: resolver "percevejo" para a espécie errada é pior do
  que dizer `resolvido:false`. Código declarado no estudo (`culturaEppo`, `alvoEppo`)
  vence a tabela. O alvo é resolvido pelo nome científico quando ele existe, e o nome
  comum fica em `alvo.comum`.
- **`organizacao` desde já.** O multiempresa vem por último, mas acrescentar o
  isolamento por organização às regras do Firestore depois exige migrar tudo o que já
  foi gravado. Com o campo em todo registro, as regras só precisam começar a exigi-lo.
- **n e variância.** `resumir` devolve, por estudo × avaliação × variável × tratamento:
  `n`, `media`, `variancia`, `dp`. Só entram a leitura consolidada e as observações
  válidas. A meta-análise depende disso, e a média sozinha não basta.
- **Comparabilidade como lista.** `faltasParaComparar(a, b)` devolve **o que falta**
  (unidade não declarada, alvo sem EPPO, momento desconhecido, campo × laboratório,
  n < 2) em vez de um sim/não. É essa lista que a tela deve mostrar.

## 2. Eventos formais

Hoje finalizar e reabrir gravam uma linha de texto em `study.audit`, dentro do próprio
estudo, que o próximo salvamento do aparelho reescreve inteiro. Com o
`EventosCore`, a ação crítica vira um objeto imutável:

```js
{
  schema: 1, id: 'ev:<sha256 do conteúdo>',
  tipo: 'observacao.corrigida',
  organizacao: 'org-1',
  entidade: { tipo: 'observacao', id: 'obs:…', estudo: null },
  de: 10, para: 12, motivo: 'transcrição',
  autor: { email, nome, papel }, em: '2026-09-21T10:00:00Z', fuso, dispositivo,
  rubrica?, detalhe?, legado?,
  pais: ['ev:…']          // o que o aparelho conhecia quando criou o evento
}
```

### Tipos

| Tipo | Entidade | Motivo | Rubrica | de→para | Papel mínimo |
|---|---|---|---|---|---|
| `estudo.finalizado` | estudo | | ✔ | | diretor |
| `estudo.reaberto` | estudo | ✔ | ✔ | | supervisor |
| `protocolo.aprovado` | estudo | | ✔ | | diretor |
| `protocolo.emendado` | estudo | ✔ | | ✔ | diretor |
| `observacao.corrigida` | observação | ✔ | | ✔ | supervisor |
| `avaliacao.invalidada` / `revalidada` | avaliação | ✔ | ✔ | | supervisor |
| `registro.excluido` / `restaurado` | estudo, avaliação, aplicação, observação, amostra | ✔ | | | supervisor |
| `legado.registro` | estudo | | | | — (só importação) |

Um evento que não cumpre as exigências do seu tipo é recusado ao ser criado.

### Decisões

- **Append-only, e desfazer é outro evento.** Uma avaliação invalidada volta com
  `avaliacao.revalidada`, que tem motivo próprio. Nada é apagado do registro.
- **Hash do conteúdo, não assinatura.** O id é o SHA-256 da serialização estável do
  evento. Um SHA-256 síncrono vai embutido, porque o `crypto.subtle` é assíncrono e não
  existe em `http://` local, e o hash precisa sair igual no aparelho, no Node e no
  servidor. `verificar` recalcula o hash e acusa qualquer alteração. Isso prova
  **integridade**, não **autoria**: quem garante que o cliente não reescreve a coleção
  é o servidor.
- **Grafo, não fila.** Dois aparelhos offline podem reabrir ou corrigir a mesma coisa.
  Cada evento cita as pontas que o aparelho conhecia (`pais`), como um commit. O
  `merge` é união de conjuntos (comutativa e idempotente), e a ordem causal sai do
  grafo, com desempate determinístico por instante e id. Os dois aparelhos chegam à
  mesma sequência, e a regra "o último aparelho vence" não existe aqui.
- **A correção declara o que esperava encontrar.** `observacao.corrigida` leva o `de`.
  Se, na ordem causal, o valor já não é o `de` (outra correção chegou antes), o evento
  vira um **conflito** visível na observação (`conflitos[]`) e não sobrescreve nada.
  Quem resolve o conflito é uma pessoa, com uma nova correção que une as duas pontas.
- **Relógio atrasado é aviso.** Um evento com instante anterior ao do pai sai em
  `avisos` e não em `problemas`: um aparelho com a hora errada produz isso sem fraude
  nenhuma.
- **Papel ainda é aviso.** Os papéis do roadmap ainda não existem no app. Papel
  declarado abaixo do exigido é recusado; papel ausente gera aviso. Quando o app passar
  a declarar papéis, basta transformar o aviso em erro.
- **Trilha antiga.** `deTrilhaLegada(study.audit, ctx)` converte a trilha atual em
  eventos com `legado:true`. Finalização e reabertura (quando o motivo é recuperável)
  ganham tipo formal. O resto vira `legado.registro`, com o texto e o de→para originais
  no `detalhe`. A importação é determinística (mesma trilha, mesmos ids), e o hash
  passa a proteger a trilha **a partir da importação**, não antes dela.

## 3. Como as duas camadas se encontram

```
estudo gravado ──extrair──▶ observações canônicas ──aplicar(registro)──▶ observações
                                   ▲                                    com situação,
                                   │ id estável                         histórico e
registro de eventos ───────────────┘                                    conflitos
                                                                            │
                                                                        resumir
                                                                            ▼
                                                    n · média · variância por tratamento
```

`EventosCore.aplicar(observacoes, registro)` devolve cópias com:
- `situacao`: `excluida` (estudo, avaliação ou observação excluídos logicamente),
  `invalidada` (avaliação invalidada) ou `valida`;
- `valor` corrigido e `historico[]` de cada correção (evento, de, para, motivo, autor);
- `conflitos[]` quando houver.

`resumir` só considera as observações válidas. Uma avaliação invalidada sai da
comparação sem que nenhum dado seja apagado.

## 4. Eventos na nuvem

Com sessão e rede, o `eventos-app.js` envia os eventos para
`workspaces/agracta/eventos/{id}` e baixa os que outros aparelhos gravaram.

**Documento na nuvem:** `{schema, estudo, tipo, json, enviadoPor, recebidoEm}`.
`json` é o evento sem o próprio id (`EventosCore.serializar`), e o id do documento
é `'ev:' + sha256(json)`.

**O que a regra do Firestore garante** (`firestore.rules`, teste
`tests/eventos-rules.cjs` no emulador):
- só criar: `update` e `delete` são recusados para todos, inclusive o administrador;
- **o servidor recalcula o SHA-256** do `json` e recusa um id que não bata;
- `enviadoPor` tem que ser o e-mail da sessão, e `recebidoEm` a hora do servidor;
- nenhum campo além dos seis;
- a regra genérica do workspace exclui `eventos`, então ela não reabre a porta.

O autor declarado continua dentro do `json`. A nuvem atesta quem enviou e quando
chegou. Um aparelho compartilhado pode enviar um evento que outra pessoa criou
offline, e isso fica visível como autor ≠ remetente.

**O que o aparelho garante** (`test_eventos_nuvem.js`):
- o envio roda fora da fila local, com tempo limite de 20 s. Rede ruim atrasa a
  nuvem, mas nunca a gravação no aparelho;
- evento já enviado não sobe de novo. Se a confirmação se perdeu, o aparelho confere
  na nuvem que o conteúdo é o mesmo e marca como enviado;
- evento baixado só entra depois de conferido o hash. Cópia adulterada é recusada e
  contada;
- sincroniza ao abrir a sessão, quando a rede volta, logo depois de gravar um evento
  e quando o Conhecimento abre a aba "Entre estudos".

> **Importante:** o merge **não** publica as regras do Firestore. Até alguém rodar
> `npx firebase-tools deploy --only firestore:rules`, a coleção `eventos` fica sob a
> regra genérica: os membros conseguem gravar, mas também alterar. A sincronização
> funciona nos dois casos. A imutabilidade só passa a valer depois do deploy.

## 5. Tabela EPPO

- `tools/eppo-culturas.json`: nome da cultura no app → nome científico. É a **única**
  parte digitada. Onde o nome comum cobre várias espécies (café, cana, citros), o
  arquivo usa o gênero.
- `tools/eppo-atualiza.py`: consulta a EPPO para cada binômio do `alvos-catalogo.js`
  e cada cultura. Só aceita um código se a própria EPPO confirmar que o táxon dele tem
  **exatamente** aquele nome (preferido ou registrado). O resto vai para
  `naoResolvidos`, com o motivo. Teste: `test_eppo_ferramenta.py`, sem rede.
- Workflow **Atualizar tabela EPPO** (`.github/workflows/atualizar-eppo.yml`): roda
  a ferramenta todo mês ou sob demanda e abre uma PR para revisão, como o do Agrofit.
  **Precisa do segredo `EPPO_TOKEN`** no repositório (cadastro gratuito em
  data.eppo.int). Sem ele, o workflow só avisa e não mexe em nada.
- `data/eppo.json`: a tabela. Enquanto ninguém rodar o workflow com o token, ela sai
  com `codigos` vazio. Nada é inventado para preenchê-la.
- `vendor/eppo-core.js`: o `deps.eppo` do app. Resolve a cultura pelo nome do app
  ("Cana-de-açúcar", "CITROS") e o alvo pelo binômio, sem aproximação.

## 6. Conhecimento: aba "Entre estudos"

`conhecimento-canonico.js` acrescenta uma aba ao Conhecimento. As abas antigas
continuam iguais: o `integracoes.js` só ganhou um ponto de encaixe para abas de outros
módulos.

- Lê todos os estudos pela observação canônica (`extrair`), aplica os eventos formais
  (`aplicar`) e resume (`resumir`).
- Agrupa o que é a mesma coisa: variável, unidade, alvo e cultura (pelo código EPPO
  quando há, senão pelo nome). Mostra só os grupos presentes em dois ou mais estudos.
- Mostra cada estudo × tratamento × momento lado a lado, com n, média e DP.
  **Não combina médias.** Por grupo, diz o que ainda falta para uma meta-análise
  (`faltasParaComparar`).
- Por padrão mostra só estudos finalizados. Um botão inclui os que estão em execução.
- Uma avaliação invalidada ou excluída por evento formal sai da conta, e a tela diz
  quantas observações ficaram de fora. Uma correção formal entra com o valor corrigido.
- O cegamento vale aqui também: o nome do produto vem da projeção do Conhecimento, e
  o ingrediente ativo nunca aparece.
- DAA conta da primeira aplicação registrada. DAT/HAT declarado na avaliação vence.

Teste: `test_conhecimento_canonico.js`.

## 7. Caminho de adoção

Em ordem. Cada passo vale por si:

1. ✅ **Carregar os motores no app** (`index.html` + `sw.js`, com o CACHE incrementado).
2. ✅ **Gravar o evento junto com a trilha atual**, pelo módulo `eventos-app.js`.
3. ✅ **Eventos na nuvem** com regras só-de-acréscimo e hash conferido pelo servidor
   (seção 4). Falta **publicar as regras** (`npx firebase-tools deploy --only
   firestore:rules`).
4. **Correção de dado finalizado** passa a ser `observacao.corrigida` em vez de
   reabrir o estudo inteiro.
5. ✅ **Conhecimento** com a aba "Entre estudos" sobre `extrair` + `aplicar` +
   `resumir` (seção 6). As abas antigas ainda leem a projeção própria; migrá-las é
   opcional.
6. ✅ **Tabela EPPO**: a ferramenta, o workflow e o carregador estão prontos (seção 5).
   Falta cadastrar o segredo `EPPO_TOKEN` e rodar o workflow. Os campos
   `culturaEppo`/`alvoEppo` no estudo já são lidos quando existem, mas ainda não há
   tela para preenchê-los.
