# Bords inférieurs harmonisés — 13 octobre 2026

Sam demande que tous les conteneurs suivent le comportement du détail Catalogue :
le bord inférieur accompagne la dernière ligne qui remonte, sans déplacer l’en-tête.

Les panneaux à défilement indépendant sur desktop partagent la directive
`followingBottom` : détails Clientes/Commandes/Catalogues, formulaires Clientes,
kits/hors kit, préparation Catalogue et listes/paramètres. Le parent garde son
emplacement ; la hauteur du panneau et le dégagement final diminuent ensemble,
pour préserver le débattement de défilement. Les contenus courts s’arrêtent à leur
fin. Les changements de contenu, d’étape et de taille réactualisent la mesure.
Les styles sont restaurés au passage mobile et les observations sont débranchées
à la fermeture. Les cartes Papiers et Bilan suivent déjà leur contenu naturel.
Les colonnes Fournitures ne s’étirent plus à la hauteur de la plus longue colonne
et leurs hauteurs minimales artificielles sont retirées ; les zones vides gardent
leur en-tête et leur message pour accueillir le glisser-déposer.

## Validation

`browser.cjs` s’exécute contre une API locale avec les données synthétiques de
`backend/scripts/prepare-recette.js` (cliente 1, commandes kits/hors kit,
catalogues 5 et brouillon 7). Il n’enregistre aucune donnée. Variables possibles :
`STAMP_PREVIEW_URL`, `STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`.
Le script produit ses captures dans `/tmp`.

Vérifiés : listes courtes, variante simulant trente clientes, trois détails,
création cliente/kit/hors kit, quatre étapes du catalogue, paramètres, retour au
scroll initial, scroll répété sans dérive, hauteur maximale de défilement stable,
passage desktop/mobile et absence de débordement horizontal. Sur les panneaux
indépendants, la dernière ligne est suivie de 18 px ; au repos aucune réécriture
continue des tailles n’a été observée. Fournitures et Papiers vérifiés avec l’API
locale. Recette des onglets Catalogue conservée. Aucun enregistrement en base.

`npm run check` : 93 tests backend, 72 frontend et build réussis ; Docker et
contrôle du diff réussis. Les tests de rendu isolé des vues Clientes/Commandes
neutralisent la directive géométrique, qui est vérifiée dans Chromium.
Les anciennes recettes exigeant un panneau constamment en pleine hauteur
représentent la disposition historique et ne valident plus ce comportement.
Pas d’audit supplémentaire, conformément à la demande de Sam pour ces essais.
Changements locaux non committés sur `codex/petits-fix`, aucun déploiement.

[Formulaire cliente](form-cliente.png) · [Détail commande](detail-commande.png) ·
[Liste longue](liste-clientes.png).

## Correction après capture de Sam

La capture de Sam montrait la dernière fiche coupée alors que le cadre du détail
restait plus bas. La cause était une double réservation du dock pour les listes :
hauteur disponible réduite, puis dégagement de défilement ajouté. La réserve
supplémentaire est retirée ; les listes utilisent la même hauteur disponible que
les détails. Dans l’onglet de Sam (1251×824, catalogue 7), la dernière fiche entre
dans le cadre au départ (fin à 745 px, bord à 763 px). En fin de défilement des
deux panneaux, leur dernier contenu est à 712 px et leur bord à 730 px.
La recette commune, les 165 tests, le build, Docker et le diff passent après correction.
