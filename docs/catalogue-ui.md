# Préparation des catalogues et bibliothèque — issues #8 et #28

Ce parcours utilise le socle API de l’issue #6. Il concerne la future version de
Stamp App ; il ne décrit pas l’application actuellement déployée sur le NAS.
Le formulaire et le cycle de vie des commandes kits relèvent de l’issue #9,
avec le backend de l’issue #7.

## Parcours

- `/catalogues` liste les catalogues actifs ou archivés, avec recherche, statut,
  composition et prix. Les détails sont accessibles par `/catalogues/:id`, y
  compris après archivage ou rechargement direct de la page.
- `/catalogues/nouveau` crée un brouillon avec un nom libre et des matériaux
  facultatifs. Les trois tarifs par défaut sont copiés par le serveur à sa
  création ; aucun statut ni tarif n’est envoyé par ce formulaire.
- L’écran de préparation enregistre séparément les informations, collections,
  associations de papiers, rubans et tarifs locaux. La bibliothèque de papiers
  permet recherche, création et réutilisation. Après chaque sélection, la
  recherche revient à un état vide et prêt pour le papier suivant ; une réponse
  asynchrone ancienne ne peut pas remplacer les résultats courants. Retirer un
  papier d’une sélection retire uniquement son association, jamais la source.
- `/papiers` expose la bibliothèque autonome depuis la navigation principale :
  création, recherche, renommage, archivage et restauration. Les doublons sont
  refusés sans distinction de casse ou d’espaces externes.
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
[recette et captures](ui/recette-jalon3b1/README.md). Sam a préféré la proposition
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

La création et l’éditeur de catalogue n’ont pas reçu la refonte atelier dans
cette étape. Ils constituent 3B.2, après validation de la liste et des Paramètres.
La recette réelle Mac/Safari et le zoom 200 % restent ouverts.
