# Landsat, SMAP e NASA FIRMS no mapa

Em **Ferramentas do mapa → Satélite**, cada ferramenta tem uma entrada própria.
Ao tocar, a camada liga e abre seus controles. **Desligar** remove a camada;
fechar os controles mantém o mapa. **Enquadrar dados** mostra a área consultada.
A consulta acompanha o centro e a extensão do mapa, com atualização após mover
ou mudar o zoom. Landsat, SMAP e Sentinel alternam a imagem principal; FIRMS
permanece independente e pode aparecer sobre qualquer uma delas.

| Entrada | Dados reais | Controles e escala |
|---|---|---|
| Landsat | USGS Collection 2 Level 2, cenas L2SP dos Landsat 8/9, via Microsoft Planetary Computer | Cena nos últimos 90 dias, opacidade e consulta de temperatura em um ponto. Térmico de 100 m distribuído em grade de 30 m |
| SMAP | NASA GIBS, L4 Analyzed Soil Moisture, análise instantânea das 12h UTC, observações assimiladas em modelo | Data publicada pelo provedor, superfície 0–5 cm ou zona radicular 0–100 cm e opacidade. Grade regional de 9 km |
| NASA FIRMS | Arquivo público VIIRS Collection 2 NRT do NOAA-20 | Últimas 24 h, 48 h ou 7 dias, com hora UTC, confiança e potência radiativa em MW no popup. Pixel nominal de 375 m |

O Landsat converte o DN de ST_B10 usando `DN × 0,00341802 + 149 − 273,15`,
em °C. Pixel zero ou QA_PIXEL com qualquer bit 0–5 ligado fica transparente e a
sonda devolve **sem leitura válida**. As cores usam intervalos de aproximadamente
10 °C de 0 a 60 °C, saturando os extremos; o valor da sonda usa a banda original.
A porcentagem de nuvens é da cena inteira. A escolha inicial procura a cena
mais recente com até 25% de nuvens, dentro do catálogo consultado.

SMAP tem leitura regional: aproximar o mapa não cria detalhe por quadra. A
imagem preserva os pixels e usa a legenda oficial NASA, sem inferir valores
numéricos a partir das cores. O catálogo informa dias disponíveis, inclusive
lacunas; o app não presume que o dia de hoje já tenha dados.

FIRMS mostra detecções pontuais, não polígonos de área queimada. As cores
indicam a confiança (baixa, nominal ou alta). Ausência de pontos no arquivo não
confirma ausência de fogo. A tela mostra quando o arquivo foi consultado e a
última detecção nele, inclusive quando existe atraso na cobertura. O período é
filtrado por UTC. Nesta versão, a fonte é **VIIRS NOAA-20**, não a união de todos
os sensores disponíveis no FIRMS.

## Publicação e acesso

Publicar o frontend **e atualizar o serviço Render** que executa
`ndvi-proxy.py`. O serviço deve receber também `satelites_backend.py`, na mesma
pasta. O `render.yaml` e as dependências continuam iguais: só biblioteca padrão
Python, sem nova chave de API, conta Earthdata ou MAP_KEY do FIRMS.

`GET /health` passa a informar `satelites.version: 1` e os três provedores.
Se a tela nova encontrar o proxy antigo, apresenta a necessidade de atualizar
o servidor. As novas rotas usam o mesmo controle de membro ativo e token
Firebase do proxy; localmente, valem as regras de login já existentes.
Os assistentes usam suas próprias contas Agracta, sem conectar e-mail pessoal
aos provedores. Nenhuma configuração de Google Agenda/n8n faz parte desta mudança.

As camadas precisam de conexão para buscar dados. O service worker guarda os
controles, mas não as imagens ou os focos como se fossem dados atuais offline.
Os resultados não são gravados nos estudos como medições experimentais.

## Rotas e limites

| GET | Parâmetros |
|---|---|
| `/satelites/landsat/datas` | `bbox=w,s,e,n`; opcionais `de` e `ate` (até 180 dias; padrão 90) |
| `/satelites/landsat/imagem` | `bbox`, `item` (identificador STAC L2SP), `width` (128–1024) |
| `/satelites/landsat/ponto` | `item`, `lat`, `lng` |
| `/satelites/smap/datas` | Sem parâmetros; datas publicadas NASA GIBS |
| `/satelites/smap/imagem` | `bbox`, `date`, `camada=superficie\|raizes`, `width` |
| `/satelites/firms` | `bbox`, `horas=24\|48\|168` |

As imagens usam EPSG:3857 para coincidir com o Leaflet. O servidor aceita
caixas contínuas de até 6° por eixo, sem atravessar o antimeridiano. A interface
limita Landsat a 1,2°, SMAP/FIRMS a 4°, e amplia a caixa SMAP para pelo menos
0,6° por eixo. Portanto, ao afastar muito, os dados cobrem a **região central**,
que pode ser enquadrada pelo botão, não o mapa mundial inteiro.

O catálogo Landsat consulta até 100 cenas e informa se há mais; FIRMS mostra
até 2.000 detecções mais recentes e informa o total/truncamento. Usa arquivos
South America nas regiões atendidas, e Global fora delas. Consultas são
limitadas a 45 s por pedido ao provedor e respostas a 8 MiB (CSV: 32 MiB).
O cache interno tem limite de 48 MiB/96 entradas, com uma consulta simultânea
por chave: imagens e Landsat por 1 h, datas SMAP por 6 h, CSV FIRMS por 15 min.
Falha de provedor não vira lista vazia nem cache vencido.

## Verificar

`npm install` e `npm test -- --pull-request` executam o portão, incluindo os
contratos de dados, login/CORS, datas com lacunas, QA térmico, atualização da
área e respostas fora de ordem. Os testes não acessam provedores externos.

Para consultar os serviços reais sem conta ou credencial:

```sh
python3 tools/verificar-satelites.py
```

O comando imprime metadados de cenas, tamanho das imagens PNG e contagens de
focos. Opcional: `--bbox=-47.65,-22.7,-47.4,-22.45`. Não publica nem grava dados.

Fontes: [Landsat no Planetary Computer](https://planetarycomputer.microsoft.com/dataset/landsat-c2-l2),
[escala USGS da temperatura](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature),
[NASA GIBS](https://nasa-gibs.github.io/gibs-api-docs/),
[SMAP L4](https://nsidc.org/data/spl4smgp),
[NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/).
