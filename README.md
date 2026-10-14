# Stamp App

Application de gestion de clientes et de commandes utilisée par une seule personne depuis un Mac, sur le réseau local. La production est hébergée sur un NAS Synology avec Docker.

La version stabilisée du commit applicatif **`6cc9817`** est livrée sur NAS
depuis le **14 octobre 2026**. `main` reste la base de développement ; la
branche `production` conserve l’ancienne version pour le retour arrière.

Commence par [l’état du projet](docs/project-state.md),
[le compte rendu de livraison](docs/livraison-nas.md) et
[le sommaire](docs/README.md). Les configurations réelles et notes privées du
NAS restent locales, exclues de Git. L’historique contient encore d’anciennes
copies SQLite : voir [les précautions d’exploitation](docs/operations.md#confidentialité).

## Développer `main` en local

Prérequis : Node.js 22.22.2 et npm 10 ou supérieur.

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run dev
```

Cette commande crée si besoin puis utilise `db/dev.db`, une base locale vide et ignorée par Git. Elle ne lit ni ne modifie `db/app.db`.

Le frontend de développement écoute sur `http://localhost:5173` et l'API sur le port 3000. Pour produire le bundle frontend :

```bash
npm run build --prefix frontend
```

Pour vérifier la syntaxe et le démarrage de l'API sur une base temporaire, les conversions tarifaires du frontend, puis compiler Vue :

```bash
npm run check
```

Le frontend appelle `/api` par défaut. Pour un autre environnement, le backend reçoit `STAMP_DB_PATH`, `PORT` et éventuellement `CORS_ORIGIN`; le frontend peut recevoir `VITE_API_BASE_URL`. Voir [.env.example](.env.example) et [frontend/.env.example](frontend/.env.example).

## Lancer avec Docker

Pour un environnement local Docker neuf, le Compose générique permet :

```bash
docker compose up --build
```

Ce Compose ne remplace pas celui du NAS. L'interface locale est disponible sur `http://localhost:8080`. Les données sont conservées dans le volume Docker `stamp-data`. Le port HTTP et le nom du volume peuvent être remplacés avec `STAMP_HTTP_PORT` et `STAMP_VOLUME_NAME`.

## Structure

```text
backend/     API Express et accès SQLite
frontend/    interface Vue 3
db/          schéma versionné et bases locales ignorées
docs/        documentation maintenue
```

## Documentation

Commence par le [sommaire de la documentation](docs/README.md), puis par [l'état des versions](docs/project-state.md). Les archives conservent les anciennes intentions et recettes ; les contrats actifs décrivent le socle livré.

Les conventions destinées aux agents et assistants sont dans [AGENTS.md](AGENTS.md).
