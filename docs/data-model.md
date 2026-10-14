# Modèle de données actuel

Source technique : [db/schema.sql](../db/schema.sql) et les migrations versionnées.
Cette synthèse décrit le socle livré le 14 octobre 2026 ; le schéma d’une autre
référence Git ne prouve pas celui d’une base NAS. Les intentions initiales sont
conservées dans [l’archive v2](archive/data-model-v2.md).

## Entités

| Tables | Responsabilité |
| --- | --- |
| `clients` | Coordonnées, préférences, fidélité, archivage et colonnes normalisées |
| `settings` | Tarifs A/B/C par défaut en centimes, copiés à la création d’un catalogue |
| `papiers_cartonnes` | Bibliothèque globale, noms normalisés uniques, archivage protégé |
| `catalogues`, `collections`, `collection_papiers`, `catalogue_rubans` | Sources des compositions et tarifs locaux |
| `commandes` | Kit/hors-kit, paiement, règlement, prix appliqué et matériaux historisés |
| `commande_collections`, `commande_papiers_selectionnes`, `commande_rubans` | Composition autonome : noms et quantités figés |
| `fourniture_unites`, `fourniture_alertes` | Workflow physique persistant et écarts anonymes |
| `schema_migrations` | Version et empreintes des migrations appliquées |

## Invariants métier

Un catalogue publiable a un nom libre, au moins un papier spécial ou un embellissement,
une à quatre collections de un à cinq papiers, et zéro à deux rubans. Un
brouillon peut être incomplet ; sa publication est explicite. La perte d’un
minimum le démote, le dépassement d’un maximum annule la mutation.

A/B utilisent deux collections distinctes, contributions deux et trois.
C utilise une collection, chaque papier au moins une fois, pour cinq feuilles.
L’option de 3,50 euros double les papiers seulement. Ruban et autres matériaux
ne sont pas doublés. Les règles détaillées sont dans [le contrat métier](catalogue-metier.md).

Les montants kit et les résultats du bilan sont des entiers en centimes.
Le contrat hors-kit conserve son montant en euros. Les tarifs du catalogue
et désignations source ne doivent pas réécrire une commande historique.

Une commande non réglée est modifiable ou supprimable. Le règlement dédié
conserve son prix puis la rend immuable ; les triggers protègent aussi ses
lignes de composition. Voir [le contrat commandes](commandes-kit-api.md).

Les stocks historiques lisent les compositions conservées, réglées ou non.
Le workflow opérationnel suit séparément chaque unité dans cinq états ; il
réconcilie les changements de besoin sans effacer les unités déjà engagées.
Le bilan additionne uniquement les commandes réglées sur leur mois enregistré.

La fidélité historique attribue un point à la création d’une hors-kit de plus
de 70 euros ; édition et suppression ne la recalculent pas. Une évolution
de cette règle exige une décision métier distincte.

## Schéma, import et migrations

Le schéma neuf correspond à la version courante des migrations. Une migration
appliquée est immuable ; une base incompatible ou en attente bloque le démarrage.

La bascule initiale a importé uniquement les clientes dans une cible neuve,
avec points zéro et dernière commande NULL. Aucune conversion en place des
anciennes données métier n’a été faite. Voir [schéma et import](schema-import-clients.md)
et [la livraison](livraison-nas.md).
