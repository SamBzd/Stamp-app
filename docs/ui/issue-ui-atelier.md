# Issue UI — déployer l’identité atelier prune/citron sur desktop

Statut : cadrage validé par Sam et publication autorisée le 9 octobre 2026.
Issue créée : [#39 — Déployer l’identité atelier prune/citron sur desktop](https://github.com/SamBzd/Stamp-app/issues/39).
Les références documentaires et maquettes sont versionnées avec la réalisation.
Le jalon 1 (socle et Fournitures) est implémenté localement et attend la
validation visuelle de Sam : [comparaison et recette](recette-jalon1/README.md).
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
- Commandes : liste dense et détail utilisant l’espace latéral, avec les
  vraies informations et actions des commandes kits et hors-kit.
- Déclinaison cohérente sur Clientes, Catalogues et leur détail, Papiers,
  bilan mensuel, formulaires, dialogues et notifications existants.
- Harmonisation des contrôles de date/mois existants, sans nouveau filtre
  métier. Leur état ouvert n’étant pas maquetté, le faire valider avant de
  généraliser une apparence nouvelle.

## Hors périmètre et garde-fous

- Aucun import d’image, nouveau workflow, endpoint, schéma, migration ou
  changement de calcul, règlement, fidélité, stock ou prix historique.
- Pas de paiement partiel, de commande multi-kits, de notes ou de filtres
  nouveaux tirés des données fictives de la maquette Commandes.
- Pas de renommage des états du Kanban : `À traiter`, `Commandé`,
  `Disponible`, `Expédié`, `Traité`. Les quantités restent des unités métier,
  sans conversion fictive en mètres, et les cartes restent anonymes.
- Pas de route Stocks/Bilan ajoutée depuis le dock illustratif ; conserver
  Papiers et le bilan dans `/stocks`. Les URL profondes restent compatibles.
- Pas de redesign métier global, de mode sombre, d’animation décorative ou
  de remplacement de stack. Pas de dépendance sans nécessité justifiée.
- Pas de déploiement NAS, changement de branche, commit ou push dans le
  cadre du présent travail de préparation documentaire.

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
Le premier jalon transpose désormais le socle et Fournitures dans les modules
concernés ; les autres écrans restent à traiter. La méthode optique et les
fixtures des maquettes ne constituent pas une architecture de production.
