# Schéma cible et import clientes — issue #5

Le schéma versionné `0002_catalogue_target.sql` prépare les lots métier suivants.
Le fichier `db/schema.sql` décrit exactement la même structure pour une base
neuve. La baseline `0001_main_baseline.sql` reste immuable. Cette procédure
n'autorise aucune intervention sur le NAS ni sur `db/app.db` ; la répétition
sur copie contrôlée de production appartient à l'issue #13.

## Structure livrée

- `settings` stocke trois entiers entre 0 et 10 000 centimes :
  `prix_catalogue_A_cents`, `prix_catalogue_B_cents`, `prix_catalogue_C_cents`.
  Les valeurs neuves sont 3 500, 4 000 et 4 500.
- `catalogues` reçoit `statut` (`brouillon` par défaut ou `publie`), `archive`,
  et `prix_A_cents`, `prix_B_cents`, `prix_C_cents`. Un brouillon peut laisser
  ses tarifs à NULL ; un catalogue publié exige les trois tarifs.
- Seuls `clients` et `catalogues` possèdent `archive` (0 ou 1).
- `catalogue_rubans` contient les rubans source, avec un ordre unique 1 ou 2
  dans chaque catalogue. Les ordres uniques limitent aussi à quatre collections
  et cinq papiers différents par collection.
- `commandes` conserve `catalogue_id`, `catalogue_titre`, les tarifs de format
  et option, `prix_applique_cents`, `prix_origine` (automatique/manuelle), les
  désignations et quantités du papier spécial et de l'embellissement, ainsi que
  les libellés et montants en centimes des suppléments promo et autres.
- `commande_collections` conserve source, nom figé et contribution 2/3/5.
  `commande_papiers_selectionnes` référence **cette ligne de collection** via
  `commande_collection_id`, avec source papier, `papier_nom`, `quantite_base`.
  Un même papier peut donc contribuer dans deux collections du même kit.
  `commande_rubans` conserve source, nom figé et quantité 1 du ruban retenu.
- Les références source et cliente utilisent `ON DELETE RESTRICT`. La
  connexion applicative active les clés étrangères. Supprimer une commande
  non réglée entraîne la suppression de sa composition dans la même opération.
  Les triggers refusent toute modification ou suppression d'une commande réglée
  et toute mutation de ses lignes de composition.

Les règles de publication sont validées par [l’API catalogues](catalogue-api.md)
du lot #6. La composition complète A/B/C et le choix du ruban seront validés
par le lot commandes #7. Ces règles ne se déduisent pas des seuls CHECK SQL. Une commande doit être construite non réglée avec sa composition avant de
passer à l'état réglé.

## Transition applicative

L’API paramètres/catalogues utilise maintenant uniquement les champs
`prix_A_cents`, `prix_B_cents`, `prix_C_cents`, avec des nombres entiers en
centimes. Le frontend conserve encore son ancien contrat en euros : son
adaptation reste dans les lots UI #8/#9 ; le build seul ne valide pas ces
parcours. Voir [le contrat API #6](catalogue-api.md).
Les lectures commandes et stocks sont adaptées à la relation papier/ligne de
collection, et le bilan lit le montant appliqué mémorisé.
Le détail d'un kit expose aussi `ruban` (objet contenant `ruban_id`, `ruban_nom`
et `quantite`, ou NULL), lu exclusivement depuis son snapshot.

La création de kits par l'ancien contrat v2 est explicitement refusée (`409`) :
elle ne peut pas produire les snapshots requis. Le futur parcours kit sera
livré dans son lot. Ce lot est un socle de développement, pas une version
prête à déployer. Les champs et la règle de fidélité hors-kit sont conservés.
Les anciens endpoints DELETE des clientes, catalogues et collections (y compris
la route historique `/api/collections/:id`) répondent `405` et ne suppriment
aucune ligne, même sans référence. Les endpoints d’archivage/restauration
clientes et catalogues sont disponibles en #6 : corps `{ archive: boolean }`,
conservation des données et restauration sans publication automatique.
Le règlement reste accessible par le contrat PUT historique pour les commandes
non réglées pendant cette transition. Son remplacement par
`PATCH /api/commandes/:id/reglement` et le refus de `reglee` dans PUT relèvent
explicitement de l'issue #7. Les triggers bloquent déjà toute modification
ultérieure et empêchent le retour d'une commande réglée vers non réglée.

## Migration d'une base locale compatible

Choisir une copie de travail sauvegardée et arrêter les processus qui y accèdent.
La commande de statut ouvre cette copie en lecture seule :

```bash
STAMP_DB_PATH=/chemin/copie-main.db node backend/scripts/migrate-db.js --status
STAMP_DB_PATH=/chemin/copie-main.db node backend/scripts/migrate-db.js
```

La version 2 accepte les clientes existantes et les anciens tarifs par défaut
valides ; elle conserve notamment les points de fidélité locaux. Les tarifs en
euros sont convertis exactement au centime. Les clés absentes prennent les
valeurs initiales du schéma ; une clé inconnue ou une valeur invalide bloque
la migration.

**Toute donnée métier existante** (papier de bibliothèque, catalogue, collection,
composition ou commande, y compris hors-kit) bloque la migration. Aucune
commande n'est reconstituée et aucune donnée n'est supprimée. La transaction
annule la modification de structure et l'enregistrement de version en cas
d'échec. Le contrôle de compatibilité refuse également tout schéma dégradé.

Dans ce cas, conserver l'ancienne base et créer un **nouveau fichier cible** par
l'import ci-dessous. Ne pas lancer `db:dev:reset` ou `reset_v2.js` pour résoudre
ce refus. Une base de développement absente peut toujours être initialisée par
`npm run db:dev:init` ; une base existante n'est pas remplacée par cette commande.

## Précontrôle et import vers un nouveau fichier

L'outil reçoit une **copie SQLite cohérente et arrêtée** de la source, jamais
le fichier vivant du NAS. Il lit uniquement les clientes, en lecture seule.
L'initialisation du schéma cible et de son historique est intégrée à l'import.

```bash
node backend/scripts/import-clients.js --source /copies/source.db --target /copies/cible-neuve.db --check
node backend/scripts/import-clients.js --source /copies/source.db --target /copies/cible-neuve.db
```

La commande est aussi disponible via `npm run db:clients:import --prefix backend --`.
La cible doit être absente ; une cible déjà créée, même vide, n'est jamais
écrasée. Le précontrôle n'écrit aucune base. L'import prépare un fichier
temporaire dans le même répertoire que la cible, importe dans une transaction,
vérifie le schéma puis publie le fichier sans écrasement. Un échec ne laisse
pas de cible partiellement importée. Le répertoire doit permettre les liens
physiques locaux et disposer d'espace pour cette nouvelle base.

Champs repris : `nom`, `prenom`, `date_naissance`, `adresse`, `code_postal`,
`ville`, `email`, `telephone_raw`, `relais_prefere`, `contacter`, `created_at`.
Les identifiants sont recréés ; les champs techniques générés `email_norm` et
`telephone_e164` sont recalculés. `derniere_commande` devient NULL,
`points_fidelite` et `archive` deviennent 0. Les champs supplémentaires source,
ses tables métier et ses commandes ne sont pas repris.

Les noms et prénoms doivent être des textes non vides ; les champs optionnels
sont des textes non vides ou NULL. `date_naissance` est une date valide
`YYYY-MM-DD` ou NULL ; `created_at` est un horodatage ISO valide ; `contacter`
est l'entier 0 ou 1. Aucune valeur vide ou ambiguë n'est corrigée silencieusement.
Les doublons d'email suivent exactement la normalisation SQLite
`lower(trim(email))` du schéma (ASCII, pas de normalisation Unicode ajoutée).
Plusieurs emails NULL sont permis ; aucun rapprochement par nom/téléphone
n'est effectué. Le refus indique le numéro de ligne et le champ, sans publier
les coordonnées. Le rapport de succès indique le nombre de clientes importées.

## Sauvegarde, contrôle et retour arrière

Avant une opération autorisée ultérieurement, arrêter l'application et créer
une sauvegarde SQLite cohérente (API SQLite backup ou copie après arrêt et
résolution des fichiers WAL). Vérifier que cette sauvegarde s'ouvre et que
`PRAGMA integrity_check` retourne `ok`. Conserver l'ancienne base et les fichiers
de configuration de la version précédente hors du volume actif.

Après import, comparer le nombre de clientes, vérifier un échantillon de champs
sur la copie contrôlée et confirmer l'absence de commandes/catalogues. La
validation sur données réelles et la bascule seront réalisées en #13. Une
relance vers la même cible est refusée ; pour une répétition, choisir un autre
nom de fichier. En cas d'échec de migration, conserver la version précédente ;
en cas d'échec après bascule, remettre la sauvegarde avec le code correspondant.
Il n'existe pas de migration descendante ni de reset automatique.
