# Corrections Catalogues — défilements, en-tête et dock

Corrections locales demandées par Sam le 9 octobre 2026 après la première
préparation intégrée. Sam a validé les corrections et autorisé leurs
commits/push le 10 octobre 2026. La recette Mac/Safari reste ouverte.

- Sur desktop, l’espace tient dans le viewport sous le bandeau Stamp App.
  Liste et formulaire défilent séparément ; la roulette d’une zone ne fait
  pas défiler l’autre ni la page.
- La croix en haut à gauche remplace le bouton de retour. Cible 44 px, nom
  accessible, utilisable au clavier et verrouillée pendant l’enregistrement.
- Le titre du formulaire reste hors de sa zone défilante, avec son statut.
- Le dock est fixé en bas sur toutes les vues. Sam a précisé que les panneaux
  Catalogues doivent aller jusqu’au bas de l’écran sous le dock : aucune réserve
  extérieure en desktop. La marge pour atteindre les dernières actions est
  interne aux zones défilantes ; les confirmations gardent leur couche modale.
- En consultation desktop, le lien de préparation est à la fin du détail
  défilant. Le pied fixe avec sa grande marge vide a été supprimé : le corps
  du détail va lui aussi jusqu’au bas du viewport. Le titre reste visible,
  et, depuis la demande suivante de Sam, le panneau sans sélection suit son
  contenu au lieu de remplir la hauteur. Le détail modal étroit
  conserve son pied d’actions.
- Sur écran étroit, les deux zones restent empilées avec défilement propre ;
  le bandeau est sticky et la page permet d’atteindre la liste située en dessous.
  Les ratios desktop et transitions de la préparation sont conservés.

| État | 1280 × 800 | 1024 × 768 |
| --- | --- | --- |
| Défilements indépendants | [Capture](defilements-1280.png) | [Capture](defilements-1024.png) |
| Actions en bas du formulaire | [Capture](formulaire-bas-1280.png) | [Capture](formulaire-bas-1024.png) |
| Consultation défilée | [Capture](consultation-bas-1280.png) | [Capture](consultation-bas-1024.png) |

Captures au viewport fixe. Autres formats : [375 × 800](etroit-375.png) et
[800 × 375](etroit-800.png). Fixtures fictives : 29 catalogues, 4 collections
avec 5 papiers chacune, 2 rubans, tarifs locaux.

La [recette Chromium](browser.cjs) vérifie les deux défilements par roulette,
les positions inchangées du bandeau/titre/liste/dock, l’absence de défilement de
page desktop, le formulaire et détail de consultation atteignant
le bas du viewport sous le dock, la liste plafonnée avant le dock, le dock visible et réellement cliquable, les boutons tarifaires
au-dessus du dock, la croix et son activation clavier, création/consultation,
repli étroit sans débordement, puis le dock fixe après défilement sur Commandes.
Les API sont entièrement interceptées : aucune donnée locale ou NAS modifiée.
La recette 3B.2 passe également sur cette version : saisies, gardes, création,
papiers, publication, restauration, routes et mouvement réduit.
La recette 3B.1 passe après la correction consultation : détails, erreurs,
filtres, paramètres et navigation/focus desktop et modal.

Validations : `npm run check` réussi (93 tests backend, 67 frontend, build),
`docker compose config --quiet` et `git diff --check` réussis. Le build final
passe également après l’ajustement du lien d’évitement pour qu’il reste visible
au clavier au-dessus du bandeau. Audit indépendant en lecture seule : aucun
défaut reproductible trouvé ; les recettes de défilement et de préparation
ont été reproduites. Un nouvel audit de la correction des panneaux sous le dock
n’a trouvé aucun défaut concret. La recette vérifie également la géométrie du
détail de consultation, ses défilements indépendants par roulette et son lien
de préparation dégagé du dock, les détails courts, le panneau vide, et le
pied modal en écran étroit.
La correction du pied fixe de consultation a été revérifiée le 10 octobre
2026 : suite de 160 tests et build, configuration Docker, trois recettes
Chromium et nouvel audit indépendant en lecture seule réussis ; aucun défaut
reproductible trouvé dans ce périmètre. L’audit utilise des fixtures et ne
valide ni Safari ni l’API réelle.

Avec Vite sur 5174, lancer `node browser.cjs`. Variables facultatives :
`STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`, `STAMP_PREVIEW_URL`,
`STAMP_CAPTURE_DIR` pour une sortie différente. Les captures initiales 3B.2
sont conservées ; les régressions écrivent dans `/tmp`.

La recette réelle Mac/Safari et le zoom 200 % restent ouverts. Aucun changement
backend, API, schéma ou règle métier dans ces corrections.

La demande suivante de Sam du 10 octobre 2026 remplace la pleine hauteur de
la liste par une hauteur liée au contenu : le script est adapté à ce contrat,
les captures historiques ci-dessus restent celles de la correction précédente.
Voir les [nouvelles preuves](../recette-composants-communs/README.md).
