# Ajustements de l’atelier — 10 octobre 2026

Demande de Sam : utiliser toute la largeur du formulaire hors kit, rendre les
onglets Fournitures/Bilan visibles, supprimer la bande blanche au bout du
surlignage des listes et raccourcir les panneaux sans détail sélectionné.
Sam a autorisé les commits cohérents et le push sur la branche UI le
10 octobre 2026.

Le champ date avait une largeur calculée nulle dans le formulaire vertical :
sa largeur explicite corrige le champ et son calendrier déplié. Le calendrier
garde sa largeur maximale de 440 px pour préserver une lecture compacte.
Les onglets ont une surface blanche et un actif prune. Clientes et Commandes
alignent leur aide en haut ; Catalogues réserve la pleine hauteur au détail
ouvert. Les listes courtes ne réservent plus de gouttière de scrollbar.

`browser.cjs` utilise uniquement les GET de la base de démonstration locale
(cliente 1, commande hors kit 3 et catalogues). Toutes les écritures sont
bloquées. Il vérifie les panneaux avant/après sélection, les bords des lignes
courtes, le champ date pleine largeur et sélectionnable, les onglets et leurs
flèches clavier à 1280×800, 1024×768, 375×800 et 800×375.

```bash
STAMP_PLAYWRIGHT_MODULE=/chemin/vers/playwright \
STAMP_CHROMIUM_EXECUTABLE=/chemin/vers/chromium \
STAMP_PREVIEW_URL=http://127.0.0.1:5174 \
STAMP_CAPTURE_DIR=/tmp/stamp-ajustements-ui \
node docs/ui/recette-ajustements-ui/browser.cjs
```

Les recettes des composants communs, calendriers et défilements Catalogues
complètent la vérification des longues listes et des formulaires. Aucun
changement métier, API, base, dépendance ou déploiement. Safari reste à vérifier.

Validations : 93 tests backend et 72 tests frontend, build, configuration
Compose et vérification du diff réussis. La recette dédiée, celles des composants
communs, calendriers et défilements Catalogues passent. L’audit indépendant `gpt-5.6-sol` / `medium`,
autorisé par Sam en remplacement de terra, n’a trouvé aucun défaut confirmé
dans le périmètre du diff de ce lot. Ce résultat ne garantit pas l’absence de
défaut ; Mac/Safari et zoom à 200 % restent ouverts.

Captures : [champ hors kit](champ-hors-kit-1280.png),
[onglets sur mobile](onglets-375.png),
[panneaux compacts](panneaux-compacts-1280.png),
[surlignage jusqu’au bord](surlignage-commandes-1280.png).
