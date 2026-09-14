# Stamp App — conventions de projet

## Contexte

Stamp App est une application de gestion de clientes et de commandes utilisée par une seule personne depuis un Mac, sur un réseau local. La production est hébergée dans des conteneurs Docker sur un NAS Synology. La branche `production` reflète le code du NAS. La branche `main` reprend le travail de la v2 comme base active de stabilisation, mais elle n'est pas encore déployée.

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
- Ne transforme pas les règles consignées dans `docs/data-model.md` en exigences de production : elles sont héritées de la v2 et doivent être revalidées avant le futur déploiement de `main`.

## Vérification minimale

```bash
find backend/src -type f -name '*.js' -print0 | xargs -0 -n1 node --check
npm run build --prefix frontend
```

Il n'existe pas encore de suite de tests ou de CI : tout changement métier doit donc inclure les tests appropriés avant d'être considéré comme prêt à livrer.
