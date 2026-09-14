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

- besoin précis et priorité de l'amélioration demandée par le client ;
- comportement métier réellement attendu, notamment pour les kits, stocks et points de fidélité ;
- versions, variables d'environnement, volumes et procédure de sauvegarde utilisés sur le NAS ;
- contenu et état d'intégrité de la base de production ;
- méthode souhaitée pour tester puis déployer `main`.

Ces points sont des questions de découverte. Ils ne constituent ni un backlog validé ni une autorisation de modifier l'application.
