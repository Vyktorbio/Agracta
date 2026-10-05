# Agracta — registros de ensaios de campo

PWA de pesquisa agrícola para ensaios de campo e de laboratório sob BPL: mapa de
satélite com as quadras georreferenciadas, estudos com protocolo vivo, aplicações
com memória de cálculo, avaliações, fotos, estatística no próprio aparelho,
trilha de auditoria e índices de vegetação **NDVI / NDRE / GNDVI** do Sentinel‑2.
Funciona offline e sincroniza pelo Firebase.

## Rodar localmente
1. Abrir o app: sirva a pasta (recomendado, habilita GPS/PWA) —
   `python3 -m http.server 8080` e acesse `http://localhost:8080`.
   (Também abre com 2 cliques no `index.html`, mas aí GPS/instalação ficam bloqueados pelo navegador.)
2. NDVI (opcional): rode o proxy do Sentinel‑2 —
   `python3 ndvi-proxy.py` (na 1ª vez ele pede o Client ID/Secret do Copernicus e salva em `ndvi-credenciais.json`).

## Onde mora cada coisa

Não há build: o site é servido do jeito que está no repositório, e cada arquivo
abaixo é baixado pelo aparelho como está.

### A tela principal (`index.html`)

O `index.html` carrega as bibliotecas e a maior parte dos motores puros antes do
`app.js`; os módulos que se penduram nele vêm depois. A barra de baixo tem,
nesta ordem: Mapa, Conhecimento, Hoje, Agenda, Buscar e Menu.

| Área | Arquivos |
|---|---|
| Entrada, acesso e nuvem | `acesso-horario.js` (nada aparece antes do login; janela de horário por técnico) · `firebase-config.js` · `firebase-sync.js` (login, sincronização local-first, histórico de versões; a parte de nuvem do Painel Admin) |
| Coordenação da interface | `app.js` — quadras, estudos, aplicações, avaliações, Hoje e Agenda, cópias e recuperação, Painel Admin. É o arquivo grande (~24 mil linhas); dividi-lo por área é a frente 3 da lapidação |
| Mapa | `ui-campo.js` / `ui-campo.css` (gaveta de ferramentas, NDVI com faixa de datas, botões Mapa e Menu) · `mapa-medir.js` (grupos de parcelas provisórios) · `mapa-inicio.js` ("abrir o app em") · `notas-local.js` (onde cada nota foi lançada) · `croqui-livre.js` e `croqui-parcelas.js` (parcelas no mapa) |
| Estudo e protocolo | `protocolo-menu.js` (o protocolo num lugar só) · `protocolo-avaliacoes.js` · `aplicacoes-recolhiveis.js` · `calculadora-drone.js` · `campo-inteligente.js` (clima e nota estranha na hora) · `colonia-medida.js` (colônia medida na foto) |
| Fotos e relatório | `fotos-estudo.js` · `galeria-fotos.js` · `relatorio-estudo.js` (abrem as páginas isoladas `galeria-local.html` e `relatorio-local.html`) |
| Trilha BPL | `eventos-app.js` (eventos formais ao lado da trilha de sempre) · `trilha-formal.js` (a trilha na ficha do estudo) |
| Conhecimento | `integracoes.js` (+ `integracoes-fontes.js`, `integracoes-clientes.js`) · `conhecimento-canonico.js` (aba "Entre estudos") · `estudo-pagina.js` (página do estudo) · `alvos-catalogo.js` |
| Ver no campo (sob demanda) | `campo-3d.js` / `campo-3d.css` · `campo-3d-exportar.js` e `campo-3d-realista.js` (PNG e MP4). Não estão no `index.html`: entram no primeiro uso |
| Clima | `clima-pagina.js` / `clima-pagina.css` |
| Estatística | `estatistica.js` (núcleo em JS) · `estatistica/` (motor em Python rodando no navegador pelo Pyodide, com service worker próprio; o código Python fica em `estatistica/bioengine/`) |

### Páginas separadas

`croqui.html` (croqui das quadras para o relatório), `prancha.html` (prancha de
resultados), `cliente.html` + `cliente.js` (consulta do cliente, sem acesso ao
workspace), `galeria-local.html` + `galeria-local.js` (fotos das parcelas, só no
aparelho) e `relatorio-local.html` + `relatorio-local.js` (relatório do estudo).

### Motores puros e bibliotecas (`vendor/`)

- **Motores do Agracta** — `vendor/<nome>-core.js`: as contas, sem DOM, testáveis
  no Node. O app só pinta e grava; a regra mora no motor. Exemplos:
  `biocalc-campo-core.js` (calda), `biocalc-lab-core.js` (bancada),
  `aplicacao-core.js`, `dose-core.js`, `avaliacao-core.js`, `agenda-core.js`,
  `protocolo-vivo-core.js`, `versoes-core.js`, `mascara-core.js` (cor das quadras
  no mapa), `croqui-campo-core.js`, `eventos-core.js`, `observacao-core.js`.
- **Bibliotecas de terceiros** — Leaflet e plugins, Three.js
  (`three-agracta.min.js`), Firebase (`*-compat.js`), SheetJS (`xlsx.full.min.js`),
  JSZip e `mp4-muxer.js`.
- `vendor/quadras-default.js` — reserva vazia para instalações novas; a geometria
  operacional vem do armazenamento autenticado ou do próprio aparelho.

### Visual

`styles.css` é a base (extraída do antigo `index.html`). Por cima dela, na ordem
do `index.html`: `theme-2026.css` (camada visual de campo), `ui-campo.css`,
`profundidade.css`, `interface-neutra.css` (superfícies neutras) e
`cores-padrao.css` (cores de estado, carregada por último). Os outros `.css`
são de uma tela só (`integracoes.css`, `estudo-pagina.css`, `clima-pagina.css`,
`fotos-estudo.css`, `croqui-parcelas.css`, `protocolo-*.css`, `campo-3d.css`).

### Fora da tela

| O quê | Onde |
|---|---|
| PWA (instalável e offline) | `manifest.webmanifest`, `sw.js`, `icon-*.png` |
| Proxy de satélite, clima e solo (Python, roda no Render) | `ndvi-proxy.py`, `render.yaml`, `requirements.txt` |
| Regras e configuração do banco | `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc` |
| Dados embarcados (Agrofit, EPPO) | `data/` |
| Planilhas-modelo de protocolo | `modelos/` |
| Ferramentas de manutenção (atualizar Agrofit e EPPO, baixar relevo) | `tools/` |
| Atualização automática do Agrofit/EPPO e CI dos PRs | `.github/workflows/` |
| Testes | `tests/` (ver "Testes e portão") |
| O que mudou em cada publicação | `LEIA-ME.txt` |
| Especificação, roadmap e guias por função | `docs/` (índice em `docs/README.md`) |

## Testes e portão

O `conferir.sh` é o portão antes de publicar: confere a sintaxe dos scripts, roda
todos os testes e confere as versões do cache. Responde **PODE SUBIR** ou **NÃO
SUBA** e por quê. No Mac, o duplo clique em `Conferir antes de publicar.command`
roda o mesmo portão.

- `npm install` uma vez (traz o jsdom e o IndexedDB simulado dos testes de tela);
  depois `npm test`, que é `bash conferir.sh`.
- Num pull request: `bash conferir.sh --pull-request` (o CI roda este).
- Os testes moram em `tests/`: `test_*.js` (Node) e `test_*.py` (Python).
  Rodam a partir da raiz: `node tests/test_agenda_calendario.js`.
- Também em `tests/`: as regras do banco no emulador (`*-rules.cjs`,
  `sync-firestore.cjs`), o motor estatístico em Python (`motor_*.py`, que o
  `test_motor_python.js` roda no Pyodide) e os ajudantes `state-harness.cjs`
  (o app num contexto de teste) e `check-assets.cjs` (o portão usa).
- Teste novo de motor: `tests/test_<nome>.js`, ao lado dos outros. Um `test_*.js`
  deixado na raiz não roda, e o portão reprova a publicação por isso.
- Regras do banco no emulador: `npm run test:regras` (precisa de Java; o CI roda).

## Segurança
`ndvi-credenciais.json` (segredo do Copernicus) **não** é versionado (ver `.gitignore`).

O acesso é controlado em duas camadas. Na tela, o app fica invisível até a
autenticação e volta a ficar invisível fora do horário liberado. No banco, as
`firestore.rules` recusam leitura e escrita para quem não é membro ativo ou está
fora da própria janela de horário — é essa camada que protege o dado de verdade,
já que os arquivos do site são estáticos e públicos.

O horário de cada técnico fica em `members/{email}.janela` e é editado no Painel
Admin. Depois de mexer nas regras, publique-as:

```bash
npx firebase-tools deploy --only firestore:rules
```

## Publicar
- **App** → GitHub Pages (estático, https), direto do `main`: o que entra no `main`
  está no ar.
- **Proxy NDVI** → servidor (ex.: Render) — GitHub Pages não roda Python.
- **Multiusuário** → Firebase Authentication + Cloud Firestore.

Toda publicação que muda um arquivo do app:
1. sobe o `?v=` desse arquivo no `index.html` **e** na lista `ASSETS` do `sw.js`
   (os dois iguais);
2. sobe o `CACHE` do `sw.js` (`agracta-app-vNNN`) e o registro `sw.js?v=NNN` no
   `index.html` — sem isso o aparelho instalado continua com a versão velha;
3. ganha uma entrada no topo do `LEIA-ME.txt`: o que mudou, por quê e o que
   conferir depois de subir.

O `conferir.sh` confere que o `index.html` e o `sw.js` pedem as mesmas versões e,
no modo publicação, que o `CACHE` é diferente do que está no ar. Ele ainda não
percebe um arquivo alterado cujo `?v=` ficou igual.

## Persistência local-first

O Agracta salva primeiro no aparelho e usa a nuvem como sincronização:

1. o estado ativo permanece no armazenamento local;
2. um checkpoint completo adicional é mantido no IndexedDB;
3. o Firestore recebe documentos separados por local, quadra, estudo,
   aplicação, avaliação e lançamento;
4. alterações feitas sem internet ficam marcadas no checkpoint do Agracta;
5. quando a conexão volta, o aplicativo relê a revisão e reconcilia as pendências;
6. dados e revisão são enviados juntos em uma transação. Se outro aparelho
   alterar a base, a reconciliação é refeita antes de tentar novamente.

As regras do Firestore exigem essa gravação atômica (`syncProtocol: 3`). Clientes
antigos precisam atualizar o aplicativo antes de voltar a enviar; seu trabalho
local permanece no aparelho. Uma falha de leitura ou envio mantém a pendência,
sem publicar um estado parcial nem uma revisão falsa.

Backups automáticos incluem observações e registros de exclusão. O cofre também
inclui as fotos das observações disponíveis neste aparelho; antes de excluir uma
observação, o app confirma a cópia da imagem. Para transferir os dados a outro
aparelho por exportação, preserve também os arquivos locais das fotos. Além da
cópia em localStorage, até dez versões recentes ficam no cofre IndexedDB,
acessíveis pelo mesmo menu de backups. Restaurar/importar um backup cria uma nova
geração persistente: uma cópia antiga de outro aparelho não desfaz a restauração.
Backups legados não passam a conter fotos que nunca foram guardadas neles.

Validação: `npm test` e `npm run test:regras` (emulador local, nunca produção).
O limite de tamanho de transação do Firestore continua aplicável: se um envio
excedê-lo, a transação falha inteira e os dados permanecem locais, pendentes.

O IndexedDB interno do Firestore permanece desativado. O Agracta já possui seu
próprio cofre durável, evitando duas filas offline concorrentes no navegador.

Se Firebase ou internet estiverem indisponíveis, o trabalho de campo continua.
O selo mostra `salvo neste aparelho` até a sincronização voltar.

### Configurar o Firebase

1. Crie um projeto Firebase e um aplicativo Web.
2. Ative Authentication por e-mail/senha e Cloud Firestore.
3. Copie a configuração Web para `firebase-config.js`.
4. Faça login no CLI e publique as regras:

   ```bash
   npx firebase-tools login
   npx firebase-tools use SEU_PROJECT_ID
   npx firebase-tools deploy --only firestore
   ```

As fotos ficam no aparelho; a nuvem recebe os metadados das observações.
Fragmentos antigos no Firestore continuam disponíveis para migração local,
mas a sincronização não grava novas imagens nem apaga esses fragmentos.
