# Exploitation

## État actuel

L'application est utilisée par une seule personne depuis un Mac, uniquement sur le réseau local. Elle s'exécute dans des conteneurs Docker sur un NAS Synology.

La branche `production` reflète le code présent sur le NAS et contient sa configuration Docker. La branche `main`, issue de la v2, est la future base applicative mais ne contient pas encore une configuration de déploiement validée. `npm run dev` reste donc une commande de développement local, pas une procédure de production.

## Base SQLite

La base de production pourra être récupérée depuis le NAS lors d'une étape ultérieure. Les copies locales `db/app.db` et `db/app.db.backup` sont ignorées par Git, obsolètes et ne doivent pas servir de référence métier ou opérationnelle. Elles peuvent néanmoins contenir des données personnelles.

- Ne les partage pas ni ne les remplace ; `npm run dev` utilise exclusivement `db/dev.db`.
- Sauvegarde-les hors du dépôt avant toute opération de maintenance.
- N'exécute `node db/reset_v2.js` que sur une base jetable ou après sauvegarde : le script supprime les données des commandes et catalogues v2.
- Ne remplace jamais la base du NAS par la copie locale.
- Avant toute maintenance future, identifier le volume réellement monté par Docker et réaliser une sauvegarde vérifiable de la base du NAS.
- Le `db/schema.sql` d'une branche décrit l'intention de cette branche ; il ne remplace pas l'inspection du schéma réel de production.

## Réseau et sécurité

Le frontend appelle `/api` par défaut et ne contient aucune adresse de déploiement. Le backend exige `STAMP_DB_PATH`, utilise `PORT=3000` par défaut et n'autorise aucune origine tierce tant que `CORS_ORIGIN` n'est pas renseignée. Une origine CORS ne doit être configurée que si le frontend et l'API sont servis depuis des origines différentes.

Ces variables constituent le contrat de déploiement indépendamment du support choisi. Les valeurs réelles sont fournies par l'environnement et ne doivent pas être commitées.

## Procédure de production

Le projet fournit un déploiement Compose générique :

```bash
docker compose up --build -d
```

- `STAMP_HTTP_PORT` choisit le port HTTP publié, `8080` par défaut.
- `STAMP_VOLUME_NAME` choisit le nom du volume persistant, `stamp-data` par défaut.
- `VITE_API_BASE_URL` vaut `/api` par défaut et ne doit changer que si l'API est servie séparément.
- `CORS_ORIGIN` reste vide pour un déploiement sur une origine unique.

Au premier démarrage sur un volume vide, le backend crée le schéma et les paramètres initiaux, puis enregistre la version courante dans `schema_migrations`. Une base existante au schéma incomplet ou avec une migration en attente bloque le démarrage : elle exige une migration explicite.

Avec le déploiement Compose, arrête le backend pour qu'il n'accède pas à SQLite
pendant la maintenance. Contrôle ensuite l'état, applique les migrations dans un
conteneur ponctuel relié au même volume, puis redémarre le service :

```bash
docker compose stop backend
docker compose run --rm backend npm run db:migrate:status
docker compose run --rm backend npm run db:migrate
docker compose up -d backend
```

Réalise une sauvegarde vérifiable de la base avant la commande de migration. La
commande de statut ouvre la base en lecture seule et ne crée aucune table. Les
conteneurs ponctuels utilisent `STAMP_DB_PATH=/data/app.db` et le même volume
`stamp-data`, ou celui sélectionné par `STAMP_VOLUME_NAME`.

Chaque migration est atomique et son empreinte est enregistrée. Un fichier déjà
appliqué ne doit jamais être modifié. Au démarrage, la structure réelle est aussi
comparée au schéma attendu pour la version enregistrée ; une base dégradée est
refusée. Une base neuve reçoit directement le schéma courant ; les migrations
servent à faire évoluer les bases existantes.

La baseline `0001_main_baseline.sql` correspond au schéma historique de `main`. Elle
ne constitue pas la conversion de la base historique du NAS : cette conversion
sera écrite et validée séparément sur une copie des données lorsque la cible de
déploiement sera stabilisée.

## À ne pas publier

Avant de partager ou pousser le dépôt vers un hébergeur tiers, décider si les anciennes bases SQLite réelles et leurs sauvegardes doivent être retirées de l'historique Git. Cette réécriture sera un chantier séparé, avec une sauvegarde et une coordination explicites. Utilise à la place un schéma et des données de démonstration anonymes.
