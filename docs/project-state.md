# État du projet

## Situation confirmée

- L'application est utilisée par une seule personne depuis un Mac.
- Elle est accessible uniquement sur le réseau local.
- Elle est hébergée dans des conteneurs Docker sur un NAS Synology.
- La branche `production` est le miroir du code actuellement présent sur le NAS.
- Les copies SQLite locales sont ignorées par Git et ne représentent pas les données de production.
- La v2 n'a jamais été déployée, mais son travail est conservé et repris comme fondation de `main`.
- `main` est la base commune de stabilisation et ne représente pas encore la production.

## Cartographie des versions

| Référence | Rôle | Autorité actuelle |
|---|---|---|
| `production` | Code déployé sur le NAS | Référence pour l'application en service |
| `main` | Refonte v2 reprise et à stabiliser | Référence pour le développement futur |
| archive de `v2` | État de la refonte avant son adoption par `main` | Référence historique uniquement |
| `db/dev.db` locale | Base vide générée pour le développement | Référence de développement uniquement |
| `db/app.db` et sa sauvegarde locales | Copies obsolètes ignorées par Git | Ne pas utiliser pour déduire l'état de production |

## Ce que la documentation permet d'affirmer

L'architecture et les constats techniques décrits ici proviennent principalement de `main`, issue de la v2. Ils décrivent la future base applicative, pas nécessairement le comportement du NAS. Les détails exacts du déploiement et des données réelles devront être contrôlés avant toute migration.

## Informations encore ouvertes

- Les règles métier, le modèle cible et le contrat API proposés pour les
  catalogues et kits ont été confirmés avec Sam le 16 septembre 2026 : voir
  [les règles et scénarios d'acceptation](catalogue-metier.md) et la
  [proposition de modèle](catalogue-model-proposal.md). Le schéma cible et
  l'outillage d'import clientes sont implémentés en issue #5 : voir
  [la procédure](schema-import-clients.md). Les API sources/settings, publication/démotion et archivage sont implémentées
  en issue #6 : voir [le contrat API](catalogue-api.md). Le backend commandes
  kits, le règlement et les calculs associés sont implémentés en issue #7 : voir
  [le contrat commandes](commandes-kit-api.md). Les interfaces (#8/#9) restent
  à réaliser ; ce socle n’est pas prêt pour le déploiement.
- Les anciens catalogues, collections, commandes, stocks et bilans de
  production ne seront pas repris. Seules les clientes seront importées dans
  une base neuve selon la procédure documentée.

Informations encore à confirmer :

- règles métier hors de ce périmètre, notamment les points de fidélité ;
- versions, variables d'environnement, volumes et procédure de sauvegarde utilisés sur le NAS ;
- contenu et état d'intégrité de la base de production ;
- méthode souhaitée pour tester puis déployer `main`.

Ces points sont des questions de découverte. Ils ne constituent ni un backlog validé ni une autorisation de modifier l'application.
