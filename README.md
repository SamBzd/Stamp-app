# Stamp App

Application personnelle de gestion de clientes, catalogues, commandes et stocks. La version fonctionnelle visée est la v2 ; elle repose sur Vue 3, Express 5 et SQLite.

> Le dépôt contient actuellement une base SQLite réelle. Ne le diffuse pas sans suivre les précautions décrites dans la [documentation d'exploitation](docs/operations.md).

## Démarrer en local

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

Commence par le [sommaire de la documentation](docs/README.md) : architecture, développement, modèle métier, exploitation, qualité et backlog connu.

Les conventions destinées aux agents et assistants sont dans [AGENTS.md](AGENTS.md).
