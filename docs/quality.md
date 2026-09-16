# Qualité et validation

> Périmètre : état initial de `main`, issue de la v2 et encore en stabilisation. Ces contrôles ne valident ni le déploiement Docker ni les données du NAS.

## État de départ

Le projet possède des tests d'intégration de l'API sur une base SQLite temporaire et un contrôle de build Vue. Le workflow GitHub Actions `.github/workflows/ci.yml` exécute ces contrôles à chaque push sur `main` et pour chaque pull request vers `main`. Il ne possède pas encore de linter, et les règles métier restent très peu couvertes.

## Contrôles disponibles

```bash
npm run check
docker compose config
npm audit --omit=dev --prefix backend
npm audit --omit=dev --prefix frontend
```

La CI utilise Node.js dans la version indiquée par `.nvmrc`, installe séparément
les dépendances racine, backend et frontend avec `npm ci`, puis exécute
`npm run check` et `npm run check:docker`.

## Couverture à ajouter sur `main`

1. Cas de commande kit A/B/C valides et invalides, y compris les quantités et l'appartenance des papiers aux collections.
2. Tests des points de fidélité lors de création, modification et suppression.
3. Vérification du calcul de stock et du bilan mensuel.
4. Exécution automatisée des tests et du build dans une CI.

La stratégie de validation de `main` sera consolidée après confirmation des règles métier et inspection de la production. Toute anomalie de données devra être traitée par une migration ou une procédure explicitement réversible, jamais par une édition manuelle silencieuse.
