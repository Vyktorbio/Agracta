# Observação canônica e eventos formais

Fundação comum das fases 8 (BPL / integridade) e 11 (inteligência entre ensaios)
do [ROADMAP](ROADMAP.md). As duas se desenham juntas porque se tocam num ponto:
**um evento de "corrigir dado finalizado" precisa apontar para uma observação com
identidade estável.**

Motores: `vendor/observacao-core.js` e `vendor/eventos-core.js`.
Testes: `test_observacao_eventos.js`.

**Estado:** motores prontos e ligados ao app por um módulo separado,
`eventos-app.js` (teste: `test_eventos_app.js`). O `app.js` não foi alterado. O
módulo escuta `logStudyAuditInObject` e, **depois** que a trilha de sempre foi
gravada, grava o evento formal num armazenamento próprio do aparelho
(`agracta-eventos-v1`), fora do objeto `data`, do merge e da nuvem. Falha no evento
vira aviso no console e nunca chega à tela. Para desligar:
`localStorage['agracta-eventos-off']='1'`. O `main` de antes desta ligação está
salvo na branch `salve/antes-eventos-2026-09-24`.

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

## 4. Caminho de adoção

Em ordem. Cada passo vale por si:

1. ✅ **Carregar os motores no app** (`index.html` + `sw.js`, com o CACHE incrementado).
2. ✅ **Gravar o evento junto com a trilha atual**, pelo módulo `eventos-app.js`. Por
   enquanto a gravação é só no aparelho. Falta enviar os eventos para uma coleção
   própria (`eventos/{id}`) na nuvem.
3. **Regras do Firestore para `eventos/`**: `create` só quando `request.auth` confere
   com `autor.email` e o id tem a forma certa; **sem `update` e sem `delete`**. É isso
   que torna o append-only real. O teste de regras entra em `tests/`, no mesmo molde de
   `historico-rules.cjs`.
4. **Correção de dado finalizado** passa a ser `observacao.corrigida` em vez de
   reabrir o estudo inteiro.
5. **Conhecimento** passa a consultar `extrair` + `aplicar` + `resumir`, e não mais as
   estruturas de cada tela.
6. **Tabela EPPO** injetada (arquivo em `data/`, gerado a partir da base oficial da
   EPPO e nunca digitado à mão) e campos `culturaEppo`/`alvoEppo` no estudo.
