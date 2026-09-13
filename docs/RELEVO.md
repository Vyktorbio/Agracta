# Relevo do terreno — modelo de elevação para renderizar em 3D

Script de uso único: [`tools/relevo-baixa.py`](../tools/relevo-baixa.py).

Baixa uma malha de elevação SRTM 30 m sobre a área das quadras e grava um JSON
estático. **O aplicativo nunca chama essa API em execução** — ele leria um
arquivo já presente, e o campo continua funcionando offline.

---

## De onde vêm as quadras

**Não estão neste repositório, e isso é deliberado.** `vendor/quadras-default.js`
publica `DEFAULT_QGEO = {}` e `DEFAULT_GEOREF = null`;
`test_privacidade_geometria.js` reprova a publicação se latitude/longitude de
operação aparecerem nos arquivos públicos, e foi por isso que `mapa-base.jpg`
saiu do repositório. A geometria real vive em dois lugares:

- no cofre do aparelho — `localStorage`, chave `iracema-qgeo-v1`;
- no workspace autenticado (Firestore/Supabase).

Então o arquivo de quadras é uma **entrada que o operador exporta**, não um
arquivo versionado. Formatos aceitos, detectados sozinhos:

| Formato | Forma | Ordem dos pares |
|---|---|---|
| QGEO do Agracta | `{"Q1": [[lat,lng], ...], ...}` | lat,lng |
| GeoJSON | Feature · FeatureCollection · Polygon · MultiPolygon | lng,lat — convertido sozinho |
| Backup do aplicativo | qualquer objeto contendo uma chave `QGEO` | lat,lng |

Para exportar do navegador onde o Agracta está aberto e autenticado:

```js
copy(localStorage.getItem('iracema-qgeo-v1'))   // console do navegador
```

e salvar num arquivo `.json` fora do repositório.

---

## Como rodar

**Sempre simule primeiro.** A simulação calcula a malha, mostra a caixa e o
tempo, e não gasta uma chamada sequer:

```bash
python3 tools/relevo-baixa.py --quadras ~/quadras.json --local "Iracema" --simular
```

Confira a caixa impressa contra o lugar que você conhece. Esta é a única
proteção real contra latitude e longitude trocadas: no Brasil as duas cabem
dentro de ±90, então nenhuma checagem automática as distingue. Se estiverem
trocadas, rode com `--ordem lnglat`.

Depois:

```bash
python3 tools/relevo-baixa.py --quadras ~/quadras.json --local "Iracema"
```

| Opção | Padrão | Para quê |
|---|---|---|
| `--passo` | 30 m | Distância entre pontos. 45 m corta a malha quase pela metade. |
| `--margem` | 200 m | Folga em cada lado da caixa. |
| `--max-pontos` | 90 000 | Teto — 900 chamadas, dentro das 1000/dia. |
| `--max-extensao` | 50 km | Recusa caixas que não são de uma fazenda. |
| `--pausa` | 1,1 s | Espera entre chamadas (a API dá 1/s). |
| `--saida` | `data/relevo-<local>.json` | Onde gravar. |

Se a rede cair, o progresso fica num arquivo `.parcial.json` ao lado da saída:
**rodar de novo continua de onde parou**, não recomeça. O parcial é ignorado se
a malha tiver mudado, e apagado quando o download termina.

---

## O formato do arquivo

```json
{
  "local": "Iracema",
  "bbox": [minLat, minLng, maxLat, maxLng],
  "nrows": 48, "ncols": 42,
  "passoLat": 0.00026949, "passoLng": 0.00029388,
  "fonte": "SRTM 30m via Open Topo Data",
  "z": [443.0, 444.0, null, ...]
}
```

`z` é achatado em **row-major, com a linha 0 no sul e a coluna 0 no oeste**:

```
z[r * ncols + c]   →   lat = bbox[0] + r * passoLat
                       lng = bbox[1] + c * passoLng
```

Quem for renderizar o terreno precisa desta convenção. Ela **não está gravada no
JSON** — o formato é fixo e compacto de propósito — então está aqui, no cabeçalho
do script, e trancada em `test_relevo_malha.py`.

Elevação em metros com uma casa decimal. `null` onde a API não devolveu valor
(fora da cobertura do SRTM, que vai de 60°N a 56°S).

### Por que os dois passos são diferentes

Um grau de latitude vale ~111 320 m em qualquer lugar. Um grau de longitude
encolhe com o cosseno da latitude — a 23°S vale ~102 500 m. Usar o mesmo passo
em graus nos dois eixos estica a malha em 8% no sentido leste-oeste, e **nada
acusa**: o arquivo tem o número certo de pontos e elevações plausíveis; só o
terreno renderizado sai achatado.

- **Passo:** calculado no paralelo central da caixa, onde vale o nominal de
  30 m. O desvio nas bordas é impresso no resumo (numa fazenda, centímetros).
- **Margem:** calculada no paralelo mais curto da caixa, para a folga de 200 m
  ser garantida em toda a borda e não só no meio dela.

---

## A decisão que o arquivo obriga

**A `bbox` revela a localização da operação com precisão de metros, e este
repositório é publicado na web** — tudo que está aqui fica acessível em
`https://www.agracta.com.br/...`.

Ou seja: gravar `data/relevo-<local>.json` e versioná-lo publica exatamente o
tipo de dado que `test_privacidade_geometria.js` existe para manter fora daqui.
O teste não vai acusar — ele olha `vendor/quadras-default.js`, não `data/` — mas
o efeito é o mesmo que republicar o `mapa-base.jpg` que foi removido.

As duas saídas coerentes:

1. **Repositório público** — decisão consciente de que a localização da estação
   é pública. Aí o arquivo entra em `data/` normalmente.
2. **Workspace autenticado** — o relevo acompanha as quadras, entregue pelo
   mesmo caminho que já entrega a geometria, e o repositório continua sem
   coordenadas de operação.

O script imprime esse aviso ao terminar e **não decide por ninguém**.

---

## Se um dia o arquivo entrar no aplicativo

Hoje ele **não está** na lista de pré-carregamento do service worker, e é
proposital: `conferir.sh` confere que todo arquivo pré-carregado existe de
verdade, e um `data/relevo-*.json` listado antes de existir reprovaria o portão.

Quando a renderização 3D for construída e o arquivo for real, a convenção do
repositório é:

1. acrescentar `'./data/relevo-<local>.json?v=1'` ao `ASSETS` do `sw.js`;
2. subir o `CACHE` (`agracta-app-vNNN`) — é o que faz o aparelho já instalado
   buscar a versão nova;
3. manter o `?v=` idêntico entre `sw.js` e quem pedir o arquivo, porque o
   pré-cache é por URL: uma versão defasada pré-carrega um arquivo que ninguém
   mais pede.

---

## Validação

`test_relevo_malha.py` roda no portão e não toca a rede. Tranca o passo nos dois
eixos (incluindo os casos-limite do equador e de 60°, onde a resposta é
conhecida de antemão), a folga de 200 m nos quatro lados medida por haversine
com outro raio terrestre, a cobertura da caixa, a ordem row-major, o
fatiamento em blocos de 100 e as recusas.

O caminho de rede foi exercitado contra a API real com um polígono sintético:
2 016 pontos em 21 chamadas, superfície coerente (degrau médio de 1,4 m entre
vizinhos a 30 m), interrupção por Ctrl-C no meio e retomada do mesmo arquivo
chegando ao mesmo resultado.

## Fontes

- [Open Topo Data — SRTM 30 m](https://www.opentopodata.org/datasets/srtm/) ·
  limites da API pública: 100 pontos/requisição, 1 chamada/s, 1000 chamadas/dia.
- [NASA SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm) — cobertura
  de 60°N a 56°S; incerteza vertical na casa dos metros.
