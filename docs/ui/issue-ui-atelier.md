# Issue UI — déployer l’identité atelier prune/citron sur desktop

Statut : cadrage validé par Sam et publication autorisée le 9 octobre 2026.
Issue créée : [#39 — Déployer l’identité atelier prune/citron sur desktop](https://github.com/SamBzd/Stamp-app/issues/39).
Les références documentaires et maquettes sont versionnées avec la réalisation.
Sam a autorisé la progression après le jalon 1 (socle et Fournitures) le
9 octobre : [comparaison et recette](recette-jalon1/README.md). La recette
Safari/Mac reste ouverte. Le jalon 2 (Commandes) est validé visuellement par Sam
le 9 octobre, avec autorisation de commits/push :
[comparaison et recette](recette-jalon2/README.md). La suite est décrite dans le
[cadrage du jalon 3](jalon3-cadrage.md). Sam a autorisé le lot Clientes 3A :
sa [réalisation](recette-jalon3a/README.md) est validée visuellement le 9 octobre,
avec autorisation de commits/push. La prochaine phase est décrite dans le
[cadrage Catalogues 3B](jalon3b-cadrage.md).
EPIC de référence : [#24 — Refonte de l’expérience v2 avant livraison](https://github.com/SamBzd/Stamp-app/issues/24).
L’EPIC ne doit pas être clos sur la seule validation des maquettes.

## Problème et résultat attendu

L’UX actuelle est une base satisfaisante, mais l’UI manque d’identité
scrapbooking et exploite insuffisamment la largeur desktop. Déployer une
identité d’atelier chaleureuse et maîtrisée, fidèle aux deux maquettes
validées par Sam le 3 octobre 2026, sans réinventer les règles métier.

Référence contractuelle de réalisation :
[fiche UI atelier](identite-atelier.md),
[Fournitures](maquettes/fournitures.html) et
[Commandes](maquettes/commandes.html).
Les valeurs exactes figurent dans les [tokens documentaires](tokens-reference.json).

## Périmètre

- Shell partagé : logo complet, bandeau horizontal, étiquettes de titre,
  dock inférieur Liquid Glass, navigation réelle conservée et largeur utile.
- Tokens de couleurs, typographie système Mac, espacements, surfaces,
  contours, relief et états interactifs communs ; pas une cascade d’overrides
  par écran ni l’import des styles expérimentaux des prototypes.
- Fournitures : cinq colonnes blanches, en-têtes prune, compteurs jaunes,
  cartes Liquid Glass lisibles, alertes et commandes de déplacement intactes.
- Commandes : deux pages de fiches kits/hors-kit et détail utilisant l’espace
  latéral, avec les vraies informations et actions ; recherche par cliente et
  filtre catalogue pour les kits, autorisés par Sam le 9 octobre 2026.
- Déclinaison cohérente sur Clientes, Catalogues et leur détail, Papiers,
  bilan mensuel, formulaires, dialogues et notifications existants.
- Harmonisation des contrôles de date/mois existants, sans nouveau filtre
  métier. Leur état ouvert n’étant pas maquetté, le faire valider avant de
  généraliser une apparence nouvelle.

## Hors périmètre et garde-fous

- Aucun import d’image, nouveau workflow, endpoint, schéma, migration ou
  changement de calcul, règlement, fidélité, stock ou prix historique.
- Pas de paiement partiel, de commande multi-kits, de notes ou de filtres
  tirés des données fictives de la maquette Commandes. La recherche cliente et
  le filtre catalogue demandés explicitement le 9 octobre complètent ce périmètre.
- Pas de renommage des états du Kanban : `À traiter`, `Commandé`,
  `Disponible`, `Expédié`, `Traité`. Les quantités restent des unités métier,
  sans conversion fictive en mètres, et les cartes restent anonymes.
- Pas de route Stocks/Bilan ajoutée depuis le dock illustratif ; conserver
  Papiers et le bilan dans `/stocks`. Les URL profondes restent compatibles.
- Pas de redesign métier global, de mode sombre, d’animation décorative ou
  de remplacement de stack. Pas de dépendance sans nécessité justifiée.
- Pas de déploiement NAS ni de modification de `main` ou `production`. La
  préparation documentaire initiale n’autorisait pas de Git mutatif ; Sam a
  depuis autorisé la branche et les commits du premier jalon, puis les commits
  et le push du lot Commandes le 9 octobre.

## Réalisation par jalons

1. **Socle et Fournitures** : tokens partagés, shell et premier écran réel.
   Comparer sa capture avec la maquette à dimensions/zoom identiques, fournir
   les écarts expliqués et faire valider par Sam sur son Mac 13".
2. **Commandes** : adapter la disposition aux véritables données et actions,
   pas aux fixtures du prototype. Soumettre la comparaison avant poursuite.
3. **Autres écrans** : décliner les composants validés. Faire approuver toute
   nouvelle composition ou tout état de contrôle non couvert par les maquettes.
4. **Recette consolidée** : contrôles techniques, clavier, Safari et validation
   esthétique finale avec Sam ; clôture de l’issue, puis de l’EPIC si ses
   autres critères sont également satisfaits.

Un jalon non validé visuellement n’autorise pas une généralisation automatique.
Les adaptations nécessaires à l’accessibilité sont expliquées et comparées,
pas dissimulées derrière une approximation de la maquette.

## Critères d’acceptation

- [ ] Palette exacte prune/citron/blanc ; pas de retour au grand fond gris ou
      beige/vert, pas de cartes pastel génériques.
- [ ] Logo « Stamp App » complet, étiquettes et bandeau fidèles aux références ;
      pas de colonne logo/titre/sous-titre sur le viewport desktop cible.
- [ ] Interface système San Francisco sur Mac ; police créative limitée au logo.
- [ ] Trois familles de signatures maximum ; tableaux, champs et contenu restent
      sobres, cadrés et lisibles.
- [ ] Dock clair réellement perceptible comme du verre sur Safari du Mac cible ;
      destination active lisible sans bouton opaque fortement contrasté.
- [ ] Texte des cartes et du dock jamais déformé/flouté ; repli sans filtre et
      transparence réduite utilisables. Pas d’effet qui gêne le glisser-déposer.
- [ ] Toute la largeur utile est exploitée ; cinq colonnes visibles au viewport
      cible, détail Commandes latéral quand la place le permet.
- [ ] Aucun dock ou bandeau ne recouvre données, actions, erreurs ou focus ;
      aucune perte d’information métier au zoom ou au repli étroit.
- [ ] Noms longs, accents, montants, quantités, états vides, chargements, erreurs,
      alertes et confirmations vérifiés avec des fixtures, jamais la base NAS.
- [ ] Contrastes vérifiés sur fonds réellement composés : texte normal ≥ 4,5:1 ;
      composants porteurs d’information et indicateurs de focus ≥ 3:1.
- [ ] Navigation et contrôles utilisables au clavier, focus visible, annulations
      et retours préservés ; pas de statut transmis uniquement par la couleur.
- [ ] Fonctions réelles conservées : déplacements partiels/refus serveur,
      archivage Traité, bilan mensuel, création kit/hors-kit, historique,
      règlement et interdictions d’édition/suppression après règlement.
- [ ] Captures maquette/réalisation comparables et différences consignées pour
      chaque jalon ; validations explicites de Sam attachées à l’issue.
- [ ] `npm run check` et `docker compose config` réussissent ; tests de régression
      UI complétés selon les composants modifiés.
- [ ] Documents des parcours mis à jour si leur présentation change ; aucun
      critère technique ne remplace la validation visuelle sur le Mac.

## Points d’entrée techniques à examiner à l’implémentation

- `frontend/src/style.css` : tokens/surfaces communs, limitations de largeur.
- `frontend/src/components/Layout.vue` : shell et navigation.
- `frontend/src/views/StocksView.vue` : Kanban et bilan, picker de mois.
- `frontend/src/views/CommandesView.vue` : liste/détail et actions réelles.
- Composants partagés existants : Button, FormInput/FormSelect,
  SearchableSelect, Modal, SlidePanel, ConfirmDialog, Toast ; puis vues
  Clientes, Catalogues, Papiers et formulaires de commande.

La préparation documentaire initiale ne modifiait aucun fichier applicatif.
Les deux premiers jalons transposent désormais le socle, Fournitures et
Commandes dans les modules concernés. Le lot Clientes 3A est validé visuellement par Sam ;
la composition Catalogues et Paramètres 3B.1 est validée par Sam :
[recette](recette-jalon3b1/README.md). Les listes Clientes et Commandes sont
harmonisées sur ses fiches allégées : [recette](recette-fiches/README.md). L’éditeur Catalogues est réalisé localement dans le même espace que la liste :
[recette 3B.2](recette-jalon3b2/README.md), validée par Sam le 10 octobre 2026,
avec autorisation de commits/push et du lot Papiers 3C.
Sam a autorisé les commits/push de Papiers 3C et la mise à jour de cette issue
le 10 octobre 2026 après présentation du rendu et des validations :
[recette](recette-papiers/README.md). La recette Mac/Safari reste ouverte.
L’harmonisation des formulaires reste à traiter.
La méthode optique et les
fixtures des maquettes ne constituent pas une architecture de production.
