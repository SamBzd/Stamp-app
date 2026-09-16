# Migrations SQLite

Les fichiers SQL de ce dossier décrivent, dans l'ordre, les évolutions d'une
base existante de `main`.

- Utiliser le numéro séquentiel suivant, par exemple `0003_description.sql`.
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
L'initialisation d'une base neuve avec les seules clientes est décrite dans
[la procédure d'import](../../docs/schema-import-clients.md).
