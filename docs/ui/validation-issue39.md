# Validation actuelle de l’issue #39 — 11 octobre 2026

Ce cadrage remplace les anciennes réserves de livraison liées à un Mac précis
ou à Safari dans les recettes historiques et les documents des jalons.

- Sam confirme que la cliente utilise **Chrome**. Les recettes automatisées
  sont exécutées sous Chromium ; elles couvrent la même famille de moteur,
  sans constituer une recette sur le poste réel de la cliente.
- Sam valide le fonctionnement sous **Zen (Firefox/Gecko)**. Il s’agit de sa
  validation manuelle complémentaire, pas d’une suite automatisée Firefox.
- Safari est **non testé**. Sam n’y a pas accès ; Safari, VoiceOver et un
  modèle précis de Mac ne sont plus des conditions bloquantes de livraison.
- L’application reste une application web responsive, avec police système
  adaptée au poste. Les maquettes et captures datées restent historiques.

## Corrections et validations acquises

Les trois finitions demandées par Sam sont corrigées localement : survol de
semaine du calendrier neutralisé, mesures du bilan atomiques après animation,
`aria-controls` de création Papiers présent uniquement avec le formulaire.

`npm run check` passe : 93 tests backend, 72 tests frontend et build Vue.
Docker et les trois recettes Chromium passent. Le bilan a réussi cinq
passages complets, dont quatre avec animations activées et chacun à 800 × 375.
Les finitions sont committées dans `809d408`. Sam a autorisé les commits
et le push de cette livraison sur la branche UI le 11 octobre 2026.

## Bandeau compact

Sam valide le bandeau compact et autorise son commit/push le 11 octobre 2026.
Le bandeau est committé dans `4a9d458`.
À sa demande, il passe de 150 à **96 px minimum sur desktop**,
avec 16 px de marge verticale. Sur écran étroit, marges, espacements, logo et
étiquette sont compactés ; la hauteur suit le contenu sans tronquer le texte.
La largeur utile, les couleurs et les destinations du dock sont conservées.
La mesure dynamique du bandeau continue à dimensionner les panneaux.

Vérifications Chromium : cinq pages aux formats 1280 × 800, 1024 × 768,
375 × 800 et 800 × 375 ; texte contenu, absence de débordement horizontal,
hauteur mesurée cohérente et lien d’évitement au clavier. Les recettes complètes
Calendriers, Bilan et Papiers passent avec ce bandeau, sur fixtures synthétiques
ou API interceptées. Le format 800 × 375 peut dépasser 96 px pour conserver
le sous-titre lisible ; 96 px reste une hauteur minimale.

Captures : [desktop](recette-bandeau/desktop-1280.png),
[mobile](recette-bandeau/mobile-375.png).

## Restant avant clôture

- Consolidation de la recette : zoom navigateur réel à 200 %, preuves clavier,
  contrastes composés et repli/transparence réduite sur les navigateurs retenus.
  La validation générale Zen ne vaut pas confirmation de chacun de ces critères.
- Revue et intégration dans `main` après accord.
- Clôture de #39 puis examen des critères propres à l’EPIC #24.

Aucun déploiement NAS n’est inclus dans cette issue.
