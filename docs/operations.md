# Exploitation

## État actuel

L'application est utilisée par une seule personne depuis un Mac, uniquement sur le réseau local. Elle s'exécute dans des conteneurs Docker sur un NAS Synology.

La branche `production` reflète le code présent sur le NAS et contient sa configuration Docker. La branche `main`, issue de la v2, est la future base applicative mais ne contient pas encore une configuration de déploiement validée. `npm run dev` reste donc une commande de développement local, pas une procédure de production.

## Base SQLite

La base de production pourra être récupérée depuis le NAS lors d'une étape ultérieure. La copie locale `db/app.db` est obsolète et ne doit pas servir de référence métier ou opérationnelle. Elle peut néanmoins contenir des données personnelles.

- Sauvegarde-la hors du dépôt avant toute opération de maintenance.
- N'exécute `node db/reset_v2.js` que sur une base jetable ou après sauvegarde : le script supprime les données des commandes et catalogues v2.
- Ne remplace jamais la base du NAS par la copie locale.
- Avant toute maintenance future, identifier le volume réellement monté par Docker et réaliser une sauvegarde vérifiable de la base du NAS.
- Le `db/schema.sql` d'une branche décrit l'intention de cette branche ; il ne remplace pas l'inspection du schéma réel de production.

## Réseau et sécurité

Les remarques sur l'URL `localhost` et CORS concernent le code repris dans `main`. Le service de production est limité au réseau local, mais sa configuration réseau exacte devra être vérifiée sur le NAS avant de conclure sur son exposition ou sa sécurité.

## Procédure de production

Aucune procédure de déploiement ou de restauration n'est encore considérée comme validée. Elle devra être documentée après inspection du NAS : versions d'images, ports, volumes, variables d'environnement, emplacement de la base, sauvegardes et méthode de retour arrière.

## À ne pas publier

Avant de partager ou pousser le dépôt vers un hébergeur tiers, retirer les bases SQLite réelles et leurs sauvegardes de l'historique Git, puis les ignorer. Utilise à la place un schéma et des données de démonstration anonymes.
