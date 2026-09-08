# Modèle de données et règles métier v2

## Entités principales

- `clients` : coordonnées, préférences et points de fidélité.
- `catalogues` : un catalogue mensuel, avec papier spécial et embellissement.
- `collections` et `collection_papiers` : collections d'un catalogue et leurs papiers cartonnés issus de la bibliothèque globale `papiers_cartonnes`.
- `commandes` : commande `kit` ou `hors_kit`.
- `commande_collections` et `commande_papiers_selectionnes` : composition figée d'un kit au moment de sa création.
- `settings` : prix globaux des formats A, B et C.

## Composition d'un catalogue

Un catalogue métier comporte 3 ou 4 collections. Une collection prête à vendre comporte 5 papiers cartonnés. Le titre suit le format `Mois YYYY`.

## Commandes kit

- Les formats A et B utilisent deux collections distinctes du même catalogue : l'une contribue 2 papiers, l'autre 3.
- Le format C utilise une seule collection et ses 5 papiers.
- Chaque kit inclut un papier spécial et un embellissement issus de son catalogue.
- L'option papier supplémentaire double la quantité de chaque papier cartonné et ajoute 3,50 €.

## Commandes hors kit et fidélité

Une commande hors kit porte un montant et peut avoir un cadeau. Un montant strictement supérieur à 70 € attribue un point de fidélité. Toute création, modification ou suppression susceptible d'affecter ce total doit préserver la cohérence des points.

## Stock et comptabilité

Les stocks sont calculés à la volée depuis les commandes. Le bilan mensuel ne compte que les commandes réglées et utilise la date enregistrée de la commande.

Les règles ci-dessus constituent le contrat métier cible. Leur application côté API est suivie dans le [backlog](backlog.md).
