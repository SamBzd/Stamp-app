# Stamp App — conventions de projet

## Contexte

Stamp App est une application de gestion de clientes et de commandes utilisée par une seule personne depuis un Mac, sur un réseau local. La production est hébergée dans des conteneurs Docker sur un NAS Synology. Les images du commit applicatif `6cc9817` sont déployées depuis le 14 octobre 2026. `main` reste la base de développement ; la branche `production` conserve l’ancienne version pour le retour arrière. Une tête de branche ne prouve pas un nouveau déploiement.

Lis [`docs/project-state.md`](docs/project-state.md) avant toute intervention. Le code de la branche examinée et son `db/schema.sql` restent les sources de vérité techniques de cette branche ; ils ne prouvent pas l'état des données ni de la configuration actuellement présentes sur le NAS.

## Stack et structure

- Frontend : Vue 3 (Composition API), Pinia et Vue Router, dans `frontend/`.
- API : Express 5/CommonJS, dans `backend/src/`.
- Données : SQLite via `better-sqlite3`, dans `db/`.

Les appels HTTP du frontend sont centralisés dans `frontend/src/services/api.js`. Les accès SQL restent dans `backend/src/db/` et les routes dans `backend/src/routes/`.

## Règles de changement

- Lis les modules concernés avant de les modifier et garde les appels SQL hors des routes.
- Après un changement de schéma, mets à jour `db/schema.sql` et fournis une procédure de migration ou de reset adaptée.
- Ne modifie jamais `db/app.db` à la main. `node db/reset_v2.js` est destructif pour les données v2 : il ne doit être lancé qu'avec un accord explicite.
- N'ajoute pas de dépendance sans nécessité justifiée.
- Le modèle actuel est dans `docs/data-model.md`. Les intentions v2 et anciennes recettes sont archivées : ne les transforme pas en exigences ou backlog sans revalidation. Les détails NAS et données réelles restent dans les notes locales ignorées par Git.

## Vérification minimale

```bash
npm run check
docker compose config
```

La suite couvre le démarrage de l'API sur une base temporaire et le build du frontend. Tout changement métier doit compléter cette couverture avant d'être considéré comme prêt à livrer.
