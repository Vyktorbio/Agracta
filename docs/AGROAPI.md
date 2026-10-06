# Embrapa no Agracta

Bioinsumos e ZARC / Agritec entram em **Conhecimento**, com atalhos em **Fontes**.
A ClimAPI entra no seletor **Fonte** do painel de clima, junto da seleção automática,
Open-Meteo e das estações Ecowitt. O chip do mapa continua usando sua seleção
automática; a escolha manual é a do painel.

## Ativar para a equipe

1. Cadastre a aplicação Agracta na [AgroAPI](https://www.agroapi.cnptia.embrapa.br/).
2. Solicite/subscreva Bioinsumos v2, Agritec v2 e ClimAPI v1. Confirme os planos,
   limites e condições de uso na conta antes de contratar. A documentação da
   ClimAPI informa teste limitado e plano pago; este PR não faz contratação.
3. Gere a credencial de acesso da aplicação. No serviço Render já usado pelo
   Agracta, configure **somente nas variáveis de ambiente**, nunca no GitHub ou
   no frontend:
   - `AGROAPI_BIOINSUMOS_TOKEN`
   - `AGROAPI_AGRITEC_TOKEN`
   - `AGROAPI_CLIMAPI_TOKEN`

   Se uma credencial tiver assinatura das três APIs, use `AGROAPI_TOKEN`.
   A variável específica de cada API tem precedência. Atualize a variável
   quando a credencial expirar; não há renovação automática nesta versão.
4. Publique frontend e servidor juntos. O servidor precisa de
   `ndvi-proxy.py`, `satelites_backend.py` e `agroapi_backend.py`.
   Não há nova dependência Python. Mantenha `EXIGIR_LOGIN=1` em produção.
5. `/health` informa `agroapi.version: 1`. Depois do login Agracta,
   `/agroapi/status` informa apenas quais APIs têm uma credencial configurada,
   sem testá-la e sem expor valores. Confira cada consulta real antes de liberar
   o recurso como ativo para a equipe.

Os usuários mantêm suas contas do Agracta. Cada pedido usa seu token Firebase
e precisa passar pela verificação existente de membro ativo. A credencial
Embrapa é da aplicação e fica no servidor. Nenhum usuário precisa conectar
um e-mail pessoal à Embrapa.

## Consultas

| Rota do proxy | Fonte oficial | Campos |
| --- | --- | --- |
| `/agroapi/bioinsumos` | Bioinsumos v2 `/search/produtos-biologicos` ou `/search/inoculantes` | `tipo`, `q`, `cultura`, `page` |
| `/agroapi/agritec/municipios` | Agritec v2 `/municipios` | `uf` |
| `/agroapi/agritec/culturas` | Agritec v2 `/municipios/{codigoIBGE}/culturas` | `codigoIBGE` |
| `/agroapi/agritec/zoneamento` | Agritec v2 `/zoneamento` | `codigoIBGE`, `idCultura`, `risco` |
| `/agroapi/agritec/informacoes` | Agritec v2 informações adicionais por município/cultura | `codigoIBGE`, `idCultura` |
| `/agroapi/climapi/datas` | ClimAPI v1 `/ncep-gfs/{variavel}` | `variavel` |
| `/agroapi/climapi/serie` | ClimAPI v1 `/ncep-gfs/{variavel}/{data}/{longitude}/{latitude}` | `variavel`, `data`, `lat`, `lng` |

O catálogo Bioinsumos preserva registro, titular, organismos/ingredientes,
indicações, documentos e paginação da fonte. O filtro de cultura usa o nome
da base; em inoculantes a API documenta correspondência exata. A consulta
não insere nem altera automaticamente o banco de itens.

O ZARC mantém cada janela com solo, ciclo, risco, safra e portaria. Solo e
ciclo podem ser filtrados no resultado, sem chamadas adicionais. A classe de
água disponível do ZARC não é inferida a partir da camada do mapa de solos.
Esta versão integra a consulta ZARC da Agritec; modelos de produtividade,
adubação e consulta de cultivares não estão incluídos.

A ClimAPI mostra previsões do GFS para o centro do mapa, aproximadamente
25 km, com atualização da fonte a cada seis horas. Busca as execuções
disponíveis e depois a série da variável escolhida. Preserva valores,
unidades e horários originais; não converte vento em m/s para km/h, não soma
acumulados e não preenche valores ausentes. A tabela usa os campos recebidos
da fonte. Se vier outro envelope, o conteúdo permanece consultável em
“Dados retornados pela Embrapa”. Os dados do modelo não alimentam registros
medidos, carimbos de aplicação nem avaliações.

A documentação OpenAPI da ClimAPI não define um schema para o corpo das
séries. Por isso a validação com a credencial real precisa confirmar a
estrutura retornada, datas, unidades e os filtros antes de ativar em produção.
Fixtures de teste são simuladas; não demonstram resposta real autenticada.

## Operação

Somente URLs fixas da Embrapa; o cliente não envia uma URL nem um token externo.
Redirecionamentos são recusados para evitar repasse de Authorization a outro
host. Respostas limitadas a 2 MiB, espera de 20 s e cache em memória limitado
a 64 entradas / 16 MiB. Catálogo: 20 min; municípios/culturas: 24 h;
ZARC e ClimAPI: 1 h. Mudança de credencial invalida a chave do cache.
Erros e respostas inválidas não são apresentados como “nenhum dado”.

Respostas de consultas antigas não repintam o painel depois de troca de fonte,
filtros, local ou fechamento. Falha na ClimAPI mantém a fonte selecionada e
mostra a mensagem; não troca silenciosamente para outro provedor.

## Conferir

`npm test -- --pull-request` executa o portão existente, incluindo testes
AgroAPI de contratos Python, autenticação do proxy, apresentação e JSDOM.
`npm run test:regras` confere permissões e sincronização no emulador.
Consultas reais precisam da credencial descrita acima.

## Documentação primária consultada

- [Bioinsumos v2 — OpenAPI](https://www.agroapi.cnptia.embrapa.br/store/api-docs/agroapi/Bioinsumos/v2)
- [Agritec v2 — OpenAPI](https://www.agroapi.cnptia.embrapa.br/store/api-docs/agroapi/Agritec/v2)
- [ClimAPI v1 — OpenAPI](https://www.agroapi.cnptia.embrapa.br/store/api-docs/agroapi/ClimAPI/v1)
- [ClimAPI — guia da Embrapa](https://www.agroapi.cnptia.embrapa.br/portal/assets/docs/climapi.pdf)
