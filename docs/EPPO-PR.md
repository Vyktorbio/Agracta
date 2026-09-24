Atualização automática de `data/eppo.json` pelo workflow **Atualizar tabela EPPO** (`tools/eppo-atualiza.py`).

- Os nomes consultados são os binômios do `alvos-catalogo.js` e as culturas de `tools/eppo-culturas.json`.
- Cada código só entra se a própria EPPO confirmar que o táxon daquele código tem exatamente o nome consultado (nome preferido ou nome registrado). Os nomes sem confirmação aparecem em `naoResolvidos`, com o motivo.
- O `CACHE` do `sw.js` sobe junto, para os aparelhos pegarem a tabela nova.

Antes de aprovar: confira no diff se algum código mudou para um nome que já tinha código. Isso costuma ser uma reclassificação taxonômica e vale olhar.

Dados: EPPO Global Database (https://data.eppo.int), EPPO Open Licence.
