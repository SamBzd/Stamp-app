# Archive des jalons catalogue

Les variantes et validations datées sont historiques. Le [parcours actuel](../catalogue-ui.md) fait référence pour la version livrée.

# Préparation des catalogues et bibliothèque — issues #8 et #28

Ce parcours utilise le socle API de l’issue #6. Il concerne la future version de
Stamp App ; il ne décrit pas l’application actuellement déployée sur le NAS.
Le formulaire et le cycle de vie des commandes kits relèvent de l’issue #9,
avec le backend de l’issue #7.

## Parcours

- `/catalogues` liste les catalogues actifs ou archivés, avec recherche, statut,
  composition et prix dans le détail sélectionné. `/catalogues?catalogue=<id>`
  ouvre la consultation ; `/catalogues/:id` ouvre la préparation dans la même
  vue avec la liste, y compris après archivage ou rechargement direct.
- `/catalogues/nouveau` crée un brouillon avec un nom libre et des matériaux
  facultatifs. Les trois tarifs par défaut sont copiés par le serveur à sa
  création ; aucun statut ni tarif n’est envoyé par ce formulaire.
- L’écran de préparation propose quatre étapes : Informations, Composition,
  Rubans et tarifs, Vérification. Après création du brouillon avec un titre,
  la navigation entre étapes est libre, même si la composition est incomplète.
  Il enregistre séparément les informations, collections, associations de
  papiers, rubans et tarifs locaux. La bibliothèque de papiers
  permet recherche, création et réutilisation. Après chaque sélection, la
  recherche revient à un état vide et prêt pour le papier suivant ; une réponse
  asynchrone ancienne ne peut pas remplacer les résultats courants. Retirer un
  papier d’une sélection retire uniquement son association, jamais la source.
- `/papiers` expose la bibliothèque autonome depuis la navigation principale :
  création, recherche, renommage, archivage et restauration. Les doublons sont
  refusés sans distinction de casse ou d’espaces externes.
  Le lot UI 3C autorisé le 10 octobre 2026 utilise une liste compacte continue,
  création et filtres dépliables dans la page et renommage dans la ligne.
  Les champs gardent leur saisie après refus serveur ; les mutations concurrentes
  sont bloquées et les abandons de saisie confirmés. Le filtre actifs/archivés
  reste signalé lorsqu’il est replié, avec retour du focus après les actions.
  Voir la [recette Papiers](../ui/recette-papiers/README.md) ; Sam a autorisé les
  commits/push du lot le 10 octobre 2026. La recette sur le Mac reste ouverte.
- Les maxima bloquent les ajouts : quatre collections, cinq papiers différents
  par collection et deux rubans. Une collection peut rester vide en brouillon.
- Le panneau de publication explique les minimums manquants et la disponibilité
  de C seul avec une collection. Un brouillon complet reste brouillon jusqu’au
  clic sur « Publier le catalogue ». Chaque mutation relit le statut serveur et
  annonce un éventuel retour au brouillon.
- Les saisies restent présentes après une erreur serveur. Les opérations en
  cours bloquent les soumissions concurrentes ; les modifications non
  enregistrées empêchent publication/archivage et sont signalées avant de
  quitter l’écran de préparation.

## Tarifs

L’onglet Paramètres (`/catalogues?onglet=parametres`), également accessible depuis
l’en-tête de la zone Catalogues, gère les tarifs par défaut. Modifier ces paramètres
n’altère aucun catalogue existant. Les tarifs locaux s’éditent dans chaque
catalogue et ne modifient pas les commandes historiques.

Les champs affichent des euros, acceptent virgule ou point et refusent plus de
deux décimales ou une valeur hors de 0–100 €. La conversion traite les chiffres
directement et envoie uniquement des entiers en centimes, sans arrondi d’une
valeur invalide.

## Archivage

Les fiches clientes, catalogues et papiers proposent archivage/restauration avec
confirmation. Les listes séparent actifs et archivés ; coordonnées,
compositions et historique restent consultables. Un catalogue restauré reste
brouillon et nécessite une publication explicite. Les catalogues archivés ou
brouillons et les clientes archivées sont exclus des choix des nouvelles
commandes. Un papier archivé n’est plus proposé dans les nouvelles sélections,
mais reste visible dans les collections existantes et les commandes passées.
Son archivage est bloqué tant qu’un catalogue publié l’utilise. Les autres
fonctions clientes et la fidélité gardent leur contrat.

Collections, papiers et rubans ne proposent aucune suppression.

## Vérification

`npm run check` couvre les tests backend sur base temporaire, les tests frontend
de conversion tarifaire/conditions de publication, puis le build Vue.
`docker compose config --quiet` contrôle la configuration Docker.

Recette navigateur à effectuer sur une base temporaire :

1. Modifier les tarifs par défaut ; créer « Noël créatif » sans année et
   vérifier la copie, puis modifier ses tarifs locaux et recharger.
2. Créer une collection et enchaîner trois recherches/sélections de papier sans
   rechargement parasite. Retirer puis ajouter à nouveau un papier, répéter le
   cycle, vérifier les plafonds 4/5/2 et les messages de création/doublon.
3. Compléter la composition et vérifier que le statut reste brouillon ; publier
   explicitement, puis rendre un minimum invalide et vérifier la démotion.
4. Provoquer un conflit de nom ou une erreur réseau : vérifier le message et la
   conservation des saisies avant de corriger puis réessayer.
5. Archiver puis restaurer une cliente et un catalogue ; consulter les archivés,
   vérifier les exclusions des nouvelles commandes et l’absence de publication
   automatique après restauration.
6. Contrôler clavier, confirmations et absence de débordement sur écran étroit.
7. Depuis `/papiers`, renommer puis archiver un papier de brouillon, vérifier
   sa conservation dans la collection et son exclusion des nouveaux choix ;
   restaurer le papier. Vérifier que l’archivage est refusé pour un catalogue publié.

## Présentation atelier — lot 3B.1

Composition validée visuellement par Sam le 9 octobre 2026 :
[recette et captures](../ui/recette-jalon3b1/README.md). Sam a préféré la proposition
« Fiches horizontales » au tableau, demandé des fiches allégées et un détail de
l’élément sélectionné, puis précisé que le panneau doit être **à droite**,
harmonisé avec Clientes/Commandes.

La liste reste à gauche sur desktop : nom, statut et formats disponibles, sans
prix ni composition exhaustive. Chaque fiche entière est un bouton clavier.
La sélection utilise un prune plus soutenu et un trait prune à gauche ; le
survol prune pâle est commun aux tableaux de l’application et aux fiches.
Les noms longs reviennent à la ligne.

Le panneau de consultation à droite conserve toutes les informations : formats,
tarifs A/B/C (zéro distingué de À définir), papier spécial et embellissement,
collections et leurs papiers (sources archivées identifiées), rubans. Un lien
Ouvrir la préparation rejoint `/catalogues/:id` ; pour un catalogue archivé,
le libellé devient Consulter ou restaurer. Aucune publication/restauration
n’est déclenchée par la consultation. Le détail est relu par l’API existante ;
chargement et erreur avec reprise restent locaux au panneau, les réponses
anciennes sont ignorées. En dessous de 901 px, le même contenu est modal,
avec scroll interne, fermeture Échap et retour du focus sur la fiche.
Le panneau desktop permet de continuer à parcourir la liste sans bloquer le
scroll ou piéger le focus. Un filtrage retirant la sélection ferme le panneau
et conserve le focus dans le filtre ; passer à Paramètres ferme le détail.

Les liens Catalogues/Paramètres soulignés sont dans l’en-tête de la liste. Le
bouton Filtres déplie la recherche par titre et le choix actifs/archivés inline,
fermés au chargement. Les critères conservés restent signalés par un compteur
et un libellé accessible lorsqu’ils sont cachés. Effacer les filtres rétablit
la liste active et replace le focus sur la recherche ou son bouton d’ouverture.
La recherche conserve sa correspondance actuelle par sous-chaîne, sans
ignorer les accents. Chargement, refus avec reprise, liste vide et recherche
sans résultat sont distincts.

Paramètres présente trois champs tarifaires et un enregistrement explicite.
Le formulaire reste monté entre ces deux onglets : une saisie non enregistrée,
un refus et un enregistrement en cours survivent au changement d’onglet. Une
navigation vers une autre page ou un rechargement quitte ce formulaire et peut
perdre une saisie non enregistrée, comme précédemment. Cette conservation entre
onglets ne remplace pas les protections de départ propres à l’éditeur.

## Création et préparation intégrées — lot 3B.2 (historique)

Sam a demandé un espace unique, sans page dédiée : en consultation, liste 2/3
et détail 1/3 ; Nouveau catalogue ou Ouvrir la préparation passe à liste 1/4
et formulaire 3/4. Le clic sur un autre catalogue revient à la consultation.
La transition des proportions dure 280 ms et l’entrée du formulaire 220 ms ;
la préférence système de réduction du mouvement supprime le déplacement.

Les chemins historiques `/catalogues/nouveau` et `/catalogues/:id` affichent
le même espace complet, via `CataloguesView` et `CatalogueEditor`. Créer le
brouillon ouvre sa préparation dans cet espace et actualise la liste. Le
formulaire conserve les enregistrements par section, les règles de publication,
les tarifs locaux, les limites de composition et l’archivage/restauration.
L’ancienne page dédiée est retirée. Le choix des papiers reste dans la collection.

Quitter l’éditeur, choisir un autre catalogue, changer d’onglet ou utiliser le
retour navigateur confirme l’abandon des modifications non enregistrées.
Pendant une mutation, ces navigations sont bloquées, y compris pendant la
création d’un papier dans la bibliothèque. Un refus serveur conserve la saisie.
Le rechargement d’un éditeur ignore les réponses arrivées après son remplacement.

Sur desktop, l’espace Catalogues est borné à la hauteur du viewport : bandeau
Stamp App visible, liste et formulaire défilant indépendamment. Le titre et
la croix de fermeture en haut à gauche restent hors du défilement du formulaire.
Les détails et formulaires vont jusqu’au bas du viewport, sous le dock fixé en surimpression,
comme Sam l’a précisé. La marge nécessaire aux dernières actions est à
l’intérieur des zones défilantes ; aucun espace extérieur ne raccourcit les
panneaux.
En consultation desktop, le détail défile jusqu’en bas sous le dock : le lien
de préparation est à la fin du contenu, avec la marge de défilement nécessaire
pour l’atteindre. Son ancien pied fixe ne réduit plus la hauteur du détail.
Le titre reste visible. Sans catalogue sélectionné, le panneau d’aide suit
la hauteur de son texte ; l’ouverture du détail conserve le panneau défilant. Le détail
modal sur écran étroit conserve son pied d’actions.

À 900 px CSS et moins, le formulaire occupe la largeur disponible dans le flux,
avec la liste en dessous ; chacun garde sa zone de défilement et le bandeau
reste sticky. La page peut défiler pour rejoindre les deux zones. Le
clic sur une autre fiche ouvre ensuite la consultation modale habituelle.
La [recette 3B.2](../ui/recette-jalon3b2/README.md) conserve les captures et contrôles.
La [recette des défilements](../ui/recette-scroll-catalogues/README.md) couvre les
corrections demandées ensuite par Sam. Sam a validé le résultat et autorisé
les commits/push le 10 octobre 2026 ; Safari reste
à vérifier. Aucun changement backend, API, schéma, données NAS ou déploiement.
La recette réelle Mac/Safari et le zoom 200 % restent ouverts.

Depuis la demande de Sam du 10 octobre 2026, la liste prend uniquement la
hauteur du contenu affiché, y compris après filtrage. Une longue liste desktop
s’arrête avant le dock et défile indépendamment ; les paramètres et les
panneaux de droite conservent leurs actions accessibles. Les contrôles
reprennent les tokens communs : [recette](../ui/recette-composants-communs/README.md).

## Formulaire V2 — petits correctifs du 13 octobre 2026

Cette évolution remplace la présentation simultanée des sections de préparation.
Sur desktop, la liste occupe **1/3** et le formulaire **2/3** du même espace.
La consultation garde ses proportions antérieures. Aucune page dédiée, aucun
changement du contrat API, du schéma ni des règles de publication.

- Une timeline de quatre étapes reste visible au-dessus du contenu :
  **Informations**, **Composition**, **Rubans et tarifs**, **Vérification**.
  Une seule étape est affichée, avec navigation directe et Précédent/Suivant.
- Le titre reste obligatoire pour créer le brouillon. La création ouvre ensuite
  Composition ; toutes les étapes sont accessibles sans condition de complétude.
  Les mutations en cours verrouillent temporairement la navigation.
- Les sections restent montées lorsqu’elles sont masquées : valeurs, recherches,
  sélections de papiers et erreurs locales sont conservées. Changer d’étape
  conserve les saisies. Les sauvegardes restent explicites par section, sauf
  les noms des collections et des rubans : ils s’enregistrent à la sortie du champ ou avec Entrée,
  sans bouton Renommer. Un refus conserve la saisie ; un nom vide reste refusé.
  Après renommage puis ouverture des papiers, la recherche retrouve son focus
  une fois réactivée, sans le reprendre à une autre étape ou un autre contrôle.
- Les étapes ayant une saisie en cours sont signalées « À enregistrer ».
  Vérification affiche les **données enregistrées**, identifie les étapes ayant
  des saisies en attente et permet d’y revenir. Les conditions manquantes de
  publication sont également des liens vers l’étape concernée.
- Pendant le choix des papiers, seul le compteur de la sélection en cours est
  affiché ; le compteur des papiers enregistrés réapparaît à sa fermeture.
- À quatre collections, le formulaire d’ajout disparaît ; à deux rubans,
  celui d’ajout de ruban disparaît également. Les compteurs et limites restent.
- Vérification regroupe chaque collection vide et son action « Ajouter un papier »
  au même endroit. Cette condition n’est plus répétée dans une liste séparée.
  Les catalogues archivés gardent un constat unique, sans action de modification.
- Les succès ordinaires sont annoncés aux lecteurs d’écran sans bandeau visuel.
  Les erreurs et le retour automatique au brouillon restent visibles.
- Les rappels pédagogiques permanents sont retirés. Restent les compteurs,
  plafonds atteints, erreurs, confirmations et signalements utiles.
  Les règles de validation tarifaire restent appliquées ; l’aide détaillée des
  tarifs par défaut demeure dans Paramètres.
- Publication et archivage restent bloqués en présence de saisies non enregistrées.
  Les confirmations d’abandon et la protection au rechargement sont conservées.
  Les catalogues archivés se consultent dans les mêmes étapes ; la restauration
  est proposée dans Vérification.
- Sous 901 px, le formulaire reste au-dessus de la liste. Le défilement conserve
  le dégagement nécessaire sous le dock ; la navigation clavier place le focus
  sur le titre de l’étape choisie.

Voir la [recette V2](../ui/recette-catalogue-v2/README.md) et ses captures.
La validation visuelle de Sam reste à recueillir avant livraison.

## Composition en onglets — variante choisie le 13 octobre 2026

Sam a choisi la proposition Collections en onglets pour remplacer l’empilement
vertical des collections. La timeline et le ratio liste 1/3–formulaire 2/3 restent.
Une seule collection apparaît à la fois ; chaque onglet indique son nom et le
nombre de papiers, y compris une sélection non encore enregistrée. Les composants
masqués restent montés, donc recherches, sélections et noms saisis sont conservés.

Le nom de collection est un titre cliquable ; le champ n’apparaît que pendant
le renommage. Sauvegarde à sortie du champ ou avec Entrée, conservation après
refus. La bibliothèque s’ouvre par clic sur l’une des cinq cartes : ajout depuis
un emplacement vide, remplacement depuis une carte remplie, ou retrait de
l’association dans le sélecteur. Le plafond de cinq reste applicable même lors
d’un remplacement. Choisir un papier ferme la bibliothèque et replace le focus
sur sa carte. Enregistrer les papiers et Annuler restent explicites pour la
sélection entière ; aucune suppression de source ou de collection n’est ajoutée.

Nouvelle collection ouvre un champ ponctuel, après création du brouillon nommé.
L’ajout sélectionne la collection créée ; à quatre, cette action disparaît.
Vérification ouvre la collection concernée lorsqu’on clique Ajouter un papier.
Les catalogues archivés gardent les onglets en consultation et leurs cartes
inactives. Les contrôles s’adaptent aux écrans étroits sans débordement horizontal.

La recette active est désormais
[la recette des onglets](../ui/recette-catalogue-v2/browser-onglets.cjs).
La recette `browser.cjs` garde la présentation linéaire précédente à titre
historique. API, schéma, validation métier et publication restent inchangés.

### Bord inférieur du détail au défilement

Sam demande le 13 octobre 2026 que le bord inférieur du panneau de consultation
suive la dernière ligne lorsqu’elle remonte. Sur desktop, la hauteur visible
s’ajuste à la fin du contenu, action de préparation comprise ; l’espace sous
l’action diminue simultanément pour conserver le même débattement de scroll.
L’en-tête et l’emplacement du panneau restent fixes. Le retour vers le haut
rétablit la hauteur disponible. Le panneau mobile conserve son comportement.

Le comportement du bord inférieur est ensuite partagé avec les autres panneaux
et les listes, via la directive commune `followingBottom`, en remplacement de
la mesure propre à la vue Catalogue. Les quatre étapes, la bibliothèque et les
paramètres suivent le même principe ; [recette](../ui/recette-bords-conteneurs/README.md).
