# Migrations SQLite

Les fichiers SQL de ce dossier décrivent, dans l'ordre, les évolutions d'une
base existante de `main`.

- Utiliser le numéro séquentiel suivant, par exemple `0004_description.sql`.
- Ne jamais modifier ni renommer une migration déjà appliquée.
- Mettre à jour `db/schema.sql` dans le même changement : il représente l'état
  final attendu pour une base neuve.
- Écrire chaque migration pour qu'elle s'exécute dans une transaction SQLite.
- Tester d'abord sur une copie de la base concernée.

L'option CLI `--migrations-dir` sert aux tests isolés avec une chaîne temporaire.
Elle ne doit pas remplacer le dossier versionné du projet en exploitation.

`0001_main_baseline.sql` est la photographie immuable du schéma de départ. Une
base sans historique ne reçoit cette version que si toute sa structure lui
correspond exactement. Elle ne convertit pas la base historique du NAS vers le
schéma de `main`.

`0002_catalogue_target.sql` prépare le modèle catalogues/kits et convertit les
tarifs par défaut en centimes. Elle refuse toute donnée métier ancienne non
convertible sans inventer d'historique ; les clientes locales sont conservées.
`0003_papiers_library.sql` ajoute l’archivage des papiers et une contrainte
d’unicité SQLite sur le nom sans distinction de casse ASCII ni d’espaces externes.
Avant son application, le migrateur vérifie aussi les noms avec la même
normalisation Unicode française que l’API. Une copie contenant déjà deux noms
équivalents est refusée sans modification.
`0004_workflow_fournitures.sql` ajoute les unités physiques et leurs alertes
persistantes. La migration ne reprend aucune commande existante : une ancienne
commande kit n’est synchronisée qu’à son premier `PUT`. Les créations suivantes
génèrent immédiatement leurs unités « À traiter ».
L'initialisation d'une base neuve avec les seules clientes est décrite dans
[la procédure d'import](../../docs/schema-import-clients.md).
