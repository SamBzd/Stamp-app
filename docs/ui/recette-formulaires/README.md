# Formulaires dans l’atelier — 10 octobre 2026

Les créations et modifications Clientes, Kits et Hors kit partagent désormais
l’espace avec la liste, comme la préparation Catalogue : ratio liste/détail
2/3–1/3 en consultation puis liste/formulaire 1/4–3/4 en saisie. Le titre et la
croix restent visibles ; liste et formulaire défilent indépendamment sur desktop.
Sur desktop, les panneaux de saisie et de consultation vont jusqu’au bas du
viewport sous le dock. Les actions suivent le contenu défilant ; son espace de
fin permet de les dégager du dock après défilement. Aucun pied fixe ne réduit
le panneau de consultation ni ne laisse de marge sous le formulaire.
Les champs et les règles métier sont conservés.

Sur écran étroit, le formulaire précède la liste. Sa hauteur réserve le bandeau
et le dock mesurés ; l’ouverture et le redimensionnement le placent sous le
bandeau. Les saisies restent présentes après une erreur serveur ou un abandon
refusé. L’abandon accepté ferme le formulaire, y compris entre les deux types
de commandes. Les ouvertures de fiches, les nouvelles créations et les favoris
Clientes sont bloqués pendant la saisie pour éviter de remplacer le formulaire
ou d’écraser une mutation concurrente. Recherche et filtres restent utilisables.

| Formulaire | Desktop | Écran étroit |
| --- | --- | --- |
| Cliente | [1280 × 800](cliente-1280.png), [1024 × 800](cliente-1024.png) | [800 × 800](cliente-800.png), [375 × 800](cliente-375.png) |
| Kit | [1280 × 800](kit-1280.png), [1024 × 800](kit-1024.png), [901 × 800](kit-901.png) | [800 × 800](kit-800.png), [375 × 800](kit-375.png) |
| Hors kit | [1280 × 800](hors-kit-1280.png) | Composant de panneau partagé avec les autres formulaires |

La [recette Chromium](browser.cjs) utilise exclusivement des API interceptées et
des fixtures fictives : 35 clientes, 35 commandes hors kit et un catalogue publié.
Elle vérifie les proportions, le défilement, les en-têtes persistants, les actions
dégagées du dock sur desktop et mobile, le repli sans débordement horizontal,
la conservation des saisies après erreur/recherche/abandon refusé, la création
Cliente et la modification, les favoris bloqués pendant l’édition, le retour du
focus et le changement de type Commandes avec abandon refusé puis accepté.
Elle contrôle également l’ouverture directe à 375 px sans repositionnement manuel.
Le contrôle desktop vérifie aussi la hauteur complète des panneaux,
l’emplacement des actions dans le contenu et leur clic réel après défilement.
Preuves : [consultation Cliente](consultation-cliente-1280.png),
[consultation Hors kit](consultation-hors-kit-1280.png),
[actions Kit après défilement](kit-actions-1280.png).
Aucune donnée locale ou NAS n’est modifiée.

Avec Vite sur 5174 : `node docs/ui/recette-formulaires/browser.cjs`.
Variables facultatives : `STAMP_PLAYWRIGHT_MODULE`, `STAMP_CHROMIUM_EXECUTABLE`,
`STAMP_PREVIEW_URL`, `STAMP_CAPTURE_DIR`.

Validations : `npm run check` (93 tests backend, 67 frontend, build),
`docker compose config --quiet` et `git diff --check` réussis. Les recettes
existantes de consultation Commandes et de défilement Catalogue passent aussi.
Deux audits indépendants en lecture seule ont signalé trois défauts confirmés :
fermeture après abandon entre types Commandes, concurrence des favoris Clientes,
et chevauchement du dock mobile. Ils ont été corrigés ; le dernier correctif,
autorisé par Sam après le deuxième audit, a été vérifié dans Chromium avec un
contrôle de géométrie mobile ajouté à la recette, sans troisième audit pour ce lot initial.
Le retour de Sam sur le dock a ensuite entraîné la suppression de la hauteur
réduite et du pied fixe desktop, ainsi que la correction des anciennes limites
scoped du panneau de consultation. Un nouvel audit indépendant en lecture seule
n’a trouvé aucun défaut produit dans ce correctif. Les captures ont été renouvelées
et les contrôles de géométrie passent en consultation comme en saisie.

Sam a validé visuellement les formulaires et les corrections du dock, puis
autorisé leur commit/push le 10 octobre 2026. Mac/Safari, le zoom 200 % et le
paysage mobile restent ouverts. Aucun changement backend, API, schéma ou règle métier.
