# Lot 3C — bibliothèque des papiers

Réalisation autorisée par Sam le 10 octobre 2026 après validation, commits et
push des corrections Catalogues/Commandes. Après présentation du rendu et des
validations, Sam a autorisé les commits/push de Papiers et la mise à jour de
l’issue #39 le même jour. Le lot est livré sur la branche UI ; aucune
modification backend, API, schéma ou NAS. La recette sur le Mac reste ouverte.

- Titre Papiers dans le bandeau atelier. Bibliothèque sur une surface blanche
  continue, lignes compactes, noms complets, actions sobres à droite et survol
  prune pâle. Repli des noms/actions sur écran étroit.
- Nouveau papier déplie une création dans la page. Filtres déplie recherche
  et actifs/archivés, sans popup ; compteur et critères signalés une fois
  repliés, effacement avec retour du focus.
- Renommage dans la ligne, retour du focus après enregistrement/annulation,
  tri alphabétique actualisé. Création et renommage conservent la saisie après
  refus ; l’erreur est reliée au champ.
- Archivage confirmé, refus serveur d’un papier utilisé par un catalogue
  publié affiché, restauration conservée. Aucune suppression ajoutée ni
  modification des libellés historiques des commandes.
- Mutations concurrentes et sortie de page pendant enregistrement bloquées.
  Abandon d’un nom ou nouveau papier saisi confirmé avant changement de ligne,
  action, filtre masquant la ligne ou sortie de la page. La recharge bénéficie
  de la protection native du navigateur. Une recherche qui reste compatible
  avec la ligne éditée ne supprime pas la saisie.

| État | Capture |
| --- | --- |
| Liste desktop | [1280 × 800](liste-1280.png) |
| Recherche repliée active | [1280 × 800](recherche-repliee-1280.png) |
| Création refusée pour doublon | [1280 × 800](doublon-1280.png) |
| Renommage avec refus et saisie conservée | [1280 × 800](renommage-erreur-1280.png) |
| Confirmation d’archivage | [1280 × 800](confirmation-1280.png) |
| Archivage protégé refusé | [1280 × 800](archivage-refus-1280.png) |
| Papiers archivés | [1280 × 800](archives-1280.png) |
| Édition étroite | [375 × 800](edition-375.png) |
| Dernières actions au-dessus du dock | [375 × 800](fin-liste-375.png) |
| Bibliothèque vide | [1280 × 800](bibliotheque-vide-1280.png) |

La [recette Chromium](browser.cjs) intercepte entièrement les API avec des
fixtures : aucun appel métier n’écrit dans une base locale ou le NAS. Elle
couvre chargement refusé/reprise, recherche/casse/espaces, filtres repliés,
création/doublon/reprise, renommage/refus/reprise, protection des saisies et
mutations, archivage protégé/refus/confirmation, restauration/refus/reprise,
clavier/focus, noms longs, bibliothèque vide et repli aux formats 1280×800,
1024×768, 375×800 et 800×375, avec actions de fin de liste accessibles.

`npm run check` passe : 93 tests backend, 67 frontend et build Vue.
`docker compose config --quiet` et `git diff --check` passent.
L’audit indépendant en lecture seule n’a identifié aucun défaut bloquant ;
il a reproduit la recette navigateur et le build. Son lancement de la suite
backend a rencontré `listen EPERM` dans le sandbox ; la suite complète a
été vérifiée séparément avec les permissions de ports locaux.

Une note mineure d’accessibilité (pertinence 2/5) est confirmée dans le
template : le bouton Nouveau papier garde `aria-controls="paper-create-form"`
alors que le formulaire fermé est retiré par `v-if`. À l’ouverture, la cible
et le focus sont présents et vérifiés par la recette. Aucun échec de parcours
n’a été reproduit. Correction proposée dans le lot 3D des composants,
sous réserve de décision de Sam ; aucune correction ajoutée à ce stade.
La recette réelle Mac/Safari et le zoom 200 % restent ouverts.

Avec l’aperçu Vite sur 5174, lancer `node browser.cjs`. Variables facultatives :
`STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`, `STAMP_PREVIEW_URL` et
`STAMP_CAPTURE_DIR` pour conserver les captures lors d’une régression.

Le lot suivant proposé est 3D : formulaires et composants communs, puis bilan
et recette consolidée. Sa réalisation reste à autoriser. Aucun déploiement
dans ce lot.
