# Constats techniques hérités de la v2

Les éléments ci-dessous proviennent de l'audit initial de la v2, désormais reprise comme fondation de `main`. Ils ne sont ni des corrections déjà appliquées, ni un backlog entièrement validé. Leur pertinence devra être réévaluée pendant la stabilisation, à partir de la production et des règles métier confirmées.

## Risques métier observés

- Valider côté API la composition exacte des kits : 2+3 papiers de deux collections distinctes pour A/B, 5 papiers pour C, tous issus des collections déclarées.
- Bloquer ou encadrer les catalogues et collections incomplets avant utilisation.
- Réconcilier les données existantes qui ne respectent pas ces invariants.
- Recalculer les points de fidélité lors de la modification ou suppression d'une commande hors kit.

## Déploiement et données observés sur la v2

- La v2 contient une URL API `localhost` codée en dur et une politique CORS permissive.
- La configuration Docker actuelle se trouve sur la branche `production` et devra être adaptée à `main` avant tout déploiement.
- Retirer `db/app.db` et `db/app.db.backup` du dépôt, puis fournir une base de démonstration anonymisée.
- Mettre à jour les dépendances signalées par `npm audit`.

## Maintenabilité observée

- Ajouter tests d'intégration et CI.
- Retirer le code, les stores et les requêtes Bruno v1 devenus obsolètes.
- Rendre le Dashboard accessible ou supprimer la vue inutilisée.
