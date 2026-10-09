# Jalon 3 — autres écrans et formulaires

Cadrage proposé le 9 octobre 2026, après validation du rendu Commandes et
autorisation de commits/push par Sam. Ce document prépare la prochaine phase ;
il ne vaut pas validation de nouvelles compositions ni réalisation des écrans.
La [recette Safari/Mac](recette-jalon2/README.md) reste ouverte.

## Direction à conserver

Le bandeau prune, l’étiquette de titre, le fond citron et les surfaces blanches
sont le socle. Les onglets appartiennent à l’en-tête de leur zone de travail,
avec un soulignement actif. La recherche et les filtres se déplient dans la page
sur demande : pas de bande permanente encombrante ni de popup pour filtrer.
Un critère actif reste signalé lorsque les champs sont repliés.

Les boutons de création restent faciles à trouver ; les actions secondaires
restent sobres et à proximité de leur contenu. Utiliser la largeur desktop,
réorganiser au repli plutôt que cacher des données, réserver le verre aux
signatures déjà validées. Ne pas généraliser l’ancienne grille de grandes
cartes ou le panneau modal par défaut sans examiner le contenu réel.

## Ordre recommandé et limites de chaque lot

| Lot | Proposition de travail | Contrats à conserver | Validation avant le lot suivant |
| --- | --- | --- | --- |
| **3A — Clientes** | Titre dans le bandeau, proposition de liste dense et fiche de consultation latérale ; recherche/filtres intégrés à la liste. | Coordonnées, favoris existants, actifs/archivés, historique, fidélité affichée, création/édition, archivage/restauration et accès aux commandes. | Liste, fiche ouverte, filtres dépliés et écran étroit. |
| **3B — Catalogues** | Liste, onglets Catalogues/Paramètres et éditeur alignés sur l’atelier ; hiérarchie claire entre préparation et publication. | Brouillon/publication/démotion, archivage, associations 4/5/2, tarifs locaux/par défaut, saisies non enregistrées et liens profonds. | Liste, éditeur dense, paramètres et contrôle de recherche/sélection ouvert. |
| **3C — Papiers** | Bibliothèque compacte, recherche/filtres repliables et édition inline lisible. | Création, doublons, renommage, archivage protégé/restauration et historique dans les compositions. | Liste dense, édition, confirmation et refus serveur. |
| **3D — Formulaires et composants communs** | Harmoniser création/édition kit et hors-kit, fiche cliente, champs, sélecteurs, dialogues et notifications. Traiter le bilan mensuel et son sélecteur existant. | Tous les champs, validations, prix historiques, conservation des saisies, confirmations d’abandon et verrous de soumission. | Kit, hors-kit, erreur, confirmation, recherche/sélecteur ouvert et mois/date ouverts. |

Commencer par Clientes, sans modifier les autres écrans dans ce premier lot.
La liste dense et la fiche latérale sont une recommandation de composition,
pas une décision déjà approuvée. Les formulaires de Commandes n’ont pas encore
reçu cette harmonisation : la validation de Commandes porte sur le tableau,
les filtres et la consultation, pas sur leur refonte.

## Méthode et critères de sortie

Pour chaque lot, lire les modules et les contrats concernés, réaliser un
premier écran local complet, puis présenter captures et écarts à Sam avant
généralisation. Pas de remplacement global des styles de tous les formulaires
sur la seule validation d’un tableau. Les états ouverts des sélecteurs qui
n’ont pas de maquette exigent leur propre validation visuelle.

Vérifier sur fixtures locales : contenu dense, noms/coordonnées longs, vides,
chargements, erreurs avec reprise, clavier et retours de focus, annulations,
mutations protégées et liens profonds. Reprendre les viewports 1 280 × 800,
1 024 × 768, 375 × 800 et paysage ; contrôler contrastes et débordements.
Exécuter `npm run check`, `docker compose config --quiet` et les vérifications
navigateur proportionnées ; compléter les tests uniquement pour les risques
de régression réels. Faire auditer indépendamment les changements importants.

Avant clôture de l’issue #39 : recette consolidée sur le vrai Mac/Safari,
viewport réel, zoom 200 %, clavier, logo et verre/transparence réduite. Les
captures Chromium et la validation d’un écran ne remplacent pas cette recette.

## Hors périmètre

Aucune nouvelle règle métier, route métier nécessaire au filtrage, API,
dépendance, migration ou modification des données NAS. Pas de changement des
calculs, de la fidélité, du règlement ou des snapshots historiques. Pas de
déploiement ni de clôture de l’EPIC sur ce seul travail d’UI. Les évolutions
fonctionnelles non demandées sont proposées séparément à Sam.
