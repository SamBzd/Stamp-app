# Exploitation

## État actuel

L'application est conçue pour une utilisatrice et un NAS privé. Le dépôt ne contient pas encore de configuration de déploiement, de service système ni de reverse proxy : `npm run dev` est un outil de développement, pas une procédure de production.

## Base SQLite

`db/app.db` est une base contenant potentiellement des données personnelles.

- Sauvegarde-la hors du dépôt avant toute opération de maintenance.
- N'exécute `node db/reset_v2.js` que sur une base jetable ou après sauvegarde : le script supprime les données des commandes et catalogues v2.
- Vérifie le schéma avec `db/schema.sql` après chaque évolution.

## Réseau et sécurité

L'API accepte actuellement les origines CORS sans restriction et le frontend vise une URL `localhost` codée en dur. Ce montage n'est pas approprié tel quel pour un accès depuis un autre appareil du réseau. Avant un déploiement NAS, prévoir une origine API relative ou configurable, un reverse proxy et une politique CORS limitée à l'origine de l'interface.

## À ne pas publier

Avant de partager ou pousser le dépôt vers un hébergeur tiers, retirer les bases SQLite réelles et leurs sauvegardes de l'historique Git, puis les ignorer. Utilise à la place un schéma et des données de démonstration anonymes.
