# Architecture

> Périmètre : ce document décrit le code de `main`, issu de la refonte v2 et désormais retenu comme base de stabilisation. Il ne décrit pas la version actuellement déployée sur le NAS ; voir [État du projet](project-state.md).

## Vue d'ensemble

```text
Navigateur → Vue 3 / Pinia → API Express → SQLite
```

Le frontend se trouve dans `frontend/src/`, l'API dans `backend/src/` et la base SQLite dans `db/app.db`. Dans une branche donnée, `db/schema.sql` décrit le schéma attendu par son code. La base locale actuelle étant obsolète, elle ne permet pas de conclure sur la production.

## Frontend

- Les vues composent l'interface ; les composants partagés restent dans `frontend/src/components/`.
- Les stores Pinia portent l'état partagé.
- `frontend/src/services/api.js` est l'unique point d'appel HTTP.
- La Composition API (`<script setup>`) est la convention.

## Backend

- `backend/src/index.js` configure Express et enregistre les routes.
- Chaque ressource a une route dans `backend/src/routes/`.
- Les requêtes SQLite et transactions sont isolées dans `backend/src/db/`.
- Les réponses sont JSON ; les erreurs client utilisent un code HTTP explicite.

## Frontières à préserver

La validation de données côté interface améliore l'expérience, mais l'API doit toujours faire respecter les règles métier. Les écritures qui touchent plusieurs tables doivent rester transactionnelles.

Les anciens modules Groupes/Collections v1 sont hors du flux repris dans `main`. Ils doivent être retirés ou migrés lors d'un chantier dédié, pas réutilisés par inadvertance.
