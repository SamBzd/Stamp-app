# Décisions de conception — catalogues et kits

L’issue #4 a fixé le socle : catalogue à nom libre, prix par catalogue,
compositions A/B/C et snapshots autonomes, règlement dédié, archivage et
reprise exclusive des clientes. Ce socle a été implémenté puis livré le
14 octobre 2026 ; les lots bibliothèque et workflow l’ont complété.

L’[archive intégrale de l’issue #4](archive/catalogue-model-issue4.md) conserve
la proposition, ses alternatives et ses contrats initiaux. Elle ne définit
pas à elle seule les endpoints actuels.

Pour travailler sur la version livrée :

- [règles métier](catalogue-metier.md) et [modèle actuel](data-model.md) ;
- [schéma, migrations et import](schema-import-clients.md) ;
- [API catalogues et bibliothèque](catalogue-api.md) ;
- [API commandes](commandes-kit-api.md), [workflow](workflow-fournitures-api.md)
  et [bilan](bilan-commandes.md).

Les anciens catalogues et commandes n’ont pas été convertis en place. Les
clientes ont été importées vers une cible neuve selon la décision confirmée.
