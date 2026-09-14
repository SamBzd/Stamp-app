# Stamp App

Application de gestion de clientes et de commandes utilisée par une seule personne depuis un Mac, sur le réseau local. La production est hébergée sur un NAS Synology avec Docker.

> La branche `production` est le miroir du code présent sur le NAS. La branche `main` reprend la refonte v2 comme base de stabilisation ; elle n'est pas encore déployée.

> Le dépôt contient actuellement une base SQLite réelle. Ne le diffuse pas sans suivre les précautions décrites dans la [documentation d'exploitation](docs/operations.md).

## État du dépôt

`main` constitue désormais la base commune pour stabiliser la refonte v2 avant son futur déploiement. Ses commandes de développement ne constituent pas la procédure d'exploitation du NAS. Consulte [l'état des versions](docs/project-state.md) avant toute intervention.

## Développer `main` en local

Prérequis : Node.js 18.20.0 et npm 8 ou supérieur.

```bash
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run dev
```

Le frontend de développement écoute sur `http://localhost:5173` et l'API sur le port 3000. Pour produire le bundle frontend :

```bash
npm run build --prefix frontend
```

## Structure

```text
backend/     API Express et accès SQLite
frontend/    interface Vue 3
db/          schéma et base locale
docs/        documentation maintenue
```

## Documentation

Commence par le [sommaire de la documentation](docs/README.md), puis par [l'état des versions](docs/project-state.md). La documentation distingue les faits confirmés, l'état observé du code et les sujets restant à vérifier avec le client.

Les conventions destinées aux agents et assistants sont dans [AGENTS.md](AGENTS.md).
