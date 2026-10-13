# Préparation de livraison NAS — issue #13

## État au 13 octobre 2026

La collecte technique, le test de restauration de l’ancienne application et
la recette ciblée de la nouvelle version sur NAS sont terminés. Les actions
NAS ont été effectuées par Sam sous guidage ; les résultats proviennent des
sorties qu’il a transmises et de ses confirmations manuelles.

La production n’a pas été remplacée. Les conteneurs de test sont arrêtés et
Sam confirme la désactivation de SSH après les essais. Les copies et images
sont conservées pour la suite. L’inventaire technique détaillé, les chemins
réels et les preuves opérationnelles restent exclusivement dans une note
locale exclue de Git. Ce document partage uniquement la synthèse et la méthode.

## Version retenue

- La recette métier #12 et les lots UI sont intégrés à `main`.
- Le lot d’import est intégré par [PR #42](https://github.com/SamBzd/Stamp-app/pull/42).
- Le commit applicatif testé sur NAS est
  `6cc981766bdff0a298812508ff3974c9bfef0cef`.
- La [CI après fusion](https://github.com/SamBzd/Stamp-app/actions/runs/38422337417)
  réussit. Validation locale du lot : 99 tests backend, 72 frontend, build Vue,
  configuration Docker Compose et contrôle du diff réussis.
- Les images construites depuis ce commit ont été transférées avec comparaison
  des empreintes SHA-256, puis chargées et exécutées sur le NAS.
- Chrome est le navigateur retenu pour la cliente ; Zen est validé par Sam.
  Safari reste non testé et non bloquant. Voir les limites de
  [la validation UI](ui/validation-issue39.md).

Une PR documentaire ultérieure ne change pas le commit applicatif déjà testé.
Les identifiants exacts des images à utiliser pour la bascule restent à figer
et à consigner localement.

## Résultats des points 2, 3 et 4

| Étape | Preuve disponible | Limite |
| --- | --- | --- |
| 2 — Collecte technique | Versions, architecture, images de production, chemins, droits et contexte Compose relevés | SHA Git du code déployé non établi ; autres écrivains éventuels à confirmer |
| 3 — Restauration | Extraction d’une sauvegarde Hyper Backup, contrôle SQLite, démarrage des anciennes images, sondes HTTP et données reconnues par Sam | Valide la version restaurée ; ne remplace pas une sauvegarde actualisée avant bascule |
| 4 — Nouvelle version | Import exclusif des clientes, contrôles de la cible neuve, recette navigateur et persistance après redémarrage | Recette ciblée confirmée manuellement ; couverture non exhaustive |

La restauration est effectuée dans un dossier séparé. L’extraction initiale
est conservée ; l’ancienne application est démarrée sur une copie de travail.
Sam confirme une sauvegarde automatique de tout le dossier de base via Hyper
Backup, dont la configuration a été validée au début de la reprise.

L’import de test utilise la source restaurée en lecture seule. La cible neuve
est contrôlée : intégrité SQLite correcte, aucune violation de clé étrangère,
nombre de clientes attendu, points remis à zéro, dernière commande vide et
aucune ancienne donnée métier. La cible importée intacte est conservée ; les
scénarios suivants mutent uniquement sa copie d’exécution.

Recette ciblée de la nouvelle version, confirmée par Sam :

- consultation des clientes importées et création d’une cliente fictive ;
- création et publication d’un catalogue fictif avec une collection et un papier ;
- kit C sans supplément : cinq feuilles, montant 10 euros, initialement non réglé ;
- fournitures : cinq feuilles et un spécial, déplacement partiel de deux feuilles,
  répartition trois à commander / deux commandées ;
- règlement du kit : prix conservé, actions modification/suppression non proposées,
  bilan passant de zéro à 10 euros ;
- hors-kit fictive de 80 euros : bilan inchangé avant règlement, puis 90 euros,
  actions verrouillées ;
- après redémarrage du backend de test : commandes réglées, bilan 90 euros,
  répartition fournitures trois/deux et un point de fidélité conservés.

Les sondes backend et via frontend répondent HTTP 200. Le test de restauration
et le test de nouvelle version sont arrêtés après validation par Sam. Aucun
contenu client ni détail d’accès n’est publié avec ces résultats.

## Stratégie d’import confirmée

Créer une base et un stockage distincts avec les seules clientes. Ne pas
migrer en place la base historique et ne pas utiliser les scripts de reset.
Conserver ensemble l’ancien code, les images, la configuration et la base.

Sam autorise explicitement la conversion des champs facultatifs incompatibles
en NULL via `--invalid-optional-fields-as-null`, identique pour le précontrôle
et l’import. Les valeurs compatibles sont conservées ; champs obligatoires
invalides, colonnes manquantes et doublons d’emails renseignés restent bloquants.
Aucune année n’est inventée pour les anniversaires sans année. Voir
[le contrat d’import](schema-import-clients.md).

Identifiants recréés, colonnes générées recalculées ; dernière commande NULL,
points à zéro et clientes actives. Aucune ancienne commande, catalogue,
collection, matière, fourniture, alerte, stock ou bilan repris. Les paramètres
prennent les valeurs du schéma neuf ; leurs tarifs seront confirmés par Sam.
La copie de diagnostic et les bases de test ne sont pas des bases de bascule.

## Restant avant le point 5

- Figer les images exactes et la configuration de livraison correspondant au
  commit testé ; confirmer le créneau et l’autorisation de bascule.
- Confirmer tous les écrivains SQLite et préparer leur arrêt. L’arrêt gracieux
  n’est pas démontré par les seules confirmations d’arrêt des essais. Une
  répétition Docker locale antérieure avait un backend arrêté avec code 137 ;
  la procédure de sauvegarde ne doit pas supposer un arrêt gracieux acquis.
- Produire une sauvegarde cohérente actualisée, conservée hors du volume actif,
  puis contrôler son intégrité. La sauvegarde déjà restaurée peut être périmée.
- Refaire le précontrôle et l’import depuis cette sauvegarde finale vers une
  nouvelle cible, puis vérifier les résultats avant démarrage.
- Confirmer le retour arrière, contrôler la nouvelle version avec Sam avant
  reprise des saisies et consigner le résultat de la bascule.

L’issue #13 reste ouverte. Une recette réussie ne vaut pas autorisation de
remplacer la production ; la bascule nécessite un accord distinct.

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
