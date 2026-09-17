# Commandes — issue #9

Ce parcours concerne la future version de Stamp App sur `main`, avec l’API du
[lot #7](commandes-kit-api.md). Il ne décrit pas le NAS actuellement déployé.

## Composition et prix

Depuis `/`, « Nouveau kit » (ou l’action de la barre supérieure) ouvre le
formulaire : cliente active, catalogue publié actif, puis format disponible.
Les tarifs affichés viennent exclusivement du catalogue choisi. Avec une seule
collection, seul C est proposé ; A/B nécessitent deux collections distinctes.

- A/B : chaque collection possède ses propres quantités de papiers. Les
  répétitions sont possibles, même si un papier est partagé entre collections.
  La contribution 2/3 est complémentaire automatiquement. À la sélection,
  le premier papier fournit la contribution ; la répartition reste modifiable.
- C : un exemplaire de chacun des papiers est proposé ; les exemplaires
  manquants sont à répartir jusqu’à 5. Un papier unique est proposé ×5. Un total
  incorrect ou l’omission d’un papier empêche l’enregistrement.
- Les changements de catalogue/format/collection retirent les choix
  incompatibles. Chaque collection affiche le total et le reste à répartir.
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
Un échec de chargement est signalé et propose une nouvelle tentative.

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
