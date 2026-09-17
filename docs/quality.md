# Qualité et validation

> Périmètre : état initial de `main`, issue de la v2 et encore en stabilisation. Ces contrôles ne valident ni le déploiement Docker ni les données du NAS.

## État de départ

Le projet possède des tests d'intégration de l'API sur une base SQLite temporaire et un contrôle de build Vue. Le workflow GitHub Actions `.github/workflows/ci.yml` exécute ces contrôles à chaque push sur `main` et pour chaque pull request vers `main`. Il ne possède pas encore de linter. Les tests `backend/test/catalogue-api.test.js` couvrent les tarifs en centimes, publication/démotion, maxima atomiques, archivage/restauration et invariance des snapshots, stocks et bilan lors des mutations source.

`backend/test/commandes-kit-api.test.js` couvre les compositions A/B/C,
répétitions et appartenance des papiers, rubans 0/1/2, option et suppléments,
prix manuel, refus atomiques et rollback après échec SQL simulé, remplacement
complet, conservation historique, règlement dédié, immutabilité, suppression,
stocks et bilan limité aux commandes réglées. Ces tests utilisent une base
temporaire et ne touchent aucune base locale du projet ni le NAS.

La couverture Stocks de l’issue #10 vérifie aussi les papiers partagés,
les homonymes identifiés, les provenances et quantités base/final,
les nouvelles commandes après renommage et les matériaux absents. Les tests
`frontend/test/stocks-store.test.js` vérifient les états Stocks/Bilan indépendants
et le rejet des réponses anciennes. La [recette Stocks](stocks.md#vérifications)
complète cette couverture par un contrôle visuel sur données fictives.

## Contrôles disponibles

`npm run check` exécute aussi les tests frontend natifs
(`frontend/test/catalogue.test.js`) : saisies tarifaires, bornes 0–100 €,
refus des arrondis implicites, conversion aller-retour pour chaque centime de
la plage, et explication des conditions de publication. Ils complètent les
tests API ; la [recette navigateur](catalogue-ui.md#vérification) contrôle les
interactions et la persistance réelles.

`frontend/test/commande-kit.test.js` couvre les répétitions A/B, les contributions
complémentaires, les compositions C à 1/3/5 papiers, les rubans, les suppléments,
les montants exacts et leurs limites, la dérogation explicite, l’édition sur les
sources actuelles et l’indépendance des snapshots historiques. La
[recette commandes](commandes-ui.md#vérification) complète ces tests par les
interactions de création, édition, règlement, suppression et refus serveur.

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

1. Recette des parcours Vue catalogue/commande après adaptation des interfaces.
2. Tests des points de fidélité lors de modification et suppression, après validation de ces règles métier.
3. Recette de livraison Docker et contrôles sur copie des données du NAS.

La stratégie de validation de `main` sera consolidée après confirmation des règles métier et inspection de la production. Toute anomalie de données devra être traitée par une migration ou une procédure explicitement réversible, jamais par une édition manuelle silencieuse.
