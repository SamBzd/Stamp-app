# Documentation Stamp App

Ce dossier est le point d'entrée de la documentation maintenue du projet. Il sépare la production réellement déployée, la base de stabilisation portée par `main` et les informations qui restent à confirmer.

- [État du projet](project-state.md) : versions, environnement réel et sources de vérité.
- [Architecture](architecture.md) : composants, frontières et flux.
- [Développement](development.md) : installation et commandes de la branche `main`.
- [Modèle de données](data-model.md) : entités et règles héritées de la v2, à revalider.
- [Catalogues et commandes kits](catalogue-metier.md) : règles validées le 16 septembre 2026 et scénarios d'acceptation à implémenter.
- [Modèle cible catalogues et kits](catalogue-model-proposal.md) : décisions de l’issue #4, contrat de données et import limité aux clientes.
- [Exploitation](operations.md) : exécution locale, sauvegarde et déploiement.
- [Qualité](quality.md) : vérifications actuelles et stratégie de tests.
- [Constats techniques](backlog.md) : écarts hérités de la v2 à qualifier pendant la stabilisation.
- [Archive du plan v2](archive/plan-v2.md) : plan historique, conservé sans valeur de feuille de route.

## Règle de lecture

- Pour savoir ce qui tourne sur le NAS, la référence est la branche `production`, complétée plus tard par une copie contrôlée de la base et de la configuration réelles.
- Pour travailler sur la future version, la référence est `main`, issue du travail v2 et encore non déployée.
- La branche `v2` reste une référence historique archivée ; elle ne doit plus recevoir de développement.
- Les règles validées pour les catalogues et kits sont consignées dans [catalogue-metier.md](catalogue-metier.md). Les autres besoins restent à confirmer ; aucun constat de l'audit ne vaut décision de correction.
