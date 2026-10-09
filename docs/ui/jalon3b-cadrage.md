# Lot 3B — Catalogues

Cadrage préparé le 9 octobre 2026 après validation visuelle du lot Clientes 3A
par Sam et autorisation de commit/push. Il définit la prochaine phase proposée ;
aucune interface Catalogues n’est modifiée par ce document. Les compositions
restent à présenter avant généralisation. Voir le [plan du jalon 3](jalon3-cadrage.md).

## Objectif

Aligner le parcours Catalogues sur les écrans Commandes et Clientes validés :
bandeau prune, titre dans le bandeau, fond citron, surfaces blanches et contenu
compact. Distinguer clairement préparation, publication et tarifs par défaut.
Les routes actuelles et les fonctions métier restent les références :
[parcours Catalogues](../catalogue-ui.md), [contrat API](../catalogue-api.md).

## Étape 3B.1 — liste et Paramètres

Première réalisation locale complète à présenter à Sam avant l’éditeur.

- `/catalogues` : tableau compact avec nom/statut, composition et formats
  disponibles, matériel et tarifs A/B/C. Conserver les informations des cartes
  actuelles ; ouvrir la préparation depuis un lien clavier sur le catalogue.
- Placer les onglets **Catalogues / Paramètres** dans l’en-tête de la zone de
  travail, avec le soulignement déjà validé. Conserver les liens
  `/catalogues` et `/catalogues?onglet=parametres` et l’accès direct au rechargement.
- Recherche et filtre actifs/archivés repliables inline avec **Filtres**,
  fermés au chargement, critères actifs signalés lorsqu’ils sont cachés.
  Ne pas ajouter une deuxième barre permanente de filtres ou de grands boutons.
- Garder Nouveau catalogue visible et les états chargement, erreur avec reprise,
  absence de catalogue et absence de résultat distincts.
- Paramètres : surface sobre pour les trois tarifs par défaut, erreurs lisibles,
  saisie conservée et enregistrement explicite. Rappeler à proximité que seuls
  les nouveaux catalogues copient ces prix ; les catalogues existants gardent
  leurs tarifs. Préserver la validation actuelle 0–100 € et les centimes.

Présenter la liste dense, les filtres dépliés et les Paramètres en desktop et
à largeur étroite. Cette validation ne vaut pas validation de l’éditeur.

## Étape 3B.2 — création et préparation

Après validation visuelle de 3B.1, adapter `/catalogues/nouveau` et
`/catalogues/:id`. Garder une vraie page de préparation accessible par lien
profond, plutôt qu’imposer le panneau de consultation des Clientes à un éditeur.

- Bandeau Catalogues et en-tête de travail compact avec nom et statut réels ;
  retour à la liste facile à trouver. Les noms longs reviennent à la ligne.
- Sections blanches denses : informations/matériel, collections et papiers,
  rubans, tarifs locaux. Réduire les cadres imbriqués et l’espace décoratif
  sans masquer champs, associations, erreurs ni actions d’enregistrement.
- Zone de publication latérale lorsque la largeur le permet, dans le flux sur
  écran étroit : critères manquants, formats disponibles, action explicite
  Publier et archivage/restauration. Ne pas publier automatiquement un brouillon
  complet ou un catalogue restauré.
- Recherche/sélection de papiers intégrée à sa collection : choix existant ou
  création dans la bibliothèque, liste sélectionnée compacte, retrait de
  l’association uniquement et actions Enregistrer/Annuler proches du contenu.
  Montrer cet état ouvert pour validation, sans refaire la page `/papiers`.
- Préserver les enregistrements par section, la conservation des saisies après
  refus, les verrous de mutation et les protections de départ avec saisies
  non enregistrées. Vérifier ces protections avant toute adaptation de style.

## Contrats à conserver

| Domaine | Comportement actuel à préserver |
| --- | --- |
| Création | Brouillon avec nom libre et matériaux facultatifs ; copie serveur des tarifs par défaut, sans statut ni tarifs envoyés par le formulaire de création. |
| Composition | Maximum 4 collections, 5 papiers différents par collection, 2 rubans ; collections incomplètes possibles en brouillon. |
| Publication | Minimums vérifiés, au moins un matériel spécial/embellissement, publication explicite ; une collection ouvre C seul, deux collections distinctes permettent A/B. |
| Actualisation | Chaque mutation relit le statut ; une composition devenue invalide peut ramener le catalogue publié au brouillon, avec message. |
| Archivage | Confirmation, consultation conservée, exclusion des nouvelles commandes ; restauration en brouillon, sans publication automatique. |
| Tarifs | Distinction prix locaux/par défaut ; virgule ou point acceptés, stockage en centimes, aucun effet sur les commandes historiques. |
| Papiers | Recherche répétable et remise à zéro après ajout, anciennes réponses ignorées, doublons refusés, sources archivées identifiées et non proposées comme nouveaux choix. |
| Saisies | Publication/archivage bloqués lorsque des modifications restent non enregistrées ; départ averti, refus serveur sans perte de saisie. |

## Vérification et livrables

Utiliser des fixtures locales : liste dense, titre sans espaces, catalogue vide,
brouillon complet, publié, archivé et plafonds 4/5/2. Tester les tarifs avec zéro,
virgule, deux décimales et valeurs refusées ; distinguer copie à la création et
modification des catalogues existants.

Dans l’éditeur, enchaîner trois recherches/sélections sans perdre une saisie,
retirer puis réajouter une association, simuler une réponse tardive ou un refus,
publier explicitement puis vérifier la démotion après une composition invalide.
Vérifier rechargement direct, navigation avec saisies non enregistrées,
archivage/restauration et conservation des snapshots de commandes.

Contrôler clavier, focus, annulation et erreurs sur les viewports CSS 1 280 × 800,
1 024 × 768, 375 × 800 et 800 × 375 ; aucune information ni action coupée.
Exécuter `npm run check`, `docker compose config --quiet`, recette navigateur
proportionnée et audit indépendant en lecture seule pour les changements
importants. Fournir captures, limites et documentation du parcours mise à jour.

La recette réelle Mac/Safari et le zoom 200 % restent à compléter. La validation
de 3B.1 puis 3B.2 précède le lot Papiers 3C.

## Périmètre technique et exclusions

Modules principaux : `CataloguesView.vue`, `CatalogueDetailView.vue`,
`CatalogueCollection.vue`, `CataloguePrices.vue` et leurs styles. Les stores,
services, composables et composants partagés ne changent que si nécessaire au
parcours autorisé, après lecture et contrôle de leurs autres consommateurs.

Aucune nouvelle règle métier, API, dépendance, migration, modification des données
NAS ni déploiement. Pas de refonte globale des formulaires Commandes, de la page
Papiers ou du bilan dans ce lot. La présélection de cliente depuis Nouvelle
commande reste un point à cadrer avec le lot formulaires 3D.
