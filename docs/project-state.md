# État du projet

## Situation confirmée

- L'application est utilisée par une seule personne depuis un Mac, dans Chrome.
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
  en issue #6 : voir [le contrat API](catalogue-api.md). Le parcours commandes
  kits, le règlement et les calculs associés sont implémentés en issue #7 : voir
  [le contrat commandes](commandes-kit-api.md). Le parcours
  catalogue, les paramètres tarifaires et l’archivage des clientes sont
  implémentés en issue #8 : voir [le parcours UI](catalogue-ui.md). L’interface
  commandes (#9) est implémentée : voir [le parcours commandes](commandes-ui.md).
  Le lot UI Clientes 3A est validé visuellement par Sam :
  voir [le parcours Clientes](clients-ui.md). La liste Catalogues et les
  Paramètres 3B.1 sont réalisés localement ; Sam a validé la composition avec
  fiches allégées et consultation à droite. À sa demande, les listes Clientes
  et Commandes reprennent ce format sans en-tête prune ni colonnes fixes ;
  Sam a validé ces listes et autorisé les commits/push sur la branche UI :
  [recette d’harmonisation](ui/recette-fiches/README.md) ;
  [recette 3B.1](ui/recette-jalon3b1/README.md). Sam a demandé que la création
  et la préparation partagent cet espace avec la liste : ratios 1/4–3/4 en
  préparation, 2/3–1/3 en consultation, transition et protection des saisies.
  Ses corrections de défilement indépendant, en-tête persistant, fermeture
  par croix et dock fixe sont réalisées localement :
  [recette](ui/recette-scroll-catalogues/README.md).
  Le pied fixe de consultation qui raccourcissait le détail a également été
  corrigé : action dans le contenu défilant sous le dock, vérifications
  Chromium et audit indépendant terminés le 10 octobre 2026.
  Sam a validé le lot 3B.2 et les corrections de détail Commandes le
  10 octobre 2026, autorisé leurs commits/push et le lot Papiers 3C :
  [recette](ui/recette-jalon3b2/README.md).
  Les stocks et leurs provenances historiques (#10) sont alignés sur les
  compositions enregistrées : voir [le parcours Stocks](stocks.md).
  Le bilan (#11) utilise les prix appliqués historiques et expose ses montants
  en centimes : voir [le contrat du bilan](bilan-commandes.md).
  La bibliothèque de papiers (#28) dispose d’une page dédiée, d’un archivage
  protégé et d’une sélection catalogue répétable : voir le
  [parcours catalogue et bibliothèque](catalogue-ui.md). Le lot UI Papiers 3C
  est livré sur la branche UI avec autorisation de commits/push de Sam le
  10 octobre 2026 : liste compacte, recherche et filtres repliables,
  création/renommage inline ; [recette](ui/recette-papiers/README.md).
  Les formulaires Clientes et Commandes sont harmonisés localement le
  10 octobre 2026 : liste 2/3 en consultation puis 1/4 en saisie, formulaire
  intégré à droite, panneaux desktop pleine hauteur sous le dock, actions dans
  le contenu défilant avec dégagement final et confirmation
  d’abandon ; [recette](ui/recette-formulaires/README.md).
  Sam a validé les formulaires et les corrections du dock le 10 octobre 2026,
  et autorisé leur commit/push sur la branche UI. Safari est non testé, sans
  condition bloquante de livraison. Sam a ensuite autorisé l’harmonisation
  des composants communs et
  demandé que les listes Clientes, Catalogues et Commandes suivent leur contenu,
  sans remplissage vide jusqu’en bas. Ce lot est livré sur la branche UI :
  [recette](ui/recette-composants-communs/README.md). Sam a ensuite autorisé
  l’harmonisation du bilan mensuel et de son sélecteur, livrée sur la branche UI :
  [recette](ui/recette-bilan/README.md). La recette consolidée reste ouverte.
  Sam a demandé le remplacement des fenêtres de date système : naissance et
  commandes partagent désormais un calendrier personnalisé déplié sous le
  champ dans le formulaire, avec saisie directe et valeurs API inchangées ;
  [recette](ui/recette-calendriers/README.md).
  Les ajustements suivants sont aussi livrés sur la branche UI : champ date hors kit pleine
  largeur, onglets Fournitures/Bilan contrastés, surlignage sans gouttière vide
  et panneaux sans sélection à hauteur du contenu ;
  [recette](ui/recette-ajustements-ui/README.md).
  Sam a autorisé les commits cohérents et le push de ces lots le
  10 octobre 2026 ; aucune modification du NAS ni déploiement.
  Sam a autorisé trois finitions de l’issue #39 le 11 octobre 2026,
  corrigées sur la branche UI : survol de semaine du calendrier neutralisé, mesure
  atomique après animation dans la recette du bilan, et `aria-controls`
  conditionnel pour la création Papiers. Les trois recettes décrivent ces
  corrections ; Sam autorise leur commit/push. Il confirme Chrome pour la
  cliente et valide le fonctionnement sous Zen ; Safari n’est plus bloquant.
  Il demande aussi un bandeau compact (96 px minimum desktop), réalisé
  et validé visuellement avec autorisation de commit/push :
  [validation actuelle de #39](ui/validation-issue39.md).
  Zoom 200 % et consolidation de la recette restent ouverts.
  La migration v3 est
  documentée, mais cette évolution reste non déployée. Le workflow persistant
  des fournitures (#30) est décrit par son
  [contrat API et de synchronisation](workflow-fournitures-api.md) et sa
  migration v4 sans backfill. Le Kanban opérationnel #31 consomme ce workflow
  dans cinq colonnes, avec déplacements partiels, archivage des piles traitées
  et alertes anonymes : voir le
  [contrat API et d’interface](workflow-fournitures-api.md).
  La recette consolidée (#12) est en cours : voir
  [la matrice, les preuves et les validations restantes](recette-metier.md).
  Ce socle n’est pas prêt pour le déploiement.
- Les anciens catalogues, collections, commandes, stocks et bilans de
  production ne seront pas repris. Seules les clientes seront importées dans
  une base neuve selon la procédure documentée.

Informations encore à confirmer :

- règles métier hors de ce périmètre, notamment les points de fidélité ;
- versions, variables d'environnement, volumes et procédure de sauvegarde utilisés sur le NAS ;
- contenu et état d'intégrité de la base de production ;
- méthode souhaitée pour tester puis déployer `main`.

Ces points sont des questions de découverte. Ils ne constituent ni un backlog validé ni une autorisation de modifier l'application.
