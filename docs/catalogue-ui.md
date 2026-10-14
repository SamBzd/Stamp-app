# Catalogues, paramètres et bibliothèque

Parcours du socle livré le 14 octobre 2026. Le contrat métier reste dans
[les règles](catalogue-metier.md) et [l’API catalogues](catalogue-api.md).
Les anciennes variantes sont dans [l’archive des jalons](archive/catalogue-ui-jalons.md).

## Liste et consultation

`/catalogues` liste les catalogues, avec recherche et filtres actifs/archivés.
`?catalogue=<id>` ouvre leur consultation ; `/catalogues/:id` ouvre la préparation
intégrée. Sur desktop, liste et détail partagent l’espace ; les longues listes
et panneaux défilent indépendamment sous le dock. Sur écran étroit, le détail
s’adapte en modal avec fermeture et retour du focus.

Le détail présente statut, formats possibles, prix, matériaux, collections et
rubans. La consultation ne publie ni ne restaure automatiquement. Chargement,
erreur avec reprise, liste vide et recherche sans résultat sont distincts.
Les réponses anciennes ne remplacent pas un détail récent.

## Formulaire V2 — petits correctifs du 13 octobre 2026

La saisie conserve la liste à gauche et le formulaire à droite (ratios 1/3–2/3
sur desktop). Un titre obligatoire crée le brouillon ; les paramètres A/B/C
sont copiés par le serveur. Les quatre étapes sont Informations, Composition,
Rubans et tarifs, Vérification. Après création, navigation libre entre étapes,
avec conservation des saisies et verrouillage pendant les mutations.

Vérification reflète les données enregistrées, signale les saisies restantes et
les conditions de publication. La publication est explicite ; l’échec conserve
la saisie. L’abandon des changements non enregistrés demande confirmation.

### Collections en onglets

Une collection apparaît à la fois. Les noms sont modifiables au clic, enregistrés
à sortie du champ ou avec Entrée ; un refus conserve le texte. L’ajout sélectionne
la nouvelle collection ; au maximum de quatre, l’action disparaît.

Les cinq cartes papier ouvrent la bibliothèque pour ajout, remplacement ou
retrait d’association. La sélection conserve les recherches et choix quand
on change d’onglet. Enregistrer les papiers et Annuler restent explicites.
Choisir un papier ferme la bibliothèque et replace le focus sur sa carte.
Retirer une association ne supprime pas le papier source.

Les rubans sont propres au catalogue et limités à deux. Les catalogues archivés
sont consultables ; une restauration ne publie pas automatiquement.

## Tarifs

Les trois paramètres A/B/C et les prix propres à un catalogue utilisent des
centimes côté API et des euros dans les champs. Plage 0–100 euros, au plus deux
décimales, sans arrondi silencieux ; zéro est distingué de « À définir ».
Modifier les paramètres ne change pas les catalogues existants, et modifier
un catalogue ne réécrit pas les commandes historiques.

L’onglet Paramètres conserve la saisie entre onglets, avec enregistrement
explicite. Cette conservation ne remplace pas une sauvegarde avant navigation
hors de la page ou rechargement.

## Archivage et papiers

Clientes et catalogues s’archivent/restaurent sans suppression physique.
Un catalogue archivé ne permet pas une nouvelle commande ; ses historiques
restent lisibles. Seules les compositions enregistrées alimentent les commandes.

`/papiers` expose la bibliothèque : recherche, création et renommage inline,
archivage et restauration. Les noms sont uniques sans distinction de casse
ou d’espaces externes. Les mutations concurrentes sont bloquées et les refus
conservent les valeurs. L’archivage est protégé quand le papier est encore
utilisé par un catalogue publié. Voir le contrat précis de [l’API](catalogue-api.md).

## Vérification

- [Recette des onglets](ui/recette-catalogue-v2/README.md) et script
  [browser-onglets.cjs](ui/recette-catalogue-v2/browser-onglets.cjs).
- [Recette Papiers](ui/recette-papiers/README.md),
  [calendriers](ui/recette-calendriers/README.md),
  [contrôles communs](ui/recette-composants-communs/README.md).
- [Recette du bord des panneaux](ui/recette-bords-conteneurs/README.md).
- [Validation UI et limites](ui/validation-issue39.md),
  [recette ciblée NAS](livraison-nas.md#recette-synthétique-exécutée-sur-nas).

Les captures et scripts ont une date et une version. Les contrats métier et
la version examinée priment sur les états d’une ancienne maquette.
