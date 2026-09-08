# Stamp App — conventions de projet

## Contexte

Stamp App est une application personnelle de gestion de clientes, catalogues et commandes, déployée localement sur un NAS. La version fonctionnelle courante est la v2. Les documents du dossier [`docs/`](docs/README.md) décrivent le produit et son exploitation ; le code et `db/schema.sql` restent les sources de vérité techniques.

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
- Préserve les contraintes métier documentées dans `docs/data-model.md`, côté API comme côté interface.

## Vérification minimale

```bash
find backend/src -type f -name '*.js' -print0 | xargs -0 -n1 node --check
npm run build --prefix frontend
```

Il n'existe pas encore de suite de tests ou de CI : tout changement métier doit donc inclure les tests appropriés avant d'être considéré comme prêt à livrer.
