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

Aucune procédure de déploiement ou de restauration n'est encore considérée comme validée. Elle devra être documentée après inspection du NAS : versions d'images, ports, volumes, variables d'environnement, emplacement de la base, sauvegardes et méthode de retour arrière.

## À ne pas publier

Avant de partager ou pousser le dépôt vers un hébergeur tiers, décider si les anciennes bases SQLite réelles et leurs sauvegardes doivent être retirées de l'historique Git. Cette réécriture sera un chantier séparé, avec une sauvegarde et une coordination explicites. Utilise à la place un schéma et des données de démonstration anonymes.
