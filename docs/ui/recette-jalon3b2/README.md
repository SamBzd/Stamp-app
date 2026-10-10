# Lot 3B.2 — création et préparation dans l’espace Catalogues

Réalisé localement à la demande de Sam le 9 octobre 2026, après validation des
listes. Il remplace la proposition initiale de page dédiée. **Validé par Sam
le 10 octobre 2026, avec autorisation de commits/push.** Aucun changement backend, schéma, données
NAS ni déploiement. Voir le [cadrage](../jalon3b-cadrage.md).

- Consultation : liste 2/3, détail 1/3.
- Création/préparation : liste 1/4, formulaire 3/4 à la place du détail.
- Un clic sur un autre catalogue rétablit la consultation, avec confirmation
  d’abandon des saisies éventuelles ; navigations bloquées pendant une mutation.
- Transition des proportions sur 280 ms et entrée douce du formulaire sur 220 ms,
  supprimées avec la préférence système de réduction du mouvement.
- Les anciennes URLs ouvrent ce même espace : liste conservée, lien direct
  rechargeable, création du brouillon puis ouverture de sa préparation.
- Formulaire allégé : sections blanches, séparateurs discrets, choix des papiers
  dans la collection, tarifs locaux et publication explicite. Enregistrements
  par section et règles existantes conservés.
- À 900 px CSS et moins, formulaire dans le flux au-dessus de la liste ; la
  consultation reprend le panneau modal existant. Page librement défilable.

| État | Desktop 1280 × 800 | Étroit 375 × 800 |
| --- | --- | --- |
| Consultation | [Capture](consultation-1280.png) | Panneau modal existant |
| Préparation | [Capture](preparation-1280.png) | [Capture](preparation-375.png) |
| Création | [Capture](creation-1280.png) | [Capture](creation-375.png) |
| Papiers ouverts | [Capture](papiers-1280.png) | Même sélection dans le flux |

Ces captures présentent la première réalisation, avant les corrections de
défilement indépendant et de dock fixe demandées par Sam. Voir les
[captures actuelles et leur recette](../recette-scroll-catalogues/README.md).
Captures initiales pleine page, également à 1024 × 768 et 800 × 375 CSS. Les vues étroites
montrent des données déjà modifiées par les étapes précédentes de la recette.
Aucune donnée réelle n’est utilisée.

## Vérification

- `npm run check` réussi : 93 tests backend et 67 frontend, puis build Vue.
- `docker compose config --quiet` et `git diff --check` réussis.
- Recettes Chromium 3B.2 et régression 3B.1 réussies ; inspection des captures
  desktop et étroites, dont l’éditeur, la création et le choix des papiers.
- Audit indépendant en lecture seule de l’état final : aucun défaut reproductible
  trouvé. La suite complète, Docker, le diff et les deux recettes Chromium ont
  été reproduits. Les tests API passent avec autorisation des ports temporaires ;
  le sandbox seul bloque leur écoute locale.

La [recette Chromium](browser.cjs) intercepte toutes les API sur fixtures :
ratios réels et transition, création/refus/reprise, charge utile de création sans
statut ni tarifs, mutation verrouillée, confirmation d’abandon acceptée/refusée,
retour navigateur protégé, choix d’un autre catalogue, recherche répétée des
papiers, création de papier et blocage de navigation, ajout/sauvegarde de
collections et tarifs zéro, démotion après composition invalide et publication
explicite, consultation archivée/restauration en brouillon, liens directs,
1280/1024/375/800 sans débordement, mouvement réduit et absence d’erreur JavaScript.

La recette de régression 3B.1 couvre liste, recherche/archives, focus clavier,
panneaux desktop/mobile, réponses tardives, erreurs/reprise, Paramètres et leurs
saisies entre onglets, prix locaux conservés et survol des trois listes. Les
captures historiques 3B.1 sont préservées : la sortie se fait dans `/tmp`.

Avec Vite sur le port 5174, lancer `node browser.cjs`. Définir si nécessaire
`STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`, `STAMP_PREVIEW_URL` et
`STAMP_CAPTURE_DIR` pour un autre dossier de captures. Les scripts ne modifient
aucune base locale ni donnée NAS.

Le véritable Mac/Safari et le zoom 200 % restent à vérifier. La validation
visuelle de cet espace précède le lot Papiers 3C.
