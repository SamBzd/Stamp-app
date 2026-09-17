# Architecture

> Périmètre : ce document décrit le code de `main`, issu de la refonte v2 et désormais retenu comme base de stabilisation. Il ne décrit pas la version actuellement déployée sur le NAS ; voir [État du projet](project-state.md).

## Vue d'ensemble

```text
Navigateur → Vue 3 / Pinia → API Express → SQLite
```

Le frontend se trouve dans `frontend/src/` et l'API dans `backend/src/`. Le schéma SQLite versionné est `db/schema.sql`; les fichiers de données sous `db/` sont locaux et ignorés par Git. `npm run dev` utilise `db/dev.db`. Les données locales ne permettent pas de conclure sur la production.

Le déploiement Compose sert le frontend statique avec Nginx. Nginx transmet `/api` au service backend sur le réseau interne ; seul le port HTTP du frontend est exposé. SQLite est stockée dans un volume persistant indépendant des images.

## Frontend

- Les vues composent l'interface ; les composants partagés restent dans `frontend/src/components/`.
- Les stores Pinia portent l'état partagé.
- `frontend/src/services/api.js` est l'unique point d'appel HTTP.
- La Composition API (`<script setup>`) est la convention.

## Backend

- `backend/src/app.js` configure Express et enregistre les routes ; `index.js` démarre le serveur.
- Chaque ressource a une route dans `backend/src/routes/`.
- Les requêtes SQLite et transactions sont isolées dans `backend/src/db/`.
- Les réponses sont JSON ; les erreurs client utilisent un code HTTP explicite.

## Frontières à préserver

La validation de données côté interface améliore l'expérience, mais l'API doit toujours faire respecter les règles métier. Les écritures qui touchent plusieurs tables doivent rester transactionnelles.

Les anciens modules Groupes v1 sont hors du flux repris dans `main` et restent à retirer lors d’un chantier dédié. L’endpoint Collections historique est désormais un alias des mutations catalogue, avec catalogue obligatoire et validation transactionnelle commune ; voir [le contrat API](catalogue-api.md).
