# Préparation de livraison NAS — issue #13

Préparation du 12 octobre 2026, complétée par une inspection du NAS en lecture
seule autorisée par Sam et une copie locale diagnostique de SQLite/WAL/SHM.
Aucune modification NAS, bascule ou mise à jour GitHub réalisée dans ce lot.
Les étapes de sauvegarde, import et bascule réels ci-dessous nécessitent leurs
autorisations explicites. Ce document est un plan à compléter, pas une recette
NAS réussie.

## Version et preuves disponibles

- [#12](https://github.com/SamBzd/Stamp-app/issues/12) est clôturée comme terminée.
- [PR #40](https://github.com/SamBzd/Stamp-app/pull/40) fusionnée le 12 octobre :
  commit d’intégration `b6a5f78f830f6f2eb0e80d77136b2fc90b2e0321`, candidat
  à figer après vérification de la tête actuelle de `main` et de sa CI.
- Tête UI testée localement : `d64f183b2f072f7d25e690b6e5a728ba6bb5a61a` ;
  [CI de PR réussie](https://github.com/SamBzd/Stamp-app/actions/runs/38252647423).
  Ce contrôle ne remplace pas celui du commit d’intégration.
- Le 13 octobre 2026, `main` local et GitHub sont confirmés sur
  `5400177e530805162af3c731867e6146c1480edf`, après fusion des PR #40 et #41.
  Le lot d’import est repris sur `codex/issue-13-finaliser-import` depuis cette
  base. Le candidat de livraison inclura ce lot après intégration et CI verte.
- Chrome est le navigateur cliente ; Zen est validé par Sam. Safari non testé
  et non bloquant. Les limites ciblées de la recette sont consignées dans
  [la validation UI](ui/validation-issue39.md), dont la section de clôture reste
  historique après fusion. La clôture GitHub n’établit pas une recette NAS.

## Informations à recueillir avant répétition réelle

| Information | État / preuve attendue |
| --- | --- |
| Modèle NAS, architecture CPU, DSM, Docker/Container Manager et Compose | DS218+, Intel Celeron J3355, 2 Go, DSM 7.1.1-42962 Update 9 observés ; paquet Docker, version moteur et Compose à confirmer, images à tester sur NAS |
| Code et images actuellement déployés | SHA si disponible, identifiants d’images, procédure de relance précédente |
| Lancement actuel | Projet Compose ou configuration Container Manager réelle |
| Base active et montages | `docker/stamp-app/Stamp-app/db` monté rw dans `/data/db` ; `DB_PATH=/data/db/app.db`, WAL/SHM présents ; emplacement absolu sur volume Synology et tous les écrivains à confirmer |
| Configuration | Frontend 5173→80, backend 3000→3000 ; Node 20.19.6 et Nginx 1.29.4 observés ; droits UID/GID et configuration complète à confirmer, secrets hors dépôt |
| Espace disponible | Ancienne base, sauvegardes, cible neuve, répétition et images coexistantes |
| Accès autorisé | Inspection navigateur en lecture seule et téléchargement diagnostique réalisés ; aucune écriture, sauvegarde distante ou bascule autorisée |
| Fenêtre de maintenance | Durée, disponibilité de Sam et décision de retour arrière |

Ne pas déduire ces valeurs de `db/app.db`, de la branche `production` seule ou
du Compose générique. Aucun nom de volume par défaut ne doit être pris pour
celui de la production.

## Stratégie retenue

Décision initiale de Sam du 12 octobre 2026 après inspection en lecture seule : convertir
uniquement les 20 dates de naissance vides en NULL avec l’option explicite
`--empty-birthdates-as-null` décrite dans le contrat d’import. Les cinq
anniversaires renseignés avec jour et mois sans année sont préservés en source
et restent bloquants pour l’import. Les autres champs facultatifs vides ne sont
pas normalisés dans ce lot. La copie téléchargée avec WAL/SHM pendant que
l’application fonctionnait est diagnostique ; elle ne remplace pas une
sauvegarde cohérente autorisée avant bascule. Aucune base cible créée à cette
étape initiale.

Validation de cette adaptation : 96 tests backend, 72 frontend et build
réussis, Compose et diff vérifiés. Un nouvel audit indépendant en lecture seule
par `gpt-6.1-sol medium` ne trouve aucun défaut démontré et exécute lui-même
la suite complète hors sandbox. Le précontrôle en lecture seule sur la copie
diagnostique avec l’option bloque toujours sur un anniversaire renseigné sans
année ; aucun import réel n’est exécuté. Ces preuves n’autorisent pas la bascule.

**Décision actuelle**, qui remplace la restriction initiale : Sam autorise
ensuite la mise à NULL de tout champ facultatif incompatible, dont les cinq
anniversaires renseignés sans année. Utiliser
`--invalid-optional-fields-as-null` pour le précontrôle et l’import. Les champs
obligatoires invalides, colonnes manquantes et doublons d’emails renseignés
restent bloquants. Voir les règles et exemples du contrat d’import.

### Base préparatoire locale créée

Après cette décision, une cible distincte est créée le 12 octobre 2026 depuis
la copie diagnostique : `/tmp/stamp-nas-read-7z0_fd8t/cible-preparatoire.db`.
Elle contient **25 clientes**, avec points à zéro et dernière commande NULL.
Les autres tables métier sont vides. Toutes les valeurs compatibles des onze
champs repris ont été comparées, pour chaque cliente, à la copie source.
Intégrité SQLite `ok`, aucune violation de clé étrangère ; empreintes des
trois fichiers source inchangées. Fichier privé (0600), dossier privé (0700),
hors dépôt et non destiné à être publié. Le dossier `/tmp` est temporaire.

Conversions à NULL : 25 dates de naissance, 6 téléphones, 6 relais préférés,
1 adresse, 1 code postal et 1 ville. La copie source conserve les valeurs
initiales ; aucune modification du NAS. Le rapport local
`target-verification.json` ne contient que des résultats agrégés.

Cette base permet la répétition ; elle **n’est pas une base de bascule finale**.
L’import devra être rejoué depuis une sauvegarde cohérente et actualisée après
arrêt autorisé des écritures. Validation du code actuel : 99 tests backend,
72 frontend et build réussis ; Compose et diff vérifiés. Sam demande l’arrêt
des audits pour ce lot ; aucun nouvel audit n’est lancé après cette demande.

Conserver l’ancien code, ses images, sa configuration et sa base ensemble.
Créer un volume cible distinct et une base neuve avec les seules clientes.
Ne pas migrer en place la base historique : les migrations de `main` ne sont
pas une conversion de la production. Ne pas utiliser les scripts de reset.

Champs repris : `nom`, `prenom`, `date_naissance`, `adresse`, `code_postal`,
`ville`, `email`, `telephone_raw`, `relais_prefere`, `contacter`, `created_at`.
Identifiants recréés, colonnes générées recalculées ; `derniere_commande = NULL`,
`points_fidelite = 0`, `archive = 0`. Aucune commande, catalogue, collection,
matière, fourniture, alerte, stock ou bilan historique repris. Les paramètres
prennent les valeurs du schéma neuf ; leurs tarifs seront confirmés par Sam.
Voir [le contrat d’import](schema-import-clients.md).

## Répétition préalable sur copie contrôlée

1. Dans le périmètre autorisé, inventorier les montages et les écrivains.
   Faire accepter l’arrêt temporaire nécessaire à une copie cohérente ; une
   autorisation d’inspection seule ne l’autorise pas.
2. Arrêter tous les accès à SQLite. Produire une sauvegarde SQLite cohérente
   hors du volume actif par l’API backup, ou une procédure de copie arrêtée
   validée tenant compte du WAL. Ne jamais copier seulement `app.db` si un WAL
   contient des écritures non intégrées, ni supprimer les WAL/SHM à la main.
3. Conserver cette sauvegarde intacte avec empreinte SHA-256, date et version
   précédente. Vérifier `PRAGMA integrity_check` (`ok`) et
   `PRAGMA foreign_key_check` (aucune ligne, sinon anomalie à qualifier).
   Travailler sur une deuxième copie privée ; aucune coordonnée dans les logs GitHub.
4. Inspecter le schéma réel, vérifier les colonnes requises, compter les
   clientes et exécuter le précontrôle ci-dessous. Le contrôle de doublons porte
   sur `lower(trim(email))` SQLite (ASCII), pas sur le nom ou le téléphone.
   Valeurs vides/invalides ou doublons : arrêt, rapport sans coordonnées et
   décision de Sam avant toute correction de la copie ; aucune fusion implicite.
5. Importer vers un nom de fichier absent. Vérifier intégrité, clés étrangères,
   égalité des nombres, conservation des champs repris sur un échantillon
   autorisé, valeurs remises à zéro et toutes les tables métier vides.
   Seuls `clients`, `settings`, `schema_migrations` et les tables internes SQLite
   peuvent contenir des lignes à ce stade.
6. Restaurer une copie de la sauvegarde dans un environnement isolé avec les
   anciennes images et configuration. Vérifier démarrage, clientes et historique
   précédent ; consigner le résultat. Une intégrité SQLite seule ne prouve pas
   que l’ancienne application fonctionne après restauration.
7. Tester la nouvelle version conteneurisée avec un projet, port et volume
   séparés. `STAMP_VOLUME_NAME` doit être explicitement distinct : changer
   seulement le nom de projet Compose n’isole pas ce volume nommé.
   Placer la cible vérifiée à `/data/app.db` dans ce volume avant le premier
   démarrage ; confirmer sa présence et les droits de l’utilisateur `node`.
   Un volume vide serait initialisé sans clientes par le backend.
8. Vérifier les deux services, `/api/health`, accès frontend à `/api`, liens
   profonds, puis commande kit/hors-kit, règlement, workflow Fournitures et bilan.
   Faire les mutations uniquement dans la répétition ; consigner montants et
   quantités attendus. Garder une cible d’import intacte pour les contrôles.

Commandes d’import depuis le checkout **du commit retenu**, sur chemins privés
à remplacer et fichier cible absent :

```bash
node backend/scripts/import-clients.js --source /copies/source-controlee.db --target /copies/cible-neuve.db --invalid-optional-fields-as-null --check
node backend/scripts/import-clients.js --source /copies/source-controlee.db --target /copies/cible-neuve.db --invalid-optional-fields-as-null
STAMP_DB_PATH=/copies/cible-neuve.db node backend/scripts/migrate-db.js --status
```

Le statut doit confirmer la version courante et aucune migration en attente.
L’import exige que le répertoire cible autorise les liens physiques. Les
commandes NAS de sauvegarde, copie, montage et restauration seront écrites avec
les cibles effectivement identifiées avant toute autorisation de bascule.

## Bascule après autorisation distincte

1. Figer le commit, les images et la configuration testés ; obtenir l’accord
   de Sam sur le créneau et les preuves de répétition, import et restauration.
2. Arrêter tous les écrivains de l’ancienne version. Refaire une sauvegarde
   finale cohérente et les contrôles : la copie de répétition peut être périmée.
3. Refaire précontrôle et import depuis cette copie finale vers une nouvelle
   cible absente ; répéter les comparaisons et contrôles avant démarrage.
4. Installer uniquement cette cible dans le nouveau volume, vérifier les droits
   et démarrer les images figées. L’ancien volume reste conservé et arrêté.
5. Contrôler santé, clientes et absence d’historique importé ; vérifier les
   paramètres. Valider le frontend dans Chrome avec Sam avant de rouvrir les
   saisies réelles. Toute commande de démonstration reste dans l’environnement jetable.
6. Consigner version, date, rapports de nombres, intégrité, tests et incidents
   sans données personnelles. Ne déclarer livré qu’après ces preuves.

## Arrêt et retour arrière

Arrêt immédiat si la cible/volume est ambigu, la sauvegarde n’est pas restaurable,
un contrôle échoue, des conflits restent ouverts, l’image est incompatible,
les droits SQLite échouent ou le parcours conteneurisé ne passe pas.
Ne pas appliquer une correction improvisée sur la production.

Avant réouverture des écritures : arrêter la nouvelle version, conserver la
cible échouée pour diagnostic et remettre **ensemble** l’ancien code/images,
configuration et volume intact (ou copie restaurée testée). Vérifier santé et
parcours de l’ancienne version avant réouverture, avec accord de Sam.
Après reprise des saisies réelles : arrêter les écritures et sauvegarder aussi
la nouvelle base ; présenter à Sam les saisies qui seraient perdues et décider
leur traitement avant retour arrière. Aucune migration descendante automatique.

## État des validations de cette préparation

La suite d’import inclut maintenant une répétition synthétique par les vrais
processus CLI : backup SQLite, contrôle d’intégrité, précontrôle sans création,
import, source inchangée, validation de démarrage du schéma, tables métier vides
et relance refusée. Elle ne teste pas la restauration avec l’ancien code NAS.

Résultats locaux du 12 octobre 2026 :

- `npm run check` : **94 tests backend, 72 frontend et build réussis** après
  ajout du test CLI. L’accès hors sandbox est nécessaire aux API temporaires
  et sous-processus Node ; l’échec initial en sandbox ne démontre pas un défaut produit.
- `docker compose config --quiet` et `git diff --check` réussis.
- Audit indépendant en lecture seule par `gpt-6.1-sol medium`, remplacement
  de Terra indisponible autorisé par Sam : aucun défaut démontré. L’auditeur
  reproduit une limite sandbox `spawnSync EPERM` ; les validations hors
  sandbox réalisées par Jarvis passent. Suggestion facultative (2/5), non
  appliquée : vérifier `result.error` avant `status` pour mieux diagnostiquer
  ce refus dans le nouveau test.

### Répétition Docker locale

Images dédiées construites depuis la tête UI `d64f183` avec le test ajouté ;
aucun changement du code applicatif ou du schéma. Projet
`stamp-issue13-repetition`, volume neuf `stamp-issue13-repetition-20261012`,
port **127.0.0.1:18083**, images `stamp-issue13-backend:20261012` et
`stamp-issue13-frontend:20261012`. Les conteneurs habituels ne sont pas modifiés.

Une source fictive contient une cliente, 42 points et une ancienne commande.
Précontrôle puis import CLI vers un fichier absent : une cliente, zéro point,
dernière commande NULL, aucune ancienne commande/catalogue. La cible importée
est installée dans le volume neuf avant le démarrage, via un conteneur ponctuel
`node` et une création de fichier `wx` (sans écrasement).
Les deux services deviennent healthy. Depuis le port frontend, Nginx sert la
page d’accueil, la route profonde `/catalogues` et relaie `/api/health`.
Identifiants d’images construits : backend
`sha256:d85301b8b61859d4a4ac8211dbf5abd8a2730ad8649602a74a9a0f820a60166e`,
frontend `sha256:a65eabb387ba0a4f7bb430f31324270a73ad0327aa5a4652687e2436382063e3`.

| Parcours API via Nginx | Résultat vérifié |
| --- | --- |
| Catalogue publié, format C, un papier | Kit à 3 525 centimes, cinq feuilles |
| Stocks historiques | Cinq feuilles pour ce papier |
| Fournitures | Cinq unités ; déplacement de deux vers Commandé réussi |
| Hors-kit | 80 €, un point de fidélité ajouté après création |
| Bilan avant règlement | Zéro centime |
| Règlement des deux commandes | Bilan octobre 2026 : 11 525 centimes |
| Suppression du kit réglé | Refus HTTP 409 |

Cette répétition vérifie les API conteneurisées et le routage HTTP ; elle ne
prouve ni l’interaction Vue dans Chrome, ni l’architecture CPU du NAS, ni la
restauration de l’ancien déploiement. Les parcours navigateur restent ceux des
recettes UI versionnées. La base installée a été mutée uniquement pour cette
répétition ; le fichier d’import initial est conservé séparément.

À l’arrêt demandé par Compose, le frontend sort avec code 0, le backend avec
code 137 après le délai d’arrêt. La cause n’est pas analysée dans ce lot.
Un conteneur ponctuel relit ensuite la base : `integrity_check = ok`, aucune
violation de clé étrangère et deux commandes fictives conservées. Ce résultat
ne prouve pas un arrêt gracieux ; la procédure d’arrêt et de sauvegarde SQLite
sur NAS reste à vérifier, sans supposer que le seul arrêt du service suffit.

Artefacts locaux non versionnés : `/tmp/stamp-issue13-repetition/` contient
source fictive, cible importée intacte, scripts de génération/parcours,
override Compose, rapport JSON, journaux de build et conteneurs. Les images,
conteneurs arrêtés et volume fictif sont conservés pour inspection ; ils ne
constituent pas un environnement livré. Les preuves synthétiques pourront
être rejouées avec des noms neufs ; réutiliser la cible d’import est refusé.

Restent requis avant livraison : intégration du lot d’import et CI du
commit de livraison, informations NAS à vérifier ensemble avec Sam, copie
réelle autorisée, restauration de l’ancienne version et répétition adaptée au
NAS. L’issue #13 demeure ouverte ; aucune case NAS n’est considérée acquise.

## Finalisation du lot d’import — 13 octobre 2026

Le lot est repris depuis `main` à `5400177` sur une branche dédiée.
`npm run check` réussit : 99 tests backend, 72 frontend et build Vue.
`docker compose config --quiet` et `git diff --check` réussissent.
La suite complète a été exécutée hors sandbox après échec de plusieurs
processus de tests dans le sandbox ; aucune base réelle n’a été utilisée
pour ces validations. La répétition NAS et la restauration restent ouvertes.
