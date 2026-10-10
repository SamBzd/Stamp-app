# Commandes — issues #9 et #29

Ce parcours concerne la future version de Stamp App sur `main`, avec l’API du
[lot #7](commandes-kit-api.md). Il ne décrit pas le NAS actuellement déployé.

## Liste et consultation

Le jalon 2 de l’[identité atelier](ui/issue-ui-atelier.md) présente deux pages
Kits (`/commandes/kits`, également `/`) et Hors kit
(`/commandes/hors-kit`), accessibles sous l’entrée Commandes du dock. Les
deux onglets sobres sont intégrés à l’en-tête de la liste ; l’actif est souligné.
Le bouton « Filtres » de cet en-tête déplie/replie recherche et catalogue dans
la surface de la liste, sans popup. Les champs sont masqués initialement ; les
critères restent appliqués lorsqu’ils sont repliés, avec leur nombre signalé
sur le bouton. L’ouverture place le focus dans la recherche. Effacer depuis
un état replié garde les champs masqués et rend le focus au bouton « Filtres ».
À la demande de Sam le 9 octobre 2026, les tableaux sont remplacés par des
fiches horizontales inspirées de Catalogues, sans ligne d’en-tête prune ni
colonnes fixes. Cliente et règlement binaire forment le premier niveau ;
référence/date, type/format, titre catalogue historique pour les kits et
montant appliqué forment le second. Les noms complets restent lisibles et les
informations reviennent à la ligne. Chaque fiche entière est un bouton
natif de sélection, utilisable au clavier. Voir la
[recette d’harmonisation](ui/recette-fiches/README.md). Aucun acompte, note ou
regroupement multi-kits issu de la maquette n’est ajouté. Les formulaires de création/édition gardent leur
structure et leurs règles. Depuis la révision du 10 octobre 2026, ils s’ouvrent
dans l’atelier : la liste passe de 2/3 à 1/4 et le formulaire occupe 3/4,
avec titre/croix persistants, contenu défilant jusqu’au bas du viewport sous le dock ; les actions suivent le contenu avec un dégagement final pour rester accessibles.
Sur écran étroit, le formulaire précède la liste. Les boutons de création et
l’ouverture des fiches sont verrouillés pendant la saisie. Changer de type ou
de page demande confirmation si les saisies ont changé ; accepter l’abandon
ferme le formulaire. Voir la [recette des formulaires](ui/recette-formulaires/README.md).

À la demande de Sam le 9 octobre 2026, chaque page propose une recherche
immédiate par prénom/nom de cliente, insensible à la casse et aux accents,
acceptant plusieurs mots dans les deux ordres. Kits propose en plus un filtre
par catalogue. Les options viennent des commandes historiques, y compris pour
les catalogues archivés ; le filtre porte sur l’identifiant, jamais seulement
sur le titre. Un catalogue ayant changé de nom apparaît une fois, sous le titre
de la première commande dans la liste (la plus récente à son chargement). Deux
catalogues de même titre sont distingués par leur identifiant.

Recherche et catalogue se combinent. Le compteur distingue résultats affichés
et total du type. Les critères restent propres à chaque page pendant les
changements d’onglet ; un rechargement réinitialise les filtres. Un résultat
vide propose de les effacer, avec retour du focus à la recherche si elle est
dépliée. Un filtre qui masque la commande ouverte ferme son détail en gardant
le focus sur le contrôle.
Si la dernière commande d’un catalogue disparaît, le filtre devenu indisponible
est effacé après chargement ; la recherche cliente reste conservée.

Au-delà de 900 CSS px, le détail occupe la colonne de droite et ne bloque ni
la liste ni le défilement de la page. Son contenu historique défile dans sa
propre zone, avec les actions dans le pied du panneau. À 900 px et moins, le
même contenu s’ouvre dans le panneau modal existant, avec focus contenu et
défilement de fond verrouillé. Échap ferme le détail ; sur desktop, ce raccourci
s’applique lorsque le focus est dans le panneau. La fermeture rend le focus à
la commande ; après suppression, il revient à l’en-tête visible de la liste.

La correction du 10 octobre 2026 regroupe le numéro, le type et le statut dans
un seul en-tête fixe : ces informations ne sont plus répétées au début du
contenu. Une marge sépare la fiche cliente de cet en-tête sur desktop ; le
détail modal conserve sa marge habituelle. Les actions restent dans le pied
et la fin de la composition reste accessible par défilement. Voir la
[recette du détail](ui/recette-commandes-detail/README.md).

La [recette visuelle et fonctionnelle](ui/recette-jalon2/README.md) détaille les
écarts à la maquette et les vérifications locales. Le rendu de liste/consultation
est validé par Sam le 9 octobre 2026. Safari reste à vérifier. Les formulaires
sont harmonisés et validés visuellement par Sam le 10 octobre 2026, avec les corrections du dock.

## Composition et prix

Depuis `/`, « Nouveau kit » dans la barre d’actions ouvre le
formulaire : cliente active, catalogue publié actif, puis format disponible.
Les tarifs affichés viennent exclusivement du catalogue choisi. Avec une seule
collection, seul C est proposé ; A/B nécessitent deux collections distinctes.

- A/B : chaque collection possède ses propres quantités de papiers. Les
  répétitions sont possibles, même si un papier est partagé entre collections.
  La contribution 2/3 est complémentaire automatiquement. À la sélection,
  les feuilles sont réparties dans l’ordre des papiers : 1+1 pour deux feuilles,
  1+1+1 pour trois feuilles, 2+1 lorsque trois feuilles sont réparties sur deux
  papiers, et toute la contribution sur un papier unique.
- C : un exemplaire de chacun des papiers est proposé ; les exemplaires
  manquants sont à répartir jusqu’à 5. Un papier unique est proposé ×5. Un total
  incorrect ou l’omission d’un papier empêche l’enregistrement.
- Les changements de catalogue/format/collection retirent les choix
  incompatibles et recalculent une répartition valide. Les boutons −/+ permettent
  ensuite de déplacer manuellement une feuille : l'augmentation est bloquée dès
  que le total attendu est atteint et le message local indique qu’il faut d’abord
  diminuer un autre papier. Chaque collection affiche en permanence le total
  attendu, le total réparti et le reste éventuel.
- Rubans : aucun choix avec zéro, inclusion automatique avec un, sélection
  obligatoire avec deux.
- L’option à 3,50 € double uniquement les papiers. Le formulaire et son résumé
  affichent les quantités de base et à préparer ; ruban, papier spécial et
  embellissement restent chacun en un exemplaire.

Promo/autres exigent ensemble libellé et montant, y compris 0 €. Les montants
sont saisis en euros (virgule ou point, deux décimales maximum), convertis sans
arrondi et envoyés en centimes. Le total calculé inclut tarif local, option et
suppléments. « Corriger manuellement le total » expose un montant explicite et
son origine ; la correction ne retire pas les suppléments.

## Historique et cycle de vie

Après enregistrement, le détail affiche la réponse du serveur : prix appliqué,
origine, tarifs historiques, titre du catalogue, collections, papiers et leurs
quantités, ruban, matériaux et suppléments. Aucune source courante n’est relue
pour reconstruire cet historique. `/?commande=<id>` recharge le détail complet.
Un échec de chargement est signalé et propose une nouvelle tentative. Le lien
historique `/?commande=<id>` ouvre automatiquement le onglet correspondant au
type chargé. Les créations et modifications affichent leur résultat dans la
bonne page, en effaçant si nécessaire les critères qui le masqueraient.

« Modifier » sur une commande non réglée conserve sa cliente et son type.
Pour un kit, les sources et tarifs actuels sont chargés, et l’ancien prix manuel
n’est pas reconduit : toute dérogation doit être activée à nouveau. Le catalogue
d’origine archivé ou brouillon reste sélectionnable s’il est complet ; un autre
catalogue doit être publié et actif. Les champs hors-kit et la fidélité
historique sont conservés ; l’édition n’attribue pas de nouveau point.

« Marquer réglée » utilise exclusivement le règlement dédié, sans recalcul.
Une commande réglée reste consultable, mais aucune édition ni suppression
n’est proposée, pour les deux types. « Supprimer » demande confirmation puis
supprime réellement la commande non réglée ; il n’existe pas d’archivage de
commande. Les stores commandes, stocks, bilan chargé et clientes sont actualisés
après les mutations. Chaque vue recharge également ses données à l’ouverture.

Les erreurs API sont visibles et conservent les saisies. Les actions en cours
verrouillent les soumissions ; l’abandon de saisies modifiées est confirmé.
Sur écran large, le résumé et les erreurs restent visibles dans une colonne
latérale pendant le parcours du formulaire. Sur écran étroit, un état compact de
la composition reste placé près des actions et les erreurs précèdent les champs.

## Vérification

`npm run check` couvre l’API sur base temporaire, les tests frontend de
composition/prix et le build Vue. `docker compose config --quiet` contrôle la
configuration Docker. La recette navigateur utilise uniquement des fixtures
dans une base temporaire, jamais les données du NAS ni `db/app.db`.

1. Créer A et B avec répétitions, basculer la contribution 2/3 et vérifier
   quantités, rubans 0/1/2 et tarifs locaux ; exclure sources archivées/brouillons.
2. Créer C avec 1, 3 et 5 papiers ; refuser un total incorrect/une omission,
   conserver les saisies puis corriger la répartition.
3. Ajouter option, promo et autre à 0 € ; vérifier résumé, total exact et détail
   serveur, puis appliquer une dérogation manuelle (y compris un total nul).
4. Éditer une commande non réglée : cliente/type conservés, sources actuelles,
   prix recalculé et ancienne dérogation décochée ; autoriser l’origine archivée
   complète mais refuser un changement vers une source indisponible.
5. Renommer/modifier/archiver les sources après création et recharger le détail :
   composition et prix historiques inchangés. Régler et recharger : prix figé,
   aucune action d’édition/suppression.
6. Supprimer une commande non réglée après confirmation : liste et besoins
   fournisseurs actualisés. Simuler un refus serveur : erreur visible, aucun
   succès annoncé et saisies conservées.
7. Créer/éditer/régler une commande hors-kit avec date, cadeau et paiement ;
   vérifier le point fidélité historique uniquement à la création >70 €.
8. Vérifier clavier, confirmation d’abandon, écran étroit et absence de
   débordement dans les formulaires/résumés.

## Hauteur des listes et contrôles communs

À la demande de Sam le 10 octobre 2026, les listes Kits/Hors kit prennent la
hauteur de leurs fiches affichées, y compris après filtrage. Une longue liste
desktop est plafonnée avant le dock et conserve son défilement indépendant.
Les champs et sélecteurs, confirmations, erreurs et notifications utilisent
un socle commun ; les validations et montants restent ceux du contrat métier :
[recette](ui/recette-composants-communs/README.md).

Les dates de commande Kit/Hors kit utilisent le même calendrier que les
naissances : déploiement sous le champ dans le formulaire, choix du jour ou saisie JJ/MM/AAAA,
effacement et annulation sans changement. Les payloads restent YYYY-MM-DD,
et les contrôles sont verrouillés pendant l’enregistrement.
Voir la [recette des calendriers](ui/recette-calendriers/README.md).

Le champ date hors kit occupe toute la largeur disponible du formulaire,
y compris dans sa disposition verticale. Sans commande sélectionnée, le
panneau d’aide suit son texte. Les listes courtes n’ont plus de gouttière vide
à droite du surlignage : [ajustements UI](ui/recette-ajustements-ui/README.md).
