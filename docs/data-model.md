# Modèle de données repris dans `main`

> Ce document restitue les règles encodées ou visées par la refonte v2, désormais reprise comme fondation de `main`. Il ne définit pas le comportement actuel de la production. Ces règles devront être revalidées avant le futur déploiement.

Les nouvelles règles validées pour les catalogues et kits sont décrites dans
[catalogue-metier.md](catalogue-metier.md), avec leurs scénarios d'acceptation.
Elles remplacent les intentions v2 contradictoires ci-dessous pour la prochaine
implémentation, sans prétendre être déjà présentes dans le schéma ou le code.

## Entités principales

- `clients` : coordonnées, préférences et points de fidélité.
- `catalogues` : un catalogue mensuel, avec papier spécial et embellissement.
- `collections` et `collection_papiers` : collections d'un catalogue et leurs papiers cartonnés issus de la bibliothèque globale `papiers_cartonnes`.
- `commandes` : commande `kit` ou `hors_kit`.
- `commande_collections` et `commande_papiers_selectionnes` : collections, contributions et identifiants des papiers d'un kit. Le modèle actuel ne conserve pas de quantité par papier ni un historique autonome de toutes les désignations et matériaux.
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

Les règles ci-dessus constituaient le contrat métier cible de la v2. Elles restent des hypothèses de travail pour `main` jusqu'à leur validation. Les écarts observés sont consignés dans les [constats techniques](backlog.md).
