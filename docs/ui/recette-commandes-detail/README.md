# Correction du détail Commandes — 10 octobre 2026

La capture de Sam montrait le numéro répété dans le corps du détail et une
ligne type/statut collée à la séparation sous le titre. La correction locale
regroupe numéro, type et statut dans l’en-tête fixe du panneau, puis réserve
18 px avant la fiche cliente sur desktop. Les formulaires, actions et règles
métier sont conservés. Les autres modifications Catalogues locales sont
préexistantes à cette correction ; aucune modification backend ou de données.

| Desktop 1280 × 800 | Modal 375 × 800 |
| --- | --- |
| [Capture](detail-1280.png) | [Capture](detail-375.png) |

La [recette Commandes](../recette-fiches/commandes/browser.cjs) vérifie en plus
un numéro unique dans le panneau, le type/statut dans l’en-tête, l’espacement
avant la cliente, l’en-tête immobile pendant le défilement et la dernière ligne
accessible. Elle couvre kits/hors kit, réglées/en attente, focus de fermeture,
filtres et liens directs, noms longs et zéro, aux formats 1280, 1024, 375 et
800 px. Toutes les API de cette recette sont interceptées avec des fixtures.
Les captures initiales d’harmonisation restent conservées.

`npm run check` réussit : 93 tests backend, 67 frontend et build Vue.
`docker compose config --quiet` et `git diff --check` passent également.
Safari sur le Mac reste à vérifier. Sam a validé la correction et autorisé
son commit/push le 10 octobre 2026.
