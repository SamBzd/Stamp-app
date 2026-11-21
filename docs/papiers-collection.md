# Papier de collection — #45

Sam confirme le 21 novembre 2026 la livraison de cette règle et de SQLite v5
sur le NAS, release `nas-f76400d846d6c56011efa06995335f71cf2bb098`.
Essai sur copie, migration réelle, conservation des données et sondes réussis.
Sam confirme ensuite le bon fonctionnement après vérification en production,
sans détailler individuellement tous les scénarios de recette ci-dessous.

## Règle et données

Chaque kit créé par l’application à partir de v5 ajoute **une feuille par
collection sélectionnée**, au nom historisé de la collection et au format
A, B ou C du kit. Le nom n’est pas celui d’un papier cartonné de la bibliothèque.
L’option à 3,50 € double uniquement les cinq feuilles cartonnées. Le prix de
base inclut les feuilles de collection.

| Format | Collections | Cartonnées | Collection | Total | Total avec option |
|---|---:|---:|---:|---:|---:|
| A ou B | 2 | 5 | 2 | 7 | 12 |
| C | 1 | 5 | 1 | 6 | 11 |

Ces totaux comptent les papiers de collection et cartonnés ; les matériaux
spéciaux du catalogue restent affichés séparément. Le formulaire, son édition
et le détail commande utilisent « Papier de collection » et « Papier cartonné ».

Le marqueur `commandes.papier_collection_inclus` vaut 0 pour toutes les commandes
présentes à la migration v5, réglées ou non. Il vaut 1 pour les nouveaux kits
créés par le serveur. Il n’est pas accepté en entrée API et reste inchangé
lors d’un `PUT`, même avec changement de catalogue. Une ancienne commande ne
reçoit donc jamais de feuille de collection à l’édition. Les hors-kit sont
inchangées.

Les feuilles de collection sont déduites des snapshots `commande_collections`
et du format de la commande. Aucun renommage ultérieur de source ne modifie
leur historique en lecture. Une édition non réglée recalcule les snapshots
selon le comportement existant.

## Fournitures

Les feuilles de collection utilisent le type `papier_collection`, avec
`format_type` A/B/C. Les cartonnées utilisent `papier_cartonne`, sans format
(`null`), et gardent leur regroupement historique. Une identité de fourniture
est `{type, nom, format_type}` : deux « Jardin » B de catalogues différents se
regroupent, un « Jardin » C est distinct. Les noms suivent la comparaison exacte
existante (casse et accents significatifs).

Le format figure sur les cartes, dans le choix de déplacement et les alertes.
Les déplacements et archivages ciblent le format choisi. L’édition réconcilie
les besoins : seuls les « À traiter » peuvent être retirés ; les unités engagées
ou archivées restent conservées, avec alerte si nécessaire. Les feuilles déjà
archivées ne sont pas régénérées. Voir [le contrat du workflow](workflow-fournitures-api.md).

## Migration v4 vers v5

`0005_papiers_collection.sql` ajoute le marqueur d’ancienneté et reconstruit les
deux tables du workflow pour distinguer les deux types et porter le format.
L’ancien type `papier_collection` désignait les feuilles cartonnées : il devient
`papier_cartonne` dans les unités **et** les alertes. Aucun besoin n’est créé.
Identifiants, relations, quantités, états, archives, dates, déduplication et
compteurs des IDs sont conservés. La migration est transactionnelle et les clés
étrangères restent activées. Le schéma neuf est aligné sur le résultat migré.
Aucun reset ni import de données n’est nécessaire.

### Essai sur une copie isolée

Faire d’abord une sauvegarde SQLite cohérente de la cible, puis une **copie de
travail** de cette sauvegarde. Avec le code candidat et ses dépendances :

```bash
STAMP_DB_PATH=/chemin/absolu/copie-travail.db npm run db:migrate:status --prefix backend
STAMP_DB_PATH=/chemin/absolu/copie-travail.db npm run db:migrate --prefix backend
STAMP_DB_PATH=/chemin/absolu/copie-travail.db node backend/scripts/migrate-db.js --require-current
```

Avant migration, vérifier la version v4 et la seule migration v5 en attente.
Après migration, contrôler `PRAGMA integrity_check` (= `ok`),
`PRAGMA foreign_key_check` (aucune ligne), version 5 et zéro migration en attente.
Comparer les nombres de commandes/unités/alertes avant et après, les états et
archives, les relations et les compteurs d’ID. Les anciens kits ont tous le
marqueur 0 et aucune unité `papier_collection` ne doit être ajoutée. Ne pas
publier le contenu de la copie ni les données clientes.

## Mise en service

Le précontrôle CD bloque cette release sur une base v4. Un merge ou une CI verte
ne suffit pas. La maintenance suit [le contrat CD](cd-nas.md#exploitation-courante)
et [la procédure SQLite](operations.md#base-sqlite), avec l’image candidate
exacte, jamais avec l’ancien backend.

1. Après validation et autorisation de livraison, relever la release candidate,
   ses deux images par digest, le Compose et le montage SQLite réellement
   utilisés. Suspendre le projet Stamp dans la configuration du déployeur
   (`enabled: false`) et attendre la fin de tout passage en cours. Les autres
   projets n’ont pas besoin d’être suspendus.
2. Valider l’essai ci-dessus sur copie avec l’image candidate. Arrêter les saisies
   et tous les écrivains SQLite, arrêter le backend et effectuer une nouvelle
   sauvegarde cohérente vérifiée. Conserver les images précédentes, le Compose,
   la surcharge d’images et l’état CD nécessaires à une restauration.
3. Exécuter explicitement `npm run db:migrate` dans un conteneur ponctuel de
   l’image backend **candidate**, relié au même montage et au même
   `STAMP_DB_PATH`. Son entrypoint doit être `npm` (ou `node`) pour éviter que
   le démarrage applicatif refuse la migration en attente. Contrôler ensuite
   `node scripts/migrate-db.js --require-current` et l’intégrité SQLite.
4. Basculer ensemble backend et frontend sur les deux digests de la release
   candidate, sans changer le montage. Vérifier révisions, santé API/interface,
   puis réaliser la recette ci-dessous avant de reprendre les saisies.
5. Après succès, archiver hors du dossier d’état le sous-dossier **Stamp seul**,
   comme prévu par la procédure CD, et réactiver le projet : le déployeur adopte
   la paire déjà en service. Confirmer la release effectivement active.

En cas d’échec après migration, garder les saisies et la CD suspendues. Les
anciennes images refusent la base v5 : le retour arrière exige la restauration
cohérente **base v4 + anciennes images**, pas seulement un changement d’images.
Après reprise des saisies, préserver les nouvelles données avant toute décision
de restauration. Les commandes NAS exactes demandent les chemins et digests
réels ; ce guide n’en invente pas.

## Recette

Les tests automatisés sur données synthétiques couvrent :

- A/B/C avec et sans option, quantités et prix, absence de marqueur modifiable
  par l’API ;
- regroupement entre catalogues, séparation B/C, déplacement partiel et
  archivage sans régénération ;
- changement de format/collection répété, conservation des unités engagées,
  alertes avec format et suppression ;
- édition d’un kit antérieur, y compris vers un autre catalogue, et hors-kit ;
- migration v4, commande réglée, unités archivées/anonymes, liens d’alertes,
  séquences d’ID et égalité entre schéma neuf et migré ;
- rendu réel des récapitulatifs et du détail commande, totaux et noms historisés.

Commandes : `npm run check`, `docker compose config --quiet`.

La [recette navigateur locale du 20 novembre](ui/recette-issue45/README.md)
vérifie création, édition, détail, déplacement Fournitures et récapitulatif à
largeur réduite sur des données synthétiques. Après migration NAS, répéter les scénarios
sur des saisies de recette convenues : « Jardin » et « Ciel » A/B (7 puis 12),
« Jardin » C (6 puis 11), mêmes noms B de deux catalogues, format C distinct,
changement de composition, ancien kit conservé sans feuille. Aucun résultat
sur données synthétiques ne constitue une preuve NAS.
