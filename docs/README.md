# Documentation Stamp App

## Commencer ici

- [État du projet](project-state.md) : version livrée, références et suivi restant.
- [Livraison du 14 octobre 2026](livraison-nas.md) : preuves, limites et ménage.
- [Développement](development.md) : installation, base jetable et configuration.
- [Exploitation](operations.md) : stockage, sauvegarde, mises à jour et retour arrière.
- [Checklist de livraison](release-checklist.md) : contrôles réutilisables pour la prochaine livraison.
- [Qualité](quality.md) : validations automatiques et recettes humaines.

## Contrats fonctionnels et techniques

| Domaine | Références |
| --- | --- |
| Architecture et données | [Architecture](architecture.md), [modèle actuel](data-model.md), [schéma et import](schema-import-clients.md) |
| Catalogues et kits | [Règles métier](catalogue-metier.md), [décisions de conception](catalogue-model-proposal.md), [API catalogues](catalogue-api.md), [API commandes](commandes-kit-api.md) |
| Interface | [Clientes](clients-ui.md), [catalogues et papiers](catalogue-ui.md), [commandes](commandes-ui.md) |
| Fournitures et comptabilité | [Stocks historiques](stocks.md), [workflow et Kanban](workflow-fournitures-api.md), [bilan](bilan-commandes.md) |
| Scénarios et suivi | [Recette métier](recette-metier.md), [suivi à qualifier](backlog.md) |

## Historique et confidentialité

Les [archives](archive/README.md) conservent les intentions v2 et la chronologie.
Les [recettes UI](ui/README.md) conservent les preuves datées, captures et scripts.
Les contrats courants ci-dessus et le code priment sur une variante historique.

Les fichiers `*.local`, configurations réelles NAS, données SQLite et secrets
restent hors Git. Une documentation ne prouve pas l’état de la base active ;
la tête de `main` ne remplace pas l’identification du commit effectivement livré.
