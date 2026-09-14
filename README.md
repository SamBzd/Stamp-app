# Stamp App

Application de gestion de clientes et de commandes utilisée par une seule personne depuis un Mac, sur le réseau local. La production est hébergée sur un NAS Synology avec Docker.

> La branche `production` est le miroir du code présent sur le NAS. La branche `main` reprend la refonte v2 comme base de stabilisation ; elle n'est pas encore déployée.

> Les bases SQLite locales ne sont pas versionnées. L'historique Git contient encore d'anciennes copies : ne le diffuse pas sans suivre les précautions décrites dans la [documentation d'exploitation](docs/operations.md).

## État du dépôt

`main` constitue désormais la base commune pour stabiliser la refonte v2 avant son futur déploiement. Ses commandes de développement ne constituent pas la procédure d'exploitation du NAS. Consulte [l'état des versions](docs/project-state.md) avant toute intervention.

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

Pour vérifier la syntaxe et le démarrage de l'API sur une base temporaire, puis compiler le frontend :

```bash
npm run check
```

Le frontend appelle `/api` par défaut. Pour un autre environnement, le backend reçoit `STAMP_DB_PATH`, `PORT` et éventuellement `CORS_ORIGIN`; le frontend peut recevoir `VITE_API_BASE_URL`. Voir [.env.example](.env.example) et [frontend/.env.example](frontend/.env.example).

## Lancer avec Docker

Le déploiement Compose est générique et ne dépend d'aucune adresse machine :

```bash
docker compose up --build
```

L'interface est ensuite disponible sur `http://localhost:8080`. Les données sont conservées dans le volume Docker `stamp-data`. Le port HTTP et le nom du volume peuvent être remplacés avec `STAMP_HTTP_PORT` et `STAMP_VOLUME_NAME`.

## Structure

```text
backend/     API Express et accès SQLite
frontend/    interface Vue 3
db/          schéma versionné et bases locales ignorées
docs/        documentation maintenue
```

## Documentation

Commence par le [sommaire de la documentation](docs/README.md), puis par [l'état des versions](docs/project-state.md). La documentation distingue les faits confirmés, l'état observé du code et les sujets restant à vérifier avec le client.

Les conventions destinées aux agents et assistants sont dans [AGENTS.md](AGENTS.md).
