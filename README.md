# Agracta — registros de ensaios de campo (mapa + NDVI)

App de agricultura de precisão:
mapa de satélite real, quadras georreferenciadas (área e coordenadas), fenologia/estudos,
e índices de vegetação **NDVI / NDRE / GNDVI** do Sentinel‑2, com série temporal e consulta por ponto.

## Rodar localmente
1. Abrir o app: sirva a pasta (recomendado, habilita GPS/PWA) —
   `python3 -m http.server 8080` e acesse `http://localhost:8080`.
   (Também abre com 2 cliques no `index.html`, mas aí GPS/instalação ficam bloqueados pelo navegador.)
2. NDVI (opcional): rode o proxy do Sentinel‑2 —
   `python3 ndvi-proxy.py` (na 1ª vez ele pede o Client ID/Secret do Copernicus e salva em `ndvi-credenciais.json`).

## Estrutura
- `index.html` — o app inteiro (mapa Leaflet + lógica).
- `ui-campo.js` / `ui-campo.css` — a casca de uso do mapa: um ícone abre a gaveta
  com todas as ferramentas, e ligar os índices abre a faixa de datas no rodapé,
  já na imagem mais recente com céu limpo.
- `vendor/mascara-core.js` — a cor da máscara das quadras no mapa: pendente,
  parcial, avaliada, selecionada ou fora do estudo, com o mesmo vocabulário do
  croqui da avaliação. Motor puro; o NDVI continua tendo prioridade sobre ela,
  porque ali a cor é medida do satélite.
- `acesso-horario.js` — janela de horário por técnico (tela travada fora do
  expediente, com aviso e sincronização antes) e a porta de entrada: nada do app
  é pintado antes de autenticar.
- `vendor/` — Leaflet e plugins (offline).
- `quadras-default.js` (em `vendor/`) — reserva vazia para instalações novas; a geometria operacional vem do armazenamento autenticado ou do próprio aparelho.
- `ndvi-proxy.py` — proxy local que conversa com o Sentinel Hub (Copernicus).
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA (instalável/offline).

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
- **App** → GitHub Pages (estático, https).
- **Proxy NDVI** → servidor (ex.: Render) — GitHub Pages não roda Python.
- **Multiusuário** → Firebase Authentication + Cloud Firestore.

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
