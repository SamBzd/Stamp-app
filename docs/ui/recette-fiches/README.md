# Harmonisation des listes Clientes et Commandes

Le 9 octobre 2026, Sam a validé les fiches Catalogues avec détail à droite,
puis demandé le même principe pour Clientes et Commandes : moins de colonnes,
suppression de la ligne d’en-tête prune. Sam a validé le rendu des deux
listes et autorisé les commits/push sur la branche UI. La recette réelle
Safari/Mac reste ouverte.

## Composition

- Même surface blanche continue que Catalogues : fiches horizontales compactes,
  séparateurs discrets, hauteur minimale 72 px, survol et sélection prune pâle.
- Clientes : nom et ville, puis coordonnées ; favori séparé à droite.
- Commandes : cliente et règlement, puis numéro/date, type/format, titre du
  catalogue historique ou Hors kit, montant appliqué. Aucun prix recalculé.
- Les informations se replient sans colonnes fixes ni troncature. Les onglets
  et filtres repliables restent dans l’en-tête blanc. Le détail reste à droite
  sur desktop, dans le panneau modal existant à 900 px CSS et moins.
- Formulaires, actions et règles métier conservés. Les points fidélité inline,
  l’historique des clientes et ses liens vers Commandes restent disponibles.

| Liste | Desktop 1280 × 800 | Étroit 375 × 800 |
| --- | --- | --- |
| Clientes | [Capture](clientes/liste-1280.png) | [Capture](clientes/liste-375.png) |
| Kits | [Capture](commandes/kits-1280.png) | [Capture](commandes/kits-375.png) |
| Hors kit | [Capture](commandes/hors-kit-1280.png) | [Capture](commandes/hors-kit-375.png) |
| Détail commande | [Capture](commandes/detail-kit-1280.png) | [Capture](commandes/detail-kits-375.png) |

Les captures Clientes sont produites par la recette 3A avec un dossier de sortie
séparé ; ses captures initiales restent historiques. Les captures de listes
sont pleine page et peuvent dépasser la hauteur du viewport. Des captures
1024 × 768 et 800 × 375 sont également conservées dans ces dossiers.

## Vérifications

- `npm run check` : 93 tests backend et 67 frontend réussis, build Vue réussi.
  Après les derniers ajustements de styles, build frontend également réussi.
- `docker compose config --quiet` et `git diff --check` réussis.
- [Recette Clientes](../recette-jalon3a/browser.cjs) : sélection, onglets et
  clavier, recherche/favoris, retrait favori avec retour de focus, points inline,
  erreurs/reprise, historique et liens kits/hors kit, création/modification,
  archivage/restauration, erreurs API et verrous pendant les mutations.
- [Recette Commandes](commandes/browser.cjs) : Kits/Hors kit, clavier et focus,
  filtre cliente/catalogue, repli des critères, critères propres à chaque onglet,
  filtrage du détail ouvert, résultat vide/effacement, titre historique, zéro,
  noms longs, commandes réglées, liens directs, détail et défilement desktop/mobile.
- [Régression Catalogues](../recette-jalon3b1/browser.cjs), dont les couleurs
  de survol et de sélection sur les trois nouvelles listes.
- Audit indépendant en lecture seule : aucun défaut vérifiable trouvé ;
  tests des deux vues, build et recettes Chromium Clientes/Commandes reproduits.
  L’auditeur a signalé un échec backend dans son contexte d’exécution ; la suite
  complète passe dans la validation principale avec autorisation des ports
  temporaires. Aucun changement backend n’appartient à ce lot.
- Contrôle de débordement et inspection des captures à 1280 × 800, 1024 × 768,
  375 × 800 et 800 × 375 CSS. Le contour prune présent dans certaines captures
  Clientes représente le focus clavier, pas un en-tête de tableau.

Les scripts interceptent toutes les API avec des fixtures fictives ; aucun
accès aux données du NAS ni écriture dans les bases locales. Pour relancer,
utiliser l’aperçu Vite 5174 et Node avec Playwright ; définir si besoin
`STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`, `STAMP_PREVIEW_URL`.
Pour Clientes, définir `STAMP_CAPTURE_DIR` vers le dossier absolu `clientes`
ci-dessus afin de préserver les captures 3A initiales. Un autre dossier de
sortie existant peut être utilisé pour les deux scripts.

Safari/Mac et zoom 200 % restent à compléter. La prochaine phase est
l’éditeur Catalogues 3B.2 ; cette harmonisation ne
modifie ni backend, ni schéma, ni données, ni déploiement.
