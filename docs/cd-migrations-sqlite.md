# Migrations SQLite automatiques

Cette évolution est préparée localement ; elle n'est pas encore installée sur
le NAS. La livraison #45/Sauge et la migration v5 du 21 novembre 2026 ont été
réalisées en maintenance contrôlée avec le déployeur précédent.

## Résultat attendu

Après le raccordement initial ci-dessous, publier une release approuvée suffit,
y compris lorsqu'elle contient une migration SQLite. La tâche DSM garde sa
fréquence actuelle. Les projets sans `sqlite_migrations` gardent leur circuit.
Les preuves Actions, les workflows autorisés et les deux images par digest
restent vérifiés avant toute maintenance.

Pour une migration, le déployeur ferme temporairement les accès métier de
l'API par un fichier persistant `.stamp-maintenance` à côté de la base. La sonde
`/api/health` reste disponible et indique `deploymentMaintenance.supported`
et `active`. Les lectures métier sont aussi fermées, afin qu'aucune route ne
puisse modifier indirectement les données pendant la validation.

Le déployeur arrête la paire, désactive sa relance Docker pendant la maintenance,
effectue une sauvegarde SQLite cohérente et vérifiée, répète les migrations sur
une copie, puis migre la base réelle. Il démarre et sonde les deux images avec
les accès toujours fermés. L'état actif est enregistré durablement **avant**
de rouvrir les saisies.

## Installation unique, après revue et autorisation

1. Après revue, approuver sur le NAS la nouvelle empreinte de `ci.yml`, qui
   ajoute la recette Docker à la validation de chaque release. Les deux autres
   workflows restent inchangés. Livrer une release sans changement de schéma contenant le backend
   compatible : `maintenance.js`, le garde HTTP et `scripts/cd-sqlite.js`.
   Ne pas activer l'option avec une ancienne image : elle est refusée avant
   tout arrêt. Cette première livraison emprunte le circuit CD habituel.
2. Suspendre Stamp, attendre la fin de son passage, sauvegarder les fichiers
   du déployeur puis installer **ensemble**, depuis le même commit validé,
   `deploy/nas_cd.py` et `deploy/sqlite_cd.py` dans son dossier administrateur.
   Conserver les droits administrateur et empêcher les écritures groupe/autres.
   Les anciens drivers ponctuels épinglent l'ancien déployeur : ne pas les
   réutiliser pour cette installation.
3. Ajouter à Stamp dans `projects.json`, puis réactiver le projet :

   ```json
   "sqlite_migrations": {
     "service": "backend",
     "database_path": "/data/app.db"
   }
   ```

   Conserver `preflight`, la liste des workflows approuvés, les sondes et tous les autres
   projets. Les commandes et empreintes NAS seront données avec le commit
   effectivement autorisé, pas avec une branche mobile.
4. Vérifier un passage ciblé, puis le passage DSM normal. Les futures releases
   compatibles utilisent ensuite le circuit automatique.

## Périmètre et sauvegardes

La première version cible la configuration réelle de Stamp : une seule instance
par service, un bind inscriptible vers `/data`, `STAMP_DB_PATH=/data/app.db`,
UID 1000 dans les images, aucun autre écrivain SQLite. Un volume nommé ou un
autre chemin est refusé ; cela évite de migrer une cible supposée. Les processus
hôte doivent aussi respecter l'usage exclusif de cette base par Stamp.

Les sauvegardes privées restent dans `state/<projet>/backups/<identifiant>/` :
état précédent, Compose, `data/before.db`, copie de répétition et, si nécessaire,
base en échec avec ses journaux. Leur empreinte est enregistrée et vérifiée avant
restauration. Les fichiers et l'arborescence sont synchronisés sur disque avant
la migration réelle. Elles ne sont jamais envoyées à GitHub ni effacées automatiquement.
Prévoir l'espace disque ; une marge est contrôlée avant la maintenance.

## Échec et reprise

Avant le commit d'activation, une erreur restaure la base sauvegardée et la
paire précédente, puis rouvre les accès après les sondes. La release est rejetée
et n'est pas retentée sans `--retry`. Si la restauration ou les sondes de retour
échouent, l'état de maintenance reste présent pour une nouvelle reprise ; ne
pas enlever le garde à la main.

Après le commit d'activation, une reprise termine uniquement la nouvelle
release. Elle ne restaure jamais une sauvegarde qui pourrait effacer de nouvelles
saisies. Le même principe s'applique au commit du retour arrière.

Le ticket, les phases et l'empreinte de la sauvegarde sont enregistrés dans
`state.json`. Au passage suivant, un conteneur ponctuel laissé par une coupure
est arrêté avant la reprise. Une modification du Compose, du montage ou de la
configuration de maintenance bloque la reprise automatique et exige une
inspection. Une panne disque persistante peut donc laisser l'application en
maintenance ; l'automatisation ne promet pas de réparer un support défaillant.

## Validation

`npm run check`, `docker compose config --quiet` et les tests `deploy/tests`
couvrent le contrat HTTP, le ticket propriétaire, le refus d'une base absente,
les transitions durables et la conservation des saisies après activation.
La recette Docker sur données synthétiques est décrite dans
[le guide d'intégration](../deploy/tests/integration/README.md).
