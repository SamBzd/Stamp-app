# Bilan mensuel dans l’atelier — 10 octobre 2026

Lot autorisé par Sam. Les composants communs et listes adaptatives sont
conservés ; les commits cohérents et le push sur la branche UI ont été
autorisés le 10 octobre 2026. Aucun déploiement ; Mac/Safari reste à vérifier.

- Surfaces blanches, titres prune et listes continues qui prennent la hauteur
  de leur contenu. Promotions et autres articles côte à côte sur desktop,
  empilés sur écran étroit.
- Chiffre d’affaires aux prix historiques, paiements non renseignés et homonymes
  à prix différents conservés. Les détails ne sont pas additionnés à nouveau.
- La sélection de mois reste suivie de « Charger ». Le titre du résultat vient
  du mois retourné par l’API, même si une autre période est ensuite choisie.
- Sélecteur de mois en toutes lettres, dialogue compact réutilisant Modal,
  année resynchronisée à chaque ouverture, douze mois, cibles de 44 px,
  Escape/croix/fond, boucle Tab et retour de focus.
- Sélecteur et chargement verrouillés pendant la requête ; refus serveur avec
  « Réessayer », conservation du mois choisi, états initial et vide explicites.
- Dock fixe accessible après défilement, contenu final dégagé. Kanban et
  navigation Fournitures/Bilan conservés, sans filtre mensuel sur les piles.

| Preuve | Capture |
| --- | --- |
| Bilan chargé | [1280 × 800](bilan-1280.png), [1024 × 768](bilan-1024.png), [375 × 800](bilan-375.png) |
| Sélecteur ouvert | [Desktop](mois-1280.png), [Mobile](mois-375.png), [Paysage](mois-800.png) |
| Autre mois choisi, résultat précédent conservé | [Capture](mois-choisi-non-charge.png) |
| Refus serveur et mois vide | [Erreur](erreur.png), [Vide](vide-1280.png) |
| Montant maximal exact et noms longs | [375 × 800](long-375.png) |

La [recette Chromium](browser.cjs) intercepte toutes les API avec des fixtures
fictives. Aucun accès aux données du NAS ni écriture dans une base locale.
Elle couvre les montants exacts (dont 7 centimes et MAX_SAFE_INTEGER), deux
suppléments homonymes à prix différents, la distinction mois choisi/chargé,
le clavier/focus/année, le verrou pendant chargement, refus/reprise et mois
vide. Viewports : 1280 × 800, 1024 × 768, 375 × 800, 800 × 375, puis 640 × 400
avec contenu long. Le tableau peut défiler horizontalement dans sa propre
zone pour les montants extrêmes ; la page ne déborde pas horizontalement.
Le dialogue fait défiler son contenu sur écran bas. Le retour au Kanban au
clavier conserve les cinq colonnes.

Validations : `npm run check` (93 tests backend, 68 frontend et build),
`docker compose config --quiet` et `git diff --check` réussis. Le test de rendu
existant utilise le libellé français du mois et vérifie le titre du mois chargé.
Une ancienne assertion numérique du mois a été retirée du test Kanban ; le
rendu réel du bilan est couvert par le test dédié et la recette navigateur.

Deux audits indépendants ont été réalisés. La première revue a également
signalé l’assertion obsolète, reproduite puis corrigée ; son lancement Chromium
était bloqué par le sandbox. La seconde n’a confirmé aucun défaut produit,
a reproduit les tests et la recette, et a relevé une assertion de recette
instable à 800 × 375 (pertinence 3/5) : deux rectangles sont mesurés à des
instants différents pendant la stabilisation du dialogue. La sonde ciblée
confirme le défilement correct après focus et Tab vers Décembre. La proposition
de mesure atomique est préparée dans `/tmp/stamp-bilan-recette-stabilisation.patch`,
sans application ; l’accord de Sam reste demandé selon son contrat Jarvis.

Avec Vite démarré : `node docs/ui/recette-bilan/browser.cjs`.
Variables facultatives : `STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`,
`STAMP_PREVIEW_URL`, `STAMP_CAPTURE_DIR` (utiliser `/tmp` pour les régressions).

Limites : Chromium avec API simulées ; Safari réel, zoom 200 % et validation
esthétique par Sam restent ouverts. Aucun changement API, backend, schéma,
calcul métier, dépendance ou données. Voir le [contrat du bilan](../../bilan-commandes.md).
