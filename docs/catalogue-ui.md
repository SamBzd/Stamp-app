# Préparation des catalogues — issue #8

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
  permet recherche, création, réutilisation et renommage. Retirer un papier
  d’une sélection retire uniquement son association, jamais la source.
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
la barre supérieure, gère les tarifs par défaut. Modifier ces paramètres
n’altère aucun catalogue existant. Les tarifs locaux s’éditent dans chaque
catalogue et ne modifient pas les commandes historiques.

Les champs affichent des euros, acceptent virgule ou point et refusent plus de
deux décimales ou une valeur hors de 0–100 €. La conversion traite les chiffres
directement et envoie uniquement des entiers en centimes, sans arrondi d’une
valeur invalide.

## Archivage

Les fiches clientes et catalogues proposent archivage/restauration avec
confirmation. Les listes séparent actifs et archivés ; coordonnées,
compositions et historique restent consultables. Un catalogue restauré reste
brouillon et nécessite une publication explicite. Les catalogues archivés ou
brouillons et les clientes archivées sont exclus des choix des nouvelles
commandes. Les autres fonctions clientes et la fidélité gardent leur contrat.

Collections, papiers et rubans ne proposent aucune suppression ni archivage.

## Vérification

`npm run check` couvre les tests backend sur base temporaire, les tests frontend
de conversion tarifaire/conditions de publication, puis le build Vue.
`docker compose config --quiet` contrôle la configuration Docker.

Recette navigateur à effectuer sur une base temporaire :

1. Modifier les tarifs par défaut ; créer « Noël créatif » sans année et
   vérifier la copie, puis modifier ses tarifs locaux et recharger.
2. Créer une collection, créer un papier, le rechercher et le réutiliser dans
   une autre collection. Vérifier les plafonds 4/5/2 et renommer les sources.
3. Compléter la composition et vérifier que le statut reste brouillon ; publier
   explicitement, puis rendre un minimum invalide et vérifier la démotion.
4. Provoquer un conflit de nom ou une erreur réseau : vérifier le message et la
   conservation des saisies avant de corriger puis réessayer.
5. Archiver puis restaurer une cliente et un catalogue ; consulter les archivés,
   vérifier les exclusions des nouvelles commandes et l’absence de publication
   automatique après restauration.
6. Contrôler clavier, confirmations et absence de débordement sur écran étroit.
