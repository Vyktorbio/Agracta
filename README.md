# Agracta — registros de ensaios de campo (mapa + NDVI)

App de agricultura de precisão da estação experimental (Plantec, Iracemápolis‑SP):
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
- `vendor/` — Leaflet e plugins (offline).
- `quadras-default.js` (em `vendor/`) — alinhamento + geometria das quadras (gerado de backup).
- `ndvi-proxy.py` — proxy local que conversa com o Sentinel Hub (Copernicus).
- `manifest.webmanifest`, `sw.js`, `icon-*.png` — PWA (instalável/offline).

## Segurança
`ndvi-credenciais.json` (segredo do Copernicus) **não** é versionado (ver `.gitignore`).

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
4. alterações feitas sem internet entram na fila persistente do SDK;
5. quando a conexão volta, o aplicativo reconcilia e envia as pendências.

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

As fotos são fragmentadas em documentos do Firestore durante esta primeira
fase. Assim a migração não exige ativar o plano Blaze apenas para Storage.
