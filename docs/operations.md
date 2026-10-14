# Exploitation

## Version et configuration réelles

La version stabilisée est livrée sur NAS depuis le 14 octobre 2026 :
[compte rendu](livraison-nas.md), [références](project-state.md).
Le code `main` est une base de développement ; seule la référence des images
livrées et la configuration terrain établissent ce qui tourne réellement.

La production utilise deux services, Nginx devant Express, une origine unique
et un dossier SQLite persistant distinct. Le Compose réel épingle les images,
monte ce dossier vers `/data` et exige `STAMP_DB_PATH=/data/app.db`.
Les droits du dossier et de la base sont adaptés à l’utilisateur `node` du
backend. Hyper Backup inclut ce dossier. Le détail machine reste local (`*.local`).

Le `compose.yaml` du dépôt est un **exemple générique**, avec volume nommé
`stamp-data` et port 8080 par défaut ; il ne doit pas être exécuté tel quel
contre le NAS en remplacement de son Compose réel. `npm run dev` utilise
`db/dev.db`, jamais la base du NAS.

## Configuration applicative

| Variable | Usage |
| --- | --- |
| `STAMP_DB_PATH` | Chemin obligatoire de SQLite dans le backend |
| `PORT` | Port backend, 3000 par défaut |
| `CORS_ORIGIN` | Origines tierces facultatives ; vide pour une origine unique |
| `VITE_API_BASE_URL` | Préfixe API compilé dans le frontend, `/api` par défaut |
| `STAMP_HTTP_PORT`, `STAMP_VOLUME_NAME` | Paramètres de l’exemple Compose du dépôt, pas preuve des montages NAS |

Le backend ne charge pas automatiquement `.env`. Les variables doivent être
transmises par son environnement. Nginx relaie `/api/` vers `backend:3000` ; seul
le frontend publie un port. Vérifier la portée des accès dans l’environnement
réel ; un bind ne remplace pas une vérification de la configuration réseau.

## Sauvegarde et restauration

La tâche Hyper Backup protège le nouveau dossier de base, l’ancien dossier et
la sauvegarde finale de bascule. Son succès et la présence des fichiers ont
été confirmés. Pour une maintenance :

1. Identifier le montage actif et tous les écrivains ; faire autoriser le créneau.
2. Arrêter les écritures puis vérifier l’état des services. Un conteneur arrêté
   ne prouve pas un arrêt gracieux ni le checkpoint complet du WAL.
3. Produire une copie autonome avec l’API backup de SQLite ou une copie arrêtée
   contrôlée de l’ensemble base/WAL. Ne jamais copier uniquement `app.db` en
   ignorant un WAL, ni supprimer WAL/SHM manuellement.
4. Conserver l’original, relever une empreinte, protéger la copie hors du
   stockage actif. Contrôler `PRAGMA integrity_check` et `PRAGMA foreign_key_check`.
5. Restaurer dans un dossier différent, démarrer les images correspondantes
   sur une copie de travail et confirmer le fonctionnement attendu.

Une sauvegarde Hyper Backup de fichiers pendant les écritures n’est pas, à elle
seule, une preuve de cohérence SQLite. Prévoir une copie cohérente pour les
opérations sensibles et tester périodiquement une restauration. Ne pas ouvrir
ni modifier silencieusement les données clientes pendant un diagnostic.

## Mise à jour d’une base compatible

Au démarrage, le backend vérifie la version et la structure. Une base neuve
reçoit le schéma courant ; une base incompatible ou avec migration en attente
bloque le démarrage. Les migrations sont explicites, atomiques et enregistrées
avec leurs empreintes ; ne jamais modifier une migration déjà appliquée.

Après sauvegarde et arrêt autorisés, utiliser **le projet et le Compose réels**.
Ces exemples de commandes sont relatifs au contexte déjà identifié :

```bash
docker compose stop backend
docker compose run --rm backend npm run db:migrate:status
docker compose run --rm backend npm run db:migrate
docker compose up -d backend
```

Adapter la syntaxe à la version Compose installée (`docker-compose` si nécessaire)
et fournir explicitement son fichier/projet. Les conteneurs ponctuels doivent
monter la même base contrôlée. Le statut est en lecture seule. Ne lancer la
migration que si elle est nécessaire et autorisée.

La livraison initiale n’a pas migré en place l’ancienne production : seules les
clientes ont été importées vers une cible neuve. Le reset v2 est destructif et
ne constitue ni une migration NAS ni un outil de réparation.

## Retour arrière et nettoyage

Conserver un ensemble cohérent ancien code/images/configuration/base jusqu’à
validation en usage réel. Avant toute restauration après de nouvelles saisies,
sauvegarder aussi la nouvelle base et faire décider du traitement des données
qui seraient perdues. La possibilité de redémarrer d’anciens conteneurs ne
remplace pas cette décision.

Supprimer uniquement les ressources d’essai identifiées, après contrôle de
leurs montages et utilisateurs. Préférer des cibles explicites aux commandes
`prune` globales ; ne pas retirer une image partagée avec la production.
Refermer SSH après l’intervention. La procédure de DNS local reste reportée.

## Confidentialité

Ne publier ni coordonnées, secrets, chemins réels NAS, rapports privés ni
configurations machine. Notes `*.local` et bases SQLite restent ignorées par Git.
L’historique Git peut encore contenir d’anciennes copies de données : une purge
nécessiterait un chantier autorisé et coordonné, avec sauvegarde.
