# Backlog technique initial

Les éléments ci-dessous proviennent de l'audit initial du dépôt. Ils ne sont pas des corrections déjà appliquées.

## Priorité 0 — intégrité métier

- Valider côté API la composition exacte des kits : 2+3 papiers de deux collections distinctes pour A/B, 5 papiers pour C, tous issus des collections déclarées.
- Bloquer ou encadrer les catalogues et collections incomplets avant utilisation.
- Réconcilier les données existantes qui ne respectent pas ces invariants.
- Recalculer les points de fidélité lors de la modification ou suppression d'une commande hors kit.

## Priorité 1 — déploiement et données

- Remplacer l'URL API `localhost` codée en dur par une configuration adaptée au développement et au NAS.
- Restreindre CORS et définir le déploiement de production.
- Retirer `db/app.db` et `db/app.db.backup` du dépôt, puis fournir une base de démonstration anonymisée.
- Mettre à jour les dépendances signalées par `npm audit`.

## Priorité 2 — maintenabilité

- Ajouter tests d'intégration et CI.
- Retirer le code, les stores et les requêtes Bruno v1 devenus obsolètes.
- Rendre le Dashboard accessible ou supprimer la vue inutilisée.
